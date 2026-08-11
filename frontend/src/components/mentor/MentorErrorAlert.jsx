import React from 'react'
import { AlertCircle } from 'lucide-react'
import styles from './MentorErrorAlert.module.css'

export function getSafeErrorMessage(rawError) {
  if (!rawError) return null
  
  const errStr = String(rawError).toLowerCase()

  if (errStr.includes('network') || errStr.includes('fetch') || errStr.includes('ulaşılamadı') || errStr.includes('econnrefused')) {
    return 'AI Mentor sunucusuna ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.'
  }
  
  if (errStr.includes('timeout') || errStr.includes('zaman aşımı')) {
    return 'Yanıt beklenenden uzun sürdü. Mesajı tekrar deneyebilirsiniz.'
  }
  
  if (errStr.includes('429') || errStr.includes('rate limit') || errStr.includes('too many requests')) {
    return 'Çok kısa sürede fazla istek gönderildi. Biraz bekleyip tekrar deneyin.'
  }
  
  if (errStr.includes('401') || errStr.includes('unauthorized')) {
    return 'Oturumunuz sona ermiş olabilir. Yeniden giriş yapın.'
  }
  
  if (errStr.includes('provider') || errStr.includes('500') || errStr.includes('502') || errStr.includes('503')) {
    return 'AI Mentor şu anda yanıt üretemiyor. Birkaç saniye sonra tekrar deneyin.'
  }

  // Fallback safe message
  return 'Sistemde geçici bir sorun oluştu. Lütfen daha sonra tekrar deneyin.'
}

export default function MentorErrorAlert({ error, onDismiss }) {
  if (!error) return null

  const safeMsg = getSafeErrorMessage(error)

  return (
    <div className={styles.alert} role="alert">
      <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 text-red-500 ${styles.alertIcon}`} />
      <div className={`flex-1 ${styles.alertBody}`}>
        <p className={`font-medium ${styles.alertTitle}`}>Bağlantı Hatası</p>
        <p className={`opacity-90 ${styles.alertMessage}`}>{safeMsg}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className={`text-red-400 hover:text-red-600 p-1 rounded-md ${styles.dismissBtn}`} aria-label="Kapat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
