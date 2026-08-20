import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import styles from './ImageViewer.module.css'

/**
 * Tam ekran görsel görüntüleyici.
 *
 * Topluluk gönderilerindeki görseller ve profil fotoğrafı aynı bileşeni
 * kullanır — iki ayrı kopya, iki ayrı davranış demek olurdu.
 *
 * Davranış:
 *  - Esc ile kapanır, arka plana tıklayınca kapanır
 *  - Açılışta kapatma düğmesine odaklanır, kapanınca odak geldiği yere döner
 *  - Odak kutunun içinde döner (Tab ile arkadaki sayfaya kaçmaz)
 *  - Açıkken sayfa kaymaz
 *
 * `actions` verilirse görselin altında eylem çubuğu çıkar (ör. profil
 * fotoğrafı için "Değiştir" / "Kaldır").
 */
export default function ImageViewer({ url, alt = '', onClose, actions = null, caption = null }) {
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const oncekiOdakRef = useRef(null)

  useEffect(() => {
    oncekiOdakRef.current = document.activeElement

    function onKey(event) {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab') return

      /* Odak tuzağı: Tab, kutunun içindeki öğeler arasında dönmeli. */
      const odaklanabilir = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!odaklanabilir?.length) return
      const ilk = odaklanabilir[0]
      const son = odaklanabilir[odaklanabilir.length - 1]
      if (event.shiftKey && document.activeElement === ilk) {
        event.preventDefault(); son.focus()
      } else if (!event.shiftKey && document.activeElement === son) {
        event.preventDefault(); ilk.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    const oncekiTasma = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = oncekiTasma
      /* Odağı geldiği yere geri ver — klavye kullanıcısı yerini kaybetmesin. */
      oncekiOdakRef.current?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Görsel önizleme"
      /* Yalnız arka plana tıklayınca kapanır; içeriğe tıklayınca kapanmaz. */
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className={styles.panel} ref={panelRef}>
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Kapat">
          <X size={22} />
        </button>
        <img src={url} alt={alt} className={styles.image} />
        {caption && <p className={styles.caption}>{caption}</p>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  )
}
