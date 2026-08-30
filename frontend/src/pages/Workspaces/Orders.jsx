import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { RefreshCw, Store, X, Clock, PackageSearch } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import Modal from '@/components/ui/Modal'
import styles from './Orders.module.css'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'
import { formatCurrency, formatDate as formatDateValue } from '@/utils/formatters'



const PROVIDER_LABELS = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  N11: 'N11',
  SHOPIFY: 'Shopify',
  AMAZON: 'Amazon',
  WOOCOMMERCE: 'WooCommerce'
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
  const { t } = useTranslation(['workspace', 'common'])
  const { formatLocale } = useLocalization()
  const money = (value, currency = 'TRY') => formatCurrency(value, { locale: formatLocale, currency })
  const formatDate = value => formatDateValue(value, { locale: formatLocale, dateStyle: 'medium', timeStyle: 'short' })
  const statusLabel = status => t(`orderStatus.${String(status || 'UNKNOWN').toLowerCase()}`)

  const STATUS_LABELS = {
    CREATED: t('orderStatus.created'),
    PROCESSING: t('orderStatus.processing'),
    SHIPPED: t('orderStatus.shipped'),
    DELIVERED: t('orderStatus.delivered'),
    CANCELLED: t('orderStatus.cancelled'),
    RETURNED: t('orderStatus.returned'),
    PARTIALLY_RETURNED: t('orderStatus.partially_returned'),
    UNKNOWN: t('orderStatus.unknown')
  }

  /* Deep-link filtre etiketleri (Overview/Dashboard action'lari buraya
     ?status=CREATED,PROCESSING gibi sorgularla gonderir). */
  const STATUS_FILTER_LABELS = {
    CREATED: t('orderStatus.created'),
    PROCESSING: t('orderStatus.processing'),
    'CREATED,PROCESSING': t('orders.awaitingShipment'),
    'RETURNED,PARTIALLY_RETURNED': t('orders.returnInProgress')
  }
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
      setError(err.message || t('ordersLoadError'))
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
          toast.success(t('orders.syncComplete'))
        }
      } catch { /* gecici hata polling'i bozmasin */ }
    }, 3000)
    return () => window.clearInterval(timer)
  }, [syncing, workspaceId, load])

  async function handleSync() {
    try {
      await api.integrations.trendyolSync(workspaceId)
      setSyncing(true)
      toast.success(t('orders.syncStarted'))
    } catch (err) {
      if (err.status === 409) { setSyncing(true); return }
      toast.error(err.message || t('orders.syncFailed'))
    }
  }

  const detail = detailId ? orders.find(order => order.id === detailId) : null

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h2>{t('nav.orders')}</h2>
          <p className={styles.subtitle}>
            <Clock size={13} aria-hidden="true" />{' '}
            {t('lastSync')}: {formatDate(lastSyncedAt)}
            {!connected && <em> · {t('notConnected')}</em>}
          </p>
        </div>
        <button
          type="button"
          className={styles.syncButton}
          onClick={handleSync}
          disabled={syncing || !connected}
          title={connected ? t('orders.syncTooltip') : t('orders.syncTooltipDisabled')}
        >
          <RefreshCw size={14} aria-hidden="true" className={syncing ? styles.spinning : ''} />
          {syncing ? t('syncing') : t('common:buttons.sync')}
        </button>
      </header>

      {error && (
        <div className={styles.errorState} role="alert">
          <p>{error}</p>
          <button type="button" onClick={load}>{t('common:buttons.retry')}</button>
        </div>
      )}

      {statusFilter.length > 0 && (
        <div className={styles.filterChipRow}>
          <span className={styles.filterChip}>
            {t('orders.statusPrefix')} {statusFilterLabel || statusFilter.join(', ')}
            <button type="button" onClick={clearStatusFilter} aria-label={t('orders.clearFilter')}><X size={12} /></button>
          </span>
        </div>
      )}

      <div className={styles.toolbar}>
        <label className={styles.providerFilter}>
          <span>{t('provider')}</span>
          <select value={providerFilter} onChange={event => setProviderFilter(event.target.value)} aria-label={t('orders.sourceFilter')}>
            <option value="">{t('allProviders')}</option>
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
          <h3>{t('ordersEmpty')}</h3>
          <p>
            {connected
              ? t('orders.emptyConnected')
              : t('orders.emptyNotConnected')}
          </p>
        </div>
      )}

      {!error && (loading || orders.length > 0) && (
        <div className={styles.tableWrap} role="region" aria-label={t('marketplaceOrders')} tabIndex={0}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('order')}</th><th scope="col">{t('provider')}</th><th scope="col">{t('date')}</th><th scope="col">{t('customer')}</th><th scope="col" className={styles.numeric}>{t('grossAmount')}</th><th scope="col" className={styles.numeric}>{t('commission')}</th><th scope="col" className={styles.numeric}>{t('shipping')}</th><th scope="col" className={styles.numeric}>{t('refund')}</th><th scope="col" className={styles.numeric}>{t('netContribution')}</th><th scope="col">{t('statusLabel')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className={styles.loadingCell}>{t('common:states.loading')}</td></tr>
              )}
              {!loading && visibleOrders.map(order => (
                <tr key={order.id} onClick={() => setDetailId(order.id)} tabIndex={0}
                  onKeyDown={event => { if (event.key === 'Enter') setDetailId(order.id) }}>
                  <td className={styles.orderNo}>
                    <span>{order.externalOrderNumber || order.externalId}</span>
                    <small>{order.itemCount != null ? t('orders.items', { count: order.itemCount }) : ''}</small>
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
                      ? <span className={styles.mutedValue} title={t('orders.netUnavailable')}>—</span>
                      : money(order.netContribution, order.currency)}
                  </td>
                  <td><span className={`${styles.statusChip} ${styles[`status_${order.status}`] || ''}`}>
                    {statusLabel(order.status)}
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && statusFilter.length > 0 && visibleOrders.length === 0 && orders.length > 0 && (
        <p className={styles.moreNote}>{t('orders.noFilterMatch')}</p>
      )}

      {!loading && total > orders.length && orders.length > 0 && (
        <p className={styles.moreNote}>{t('orders.moreAvailable', { count: total - orders.length })}</p>
      )}

      {/* Detay cekmecesi */}
      <Modal open={Boolean(detail)} onClose={() => setDetailId(null)} title={t('orderDetail')} size="lg">
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
                {statusLabel(detail.status)}
              </span>
              <button type="button" className={styles.closeDetail} onClick={() => setDetailId(null)} aria-label={t('common:buttons.close')}><X size={16} /></button>
            </header>

            <dl className={styles.detailGrid}>
              <div><dt>{t('orders.detail.orderDate')}</dt><dd>{formatDate(detail.orderDate)}</dd></div>
              <div><dt>{t('customer')}</dt><dd>{detail.customerDisplayName || '—'}</dd></div>
              <div><dt>{t('currency')}</dt><dd>{detail.currency}</dd></div>
              <div><dt>Son senkron</dt><dd>{formatDate(detail.syncedAt)}</dd></div>
            </dl>

            <h4 className={styles.itemsTitle}>{t('items')}</h4>
            <ul className={styles.items}>
              {(detail.items || []).map(item => (
                <li key={item.id}>
                  <div className={styles.itemMain}>
                    <strong>{item.title}</strong>
                    <small>{item.quantity} adet{item.sku ? ` · ${item.sku}` : ''}{item.barcode ? ` · ${item.barcode}` : ''}</small>
                  </div>
                  <div className={styles.itemMoney}>
                    <span>Birim: {money(item.unitPrice, detail.currency)}</span>
                    <span>{t('orders.detail.gross')} {money(item.grossAmount, detail.currency)}</span>
                    {item.discountAmount !== null && item.discountAmount !== undefined && <span>{t('orders.detail.discount')} {money(item.discountAmount, detail.currency)}</span>}
                  </div>
                </li>
              ))}
            </ul>

            <dl className={styles.totals}>
              <div><dt>{t('grossAmount')}</dt><dd>{money(detail.grossAmount, detail.currency)}</dd></div>
              <div><dt>{t('orders.discount')}</dt><dd>{money(detail.discountAmount, detail.currency)}</dd></div>
              <div><dt>{t('commission')}</dt><dd>{detail.commissionAmount == null ? t('orders.detail.noData') : money(detail.commissionAmount, detail.currency)}</dd></div>
              <div><dt>{t('shipping')}</dt><dd>{detail.shippingAmount == null ? t('orders.detail.noData') : money(detail.shippingAmount, detail.currency)}</dd></div>
              <div><dt>{t('refund')}</dt><dd>{detail.refundAmount == null ? t('orders.detail.noData') : money(detail.refundAmount, detail.currency)}</dd></div>
              <div className={styles.netRow}><dt>{t('netContribution')}</dt><dd>{detail.netContribution == null ? t('orders.detail.notCalculable') : money(detail.netContribution, detail.currency)}</dd></div>
            </dl>
            <p className={styles.footnote}>
              * {t('orders.detail.commissionNote')}
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
