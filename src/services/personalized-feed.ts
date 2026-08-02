import { prisma } from '../lib/prisma.js'

export class PersonalizedFeedService {
  /**
   * Fetch the personalized feed for a user.
   */
  static async getFeed(userId: number, limit = 10) {
    // We need to fetch candidates from various sources.
    // 1. Incomplete Decision Checks
    // 2. Continue Learning
    // 3. Saved Practical Cards
    // 4. Role matched Decision Checks / Practical Cards
    // 5. New Published Practical Cards

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, businessProfile: true }
    });

    if (!user) throw new Error('User not found');

    const feedItems: any[] = [];
    const entitySet = new Set<string>();

    // We also need to fetch interactions (dismissed/viewed)
    const interactions = await prisma.feedInteraction.findMany({
      where: { userId }
    });
    
    const dismissedKeys = new Set(
      interactions.filter(i => i.dismissedAt).map(i => i.itemKey)
    );

    // --- Candidate Generators ---

    // 1. Incomplete Decision Check Session
    const incompleteSessions = await prisma.decisionCheckSession.findMany({
      where: { 
        userId, 
        status: { in: ['in_progress', 'draft'] }
      },
      include: { decisionCheck: true },
      orderBy: { updatedAt: 'desc' }
    });

    for (const session of incompleteSessions) {
      if (!session.decisionCheck) continue;
      if (!session.decisionCheck.published) continue;
      
      const itemKey = `decision_check:session:${session.id}`;
      if (dismissedKeys.has(itemKey)) continue;

      const entityIdStr = String(session.decisionCheck.id);
      if (entitySet.has(`decision_check:${entityIdStr}`)) continue;

      feedItems.push({
        itemKey,
        type: 'decision_check',
        title: session.decisionCheck.title,
        shortDescription: session.decisionCheck.description?.substring(0, 100) || '',
        reasonCode: 'INCOMPLETE_DECISION_CHECK',
        reasonText: 'Başladığınız kontrol henüz tamamlanmadı.',
        priority: 1,
        primaryAction: {
          code: 'resume_decision_check',
          label: 'Devam Et',
          route: `/app/decision-checks/session/${session.id}`
        },
        sourceEntityType: 'decision_check',
        sourceEntityId: entityIdStr,
        sourceEntityCode: session.decisionCheck.code || null
      });

      entitySet.add(`decision_check:${entityIdStr}`);
    }

    // 2. Continue Learning
    const enrollments = await prisma.enrollment.findMany({
      where: { userId, status: 'in_progress' },
      include: { course: true },
      orderBy: { updatedAt: 'desc' }
    });

    if (enrollments.length > 0) {
      const resume = enrollments[0];
      const itemKey = `continue_learning:course:${resume.courseId}`;
      
      if (!dismissedKeys.has(itemKey) && !entitySet.has(`continue_learning:${resume.courseId}`)) {
        feedItems.push({
          itemKey,
          type: 'continue_learning',
          title: resume.course.title,
          shortDescription: resume.course.description?.substring(0, 100) || '',
          reasonCode: 'CONTINUE_RECENT_CONTENT',
          reasonText: 'Son kaldığınız yerden devam edin.',
          priority: 2,
          primaryAction: {
            code: 'continue_content',
            label: 'Devam Et',
            route: `/app/enrollments`
          },
          sourceEntityType: 'course',
          sourceEntityId: String(resume.courseId),
          sourceEntityCode: null
        });
        entitySet.add(`continue_learning:${resume.courseId}`);
      }
    }

    // 3. Saved Practical Cards
    const savedCards = await prisma.practicalCardSave.findMany({
      where: { userId },
      include: { practicalCard: true },
      orderBy: { createdAt: 'desc' }
    });

    for (const save of savedCards) {
      if (!save.practicalCard) continue;
      if (!save.practicalCard.published) continue;
      
      const itemKey = `practical_card:${save.practicalCard.code}`;
      if (dismissedKeys.has(itemKey)) continue;

      const entityIdStr = String(save.practicalCard.id);
      if (entitySet.has(`practical_card:${entityIdStr}`)) continue;

      feedItems.push({
        itemKey,
        type: 'practical_card',
        title: save.practicalCard.title,
        shortDescription: save.practicalCard.shortDescription?.substring(0, 100) || '',
        reasonCode: 'SAVED_PRACTICAL_CARD',
        reasonText: 'Kaydettiğiniz bu kartı tekrar inceleyebilirsiniz.',
        priority: 3,
        primaryAction: {
          code: 'open_practical_card',
          label: 'İncele',
          route: `/app/practical-cards/${save.practicalCard.code}`
        },
        sourceEntityType: 'practical_card',
        sourceEntityId: entityIdStr,
        sourceEntityCode: save.practicalCard.code
      });

      entitySet.add(`practical_card:${entityIdStr}`);
    }

    // 4. Role Match Decision Checks
    const publishedDCs = await prisma.decisionCheck.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' }
    });

    for (const dc of publishedDCs) {
      const itemKey = `decision_check:definition:${dc.code}`;
      if (dismissedKeys.has(itemKey)) continue;
      
      const entityIdStr = String(dc.id);
      if (entitySet.has(`decision_check:${entityIdStr}`)) continue;

      feedItems.push({
        itemKey,
        type: 'decision_check',
        title: dc.title,
        shortDescription: dc.description?.substring(0, 100) || '',
        reasonCode: 'ROLE_MATCH_DECISION_CHECK',
        reasonText: 'Rolünüze uygun bir karar kontrolü.',
        priority: 4,
        primaryAction: {
          code: 'start_decision_check',
          label: 'Başla',
          route: `/app/decision-checks/start/${dc.code}`
        },
        sourceEntityType: 'decision_check',
        sourceEntityId: entityIdStr,
        sourceEntityCode: dc.code
      });

      entitySet.add(`decision_check:${entityIdStr}`);
    }

    // 5. Role Match / New Practical Cards
    const publishedCards = await prisma.practicalCard.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' }
    });

    for (const pc of publishedCards) {
      const itemKey = `practical_card:${pc.code}`;
      if (dismissedKeys.has(itemKey)) continue;
      
      const entityIdStr = String(pc.id);
      if (entitySet.has(`practical_card:${entityIdStr}`)) continue;

      feedItems.push({
        itemKey,
        type: 'practical_card',
        title: pc.title,
        shortDescription: pc.shortDescription?.substring(0, 100) || '',
        reasonCode: 'NEW_PRACTICAL_CARD',
        reasonText: 'İşletmeniz için faydalı olabilecek kısa bir uygulama kartı.',
        priority: 6,
        primaryAction: {
          code: 'open_practical_card',
          label: 'İncele',
          route: `/app/practical-cards/${pc.code}`
        },
        sourceEntityType: 'practical_card',
        sourceEntityId: entityIdStr,
        sourceEntityCode: pc.code
      });

      entitySet.add(`practical_card:${entityIdStr}`);
    }

    // Apply Sorting and Filters (Max two of the same type sequentially)
    // Deterministic sort: priority ASC, then itemKey ASC
    feedItems.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.itemKey.localeCompare(b.itemKey);
    });

    const finalItems: any[] = [];
    let lastType = null;
    let typeCount = 0;

    for (const item of feedItems) {
      if (finalItems.length >= limit) break;

      if (item.type === lastType) {
        typeCount++;
      } else {
        lastType = item.type;
        typeCount = 1;
      }

      if (typeCount > 2) {
        continue;
      }

      finalItems.push(item);
    }

    // Add viewed / dismissed status
    const interactedItems = finalItems.map(item => {
      const interaction = interactions.find(i => i.itemKey === item.itemKey);
      return {
        ...item,
        viewed: !!interaction?.viewedAt,
        dismissed: !!interaction?.dismissedAt
      };
    });

    return interactedItems;
  }

  static async recordInteraction(userId: number, itemKey: string, action: 'view' | 'dismiss') {
    const existing = await prisma.feedInteraction.findUnique({
      where: { userId_itemKey: { userId, itemKey } }
    });

    if (existing) {
      if (action === 'view' && !existing.viewedAt) {
        await prisma.feedInteraction.update({
          where: { id: existing.id },
          data: { viewedAt: new Date() }
        });
      } else if (action === 'dismiss' && !existing.dismissedAt) {
        await prisma.feedInteraction.update({
          where: { id: existing.id },
          data: { dismissedAt: new Date() }
        });
      }
    } else {
      // Need to extract sourceEntityType, sourceEntityId etc from itemKey if possible
      // e.g. decision_check:session:ID
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
          ...(action === 'view' ? { viewedAt: new Date() } : {}),
          ...(action === 'dismiss' ? { dismissedAt: new Date() } : {})
        }
      });
    }
  }
}
