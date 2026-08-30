import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import type { MarketplaceProviderAdapter } from '../../src/services/integrations/types'

/*
 * SYNC + ROTA entegrasyon testleri.
 *
 * Gercek Trendyol'a istek ATILMAZ: adapter registry'ye sahte bir
 * TRENDYOL adapter'i kaydedilir. Core sync mantigi (upsert dedupe,
 * kilit, kismi basarisizlik, tenant isolation) boylece uca kadar
 * dogrulanir.
 */

const prisma = new PrismaClient()

let app: FastifyInstance
let ownerToken: string
let otherToken: string
let ownerId: number
let otherId: number
let workspaceId: string
let otherWorkspaceId: string

/* --- Sahte adapter ------------------------------------------------ */

function fakePackage(externalId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: externalId,
    orderNumber: `ORD-${externalId}`,
    grossAmount: 100,
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
      merchantSku: 'SKU-1',
      productName: 'Test Urun',
      productCode: 9001,
      amount: 100,
      lineGrossAmount: 100,
      discount: 10,
      price: 100,
      barcode: 'BC-1',
      commission: 12
    }],
    ...overrides
  }
}

const failingAdapterStub = { failFetchOrders: false, throwAuth: false }

const fakeTrendyolAdapter: MarketplaceProviderAdapter<any, any> = {
  provider: 'TRENDYOL',
  async validateCredentials(credentials) {
    if (credentials.apiKey === 'invalid-key') {
      return { valid: false, message: 'Trendyol bu bilgilerle bağlantıyı reddetti.', errorCode: 'INVALID_CREDENTIALS' }
    }
    return { valid: true }
  },
  async fetchOrders({ page }) {
    if (failingAdapterStub.throwAuth) {
      const error = new Error('Trendyol credentials were rejected') as Error & { errorCode?: string }
      error.errorCode = 'TRENDYOL_AUTH'
      throw error
    }
    if (failingAdapterStub.failFetchOrders && page === 0) {
      const error = new Error('Trendyol service returned a server error') as Error & { errorCode?: string }
      error.errorCode = 'TRENDYOL_PROVIDER_ERROR'
      throw error
    }
    return {
      orders: [fakePackage('PKG-1'), fakePackage('PKG-2')],
      page: 0,
      totalPages: 1,
      totalElements: 2,
      hasNextPage: false
    }
  },
  async fetchProducts() {
    return {
      products: [{
        content: {
          contentId: 555,
          title: 'Urun',
          brand: { name: 'Marka' },
          category: { name: 'Kategori' },
          variants: [{ barcode: 'BC-P1', stockCode: 'SC-P1', onSale: true }]
        },
        variant: { barcode: 'BC-P1', stockCode: 'SC-P1', onSale: true }
      }],
      hasNextPage: false
    }
  },
  normalizeOrder(raw: any) {
    // Gercek mapper'i kullanmak icin dinamik import yerine kopya degil:
    // mapper testleri ayri dosyada. Burada yalin normalizasyon yeterli.
    return {
      externalId: String(raw.id),
      externalOrderNumber: raw.orderNumber,
      externalCustomerId: raw.customerId ? String(raw.customerId) : null,
      customerDisplayName: raw.customerFirstName
        ? `${raw.customerFirstName} ${(raw.customerLastName || '').charAt(0)}.`
        : null,
      currency: raw.currencyCode || 'TRY',
      grossAmount: raw.grossAmount ?? 0,
      discountAmount: raw.totalDiscount ?? null,
      commissionAmount: null,
      shippingAmount: null,
      refundAmount: null,
      taxAmount: null,
      status: raw.status === 'Delivered' ? 'DELIVERED' : 'UNKNOWN',
      orderDate: new Date(raw.orderDate),
      providerUpdatedAt: raw.lastModifiedDate ? new Date(raw.lastModifiedDate) : null,
      items: (raw.lines ?? []).map((line: any) => ({
        externalId: String(line.productCode ?? ''),
        externalProductId: String(line.productCode ?? ''),
        sku: line.merchantSku ?? null,
        barcode: line.barcode ?? null,
        title: line.productName ?? 'Urun',
        quantity: line.quantity ?? 0,
        unitPrice: line.price ?? line.amount ?? null,
        grossAmount: line.lineGrossAmount ?? line.amount ?? null,
        discountAmount: line.discount ?? null,
        commissionAmount: null,
        metadata: { commissionPercent: line.commission ?? undefined }
      })),
      metadata: {}
    }
  },
  normalizeProduct(raw: any) {
    return {
      externalId: String(raw.variant.barcode),
      sku: raw.variant.stockCode ?? null,
      barcode: raw.variant.barcode ?? null,
      title: `${raw.content.title} - ${raw.variant.stockCode}`,
      brand: raw.content.brand?.name ?? null,
      category: raw.content.category?.name ?? null,
      isActive: Boolean(raw.variant.onSale),
      providerUpdatedAt: null
    }
  },
  async healthCheck(credentials) {
    return this.validateCredentials(credentials)
  }
}

/* --- Kurulum ------------------------------------------------------ */

async function post(url: string, payload?: any, token?: string) {
  return app.inject({
    method: 'POST',
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload
  })
}

async function get(url: string, token?: string) {
  return app.inject({ method: 'GET', url, headers: token ? { authorization: `Bearer ${token}` } : {} })
}

async function del(url: string, token?: string) {
  return app.inject({ method: 'DELETE', url, headers: token ? { authorization: `Bearer ${token}` } : {} })
}

const CONNECT_BODY = {
  merchantId: '123456',
  apiKey: 'valid-key-12345',
  apiSecret: 'valid-secret-67890'
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key-min-32-bytes-long!!'
  process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('hex')
  delete process.env.MARKETPLACE_SYNC_ENABLED

  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() }
    catch { reply.status(401).send({ error: 'Unauthorized' }) }
  })

  const { integrationRoutes } = await import('../../src/services/integrations/marketplace-routes')
  const registry = await import('../../src/services/integrations/adapter-registry')
  // routes modulu yuklenirken gercek Trendyol adapter'ini kaydeder;
  // SAHTE adapter onu EZEREK testin tamaminda kullanilir.
  registry.resetAdaptersForTests()
  registry.registerAdapter(fakeTrendyolAdapter)
  await app.register(integrationRoutes, { prisma })
  await app.ready()

  const now = Date.now()
  const owner = await prisma.user.create({
    data: { email: `int-owner-${now}@test.com`, password: 'x', name: 'Owner', role: 'learner' }
  })
  ownerId = owner.id
  ownerToken = app.jwt.sign({ id: ownerId, email: owner.email, role: 'learner' })

  const other = await prisma.user.create({
    data: { email: `int-other-${now}@test.com`, password: 'x', name: 'Other', role: 'learner' }
  })
  otherId = other.id
  otherToken = app.jwt.sign({ id: otherId, email: other.email, role: 'learner' })

  const ws = await prisma.businessWorkspace.create({
    data: { name: 'Int WS', createdById: ownerId }
  })
  workspaceId = ws.id
  await prisma.businessMember.create({
    data: { workspaceId, userId: ownerId, role: 'owner' }
  })

  const ws2 = await prisma.businessWorkspace.create({
    data: { name: 'Other WS', createdById: otherId }
  })
  otherWorkspaceId = ws2.id
  await prisma.businessMember.create({
    data: { workspaceId: otherWorkspaceId, userId: otherId, role: 'owner' }
  })
})

afterAll(async () => {
  await prisma.marketplaceOrder.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.marketplaceProduct.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.integrationConnection.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.auditLog.deleteMany({ where: { entityType: 'integration_connection' } }).catch(() => {})
  await prisma.workspaceActivity.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.businessMember.deleteMany({ where: { userId: { in: [ownerId, otherId] } } }).catch(() => {})
  await prisma.businessWorkspace.deleteMany({ where: { createdById: { in: [ownerId, otherId] } } }).catch(() => {})
  await prisma.userPreference.deleteMany({ where: { userId: { in: [ownerId, otherId] } } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } }).catch(() => {})
  await app.close()
})

beforeEach(() => {
  failingAdapterStub.failFetchOrders = false
  failingAdapterStub.throwAuth = false
})

describe('connect flow', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await post('/integrations/trendyol/connect', { ...CONNECT_BODY, workspaceId })
    expect(res.statusCode).toBe(401)
  })

  it('rejects invalid input shapes with 422', async () => {
    const res = await post('/integrations/trendyol/connect', {
      workspaceId, merchantId: 'not-numeric', apiKey: 'short', apiSecret: 'x'
    }, ownerToken)
    expect(res.statusCode).toBe(422)
  })

  it('does NOT write an ACTIVE connection for invalid credentials', async () => {
    const res = await post('/integrations/trendyol/connect', {
      ...CONNECT_BODY,
      apiKey: 'invalid-key',
      workspaceId
    }, ownerToken)
    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('INVALID_CREDENTIALS')

    const count = await prisma.integrationConnection.count({ where: { workspaceId } })
    expect(count).toBe(0)
  })

  it('connects valid credentials and stores them ENCRYPTED', async () => {
    const res = await post('/integrations/trendyol/connect', { ...CONNECT_BODY, workspaceId }, ownerToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.connection.status).toBe('ACTIVE')
    expect(body.connection.hasStoredCredentials).toBe(true)

    // Response asla credential tasimaz.
    expect(JSON.stringify(body)).not.toContain(CONNECT_BODY.apiKey)
    expect(JSON.stringify(body)).not.toContain(CONNECT_BODY.apiSecret)

    const connection = await prisma.integrationConnection.findFirstOrThrow({ where: { workspaceId } })
    expect(connection.externalAccountId).toBe(CONNECT_BODY.merchantId)
    expect(connection.encryptedApiKey).toBeTruthy()
    expect(connection.encryptedApiKey!).not.toContain(CONNECT_BODY.apiKey)
    expect(connection.encryptedApiSecret!).not.toContain(CONNECT_BODY.apiSecret)
  })

  it('re-connecting updates the same row (unique workspace+provider+account)', async () => {
    const res = await post('/integrations/trendyol/connect', { ...CONNECT_BODY, workspaceId }, ownerToken)
    expect(res.statusCode).toBe(200)
    const connections = await prisma.integrationConnection.findMany({ where: { workspaceId } })
    expect(connections).toHaveLength(1)
  })
})

describe('integration listing and status', () => {
  it('lists sanitized connections without credential material', async () => {
    const res = await get(`/integrations?workspaceId=${workspaceId}`, ownerToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.connections).toHaveLength(1)
    expect(Object.keys(body.connections[0])).not.toContain('encryptedApiKey')
    expect(JSON.stringify(body)).not.toContain(CONNECT_BODY.apiKey)
  })

  it('marketplaces catalog marks four providers enabled, rest coming soon', async () => {
    const res = await get('/integrations/marketplaces', ownerToken)
    expect(res.statusCode).toBe(200)
    const marketplaces = res.json().marketplaces
    expect(marketplaces.find((m: any) => m.provider === 'TRENDYOL').enabled).toBe(true)
    expect(marketplaces.find((m: any) => m.provider === 'HEPSIBURADA').enabled).toBe(true)
    expect(marketplaces.find((m: any) => m.provider === 'N11').enabled).toBe(true)
    expect(marketplaces.find((m: any) => m.provider === 'SHOPIFY').enabled).toBe(true)
    expect(marketplaces.filter((m: any) => !['TRENDYOL', 'HEPSIBURADA', 'N11', 'SHOPIFY'].includes(m.provider)).every((m: any) => !m.enabled && m.comingSoon)).toBe(true)

    /* Amazon katalogda "Yakinda" karti olarak durur: SP-API onay sureci
       olmadan gercek bagdastirici yazilamayacagi icin devre disi. */
    const amazon = marketplaces.find((m: any) => m.provider === 'AMAZON')
    expect(amazon).toBeDefined()
    expect(amazon.label).toBe('Amazon')
    expect(amazon.enabled).toBe(false)
    expect(amazon.comingSoon).toBe(true)

    /* WooCommerce katalogdan CIKARILDI; enum degeri veritabaninda
       kalir ama artik hicbir kullaniciya sunulmaz. */
    expect(marketplaces.some((m: any) => m.provider === 'WOOCOMMERCE')).toBe(false)
  })

  it('status reports connected counts', async () => {
    const res = await get(`/integrations/trendyol/status?workspaceId=${workspaceId}`, ownerToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().connected).toBe(true)
    expect(res.json().counts.orders).toBe(0)
  })

  it('blocks non-members with 403 (tenant isolation)', async () => {
    const res = await get(`/integrations?workspaceId=${workspaceId}`, otherToken)
    expect(res.statusCode).toBe(403)
  })
})

describe('sync flow (first sync, duplicate sync, dedupe)', () => {
  let syncService: typeof import('../../src/services/integrations/sync-service')

  beforeAll(async () => {
    syncService = await import('../../src/services/integrations/sync-service')
  })

  it('manual sync stores orders + products; duplicate sync does not duplicate', async () => {
    const trigger = await post('/integrations/trendyol/sync', { workspaceId }, ownerToken)
    expect(trigger.statusCode).toBe(200)
    expect(trigger.json().started).toBe(true)

    // Fire-and-forget islemin bitmesini bekle.
    await waitFor(async () =>
      (await prisma.marketplaceOrder.count({ where: { workspaceId } })) === 2
    )

    const ordersBefore = await prisma.marketplaceOrder.count({ where: { workspaceId } })
    const itemsBefore = await prisma.marketplaceOrderItem.count()
    expect(ordersBefore).toBe(2)
    expect(itemsBefore).toBeGreaterThan(0)

    // Ikinci sync — ayni siparisler tekrar cekilir, DUPLICATE OLUSMAZ.
    const outcome = await syncService.runConnectionSync(prisma, (
      await prisma.integrationConnection.findFirstOrThrow({ where: { workspaceId } })
    ).id, { syncType: 'MANUAL' })
    expect(outcome.status).toBe('SUCCESS')

    const ordersAfter = await prisma.marketplaceOrder.count({ where: { workspaceId } })
    expect(ordersAfter).toBe(ordersBefore)

    const run = await prisma.integrationSyncRun.findFirstOrThrow({
      where: { connection: { workspaceId } },
      orderBy: { startedAt: 'desc' }
    })
    expect(run.recordsUpdated).toBeGreaterThanOrEqual(2)
    expect(run.recordsCreated).toBe(0)
  })

  it('normalizes provider status and keeps unknown money fields null', async () => {
    const order = await prisma.marketplaceOrder.findFirstOrThrow({
      where: { workspaceId, externalId: 'PKG-1' },
      include: { items: true }
    })
    expect(order.status).toBe('DELIVERED')
    expect(Number(order.grossAmount)).toBeCloseTo(100, 2)
    expect(order.commissionAmount).toBeNull()
    expect(order.shippingAmount).toBeNull()
    expect(order.netContribution).toBeNull()
    expect(order.customerDisplayName).toBe('Ali V.')
    const itemMeta = order.items[0].metadata as Record<string, unknown>
    expect(itemMeta?.commissionPercent).toBe(12)
  })

  it('partial failure finishes run as PARTIAL but keeps fetched pages', async () => {
    failingAdapterStub.failFetchOrders = true
    const connection = await prisma.integrationConnection.findFirstOrThrow({ where: { workspaceId } })
    const outcome = await syncService.runConnectionSync(prisma, connection.id, { syncType: 'MANUAL' })
    expect(outcome.status).toBe('PARTIAL')

    const run = await prisma.integrationSyncRun.findFirstOrThrow({
      where: { connectionId: connection.id },
      orderBy: { startedAt: 'desc' }
    })
    expect(run.status).toBe('PARTIAL')
    expect(run.errorCode).toBe('TRENDYOL_PROVIDER_ERROR')

    // Baglanti ERROR'a gecer ama veri korunur.
    const updated = await prisma.integrationConnection.findUniqueOrThrow({ where: { id: connection.id } })
    expect(updated.status).toBe('ERROR')
    expect(await prisma.marketplaceOrder.count({ where: { workspaceId } })).toBe(2)
  })

  it('provider auth failure during sync sets error state without raw secrets', async () => {
    failingAdapterStub.throwAuth = true
    const connection = await prisma.integrationConnection.findFirstOrThrow({ where: { workspaceId } })
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: { consecutiveFailureCount: 0 }
    })
    const outcome = await syncService.runConnectionSync(prisma, connection.id, { syncType: 'MANUAL' })
    expect(outcome.status).toBe('PARTIAL')

    const updated = await prisma.integrationConnection.findUniqueOrThrow({ where: { id: connection.id } })
    expect(updated.status).toBe('ERROR')
    expect(updated.lastErrorCode).toBe('TRENDYOL_AUTH')
    expect(updated.consecutiveFailureCount).toBeGreaterThanOrEqual(1)
  })

  it('prevents concurrent syncs for the same connection', async () => {
    failingAdapterStub.failFetchOrders = true // fetch asamasi uzun surmesin diye hemen PARTIAL
    const connection = await prisma.integrationConnection.findFirstOrThrow({ where: { workspaceId } })
    await prisma.integrationConnection.update({ where: { id: connection.id }, data: { consecutiveFailureCount: 0 } })
    failingAdapterStub.failFetchOrders = false

    const first = syncService.runConnectionSync(prisma, connection.id, { syncType: 'MANUAL' })
    const second = await syncService.runConnectionSync(prisma, connection.id, { syncType: 'MANUAL' })
    expect(second.status).toBe('SKIPPED')
    expect(second.reason).toBe('SYNC_ALREADY_RUNNING')
    await first
  })

  it('circuit breaker skips scheduled sync after threshold failures', async () => {
    const { isConnectionDueForSync, CIRCUIT_BREAKER_THRESHOLD } = await import('../../src/services/integrations/sync-service')
    expect(CIRCUIT_BREAKER_THRESHOLD).toBeGreaterThanOrEqual(3)
    const tripped = {
      syncEnabled: true, status: 'ERROR', lastSyncedAt: null,
      consecutiveFailureCount: CIRCUIT_BREAKER_THRESHOLD, syncIntervalMinutes: null
    }
    expect(isConnectionDueForSync(tripped)).toBe(false)

    const healthy = {
      syncEnabled: true, status: 'ACTIVE', lastSyncedAt: null,
      consecutiveFailureCount: 0, syncIntervalMinutes: null
    }
    expect(isConnectionDueForSync(healthy)).toBe(true)

    const disabled = { ...healthy, syncEnabled: false }
    expect(isConnectionDueForSync(disabled)).toBe(false)
  })
})

describe('tenant isolation on marketplace data', () => {
  beforeAll(async () => {
    // Diger workspace'e AYNI externalId ile siparis yazilabilir:
    // unique anahtar workspace dahildir.
    await prisma.marketplaceOrder.upsert({
      where: {
        workspaceId_provider_externalId: {
          workspaceId: otherWorkspaceId, provider: 'TRENDYOL', externalId: 'PKG-OTHER'
        }
      },
      update: {},
      create: {
        workspaceId: otherWorkspaceId,
        provider: 'TRENDYOL',
        externalId: 'PKG-OTHER',
        grossAmount: 500,
        status: 'DELIVERED',
        orderDate: new Date()
      }
    })
  })

  afterAll(async () => {
    await prisma.marketplaceOrder.deleteMany({ where: { workspaceId: otherWorkspaceId } }).catch(() => {})
  })

  it("user cannot read another workspace's orders", async () => {
    const res = await get(`/marketplace/orders?workspaceId=${otherWorkspaceId}`, ownerToken)
    expect(res.statusCode).toBe(403)
  })

  it("same external id can exist per-workspace without cross-leak", async () => {
    const own = await get(`/marketplace/orders?workspaceId=${workspaceId}`, ownerToken)
    expect(own.statusCode).toBe(200)
    const ids = own.json().orders.map((o: any) => o.externalId)
    expect(ids).toContain('PKG-1')
    expect(ids).not.toContain('PKG-OTHER')

    const theirs = await get(`/marketplace/orders?workspaceId=${otherWorkspaceId}`, otherToken)
    expect(theirs.json().orders.map((o: any) => o.externalId)).toEqual(['PKG-OTHER'])
  })

  it('order detail is workspace-scoped', async () => {
    const list = await get(`/marketplace/orders?workspaceId=${workspaceId}`, ownerToken)
    const orderId = list.json().orders[0].id
    const ok = await get(`/marketplace/orders/${orderId}?workspaceId=${workspaceId}`, ownerToken)
    expect(ok.statusCode).toBe(200)
    const leak = await get(`/marketplace/orders/${orderId}?workspaceId=${otherWorkspaceId}`, otherToken)
    expect(leak.statusCode).toBe(404)
  })
})

describe('summary and disconnect', () => {
  it('summary aggregates only DB data', async () => {
    const res = await get(`/marketplace/summary?workspaceId=${workspaceId}&days=30`, ownerToken)
    expect(res.statusCode).toBe(200)
    const summary = res.json()
    expect(summary.orderCount).toBe(2)
    expect(summary.grossSales).toBeCloseTo(200, 2)
    expect(summary.commissionTotal).toBeNull()
    expect(summary.financialCompleteness).toBe('PARTIAL')
    expect(Array.isArray(summary.topProducts)).toBe(true)
  })

  it('calculation hints expose actual percent data only', async () => {
    const res = await get(`/marketplace/calculation-hints?workspaceId=${workspaceId}`, ownerToken)
    expect(res.statusCode).toBe(200)
    const hints = res.json()
    expect(hints.available).toBe(true)
    expect(hints.avgCommissionPercent).toBe(12)
  })

  it('disconnect removes credentials irreversibly but RETAINS history', async () => {
    const res = await del(`/integrations/trendyol/disconnect?workspaceId=${workspaceId}`, ownerToken)
    expect(res.statusCode).toBe(200)

    const connections = await prisma.integrationConnection.findMany({ where: { workspaceId } })
    expect(connections).toHaveLength(0)
    // Gecmis siparis/urun kayitlari silinmez (veri saklama politikasi).
    expect(await prisma.marketplaceOrder.count({ where: { workspaceId } })).toBe(2)
    expect(await prisma.marketplaceProduct.count({ where: { workspaceId } })).toBe(1)
  })

  it('audit log captured connect/disconnect without secrets', async () => {
    const logs = await prisma.auditLog.findMany({ where: { entityType: 'integration_connection' } })
    const actions = logs.map(l => l.action)
    expect(actions).toContain('integration.connected')
    expect(actions).toContain('integration.sync_triggered')
    expect(actions).toContain('integration.disconnected')
    for (const log of logs) {
      expect(log.metadata).not.toContain(CONNECT_BODY.apiKey)
      expect(log.metadata).not.toContain(CONNECT_BODY.apiSecret)
    }
  })
})

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('waitFor timeout')
}
