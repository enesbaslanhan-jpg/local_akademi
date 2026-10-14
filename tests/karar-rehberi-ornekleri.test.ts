import { describe, it, expect } from 'vitest'
import { calculateStructuredDecisionTool } from '../src/services/decision-tool-catalog.js'
// @ts-expect-error — ön yüz JS modülü, tip bildirimi yok; bilerek.
import { KARAR_REHBERLERI } from '../frontend/src/content/karar-rehberleri.js'
// @ts-expect-error — ön yüz JS modülü
import { SAYFA_META } from '../frontend/src/config/sayfa-meta.js'

/*
 * Karar rehberi sayfalarındaki çözümlü örnekler (14.10.2026).
 *
 * Sayfada yazan her rakam, aracın KENDİ hesap fonksiyonundan çıkan sayıyla
 * aynı olmak zorunda: araç mantığı değişirse bu test kırılır, sayfada eski
 * sayı kalmaz. Örnek sayılar elle yazılıp "doğru olduğuna inanılmıyor";
 * `dogrulama` alanı gerçek hesapla karşılaştırılıyor.
 */

const sayiMetni = (n: number) => {
  /* 1000 → "1.000", 426.67 → "426,67" (sayfadaki Türkçe yazım). */
  const [tam, ondalik] = String(n).replace('-', '').split('.')
  const bin = tam.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (n < 0 ? '−' : '') + bin + (ondalik ? ',' + ondalik : '')
}

describe.each(Object.entries(KARAR_REHBERLERI) as [string, any][])('rehber: %s', (slug, r) => {
  const d = r.dogrulama
  const hesap = calculateStructuredDecisionTool(d.kod, d.girdi)
  const sayfaMetni = [r.ornek.adimlar.join(' '), r.ornek.sonuc].join(' ')

  it('sonuç etiketi aracın gerçek çıktısıyla aynı', () => {
    expect(hesap.decisionLabel).toBe(d.etiket)
  })

  it('metrikler aracın gerçek çıktısıyla aynı', () => {
    for (const [anahtar, beklenen] of Object.entries(d.metrikler) as [string, number][]) {
      const m = hesap.metrics.find(x => x.key === anahtar)
      expect(m, anahtar).toBeDefined()
      expect(Number(m!.value), anahtar).toBeCloseTo(beklenen, 1)
    }
  })

  it('senaryolar aracın gerçek çıktısıyla aynı', () => {
    for (const [etiket, beklenen] of Object.entries(d.senaryolar) as [string, number][]) {
      const s = hesap.scenarios.find(x => x.label === etiket)
      expect(s, etiket).toBeDefined()
      expect(Number(s!.value), etiket).toBeCloseTo(beklenen, 1)
    }
  })

  it('doğrulanan her sayı sayfa metninde geçiyor (sayfada eski sayı kalamaz)', () => {
    for (const [anahtar, deger] of Object.entries(d.metrikler) as [string, number][]) {
      /* Sayfada yuvarlanmış yazılabilir: tam, 1 ve 0 ondalıklı biçimlerden biri bulunmalı. */
      const adaylar = [deger, Math.round(deger * 10) / 10, Math.round(deger)].map(sayiMetni)
      expect(adaylar.some(a => sayfaMetni.includes(a)), `${slug}.${anahtar} = ${deger}`).toBe(true)
    }
  })

  it('başlık aracın kendi başlığıyla aynı ve meta tablosunda girişi var', () => {
    expect(SAYFA_META[`/karar-araclari/${slug}`], slug).toBeDefined()
    expect(r.baslik).toBeTruthy()
  })
})
