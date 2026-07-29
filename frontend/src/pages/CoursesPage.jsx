import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, Badge, Button, Loading, EmptyState } from '@/components/ui'
import { BookOpen, Clock, ChevronRight, Play, Search, Target } from 'lucide-react'
import styles from './CoursesPage.module.css'

export default function CoursesPage() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const pageSize = 50

  useEffect(() => {
    loadCourses()
  }, [page, category, level])

  async function loadCourses() {
    setLoading(true)
    setError('')
    try {
      const filters = { page, pageSize }
      if (search) filters.search = search
      if (category) filters.category = category
      if (level) filters.level = level
      const data = await api.courses.getAll(filters)
      setCourses(data.courses || [])
      setTotalPages(data.totalPages || 1)
    } catch (err) {
      setError(err.message || 'Kurslar yüklenemedi')
    }
    setLoading(false)
  }

  function handleSearch() {
    setPage(1)
    loadCourses()
  }

  async function handleEnroll(courseId) {
    try {
      await api.enrollments.enroll(courseId)
      navigate(`/app/courses/${courseId}/learn`)
    } catch (err) {
      setError(err.message || 'Kayıt yapılamadı')
    }
  }

  const categories = [...new Set(courses.map(c => c.category).filter(Boolean))]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>İşletme Akademisi</h1>
        <p className={styles.subtitle}>10 alanda sıralanmış 40 uygulamalı kurs · 200 özgün ders</p>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={16} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Kurs ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
          />
        </div>
        <select className={styles.select} value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}>
          <option value="">Tüm alanlar</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={styles.select} value={level} onChange={e => { setLevel(e.target.value); setPage(1) }}>
          <option value="">Tüm kurs türleri</option>
          <option value="uygulamalı">Uygulamalı</option>
        </select>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <Loading text="Kurslar yükleniyor..." />
      ) : courses.length === 0 ? (
        <EmptyState
          message="Kurs bulunamadı"
          action
          actionLabel="Filtreleri Temizle"
          onAction={() => { setSearch(''); setCategory(''); setLevel(''); setPage(1) }}
        />
      ) : (
        <>
          <div className={styles.grid}>
            {courses.map(course => (
              <Card key={course.id} className={styles.courseCard}>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.courseTitle}>{course.title}</h3>
                    <Badge variant={
                      course.level === 'uygulamalı' ? 'success' : 'default'
                    }>
                      {course.level}
                    </Badge>
                  </div>
                  <p className={styles.description}>{course.description}</p>
                  {course.metadata?.promise && (
                    <p className={styles.promise}>
                      <Target size={14} />
                      <span><strong>Kurs çıktısı:</strong> {course.metadata.promise}</span>
                    </p>
                  )}
                  <div className={styles.meta}>
                    <span><BookOpen size={14} /> {course.lessonCount} ders</span>
                    <span><Clock size={14} /> {course.estimatedMinutes} dk</span>
                  </div>
                  <div className={styles.chips}>
                    {course.category && <span className={styles.chip}>{course.category}</span>}
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  {course.enrollment ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/app/courses/${course.id}/learn`)}
                    >
                      <Play size={14} /> Devam Et (%{course.enrollment.progress})
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEnroll(course.id)}
                    >
                      Kaydol
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/app/courses/${course.id}/learn`)}
                  >
                    Detay <ChevronRight size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Önceki</button>
              <span className={styles.pageInfo}>Sayfa {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sonraki</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
