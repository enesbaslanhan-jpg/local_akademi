import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { getEmbeddedPracticeBlocksForCourse, getEmbeddedPracticeBlocksForLesson } from './embedded-practice-blocks.js'

export async function courseRoutes(fastify: FastifyInstance) {
  // List with pagination, filters, search
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const query = request.query as any
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize) || 12))
    const skip = (page - 1) * pageSize

    const where: any = { published: true }

    if (query.category) where.category = { contains: query.category, mode: 'insensitive' }
    if (query.level) where.level = query.level
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }
    if (query.knowledgeObjectId !== undefined) {
      const knowledgeObjectId = Number(query.knowledgeObjectId)
      if (!Number.isInteger(knowledgeObjectId) || knowledgeObjectId <= 0) {
        return reply.status(400).send({ error: 'Invalid knowledge object ID' })
      }
      where.lessons = { some: { knowledgeObjectId } }
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { sortOrder: 'asc' },
          { title: 'asc' },
        ],
        include: {
          _count: { select: { lessons: true } },
          enrollments: request.user
            ? { where: { userId: (request.user as any).id }, take: 1 }
            : false,
        },
      }),
      prisma.course.count({ where }),
    ])

    const user = request.user as any
    let enrollmentsMap: Record<number, any> = {}
    if (user) {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.id, courseId: { in: courses.map(c => c.id) } },
      })
      for (const e of enrollments) enrollmentsMap[e.courseId] = e
    }

    const result = courses.map(c => {
      const enrollment = enrollmentsMap[c.id]
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description?.substring(0, 200),
        category: c.category,
        level: c.level,
        lessonCount: c._count?.lessons ?? 0,
        estimatedMinutes: c.estimatedMinutes,
        sourceType: c.sourceType,
        sortOrder: c.sortOrder,
        metadata: (() => {
          try { return JSON.parse(c.metadata || '{}') } catch { return {} }
        })(),
        enrollment: enrollment ? {
          id: enrollment.id,
          status: enrollment.status,
          progress: enrollment.progress,
        } : null,
        createdAt: c.createdAt,
      }
    })

    return {
      courses: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  })

  // Course detail with lessons and user progress
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const courseId = parseInt(id)
    if (isNaN(courseId)) return reply.status(400).send({ error: 'Invalid course ID' })

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: { orderBy: { order: 'asc' } },
      },
    })

    if (!course || !course.published) {
      return reply.status(404).send({ error: 'Course not found' })
    }

    const user = request.user as any
    let enrollment: any = null
    let lessonProgressMap: Record<number, any> = {}

    if (user) {
      enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      })
      const progressRows = await prisma.lessonProgress.findMany({
        where: { userId: user.id, lessonId: { in: course.lessons.map(l => l.id) } },
      })
      for (const p of progressRows) lessonProgressMap[p.lessonId] = p
    }

    const embeddedPracticeBlocks = await getEmbeddedPracticeBlocksForCourse(courseId)

    const lessons: Array<{
      id: number; title: string; order: number; estimatedMinutes: number;
      knowledgeObjectId: number | null; knowledgeObjectCode: string | null;
      knowledgeObjectLevel: string | null;
      progress: any; isLocked: boolean;
    }> = course.lessons.map((l, idx) => {
      const progress = lessonProgressMap[l.id]
      const isLocked = !enrollment
      return {
        id: l.id,
        title: l.title,
        order: l.order,
        estimatedMinutes: l.estimatedMinutes,
        knowledgeObjectId: l.knowledgeObjectId,
        knowledgeObjectCode: null,
        knowledgeObjectLevel: null,
        progress: progress ? {
          status: progress.status,
          overallPercent: progress.overallPercent,
          readingPercent: progress.readingPercent,
          flashcardPercent: progress.flashcardPercent,
          videoPercent: progress.videoPercent,
          quizPercent: progress.quizPercent,
          taskPercent: progress.taskPercent,
        } : null,
        isLocked,
      }
    })

    // Fetch KO codes for lessons that have knowledgeObjectId
    const koIds = lessons.filter(l => l.knowledgeObjectId).map(l => l.knowledgeObjectId!)
    if (koIds.length > 0) {
      const kos = await prisma.knowledgeObject.findMany({
        where: { id: { in: koIds }, status: 'published', isDemo: false },
        select: { id: true, code: true, metadata: true },
      })
      const koMap = new Map(kos.map(k => [k.id, k]))
      for (const lesson of lessons) {
        if (lesson.knowledgeObjectId) {
          const ko = koMap.get(lesson.knowledgeObjectId)
          if (ko) {
            lesson.knowledgeObjectCode = ko.code
            try {
              const meta = JSON.parse(ko.metadata)
              lesson.knowledgeObjectLevel = meta.level || null
            } catch { /* ignore */ }
          }
        }
      }
    }

    return {
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        estimatedMinutes: course.estimatedMinutes,
        outcomes: JSON.parse(course.outcomes || '[]'),
        sourceType: course.sourceType,
        sortOrder: course.sortOrder,
        metadata: (() => {
          try { return JSON.parse(course.metadata || '{}') } catch { return {} }
        })(),
        lessonCount: course.lessons.length,
        lessons,
        enrollment: enrollment ? {
          id: enrollment.id,
          status: enrollment.status,
          progress: enrollment.progress,
        } : null,
        embeddedPracticeBlocks,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
    }
  })

  // Learn endpoint: get course with first/next lesson
  fastify.get('/:courseId/learn', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any
    const { courseId } = request.params as { courseId: string }
    const cid = parseInt(courseId)
    if (isNaN(cid)) return reply.status(400).send({ error: 'Invalid course ID' })

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: cid } },
    })
    if (!enrollment) return reply.status(403).send({ error: 'Not enrolled' })

    // Find first incomplete lesson
    const lessons = await prisma.lesson.findMany({
      where: { courseId: cid },
      orderBy: { order: 'asc' },
    })

    const progressRows = await prisma.lessonProgress.findMany({
      where: { userId: user.id, lessonId: { in: lessons.map(l => l.id) } },
    })
    const progressMap = new Map(progressRows.map(p => [p.lessonId, p]))

    let nextLesson = lessons.find(l => {
      const p = progressMap.get(l.id)
      return !p || p.status !== 'completed'
    })

    if (!nextLesson && lessons.length > 0) nextLesson = lessons[0]
    if (!nextLesson) return reply.status(404).send({ error: 'No lessons in course' })

    return reply.redirect(`/courses/${cid}/lessons/${nextLesson.id}`)
  })

  // Single lesson endpoint
  fastify.get('/:courseId/lessons/:lessonId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any
    const { courseId, lessonId } = request.params as { courseId: string; lessonId: string }
    const cid = parseInt(courseId)
    const lid = parseInt(lessonId)
    if (isNaN(cid) || isNaN(lid)) return reply.status(400).send({ error: 'Invalid IDs' })

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: cid } },
    })
    if (!enrollment) return reply.status(403).send({ error: 'Not enrolled' })

    const lesson = await prisma.lesson.findUnique({
      where: { id: lid },
      include: {
        course: true,
        knowledgeObject: {
          include: {
            quizzes: { include: { questions: { orderBy: { order: 'asc' } } } },
            taskTemplates: true,
            flashcards: { where: { status: 'published' }, select: { id: true } },
            videos: { where: { status: 'published', playbackUrl: { not: null } }, select: { id: true } },
            sources: { include: { source: true } },
          },
        },
      },
    })

    if (!lesson || lesson.courseId !== cid || !lesson.course.published ||
      (lesson.knowledgeObject && (lesson.knowledgeObject.status !== 'published' || lesson.knowledgeObject.isDemo))) {
      return reply.status(404).send({ error: 'Lesson not found' })
    }

    // Hide correct answers from quiz questions
    const safeQuizzes = lesson.knowledgeObject?.quizzes?.map(q => ({
      id: q.id,
      title: q.title,
      passScore: q.passScore,
      questions: q.questions.map(qq => ({
        id: qq.id,
        questionText: qq.questionText,
        options: (() => { try { return JSON.parse(qq.options) } catch { return [] } })(),
        order: qq.order,
      })),
    })) || []

    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: lid } },
    })

    const embeddedPracticeBlocks = await getEmbeddedPracticeBlocksForLesson(lid)

    // Previous/next lesson
    const allLessons = await prisma.lesson.findMany({
      where: { courseId: cid },
      orderBy: { order: 'asc' },
    })
    const currentIdx = allLessons.findIndex(l => l.id === lid)
    const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null
    const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null

    return {
      lesson: {
        id: lesson.id,
        courseId: lesson.courseId,
        title: lesson.title,
        order: lesson.order,
        estimatedMinutes: lesson.estimatedMinutes,
        content: lesson.content,
        knowledgeObject: lesson.knowledgeObject ? {
          id: lesson.knowledgeObject.id,
          code: lesson.knowledgeObject.code,
          title: lesson.knowledgeObject.title,
          content: lesson.knowledgeObject.content,
          metadata: (() => {
            try { return JSON.parse(lesson.knowledgeObject.metadata) } catch { return {} }
          })(),
          sources: lesson.knowledgeObject.sources,
          status: lesson.knowledgeObject.status,
          hasFlashcards: lesson.knowledgeObject.flashcards.length > 0,
          hasVideo: (Array.isArray(lesson.knowledgeObject?.videos) && (lesson.knowledgeObject.videos as Array<any>).length > 0),
        } : null,
        quizzes: safeQuizzes,
        taskTemplates: lesson.knowledgeObject?.taskTemplates || [],
        progress: progress ? {
          status: progress.status,
          overallPercent: progress.overallPercent,
          readingPercent: progress.readingPercent,
          flashcardPercent: progress.flashcardPercent,
          videoPercent: progress.videoPercent,
          quizPercent: progress.quizPercent,
          taskPercent: progress.taskPercent,
        } : null,
        embeddedPracticeBlocks,
        prevLesson: prevLesson ? { id: prevLesson.id, title: prevLesson.title } : null,
        nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null,
      },
    }
  })

  // Admin: create
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Admin access required' })
    const { title, description, category, level, published } = request.body as any
    const course = await prisma.course.create({
      data: { title, description, category, level: level || 'beginner', published: published || false },
    })
    return reply.status(201).send({ course })
  })

  // Admin: update
  fastify.put('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Admin access required' })
    const { id } = request.params as { id: string }
    const { title, description, category, level, published } = request.body as any
    const course = await prisma.course.update({
      where: { id: parseInt(id) },
      data: { title, description, category, level, published },
    })
    return { course }
  })

  // Admin: delete
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any
    if (user.role !== 'admin') return reply.status(403).send({ error: 'Admin access required' })
    const { id } = request.params as { id: string }
    await prisma.course.delete({ where: { id: parseInt(id) } })
    return reply.status(204).send()
  })
}
