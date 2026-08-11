import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../../lib/prisma.js'
import { runNewsIngestion } from './ingestion.js'

export const NEWS_CRON_TIME_ZONE = 'Europe/Istanbul'

let running = false

export function millisecondsUntilNextHour(now = new Date()): number {
  return 60 * 60 * 1000 - (now.getMinutes() * 60_000 + now.getSeconds() * 1_000 + now.getMilliseconds())
}

export function startNewsWorker(
  prisma: PrismaClient = sharedPrisma,
  options: { onError?: (error: unknown) => void; runImmediately?: boolean } = {},
): () => void {
  let stopped = false
  let timer: NodeJS.Timeout | undefined
  console.log(JSON.stringify({
    event: 'NEWS_WORKER_STARTED',
    timezone: NEWS_CRON_TIME_ZONE,
    cadence: 'hourly',
    runImmediately: options.runImmediately === true,
  }))
  const run = async () => {
    if (running || stopped) return
    running = true
    const sourceErrors: string[] = []
    try {
      console.log(JSON.stringify({ event: 'NEWS_INGESTION_STARTED', timezone: NEWS_CRON_TIME_ZONE }))
      const stats = await runNewsIngestion({
        prisma,
        onSourceError: (source, error) => {
          sourceErrors.push(source.name)
          options.onError?.(error)
        },
      })
      console.log(JSON.stringify({ ...stats, sourceErrorSources: sourceErrors, event: 'NEWS_INGESTION_FINISHED' }))
    } catch (error) {
      options.onError?.(error)
      console.log(JSON.stringify({ event: 'NEWS_INGESTION_FAILED', sourceErrorSources: sourceErrors }))
    } finally {
      running = false
    }
  }
  const schedule = () => {
    if (stopped) return
    timer = setTimeout(async () => {
      await run()
      schedule()
    }, millisecondsUntilNextHour())
    timer.unref()
  }
  if (options.runImmediately) void run()
  schedule()
  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}
