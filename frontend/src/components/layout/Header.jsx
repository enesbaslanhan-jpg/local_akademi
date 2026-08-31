import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, BookOpen, Calculator, CreditCard, LogOut, Menu, MessagesSquare, Moon, Newspaper, Search, Settings, ShieldCheck, Sun, UserRound, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTheme } from '@/context/ThemeContext'
import { api } from '@/services/api'
import FounderBadge from '@/components/billing/FounderBadge'
import { CALCULATION_DEFINITIONS } from '@/data/calculationCatalog'
import styles from './Header.module.css'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'

/*
 * Sayfa başlığı, route'tan türetilir. Route'lar veya navigasyon değişmez;
 * burada yalnızca üst alanda gösterilecek insan-okur başlık eşlenir.
 */
const TITLES = [
  ['/app/dashboard', 'nav.dashboard'],
  ['/app/courses', 'nav.courses'],
  ['/app/decision-checks', 'nav.decisionTools'],
  ['/app/calculations', 'nav.calculations'],
  ['/app/tools', 'nav.calculations'],
  ['/app/mentor', 'nav.mentor'],
  ['/app/practical-cards', 'nav.practicalCards'],
  ['/app/knowledge', 'nav.knowledgeObjects'],
  ['/app/enrollments', 'nav.myEnrollments'],
  ['/app/learning-path', 'nav.learningPath'],
  ['/app/finance/models', 'nav.calculations'],
  ['/app/flashcards', 'Flashcard'],
  ['/app/quiz', 'Quiz'],
  /* Daha spesifik olan önce gelmeli: resolveTitle ilk eşleşeni döndürür.
     Tek gönderi sayfası da topluluğun altında; bu satır olmadan üst
     çubukta "Haberler" yazıyordu. */
  ['/app/community/topluluk', 'nav.community'],
  ['/app/community/gonderi', 'nav.community'],
  ['/app/community', 'nav.news'],
  ['/app/profil', 'nav.profile'],
  ['/app/bildirimler', 'workspace:nav.notifications'],
  ['/app/settings', 'nav.settings'],
  ['/app/workspaces', 'nav.businessTracking'],
  ['/admin', 'nav.management']
]

function resolveTitle(pathname, t) {
  const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))
  return match ? t(match[1]) : 'LocalKarar'
}

const EMPTY_RESULTS = { courses: [], knowledge: [], decisionChecks: [], news: [], people: [], posts: [] }

export default function Header({ onToggleSidebar }) {
  const { t, i18n } = useTranslation(['common', 'tools'])
  const { formatLocale } = useLocalization()
  const { user, logout } = useAuth()
  const { activeWorkspaceId } = useWorkspace()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(EMPTY_RESULTS)
  const [okunmamis, setOkunmamis] = useState(0)

  /*
   * Okunmamış bildirim sayısı.
   *
   * Yol değiştikçe yeniden okunuyor -- ayrı bir yoklama (polling)
   * KURULMADI: dakikada bir istek atmak, tek sunuculu bir kurulumda
   * kullanıcı başına gereksiz yük demek. Gezinme zaten sık oluyor ve
   * bildirim sayfasına girince sayı sıfırlanıyor.
   */
  useEffect(() => {
    let iptal = false
    /*
     * İKİ KAYNAK TOPLANIYOR: topluluk + hesap (üyelik/ödeme).
     *
     * Zil daha önce yalnız topluluğu sayıyordu. Üyelik uyarıları ayrı
     * bir tabloda tutulduğu için (sebebi `account-notifications.ts`
     * içinde yazılı) buraya eklenmeseydi kullanıcı "süren doluyor"
     * bildirimini zilde HİÇ görmezdi.
     *
     * `allSettled`: biri düşerse diğeri yine sayılsın. Zil sayacı
     * kritik değil, ama yarısının çalışması hiç çalışmamasından iyi.
     */
    const oku = () => Promise.allSettled([
      api.community.bildirimler(),
      api.hesap.bildirimler(),
    ])
      .then(sonuclar => {
        if (iptal) return
        const toplam = sonuclar.reduce(
          (t, s) => t + (s.status === 'fulfilled' ? (s.value?.unread || 0) : 0),
          0,
        )
        setOkunmamis(toplam)
      })
      .catch(() => { /* Bildirim sayısı kritik değil; sessiz geç. */ })

    oku()

    /*
     * 🔴 OLAY DINLEYICISI SART.
     *
     * Sayac yalniz yol degisince okunuyordu. Bildirimler sayfasinda
     * KALIP "tumunu okundu isaretle" denince Header'in haberi olmuyor
     * ve rozet okunmus bildirimleri gostermeye devam ediyordu --
     * tarayicida olculdu.
     *
     * React context yerine DOM olayi: tek bir sayac icin ayri bir
     * saglayici kurmak, tasidigi degerden agir olurdu.
     */
    window.addEventListener('lk:bildirim-degisti', oku)
    return () => {
      iptal = true
      window.removeEventListener('lk:bildirim-degisti', oku)
    }
  }, [location.pathname])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchRef = useRef(null)
  const [hesapAcik, setHesapAcik] = useState(false)
  const hesapRef = useRef(null)

  /* Menüden bir yere gidildiğinde menü KAPANMALI: açık kalırsa yeni
     sayfanın üstünde asılı durur ve kullanıcı iki kez kapatmak zorunda
     kalır. */
  const gitVeKapat = yol => {
    setHesapAcik(false)
    navigate(yol)
  }

  const term = query.trim()

  /* Hesaplama kataloğu yerel — aranabilir katalog client'ta durur. */
  const calculationHits = useMemo(() => {
    const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'tr-TR'
    const q = term.toLocaleLowerCase(locale)
    if (!q) return []
    return CALCULATION_DEFINITIONS
      .filter(entry => t(`tools:${entry.titleKey}`).toLocaleLowerCase(locale).includes(q))
      .slice(0, 5)
  }, [term, t, i18n.resolvedLanguage])

  useEffect(() => {
    if (term.length < 2) {
      setResults(EMPTY_RESULTS)
      setOpen(false)
      setLoading(false)
      return undefined
    }
    setLoading(true)
    const timer = setTimeout(() => {
      api.search.query(term)
        .then(data => {
          /* Her alan TEK TEK yaziliyor; `...data` yazilmiyor cunku
             sunucu ileride fazladan alan donerse onu da duruma
             kopyalamak istemiyoruz. Ama bu, yeni alan eklerken burayi
             GUNCELLEMEYI UNUTMA riskini tasiyor -- nitekim `people` ve
             `posts` ilk yazimda dusuruldu ve arama "sonuc bulunamadi"
             dedi, sunucu veri donerken. */
          setResults({
            courses: data.courses || [],
            knowledge: data.knowledge || [],
            decisionChecks: data.decisionChecks || [],
            news: data.news || [],
            people: data.people || [],
            posts: data.posts || [],
          })
          setOpen(true)
        })
        .catch(() => setResults(EMPTY_RESULTS))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [term])

  /* Hesap menüsü — arama panelinin kapanma deseninin aynısı: dışarı
     tıklama ve Escape. İki ayrı desen kullanmak, birinin klavyeyle
     kapanıp diğerinin kapanmaması demek olurdu. */
  useEffect(() => {
    if (!hesapAcik) return undefined
    const disariTiklama = event => {
      if (hesapRef.current && !hesapRef.current.contains(event.target)) setHesapAcik(false)
    }
    const tusla = event => {
      if (event.key === 'Escape') setHesapAcik(false)
    }
    document.addEventListener('pointerdown', disariTiklama)
    document.addEventListener('keydown', tusla)
    return () => {
      document.removeEventListener('pointerdown', disariTiklama)
      document.removeEventListener('keydown', tusla)
    }
  }, [hesapAcik])

  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = event => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setOpen(false)
    }
    const handleKeyDown = event => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const submitSearch = event => {
    event.preventDefault()
    if (!term) return
    navigate(`/app/knowledge?search=${encodeURIComponent(term)}`)
    setOpen(false)
  }

  function go(path) {
    setOpen(false)
    navigate(path)
  }

  const hasAny = results.courses.length > 0
    || results.knowledge.length > 0
    || results.decisionChecks.length > 0
    || results.news.length > 0
    || (results.people?.length ?? 0) > 0
    || (results.posts?.length ?? 0) > 0
    || calculationHits.length > 0

  const today = new Date().toLocaleDateString(formatLocale, {
    day: 'numeric', month: 'long', year: 'numeric', weekday: 'long'
  })

  const initials = (user?.name || user?.email || 'K')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onToggleSidebar} aria-label={t('accessibility.openMenu')}>
          <Menu size={19} />
        </button>
        <h1 className={styles.pageTitle}>{resolveTitle(location.pathname, t)}</h1>
      </div>

      <div className={styles.right}>
        <div className={styles.searchWrap} ref={searchRef}>
          <form className={styles.search} onSubmit={submitSearch} role="search">
            <Search size={14} aria-hidden="true" />
            <input
              className={styles.searchInput}
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onFocus={() => { if (term.length >= 2 && hasAny) setOpen(true) }}
              placeholder={t('search.placeholder')}
              aria-label={t('search.label')}
              /* Bu alanın KENDİ öneri paneli var (aşağıdaki searchDropdown).
                 Tarayıcının arama geçmişi kutusu onun üstüne biniyor ve iki
                 ayrı öneri listesi aynı anda görünüyordu. */
              autoComplete="off"
            />
          </form>
          {open && (
            <div className={styles.searchDropdown} role="listbox" aria-label={t('search.results')}>
              {loading && <div className={styles.searchStatus}>{t('search.searching')}</div>}
              {!loading && !hasAny && <div className={styles.searchStatus}>{t('search.noResults')}</div>}
              {!loading && hasAny && (
                <>
                  {/* Kişiler ve paylaşımlar ÖNCE: arama kutusuna bir
                      isim yazan kullanıcı kursu değil kişiyi arıyor.
                      Sunucu engellediklerimi zaten listeden düşürüyor. */}
                  {results.people?.length > 0 && (
                    <div className={styles.searchGroup}>
                      <div className={styles.searchGroupLabel}><Users size={13} /> {t('search.groups.people')}</div>
                      {results.people.map(kisi => (
                        <button key={`p-${kisi.id}`} type="button" className={styles.searchItem} role="option" onClick={() => go(`/app/profil/${kisi.id}`)}>
                          <span><strong>{kisi.name}</strong><small>{kisi.bio || t('search.localKararMember')}</small></span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  {results.posts?.length > 0 && (
                    <div className={styles.searchGroup}>
                      <div className={styles.searchGroupLabel}><MessagesSquare size={13} /> {t('search.groups.posts')}</div>
                      {results.posts.map(gonderi => (
                        <button key={`g-${gonderi.id}`} type="button" className={styles.searchItem} role="option" onClick={() => go(`/app/community/gonderi/${gonderi.id}`)}>
                          <span><strong>{gonderi.ozet}</strong><small>{gonderi.author?.name || t('search.localKararUser')}</small></span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  {results.courses.length > 0 && (
                    <div className={styles.searchGroup}>
                      <div className={styles.searchGroupLabel}><BookOpen size={13} /> {t('search.groups.courses')}</div>
                      {results.courses.map(item => (
                        <button key={`c-${item.id}`} type="button" className={styles.searchItem} role="option" onClick={() => go(`/app/courses/${item.id}/learn`)}>
                          <span><strong>{item.title}</strong><small>{item.category} · {item.level}</small></span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  {results.knowledge.length > 0 && (
                    <div className={styles.searchGroup}>
                      <div className={styles.searchGroupLabel}><BookOpen size={13} /> {t('search.groups.knowledge')}</div>
                      {results.knowledge.map(item => (
                        <button key={`k-${item.id}`} type="button" className={styles.searchItem} role="option" onClick={() => go(`/app/knowledge/${item.code}`)}>
                          <span><strong>{item.title}</strong><small>{item.category?.name || item.code}</small></span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  {results.decisionChecks.length > 0 && (
                    <div className={styles.searchGroup}>
                      <div className={styles.searchGroupLabel}><ShieldCheck size={13} /> {t('search.groups.decisionTools')}</div>
                      {results.decisionChecks.map(item => (
                        <button key={`d-${item.id}`} type="button" className={styles.searchItem} role="option" onClick={() => go(`/app/decision-checks/${item.code}`)}>
                          <span><strong>{item.title}</strong><small>{item.description || item.code}</small></span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  {calculationHits.length > 0 && (
                    <div className={styles.searchGroup}>
                      <div className={styles.searchGroupLabel}><Calculator size={13} /> {t('search.groups.calculations')}</div>
                      {calculationHits.map(item => (
                        <button key={`m-${item.id}`} type="button" className={styles.searchItem} role="option" onClick={() => go(`/app/calculations?tool=${item.id}`)}>
                          <span><strong>{t(`tools:${item.titleKey}`)}</strong><small>{t('search.calculationCatalog')}</small></span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  {results.news.length > 0 && (
                    <div className={styles.searchGroup}>
                      <div className={styles.searchGroupLabel}><Newspaper size={13} /> {t('search.groups.news')}</div>
                      {results.news.map(item => (
                        <button key={`n-${item.id}`} type="button" className={styles.searchItem} role="option" onClick={() => go('/app/community')}>
                          <span><strong>{item.title}</strong><small>{item.category}</small></span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  <button type="button" className={styles.searchFooter} onClick={() => go(`/app/knowledge?search=${encodeURIComponent(term)}`)}>
                    {t('search.viewAllKnowledge')} <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <span className={styles.date}>{today}</span>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label={theme === 'dark' ? t('accessibility.switchToLightMode') : t('accessibility.switchToDarkMode')}
          title={theme === 'dark' ? t('accessibility.lightMode') : t('accessibility.darkMode')}
          aria-pressed={theme === 'dark'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        {/*
          * KURUCU ÜYE ROZETİ — sağ üstte, küçük (ürün sahibi kararı,
          * 31.08.2026: "ana sayfada üye olunca bir rozet belirsin,
          * sağ üstte küçük bir şey olabilir").
          *
          * 🔴 `membership.founder` false iken HİÇ ÇİZİLMİYOR ve bu
          * ücretlendirme kapalıyken herkes için false. Yani bugün
          * kimse görmüyor — rozet ancak gerçekten kurucu üye olan
          * birini ayırt ettiğinde anlam taşır.
          *
          * Kendi bileşenini kullanıyor: `FounderBadge` zaten Ana
          * Sayfa ve kenar çubuğunda çiziliyor, ikinci bir uygulama
          * yazmıyoruz.
          */}
        <FounderBadge className={styles.ustRozet} />

        {/*
          * Zil artık TOPLULUK bildirimlerine gidiyor.
          *
          * Önceden işletme bildirimlerine götürüyordu; sosyal katman
          * gelince kullanıcı takip edildiğini ya da mesaj geldiğini
          * hiçbir yerde göremiyordu. İşletme bildirimleri kendi
          * çalışma alanı ekranında zaten duruyor.
          */}
        <button
          className={styles.iconBtn}
          aria-label={okunmamis > 0 ? t('accessibility.unreadNotifications', { count: okunmamis }) : t('accessibility.openNotifications')}
          title={t('nav.notifications')}
          onClick={() => navigate('/app/bildirimler')}
        >
          <Bell size={17} />
          {okunmamis > 0 && <span className={styles.bildirimRozeti}>{okunmamis > 9 ? '9+' : okunmamis}</span>}
        </button>
        {/*
          * HESAP MENÜSÜ.
          *
          * 🔴 Ürün sahibi: "bu sayfaya erişmek çok zor, taa ayarlara
          * gideceğim sonra üyeliğe gireceğim, bu böyle mi olmalı".
          * Değildi: üyelik ekranı üç tık uzaktaydı ve hiçbir kısa yolu
          * yoktu.
          *
          * ⚠️ Avatar ÖNCEDEN `/app/settings#hesap`e gidiyordu ve
          * "hesap" `BOLUMLER` listesinde YOK — `acilisBolumu()` onu
          * tanımayıp sessizce profile düşürüyordu. Yani düğme yıllardır
          * yanlış adrese gidiyordu; menü bunu da düzeltiyor.
          */}
        <div className={styles.hesapSarmal} ref={hesapRef}>
          <button
            type="button"
            className={styles.avatar}
            title={t('accessibility.openProfile', { name: user?.name || user?.email || t('nav.profile') })}
            aria-label={t('accessibility.openAccountMenu')}
            aria-haspopup="menu"
            aria-expanded={hesapAcik}
            onClick={() => setHesapAcik(a => !a)}
          >{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}</button>

          {hesapAcik && (
            <div className={styles.hesapMenu} role="menu">
              <div className={styles.hesapBasi}>
                <strong>{user?.name || t('nav.profile')}</strong>
                <span>{user?.email}</span>
              </div>
              <button type="button" role="menuitem" className={styles.hesapOge} onClick={() => gitVeKapat('/app/settings?bolum=profile')}>
                <UserRound size={15} aria-hidden="true" /> {t('settings.profileBusiness')}
              </button>
              {/* İstenen kısa yol: tek tıkla üyelik. */}
              <button type="button" role="menuitem" className={styles.hesapOge} onClick={() => gitVeKapat('/app/settings?bolum=uyelik')}>
                <CreditCard size={15} aria-hidden="true" /> {t('settings.membership.title')}
              </button>
              <button type="button" role="menuitem" className={styles.hesapOge} onClick={() => gitVeKapat('/app/settings')}>
                <Settings size={15} aria-hidden="true" /> {t('nav.settings')}
              </button>
              <button type="button" role="menuitem" className={`${styles.hesapOge} ${styles.hesapCikis}`} onClick={() => { setHesapAcik(false); logout() }}>
                <LogOut size={15} aria-hidden="true" /> {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
