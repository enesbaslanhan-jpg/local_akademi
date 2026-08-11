import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, CardHeader, CardTitle, Badge, Button, Progress, Loading, EmptyState } from '@/components/ui'
import { Map, BookOpen, Brain, HelpCircle, CheckCircle, ArrowRight, Zap, RefreshCw } from 'lucide-react'
import styles from './PilotLearningPathPage.module.css'
import { featureFlags } from '@/config/featureFlags'

const CATEGORY_COLORS = {
  'Temel Finans': { bg: '#d9eaf7', color: '#2f5597', light: '#f0f6fc' },
  'Maliyet ve Fiyatlandırma': { bg: '#e2f0d9', color: '#28733c', light: '#f1f8ec' },
  'E-Ticaret': { bg: '#fff2cc', color: '#795c00', light: 'var(--surface-card)' },
  'Girişimcilik': { bg: '#ede9fe', color: '#7c3aed', light: '#f5f3ff' },
  'Dijital Ekonomi': { bg: '#fce7f3', color: '#db2777', light: '#fdf2f8' },
  'Finansman ve Yatırım': { bg: '#dbeafe', color: '#2563eb', light: '#eff6ff' }
}

const CATEGORY_ICONS = {
  'Temel Finans': BookOpen,
  'Maliyet ve Fiyatlandırma': BookOpen,
  'E-Ticaret': BookOpen,
  'Girişimcilik': BookOpen,
  'Dijital Ekonomi': BookOpen,
  'Finansman ve Yatırım': BookOpen
}

export default function PilotLearningPathPage() {
  const navigate = useNavigate()
  const [path, setPath] = useState(null)
  const [steps, setSteps] = useState([])
  const [overallProgress, setOverallProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const mountedRef = useRef(false)

  const loadPath = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.learningPath.getCurrent()
      if (!mountedRef.current) return
      if (data?.learningPath) {
        setPath(data.learningPath)
        const parsed = JSON.parse(data.learningPath.pathData || '[]')
        const stepsArr = Array.isArray(parsed) ? parsed : []
        setSteps(stepsArr.map(s => ({ ...s, status: s.status || 'pending', progress: s.progress || 0 })))
        const total = stepsArr.length
        const completed = stepsArr.filter(s => s.status === 'completed').length
        setOverallProgress(total > 0 ? Math.round((completed / total) * 100) : 0)

        if (data.learningPath.id) {
          try {
            const progressData = await api.learningPath.getProgress(data.learningPath.id)
            if (!mountedRef.current) return
            if (progressData?.steps) {
              setSteps(progressData.steps)
              setOverallProgress(progressData.overallProgress || 0)
            }
          } catch { }
        }
      } else {
        setPath(null)
        setSteps([])
        setOverallProgress(0)
      }
    } catch {
      if (!mountedRef.current) return
      setPath(null)
      setSteps([])
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    loadPath()
    return () => { mountedRef.current = false }
  }, [loadPath])

  async function handleGeneratePilot() {
    setGenerating(true)
    setError(null)
    try {
      const data = await api.learningPath.generatePilot()
      if (!mountedRef.current) return
      setPath(data.learningPath)
      const s = data.steps || []
      setSteps(s)
      setOverallProgress(0)
      if (data.learningPath?.id) {
        try {
          const progressData = await api.learningPath.getProgress(data.learningPath.id)
          if (!mountedRef.current) return
          if (progressData?.steps) {
            setSteps(progressData.steps)
            setOverallProgress(progressData.overallProgress || 0)
          }
        } catch { }
      }
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Pilot program oluşturulamadı')
    } finally {
      if (mountedRef.current) setGenerating(false)
    }
  }

  const catColors = (cat) => CATEGORY_COLORS[cat] || { bg: '#f0f0f0', color: '#666', light: '#fafafa' }

  if (loading) {
    return (
      <div className={styles.page}>
        <Loading text="Pilot program yükleniyor..." fullPage />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className="sr-only">Pilot Öğrenme Programı</h1>
          <p className={styles.subtitle}>6 kategoride 30 bilgi nesnesi ile kapsamlı öğrenme yolu</p>
        </div>
        <Button variant="primary" size="sm" onClick={handleGeneratePilot} disabled={generating}>
          <RefreshCw size={16} /> {generating ? 'Oluşturuluyor...' : 'Programı Oluştur'}
        </Button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!path || steps.length === 0 ? (
        <div className={styles.emptySection}>
          <EmptyState
            icon={<Map size={48} />}
            title="Henüz pilot program oluşturulmamış"
            message="6 kategoriden oluşan pilot öğrenme programını başlatmak için yukarıdaki butonu kullanın."
            action
            actionLabel="Programı Oluştur"
            onAction={handleGeneratePilot}
          />
        </div>
      ) : (
        <>
          <Card className={styles.summaryCard}>
            <div className={styles.summaryStats}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>{steps.length}</span>
                <span className={styles.summaryLabel}>Kategori</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>{steps.reduce((s, st) => s + (st.kos?.length || 0), 0)}</span>
                <span className={styles.summaryLabel}>Bilgi Nesnesi</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>%{overallProgress}</span>
                <span className={styles.summaryLabel}>Genel İlerleme</span>
              </div>
            </div>
            <Progress value={overallProgress} size="lg" variant="primary" showLabel />
          </Card>

          <div className={styles.roadmap}>
            {steps.map((step, idx) => {
              const colors = catColors(step.category)
              const kos = step.kos || []
              const completedKos = kos.filter(k => k.progress >= 100 || k.quizPassed).length
              const isCompleted = step.status === 'completed' || (kos.length > 0 && completedKos === kos.length)

              return (
                <div key={step.step || idx} className={styles.roadmapStep}>
                  {idx > 0 && <div className={styles.connector} />}

                  <div className={styles.stepCard} style={{ borderColor: colors.bg }}>
                    <div className={styles.stepHeader} style={{ background: colors.light }}>
                      <div className={styles.stepBadge} style={{ background: colors.color }}>
                        <span>{idx + 1}</span>
                      </div>
                      <div className={styles.stepTitleArea}>
                        <h2 className={styles.stepTitle}>{step.category}</h2>
                        <p className={styles.stepDesc}>{step.description}</p>
                      </div>
                      <div className={styles.stepMeta}>
                        <Badge variant={isCompleted ? 'success' : step.progress > 0 ? 'warning' : 'info'}>
                          {isCompleted ? 'Tamamlandı' : step.progress > 0 ? `%${step.progress}` : `${kos.length} konu`}
                        </Badge>
                      </div>
                    </div>

                    <div className={styles.koList}>
                      {kos.map((ko) => {
                        const koProgress = ko.progress || 0
                        const koDone = koProgress >= 100 || ko.quizPassed
                        return (
                          <div key={ko.koId} className={`${styles.koRow} ${koDone ? styles.koDone : ''}`}>
                            <div className={styles.koInfo}>
                              <span className={styles.koStatus}>{koDone ? '✅' : '○'}</span>
                              <div>
                                <span className={styles.koTitle}>{ko.title}</span>
                                {ko.code && <span className={styles.koCode}>{ko.code}</span>}
                              </div>
                            </div>
                            <div className={styles.koMeta} hidden={!featureFlags.legacyFlashcards && !featureFlags.legacyQuiz}>
                              <span className={styles.koStat}>
                                <Brain size={12} /> {ko.fcMasteredCount || 0}
                              </span>
                              <span className={styles.koStat}>
                                <HelpCircle size={12} /> {ko.quizPassed ? '✓' : '-'}
                              </span>
                            </div>
                            <div className={styles.koActions}>
                              <button
                                className={styles.koActionBtn}
                                title="Flashcard çalış"
                                onClick={() => navigate(`/app/flashcards/study/${ko.koId}`)}
                                hidden={!featureFlags.legacyFlashcards}
                              >
                                <Brain size={14} />
                              </button>
                              <button
                                className={styles.koActionBtn}
                                title="Quiz çöz"
                                onClick={() => navigate(`/app/quiz/take/${ko.koId}`)}
                                hidden={!featureFlags.legacyQuiz}
                              >
                                <HelpCircle size={14} />
                              </button>
                              {ko.code && (
                                <button
                                  className={styles.koActionBtn}
                                  title="KO detayı"
                                  onClick={() => navigate(`/app/knowledge/${ko.code}`)}
                                >
                                  <BookOpen size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {step.progress > 0 && (
                      <div className={styles.stepProgress}>
                        <Progress value={step.progress} size="sm" variant="primary" showLabel />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
