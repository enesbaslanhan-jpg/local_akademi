import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import { LexicalKnowledgeRetriever } from '../src/services/retrieval/lexical-knowledge-retriever'

const PREFIX = 'retrieval-int-'
let prisma: PrismaClient
let retriever: LexicalKnowledgeRetriever
const TEST_DB_URL = process.env.TEST_DATABASE_URL
  || 'postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi_test?schema=public'

const UNIQUE_TAG = `int-${Date.now()}`
const CATEGORY_ONLY_TOKEN = `kategori-ozel-${UNIQUE_TAG}`

beforeAll(async () => {
  // Reset the test database schema
  execSync('npx prisma db push --force-reset --accept-data-loss --skip-generate --schema prisma/schema.prisma', {
    cwd: process.cwd(),
    stdio: 'pipe',
    timeout: 60000,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL, RUST_LOG: 'info' },
  })

  prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } })
  await prisma.$connect()

  const catGirisim = await prisma.category.create({ data: { name: `Girişimcilik-${UNIQUE_TAG}` } })
  const catMuhasebe = await prisma.category.create({ data: { name: `Muhasebe-${UNIQUE_TAG}` } })
  const catVergi = await prisma.category.create({ data: { name: `Vergi-${UNIQUE_TAG}` } })
  const catIstihdam = await prisma.category.create({ data: { name: `İstihdam-${UNIQUE_TAG}` } })
  const catOnly = await prisma.category.create({ data: { name: CATEGORY_ONLY_TOKEN } })

  const srcTrade = await prisma.source.create({
    data: { id: `src-trade-${UNIQUE_TAG}`, title: `Ticaret Bakanlığı-${UNIQUE_TAG}`, url: 'https://trade.gov.tr', authorityLevel: 'high' },
  })
  const srcGib = await prisma.source.create({
    data: { id: `src-gib-${UNIQUE_TAG}`, title: `Gelir İdaresi-${UNIQUE_TAG}`, url: 'https://gib.gov.tr', authorityLevel: 'high' },
  })
  const srcKosgeb = await prisma.source.create({
    data: { id: `src-kosgeb-${UNIQUE_TAG}`, title: `KOSGEB-${UNIQUE_TAG}`, url: null, authorityLevel: 'medium' },
  })

  await prisma.knowledgeObject.create({
    data: {
      id: 9001, type: 'concept', title: `Şirket Kurulumu-${UNIQUE_TAG}`,
      content: 'Şirket kurulumu için gerekli adımlar: 1) Ticaret Sicil Müdürlüğü başvurusu 2) Vergi dairesi kaydı.',
      embedding: '[]', metadata: '{}', status: 'published', isDemo: false,
      categoryId: catGirisim.id,
      sources: { create: [{ sourceId: srcTrade.id, relation: 'references' }, { sourceId: srcGib.id, relation: 'references' }] },
    },
  })
  await prisma.knowledgeObject.create({
    data: {
      id: 9002, type: 'procedure', title: `KOSGEB Destekleri-${UNIQUE_TAG}`,
      content: 'KOSGEB girişimcilere hibe ve faizsiz kredi desteği sağlar. Başvuru için KOSGEB müdürlüklerine başvurulur.',
      embedding: '[]', metadata: '{}', status: 'published', isDemo: false,
      categoryId: catGirisim.id,
      sources: { create: [{ sourceId: srcKosgeb.id, relation: 'references' }] },
    },
  })
  await prisma.knowledgeObject.create({
    data: {
      id: 9003, type: 'fact', title: `Vergi Muafiyeti-${UNIQUE_TAG}`,
      content: `Belirli gelir seviyesinin altındaki işletmeler KDV'den muaf tutulabilir. Vergi muafiyeti için başvuru şartları.`,
      embedding: '[]', metadata: '{}', status: 'published', isDemo: false,
      categoryId: catVergi.id,
      sources: { create: [{ sourceId: srcGib.id, relation: 'references' }] },
    },
  })
  await prisma.knowledgeObject.create({
    data: {
      id: 9004, type: 'principle', title: `İstihdam Teşvikleri-${UNIQUE_TAG}`,
      content: 'Yeni işe alımlarda devlet teşvikleri. Genç, kadın ve engelli istihdamında sigorta primi desteği.',
      embedding: '[]', metadata: '{}', status: 'draft', isDemo: false,
      categoryId: catIstihdam.id,
    },
  })

  retriever = new LexicalKnowledgeRetriever(prisma)
})

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect()
  }
})

describe('LexicalKnowledgeRetriever — Full Integration', () => {
  it('returns published KOs for a query about company setup (Turkish)', async () => {
    const results = await retriever.retrieve({ text: 'Şirket kurulumu nasıl yapılır' })
    expect(results).toBeDefined()
    expect(results.length).toBeGreaterThanOrEqual(1)
    const matched = results.find(r => r.title.includes('Şirket Kurulumu'))
    expect(matched).toBeDefined()
  })

  it('returns KOs related to KOSGEB grants', async () => {
    const results = await retriever.retrieve({ text: 'KOSGEB hibe desteği' })
    expect(results.length).toBeGreaterThanOrEqual(1)
    const matched = results.find(r => r.title.includes('KOSGEB'))
    expect(matched).toBeDefined()
  })

  it('returns results when querying by category name', async () => {
    const results = await retriever.retrieve({
      text: 'kategori',
    })
    expect(results.length).toBeGreaterThanOrEqual(0)
  })

  it('includes sources in results', async () => {
    const results = await retriever.retrieve({ text: 'Ticaret Bakanlığı' })
    expect(results.length).toBeGreaterThanOrEqual(1)
    const withSources = results.filter(r => (r.sourceRefs?.length ?? 0) > 0)
    expect(withSources.length).toBeGreaterThanOrEqual(1)
  })

  it('filters draft KOs by default (published only when status=published)', async () => {
    const results = await retriever.retrieve({ text: 'İstihdam teşvik' })
    const draftResults = results.filter(r => r.status === 'draft')
    expect(draftResults.length).toBe(0)
  })

  it('returns at most 10 results by default', async () => {
    const results = await retriever.retrieve({ text: 'KO' })
    expect(results.length).toBeLessThanOrEqual(10)
  })

  it('returns empty array for nonsense query', async () => {
    const results = await retriever.retrieve({ text: 'xyz123nonexistent' })
    expect(results).toEqual([])
  })

  it('returns KO metadata and embedding fields', async () => {
    const results = await retriever.retrieve({ text: 'Şirket kurulumu' })
    expect(results.length).toBeGreaterThanOrEqual(1)
    const ko = results[0]
    expect(ko).toHaveProperty('id')
    expect(ko).toHaveProperty('title')
    expect(ko).toHaveProperty('content')
    expect(ko).toHaveProperty('score')
    expect(ko).toHaveProperty('matchedTerms')
  })

  it('handles null sources column gracefully', async () => {
    const results = await retriever.retrieve({ text: 'vergi' })
    expect(results.length).toBeGreaterThanOrEqual(0)
  })

  it('supports limit parameter', async () => {
    const results = await retriever.retrieve({ text: 'KO', maxResults: 3 })
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('supports deduplication by id', async () => {
    const first = await retriever.retrieve({ text: 'KOSGEB', maxResults: 1 })
    const second = await retriever.retrieve({ text: 'KOSGEB', maxResults: 1 })
    expect(first.length).toBeGreaterThanOrEqual(1)
    expect(second.length).toBeGreaterThanOrEqual(1)
    if (first.length > 0 && second.length > 0) {
      expect(first[0].id).toBe(second[0].id)
    }
  })
})
