import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import styles from './AkisVideosu.module.css'

/*
 * AKIŞ VİDEOSU — "Sessiz Akış" + "Yüzen Cam Kapsül"
 * (ürün sahibinin tasarım kararı, 22.08.2026)
 *
 * Temel his Instagram/LinkedIn: video akışta SESSİZ oynar ve üzerinde
 * hiçbir şey durmaz. Tek kalıcı öğe sağ altta küçük bir hoparlör
 * rozeti — sesin VAR olduğunu söyleyen işaret.
 *
 * Kontroller ancak istendiğinde beliriyor: alt ortada, arkası bulanık
 * cam bir kapsül. İçinde yalnız oynat, KALAN süre ve ses var — artı
 * büyütme. Zaman çubuğu BİLEREK YOK: akışta kirlilik yaratıyor.
 *
 * 🔴 Zaman çubuğunun bedeli: fareyle sarma yok. Karşılığı klavyede
 * duruyor (ok tuşları ±5sn) ve büyütülmüş görünümde tarayıcının kendi
 * çubuğu geliyor. Yani sarma kaybolmuyor, akıştan çıkıyor.
 *
 * DOKUNMA DAVRANIŞI: videoya dokunmak SESİ AÇAR, büyütmez.
 * Ürün sahibinin iki isteği çatışıyordu — önce "tıklayınca X gibi
 * büyüsün" demişti, sonra Instagram modelini istedi. Kararı: ilgilenen
 * kullanıcının ilk refleksi ses açmaktır; büyütme kapsüldeki ayrı
 * ikonda.
 */

/*
 * AYNI ANDA TEK VİDEO — ve doğru olanı.
 *
 * Modül düzeyinde çünkü kısıt bileşenler ARASINDA geçerli: akışta on
 * kart varsa yalnız biri oynayabilir. İki video birden oynarsa iki ses
 * üst üste biner ve mobil veriyi iki katına çıkarır.
 *
 * 🔴 NEDEN MERKEZİ SEÇİCİ (basit "eşiği geçen oynar" DEĞİL):
 * İlk yazımda her video kendi gözlemcisine bakıyordu. Ölçüldü ve
 * yanlış çıktı — 1400x900 ekranda iki video birden %60 eşiğini
 * geçebiliyor ve callback'i SON tetiklenen diğerini durduruyordu.
 * Gerçek ölçüm: birinci video %100 görünür hâlde DURUYOR, ikincisi
 * %73 görünürken OYNUYORDU. Doğrusu "en çok görünen".
 */
const gorunurluk = new Map()
let aktifVideo = null
let secimBekliyor = false

function digerleriniDurdur(video) {
  if (aktifVideo && aktifVideo !== video) aktifVideo.pause()
  aktifVideo = video
}

/*
 * Otomatik oynatma KİMDE kapalı olmalı.
 *
 * İkisi de kullanıcının açıkça ifade ettiği tercihler; görmezden
 * gelmek erişilebilirlik ve mobil veri açısından kaba olurdu.
 */
function otomatikOynatmaSerbestMi() {
  if (typeof window === 'undefined') return false
  const hareketAzalt = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  const veriTasarrufu = navigator.connection?.saveData === true
  return !hareketAzalt && !veriTasarrufu
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
  const [sure, setSure] = useState(0)
  const [anlik, setAnlik] = useState(0)
  const [kontrolGorunur, setKontrolGorunur] = useState(false)

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

  const sesiDegistir = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setSessiz(video.muted)
    /* Sesi açan kullanıcı videoyu izlemek istiyor; duruyorsa başlat. */
    if (!video.muted && video.paused) {
      digerleriniDurdur(video)
      video.play().catch(() => {})
    }
  }, [])

  const sar = useCallback(saniye => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = Math.min(Math.max(0, video.currentTime + saniye), video.duration)
  }, [])

  /*
   * Klavye. Yerleşik `controls` olmadığı için elle yazıldı; bunlar
   * video oynatıcılarında yerleşik kısayollar.
   *
   * ENTER BİLEREK YOK: bu tuşlar videonun üstündeki düğmede çalışıyor
   * ve o düğmenin işi "sesi aç/kapat". Enter tarayıcının kendi düğme
   * davranışına bırakıldı, yani etiketiyle aynı şeyi yapıyor.
   */
  function tusaBasildi(olay) {
    if (olay.key === ' ') {
      olay.preventDefault()
      oynatDurdur()
    } else if (olay.key === 'ArrowRight') {
      olay.preventDefault(); sar(5)
    } else if (olay.key === 'ArrowLeft') {
      olay.preventDefault(); sar(-5)
    } else if (olay.key === 'm' || olay.key === 'M') {
      sesiDegistir()
    }
  }

  /* KALAN süre gösteriliyor, geçen değil: akışta merak edilen "daha ne
     kadar sürer", "ne kadar oldu" değil. */
  const kalan = Math.max(0, (sure || 0) - anlik)

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
        onTimeUpdate={event => setAnlik(event.currentTarget.currentTime)}
      />

      {/*
        * Videonun tamamını kaplayan görünmez düğme: DOKUNMAK SESİ AÇAR.
        * `stopPropagation` şart — bu düğme kartın "gönderiyi aç"
        * katmanının içinde; durdurulmazsa dokunmak aynı anda gönderi
        * sayfasına da giderdi.
        */}
      <button
        type="button"
        className={styles.sesKatmani}
        onClick={olay => { olay.stopPropagation(); sesiDegistir() }}
        onKeyDown={tusaBasildi}
        aria-label={sessiz ? 'Sesi aç' : 'Sesi kapat'}
      />

      {/*
        * SESSİZ AKIŞ ROZETİ — tek kalıcı öğe.
        *
        * Sesin VAR olduğunu söylüyor. Olmasaydı kullanıcı sessiz oynayan
        * videoyu sessiz bir video sanar ve sesi hiç açmazdı.
        * `aria-hidden`: aynı işi yapan gerçek düğme yukarıda; ekran
        * okuyucuya iki kez duyurmanın anlamı yok.
        */}
      {sessiz && (
        <span className={styles.sesRozeti} aria-hidden="true">
          <VolumeX size={15} />
        </span>
      )}

      {/*
        * YÜZEN CAM KAPSÜL. Videodan bağımsız, havada duruyor.
        * Yalnız oynat, kalan süre, ses ve büyütme — zaman çubuğu yok.
        */}
      <div className={styles.kapsul}>
        <button
          type="button"
          onClick={olay => { olay.stopPropagation(); oynatDurdur() }}
          aria-label={oynuyor ? 'Durdur' : 'Oynat'}
        >
          {oynuyor ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <span className={styles.kalanSure}>{sureyiYaz(kalan)}</span>

        <button
          type="button"
          onClick={olay => { olay.stopPropagation(); sesiDegistir() }}
          aria-label={sessiz ? 'Sesi aç' : 'Sesi kapat'}
        >
          {sessiz ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        {onAc && (
          <button
            type="button"
            onClick={olay => { olay.stopPropagation(); onAc() }}
            aria-label="Videoyu büyüt"
          >
            <Maximize2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
