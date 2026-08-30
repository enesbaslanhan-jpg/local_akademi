import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, Building2, CalendarDays, FileSignature,
  HandCoins, Package, Receipt, Truck, WalletCards
} from 'lucide-react'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import styles from './Overview.module.css'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { marketplaceActionLabel } from '@/utils/marketplaceActionLabels'

const QUICK_ACTIONS = [
  { id: 'payment', icon: Receipt },
  { id: 'receivable', icon: HandCoins },
  { id: 'promissory_note', icon: FileSignature },
  { id: 'shipment', icon: Truck }
]

const ACTIVITY_LABELS = {
  'workspace.created': 'activity.created',
  'workspace.updated': 'activity.updated',
  'workspace.archived': 'activity.archived',
  'member.role.updated': 'activity.roleUpdated',
  'member.removed': 'activity.memberRemoved',
  'invitation.sent': 'activity.invitationSent',
  'invitation.accepted': 'activity.invitationAccepted',
  'contact.created': 'activity.contactAdded',
  'contact.updated': 'activity.contactUpdated'
}

/* Pazaryeri activity event'leri — provider-bağımsız aggregate satırlar;
   adet bilgisi metadata.count'tan okunur, siparis basina event URETILMEZ. */
const MARKETPLACE_ACTIVITY_LABELS = {
  MARKETPLACE_SYNC_COMPLETED: count => 'activity.marketplaceSyncCompleted',
  MARKETPLACE_ORDERS_IMPORTED: count => 'activity.marketplaceOrdersImported',
  MARKETPLACE_PRODUCTS_UPDATED: count => 'activity.marketplaceProductsUpdated',
  MARKETPLACE_ORDER_DELIVERED: count => 'activity.marketplaceOrderDelivered',
  MARKETPLACE_RETURN_DETECTED: count => 'activity.marketplaceReturnDetected',
  MARKETPLACE_LOW_STOCK_DETECTED: count => 'activity.marketplaceLowStockDetected'
}

const PROVIDER_LABELS = {
  TRENDYOL: 'Trendyol', HEPSIBURADA: 'Hepsiburada', N11: 'N11', SHOPIFY: 'Shopify', AMAZON: 'Amazon', WOOCOMMERCE: 'WooCommerce'
}

/* Activity metadata gerçek API'de parse edilmiş OBJECT olarak gelir;
   eski mock/string şekliyle de çalışsın diye toleranslı çözümlenir.
   (JSON.parse(object) fırlatır -> sayı/provider sessizce kaybolurdu.) */
function activityMetadata(item) {
  const raw = item?.metadata
  if (raw && typeof raw === 'object') return raw
  try { return JSON.parse(raw || '{}') } catch { return {} }
}

function activityLabelFor(item, t) {
  if (typeof MARKETPLACE_ACTIVITY_LABELS[item?.action] === 'function') {
    const key = MARKETPLACE_ACTIVITY_LABELS[item.action](activityMetadata(item)?.count ?? null)
    return t ? t(`workspace:${key}`, { count: activityMetadata(item)?.count ?? 0 }) : key
  }
  const key = ACTIVITY_LABELS[item?.action]
  return key && t ? t(`workspace:${key}`) : key || null
}

function isMarketplaceActivity(item) {
  return Boolean(MARKETPLACE_ACTIVITY_LABELS[item?.action])
}

function operationsDeepLink(workspaceId, action) {
  const query = new URLSearchParams(action.link?.query || {}).toString()
  return `/app/workspaces/${workspaceId}/${action.link?.page || 'orders'}${query ? `?${query}` : ''}`
}

function relativeTime(dateStr, t) {
  if (!dateStr) return t('workspace:relative.never')
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return t('workspace:relative.justNow')
  if (minutes < 60) return t('workspace:relative.minutesAgo', { count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('workspace:relative.hoursAgo', { count: hours })
  return t('workspace:relative.daysAgo', { count: Math.round(hours / 24) })
}

function lowercaseFirst(text, locale) {
  return text ? text.charAt(0).toLocaleLowerCase(locale) + text.slice(1) : text
}

function severityLabel(severity, t) {
  return { CRITICAL: t('workspace:severity.critical'), ATTENTION: t('workspace:severity.attention'), INFO: t('workspace:severity.info') }[severity] || t('workspace:severity.info')
}

function providerChipLabel(operations, t) {
  const providers = (operations?.summary?.providers || []).filter(p => p.status !== 'DISABLED')
  if (providers.length === 0) return t('workspace:marketplace.label')
  const labels = providers.map(p => PROVIDER_LABELS[p.provider] || p.provider)
  return labels.length > 1 ? `${labels[0]} +${labels.length - 1}` : labels[0]
}

function providerSourceLabel(item) {
  const provider = activityMetadata(item)?.provider ?? null
  return PROVIDER_LABELS[provider] || null
}

export default function Overview() {
  const { t } = useTranslation('workspace')
  const { formatLocale } = useLocalization()
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspace()
  const [summary, setSummary] = useState(null)
  const [records, setRecords] = useState([])
  const [documents, setDocuments] = useState([])
  const [activities, setActivities] = useState([])
  const [operations, setOperations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      api.workspace.tracker.summary(workspaceId),
      api.workspace.tracker.list(workspaceId, {}),
      api.workspace.documents.list(workspaceId).catch(() => ({ documents: [] })),
      api.workspace.activity.list(workspaceId, { limit: 8 }).catch(() => ({ items: [] })),
      // Ortak operations servisi: hata olursa marketplace bloklari sessizce gizlenir.
      api.marketplace.operations(workspaceId).catch(() => null)
    ]).then(([summaryData, listData, documentData, activityData, operationsData]) => {
      if (!active) return
      setSummary(summaryData)
      setRecords(listData.records || [])
      setDocuments(documentData.documents || [])
      setActivities(activityData.items || [])
      setOperations(operationsData)
    }).catch(err => {
      if (active) setError(err.message || t('workspace:overview.loadError'))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [workspaceId])

  const recentRecords = useMemo(() => records.slice(0, 5), [records])
  if (!activeWorkspace) return <div className={styles.state}>{t('workspace:overview.preparing')}</div>

  const ws = activeWorkspace
  const money = value => formatCurrency(value, { locale: formatLocale, currency: ws.currency || 'TRY' })
  const localDate = value => value ? formatDate(value, { locale: formatLocale, dateStyle: 'medium' }) : t('workspace:dateNone')
  const upcomingRecords = records
    .filter(record => !['completed', 'cancelled'].includes(record.status))
    .sort((a, b) => new Date(a.dueAt || '9999-12-31') - new Date(b.dueAt || '9999-12-31'))
    .slice(0, 5)
  const recentActivity = activities.slice(0, 5)
  const latestChange = recentActivity[0]?.createdAt || records[0]?.updatedAt || records[0]?.createdAt

  /* ---- Marketplace (ortak operations servisi). Bağlı degilse tum
     marketplace bloklari devre disi: mevcut ekran AYNEN calisir. ---- */
  const mkt = operations?.summary && operations.summary.connected ? operations : null
  const mktSummary = mkt?.summary ?? null
  const mktActions = mkt?.actions ?? []
  /* Yaklaşan/geciken listesi için aggregate aksiyon satırları:
     her sipariş TEK TEK listelenmez, kategori başına tek satır. */
  const mktActionRows = mktActions.slice(0, 3)

  /* ---- BİRLEŞİK TAKİP DURUMU: geciken kayıtlar + marketplace riskleri.
     Kritik önceliklendirilir. Bağlı DEĞİLSE eski davranış birebir korunur:
     yalnız BusinessRecord gecikmesine bakılır. ---- */
  const hasCritical = mktActions.some(action => action.severity === 'CRITICAL')
  const hasAttention = mktActions.some(action => action.severity === 'ATTENTION')
  const overdueCount = summary?.counts.overdue ?? 0
  let followStatus = t('workspace:severity.info')
  let followDetail = overdueCount > 0 ? t('workspace:overview.band.waitingRecords', { count: overdueCount }) : t('workspace:overview.band.noOverdue')
  if (!mktSummary) {
    followStatus = overdueCount > 0 ? t('workspace:severity.attention') : t('workspace:severity.info')
  } else if (overdueCount > 0 || hasAttention || hasCritical) {
    followStatus = hasCritical ? t('workspace:severity.critical') : t('workspace:severity.attention')
    const segments = []
    if (overdueCount > 0) segments.push(t('workspace:overview.band.overdueRecords', { count: overdueCount }))
    for (const action of mktActions) {
      if (segments.length >= 3) break
      segments.push(lowercaseFirst(marketplaceActionLabel(action, t), formatLocale))
    }
    if (segments.length > 0) followDetail = segments.join(' · ')
  }

  return (
    <section className={styles.overviewPage}>
      <header className={styles.overviewHead}>
        <div><h2>{t('workspace:overview.title')}</h2><p>{t('workspace:overview.subtitle')}</p></div>
        <button onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker?new=task`)}>{t('workspace:overview.addRecord')}</button>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.statusBand} aria-label={t('workspace:overview.title')}>
        <article><span>{t('workspace:overview.band.openObligation')}</span><strong>{loading ? '—' : summary?.counts.open ?? 0}</strong><small>{summary?.counts.overdue ? `${summary.counts.overdue} ${t('workspace:overview.band.overdue')}` : t('workspace:overview.band.noOverdue')}</small></article>
        <article><span>{t('workspace:overview.band.document')}</span><strong>{loading ? '—' : documents.length}</strong><small>{documents.length ? t('workspace:overview.band.archived') : t('workspace:overview.band.noDocument')}</small></article>
        <article><span>{t('workspace:overview.band.lastChange')}</span><strong>{loading ? '—' : latestChange ? formatDate(latestChange, { locale: formatLocale, day: 'numeric', month: 'short' }) : t('workspace:overview.band.none')}</strong><small>{activityLabelFor(recentActivity[0], t) || records[0]?.title || t('workspace:overview.band.noMovement')}</small></article>
        <article><span>{t('workspace:overview.band.trackingStatus')}</span><strong className={hasCritical ? styles.statusCritical : undefined}>{followStatus}</strong><small>{followDetail}</small></article>
      </section>

      {/* MARKETPLACE KPI ŞERİDİ — yalnız entegrasyon bağlıyken; mevcut
          dört kartlık bandın düzeni korunur, şerit ayrı satırda akar. */}
      {mktSummary && (
        <section className={`${styles.statusBand} ${styles.mktBand}`} aria-label={t('workspace:overview.marketplaceSummary')}>
          <article><span>{t('workspace:overview.mkt.todayOrders')}</span><strong>{mktSummary.today.orderCount}</strong><small>{t('workspace:overview.mkt.today')}</small></article>
          <article><span>{t('workspace:overview.mkt.todayGrossSales')}</span><strong>{money(mktSummary.today.grossSales)}</strong><small>{t('workspace:overview.mkt.today')}</small></article>
          <article><span>{t('workspace:overview.mkt.pendingShipment')}</span><strong>{mktActions.find(a => a.type === 'PENDING_SHIPMENT')?.count ?? 0}</strong><small>{t('workspace:overview.mkt.notShipped')}</small></article>
          <article><span>{t('workspace:overview.mkt.lowStock')}</span><strong>{mktSummary.inventory.lowStockCount}</strong><small>{t('workspace:tracker.col.loading').replace('…', '')} ≤ {mktSummary.inventory.threshold}</small></article>
          <article><span>{t('workspace:overview.mkt.return')}</span><strong>{mktActions.find(a => a.type === 'RETURN_PENDING')?.count ?? mktSummary.today.returnCount}</strong><small>{t('workspace:overview.mkt.processPending')}</small></article>
        </section>
      )}

      <div className={styles.operationsGrid}>
        <section className={styles.obligationsPanel}>
          <div className={styles.panelTitle}><div><span>{t('workspace:overview.calendar.title')}</span><h3>{t('workspace:overview.calendar.upcoming')}</h3></div><button onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker`)}>{t('workspace:overview.calendar.viewAll')} <ArrowRight size={15} /></button></div>
          {loading ? <p className={styles.inlineState}>{t('workspace:overview.calendar.preparing')}</p> : (upcomingRecords.length || mktActionRows.length) ? (
            <div className={styles.obligationList}>
              {upcomingRecords.map(record => {
                const overdue = record.dueAt && new Date(record.dueAt) < new Date()
                return <button key={record.id} onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker`)}><span><strong>{record.title}</strong><small>{localDate(record.dueAt, t)}</small></span><span>{t(`workspace:type.${record.type}`) || record.type}</span><em className={overdue ? styles.attention : ''}>{overdue ? t('workspace:tracker.overdue') : t(`workspace:status.${record.status}`) || record.status}</em><ArrowRight size={14} /></button>
              })}
              {/* Marketplace aggregate aksiyonlari — kaynak etiketli,
                  derin baglantili; manuel kayitlar asla bastirilmaz. */}
              {mktActionRows.map(action => {
                const critical = action.severity === 'CRITICAL'
                return (
                  <button key={`mkt-${action.type}`} onClick={() => navigate(operationsDeepLink(workspaceId, action))}>
                    <span><strong>{marketplaceActionLabel(action, t)}</strong><small>{t('workspace:overview.marketplaceOp')}</small></span>
                    <span className={styles.sourceTag}><i aria-hidden="true" />{providerChipLabel(mkt, t)}</span>
                    <em className={critical ? styles.critical : styles.attention}>{severityLabel(action.severity, t)}</em>
                    <ArrowRight size={14} />
                  </button>
                )
              })}
            </div>
          ) : <p className={styles.inlineState}>{t('workspace:overview.noUpcoming')}</p>}
        </section>

        <aside className={styles.activityPanel}>
          <div className={styles.panelTitle}><div><span>{t('workspace:overview.feed.title')}</span><h3>{t('workspace:overview.feed.recentActivity')}</h3></div></div>
          {recentActivity.length ? <div className={styles.activityList}>{recentActivity.map(item => <article key={item.id}><i /><div><strong>{activityLabelFor(item, t) || t('workspace:activity.created')}{isMarketplaceActivity(item) && providerSourceLabel(item) ? <em className={styles.feedSource}>{providerSourceLabel(item)}</em> : null}</strong><small>{localDate(item.createdAt)}</small></div></article>)}</div> : recentRecords.length ? <div className={styles.activityList}>{recentRecords.map(record => <article key={record.id}><i /><div><strong>{record.title}</strong><small>{localDate(record.updatedAt || record.createdAt)}</small></div></article>)}</div> : <p className={styles.inlineState}>{t('workspace:overview.feed.noActivity')}</p>}
        </aside>
      </div>

      {/* PAZARYERI ÖZETİ — kompakt kart; bağlantı yoksa hiç çizilmez. */}
      {mktSummary && (
        <section className={styles.mktPanel} aria-label={t('workspace:overview.marketplaceSummary')}>
          <div className={styles.panelTitle}>
            <div><span>{t('workspace:marketplace.label')}</span><h3>{t('workspace:overview.marketplaceSummary')}</h3></div>
            <div className={styles.mktCtas}>
              <button onClick={() => navigate(`/app/workspaces/${workspaceId}/orders`)}>{t('workspace:overview.viewOrders')} <ArrowRight size={14} /></button>
              <button onClick={() => navigate(`/app/workspaces/${workspaceId}/products`)}>{t('workspace:overview.viewProducts')} <ArrowRight size={14} /></button>
            </div>
          </div>
          {mktSummary.sync.hasError && (
            <p className={styles.mktSyncWarning}>
              {t('workspace:overview.syncError', { time: relativeTime(mktSummary.sync.lastSyncedAt, t) })}
            </p>
          )}
          <dl className={styles.mktGrid}>
            <div><dt>{t('workspace:provider')}</dt><dd>{(mktSummary.providers || []).filter(p => p.status !== 'DISABLED').map(p => PROVIDER_LABELS[p.provider] || p.provider).join(', ') || '—'}</dd></div>
            <div><dt>{t('workspace:lastSync')}</dt><dd>{relativeTime(mktSummary.sync.lastSyncedAt, t)}</dd></div>
            <div><dt>{t('workspace:overview.mkt.ordersToday')}</dt><dd>{mktSummary.today.orderCount}</dd></div>
            <div><dt>{t('workspace:overview.mkt.grossSalesToday')}</dt><dd>{money(mktSummary.today.grossSales)}</dd></div>
            <div><dt>{t('workspace:overview.mkt.pendingShipment')}</dt><dd>{mktSummary.today.pendingShipmentCount}</dd></div>
            <div><dt>{t('workspace:overview.mkt.lowStock')}</dt><dd>{mktSummary.inventory.lowStockCount}</dd></div>
            <div><dt>{t('workspace:overview.mkt.return')}</dt><dd>{mktActions.find(a => a.type === 'RETURN_PENDING')?.count ?? mktSummary.today.returnCount}</dd></div>
            <div><dt>{t('workspace:overview.mkt.bestSeller')}</dt><dd>{mktSummary.performance.bestSeller?.title || '—'}</dd></div>
          </dl>
        </section>
      )}
    </section>
  )

  /* Önceki uzun kompozisyon, yeni operasyon özeti tarafından kullanılmıyor. */

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>{t('workspace:overview.legacy.controlCenter')}</span>
          <h2>{t('workspace:overview.legacy.title')}</h2>
          <p>{t('workspace:overview.legacy.subtitle')}</p>
        </div>
        <div className={styles.heroWorkspace}>
          <Building2 size={22} aria-hidden="true" />
          <span><small>{t('workspace:overview.legacy.activeBusiness')}</small><strong>{ws.name}</strong></span>
        </div>
      </header>

      <div className={styles.quickGrid} role="group" aria-label={t('workspace:overview.legacy.quickCreate')}>
        {QUICK_ACTIONS.map(action => {
          const Icon = action.icon
          return (
            <button key={action.id} className={styles.quickCard} onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker?new=${action.id}`)}>
              <span className={styles.quickIcon}><Icon size={25} aria-hidden="true" /></span>
              <strong>{t(`workspace:quickAction.${action.id === 'payment' ? 'newPayment' : action.id === 'receivable' ? 'newReceivable' : action.id === 'promissory_note' ? 'newNote' : 'newShipment'}`)}</strong>
            </button>
          )
        })}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.metrics} aria-label={t('workspace:overview.legacy.metrics.businessStatus')}>
        <Metric icon={CalendarDays} label={t('workspace:overview.legacy.metrics.openRecord')} value={loading ? '—' : summary?.counts.open ?? 0} />
        <Metric icon={AlertTriangle} label={t('workspace:overview.legacy.metrics.overdue')} value={loading ? '—' : summary?.counts.overdue ?? 0} danger />
        <Metric icon={WalletCards} label={t('workspace:overview.legacy.metrics.net30')} value={loading ? '—' : money(summary?.nextThirtyDays.net ?? 0, ws.currency)} />
        <Metric icon={Package} label={t('workspace:overview.legacy.metrics.pendingShipment')} value={loading ? '—' : summary?.counts.shipments ?? 0} />
      </div>

      <section className={styles.recordsPanel}>
        <div className={styles.recordsHead}>
          <div>
            <span className={styles.panelEyebrow}>{t('workspace:overview.legacy.feed.title')}</span>
            <h3>{t('workspace:overview.legacy.feed.recentRecords')}</h3>
          </div>
          <button onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker`)}>
            {t('workspace:overview.legacy.feed.viewAll')} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className={styles.recordsState}>{t('workspace:overview.legacy.feed.preparing')}</div>
        ) : recentRecords.length === 0 ? (
          <div className={styles.recordsState}>
            <CalendarDays size={30} aria-hidden="true" />
            <strong>{t('workspace:overview.legacy.feed.noRecords')}</strong>
            <span>{t('workspace:overview.legacy.feed.startHint')}</span>
          </div>
        ) : (
          <div className={styles.recordTable}>
            <div className={styles.tableHead} aria-hidden="true">
              <span>{t('workspace:overview.legacy.col.actionAndDescription')}</span><span>{t('workspace:overview.legacy.col.date')}</span><span>{t('workspace:overview.legacy.col.status')}</span><span>{t('workspace:overview.legacy.col.amount')}</span>
            </div>
            {recentRecords.map(record => (
              <article className={styles.recordRow} key={record.id}>
                <div className={styles.recordMain}>
                  <span className={styles.recordIcon}>{t(`workspace:type.${record.type}`)?.slice(0, 1) || t('workspace:overview.legacy.col.record').slice(0, 1)}</span>
                  <span><strong>{record.title}</strong><small>{record.description || t(`workspace:type.${record.type}`) || t('workspace:overview.legacy.col.record')}</small></span>
                </div>
                <span className={styles.recordDate}>{localDate(record.dueAt || record.createdAt, t)}</span>
                <span className={`${styles.status} ${styles[record.status] || ''}`}>{t(`workspace:status.${record.status}`) || record.status}</span>
                <strong className={styles.amount}>{record.amount == null ? '—' : money(record.amount, record.currency || ws.currency)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.businessCard}>
        <div><span className={styles.panelEyebrow}>{t('workspace:overview.legacy.profile.title')}</span><h3>{ws.name}</h3></div>
        <dl>
          <div><dt>{t('workspace:overview.legacy.profile.sector')}</dt><dd>{ws.sector || t('workspace:overview.legacy.profile.unspecified')}</dd></div>
          <div><dt>{t('workspace:overview.legacy.profile.city')}</dt><dd>{ws.city || t('workspace:overview.legacy.profile.unspecified')}</dd></div>
          <div><dt>{t('workspace:overview.legacy.profile.currency')}</dt><dd>{ws.currency}</dd></div>
          <div><dt>{t('workspace:overview.legacy.profile.employees')}</dt><dd>{ws.employeeCount ?? t('workspace:overview.legacy.profile.unspecified')}</dd></div>
        </dl>
      </section>
    </section>
  )
}

function Metric({ icon: Icon, label, value, danger = false }) {
  return (
    <article className={`${styles.metric} ${danger ? styles.metricDanger : ''}`}>
      <div className={styles.metricTop}><span>{label}</span><Icon size={20} aria-hidden="true" /></div>
      <strong>{value}</strong>
      <div className={styles.metricLine} aria-hidden="true"><span /></div>
    </article>
  )
}
