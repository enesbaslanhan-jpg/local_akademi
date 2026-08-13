import React, { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Calculator, CheckCircle2, ChevronRight, MessageSquare, Receipt, RotateCcw, ShieldCheck } from 'lucide-react'
import { api } from '@/services/api'
import { DarkPanel, Modal } from '@/components/ui'
import DecisionReceipt from './DecisionReceipt'
import receiptTrigger from './ReceiptTrigger.module.css'
import './ProfitabilityDecisionTool.css'

const fields = [
  { code: 'salePrice', label: 'Satış fiyatı', hint: 'Müşterinin ödediği ürün fiyatı', suffix: '₺', min: 0.01 },
  { code: 'productCost', label: 'Ürün maliyeti', hint: 'Satın alma veya üretim maliyeti', suffix: '₺', min: 0 },
  { code: 'commissionRate', label: 'Komisyon', hint: 'Pazaryeri veya ödeme kesintisi', suffix: '%', min: 0, max: 100 },
  { code: 'shippingCost', label: 'Kargo', hint: 'Sipariş başına ödediğiniz tutar', suffix: '₺', min: 0 },
  { code: 'packagingCost', label: 'Paketleme', hint: 'Kutu, poşet, etiket ve koruma', suffix: '₺', min: 0 },
  { code: 'returnLossAllowance', label: 'İade payı', hint: 'İade ve hasar için ortalama pay', suffix: '₺', min: 0 },
  { code: 'otherVariableCost', label: 'Diğer giderler', hint: 'Reklam payı ve diğer ürün başı giderler', suffix: '₺', min: 0 },
  { code: 'discountRate', label: 'İndirim oranı', hint: 'İndirim yoksa 0 yazın', suffix: '%', min: 0, max: 100 }
]

const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 })
const percent = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })

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
      setRecalculateError('Yeni hesaplama başlatılamadı. Lütfen tekrar deneyin.')
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <main className="profit-tool">
      <button onClick={() => navigate('/app/decision-checks')} className="profit-back">
        <ArrowLeft size={17} /> Karar araçlarına dön
      </button>

      <section className="profit-card">
        <div className={`profit-hero ${contributionPositive ? 'good' : 'bad'}`}>
          <div className="profit-hero-row">
            <div>
              <p>Hesaplama kaydedildi</p>
              <h1>{contributionPositive ? 'Ürün katkı üretiyor' : 'Bu fiyatla ürün zarar ediyor'}</h1>
              <p>Sonuç, girdiğiniz ürün başı maliyetler ve satış koşullarıyla hesaplandı.</p>
            </div>
            <div className="profit-contribution">
              <p>Ürün başına katkı</p>
              <strong>{money.format(calc.contribution ?? 0)}</strong>
            </div>
          </div>
        </div>

        {/* Karar fişi tetikleyicisi — mevcut imza paneli (DarkPanel), sweep açık */}
        <DarkPanel sweep className={receiptTrigger.bar} onClick={() => setReceiptOpen(true)}>
          <span className={receiptTrigger.icon} aria-hidden="true"><Receipt size={17} /></span>
          <span className={receiptTrigger.label}>Karar fişini görüntüle</span>
          <ChevronRight size={17} className={receiptTrigger.chevron} aria-hidden="true" />
        </DarkPanel>

        <div className="profit-result-body">
          <div className="profit-metrics">
            <Metric label="Toplam maliyet" value={money.format(calc.totalKnownCost ?? 0)} />
            <Metric label="Katkı marjı" value={`%${percent.format(calc.contributionMarginPercent ?? 0)}`} tone={contributionPositive ? 'good' : 'bad'} />
            <Metric label="Başabaş fiyatı" value={calc.breakEvenPrice == null ? 'Hesaplanamadı' : money.format(calc.breakEvenPrice)} tone="info" />
            <Metric label="Mevcut satış fiyatı" value={money.format(calc.revenue ?? 0)} />
          </div>

          {discounted && (
            <section>
              <h2>İndirim sonrası senaryo</h2>
              <div className="profit-metrics">
                <Metric label="İndirimli fiyat" value={money.format(discounted.salePrice)} />
                <Metric label="Yeni toplam maliyet" value={money.format(discounted.totalCost)} />
                <Metric label="Yeni katkı" value={money.format(discounted.contribution)} tone={discounted.profitable ? 'good' : 'bad'} />
                <Metric label="Yeni marj" value={`%${percent.format(discounted.marginPercent)}`} tone={discounted.profitable ? 'good' : 'bad'} />
              </div>
            </section>
          )}

          <div className="profit-panels">
            <section className="profit-panel warning">
              <h2><AlertTriangle size={19} /> Risk uyarıları</h2>
              {calc.riskWarnings?.length ? (
                <ul>
                  {calc.riskWarnings.map(item => <li key={item}><span>•</span><span>{item}</span></li>)}
                </ul>
              ) : <p>Bu senaryoda kritik bir risk işareti bulunmadı.</p>}
            </section>

            <section className="profit-panel safe">
              <h2><ShieldCheck size={19} /> Güvenli sonraki adımlar</h2>
              <ul>
                {(calc.safeNextSteps || []).map(item => <li key={item}><CheckCircle2 size={16} /><span>{item}</span></li>)}
              </ul>
            </section>
          </div>

          <section className="profit-formula">
            <div>
              <p>Formül</p>
              <p>Katkı = Satış fiyatı − ürün başı toplam maliyet</p>
              <p>Komisyon, mevcut ve indirimli satış fiyatları üzerinden ayrı ayrı hesaplanır.</p>
            </div>
            <div>
              <p>Karar öncesi kontrol</p>
              <ul>
                <li>✓ Kargo ve paketleme güncel mi?</li>
                <li>✓ İade payı gerçek sipariş verisine dayanıyor mu?</li>
                <li>✓ İndirim sonrası katkı sıfırın üzerinde mi?</li>
              </ul>
            </div>
          </section>

          {recalculateError && <p role="alert" className="profit-submit-error">{recalculateError}</p>}
          <div className="profit-actions">
            <button onClick={() => navigate('/app/decision-checks')} className="profit-secondary">Listeye dön</button>
            <button onClick={handleRecalculate} disabled={recalculating} className="profit-secondary">
              <RotateCcw size={16} /> {recalculating ? 'Başlatılıyor…' : 'Yeniden Hesapla'}
            </button>
            {mentorEnabled && (
              <button
                onClick={() => mentorContext?.openMentorWithContext?.({
                  contextType: 'decision_check_result', source: 'decision_result', decisionCheckResultId: result.id,
                  title: `${session.decisionCheckTitle || 'Kârlılık'} sonucu`, route: window.location.pathname
                })}
                className="profit-mentor"
              >
                <MessageSquare size={18} /> Sonucu Mentora sor
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
          title={session.decisionCheckTitle || 'Ürün kârlılığı'}
          completedAt={snapshot.completedAt}
        />
      </Modal>
    </main>
  )
}

export default function ProfitabilityDecisionTool({ session, result, navigate, mentorContext, mentorEnabled }) {
  const initialValues = useMemo(() => Object.fromEntries(fields.map(field => {
    const saved = session.answers.find(answer => answer.questionCode === field.code)
    return [field.code, saved?.valueJson ?? '']
  })), [session.answers])
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
        nextErrors[field.code] = field.code === 'salePrice' ? 'Satış fiyatı sıfırdan büyük olmalı.' : `0${field.max ? `–${field.max}` : ' veya üzeri'} bir değer girin.`
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
    <main className="profit-tool">
      <header className="profit-session-head">
        <div>
          <p>Kontrollü değerlendirme</p>
          <h1>Karar Oturumu</h1>
          <strong>Ürünüm Gerçekten Kârlı mı?</strong>
          <span>{completedFieldCount} / {fields.length} alan tamamlandı</span>
        </div>
        <button onClick={() => navigate('/app/decision-checks')} className="profit-back">
          <ArrowLeft size={17} /> Araçlara dön
        </button>
      </header>
      <div className="profit-progress" aria-label={`${completedFieldCount} / ${fields.length} alan tamamlandı`}>
        {fields.map((field, index) => <span key={field.code} className={index < completedFieldCount ? 'is-complete' : ''} />)}
      </div>
      <div className="profit-layout">
        <form onSubmit={submit} className="profit-card profit-form">
          <div className="profit-title-row">
            <div className="profit-icon"><Calculator size={26} /></div>
            <div>
              <p className="profit-eyebrow">Karar aracı</p>
              <h1>Ürünüm Gerçekten Kârlı mı?</h1>
              <p className="profit-lead">Bir ürün ve bir sipariş için gerçek değerlerinizi girin. Tüm tutarlar ürün başına olmalı.</p>
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
            {submitting ? 'Hesaplanıyor ve kaydediliyor…' : 'Kârlılığımı hesapla'}
          </button>
        </form>

        <aside className="profit-aside">
          <p className="profit-aside-title">Ne hesaplanır?</p>
          <ul>
            <li><strong>Gerçek toplam maliyet</strong>Komisyon dahil tüm ürün başı giderler.</li>
            <li><strong>Katkı ve katkı marjı</strong>Her satışın işletmeye bıraktığı tutar ve oran.</li>
            <li><strong>Başabaş fiyatı</strong>Zarar etmeden satış yapabileceğiniz en düşük fiyat.</li>
            <li><strong>İndirim senaryosu</strong>İndirimli fiyatta komisyon ve katkı yeniden hesaplanır.</li>
          </ul>
          <p className="profit-disclaimer">Bu araç karar desteği sağlar. Vergi ve muhasebe yükümlülüklerinizi ayrıca değerlendirmeniz gerekir.</p>
        </aside>
      </div>
    </main>
  )
}
