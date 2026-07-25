import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

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
        where: { userId: user.id },
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
        orderBy: { updatedAt: 'desc' }
      }).catch(() => []),

      prisma.quizAttempt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5
      }).catch(() => [])
    ])

    const completedCourses = enrollments.filter(e => e.status === 'completed').length
    const activeCourses = enrollments.filter(e => e.status === 'in_progress').length
    const notStartedCourses = enrollments.filter(e => e.status === 'not_started').length
    const avgProgress = enrollments.length > 0
      ? Math.round(enrollments.reduce((s, e) => s + e.progress, 0) / enrollments.length)
      : 0

    const resumeItem = enrollments
      .filter(e => e.status === 'in_progress')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] || null

    const lastWeek = new Date(now.getTime() - 7 * 86400000)
    const weeklyCompleted = enrollments.filter(
      e => e.status === 'completed' && e.updatedAt >= lastWeek
    ).length
    const weeklyEnrolled = enrollments.filter(
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
        totalEnrollments: enrollments.length,
        avgProgress,
        weeklyProgress: weeklyCompleted,
        weeklyEnrolled,
        completedKOs: knowledgeProgress.filter((p: any) => p.status === 'completed').length,
        inProgressKOs: knowledgeProgress.filter((p: any) => p.status === 'in_progress').length
      },
      enrollments: enrollments.map(e => ({
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
        title: `Görev #${t.taskId}`,
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
