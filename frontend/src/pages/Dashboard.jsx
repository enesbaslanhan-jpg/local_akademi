import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import {
  Card, Button, Progress, DarkPanel, Modal, PageHead
} from '@/components/ui'
import FounderBadge from '@/components/billing/FounderBadge'
import DecisionReceipt from '@/components/decision-checks/DecisionReceipt'
import {
  BookOpen, ChevronRight, ArrowRight, AlertCircle,
  Scale, Calculator, Bot, Square, CheckSquare, Store
} from 'lucide-react'
import styles from './Dashboard.module.css'
import { featureFlags } from '@/config/featureFlags'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'
import { formatCurrency } from '@/utils/formatters'
import { marketplaceActionLabel } from '@/utils/marketplaceActionLabels'

function shortDate(dateStr, locale) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

function relativeTime(dateStr, t) {
  if (!dateStr) return t('dashboard:relative.never')
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return t('dashboard:relative.justNow')
  if (minutes < 60) return t('dashboard:relative.minutesAgo', { count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('dashboard:relative.hoursAgo', { count: hours })
  const days = Math.round(hours / 24)
  return t('dashboard:relative.daysAgo', { count: days })
}

/* Öncelik skalası — Düşük yeşil, Orta turuncu, Yüksek bordo. Backend farklı
   etiketler kullanabildiği için savunmacı eşleme yapılır. */
function priorityLevel(raw) {
  const v = String(raw || '').toLowerCase()
  if (['high', 'urgent', 'critical', 'yüksek', 'yuksek'].includes(v)) return 'high'
  if (['low', 'düşük', 'dusuk'].includes(v)) return 'low'
  return 'medium'
}

/* Action engine severity -> mevcut görev rozeti dili. Eşikler backend'de
   MARKETPLACE_ACTION_THRESHOLDS'tadır; UI yalnızca seviyeyi çevirir. */
function severityToPriority(severity) {
  if (severity === 'CRITICAL') return 'high'
  if (severity === 'ATTENTION') return 'medium'
  return 'low'
}

function operationsLink(workspaceId, action) {
  if (!workspaceId || !action?.link) return null
  const query = new URLSearchParams(action.link.query || {}).toString()
  return `/app/workspaces/${workspaceId}/${action.link.page}${query ? `?${query}` : ''}`
}

export default function Dashboard() {
  const { t } = useTranslation('dashboard')
  const { formatLocale } = useLocalization()
  const money = { format: value => formatCurrency(value, { locale: formatLocale, currency: tracker?.currency || 'TRY', maximumFractionDigits: 0 }) }
  const { activeWorkspaceId } = useWorkspace()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [tracker, setTracker] = useState(null)
  const [trackerRecords, setTrackerRecords] = useState([])
  const [operations, setOperations] = useState(null)
  const [decisionRows, setDecisionRows] = useState([])
  const [lastDecision, setLastDecision] = useState(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const summary = await api.dashboard.getSummary()
      if (!mountedRef.current) return
      setData(summary)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || t('dashboard:loadError'))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [t])

  // İşletme takibi özeti — gerçek finansal KPI kaynağı. Aktif işletme yoksa
  // veya endpoint erişilemezse sessizce boş kalır, KPI şeridi boş durum gösterir.
  // Marketplace operations özeti de AYNI ortak endpoint'ten gelir; hata
  // olursa marketplace blokları sessizce gizlenir (dashboard çökmez).
  const fetchTracker = useCallback(async () => {
    if (!activeWorkspaceId) {
      setTracker(null)
      setTrackerRecords([])
      setOperations(null)
      return
    }
    // Özet KPI şeridini, kayıt listesi ise Görevler bloğunu besler. Kayıt
    // listesi öncelik ve son tarih taşıyan tek kaynak olduğu için ayrıca
    // çekilir; erişilemezse Görevler mevcut upcomingTasks'a düşer.
    const [summary, list, ops] = await Promise.all([
      api.workspace.tracker.summary(activeWorkspaceId).catch(() => null),
      api.workspace.tracker.list(activeWorkspaceId, {}).catch(() => null),
      api.marketplace.operations(activeWorkspaceId).catch(() => null)
    ])
    if (!mountedRef.current) return
    setTracker(summary)
    setTrackerRecords(Array.isArray(list?.records) ? list.records : [])
    setOperations(ops)
  }, [activeWorkspaceId])

  // Önerilen karar aracı + son tamamlanan karar sonucu. İkisi de gerçek
  // veriden gelir; uygun kayıt yoksa ilgili kart hiç gösterilmez.
  const fetchDecisions = useCallback(async () => {
    if (!featureFlags.decisionChecks) return
    try {
      const sessions = await api.decisionChecks.listSessions().catch(() => [])
      if (!mountedRef.current) return

      const sessionList = Array.isArray(sessions) ? sessions : []

      const completed = sessionList
        .filter(s => s.status === 'completed' && s.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))

      /* "Son kararlar" paneli birden çok satır gösteriyor. Fiş anlık
         görüntüsü yalnız en sonuncusu için çekiliyor — eskiler satır
         olarak listelenip kendi oturumuna gidiyor, gereksiz istek yok. */
      setDecisionRows(completed.slice(0, 4))
      const latest = completed[0]
      if (!latest) {
        setLastDecision(null)
        return
      }
      const result = await api.decisionChecks.getResult(latest.id).catch(() => null)
      if (!mountedRef.current) return
      setLastDecision(result?.snapshot ? { session: latest, snapshot: result.snapshot } : null)
    } catch {
      if (mountedRef.current) {
        setDecisionRows([])
        setLastDecision(null)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    fetchDecisions()
    return () => { mountedRef.current = false }
  }, [fetchData, fetchDecisions])

  useEffect(() => { fetchTracker() }, [fetchTracker])

  const resume = data?.resumeItem
  const tasks = data?.upcomingTasks || []

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
          <h2>{t('loadError')}</h2>
          <p>{error}</p>
          <Button onClick={fetchData} variant="primary">{t('common:buttons.retry')}</Button>
        </div>
      </div>
    )
  }

  const overdue = tracker?.counts?.overdue ?? 0
  const net = tracker?.nextThirtyDays?.net

  /* ---- Marketplace operations (ortak aggregate servis). Bağlı değilse
     hero ve görev akışı mevcut davranışını AYNEN sürdürür. ---- */
  const mktConnected = Boolean(operations?.summary?.connected)
  const mktActions = Array.isArray(operations?.actions) ? operations.actions : []
  const mktIssues = mktActions.filter(action => action.severity !== 'INFO')
  const mktSummary = operations?.summary ?? null

  /* ---- Görevler: öncelik ve tarih taşıyan tek kaynak tracker kayıtlarıdır.
     Marketplace action'ları AYNI listede aggregate satır olarak birleşir;
     manuel yükümlülükler asla bastırılmaz (önce ilk 3 kayıt, sonra en
     fazla 2 marketplace aksiyonu, toplam 4 satır sınırı kart yüksekliğiyle
     uyumludur). Kayıt yoksa mevcut upcomingTasks'a düşülür. ---- */
  const manualRows = trackerRecords.length > 0
    ? trackerRecords.filter(r => !['completed', 'cancelled'].includes(r.status)).slice(0, 3).map(r => ({
        id: r.id,
        title: r.title,
        done: r.status === 'completed',
        priority: priorityLevel(r.priority),
        date: shortDate(r.dueAt, formatLocale),
        kind: ({ payment: t('workspace:type.payment'), receivable: t('workspace:type.receivable'), promissory_note: t('workspace:type.promissoryNote'), purchase: t('workspace:type.purchase'), shipment: t('workspace:type.shipment'), task: t('workspace:type.task'), deferred: t('workspace:type.deferred'), other: t('workspace:type.other') })[r.type] || t('workspace:type.other'),
        link: null
      }))
    : tasks.slice(0, 3).map(task => ({
        id: task.id,
        title: task.title,
        done: task.status === 'completed',
        priority: null,
        date: shortDate(task.updatedAt || task.createdAt, formatLocale),
        kind: t('dashboard:learning'),
        link: null
      }))
  const mktRows = mktConnected
    ? mktActions.slice(0, 2).map(action => ({
        id: `mkt-${action.type}`,
        title: marketplaceActionLabel(action, t),
        done: false,
        priority: severityToPriority(action.severity),
        date: '',
        kind: action.category || t('marketplace'),
        link: operationsLink(activeWorkspaceId, action)
      }))
    : []
  const taskRows = [...manualRows, ...mktRows].slice(0, 4)

  /* ---- Koyu panelin sol tarafındaki TEK CÜMLELİK durum özeti.
      Tamamen gerçek tracker verisinden kurulur; işletme yoksa panel hiç
      gösterilmediği için cümle de üretilmez. Marketplace riskleri
      BusinessRecord durumuyla BİRLEŞİR — tek başına hero'yu override etmez. ---- */
  let statusSentence = null
  if (tracker) {
    const parts = []
    if (Number.isFinite(Number(net))) {
      parts.push(net < 0
        ? t('dashboard:status.cashDeficit', { amount: money.format(Math.abs(net)) })
        : t('dashboard:status.cashPositive', { amount: money.format(net) }))
    }
    parts.push(overdue > 0
      ? t('dashboard:status.overdueRecords', { count: overdue })
      : t('dashboard:status.noOverdue'))
    let sentence = parts.join(', ') + '.'
    if (mktIssues.length > 0) {
      sentence += ' ' + mktIssues.slice(0, 2).map(action => marketplaceActionLabel(action, t)).join(', ') + '.'
    }
    statusSentence = sentence.charAt(0).toLocaleUpperCase(formatLocale) + sentence.slice(1)
  }

  const totalIssues = overdue + mktIssues.length
  const statusHeadline = tracker
    ? totalIssues > 0
      ? t('dashboard:status.headlineIssues', { count: totalIssues })
      : net < 0
        ? t('dashboard:status.headlinePlanning')
        : t('dashboard:status.headlineBalanced')
    : t('dashboard:status.headlineSetup')
  return (
    <div className={styles.page}>
      <PageHead
        title={t('title')}
        subtitle={t('subtitle')}
        actions={(
          <>
            <Button variant="secondary" onClick={() => navigate('/app/calculations')}><Calculator size={15} /> {t('calculate')}</Button>
            <Button variant="quiet" onClick={() => navigate('/app/mentor')}><Bot size={15} /> {t('askMentor')}</Button>
            <Button onClick={() => navigate('/app/decision-checks')}><Scale size={15} /> {t('makeDecision')}</Button>
          </>
        )}
      />

      <div className={styles.workspaceGrid}>
        {/* data-tour: karsilama turunun tutundugu nokta (WelcomeTour.jsx) */}
        <DarkPanel className={styles.statusPanel} bevel={false} data-tour="dash-durum">
          <div className={styles.statusText}>
            <span className={styles.statusEyebrowSatiri}>
              <span className={styles.statusEyebrow}>{t('today')}</span>
              {/* Kurucu üye değilse hiç çizilmez. */}
              <FounderBadge onDark />
            </span>
            <h2 className={styles.statusHeadline}>{statusHeadline}</h2>
            <p className={styles.statusSentence}>
              {statusSentence || t('contentFallback')}
            </p>
          </div>
          {tracker ? (
            <div className={styles.statusKpis}>
              <div className={styles.statusKpi}>
                <span className={styles.statusKpiLabel}>{t('receivables')}</span>
                <strong className={styles.statusKpiValue}>{money.format(tracker.nextThirtyDays?.receivable ?? 0)}</strong>
                <span className={styles.statusKpiHint}>{t('thirtyDays')}</span>
              </div>
              <div className={styles.statusKpi}>
                <span className={styles.statusKpiLabel}>{t('payments')}</span>
                <strong className={styles.statusKpiValue}>{money.format(tracker.nextThirtyDays?.payable ?? 0)}</strong>
                <span className={styles.statusKpiHint}>{t('thirtyDays')}</span>
              </div>
              <div className={styles.statusKpi}>
                <span className={styles.statusKpiLabel}>{t('netOutlook')}</span>
                <strong className={`${styles.statusKpiValue} ${net < 0 ? styles.kpiRiskDark : ''}`}>{money.format(net ?? 0)}</strong>
                <span className={styles.statusKpiHint}>{net < 0 ? t('planningRequired') : t('positive')}</span>
              </div>
              {/*
                * YÖN BEKLEYENLER.
                *
                * Tahsilat ve Ödeme toplamları yalnız yönü BELLİ kayıtları
                * sayıyor. e-Fatura okunduğunda yön, faturadaki VKN işletmenin
                * vergi numarasıyla eşleşmezse belirsiz kalıyor ve o kayıt
                * hiçbir toplama girmiyordu -- yani tutarı olan bir fatura
                * ekranda hiç görünmüyordu.
                *
                * Borç ya da alacak sayılmıyor (bu bir tahmin olurdu); kendi
                * şeridinde görünüyor. Yalnız kayıt VARSA çiziliyor -- sıfırlı
                * bir kutu her gün yer kaplayıp hiçbir şey söylemezdi.
                */}
              {(tracker.awaitingDirection?.count ?? 0) > 0 && (
                <button
                  type="button"
                  className={`${styles.statusKpi} ${styles.statusKpiAction}`}
                  onClick={() => navigate(`/app/workspaces/${activeWorkspaceId}/tracker`)}
                >
                  <span className={styles.statusKpiLabel}>{t('dashboard:awaitingDirection')}</span>
                  <strong className={styles.statusKpiValue}>{money.format(tracker.awaitingDirection.amount ?? 0)}</strong>
                  <span className={styles.statusKpiHint}>{t('dashboard:awaitingDirectionHint', { count: tracker.awaitingDirection.count })}</span>
                </button>
              )}
            </div>
          ) : (
            <Button variant="secondary" size="sm" className={styles.setupButton} onClick={() => navigate('/app/workspaces')}>
              {t('setupBusiness')} <ArrowRight size={14} />
            </Button>
          )}
        </DarkPanel>

        <Card className={`${styles.operationPanel} ${styles.tasksPanel}`}>
          <div className={styles.panelHead}>
            <h2>{t('nextActions')}</h2>
            {activeWorkspaceId && (
              <button type="button" className={styles.panelLink} onClick={() => navigate(`/app/workspaces/${activeWorkspaceId}/tracker`)}>
                {t('common:buttons.viewAll')}
              </button>
            )}
          </div>
          <div className={styles.rows}>
            {taskRows.length === 0 ? (
              <p className={styles.emptyLine}>{t('noActions')}</p>
            ) : taskRows.map(task => (
              <button
                type="button"
                key={task.id}
                className={`${styles.dataRow} ${task.done ? styles.taskDone : ''}`}
                onClick={() => {
                  if (task.link) navigate(task.link)
                  else if (activeWorkspaceId) navigate(`/app/workspaces/${activeWorkspaceId}/tracker`)
                }}
              >
                <span className={styles.rowLead}>
                  {task.done ? <CheckSquare size={15} aria-hidden="true" /> : <Square size={15} aria-hidden="true" />}
                  <span><strong>{task.title}</strong><small>{task.date || t('dateMissing')}</small></span>
                </span>
                <span className={styles.rowKind}>{task.kind}</span>
                {task.priority ? (
                  <span className={`${styles.prio} ${styles[`prio${task.priority.charAt(0).toUpperCase()}${task.priority.slice(1)}`]}`}>
                    {t(`priority.${task.priority}`)}
                  </span>
                ) : <span className={styles.rowState}>{task.done ? t('dashboard:taskDone') : t('dashboard:taskReady')}</span>}
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        </Card>

        <Card className={`${styles.operationPanel} ${styles.resumePanel}`}>
          <div className={styles.panelHead}><h2>{t('dashboard:resume.title')}</h2></div>
          {resume ? (
            <button type="button" className={styles.resumeContent} onClick={() => navigate('/app/enrollments')}>
              <span className={styles.courseMark} aria-hidden="true"><BookOpen size={25} /><b>LK</b></span>
              <span className={styles.resumeCopy}>
                <small>{t('dashboard:resume.continueLearning')}</small>
                <strong>{resume.courseTitle}</strong>
                <span className={styles.resumeProgressLine}>
                  <Progress value={resume.progress} size="md" variant="primary" />
                  <em>%{resume.progress}</em>
                </span>
                <span className={styles.resumeCta}>{t('dashboard:resume.continueToLesson')} <ArrowRight size={14} /></span>
              </span>
            </button>
          ) : (
            <div className={styles.emptyResume}>
              <span className={styles.courseMark} aria-hidden="true"><BookOpen size={25} /><b>LK</b></span>
              <div><strong>{t('dashboard:resume.newRoute')}</strong><p>{t('dashboard:resume.newRouteHint')}</p></div>
              <Button size="sm" onClick={() => navigate('/app/courses')}>{t('dashboard:resume.goToCourses')}</Button>
            </div>
          )}
        </Card>

        <Card className={`${styles.operationPanel} ${styles.decisionsPanel}`}>
          <div className={styles.panelHead}>
            <h2>{t('dashboard:decisions.title')}</h2>
            <button type="button" className={styles.panelLink} onClick={() => navigate('/app/decision-checks')}>{t('dashboard:decisions.viewAll')}</button>
          </div>
          <div className={styles.rows}>
            {decisionRows.length === 0 ? (
              <p className={styles.emptyLine}>{t('dashboard:decisions.empty')}</p>
            ) : decisionRows.map((session, index) => (
              <button
                type="button"
                key={session.id}
                className={styles.dataRow}
                onClick={() => index === 0 && lastDecision ? setReceiptOpen(true) : navigate(`/app/decision-checks/${session.decisionCheckCode}`)}
              >
                <span className={styles.rowLead}>
                  <Scale size={15} aria-hidden="true" />
                  <span><strong>{session.decisionCheckTitle}</strong><small>{shortDate(session.completedAt, formatLocale)}</small></span>
                </span>
                <span className={styles.rowKind}>{t('dashboard:decisions.decision')}</span>
                <span className={styles.rowState}>{index === 0 && lastDecision ? t('dashboard:decisions.review') : t('dashboard:taskDone')}</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        </Card>

        {/* PAZARYERI ÖZETİ — ortak operations servisinden; ana odağı
            ele geçirmeyen kompakt şerit. Bağlı değilse yalnız ince CTA. */}
        {activeWorkspaceId && (mktConnected ? (
          <Card className={`${styles.operationPanel} ${styles.marketplacePanel}`}>
            <div className={styles.panelHead}>
              <h2>{t('dashboard:marketplacePanel.title')}</h2>
              <span className={styles.mktProviders}>
                {(mktSummary?.providers || []).filter(p => p.status !== 'DISABLED').map(provider => (
                  <span key={provider.provider} className={styles.mktProviderChip}>
                    <Store size={11} aria-hidden="true" />
                    {({ TRENDYOL: 'Trendyol', HEPSIBURADA: 'Hepsiburada', N11: 'N11', SHOPIFY: 'Shopify', AMAZON: 'Amazon', WOOCOMMERCE: 'WooCommerce' })[provider.provider] || provider.provider}
                  </span>
                ))}
              </span>
              <button type="button" className={styles.panelLink} onClick={() => navigate(`/app/workspaces/${activeWorkspaceId}/orders`)}>{t('dashboard:marketplacePanel.orders')}</button>
              <button type="button" className={styles.panelLink} onClick={() => navigate(`/app/workspaces/${activeWorkspaceId}/products`)}>{t('dashboard:marketplacePanel.products')}</button>
            </div>
            {mktSummary?.sync?.hasError && (
              <p className={styles.mktSyncWarning}>{t('marketplacePanel.syncError', { time: relativeTime(mktSummary.sync.lastSyncedAt, t) })}</p>
            )}
            <div className={styles.mktStats}>
              <div><span>{t('dashboard:marketplacePanel.todayOrders')}</span><strong>{mktSummary?.today?.orderCount ?? 0}</strong></div>
              <div><span>{t('dashboard:marketplacePanel.todaySales')}</span><strong>{money.format(mktSummary?.today?.grossSales ?? 0)}</strong></div>
              <div><span>{t('dashboard:marketplacePanel.pendingShipment')}</span><strong>{mktSummary?.today?.pendingShipmentCount ?? 0}</strong></div>
              <div><span>{t('dashboard:marketplacePanel.lowStock')}</span><strong>{mktSummary?.inventory?.lowStockCount ?? 0}</strong></div>
              <div><span>{t('dashboard:marketplacePanel.return')}</span><strong>{(mktSummary?.today?.returnCount ?? 0) + mktActions.filter(a => a.type === 'RETURN_PENDING').reduce((sum, a) => sum + a.count, 0)}</strong></div>
              <div><span>{t('marketplacePanel.lastSync')}</span><small>{relativeTime(mktSummary?.sync?.lastSyncedAt, t)}</small></div>
              {mktSummary?.performance?.bestSeller && (
                <div><span>{t('dashboard:marketplacePanel.bestSeller')}</span><em>{mktSummary.performance.bestSeller.title}</em></div>
              )}
            </div>
          </Card>
        ) : (
          <button type="button" className={styles.marketplaceEmptyCta} onClick={() => navigate('/app/settings?bolum=integrations')}>
            <Store size={13} aria-hidden="true" /> {t('dashboard:marketplacePanel.noConnection')}
          </button>
        ))}
      </div>

      {/* Son Karar Sonucu kartı, sonuç sayfasına gitmek yerine aynı fişi açar. */}
      {lastDecision && (
        <Modal
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          size="md"
          /* Fis kendi kagit yuzeyini tasiyor; modalin zemini fazlaydi. */
          cerceve={false}
        >
          <DecisionReceipt
            snapshot={lastDecision.snapshot}
            title={lastDecision.session.decisionCheckTitle}
            completedAt={lastDecision.session.completedAt}
            sik
          />
        </Modal>
      )}
    </div>
  )
}
