import { useEffect } from 'react'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { ArrowLeft } from 'lucide-react'
import { Select } from '@/components/ui'
import { WORKSPACE_NAV_TABS } from './navigation'
import styles from './WorkspaceLayout.module.css'

/*
 * Sekme sirasi ve etiketleri TEK KAYNAKTAN gelir:
 * ./navigation.js — Sidebar alt menusu ve ContextPanel ayni diziyi
 * kullanir; "Urunler" Siparisler ile Belgeler arasindadir. Mevcut
 * bolumler kaldirilmaz/yeniden adlandirilmaz/birlestirilmez.
 */
const tabs = WORKSPACE_NAV_TABS

const NEW_WORKSPACE = '__new__'
const ALL_WORKSPACES = '__all__'
const NEW_INTEGRATION = '__integration__'

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

  /*
   * İşletme seçicisi TEK işletmede de gösteriliyor.
   *
   * Eskiden yalnız birden fazla işletme varsa açılıyordu, çünkü tek
   * işlevi geçiş yapmaktı. Artık kurulum eylemlerini de taşıyor
   * ("yeni işletme", "pazaryeri mağazası bağla"); tek işletmesi olan
   * kullanıcıdan bunları gizlemek, mağaza bağlamayı Ayarlar'ın
   * dibinde aratmak olurdu.
   */
  const showPicker = (workspaces?.length || 0) >= 1

  async function handlePick(value) {
    if (value === NEW_INTEGRATION) {
      /* Entegrasyon ekranı Ayarlar'ın içinde yaşıyor. Buraya kısayol
         konmasının sebebi: mağaza bağlamak, işletme kurmakla aynı
         "kurulum" işi -- kullanıcı onu Ayarlar'ın dibinde aramak
         zorunda kalmamalı. */
      navigate('/app/settings?bolum=integrations')
      return
    }
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
                  { value: NEW_INTEGRATION, label: '+ Pazaryeri mağazası bağla' },
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
