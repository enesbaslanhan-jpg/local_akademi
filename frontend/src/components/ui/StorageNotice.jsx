import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Cookie, X } from 'lucide-react'
import styles from './StorageNotice.module.css'
import { useTranslation } from 'react-i18next'
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsConsent,
  isAnalyticsConfigured,
  setAnalyticsConsent
} from '@/services/analytics'

/*
 * İKİ KİPLİ DEPOLAMA / ANALİTİK BİLDİRİMİ.
 *
 * Ürün analitiği sunucuda kapalıyken bu yüzey yalnız zorunlu depolama
 * bilgilendirmesidir. Analitik eksiksiz yapılandırılıp açıkça etkinleştirilince
 * gerçek bir onay bandına dönüşür; SDK ve olaylar kullanıcı "İzin ver" demeden
 * yüklenmez veya gönderilmez. Cloudflare güvenlik koşullarında teknik çerez
 * koyabilir. Analitik kapalıyken tarayıcıda saklanan her şey ya oturum için
 * zorunlu ya kullanıcının kendi tercihidir:
 *
 *   token                             oturum anahtarı (zorunlu)
 *   localkarar-theme                  açık/koyu tema tercihi
 *   localkarar-sidebar-collapsed      kenar çubuğu tercihi
 *   localkarar-verify-banner-dismissed  oturumluk (sekme kapanınca gider)
 *   alıştırma/mentor durumları        kullanıcının kendi girdileri
 *
 * Analitik kapalıyken olmayan bir seçim sunulmaz; açıkken izin ve ret eşit
 * görünürlükte sunulur. Seçim daha sonra Ayarlar'dan değiştirilebilir.
 */
const NOTICE_KEY = 'localkarar-storage-notice-seen'

// Veri ve gizlilik sayfasında (settings#yasal) ve genel /app/settings'te gösterilmesin
function shouldHideNotice(pathname, hash, inline) {
  if (pathname.startsWith('/app/settings')) return true
  // Hash tabanlı navigasyon için (settings#yasal)
  if (hash === '#yasal') return true
  // Giriş ve kayıt ekranlarında aynı bileşenin akış içindeki sürümü var.
  if (!inline && (pathname === '/login' || pathname === '/register')) return true
  return false
}

export default function StorageNotice({ inline = false }) {
  const { t } = useTranslation('common')
  const location = useLocation()
  const [gorundu, setGorundu] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(NOTICE_KEY) === 'true'
  })
  const [hiddenByRoute, setHiddenByRoute] = useState(false)
  const [analyticsAvailable, setAnalyticsAvailable] = useState(false)
  const [analyticsConsent, setConsentState] = useState(getAnalyticsConsent)

  useEffect(() => {
    setHiddenByRoute(shouldHideNotice(location.pathname, location.hash, inline))
  }, [inline, location.pathname, location.hash])

  useEffect(() => {
    let active = true
    isAnalyticsConfigured().then(configured => {
      if (active) setAnalyticsAvailable(configured)
    })
    return () => { active = false }
  }, [])

  /*
   * 🔴 AYNI SAYFADA BİRDEN FAZLA ÖRNEK VAR.
   *
   * `main.jsx` genel bandı çiziyor, `PublicFooter` ve `AuthPage` birer
   * satır içi örnek daha. Rıza kararı `localStorage`a yazılıyor ama her
   * örnek kendi durumunu YALNIZ MOUNT ANINDA okuyordu: birine "İzin ver"
   * denince o kapanıyor, öteki ekranda kalıyordu.
   *
   * Ürün sahibi bunu "onayladım ama tekrar çıktı" diye bildirdi
   * (10.09.2026) ve tarayıcıda doğrulandı: tıklamadan sonra
   * localStorage 'granted' oluyor, ikinci bant hâlâ duruyor.
   *
   * `setAnalyticsConsent` zaten bir olay yayınlıyordu; kimse dinlemiyordu.
   */
  useEffect(() => {
    function rizaDegisti(event) {
      setConsentState(event?.detail?.consent || getAnalyticsConsent())
    }
    window.addEventListener(ANALYTICS_CONSENT_EVENT, rizaDegisti)
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, rizaDegisti)
  }, [])

  if (hiddenByRoute) return null
  if (analyticsAvailable && analyticsConsent !== 'unknown') return null
  /*
   * ⚠️ RIZA KİPİNDE SAYFADA TEK BANT.
   *
   * Genel örnek görünürken satır içi olan da bant çizerse kullanıcı aynı
   * soruyu iki kez görür. Genel örneğin gizlendiği rotalarda (giriş,
   * kayıt) satır içi olan devralıyor -- `shouldHideNotice` ile aynı
   * kuralı `inline: false` diye sorarak öğreniyoruz.
   *
   * Analitik kapalıyken davranış DEĞİŞMİYOR: orada satır içi metin bir
   * bant değil, alt bilgideki kalıcı bilgilendirme.
   */
  if (inline && analyticsAvailable && !shouldHideNotice(location.pathname, location.hash, false)) return null
  if (!analyticsAvailable && gorundu) return null

  function kapat() {
    window.localStorage.setItem(NOTICE_KEY, 'true')
    setGorundu(true)
  }

  async function analitikTercihi(consent) {
    await setAnalyticsConsent(consent)
    setConsentState(consent)
  }

  return (
    <aside className={inline ? styles.inlineNotice : styles.notice} role={analyticsAvailable ? 'region' : 'note'} aria-label={t('ui.storage.ariaLabel')}>
      <Cookie size={18} className={styles.icon} aria-hidden="true" />
      <p className={styles.text}>
        {analyticsAvailable ? t('ui.storage.analyticsText') : <>{t('ui.storage.before')} <strong>{t('ui.storage.emphasis')}</strong> {t('ui.storage.after')}</>}{' '}
        <Link to="/cookies" className={styles.link}>{t('ui.storage.details')}</Link>
      </p>
      {analyticsAvailable ? (
        <div className={styles.actions}>
          <button type="button" className={styles.reject} onClick={() => analitikTercihi('denied')}>{t('ui.storage.rejectAnalytics')}</button>
          <button type="button" className={styles.allow} onClick={() => analitikTercihi('granted')}>{t('ui.storage.allowAnalytics')}</button>
        </div>
      ) : (
        <button type="button" className={styles.dismiss} onClick={kapat} aria-label={t('ui.storage.dismiss')}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </aside>
  )
}
