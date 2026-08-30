import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { RefreshCw, Store, PackageSearch, AlertTriangle, Star } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import Modal from '@/components/ui/Modal'
import styles from './Products.module.css'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'
import { formatCurrency, formatDate } from '@/utils/formatters'

const PROVIDER_LABELS = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  N11: 'N11',
  SHOPIFY: 'Shopify',
  AMAZON: 'Amazon',
  WOOCOMMERCE: 'WooCommerce'
}

const WINDOW_OPTIONS = [
  { value: '7', key: 'last7Days' },
  { value: '30', key: 'last30Days' },
  { value: '90', key: 'last90Days' }
]

const SORT_OPTIONS = [
  { value: '', key: 'name' },
  { value: 'bestSelling', key: 'bestSelling' },
  { value: 'topRevenue', key: 'topRevenue' },
  { value: 'mostReturned', key: 'mostReturned' }
]

/*
 * ISLETME TAKIBI > URUNLER.
 *
 * MarketplaceProduct gercek kaynak kayit olarak izlenir; performans
 * kolonlari LocalKarar'in siparis aggregate'inden gelir. Provider
 * analytics'i (goruntuleme/favori) resmi API'de olmadigi icin bu
 * ekranda HIC GOSTERILMEZ ve hicbir zaman 0 yazilmaz.
 */
export default function Products() {
  const { t } = useTranslation(['workspace', 'common'])
  const { formatLocale } = useLocalization()
  const { workspaceId } = useParams()
  const toast = useToast()
  // Deep-link: Overview/Dashboard aksiyonlari ?stockFilter=low|out ve
  // ?q= ile gelir; yalnizca baglantiya gelen degerler baslangicta okunur.
  const [searchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [threshold, setThreshold] = useState(10)
  const [windowDays, setWindowDays] = useState('30')
  const [filters, setFilters] = useState(() => ({
    q: searchParams.get('q') || '',
    provider: '',
    onSale: '',
    stockFilter: ['low', 'out'].includes(searchParams.get('stockFilter')) ? searchParams.get('stockFilter') : ''
  }))
  const [sort, setSort] = useState(searchParams.get('sort') === 'mostReturned' ? 'mostReturned' : '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.marketplace.products(workspaceId, {
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        sort: sort || undefined,
        windowDays
      })
      setRows(data.products || [])
      setTotal(data.total || 0)
      setThreshold(data.threshold || 10)
    } catch (err) {
      setError(err.message || t('productsLoadError'))
    } finally {
      setLoading(false)
    }
  }, [workspaceId, filters, sort, windowDays])

  useEffect(() => { load() }, [load])

  async function openDetail(productId) {
    setDetailLoading(true)
    try {
      const data = await api.marketplace.product(workspaceId, productId)
      setDetail(data || null)
    } catch (err) {
      toast.error(err.message || t('products.detailError'))
    } finally {
      setDetailLoading(false)
    }
  }

  async function saveSettings(productId, settings) {
    try {
      const data = await api.marketplace.updateProductSettings(workspaceId, productId, settings)
      // Yerel ayarlar aninda yansir; liste arka planda tazelenir.
      setDetail(prev => prev ? { ...prev, product: { ...prev.product, ...data.product } } : prev)
      toast.success(t('products.settingsSaved'))
      load()
    } catch (err) {
      toast.error(err.message || t('products.settingsSaveFailed'))
    }
  }

  function money(value) {
    if (value === null || value === undefined) return '—'
    return formatCurrency(value, { locale: formatLocale, currency: 'TRY' })
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h2>{t('nav.products')}</h2>
          <p className={styles.subtitle}>
            {t('products.subtitle')}
          </p>
        </div>
        <span className={styles.thresholdNote}>{t('products.lowStockThreshold', { threshold })}</span>
      </header>

      <div className={styles.filterBar} role="search">
        <input
          type="search"
          className={styles.searchInput}
          placeholder={t('products.searchPlaceholder')}
          aria-label={t('searchProducts')}
          value={filters.q}
          onChange={event => setFilters(current => ({ ...current, q: event.target.value }))}
        />
        <select aria-label={t('provider')} value={filters.provider} onChange={event => setFilters(c => ({ ...c, provider: event.target.value }))}>
          <option value="">{t('allSources')}</option>
          <option value="TRENDYOL">Trendyol</option>
          <option value="HEPSIBURADA">Hepsiburada</option>
          <option value="N11">N11</option>
          <option value="SHOPIFY">Shopify</option>
        </select>
        <select aria-label={t('products.saleStatus')} value={filters.onSale} onChange={event => setFilters(c => ({ ...c, onSale: event.target.value }))}>
          <option value="">{t('products.saleAll')}</option>
          <option value="true">{t('products.onSale')}</option>
          <option value="false">{t('products.notOnSale')}</option>
        </select>
        <select aria-label={t('products.stockFilter')} value={filters.stockFilter} onChange={event => setFilters(c => ({ ...c, stockFilter: event.target.value }))}>
          <option value="">{t('products.allStock')}</option>
          <option value="low">{t('products.lowStockFilter', { threshold })}</option>
          <option value="out">{t('products.noStock')}</option>
        </select>
        <select aria-label={t('products.performanceWindow')} value={windowDays} onChange={event => setWindowDays(event.target.value)}>
          {WINDOW_OPTIONS.map(option => <option key={option.value} value={option.value}>{t(`products.${option.key}`)}</option>)}
        </select>
        <select aria-label={t('products.sortLabel')} value={sort} onChange={event => setSort(event.target.value)}>
          {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{t(`products.sort.${option.key}`)}</option>)}
        </select>
        <button type="button" className={styles.refreshButton} onClick={load} disabled={loading}>
          <RefreshCw size={14} aria-hidden="true" /> {t('common:buttons.refresh')}
        </button>
      </div>

      {error && (
        <div className={styles.errorState} role="alert">
          <p>{error}</p>
          <button type="button" onClick={load}>{t('common:buttons.retry')}</button>
        </div>
      )}

      {!error && !loading && rows.length === 0 && (
        <div className={styles.emptyState}>
          <PackageSearch size={28} aria-hidden="true" />
          <h3>{t('productsEmpty')}</h3>
          <p>{t('products.emptyHint')}</p>
        </div>
      )}

      {!error && (loading || rows.length > 0) && (
        <div className={styles.tableWrap} role="region" aria-label={t('marketplaceProducts')} tabIndex={0}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.thumbCol} aria-label={t('products.col.image')} />
                <th scope="col">{t('products.col.product')}</th>
                <th scope="col">{t('products.col.source')}</th>
                <th scope="col">{t('products.col.sku')}</th>
                <th scope="col" className={styles.numeric}>{t('products.col.salePrice')}</th>
                <th scope="col" className={styles.numeric}>{t('products.col.listPrice')}</th>
                <th scope="col" className={styles.numeric}>{t('products.col.stock')}</th>
                <th scope="col" className={styles.numeric}>{t('products.col.sales')}</th>
                <th scope="col" className={styles.numeric}>{t('products.col.orders')}</th>
                <th scope="col" className={styles.numeric}>{t('products.col.grossRevenue')}</th>
                <th scope="col" className={styles.numeric}>{t('products.col.returnRate')}</th>
                <th scope="col">{t('products.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={12} className={styles.loadingCell}>{t('common:states.loading')}</td></tr>}
              {!loading && rows.map(row => (
                <tr key={row.id} onClick={() => openDetail(row.id)} tabIndex={0}
                  onKeyDown={event => { if (event.key === 'Enter') openDetail(row.id) }}>
                  <td className={styles.thumbCell}>
                    <ProductThumb product={row} size="sm" />
                  </td>
                  <td className={styles.titleCell} title={row.title}>{row.title}</td>
                  <td>
                    <span className={`${styles.sourceBadge} ${styles[`source_${row.provider}`] || ''}`}>
                      <Store size={11} aria-hidden="true" /> {PROVIDER_LABELS[row.provider] || row.provider}
                    </span>
                  </td>
                  <td className={styles.skuCell}>{row.sku || row.barcode || '—'}</td>
                  <td className={styles.numeric}>{money(row.salePrice)}</td>
                  <td className={styles.numeric}>{money(row.listPrice)}</td>
                  <td className={`${styles.numeric} ${row.lowStock ? styles.lowStock : ''}`}>
                    {row.stockQuantity === null ? '—' : row.stockQuantity}
                  </td>
                  <td className={styles.numeric}>{row.performance.unitsSold}</td>
                  <td className={styles.numeric}>{row.performance.orderCount}</td>
                  <td className={styles.numeric}>{money(row.performance.grossSales)}</td>
                  <td className={styles.numeric}>
                    {row.performance.returnRate === null
                      ? '—'
                      : `%${Math.round(row.performance.returnRate * 100)}`}
                  </td>
                  <td>
                    <span className={`${styles.statusChip} ${row.isActive ? styles.active : styles.passive}`}>
                      {row.isActive ? t('products.onSale') : t('products.notOnSale')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && total > rows.length && (
        <p className={styles.moreNote}>{t('products.moreAvailable', { count: total - rows.length })}</p>
      )}

      {/* Detay cekmecesi */}
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={t('productDetail')} size="lg">
        {detail && <ProductDetail detail={detail} money={money} formatLocale={formatLocale} onClose={() => setDetail(null)} onSave={saveSettings} />}
      </Modal>
    </div>
  )
}

/* Urun gorseli — yalnizca provider'in GERCEK https gorseli; yuklenemezse
   notr placeholder'a duser. Sahte resim URETILMEZ. */
function ProductThumb({ product, size = 'sm' }) {
  const [failed, setFailed] = useState(false)
  const showImage = product.imageUrl && !failed
  return (
    <span className={`${styles.thumb} ${styles[`thumb_${size}`]}`} aria-hidden="true">
      {showImage ? (
        <img src={product.imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <PackageSearch size={size === 'lg' ? 26 : 14} className={styles.thumbPlaceholderIcon} />
      )}
    </span>
  )
}

function ProductDetail({ detail, money, formatLocale, onSave }) {
  const { t } = useTranslation('workspace')
  const [days, setDays] = useState(30)
  const perf = detail.performance?.[days]
  const product = detail.product
  const [note, setNote] = useState(product.internalNote || '')
  const [tagsText, setTagsText] = useState((product.tags || []).join(', '))
  const [thresholdOverride, setThresholdOverride] = useState(product.lowStockThresholdOverride ?? '')
  const [favorite, setFavorite] = useState(Boolean(product.isFavorite))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(product.id, {
        internalNote: note.trim() ? note.trim() : null,
        tags: tagsText.split(',').map(tag => tag.trim()).filter(Boolean),
        lowStockThresholdOverride: thresholdOverride === '' ? null : Number(thresholdOverride),
        isFavorite: favorite
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.detail}>
      <header className={styles.detailHead}>
        <ProductThumb product={product} size="lg" />
        <strong className={styles.detailTitle}>{product.title}</strong>
        <span className={`${styles.sourceBadge} ${styles[`source_${product.provider}`] || ''}`}>
          <Store size={11} aria-hidden="true" /> {PROVIDER_LABELS[product.provider] || product.provider}
        </span>
      </header>

      <section className={styles.section}>
        <h4>{t('productInfo')}</h4>
        <dl className={styles.infoGrid}>
          <div><dt>{t('products.info.brand')}</dt><dd>{product.brand || '—'}</dd></div>
          <div><dt>{t('products.info.category')}</dt><dd>{product.category || '—'}</dd></div>
          <div><dt>{t('products.info.barcode')}</dt><dd>{product.barcode || '—'}</dd></div>
          <div><dt>{t('products.info.sku')}</dt><dd>{product.sku || '—'}</dd></div>
          <div><dt>{t('products.info.salePrice')}</dt><dd>{money(product.salePrice)}</dd></div>
          <div><dt>{t('products.info.listPrice')}</dt><dd>{money(product.listPrice)}</dd></div>
          <div><dt>{t('products.info.stock')}</dt><dd>{product.stockQuantity === null ? t('products.info.noData') : product.stockQuantity}</dd></div>
          <div><dt>{t('products.info.providerStatus')}</dt><dd>{product.isActive ? t('products.onSale') : t('products.notOnSale')}</dd></div>
          <div><dt>{t('lastSync')}</dt><dd>{formatDate(product.syncedAt, { locale: formatLocale, dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
        </dl>
      </section>

      <section className={styles.section}>
        <div className={styles.perfHead}>
          <h4>{t('performance')}</h4>
          <div className={styles.windowSwitch} role="tablist" aria-label={t('products.performanceWindow')}>
            {[7, 30, 90].map(day => (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={days === day}
                className={`${styles.windowButton} ${days === day ? styles.windowActive : ''}`}
                onClick={() => setDays(day)}
              >
                {t('products.days', { count: day })}
              </button>
            ))}
          </div>
        </div>

        {perf ? (
          <dl className={styles.perfGrid}>
            <div><dt>{t('products.perf.unitsSold')}</dt><dd>{perf.unitsSold}</dd></div>
            <div><dt>{t('products.perf.orders')}</dt><dd>{perf.orderCount}</dd></div>
            <div><dt>{t('products.perf.grossSales')}</dt><dd>{money(perf.grossSales)}</dd></div>
            <div><dt>{t('products.perf.avgPrice')}</dt><dd>{perf.averageSellingPrice === null ? '—' : money(perf.averageSellingPrice)}</dd></div>
            <div><dt>{t('products.perf.returnRate')}</dt><dd>{perf.returnRate === null ? '—' : `%${Math.round(perf.returnRate * 100)}`}</dd></div>
            <div><dt>{t('products.perf.commission')}</dt><dd>{perf.commissionTotal === null ? t('products.perf.noData') : money(perf.commissionTotal)}</dd></div>
            <div><dt>{t('products.perf.shipping')}</dt><dd>{perf.shippingTotal === null ? t('products.perf.noData') : money(perf.shippingTotal)}</dd></div>
            <div className={styles.netRow}><dt>{t('products.perf.netContribution')}</dt><dd>{perf.netContribution === null ? t('products.perf.notCalculable') : money(perf.netContribution)}</dd></div>
          </dl>
        ) : (
          <p className={styles.noPerf}>{t('products.noWindowData')}</p>
        )}

        <p className={styles.note}>
          <AlertTriangle size={12} aria-hidden="true" /> * {t('products.commissionNote')}
        </p>
      </section>

      {/* LOCALKARAR YEREL AYARLARI — provider'a WRITE YOK; sync bu
          alanlari ezmez. Yalnizca LocalKarar'in kendi verisi güncellenir. */}
      <section className={styles.section}>
        <h4>{t('products.localSettings')}</h4>
        <div className={styles.settingsForm}>
          <label className={styles.favoriteToggle}>
            <input type="checkbox" checked={favorite} onChange={event => setFavorite(event.target.checked)} />
            <Star size={13} aria-hidden="true" /> {t('products.favorite')}
          </label>
          <label>
            <span>{t('products.internalNote')}</span>
            <textarea
              rows={2}
              value={note}
              placeholder={t('products.notePlaceholder')}
              onChange={event => setNote(event.target.value)}
            />
          </label>
          <label>
            <span>{t('products.tags')}</span>
            <input
              type="text"
              value={tagsText}
              placeholder={t('products.tagsPlaceholder')}
              onChange={event => setTagsText(event.target.value)}
            />
          </label>
          <label>
            <span>{t('products.thresholdOverride')}</span>
            <input
              type="number"
              min={1}
              max={100000}
              value={thresholdOverride}
              onChange={event => setThresholdOverride(event.target.value)}
            />
          </label>
          <button type="button" className={styles.saveSettings} onClick={handleSave} disabled={saving}>
            {saving ? t('products.saving') : t('products.saveSettings')}
          </button>
        </div>
      </section>
    </div>
  )
}
