import { useLocation, useNavigate } from 'react-router-dom'
import { mobileTabLinks } from './Sidebar'
import styles from './MobileTabBar.module.css'

/*
 * MOBİL ALT SEKME ÇUBUĞU — yalnızca <900px'te görünür.
 *
 * Sıra masaüstünden AYRI (`mobileTabLinks`, Sidebar.jsx). Gerekçesi orada
 * yazılı; kısacası dar ekranda beş yuva var ve ürün sahibi Kurslar ile AI
 * Mentor yerine Topluluk ve Haberler'i istedi.
 *
 * Karar Araçları feature flag'e bağlı olduğu için kapalıyken çubuk 4
 * maddeye iner — uydurma madde eklenmez.
 *
 * Kalan menü maddeleri (Kurslar, Ayarlar, İşletme Takibi, Kaydedilenler,
 * yönetim grubu) üstteki hamburgerden açılan drawer'da kalır.
 */
export default function MobileTabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  /* `exact` işaretli maddeler yalnız tam eşleşmede etkin sayılır. Haberler
     (`/app/community`) forumun (`/app/community/topluluk`) ATASI olduğu
     için önek eşleşmesi ikisini birden yakardı. */
  const isActive = link =>
    link.exact
      ? location.pathname === link.path
      : location.pathname === link.path || location.pathname.startsWith(link.path + '/')

  return (
    <nav className={styles.tabBar} aria-label="Alt navigasyon">
      {mobileTabLinks.map(link => {
        const Icon = link.icon
        const active = isActive(link)
        return (
          <button
            key={link.id}
            type="button"
            className={`${styles.tab} ${active ? styles.active : ''}`}
            onClick={() => navigate(link.path)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            <span className={styles.label}>{link.kisaEtiket || link.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
