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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      api.workspace.tracker.summary(workspaceId),
      api.workspace.tracker.list(workspaceId, {})
    ]).then(([summaryData, listData]) => {
      if (!active) return
      setSummary(summaryData)
      setRecords(listData.records || [])
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
