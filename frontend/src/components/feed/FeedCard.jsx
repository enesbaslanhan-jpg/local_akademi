import { useState } from 'react'
import { Card, Button } from '@/components/ui'
import { X, ChevronRight, BookOpen, CheckSquare, Target, Calculator, Briefcase } from 'lucide-react'
import styles from './Feed.module.css'

export function FeedCard({ item, onDismiss, onAction }) {
  const [dismissing, setDismissing] = useState(false)

  const handleDismiss = async (e) => {
    e.stopPropagation()
    setDismissing(true)
    try {
      await onDismiss(item.itemKey)
    } catch (error) {
      setDismissing(false)
    }
  }

  const handleAction = (e) => {
    e.stopPropagation()
    onAction(item)
  }

  const icons = {
    continue_learning: <BookOpen size={16} />,
    decision_check: <CheckSquare size={16} />,
    practical_card: <Target size={16} />,
    recommended_guide: <BookOpen size={16} />,
    financial_tool: <Calculator size={16} />,
    complete_business_profile: <Briefcase size={16} />
  }

  if (item.dismissed || dismissing) return null

  return (
    <Card className={styles.feedCard} hoverable onClick={handleAction}>
      <div className={styles.feedHeader}>
        <div className={styles.feedReason}>
          <span className={styles.feedIcon}>{icons[item.type]}</span>
          <span className={styles.reasonText}>{item.reasonText}</span>
        </div>
        <button className={styles.dismissBtn} onClick={handleDismiss} aria-label="Bu öneriyi gizle" title="Bu öneriyi gizle">
          <X size={16} />
        </button>
      </div>
      <div className={styles.feedBody}>
        <h3 className={styles.feedTitle}>{item.title}</h3>
        {item.shortDescription && <p className={styles.feedDesc}>{item.shortDescription}</p>}
        {item.type === 'complete_business_profile' && item.missingFieldLabels && (
          <div className={styles.missingFields}>
            <span className={styles.missingCount}>{item.missingFieldCount} Eksik Alan:</span>
            <ul className={styles.missingList}>
              {item.missingFieldLabels.map((label, idx) => (
                <li key={idx} className={styles.missingBadge}>{label}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className={styles.feedFooter}>
        <Button variant="primary" size="sm" onClick={handleAction}>
          {item.primaryAction.label} <ChevronRight size={14} />
        </Button>
      </div>
    </Card>
  )
}
