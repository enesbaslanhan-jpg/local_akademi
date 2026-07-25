import { PrismaClient } from '@prisma/client'

const WEIGHTS = {
  reading: 0.25,
  video: 0.20,
  flashcard: 0.15,
  quiz: 0.20,
  task: 0.20,
}

export async function recomputeLessonAndEnrollment(
  prisma: PrismaClient,
  userId: number,
  lessonId: number,
  updates: {
    readingPercent?: number
    quizPercent?: number
    taskPercent?: number
    flashcardPercent?: number
    videoPercent?: number
  } = {}
) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      knowledgeObject: {
        include: {
          quizzes: true,
          taskTemplates: true,
          flashcards: { where: { status: 'published' } },
          videos: true,
        },
      },
    },
  })
  if (!lesson) throw new Error('Lesson not found')

  const ko = lesson.knowledgeObject
  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  })

  const readingPercent = updates.readingPercent ?? existing?.readingPercent ?? 0
  const quizPercent = updates.quizPercent ?? existing?.quizPercent ?? 0
  const taskPercent = updates.taskPercent ?? existing?.taskPercent ?? 0
  const flashcardPercent = updates.flashcardPercent ?? existing?.flashcardPercent ?? 0
  const videoPercent = updates.videoPercent ?? existing?.videoPercent ?? 0

  const videos = (ko?.videos as Array<{ playbackUrl?: string | null }> | undefined) ?? []
  const hasVideo = videos.length > 0 && videos.some(v => !!v.playbackUrl)
  const hasFlashcards = (ko?.flashcards?.length ?? 0) > 0
  const hasQuizzes = (ko?.quizzes?.length ?? 0) > 0
  const hasTasks = (ko?.taskTemplates?.length ?? 0) > 0
  const isLegacyReadingOnly = !hasVideo && !hasFlashcards && !hasQuizzes && !hasTasks

  // Determine active components and their weights
  interface Component { name: string; percent: number; weight: number }
  const available: Component[] = [{ name: 'reading', percent: readingPercent, weight: WEIGHTS.reading }]

  if (hasVideo) available.push({ name: 'video', percent: videoPercent, weight: WEIGHTS.video })
  if (hasFlashcards) available.push({ name: 'flashcard', percent: flashcardPercent, weight: WEIGHTS.flashcard })
  if (hasQuizzes) available.push({ name: 'quiz', percent: quizPercent, weight: WEIGHTS.quiz })
  if (hasTasks) available.push({ name: 'task', percent: taskPercent, weight: WEIGHTS.task })

  // Distribute missing component weights among available ones
  const totalDefinedWeight = Object.entries(WEIGHTS)
    .filter(([key]) => {
      if (key === 'reading') return true
      if (key === 'video' && hasVideo) return true
      if (key === 'flashcard' && hasFlashcards) return true
      if (key === 'quiz' && hasQuizzes) return true
      if (key === 'task' && hasTasks) return true
      return false
    })
    .reduce((sum, [, w]) => sum + w, 0)

  const scale = totalDefinedWeight > 0 ? 1 / totalDefinedWeight : 1
  for (const c of available) {
    c.weight *= scale
  }

  // Weighted overall (legacy reading-only = 100% reading)
  const overallPercent = isLegacyReadingOnly
    ? readingPercent
    : Math.round(available.reduce((sum, c) => sum + c.percent * c.weight, 0))
  const status = overallPercent >= 100 ? 'completed' : overallPercent > 0 ? 'in_progress' : 'not_started'
  const now = new Date()

  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId, lessonId,
      readingPercent, quizPercent, taskPercent, flashcardPercent, videoPercent,
      overallPercent, status,
      startedAt: status !== 'not_started' ? now : undefined,
      lastViewedAt: now,
      completedAt: status === 'completed' ? now : undefined,
    },
    update: {
      readingPercent, quizPercent, taskPercent, flashcardPercent, videoPercent,
      overallPercent, status,
      lastViewedAt: now,
      completedAt: status === 'completed' ? (existing?.completedAt ?? now) : null,
    },
  })

  // Recompute enrollment progress
  const lessons = await prisma.lesson.findMany({ where: { courseId: lesson.courseId }, select: { id: true } })
  const rows = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessons.map(item => item.id) } },
  })
  const enrollmentPercent = Math.round(rows.reduce((sum, row) => sum + row.overallPercent, 0) / Math.max(1, lessons.length))
  const enrollmentStatus = enrollmentPercent >= 100 ? 'completed' : enrollmentPercent > 0 ? 'in_progress' : 'not_started'
  await prisma.enrollment.updateMany({
    where: { userId, courseId: lesson.courseId },
    data: { progress: enrollmentPercent, status: enrollmentStatus },
  })

  return progress
}
