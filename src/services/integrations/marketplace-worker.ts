import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../../lib/prisma.js'
import { runConnectionSync, isConnectionDueForSync } from './sync-service.js'

/*
 * PAZARYERI SYNC WORKER.
 *
 * URETIM GUVENLIGI: MARKETPLACE_SYNC_ENABLED !== 'true' iken bu
 * worker KENDILIGINDEN BASLAMAZ. Varsayilan kapalidir; manuel sync
 * her zaman kullanilabilir.
 *
 * Sayfa acilisi hicbir provider cagrisi tetiklemez; dis API
 * yalnizca buradan ve manuel sync'ten cagrilir.
 */

export const DEFAULT_SYNC_INTERVAL_MINUTES = 120

export function resolveWorkerIntervalMs(): number {
  const raw = Number.parseInt(process.env.MARKETPLACE_SYNC_INTERVAL_MINUTES || '', 10)
  const minutes = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SYNC_INTERVAL_MINUTES
  return Math.max(5, minutes) * 60_000
}

export function marketplaceSyncEnabled(): boolean {
  return process.env.MARKETPLACE_SYNC_ENABLED === 'true'
}

export async function runDueSyncs(
  prisma: PrismaClient = sharedPrisma,
  now = new Date()
): Promise<{ processed: number; success: number; partial: number; failed: number }> {
  const connections = await prisma.integrationConnection.findMany({
    where: { syncEnabled: true },
    select: {
      id: true,
      syncEnabled: true,
      status: true,
      lastSyncedAt: true,
      consecutiveFailureCount: true,
      syncIntervalMinutes: true
    }
  })

  let processed = 0
  let success = 0
  let partial = 0
  let failed = 0

  for (const connection of connections) {
    if (!isConnectionDueForSync(connection, now)) continue
    processed += 1
    const outcome = await runConnectionSync(prisma, connection.id, { syncType: 'SCHEDULED', now })
    if (outcome.status === 'SUCCESS') success += 1
    else if (outcome.status === 'PARTIAL') partial += 1
    else if (outcome.status === 'FAILED') failed += 1
  }

  return { processed, success, partial, failed }
}

export function startMarketplaceWorker(
  prisma: PrismaClient = sharedPrisma,
  options: { onError?: (error: unknown) => void } = {}
): () => void {
  if (!marketplaceSyncEnabled()) {
    console.log(JSON.stringify({
      event: 'MARKETPLACE_SYNC_WORKER_DISABLED',
      hint: "Set MARKETPLACE_SYNC_ENABLED=true to enable scheduled pulls."
    }))
    return () => {}
  }

  const intervalMs = resolveWorkerIntervalMs()
  let stopped = false
  console.log(JSON.stringify({
    event: 'MARKETPLACE_SYNC_WORKER_STARTED',
    intervalMinutes: Math.round(intervalMs / 60_000)
  }))

  const run = () => {
    if (stopped) return
    void runDueSyncs(prisma).catch(error => options.onError?.(error))
  }
  // Ilk tur hemen degil, bir periyot sonra: surec acilisini yukletme.
  const timer = setInterval(run, intervalMs)
  timer.unref()

  return () => {
    stopped = true
    clearInterval(timer)
  }
}
