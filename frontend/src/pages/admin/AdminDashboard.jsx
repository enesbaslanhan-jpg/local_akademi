import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react'
import { api } from '@/services/api'
import { Select } from '@/components/ui'
import styles from './AdminDashboard.module.css'
import { getFormatLocale } from '@/utils/formatters'

const PERIOD_KEYS = [7, 30, 90, 0]

const shortDate = value => value
  ? new Date(value).toLocaleDateString(getFormatLocale(), { day: 'numeric', month: 'short' })
  : '—'

function timeAgo(t, value) {
  if (!value) return '—'
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes || 1} ${t('dashboard.timeAgo.minutes')}`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} ${t('dashboard.timeAgo.hours')}`
  return `${Math.floor(minutes / 1440)} ${t('dashboard.timeAgo.days')}`
}

function normalizeExceptions(t, alerts = {}) {
  return [
    ...(alerts.overdueReviews || []).map(item => ({
      id: `review-${item.id}`, kind: t('dashboard.exceptions.kind.content'), tone: 'danger',
      title: item.title || item.code || `${t('dashboard.exceptions.review')} #${item.id}`,
      detail: `${t('dashboard.exceptions.reviewDue')} ${shortDate(item.reviewDue)} ${t('dashboard.exceptions.overdue')}`
    })),
    ...(alerts.failedImports || []).map(item => ({
      id: `import-${item.id}`, kind: t('dashboard.exceptions.kind.data'), tone: 'warning',
      title: t('dashboard.exceptions.failedImport'),
      detail: item.errors?.[0]?.message || `${item.id?.substring(0, 8) || t('dashboard.exceptions.job')} ${t('dashboard.exceptions.needsRecheck')}`
    })),
    ...(alerts.draftWithoutSource || []).map(item => ({
      id: `source-${item.id}`, kind: t('dashboard.exceptions.kind.source'), tone: 'neutral',
      title: item.title || item.code || `${t('dashboard.exceptions.draft')} #${item.id}`,
      detail: t('dashboard.exceptions.sourceMissing')
    })),
    ...(alerts.pendingHighRisk || []).map(item => ({
      id: `risk-${item.id}`, kind: t('dashboard.exceptions.kind.risk'), tone: 'warning',
      title: item.title || item.code || `${t('dashboard.exceptions.content')} #${item.id}`,
      detail: t('dashboard.exceptions.humanReviewPending') + (item.categoryName ? ` · ${item.categoryName}` : '')
    }))
  ]
}

function normalizeOperations(t, activity = {}) {
  const items = [
    ...(activity.imports || []).map(item => ({
      id: `import-${item.id}`, title: `${t('dashboard.operations.dataImport')} · ${item.totalRows || 0} ${t('dashboard.operations.records')}`,
      owner: t('dashboard.operations.owner.data'), status: item.status === 'completed' ? t('dashboard.operations.status.ready') : item.status === 'failed' ? t('dashboard.operations.status.error') : t('dashboard.operations.status.running'),
      tone: item.status === 'completed' ? 'success' : item.status === 'failed' ? 'danger' : 'neutral', date: item.createdAt
    })),
    ...(activity.reviews || []).map(item => ({
      id: `review-${item.id}`, title: item.koTitle || item.koCode || t('dashboard.operations.contentReview'),
      owner: item.reviewerName || t('dashboard.operations.owner.review'), status: item.status === 'approved' ? t('dashboard.operations.status.approved') : item.status === 'rejected' ? t('dashboard.operations.status.rejected') : t('dashboard.operations.status.waiting'),
      tone: item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning', date: item.createdAt
    })),
    ...(activity.publications || []).map(item => ({
      id: `publication-${item.id || item.timestamp}`, title: item.koTitle || item.koCode || t('dashboard.operations.contentPublish'),
      owner: item.performerName || t('dashboard.operations.owner.publish'), status: item.action === 'published' ? t('dashboard.operations.status.live') : t('dashboard.operations.status.completed'),
      tone: 'success', date: item.timestamp
    })),
    ...(activity.newUsers || []).map(item => ({
      id: `user-${item.id}`, title: item.name || item.email,
      owner: t('dashboard.operations.owner.user'), status: t('dashboard.operations.status.newUser'), tone: 'neutral', date: item.createdAt
    }))
  ]
  return items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
}

export default function AdminDashboard() {
  const { t } = useTranslation('admin')
  const [data, setData] = useState(null)
  const [reviewer, setReviewer] = useState(null)
  const [period, setPeriod] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const fetchId = useRef(0)

  const periodOptions = PERIOD_KEYS.map(v => ({ value: String(v), label: t(`dashboard.periods.${v}`) }))

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
      else setError(statsResult.reason?.message || t('dashboard.errors.dataFetch'))
      if (reviewerResult.status === 'fulfilled') {
        const [metrics, health] = reviewerResult.value
        setReviewer({ ...metrics, health })
      }
    }).finally(() => id === fetchId.current && setLoading(false))
  }

  useEffect(load, [period])

  const kpi = data?.kpi || {}
  const exceptions = normalizeExceptions(t, data?.alerts)
  const operations = normalizeOperations(t, data?.recentActivity)
  const reviewerQueue = reviewer?.health?.queue || reviewer?.queue || {}
  const systemHealthy = !error && reviewer?.health?.ollama?.reachable !== false
  const queueSize = (kpi.inReviewKOs || 0) + (reviewerQueue.active || 0) + (reviewerQueue.pending || 0)
  const criticalCount = (data?.alerts?.overdueReviews?.length || 0) + (data?.alerts?.failedImports?.length || 0)

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><h1>{t('dashboard.heading')}</h1><p>{t('dashboard.subheading')}</p></div>
        <div className={styles.headerActions}>
          <Select aria-label={t('dashboard.periodAria')} options={periodOptions} value={String(period)} onChange={value => setPeriod(Number(value))} />
          <button type="button" className={styles.refreshButton} onClick={load} disabled={loading}><RefreshCw size={15} /> {t('dashboard.refresh')}</button>
        </div>
      </header>

      {error && <div className={styles.warning}><AlertTriangle size={15} /><span>{error}</span><button onClick={load}>{t('dashboard.retry')}</button></div>}

      <section className={styles.signature} aria-label={t('dashboard.healthSummary.aria')}>
        <div className={styles.healthSummary}>
          <span className={styles.healthBadge}>{systemHealthy ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />} {t('dashboard.healthBadge')}</span>
          <h2>{loading && !data ? t('dashboard.loadingData') : systemHealthy ? t('dashboard.servicesRunning', { count: exceptions.length }) : t('dashboard.servicesAttention')}</h2>
          <p>{t('dashboard.aiReviewer')} {reviewer?.health?.ollama?.reachable === true ? t('dashboard.aiStatus.reachable') : reviewer?.health?.ollama?.reachable === false ? t('dashboard.aiStatus.unreachable') : t('dashboard.aiStatus.checking')}.</p>
        </div>
        <dl className={styles.signatureMetrics}>
          <div><dt>{t('dashboard.metrics.totalUsers')}</dt><dd>{(kpi.totalUsers || 0).toLocaleString(getFormatLocale())}</dd></div>
          <div><dt>{t('dashboard.metrics.workQueue')}</dt><dd>{queueSize.toLocaleString(getFormatLocale())}</dd></div>
          <div><dt>{t('dashboard.metrics.criticalEvents')}</dt><dd>{criticalCount.toLocaleString(getFormatLocale())}</dd></div>
        </dl>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>{t('dashboard.sections.exceptions')}</h2><span>{exceptions.length} {t('dashboard.openRecords')}</span></div>
        {exceptions.length ? <div className={styles.rows}>{exceptions.slice(0, 5).map(item => (
          <div className={styles.exceptionRow} key={item.id}>
            <span className={`${styles.kind} ${styles[item.tone]}`}>{item.kind}</span>
            <div><strong>{item.title}</strong><small>{item.detail}</small></div>
            <ChevronRight size={15} aria-hidden="true" />
          </div>
        ))}</div> : <div className={styles.empty}>{t('dashboard.empty.exceptions')}</div>}
      </section>

      <section className={`${styles.panel} ${styles.queuePanel}`}>
        <div className={styles.panelHead}><h2>{t('dashboard.sections.operations')}</h2><span>{operations.length} {t('dashboard.recentActivity')}</span></div>
        {operations.length ? <div className={styles.rows}>{operations.slice(0, 6).map(item => (
          <div className={styles.operationRow} key={item.id}>
            <div><strong>{item.title}</strong><small>{item.owner}</small></div>
            <time>{timeAgo(t, item.date)}</time>
            <span className={`${styles.status} ${styles[item.tone]}`}>{item.status}</span>
            <ChevronRight size={15} aria-hidden="true" />
          </div>
        ))}</div> : <div className={styles.empty}>{t('dashboard.empty.operations')}</div>}
      </section>
    </main>
  )
}
