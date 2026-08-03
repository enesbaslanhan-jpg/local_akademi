import { useMentorContext } from '@/context/MentorContext'
import { MessageSquare } from 'lucide-react'
import styles from './MentorLauncher.module.css'

export default function MentorLauncher() {
  const { isPanelOpen, togglePanel, isFullPage } = useMentorContext()

  if (isFullPage) return null

  return (
    <button
      onClick={togglePanel}
      className={`${styles.launcher} ${isPanelOpen ? styles.open : ''}`}
      aria-label="AI Mentor'u Aç"
      title="AI Mentor"
    >
      <MessageSquare size={24} />
      {!isPanelOpen && <span className={styles.label}>AI Mentor</span>}
    </button>
  )
}
