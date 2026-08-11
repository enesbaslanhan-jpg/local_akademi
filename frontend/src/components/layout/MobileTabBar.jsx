import { useLocation, useNavigate } from 'react-router-dom'
import { primaryLinks } from './Sidebar'
import styles from './MobileTabBar.module.css'

/*
 * MOBİL ALT SEKME ÇUBUĞU — yalnızca <900px'te görünür.
 * Maddeler Sidebar'ın primaryLinks dizisinden gelir; tek kaynak orası olsun
 * diye burada ayrı bir liste tutulmuyor. Karar Araçları feature flag'e bağlı
 * olduğu için kapalıyken çubuk 4 maddeye iner — uydurma madde eklenmez.
 * Kalan menü maddeleri (Haberler, Ayarlar, İşletme Takibi, Kaydedilenler,
 * yönetim grubu) üstteki hamburgerden açılan drawer'da kalır.
 */
export default function MobileTabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = path =>
    path === '/app/dashboard'
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <nav className={styles.tabBar} aria-label="Alt navigasyon">
      {primaryLinks.map(link => {
        const Icon = link.icon
        const active = isActive(link.path)
        return (
          <button
            key={link.id}
            type="button"
            className={`${styles.tab} ${active ? styles.active : ''}`}
            onClick={() => navigate(link.path)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            <span className={styles.label}>{link.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
