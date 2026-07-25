import type { PrismaClient } from '@prisma/client'
import {
  OllamaEmbeddingProvider,
  type EmbeddingProvider,
} from './embedding-provider'

type IndexPrisma = Pick<PrismaClient, 'knowledgeObject'>

export function formatKnowledgeEmbeddingInput(row: {
  code: string | null
  title: string
  content: string
  summary: string | null
}): string {
  return [
    row.code ? `Kod: ${row.code}` : '',
    `Başlık: ${row.title}`,
    row.summary ? `Özet: ${row.summary}` : '',
    row.content.slice(0, 1000),
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 1600)
}
export async function indexKnowledgeObjectEmbedding(
  prisma: IndexPrisma,
  koId: number,
  provider: EmbeddingProvider = new OllamaEmbeddingProvider(),
): Promise<{ indexed: boolean; dimensions: number }> {
  const row = await prisma.knowledgeObject.findFirst({
    where: { id: koId, status: 'published', isDemo: false },
    select: { id: true, code: true, title: true, content: true, summary: true },
  })
  if (!row) return { indexed: false, dimensions: 0 }

  const vector = await provider.embed(formatKnowledgeEmbeddingInput(row))
  if (vector.length === 0) throw new Error('EMBEDDING_EMPTY_VECTOR')
  await prisma.knowledgeObject.update({
    where: { id: row.id },
    data: { embedding: JSON.stringify(vector) },
  })
  return { indexed: true, dimensions: vector.length }
}

type QueueLogger = {
  info?: (data: object, message?: string) => void
  warn?: (data: object, message?: string) => void
}

type QueueJob = {
  prisma: IndexPrisma
  koId: number
  logger?: QueueLogger
  provider?: EmbeddingProvider
}

const queue: QueueJob[] = []
const queuedIds = new Set<number>()
let running = false

function autoIndexEnabled(): boolean {
  return process.env.RAG_AUTO_EMBEDDING_ENABLED === 'true'
}

function maxPending(): number {
  const parsed = Number(process.env.RAG_AUTO_EMBEDDING_MAX_PENDING)
  if (!Number.isFinite(parsed)) return 20
  return Math.max(1, Math.min(Math.floor(parsed), 100))
}

async function drainQueue(): Promise<void> {
  if (running) return
  running = true
  try {
    while (queue.length > 0) {
      const job = queue.shift()!
      try {
        const result = await indexKnowledgeObjectEmbedding(
          job.prisma,
          job.koId,
          job.provider,
        )
        job.logger?.info?.(
          {
            koId: job.koId,
            indexed: result.indexed,
            dimensions: result.dimensions,
          },
          'knowledge embedding indexed',
        )
      } catch {
        job.logger?.warn?.(
          {
            koId: job.koId,
            errorCode: 'KNOWLEDGE_EMBEDDING_INDEX_FAILED',
          },
          'knowledge embedding indexing failed',
        )
      } finally {
        queuedIds.delete(job.koId)
      }
    }
  } finally {
    running = false
  }
}

export function scheduleKnowledgeObjectEmbedding(
  job: QueueJob,
): 'queued' | 'disabled' | 'duplicate' | 'queue_full' {
  if (!autoIndexEnabled()) return 'disabled'
  if (queuedIds.has(job.koId)) return 'duplicate'
  if (queue.length >= maxPending()) return 'queue_full'
  queuedIds.add(job.koId)
  queue.push(job)
  void drainQueue()
  return 'queued'
}
