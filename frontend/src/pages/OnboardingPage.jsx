import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Select } from '@/components/ui'
import styles from './OnboardingPage.module.css'
import { useTranslation } from 'react-i18next'

const STAGES = [
  { value: 'startup', labelKey: 'onboarding.options.stages.startup' },
  { value: 'growth', labelKey: 'onboarding.options.stages.growth' },
  { value: 'mature', labelKey: 'onboarding.options.stages.mature' }
]

const EMPLOYEE_RANGES = [
  { value: '1', labelKey: 'onboarding.options.employees.solo' },
  { value: '3', labelKey: 'onboarding.options.employees.twoToFive' },
  { value: '10', labelKey: 'onboarding.options.employees.sixToTwenty' },
  { value: '35', labelKey: 'onboarding.options.employees.twentyOneToFifty' },
  { value: '51', labelKey: 'onboarding.options.employees.fiftyOnePlus' }
]

const CHANNELS = [
  { value: 'retail_store', labelKey: 'onboarding.options.channels.retail' },
  { value: 'ecommerce', labelKey: 'onboarding.options.channels.ecommerce' },
  { value: 'marketplace', labelKey: 'onboarding.options.channels.marketplace' },
  { value: 'other', labelKey: 'onboarding.options.channels.other' },
  { value: 'wholesale', labelKey: 'onboarding.options.channels.wholesale' },
  { value: 'service', labelKey: 'onboarding.options.channels.service' },
  { value: 'export', labelKey: 'onboarding.options.channels.export' }
]

const GOALS = [
  { value: 'increase_sales', labelKey: 'onboarding.options.goals.increaseSales' },
  { value: 'digital_transform', labelKey: 'onboarding.options.goals.digitalTransform' },
  { value: 'new_markets', labelKey: 'onboarding.options.goals.newMarkets' },
  { value: 'brand_awareness', labelKey: 'onboarding.options.goals.brandAwareness' },
  { value: 'operational', labelKey: 'onboarding.options.goals.operational' },
  { value: 'product_dev', labelKey: 'onboarding.options.goals.productDevelopment' }
]

const CHALLENGES_LIST = [
  { value: 'digital_skills', labelKey: 'onboarding.options.challenges.digitalSkills' },
  { value: 'cash_flow', labelKey: 'onboarding.options.challenges.cashFlow' },
  { value: 'employee_finding', labelKey: 'onboarding.options.challenges.employees' },
  { value: 'customer_acquisition', labelKey: 'onboarding.options.challenges.customerAcquisition' },
  { value: 'competition', labelKey: 'onboarding.options.challenges.competition' },
  { value: 'regulation', labelKey: 'onboarding.options.challenges.regulation' },
  { value: 'technology_adoption', labelKey: 'onboarding.options.challenges.technology' },
  { value: 'other', labelKey: 'onboarding.options.challenges.other' }
]

const LEARNING_OPTIONS = [
  { value: '30', labelKey: 'onboarding.options.learning.thirty' },
  { value: '60', labelKey: 'onboarding.options.learning.sixty' },
  { value: '120', labelKey: 'onboarding.options.learning.oneTwenty' },
  { value: '300', labelKey: 'onboarding.options.learning.threeHundred' },
  { value: '600', labelKey: 'onboarding.options.learning.sixHundred' }
]

export default function OnboardingPage() {
  const { t } = useTranslation('auth')
  const { completeOnboarding } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [existing, setExisting] = useState(null)
  const [form, setForm] = useState({
    businessStage: '',
    employeeCount: '',
    salesChannels: [],
    primaryGoal: '',
    challenges: [],
    weeklyLearningMinutes: '60',
    businessName: '',
    sector: '',
    monthlySales: '',
    monthlyExpenses: '',
    description: ''
  })

  useEffect(() => {
    api.onboarding.getProfile().then(data => {
      if (data) {
        setExisting(data)
        setForm(prev => ({
          ...prev,
          businessStage: data.businessStage || '',
          employeeCount: data.employeeCount?.toString() || '',
          salesChannels: data.salesChannels || [],
          primaryGoal: data.primaryGoal || '',
          challenges: data.challenges || [],
          weeklyLearningMinutes: data.weeklyLearningMinutes?.toString() || '60',
          businessName: data.name || '',
          sector: data.sector || '',
          monthlySales: data.monthlySales || '',
          monthlyExpenses: data.monthlyExpenses || ''
        }))
      }
    }).catch(() => {})
  }, [])

  function toggleChannel(value) {
    setForm(prev => ({
      ...prev,
      salesChannels: prev.salesChannels.includes(value)
        ? prev.salesChannels.filter(c => c !== value)
        : [...prev.salesChannels, value]
    }))
  }

  function toggleChallenge(value) {
    setForm(prev => ({
      ...prev,
      challenges: prev.challenges.includes(value)
        ? prev.challenges.filter(c => c !== value)
        : [...prev.challenges, value]
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await api.onboarding.updateProfile({
        name: form.businessName,
        sector: form.sector,
        businessStage: form.businessStage || null,
        employeeCount: form.employeeCount ? Number.parseInt(form.employeeCount, 10) : null,
        salesChannels: form.salesChannels,
        primaryGoal: form.primaryGoal || null,
        challenges: form.challenges,
        weeklyLearningMinutes: parseInt(form.weeklyLearningMinutes) || 60,
        ...(form.monthlySales !== '' && { monthlySales: Number(form.monthlySales) }),
        ...(form.monthlyExpenses !== '' && { monthlyExpenses: Number(form.monthlyExpenses) })
      })
      await completeOnboarding()
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || t('onboarding.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    { label: t('onboarding.steps.business'), description: t('onboarding.steps.businessDescription') },
    { label: t('onboarding.steps.channels'), description: t('onboarding.steps.channelsDescription') },
    { label: t('onboarding.steps.goals'), description: t('onboarding.steps.goalsDescription') },
    { label: t('onboarding.steps.summary'), description: t('onboarding.steps.summaryDescription') }
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('onboarding.title')}</h1>
        <p className={styles.subtitle}>
          {t('onboarding.subtitle')}
        </p>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={() => navigate('/app/dashboard', { replace: true })}>
          {t('onboarding.skip')}
        </button>
      </div>

      <div className={styles.progress}>
        {steps.map((s, i) => (
          <div
            key={i}
            className={`${styles.stepDot} ${i <= step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}
          >
            <div className={styles.stepNumber}>{i < step ? '✓' : i + 1}</div>
            <div className={styles.stepLabel}>
              <span className={styles.stepName}>{s.label}</span>
              <span className={styles.stepDesc}>{s.description}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        {step === 0 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>{t('onboarding.business.title')}</h2>

            <div className={styles.field}>
              <label className={styles.label}>{t('onboarding.business.name')}</label>
              <input
                type="text"
                className={styles.input}
                placeholder={t('onboarding.business.namePlaceholder')}
                value={form.businessName}
                onChange={e => setForm(prev => ({ ...prev, businessName: e.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t('onboarding.business.sector')}</label>
              <input
                type="text"
                className={styles.input}
                placeholder={t('onboarding.business.sectorPlaceholder')}
                value={form.sector}
                onChange={e => setForm(prev => ({ ...prev, sector: e.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t('onboarding.business.stage')}</label>
              <Select
                className={styles.select}
                aria-label={t('onboarding.business.stage')}
                placeholder={t('onboarding.select')}
                options={STAGES.map(s => ({ value: s.value, label: t(s.labelKey) }))}
                value={form.businessStage}
                onChange={v => setForm(prev => ({ ...prev, businessStage: v }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t('onboarding.business.employeeCount')}</label>
              <Select
                className={styles.select}
                aria-label={t('onboarding.business.employeeCount')}
                placeholder={t('onboarding.select')}
                options={EMPLOYEE_RANGES.map(r => ({ value: r.value, label: t(r.labelKey) }))}
                value={form.employeeCount}
                onChange={v => setForm(prev => ({ ...prev, employeeCount: v }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t('onboarding.business.learningTime')}</label>
              <Select
                className={styles.select}
                aria-label={t('onboarding.business.learningTimeAria')}
                options={LEARNING_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))}
                value={form.weeklyLearningMinutes}
                onChange={v => setForm(prev => ({ ...prev, weeklyLearningMinutes: v }))}
              />
            </div>

            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>{t('onboarding.business.shortDescription')}</label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder={t('onboarding.business.descriptionPlaceholder')}
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>{t('onboarding.channels.title')}</h2>

            <div className={styles.field}>
              <label className={styles.label}>{t('onboarding.channels.label')}</label>
              <div className={styles.checkboxGroup}>
                {CHANNELS.map(ch => (
                  <label key={ch.value} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.salesChannels.includes(ch.value)}
                      onChange={() => toggleChannel(ch.value)}
                    />
                    <span>{t(ch.labelKey)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>{t('onboarding.channels.monthlySales')}</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder={t('onboarding.channels.salesPlaceholder')}
                  value={form.monthlySales}
                  onChange={e => setForm(prev => ({ ...prev, monthlySales: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t('onboarding.channels.monthlyExpenses')}</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder={t('onboarding.channels.expensesPlaceholder')}
                  value={form.monthlyExpenses}
                  onChange={e => setForm(prev => ({ ...prev, monthlyExpenses: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>{t('onboarding.goals.title')}</h2>

            <div className={styles.field}>
              <label className={styles.label}>{t('onboarding.goals.primary')}</label>
              <Select
                className={styles.select}
                aria-label={t('onboarding.goals.primaryAria')}
                placeholder={t('onboarding.select')}
                options={GOALS.map(g => ({ value: g.value, label: t(g.labelKey) }))}
                value={form.primaryGoal}
                onChange={v => setForm(prev => ({ ...prev, primaryGoal: v }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t('onboarding.goals.challenges')}</label>
              <div className={styles.checkboxGroup}>
                {CHALLENGES_LIST.map(ch => (
                  <label key={ch.value} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.challenges.includes(ch.value)}
                      onChange={() => toggleChallenge(ch.value)}
                    />
                    <span>{t(ch.labelKey)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>{t('onboarding.summary.title')}</h2>
            <div className={styles.summary}>
              <div className={styles.summaryGroup}>
                <h3>{t('onboarding.business.title')}</h3>
                <p><strong>{t('onboarding.summary.name')}:</strong> {form.businessName || '—'}</p>
                <p><strong>{t('onboarding.summary.sector')}:</strong> {form.sector || '—'}</p>
                <p><strong>{t('onboarding.summary.stage')}:</strong> {STAGES.find(s => s.value === form.businessStage)?.labelKey ? t(STAGES.find(s => s.value === form.businessStage).labelKey) : '—'}</p>
                <p><strong>{t('onboarding.summary.employees')}:</strong> {EMPLOYEE_RANGES.find(r => r.value === form.employeeCount)?.labelKey ? t(EMPLOYEE_RANGES.find(r => r.value === form.employeeCount).labelKey) : '—'}</p>
                <p><strong>{t('onboarding.summary.weeklyLearning')}:</strong> {LEARNING_OPTIONS.find(o => o.value === form.weeklyLearningMinutes)?.labelKey ? t(LEARNING_OPTIONS.find(o => o.value === form.weeklyLearningMinutes).labelKey) : form.weeklyLearningMinutes}</p>
              </div>
              <div className={styles.summaryGroup}>
                <h3>{t('onboarding.channels.title')}</h3>
                <p>{form.salesChannels.length ? form.salesChannels.map(c => t(CHANNELS.find(ch => ch.value === c)?.labelKey)).join(', ') : '—'}</p>
                <p><strong>{t('onboarding.summary.revenue')}:</strong> {form.monthlySales ? `${Number(form.monthlySales).toLocaleString()} ₺` : '—'}</p>
                <p><strong>{t('onboarding.summary.expenses')}:</strong> {form.monthlyExpenses ? `${Number(form.monthlyExpenses).toLocaleString()} ₺` : '—'}</p>
              </div>
              <div className={styles.summaryGroup}>
                <h3>{t('onboarding.summary.goalsAndChallenges')}</h3>
                <p><strong>{t('onboarding.summary.goal')}:</strong> {GOALS.find(g => g.value === form.primaryGoal)?.labelKey ? t(GOALS.find(g => g.value === form.primaryGoal).labelKey) : '—'}</p>
                <p><strong>{t('onboarding.summary.challenges')}:</strong> {form.challenges.length ? form.challenges.map(c => t(CHALLENGES_LIST.find(ch => ch.value === c)?.labelKey)).join(', ') : '—'}</p>
              </div>
            </div>
          </div>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          {step > 0 && (
            <button className={styles.btnSecondary} onClick={() => setStep(prev => prev - 1)}>
              {t('onboarding.back')}
            </button>
          )}
          {step < 3 ? (
            <button className={styles.btnPrimary} onClick={() => setStep(prev => prev + 1)}>
              {t('onboarding.continue')}
            </button>
          ) : (
            <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
              {saving ? t('onboarding.saving') : t('onboarding.finish')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
