import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export function isLegacyCourseTitle(title: string): boolean {
  return /^\s*\[[^\]]*kopya[^\]]*\]/i.test(title)
}

export function stripLegacyCourseTitle(title: string): string {
  return title.replace(/^\s*\[[^\]]*\]\s*/, '').trim()
}

export async function learnerDashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const user = request.user
    const now = new Date()

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, role: true }
    })

    const [
      enrollments,
      currentPath,
      recentActivity,
      knowledgeProgress,
      professionalKOs,
      tasks,
      quizHistory
    ] = await Promise.all([
      prisma.enrollment.findMany({
        where: {
          userId: user.id,
          course: { published: true }
        },
        include: { course: true },
        orderBy: { updatedAt: 'desc' }
      }).catch(() => []),

      prisma.learningPath.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      }).catch(() => null),

      prisma.activityEvent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      }).catch(() => []),

      prisma.knowledgeProgress.findMany({
        where: { userId: user.id }
      }).catch(() => []),

      prisma.knowledgeObject.findMany({
        where: { isDemo: false, status: 'published' },
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { name: true } } }
      }).catch(() => []),

      prisma.taskAssignment.findMany({
        where: { userId: user.id },
        include: { taskTemplate: { select: { title: true } } },
        orderBy: { updatedAt: 'desc' }
      }).catch(() => []),

      prisma.quizAttempt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5
      }).catch(() => [])
    ])

    const visibleEnrollments = enrollments.filter(
      e => e.course && e.course.published && !isLegacyCourseTitle(e.course.title)
    )

    const completedCourses = visibleEnrollments.filter(e => e.status === 'completed').length
    const activeCourses = visibleEnrollments.filter(e => e.status === 'in_progress').length
    const notStartedCourses = visibleEnrollments.filter(e => e.status === 'not_started').length
    const avgProgress = visibleEnrollments.length > 0
      ? Math.round(visibleEnrollments.reduce((s, e) => s + e.progress, 0) / visibleEnrollments.length)
      : 0

    /* "Devam et" kartı EN SON GÖRÜNTÜLENEN dersin kursunu göstermeli.
       Enrollment.updatedAt yalnız ilerleme kaydedildiğinde değişiyor; tek
       başına kullanıldığında kullanıcı başka bir kursu açsa bile kart aynı
       kursta kalıyordu. Bu yüzden önce LessonProgress.lastViewedAt'e
       bakıyoruz, karşılığı yoksa eski davranışa düşüyoruz. */
    const inProgress = visibleEnrollments.filter(e => e.status === 'in_progress')

    let resumeItem = null as (typeof visibleEnrollments)[number] | null

    if (inProgress.length > 0) {
      /* Bu dosyadaki diğer sorgular gibi hataya dayanıklı: tek bir alt
         sorgunun düşmesi Ana Sayfa'nın tamamını 500 yapmamalı. `?.` ayrıca
         delegate'in hiç bulunmadığı durumu da karşılıyor — eksik alana
         erişim SENKRON atar ve `.catch()` onu yakalamaz. */
      const lastViewed = await (prisma as any).lessonProgress?.findFirst({
        where: {
          userId: user.id,
          lastViewedAt: { not: null },
          lesson: { courseId: { in: inProgress.map(e => e.courseId) } }
        },
        orderBy: { lastViewedAt: 'desc' },
        select: { lesson: { select: { courseId: true } } }
      })?.catch(() => null)

      if (lastViewed?.lesson?.courseId) {
        resumeItem = inProgress.find(e => e.courseId === lastViewed.lesson.courseId) ?? null
      }
    }

    if (!resumeItem) {
      resumeItem = inProgress
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] || null
    }

    if (!resumeItem) {
      const legacyEnrollment = enrollments
        .filter(e => e.status === 'in_progress' && e.course && !e.course.published && isLegacyCourseTitle(e.course.title))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]
      if (legacyEnrollment?.course) {
        const activeMatch = await prisma.course.findFirst({
          where: {
            published: true,
            archivedAt: null,
            AND: [
              { title: { not: { startsWith: '[Eski Kopya]' } } },
              { title: { contains: stripLegacyCourseTitle(legacyEnrollment.course.title).slice(0, 60) } }
            ]
          },
          select: { id: true, title: true }
        }).catch(() => null)
        if (activeMatch) {
          resumeItem = {
            id: legacyEnrollment.id,
            userId: legacyEnrollment.userId,
            courseId: activeMatch.id,
            course: activeMatch as any,
            progress: legacyEnrollment.progress,
            status: legacyEnrollment.status,
            createdAt: legacyEnrollment.createdAt,
            updatedAt: legacyEnrollment.updatedAt
          }
        }
      }
    }

    const lastWeek = new Date(now.getTime() - 7 * 86400000)
    const weeklyCompleted = visibleEnrollments.filter(
      e => e.status === 'completed' && e.updatedAt >= lastWeek
    ).length
    const weeklyEnrolled = visibleEnrollments.filter(
      e => e.createdAt >= lastWeek
    ).length

    const openTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')

    const recentCompletedKO = recentActivity.find(a => a.eventType === 'ko_completed')
    const recentQuiz = quizHistory.length > 0 ? quizHistory[0] : null
    const recentMentor = recentActivity.find(a => a.eventType === 'mentor_chat')
    const recentCourseActivity = recentActivity.find(
      a => ['enrollment_progress', 'course_completed'].includes(a.eventType)
    )

    return {
      user: {
        name: dbUser?.name || 'Kullanıcı',
        email: dbUser?.email || user.email,
        role: dbUser?.role || user.role
      },
      stats: {
        completedCourses,
        activeCourses,
        notStartedCourses,
        totalEnrollments: visibleEnrollments.length,
        avgProgress,
        weeklyProgress: weeklyCompleted,
        weeklyEnrolled,
        completedKOs: knowledgeProgress.filter((p: any) => p.status === 'completed').length,
        inProgressKOs: knowledgeProgress.filter((p: any) => p.status === 'in_progress').length
      },
      enrollments: visibleEnrollments.map(e => ({
        id: e.id,
        courseId: e.courseId,
        courseTitle: e.course?.title || `Kurs #${e.courseId}`,
        courseCategory: e.course?.category || null,
        courseLevel: e.course?.level || null,
        progress: e.progress,
        status: e.status,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt
      })),
      currentLearningPath: currentPath ? {
        id: currentPath.id,
        title: currentPath.title,
        pathData: (() => {
          try { return JSON.parse(currentPath.pathData) } catch { return {} }
        })(),
        createdAt: currentPath.createdAt
      } : null,
      resumeItem: resumeItem ? {
        id: resumeItem.id,
        courseId: resumeItem.courseId,
        courseTitle: resumeItem.course?.title || `Kurs #${resumeItem.courseId}`,
        progress: resumeItem.progress,
        status: resumeItem.status,
        updatedAt: resumeItem.updatedAt
      } : null,
      recommendations: professionalKOs.map(ko => ({
        id: ko.id,
        code: ko.code,
        title: ko.title,
        type: ko.type,
        categoryName: ko.category?.name || null,
        createdAt: ko.createdAt
      })),
      upcomingTasks: openTasks.slice(0, 5).map(t => ({
        id: t.id,
        taskId: t.taskId,
        title: t.taskTemplate?.title || 'Görevi tamamla',
        status: t.status,
        progressPercent: t.progressPercent,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      })),
      recentActivity: recentActivity.map(a => ({
        id: a.id,
        eventType: a.eventType,
        title: a.title,
        detail: (() => {
          try { return JSON.parse(a.detail) } catch { return a.detail }
        })(),
        createdAt: a.createdAt
      })),
      quizHistory: quizHistory.map(q => ({
        id: q.id,
        koId: q.koId,
        score: q.score,
        passed: q.passed,
        createdAt: q.createdAt
      })),
      recentCompletedKO: recentCompletedKO ? {
        title: recentCompletedKO.title,
        detail: recentCompletedKO.detail,
        createdAt: recentCompletedKO.createdAt
      } : null,
      recentQuizResult: recentQuiz ? {
        score: recentQuiz.score,
        passed: recentQuiz.passed,
        createdAt: recentQuiz.createdAt
      } : null,
      recentMentorSession: recentMentor ? {
        title: recentMentor.title,
        createdAt: recentMentor.createdAt
      } : null,
      recentCourseActivity: recentCourseActivity ? {
        title: recentCourseActivity.title,
        eventType: recentCourseActivity.eventType,
        createdAt: recentCourseActivity.createdAt
      } : null,
      demoMode: false
    }
  })
}
