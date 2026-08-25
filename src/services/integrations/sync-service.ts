import type { PrismaClient } from '@prisma/client'
import { getAdapter } from './adapter-registry.js'
import { decryptConnectionCredentials, safeErrorMessage } from './credentials.js'
import { upsertOrderWithItems, upsertNormalizedProduct, newOrderTransitionSink, type OrderTransitionSink } from './repository.js'
import type { ProviderCode, ProviderCredentials } from './types.js'
import { resolveLowStockThreshold } from './product-analytics.js'
import { siparisOnerileriniUret } from './order-suggestions.js'
import { pazaryeriBildirimleriniUret } from './marketplace-notifications.js'

/*
 * CORE SYNC SERVICE.
 *
 * Bu katman provider'a OZGU hicbir bilgi tasimaz: adapter registry'den
 * alinan MarketplaceProviderAdapter uzerinden calisir.
 *
 * Kurallar:
 * - Ayni connection icin paralel iki sync calismaz: hem surec ici
 *   lock (Map) hem RUNNING IntegrationSyncRun satiri (DB kilidi)
 *   kullanilir. 30 dakikadan eski RUNNING satirlari olu kabul edilir.
 * - Sayfa sayfa ceker; tek sayfanin hatasi tum sync'i dusurmez
 *   (PARTIAL ile bitirir).
 * - Art arda basarisizliklar circuit breaker sayacini artirir; esik
 *   asilinca zamanlanmis sync atlanir (manuel sync denemeye devam eder).
 */

const STALE_RUN_MS = 30 * 60 * 1000
export const CIRCUIT_BREAKER_THRESHOLD = 5
const INITIAL_SYNC_DAYS = 30        // MVP: ilk sync son 30 gun
// Order V2 erisim penceresi yaklasik son 1 ay ile sinirli (resmi
// dokuman, agustos 2026). Geriye donuk arama bu yuzden 30 gunde
// tutulur; daha eski veri settlements API'siyle tamamlandirilmalidir.
const MAX_LOOKBACK_DAYS = 30
const INCREMENTAL_OVERLAP_MS = 6 * 60 * 60 * 1000 // saat kaymasina karsi bindirme

/** Surec ici lock — tek node icin. DB RUNNING satiri ikinci katman. */
const inFlightConnections = new Set<string>()

export function isSyncInFlight(connectionId: string): boolean {
  return inFlightConnections.has(connectionId)
}

export interface SyncOptions {
  syncType: 'MANUAL' | 'SCHEDULED' | 'INITIAL'
  requestedByUserId?: number
  /** Testler icin fetch fonksiyonu enjekte etmek yerine adapter registry kullanilir. */
  now?: Date
}

export interface SyncOutcome {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED'
  runId?: string
  reason?: string
}

function resolveIntervalMinutes(connection: { syncIntervalMinutes: number | null }): number {
  const raw = Number.parseInt(process.env.MARKETPLACE_SYNC_INTERVAL_MINUTES || '', 10)
  const fallback = Number.isFinite(raw) && raw > 0 ? raw : 120
  if (connection.syncIntervalMinutes && connection.syncIntervalMinutes > 0) {
    return Math.max(5, connection.syncIntervalMinutes)
  }
  return fallback
}

/*
 * ACTIVITY FEED (provider-bagimsiz aggregate event'ler).
 *
 * GURULTU KURALLARI:
 * - Siparis basina event YOK: 20 yeni siparis tek satirda
 *   "MARKETPLACE_ORDERS_IMPORTED" + metadata.count olarak yasar.
 * - SYNC_COMPLETED her akista yazilmaz: baska bir marketplace eventi
 *   yazildiysa veya son 24 saatte kalp atisi yoksa yazilir.
 * - LOW_STOCK_DETECTED yalnizca sayi degistiyse yenilenir.
 * - Hicbiri sync sonucunu etkilemez: feed yazimi hatasi sync'i dusurmez.
 */
const SYNC_COMPLETED_HEARTBEAT_MS = 24 * 60 * 60 * 1000

async function lastActivityOf(
  prisma: PrismaClient,
  workspaceId: string,
  action: string
) {
  return prisma.workspaceActivity.findFirst({
    where: { workspaceId, action },
    orderBy: { createdAt: 'desc' }
  })
}

async function writeMarketplaceEvents(
  prisma: PrismaClient,
  input: {
    workspaceId: string
    connectionId: string
    provider: string
    finalStatus: 'SUCCESS' | 'PARTIAL'
    ordersCreated: number
    ordersUpdated: number
    productsTouched: number
    transitions: OrderTransitionSink
  }
): Promise<void> {
  try {
    const meta = (extra: Record<string, unknown> = {}) =>
      JSON.stringify({ provider: input.provider, ...extra })
    const write = (action: string, metadata: string) =>
      prisma.workspaceActivity.create({
        data: {
          workspaceId: input.workspaceId,
          actorId: null,
          action,
          entityType: 'marketplace',
          entityId: input.connectionId,
          metadata
        }
      })

    const pendingWrites: Array<Promise<unknown>> = []

    if (input.ordersCreated > 0) {
      pendingWrites.push(write('MARKETPLACE_ORDERS_IMPORTED', meta({ count: input.ordersCreated })))
    }
    if (input.productsTouched > 0) {
      pendingWrites.push(write('MARKETPLACE_PRODUCTS_UPDATED', meta({ count: input.productsTouched })))
    }
    if (input.transitions.deliveredDetected > 0) {
      pendingWrites.push(write('MARKETPLACE_ORDER_DELIVERED', meta({ count: input.transitions.deliveredDetected })))
    }
    if (input.transitions.returnDetected > 0) {
      pendingWrites.push(write('MARKETPLACE_RETURN_DETECTED', meta({ count: input.transitions.returnDetected })))
    }

    // Dusuk stok: sayi degistiyse guncelle (her sync'te ayni haber yok).
    if (input.finalStatus === 'SUCCESS') {
      const threshold = resolveLowStockThreshold()
      const lowStockCount = await prisma.marketplaceProduct.count({
        where: {
          workspaceId: input.workspaceId,
          isActive: true,
          stockQuantity: { gt: 0, lte: threshold }
        }
      }).catch(() => 0)
      if (lowStockCount > 0) {
        const lastLowStock = await lastActivityOf(prisma, input.workspaceId, 'MARKETPLACE_LOW_STOCK_DETECTED').catch(() => null)
        let previousCount: unknown = null
        try { previousCount = lastLowStock ? JSON.parse(lastLowStock.metadata || '{}')?.count : null } catch { previousCount = null }
        if (previousCount !== lowStockCount) {
          pendingWrites.push(write('MARKETPLACE_LOW_STOCK_DETECTED', meta({ count: lowStockCount })))
        }
      }
    }

    // Kalp atisi: baska event yazildiysa gerek yok; yoksa gunde bir.
    const heartbeat = await lastActivityOf(prisma, input.workspaceId, 'MARKETPLACE_SYNC_COMPLETED').catch(() => null)
    const heartbeatFresh = heartbeat && Date.now() - heartbeat.createdAt.getTime() < SYNC_COMPLETED_HEARTBEAT_MS
    if (pendingWrites.length === 0 && !heartbeatFresh) {
      pendingWrites.push(write('MARKETPLACE_SYNC_COMPLETED', meta({ status: input.finalStatus })))
    }

    await Promise.allSettled(pendingWrites)
  } catch {
    /* Activity feed opsiyoneldir; sync sonucunu asla etkilemez. */
  }
}

export function isConnectionDueForSync(
  connection: { syncEnabled: boolean; status: string; lastSyncedAt: Date | null; lastSuccessfulSyncAt?: Date | null; consecutiveFailureCount: number; syncIntervalMinutes: number | null },
  now = new Date()
): boolean {
  if (!connection.syncEnabled) return false
  if (!['ACTIVE', 'ERROR'].includes(connection.status)) return false
  // Circuit breaker: esigi asan baglantiyi zamanlanmus akis bir sure
  // dinlendirir; manuel tetikleme bu kontrolu gecer.
  if (connection.consecutiveFailureCount >= CIRCUIT_BREAKER_THRESHOLD) return false
  const intervalMs = resolveIntervalMinutes(connection) * 60_000
  if (!connection.lastSyncedAt) return true
  return now.getTime() - connection.lastSyncedAt.getTime() >= intervalMs
}

async function releaseStaleRuns(prisma: PrismaClient, connectionId: string, now: Date): Promise<void> {
  const staleBefore = new Date(now.getTime() - STALE_RUN_MS)
  await prisma.integrationSyncRun.updateMany({
    where: { connectionId, status: 'RUNNING', startedAt: { lt: staleBefore } },
    data: {
      status: 'FAILED',
      finishedAt: now,
      errorCode: 'STALE_RUN_CLEANED',
      errorMessageSafe: 'A previous sync was left running and has been marked failed.'
    }
  })
}

export async function runConnectionSync(
  prisma: PrismaClient,
  connectionId: string,
  options: SyncOptions
): Promise<SyncOutcome> {
  const now = options.now ?? new Date()

  // --- Kilit 1: surec ici ---
  // Kontrol + ekleme ayni senkron blogda: JS tek thread oldugu icin
  // iki cagri arasinda araya girilemez.
  if (inFlightConnections.has(connectionId)) {
    return { status: 'SKIPPED', reason: 'SYNC_ALREADY_RUNNING' }
  }
  inFlightConnections.add(connectionId)

  try {
    return await runConnectionSyncLocked(prisma, connectionId, options, now)
  } finally {
    inFlightConnections.delete(connectionId)
  }
}

async function runConnectionSyncLocked(
  prisma: PrismaClient,
  connectionId: string,
  options: SyncOptions,
  now: Date
): Promise<SyncOutcome> {
  const connection = await prisma.integrationConnection.findUnique({ where: { id: connectionId } })
  if (!connection) return { status: 'SKIPPED', reason: 'CONNECTION_NOT_FOUND' }
  if (['DISABLED', 'PENDING'].includes(connection.status)) {
    return { status: 'SKIPPED', reason: `CONNECTION_${connection.status}` }
  }

  // --- Kilidin kalici olmamasi: bayat RUNNING temizligi ---
  await releaseStaleRuns(prisma, connectionId, now)

  // --- Kilidin kalici olmamasi: bayat RUNNING temizligi sonrasi aktif RUNNING var mi? ---
  const activeRun = await prisma.integrationSyncRun.findFirst({
    where: { connectionId, status: 'RUNNING' }
  })
  if (activeRun) {
    return { status: 'SKIPPED', reason: 'SYNC_ALREADY_RUNNING' }
  }

  const adapter = getAdapter(connection.provider as ProviderCode)
  if (!adapter) return { status: 'SKIPPED', reason: 'ADAPTER_NOT_REGISTERED' }

  let credentials: ProviderCredentials | null = null
  try {
    credentials = decryptConnectionCredentials(connection)

    const run = await prisma.integrationSyncRun.create({
      data: {
        connectionId,
        provider: connection.provider as any,
        syncType: options.syncType as any,
        status: 'RUNNING'
      }
    })

    // --- Tarih araligi ---
    const toDate = now
    const fromDate = resolveFromDate(connection, options.syncType, now)

    const counters = { fetched: 0, created: 0, updated: 0, skipped: 0 }
    let productsTouched = 0
    const transitions = newOrderTransitionSink()
    const failures: Array<{ errorCode: string; message: string }> = []
    /* Bu esitlemede yazilan/guncellenen siparislerin tarihleri. Dongu
       bitince gun bazinda tekillestirilip oneri uretilecek. */
    const dokunulanTarihler: Date[] = []

    // --- SIPARISLER ---
    let ordersPage = 0
    for (;;) {
      let pageResult
      try {
        pageResult = await adapter.fetchOrders({ credentials, fromDate, toDate, page: ordersPage })
      } catch (error) {
        failures.push(safeFailure(error, credentials))
        break
      }

      for (const raw of pageResult.orders) {
        counters.fetched += 1
        let normalized
        try {
          normalized = adapter.normalizeOrder(raw)
        } catch {
          counters.skipped += 1
          continue
        }
        if (!normalized.externalId) { counters.skipped += 1; continue }
        try {
          const outcome = await upsertOrderWithItems(prisma, connection.workspaceId, connection.provider, normalized, transitions)
          counters[outcome] += 1
          /* Bu turda dokunulan gunler toplaniyor; oneriler dongu
             bitince TEK SEFERDE uretilecek. Siparis basina uretmek
             hem gereksiz sorgu hem de gunluk ozet mantigina aykiri. */
          if (normalized.orderDate) dokunulanTarihler.push(normalized.orderDate)
        } catch (error) {
          failures.push({
            errorCode: 'ORDER_UPSERT_FAILED',
            message: safeErrorMessage((error as Error)?.message || 'order upsert failed', credentials)
          })
          counters.skipped += 1
        }
      }

      if (!pageResult.hasNextPage || pageResult.orders.length === 0) break
      ordersPage += 1
      if (ordersPage > 500) break // guvenli ust sinir
    }

    /*
     * SIPARIS -> ONAY BEKLEYEN KAYIT ONERISI.
     *
     * Siparisler daha once yalniz `MarketplaceOrder`a dusuyordu ve
     * Isletme Takibi'ne HIC girmiyordu. Burada gun bazinda ozet oneri
     * uretiliyor; kullanici onaylayinca kayit, takvim ve tahsilat
     * toplami dolar.
     *
     * ⚠️ Hata FIRLATILMIYOR: basariyla cekilmis siparis verisi, oneri
     * uretimi tokezledi diye kaybedilmemeli.
     */
    if (dokunulanTarihler.length > 0) {
      try {
        await siparisOnerileriniUret(
          prisma, connection.workspaceId, connection.provider, dokunulanTarihler,
          'TRY', connection.payoutDelayDays ?? null
        )
      } catch (error) {
        failures.push({
          errorCode: 'ORDER_SUGGESTION_FAILED',
          message: safeErrorMessage((error as Error)?.message || 'order suggestion failed', credentials)
        })
      }
    }

    // --- URUNLER ---
    let productsPage = 0
    for (;;) {
      let productResult
      try {
        productResult = await adapter.fetchProducts({ credentials, page: productsPage })
      } catch (error) {
        failures.push(safeFailure(error, credentials))
        break
      }

      for (const raw of productResult.products) {
        let normalized
        try {
          normalized = adapter.normalizeProduct(raw)
        } catch {
          counters.skipped += 1
          continue
        }
        if (!normalized.externalId) { counters.skipped += 1; continue }
        try {
          await upsertNormalizedProduct(prisma, connection.workspaceId, connection.provider, normalized)
          productsTouched += 1
        } catch (error) {
          failures.push({
            errorCode: 'PRODUCT_UPSERT_FAILED',
            message: safeErrorMessage((error as Error)?.message || 'product upsert failed', credentials)
          })
          counters.skipped += 1
        }
      }

      if (!productResult.hasNextPage || productResult.products.length === 0) break
      productsPage += 1
      if (productsPage > 200) break
    }

    const finalStatus: 'SUCCESS' | 'PARTIAL' = failures.length > 0 ? 'PARTIAL' : 'SUCCESS'

    await prisma.$transaction([
      prisma.integrationSyncRun.update({
        where: { id: run.id },
        data: {
          status: finalStatus,
          finishedAt: new Date(),
          recordsFetched: counters.fetched,
          recordsCreated: counters.created,
          recordsUpdated: counters.updated,
          recordsSkipped: counters.skipped,
          errorCode: failures[0]?.errorCode ?? null,
          errorMessageSafe: failures[0]?.message ?? null
        }
      }),
      prisma.integrationConnection.update({
        where: { id: connectionId },
        data: {
          lastSyncedAt: now,
          ...(finalStatus === 'SUCCESS'
            ? {
                lastSuccessfulSyncAt: now,
                status: 'ACTIVE' as const,
                lastErrorCode: null,
                lastErrorAt: null,
                consecutiveFailureCount: 0
              }
            : {
                consecutiveFailureCount: { increment: 1 },
                lastErrorCode: failures[0]?.errorCode ?? 'SYNC_PARTIAL',
                lastErrorAt: now,
                status: 'ERROR' as const
              })
        }
      })
    ])

    // Activity feed aggregate event'leri (hata sync'i bozmaz).
    void writeMarketplaceEvents(prisma, {
      workspaceId: connection.workspaceId,
      connectionId,
      provider: String(connection.provider),
      finalStatus,
      ordersCreated: counters.created,
      ordersUpdated: counters.updated,
      productsTouched,
      transitions
    }).catch(() => {})

    /*
     * ZİL BİLDİRİMLERİ (düşük stok, geciken kargo).
     *
     * 🔴 Pazaryeri katmanı daha önce HİÇ bildirim üretmiyordu: stok
     * eşiği tanımlıydı, veri çekiliyordu, ama kullanıcı ekranı açmadıkça
     * stoğunun bittiğini öğrenemiyordu.
     *
     * `void` + `catch`: activity feed ile aynı ilke — bildirim üretimi
     * eşitlemenin yan ürünü, başarıyla çekilmiş veriyi düşürmemeli.
     */
    if (finalStatus === 'SUCCESS') {
      void pazaryeriBildirimleriniUret(prisma, connection.workspaceId).catch(() => {})
    }

    return { status: finalStatus, runId: run.id }
  } catch (error) {
    // Credential cozumlemesi ya da beklenmeyen hata: FAILED.
    const message = credentials
      ? safeErrorMessage((error as Error)?.message || 'sync failed', credentials)
      : 'sync failed'
    await prisma.integrationConnection.update({
      where: { id: connectionId },
      data: {
        status: 'ERROR',
        lastErrorCode: 'SYNC_FAILED',
        lastErrorAt: new Date(),
        consecutiveFailureCount: { increment: 1 }
      }
    }).catch(() => {})
    const latestRun = await prisma.integrationSyncRun.findFirst({
      where: { connectionId, status: 'RUNNING' },
      orderBy: { startedAt: 'desc' }
    })
    if (latestRun) {
      await prisma.integrationSyncRun.update({
        where: { id: latestRun.id },
        data: { status: 'FAILED', finishedAt: new Date(), errorMessageSafe: message.slice(0, 500) }
      }).catch(() => {})
    }
    return { status: 'FAILED', reason: message.slice(0, 300) }
  }
}

function resolveFromDate(
  connection: { lastSuccessfulSyncAt: Date | null; createdAt: Date },
  syncType: string,
  now: Date
): Date {
  if (syncType === 'INITIAL') {
    return new Date(now.getTime() - INITIAL_SYNC_DAYS * 24 * 60 * 60 * 1000)
  }
  const base = connection.lastSuccessfulSyncAt ?? new Date(now.getTime() - INITIAL_SYNC_DAYS * 24 * 60 * 60 * 1000)
  const withOverlap = new Date(base.getTime() - INCREMENTAL_OVERLAP_MS)
  const floorDate = new Date(now.getTime() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  return withOverlap < floorDate ? floorDate : withOverlap
}

function safeFailure(error: unknown, credentials: ProviderCredentials): { errorCode: string; message: string } {
  const err = error as Error & { errorCode?: string; safeMessage?: string }
  return {
    errorCode: err?.errorCode || 'PROVIDER_FETCH_FAILED',
    message: safeErrorMessage(err?.safeMessage || err?.message || 'provider fetch failed', credentials).slice(0, 500)
  }
}
