import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, BookOpen, Calculator, Menu, Moon, Newspaper, Search, ShieldCheck, Sun } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTheme } from '@/context/ThemeContext'
import { api } from '@/services/api'
import { CALCULATION_DEFINITIONS } from '@/data/calculationCatalog'
import styles from './Header.module.css'

/*
 * Sayfa başlığı, route'tan türetilir. Route'lar veya navigasyon değişmez;
 * burada yalnızca üst alanda gösterilecek insan-okur başlık eşlenir.
 */
const TITLES = [
  ['/app/dashboard', 'Ana Sayfa'],
  ['/app/courses', 'Kurslar'],
  ['/app/decision-checks', 'Karar Araçları'],
  ['/app/calculations', 'Hesaplamalar'],
  ['/app/tools', 'Hesaplamalar'],
  ['/app/mentor', 'AI Mentor'],
  ['/app/practical-cards', 'Pratik Kartlar'],
  ['/app/knowledge', 'Bilgi Nesneleri'],
  ['/app/enrollments', 'Kayıtlarım'],
  ['/app/learning-path', 'Öğrenme Yolu'],
  ['/app/finance/models', 'Hesaplamalar'],
  ['/app/flashcards', 'Flashcard'],
  ['/app/quiz', 'Quiz'],
  /* Daha spesifik olan önce gelmeli: resolveTitle ilk eşleşeni döndürür. */
  ['/app/community/topluluk', 'Topluluk'],
  ['/app/community', 'Haberler'],
  ['/app/settings', 'Ayarlar'],
  ['/app/workspaces', 'İşletme Takibi'],
  ['/admin', 'Yönetim']
]

function resolveTitle(pathname) {
  const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))
  return match ? match[1] : 'LocalKarar'
}

const EMPTY_RESULTS = { courses: [], knowledge: [], decisionChecks: [], news: [] }

export default function Header({ onToggleSidebar }) {
  const { user } = useAuth()
  const { activeWorkspaceId } = useWorkspace()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(EMPTY_RESULTS)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchRef = useRef(null)

  const term = query.trim()

  /* Hesaplama kataloğu yerel — aranabilir katalog client'ta durur. */
  const calculationHits = useMemo(() => {
    const q = term.toLocaleLowerCase('tr-TR')
    if (!q) return []
    return CALCULATION_DEFINITIONS
      .filter(entry => `${entry.title} ${entry.description || ''}`.toLocaleLowerCase('tr-TR').includes(q))
      .slice(0, 5)
  }, [term])

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
          setResults({
            courses: data.courses || [],
            knowledge: data.knowledge || [],
            decisionChecks: data.decisionChecks || [],
            news: data.news || [],
          })
          setOpen(true)
        })
        .catch(() => setResults(EMPTY_RESULTS))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [term])

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
    || calculationHits.length > 0

  const today = new Date().toLocaleDateString('tr-TR', {
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
        <button className={styles.menuBtn} onClick={onToggleSidebar} aria-label="Menüyü aç/kapat">
          <Menu size={19} />
        </button>
        <h1 className={styles.pageTitle}>{resolveTitle(location.pathname)}</h1>
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
              placeholder="Kurs, karar aracı, hesaplama ara…"
              aria-label="Sitede ara"
            />
          </form>
          {open && (
            <div className={styles.searchDropdown} role="listbox" aria-label="Arama sonuçları">
              {loading && <div className={styles.searchStatus}>Aranıyor…</div>}
              {!loading && !hasAny && <div className={styles.searchStatus}>Sonuç bulunamadı.</div>}
              {!loading && hasAny && (
                <>
                  {results.courses.length > 0 && (
                    <div className={styles.searchGroup}>
                      <div className={styles.searchGroupLabel}><BookOpen size={13} /> Kurslar</div>
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
                      <div className={styles.searchGroupLabel}><BookOpen size={13} /> Bilgi Nesneleri</div>
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
                      <div className={styles.searchGroupLabel}><ShieldCheck size={13} /> Karar Araçları</div>
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
                      <div className={styles.searchGroupLabel}><Calculator size={13} /> Hesaplamalar</div>
                      {calculationHits.map(item => (
                        <button key={`m-${item.id}`} type="button" className={styles.searchItem} role="option" onClick={() => go(`/app/calculations?tool=${item.id}`)}>
                          <span><strong>{item.title}</strong><small>{item.description || 'Hesaplama kataloğu'}</small></span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  {results.news.length > 0 && (
                    <div className={styles.searchGroup}>
                      <div className={styles.searchGroupLabel}><Newspaper size={13} /> Haberler</div>
                      {results.news.map(item => (
                        <button key={`n-${item.id}`} type="button" className={styles.searchItem} role="option" onClick={() => go('/app/community')}>
                          <span><strong>{item.title}</strong><small>{item.category}</small></span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  <button type="button" className={styles.searchFooter} onClick={() => go(`/app/knowledge?search=${encodeURIComponent(term)}`)}>
                    Bilgi tabanında tüm sonuçları gör <ArrowRight size={14} aria-hidden="true" />
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
          aria-label={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
          title={theme === 'dark' ? 'Açık mod' : 'Koyu mod'}
          aria-pressed={theme === 'dark'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button
          className={styles.iconBtn}
          aria-label="Bildirimleri aç"
          title="Bildirimler"
          onClick={() => navigate(activeWorkspaceId ? `/app/workspaces/${activeWorkspaceId}/notifications` : '/app/workspaces')}
        >
          <Bell size={17} />
        </button>
        <button
          type="button"
          className={styles.avatar}
          title={`${user?.name || user?.email || 'Profil'} profilini aç`}
          aria-label="Profil ve hesap ayarlarını aç"
          onClick={() => navigate('/app/settings#hesap')}
        >{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}</button>
      </div>
    </header>
  )
}
