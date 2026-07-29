import { describe, expect, it } from 'vitest'
import {
  calculateCashClosing,
  calculateMarketplaceProfit,
  calculatePriceArchitecture,
  calculateRunway,
  calculateTermDifference,
  calculateUnitCost,
  calculateVatAddition,
} from '../src/services/formulas'

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

describe('Finans Merkezi günlük hesaplamaları', () => {
  it('KDV hariç tutardan KDV dahil toplamı hesaplar', () => {
    expect(calculateVatAddition({ kdv_haric_tutar: 1000, kdv_orani: 20 })).toEqual({
      kdv_haric_tutar: 1000,
      kdv_tutari: 200,
      kdv_dahil_tutar: 1200,
    })
  })

  it('günlük kasa kapanışını giriş ve çıkışlardan bulur', () => {
    const result = calculateCashClosing({
      acilis_kasasi: 1000,
      nakit_satis: 3000,
      tahsilat: 500,
      diger_giris: 0,
      gider_odeme: 600,
      tedarikci_odeme: 900,
      bankaya_yatirilan: 1000,
    })
    expect(result.beklenen_kasa).toBe(2000)
    expect(result.durum).toBe('Kasa pozitif')
  })

  it('nakit dayanma süresini aylık açık üzerinden hesaplar', () => {
    expect(calculateRunway({
      mevcut_nakit: 120000,
      aylik_nakit_girisi: 50000,
      aylik_nakit_cikisi: 70000,
    }).dayanma_suresi_ay).toBe(6)
  })

  it('gerçek birim maliyeti tüm maliyet kalemlerinden üretir', () => {
    expect(calculateUnitCost({
      hammadde: 5000,
      iscilik: 2000,
      genel_gider: 1000,
      ambalaj_kargo: 1000,
      fire_iade: 1000,
      uretim_adedi: 100,
    }).birim_maliyet).toBe(100)
  })

  it('vade farkını bileşik aylık oranla hesaplar', () => {
    const result = calculateTermDifference({ pesin_fiyat: 10000, aylik_vade_orani: 2, vade_ay: 3 })
    expect(result.vadeli_toplam).toBe(10612.08)
    expect(result.vade_farki).toBe(612.08)
  })

  it('pazar yeri siparişinin tüm görünür maliyetlerden sonraki katkısını hesaplar', () => {
    const result = calculateMarketplaceProfit({
      satis_fiyati: 1000,
      urun_maliyeti: 400,
      komisyon_orani: 20,
      kargo: 80,
      ambalaj: 20,
      reklam_payi: 50,
      iade_riski: 30,
    })
    expect(result.siparis_katkisi).toBe(220)
    expect(result.siparis_marji).toBe(22)
  })
})
