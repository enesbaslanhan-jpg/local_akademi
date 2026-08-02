import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import {
  Card, CardHeader, CardTitle, CardMeta, CardActions,
  Badge, Button, Progress, EmptyState, Loading
} from '@/components/ui'
import {
  BookOpen, ChevronRight, Clock, FileText, BarChart3,
  Award, Target, TrendingUp, Zap, Layers, User, LogIn,
  CheckCircle, ArrowRight, ListChecks, Sparkles,
  Bookmark, Calendar, AlertCircle, Brain, HelpCircle,
  Map, Grid
} from 'lucide-react'
import { PersonalizedFeed } from '@/components/feed/PersonalizedFeed'
import styles from './Dashboard.module.css'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} saat önce`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} gün önce`
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function firstOf(arr) {
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null
}

function parseSteps(pathData) {
  if (!pathData) return []
  if (Array.isArray(pathData)) return pathData
  if (pathData.steps && Array.isArray(pathData.steps)) return pathData.steps
  if (Array.isArray(pathData.modules)) return pathData.modules
  return []
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [pilotData, setPilotData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(false)
  const isFeedEnabled = import.meta.env.VITE_FF_PERSONALIZED_FEED === 'true'

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summary, pilot] = await Promise.all([
        api.dashboard.getSummary(),
        api.dashboard.getPilotSummary().catch(() => null)
      ])
      if (!mountedRef.current) return
      setData(summary)
      setPilotData(pilot)
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

  const s = data?.stats
  const enrollments = data?.enrollments || []
  const activeEnrollments = enrollments.filter(e => e.status === 'in_progress')
  const completedCount = enrollments.filter(e => e.status === 'completed').length
  const activeCount = activeEnrollments.length

  const completedKOs = s?.completedKOs || 0
  const inProgressKOs = s?.inProgressKOs || 0

  const resume = data?.resumeItem
  const currentPath = data?.currentLearningPath
  const pathSteps = currentPath ? parseSteps(currentPath.pathData) : []
  const completedSteps = pathSteps.filter(s => s.completed || s.status === 'completed').length
  const totalSteps = pathSteps.length
  const nextStep = totalSteps > completedSteps ? pathSteps[completedSteps] : null

  const recs = data?.recommendations || []
  const tasks = data?.upcomingTasks || []
  const quizResult = data?.recentQuizResult
  const mentorSession = data?.recentMentorSession
  const courseActivity = data?.recentCourseActivity
  const completedKOData = data?.recentCompletedKO

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonCard}><div className={styles.skelLine} style={{width:'60%'}} /><div className={styles.skelLine} /></div>
          <div className={styles.skeletonCard}><div className={styles.skelLine} style={{width:'60%'}} /><div className={styles.skelLine} /></div>
          <div className={styles.skeletonCard}><div className={styles.skelLine} style={{width:'60%'}} /><div className={styles.skelLine} /></div>
          <div className={styles.skeletonCard}><div className={styles.skelLine} style={{width:'60%'}} /><div className={styles.skelLine} /></div>
          <div className={styles.skeletonCard}><div className={styles.skelLine} style={{width:'60%'}} /><div className={styles.skelLine} /></div>
          <div className={styles.skeletonCard}><div className={styles.skelLine} style={{width:'60%'}} /><div className={styles.skelLine} /></div>
          <div className={styles.skeletonCardCol2}><div className={styles.skelLine} style={{width:'40%'}} /><div className={styles.skelLine} style={{width:'80%'}} /><div className={styles.skelLine} style={{width:'60%'}} /></div>
          <div className={styles.skeletonCardCol2}><div className={styles.skelLine} style={{width:'40%'}} /><div className={styles.skelLine} style={{width:'80%'}} /><div className={styles.skelLine} style={{width:'60%'}} /></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h2>Dashboard yüklenemedi</h2>
          <p>{error}</p>
          <Button onClick={fetchData} variant="primary">Tekrar Dene</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* A. Karşılama Alanı */}
      <section className={styles.hero} aria-label="Karşılama">
        <div className={styles.heroContent}>
          <div>
            <h1 className={styles.heroTitle}>
              Merhaba, {data?.user?.name || 'Kullanıcı'}
            </h1>
            <p className={styles.heroSub}>
              {activeCount > 0
                ? `${activeCount} aktif kursun var. Kaldığın yerden devam et!`
                : completedCount > 0
                  ? 'Tebrikler! Tüm kurslarını tamamladın. Yeni kurslara göz atabilirsin.'
                  : 'Henüz bir kursa kaydolmadın. Aşağıdaki önerilere göz atabilirsin.'}
            </p>
          </div>
          {resume ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(`/app/enrollments`)}
              ariaLabel="Kaldığın yerden devam et"
            >
              Kaldığın Yerden Devam Et <ChevronRight size={18} />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/app/courses')}
              ariaLabel="Kurslara göz at"
            >
              Kurslara Göz At <ArrowRight size={18} />
            </Button>
          )}
        </div>
        {currentPath && (
          <Card className={styles.heroPath}>
            <CardHeader>
              <Award size={20} />
              <span style={{fontWeight:600,fontSize:'0.95rem'}}>{currentPath.title}</span>
            </CardHeader>
            <div className={styles.pathSummary}>
              <span>{completedSteps}/{totalSteps} adım</span>
              <Progress value={completedSteps} max={Math.max(totalSteps,1)} size="sm" />
            </div>
            {nextStep && (
              <Badge variant="info" className={styles.nextStepBadge}>
                Sıradaki: {nextStep.title || nextStep.name || 'Sonraki adım'}
              </Badge>
            )}
          </Card>
        )}
      </section>

      {/* B. İlerleme Özeti */}
      <section aria-label="İlerleme özeti">
        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <div className={styles.statIcon} style={{background:'#e0f2fe',color:'#0284c7'}}><BookOpen size={20} /></div>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{completedCount}</span>
              <span className={styles.statLabel}>Tamamlanan Kurs</span>
            </div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statIcon} style={{background:'#fef3c7',color:'#d97706'}}><Clock size={20} /></div>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{activeCount}</span>
              <span className={styles.statLabel}>Aktif Kurs</span>
            </div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statIcon} style={{background:'#d1fae5',color:'#059669'}}><CheckCircle size={20} /></div>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{enrollments.length}</span>
              <span className={styles.statLabel}>Toplam Kayıt</span>
            </div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statIcon} style={{background:'#ede9fe',color:'#7c3aed'}}><TrendingUp size={20} /></div>
            <div className={styles.statBody}>
              <span className={styles.statValue}>%{s?.avgProgress || 0}</span>
              <span className={styles.statLabel}>Ortalama İlerleme</span>
            </div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statIcon} style={{background:'#fce7f3',color:'#db2777'}}><Zap size={20} /></div>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{s?.weeklyProgress || 0}</span>
              <span className={styles.statLabel}>Bu Hafta Tamamlanan</span>
            </div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statIcon} style={{background:'#dbeafe',color:'#2563eb'}}><BarChart3 size={20} /></div>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{completedKOs}</span>
              <span className={styles.statLabel}>Tamamlanan KO</span>
            </div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statIcon} style={{background:'#fef3c7',color:'#d97706'}}><BookOpen size={20} /></div>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{inProgressKOs}</span>
              <span className={styles.statLabel}>Devam Eden KO</span>
            </div>
          </Card>

          {pilotData && (
            <>
              <Card className={styles.statCard}>
                <div className={styles.statIcon} style={{background:'#f0fdf4',color:'#16a34a'}}><Brain size={20} /></div>
                <div className={styles.statBody}>
                  <span className={styles.statValue}>%{pilotData.flashcards.masteryPercent}</span>
                  <span className={styles.statLabel}>Kart Hakimiyet</span>
                </div>
              </Card>
              <Card className={styles.statCard}>
                <div className={styles.statIcon} style={{background:'#fefce8',color:'#ca8a04'}}><HelpCircle size={20} /></div>
                <div className={styles.statBody}>
                  <span className={styles.statValue}>%{pilotData.quizzes.passRate}</span>
                  <span className={styles.statLabel}>Quiz Başarı</span>
                </div>
              </Card>
              <Card className={styles.statCard}>
                <div className={styles.statIcon} style={{background:'#eff6ff',color:'#2563eb'}}><ListChecks size={20} /></div>
                <div className={styles.statBody}>
                  <span className={styles.statValue}>%{pilotData.tasks.completionRate}</span>
                  <span className={styles.statLabel}>Görev Tamamlama</span>
                </div>
              </Card>
            </>
          )}
        </div>
      </section>

      {isFeedEnabled ? (
        <PersonalizedFeed resumeItem={resume} />
      ) : (
        <div className={styles.mainGrid}>
          {/* Left column */}
          <div className={styles.mainLeft}>

          {/* C. Kaldığın Yerden Devam Et */}
          {resume && (
            <section aria-label="Kaldığın yerden devam et" className={styles.section}>
              <h2 className={styles.sectionTitle}><Bookmark size={18} /> Kaldığın Yerden Devam Et</h2>
              <Card className={styles.resumeCard} hoverable onClick={() => navigate(`/app/enrollments`)}>
                <div className={styles.resumeInfo}>
                  <div className={styles.resumeTitle}>{resume.courseTitle}</div>
                  <div className={styles.resumeMeta}>
                    <span>%{resume.progress} tamamlandı</span>
                    <span>•</span>
                    <span>Son erişim: {timeAgo(resume.updatedAt)}</span>
                  </div>
                  <Progress value={resume.progress} size="md" variant="primary" />
                </div>
                <div className={styles.resumeAction}>
                  <Button variant="primary" size="md" ariaLabel="Devam et">
                    Devam Et <ChevronRight size={16} />
                  </Button>
                </div>
              </Card>
            </section>
          )}

          {/* E. Aktif Öğrenme Yolu */}
          {currentPath && (
            <section aria-label="Aktif öğrenme yolu" className={styles.section}>
              <h2 className={styles.sectionTitle}><Target size={18} /> Öğrenme Yolu</h2>
              <Card className={styles.pathCard}>
                <div className={styles.pathHeader}>
                  <div>
                    <div className={styles.pathTitle}>{currentPath.title}</div>
                    <div className={styles.pathProgress}>{completedSteps}/{totalSteps} adım tamamlandı</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/app/learning-path')}>
                    Görüntüle
                  </Button>
                </div>
                <Progress value={completedSteps} max={Math.max(totalSteps,1)} size="lg" variant="primary" showLabel />
                {nextStep && (
                  <div className={styles.nextStep}>
                    <span>Sıradaki adım:</span>
                    <strong>{nextStep.title || nextStep.name || 'Sonraki adım'}</strong>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/app/learning-path')}>
                      Başla <ChevronRight size={14} />
                    </Button>
                  </div>
                )}
              </Card>
            </section>
          )}

          {/* D. Önerilen İçerikler */}
          <section aria-label="Önerilen içerikler" className={styles.section}>
            <h2 className={styles.sectionTitle}><Sparkles size={18} /> Önerilen İçerikler</h2>
            {recs.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Layers size={32} />}
                  title="Henüz profesyonel içerik yok"
                  message="Şu anda önerilecek profesyonel içerik bulunmuyor. Demo içerikleri keşfedebilir veya yöneticinizle iletişime geçebilirsiniz."
                  action
                  actionLabel="Tüm İçerikleri Keşfet"
                  onAction={() => navigate('/app/knowledge')}
                />
              </Card>
            ) : (
              <div className={styles.recGrid}>
                {recs.map(ko => (
                  <Card key={ko.id} className={styles.recCard} hoverable onClick={() => navigate(`/app/knowledge/${ko.code}`)}>
                    <div className={styles.recType}>{ko.type}</div>
                    <div className={styles.recTitle}>{ko.title}</div>
                    {ko.categoryName && <span className={styles.recCategory}>{ko.categoryName}</span>}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

          {/* H. Pilot Program */}
          {pilotData && (
            <section aria-label="Pilot program" className={styles.section}>
              <h2 className={styles.sectionTitle}><Map size={18} /> Pilot Program İlerleme</h2>
              <Card className={styles.pilotOverview}>
                <div className={styles.pilotHeader}>
                  <div className={styles.pilotStat}>
                    <span className={styles.pilotStatValue}>{pilotData.pilot.overallProgressPercent}%</span>
                    <span className={styles.pilotStatLabel}>Genel İlerleme</span>
                  </div>
                  <div className={styles.pilotStat}>
                    <span className={styles.pilotStatValue}>{pilotData.pilot.completedKOs}</span>
                    <span className={styles.pilotStatLabel}>Tamamlanan KO</span>
                  </div>
                  <div className={styles.pilotStat}>
                    <span className={styles.pilotStatValue}>{pilotData.pilot.inProgressKOs}</span>
                    <span className={styles.pilotStatLabel}>Devam Eden</span>
                  </div>
                  <div className={styles.pilotStat}>
                    <span className={styles.pilotStatValue}>{pilotData.pilot.notStartedKOs}</span>
                    <span className={styles.pilotStatLabel}>Başlanmamış</span>
                  </div>
                </div>
                <Progress value={pilotData.pilot.overallProgressPercent} max={100} size="lg" variant="primary" showLabel />
                <div className={styles.pilotActions}>
                  <Button variant="primary" size="sm" onClick={() => navigate('/app/learning-path/pilot')}>
                    <Map size={14} /> Pilot Yol Haritası
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/app/flashcards')}>
                    <Brain size={14} /> Flashcards
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/app/quiz')}>
                    <HelpCircle size={14} /> Quizler
                  </Button>
                </div>
              </Card>

              {/* Weekly Activity Trend */}
              {pilotData.weeklyTrend?.length > 0 && (
                <Card className={styles.weeklyCard}>
                  <h3 className={styles.weeklyTitle}><BarChart3 size={16} /> Haftalık Aktivite</h3>
                  <div className={styles.weeklyBars}>
                    {pilotData.weeklyTrend.map((w, i) => {
                      const maxVal = Math.max(...pilotData.weeklyTrend.map(x => x.activityCount), 1)
                      const pct = Math.round((w.activityCount / maxVal) * 100)
                      return (
                        <div key={w.week} className={styles.weeklyCol}>
                          <span className={styles.weeklyCount}>{w.activityCount}</span>
                          <div className={styles.weeklyBarWrap}>
                            <div className={styles.weeklyBar} style={{ height: `${Math.max(pct, 4)}%` }} />
                          </div>
                          <span className={styles.weeklyLabel}>
                            {new Date(w.week + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className={styles.weeklyLegend}>
                    <span><Brain size={12} /> Kart: {pilotData.flashcards.reviewsThisWeek || 0}</span>
                    <span><HelpCircle size={12} /> Quiz: {pilotData.weeklyTrend.reduce((s, w) => s + w.quizAttempts, 0)}</span>
                    <span><ListChecks size={12} /> Görev: {pilotData.weeklyTrend.reduce((s, w) => s + w.taskCompletions, 0)}</span>
                  </div>
                </Card>
              )}

              {/* Per-KO Progress Grid */}
              {pilotData.koProgress?.length > 0 && (
                <Card className={styles.koGridCard}>
                  <h3 className={styles.koGridTitle}><Grid size={16} /> KO Bazında Durum</h3>
                  <div className={styles.koGrid}>
                    {pilotData.koProgress.map(kp => (
                      <div
                        key={kp.koId}
                        className={`${styles.koGridItem} ${kp.knowledgeStatus === 'completed' ? styles.koDone : ''} ${kp.knowledgeStatus === 'in_progress' ? styles.koActive : ''}`}
                        onClick={() => kp.code && navigate(`/app/knowledge/${kp.code}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' && kp.code) navigate(`/app/knowledge/${kp.code}`) }}
                      >
                        <div className={styles.koGridCode}>{kp.code || `#${kp.koId}`}</div>
                        <div className={styles.koGridTitle_}>{kp.title}</div>
                        <div className={styles.koGridMeta}>
                          <span className={kp.flashcardPercent >= 100 ? styles.metaDone : ''}>
                            <Brain size={10} /> %{kp.flashcardPercent}
                          </span>
                          <span className={kp.quizPassed ? styles.metaDone : ''}>
                            <HelpCircle size={10} /> {kp.quizPassed ? 'Geçti' : `${kp.quizAttempts} den`}
                          </span>
                          <span className={kp.tasksCompleted >= kp.taskCount && kp.taskCount > 0 ? styles.metaDone : ''}>
                            <ListChecks size={10} /> {kp.tasksCompleted}/{kp.taskCount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </section>
          )}

        {/* Right column (sidebar) */}
        <div className={styles.mainRight}>

          {/* F. Yaklaşan Görevler */}
          {tasks.length > 0 && (
            <section aria-label="Yaklaşan görevler" className={styles.section}>
              <h2 className={styles.sectionTitle}><ListChecks size={18} /> Yaklaşan Görevler</h2>
              <Card>
                {tasks.map(t => (
                  <div key={t.id} className={styles.taskRow}>
                    <div className={styles.taskInfo}>
                      <span className={styles.taskTitle}>{t.title}</span>
                      <span className={styles.taskMeta}>
                        <Badge variant={t.status === 'in_progress' ? 'warning' : 'info'}>
                          {t.status === 'in_progress' ? 'Devam Ediyor' : 'Atandı'}
                        </Badge>
                        {t.progressPercent > 0 && <span>%{t.progressPercent}</span>}
                      </span>
                    </div>
                    <ChevronRight size={16} className={styles.taskArrow} />
                  </div>
                ))}
              </Card>
            </section>
          )}

          {/* G. Son Aktiviteler */}
          {completedKOData && (
            <section aria-label="Son tamamlanan KO" className={styles.section}>
              <h2 className={styles.sectionTitle}><CheckCircle size={18} /> Son Tamamlanan</h2>
              <Card className={styles.koCompleteCard} hoverable onClick={() => navigate('/app/knowledge')}>
                <div className={styles.activityRow}>
                  <div className={styles.activityIcon} style={{background:'#d1fae5',color:'#059669'}}>
                    <CheckCircle size={16} />
                  </div>
                  <div className={styles.activityInfo}>
                    <span className={styles.activityTitle}>{completedKOData.title || 'KO tamamlandı'}</span>
                    <span className={styles.activityDate}>{timeAgo(completedKOData.createdAt)}</span>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {(quizResult || mentorSession || courseActivity) && (
            <section aria-label="Son aktiviteler" className={styles.section}>
              <h2 className={styles.sectionTitle}><Clock size={18} /> Son Aktiviteler</h2>
              <Card>
                {quizResult && (
                  <div className={styles.activityRow}>
                    <div className={styles.activityIcon} style={{background: quizResult.passed ? '#d1fae5' : '#fef3c7', color: quizResult.passed ? '#059669' : '#d97706'}}>
                      {quizResult.passed ? <CheckCircle size={16} /> : <Clock size={16} />}
                    </div>
                    <div className={styles.activityInfo}>
                      <span className={styles.activityTitle}>Quiz Sonucu: %{quizResult.score}</span>
                      <span className={styles.activityDate}>{timeAgo(quizResult.createdAt)}</span>
                    </div>
                  </div>
                )}
                {mentorSession && (
                  <div className={styles.activityRow}>
                    <div className={styles.activityIcon} style={{background:'#dbeafe',color:'#2563eb'}}>
                      <User size={16} />
                    </div>
                    <div className={styles.activityInfo}>
                      <span className={styles.activityTitle}>AI Mentor Konuşması</span>
                      <span className={styles.activityDate}>{timeAgo(mentorSession.createdAt)}</span>
                    </div>
                  </div>
                )}
                {courseActivity && (
                  <div className={styles.activityRow}>
                    <div className={styles.activityIcon} style={{background:'#ede9fe',color:'#7c3aed'}}>
                      <BookOpen size={16} />
                    </div>
                    <div className={styles.activityInfo}>
                      <span className={styles.activityTitle}>{courseActivity.title}</span>
                      <span className={styles.activityDate}>{timeAgo(courseActivity.createdAt)}</span>
                    </div>
                  </div>
                )}
              </Card>
            </section>
          )}

          {/* Demo modu rozeti */}
          {data?.demoMode && (
            <Card className={styles.demoBanner}>
              <Layers size={18} />
              <span>Demo modundasın. Profesyonel içerikler yöneticin tarafından eklendiğinde kullanılabilir olacak.</span>
            </Card>
          )}
        </div>
        </div>
      )}
    </div>
  )
}
