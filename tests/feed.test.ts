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
    feedInteraction: { 
      findMany: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
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
    prisma.user.findUnique.mockResolvedValue({ role: 'learner', businessProfile: null })
  })

  it('should return empty feed if nothing matches', async () => {
    const feed = await PersonalizedFeedService.getFeed(userId, 10)
    expect(feed).toEqual([])
  })

  it('should prioritize continue_learning (priority 2) and decision_check (priority 1)', async () => {
    prisma.enrollment.findMany.mockResolvedValue([
      { id: 'enr1', course: { id: 'c1', title: 'Course 1' }, progress: 50, lastAccessedAt: new Date() }
    ])
    prisma.decisionCheckSession.findMany.mockResolvedValue([
      { id: 'dc1', decisionCheck: { title: 'Decision 1', description: '...', code: 'dc1', published: true } }
    ])

    const feed = await PersonalizedFeedService.getFeed(userId, 10)
    expect(feed.length).toBe(2)
    // Decision check has priority 1, continue learning has 2
    expect(feed[0].type).toBe('decision_check')
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
    expect(feed.length).toBe(0)
  })

  it('should restrict duplicate consecutive types', async () => {
    // Generate 5 practical cards
    const cards = Array.from({ length: 5 }).map((_, i) => ({
      id: `pc${i}`, title: `Card ${i}`, content: '...', knowledgeObject: { code: 'ko1' }
    }))
    prisma.practicalCard.findMany.mockResolvedValue(cards)

    const feed = await PersonalizedFeedService.getFeed(userId, 10)
    // The service has a limit of 2 of the same type consecutively, 
    // but since they are all priority 3, it will only take 2 and then stop taking more practical cards 
    // until another type is found. Since no other type exists, it should return 2.
    expect(feed.length).toBe(2)
  })

  it('should limit total items to specified limit', async () => {
    const cards = Array.from({ length: 15 }).map((_, i) => ({
      id: `pc${i}`, title: `Card ${i}`, content: '...', knowledgeObject: { code: 'ko1' }
    }))
    prisma.practicalCard.findMany.mockResolvedValue(cards)
    // Add other types to break up the consecutives
    prisma.decisionCheck.findMany.mockResolvedValue([
      { id: 'dc1', code: 'dc1', title: 'Decision 1', content: '...', completed: false },
      { id: 'dc2', code: 'dc2', title: 'Decision 2', content: '...', completed: false }
    ])

    const feed = await PersonalizedFeedService.getFeed(userId, 4)
    expect(feed.length).toBe(4)
  })
})
