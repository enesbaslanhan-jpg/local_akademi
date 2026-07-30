import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function main() {
  const courses = await prisma.course.findMany({
    where: { sourceType: 'phase6-financial-lab' },
    include: {
      lessons: {
        include: {
          knowledgeObject: {
            include: {
              sources: true,
              flashcards: { where: { status: 'published' } },
              quizzes: { include: { questions: true } },
              taskTemplates: true,
              videos: true,
              financialModels: true,
            },
          },
        },
      },
      financialCases: { include: { models: true } },
      financialModels: true,
    },
    orderBy: { sortOrder: 'asc' },
  })

  assert(courses.length === 24, `24 Phase 6 kursu bekleniyordu; ${courses.length} bulundu.`)
  const slugs = new Set<string>()
  for (const course of courses) {
    assert(course.published, `${course.title}: kurs yayınlanmamış.`)
    assert(course.slug && !slugs.has(course.slug), `${course.title}: slug eksik veya tekrarlı.`)
    slugs.add(course.slug)
    assert(course.lessons.length === 3, `${course.title}: 3 ders yerine ${course.lessons.length}.`)
    assert(course.financialCases.length === 1, `${course.title}: tam bir vaka bekleniyor.`)
    assert(course.financialCases[0].models.length >= 1, `${course.title}: vaka-model bağlantısı eksik.`)
    assert(course.financialModels.length >= 1, `${course.title}: kurs-model bağlantısı eksik.`)
    const metadata = JSON.parse(course.metadata)
    assert(metadata.modelLab && metadata.outputDashboard && metadata.mentorFlow && metadata.sourceMap, `${course.title}: paket metadata eksik.`)
    for (const lesson of course.lessons) {
      const ko = lesson.knowledgeObject
      assert(ko, `${course.title}: KO bağlantısız ders.`)
      assert(ko.status === 'published' && ko.verificationStatus === 'verified', `${ko.title}: yayın/doğrulama eksik.`)
      assert(ko.content.length >= 2500, `${ko.title}: içerik kısa (${ko.content.length}).`)
      assert(ko.sources.length >= 2, `${ko.title}: en az iki kaynak gerekli.`)
      assert(ko.flashcards.length === 3, `${ko.title}: üç çift yüzlü kart gerekli.`)
      assert(ko.financialModels.length >= 1, `${ko.title}: model bağlantısı eksik.`)
    }
    const kos = course.lessons.map(lesson => lesson.knowledgeObject!)
    assert(kos.some(ko => ko.quizzes.some(quiz => quiz.questions.length >= 3)), `${course.title}: öğretici quiz eksik.`)
    assert(kos.some(ko => ko.taskTemplates.length >= 1), `${course.title}: uygulama görevi eksik.`)
    assert(kos.some(ko => ko.videos?.status === 'script_ready'), `${course.title}: video senaryosu eksik.`)
  }

  const counts = {
    courses: courses.length,
    knowledgeObjects: courses.flatMap(course => course.lessons).length,
    cases: courses.flatMap(course => course.financialCases).length,
    models: await prisma.financialModel.count({ where: { status: 'active' } }),
    videos: courses.flatMap(course => course.lessons).filter(lesson => lesson.knowledgeObject?.videos).length,
  }
  assert(counts.knowledgeObjects === 72, `72 KO bekleniyordu; ${counts.knowledgeObjects} bulundu.`)
  assert(counts.cases === 24, `24 vaka bekleniyordu; ${counts.cases} bulundu.`)
  assert(counts.models === 24, `24 model bekleniyordu; ${counts.models} bulundu.`)
  assert(counts.videos === 24, `24 video senaryosu bekleniyordu; ${counts.videos} bulundu.`)
  console.log(`PHASE 6 VERIFIED — ${counts.models} model · ${counts.courses} kurs · ${counts.knowledgeObjects} KO · ${counts.cases} vaka · ${counts.videos} video senaryosu`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
