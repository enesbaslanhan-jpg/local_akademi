import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Sparkles } from 'lucide-react'
import {
  FOUNDER_STAGES,
  BILLING_STARTS_AT,
  kuruculIndirimYuzdesi,
  kuruculUyeFiyati,
  fiyatYaz,
} from '@/config/billing'
import styles from './WelcomePage.module.css'

/*
 * KAYIT SONRASI KARŞILAMA — `/app/hosgeldin`.
 *
 * Ürün sahibinin sorusu neyi eksik bulduğunu söylüyordu: "kayıt oldun,
 * sonra direkt mi çıkacak karşına?" Ölçüldü, evet: kayıt biter bitmez
 * kullanıcı BOŞ bir panoya düşüyordu. `OnboardingPage` hiçbir yerden
 * yönlendirilmiyor, `WelcomeTour` da anket tamamlanmadan açılmıyor —
 * yani yeni kullanıcı hiçbir karşılama görmüyordu.
 *
 * 🔴 KART BİLGİSİ İSTENMİYOR, ÖDEME PANELİ AÇILMIYOR.
 * Ürün sahibi kararı (28.08.2026). İlk ay ücretsizken ödeme istemek,
 * "kart bilgisi istemiyoruz" vaadiyle doğrudan çelişirdi. Bu ekran
 * yalnız ANLATIR ve kenara çekilir.
 *
 * 🔴 ATLANABİLİR. "LocalKarar'a başla" birincil eylem; kullanıcıyı
 * tanıtımda tutmak bir karşılama değil, engel olurdu.
 */

export default function WelcomePage() {
  const { t, i18n } = useTranslation('common')
  const dil = i18n.resolvedLanguage
  const navigate = useNavigate()

  const ucretsizAy = FOUNDER_STAGES[0].months

  return (
    <div className={styles.sayfa}>
      <div className={styles.kart}>
        <span className={styles.rozet}>
          <Sparkles size={14} aria-hidden="true" />
          {t('billing.founderMember')}
        </span>

        <h1 className={styles.baslik}>{t('welcome.title')}</h1>
        <p className={styles.metin}>
          {t('welcome.description', { count: ucretsizAy })}
        </p>

        {/*
          * Zaman çizgisinin SADE hâli. Fiyat sayfasındaki bileşen
          * burada kullanılmıyor: orada dönem seçici, ayrıcalık bloğu ve
          * kaydırma animasyonu var — hepsi bu ekranda gereksiz gürültü.
          * Ortak olan tek şey `FOUNDER_STAGES`; sayılar yine tek
          * kaynaktan geliyor.
          */}
        <ol className={styles.cizgi}>
          {FOUNDER_STAGES.map((asama, i) => (
            <li key={asama.code} className={asama.months === null ? styles.asamaSon : undefined}>
              <span className={styles.asamaNo} aria-hidden="true">{i + 1}</span>
              <span className={styles.asamaMetin}>
                <strong>
                  {asama.monthlyPrice === 0
                    ? t('pricing.free')
                    : t('billing.pricePerMonth', { price: fiyatYaz(asama.monthlyPrice, dil) })}
                </strong>
                <small>
                  {asama.months === null
                    ? t('pricing.timeline.afterwards')
                    : t('pricing.timeline.months', { count: asama.months })}
                </small>
              </span>
            </li>
          ))}
        </ol>

        <p className={styles.indirim}>
          {t('welcome.discountNote', {
            percent: kuruculIndirimYuzdesi(),
            price: fiyatYaz(kuruculUyeFiyati(), dil),
          })}
        </p>

        {/* Ücretlendirme başlamadıysa bunu SÖYLE. Yukarıdaki fiyatları
            gösterip susmak, bugün ödeme alınacağını ima ederdi. */}
        {!BILLING_STARTS_AT && (
          <p className={styles.duyuru} role="status">{t('welcome.notStarted')}</p>
        )}

        <div className={styles.eylemler}>
          <button
            type="button"
            className={styles.birincilDugme}
            onClick={() => navigate('/app/dashboard', { replace: true })}
          >
            {t('welcome.start')} <ArrowRight size={16} aria-hidden="true" />
          </button>
          <Link to="/fiyatlar" className={styles.ikincilLink}>
            {t('welcome.seePricing')}
          </Link>
        </div>
      </div>
    </div>
  )
}
