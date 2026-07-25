import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

interface GeneratedQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  order: number;
}

function mulberry32(a: number): () => number {
  let state = a;
  return () => {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededPick<T>(arr: T[], seed: number): T {
  const rng = mulberry32(seed);
  return arr[Math.floor(rng() * arr.length)];
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  const rng = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function extractSentences(text: string): string[] {
  return text
    .replace(/##.*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .split(/[.!\n]+/)
    .map(s => s.trim().replace(/[\[\]]/g, ''))
    .filter(s => s.length > 20 && s.length < 300);
}

function extractKeyStatements(text: string): string[] {
  const lines = text.split('\n')
    .map(l => l.trim().replace(/^[-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1'))
    .filter(l => l.length > 30 && l.length < 350 && !l.startsWith('##') && !l.startsWith('!['));
  return lines;
}

function generateDistractors(correct: string, allSentences: string[], seed: number): string[] {
  const pool = allSentences.filter(s => s !== correct && s.length > 15);
  const shuffled = seededShuffle(pool, seed);
  return shuffled.slice(0, 3).map(s => s.length > 120 ? s.slice(0, 117) + '...' : s);
}

export function generateQuestionsForContent(
  koId: number,
  content: string,
  title: string,
  existingFlashcards: string[]
): GeneratedQuestion[] {
  const seed = crypto.createHash('md5').update(`quiz-${koId}`).digest().readUInt32BE(0);
  const sentences = extractSentences(content);
  const statements = extractKeyStatements(content);
  const all = [...sentences, ...statements];
  const shuffled = seededShuffle([...Array(20).keys()], seed);

  const questions: GeneratedQuestion[] = [];

  for (let i = 0; i < 5; i++) {
    const qType = shuffled[i] % 4;
    const rng = mulberry32(seed + i + 1);

    switch (qType) {
      case 0: {
        const s = statements[i % statements.length] || seededPick(all, seed + i);
        const words = s.split(' ');
        if (words.length < 4) break;
        const idx = Math.floor(rng() * words.length);
        const blank = words[idx];
        const front = words.map((w, j) => j === idx ? '______' : w).join(' ');
        const distractors = generateDistractors(blank, all, seed + i + 10);
        if (distractors.length < 3) break;
        questions.push({
          questionText: `"${front}" cümlesinde boşluğa hangi kelime gelmelidir?`,
          options: seededShuffle([blank, ...distractors], seed + i + 20),
          correctAnswer: blank,
          explanation: `Doğru cevap: "${blank}". ${s.slice(0, 100)}`,
          order: questions.length + 1,
        });
        break;
      }
      case 1: {
        const statement = seededPick(statements.length > 3 ? statements : all, seed + i);
        const isTrue = rng() > 0.5;
        const modified = isTrue ? statement : `"${title}" ile ilgili yanlış bir ifade: ${statement}`;
        questions.push({
          questionText: `Aşağıdaki ifade doğru mu? "${modified.slice(0, 100)}..."`,
          options: shuffleArray(['Doğru', 'Yanlış', 'Bu bilgi mevcut değil', 'Kısmen doğru'], seed + i + 5),
          correctAnswer: isTrue ? 'Doğru' : 'Yanlış',
          explanation: isTrue
            ? `İfade doğrudur. ${statement.slice(0, 120)}`
            : `İfade yanlıştır. ${content.slice(0, 150)}`,
          order: questions.length + 1,
        });
        break;
      }
      case 2: {
        const correct = seededPick(all, seed + i + 3);
        const distractors = generateDistractors(correct, all, seed + i + 15);
        if (distractors.length < 3) break;
        questions.push({
          questionText: `"${title}" ile ilgili olarak aşağıdakilerden hangisi doğrudur?`,
          options: seededShuffle([correct, ...distractors], seed + i + 25),
          correctAnswer: correct,
          explanation: `Doğru: ${correct.slice(0, 150)}`,
          order: questions.length + 1,
        });
        break;
      }
      case 3: {
        const flashcard = seededPick(existingFlashcards, seed + i);
        if (!flashcard || flashcard.length < 10) break;
        const distractors = generateDistractors(flashcard, all, seed + i + 7);
        if (distractors.length < 3) break;
        questions.push({
          questionText: `${flashcard.slice(0, 80)}...?`,
          options: seededShuffle([flashcard, ...distractors], seed + i + 30),
          correctAnswer: flashcard,
          explanation: `Flashcard içeriği: ${flashcard.slice(0, 150)}`,
          order: questions.length + 1,
        });
        break;
      }
    }
  }

  return questions.slice(0, 5).filter(q => q.options.length === 4);
}

function shuffleArray<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function generateAndSaveQuiz(
  koId: number,
  title: string,
  content: string,
  flashcardBacks: string[]
): Promise<{ quizId: string; questionCount: number } | { error: string }> {
  const ko = await prisma.knowledgeObject.findUnique({ where: { id: koId } });
  if (!ko) return { error: 'KO not found' };

  const questions = generateQuestionsForContent(koId, content, title, flashcardBacks);
  if (questions.length === 0) return { error: 'Could not generate questions' };
  if (questions.length < 5) return { error: `Only ${questions.length} questions generated, need 5` };

  // If quiz already exists, do not modify — preserve canonical questions
  const existing = await prisma.quiz.findFirst({ where: { koId } });
  if (existing) {
    const questionCount = await prisma.quizQuestion.count({ where: { quizId: existing.id } });
    return { quizId: existing.id, questionCount };
  }

  const quiz = await prisma.quiz.create({
    data: {
      koId,
      title: `${title} - Bilgi Testi`,
      passScore: 70,
      questions: {
        create: questions.map(q => ({
          questionText: q.questionText,
          options: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          order: q.order,
        })),
      },
    },
    include: { questions: true },
  });

  return { quizId: quiz.id, questionCount: quiz.questions.length };
}
