import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { RATE_LIMIT_EVENT, MEMBERSHIP_EXPIRED_EVENT, ERROR_CODES } from '@/services/api'
import styles from './ToastContext.module.css'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const { t } = useTranslation('common')
  const [toasts, setToasts] = useState([])
  const rateLimitShownUntil = useRef(0)
  const membershipShownUntil = useRef(0)

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    const handleRateLimit = (event) => {
      const seconds = Number(event.detail?.retryAfterSeconds)
      const now = Date.now()
      if (now < rateLimitShownUntil.current) return
      rateLimitShownUntil.current = now + Math.max(3000, Number.isFinite(seconds) ? seconds * 1000 : 5000)
      const message = Number.isFinite(seconds) && seconds > 0
        ? t('errors.rateLimitWithSeconds', { seconds })
        : t('errors.rateLimit')
      addToast(message, 'warning', 7000)
    }
    /*
     * Salt okunur mod uyarısı.
     *
     * Sunucunun gönderdiği metin KULLANILIYOR, burada ikinci bir metin
     * yazılmıyor: aynı durumu iki yerde anlatmak kaçınılmaz olarak
     * ayrışır ve kullanıcı iki farklı açıklama görür. Sunucu metni
     * gelmezse yerel yedek devreye giriyor.
     *
     * Aynı boğma mantığı hız sınırındaki gibi: bir yazma denemesi
     * arka arkaya birkaç istek üretebilir, kullanıcı üst üste dört
     * bildirim görmemeli.
     */
    const handleMembershipExpired = (event) => {
      const now = Date.now()
      if (now < membershipShownUntil.current) return
      membershipShownUntil.current = now + 8000
      addToast(event.detail?.mesaj || t('errors.membershipExpired'), 'warning', 9000)
    }

    window.addEventListener(RATE_LIMIT_EVENT, handleRateLimit)
    window.addEventListener(MEMBERSHIP_EXPIRED_EVENT, handleMembershipExpired)
    return () => {
      window.removeEventListener(RATE_LIMIT_EVENT, handleRateLimit)
      window.removeEventListener(MEMBERSHIP_EXPIRED_EVENT, handleMembershipExpired)
    }
  }, [addToast, t])

  const toast = useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 6000),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning', 5000)
  }), [addToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={styles.container} aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`} role="alert">
            <span className={styles.icon}>
              {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            </span>
            <span className={styles.message}>{toast.message}</span>
            <button className={styles.close} onClick={() => removeToast(toast.id)} aria-label={t('buttons.close')}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
