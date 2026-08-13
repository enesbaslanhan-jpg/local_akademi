import React, { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Calculator, CheckCircle2, ChevronRight, MessageSquare, Receipt, RotateCcw, ShieldCheck } from 'lucide-react'
import { api } from '@/services/api'
import { DarkPanel, Modal } from '@/components/ui'
import DecisionReceipt from './DecisionReceipt'
import receiptTrigger from './ReceiptTrigger.module.css'
import './StructuredDecisionTool.css'

const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 })
const decimal = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })

function formatMetric(value, format) {
  if (!Number.isFinite(Number(value))) return 'Hesaplanamadı'
  if (format === 'money') return money.format(value)
  if (format === 'percent') return `%${decimal.format(value)}`
  if (format === 'months') return `${decimal.format(value)} ay`
  if (format === 'days') return `${decimal.format(value)} gün`
  return decimal.format(value)
}

function ResultView({ session, result, navigate, mentorContext, mentorEnabled }) {
  const snapshot = result.snapshot || {}
  const calculation = snapshot.calculationOutput || {}
  const [recalculating, setRecalculating] = useState(false)
  const [recalculateError, setRecalculateError] = useState('')
  const [receiptOpen, setReceiptOpen] = useState(false)

  const handleRecalculate = async () => {
    setRecalculateError('')
    setRecalculating(true)
    try {
      const response = await api.decisionChecks.start(session.decisionCheckCode)
      if (response?.sessionId) {
        navigate(`/app/decision-checks/${response.sessionId}`)
      }
    } catch (error) {
      setRecalculateError('Yeni hesaplama başlatılamadı. Lütfen tekrar deneyin.')
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <main className="structured-tool">
      <button type="button" onClick={() => navigate('/app/decision-checks')} className="structured-back">
        <ArrowLeft size={17} /> Karar araçlarına dön
      </button>

      <section className="structured-surface">
        <div className={`structured-result-hero structured-tone-${calculation.decisionTone || 'neutral'}`}>
          <div>
            <p className="structured-eyebrow">Hesaplama kaydedildi</p>
            <h1>{calculation.decisionLabel || 'SONUÇ'}</h1>
            <p>{calculation.summary || 'Karar senaryonuz hesaplandı.'}</p>
          </div>
          <div className="structured-result-tool-name">{session.decisionCheckTitle}</div>
        </div>

        {/* Karar fişi tetikleyicisi — mevcut imza paneli (DarkPanel), sweep açık */}
        <DarkPanel sweep className={receiptTrigger.bar} onClick={() => setReceiptOpen(true)}>
          <span className={receiptTrigger.icon} aria-hidden="true"><Receipt size={17} /></span>
          <span className={receiptTrigger.label}>Karar fişini görüntüle</span>
          <ChevronRight size={17} className={receiptTrigger.chevron} aria-hidden="true" />
        </DarkPanel>

        <div className="structured-result-body">
          <section aria-label="Temel hesaplamalar">
            <h2>Temel hesaplamalar</h2>
            <div className="structured-metric-grid">
              {(calculation.metrics || []).map(metric => (
                <div className="structured-metric" key={metric.key}>
                  <span>{metric.label}</span>
                  <strong>{formatMetric(metric.value, metric.format)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="structured-scenario-section" aria-label="Karşılaştırmalı senaryo">
            <h2>Karşılaştırmalı senaryo</h2>
            <div className="structured-scenario-grid">
              {(calculation.scenarios || []).map(scenario => (
                <article className={`structured-scenario structured-tone-${scenario.tone || 'neutral'}`} key={scenario.label}>
                  <span>{scenario.label}</span>
                  <strong>{formatMetric(scenario.value, scenario.format)}</strong>
                  <p>{scenario.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="structured-insight-grid">
            <section className="structured-insight structured-risk">
              <h2><AlertTriangle size={19} /> Risk uyarıları</h2>
              <ul>{(calculation.riskWarnings || []).map(item => <li key={item}>{item}</li>)}</ul>
            </section>
            <section className="structured-insight structured-safe">
              <h2><ShieldCheck size={19} /> Güvenli sonraki adımlar</h2>
              <ul>{(calculation.safeNextSteps || []).map(item => <li key={item}><CheckCircle2 size={15} /> <span>{item}</span></li>)}</ul>
            </section>
          </div>

          <section className="structured-formulas">
            <p className="structured-eyebrow">Bu sonuca nasıl ulaşıldı?</p>
            <ul>{(calculation.formulas || []).map(formula => <li key={formula}>{formula}</li>)}</ul>
          </section>

          {recalculateError && <p className="structured-submit-error" role="alert">{recalculateError}</p>}
          <div className="structured-actions">
            <button type="button" className="structured-secondary" onClick={() => navigate('/app/decision-checks')}>Listeye dön</button>
            <button type="button" className="structured-secondary" onClick={handleRecalculate} disabled={recalculating}>
              <RotateCcw size={16} /> {recalculating ? 'Başlatılıyor…' : 'Yeniden Hesapla'}
            </button>
            {mentorEnabled && (
              <button
                type="button"
                className="structured-mentor"
                onClick={() => mentorContext?.openMentorWithContext?.({
                  contextType: 'decision_check_result', source: 'decision_result', decisionCheckResultId: result.id,
                  title: `${session.decisionCheckTitle} sonucu`, route: window.location.pathname
                })}
              >
                <MessageSquare size={18} /> Sonucu Mentora sor
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Başlık fişin kendi parçası — modal yalnızca çerçeve. */}
      <Modal open={receiptOpen} onClose={() => setReceiptOpen(false)} size="md">
        <DecisionReceipt
          snapshot={snapshot}
          title={session.decisionCheckTitle}
          completedAt={snapshot.completedAt}
        />
      </Modal>
    </main>
  )
}

export default function StructuredDecisionTool({ session, result, navigate, mentorContext, mentorEnabled }) {
  const fields = session.definition || []
  const meta = session.toolMeta || {}
  const initialValues = useMemo(() => Object.fromEntries(fields.map(field => {
    const saved = session.answers.find(answer => answer.questionCode === field.code)
    return [field.code, saved?.valueJson ?? '']
  })), [fields, session.answers])
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const completedFieldCount = fields.filter(field => values[field.code] !== '' && values[field.code] != null).length

  if (session.status === 'completed' && result) {
    return <ResultView {...{ session, result, navigate, mentorContext, mentorEnabled }} />
  }

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    fields.forEach(field => {
      const numeric = Number(values[field.code])
      if (values[field.code] === '' || !Number.isFinite(numeric) || numeric < field.min || (field.max != null && numeric > field.max)) {
        const range = field.max == null ? `${field.min} veya üzeri` : `${field.min}–${field.max} arası`
        nextErrors[field.code] = `${range} geçerli bir değer girin.`
      }
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    setSubmitError('')
    try {
      await Promise.all(fields.map(field => api.decisionChecks.saveAnswer(session.id, {
        questionCode: field.code,
        value: Number(values[field.code]),
        isUnknown: false
      })))
      await api.decisionChecks.complete(session.id)
      window.location.reload()
    } catch (error) {
      setSubmitError(error?.data?.message || 'Sonuç kaydedilemedi. Değerleri kontrol edip tekrar deneyin.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="structured-tool">
      <header className="structured-session-head">
        <div>
          <p>Kontrollü değerlendirme</p>
          <h1>Karar Oturumu</h1>
          <strong>{session.decisionCheckTitle}</strong>
          <span>{completedFieldCount} / {fields.length} alan tamamlandı</span>
        </div>
        <button type="button" onClick={() => navigate('/app/decision-checks')} className="structured-back">
          <ArrowLeft size={17} /> Araçlara dön
        </button>
      </header>
      <div className="structured-progress" aria-label={`${completedFieldCount} / ${fields.length} alan tamamlandı`}>
        {fields.map((field, index) => <span key={field.code} className={index < completedFieldCount ? 'is-complete' : ''} />)}
      </div>

      <div className="structured-layout">
        <form className="structured-surface structured-form" onSubmit={submit} noValidate>
          <div className="structured-title-row">
            <div className="structured-icon"><Calculator size={25} /></div>
            <div>
              <p className="structured-eyebrow">Karar aracı</p>
              <h1>{session.decisionCheckTitle}</h1>
              <p>{meta.intro || session.decisionCheckDescription}</p>
            </div>
          </div>

          <div className="structured-fields">
            {fields.map(field => {
              /* Seçenekli soru: sayı kutusu yerine radyo grubu. Değer yine
                 sayıdır, hesaplama sözleşmesi değişmez. */
              if (field.type === 'choice' && Array.isArray(field.options) && field.options.length > 0) {
                return (
                  <fieldset className="structured-field" key={field.code}>
                    <legend className="structured-field-label">{field.label}</legend>
                    <span className="structured-field-hint">{field.description}</span>
                    <div className={`structured-choices ${errors[field.code] ? 'invalid' : ''}`}>
                      {field.options.map(option => {
                        const selected = String(values[field.code]) === String(option.value)
                        return (
                          <label
                            key={option.value}
                            className={`structured-choice ${selected ? 'is-selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name={field.code}
                              value={option.value}
                              checked={selected}
                              onChange={() => setValues(previous => ({ ...previous, [field.code]: String(option.value) }))}
                            />
                            <span className="structured-choice-label">{option.label}</span>
                            {option.description && (
                              <span className="structured-choice-hint">{option.description}</span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                    {errors[field.code] && <span className="structured-field-error">{errors[field.code]}</span>}
                  </fieldset>
                )
              }

              return (
                <label className="structured-field" key={field.code}>
                  <span className="structured-field-label">{field.label}</span>
                  <span className="structured-field-hint">{field.description}</span>
                  <span className={`structured-input ${errors[field.code] ? 'invalid' : ''}`}>
                    <input
                      aria-label={field.label}
                      type="number"
                      inputMode="decimal"
                      step={field.step || 0.01}
                      min={field.min}
                      max={field.max}
                      value={values[field.code]}
                      onChange={event => setValues(previous => ({ ...previous, [field.code]: event.target.value }))}
                    />
                    <span>{field.suffix || ''}</span>
                  </span>
                  {errors[field.code] && <span className="structured-field-error">{errors[field.code]}</span>}
                </label>
              )
            })}
          </div>

          {submitError && <p className="structured-submit-error" role="alert">{submitError}</p>}
          <button className="structured-primary" disabled={submitting}>
            {submitting ? 'Hesaplanıyor ve kaydediliyor…' : meta.submitLabel || 'Sonucu hesapla'}
          </button>
        </form>

        <aside className="structured-guide">
          <p className="structured-guide-title">Hesaplama çerçevesi</p>
          <ul>{(meta.formulas || []).map(formula => <li key={formula}>{formula}</li>)}</ul>
          <p className="structured-guide-title structured-guide-check-title">Karar öncesi kontrol</p>
          <ul>{(meta.decisionChecks || []).map(item => <li key={item}>{item}</li>)}</ul>
          <p className="structured-disclaimer">Bu araç karar desteği sağlar. Vergi, hukuk ve muhasebe yükümlülüklerinizi uzmanınızla ayrıca doğrulayın.</p>
        </aside>
      </div>
    </main>
  )
}
