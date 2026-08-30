import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, MailWarning, Users } from 'lucide-react'
import BrandMark from '@/components/ui/BrandMark'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/services/api'
import AuthThemeToggle from './AuthThemeToggle'
import styles from './AuthPage.module.css'
import { useTranslation } from 'react-i18next'

/*
 * İşletme daveti kabul ekranı (`/davet?token=...`).
 *
 * Daha önce bu ekran HİÇ YOKTU: davet tokeni API yanıtında dönüyor,
 * arayüz onu ekranda gösteriyordu ve daveti oluşturan kişi tokeni elle
 * iletiyordu. Token artık yalnız e-postayla gidiyor, dolayısıyla
 * davetlinin düşeceği bir sayfa gerekiyor.
 *
 * Görsel dil giriş ekranıyla ortak (`AuthPage.module.css`): davetli
 * çoğunlukla giriş yapmamış olarak geliyor ve buradan doğrudan giriş
 * ekranına geçiyor.
 */

export default function InvitationPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  const [durum, setDurum] = useState('bekliyor')   // bekliyor | calisiyor | tamam | hata
  const [hata, setHata] = useState('')
  const [workspaceId, setWorkspaceId] = useState(null)
  /* Kabul isteği bir kez gitsin: React 18 StrictMode geliştirmede
     effect'leri iki kez çalıştırıyor ve ikinci istek "davet zaten
     kullanılmış" hatası döndürüyordu. */
  const denendi = useRef(false)

  const kabulEt = useCallback(async () => {
    setDurum('calisiyor')
    try {
      const sonuc = await api.workspace.invitations.accept(token)
      setWorkspaceId(sonuc?.workspaceId || null)
      setDurum('tamam')
    } catch (err) {
      setHata(err.message || t('invitation.acceptError'))
      setDurum('hata')
    }
  }, [token, t])

  useEffect(() => {
    if (loading || !token || !isAuthenticated) return
    if (denendi.current) return
    denendi.current = true
    kabulEt()
  }, [loading, token, isAuthenticated, kabulEt])

  /* Girişten sonra buraya geri dönülsün. `guvenliNext` bu değeri
     doğruluyor (yalnız uygulama içi yollar). */
  const donusYolu = `/davet?token=${encodeURIComponent(token)}`
  const girisYolu = `/login?next=${encodeURIComponent(donusYolu)}`
  const kayitYolu = `/register?next=${encodeURIComponent(donusYolu)}`

  return (
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

          {!token && (
            <>
              <div className={styles.cardHead}>
                <h1>{t('invitation.missingTitle')}</h1>
                <p>{t('invitation.missingDescription')}</p>
              </div>
              <Link to="/login" className={styles.backLink}>{t('invitation.backToLogin')}</Link>
            </>
          )}

          {token && loading && (
            <div className={styles.cardHead}>
              <h1>{t('invitation.checking')}</h1>
            </div>
          )}

          {token && !loading && !isAuthenticated && (
            <>
              <div className={styles.cardHead}>
                <h1>{t('invitation.title')}</h1>
                <p>{t('invitation.description')}</p>
              </div>
              <div className={styles.cardForm}>
                <Link to={girisYolu} className={styles.submit} style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
                  {t('login')}
                </Link>
                <Link to={kayitYolu} className={styles.backLink}>{t('invitation.createAccount')}</Link>
              </div>
            </>
          )}

          {token && !loading && isAuthenticated && durum === 'calisiyor' && (
            <div className={styles.cardHead}>
              <h1>{t('invitation.processing')}</h1>
            </div>
          )}

          {durum === 'tamam' && (
            <>
              <div className={styles.cardHead}>
                <h1><Check size={20} aria-hidden="true" /> {t('invitation.joined')}</h1>
                <p>{t('invitation.joinedDescription')}</p>
              </div>
              <div className={styles.cardForm}>
                <button
                  type="button"
                  className={styles.submit}
                  onClick={() => navigate(workspaceId ? `/app/workspaces/${workspaceId}/tracker` : '/app/workspaces', { replace: true })}
                >
                  {t('invitation.goToBusiness')}
                </button>
              </div>
            </>
          )}

          {durum === 'hata' && (
            <>
              <div className={styles.cardHead}>
                <h1><MailWarning size={20} aria-hidden="true" /> {t('invitation.acceptError')}</h1>
              </div>
              {/*
                * Sunucunun mesajı olduğu gibi gösteriliyor: "farklı bir
                * e-postaya gönderilmiş", "süresi dolmuş", "zaten üyesin"
                * gibi durumların her biri kullanıcının atacağı adımı
                * değiştiriyor. Hepsini tek bir genel mesajın altına
                * saklamak kullanıcıyı çıkmazda bırakırdı.
                */}
              <p className={styles.error} role="alert">{hata}</p>
              <div className={styles.cardForm}>
                <button type="button" className={styles.submit} onClick={() => navigate('/app/workspaces')}>
                  <Users size={16} aria-hidden="true" /> {t('invitation.goToBusinesses')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
