import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import {
  Home, BookOpen, Bot, Settings, Shield,
  Users, Database, X, Calculator, Newspaper,
  Building2, ListChecks, Scale, Bookmark, LogOut, FlaskConical,
  PanelLeftClose, PanelLeftOpen, MessagesSquare, Search, Plus, ChevronDown
} from 'lucide-react'
import styles from './Sidebar.module.css'
import BrandMark from '@/components/ui/BrandMark'
import { featureFlags } from '@/config/featureFlags'

/*
 * ANA MENÜ — sadeleştirilmiş bilgi mimarisi (Paket 4).
 *
 * HİÇBİR ROUTE SİLİNMEDİ. Menüden çıkan sayfalar erişilebilir kalır:
 *   İşletme Takvimi  → İşletme Takibi'nin sekmesi
 *   İşletmelerim     → İşletme Takibi'ndeki işletme seçicisi
 *   Kayıtlarım       → Kurslar sayfasında sekme (/app/enrollments hâlâ çalışır)
 *   Öğrenme Yolu     → Kurslar sayfasındaki koyu panel
 *   Pilot Program    → yalnızca route (/app/learning-path/pilot)
 *   Bilgi Nesneleri  → ders içinden (Lesson.knowledgeObjectId bağı)
 *   Model Laboratuvarı → Finans Merkezi'nde sekme (/app/finance/models çalışır)
 *   Pratik Kartlar / Flashcard / Quiz → feature flag'li legacy route'lar
 */
const dashboardLink = { id: 'dashboard', label: 'Ana Sayfa', icon: Home, path: '/app/dashboard' }
const coursesLink = { id: 'courses', label: 'Kurslar', icon: BookOpen, path: '/app/courses' }
const decisionLink = { id: 'decision-checks', label: 'Karar Araçları', icon: Scale, path: '/app/decision-checks', recommended: true }
const toolsLink = { id: 'tools', label: 'Finans Merkezi', icon: Calculator, path: '/app/tools' }
const modelLabLink = { id: 'model-lab', label: 'Model Lab', icon: FlaskConical, path: '/app/finance/models' }
const mentorLink = { id: 'mentor', label: 'AI Mentor', icon: Bot, path: '/app/mentor' }

const decisionGroup = featureFlags.decisionChecks ? [decisionLink] : []

/* MobileTabBar bu diziyi kullanır. Alt sekme çubuğu en fazla 5 madde
   taşıyabildiği için Model Lab burada YOK — masaüstü rayında var, mobilde
   hamburger drawer'ından açılıyor. */
export const primaryLinks = [
  dashboardLink,
  coursesLink,
  ...decisionGroup,
  toolsLink,
  mentorLink
]

/* Masaüstü rayı — onaylanan ekranlardaki 11 öğe, o sıralamayla.
   Model Lab, Finans Merkezi ile AI Mentor arasında üst seviye bir madde;
   eskiden Finans Merkezi'nin `?view=models` sekmesi altında gizliydi. */
const desktopPrimaryLinks = [
  dashboardLink,
  coursesLink,
  ...decisionGroup,
  toolsLink,
  modelLabLink,
  mentorLink
]

/* Sıra onaylanan ekranlardan: Haberler · Topluluk · Kaydedilenler · Ayarlar.
   Kaydedilenler ile Ayarlar bileşen içinde ekleniyor (biri işletme durumuna
   bakmıyor artık, diğeri grubun sonunda duruyor). */
const secondaryLinks = [
  { id: 'community', label: 'Haberler', icon: Newspaper, path: '/app/community' },
  { id: 'community-forum', label: 'Topluluk', icon: MessagesSquare, path: '/app/community/topluluk' }
]

const settingsLink = { id: 'settings', label: 'Ayarlar', icon: Settings, path: '/app/settings' }

const adminLinks = [
  { id: 'admin-dashboard', label: 'Panel', icon: Shield, path: '/admin/dashboard' },
  { id: 'admin-knowledge', label: 'KO Yönetimi', icon: Database, path: '/admin/knowledge' },
  { id: 'admin-users', label: 'Kullanıcılar', icon: Users, path: '/admin/users' },
  { id: 'admin-imports', label: 'Toplu İçe Aktar', icon: Database, path: '/admin/imports' },
  { id: 'admin-audit', label: 'Denetim Kayıtları', icon: Shield, path: '/admin/audit-logs' }
]

export default function Sidebar({
  open,
  onClose,
  collapsed = false,
  onToggleCollapsed
}) {
  const { isAdmin, logout } = useAuth()
  const { activeWorkspaceId } = useWorkspace()
  const location = useLocation()
  const navigate = useNavigate()
  const [navQuery, setNavQuery] = useState('')
  const routeGroup = location.pathname.startsWith('/app/tools') || location.pathname.startsWith('/app/finance/models')
    ? 'tools'
    : location.pathname.startsWith('/app/workspaces')
      ? 'workspace-tracker'
      : null
  const [expandedMenu, setExpandedMenu] = useState(routeGroup)

  useEffect(() => {
    if (routeGroup) setExpandedMenu(routeGroup)
  }, [routeGroup])

  const normalizedQuery = navQuery.trim().toLocaleLowerCase('tr-TR')
  const matchesQuery = link => !normalizedQuery || link.label.toLocaleLowerCase('tr-TR').includes(normalizedQuery)

  /* ANA MENÜ'nün son maddesi. Takvim ve İşletmelerim menüden çıktı; sırasıyla
     Takip sekmesinden ve işletme seçicisinden erişiliyor. */
  const trackerLink = activeWorkspaceId
    ? { id: 'workspace-tracker', label: 'İşletme Takibi', icon: ListChecks, path: `/app/workspaces/${activeWorkspaceId}/tracker` }
    : { id: 'workspace-create', label: 'İşletme Takibi', icon: Building2, path: '/app/workspaces' }

  /* Kaydedilenler henüz kendi sayfasına bağlanamıyor: onaylanan ekran
     kaydedilen kurs/haber/araç/modeli tek yerde topluyor ama backend'de
     kaydetme kavramı yok (api.js'te saved/bookmark endpoint'i bulunmuyor;
     SavedPracticalCards var olmayan api.practicalCards'ı çağırıyor).
     Menüdeki yeri ve adı onaylanan sıraya uygun; hedefi işletme belgeleri
     olarak kalıyor. Gerçek sayfa için önce API gerekiyor. */
  const savedLink = activeWorkspaceId
    ? { id: 'saved', label: 'Kaydedilenler', icon: Bookmark, path: `/app/workspaces/${activeWorkspaceId}/documents` }
    : { id: 'saved', label: 'Kaydedilenler', icon: Bookmark, path: '/app/workspaces' }

  function handleNavigate(path) {
    navigate(path)
    onClose?.()
  }

  function isActive(linkPath) {
    if (linkPath === location.pathname) return true
    if (linkPath.includes('/app/workspaces/') && linkPath.endsWith('/tracker') && location.pathname.startsWith('/app/workspaces/')) return true
    if (linkPath === '/app/learning-path/pilot') return false
    /* Model Lab kendi maddesi olduğu için Finans Merkezi artık model
       yollarını sahiplenmez — aksi halde ikisi birden aktif görünür. */
    if (linkPath === '/app/tools' && location.pathname.startsWith('/app/finance/models')) return false
    /* Topluluk, Haberler'in alt yolu ama ayrı bir menü maddesi — Haberler
       onun üzerindeyken aktif görünmemeli. */
    if (linkPath === '/app/community' && location.pathname.startsWith('/app/community/topluluk')) return false
    if (linkPath !== '/app/dashboard' && location.pathname.startsWith(linkPath)) return true
    if (linkPath === '/app/knowledge' && location.pathname.startsWith('/app/knowledge/')) return true
    if (linkPath === '/app/flashcards' && location.pathname.startsWith('/app/flashcards/')) return true
    if (linkPath === '/app/quiz' && location.pathname.startsWith('/app/quiz/')) return true
    return false
  }

  const submenuFor = link => {
    const view = new URLSearchParams(location.search).get('view')
    if (link.id === 'tools') {
      /* 'Modeller' buradan çıktı — Model Lab artık üst seviye madde.
         ToolsPage'in kendi sekmesi duruyor, yalnız raydaki kısayol kalktı. */
      return [
        { label: 'Araçlar', path: '/app/tools?view=calculator', active: location.pathname === '/app/tools' && !['models', 'history'].includes(view) },
        { label: 'Geçmiş / Tamamlanan', path: '/app/tools?view=history', active: location.pathname === '/app/tools' && view === 'history' },
      ]
    }
    if (link.id === 'workspace-tracker' && activeWorkspaceId) {
      return [
        ['overview', 'Genel Bakış'], ['tracker', 'Kayıtlar'], ['documents', 'Belgeler'],
        ['notifications', 'Bildirimler'], ['calendar', 'Takvim'], ['team', 'Ekip'],
        ['contacts', 'Kişiler'], ['activity', 'Aktiviteler'], ['settings', 'Ayarlar'],
      ].map(([slug, label]) => ({
        label,
        path: `/app/workspaces/${activeWorkspaceId}/${slug}`,
        active: location.pathname === `/app/workspaces/${activeWorkspaceId}/${slug}`,
      }))
    }
    return []
  }

  function renderLink(link) {
    if (!matchesQuery(link)) return null
    const Icon = link.icon
    const active = isActive(link.path)
    const submenu = submenuFor(link)
    const expanded = submenu.length > 0 && expandedMenu === link.id && !collapsed
    return (
      <Fragment key={link.id}>
      <button
        className={`${styles.navItem} ${active ? styles.active : ''} ${link.recommended ? styles.recommended : ''}`}
        onClick={() => {
          if (submenu.length > 0) setExpandedMenu(current => current === link.id ? null : link.id)
          handleNavigate(link.path)
        }}
        aria-current={active ? 'page' : undefined}
        aria-expanded={submenu.length > 0 ? expanded : undefined}
      >
        <Icon size={17} aria-hidden="true" />
        <span className={styles.navLabel}>{link.label}</span>
        {link.recommended && <span className={styles.recommendedBadge}>Önerilen</span>}
        {submenu.length > 0 && <ChevronDown className={`${styles.submenuChevron} ${expanded ? styles.submenuChevronOpen : ''}`} size={15} aria-hidden="true" />}
      </button>
      {expanded && (
        <div className={styles.submenu} aria-label={`${link.label} alt menüsü`}>
          {submenu.map(item => (
            <button
              type="button"
              key={item.path}
              className={`${styles.submenuItem} ${item.active ? styles.submenuItemActive : ''}`}
              onClick={() => handleNavigate(item.path)}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      </Fragment>
    )
  }

  const quickAction = useMemo(() => {
    if (location.pathname.startsWith('/app/community/topluluk')) {
      return { label: 'Deneyim paylaş', path: '/app/community/topluluk#paylas' }
    }
    if (location.pathname.startsWith('/app/community') && isAdmin) {
      return { label: 'Haber oluştur', path: '/app/community#yayin-araclari' }
    }
    if (location.pathname.startsWith('/app/tools')) {
      return { label: 'Yeni hesaplama', path: '/app/tools' }
    }
    return null
  }, [isAdmin, location.pathname])

  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose} aria-hidden="true" />}
      <aside className={`${styles.sidebar} ${open ? styles.open : ''} ${collapsed ? styles.collapsed : ''}`} aria-label="Ana navigasyon">
        <div className={styles.logoArea}>
          <div className={styles.brand}>
            <BrandMark size={26} />
            <span className={styles.logoText}>
              <strong>LocalKarar</strong>
              <small>Professional Community</small>
            </span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Menüyü kapat">
            <X size={18} />
          </button>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <label className={styles.navSearch}>
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Menüde ara</span>
          <input
            type="search"
            value={navQuery}
            onChange={event => setNavQuery(event.target.value)}
            placeholder="Menüde ara..."
          />
        </label>

        <nav className={styles.nav}>
          <div className={styles.sectionLabel}>Çalışma alanı</div>
          {desktopPrimaryLinks.map(renderLink)}
          {renderLink(trackerLink)}

          <div className={styles.divider} />
          <div className={styles.sectionLabel}>Diğer</div>
          {secondaryLinks.map(renderLink)}
          {renderLink(savedLink)}
          {renderLink(settingsLink)}

          {isAdmin && (
            <>
              <div className={styles.divider} />
              <div className={styles.sectionLabel}>Yönetim</div>
              {adminLinks.map(renderLink)}
            </>
          )}
        </nav>

        {quickAction && (
          <button
            type="button"
            className={styles.quickAction}
            onClick={() => handleNavigate(quickAction.path)}
          >
            <Plus size={17} aria-hidden="true" />
            <span>{quickAction.label}</span>
          </button>
        )}

        <div className={styles.userArea} aria-label="Kullanıcı işlemleri">
          <button className={styles.logoutBtn} onClick={logout} aria-label="Çıkış yap" title="Çıkış yap">
            <LogOut size={15} aria-hidden="true" />
            <span className={styles.logoutLabel}>Çıkış yap</span>
          </button>
        </div>
      </aside>
    </>
  )
}
