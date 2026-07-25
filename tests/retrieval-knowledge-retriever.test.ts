import { describe, it, expect, beforeEach } from 'vitest'
import {
  CANDIDATE_LIMIT,
  LexicalKnowledgeRetriever,
  EXACT_CODE_LIMIT,
  PRIORITY_LIMIT,
} from '../src/services/retrieval/lexical-knowledge-retriever'

function mockFindManyFn(
  resolvedValues: any[][] = [[]],
): { mockFindMany: ReturnType<typeof vi.fn>; mockPrisma: any } {
  const fn = vi.fn()
  for (const val of resolvedValues) {
    fn.mockResolvedValueOnce(val)
  }
  fn.mockResolvedValue([])
  return { mockFindMany: fn, mockPrisma: { knowledgeObject: { findMany: fn } } as any }
}

function makeCandidate(overrides: Partial<{
  id: number; code: string | null; title: string; content: string;
  verificationStatus: string; category: { name: string } | null;
  sources: Array<{ source: { id: string; title: string; url: string | null; authorityLevel: string } }>
}> = {}): any {
  const base = {
    id: 1,
    code: null as string | null,
    title: 'Varsayılan Başlık',
    content: 'Varsayılan içerik metni.',
    verificationStatus: 'unverified',
    category: null as { name: string } | null,
    sources: [] as Array<any>,
  }
  return { ...base, ...overrides }
}

function makeExactCodeBatch(ids: number[]): any[] {
  return ids.map(id => makeCandidate({ id, code: `CUR-${String(id).padStart(3, '0')}-01` }))
}

beforeEach(() => {
})

describe('empty/stop-word guard', () => {
  it('empty query returns [] without calling DB', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn()
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: '' })
    expect(results).toEqual([])
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('stop-word-only query returns [] without calling DB', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn()
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 've veya ile' })
    expect(results).toEqual([])
    expect(mockFindMany).not.toHaveBeenCalled()
  })
})

describe('security filters', () => {
  it('all three queries include published + isDemo:false', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn()
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    await retriever.retrieve({ text: 'test' })
    expect(mockFindMany).toHaveBeenCalledTimes(3)
    for (let i = 0; i < 3; i++) {
      expect(mockFindMany.mock.calls[i][0].where.status).toBe('published')
      expect(mockFindMany.mock.calls[i][0].where.isDemo).toBe(false)
    }
  })
})

describe('exact code query', () => {
  it('includes code: { in: variants } in first call', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn()
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    await retriever.retrieve({ text: 'CUR-001' })
    const firstCallWhere = mockFindMany.mock.calls[0][0].where
    expect(firstCallWhere.code).toBeDefined()
    expect(firstCallWhere.code.in).toBeDefined()
    expect(firstCallWhere.code.in).toContain('cur-001')
  })

  it('exact code result ranks highest even when content also matches', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [makeCandidate({ id: 2, code: 'KO-SIRKET', title: 'Şirket Rehberi', content: 'x' })],
      [makeCandidate({ id: 1, title: 'Genel Konular', content: 'şirket kurulum için gerekenler' })],
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'KO-SIRKET' })
    expect(results[0].id).toBe(2)
    expect(results[0].score).toBeGreaterThanOrEqual(100)
    expect(results[0].matchedTerms).toContain('code:ko-sırket')
  })
})

describe('priority fields query', () => {
  it('second call searches code contains, title, category, source title', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn()
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    await retriever.retrieve({ text: 'girişim' })
    const secondCallOR = mockFindMany.mock.calls[1][0].where.OR
    expect(secondCallOR.length).toBeGreaterThan(0)

    const hasTitle = secondCallOR.some((c: any) => c.title?.contains)
    const hasCategory = secondCallOR.some((c: any) => c.category?.name?.contains)
    const hasSource = secondCallOR.some((c: any) => c.sources?.some?.source?.title?.contains)
    const hasCode = secondCallOR.some((c: any) => c.code?.contains)
    expect(hasTitle).toBe(true)
    expect(hasCategory).toBe(true)
    expect(hasSource).toBe(true)
    expect(hasCode).toBe(true)
  })

  it('title match from priority pool ranked above content-only', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      [makeCandidate({ id: 1, title: 'Kurulum Rehberi', content: 'Başka konu.' })],
      [makeCandidate({ id: 2, title: 'Başka Konu', content: 'Bu metin kurulum adımlarını anlatır.' })],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'kurulum' })
    expect(results[0].id).toBe(1)
  })

  it('uses take=200 for priority query', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn()
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    await retriever.retrieve({ text: 'test' })
    expect(mockFindMany.mock.calls[1][0].take).toBe(PRIORITY_LIMIT)
  })
})

describe('content query', () => {
  it('third call searches only content field', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn()
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    await retriever.retrieve({ text: 'test' })
    const thirdCallOR = mockFindMany.mock.calls[2][0].where.OR
    expect(thirdCallOR.length).toBeGreaterThan(0)
    const onlyContent = thirdCallOR.every((c: any) => c.content?.contains !== undefined)
    expect(onlyContent).toBe(true)
  })
})

describe('merged candidate cap', () => {
  it('keeps exact candidates first and never admits candidates beyond the 200-item cap', async () => {
    const exactCandidates = Array.from({ length: EXACT_CODE_LIMIT }, (_, i) =>
      makeCandidate({ id: i + 1, code: `UNRELATED-${i + 1}` })
    )
    const priorityCandidates = Array.from({ length: PRIORITY_LIMIT }, (_, i) =>
      makeCandidate({
        id: 100 + i,
        title: i === 149 || i === 150 ? 'Hedef Başlık' : `İlgisiz Başlık ${i}`,
      })
    )
    const contentCandidates = [
      makeCandidate({ id: 9999, content: 'hedef yalnız içerikte' }),
    ]
    const { mockPrisma } = mockFindManyFn([
      exactCandidates,
      priorityCandidates,
      contentCandidates,
    ])

    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'hedef', maxResults: 5 })

    expect(EXACT_CODE_LIMIT + 150).toBe(CANDIDATE_LIMIT)
    expect(results.some(result => result.id === 249)).toBe(true)
    expect(results.some(result => result.id === 250)).toBe(false)
    expect(results.some(result => result.id === 9999)).toBe(false)
  })
})

describe('topK clamp', () => {
  it('default topK = 3', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      Array.from({ length: 10 }, (_, i) => makeCandidate({ id: i + 1, title: `Konu ${i + 1}`, content: `test` })),
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'test' })
    expect(results.length).toBeLessThanOrEqual(3)
    expect(results.length).toBeGreaterThan(0)
  })

  it('maxResults=5 returns at most 5', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      Array.from({ length: 10 }, (_, i) => makeCandidate({ id: i + 1, title: `Konu ${i + 1}`, content: `test` })),
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'test', maxResults: 5 })
    expect(results.length).toBeLessThanOrEqual(5)
  })

  it('hard cap at 5 even if larger maxResults requested', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      Array.from({ length: 10 }, (_, i) => makeCandidate({ id: i + 1, title: `Konu ${i + 1}`, content: `test` })),
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'test', maxResults: 100 })
    expect(results.length).toBeLessThanOrEqual(5)
  })

  it('NaN maxResults clamped to default', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      Array.from({ length: 10 }, (_, i) => makeCandidate({ id: i + 1, title: `Konu ${i + 1}`, content: `test` })),
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'test', maxResults: NaN })
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('negative maxResults clamped to 1', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      Array.from({ length: 10 }, (_, i) => makeCandidate({ id: i + 1, title: `Konu ${i + 1}`, content: `test` })),
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'test', maxResults: -5 })
    expect(results.length).toBeGreaterThanOrEqual(1)
  })
})

describe('case variants generated', () => {
  it('generates lowercase, uppercase, capitalized variants per token', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn()
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    await retriever.retrieve({ text: 'şirket' })
    const queryCodeIn = mockFindMany.mock.calls[0][0].where.code.in
    expect(queryCodeIn).toContain('şirket')
    expect(queryCodeIn).toContain('ŞİRKET')
    expect(queryCodeIn).toContain('Şirket')
  })
})

describe('deterministic tie-break', () => {
  it('equal scores use title asc and keep the lowest-id topic variant', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      [
      makeCandidate({ id: 3, title: 'Finans Rehberi', content: 'para yönetimi' }),
      makeCandidate({ id: 1, title: 'Bütçe Rehberi', content: 'para yönetimi' }),
      makeCandidate({ id: 2, title: 'Bütçe Rehberi', content: 'para yönetimi' }),
      ],
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'para' })
    expect(results.map(result => result.id)).toEqual([1, 3])
  })
})

describe('content repetition cap', () => {
  it('repeated token in content does not inflate score beyond cap', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      [makeCandidate({
        id: 1, title: 'X', content: 'finans '.repeat(20).trim(), code: null, verificationStatus: 'unverified',
      })],
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'finans' })
    expect(results[0].score).toBeGreaterThan(0)
    expect(results[0].score).toBeLessThanOrEqual(18)
  })
})

describe('source refs and authority', () => {
  it('includes sourceRefs with authority metadata', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      [makeCandidate({
        id: 1, title: 'Vergi Rehberi', content: 'Vergi avantajları.', code: null,
        sources: [
          { source: { id: 'src-1', title: 'Vergi Dairesi', url: 'https://example.com', authorityLevel: 'high' } },
        ],
      })],
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'vergi' })
    expect(results[0].sourceRefs).toHaveLength(1)
    expect(results[0].sourceRefs[0].sourceId).toBe('src-1')
    expect(results[0].sourceRefs[0].authorityLevel).toBe('high')
    expect(results[0].sourceRefs[0].url).toBe('https://example.com')
  })

  it('high authority sources add bonus (capped at 6)', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      [
        makeCandidate({
          id: 1, title: 'A', content: 'vergi', code: null,
          sources: [
            { source: { id: 's1', title: 'S1', url: null, authorityLevel: 'high' } },
            { source: { id: 's2', title: 'S2', url: null, authorityLevel: 'high' } },
            { source: { id: 's3', title: 'S3', url: null, authorityLevel: 'high' } },
            { source: { id: 's4', title: 'S4', url: null, authorityLevel: 'high' } },
          ],
        }),
        makeCandidate({
          id: 2, title: 'B', content: 'vergi', code: null, sources: [],
        }),
      ],
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'vergi' })
    expect(results[0].id).toBe(1)
    expect(results[0].score).toBeGreaterThan(results[1].score)
  })
})

describe('verified bonus', () => {
  it('verified KO gets +3 bonus', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      [
        makeCandidate({ id: 1, title: 'A', content: 'test', code: null, verificationStatus: 'verified' }),
        makeCandidate({ id: 2, title: 'B', content: 'test', code: null, verificationStatus: 'unverified' }),
      ],
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'test' })
    const score1 = results.find(r => r.id === 1)?.score ?? 0
    const score2 = results.find(r => r.id === 2)?.score ?? 0
    expect(score1).toBe(score2 + 3)
  })
})

describe('category scoring', () => {
  it('category token match adds points', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      [
        makeCandidate({ id: 1, title: 'Rehber', content: 'İçerik', code: null, category: { name: 'Girişimcilik' } }),
        makeCandidate({ id: 2, title: 'Rehber', content: 'İçerik', code: null, category: { name: 'Muhasebe' } }),
      ],
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'girişim' })
    expect(results[0].id).toBe(1)
  })
})

describe('include clause', () => {
  it('all calls include category and sources', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn()
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    await retriever.retrieve({ text: 'test' })
    for (let i = 0; i < 3; i++) {
      const inc = mockFindMany.mock.calls[i][0].include
      expect(inc.category).toEqual({ select: { name: true } })
      expect(inc.sources.include.source.select).toHaveProperty('authorityLevel')
    }
  })
})

describe('irrelevant query returns empty', () => {
  it('no matching tokens leads to empty result', async () => {
    const { mockFindMany, mockPrisma } = mockFindManyFn([
      [],
      [makeCandidate({ id: 1, title: 'Vergi Rehberi', content: 'Vergi oranları.' })],
      [],
    ])
    const retriever = new LexicalKnowledgeRetriever(mockPrisma)
    const results = await retriever.retrieve({ text: 'astronot' })
    expect(results).toHaveLength(0)
  })
})
