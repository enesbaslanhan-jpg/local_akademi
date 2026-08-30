import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, Badge, Button, Loading } from '@/components/ui'
import { ArrowLeft, ChevronRight, Clock, BookOpen } from 'lucide-react'
import styles from './KnowledgeTopicPage.module.css'

export default function KnowledgeTopicPage() {
  const { t, i18n } = useTranslation('learning')
  const { topicKey } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [topic, setTopic] = useState(null)
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get('level') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = selectedLevel ? `?level=${selectedLevel}` : ''
    api.knowledgeV2.getTopic(topicKey, selectedLevel)
      .then(setTopic)
      .catch(err => setError(err.message || t('knowledgeTopic.loadFailed')))
      .finally(() => setLoading(false))
  }, [topicKey, selectedLevel, t])

  if (loading) return <Loading text={t('knowledgeTopic.loading')} />

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <p>{error}</p>
          <Button onClick={() => navigate('/app/knowledge')}>{t('knowledgeTopic.back')}</Button>
        </div>
      </div>
    )
  }

  if (!topic) return null

  const kos = topic.kos || []
  const availableLevels = topic.availableLevels || []

  return (
    <div className={styles.page}>
      <Link to="/app/knowledge" className={styles.backLink}>
        <ArrowLeft size={16} /> {t('knowledgeTopic.knowledgeObjects')}
      </Link>

      <div className={styles.header}>
        <h1 className="sr-only">{t('knowledgeTopic.topic', { topic: topicKey })}</h1>
        <div className={styles.title}>{t('knowledgeTopic.topic', { topic: topicKey })}</div>
        {availableLevels.length > 0 && (
          <div className={styles.levelSelector}>
            <span className={styles.levelLabel}>{t('knowledgeTopic.level')}</span>
            {availableLevels.map(lvl => (
              <button
                key={lvl.level}
                className={`${styles.levelBtn} ${selectedLevel === lvl.level ? styles.levelBtnActive : ''}`}
                onClick={() => setSelectedLevel(prev => prev === lvl.level ? '' : lvl.level)}
              >
                {lvl.level}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.resultCount}>
        {t('knowledgeTopic.resultCount', { count: kos.length })}
      </div>

      {kos.length === 0 ? (
        <div className={styles.emptyState}>
          <BookOpen size={48} />
          <p>{t('knowledgeTopic.empty')}</p>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {kos.map(ko => {
            const meta = ko.metadata || {}
            return (
              <Card
                key={ko.id}
                className={styles.card}
                hoverable
                onClick={() => navigate(`/app/knowledge/${ko.code}`)}
              >
                <div className={styles.cardTop}>
                  <Badge variant="default">{ko.type}</Badge>
                  {meta.level && <Badge variant="info">{meta.level}</Badge>}
                  {ko.verificationStatus === 'verified' && (
                    <Badge variant="success">{t('knowledgeTopic.verified')}</Badge>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitle}>{ko.title}</div>
                  {meta.summary && <p className={styles.cardSummary}>{meta.summary}</p>}
                  <div className={styles.cardMeta}>
                    <span className={styles.cardCode}>{ko.code}</span>
                    {meta.duration && (
                      <span className={styles.cardDuration}>
                        <Clock size={12} /> {t('knowledgeTopic.minutes', { count: meta.duration })}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.cardDate}>
                    {new Date(ko.updatedAt).toLocaleDateString(i18n.resolvedLanguage || i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className={styles.cardAction}>
                    {t('knowledgeTopic.inspect')} <ChevronRight size={14} />
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
