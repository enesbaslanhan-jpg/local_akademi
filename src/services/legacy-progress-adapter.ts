import { PrismaClient } from '@prisma/client'

export interface LearningProgressItem {
  id?: string
  userId: number
  contentType: string
  contentId: string
  contentCode?: string | null
  title?: string
  status: 'started' | 'in_progress' | 'completed'
  progressPercent?: number | null
  continueLater: boolean
  startedAt: Date
  lastViewedAt: Date
  completedAt?: Date | null
  source?: string | null
}

export class LegacyProgressAdapter {
  constructor(private prisma: PrismaClient) {}

  async getLessonProgress(userId: number, lessonId: number): Promise<LearningProgressItem | null> {
    const legacy = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      include: {
        lesson: {
          select: { title: true }
        }
      }
    })

    if (!legacy) return null

    let status: 'started' | 'in_progress' | 'completed' = 'started'
    if (legacy.status === 'completed') {
      status = 'completed'
    } else if (legacy.status === 'in_progress' || legacy.overallPercent > 0) {
      status = 'in_progress'
    }

    return {
      userId,
      contentType: 'lesson',
      contentId: String(lessonId),
      title: legacy.lesson?.title,
      status,
      progressPercent: legacy.overallPercent,
      continueLater: false, // Legacy doesn't support this natively
      startedAt: legacy.startedAt || legacy.createdAt,
      lastViewedAt: legacy.lastViewedAt || legacy.updatedAt,
      completedAt: legacy.completedAt,
      source: 'legacy_lesson_progress',
    }
  }

  async getCourseProgress(userId: number, courseId: number): Promise<LearningProgressItem | null> {
    const legacy = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        course: {
          select: { title: true }
        }
      }
    })

    if (!legacy) return null

    let status: 'started' | 'in_progress' | 'completed' = 'started'
    if (legacy.status === 'completed') {
      status = 'completed'
    } else if (legacy.status === 'in_progress' || legacy.progress > 0) {
      status = 'in_progress'
    }

    return {
      userId,
      contentType: 'course',
      contentId: String(courseId),
      contentCode: null,
      title: legacy.course?.title,
      status,
      progressPercent: legacy.progress,
      continueLater: false,
      startedAt: legacy.createdAt,
      lastViewedAt: legacy.updatedAt,
      completedAt: status === 'completed' ? legacy.updatedAt : null,
      source: 'legacy_enrollment',
    }
  }

  merge(legacy: LearningProgressItem | null, current: LearningProgressItem | null): LearningProgressItem | null {
    if (!legacy && !current) return null
    if (!legacy) return current
    if (!current) return legacy

    // Both exist, resolve conflict.
    // Rule: Completed takes precedence
    if (current.status === 'completed') return current
    if (legacy.status === 'completed') return { ...current, status: 'completed', completedAt: legacy.completedAt || current.completedAt }

    // Otherwise, current takes precedence for updates like continueLater and lastViewedAt
    // But keep legacy progressPercent if current doesn't have one
    return {
      ...current,
      progressPercent: current.progressPercent ?? legacy.progressPercent,
      title: current.title || legacy.title,
      contentCode: current.contentCode || legacy.contentCode,
    }
  }
}
