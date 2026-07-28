import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import {
  LayoutDashboard, BookOpen, Lightbulb, Bot,
  GraduationCap, Map, Settings, Shield,
  Users, Database, X, Calculator, Brain, HelpCircle, Newspaper,
  Building2
} from 'lucide-react'
import styles from './Sidebar.module.css'

const learnerLinks = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard' },
  { id: 'courses', label: 'Kurslar', icon: BookOpen, path: '/app/courses' },
  { id: 'knowledge', label: 'Bilgi Nesneleri', icon: Lightbulb, path: '/app/knowledge' },
  { id: 'mentor', label: 'AI Mentor', icon: Bot, path: '/app/mentor' },
  { id: 'community', label: 'Güncellemeler', icon: Newspaper, path: '/app/community' },
  { id: 'enrollments', label: 'Kayıtlarım', icon: GraduationCap, path: '/app/enrollments' },
  { id: 'learning', label: 'Öğrenme Yolu', icon: Map, path: '/app/learning-path' },
  { id: 'learning-pilot', label: 'Pilot Program', icon: Map, path: '/app/learning-path/pilot' },
  { id: 'flashcards', label: 'Flashcard', icon: Brain, path: '/app/flashcards' },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, path: '/app/quiz' },
  { id: 'tools', label: 'Araçlar', icon: Calculator, path: '/app/tools' },
  { id: 'settings', label: 'Ayarlar', icon: Settings, path: '/app/settings' }
]

const adminLinks = [
  { id: 'admin-dashboard', label: 'Panel', icon: Shield, path: '/admin/dashboard' },
  { id: 'admin-knowledge', label: 'KO Yönetimi', icon: Database, path: '/admin/knowledge' },
  { id: 'admin-users', label: 'Kullanıcılar', icon: Users, path: '/admin/users' },
  { id: 'admin-imports', label: 'Toplu İçe Aktar', icon: Database, path: '/admin/imports' },
  { id: 'admin-audit', label: 'Denetim Kayıtları', icon: Shield, path: '/admin/audit-logs' }
]

export default function Sidebar({ open, onClose }) {
  const { isAdmin, user } = useAuth()
  const { activeWorkspaceId } = useWorkspace()
  const location = useLocation()
  const navigate = useNavigate()

  function handleNavigate(path) {
    navigate(path)
    onClose?.()
  }

  function isActive(linkPath) {
    if (linkPath === location.pathname) return true
    if (linkPath === '/app/learning-path/pilot') return false
    if (linkPath !== '/app/dashboard' && location.pathname.startsWith(linkPath)) return true
    if (linkPath === '/app/knowledge' && location.pathname.startsWith('/app/knowledge/')) return true
    if (linkPath === '/app/flashcards' && location.pathname.startsWith('/app/flashcards/')) return true
    if (linkPath === '/app/quiz' && location.pathname.startsWith('/app/quiz/')) return true
    return false
  }

  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose} aria-hidden="true" />}
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-label="Ana navigasyon">
        <div className={styles.logoArea}>
          <span className={styles.logoText}>LocalAkademi</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Menüyü kapat">
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          <div className={styles.sectionLabel}>Öğrenme</div>
          {learnerLinks.map(link => {
            const Icon = link.icon
            const active = isActive(link.path)
            return (
              <button
                key={link.id}
                className={`${styles.navItem} ${active ? styles.active : ''}`}
                onClick={() => handleNavigate(link.path)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} />
                <span>{link.label}</span>
              </button>
            )
          })}

          <div className={styles.divider} />
          <div className={styles.sectionLabel}>İşletmem</div>
          {(() => {
            const wsActive = isActive('/app/workspaces')
            return (
              <button
                className={`${styles.navItem} ${wsActive ? styles.active : ''}`}
                onClick={() => handleNavigate('/app/workspaces')}
                aria-current={wsActive ? 'page' : undefined}
              >
                <Building2 size={20} />
                <span>İşletmelerim</span>
              </button>
            )
          })()}

          {isAdmin && (
            <>
              <div className={styles.divider} />
              <div className={styles.sectionLabel}>Yönetim</div>
              {adminLinks.map(link => {
                const Icon = link.icon
                const active = isActive(link.path)
                return (
                  <button
                    key={link.id}
                    className={`${styles.navItem} ${active ? styles.active : ''}`}
                    onClick={() => handleNavigate(link.path)}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={20} />
                    <span>{link.label}</span>
                  </button>
                )
              })}
            </>
          )}
        </nav>
      </aside>
    </>
  )
}
