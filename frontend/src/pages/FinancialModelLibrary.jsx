import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Loading } from '@/components/ui'
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

export default function FinancialModelLibrary() {
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspace()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')

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
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span>LOCALAKADEMİ FİNANSAL ZEKA</span>
          <h1>Model Laboratuvarı</h1>
          <p>Gerçek işletme verisini doğrulayın, doğru modeli seçin, hesabın her adımını görün ve kararınızı kaydedin.</p>
        </div>
        <div className={styles.heroStats}>
          <strong>{models.length}</strong>
          <small>sürümlü deterministik model</small>
        </div>
      </section>

      <section className={styles.principles}>
        <div><Calculator /><span><strong>Hesap makinesi değil</strong><small>Girdi, varsayım, kontrol ve karar akışı</small></span></div>
        <div><ShieldCheck /><span><strong>Sonuç uydurulmaz</strong><small>Eksik veri varsa model çalışmaz</small></span></div>
        <div><Sparkles /><span><strong>Mentor açıklaması</strong><small>Hesabı değiştirmez, sonucu yorumlar</small></span></div>
      </section>

      {activeWorkspace && (
        <div className={styles.context}>
          Aktif işletme: <strong>{activeWorkspace.name}</strong>
          <span>Çalışmalar ve kararlar bu işletmeye kaydedilecek.</span>
        </div>
      )}

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

      <section className={styles.grid}>
        {visibleModels.map(model => {
          const Icon = ICONS[model.category] || Calculator
          return (
            <article key={model.code} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.icon}><Icon size={21} /></span>
                <span className={styles.level}>{LEVELS[model.level] || model.level}</span>
              </div>
              <span className={styles.category}>{CATEGORIES[model.category]}</span>
              <h2>{model.name}</h2>
              <p>{model.purpose}</p>
              <div className={styles.meta}>
                <span>{model.requirementCount} zorunlu girdi</span>
                <span>v{model.engineVersion}</span>
              </div>
              <button onClick={() => navigate(`/app/finance/models/${model.code}`)}>
                Modeli aç <ArrowRight size={17} />
              </button>
            </article>
          )
        })}
      </section>

      {!loading && !error && models.length > 0 && visibleModels.length === 0 && (
        <div className={styles.empty}>Bu arama için model bulunamadı.</div>
      )}
    </main>
  )
}
