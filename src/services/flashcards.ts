import { PrismaClient } from '@prisma/client';
import { computeNextReview } from './spaced-repetition';
import { recomputeLessonAndEnrollment } from './course-progress';

const prisma = new PrismaClient();

export async function getFlashcardsByKoId(koId: number, userId: number) {
  const ko = await prisma.knowledgeObject.findUnique({
    where: { id: koId },
    select: { status: true, isDemo: true },
  });
  if (!ko || ko.status !== 'published' || ko.isDemo) return null;

  const cards = await prisma.flashcard.findMany({
    where: { koId, status: 'published' },
    orderBy: { order: 'asc' },
    include: {
      reviews: { where: { userId }, orderBy: { reviewedAt: 'desc' }, take: 1 },
    },
  });

  const progress = await prisma.flashcardProgress.findUnique({
    where: { userId_koId: { userId, koId } },
  });

  return {
    koId,
    totalCards: cards.length,
    progress: progress ? { seen: progress.seenCount, mastered: progress.masteredCount, percent: progress.percent } : null,
    cards: cards.map(c => ({
      id: c.id,
      front: c.front,
      back: c.back,
      hint: c.hint,
      order: c.order,
      lastReview: c.reviews[0] ? {
        rating: c.reviews[0].rating,
        dueAt: c.reviews[0].dueAt,
        repetition: c.reviews[0].repetition,
      } : null,
    })),
  };
}

export async function submitReview(
  flashcardId: string,
  userId: number,
  rating: 'again' | 'hard' | 'good' | 'easy'
) {
  const card = await prisma.flashcard.findUnique({
    where: { id: flashcardId },
    select: {
      id: true,
      koId: true,
      status: true,
      knowledgeObject: { select: { status: true, isDemo: true } },
      reviews: { where: { userId }, orderBy: { reviewedAt: 'desc' }, take: 1 },
    },
  });

  if (!card) return { error: 'Flashcard not found', status: 404 };
  if (card.status !== 'published') return { error: 'Flashcard is not published', status: 403 };
  if (card.knowledgeObject.status !== 'published' || card.knowledgeObject.isDemo) {
    return { error: 'Knowledge object is not published', status: 404 };
  }

  const lastReview = card.reviews[0];
  const currentInterval = lastReview?.intervalDays || 0;
  const currentEase = lastReview?.easeFactor || 2.5;
  const currentRep = lastReview?.repetition || 0;

  const now = new Date();
  const next = computeNextReview(rating, currentInterval, currentEase, currentRep, now);

  const review = await prisma.flashcardReview.create({
    data: {
      userId,
      flashcardId: card.id,
      rating,
      intervalDays: next.intervalDays,
      easeFactor: next.easeFactor,
      repetition: next.repetition,
      dueAt: next.dueAt,
      reviewedAt: now,
    },
  });

  // Update or create FlashcardProgress
  const allCardsForKo = await prisma.flashcard.count({ where: { koId: card.koId, status: 'published' } });
  const reviewedCards = await prisma.flashcardReview.groupBy({
    by: ['flashcardId'],
    where: { flashcard: { koId: card.koId, status: 'published' }, userId },
  });
  const masteredCards = await prisma.flashcardReview.groupBy({
    by: ['flashcardId'],
    where: { flashcard: { koId: card.koId }, userId, rating: { in: ['good', 'easy'] }, repetition: { gte: 2 } },
  });
  const seenCount = reviewedCards.length;
  const percent = allCardsForKo > 0 ? Math.round((seenCount / allCardsForKo) * 100) : 0;

  await prisma.flashcardProgress.upsert({
    where: { userId_koId: { userId, koId: card.koId } },
    create: { userId, koId: card.koId, seenCount, masteredCount: masteredCards.length, percent, lastReviewedAt: now },
    update: { seenCount, masteredCount: masteredCards.length, percent, lastReviewedAt: now },
  });

  const lessons = await prisma.lesson.findMany({
    where: { knowledgeObjectId: card.koId },
    select: { id: true },
  });
  for (const lesson of lessons) {
    await recomputeLessonAndEnrollment(prisma, userId, lesson.id, { flashcardPercent: percent });
  }

  return {
    id: review.id,
    rating,
    nextDueAt: next.dueAt,
    intervalDays: next.intervalDays,
    easeFactor: next.easeFactor,
    repetition: next.repetition,
    progress: { seen: seenCount, mastered: masteredCards.length, percent },
  };
}

export async function getDueFlashcards(userId: number, limit = 20) {
  const now = new Date();
  const cards = await prisma.flashcard.findMany({
    where: {
      status: 'published',
      knowledgeObject: { status: 'published', isDemo: false },
    },
    orderBy: [{ koId: 'asc' }, { order: 'asc' }],
    include: {
      knowledgeObject: { select: { id: true, title: true, code: true } },
      reviews: { where: { userId }, orderBy: { reviewedAt: 'desc' }, take: 1 },
    },
  });

  // A card that has never been reviewed is immediately due. For reviewed cards,
  // only the latest review controls eligibility; older due rows must not revive it.
  const dueCards = cards
    .filter(card => !card.reviews[0] || card.reviews[0].dueAt <= now)
    .sort((a, b) => {
      const aDue = a.reviews[0]?.dueAt?.getTime() ?? 0;
      const bDue = b.reviews[0]?.dueAt?.getTime() ?? 0;
      return aDue - bDue || a.koId - b.koId || a.order - b.order;
    })
    .slice(0, limit);

  const result: Record<number, { koId: number; koTitle: string; koCode: string; cards: any[] }> = {};
  for (const card of dueCards) {
    const koId = card.koId;
    if (!result[koId]) {
      result[koId] = {
        koId,
        koTitle: card.knowledgeObject.title,
        koCode: card.knowledgeObject.code || '',
        cards: [],
      };
    }
    result[koId].cards.push({
      id: card.id,
      front: card.front,
      back: card.back,
      hint: card.hint,
      order: card.order,
      koId,
      koTitle: card.knowledgeObject.title,
      koCode: card.knowledgeObject.code || '',
    });
  }

  return Object.values(result);
}
