import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import {
  Card, Badge, Button, Progress, DarkPanel, Modal
} from '@/components/ui'
import DecisionReceipt from '@/components/decision-checks/DecisionReceipt'
import {
  BookOpen, ChevronRight, Clock, User,
  CheckCircle, ArrowRight, ListChecks,
  Bookmark, AlertCircle,
  Scale, Calculator, Bot, Newspaper, Info, MessagesSquare,
  Square, CheckSquare, CalendarDays
} from 'lucide-react'
import { PersonalizedFeed } from '@/components/feed/PersonalizedFeed'
import LearningProgressPanel from '@/components/progress/LearningProgressPanel'
import styles from './Dashboard.module.css'
import { featureFlags } from '@/config/featureFlags'

const money = new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency: 'TRY', maximumFractionDigits: 0
})

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} saat önce`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} gün önce`
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function shortDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

/* Öncelik skalası — Düşük yeşil, Orta turuncu, Yüksek bordo. Backend farklı
   etiketler kullanabildiği için savunmacı eşleme yapılır. */
function priorityLevel(raw) {
  const v = String(raw || '').toLowerCase()
  if (['high', 'urgent', 'critical', 'yüksek', 'yuksek'].includes(v)) return 'high'
  if (['low', 'düşük', 'dusuk'].includes(v)) return 'low'
  return 'medium'
}

const PRIORITY_LABEL = { low: 'Düşük', medium: 'Orta', high: 'Yüksek' }

function formatMetricValue(value, format, moneyFmt) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  if (format === 'money') return moneyFmt.format(n)
  if (format === 'percent') return `%${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`
  if (format === 'months') return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ay`
  if (format === 'days') return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} gün`
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })
}

/* Karar fişinin manşeti = kararın kendi dili (`decisionLabel`, ör. "UYGUN").
   Yapılandırılmış araçlar bunu üretir; DC-PROFIT-001 üretmez, o durumda
   riskLevel eşlemesine düşülür. Sonuç sayfasıyla aynı sözlük kullanılır. */
function receiptHeadline(snapshot) {
  const label = snapshot?.calculationOutput?.decisionLabel
  if (label) return label
  const risk = snapshot?.riskLevel
  if (risk === 'low') return 'Güçlü görünüm'
  if (risk === 'medium') return 'Dikkat gerekiyor'
  if (risk === 'high' || risk === 'critical') return 'Zayıf görünüm'
  return null
}

/* Manşetin rengi. Yapılandırılmış araçlarda `decisionTone`, yoksa riskLevel.
   olumlu → zeytin, dikkat → hardal, olumsuz → bordo. */
function receiptToneClass(snapshot) {
  const tone = snapshot?.calculationOutput?.decisionTone
  if (tone === 'good') return 'Good'
  if (tone === 'warning') return 'Warn'
  if (tone === 'bad') return 'Bad'
  const risk = snapshot?.riskLevel
  if (risk === 'low') return 'Good'
  if (risk === 'medium') return 'Warn'
  if (risk === 'high' || risk === 'critical') return 'Bad'
  return null
}

/* İkincil sayısal metrik. Öncelik: `contribution` → adı katkı/net/marj geçen
   ilk metrik → hiçbiri yoksa sayı gösterme.
   `metrics[0]`'a körlemesine düşülmez: bazı araçlarda ilk metrik kullanıcının
   kendi girdiği değerin yankısıdır (ör. indirim aracında "İndirimli fiyat"),
   karar çıktısı değildir. */
const OUTCOME_METRIC_RE = /katkı|net|marj/i

function receiptMetric(snapshot, moneyFmt) {
  const calc = snapshot?.calculationOutput
  if (!calc) return null

  if (Number.isFinite(Number(calc.contribution))) {
    return { label: 'Ürün başına net katkı', value: moneyFmt.format(calc.contribution) }
  }

  const metrics = Array.isArray(calc.metrics) ? calc.metrics : []
  const outcome = metrics.find(m =>
    OUTCOME_METRIC_RE.test(m?.label || '') && Number.isFinite(Number(m?.value))
  )
  if (!outcome) return null

  const value = formatMetricValue(outcome.value, outcome.format, moneyFmt)
  return value ? { label: outcome.label, value } : null
}

/* Manşet altındaki tek satırlık açıklama — kararın kendi özeti. */
function receiptSummary(snapshot) {
  const summary = snapshot?.calculationOutput?.summary
  if (!summary) return null
  return summary.length > 110 ? `${summary.slice(0, 110).trimEnd()}…` : summary
}

export default function Dashboard() {
  const { user } = useAuth()
  const { activeWorkspaceId, activeWorkspace } = useWorkspace()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [tracker, setTracker] = useState(null)
  const [trackerRecords, setTrackerRecords] = useState([])
  const [news, setNews] = useState([])
  const [communityPosts, setCommunityPosts] = useState([])
  const [lastDecision, setLastDecision] = useState(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(false)
  const isFeedEnabled = import.meta.env.VITE_FF_PERSONALIZED_FEED === 'true'
  const isLearningProgressEnabled = import.meta.env.VITE_FF_LEARNING_PROGRESS === 'true'

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const summary = await api.dashboard.getSummary()
      if (!mountedRef.current) return
      setData(summary)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Dashboard yüklenemedi')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  // İşletme takibi özeti — gerçek finansal KPI kaynağı. Aktif işletme yoksa
  // veya endpoint erişilemezse sessizce boş kalır, KPI şeridi boş durum gösterir.
  const fetchTracker = useCallback(async () => {
    if (!activeWorkspaceId) {
      setTracker(null)
      setTrackerRecords([])
      return
    }
    // Özet KPI şeridini, kayıt listesi ise Görevler bloğunu besler. Kayıt
    // listesi öncelik ve son tarih taşıyan tek kaynak olduğu için ayrıca
    // çekilir; erişilemezse Görevler mevcut upcomingTasks'a düşer.
    const [summary, list] = await Promise.all([
      api.workspace.tracker.summary(activeWorkspaceId).catch(() => null),
      api.workspace.tracker.list(activeWorkspaceId, {}).catch(() => null)
    ])
    if (!mountedRef.current) return
    setTracker(summary)
    setTrackerRecords(Array.isArray(list?.records) ? list.records : [])
  }, [activeWorkspaceId])

  // Önerilen karar aracı + son tamamlanan karar sonucu. İkisi de gerçek
  // veriden gelir; uygun kayıt yoksa ilgili kart hiç gösterilmez.
  const fetchDecisions = useCallback(async () => {
    if (!featureFlags.decisionChecks) return
    try {
      const sessions = await api.decisionChecks.listSessions().catch(() => [])
      if (!mountedRef.current) return

      const sessionList = Array.isArray(sessions) ? sessions : []

      const latest = sessionList
        .filter(s => s.status === 'completed' && s.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0]
      if (!latest) {
        setLastDecision(null)
        return
      }
      const result = await api.decisionChecks.getResult(latest.id).catch(() => null)
      if (!mountedRef.current) return
      setLastDecision(result?.snapshot ? { session: latest, snapshot: result.snapshot } : null)
    } catch {
      if (mountedRef.current) {
        setLastDecision(null)
      }
    }
  }, [])

  /* Güncel haberler — yalnızca RESMÎ içerik (Haberler sayfasıyla aynı süzgeç).
     Endpoint `{ posts }` döndürüyor; eskiden okunmayan `items`/`updates`
     anahtarları yüzünden liste hep boş kalıyordu. */
  const fetchNews = useCallback(async () => {
    try {
      const [result, communityResult] = await Promise.all([
        api.community?.list?.('official'),
        Promise.resolve(api.community?.list?.('user')).catch(() => null)
      ])
      if (!mountedRef.current) return
      const items = Array.isArray(result) ? result : (result?.posts || [])
      const communityItems = Array.isArray(communityResult)
        ? communityResult
        : (communityResult?.posts || [])
      setNews(items.slice(0, 4))
      setCommunityPosts(communityItems.slice(0, 3))
    } catch {
      if (mountedRef.current) {
        setNews([])
        setCommunityPosts([])
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    fetchNews()
    fetchDecisions()
    return () => { mountedRef.current = false }
  }, [fetchData, fetchNews, fetchDecisions])

  useEffect(() => { fetchTracker() }, [fetchTracker])

  const enrollments = data?.enrollments || []
  const activeCount = enrollments.filter(e => e.status === 'in_progress').length
  const completedCount = enrollments.filter(e => e.status === 'completed').length

  const resume = data?.resumeItem
  const tasks = data?.upcomingTasks || []
  const quizResult = featureFlags.legacyQuiz ? data?.recentQuizResult : null
  const mentorSession = data?.recentMentorSession
  const courseActivity = data?.recentCourseActivity

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skelLine} style={{ width: '60%' }} />
              <div className={styles.skelLine} />
            </div>
          ))}
          <div className={styles.skeletonCardCol2}>
            <div className={styles.skelLine} style={{ width: '40%' }} />
            <div className={styles.skelLine} style={{ width: '80%' }} />
            <div className={styles.skelLine} style={{ width: '60%' }} />
          </div>
          <div className={styles.skeletonCardCol2}>
            <div className={styles.skelLine} style={{ width: '40%' }} />
            <div className={styles.skelLine} style={{ width: '80%' }} />
            <div className={styles.skelLine} style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <AlertCircle size={44} className={styles.errorIcon} />
          <h2>Ana sayfa yüklenemedi</h2>
          <p>{error}</p>
          <Button onClick={fetchData} variant="primary">Tekrar Dene</Button>
        </div>
      </div>
    )
  }

  const overdue = tracker?.counts?.overdue ?? 0
  const net = tracker?.nextThirtyDays?.net

  /* ---- Görevler: öncelik ve tarih taşıyan tek kaynak tracker kayıtlarıdır.
     Kayıt yoksa mevcut upcomingTasks'a düşülür (o kaynakta öncelik alanı
     olmadığı için rozet gösterilmez). ---- */
  const taskRows = trackerRecords.length > 0
    ? trackerRecords.slice(0, 5).map(r => ({
        id: r.id,
        title: r.title,
        done: r.status === 'completed',
        priority: priorityLevel(r.priority),
        date: shortDate(r.dueAt)
      }))
    : tasks.map(t => ({
        id: t.id,
        title: t.title,
        done: t.status === 'completed',
        priority: null,
        date: shortDate(t.updatedAt || t.createdAt)
      }))

  const taskCounts = trackerRecords.length > 0
    ? {
        done: trackerRecords.filter(r => r.status === 'completed').length,
        open: trackerRecords.filter(r => !['completed', 'cancelled'].includes(r.status)).length,
        high: trackerRecords.filter(r =>
          priorityLevel(r.priority) === 'high' && !['completed', 'cancelled'].includes(r.status)
        ).length
      }
    : null

  /* ---- Koyu panelin sol tarafındaki TEK CÜMLELİK durum özeti.
     Tamamen gerçek tracker verisinden kurulur; işletme yoksa panel hiç
     gösterilmediği için cümle de üretilmez. ---- */
  let statusSentence = null
  if (tracker) {
    const parts = []
    if (Number.isFinite(Number(net))) {
      parts.push(net < 0
        ? `önümüzdeki 30 günde ${money.format(Math.abs(net))} nakit açığın görünüyor`
        : `önümüzdeki 30 günde ${money.format(net)} net nakit girişin görünüyor`)
    }
    parts.push(overdue > 0
      ? `${overdue} kayıt gecikmiş durumda`
      : 'geciken kaydın yok')
    const sentence = parts.join(', ') + '.'
    statusSentence = sentence.charAt(0).toLocaleUpperCase('tr') + sentence.slice(1)
  }

  /* Karşılamanın sağındaki tarih. Backend'de tarihe göre filtrelenen bir
     özet olmadığı için burada SEÇİCİ değil, bugünün tarihi yazıyor —
     çalışmayan bir kontrol koymamak için. */
  const todayLabel = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  /* Üç aksiyon kartı. Turuncu YALNIZCA "Karar Ver"de. */
  const actionCards = [
    {
      id: 'decide', label: 'Karar Ver', icon: Scale, path: '/app/decision-checks', cta: true,
      desc: 'İndirim, kredi, personel ya da stok kararını vermeden önce rakamları kontrol et.'
    },
    {
      id: 'calc', label: 'Hesapla', icon: Calculator, path: '/app/tools', cta: false,
      desc: 'Kâr, başabaş, nakit ve maliyet hesaplarını hazır formüllerle tek yerde yap.'
    },
    {
      id: 'mentor', label: "Mentor'a Sor", icon: Bot, path: '/app/mentor', cta: false,
      desc: mentorSession
        ? `Son konuşman ${timeAgo(mentorSession.createdAt)}. Kaldığın yerden devam et.`
        : 'İşletmenle ilgili takıldığın konuyu AI Mentor’a sor, adım adım ilerle.'
    }
  ]

  const receiptHead = lastDecision ? receiptHeadline(lastDecision.snapshot) : null
  const receiptToneCls = lastDecision ? receiptToneClass(lastDecision.snapshot) : null
  const receiptSub = lastDecision ? receiptSummary(lastDecision.snapshot) : null
  const receipt = lastDecision ? receiptMetric(lastDecision.snapshot, money) : null

  return (
    <div className={styles.page}>
      {/* Karşılama */}
      <section className={styles.hero} aria-label="Karşılama">
        <div>
          <h2 className={styles.heroTitle}>
            Hoş geldin, {data?.user?.name || user?.name || 'Kullanıcı'}
            {activeWorkspace?.name && <span className={styles.heroBusiness}> — {activeWorkspace.name}</span>}
          </h2>
          <p className={styles.heroSub}>
            {activeCount > 0
              ? `${activeCount} aktif kursun var. Kaldığın yerden devam edebilirsin.`
              : completedCount > 0
                ? 'Kurslarını tamamladın. Yeni içeriklere göz atabilirsin.'
                : 'Başlamak için kurslara veya karar araçlarına göz atabilirsin.'}
          </p>
        </div>
        {/* Sağda tarih. Tarihe göre filtreleyen bir özet endpoint'i olmadığı
            için çalışmayan bir seçici yerine bugünün tarihi yazıyor. */}
        <div className={styles.dateChip}>
          <CalendarDays size={15} aria-hidden="true" />
          <span>{todayLabel}</span>
        </div>
      </section>

      {/* KOYU PANEL 1/3 — Bugünkü İşletme Durumu.
          Solda gerçek veriden türetilmiş tek cümle, sağda yan yana KPI'lar.
          Gelir/Gider/Kâr Marjı/Risk Skoru backend'de YOK; buradaki beş
          gösterge tracker özetinin gerçek alanlarıdır.
          İşletme yoksa panel hiç gösterilmez. */}
      {tracker ? (
        <DarkPanel className={styles.statusPanel} bevel={false} sweep>
          <div className={styles.statusText}>
            <span className={styles.statusEyebrow}>Bugünkü İşletme Durumu</span>
            {statusSentence && <p className={styles.statusSentence}>{statusSentence}</p>}
          </div>
          <div className={styles.statusKpis}>
            <div className={styles.statusKpi}>
              <span className={styles.statusKpiLabel}>Alacaklar</span>
              <span className={`${styles.statusKpiValue} ${styles.kpiGoodDark}`}>
                {money.format(tracker.nextThirtyDays?.receivable ?? 0)}
              </span>
              <span className={styles.statusKpiHint}>30 gün</span>
            </div>
            <div className={styles.statusKpi}>
              <span className={styles.statusKpiLabel}>Borçlar</span>
              <span className={styles.statusKpiValue}>
                {money.format(tracker.nextThirtyDays?.payable ?? 0)}
              </span>
              <span className={styles.statusKpiHint}>30 gün</span>
            </div>
            <div className={styles.statusKpi}>
              <span className={styles.statusKpiLabel}>Net Durum</span>
              <span className={`${styles.statusKpiValue} ${net < 0 ? styles.kpiRiskDark : styles.kpiGoodDark}`}>
                {money.format(net ?? 0)}
              </span>
              <span className={styles.statusKpiHint}>Alacak − borç</span>
            </div>
            <div className={styles.statusKpi}>
              <span className={styles.statusKpiLabel}>Geciken</span>
              <span className={`${styles.statusKpiValue} ${overdue > 0 ? styles.kpiRiskDark : ''}`}>{overdue}</span>
              <span className={styles.statusKpiHint}>{overdue > 0 ? 'İlgilenilmeli' : 'Gecikme yok'}</span>
            </div>
            <div className={styles.statusKpi}>
              <span className={styles.statusKpiLabel}>Açık Kayıt</span>
              <span className={styles.statusKpiValue}>{tracker.counts?.open ?? 0}</span>
              <span className={styles.statusKpiHint}>Takipte</span>
            </div>
          </div>
        </DarkPanel>
      ) : (
        <DarkPanel className={`${styles.statusPanel} ${styles.statusPanelEmpty}`} bevel={false} sweep>
          <div className={styles.statusText}>
            <span className={styles.statusEyebrow}>Bugünkü İşletme Durumu</span>
            <p className={styles.statusSentence}>İşletme verilerinizi tek ekranda görmek için ilk işletme profilinizi oluşturun.</p>
          </div>
          <Button variant="cta" size="sm" onClick={() => navigate('/app/workspaces')}>
            İşletmeyi Kur <ArrowRight size={14} />
          </Button>
        </DarkPanel>
      )}

      {/* Üç aksiyon kartı — turuncu YALNIZCA "Karar Ver"de, diğerleri teal. */}
      <section className={styles.actionGrid} aria-label="Hızlı aksiyonlar">
        {actionCards.map(item => {
          const Icon = item.icon
          return (
            <Card key={item.id} className={styles.actionCard} sweep>
              <div className={styles.actionIcon}><Icon size={26} strokeWidth={1.4} aria-hidden="true" /></div>
              <h3 className={styles.actionTitle}>{item.label}</h3>
              <p className={styles.actionDesc}>{item.desc}</p>
              <Button
                variant={item.cta ? 'cta' : 'primary'}
                size="sm"
                full
                onClick={() => navigate(item.path)}
              >
                {item.label} <ArrowRight size={14} />
              </Button>
            </Card>
          )
        })}
      </section>

      {isFeedEnabled ? (
        <>
          <PersonalizedFeed resumeItem={resume} />
          {isLearningProgressEnabled && (
            <div style={{ marginTop: '1.5rem' }}>
              <LearningProgressPanel />
            </div>
          )}
        </>
      ) : (
        <>
        <div className={styles.mainGrid}>

          {/* ---------- SOL KOLON ---------- */}
          <div className={styles.col}>

            {/* Kaldığın yerden devam et */}
            {resume && (
              <section aria-label="Kaldığın yerden devam et" className={styles.section}>
                <h3 className={styles.sectionTitle}><Bookmark size={16} /> Kaldığın Yerden Devam Et</h3>
                <Card className={styles.resumeCard} hoverable onClick={() => navigate('/app/enrollments')}>
                  <div className={styles.resumeInfo}>
                    <div className={styles.resumeTitle}>{resume.courseTitle}</div>
                    <div className={styles.resumeMeta}>
                      <span>%{resume.progress} tamamlandı</span>
                      <span>•</span>
                      <span>Son erişim: {timeAgo(resume.updatedAt)}</span>
                    </div>
                    <Progress value={resume.progress} size="md" variant="primary" />
                  </div>
                  <div className={styles.resumeAction}>
                    <Button variant="outline" size="sm" ariaLabel="Devam et">
                      Devam Et <ChevronRight size={14} />
                    </Button>
                  </div>
                </Card>
              </section>
            )}

            {/* Görevler */}
            <section aria-label="Bugünkü görevler" className={styles.section}>
              <h3 className={styles.sectionTitle}><ListChecks size={16} /> Bugünkü Görevler</h3>
              <Card className={styles.listCard}>
                {taskCounts && (
                  <div className={styles.taskStatusRow}>
                    <Badge variant="success">{taskCounts.done} tamamlandı</Badge>
                    <Badge variant="info">{taskCounts.open} bekliyor</Badge>
                    {taskCounts.high > 0 && (
                      <Badge variant="danger">{taskCounts.high} yüksek öncelik</Badge>
                    )}
                  </div>
                )}
                {taskRows.length === 0 ? (
                  <p className={styles.emptyLine}>Yaklaşan görev yok.</p>
                ) : taskRows.map(t => (
                  <div key={t.id} className={`${styles.taskRow} ${t.done ? styles.taskDone : ''}`}>
                    <div className={styles.taskMain}>
                      {t.done
                        ? <CheckSquare size={15} className={`${styles.taskCheck} ${styles.taskCheckDone}`} aria-hidden="true" />
                        : <Square size={15} className={styles.taskCheck} aria-hidden="true" />}
                      <div className={styles.taskInfo}>
                        <span className={styles.taskTitle}>{t.title}</span>
                      </div>
                    </div>
                    <div className={styles.taskSide}>
                      {t.date && <span className={styles.taskDate}>{t.date}</span>}
                      {t.priority && (
                        <span className={`${styles.prio} ${styles[`prio${t.priority.charAt(0).toUpperCase()}${t.priority.slice(1)}`]}`}>
                          {PRIORITY_LABEL[t.priority]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          </div>

          {/* ---------- ORTA KOLON ---------- */}
          <div className={styles.col}>

            {/* Güncel haberler — veri modelinde görsel alanı olmadığı için
                satırlarda thumbnail YOK. */}
            <section aria-label="Güncel haberler" className={styles.section}>
              <div className={styles.sectionHead}>
                <h3 className={styles.sectionTitle}><Newspaper size={16} /> Güncel Haberler</h3>
                <button type="button" className={styles.seeAll} onClick={() => navigate('/app/community')}>
                  Tümünü gör
                </button>
              </div>
              <Card className={styles.listCard}>
                {news.length === 0 ? (
                  <p className={styles.emptyLine}>Şu an gösterilecek haber yok.</p>
                ) : news.map((item, i) => (
                  <div
                    key={item.id || i}
                    className={styles.newsRow}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/app/community')}
                    onKeyDown={e => { if (e.key === 'Enter') navigate('/app/community') }}
                  >
                    <div className={styles.newsTop}>
                      {/* Veri modelinde kategori alanı yok; rozet yerine
                          gerçek kaynak kurum adı gösteriliyor. */}
                      {item.sourceTitle && <span className={styles.newsCategory}>{item.sourceTitle}</span>}
                      <span className={styles.newsTime}>{timeAgo(item.publishedAt || item.createdAt)}</span>
                    </div>
                    <span className={styles.newsTitle}>{item.title || item.headline || 'Güncelleme'}</span>
                  </div>
                ))}
              </Card>
            </section>

            {communityPosts.length > 0 && (
              <section aria-label="Topluluktan" className={styles.section}>
                <div className={styles.sectionHead}>
                  <h3 className={styles.sectionTitle}><MessagesSquare size={16} /> Topluluktan</h3>
                  <button type="button" className={styles.seeAll} onClick={() => navigate('/app/community/topluluk')}>
                    Akışa git
                  </button>
                </div>
                <Card className={styles.listCard}>
                  {communityPosts.map((post, index) => (
                    <button
                      type="button"
                      key={post.id || index}
                      className={styles.communityRow}
                      onClick={() => navigate('/app/community/topluluk')}
                    >
                      <span className={styles.communityAvatar} aria-hidden="true">
                        {(post.author?.name || post.authorName || 'T').charAt(0).toLocaleUpperCase('tr-TR')}
                      </span>
                      <span className={styles.communityCopy}>
                        <strong>{post.title || 'Topluluk paylaşımı'}</strong>
                        <small>{post.author?.name || post.authorName || 'Topluluk'} · {timeAgo(post.createdAt)}</small>
                      </span>
                    </button>
                  ))}
                </Card>
              </section>
            )}
          </div>

          {/* ---------- SAĞ KOLON ---------- */}
          <div className={styles.col}>

            {/* KOYU PANEL 3/3 — Son Karar Sonucu (fiş). Paket 5'te aynen
                korundu. Tamamlanmış oturum yoksa kart hiç gösterilmez. */}
            {lastDecision && receiptHead && (
              <section aria-label="Son karar sonucu" className={styles.section}>
                <h3 className={styles.sectionTitle}><Scale size={16} /> Son Karar Sonucu</h3>
                <DarkPanel
                  className={styles.receipt}
                  sweep
                  onClick={() => setReceiptOpen(true)}
                >
                  <div className={styles.receiptTop}>
                    <Scale size={14} aria-hidden="true" />
                    <span className={styles.receiptLabel}>Karar Fişi</span>
                  </div>
                  {/* Manşet = kararın kendi dili (decisionLabel), sonuç sayfasıyla
                      aynı sözlük. Rengi decisionTone/riskLevel'dan gelir; ayrıca
                      rozet tekrarlanmaz. */}
                  <span className={`${styles.receiptHeadline} ${receiptToneCls ? styles[`receiptHeadline${receiptToneCls}`] : ''}`}>
                    {receiptHead}
                  </span>
                  {receiptSub && <p className={styles.receiptSummary}>{receiptSub}</p>}
                  {receipt && (
                    <div className={styles.receiptMetricRow}>
                      <span className={styles.receiptMetricLabel}>{receipt.label}</span>
                      <span className={styles.receiptMetricValue}>{receipt.value}</span>
                    </div>
                  )}
                  <div className={styles.receiptFoot}>
                    <span className={styles.receiptDate}>
                      {shortDate(lastDecision.session.completedAt)}
                    </span>
                  </div>
                  <span className={styles.receiptEdge} aria-hidden="true" />
                </DarkPanel>
              </section>
            )}
          </div>
        </div>

        {(quizResult || mentorSession || courseActivity) && (
          <section aria-label="Son aktiviteler" className={`${styles.section} ${styles.activitySection}`}>
            <h3 className={styles.sectionTitle}><Clock size={16} /> Son Aktiviteler</h3>
            <Card className={styles.activityStrip}>
              {quizResult && <div className={styles.activityRow}><div className={styles.activityIcon}>{quizResult.passed ? <CheckCircle size={15} /> : <Clock size={15} />}</div><div className={styles.activityInfo}><span className={styles.activityTitle}>Quiz Sonucu: %{quizResult.score}</span><span className={styles.activityDate}>{timeAgo(quizResult.createdAt)}</span></div></div>}
              {mentorSession && <div className={styles.activityRow}><div className={styles.activityIcon}><User size={15} /></div><div className={styles.activityInfo}><span className={styles.activityTitle}>AI Mentor Konuşması</span><span className={styles.activityDate}>{timeAgo(mentorSession.createdAt)}</span></div></div>}
              {courseActivity && <div className={styles.activityRow}><div className={styles.activityIcon}><BookOpen size={15} /></div><div className={styles.activityInfo}><span className={styles.activityTitle}>{courseActivity.title}</span><span className={styles.activityDate}>{timeAgo(courseActivity.createdAt)}</span></div></div>}
            </Card>
          </section>
        )}
        </>
      )}

      {/* Son Karar Sonucu kartı, sonuç sayfasına gitmek yerine aynı fişi açar. */}
      {lastDecision && (
        <Modal
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          size="md"
        >
          <DecisionReceipt
            snapshot={lastDecision.snapshot}
            title={lastDecision.session.decisionCheckTitle}
            completedAt={lastDecision.session.completedAt}
          />
        </Modal>
      )}
    </div>
  )
}
