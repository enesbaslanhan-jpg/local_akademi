import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, Badge, Button, Loading } from '@/components/ui'
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

  return (
    <div className={styles.player}>
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
            {course.lessons?.map((l, idx) => (
            <button
              key={l.id}
              className={`${styles.lessonItem} ${lesson?.id === l.id ? styles.lessonActive : ''}`}
              onClick={() => {
                navigate(`/app/courses/${courseId}/learn/${l.id}`)
                setSidebarOpen(false)
              }}
            >
              <span className={styles.lessonOrder}>{idx + 1}</span>
              <div className={styles.lessonInfo}>
                <span className={styles.lessonTitle}>{l.title}</span>
                <span className={styles.lessonMeta}>
                  {l.estimatedMinutes} dk
                  {l.progress?.overallPercent > 0 && ` · %${l.progress.overallPercent}`}
                </span>
              </div>
              {l.progress?.status === 'completed' && <CheckCircle size={16} className={styles.doneIcon} />}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => navigate('/app/courses')}>
            <ArrowLeft size={16} /> Kurslara Dön
          </button>
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
            <div className={styles.lessonHeader}>
              <h1 className={styles.lessonTitle}>{lesson.title}</h1>
              <div className={styles.lessonMetaRow}>
                <span><Clock size={14} /> {lesson.estimatedMinutes} dk</span>
                {ko && <Badge variant="default">{ko.code}</Badge>}
                {meta.level && <Badge variant="info">{meta.level}</Badge>}
              </div>
            </div>

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

            {/* Content tab */}
            {activeTab === 'content' && ko && (
              <div className={styles.contentArea}>
                {shortSummary && (
                  <Card className={`${styles.section} ${styles.summaryCard}`}>
                    <h2 className={styles.sectionTitle}><Zap size={16} /> Kısa Özet</h2>
                    <p className={styles.summaryText}>{shortSummary}</p>
                  </Card>
                )}

                {/* Learning outcomes */}
                {meta.learningOutcomes?.length > 0 && (
                  <Card className={styles.section}>
                    <h2 className={styles.sectionTitle}><Target size={16} /> Öğrenme Çıktıları</h2>
                    <ul className={styles.outcomeList}>
                      {meta.learningOutcomes.map((o, i) => (
                        <li key={i}><CheckCircle size={14} /> {o}</li>
                      ))}
                    </ul>
                  </Card>
                )}

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
                          <div className={styles.sourceTitle}>{ks.source.title}</div>
                          {ks.source.url && (
                            <a href={ks.source.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                              <ExternalLink size={12} /> Kaynağa Git
                            </a>
                          )}
                          <Badge variant={
                            ks.source.authorityLevel === 'high' ? 'success' :
                            ks.source.authorityLevel === 'medium' ? 'info' : 'default'
                          }>
                            {ks.source.authorityLevel === 'high' ? 'Doğrulanmış' :
                             ks.source.authorityLevel === 'medium' ? 'Orta Güven' : 'Düşük Güven'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Reading complete button */}
                {(!lesson.progress || lesson.progress.readingPercent < 100) && (
                  <div className={styles.readingActions}>
                    <Button variant="primary" onClick={handleStartReading}>
                      <Play size={14} /> Okumayı Tamamladım
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
              </div>
            )}

            {/* Quiz tab */}
            {featureFlags.legacyQuiz && activeTab === 'quiz' && lesson.quizzes?.length > 0 && (
              <div className={styles.contentArea}>
                <QuizWidget koId={ko?.id} quizzes={lesson.quizzes} onProgress={fetchLesson} />
              </div>
            )}

            {/* Flashcard tab */}
            {featureFlags.legacyFlashcards && activeTab === 'flashcard' && ko && ko.hasFlashcards !== false && (
              <div className={styles.contentArea}>
                <FlashcardSection koId={ko.id} onProgress={fetchLesson} />
              </div>
            )}

            {activeTab === 'video' && ko?.hasVideo && (
              <div className={styles.contentArea}>
                <VideoPlayer koId={ko.id} onProgress={fetchLesson} />
              </div>
            )}

            {/* Task tab */}
            {activeTab === 'task' && lesson.taskTemplates?.length > 0 && (
              <div className={styles.contentArea}>
                <TaskWorkspace koId={ko?.id} taskTemplates={lesson.taskTemplates} onProgress={fetchLesson} />
              </div>
            )}

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
