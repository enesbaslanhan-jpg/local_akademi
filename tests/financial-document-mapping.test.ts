import { describe, expect, it } from 'vitest'
import { mapDocumentToFinancialModels } from '../src/services/financial-models/document-mapping'

describe('Phase 6 document to model mapping', () => {
  it('maps Turkish statement fields without marking them verified', () => {
    const result = mapDocumentToFinancialModels(
      'Dönen Varlıklar: 1.250.000 TL\nKısa Vadeli Yükümlülükler: 625.000 TL\nStoklar: 310.000 TL',
      '2026-bilanco.pdf',
    )
    const currentRatio = result.models.find(model => model.code === 'CURRENT_RATIO')
    const quickRatio = result.models.find(model => model.code === 'QUICK_RATIO')
    expect(currentRatio?.mappedInputs).toEqual({ currentAssets: 1250000, currentLiabilities: 625000 })
    expect(currentRatio?.runnableAfterVerification).toBe(true)
    expect(currentRatio?.requiresUserVerification).toBe(true)
    expect(quickRatio?.mappedInputs.inventory).toBe(310000)
  })

  it('returns partial suggestions with explicit missing fields', () => {
    const result = mapDocumentToFinancialModels('Net satışlar: 900.000 TL', 'gelir-tablosu.pdf')
    const dupont = result.models.find(model => model.code === 'DUPONT_3_STEP')
    expect(dupont?.coverage).toBeGreaterThan(0)
    expect(dupont?.missingFields.length).toBeGreaterThan(0)
    expect(dupont?.runnableAfterVerification).toBe(false)
  })

  it('does not invent values when labels are absent', () => {
    const result = mapDocumentToFinancialModels('Bu belge yalnızca açıklama notu içerir.', 'not.pdf')
    expect(result.extractedFieldCount).toBe(0)
    expect(result.models).toEqual([])
  })
})
