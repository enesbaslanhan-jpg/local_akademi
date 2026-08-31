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
/*
 * Açık pencerelerin yığını — Escape'in hangisine ait olduğunu
 * belirlemek için. Modül kapsamında, çünkü karar pencereler ARASINDA
 * veriliyor; bileşenin kendi durumu bunu bilemez.
 */
const acikPencereler = []

/*
 * 🔴 SAYFA KAYDIRMASI YIĞINA BAĞLI, PENCEREYE DEĞİL.
 *
 * Önceden her pencere açılışta `body.style.overflow`u KENDİ içinde
 * saklıyor, kapanışta onu geri yazıyordu. Tek pencere varken bu hep
 * `''` oluyordu ve sorun görünmüyordu.
 *
 * İki pencere üst üste açılabilir hâle gelince (ödeme panelinin
 * üstünde yasal metin) bozuldu ve ÜRÜN SAHİBİ YAKALADI: "sayfalar
 * aşağı yukarı oynamıyor". Araya bir yeniden çizim girdiğinde React
 * önce bütün temizlikleri, sonra bütün etkileri çalıştırıyor; dıştaki
 * pencere bu sırada `prev` olarak içtekinin bıraktığı `'hidden'`ı
 * yakalıyordu. Kapanınca onu geri yazıyor ve sayfa KALICI olarak
 * kilitleniyordu — hiçbir pencere açık olmadığı hâlde.
 *
 * Doğrusu: özgün değer yığın BOŞKEN bir kez saklanır, yığın yeniden
 * boşaldığında geri verilir. Kaç pencerenin açılıp kapandığı fark
 * etmez.
 */
let ozgunTasma = null

export default function Modal({ open, onClose, title, children, size = 'md', cerceve = true }) {
  const { t } = useTranslation('common')
  const overlayRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    if (!open) return

    if (acikPencereler.length === 0) ozgunTasma = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    /*
     * 🔴 ESCAPE YALNIZ EN ÜSTTEKİ PENCEREYİ KAPATIR.
     *
     * Her Modal dinleyicisini `document`e bağlıyor. İki pencere üst
     * üste açıkken (ödeme paneli + üstünde yasal metin) tek bir
     * Escape İKİSİNİ BİRDEN kapatıyordu: kullanıcı metni kapatmak
     * isterken işaretlediği üç onayı da kaybediyordu.
     *
     * Yığın modül kapsamında ve açılış sırasını tutuyor; yalnız
     * sondaki kendi `onClose`unu çağırıyor.
     */
    const belirtec = {}
    acikPencereler.push(belirtec)

    const handleKey = (e) => {
      if (e.key !== 'Escape') return
      if (acikPencereler[acikPencereler.length - 1] !== belirtec) return
      onClose?.()
    }
    document.addEventListener('keydown', handleKey)

    return () => {
      const sira = acikPencereler.indexOf(belirtec)
      if (sira !== -1) acikPencereler.splice(sira, 1)
      /* Yalnız SON pencere kapanınca geri veriliyor: alttaki hâlâ
         açıkken sayfayı arkadan kaydırılabilir yapmak yanlış olurdu. */
      if (acikPencereler.length === 0) {
        document.body.style.overflow = ozgunTasma ?? ''
        ozgunTasma = null
      }
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
