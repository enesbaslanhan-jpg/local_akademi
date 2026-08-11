import { useEffect } from 'react'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { ArrowLeft } from 'lucide-react'
import { Select } from '@/components/ui'
import styles from './WorkspaceLayout.module.css'

/*
 * Sekme sırası Paket 5 / İŞ 7'de verilen sıraya göre dizildi.
 * TEK EKLEME: "Kayıtlar" (tracker). Verilen listede yok ama sidebar'daki
 * "İşletme Takibi" bağlantısı doğrudan bu route'a gidiyor; sekmeden
 * çıkarılsaydı sayfa açıkken hiçbir sekme aktif görünmezdi ve kayıt
 * listesine sekmeyle dönüş kalmazdı. Hiçbir route silinmedi.
 */
const tabs = [
  { id: 'overview', label: 'Genel Bakış', path: 'overview' },
  { id: 'tracker', label: 'Kayıtlar', path: 'tracker' },
  { id: 'documents', label: 'Belgeler', path: 'documents' },
  { id: 'notifications', label: 'Bildirimler', path: 'notifications' },
  { id: 'calendar', label: 'Takvim', path: 'calendar' },
  { id: 'team', label: 'Ekip', path: 'team' },
  { id: 'contacts', label: 'Kişiler', path: 'contacts' },
  { id: 'activity', label: 'Aktiviteler', path: 'activity' },
  { id: 'settings', label: 'Ayarlar', path: 'settings' }
]

const NEW_WORKSPACE = '__new__'
const ALL_WORKSPACES = '__all__'

export default function WorkspaceLayout() {
  const { workspaceId } = useParams()
  const { refreshActiveWorkspace, switchWorkspace, activeWorkspace, workspaces } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (workspaceId && workspaceId !== activeWorkspace?.id) {
      switchWorkspace(workspaceId)
      return
    }
    refreshActiveWorkspace()
  }, [workspaceId, activeWorkspace?.id, refreshActiveWorkspace, switchWorkspace])

  const currentTab = tabs.find(t => location.pathname.endsWith(t.path))?.id || 'overview'

  /* İşletme seçicisi — tek işletme varsa gösterilmez, yalnızca ad yazar. */
  const showPicker = (workspaces?.length || 0) > 1

  async function handlePick(value) {
    if (value === ALL_WORKSPACES || value === NEW_WORKSPACE) {
      // Yeni işletme oluşturma akışı liste sayfasında yaşıyor.
      navigate('/app/workspaces')
      return
    }
    if (value === activeWorkspace?.id) return
    await switchWorkspace(value)
    navigate(`/app/workspaces/${value}/${currentTab}`)
  }

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
          {/* İşletme adı sayfa adı DEĞİL (üst bar "İşletme Takibi" diyor), bu
              yüzden görünür kalır; erişilebilir başlık ayrıca sr-only verilir. */}
          <h1 className="sr-only">{activeWorkspace.name} — İşletme Takibi</h1>
          {showPicker ? (
            <div className={styles.wsPicker}>
              <Select
                className={styles.wsSelect}
                variant="bare"
                aria-label="İşletme seç"
                value={activeWorkspace.id}
                onChange={handlePick}
                options={[
                  ...workspaces.map(w => ({ value: w.id, label: w.name })),
                  { value: '__separator__', label: '──────────', disabled: true },
                  { value: NEW_WORKSPACE, label: '+ Yeni işletme oluştur' },
                  { value: ALL_WORKSPACES, label: 'Tüm işletmeler' }
                ]}
              />
            </div>
          ) : (
            <div className={styles.wsName}>{activeWorkspace.name}</div>
          )}
          <div className={styles.headerMeta}>
            {activeWorkspace.sector && <span>{activeWorkspace.sector}</span>}
            {activeWorkspace.city && <span>{activeWorkspace.city}</span>}
            <span>{activeWorkspace.memberCount} üye</span>
            {activeWorkspace.myRole && <span>({activeWorkspace.myRole})</span>}
          </div>
        </div>
      )}

      <div className={styles.tabs} aria-label="İşletme Takibi bölümleri">
        {tabs.map(tab => (
          <button key={tab.id}
            className={`${styles.tab} ${currentTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => navigate(`/app/workspaces/${workspaceId}/${tab.path}`)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.workspaceContent} data-workspace-screen={currentTab}>
        <Outlet />
      </div>
    </div>
  )
}
