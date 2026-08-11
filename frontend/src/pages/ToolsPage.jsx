import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Badge, Button, Loading, EmptyState } from '@/components/ui'
import { ContextPanelSlot, useContextPanel } from '@/components/layout/ContextPanel'
import {
  BarChart3, Calculator, CalendarDays, CreditCard, FileText, Globe, History,
  PackageCheck, Percent, PieChart, ReceiptText, Search, ShoppingCart,
  Store, TrendingUp, Users, WalletCards, FlaskConical, Plus, Repeat, X
} from 'lucide-react'
import FinancialModelLibrary from './FinancialModelLibrary'
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

const CATEGORIES = {
  all: 'Tümü',
  daily: 'Günlük işlemler',
  cash: 'Nakit ve vade',
  sales: 'Satış ve fiyat',
  stock: 'Stok ve maliyet',
  growth: 'Büyüme',
}

const CATEGORY_FALLBACK = {
  kar_hesabi: 'daily',
  basabas_noktasi: 'sales',
  nakit_pozisyonu: 'cash',
  isletme_sermayesi: 'cash',
  roi: 'growth',
  stok_devir: 'stock',
  cac: 'growth',
  ltv: 'growth',
  ltv_cac: 'growth',
  indirim_kar: 'sales',
  kredi_maliyeti: 'cash',
  ihracat_maliyet: 'stock',
  fiyat_mimarisi: 'sales',
}

/*
 * Görünüm süzgeçleri. Mockup'taki KDV Hesaplama / Gelir Vergisi / Döviz Çevir
 * kartları BURADA YOK — backend'de böyle araçlar yok. Bunun yerine gerçek
 * formül kataloğu ve gerçek model kütüphanesi listeleniyor.
 * "Model Laboratuvarı" sekmesi Paket 4'te eklendi; kaybolmaması için süzgeç
 * satırında da yerini koruyor.
 */
const VIEWS = [
  { id: 'all', label: 'Tümü', icon: null },
  { id: 'calculator', label: 'Hesaplamalar', icon: Calculator },
  { id: 'models', label: 'Model Laboratuvarı', icon: FlaskConical },
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

export default function ToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { activeWorkspaceId } = useWorkspace()
  const [formulas, setFormulas] = useState([])
  const [selected, setSelected] = useState(null)
  const [inputs, setInputs] = useState({})
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const initialView = VIEWS.some(item => item.id === searchParams.get('view')) ? searchParams.get('view') : 'all'
  const [view, setView] = useState(initialView)
  const [category, setCategory] = useState('all')
  const [error, setError] = useState('')
  const gridRef = useRef(null)
  const calcPanelRef = useRef(null)

  /* Arama kutusu kabuğun bağlam paneliyle ortak (İŞ 2). */
  const panel = useContextPanel()
  const search = panel?.query ?? ''
  const setSearch = panel?.setQuery ?? (() => {})

  useEffect(() => {
    Promise.all([
      api.formulas.list(),
      api.formulas.getHistory().catch(() => ([])),
    ]).then(([formulaResponse, historyResponse]) => {
      const loaded = (Array.isArray(formulaResponse) ? formulaResponse : formulaResponse.formulas || [])
        .map(formula => ({ ...formula, category: formula.category || CATEGORY_FALLBACK[formula.id] || 'daily' }))
      setFormulas(loaded)
      setHistory(Array.isArray(historyResponse) ? historyResponse : [])
      const requested = loaded.find(item => item.id === searchParams.get('tool'))
      if (requested) {
        selectFormula(requested)
        setView('calculator')
      }
    }).catch(() => setError('Finans Merkezi yüklenemedi.')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const requestedView = searchParams.get('view')
    if (VIEWS.some(item => item.id === requestedView)) setView(requestedView)
  }, [searchParams])

  function changeView(nextView) {
    setView(nextView)
    const next = new URLSearchParams(searchParams)
    if (nextView === 'all') next.delete('view')
    else next.set('view', nextView)
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

  const visibleFormulas = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR')
    return formulas.filter(formula => {
      const categoryMatches = category === 'all' || formula.category === category
      const searchMatches = !query || `${formula.name} ${formula.description || ''}`.toLocaleLowerCase('tr-TR').includes(query)
      return categoryMatches && searchMatches
    })
  }, [category, formulas, search])

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

  function startNewCalculation() {
    setSelected(null)
    setResult(null)
    setError('')
    setCategory('all')
    setSearch('')
    changeView('calculator')
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  function workspaceRoute(section) {
    navigate(activeWorkspaceId ? `/app/workspaces/${activeWorkspaceId}/${section}` : '/app/workspaces')
  }

  if (loading) return <Loading text="Finans Merkezi yükleniyor..." />

  const showTools = view === 'all' || view === 'calculator'
  const showAside = view === 'all' && Boolean(lastCalculation)

  return (
    <div className={styles.page}>
      <ContextPanelSlot>
        <div className={styles.panelBlock}>
          {/* Sayfanın TEK turuncu ana CTA'sı */}
          <button type="button" className={styles.panelCta} onClick={startNewCalculation}>
            <Plus size={16} aria-hidden="true" />
            Yeni Hesaplama
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
          <div className={styles.panelLabel}>Hesaplama araçları</div>
          {formulas.map(formula => (
            <button
              key={formula.id}
              type="button"
              className={`${styles.panelLink} ${selected?.id === formula.id && view === 'calculator' ? styles.panelLinkActive : ''}`}
              onClick={() => { selectFormula(formula); changeView('calculator') }}
            >
              <span className={styles.panelLinkText}>{formula.name}</span>
            </button>
          ))}
        </div>

        <div className={styles.panelBlock}>
          <div className={styles.panelLabel}>Finansal modeller</div>
          <button
            type="button"
            className={`${styles.panelLink} ${view === 'models' ? styles.panelLinkActive : ''}`}
            onClick={() => changeView('models')}
          >
            <span className={styles.panelLinkText}>Model Laboratuvarı</span>
          </button>
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

      <header className={`${styles.pageHead} ${styles.financeHero}`}>
        <div className={styles.pageHeadText}>
          <h1>Finans Merkezi</h1>
          <p className={styles.intro}>
            Kasa, gelir-gider, maliyet, fiyat, stok ve vadeli işlemleri tek yerde hesaplayın.
          </p>
        </div>
        <label className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Hesaplama ara…"
            aria-label="Hesaplamalarda ara"
          />
        </label>
      </header>

      <div className={styles.viewChips} role="group" aria-label="Görünüm süzgeci">
        {VIEWS.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.viewChip} ${['models', 'history'].includes(item.id) ? styles.viewChipMobileOnly : ''} ${view === item.id ? styles.viewChipActive : ''}`}
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

      {view === 'all' && (
        <section className={styles.quickActions} aria-label="Ön muhasebe işlemleri">
          <button type="button" onClick={() => workspaceRoute('tracker')}>
            <WalletCards aria-hidden="true" /><span><strong>Gelir, gider ve tahsilat</strong><small>Ödeme, alacak, senet ve işlem kaydı</small></span>
          </button>
          <button type="button" onClick={() => workspaceRoute('documents')}>
            <FileText aria-hidden="true" /><span><strong>Fatura ve belgeler</strong><small>Belge yükle, okut ve kayda dönüştür</small></span>
          </button>
          <button type="button" onClick={() => workspaceRoute('calendar')}>
            <CalendarDays aria-hidden="true" /><span><strong>Ödeme takvimi</strong><small>Vadeleri ve yaklaşan işlemleri gör</small></span>
          </button>
        </section>
      )}

      {/* Model Laboratuvarı — /app/finance/models route'u da aynı bileşeni
          tam sayfa göstermeye devam eder. */}
      {view === 'models' && <FinancialModelLibrary embedded />}

      {view === 'history' && (
        <div className={styles.historyList}>
          {history.length === 0 ? <EmptyState message="Henüz hesaplama geçmişi yok." /> : history.map(item => (
            <article key={item.id} className={styles.historyItem}>
              <div><strong>{item.formulaName}</strong><span>{new Date(item.createdAt).toLocaleString('tr-TR')}</span></div>
              <p>{Object.entries(item.result || {}).filter(([key]) => key !== 'durum').slice(0, 4).map(([key, value]) => `${RESULT_LABELS[key] || key}: ${value}`).join(' · ')}</p>
            </article>
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

            {visibleFormulas.length === 0 ? (
              <EmptyState message="Aramanıza uygun hesaplama bulunamadı." />
            ) : (
              <div className={styles.toolGrid}>
                {visibleFormulas.map(formula => {
                  const Icon = ICONS[formula.id] || Calculator
                  return (
                    <button
                      key={formula.id}
                      type="button"
                      className={`${styles.toolCard} ${selected?.id === formula.id ? styles.toolCardActive : ''}`}
                      onClick={() => selectFormula(formula)}
                      aria-pressed={selected?.id === formula.id}
                    >
                      <Icon className={styles.toolIcon} size={38} strokeWidth={1.2} aria-hidden="true" />
                      <strong>{formula.name}</strong>
                      <small>{formula.description || `${formula.inputs?.length || 0} bilgiyle hesaplanır`}</small>
                    </button>
                  )
                })}
              </div>
            )}

            {selected && (
              <div className={styles.calcOverlay} role="presentation" onMouseDown={() => setSelected(null)}>
              <div ref={calcPanelRef} className={styles.calcPanel} role="dialog" aria-modal="true" aria-label={`${selected.name} hesaplama alanı`} tabIndex={-1} onMouseDown={event => event.stopPropagation()}>
                <button type="button" className={styles.calcClose} onClick={() => setSelected(null)} aria-label="Hesaplama alanını kapat"><X size={19} /></button>
                <div className={styles.panelHeading}>
                  <Badge variant="info">{CATEGORIES[selected.category]}</Badge>
                  <h2>{selected.name}</h2>
                  <p>{selected.description}</p>
                </div>
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
                {/* Turuncu bağlam panelindeki "Yeni Hesaplama"da kullanıldı;
                    sayfada ikinci turuncu olmasın diye bu buton teal. */}
                <Button variant="primary" onClick={calculate} disabled={calculating}>
                  {calculating ? 'Hesaplanıyor…' : 'Sonucu Hesapla'}
                </Button>
                {error && <div className={styles.error}>{error}</div>}

                {result && (
                  <div className={styles.resultBox}>
                    <div className={styles.resultHeading}>
                      <h3>Hesaplama sonucu</h3>
                      {result.durum && <span className={styles[resultTone(result.durum)]}>{result.durum}</span>}
                    </div>
                    {/* Ana metrik (ilk sonuç alanı) büyük ve ayrı; destekleyiciler altta ızgarada */}
                    <div className={styles.resultGrid}>
                      {Object.entries(result)
                        .filter(([key]) => !['warnings', 'assumptions', 'durum'].includes(key))
                        .map(([key, value], idx) => (
                          <div key={key} className={`${styles.resultItem} ${idx === 0 ? styles.resultItemPrimary : ''}`}>
                            <span>{RESULT_LABELS[key] || key.replaceAll('_', ' ')}</span>
                            <strong>{formatValue(value)}</strong>
                          </div>
                        ))}
                    </div>
                    {result.warnings?.map((warning, index) => <p key={index} className={styles.resultWarning}>{warning}</p>)}
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
      {view === 'all' && history.length > 0 && (
        <section className={styles.recent} aria-label="Son işlemler">
          <h2 className={styles.sectionTitle}>Son işlemler</h2>
          <div className={styles.historyList}>
            {history.slice(0, 5).map(item => (
              <article key={item.id} className={styles.historyItem}>
                <div><strong>{item.formulaName}</strong><span>{new Date(item.createdAt).toLocaleString('tr-TR')}</span></div>
                <p>{Object.entries(item.result || {}).filter(([key]) => key !== 'durum').slice(0, 4).map(([key, value]) => `${RESULT_LABELS[key] || key}: ${value}`).join(' · ')}</p>
              </article>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
