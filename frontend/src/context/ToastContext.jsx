import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import styles from './ToastContext.module.css'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

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
        {toasts.map(t => (
          <div key={t.id} className={`${styles.toast} ${styles[t.type]}`} role="alert">
            <span className={styles.icon}>
              {t.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            </span>
            <span className={styles.message}>{t.message}</span>
            <button className={styles.close} onClick={() => removeToast(t.id)} aria-label="Kapat">
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
