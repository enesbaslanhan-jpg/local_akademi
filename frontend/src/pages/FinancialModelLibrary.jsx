import { useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
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
  all: 'models.categories.all',
  liquidity: 'models.categories.liquidity',
  profitability: 'models.categories.profitability',
  efficiency: 'models.categories.efficiency',
  unit_economics: 'models.categories.unitEconomics',
  cash_resilience: 'models.categories.cashResilience',
  investment: 'models.categories.investment',
  valuation: 'models.categories.valuation',
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

const LEVELS = { basic: 'models.levels.basic', intermediate: 'models.levels.intermediate', advanced: 'models.levels.advanced' }

/*
 * `embedded`: Finans Merkezi sayfasının "Model Laboratuvarı" sekmesi içinde
 * render edilirken sayfa kabuğu atlanır. /app/finance/models route'u
 * çalışmaya devam eder ve bu bileşeni tam sayfa gösterir.
 */
export default function FinancialModelLibrary({ embedded = false }) {
  const { t, i18n } = useTranslation('tools')
  const uiLanguage = i18n.resolvedLanguage || i18n.language
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
      .catch(err => setError(err.message || t('models.errors.libraryLoad')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchModels()
  }, [t, uiLanguage])

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
    const locale = i18n.resolvedLanguage || i18n.language
    const query = search.trim().toLocaleLowerCase(locale)
    return models.filter(model => {
      const inCategory = category === 'all' || model.category === category
      const inSearch = !query || `${model.name} ${model.purpose} ${model.description}`.toLocaleLowerCase(locale).includes(query)
      return inCategory && inSearch
    })
  }, [category, models, search, i18n.language, i18n.resolvedLanguage])

  if (loading) return <Loading text={t('models.libraryLoading')} />

  return (
    <main className={embedded ? styles.embedded : styles.page}>
      {!embedded && <PageHead title={t('models.labTitle')} subtitle={t('models.labSubtitle')} />}
      {embedded && <div className={styles.embeddedHead}><h2>{t('models.labTitle')}</h2><p>{t('models.embeddedSubtitle')}</p></div>}

      <section className={styles.toolbar}>
        <label><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t('models.searchPlaceholder')} /></label>
        <div>
          {Object.entries(CATEGORIES).map(([id, label]) => (
            <button key={id} className={category === id ? styles.active : ''} onClick={() => setCategory(id)}>{t(label)}</button>
          ))}
        </div>
      </section>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchModels} disabled={loading}>{t('models.retry')}</button>
        </div>
      )}

      {!loading && !error && models.length === 0 && (
        <div className={styles.empty}>{t('models.emptyLibrary')}</div>
      )}

      <div className={styles.libraryLayout}>
        <section className={styles.modelList} aria-label={t('models.listAria')}>
          {visibleModels.map((model, index) => (
            <button key={model.code} type="button" onClick={() => navigate(`/app/finance/models/${model.code}`)}>
              <span className={styles.modelIndex}>{index + 1}</span>
              <span className={styles.modelName}><strong>{model.name}</strong><small>{CATEGORIES[model.category] ? t(CATEGORIES[model.category]) : model.category} · {t('models.requirementCountShort', { count: model.requirementCount })}</small></span>
              <span className={styles.modelVersion}>v{model.engineVersion}</span>
              <span className={styles.modelLevel}>{LEVELS[model.level] ? t(LEVELS[model.level]) : model.level}</span>
              <ArrowRight size={15} />
            </button>
          ))}
        </section>

        <aside className={styles.libraryAside}>
          <h2>{t('models.recentWork')}</h2>
          {runs[0] ? (
            <div className={styles.lastRun}>
              <span>{CATEGORIES[models.find(model => model.code === runs[0].modelCode)?.category] ? t(CATEGORIES[models.find(model => model.code === runs[0].modelCode).category]) : t('models.financeFallback')}</span>
              <strong>{runs[0].modelName || models.find(model => model.code === runs[0].modelCode)?.name || t('models.modelFallback')}</strong>
              <small>{new Date(runs[0].createdAt).toLocaleString(i18n.resolvedLanguage || i18n.language)}</small>
              <button type="button" onClick={() => navigate(`/app/finance/models/${runs[0].modelCode}`)}>{t('models.resume')}</button>
            </div>
          ) : <p className={styles.asideEmpty}>{t('models.noRunsAside')}</p>}
          <h2 className={styles.groupTitle}>{t('models.modelGroups')}</h2>
          {Object.entries(CATEGORIES).filter(([id]) => id !== 'all').map(([id, label]) => {
            const count = models.filter(model => model.category === id).length
            if (!count) return null
            return <button type="button" className={styles.groupRow} key={id} onClick={() => setCategory(id)}><span>{t(label)}</span><small>{count}</small><ArrowRight size={14} /></button>
          })}
          {activeWorkspace && <p className={styles.workspaceNote}><Trans ns="tools" i18nKey="models.workspaceSavedNote" values={{ business: activeWorkspace.name }} components={[<strong key="business" />]} /></p>}
        </aside>
      </div>

      {!loading && !error && models.length > 0 && visibleModels.length === 0 && (
        <div className={styles.empty}>{t('models.searchEmpty')}</div>
      )}
    </main>
  )
}
