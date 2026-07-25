// phase1-tests.ts – Tests for KnowledgeObject hardening Phase 1
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test1_totalCount() {
  const count = await prisma.knowledgeObject.count()
  const passed = count === 600
  console.log(`[TEST 1] Total KO count: ${count} → ${passed ? '✅ PASS' : '❌ FAIL (expected 600)'}`)
  return passed
}

async function test2_allDemo() {
  const total = await prisma.knowledgeObject.count()
  const demo = await prisma.knowledgeObject.count({ where: { isDemo: true } })
  const passed = demo === total
  console.log(`[TEST 2] isDemo=true: ${demo}/${total} → ${passed ? '✅ PASS' : '❌ FAIL'}`)
  return passed
}

async function test3_codesUnique() {
  const total = await prisma.knowledgeObject.count({ where: { code: { not: null } } })
  const all = await prisma.knowledgeObject.findMany({ select: { code: true } })
  const codes = all.map(k => k.code).filter(Boolean) as string[]
  const unique = new Set(codes)
  const passed = total === 600 && codes.length === unique.size
  console.log(`[TEST 3] Codes: ${codes.length} total, ${unique.size} unique → ${passed ? '✅ PASS' : '❌ FAIL'}`)
  if (!passed) {
    const dupes = codes.filter((c, i) => codes.indexOf(c) !== i)
    console.log(`  Duplicates: ${dupes.join(', ')}`)
  }
  return passed
}

async function test4_slugsUnique() {
  const all = await prisma.knowledgeObject.findMany({ select: { slug: true } })
  const slugs = all.map(k => k.slug).filter(Boolean) as string[]
  const unique = new Set(slugs)
  const total = slugs.length
  const passed = total === 600 && total === unique.size
  console.log(`[TEST 4] Slugs: ${total} total, ${unique.size} unique → ${passed ? '✅ PASS' : '❌ FAIL'}`)
  return passed
}

async function test5_listingWorks() {
  try {
    const result = await prisma.knowledgeObject.findMany({
      where: { isDemo: true },
      take: 5,
      orderBy: { id: 'asc' }
    })
    const demoCount = result.filter(k => k.isDemo).length
    const passed = result.length === 5 && demoCount === 5
    console.log(`[TEST 5] Listing (demo filter): ${result.length} results, ${demoCount} demo → ${passed ? '✅ PASS' : '❌ FAIL'}`)
    return passed
  } catch (e: any) {
    console.log(`[TEST 5] Listing failed: ${e.message} → ❌ FAIL`)
    return false
  }
}

async function test6_searchWorks() {
  try {
    const result = await prisma.knowledgeObject.findMany({
      where: {
        OR: [
          { title: { contains: 'maliyet' } },
          { content: { contains: 'maliyet' } }
        ]
      },
      take: 10
    })
    const passed = result.length > 0
    console.log(`[TEST 6] Search 'maliyet': ${result.length} results → ${passed ? '✅ PASS' : '❌ FAIL'}`)
    if (result.length > 0) {
      console.log(`  Sample: ${result[0].title} (demo=${result[0].isDemo})`)
    }
    return passed
  } catch (e: any) {
    console.log(`[TEST 6] Search failed: ${e.message} → ❌ FAIL`)
    return false
  }
}

async function test7_otherTablesUnaffected() {
  try {
    const courses = await prisma.course.count()
    const lessons = await prisma.lesson.count()
    const mentorSessions = await prisma.mentorSession.count()

    const passed = courses >= 3 && lessons >= 0
    console.log(`[TEST 7] Other tables: Courses=${courses}, Lessons=${lessons}, MentorSessions=${mentorSessions} → ${passed ? '✅ PASS (unaffected)' : '⚠️  WARN'}`)
    return passed
  } catch (e: any) {
    console.log(`[TEST 7] Error: ${e.message} → ❌ FAIL`)
    return false
  }
}

async function main() {
  console.log('=== Phase 1 Test Suite ===\n')
  const results = await Promise.all([
    test1_totalCount(),
    test2_allDemo(),
    test3_codesUnique(),
    test4_slugsUnique(),
    test5_listingWorks(),
    test6_searchWorks(),
    test7_otherTablesUnaffected()
  ])

  const passed = results.filter(Boolean).length
  const total = results.length

  console.log(`\n=== Summary ===`)
  console.log(`${passed}/${total} tests passed`)

  if (passed === total) {
    console.log('✅ All tests passed – Phase 1 complete')
  } else {
    console.log('⚠️  Some tests failed – review above')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())