import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Select, Card, Badge, Button, Progress, Loading, EmptyState, DarkPanel } from '@/components/ui'
import {
  BookOpen, Clock, ChevronRight, Play, Search, Target,
  LayoutGrid, List, Map, CheckCircle, Circle, ArrowRight
} from 'lucide-react'
import EnrollmentsPage from './EnrollmentsPage'
import styles from './CoursesPage.module.css'

const PAGE_SIZE = 6

/* Öğrenme yolu adımları backend'de alan/konu tabanlıdır (kurs değil):
   { step, domain, title, description, koCodes, estimatedDays, status }.
   Ana Sayfa ile aynı çözümleme kullanılır. */
function parseSteps(pathData) {
  if (!pathData) return []
  if (Array.isArray(pathData)) return pathData
  if (Array.isArray(pathData.steps)) return pathData.steps
  if (Array.isArray(pathData.modules)) return pathData.modules
  return []
}

function isStepDone(step) {
  return Boolean(step?.completed || step?.status === 'completed')
}

/* Kategori listesi katalogun tamamından toplanır. Backend'de kategori
   endpoint'i yok ve kurs listesi sayfalı döndüğü için, izin verilen en büyük
   sayfa boyutuyla (50) tüm sayfalar taranır. Yalnızca ilk yüklemede bir kez
   çalışır; kartlar yine pageSize=6 çağrısından gelir. */
const CATALOG_PAGE_SIZE = 50
const MAX_CATALOG_PAGES = 20 // güvenlik sınırı (≈1000 kurs)

async function collectAllCategories() {
  const found = new Set()
  let page = 1
  let totalPages = 1

  do {
    const data = await api.courses.getAll({ page, pageSize: CATALOG_PAGE_SIZE })
    const list = data?.courses || []
    list.forEach(c => { if (c.category) found.add(c.category) })
    totalPages = Math.max(1, Number(data?.totalPages) || 1)
    page += 1
  } while (page <= totalPages && page <= MAX_CATALOG_PAGES)

  return [...found].sort((a, b) => a.localeCompare(b, 'tr'))
}

/* Sayfa numaraları — çok sayfalı listelerde satırın taşmaması için aktif
   sayfanın çevresinde en fazla 5 numara gösterilir. */
function pageWindow(current, totalPages, size = 5) {
  if (totalPages <= size) return Array.from({ length: totalPages }, (_, i) => i + 1)
  let start = Math.max(1, current - Math.floor(size / 2))
  const end = Math.min(totalPages, start + size - 1)
  start = Math.max(1, end - size + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

/*
 * `initialTab`: /app/enrollments route'u bu sayfayı "Kayıtlarım" sekmesi
 * açık şekilde gösterir. Eski route çalışmaya devam eder.
 */
export default function CoursesPage({ initialTab = 'all' }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState(initialTab)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [view, setView] = useState('grid')

  // "Devam ettiğin kurslar" ve toplam ilerleme gerçek kayıt verisinden gelir.
  const [enrollments, setEnrollments] = useState([])
  const [learningPath, setLearningPath] = useState(null)
  // Katalogun TAMAMINDAN toplanan kategoriler (yalnızca filtre menüsünü ve
  // "N alanda" sayısını besler). Bir kez toplanır, sayfa/filtre değişiminde
  // yeniden çekilmez.
  const [allCategories, setAllCategories] = useState(null)

  const listTopRef = useRef(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    loadCourses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, level])

  // Öğrenme yolu — Ana Sayfa ile aynı kaynak (dashboard özeti).
  useEffect(() => {
    api.dashboard.getSummary()
      .then(data => {
        if (!mountedRef.current) return
        setLearningPath(data?.currentLearningPath || null)
      })
      .catch(() => { if (mountedRef.current) setLearningPath(null) })

    api.enrollments.getMy()
      .then(data => {
        if (!mountedRef.current) return
        setEnrollments(Array.isArray(data?.enrollments) ? data.enrollments : [])
      })
      .catch(() => { if (mountedRef.current) setEnrollments([]) })

    collectAllCategories()
      .then(list => { if (mountedRef.current && list) setAllCategories(list) })
      // Sessizce başarısız olur: filtre menüsü mevcut sayfadan türetilen
      // listeye düşer, sayfa bozulmaz.
      .catch(() => {})
  }, [])

  async function loadCourses() {
    setLoading(true)
    setError('')
    try {
      const filters = { page, pageSize: PAGE_SIZE }
      if (search) filters.search = search
      if (category) filters.category = category
      if (level) filters.level = level
      const data = await api.courses.getAll(filters)
      if (!mountedRef.current) return
      setCourses(data.courses || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (err) {
      if (mountedRef.current) setError(err.message || 'Kurslar yüklenemedi')
    }
    if (mountedRef.current) setLoading(false)
  }

  function handleSearch() {
    if (page !== 1) setPage(1)
    else loadCourses()
  }

  function resetFilters() {
    setSearch(''); setCategory(''); setLevel(''); setPage(1)
  }

  function goToPage(next) {
    setPage(next)
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleEnroll(courseId) {
    try {
      await api.enrollments.enroll(courseId)
      navigate(`/app/courses/${courseId}/learn`)
    } catch (err) {
      setError(err.message || 'Kayıt yapılamadı')
    }
  }

  // Katalog taraması başarılıysa onu kullan; değilse mevcut sayfadan türet.
  const categories = allCategories
    ?? [...new Set(courses.map(c => c.category).filter(Boolean))]

  /* ---- Devam ettiğin kurslar: kayıtlı ve devam eden olanlar ---- */
  const inProgress = enrollments.filter(e => e.status === 'in_progress')
  const continueCourses = inProgress.slice(0, 2)
  const overallProgress = inProgress.length > 0
    ? Math.round(inProgress.reduce((sum, e) => sum + (e.progress || 0), 0) / inProgress.length)
    : null

  /* ---- Öğrenme yolu ---- */
  const pathSteps = learningPath ? parseSteps(learningPath.pathData) : []
  const doneSteps = pathSteps.filter(isStepDone).length
  const pathPercent = pathSteps.length > 0 ? Math.round((doneSteps / pathSteps.length) * 100) : 0
  const nextStepIndex = pathSteps.findIndex(s => !isStepDone(s))
  const totalDays = pathSteps.reduce((sum, s) => sum + (Number(s.estimatedDays) || 0), 0)
  const showPath = Boolean(learningPath && pathSteps.length > 0)

  function renderCourseCard(course) {
    return (
      <Card key={course.id} className={styles.courseCard} hoverable>
        {(course.category || course.level) && (
          <div className={styles.badges}>
            <div className={styles.badgesLeft}>
              {course.category && <Badge variant="info">{course.category}</Badge>}
            </div>
            {course.level && (
              <Badge variant={course.level === 'uygulamalı' ? 'success' : 'default'}>
                {course.level}
              </Badge>
            )}
          </div>
        )}

        <h3 className={styles.courseTitle}>{course.title}</h3>

        {course.description && <p className={styles.description}>{course.description}</p>}

        {course.metadata?.promise && (
          <div className={styles.promise}>
            <Target size={14} aria-hidden="true" />
            <div className={styles.promiseBody}>
              <span className={styles.promiseLabel}>Kurs çıktısı:</span>
              <span className={styles.promiseText}>{course.metadata.promise}</span>
            </div>
          </div>
        )}

        {(course.lessonCount > 0 || course.estimatedMinutes > 0) && (
          <div className={styles.meta}>
            {course.lessonCount > 0 && (
              <span><BookOpen size={13} aria-hidden="true" /> {course.lessonCount} ders</span>
            )}
            {course.estimatedMinutes > 0 && (
              <span><Clock size={13} aria-hidden="true" /> {course.estimatedMinutes} dk</span>
            )}
          </div>
        )}

        {course.enrollment && (
          <div className={styles.progressBlock}>
            <Progress value={course.enrollment.progress} size="sm" variant="primary" />
            <span className={styles.progressText}>İlerleme: %{course.enrollment.progress}</span>
          </div>
        )}

        <div className={styles.cardAction}>
          {course.enrollment ? (
            <Button variant="primary" size="sm" onClick={() => navigate(`/app/courses/${course.id}/learn`)}>
              <Play size={14} /> Devam Et
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => handleEnroll(course.id)}>
              Kursa Git <ChevronRight size={14} />
            </Button>
          )}
        </div>
      </Card>
    )
  }

  function renderCourseRow(course) {
    return (
      <Card key={course.id} className={styles.listCard} hoverable>
        <div className={styles.listMain}>
          <h3 className={styles.listTitle}>{course.title}</h3>
          {course.description && <p className={styles.listDesc}>{course.description}</p>}
        </div>

        {(course.category || course.level) && (
          <div className={styles.listBadges}>
            {course.category && <Badge variant="info">{course.category}</Badge>}
            {course.level && (
              <Badge variant={course.level === 'uygulamalı' ? 'success' : 'default'}>
                {course.level}
              </Badge>
            )}
          </div>
        )}

        {(course.lessonCount > 0 || course.estimatedMinutes > 0 || course.enrollment) && (
          <div className={styles.listMeta}>
            {course.lessonCount > 0 && (
              <span><BookOpen size={13} aria-hidden="true" /> {course.lessonCount} ders</span>
            )}
            {course.estimatedMinutes > 0 && (
              <span><Clock size={13} aria-hidden="true" /> {course.estimatedMinutes} dk</span>
            )}
            {course.enrollment && <span>%{course.enrollment.progress}</span>}
          </div>
        )}

        <div className={styles.listAction}>
          {course.enrollment ? (
            <Button variant="primary" size="sm" onClick={() => navigate(`/app/courses/${course.id}/learn`)}>
              <Play size={14} /> Devam Et
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => handleEnroll(course.id)}>
              Kursa Git <ChevronRight size={14} />
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div className={styles.page}>
      {/* Sayfa adı üst barda yazıyor; görünür h1 yerine sr-only başlık. */}
      <h1 className="sr-only">İşletme Akademisi</h1>

      {!showPath && (
        <DarkPanel bevel={false} sweep className={styles.catalogHero}>
          <div>
            <span className={styles.pathEyebrow}>LocalKarar Akademi</span>
            <h2>İşletmeni güçlendiren uygulamalı kurslar</h2>
            <p>Finans, satış, operasyon ve büyüme kararlarını gerçek iş senaryolarıyla çalış.</p>
          </div>
          <div className={styles.catalogCount}>
            <strong>{total || '—'}</strong>
            <span>{categories.length > 0 ? `${categories.length} alanda kurs` : 'kurs hazırlanıyor'}</span>
          </div>
        </DarkPanel>
      )}

      {/* ---------- Öğrenme yolu şeridi — sayfanın TEK koyu paneli.
           Pahsız (geniş şerit), sweep kapalı. Veri yoksa hiç render edilmez. ---------- */}
      {showPath && (
        <DarkPanel bevel={false} className={styles.pathPanel}>
          <div className={styles.pathMain}>
            <span className={styles.pathEyebrow}>Öğrenme Yolun</span>
            <h2 className={styles.pathTitle}>{learningPath.title}</h2>
            {pathSteps[nextStepIndex]?.description && (
              <p className={styles.pathDesc}>{pathSteps[nextStepIndex].description}</p>
            )}

            <div className={styles.pathMeta}>
              <span>{pathSteps.length} adım</span>
              {totalDays > 0 && <span>~{totalDays} gün</span>}
            </div>

            <div className={styles.pathProgressRow}>
              <span className={styles.pathPercent}>%{pathPercent}</span>
              <div
                className={styles.pathTrack}
                role="progressbar"
                aria-valuenow={pathPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className={styles.pathFill} style={{ width: `${pathPercent}%` }} />
              </div>
              <span className={styles.pathProgressHint}>
                {doneSteps} / {pathSteps.length} adım tamamlandı
              </span>
            </div>

            {/* Sayfanın TEK turuncu CTA'sı */}
            <div className={styles.pathCta}>
              <Button variant="cta" size="md" onClick={() => navigate('/app/learning-path')}>
                Yolculuğa Devam Et <ArrowRight size={16} />
              </Button>
            </div>
          </div>

          <div className={styles.pathSteps}>
            {pathSteps.map((step, i) => {
              const done = isStepDone(step)
              const isNext = i === nextStepIndex
              return (
                <div
                  key={step.step ?? i}
                  className={`${styles.pathStep} ${done ? styles.pathStepDone : ''} ${isNext ? styles.pathStepNext : ''} ${!done && !isNext ? styles.pathStepPending : ''}`}
                >
                  {done
                    ? <CheckCircle size={14} className={`${styles.pathStepIcon} ${styles.pathStepIconDone}`} aria-hidden="true" />
                    : <Circle size={14} className={`${styles.pathStepIcon} ${isNext ? styles.pathStepIconNext : styles.pathStepIconPending}`} aria-hidden="true" />}
                  <span className={styles.pathStepName}>{step.title || step.domain}</span>
                  <span className={styles.pathStepState}>
                    {done ? 'Tamamlandı' : isNext ? 'Sıradaki' : 'Başlamadı'}
                  </span>
                </div>
              )
            })}
          </div>
        </DarkPanel>
      )}

      {/* ---------- Sekmeler: Tüm Kurslar / Kayıtlarım ---------- */}
      <div className={styles.pageTabs} role="tablist" aria-label="Kurs görünümü">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'all'}
          className={`${styles.pageTab} ${tab === 'all' ? styles.pageTabActive : ''}`}
          onClick={() => setTab('all')}
        >
          Tüm Kurslar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'enrollments'}
          className={`${styles.pageTab} ${tab === 'enrollments' ? styles.pageTabActive : ''}`}
          onClick={() => setTab('enrollments')}
        >
          Kayıtlarım
        </button>
      </div>

      {tab === 'enrollments' ? (
        <EnrollmentsPage embedded />
      ) : (
      <>
      {/* ---------- Filtre ve görünüm satırı ---------- */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Kurs ara..."
            aria-label="Kurs ara"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
          />
        </div>

        <div className={styles.toolbarMid}>
          <Select
            className={styles.select}
            aria-label="Alan filtresi"
            placeholder="Tüm alanlar"
            options={categories.map(c => ({ value: c, label: c }))}
            value={category}
            onChange={v => { setCategory(v); setPage(1) }}
          />
          <Select
            className={styles.select}
            aria-label="Kurs türü filtresi"
            placeholder="Tüm kurs türleri"
            options={[{ value: 'uygulamalı', label: 'Uygulamalı' }]}
            value={level}
            onChange={v => { setLevel(v); setPage(1) }}
          />
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.viewToggle} role="group" aria-label="Görünüm">
            <button
              type="button"
              className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('grid')}
              aria-label="Izgara görünümü"
              aria-pressed={view === 'grid'}
              title="Izgara görünümü"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('list')}
              aria-label="Liste görünümü"
              aria-pressed={view === 'list'}
              title="Liste görünümü"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* ---------- A. Devam ettiğin kurslar (sayfalamaya dahil değil) ---------- */}
      {continueCourses.length > 0 && (
        <section className={styles.section} aria-label="Devam ettiğin kurslar">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}><Play size={15} /> Devam ettiğin kurslar</h2>
            <div className={styles.sectionAside}>
              {overallProgress !== null && <span>Toplam ilerleme: %{overallProgress}</span>}
              <button type="button" className={styles.seeAll} onClick={() => setTab('enrollments')}>
                Tümünü gör
              </button>
            </div>
          </div>
          <div className={styles.continueGrid}>
            {continueCourses.map(e => (
              /* Kompakt varyant: kayıt endpoint'i açıklama/süre döndürmüyor,
                 bu yüzden o alanlara yer ayrılmaz. */
              <Card key={e.id} className={styles.continueCard} hoverable>
                {(e.courseCategory || e.courseLevel) && (
                  <div className={styles.badgesLeft}>
                    {e.courseCategory && <Badge variant="info">{e.courseCategory}</Badge>}
                    {e.courseLevel && <Badge variant="default">{e.courseLevel}</Badge>}
                  </div>
                )}

                <h3 className={styles.continueTitle}>{e.courseTitle}</h3>

                {e.courseLessonCount > 0 && (
                  <span className={styles.continueMeta}>
                    <BookOpen size={13} aria-hidden="true" /> {e.courseLessonCount} ders
                  </span>
                )}

                <div>
                  <Progress value={e.progress} size="sm" variant="primary" />
                  <span className={styles.progressText}>İlerleme: %{e.progress}</span>
                </div>

                <div className={styles.continueAction}>
                  <Button variant="primary" size="sm" onClick={() => navigate(`/app/courses/${e.courseId}/learn`)}>
                    <Play size={14} /> Devam Et
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ---------- B. Tüm kurslar (sayfalanmış) ---------- */}
      <section className={styles.section} aria-label="Tüm kurslar" ref={listTopRef}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            <Map size={15} /> Tüm kurslar{total > 0 ? ` (${total})` : ''}
          </h2>
        </div>

        {loading ? (
          <Loading text="Kurslar yükleniyor..." />
        ) : courses.length === 0 ? (
          <EmptyState
            message="Kurs bulunamadı"
            action
            actionLabel="Filtreleri Temizle"
            onAction={resetFilters}
          />
        ) : (
          <>
            <div className={view === 'grid' ? styles.grid : styles.list}>
              {courses.map(c => view === 'grid' ? renderCourseCard(c) : renderCourseRow(c))}
            </div>

            {totalPages > 1 && (
              <nav className={styles.pagination} aria-label="Sayfalama">
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  Önceki
                </button>
                {pageWindow(page, totalPages).map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.pageBtn} ${n === page ? styles.pageBtnActive : ''}`}
                    onClick={() => goToPage(n)}
                    aria-current={n === page ? 'page' : undefined}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Sonraki
                </button>
                <span className={styles.pageInfo}>Sayfa {page} / {totalPages}</span>
              </nav>
            )}
          </>
        )}
      </section>
      </>
      )}
    </div>
  )
}
