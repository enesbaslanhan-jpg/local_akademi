import { describe, expect, it, vi } from 'vitest'
import {
  HybridKnowledgeRetriever,
  cosineSimilarity,
  parseStoredEmbedding,
} from '../src/services/retrieval'
import type {
  KnowledgeObjectResult,
  Retriever,
} from '../src/services/retrieval'

const result = (
  id: number,
  score: number,
  matchedTerms: string[],
): KnowledgeObjectResult => ({
  id,
  title: `KO ${id}`,
  code: `KO-${id}`,
  content: 'İçerik',
  category: null,
  score,
  matchedTerms,
  sourceRefs: [],
})

describe('semantic and hybrid retrieval', () => {
  it('parses only bounded finite vectors', () => {
    expect(parseStoredEmbedding('[1,0,2]')).toEqual([1, 0, 2])
    expect(parseStoredEmbedding('[]')).toBeNull()
    expect(parseStoredEmbedding('invalid')).toBeNull()
    expect(parseStoredEmbedding('[1,\"x\"]')).toBeNull()
  })

  it('calculates cosine similarity safely', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
    expect(cosineSimilarity([1], [1, 0])).toBeNull()
    expect(cosineSimilarity([0, 0], [1, 0])).toBeNull()
  })

  it('merges lexical and semantic ranks deterministically', async () => {
    const lexical: Retriever = {
      retrieve: vi.fn(async () => [
        result(1, 100, ['title:nakit']),
        result(2, 80, ['content:nakit']),
      ]),
    }
    const semantic: Retriever = {
      retrieve: vi.fn(async () => [
        result(2, 95, ['semantic']),
        result(3, 90, ['semantic']),
      ]),
    }
    const hybrid = new HybridKnowledgeRetriever(lexical, semantic)

    const rows = await hybrid.retrieve({
      text: 'nakit akışı',
      maxResults: 3,
    })

    expect(rows.map(row => row.id)).toEqual([2, 1, 3])
    expect(rows[0].matchedTerms).toContain('lexical')
    expect(rows[0].matchedTerms).toContain('semantic')
  })

  it('falls back to lexical results when embeddings are unavailable', async () => {
    const lexicalRows = [result(1, 100, ['title:nakit'])]
    const hybrid = new HybridKnowledgeRetriever(
      { retrieve: vi.fn(async () => lexicalRows) },
      {
        retrieve: vi.fn(async () => {
          throw new Error('EMBEDDING_TIMEOUT')
        }),
      },
    )

    await expect(
      hybrid.retrieve({ text: 'nakit' }),
    ).resolves.toEqual(lexicalRows)
  })

  it('never displaces an exact code match with a semantic-only result', async () => {
    const exact = result(10, 100, ['code:KO-10'])
    const hybrid = new HybridKnowledgeRetriever(
      { retrieve: vi.fn(async () => [exact]) },
      {
        retrieve: vi.fn(async () => [
          result(1, 99, ['semantic']),
          result(2, 98, ['semantic']),
        ]),
      },
    )
    const rows = await hybrid.retrieve({
      text: 'KO-10',
      maxResults: 3,
    })
    expect(rows[0].id).toBe(10)
  })

  it('does not let lesson variants crowd out distinct topics', async () => {
    const lexical: Retriever = {
      retrieve: vi.fn(async () => [
        { ...result(1, 100, ['title:nakit']), title: 'Nakit Akışı' },
        { ...result(2, 99, ['title:nakit']), title: 'Nakit Akışı' },
        { ...result(3, 80, ['title:bütçe']), title: 'İşletme Bütçesi' },
      ]),
    }
    const semantic: Retriever = {
      retrieve: vi.fn(async () => [
        { ...result(4, 95, ['semantic']), title: 'Nakit Akışı' },
        { ...result(5, 90, ['semantic']), title: 'Borç Yönetimi' },
      ]),
    }
    const rows = await new HybridKnowledgeRetriever(
      lexical,
      semantic,
    ).retrieve({ text: 'nakit', maxResults: 3 })
    expect(new Set(rows.map(row => row.title)).size).toBe(rows.length)
  })
})
