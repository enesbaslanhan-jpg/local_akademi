import { createHash } from 'crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import { NEWS_SOURCES, type NewsSourceConfig } from '../../config/news-sources.js'
import { selectNewsImage } from '../../config/news-images.js'
import { prisma as sharedPrisma } from '../../lib/prisma.js'
import { analyzeNews, type NewsAnalyzerResult } from './analyzer.js'
import { canonicalizeNewsUrl, createNewsAdapter, sanitizeNewsText, type NewsCandidate, type NewsSourceAdapter } from './adapters.js'

export interface NewsIngestionStats {
  sources: number
  fetched: number
  published: number
  archived: number
  failed: number
  duplicates: number
  sourceErrors: number
}

export type NewsAnalyzer = (input: {
  sourceName: string
  title: string
  sourceUrl: string
  sourcePublishedAt: Date
  sourceText: string
}) => Promise<NewsAnalyzerResult>

export function createNewsContentHash(candidate: Pick<NewsCandidate, 'title' | 'content'>): string {
  const normalized = `${sanitizeNewsText(candidate.title)}\n${sanitizeNewsText(candidate.content)}`
    .normalize('NFKC')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim()
  return createHash('sha256').update(normalized).digest('hex')
}

export async function ensureNewsSources(
  prisma: PrismaClient = sharedPrisma,
  sources: readonly NewsSourceConfig[] = NEWS_SOURCES,
): Promise<void> {
  await Promise.all(sources.map(source => prisma.newsSource.upsert({
    where: { id: source.id },
    update: {
      name: source.name,
      baseUrl: source.baseUrl,
      feedUrl: source.feedUrl ?? null,
      type: source.type,
      category: source.category,
      isActive: source.isActive,
      isOfficial: source.isOfficial,
      allowedDomains: source.allowedDomains,
    },
    create: {
      id: source.id,
      name: source.name,
      baseUrl: source.baseUrl,
      feedUrl: source.feedUrl ?? null,
      type: source.type,
      category: source.category,
      isActive: source.isActive,
      isOfficial: source.isOfficial,
      allowedDomains: source.allowedDomains,
    },
  })))
}

function failureCode(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 240)
  return 'NEWS_PROCESSING_FAILED'
}

async function processCandidate(
  prisma: PrismaClient,
  source: NewsSourceConfig,
  candidate: NewsCandidate,
  analyzer: NewsAnalyzer,
): Promise<'published' | 'archived' | 'failed' | 'duplicate'> {
  const title = sanitizeNewsText(candidate.title).slice(0, 300)
  const content = sanitizeNewsText(candidate.content) || title
  const canonicalUrl = canonicalizeNewsUrl(candidate.url, source.baseUrl)
  const contentHash = createNewsContentHash({ title, content })
  const duplicate = await prisma.newsArticle.findFirst({
    where: { OR: [{ canonicalUrl }, { contentHash }] },
    select: { id: true },
  })
  if (duplicate) return 'duplicate'

  let articleId: string
  try {
    const article = await prisma.newsArticle.create({
      data: {
        sourceId: source.id,
        category: source.category,
        title,
        canonicalUrl,
        contentHash,
        sourcePublishedAt: candidate.sourcePublishedAt,
        sourceTextExcerpt: content.slice(0, 4_000),
        tags: [],
        affectedAudience: [],
      },
      select: { id: true },
    })
    articleId = article.id
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return 'duplicate'
    throw error
  }

  try {
    const result = await analyzer({
      sourceName: source.name,
      title,
      sourceUrl: canonicalUrl,
      sourcePublishedAt: candidate.sourcePublishedAt,
      sourceText: content,
    })
    if (!result.analysis.isRelevant) {
      await prisma.newsArticle.update({
        where: { id: articleId },
        data: {
          status: 'ARCHIVED',
          summary: result.analysis.summary,
          whyItMatters: result.analysis.whyItMatters,
          tags: result.analysis.tags,
          affectedAudience: result.analysis.affectedAudience,
          importance: result.analysis.importance,
          aiProvider: result.provider,
          aiModel: result.model,
        },
      })
      return 'archived'
    }

    const recent = await prisma.newsArticle.findMany({
      where: { status: 'PUBLISHED', imageId: { not: null } },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 6,
      select: { imageId: true },
    })
    const image = selectNewsImage(source.category, result.analysis.tags, recent.flatMap(row => row.imageId ? [row.imageId] : []))
    await prisma.newsArticle.update({
      where: { id: articleId },
      data: {
        status: 'PUBLISHED',
        summary: result.analysis.summary,
        whyItMatters: result.analysis.whyItMatters,
        tags: result.analysis.tags,
        affectedAudience: result.analysis.affectedAudience,
        importance: result.analysis.importance,
        imageId: image.id,
        aiProvider: result.provider,
        aiModel: result.model,
        publishedAt: new Date(),
        failureReason: null,
      },
    })
    return 'published'
  } catch (error) {
    await prisma.newsArticle.update({
      where: { id: articleId },
      data: { status: 'FAILED', failureReason: failureCode(error) },
    })
    return 'failed'
  }
}

export async function runNewsIngestion(options: {
  prisma?: PrismaClient
  sources?: readonly NewsSourceConfig[]
  analyzer?: NewsAnalyzer
  adapterFactory?: (source: NewsSourceConfig) => NewsSourceAdapter
  onSourceError?: (source: NewsSourceConfig, error: unknown) => void
} = {}): Promise<NewsIngestionStats> {
  const prisma = options.prisma ?? sharedPrisma
  const sources = (options.sources ?? NEWS_SOURCES).filter(source => source.isActive)
  const analyzer = options.analyzer ?? analyzeNews
  const stats: NewsIngestionStats = { sources: sources.length, fetched: 0, published: 0, archived: 0, failed: 0, duplicates: 0, sourceErrors: 0 }
  await ensureNewsSources(prisma, sources)

  for (const source of sources) {
    try {
      const adapter = options.adapterFactory?.(source) ?? createNewsAdapter(source)
      const candidates = await adapter.fetchCandidates(source)
      stats.fetched += candidates.length
      const outcomeCounts: Record<string, number> = {}
      for (const candidate of candidates) {
        const outcome = await processCandidate(prisma, source, candidate, analyzer)
        outcomeCounts[outcome] = (outcomeCounts[outcome] ?? 0) + 1
        stats[outcome === 'duplicate' ? 'duplicates' : outcome] += 1
      }
      console.log(JSON.stringify({
        event: 'NEWS_SOURCE_RESULT',
        source: source.id,
        fetched: candidates.length,
        published: outcomeCounts.published ?? 0,
        archived: outcomeCounts.archived ?? 0,
        duplicates: outcomeCounts.duplicates ?? 0,
        failed: outcomeCounts.failed ?? 0,
      }))
    } catch (error) {
      stats.sourceErrors += 1
      console.log(JSON.stringify({
        event: 'NEWS_SOURCE_ERROR',
        source: source.id,
        error: failureCode(error),
      }))
      options.onSourceError?.(source, error)
    }
  }
  return stats
}
