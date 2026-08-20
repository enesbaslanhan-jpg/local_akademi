import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
    label: 'Başlanmadı',
    cta: 'Aracı Aç',
    className: 'not-started'
  },
  in_progress: {
    label: 'Devam ediyor',
    cta: 'Devam Et',
    className: 'in-progress'
  },
  completed: {
    label: 'Tamamlandı',
    cta: 'Sonucu Gör',
    className: 'completed'
  }
}

/* Bağlam panelindeki durum süzgeçleri. */
const STATUS_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'in_progress', label: 'Devam eden' },
  { id: 'completed', label: 'Tamamlanan' }
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
  }, [])

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
      setActionError('Araç şu anda açılamadı. Lütfen tekrar deneyin.')
    } finally {
      setOpeningCode(null)
    }
  }

  const visibleChecks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr')
    return checks.filter((check) => {
      if (statusFilter !== 'all' && normalizeStatus(check.status) !== statusFilter) return false
      if (!needle) return true
      return [check.title, check.category, check.description]
        .filter(Boolean)
        .some(field => field.toLocaleLowerCase('tr').includes(needle))
    })
  }, [checks, query, statusFilter])

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
          <div className="decision-panel-label">Durum</div>
          <div className="decision-panel-filters">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`decision-panel-filter${statusFilter === filter.id ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(filter.id)}
                aria-pressed={statusFilter === filter.id}
              >
                <span>{filter.label}</span>
                <span className="decision-panel-count">{statusCounts[filter.id] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {visibleChecks.length > 0 && (
          <div className="decision-panel-block">
            <div className="decision-panel-label">Araçlar</div>
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
        <PageHead title="Karar Araçları" subtitle="Doğru karar yöntemini seç." actions={<Button variant="quiet" onClick={() => setStatusFilter('completed')}>Geçmiş kararlar</Button>} />

        <div className="decision-hero-wrap">
          <DarkPanel bevel={false} sweep className="decision-hero">
            <span className="decision-hero-beam" aria-hidden="true" />
            <p className="decision-hero-eyebrow">Karar öncesi kontrol</p>
            <p className="decision-hero-title">Karar vermeden önce rakamlara bakın</p>
            <p className="decision-hero-intro">
              Önemli iş kararlarını vermeden önce temel riskleri, maliyetleri ve sonraki adımları hızlıca kontrol edin.
            </p>
          </DarkPanel>

          {/* Panelin alt kenarından taşan cam arama hapı — yarısı dışarıda. */}
          <div className="decision-hero-search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Araç ara"
              aria-label="Karar araçlarında ara"
            />
          </div>
        </div>

        {/* Mobilde bağlam paneli yok; süzgeçler burada kalır. */}
        {hasChecks && (
          <div className="decision-filter-row" role="group" aria-label="Durum süzgeci">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`decision-filter-chip${statusFilter === filter.id ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(filter.id)}
                aria-pressed={statusFilter === filter.id}
              >
                {filter.label}
                <span className="decision-filter-count">{statusCounts[filter.id] ?? 0}</span>
              </button>
            ))}
          </div>
        )}

        {loading && (
          <section className="decision-list-state" aria-live="polite" aria-busy="true">
            <span className="decision-list-spinner" aria-hidden="true" />
            <h2>Araçlar hazırlanıyor</h2>
            <p>Karar kontrolleriniz yükleniyor.</p>
          </section>
        )}

        {!loading && loadError && (
          <section className="decision-list-state decision-list-state-error" role="alert">
            <span className="decision-list-state-icon" aria-hidden="true">!</span>
            <h2>Araçlar yüklenemedi</h2>
            <p>Bağlantınızı kontrol edip yeniden deneyin.</p>
            <button type="button" className="decision-list-retry" onClick={loadChecks}>
              <RotateCcw size={17} aria-hidden="true" />
              Yeniden dene
            </button>
          </section>
        )}

        {!loading && !loadError && checks.length === 0 && (
          <section className="decision-list-state">
            <span className="decision-list-state-icon" aria-hidden="true">✓</span>
            <h2>Henüz araç bulunmuyor</h2>
            <p>Yayınlanan yeni karar araçları burada görünecek.</p>
          </section>
        )}

        {hasChecks && (
          <div className="decision-workspace">
          {/* data-tour: karsilama turu tutunma noktasi (WelcomeTour.jsx) */}
          <section className="decision-list-content" aria-label="Karar araçları" data-tour="karar-kartlari">
            <div className="decision-list-summary">
              <div>
                <h2>İşinize uygun araçlar</h2>
                <p>
                  {filtersActive
                    ? `${visibleChecks.length} / ${checks.length} araç gösteriliyor.`
                    : `${checks.length} karar aracı kullanıma hazır.`}
                </p>
              </div>
            </div>

            {actionError && <p className="decision-list-action-error" role="alert">{actionError}</p>}

            {visibleChecks.length > 1 && !filtersActive && (
              <article className="decision-recommended">
                <div><span>Bağlamınıza göre önerilen</span><h3>{visibleChecks[0].title}</h3><p>{visibleChecks[0].description}</p></div>
                <Button onClick={() => openCheck(visibleChecks[0])}>Karar sürecini başlat <ArrowRight size={15} /></Button>
              </article>
            )}

            {visibleChecks.length === 0 && (
              <div className="decision-list-state">
                <span className="decision-list-state-icon" aria-hidden="true">
                  <CircleDashed size={22} />
                </span>
                <h2>Bu süzgece uyan araç yok</h2>
                <p>Aramayı temizleyin veya başka bir durum seçin.</p>
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
                        <span>{isOpening ? 'Açılıyor…' : status.cta}</span>
                        <ArrowRight size={18} aria-hidden="true" />
                      </button>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
          <aside className="decision-recent">
            <h2>Son oturumlar</h2>
            {checks.filter(check => check.sessionId).slice(0, 5).map(check => (
              <button key={check.sessionId} onClick={() => openCheck(check)}>
                <span><strong>{check.title}</strong><small>{normalizeStatus(check.status) === 'completed' ? 'Sonuç hazır' : 'Sürdürmeye hazır'}</small></span>
                <span>{normalizeStatus(check.status) === 'completed' ? 'Aç' : 'Sürdür'}</span><ChevronRight size={14} />
              </button>
            ))}
            {checks.every(check => !check.sessionId) && <p>Henüz bir karar oturumu yok.</p>}
          </aside>
          </div>
        )}
      </div>
    </main>
  )
}
