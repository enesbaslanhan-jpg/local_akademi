import React, { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Calculator, CheckCircle2, ChevronRight, MessageSquare, Receipt, RotateCcw, ShieldCheck } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { api } from '@/services/api'
import { DarkPanel, Modal } from '@/components/ui'
import DecisionReceipt from './DecisionReceipt'
import receiptTrigger from './ReceiptTrigger.module.css'
import './ProfitabilityDecisionTool.css'
import { getFormatLocale } from '@/utils/formatters'

const FIELD_META = [
  { code: 'salePrice', suffix: '₺', min: 0.01 },
  { code: 'productCost', suffix: '₺', min: 0 },
  { code: 'commissionRate', suffix: '%', min: 0, max: 100 },
  { code: 'shippingCost', suffix: '₺', min: 0 },
  { code: 'packagingCost', suffix: '₺', min: 0 },
  { code: 'returnLossAllowance', suffix: '₺', min: 0 },
  { code: 'otherVariableCost', suffix: '₺', min: 0 },
  { code: 'discountRate', suffix: '%', min: 0, max: 100 }
]

function useFields(t) {
  return useMemo(() => FIELD_META.map(meta => ({
    ...meta,
    label: t(`session.fields.${meta.code}.label`),
    hint: t(`session.fields.${meta.code}.hint`)
  })), [t])
}

const money = { format: value => new Intl.NumberFormat(getFormatLocale(), { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(value) }
const percent = { format: value => new Intl.NumberFormat(getFormatLocale(), { maximumFractionDigits: 1 }).format(value) }

function Metric({ label, value, tone = 'neutral', detail }) {
  const tones = {
    neutral: 'border-slate-200 bg-white',
    good: 'border-emerald-200 bg-emerald-50',
    bad: 'border-rose-200 bg-rose-50',
    info: 'border-blue-200 bg-blue-50'
  }
  return (
    <div className={`profit-metric ${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      {detail && <p>{detail}</p>}
    </div>
  )
}

function ResultView({ session, result, navigate, mentorContext, mentorEnabled }) {
  const { t } = useTranslation('tools')
  const snapshot = result.snapshot || {}
  const calc = snapshot.calculationOutput || {}
  const discounted = calc.discountedScenario
  const contributionPositive = Number(calc.contribution) > 0
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
      setRecalculateError(t('session.recalculateError'))
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <main className="profit-tool">
      <button onClick={() => navigate('/app/decision-checks')} className="profit-back">
        <ArrowLeft size={17} /> {t('decisions.backToTools')}
      </button>

      <section className="profit-card">
        <div className={`profit-hero ${contributionPositive ? 'good' : 'bad'}`}>
          <div className="profit-hero-row">
            <div>
              <p>{t('decisions.calcSaved')}</p>
              <h1>{contributionPositive ? t('session.positiveVerdict') : t('session.negativeVerdict')}</h1>
              <p>{t('session.resultExplainer')}</p>
            </div>
            <div className="profit-contribution">
              <p>{t('session.contributionPerUnit')}</p>
              <strong>{money.format(calc.contribution ?? 0)}</strong>
            </div>
          </div>
        </div>

        {/* Karar fişi tetikleyicisi — mevcut imza paneli (DarkPanel), sweep açık */}
        <DarkPanel sweep className={receiptTrigger.bar} onClick={() => setReceiptOpen(true)}>
          <span className={receiptTrigger.icon} aria-hidden="true"><Receipt size={17} /></span>
          <span className={receiptTrigger.label}>{t('receipt.viewTrigger')}</span>
          <ChevronRight size={17} className={receiptTrigger.chevron} aria-hidden="true" />
        </DarkPanel>

        <div className="profit-result-body">
          <div className="profit-metrics">
            <Metric label={t('receipt.lines.totalKnownCost')} value={money.format(calc.totalKnownCost ?? 0)} />
            <Metric label={t('session.contributionMargin')} value={`%${percent.format(calc.contributionMarginPercent ?? 0)}`} tone={contributionPositive ? 'good' : 'bad'} />
            <Metric label={t('session.breakEvenPrice')} value={calc.breakEvenPrice == null ? t('session.metricUnavailable') : money.format(calc.breakEvenPrice)} tone="info" />
            <Metric label={t('session.currentSalePrice')} value={money.format(calc.revenue ?? 0)} />
          </div>

          {discounted && (
            <section>
              <h2>{t('session.discountedScenarioHeading')}</h2>
              <div className="profit-metrics">
                <Metric label={t('calculations.results.discountedPrice')} value={money.format(discounted.salePrice)} />
                <Metric label={t('session.newTotalCost')} value={money.format(discounted.totalCost)} />
                <Metric label={t('session.newContribution')} value={money.format(discounted.contribution)} tone={discounted.profitable ? 'good' : 'bad'} />
                <Metric label={t('session.newMargin')} value={`%${percent.format(discounted.marginPercent)}`} tone={discounted.profitable ? 'good' : 'bad'} />
              </div>
            </section>
          )}

          <div className="profit-panels">
            <section className="profit-panel warning">
              <h2><AlertTriangle size={19} /> {t('decisions.riskWarnings')}</h2>
              {calc.riskWarnings?.length ? (
                <ul>
                  {calc.riskWarnings.map(item => <li key={item}><span>•</span><span>{item}</span></li>)}
                </ul>
              ) : <p>{t('session.noCriticalRisks')}</p>}
            </section>

            <section className="profit-panel safe">
              <h2><ShieldCheck size={19} /> {t('decisions.safeNextSteps')}</h2>
              <ul>
                {(calc.safeNextSteps || []).map(item => <li key={item}><CheckCircle2 size={16} /><span>{item}</span></li>)}
              </ul>
            </section>
          </div>

          <section className="profit-formula">
            <div>
              <p>{t('session.formulaLabel')}</p>
              <p>{t('session.formulaLine')}</p>
              <p>{t('session.formulaNote')}</p>
            </div>
            <div>
              <p>{t('decisions.preDecisionCheck')}</p>
              <ul>
                <li>{t('session.checklist.shippingCurrent')}</li>
                <li>{t('session.checklist.returnsData')}</li>
                <li>{t('session.checklist.positiveContribution')}</li>
              </ul>
            </div>
          </section>

          {recalculateError && <p role="alert" className="profit-submit-error">{recalculateError}</p>}
          <div className="profit-actions">
            <button onClick={() => navigate('/app/decision-checks')} className="profit-secondary">{t('decisions.backToList')}</button>
            <button onClick={handleRecalculate} disabled={recalculating} className="profit-secondary">
              <RotateCcw size={16} /> {recalculating ? t('session.starting') : t('session.recalculate')}
            </button>
            {mentorEnabled && (
              <button
                onClick={() => mentorContext?.openMentorWithContext?.({
                  contextType: 'decision_check_result', source: 'decision_result', decisionCheckResultId: result.id,
                  title: t('session.mentorResultTitle', { title: session.decisionCheckTitle || t('session.profitabilityShort') }), route: window.location.pathname
                })}
                className="profit-mentor"
              >
                <MessageSquare size={18} /> {t('decisions.askMentorResult')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Başlık fişin kendi parçası — modal yalnızca çerçeve. */}
      <Modal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        size="md"
      >
        <DecisionReceipt
          snapshot={snapshot}
          title={session.decisionCheckTitle || t('session.productProfitabilityTitle')}
          completedAt={snapshot.completedAt}
        />
      </Modal>
    </main>
  )
}

export default function ProfitabilityDecisionTool({ session, result, navigate, mentorContext, mentorEnabled }) {
  const { t } = useTranslation('tools')
  const fields = useFields(t)
  const initialValues = useMemo(() => Object.fromEntries(fields.map(field => {
    const saved = session.answers.find(answer => answer.questionCode === field.code)
    return [field.code, saved?.valueJson ?? '']
  })), [session.answers, fields])
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
        nextErrors[field.code] = field.code === 'salePrice'
          ? t('session.errors.salePricePositive')
          : field.max
            ? t('session.errors.rangeWithMax', { max: field.max })
            : t('session.errors.rangeOpen')
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
      setSubmitError(error?.data?.message || t('session.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="profit-tool">
      <header className="profit-session-head">
        <div>
          <p>{t('session.controlledAssessment')}</p>
          <h1>{t('session.sessionTitle')}</h1>
          <strong>{t('decisions.cards.profit.title')}</strong>
          <span>{t('session.fieldsCompleted', { completed: completedFieldCount, total: fields.length })}</span>
        </div>
        <button onClick={() => navigate('/app/decision-checks')} className="profit-back">
          <ArrowLeft size={17} /> {t('decisions.backToToolsShort')}
        </button>
      </header>
      <div className="profit-progress" aria-label={t('session.fieldsCompleted', { completed: completedFieldCount, total: fields.length })}>
        {fields.map((field, index) => <span key={field.code} className={index < completedFieldCount ? 'is-complete' : ''} />)}
      </div>
      <div className="profit-layout">
        <form onSubmit={submit} className="profit-card profit-form">
          <div className="profit-title-row">
            <div className="profit-icon"><Calculator size={26} /></div>
            <div>
              <p className="profit-eyebrow">{t('decisions.toolEyebrow')}</p>
              <h1>{t('decisions.cards.profit.title')}</h1>
              <p className="profit-lead">{t('session.formLead')}</p>
            </div>
          </div>

          <div className="profit-fields">
            {fields.map(field => (
              <label key={field.code} className="profit-field">
                <span className="profit-field-label">{field.label}</span>
                <span className="profit-field-hint">{field.hint}</span>
                <div className={`profit-input ${errors[field.code] ? 'invalid' : ''}`}>
                  <input
                    aria-label={field.label}
                    inputMode="decimal"
                    type="number"
                    step="0.01"
                    min={field.min}
                    max={field.max}
                    value={values[field.code]}
                    onChange={event => setValues(previous => ({ ...previous, [field.code]: event.target.value }))}
                  />
                  <span className="profit-suffix">{field.suffix}</span>
                </div>
                {errors[field.code] && <span className="profit-field-error">{errors[field.code]}</span>}
              </label>
            ))}
          </div>

          {submitError && <p role="alert" className="profit-submit-error">{submitError}</p>}
          <button disabled={submitting} className="profit-primary">
            {submitting ? t('session.submittingSaving') : t('session.calculateProfitability')}
          </button>
        </form>

        <aside className="profit-aside">
          <p className="profit-aside-title">{t('session.whatIsCalculated')}</p>
          <ul>
            <li><Trans i18nKey="session.calcItems.totalCost" ns="tools" components={[<strong key="0" />]} /></li>
            <li><Trans i18nKey="session.calcItems.contribution" ns="tools" components={[<strong key="0" />]} /></li>
            <li><Trans i18nKey="session.calcItems.breakEven" ns="tools" components={[<strong key="0" />]} /></li>
            <li><Trans i18nKey="session.calcItems.discountScenario" ns="tools" components={[<strong key="0" />]} /></li>
          </ul>
          <p className="profit-disclaimer">{t('session.disclaimerProfit')}</p>
        </aside>
      </div>
    </main>
  )
}
