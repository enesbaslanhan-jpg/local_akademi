import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, Building2, CalendarDays, FileSignature,
  HandCoins, Package, Receipt, Truck, WalletCards
} from 'lucide-react'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import styles from './Overview.module.css'

const QUICK_ACTIONS = [
  { id: 'payment', label: 'Yeni Ödeme', icon: Receipt },
  { id: 'receivable', label: 'Yeni Tahsilat', icon: HandCoins },
  { id: 'promissory_note', label: 'Yeni Senet', icon: FileSignature },
  { id: 'shipment', label: 'Yeni Kargo', icon: Truck }
]

const TYPE_LABELS = {
  payment: 'Ödeme', receivable: 'Tahsilat', promissory_note: 'Senet',
  purchase: 'Alım', shipment: 'Kargo', task: 'Yapılacak', deferred: 'Ertelenen', other: 'Diğer'
}

const STATUS_LABELS = {
  open: 'Açık', in_progress: 'Devam ediyor', completed: 'Tamamlandı',
  cancelled: 'İptal', deferred: 'Ertelendi'
}

const ACTIVITY_LABELS = {
  'workspace.created': 'İşletme oluşturuldu',
  'workspace.updated': 'İşletme bilgileri güncellendi',
  'workspace.archived': 'İşletme arşivlendi',
  'member.role.updated': 'Üye rolü güncellendi',
  'member.removed': 'Üye çıkarıldı',
  'invitation.sent': 'Davet gönderildi',
  'invitation.accepted': 'Davet kabul edildi',
  'contact.created': 'Kişi eklendi',
  'contact.updated': 'Kişi güncellendi'
}

/* Pazaryeri activity event'leri — provider-bağımsız aggregate satırlar;
   adet bilgisi metadata.count'tan okunur, siparis basina event URETILMEZ. */
const MARKETPLACE_ACTIVITY_LABELS = {
  MARKETPLACE_SYNC_COMPLETED: count => `Pazaryeri eşitlemesi tamamlandı`,
  MARKETPLACE_ORDERS_IMPORTED: count => `${count ?? ''} yeni pazaryeri siparişi eşitlendi`.trim(),
  MARKETPLACE_PRODUCTS_UPDATED: count => `${count ?? ''} pazaryeri ürünü güncellendi`.trim(),
  MARKETPLACE_ORDER_DELIVERED: count => `${count ?? ''} sipariş teslim edildi`.trim(),
  MARKETPLACE_RETURN_DETECTED: count => `${count ?? ''} iade tespit edildi`.trim(),
  MARKETPLACE_LOW_STOCK_DETECTED: count => `${count ?? ''} ürün düşük stokta`.trim()
}

const PROVIDER_LABELS = {
  TRENDYOL: 'Trendyol', HEPSIBURADA: 'Hepsiburada', N11: 'N11', SHOPIFY: 'Shopify', WOOCOMMERCE: 'WooCommerce'
}

/* Activity metadata gerçek API'de parse edilmiş OBJECT olarak gelir;
   eski mock/string şekliyle de çalışsın diye toleranslı çözümlenir.
   (JSON.parse(object) fırlatır -> sayı/provider sessizce kaybolurdu.) */
function activityMetadata(item) {
  const raw = item?.metadata
  if (raw && typeof raw === 'object') return raw
  try { return JSON.parse(raw || '{}') } catch { return {} }
}

function activityLabelFor(item) {
  if (typeof MARKETPLACE_ACTIVITY_LABELS[item?.action] === 'function') {
    return MARKETPLACE_ACTIVITY_LABELS[item.action](activityMetadata(item)?.count ?? null)
  }
  return ACTIVITY_LABELS[item?.action] || null
}

function isMarketplaceActivity(item) {
  return Boolean(MARKETPLACE_ACTIVITY_LABELS[item?.action])
}

function operationsDeepLink(workspaceId, action) {
  const query = new URLSearchParams(action.link?.query || {}).toString()
  return `/app/workspaces/${workspaceId}/${action.link?.page || 'orders'}${query ? `?${query}` : ''}`
}

function relativeTime(dateStr) {
  if (!dateStr) return 'hiç eşitlenmedi'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'az önce'
  if (minutes < 60) return `${minutes} dk önce`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} sa önce`
  return `${Math.round(hours / 24)} gün önce`
}

function lowercaseFirst(text) {
  return text ? text.charAt(0).toLocaleLowerCase('tr') + text.slice(1) : text
}

function severityLabel(severity) {
  return { CRITICAL: 'Kritik', ATTENTION: 'Dikkat', INFO: 'Bilgi' }[severity] || 'Bilgi'
}

function providerChipLabel(operations) {
  const providers = (operations?.summary?.providers || []).filter(p => p.status !== 'DISABLED')
  if (providers.length === 0) return 'Pazaryeri'
  const labels = providers.map(p => PROVIDER_LABELS[p.provider] || p.provider)
  return labels.length > 1 ? `${labels[0]} +${labels.length - 1}` : labels[0]
}

function providerSourceLabel(item) {
  const provider = activityMetadata(item)?.provider ?? null
  return PROVIDER_LABELS[provider] || null
}

function money(value, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value || 0))
}

function localDate(value) {
  if (!value) return 'Tarih yok'
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value))
}

export default function Overview() {
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
      if (active) setError(err.message || 'İşletme özeti yüklenemedi.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [workspaceId])

  const recentRecords = useMemo(() => records.slice(0, 5), [records])
  if (!activeWorkspace) return <div className={styles.state}>İşletme bilgileri hazırlanıyor…</div>

  const ws = activeWorkspace
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
  let followStatus = 'Kontrollü'
  let followDetail = overdueCount > 0 ? `${overdueCount} kayıt bekliyor` : 'Acil kayıt yok'
  if (!mktSummary) {
    followStatus = overdueCount > 0 ? 'Dikkat' : 'Kontrollü'
  } else if (overdueCount > 0 || hasAttention || hasCritical) {
    followStatus = hasCritical ? 'Kritik' : 'Dikkat'
    const segments = []
    if (overdueCount > 0) segments.push(`${overdueCount} geciken kayıt`)
    for (const action of mktActions) {
      if (segments.length >= 3) break
      segments.push(lowercaseFirst(action.title))
    }
    if (segments.length > 0) followDetail = segments.join(' · ')
  }

  return (
    <section className={styles.overviewPage}>
      <header className={styles.overviewHead}>
        <div><h2>İşletme Genel Bakış</h2><p>Yükümlülükleri, takvimi ve son değişimleri izleyin.</p></div>
        <button onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker?new=task`)}>Yeni kayıt ekle</button>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.statusBand} aria-label="İşletme durumu">
        <article><span>Açık yükümlülük</span><strong>{loading ? '—' : summary?.counts.open ?? 0}</strong><small>{summary?.counts.overdue ? `${summary.counts.overdue} geciken` : 'Geciken yok'}</small></article>
        <article><span>Belge</span><strong>{loading ? '—' : documents.length}</strong><small>{documents.length ? 'İşletme arşivinde' : 'Henüz belge yok'}</small></article>
        <article><span>Son değişiklik</span><strong>{loading ? '—' : latestChange ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(latestChange)) : 'Yok'}</strong><small>{activityLabelFor(recentActivity[0]) || ACTIVITY_LABELS[recentActivity[0]?.action] || records[0]?.title || 'Hareket bulunmuyor'}</small></article>
        <article><span>Takip durumu</span><strong className={hasCritical ? styles.statusCritical : undefined}>{followStatus}</strong><small>{followDetail}</small></article>
      </section>

      {/* MARKETPLACE KPI ŞERİDİ — yalnız entegrasyon bağlıyken; mevcut
          dört kartlık bandın düzeni korunur, şerit ayrı satırda akar. */}
      {mktSummary && (
        <section className={`${styles.statusBand} ${styles.mktBand}`} aria-label="Pazaryeri durumu">
          <article><span>Bugünkü sipariş</span><strong>{mktSummary.today.orderCount}</strong><small>Bugün</small></article>
          <article><span>Bugünkü brüt satış</span><strong>{money(mktSummary.today.grossSales)}</strong><small>Bugün</small></article>
          <article><span>Bekleyen kargo</span><strong>{mktActions.find(a => a.type === 'PENDING_SHIPMENT')?.count ?? 0}</strong><small>Kargoya verilmedi</small></article>
          <article><span>Düşük stok</span><strong>{mktSummary.inventory.lowStockCount}</strong><small>Eşik ≤ {mktSummary.inventory.threshold}</small></article>
          <article><span>İade</span><strong>{mktActions.find(a => a.type === 'RETURN_PENDING')?.count ?? mktSummary.today.returnCount}</strong><small>Süreç bekliyor</small></article>
        </section>
      )}

      <div className={styles.operationsGrid}>
        <section className={styles.obligationsPanel}>
          <div className={styles.panelTitle}><div><span>TAKVİM</span><h3>Yaklaşan ve gecikenler</h3></div><button onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker`)}>Tümünü aç <ArrowRight size={15} /></button></div>
          {loading ? <p className={styles.inlineState}>Kayıtlar hazırlanıyor…</p> : (upcomingRecords.length || mktActionRows.length) ? (
            <div className={styles.obligationList}>
              {upcomingRecords.map(record => {
                const overdue = record.dueAt && new Date(record.dueAt) < new Date()
                return <button key={record.id} onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker`)}><span><strong>{record.title}</strong><small>{localDate(record.dueAt)}</small></span><span>{TYPE_LABELS[record.type] || record.type}</span><em className={overdue ? styles.attention : ''}>{overdue ? 'Gecikti' : STATUS_LABELS[record.status] || record.status}</em><ArrowRight size={14} /></button>
              })}
              {/* Marketplace aggregate aksiyonlari — kaynak etiketli,
                  derin baglantili; manuel kayitlar asla bastirilmaz. */}
              {mktActionRows.map(action => {
                const critical = action.severity === 'CRITICAL'
                return (
                  <button key={`mkt-${action.type}`} onClick={() => navigate(operationsDeepLink(workspaceId, action))}>
                    <span><strong>{action.title}</strong><small>Pazaryeri operasyonu</small></span>
                    <span className={styles.sourceTag}><i aria-hidden="true" />{providerChipLabel(mkt)}</span>
                    <em className={critical ? styles.critical : styles.attention}>{severityLabel(action.severity)}</em>
                    <ArrowRight size={14} />
                  </button>
                )
              })}
            </div>
          ) : <p className={styles.inlineState}>Yaklaşan açık yükümlülük yok.</p>}
        </section>

        <aside className={styles.activityPanel}>
          <div className={styles.panelTitle}><div><span>AKIŞ</span><h3>Son hareketler</h3></div></div>
          {recentActivity.length ? <div className={styles.activityList}>{recentActivity.map(item => <article key={item.id}><i /><div><strong>{activityLabelFor(item) || 'İşletme hareketi'}{isMarketplaceActivity(item) && providerSourceLabel(item) ? <em className={styles.feedSource}>{providerSourceLabel(item)}</em> : null}</strong><small>{localDate(item.createdAt)}</small></div></article>)}</div> : recentRecords.length ? <div className={styles.activityList}>{recentRecords.map(record => <article key={record.id}><i /><div><strong>{record.title}</strong><small>{localDate(record.updatedAt || record.createdAt)}</small></div></article>)}</div> : <p className={styles.inlineState}>Henüz işletme hareketi yok.</p>}
        </aside>
      </div>

      {/* PAZARYERI ÖZETİ — kompakt kart; bağlantı yoksa hiç çizilmez. */}
      {mktSummary && (
        <section className={styles.mktPanel} aria-label="Pazaryeri Özeti">
          <div className={styles.panelTitle}>
            <div><span>PAZARYERİ</span><h3>Pazaryeri Özeti</h3></div>
            <div className={styles.mktCtas}>
              <button onClick={() => navigate(`/app/workspaces/${workspaceId}/orders`)}>Siparişleri gör <ArrowRight size={14} /></button>
              <button onClick={() => navigate(`/app/workspaces/${workspaceId}/products`)}>Ürünleri gör <ArrowRight size={14} /></button>
            </div>
          </div>
          {mktSummary.sync.hasError && (
            <p className={styles.mktSyncWarning}>
              Pazaryeri verileri güncellenemedi. Son başarılı eşitleme: {relativeTime(mktSummary.sync.lastSyncedAt)}
            </p>
          )}
          <dl className={styles.mktGrid}>
            <div><dt>Kaynak</dt><dd>{(mktSummary.providers || []).filter(p => p.status !== 'DISABLED').map(p => PROVIDER_LABELS[p.provider] || p.provider).join(', ') || '—'}</dd></div>
            <div><dt>Son eşitleme</dt><dd>{relativeTime(mktSummary.sync.lastSyncedAt)}</dd></div>
            <div><dt>Bugün sipariş</dt><dd>{mktSummary.today.orderCount}</dd></div>
            <div><dt>Bugün brüt satış</dt><dd>{money(mktSummary.today.grossSales)}</dd></div>
            <div><dt>Bekleyen kargo</dt><dd>{mktSummary.today.pendingShipmentCount}</dd></div>
            <div><dt>Düşük stok</dt><dd>{mktSummary.inventory.lowStockCount}</dd></div>
            <div><dt>İade</dt><dd>{mktActions.find(a => a.type === 'RETURN_PENDING')?.count ?? mktSummary.today.returnCount}</dd></div>
            <div><dt>En çok satan</dt><dd>{mktSummary.performance.bestSeller?.title || '—'}</dd></div>
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
          <span className={styles.eyebrow}>İŞLETME KONTROL MERKEZİ</span>
          <h2>Genel Bakış</h2>
          <p>Finansal akışınızı ve operasyonel kayıtlarınızı tek bir merkezden yönetin.</p>
        </div>
        <div className={styles.heroWorkspace}>
          <Building2 size={22} aria-hidden="true" />
          <span><small>Aktif işletme</small><strong>{ws.name}</strong></span>
        </div>
      </header>

      <div className={styles.quickGrid} role="group" aria-label="Hızlı kayıt oluştur">
        {QUICK_ACTIONS.map(action => {
          const Icon = action.icon
          return (
            <button key={action.id} className={styles.quickCard} onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker?new=${action.id}`)}>
              <span className={styles.quickIcon}><Icon size={25} aria-hidden="true" /></span>
              <strong>{action.label}</strong>
            </button>
          )
        })}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.metrics} aria-label="İşletme durumu">
        <Metric icon={CalendarDays} label="Açık kayıt" value={loading ? '—' : summary?.counts.open ?? 0} />
        <Metric icon={AlertTriangle} label="Geciken" value={loading ? '—' : summary?.counts.overdue ?? 0} danger />
        <Metric icon={WalletCards} label="30 günlük net" value={loading ? '—' : money(summary?.nextThirtyDays.net ?? 0, ws.currency)} />
        <Metric icon={Package} label="Bekleyen kargo" value={loading ? '—' : summary?.counts.shipments ?? 0} />
      </div>

      <section className={styles.recordsPanel}>
        <div className={styles.recordsHead}>
          <div>
            <span className={styles.panelEyebrow}>GÜNCEL AKIŞ</span>
            <h3>Son Kayıtlar</h3>
          </div>
          <button onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker`)}>
            Tüm kayıtları aç <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className={styles.recordsState}>Kayıtlar hazırlanıyor…</div>
        ) : recentRecords.length === 0 ? (
          <div className={styles.recordsState}>
            <CalendarDays size={30} aria-hidden="true" />
            <strong>Henüz takip kaydı yok</strong>
            <span>Yukarıdaki hızlı aksiyonlardan ilk kaydınızı oluşturabilirsiniz.</span>
          </div>
        ) : (
          <div className={styles.recordTable}>
            <div className={styles.tableHead} aria-hidden="true">
              <span>İşlem ve açıklama</span><span>Tarih</span><span>Durum</span><span>Tutar</span>
            </div>
            {recentRecords.map(record => (
              <article className={styles.recordRow} key={record.id}>
                <div className={styles.recordMain}>
                  <span className={styles.recordIcon}>{TYPE_LABELS[record.type]?.slice(0, 1) || 'K'}</span>
                  <span><strong>{record.title}</strong><small>{record.description || TYPE_LABELS[record.type] || 'Kayıt'}</small></span>
                </div>
                <span className={styles.recordDate}>{localDate(record.dueAt || record.createdAt)}</span>
                <span className={`${styles.status} ${styles[record.status] || ''}`}>{STATUS_LABELS[record.status] || record.status}</span>
                <strong className={styles.amount}>{record.amount == null ? '—' : money(record.amount, record.currency || ws.currency)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.businessCard}>
        <div><span className={styles.panelEyebrow}>İŞLETME PROFİLİ</span><h3>{ws.name}</h3></div>
        <dl>
          <div><dt>Sektör</dt><dd>{ws.sector || 'Belirtilmedi'}</dd></div>
          <div><dt>Şehir</dt><dd>{ws.city || 'Belirtilmedi'}</dd></div>
          <div><dt>Para birimi</dt><dd>{ws.currency}</dd></div>
          <div><dt>Çalışan</dt><dd>{ws.employeeCount ?? 'Belirtilmedi'}</dd></div>
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
