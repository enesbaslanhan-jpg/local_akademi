import { useEffect, useRef, useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react'
import { api } from '@/services/api'
import { Select } from '@/components/ui'
import styles from './AdminDashboard.module.css'

const PERIODS = [
  { value: 7, label: 'Son 7 gün' },
  { value: 30, label: 'Son 30 gün' },
  { value: 90, label: 'Son 90 gün' },
  { value: 0, label: 'Tüm zamanlar' }
]

const shortDate = value => value
  ? new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  : '—'

const timeAgo = value => {
  if (!value) return '—'
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes || 1} dk`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} sa`
  return `${Math.floor(minutes / 1440)} gün`
}

function normalizeExceptions(alerts = {}) {
  return [
    ...(alerts.overdueReviews || []).map(item => ({
      id: `review-${item.id}`, kind: 'İçerik', tone: 'danger',
      title: item.title || item.code || `İnceleme #${item.id}`,
      detail: `İnceleme tarihi ${shortDate(item.reviewDue)} geçti`
    })),
    ...(alerts.failedImports || []).map(item => ({
      id: `import-${item.id}`, kind: 'Veri', tone: 'warning',
      title: 'Başarısız veri içe aktarımı',
      detail: item.errors?.[0]?.message || `${item.id?.substring(0, 8) || 'İş'} yeniden incelenmeli`
    })),
    ...(alerts.draftWithoutSource || []).map(item => ({
      id: `source-${item.id}`, kind: 'Kaynak', tone: 'neutral',
      title: item.title || item.code || `Taslak #${item.id}`,
      detail: 'Kaynak bilgisi eksik'
    })),
    ...(alerts.pendingHighRisk || []).map(item => ({
      id: `risk-${item.id}`, kind: 'Risk', tone: 'warning',
      title: item.title || item.code || `İçerik #${item.id}`,
      detail: `İnsan incelemesi bekliyor${item.categoryName ? ` · ${item.categoryName}` : ''}`
    }))
  ]
}

function normalizeOperations(activity = {}) {
  const items = [
    ...(activity.imports || []).map(item => ({
      id: `import-${item.id}`, title: `Veri içe aktarımı · ${item.totalRows || 0} kayıt`,
      owner: 'Veri', status: item.status === 'completed' ? 'Hazır' : item.status === 'failed' ? 'Hata' : 'Çalışıyor',
      tone: item.status === 'completed' ? 'success' : item.status === 'failed' ? 'danger' : 'neutral', date: item.createdAt
    })),
    ...(activity.reviews || []).map(item => ({
      id: `review-${item.id}`, title: item.koTitle || item.koCode || 'İçerik incelemesi',
      owner: item.reviewerName || 'İnceleme', status: item.status === 'approved' ? 'Onaylandı' : item.status === 'rejected' ? 'Reddedildi' : 'Bekliyor',
      tone: item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning', date: item.createdAt
    })),
    ...(activity.publications || []).map(item => ({
      id: `publication-${item.id || item.timestamp}`, title: item.koTitle || item.koCode || 'İçerik yayını',
      owner: item.performerName || 'Yayın', status: item.action === 'published' ? 'Yayında' : 'Tamamlandı',
      tone: 'success', date: item.timestamp
    })),
    ...(activity.newUsers || []).map(item => ({
      id: `user-${item.id}`, title: item.name || item.email,
      owner: 'Kullanıcı', status: 'Yeni kayıt', tone: 'neutral', date: item.createdAt
    }))
  ]
  return items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [reviewer, setReviewer] = useState(null)
  const [period, setPeriod] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const fetchId = useRef(0)

  const load = () => {
    const id = ++fetchId.current
    setLoading(true)
    setError('')
    Promise.allSettled([
      api.admin.getStats(period),
      Promise.all([api.admin.getReviewerMetrics(), api.admin.getReviewerHealth()])
    ]).then(([statsResult, reviewerResult]) => {
      if (id !== fetchId.current) return
      if (statsResult.status === 'fulfilled') setData(statsResult.value)
      else setError(statsResult.reason?.message || 'Operasyon verileri alınamadı')
      if (reviewerResult.status === 'fulfilled') {
        const [metrics, health] = reviewerResult.value
        setReviewer({ ...metrics, health })
      }
    }).finally(() => id === fetchId.current && setLoading(false))
  }

  useEffect(load, [period])

  const kpi = data?.kpi || {}
  const exceptions = normalizeExceptions(data?.alerts)
  const operations = normalizeOperations(data?.recentActivity)
  const reviewerQueue = reviewer?.health?.queue || reviewer?.queue || {}
  const systemHealthy = !error && reviewer?.health?.ollama?.reachable !== false
  const queueSize = (kpi.inReviewKOs || 0) + (reviewerQueue.active || 0) + (reviewerQueue.pending || 0)
  const criticalCount = (data?.alerts?.overdueReviews?.length || 0) + (data?.alerts?.failedImports?.length || 0)

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><h1>Admin Operasyonları</h1><p>Sistem sağlığı, SLA ve öncelikli istisnalar.</p></div>
        <div className={styles.headerActions}>
          <Select aria-label="Zaman aralığı" options={PERIODS.map(item => ({ value: String(item.value), label: item.label }))} value={String(period)} onChange={value => setPeriod(Number(value))} />
          <button type="button" className={styles.refreshButton} onClick={load} disabled={loading}><RefreshCw size={15} /> Yenile</button>
        </div>
      </header>

      {error && <div className={styles.warning}><AlertTriangle size={15} /><span>{error}</span><button onClick={load}>Tekrar dene</button></div>}

      <section className={styles.signature} aria-label="Sistem sağlığı özeti">
        <div className={styles.healthSummary}>
          <span className={styles.healthBadge}>{systemHealthy ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />} Sistem sağlığı · canlı</span>
          <h2>{loading && !data ? 'Operasyon verileri yükleniyor' : systemHealthy ? `Hizmetler çalışıyor, ${exceptions.length} istisna bekliyor` : 'Bazı hizmetler dikkat gerektiriyor'}</h2>
          <p>Yerel AI reviewer {reviewer?.health?.ollama?.reachable === true ? 'erişilebilir' : reviewer?.health?.ollama?.reachable === false ? 'erişilemiyor' : 'kontrol ediliyor'}.</p>
        </div>
        <dl className={styles.signatureMetrics}>
          <div><dt>Toplam kullanıcı</dt><dd>{(kpi.totalUsers || 0).toLocaleString('tr-TR')}</dd></div>
          <div><dt>İş kuyruğu</dt><dd>{queueSize.toLocaleString('tr-TR')}</dd></div>
          <div><dt>Kritik olay</dt><dd>{criticalCount.toLocaleString('tr-TR')}</dd></div>
        </dl>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>Öncelikli istisnalar</h2><span>{exceptions.length} açık kayıt</span></div>
        {exceptions.length ? <div className={styles.rows}>{exceptions.slice(0, 5).map(item => (
          <div className={styles.exceptionRow} key={item.id}>
            <span className={`${styles.kind} ${styles[item.tone]}`}>{item.kind}</span>
            <div><strong>{item.title}</strong><small>{item.detail}</small></div>
            <ChevronRight size={15} aria-hidden="true" />
          </div>
        ))}</div> : <div className={styles.empty}>Bu dönemde açık istisna bulunmuyor.</div>}
      </section>

      <section className={`${styles.panel} ${styles.queuePanel}`}>
        <div className={styles.panelHead}><h2>Operasyon kuyruğu</h2><span>{operations.length} son hareket</span></div>
        {operations.length ? <div className={styles.rows}>{operations.slice(0, 6).map(item => (
          <div className={styles.operationRow} key={item.id}>
            <div><strong>{item.title}</strong><small>{item.owner}</small></div>
            <time>{timeAgo(item.date)}</time>
            <span className={`${styles.status} ${styles[item.tone]}`}>{item.status}</span>
            <ChevronRight size={15} aria-hidden="true" />
          </div>
        ))}</div> : <div className={styles.empty}>Bu dönemde operasyon hareketi bulunmuyor.</div>}
      </section>
    </main>
  )
}
