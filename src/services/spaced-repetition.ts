export function computeNextReview(
  rating: 'again' | 'hard' | 'good' | 'easy',
  currentInterval: number,
  currentEase: number,
  currentRepetition: number,
  now: Date = new Date()
): { intervalDays: number; easeFactor: number; repetition: number; dueAt: Date } {
  let interval = currentInterval;
  let ease = Math.max(1.3, currentEase);
  let rep = currentRepetition;

  switch (rating) {
    case 'again':
      rep = 0;
      interval = 0;
      ease = Math.max(1.3, ease - 0.2);
      break;
    case 'hard':
      rep += 1;
      interval = Math.max(1, Math.round((interval || 1) * 1.2));
      ease = Math.max(1.3, ease - 0.15);
      break;
    case 'good':
      rep += 1;
      if (rep === 1) interval = 1;
      else if (rep === 2) interval = 6;
      else interval = Math.round((interval || 1) * ease);
      break;
    case 'easy':
      rep += 1;
      if (rep === 1) interval = 4;
      else if (rep === 2) interval = 10;
      else interval = Math.round((interval || 1) * ease * 1.3);
      ease = Math.min(3.0, ease + 0.1);
      break;
  }

  const dueAt = new Date(now.getTime() + interval * 86400000);

  return { intervalDays: interval, easeFactor: ease, repetition: rep, dueAt };
}
