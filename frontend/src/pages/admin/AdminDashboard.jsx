import { useState, useEffect, useRef } from 'react'
import { api } from '@/services/api'
import { AlertTriangle, Clock, Users, BookOpen, Download, UserPlus, FileText, RefreshCw, AlertCircle, ArrowUpRight, Layers, Tag, CheckCircle, XCircle, Archive, Eye, Zap, Ban } from 'lucide-react'
import { Select } from '@/components/ui'
import styles from './AdminDashboard.module.css'

const PERIODS = [
  { value: 7, label: 'Son 7 Gün' },
  { value: 30, label: 'Son 30 Gün' },
  { value: 90, label: 'Son 90 Gün' },
  { value: 0, label: 'Tüm Zamanlar' }
]

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '-' }
}

function shortDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  } catch { return '-' }
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins}d`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}s`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}g`
  return shortDate(dateStr)
}

const KPI_DEFS = [
  { key: 'totalUsers', label: 'Kullanıcı', icon: Users, color: '#3b82f6' },
  { key: 'totalKOs', label: 'Toplam KO', icon: BookOpen, color: '#8b5cf6' },
  { key: 'publishedKOs', label: 'Yayında', icon: CheckCircle, color: '#22c55e' },
  { key: 'inReviewKOs', label: 'İncelemede', icon: Eye, color: '#f59e0b' },
  { key: 'draftKOs', label: 'Taslak', icon: FileText, color: '#6b7280' },
  { key: 'approvedKOs', label: 'Onaylı', icon: ArrowUpRight, color: '#3b82f6' },
  { key: 'rejectedKOs', label: 'Reddedilen', icon: XCircle, color: '#ef4444' },
  { key: 'archivedKOs', label: 'Arşivlenmiş', icon: Archive, color: '#8b5cf6' },
  { key: 'professionalKOs', label: 'Profesyonel KO', icon: Zap, color: '#ec4899' },
  { key: 'demoKOs', label: 'Demo KO', icon: Layers, color: '#14b8a6' },
  { key: 'totalCategories', label: 'Kategori', icon: Tag, color: '#f97316' },
  { key: 'overdueReviews', label: 'Gecikmiş İnceleme', icon: Clock, color: '#ef4444' },
  { key: 'recentImportCount', label: 'Son Import', icon: Download, color: '#6366f1' },
  { key: 'totalEnrollments', label: 'Kayıt', icon: UserPlus, color: '#a855f7' }
]

const STATUS_ICONS = {
  draft: FileText,
  in_review: Eye,
  approved: CheckCircle,
  published: ArrowUpRight,
  rejected: XCircle,
  archived: Archive
}

const STATUS_COLORS = {
  draft: '#6b7280',
  in_review: '#f59e0b',
  approved: '#3b82f6',
  published: '#22c55e',
  rejected: '#ef4444',
  archived: '#8b5cf6'
}

function KpiSkeleton() {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={`${styles.skeletonLine} ${styles.skeletonNarrow}`} />
          <div className={`${styles.skeletonLine} ${styles.skeletonWide}`} />
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewerData, setReviewerData] = useState(null)
  const [reviewerError, setReviewerError] = useState('')
  const [period, setPeriod] = useState(30)
  const fetchIdRef = useRef(0)

  function fetchData() {
    const fid = ++fetchIdRef.current
    setLoading(true)
    setError('')
    setReviewerError('')
    api.admin.getStats(period)
      .then(raw => {
        if (fid !== fetchIdRef.current) return
        setData(raw)
      })
      .catch(err => {
        if (fid !== fetchIdRef.current) return
        setError(err.message)
      })
      .finally(() => {
        if (fid === fetchIdRef.current) setLoading(false)
      })

    Promise.all([
      api.admin.getReviewerMetrics(),
      api.admin.getReviewerHealth()
    ])
      .then(([metrics, health]) => {
        if (fid !== fetchIdRef.current) return
        setReviewerData({ ...metrics, health })
      })
      .catch(err => {
        if (fid !== fetchIdRef.current) return
        setReviewerError(err.message)
      })
  }

  useEffect(() => { fetchData() }, [period])

  if (loading && !data) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h2>Sistem Özeti</h2>
          <Select className={styles.periodSelect} aria-label="Zaman aralığı" options={PERIODS.map(p => ({ value: String(p.value), label: p.label }))} value={String(period)} onChange={v => setPeriod(Number(v))} />
        </div>
        <KpiSkeleton />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className={styles.page}>
        <div className={styles.header}><h2>Sistem Özeti</h2></div>
        <div className={styles.errorInline}>
          <AlertTriangle size={16} />
          <span>{error} — <button onClick={fetchData}>Tekrar dene</button></span>
        </div>
      </div>
    )
  }

  const { kpi = {}, statusDistribution = [], categoryDistribution = [], recentActivity = {}, alerts = {} } = data || {}

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>Sistem Özeti</h2>
        <Select className={styles.periodSelect} aria-label="Zaman aralığı" options={PERIODS.map(p => ({ value: String(p.value), label: p.label }))} value={String(period)} onChange={v => setPeriod(Number(v))} />
      </div>

      {error && data && (
        <div className={styles.partialWarning}>
          <AlertCircle size={14} />
          <span>Bazı veriler güncellenemedi: {error} — <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#92400e', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', padding: 0 }}>Tekrar dene</button></span>
        </div>
      )}

      {loading && data && (
        <div className={styles.partialWarning}>
          <RefreshCw size={14} />
          <span>Veriler güncelleniyor...</span>
        </div>
      )}

      {/* A. Sistem Özeti - KPI Cards */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}><h3>Sistem Özeti</h3></div>
        <div className={styles.kpiGrid}>
          {KPI_DEFS.map(def => {
            const val = kpi[def.key] ?? 0
            const Icon = def.icon
            return (
              <div key={def.key} className={styles.kpiCard}>
                <div className={styles.kpiLabel}>{def.label}</div>
                <div className={styles.kpiValue}>{typeof val === 'number' ? val.toLocaleString() : val}</div>
              </div>
            )
          })}
        </div>
      </section>

      <ReviewerOperations
        data={reviewerData}
        error={reviewerError}
      />

      <div className={styles.col2}>
        {/* B. KO Durum Dağılımı */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}><h3>KO Durum Dağılımı</h3></div>
          <div className={styles.card}>
            {statusDistribution.length === 0 ? (
              <div className={styles.emptySmall}>Veri bulunamadı</div>
            ) : (
              <div className={styles.barChart} role="img" aria-label={`KO durum dağılımı: ${statusDistribution.map(s => `${s.label}: ${s.count}`).join(', ')}`}>
                {statusDistribution.map(s => {
                  const maxVal = Math.max(...statusDistribution.map(x => x.count), 1)
                  const pct = (s.count / maxVal) * 100
                  const Icon = STATUS_ICONS[s.status] || FileText
                  return (
                    <div key={s.status} className={styles.barRow}>
                      <span className={styles.barLabel}><Icon size={12} style={{ marginRight: 4, verticalAlign: -1 }} /> {s.label}</span>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[s.status] || '#6b7280' }} />
                      </div>
                      <span className={styles.barCount}>{s.count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* C. Kategori Dağılımı */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}><h3>Kategori Dağılımı</h3></div>
          <div className={styles.card}>
            {categoryDistribution.length === 0 ? (
              <div className={styles.emptySmall}>Henüz kategori eklenmemiş</div>
            ) : (
              <table className={styles.catTable}>
                <thead>
                  <tr>
                    <th>Kategori</th>
                    <th>Toplam</th>
                    <th>Yayın</th>
                    <th>İnceleme</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryDistribution.map(cat => {
                    const maxTotal = Math.max(...categoryDistribution.map(c => c.total), 1)
                    return (
                      <tr key={cat.name}>
                        <td style={{ fontWeight: 500 }}>{cat.name}</td>
                        <td>{cat.total}</td>
                        <td>
                          <div className={styles.catBar}>
                            <div className={`${styles.catBarFill} ${styles.catBarFillGreen}`} style={{ width: `${(cat.published / maxTotal) * 100}%` }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-light)' }}>{cat.published}</span>
                        </td>
                        <td>
                          <div className={styles.catBar}>
                            <div className={`${styles.catBarFill} ${styles.catBarFillAmber}`} style={{ width: `${(cat.inReview / maxTotal) * 100}%` }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-light)' }}>{cat.inReview}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* D. Son Aktiviteler */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}><h3>Son Aktiviteler</h3></div>
        <div className={styles.col2}>
          <ActivitySection title="Import İşleri" icon={Download} items={recentActivity.imports} renderItem={item => ({
            title: `${item.status === 'completed' ? 'Tamamlandı' : item.status === 'failed' ? 'Başarısız' : 'İşleniyor'} — ${item.totalRows} KO`,
            meta: `ID: ${item.id?.substring(0, 8)}...`,
            time: timeAgo(item.createdAt)
          })} emptyText="Henüz import yapılmamış" />

          <ActivitySection title="Review İşlemleri" icon={Eye} items={recentActivity.reviews} renderItem={item => ({
            title: `${item.koTitle || item.koCode || 'Bilinmeyen KO'} — ${item.status === 'approved' ? 'Onaylandı' : item.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}`,
            meta: `${item.reviewerName}`,
            time: timeAgo(item.createdAt)
          })} emptyText="Henüz review yapılmamış" />

          <ActivitySection title="Yayınlama İşlemleri" icon={ArrowUpRight} items={recentActivity.publications} renderItem={item => ({
            title: `${item.koTitle || item.koCode || 'Bilinmeyen KO'} — ${item.action === 'published' ? 'Yayınlandı' : item.action}`,
            meta: item.performerName,
            time: timeAgo(item.timestamp)
          })} emptyText="Henüz yayınlama yapılmamış" />

          <ActivitySection title="Yeni Kullanıcılar" icon={UserPlus} items={recentActivity.newUsers} renderItem={item => ({
            title: item.name || item.email,
            meta: `Rol: ${({ learner: 'Öğrenci', content_editor: 'Editör', subject_expert: 'Uzman', admin: 'Admin' })[item.role] || item.role}`,
            time: timeAgo(item.createdAt)
          })} emptyText="Henüz kullanıcı yok" />
        </div>
      </section>

      {/* E. Dikkat Gerektirenler */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}><h3>Dikkat Gerektirenler</h3></div>
        <div className={styles.col2}>
          <AlertSection
            title="Gecikmiş Review'ler"
            icon={Clock}
            iconColor="#ef4444"
            items={alerts.overdueReviews}
            variant="danger"
            renderItem={item => `${item.title || item.code || '#' + item.id} — Son: ${shortDate(item.reviewDue)}`}
            emptyText="Gecikmiş review bulunmuyor"
          />

          <AlertSection
            title="Kaynaksız Taslaklar"
            icon={Ban}
            iconColor="#f59e0b"
            items={alerts.draftWithoutSource}
            variant="warning"
            renderItem={item => `${item.title || item.code || '#' + item.id}`}
            emptyText="Tüm taslakların kaynağı var"
          />

          <AlertSection
            title="Yüksek Riskli Bekleyenler"
            icon={AlertCircle}
            iconColor="#f97316"
            items={alerts.pendingHighRisk}
            variant="warning"
            renderItem={item => `${item.title || item.code || '#' + item.id} — Gate: ${item.reviewGate}${item.categoryName ? ` (${item.categoryName})` : ''}`}
            emptyText="Yüksek riskli bekleyen yok"
          />

          <AlertSection
            title="Başarısız Import'lar"
            icon={XCircle}
            iconColor="#ef4444"
            items={alerts.failedImports}
            variant="danger"
            renderItem={item => {
              const firstErr = item.errors?.[0]
              return `${item.id?.substring(0, 8)}... — ${firstErr ? `${firstErr.message?.substring(0, 50)}` : 'Bilinmeyen hata'}`
            }}
            emptyText="Başarısız import yok"
          />
        </div>
      </section>
    </div>
  )
}

function ReviewerOperations({ data, error }) {
  const persistent = data?.persistentMetrics
  const totals = persistent?.totals || {}
  const rates = persistent?.rates || {}
  const latency = persistent?.latencyMs || {}
  const health = data?.health?.ollama || {}
  const queue = data?.health?.queue || data?.queue || {}

  const cards = [
    {
      label: 'Ollama',
      value: health.reachable === true
        ? 'Çevrimiçi'
        : health.reachable === false
          ? 'Erişilemiyor'
          : 'Kontrol ediliyor'
    },
    {
      label: 'Reviewer Modeli',
      value: health.modelAvailable === true
        ? 'Hazır'
        : health.modelAvailable === false
          ? 'Bulunamadı'
          : data?.reviewer?.enabled
            ? 'Bekleniyor'
            : 'Kapalı'
    },
    { label: 'Kalıcı Örnek', value: totals.sampled ?? 0 },
    {
      label: 'Availability',
      value: typeof rates.availability === 'number'
        ? `%${(rates.availability * 100).toFixed(1)}`
        : '-'
    },
    {
      label: 'p95 Gecikme',
      value: typeof latency.p95 === 'number'
        ? `${latency.p95.toLocaleString()} ms`
        : '-'
    },
    {
      label: 'Kuyruk',
      value: `${queue.active ?? 0} aktif / ${queue.pending ?? 0} bekleyen`
    },
    { label: 'Kuyruk Reddi', value: queue.rejected ?? 0 },
    {
      label: 'Pilot Modu',
      value: `${data?.reviewer?.effectiveMode || 'shadow'} · %${((data?.reviewer?.sampleRate || 0) * 100).toFixed(0)}`
    }
  ]

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3>Yerel AI Reviewer Pilot</h3>
      </div>
      {error && (
        <div className={styles.partialWarning}>
          <AlertCircle size={14} />
          <span>Reviewer metrikleri alınamadı: {error}</span>
        </div>
      )}
      <div className={styles.kpiGrid}>
        {cards.map(card => (
          <div key={card.label} className={styles.kpiCard}>
            <div className={styles.kpiLabel}>{card.label}</div>
            <div className={styles.kpiValue}>{card.value}</div>
          </div>
        ))}
      </div>
      <div className={styles.emptySmall}>
        İçerik saklanmaz. Reviewer yalnız shadow modunda gözlem yapar.
      </div>
    </section>
  )
}

function ActivitySection({ title, icon: Icon, items, renderItem, emptyText }) {
  if (!items || items.length === 0) {
    return (
      <div className={styles.card}>
        <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4 }}>{title}</h4>
        <div className={styles.emptySmall}>{emptyText}</div>
      </div>
    )
  }
  return (
    <div className={styles.card}>
      <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4 }}>{title}</h4>
      <div className={styles.activityList}>
        {items.map((item, i) => {
          const r = renderItem(item)
          return (
            <div key={item.id || i} className={styles.activityItem}>
              <div className={styles.activityIcon}><Icon size={16} /></div>
              <div className={styles.activityContent}>
                <div className={styles.activityTitle}>{r.title}</div>
                <div className={styles.activityMeta}>{r.meta}</div>
              </div>
              <span className={styles.activityTime}>{r.time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AlertSection({ title, icon: Icon, iconColor, items, variant, renderItem, emptyText }) {
  if (!items || items.length === 0) {
    return (
      <div className={styles.card}>
        <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4 }}>{title}</h4>
        <div className={styles.emptySmall}>{emptyText}</div>
      </div>
    )
  }
  return (
    <div className={styles.card}>
      <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4 }}>{title} ({items.length})</h4>
      <div className={styles.alertList}>
        {items.map((item, i) => (
          <div key={item.id || i} className={`${styles.alertItem} ${styles[`alert${variant === 'danger' ? 'Danger' : variant === 'warning' ? 'Warning' : 'Info'}`]}`}>
            <div className={styles.alertIcon} style={{ color: iconColor }}><Icon size={16} /></div>
            <div className={styles.alertContent}>
              <div className={styles.alertTitle}>{renderItem(item)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
