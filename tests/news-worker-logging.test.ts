import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { startNewsWorker } from '../src/services/news/worker'

vi.mock('../src/services/news/ingestion.js', () => ({
  runNewsIngestion: vi.fn(async (options: { onSourceError?: (source: { name: string }, error: unknown) => void }) => {
    options.onSourceError?.({ name: 'Resmî Gazete' }, new Error('fetch failed'))
    options.onSourceError?.({ name: 'Kişisel Verileri Koruma Kurumu' }, new Error('timeout'))
    return { sources: 9, fetched: 3, published: 1, archived: 0, failed: 1, duplicates: 0, sourceErrors: 2 }
  }),
}))

describe('news worker logging', () => {
  const originalLog = console.log
  let logs: string[]

  const collectLogs = () => {
    logs = []
    console.log = (line: unknown) => { logs.push(String(line)) }
  }

  afterEach(() => {
    console.log = originalLog
  })

  it('worker başlangıcında NEWS_WORKER_STARTED loglar', () => {
    collectLogs()
    const stop = startNewsWorker({} as PrismaClient)
    stop()
    const events = logs.map(line => JSON.parse(line).event)
    expect(events).toContain('NEWS_WORKER_STARTED')
    expect(JSON.parse(logs[0])).toMatchObject({
      event: 'NEWS_WORKER_STARTED',
      timezone: 'Europe/Istanbul',
      cadence: 'hourly',
      runImmediately: false,
    })
  })

  it('ingestion sonuçlarını, istatistikleri ve hatalı kaynak adlarını loglar', async () => {
    collectLogs()
    const onError = vi.fn()
    const stop = startNewsWorker({} as PrismaClient, { runImmediately: true, onError })
    await new Promise(resolve => setTimeout(resolve, 30))
    stop()

    const events = logs.map(line => JSON.parse(line).event)
    expect(events).toContain('NEWS_INGESTION_STARTED')
    expect(events).toContain('NEWS_INGESTION_FINISHED')

    const finished = JSON.parse(logs.find(line => line.includes('NEWS_INGESTION_FINISHED'))!)
    expect(finished).toMatchObject({
      event: 'NEWS_INGESTION_FINISHED',
      sources: 9,
      fetched: 3,
      published: 1,
      archived: 0,
      failed: 1,
      duplicates: 0,
      sourceErrors: 2,
      sourceErrorSources: ['Resmî Gazete', 'Kişisel Verileri Koruma Kurumu'],
    })
    expect(onError).toHaveBeenCalledTimes(2)
  })
})