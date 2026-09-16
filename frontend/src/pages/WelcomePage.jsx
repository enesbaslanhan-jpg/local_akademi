import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, BadgePercent, Bot, CheckCircle2, Scale, Sparkles, WalletCards } from 'lucide-react'
import BrandMark from '@/components/ui/BrandMark'
import { useAuth } from '@/context/AuthContext'
import { captureAnalytics } from '@/services/analytics'
import { FOUNDER_STAGES, fiyatYaz, kuruculIndirimYuzdesi, kuruculUyeFiyati } from '@/config/billing'
import styles from './WelcomePage.module.css'

/* Kayıt sonrası ilk temas. Bu yüzey ürün kataloğu değildir: kullanıcı
   LocalKarar'ın vaadini anlar ve tek bir güvenli sonraki adım seçer. */
export default function WelcomePage() {
  const { t, i18n } = useTranslation('common')
  const navigate = useNavigate()
  const { user, completeOnboarding } = useAuth()
  const ad = (user?.name || '').trim().split(/\s+/)[0]
  const ucretsiz = FOUNDER_STAGES.find(stage => stage.code === 'free')
  const lansman = FOUNDER_STAGES.find(stage => stage.code === 'launch')
  const dil = i18n.resolvedLanguage || i18n.language

  function basla() {
    captureAnalytics('welcome_started', { platform: 'web' })
    navigate('/app/onboarding', { replace: true })
  }

  async function gec() {
    captureAnalytics('welcome_skipped', { platform: 'web' })
    await completeOnboarding?.({ skipped: true }).catch(() => {})
    navigate('/app/dashboard', { replace: true })
  }

  return (
    <div className={styles.sayfa}>
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.marka}>
        <BrandMark size={36} animated interactive />
        <span>LocalKarar</span>
      </header>

      <main className={styles.icerik}>
        <section className={styles.metinAlani} aria-labelledby="welcome-title">
          <span className={styles.kurucuRozeti}>
            <Sparkles size={14} aria-hidden="true" />
            {t('billing.founderMember')}
          </span>
          <h1 id="welcome-title" className={styles.baslik}>
            {ad ? t('welcome.heroTitleNamed', { name: ad }) : t('welcome.heroTitle')}
          </h1>
          <p className={styles.aciklama}>{t('welcome.heroDescription')}</p>

          <div className={styles.vaatler} aria-label={t('welcome.benefitsAria')}>
            <span><CheckCircle2 size={17} aria-hidden="true" /> {t('welcome.benefitOne')}</span>
            <span><CheckCircle2 size={17} aria-hidden="true" /> {t('welcome.benefitTwo')}</span>
            <span><CheckCircle2 size={17} aria-hidden="true" /> {t('welcome.benefitThree')}</span>
          </div>

          <div className={styles.eylemler}>
            <button type="button" className={styles.birincilDugme} onClick={basla}>
              <span>{t('welcome.personalize')}</span>
              <small>{t('welcome.personalizeTime')}</small>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className={styles.gecDugme} onClick={gec}>
              {t('welcome.explore')}
            </button>
          </div>

          <Link
            to="/fiyatlar"
            className={styles.kampanya}
            aria-label={t('welcome.founderDetails')}
          >
            <span className={styles.kampanyaIkon}><BadgePercent size={18} aria-hidden="true" /></span>
            <span className={styles.kampanyaMetni}>
              <strong>{t('welcome.campaignTitle')}</strong>
              <small>{t('welcome.campaignSummary', {
                count: ucretsiz.months,
                freeMonths: ucretsiz.months,
                launchMonths: lansman.months,
                launchPrice: fiyatYaz(lansman.monthlyPrice, dil),
                founderPrice: fiyatYaz(kuruculUyeFiyati(), dil),
                percent: kuruculIndirimYuzdesi(),
              })}</small>
            </span>
            <span className={styles.kampanyaEylemi}>{t('welcome.campaignCta')} <ArrowRight size={15} aria-hidden="true" /></span>
          </Link>

          <p className={styles.guvence}>{t('welcome.optionalNote')}</p>
        </section>

        <section className={styles.sahne} aria-label={t('welcome.previewAria')}>
          <div className={styles.urunPenceresi}>
            <div className={styles.pencereUst}>
              <span className={styles.miniMarka}><BrandMark size={23} /></span>
              <span className={styles.pencereBaslik}>{t('welcome.preview.controlCenter')}</span>
              <span className={styles.canliNokta}>{t('welcome.preview.ready')}</span>
            </div>
            <div className={styles.durumPaneli}>
              <div>
                <span>{t('welcome.preview.today')}</span>
                <strong>{t('welcome.preview.headline')}</strong>
                <p>{t('welcome.preview.description')}</p>
              </div>
              <div className={styles.durumIsareti} aria-hidden="true"><span /><span /><span /></div>
            </div>
            <div className={styles.sinyaller}>
              <div><WalletCards size={17} /><span>{t('welcome.preview.cash')}</span><strong>{t('welcome.preview.visible')}</strong></div>
              <div><Scale size={17} /><span>{t('welcome.preview.decision')}</span><strong>{t('welcome.preview.guided')}</strong></div>
              <div><Bot size={17} /><span>{t('welcome.preview.mentor')}</span><strong>{t('welcome.preview.contextual')}</strong></div>
            </div>
            <div className={styles.kararSeridi}>
              <span className={styles.kararIkon}><Scale size={17} aria-hidden="true" /></span>
              <span><small>{t('welcome.preview.decisionLabel')}</small><strong>{t('welcome.preview.decisionText')}</strong></span>
              <CheckCircle2 size={18} aria-hidden="true" />
            </div>
          </div>
          <div className={styles.mentorNotu}>
            <span><Bot size={16} aria-hidden="true" /></span>
            <p>{t('welcome.preview.mentorNote')}</p>
          </div>
        </section>
      </main>
      <footer className={styles.altNot}>{t('welcome.footer')}</footer>
    </div>
  )
}
