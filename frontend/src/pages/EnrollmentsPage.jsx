import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, Badge, Button, Progress, Loading, EmptyState } from '@/components/ui'
import { BookOpen, CheckCircle, ArrowRight } from 'lucide-react'
import styles from './EnrollmentsPage.module.css'

const STATUS = {
  completed: { label: 'Tamamlandı', cls: 'statusCompleted' },
  in_progress: { label: 'Devam ediyor', cls: 'statusProgress' },
  not_started: { label: 'Başlanmadı', cls: 'statusNotStarted' }
}

function lastSeen(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/*
 * `embedded`: Kurslar sayfasının "Kayıtlarım" sekmesi içinde render edilirken
 * sayfa kabuğu (dış padding ve sr-only h1) atlanır — kabuk zaten Kurslar
 * sayfasına ait. Doğrudan /app/enrollments'a gidildiğinde de bu bileşen
 * Kurslar sayfası üzerinden gösterilir.
 */
export default function EnrollmentsPage({ embedded = false }) {
  const navigate = useNavigate()
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.enrollments.getMy()
      .then(data => { if (data?.enrollments) setEnrollments(data.enrollments) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading text="Kayıtlar yükleniyor..." />

  return (
    <div className={embedded ? styles.embedded : styles.page}>
      {error && <div className={styles.error}>{error}</div>}

      {/* Sayfa adı üst barda yazıyor; görünür h1 yerine sr-only başlık. */}
      <div className={styles.header}>
        {!embedded && <h1 className="sr-only">Kayıtlı Kurslarım</h1>}
        <p className={styles.subtitle}>{enrollments.length} kursa kayıtlısınız</p>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          message="Henüz kursa kayıt olmadın"
          action
          actionLabel="Kurslara Göz At"
          onAction={() => navigate('/app/courses')}
        />
      ) : (
        <div className={styles.list}>
          {enrollments.map(e => {
            const status = STATUS[e.status] || STATUS.not_started
            const seen = lastSeen(e.updatedAt)
            return (
              <Card key={e.id} className={styles.enrollmentCard} hoverable>
                <div className={styles.cardMain}>
                  <div className={styles.cardTop}>
                    <h3 className={styles.courseTitle}>{e.courseTitle}</h3>
                    <span className={`${styles.statusBadge} ${styles[status.cls]}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className={styles.meta}>
                    {e.courseLessonCount > 0 && (
                      <span><BookOpen size={13} aria-hidden="true" /> {e.courseLessonCount} ders</span>
                    )}
                    {e.courseCategory && <Badge variant="info">{e.courseCategory}</Badge>}
                    {e.courseLevel && <Badge variant="default">{e.courseLevel}</Badge>}
                  </div>

                  <div className={styles.progressRow}>
                    <div className={styles.progressWrap}>
                      <Progress value={e.progress} size="sm" variant="primary" />
                    </div>
                    <span className={styles.progressText}>%{e.progress}</span>
                  </div>

                  {seen && <p className={styles.lastSeen}>Son erişim: {seen}</p>}
                </div>

                <div className={styles.cardAction}>
                  {e.status === 'completed' ? (
                    <Badge variant="success"><CheckCircle size={13} /> Tamamlandı</Badge>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/app/courses/${e.courseId}/learn`)}
                    >
                      {e.status === 'not_started' ? 'Başla' : 'Devam Et'} <ArrowRight size={14} />
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
