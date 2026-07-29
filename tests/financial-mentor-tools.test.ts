import { describe, expect, it } from 'vitest'
import {
  explainModelResult,
  FINANCIAL_MENTOR_TOOLS,
  getModelRequirements,
  listFinancialModels,
  recommendFinancialModel,
  validateModelInputs,
} from '../src/services/financial-models/mentor-tools'

describe('Phase 6 financial mentor tools', () => {
  it('publishes the complete deterministic tool contract', () => {
    expect(FINANCIAL_MENTOR_TOOLS).toHaveLength(13)
    expect(FINANCIAL_MENTOR_TOOLS).toContain('run_financial_model')
    expect(FINANCIAL_MENTOR_TOOLS).toContain('show_calculation_trace')
    expect(FINANCIAL_MENTOR_TOOLS).toContain('record_decision')
  })

  it('lists 24 models and exposes requirements without invented inputs', () => {
    expect(listFinancialModels()).toHaveLength(24)
    const requirements = getModelRequirements('CURRENT_RATIO')
    expect(requirements.inputs.map(input => input.key)).toEqual(['currentAssets', 'currentLiabilities'])
    expect(requirements.assumptionGuidance.every(item => item.requiresUserVerificationForOcr)).toBe(true)
  })

  it('recommends order profitability for marketplace questions', () => {
    const recommendations = recommendFinancialModel({
      question: 'Pazar yeri komisyonlarından sonra sipariş kârımı görmek istiyorum',
      availableFields: [],
    })
    expect(recommendations.map(item => item.code)).toContain('ORDER_PROFITABILITY')
  })

  it('uses the deterministic engine for validation and preserves its trace', () => {
    const result = validateModelInputs('CURRENT_RATIO', {
      currentAssets: 240,
      currentLiabilities: 120,
    })
    expect(result.outputs.currentRatio).toBe(2)
    expect(result.trace.length).toBeGreaterThan(0)
  })

  it('marks explanations as interpretation-only', () => {
    const explanation = explainModelResult({
      model: { code: 'CURRENT_RATIO', name: 'Cari Oran' },
      scenarioName: 'base',
      outputs: { currentRatio: 2 },
      warnings: [],
      confidence: { score: 80 },
    })
    expect(explanation.calculatedOutputs).toEqual({ currentRatio: 2 })
    expect(explanation.instruction).toContain('yeni sayı hesaplama')
  })
})
