import { useMentorContext } from '@/context/MentorContext'
import { MessageSquare } from 'lucide-react'
import styles from './MentorLauncher.module.css'

export default function MentorLauncher() {
  const { isPanelOpen, togglePanel, isFullPage } = useMentorContext()

  if (isFullPage || isPanelOpen) return null

  return (
    <button
      onClick={togglePanel}
      className={styles.launcher}
      aria-label="AI Mentor'u Aç"
      title="AI Mentor"
    >
      <MessageSquare size={24} />
      <span className={styles.label}>AI Mentor</span>
    </button>
  )
}
