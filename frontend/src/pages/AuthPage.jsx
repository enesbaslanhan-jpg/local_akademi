import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Check, ClipboardList, LockKeyhole, Mail, Minus, Sheet, UserRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import BrandMark from '@/components/ui/BrandMark'
import PasswordInput from '@/components/ui/PasswordInput'
import StorageNotice from '@/components/ui/StorageNotice'
import { passwordChecks, passwordMeetsMinimum } from '@/constants/password'
import { guvenliNext, VARSAYILAN_YOL } from '@/utils/safeNext'
import AuthThemeToggle from './AuthThemeToggle'
import LegalModal from '@/components/legal/LegalModal'
import SosyalGiris from '@/components/auth/SosyalGiris'
import styles from './AuthPage.module.css'
import { useTranslation } from 'react-i18next'
import PublicFooter from '@/components/layout/PublicFooter'

/**
 * Parola gereksinimleri — kullanıcı yazarken güncellenir.
 *
 * Yalnız uzunluk zorunlu (sunucunun dayattığı kural bu); diğerleri güçlü
 * parola önerisi. Zorunlu olmayanı zorunluymuş gibi göstermek, kullanıcıyı
 * var olmayan bir kurala uymaya zorlar.
 */
function PasswordHints({ value }) {
  const { t } = useTranslation('auth')
  const checks = passwordChecks(value)
  return (
    <ul className={styles.pwHints} aria-live="polite">
      {checks.map(c => (
        <li key={c.key} className={c.ok ? styles.pwOk : undefined}>
          {c.ok ? <Check size={13} aria-hidden="true" /> : <Minus size={13} aria-hidden="true" />}
          <span>{t(c.labelKey, c.values)}{c.required ? '' : ` ${t('passwordChecks.recommended')}`}</span>
        </li>
      ))}
    </ul>
  )
}

/* Ürünün ne yaptığını tek bakışta anlatan satırlar. Sayılar gerçek:
   yayındaki kurs ve hesaplama adetleri. */
const VALUE_POINTS = [
  { icon: BookOpen, labelKey: 'valuePoints.courses' },
  { icon: Sheet, labelKey: 'valuePoints.calculations' },
  { icon: ClipboardList, labelKey: 'valuePoints.trackingMentor' }
]


export default function AuthPage({ mode: initialMode }) {
  const { t } = useTranslation('auth')
  const { login, register, socialLogin } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState(initialMode || 'login')
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [legalOk, setLegalOk] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  /* Acik yasal metin penceresi: null | 'terms' | 'privacy' */
  const [yasalMetin, setYasalMetin] = useState(null)
  /*
   * SOSYAL GİRİŞ (16.09.2026). Sunucu ilk girişte 409 CONSENT_REQUIRED
   * döner: belirteç `bekleyenSosyal`da tutulur, onay kutusu gösterilir,
   * kullanıcı onaylayınca aynı belirteçle yeniden gönderilir. Kayıt
   * sekmesinde kutu zaten işaretliyse ilk denemede acceptedLegal gider.
   */
  const [bekleyenSosyal, setBekleyenSosyal] = useState(null)
  const [sosyalVar, setSosyalVar] = useState(false)

  const [searchParams] = useSearchParams()
  const isLogin = mode === 'login'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isLogin) await login(form.email, form.password)
      else await register(form.email, form.password, form.name, legalOk)
      /* `?next=` ile geldiyse oraya dön (ör. davet bağlantısı). Değer
         KULLANICIDAN geldiği için `guvenliNext` süzüyor — doğrudan
         kullanılsaydı açık yönlendirme açığı olurdu.

         Yeni kayıtta varsayılan hedef karşılama ekranı. Bu ekranın
         "bir kez gösterilmesi" için ayrı bir bayrak TUTULMUYOR: yalnız
         buradan yönlendiriliyor, sonraki girişler doğrudan panoya
         gidiyor. Yeni bir `UserPreference` alanı + göç + uç eklemek,
         aynı sonucu daha pahalıya almak olurdu.

         ⚠️ `?next=` varsa o kazanır — davet bağlantısıyla gelen
         kullanıcı davet ekranına dönmeli, tanıtıma değil. */
      navigate(
        guvenliNext(searchParams.get('next'), isLogin ? VARSAYILAN_YOL : '/app/hosgeldin'),
        { replace: true },
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function sosyalGiris(kimlik, onay) {
    setError('')
    setSubmitting(true)
    try {
      const data = await socialLogin({ ...kimlik, acceptedLegal: onay ? true : undefined })
      setBekleyenSosyal(null)
      navigate(
        guvenliNext(searchParams.get('next'), data.isNewUser ? '/app/hosgeldin' : VARSAYILAN_YOL),
        { replace: true },
      )
    } catch (err) {
      if (err?.status === 409 && err?.apiMessage === 'CONSENT_REQUIRED') {
        setBekleyenSosyal(kimlik)
        setError('')
      } else {
        setError(err?.apiMessage && err.apiMessage !== err.code ? err.apiMessage : (err.message || t('social.failed')))
      }
    } finally {
      setSubmitting(false)
    }
  }

  /* Kayıtta: parola kuralı VE yasal onay. Sunucu ikisini de ayrıca
     doğruluyor; buradaki kontrol yalnız kullanıcıyı boşuna gönderip
     hata almaktan kurtarıyor. */
  const kayitHazir = passwordMeetsMinimum(form.password) && legalOk

  return (
    /*
     * TEK YÜZEY: koyu petrol sol üstten açığa çapraz akar, form kartı açık
     * bölgenin üzerinde yüzer. Önceki sürüm ekranı dikey bir çizgiyle iki
     * ayrı alana bölüyordu; renk orada sertçe kesildiği için iki yarım
     * ayrı görüntü gibi duruyordu.
     */
    <div className={styles.kabuk}>
      <div className={styles.page}>
      <AuthThemeToggle />
      {/* Yasal metin sayfadan çıkmadan okunuyor; form arkada duruyor. */}
      <LegalModal type={yasalMetin} open={Boolean(yasalMetin)} onClose={() => setYasalMetin(null)} />
      <div className={styles.glowCool} aria-hidden="true" />
      <div className={styles.glowLight} aria-hidden="true" />
      <div className={styles.glowWarm} aria-hidden="true" />

      <section className={styles.pitch}>
        {/* Marka satiri tanitim sayfasina gider. Alt seritteki "Hakkında"
            baglantisi 11px ve solgun; yer imiyle dogrudan /login e gelen
            ziyaretcinin urunu gorebilmesi icin daha bulunur bir yol lazimdi. */}
        <Link to="/hakkinda" className={styles.brandRow} aria-label={t('aboutLocalKarar')}>
          {/* Girişte bir kez oynar; imleç üstüne gelince tekrar. */}
          <BrandMark size={46} animated interactive />
          <span className={styles.brandText}>
            <strong>LocalKarar</strong>
            <small lang="en">Professional Community</small>
          </span>
        </Link>

        <div className={styles.pitchCopy}>
          <h2>{t('headline')}</h2>
          <p>{t('tagline')}</p>
        </div>

        <ul className={styles.points}>
          {VALUE_POINTS.map(({ icon: Icon, labelKey }) => (
            <li key={labelKey}>
              <span className={styles.pointIcon}><Icon size={14} aria-hidden="true" /></span>
              {t(labelKey)}
            </li>
          ))}
        </ul>

        <p className={styles.origin}>{t('origin')}</p>
      </section>

      <div className={styles.cardWrap}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <h1 className="sr-only">LocalKarar — {isLogin ? t('login') : t('register')}</h1>

          <div className={styles.cardHead}>
            <h2>{isLogin ? t('welcomeBack') : t('register')}</h2>
            <p>{isLogin ? t('loginSubtitle') : t('registerSubtitle')}</p>
          </div>

          <label className={styles.field}>
            <span>{t('email')}</span>
            <span className={styles.inputShell}>
              <Mail size={16} aria-hidden="true" />
              <input
                type="email"
                id="auth-email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={event => setForm({ ...form, email: event.target.value })}
                placeholder="mail@ornek.com"
                required
              />
            </span>
          </label>

          {!isLogin && (
            <label className={styles.field}>
              <span>{t('fullName')}</span>
              <span className={styles.inputShell}>
                <UserRound size={16} aria-hidden="true" />
                <input
                  type="text"
                  id="auth-name"
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={event => setForm({ ...form, name: event.target.value })}
                  placeholder={t('fullName')}
                  required
                />
              </span>
            </label>
          )}

          <label className={styles.field}>
            <span>{t('password')}</span>
            <span className={styles.inputShell}>
              <LockKeyhole size={16} aria-hidden="true" />
              <PasswordInput
                id="auth-password"
                name="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={event => setForm({ ...form, password: event.target.value })}
                placeholder="••••••••"
                required
              />
            </span>
          </label>

          {/* Gereksinimler yalnız KAYITTA gösterilir: girişte mevcut parola
              yazılıyor, kuralları hatırlatmak yardımcı olmaz, yanıltır. */}
          {!isLogin && <PasswordHints value={form.password} />}

          {isLogin && (
            <Link to="/forgot-password" className={styles.forgot}>{t('forgotPassword')}</Link>
          )}

          {/* Yasal onay — kayıtta zorunlu. Onayın kim, ne zaman, metnin
              hangi sürümünü kabul ettiği sunucuda kayda geçer. */}
          {!isLogin && (
            <label className={styles.consent}>
              <input
                type="checkbox"
                checked={legalOk}
                onChange={event => setLegalOk(event.target.checked)}
                required
              />
              {/*
                🔴 YENİ SEKME YERİNE PENCERE.
                Bağlantılar `target="_blank"` ile yeni sekme açıyordu.
                Aynı sekmede gitmek ise formda yazılanı (e-posta, parola,
                ad, onay kutusu) SİLERDİ. Pencere ikisini de çözüyor:
                form arkada duruyor, metin üstünde açılıyor.
              */}
              <span>
                <button type="button" className={styles.legalLink} onClick={() => setYasalMetin('terms')}>
                  {t('legal.terms')}
                </button>{t('legal.termsSuffix')}{' '}
                <button type="button" className={styles.legalLink} onClick={() => setYasalMetin('privacy')}>
                  {t('legal.privacy')}
                </button>{t('legal.acceptSuffix')}
              </span>
            </label>
          )}

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button
            type="submit"
            className={styles.submit}
            disabled={submitting || (!isLogin && !kayitHazir)}
          >
            {submitting
              ? (isLogin ? t('loggingIn') : t('registering'))
              : (isLogin ? t('login') : t('createAccount'))}
          </button>

          {sosyalVar && <div className={styles.divider}><span>{t('or')}</span></div>}

          {bekleyenSosyal ? (
            /* İlk sosyal girişte yasal onay: kayıttaki kutunun aynısı. */
            <div className={styles.sosyalOnay} role="group" aria-label={t('social.consentTitle')}>
              <p className={styles.sosyalOnayBaslik}>{t('social.consentTitle')}</p>
              <label className={styles.consent}>
                <input type="checkbox" checked={legalOk} onChange={event => setLegalOk(event.target.checked)} />
                <span>
                  <button type="button" className={styles.legalLink} onClick={() => setYasalMetin('terms')}>{t('legal.terms')}</button>{t('legal.termsSuffix')}{' '}
                  <button type="button" className={styles.legalLink} onClick={() => setYasalMetin('privacy')}>{t('legal.privacy')}</button>{t('legal.acceptSuffix')}
                </span>
              </label>
              <div className={styles.sosyalOnayDugmeler}>
                <button type="button" className={styles.submit} disabled={!legalOk || submitting} onClick={() => sosyalGiris(bekleyenSosyal, true)}>
                  {submitting ? t('registering') : t('social.continue')}
                </button>
                <button type="button" className={styles.modeSwitch} onClick={() => setBekleyenSosyal(null)}>{t('social.cancel')}</button>
              </div>
            </div>
          ) : (
            <SosyalGiris
              disabled={submitting}
              onDurum={setSosyalVar}
              onKimlik={kimlik => sosyalGiris(kimlik, !isLogin && legalOk)}
              onHata={mesaj => setError(mesaj)}
            />
          )}

          <p className={styles.switchLine}>
            {isLogin ? t('noAccount') : t('hasAccount')}{' '}
            <button
              type="button"
              className={styles.modeSwitch}
              onClick={() => { setMode(isLogin ? 'register' : 'login'); setError('') }}
            >
              {isLogin ? t('signUp') : t('login')}
            </button>
          </p>
        </form>

        {/* Kopya alt bilgi kaldırıldı — ortak `PublicFooter` sayfanın
            sonunda ve yasal belgelerin tamamını taşıyor. Buradaki
            depolama bildirimi kartla aynı kolonda kalıyor çünkü
            kayıt formunun hemen altında görülmesi gerekiyor. */}
        <div className={styles.footer}>
          <StorageNotice inline />
        </div>
      </div>
      </div>

      {/*
        * Alt bilgi `.page`in KARDEŞİ, çocuğu değil.
        *
        * `.page` ortalanmış bir flex kabı (`align-items: center`);
        * içine konduğunda alt bilgi esnemiyor, kendi içerik
        * genişliğinde kalıp iki yandan taşıyordu — ölçüldü: 680px
        * kutu, 499px sayfa, sol kenar -94px.
        */}
      <PublicFooter compact />
    </div>
  )
}
