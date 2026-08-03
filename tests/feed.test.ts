import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PersonalizedFeedService } from '../src/services/personalized-feed'
import { prisma } from '../src/lib/prisma'

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    decisionCheckSession: { findMany: vi.fn() },
    enrollment: { findMany: vi.fn() },
    practicalCardSave: { findMany: vi.fn() },
    decisionCheck: { findMany: vi.fn() },
    practicalCard: { findMany: vi.fn() },
    knowledgeObject: { findMany: vi.fn() },
    feedInteraction: { 
      findMany: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    learningProgress: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    user: { findUnique: vi.fn() }
  }
}))

describe('PersonalizedFeedService', () => {
  const userId = 'user-1'

  beforeEach(() => {
    vi.resetAllMocks()
    prisma.feedInteraction.findMany.mockResolvedValue([])
    prisma.decisionCheckSession.findMany.mockResolvedValue([])
    prisma.enrollment.findMany.mockResolvedValue([])
    prisma.practicalCardSave.findMany.mockResolvedValue([])
    prisma.decisionCheck.findMany.mockResolvedValue([])
    prisma.practicalCard.findMany.mockResolvedValue([])
    prisma.knowledgeObject.findMany.mockResolvedValue([])
    prisma.learningProgress.findMany.mockResolvedValue([])
    prisma.user.findUnique.mockResolvedValue({ role: 'learner', businessProfile: null })
  })

  it('should return empty feed if nothing matches (except financial tools)', async () => {
    const feed = await PersonalizedFeedService.getFeed(userId, 10)
    expect(feed.filter(i => i.type !== 'financial_tool')).toEqual([])
  })

  it('should prioritize continue_learning (priority 2) and decision_check (priority 1)', async () => {
    prisma.learningProgress.findMany.mockResolvedValue([
      {
        id: 'lp-1',
        userId: 'user-1',
        contentType: 'course',
        contentId: 'c1',
        contentCode: null,
        status: 'in_progress',
        continueLater: false,
        lastViewedAt: new Date(),
        completedAt: null
      }
    ])
    prisma.decisionCheckSession.findMany.mockResolvedValue([
      { id: 'dc1', decisionCheck: { title: 'Decision 1', description: '...', code: 'dc1', published: true } }
    ])

    const feed = await PersonalizedFeedService.getFeed(userId, 10)
    const filteredFeed = feed.filter(i => i.type === 'decision_check' || i.type === 'continue_learning')
    expect(filteredFeed.length).toBe(2)
    // Decision check has priority 100, continue learning has 90
    expect(filteredFeed[0].type).toBe('decision_check')
    expect(filteredFeed[1].type).toBe('continue_learning')
    expect(feed[1].type).toBe('continue_learning')
  })

  it('should filter out dismissed items', async () => {
    prisma.feedInteraction.findMany.mockResolvedValue([
      { itemKey: 'decision_check:session:dc1', dismissedAt: new Date() }
    ])
    prisma.decisionCheckSession.findMany.mockResolvedValue([
      { id: 'dc1', decisionCheck: { title: 'Decision 1', description: '...', code: 'dc1', published: true } }
    ])

    const feed = await PersonalizedFeedService.getFeed(userId, 10)
    const dcItems = feed.filter(i => i.type === 'decision_check')
    expect(dcItems.length).toBe(0)
  })

  it('should restrict duplicate consecutive types', async () => {
    // Generate 5 decision checks to test consecutive type limiting
    const checks = Array.from({ length: 5 }).map((_, i) => ({
      id: `dc${i}`, code: `dc${i}`, title: `Decision ${i}`, description: '...', published: true
    }))
    prisma.decisionCheck.findMany.mockResolvedValue(checks)

    const feed = await PersonalizedFeedService.getFeed(userId, 10)
    const dcItems = feed.filter(i => i.type === 'decision_check')
    expect(dcItems.length).toBe(2)
  })

  it('should limit total items to specified limit', async () => {
    const checks = Array.from({ length: 15 }).map((_, i) => ({
      id: `dc${i}`, code: `dc${i}`, title: `Decision ${i}`, description: '...', published: true
    }))
    prisma.decisionCheck.findMany.mockResolvedValue(checks)
    // Add other types to break up the consecutives
    prisma.knowledgeObject.findMany.mockResolvedValue([
      { id: 1, code: 'ko1', title: 'Guide 1', content: '...', status: 'published', isDemo: false },
      { id: 2, code: 'ko2', title: 'Guide 2', content: '...', status: 'published', isDemo: false }
    ])

    const feed = await PersonalizedFeedService.getFeed(userId, 4)
    expect(feed.length).toBe(4)
  })
})
