import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { useNavigate } from 'react-router-dom'
import styles from './AssessmentPage.module.css'

const domainLabels = {
  finance: 'Finansal Yönetim',
  sales: 'Satış ve Müşteri',
  operations: 'Operasyon ve Kalite',
  people: 'İnsan ve İş Güvenliği',
  supply: 'Tedarik Zinciri',
  cyber: 'Siber Güvenlik ve Veri',
  export: 'İhracat Hazırlığı',
  ai: 'Yapay Zekâ Hazırlığı'
}

export default function AssessmentPage() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [totalSteps, setTotalSteps] = useState(0)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState(null)
  const [saving, setSaving] = useState(false)
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.assessment.getQuestions(),
      api.assessment.getStatus()
    ]).then(([qData, statusData]) => {
      setQuestions(qData.questions || [])
      setTotalSteps(qData.totalSteps || 0)
      if (statusData.completed) {
        api.assessment.getResults().then(r => setResults(r)).catch(() => {})
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const currentQ = questions[step]

  function handleSelect(questionId, value) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  function handleMultiSelect(questionId, value) {
    setAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : current.length < (currentQ?.maxSelections || 99)
          ? [...current, value]
          : current
      return { ...prev, [questionId]: next }
    })
  }

  const canProceed = useCallback(() => {
    if (!currentQ) return false
    const val = answers[currentQ.id]
    if (currentQ.type === 'multiselect') return Array.isArray(val) && val.length > 0
    if (currentQ.type === 'text') return typeof val === 'string' && val.trim().length > 0
    return !!val
  }, [currentQ, answers])

  async function handleSubmit() {
    setSaving(true)
    setError('')
    try {
      const res = await api.assessment.submit(answers)
      setResults(res)
    } catch (err) {
      setError(err.message || 'Değerlendirme kaydedilirken hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRestart() {
    setAnswers({})
    setResults(null)
    setStep(0)
    setExisting(null)
  }

  if (loading) {
    return <div className={styles.container}><p className={styles.centered}>Yükleniyor...</p></div>
  }

  if (results) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Değerlendirme Tamamlandı</h1>
          <p className={styles.subtitle}>İşte size özel bulgular:</p>
        </div>
        <div className={styles.card}>
          <div className={styles.resultSection}>
            <h2>Alan Puanlarınız</h2>
            <div className={styles.scoreList}>
              {Object.entries(results.scores || {}).map(([domain, rawScore]) => {
                const score = Math.max(0, Math.min(100, Number(rawScore) || 0))
                return (
                  <div className={styles.scoreItem} key={domain}>
                    <div className={styles.scoreHeader}>
                      <span>{domainLabels[domain] || domain}</span>
                      <strong>{score}/100</strong>
                    </div>
                    <div
                      className={styles.scoreTrack}
                      role="progressbar"
                      aria-label={domainLabels[domain] || domain}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={score}
                    >
                      <div className={styles.scoreFill} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className={styles.resultSection}>
            <h2>Öncelikli Alanlarınız</h2>
            <div className={styles.chips}>
              {results.priorityDomains?.map(d => (
                <span key={d} className={styles.chip}>{domainLabels[d] || d}</span>
              ))}
            </div>
          </div>
          <div className={styles.resultSection}>
            <h2>Öneriler</h2>
            <ul className={styles.recommendations}>
              {results.recommendations?.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={handleRestart}>
              Değerlendirmeyi Tekrarla
            </button>
            <button className={styles.btnPrimary} onClick={() => navigate('/app/dashboard')}>
              Panoya Git
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (existing && !results) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Değerlendirme</h1>
          <p className={styles.subtitle}>Daha önce bir değerlendirme yapmışsınız. Tekrar yapabilir veya sonuçları görüntüleyebilirsiniz.</p>
        </div>
        <div className={styles.card}>
          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={() => setExisting(null)}>
              Yeniden Başla
            </button>
            <button className={styles.btnPrimary} onClick={() => navigate('/app/dashboard')}>
              Panoya Git
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!questions.length) {
    return <div className={styles.container}><p className={styles.centered}>Sorular yüklenemedi.</p></div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>İşletme Değerlendirmesi</h1>
        <p className={styles.subtitle}>Adım {step + 1} / {totalSteps}</p>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.questionTitle}>{currentQ?.title}</h2>
        {currentQ?.subtitle && <p className={styles.questionSub}>{currentQ.subtitle}</p>}

        <div className={styles.options}>
          {currentQ?.type === 'text' ? (
            <textarea
              className={styles.textarea}
              rows={4}
              placeholder={currentQ.placeholder || ''}
              value={typeof answers[currentQ.id] === 'string' ? answers[currentQ.id] : ''}
              onChange={e => handleSelect(currentQ.id, e.target.value)}
            />
          ) : currentQ?.options?.map(opt => {
            const selected = currentQ.type === 'multiselect'
              ? (Array.isArray(answers[currentQ.id]) ? answers[currentQ.id] : []).includes(opt.value)
              : answers[currentQ.id] === opt.value
            return (
              <button
                key={opt.value}
                className={`${styles.option} ${selected ? styles.optionSelected : ''}`}
                onClick={() => currentQ.type === 'multiselect'
                  ? handleMultiSelect(currentQ.id, opt.value)
                  : handleSelect(currentQ.id, opt.value)
                }
              >
                <span className={styles.optionIcon}>{opt.icon}</span>
                <span className={styles.optionLabel}>{opt.label}</span>
              </button>
            )
          })}
        </div>

        {currentQ?.maxSelections && (
          <p className={styles.hint}>
            En fazla {currentQ.maxSelections} seçim yapabilirsiniz
            ({Array.isArray(answers[currentQ.id]) ? answers[currentQ.id].length : 0}/{currentQ.maxSelections})
          </p>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          {step > 0 && (
            <button className={styles.btnSecondary} onClick={() => setStep(prev => prev - 1)}>
              Geri
            </button>
          )}
          <div className={styles.spacer} />
          {step < totalSteps - 1 ? (
            <button className={styles.btnPrimary} disabled={!canProceed()} onClick={() => setStep(prev => prev + 1)}>
              Devam
            </button>
          ) : (
            <button className={styles.btnPrimary} disabled={!canProceed() || saving} onClick={handleSubmit}>
              {saving ? 'Kaydediliyor...' : 'Tamamla'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
