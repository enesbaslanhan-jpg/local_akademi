import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, BookOpen, Calculator, Menu, MessagesSquare, Moon, Newspaper, Search, ShieldCheck, Sun, Users } from 'lucide-react'
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
  /* Daha spesifik olan önce gelmeli: resolveTitle ilk eşleşeni döndürür.
     Tek gönderi sayfası da topluluğun altında; bu satır olmadan üst
     çubukta "Haberler" yazıyordu. */
  ['/app/community/topluluk', 'Topluluk'],
  ['/app/community/gonderi', 'Topluluk'],
  ['/app/community', 'Haberler'],
  ['/app/profil', 'Profil'],
  ['/app/bildirimler', 'Bildirimler'],
  ['/app/settings', 'Ayarlar'],
  ['/app/workspaces', 'İşletme Takibi'],
  ['/admin', 'Yönetim']
]

function resolveTitle(pathname) {
  const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))
  return match ? match[1] : 'LocalKarar'
}

const EMPTY_RESULTS = { courses: [], knowledge: [], decisionChecks: [], news: [], people: [], posts: [] }

export default function Header({ onToggleSidebar }) {
  const { user } = useAuth()
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
    const oku = () => api.community.bildirimler()
      .then(sonuc => { if (!iptal) setOkunmamis(sonuc.unread || 0) })
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
              /* Bu alanın KENDİ öneri paneli var (aşağıdaki searchDropdown).
                 Tarayıcının arama geçmişi kutusu onun üstüne biniyor ve iki
                 ayrı öneri listesi aynı anda görünüyordu. */
              autoComplete="off"
            />
          </form>
          {open && (
            <div className={styles.searchDropdown} role="listbox" aria-label="Arama sonuçları">
              {loading && <div className={styles.searchStatus}>Aranıyor…</div>}
              {!loading && !hasAny && <div className={styles.searchStatus}>Sonuç bulunamadı.</div>}
              {!loading && hasAny && (
                <>
                  {/* Kişiler ve paylaşımlar ÖNCE: arama kutusuna bir
                      isim yazan kullanıcı kursu değil kişiyi arıyor.
                      Sunucu engellediklerimi zaten listeden düşürüyor. */}
                  {results.people?.length > 0 && (
                    <div className={styles.searchGroup}>
                      <div className={styles.searchGroupLabel}><Users size={13} /> Kişiler</div>
                      {results.people.map(kisi => (
                        <button key={`p-${kisi.id}`} type="button" className={styles.searchItem} role="option" onClick={() => go(`/app/profil/${kisi.id}`)}>
                          <span><strong>{kisi.name}</strong><small>{kisi.bio || 'LocalKarar üyesi'}</small></span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  {results.posts?.length > 0 && (
                    <div className={styles.searchGroup}>
                      <div className={styles.searchGroupLabel}><MessagesSquare size={13} /> Paylaşımlar</div>
                      {results.posts.map(gonderi => (
                        <button key={`g-${gonderi.id}`} type="button" className={styles.searchItem} role="option" onClick={() => go(`/app/community/gonderi/${gonderi.id}`)}>
                          <span><strong>{gonderi.ozet}</strong><small>{gonderi.author?.name || 'LocalKarar kullanıcısı'}</small></span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
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
          aria-label={okunmamis > 0 ? `Bildirimler — ${okunmamis} okunmamış` : 'Bildirimleri aç'}
          title="Bildirimler"
          onClick={() => navigate('/app/bildirimler')}
        >
          <Bell size={17} />
          {okunmamis > 0 && <span className={styles.bildirimRozeti}>{okunmamis > 9 ? '9+' : okunmamis}</span>}
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
