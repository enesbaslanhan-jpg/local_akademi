import { PrismaClient } from '@prisma/client'
import { readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import {
  HybridKnowledgeRetriever,
  LexicalKnowledgeRetriever,
  OllamaEmbeddingProvider,
  SemanticKnowledgeRetriever,
} from '../src/services/retrieval'

type EvalCase = {
  id: string
  query: string
  expectedTitle: string
}

const root = resolve(import.meta.dirname, '..')
const fixturePath = join(root, 'tests', 'fixtures', 'hybrid-retrieval-eval.tr.json')
const reportPath = join(root, 'outputs', 'hybrid-rag-evaluation.json')
const prisma = new PrismaClient()

async function main(): Promise<void> {
  const cases = JSON.parse(readFileSync(fixturePath, 'utf8')) as EvalCase[]
  if (cases.length !== 50) throw new Error('RAG_EVAL_REQUIRES_50_CASES')

  const lexical = new LexicalKnowledgeRetriever(prisma)
  const semantic = new SemanticKnowledgeRetriever(
    prisma,
    new OllamaEmbeddingProvider(),
  )
  const hybrid = new HybridKnowledgeRetriever(lexical, semantic)
  let lexicalHits = 0
  let hybridHits = 0
  const failures: Array<{
    id: string
    lexicalHit: boolean
    hybridHit: boolean
  }> = []

  for (const item of cases) {
    const [lexicalRows, hybridRows] = await Promise.all([
      lexical.retrieve({ text: item.query, maxResults: 3 }),
      hybrid.retrieve({ text: item.query, maxResults: 3 }),
    ])
    const lexicalHit = lexicalRows.some(row => row.title === item.expectedTitle)
    const hybridHit = hybridRows.some(row => row.title === item.expectedTitle)
    if (lexicalHit) lexicalHits++
    if (hybridHit) hybridHits++
    if (!lexicalHit || !hybridHit) {
      failures.push({ id: item.id, lexicalHit, hybridHit })
    }
  }

  const expectedRows = await prisma.knowledgeObject.findMany({
    where: {
      status: 'published',
      isDemo: false,
      title: { in: cases.map(item => item.expectedTitle) },
    },
    select: { code: true },
    orderBy: { id: 'asc' },
  })
  const codes = Array.from(
    new Set(expectedRows.map(row => row.code).filter(Boolean)),
  ).slice(0, 50) as string[]
  let exactCodeHits = 0
  for (const code of codes) {
    const rows = await hybrid.retrieve({ text: code, maxResults: 3 })
    if (rows[0]?.code === code) exactCodeHits++
  }

  const lexicalHitAt3 = lexicalHits / cases.length
  const hybridHitAt3 = hybridHits / cases.length
  const exactCodeHitAt1 = codes.length > 0 ? exactCodeHits / codes.length : 0
  const gates = {
    noMaterialRegression: hybridHitAt3 >= lexicalHitAt3 - 0.02,
    minimumHybridHitAt3: hybridHitAt3 >= 0.8,
    exactCodePriority: exactCodeHitAt1 === 1,
  }
  const pass = Object.values(gates).every(Boolean)
  const report = {
    generatedAt: new Date().toISOString(),
    corpus: 'published_non_demo',
    caseCount: cases.length,
    queryLanguage: 'tr',
    topK: 3,
    lexicalHitAt3,
    hybridHitAt3,
    hybridDelta: hybridHitAt3 - lexicalHitAt3,
    exactCodeCases: codes.length,
    exactCodeHitAt1,
    gates,
    failedCaseIds: failures,
    queryTextStoredInReport: false,
    pass,
  }
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  if (!pass) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(JSON.stringify({
      pass: false,
      errorCode: error instanceof Error ? error.message : 'RAG_EVAL_FAILED',
    }))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
