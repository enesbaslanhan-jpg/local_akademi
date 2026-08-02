import { describe, it, expect, vi } from 'vitest';
import { resolveContext } from '../src/services/mentor-context';

// Mock prisma
vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    knowledgeObject: {
      findFirst: vi.fn().mockResolvedValue({
        title: 'Müşteri İletişimi',
        summary: 'Müşteri iletişimi hakkında',
        category: { name: 'İletişim' }
      })
    },
    practicalCard: {
      findUnique: vi.fn().mockResolvedValue({
        title: 'Satış Kartı',
        type: 'guide',
        shortDescription: 'Satış rehberi'
      })
    },
    decisionCheckResult: {
      findUnique: vi.fn().mockResolvedValue({
        status: 'completed',
        decisionCheck: { code: 'DC-001' }
      })
    },
    learningProgress: {
      findFirst: vi.fn().mockResolvedValue({
        status: 'in_progress'
      })
    },
    feedInteraction: {
      findFirst: vi.fn().mockResolvedValue({
        itemType: 'practical_card',
        itemCode: 'PC-001'
      })
    }
  }
}));

describe('Mentor Context Service', () => {
  describe('resolveContext', () => {
    it('returns valid: true for null envelope', async () => {
      const result = await resolveContext(null, 1);
      expect(result.valid).toBe(true);
    });

    it('rejects an invalid context type', async () => {
      const data = {
        contextType: 'invalid_type' as any,
        source: 'content_detail' as any,
        title: 'Bilinmeyen İçerik'
      };
      
      const result = await resolveContext(data, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid context schema');
    });

    it('generates prompt additions for knowledge_object', async () => {
      const data = {
        contextType: 'knowledge_object' as const,
        source: 'content_detail' as const,
        knowledgeObjectCode: 'KO-001',
        title: 'Müşteri İletişimi',
        route: '/app/knowledge/KO-001'
      };
      
      const result = await resolveContext(data, 1);
      expect(result.valid).toBe(true);
      expect(result.systemPromptAdditions).toContain('Müşteri İletişimi');
      expect(result.starterPrompts?.length).toBeGreaterThan(0);
    });

    it('generates prompt additions for feed_recommendation', async () => {
      const data = {
        contextType: 'feed_recommendation' as const,
        source: 'feed' as const,
        feedItemKey: 'feed_req_123',
        title: 'Yeni Özellikler',
        route: '/app/feed'
      };
      
      const result = await resolveContext(data, 1);
      expect(result.valid).toBe(true);
    });
  });
});
