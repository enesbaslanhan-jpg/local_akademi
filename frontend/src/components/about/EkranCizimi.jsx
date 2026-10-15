import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGorunumeGirince } from '@/hooks/useGorunumeGirince'
import styles from './EkranCizimi.module.css'

/*
 * Hakkında sayfasındaki ürün görselleri gerçek LocalKarar ekranlarından
 * alınır. Dosyalar aynı 16:10 oranında tutulur; böylece modül kartları
 * arasında yükseklik sıçraması olmaz.
 *
 * Görseller açıklayıcı metnin yanında tekrar niteliğinde olduğu için boş
 * alt metin kullanılır. Bölümün anlamını başlık, açıklama ve maddeler taşır.
 */
/*
 * `detay`: o ekrandan tek bir kartın yakın çekimi. Kolajda tam sayfanın
 * üzerine bindirilir.
 *
 * Karar Araçları'nda detay YOK: yakın çekim betiği o sayfada uygun
 * ölçüde bir kart bulamadı. Uydurma bir görsel koymak yerine bölüm tek
 * görselle kalıyor; dosya eklendiğinde burada tanımlanması yeterli.
 */
const EKRANLAR = {
  'karar-araclari': { kaynak: '/about-screens/karar-araclari.webp?v=6', etiketKey: 'about.modules.decisionTools.title' },
  'isletme-takibi': { kaynak: '/about-screens/isletme-takibi.webp?v=6', detay: '/about-screens/isletme-takibi-detay.webp?v=6', etiketKey: 'about.modules.businessTracking.title' },
  'ai-mentor': { kaynak: '/about-screens/ai-mentor.webp?v=6', detay: '/about-screens/ai-mentor-detay.webp?v=6', etiketKey: 'about.modules.mentor.title' },
  hesaplamalar: { kaynak: '/about-screens/hesaplamalar.webp?v=6', detay: '/about-screens/hesaplamalar-detay.webp?v=6', etiketKey: 'about.modules.calculations.title' },
  kurslar: { kaynak: '/about-screens/kurslar.webp?v=6', detay: '/about-screens/kurslar-detay.webp?v=6', etiketKey: 'about.modules.courses.title' },
  topluluk: { kaynak: '/about-screens/topluluk.webp?v=6', detay: '/about-screens/topluluk-detay.webp?v=6', etiketKey: 'about.modules.community.title' }
}

export default function EkranCizimi({ tur }) {
  const [kolajRef, gorundu] = useGorunumeGirince()
  const { t } = useTranslation('common')
  const ekran = EKRANLAR[tur]
  const [acik, setAcik] = useState(false)

  useEffect(() => {
    if (!acik) return undefined

    const oncekiOverflow = document.body.style.overflow
    const kapat = event => event.key === 'Escape' && setAcik(false)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', kapat)

    return () => {
      document.body.style.overflow = oncekiOverflow
      window.removeEventListener('keydown', kapat)
    }
  }, [acik])

  if (!ekran) return null

  const { kaynak, detay, etiketKey } = ekran
  const etiket = t(etiketKey)

  return (
    <>
      {/*
        * Kolaj: tam sayfa görselin üzerine o ekrandan bir yakın çekim
        * bindiriliyor. Tek düz görsel yerine iki katman, bölüme derinlik
        * veriyor ve ekranın İÇİNDE ne olduğunu gösteriyor.
        *
        * Detay `aria-hidden`: aynı ekranın parçası, ekran okuyucuya ikinci
        * kez okutmak gürültü olurdu. Anlamı başlık, açıklama ve maddeler
        * taşıyor.
        */}
      <div
        ref={kolajRef}
        className={`${styles.kolaj} ${gorundu ? styles.kolajAcik : ''}`}
      >
      <figure className={styles.cerceve}>
        <button
          type="button"
          className={styles.onizleme}
          onClick={() => setAcik(true)}
          aria-label={t('about.screen.enlargeAria', { label: etiket })}
        >
          <img className={styles.goruntu} src={kaynak} alt={t('about.screen.imageAlt', { label: etiket })} loading="lazy" />
          <span className={styles.buyutRozeti} aria-hidden="true">{t('about.screen.enlarge')}</span>
        </button>
      </figure>

      {detay && (
        <img className={styles.detay} src={detay} alt="" aria-hidden="true" loading="lazy" />
      )}
      </div>

      {acik && (
        <div className={styles.arkaPlan} onMouseDown={event => event.target === event.currentTarget && setAcik(false)}>
          <section className={styles.pencere} role="dialog" aria-modal="true" aria-label={t('about.screen.imageAlt', { label: etiket })}>
            <header className={styles.pencereBasligi}>
              <div>
                <strong>{etiket}</strong>
                <span>{t('about.screen.closeHint')}</span>
              </div>
              <button type="button" className={styles.kapat} onClick={() => setAcik(false)} aria-label={t('about.screen.closeAria')}>
                {t('buttons.close')} <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className={styles.kaydirmaAlani}>
              <img className={styles.buyukGoruntu} src={kaynak} alt={t('about.screen.largeAlt', { label: etiket })} />
            </div>
          </section>
        </div>
      )}
    </>
  )
}
