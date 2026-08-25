import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

/*
 * MARKETPLACE OPERATIONS AGGREGATE SERVICE + ACTION ENGINE testleri.
 *
 * Genel Bakis / Ana Sayfa / AI Mentor'un ortak veri kaynagi burada
 * uca kadar dogrulanir:
 * - Bagli degil / bagli durumlar
 * - Bugun aggregate'i ve Decimal tutar guvenligi
 * - Action uretimi, severity matrisi, dedup (stateless) ve resolution
 * - Workspace izolasyonu ve coklu-provider toplama
 * - PII sizintisi yoklugu
 * - Dashboard isteginde DIS PAZARYERI CAGRISI YOKLUGU
 */

const prisma = new PrismaClient()

let app: FastifyInstance
let ownerToken: string
let otherToken: string
let ownerId: number
let otherId: number
let workspaceId: string
let otherWorkspaceId: string
let connectionId: string

const DAY_MS = 24 * 60 * 60 * 1000

function get(url: string, token?: string) {
  return app.inject({ method: 'GET', url, headers: token ? { authorization: `Bearer ${token}` } : {} })
}

async function patch(url: string, payload: any, token?: string) {
  return app.inject({
    method: 'PATCH',
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload
  })
}

async function seedOrder(input: {
  workspaceId: string
  provider?: string
  externalId: string
  status: string
  grossAmount: string
  orderDate: Date
}) {
  return prisma.marketplaceOrder.create({
    data: {
      workspaceId: input.workspaceId,
      provider: (input.provider ?? 'TRENDYOL') as any,
      externalId: input.externalId,
      currency: 'TRY',
      grossAmount: input.grossAmount as any,
      status: input.status as any,
      orderDate: input.orderDate
    }
  })
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key-min-32-bytes-long!!'
  delete process.env.MARKETPLACE_LOW_STOCK_THRESHOLD

  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() }
    catch { reply.status(401).send({ error: 'Unauthorized' }) }
  })

  const { integrationRoutes } = await import('../../src/services/integrations/marketplace-routes')
  const registry = await import('../../src/services/integrations/adapter-registry')
  registry.resetAdaptersForTests()
  // DIS CAGRI YASAGI: bu adapter cagrilirsa test patlar.
  registry.registerAdapter({
    provider: 'TRENDYOL',
    async validateCredentials() { throw new Error('EXTERNAL CALL MADE') },
    async fetchOrders() { throw new Error('EXTERNAL CALL MADE') },
    async fetchProducts() { throw new Error('EXTERNAL CALL MADE') },
    normalizeOrder() { throw new Error('EXTERNAL CALL MADE') },
    normalizeProduct() { throw new Error('EXTERNAL CALL MADE') },
    async healthCheck() { throw new Error('EXTERNAL CALL MADE') }
  } as any)
  await app.register(integrationRoutes, { prisma })
  await app.ready()

  const now = Date.now()
  const owner = await prisma.user.create({
    data: { email: `ops-owner-${now}@test.com`, password: 'x', name: 'Ops Owner', role: 'learner' }
  })
  ownerId = owner.id
  ownerToken = app.jwt.sign({ id: ownerId, email: owner.email, role: 'learner' })

  const other = await prisma.user.create({
    data: { email: `ops-other-${now}@test.com`, password: 'x', name: 'Ops Other', role: 'learner' }
  })
  otherId = other.id
  otherToken = app.jwt.sign({ id: otherId, email: other.email, role: 'learner' })

  const ws = await prisma.businessWorkspace.create({ data: { name: 'Ops WS', createdById: ownerId } })
  workspaceId = ws.id
  await prisma.businessMember.create({ data: { workspaceId, userId: ownerId, role: 'owner' } })

  const ws2 = await prisma.businessWorkspace.create({ data: { name: 'Other Ops WS', createdById: otherId } })
  otherWorkspaceId = ws2.id
  await prisma.businessMember.create({ data: { workspaceId: otherWorkspaceId, userId: otherId, role: 'owner' } })
})

afterAll(async () => {
  const wsIds = [workspaceId, otherWorkspaceId].filter(Boolean)
  await prisma.marketplaceOrder.deleteMany({ where: { workspaceId: { in: wsIds } } }).catch(() => {})
  await prisma.marketplaceProduct.deleteMany({ where: { workspaceId: { in: wsIds } } }).catch(() => {})
  await prisma.integrationConnection.deleteMany({ where: { workspaceId: { in: wsIds } } }).catch(() => {})
  await prisma.workspaceActivity.deleteMany({ where: { workspaceId: { in: wsIds } } }).catch(() => {})
  await prisma.businessMember.deleteMany({ where: { userId: { in: [ownerId, otherId] } } }).catch(() => {})
  await prisma.businessWorkspace.deleteMany({ where: { createdById: { in: [ownerId, otherId] } } }).catch(() => {})
  await prisma.userPreference.deleteMany({ where: { userId: { in: [ownerId, otherId] } } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } }).catch(() => {})
  await app.close()
})

describe('operations summary — no integration', () => {
  it('returns connected:false with no actions and no external calls', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, ownerToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.summary.connected).toBe(false)
    expect(body.summary.providers).toHaveLength(0)
    expect(body.summary.today.orderCount).toBe(0)
    expect(body.summary.today.grossSales).toBe(0)
    expect(body.actions).toHaveLength(0)
  })

  it('rejects non-members with 403', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, otherToken)
    expect(res.statusCode).toBe(403)
  })
})

describe('operations summary — connected', () => {
  beforeAll(async () => {
    const connection = await prisma.integrationConnection.create({
      data: {
        workspaceId,
        createdByUserId: ownerId,
        provider: 'TRENDYOL',
        externalAccountId: '123456',
        displayName: 'Test Magaza',
        status: 'ACTIVE'
      }
    })
    connectionId = connection.id

    const today = new Date()

    // Bugun: 2 siparis, Decimal guvenligi icin kayan degerler (199.98).
    await seedOrder({ workspaceId, externalId: 'T1', status: 'DELIVERED', grossAmount: '99.99', orderDate: today })
    await seedOrder({ workspaceId, externalId: 'T2', status: 'PROCESSING', grossAmount: '99.99', orderDate: today })
    // Kargoya bekleyen: T2 (bugun) + T3 + T4 = 3.
    await seedOrder({ workspaceId, externalId: 'T3', status: 'CREATED', grossAmount: '50.00', orderDate: new Date(Date.now() - 1 * DAY_MS) })
    await seedOrder({ workspaceId, externalId: 'T4', status: 'CREATED', grossAmount: '70.00', orderDate: new Date(Date.now() - 6 * DAY_MS) }) // gecikmis (stale)
    // Iade bekleyen.
    await seedOrder({ workspaceId, externalId: 'T5', status: 'RETURNED', grossAmount: '30.00', orderDate: new Date(Date.now() - 2 * DAY_MS) })
    // Iptal: hicbir toplama girmez.
    await seedOrder({ workspaceId, externalId: 'T6', status: 'CANCELLED', grossAmount: '500.00', orderDate: today })

    // Urunler: dusuk stok (3), stok yok (0), saglam (25), override'li dusuk (8 <= 5 degil ama override=10 ile dusuk DEGIL; ters senaryo: stok 8, genel esik 10 -> dusuk; override=5 -> DUSUK DEGIL olmali)
    await prisma.marketplaceProduct.create({ data: { workspaceId, provider: 'TRENDYOL', externalId: 'P-LOW', title: 'Dusuk Stok Urun', stockQuantity: 3, isActive: true } })
    await prisma.marketplaceProduct.create({ data: { workspaceId, provider: 'TRENDYOL', externalId: 'P-OUT', title: 'Stoksuz Urun', stockQuantity: 0, isActive: true } })
    await prisma.marketplaceProduct.create({ data: { workspaceId, provider: 'TRENDYOL', externalId: 'P-OK', title: 'Saglam Stok Urun', stockQuantity: 25, isActive: true } })
    await prisma.marketplaceProduct.create({ data: { workspaceId, provider: 'TRENDYOL', externalId: 'P-OVR', title: 'Override Urun', stockQuantity: 8, isActive: true, lowStockThresholdOverride: 5 } })
  })

  afterAll(async () => {
    await prisma.marketplaceOrder.deleteMany({ where: { workspaceId } })
    await prisma.marketplaceProduct.deleteMany({ where: { workspaceId } })
  })

  it('reports connected + provider info', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, ownerToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.summary.connected).toBe(true)
    expect(body.summary.providers).toHaveLength(1)
    expect(body.summary.providers[0].provider).toBe('TRENDYOL')
    expect(body.summary.sync.lastSyncedAt ?? body.summary.sync.hasError).toBeDefined()
  })

  it('aggregates today correctly with Decimal-safe totals', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, ownerToken)
    const body = res.json()
    // Iptal haric bugunun siparisi: T1 + T2 (T6 iptal).
    expect(body.summary.today.orderCount).toBe(2)
    // Float kaymasi olmadan: 99.99 + 99.99 = 199.98.
    expect(body.summary.today.grossSales).toBe(199.98)
  })

  it('produces PENDING_SHIPMENT with ATTENTION at 3+ and STALE_ORDER CRITICAL', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, ownerToken)
    const body = res.json()
    const pending = body.actions.find((action: any) => action.type === 'PENDING_SHIPMENT')
    expect(pending).toBeTruthy()
    expect(pending.count).toBe(3)          // T2, T3, T4 (T1 teslim)
    // Gecikmis (stale) siparis var -> spesifikasyona gore CRITICAL.
    expect(pending.severity).toBe('CRITICAL')
    expect(pending.title).toContain('3 sipariş')

    const stale = body.actions.find((action: any) => action.type === 'STALE_ORDER')
    expect(stale).toBeTruthy()
    expect(stale.severity).toBe('CRITICAL')
    expect(stale.count).toBe(1)

    // Kritik en one gecer.
    expect(body.actions[0].severity).toBe('CRITICAL')
  })

  it('produces LOW_STOCK + OUT_OF_STOCK respecting per-product threshold override', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, ownerToken)
    const body = res.json()
    const low = body.actions.find((action: any) => action.type === 'LOW_STOCK')
    const out = body.actions.find((action: any) => action.type === 'OUT_OF_STOCK')
    expect(low).toBeTruthy()
    expect(low.severity).toBe('ATTENTION')
    expect(low.count).toBe(1) // yalniz P-LOW (stok 3); P-OVR override=5 ile 8 > 5 -> dusuk degil
    expect(out).toBeTruthy()
    expect(out.severity).toBe('CRITICAL')
    expect(out.count).toBe(1)
  })

  it('produces RETURN_PENDING from all-time returned statuses', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, ownerToken)
    const body = res.json()
    const ret = body.actions.find((action: any) => action.type === 'RETURN_PENDING')
    expect(ret).toBeTruthy()
    expect(ret.severity).toBe('ATTENTION')
    expect(ret.link.query.status).toBe('RETURNED,PARTIALLY_RETURNED')
  })

  it('is isolated per workspace', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${otherWorkspaceId}`, otherToken)
    const body = res.json()
    expect(body.summary.connected).toBe(false)
    expect(body.summary.today.orderCount).toBe(0)
    expect(body.actions).toHaveLength(0)
  })

  it('leaks no customer PII', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, ownerToken)
    const raw = res.body
    expect(raw.includes('Ali')).toBe(false)
    expect(raw.toLowerCase().includes('customer')).toBe(false)
    expect(raw.toLowerCase().includes('email')).toBe(false)
  })
})

describe('action engine semantics', () => {
  it('deduplicates by category and resolves automatically', async () => {
    const { getMarketplaceOperations } = await import('../../src/services/integrations/operations')
    const ws = await prisma.businessWorkspace.create({
      data: { name: `Engine WS ${Date.now()}`, createdById: ownerId }
    })
    await prisma.businessMember.create({ data: { workspaceId: ws.id, userId: ownerId, role: 'owner' } })
    try {
      const created = await Promise.all([
        prisma.marketplaceOrder.create({ data: { workspaceId: ws.id, provider: 'TRENDYOL' as any, externalId: 'E1', currency: 'TRY', grossAmount: '10.00' as any, status: 'CREATED' as any, orderDate: new Date() } }),
        prisma.marketplaceOrder.create({ data: { workspaceId: ws.id, provider: 'TRENDYOL' as any, externalId: 'E2', currency: 'TRY', grossAmount: '20.00' as any, status: 'PROCESSING' as any, orderDate: new Date() } }),
        prisma.marketplaceOrder.create({ data: { workspaceId: ws.id, provider: 'TRENDYOL' as any, externalId: 'E3', currency: 'TRY', grossAmount: '30.00' as any, status: 'PROCESSING' as any, orderDate: new Date() } })
      ])

      const first = await getMarketplaceOperations(prisma, ws.id)
      const pendingRuns = first.actions.filter(action => action.type === 'PENDING_SHIPMENT')
      // DEDUP: kategori basina TEK satir.
      expect(pendingRuns).toHaveLength(1)
      expect(pendingRuns[0].count).toBe(3)
      expect(pendingRuns[0].severity).toBe('ATTENTION') // 3+

      // Ikinci cagri birebir ayni sonucu verir (yeni task URETMEZ).
      const second = await getMarketplaceOperations(prisma, ws.id)
      expect(second.actions.filter(a => a.type === 'PENDING_SHIPMENT')).toHaveLength(1)
      expect(JSON.stringify(second.actions)).toEqual(JSON.stringify(first.actions))

      // RESOLUTION: tum siparisler kargoya verilince action KAYBOLUR.
      await prisma.marketplaceOrder.updateMany({
        where: { workspaceId: ws.id, id: { in: created.map(o => o.id) } },
        data: { status: 'SHIPPED' }
      })
      const resolved = await getMarketplaceOperations(prisma, ws.id)
      expect(resolved.actions.filter(a => a.type === 'PENDING_SHIPMENT')).toHaveLength(0)
      expect(resolved.actions.filter(a => a.type === 'STALE_ORDER')).toHaveLength(0)
    } finally {
      await prisma.marketplaceOrder.deleteMany({ where: { workspaceId: ws.id } })
      await prisma.integrationConnection.deleteMany({ where: { workspaceId: ws.id } })
      await prisma.businessMember.deleteMany({ where: { workspaceId: ws.id } })
      await prisma.businessWorkspace.delete({ where: { id: ws.id } }).catch(() => {})
    }
  })

  it('escalates SYNC_ERROR severity with error age', async () => {
    const { buildMarketplaceActions } = await import('../../src/services/integrations/operations')
    const baseSummary: any = {
      connected: true,
      providers: [],
      today: { orderCount: 0, grossSales: 0, pendingShipmentCount: 0, returnCount: 0 },
      inventory: { threshold: 10, lowStockCount: 0, outOfStockCount: 0 },
      performance: { bestSeller: null, topRevenueProduct: null },
      sync: { lastSyncedAt: null, hasError: true }
    }
    const fresh: any = {
      ...baseSummary,
      providers: [{ provider: 'TRENDYOL', displayName: null, status: 'ERROR', lastSyncedAt: new Date(Date.now() - 60_000), lastSuccessfulSyncAt: null, hasError: true }]
    }
    const old: any = {
      ...baseSummary,
      providers: [{ provider: 'TRENDYOL', displayName: null, status: 'ERROR', lastSyncedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), lastSuccessfulSyncAt: null, hasError: true }]
    }
    const extras = { openActions: { pendingShipmentAllTime: 0, returnPendingAllTime: 0, stalePendingCount: 0 }, highReturnCount: 0 }

    const freshActions = buildMarketplaceActions(fresh, extras)
    const oldActions = buildMarketplaceActions(old, extras)
    expect(freshActions.find(a => a.type === 'SYNC_ERROR')?.severity).toBe('ATTENTION')
    expect(oldActions.find(a => a.type === 'SYNC_ERROR')?.severity).toBe('CRITICAL')
  })
})

describe('multi-provider aggregation', () => {
  it('aggregates across providers into one summary', async () => {
    const ws = await prisma.businessWorkspace.create({
      data: { name: `Multi WS ${Date.now()}`, createdById: ownerId }
    })
    await prisma.businessMember.create({ data: { workspaceId: ws.id, userId: ownerId, role: 'owner' } })
    try {
      await prisma.integrationConnection.create({ data: { workspaceId: ws.id, createdByUserId: ownerId, provider: 'HEPSIBURADA', externalAccountId: '999', status: 'ACTIVE' } })
      await prisma.integrationConnection.create({ data: { workspaceId: ws.id, createdByUserId: ownerId, provider: 'TRENDYOL', externalAccountId: '888', status: 'ACTIVE' } })
      await prisma.marketplaceOrder.create({ data: { workspaceId: ws.id, provider: 'HEPSIBURADA' as any, externalId: 'H1', currency: 'TRY', grossAmount: '40.00' as any, status: 'PROCESSING' as any, orderDate: new Date() } })
      await prisma.marketplaceOrder.create({ data: { workspaceId: ws.id, provider: 'TRENDYOL' as any, externalId: 'TR-M1', currency: 'TRY', grossAmount: '60.00' as any, status: 'PROCESSING' as any, orderDate: new Date() } })

      const res = await get(`/marketplace/operations?workspaceId=${ws.id}`, ownerToken)
      const body = res.json()
      expect(body.summary.connected).toBe(true)
      expect(body.summary.providers.map((p: any) => p.provider).sort()).toEqual(['HEPSIBURADA', 'TRENDYOL'])
      // Provider bagimsiz tek havuzda toplanir.
      expect(body.summary.today.orderCount).toBe(2)
      expect(body.summary.today.grossSales).toBe(100)
      expect(body.summary.today.pendingShipmentCount).toBe(2)
    } finally {
      await prisma.marketplaceOrder.deleteMany({ where: { workspaceId: ws.id } })
      await prisma.integrationConnection.deleteMany({ where: { workspaceId: ws.id } })
      await prisma.businessMember.deleteMany({ where: { workspaceId: ws.id } })
      await prisma.businessWorkspace.delete({ where: { id: ws.id } }).catch(() => {})
    }
  })
})

describe('product local settings (provider read-only)', () => {
  let productId: string

  beforeAll(async () => {
    const product = await prisma.marketplaceProduct.create({
      data: { workspaceId, provider: 'TRENDYOL', externalId: 'P-SET', title: 'Ayarli Urun', stockQuantity: 12, isActive: true }
    })
    productId = product.id
  })

  afterAll(async () => {
    await prisma.marketplaceProduct.deleteMany({ where: { workspaceId, externalId: 'P-SET' } })
  })

  it('updates note/tag/threshold/priority without touching provider fields', async () => {
    const res = await patch(`/marketplace/products/${productId}/settings`, {
      workspaceId,
      internalNote: 'Kampanya sonrasi kontrol et',
      tags: ['kampanya', 'kontrol'],
      lowStockThresholdOverride: 15,
      isFavorite: true
    }, ownerToken)
    expect(res.statusCode).toBe(200)
    const body = res.json().product
    expect(body.internalNote).toBe('Kampanya sonrasi kontrol et')
    expect(body.tags).toEqual(['kampanya', 'kontrol'])
    expect(body.lowStockThresholdOverride).toBe(15)
    expect(body.isFavorite).toBe(true)

    // Provider alanlari dokunulmaz.
    const row = await prisma.marketplaceProduct.findUnique({ where: { id: productId } })
    expect(row?.title).toBe('Ayarli Urun')
    expect(row?.stockQuantity).toBe(12)
  })

  it('rejects viewers (write permission required)', async () => {
    await prisma.businessMember.create({ data: { workspaceId, userId: otherId, role: 'viewer' } }).catch(() => {})
    const res = await patch(`/marketplace/products/${productId}/settings`, { workspaceId, isFavorite: true }, otherToken)
    expect([403, 401]).toContain(res.statusCode)
  })

  it('provider sync does NOT overwrite LocalKarar fields but DOES refresh imageUrl', async () => {
    const { upsertNormalizedProduct } = await import('../../src/services/integrations/repository')
    const updated = await upsertNormalizedProduct(prisma, workspaceId, 'TRENDYOL', {
      externalId: 'P-SET',
      sku: 'SKU-SET',
      barcode: 'BC-SET',
      title: 'Ayarli Urun V2',
      brand: 'Marka',
      category: 'Kat',
      salePrice: 129.9,
      listPrice: 149.9,
      stockQuantity: 7,
      currency: 'TRY',
      isActive: true,
      imageUrl: 'https://cdn.example.com/new-image.jpg'
    })
    expect(updated).toBe('updated')

    const row = await prisma.marketplaceProduct.findUnique({ where: { id: productId } })
    // LocalKarar alanlari HAYATTA:
    expect(row?.internalNote).toBe('Kampanya sonrasi kontrol et')
    expect(row?.tags).toEqual(['kampanya', 'kontrol'])
    expect(row?.lowStockThresholdOverride).toBe(15)
    expect(row?.isFavorite).toBe(true)
    // Provider alarlari tazelendi (gorsel dahil):
    expect(row?.title).toBe('Ayarli Urun V2')
    expect(row?.stockQuantity).toBe(7)
    expect(row?.imageUrl).toBe('https://cdn.example.com/new-image.jpg')
  })
})

describe('activity feed events (aggregate, no noise)', () => {
  it('writes ONE aggregated event for N imported orders', async () => {
    const { runConnectionSync } = await import('../../src/services/integrations/sync-service')
    const registry = await import('../../src/services/integrations/adapter-registry')

    const ws = await prisma.businessWorkspace.create({
      data: { name: `Feed WS ${Date.now()}`, createdById: ownerId }
    })
    await prisma.businessMember.create({ data: { workspaceId: ws.id, userId: ownerId, role: 'owner' } })
    const connection = await prisma.integrationConnection.create({
      data: { workspaceId: ws.id, createdByUserId: ownerId, provider: 'TRENDYOL', externalAccountId: '777', status: 'ACTIVE' }
    })

    // Gecici olarak gercek akisi taklit eden sahte adapter (fetch edilebilir).
    const packages = Array.from({ length: 3 }, (_, index) => ({
      id: 9000 + index,
      orderNumber: `FEED-${index}`,
      grossAmount: 100,
      totalDiscount: 0,
      currencyCode: 'TRY',
      orderDate: Date.now(),
      lastModifiedDate: Date.now(),
      status: index === 2 ? 'Shipped' : 'Delivered',
      lines: [{ quantity: 1, merchantSku: 'F-SKU', productName: 'Feed Urun', productCode: 800 + index, amount: 100, lineGrossAmount: 100, price: 100, barcode: `F-BC-${index}` }]
    }))
    registry.registerAdapter({
      provider: 'TRENDYOL',
      async validateCredentials() { return { valid: true } },
      async fetchOrders() { return { orders: packages, page: 0, totalPages: 1, totalElements: packages.length, hasNextPage: false } },
      async fetchProducts() { return { products: [], hasNextPage: false } },
      normalizeOrder(raw: any) {
        return {
          externalId: String(raw.id),
          externalOrderNumber: raw.orderNumber,
          customerDisplayName: 'X Y.',
          currency: 'TRY',
          grossAmount: raw.grossAmount,
          discountAmount: raw.totalDiscount,
          commissionAmount: null,
          shippingAmount: null,
          refundAmount: null,
          taxAmount: null,
          status: raw.status === 'Delivered' ? 'DELIVERED' : 'SHIPPED',
          orderDate: new Date(raw.orderDate),
          items: (raw.lines ?? []).map((line: any) => ({
            externalProductId: String(line.productCode),
            sku: line.merchantSku,
            barcode: line.barcode,
            title: line.productName,
            quantity: line.quantity,
            unitPrice: line.price,
            grossAmount: line.lineGrossAmount,
            commissionAmount: null
          })),
          metadata: {}
        } as any
      },
      normalizeProduct(raw: any) { return raw },
      async healthCheck() { return { valid: true } }
    } as any)

    try {
      const outcome = await runConnectionSync(prisma, connection.id, { syncType: 'MANUAL' })
      expect(outcome.status).toBe('SUCCESS')
      // Fire-and-forget event yazimini bekle.
      await new Promise(resolve => setTimeout(resolve, 300))

      const events = await prisma.workspaceActivity.findMany({
        where: { workspaceId: ws.id, entityType: 'marketplace' },
        orderBy: { createdAt: 'asc' }
      })
      const imported = events.filter(event => event.action === 'MARKETPLACE_ORDERS_IMPORTED')
      expect(imported).toHaveLength(1)
      expect(JSON.parse(imported[0].metadata || '{}').count).toBe(3)

      const delivered = events.filter(event => event.action === 'MARKETPLACE_ORDER_DELIVERED')
      expect(delivered).toHaveLength(1)
      expect(JSON.parse(delivered[0].metadata || '{}').count).toBe(2)

      // Tekrar sync: yeni siparis gelmedigi icin IMPORTED event YAZILMAZ (gurultu yok).
      await runConnectionSync(prisma, connection.id, { syncType: 'MANUAL' })
      await new Promise(resolve => setTimeout(resolve, 300))
      const importedAfter = await prisma.workspaceActivity.count({
        where: { workspaceId: ws.id, action: 'MARKETPLACE_ORDERS_IMPORTED' }
      })
      expect(importedAfter).toBe(1)
    } finally {
      await prisma.marketplaceOrder.deleteMany({ where: { workspaceId: ws.id } })
      await prisma.workspaceActivity.deleteMany({ where: { workspaceId: ws.id } })
      await prisma.integrationConnection.deleteMany({ where: { id: connection.id } })
      await prisma.businessMember.deleteMany({ where: { workspaceId: ws.id } })
      await prisma.businessWorkspace.delete({ where: { id: ws.id } }).catch(() => {})
      registry.resetAdaptersForTests()
    }
  })
})

/*
 * BAGLANTI AYARI — odeme vadesi.
 *
 * 🔴 NEDEN VAR: vade olmadan siparis kaydi Kayitlar'da gorunuyor ama
 * TAKVIME ve 30 gunluk tahsilat toplamina girmiyor (uctan uca
 * olculdu). Vade hicbir saglayicinin API'sinde olmadigi icin
 * kullanicidan aliniyor; gomulu bir varsayilan yanlis oldugunda
 * SESSIZCE hatali nakit tahmini uretirdi.
 */
describe('PATCH /integrations/:connectionId/settings', () => {
  it('odeme vadesi kaydediliyor ve geri okunuyor', async () => {
    const res = await patch(`/integrations/${connectionId}/settings`, { payoutDelayDays: 14 }, ownerToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().payoutDelayDays).toBe(14)

    const kayit = await prisma.integrationConnection.findUnique({ where: { id: connectionId } })
    expect(kayit?.payoutDelayDays).toBe(14)
  })

  it('null gonderilince vade temizleniyor', async () => {
    /* Bos = "bilmiyorum". Kayit yine olusur, sadece vadesiz kalir. */
    const res = await patch(`/integrations/${connectionId}/settings`, { payoutDelayDays: null }, ownerToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().payoutDelayDays).toBeNull()
  })

  it('anlamsiz deger 422 aliyor', async () => {
    expect((await patch(`/integrations/${connectionId}/settings`, { payoutDelayDays: -1 }, ownerToken)).statusCode).toBe(422)
    expect((await patch(`/integrations/${connectionId}/settings`, { payoutDelayDays: 400 }, ownerToken)).statusCode).toBe(422)
    expect((await patch(`/integrations/${connectionId}/settings`, { payoutDelayDays: 1.5 }, ownerToken)).statusCode).toBe(422)
  })

  it('🔴 BASKA calisma alaninin kullanicisi baglantiyi degistiremiyor', async () => {
    /* Baglanti once bulunup ONUN workspace'i uzerinden yetki araniyor.
       Yalniz `connectionId` ile guncelleme, baska isletmenin magaza
       ayarini degistirmeye izin verirdi. */
    const res = await patch(`/integrations/${connectionId}/settings`, { payoutDelayDays: 99 }, otherToken)
    expect(res.statusCode).toBe(403)

    const kayit = await prisma.integrationConnection.findUnique({ where: { id: connectionId } })
    expect(kayit?.payoutDelayDays).not.toBe(99)
  })

  it('olmayan baglanti 404 aliyor', async () => {
    const res = await patch(
      '/integrations/00000000-0000-0000-0000-000000000000/settings',
      { payoutDelayDays: 7 }, ownerToken
    )
    expect(res.statusCode).toBe(404)
  })

  it('kimlik dogrulamasi olmadan reddediliyor', async () => {
    const res = await patch(`/integrations/${connectionId}/settings`, { payoutDelayDays: 7 })
    expect(res.statusCode).toBe(401)
  })
})
