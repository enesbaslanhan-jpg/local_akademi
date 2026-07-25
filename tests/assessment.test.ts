import { describe, expect, it } from 'vitest'
import { ASSESSMENT_QUESTIONS, calculateScores } from '../src/services/assessment'

describe('İşletme değerlendirmesi', () => {
  it('sekiz alan için üçer soru sunar', () => {
    expect(ASSESSMENT_QUESTIONS).toHaveLength(24)

    const counts = ASSESSMENT_QUESTIONS.reduce<Record<string, number>>((result, question) => {
      result[question.domain] = (result[question.domain] || 0) + 1
      return result
    }, {})

    expect(Object.keys(counts)).toHaveLength(8)
    expect(Object.values(counts)).toEqual(Array(8).fill(3))
    expect(new Set(ASSESSMENT_QUESTIONS.map(question => question.id)).size).toBe(24)
  })

  it('Likert yanıtlarını alan bazında 0–100 puana dönüştürür', () => {
    const answers = Object.fromEntries(
      ASSESSMENT_QUESTIONS.map(question => [question.id, question.domain === 'finance' ? '4' : '2'])
    )

    expect(calculateScores(answers)).toEqual({
      finance: 100,
      sales: 50,
      operations: 50,
      people: 50,
      supply: 50,
      cyber: 50,
      export: 50,
      ai: 50
    })
  })

  it('ara puanları en yakın tam sayıya yuvarlar', () => {
    const answers = Object.fromEntries(ASSESSMENT_QUESTIONS.map(question => [question.id, '0']))
    answers.finance_1 = '1'
    answers.finance_2 = '2'
    answers.finance_3 = '3'

    expect(calculateScores(answers).finance).toBe(50)
    expect(calculateScores(answers).sales).toBe(0)
  })
})
