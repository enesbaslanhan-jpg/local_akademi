import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { RefreshCw, Store, X, Clock, PackageSearch } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import Modal from '@/components/ui/Modal'
import styles from './Orders.module.css'

const STATUS_LABELS = {
  CREATED: 'Oluşturuldu',
  PROCESSING: 'Hazırlanıyor',
  SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim edildi',
  CANCELLED: 'İptal',
  RETURNED: 'İade',
  PARTIALLY_RETURNED: 'Kısmi iade',
  UNKNOWN: 'Bilinmiyor'
}

const PROVIDER_LABELS = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  N11: 'N11',
  SHOPIFY: 'Shopify',
  WOOCOMMERCE: 'WooCommerce'
}

/* Deep-link filtre etiketleri (Overview/Dashboard action'lari buraya
   ?status=CREATED,PROCESSING gibi sorgularla gonderir). */
const STATUS_FILTER_LABELS = {
  CREATED: 'Oluşturuldu',
  PROCESSING: 'Hazırlanıyor',
  'CREATED,PROCESSING': 'Kargoya bekleyen',
  'RETURNED,PARTIALLY_RETURNED': 'İade sürecinde'
}

function money(value, currency = 'TRY') {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value))
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

/*
 * İSLETME TAKIBI > SIPARISLER.
 *
 * Bu ekran yalnizca LocalKarar veritabanindaki normalize edilmis
 * pazaryeri kayitlarini okur — sayfa acilisi pazaryerine istek
 * GONDERMEZ. Dis cagri yalnizca "Simdi esitle" ile arka planda
 * tetiklenir.
 */
export default function Orders() {
  const { workspaceId } = useParams()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [connected, setConnected] = useState(false)
  const [detailId, setDetailId] = useState(null)
  // Provider filtresi: Trendyol + Hepsiburada ayni tabloda normalize
  // kolonlarla listelenir; filtre sunucuya iletilir.
  const [providerFilter, setProviderFilter] = useState('')
  // Deep-link durum filtresi: ?status=CREATED,PROCESSING gibi. Yalnizca
  // baglantiya gelen sorgu okunur; kullanicinin kendi filtresi URL'ye
  // yazilmaz (mevcut sayfa davranisi korunur).
  const statusFilterParam = searchParams.get('status') || ''
  const validStatuses = ['CREATED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'UNKNOWN']
  const statusFilter = useMemo(
    () => statusFilterParam.split(',').map(s => s.trim()).filter(s => validStatuses.includes(s)),
    [statusFilterParam]
  )
  const visibleOrders = statusFilter.length > 0
    ? orders.filter(order => statusFilter.includes(order.status))
    : orders
  const statusFilterLabel = STATUS_FILTER_LABELS[statusFilter.join(',')] ||
    (statusFilter.length === 1 ? STATUS_LABELS[statusFilter[0]] : '')

  function clearStatusFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('status')
    setSearchParams(next, { replace: true })
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ordersData, statusData] = await Promise.all([
        api.marketplace.orders(workspaceId, { limit: 100, ...(providerFilter ? { provider: providerFilter } : {}) }),
        api.integrations.trendyolStatus(workspaceId).catch(() => null)
      ])
      setOrders(ordersData.orders || [])
      setTotal(ordersData.total || 0)
      setLastSyncedAt(statusData?.connections?.[0]?.lastSyncedAt || null)
      setConnected(Boolean(statusData?.connected))
    } catch (err) {
      setError(err.message || 'Siparişler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, providerFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!syncing) return undefined
    const timer = window.setInterval(async () => {
      try {
        const statusData = await api.integrations.trendyolStatus(workspaceId)
        if (!statusData?.syncing) {
          setSyncing(false)
          await load()
          toast.success('Eşitleme tamamlandı.')
        }
      } catch { /* gecici hata polling'i bozmasin */ }
    }, 3000)
    return () => window.clearInterval(timer)
  }, [syncing, workspaceId, load])

  async function handleSync() {
    try {
      await api.integrations.trendyolSync(workspaceId)
      setSyncing(true)
      toast.success('Eşitleme başlatıldı…')
    } catch (err) {
      if (err.status === 409) { setSyncing(true); return }
      toast.error(err.message || 'Eşitleme başlatılamadı.')
    }
  }

  const detail = detailId ? orders.find(order => order.id === detailId) : null

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h2>Siparişler</h2>
          <p className={styles.subtitle}>
            <Clock size={13} aria-hidden="true" />{' '}
            Son eşitleme: {formatDate(lastSyncedAt)}
            {!connected && <em> · Pazaryeri bağlı değil (Ayarlar → Entegrasyonlar)</em>}
          </p>
        </div>
        <button
          type="button"
          className={styles.syncButton}
          onClick={handleSync}
          disabled={syncing || !connected}
          title={connected ? 'Trendyol’dan son siparişleri çek' : 'Önce Ayarlar > Entegrasyonlar’dan Trendyol’u bağlayın'}
        >
          <RefreshCw size={14} aria-hidden="true" className={syncing ? styles.spinning : ''} />
          {syncing ? 'Eşitleniyor…' : 'Şimdi eşitle'}
        </button>
      </header>

      {error && (
        <div className={styles.errorState} role="alert">
          <p>{error}</p>
          <button type="button" onClick={load}>Tekrar dene</button>
        </div>
      )}

      {statusFilter.length > 0 && (
        <div className={styles.filterChipRow}>
          <span className={styles.filterChip}>
            Durum: {statusFilterLabel || statusFilter.join(', ')}
            <button type="button" onClick={clearStatusFilter} aria-label="Filtreyi kaldır"><X size={12} /></button>
          </span>
        </div>
      )}

      <div className={styles.toolbar}>
        <label className={styles.providerFilter}>
          <span>Kaynak</span>
          <select value={providerFilter} onChange={event => setProviderFilter(event.target.value)} aria-label="Kaynak filtresi">
            <option value="">Tümü</option>
            <option value="TRENDYOL">Trendyol</option>
            <option value="HEPSIBURADA">Hepsiburada</option>
            <option value="N11">N11</option>
            <option value="SHOPIFY">Shopify</option>
          </select>
        </label>
      </div>

      {!error && !loading && orders.length === 0 && (
        <div className={styles.emptyState}>
          <PackageSearch size={28} aria-hidden="true" />
          <h3>Henüz sipariş yok</h3>
          <p>
            {connected
              ? '“Şimdi eşitle” ile Trendyol’daki son 30 günlük siparişleri çekebilirsiniz.'
              : 'Trendyol mağazanızı bağladığınızda siparişler burada listelenir.'}
          </p>
        </div>
      )}

      {!error && (loading || orders.length > 0) && (
        <div className={styles.tableWrap} role="region" aria-label="Pazaryeri siparişleri" tabIndex={0}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Sipariş</th>
                <th scope="col">Kaynak</th>
                <th scope="col">Tarih</th>
                <th scope="col">Müşteri</th>
                <th scope="col" className={styles.numeric}>Brüt Tutar</th>
                <th scope="col" className={styles.numeric}>Komisyon</th>
                <th scope="col" className={styles.numeric}>Kargo</th>
                <th scope="col" className={styles.numeric}>İade</th>
                <th scope="col" className={styles.numeric}>Net Katkı</th>
                <th scope="col">Durum</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className={styles.loadingCell}>Yükleniyor…</td></tr>
              )}
              {!loading && visibleOrders.map(order => (
                <tr key={order.id} onClick={() => setDetailId(order.id)} tabIndex={0}
                  onKeyDown={event => { if (event.key === 'Enter') setDetailId(order.id) }}>
                  <td className={styles.orderNo}>
                    <span>{order.externalOrderNumber || order.externalId}</span>
                    <small>{order.itemCount != null ? `${order.itemCount} ürün` : ''}</small>
                  </td>
                  <td>
                    <span className={`${styles.sourceBadge} ${styles[`source_${order.provider}`] || ''}`}>
                      <Store size={11} aria-hidden="true" /> {PROVIDER_LABELS[order.provider] || order.provider}
                    </span>
                  </td>
                  <td className={styles.dateCell}>{formatDate(order.orderDate)}</td>
                  <td className={styles.customer}>{order.customerDisplayName || '—'}</td>
                  <td className={styles.numeric}>{money(order.grossAmount, order.currency)}</td>
                  <td className={styles.numeric}>{money(order.commissionAmount, order.currency)}</td>
                  <td className={styles.numeric}>{money(order.shippingAmount, order.currency)}</td>
                  <td className={styles.numeric}>{money(order.refundAmount, order.currency)}</td>
                  <td className={styles.numeric}>
                    {order.netContribution === null || order.netContribution === undefined
                      ? <span className={styles.mutedValue} title="Komisyon/kargo/iade tutarı sağlanmadığı için hesaplanmaz">—</span>
                      : money(order.netContribution, order.currency)}
                  </td>
                  <td><span className={`${styles.statusChip} ${styles[`status_${order.status}`] || ''}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && statusFilter.length > 0 && visibleOrders.length === 0 && orders.length > 0 && (
        <p className={styles.moreNote}>Bu filtreyle eşleşen sipariş yok.</p>
      )}

      {!loading && total > orders.length && orders.length > 0 && (
        <p className={styles.moreNote}>{total - orders.length} sipariş daha var. Aramayı veya filtrelemeyi backend API üzerinden kullanabilirsiniz.</p>
      )}

      {/* Detay cekmecesi */}
      <Modal open={Boolean(detail)} onClose={() => setDetailId(null)} title="Sipariş detayı" size="lg">
        {detail && (
          <div className={styles.detail}>
            <header className={styles.detailHead}>
              <div>
                <strong className={styles.detailOrderNo}>{detail.externalOrderNumber || detail.externalId}</strong>
                <span className={`${styles.sourceBadge} ${styles[`source_${detail.provider}`] || ''}`}>
                  <Store size={11} aria-hidden="true" /> {PROVIDER_LABELS[detail.provider] || detail.provider}
                </span>
              </div>
              <span className={`${styles.statusChip} ${styles[`status_${detail.status}`] || ''}`}>
                {STATUS_LABELS[detail.status]}
              </span>
              <button type="button" className={styles.closeDetail} onClick={() => setDetailId(null)} aria-label="Kapat"><X size={16} /></button>
            </header>

            <dl className={styles.detailGrid}>
              <div><dt>Sipariş tarihi</dt><dd>{formatDate(detail.orderDate)}</dd></div>
              <div><dt>Müşteri</dt><dd>{detail.customerDisplayName || '—'}</dd></div>
              <div><dt>Para birimi</dt><dd>{detail.currency}</dd></div>
              <div><dt>Son senkron</dt><dd>{formatDate(detail.syncedAt)}</dd></div>
            </dl>

            <h4 className={styles.itemsTitle}>Ürünler</h4>
            <ul className={styles.items}>
              {(detail.items || []).map(item => (
                <li key={item.id}>
                  <div className={styles.itemMain}>
                    <strong>{item.title}</strong>
                    <small>{item.quantity} adet{item.sku ? ` · ${item.sku}` : ''}{item.barcode ? ` · ${item.barcode}` : ''}</small>
                  </div>
                  <div className={styles.itemMoney}>
                    <span>Birim: {money(item.unitPrice, detail.currency)}</span>
                    <span>Brüt: {money(item.grossAmount, detail.currency)}</span>
                    {item.discountAmount !== null && item.discountAmount !== undefined && <span>İndirim: {money(item.discountAmount, detail.currency)}</span>}
                  </div>
                </li>
              ))}
            </ul>

            <dl className={styles.totals}>
              <div><dt>Brüt tutar</dt><dd>{money(detail.grossAmount, detail.currency)}</dd></div>
              <div><dt>İndirim</dt><dd>{money(detail.discountAmount, detail.currency)}</dd></div>
              <div><dt>Komisyon</dt><dd>{detail.commissionAmount == null ? 'Veri yok*' : money(detail.commissionAmount, detail.currency)}</dd></div>
              <div><dt>Kargo</dt><dd>{detail.shippingAmount == null ? 'Veri yok*' : money(detail.shippingAmount, detail.currency)}</dd></div>
              <div><dt>İade</dt><dd>{detail.refundAmount == null ? 'Veri yok*' : money(detail.refundAmount, detail.currency)}</dd></div>
              <div className={styles.netRow}><dt>Net katkı</dt><dd>{detail.netContribution == null ? 'Hesaplanamaz*' : money(detail.netContribution, detail.currency)}</dd></div>
            </dl>
            <p className={styles.footnote}>
              * Pazaryeri bu tutarı paylaşmıyor; tahmin uydurulmaz. Komisyon/kargo/iade bilgileri ileride mutabakat verisiyle tamamlanabilir.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
