import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import { ContextPanelProvider } from './ContextPanel'
import MobileTabBar from './MobileTabBar'
import MentorLauncher from '../mentor/MentorLauncher'
import MentorPanel from '../mentor/MentorPanel'
import VerificationBanner from './VerificationBanner'
import ConsentBanner from './ConsentBanner'
import MembershipBanner from './MembershipBanner'
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

        {/*
          TAM YÜKSEKLİK KİPİ.

          🔴 NEDEN: AI Mentor bir sohbet ekranı — kaydırması İÇERİDE
          (mesaj listesinde) olmalı, sayfanın kendisinde değil. Ama
          `.content` her sayfaya dolgu ekliyor ve `.main` `min-height:
          100vh` taşıyor; sayfa kendini viewport'a göre boyutlayınca
          dolgu üstüne binip belgeyi taşırıyordu. Ölçüldü: mentor
          sayfasında 98 piksel dikey kayma, ve taşan öğe içerik değil
          KENAR ÇUBUĞUYDU.

          Bu kipte `.main` sabit yükseklik alıyor, `.content` dolgusunu
          bırakıyor ve taşmayı kesiyor; sayfa kalan alanı tam
          dolduruyor.
        */}
        <div
          className={styles.main}
          data-tam-yukseklik={location.pathname.startsWith('/app/mentor') ? 'evet' : undefined}
        >
          <Header onToggleSidebar={() => setDrawerOpen(prev => !prev)} />
          <main className={styles.content}>
            {/* Yasal metin sürümü arttığında onay şeridi en üstte; kapatılamaz.
                Doğrulama hatırlatması onun altında. */}
            <ConsentBanner />
            <VerificationBanner />
            {/* Üyelik şeridi en sonda: yasal onay ve e-posta doğrulama
                daha acil ve ikisi de tek seferlik işler. Süre dolduğunda
                bu şerit kapatılamaz — kullanıcının yazamamasının tek
                açıklaması o. */}
            <MembershipBanner />
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
