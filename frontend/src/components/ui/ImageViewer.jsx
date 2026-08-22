import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import styles from './ImageViewer.module.css'

function sureyiYaz(saniye) {
  if (!Number.isFinite(saniye) || saniye < 0) return '0:00'
  const dakika = Math.floor(saniye / 60)
  return `${dakika}:${String(Math.floor(saniye % 60)).padStart(2, '0')}`
}

function ViewerVideo({ url, overlayText = '', mediaActions = null }) {
  const videoRef = useRef(null)
  const [oynuyor, setOynuyor] = useState(false)
  const [sessiz, setSessiz] = useState(false)
  const [sure, setSure] = useState(0)
  const [anlik, setAnlik] = useState(0)

  function oynatDurdur() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }

  function sesiDegistir() {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setSessiz(video.muted)
  }

  function konumuDegistir(event) {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Number(event.target.value)
    setAnlik(video.currentTime)
  }

  const ilerleme = sure > 0 ? Math.min(100, (anlik / sure) * 100) : 0

  return (
    <div className={styles.videoStage}>
      <video
        ref={videoRef}
        src={url}
        className={styles.image}
        autoPlay
        playsInline
        controlsList="nodownload"
        disablePictureInPicture
        onClick={oynatDurdur}
        onPlay={() => setOynuyor(true)}
        onPause={() => setOynuyor(false)}
        onLoadedMetadata={event => setSure(event.currentTarget.duration)}
        onTimeUpdate={event => setAnlik(event.currentTarget.currentTime)}
      />
      {!oynuyor && (
        <button type="button" className={styles.viewerPlay} onClick={oynatDurdur} aria-label="Videoyu oynat">
          <Play size={24} fill="currentColor" />
        </button>
      )}
      <div className={styles.videoHud}>
        {overlayText && <p className={styles.videoText}>{overlayText}</p>}
        {mediaActions && <div className={styles.mediaActions}>{mediaActions}</div>}
        <div className={styles.videoControls}>
          <button type="button" onClick={oynatDurdur} aria-label={oynuyor ? 'Videoyu durdur' : 'Videoyu oynat'}>
            {oynuyor ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
          </button>
          <span>{sureyiYaz(anlik)} / {sureyiYaz(sure)}</span>
          <button type="button" onClick={sesiDegistir} aria-label={sessiz ? 'Sesi aç' : 'Sesi kapat'}>
            {sessiz ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>
      <div className={styles.progressTrack} style={{ '--video-progress': `${ilerleme}%` }}>
        <input
          type="range"
          min="0"
          max={sure || 0}
          step="0.1"
          value={Math.min(anlik, sure || 0)}
          onChange={konumuDegistir}
          aria-label="Video konumu"
        />
      </div>
    </div>
  )
}

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
export default function ImageViewer({ url, alt = '', onClose, actions = null, caption = null, tur = 'image', yan = null, overlayText = '', mediaActions = null }) {
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
      aria-label={tur === 'video' ? 'Video önizleme' : 'Görsel önizleme'}
      /* Yalnız arka plana tıklayınca kapanır; içeriğe tıklayınca kapanmaz. */
      onClick={event => {
        event.stopPropagation()
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={`${styles.panel} ${yan ? styles.splitPanel : ''}`} ref={panelRef}>
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={yan ? 'Geri dön' : 'Kapat'}>
          {yan ? <ArrowLeft size={22} /> : <X size={22} />}
        </button>
        {/*
          * Video ve görsel AYNI kutuyu paylaşıyor: odak tuzağı, Esc,
          * kaydırma kilidi ve odağı geri verme burada zaten doğru
          * yazılmış. İkinci bir kopya çıkarmak, o dört davranışın
          * ikinci bir kez doğru yazılmasını gerektirirdi.
          *
          * Burada tarayıcının kendi `controls`u KULLANILIYOR (akıştaki
          * özel oynatıcı değil): tam ekran görünümde kullanıcı videoyu
          * yönetmek istiyor, gizlenen kontroller burada engel olurdu.
          */}
        <div className={styles.mediaColumn}>
          {tur === 'video'
            ? <ViewerVideo url={url} overlayText={overlayText} mediaActions={mediaActions} />
            : <img src={url} alt={alt} className={styles.image} />}
          {caption && <p className={styles.caption}>{caption}</p>}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
        {/* Gönderi ve yanıtları: ürün sahibinin "altında yorumlar
            falan" isteği. Geniş ekranda yanda, darda altta. */}
        {yan && <aside className={styles.yanPanel}>{yan}</aside>}
      </div>
    </div>
  )
}
