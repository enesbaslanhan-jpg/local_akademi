import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import FounderBadge from '@/components/billing/FounderBadge'
import { useWorkspace } from '@/context/WorkspaceContext'
import {
  Home, BookOpen, Bot, Settings, Shield, Bell,
  Users, Database, X, Calculator, Newspaper,
  Building2, ListChecks, Scale, LogOut, LifeBuoy,
  PanelLeftClose, PanelLeftOpen, MessagesSquare, Search, Plus, ChevronDown
} from 'lucide-react'
import styles from './Sidebar.module.css'
import BrandMark from '@/components/ui/BrandMark'
import { featureFlags } from '@/config/featureFlags'
import { WORKSPACE_NAV_TABS } from '@/pages/Workspaces/navigation'
import { useTranslation } from 'react-i18next'

/*
 * ANA MENÜ — sadeleştirilmiş bilgi mimarisi (Paket 4).
 *
 * HİÇBİR ROUTE SİLİNMEDİ. Menüden çıkan sayfalar erişilebilir kalır:
 *   İşletme Takvimi  → İşletme Takibi'nin sekmesi
 *   İşletmelerim     → İşletme Takibi'ndeki işletme seçicisi
 *   Kayıtlarım       → Kurslar sayfasında sekme (/app/enrollments hâlâ çalışır)
 *
 * KALDIRILAN YÜZEYLER (03.09.2026, ürün sahibi kararı): Bilgi Kütüphanesi,
 * Bilgi Nesnesi detayı ve Öğrenme Yolu. Deneme amaçlı içerikti; ürünün
 * öğrenme yüzeyi 38 kanonik kursla sınırlandı. Rotalar da SİLİNDİ —
 * menüden çıkarmakla yetinilmedi, çünkü erişilebilir kalmaları
 * istenmiyordu.
 *   Model Laboratuvarı → Hesaplamalar içindeki detaylı mod (/app/finance/models redirect olur)
 *   Pratik Kartlar / Flashcard / Quiz → feature flag'li legacy route'lar
 */
const dashboardLink = { id: 'dashboard', i18nKey: 'nav.dashboard', icon: Home, path: '/app/dashboard', exact: true }
const coursesLink = { id: 'courses', i18nKey: 'nav.courses', icon: BookOpen, path: '/app/courses' }
const decisionLink = { id: 'decision-checks', i18nKey: 'nav.decisionTools', shortLabelKey: 'nav.mobileDecisionTools', icon: Scale, path: '/app/decision-checks', recommended: true }
const toolsLink = { id: 'tools', i18nKey: 'nav.calculations', shortLabelKey: 'nav.mobileCalculations', icon: Calculator, path: '/app/calculations' }
const mentorLink = { id: 'mentor', i18nKey: 'nav.mentor', icon: Bot, path: '/app/mentor' }

const decisionGroup = featureFlags.decisionChecks ? [decisionLink] : []

/* Haberler ve Topluluk aynı ağacın altında yaşıyor: Haberler kökte
   (`/app/community`), forum onun altında. Bu yüzden Haberler `exact` —
   yoksa forumdayken ikisi birden etkin görünür. */
const newsLink = { id: 'community', i18nKey: 'nav.news', icon: Newspaper, path: '/app/community', exact: true }
const forumLink = { id: 'community-forum', i18nKey: 'nav.community', icon: MessagesSquare, path: '/app/community/topluluk' }

/*
 * MOBİL alt sekme çubuğu — masaüstü rayından BİLEREK ayrı.
 *
 * `kisaEtiket`: dar ekranda etiket kabı ~71px. "Karar Araçları" ve
 * "Hesaplamalar" oraya sığmıyor ve üç noktayla kesiliyordu (9.6px'te
 * bile — ölçüldü). Masaüstü tam adı kullanmaya devam ediyor.
 *
 * Eskiden tek dizi vardı ve MobileTabBar onu kullanıyordu. Ürün sahibinin
 * kararıyla (21.08.2026) mobil sıra ayrıştı: dar ekranda Kurslar ve AI
 * Mentor birincil olmaktan çıktı, yerlerine Topluluk ve Haberler geldi.
 * AI Mentor zaten ekranın sağ altında kendi yüzen düğmesiyle duruyor;
 * çubukta ikinci kez yer kaplaması gereksizdi.
 *
 * Bu bir kopya değil, bilinçli bir ayrım: masaüstünde geniş kenar çubuğu
 * hepsini birden gösterebiliyor, mobilde beş yuva var. Tanımlar hâlâ tek
 * yerde (yukarıdaki sabitler), yalnızca SIRA yüzeye göre değişiyor.
 * Birleştirmeye kalkan olursa mobil sıra bozulur.
 */
export const mobileTabLinks = [
  dashboardLink,
  forumLink,
  ...decisionGroup,
  toolsLink,
  newsLink
]

/* Masaüstü rayı — hesaplama derinliği ayrı destinasyon değil, hesap içi moddur. */
const desktopPrimaryLinks = [
  dashboardLink,
  coursesLink,
  ...decisionGroup,
  toolsLink,
  mentorLink
]

/* Sıra onaylanan ekranlardan: Haberler · Topluluk · Kaydedilenler · Ayarlar.
   Kaydedilenler ile Ayarlar bileşen içinde ekleniyor (biri işletme durumuna
   bakmıyor artık, diğeri grubun sonunda duruyor). */
const secondaryLinks = [newsLink, forumLink]

/*
 * BİLDİRİMLER.
 *
 * 🔴 Sayfaya tek giriş üst çubuktaki ZİLDİ. Zili fark etmeyen kullanıcı
 * üyelik ve ödeme bildirimlerini hiç göremiyordu; rozet okununca
 * kaybolduğu için geri dönüş yolu da kalmıyordu.
 *
 * Ürün sahibi kararı (03.09.2026): menüye eklenecekse SOL MENÜYE
 * eklensin — zil zaten üstte duruyor, hesap menüsüne koymak üçüncü bir
 * kopya olurdu.
 */
const notificationsLink = { id: 'bildirimler', i18nKey: 'nav.notifications', icon: Bell, path: '/app/bildirimler' }

const settingsLink = { id: 'settings', i18nKey: 'nav.settings', icon: Settings, path: '/app/settings' }

/* /yardim sayfası ve çalışan iletişim formu zaten vardı; eksik olan
   giriş yapmış kullanıcının oraya GİDEBİLMESİYDİ — tek bağlantı herkese
   açık Hakkında sayfasının altındaydı. */
const helpLink = { id: 'yardim', i18nKey: 'nav.help', icon: LifeBuoy, path: '/yardim' }

/* Açılır menünün başlığı. `path` panele gidiyor: menüyü açmadan
   doğrudan tıklayan kullanıcı boşluğa düşmemeli. */
const adminParentLink = { id: 'admin', i18nKey: 'nav.management', icon: Shield, path: '/admin/dashboard' }

const adminLinks = [
  { id: 'admin-dashboard', i18nKey: 'nav.admin.dashboard', icon: Shield, path: '/admin/dashboard' },
  { id: 'admin-knowledge', i18nKey: 'nav.admin.knowledge', icon: Database, path: '/admin/knowledge' },
  { id: 'admin-users', i18nKey: 'nav.admin.users', icon: Users, path: '/admin/users' },
  { id: 'admin-imports', i18nKey: 'nav.admin.imports', icon: Database, path: '/admin/imports' },
  { id: 'admin-community', i18nKey: 'nav.admin.community', icon: Newspaper, path: '/admin/community' },
  { id: 'admin-audit', i18nKey: 'nav.admin.audit', icon: Shield, path: '/admin/audit-logs' }
]

export default function Sidebar({
  open,
  onClose,
  collapsed = false,
  onToggleCollapsed
}) {
  const { t, i18n } = useTranslation(['common', 'workspace'])
  const { isAdmin, logout } = useAuth()
  const { activeWorkspaceId } = useWorkspace()
  const location = useLocation()
  const navigate = useNavigate()
  const [navQuery, setNavQuery] = useState('')
  const routeGroup = location.pathname.startsWith('/app/calculations') || location.pathname.startsWith('/app/tools') || location.pathname.startsWith('/app/finance/models')
    ? 'tools'
    : location.pathname.startsWith('/app/community/topluluk') || (location.pathname === '/app/profil' && new URLSearchParams(location.search).has('liste'))
      ? 'community-forum'
    : location.pathname.startsWith('/app/workspaces')
      ? 'workspace-tracker'
      : null
  const [expandedMenu, setExpandedMenu] = useState(routeGroup)

  useEffect(() => {
    if (routeGroup) setExpandedMenu(routeGroup)
  }, [routeGroup])

  const displayLabel = link => link.i18nKey ? t(link.i18nKey) : link.label
  const normalizedQuery = navQuery.trim().toLocaleLowerCase(i18n.resolvedLanguage === 'en' ? 'en-US' : 'tr-TR')
  const matchesQuery = link => !normalizedQuery || displayLabel(link).toLocaleLowerCase(i18n.resolvedLanguage === 'en' ? 'en-US' : 'tr-TR').includes(normalizedQuery)

  /* ANA MENÜ'nün son maddesi. Takvim ve İşletmelerim menüden çıktı; sırasıyla
     Takip sekmesinden ve işletme seçicisinden erişiliyor. */
  const trackerLink = activeWorkspaceId
      ? { id: 'workspace-tracker', i18nKey: 'nav.businessTracking', icon: ListChecks, path: `/app/workspaces/${activeWorkspaceId}/tracker` }
      : { id: 'workspace-create', i18nKey: 'nav.businessTracking', icon: Building2, path: '/app/workspaces' }

  function handleNavigate(path) {
    navigate(path)
    onClose?.()
  }

  function isActive(linkPath) {
    if (linkPath === location.pathname) return true
    if (linkPath.includes('/app/workspaces/') && linkPath.endsWith('/tracker') && location.pathname.startsWith('/app/workspaces/')) return true
    if (linkPath === '/app/calculations' && (location.pathname.startsWith('/app/tools') || location.pathname.startsWith('/app/finance/models'))) return true
    /* Topluluk, Haberler'in alt yolu ama ayrı bir menü maddesi — Haberler
       onun üzerindeyken aktif görünmemeli. */
    if (linkPath === '/app/community' && location.pathname.startsWith('/app/community/topluluk')) return false
    if (linkPath !== '/app/dashboard' && location.pathname.startsWith(linkPath)) return true
    if (linkPath === '/app/flashcards' && location.pathname.startsWith('/app/flashcards/')) return true
    if (linkPath === '/app/quiz' && location.pathname.startsWith('/app/quiz/')) return true
    return false
  }

  const submenuFor = link => {
    const view = new URLSearchParams(location.search).get('view')
    if (link.id === 'tools') {
      /* Etiketler ToolsPage'deki VIEWS ile BİREBİR AYNI olmalı. Önceden
         aynı görünümün iki adı vardı ("Genel Bakış" / "Tümü", "Katalog" /
         "Hesaplamalar") ve kullanıcı ikisinin ayrı şeyler olduğunu
         sanıyordu. Sıra da aynı: girişte açılan görünüm (Katalog) ilk. */
      const onTools = location.pathname === '/app/calculations' || location.pathname === '/app/tools'
      return [
        { label: t('nav.catalog'), path: '/app/calculations?view=calculator', active: onTools && (view === null || view === 'calculator' || view === 'models') },
        { label: t('nav.history'), path: '/app/calculations?view=history', active: onTools && view === 'history' },
      ]
    }
    if (link.id === 'community-forum') {
      return [
        { label: t('nav.feed'), path: '/app/community/topluluk', active: location.pathname.startsWith('/app/community/topluluk') },
        { label: t('nav.profile'), path: '/app/profil?liste=posts', active: location.pathname === '/app/profil' },
        { label: t('nav.followingAndBlocking'), path: '/app/community/kisiler', active: location.pathname === '/app/community/kisiler' },
        { label: t('nav.chats'), path: '/app/community/sohbetler', active: location.pathname === '/app/community/sohbetler' },
      ]
    }
    if (link.id === 'admin') {
      return adminLinks.map(item => ({
        label: displayLabel(item),
        path: item.path,
        active: location.pathname.startsWith(item.path),
      }))
    }
    if (link.id === 'workspace-tracker' && activeWorkspaceId) {
      // TEK KAYNAK: Workspaces/navigation.js (sekme sirasi urun karari).
      return WORKSPACE_NAV_TABS.map(({ path, i18nKey }) => ({
        label: t(i18nKey),
        path: `/app/workspaces/${activeWorkspaceId}/${path}`,
        active: location.pathname === `/app/workspaces/${activeWorkspaceId}/${path}`,
      }))
    }
    return []
  }

  function renderLink(link) {
    if (!matchesQuery(link)) return null
    const Icon = link.icon
    const label = displayLabel(link)
    const active = isActive(link.path)
    const submenu = submenuFor(link)
    const expanded = submenu.length > 0 && expandedMenu === link.id && !collapsed
    return (
      <Fragment key={link.id}>
      <button
        className={`${styles.navItem} ${active ? styles.active : ''} ${link.recommended ? styles.recommended : ''}`}
        onClick={() => {
          if (submenu.length > 0) {
            setExpandedMenu(current => current === link.id ? null : link.id)
            /* Zaten bu bölümün içindeysek YALNIZ menüyü aç/kapat.
               Önceden üst maddeye basmak aynı anda bölüm köküne
               gidiyordu; yani alt menüyü görmek isteyen kullanıcı
               bulunduğu görünümden (ör. Geçmiş) koparılıp
               Katalog'a atılıyordu. */
            if (active) return
          }
          handleNavigate(link.path)
        }}
        aria-current={active ? 'page' : undefined}
        aria-expanded={submenu.length > 0 ? expanded : undefined}
        /* Karsilama turunun tutundugu nokta. Tur, menu maddesini bu
           nitelikle buluyor; sinif adlari CSS Modules tarafindan
           hashlendigi icin onlara gore aranamaz. */
        data-tour={link.id}
      >
        <Icon size={17} aria-hidden="true" />
        <span className={styles.navLabel}>{label}</span>
        {link.recommended && <span className={styles.recommendedBadge}>{t('nav.recommended')}</span>}
        {submenu.length > 0 && <ChevronDown className={`${styles.submenuChevron} ${expanded ? styles.submenuChevronOpen : ''}`} size={15} aria-hidden="true" />}
      </button>
      {expanded && (
        <div className={styles.submenu} aria-label={t('accessibility.submenu', { label })}>
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
/*
     * Haber oluşturma YALNIZ Haberler ekranında önerilir.
     *
     * Önceden `startsWith('/app/community')` kullanılıyordu; bu, Topluluk
     * sayfasını (`/app/community/topluluk`) da kapsadığı için Toplulukta da
     * "Haber oluştur" düğmesi çıkıyordu. Ayrıca hedefi `#yayin-araclari`
     * çapasıydı — resmî içerik formu artık orada değil, yönetim panelinde.
     *
     * Toplulukta hızlı eylem yok: sayfanın kendi "Gönderi oluştur" düğmesi
     * zaten en üstte duruyor.
     */
    if (location.pathname === '/app/community' && isAdmin) {
      return { label: t('nav.createNews'), path: '/admin/community' }
    }
    if (location.pathname.startsWith('/app/calculations') || location.pathname.startsWith('/app/tools')) {
      return { label: t('nav.startCalculation'), path: '/app/calculations?start=1' }
    }
    return null
  }, [isAdmin, location.pathname, t])

  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose} aria-hidden="true" />}
      <aside className={`${styles.sidebar} ${open ? styles.open : ''} ${collapsed ? styles.collapsed : ''}`} aria-label={t('accessibility.mainNavigation')}>
        <div className={styles.logoArea}>
          <div className={styles.brand}>
            {/* Uygulamaya girildiğinde bir kez oynar; imleç üstüne gelince
                tekrar. Giriş ekranındaki hareketin devamı. */}
            <BrandMark size={26} animated interactive />
            <span className={styles.logoText}>
              <strong>LocalKarar</strong>
              <small>{t('nav.professionalCommunity')}</small>
            </span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label={t('accessibility.closeMenu')}>
            <X size={18} />
          </button>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? t('accessibility.expandMenu') : t('accessibility.collapseMenu')}
            aria-expanded={!collapsed}
            title={collapsed ? t('accessibility.expandMenu') : t('accessibility.collapseMenu')}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <label className={styles.navSearch}>
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">{t('nav.search')}</span>
          <input
            type="search"
            value={navQuery}
            onChange={event => setNavQuery(event.target.value)}
            placeholder={t('nav.search')}
            /* Tarayıcı, arama alanlarında daha önce yazılanları gri bir
               öneri kutusunda gösteriyordu. Burası menüyü süzen yerel bir
               alan; geçmiş değerlerin anlamı yok, kutu yalnızca menüyü
               kapatıyordu. */
            autoComplete="off"
          />
        </label>

        <nav className={styles.nav}>
          <div className={styles.sectionLabel}>{t('nav.workspaceSection')}</div>
          {desktopPrimaryLinks.map(renderLink)}
          {renderLink(trackerLink)}

          <div className={styles.divider} />
          <div className={styles.sectionLabel}>{t('nav.otherSection')}</div>
          {secondaryLinks.map(renderLink)}
          {renderLink(notificationsLink)}
          {renderLink(settingsLink)}
          {renderLink(helpLink)}

          {isAdmin && (
            <>
              <div className={styles.divider} />
              {/*
                * Yönetim artık TEK açılır madde (22.08.2026).
                *
                * Altı bağlantı düz liste hâlinde duruyordu ve günlük
                * kullanımda hiç açılmayan bu bölüm menünün yarısını
                * kaplıyordu.
                *
                * Yeni bir açılır-kapanır sistemi YAZILMADI: yukarıdaki
                * `expandedMenu` + `submenuFor` mekanizması zaten var ve
                * Karar Araçları ile İşletme Takibi onu kullanıyor.
                */}
              {renderLink(adminParentLink)}
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

        <div className={styles.userArea} aria-label={t('accessibility.userActions')}>
          {/* Daraltılmış kenar çubuğunda gizleniyor (CSS). */}
          <FounderBadge className={styles.uyelikRozeti} />
          <button className={styles.logoutBtn} onClick={logout} aria-label={t('nav.logout')} title={t('nav.logout')}>
            <LogOut size={15} aria-hidden="true" />
            <span className={styles.logoutLabel}>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
