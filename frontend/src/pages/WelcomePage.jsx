import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Sparkles, LayoutDashboard, Scale, Building2, Bot, Users, BookOpen, Calculator } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { captureAnalytics } from '@/services/analytics'
import {
  FOUNDER_STAGES,
  BILLING_STARTS_AT,
  kuruculIndirimYuzdesi,
  kuruculUyeFiyati,
  fiyatYaz,
} from '@/config/billing'
import styles from './WelcomePage.module.css'

/*
 * KAYIT SONRASI KARŞILAMA — `/app/hosgeldin` (yeniden, 16.09.2026).
 *
 * Önceki hâli yalnız fiyat kademelerini gösteriyordu; ürün sahibi Google ile
 * yeni hesap açıp denedi: "ekran bomboş, sadece fiyatlar çıkıyor, giren bunun
 * ne olduğunu anlamıyor." Şimdi sıra: NE İŞE YARAR (yedi bölüm, simge + bir
 * cümle) → fiyat tek satır → "Başlayalım".
 *
 * Bölüm metinleri karşılama TURUNUN adımlarıyla aynı anahtarlardan
 * (`tour.steps.*`): tur az sonra aynı ekranları gezdirecek, iki yerde iki
 * ayrı cümle olmasın. Kurslar ve Hesaplamalar turda adım değil; onların
 * cümlesi `welcome.sections.*`ta.
 *
 * "Başlayalım" → /app/onboarding (3 soruluk anket) → pano → WelcomeTour.
 * Tur ancak anket bittikten sonra açılıyor (WelcomeTour.jsx); anket hiçbir
 * yerden yönlendirilmediği için yeni kullanıcı ikisini de hiç görmüyordu.
 * "Şimdilik geç" doğrudan panoya gider — anket zorunlu değil.
 *
 * 🔴 KART BİLGİSİ İSTENMİYOR, ÖDEME PANELİ AÇILMIYOR (28.08.2026 kararı).
 */

const BOLUMLER = [
  { key: 'dashboard', Icon: LayoutDashboard, baslikKey: 'tour.steps.dashboard.title', metinKey: 'tour.steps.dashboard.description' },
  { key: 'businessTracking', Icon: Building2, baslikKey: 'tour.steps.businessTracking.title', metinKey: 'tour.steps.businessTracking.description' },
  { key: 'decisionTools', Icon: Scale, baslikKey: 'tour.steps.decisionTools.title', metinKey: 'tour.steps.decisionTools.description' },
  { key: 'calculations', Icon: Calculator, baslikKey: 'welcome.sections.calculations.title', metinKey: 'welcome.sections.calculations.description' },
  { key: 'mentor', Icon: Bot, baslikKey: 'tour.steps.mentor.title', metinKey: 'tour.steps.mentor.description' },
  { key: 'courses', Icon: BookOpen, baslikKey: 'welcome.sections.courses.title', metinKey: 'welcome.sections.courses.description' },
  { key: 'community', Icon: Users, baslikKey: 'tour.steps.community.title', metinKey: 'tour.steps.community.description' }
]

export default function WelcomePage() {
  const { t, i18n } = useTranslation('common')
  const dil = i18n.resolvedLanguage
  const navigate = useNavigate()
  const { user } = useAuth()

  const ucretsizAy = FOUNDER_STAGES[0].months
  const sonraki = FOUNDER_STAGES.filter(a => a.monthlyPrice > 0)
  const ad = (user?.name || '').trim().split(/\s+/)[0]

  function basla() {
    captureAnalytics('welcome_started', { platform: 'web' })
    navigate('/app/onboarding', { replace: true })
  }
  function gec() {
    captureAnalytics('welcome_skipped', { platform: 'web' })
    navigate('/app/dashboard', { replace: true })
  }

  return (
    <div className={styles.sayfa}>
      <div className={styles.kart}>
        <header className={styles.ust}>
          <span className={styles.rozet}>
            <Sparkles size={14} aria-hidden="true" />
            {t('billing.founderMember')}
          </span>
          <h1 className={styles.baslik}>
            {ad ? t('welcome.titleNamed', { name: ad }) : t('welcome.title')}
          </h1>
          <p className={styles.metin}>{t('welcome.intro')}</p>
        </header>

        <ul className={styles.bolumler} aria-label={t('welcome.sectionsAria')}>
          {BOLUMLER.map(({ key, Icon, baslikKey, metinKey }) => (
            <li key={key} className={styles.bolum}>
              <span className={styles.bolumSimge} aria-hidden="true"><Icon size={20} /></span>
              <div>
                <h2>{t(baslikKey)}</h2>
                <p>{t(metinKey)}</p>
              </div>
            </li>
          ))}
        </ul>

        {/*
          * Fiyat TEK SATIR. Sayılar yine `FOUNDER_STAGES`ten (tek kaynak);
          * kademeli zaman çizgisi fiyat sayfasında duruyor, buraya bağlantı.
          */}
        <p className={styles.fiyat}>
          {t('welcome.priceLine', {
            count: ucretsizAy,
            prices: sonraki.map(a => fiyatYaz(a.monthlyPrice, dil)).join(' / '),
            percent: kuruculIndirimYuzdesi(),
            founderPrice: fiyatYaz(kuruculUyeFiyati(), dil)
          })}{' '}
          <Link to="/fiyatlar" className={styles.ikincilLink}>{t('welcome.seePricing')}</Link>
        </p>
        {!BILLING_STARTS_AT && (
          <p className={styles.duyuru} role="status">{t('welcome.notStarted')}</p>
        )}

        <div className={styles.eylemler}>
          <button type="button" className={styles.birincilDugme} onClick={basla}>
            {t('welcome.start')} <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button type="button" className={styles.gecDugme} onClick={gec}>
            {t('welcome.skip')}
          </button>
        </div>
      </div>
    </div>
  )
}
