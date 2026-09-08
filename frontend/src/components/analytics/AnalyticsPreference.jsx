import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getAnalyticsConsent,
  isAnalyticsConfigured,
  setAnalyticsConsent
} from '@/services/analytics'
import styles from './AnalyticsPreference.module.css'

export default function AnalyticsPreference() {
  const { t } = useTranslation('common')
  const [configured, setConfigured] = useState(false)
  const [consent, setConsent] = useState(getAnalyticsConsent)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    isAnalyticsConfigured().then(value => { if (active) setConfigured(value) })
    return () => { active = false }
  }, [])

  if (!configured) return null

  async function update(nextConsent) {
    setSaving(true)
    try {
      await setAnalyticsConsent(nextConsent)
      setConsent(nextConsent)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.panel} aria-label={t('ui.analyticsPreference.title')}>
      <div>
        <strong>{t('ui.analyticsPreference.title')}</strong>
        <p>{t('ui.analyticsPreference.description')}</p>
        <small>{t(`ui.analyticsPreference.status.${consent}`)}</small>
      </div>
      <div className={styles.actions}>
        <button type="button" disabled={saving || consent === 'denied'} onClick={() => update('denied')}>{t('ui.analyticsPreference.reject')}</button>
        <button type="button" disabled={saving || consent === 'granted'} onClick={() => update('granted')}>{t('ui.analyticsPreference.allow')}</button>
      </div>
    </div>
  )
}
