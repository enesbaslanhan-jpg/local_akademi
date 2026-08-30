import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { Activity as ActivityIcon, UserPlus, Settings, Trash2, Mail, Building2 } from 'lucide-react'
import styles from './Activity.module.css'
import { useTranslation } from 'react-i18next'

const actionIcons = {
  'workspace.created': Building2,
  'workspace.updated': Settings,
  'workspace.archived': Trash2,
  'member.role.updated': UserPlus,
  'member.removed': UserPlus,
  'invitation.sent': Mail,
  'invitation.accepted': Mail,
  'contact.created': UserPlus,
  'contact.updated': Settings
}

const actionLabelKeys = {
  'workspace.created': 'activity.created',
  'workspace.updated': 'activity.updated',
  'workspace.archived': 'activity.archived',
  'member.role.updated': 'activity.roleUpdated',
  'member.removed': 'activity.memberRemoved',
  'invitation.sent': 'activity.invitationSent',
  'invitation.accepted': 'activity.invitationAccepted',
  'contact.created': 'activity.contactAdded',
  'contact.updated': 'activity.contactUpdated'
}

function timeAgo(dateStr, t) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('relative.justNow')
  if (mins < 60) return t('relative.minutesAgo', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('relative.hoursAgoLong', { count: hours })
  const days = Math.floor(hours / 24)
  return t('relative.daysAgo', { count: days })
}

export default function Activity() {
  const { t } = useTranslation('workspace')
  const { workspaceId } = useParams()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.workspace.activity.list(workspaceId, { limit: 100 })
      .then(data => setActivities(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId])

  if (loading) return <p>{t('activityPage.loading')}</p>

  if (activities.length === 0) {
    return <div className={styles.empty}><ActivityIcon size={40} /><p>{t('activityPage.empty')}</p></div>
  }

  return (
    <div className={styles.list}>
      {activities.map(a => {
        const Icon = actionIcons[a.action] || ActivityIcon
        const label = actionLabelKeys[a.action] ? t(actionLabelKeys[a.action]) : a.action
        return (
          <div key={a.id} className={styles.item}>
            <div className={styles.icon}><Icon size={18} /></div>
            <div>
              <div className={styles.action}>{label}</div>
              {a.entityType !== 'workspace' && <div className={styles.meta}>{a.entityType}: {a.entityId || '-'}</div>}
            </div>
            <div className={styles.time}>{timeAgo(a.createdAt, t)}</div>
          </div>
        )
      })}
    </div>
  )
}
