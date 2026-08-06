import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { LegacyProgressAdapter, LearningProgressItem } from './legacy-progress-adapter'

const validContentTypes = ['guide', 'lesson', 'course', 'decision_check', 'financial_tool'] as const
const validStatuses = ['started', 'in_progress', 'completed'] as const

export const UpdateProgressSchema = z.object({
  status: z.enum(validStatuses),
  progressPercent: z.number().int().min(0).max(100).nullable().optional(),
  lastPositionJson: z.any().optional(),
  continueLater: z.boolean().optional(),
  contentCode: z.string().optional(),
})

export type UpdateProgressDto = z.infer<typeof UpdateProgressSchema>

export class LearningProgressService {
  private adapter: LegacyProgressAdapter

  constructor(private prisma: PrismaClient) {
    this.adapter = new LegacyProgressAdapter(prisma)
  }

  /**
   * Updates or creates a learning progress record.
   * Enforces rules like "completed" cannot be downgraded.
   */
  async updateProgress(
    userId: number,
    contentType: string,
    contentId: string,
    dto: UpdateProgressDto,
    source?: string
  ): Promise<LearningProgressItem> {
    if (!validContentTypes.includes(contentType as any)) {
      throw new Error(`Invalid content type: ${contentType}`)
    }

    const validated = UpdateProgressSchema.parse(dto)

    // Check existing
    const existing = await this.prisma.learningProgress.findUnique({
      where: { userId_contentType_contentId: { userId, contentType, contentId } }
    })

    let newStatus = validated.status
    let newCompletedAt = existing?.completedAt

    // Completed regression prevention
    if (existing?.status === 'completed' && validated.status !== 'completed') {
      newStatus = 'completed' // Force it back
    }
    if (newStatus === 'completed' && !existing?.completedAt) {
      newCompletedAt = new Date()
    }

    const now = new Date()

    const upserted = await this.prisma.learningProgress.upsert({
      where: { userId_contentType_contentId: { userId, contentType, contentId } },
      create: {
        userId,
        contentType,
        contentId,
        contentCode: validated.contentCode,
        status: newStatus,
        progressPercent: validated.progressPercent,
        lastPositionJson: validated.lastPositionJson ?? undefined,
        continueLater: validated.continueLater ?? false,
        startedAt: now,
        lastViewedAt: now,
        completedAt: newCompletedAt,
        source: source || 'api',
      },
      update: {
        status: newStatus,
        contentCode: validated.contentCode ?? existing?.contentCode,
        progressPercent: validated.progressPercent !== undefined ? validated.progressPercent : existing?.progressPercent,
        lastPositionJson: validated.lastPositionJson !== undefined ? validated.lastPositionJson : existing?.lastPositionJson,
        continueLater: validated.continueLater !== undefined ? validated.continueLater : existing?.continueLater,
        lastViewedAt: now,
        completedAt: newCompletedAt,
        source: source || existing?.source,
      }
    })

    return this.mapToItem(upserted)
  }

  /**
   * Lists progress records, mixing in legacy adapter logic where appropriate
   * if querying for everything.
   */
  async listProgress(userId: number, options?: { contentType?: string, status?: string, limit?: number }): Promise<LearningProgressItem[]> {
    const where: any = { userId }
    if (options?.contentType) where.contentType = options.contentType
    if (options?.status) where.status = options.status

    const records = await this.prisma.learningProgress.findMany({
      where,
      orderBy: { lastViewedAt: 'desc' },
      take: options?.limit || 100,
    })

    const mapped = records.map(r => this.mapToItem(r))

    // Note: A full implementation might fetch ALL legacy lessons/courses here and merge.
    // For Phase 8 MVP, we rely on standard records and continue/recent specific endpoints.
    return mapped
  }

  async getRecentContent(userId: number, limit = 10): Promise<LearningProgressItem[]> {
    // Return recent items ordered by lastViewedAt
    // Also merge with legacy adapter? The Legacy adapter requires specific ID to fetch.
    // For recent, we will just rely on the new table. Any content interacted with post-migration will be here.
    const records = await this.prisma.learningProgress.findMany({
      where: { userId },
      orderBy: { lastViewedAt: 'desc' },
      take: limit,
    })
    return records.map(r => this.mapToItem(r))
  }

  async getContinueLearning(userId: number, limit = 10): Promise<LearningProgressItem[]> {
    // Priority:
    // 1. continueLater = true
    // 2. incomplete Decision Check
    // 3. in_progress items
    
    const records = await this.prisma.learningProgress.findMany({
      where: { userId, status: { not: 'completed' } },
      orderBy: [
        { continueLater: 'desc' },
        { lastViewedAt: 'desc' }
      ],
      take: limit,
    })

    return records.map(r => this.mapToItem(r))
  }

  async getProgress(userId: number, contentType: string, contentId: string): Promise<LearningProgressItem | null> {
    const current = await this.prisma.learningProgress.findUnique({
      where: { userId_contentType_contentId: { userId, contentType, contentId } }
    })
    const currentItem = current ? this.mapToItem(current) : null

    // Check legacy
    let legacyItem: LearningProgressItem | null = null
    if (contentType === 'lesson') {
      legacyItem = await this.adapter.getLessonProgress(userId, parseInt(contentId, 10))
    } else if (contentType === 'course') {
      legacyItem = await this.adapter.getCourseProgress(userId, parseInt(contentId, 10))
    }

    return this.adapter.merge(legacyItem, currentItem)
  }

  private mapToItem(record: any): LearningProgressItem {
    return {
      id: record.id,
      userId: record.userId,
      contentType: record.contentType,
      contentId: record.contentId,
      contentCode: record.contentCode,
      status: record.status as any,
      progressPercent: record.progressPercent,
      continueLater: record.continueLater,
      startedAt: record.startedAt,
      lastViewedAt: record.lastViewedAt,
      completedAt: record.completedAt,
      source: record.source,
    }
  }
}
