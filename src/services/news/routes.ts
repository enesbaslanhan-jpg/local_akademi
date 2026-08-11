import type { FastifyInstance } from 'fastify'
import { NewsCategory, type PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getNewsImagePath } from '../../config/news-images.js'
import { prisma as sharedPrisma } from '../../lib/prisma.js'

const querySchema = z.object({
  category: z.nativeEnum(NewsCategory).optional(),
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

interface NewsCursor { sourcePublishedAt: string; id: string }

export function encodeNewsCursor(cursor: NewsCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeNewsCursor(cursor: string): { sourcePublishedAt: Date; id: string } {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as NewsCursor
    const sourcePublishedAt = new Date(parsed.sourcePublishedAt)
    if (!parsed.id || Number.isNaN(sourcePublishedAt.getTime())) throw new Error('invalid')
    return { sourcePublishedAt, id: parsed.id }
  } catch {
    throw new Error('INVALID_NEWS_CURSOR')
  }
}

export async function newsRoutes(fastify: FastifyInstance, options: { prisma?: PrismaClient } = {}) {
  const prisma = options.prisma ?? sharedPrisma
  fastify.get('/api/news', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_NEWS_QUERY' })
    let cursor: ReturnType<typeof decodeNewsCursor> | undefined
    try { cursor = parsed.data.cursor ? decodeNewsCursor(parsed.data.cursor) : undefined } catch {
      return reply.status(400).send({ error: 'INVALID_NEWS_CURSOR' })
    }
    const rows = await prisma.newsArticle.findMany({
      where: {
        status: 'PUBLISHED',
        ...(parsed.data.category ? { category: parsed.data.category } : {}),
        ...(cursor ? {
          OR: [
            { sourcePublishedAt: { lt: cursor.sourcePublishedAt } },
            { sourcePublishedAt: cursor.sourcePublishedAt, id: { lt: cursor.id } },
          ],
        } : {}),
      },
      orderBy: [{ sourcePublishedAt: 'desc' }, { id: 'desc' }],
      take: parsed.data.limit + 1,
      include: { source: { select: { name: true } } },
    })
    const hasMore = rows.length > parsed.data.limit
    const page = rows.slice(0, parsed.data.limit)
    const last = page.at(-1)
    return {
      items: page.map(article => ({
        id: article.id,
        title: article.title,
        category: article.category,
        canonicalUrl: article.canonicalUrl,
        imageId: article.imageId,
        imagePath: article.imageId ? getNewsImagePath(article.imageId) : null,
        sourceName: article.source.name,
        sourcePublishedAt: article.sourcePublishedAt.toISOString(),
        summary: article.summary,
        whyItMatters: article.whyItMatters,
        tags: article.tags,
        affectedAudience: article.affectedAudience,
        importance: article.importance,
      })),
      nextCursor: hasMore && last ? encodeNewsCursor({ sourcePublishedAt: last.sourcePublishedAt.toISOString(), id: last.id }) : null,
    }
  })
}
