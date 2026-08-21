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
  return (
    /* Giriş ekranıyla aynı yüzey: çapraz degrade + üzerinde yüzen cam kart.
       `soloPage` vaat bölümü olmadığı için kartı ortalar. */
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

      <div className={styles.legal} aria-label="Yasal belgeler">
        <Link to="/privacy">Gizlilik</Link>
        <Link to="/terms">Kullanım koşulları</Link>
        <Link to="/cookies">Çerezler</Link>
      </div>
    </div>
  )
}

function IstekEkrani() {
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
      setHata(err.message || 'İstek gönderilemedi. Az sonra tekrar deneyin.')
    } finally {
      setCalisiyor(false)
    }
  }

  if (gonderildi) {
    return (
      <Kart
        baslik="E-postanı kontrol et"
        /*
         * Bu mesaj, adresin kayıtlı olup olmadığını SÖYLEMEZ. Sunucu da
         * ayrım yapmıyor; arayüzün "böyle bir kullanıcı yok" demesi o
         * korumayı boşa çıkarırdı.
         */
        aciklama={`${email} adresi sistemde kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Bağlantı 1 saat geçerli.`}
      >
        <p className={styles.note}>
          E-posta birkaç dakika içinde gelmezse gereksiz (spam) klasörünü kontrol edin.
        </p>
        <Link to="/login" className={styles.backLink}>Giriş ekranına dön</Link>
      </Kart>
    )
  }

  return (
    <Kart
      baslik="Şifreni sıfırla"
      aciklama="Hesabının e-posta adresini gir; sıfırlama bağlantısını gönderelim."
    >
      <form className={styles.cardForm} onSubmit={gonder}>
        <label className={styles.field}>
          <span>E-posta</span>
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
          {calisiyor ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}
        </button>
        <Link to="/login" className={styles.backLink}>Giriş ekranına dön</Link>
      </form>
    </Kart>
  )
}

function OnayEkrani() {
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
      <Kart baslik="Bağlantı geçersiz" aciklama="Sıfırlama bağlantısı eksik ya da bozuk görünüyor.">
        <Link to="/forgot-password" className={styles.submit} style={{ textAlign: 'center', textDecoration: 'none' }}>
          Yeni bağlantı iste
        </Link>
      </Kart>
    )
  }

  async function gonder(event) {
    event.preventDefault()
    setHata('')
    if (sifre !== tekrar) return setHata('Şifreler eşleşmiyor.')
    setCalisiyor(true)
    try {
      const oturum = await api.auth.confirmPasswordReset(token, sifre)
      /* Sunucu taze token dönüyor: kullanıcı sıfırlama sonrası doğrudan
         oturum açmış olur, ayrıca giriş yapması gerekmez. */
      if (oturum?.token) replaceSession(oturum)
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      setHata(err.message || 'Şifre değiştirilemedi.')
    } finally {
      setCalisiyor(false)
    }
  }

  const checks = passwordChecks(sifre)

  return (
    <Kart baslik="Yeni şifre belirle" aciklama="Bu işlem diğer tüm cihazlardaki oturumlarını kapatır.">
      <form className={styles.cardForm} onSubmit={gonder}>
        <label className={styles.field}>
          <span>Yeni şifre</span>
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
              <span>{c.label}{c.required ? '' : ' (önerilir)'}</span>
            </li>
          ))}
        </ul>

        <label className={styles.field}>
          <span>Yeni şifre tekrar</span>
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
          {calisiyor ? 'Kaydediliyor…' : 'Şifreyi değiştir'}
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
      setMesaj('Kod gönderildi. 15 dakika geçerli.')
    } catch (err) {
      setHata(err.message || 'Kod gönderilemedi.')
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
      setHata(err.message || 'Kod doğrulanamadı.')
    } finally { setCalisiyor(false) }
  }

  return (
    <Kart baslik="E-postanı doğrula" aciklama="Adresine gönderdiğimiz 6 haneli kodu gir.">
      <form className={styles.cardForm} onSubmit={dogrula}>
        <label className={styles.field}>
          <span>Doğrulama kodu</span>
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
          {calisiyor ? 'Doğrulanıyor…' : 'Doğrula'}
        </button>
        <button type="button" className={styles.backLink} onClick={kodIste} disabled={calisiyor}>
          Kod gelmedi mi? Yeniden gönder
        </button>
      </form>
    </Kart>
  )
}
