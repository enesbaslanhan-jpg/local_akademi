import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PILOT_KO_IDS = [
  6, 7, 8, 9, 10,
  106, 107, 108, 109, 110,
  206, 207, 208, 209, 210,
  406, 407, 408, 409, 410,
  846, 848, 847, 816, 818,
  726, 728, 727, 696, 698
]

export async function pilotDashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/pilot', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const user = request.user
    const now = new Date()

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, role: true }
    })

    const [flashcardProgress, flashcardReviews, quizAttempts, taskAssignments, knowledgeProgress, learningPaths] = await Promise.all([
      prisma.flashcardProgress.findMany({
        where: { userId: user.id, koId: { in: PILOT_KO_IDS } }
      }),
      prisma.flashcardReview.findMany({
        where: { userId: user.id, flashcard: { koId: { in: PILOT_KO_IDS } } },
        orderBy: { reviewedAt: 'desc' }
      }),
      prisma.quizAttempt.findMany({
        where: { userId: user.id, koId: { in: PILOT_KO_IDS } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.taskAssignment.findMany({
        where: { userId: user.id, koId: { in: PILOT_KO_IDS } },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.knowledgeProgress.findMany({
        where: { userId: user.id, koId: { in: PILOT_KO_IDS } }
      }),
      prisma.learningPath.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 1
      })
    ])

    const pilotKOs = await prisma.knowledgeObject.findMany({
      where: { id: { in: PILOT_KO_IDS } },
      include: { category: { select: { name: true } } }
    })
    const koMap = new Map(pilotKOs.map(ko => [ko.id, ko]))

    const totalPilotCards = await prisma.flashcard.count({
      where: { koId: { in: PILOT_KO_IDS }, status: 'published' }
    })

    const latestReviewByCard = new Map<string, typeof flashcardReviews[number]>()
    for (const review of flashcardReviews) {
      if (!latestReviewByCard.has(review.flashcardId)) latestReviewByCard.set(review.flashcardId, review)
    }
    const dueReviewedCards = [...latestReviewByCard.values()].filter(review => review.dueAt <= now).length
    const unseenCards = Math.max(0, totalPilotCards - latestReviewByCard.size)

    const flashcardStats = {
      totalCards: totalPilotCards,
      seenCards: flashcardProgress.reduce((s, p) => s + p.seenCount, 0),
      masteredCards: flashcardProgress.reduce((s, p) => s + p.masteredCount, 0),
      dueCards: unseenCards + dueReviewedCards,
      masteryPercent: totalPilotCards > 0
        ? Math.round((flashcardProgress.reduce((s, p) => s + p.masteredCount, 0) / totalPilotCards) * 100)
        : 0,
      lastReviewDate: flashcardReviews.length > 0 ? flashcardReviews[0].reviewedAt.toISOString() : null,
      reviewsThisWeek: flashcardReviews.filter(r => {
        const weekAgo = new Date(now.getTime() - 7 * 86400000)
        return r.reviewedAt >= weekAgo
      }).length
    }

    const passedAttempts = quizAttempts.filter(q => q.passed)
    const uniqueKOsAttempted = new Set(quizAttempts.map(q => q.koId))
    const quizStats = {
      totalAttempts: quizAttempts.length,
      averageScore: quizAttempts.length > 0
        ? Math.round(quizAttempts.reduce((s, q) => s + q.score, 0) / quizAttempts.length)
        : 0,
      passRate: quizAttempts.length > 0
        ? Math.round((passedAttempts.length / quizAttempts.length) * 100)
        : 0,
      uniqueKOsAttempted: uniqueKOsAttempted.size,
      lastAttemptDate: quizAttempts.length > 0 ? quizAttempts[0].createdAt.toISOString() : null
    }

    const completedTasks = taskAssignments.filter(t => t.status === 'completed')
    const inProgressTasks = taskAssignments.filter(t => t.status === 'in_progress')
    const taskStats = {
      totalAssigned: taskAssignments.length,
      completedCount: completedTasks.length,
      inProgressCount: inProgressTasks.length,
      pendingCount: taskAssignments.filter(t => t.status === 'assigned').length,
      completionRate: taskAssignments.length > 0
        ? Math.round((completedTasks.length / taskAssignments.length) * 100)
        : 0,
      averageProgress: taskAssignments.length > 0
        ? Math.round(taskAssignments.reduce((s, t) => s + t.progressPercent, 0) / taskAssignments.length)
        : 0
    }

    const completedKOIds = new Set(
      knowledgeProgress.filter(p => p.status === 'completed').map(p => p.koId)
    )
    const inProgressKOIds = new Set(
      knowledgeProgress.filter(p => p.status === 'in_progress').map(p => p.koId)
    )
    const pilotStats = {
      totalKOs: PILOT_KO_IDS.length,
      completedKOs: completedKOIds.size,
      inProgressKOs: inProgressKOIds.size,
      notStartedKOs: PILOT_KO_IDS.length - completedKOIds.size - inProgressKOIds.size,
      overallProgressPercent: Math.round(
        (completedKOIds.size / PILOT_KO_IDS.length) * 100
      )
    }

    const quizByKO = new Map<number, { attempts: number; passed: boolean }>()
    for (const q of quizAttempts) {
      const entry = quizByKO.get(q.koId) || { attempts: 0, passed: false }
      entry.attempts++
      if (q.passed) entry.passed = true
      quizByKO.set(q.koId, entry)
    }

    const tasksByKO = new Map<number, { total: number; completed: number; progress: number }>()
    for (const t of taskAssignments) {
      const entry = tasksByKO.get(t.koId) || { total: 0, completed: 0, progress: 0 }
      entry.total++
      entry.progress += t.progressPercent
      if (t.status === 'completed') entry.completed++
      tasksByKO.set(t.koId, entry)
    }

    const fpByKO = new Map(flashcardProgress.map(p => [p.koId, p.percent]))
    const kpByKO = new Map(knowledgeProgress.map(p => [p.koId, p.status]))

    const koProgress = PILOT_KO_IDS.map(koId => {
      const ko = koMap.get(koId)
      const q = quizByKO.get(koId)
      const t = tasksByKO.get(koId)
      return {
        koId,
        code: ko?.code || null,
        title: ko?.title || `KO #${koId}`,
        category: ko?.category?.name || null,
        knowledgeStatus: kpByKO.get(koId) || 'not_started',
        flashcardPercent: fpByKO.get(koId) || 0,
        quizAttempts: q?.attempts || 0,
        quizPassed: q?.passed || false,
        taskCount: t?.total || 0,
        tasksCompleted: t?.completed || 0,
        taskProgress: t ? Math.round(t.progress / t.total) : 0
      }
    })

    const weeklyTrend = buildWeeklyTrend(now, flashcardReviews, quizAttempts, taskAssignments)

    const currentPath = learningPaths.length > 0 ? learningPaths[0] : null
    let pathProgress = null
    if (currentPath) {
      const pathData = (() => {
        try { return JSON.parse(currentPath.pathData) } catch { return {} }
      })()
      const steps = pathData.steps || []
      const completedSteps = steps.filter((s: any) => completedKOIds.has(s.koId))
      const inProgressSteps = steps.filter((s: any) => inProgressKOIds.has(s.koId))
      pathProgress = {
        hasPath: true,
        totalSteps: steps.length,
        completedSteps: completedSteps.length,
        inProgressSteps: inProgressSteps.length,
        pathData
      }
    } else {
      pathProgress = { hasPath: false, totalSteps: 0, completedSteps: 0, inProgressSteps: 0, pathData: null }
    }

    return {
      user: {
        name: dbUser?.name || 'Kullanici',
        email: dbUser?.email || user.email,
        role: dbUser?.role || user.role
      },
      pilot: pilotStats,
      flashcards: flashcardStats,
      quizzes: quizStats,
      tasks: taskStats,
      learningPath: pathProgress,
      koProgress,
      weeklyTrend
    }
  })
}

function buildWeeklyTrend(
  now: Date,
  reviews: Array<{ reviewedAt: Date }>,
  quizzes: Array<{ createdAt: Date }>,
  tasks: Array<{ updatedAt: Date; status: string }>
) {
  const weeks: Array<{ week: string; flashcardReviews: number; quizAttempts: number; taskCompletions: number; activityCount: number }> = []
  for (let i = 3; i >= 0; i--) {
    const weekEnd = new Date(now.getTime() - i * 7 * 86400000)
    const weekStart = new Date(weekEnd.getTime() - 7 * 86400000)
    const label = weekStart.toISOString().slice(0, 10)
    weeks.push({
      week: label,
      flashcardReviews: reviews.filter(r => r.reviewedAt >= weekStart && r.reviewedAt < weekEnd).length,
      quizAttempts: quizzes.filter(q => q.createdAt >= weekStart && q.createdAt < weekEnd).length,
      taskCompletions: tasks.filter(t => t.status === 'completed' && t.updatedAt >= weekStart && t.updatedAt < weekEnd).length,
      activityCount: 0
    })
  }
  for (const w of weeks) {
    w.activityCount = w.flashcardReviews + w.quizAttempts + w.taskCompletions
  }
  return weeks
}
