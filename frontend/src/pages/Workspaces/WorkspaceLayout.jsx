import { useEffect } from 'react'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { ArrowLeft } from 'lucide-react'
import styles from './WorkspaceLayout.module.css'

const tabs = [
  { id: 'overview', label: 'Genel Bakış', path: 'overview' },
  { id: 'team', label: 'Ekip', path: 'team' },
  { id: 'contacts', label: 'Kişiler', path: 'contacts' },
  { id: 'settings', label: 'Ayarlar', path: 'settings' },
  { id: 'activity', label: 'Aktiviteler', path: 'activity' }
]

export default function WorkspaceLayout() {
  const { workspaceId } = useParams()
  const { refreshActiveWorkspace, activeWorkspace } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    refreshActiveWorkspace()
  }, [workspaceId, refreshActiveWorkspace])

  const currentTab = tabs.find(t => location.pathname.endsWith(t.path))?.id || 'overview'

  return (
    <div className={styles.container}>
      <div className={styles.back}>
        <button onClick={() => navigate('/app/workspaces')}>
          <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Tüm İşletmeler
        </button>
      </div>

      {activeWorkspace && (
        <div className={styles.header}>
          <h1>{activeWorkspace.name}</h1>
          <div className={styles.headerMeta}>
            {activeWorkspace.sector && <span>{activeWorkspace.sector}</span>}
            {activeWorkspace.city && <span>{activeWorkspace.city}</span>}
            <span>{activeWorkspace.memberCount} üye</span>
            {activeWorkspace.myRole && <span>({activeWorkspace.myRole})</span>}
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        {tabs.map(tab => (
          <button key={tab.id}
            className={`${styles.tab} ${currentTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => navigate(`/app/workspaces/${workspaceId}/${tab.path}`)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Outlet />
    </div>
  )
}
