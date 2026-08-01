import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import MentorLauncher from '../mentor/MentorLauncher'
import MentorPanel from '../mentor/MentorPanel'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={styles.layout}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={styles.main}>
        <Header onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      <MentorLauncher />
      <MentorPanel />
    </div>
  )
}
