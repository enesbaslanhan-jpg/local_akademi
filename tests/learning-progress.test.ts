import { expect, test, describe, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { LearningProgressService } from '../src/services/learning-progress'

const prisma = new PrismaClient()
const lpService = new LearningProgressService(prisma)

describe('Learning Progress Service', () => {
  let user: any
  let course: any
  let lesson: any

  beforeAll(async () => {
    user = await prisma.user.create({
      data: { email: 'test_lp_' + Date.now() + '@test.com', name: 'LP User', role: 'user', password: 'testpassword' }
    })
    
    course = await prisma.course.create({
      data: { title: 'LP Course', slug: 'lp-course-' + Date.now(), description: 'Test', published: true, category: 'test' }
    })

    lesson = await prisma.lesson.create({
      data: { title: 'LP Lesson', courseId: course.id, order: 1, content: 'test content' }
    })
  })

  afterAll(async () => {
    await prisma.learningProgress.deleteMany({ where: { userId: user.id } })
    await prisma.lessonProgress.deleteMany({ where: { userId: user.id } })
    await prisma.enrollment.deleteMany({ where: { userId: user.id } })
    await prisma.lesson.delete({ where: { id: lesson.id } })
    await prisma.course.delete({ where: { id: course.id } })
    await prisma.user.delete({ where: { id: user.id } })
    await prisma.$disconnect()
  })

  test('Creates started progress', async () => {
    const res = await lpService.updateProgress(user.id, 'decision_check', 'dc-1', {
      status: 'started',
      contentCode: 'DC-01'
    })
    
    expect(res.status).toBe('started')
    expect(res.contentId).toBe('dc-1')
    expect(res.contentType).toBe('decision_check')
  })

  test('Updates to in_progress', async () => {
    const res = await lpService.updateProgress(user.id, 'decision_check', 'dc-1', {
      status: 'in_progress',
      progressPercent: 50
    })
    
    expect(res.status).toBe('in_progress')
    expect(res.progressPercent).toBe(50)
  })

  test('Completes progress', async () => {
    const res = await lpService.updateProgress(user.id, 'decision_check', 'dc-1', {
      status: 'completed',
      progressPercent: 100
    })
    
    expect(res.status).toBe('completed')
    expect(res.progressPercent).toBe(100)
    expect(res.completedAt).toBeDefined()
  })

  test('Prevents regression from completed state', async () => {
    const res = await lpService.updateProgress(user.id, 'decision_check', 'dc-1', {
      status: 'in_progress', // Trying to downgrade
      progressPercent: 80
    })
    
    // Status should remain completed
    expect(res.status).toBe('completed')
    expect(res.progressPercent).toBe(80) // Other fields can update
  })

  test('Continue Later functionality', async () => {
    await lpService.updateProgress(user.id, 'practical_card', 'pc-1', {
      status: 'started',
      continueLater: true
    })
    
    const continueItems = await lpService.getContinueLearning(user.id)
    const found = continueItems.find(i => i.contentId === 'pc-1' && i.contentType === 'practical_card')
    expect(found).toBeDefined()
    expect(found?.continueLater).toBe(true)
  })

  test('Legacy adapter merges data', async () => {
    // Insert legacy data
    await prisma.lessonProgress.create({
      data: {
        userId: user.id,
        lessonId: lesson.id,
        status: 'completed',
        overallPercent: 100,
        readingPercent: 100,
        quizPercent: 100,
        taskPercent: 100,
        flashcardPercent: 100,
        videoPercent: 100,
      }
    })

    const progress = await lpService.getProgress(user.id, 'lesson', String(lesson.id))
    expect(progress).toBeDefined()
    expect(progress?.status).toBe('completed')
    expect(progress?.source).toBe('legacy_lesson_progress')
  })
})
