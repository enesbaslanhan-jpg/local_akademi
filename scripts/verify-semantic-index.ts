import { PrismaClient } from '@prisma/client'
import {
  createKnowledgeRetriever,
  parseStoredEmbedding,
} from '../src/services/retrieval'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const rows = await prisma.knowledgeObject.findMany({
    where: { status: 'published', isDemo: false },
    select: { id: true, embedding: true },
    orderBy: { id: 'asc' },
  })
  const parsed = rows.map(row => ({
    id: row.id,
    vector: parseStoredEmbedding(row.embedding),
  }))
  const invalid = parsed.filter(row => !row.vector)
  const dimensions = Array.from(
    new Set(
      parsed
        .map(row => row.vector?.length)
        .filter((value): value is number => value !== undefined),
    ),
  ).sort((left, right) => left - right)

  const retriever = createKnowledgeRetriever(prisma, {
    ...process.env,
    RAG_RETRIEVAL_MODE: 'hybrid',
  })
  const results = await retriever.retrieve({
    text: 'nakit akışı yönetimi',
    maxResults: 3,
  })
  const semanticUsed = results.some(result =>
    result.matchedTerms.includes('semantic'),
  )
  const report = {
    ok:
      rows.length > 0 &&
      invalid.length === 0 &&
      dimensions.length === 1 &&
      semanticUsed,
    indexed: rows.length - invalid.length,
    eligible: rows.length,
    invalid: invalid.length,
    dimensions,
    semanticUsed,
    results: results.map(result => ({
      id: result.id,
      code: result.code,
      matchedTerms: result.matchedTerms,
    })),
    contentStoredInReport: false,
  }
  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) process.exitCode = 1
}

main()
  .catch(() => {
    console.error(
      JSON.stringify({
        ok: false,
        errorCode: 'SEMANTIC_INDEX_VERIFICATION_FAILED',
      }),
    )
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
