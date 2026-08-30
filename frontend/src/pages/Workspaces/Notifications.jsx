import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import styles from './Notifications.module.css'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'
import { formatDate } from '@/utils/formatters'

export default function Notifications() {
  const { t } = useTranslation('workspace')
  const { formatLocale } = useLocalization()
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [data, setData] = useState({ notifications: [], unreadCount: 0 })

  const load = useCallback(async () => {
    try {
      setData(await api.workspace.notifications.list(workspaceId))
    } catch (error) {
      toast.error(error.message || t('notifications.loadFailed'))
    }
  }, [t, toast, workspaceId])

  useEffect(() => { load() }, [load])

  async function markRead(notification) {
    if (!notification.readAt) {
      await api.workspace.notifications.read(workspaceId, notification.id)
      await load()
    }
    if (notification.recordId) navigate(`/app/workspaces/${workspaceId}/tracker`)
  }

  async function readAll() {
    await api.workspace.notifications.readAll(workspaceId)
    toast.success(t('notifications.markedAllRead'))
    await load()
  }

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h2>{t('notifications.title')}</h2>
          <p>{t('notifications.subtitle')}</p>
        </div>
        {data.unreadCount > 0 && (
          <button onClick={readAll}><CheckCheck size={17} /> {t('notifications.markAllRead')}</button>
        )}
      </div>
      <div className={styles.summary}>{t('notifications.unreadCount', { count: data.unreadCount })}</div>
      {data.notifications.length === 0 ? (
        <div className={styles.empty}><Bell size={42} /><h3>{t('notifications.empty')}</h3><p>{t('notifications.emptyHint')}</p></div>
      ) : (
        <div className={styles.list}>
          {data.notifications.map(notification => (
            <button
              key={notification.id}
              className={`${styles.item} ${notification.readAt ? '' : styles.unread}`}
              onClick={() => markRead(notification)}
            >
              <Bell size={20} />
              <span>
                <strong>{notification.title}</strong>
                <small>{notification.body}</small>
              </span>
              <time>{formatDate(notification.createdAt, { locale: formatLocale, dateStyle: 'medium', timeStyle: 'short' })}</time>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
