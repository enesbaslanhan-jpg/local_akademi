import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTheme } from '@/context/ThemeContext'
import styles from './Header.module.css'

/*
 * Sayfa başlığı, route'tan türetilir. Route'lar veya navigasyon değişmez;
 * burada yalnızca üst alanda gösterilecek insan-okur başlık eşlenir.
 */
const TITLES = [
  ['/app/dashboard', 'Ana Sayfa'],
  ['/app/courses', 'Kurslar'],
  ['/app/decision-checks', 'Karar Araçları'],
  ['/app/tools', 'Finans Merkezi'],
  ['/app/mentor', 'AI Mentor'],
  ['/app/practical-cards', 'Pratik Kartlar'],
  ['/app/knowledge', 'Bilgi Nesneleri'],
  ['/app/enrollments', 'Kayıtlarım'],
  ['/app/learning-path', 'Öğrenme Yolu'],
  ['/app/finance/models', 'Model Laboratuvarı'],
  ['/app/flashcards', 'Flashcard'],
  ['/app/quiz', 'Quiz'],
  /* Daha spesifik olan önce gelmeli: resolveTitle ilk eşleşeni döndürür. */
  ['/app/community/topluluk', 'Topluluk'],
  ['/app/community', 'Haberler'],
  ['/app/settings', 'Ayarlar'],
  ['/app/workspaces', 'İşletme Takibi'],
  ['/admin', 'Yönetim']
]

function resolveTitle(pathname) {
  const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))
  return match ? match[1] : 'LocalKarar'
}

export default function Header({ onToggleSidebar }) {
  const { user } = useAuth()
  const { activeWorkspaceId } = useWorkspace()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const today = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric', weekday: 'long'
  })

  const initials = (user?.name || user?.email || 'K')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onToggleSidebar} aria-label="Menüyü aç/kapat">
          <Menu size={19} />
        </button>
        <h1 className={styles.pageTitle}>{resolveTitle(location.pathname)}</h1>
      </div>

      <div className={styles.right}>
        <span className={styles.date}>{today}</span>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
          title={theme === 'dark' ? 'Açık mod' : 'Koyu mod'}
          aria-pressed={theme === 'dark'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button
          className={styles.iconBtn}
          aria-label="Bildirimleri aç"
          title="Bildirimler"
          onClick={() => navigate(activeWorkspaceId ? `/app/workspaces/${activeWorkspaceId}/notifications` : '/app/workspaces')}
        >
          <Bell size={17} />
        </button>
        <button
          type="button"
          className={styles.avatar}
          title={`${user?.name || user?.email || 'Profil'} profilini aç`}
          aria-label="Profil ve hesap ayarlarını aç"
          onClick={() => navigate('/app/settings#hesap')}
        >{initials}</button>
      </div>
    </header>
  )
}
