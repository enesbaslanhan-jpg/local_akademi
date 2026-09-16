import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, Bot, Check, Compass, Target } from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import BrandMark from '@/components/ui/BrandMark'
import { useTranslation } from 'react-i18next'
import { captureAnalytics } from '@/services/analytics'
import styles from './OnboardingPage.module.css'

const TASLAK_ANAHTARI = 'localkarar-onboarding-draft-v2'

const SECTORS = ['retail', 'ecommerce', 'service', 'food', 'production', 'professional', 'other']
const GOALS = ['increase_sales', 'operational', 'cash_flow', 'digital_transform', 'new_markets', 'product_dev']
const CHALLENGES = ['cash_flow', 'customer_acquisition', 'cost_control', 'competition', 'employee_finding', 'technology_adoption', 'regulation', 'other']

function taslakOku() {
  try {
    const value = JSON.parse(window.localStorage.getItem(TASLAK_ANAHTARI) || 'null')
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

export default function OnboardingPage() {
  const { t } = useTranslation('auth')
  const { completeOnboarding } = useAuth()
  const navigate = useNavigate()
  const draft = useMemo(taslakOku, [])
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [error, setError] = useState('')
  const [profileNotice, setProfileNotice] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [form, setForm] = useState({
    sector: draft?.sector || '',
    primaryGoal: draft?.primaryGoal || '',
    challenges: Array.isArray(draft?.challenges) ? draft.challenges.slice(0, 3) : []
  })

  useEffect(() => {
    captureAnalytics('onboarding_started', { source: 'onboarding_v2' })
  }, [])

  useEffect(() => {
    let cancelled = false
    setProfileNotice('')
    api.onboarding.getProfile()
      .then(data => {
        if (cancelled || !data) return
        setForm(current => ({
          sector: current.sector || data.sector || '',
          primaryGoal: current.primaryGoal || data.primaryGoal || '',
          challenges: current.challenges.length ? current.challenges : (data.challenges || []).slice(0, 3)
        }))
      })
      .catch(() => {
        if (!cancelled) setProfileNotice(t('onboarding.profileLoadError'))
      })
    return () => { cancelled = true }
  }, [loadAttempt, t])

  useEffect(() => {
    window.localStorage.setItem(TASLAK_ANAHTARI, JSON.stringify(form))
  }, [form])

  const steps = [
    { key: 'sector', icon: Compass },
    { key: 'goal', icon: Target },
    { key: 'challenge', icon: AlertCircle }
  ]

  const valid = step === 0
    ? Boolean(form.sector)
    : step === 1
      ? Boolean(form.primaryGoal)
      : form.challenges.length > 0

  function choose(field, value) {
    setError('')
    setForm(current => ({ ...current, [field]: value }))
  }

  function toggleChallenge(value) {
    setError('')
    setForm(current => {
      if (current.challenges.includes(value)) {
        return { ...current, challenges: current.challenges.filter(item => item !== value) }
      }
      if (current.challenges.length >= 3) return current
      return { ...current, challenges: [...current.challenges, value] }
    })
  }

  function next() {
    if (!valid) {
      setError(t('onboarding.chooseOne'))
      return
    }
    captureAnalytics('onboarding_step_completed', {
      onboarding_step: String(step + 1),
      source: 'onboarding_v2'
    })
    setError('')
    setStep(current => Math.min(current + 1, 2))
  }

  async function skip() {
    if (skipping || saving) return
    setSkipping(true)
    setError('')
    try {
      await completeOnboarding({ skipped: true })
    } catch {
      /* Ağ sorunu ilk değer anına erişimi engellemez. Sunucu bayrağı
         yazılamasa bile bu oturumda kullanıcı panoya devam eder. */
      captureAnalytics('onboarding_skip_failed', { platform: 'web' })
    } finally {
      window.localStorage.removeItem(TASLAK_ANAHTARI)
      navigate('/app/dashboard', { replace: true })
    }
  }

  async function finish() {
    if (!valid || saving) {
      if (!valid) setError(t('onboarding.chooseOne'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.onboarding.updateProfile({
        sector: form.sector,
        primaryGoal: form.primaryGoal,
        challenges: form.challenges
      })
      await completeOnboarding()
      window.localStorage.removeItem(TASLAK_ANAHTARI)
      navigate('/app/dashboard', { replace: true })
    } catch {
      setError(t('onboarding.saveErrorRecovery'))
      captureAnalytics('onboarding_save_failed', { platform: 'web', onboarding_step: '3' })
    } finally {
      setSaving(false)
    }
  }

  const StepIcon = steps[step].icon
  const options = step === 0 ? SECTORS : step === 1 ? GOALS : CHALLENGES

  return (
    <div className={styles.page}>
      <aside className={styles.story}>
        <div className={styles.brand}><BrandMark size={38} animated /><span>LocalKarar</span></div>
        <div className={styles.storyCopy}>
          <StepIcon size={28} aria-hidden="true" />
          <h1>{t('onboarding.story.title')}</h1>
          <p>{t('onboarding.story.description')}</p>
        </div>
        <p className={styles.privacy}><Bot size={15} aria-hidden="true" /> {t('onboarding.story.privacy')}</p>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.progress} aria-label={t('onboarding.progressAria')}>
            {steps.map((item, index) => (
              <span key={item.key} className={`${styles.progressItem} ${index === step ? styles.current : ''} ${index < step ? styles.done : ''}`}>
                <span>{index < step ? <Check size={13} /> : index + 1}</span>
                <small>{t(`onboarding.shortSteps.${item.key}`)}</small>
              </span>
            ))}
          </div>
          <button type="button" className={styles.skipTop} onClick={skip} disabled={skipping || saving}>
            {skipping ? t('onboarding.skipping') : t('onboarding.skipShort')}
          </button>
        </header>

        <section className={styles.question} aria-labelledby="onboarding-question">
          <span className={styles.counter}>{t('onboarding.stepCounter', { current: step + 1, total: 3 })}</span>
          <h2 id="onboarding-question">{t(`onboarding.questions.${steps[step].key}.title`)}</h2>
          <p>{t(`onboarding.questions.${steps[step].key}.description`)}</p>

          {profileNotice && (
            <div className={styles.notice} role="status">
              <span>{profileNotice}</span>
              <button type="button" onClick={() => setLoadAttempt(value => value + 1)}>{t('onboarding.retry')}</button>
            </div>
          )}

          <div className={styles.options} role={step === 2 ? 'group' : 'radiogroup'}>
            {options.map(value => {
              const selected = step === 0
                ? form.sector === value
                : step === 1
                  ? form.primaryGoal === value
                  : form.challenges.includes(value)
              const disabled = step === 2 && !selected && form.challenges.length >= 3
              return (
                <button
                  type="button"
                  key={value}
                  className={`${styles.option} ${selected ? styles.selected : ''}`}
                  role={step === 2 ? 'checkbox' : 'radio'}
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => step === 2 ? toggleChallenge(value) : choose(step === 0 ? 'sector' : 'primaryGoal', value)}
                >
                  <span>{t(`onboarding.answers.${steps[step].key}.${value}`)}</span>
                  <i aria-hidden="true">{selected && <Check size={15} />}</i>
                </button>
              )
            })}
          </div>
          {step === 2 && <p className={styles.selectionHint}>{t('onboarding.challengeLimit', { count: form.challenges.length })}</p>}

          {error && <div className={styles.error} role="alert"><AlertCircle size={16} /> {error}</div>}

          <footer className={styles.actions}>
            <button type="button" className={styles.back} onClick={() => { setError(''); setStep(current => Math.max(0, current - 1)) }} disabled={step === 0 || saving}>
              <ArrowLeft size={16} /> {t('onboarding.back')}
            </button>
            {step < 2 ? (
              <button type="button" className={styles.next} onClick={next} disabled={!valid}>
                {t('onboarding.continue')} <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" className={styles.next} onClick={finish} disabled={!valid || saving}>
                {saving ? t('onboarding.saving') : t('onboarding.prepare')} {!saving && <ArrowRight size={16} />}
              </button>
            )}
          </footer>

          {error && step === 2 && (
            <button type="button" className={styles.skipAfterError} onClick={skip} disabled={skipping}>
              {t('onboarding.continueWithoutSaving')}
            </button>
          )}
        </section>
      </main>
    </div>
  )
}
