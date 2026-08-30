import React from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import styles from './MentorErrorAlert.module.css'

export function getSafeErrorMessage(rawError, t) {
  if (!rawError) return null
  
  const errStr = String(rawError).toLowerCase()

  if (errStr.includes('network') || errStr.includes('fetch') || errStr.includes('econnrefused')) {
    return t('errors.mentorNetwork')
  }
  
  if (errStr.includes('timeout')) {
    return t('errors.mentorTimeout')
  }
  
  if (errStr.includes('429') || errStr.includes('rate limit') || errStr.includes('too many requests')) {
    return t('errors.mentorRateLimit')
  }
  
  if (errStr.includes('401') || errStr.includes('unauthorized')) {
    return t('errors.mentorUnauthorized')
  }
  
  if (errStr.includes('provider') || errStr.includes('500') || errStr.includes('502') || errStr.includes('503')) {
    return t('errors.mentorProvider')
  }

  return t('errors.mentorFallback')
}

export default function MentorErrorAlert({ error, onDismiss }) {
  const { t } = useTranslation('common')
  if (!error) return null

  const safeMsg = getSafeErrorMessage(error, t)

  return (
    <div className={styles.alert} role="alert">
      <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 text-red-500 ${styles.alertIcon}`} />
      <div className={`flex-1 ${styles.alertBody}`}>
        <p className={`font-medium ${styles.alertTitle}`}>{t('errors.mentorTitle')}</p>
        <p className={`opacity-90 ${styles.alertMessage}`}>{safeMsg}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className={`text-red-400 hover:text-red-600 p-1 rounded-md ${styles.dismissBtn}`} aria-label={t('buttons.close')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
