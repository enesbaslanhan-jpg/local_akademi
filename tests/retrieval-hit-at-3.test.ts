import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { LexicalKnowledgeRetriever } from '../src/services/retrieval/lexical-knowledge-retriever'
import { normalizeQuery } from '../src/services/retrieval/query-normalizer'
import type { KnowledgeObjectResult } from '../src/services/retrieval/types'

const FIXTURE_PATH = 'tests/fixtures/retrieval-eval.tr.json'

interface EvalCorpusItem {
  id: number; code?: string | null; title: string; content: string;
  verificationStatus?: string; categoryName?: string | null;
  sources?: Array<{ id: string; title: string; url?: string | null; authorityLevel: string }>
}

interface EvalTestCase { name: string; query: string; relevantKOId: number }

interface EvalFixture { corpus: EvalCorpusItem[]; testCases: EvalTestCase[] }

const fixture: EvalFixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'))

function makeCandidate(item: EvalCorpusItem): any {
  return {
    id: item.id, code: item.code ?? null, title: item.title, content: item.content,
    verificationStatus: item.verificationStatus ?? 'unverified',
    category: item.categoryName ? { name: item.categoryName } : null,
    sources: (item.sources ?? []).map(s => ({
      source: { id: s.id, title: s.title, url: s.url ?? null, authorityLevel: s.authorityLevel },
    })),
  }
}

function generateVariants(token: string, originalTokens: string[]): string[] {
  const tr = 'tr-TR'
  const variants = new Set<string>()
  variants.add(token)
  variants.add(token.toLocaleUpperCase(tr))
  if (token.length > 0) variants.add(token[0].toLocaleUpperCase(tr) + token.slice(1))
  const tokLower = token.toLocaleLowerCase(tr)
  for (const orig of originalTokens) {
    if (orig.length >= 2 && orig.toLocaleLowerCase(tr) === tokLower && orig !== token) variants.add(orig)
  }
  return Array.from(variants)
}

function filterCandidates(items: EvalCorpusItem[], query: string): any[] {
  const nq = normalizeQuery(query)
  if (nq.tokens.length === 0) return []

  const originalTokens = nq.original.split(/\s+/).filter(t => t.length >= 2)
  const allVariants = new Set<string>()
  for (const token of nq.tokens) {
    for (const v of generateVariants(token, originalTokens)) allVariants.add(v)
  }

  const nqPhrase = nq.phrase

  return items.filter(item => {
    const code = item.code ?? ''
    const title = item.title
    const content = item.content
    const catName = item.categoryName ?? ''
    const sources = item.sources ?? []

    for (const v of allVariants) {
      if (code && code.includes(v)) return true
      if (title.includes(v)) return true
      if (catName.includes(v)) return true
      if (content.includes(v)) return true
      for (const s of sources) { if (s.title?.includes(v)) return true }
    }
    if (nqPhrase) {
      if (title.includes(nqPhrase)) return true
      if (content.includes(nqPhrase)) return true
    }
    return false
  }).map(makeCandidate)
}

function expectHitAt3(results: KnowledgeObjectResult[], relevantKOId: number):
  { hit: boolean; rank: number | null } {
  const idx = results.findIndex(r => r.id === relevantKOId)
  return { hit: idx >= 0, rank: idx >= 0 ? idx + 1 : null }
}

describe('Hit@3 per-case', () => {
  for (const tc of fixture.testCases) {
    it(`${tc.name} → KO #${tc.relevantKOId} hit@3`, async () => {
      const matchingCandidates = filterCandidates(fixture.corpus, tc.query)

      const mockFindMany = vi.fn()
      mockFindMany.mockResolvedValue(matchingCandidates)

      const mockPrisma = { knowledgeObject: { findMany: mockFindMany } } as any
      const retriever = new LexicalKnowledgeRetriever(mockPrisma)
      const results = await retriever.retrieve({ text: tc.query, maxResults: 3 })

      const { hit, rank } = expectHitAt3(results, tc.relevantKOId)
      expect(hit, `"${tc.query}" → KO #${tc.relevantKOId} not in results (rank ${rank}). ` +
        `Candidates: ${matchingCandidates.length} total`).toBe(true)
    })
  }
})

describe('Hit@3 aggregate', () => {
  it('asserts Hit@3 ≥ 80% with JSON fixture', async () => {
    const hits: string[] = []
    const misses: string[] = []
    for (const tc of fixture.testCases) {
      const matchingCandidates = filterCandidates(fixture.corpus, tc.query)
      const mockFindMany = vi.fn()
      mockFindMany.mockResolvedValue(matchingCandidates)
      const mockPrisma = { knowledgeObject: { findMany: mockFindMany } } as any
      const retriever = new LexicalKnowledgeRetriever(mockPrisma)
      const results = await retriever.retrieve({ text: tc.query, maxResults: 3 })
      const { hit } = expectHitAt3(results, tc.relevantKOId)
      if (hit) hits.push(tc.name)
      else misses.push(tc.name)
    }
    const pct = hits.length / fixture.testCases.length
    console.log(`Fixture: ${FIXTURE_PATH}`)
    console.log(`Hit@3: ${hits.length}/${fixture.testCases.length} = ${(pct * 100).toFixed(1)}%`)
    if (misses.length > 0) console.log(`Misses: ${misses.join(', ')}`)
    expect(pct).toBeGreaterThanOrEqual(0.80)
  })

  it('integration test covers real candidate filtering', async () => {
    const { execSync } = await import('child_process')
    const { PrismaClient } = await import('@prisma/client')

    const schemaName = `hit3_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const baseUrl = 'postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi_test'
    const dbUrl = `${baseUrl}?schema=${schemaName}`

    execSync(`npx prisma db push --skip-generate --accept-data-loss --schema prisma/schema.prisma`, {
      cwd: process.cwd(), stdio: 'pipe', timeout: 60000,
      env: { ...process.env, DATABASE_URL: dbUrl, RUST_LOG: 'info' },
    })

    const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })
    try {
      await prisma.$connect()

      const categoryMap = new Map<string, number>()
      for (const item of fixture.corpus) {
        if (item.categoryName && !categoryMap.has(item.categoryName)) {
          const cat = await prisma.category.create({
            data: { name: `${item.categoryName}-hit3` },
          })
          categoryMap.set(item.categoryName, cat.id)
        }
      }

      const sourceMap = new Map<string, string>()
      for (const item of fixture.corpus) {
        for (const s of item.sources ?? []) {
          if (!sourceMap.has(s.id)) {
            const src = await prisma.source.create({
              data: { id: `hit3-${s.id}`, title: s.title, url: s.url ?? null, authorityLevel: s.authorityLevel },
            })
            sourceMap.set(s.id, src.id)
          }
        }
      }

      const realIdMap = new Map<number, number>()
      for (const item of fixture.corpus) {
        const ko = await prisma.knowledgeObject.create({
          data: {
            code: item.code ?? undefined,
            type: 'article',
            title: item.title,
            content: item.content,
            status: 'published',
            isDemo: false,
            verificationStatus: item.verificationStatus ?? 'unverified',
            metadata: '{}',
            embedding: '',
            categoryId: item.categoryName ? categoryMap.get(item.categoryName) ?? null : null,
          },
        })
        realIdMap.set(item.id, ko.id)

        for (const s of item.sources ?? []) {
          const realSourceId = sourceMap.get(s.id)!
          await prisma.knowledgeObjectSource.create({
            data: { koId: ko.id, sourceId: realSourceId },
          })
        }
      }

      const retriever = new LexicalKnowledgeRetriever(prisma)

      let dbHits = 0
      const dbMisses: string[] = []

      for (const tc of fixture.testCases) {
        const results = await retriever.retrieve({ text: tc.query, maxResults: 3 })
        const realExpectedId = realIdMap.get(tc.relevantKOId)
        const hit = results.some(r => r.id === realExpectedId)
        if (hit) dbHits++
        else dbMisses.push(tc.name)
      }

      const dbPct = dbHits / fixture.testCases.length
      console.log(`DB Hit@3: ${dbHits}/${fixture.testCases.length} = ${(dbPct * 100).toFixed(1)}%`)
      if (dbMisses.length > 0) console.log(`DB Misses: ${dbMisses.join(', ')}`)
      expect(dbPct).toBeGreaterThanOrEqual(0.80)
    } finally {
      await prisma.$disconnect()
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
    }
  }, 30_000)
})
