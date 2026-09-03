/**
 * KANONIK DERS BOLUMLERI — sunucu tarafinda yapisal veri.
 *
 * NEDEN SUNUCUDA?
 *
 * Web, kanonik derslerin markdown'ini ISTEMCIDE ayristirip yapisal kartlara
 * ceviriyor (frontend/src/utils/canonicalContent.js + CanonicalLessonSections.jsx).
 * Mobil istemci ayni isi yapamiyordu ve ham markdown'i oldugu gibi basiyordu:
 * kullanici `[ Hesaplamalar > Gercek Birim Maliyet Hesaplayicisini Ac ]`
 * satirini DUZ METIN olarak goruyordu, webde ayni satir bir DUGME.
 *
 * Bu, yayimlanmis 38 dersin 38'ini birden etkiliyor: her kanonik derste
 * "Pratik Bilgi Kartlari" ve bir entegrasyon bolumu var (olculdu 03.09.2026).
 *
 * Ayristiriciyi Kotlin'e ELLE TASIMAK secilmedi. `resolveCalculation` 600
 * satirlik, esik degerleri ve dogrulanmis es anlamlilarla ince ayar yapilmis
 * bir bulanik eslestirici; ikinci bir dilde yeniden yazmak, kullaniciyi
 * SESSIZCE YANLIS hesaplamaya goturme riski demekti (webde tam bu tur iki
 * hata daha once yasanmis ve yorumlara islenmis: "Guvenlik Marji" -> "Kar
 * Marji" ve payback -> CAC_PAYBACK).
 *
 * Bunun yerine webin ayristirici dosyalari `src/lib/` altina BIREBIR
 * kopyalandi (tek satiri degistirilmedi) ve `tests/canonical-lesson.test.ts`
 * iki kopyayi gercek 38 ders uzerinde karsilastiriyor. Kopya kaymasi teste
 * dusuyor.
 */

import {
  splitCanonicalMarkdown,
  parsePracticeCards,
  parseDecisionIntegration,
  extractInlineReferences,
  cleanCalculationLabel,
  extractDecisionCode,
  resolveCalculation,
  DECISION_TOOL_TITLES
} from '../lib/canonical-content.js'
import { CALCULATION_DEFINITIONS } from '../lib/calculation-catalog.js'

/**
 * Katalog tanimi.
 *
 * `src/lib/calculation-catalog.js` bir JS modulu; tsc alan tiplerini
 * `object` olarak cikariyor. Burada yalniz OKUDUGUMUZ alanlar
 * daraltiliyor -- katalogun kendisine dokunulmuyor.
 */
interface KatalogTanimi {
  id: string
  matchTitle?: string | null
  title?: string | null
  simple?: { formulaId: string } | null
  detailed?: { modelCode: string } | null
}

export interface CanonicalCalculationRef {
  /** Ders govdesindeki ham etiket ("Hesaplamalar > ROI Aracini Ac"). */
  label: string
  /** Hesaplama katalogu kimligi ("roi"). Mobil bunu kendi kataloguna cozer. */
  calculationId: string
  /** Turkce baslik — mobil kendi katalogunu kullanamazsa yedek. */
  title: string | null
  hasSimple: boolean
  hasDetailed: boolean
}

export interface CanonicalFormulaCard {
  title: string
  description: string
  formulas: string[]
  example: { intro: string; formulas: string[] } | null
  interpretation: string
  /** Kartin basligindan cozulen hesaplama; yoksa null (SAHTE ROUTE URETILMEZ). */
  calculationId: string | null
  decisionToolCode: string | null
  decisionToolTitle: string | null
}

export interface CanonicalMistakeCard {
  title: string | null
  wrong: string | null
  correct: string | null
}

export interface CanonicalDecisionIntegration {
  toolCode: string | null
  toolTitle: string | null
  context: string
  bullets: string[]
  result: string
}

export interface CanonicalSections {
  /** 3./4./5. bolumler ve satir ici referanslar CIKARILMIS markdown. */
  body: string
  decision: CanonicalDecisionIntegration | null
  /** Govdede gecen ek karar araci kodlari. */
  extraDecisions: Array<{ code: string; title: string }>
  calculations: CanonicalCalculationRef[]
  formulaCards: CanonicalFormulaCard[]
  mistakeCards: CanonicalMistakeCard[]
}

/** Kanonik ders mi? Web ayni kurali kullaniyor (CoursePlayerPage.jsx:175). */
export function isCanonicalKnowledgeObject(code: string | null | undefined): boolean {
  return typeof code === 'string' && code.startsWith('CANON-')
}

function decisionTitle(code: string | null | undefined): string | null {
  if (!code) return null
  return (DECISION_TOOL_TITLES as Record<string, string>)[code] ?? code
}

/**
 * Ders markdown'ini yapisal bolumlere cevirir.
 *
 * @param markdown Knowledge Object govdesi
 * @param decisionToolCode `metadata.decisionToolCode` — markdown'da karar
 *   araci sinyali yoksa kart yine de basilsin diye. Icerik UYDURULMAZ:
 *   baglam ve maddeler yalniz gercek markdown'dan gelir (webin kurali).
 * @param mistakeTitles Hata kartlari markdown'da BASLIKSIZ geliyor; baslik
 *   `embeddedPracticeBlocks` icindeki `common_mistake` kartlarindan aliniyor.
 */
export function buildCanonicalSections(
  markdown: string | null | undefined,
  decisionToolCode?: string | null,
  mistakeTitles: string[] = []
): CanonicalSections | null {
  if (!markdown) return null

  const { body, sections } = splitCanonicalMarkdown(markdown) as {
    body: string
    sections: Record<string, string>
  }

  /*
   * HESAPLAMA REFERANSLARI.
   *
   * Uc kaynaktan toplaniyor cunku `[ Hesaplamalar > ... ]` satiri yalniz
   * entegrasyon bolumunde degil, pratik kartlarin icinde ve govdenin
   * ortasinda da gecebiliyor.
   *
   * Tekillestirme IKI asamali ve sirasi onemli:
   *   1. Ayni ETIKET iki kez yazilmissa ikincisi atilir.
   *   2. Farkli iki etiket AYNI hesaplamaya cozulebiliyor
   *      ("Basa Bas Satis Adedi" ve "Basabas Noktasi" -> break-even-quantity);
   *      o zaman ilk gorulen kalir. Yoksa liste iki satir basar ve ikisi de
   *      ayni yere gider.
   */
  const rawLabels: string[] = [
    ...extractInlineReferences(sections.decisionTools || '').calculations,
    ...extractInlineReferences(sections.practiceCards || '').calculations,
    ...extractInlineReferences(sections.inlineRefs || '').calculations
  ]

  const gorulenEtiket = new Set<string>()
  const gorulenHesaplama = new Set<string>()
  const calculations: CanonicalCalculationRef[] = []

  for (const label of rawLabels) {
    const key = String(cleanCalculationLabel(label)).toLowerCase()
    if (!key || gorulenEtiket.has(key)) continue
    gorulenEtiket.add(key)

    const resolved = resolveCalculation(label, CALCULATION_DEFINITIONS)
    /*
     * Yalniz FOUND gonderiliyor. AMBIGUOUS ve MISSING icin dugme
     * URETILMEZ -- webin "sahte route uretme" kurali. Yanlis hesaplamayi
     * acmak, hic acmamaktan kotudur.
     */
    if (resolved.status !== 'FOUND' || !resolved.definition) continue
    const def = resolved.definition as KatalogTanimi
    if (gorulenHesaplama.has(def.id)) continue
    gorulenHesaplama.add(def.id)

    calculations.push({
      label,
      calculationId: def.id,
      title: def.matchTitle ?? null,
      hasSimple: Boolean(def.simple),
      hasDetailed: Boolean(def.detailed)
    })
  }

  /* KARAR ARACI ENTEGRASYONU (3. bolum). */
  const parsedDecision = parseDecisionIntegration(sections.decisionTools || '')
  let decision: CanonicalDecisionIntegration | null = null
  if (parsedDecision) {
    const code = parsedDecision.toolCode || decisionToolCode || null
    decision = {
      toolCode: code,
      toolTitle: parsedDecision.toolTitle || decisionTitle(code),
      context: parsedDecision.context || '',
      bullets: parsedDecision.bullets || [],
      result: parsedDecision.result || ''
    }
  } else if (decisionToolCode) {
    decision = {
      toolCode: decisionToolCode,
      toolTitle: decisionTitle(decisionToolCode),
      context: '',
      bullets: [],
      result: 'Sonuç: gerekçeli karar fişi'
    }
  }

  /* Govdede gecen ama metadata kodu olmayan ek karar araclari. */
  const extraCodes: string[] = []
  {
    const refs = extractInlineReferences(
      [sections.decisionTools, sections.inlineRefs].filter(Boolean).join('\n')
    )
    for (const raw of [...refs.decisionTools, ...refs.calculations]) {
      const code = extractDecisionCode(raw)
      if (code && code !== decision?.toolCode && !extraCodes.includes(code)) {
        extraCodes.push(code)
      }
    }
  }

  /* PRATIK BILGI KARTLARI (4. bolum). */
  const parsed = parsePracticeCards(sections.practiceCards || '') as {
    formulaCards: Array<Record<string, any>>
    warningCards: Array<{ wrong: string | null; correct: string | null }>
  }

  const formulaCards: CanonicalFormulaCard[] = parsed.formulaCards.map(card => {
    /*
     * Formul karti referans listesine DEGIL, DOGRUDAN kataloga cozuluyor:
     * kartin kendi basligi ("Gercek Birim Maliyet Formulu") hesaplamanin
     * adini tasiyor. Web de boyle yapiyor (CanonicalLessonSections.jsx:144).
     */
    const resolved = resolveCalculation(card.title, CALCULATION_DEFINITIONS)
    const dcCode: string | null = card.decisionToolCode ?? null
    const ornekVar = Boolean(card.example?.intro) || (card.example?.formulas?.length ?? 0) > 0
    return {
      title: card.title ?? '',
      description: card.description ?? '',
      formulas: card.formulas ?? [],
      example: ornekVar
        ? { intro: card.example.intro ?? '', formulas: card.example.formulas ?? [] }
        : null,
      interpretation: card.interpretation ?? '',
      calculationId:
        resolved.status === 'FOUND' && resolved.definition
          ? (resolved.definition as KatalogTanimi).id
          : null,
      decisionToolCode: dcCode,
      decisionToolTitle: decisionTitle(dcCode)
    }
  })

  /*
   * Hata kartlari markdown'da BASLIKSIZ geliyor ("### Hata / Dogru Karti").
   * Anlamli baslik `embeddedPracticeBlocks` icindeki `common_mistake`
   * kartlarindan sirayla esleniyor — webin cozumu
   * (CanonicalLessonSections.jsx:153).
   */
  const mistakeCards: CanonicalMistakeCard[] = parsed.warningCards.map((card, i) => ({
    title: mistakeTitles[i] ?? null,
    wrong: card.wrong,
    correct: card.correct
  }))

  return {
    body,
    decision,
    extraDecisions: extraCodes.map(code => ({ code, title: decisionTitle(code) as string })),
    calculations,
    formulaCards,
    mistakeCards
  }
}
