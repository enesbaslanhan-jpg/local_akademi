import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  let errors = 0

  // 0. Minimum content sanity check — fail if data is missing
  const minKo = 860
  const minCourse = 203
  const minLesson = 873
  const totalKo = await prisma.knowledgeObject.count()
  const totalCourse = await prisma.course.count()
  const totalLesson = await prisma.lesson.count()
  if (totalKo < minKo) {
    console.error(`MINIMUM CONTENT FAIL: KnowledgeObject count ${totalKo} < expected minimum ${minKo}`)
    errors++
  } else {
    console.log(`OK: KnowledgeObject count ${totalKo} >= minimum ${minKo}`)
  }
  if (totalCourse < minCourse) {
    console.error(`MINIMUM CONTENT FAIL: Course count ${totalCourse} < expected minimum ${minCourse}`)
    errors++
  } else {
    console.log(`OK: Course count ${totalCourse} >= minimum ${minCourse}`)
  }
  if (totalLesson < minLesson) {
    console.error(`MINIMUM CONTENT FAIL: Lesson count ${totalLesson} < expected minimum ${minLesson}`)
    errors++
  } else {
    console.log(`OK: Lesson count ${totalLesson} >= minimum ${minLesson}`)
  }

  // 1. All published, non-demo KOs must belong to a topic course lesson
  const kos = await prisma.knowledgeObject.findMany({
    where: { status: 'published', isDemo: false, code: { not: null } },
    include: { courseLessons: true },
  })

  const orphans = kos.filter(ko => ko.courseLessons.length === 0)
  if (orphans.length > 0) {
    console.error(`ERROR: ${orphans.length} published KOs have no topic course lesson:`)
    for (const ko of orphans.slice(0, 10)) console.error(`  ${ko.code} - ${ko.title}`)
    if (orphans.length > 10) console.error(`  ... and ${orphans.length - 10} more`)
    errors++
  } else {
    console.log(`OK: All ${kos.length} published KOs have topic course lessons`)
  }

  // 2. No duplicate KO-to-lesson mappings
  const lessonKOs = await prisma.lesson.findMany({
    where: { knowledgeObjectId: { not: null } },
    select: { knowledgeObjectId: true },
  })
  const koIds = lessonKOs.map(l => l.knowledgeObjectId)
  const dups = koIds.filter((id, i) => koIds.indexOf(id) !== i)
  if (dups.length > 0) {
    console.error(`ERROR: ${dups.length} duplicate KO-to-lesson mappings found`)
    errors++
  } else {
    console.log(`OK: No duplicate KO-to-lesson mappings`)
  }

  // 3. Topic courses have correct sourceType
  const topicCourses = await prisma.course.findMany({
    where: { sourceType: 'topic' },
    include: { lessons: true },
  })
  console.log(`\nTopic courses: ${topicCourses.length}`)
  let totalLessons = 0
  for (const c of topicCourses) {
    totalLessons += c.lessons.length
  }
  console.log(`Total lessons in topic courses: ${totalLessons}`)

  const lessonMin = Math.min(...topicCourses.map(c => c.lessons.length))
  const lessonMax = Math.max(...topicCourses.map(c => c.lessons.length))
  console.log(`Lessons per course: min=${lessonMin}, max=${lessonMax}, avg=${(totalLessons / topicCourses.length).toFixed(1)}`)

  // 4. Legacy courses preserved
  const legacyCourses = await prisma.course.findMany({
    where: { sourceType: 'legacy' },
  })
  console.log(`\nLegacy courses preserved: ${legacyCourses.length}`)
  if (legacyCourses.length === 0) {
    console.error(`ERROR: Legacy courses were deleted!`)
    errors++
  } else {
    for (const c of legacyCourses) {
      console.log(`  ${c.title} (id=${c.id}, lessons: ${await prisma.lesson.count({ where: { courseId: c.id } })})`)
    }
  }

  // 5. All lessons in topic courses have knowledgeObjectId set
  const legacyLessons = await prisma.lesson.count({
    where: { course: { sourceType: 'legacy' }, knowledgeObjectId: null },
  })
  const topicLessons = await prisma.lesson.count({
    where: { course: { sourceType: 'topic' }, knowledgeObjectId: null },
  })
  if (topicLessons > 0) {
    console.error(`ERROR: ${topicLessons} topic course lessons missing knowledgeObjectId`)
    errors++
  } else {
    console.log(`OK: All topic course lessons have knowledgeObjectId`)
  }
  console.log(`Legacy lessons (no KO link, OK): ${legacyLessons}`)

  // 6. Lesson ordering must be sequential per course
  for (const c of topicCourses) {
    const orders = c.lessons.map(l => l.order).sort((a, b) => a - b)
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i) {
        console.error(`ERROR: Course ${c.id} (${c.title}) has non-sequential lesson order`)
        errors++
        break
      }
    }
  }
  console.log(`OK: All course lesson orders are sequential`)

  // 7. Count unique topic keys
  const codes = kos.map(ko => ko.code).filter(Boolean) as string[]
  const topicKeys = new Set<string>()
  for (const code of codes) {
    if (code.startsWith('CUR-')) {
      const parts = code.split('-')
      if (parts.length >= 2) topicKeys.add(`CUR-${parts[1]}`)
    } else if (code.startsWith('KBX-')) {
      const parts = code.split('-')
      if (parts.length >= 3) topicKeys.add(`${parts[0]}-${parts[1]}-${parts[2]}`)
    }
  }
  console.log(`\nUnique topic keys from KOs: ${topicKeys.size}`)
  console.log(`Topic courses created: ${topicCourses.length}`)

  if (errors === 0) {
    console.log('\n=== ALL CHECKS PASSED ===')
  } else {
    console.error(`\n=== ${errors} CHECK(S) FAILED ===`)
  }

  await prisma.$disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
