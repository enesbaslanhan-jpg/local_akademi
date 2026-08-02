import React, { useCallback, useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
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
  const navigate = useNavigate()

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

  return (
    <main className="decision-list-page">
      <div className="decision-list-shell">
        <header className="decision-list-header">
          <p className="decision-list-eyebrow">Karar araçları</p>
          <h1>Karar Kontrolleri</h1>
          <p className="decision-list-intro">
            Önemli iş kararlarını vermeden önce temel riskleri, maliyetleri ve sonraki adımları hızlıca kontrol edin.
          </p>
        </header>

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
            <p>Yayınlanan yeni karar kontrolleri burada görünecek.</p>
          </section>
        )}

        {!loading && !loadError && checks.length > 0 && (
          <section className="decision-list-content" aria-label="Karar kontrolü araçları">
            <div className="decision-list-summary">
              <div>
                <h2>İşinize uygun araçlar</h2>
                <p>{checks.length} karar kontrolü kullanıma hazır.</p>
              </div>
            </div>

            {actionError && <p className="decision-list-action-error" role="alert">{actionError}</p>}

            <div className="decision-list-grid">
              {checks.map((check) => {
                const status = STATUS_CONTENT[normalizeStatus(check.status)]
                const isOpening = openingCode === check.code

                return (
                  <article className="decision-card" key={check.code}>
                    <div className="decision-card-topline">
                      <span className="decision-card-category">{check.category || 'Genel'}</span>
                      <span className={`decision-card-status decision-card-status-${status.className}`}>
                        {status.className === 'completed' ? (
                          <CheckCircle2 size={15} aria-hidden="true" />
                        ) : (
                          <Clock3 size={15} aria-hidden="true" />
                        )}
                        {status.label}
                      </span>
                    </div>

                    <div className="decision-card-copy">
                      <h3>{check.title}</h3>
                      <p>{check.description}</p>
                    </div>

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
          </section>
        )}
      </div>
    </main>
  )
}
