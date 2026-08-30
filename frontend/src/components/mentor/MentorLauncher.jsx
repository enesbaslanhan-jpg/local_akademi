import { useTranslation } from 'react-i18next'
import { useMentorContext } from '@/context/MentorContext'
import { MessageSquare } from 'lucide-react'
import styles from './MentorLauncher.module.css'

export default function MentorLauncher() {
  const { t } = useTranslation('mentor')
  const { isPanelOpen, togglePanel, isFullPage } = useMentorContext()

  if (isFullPage || isPanelOpen) return null

  return (
    <button
      onClick={togglePanel}
      className={styles.launcher}
      aria-label={t('launcher.openAriaLabel')}
      title="AI Mentor"
    >
      <MessageSquare size={24} />
      <span className={styles.label}>AI Mentor</span>
    </button>
  )
}
