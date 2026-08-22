import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import styles from './AkisVideosu.module.css'

/*
 * AKIŞ VİDEOSU — topluluk akışındaki video oynatıcı.
 *
 * Neden yeni bir bileşen: `components/ui/VideoPlayer.jsx` KURS videoları
 * için (`koId`, ilerleme kaydı, tarayıcının kendi `controls`u). Farklı
 * bir iş; oraya akış davranışı eklemek iki işi tek dosyada boğardı.
 *
 * Neden tarayıcının kendi kontrolleri kullanılmıyor: ürün sahibinin
 * tespiti — "eskiden kalma bir yapıda, o ilerleme çubuğu, büyüt imleci
 * öyle olmaz". Yerleşik çubuk her tarayıcıda farklı görünüyor ve
 * temaya uymuyor.
 *
 * 🔴 BUNUN BEDELİ VAR: `controls` kaldırıldığı an tarayıcının verdiği
 * KLAVYE DESTEĞİ de gider. Aşağıdaki `tusaBasildi` onun yerine geçiyor
 * (boşluk, ok tuşları, M). Bu olmadan oynatıcı klavye kullanıcısı için
 * tamamen kullanılamaz olurdu.
 */

/*
 * AYNI ANDA TEK VİDEO — ve doğru olanı.
 *
 * Modül düzeyinde tutuluyor çünkü kısıt bileşenler ARASINDA geçerli:
 * akışta on kart varsa yalnız biri oynayabilir. İki video birden
 * oynarsa iki ses üst üste biner ve mobil veriyi iki katına çıkarır.
 *
 * 🔴 NEDEN MERKEZİ BİR SEÇİCİ VAR (basit "eşiği geçen oynar" DEĞİL):
 *
 * İlk yazımda her video kendi `IntersectionObserver`ına bakıp eşiği
 * geçince oynuyordu. Ölçüldü ve yanlış çıktı: 1400x900 ekranda iki
 * video birden %60 eşiğini geçebiliyor ve callback'i SON tetiklenen
 * diğerini durduruyordu. Gerçek ölçüm — birinci video %100 görünür
 * hâlde DURUYOR, ikincisi %73 görünürken OYNUYORDU.
 *
 * Doğru davranış "eşiği geçen" değil, "EN ÇOK GÖRÜNEN" olmalı:
 * kullanıcı neye bakıyorsa o oynamalı.
 */
const gorunurluk = new Map()
let aktifVideo = null
let secimBekliyor = false

function digerleriniDurdur(video) {
  if (aktifVideo && aktifVideo !== video) {
    aktifVideo.pause()
  }
  aktifVideo = video
}

function kazananiSec() {
  secimBekliyor = false
  let kazanan = null
  let enIyi = 0
  for (const [video, oran] of gorunurluk) {
    if (oran >= 0.6 && oran > enIyi) {
      enIyi = oran
      kazanan = video
    }
  }

  for (const [video] of gorunurluk) {
    if (video !== kazanan) video.pause()
  }
  if (!kazanan) {
    aktifVideo = null
    return
  }
  if (!otomatikOynatmaSerbestMi()) return

  aktifVideo = kazanan
  /* `muted` ŞART: tarayıcılar sesli otomatik oynatmayı engelliyor ve
     `play()` reddedilen bir söz döndürüyor. */
  kazanan.muted = true
  if (kazanan.paused) kazanan.play().catch(() => {})
}

/* Aynı kaydırmada birden çok video rapor veriyor; her birinde yeniden
   seçmek gereksiz. Tek karede bir kez seçiliyor. */
function secimIste() {
  if (secimBekliyor) return
  secimBekliyor = true
  requestAnimationFrame(kazananiSec)
}

/*
 * Otomatik oynatma KİMDE kapalı olmalı.
 *
 * İkisi de kullanıcının açıkça ifade ettiği tercihler; görmezden
 * gelmek erişilebilirlik ve mobil veri açısından kaba olurdu.
 *   - `prefers-reduced-motion`: hareket duyarlılığı olan kullanıcı
 *   - `saveData`: veri tasarrufu açık olan kullanıcı
 */
function otomatikOynatmaSerbestMi() {
  if (typeof window === 'undefined') return false
  const hareketAzalt = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  const veriTasarrufu = navigator.connection?.saveData === true
  return !hareketAzalt && !veriTasarrufu
}

function sureyiYaz(saniye) {
  if (!Number.isFinite(saniye) || saniye < 0) return '0:00'
  const dk = Math.floor(saniye / 60)
  const sn = Math.floor(saniye % 60)
  return `${dk}:${String(sn).padStart(2, '0')}`
}

export default function AkisVideosu({ src, onAc, kucuk = false }) {
  const videoRef = useRef(null)
  const sarmalRef = useRef(null)
  const [oynuyor, setOynuyor] = useState(false)
  const [sessiz, setSessiz] = useState(true)
  const [ilerleme, setIlerleme] = useState(0)
  const [sure, setSure] = useState(0)
  const [anlik, setAnlik] = useState(0)
  const [kontrolGorunur, setKontrolGorunur] = useState(false)

  /* Ekrana girince oynat, çıkınca durdur. */
  useEffect(() => {
    const video = videoRef.current
    const sarmal = sarmalRef.current
    if (!video || !sarmal) return

    /* Çok sayıda eşik: görünürlük oranı kaydırma boyunca güncellensin,
       yoksa "en çok görünen" hesabı bayat veriyle yapılırdı. */
    const esikler = Array.from({ length: 11 }, (_, i) => i / 10)
    const gozlemci = new IntersectionObserver(([kayit]) => {
      gorunurluk.set(video, kayit.isIntersecting ? kayit.intersectionRatio : 0)
      secimIste()
    }, { threshold: esikler })

    gozlemci.observe(sarmal)
    return () => {
      gozlemci.disconnect()
      gorunurluk.delete(video)
      if (aktifVideo === video) aktifVideo = null
    }
  }, [])

  const oynatDurdur = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      digerleriniDurdur(video)
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [])

  const sesiAc = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setSessiz(video.muted)
  }, [])

  const sar = useCallback(saniye => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = Math.min(Math.max(0, video.currentTime + saniye), video.duration)
  }, [])

  /*
   * Klavye. Yerleşik `controls` kaldırıldığı için bunlar elle yazıldı;
   * kısayollar video oynatıcılarında yerleşik olan tuşlar.
   */
  function tusaBasildi(olay) {
    /*
     * ENTER BİLEREK YOK.
     *
     * Bu tuşlar videonun üstündeki düğmenin üzerinde çalışıyor ve o
     * düğmenin etiketi "Videoyu büyüt". Enter'ı burada yakalayıp
     * oynat/durdur yapmak, klavye kullanıcısına etiketiyle çelişen bir
     * davranış verirdi: okuduğu şey "büyüt", olan şey "durdu".
     * Enter tarayıcının kendi düğme davranışına bırakıldı (büyütür);
     * boşluk oynat/durdur yapar.
     */
    if (olay.key === ' ') {
      olay.preventDefault()
      oynatDurdur()
    } else if (olay.key === 'ArrowRight') {
      olay.preventDefault(); sar(5)
    } else if (olay.key === 'ArrowLeft') {
      olay.preventDefault(); sar(-5)
    } else if (olay.key === 'm' || olay.key === 'M') {
      sesiAc()
    }
  }

  function cubugaTiklandi(olay) {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    const kutu = olay.currentTarget.getBoundingClientRect()
    const oran = (olay.clientX - kutu.left) / kutu.width
    video.currentTime = Math.min(Math.max(0, oran), 1) * video.duration
  }

  return (
    <div
      ref={sarmalRef}
      className={`${styles.sarmal} ${kucuk ? styles.kucuk : ''} ${kontrolGorunur ? styles.kontrolAcik : ''}`}
      onMouseEnter={() => setKontrolGorunur(true)}
      onMouseLeave={() => setKontrolGorunur(false)}
    >
      <video
        ref={videoRef}
        className={styles.video}
        src={src}
        playsInline
        muted={sessiz}
        loop
        preload="metadata"
        /* İndirme ve resim-içinde-resim istenmedi. */
        controlsList="nodownload"
        disablePictureInPicture
        onPlay={() => setOynuyor(true)}
        onPause={() => setOynuyor(false)}
        onLoadedMetadata={event => setSure(event.currentTarget.duration)}
        onTimeUpdate={event => {
          const v = event.currentTarget
          setAnlik(v.currentTime)
          setIlerleme(v.duration ? (v.currentTime / v.duration) * 100 : 0)
        }}
      />

      {/*
        * Videonun üstündeki saydam katman. Tıklamak gönderiyi/büyütmeyi
        * açar; kontrollere tıklamak açmaz çünkü kontroller BU
        * katmanın kardeşi, çocuğu değil — olay hiç buraya gelmiyor.
        */}
      <button
        type="button"
        className={styles.acmaKatmani}
        /*
         * `stopPropagation` ŞART: bu düğme, kartın "gönderiyi aç"
         * katmanının İÇİNDE. Durdurulmazsa videoya tıklamak hem
         * büyütücüyü açıyor hem de gönderi sayfasına gidiyordu —
         * gezinme kazanıyor ve büyütücü hiç görünmüyordu.
         */
        onClick={olay => { olay.stopPropagation(); onAc ? onAc() : oynatDurdur() }}
        onKeyDown={tusaBasildi}
        aria-label={onAc ? 'Videoyu büyüt' : 'Oynat veya durdur'}
      />

      <div className={styles.kontroller}>
        <button type="button" onClick={oynatDurdur} aria-label={oynuyor ? 'Durdur' : 'Oynat'}>
          {oynuyor ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <span className={styles.sure}>{sureyiYaz(anlik)} / {sureyiYaz(sure)}</span>

        {/*
          * İlerleme çubuğu: normalde ince, üzerine gelince kalınlaşıyor.
          * `role="slider"` ve ok tuşları, fare olmadan da sarmayı
          * mümkün kılıyor.
          */}
        <div
          className={styles.cubuk}
          onClick={cubugaTiklandi}
          onKeyDown={tusaBasildi}
          role="slider"
          tabIndex={0}
          aria-label="Video konumu"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ilerleme)}
        >
          <span className={styles.cubukDolu} style={{ width: `${ilerleme}%` }} />
        </div>

        <button type="button" onClick={sesiAc} aria-label={sessiz ? 'Sesi aç' : 'Sesi kapat'}>
          {sessiz ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {onAc && (
          <button type="button" onClick={onAc} aria-label="Videoyu büyüt">
            <Maximize2 size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
