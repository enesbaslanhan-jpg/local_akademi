import { describe, expect, it } from 'vitest'
import {
  STRUCTURED_TOOL_BY_CODE,
  calculateStructuredDecisionTool,
  validateStructuredToolAnswers
} from '../src/services/decision-tool-catalog'

const CODE = 'DC-TAX-013'

const base = {
  estimatedAnnualProfit: 800_000,
  profitRetentionIntent: 1,
  investorGoal: 0,
  partnerCount: 1,
  liabilitySensitivity: 1,
  growthPlan: 1
}

const withInput = (patch: Record<string, number>) => ({ ...base, ...patch })

describe('DC-TAX-013 — şirket türü karar aracı', () => {
  it('katalogda tanımlı ve doğru kategoride', () => {
    const tool = STRUCTURED_TOOL_BY_CODE.get(CODE)
    expect(tool).toBeDefined()
    expect(tool!.category).toBe('Hukuk ve Vergi')
    expect(tool!.questions).toHaveLength(6)
  })

  it('ürün kararındaki altı faktörü de soruyor', () => {
    const codes = STRUCTURED_TOOL_BY_CODE.get(CODE)!.questions.map(q => q.code)
    expect(codes).toEqual(expect.arrayContaining([
      'estimatedAnnualProfit', 'profitRetentionIntent', 'investorGoal',
      'partnerCount', 'liabilitySensitivity', 'growthPlan'
    ]))
  })

  it('seçenekli sorular tanımlı seçenek listesi taşıyor', () => {
    const choices = STRUCTURED_TOOL_BY_CODE.get(CODE)!.questions.filter(q => q.type === 'choice')
    expect(choices.length).toBeGreaterThanOrEqual(4)
    for (const question of choices) {
      expect(question.options?.length).toBeGreaterThanOrEqual(2)
      expect(question.options!.every(o => Number.isFinite(o.value) && o.label.length > 0)).toBe(true)
    }
  })

  it('tanımlı seçenek değerini kabul eder', () => {
    expect(validateStructuredToolAnswers(CODE, base).success).toBe(true)
  })

  it('seçenek kümesinde olmayan değeri reddeder', () => {
    // Aralik icinde ama tanimli olmayan bir deger; aralik kontrolu bunu kacirirdi.
    const result = validateStructuredToolAnswers(CODE, withInput({ growthPlan: 1.5 }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.fields).toContain('growthPlan')
  })

  it('aralık dışı seçeneği reddeder', () => {
    const result = validateStructuredToolAnswers(CODE, withInput({ liabilitySensitivity: 7 }))
    expect(result.success).toBe(false)
  })

  it('küçük ölçek ve tek ortakta şahıs işletmesini önerir', () => {
    const calculation = calculateStructuredDecisionTool(CODE, withInput({
      estimatedAnnualProfit: 180_000, profitRetentionIntent: 0,
      investorGoal: 0, partnerCount: 1, liabilitySensitivity: 0, growthPlan: 0
    }))
    expect(calculation.decisionLabel).toBe('ŞAHIS İŞLETMESİNİ DEĞERLENDİR')
  })

  it('ortaklık, kâr bırakma ve sorumluluk hassasiyetinde limited önerir', () => {
    const calculation = calculateStructuredDecisionTool(CODE, withInput({
      estimatedAnnualProfit: 1_500_000, profitRetentionIntent: 2,
      investorGoal: 0, partnerCount: 2, liabilitySensitivity: 2, growthPlan: 1
    }))
    expect(calculation.decisionLabel).toBe('LİMİTED ŞİRKETİ DEĞERLENDİR')
  })

  it('yatırımcı hedefi ve hızlı ölçeklenmede anonim önerir', () => {
    const calculation = calculateStructuredDecisionTool(CODE, withInput({
      estimatedAnnualProfit: 5_000_000, profitRetentionIntent: 2,
      investorGoal: 2, partnerCount: 5, liabilitySensitivity: 2, growthPlan: 2
    }))
    expect(calculation.decisionLabel).toBe('ANONİM ŞİRKETİ DEĞERLENDİR')
  })

  it('çelişkili sinyalde yön önermez, uzmana yönlendirir', () => {
    const calculation = calculateStructuredDecisionTool(CODE, withInput({
      estimatedAnnualProfit: 120_000, investorGoal: 2
    }))
    expect(calculation.decisionLabel).toBe('PROFESYONEL DOĞRULAMA GEREKLİ')
    expect(calculation.decisionTone).toBe('warning')
  })

  it('her sonuçta uzman doğrulaması uyarısı taşır', () => {
    const calculation = calculateStructuredDecisionTool(CODE, base)
    const text = [...calculation.riskWarnings, ...calculation.safeNextSteps].join(' ')
    expect(text).toMatch(/danışmanlığı değildir|mali müşavir/i)
  })

  it('kesin vergi tutarı veya oranı üretmez', () => {
    const calculation = calculateStructuredDecisionTool(CODE, base)
    // Tek para metrigi kullanicinin kendi girdigi kardir; hesaplanmis vergi yoktur.
    const moneyMetrics = calculation.metrics.filter(m => m.format === 'money')
    expect(moneyMetrics).toHaveLength(1)
    expect(moneyMetrics[0].key).toBe('estimatedAnnualProfit')
    expect(calculation.metrics.some(m => /vergi|tax/i.test(m.label))).toBe(false)
  })

  it('karar fişi için gereken tüm alanları doldurur', () => {
    const calculation = calculateStructuredDecisionTool(CODE, base)
    expect(calculation.metrics.length).toBeGreaterThanOrEqual(4)
    expect(calculation.scenarios.length).toBeGreaterThanOrEqual(2)
    expect(calculation.formulas.length).toBeGreaterThanOrEqual(3)
    expect(calculation.safeNextSteps.length).toBeGreaterThanOrEqual(2)
    expect(calculation.mentorSummary.length).toBeGreaterThanOrEqual(4)
    expect(calculation.summary.length).toBeGreaterThan(20)
  })
})
