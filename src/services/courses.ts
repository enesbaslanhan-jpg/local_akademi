import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { getEmbeddedPracticeBlocksForCourse, getEmbeddedPracticeBlocksForLesson } from './embedded-practice-blocks.js'
import { contentLanguage, localized } from '../lib/content-language.js'
import { COURSE_CATEGORY_EN, COURSE_EN_BY_SLUG, COURSE_SOURCE_TITLE_EN } from '../content/i18n/course-en.js'

export async function courseRoutes(fastify: FastifyInstance) {
  // Mobile Support: Get distinct categories
  fastify.get('/categories', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const language = contentLanguage(request)
    const courses = await prisma.course.findMany({
      where: { published: true, archivedAt: null },
      select: { category: true }
    })
    const categories = Array.from(new Set(courses.map(c => (
      language === 'en' ? COURSE_CATEGORY_EN[c.category] || c.category : c.category
    )).filter(c => c !== null && c !== '')))
    return categories
  })

  // List with pagination, filters, search
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const language = contentLanguage(request)
    const query = request.query as any
    const page = Math.max(1, parseInt(query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize) || 12))
    const skip = (page - 1) * pageSize

    /* Arşivlenmiş kurslar kullanıcı kataloğunda görünmez.
       Kayıt SİLİNMEZ; yalnız listeden düşer. Mevcut enrollment ve
       ilerleme kayıtları etkilenmez, kurs kendi id'siyle okunabilir
       kalır (bkz. GET /:id — arşiv durumu ayrıca işaretlenir). */
    const where: any = { published: true, archivedAt: null }

    if (query.category) {
      const sourceCategory = language === 'en'
        ? Object.entries(COURSE_CATEGORY_EN).find(([, english]) => english === query.category)?.[0] || query.category
        : query.category
      where.category = { contains: sourceCategory, mode: 'insensitive' }
    }
    if (query.level) where.level = query.level
    if (query.search) {
      if (language === 'en') {
        const needle = String(query.search).toLocaleLowerCase('en-US')
        where.slug = {
          in: Object.entries(COURSE_EN_BY_SLUG)
            .filter(([, item]) => `${item.title} ${item.description || ''}`.toLocaleLowerCase('en-US').includes(needle))
            .map(([slug]) => slug),
        }
      } else {
        where.OR = [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ]
      }
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
      const english = c.slug ? COURSE_EN_BY_SLUG[c.slug] : undefined
      return {
        id: c.id,
        slug: c.slug,
        title: localized(c.title, english?.title, language),
        description: localized(c.description, english?.description, language)?.substring(0, 200),
        category: localized(c.category, COURSE_CATEGORY_EN[c.category], language),
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
    const language = contentLanguage(request)
    const { id } = request.params as { id: string }
    const courseId = parseInt(id)
    if (isNaN(courseId)) return reply.status(400).send({ error: 'Invalid course ID' })

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: { orderBy: { order: 'asc' } },
      },
    })

    /* Arşivlenmiş kurs katalogda listelenmez ama kendi adresinden OKUNABİLİR
       kalır. 404 vermek, o kursa kayıtlı kullanıcının ilerleme ve tamamlama
       geçmişine erişimini koparırdı; ürün kararı geçmişin korunması yönünde.
       İstemci `archived` bayrağıyla "bu içerik arşivlendi" uyarısı gösterir. */
    const isArchived = course !== null && course.archivedAt !== null

    /* Üç durum AYRI AYRI ele alınır:
         ACTIVE   published=true,  archivedAt=null  → açık
         ARCHIVED published=false, archivedAt!=null → doğrudan adresten açık
         DRAFT    published=false, archivedAt=null  → kapalı
       `published=false` TEK BAŞINA 404 sebebi değildir; yalnız "yayınlanmamış
       VE arşivlenmemiş" (taslak) içerik gizlenir. Önceki guard bu ayrımı
       yapmadığı için arşivleme, kayıtlı kullanıcının geçmişini erişilemez
       kılıyordu. */
    if (!course || (!course.published && !isArchived)) {
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

    const english = course.slug ? COURSE_EN_BY_SLUG[course.slug] : undefined
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
        title: localized(l.title, english?.lessonTitle || english?.title, language),
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
          /* Kaldığı yere dönebilmek için gerekli: ders id'si verilmediğinde
             Course Player ilk derse değil, en son görüntülenen derse açar. */
          lastViewedAt: progress.lastViewedAt,
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
        title: localized(course.title, english?.title, language),
        description: localized(course.description, english?.description, language),
        category: localized(course.category, COURSE_CATEGORY_EN[course.category], language),
        level: course.level,
        estimatedMinutes: course.estimatedMinutes,
        outcomes: JSON.parse(course.outcomes || '[]'),
        sourceType: course.sourceType,
        sortOrder: course.sortOrder,
        archived: isArchived,
        archivedAt: course.archivedAt,
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
    const language = contentLanguage(request)
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

    /* Ebeveyn kurs ACTIVE ya da ARCHIVED ise ders okunabilir; yalnız DRAFT
       (yayınsız + arşivsiz) kapalıdır. Bu uç zaten yukarıda enrollment
       şartı arıyor (403), yani arşiv erişimi kendiliğinden o kursa kayıtlı
       kullanıcıyla sınırlı — taslak içerik public olmuyor. */
    const parentArchived = lesson !== null && lesson.course.archivedAt !== null
    const parentReadable = lesson !== null && (lesson.course.published || parentArchived)

    if (!lesson || lesson.courseId !== cid || !parentReadable ||
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
    const english = lesson.course.slug ? COURSE_EN_BY_SLUG[lesson.course.slug] : undefined
    const englishLessonTitle = english?.lessonTitle || english?.title
    const hasEnglishLesson = language === 'en' && Boolean(english?.lessonContent)

    return {
      lesson: {
        id: lesson.id,
        courseId: lesson.courseId,
        title: localized(lesson.title, englishLessonTitle, language),
        order: lesson.order,
        estimatedMinutes: lesson.estimatedMinutes,
        content: localized(lesson.content, english?.lessonContent, language),
        translated: hasEnglishLesson,
        knowledgeObject: lesson.knowledgeObject ? {
          id: lesson.knowledgeObject.id,
          code: lesson.knowledgeObject.code,
          title: localized(lesson.knowledgeObject.title, englishLessonTitle, language),
          // Canonical player gövdeyi lesson.content yerine buradan okuyor.
          content: localized(lesson.knowledgeObject.content, english?.lessonContent, language),
          metadata: (() => {
            try {
              const metadata = JSON.parse(lesson.knowledgeObject.metadata)
              if (!hasEnglishLesson) return metadata
              // Metinsel metadata Türkçe kaynak içeriğidir. İngilizce gövde
              // aynı bölümleri içerir; Türkçe parçaların yan raydan sızmasını önle.
              return {
                ...metadata,
                learningOutcomes: [],
                examples: [],
                steps: [],
                checklist: [],
                formulas: [],
              }
            } catch { return {} }
          })(),
          sources: hasEnglishLesson
            ? lesson.knowledgeObject.sources.map(item => ({
                ...item,
                source: { ...item.source, title: COURSE_SOURCE_TITLE_EN[item.source.title] ?? item.source.title },
              }))
            : lesson.knowledgeObject.sources,
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
          /* Kaldığı yere dönebilmek için gerekli: ders id'si verilmediğinde
             Course Player ilk derse değil, en son görüntülenen derse açar. */
          lastViewedAt: progress.lastViewedAt,
        } : null,
        // İngilizce canonical gövdenin kendi formül/uyarı bölümleri ayrıştırılır.
        // Veritabanındaki bloklar Türkçe olduğundan ikinci kez gösterilmez.
        embeddedPracticeBlocks: hasEnglishLesson ? [] : embeddedPracticeBlocks,
        prevLesson: prevLesson ? { id: prevLesson.id, title: localized(prevLesson.title, englishLessonTitle, language) } : null,
        nextLesson: nextLesson ? { id: nextLesson.id, title: localized(nextLesson.title, englishLessonTitle, language) } : null,
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

