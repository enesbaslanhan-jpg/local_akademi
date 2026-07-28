import { describe, expect, it } from 'vitest'
import { calculatePriceArchitecture } from '../src/services/formulas'

describe('fiyat mimarisi hesaplayıcısı', () => {
  it('yüzdesel kesintileri satış fiyatının payı olarak çözer', () => {
    const result = calculatePriceArchitecture({
      dogrudan_maliyet: 100,
      operasyon_maliyeti: 20,
      sabit_gider_payi: 10,
      iade_risk_payi: 5,
      komisyon_orani: 15,
      odeme_orani: 3,
      hedef_marj: 20,
    })

    expect(result.gercek_birim_maliyet).toBe(135)
    expect(result.onerilen_kdv_haric_fiyat).toBe(217.74)
    expect(result.gerceklesen_marj).toBe(20)
  })

  it('oranların toplamı geçersizse güvenli biçimde reddeder', () => {
    expect(() => calculatePriceArchitecture({
      dogrudan_maliyet: 100,
      operasyon_maliyeti: 20,
      sabit_gider_payi: 10,
      iade_risk_payi: 5,
      komisyon_orani: 60,
      odeme_orani: 10,
      hedef_marj: 30,
    })).toThrow('%100’den küçük')
  })
})
