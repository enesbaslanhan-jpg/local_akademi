import { describe, expect, it } from 'vitest'
import { CALCULATION_DEFINITIONS, MODEL_TO_CALCULATION, SIMPLE_TO_CALCULATION } from './calculationCatalog'

describe('birleşik hesaplama kataloğu', () => {
  it('repo auditine göre 35 benzersiz hesap içerir', () => {
    expect(CALCULATION_DEFINITIONS).toHaveLength(35)
    expect(CALCULATION_DEFINITIONS.filter(item => item.simple && item.detailed)).toHaveLength(8)
    expect(CALCULATION_DEFINITIONS.filter(item => item.simple && !item.detailed)).toHaveLength(11)
    expect(CALCULATION_DEFINITIONS.filter(item => !item.simple && item.detailed)).toHaveLength(16)
  })

  it('19 hızlı formülün ve 24 detaylı modelin tamamını temsil eder', () => {
    expect(Object.keys(SIMPLE_TO_CALCULATION)).toHaveLength(19)
    expect(Object.keys(MODEL_TO_CALCULATION)).toHaveLength(24)
  })

  it('birim maliyet ile ürün kârlılığını ayrı tutar', () => {
    expect(SIMPLE_TO_CALCULATION.birim_maliyet.id).toBe('unit-cost')
    expect(MODEL_TO_CALCULATION.PRODUCT_PROFITABILITY.id).toBe('product-profitability')
  })
})
