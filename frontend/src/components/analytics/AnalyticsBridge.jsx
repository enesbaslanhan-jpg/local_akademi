import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useLocalization } from '@/context/LocalizationContext'
import {
  ANALYTICS_CONSENT_VERSION,
  ANALYTICS_CONSENT_EVENT,
  captureAnalytics,
  identifyAnalytics,
  normalizeAnalyticsRoute,
  startAnalytics
} from '@/services/analytics'
import { api } from '@/services/api'
import { getAnalyticsConsent } from '@/services/analytics'

export default function AnalyticsBridge() {
  const location = useLocation()
  const { user } = useAuth()
  const { activeWorkspace } = useWorkspace()
  const { uiLanguage } = useLocalization()
  const [consentRevision, setConsentRevision] = useState(0)

  useEffect(() => {
    const handleConsent = () => setConsentRevision(value => value + 1)
    window.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsent)
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, handleConsent)
  }, [])

  useEffect(() => {
    const handleError = event => {
      captureAnalytics('app_error', {
        source: 'window_error',
        error_code: String(event?.error?.name || 'runtime_error'),
        platform: 'web'
      })
    }
    const handleRejection = event => {
      captureAnalytics('app_error', {
        source: 'unhandled_rejection',
        error_code: String(event?.reason?.name || 'promise_rejection'),
        platform: 'web'
      })
    }
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const consent = getAnalyticsConsent()
    if (consent === 'unknown') return
    api.auth.updateAnalyticsConsent(consent, ANALYTICS_CONSENT_VERSION).catch(() => {})
  }, [consentRevision, user?.id])

  useEffect(() => {
    let cancelled = false
    startAnalytics().then(activeClient => {
      if (!activeClient || cancelled) return
      if (user?.id) {
        identifyAnalytics(user.id, {
          language: uiLanguage,
          user_role: user.role,
          workspace_role: activeWorkspace?.role,
          subscription_status: user.membership?.status
        })
      }
      captureAnalytics('page_view', {
        route: normalizeAnalyticsRoute(location.pathname),
        language: uiLanguage,
        platform: 'web'
      })
    })
    return () => { cancelled = true }
  }, [activeWorkspace?.role, consentRevision, location.pathname, uiLanguage, user?.id, user?.membership?.status, user?.role])

  return null
}
