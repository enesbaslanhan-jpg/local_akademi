import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

/*
 * URUN LISTESI + PERFORMANS AGGREGATION e2e testleri.
 *
 * Kurallar bu dosyada korunur:
 * - 7/30/90 pencere dogrulugu (Decimal tutarlar)
 * - Komisyon/kargo verisi yoksa null (0 DEGIL)
 * - Iade orani gercek satir durumu metadata'sindan
 * - Dusuk stok esigi LocalKarar tarafi (provider stoku null ise degerlendirilmez)
 * - Siralama (en cok satan / en yuksek ciro / en cok iade)
 * - Workspace isolation
 * - Provider capability false + views/favorites alanlari hicbir yerde uretilmez
 */

const prisma = new PrismaClient()

let app: FastifyInstance
let ownerToken: string
let otherToken: string
let ownerId: number
let otherId: number
let wsId: string
let wsOtherId: string

const DAY_MS = 24 * 60 * 60 * 1000

async function get(url: string, token: string) {
  return app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } })
}

async function seedOrder(opts: {
  workspaceId: string
  externalId: string
  daysAgo: number
  status?: string
  netContribution?: number | null
  items: Array<{
    barcode: string
    sku?: string
    quantity: number
    grossAmount: number
    commissionAmount?: number | null
    shippingAllocation?: number | null
    lineStatus?: string
  }>
}) {
  const order = await prisma.marketplaceOrder.create({
    data: {
      workspaceId: opts.workspaceId,
      provider: 'TRENDYOL',
      externalId: opts.externalId,
      grossAmount: opts.items.reduce((sum, i) => sum + i.grossAmount, 0),
      status: (opts.status ?? 'DELIVERED') as any,
      orderDate: new Date(Date.now() - opts.daysAgo * DAY_MS),
      ...(opts.netContribution !== undefined ? { netContribution: opts.netContribution } : {})
    }
  })
  for (const item of opts.items) {
    await prisma.marketplaceOrderItem.create({
      data: {
        orderId: order.id,
        externalProductId: `P-${item.barcode}`,
        sku: item.sku ?? item.barcode,
        barcode: item.barcode,
        title: `Urun ${item.barcode}`,
        quantity: item.quantity,
        unitPrice: item.grossAmount / Math.max(item.quantity, 1),
        grossAmount: item.grossAmount,
        commissionAmount: item.commissionAmount ?? null,
        shippingAllocation: item.shippingAllocation ?? null,
        metadata: {
          ...(item.lineStatus ? { lineStatus: item.lineStatus } : {}),
          commissionPercent: 12
        }
      }
    })
  }
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key-min-32-bytes-long!!'
  process.env.MARKETPLACE_LOW_STOCK_THRESHOLD = '10'
  delete process.env.INTEGRATION_ENCRYPTION_KEY

  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() }
    catch { reply.status(401).send({ error: 'Unauthorized' }) }
  })

  const { integrationRoutes } = await import('../../src/services/integrations/marketplace-routes')
  const registry = await import('../../src/services/integrations/adapter-registry')
  registry.resetAdaptersForTests()
  // Gercek adapter capability tanimiyla kaydedilir (fetch yapmadan).
  const { trendyolAdapter } = await import('../../src/services/integrations/marketplaces/trendyol/TrendyolAdapter')
  registry.registerAdapter(trendyolAdapter)
  await app.register(integrationRoutes, { prisma })
  await app.ready()

  const now = Date.now()
  const owner = await prisma.user.create({
    data: { email: `prod-owner-${now}@test.com`, password: 'x', name: 'Owner', role: 'learner' }
  })
  ownerId = owner.id
  ownerToken = app.jwt.sign({ id: ownerId, email: owner.email, role: 'learner' })

  const other = await prisma.user.create({
    data: { email: `prod-other-${now}@test.com`, password: 'x', name: 'Other', role: 'learner' }
  })
  otherId = other.id
  otherToken = app.jwt.sign({ id: otherId, email: other.email, role: 'learner' })

  wsId = (await prisma.businessWorkspace.create({ data: { name: 'Prod WS', createdById: ownerId } })).id
  wsOtherId = (await prisma.businessWorkspace.create({ data: { name: 'Prod WS Other', createdById: otherId } })).id
  await prisma.businessMember.create({ data: { workspaceId: wsId, userId: ownerId, role: 'owner' } })
  await prisma.businessMember.create({ data: { workspaceId: wsOtherId, userId: otherId, role: 'owner' } })

  // --- Urunler ---
  await prisma.marketplaceProduct.createMany({
    data: [
      // A: stok 8 → dusuk stok (esik 10)
      { workspaceId: wsId, provider: 'TRENDYOL', externalId: 'BC-A', barcode: 'BC-A', sku: 'SKU-A', title: 'Urun A', stockQuantity: 8, salePrice: 100, isActive: true },
      // B: stok 50 → normal; ciro/satis lideri olacak
      { workspaceId: wsId, provider: 'TRENDYOL', externalId: 'BC-B', barcode: 'BC-B', sku: 'SKU-B', title: 'Urun B', stockQuantity: 50, salePrice: 40, isActive: true },
      // C: stok 0 → stok yok
      { workspaceId: wsId, provider: 'TRENDYOL', externalId: 'BC-C', barcode: 'BC-C', sku: 'SKU-C', title: 'Urun C', stockQuantity: 0, isActive: true },
      // D: satista degil
      { workspaceId: wsId, provider: 'TRENDYOL', externalId: 'BC-D', barcode: 'BC-D', sku: 'SKU-D', title: 'Urun D', stockQuantity: 20, isActive: false },
      // E: diger workspace (isolation)
      { workspaceId: wsOtherId, provider: 'TRENDYOL', externalId: 'BC-OTHER', barcode: 'BC-OTHER', sku: 'SKU-O', title: 'Diger Urun', stockQuantity: 5, isActive: true }
    ] as any
  })

  // --- Siparisler ---
  // A: 5 gun once 3 adet x 100 TL = 300 TL (7 ve 30 ve 90 gun icinde)
  await seedOrder({ workspaceId: wsId, externalId: 'O-A1', daysAgo: 5, items: [{ barcode: 'BC-A', quantity: 3, grossAmount: 300 }] })
  // A: 20 gun once 2 adet (30 ve 90 gun icinde) + KISMİ IADE: 1 adet Returned satiri
  await seedOrder({
    workspaceId: wsId, externalId: 'O-A2', daysAgo: 20,
    items: [{ barcode: 'BC-A', quantity: 2, grossAmount: 200, lineStatus: 'Returned' }]
  })
  // B: 10 gun once 10 adet x 40 TL = 400 TL; iptal edilmis siparis SAYILMAMALI
  await seedOrder({ workspaceId: wsId, externalId: 'O-B1', daysAgo: 10, status: 'CANCELLED', items: [{ barcode: 'BC-B', quantity: 10, grossAmount: 400 }] })
  // B: 45 gun once 5 adet x 40 TL = 200 TL (yalnizca 90 gun penceresinde)
  await seedOrder({ workspaceId: wsId, externalId: 'O-B2', daysAgo: 45, items: [{ barcode: 'BC-B', quantity: 5, grossAmount: 200 }] })
  // C: tam iade siparis (tum adetler iade): 4 gun once 4 adet x 25 TL
  await seedOrder({ workspaceId: wsId, externalId: 'O-C1', daysAgo: 4, status: 'RETURNED', items: [{ barcode: 'BC-C', quantity: 4, grossAmount: 100 }] })
  // D: komisyon + kargo GERCEK verisi olan tek siparis → net katki hesaplanabilir
  await seedOrder({
    workspaceId: wsId, externalId: 'O-D1', daysAgo: 3,
    netContribution: 85.5,
    items: [{ barcode: 'BC-D', quantity: 2, grossAmount: 120, commissionAmount: 24.5, shippingAllocation: 10 }]
  })
})

afterAll(async () => {
  await prisma.marketplaceOrderItem.deleteMany({ where: { order: { workspaceId: { in: [wsId, wsOtherId] } } } }).catch(() => {})
  await prisma.marketplaceOrder.deleteMany({ where: { workspaceId: { in: [wsId, wsOtherId] } } }).catch(() => {})
  await prisma.marketplaceProduct.deleteMany({ where: { workspaceId: { in: [wsId, wsOtherId] } } }).catch(() => {})
  await prisma.businessMember.deleteMany({ where: { userId: { in: [ownerId, otherId] } } }).catch(() => {})
  await prisma.auditLog.deleteMany({ where: { entityType: 'integration_connection' } }).catch(() => {})
  await prisma.workspaceActivity.deleteMany({ where: { workspaceId: { in: [wsId, wsOtherId] } } }).catch(() => {})
  await prisma.businessWorkspace.deleteMany({ where: { createdById: { in: [ownerId, otherId] } } }).catch(() => {})
  await prisma.userPreference.deleteMany({ where: { userId: { in: [ownerId, otherId] } } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } }).catch(() => {})
  await app.close()
})

afterEach(() => {
  process.env.MARKETPLACE_LOW_STOCK_THRESHOLD = '10'
})

describe('Ürün listesi ve performans', () => {
  it('ürünleri performans kolonlarıyla listeler; iptal sipariş sayılmaz', async () => {
    const res = await get(`/marketplace/products?workspaceId=${wsId}&windowDays=30&sort=title`, ownerToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()

    expect(body.threshold).toBe(10)
    expect(body.windowDays).toBe(30)

    const byTitle = Object.fromEntries(body.products.map((p: any) => [p.title, p]))
    expect(byTitle['Urun B'].performance.unitsSold).toBe(0) // iptal siparis haric
    expect(byTitle['Urun A'].performance.unitsSold).toBe(5)
    expect(byTitle['Urun A'].performance.orderCount).toBe(2)
    expect(byTitle['Urun A'].performance.grossSales).toBeCloseTo(500, 2)
    expect(byTitle['Urun A'].performance.averageSellingPrice).toBeCloseTo(100, 2)
  })

  it('90 günlük pencere 30 gün dışındaki satışları da kapsar', async () => {
    const res = await get(`/marketplace/products?workspaceId=${wsId}&windowDays=90`, ownerToken)
    const byTitle = Object.fromEntries(res.json().products.map((p: any) => [p.title, p]))
    expect(byTitle['Urun B'].performance.unitsSold).toBe(5)
    expect(byTitle['Urun B'].performance.grossSales).toBeCloseTo(200, 2)
  })

  it('7 günlük pencere eski satışları dışarıda bırakır', async () => {
    const res = await get(`/marketplace/products?workspaceId=${wsId}&windowDays=7`, ownerToken)
    const byTitle = Object.fromEntries(res.json().products.map((p: any) => [p.title, p]))
    expect(byTitle['Urun A'].performance.unitsSold).toBe(3)
    expect(byTitle['Urun B'].performance.unitsSold).toBe(0)
    expect(byTitle['Urun C'].performance.returnedUnits).toBe(4)
  })

  it('komisyon/kargo verisi yoksa null döner, 0 yazılmaz', async () => {
    const res = await get(`/marketplace/products?workspaceId=${wsId}&sort=title`, ownerToken)
    const byTitle = Object.fromEntries(res.json().products.map((p: any) => [p.title, p]))

    expect(byTitle['Urun A'].performance.commissionTotal).toBeNull()
    expect(byTitle['Urun A'].performance.shippingTotal).toBeNull()
    expect(byTitle['Urun A'].performance.netContribution).toBeNull()

    // Gercek komisyon/kargo verisi OLAN urun:
    expect(byTitle['Urun D'].performance.commissionTotal).toBeCloseTo(24.5, 2)
    expect(byTitle['Urun D'].performance.shippingTotal).toBeCloseTo(10, 2)
    // Siparis netContribution'i dolu oldugu icin toplanabilir:
    expect(byTitle['Urun D'].performance.netContribution).toBeCloseTo(85.5, 2)
  })

  it('iade oranı gerçek satir durumundan hesaplanir (kısmi iade + tam iade)', async () => {
    const res = await get(`/marketplace/products?workspaceId=${wsId}&sort=title`, ownerToken)
    const byTitle = Object.fromEntries(res.json().products.map((p: any) => [p.title, p]))

    // A: 5 satis icinden 2 adet Returned satiri → %40
    expect(byTitle['Urun A'].performance.returnedUnits).toBe(2)
    expect(byTitle['Urun A'].performance.returnRate).toBeCloseTo(0.4, 3)

    // C: tamamen iade edilen siparis → %100
    expect(byTitle['Urun C'].performance.returnedUnits).toBe(4)
    expect(byTitle['Urun C'].performance.returnRate).toBeCloseTo(1, 3)
  })

  it('düşük stok filtresi LocalKarar eşikini kullanır (null stok hariç)', async () => {
    const res = await get(`/marketplace/products?workspaceId=${wsId}&stockFilter=low`, ownerToken)
    const titles = res.json().products.map((p: any) => p.title)
    expect(titles).toContain('Urun A')   // stok 8 <= 10
    expect(titles).not.toContain('Urun B') // stok 50
    // C stok=0 → hem low hem out
    expect(titles).toContain('Urun C')

    // Esik override: threshold 5 → A (8) artık düşük değil
    const res2 = await get(`/marketplace/products?workspaceId=${wsId}&stockFilter=low&lowStockThreshold=5`, ownerToken)
    const titles2 = res2.json().products.map((p: any) => p.title)
    expect(titles2).not.toContain('Urun A')
  })

  it('stok yok filtresi yalnızca 0 stokluları döndürür', async () => {
    const res = await get(`/marketplace/products?workspaceId=${wsId}&stockFilter=out`, ownerToken)
    const titles = res.json().products.map((p: any) => p.title)
    expect(titles).toEqual(['Urun C'])
  })

  it('satışta / satışta değil filtresi çalışır', async () => {
    const on = await get(`/marketplace/products?workspaceId=${wsId}&onSale=true`, ownerToken)
    expect(on.json().products.some((p: any) => p.title === 'Urun D')).toBe(false)

    const off = await get(`/marketplace/products?workspaceId=${wsId}&onSale=false`, ownerToken)
    expect(off.json().products.map((p: any) => p.title)).toEqual(['Urun D'])
  })

  it('sıralama: en çok satan, en yüksek ciro, en çok iade', async () => {
    const best = await get(`/marketplace/products?workspaceId=${wsId}&sort=bestSelling&windowDays=30`, ownerToken)
    expect(best.json().products[0].title).toBe('Urun A') // 5 adet

    const revenue = await get(`/marketplace/products?workspaceId=${wsId}&sort=topRevenue&windowDays=30`, ownerToken)
    expect(revenue.json().products[0].title).toBe('Urun A') // 500 TL

    const returned = await get(`/marketplace/products?workspaceId=${wsId}&sort=mostReturned&windowDays=30`, ownerToken)
    expect(returned.json().products[0].title).toBe('Urun C') // 4 iade adet

    // Arama filtresi
    const search = await get(`/marketplace/products?workspaceId=${wsId}&q=Barkod-Yok`, ownerToken)
    expect(search.json().products).toHaveLength(0)
    const searchSku = await get(`/marketplace/products?workspaceId=${wsId}&q=SKU-A`, ownerToken)
    expect(searchSku.json().products.map((p: any) => p.title)).toEqual(['Urun A'])
  })

  it('workspace isolation: başka workspace ürünleri görünmez ve detaya erişilemez', async () => {
    const res = await get(`/marketplace/products?workspaceId=${wsId}`, ownerToken)
    const ids = res.json().products.map((p: any) => p.externalId)
    expect(ids).not.toContain('BC-OTHER')

    const crossDetail = await get(`/marketplace/products/overview?workspaceId=${wsOtherId}`, ownerToken)
    expect(crossDetail.statusCode).toBe(403)

    const productsOther = await get(`/marketplace/products?workspaceId=${wsOtherId}`, otherToken)
    expect(productsOther.json().products.map((p: any) => p.externalId)).toEqual(['BC-OTHER'])
  })
})

describe('Ürün detayı ve overview', () => {
  it('detay 7/30/90 pencerelerini birlikte döner', async () => {
    const list = await get(`/marketplace/products?workspaceId=${wsId}`, ownerToken)
    const productA = list.json().products.find((p: any) => p.title === 'Urun A')

    const detail = await get(`/marketplace/products/${productA.id}?workspaceId=${wsId}`, ownerToken)
    expect(detail.statusCode).toBe(200)
    const body = detail.json()

    expect(Object.keys(body.performance).map(Number).sort((a, b) => a - b)).toEqual([7, 30, 90])
    expect(body.performance[7].unitsSold).toBe(3)
    expect(body.performance[30].unitsSold).toBe(5)
    expect(body.product.stockQuantity).toBe(8)
    expect(body.product.lowStock).toBe(true)

    // Capability bilgisi ekleniyor:
    expect(body.capabilities.supportsProductViews).toBe(false)
    expect(body.capabilities.supportsFavorites).toBe(false)
  })

  it('overview düşük stok sayısı ve liderleri döner', async () => {
    const res = await get(`/marketplace/products/overview?workspaceId=${wsId}`, ownerToken)
    expect(res.statusCode).toBe(200)
    const overview = res.json()
    expect(overview.totalProducts).toBeGreaterThanOrEqual(4)
    expect(overview.threshold).toBe(10)
    expect(overview.lowStockCount).toBeGreaterThanOrEqual(1) // Urun A (+C stok 0)
    expect(overview.outOfStockCount).toBe(1)
    expect(overview.bestSeller?.title).toBe('Urun A')
    expect(overview.topRevenue?.title).toBe('Urun A')
  })

  it('overview env eşikle değişir', async () => {
    process.env.MARKETPLACE_LOW_STOCK_THRESHOLD = '5'
    const res = await get(`/marketplace/products/overview?workspaceId=${wsId}`, ownerToken)
    expect(res.json().threshold).toBe(5)
    // A (8) artik dusuk degil → yalnizca C (0)
    expect(res.json().lowStockCount).toBe(1)
  })
})

describe('Sahte analytics yasağı', () => {
  it('yanıtlarda views/impressions/favorites/likes alanları HİÇ oluşmaz', async () => {
    const [listRes, detailRes] = await Promise.all([
      get(`/marketplace/products?workspaceId=${wsId}`, ownerToken),
      (async () => {
        const list = await get(`/marketplace/products?workspaceId=${wsId}`, ownerToken)
        const first = list.json().products[0]
        return get(`/marketplace/products/${first.id}?workspaceId=${wsId}`, ownerToken)
      })()
    ])

    for (const res of [listRes, detailRes]) {
      const serialized = JSON.stringify(res.json())
      for (const forbidden of ['views', 'impressions', 'favorites', 'likes', 'viewCount', 'favoriteCount']) {
        expect(serialized).not.toContain(`"${forbidden}"`)
      }
    }

    // Catalog endpoint capability'yi acikca raporlar:
    const catalog = await get('/integrations/marketplaces', ownerToken)
    const trendyol = catalog.json().marketplaces.find((m: any) => m.provider === 'TRENDYOL')
    expect(trendyol.capabilities.supportsProductViews).toBe(false)
    expect(trendyol.capabilities.supportsFavorites).toBe(false)
    expect(trendyol.capabilities.supportsProductAnalytics).toBe(false)
  })
})
