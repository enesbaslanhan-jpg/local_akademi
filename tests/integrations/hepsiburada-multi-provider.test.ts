import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { trendyolAdapter } from '../../src/services/integrations/marketplaces/trendyol/TrendyolAdapter.js'
import { hepsiburadaAdapter } from '../../src/services/integrations/marketplaces/hepsiburada/index.js'
import {
  buildHepsiburadaCatalogRows,
  buildHepsiburadaListings,
  buildHepsiburadaPackages,
  buildSharedSkuPackage,
  hepsiburadaCatalogEnvelope
} from './fixtures/hepsiburada-fixtures.js'

/*
 * MULTI-PROVIDER E2E REGRESSION (provider-independence testi).
 *
 * Ayni workspace'te Trendyol + Hepsiburada mock'lari AYNI ANDA bagli.
 * Mock akisi: RAW payload -> GERCEK adapter mapper'lari -> ortak DB
 * pipeline. Core service'e provider branch'i EKLENMEDIGINI de kanitlar:
 * her sey registry uzerinden calisir.
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
      productName: 'İki Pazaryerinde Aynı Ürün',
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
      content: { contentId: 555, title: 'İki Pazaryerinde Aynı Ürün', brand: { name: 'Ortak Marka' }, category: { name: 'Kategori' }, variants: [] },
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

  registry.registerAdapter(trendyolAdapter)
  registry.registerAdapter(hepsiburadaAdapter)

  await app.register(integrationRoutes, { prisma })
  await app.ready()

  const now = Date.now()
  const owner = await prisma.user.create({
    data: { email: `mp-owner-${now}@test.com`, password: 'x', name: 'MP Owner', role: 'learner' }
  })
  ownerId = owner.id
  ownerToken = app.jwt.sign({ id: ownerId, email: owner.email, role: 'learner' })

  const other = await prisma.user.create({
    data: { email: `mp-other-${now}@test.com`, password: 'x', name: 'MP Other', role: 'learner' }
  })
  otherId = other.id
  otherToken = app.jwt.sign({ id: otherId, email: other.email, role: 'learner' })

  const ws = await prisma.businessWorkspace.create({ data: { name: 'Multi Provider WS', createdById: ownerId } })
  workspaceId = ws.id
  await prisma.businessMember.create({ data: { workspaceId, userId: ownerId, role: 'owner' } })

  const ws2 = await prisma.businessWorkspace.create({ data: { name: 'Other MP WS', createdById: otherId } })
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
})

describe('iki provider ayni workspace te', () => {
  let hbConnectionId: string

  beforeAll(async () => {
    // Connect route'lari uzerinden iki provider da baglanir (route-level test).
    const ty = await post('/integrations/trendyol/connect', {
      workspaceId, merchantId: '123456', apiKey: 'valid-key-12345', apiSecret: 'valid-secret-67890'
    }, ownerToken)
    expect(ty.statusCode).toBe(200)

    const hb = await post('/integrations/hepsiburada/connect', {
      workspaceId, merchantId: 'b24f1a2c-1111-4a5b-9c6d-000000000001',
      username: 'api-user@merchant.com', password: 'hb-secret-pass'
    }, ownerToken)
    expect(hb.statusCode).toBe(200)
    hbConnectionId = hb.json().connection.id

    const { runConnectionSync } = await import('../../src/services/integrations/sync-service')
    const connections = await prisma.integrationConnection.findMany({ where: { workspaceId } })
    expect(connections).toHaveLength(2)
    for (const connection of connections) {
      await runConnectionSync(prisma, connection.id, { syncType: 'MANUAL' })
    }
  })

  it('stores exactly two ACTIVE connections', async () => {
    const connections = await prisma.integrationConnection.findMany({ where: { workspaceId } })
    expect(connections).toHaveLength(2)
    expect(connections.map(c => c.provider).sort()).toEqual(['HEPSIBURADA', 'TRENDYOL'])
  })

  it('imports orders from BOTH providers through their real mappers', async () => {
    await waitFor(
      () => prisma.marketplaceOrder.count({ where: { workspaceId } }),
      count => count >= 42 // 41 HB paket (40 plan + shared) + 2 TY - ortak yok cunku external farkli... asagi dogrulanir
    )
    const orders = await prisma.marketplaceOrder.findMany({ where: { workspaceId } })
    const byProvider = new Map(orders.map(o => [o.provider, o]))
    expect(byProvider.has('TRENDYOL')).toBe(true)
    expect(byProvider.has('HEPSIBURADA')).toBe(true)

    // HB status dagilimi gercek mapper'dan gecti:
    const statuses = new Map<string, number>()
    for (const order of orders.filter(o => o.provider === 'HEPSIBURADA')) {
      statuses.set(order.status, (statuses.get(order.status) ?? 0) + 1)
    }
    expect(statuses.get('DELIVERED') ?? 0).toBeGreaterThanOrEqual(13) // 12 plan + shared
    expect(statuses.get('CREATED') ?? 0).toBe(7)
    expect(statuses.get('PROCESSING') ?? 0).toBe(6)
    expect(statuses.get('SHIPPED') ?? 0).toBe(8)
    expect(statuses.get('CANCELLED') ?? 0).toBe(4)
    expect(statuses.get('RETURNED') ?? 0).toBe(3)
  })

  it('duplicate external IDs across providers stay SEPARATE rows', async () => {
    const shared = await prisma.marketplaceOrder.findMany({
      where: { workspaceId, externalId: 'PKG-SHARED-1' }
    })
    expect(shared).toHaveLength(2)
    expect(shared.map(r => r.provider).sort()).toEqual(['HEPSIBURADA', 'TRENDYOL'])

    const products = await prisma.marketplaceProduct.findMany({
      where: { workspaceId, externalId: 'SKU-SHARED' }
    })
    expect(products).toHaveLength(2)
    expect(products.map(p => p.provider).sort()).toEqual(['HEPSIBURADA', 'TRENDYOL'])
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

  it('operations aggregates BOTH providers into one summary', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, ownerToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.summary.connected).toBe(true)
    expect(body.summary.providers.map((p: any) => p.provider).sort())
      .toEqual(['HEPSIBURADA', 'TRENDYOL'])
    // Bugun ayni gun icinde iki provider'in siparislari tek havuzda:
    const totalToday = body.summary.today.orderCount
    const dbToday = await prisma.marketplaceOrder.count({
      where: {
        workspaceId,
        status: { notIn: ['CANCELLED'] as any[] },
        orderDate: { gte: (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })() }
      }
    })
    expect(totalToday).toBe(dbToday)
    // Pending shipment iki provider'dan birlesik:
    const pendingInDb = await prisma.marketplaceOrder.count({
      where: { workspaceId, status: { in: ['CREATED', 'PROCESSING'] as any[] } }
    })
    const pendingAction = body.actions.find((a: any) => a.type === 'PENDING_SHIPMENT')
    expect(pendingAction.count).toBe(pendingInDb)
    // Dusuk stok iki provider'dan birlesik:
    const lowStockInDb = await prisma.marketplaceProduct.count({
      where: { workspaceId, isActive: true, stockQuantity: { gt: 0, lte: 10 } }
    })
    expect(body.summary.inventory.lowStockCount).toBe(lowStockInDb)
  })

  it('orders endpoint filters by provider without splitting the table', async () => {
    const all = await get(`/marketplace/orders?workspaceId=${workspaceId}&limit=100`, ownerToken)
    const hb = await get(`/marketplace/orders?workspaceId=${workspaceId}&limit=100&provider=HEPSIBURADA`, ownerToken)
    expect(all.statusCode).toBe(200)
    expect(hb.statusCode).toBe(200)
    const allProviders = new Set(all.json().orders.map((o: any) => o.provider))
    expect(allProviders.size).toBe(2)
    expect(hb.json().orders.every((o: any) => o.provider === 'HEPSIBURADA')).toBe(true)
  })

  it('LocalKarar product settings are isolated per provider row', async () => {
    const tyProduct = await prisma.marketplaceProduct.findFirst({
      where: { workspaceId, provider: 'TRENDYOL', externalId: 'SKU-SHARED' }
    })
    const hbProduct = await prisma.marketplaceProduct.findFirst({
      where: { workspaceId, provider: 'HEPSIBURADA', externalId: 'SKU-SHARED' }
    })
    expect(tyProduct && hbProduct).toBeTruthy()

    const res = await app.inject({
      method: 'PATCH',
      url: `/marketplace/products/${tyProduct!.id}/settings`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { workspaceId, internalNote: 'trendyol notu', isFavorite: true }
    })
    expect(res.statusCode).toBe(200)

    // HB karsiligi ETKILENMEZ.
    const hbAfter = await prisma.marketplaceProduct.findUnique({ where: { id: hbProduct!.id } })
    expect(hbAfter?.internalNote).toBeNull()
    expect(hbAfter?.isFavorite).toBe(false)
  })

  it('HB sync does NOT overwrite LocalKarar fields on its own row', async () => {
    const hbProduct = await prisma.marketplaceProduct.findFirst({
      where: { workspaceId, provider: 'HEPSIBURADA', externalId: 'MSKU-01' }
    })
    await prisma.marketplaceProduct.update({
      where: { id: hbProduct!.id },
      data: { internalNote: 'hb yerel notu', tags: ['kontrol'] }
    })

    const { runConnectionSync } = await import('../../src/services/integrations/sync-service')
    const hbConnection = await prisma.integrationConnection.findFirst({
      where: { workspaceId, provider: 'HEPSIBURADA' }
    })
    await runConnectionSync(prisma, hbConnection!.id, { syncType: 'MANUAL' })

    const after = await prisma.marketplaceProduct.findUnique({ where: { id: hbProduct!.id } })
    expect(after?.internalNote).toBe('hb yerel notu')
    expect(after?.tags).toEqual(['kontrol'])
  })

  it('AI/operations aggregate leaks NO customer PII', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, ownerToken)
    const raw = res.body
    expect(raw.includes('Ayşe')).toBe(false)
    expect(raw.includes('Ali Veli')).toBe(false)
    expect(raw.toLowerCase().includes('customername')).toBe(false)
  })

  it('is isolated per workspace (other member sees nothing)', async () => {
    const res = await get(`/marketplace/operations?workspaceId=${workspaceId}`, otherToken)
    expect(res.statusCode).toBe(403)
    const own = await get(`/marketplace/operations?workspaceId=${otherWorkspaceId}`, otherToken)
    expect(own.json().summary.connected).toBe(false)
    expect(own.json().summary.providers).toHaveLength(0)
  })

  it('disconnect removes only the target provider connection', async () => {
    const del = await app.inject({
      method: 'DELETE',
      url: `/integrations/hepsiburada/disconnect?workspaceId=${workspaceId}`,
      headers: { authorization: `Bearer ${ownerToken}` }
    })
    expect(del.statusCode).toBe(200)
    const remaining = await prisma.integrationConnection.findMany({ where: { workspaceId } })
    expect(remaining.map(c => c.provider)).toEqual(['TRENDYOL'])
    // Gecmis veriler KORUNUR.
    const hbOrders = await prisma.marketplaceOrder.count({ where: { workspaceId, provider: 'HEPSIBURADA' } })
    expect(hbOrders).toBeGreaterThan(0)
    void hbConnectionId
  })
})
