import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, Building2, CalendarDays, FileSignature,
  HandCoins, Package, Receipt, Scale, Truck, WalletCards
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
  const [kararGorevleri, setKararGorevleri] = useState([])
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
      api.marketplace.operations(workspaceId).catch(() => null),
      /*
       * KARARDAN DOĞAN GÖREVLER.
       *
       * Sunucuda süzülüyor, burada değil: yukarıdaki genel liste
       * varsayılan olarak 50 kayıt getiriyor ve karar görevi 51.
       * sırada kalırsa bölüm sessizce boş görünürdü.
       *
       * Hata yutuluyor; bu bölüm ana sayfanın geri kalanını
       * düşürmemeli.
       */
      api.workspace.tracker.list(workspaceId, { kararKaynakli: 'true', limit: 20 }).catch(() => ({ records: [] }))
    ]).then(([summaryData, listData, documentData, activityData, operationsData, kararData]) => {
      if (!active) return
      setSummary(summaryData)
      setRecords(listData.records || [])
      setDocuments(documentData.documents || [])
      setActivities(activityData.items || [])
      setOperations(operationsData)
      setKararGorevleri(kararData.records || [])
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

  /*
   * KARARDAN DOĞAN GÖREVLER — açık olanlar önce, sonra sonucu
   * beklenenler.
   *
   * "Sonucu bekleyen": görev bitmiş ama gerçekleşen sonuç hâlâ
   * yazılmamış. Karar takibinin bütün anlamı bu adımda; kararı verip
   * görevi bitirip sonucu hiç yazmazsan geriye dönüp öğrenecek bir şey
   * kalmıyor. Bu yüzden bitmiş görevler listeden DÜŞMÜYOR, "sonucu
   * bekliyor" diye kalıyorlar.
   */
  const kararSatirlari = kararGorevleri
    .map(record => {
      const takip = record.metadata?.decisionFollowUp || {}
      const bitti = ['completed', 'cancelled'].includes(record.status)
      return {
        record,
        kararBasligi: takip.decisionTitle || null,
        beklenen: takip.expectedOutcome || null,
        sonucBekliyor: bitti && !takip.actualOutcome,
        kapandi: bitti && Boolean(takip.actualOutcome)
      }
    })
    /* Sonucu yazılmış ve bitmiş kararlar ana sayfada yer kaplamıyor;
       onların yeri karar raporu. */
    .filter(satir => !satir.kapandi)
    .sort((a, b) => Number(a.sonucBekliyor) - Number(b.sonucBekliyor))
    .slice(0, 5)

  /* ---- Marketplace (ortak operations servisi). Bağlı degilse tum
     marketplace bloklari devre disi: mevcut ekran AYNEN calisir. ---- */
  const mkt = operations?.summary && operations.summary.connected ? operations : null
  const mktSummary = mkt?.summary ?? null
  const mktActions = mkt?.actions ?? []
  /* Yaklaşan/geciken listesi için aggregate aksiyon satırları:
     her sipariş TEK TEK listelenmez, kategori başına tek satır. */

  /*
   * "Takip durumu" kutusu kaldırıldı: pazaryeri riskleri zaten bağlıyken
   * kendi KPI şeridinde görünüyor, gecikme ise artık tutar kutusunda.
   */
  const overdueCount = summary?.counts.overdue ?? 0
  /* Geciken yön yön (15.09.2026): `overdueTotals.amount` borç+alacağı
     topluyordu — ₺128.000 "geciken" yazıyor ama kaçı bizim ödememiz,
     kaçı bize borç belli olmuyordu. Yeni alan yoksa eskisine düşer. */
  const gecikenBorc = summary?.overdueSplit?.payable?.amount
  const gecikenAlacak = summary?.overdueSplit?.receivable?.amount
  const hakedis30 = summary?.plan30?.hakedis?.net?.amount ?? 0

  return (
    <section className={styles.overviewPage}>
      <header className={styles.overviewHead}>
        <div><h2>{t('workspace:overview.title')}</h2><p>{t('workspace:overview.subtitle')}</p></div>
        <button onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker?new=task`)}>{t('workspace:overview.addRecord')}</button>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {/*
        * PLAN · 30 GÜN — dört kutu, web ve mobilde aynı (ürün sahibi, 15.09.2026):
        * tahsil edilecek (pazaryeri hakedişi dahil) / ödenecek / geciken (yön yön)
        * / kasada bugün. Gerçekleşen Ana Sayfa'da, günlük pazaryeri şeridi
        * Siparişler'de; burada tekrar etmez. Vergi/SGK kutusu kaldırıldı
        * (Ödenecek zaten içeriyor).
        *
        * 🔴 DURUM BANDI SAYI DEĞİL TUTAR SÖYLÜYOR (ürün sahibi, 11.09.2026).
        *
        * Önceki dört kutu (açık yükümlülük / belge / son değişiklik / takip
        * durumu) adet ve tarih veriyordu; esnafa karar verdiren "3 geciken"
        * değil "₺18.400 gecikmiş". Mobildeki kutularla birebir aynı beş
        * başlık: sunucu (`tracker/summary`) hesaplıyor, iki ürün okuyor.
        *
        * ⚠️ Kasa hesabı yoksa "—", sıfır değil: sıfır "kasa boş" demek olurdu.
        * Yön bekleyen kayıt kutu değil; varsa listenin başında tek satır.
        */}
      <section className={styles.statusBand} aria-label={t('workspace:overview.title')}>
        {/*
          * PLAN (30 GÜN) — 15.09.2026. "Bu hafta" (kayan 7 gün) yerine
          * Ana Sayfa ile aynı pencere: [şimdi, +30], geciken dışarıda,
          * pazaryeri hakedişi tahsilata dahil. Sunucu alanı yoksa eskiye düşer.
          */}
        <article><span>{t('workspace:overview.band.planPayable')}</span><strong>{loading || !summary ? '—' : money(summary.plan30?.payable?.amount ?? summary.nextThirtyDays?.payable ?? 0)}</strong><small>{t('workspace:overview.band.records', { count: summary?.plan30?.counts?.payable ?? 0 })}</small></article>
        <article><span>{t('workspace:overview.band.planReceivable')}</span><strong>{loading || !summary ? '—' : money((summary.plan30?.receivable?.amount ?? summary.nextThirtyDays?.receivable ?? 0) + hakedis30)}</strong><small>{hakedis30 > 0 ? t('workspace:overview.band.marketplacePayout', { amount: money(hakedis30), estimated: summary?.plan30?.estimated ? t('workspace:overview.band.estimatedSuffix') : '' }) : t('workspace:overview.band.records', { count: summary?.plan30?.counts?.receivable ?? 0 })}</small></article>
        <article><span>{t('workspace:overview.band.overdueAmount')}</span><strong className={overdueCount > 0 ? styles.statusCritical : undefined}>{loading || !summary ? '—' : money(summary.overdueTotals?.amount ?? 0)}</strong><small>{overdueCount > 0 && gecikenBorc !== undefined ? t('workspace:overview.band.overdueSplit', { payable: money(gecikenBorc), receivable: money(gecikenAlacak ?? 0) }) : overdueCount > 0 ? t('workspace:overview.band.overdueRecords', { count: overdueCount }) : t('workspace:overview.band.noOverdue')}</small></article>
        <Link to={`/app/workspaces/${workspaceId}/accounts`} className={styles.bantKarti}><span>{t('workspace:overview.band.cashToday')}</span><strong>{loading || !summary ? '—' : !summary.cash ? '—' : summary.cash.total === null ? t('workspace:overview.band.accounts', { count: summary.cash.accountCount }) : formatCurrency(summary.cash.total, { locale: formatLocale, currency: summary.cash.currency })}</strong><small>{!summary?.cash ? t('workspace:overview.band.noAccount') : t('workspace:overview.band.accounts', { count: summary.cash.accountCount })}</small></Link>
      </section>

      {summary?.counts?.awaitingDirection > 0 && (
        <p className={styles.inlineNotice}>{t('workspace:overview.band.awaitingDirection', { count: summary.counts.awaitingDirection })}</p>
      )}

      {/*
        * PAZARYERİ İŞLERİ — yalnız bağlıysa; sayı şeridi değil, İŞ satırları
        * (kargo bekleyen, geciden kargo, iade, düşük stok, eşitleme hatası).
        * Her satır ilgili ekrana filtresiyle gider. Eskiden Takvim listesine
        * karışıyordu; ayrı kart olduğu için mobil ile aynı yerde.
        */}
      {mkt && mktActions.length > 0 && (
        <section className={styles.obligationsPanel} aria-label={t('workspace:overview.marketplaceTasks')}>
          <div className={styles.panelTitle}><div><span>{providerChipLabel(mkt, t)}</span><h3>{t('workspace:overview.marketplaceTasks')}</h3></div></div>
          <div className={styles.obligationList}>
            {mktActions.map(action => {
              const critical = action.severity === 'CRITICAL'
              return (
                <button key={`mkt-${action.type}`} onClick={() => navigate(operationsDeepLink(workspaceId, action))}>
                  <span><strong>{marketplaceActionLabel(action, t)}</strong>{action.detail && <small>{action.detail}</small>}</span>
                  <em className={critical ? styles.critical : styles.attention}>{severityLabel(action.severity, t)}</em>
                  <ArrowRight size={14} />
                </button>
              )
            })}
          </div>
        </section>
      )}

      <div className={styles.operationsGrid}>
        <section className={styles.obligationsPanel}>
          <div className={styles.panelTitle}><div><span>{t('workspace:overview.calendar.title')}</span><h3>{t('workspace:overview.calendar.upcoming')}</h3></div><button onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker`)}>{t('workspace:overview.calendar.viewAll')} <ArrowRight size={15} /></button></div>
          {loading ? <p className={styles.inlineState}>{t('workspace:overview.calendar.preparing')}</p> : upcomingRecords.length ? (
            <div className={styles.obligationList}>
              {upcomingRecords.map(record => {
                const overdue = record.dueAt && new Date(record.dueAt) < new Date()
                return <button key={record.id} onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker`)}><span><strong>{record.title}</strong><small>{localDate(record.dueAt, t)}</small></span><span>{t(`workspace:type.${record.type}`) || record.type}</span><em className={overdue ? styles.attention : ''}>{overdue ? t('workspace:tracker.overdue') : t(`workspace:status.${record.status}`) || record.status}</em><ArrowRight size={14} /></button>
              })}
            </div>
          ) : <p className={styles.inlineState}>{t('workspace:overview.noUpcoming')}</p>}
        </section>

        <aside className={styles.activityPanel}>
          <div className={styles.panelTitle}><div><span>{t('workspace:overview.feed.title')}</span><h3>{t('workspace:overview.feed.recentActivity')}</h3></div></div>
          {recentActivity.length ? <div className={styles.activityList}>{recentActivity.map(item => <article key={item.id}><i /><div><strong>{activityLabelFor(item, t) || t('workspace:activity.created')}{isMarketplaceActivity(item) && providerSourceLabel(item) ? <em className={styles.feedSource}>{providerSourceLabel(item)}</em> : null}</strong><small>{localDate(item.createdAt)}</small></div></article>)}</div> : recentRecords.length ? <div className={styles.activityList}>{recentRecords.map(record => <article key={record.id}><i /><div><strong>{record.title}</strong><small>{localDate(record.updatedAt || record.createdAt)}</small></div></article>)}</div> : <p className={styles.inlineState}>{t('workspace:overview.feed.noActivity')}</p>}
        </aside>
      </div>

      {/*
        * KARARLARDAN GELEN GÖREVLER.
        *
        * 🔴 Bu bölüm YOKTU. Karar aracında alınan karar bir göreve
        * bağlanıyordu (metadata.decisionFollowUp), ama o ekrandan
        * çıkınca görev sıradan bir kayda dönüşüyordu: hangi karardan
        * doğduğu ve ne beklendiği bir daha hiçbir yerde görünmüyordu.
        *
        * Hiç karar görevi yoksa bölüm ÇİZİLMİYOR — boş bir kutu, ana
        * sayfada yer kaplamaktan başka bir şey yapmaz.
        */}
      {kararSatirlari.length > 0 && (
        <section className={styles.obligationsPanel} aria-label={t('workspace:overview.decisionTasks.title')}>
          <div className={styles.panelTitle}>
            <div><span><Scale size={14} aria-hidden="true" /> {t('workspace:overview.decisionTasks.label')}</span><h3>{t('workspace:overview.decisionTasks.title')}</h3></div>
            <button onClick={() => navigate(`/app/workspaces/${workspaceId}/decisions`)}>{t('workspace:overview.decisionTasks.report')} <ArrowRight size={15} /></button>
          </div>
          <div className={styles.obligationList}>
            {/* Kayıt detayı ayrı bir rota DEĞİL, takip listesinin içinde
                açılan panel; `?record=` onu açıyor. */}
            {kararSatirlari.map(({ record, kararBasligi, beklenen, sonucBekliyor }) => (
              <button key={record.id} onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker?record=${record.id}`)}>
                <span>
                  <strong>{record.title}</strong>
                  {/* Karar başlığı yoksa UYDURULMUYOR; beklenen sonuç
                      yazılıysa o gösteriliyor, o da yoksa satır sade
                      kalıyor. */}
                  <small>{kararBasligi || beklenen || t('workspace:overview.decisionTasks.noDecisionTitle')}</small>
                </span>
                <span>{localDate(record.dueAt)}</span>
                <em className={sonucBekliyor ? styles.attention : ''}>
                  {sonucBekliyor
                    ? t('workspace:overview.decisionTasks.awaitingOutcome')
                    : record.overdue ? t('workspace:tracker.overdue') : t(`workspace:status.${record.status}`) || record.status}
                </em>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
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
