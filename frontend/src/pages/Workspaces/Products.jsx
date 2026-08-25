import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { RefreshCw, Store, PackageSearch, AlertTriangle, Star } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import Modal from '@/components/ui/Modal'
import styles from './Products.module.css'

const PROVIDER_LABELS = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  N11: 'N11',
  SHOPIFY: 'Shopify',
  WOOCOMMERCE: 'WooCommerce'
}

const WINDOW_OPTIONS = [
  { value: '7', label: 'Son 7 gün' },
  { value: '30', label: 'Son 30 gün' },
  { value: '90', label: 'Son 90 gün' }
]

const SORT_OPTIONS = [
  { value: '', label: 'Sıralama: Ada göre' },
  { value: 'bestSelling', label: 'En çok satan' },
  { value: 'topRevenue', label: 'En yüksek ciro' },
  { value: 'mostReturned', label: 'En çok iade' }
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
      setError(err.message || 'Ürünler yüklenemedi.')
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
      toast.error(err.message || 'Ürün detayı alınamadı.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function saveSettings(productId, settings) {
    try {
      const data = await api.marketplace.updateProductSettings(workspaceId, productId, settings)
      // Yerel ayarlar aninda yansir; liste arka planda tazelenir.
      setDetail(prev => prev ? { ...prev, product: { ...prev.product, ...data.product } } : prev)
      toast.success('Ürün ayarları kaydedildi.')
      load()
    } catch (err) {
      toast.error(err.message || 'Ayarlar kaydedilemedi.')
    }
  }

  function money(value) {
    if (value === null || value === undefined) return '—'
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value)
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h2>Ürünler</h2>
          <p className={styles.subtitle}>
            Pazaryeri ürünleriniz ve LocalKarar’ın sipariş verisinden hesapladığı performans.
          </p>
        </div>
        <span className={styles.thresholdNote}>Düşük stok eşiği: ≤ {threshold}</span>
      </header>

      <div className={styles.filterBar} role="search">
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Ürün adı, SKU veya barkod ara…"
          aria-label="Ürün ara"
          value={filters.q}
          onChange={event => setFilters(current => ({ ...current, q: event.target.value }))}
        />
        <select aria-label="Kaynak" value={filters.provider} onChange={event => setFilters(c => ({ ...c, provider: event.target.value }))}>
          <option value="">Tüm kaynaklar</option>
          <option value="TRENDYOL">Trendyol</option>
          <option value="HEPSIBURADA">Hepsiburada</option>
          <option value="N11">N11</option>
          <option value="SHOPIFY">Shopify</option>
        </select>
        <select aria-label="Satış durumu" value={filters.onSale} onChange={event => setFilters(c => ({ ...c, onSale: event.target.value }))}>
          <option value="">Satışta + Satışta değil</option>
          <option value="true">Satışta</option>
          <option value="false">Satışta değil</option>
        </select>
        <select aria-label="Stok filtresi" value={filters.stockFilter} onChange={event => setFilters(c => ({ ...c, stockFilter: event.target.value }))}>
          <option value="">Tüm stoklar</option>
          <option value="low">Düşük stok (≤ {threshold})</option>
          <option value="out">Stok yok</option>
        </select>
        <select aria-label="Performans penceresi" value={windowDays} onChange={event => setWindowDays(event.target.value)}>
          {WINDOW_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select aria-label="Sıralama" value={sort} onChange={event => setSort(event.target.value)}>
          {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button type="button" className={styles.refreshButton} onClick={load} disabled={loading}>
          <RefreshCw size={14} aria-hidden="true" /> Yenile
        </button>
      </div>

      {error && (
        <div className={styles.errorState} role="alert">
          <p>{error}</p>
          <button type="button" onClick={load}>Tekrar dene</button>
        </div>
      )}

      {!error && !loading && rows.length === 0 && (
        <div className={styles.emptyState}>
          <PackageSearch size={28} aria-hidden="true" />
          <h3>Henüz ürün yok</h3>
          <p>Trendyol mağazanızı bağladığınızda ürünler ilk eşitlemeyle burada listelenir.</p>
        </div>
      )}

      {!error && (loading || rows.length > 0) && (
        <div className={styles.tableWrap} role="region" aria-label="Pazaryeri ürünleri" tabIndex={0}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.thumbCol} aria-label="Görsel" />
                <th scope="col">Ürün</th>
                <th scope="col">Kaynak</th>
                <th scope="col">SKU / Barkod</th>
                <th scope="col" className={styles.numeric}>Satış Fiyatı</th>
                <th scope="col" className={styles.numeric}>Liste Fiyatı</th>
                <th scope="col" className={styles.numeric}>Stok</th>
                <th scope="col" className={styles.numeric}>Satış</th>
                <th scope="col" className={styles.numeric}>Sipariş</th>
                <th scope="col" className={styles.numeric}>Brüt Ciro</th>
                <th scope="col" className={styles.numeric}>İade Oranı</th>
                <th scope="col">Durum</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={12} className={styles.loadingCell}>Yükleniyor…</td></tr>}
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
                      {row.isActive ? 'Satışta' : 'Satışta değil'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && total > rows.length && (
        <p className={styles.moreNote}>{total - rows.length} ürün daha mevcut. Arama veya filtre ile daraltın.</p>
      )}

      {/* Detay cekmecesi */}
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Ürün detayı" size="lg">
        {detail && <ProductDetail detail={detail} money={money} onClose={() => setDetail(null)} onSave={saveSettings} />}
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

function ProductDetail({ detail, money, onSave }) {
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
        <h4>Ürün Bilgileri</h4>
        <dl className={styles.infoGrid}>
          <div><dt>Marka</dt><dd>{product.brand || '—'}</dd></div>
          <div><dt>Kategori</dt><dd>{product.category || '—'}</dd></div>
          <div><dt>Barkod</dt><dd>{product.barcode || '—'}</dd></div>
          <div><dt>SKU</dt><dd>{product.sku || '—'}</dd></div>
          <div><dt>Satış fiyatı</dt><dd>{money(product.salePrice)}</dd></div>
          <div><dt>Liste fiyatı</dt><dd>{money(product.listPrice)}</dd></div>
          <div><dt>Stok</dt><dd>{product.stockQuantity === null ? 'Veri yok' : product.stockQuantity}</dd></div>
          <div><dt>Provider durumu</dt><dd>{product.isActive ? 'Satışta' : 'Satışta değil'}</dd></div>
          <div><dt>Son eşitleme</dt><dd>{new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(product.syncedAt))}</dd></div>
        </dl>
      </section>

      <section className={styles.section}>
        <div className={styles.perfHead}>
          <h4>Performans</h4>
          <div className={styles.windowSwitch} role="tablist" aria-label="Performans penceresi">
            {[7, 30, 90].map(day => (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={days === day}
                className={`${styles.windowButton} ${days === day ? styles.windowActive : ''}`}
                onClick={() => setDays(day)}
              >
                {day} gün
              </button>
            ))}
          </div>
        </div>

        {perf ? (
          <dl className={styles.perfGrid}>
            <div><dt>Satılan adet</dt><dd>{perf.unitsSold}</dd></div>
            <div><dt>Sipariş</dt><dd>{perf.orderCount}</dd></div>
            <div><dt>Brüt satış</dt><dd>{money(perf.grossSales)}</dd></div>
            <div><dt>Ortalama satış fiyatı</dt><dd>{perf.averageSellingPrice === null ? '—' : money(perf.averageSellingPrice)}</dd></div>
            <div><dt>İade oranı</dt><dd>{perf.returnRate === null ? '—' : `%${Math.round(perf.returnRate * 100)}`}</dd></div>
            <div><dt>Komisyon</dt><dd>{perf.commissionTotal === null ? 'Veri yok*' : money(perf.commissionTotal)}</dd></div>
            <div><dt>Kargo</dt><dd>{perf.shippingTotal === null ? 'Veri yok*' : money(perf.shippingTotal)}</dd></div>
            <div className={styles.netRow}><dt>Net katkı</dt><dd>{perf.netContribution === null ? 'Hesaplanamaz*' : money(perf.netContribution)}</dd></div>
          </dl>
        ) : (
          <p className={styles.noPerf}>Bu pencere için veri yok.</p>
        )}

        <p className={styles.note}>
          <AlertTriangle size={12} aria-hidden="true" /> * Pazaryeri komisyon/kargo tutarını paylaşmıyor;
          değerler LocalKarar’ın kendi sipariş kayıtlarından hesaplanır, eksik veriler uydurulmaz.
        </p>
      </section>

      {/* LOCALKARAR YEREL AYARLARI — provider'a WRITE YOK; sync bu
          alanlari ezmez. Yalnizca LocalKarar'in kendi verisi güncellenir. */}
      <section className={styles.section}>
        <h4>Yerel Ayarlar</h4>
        <div className={styles.settingsForm}>
          <label className={styles.favoriteToggle}>
            <input type="checkbox" checked={favorite} onChange={event => setFavorite(event.target.checked)} />
            <Star size={13} aria-hidden="true" /> Öne çıkar (favori)
          </label>
          <label>
            <span>İç not</span>
            <textarea
              rows={2}
              value={note}
              placeholder="Bu ürünle ilgili iç notunuz…"
              onChange={event => setNote(event.target.value)}
            />
          </label>
          <label>
            <span>Etiketler (virgülle ayırın)</span>
            <input
              type="text"
              value={tagsText}
              placeholder="örn. kampanya, kontrol"
              onChange={event => setTagsText(event.target.value)}
            />
          </label>
          <label>
            <span>Düşük stok eşiği (boş = genel eşik)</span>
            <input
              type="number"
              min={1}
              max={100000}
              value={thresholdOverride}
              onChange={event => setThresholdOverride(event.target.value)}
            />
          </label>
          <button type="button" className={styles.saveSettings} onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Ayarları kaydet'}
          </button>
        </div>
      </section>
    </div>
  )
}
