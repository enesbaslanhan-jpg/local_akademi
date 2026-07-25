import { PrismaClient } from '@prisma/client'
import { OllamaEmbeddingProvider } from '../src/services/retrieval'

const prisma = new PrismaClient()

function readLimit(args: string[]): number {
  const raw = args.find(arg => arg.startsWith('--limit='))
  const parsed = Number(raw?.split('=')[1])
  if (!Number.isFinite(parsed)) return 500
  return Math.max(1, Math.min(Math.floor(parsed), 5000))
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const force = args.includes('--force')
  const limit = readLimit(args)

  const rows = await prisma.knowledgeObject.findMany({
    where: {
      status: 'published',
      isDemo: false,
      ...(force
        ? {}
        : {
            embedding: { in: ['', '[]'] },
          }),
    },
    select: {
      id: true,
      code: true,
      title: true,
      content: true,
    },
    orderBy: { id: 'asc' },
    take: limit,
  })

  if (!apply) {
    console.log(
      JSON.stringify({
        mode: 'dry-run',
        eligible: rows.length,
        limit,
        force,
        contentStoredInLog: false,
      }),
    )
    return
  }

  const provider = new OllamaEmbeddingProvider()
  let indexed = 0
  let failed = 0
  const batchSize = 32
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize)
    try {
      const inputs = batch.map(row =>
        [
          row.code ? `Kod: ${row.code}` : '',
          `Başlık: ${row.title}`,
          row.content.slice(0, 1000),
        ]
          .filter(Boolean)
          .join('\n')
          .slice(0, 1600),
      )
      const vectors = await provider.embedMany(inputs)
      await prisma.$transaction(
        batch.map((row, index) =>
          prisma.knowledgeObject.update({
            where: { id: row.id },
            data: { embedding: JSON.stringify(vectors[index]) },
          }),
        ),
      )
      indexed += batch.length
      console.log(
        JSON.stringify({
          firstId: batch[0].id,
          lastId: batch.at(-1)?.id,
          status: 'indexed',
          count: batch.length,
          dimensions: vectors[0]?.length || 0,
        }),
      )
    } catch {
      failed += batch.length
      console.error(
        JSON.stringify({
          firstId: batch[0].id,
          lastId: batch.at(-1)?.id,
          status: 'failed',
          count: batch.length,
          errorCode: 'EMBEDDING_INDEX_FAILED',
        }),
      )
    }
  }

  console.log(
    JSON.stringify({
      mode: 'apply',
      total: rows.length,
      indexed,
      failed,
      contentStoredInLog: false,
    }),
  )
  if (failed > 0) process.exitCode = 1
}

main()
  .catch(() => {
    console.error(
      JSON.stringify({
        status: 'failed',
        errorCode: 'EMBEDDING_INDEX_FATAL',
      }),
    )
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
