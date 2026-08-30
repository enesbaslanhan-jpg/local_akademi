import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import styles from './Modal.module.css'
import { useTranslation } from 'react-i18next'

/*
 * `cerceve={false}` -- modal kendi zeminini, kenarligini ve golgesini
 * birakir; yalniz ortu, kapatma dugmesi ve kacis tusu kalir.
 *
 * NEDEN VAR: karar fisi kendi kagit yuzeyini tasiyor (krem zemin, kendi
 * kenarligi ve golgesi). Tema renkli bir kutu icine konunca iki ayri
 * yuzey ust uste biniyor, kagidin iki yaninda 70'er piksel tema zemini
 * kaliyordu -- olculdu. Icerigin kendi yuzeyi varsa modalinki fazladir.
 */
export default function Modal({ open, onClose, title, children, size = 'md', cerceve = true }) {
  const { t } = useTranslation('common')
  const overlayRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.focus()
    }
  }, [open])

  if (!open) return null

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose?.()
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`${styles.modal} ${styles[size]} ${cerceve ? '' : styles.cercevesiz}`} ref={contentRef} tabIndex={-1}>
        {/* Başlık verilmediğinde modal salt çerçeve olur: üstte yalnızca
            kapatma düğmesi kalır, ayırıcı çizgi çizilmez. */}
        <div className={`${styles.header} ${!title ? styles.headerBare : ''}`}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <button className={styles.close} onClick={onClose} aria-label={t('buttons.close')}>
            <X size={20} />
          </button>
        </div>
        <div className={`${styles.body} ${cerceve ? '' : styles.govdeCercevesiz}`}>{children}</div>
      </div>
    </div>
  )
}
