import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatKnowledgeEmbeddingInput,
  indexKnowledgeObjectEmbedding,
  scheduleKnowledgeObjectEmbedding,
} from '../src/services/retrieval/knowledge-embedding-indexer'

afterEach(() => {
  delete process.env.RAG_AUTO_EMBEDDING_ENABLED
})

describe('knowledge embedding indexer', () => {
  it('formats a bounded input without metadata', () => {
    const input = formatKnowledgeEmbeddingInput({
      code: 'KO-1',
      title: 'Başlık',
      content: 'x'.repeat(5000),
    })
    expect(input).toContain('Kod: KO-1')
    expect(input).toContain('Başlık: Başlık')
    expect(input.length).toBeLessThanOrEqual(1600)
  })

  it('indexes only published non-demo knowledge', async () => {
    const update = vi.fn()
    const prisma = {
      knowledgeObject: {
        findFirst: vi.fn().mockResolvedValue({
          id: 7,
          code: 'KO-7',
          title: 'Test',
          content: 'İçerik',
        }),
        update,
      },
    } as any
    const result = await indexKnowledgeObjectEmbedding(prisma, 7, {
      embed: vi.fn().mockResolvedValue([0.1, 0.2]),
    })
    expect(prisma.knowledgeObject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7, status: 'published', isDemo: false },
      }),
    )
    expect(update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { embedding: '[0.1,0.2]' },
    })
    expect(result).toEqual({ indexed: true, dimensions: 2 })
  })

  it('does not index an ineligible record', async () => {
    const prisma = {
      knowledgeObject: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    } as any
    await expect(
      indexKnowledgeObjectEmbedding(prisma, 8, {
        embed: vi.fn(),
      }),
    ).resolves.toEqual({ indexed: false, dimensions: 0 })
    expect(prisma.knowledgeObject.update).not.toHaveBeenCalled()
  })

  it('keeps automatic indexing disabled by default', () => {
    expect(
      scheduleKnowledgeObjectEmbedding({
        prisma: {} as any,
        koId: 9,
      }),
    ).toBe('disabled')
  })
})
