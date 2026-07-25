import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, Badge, Button, Loading, EmptyState } from '@/components/ui'
import { BookOpen, Clock, Play, CheckCircle, ArrowRight } from 'lucide-react'
import styles from './EnrollmentsPage.module.css'

export default function EnrollmentsPage() {
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
    <div className={styles.page}>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.header}>
        <h1 className={styles.title}>Kayıtlı Kurslarım</h1>
        <p className={styles.subtitle}>{enrollments.length} kursa kayıtlısınız</p>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          message="Henüz kursa kayıt olmadın"
          action
          actionLabel="Kurslara Git"
          onAction={() => navigate('/app/courses')}
        />
      ) : (
        <div className={styles.list}>
          {enrollments.map(e => (
            <Card key={e.id} className={styles.enrollmentCard}>
              <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.courseTitle}>{e.courseTitle}</h3>
                    <div className={styles.meta}>
                      <span><BookOpen size={14} /> {e.courseLessonCount} ders</span>
                      {e.courseCategory && <Badge variant="info">{e.courseCategory}</Badge>}
                      {e.courseLevel && <Badge variant="default">{e.courseLevel}</Badge>}
                    </div>
                  </div>
                  <span className={`${styles.statusBadge} ${
                    e.status === 'completed' ? styles.statusCompleted :
                    e.status === 'in_progress' ? styles.statusProgress : styles.statusNotStarted
                  }`}>
                    {e.status === 'not_started' ? 'Başlamadı' : e.status === 'in_progress' ? 'Devam Ediyor' : 'Tamamlandı'}
                  </span>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${e.progress}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>%{e.progress}</span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                {e.status === 'completed' ? (
                  <Badge variant="success"><CheckCircle size={14} /> Tamamlandı</Badge>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => navigate(`/app/courses/${e.courseId}/learn`)}>
                    {e.status === 'not_started' ? 'Başla' : 'Devam Et'} <ArrowRight size={14} />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
