import { describe, expect, it } from 'vitest'
import {
  splitCanonicalMarkdown,
  parseMistakeCard,
  extractInlineReferences,
  cleanCalculationLabel,
  extractDecisionCode,
  resolveCalculation,
  repairLaTeXEscapes,
  parseDecisionIntegration,
  parseFormulaCard,
  parsePracticeCards,
  DECISION_TOOL_TITLES
} from './canonicalContent'

const CANONICAL = `# Gerçek Birim Maliyet

## Pratik Karar: "Ürünümün gerçek maliyeti nedir?"

## 1. Ham Maliyet İllüzyonu

Gövde metni burada.

## 2. Vaka Analizi

$$\\text{Gerçek Birim Maliyet} = \\text{Malzeme} + \\text{İşçilik}$$

## 3. Karar Araçları Entegrasyonu

[ Karar Araçları > Ürünüm Gerçekten Kârlı mı? (DC-PROFIT-001) ]
[ Hesaplamalar > Gerçek Birim Maliyet Hesaplayıcısını Aç ]

## 4. Pratik Bilgi Kartları

### 💡 Formül Kartı
Gerçek Birim Maliyet = Malzeme + İşçilik

### ⚠️ Hata / Doğru Kartı
**Yaygın Hata:** Sadece malzeme maliyetine bakmak.
**Doğru Yaklaşım:** Tüm dolaylı giderleri dağıtmak.

## 5. Doğrulanmış Resmî Kaynaklar

- GİB, Vergi Usul Kanunu
`

describe('splitCanonicalMarkdown', () => {
  it('gövdede yalnız 1 ve 2. bölümleri bırakır', () => {
    const { body } = splitCanonicalMarkdown(CANONICAL)
    expect(body).toContain('Ham Maliyet İllüzyonu')
    expect(body).toContain('Vaka Analizi')
    expect(body).not.toContain('Karar Araçları Entegrasyonu')
    expect(body).not.toContain('Pratik Bilgi Kartları')
    expect(body).not.toContain('Doğrulanmış Resmî Kaynaklar')
  })

  it('tekrar eden bölümleri ayrı ayrı döndürür', () => {
    const { sections } = splitCanonicalMarkdown(CANONICAL)
    expect(sections.decisionTools).toContain('DC-PROFIT-001')
    expect(sections.practiceCards).toContain('Formül Kartı')
    expect(sections.sources).toContain('Vergi Usul Kanunu')
  })

  it('gövdede pratik kart içeriği ikinci kez görünmez', () => {
    const { body } = splitCanonicalMarkdown(CANONICAL)
    expect(body).not.toContain('Yaygın Hata')
    expect(body).not.toContain('Doğru Yaklaşım')
  })

  it('bölüm numarası kaysa da başlık anlamından yakalar', () => {
    const shifted = CANONICAL.replace('## 3.', '## 7.').replace('## 4.', '## 8.')
    const { sections } = splitCanonicalMarkdown(shifted)
    expect(sections.decisionTools).toBeTruthy()
    expect(sections.practiceCards).toBeTruthy()
  })

  it('boş girdide çökmez', () => {
    expect(splitCanonicalMarkdown('')).toEqual({ body: '', sections: {} })
  })
})

describe('parseMistakeCard', () => {
  it('yanlış ve doğru yaklaşımı ayırır', () => {
    const { wrong, correct } = parseMistakeCard(
      '**Yaygın Hata:** Sadece malzemeye bakmak. **Doğru Yaklaşım:** Dolaylı giderleri dağıtmak.'
    )
    expect(wrong).toBe('Sadece malzemeye bakmak.')
    expect(correct).toBe('Dolaylı giderleri dağıtmak.')
  })

  it('markdown yıldızlarını temizler', () => {
    const { wrong, correct } = parseMistakeCard('**Yaygın Hata:** A **Doğru Yaklaşım:** B')
    expect(wrong).not.toContain('*')
    expect(correct).not.toContain('*')
  })

  it('etiket yoksa içeriği kaybetmez', () => {
    const { wrong, correct } = parseMistakeCard('Etiketsiz açıklama metni')
    expect(wrong).toBe('Etiketsiz açıklama metni')
    expect(correct).toBeNull()
  })
})

describe('extractInlineReferences', () => {
  it('karar aracı ve hesaplama referanslarını ayırır', () => {
    const refs = extractInlineReferences(
      '[ Karar Araçları > Kârlılık (DC-PROFIT-001) ]\n[ Hesaplamalar > Katkı Payı ]'
    )
    expect(refs.decisionTools).toHaveLength(1)
    expect(refs.calculations).toEqual(['Katkı Payı'])
  })
})

describe('cleanCalculationLabel', () => {
  it('çağrı kalıbını atar', () => {
    expect(cleanCalculationLabel('ROI Aracını Aç')).toBe('ROI')
    expect(cleanCalculationLabel('Gerçek Birim Maliyet Hesaplayıcısını Aç')).toBe('Gerçek Birim Maliyet')
  })

  it('mod ekini atar', () => {
    expect(cleanCalculationLabel('Katkı Payı > Detaylı mod')).toBe('Katkı Payı')
  })
})

describe('extractDecisionCode', () => {
  it('DC kodunu bulur', () => {
    expect(extractDecisionCode('Yeni Personel (DC-HIRE-006)')).toBe('DC-HIRE-006')
  })
  it('yoksa null döner', () => {
    expect(extractDecisionCode('Katkı Payı')).toBeNull()
  })
})

describe('resolveCalculation', () => {
  const defs = [
    { id: 'unit-cost', title: 'Gerçek Birim Maliyet' },
    { id: 'roi', title: 'Yatırım Getirisi (ROI)' },
    { id: 'contribution-margin', title: 'Katkı Payı' }
  ]

  it('tam eşleşmeyi bulur', () => {
    const r = resolveCalculation('Gerçek Birim Maliyet Hesaplayıcısını Aç', defs)
    expect(r.status).toBe('FOUND')
    expect(r.definition.id).toBe('unit-cost')
  })

  it('kısaltmayı eşler', () => {
    const r = resolveCalculation('ROI Aracını Aç', defs)
    expect(r.status).toBe('FOUND')
    expect(r.definition.id).toBe('roi')
  })

  it('katalogda olmayan için sahte eşleşme üretmez', () => {
    const r = resolveCalculation('Tedarikçi Seçim Matrisi', defs)
    expect(r.status).toBe('MISSING')
    expect(r.definition).toBeNull()
  })
})

describe('repairLaTeXEscapes', () => {
  it('TAB artı harf → backslash + eksik harf geri gelir (JSON.parse tarafından yutulmuş \\text)', () => {
    expect(repairLaTeXEscapes('$$\text{Malzeme}$$')).toBe('$$\\text{Malzeme}$$')
  })

  it('CR artı harf → backslash + eksik harf geri gelir (\\right)', () => {
    expect(repairLaTeXEscapes('\u000Dight)')).toBe('\\right)')
  })

  it('eksik harfli komutlar tek başına da onarılır', () => {
    expect(repairLaTeXEscapes('\\ext{ TL} \\imes \\ight)')).toBe('\\text{ TL} \\times \\right)')
  })

  it('doğru komutlara dokunmaz (\\text / \\times / \\right)', () => {
    const clean = '\\text{İşçilik} + \\times \\right)'
    expect(repairLaTeXEscapes(clean)).toBe(clean)
  })
})

describe('parseDecisionIntegration', () => {
  it('tırnaklı başlık + bağlam + adımları çıkarır (Type A)', () => {
    const section = `Bu araç, ürününüzün tüm değişken giderlerini tek tek analiz eder.

> [ Karar Araçları > "Ürünüm Gerçekten Kârlı mı? (DC-PROFIT-001)" ]

**Bu araçta yapacağınız analiz adımları:**
1.  Ham maliyet tuzağını kontrol edin.
2.  Katkı payınızı görün.
3.  Gerekçeli karar fişinizi alın.`
    const d = parseDecisionIntegration(section)
    expect(d).not.toBeNull()
    expect(d.toolCode).toBe('DC-PROFIT-001')
    expect(d.toolTitle).toBe('Ürünüm Gerçekten Kârlı mı?')
    expect(d.context).toContain('tüm değişken giderlerini')
    expect(d.bullets).toHaveLength(3)
    expect(d.bullets[0]).toContain('Ham maliyet tuzağı')
    expect(d.bullets[0]).not.toContain('*')
  })

  it('bold başlık segmentini temiz çıkarır (Type B)', () => {
    const section = `Yeni bir personelin işletmenize getireceği tüm yasal yükleri hesaplar.

\`\`\`
[ Hesaplamalar > Yeni Personel Alabilir miyim? Aracını Aç (DC-HIRE-006) ]
\`\`\`

**Bu araçta yapacağınız analiz adımları:**
1.  Aylık toplam personel maliyetinizi girin.
2.  İşletmenizin kârlılık marjını görün.`
    const d = parseDecisionIntegration(section)
    expect(d.toolCode).toBe('DC-HIRE-006')
    expect(d.toolTitle).toBe('Yeni Personel Alabilir miyim?')
    expect(d.bullets).toHaveLength(2)
  })

  it('"**X** içerisindeki **Y (DC-…)**" deseninde yalnız son segment alınır', () => {
    const section = `Elinizdeki ürünlerin satmaya devam edilip edilmeyeceğini test edin.

**Karar Araçları** içerisindeki **Bu Ürünü Satmaya Devam Etmeli miyim? (DC-CONTINUE-012)**

1.  Ürün bazlı kâr marjınızı görün.
2.  Stok maliyetlerinizi kontrol edin.`
    const d = parseDecisionIntegration(section)
    expect(d.toolCode).toBe('DC-CONTINUE-012')
    expect(d.toolTitle).toBe('Bu Ürünü Satmaya Devam Etmeli miyim?')
  })

  it('İş Akışı başlığındaki Türkçe İ ile de çalışır', () => {
    const section = `Kasa ve KDV karmaşalarını çözmek için günlük kasa takibi yapın.

**Kasa Dedektifliği İş Akışı:**
1.  Günün başlangıç nakit avansını girin.
2.  Z Raporundaki toplam satışı girin.`
    const d = parseDecisionIntegration(section)
    expect(d).not.toBeNull()
    expect(d.bullets).toHaveLength(2)
  })

  it('yalnız hesaplama referansı olan bölümde null döner (içerik uydurulmaz)', () => {
    const section = `Yatırım Getirisi (ROI) ve Kâr Marjı hesaplama araçlarından yararlanabilirsiniz.

[ Hesaplamalar > ROI Aracını Aç ]`
    expect(parseDecisionIntegration(section)).toBeNull()
  })

  it('boş girdide null döner', () => {
    expect(parseDecisionIntegration('')).toBeNull()
    expect(parseDecisionIntegration(null)).toBeNull()
  })
})

describe('parseFormulaCard', () => {
  it('açıklama + formül + örnek + yorumu ayırır', () => {
    const card = parseFormulaCard('Gerçek Birim Maliyet', `Gerçek birim maliyetinizi tüm giderleri dağıtarak hesaplayın.

**Formül:**
$$\\text{GBM} = \\frac{\\text{Toplam Maliyet}}{\\text{Satış Adedi}}$$

*Aşağıdaki mevcut oranlarla hesaplayalım:*
$$\\frac{1000}{50} = 20$$

*Birim başına 20 TL maliyet çıkar.*`)
    expect(card.title).toBe('Gerçek Birim Maliyet')
    expect(card.description).toContain('tüm giderleri dağıtarak')
    expect(card.formulas).toHaveLength(1)
    expect(card.formulas[0]).toContain('\\frac')
    expect(card.example.intro).toContain('Aşağıdaki mevcut oranlarla')
    expect(card.example.formulas).toHaveLength(1)
    expect(card.interpretation).toContain('20 TL')
  })

  it('formül yoksa null döner', () => {
    expect(parseFormulaCard('Başlık', 'Sadece metin, formül yok.')).toBeNull()
  })

  it('tek satır $$ formülü çok satırlı bloklarla karışmaz', () => {
    const card = parseFormulaCard('Stok Devir Hızı', `Açıklama metni.

$$\\text{Stok Devir Hızı} = \\frac{\\text{SMM}}{\\text{Ortalama Stok}}$$

*Mevcut oranlar ile hesaplayalım:*
$$\\frac{50000}{10000} = 5$$`)
    expect(card.formulas).toHaveLength(1)
    expect(card.example.formulas).toHaveLength(1)
    expect(card.formulas[0]).toContain('Stok Devir Hızı')
  })
})

describe('parsePracticeCards', () => {
  const section = `### 💡 Formül Kartı
Açıklama.

$$\\text{X} = \\text{Y}$$

### ⚠️ Hata / Doğru Kartı
**Yaygın Hata:** Sadece A'ya bakmak.
**Doğru Yaklaşım:** B'yi de hesaplamak.

### 💡 Formül Kartı: Stok Devir Hızı
İkinci kart.

$$\\text{SDH} = \\frac{\\text{SMM}}{\\text{Stok}}$$`

  it('formül ve hata kartlarını ayırır', () => {
    const { formulaCards, warningCards } = parsePracticeCards(section)
    expect(formulaCards).toHaveLength(2)
    expect(warningCards).toHaveLength(1)
    expect(warningCards[0].wrong).toContain('Sadece A')
    expect(warningCards[0].correct).toContain('B')
  })

  it('başlık varyantını da yakalar', () => {
    const { formulaCards } = parsePracticeCards(section)
    expect(formulaCards[1].title).toBe('Stok Devir Hızı')
  })

  it('boş girdide boş kümeler döner', () => {
    expect(parsePracticeCards('')).toEqual({ formulaCards: [], warningCards: [] })
  })
})

describe('formül kartı → katalog çözümlemesi (sahte route üretmez)', () => {
  const defs = [
    { id: 'unit-cost', title: 'Gerçek Birim Maliyet' },
    { id: 'roi', title: 'Yatırım Getirisi (ROI)' },
    { id: 'break-even-quantity', title: 'Başa Baş Satış Adedi' },
    { id: 'cac-payback', title: 'CAC Geri Ödeme Süresi' },
    { id: 'price-architecture', title: 'Fiyat Mimarisi ve Hedef Marj' },
    { id: 'discount-profit', title: 'İndirim/Kampanya Kârlılığı' },
    { id: 'product-profitability', title: 'Ürün Kârlılığı' },
    { id: 'net-working-capital', title: 'Net İşletme Sermayesi' },
    { id: 'post-return-margin', title: 'İade Sonrası Gerçek Marj' },
    { id: 'cash-runway', title: 'Nakit Dayanma Süresi' },
    { id: 'inventory-turnover-dio', title: 'Stok Devir ve DIO' },
    { id: 'vat-addition', title: 'KDV Ekleme' },
    { id: 'export-unit-cost', title: 'İhracat Birim Maliyeti' }
  ]

  it.each([
    ['Hedef Marj Tabanlı Satış Fiyatı Formülü', 'price-architecture'],
    ['Gereken Satış Hacmi Artış Formülü', 'discount-profit'],
    ['Ürün Katkısı ve Dağıtılmış Gider Formülleri', 'product-profitability'],
    ['Büyümenin Nakit Bedeli Formülü', 'net-working-capital'],
    ['Beklenen İade Kaybı ve Gerçek Sipariş Kârı', 'post-return-margin'],
    ['Nakit Eritme Hızı (Burn Rate) ve Runway', 'cash-runway'],
    ['Stokta Kalma Süresi (DSI)', 'inventory-turnover-dio'],
    ['KDV Dahil Fiyattan Matrah ve KDV Ayıklama', 'vat-addition'],
    ['Mikro İhracat DDP Taban Satış Fiyatı', 'export-unit-cost'],
    ['Başa Baş Noktası ve Güvenlik Marjı Formülleri', 'break-even-quantity'],
    ['Kanal Net Hakediş ve Katkı Payı Formülü', 'contribution-margin']
  ])('"%s" gerçek karşılığına bağlanır (%s)', (title, id) => {
    const r = resolveCalculation(title, [...defs, { id: 'contribution-margin', title: 'Katkı Payı' }, { id: 'order-profitability', title: 'Sipariş Kârlılığı' }])
    expect(r.status).toBe('FOUND')
    expect(r.definition.id).toBe(id)
  })

  it('genel payback etiketi CAC hesaplamasına bağlanmaz (sahte route engeli)', () => {
    const r = resolveCalculation('Yazılım Geri Ödeme Süresi (Payback Period)', defs)
    expect(r.status).toBe('MISSING')
    expect(r.definition).toBeNull()
  })

  it('kargo desi gibi karşılığı olmayan kart için CTA üretilmez', () => {
    const r = resolveCalculation('Kargo Desi ve Minimum Sepet Limit Formülü', defs)
    expect(r.status).toBe('MISSING')
    expect(r.definition).toBeNull()
  })

  it('tek referans olsa bile alakasız hesaplamaya bağlanmaz', () => {
    const r = resolveCalculation('Tedarikçi Ağırlıklı Puan Formülü', defs)
    expect(r.status).toBe('MISSING')
    expect(r.definition).toBeNull()
  })
})

describe('DECISION_TOOL_TITLES', () => {
  it('katalogdaki tüm kodları kapsar', () => {
    expect(Object.keys(DECISION_TOOL_TITLES)).toHaveLength(13)
    expect(DECISION_TOOL_TITLES['DC-PROFIT-001']).toBe('Ürünüm Gerçekten Kârlı mı?')
    expect(DECISION_TOOL_TITLES['DC-TAX-013']).toBe('Hangi şirket türü bana uygun?')
  })
})

describe('eski entegrasyon başlıkları', () => {
  const withLegacyHeading = heading => `# Ders\n\n## 1. Gövde\n\nMetin.\n\n## 3. ${heading}\n\n[ Hesaplamalar > Gerçek Birim Maliyet Aracını Aç ]\n`

  it.each([
    'Finans Merkez Entegrasyonu',
    'Hesaplamalar Entegrasyonu',
    'Karar Araçları Entegrasyonu',
    'Model Lab Entegrasyonu'
  ])('"%s" gövdeden çıkarılır', heading => {
    const { body, sections } = splitCanonicalMarkdown(withLegacyHeading(heading))
    expect(body).not.toContain(heading)
    expect(sections.decisionTools).toContain('Hesaplamalar >')
  })

  it('eski terminoloji gövdede kalmaz', () => {
    const { body } = splitCanonicalMarkdown(withLegacyHeading('Finans Merkez Entegrasyonu'))
    expect(body).not.toMatch(/Finans Merkez|Model Lab/)
  })
})

describe('etiket yolu ve eş anlamlılar', () => {
  const defs = [
    { id: 'break-even-quantity', title: 'Başa Baş Satış Adedi' },
    { id: 'wacc-fcff-dcf', title: 'Basitleştirilmiş WACC ve FCFF DCF' },
    { id: 'cash-position', title: 'Nakit Pozisyonu' }
  ]

  it('yol önekini atar', () => {
    expect(cleanCalculationLabel('Nakit Yönetimi > Döviz Pozisyonu ve Kur Riski Analizi'))
      .toBe('Döviz Pozisyonu ve Kur Riski Analizi')
  })

  it('Başabaş Noktası mevcut hesaplamaya eşlenir', () => {
    const r = resolveCalculation('Başabaş Noktası Aracını Aç', defs)
    expect(r.status).toBe('FOUND')
    expect(r.definition.id).toBe('break-even-quantity')
  })

  it('Şirket Değerleme mevcut değerleme modeline eşlenir', () => {
    const r = resolveCalculation('Şirket Değerleme Modelleri', defs)
    expect(r.status).toBe('FOUND')
    expect(r.definition.id).toBe('wacc-fcff-dcf')
  })

  it('karşılığı olmayan kur riski için sahte eşleşme üretmez', () => {
    const r = resolveCalculation('Nakit Yönetimi > Döviz Pozisyonu ve Kur Riski Analizi', defs)
    expect(r.status).toBe('MISSING')
    expect(r.definition).toBeNull()
  })
})
