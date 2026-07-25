import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, Badge, Button, Loading, EmptyState } from '@/components/ui'
import QuizWidget from '@/components/ui/QuizWidget'
import TaskWorkspace from '@/components/ui/TaskWorkspace'
import VideoPlayer from '@/components/ui/VideoPlayer'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft, ChevronRight, BookOpen, Clock, CheckCircle,
  AlertCircle, ExternalLink, User, Zap, Target, ListChecks,
  HelpCircle, Download, MessageCircle, FileText, Layers, Play,
  GraduationCap, Brain
} from 'lucide-react'
import styles from './KnowledgeDetail.module.css'

function parseMeta(metadata) {
  try { return JSON.parse(metadata) } catch { return {} }
}

function safeLabel(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const VERIFICATION_LABELS = {
  verified: { label: 'Doğrulanmış', variant: 'success' },
  unverified: { label: 'Doğrulanmamış', variant: 'warning' },
  pending_review: { label: 'İncelemede', variant: 'info' },
  demo_unverified: { label: 'Demo', variant: 'default' }
}

const GATE_LABELS = {
  standard: 'Standart',
  demo_only: 'Demo',
  requires_professional_approval: 'Uzman Onayı Gerekli',
  requires_current_official_source_and_legal_approval: 'Resmi Kaynak + Hukuk Onayı'
}

export default function KnowledgeDetail() {
  const { code } = useParams()
  const navigate = useNavigate()
  const mountedRef = useRef(false)

  const [ko, setKo] = useState(null)
  const [quizzes, setQuizzes] = useState([])
  const [taskTemplates, setTaskTemplates] = useState([])
  const [relatedKOs, setRelatedKOs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [progress, setProgress] = useState(null)
  const [flashcardData, setFlashcardData] = useState(null)
  const [quizStats, setQuizStats] = useState(null)
  const [saving, setSaving] = useState(false)
  const [courseNavigating, setCourseNavigating] = useState(false)
  const [courseNavError, setCourseNavError] = useState('')

  async function handleGoToCourse() {
    if (!ko?.id || courseNavigating) return
    setCourseNavigating(true)
    setCourseNavError('')
    try {
      const data = await api.courses.getAll({ knowledgeObjectId: ko.id, pageSize: 1 })
      const course = data.courses?.[0]
      if (!course) {
        setCourseNavError('Bu konu henüz bir kursa bağlanmamış.')
        return
      }
      if (!course.enrollment) await api.enrollments.enroll(course.id)
      navigate(`/app/courses/${course.id}/learn`)
    } catch (err) {
      setCourseNavError(err.message || 'Kursa geçilemedi. Lütfen tekrar deneyin.')
    } finally {
      setCourseNavigating(false)
    }
  }

  const fetchData = useCallback(async () => {
    if (!code) return
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const res = await api.knowledgeV2.getByCode(code)
      if (!mountedRef.current) return
      setKo(res.knowledgeObject || null)
      setQuizzes(res.quizzes || [])
      setTaskTemplates(res.taskTemplates || [])
      setRelatedKOs(res.relatedKOs || [])
      if (!res.knowledgeObject) setNotFound(true)
      else {
        const koId = res.knowledgeObject.id
        api.learning.getProgress(koId).then(setProgress).catch(() => {})
        api.flashcards.getByKoId(koId).then(setFlashcardData).catch(() => {})
        api.quizzes.getHistory().then(history => {
          const koAttempts = (history.attempts || []).filter(a => a.koId === koId)
          if (koAttempts.length > 0) {
            const best = Math.max(...koAttempts.map(a => a.score))
            setQuizStats({ best, lastScore: koAttempts[0].score, total: koAttempts.length })
          } else {
            setQuizStats(null)
          }
        }).catch(() => {})
      }
    } catch (err) {
      if (!mountedRef.current) return
      if (err.status === 404) setNotFound(true)
      else setError(err.message || 'Detay yüklenemedi')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [code])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    return () => { mountedRef.current = false }
  }, [fetchData])

  async function handleStart() {
    if (!ko || saving) return
    setSaving(true)
    try {
      await api.learning.start(ko.id)
      setProgress({ status: 'in_progress', progressPercent: 0 })
    } catch { }
    setSaving(false)
  }

  async function handleComplete() {
    if (!ko || saving) return
    setSaving(true)
    try {
      await api.learning.complete(ko.id)
      setProgress({ status: 'completed', progressPercent: 100 })
    } catch { }
    setSaving(false)
  }

  async function handleProgress(val) {
    if (!ko || saving) return
    setSaving(true)
    try {
      await api.learning.updateProgress(ko.id, val)
      setProgress({ status: val >= 100 ? 'completed' : 'in_progress', progressPercent: val })
    } catch { }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.backSkeleton}><div className={styles.skelLine} style={{width:'80px'}} /></div>
        <div className={styles.detailSkeleton}>
          <div className={styles.skelLine} style={{width:'60%',height:'24px'}} />
          <div className={styles.skelLine} style={{width:'40%'}} />
          <div className={styles.skelLine} style={{width:'100%',height:'200px'}} />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <AlertCircle size={48} />
          <h2>İçerik bulunamadı</h2>
          <p>Bu kodla eşleşen bir bilgi nesnesi bulunamadı veya erişim iznin yok.</p>
          <Button onClick={() => navigate('/app/knowledge')}>Listeye Dön</Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <AlertCircle size={48} />
          <h2>Hata oluştu</h2>
          <p>{error}</p>
          <Button onClick={fetchData}>Tekrar Dene</Button>
        </div>
      </div>
    )
  }

  if (!ko) return null

  const meta = parseMeta(ko.metadata)
  const vStatus = VERIFICATION_LABELS[ko.verificationStatus] || { label: ko.verificationStatus, variant: 'default' }
  const hasSections = meta.problem || meta.learningOutcomes?.length || meta.examples?.length ||
    meta.steps?.length || meta.checklist?.length || meta.formulas?.length

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Sayfa yolu">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/knowledge')} ariaLabel="Listeye dön">
          <ArrowLeft size={16} /> Bilgi Nesneleri
        </Button>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{ko.code}</span>
      </nav>

      {/* Learning Session */}
      <div className={styles.sessionBar}>
        {!progress || progress.status === 'not_started' ? (
          <div className={styles.sessionRow}>
            <span className={styles.sessionLabel}>Henüz başlamadın</span>
            <button className={styles.sessionBtn} onClick={handleStart} disabled={saving}>
              <Play size={14} /> Öğrenmeye Başla
            </button>
          </div>
        ) : progress.status === 'completed' ? (
          <div className={styles.sessionRow}>
            <CheckCircle size={16} className={styles.sessionDoneIcon} />
            <span className={styles.sessionDone}>Tamamlandı</span>
            <button className={styles.sessionBtnOutline} onClick={handleStart} disabled={saving}>
              Tekrarla
            </button>
          </div>
        ) : (
          <div className={styles.sessionRow}>
            <span className={styles.sessionLabel}>Öğrenme devam ediyor</span>
            <div className={styles.sessionProgressWrap}>
              <div className={styles.sessionProgress}>
                <div className={styles.sessionProgressFill} style={{ width: `${progress.progressPercent}%` }} />
              </div>
              <span className={styles.sessionPercent}>%{progress.progressPercent}</span>
            </div>
            <div className={styles.sessionActions}>
              <button className={styles.sessionBtnDone} onClick={handleComplete} disabled={saving}>
                <CheckCircle size={14} /> Tamamla
              </button>
            </div>
          </div>
        )}

        {/* Learning Tools Progress */}
        <div className={styles.toolsRow}>
          {flashcardData && (
            <div className={styles.toolStat}>
              <Brain size={14} />
              <span className={styles.toolStatLabel}>Kart</span>
              <span className={styles.toolStatValue}>
                {flashcardData.progress
                  ? `%${flashcardData.progress.percent} (${flashcardData.progress.mastered}/${flashcardData.totalCards})`
                  : `0/${flashcardData.totalCards}`}
              </span>
            </div>
          )}
          {quizzes.length > 0 && (
            <div className={styles.toolStat}>
              <HelpCircle size={14} />
              <span className={styles.toolStatLabel}>Quiz</span>
              <span className={styles.toolStatValue}>
                {quizStats ? `En iyi %${quizStats.best} (${quizStats.total} deneme)` : 'Çözülmedi'}
              </span>
            </div>
          )}
          {taskTemplates.length > 0 && (
            <div className={styles.toolStat}>
              <ListChecks size={14} />
              <span className={styles.toolStatLabel}>Görev</span>
              <span className={styles.toolStatValue}>{taskTemplates.length} adet</span>
            </div>
          )}
        </div>
      </div>

      {/* Main two-column layout */}
      <div className={styles.mainGrid}>
        {/* Left: main content */}
        <div className={styles.mainContent}>

          {/* Title & Meta Row */}
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{ko.title}</h1>
              <Badge variant="default" className={styles.typeBadge}>{ko.type}</Badge>
            </div>
            <div className={styles.metaRow}>
              {ko.code && <span className={styles.code}>{ko.code}</span>}
              {meta.category && <Badge variant="info">{safeLabel(meta.category)}</Badge>}
              {meta.subcategory && <Badge variant="default">{meta.subcategory}</Badge>}
              {meta.level && <Badge variant="info">{meta.level}</Badge>}
              {ko.currentVersion && (
                <Badge variant="default">v{ko.currentVersion.versionNumber}</Badge>
              )}
              <Badge variant={vStatus.variant}>{vStatus.label}</Badge>
              {ko.reviewGate && ko.reviewGate !== 'standard' && ko.reviewGate !== 'demo_only' && (
                <Badge variant="warning">{GATE_LABELS[ko.reviewGate] || ko.reviewGate}</Badge>
              )}
              {meta.duration && (
                <span className={styles.duration}>
                  <Clock size={14} /> {meta.duration} dk
                </span>
              )}
            </div>
            <p className={styles.updatedAt}>
              Son güncelleme: {new Date(ko.updatedAt).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>

          {/* Summary */}
          {meta.summary && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><FileText size={18} /> Özet</h2>
              <p className={styles.summaryText}>{meta.summary}</p>
            </Card>
          )}

          {/* Problem */}
          {meta.problem && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><AlertCircle size={18} /> Çözülen Problem</h2>
              <p className={styles.bodyText}>{meta.problem}</p>
            </Card>
          )}

          {/* Learning Outcomes */}
          {meta.learningOutcomes?.length > 0 && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><Target size={18} /> Öğrenme Çıktıları</h2>
              <ul className={styles.list}>
                {meta.learningOutcomes.map((item, i) => (
                  <li key={i} className={styles.listItem}><CheckCircle size={14} /> {item}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* Main Content */}
          {ko.content && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><BookOpen size={18} /> Açıklama</h2>
              <div className={styles.markdown}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {ko.content}
                </ReactMarkdown>
              </div>
            </Card>
          )}

          {/* Examples */}
          {meta.examples?.length > 0 && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><Zap size={18} /> Örnekler</h2>
              {meta.examples.map((ex, i) => (
                <div key={i} className={styles.exampleBlock}>
                  <span className={styles.exampleNum}>Örnek {i + 1}</span>
                  <p className={styles.bodyText}>{ex}</p>
                </div>
              ))}
            </Card>
          )}

          {/* Step-by-Step */}
          {meta.steps?.length > 0 && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><ArrowLeft size={18} className={styles.rotate180} /> Adım Adım Uygulama</h2>
              <ol className={styles.stepsList}>
                {meta.steps.map((step, i) => (
                  <li key={i} className={styles.stepItem}>
                    <span className={styles.stepNum}>{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {/* Checklist */}
          {meta.checklist?.length > 0 && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><ListChecks size={18} /> Kontrol Listesi</h2>
              <ul className={styles.list}>
                {meta.checklist.map((item, i) => (
                  <li key={i} className={styles.listItem}><CheckCircle size={14} /> {item}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* Formulas */}
          {meta.formulas?.length > 0 && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><Zap size={18} /> Formüller</h2>
              {meta.formulas.map((fm, i) => (
                <div key={i} className={styles.formulaBlock}>
                  <code className={styles.formula}>{fm}</code>
                </div>
              ))}
            </Card>
          )}

          {/* Video */}
          <VideoPlayer koId={ko.id} onProgress={fetchData} />

          {/* Task Templates */}
          {taskTemplates.length > 0 && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><ListChecks size={18} /> Görev</h2>
              <TaskWorkspace koId={ko.id} taskTemplates={taskTemplates} onProgress={fetchData} />
            </Card>
          )}

          {/* Quiz */}
          {quizzes.length > 0 && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><HelpCircle size={18} /> Mini Quiz</h2>
              <QuizWidget koId={ko.id} quizzes={quizzes} onProgress={fetchData} />
            </Card>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className={styles.sidebar}>
          {/* Sources */}
          <Card className={styles.sideSection}>
            <div className={styles.sourceHeader}>
              <h2 className={styles.sideSectionTitle}><Download size={16} /> Kaynaklar</h2>
              <span className={styles.sourceCountBadge}>{ko.sources?.length || 0}</span>
            </div>
            {ko.sources?.length > 0 ? (
              <div className={styles.sourcesList}>
                {ko.sources.map(ks => (
                  <div key={ks.id} className={styles.sourceItem}>
                    <div className={styles.sourceTitle}>{ks.source.title}</div>
                    <div className={styles.sourceMeta}>
                      {ks.source.url && (
                        <a
                          href={ks.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sourceLink}
                          aria-label={`${ks.source.title} (yeni sekmede açılır)`}
                        >
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
                    {ks.source.lastChecked && (
                      <span className={styles.sourceChecked}>
                        Son kontrol: {new Date(ks.source.lastChecked).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>Henüz kaynak eklenmemiş.</p>
            )}
          </Card>

          {/* Go to Course */}
          {(ko.code?.startsWith('CUR-') || ko.code?.startsWith('KBX-')) ? (
                <Card className={styles.sideSection}>
                  <h2 className={styles.sideSectionTitle}><GraduationCap size={16} /> Kurs</h2>
                  <Button
                    variant="primary" size="sm" className={styles.mentorBtn}
                    onClick={handleGoToCourse}
                    disabled={courseNavigating}
                  >
                    <GraduationCap size={14} /> {courseNavigating ? 'Kurs Açılıyor...' : 'Bu Konunun Kursuna Git'}
                  </Button>
                  {courseNavError && <p className={styles.courseNavError}>{courseNavError}</p>}
                </Card>
          ) : null}

          {/* Quick Actions */}
          {(flashcardData || quizzes.length > 0) && (
            <Card className={styles.sideSection}>
              <h2 className={styles.sideSectionTitle}><Zap size={16} /> Hızlı Çalışma</h2>
              <div className={styles.quickActions}>
                {flashcardData && flashcardData.totalCards > 0 && (
                  <Button
                    variant="primary" size="sm" className={styles.quickBtn}
                    onClick={() => navigate(`/app/flashcards/study/${ko.id}`)}
                    ariaLabel="Flashcard çalış"
                  >
                    <Brain size={14} /> Flashcard Çalış ({flashcardData.totalCards} kart)
                  </Button>
                )}
                {quizzes.length > 0 && (
                  <Button
                    variant="primary" size="sm" className={styles.quickBtn}
                    onClick={() => navigate(`/app/quiz/take/${ko.id}`)}
                    ariaLabel="Quiz çöz"
                  >
                    <HelpCircle size={14} /> Quiz Çöz ({quizzes.length} quiz)
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* AI Mentor */}
          <Card className={styles.sideSection}>
            <h2 className={styles.sideSectionTitle}><MessageCircle size={16} /> AI Mentor</h2>
            <p className={styles.mentorText}>
              Bu içerik hakkında AI Mentor'a soru sorabilirsin.
            </p>
            <Button
              variant="primary"
              size="sm"
              className={styles.mentorBtn}
              onClick={() => navigate(`/app/mentor?context=ko&code=${ko.code}&title=${encodeURIComponent(ko.title)}`)}
              ariaLabel="AI Mentora sor"
            >
              <MessageCircle size={16} /> AI Mentor'a Sor
            </Button>
          </Card>

          {/* Related KOs */}
          {relatedKOs.length > 0 && (
            <Card className={styles.sideSection}>
              <h2 className={styles.sideSectionTitle}><Layers size={16} /> İlgili İçerikler</h2>
              <div className={styles.relatedList}>
                {relatedKOs.map(rko => {
                  const rMeta = parseMeta(rko.metadata)
                  return (
                    <div
                      key={rko.id}
                      className={styles.relatedItem}
                      onClick={() => navigate(`/app/knowledge/${rko.code}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') navigate(`/app/knowledge/${rko.code}`) }}
                    >
                      <div className={styles.relatedTitle}>{rko.title}</div>
                      <div className={styles.relatedMeta}>
                        {rko.category?.name && <span>{rko.category.name}</span>}
                        {rMeta.level && <span>{rMeta.level}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
