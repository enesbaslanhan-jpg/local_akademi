import { PrismaClient } from '@prisma/client'
import {
  compareCompiledCourses,
  compileCourseQualityDocument,
  type CourseQualityDocument,
} from '../src/lib/course-quality'

const prisma = new PrismaClient()
const MAX_SIMILARITY = 0.25

function json(raw: string): Record<string, any> {
  try { return JSON.parse(raw) } catch { return {} }
}

async function main() {
  const failures: string[] = []
  const courses = await prisma.course.findMany({
    where: { sourceType: 'topic' },
    orderBy: { id: 'asc' },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: {
          knowledgeObject: {
            include: {
              sources: { include: { source: true } },
              currentVersion: true,
              quizzes: { where: { status: 'published' }, include: { questions: true } },
              flashcards: { where: { status: 'published' } },
              taskTemplates: true,
            },
          },
        },
      },
    },
  })
  if (courses.length !== 200) failures.push(`topic-course-count:${courses.length}`)

  const documents: CourseQualityDocument[] = []
  let koCount = 0
  let visualCount = 0
  for (const course of courses) {
    const outcomes = json(course.outcomes) as unknown
    if (!course.published) failures.push(`${course.id}:unpublished`)
    if (!Array.isArray(outcomes) || outcomes.length < 3) failures.push(`${course.id}:outcomes`)
    if (course.lessons.length < 3) failures.push(`${course.id}:lesson-count:${course.lessons.length}`)
    const kos = course.lessons.map(lesson => lesson.knowledgeObject).filter(Boolean)
    const firstMeta = json(kos[0]?.metadata || '{}')
    const purpose = String(firstMeta.coursePurpose || '')
    if (purpose.length < 120) failures.push(`${course.id}:purpose`)

    for (const ko of kos) {
      koCount += 1
      const meta = json(ko!.metadata)
      if (meta.qualityStandard !== 'course-quality-v3') failures.push(`${ko!.code}:standard`)
      if (!meta.coursePurpose || !meta.targetRole || !meta.businessStage || !meta.solvedProblem) failures.push(`${ko!.code}:metadata`)
      if (!ko!.currentVersion) failures.push(`${ko!.code}:current-version`)
      if (ko!.status !== 'published' || ko!.verificationStatus !== 'verified' || ko!.isDemo) failures.push(`${ko!.code}:publication`)
      if (ko!.content.length < 2200) failures.push(`${ko!.code}:content-length:${ko!.content.length}`)
      if (!ko!.content.includes('## Kaynakça')) failures.push(`${ko!.code}:bibliography`)
      if (!/!\[[^\]]+\]\(\/academy-visuals\/course-v3\/course-\d+\.svg\)/.test(ko!.content)) failures.push(`${ko!.code}:visual`)
      else visualCount += 1
      if (ko!.sources.length < 2) failures.push(`${ko!.code}:sources:${ko!.sources.length}`)
      if (ko!.sources.some(row => !row.source.title || !row.source.authorityLevel)) failures.push(`${ko!.code}:source-metadata`)
      if (!ko!.sources.some(row => Boolean(row.source.url))) failures.push(`${ko!.code}:source-url`)
      if (ko!.quizzes.length !== 1 || ko!.quizzes[0].questions.length !== 5) failures.push(`${ko!.code}:quiz`)
      if (ko!.quizzes[0]?.questions.some(question => question.explanation.length < 55)) failures.push(`${ko!.code}:quiz-explanation`)
      if (ko!.quizzes[0]?.questions.some(question => {
        const options = json(question.options) as unknown
        return question.questionText.length < 35 ||
          !Array.isArray(options) ||
          options.length !== 4 ||
          !options.map(String).includes(question.correctAnswer)
      })) failures.push(`${ko!.code}:quiz-structure`)
      if (ko!.flashcards.length !== 6 || ko!.flashcards.some(card => !card.hint || card.front.length < 18 || card.back.length < 35)) failures.push(`${ko!.code}:flashcards`)
      const task = ko!.taskTemplates[0]
      if (!task?.instructions || !task.exampleOutput || !task.checklist || !task.rubric) failures.push(`${ko!.code}:task`)
    }

    documents.push({
      id: course.id,
      title: course.title,
      purpose,
      outcomes: Array.isArray(outcomes) ? outcomes.map(String) : [],
      koIds: kos.map(ko => ko!.id),
      lessonContents: kos.map(ko => ko!.content),
      quizTexts: kos.flatMap(ko => ko!.quizzes.flatMap(quiz => quiz.questions.map(question =>
        `${question.questionText}\n${question.options}\n${question.correctAnswer}\n${question.explanation}`,
      ))),
      taskTexts: kos.flatMap(ko => ko!.taskTemplates.map(task =>
        `${task.title}\n${task.instructions}\n${task.exampleOutput}\n${task.checklist}\n${task.rubric}`,
      )),
      visualKeys: [...new Set(kos.map(ko => String(json(ko!.metadata).visualAsset || '')).filter(Boolean))],
    })
  }

  const compiledDocuments = documents.map(compileCourseQualityDocument)
  let max = { score: 0, left: '', right: '', breakdown: null as ReturnType<typeof compareCompiledCourses> | null }
  let aboveLimit = 0
  const scores: number[] = []
  const similarityViolations: Array<{ leftId: number; left: string; rightId: number; right: string; score: number }> = []
  const violationCounts = new Map<number, { title: string; count: number }>()
  for (let leftIndex = 0; leftIndex < compiledDocuments.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < compiledDocuments.length; rightIndex += 1) {
      const left = compiledDocuments[leftIndex]
      const right = compiledDocuments[rightIndex]
      const breakdown = compareCompiledCourses(left, right)
      scores.push(breakdown.total)
      if (breakdown.total > max.score) max = { score: breakdown.total, left: left.source.title, right: right.source.title, breakdown }
      if (breakdown.total > MAX_SIMILARITY) {
        aboveLimit += 1
        similarityViolations.push({
          leftId: left.source.id,
          left: left.source.title,
          rightId: right.source.id,
          right: right.source.title,
          score: breakdown.total,
        })
        for (const course of [left.source, right.source]) {
          const current = violationCounts.get(course.id)
          violationCounts.set(course.id, { title: course.title, count: (current?.count || 0) + 1 })
        }
        failures.push(`similarity:${left.source.id}/${right.source.id}:${(breakdown.total * 100).toFixed(2)}%`)
      }
      if (breakdown.koOverlap > MAX_SIMILARITY) failures.push(`ko-overlap:${left.source.id}/${right.source.id}:${breakdown.koOverlap}`)
    }
  }
  scores.sort((left, right) => left - right)
  const median = scores[Math.floor(scores.length / 2)] || 0

  const visualFiles = await Promise.all(documents.map(async document => {
    const path = `frontend/public/academy-visuals/course-v3/course-${document.id}.svg`
    try {
      await import('node:fs/promises').then(fs => fs.access(path))
      return true
    } catch {
      failures.push(`missing-visual-file:${path}`)
      return false
    }
  }))

  const allCourses = await prisma.course.groupBy({ by: ['sourceType'], _count: { _all: true } })
  console.log(`[COURSE-V3-VERIFY] topic courses=${courses.length}; knowledge objects=${koCount}; inline visuals=${visualCount}; visual files=${visualFiles.filter(Boolean).length}`)
  console.log(`[COURSE-V3-VERIFY] course types=${JSON.stringify(allCourses)}`)
  console.log(`[COURSE-V3-VERIFY] pairs=${scores.length}; above25=${aboveLimit}; median=${(median * 100).toFixed(2)}%; max=${(max.score * 100).toFixed(2)}% ${max.left} / ${max.right}`)
  if (max.breakdown) console.log(`[COURSE-V3-VERIFY] max breakdown=${JSON.stringify(max.breakdown)}`)
  if (similarityViolations.length) {
    const topPairs = similarityViolations.sort((left, right) => right.score - left.score).slice(0, 20)
    const topCourses = [...violationCounts.entries()]
      .sort((left, right) => right[1].count - left[1].count)
      .slice(0, 20)
    console.log(`[COURSE-V3-VERIFY] top violating pairs=${JSON.stringify(topPairs)}`)
    console.log(`[COURSE-V3-VERIFY] most repeated courses=${JSON.stringify(topCourses)}`)
  }
  console.log('[COURSE-V3-VERIFY] legacy and curated paths are navigation collections that reuse approved KOs; their overlap is reported as a documented structural exception, not a new content course.')

  if (failures.length) {
    console.error(`[COURSE-V3-VERIFY] FAILED (${failures.length})`)
    failures.slice(0, 100).forEach(failure => console.error(`- ${failure}`))
    process.exitCode = 1
    return
  }
  console.log('[COURSE-V3-VERIFY] PASS — all topic courses satisfy the V3 automated quality gate.')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
