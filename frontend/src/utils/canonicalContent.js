/**
 * Canonical ders içeriği ayrıştırıcısı.
 *
 * 38 canonical dersin markdown'ı ortak bir iskelet taşıyor:
 *
 *   # Başlık
 *   ## Pratik Karar: "..."
 *   ## 1. ...            → gövde
 *   ## 2. ...            → gövde
 *   ## 3. Karar Araçları Entegrasyonu      → structured CTA
 *   ## 4. Pratik Bilgi Kartları            → embeddedPracticeBlocks ile AYNI
 *   ## 5. Doğrulanmış Resmî Kaynaklar      → structured sources ile AYNI
 *
 * Son üç bölüm gövdeden çıkarılır; aynı içerik yapısal bileşenlerle
 * gösterildiği için markdown'da ikinci kez basılması duplikasyon üretiyordu.
 *
 * Bölümler numaraya değil BAŞLIK ANLAMINA göre yakalanır: numaralandırma
 * derslere göre kayabiliyor.
 */

/* Gövdeden çıkarılacak bölümlerin başlık imzaları.
 *
 * Entegrasyon bölümü 38 derste ÜÇ farklı adla geçiyor:
 *   "Hesaplamalar Entegrasyonu"      18 ders
 *   "Karar Araçları Entegrasyonu"    10 ders
 *   "Finans Merkez Entegrasyonu"     10 ders   ← eski terminoloji
 * Üçü de aynı işi yapıyor; hepsi `decisionTools` anahtarında toplanır ve
 * kullanıcıya gösterilen başlık içeriğe göre yeniden üretilir.
 */
const STRIPPED_SECTIONS = [
  {
    key: 'decisionTools',
    test: /karar\s+ara[çc]lar[ıi]|hesaplamalar?\s+entegrasyon|finans\s+merkez\w*\s+entegrasyon|model\s*lab|decision\s+tools?\s+integration|calculations?\s+(?:and\s+decision\s+tools?\s+)?integration|financial\s+hub\s+integration/i
  },
  { key: 'practiceCards', test: /pratik\s+bilgi\s+kartlar[ıi]|practical\s+(?:information|knowledge)\s+cards|practice\s+cards/i },
  { key: 'sources', test: /(do[ğg]rulanm[ıi][şs]\s+)?resm[îi]\s+kaynak|^kaynak[çc]a$|verified\s+official\s+sources?|^sources?$|^references?$/i }
]

const H2 = /^##\s+(.*)$/

/** Gövde içinde geçen `[ Karar Araçları > ... ]` / `[ Hesaplamalar > ... ]`. */
const INLINE_REF = /\[\s*(?:Karar Ara[çc]lar[ıi]|Hesaplamalar|Modeller|Decision Tools?|Calculations?|Models?)\s*>\s*[^\]]+\]/gi

/* ------------------------------------------------------------------ *
 * LaTeX onarımı
 *
 * Eski canonical JSON artifact'ında tek-backslash `\text` escape'leri
 * JSON.parse sırasında TAB (U+0009) / CR (U+000D) kontrol karakterlerine
 * dönüşmüştü (Phase A DB içeriğinde de aynı bozukluk var). Veri
 * apply-canonical-tab-patch.ts + apply-canonical-command-repair.ts ile
 * düzeltildi; bu fonksiyon yalnız render yolunda savunma katmanıdır:
 *   - TAB/CR'den sonra ASCII harf geliyorsa bu, yutulmuş bir LaTeX
 *     backslash'idir (TAB+"ext" -> `\ext`).
 *   - `\ext` / `\imes` / `\ight` ise escape'in yuttuğu harf eksiktir
 *     (`\t ext` -> `\text`'in 't'si yutulmuştur). DB'de çift-backslash
 *     olmadığı için bu üç kalıp yalnız bozuk komutu temsil eder.
 */
export function repairLaTeXEscapes(text) {
  if (!text) return ''
  return String(text)
    .replace(/\t(?=[a-z])/g, '\\')
    .replace(/\r(?=[a-z])/g, '\\')
    .replace(/\\ext(?![a-zA-Z])/g, '\\text')
    .replace(/\\imes(?![a-zA-Z])/g, '\\times')
    .replace(/\\ight(?![a-zA-Z])/g, '\\right')
}

/**
 * Markdown'ı gövde + çıkarılan bölümlere ayırır.
 * @returns {{ body: string, sections: Record<string,string> }}
 */
export function splitCanonicalMarkdown(markdown) {
  if (!markdown) return { body: '', sections: {} }

  /* LaTeX onarımı parse girişinde uygulanır: veri hangi durumda olursa
     olsun aşağıdaki hiçbir katman bozuk escape görmemelidir. */
  markdown = repairLaTeXEscapes(markdown)

  const lines = markdown.split('\n')
  const bodyLines = []
  const sections = {}

  let activeKey = null

  for (const line of lines) {
    const heading = line.match(H2)

    if (heading) {
      // Basligin numarasini at, anlamina bak: "3. Karar Araclari ..." -> "Karar Araclari ..."
      const label = heading[1].replace(/^\s*\d+[.)]\s*/, '').trim()
      const matched = STRIPPED_SECTIONS.find(s => s.test.test(label))
      activeKey = matched ? matched.key : null
      if (activeKey) {
        sections[activeKey] = sections[activeKey] ?? ''
        continue
      }
    }

    if (activeKey) { sections[activeKey] += line + '\n'; continue }

    /* `[ Karar Araçları > ... ]` ve `[ Hesaplamalar > ... ]` referansları
       yalnız 3. bölümde değil, gövdenin ortasında da geçebiliyor. Bunlar
       kullanıcıya ham metin olarak görünmemeli: satırdan çıkarılır ve
       CTA olarak render edilmek üzere toplanır. */
    INLINE_REF.lastIndex = 0
    if (INLINE_REF.test(line)) {
      sections.inlineRefs = (sections.inlineRefs ?? '') + line + '\n'
      const stripped = line.replace(INLINE_REF, '').trim()
      if (stripped) bodyLines.push(stripped)
      continue
    }

    bodyLines.push(line)
  }

  return {
    body: bodyLines.join('\n').trim(),
    sections: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.trim()]))
  }
}

/**
 * "Hata / Doğru" kartını iki alana ayırır.
 *
 * Ham içerik şu biçimde geliyor ve markdown işaretleri kullanıcıya
 * sızıyordu:
 *   **Yaygın Hata:** ...  **Doğru Yaklaşım:** ...
 *
 * @returns {{ wrong: string|null, correct: string|null }}
 */
export function parseMistakeCard(text) {
  if (!text) return { wrong: null, correct: null }

  const clean = String(text)
    // Etiketten once/sonra kalan yildizlari ve iki noktayi temizle.
    .replace(/\*\*/g, '')
    .replace(/\r/g, '')

  const wrongMatch = clean.match(/(?:Yayg[ıi]n\s+Hata|Common\s+Mistake)\s*:?\s*([\s\S]*?)(?=(?:Do[ğg]ru\s+Yakla[şs][ıi]m|Correct\s+Approach)\s*:|$)/i)
  const correctMatch = clean.match(/(?:Do[ğg]ru\s+Yakla[şs][ıi]m|Correct\s+Approach)\s*:?\s*([\s\S]*)$/i)

  const wrong = wrongMatch?.[1]?.trim() || null
  const correct = correctMatch?.[1]?.trim() || null

  // Etiket yoksa tek parca metin: hepsini "yanlis" tarafinda gosterme,
  // ham metni oldugu gibi dondur ki icerik kaybolmasin.
  if (!wrong && !correct) return { wrong: clean.trim() || null, correct: null }
  return { wrong, correct }
}

/** Markdown vurgu/başlık işaretlerini metinden temizler. */
export function stripMarkdownTokens(text) {
  if (!text) return ''
  return String(text)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/(^|\s)\*(\S)/g, '$1$2')
    .replace(/`/g, '')
    .trim()
}

/**
 * Markdown içindeki `[ Karar Araçları > ... ]` ve `[ Hesaplamalar > ... ]`
 * düz metin referanslarını yakalar. Bunlar gövdede ham metin olarak
 * kalmamalı; yerlerine gerçek CTA basılır.
 */
export function extractInlineReferences(markdown) {
  if (!markdown) return { decisionTools: [], calculations: [] }
  const decisionTools = []
  const calculations = []

  const pattern = /\[\s*(Karar Ara[çc]lar[ıi]|Hesaplamalar|Decision Tools?|Calculations?)\s*>\s*([^\]]+)\]/gi
  let match
  while ((match = pattern.exec(markdown)) !== null) {
    const label = match[2].trim()
    if (/^(?:Karar|Decision)/i.test(match[1])) decisionTools.push(label)
    else calculations.push(label)
  }
  return { decisionTools, calculations }
}

/* ------------------------------------------------------------------ *
 * Hesaplama eşleştirmesi
 *
 * Markdown'daki `[ Hesaplamalar > X ]` etiketini gerçek hesaplama
 * kataloğuyla eşler. Eşleşme yoksa SAHTE ROUTE ÜRETİLMEZ; çağıran taraf
 * graceful fallback gösterir.
 * ------------------------------------------------------------------ */

/*
 * Türkçe harf eşlemesi.
 *
 * DÜZELTİLDİ — inceltme işaretli harfler (â, î, û) eksikti. Bunlar
 * eşlenmeyince `[^a-z0-9]` kuralına takılıp siliniyordu ve "kâr" kelimesi
 * "k r" olup token filtresinden (uzunluk > 2) tamamen düşüyordu.
 *
 * Sonucu somut: "Kâr ve Kâr Marjı" başlığı yalnız ["marji"]'ye iniyordu.
 * Bu yüzden "Brüt Kâr Marjı" (doğru eşleşme) ile "Güvenlik Marjı" (yanlış
 * eşleşme) matcher'a birebir aynı görünüyor, ikisi de aynı hesaplamaya
 * bağlanıyordu.
 */
const TR_MAP = {
  'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g',
  'ü': 'u', 'Ü': 'u', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c',
  'â': 'a', 'Â': 'a', 'î': 'i', 'Î': 'i', 'û': 'u', 'Û': 'u'
}
const normalize = s => (s || '')
  .replace(/[ıİşŞğĞüÜöÖçÇâÂîÎûÛ]/g, m => TR_MAP[m])
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const STOPWORDS = new Set(['ve', 'ile', 'icin', 'bir'])
const tokenize = s => normalize(s).split(' ').filter(t => t.length > 2 && !STOPWORDS.has(t))

/**
 * Etiketten çağrı kalıbını ve mod ekini atar; geriye hesaplamanın adı kalır.
 * NOT: `\b` sınırı `ç` gibi ASCII dışı harflerden sonra çalışmaz — bu yüzden
 * negatif lookahead kullanılıyor.
 */
/* Katalogda karşılığı olduğu doğrulanmış eş anlamlılar.
   Yalnız GERÇEK eşdeğerler; benzer isimli farklı hesaplamalar buraya
   konmaz. Kaynak: CALCULATION_REFERENCE_CLEANUP.md + 38 formül kartının
   birebir içerik audit'i (PRE_PHASE_B_PRODUCT_FLOW_QA.md). */
const CALCULATION_ALIASES = [
  { test: /ba[şs]a\s*ba[şs]\s*noktas[ıi]|ba[şs]aba[şs]\s*noktas[ıi]/i, id: 'break-even-quantity' },
  { test: /[şs]irket\s+de[ğg]erleme/i, id: 'wacc-fcff-dcf' },
  { test: /hedef\s+marj/i, id: 'price-architecture' },
  { test: /sat[ıi][şs]\s+hacmi\s+art[ıi][şs]|hacim\s+art[ıi][şs]/i, id: 'discount-profit' },
  { test: /[üu]r[üu]n\s+katk[ıi]s[ıi]|da[ğıg][ıi]t[ıi]lm[ıi][şs]\s+gider/i, id: 'product-profitability' },
  { test: /b[üu]y[üu]menin\s+nakit\s+bedeli|[ıiİ]şletme\s+sermayesi\s+[ıiİ]htiyac[ıiİ]/i, id: 'net-working-capital' },
  { test: /beklenen\s+[ıiİ]ade\s+kayb[ıiİ]|[ıiİ]ade\s+sonras[ıiİ]/i, id: 'post-return-margin' },
  { test: /nakit\s+eritme|burn\s+rate|runway/i, id: 'cash-runway' },
  { test: /stokta\s+kalma/i, id: 'inventory-turnover-dio' },
  { test: /kdv\s+ay[ıi]klama|matrah/i, id: 'vat-addition' },
  { test: /mikro\s+ihracat|\bddp\b/i, id: 'export-unit-cost' },

// Eksik eş anlamlılar — canonical ders formül kartlarından
  { test: /sipari[şs]\s+k[âa]rl[ıi][ğg]|sipari[şs]\s+katk[ıi]|net\s+katk[ıi]\s+hesap/i, id: 'order-profitability' },
  { test: /yat[ıi]r[ıi]m\s+getir[ıi][şs]i|roi\b|amortisman\s+s[üu]resi/i, id: 'roi' },
  { test: /vade\s+fark[ıi]|vadeli\s+toplam|pe[şs]in\s+fiyat/i, id: 'term-difference' },
  { test: /asit.?test|asit\s+test|h[ıi]zl[ıi]\s+likidite|acid.?test/i, id: 'quick-ratio' },
  { test: /katk[ıi]\s+pay[ıi]|birim\s+katk[ıi]/i, id: 'contribution-margin' },
  { test: /m[üu][şş]teri\s+edinme|musteri\s+edinme(?!\s*[\/\\])/i, id: 'customer-acquisition-cost' },
  { test: /m[üu][şş]teri\s+ya[şs]am\s+boyu|musteri\s+yasam\s+boyu(?!\s*[\/\\])/i, id: 'customer-lifetime-value' },
  { test: /nakit\s+pozisyonu|nakit\s+or[âa]n/i, id: 'cash-position' },
  { test: /k[âa]r\s+ve\s+k[âa]r\s+marj[ıi]|kar\s+marj[ıi]/i, id: 'profit-margin' },
  { test: /kredi\s+taksit|kredi\s+maliyet/i, id: 'loan-cost' },
  { test: /ger[çc]ek\s+birim\s+maliyet|birim\s+maliyet\b/i, id: 'unit-cost' },
  { test: /nakit\s+d[öo]n[üu][şş]m\s+d[öo]ng[üu]s[üu]/i, id: 'cash-conversion-cycle' },
  { test: /net\s+bug[üu]nk[üu]\s+de[ğg]er|npv\b/i, id: 'npv' },
]

/* Genel "geri ödeme / payback" etiketleri MÜŞTERİ-EDİNME aracıyla
   (CAC_PAYBACK) eşleşmemeli: CAC geri ödeme süresi müşteri metriğidir,
   yazılım/yatırım payback'i değildir. */
const PAYBACK_EXCLUDES_CAC = /geri\s+[oö]deme|payback|amorti/i

/* Formül kartı başlıklarını Karar Araçları (Decision Checks) ile eşleştirir.
   Bu, hesaplama kataloğunda karşılığı olmayan ama bir Karar Aracıyla
   ilişkilendirilebilen formül kartları içindir.
   Kaynak: AUDIT_REPORT.md - 5 DECISION_TOOL eşleşmeleri. */
const DECISION_TOOL_ALIASES = [
  { test: /etkin\s+vergi\s+y[üu]k[üu]|vergi\s+y[üu]k[üu]/i, id: 'DC-TAX-013' },
  { test: /istihdam\s+ger[çc]ek\s+çarpan[ıi]|i[şş]\s+mal[ıi]yet\s+çarpan[ıi]/i, id: 'DC-HIRE-006' },
  { test: /kira\s*[/\\]\s*ciro\s*or?an[ıi]|kira\s+ciro\s+oran[ıi]/i, id: 'DC-BRANCH-009' },
  { test: /dscr\s*rasyos?u|bor[çc]\s+servis\s+g[üu]c[üu]|taksit\s+kar[şs][ıi]la[şs]ma/i, id: 'DC-LOAN-007' },
]

export function resolveDecisionTool(rawLabel) {
  const label = cleanCalculationLabel(rawLabel)
  if (!label) return null
  const alias = DECISION_TOOL_ALIASES.find(a => a.test.test(label))
  return alias ? alias.id : null
}

export function cleanCalculationLabel(raw) {
  return String(raw || '')
    .replace(/\(DC-[A-Z0-9-]+\)/gi, '')
    .replace(/>\s*(detayl[ıi]|basit)\s*mod/gi, '')
    /* "Nakit Yönetimi > Döviz Pozisyonu" gibi yol önekini at; kullanıcıya
       gösterilecek olan hesaplamanın kendi adıdır. */
    .replace(/^[^>]{3,40}>\s*/, '')
    .replace(/(hesaplay[ıi]c[ıi]s[ıi]n[ıi]|arac[ıi]n[ıi]|modelini|panelini|ekran[ıi]n[ıi])\s*a[çc](?![a-zğüşöçıİ])/gi, '')
    .replace(/\s+a[çc]\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Etiketin içindeki DC-* kodu (varsa) — bu bir karar aracı referansıdır. */
export function extractDecisionCode(raw) {
  const m = String(raw || '').match(/DC-[A-Z]+-\d+/i)
  return m ? m[0].toUpperCase() : null
}

/**
 * @returns {{status:'FOUND'|'AMBIGUOUS'|'MISSING', definition:object|null}}
 */
export function resolveCalculation(rawLabel, definitions = []) {
  const label = cleanCalculationLabel(rawLabel)
  if (!label || definitions.length === 0) return { status: 'MISSING', definition: null }

  // Doğrulanmış eş anlamlılar sözlüksel skordan önce gelir.
  const alias = CALCULATION_ALIASES.find(a => a.test.test(label))
  if (alias) {
    const definition = definitions.find(d => d.id === alias.id)
    if (definition) return { status: 'FOUND', definition }
  }

  const dice = (a, b) => {
    const A = new Set(tokenize(a)), B = new Set(tokenize(b))
    if (!A.size || !B.size) return 0
    let hit = 0
    for (const t of A) if (B.has(t)) hit++
    return (2 * hit) / (A.size + B.size)
  }
  // Kisaltma/alt kume: "ROI" etiketi "Yatirim Getirisi (ROI)" ile ayni sey.
  const subset = (a, b) => {
    const A = tokenize(a), B = new Set(tokenize(b))
    return A.length > 0 && A.every(t => B.has(t)) ? 0.9 : 0
  }

  const scored = definitions
    .map(d => {
      // Yeni katalog `matchTitle`, eski/test tanımları `title` taşır.
      // İkisi de kullanıcıya gösterilen metin değil, yalnız eşleştirme verisidir.
      const candidateTitle = d.matchTitle || d.title || ''
      return {
        definition: d,
        score: Math.max(dice(label, candidateTitle), subset(label, candidateTitle), normalize(candidateTitle) === normalize(label) ? 1 : 0)
      }
    })
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  const second = scored[1]
  if (!best) return { status: 'MISSING', definition: null }

  /* Genel payback/geri ödeme etiketleri CAC_PAYBACK'e (müşteri edinme
     metriği) bağlanmaz; bu eşleşme sahte route üretir. */
  if (best.definition?.id === 'cac-payback' && PAYBACK_EXCLUDES_CAC.test(label)) {
    return { status: 'MISSING', definition: null }
  }

  if (best.score >= 0.85) return { status: 'FOUND', definition: best.definition }

  /*
   * Orta bantta (0.5–0.85) TEK KELİME örtüşmesi yeterli sayılmaz.
   *
   * Eski kural yalnız "skor >= 0.5 ve ikinciyle arası >= 0.15" idi. Bu,
   * ters bir mantık üretiyordu: bir etiket başka hiçbir şeye benzemiyorsa
   * "fark" büyük çıkıyor ve tek kelimelik rastlantı kendinden emin
   * eşleşme gibi görünüyordu.
   *
   * Somut vaka: "Güvenlik Marjı" → "Kâr ve Kâr Marjı" ile yalnız "marjı"
   * kelimesini paylaşıyor (skor tam 0.500, fark 0.500) ve kullanıcıyı
   * alakasız bir hesaplamaya götürüyordu. Güvenlik marjı başa baş
   * noktasına uzaklıktır; kâr marjı bambaşka bir şey.
   *
   * Yeni kural: en az İKİ anlamlı kelime paylaşılmalı. Kesin eşleşmeler
   * (>= 0.85), tam eşitlik, doğrulanmış eş anlamlılar ve alt küme kuralı
   * ("ROI" ⊂ "Yatırım Getirisi (ROI)") bundan etkilenmez.
   */
  const paylasilanKelime = (a, b) => {
    const A = new Set(tokenize(a)), B = new Set(tokenize(b))
    let n = 0
    for (const t of A) if (B.has(t)) n++
    return n
  }

  if (
    best.score >= 0.5 &&
    best.score - (second?.score ?? 0) >= 0.15 &&
    paylasilanKelime(label, best.definition.matchTitle || best.definition.title || '') >= 2
  ) {
    return { status: 'FOUND', definition: best.definition }
  }
  if (best.score >= 0.45) return { status: 'AMBIGUOUS', definition: null }
  return { status: 'MISSING', definition: null }
}

/* ------------------------------------------------------------------ *
 * Karar aracı entegrasyonu (3. bölüm) → structured kart
 *
 * Section 3 markdown'ı üç farklı terminolojiyle geliyor
 * ("Karar Araçları / Hesaplamalar / Finans Merkez Entegrasyonu") ama
 * aynı işi yapıyor: kullanıcıya hangi karar aracıyla nihai karar
 * verileceğini anlatıyor. Bu parser, ham markdown'ı kartın alanlarına
 * ayırır: gerçek başlık, 1-2 cümle bağlam, "Bu araçta" analiz adımları.
 * ------------------------------------------------------------------ */

/* Structured araçların yerel görüntü adları (katalogdan kopya — markdown
   başlık vermeyen dersler için fallback). Kaynak: decision-tool-catalog.ts
   STRUCTURED_TOOL_CONFIGS + legacy DC-PROFIT-001. */
export const DECISION_TOOL_TITLES = {
  'DC-PROFIT-001': 'Ürünüm Gerçekten Kârlı mı?',
  'DC-DISCOUNT-002': 'Bu indirimi yapabilir miyim?',
  'DC-FREESHIP-003': 'Kargo ücretsiz olabilir mi?',
  'DC-MARKETPLACE-004': 'Pazaryeri komisyonundan sonra ne kalıyor?',
  'DC-ADS-005': 'Reklam bütçemi artırmalı mıyım?',
  'DC-HIRE-006': 'Yeni personel alabilir miyim?',
  'DC-LOAN-007': 'Kredi taksitini karşılayabilir miyim?',
  'DC-CASHFLOW-008': 'Nakit akışım riskli mi?',
  'DC-BRANCH-009': 'Yeni şube açmaya hazır mıyım?',
  'DC-CAMPAIGN-010': 'Kampanya yapmak mantıklı mı?',
  'DC-STOCK-011': 'Stok artırmalı mıyım?',
  'DC-CONTINUE-012': 'Bu ürünü satmaya devam etmeli miyim?',
  'DC-TAX-013': 'Hangi şirket türü bana uygun?'
}

/* List başlığı varyantları: "Bu araçta yapacağınız analiz adımları:",
   "Kasa Dedektifliği İş Akışı:", "Kapasite Karar Adımları:",
   "İhracat Karar Adımları:", "ROI Karar Adımları:" */
const BULLET_HEADER = /bu\s+ara[çc]ta|ad[ıiİ]mlar[ıiİ]|[ıiİ][şŞs]\s+ak[ıiİ][şŞs]|karar\s+ad[ıiİ]mlar[ıiİ]|in\s+this\s+tool|analysis\s+steps?|workflow|decision\s+steps?/i
const LIST_ITEM = /^\s*\d+[.)]\s+(.+)$/
const CODE_BLOCK = /```[\s\S]*?```/g

/**
 * Başlığı ve DC kodunu markdown'dan çıkarır.
 * Sıralama: tırnaklı başlık → `**...**` segmenti → köşeli referans.
 */
function extractToolTitleAndCode(markdown) {
  const text = String(markdown || '')

  const quoted = text.match(/"\s*([^"\n]*?\(\s*DC-[A-Z0-9-]+\s*\))[^"\n]*"/i)
  if (quoted) {
    const code = extractDecisionCode(quoted[1])
    return { title: quoted[1].replace(/\(\s*DC-[A-Z0-9-]+\s*\)/i, '').trim(), code }
  }

  const segments = text.match(/\*\*([^*\n]*?\(\s*DC-[A-Z0-9-]+\s*\)[^*\n]*)\*\*/i)
  if (segments) {
    const code = extractDecisionCode(segments[1])
    return { title: segments[1].replace(/\(\s*DC-[A-Z0-9-]+\s*\)/i, '').trim(), code }
  }

  const ref = text.match(/>\s*([^\[\n]*?\(\s*DC-[A-Z0-9-]+\s*\))/i)
  if (ref) {
    const code = extractDecisionCode(ref[1])
    return { title: ref[1].replace(/\(\s*DC-[A-Z0-9-]+\s*\)/i, '').trim(), code }
  }

  const code = extractDecisionCode(text)
  return { title: null, code }
}

/**
 * 3. bölümden karar aracı kartını çıkarır.
 *
 * Bölümde karar aracı SİNYALİ yoksa (ne DC kodu, ne "Karar" sözü, ne de
 * analiz adımları listesi) null döner — o bölüm yalnız hesaplama
 * referansıdır ve karar kartına içerik uydurulmaz. Kodu olmayan derslerde
 * bile bağlam/adımlar gerçek markdown'dan gelir; toolCode/toolTitle null
 * kalabilir ve çağıran taraf metadata/map'ten tamamlar.
 *
 * @returns {null|{toolCode:string|null, toolTitle:string|null, context:string, bullets:string[], result:string}}
 */
export function parseDecisionIntegration(section) {
  if (!section) return null

  const { title: rawTitle, code } = extractToolTitleAndCode(section)
  const hasSignal = code || /karar|decision/i.test(section) || /^\s*\d+[.)]\s+/m.test(section)
  if (!hasSignal) return null

  const codeBlockless = String(section).replace(CODE_BLOCK, '')
  const lines = codeBlockless.split('\n')

  const bullets = []
  let inBullets = false
  const textLines = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { if (inBullets) inBullets = false; continue }
    if (BULLET_HEADER.test(trimmed) && !LIST_ITEM.test(trimmed)) { inBullets = true; continue }
    const item = trimmed.match(LIST_ITEM)
    if (inBullets && item) { bullets.push(stripMarkdownTokens(item[1])); continue }
    if (/^\s*\d+[.)]\s+/.test(trimmed)) continue
    if (/^#{1,4}\s/.test(trimmed)) continue
    inBullets = false
    textLines.push(stripMarkdownTokens(trimmed))
  }

  /* Bağlam: ilk 2 cümle. */
  const sentences = textLines
    .join(' ')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)

  const context = sentences.slice(0, 2).join(' ').trim()

  const toolTitle = rawTitle
    ? stripMarkdownTokens(rawTitle)
        .replace(/\s*(Arac[ıi]n[ıi]\s*A[çc]|Karar\s*Arac[ıi]'n[ıi]|Open\s+(?:the\s+)?Tool|Decision\s+Tool)\s*$/i, '')
        .trim()
    : null

  return { toolCode: code, toolTitle, context, bullets, result: /[çğıöşüÇĞİÖŞÜ]|\b(?:karar|araç|sonuç)\b/i.test(section) ? 'Sonuç: gerekçeli karar fişi' : 'Result: an evidence-based decision record' }
}

/* ------------------------------------------------------------------ *
 * Pratik bilgi kartları (4. bölüm) → formül kartları + hata/doğru kartları
 * ------------------------------------------------------------------ */

const FORMULA_CARD_HEADING = /^###\s*💡\s*(?:Form[üu]l\s*(Kart[ıi]|Kutusu)|Formula\s*Card)[:：]?\s*(.*)$/i
const WARNING_CARD_HEADING = /^###\s*⚠️?\s*(?:Hata\s*\/\s*Do[ğg]ru\s*Kart[ıi]|Mistake\s*\/\s*Correct\s*Card)[:：]?/i
const MATH_BLOCK = /\$\$([\s\S]*?)\$\$/g

const EXAMPLE_MARKERS = /vaka|senaryo|örne[ğg]in|yukar[ıi]daki|mevcut\s+oranlar|hesaplayal[ıi]m|d[ıi]yelim|case|scenario|example|for\s+instance|let(?:'s|\s+us)\s+calculate/i

/** `###` başlıklarına göre bölümü bloklara böler. */
function splitHeadingBlocks(markdown) {
  const blocks = []
  let current = null
  for (const line of String(markdown || '').split('\n')) {
    if (/^###\s/.test(line)) {
      current = { heading: line, body: '' }
      blocks.push(current)
    } else if (current) {
      current.body += line + '\n'
    }
  }
  return blocks
}

/**
 * Tek formül kartını alanlarına ayırır.
 * @returns {null|{title:string, description:string, formulas:string[], example:{intro:string, formulas:string[]}, interpretation:string}}
 */
export function parseFormulaCard(title, body) {
  const mathBlocks = []
  let match
  MATH_BLOCK.lastIndex = 0
  while ((match = MATH_BLOCK.exec(body)) !== null) {
    mathBlocks.push(match[1].trim())
  }
  if (mathBlocks.length === 0) return null

  /* İlk `$$` öncesi = açıklama. Sonrasındaki italik satırlar örnek
     (vaka/senaryo/örnek işaretli veya ardından formül gelen) ya da
     yorum (anlam açıklaması) olarak sınıflandırılır. */
  const firstDollar = body.indexOf('$$')
  const description = stripMarkdownTokens(body.slice(0, firstDollar)).trim()

  const tail = body.slice(firstDollar).split('\n')
  let formulaIndex = 0
  let inExample = false
  let exampleIntro = ''
  const exampleFormulas = []
  const interpretations = []

  for (let i = 0; i < tail.length; i++) {
    const line = tail[i].trim()
    if (!line) continue

    /* `$$...$$` tek satırda (açılış+kapanış aynı satırda) veya ayrı
       satırlarda gelebilir. Tek blok = bir açılış; kapanış sayılmaz. */
    if (line.startsWith('$$')) {
      if (formulaIndex < mathBlocks.length) {
        const block = mathBlocks[formulaIndex++]
        if (inExample) exampleFormulas.push(block)
      }
      if (!line.endsWith('$$')) continue
    }

    const italic = line.match(/^\*(.+)\*$/)
    if (italic) {
      const text = italic[1].trim()
      const followedByFormula = tail.slice(i + 1).some(l => l.trim().startsWith('$$'))
      if (followedByFormula || EXAMPLE_MARKERS.test(text)) {
        inExample = true
        exampleIntro = exampleIntro ? `${exampleIntro} ${text}` : text
      } else {
        inExample = false
        interpretations.push(text)
      }
    }
  }

  const mainCount = mathBlocks.length - exampleFormulas.length
  return {
    title: stripMarkdownTokens(title),
    description,
    formulas: mathBlocks.slice(0, mainCount),
    example: { intro: exampleIntro, formulas: exampleFormulas },
    interpretation: interpretations.join(' '),
    decisionToolCode: resolveDecisionTool(title)
  }
}

/**
 * 4. bölümden formül + hata/doğru kartlarını çıkarır.
 * @returns {{formulaCards:Array, warningCards:Array}}
 */
export function parsePracticeCards(section) {
  const formulaCards = []
  const warningCards = []

  for (const block of splitHeadingBlocks(section)) {
    const formulaMatch = block.heading.match(FORMULA_CARD_HEADING)
    if (formulaMatch) {
      const card = parseFormulaCard(formulaMatch[2] || formulaMatch[3], block.body)
      if (card) formulaCards.push(card)
      continue
    }
    if (WARNING_CARD_HEADING.test(block.heading)) {
      const { wrong, correct } = parseMistakeCard(block.body)
      if (wrong || correct) warningCards.push({ wrong, correct })
    }
  }

  return { formulaCards, warningCards }
}
