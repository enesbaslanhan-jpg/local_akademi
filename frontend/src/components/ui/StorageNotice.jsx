import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Cookie, X } from 'lucide-react'
import styles from './StorageNotice.module.css'

/*
 * BİLGİLENDİRME bildirimi — onay bandı DEĞİL.
 *
 * Ölçüldü (23.08.2026): LocalKarar kendi oturum/analitik/reklam çerezini
 * koymuyor ve üçüncü taraf izleme/analitik yok. Cloudflare güvenlik
 * koşullarında teknik çerez koyabilir. Tarayıcıda saklanan her şey ya oturum için
 * zorunlu ya kullanıcının kendi tercihi:
 *
 *   token                             oturum anahtarı (zorunlu)
 *   localkarar-theme                  açık/koyu tema tercihi
 *   localkarar-sidebar-collapsed      kenar çubuğu tercihi
 *   localkarar-verify-banner-dismissed  oturumluk (sekme kapanınca gider)
 *   alıştırma/mentor durumları        kullanıcının kendi girdileri
 *
 * Bu yüzden "Kabul et / Reddet" düğmesi konmadı: reddedilebilecek
 * isteğe bağlı bir işleme yok, olmayan bir seçim sunmak yanıltıcı olur.
 * İzleme eklendiği gün bu bileşen gerçek bir onay bandına dönüşmeli.
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
  const location = useLocation()
  const [gorundu, setGorundu] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(NOTICE_KEY) === 'true'
  })
  const [hiddenByRoute, setHiddenByRoute] = useState(false)

  useEffect(() => {
    setHiddenByRoute(shouldHideNotice(location.pathname, location.hash, inline))
  }, [inline, location.pathname, location.hash])

  if (gorundu || hiddenByRoute) return null

  function kapat() {
    window.localStorage.setItem(NOTICE_KEY, 'true')
    setGorundu(true)
  }

  return (
    <aside className={inline ? styles.inlineNotice : styles.notice} role="note" aria-label="Tarayıcı depolaması bilgilendirmesi">
      <Cookie size={18} className={styles.icon} aria-hidden="true" />
      <p className={styles.text}>
        LocalKarar <strong>kendi analitik veya reklam çerezini kullanmıyor</strong> ve
        üçüncü taraf izleme aracı çalıştırmıyor. Tarayıcında oturumun ve tercihlerin
        saklanıyor; Cloudflare gerektiğinde teknik güvenlik çerezi oluşturabilir.{' '}
        <Link to="/cookies" className={styles.link}>Ayrıntılar</Link>
      </p>
      <button type="button" className={styles.dismiss} onClick={kapat} aria-label="Bildirimi kapat">
        <X size={16} aria-hidden="true" />
      </button>
    </aside>
  )
}
