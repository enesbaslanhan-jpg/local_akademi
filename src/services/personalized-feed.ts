import { prisma } from '../lib/prisma.js'
import { LearningProgressService } from './learning-progress.js'
import { BUSINESS_PROFILE_RECOMMENDED_FIELDS, FINANCIAL_TOOL_REGISTRY } from '../config/feed-config.js'

export class PersonalizedFeedService {
  static async getFeed(userId: number, limit = 10) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, businessProfile: true }
    });

    if (!user) throw new Error('User not found');

    const interactions = await prisma.feedInteraction.findMany({
      where: { userId }
    });
    
    const dismissedKeys = new Set(
      interactions.filter(i => i.dismissedAt).map(i => i.itemKey)
    );

    const actedKeys = new Set(
      interactions.filter(i => i.actedAt).map(i => i.itemKey)
    );

    const entitySet = new Set<string>();
    const feedItems: any[] = [];
    const context = { userId, user, dismissedKeys, actedKeys, entitySet };

    const candidates = [
      ...(await this.buildDecisionCheckCandidates(context)),
      ...(await this.buildContinueLearningCandidates(context)),
      ...(await this.buildBusinessProfileCandidates(context)),
      ...(await this.buildFinancialToolCandidates(context)),
      ...(await this.buildRecommendedGuideCandidates(context))
    ];

    for (const item of candidates) {
      if (dismissedKeys.has(item.itemKey)) continue;
      
      const entityKey = `${item.sourceEntityType}:${item.sourceEntityId}`;
      if (entitySet.has(entityKey)) continue;

      feedItems.push(item);
      entitySet.add(entityKey);
    }

    feedItems.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.itemKey.localeCompare(b.itemKey);
    });

    const finalItems: any[] = [];
    const typeCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    let lastType = null;
    let sequenceCount = 0;

    for (const item of feedItems) {
      if (finalItems.length >= limit) break;

      const type = item.type;
      
      if (type === 'complete_business_profile' && (typeCounts[type] || 0) >= 1) continue;
      if (type === 'recommended_guide' && (typeCounts[type] || 0) >= 2) continue;
      if (type === 'financial_tool' && (typeCounts[type] || 0) >= 2) continue;
      if (type === 'continue_learning' && (typeCounts[type] || 0) >= 1) continue;

      if (type === lastType) {
        sequenceCount++;
      } else {
        lastType = type;
        sequenceCount = 1;
      }

      if (sequenceCount > 2) continue;

      const category = item.categoryId || item.categoryLabel || item.toolCategory;
      if (category) {
        if ((categoryCounts[category] || 0) >= 2) continue;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }

      finalItems.push(item);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    return finalItems.map(item => {
      const interaction = interactions.find(i => i.itemKey === item.itemKey);
      return {
        ...item,
        viewed: !!interaction?.viewedAt,
        dismissed: !!interaction?.dismissedAt
      };
    });
  }

  private static async buildDecisionCheckCandidates(context: any) {
    const candidates: any[] = [];
    const incompleteSessions = await prisma.decisionCheckSession.findMany({
      where: { userId: context.userId, status: { in: ['in_progress', 'draft'] } },
      include: { decisionCheck: true },
      orderBy: { updatedAt: 'desc' }
    });

    for (const session of incompleteSessions) {
      if (!session.decisionCheck || !session.decisionCheck.published) continue;
      
      candidates.push({
        itemKey: `decision_check:session:${session.id}`,
        type: 'decision_check',
        title: session.decisionCheck.title,
        shortDescription: session.decisionCheck.description?.substring(0, 100) || '',
        reasonCode: 'INCOMPLETE_DECISION_CHECK',
        reasonText: 'Başladığınız kontrol henüz tamamlanmadı.',
        priority: 100,
        primaryAction: {
          code: 'resume_decision_check',
          label: 'Devam Et',
          route: `/app/decision-checks/session/${session.id}`
        },
        sourceEntityType: 'decision_check',
        sourceEntityId: String(session.decisionCheck.id),
        sourceEntityCode: session.decisionCheck.code || null
      });
    }

    const publishedDCs = await prisma.decisionCheck.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' }
    });

    for (const dc of publishedDCs) {
      candidates.push({
        itemKey: `decision_check:definition:${dc.code}`,
        type: 'decision_check',
        title: dc.title,
        shortDescription: dc.description?.substring(0, 100) || '',
        reasonCode: 'ROLE_MATCH_DECISION_CHECK',
        reasonText: 'Rolünüze uygun bir karar kontrolü.',
        priority: 78,
        primaryAction: {
          code: 'start_decision_check',
          label: 'Başla',
          route: `/app/decision-checks/${dc.code}`
        },
        sourceEntityType: 'decision_check',
        sourceEntityId: String(dc.id),
        sourceEntityCode: dc.code
      });
    }

    return candidates;
  }

  private static async buildContinueLearningCandidates(context: any) {
    const candidates: any[] = [];
    const lpService = new LearningProgressService(prisma as any);
    const continueLearningItems = await lpService.getContinueLearning(context.userId, 2);

    for (const resume of continueLearningItems) {
      let route = '/app';
      if (resume.contentType === 'course') route = '/app/enrollments';
      else if (resume.contentType === 'decision_check') route = `/app/decision-checks/${resume.contentCode || resume.contentId}`;
      else if (resume.contentType === 'knowledge_object' || resume.contentType === 'lesson') route = `/app/knowledge/${resume.contentCode || resume.contentId}`;

      candidates.push({
        itemKey: `continue_learning:${resume.contentType}:${resume.contentId}`,
        type: 'continue_learning',
        title: resume.title || 'İçerik',
        shortDescription: 'Öğrenme yolculuğunuza devam edin.',
        reasonCode: 'CONTINUE_RECENT_CONTENT',
        reasonText: resume.continueLater ? 'Daha sonra devam etmek üzere işaretlediniz.' : 'Son kaldığınız yerden devam edin.',
        priority: resume.continueLater ? 95 : 90,
        primaryAction: {
          code: 'continue_content',
          label: 'Devam Et',
          route
        },
        sourceEntityType: resume.contentType,
        sourceEntityId: String(resume.contentId),
        sourceEntityCode: resume.contentCode || null
      });
    }

    return candidates;
  }

  private static async buildBusinessProfileCandidates(context: any) {
    const candidates: any[] = [];
    const profile = context.user.businessProfile;

    if (!profile) return candidates;

    const missingFields = BUSINESS_PROFILE_RECOMMENDED_FIELDS.filter(field => {
      const value = (profile as any)[field.key];
      return value === null || value === undefined || value === '' || value === 0 || (Array.isArray(value) && value.length === 0) || value === '[]';
    });

    if (missingFields.length > 0) {
      const itemKey = `complete_business_profile:user:${context.userId}`;
      const labels = missingFields.slice(0, 3).map(f => f.label);
      
      candidates.push({
        itemKey,
        type: 'complete_business_profile',
        title: 'İşletme Profilini Tamamla',
        shortDescription: 'Önerileri işletmenize göre uyarlamak için birkaç bilgiyi tamamlayın.',
        reasonCode: 'MISSING_BUSINESS_PROFILE',
        reasonText: 'İşletme profilinizde eksik alanlar bulunuyor.',
        priority: 82,
        primaryAction: {
          code: 'complete_business_profile',
          label: 'İşletme bilgilerini tamamla',
          route: '/app/profile'
        },
        sourceEntityType: 'user',
        sourceEntityId: String(context.userId),
        sourceEntityCode: null,
        missingFieldCount: missingFields.length,
        missingFieldLabels: labels,
        completionRoute: '/app/profile'
      });
    }

    return candidates;
  }

  private static async buildFinancialToolCandidates(context: any) {
    const candidates: any[] = [];
    
    for (const tool of FINANCIAL_TOOL_REGISTRY) {
      if (!tool.enabled) continue;
      
      // Basic role matching (if specified in tool)
      if (tool.supportedRoles && tool.supportedRoles.length > 0 && !tool.supportedRoles.includes(context.user.role)) {
        continue;
      }

      const itemKey = `financial_tool:${tool.code}`;

      candidates.push({
        itemKey,
        type: 'financial_tool',
        title: tool.title,
        shortDescription: 'İncelediğiniz konuyu sayılarla kontrol edebilirsiniz.',
        reasonCode: 'ROLE_MATCH_TOOL',
        reasonText: 'Rolünüze uygun bir işletme aracı.',
        priority: 52,
        primaryAction: {
          code: 'open_financial_tool',
          label: 'Aracı aç',
          route: tool.route
        },
        sourceEntityType: 'financial_tool',
        sourceEntityId: tool.code,
        sourceEntityCode: tool.code,
        toolCode: tool.code,
        toolCategory: 'finance'
      });
    }

    return candidates;
  }

  private static async buildRecommendedGuideCandidates(context: any) {
    const candidates: any[] = [];
    
    const publishedGuides = await prisma.knowledgeObject.findMany({
      where: { 
        status: 'published',
        isDemo: false
      },
      orderBy: { createdAt: 'desc' }
    });

    const completedProgress = await prisma.learningProgress.findMany({
      where: {
        userId: context.userId,
        contentType: 'knowledge_object',
        status: 'completed'
      }
    });

    const completedIds = new Set(completedProgress.map(p => String(p.contentId)));

    for (const guide of publishedGuides) {
      if (completedIds.has(String(guide.id))) continue;

      const itemKey = `recommended_guide:${guide.code || guide.id}`;

      candidates.push({
        itemKey,
        type: 'recommended_guide',
        title: guide.title,
        shortDescription: 'Öğrenme alanınıza uygun yeni bir rehber.',
        reasonCode: 'ROLE_MATCH_GUIDE',
        reasonText: 'Rolünüze uygun bir rehber.',
        priority: 60,
        primaryAction: {
          code: 'open_guide',
          label: 'Rehberi aç',
          route: `/app/knowledge/${guide.code || guide.id}`
        },
        sourceEntityType: 'knowledge_object',
        sourceEntityId: String(guide.id),
        sourceEntityCode: guide.code,
        categoryLabel: 'Rehber',
        categoryId: guide.categoryId
      });
    }

    return candidates;
  }

  static async recordInteraction(userId: number, itemKey: string, action: 'view' | 'dismiss' | 'act', actionCode?: string) {
    const existing = await prisma.feedInteraction.findUnique({
      where: { userId_itemKey: { userId, itemKey } }
    });

    if (existing) {
      const updates: any = {};
      if (action === 'view' && !existing.viewedAt) updates.viewedAt = new Date();
      if (action === 'dismiss' && !existing.dismissedAt) updates.dismissedAt = new Date();
      if (action === 'act' && !existing.actedAt) {
        updates.actedAt = new Date();
        updates.actionCode = actionCode || existing.actionCode;
      }

      if (Object.keys(updates).length > 0) {
        await prisma.feedInteraction.update({
          where: { id: existing.id },
          data: updates
        });
      }
    } else {
      const parts = itemKey.split(':');
      let type = parts[0];
      let itemType = parts[0];
      let sourceEntityId = parts.length > 2 ? parts[2] : (parts.length > 1 ? parts[1] : itemKey);
      let sourceEntityCode = null;

      await prisma.feedInteraction.create({
        data: {
          userId,
          itemKey,
          itemType,
          sourceEntityType: type,
          sourceEntityId,
          sourceEntityCode,
          viewedAt: action === 'view' ? new Date() : null,
          dismissedAt: action === 'dismiss' ? new Date() : null,
          actedAt: action === 'act' ? new Date() : null,
          actionCode: action === 'act' ? actionCode : null
        }
      });
    }
  }
}
