import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Smartphone, Receipt, Camera, Wallet, Compass, Check } from 'lucide-react'
import Acilis from './Acilis'
import { useGorunumeGirince } from '@/hooks/useGorunumeGirince'
import styles from './MobilUygulama.module.css'

/*
 * HAKKINDA → MOBİL UYGULAMA BÖLÜMÜ (ürün sahibi isteği, 13.09.2026).
 *
 * İki parça: mağaza düğmeleri ve üç ekran görüntüsü.
 *
 * 🔴 MAĞAZA DÜĞMELERİ ADRESİ SUNUCUDAN OKUR (`/app-config` →
 * `storeUrls`). Uygulama henüz mağazada değil; adres yokken düğme
 * "Yakında" yazar ve tıklanmaz. Sahte bir bağlantı ya da boş `href`
 * koymak, kullanıcıyı boşuna dokundurmak olurdu. Mağaza yayını
 * çıkınca sunucudaki adres girilir ve düğmeler kod değişmeden açılır —
 * mobil uygulamanın "güncelleme var" kontrolü de aynı alanı okuyor.
 *
 * Ekran görüntüleri gerçek: emülatörden alındı (13.09.2026), koyu tema,
 * yerel test verisi. Föydeki mockup değil, uygulamanın kendisi.
 * Üç görüntü yelpaze gibi üst üste durur; görünüme girince ve fare
 * üstüne gelince açılır. Hareket kısıtlıysa doğrudan açık çizilir
 * (DESIGN.md §23.3).
 */
const EKRANLAR = [
  { dosya: 'mobil-ana-sayfa.png', anahtar: 'home' },
  { dosya: 'mobil-isletme-takibi.png', anahtar: 'business' },
  { dosya: 'mobil-cari-hesap.png', anahtar: 'account' }
]

/* Sıra i18n'deki `about.mobile.items` ile birebir. */
const MADDE_IKONLARI = [Receipt, Camera, Wallet, Compass]

export default function MobilUygulama() {
  const { t } = useTranslation()
  const [magazalar, setMagazalar] = useState({ android: null, ios: null })
  /* Yelpaze görünüme girince açılır; sınıf CSS modülünün kendi sınıfı,
     Acilis'in karma adlı sınıfına yaslanmıyor. */
  const [yelpazeRef, yelpazeGorundu] = useGorunumeGirince()

  useEffect(() => {
    let aktif = true
    fetch('/app-config', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(cfg => { if (aktif && cfg?.storeUrls) setMagazalar(cfg.storeUrls) })
      .catch(() => { /* adres yoksa düğmeler "Yakında" kalır */ })
    return () => { aktif = false }
  }, [])

  return (
    <Acilis as="section" className={styles.bolum} aria-labelledby="mobil-baslik">
      <div className={styles.metin}>
        <span className={styles.ikon}><Smartphone size={20} aria-hidden="true" /></span>
        <h2 id="mobil-baslik">{t('about.mobile.title')}</h2>
        {/* Madde madde, simgeli (ürün sahibi, 14.09.2026): düz paragraf
            okunmuyordu. Her madde uygulamada GERÇEKTEN olan bir şey. */}
        <p className={styles.giris}>{t('about.mobile.lead')}</p>
        <ul className={styles.maddeler}>
          {MADDE_IKONLARI.map((Ikon, i) => (
            <li key={i}>
              <span className={styles.maddeIkon}><Ikon size={16} aria-hidden="true" /></span>
              <span>
                <strong>{t(`about.mobile.items.${i}.t`)}</strong>
                <span className={styles.maddeAciklama}>{t(`about.mobile.items.${i}.d`)}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.not}><Check size={14} aria-hidden="true" /> {t('about.mobile.outro')}</p>
        <div className={styles.magazalar}>
          <MagazaDugmesi url={magazalar.android} etiket="Google Play" altEtiket={t('about.mobile.android')} />
          <MagazaDugmesi url={magazalar.ios} etiket="App Store" altEtiket={t('about.mobile.ios')} />
        </div>
      </div>

      <div ref={yelpazeRef} className={`${styles.yelpaze} ${yelpazeGorundu ? styles.acik : ''}`} aria-label={t('about.mobile.screensLabel')}>
        {EKRANLAR.map((e, i) => (
          <figure key={e.dosya} className={styles.telefon} style={{ '--sira': i }}>
            <img
              src={`/about-screens/${e.dosya}`}
              alt={t(`about.mobile.screens.${e.anahtar}`)}
              width="540"
              height="1200"
              loading="lazy"
              decoding="async"
            />
          </figure>
        ))}
        {/* Tek alt yazı: üç ayrı yazı yelpazede üst üste biniyordu (ölçüldü). */}
        <p className={styles.altyazi}>{EKRANLAR.map(e => t(`about.mobile.screens.${e.anahtar}`).split(" — ")[0]).join(" · ")}</p>
      </div>
    </Acilis>
  )
}

function MagazaDugmesi({ url, etiket, altEtiket }) {
  const { t } = useTranslation()
  if (!url) {
    return (
      <span className={`${styles.magaza} ${styles.magazaKapali}`} aria-disabled="true">
        <small>{t('about.mobile.soon')}</small>
        <strong>{etiket}</strong>
      </span>
    )
  }
  return (
    <a className={styles.magaza} href={url} target="_blank" rel="noopener noreferrer">
      <small>{altEtiket}</small>
      <strong>{etiket}</strong>
    </a>
  )
}
