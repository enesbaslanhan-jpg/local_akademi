import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Button, Badge, Loading, Modal } from '@/components/ui'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { ArrowLeft, Edit3, Send, CheckCircle, XCircle, Upload, Archive, AlertTriangle, ClipboardCheck } from 'lucide-react'
import styles from './AdminKOReview.module.css'

const STATUS_MAP = {
  draft: { label: 'Taslak', variant: 'default' },
  in_review: { label: 'İncelemede', variant: 'warning' },
  approved: { label: 'Onaylı', variant: 'info' },
  published: { label: 'Yayında', variant: 'success' },
  archived: { label: 'Arşiv', variant: 'danger' },
  rejected: { label: 'Red', variant: 'danger' }
}

const VALID_TRANSITIONS = {
  draft: ['in_review'],
  rejected: ['in_review'],
  in_review: ['approved', 'rejected'],
  approved: ['published', 'archived'],
  published: ['archived'],
  archived: []
}

const WORKFLOW_CONFIRM = {
  submitReview: {
    title: 'İncelemeye Gönder',
    desc: 'Bu KO inceleme sürecine gönderilecek. İnceleyenler onay veya red kararı verebilir.',
    confirmLabel: 'İncelemeye Gönder',
    variant: 'primary'
  },
  approve: {
    title: 'KO\'yu Onayla',
    desc: 'Bu KO\'yu onaylıyorsunuz. Onaylanan KO\'lar publish edilebilir.',
    confirmLabel: 'Onayla',
    variant: 'success'
  },
  reject: {
    title: 'KO\'yu Reddet',
    desc: 'Bu KO\'yu reddediyorsunuz. Red sebebini açıklamanız zorunludur.',
    confirmLabel: 'Reddet',
    variant: 'danger',
    requireNote: true,
    noteLabel: 'Red sebebi'
  },
  publish: {
    title: 'KO\'yu Yayınla',
    desc: 'Bu KO yayına alınacak. Yayındaki KO\'lar tüm kullanıcılar tarafından görülebilir.',
    confirmLabel: 'Yayınla',
    variant: 'success'
  },
  archive: {
    title: 'KO\'yu Arşivle',
    desc: 'Bu KO arşivlenecek. Arşivlenen KO\'lar yayından kalkar.',
    confirmLabel: 'Arşivle',
    variant: 'warning'
  }
}

const ACTION_CONFIG = {
  submitReview: { icon: Send, label: 'İncelemeye Gönder', roles: ['content_editor', 'admin'], fromStatuses: ['draft', 'rejected'] },
  approve: { icon: CheckCircle, label: 'Onayla', roles: ['subject_expert', 'admin'], fromStatuses: ['in_review'] },
  reject: { icon: XCircle, label: 'Reddet', roles: ['subject_expert', 'admin'], fromStatuses: ['in_review'] },
  publish: { icon: Upload, label: 'Yayınla', roles: ['admin'], fromStatuses: ['approved'] },
  archive: { icon: Archive, label: 'Arşivle', roles: ['admin'], fromStatuses: ['published', 'approved'] }
}

export default function AdminKOReview() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

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
      checks.push({ label: 'En az bir kaynak', ok: ko.sources?.length > 0 })
      checks.push({ label: 'Doğrulama durumu uygun', ok: ko.verificationStatus === 'verified' })
      checks.push({ label: 'KO kodu dolu', ok: !!ko.code })
      checks.push({ label: 'KO versiyonu dolu', ok: !!ko.currentVersionId })
      if (ko.reviewGate === 'requires_professional_approval') {
        checks.push({ label: 'Uzman onayı alınmış', ok: ko.verificationStatus === 'verified' })
      }
      if (ko.reviewGate === 'requires_current_official_source_and_legal_approval') {
        checks.push({ label: 'Resmi kaynak bağlantısı mevcut', ok: ko.sources?.some(s => s.source?.authorityLevel === 'official') })
        checks.push({ label: 'Yasal onay alınmış', ok: false })
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
      toast.success('Quiz taslağı üretildi; yayınlanmadan önce inceleyin.')
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
      toast.success('Quiz yayımlandı.')
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
      if (!fn) throw new Error('Geçersiz işlem')
      await fn(code, note || undefined)
      toast.success(
        action === 'submitReview' ? 'İncelemeye gönderildi' :
        action === 'approve' ? 'KO onaylandı' :
        action === 'reject' ? 'KO reddedildi' :
        action === 'publish' ? 'KO yayınlandı' :
        action === 'archive' ? 'KO arşivlendi' : 'İşlem başarılı'
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
    return Object.entries(ACTION_CONFIG).filter(([key, cfg]) => {
      if (!cfg.roles.includes(role) && role !== 'admin') return false
      if (role !== 'admin' && !cfg.roles.includes(role)) return false
      if (!cfg.fromStatuses.includes(ko.status)) return false
      return true
    }).map(([key, cfg]) => ({ key, ...cfg }))
  }

  function formatDate(d) {
    if (!d) return '-'
    return new Date(d).toLocaleString('tr-TR')
  }

  function getReviewGateLabel(gate) {
    const labels = {
      standard: 'Standart',
      requires_professional_approval: 'Uzman Onayı Gerekli',
      requires_current_official_source_and_legal_approval: 'Resmi Kaynak + Yasal Onay'
    }
    return labels[gate] || gate
  }

  if (loading) return <Loading text="KO yükleniyor..." />
  if (error && !ko) return <div className="alert alert-danger">{error}</div>

  const availableActions = getAvailableActions()
  const statusInfo = STATUS_MAP[ko?.status] || STATUS_MAP.draft
  const userRole = user?.role

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/knowledge')}>
          <ArrowLeft size={16} /> Listeye Dön
        </Button>
        {userRole === 'admin' && ko?.status === 'published' && (
          <Button size="sm" variant="secondary" onClick={generateQuiz} disabled={quizLoading}>
            <ClipboardCheck size={15} /> {quizLoading ? 'Üretiliyor…' : 'AI Quiz Taslağı'}
          </Button>
        )}
        {(userRole === 'content_editor' || userRole === 'admin') && (ko?.status === 'draft' || ko?.status === 'rejected') && (
          <Button size="sm" onClick={() => navigate(`/admin/knowledge/${code}/edit`)}>
            <Edit3 size={15} /> Düzenle
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
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>

        <div className={styles.metaGrid}>
          <div><small>Tür</small><b>{ko?.type}</b></div>
          <div><small>Seviye</small><b>{ko?.level || 'beginner'}</b></div>
          <div><small>Kategori</small><b>{ko?.category || '-'}</b></div>
          <div><small>Doğrulama</small>
            <Badge variant={ko?.verificationStatus === 'verified' ? 'success' : 'warning'}>
              {ko?.verificationStatus === 'verified' ? 'Doğrulandı' : ko?.verificationStatus || 'Beklemede'}
            </Badge>
          </div>
          <div><small>İnceleme Kapısı</small><b>{getReviewGateLabel(ko?.reviewGate)}</b></div>
          <div><small>Güncellenme</small><b>{formatDate(ko?.updatedAt)}</b></div>
        </div>
      </div>

      {/* Content */}
      <div className="panel">
        <h3>İçerik</h3>
        <div className={styles.content}>
          {ko?.content}
        </div>
      </div>

      {/* Publish Checks */}
      {activeAction === 'publish' && publishChecks && (
        <div className="panel">
          <h3>Yayın Öncesi Kontroller</h3>
          <div className={styles.checks}>
            {publishChecks.map((c, i) => (
              <div key={i} className={`${styles.checkItem} ${c.ok ? styles.checkOk : styles.checkFail}`}>
                <span>{c.ok ? '✓' : '✗'}</span>
                <span>{c.label}</span>
                {!c.ok && <small className={styles.checkHint}>Backend tarafından kontrol edilecek</small>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Actions */}
      {availableActions.length > 0 && (
        <div className={styles.actions}>
          <h3>İşlemler</h3>
          <div className={styles.actionButtons}>
            {availableActions.map(action => {
              const Icon = action.icon
              const confirmCfg = WORKFLOW_CONFIRM[action.key]
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
          <h3>Yayın Geçmişi</h3>
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
          <h3>İnceleme Kayıtları</h3>
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
        {showHistory ? 'Geçmişi Gizle' : 'Geçmişi Göster'}
      </Button>

      {/* Modals */}
      <Modal
        open={!!generatedQuiz}
        onClose={() => setGeneratedQuiz(null)}
        title="AI Quiz Taslağını İncele"
        size="lg"
      >
        {generatedQuiz && (
          <div>
            <p><strong>{generatedQuiz.title}</strong> · Geçme puanı: %{generatedQuiz.passScore}</p>
            <p>Bu içerik henüz öğrencilere görünmez. Her soruyu, doğru cevabı ve açıklamayı kontrol edin.</p>
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
              <Button variant="ghost" onClick={() => setGeneratedQuiz(null)}>Taslak olarak bırak</Button>
              <Button variant="success" onClick={publishGeneratedQuiz} disabled={quizLoading}>
                İnceledim, yayınla
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!activeAction && activeAction !== 'publish'}
        onClose={() => { setActiveAction(null); setPublishChecks(null) }}
        onConfirm={(note) => executeWorkflow(activeAction, note)}
        title={WORKFLOW_CONFIRM[activeAction]?.title || ''}
        description={WORKFLOW_CONFIRM[activeAction]?.desc || ''}
        confirmLabel={WORKFLOW_CONFIRM[activeAction]?.confirmLabel || 'Onayla'}
        variant={WORKFLOW_CONFIRM[activeAction]?.variant || 'primary'}
        requireNote={WORKFLOW_CONFIRM[activeAction]?.requireNote}
        noteLabel={WORKFLOW_CONFIRM[activeAction]?.noteLabel}
        loading={actionLoading}
      />

      {/* Publish confirmation modal */}
      <ConfirmModal
        open={activeAction === 'publish'}
        onClose={() => { setActiveAction(null); setPublishChecks(null) }}
        onConfirm={(note) => executeWorkflow('publish', note)}
        title={WORKFLOW_CONFIRM.publish.title}
        description={`Yayın öncesi kontroller yapıldı. ${publishChecks?.filter(c => !c.ok).length > 0 ? 'Bazı kontroller başarısız.' : 'Tüm kontroller başarılı.'} Devam etmek istiyor musunuz?`}
        confirmLabel="Yayınla"
        variant="success"
        loading={actionLoading}
      />
    </div>
  )
}
