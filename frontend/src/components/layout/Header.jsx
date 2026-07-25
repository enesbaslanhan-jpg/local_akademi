import { LogOut, User, Menu } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Badge from '@/components/ui/Badge'
import styles from './Header.module.css'

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useAuth()

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onToggleSidebar} aria-label="Menüyü aç/kapat">
          <Menu size={22} />
        </button>
        <h1 className={styles.logo}>LocalAkademi</h1>
      </div>

      <div className={styles.right}>
        <div className={styles.userInfo}>
          <User size={16} />
          <span className={styles.userName}>{user?.name || user?.email}</span>
          <Badge variant={user?.role === 'admin' ? 'warning' : 'default'}>
            {user?.role === 'admin' ? 'Admin' : user?.role === 'content_editor' ? 'Editör' : 'Öğrenci'}
          </Badge>
        </div>
        <button className={styles.logoutBtn} onClick={logout} aria-label="Çıkış yap">
          <LogOut size={18} />
          <span className={styles.logoutText}>Çıkış</span>
        </button>
      </div>
    </header>
  )
}
