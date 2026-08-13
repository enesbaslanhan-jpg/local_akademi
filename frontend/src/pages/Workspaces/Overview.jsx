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
      api.workspace.activity.list(workspaceId, { limit: 8 }).catch(() => ({ items: [] }))
    ]).then(([summaryData, listData, documentData, activityData]) => {
      if (!active) return
      setSummary(summaryData)
      setRecords(listData.records || [])
      setDocuments(documentData.documents || [])
      setActivities(activityData.items || [])
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
        <article><span>Son değişiklik</span><strong>{loading ? '—' : latestChange ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(latestChange)) : 'Yok'}</strong><small>{ACTIVITY_LABELS[recentActivity[0]?.action] || records[0]?.title || 'Hareket bulunmuyor'}</small></article>
        <article><span>Takip durumu</span><strong>{summary?.counts.overdue ? 'Dikkat' : 'Kontrollü'}</strong><small>{summary?.counts.overdue ? `${summary.counts.overdue} kayıt bekliyor` : 'Acil kayıt yok'}</small></article>
      </section>

      <div className={styles.operationsGrid}>
        <section className={styles.obligationsPanel}>
          <div className={styles.panelTitle}><div><span>TAKVİM</span><h3>Yaklaşan ve gecikenler</h3></div><button onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker`)}>Tümünü aç <ArrowRight size={15} /></button></div>
          {loading ? <p className={styles.inlineState}>Kayıtlar hazırlanıyor…</p> : upcomingRecords.length ? (
            <div className={styles.obligationList}>
              {upcomingRecords.map(record => {
                const overdue = record.dueAt && new Date(record.dueAt) < new Date()
                return <button key={record.id} onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker`)}><span><strong>{record.title}</strong><small>{localDate(record.dueAt)}</small></span><span>{TYPE_LABELS[record.type] || record.type}</span><em className={overdue ? styles.attention : ''}>{overdue ? 'Gecikti' : STATUS_LABELS[record.status] || record.status}</em><ArrowRight size={14} /></button>
              })}
            </div>
          ) : <p className={styles.inlineState}>Yaklaşan açık yükümlülük yok.</p>}
        </section>

        <aside className={styles.activityPanel}>
          <div className={styles.panelTitle}><div><span>AKIŞ</span><h3>Son hareketler</h3></div></div>
          {recentActivity.length ? <div className={styles.activityList}>{recentActivity.map(item => <article key={item.id}><i /><div><strong>{ACTIVITY_LABELS[item.action] || 'İşletme hareketi'}</strong><small>{localDate(item.createdAt)}</small></div></article>)}</div> : recentRecords.length ? <div className={styles.activityList}>{recentRecords.map(record => <article key={record.id}><i /><div><strong>{record.title}</strong><small>{localDate(record.updatedAt || record.createdAt)}</small></div></article>)}</div> : <p className={styles.inlineState}>Henüz işletme hareketi yok.</p>}
        </aside>
      </div>
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
