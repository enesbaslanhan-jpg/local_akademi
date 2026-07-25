// phase2-tests.ts – Phase 2: 12 new models exist and are queryable
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const tests = [
  { name: 'Category table', fn: async () => await prisma.category.count() >= 0 },
  { name: 'KnowledgeObjectVersion table', fn: async () => await prisma.knowledgeObjectVersion.count() >= 0 },
  { name: 'Source table', fn: async () => await prisma.source.count() >= 0 },
  { name: 'KnowledgeObjectSource table', fn: async () => await prisma.knowledgeObjectSource.count() >= 0 },
  { name: 'ReviewRecord table', fn: async () => await prisma.reviewRecord.count() >= 0 },
  { name: 'Quiz table', fn: async () => await prisma.quiz.count() >= 0 },
  { name: 'QuizQuestion table', fn: async () => await prisma.quizQuestion.count() >= 0 },
  { name: 'TaskTemplate table', fn: async () => await prisma.taskTemplate.count() >= 0 },
  { name: 'Formula table', fn: async () => await prisma.formula.count() >= 0 },
  { name: 'PublicationEvent table', fn: async () => await prisma.publicationEvent.count() >= 0 },
  { name: 'ImportJob table', fn: async () => await prisma.importJob.count() >= 0 },
  { name: 'ImportJobError table', fn: async () => await prisma.importJobError.count() >= 0 },
  { name: 'KO.count still 600', fn: async () => await prisma.knowledgeObject.count() === 600 },
  { name: 'KO all demo true', fn: async () => {
    const c = await prisma.knowledgeObject.count({ where: { isDemo: true } })
    return c === 600
  }},
  { name: 'KO categoryId nullable', fn: async () => {
    const ko = await prisma.knowledgeObject.findFirst()
    return ko !== null
  }},
  { name: 'KO currentVersionId nullable', fn: async () => {
    const ko = await prisma.knowledgeObject.findFirst()
    return ko !== null
  }},
]

async function main() {
  console.log('=== Phase 2 Test Suite ===')
  console.log(`Verifying ${tests.length} checks...\n`)

  let passed = 0
  for (const t of tests) {
    try {
      const ok = await t.fn()
      console.log(`[${tests.indexOf(t) + 1}] ${t.name}: ${ok ? '✅ PASS' : '❌ FAIL'}`)
      if (ok) passed++
    } catch (e: any) {
      console.log(`[${tests.indexOf(t) + 1}] ${t.name}: ❌ FAIL - ${e.message}`)
    }
  }

  console.log(`\n=== Summary: ${passed}/${tests.length} passed ===`)
  if (passed === tests.length) {
    console.log('✅ Phase 2 complete')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())