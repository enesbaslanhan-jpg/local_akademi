import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, CardHeader, CardTitle, Badge, Button, Progress, Loading, EmptyState } from '@/components/ui'
import { Award, Brain, CheckCircle, XCircle, BarChart3, ArrowRight, Clock } from 'lucide-react'
import styles from './QuizDashboardPage.module.css'

export default function QuizDashboardPage() {
  const navigate = useNavigate()
  const [pilotData, setPilotData] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pilot, hist] = await Promise.all([
        api.dashboard.getPilotSummary(),
        api.quizzes.getHistory()
      ])
      if (!mountedRef.current) return
      setPilotData(pilot)
      setHistory(hist.attempts || [])
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Quiz panosu yuklenemedi')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    return () => { mountedRef.current = false }
  }, [fetchData])

  if (loading) {
    return (
      <div className={styles.page}>
        <Loading text="Quiz panosu yukleniyor..." fullPage />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
          <Button onClick={fetchData} variant="primary">Tekrar Dene</Button>
        </div>
      </div>
    )
  }

  const quizzes = pilotData?.quizzes
  const koProgress = pilotData?.koProgress || []
  const pasKos = koProgress.filter(k => k.quizPassed)
  const attemptedKos = koProgress.filter(k => k.quizAttempts > 0)

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Quiz Paneli</h1>
          <p className={styles.pageSub}>Pilot KO'lar icin quiz ilerlemesi ve gecmis denemeler</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#d9eaf7', color: '#2f5597' }}>
            <Brain size={20} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{quizzes?.totalAttempts || 0}</span>
            <span className={styles.statLabel}>Toplam Deneme</span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#e2f0d9', color: '#28733c' }}>
            <BarChart3 size={20} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>%{quizzes?.averageScore || 0}</span>
            <span className={styles.statLabel}>Ortalama Skor</span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fff2cc', color: '#795c00' }}>
            <Award size={20} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>%{quizzes?.passRate || 0}</span>
            <span className={styles.statLabel}>Gecme Orani</span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#ede9fe', color: '#7c3aed' }}>
            <CheckCircle size={20} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{pasKos.length}/{attemptedKos.length}</span>
            <span className={styles.statLabel}>Gecilen KO</span>
          </div>
        </Card>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>KO Bazinda Quiz Durumu</h2>
        <div className={styles.koGrid}>
          {koProgress.map(ko => (
            <Card
              key={ko.koId}
              className={styles.koCard}
              hoverable
              onClick={() => navigate(`/app/quiz/take/${ko.koId}`)}
            >
              <div className={styles.koHeader}>
                <span className={styles.koTitle}>{ko.title}</span>
                {ko.code && <Badge variant="info">{ko.code}</Badge>}
              </div>
              <div className={styles.koBody}>
                <div className={styles.koStat}>
                  <span className={styles.koStatLabel}>Deneme</span>
                  <span className={styles.koStatValue}>{ko.quizAttempts}</span>
                </div>
                <div className={styles.koStat}>
                  <span className={styles.koStatLabel}>Durum</span>
                  {ko.quizAttempts > 0 ? (
                    ko.quizPassed ? (
                      <Badge variant="success">Gecti</Badge>
                    ) : (
                      <Badge variant="warning">Kaldi</Badge>
                    )
                  ) : (
                    <Badge variant="default">Cozulmedi</Badge>
                  )}
                </div>
                <div className={styles.koStat}>
                  <span className={styles.koStatLabel}>Flashcard</span>
                  <Progress value={ko.flashcardPercent} size="sm" />
                </div>
              </div>
              <div className={styles.koAction}>
                <Button variant="ghost" size="sm">
                  Coz <ArrowRight size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Son Denemeler</h2>
        {history.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Award size={32} />}
              title="Henuz deneme yok"
              message="Henuz bir quiz cozmediniz. Yukaridaki KO'lardan birini secerek baslayin."
            />
          </Card>
        ) : (
          <div className={styles.historyList}>
            {history.slice(0, 20).map(h => {
              const ko = koProgress.find(k => k.koId === h.koId)
              return (
                <Card key={h.id} className={styles.historyCard}>
                  <div className={styles.historyLeft}>
                    <div className={`${styles.historyIcon} ${h.passed ? styles.hPassed : styles.hFailed}`}>
                      {h.passed ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    </div>
                    <div>
                      <span className={styles.historyTitle}>{ko?.title || `KO #${h.koId}`}</span>
                      <span className={styles.historyMeta}>
                        Skor: %{h.score} &middot;
                        {h.passed ? ' Gecti' : ' Kaldi'} &middot;
                        {new Date(h.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                  <Badge variant={h.passed ? 'success' : 'danger'}>%{h.score}</Badge>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
