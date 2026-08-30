import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, Badge, Button, Loading, EmptyState } from '@/components/ui'
import QuizWidget from '@/components/ui/QuizWidget'
import TaskWorkspace from '@/components/ui/TaskWorkspace'
import VideoPlayer from '@/components/ui/VideoPlayer'
import { EmbeddedPracticeBlock } from '@/components/practice/EmbeddedPracticeBlock'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useMentorContext } from '@/context/MentorContext'
import {
  ArrowLeft, ChevronRight, BookOpen, Clock, CheckCircle,
  AlertCircle, ExternalLink, User, Zap, Target, ListChecks,
  HelpCircle, Download, MessageCircle, FileText, Layers, Play,
  GraduationCap, Brain, MessageSquare
} from 'lucide-react'
import styles from './KnowledgeDetail.module.css'
import { featureFlags } from '@/config/featureFlags'

function parseMeta(metadata) {
  try { return JSON.parse(metadata) } catch { return {} }
}

function safeLabel(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// İçerik aktarımında KO markdown gövdesine sızan ham "## Metadata" bloğunu
// renderdan kaldırır. Kalıcı metni (kilitlenmiş ders içeriği) korur; yalnızca
// ham metadata sızıntısını gizler. Kaynak içeriğe yazmaz.
function stripRawMetadataBlock(markdown) {
  if (!markdown) return markdown
  return markdown.replace(
    /\n+#{2,6}\s+Metadata\s*\n[\s\S]*?(?=\n[ ]{0,3}#{1,6}\s|\n*$)/gi,
    '\n'
  ).replace(/^\n+/, '')
}

// Markdown gövdesindeki başlıkları, sayfa bölüm başlıklarıyle (h2) çakışmaması
// için bir seviye düşürür (h1/h2 -> h3, h3 -> h4). İçeriğin metnini değiştirmez.
const markdownComponents = {
  h1: ({ node, ...props }) => <h3 {...props} />,
  h2: ({ node, ...props }) => <h3 {...props} />,
  h3: ({ node, ...props }) => <h4 {...props} />,
  h4: ({ node, ...props }) => <h4 {...props} />,
}

const VERIFICATION_LABELS = {
  verified: { labelKey: 'knowledge.statusVerified', variant: 'success' },
  unverified: { labelKey: 'knowledge.statusUnverified', variant: 'warning' },
  pending_review: { labelKey: 'knowledge.statusPendingReview', variant: 'info' },
  demo_unverified: { labelKey: 'knowledge.statusDemo', variant: 'default' }
}

const GATE_LABELS = {
  standard: 'knowledge.gateStandard',
  demo_only: 'knowledge.statusDemo',
  requires_professional_approval: 'knowledge.gateProfessionalApproval',
  requires_current_official_source_and_legal_approval: 'knowledge.gateOfficialLegal'
}

export default function KnowledgeDetail() {
  const { t, i18n } = useTranslation('learning')
  const localizedMarkdownComponents = {
    ...markdownComponents,
    table: ({ node, ...props }) => <div className={styles.tableWrap} role="region" aria-label={t('knowledge.tableAria')} tabIndex={0}><table {...props} /></div>
  }
  const { code } = useParams()
  const navigate = useNavigate()
  const mountedRef = useRef(false)

  const mentorContext = useMentorContext()
  const isContextualMentorEnabled = import.meta.env.VITE_FF_CONTEXTUAL_MENTOR === 'true'

  const [ko, setKo] = useState(null)
  const [quizzes, setQuizzes] = useState([])
  const [taskTemplates, setTaskTemplates] = useState([])
  const [relatedKOs, setRelatedKOs] = useState([])
  const [embeddedPracticeBlocks, setEmbeddedPracticeBlocks] = useState([])
  /* Canonical KO'nun ders bagi. Varsa bu ekran referans olarak kalir ve
     kullaniciyi asil ogrenme deneyimine (Course Player) yonlendirir. */
  const [canonicalLesson, setCanonicalLesson] = useState(null)
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
        setCourseNavError(t('knowledge.errorLinkCourse'))
        return
      }
      if (!course.enrollment) await api.enrollments.enroll(course.id)
      navigate(`/app/courses/${course.id}/learn`)
    } catch (err) {
      setCourseNavError(err.message || t('knowledge.errorGoCourse'))
    } finally {
      setCourseNavigating(false)
    }
  }

  /*
   * "Dersi Aç" — canonical KO'nun dersini açar.
   *
   * ÖNCEDEN doğrudan `/app/courses/:id/learn/:lessonId` adresine gidiyordu.
   * Ders uç noktası kayıt (enrollment) ZORUNLU tutuyor; kayıtlı olmayan
   * kullanıcı 403 alıyor, Course Player da 403'te sessizce kurs kataloğuna
   * geri atıyordu. Kullanıcı "Dersi Aç" deyip kendini kurs listesinde
   * buluyordu, sebebini görmeden.
   *
   * Çözüm: aynı sayfadaki "Öğrenmeye Başla" akışıyla AYNI deseni izle —
   * gerekiyorsa kaydı oluştur, sonra derse git. Kayıt uç noktası idempotent,
   * zaten kayıtlıysa mevcut kaydı döner.
   */
  async function acCanonicalDers() {
    if (!canonicalLesson || courseNavigating) return
    setCourseNavigating(true)
    setCourseNavError('')
    try {
      await api.enrollments.enroll(canonicalLesson.courseId)
      navigate(`/app/courses/${canonicalLesson.courseId}/learn/${canonicalLesson.lessonId}`)
    } catch (err) {
      setCourseNavError(err.message || t('knowledge.errorOpenLesson'))
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
      setQuizzes(featureFlags.legacyQuiz ? (res.quizzes || []) : [])
      setTaskTemplates(res.taskTemplates || [])
      setRelatedKOs(res.relatedKOs || [])
      setEmbeddedPracticeBlocks(res.embeddedPracticeBlocks || [])
      setCanonicalLesson(res.canonicalLesson || null)
      if (!res.knowledgeObject) setNotFound(true)
      else {
        const koId = res.knowledgeObject.id
        api.learning.getProgress(koId).then(setProgress).catch(() => {})
        if (featureFlags.legacyFlashcards) {
          api.flashcards.getByKoId(koId).then(setFlashcardData).catch(() => {})
        }
        if (featureFlags.legacyQuiz) api.quizzes.getHistory().then(history => {
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
      else setError(err.message || t('knowledge.errorLoadDetail'))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [code, t])

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

  function handleAskMentor() {
    if (mentorContext?.openMentorWithContext) {
      mentorContext.openMentorWithContext({
        contextType: 'knowledge_object',
        source: 'content_detail',
        knowledgeObjectCode: ko.code,
        title: ko.title,
        route: window.location.pathname
      })
    }
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
          <h2>{t('knowledge.notFoundTitle')}</h2>
          <p>{t('knowledge.notFoundMessage')}</p>
          <Button onClick={() => navigate('/app/knowledge')}>{t('knowledge.backToList')}</Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <AlertCircle size={48} />
          <h2>{t('knowledge.errorTitle')}</h2>
          <p>{error}</p>
          <Button onClick={fetchData}>{t('knowledge.retry')}</Button>
        </div>
      </div>
    )
  }

  if (!ko) return null

  const meta = parseMeta(ko.metadata)
  const vStatus = VERIFICATION_LABELS[ko.verificationStatus] || { labelKey: null, variant: 'default' }
  const hasSections = meta.problem || meta.learningOutcomes?.length || meta.examples?.length ||
    meta.steps?.length || meta.checklist?.length || meta.formulas?.length

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label={t('knowledge.breadcrumbAria')}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/knowledge')} ariaLabel={t('knowledge.backToListAria')}>
          <ArrowLeft size={16} /> {t('knowledge.objectsLabel')}
        </Button>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{ko.code}</span>
      </nav>

      {/* Canonical içerik için bu ekran yalnız REFERANSTIR; asıl öğrenme
          deneyimi Course Player'dır. Kullanıcı buraya mentor atfı veya
          doğrudan bağlantıyla düşebilir, o yüzden yol geri gösterilir. */}
      {canonicalLesson && (
        <Card className={styles.canonicalNotice}>
          <div className={styles.canonicalNoticeText}>
            <strong>{t('knowledge.canonicalNoticeTitle')}</strong>
            <p>{t('knowledge.canonicalNoticeText', { courseTitle: canonicalLesson.courseTitle })}</p>
          </div>
          <Button
            variant="primary"
            disabled={courseNavigating}
            onClick={acCanonicalDers}
          >
            {courseNavigating ? t('knowledge.opening') : t('knowledge.openLesson')}
          </Button>
        </Card>
      )}

      {/* Learning Session */}
      <div className={styles.sessionBar}>
        {!progress || progress.status === 'not_started' ? (
          <div className={styles.sessionRow}>
            <span className={styles.sessionLabel}>{t('knowledge.sessionNotStarted')}</span>
            <button className={styles.sessionBtn} onClick={handleStart} disabled={saving}>
              <Play size={14} /> {t('knowledge.startLearning')}
            </button>
          </div>
        ) : progress.status === 'completed' ? (
          <div className={styles.sessionRow}>
            <CheckCircle size={16} className={styles.sessionDoneIcon} />
            <span className={styles.sessionDone}>{t('knowledge.completed')}</span>
            <button className={styles.sessionBtnOutline} onClick={handleStart} disabled={saving}>
              {t('knowledge.repeat')}
            </button>
          </div>
        ) : (
          <div className={styles.sessionRow}>
            <span className={styles.sessionLabel}>{t('knowledge.sessionInProgress')}</span>
            <div className={styles.sessionProgressWrap}>
              <div className={styles.sessionProgress}>
                <div className={styles.sessionProgressFill} style={{ width: `${progress.progressPercent}%` }} />
              </div>
              <span className={styles.sessionPercent}>%{progress.progressPercent}</span>
            </div>
            <div className={styles.sessionActions}>
              <button className={styles.sessionBtnDone} onClick={handleComplete} disabled={saving}>
                <CheckCircle size={14} /> {t('knowledge.complete')}
              </button>
            </div>
          </div>
        )}

        {/* Learning Tools Progress */}
        <div className={styles.toolsRow}>
          {flashcardData && (
            <div className={styles.toolStat}>
              <Brain size={14} />
              <span className={styles.toolStatLabel}>{t('knowledge.cardsLabel')}</span>
              <span className={styles.toolStatValue}>
                {flashcardData.progress
                  ? t('knowledge.cardStatPercent', { percent: flashcardData.progress.percent, mastered: flashcardData.progress.mastered, total: flashcardData.totalCards })
                  : t('knowledge.cardStatInitial', { total: flashcardData.totalCards })}
              </span>
            </div>
          )}
          {featureFlags.legacyQuiz && quizzes.length > 0 && (
            <div className={styles.toolStat}>
              <HelpCircle size={14} />
              <span className={styles.toolStatLabel}>Quiz</span>
              <span className={styles.toolStatValue}>
                {quizStats ? t('knowledge.quizBestStat', { score: quizStats.best, count: quizStats.total }) : t('knowledge.quizNotAttempted')}
              </span>
            </div>
          )}
          {taskTemplates.length > 0 && (
            <div className={styles.toolStat}>
              <ListChecks size={14} />
              <span className={styles.toolStatLabel}>{t('knowledge.taskLabel')}</span>
              <span className={styles.toolStatValue}>{t('knowledge.taskCountShort', { count: taskTemplates.length })}</span>
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
              <h1 className="sr-only">{ko.title}</h1>
              <div className={styles.title}>{ko.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge variant="default" className={styles.typeBadge}>{ko.type}</Badge>
                {isContextualMentorEnabled && (
                  <Button variant="secondary" size="sm" onClick={handleAskMentor}>
                    <MessageSquare size={14} className="mr-1" /> {t('knowledge.askContextualMentor')}
                  </Button>
                )}
              </div>
            </div>
            <div className={styles.metaRow}>
              {ko.code && <span className={styles.code}>{ko.code}</span>}
              {meta.category && <Badge variant="info">{safeLabel(meta.category)}</Badge>}
              {meta.subcategory && <Badge variant="default">{meta.subcategory}</Badge>}
              {meta.level && <Badge variant="info">{meta.level}</Badge>}
              {ko.currentVersion && (
                <Badge variant="default">v{ko.currentVersion.versionNumber}</Badge>
              )}
              <Badge variant={vStatus.variant}>{vStatus.labelKey ? t(vStatus.labelKey) : ko.verificationStatus}</Badge>
              {ko.reviewGate && ko.reviewGate !== 'standard' && ko.reviewGate !== 'demo_only' && (
                <Badge variant="warning">{GATE_LABELS[ko.reviewGate] ? t(GATE_LABELS[ko.reviewGate]) : ko.reviewGate}</Badge>
              )}
              {meta.duration && (
                <span className={styles.duration}>
                  <Clock size={14} /> {t('knowledgeTopic.minutes', { count: meta.duration })}
                </span>
              )}
            </div>
            <p className={styles.updatedAt}>
              {t('knowledge.lastUpdated')} {new Date(ko.updatedAt).toLocaleDateString(i18n.resolvedLanguage || i18n.language, {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>

          {/* Summary */}
          {meta.summary && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><FileText size={18} /> {t('knowledge.summaryTitle')}</h2>
              <p className={styles.summaryText}>{meta.summary}</p>
            </Card>
          )}

          {/* Problem */}
          {meta.problem && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><AlertCircle size={18} /> {t('knowledge.problemTitle')}</h2>
              <p className={styles.bodyText}>{meta.problem}</p>
            </Card>
          )}

          {/* Learning Outcomes */}
          {meta.learningOutcomes?.length > 0 && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><Target size={18} /> {t('knowledge.outcomesTitle')}</h2>
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
              <h2 className={styles.sectionTitle}><BookOpen size={18} /> {t('knowledge.descriptionTitle')}</h2>
              <div className={styles.markdown}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={localizedMarkdownComponents}>
                  {stripRawMetadataBlock(ko.content)}
                </ReactMarkdown>
              </div>
            </Card>
          )}

          {/* Examples */}
          {meta.examples?.length > 0 && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><Zap size={18} /> {t('knowledge.examplesTitle')}</h2>
              {meta.examples.map((ex, i) => (
                <div key={i} className={styles.exampleBlock}>
                  <span className={styles.exampleNum}>{t('knowledge.exampleNumber', { index: i + 1 })}</span>
                  <p className={styles.bodyText}>{ex}</p>
                </div>
              ))}
            </Card>
          )}

          {/* Step-by-Step */}
          {meta.steps?.length > 0 && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><ArrowLeft size={18} className={styles.rotate180} /> {t('knowledge.stepsTitle')}</h2>
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
              <h2 className={styles.sectionTitle}><ListChecks size={18} /> {t('knowledge.checklistTitle')}</h2>
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
              <h2 className={styles.sectionTitle}><Zap size={18} /> {t('knowledge.formulasTitle')}</h2>
              {meta.formulas.map((fm, i) => (
                <div key={i} className={styles.formulaBlock}>
                  <code className={styles.formula}>{fm}</code>
                </div>
              ))}
            </Card>
          )}

          {/* Video */}
          <VideoPlayer koId={ko.id} onProgress={fetchData} />

          {/* Embedded Practice Blocks — her kart ayrı bölüm olarak */}
          {embeddedPracticeBlocks.length > 0 && (
            <div className={styles.embeddedBlocksSection}>
              <h2 className={styles.sectionTitle}><Zap size={18} /> {t('knowledge.practiceBoxesTitle')}</h2>
              <EmbeddedPracticeBlock
                blocks={embeddedPracticeBlocks}
                contextType="knowledge_object"
                contextCode={ko.code}
                contextTitle={ko.title}
              />
            </div>
          )}

          {/* Task Templates */}
          {taskTemplates.length > 0 && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><ListChecks size={18} /> {t('knowledge.taskLabel')}</h2>
              <TaskWorkspace koId={ko.id} taskTemplates={taskTemplates} onProgress={fetchData} />
            </Card>
          )}

          {/* Quiz */}
          {quizzes.length > 0 && (
            <Card className={styles.section}>
              <h2 className={styles.sectionTitle}><HelpCircle size={18} /> {t('knowledge.miniQuizTitle')}</h2>
              <QuizWidget koId={ko.id} quizzes={quizzes} onProgress={fetchData} />
            </Card>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className={styles.sidebar}>
          {/* Sources */}
          <Card className={styles.sideSection}>
            <div className={styles.sourceHeader}>
              <h2 className={styles.sideSectionTitle}><Download size={16} /> {t('knowledge.sourcesTitle')}</h2>
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
                          aria-label={t('knowledge.sourceOpenAria', { title: ks.source.title })}
                        >
                          <ExternalLink size={12} /> {t('knowledge.openSource')}
                        </a>
                      )}
                      <Badge variant={
                        ks.source.authorityLevel === 'high' ? 'success' :
                        ks.source.authorityLevel === 'medium' ? 'info' : 'default'
                      }>
                        {ks.source.authorityLevel === 'high' ? t('knowledge.authorityHigh') :
                         ks.source.authorityLevel === 'medium' ? t('knowledge.authorityMedium') : t('knowledge.authorityLow')}
                      </Badge>
                    </div>
                    {ks.source.lastChecked && (
                      <span className={styles.sourceChecked}>
                        {t('knowledge.lastChecked')} {new Date(ks.source.lastChecked).toLocaleDateString(i18n.resolvedLanguage || i18n.language)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>{t('knowledge.noSources')}</p>
            )}
          </Card>

          {/* Go to Course */}
          {(ko.code?.startsWith('CUR-') || ko.code?.startsWith('KBX-')) ? (
                <Card className={styles.sideSection}>
                  <h2 className={styles.sideSectionTitle}><GraduationCap size={16} /> {t('knowledge.courseCardTitle')}</h2>
                  <Button
                    variant="primary" size="sm" className={styles.mentorBtn}
                    onClick={handleGoToCourse}
                    disabled={courseNavigating}
                  >
                    <GraduationCap size={14} /> {courseNavigating ? t('knowledge.openingCourse') : t('knowledge.goToCourseCta')}
                  </Button>
                  {courseNavError && <p className={styles.courseNavError}>{courseNavError}</p>}
                </Card>
          ) : null}

          {/* Quick Actions */}
          {((featureFlags.legacyFlashcards && flashcardData) || (featureFlags.legacyQuiz && quizzes.length > 0)) && (
            <Card className={styles.sideSection}>
              <h2 className={styles.sideSectionTitle}><Zap size={16} /> {t('knowledge.quickStudyTitle')}</h2>
              <div className={styles.quickActions}>
                {featureFlags.legacyFlashcards && flashcardData && flashcardData.totalCards > 0 && (
                  <Button
                    variant="primary" size="sm" className={styles.quickBtn}
                    onClick={() => navigate(`/app/flashcards/study/${ko.id}`)}
                    ariaLabel={t('knowledge.flashcardStudyAria')}
                  >
                    <Brain size={14} /> {t('knowledge.flashcardStudyCta', { count: flashcardData.totalCards })}
                  </Button>
                )}
                {featureFlags.legacyQuiz && quizzes.length > 0 && (
                  <Button
                    variant="primary" size="sm" className={styles.quickBtn}
                    onClick={() => navigate(`/app/quiz/take/${ko.id}`)}
                    ariaLabel={t('knowledge.quizStudyAria')}
                  >
                    <HelpCircle size={14} /> {t('knowledge.quizStudyCta', { count: quizzes.length })}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* AI Mentor */}
          <Card className={styles.sideSection}>
            <h2 className={styles.sideSectionTitle}><MessageCircle size={16} /> AI Mentor</h2>
            <p className={styles.mentorText}>
              {t('knowledge.mentorIntro')}
            </p>
            <Button
              variant="primary"
              size="sm"
              className={styles.mentorBtn}
              onClick={() => navigate(`/app/mentor?context=ko&code=${ko.code}&title=${encodeURIComponent(ko.title)}`)}
              ariaLabel={t('knowledge.askMentorAria')}
            >
              <MessageCircle size={16} /> {t('knowledge.askMentor')}
            </Button>
          </Card>

          {/* Related KOs */}
          {relatedKOs.length > 0 && (
            <Card className={styles.sideSection}>
              <h2 className={styles.sideSectionTitle}><Layers size={16} /> {t('knowledge.relatedTitle')}</h2>
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
