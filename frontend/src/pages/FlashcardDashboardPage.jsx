import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, CardHeader, CardTitle, CardMeta, Badge, Button, Progress, Loading, EmptyState } from '@/components/ui'
import { Brain, Layers, CheckCircle, Clock, BarChart3, Zap, ArrowRight, BookOpen } from 'lucide-react'
import styles from './FlashcardDashboardPage.module.css'

export default function FlashcardDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.dashboard.getPilotSummary()
      if (!mountedRef.current) return
      setData(res)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Dashboard yüklenemedi')
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
        <Loading text="Flashcard paneli yükleniyor..." fullPage />
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

  const fc = data?.flashcards
  const pilot = data?.pilot
  const quizzes = data?.quizzes
  const tasks = data?.tasks
  const koProgress = data?.koProgress || []
  const weeklyTrend = data?.weeklyTrend || []
  const learningPath = data?.learningPath

  const koByCategory = {}
  for (const ko of koProgress) {
    const cat = ko.category || 'Diğer'
    if (!koByCategory[cat]) koByCategory[cat] = []
    koByCategory[cat].push(ko)
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Flashcard Paneli</h1>
          <p className={styles.pageSub}>Pilot KO'lar için flashcard, quiz ve görev ilerlemesi</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/app/flashcards/study')}>
          <Zap size={16} /> Vadesi Gelenleri Çalış
        </Button>
      </div>

      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#d9eaf7', color: '#2f5597' }}>
            <Brain size={20} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{fc?.totalCards || 0}</span>
            <span className={styles.statLabel}>Toplam Kart</span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fde2e2', color: '#a33a3a' }}>
            <Clock size={20} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{fc?.dueCards || 0}</span>
            <span className={styles.statLabel}>Vadesi Gelen</span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#e2f0d9', color: '#28733c' }}>
            <CheckCircle size={20} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{fc?.masteredCards || 0}</span>
            <span className={styles.statLabel}>Ezberlenen</span>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fff2cc', color: '#795c00' }}>
            <BarChart3 size={20} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>%{fc?.masteryPercent || 0}</span>
            <span className={styles.statLabel}>Ustalık Oranı</span>
          </div>
        </Card>
      </div>

      <div className={styles.summaryGrid}>
        <Card className={styles.summaryCard}>
          <CardHeader>
            <BookOpen size={18} />
            <CardTitle>Quiz İlerlemesi</CardTitle>
          </CardHeader>
          <div className={styles.summaryBody}>
            <div className={styles.summaryRow}>
              <span>Deneme Sayısı</span>
              <strong>{quizzes?.totalAttempts || 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Ortalama Skor</span>
              <strong>%{quizzes?.averageScore || 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Geçme Oranı</span>
              <strong>%{quizzes?.passRate || 0}</strong>
            </div>
          </div>
        </Card>
        <Card className={styles.summaryCard}>
          <CardHeader>
            <Layers size={18} />
            <CardTitle>Görev İlerlemesi</CardTitle>
          </CardHeader>
          <div className={styles.summaryBody}>
            <div className={styles.summaryRow}>
              <span>Atanan Görev</span>
              <strong>{tasks?.totalAssigned || 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Tamamlanan</span>
              <strong>{tasks?.completedCount || 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Tamamlanma Oranı</span>
              <strong>%{tasks?.completionRate || 0}</strong>
            </div>
          </div>
        </Card>
        <Card className={styles.summaryCard}>
          <CardHeader>
            <Zap size={18} />
            <CardTitle>Pilot İlerleme</CardTitle>
          </CardHeader>
          <div className={styles.summaryBody}>
            <div className={styles.summaryRow}>
              <span>Toplam KO</span>
              <strong>{pilot?.totalKOs || 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Tamamlanan</span>
              <strong>{pilot?.completedKOs || 0}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Genel İlerleme</span>
              <strong>%{pilot?.overallProgressPercent || 0}</strong>
            </div>
          </div>
          <Progress value={pilot?.overallProgressPercent || 0} size="md" variant="primary" showLabel />
        </Card>
      </div>

      {learningPath?.hasPath && (
        <Card className={styles.pathCard}>
          <CardHeader>
            <BookOpen size={18} />
            <CardTitle>Öğrenme Yolu</CardTitle>
            <Badge variant="info">{learningPath.completedSteps}/{learningPath.totalSteps} adım</Badge>
          </CardHeader>
          <Progress value={learningPath.completedSteps} max={Math.max(learningPath.totalSteps, 1)} size="md" variant="primary" showLabel />
        </Card>
      )}

      {weeklyTrend.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Haftalık Aktivite</h2>
          <Card>
            <div className={styles.trendGrid}>
              <div className={styles.trendHeader}>
                <span>Hafta</span>
                <span>Flashcard</span>
                <span>Quiz</span>
                <span>Görev</span>
                <span>Toplam</span>
              </div>
              {weeklyTrend.map(w => (
                <div key={w.week} className={styles.trendRow}>
                  <span className={styles.trendWeek}>{w.week}</span>
                  <span>{w.flashcardReviews}</span>
                  <span>{w.quizAttempts}</span>
                  <span>{w.taskCompletions}</span>
                  <span className={styles.trendTotal}>{w.activityCount}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>KO Bazında Flashcard İlerlemesi</h2>
        {Object.entries(koByCategory).map(([category, kos]) => (
          <div key={category} className={styles.categoryGroup}>
            <h3 className={styles.categoryTitle}>{category}</h3>
            <div className={styles.koGrid}>
              {kos.map(ko => (
                <Card
                  key={ko.koId}
                  className={styles.koCard}
                  hoverable
                  onClick={() => navigate(`/app/flashcards/study/${ko.koId}`)}
                >
                  <div className={styles.koHeader}>
                    <span className={styles.koTitle}>{ko.title}</span>
                    {ko.code && <Badge variant="info">{ko.code}</Badge>}
                  </div>
                  <div className={styles.koBody}>
                    <div className={styles.koStat}>
                      <span className={styles.koStatLabel}>Bilgi Durumu</span>
                      <Badge variant={
                        ko.knowledgeStatus === 'completed' ? 'success' :
                        ko.knowledgeStatus === 'in_progress' ? 'warning' : 'default'
                      }>
                        {ko.knowledgeStatus === 'completed' ? 'Tamamlandı' :
                         ko.knowledgeStatus === 'in_progress' ? 'Devam Ediyor' : 'Başlanmadı'}
                      </Badge>
                    </div>
                    <div className={styles.koStat}>
                      <span className={styles.koStatLabel}>Flashcard</span>
                      <Progress value={ko.flashcardPercent} size="sm" variant="primary" showLabel />
                    </div>
                    <div className={styles.koStatRow}>
                      <span>Quiz: {ko.quizAttempts} deneme {ko.quizPassed ? '✅' : ''}</span>
                      <span>Görev: {ko.tasksCompleted}/{ko.taskCount}</span>
                    </div>
                  </div>
                  <div className={styles.koAction}>
                    <Button variant="ghost" size="sm">
                      Çalış <ArrowRight size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
