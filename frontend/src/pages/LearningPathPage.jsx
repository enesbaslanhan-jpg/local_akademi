import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Loading, EmptyState, Badge, Button, Card } from '@/components/ui'
import { BookOpen, ChevronRight, RefreshCw, CheckCircle, Clock, Target } from 'lucide-react'
import styles from './LearningPathPage.module.css'

export default function LearningPathPage() {
  const navigate = useNavigate()
  const [path, setPath] = useState(null)
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  async function loadPath() {
    setLoading(true)
    try {
      const data = await api.learningPath.getCurrent()
      if (data?.learningPath) {
        setPath(data.learningPath)
        const parsed = JSON.parse(data.learningPath.pathData || '[]')
        setSteps(Array.isArray(parsed) ? parsed : [])
      } else {
        setPath(null)
        setSteps([])
      }
    } catch {
      setPath(null)
      setSteps([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPath() }, [])

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const data = await api.learningPath.generatePersonalized()
      setPath(data.learningPath)
      setSteps(data.steps || [])
    } catch (err) {
      setError(err.message || 'Plan oluşturulamadı')
    } finally {
      setGenerating(false)
    }
  }

  const totalSteps = steps.length
  const completedSteps = steps.filter(s => s.status === 'completed').length
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  if (loading) return <Loading text="Öğrenme planı yükleniyor..." />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Kişisel Öğrenme Planı</h1>
          <p className={styles.subtitle}>
            İşletme profilinize ve değerlendirme sonuçlarınıza göre oluşturulur.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
        >
          <RefreshCw size={16} /> {generating ? 'Oluşturuluyor...' : 'Planı Oluştur / Güncelle'}
        </Button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!path ? (
        <div className={styles.emptySection}>
          <EmptyState
            icon={<BookOpen size={48} />}
            title="Henüz öğrenme planı yok"
            message="İşletme profili ve değerlendirmenize göre kişiselleştirilmiş bir plan oluşturmak için yukarıdaki butonu kullanın."
          />
        </div>
      ) : (
        <>
          <Card className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryItem}>
                <Target size={20} />
                <div>
                  <strong>{steps.length}</strong>
                  <span>adım</span>
                </div>
              </div>
              <div className={styles.summaryItem}>
                <CheckCircle size={20} />
                <div>
                  <strong>{completedSteps}</strong>
                  <span>tamamlandı</span>
                </div>
              </div>
              <div className={styles.summaryItem}>
                <Clock size={20} />
                <div>
                  <strong>{steps.reduce((s, st) => s + (st.estimatedDays || 0), 0)}</strong>
                  <span>tahmini gün</span>
                </div>
              </div>
            </div>
            {totalSteps > 0 && (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                <span className={styles.progressLabel}>%{progressPercent}</span>
              </div>
            )}
          </Card>

          <div className={styles.stepsList}>
            {steps.map((step, i) => (
              <div key={i} className={`${styles.stepCard} ${step.status === 'completed' ? styles.stepDone : ''}`}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNum}>{step.step}</div>
                  <div className={styles.stepInfo}>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    {step.description && <p className={styles.stepDesc}>{step.description}</p>}
                  </div>
                  <div className={styles.stepMeta}>
                    {step.status === 'completed' ? (
                      <Badge variant="success">Tamamlandı</Badge>
                    ) : (
                      <Badge variant="info">{step.estimatedDays || '?'} gün</Badge>
                    )}
                  </div>
                </div>
                {step.koCodes?.length > 0 && (
                  <div className={styles.stepKOs}>
                    {step.koCodes.map(code => (
                      <span
                        key={code}
                        className={styles.koChip}
                        onClick={() => navigate(`/app/knowledge/${code}`)}
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
