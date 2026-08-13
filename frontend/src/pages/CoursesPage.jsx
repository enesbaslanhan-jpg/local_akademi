import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Select, Card, Badge, Button, Progress, Loading, EmptyState, PageHead } from '@/components/ui'
import {
  BookOpen, Clock, ChevronRight, Play, Search, Target,
  LayoutGrid, List, Map, CheckCircle, Circle, ArrowRight, SlidersHorizontal
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
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  const activeCourse = continueCourses[0]

  if (tab === 'enrollments') {
    return (
      <div className={styles.page}>
        <PageHead title="Kayıtlarım" subtitle="Başladığın kurslara ve ilerlemene dön." actions={<Button variant="secondary" onClick={() => setTab('all')}>Tüm kurslar</Button>} />
        <EnrollmentsPage embedded />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHead
        title="Kurslar"
        subtitle="Öğrenme yolunu kaldığın yerden sürdür."
        actions={<Button variant="quiet" onClick={() => setFiltersOpen(value => !value)}><SlidersHorizontal size={15} /> Filtrele</Button>}
      />

      {filtersOpen && (
        <div className={styles.filterBar}>
          <label className={styles.searchWrapper}><Search size={15} /><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Kurs ara" /></label>
          <Select placeholder="Tüm alanlar" options={categories.map(c => ({ value: c, label: c }))} value={category} onChange={v => { setCategory(v); setPage(1) }} />
          <Select placeholder="Tüm türler" options={[{ value: 'uygulamalı', label: 'Uygulamalı' }]} value={level} onChange={v => { setLevel(v); setPage(1) }} />
          <Button variant="ghost" size="sm" onClick={resetFilters}>Temizle</Button>
        </div>
      )}

      <Card raised className={styles.activePath}>
        <span className={styles.courseCover} aria-hidden="true"><BookOpen size={28} /><b>LK</b></span>
        <span className={styles.activeCopy}>
          <small>{activeCourse ? 'AKTİF ÖĞRENME' : showPath ? 'AKTİF ÖĞRENME YOLU' : 'KURS KATALOĞU'}</small>
          <h2>{activeCourse?.courseTitle || learningPath?.title || 'İşletmeni güçlendiren uygulamalı kurslar'}</h2>
          <p>{activeCourse ? `${activeCourse.courseLessonCount || 0} derslik kursunda ilerliyorsun.` : showPath ? `${pathSteps.length} adımlık öğrenme yolun hazır.` : `${total || 0} yayınlanmış kursu keşfet.`}</p>
          <span className={styles.activeProgress}><Progress value={activeCourse?.progress ?? pathPercent} size="md" variant="primary" /><em>%{activeCourse?.progress ?? pathPercent}</em></span>
        </span>
        <Button onClick={() => activeCourse ? navigate(`/app/courses/${activeCourse.courseId}/learn`) : showPath ? navigate('/app/learning-path') : listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          {activeCourse || showPath ? 'Derse devam et' : 'Kursları keşfet'} <ArrowRight size={15} />
        </Button>
      </Card>

      <div className={styles.courseWorkspace}>
        <Card className={styles.catalogPanel}>
          <div className={styles.categoryChips}>
            <button className={!category ? styles.chipActive : ''} onClick={() => { setCategory(''); setPage(1) }}>Tümü</button>
            {categories.slice(0, 4).map(item => <button key={item} className={category === item ? styles.chipActive : ''} onClick={() => { setCategory(item); setPage(1) }}>{item}</button>)}
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.courseRows} ref={listTopRef}>
            {loading ? <Loading text="Kurslar yükleniyor..." /> : courses.length === 0 ? <EmptyState message="Kurs bulunamadı" action actionLabel="Filtreleri temizle" onAction={resetFilters} /> : courses.map(course => (
              <button type="button" className={styles.courseRow} key={course.id} onClick={() => course.enrollment ? navigate(`/app/courses/${course.id}/learn`) : handleEnroll(course.id)}>
                <span className={styles.miniCover}>LK</span>
                <span className={styles.courseInfo}><strong>{course.title}</strong><small>{course.lessonCount || 0} ders{course.estimatedMinutes ? ` · ${course.estimatedMinutes} dk` : ''}</small><em>{course.enrollment ? `%${course.enrollment.progress} tamamlandı` : course.level || 'Yeni'}</em></span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
          {totalPages > 1 && <div className={styles.compactPagination}><button disabled={page <= 1} onClick={() => goToPage(page - 1)}>Önceki</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Sonraki</button></div>}
        </Card>

        <Card className={styles.competencyPanel}>
          <h2>Yetkinlik görünümü</h2>
          {showPath ? pathSteps.slice(0, 6).map((step, index) => {
            const done = isStepDone(step)
            const next = index === nextStepIndex
            return <div className={styles.competencyRow} key={step.step ?? index}><span className={`${styles.competencyDot} ${done ? styles.dotDone : next ? styles.dotNext : ''}`} /><span><strong>{step.title || step.domain}</strong><small>{done ? 'Tamamlandı' : next ? 'İlerliyor' : 'Başlamaya hazır'}</small></span></div>
          }) : <p className={styles.emptyCompetency}>Kişisel öğrenme yolunuz oluşturulduğunda yetkinlik ilerlemeniz burada görünecek.</p>}
        </Card>
      </div>
    </div>
  )
}
