import { useId } from 'react'
import styles from './BrandMark.module.css'

/*
 * LocalKarar marka işareti — pusula iğnesi + C/K monogramı.
 *
 * CAM (glass) GÖVDE: gövde opak bir degrade, cam etkisi yalnız KENARDA.
 * Tasarım turunda dört varyant denendi; tamamen yarı saydam gövde açık
 * zeminde kayboluyordu. Kenar ışığı hem açık hem koyu zeminde aynı
 * okunurlukta kalıyor ve 16px favicon boyutunda da ayakta duruyor —
 * seçilen varyant bu.
 *
 * Renkler bilerek SABİT: `--surface-signature` gibi tema değişkenleri
 * kullanılsaydı logo açık/koyu temada başka görünürdü. Bir marka işareti
 * tema ile dönmemeli.
 */
export default function BrandMark({
  size = 28,
  className,
  /** Girişte bir kez oynayan pusula animasyonu. */
  animated = false,
  /** İmleç üstündeyken animasyonu tekrar oynatır (tıklanabilir yüzeyler). */
  interactive = false,
  title = 'LocalKarar'
}) {
  /* Aynı sayfada birden çok işaret olabilir (kenar çubuğu + sayfa başlığı);
     degrade id'leri çakışmasın diye örnek başına benzersiz. */
  const uid = useId().replace(/:/g, '')
  const govdeId = `bm-govde-${uid}`
  const kenarId = `bm-kenar-${uid}`

  const classes = [
    styles.mark,
    animated ? styles.animated : '',
    interactive ? styles.interactive : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={classes}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={govdeId} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#28616F" />
          <stop offset="1" stopColor="#14384A" />
        </linearGradient>
        {/* Kenar ışığı: sol üstte beyaz parlama, sağ altta cyan yansıma. */}
        <linearGradient id={kenarId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.92" />
          <stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.14" />
          <stop offset="1" stopColor="#94CEED" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      <rect width="40" height="40" rx="11" fill={`url(#${govdeId})`} />
      <rect
        x="0.9" y="0.9" width="38.2" height="38.2" rx="10.2"
        fill="none"
        stroke={`url(#${kenarId})`}
        strokeWidth="1.4"
      />

      {/* Pusula kadranı — C harfini anımsatan açık yay.
          pathLength="1" çizim animasyonunu uzunluktan bağımsız kılar. */}
      <path
        className={styles.arc}
        d="M28.5 12.5a11 11 0 1 0 0 15"
        pathLength="1"
        stroke="#F4FAFC"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Pusula iğnesi — K harfinin çapraz kolunu da temsil eder */}
      <path
        className={styles.needle}
        d="M20 11.5 24.5 20 20 28.5 15.5 20Z"
        fill="#E0A455"
      />

      <circle cx="20" cy="20" r="2.1" fill="#F4FAFC" />
    </svg>
  )
}
