import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, LockKeyhole, Mail, MailCheck, Minus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import BrandMark from '@/components/ui/BrandMark'
import { api } from '@/services/api'
import { passwordChecks, passwordMeetsMinimum } from '@/constants/password'
import AuthThemeToggle from './AuthThemeToggle'
import PasswordInput from '@/components/ui/PasswordInput'
import styles from './AuthPage.module.css'
import { useTranslation } from 'react-i18next'
import PublicFooter from '@/components/layout/PublicFooter'

/*
 * Şifre sıfırlama — iki ekran, tek dosya.
 *
 * `mode="request"`  → e-posta girilir, sıfırlama bağlantısı gönderilir.
 * `mode="confirm"`  → bağlantıdaki token ile yeni şifre belirlenir.
 *
 * AuthPage'in kart düzenini ve stillerini yeniden kullanıyor: aynı akışın
 * devamı olduğu için görsel olarak da aynı yerde durmalı.
 */

function Kart({ baslik, aciklama, children }) {
  const { t } = useTranslation('auth')
  return (
    /* Giriş ekranıyla aynı yüzey: çapraz degrade + üzerinde yüzen cam kart.
       `soloPage` vaat bölümü olmadığı için kartı ortalar. */
    <div className={styles.kabuk}>
      <div className={`${styles.page} ${styles.soloPage}`}>
      <AuthThemeToggle />
      <div className={styles.glowCool} aria-hidden="true" />
      <div className={styles.glowLight} aria-hidden="true" />

      <div className={styles.cardWrap}>
        <div className={styles.card}>
          <div className={styles.brandRow}>
            <BrandMark size={40} interactive />
            <span className={styles.brandText}>
              <strong>LocalKarar</strong>
              <small lang="en">Professional Community</small>
            </span>
          </div>

          <div className={styles.cardHead}>
            <h1>{baslik}</h1>
            <p>{aciklama}</p>
          </div>

          {children}
        </div>
      </div>

      </div>

      {/* Alt bilgi `.page`in KARDEŞİ: içine konduğunda ortalanmış flex
          kabı onu esnetmiyor ve iki yandan taşıyordu. */}
      <PublicFooter compact />
    </div>
  )
}

function IstekEkrani() {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [gonderildi, setGonderildi] = useState(false)
  const [hata, setHata] = useState('')
  const [calisiyor, setCalisiyor] = useState(false)

  async function gonder(event) {
    event.preventDefault()
    setHata(''); setCalisiyor(true)
    try {
      await api.auth.requestPasswordReset(email)
      setGonderildi(true)
    } catch (err) {
      setHata(err.message || t('reset.requestError'))
    } finally {
      setCalisiyor(false)
    }
  }

  if (gonderildi) {
    return (
      <Kart
        baslik={t('reset.checkEmailTitle')}
        /*
         * Bu mesaj, adresin kayıtlı olup olmadığını SÖYLEMEZ. Sunucu da
         * ayrım yapmıyor; arayüzün "böyle bir kullanıcı yok" demesi o
         * korumayı boşa çıkarırdı.
         */
        aciklama={t('reset.checkEmailDescription', { email })}
      >
        <p className={styles.note}>
          {t('reset.spamHint')}
        </p>
        <Link to="/login" className={styles.backLink}>{t('reset.backToLogin')}</Link>
      </Kart>
    )
  }

  return (
    <Kart
      baslik={t('reset.requestTitle')}
      aciklama={t('reset.requestDescription')}
    >
      <form className={styles.cardForm} onSubmit={gonder}>
        <label className={styles.field}>
          <span>{t('email')}</span>
          <span className={styles.inputShell}>
            <Mail size={17} aria-hidden="true" />
            <input
              type="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="mail@gmail.com"
            />
          </span>
        </label>
        {hata && <p className={styles.error} role="alert">{hata}</p>}
        <button type="submit" className={styles.submit} disabled={calisiyor}>
          {calisiyor ? t('reset.sending') : t('reset.sendLink')}
        </button>
        <Link to="/login" className={styles.backLink}>{t('reset.backToLogin')}</Link>
      </form>
    </Kart>
  )
}

function OnayEkrani() {
  const { t } = useTranslation('auth')
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const { replaceSession } = useAuth()
  const [sifre, setSifre] = useState('')
  const [tekrar, setTekrar] = useState('')
  const [hata, setHata] = useState('')
  const [calisiyor, setCalisiyor] = useState(false)

  if (!token) {
    return (
      <Kart baslik={t('reset.invalidTitle')} aciklama={t('reset.invalidDescription')}>
        <Link to="/forgot-password" className={styles.submit} style={{ textAlign: 'center', textDecoration: 'none' }}>
          {t('reset.requestNewLink')}
        </Link>
      </Kart>
    )
  }

  async function gonder(event) {
    event.preventDefault()
    setHata('')
    if (sifre !== tekrar) return setHata(t('reset.passwordMismatch'))
    setCalisiyor(true)
    try {
      const oturum = await api.auth.confirmPasswordReset(token, sifre)
      /* Sunucu taze token dönüyor: kullanıcı sıfırlama sonrası doğrudan
         oturum açmış olur, ayrıca giriş yapması gerekmez. */
      if (oturum?.token) replaceSession(oturum)
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      setHata(err.message || t('reset.passwordError'))
    } finally {
      setCalisiyor(false)
    }
  }

  const checks = passwordChecks(sifre)

  return (
    <Kart baslik={t('reset.newPasswordTitle')} aciklama={t('reset.newPasswordDescription')}>
      <form className={styles.cardForm} onSubmit={gonder}>
        <label className={styles.field}>
          <span>{t('reset.newPassword')}</span>
          <span className={styles.inputShell}>
            <LockKeyhole size={17} aria-hidden="true" />
            <PasswordInput
              id="reset-password" name="new-password" autoComplete="new-password" required
              value={sifre} onChange={e => setSifre(e.target.value)} placeholder="••••••••"
            />
          </span>
        </label>

        <ul className={styles.pwHints} aria-live="polite">
          {checks.map(c => (
            <li key={c.key} className={c.ok ? styles.pwOk : undefined}>
              {c.ok ? <Check size={13} aria-hidden="true" /> : <Minus size={13} aria-hidden="true" />}
              <span>{t(c.labelKey, c.values)}{c.required ? '' : ` ${t('passwordChecks.recommended')}`}</span>
            </li>
          ))}
        </ul>

        <label className={styles.field}>
          <span>{t('reset.repeatPassword')}</span>
          <span className={styles.inputShell}>
            <LockKeyhole size={17} aria-hidden="true" />
            <PasswordInput
              id="reset-password-repeat" name="new-password-repeat" autoComplete="new-password" required
              value={tekrar} onChange={e => setTekrar(e.target.value)} placeholder="••••••••"
            />
          </span>
        </label>

        {hata && <p className={styles.error} role="alert">{hata}</p>}

        <button type="submit" className={styles.submit} disabled={calisiyor || !passwordMeetsMinimum(sifre)}>
          {calisiyor ? t('reset.saving') : t('reset.changePassword')}
        </button>
      </form>
    </Kart>
  )
}

export default function PasswordResetPage({ mode = 'request' }) {
  return mode === 'confirm' ? <OnayEkrani /> : <IstekEkrani />
}

/** Doğrulanmamış e-posta şeridinden yönlendirilen kod giriş ekranı. */
export function EmailVerifyPage() {
  const { t } = useTranslation('auth')
  const [kod, setKod] = useState('')
  const [mesaj, setMesaj] = useState('')
  const [hata, setHata] = useState('')
  const [calisiyor, setCalisiyor] = useState(false)
  const navigate = useNavigate()
  const { updateUser } = useAuth()

  async function kodIste() {
    setHata(''); setMesaj(''); setCalisiyor(true)
    try {
      await api.auth.requestEmailVerification()
      setMesaj(t('verify.codeSent'))
    } catch (err) {
      setHata(err.message || t('verify.sendError'))
    } finally { setCalisiyor(false) }
  }

  async function dogrula(event) {
    event.preventDefault()
    setHata(''); setCalisiyor(true)
    try {
      await api.auth.confirmEmailVerification(kod)
      /* Oturumdaki kullanici da guncellenir; yoksa dogrulama seridi
         sayfa yenilenene kadar ekranda kalirdi. */
      updateUser({ emailVerified: true })
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      setHata(err.message || t('verify.confirmError'))
    } finally { setCalisiyor(false) }
  }

  return (
    <Kart baslik={t('verify.title')} aciklama={t('verify.description')}>
      <form className={styles.cardForm} onSubmit={dogrula}>
        <label className={styles.field}>
          <span>{t('verify.codeLabel')}</span>
          <span className={styles.inputShell}>
            <MailCheck size={17} aria-hidden="true" />
            <input
              type="text" inputMode="numeric" autoComplete="one-time-code"
              pattern="\d{6}" maxLength={6} required
              value={kod} onChange={e => setKod(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
            />
          </span>
        </label>
        {mesaj && <p className={styles.note}>{mesaj}</p>}
        {hata && <p className={styles.error} role="alert">{hata}</p>}
        <button type="submit" className={styles.submit} disabled={calisiyor || kod.length !== 6}>
          {calisiyor ? t('verify.verifying') : t('verify.verify')}
        </button>
        <button type="button" className={styles.backLink} onClick={kodIste} disabled={calisiyor}>
          {t('verify.resend')}
        </button>
      </form>
    </Kart>
  )
}
