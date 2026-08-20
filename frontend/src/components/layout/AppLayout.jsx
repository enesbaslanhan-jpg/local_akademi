import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import { ContextPanelProvider } from './ContextPanel'
import MobileTabBar from './MobileTabBar'
import MentorLauncher from '../mentor/MentorLauncher'
import MentorPanel from '../mentor/MentorPanel'
import VerificationBanner from './VerificationBanner'
import WelcomeTour from './WelcomeTour'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  /* Mobil drawer. Masaüstünde ray zaten sabit olduğu için kullanılmaz. */
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('localkarar-sidebar-collapsed') === 'true'
  })
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    window.localStorage.setItem('localkarar-sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  return (
    <ContextPanelProvider>
      <div className={`${styles.layout} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
        {/* Ray/drawer sabit kalır — sayfa geçişi yalnızca main content'i etkiler */}
        <Sidebar
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(prev => !prev)}
        />

        <div className={styles.main}>
          <Header onToggleSidebar={() => setDrawerOpen(prev => !prev)} />
          <main className={styles.content}>
            <VerificationBanner />
            {/* key={pathname}: route değiştiğinde ortak fadeSlideUp ile yeniden görünür,
                içerik/route/iş mantığı değişmez, sadece giriş animasyonu tetiklenir. */}
            <div key={location.pathname} className={`${styles.pageTransition} ${styles.pageTransitionAnim}`}>
              <Outlet />
            </div>
          </main>
        </div>

        <MobileTabBar />
        <MentorLauncher />
        <MentorPanel />
        <WelcomeTour />
      </div>
    </ContextPanelProvider>
  )
}
