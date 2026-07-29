import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { ALL_TOPIC_COURSE_IDS, CURRICULUM_V4 } from './lib/publishable-curriculum-v4.js'
import {
  buildContent,
  buildFlashcards,
  buildQuiz,
  buildTask,
  buildVisualSvg,
  curatedSources,
  topicProfile,
} from './lib/publishable-content-v4.js'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const now = new Date()
const STANDARD = 'publishable-curriculum-v4'
const visualDirectory = resolve('frontend/public/academy-visuals/publishable-v4')

const cleanTopic = (title: string) => title
  .replace(/\s*[—-]\s*(Temel|Teşhis|Ölçüm|Senaryo|Uygulama|Yönetişim).*$/iu, '')
  .replace(/^Konu:\s*/iu, '')
  .trim()

const parse = (value: string) => {
  try { return JSON.parse(value || '{}') } catch { return {} }
}

async function main() {
  const sourceCourses = await prisma.course.findMany({
    where: { id: { in: ALL_TOPIC_COURSE_IDS }, sourceType: 'topic' },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: {
          knowledgeObject: {
            include: {
              sources: { include: { source: true } },
              versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
              quizzes: { orderBy: { createdAt: 'asc' }, include: { questions: true } },
              flashcards: { orderBy: { order: 'asc' } },
              taskTemplates: { orderBy: { createdAt: 'asc' }, include: { assignments: { select: { id: true } } } },
            },
          },
        },
      },
    },
  })
  if (sourceCourses.length !== 200) {
    throw new Error(`Expected 200 source topic courses; found ${sourceCourses.length}. No changes made.`)
  }
  const byId = new Map(sourceCourses.map(item => [item.id, item]))
  const selected = new Map<number, NonNullable<(typeof sourceCourses)[number]['lessons'][number]['knowledgeObject']>>()
  const allMappedKoIds = new Set<number>()
  for (const source of sourceCourses) {
    const lessons = source.lessons.filter(item => item.knowledgeObject)
    if (!lessons.length) throw new Error(`Source course ${source.id} has no knowledge objects.`)
    const canonical = lessons[0].knowledgeObject!
    if (canonical.sources.length < 2) throw new Error(`${canonical.code || canonical.id} has fewer than two sources.`)
    selected.set(source.id, canonical)
    for (const lesson of lessons) if (lesson.knowledgeObjectId) allMappedKoIds.add(lesson.knowledgeObjectId)
  }
  if (selected.size !== 200) throw new Error(`Canonical KO selection failed: ${selected.size}/200.`)
  if (new Set([...selected.values()].map(ko => ko.id)).size !== 200) throw new Error('A canonical KO is mapped more than once.')

  const admin = await prisma.user.findFirst({ where: { role: 'admin' }, orderBy: { id: 'asc' } })
  if (!admin) throw new Error('An admin user is required for publication history.')

  const preview = CURRICULUM_V4.map(course => ({
    order: course.order,
    course: course.title,
    lessons: course.topicCourseIds.map(id => cleanTopic(byId.get(id)!.title)),
    mode: course.teachingMode,
  }))
  console.table(preview.map(item => ({
    no: item.order,
    course: item.course,
    lessons: item.lessons.length,
    mode: item.mode,
  })))
  console.log(`Canonical knowledge objects: ${selected.size}`)
  console.log(`Redundant mapped knowledge objects to archive: ${allMappedKoIds.size - selected.size}`)
  console.log(`Published courses after apply: ${CURRICULUM_V4.length}`)
  if (!apply) {
    console.log('PREVIEW ONLY. Re-run with --apply after reviewing the curriculum map.')
    return
  }

  await mkdir(visualDirectory, { recursive: true })
  const visualMeta = new Map<number, { path: string; kind: string; fingerprint: string }>()
  for (const course of CURRICULUM_V4) {
    for (const sourceCourseId of course.topicCourseIds) {
      const source = byId.get(sourceCourseId)!
      const topic = cleanTopic(source.title)
      const visual = buildVisualSvg(topic, course)
      const filename = `ko-${sourceCourseId}-${course.slug}.svg`
      await writeFile(resolve(visualDirectory, filename), visual.svg, 'utf8')
      visualMeta.set(sourceCourseId, {
        path: `/academy-visuals/publishable-v4/${filename}`,
        kind: visual.kind,
        fingerprint: visual.fingerprint,
      })
    }
  }

  await prisma.$transaction(async tx => {
    // The final catalogue is exclusive. Previous courses remain recoverable but are not visible.
    await tx.course.updateMany({ data: { published: false } })

    const canonicalIds = [...selected.values()].map(item => item.id)
    await tx.knowledgeObject.updateMany({
      where: { id: { notIn: canonicalIds } },
      data: {
        status: 'archived',
        archivedAt: now,
      },
    })

    for (const course of CURRICULUM_V4) {
      const metadata = {
        standard: STANDARD,
        curriculumOrder: course.order,
        promise: course.promise,
        teachingMode: course.teachingMode,
        lessonCount: 5,
        publicationState: 'owner-approved-final',
        publishedAt: now.toISOString(),
      }
      const publishedCourse = await tx.course.upsert({
        where: { slug: `v4-${course.slug}` },
        create: {
          title: course.title,
          slug: `v4-${course.slug}`,
          description: course.description,
          category: course.category,
          level: 'uygulamalı',
          estimatedMinutes: 5 * 22,
          outcomes: JSON.stringify(course.outcomes),
          sourceType: 'curated-v4',
          sortOrder: course.order,
          metadata: JSON.stringify(metadata),
          published: true,
        },
        update: {
          title: course.title,
          description: course.description,
          category: course.category,
          level: 'uygulamalı',
          estimatedMinutes: 5 * 22,
          outcomes: JSON.stringify(course.outcomes),
          sourceType: 'curated-v4',
          sortOrder: course.order,
          metadata: JSON.stringify(metadata),
          published: true,
        },
      })
      const existingLessons = await tx.lesson.findMany({
        where: { courseId: publishedCourse.id },
        orderBy: { order: 'asc' },
      })

      for (let position = 0; position < course.topicCourseIds.length; position += 1) {
        const sourceCourseId = course.topicCourseIds[position]
        const source = byId.get(sourceCourseId)!
        const ko = selected.get(sourceCourseId)!
        const topic = cleanTopic(source.title)
        const visual = visualMeta.get(sourceCourseId)!
        const curated = curatedSources(topic, course.category)
        for (const item of curated) {
          let sourceRecord = await tx.source.findFirst({ where: { url: item.url } })
          if (!sourceRecord) {
            sourceRecord = await tx.source.create({
              data: {
                title: item.title,
                url: item.url,
                authorityLevel: item.authorityLevel,
                lastChecked: now,
              },
            })
          } else {
            sourceRecord = await tx.source.update({
              where: { id: sourceRecord.id },
              data: { title: item.title, authorityLevel: item.authorityLevel, lastChecked: now },
            })
          }
          const link = await tx.knowledgeObjectSource.findFirst({
            where: { koId: ko.id, sourceId: sourceRecord.id },
          })
          if (!link) {
            await tx.knowledgeObjectSource.create({
              data: { koId: ko.id, sourceId: sourceRecord.id, relation: 'primary', note: item.note },
            })
          }
        }
        const sourceRefs = [
          ...curated.map(item => ({ title: item.title, url: item.url })),
          ...ko.sources.map(ref => ({ title: ref.source.title, url: ref.source.url })),
        ].filter((item, index, items) => items.findIndex(other => other.url === item.url) === index)
        const content = buildContent(topic, course, position, visual.path, sourceRefs)
        const profile = topicProfile(topic, course.category)
        const oldMetadata = parse(ko.metadata)
        const koMetadata = {
          ...oldMetadata,
          qualityStandard: STANDARD,
          curriculumCourseSlug: `v4-${course.slug}`,
          curriculumCourseOrder: course.order,
          lessonOrder: position + 1,
          teachingMode: course.teachingMode,
          visualAsset: visual.path,
          visualKind: visual.kind,
          visualFingerprint: visual.fingerprint,
          learningArtifact: profile.artifact,
          metric: profile.metric,
          sourceCheckedAt: '2026-07-29',
          editorialState: 'owner-approved-final',
          contentHash: createHash('sha256').update(content).digest('hex'),
        }
        const changed = ko.content !== content || oldMetadata.qualityStandard !== STANDARD
        let currentVersionId = ko.currentVersionId
        if (changed) {
          const version = await tx.knowledgeObjectVersion.create({
            data: {
              koId: ko.id,
              versionNumber: (ko.versions[0]?.versionNumber || 0) + 1,
              changes: JSON.stringify({
                standard: STANDARD,
                action: 'canonicalized-and-rewritten',
                contentHash: koMetadata.contentHash,
                visualFingerprint: visual.fingerprint,
              }),
              createdBy: admin.id,
            },
          })
          currentVersionId = version.id
        }
        await tx.knowledgeObject.update({
          where: { id: ko.id },
          data: {
            title: topic,
            summary: profile.concept,
            quickAnswer: profile.decision,
            content,
            metadata: JSON.stringify(koMetadata),
            status: 'published',
            verificationStatus: 'verified',
            reviewGate: 'enhanced',
            archivedAt: null,
            publishedAt: ko.publishedAt || now,
            reviewDue: new Date('2027-01-29T00:00:00.000Z'),
            currentVersionId,
            problem: profile.warning,
            applySteps: JSON.stringify([profile.evidence, profile.formula, profile.decision]),
            task: profile.artifact,
          },
        })

        const lessonTitle = `${position + 1}. ${topic}`
        if (existingLessons[position]) {
          await tx.lesson.update({
            where: { id: existingLessons[position].id },
            data: {
              title: lessonTitle,
              content,
              order: position + 1,
              estimatedMinutes: 22,
              knowledgeObjectId: ko.id,
            },
          })
        } else {
          await tx.lesson.create({
            data: {
              courseId: publishedCourse.id,
              title: lessonTitle,
              content,
              order: position + 1,
              estimatedMinutes: 22,
              knowledgeObjectId: ko.id,
            },
          })
        }

        const quizzes = ko.quizzes
        const quizItems = buildQuiz(topic, course)
        const quiz = quizzes[0]
          ? await tx.quiz.update({
              where: { id: quizzes[0].id },
              data: { title: `${topic} · Karar Quizi`, passScore: 80, status: 'published' },
            })
          : await tx.quiz.create({
              data: { koId: ko.id, title: `${topic} · Karar Quizi`, passScore: 80, status: 'published' },
            })
        await tx.quizQuestion.deleteMany({ where: { quizId: quiz.id } })
        await tx.quizQuestion.createMany({
          data: quizItems.map((item, index) => ({
            quizId: quiz.id,
            questionText: item.questionText,
            options: JSON.stringify(item.options),
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
            order: index + 1,
          })),
        })
        if (quizzes.length > 1) {
          await tx.quiz.updateMany({
            where: { id: { in: quizzes.slice(1).map(item => item.id) } },
            data: { status: 'archived' },
          })
        }

        const cards = buildFlashcards(topic, course)
        for (let cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
          await tx.flashcard.upsert({
            where: { koId_order: { koId: ko.id, order: cardIndex + 1 } },
            create: { koId: ko.id, order: cardIndex + 1, status: 'published', ...cards[cardIndex] },
            update: { status: 'published', ...cards[cardIndex] },
          })
        }
        await tx.flashcard.updateMany({
          where: { koId: ko.id, order: { gt: 6 } },
          data: { status: 'archived' },
        })

        const task = buildTask(topic, course)
        if (ko.taskTemplates[0]) {
          await tx.taskTemplate.update({ where: { id: ko.taskTemplates[0].id }, data: task })
        } else {
          await tx.taskTemplate.create({ data: { koId: ko.id, ...task } })
        }
      }

      if (existingLessons.length > 5) {
        const extras = existingLessons.slice(5)
        const progressCount = await tx.lessonProgress.count({ where: { lessonId: { in: extras.map(item => item.id) } } })
        if (progressCount > 0) throw new Error(`Course ${publishedCourse.id} has progress on extra lessons; refusing destructive cleanup.`)
        await tx.lesson.deleteMany({ where: { id: { in: extras.map(item => item.id) } } })
      }
    }
  }, { timeout: 300_000, maxWait: 20_000 })

  console.log(`APPLIED ${STANDARD}: 40 courses, 200 lessons, 200 canonical KOs.`)
  console.log('Previous courses and non-canonical KOs were unpublished/archived, not deleted.')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
