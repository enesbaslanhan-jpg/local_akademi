import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Button, Badge, Loading, Modal } from '@/components/ui'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { ArrowLeft, Edit3, Send, CheckCircle, XCircle, Upload, Archive, AlertTriangle, ClipboardCheck } from 'lucide-react'
import styles from './AdminKOReview.module.css'
import { getFormatLocale } from '@/utils/formatters'

const STATUS_KEYS = ['draft', 'in_review', 'approved', 'published', 'archived', 'rejected']
const STATUS_VARIANTS = { draft: 'default', in_review: 'warning', approved: 'info', published: 'success', archived: 'danger', rejected: 'danger' }

const VALID_TRANSITIONS = {
  draft: ['in_review'],
  rejected: ['in_review'],
  in_review: ['approved', 'rejected'],
  approved: ['published', 'archived'],
  published: ['archived'],
  archived: []
}

const WORKFLOW_ACTIONS = ['submitReview', 'approve', 'reject', 'publish', 'archive']
const WORKFLOW_VARIANTS = { submitReview: 'primary', approve: 'success', reject: 'danger', publish: 'success', archive: 'warning' }
const WORKFLOW_REQUIRE_NOTE = { reject: true }

const ACTION_ROLES = {
  submitReview: ['content_editor', 'admin'],
  approve: ['subject_expert', 'admin'],
  reject: ['subject_expert', 'admin'],
  publish: ['admin'],
  archive: ['admin']
}
const ACTION_FROM_STATUSES = {
  submitReview: ['draft', 'rejected'],
  approve: ['in_review'],
  reject: ['in_review'],
  publish: ['approved'],
  archive: ['published', 'approved']
}

export default function AdminKOReview() {
  const { t } = useTranslation('admin')
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const statusLabel = (status) => t(`knowledge.status.${status}`)

  const [ko, setKO] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeAction, setActiveAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [publishChecks, setPublishChecks] = useState(null)
  const [generatedQuiz, setGeneratedQuiz] = useState(null)
  const [quizLoading, setQuizLoading] = useState(false)

  const loadKO = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.knowledgeV2.getByCode(code)
      setKO(data.knowledgeObject || data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => { loadKO() }, [loadKO])

  async function checkPublishReadiness() {
    if (!ko) return
    try {
      const checks = []
      checks.push({ label: t('review.checks.sourceRequired'), ok: ko.sources?.length > 0 })
      checks.push({ label: t('review.checks.verificationOk'), ok: ko.verificationStatus === 'verified' })
      checks.push({ label: t('review.checks.codeFilled'), ok: !!ko.code })
      checks.push({ label: t('review.checks.versionFilled'), ok: !!ko.currentVersionId })
      if (ko.reviewGate === 'requires_professional_approval') {
        checks.push({ label: t('review.checks.expertApproval'), ok: ko.verificationStatus === 'verified' })
      }
      if (ko.reviewGate === 'requires_current_official_source_and_legal_approval') {
        checks.push({ label: t('review.checks.officialSource'), ok: ko.sources?.some(s => s.source?.authorityLevel === 'official') })
        checks.push({ label: t('review.checks.legalApproval'), ok: false })
      }
      setPublishChecks(checks)
    } catch {
      setPublishChecks(null)
    }
  }

  async function handleWorkflow(action) {
    if (action === 'publish') await checkPublishReadiness()
    setActiveAction(action)
  }

  async function generateQuiz() {
    setQuizLoading(true)
    try {
      const result = await api.admin.generateQuizDraft(ko.id)
      setGeneratedQuiz(result.quiz)
      toast.success(t('review.toasts.quizGenerated'))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setQuizLoading(false)
    }
  }

  async function publishGeneratedQuiz() {
    if (!generatedQuiz) return
    setQuizLoading(true)
    try {
      await api.admin.publishQuizDraft(generatedQuiz.id)
      toast.success(t('review.toasts.quizPublished'))
      setGeneratedQuiz(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setQuizLoading(false)
    }
  }

  async function executeWorkflow(action, note) {
    setActionLoading(true)
    try {
      setError('')
      const fn = api.knowledgeV2[action]
      if (!fn) throw new Error(t('knowledge.errors.invalidAction'))
      await fn(code, note || undefined)
      toast.success(
        action === 'submitReview' ? t('knowledge.toasts.submitted') :
        action === 'approve' ? t('knowledge.toasts.approved') :
        action === 'reject' ? t('knowledge.toasts.rejected') :
        action === 'publish' ? t('knowledge.toasts.published') :
        action === 'archive' ? t('knowledge.toasts.archived') : t('knowledge.toasts.success')
      )
      setActiveAction(null)
      setPublishChecks(null)
      await loadKO()
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  function getAvailableActions() {
    if (!ko || !user) return []
    const role = user.role
    const iconMap = { submitReview: Send, approve: CheckCircle, reject: XCircle, publish: Upload, archive: Archive }
    return WORKFLOW_ACTIONS.filter(key => {
      if (!ACTION_ROLES[key].includes(role) && role !== 'admin') return false
      if (!ACTION_FROM_STATUSES[key].includes(ko.status)) return false
      return true
    }).map(key => ({ key, icon: iconMap[key], label: t(`review.actions.${key}`) }))
  }

  function formatDate(d) {
    if (!d) return '-'
    return new Date(d).toLocaleString(getFormatLocale())
  }

  function getReviewGateLabel(gate) {
    return t(`form.reviewGate.${gate}`) || gate
  }

  if (loading) return <Loading text={t('review.loading')} />
  if (error && !ko) return <div className="alert alert-danger">{error}</div>

  const availableActions = getAvailableActions()
  const statusInfo = STATUS_MAP[ko?.status] || STATUS_MAP.draft
  const userRole = user?.role

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/knowledge')}>
          <ArrowLeft size={16} /> {t('review.backToList')}
        </Button>
        {userRole === 'admin' && ko?.status === 'published' && (
          <Button size="sm" variant="secondary" onClick={generateQuiz} disabled={quizLoading}>
            <ClipboardCheck size={15} /> {quizLoading ? t('review.quiz.generating') : t('review.quiz.button')}
          </Button>
        )}
        {(userRole === 'content_editor' || userRole === 'admin') && (ko?.status === 'draft' || ko?.status === 'rejected') && (
          <Button size="sm" onClick={() => navigate(`/admin/knowledge/${code}/edit`)}>
            <Edit3 size={15} /> {t('review.editButton')}
          </Button>
        )}
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      {/* KO Info */}
      <div className="panel">
        <div className={styles.koHeader}>
          <div>
            <div className={styles.koCode}>{ko?.code || ko?.id}</div>
            <h2 className={styles.koTitle}>{ko?.title}</h2>
          </div>
          <Badge variant={STATUS_VARIANTS[ko?.status] || STATUS_VARIANTS.draft}>{statusLabel(ko?.status)}</Badge>
        </div>

        <div className={styles.metaGrid}>
          <div><small>{t('review.meta.type')}</small><b>{ko?.type}</b></div>
          <div><small>{t('review.meta.level')}</small><b>{ko?.level || 'beginner'}</b></div>
          <div><small>{t('review.meta.category')}</small><b>{ko?.category || '-'}</b></div>
          <div><small>{t('review.meta.verification')}</small>
            <Badge variant={ko?.verificationStatus === 'verified' ? 'success' : 'warning'}>
              {ko?.verificationStatus === 'verified' ? t('knowledge.verification.verified') : ko?.verificationStatus || t('knowledge.verification.pending')}
            </Badge>
          </div>
          <div><small>{t('review.meta.reviewGate')}</small><b>{getReviewGateLabel(ko?.reviewGate)}</b></div>
          <div><small>{t('review.meta.updated')}</small><b>{formatDate(ko?.updatedAt)}</b></div>
        </div>
      </div>

      {/* Content */}
      <div className="panel">
        <h3>{t('review.sections.content')}</h3>
        <div className={styles.content}>
          {ko?.content}
        </div>
      </div>

      {/* Publish Checks */}
      {activeAction === 'publish' && publishChecks && (
        <div className="panel">
          <h3>{t('review.sections.publishChecks')}</h3>
          <div className={styles.checks}>
            {publishChecks.map((c, i) => (
              <div key={i} className={`${styles.checkItem} ${c.ok ? styles.checkOk : styles.checkFail}`}>
                <span>{c.ok ? '✓' : '✗'}</span>
                <span>{c.label}</span>
                {!c.ok && <small className={styles.checkHint}>{t('review.checkHint')}</small>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Actions */}
      {availableActions.length > 0 && (
        <div className={styles.actions}>
          <h3>{t('review.sections.actions')}</h3>
          <div className={styles.actionButtons}>
            {availableActions.map(action => {
              const Icon = action.icon
              return (
                <Button
                  key={action.key}
                  variant={
                    action.key === 'approve' ? 'success' :
                    action.key === 'reject' ? 'danger' :
                    action.key === 'publish' ? 'success' :
                    action.key === 'archive' ? 'secondary' : 'primary'
                  }
                  onClick={() => handleWorkflow(action.key)}
                >
                  <Icon size={16} /> {action.label}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* History */}
      {showHistory && ko?.publicationEvents?.length > 0 && (
        <div className="panel">
          <h3>{t('review.sections.publicationHistory')}</h3>
          {ko.publicationEvents.map((ev, i) => (
            <div key={i} className={styles.historyItem}>
              <div className={styles.historyHead}>
                <Badge>{ev.action}</Badge>
                <small>{formatDate(ev.timestamp)}</small>
              </div>
              {ev.note && <p className={styles.historyNote}>{ev.note}</p>}
              <small className={styles.historyUser}>{ev.performedBy || 'Sistem'}</small>
            </div>
          ))}
        </div>
      )}

      {ko?.reviews?.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>{t('review.sections.reviewHistory')}</h3>
          {ko.reviews.map((r, i) => (
            <div key={i} className={styles.historyItem}>
              <div className={styles.historyHead}>
                <Badge variant={r.status === 'approved' ? 'success' : 'danger'}>{r.status}</Badge>
                <small>{formatDate(r.reviewedAt)}</small>
              </div>
              {r.notes && <p className={styles.historyNote}>{r.notes}</p>}
              <small className={styles.historyUser}>{r.reviewer?.name || r.reviewerId}</small>
            </div>
          ))}
        </div>
      )}

      {/* History toggle */}
      <Button variant="ghost" size="sm" onClick={() => setShowHistory(p => !p)} style={{ alignSelf: 'flex-start' }}>
        {showHistory ? t('review.history.hide') : t('review.history.show')}
      </Button>

      {/* Modals */}
      <Modal
        open={!!generatedQuiz}
        onClose={() => setGeneratedQuiz(null)}
        title={t('review.quiz.modalTitle')}
        size="lg"
      >
        {generatedQuiz && (
          <div>
            <p><strong>{generatedQuiz.title}</strong> · {t('review.quiz.passScore')}: %{generatedQuiz.passScore}</p>
            <p>{t('review.quiz.hiddenNotice')}</p>
            <ol>
              {generatedQuiz.questions.map(question => (
                <li key={question.id} style={{ marginBottom: 18 }}>
                  <strong>{question.questionText}</strong>
                  <ul>
                    {question.options.map(option => (
                      <li key={option}>
                        {option === question.correctAnswer ? <b>{option} ✓</b> : option}
                      </li>
                    ))}
                  </ul>
                  <small>{question.explanation}</small>
                </li>
              ))}
            </ol>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setGeneratedQuiz(null)}>{t('review.quiz.keepDraft')}</Button>
              <Button variant="success" onClick={publishGeneratedQuiz} disabled={quizLoading}>
                {t('review.quiz.publish')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!activeAction && activeAction !== 'publish'}
        onClose={() => { setActiveAction(null); setPublishChecks(null) }}
        onConfirm={(note) => executeWorkflow(activeAction, note)}
        title={activeAction ? t(`knowledge.workflow.${activeAction}.title`) : ''}
        description={activeAction ? t(`knowledge.workflow.${activeAction}.desc`) : ''}
        confirmLabel={activeAction ? t(`knowledge.workflow.${activeAction}.confirmLabel`) : t('knowledge.actions.approve')}
        variant={activeAction ? WORKFLOW_VARIANTS[activeAction] || 'primary' : 'primary'}
        requireNote={activeAction ? WORKFLOW_REQUIRE_NOTE[activeAction] : undefined}
        noteLabel={activeAction && WORKFLOW_REQUIRE_NOTE[activeAction] ? t(`knowledge.workflow.${activeAction}.noteLabel`) : undefined}
        loading={actionLoading}
      />

      {/* Publish confirmation modal */}
      <ConfirmModal
        open={activeAction === 'publish'}
        onClose={() => { setActiveAction(null); setPublishChecks(null) }}
        onConfirm={(note) => executeWorkflow('publish', note)}
        title={t('knowledge.workflow.publish.title')}
        description={t('review.publishConfirm', { failed: publishChecks?.filter(c => !c.ok).length > 0 })}
        confirmLabel={t('knowledge.workflow.publish.confirmLabel')}
        variant="success"
        loading={actionLoading}
      />
    </div>
  )
}
