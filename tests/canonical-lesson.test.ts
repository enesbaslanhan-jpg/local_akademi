import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  buildCanonicalSections,
  isCanonicalKnowledgeObject
} from '../src/services/canonical-lesson.js'

/* SUNUCU kopyasi (src/lib) */
import * as sunucu from '../src/lib/canonical-content.js'
import { CALCULATION_DEFINITIONS as SUNUCU_KATALOG } from '../src/lib/calculation-catalog.js'

/* WEB orijinali (frontend/src) — kaymayi yakalayan referans */
import * as web from '../frontend/src/utils/canonicalContent.js'
import { CALCULATION_DEFINITIONS as WEB_KATALOG } from '../frontend/src/data/calculationCatalog.js'

/**
 * KANONIK DERS AYRISTIRICISI.
 *
 * Fixture UYDURMA DEGIL: yayimdaki 38 kanonik dersin TAMAMI, calisan
 * veritabanindan alindi (03.09.2026). Elle yazilmis "temiz" bir ornek,
 * yakalamak istedigimiz seyi -- gercek icerigin duzensizligini -- gizlerdi.
 */
const dersler: Array<{ code: string; lessonId: number; title: string; content: string }> =
  JSON.parse(readFileSync(new URL('./fixtures/canonical-lessons.json', import.meta.url), 'utf8'))

describe('kanonik ders ayristiricisi', () => {
  it('fixture yayimdaki tum kanonik dersleri kapsiyor', () => {
    expect(dersler.length).toBe(38)
    expect(dersler.every(d => isCanonicalKnowledgeObject(d.code))).toBe(true)
  })

  /*
   * KAYMA TESTI — bu dosyanin var olma sebebi.
   *
   * `src/lib/canonical-content.js`, webin `frontend/src/utils/canonicalContent.js`
   * dosyasinin BIREBIR kopyasi. Iki kopya kacinilmaz olarak birbirinden
   * uzaklasir; biri duzeltilip digeri unutulur. O gun webde dogru calisan
   * bir ders mobilde sessizce yanlis kartlar uretmeye baslar.
   *
   * ⚠️ ILK YAZDIGIM HALI YETERSIZDI: yalnizca dort fonksiyonu
   * karsilastiriyordu. Dis kontrolunde `cleanCalculationLabel` icindeki bir
   * satiri sildim, iki kopya gercekten ayristi
   * ("Gercek Birim Maliyet Hesaplayicisini" / "Gercek Birim Maliyet")
   * ve test YINE GECTI -- cunku bulanik eslestirici ikisini de ayni
   * hesaplamaya cozuyordu. Yani kayma vardi, koruma yoktu.
   *
   * Simdi TEK METIN ALAN her disa acik fonksiyon, gercek ders govdeleri ve
   * cikarilan bolumler uzerinde otomatik karsilastiriliyor.
   */
  it('sunucu kopyasi web orijinaliyle ayni sonucu uretiyor', () => {
    /* Tek metin argumani alan fonksiyonlar otomatik taranir. */
    const tekArgumanli = [
      'repairLaTeXEscapes',
      'splitCanonicalMarkdown',
      'parseMistakeCard',
      'stripMarkdownTokens',
      'extractInlineReferences',
      'resolveDecisionTool',
      'cleanCalculationLabel',
      'extractDecisionCode',
      'parseDecisionIntegration',
      'parsePracticeCards'
    ] as const

    /* Ikisinde de ayni disa acik yuzey olmali. */
    for (const ad of tekArgumanli) {
      expect(typeof (sunucu as any)[ad], ad).toBe('function')
      expect(typeof (web as any)[ad], ad).toBe('function')
    }

    /* Girdi havuzu: ham govde + cikarilan her bolum + her satir ici etiket. */
    const girdiler: string[] = []
    for (const ders of dersler) {
      girdiler.push(ders.content)
      const s = (sunucu.splitCanonicalMarkdown(ders.content) as any).sections
      for (const v of Object.values(s)) girdiler.push(String(v))
      for (const bolum of Object.values(s)) {
        const r = sunucu.extractInlineReferences(String(bolum)) as any
        girdiler.push(...r.calculations, ...r.decisionTools)
      }
    }
    expect(girdiler.length).toBeGreaterThan(150)

    for (const girdi of girdiler) {
      for (const ad of tekArgumanli) {
        expect((sunucu as any)[ad](girdi), `${ad} / ${girdi.slice(0, 60)}`)
          .toEqual((web as any)[ad](girdi))
      }
    }
  })

  it('hesaplama cozumlemesi weble birebir ayni', () => {
    /* Katalog da kopyalandi; once onun ayni oldugunu dogrula. */
    expect(SUNUCU_KATALOG).toEqual(WEB_KATALOG)

    const etiketler = new Set<string>()
    for (const ders of dersler) {
      const s = sunucu.splitCanonicalMarkdown(ders.content).sections
      for (const bolum of [s.decisionTools, s.practiceCards, s.inlineRefs]) {
        for (const e of sunucu.extractInlineReferences(bolum || '').calculations) etiketler.add(e)
      }
    }
    expect(etiketler.size).toBeGreaterThan(20)
    for (const etiket of etiketler) {
      expect(sunucu.resolveCalculation(etiket, SUNUCU_KATALOG), etiket)
        .toEqual(web.resolveCalculation(etiket, WEB_KATALOG))
    }
  })

  /*
   * DAVRANIS TESTI — kopyalarin ayni olmasi yetmez; dogru seyi
   * uretmeleri de gerekiyor.
   */
  it('her derste pratik bilgi kartlari cikiyor', () => {
    const kartsiz = dersler.filter(d => {
      const b = buildCanonicalSections(d.content)
      return !b || (b.formulaCards.length === 0 && b.mistakeCards.length === 0)
    })
    expect(kartsiz.map(d => d.code)).toEqual([])
  })

  it('govdeden cikarilan bolumler markdown icinde ikinci kez basilmiyor', () => {
    for (const ders of dersler) {
      const b = buildCanonicalSections(ders.content)!
      expect(b.body, ders.code).not.toMatch(/##\s*\d*\.?\s*Pratik Bilgi Kartlar/i)
      /* Ham `[ Hesaplamalar > ... ]` satiri kullaniciya gorunmemeli. */
      expect(b.body, ders.code).not.toMatch(/\[\s*Hesaplamalar\s*>/i)
      expect(b.body, ders.code).not.toMatch(/\[\s*Karar Ara[çc]lar[ıi]\s*>/i)
    }
  })

  it('cozulemeyen hesaplama icin dugme uretilmiyor', () => {
    /*
     * "Sahte route uretme" kurali. Olculdu: 31 etiketin 7'si kataloga
     * cozulmuyor ("Finansal Saglik Dashboard", "Sirket Turu ve Vergi
     * Optimizasyon" gibi). Bunlar icin hesaplama CTA'si CIKMAMALI --
     * yanlis hesaplamayi acmak, hic acmamaktan kotudur.
     */
    for (const ders of dersler) {
      const b = buildCanonicalSections(ders.content)!
      for (const c of b.calculations) {
        expect(c.calculationId, `${ders.code} / ${c.label}`).toBeTruthy()
        expect(SUNUCU_KATALOG.some((d: any) => d.id === c.calculationId)).toBe(true)
      }
    }
  })

  it('ayni hesaplamaya cozulen iki etiket tek CTA uretiyor', () => {
    for (const ders of dersler) {
      const b = buildCanonicalSections(ders.content)!
      const idler = b.calculations.map(c => c.calculationId)
      expect(new Set(idler).size, ders.code).toBe(idler.length)
    }
  })

  it('metadata karar araci kodu markdown sinyali yokken de kart uretiyor', () => {
    const bos = buildCanonicalSections('# Baslik\n\nGovde.', 'DC-PROFIT-001')
    expect(bos?.decision?.toolCode).toBe('DC-PROFIT-001')
    expect(bos?.decision?.toolTitle).toBe('Ürünüm Gerçekten Kârlı mı?')
    /* Icerik UYDURULMAZ: baglam ve maddeler yalniz gercek markdown'dan gelir. */
    expect(bos?.decision?.context).toBe('')
    expect(bos?.decision?.bullets).toEqual([])
  })

  it('gercek bir derste beklenen kartlar ve baglantilar cikiyor', () => {
    const ders = dersler.find(d => d.code === 'CANON-COURSE-001')!
    const b = buildCanonicalSections(ders.content, 'DC-PROFIT-001', ['Sabit Personel Maliyeti'])!

    expect(b.decision?.toolCode).toBe('DC-PROFIT-001')
    expect(b.calculations.map(c => c.calculationId)).toContain('unit-cost')
    expect(b.formulaCards.length).toBeGreaterThan(0)
    /* Formul karti gercek LaTeX tasiyor — mobil bunu LkMath ile ciziyor. */
    expect(b.formulaCards[0].formulas.join(' ')).toContain('\\text')
    expect(b.mistakeCards.length).toBe(1)
    expect(b.mistakeCards[0].wrong).toBeTruthy()
    expect(b.mistakeCards[0].correct).toBeTruthy()
    expect(b.mistakeCards[0].title).toBe('Sabit Personel Maliyeti')
  })

  it('kanonik olmayan kod ayristirilmiyor', () => {
    expect(isCanonicalKnowledgeObject('CUR-038-01')).toBe(false)
    expect(isCanonicalKnowledgeObject(null)).toBe(false)
    expect(buildCanonicalSections(null)).toBeNull()
    expect(buildCanonicalSections('')).toBeNull()
  })
})
