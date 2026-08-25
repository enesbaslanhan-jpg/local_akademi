import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { prisma as sharedPrisma } from '../../lib/prisma.js'
import { encryptSecret } from '../../lib/crypto.js'
import { access } from '../business-tracker.js'
import { createAuditLog } from '../audit.js'
import { PROVIDER_CATALOG, getAdapter, registerAdapter } from './adapter-registry.js'
import { publicConnectionView } from './credentials.js'
import { runConnectionSync, isSyncInFlight, CIRCUIT_BREAKER_THRESHOLD } from './sync-service.js'
import { getMarketplaceSummary, getCalculationHints } from './queries.js'
import { getMarketplaceOperations } from './operations.js'
import {
  listProductsWithMetrics,
  getProductDetailWithMetrics,
  getMarketplaceProductOverview
} from './product-analytics.js'
import { trendyolAdapter } from './marketplaces/trendyol/TrendyolAdapter.js'
import { hepsiburadaAdapter } from './marketplaces/hepsiburada/index.js'
import { n11Adapter } from './marketplaces/n11/index.js'
import { shopifyAdapter } from './marketplaces/shopify/index.js'
import { normalizeShopDomain } from './marketplaces/shopify/ShopifyClient.js'
import {
  buildShopifyAuthorizationUrl,
  createShopifyOAuthState,
  exchangeShopifyAuthorizationCode,
  hasRequiredShopifyScopes,
  verifyShopifyCallbackHmac,
  verifyShopifyOAuthState
} from './marketplaces/shopify/ShopifyAuth.js'

/*
 * INTEGRASYON / PAZARYERI ROTALARI.
 *
 * - Baglanti ve veriler WORKSPACE'e goredir: her istekte access()
 *   ile tenant isolation yapilir.
 * - Credential'lar hicbir cevapta DONMEZ, logda GORUNMEZ.
 * - Connect akisi once validateCredentials yapar; gecersiz
 *   credential'da DB'ye ACTIVE baglanti YAZILMAZ.
 * - Sayfa acilisinda provider cagrisi olmaz: listeleme/detay yalniz
 *   LocalKarar DB'sinden okur.
 */

// Adapter kayitlari modul yuklemesinde bir kez yapilir. Yeni provider
// eklerken buraya bir satir eklenir; core logic degismez.
registerAdapter(trendyolAdapter)
registerAdapter(hepsiburadaAdapter)
registerAdapter(n11Adapter)
registerAdapter(shopifyAdapter)

const workspaceQuery = z.object({
  workspaceId: z.string().uuid()
})

const connectInput = z.object({
  workspaceId: z.string().uuid(),
  merchantId: z.string().trim().min(1).max(20).regex(/^\d+$/, 'Merchant ID must be numeric'),
  apiKey: z.string().trim().min(6).max(512),
  apiSecret: z.string().trim().min(4).max(512),
  displayName: z.string().trim().max(120).optional()
})

/*
 * HEPSIBURADA credential modeli (resmi dokuman):
 * - merchantId: UUID biciminde satici kimligi
 * - username/password: Merchant Portal > Ayarlar > Entegrasyonlar
 * Generic IntegrationConnection kolonlarina eslenir:
 * externalAccountId=merchantId, encryptedApiKey=username,
 * encryptedApiSecret=password. Schema degisikligi GEREKMEZ.
 */
const hepsiburadaConnectInput = z.object({
  workspaceId: z.string().uuid(),
  merchantId: z.string().trim().min(8).max(64).regex(/^[A-Za-z0-9-]+$/, 'Merchant ID must be alphanumeric'),
  username: z.string().trim().min(3).max(256),
  password: z.string().trim().min(4).max(512),
  displayName: z.string().trim().max(120).optional()
})

/*
 * N11 credential modeli (resmi dokuman, developer.n11.com):
 * - appKey + appSecret: her istekte HTTP header olarak gonderilir.
 *   Anahtarlar Satici Paneli (so.n11.com) > Hesabim > API Hesaplari.
 * - Resmi API kimliginde ayri seller/store id ZORUNLU degildir;
 *   "storeName" yalnizca LocalKarar'in baglanti unique kimligi
 *   (externalAccountId) olarak kullanilir.
 * Generic IntegrationConnection kolonlarina eslenir:
 * externalAccountId=storeName, encryptedApiKey=appKey,
 * encryptedApiSecret=appSecret. Schema degisikligi GEREKMEZ.
 */
const n11ConnectInput = z.object({
  workspaceId: z.string().uuid(),
  storeName: z.string().trim().min(2).max(120),
  appKey: z.string().trim().min(8).max(256),
  appSecret: z.string().trim().min(8).max(256),
  displayName: z.string().trim().max(120).optional()
})

const shopifyConnectInput = z.object({
  workspaceId: z.string().uuid(),
  shopDomain: z.string().trim().min(5).max(255)
})

const syncInput = z.object({
  workspaceId: z.string().uuid()
})

const ordersQuery = z.object({
  workspaceId: z.string().uuid(),
  status: z.enum([
    'CREATED', 'PROCESSING', 'SHIPPED', 'DELIVERED',
    'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'UNKNOWN'
  ]).optional(),
  provider: z.enum(['TRENDYOL', 'HEPSIBURADA', 'N11', 'SHOPIFY']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
})

const productsQuery = z.object({
  workspaceId: z.string().uuid(),
  q: z.string().trim().max(200).optional(),
  provider: z.enum(['TRENDYOL', 'HEPSIBURADA', 'N11', 'SHOPIFY', 'WOOCOMMERCE']).optional(),
  onSale: z.enum(['true', 'false']).optional(),
  /** low = LocalKarar esigi alti (provider stok verisiyle); out = 0. */
  stockFilter: z.enum(['all', 'low', 'out']).optional(),
  sort: z.enum(['title', 'bestSelling', 'topRevenue', 'mostReturned']).optional(),
  /** Performans penceresi; yalnizca LocalKarar aggregate'inden gelir. */
  windowDays: z.coerce.number().int().min(7).max(90).default(30),
  lowStockThreshold: z.coerce.number().int().min(1).max(100000).optional()
})

const productDetailQuery = z.object({
  workspaceId: z.string().uuid(),
  lowStockThreshold: z.coerce.number().int().min(1).max(100000).optional()
})

const productsOverviewQuery = z.object({
  workspaceId: z.string().uuid(),
  lowStockThreshold: z.coerce.number().int().min(1).max(100000).optional()
})

const summaryQuery = z.object({
  workspaceId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(365).default(30)
})

const productSettingsInput = z.object({
  workspaceId: z.string().uuid(),
  internalNote: z.string().trim().max(2000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).nullable().optional(),
  lowStockThresholdOverride: z.number().int().min(1).max(100000).nullable().optional(),
  isFavorite: z.boolean().optional()
})

function orderJson(order: any) {
  const num = (value: unknown): number | null =>
    value === null || value === undefined ? null : Number(value)
  return {
    id: order.id,
    provider: order.provider,
    externalId: order.externalId,
    externalOrderNumber: order.externalOrderNumber,
    customerDisplayName: order.customerDisplayName,
    currency: order.currency,
    grossAmount: num(order.grossAmount),
    discountAmount: num(order.discountAmount),
    commissionAmount: num(order.commissionAmount),
    shippingAmount: num(order.shippingAmount),
    refundAmount: num(order.refundAmount),
    netContribution: num(order.netContribution),
    status: order.status,
    orderDate: order.orderDate,
    syncedAt: order.syncedAt,
    metadata: order.metadata ?? null,
    itemCount: order._count?.items ?? undefined,
    items: Array.isArray(order.items)
      ? order.items.map((item: any) => ({
          id: item.id,
          externalProductId: item.externalProductId,
          sku: item.sku,
          barcode: item.barcode,
          title: item.title,
          quantity: item.quantity,
          unitPrice: num(item.unitPrice),
          grossAmount: num(item.grossAmount),
          discountAmount: num(item.discountAmount),
          commissionAmount: num(item.commissionAmount),
          refundAmount: num(item.refundAmount),
          netContribution: num(item.netContribution),
          metadata: item.metadata ?? null
        }))
      : undefined
  }
}

/*
 * GUVENLI HATA SINIRI (plugin-scoped).
 *
 * Beklenmeyen her istisna — Prisma hatasi, eksik tablo/migration,
 * provider kutuphanesi — bu eklentinin error handler'ina duser:
 * kullaniciya KONTROLLU genel mesaj doner; ham exception metni/stack
 * hicbir ortamda (dev dahil) yanita gecmez. Detay yalnizca sunucu
 * loguna yazilir. 4xx akislari (zod/access) kendi mesajiyla aynen
 * calismaya devam eder.
 */
const GENERIC_INTEGRATION_ERROR = 'Entegrasyon verisi şu anda okunamadı. Lütfen kısa süre sonra tekrar deneyin.'

export async function integrationRoutes(
  fastify: FastifyInstance,
  opts?: { prisma?: PrismaClient }
) {
  const prisma = opts?.prisma ?? sharedPrisma

  /*
   * Plugin-scoped error siniri: yalnizca bu rotalarda firlayan
   * beklenmeyen hatalari yakalar. 4xx'ler (zod/access/403) kendi
   * govdesiyle dondugu icin etkilenmez; 5xx'te ham mesaj ASLA
   * yanita gecmez.
   */
  fastify.setErrorHandler((error, request, reply) => {
    const err = error as any
    const statusCode = Number(err?.statusCode) || 500
    if (statusCode < 500) {
      return reply.status(statusCode).send({ error: err.message ?? 'İstek geçersiz.' })
    }
    request.log.error({ err: error }, 'integration route failed')
    return reply.status(500).send({ error: GENERIC_INTEGRATION_ERROR, code: 'INTEGRATION_UNAVAILABLE' })
  })

  fastify.addHook('preHandler', async (request, reply) => {
    // Shopify bu callback'i merchant tarayicisindan cagirir; JWT yerine
    // Shopify HMAC + kisa omurlu imzali state ile dogrulanir.
    if (request.routeOptions.url === '/integrations/shopify/oauth/callback') return
    try { await fastify.authenticate(request as any, reply as any) }
    catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })

  async function requireWriter(userId: number, workspaceId: string, reply: any) {
    // access(..., write=true) uyelik + aktif workspace + yazma rolunu
    // (owner/manager/staff/accountant) tek kaynakta kontrol eder.
    return access(prisma, userId, workspaceId, reply, true)
  }

  // --- Entegrasyon katalogu (hangi pazaryerleri destekleniyor) ---
  fastify.get('/integrations/marketplaces', async () => ({
    marketplaces: PROVIDER_CATALOG.map(entry => {
      const adapter = getAdapter(entry.provider)
      return {
        provider: entry.provider,
        label: entry.label,
        enabled: entry.enabled,
        comingSoon: entry.comingSoon,
        // Resmi API'de olmayan analytics alanlari buradan da false doner.
        capabilities: adapter?.capabilities ?? {
          supportsProductViews: false,
          supportsFavorites: false,
          supportsProductAnalytics: false
        }
      }
    })
  }))

  // --- Workspace'in baglantilari ---
  fastify.get('/integrations', async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = workspaceQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    if (!await access(prisma, user.id, parsed.data.workspaceId, reply)) return

    const connections = await prisma.integrationConnection.findMany({
      where: { workspaceId: parsed.data.workspaceId },
      orderBy: { createdAt: 'desc' }
    })
    return {
      connections: connections.map(publicConnectionView),
      marketplaces: PROVIDER_CATALOG.map(entry => ({ ...entry }))
    }
  })

  // --- Trendyol connect ---
  fastify.post('/integrations/trendyol/connect', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = connectInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const input = parsed.data
    const member = await requireWriter(user.id, input.workspaceId, reply)
    if (!member) return

    const adapter = getAdapter('TRENDYOL')
    if (!adapter) return reply.status(500).send({ error: 'Provider adapter is not available' })

    // ONCE dogrula — gecersiz credential DB'ye YAZILMAZ.
    let validation
    try {
      validation = await adapter.validateCredentials({
        externalAccountId: input.merchantId,
        apiKey: input.apiKey,
        apiSecret: input.apiSecret
      })
    } catch {
      return reply.status(502).send({ error: 'Bağlantı doğrulanamadı. Lütfen tekrar deneyin.' })
    }
    if (!validation.valid) {
      return reply.status(400).send({
        error: validation.message || 'Kimlik bilgileri doğrulanamadı.',
        code: validation.errorCode || 'INVALID_CREDENTIALS'
      })
    }

    const now = new Date()
    const data = {
      encryptedApiKey: encryptSecret(input.apiKey),
      encryptedApiSecret: encryptSecret(input.apiSecret),
      status: 'ACTIVE' as const,
      lastErrorCode: null,
      lastErrorAt: null,
      consecutiveFailureCount: 0,
      ...(input.displayName ? { displayName: input.displayName } : {})
    }

    const connection = await prisma.integrationConnection.upsert({
      where: {
        workspaceId_provider_externalAccountId: {
          workspaceId: input.workspaceId,
          provider: 'TRENDYOL',
          externalAccountId: input.merchantId
        }
      },
      update: data,
      create: {
        ...data,
        workspaceId: input.workspaceId,
        createdByUserId: user.id,
        provider: 'TRENDYOL',
        externalAccountId: input.merchantId,
        displayName: input.displayName ?? null,
        syncEnabled: true
      }
    })

    await Promise.allSettled([
      createAuditLog({
        action: 'integration.connected',
        entityType: 'integration_connection',
        entityId: connection.id,
        actorId: user.id,
        actorName: user.email,
        metadata: { provider: 'TRENDYOL' }
      }),
      prisma.workspaceActivity.create({
        data: {
          workspaceId: input.workspaceId,
          actorId: user.id,
          action: 'integration.connected',
          entityType: 'integration_connection',
          entityId: connection.id,
          metadata: JSON.stringify({ provider: 'TRENDYOL' })
        }
      })
    ])

    return { connection: publicConnectionView(connection) }
  })

  // --- Trendyol durum ---
  fastify.get('/integrations/trendyol/status', async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = workspaceQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    if (!await access(prisma, user.id, parsed.data.workspaceId, reply)) return

    const connections = await prisma.integrationConnection.findMany({
      where: { workspaceId: parsed.data.workspaceId, provider: 'TRENDYOL' },
      orderBy: { createdAt: 'desc' }
    })
    const primary = connections[0]
    const [orderCount, productCount, latestRuns] = await Promise.all([
      prisma.marketplaceOrder.count({ where: { workspaceId: parsed.data.workspaceId, provider: 'TRENDYOL' } }),
      prisma.marketplaceProduct.count({ where: { workspaceId: parsed.data.workspaceId, provider: 'TRENDYOL' } }),
      primary
        ? prisma.integrationSyncRun.findMany({
            where: { connectionId: primary.id },
            orderBy: { startedAt: 'desc' },
            take: 5
          })
        : Promise.resolve([])
    ])

    return {
      connected: Boolean(primary && primary.status === 'ACTIVE'),
      syncing: primary ? isSyncInFlight(primary.id) : false,
      circuitBreakerTripped: Boolean(primary && primary.consecutiveFailureCount >= CIRCUIT_BREAKER_THRESHOLD),
      counts: { orders: orderCount, products: productCount },
      latestRuns: latestRuns.map(run => ({
        id: run.id,
        syncType: run.syncType,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        recordsFetched: run.recordsFetched,
        recordsCreated: run.recordsCreated,
        recordsUpdated: run.recordsUpdated,
        recordsSkipped: run.recordsSkipped,
        errorCode: run.errorCode
      })),
      connections: connections.map(publicConnectionView)
    }
  })

  // --- Manuel sync ---
  fastify.post('/integrations/trendyol/sync', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = syncInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const member = await requireWriter(user.id, parsed.data.workspaceId, reply)
    if (!member) return

    const connection = await prisma.integrationConnection.findFirst({
      where: { workspaceId: parsed.data.workspaceId, provider: 'TRENDYOL' },
      orderBy: { createdAt: 'desc' }
    })
    if (!connection) return reply.status(404).send({ error: 'Bağlı Trendyol hesabı bulunamadı.' })
    if (['DISABLED', 'PENDING'].includes(connection.status)) {
      return reply.status(400).send({ error: 'Bağlantı eşitlemeye uygun değil. Lütfen tekrar bağlanın.', code: 'CONNECTION_NOT_ACTIVE' })
    }
    if (isSyncInFlight(connection.id)) {
      return reply.status(409).send({ error: 'Eşitleme şu anda zaten çalışıyor.', code: 'SYNC_ALREADY_RUNNING' })
    }

    void runConnectionSync(prisma, connection.id, {
      syncType: 'MANUAL',
      requestedByUserId: user.id
    }).then(outcome => {
      void outcome
    }).catch(() => {})

    await createAuditLog({
      action: 'integration.sync_triggered',
      entityType: 'integration_connection',
      entityId: connection.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { provider: 'TRENDYOL', note: 'manual' }
    }).catch(() => {})

    return { started: true, connectionId: connection.id }
  })

  // --- Disconnect: credential'lar geri dondurulemez sekilde kaldirilir;
  // gecmis siparis/urun kayitlari isletme gecmisi olarak KORUNUR. ---
  fastify.delete('/integrations/trendyol/disconnect', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = workspaceQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    const member = await requireWriter(user.id, parsed.data.workspaceId, reply)
    if (!member) return

    const connection = await prisma.integrationConnection.findFirst({
      where: { workspaceId: parsed.data.workspaceId, provider: 'TRENDYOL' },
      orderBy: { createdAt: 'desc' }
    })
    if (!connection) return reply.status(404).send({ error: 'Bağlı Trendyol hesabı bulunamadı.' })

    // Satir silinir: sifreli credential'lar irreversibly yok olur.
    await prisma.integrationConnection.delete({ where: { id: connection.id } })

    await Promise.allSettled([
      createAuditLog({
        action: 'integration.disconnected',
        entityType: 'integration_connection',
        entityId: connection.id,
        actorId: user.id,
        actorName: user.email,
        metadata: { provider: 'TRENDYOL' }
      }),
      prisma.workspaceActivity.create({
        data: {
          workspaceId: parsed.data.workspaceId,
          actorId: user.id,
          action: 'integration.disconnected',
          entityType: 'integration_connection',
          entityId: connection.id,
          metadata: JSON.stringify({ provider: 'TRENDYOL' })
        }
      })
    ])

    return { disconnected: true, retainedOrders: true }
  })

  // =====================================================================
  // HEPSIBURADA baglanti akisi — Trendyol ile AYNI semantigi paylasan
  // provider yuzeyi (validate-once, encrypted storage, safe errors).
  // Core sync service'e dokunulmaz: adapter registry uzerinden calisir.
  // =====================================================================

  async function connectHepsiburada(request: any, reply: any) {
    const user = request.user as { id: number; email: string }
    const parsed = hepsiburadaConnectInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const input = parsed.data
    const member = await requireWriter(user.id, input.workspaceId, reply)
    if (!member) return

    const adapter = getAdapter('HEPSIBURADA')
    if (!adapter) return reply.status(500).send({ error: 'Provider adapter is not available' })

    // ONCE dogrula — gecersiz credential DB'ye YAZILMAZ.
    let validation
    try {
      validation = await adapter.validateCredentials({
        externalAccountId: input.merchantId,
        apiKey: input.username,
        apiSecret: input.password
      })
    } catch {
      return reply.status(502).send({ error: 'Bağlantı doğrulanamadı. Lütfen tekrar deneyin.' })
    }
    if (!validation.valid) {
      return reply.status(400).send({
        error: validation.message || 'Kimlik bilgileri doğrulanamadı.',
        code: validation.errorCode || 'INVALID_CREDENTIALS'
      })
    }

    const data = {
      encryptedApiKey: encryptSecret(input.username),
      encryptedApiSecret: encryptSecret(input.password),
      status: 'ACTIVE' as const,
      lastErrorCode: null,
      lastErrorAt: null,
      consecutiveFailureCount: 0,
      ...(input.displayName ? { displayName: input.displayName } : {})
    }

    const connection = await prisma.integrationConnection.upsert({
      where: {
        workspaceId_provider_externalAccountId: {
          workspaceId: input.workspaceId,
          provider: 'HEPSIBURADA',
          externalAccountId: input.merchantId
        }
      },
      update: data,
      create: {
        ...data,
        workspaceId: input.workspaceId,
        createdByUserId: user.id,
        provider: 'HEPSIBURADA',
        externalAccountId: input.merchantId,
        displayName: input.displayName ?? null,
        syncEnabled: true
      }
    })

    await Promise.allSettled([
      createAuditLog({
        action: 'integration.connected',
        entityType: 'integration_connection',
        entityId: connection.id,
        actorId: user.id,
        actorName: user.email,
        metadata: { provider: 'HEPSIBURADA' }
      }),
      prisma.workspaceActivity.create({
        data: {
          workspaceId: input.workspaceId,
          actorId: user.id,
          action: 'integration.connected',
          entityType: 'integration_connection',
          entityId: connection.id,
          metadata: JSON.stringify({ provider: 'HEPSIBURADA' })
        }
      })
    ])

    return { connection: publicConnectionView(connection) }
  }

  fastify.post('/integrations/hepsiburada/connect', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, connectHepsiburada)

  // --- Hepsiburada durum ---
  fastify.get('/integrations/hepsiburada/status', async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = workspaceQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    if (!await access(prisma, user.id, parsed.data.workspaceId, reply)) return

    const connections = await prisma.integrationConnection.findMany({
      where: { workspaceId: parsed.data.workspaceId, provider: 'HEPSIBURADA' },
      orderBy: { createdAt: 'desc' }
    })
    const primary = connections[0]
    const [orderCount, productCount] = await Promise.all([
      prisma.marketplaceOrder.count({ where: { workspaceId: parsed.data.workspaceId, provider: 'HEPSIBURADA' } }),
      prisma.marketplaceProduct.count({ where: { workspaceId: parsed.data.workspaceId, provider: 'HEPSIBURADA' } })
    ])

    return {
      connected: Boolean(primary && primary.status === 'ACTIVE'),
      syncing: primary ? isSyncInFlight(primary.id) : false,
      circuitBreakerTripped: Boolean(primary && primary.consecutiveFailureCount >= CIRCUIT_BREAKER_THRESHOLD),
      counts: { orders: orderCount, products: productCount },
      connections: connections.map(publicConnectionView)
    }
  })

  // --- Hepsiburada manuel sync ---
  fastify.post('/integrations/hepsiburada/sync', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = syncInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const member = await requireWriter(user.id, parsed.data.workspaceId, reply)
    if (!member) return

    const connection = await prisma.integrationConnection.findFirst({
      where: { workspaceId: parsed.data.workspaceId, provider: 'HEPSIBURADA' },
      orderBy: { createdAt: 'desc' }
    })
    if (!connection) return reply.status(404).send({ error: 'Bağlı Hepsiburada hesabı bulunamadı.' })
    if (['DISABLED', 'PENDING'].includes(connection.status)) {
      return reply.status(400).send({ error: 'Bağlantı eşitlemeye uygun değil. Lütfen tekrar bağlanın.', code: 'CONNECTION_NOT_ACTIVE' })
    }
    if (isSyncInFlight(connection.id)) {
      return reply.status(409).send({ error: 'Eşitleme şu anda zaten çalışıyor.', code: 'SYNC_ALREADY_RUNNING' })
    }

    void runConnectionSync(prisma, connection.id, {
      syncType: 'MANUAL',
      requestedByUserId: user.id
    }).then(outcome => {
      void outcome
    }).catch(() => {})

    await createAuditLog({
      action: 'integration.sync_triggered',
      entityType: 'integration_connection',
      entityId: connection.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { provider: 'HEPSIBURADA', note: 'manual' }
    }).catch(() => {})

    return { started: true, connectionId: connection.id }
  })

  // --- Hepsiburada disconnect: credential irreversibly yok olur;
  // gecmis siparis/urun kayitlari KORUNUR (Trendyol politikasiyla ayni).
  fastify.delete('/integrations/hepsiburada/disconnect', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = workspaceQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    const member = await requireWriter(user.id, parsed.data.workspaceId, reply)
    if (!member) return

    const connection = await prisma.integrationConnection.findFirst({
      where: { workspaceId: parsed.data.workspaceId, provider: 'HEPSIBURADA' },
      orderBy: { createdAt: 'desc' }
    })
    if (!connection) return reply.status(404).send({ error: 'Bağlı Hepsiburada hesabı bulunamadı.' })

    await prisma.integrationConnection.delete({ where: { id: connection.id } })

    await Promise.allSettled([
      createAuditLog({
        action: 'integration.disconnected',
        entityType: 'integration_connection',
        entityId: connection.id,
        actorId: user.id,
        actorName: user.email,
        metadata: { provider: 'HEPSIBURADA' }
      }),
      prisma.workspaceActivity.create({
        data: {
          workspaceId: parsed.data.workspaceId,
          actorId: user.id,
          action: 'integration.disconnected',
          entityType: 'integration_connection',
          entityId: connection.id,
          metadata: JSON.stringify({ provider: 'HEPSIBURADA' })
        }
      })
    ])

    return { disconnected: true, retainedOrders: true }
  })

  // =====================================================================
  // N11 baglanti akisi — Trendyol/Hepsiburada ile AYNI semantigi paylasan
  // provider yuzeyi (validate-once, encrypted storage, safe errors).
  // Core sync service'e dokunulmaz: adapter registry uzerinden calisir.
  // =====================================================================

  async function connectN11(request: any, reply: any) {
    const user = request.user as { id: number; email: string }
    const parsed = n11ConnectInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const input = parsed.data
    const member = await requireWriter(user.id, input.workspaceId, reply)
    if (!member) return

    const adapter = getAdapter('N11')
    if (!adapter) return reply.status(500).send({ error: 'Provider adapter is not available' })

    // ONCE dogrula — gecersiz credential DB'ye YAZILMAZ.
    let validation
    try {
      validation = await adapter.validateCredentials({
        externalAccountId: input.storeName,
        apiKey: input.appKey,
        apiSecret: input.appSecret
      })
    } catch {
      return reply.status(502).send({ error: 'Bağlantı doğrulanamadı. Lütfen tekrar deneyin.' })
    }
    if (!validation.valid) {
      return reply.status(400).send({
        error: validation.message || 'Kimlik bilgileri doğrulanamadı.',
        code: validation.errorCode || 'INVALID_CREDENTIALS'
      })
    }

    const data = {
      encryptedApiKey: encryptSecret(input.appKey),
      encryptedApiSecret: encryptSecret(input.appSecret),
      status: 'ACTIVE' as const,
      lastErrorCode: null,
      lastErrorAt: null,
      consecutiveFailureCount: 0,
      ...(input.displayName ? { displayName: input.displayName } : {})
    }

    const connection = await prisma.integrationConnection.upsert({
      where: {
        workspaceId_provider_externalAccountId: {
          workspaceId: input.workspaceId,
          provider: 'N11',
          externalAccountId: input.storeName
        }
      },
      update: data,
      create: {
        ...data,
        workspaceId: input.workspaceId,
        createdByUserId: user.id,
        provider: 'N11',
        externalAccountId: input.storeName,
        displayName: input.displayName ?? input.storeName,
        syncEnabled: true
      }
    })

    await Promise.allSettled([
      createAuditLog({
        action: 'integration.connected',
        entityType: 'integration_connection',
        entityId: connection.id,
        actorId: user.id,
        actorName: user.email,
        metadata: { provider: 'N11' }
      }),
      prisma.workspaceActivity.create({
        data: {
          workspaceId: input.workspaceId,
          actorId: user.id,
          action: 'integration.connected',
          entityType: 'integration_connection',
          entityId: connection.id,
          metadata: JSON.stringify({ provider: 'N11' })
        }
      })
    ])

    return { connection: publicConnectionView(connection) }
  }

  fastify.post('/integrations/n11/connect', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, connectN11)

  // --- N11 durum ---
  fastify.get('/integrations/n11/status', async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = workspaceQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    if (!await access(prisma, user.id, parsed.data.workspaceId, reply)) return

    const connections = await prisma.integrationConnection.findMany({
      where: { workspaceId: parsed.data.workspaceId, provider: 'N11' },
      orderBy: { createdAt: 'desc' }
    })
    const primary = connections[0]
    const [orderCount, productCount] = await Promise.all([
      prisma.marketplaceOrder.count({ where: { workspaceId: parsed.data.workspaceId, provider: 'N11' } }),
      prisma.marketplaceProduct.count({ where: { workspaceId: parsed.data.workspaceId, provider: 'N11' } })
    ])

    return {
      connected: Boolean(primary && primary.status === 'ACTIVE'),
      syncing: primary ? isSyncInFlight(primary.id) : false,
      circuitBreakerTripped: Boolean(primary && primary.consecutiveFailureCount >= CIRCUIT_BREAKER_THRESHOLD),
      counts: { orders: orderCount, products: productCount },
      connections: connections.map(publicConnectionView)
    }
  })

  // --- N11 manuel sync ---
  fastify.post('/integrations/n11/sync', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = syncInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const member = await requireWriter(user.id, parsed.data.workspaceId, reply)
    if (!member) return

    const connection = await prisma.integrationConnection.findFirst({
      where: { workspaceId: parsed.data.workspaceId, provider: 'N11' },
      orderBy: { createdAt: 'desc' }
    })
    if (!connection) return reply.status(404).send({ error: 'Bağlı N11 hesabı bulunamadı.' })
    if (['DISABLED', 'PENDING'].includes(connection.status)) {
      return reply.status(400).send({ error: 'Bağlantı eşitlemeye uygun değil. Lütfen tekrar bağlanın.', code: 'CONNECTION_NOT_ACTIVE' })
    }
    if (isSyncInFlight(connection.id)) {
      return reply.status(409).send({ error: 'Eşitleme şu anda zaten çalışıyor.', code: 'SYNC_ALREADY_RUNNING' })
    }

    void runConnectionSync(prisma, connection.id, {
      syncType: 'MANUAL',
      requestedByUserId: user.id
    }).then(outcome => {
      void outcome
    }).catch(() => {})

    await createAuditLog({
      action: 'integration.sync_triggered',
      entityType: 'integration_connection',
      entityId: connection.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { provider: 'N11', note: 'manual' }
    }).catch(() => {})

    return { started: true, connectionId: connection.id }
  })

  // --- N11 disconnect: credential irreversibly yok olur;
  // gecmis siparis/urun kayitlari KORUNUR (diger providerlarla ayni politika).
  fastify.delete('/integrations/n11/disconnect', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = workspaceQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    const member = await requireWriter(user.id, parsed.data.workspaceId, reply)
    if (!member) return

    const connection = await prisma.integrationConnection.findFirst({
      where: { workspaceId: parsed.data.workspaceId, provider: 'N11' },
      orderBy: { createdAt: 'desc' }
    })
    if (!connection) return reply.status(404).send({ error: 'Bağlı N11 hesabı bulunamadı.' })

    await prisma.integrationConnection.delete({ where: { id: connection.id } })

    await Promise.allSettled([
      createAuditLog({
        action: 'integration.disconnected',
        entityType: 'integration_connection',
        entityId: connection.id,
        actorId: user.id,
        actorName: user.email,
        metadata: { provider: 'N11' }
      }),
      prisma.workspaceActivity.create({
        data: {
          workspaceId: parsed.data.workspaceId,
          actorId: user.id,
          action: 'integration.disconnected',
          entityType: 'integration_connection',
          entityId: connection.id,
          metadata: JSON.stringify({ provider: 'N11' })
        }
      })
    ])

    return { disconnected: true, retainedOrders: true }
  })

  // =====================================================================
  // SHOPIFY — authorization-code OAuth + GraphQL Admin API.
  // Client kimligi/sirri uygulama seviyesinde env'dedir. Magazaya ozel
  // offline access token yalniz encryptedAccessToken alaninda saklanir.
  // =====================================================================

  fastify.post('/integrations/shopify/connect', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = shopifyConnectInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    if (!await requireWriter(user.id, parsed.data.workspaceId, reply)) return
    const shopDomain = normalizeShopDomain(parsed.data.shopDomain)
    if (!shopDomain) {
      return reply.status(422).send({
        error: 'Shopify mağaza alan adı mağazanız.myshopify.com biçiminde olmalıdır.',
        code: 'INVALID_SHOP_DOMAIN'
      })
    }
    try {
      const state = createShopifyOAuthState({ workspaceId: parsed.data.workspaceId, userId: user.id, shopDomain })
      return { authorizationUrl: buildShopifyAuthorizationUrl(shopDomain, state) }
    } catch {
      return reply.status(503).send({ error: 'Shopify bağlantısı sunucuda henüz yapılandırılmamış.', code: 'SHOPIFY_NOT_CONFIGURED' })
    }
  })

  fastify.get('/integrations/shopify/oauth/callback', async (request, reply) => {
    const query = request.query as Record<string, unknown>
    const state = verifyShopifyOAuthState(String(query.state || ''))
    const shopDomain = normalizeShopDomain(String(query.shop || ''))
    if (!state || !shopDomain || state.shopDomain !== shopDomain || !verifyShopifyCallbackHmac(query)) {
      return reply.status(403).send({ error: 'Shopify bağlantı yanıtı doğrulanamadı.', code: 'INVALID_OAUTH_CALLBACK' })
    }
    if (!await requireWriter(state.userId, state.workspaceId, reply)) return
    const code = String(query.code || '')
    if (!code) return reply.status(400).send({ error: 'Shopify yetkilendirme kodu eksik.', code: 'OAUTH_CODE_MISSING' })

    let token: { access_token: string; scope?: string }
    try {
      token = await exchangeShopifyAuthorizationCode(shopDomain, code)
    } catch {
      return reply.status(502).send({ error: 'Shopify erişim izni alınamadı. Lütfen yeniden bağlanın.', code: 'TOKEN_EXCHANGE_FAILED' })
    }
    if (!hasRequiredShopifyScopes(token.scope)) {
      return reply.status(403).send({ error: 'Shopify gerekli okuma izinlerini vermedi. Lütfen izinleri onaylayarak yeniden bağlanın.', code: 'MISSING_REQUIRED_SCOPES' })
    }

    const adapter = getAdapter('SHOPIFY')
    if (!adapter) return reply.status(500).send({ error: 'Provider adapter is not available' })
    const validation: import('./types.js').CredentialValidationResult = await adapter.validateCredentials({
      externalAccountId: shopDomain,
      accessToken: token.access_token
    }).catch(() => ({ valid: false, message: 'Shopify bağlantısı doğrulanamadı.', errorCode: 'VALIDATION_FAILED' }))
    if (!validation.valid) {
      return reply.status(400).send({ error: validation.message, code: validation.errorCode })
    }

    const data = {
      encryptedAccessToken: encryptSecret(token.access_token),
      // Eski bir credential modelinden gecis olursa gereksiz sirlar temizlenir.
      encryptedApiKey: null,
      encryptedApiSecret: null,
      encryptedRefreshToken: null,
      displayName: validation.displayName || shopDomain,
      status: 'ACTIVE' as const,
      lastErrorCode: null,
      lastErrorAt: null,
      consecutiveFailureCount: 0
    }
    const connection = await prisma.integrationConnection.upsert({
      where: {
        workspaceId_provider_externalAccountId: {
          workspaceId: state.workspaceId,
          provider: 'SHOPIFY',
          externalAccountId: shopDomain
        }
      },
      update: data,
      create: {
        ...data,
        workspaceId: state.workspaceId,
        createdByUserId: state.userId,
        provider: 'SHOPIFY',
        externalAccountId: shopDomain,
        syncEnabled: true
      }
    })

    const actor = await prisma.user.findUnique({ where: { id: state.userId }, select: { email: true } }).catch(() => null)
    await Promise.allSettled([
      createAuditLog({
        action: 'integration.connected', entityType: 'integration_connection', entityId: connection.id,
        actorId: state.userId, actorName: actor?.email || 'Shopify OAuth', metadata: { provider: 'SHOPIFY' }
      }),
      prisma.workspaceActivity.create({
        data: {
          workspaceId: state.workspaceId, actorId: state.userId, action: 'integration.connected',
          entityType: 'integration_connection', entityId: connection.id,
          metadata: JSON.stringify({ provider: 'SHOPIFY' })
        }
      })
    ])

    const frontend = String(process.env.FRONTEND_URL || '').replace(/\/+$/, '')
    if (/^https?:\/\//.test(frontend)) {
      return reply.redirect(`${frontend}/app/settings?bolum=integrations&shopify=connected`)
    }
    return { connected: true, connection: publicConnectionView(connection) }
  })

  fastify.get('/integrations/shopify/status', async (request, reply) => {
    const user = request.user as { id: number }
    const parsed = workspaceQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    if (!await access(prisma, user.id, parsed.data.workspaceId, reply)) return
    const connections = await prisma.integrationConnection.findMany({
      where: { workspaceId: parsed.data.workspaceId, provider: 'SHOPIFY' },
      orderBy: { createdAt: 'desc' }
    })
    const primary = connections[0]
    const [orderCount, productCount, latestRuns] = await Promise.all([
      prisma.marketplaceOrder.count({ where: { workspaceId: parsed.data.workspaceId, provider: 'SHOPIFY' } }),
      prisma.marketplaceProduct.count({ where: { workspaceId: parsed.data.workspaceId, provider: 'SHOPIFY' } }),
      primary ? prisma.integrationSyncRun.findMany({ where: { connectionId: primary.id }, orderBy: { startedAt: 'desc' }, take: 5 }) : Promise.resolve([])
    ])
    return {
      connected: Boolean(primary && primary.status === 'ACTIVE'),
      syncing: primary ? isSyncInFlight(primary.id) : false,
      circuitBreakerTripped: Boolean(primary && primary.consecutiveFailureCount >= CIRCUIT_BREAKER_THRESHOLD),
      counts: { orders: orderCount, products: productCount },
      latestRuns: latestRuns.map(run => ({
        id: run.id, syncType: run.syncType, status: run.status, startedAt: run.startedAt,
        finishedAt: run.finishedAt, recordsFetched: run.recordsFetched, recordsCreated: run.recordsCreated,
        recordsUpdated: run.recordsUpdated, recordsSkipped: run.recordsSkipped, errorCode: run.errorCode
      })),
      connections: connections.map(publicConnectionView)
    }
  })

  fastify.post('/integrations/shopify/sync', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = syncInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    if (!await requireWriter(user.id, parsed.data.workspaceId, reply)) return
    const connection = await prisma.integrationConnection.findFirst({
      where: { workspaceId: parsed.data.workspaceId, provider: 'SHOPIFY' }, orderBy: { createdAt: 'desc' }
    })
    if (!connection) return reply.status(404).send({ error: 'Bağlı Shopify mağazası bulunamadı.' })
    if (['DISABLED', 'PENDING'].includes(connection.status)) {
      return reply.status(400).send({ error: 'Bağlantı eşitlemeye uygun değil. Lütfen tekrar bağlanın.', code: 'CONNECTION_NOT_ACTIVE' })
    }
    if (isSyncInFlight(connection.id)) return reply.status(409).send({ error: 'Eşitleme şu anda zaten çalışıyor.', code: 'SYNC_ALREADY_RUNNING' })
    void runConnectionSync(prisma, connection.id, { syncType: 'MANUAL', requestedByUserId: user.id }).catch(() => {})
    await createAuditLog({
      action: 'integration.sync_triggered', entityType: 'integration_connection', entityId: connection.id,
      actorId: user.id, actorName: user.email, metadata: { provider: 'SHOPIFY', note: 'manual' }
    }).catch(() => {})
    return { started: true, connectionId: connection.id }
  })

  fastify.delete('/integrations/shopify/disconnect', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = workspaceQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    if (!await requireWriter(user.id, parsed.data.workspaceId, reply)) return
    const connection = await prisma.integrationConnection.findFirst({
      where: { workspaceId: parsed.data.workspaceId, provider: 'SHOPIFY' }, orderBy: { createdAt: 'desc' }
    })
    if (!connection) return reply.status(404).send({ error: 'Bağlı Shopify mağazası bulunamadı.' })
    await prisma.integrationConnection.delete({ where: { id: connection.id } })
    await Promise.allSettled([
      createAuditLog({
        action: 'integration.disconnected', entityType: 'integration_connection', entityId: connection.id,
        actorId: user.id, actorName: user.email, metadata: { provider: 'SHOPIFY' }
      }),
      prisma.workspaceActivity.create({
        data: {
          workspaceId: parsed.data.workspaceId, actorId: user.id, action: 'integration.disconnected',
          entityType: 'integration_connection', entityId: connection.id,
          metadata: JSON.stringify({ provider: 'SHOPIFY' })
        }
      })
    ])
    return { disconnected: true, retainedOrders: true }
  })

  // --- Pazaryeri siparisleri (yalnizca LocalKarar DB) ---
  fastify.get('/marketplace/orders', async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = ordersQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid filters', details: parsed.error.errors })
    const { workspaceId, status, provider, from, to, q, limit, offset } = parsed.data
    if (!await access(prisma, user.id, workspaceId, reply)) return

    const where = {
      workspaceId,
      ...(status ? { status } : {}),
      ...(provider ? { provider } : {}),
      ...(from || to ? { orderDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      ...(q ? {
        OR: [
          { externalOrderNumber: { contains: q, mode: 'insensitive' as const } },
          { customerDisplayName: { contains: q, mode: 'insensitive' as const } },
          { items: { some: { title: { contains: q, mode: 'insensitive' as const } } } }
        ]
      } : {})
    }

    const [orders, total] = await prisma.$transaction([
      prisma.marketplaceOrder.findMany({
        where,
        orderBy: [{ orderDate: 'desc' }],
        take: limit,
        skip: offset,
        include: { _count: { select: { items: true } } }
      }),
      prisma.marketplaceOrder.count({ where })
    ])

    return { orders: orders.map(orderJson), total, limit, offset }
  })

  fastify.get('/marketplace/orders/:orderId', async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const { orderId } = request.params as { orderId: string }
    const parsed = workspaceQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    if (!await access(prisma, user.id, parsed.data.workspaceId, reply)) return

    const order = await prisma.marketplaceOrder.findFirst({
      where: { id: orderId, workspaceId: parsed.data.workspaceId },
      include: { items: { orderBy: { createdAt: 'asc' } } }
    })
    if (!order) return reply.status(404).send({ error: 'Sipariş bulunamadı.' })
    return { order: orderJson(order) }
  })

  /*
   * URUNLER (yalnizca LocalKarar DB).
   *
   * Performans alanlari (satis/siparis/ciro/iade) MarketplaceOrderItem
   * x MarketplaceOrder aggregate'inden gelir; provider analytics'i
   * UYDURULMAZ. Views/favorites gibi metrikler capability false olan
 *   provider'lar icin hicbir sekilde donmez.
   */
  fastify.get('/marketplace/products', async (request, reply) => {
    const user = request.user as { id: number }
    const parsed = productsQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid filters', details: parsed.error.errors })
    const { workspaceId, q, provider, onSale, stockFilter, sort, windowDays, lowStockThreshold } = parsed.data
    if (!await access(prisma, user.id, workspaceId, reply)) return

    const result = await listProductsWithMetrics(prisma, workspaceId, {
      q,
      provider,
      onSale: onSale === undefined ? undefined : onSale === 'true',
      stockFilter: stockFilter ?? 'all',
      sort: sort ?? 'title',
      windowDays,
      lowStockThreshold
    })

    return {
      products: result.products.map(product => ({
        ...product,
        performance: {
          ...product.performance,
          // Eksik finansal bilesenler icin arayuzde "veri yok" gosterimi.
          financialsAvailable: product.performance.commissionTotal !== null
            && product.performance.shippingTotal !== null
        }
      })),
      total: result.total,
      threshold: result.threshold,
      windowDays: result.windowDays
    }
  })

  fastify.get('/marketplace/products/overview', async (request, reply) => {
    const user = request.user as { id: number }
    const parsed = productsOverviewQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    if (!await access(prisma, user.id, parsed.data.workspaceId, reply)) return

    const overview = await getMarketplaceProductOverview(prisma, parsed.data.workspaceId, parsed.data.lowStockThreshold)
    return overview
  })

  fastify.get('/marketplace/products/:productId', async (request, reply) => {
    const user = request.user as { id: number }
    const { productId } = request.params as { productId: string }
    const parsed = productDetailQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    if (!await access(prisma, user.id, parsed.data.workspaceId, reply)) return

    const detail = await getProductDetailWithMetrics(
      prisma,
      parsed.data.workspaceId,
      productId,
      parsed.data.lowStockThreshold
    )
    if (!detail) return reply.status(404).send({ error: 'Ürün bulunamadı.' })
    // Provider capability bilgisi eklenir; frontend yalnizca desteklenen
    // metrikleri render eder.
    const adapter = getAdapter(detail.product.provider as any)
    return {
      product: detail.product,
      performance: detail.performance,
      capabilities: adapter?.capabilities ?? {
        supportsProductViews: false,
        supportsFavorites: false,
        supportsProductAnalytics: false
      }
    }
  })

  /*
   * LOCALKARAR URUN AYARLARI (provider'a WRITE YOK — read-only MVP).
   * internalNote / tags / lowStockThresholdOverride / isFavorite
   * isletmenin kendi verisidir; provider sync'i bu alanlari ezmez.
   */
  fastify.patch('/marketplace/products/:productId/settings', async (request, reply) => {
    const user = request.user as { id: number }
    const { productId } = request.params as { productId: string }
    const parsed = productSettingsInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const { workspaceId, ...fields } = parsed.data
    const member = await requireWriter(user.id, workspaceId, reply)
    if (!member) return

    const product = await prisma.marketplaceProduct.findFirst({
      where: { id: productId, workspaceId },
      select: { id: true }
    })
    if (!product) return reply.status(404).send({ error: 'Ürün bulunamadı.' })

    const data: Record<string, unknown> = {}
    if (fields.internalNote !== undefined) data.internalNote = fields.internalNote === '' ? null : fields.internalNote
    if (fields.tags !== undefined) data.tags = fields.tags && fields.tags.length > 0 ? fields.tags : null
    if (fields.lowStockThresholdOverride !== undefined) data.lowStockThresholdOverride = fields.lowStockThresholdOverride
    if (fields.isFavorite !== undefined) data.isFavorite = fields.isFavorite

    const updated = await prisma.marketplaceProduct.update({
      where: { id: product.id },
      data,
      select: {
        id: true, internalNote: true, tags: true,
        lowStockThresholdOverride: true, isFavorite: true
      }
    })
    return { product: updated }
  })

  // --- Dashboard/AI Mentor/Hesaplamalar icin ozet (yalniz DB) ---
  /*
   * BAGLANTI AYARI — odeme vadesi.
   *
   * 🔴 NEDEN KULLANICIYA SORULUYOR: pazaryerinin odemeyi ne zaman
   * yapacagi hicbir saglayicinin API'sinde yok. Gomulu bir varsayilan
   * ("Trendyol 14 gunde oder") yanlis oldugunda SESSIZCE hatali nakit
   * tahmini uretirdi. Bos birakilirsa vade yazilmaz: kayit yine
   * olusur, yalnizca takvime ve 30 gunluk toplama girmez.
   */
  fastify.patch('/integrations/:connectionId/settings', async (request, reply) => {
    const user = request.user as { id: number }
    const { connectionId } = request.params as { connectionId: string }

    const govde = z.object({
      /* 0 = ayni gun oder. `null` = bilinmiyor, vade yazma. 365 ust
         siniri anlamsiz degerlerin takvimi kirletmesini onluyor. */
      payoutDelayDays: z.number().int().min(0).max(365).nullable()
    }).safeParse(request.body)
    if (!govde.success) {
      return reply.status(422).send({ error: 'Ödeme vadesi 0-365 gün arasında bir sayı ya da boş olmalı' })
    }

    const connection = await prisma.integrationConnection.findUnique({
      where: { id: connectionId },
      select: { workspaceId: true }
    })
    /* 🔴 BOLA: baglanti once bulunuyor, sonra ONUN workspace'i uzerinden
       yetki araniyor. Yalniz `connectionId` ile guncellemek, baska
       calisma alaninin baglantisini degistirmeye izin verirdi. */
    if (!connection) return reply.status(404).send({ error: 'Connection not found' })
    if (!await requireWriter(user.id, connection.workspaceId, reply)) return

    const guncel = await prisma.integrationConnection.update({
      where: { id: connectionId },
      data: { payoutDelayDays: govde.data.payoutDelayDays }
    })
    return publicConnectionView(guncel)
  })

  fastify.get('/marketplace/summary', async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = summaryQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    if (!await access(prisma, user.id, parsed.data.workspaceId, reply)) return
    return getMarketplaceSummary(prisma, parsed.data.workspaceId, parsed.data.days)
  })

  /*
   * ORTAK OPERATIONS OZETI.
   *
   * Genel Bakis + Ana Sayfa + AI Mentor TEK bu endpointten beslenir;
   * her widget ayri hesaplama yapmaz. Yalnizca LocalKarar DB'si
   * okunur — sayfa acilinda pazaryerine istek GIDMEZ.
   */
  fastify.get('/marketplace/operations', async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = workspaceQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    if (!await access(prisma, user.id, parsed.data.workspaceId, reply)) return
    return getMarketplaceOperations(prisma, parsed.data.workspaceId)
  })

  fastify.get('/marketplace/calculation-hints', async (request, reply) => {
    const user = request.user as { id: number; email: string }
    const parsed = workspaceQuery.safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid query', details: parsed.error.errors })
    if (!await access(prisma, user.id, parsed.data.workspaceId, reply)) return
    const hints = await getCalculationHints(prisma, parsed.data.workspaceId)
    return hints
      ? { available: true, ...hints }
      : { available: false }
  })
}


