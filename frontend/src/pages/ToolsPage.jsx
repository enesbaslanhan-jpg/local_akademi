import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, Badge, Button, Loading } from '@/components/ui'
import { Calculator, History, TrendingUp, DollarSign, PieChart, BarChart3, Percent, Users, ShoppingCart, CreditCard, Globe } from 'lucide-react'
import styles from './ToolsPage.module.css'

const ICONS = {
  kar_hesabi: TrendingUp,
  basabas_noktasi: BarChart3,
  nakit_pozisyonu: DollarSign,
  isletme_sermayesi: DollarSign,
  roi: TrendingUp,
  stok_devir: ShoppingCart,
  cac: Users,
  ltv: Users,
  ltv_cac: Percent,
  indirim_kar: Percent,
  kredi_maliyeti: CreditCard,
  ihracat_maliyet: Globe,
  fiyat_mimarisi: PieChart,
}

export default function ToolsPage() {
  const [searchParams] = useSearchParams()
  const [formulas, setFormulas] = useState([])
  const [selected, setSelected] = useState(null)
  const [inputs, setInputs] = useState({})
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [tab, setTab] = useState('calculator')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.formulas.list(),
      api.formulas.getHistory().catch(() => ([])),
    ]).then(([f, h]) => {
      const loadedFormulas = Array.isArray(f) ? f : f.formulas || []
      setFormulas(loadedFormulas)
      setHistory(Array.isArray(h) ? h : [])
      const requestedFormula = loadedFormulas.find(item => item.id === searchParams.get('tool'))
      if (requestedFormula) handleSelect(requestedFormula)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function handleSelect(formula) {
    setSelected(formula)
    const defaults = {}
    formula.inputs?.forEach(inp => { defaults[inp.name] = '' })
    setInputs(defaults)
    setResult(null)
    setError('')
  }

  async function handleCalculate() {
    if (!selected) return
    setCalculating(true)
    setError('')
    setResult(null)
    try {
      const numericInputs = {}
      selected.inputs?.forEach(inp => {
        numericInputs[inp.name] = parseFloat(inputs[inp.name]) || 0
      })
      const res = await api.formulas.calculate(selected.id, numericInputs)
      setResult(res)
    } catch (err) {
      setError(err.message || 'Hesaplama hatası')
    } finally {
      setCalculating(false)
    }
  }

  function formatLabel(key) {
    const labels = {
      kar: 'Kâr (TRY)',
      kar_marji: 'Kâr Marjı (%)',
      durum: 'Durum',
      katki_payi: 'Katkı Payı (TRY)',
      basabas_adet: 'Başabaş Noktası (adet)',
      basabas_gelir: 'Başabaş Gelir (TRY)',
      net_pozisyon: 'Net Nakit Pozisyonu (TRY)',
      nakit_oran: 'Nakit Oranı',
      isletme_sermayesi: 'İşletme Sermayesi (TRY)',
      net_kar: 'Net Kâr (TRY)',
      roi_yuzde: 'ROI (%)',
      devir_hizi: 'Stok Devir Hızı',
      stokta_kalma_gunu: 'Stokta Kalma Süresi (gün)',
      cac: 'CAC (TRY)',
      ltv: 'LTV (TRY)',
      ltv_cac_orani: 'LTV/CAC Oranı',
      degerlendirme: 'Değerlendirme',
      indirimli_fiyat: 'İndirimli Fiyat (TRY)',
      normal_kar: 'Normal Kâr (TRY)',
      kampanya_kar: 'Kampanya Kârı (TRY)',
      kar_farki: 'Kâr Farkı (TRY)',
      aylik_taksit: 'Aylık Taksit (TRY)',
      toplam_odeme: 'Toplam Ödeme (TRY)',
      toplam_faiz: 'Toplam Faiz (TRY)',
      birim_maliyet_try: 'Birim Maliyet (TRY)',
      birim_maliyet_usd: 'Birim Maliyet (USD)',
      toplam_maliyet: 'Toplam Maliyet (TRY)',
      gercek_birim_maliyet: 'Gerçek Birim Maliyet (TRY)',
      onerilen_kdv_haric_fiyat: 'Önerilen KDV Hariç Fiyat (TRY)',
      komisyon_tutari: 'Kanal Komisyonu (TRY)',
      odeme_kesintisi: 'Ödeme Kesintisi (TRY)',
      birim_katki: 'Birim Katkı (TRY)',
      gerceklesen_marj: 'Gerçekleşen Marj (%)',
    }
    return labels[key] || key
  }

  if (loading) return <Loading text="Araçlar yükleniyor..." />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Finansal Araçlar</h1>
        <p className={styles.subtitle}>{formulas.length} hesaplama aracı</p>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'calculator' ? styles.tabActive : ''}`} onClick={() => setTab('calculator')}>
          <Calculator size={16} /> Hesaplama
        </button>
        <button className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`} onClick={() => setTab('history')}>
          <History size={16} /> Geçmiş ({history.length})
        </button>
      </div>

      {tab === 'calculator' && (
        <div className={styles.calcLayout}>
          <div className={styles.formulaList}>
            <h2 className={styles.sectionTitle}>Formüller</h2>
            {formulas.map(f => {
              const Icon = ICONS[f.id] || Calculator
              return (
                <div
                  key={f.id}
                  className={`${styles.formulaCard} ${selected?.id === f.id ? styles.formulaCardActive : ''}`}
                  onClick={() => handleSelect(f)}
                >
                  <Icon size={20} />
                  <div>
                    <div className={styles.formulaName}>{f.name}</div>
                    <div className={styles.formulaMeta}>{f.inputs?.length || 0} girdi</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className={styles.calcPanel}>
            {!selected ? (
              <div className={styles.placeholder}>
                <Calculator size={48} />
                <p>Sol taraftan bir formül seçin</p>
              </div>
            ) : (
              <>
                <h2 className={styles.sectionTitle}>{selected.name}</h2>
                {selected.warning && (
                  <div className={styles.warning}>{selected.warning}</div>
                )}
                <div className={styles.inputGroup}>
                  {selected.inputs?.map(inp => (
                    <div key={inp.name} className={styles.inputField}>
                      <label className={styles.inputLabel}>
                        {inp.label} <span className={styles.inputUnit}>({inp.unit})</span>
                      </label>
                      <input
                        type="number"
                        className={styles.input}
                        value={inputs[inp.name] || ''}
                        onChange={e => setInputs(prev => ({ ...prev, [inp.name]: e.target.value }))}
                        placeholder="0"
                        min={inp.min}
                      />
                    </div>
                  ))}
                </div>
                <Button variant="primary" onClick={handleCalculate} disabled={calculating}>
                  {calculating ? 'Hesaplanıyor...' : 'Hesapla'}
                </Button>

                {error && <div className={styles.error}>{error}</div>}

                {result && (
                  <div className={styles.resultBox}>
                    <h3 className={styles.resultTitle}>Sonuç</h3>
                    {result.durum && (
                      <div className={`${styles.resultBadge} ${
                        result.durum?.includes('Kârlı') || result.durum?.includes('Pozitif') || result.durum?.includes('Yeterli') || result.durum?.includes('Sağlıklı')
                          ? styles.resultSuccess
                          : result.durum?.includes('Başa baş') || result.durum?.includes('Kabul')
                            ? styles.resultNeutral
                            : styles.resultDanger
                      }`}>
                        {result.durum}
                      </div>
                    )}
                    <div className={styles.resultGrid}>
                      {Object.entries(result)
                        .filter(([k]) => k !== 'assumptions' && k !== 'warnings' && k !== 'durum')
                        .map(([k, v]) => (
                          <div key={k} className={styles.resultItem}>
                            <span className={styles.resultLabel}>{formatLabel(k)}</span>
                            <span className={styles.resultValue}>
                              {typeof v === 'number' ? v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v)}
                            </span>
                          </div>
                        ))}
                    </div>
                    {result.warnings?.length > 0 && (
                      <div className={styles.warnings}>
                        {result.warnings.map((w, i) => <p key={i} className={styles.warning}>{w}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className={styles.historyList}>
          {history.length === 0 ? (
            <p className={styles.emptyText}>Henüz hesaplama geçmişi yok.</p>
          ) : (
            history.map(h => (
              <div key={h.id} className={styles.historyItem}>
                <div className={styles.historyHeader}>
                  <strong>{h.formulaName}</strong>
                  <span className={styles.historyDate}>
                    {new Date(h.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={styles.historyDetail}>
                  Girdi: {Object.entries(h.inputs || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </div>
                <div className={styles.historyDetail}>
                  Sonuç: {Object.entries(h.result || {}).filter(([k]) => k !== 'durum').map(([k, v]) => `${k}: ${v}`).join(', ')}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
