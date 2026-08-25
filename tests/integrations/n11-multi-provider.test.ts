import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { trendyolAdapter } from '../../src/services/integrations/marketplaces/trendyol/TrendyolAdapter.js'
import { hepsiburadaAdapter } from '../../src/services/integrations/marketplaces/hepsiburada/index.js'
import { n11Adapter } from '../../src/services/integrations/marketplaces/n11/index.js'
import { shopifyAdapter } from '../../src/services/integrations/marketplaces/shopify/index.js'
import { encryptSecret } from '../../src/lib/crypto.js'
import {
  buildHepsiburadaCatalogRows,
  buildHepsiburadaListings,
  buildHepsiburadaPackages,
  buildSharedSkuPackage,
  hepsiburadaCatalogEnvelope
} from './fixtures/hepsiburada-fixtures.js'
import {
  buildN11Packages,
  buildN11Products,
  buildN11SharedSkuPackage,
  N11_STORE_NAME,
  n11ProductQueryEnvelope
} from './fixtures/n11-fixtures.js'
import { buildShopifyOrders, buildShopifyVariants } from './fixtures/shopify-fixtures.js'

/*
 * DORT PROVIDER E2E REGRESSION (provider-independence testi).
 *
 * Ayni workspace'te Trendyol + Hepsiburada + N11 + Shopify mock'lari AYNI ANDA
 * bagli. Mock akisi: RAW payload -> GERCEK adapter mapper'lari -> ortak
 * DB pipeline. Core service'te provider branch'i OLMADIGI kanitlanir:
 * N11 eklemek icin sync/analytics/operations/action engine DEGISTIRILMEDI.
 */

const prisma = new PrismaClient()

let app: FastifyInstance
let ownerToken: string
let otherToken: string
let ownerId: number
let otherId: number
let workspaceId: string
let otherWorkspaceId: string

function get(url: string, token?: string) {
  return app.inject({ method: 'GET', url, headers: token ? { authorization: `Bearer ${token}` } : {} })
}

async function post(url: string, payload?: any, token?: string) {
  return app.inject({
    method: 'POST', url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload
  })
}

async function waitFor<T>(probe: () => Promise<T>, predicate: (value: T) => boolean, timeoutMs = 15_000): Promise<T> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await probe()
    if (predicate(value)) return value
    if (Date.now() > deadline) throw new Error('waitFor: condition not met in time')
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}

/* --- Gercek Trendyol raw payload'u (mapper'a gidecek sekilde) --- */
function trendyolRawPackage(externalId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: externalId,
    orderNumber: `TY-${externalId}`,
    grossAmount: 120.5,
    totalDiscount: 10,
    currencyCode: 'TRY',
    orderDate: Date.now() - 60_000,
    lastModifiedDate: Date.now(),
    status: 'Delivered',
    customerId: 42,
    customerFirstName: 'Ali',
    customerLastName: 'Veli',
    lines: [{
      quantity: 1,
      merchantSku: 'SKU-SHARED',
      productName: 'Üç Pazaryerinde Aynı Ürün',
      productCode: 9001,
      amount: 120.5,
      lineGrossAmount: 120.5,
      price: 120.5,
      barcode: 'SKU-SHARED'
    }],
    ...overrides
  }
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key-min-32-bytes-long!!'
  process.env.SHOPIFY_CLIENT_ID = 'four-provider-client-id'
  process.env.SHOPIFY_CLIENT_SECRET = 'four-provider-client-secret-at-least-32-chars'
  process.env.SHOPIFY_OAUTH_REDIRECT_URI = 'https://api.test/integrations/shopify/oauth/callback'
  delete process.env.MARKETPLACE_SYNC_ENABLED

  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() }
    catch { reply.status(401).send({ error: 'Unauthorized' }) }
  })

  const { integrationRoutes } = await import('../../src/services/integrations/marketplace-routes')
  const registry = await import('../../src/services/integrations/adapter-registry')
  registry.resetAdaptersForTests()

  // --- GERCEK adapter'larin ag yuzeyleri mock'lanir; MAPPER'LAR GERCEK ---
  ;(trendyolAdapter as any).validateCredentials = async () => ({ valid: true })
  ;(trendyolAdapter as any).fetchOrders = async () => ({
    orders: [
      trendyolRawPackage('PKG-SHARED-1'), // cross-provider duplicate externalId
      trendyolRawPackage('TY-PKG-2', { status: 'Picking' })
    ],
    page: 0, totalPages: 1, totalElements: 2, hasNextPage: false
  })
  ;(trendyolAdapter as any).fetchProducts = async () => ({
    products: [{
      content: { contentId: 555, title: 'Üç Pazaryerinde Aynı Ürün', brand: { name: 'Ortak Marka' }, category: { name: 'Kategori' }, variants: [] },
      variant: { barcode: 'SKU-SHARED', stockCode: 'SC-SHARED', onSale: true, price: { salePrice: 99.9, listPrice: 129.9 } },
      stock: { quantity: 12 }
    }],
    hasNextPage: false
  })

  const hbPackages = [...buildHepsiburadaPackages(), buildSharedSkuPackage('Delivered')]
  ;(hepsiburadaAdapter as any).validateCredentials = async () => ({ valid: true })
  ;(hepsiburadaAdapter as any).fetchOrders = async () => ({
    orders: hbPackages,
    page: 0, totalPages: 1, totalElements: hbPackages.length, hasNextPage: false
  })
  ;(hepsiburadaAdapter as any).fetchProducts = async () => ({
    products: [
      ...buildHepsiburadaListings(20).map(listing => ({ listing, catalog: null })),
      // Cross-provider duplicate senaryosu icin ayri provider kaydi:
      {
        listing: {
          listingId: 'LST-SHARED', hepsiburadaSku: 'HBSHARED', merchantSku: 'SKU-SHARED',
          price: 89.9, availableStock: 4, isSalable: true
        },
        catalog: null
      }
    ],
    hasNextPage: false
  })

  // --- N11: RAW payload'lar resmi shape'te; mapper GERCEK ---
  const n11Packages = [...buildN11Packages(), buildN11SharedSkuPackage('Delivered')]
  ;(n11Adapter as any).validateCredentials = async () => ({ valid: true })
  ;(n11Adapter as any).fetchOrders = async () => ({
    orders: n11Packages,
    page: 0, totalPages: 1, totalElements: n11Packages.length, hasNextPage: false
  })
  ;(n11Adapter as any).fetchProducts = async () => ({
    products: [
      ...buildN11Products(20),
      // Cross-provider duplicate: ayni SKU-SHARED, ayri provider satiri
      {
        n11ProductId: 200_999,
        stockCode: 'SKU-SHARED',
        title: 'Üç Pazaryerinde Aynı Ürün',
        status: 'Active',
        saleStatus: 'On_Sale',
        currencyType: 'TL',
        salePrice: 79.9,
        listPrice: 99.9,
        quantity: 7,
        barcode: 'SKU-SHARED',
        attributes: [{ attributeName: 'Marka', attributeValue: 'Ortak Marka' }],
        imageUrls: ['https://cdn.n11test.example/org/shared.jpg']
      }
    ],
    hasNextPage: false
  })

  // --- SHOPIFY: resmi GraphQL node shape'ine yakin RAW fixture; mapper GERCEK ---
  const shopifyOrders = buildShopifyOrders(40)
  const shopifyProducts = buildShopifyVariants(20)
  ;(shopifyAdapter as any).validateCredentials = async () => ({ valid: true, displayName: 'QA Shopify' })
  ;(shopifyAdapter as any).fetchOrders = async () => ({
    orders: shopifyOrders,
    page: 0, totalPages: 1, totalElements: shopifyOrders.length, hasNextPage: false
  })
  ;(shopifyAdapter as any).fetchProducts = async () => ({
    products: shopifyProducts,
    page: 0, totalPages: 1, totalElements: shopifyProducts.length, hasNextPage: false
  })

  registry.registerAdapter(trendyolAdapter)
  registry.registerAdapter(hepsiburadaAdapter)
  registry.registerAdapter(n11Adapter)
  registry.registerAdapter(shopifyAdapter)

  await app.register(integrationRoutes, { prisma })
  await app.ready()

  const now = Date.now()
  const owner = await prisma.user.create({
    data: { email: `mp3-owner-${now}@test.com`, password: 'x', name: 'MP3 Owner', role: 'learner' }
  })
  ownerId = owner.id
  ownerToken = app.jwt.sign({ id: ownerId, email: owner.email, role: 'learner' })

  const other = await prisma.user.create({
    data: { email: `mp3-other-${now}@test.com`, password: 'x', name: 'MP3 Other', role: 'learner' }
  })
  otherId = other.id
  otherToken = app.jwt.sign({ id: otherId, email: other.email, role: 'learner' })

  const ws = await prisma.businessWorkspace.create({ data: { name: 'Multi Provider WS 3', createdById: ownerId } })
  workspaceId = ws.id
  await prisma.businessMember.create({ data: { workspaceId, userId: ownerId, role: 'owner' } })

  const ws2 = await prisma.businessWorkspace.create({ data: { name: 'Other MP3 WS', createdById: otherId } })
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
  await app.close().catch(() => {})
  delete process.env.SHOPIFY_CLIENT_ID
  delete process.env.SHOPIFY_CLIENT_SECRET
  delete process.env.SHOPIFY_OAUTH_REDIRECT_URI
})

describe('uc provider ayni workspace te', () => {
  beforeAll(async () => {
    // Connect route'lari uzerinden uc provider da baglanir (route-level test).
    const ty = await post('/integrations/trendyol/connect', {
      workspaceId, merchantId: '123456', apiKey: 'valid-key-12345', apiSecret: 'valid-secret-67890'
    }, ownerToken)
    expect(ty.statusCode).toBe(200)

    const hb = await post('/integrations/hepsiburada/connect', {
      workspaceId, merchantId: 'b24f1a2c-1111-4a5b-9c6d-000000000001',
      username: 'api-user@merchant.com', password: 'hb-secret-pass'
    }, ownerToken)
    expect(hb.statusCode).toBe(200)

    const n11 = await post('/integrations/n11/connect', {
      workspaceId, storeName: N11_STORE_NAME, appKey: 'n11-app-key-12345678', appSecret: 'n11-app-secret-87654321'
    }, ownerToken)
    expect(n11.statusCode).toBe(200)

    const shopifyStart = await post('/integrations/shopify/connect', {
      workspaceId, shopDomain: 'qa-local-karar.myshopify.com'
    }, ownerToken)
    expect(shopifyStart.statusCode).toBe(200)
    expect(shopifyStart.json().authorizationUrl).toContain('qa-local-karar.myshopify.com/admin/oauth/authorize')

    // OAuth callback unit/route guvenligi ayri test edilir. E2E burada OAuth'un
    // basarili sonucu olan sifreli offline token satiriyla ortak pipeline'i dener.
    await prisma.integrationConnection.create({
      data: {
        workspaceId,
        createdByUserId: ownerId,
        provider: 'SHOPIFY',
        externalAccountId: 'qa-local-karar.myshopify.com',
        displayName: 'QA Shopify',
        encryptedAccessToken: encryptSecret('shpat_four_provider_test_token'),
        status: 'ACTIVE'
      }
    })

    const { runConnectionSync } = await import('../../src/services/integrations/sync-service')
    const connections = await prisma.integrationConnection.findMany({ where: { workspaceId } })
    expect(connections).toHaveLength(4)
    for (const connection of connections) {
      const outcome = await runConnectionSync(prisma, connection.id, { syncType: 'MANUAL' })
      expect(['SUCCESS', 'PARTIAL']).toContain(outcome.status)
    }
  })

  it('stores exactly four ACTIVE connections', async () => {
    const connections = await prisma.integrationConnection.findMany({ where: { workspaceId } })
    expect(connections).toHaveLength(4)
    expect(connections.map(c => c.provider).sort()).toEqual(['HEPSIBURADA', 'N11', 'SHOPIFY', 'TRENDYOL'])
    expect(connections.every(c => c.status === 'ACTIVE')).toBe(true)
  })

  it('imports orders from ALL FOUR providers through their real mappers', async () => {
    await waitFor(
      () => prisma.marketplaceOrder.count({ where: { workspaceId } }),
      count => count >= 40 + 41 + 2 - 1 + 40
    )
    const orders = await prisma.marketplaceOrder.findMany({ where: { workspaceId } })
    const byProvider = new Map<string, number>()
    for (const order of orders) byProvider.set(order.provider, (byProvider.get(order.provider) ?? 0) + 1)
    expect(byProvider.get('TRENDYOL')).toBe(2)
    expect(byProvider.get('HEPSIBURADA')).toBe(41)
    expect(byProvider.get('N11')).toBe(41) // 40 plan + shared
    expect(byProvider.get('SHOPIFY')).toBe(40)

    // N11 status dagilimi GERCEK mapper'dan gecti:
    const n11Statuses = new Map<string, number>()
    for (const order of orders.filter(o => o.provider === 'N11')) {
      n11Statuses.set(order.status, (n11Statuses.get(order.status) ?? 0) + 1)
    }
    expect(n11Statuses.get('CREATED')).toBe(6)
    expect(n11Statuses.get('PROCESSING')).toBe(7)
    expect(n11Statuses.get('SHIPPED')).toBe(6)
    expect(n11Statuses.get('DELIVERED')).toBe(14) // 13 plan + shared
    expect(n11Statuses.get('CANCELLED')).toBe(8) // 5 Cancelled + 3 UnSupplied
  })

  it('provider-scoped product identities stay SEPARATE across FOUR providers', async () => {
    const sharedOrders = await prisma.marketplaceOrder.findMany({
      where: { workspaceId, externalId: 'PKG-SHARED-1' }
    })
    expect(sharedOrders).toHaveLength(2) // TY + HB (N11 shared farkli externalId kullanir)
    expect(sharedOrders.map(r => r.provider).sort()).toEqual(['HEPSIBURADA', 'TRENDYOL'])

    // N11'de kimlik paket numarasidir (resmi id alani):
    const sharedSkuOrders = await prisma.marketplaceOrder.findMany({
      where: { workspaceId, provider: 'N11', externalOrderNumber: 'N11O-999999' }
    })
    expect(sharedSkuOrders).toHaveLength(1)

    // Ayni fiziksel urun/SKU dort provider'da ayri satir; otomatik merge YOK.
    const products = await prisma.marketplaceProduct.findMany({
      where: { workspaceId, OR: [{ externalId: 'SKU-SHARED' }, { barcode: 'SKU-SHARED' }, { sku: 'SKU-SHARED' }] }
    })
    expect(products).toHaveLength(4)
    expect(products.map(p => p.provider).sort()).toEqual(['HEPSIBURADA', 'N11', 'SHOPIFY', 'TRENDYOL'])
  })

  it('re-running sync creates NO duplicates (per provider)', async () => {
    const { runConnectionSync } = await import('../../src/services/integrations/sync-service')
    const before = await prisma.marketplaceOrder.count({ where: { workspaceId } })
    const connections = await prisma.integrationConnection.findMany({ where: { workspaceId } })
    for (const connection of connections) {
      await runConnectionSync(prisma, connection.id, { syncType: 'MANUAL' })
    }
    await waitFor(
      () => prisma.marketplaceOrder.count({ where: { workspaceId } }),
      count => count === before
    )
  })

  it('operations aggregates ALL FOUR providers into one summary', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, ownerToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.summary.connected).toBe(true)
    expect(body.summary.providers.map((p: any) => p.provider).sort())
      .toEqual(['HEPSIBURADA', 'N11', 'SHOPIFY', 'TRENDYOL'])
    // Bugun ayni gun icinde uc provider'in siparislari tek havuzda:
    const totalToday = body.summary.today.orderCount
    const dbToday = await prisma.marketplaceOrder.count({
      where: {
        workspaceId,
        status: { notIn: ['CANCELLED'] as any[] },
        orderDate: { gte: (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })() }
      }
    })
    expect(totalToday).toBe(dbToday)
    // Pending shipment uc provider'dan birlesik:
    const pendingInDb = await prisma.marketplaceOrder.count({
      where: { workspaceId, status: { in: ['CREATED', 'PROCESSING'] as any[] } }
    })
    const pendingAction = body.actions.find((a: any) => a.type === 'PENDING_SHIPMENT')
    expect(pendingAction.count).toBe(pendingInDb)
    // Dusuk stok uc provider'dan birlesik:
    const lowStockInDb = await prisma.marketplaceProduct.count({
      where: { workspaceId, isActive: true, stockQuantity: { gt: 0, lte: 10 } }
    })
    expect(body.summary.inventory.lowStockCount).toBe(lowStockInDb)
  })

  it('orders endpoint filters by provider without splitting the table', async () => {
    const all = await get(`/marketplace/orders?workspaceId=${workspaceId}&limit=100`, ownerToken)
    const n11 = await get(`/marketplace/orders?workspaceId=${workspaceId}&limit=100&provider=N11`, ownerToken)
    expect(all.statusCode).toBe(200)
    expect(n11.statusCode).toBe(200)
    const allProviders = new Set(all.json().orders.map((o: any) => o.provider))
    expect(allProviders.size).toBe(4)
    expect(n11.json().orders.every((o: any) => o.provider === 'N11')).toBe(true)
    expect(n11.json().orders.length).toBeGreaterThan(0)
  })

  it('products endpoint filters by provider and keeps N11 images', async () => {
    const n11 = await get(`/marketplace/products?workspaceId=${workspaceId}&provider=N11&limit=100`, ownerToken)
    expect(n11.statusCode).toBe(200)
    const products = n11.json().products
    expect(products.length).toBeGreaterThan(0)
    expect(products.every((p: any) => p.provider === 'N11')).toBe(true)
    // Gorseli olan N11 urunlerinde gercek https URL:
    const withImage = products.find((p: any) => p.imageUrl)
    expect(withImage.imageUrl).toMatch(/^https:\/\//)
  })

  it('orders/products endpoints filter Shopify in the shared screens', async () => {
    const orders = await get(`/marketplace/orders?workspaceId=${workspaceId}&limit=100&provider=SHOPIFY`, ownerToken)
    const products = await get(`/marketplace/products?workspaceId=${workspaceId}&provider=SHOPIFY&limit=100`, ownerToken)
    expect(orders.statusCode).toBe(200)
    expect(products.statusCode).toBe(200)
    expect(orders.json().orders).toHaveLength(40)
    expect(orders.json().orders.every((row: any) => row.provider === 'SHOPIFY')).toBe(true)
    expect(products.json().products).toHaveLength(20)
    expect(products.json().products.every((row: any) => row.provider === 'SHOPIFY')).toBe(true)
    expect(products.json().products.some((row: any) => /^https:\/\//.test(row.imageUrl || ''))).toBe(true)
  })

  it('LocalKarar product settings are isolated per provider row', async () => {
    const tyProduct = await prisma.marketplaceProduct.findFirst({
      where: { workspaceId, provider: 'TRENDYOL', externalId: 'SKU-SHARED' }
    })
    const n11Product = await prisma.marketplaceProduct.findFirst({
      where: { workspaceId, provider: 'N11', barcode: 'SKU-SHARED' }
    })
    expect(tyProduct && n11Product).toBeTruthy()

    const res = await app.inject({
      method: 'PATCH',
      url: `/marketplace/products/${tyProduct!.id}/settings`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { workspaceId, internalNote: 'trendyol notu', isFavorite: true }
    })
    expect(res.statusCode).toBe(200)

    // N11 karsiligi ETKILENMEZ.
    const n11After = await prisma.marketplaceProduct.findUnique({ where: { id: n11Product!.id } })
    expect(n11After?.internalNote).toBeNull()
    expect(n11After?.isFavorite).toBe(false)
  })

  it('N11 sync does NOT overwrite LocalKarar fields on its own row', async () => {
    const n11Product = await prisma.marketplaceProduct.findFirst({
      where: { workspaceId, provider: 'N11', sku: 'N11SKU-002' }
    })
    await prisma.marketplaceProduct.update({
      where: { id: n11Product!.id },
      data: { internalNote: 'n11 yerel notu', tags: ['kontrol'], lowStockThresholdOverride: 3 }
    })

    const { runConnectionSync } = await import('../../src/services/integrations/sync-service')
    const n11Connection = await prisma.integrationConnection.findFirst({
      where: { workspaceId, provider: 'N11' }
    })
    await runConnectionSync(prisma, n11Connection!.id, { syncType: 'MANUAL' })

    const after = await prisma.marketplaceProduct.findUnique({ where: { id: n11Product!.id } })
    expect(after?.internalNote).toBe('n11 yerel notu')
    expect(after?.tags).toEqual(['kontrol'])
    expect(after?.lowStockThresholdOverride).toBe(3)
  })

  it('Shopify sync does NOT overwrite LocalKarar note/tags/favorite/threshold', async () => {
    const product = await prisma.marketplaceProduct.findFirst({ where: { workspaceId, provider: 'SHOPIFY' } })
    await prisma.marketplaceProduct.update({
      where: { id: product!.id },
      data: { internalNote: 'shopify yerel notu', tags: ['vitrin'], isFavorite: true, lowStockThresholdOverride: 4 }
    })
    const { runConnectionSync } = await import('../../src/services/integrations/sync-service')
    const connection = await prisma.integrationConnection.findFirst({ where: { workspaceId, provider: 'SHOPIFY' } })
    await runConnectionSync(prisma, connection!.id, { syncType: 'MANUAL' })
    const after = await prisma.marketplaceProduct.findUnique({ where: { id: product!.id } })
    expect(after).toMatchObject({
      internalNote: 'shopify yerel notu', tags: ['vitrin'], isFavorite: true, lowStockThresholdOverride: 4
    })
  })

  it('AI mentor context uses aggregate-only data and leaks NO customer PII', async () => {
    const { buildMarketplaceMentorContext } = await import('../../src/services/integrations/ai-context')
    const context = await buildMarketplaceMentorContext(prisma, workspaceId)
    expect(context.hasData).toBe(true)
    expect(context.text).toContain('N11')
    expect(context.text).toContain('SHOPIFY')
    const lowered = context.text.toLowerCase()
    expect(lowered.includes('ayşe')).toBe(false)
    expect(lowered.includes('ali veli')).toBe(false)
    expect(lowered.includes('musteri') && lowered.includes('@ornek.com')).toBe(false)
    expect(context.text).not.toContain('11111111111')
    expect(context.text).not.toContain('customerEmail')

    // Operations endpoint de PII tasimaz.
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, ownerToken)
    expect(res.body.includes('Ayşe')).toBe(false)
    expect(res.body.includes('Ali Veli')).toBe(false)
    expect(res.body.includes('@ornek.com')).toBe(false)
    expect(res.body.includes('11111111111')).toBe(false)
  })

  it('is isolated per workspace (other member sees nothing)', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, otherToken)
    expect(res.statusCode).toBe(403)
    const own = await get(`/marketplace/operations?workspaceId=${otherWorkspaceId}`, otherToken)
    expect(own.json().summary.connected).toBe(false)
    expect(own.json().summary.providers).toHaveLength(0)
  })

  it('N11 status endpoint reports counts without credential material', async () => {
    const res = await get(`/integrations/n11/status?workspaceId=${workspaceId}`, ownerToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.connected).toBe(true)
    expect(body.counts.orders).toBe(41)
    expect(body.counts.products).toBe(21) // 20 + shared
    expect(res.body).not.toContain('n11-app-secret-87654321')
    expect(res.body).not.toContain('n11-app-key-12345678')
  })

  it('Shopify status reports counts and never returns the access token', async () => {
    const res = await get(`/integrations/shopify/status?workspaceId=${workspaceId}`, ownerToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().counts).toEqual({ orders: 40, products: 20 })
    expect(res.body).not.toContain('shpat_four_provider_test_token')
    expect(res.body).not.toContain('encryptedAccessToken')
  })

  it('disconnect removes ONLY Shopify; other connections and Shopify history are retained', async () => {
    const del = await app.inject({
      method: 'DELETE',
      url: `/integrations/shopify/disconnect?workspaceId=${workspaceId}`,
      headers: { authorization: `Bearer ${ownerToken}` }
    })
    expect(del.statusCode).toBe(200)
    const remaining = await prisma.integrationConnection.findMany({ where: { workspaceId } })
    expect(remaining.map(c => c.provider).sort()).toEqual(['HEPSIBURADA', 'N11', 'TRENDYOL'])
    // Gecmis veriler KORUNUR.
    const shopifyOrders = await prisma.marketplaceOrder.count({ where: { workspaceId, provider: 'SHOPIFY' } })
    expect(shopifyOrders).toBe(40)
  })
})
