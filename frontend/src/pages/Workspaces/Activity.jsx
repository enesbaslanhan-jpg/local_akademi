import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { Activity as ActivityIcon, UserPlus, Settings, Trash2, Mail, Building2 } from 'lucide-react'
import styles from './Activity.module.css'

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

const actionLabels = {
  'workspace.created': 'İşletme oluşturuldu',
  'workspace.updated': 'İşletme güncellendi',
  'workspace.archived': 'İşletme arşivlendi',
  'member.role.updated': 'Üye rolü güncellendi',
  'member.removed': 'Üye çıkarıldı',
  'invitation.sent': 'Davet gönderildi',
  'invitation.accepted': 'Davet kabul edildi',
  'contact.created': 'Kişi eklendi',
  'contact.updated': 'Kişi güncellendi'
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Az önce'
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} saat önce`
  const days = Math.floor(hours / 24)
  return `${days} gün önce`
}

export default function Activity() {
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

  if (loading) return <p>Aktiviteler yükleniyor...</p>

  if (activities.length === 0) {
    return <div className={styles.empty}><ActivityIcon size={40} /><p>Henüz aktivite kaydı bulunmuyor.</p></div>
  }

  return (
    <div className={styles.list}>
      {activities.map(a => {
        const Icon = actionIcons[a.action] || ActivityIcon
        const label = actionLabels[a.action] || a.action
        return (
          <div key={a.id} className={styles.item}>
            <div className={styles.icon}><Icon size={18} /></div>
            <div>
              <div className={styles.action}>{label}</div>
              {a.entityType !== 'workspace' && <div className={styles.meta}>{a.entityType}: {a.entityId || '-'}</div>}
            </div>
            <div className={styles.time}>{timeAgo(a.createdAt)}</div>
          </div>
        )
      })}
    </div>
  )
}
