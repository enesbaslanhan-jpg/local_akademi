import type { GeneratedQuizDraft } from './quiz-generator'

function significantTokens(value: string): Set<string> {
  const stopWords = new Set([
    'acaba', 'ancak', 'bana', 'bunu', 'cevap', 'daha', 'doğru',
    'göre', 'hangi', 'için', 'kadar', 'nasıl', 'nedir', 'olan',
    'olarak', 'olur', 'soru', 'şekilde', 'veya',
  ])
  return new Set(
    value
      .toLocaleLowerCase('tr-TR')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(token => token.length >= 4 && !stopWords.has(token)),
  )
}

export function evaluateGeneratedQuizQuality(
  source: { title: string; content: string },
  quiz: GeneratedQuizDraft,
): { pass: boolean; score: number } {
  const sourceTokens = significantTokens(`${source.title} ${source.content}`)
  const uniqueQuestions =
    new Set(quiz.questions.map(question =>
      question.questionText.toLocaleLowerCase('tr-TR'),
    )).size === quiz.questions.length
  const grounded = quiz.questions.filter(question => {
    const tokens = significantTokens(
      `${question.questionText} ${question.explanation}`,
    )
    return Array.from(tokens).filter(token => sourceTokens.has(token)).length >= 2
  }).length
  const groundedRatio = grounded / quiz.questions.length
  const answerIntegrity = quiz.questions.every(question =>
    question.options.filter(option =>
      option === question.correctAnswer
    ).length === 1 &&
    new Set(question.options).size === question.options.length
  )
  const score = Number((
    (uniqueQuestions ? 0.2 : 0) +
    (answerIntegrity ? 0.3 : 0) +
    groundedRatio * 0.5
  ).toFixed(3))
  return {
    pass: uniqueQuestions && answerIntegrity && groundedRatio >= 0.8,
    score,
  }
}

