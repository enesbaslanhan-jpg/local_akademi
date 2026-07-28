import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const acceptedStandards = new Set(['adaptive-operational-v2-scaled', 'adaptive-operational-v1', 'knowledge-v2'])

function metadata(raw: string) {
  try { return JSON.parse(raw) as Record<string, unknown> } catch { return {} }
}

function fiveGrams(content: string) {
  const words = content
    .toLocaleLowerCase('tr-TR')
    .replace(/\d[\d.,]*/g, '#')
    .replace(/[^a-zçğıöşü#\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const result = new Set<string>()
  for (let index = 0; index < words.length - 4; index++) result.add(words.slice(index, index + 5).join(' '))
  return result
}

function jaccard(left: Set<string>, right: Set<string>) {
  let intersection = 0
  for (const value of left) if (right.has(value)) intersection += 1
  return intersection / (left.size + right.size - intersection)
}

async function main() {
  const failures: string[] = []
  const allCourseCount = await prisma.course.count()
  if (allCourseCount !== 204) failures.push(`all-course-count:${allCourseCount}`)
  const courses = await prisma.course.findMany({
    where: { sourceType: 'topic' },
    include: {
      lessons: {
        include: {
          knowledgeObject: {
            include: {
              sources: { include: { source: true } },
              quizzes: { include: { questions: true } },
              flashcards: true,
              taskTemplates: true,
            },
          },
        },
      },
    },
  })
  if (courses.length !== 200) failures.push(`topic-course-count:${courses.length}`)
  const kos = new Map<number, NonNullable<(typeof courses)[number]['lessons'][number]['knowledgeObject']>>()
  for (const course of courses) {
    if (!course.published) failures.push(`course-unpublished:${course.id}`)
    if (!course.description || course.description.length < 100) failures.push(`course-description:${course.id}`)
    let outcomes: unknown = []
    try { outcomes = JSON.parse(course.outcomes) } catch { failures.push(`course-outcomes-json:${course.id}`) }
    if (!Array.isArray(outcomes) || outcomes.length < 3) failures.push(`course-outcomes:${course.id}`)
    for (const lesson of course.lessons) {
      if (!lesson.knowledgeObject) failures.push(`lesson-ko-null:${lesson.id}`)
      else kos.set(lesson.knowledgeObject.id, lesson.knowledgeObject)
    }
  }
  if (kos.size !== 840) failures.push(`unique-ko-count:${kos.size}`)

  const hashes = new Map<string, string[]>()
  const archetypes = new Map<string, number>()
  let maximumAdjacentSimilarity = 0
  let maximumPair = ''
  let scaled = 0
  let preserved = 0
  for (const ko of kos.values()) {
    const meta = metadata(ko.metadata)
    const standard = String(meta.qualityStandard || '')
    if (!acceptedStandards.has(standard)) failures.push(`${ko.code}:quality-standard:${standard}`)
    if (standard === 'adaptive-operational-v2-scaled') scaled += 1
    else preserved += 1
    if (ko.status !== 'published' || ko.verificationStatus !== 'verified') failures.push(`${ko.code}:publication`)
    const isScaled = standard === 'adaptive-operational-v2-scaled'
    if (isScaled && ko.content.length < 2500) failures.push(`${ko.code}:short:${ko.content.length}`)
    if (standard === 'adaptive-operational-v1' && ko.content.length < 2500) failures.push(`${ko.code}:pilot-short:${ko.content.length}`)
    if (standard === 'knowledge-v2' && ko.content.length < 1800) failures.push(`${ko.code}:knowledge-v2-short:${ko.content.length}`)
    if (isScaled && !ko.content.includes('## Kaynakça')) failures.push(`${ko.code}:bibliography`)
    if (/lorem ipsum|placeholder|sorusu\s*[1-9]|cevap\s*[a-d]/i.test(ko.content)) failures.push(`${ko.code}:placeholder`)
    if (isScaled) {
      if (!ko.content.includes('temsili vaka')) failures.push(`${ko.code}:case-label`)
      if (!meta.contentArchetype || !meta.levelRole) failures.push(`${ko.code}:archetype-level`)
      const archetype = String(meta.contentArchetype)
      archetypes.set(archetype, (archetypes.get(archetype) || 0) + 1)
    }
    if (ko.sources.length < 2) failures.push(`${ko.code}:sources:${ko.sources.length}`)
    if (isScaled && ko.sources.filter(link => link.source.authorityLevel === 'high').length < 2) {
      failures.push(`${ko.code}:high-authority-sources`)
    }
    const quizzes = ko.quizzes.filter(quiz => quiz.status === 'published')
    if (quizzes.length !== 1) failures.push(`${ko.code}:published-quiz-count:${quizzes.length}`)
    const questions = quizzes[0]?.questions || []
    const minimumQuestions = isScaled || standard === 'adaptive-operational-v1' ? 5 : 3
    if (questions.length < minimumQuestions) failures.push(`${ko.code}:questions:${questions.length}`)
    const explanationMinimum = isScaled ? 40 : 15
    if (questions.some(question => !question.explanation || question.explanation.length < explanationMinimum)) failures.push(`${ko.code}:quiz-explanation`)
    const cards = ko.flashcards.filter(card => card.status === 'published')
    const minimumCards = isScaled || standard === 'adaptive-operational-v1' ? 6 : 5
    if (cards.length < minimumCards) failures.push(`${ko.code}:cards:${cards.length}`)
    if (isScaled && cards.some(card => card.front.length < 18 || card.back.length < 35 || !card.hint)) failures.push(`${ko.code}:card-quality`)
    const task = ko.taskTemplates[0]
    if (!task?.instructions || !task.exampleOutput || !task.checklist || !task.rubric) failures.push(`${ko.code}:task-quality`)
    const hash = createHash('sha256').update(ko.content).digest('hex')
    hashes.set(hash, [...(hashes.get(hash) || []), ko.code])
  }
  const duplicateGroups = [...hashes.values()].filter(codes => codes.length > 1)
  if (duplicateGroups.length) failures.push(`duplicate-content-groups:${duplicateGroups.length}`)
  for (const course of courses) {
    const ordered = [...course.lessons].sort((left, right) => left.order - right.order)
    for (let index = 1; index < ordered.length; index++) {
      const previous = ordered[index - 1].knowledgeObject
      const current = ordered[index].knowledgeObject
      if (!previous || !current) continue
      const similarity = jaccard(fiveGrams(previous.content), fiveGrams(current.content))
      if (similarity > maximumAdjacentSimilarity) {
        maximumAdjacentSimilarity = similarity
        maximumPair = `${previous.code}/${current.code}`
      }
    }
  }
  if (maximumAdjacentSimilarity > 0.72) failures.push(`adjacent-similarity:${maximumAdjacentSimilarity.toFixed(4)}:${maximumPair}`)
  if (scaled < 820) failures.push(`scaled-too-low:${scaled}`)
  if (archetypes.size < 10) failures.push(`archetype-variety:${archetypes.size}`)

  const legacyCourses = await prisma.course.findMany({
    where: { sourceType: 'legacy' },
    include: { lessons: { orderBy: [{ order: 'asc' }, { id: 'asc' }], include: { knowledgeObject: true } } },
  })
  if (legacyCourses.length !== 3) failures.push(`legacy-course-count:${legacyCourses.length}`)
  for (const course of legacyCourses) {
    if (!course.published || course.lessons.length !== 10) failures.push(`legacy-path:${course.id}:${course.lessons.length}`)
    if (course.lessons.some(lesson => !lesson.knowledgeObjectId || !lesson.knowledgeObject)) failures.push(`legacy-null-ko:${course.id}`)
    if (new Set(course.lessons.map(lesson => lesson.knowledgeObjectId)).size !== course.lessons.length) failures.push(`legacy-duplicate-ko:${course.id}`)
    if (course.lessons.some((lesson, index) => lesson.order !== index + 1)) failures.push(`legacy-order:${course.id}`)
    if (course.lessons.some(lesson => /HTML Temelleri|Değişkenler ve Veri Tipleri|Koşullu İfadeler/i.test(lesson.title))) failures.push(`legacy-junk:${course.id}`)
    if (!course.description || course.description.length < 120) failures.push(`legacy-description:${course.id}`)
  }
  const curatedPilot = await prisma.course.count({ where: { sourceType: 'curated-operational-pilot-v1', published: true } })
  if (curatedPilot !== 1) failures.push(`curated-pilot-count:${curatedPilot}`)

  console.log(`[VERIFY-ADAPTIVE-V2] Tüm kurslar: ${allCourseCount}; topic: ${courses.length}; küratörlü eski yol: ${legacyCourses.length}; pilot: ${curatedPilot}`)
  console.log(`[VERIFY-ADAPTIVE-V2] KO: ${kos.size}; scaled: ${scaled}; korunan: ${preserved}`)
  console.log(`[VERIFY-ADAPTIVE-V2] Arketip: ${archetypes.size} ${JSON.stringify(Object.fromEntries(archetypes))}`)
  console.log(`[VERIFY-ADAPTIVE-V2] Benzersiz içerik: ${hashes.size}/${kos.size}`)
  console.log(`[VERIFY-ADAPTIVE-V2] En yüksek komşu seviye 5-gram benzerliği: ${(maximumAdjacentSimilarity * 100).toFixed(2)}% (${maximumPair})`)
  if (failures.length) {
    console.error(`[VERIFY-ADAPTIVE-V2] BAŞARISIZ (${failures.length})`)
    failures.slice(0, 100).forEach(failure => console.error(`- ${failure}`))
    process.exitCode = 1
    return
  }
  console.log('[VERIFY-ADAPTIVE-V2] BAŞARILI — bütün topic kursları kalite kapılarını geçti.')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
