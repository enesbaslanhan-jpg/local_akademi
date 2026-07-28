import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import styles from './Notifications.module.css'

export default function Notifications() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [data, setData] = useState({ notifications: [], unreadCount: 0 })

  const load = useCallback(async () => {
    try {
      setData(await api.workspace.notifications.list(workspaceId))
    } catch (error) {
      toast.error(error.message || 'Bildirimler yüklenemedi.')
    }
  }, [toast, workspaceId])

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
    toast.success('Tüm bildirimler okundu olarak işaretlendi.')
    await load()
  }

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h2>Bildirimler</h2>
          <p>Yaklaşan ödemeler, tahsilatlar, senetler ve diğer işletme tarihleri.</p>
        </div>
        {data.unreadCount > 0 && (
          <button onClick={readAll}><CheckCheck size={17} /> Tümünü okundu yap</button>
        )}
      </div>
      <div className={styles.summary}>{data.unreadCount} okunmamış bildirim</div>
      {data.notifications.length === 0 ? (
        <div className={styles.empty}><Bell size={42} /><h3>Bildirim yok</h3><p>Yaklaşan tarihler burada görünecek.</p></div>
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
              <time>{new Date(notification.createdAt).toLocaleString('tr-TR')}</time>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
