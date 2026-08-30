import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MailWarning, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/services/api'
import styles from './VerificationBanner.module.css'
import { useTranslation } from 'react-i18next'

/*
 * YUMUŞAK doğrulama kapısı: kullanıcı doğrulamadan da uygulamayı
 * kullanabilir, yalnız hatırlatılır. Sert kapı (doğrulamadan giriş yok)
 * ürün kararıyla seçilmedi.
 *
 * Kapatma SESSION bazlı: `sessionStorage` sekme kapanınca temizlenir,
 * yani hatırlatma her yeni oturumda geri gelir. `localStorage` olsaydı
 * bir kez kapatan kullanıcı bir daha hiç görmezdi.
 */
const DISMISS_KEY = 'localkarar-verify-banner-dismissed'

export default function VerificationBanner() {
  const { t } = useTranslation('common')
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [gizli, setGizli] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.sessionStorage.getItem(DISMISS_KEY) === 'true'
  })
  const [calisiyor, setCalisiyor] = useState(false)
  const [hata, setHata] = useState('')

  /* `emailVerified` alanı /auth/me, /login ve /register yanıtlarından gelir.
     Alan hiç gelmezse (eski sunucu) şerit gösterilmez — yanlış uyarı,
     hiç uyarmamaktan kötüdür. */
  if (!user || user.emailVerified !== false || gizli) return null

  function kapat() {
    window.sessionStorage.setItem(DISMISS_KEY, 'true')
    setGizli(true)
  }

  async function kodGonderVeGit() {
    setHata(''); setCalisiyor(true)
    try {
      const sonuc = await api.auth.requestEmailVerification()
      /* Sunucu zaten doğrulanmışsa `alreadyVerified` döner — o durumda
         kod ekranına göndermek kullanıcıyı boşuna dolaştırır. */
      if (sonuc?.alreadyVerified) {
        updateUser({ emailVerified: true })
        return
      }
      navigate('/verify-email')
    } catch (err) {
      setHata(err.message || t('verificationBanner.sendError'))
    } finally {
      setCalisiyor(false)
    }
  }

  return (
    <div className={styles.banner} role="status">
      <MailWarning size={18} className={styles.icon} aria-hidden="true" />
      <p className={styles.text}>
        <strong>{t('verificationBanner.title')}</strong>{' '}
        <span className={styles.detail}>
          {t('verificationBanner.description')}
        </span>
        {hata && <span className={styles.error}> {hata}</span>}
      </p>
      <button type="button" className={styles.action} onClick={kodGonderVeGit} disabled={calisiyor}>
        {calisiyor ? t('verificationBanner.sending') : t('verificationBanner.verify')}
      </button>
      <button type="button" className={styles.dismiss} onClick={kapat} aria-label={t('verificationBanner.dismiss')}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
