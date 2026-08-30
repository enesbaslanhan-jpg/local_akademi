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

/**
 * Sosyal giriş düğmeleri.
 *
 * Apple ve Google hesapları henüz açılmadığı için BAĞLI DEĞİL. Tıklanınca
 * ne olacağını söylemek, sessizce hiçbir şey yapmaktan iyi: `disabled` +
 * açıklayıcı başlık kullanılıyor. Hesaplar geldiğinde yalnız `onClick`
 * bağlanacak.
 */
function SocialButtons() {
  const { t } = useTranslation('auth')
  return (
    <div className={styles.socialRow}>
      <button type="button" className={styles.social} disabled title={t('social.comingSoon')}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
          <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14z" />
        </svg>
        Google
      </button>
      <button type="button" className={styles.social} disabled title={t('social.comingSoon')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.05 12.53c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.18-.02 1.93-1.08 2.65-2.14.83-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.3-3.53z" />
          <path d="M14.86 5.9c.6-.74 1.01-1.75.9-2.77-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.49 2.58-1.22z" />
        </svg>
        Apple
      </button>
    </div>
  )
}

export default function AuthPage({ mode: initialMode }) {
  const { t } = useTranslation('auth')
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState(initialMode || 'login')
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [legalOk, setLegalOk] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  /* Acik yasal metin penceresi: null | 'terms' | 'privacy' */
  const [yasalMetin, setYasalMetin] = useState(null)

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

          <div className={styles.divider}><span>{t('or')}</span></div>

          <SocialButtons />

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
