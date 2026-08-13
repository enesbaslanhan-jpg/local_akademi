import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Loading, PageHead } from '@/components/ui'
import {
  ArrowRight, BarChart3, Calculator, CircleDollarSign, Gauge,
  Search, ShieldCheck, Sparkles, WalletCards
} from 'lucide-react'
import styles from './FinancialModelLibrary.module.css'

const CATEGORIES = {
  all: 'Tüm modeller',
  liquidity: 'Likidite',
  profitability: 'Kârlılık',
  efficiency: 'Verimlilik',
  unit_economics: 'Birim ekonomi',
  cash_resilience: 'Nakit dayanıklılığı',
  investment: 'Yatırım',
  valuation: 'Değerleme',
}

const ICONS = {
  liquidity: WalletCards,
  profitability: BarChart3,
  efficiency: Gauge,
  unit_economics: Calculator,
  cash_resilience: ShieldCheck,
  investment: CircleDollarSign,
  valuation: Sparkles,
}

const LEVELS = { basic: 'Temel', intermediate: 'Orta', advanced: 'İleri' }

/*
 * `embedded`: Finans Merkezi sayfasının "Model Laboratuvarı" sekmesi içinde
 * render edilirken sayfa kabuğu atlanır. /app/finance/models route'u
 * çalışmaya devam eder ve bu bileşeni tam sayfa gösterir.
 */
export default function FinancialModelLibrary({ embedded = false }) {
  const navigate = useNavigate()
  const { activeWorkspace, activeWorkspaceId } = useWorkspace()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [runs, setRuns] = useState([])

  const fetchModels = () => {
    setLoading(true)
    setError('')
    api.financialModels.list()
      .then(data => setModels(data.models || []))
      .catch(err => setError(err.message || 'Model kütüphanesi yüklenemedi.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchModels()
  }, [])

  useEffect(() => {
    if (!activeWorkspaceId) {
      setRuns([])
      return
    }
    api.financialModels.runs(activeWorkspaceId)
      .then(data => setRuns(Array.isArray(data) ? data : data.runs || []))
      .catch(() => setRuns([]))
  }, [activeWorkspaceId])

  const visibleModels = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR')
    return models.filter(model => {
      const inCategory = category === 'all' || model.category === category
      const inSearch = !query || `${model.name} ${model.purpose} ${model.description}`.toLocaleLowerCase('tr-TR').includes(query)
      return inCategory && inSearch
    })
  }, [category, models, search])

  if (loading) return <Loading text="Finansal model kütüphanesi hazırlanıyor..." />

  return (
    <main className={embedded ? styles.embedded : styles.page}>
      {!embedded && <PageHead title="Model Laboratuvarı" subtitle="Finansal modelleri bulun, karşılaştırın ve çalıştırın." />}
      {embedded && <div className={styles.embeddedHead}><h2>Model Laboratuvarı</h2><p>Finansal modelleri bulun ve çalıştırın.</p></div>}

      <section className={styles.toolbar}>
        <label><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nakit, sipariş, CAC, yatırım veya DCF ara..." /></label>
        <div>
          {Object.entries(CATEGORIES).map(([id, label]) => (
            <button key={id} className={category === id ? styles.active : ''} onClick={() => setCategory(id)}>{label}</button>
          ))}
        </div>
      </section>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchModels} disabled={loading}>Tekrar dene</button>
        </div>
      )}

      {!loading && !error && models.length === 0 && (
        <div className={styles.empty}>Henüz kullanılabilir model bulunmuyor.</div>
      )}

      <div className={styles.libraryLayout}>
        <section className={styles.modelList} aria-label="Finansal modeller">
          {visibleModels.map((model, index) => (
            <button key={model.code} type="button" onClick={() => navigate(`/app/finance/models/${model.code}`)}>
              <span className={styles.modelIndex}>{index + 1}</span>
              <span className={styles.modelName}><strong>{model.name}</strong><small>{CATEGORIES[model.category]} · {model.requirementCount} zorunlu girdi</small></span>
              <span className={styles.modelVersion}>v{model.engineVersion}</span>
              <span className={styles.modelLevel}>{LEVELS[model.level] || model.level}</span>
              <ArrowRight size={15} />
            </button>
          ))}
        </section>

        <aside className={styles.libraryAside}>
          <h2>Son çalışılan</h2>
          {runs[0] ? (
            <div className={styles.lastRun}>
              <span>{CATEGORIES[models.find(model => model.code === runs[0].modelCode)?.category] || 'Finans'}</span>
              <strong>{runs[0].modelName || models.find(model => model.code === runs[0].modelCode)?.name || 'Finansal model'}</strong>
              <small>{new Date(runs[0].createdAt).toLocaleString('tr-TR')}</small>
              <button type="button" onClick={() => navigate(`/app/finance/models/${runs[0].modelCode}`)}>Sürdür</button>
            </div>
          ) : <p className={styles.asideEmpty}>Henüz model çalışması yok.</p>}
          <h2 className={styles.groupTitle}>Model grupları</h2>
          {Object.entries(CATEGORIES).filter(([id]) => id !== 'all').map(([id, label]) => {
            const count = models.filter(model => model.category === id).length
            if (!count) return null
            return <button type="button" className={styles.groupRow} key={id} onClick={() => setCategory(id)}><span>{label}</span><small>{count}</small><ArrowRight size={14} /></button>
          })}
          {activeWorkspace && <p className={styles.workspaceNote}>Çalışmalar <strong>{activeWorkspace.name}</strong> işletmesine kaydedilir.</p>}
        </aside>
      </div>

      {!loading && !error && models.length > 0 && visibleModels.length === 0 && (
        <div className={styles.empty}>Bu arama için model bulunamadı.</div>
      )}
    </main>
  )
}
