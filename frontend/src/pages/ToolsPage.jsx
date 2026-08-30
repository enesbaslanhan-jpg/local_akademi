import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Badge, Button, Loading, EmptyState, PageHead } from '@/components/ui'
import { ContextPanelSlot, useContextPanel } from '@/components/layout/ContextPanel'
import {
  BarChart3, Calculator, CalendarDays, CreditCard, FileText, Globe, History,
  PackageCheck, Percent, PieChart, ReceiptText, ShoppingCart,
  Store, TrendingUp, Users, WalletCards, Plus, Repeat, X,
  ArrowRight, AlertTriangle
} from 'lucide-react'
import { buildCalculationCatalog, CALCULATION_CATEGORIES, CALCULATION_DEFINITIONS, modeLabelKeys } from '@/data/calculationCatalog'
import styles from './ToolsPage.module.css'
import { getFormatLocale } from '@/utils/formatters'

const ICONS = {
  kar_hesabi: TrendingUp,
  basabas_noktasi: BarChart3,
  nakit_pozisyonu: WalletCards,
  isletme_sermayesi: WalletCards,
  roi: TrendingUp,
  stok_devir: ShoppingCart,
  cac: Users,
  ltv: Users,
  ltv_cac: Percent,
  indirim_kar: Percent,
  kredi_maliyeti: CreditCard,
  ihracat_maliyet: Globe,
  fiyat_mimarisi: PieChart,
  kdv_ekleme: ReceiptText,
  kasa_kapanis: Store,
  nakit_dayanim: WalletCards,
  birim_maliyet: PackageCheck,
  vade_farki: CalendarDays,
  pazaryeri_siparis_kari: ShoppingCart,
}

const CATEGORIES = CALCULATION_CATEGORIES

/*
 * Görünüm süzgeçleri. Mockup'taki KDV Hesaplama / Gelir Vergisi / Döviz Çevir
 * kartları BURADA YOK — backend'de böyle araçlar yok. Bunun yerine gerçek
 * formül kataloğu ve gerçek detaylı modeller tek niyet kataloğunda listeleniyor.
 */
/* İSİMLER KENAR ÇUBUĞUYLA BİREBİR AYNI OLMALI.
 *
 * Önceden aynı üç görünümün iki ayrı adı vardı — çipte "Tümü" / kenar
 * çubuğunda "Genel Bakış", çipte "Hesaplamalar" / kenar çubuğunda
 * "Katalog" — ve iki ayrı geçiş yeri aynı işi yapıyordu. Tek isim seti:
 *
 *   calculator → Katalog            (hesaplama kataloğu, varsayılan)
 *   all        → Finansal Görünüm   (panelin kendi etiketi bu)
 *   history    → Geçmiş
 *
 * `all` id'si geriye dönük uyumluluk için korundu (URL `?view=all`).
 * Sıra, girişte açılan görünümle (Katalog) başlıyor. */
const VIEWS = [
  { id: 'calculator', labelKey: 'calculations.views.catalog', icon: Calculator },
  { id: 'history', labelKey: 'calculations.views.history', icon: History },
]

/* Hesap servisinin döndürdüğü ham alan adları (Türkçe, snake_case) —
   bunlar API sözleşmesi, değiştirilemez. Görüntülenen etiket
   `tools:calculations.results.*`ten geliyor; eşleme yalnız hangi
   çeviri anahtarının hangi ham alana karşılık geldiğini gösterir. */
const RESULT_LABEL_KEYS = {
  kar: 'profit',
  kar_marji: 'profitMargin',
  katki_payi: 'contributionShare',
  basabas_adet: 'breakEvenUnits',
  basabas_gelir: 'breakEvenRevenue',
  net_pozisyon: 'netCashPosition',
  nakit_oran: 'cashRatio',
  isletme_sermayesi: 'workingCapital',
  net_kar: 'netProfit',
  roi_yuzde: 'roiPercent',
  devir_hizi: 'inventoryTurnover',
  stokta_kalma_gunu: 'inventoryDays',
  cac: 'cac',
  ltv: 'ltv',
  ltv_cac_orani: 'ltvCacRatio',
  degerlendirme: 'assessment',
  indirimli_fiyat: 'discountedPrice',
  normal_kar: 'regularProfit',
  kampanya_kar: 'campaignProfit',
  kar_farki: 'profitDifference',
  aylik_taksit: 'monthlyInstallment',
  toplam_odeme: 'totalPayment',
  toplam_faiz: 'totalInterest',
  birim_maliyet_try: 'unitCostTry',
  birim_maliyet_usd: 'unitCostUsd',
  toplam_maliyet: 'totalCost',
  gercek_birim_maliyet: 'effectiveUnitCost',
  onerilen_kdv_haric_fiyat: 'suggestedPriceExVat',
  komisyon_tutari: 'commissionAmount',
  odeme_kesintisi: 'paymentFee',
  birim_katki: 'unitContribution',
  gerceklesen_marj: 'realizedMargin',
  kdv_haric_tutar: 'amountExVat',
  kdv_tutari: 'vatAmount',
  kdv_dahil_tutar: 'amountIncVat',
  toplam_giris: 'cashInTotal',
  toplam_cikis: 'cashOutTotal',
  beklenen_kasa: 'expectedCashBalance',
  aylik_nakit_acigi: 'monthlyCashGap',
  dayanma_suresi_ay: 'cashRunwayMonths',
  toplam_uretim_maliyeti: 'productionTotalCost',
  birim_maliyet: 'unitCost',
  vadeli_toplam: 'deferredTotal',
  vade_farki: 'termSurcharge',
  aylik_esit_odeme: 'equalMonthlyPayment',
  siparis_toplam_maliyeti: 'orderTotalCost',
  siparis_katkisi: 'orderContribution',
  siparis_marji: 'orderMargin',
}

function resultLabel(key, t) {
  const mapped = RESULT_LABEL_KEYS[key]
  return mapped ? t(`calculations.results.${mapped}`) : key.replaceAll('_', ' ')
}

function resultTone(status = '') {
  if (/kârlı|pozitif|yeterli|sağlıklı|6 ay|tüketimi yok/i.test(status)) return 'success'
  if (/kritik|zarar|negatif|yetersiz|açığı/i.test(status)) return 'danger'
  return 'neutral'
}

function formatValue(value) {
  return typeof value === 'number'
    ? value.toLocaleString(getFormatLocale(), { maximumFractionDigits: 2 })
    : String(value)
}

/* Varsayılan Katalog: 'all' görünümü kaldırıldı ve
   `/app/tools` rotası bu varsayılanı kullanıyor -- eski değer
   bırakılsaydı o rota boş sayfa açardı. */
export default function ToolsPage({ initialView = 'calculator' }) {
  const { t } = useTranslation('tools')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { activeWorkspaceId } = useWorkspace()
  const [formulas, setFormulas] = useState([])
  const [models, setModels] = useState([])
  const [selected, setSelected] = useState(null)
  const [inputs, setInputs] = useState({})
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const requestedInitialView = searchParams.get('view') === 'history' ? 'history' : initialView
  const [view, setView] = useState(requestedInitialView)
  const [category, setCategory] = useState('all')
  const [error, setError] = useState('')
  const gridRef = useRef(null)
  const calcPanelRef = useRef(null)
  const pickerRef = useRef(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerCategory, setPickerCategory] = useState('all')

  /* Arama kutusu kabuğun bağlam paneliyle ortak (İŞ 2). */
  const panel = useContextPanel()
  const search = panel?.query ?? ''
  const setSearch = panel?.setQuery ?? (() => {})

  useEffect(() => {
    Promise.all([
      api.formulas.list(),
      api.financialModels.list(),
      api.formulas.getHistory().catch(() => ([])),
    ]).then(([formulaResponse, modelResponse, historyResponse]) => {
      const loaded = Array.isArray(formulaResponse) ? formulaResponse : formulaResponse.formulas || []
      setFormulas(loaded)
      setModels(modelResponse.models || [])
      setHistory(Array.isArray(historyResponse) ? historyResponse : [])
      /* `?tool=` iki biçimi de kabul eder:
           - ham formül id'si            (ör. birim_maliyet)
           - hesaplama katalog id'si     (ör. unit-cost)
         Course Player katalog id'siyle bağlantı kuruyor; burada karşılığı
         olan formüle çevrilir. Karşılığı yoksa katalog görünümü açık
         kalır — uydurma bir seçim yapılmaz. */
      const toolParam = searchParams.get('tool')
      const catalogEntry = CALCULATION_DEFINITIONS.find(entry => entry.id === toolParam)
      const targetFormulaId = catalogEntry?.simple?.formulaId ?? toolParam
      const requested = loaded.find(item => item.id === targetFormulaId)
      if (requested) {
        selectFormula(requested)
        setView('calculator')
      }
    }).catch(() => setError(t('calculations.errors.load'))).finally(() => setLoading(false))
  }, [])

  /*
   * TAKİP VERİSİ ARTIK ÇEKİLMİYOR.
   *
   * Burada `tracker.summary` ve `tracker.list` çağrılıyordu; kaldırılan
   * "Finansal Görünüm" sekmesi içindi. Aynı iki uç Ana Sayfa ve İşletme
   * Genel Bakış'ta da çağrılıyor -- yani bu sayfa her açılışta üçüncü
   * kez, hiç göstermediği bir veri için iki istek yapıyordu.
   *
   * Hesaplamalar bir HESAP modülü; tahsilat/ödeme defteri İşletme
   * Takibi'ne ait. Buraya tekrar eklenmemeli.
   */

  /* Görünüm URL'den TÜREİR — tek doğruluk kaynağı burası.
   *
   * Önceden bu effect yalnız `history` ve `models` değerlerine tepki
   * veriyordu; parametre KALKTIĞINDA hiçbir şey yapmıyordu. Bu yüzden
   * kenar çubuğundaki "Katalog" (parametresiz `/app/calculations`)
   * URL'yi değiştiriyor ama sayfa geçmiş görünümünde takılı kalıyordu. */
  useEffect(() => {
    const requestedView = searchParams.get('view')
    if (requestedView === 'history') { setView('history'); return }
    if (requestedView === 'calculator' || requestedView === 'models') { setView('calculator'); return }
    /*
     * `?view=all` ESKİ "Finansal Görünüm" sekmesiydi; kaldırıldı.
     *
     * Sebep: o sekmenin dört bloğundan üçü (Alacak/Borç/Net şeridi,
     * tahsilat-ödeme defteri, istisnalar) İşletme Takibi'ndeki veriyi
     * OLDUĞU GİBİ tekrarlıyordu -- aynı iki uç (`tracker.summary`,
     * `tracker.list`) üç ayrı ekranda çağrılıyordu. Dördüncü blok
     * ("Son hesaplamalar") ise yan sekmedeki "Geçmiş" ile aynıydı.
     * Tekrarları çıkarınca sekmeyi haklı çıkaracak hiçbir şey
     * kalmıyordu.
     *
     * Adres KIRILMIYOR: eski bağlantılar Katalog'a düşüyor.
     */
    if (requestedView === 'all') { setView('calculator'); return }
    /* Görünüm parametresi yok. `?tool=` varsa hesap makinesi açık kalmalı —
       Course Player bu biçimde derin bağlantı veriyor. Yoksa rotanın
       varsayılanına dön. */
    setView(searchParams.get('tool') ? 'calculator' : initialView)
  }, [searchParams, initialView])

  /* Görünüm her zaman URL'ye yazılır. Eskiden varsayılana eşitse parametre
     siliniyordu; o durumda kenar çubuğu hangi alt maddenin aktif olduğunu
     bilemiyordu. */
  function changeView(nextView) {
    setView(nextView)
    const next = new URLSearchParams(searchParams)
    next.set('view', nextView)
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    if (!selected) return undefined

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = event => {
      if (event.key === 'Escape') setSelected(null)
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    calcPanelRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selected])

  const catalog = useMemo(() => buildCalculationCatalog(formulas, models), [formulas, models])

  const visibleCalculations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(getFormatLocale())
    return catalog.filter(calculation => {
      const categoryMatches = category === 'all' || calculation.category === category
      const searchMatches = !query || `${t(calculation.titleKey)} ${calculation.description}`.toLocaleLowerCase(getFormatLocale()).includes(query)
      return categoryMatches && searchMatches
    })
  }, [catalog, category, search, t])

  const pickerResults = useMemo(() => {
    const query = pickerQuery.trim().toLocaleLowerCase(getFormatLocale())
    return catalog.filter(calculation => {
      const categoryMatches = pickerCategory === 'all' || calculation.category === pickerCategory
      const searchMatches = !query || `${t(calculation.titleKey)} ${calculation.description}`.toLocaleLowerCase(getFormatLocale()).includes(query)
      return categoryMatches && searchMatches
    })
  }, [catalog, pickerCategory, pickerQuery, t])

  /* Seçicide "Son kullanılanlar": gerçek geçmiş kayıtlarından türetilir. */
  const recentCalculations = useMemo(() => {
    if (history.length === 0) return []
    const seen = new Set()
    const rows = []
    history.forEach(item => {
      if (!item.formulaId || seen.has(item.formulaId)) return
      seen.add(item.formulaId)
      const calculation = catalog.find(entry => entry.simple?.formulaId === item.formulaId)
      if (calculation) rows.push(calculation)
    })
    return rows.slice(0, 5)
  }, [catalog, history])

  /* Geçmişteki kullanım sıklığı — "favori" alanı backend'de olmadığı için
     favori listesi UYDURULMUYOR, gerçek kullanım verisinden türetiliyor. */
  const frequentFormulas = useMemo(() => {
    if (history.length === 0) return []
    const counts = new Map()
    history.forEach(item => {
      if (!item.formulaId) return
      counts.set(item.formulaId, (counts.get(item.formulaId) || 0) + 1)
    })
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id, count]) => ({ formula: formulas.find(f => f.id === id), count }))
      .filter(entry => entry.formula)
  }, [formulas, history])

  const lastCalculation = history[0] || null
  const lastCalculationRows = useMemo(() => {
    if (!lastCalculation?.result) return []
    return Object.entries(lastCalculation.result)
      .filter(([key]) => !['warnings', 'assumptions', 'durum'].includes(key))
      .slice(0, 3)
  }, [lastCalculation])

  function selectFormula(formula) {
    setSelected(formula)
    setInputs(Object.fromEntries((formula.inputs || []).map(input => [input.name, ''])))
    setResult(null)
    setError('')
  }

  function openCalculation(calculation, preferredMode = 'simple') {
    if (preferredMode === 'detailed' || !calculation.formula) {
      navigate(`/app/finance/models/${calculation.detailed.modelCode}`)
      return
    }
    selectFormula({ ...calculation.formula, name: t(calculation.titleKey), category: calculation.category, calculation })
    setView('calculator')
  }

  /* Geçmiş kaydına tıklandığında o hesaplama KAYITLI GİRDİLERİYLE geri
     açılır. Önceden satırlar <article> idi ve hiçbir tıklama davranışı
     yoktu — liste görünüyordu ama tıklamak hiçbir şey yapmıyordu. */
  function openHistoryEntry(entry) {
    const formula = formulas.find(item => item.id === entry.formulaId)
    if (!formula) {
      setError(t('calculations.errors.removed'))
      return
    }
    setSelected(formula)
    /* Kayıtlı girdiler forma yazılır; o kayıtta olmayan alan boş kalır. */
    setInputs(Object.fromEntries(
      (formula.inputs || []).map(input => [input.name, entry.inputs?.[input.name] ?? ''])
    ))
    setResult(entry.result && Object.keys(entry.result).length > 0 ? entry.result : null)
    setError('')
    changeView('calculator')
  }

  function startNewCalculation() {
    setPickerOpen(true)
    setPickerQuery('')
    setPickerCategory('all')
  }

  /* `?start=1` (Sidebar hızlı aksiyonu) gelince seçiciyi aç, sonra URL'i temizle. */
  useEffect(() => {
    if (searchParams.get('start') === '1') {
      setPickerOpen(true)
      setPickerQuery('')
      setPickerCategory('all')
      const next = new URLSearchParams(searchParams)
      next.delete('start')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!pickerOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = event => {
      if (event.key === 'Escape') setPickerOpen(false)
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    pickerRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [pickerOpen])

  function openPickerCalculation(calculation) {
    setPickerOpen(false)
    openCalculation(calculation)
  }

  async function calculate() {
    if (!selected) return
    setCalculating(true)
    setError('')
    setResult(null)
    try {
      const numericInputs = Object.fromEntries(
        (selected.inputs || []).map(input => [input.name, inputs[input.name] === '' ? 0 : Number(inputs[input.name])])
      )
      const response = await api.formulas.calculate(selected.id, numericInputs)
      setResult({
        ...(response.result || response),
        warnings: response.warnings || response.result?.warnings || []
      })
      const freshHistory = await api.formulas.getHistory().catch(() => null)
      if (Array.isArray(freshHistory)) setHistory(freshHistory)
    } catch (err) {
      setError(err.message || t('calculations.errors.calculate'))
    } finally {
      setCalculating(false)
    }
  }

  function openHistoryResult(item) {
    const formula = formulas.find(entry => entry.id === item.formulaId)
    setSelected(formula || {
      id: item.formulaId || item.id,
      name: item.formulaName || t('calculations.savedCalculationName'),
      description: t('calculations.savedCalculationDescription'),
      category: 'daily',
      inputs: []
    })
    setInputs(item.inputs || {})
    setResult(item.result || {})
    setError('')
    changeView('calculator')
  }

  function workspaceRoute(section) {
    navigate(activeWorkspaceId ? `/app/workspaces/${activeWorkspaceId}/${section}` : '/app/workspaces')
  }

  if (loading) return <Loading text={t('calculations.loading')} />

  const showTools = view === 'calculator'
  const showAside = false

  const resultEntries = result
    ? Object.entries(result).filter(([key]) => !['warnings', 'assumptions', 'durum'].includes(key))
    : []

  return (
    <div className={styles.page}>
      <ContextPanelSlot>
        <div className={styles.panelBlock}>
          {/* Sayfanın TEK turuncu ana CTA'sı */}
          <button type="button" className={styles.panelCta} onClick={startNewCalculation}>
            <Plus size={16} aria-hidden="true" />
            {t('calculations.startNew')}
          </button>
        </div>

        {frequentFormulas.length > 0 && (
          <div className={styles.panelBlock}>
            <div className={styles.panelLabel}>{t('calculations.panel.frequent')}</div>
            {frequentFormulas.map(({ formula, count }) => (
              <button
                key={formula.id}
                type="button"
                className={styles.panelLink}
                onClick={() => { selectFormula(formula); changeView('calculator') }}
              >
                <span className={styles.panelLinkText}>{formula.name}</span>
                <span className={styles.panelCount}>{count}</span>
              </button>
            ))}
          </div>
        )}

        <div className={styles.panelBlock}>
          <div className={styles.panelLabel}>{t('calculations.title')}</div>
          {catalog.slice(0, 12).map(calculation => (
            <button
              key={calculation.id}
              type="button"
              className={`${styles.panelLink} ${selected?.calculation?.id === calculation.id && view === 'calculator' ? styles.panelLinkActive : ''}`}
              onClick={() => openCalculation(calculation)}
            >
              <span className={styles.panelLinkText}>{t(calculation.titleKey)}</span>
            </button>
          ))}
        </div>

        <div className={styles.panelBlock}>
          <div className={styles.panelLabel}>{t('calculations.panel.records')}</div>
          <button
            type="button"
            className={`${styles.panelLink} ${view === 'history' ? styles.panelLinkActive : ''}`}
            onClick={() => changeView('history')}
          >
            <span className={styles.panelLinkText}>{t('calculations.views.history')}</span>
            <span className={styles.panelCount}>{history.length}</span>
          </button>
        </div>
      </ContextPanelSlot>

      <PageHead
        title={t('calculations.title')}
        subtitle={t('calculations.subtitle')}
        actions={(
          <>
            <Button variant="secondary" onClick={() => workspaceRoute('documents')}><FileText size={15} /> {t('calculations.importAction')}</Button>
            <Button onClick={startNewCalculation}><Calculator size={15} /> {t('calculations.startNewButton')}</Button>
          </>
        )}
      />

      {/* Çipler YALNIZ MOBİLDE görünür (CSS). Masaüstünde geçişi kenar
          çubuğu alt menüsü yapıyor; ikisini birlikte göstermek aynı iş için
          iki ayrı kumanda demekti. Mobilde kenar çubuğu bir çekmece
          olduğu için çipler orada tek geçiş yolu. */}
      <div className={styles.viewChips} role="group" aria-label={t('calculations.viewFilterAria')}>
        {VIEWS.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.viewChip} ${view === item.id ? styles.viewChipActive : ''}`}
              onClick={() => changeView(item.id)}
              aria-pressed={view === item.id}
            >
              {Icon && <Icon size={15} aria-hidden="true" />}
              {t(item.labelKey)}
              {item.id === 'history' && <span className={styles.chipCount}>{history.length}</span>}
            </button>
          )
        })}
      </div>


      {view === 'history' && (
        <div className={styles.historyList}>
          {history.length === 0 ? <EmptyState message={t('calculations.historyEmpty')} /> : history.map(item => (
            <button
              key={item.id}
              type="button"
              className={styles.historyItem}
              onClick={() => openHistoryEntry(item)}
              title={t('calculations.openHistoryAria', { name: item.formulaName })}
            >
              <div><strong>{item.formulaName}</strong><span>{new Date(item.createdAt).toLocaleString(getFormatLocale())}</span></div>
              <p>{Object.entries(item.result || {}).filter(([key]) => key !== 'durum').slice(0, 4).map(([key, value]) => `${resultLabel(key, t)}: ${value}`).join(' · ')}</p>
            </button>
          ))}
        </div>
      )}

      {showTools && (
        <div className={`${styles.workArea} ${showAside ? styles.workAreaWithAside : ''}`}>
          <div className={styles.workMain}>
            <h2 className={styles.sectionTitle} ref={gridRef}>{t('calculations.todayQuestion')}</h2>

            <div className={styles.categories}>
              {Object.entries(CATEGORIES).map(([id, labelKey]) => (
                <button
                  key={id}
                  type="button"
                  className={category === id ? styles.categoryActive : ''}
                  onClick={() => setCategory(id)}
                  aria-pressed={category === id}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>

            {visibleCalculations.length === 0 ? (
              <EmptyState message={t('calculations.searchEmpty')} />
            ) : (
              <div className={styles.toolGrid}>
                {visibleCalculations.map(calculation => {
                  const Icon = ICONS[calculation.simple?.formulaId] || Calculator
                  return (
                    <button
                      key={calculation.id}
                      type="button"
                      className={`${styles.toolCard} ${selected?.calculation?.id === calculation.id ? styles.toolCardActive : ''}`}
                      onClick={() => openCalculation(calculation)}
                      aria-pressed={selected?.calculation?.id === calculation.id}
                    >
                      <Icon className={styles.toolIcon} size={38} strokeWidth={1.2} aria-hidden="true" />
                      <strong>{t(calculation.titleKey)}</strong>
                      <small>{calculation.description || t('calculations.inputCountSuffix', { count: calculation.inputCount })}</small>
                      <span className={styles.modeLabels}>{modeLabelKeys(calculation).map(labelKey => <em key={labelKey}>{t(labelKey)}</em>)}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {selected && (
              <div className={styles.calcOverlay} role="presentation" onMouseDown={() => setSelected(null)}>
              <div ref={calcPanelRef} className={`${styles.calcPanel} ${result ? styles.calcResultPanel : ''}`} role="dialog" aria-modal="true" aria-label={t('calculations.panelAria', { name: selected.name })} tabIndex={-1} onMouseDown={event => event.stopPropagation()}>
                <button type="button" className={styles.calcClose} onClick={() => setSelected(null)} aria-label={t('calculations.closePanelAria')}><X size={19} /></button>
                {!result ? (
                  <>
                    <div className={styles.panelHeading}>
                      <Badge variant="info">{t(CATEGORIES[selected.category])}</Badge>
                      <h2>{selected.name}</h2>
                      <p>{selected.description}</p>
                    </div>
                    {selected.calculation?.detailed && (
                      <div className={styles.modeSwitch} role="tablist" aria-label={t('calculations.modeAria')}>
                        <button type="button" role="tab" aria-selected="true">{t('calculations.simpleMode')}</button>
                        <button type="button" role="tab" aria-selected="false" onClick={() => openCalculation(selected.calculation, 'detailed')}>{t('calculations.detailedMode')}</button>
                      </div>
                    )}
                    {selected.warning && <div className={styles.warning}>{selected.warning}</div>}
                    <div className={styles.inputGrid}>
                      {selected.inputs?.map(input => (
                        <label key={input.name} className={styles.inputField}>
                          <span>{input.label}</span>
                          <div className={styles.inputWrap}>
                            <input type="number" value={inputs[input.name] ?? ''} onChange={event => setInputs(current => ({ ...current, [input.name]: event.target.value }))} placeholder="0" min={input.min} max={input.max} step="any" />
                            <small>{input.unit}</small>
                          </div>
                        </label>
                      ))}
                    </div>
                    <Button variant="primary" onClick={calculate} disabled={calculating}>
                      {calculating ? t('calculations.calculating') : t('calculations.calculate')}
                    </Button>
                    {error && <div className={styles.error}>{error}</div>}
                  </>
                ) : (
                  <div className={styles.financeResultView}>
                    <header className={styles.financeResultHead}>
                      <div><span>{t('calculations.resultBadge')}</span><h2>{selected.name}</h2><p>{t('calculations.resultCompletedNote')}</p></div>
                      <Button variant="secondary" onClick={() => setResult(null)}>{t('calculations.editAssumptions')}</Button>
                    </header>
                    <div className={styles.financeResultColumns}>
                      <section className={styles.financeResultHero}>
                        <Badge variant={resultTone(result.durum) === 'danger' ? 'danger' : resultTone(result.durum) === 'success' ? 'success' : 'warning'}>{result.durum || t('calculations.statusCalculated')}</Badge>
                        <span>{resultEntries[0] ? resultLabel(resultEntries[0][0], t) : t('calculations.mainResultFallback')}</span>
                        <strong>{resultEntries[0] ? formatValue(resultEntries[0][1]) : '—'}</strong>
                        <p>{selected.description}</p>
                      </section>
                      <section className={styles.financeResultDrivers}>
                        <h3>{t('calculations.driversHeading')}</h3>
                        {resultEntries.slice(1).length === 0 ? <p>{t('calculations.noExtraResults')}</p> : resultEntries.slice(1).map(([key, value]) => (
                          <div key={key}><span>{resultLabel(key, t)}</span><strong>{formatValue(value)}</strong></div>
                        ))}
                      </section>
                    </div>
                    {(result.warnings?.length > 0 || result.assumptions?.length > 0) && (
                      <section className={styles.financeResultNotes}>
                        <h3>{t('calculations.assumptionsHeading')}</h3>
                        {[...(result.assumptions || []), ...(result.warnings || [])].map((item, index) => <p key={index}>{item}</p>)}
                      </section>
                    )}
                  </div>
                )}
              </div>
              </div>
            )}
          </div>

          {/* Sağ sütun yalnızca GERÇEK geçmiş varken görünür. */}
          {showAside && (
            <aside className={styles.aside} aria-label={t('calculations.asideAria')}>
              <section className={styles.asideCard}>
                <div className={styles.asideLabel}>{t('calculations.asideLastCalculation')}</div>
                <strong className={styles.asideTitle}>{lastCalculation.formulaName}</strong>
                <span className={styles.asideMeta}>
                  {new Date(lastCalculation.createdAt).toLocaleString(getFormatLocale())}
                </span>
                <dl className={styles.asideRows}>
                  {lastCalculationRows.map(([key, value]) => (
                    <div key={key}>
                      <dt>{resultLabel(key, t)}</dt>
                      <dd>{formatValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {frequentFormulas[0] && (
                <section className={styles.asideCard}>
                  <div className={styles.asideLabel}>{t('calculations.asideMostUsedTool')}</div>
                  <strong className={styles.asideTitle}>{frequentFormulas[0].formula.name}</strong>
                  <span className={styles.asideMeta}>{t('calculations.timesCalculated', { count: frequentFormulas[0].count })}</span>
                  <button
                    type="button"
                    className={styles.asideAction}
                    onClick={() => { selectFormula(frequentFormulas[0].formula); changeView('calculator') }}
                  >
                    <Repeat size={15} aria-hidden="true" />
                    {t('calculations.recalculate')}
                  </button>
                </section>
              )}
            </aside>
          )}
        </div>
      )}

      {/* Son işlemler — gerçek geçmiş kayıtları. Kayıt yoksa hiç gösterilmez. */}
      {view === 'calculator' && history.length > 0 && (
        <section className={styles.recent} aria-label={t('calculations.recentSection')}>
          <h2 className={styles.sectionTitle}>{t('calculations.recentSection')}</h2>
          <div className={styles.historyList}>
            {history.slice(0, 5).map(item => (
              <button
                key={item.id}
                type="button"
                className={styles.historyItem}
                onClick={() => openHistoryEntry(item)}
                title={t('calculations.openHistoryAria', { name: item.formulaName })}
              >
                <div><strong>{item.formulaName}</strong><span>{new Date(item.createdAt).toLocaleString(getFormatLocale())}</span></div>
                <p>{Object.entries(item.result || {}).filter(([key]) => key !== 'durum').slice(0, 4).map(([key, value]) => `${resultLabel(key, t)}: ${value}`).join(' · ')}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {pickerOpen && (
        <div className={styles.startOverlay} role="presentation" onMouseDown={() => setPickerOpen(false)}>
          <div ref={pickerRef} className={styles.startDialog} role="dialog" aria-modal="true" aria-label={t('calculations.pickerAria')} tabIndex={-1} onMouseDown={event => event.stopPropagation()}>
            <button type="button" className={styles.calcClose} onClick={() => setPickerOpen(false)} aria-label={t('calculations.closePickerAria')}><X size={19} /></button>
            <div className={styles.panelHeading}>
              <h2>{t('calculations.startNew')}</h2>
              <p>{t('calculations.pickerIntro')}</p>
            </div>
            <input
              type="search"
              className={styles.startSearch}
              placeholder={t('calculations.searchPlaceholder')}
              value={pickerQuery}
              onChange={event => setPickerQuery(event.target.value)}
              autoFocus
            />
            <div className={styles.categories} role="group" aria-label={t('calculations.categoriesAria')}>
              <button type="button" className={pickerCategory === 'all' ? styles.categoryActive : ''} onClick={() => setPickerCategory('all')} aria-pressed={pickerCategory === 'all'}>{t('calculations.allCategories')}</button>
              {Object.entries(CATEGORIES).map(([id, labelKey]) => (
                <button key={id} type="button" className={pickerCategory === id ? styles.categoryActive : ''} onClick={() => setPickerCategory(id)} aria-pressed={pickerCategory === id}>{t(labelKey)}</button>
              ))}
            </div>
            {!pickerQuery && pickerCategory === 'all' && recentCalculations.length > 0 && (
              <div className={styles.startRecent}>
                <div className={styles.startLabel}>{t('calculations.recentlyUsed')}</div>
                <div className={styles.startList}>
                  {recentCalculations.map(calculation => {
                    const Icon = ICONS[calculation.simple?.formulaId] || Calculator
                    return (
                      <button key={calculation.id} type="button" className={styles.startItem} onClick={() => openPickerCalculation(calculation)}>
                        <Icon className={styles.toolIcon} size={20} strokeWidth={1.4} aria-hidden="true" />
                        <span><strong>{t(calculation.titleKey)}</strong><small>{calculation.description}</small></span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className={styles.startLabel}>{pickerQuery || pickerCategory !== 'all' ? t('calculations.resultsLabel') : t('calculations.allCalculations')}</div>
            {pickerResults.length === 0 ? (
              <div className={styles.startEmpty}>{t('calculations.searchEmpty')}</div>
            ) : (
              <div className={styles.startList}>
                {pickerResults.map(calculation => {
                  const Icon = ICONS[calculation.simple?.formulaId] || Calculator
                  return (
                    <button key={calculation.id} type="button" className={styles.startItem} onClick={() => openPickerCalculation(calculation)}>
                      <Icon className={styles.toolIcon} size={20} strokeWidth={1.4} aria-hidden="true" />
                      <span><strong>{t(calculation.titleKey)}</strong><small>{calculation.description}</small></span>
                      <em className={styles.startModes}>{modeLabelKeys(calculation).map(labelKey => <b key={labelKey}>{t(labelKey)}</b>)}</em>
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
