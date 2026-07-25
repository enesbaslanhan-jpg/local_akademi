import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import { LexicalKnowledgeRetriever } from '../src/services/retrieval/lexical-knowledge-retriever'

const PREFIX = 'retrieval-int-'
let tmpDir: string
let prisma: PrismaClient
let retriever: LexicalKnowledgeRetriever

const UNIQUE_TAG = `int-${Date.now()}`
const CATEGORY_ONLY_TOKEN = `kategori-ozel-${UNIQUE_TAG}`

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), PREFIX))
  const dbPath = join(tmpDir, 'test.db')
  const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`

  process.env.DATABASE_URL = dbUrl
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss --schema prisma/schema.prisma', {
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: 60000,
      env: { ...process.env, RUST_LOG: 'info' },
    })
  } finally {
    delete process.env.DATABASE_URL
  }

  prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })
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

  const ko1 = await prisma.knowledgeObject.create({
    data: {
      code: `CUR-001-01-${UNIQUE_TAG}`,
      type: 'article',
      title: `Kâr ile Nakit Arasındaki Fark-${UNIQUE_TAG}`,
      content: `Nakit akışı yönetimi ve kâr hesaplama yöntemleri-${UNIQUE_TAG}`,
      status: 'published',
      isDemo: false,
      verificationStatus: 'verified',
      metadata: '{}', embedding: '',
      categoryId: catMuhasebe.id,
    },
  })
  await prisma.knowledgeObjectSource.create({ data: { koId: ko1.id, sourceId: srcGib.id } })

  const ko2 = await prisma.knowledgeObject.create({
    data: {
      code: `SIRKET-KURULUM-${UNIQUE_TAG}`,
      type: 'article',
      title: `Şirket Kurulum Rehberi-${UNIQUE_TAG}`,
      content: `Şirket kurulumu için gerekli adımlar ve belgeler-${UNIQUE_TAG}`,
      status: 'published', isDemo: false, verificationStatus: 'verified',
      metadata: '{}', embedding: '',
      categoryId: catGirisim.id,
    },
  })
  await prisma.knowledgeObjectSource.create({ data: { koId: ko2.id, sourceId: srcTrade.id } })

  const ko3 = await prisma.knowledgeObject.create({
    data: {
      code: `IHRACAT-REHBER-${UNIQUE_TAG}`,
      type: 'article',
      title: `İhracat Rehberi-${UNIQUE_TAG}`,
      content: `İhracat işlemleri ve gümrük süreçleri-${UNIQUE_TAG}`,
      status: 'published', isDemo: false, verificationStatus: 'unverified',
      metadata: '{}', embedding: '',
      categoryId: catVergi.id,
    },
  })

  const ko4 = await prisma.knowledgeObject.create({
    data: {
      type: 'article',
      title: `İşçi Çalışma İzinleri-${UNIQUE_TAG}`,
      content: `Çalışma izni başvuru süreçleri ve gereken belgeler-${UNIQUE_TAG}`,
      status: 'published', isDemo: false, verificationStatus: 'unverified',
      metadata: '{}', embedding: '',
      categoryId: catIstihdam.id,
    },
  })

  await prisma.knowledgeObject.create({
    data: {
      type: 'article',
      title: `Draft KO-${UNIQUE_TAG}`,
      content: `Bu KO yayınlanmamıştır-${UNIQUE_TAG}`,
      status: 'draft', isDemo: false, verificationStatus: 'unverified',
      metadata: '{}', embedding: '',
      categoryId: catGirisim.id,
    },
  })

  await prisma.knowledgeObject.create({
    data: {
      type: 'article',
      title: `Demo KO-${UNIQUE_TAG}`,
      content: `Bu KO demodur-${UNIQUE_TAG}`,
      status: 'published', isDemo: true, verificationStatus: 'unverified',
      metadata: '{}', embedding: '',
      categoryId: catGirisim.id,
    },
  })

  await prisma.knowledgeObject.create({
    data: {
      code: 'ONLY-CATEGORY-CODE',
      type: 'article',
      title: 'Yalnız Kategori Kaydı',
      content: 'Bu içerikte arama belirteci bulunmaz.',
      status: 'published', isDemo: false, verificationStatus: 'verified',
      metadata: '{}', embedding: '',
      categoryId: catOnly.id,
    },
  })

  await prisma.knowledgeObject.create({
    data: {
      type: 'article',
      title: `Source Only KO-${UNIQUE_TAG}`,
      content: `Sadece source title'da geçen terim-${UNIQUE_TAG}`,
      status: 'published', isDemo: false, verificationStatus: 'unverified',
      metadata: '{}', embedding: '',
    },
  })
  await prisma.knowledgeObjectSource.create({ data: { koId: ko3.id, sourceId: srcKosgeb.id } })

  retriever = new LexicalKnowledgeRetriever(prisma)
})

afterAll(async () => {
  try {
    if (prisma) {
      await prisma.$disconnect()
    }
  } finally {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true })
    }
  }
})

describe('1. Exact code match', () => {
  it('CUR-001-01-xxx exact code → rank 1', async () => {
    const results = await retriever.retrieve({ text: `CUR-001-01-${UNIQUE_TAG}` })
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].code).toContain('CUR-001-01')
    expect(results[0].score).toBeGreaterThanOrEqual(100)
  })
})

describe('2. Turkish lowercase title match', () => {
  it('query şirket → finds Şirket title KO', async () => {
    const results = await retriever.retrieve({ text: 'şirket' })
    const found = results.some(r => r.title.includes('Şirket'))
    expect(found).toBe(true)
  })
})

describe('3. Turkish İ/i lowercase match', () => {
  it('query ihracat → finds İhracat title KO', async () => {
    const results = await retriever.retrieve({ text: 'ihracat' })
    const found = results.some(r => r.title.includes('İhracat'))
    expect(found).toBe(true)
  })
})

describe('4. Category-only match', () => {
  it('token found only in Category.name → retrieves the KO', async () => {
    const results = await retriever.retrieve({ text: CATEGORY_ONLY_TOKEN })
    const found = results.some(r => r.code === 'ONLY-CATEGORY-CODE')
    expect(found).toBe(true)
  })
})

describe('5. Source-title-only match', () => {
  it('query kosgeb-xxx → found via source title', async () => {
    const results = await retriever.retrieve({ text: `KOSGEB-${UNIQUE_TAG}` })
    const found = results.some(r => r.code?.includes('IHRACAT'))
    expect(found).toBe(true)
  })
})

describe('6. Draft and demo excluded', () => {
  it('draft KO not returned', async () => {
    const results = await retriever.retrieve({ text: 'yayınlanmamış' })
    const found = results.some(r => r.title.includes('Draft'))
    expect(found).toBe(false)
  })

  it('demo KO not returned', async () => {
    const results = await retriever.retrieve({ text: 'demodur' })
    const found = results.some(r => r.title.includes('Demo'))
    expect(found).toBe(false)
  })
})

describe('7. Priority over content flood', () => {
  it('exact-code KO not lost amidst many content-only matches', async () => {
    const manyContentKOs = Array.from({ length: 250 }, (_, i) => ({
      type: 'article' as const,
      title: `Content Flood ${i}-${UNIQUE_TAG}`,
      content: `ortak terim-${UNIQUE_TAG}.`,
      status: 'published' as const,
      isDemo: false,
      verificationStatus: 'unverified' as const,
      metadata: '{}',
      embedding: '',
    }))
    for (const ko of manyContentKOs) {
      await prisma.knowledgeObject.create({ data: ko })
    }

    const results = await retriever.retrieve({
      text: `SIRKET-KURULUM-${UNIQUE_TAG} ortak terim-${UNIQUE_TAG}`,
    })
    const found = results.some(r => r.code?.includes('SIRKET-KURULUM'))
    expect(found).toBe(true)
  })
})

describe('8. Deterministic ordering', () => {
  it('same query returns same order on repeat', async () => {
    const results1 = await retriever.retrieve({ text: 'şirket' })
    const results2 = await retriever.retrieve({ text: 'şirket' })
    expect(results1.map(r => r.id)).toEqual(results2.map(r => r.id))
  })

  it('published + isDemo:false filter enforced', async () => {
    const results = await retriever.retrieve({ text: UNIQUE_TAG })
    for (const r of results) {
      expect(r).not.toHaveProperty('isDemo', true)
    }
  })
})
