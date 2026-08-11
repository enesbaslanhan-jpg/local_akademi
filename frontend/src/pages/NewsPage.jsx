import { useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, Clock3, ExternalLink, Newspaper } from 'lucide-react'
import { api } from '@/services/api'
import styles from './NewsPage.module.css'

const CATEGORIES = [
  ['', 'Tümü'],
  ['FINANS', 'Finans'],
  ['MEVZUAT', 'Mevzuat'],
  ['VERGI', 'Vergi'],
  ['IS_DUNYASI', 'İş dünyası'],
  ['DIJITALLESME', 'Dijitalleşme'],
  ['DESTEK', 'Destekler'],
  ['GENEL_EKONOMI', 'Genel ekonomi'],
]

const IMPORTANCE = {
  LOW: 'Bilgi',
  MEDIUM: 'Önemli',
  HIGH: 'Yüksek önem',
  CRITICAL: 'Kritik',
}

function formatDate(value) {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(value))
}

export default function NewsPage() {
  const [category, setCategory] = useState('')
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api.news.list({ category: category || undefined })
      .then(result => {
        if (!active) return
        setItems(result.items)
        setCursor(result.nextCursor)
      })
      .catch(() => active && setError('Haberler şu anda alınamıyor. Lütfen biraz sonra yeniden deneyin.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [category])

  async function loadMore() {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    setError('')
    try {
      const result = await api.news.list({ category: category || undefined, cursor })
      setItems(current => [...current, ...result.items])
      setCursor(result.nextCursor)
    } catch {
      setError('Yeni haberler yüklenemedi. Tekrar deneyebilirsiniz.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroIcon}><Newspaper size={25} /></div>
        <div>
          <span>Resmî kaynaklardan otomatik akış</span>
          <h1>İşletmeniz için önemli gelişmeler</h1>
          <p>Güvenilir kurum duyuruları yapay zekâ ile özetlenir; işletmenize etkisi açıkça anlatılır.</p>
        </div>
      </header>

      <nav className={styles.filters} aria-label="Haber kategorileri">
        {CATEGORIES.map(([value, label]) => (
          <button key={value} type="button" className={category === value ? styles.activeFilter : ''} onClick={() => setCategory(value)}>
            {label}
          </button>
        ))}
      </nav>

      {error && <div className={styles.error} role="alert"><AlertCircle size={18} />{error}</div>}
      {loading ? <NewsSkeleton /> : items.length === 0 ? (
        <div className={styles.empty}><Newspaper size={34} /><h2>Bu kategoride haber yok</h2><p>Yeni resmî gelişmeler saat başı kontrol ediliyor.</p></div>
      ) : (
        <section className={styles.grid} aria-label="Haber listesi">
          {items.map(item => <NewsCard key={item.id} item={item} />)}
        </section>
      )}

      {cursor && !loading && (
        <button className={styles.loadMore} type="button" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Yükleniyor…' : 'Daha fazla haber'} <ArrowRight size={17} />
        </button>
      )}
    </main>
  )
}

function NewsCard({ item }) {
  const [imageMissing, setImageMissing] = useState(false)
  return (
    <article className={styles.card} data-image-id={item.imageId || undefined}>
      <div className={`${styles.visual} ${styles[item.imageId] || ''}`}>
        {item.imagePath && !imageMissing
          ? <img src={item.imagePath} alt="" onError={() => setImageMissing(true)} />
          : <Newspaper size={30} aria-hidden="true" />}
        <span>{CATEGORIES.find(([value]) => value === item.category)?.[1] || item.category}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <strong>{item.sourceName}</strong>
          <span><Clock3 size={13} />{formatDate(item.sourcePublishedAt)}</span>
        </div>
        <h2>{item.title}</h2>
        <p>{item.summary}</p>
        <aside><b>İşletmeniz için anlamı</b><p>{item.whyItMatters}</p></aside>
        <div className={styles.tags}>
          <span className={`${styles.importance} ${styles[item.importance?.toLowerCase()]}`}>{IMPORTANCE[item.importance] || item.importance}</span>
          {item.tags.map(tag => <span key={tag}>#{tag}</span>)}
        </div>
        <a href={item.canonicalUrl} target="_blank" rel="noreferrer">Resmî kaynağı aç <ExternalLink size={15} /></a>
      </div>
    </article>
  )
}

function NewsSkeleton() {
  return <div className={styles.skeleton} aria-label="Haberler yükleniyor"><span /><span /><span /></div>
}
