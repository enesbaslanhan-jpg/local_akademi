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
  const [visibleCount, setVisibleCount] = useState(4)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setVisibleCount(4)
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
    if (visibleCount < items.length) {
      setVisibleCount(current => Math.min(current + 6, items.length))
      return
    }
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    setError('')
    try {
      const result = await api.news.list({ category: category || undefined, cursor })
      setItems(current => [...current, ...result.items])
      setVisibleCount(current => current + result.items.length)
      setCursor(result.nextCursor)
    } catch {
      setError('Yeni haberler yüklenemedi. Tekrar deneyebilirsiniz.')
    } finally {
      setLoadingMore(false)
    }
  }

  const featured = items[0]
  const secondaryItems = items.slice(1, visibleCount)

  return (
    <main className={styles.page}>
      <header className={styles.pageHead}>
        <h1>Haberler</h1>
        <p>Resmî kaynaklardan işletmenizi etkileyen gelişmeler.</p>
      </header>

      {error && <div className={styles.error} role="alert"><AlertCircle size={18} />{error}</div>}
      {loading ? <NewsSkeleton /> : items.length === 0 ? (
        <div className={styles.empty}><Newspaper size={34} /><h2>Bu kategoride haber yok</h2><p>Yeni resmî gelişmeler saat başı kontrol ediliyor.</p></div>
      ) : (
        <div className={styles.newsLayout}>
          <section className={styles.newsMain} aria-label="Haber listesi">
            <a className={`${styles.featured} ${styles[featured.imageId] || ''}`} href={featured.canonicalUrl} target="_blank" rel="noreferrer">
              {featured.imagePath && <img src={featured.imagePath} alt="" onError={event => { event.currentTarget.style.display = 'none' }} />}
              <div className={styles.featuredShade} />
              <div className={styles.featuredCopy}>
                <span>{IMPORTANCE[featured.importance] || featured.importance}</span>
                <h2>{featured.title}</h2>
                <p><span>{featured.sourceName}</span> · {formatDate(featured.sourcePublishedAt)}</p>
              </div>
            </a>
            <div className={styles.newsList}>
              {secondaryItems.map(item => (
                <a key={item.id} href={item.canonicalUrl} target="_blank" rel="noreferrer">
                  <div className={`${styles.thumb} ${styles[item.imageId] || ''}`}>{item.imagePath ? <img src={item.imagePath} alt="" onError={event => { event.currentTarget.style.display = 'none' }} /> : <Newspaper size={22} />}</div>
                  <div><strong>{item.title}</strong><small>{CATEGORIES.find(([value]) => value === item.category)?.[1] || item.category} · {formatDate(item.sourcePublishedAt)}</small><p>{item.whyItMatters || item.summary}</p></div>
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </section>
          <aside className={styles.newsAside}>
            <h2>Konular</h2>
            <nav className={styles.filters} aria-label="Haber kategorileri">
              {CATEGORIES.map(([value, label]) => <button key={value} type="button" className={category === value ? styles.activeFilter : ''} onClick={() => setCategory(value)}>{label}</button>)}
            </nav>
            <div className={styles.whyPanel}>
              <h2>Neden önemli?</h2>
              <span className={styles.srOnly}>İşletmeniz için anlamı</span>
              <p>{featured.whyItMatters || featured.summary}</p>
              {featured.tags?.length > 0 && <div className={styles.featureTags}>{featured.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}
              <a href={featured.canonicalUrl} target="_blank" rel="noreferrer">Resmî kaynağı aç <ExternalLink size={14} /></a>
            </div>
          </aside>
        </div>
      )}

      {(cursor || visibleCount < items.length) && !loading && (
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
