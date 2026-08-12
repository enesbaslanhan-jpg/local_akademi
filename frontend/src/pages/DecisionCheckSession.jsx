import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useMentorContext } from '@/context/MentorContext'
import { MessageSquare, RotateCcw } from 'lucide-react'
import ProfitabilityDecisionTool from '@/components/decision-checks/ProfitabilityDecisionTool'
import StructuredDecisionTool from '@/components/decision-checks/StructuredDecisionTool'
import './DecisionCheckSession.css'
import styles from './DecisionCheckSession.module.css'

export default function DecisionCheckSession() {
  const { code: routeIdentifier } = useParams()
  const navigate = useNavigate()
  
  const [session, setSession] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({})
  const [unknowns, setUnknowns] = useState({})
  const [recalculating, setRecalculating] = useState(false)
  const [recalculateError, setRecalculateError] = useState('')

  const handleRecalculate = async () => {
    if (!session?.decisionCheckCode) return
    setRecalculateError('')
    setRecalculating(true)
    try {
      const response = await api.decisionChecks.start(session.decisionCheckCode)
      if (response?.sessionId) {
        navigate(`/app/decision-checks/${response.sessionId}`)
      }
    } catch (err) {
      setRecalculateError('Yeni hesaplama başlatılamadı. Lütfen tekrar deneyin.')
    } finally {
      setRecalculating(false)
    }
  }

  const mentorContext = useMentorContext()
  const isContextualMentorEnabled = import.meta.env.VITE_FF_CONTEXTUAL_MENTOR === 'true'

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true)
      setLoadError('')
      try {
        let sessionId = routeIdentifier
        if (routeIdentifier?.startsWith('DC-')) {
          const started = await api.decisionChecks.start(routeIdentifier)
          sessionId = started.sessionId
        }

        const res = await api.decisionChecks.getSession(sessionId)
        setSession(res)
        
        if (res.status === 'completed') {
          const resultRes = await api.decisionChecks.getResult(sessionId)
          setResult(resultRes)
        } else {
          // Populate initial data
          const initialForm = {}
          const initialUnk = {}
          res.answers.forEach(a => {
            initialForm[a.questionCode] = a.valueJson
            initialUnk[a.questionCode] = a.isUnknown
          })
          setFormData(initialForm)
          setUnknowns(initialUnk)
        }

        if (routeIdentifier !== sessionId) {
          navigate(`/app/decision-checks/${sessionId}`, { replace: true })
        }
      } catch (err) {
        console.error(err)
        setLoadError('Karar aracı yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.')
      } finally {
        setLoading(false)
      }
    }
    fetchSession()
  }, [routeIdentifier, loadAttempt, navigate])

  const handleInputChange = async (questionCode, value) => {
    setFormData(prev => ({ ...prev, [questionCode]: value }))
    // Optimistic sync
    try {
      await api.decisionChecks.saveAnswer(session.id, {
        questionCode,
        value,
        isUnknown: unknowns[questionCode] || false
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleUnknownToggle = async (questionCode, isUnknown) => {
    setUnknowns(prev => ({ ...prev, [questionCode]: isUnknown }))
    try {
      await api.decisionChecks.saveAnswer(session.id, {
        questionCode,
        value: formData[questionCode] ?? null,
        isUnknown
      })
    } catch (err) {
      console.error(err)
    }
  }

  const completeSession = async () => {
    setSubmitting(true)
    try {
      const res = await api.decisionChecks.complete(session.id)
      if (res.resultId) {
        // Switch to result view, for MVP we just refresh and show the state
        window.location.reload()
      }
    } catch (err) {
      console.error(err)
      alert('Değerlendirme tamamlanamadı')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="decision-session-state" aria-live="polite"><span className="decision-session-spinner" /><h1>Karar aracı yükleniyor</h1><p>Oturum ve kayıtlı yanıtlar hazırlanıyor.</p></div>
  if (loadError) return <div className="decision-session-state" role="alert"><span className="decision-session-error-icon">!</span><h1>Araç yüklenemedi</h1><p>{loadError}</p><button type="button" onClick={() => setLoadAttempt(value => value + 1)}>Yeniden dene</button></div>
  if (!session) return <div className="decision-session-state"><h1>Oturum bulunamadı</h1><p>Bu karar aracı oturumuna erişilemiyor.</p><button type="button" onClick={() => navigate('/app/decision-checks')}>Araç listesine dön</button></div>

  if (session.decisionCheckCode === 'DC-PROFIT-001') {
    return (
      <ProfitabilityDecisionTool
        session={session}
        result={result}
        navigate={navigate}
        mentorContext={mentorContext}
        mentorEnabled={Boolean(mentorContext?.openMentorWithContext)}
      />
    )
  }

  if (session.toolMeta) {
    return (
      <StructuredDecisionTool
        session={session}
        result={result}
        navigate={navigate}
        mentorContext={mentorContext}
        mentorEnabled={Boolean(mentorContext?.openMentorWithContext)}
      />
    )
  }

  if (session.status === 'completed' && result) {
    const snap = result.snapshot || {}
    return (
      <div className={`p-8 max-w-3xl mx-auto ${styles.page}`}>
        <h1 className={`text-2xl font-bold mb-4 ${styles.title}`}>Değerlendirme Sonucu</h1>
        <div className={`bg-white p-6 border rounded shadow-sm ${styles.resultCard}`}>
          <div className={`mb-4 ${styles.resultRow}`}>
            <span className={`font-semibold text-gray-700 ${styles.resultLabel}`}>Durum: </span>
            <span className={`font-bold ${styles.resultValue}`}>{snap.status}</span>
          </div>
          <div className={`mb-4 ${styles.resultRow}`}>
            <span className={`font-semibold text-gray-700 ${styles.resultLabel}`}>Risk Seviyesi: </span>
            <span className={`font-bold ${styles.resultValue}`}>{snap.riskLevel}</span>
          </div>
          {snap.missingInformation && snap.missingInformation.length > 0 && (
            <div className={`mb-4 text-orange-600 ${styles.missingInfo}`}>
              <span className={`font-semibold ${styles.missingInfoLabel}`}>Eksik Bilgiler: </span>
              {snap.missingInformation.join(', ')}
            </div>
          )}
          {snap.findings && snap.findings.length > 0 && (
            <div className={`mb-4 ${styles.resultRow}`}>
              <span className={`font-semibold text-gray-700 ${styles.resultLabel}`}>Bulgular: </span>
              <ul className={`list-disc pl-5 mt-2 ${styles.list}`}>
                {snap.findings.map((f, idx) => (
                  <li key={idx}>{f.message}</li>
                ))}
              </ul>
            </div>
          )}
          {snap.recommendedActions && snap.recommendedActions.slice(0,3).length > 0 && (
            <div className={`mb-4 ${styles.resultRow}`}>
              <span className={`font-semibold text-gray-700 ${styles.resultLabel}`}>Önerilen Aksiyonlar: </span>
              <ul className={`list-disc pl-5 mt-2 ${styles.list}`}>
                {snap.recommendedActions.slice(0,3).map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {recalculateError && <p role="alert" className={`text-red-600 text-sm mb-2 ${styles.recalcError}`}>{recalculateError}</p>}
          <div className={`mt-6 flex gap-4 ${styles.resultActions}`}>
            <button onClick={() => navigate('/app/decision-checks')} className={`px-4 py-2 bg-gray-200 rounded ${styles.secondaryBtn}`}>Listeye Dön</button>
            <button onClick={handleRecalculate} disabled={recalculating} className={`px-4 py-2 bg-gray-200 rounded flex items-center gap-2 ${styles.secondaryBtn}`}>
              <RotateCcw size={16} /> {recalculating ? 'Başlatılıyor…' : 'Yeniden Hesapla'}
            </button>
            {isContextualMentorEnabled && (
              <button
                onClick={() => mentorContext?.openMentorWithContext?.({
                  contextType: 'decision_check_result',
                  source: 'decision_result',
                  decisionCheckResultId: result.id,
                  title: session.decisionCheckCode + ' Sonucu',
                  route: window.location.pathname
                })}
                className={`flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded font-medium hover:bg-indigo-100 transition-colors ${styles.mentorBtn}`}
              >
                <MessageSquare size={18} /> Mentora Sor
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-8 max-w-3xl mx-auto pb-24 ${styles.page} ${styles.pageForm}`}>
      <h1 className={`text-2xl font-bold mb-6 ${styles.title} ${styles.titleForm}`}>Değerlendirme: {session.decisionCheckCode}</h1>
      <div className={`space-y-8 ${styles.questionList}`}>
        {session.definition.map((q) => (
          <div key={q.code} className={`bg-white p-6 rounded-lg shadow-sm border ${styles.questionCard}`}>
            <label className={`block font-semibold mb-1 ${styles.questionLabel}`}>{q.label}</label>
            <p className={`text-sm text-gray-500 mb-4 ${styles.questionDesc}`}>{q.description}</p>

            <div className={`flex items-center gap-4 ${styles.questionRow}`}>
              <input
                type="number"
                disabled={unknowns[q.code]}
                value={formData[q.code] || ''}
                onChange={(e) => handleInputChange(q.code, e.target.value ? Number(e.target.value) : null)}
                className={`flex-1 border p-2 rounded disabled:bg-gray-100 ${styles.numberInput}`}
                placeholder={q.currency ? `Örn: 100 ${q.currency}` : 'Değer girin'}
              />

              {q.allowUnknown && (
                <label className={`flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap ${styles.unknownLabel}`}>
                  <input
                    type="checkbox"
                    checked={unknowns[q.code] || false}
                    onChange={(e) => handleUnknownToggle(q.code, e.target.checked)}
                  />
                  Bilmiyorum / Emin Değilim
                </label>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-8 flex justify-end ${styles.submitRow}`}>
        <button
          onClick={completeSession}
          disabled={submitting}
          className={`bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 ${styles.submitBtn}`}
        >
          {submitting ? 'Hesaplanıyor...' : 'Sonuçları Gör'}
        </button>
      </div>
    </div>
  )
}
