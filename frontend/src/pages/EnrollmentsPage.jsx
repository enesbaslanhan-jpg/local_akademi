import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, Badge, Button, Progress, Loading, EmptyState } from '@/components/ui'
import { BookOpen, CheckCircle, ArrowRight } from 'lucide-react'
import styles from './EnrollmentsPage.module.css'

const STATUS = {
  completed: { labelKey: 'enrollments.status.completed', cls: 'statusCompleted' },
  in_progress: { labelKey: 'enrollments.status.inProgress', cls: 'statusProgress' },
  not_started: { labelKey: 'enrollments.status.notStarted', cls: 'statusNotStarted' }
}

function lastSeen(dateStr, locale) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

/*
 * `embedded`: Kurslar sayfasının "Kayıtlarım" sekmesi içinde render edilirken
 * sayfa kabuğu (dış padding ve sr-only h1) atlanır — kabuk zaten Kurslar
 * sayfasına ait. Doğrudan /app/enrollments'a gidildiğinde de bu bileşen
 * Kurslar sayfası üzerinden gösterilir.
 */
export default function EnrollmentsPage({ embedded = false }) {
  const { t, i18n } = useTranslation('learning')
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

  if (loading) return <Loading text={t('enrollments.loading')} />

  return (
    <div className={embedded ? styles.embedded : styles.page}>
      {error && <div className={styles.error}>{error}</div>}

      {/* Sayfa adı üst barda yazıyor; görünür h1 yerine sr-only başlık. */}
      <div className={styles.header}>
        {!embedded && <h1 className="sr-only">{t('enrollments.title')}</h1>}
        <p className={styles.subtitle}>{t('enrollments.courseCount', { count: enrollments.length })}</p>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          message={t('enrollments.empty')}
          action
          actionLabel={t('enrollments.browse')}
          onAction={() => navigate('/app/courses')}
        />
      ) : (
        <div className={styles.list}>
          {enrollments.map(e => {
            const status = STATUS[e.status] || STATUS.not_started
            const seen = lastSeen(e.updatedAt, i18n.resolvedLanguage || i18n.language)
            return (
              <Card key={e.id} className={styles.enrollmentCard} hoverable>
                <div className={styles.cardMain}>
                  <div className={styles.cardTop}>
                    <h3 className={styles.courseTitle}>{e.courseTitle}</h3>
                    <span className={`${styles.statusBadge} ${styles[status.cls]}`}>
                      {t(status.labelKey)}
                    </span>
                  </div>

                  <div className={styles.meta}>
                    {e.courseLessonCount > 0 && (
                      <span><BookOpen size={13} aria-hidden="true" /> {t('enrollments.lessonCount', { count: e.courseLessonCount })}</span>
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

                  {seen && <p className={styles.lastSeen}>{t('enrollments.lastAccess', { date: seen })}</p>}
                </div>

                <div className={styles.cardAction}>
                  {e.status === 'completed' ? (
                    <Badge variant="success"><CheckCircle size={13} /> {t('enrollments.status.completed')}</Badge>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/app/courses/${e.courseId}/learn`)}
                    >
                      {e.status === 'not_started' ? t('enrollments.start') : t('enrollments.continue')} <ArrowRight size={14} />
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
