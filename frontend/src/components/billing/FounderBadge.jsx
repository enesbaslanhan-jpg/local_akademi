import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { AuthContext } from '@/context/AuthContext'
import styles from './FounderBadge.module.css'

/*
 * KURUCU ÜYE ROZETİ.
 *
 * 🔴 `membership.founder` FALSE İSE HİÇ ÇİZİLMEZ.
 * Bugün `BILLING_STARTS_AT === null` olduğu için bu alan herkeste
 * `false` — yani rozet şu an kimsede görünmüyor. Ücretlendirme
 * başlamadan herkesi "kurucu üye" ilan etmek, rozeti hiçbir şey ayırt
 * etmeyen bir süse çevirirdi.
 *
 * Kararı sunucu veriyor (`hesaplaUyelikDurumu`), arayüz değil: aynı
 * mantığı iki yerde tutmak kaçınılmaz olarak ayrışır.
 *
 * ⚠️ `components/ui/Badge` BURADA KULLANILAMADI ve sebebi ölçüldü:
 * onun durum renkleri `color-mix(... , var(--surface-panel))` ile
 * yüzeyden türetiliyor. Ana sayfadaki rozet `DarkPanel` üzerinde
 * duruyor; orada aynı reçete koyu zemine açık tint bindirip okunmaz
 * bir sonuç veriyor. Bu yüzden tek bir rozet bileşeni ama İKİ zemin
 * karşılığı var — beşinci bir rozet bileşeni değil.
 */

/*
 * ⚠️ `useAuth()` BİLEREK KULLANILMIYOR — bağlam doğrudan okunuyor.
 *
 * `useAuth` sağlayıcı yoksa FIRLATIYOR ve bu çoğu tüketici için doğru:
 * oturum bilgisine gerçekten ihtiyaç duyan bir ekranın sessizce boş
 * çalışması hatayı gizler. Ama bu bileşen dekoratif bir rozet; onun
 * yüzünden bütün sayfanın düşmesi orantısız.
 *
 * Ölçüldü, varsayım değil: rozet eklendiğinde `useAuth` kullanan sürüm
 * `DashboardMarketplace.test.jsx` dahil 6 testi düşürdü — o testler
 * Dashboard'ı sağlayıcısız render ediyor ve haklılar, ölçtükleri şey
 * oturum değil.
 */
export default function FounderBadge({ onDark = false, className = '' }) {
  const { t } = useTranslation('common')
  const auth = useContext(AuthContext)

  if (!auth?.user?.membership?.founder) return null

  return (
    <span className={`${styles.rozet} ${onDark ? styles.rozetKoyu : ''} ${className}`}>
      <Sparkles size={12} aria-hidden="true" />
      {t('billing.founderMember')}
    </span>
  )
}
