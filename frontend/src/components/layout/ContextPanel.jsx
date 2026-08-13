import { createContext, useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import styles from './ContextPanel.module.css'

/*
 * BAĞLAM PANELİ — ikon rayının yanında duran, 240px genişliğinde ikinci
 * yüzen kart. YALNIZCA gerçekten alt navigasyonu olan 4 sayfada açılır:
 * Karar Araçları, Hesaplamalar, İşletme Takibi, AI Mentor.
 * Diğer sayfalarda hiç render edilmez, içerik alanı tam genişler.
 *
 * Panel iki tür içerik taşır:
 *   1) Route'tan türeyen sabit alt navigasyon (aşağıdaki resolveContextPanel)
 *   2) Sayfanın kendi enjekte ettiği dinamik içerik (<ContextPanelSlot>)
 * Sayfa içeriği portal ile basılır; böylece panel her render'da sayfayı
 * yeniden çizmeye zorlamaz ve döngü riski oluşmaz.
 */

const ContextPanelCtx = createContext(null)

export function useContextPanel() {
  return useContext(ContextPanelCtx)
}

export function ContextPanelProvider({ children }) {
  /* host: panelin gövdesindeki DOM düğümü — sayfa buraya portal açar */
  const [host, setHost] = useState(null)
  /* query: cam arama hapının değeri. Sayfalar kendi listelerini bu değere
     göre süzer (İŞ 4/5/6), böylece arama sahte değil gerçek bir filtre. */
  const [query, setQuery] = useState('')

  const value = useMemo(() => ({ host, setHost, query, setQuery }), [host, query])
  return <ContextPanelCtx.Provider value={value}>{children}</ContextPanelCtx.Provider>
}

/* Sayfalar bunu render ederek panele kendi bölümlerini basar. */
export function ContextPanelSlot({ children }) {
  const ctx = useContextPanel()
  if (!ctx?.host) return null
  return createPortal(children, ctx.host)
}

/* Panelin arama kutusunu okumak isteyen sayfalar için küçük yardımcı. */
export function useContextPanelQuery() {
  return useContextPanel()?.query ?? ''
}

const WORKSPACE_TABS = [
  ['overview', 'Genel Bakış'],
  ['tracker', 'Kayıtlar'],
  ['documents', 'Belgeler'],
  ['notifications', 'Bildirimler'],
  ['calendar', 'Takvim'],
  ['team', 'Ekip'],
  ['contacts', 'Kişiler'],
  ['activity', 'Aktiviteler'],
  ['settings', 'Ayarlar']
]

/*
 * Hangi route'ta panel açılır ve içinde hangi GERÇEK route'lar listelenir.
 * Karşılığı olmayan hiçbir bağlantı eklenmez.
 */
export function resolveContextPanel(pathname, { activeWorkspaceId, workspaces } = {}) {
  if (pathname.startsWith('/app/decision-checks')) {
    return {
      key: 'decision-checks',
      title: 'Karar Araçları',
      /* Durum ve gerçek araç listesi sayfadan ContextPanelSlot ile gelir. */
      links: []
    }
  }

  if (pathname.startsWith('/app/calculations') || pathname.startsWith('/app/tools') || pathname.startsWith('/app/finance/models')) {
    return {
      key: 'tools',
      title: 'Hesaplamalar',
      links: [{ label: 'Hesaplama kataloğu', path: '/app/calculations' }]
    }
  }

  if (pathname.startsWith('/app/workspaces')) {
    /* İşletme Takibi'nin tüm bölümleri masaüstünde bu bağlam panelinde yaşar.
       İçerikteki kompakt sekmeler yalnızca küçük ekranlarda erişim yedeğidir. */
    const links = activeWorkspaceId
      ? WORKSPACE_TABS.map(([slug, label]) => ({
        label,
        path: `/app/workspaces/${activeWorkspaceId}/${slug}`
      }))
      : []
    return {
      key: 'workspaces',
      title: 'İşletme Takibi',
      links,
      groups: (workspaces?.length ?? 0) > 1
        ? [{
          label: 'İşletmelerim',
          links: workspaces.map(ws => ({
            label: ws.name,
            path: `/app/workspaces/${ws.id}/overview`
          }))
        }]
        : []
    }
  }

  if (pathname.startsWith('/app/mentor')) {
    /* Sohbet listesi sayfadan enjekte edilir (İŞ 6) — burada sabit link yok. */
    return { key: 'mentor', title: 'AI Mentor', links: [] }
  }

  return null
}

export default function ContextPanel({ open, embedded = false }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { activeWorkspaceId, workspaces } = useWorkspace()
  const ctx = useContextPanel()

  const config = resolveContextPanel(location.pathname, { activeWorkspaceId, workspaces })
  if (!config) return null

  const isActive = path => location.pathname === path || location.pathname.startsWith(path + '/')

  const renderLinks = links => links.map(link => (
    <button
      key={link.path}
      type="button"
      className={`${styles.link} ${isActive(link.path) ? styles.linkActive : ''}`}
      onClick={() => navigate(link.path)}
      aria-current={isActive(link.path) ? 'page' : undefined}
    >
      <span className={styles.linkLabel}>{link.label}</span>
    </button>
  ))

  return (
    <aside
      className={`${styles.panel} ${embedded ? styles.embedded : ''} ${config.key === 'mentor' ? styles.mentorPanel : ''} ${config.key === 'workspaces' ? styles.workspacePanel : ''} ${open ? styles.open : ''}`}
      aria-label={`${config.title} bağlam paneli`}
      /* Kapalıyken içindeki alanlar tab sırasına girmesin */
      inert={!open || undefined}
    >
      <div className={styles.searchPill}>
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          className={styles.searchInput}
          value={ctx?.query ?? ''}
          onChange={e => ctx?.setQuery(e.target.value)}
          placeholder="Bu sayfada ara"
          aria-label={`${config.title} içinde ara`}
        />
      </div>

      <div className={styles.body}>
        <h2 className={styles.panelTitle}>{config.title}</h2>

        {config.links.length > 0 && (
          <nav className={styles.nav} aria-label={`${config.title} alt navigasyonu`}>
            {renderLinks(config.links)}
          </nav>
        )}

        {config.groups?.map(group => (
          <div key={group.label} className={styles.group}>
            <div className={styles.groupLabel}>{group.label}</div>
            <nav className={styles.nav} aria-label={group.label}>
              {renderLinks(group.links)}
            </nav>
          </div>
        ))}

        {/* Sayfanın enjekte ettiği içerik buraya iner (ContextPanelSlot). */}
        <div ref={ctx?.setHost} className={styles.slot} />
      </div>
    </aside>
  )
}
