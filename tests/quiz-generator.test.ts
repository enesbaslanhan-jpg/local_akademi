import { describe, expect, it, vi } from 'vitest'
import {
  generateQuizDraft,
  generatedQuizSchema,
} from '../src/services/quiz-generator'

const validDraft = {
  title: 'Nakit Akışı Temel Quiz',
  passScore: 70,
  questions: Array.from({ length: 3 }, (_, index) => ({
    questionText: `Nakit akışıyla ilgili doğru ifade hangisidir ${index + 1}?`,
    options: ['Doğru seçenek', 'Yanlış seçenek'],
    correctAnswer: 'Doğru seçenek',
    explanation: 'Kaynağa göre doğru seçenek budur.',
  })),
}

describe('AI quiz draft generation', () => {
  it('accepts a bounded single-answer Turkish quiz', () => {
    expect(generatedQuizSchema.parse(validDraft)).toEqual(validDraft)
  })

  it('rejects answers that are not exactly one option', () => {
    const invalid = structuredClone(validDraft)
    invalid.questions[0].correctAnswer = 'Listede yok'
    expect(() => generatedQuizSchema.parse(invalid)).toThrow()
  })

  it('rejects duplicate options and fewer than three questions', () => {
    const duplicate = structuredClone(validDraft)
    duplicate.questions[0].options = ['Aynı', 'Aynı']
    duplicate.questions[0].correctAnswer = 'Aynı'
    expect(() => generatedQuizSchema.parse(duplicate)).toThrow()
    expect(() =>
      generatedQuizSchema.parse({
        ...validDraft,
        questions: validDraft.questions.slice(0, 2),
      }),
    ).toThrow()
  })

  it('validates provider output before returning a draft', async () => {
    const provider = {
      generate: vi.fn(async () => validDraft),
    }
    await expect(
      generateQuizDraft(
        {
          code: 'KO-1',
          title: 'Nakit Akışı',
          content: 'Kaynak içerik',
        },
        provider,
      ),
    ).resolves.toEqual(validDraft)
    expect(provider.generate).toHaveBeenCalledOnce()
  })
})
