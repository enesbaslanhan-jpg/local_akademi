import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight, ChevronRight, RotateCcw, Search, CircleDashed,
  Percent, Truck, Store, Target, UserPlus, Landmark, Wallet,
  Building2, Megaphone, Boxes, PackageSearch, TrendingUp, Scale
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import DarkPanel from '@/components/ui/DarkPanel'
import { Button, PageHead } from '@/components/ui'
import { ContextPanelSlot, useContextPanel } from '@/components/layout/ContextPanel'
import './DecisionCheckList.css'

const STATUS_CONTENT = {
  not_started: {
    labelKey: 'decisions.status.notStarted',
    ctaKey: 'decisions.cta.openTool',
    className: 'not-started'
  },
  in_progress: {
    labelKey: 'decisions.status.inProgress',
    ctaKey: 'decisions.cta.continue',
    className: 'in-progress'
  },
  completed: {
    labelKey: 'decisions.status.completed',
    ctaKey: 'decisions.cta.viewResult',
    className: 'completed'
  }
}

/* Bağlam panelindeki durum süzgeçleri. */
const STATUS_FILTERS = [
  { id: 'all', labelKey: 'decisions.filters.all' },
  { id: 'in_progress', labelKey: 'decisions.filters.active' },
  { id: 'completed', labelKey: 'decisions.filters.done' }
]

/*
 * Kart ikonları araç KODUNDAN türetilir — her araç kendi konusunu anlatan
 * ince çizgili bir Lucide ikonu alır. Kod tanınmazsa nötr terazi ikonu
 * kullanılır; uydurma ikon veya görsel eklenmez.
 */
const TOOL_ICONS = [
  ['PROFIT', TrendingUp],
  ['DISCOUNT', Percent],
  ['FREESHIP', Truck],
  ['MARKETPLACE', Store],
  ['ADS', Target],
  ['HIRE', UserPlus],
  ['LOAN', Landmark],
  ['CASHFLOW', Wallet],
  ['BRANCH', Building2],
  ['CAMPAIGN', Megaphone],
  ['STOCK', Boxes],
  ['CONTINUE', PackageSearch]
]

function iconForCheck(code = '') {
  const match = TOOL_ICONS.find(([key]) => code.toUpperCase().includes(key))
  return match ? match[1] : Scale
}

function normalizeStatus(status) {
  if (status === 'completed' || status === 'complete') return 'completed'
  if (status === 'in_progress' || status === 'started') return 'in_progress'
  return 'not_started'
}

export default function DecisionCheckList() {
  const { t, i18n } = useTranslation('tools')
  const uiLanguage = i18n.resolvedLanguage || i18n.language
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [openingCode, setOpeningCode] = useState(null)
  const [actionError, setActionError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const navigate = useNavigate()

  /* Arama kutusu kabuğun bağlam paneliyle ORTAK. Buradaki cam hap ile
     paneldeki hap aynı değeri yazar; iki ayrı filtre yok. */
  const panel = useContextPanel()
  const query = panel?.query ?? ''
  const setQuery = panel?.setQuery ?? (() => {})

  const loadChecks = useCallback(async () => {
    setLoading(true)
    setLoadError(false)

    try {
      const [response, sessionResponse] = await Promise.all([
        api.decisionChecks.list(),
        api.decisionChecks.listSessions().catch((error) => {
          console.error(error)
          return []
        })
      ])
      const availableChecks = Array.isArray(response) ? response : []
      const sessions = Array.isArray(sessionResponse) ? sessionResponse : []
      const latestSessionByCode = new Map()

      sessions.forEach((session) => {
        if (!latestSessionByCode.has(session.decisionCheckCode)) {
          latestSessionByCode.set(session.decisionCheckCode, session)
        }
      })

      setChecks(availableChecks.map((check) => {
        const session = latestSessionByCode.get(check.code)
        return session
          ? { ...check, status: session.status, sessionId: session.id }
          : check
      }))
    } catch (error) {
      console.error(error)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [uiLanguage])

  useEffect(() => {
    loadChecks()
  }, [loadChecks])

  const openCheck = async (check) => {
    setActionError('')

    if (check.sessionId && normalizeStatus(check.status) !== 'not_started') {
      navigate(`/app/decision-checks/${check.sessionId}`)
      return
    }

    setOpeningCode(check.code)
    try {
      const response = await api.decisionChecks.start(check.code)
      if (response.sessionId) {
        navigate(`/app/decision-checks/${response.sessionId}`)
      }
    } catch (error) {
      console.error(error)
      setActionError(t('decisions.errors.openTool'))
    } finally {
      setOpeningCode(null)
    }
  }

  const visibleChecks = useMemo(() => {
    const locale = i18n.resolvedLanguage || i18n.language
    const needle = query.trim().toLocaleLowerCase(locale)
    return checks.filter((check) => {
      if (statusFilter !== 'all' && normalizeStatus(check.status) !== statusFilter) return false
      if (!needle) return true
      return [check.title, check.category, check.description]
        .filter(Boolean)
        .some(field => field.toLocaleLowerCase(locale).includes(needle))
    })
  }, [checks, query, statusFilter, i18n.language, i18n.resolvedLanguage])

  const statusCounts = useMemo(() => {
    const counts = { all: checks.length, in_progress: 0, completed: 0 }
    checks.forEach((check) => {
      const status = normalizeStatus(check.status)
      if (status in counts) counts[status] += 1
    })
    return counts
  }, [checks])

  const hasChecks = !loading && !loadError && checks.length > 0
  const filtersActive = statusFilter !== 'all' || query.trim().length > 0

  return (
    <main className="decision-list-page">
      {/* Bağlam paneline enjekte edilen alt navigasyon: durum süzgeçleri +
          gerçek araç listesi. Panel yalnızca masaüstünde görünür; mobilde
          süzgeçler sayfanın kendi hap satırında kalır. */}
      <ContextPanelSlot>
        <div className="decision-panel-block">
          <div className="decision-panel-label">{t('decisions.statusLabel')}</div>
          <div className="decision-panel-filters">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`decision-panel-filter${statusFilter === filter.id ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(filter.id)}
                aria-pressed={statusFilter === filter.id}
              >
                <span>{t(filter.labelKey)}</span>
                <span className="decision-panel-count">{statusCounts[filter.id] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {visibleChecks.length > 0 && (
          <div className="decision-panel-block">
            <div className="decision-panel-label">{t('decisions.toolsLabel')}</div>
            <div className="decision-panel-tools">
              {visibleChecks.map((check) => (
                <button
                  key={check.code}
                  type="button"
                  className="decision-panel-tool"
                  onClick={() => openCheck(check)}
                  disabled={openingCode === check.code}
                >
                  {check.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </ContextPanelSlot>

      <div className="decision-list-shell">
        <PageHead title={t('decisions.title')} subtitle={t('decisions.subtitle')} actions={<Button variant="quiet" onClick={() => setStatusFilter('completed')}>{t('decisions.historyButton')}</Button>} />

        <div className="decision-hero-wrap">
          <DarkPanel bevel={false} sweep className="decision-hero">
            <span className="decision-hero-beam" aria-hidden="true" />
            <p className="decision-hero-eyebrow">{t('decisions.heroEyebrow')}</p>
            <p className="decision-hero-title">{t('decisions.heroTitle')}</p>
            <p className="decision-hero-intro">{t('decisions.heroIntro')}</p>
          </DarkPanel>

          {/* Panelin alt kenarından taşan cam arama hapı — yarısı dışarıda. */}
          <div className="decision-hero-search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('decisions.searchPlaceholder')}
              aria-label={t('decisions.searchAria')}
            />
          </div>
        </div>

        {/* Mobilde bağlam paneli yok; süzgeçler burada kalır. */}
        {hasChecks && (
          <div className="decision-filter-row" role="group" aria-label={t('decisions.filterRowAria')}>
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`decision-filter-chip${statusFilter === filter.id ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(filter.id)}
                aria-pressed={statusFilter === filter.id}
              >
                {t(filter.labelKey)}
                <span className="decision-filter-count">{statusCounts[filter.id] ?? 0}</span>
              </button>
            ))}
          </div>
        )}

        {loading && (
          <section className="decision-list-state" aria-live="polite" aria-busy="true">
            <span className="decision-list-spinner" aria-hidden="true" />
            <h2>{t('decisions.loadingTitle')}</h2>
            <p>{t('decisions.loadingText')}</p>
          </section>
        )}

        {!loading && loadError && (
          <section className="decision-list-state decision-list-state-error" role="alert">
            <span className="decision-list-state-icon" aria-hidden="true">!</span>
            <h2>{t('decisions.errorTitle')}</h2>
            <p>{t('decisions.errorText')}</p>
            <button type="button" className="decision-list-retry" onClick={loadChecks}>
              <RotateCcw size={17} aria-hidden="true" />
              {t('decisions.retry')}
            </button>
          </section>
        )}

        {!loading && !loadError && checks.length === 0 && (
          <section className="decision-list-state">
            <span className="decision-list-state-icon" aria-hidden="true">✓</span>
            <h2>{t('decisions.emptyTitle')}</h2>
            <p>{t('decisions.emptyText')}</p>
          </section>
        )}

        {hasChecks && (
          <div className="decision-workspace">
          {/* data-tour: karsilama turu tutunma noktasi (WelcomeTour.jsx) */}
          <section className="decision-list-content" aria-label={t('decisions.contentAria')} data-tour="karar-kartlari">
            <div className="decision-list-summary">
              <div>
                <h2>{t('decisions.suitableTools')}</h2>
                <p>
                  {filtersActive
                    ? t('decisions.showingCount', { shown: visibleChecks.length, total: checks.length })
                    : t('decisions.readyCount', { count: checks.length })}
                </p>
              </div>
            </div>

            {actionError && <p className="decision-list-action-error" role="alert">{actionError}</p>}

            {visibleChecks.length > 1 && !filtersActive && (
              <article className="decision-recommended">
                <div><span>{t('decisions.recommended')}</span><h3>{visibleChecks[0].title}</h3><p>{visibleChecks[0].description}</p></div>
                <Button onClick={() => openCheck(visibleChecks[0])}>{t('decisions.startProcess')} <ArrowRight size={15} /></Button>
              </article>
            )}

            {visibleChecks.length === 0 && (
              <div className="decision-list-state">
                <span className="decision-list-state-icon" aria-hidden="true">
                  <CircleDashed size={22} />
                </span>
                <h2>{t('decisions.noMatchTitle')}</h2>
                <p>{t('decisions.noMatchText')}</p>
              </div>
            )}

            {visibleChecks.length > 0 && (
              <div className="decision-list-grid">
                {visibleChecks.map((check) => {
                  const status = STATUS_CONTENT[normalizeStatus(check.status)]
                  const isOpening = openingCode === check.code
                  const ToolIcon = iconForCheck(check.code)

                  return (
                    <article className="decision-card" key={check.code}>
                      <div className="decision-card-topline">
                        <div className="decision-card-heading">
                          {check.category && (
                            <span className="decision-card-category">{check.category}</span>
                          )}
                          <h3>{check.title}</h3>
                        </div>
                        <ToolIcon
                          className="decision-card-icon"
                          size={58}
                          strokeWidth={1.15}
                          aria-hidden="true"
                        />
                      </div>

                      <p className="decision-card-desc">{check.description}</p>

                      <button
                        type="button"
                        className="decision-card-cta"
                        onClick={() => openCheck(check)}
                        disabled={isOpening}
                      >
                        <span>{isOpening ? t('decisions.opening') : t(status.ctaKey)}</span>
                        <ArrowRight size={18} aria-hidden="true" />
                      </button>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
          <aside className="decision-recent">
            <h2>{t('decisions.recentSessions')}</h2>
            {checks.filter(check => check.sessionId).slice(0, 5).map(check => (
              <button key={check.sessionId} onClick={() => openCheck(check)}>
                <span><strong>{check.title}</strong><small>{normalizeStatus(check.status) === 'completed' ? t('decisions.resultReady') : t('decisions.resumeReady')}</small></span>
                <span>{normalizeStatus(check.status) === 'completed' ? t('decisions.openShort') : t('decisions.resumeShort')}</span><ChevronRight size={14} />
              </button>
            ))}
            {checks.every(check => !check.sessionId) && <p>{t('decisions.noSessions')}</p>}
          </aside>
          </div>
        )}
      </div>
    </main>
  )
}
