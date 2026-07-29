import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Badge, Button, Loading } from '@/components/ui'
import {
  BarChart3, Calculator, CalendarDays, CreditCard, FileText, Globe, History,
  PackageCheck, Percent, PieChart, ReceiptText, Search, ShoppingCart,
  Store, TrendingUp, Users, WalletCards
} from 'lucide-react'
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

export default function ToolsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { activeWorkspaceId } = useWorkspace()
  const [formulas, setFormulas] = useState([])
  const [selected, setSelected] = useState(null)
  const [inputs, setInputs] = useState({})
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [tab, setTab] = useState('calculator')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

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
      if (requested) selectFormula(requested)
    }).catch(() => setError('Finans Merkezi yüklenemedi.')).finally(() => setLoading(false))
  }, [])

  const visibleFormulas = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR')
    return formulas.filter(formula => {
      const categoryMatches = category === 'all' || formula.category === category
      const searchMatches = !query || `${formula.name} ${formula.description || ''}`.toLocaleLowerCase('tr-TR').includes(query)
      return categoryMatches && searchMatches
    })
  }, [category, formulas, search])

  function selectFormula(formula) {
    setSelected(formula)
    setInputs(Object.fromEntries((formula.inputs || []).map(input => [input.name, ''])))
    setResult(null)
    setError('')
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

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>GÜNLÜK İŞLETME YÖNETİMİ</span>
          <h1>İşletme Finans Merkezi</h1>
          <p>Kasa, gelir-gider, maliyet, fiyat, stok ve vadeli işlemleri tek yerde hesaplayın.</p>
        </div>
        <div className={styles.heroMetric}><strong>{formulas.length}</strong><span>hazır hesaplama</span></div>
      </section>

      <section className={styles.quickActions} aria-label="Ön muhasebe işlemleri">
        <button onClick={() => workspaceRoute('tracker')}><WalletCards /><span><strong>Gelir, gider ve tahsilat</strong><small>Ödeme, alacak, senet ve işlem kaydı</small></span></button>
        <button onClick={() => workspaceRoute('documents')}><FileText /><span><strong>Fatura ve belgeler</strong><small>Belge yükle, okut ve kayda dönüştür</small></span></button>
        <button onClick={() => workspaceRoute('calendar')}><CalendarDays /><span><strong>Ödeme takvimi</strong><small>Vadeleri ve yaklaşan işlemleri gör</small></span></button>
      </section>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'calculator' ? styles.tabActive : ''}`} onClick={() => setTab('calculator')}>
          <Calculator size={17} /> Hesaplamalar
        </button>
        <button className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`} onClick={() => setTab('history')}>
          <History size={17} /> Geçmiş <span>{history.length}</span>
        </button>
      </div>

      {tab === 'calculator' && (
        <>
          <div className={styles.filters}>
            <label className={styles.search}><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="KDV, kasa, maliyet veya kârlılık ara…" /></label>
            <div className={styles.categories}>
              {Object.entries(CATEGORIES).map(([id, label]) => (
                <button key={id} className={category === id ? styles.categoryActive : ''} onClick={() => setCategory(id)}>{label}</button>
              ))}
            </div>
          </div>

          <div className={styles.calcLayout}>
            <div className={styles.formulaList}>
              {visibleFormulas.map(formula => {
                const Icon = ICONS[formula.id] || Calculator
                return (
                  <button key={formula.id} className={`${styles.formulaCard} ${selected?.id === formula.id ? styles.formulaCardActive : ''}`} onClick={() => selectFormula(formula)}>
                    <span className={styles.formulaIcon}><Icon size={20} /></span>
                    <span><strong>{formula.name}</strong><small>{formula.description || `${formula.inputs?.length || 0} bilgiyle hesaplanır`}</small></span>
                  </button>
                )
              })}
              {visibleFormulas.length === 0 && <div className={styles.noResults}>Aramanıza uygun hesaplama bulunamadı.</div>}
            </div>

            <div className={styles.calcPanel}>
              {!selected ? (
                <div className={styles.placeholder}><Calculator size={48} /><h2>Bir hesaplama seçin</h2><p>Günlük işletme kararınız için soldaki seçeneklerden başlayın.</p></div>
              ) : (
                <>
                  <div className={styles.panelHeading}>
                    <div><Badge variant="info">{CATEGORIES[selected.category]}</Badge><h2>{selected.name}</h2><p>{selected.description}</p></div>
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
                  <Button variant="primary" onClick={calculate} disabled={calculating}>{calculating ? 'Hesaplanıyor…' : 'Sonucu Hesapla'}</Button>
                  {error && <div className={styles.error}>{error}</div>}

                  {result && (
                    <div className={styles.resultBox}>
                      <div className={styles.resultHeading}>
                        <h3>Hesaplama sonucu</h3>
                        {result.durum && <span className={styles[resultTone(result.durum)]}>{result.durum}</span>}
                      </div>
                      <div className={styles.resultGrid}>
                        {Object.entries(result).filter(([key]) => !['warnings', 'assumptions', 'durum'].includes(key)).map(([key, value]) => (
                          <div key={key} className={styles.resultItem}>
                            <span>{RESULT_LABELS[key] || key.replaceAll('_', ' ')}</span>
                            <strong>{typeof value === 'number' ? value.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : String(value)}</strong>
                          </div>
                        ))}
                      </div>
                      {result.warnings?.map((warning, index) => <p key={index} className={styles.resultWarning}>{warning}</p>)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className={styles.historyList}>
          {history.length === 0 ? <div className={styles.noResults}>Henüz hesaplama geçmişi yok.</div> : history.map(item => (
            <article key={item.id} className={styles.historyItem}>
              <div><strong>{item.formulaName}</strong><span>{new Date(item.createdAt).toLocaleString('tr-TR')}</span></div>
              <p>{Object.entries(item.result || {}).filter(([key]) => key !== 'durum').slice(0, 4).map(([key, value]) => `${RESULT_LABELS[key] || key}: ${value}`).join(' · ')}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
