import { describe, expect, it } from 'vitest'
import { evaluateGeneratedQuizQuality } from '../src/services/quiz-pilot-quality'

const source = {
  title: 'Nakit Akışı',
  content:
    'Nakit girişi ve nakit çıkışı haftalık izlenir. Tahsilat ile ödeme tarihleri karşılaştırılır.',
}

describe('AI quiz pilot quality gate', () => {
  it('accepts unique, grounded and answer-safe questions', () => {
    const result = evaluateGeneratedQuizQuality(source, {
      title: 'Nakit Akışı Quizi',
      passScore: 70,
      questions: [
        {
          questionText: 'Nakit girişi hangi tabloda izlenir?',
          options: ['Haftalık tablo', 'Yıllık tablo'],
          correctAnswer: 'Haftalık tablo',
          explanation: 'Nakit girişi haftalık tabloda izlenir.',
        },
        {
          questionText: 'Tahsilat ve ödeme tarihleri neden karşılaştırılır?',
          options: ['Nakit planı için', 'Logo için'],
          correctAnswer: 'Nakit planı için',
          explanation: 'Tahsilat ve ödeme nakit planını etkiler.',
        },
        {
          questionText: 'Nakit çıkışı hangi sıklıkta izlenebilir?',
          options: ['Haftalık', 'Hiçbir zaman'],
          correctAnswer: 'Haftalık',
          explanation: 'Nakit çıkışı haftalık izlenir.',
        },
      ],
    })
    expect(result.pass).toBe(true)
  })

  it('rejects duplicate questions', () => {
    const question = {
      questionText: 'Nakit girişi hangi tabloda izlenir?',
      options: ['Haftalık tablo', 'Yıllık tablo'],
      correctAnswer: 'Haftalık tablo',
      explanation: 'Nakit girişi haftalık tabloda izlenir.',
    }
    const result = evaluateGeneratedQuizQuality(source, {
      title: 'Nakit Akışı Quizi',
      passScore: 70,
      questions: [question, question, question],
    })
    expect(result.pass).toBe(false)
  })
})
