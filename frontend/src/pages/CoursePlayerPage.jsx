import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, Badge, Button, Progress, Loading, DarkPanel, PageHead } from '@/components/ui'
import QuizWidget from '@/components/ui/QuizWidget'
import TaskWorkspace from '@/components/ui/TaskWorkspace'
import FlashcardSection from '@/components/ui/FlashcardSection'
import VideoPlayer from '@/components/ui/VideoPlayer'
import { EmbeddedPracticeBlock } from '@/components/practice/EmbeddedPracticeBlock'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ChevronLeft, ChevronRight, Menu, X, CheckCircle, BookOpen,
  Clock, Target, FileText, ListChecks, Zap, ArrowLeft, AlertCircle,
  Play, MessageCircle, ExternalLink, Download, Brain, Film
} from 'lucide-react'
import styles from './CoursePlayerPage.module.css'
import { featureFlags } from '@/config/featureFlags'

function buildShortSummary(metadata, content) {
  if (metadata?.summary) return metadata.summary
  if (metadata?.description) return metadata.description

  const paragraphs = String(content || '')
    .split(/\n\s*\n/)
    .map(part => part
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/[*_`>#-]/g, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(part => part.length >= 60 && !part.toLowerCase().startsWith('öğrenme hedef'))

  const summary = paragraphs[0] || ''
  return summary.length > 320 ? `${summary.slice(0, 317).trim()}...` : summary
}

export default function CoursePlayerPage() {
  const { courseId, lessonId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('content')

  const fetchLesson = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [courseData, lessonData] = await Promise.all([
        api.courses.getById(courseId),
        lessonId ? api.courses.getLesson(courseId, lessonId) : Promise.resolve(null),
      ])
      setCourse(courseData.course)

      if (lessonData) {
        setLesson(lessonData.lesson)
      } else if (courseData.course.lessons?.length > 0) {
        const firstLessonId = courseData.course.lessons[0].id
        navigate(`/app/courses/${courseId}/learn/${firstLessonId}`, { replace: true })
        return
      }
    } catch (err) {
      if (err.status === 403) navigate('/app/courses')
      else setError(err.message || 'Yüklenemedi')
    }
    setLoading(false)
  }, [courseId, lessonId, navigate])

  useEffect(() => { fetchLesson() }, [courseId, lessonId])

  async function handleStartReading() {
    if (!lesson) return
    try {
      const koId = lesson.knowledgeObject?.id
      if (koId) await api.learning.start(koId)
    } catch { /* ignore */ }

    // Mark reading as complete
    try {
      const progress = await api.learning.readingComplete(lesson.id, parseInt(courseId))
      setLesson(prev => prev ? { ...prev, progress } : prev)
      setCourse(prev => prev ? {
        ...prev,
        lessons: prev.lessons.map(item => item.id === lesson.id ? { ...item, progress } : item),
      } : prev)
    } catch (err) {
      setError(err.message || 'Okuma ilerlemesi kaydedilemedi')
    }
  }

  function navigateLesson(dir) {
    const target = dir === 'prev' ? lesson?.prevLesson : lesson?.nextLesson
    if (target) {
      navigate(`/app/courses/${courseId}/learn/${target.id}`)
    }
  }

  if (loading) return <Loading text="Ders yükleniyor..." />
  if (error) return <div className={styles.errorContainer}><AlertCircle size={48} /><p>{error}</p></div>
  if (!course) return null

  const ko = lesson?.knowledgeObject
  const meta = ko?.metadata || {}
  const shortSummary = buildShortSummary(meta, ko?.content)

  /* Kurs ilerlemesi — tümü gerçek veriden türetilir. */
  const lessons = course.lessons || []
  const totalLessons = lessons.length || course.lessonCount || 0
  const doneLessons = lessons.filter(l => l.progress?.status === 'completed').length
  const coursePercent = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0
  const lessonIndex = lesson ? lessons.findIndex(l => l.id === lesson.id) : -1

  return (
    <div className={styles.player}>
      <PageHead
        className={styles.pageHead}
        title="Ders Oynatıcı"
        subtitle={`${course.title}${lessonIndex >= 0 ? ` · Ders ${lessonIndex + 1}` : ''}`}
        actions={lesson && (!lesson.progress || lesson.progress.readingPercent < 100) ? (
          <Button onClick={handleStartReading}><CheckCircle size={15} /> Dersi tamamla</Button>
        ) : undefined}
      />
      {/* Mobile toggle */}
      <button className={styles.mobileToggle} onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Ders listesi">
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Left sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.courseTitle}>{course.title}</h2>
          <div className={styles.courseMeta}>
            <Badge variant="info">{course.level}</Badge>
            <span className={styles.lessonCount}>{course.lessonCount} ders</span>
          </div>
        </div>
        <nav className={styles.lessonList}>
            {course.lessons?.map((l, idx) => {
            const isDone = l.progress?.status === 'completed'
            const isActive = lesson?.id === l.id
            // "Kilitli" ayrı bir alan olarak gelmiyor; henüz başlanmamış ve
            // aktif olmayan dersler soluk gösterilir.
            const isUntouched = !isDone && !isActive && !(l.progress?.overallPercent > 0)
            return (
            <button
              key={l.id}
              className={`${styles.lessonItem} ${isActive ? styles.lessonActive : ''} ${isDone ? styles.lessonDone : ''} ${isUntouched ? styles.lessonLocked : ''}`}
              onClick={() => {
                navigate(`/app/courses/${courseId}/learn/${l.id}`)
                setSidebarOpen(false)
              }}
              aria-current={isActive ? 'true' : undefined}
            >
              <span className={styles.lessonOrder}>{idx + 1}</span>
              <div className={styles.lessonInfo}>
                <span className={styles.lessonTitle}>{l.title}</span>
                <span className={styles.lessonMeta}>
                  {l.estimatedMinutes} dk
                  {l.progress?.overallPercent > 0 && ` · %${l.progress.overallPercent}`}
                </span>
              </div>
              {isDone && <CheckCircle size={16} className={styles.doneIcon} aria-hidden="true" />}
            </button>
            )
          })}
        </nav>
        {ko?.sources?.length > 0 && (
          <div className={styles.sidebarSources}>
            <h3>Kaynaklar</h3>
            {ko.sources.map(ks => (
              <div key={ks.id} className={styles.sidebarSourceRow}>
                <FileText size={13} aria-hidden="true" />
                {ks.source.url ? <a href={ks.source.url} target="_blank" rel="noopener noreferrer">{ks.source.title}</a> : <span>{ks.source.title}</span>}
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.topBar}>
          {/* Breadcrumb: Kurslar › kurs › ders */}
          <nav className={styles.breadcrumb} aria-label="Konum">
            <button type="button" className={styles.crumbBtn} onClick={() => navigate('/app/courses')}>
              Kurslar
            </button>
            <span className={styles.crumbSep} aria-hidden="true">›</span>
            <button type="button" className={styles.crumbBtn} onClick={() => navigate(`/app/courses/${courseId}/learn`)}>
              {course.title}
            </button>
            {lesson && (
              <>
                <span className={styles.crumbSep} aria-hidden="true">›</span>
                <span className={styles.crumbCurrent}>{lesson.title}</span>
              </>
            )}
          </nav>
          <div className={styles.topNav}>
            <button
              className={styles.navBtn}
              onClick={() => navigateLesson('prev')}
              disabled={!lesson?.prevLesson}
            >
              <ChevronLeft size={16} /> Önceki
            </button>
            <button
              className={styles.navBtn}
              onClick={() => navigateLesson('next')}
              disabled={!lesson?.nextLesson}
            >
              Sonraki <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {lesson && (
          <>
            {/* Sayfanın TEK koyu paneli — aktif ders başlığı bloğu.
                sweep kapalı: sık bakılan bir yüzeyde hareket yorucu olur.
                bevel kapalı: sayfa genişliğindeki şeritte pah çentik gibi
                okunuyor; altın hairline ve iç yansıma korunur. */}
            <DarkPanel bevel={false} className={styles.lessonHeaderPanel}>
              <div className={styles.lessonHeaderMain}>
                <span className={styles.stageEyebrow}>Ders {lessonIndex + 1} · {lesson.estimatedMinutes || 0} dakika</span>
                <h1 className={styles.lessonHeaderTitle}>{lesson.title}</h1>
                {shortSummary && <p className={styles.stageSummary}>{shortSummary}</p>}
                <div className={styles.lessonMetaRow}>
                  {lessonIndex >= 0 && totalLessons > 0 && (
                    <span>Ders {lessonIndex + 1}/{totalLessons}</span>
                  )}
                  {lesson.estimatedMinutes > 0 && (
                    <span><Clock size={13} aria-hidden="true" /> {lesson.estimatedMinutes} dk</span>
                  )}
                  {meta.level && <span>{meta.level}</span>}
                  {ko?.code && <span>{ko.code}</span>}
                </div>
                {meta.learningOutcomes?.length > 0 && (
                  <div className={styles.stageOutcomes}>
                    {meta.learningOutcomes.slice(0, 3).map((outcome, index) => (
                      <div key={index}><span>Kazanım {index + 1}</span><strong>{outcome}</strong></div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.stageFooter}>
                {totalLessons > 0 && (
                  <div className={styles.stageSegments} role="progressbar" aria-valuenow={coursePercent} aria-valuemin={0} aria-valuemax={100}>
                    {lessons.map((item, index) => <span key={item.id} className={item.progress?.status === 'completed' || index <= lessonIndex ? styles.segmentDone : ''} />)}
                  </div>
                )}
                <span className={styles.headerProgressLabel}>Kurs ilerlemesi %{coursePercent}</span>
                {lesson.nextLesson && <Button variant="secondary" size="sm" onClick={() => navigateLesson('next')}>Sonraki bölüm <ChevronRight size={14} /></Button>}
              </div>
            </DarkPanel>

            {/* Tabs */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'content' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('content')}
              >
                <BookOpen size={14} /> İçerik
              </button>
              {featureFlags.legacyQuiz && lesson.quizzes?.length > 0 && (
                <button
                  className={`${styles.tab} ${activeTab === 'quiz' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('quiz')}
                >
                  <FileText size={14} /> Quiz
                </button>
              )}
              {lesson.taskTemplates?.length > 0 && (
                <button
                  className={`${styles.tab} ${activeTab === 'task' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('task')}
                >
                  <ListChecks size={14} /> Görev
                </button>
              )}
              {featureFlags.legacyFlashcards && ko && ko.hasFlashcards !== false && (
                <button
                  className={`${styles.tab} ${activeTab === 'flashcard' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('flashcard')}
                >
                  <Brain size={14} /> Flashcards
                </button>
              )}
              {ko?.hasVideo && (
                <button
                  className={`${styles.tab} ${activeTab === 'video' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('video')}
                >
                  <Film size={14} /> Video
                </button>
              )}
            </div>

            <div className={styles.contentLayout}>
              <div className={styles.contentArea}>

            {/* Content tab */}
            {activeTab === 'content' && ko && (
              <>
                {shortSummary && (
                  <Card className={`${styles.section} ${styles.summaryCard}`}>
                    <h2 className={styles.sectionTitle}><Zap size={16} /> Kısa Özet</h2>
                    <p className={styles.summaryText}>{shortSummary}</p>
                  </Card>
                )}

                {/* Öğrenme çıktıları sağ sütuna taşındı ("Bu derste kazanacaklarınız") */}

                {/* Main content */}
                <Card className={styles.section}>
                  <h2 className={styles.sectionTitle}><BookOpen size={16} /> İçerik</h2>
                  <div className={styles.markdown}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {ko.content || ''}
                    </ReactMarkdown>
                  </div>
                </Card>

                {/* Examples */}
                {meta.examples?.length > 0 && (
                  <Card className={styles.section}>
                    <h2 className={styles.sectionTitle}><Zap size={16} /> Örnekler</h2>
                    {meta.examples.map((ex, i) => (
                      <div key={i} className={styles.exampleBlock}>
                        <span className={styles.exampleNum}>Örnek {i + 1}</span>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{ex}</ReactMarkdown>
                      </div>
                    ))}
                  </Card>
                )}

                {/* Steps */}
                {meta.steps?.length > 0 && (
                  <Card className={styles.section}>
                    <h2 className={styles.sectionTitle}>Adım Adım Uygulama</h2>
                    <ol className={styles.stepsList}>
                      {meta.steps.map((step, i) => (
                        <li key={i} className={styles.stepItem}>{step}</li>
                      ))}
                    </ol>
                  </Card>
                )}

                {/* Checklist */}
                {meta.checklist?.length > 0 && (
                  <Card className={styles.section}>
                    <h2 className={styles.sectionTitle}><ListChecks size={16} /> Kontrol Listesi</h2>
                    <ul className={styles.checklist}>
                      {meta.checklist.map((item, i) => (
                        <li key={i}><CheckCircle size={14} /> {item}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Formulas */}
                {meta.formulas?.length > 0 && (
                  <Card className={styles.section}>
                    <h2 className={styles.sectionTitle}><Zap size={16} /> Formüller</h2>
                    {meta.formulas.map((fm, i) => (
                      <div key={i} className={styles.formulaBlock}><code>{fm}</code></div>
                    ))}
                  </Card>
                )}

                {/* Embedded Practice Blocks */}
                {lesson.embeddedPracticeBlocks?.length > 0 && (
                  <Card className={styles.section}>
                    <h2 className={styles.sectionTitle}><Zap size={16} /> Uygulama Kutuları</h2>
                    <EmbeddedPracticeBlock
                      blocks={lesson.embeddedPracticeBlocks}
                      contextType="course"
                      contextCode={ko?.code}
                      contextTitle={ko?.title}
                    />
                  </Card>
                )}

                {/* Sources */}
                {ko.sources?.length > 0 && (
                  <Card className={styles.section}>
                    <h2 className={styles.sectionTitle}><Download size={16} /> Kaynaklar</h2>
                    <div className={styles.sourcesList}>
                      {ko.sources.map((ks) => (
                        <div key={ks.id} className={styles.sourceItem}>
                          <FileText size={15} className={styles.sourceIcon} aria-hidden="true" />
                          <div className={styles.sourceBody}>
                            <span className={styles.sourceTitle}>{ks.source.title}</span>
                            {ks.source.publisher && (
                              <span className={styles.sourceName}>{ks.source.publisher}</span>
                            )}
                          </div>
                          <Badge variant={
                            ks.source.authorityLevel === 'high' ? 'success' :
                            ks.source.authorityLevel === 'medium' ? 'info' : 'default'
                          }>
                            {ks.source.authorityLevel === 'high' ? 'Doğrulanmış' :
                             ks.source.authorityLevel === 'medium' ? 'Orta Güven' : 'Düşük Güven'}
                          </Badge>
                          {ks.source.url && (
                            <a href={ks.source.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                              <ExternalLink size={12} aria-hidden="true" /> Kaynağa Git
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Sayfanın TEK turuncu ana CTA'sı — asıl aksiyon dersi tamamlamak */}
                {(!lesson.progress || lesson.progress.readingPercent < 100) && (
                  <div className={styles.readingActions}>
                    <Button variant="cta" onClick={handleStartReading}>
                      <Play size={14} /> Dersi Tamamla
                    </Button>
                  </div>
                )}
                {lesson.progress?.readingPercent >= 100 && (
                  <div className={styles.readingDone}>
                    <CheckCircle size={16} /> Okuma tamamlandı
                  </div>
                )}

                {/* AI Mentor link */}
                {ko?.code && (
                  <Card className={styles.section}>
                    <h2 className={styles.sectionTitle}><MessageCircle size={16} /> AI Mentor</h2>
                    <p className={styles.mentorText}>Bu içerik hakkında AI Mentor'a soru sorabilirsin.</p>
                    <Button
                      variant="primary" size="sm"
                      onClick={() => navigate(`/app/mentor?context=ko&code=${ko.code}&title=${encodeURIComponent(ko.title || '')}`)}
                    >
                      <MessageCircle size={14} /> AI Mentor'a Sor
                    </Button>
                  </Card>
                )}
              </>
            )}

            {/* Quiz tab */}
            {featureFlags.legacyQuiz && activeTab === 'quiz' && lesson.quizzes?.length > 0 && (
              <QuizWidget koId={ko?.id} quizzes={lesson.quizzes} onProgress={fetchLesson} />
            )}

            {/* Flashcard tab */}
            {featureFlags.legacyFlashcards && activeTab === 'flashcard' && ko && ko.hasFlashcards !== false && (
              <FlashcardSection koId={ko.id} onProgress={fetchLesson} />
            )}

            {activeTab === 'video' && ko?.hasVideo && (
              <VideoPlayer koId={ko.id} onProgress={fetchLesson} />
            )}

            {/* Task tab */}
            {activeTab === 'task' && lesson.taskTemplates?.length > 0 && (
              <TaskWorkspace koId={ko?.id} taskTemplates={lesson.taskTemplates} onProgress={fetchLesson} />
            )}

              </div>

              {/* ---------- SAĞ SÜTUN — yalnızca gerçek veri ---------- */}
              <aside className={styles.rail}>
                {totalLessons > 0 && (
                  <Card className={styles.railCard}>
                    <h2 className={styles.railTitle}><Target size={14} /> İlerleme</h2>
                    <span className={styles.railPercent}>%{coursePercent}</span>
                    <Progress value={coursePercent} size="sm" variant="primary" />
                    <span className={styles.railHint}>
                      {doneLessons} / {totalLessons} ders tamamlandı
                    </span>
                  </Card>
                )}

                {lesson.embeddedPracticeBlocks?.length > 0 && (
                  <Card className={styles.railCard}>
                    <h2 className={styles.railTitle}><Zap size={14} /> Uygulama</h2>
                    <span className={styles.railHint}>
                      Bu derste {lesson.embeddedPracticeBlocks.length} uygulama kutusu var.
                    </span>
                  </Card>
                )}

                {meta.learningOutcomes?.length > 0 && (
                  <Card className={styles.railCard}>
                    <h2 className={styles.railTitle}><CheckCircle size={14} /> Bu derste kazanacaklarınız</h2>
                    <ul className={styles.railList}>
                      {meta.learningOutcomes.map((o, i) => (
                        <li key={i}><CheckCircle size={12} aria-hidden="true" /> {o}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                {ko?.sources?.length > 0 && (
                  <Card className={styles.railCard}>
                    <h2 className={styles.railTitle}><Download size={14} /> Ek kaynaklar</h2>
                    {ko.sources.map(ks => (
                      <div key={ks.id} className={styles.railSourceItem}>
                        <FileText size={13} aria-hidden="true" />
                        {ks.source.url ? (
                          <a
                            href={ks.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.railSourceLink}
                          >
                            {ks.source.title}
                          </a>
                        ) : (
                          <span className={styles.railSourceLink}>{ks.source.title}</span>
                        )}
                      </div>
                    ))}
                  </Card>
                )}
              </aside>
            </div>

            {/* Bottom navigation */}
            <div className={styles.bottomNav}>
              <button
                className={styles.navBtn}
                onClick={() => navigateLesson('prev')}
                disabled={!lesson?.prevLesson}
              >
                <ChevronLeft size={16} /> Önceki Ders
              </button>
              <button
                className={styles.navBtn}
                onClick={() => navigateLesson('next')}
                disabled={!lesson?.nextLesson}
              >
                Sonraki Ders <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
