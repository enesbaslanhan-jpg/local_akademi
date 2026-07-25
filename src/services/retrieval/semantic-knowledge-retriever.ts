import { PrismaClient } from '@prisma/client'
import type { EmbeddingProvider } from './embedding-provider'
import { expandDomainQuery } from './domain-query-expander'
import type {
  KnowledgeObjectResult,
  Retriever,
  RetrieverQuery,
  SourceRef,
} from './types'

const DEFAULT_TOP_K = 3
const MAX_TOP_K = 5
const DEFAULT_CANDIDATE_LIMIT = 500

function boundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(Math.floor(parsed), max))
}

function minimumSimilarity(): number {
  const parsed = Number(process.env.RAG_SEMANTIC_MIN_SIMILARITY)
  if (!Number.isFinite(parsed)) return 0.35
  return Math.max(-1, Math.min(parsed, 1))
}

export function parseStoredEmbedding(value: string): number[] | null {
  try {
    const parsed = JSON.parse(value)
    if (
      !Array.isArray(parsed) ||
      parsed.length === 0 ||
      parsed.length > 4096 ||
      !parsed.every(item => Number.isFinite(item))
    ) {
      return null
    }
    return parsed as number[]
  } catch {
    return null
  }
}

export function cosineSimilarity(
  left: number[],
  right: number[],
): number | null {
  if (left.length === 0 || left.length !== right.length) return null
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < left.length; index++) {
    dot += left[index] * right[index]
    leftNorm += left[index] ** 2
    rightNorm += right[index] ** 2
  }
  if (leftNorm === 0 || rightNorm === 0) return null
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

export class SemanticKnowledgeRetriever implements Retriever {
  constructor(
    private prisma: PrismaClient,
    private embeddings: EmbeddingProvider,
  ) {}

  async retrieve(query: RetrieverQuery): Promise<KnowledgeObjectResult[]> {
    const text = expandDomainQuery(query.text).trim()
    if (!text) return []
    const topK = boundedInteger(
      query.maxResults?.toString(),
      DEFAULT_TOP_K,
      1,
      MAX_TOP_K,
    )
    const queryVector = await this.embeddings.embed(text)
    if (queryVector.length === 0) return []

    const rows = await this.prisma.knowledgeObject.findMany({
      where: { status: 'published', isDemo: false },
      include: {
        category: { select: { name: true } },
        sources: {
          include: {
            source: {
              select: {
                id: true,
                title: true,
                url: true,
                authorityLevel: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
      take: boundedInteger(
        process.env.RAG_SEMANTIC_CANDIDATE_LIMIT,
        DEFAULT_CANDIDATE_LIMIT,
        10,
        5000,
      ),
    })

    const ranked = rows
      .flatMap(row => {
        const stored = parseStoredEmbedding(row.embedding)
        const similarity = stored
          ? cosineSimilarity(queryVector, stored)
          : null
        if (
          similarity === null ||
          similarity < minimumSimilarity()
        ) {
          return []
        }
        const sourceRefs: SourceRef[] = row.sources.map(item => ({
          sourceId: item.source.id,
          title: item.source.title,
          url: item.source.url,
          authorityLevel: item.source.authorityLevel,
        }))
        return [{
          id: row.id,
          title: row.title,
          code: row.code,
          content: row.content,
          summary: row.summary,
          category: row.category,
          score: Number((similarity * 100).toFixed(4)),
          matchedTerms: ['semantic'],
          sourceRefs,
        }]
      })
      .sort((left, right) =>
        right.score - left.score ||
        left.title.localeCompare(right.title, 'tr-TR') ||
        left.id - right.id,
      )

    return ranked
      .filter((item, index, candidates) => {
        const topic = item.title.toLocaleLowerCase('tr-TR')
        return candidates.findIndex(candidate =>
          candidate.title.toLocaleLowerCase('tr-TR') === topic
        ) === index
      })
      .slice(0, topK)
  }
}
