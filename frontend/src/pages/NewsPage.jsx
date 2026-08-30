import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle, ArrowRight, Clock3, ExternalLink, Newspaper,
  Banknote, Scale, ReceiptText, Building2, MonitorSmartphone, HandCoins, LineChart
} from 'lucide-react'
import { api } from '@/services/api'
import styles from './NewsPage.module.css'

const CATEGORIES = [
  ['', 'news.categories.all'],
  ['FINANS', 'news.categories.finance'],
  ['MEVZUAT', 'news.categories.legal'],
  ['VERGI', 'news.categories.tax'],
  ['IS_DUNYASI', 'news.categories.business'],
  ['DIJITALLESME', 'news.categories.digital'],
  ['DESTEK', 'news.categories.support'],
  ['GENEL_EKONOMI', 'news.categories.economy'],
]

/*
 * Haber görseli YOK — bilerek.
 *
 * Arka uçta 10 görselli, kategori ve etiket puanlamasıyla çalışan bir seçim
 * sistemi duruyordu (`src/config/news-images.ts`) ama **görsel dosyaları hiç
 * üretilmemişti**. `/assets/news/placeholders/*.webp` istekleri SPA yedeğine
 * düşüp `index.html` döndürüyordu; tarayıcı bunu çizemeyince `onError` ile
 * gizleniyor, geriye renkli boş bir blok kalıyordu.
 *
 * Sahte stok görseli koymak yerine kategoriye ait bir ikon çiziliyor:
 * hiçbir ağ isteği yok, kırılacak bir şey yok, ve boşluk kaza değil karar
 * gibi duruyor. Renk çeşitliliği `imageId`'den gelmeye devam ediyor —
 * arka uçtaki seçim mantığı hâlâ işe yarıyor, yalnız artık bir dosyaya
 * değil bir renge karşılık geliyor.
 *
 * Gerçek illüstrasyon istenirse ayrı bir görsel tasarım işi.
 */
const KATEGORI_IKON = {
  FINANS: Banknote,
  MEVZUAT: Scale,
  VERGI: ReceiptText,
  IS_DUNYASI: Building2,
  DIJITALLESME: MonitorSmartphone,
  DESTEK: HandCoins,
  GENEL_EKONOMI: LineChart,
}

function KategoriIkonu({ category, size }) {
  const Icon = KATEGORI_IKON[category] || Newspaper
  return <Icon size={size} aria-hidden="true" />
}

const IMPORTANCE = {
  LOW: 'news.importance.low', MEDIUM: 'news.importance.medium', HIGH: 'news.importance.high', CRITICAL: 'news.importance.critical',
}

function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(value))
}

export default function NewsPage() {
  const { t, i18n } = useTranslation('community')
  const formatLocale = i18n.resolvedLanguage || i18n.language
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
      .catch(() => active && setError(t('news.loadError')))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [category, t])

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
      setError(t('news.moreLoadError'))
    } finally {
      setLoadingMore(false)
    }
  }

  const featured = items[0]
  const secondaryItems = items.slice(1, visibleCount)

  return (
    <main className={styles.page}>
      <header className={styles.pageHead}>
        <h1>{t('news.pageTitle')}</h1>
        <p>{t('news.pageSubtitle')}</p>
      </header>

      {error && <div className={styles.error} role="alert"><AlertCircle size={18} />{error}</div>}
      {loading ? <NewsSkeleton /> : items.length === 0 ? (
        <div className={styles.empty}><Newspaper size={34} /><h2>{t('news.emptyCategoryTitle')}</h2><p>{t('news.emptyCategoryBody')}</p></div>
      ) : (
        <div className={styles.newsLayout}>
          <section className={styles.newsMain} aria-label={t('news.listAria')}>
            <a className={`${styles.featured} ${styles[featured.imageId] || ''}`} href={featured.canonicalUrl} target="_blank" rel="noreferrer">
              <div className={styles.featuredShade} />
              <div className={styles.featuredCopy}>
                <span>{IMPORTANCE[featured.importance] ? t(IMPORTANCE[featured.importance]) : featured.importance}</span>
                <h2>{featured.title}</h2>
                <p><span>{featured.sourceName}</span> · {formatDate(featured.sourcePublishedAt, formatLocale)}</p>
              </div>
            </a>
            <div className={styles.newsList}>
              {secondaryItems.map(item => (
                <a key={item.id} href={item.canonicalUrl} target="_blank" rel="noreferrer">
                  <div className={`${styles.thumb} ${styles[item.imageId] || ''}`}><KategoriIkonu category={item.category} size={22} /></div>
                  <div><strong>{item.title}</strong><small>{CATEGORIES.find(([value]) => value === item.category)?.[1] ? t(CATEGORIES.find(([value]) => value === item.category)[1]) : item.category} · {formatDate(item.sourcePublishedAt, formatLocale)}</small><p>{item.whyItMatters || item.summary}</p></div>
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </section>
          <aside className={styles.newsAside}>
            <h2>{t('news.topics')}</h2>
            <nav className={styles.filters} aria-label={t('news.filtersAria')}>
              {CATEGORIES.map(([value, labelKey]) => <button key={value} type="button" className={category === value ? styles.activeFilter : ''} onClick={() => setCategory(value)}>{t(labelKey)}</button>)}
            </nav>
            <div className={styles.whyPanel}>
              <h2>{t('news.whyTitle')}</h2>
              <span className={styles.srOnly}>{t('news.whySr')}</span>
              <p>{featured.whyItMatters || featured.summary}</p>
              {featured.tags?.length > 0 && <div className={styles.featureTags}>{featured.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}
              <a href={featured.canonicalUrl} target="_blank" rel="noreferrer">{t('news.openSource')} <ExternalLink size={14} /></a>
            </div>
          </aside>
        </div>
      )}

      {(cursor || visibleCount < items.length) && !loading && (
        <button className={styles.loadMore} type="button" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? t('news.loadingMore') : t('news.loadMore')} <ArrowRight size={17} />
        </button>
      )}
    </main>
  )
}

function NewsCard({ item }) {
  const { t, i18n } = useTranslation('community')
  return (
    <article className={styles.card} data-image-id={item.imageId || undefined}>
      <div className={`${styles.visual} ${styles[item.imageId] || ''}`}>
        <KategoriIkonu category={item.category} size={30} />
        <span>{CATEGORIES.find(([value]) => value === item.category)?.[1] ? t(CATEGORIES.find(([value]) => value === item.category)[1]) : item.category}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <strong>{item.sourceName}</strong>
          <span><Clock3 size={13} />{formatDate(item.sourcePublishedAt, i18n.resolvedLanguage || i18n.language)}</span>
        </div>
        <h2>{item.title}</h2>
        <p>{item.summary}</p>
        <aside><b>{t('news.whyCard')}</b><p>{item.whyItMatters}</p></aside>
        <div className={styles.tags}>
          <span className={`${styles.importance} ${styles[item.importance?.toLowerCase()]}`}>{IMPORTANCE[item.importance] ? t(IMPORTANCE[item.importance]) : item.importance}</span>
          {item.tags.map(tag => <span key={tag}>#{tag}</span>)}
        </div>
        <a href={item.canonicalUrl} target="_blank" rel="noreferrer">{t('news.openSource')} <ExternalLink size={15} /></a>
      </div>
    </article>
  )
}

function NewsSkeleton() {
  const { t } = useTranslation('community')
  return <div className={styles.skeleton} aria-label={t('news.skeletonAria')}><span /><span /><span /></div>
}
