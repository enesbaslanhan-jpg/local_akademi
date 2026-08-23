import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { buildCalculationCatalog, CALCULATION_CATEGORIES, CALCULATION_DEFINITIONS, modeLabels } from '@/data/calculationCatalog'
import styles from './ToolsPage.module.css'

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
  { id: 'calculator', label: 'Katalog', icon: Calculator },
  { id: 'history', label: 'Geçmiş', icon: History },
]

const RESULT_LABELS = {
  kar: 'Kâr',
  kar_marji: 'Kâr marjı',
  katki_payi: 'Katkı payı',
  basabas_adet: 'Başabaş adedi',
  basabas_gelir: 'Başabaş geliri',
  net_pozisyon: 'Net nakit pozisyonu',
  nakit_oran: 'Nakit oranı',
  isletme_sermayesi: 'İşletme sermayesi',
  net_kar: 'Net kâr',
  roi_yuzde: 'ROI',
  devir_hizi: 'Stok devir hızı',
  stokta_kalma_gunu: 'Stokta kalma süresi',
  cac: 'Müşteri edinme maliyeti',
  ltv: 'Müşteri yaşam boyu değeri',
  ltv_cac_orani: 'LTV/CAC oranı',
  degerlendirme: 'Değerlendirme',
  indirimli_fiyat: 'İndirimli fiyat',
  normal_kar: 'Normal kâr',
  kampanya_kar: 'Kampanya kârı',
  kar_farki: 'Kâr farkı',
  aylik_taksit: 'Aylık taksit',
  toplam_odeme: 'Toplam ödeme',
  toplam_faiz: 'Toplam faiz',
  birim_maliyet_try: 'Birim maliyet (TRY)',
  birim_maliyet_usd: 'Birim maliyet (USD)',
  toplam_maliyet: 'Toplam maliyet',
  gercek_birim_maliyet: 'Gerçek birim maliyet',
  onerilen_kdv_haric_fiyat: 'Önerilen KDV hariç fiyat',
  komisyon_tutari: 'Komisyon tutarı',
  odeme_kesintisi: 'Ödeme kesintisi',
  birim_katki: 'Birim katkı',
  gerceklesen_marj: 'Gerçekleşen marj',
  kdv_haric_tutar: 'KDV hariç tutar',
  kdv_tutari: 'KDV tutarı',
  kdv_dahil_tutar: 'KDV dahil tutar',
  toplam_giris: 'Toplam kasa girişi',
  toplam_cikis: 'Toplam kasa çıkışı',
  beklenen_kasa: 'Beklenen kasa',
  aylik_nakit_acigi: 'Aylık nakit açığı',
  dayanma_suresi_ay: 'Nakit dayanma süresi (ay)',
  toplam_uretim_maliyeti: 'Toplam üretim maliyeti',
  birim_maliyet: 'Birim maliyet',
  vadeli_toplam: 'Vadeli toplam',
  vade_farki: 'Vade farkı',
  aylik_esit_odeme: 'Aylık eşit ödeme',
  siparis_toplam_maliyeti: 'Sipariş toplam maliyeti',
  siparis_katkisi: 'Sipariş katkısı',
  siparis_marji: 'Sipariş marjı',
}

function resultTone(status = '') {
  if (/kârlı|pozitif|yeterli|sağlıklı|6 ay|tüketimi yok/i.test(status)) return 'success'
  if (/kritik|zarar|negatif|yetersiz|açığı/i.test(status)) return 'danger'
  return 'neutral'
}

function formatValue(value) {
  return typeof value === 'number'
    ? value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })
    : String(value)
}

const money = new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency: 'TRY', maximumFractionDigits: 0
})

function shortDueDate(value) {
  if (!value) return 'Tarih yok'
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(value))
}

/* Varsayılan Katalog: 'all' görünümü kaldırıldı ve
   `/app/tools` rotası bu varsayılanı kullanıyor -- eski değer
   bırakılsaydı o rota boş sayfa açardı. */
export default function ToolsPage({ initialView = 'calculator' }) {
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
    }).catch(() => setError('Hesaplamalar yüklenemedi.')).finally(() => setLoading(false))
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
    const query = search.trim().toLocaleLowerCase('tr-TR')
    return catalog.filter(calculation => {
      const categoryMatches = category === 'all' || calculation.category === category
      const searchMatches = !query || `${calculation.title} ${calculation.description}`.toLocaleLowerCase('tr-TR').includes(query)
      return categoryMatches && searchMatches
    })
  }, [catalog, category, search])

  const pickerResults = useMemo(() => {
    const query = pickerQuery.trim().toLocaleLowerCase('tr-TR')
    return catalog.filter(calculation => {
      const categoryMatches = pickerCategory === 'all' || calculation.category === pickerCategory
      const searchMatches = !query || `${calculation.title} ${calculation.description}`.toLocaleLowerCase('tr-TR').includes(query)
      return categoryMatches && searchMatches
    })
  }, [catalog, pickerCategory, pickerQuery])

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
    selectFormula({ ...calculation.formula, category: calculation.category, calculation })
    setView('calculator')
  }

  /* Geçmiş kaydına tıklandığında o hesaplama KAYITLI GİRDİLERİYLE geri
     açılır. Önceden satırlar <article> idi ve hiçbir tıklama davranışı
     yoktu — liste görünüyordu ama tıklamak hiçbir şey yapmıyordu. */
  function openHistoryEntry(entry) {
    const formula = formulas.find(item => item.id === entry.formulaId)
    if (!formula) {
      setError('Bu hesaplama artık katalogda yok.')
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
      setError(err.message || 'Hesaplama yapılamadı.')
    } finally {
      setCalculating(false)
    }
  }

  function openHistoryResult(item) {
    const formula = formulas.find(entry => entry.id === item.formulaId)
    setSelected(formula || {
      id: item.formulaId || item.id,
      name: item.formulaName || 'Kaydedilmiş hesaplama',
      description: 'Geçmişte kaydedilen gerçek hesaplama sonucu.',
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

  if (loading) return <Loading text="Hesaplamalar yükleniyor..." />

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
            Hesaplama Başlat
          </button>
        </div>

        {frequentFormulas.length > 0 && (
          <div className={styles.panelBlock}>
            <div className={styles.panelLabel}>Sık kullandıklarınız</div>
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
          <div className={styles.panelLabel}>Hesaplamalar</div>
          {catalog.slice(0, 12).map(calculation => (
            <button
              key={calculation.id}
              type="button"
              className={`${styles.panelLink} ${selected?.calculation?.id === calculation.id && view === 'calculator' ? styles.panelLinkActive : ''}`}
              onClick={() => openCalculation(calculation)}
            >
              <span className={styles.panelLinkText}>{calculation.title}</span>
            </button>
          ))}
        </div>

        <div className={styles.panelBlock}>
          <div className={styles.panelLabel}>Kayıtlar</div>
          <button
            type="button"
            className={`${styles.panelLink} ${view === 'history' ? styles.panelLinkActive : ''}`}
            onClick={() => changeView('history')}
          >
            <span className={styles.panelLinkText}>Geçmiş</span>
            <span className={styles.panelCount}>{history.length}</span>
          </button>
        </div>
      </ContextPanelSlot>

      <PageHead
        title="Hesaplamalar"
        subtitle="Bir sayı bulun; gerektiğinde aynı hesapta detaylı metodolojiye geçin."
        actions={(
          <>
            <Button variant="secondary" onClick={() => workspaceRoute('documents')}><FileText size={15} /> İçe aktar</Button>
            <Button onClick={startNewCalculation}><Calculator size={15} /> Hesaplama başlat</Button>
          </>
        )}
      />

      {/* Çipler YALNIZ MOBİLDE görünür (CSS). Masaüstünde geçişi kenar
          çubuğu alt menüsü yapıyor; ikisini birlikte göstermek aynı iş için
          iki ayrı kumanda demekti. Mobilde kenar çubuğu bir çekmece
          olduğu için çipler orada tek geçiş yolu. */}
      <div className={styles.viewChips} role="group" aria-label="Görünüm süzgeci">
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
              {item.label}
              {item.id === 'history' && <span className={styles.chipCount}>{history.length}</span>}
            </button>
          )
        })}
      </div>


      {view === 'history' && (
        <div className={styles.historyList}>
          {history.length === 0 ? <EmptyState message="Henüz hesaplama geçmişi yok." /> : history.map(item => (
            <button
              key={item.id}
              type="button"
              className={styles.historyItem}
              onClick={() => openHistoryEntry(item)}
              title={`${item.formulaName} hesaplamasını girdileriyle aç`}
            >
              <div><strong>{item.formulaName}</strong><span>{new Date(item.createdAt).toLocaleString('tr-TR')}</span></div>
              <p>{Object.entries(item.result || {}).filter(([key]) => key !== 'durum').slice(0, 4).map(([key, value]) => `${RESULT_LABELS[key] || key}: ${value}`).join(' · ')}</p>
            </button>
          ))}
        </div>
      )}

      {showTools && (
        <div className={`${styles.workArea} ${showAside ? styles.workAreaWithAside : ''}`}>
          <div className={styles.workMain}>
            <h2 className={styles.sectionTitle} ref={gridRef}>Bugün ne hesaplamak istiyorsunuz?</h2>

            <div className={styles.categories}>
              {Object.entries(CATEGORIES).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={category === id ? styles.categoryActive : ''}
                  onClick={() => setCategory(id)}
                  aria-pressed={category === id}
                >
                  {label}
                </button>
              ))}
            </div>

            {visibleCalculations.length === 0 ? (
              <EmptyState message="Aramanıza uygun hesaplama bulunamadı." />
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
                      <strong>{calculation.title}</strong>
                      <small>{calculation.description || `${calculation.inputCount} bilgiyle hesaplanır`}</small>
                      <span className={styles.modeLabels}>{modeLabels(calculation).map(label => <em key={label}>{label}</em>)}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {selected && (
              <div className={styles.calcOverlay} role="presentation" onMouseDown={() => setSelected(null)}>
              <div ref={calcPanelRef} className={`${styles.calcPanel} ${result ? styles.calcResultPanel : ''}`} role="dialog" aria-modal="true" aria-label={`${selected.name} hesaplama alanı`} tabIndex={-1} onMouseDown={event => event.stopPropagation()}>
                <button type="button" className={styles.calcClose} onClick={() => setSelected(null)} aria-label="Hesaplama alanını kapat"><X size={19} /></button>
                {!result ? (
                  <>
                    <div className={styles.panelHeading}>
                      <Badge variant="info">{CATEGORIES[selected.category]}</Badge>
                      <h2>{selected.name}</h2>
                      <p>{selected.description}</p>
                    </div>
                    {selected.calculation?.detailed && (
                      <div className={styles.modeSwitch} role="tablist" aria-label="Hesaplama modu">
                        <button type="button" role="tab" aria-selected="true">Basit</button>
                        <button type="button" role="tab" aria-selected="false" onClick={() => openCalculation(selected.calculation, 'detailed')}>Detaylı</button>
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
                      {calculating ? 'Hesaplanıyor…' : 'Sonucu Hesapla'}
                    </Button>
                    {error && <div className={styles.error}>{error}</div>}
                  </>
                ) : (
                  <div className={styles.financeResultView}>
                    <header className={styles.financeResultHead}>
                      <div><span>Finans Sonucu</span><h2>{selected.name}</h2><p>Hesaplama gerçek girdilerinizle tamamlandı ve geçmişe kaydedildi.</p></div>
                      <Button variant="secondary" onClick={() => setResult(null)}>Varsayımları düzenle</Button>
                    </header>
                    <div className={styles.financeResultColumns}>
                      <section className={styles.financeResultHero}>
                        <Badge variant={resultTone(result.durum) === 'danger' ? 'danger' : resultTone(result.durum) === 'success' ? 'success' : 'warning'}>{result.durum || 'Hesaplandı'}</Badge>
                        <span>{RESULT_LABELS[resultEntries[0]?.[0]] || resultEntries[0]?.[0]?.replaceAll('_', ' ') || 'Ana sonuç'}</span>
                        <strong>{resultEntries[0] ? formatValue(resultEntries[0][1]) : '—'}</strong>
                        <p>{selected.description}</p>
                      </section>
                      <section className={styles.financeResultDrivers}>
                        <h3>Sonucu etkileyenler</h3>
                        {resultEntries.slice(1).length === 0 ? <p>Ek sonuç alanı bulunmuyor.</p> : resultEntries.slice(1).map(([key, value]) => (
                          <div key={key}><span>{RESULT_LABELS[key] || key.replaceAll('_', ' ')}</span><strong>{formatValue(value)}</strong></div>
                        ))}
                      </section>
                    </div>
                    {(result.warnings?.length > 0 || result.assumptions?.length > 0) && (
                      <section className={styles.financeResultNotes}>
                        <h3>Varsayım ve uyarılar</h3>
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
            <aside className={styles.aside} aria-label="Son hesaplama özeti">
              <section className={styles.asideCard}>
                <div className={styles.asideLabel}>Son hesaplamanız</div>
                <strong className={styles.asideTitle}>{lastCalculation.formulaName}</strong>
                <span className={styles.asideMeta}>
                  {new Date(lastCalculation.createdAt).toLocaleString('tr-TR')}
                </span>
                <dl className={styles.asideRows}>
                  {lastCalculationRows.map(([key, value]) => (
                    <div key={key}>
                      <dt>{RESULT_LABELS[key] || key.replaceAll('_', ' ')}</dt>
                      <dd>{formatValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {frequentFormulas[0] && (
                <section className={styles.asideCard}>
                  <div className={styles.asideLabel}>En sık kullandığınız araç</div>
                  <strong className={styles.asideTitle}>{frequentFormulas[0].formula.name}</strong>
                  <span className={styles.asideMeta}>{frequentFormulas[0].count} kez hesapladınız</span>
                  <button
                    type="button"
                    className={styles.asideAction}
                    onClick={() => { selectFormula(frequentFormulas[0].formula); changeView('calculator') }}
                  >
                    <Repeat size={15} aria-hidden="true" />
                    Yeniden hesapla
                  </button>
                </section>
              )}
            </aside>
          )}
        </div>
      )}

      {/* Son işlemler — gerçek geçmiş kayıtları. Kayıt yoksa hiç gösterilmez. */}
      {view === 'calculator' && history.length > 0 && (
        <section className={styles.recent} aria-label="Son işlemler">
          <h2 className={styles.sectionTitle}>Son işlemler</h2>
          <div className={styles.historyList}>
            {history.slice(0, 5).map(item => (
              <button
                key={item.id}
                type="button"
                className={styles.historyItem}
                onClick={() => openHistoryEntry(item)}
                title={`${item.formulaName} hesaplamasını girdileriyle aç`}
              >
                <div><strong>{item.formulaName}</strong><span>{new Date(item.createdAt).toLocaleString('tr-TR')}</span></div>
                <p>{Object.entries(item.result || {}).filter(([key]) => key !== 'durum').slice(0, 4).map(([key, value]) => `${RESULT_LABELS[key] || key}: ${value}`).join(' · ')}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {pickerOpen && (
        <div className={styles.startOverlay} role="presentation" onMouseDown={() => setPickerOpen(false)}>
          <div ref={pickerRef} className={styles.startDialog} role="dialog" aria-modal="true" aria-label="Hesaplama seçici" tabIndex={-1} onMouseDown={event => event.stopPropagation()}>
            <button type="button" className={styles.calcClose} onClick={() => setPickerOpen(false)} aria-label="Seçiciyi kapat"><X size={19} /></button>
            <div className={styles.panelHeading}>
              <h2>Hesaplama Başlat</h2>
              <p>Katalogdan bir hesaplama seçin; seçtiğinizde girdi alanı açılır.</p>
            </div>
            <input
              type="search"
              className={styles.startSearch}
              placeholder="Hesaplama ara (ör. kâr, stok, KDV…)"
              value={pickerQuery}
              onChange={event => setPickerQuery(event.target.value)}
              autoFocus
            />
            <div className={styles.categories} role="group" aria-label="Hesaplama kategorileri">
              <button type="button" className={pickerCategory === 'all' ? styles.categoryActive : ''} onClick={() => setPickerCategory('all')} aria-pressed={pickerCategory === 'all'}>Tümü</button>
              {Object.entries(CATEGORIES).map(([id, label]) => (
                <button key={id} type="button" className={pickerCategory === id ? styles.categoryActive : ''} onClick={() => setPickerCategory(id)} aria-pressed={pickerCategory === id}>{label}</button>
              ))}
            </div>
            {!pickerQuery && pickerCategory === 'all' && recentCalculations.length > 0 && (
              <div className={styles.startRecent}>
                <div className={styles.startLabel}>Son kullanılanlar</div>
                <div className={styles.startList}>
                  {recentCalculations.map(calculation => {
                    const Icon = ICONS[calculation.simple?.formulaId] || Calculator
                    return (
                      <button key={calculation.id} type="button" className={styles.startItem} onClick={() => openPickerCalculation(calculation)}>
                        <Icon className={styles.toolIcon} size={20} strokeWidth={1.4} aria-hidden="true" />
                        <span><strong>{calculation.title}</strong><small>{calculation.description}</small></span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className={styles.startLabel}>{pickerQuery || pickerCategory !== 'all' ? 'Sonuçlar' : 'Tüm hesaplamalar'}</div>
            {pickerResults.length === 0 ? (
              <div className={styles.startEmpty}>Aramanıza uygun hesaplama bulunamadı.</div>
            ) : (
              <div className={styles.startList}>
                {pickerResults.map(calculation => {
                  const Icon = ICONS[calculation.simple?.formulaId] || Calculator
                  return (
                    <button key={calculation.id} type="button" className={styles.startItem} onClick={() => openPickerCalculation(calculation)}>
                      <Icon className={styles.toolIcon} size={20} strokeWidth={1.4} aria-hidden="true" />
                      <span><strong>{calculation.title}</strong><small>{calculation.description}</small></span>
                      <em className={styles.startModes}>{modeLabels(calculation).map(label => <b key={label}>{label}</b>)}</em>
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
