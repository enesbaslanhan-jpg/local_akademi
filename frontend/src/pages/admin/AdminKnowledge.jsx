import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Select, Button, Badge, DataTable } from '@/components/ui'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { Plus, Eye, Edit3, CheckCircle, XCircle, Send, Upload, Archive } from 'lucide-react'
import styles from './AdminKnowledge.module.css'
import { getFormatLocale } from '@/utils/formatters'

const STATUS_KEYS = ['draft', 'in_review', 'approved', 'published', 'archived', 'rejected']
const STATUS_VARIANTS = { draft: 'default', in_review: 'warning', approved: 'info', published: 'success', archived: 'danger', rejected: 'danger' }

const TYPE_KEYS = ['', 'concept', 'fact', 'procedure', 'principle']
const LEVEL_KEYS = ['', 'beginner', 'intermediate', 'advanced']

const WORKFLOW_ACTIONS = ['submitReview', 'approve', 'reject', 'publish', 'archive']
const WORKFLOW_VARIANTS = { submitReview: 'primary', approve: 'success', reject: 'danger', publish: 'success', archive: 'warning' }
const WORKFLOW_REQUIRE_NOTE = { reject: true }

export default function AdminKnowledge() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const isEditor = user?.role === 'content_editor' || user?.role === 'admin'

  const statusLabel = (status) => t(`knowledge.status.${status}`)
  const typeLabel = (type) => type ? t(`knowledge.type.${type}`) : t('knowledge.type.all')
  const levelLabel = (level) => level ? t(`knowledge.level.${level}`) : t('knowledge.level.all')

  const typeOptions = TYPE_KEYS.map(k => ({ value: k, label: typeLabel(k) }))
  const statusOptions = STATUS_KEYS.map(k => ({ value: k, label: statusLabel(k) }))
  const levelOptions = LEVEL_KEYS.map(k => ({ value: k, label: levelLabel(k) }))

  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const [filters, setFilters] = useState({
    search: '', type: '', status: '', level: '', category: ''
  })

  const [activeAction, setActiveAction] = useState(null)
  const [activeCode, setActiveCode] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const params = { page, pageSize }
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const data = await api.knowledgeV2.adminList(params)
      setObjects(data.knowledgeObjects || data.results || [])
      setTotal(data.total || data.count || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters])

  useEffect(() => { loadData() }, [loadData])

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  function openConfirm(action, code) {
    setActiveAction(action)
    setActiveCode(code)
  }

  async function executeWorkflow(action, note) {
    if (!activeCode) return
    setActionLoading(true)
    try {
      setError('')
      const fn = api.knowledgeV2[action]
      if (!fn) throw new Error(t('knowledge.errors.invalidAction'))
      await fn(activeCode, note || undefined)
      toast.success(
        action === 'submitReview' ? t('knowledge.toasts.submitted') :
        action === 'approve' ? t('knowledge.toasts.approved') :
        action === 'reject' ? t('knowledge.toasts.rejected') :
        action === 'publish' ? t('knowledge.toasts.published') :
        action === 'archive' ? t('knowledge.toasts.archived') : t('knowledge.toasts.success')
      )
      setActiveAction(null)
      setActiveCode(null)
      await loadData()
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const role = user?.role

  function canShowAction(action, obj) {
    if (role === 'admin') return true
    if (action === 'submitReview' && role === 'content_editor') return obj.status === 'draft' || obj.status === 'rejected'
    if (action === 'approve' && role === 'subject_expert') return obj.status === 'in_review'
    if (action === 'reject' && role === 'subject_expert') return obj.status === 'in_review'
    return false
  }

  function formatDate(d) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString(getFormatLocale())
  }

  const columns = [
    { key: 'code', label: t('knowledge.table.code'), width: '120px', render: row => <code className={styles.code}>{row.code || row.id}</code> },
    { key: 'title', label: t('knowledge.table.title'), render: row => (
      <div>
        <div className={styles.title}>{row.title}</div>
        <div className={styles.meta}>{row.type}</div>
      </div>
    )},
    { key: 'level', label: t('knowledge.table.level'), width: '90px', render: row => <Badge>{row.level || 'beginner'}</Badge> },
    { key: 'status', label: t('knowledge.table.status'), width: '110px', render: row => {
      return <Badge variant={STATUS_VARIANTS[row.status] || STATUS_VARIANTS.draft}>{statusLabel(row.status)}</Badge>
    }},
    { key: 'verificationStatus', label: t('knowledge.table.verification'), width: '100px', render: row => (
      <Badge variant={row.verificationStatus === 'verified' ? 'success' : 'warning'}>
        {row.verificationStatus === 'verified' ? t('knowledge.verification.verified') : t('knowledge.verification.pending')}
      </Badge>
    )},
    { key: 'updatedAt', label: t('knowledge.table.updated'), width: '100px', render: row => formatDate(row.updatedAt) },
    { key: 'actions', label: t('knowledge.table.actions'), width: '200px', render: row => (
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={() => navigate(`/admin/knowledge/${row.code || row.id}`)} aria-label={t('knowledge.actions.detail')} title={t('knowledge.actions.detail')}>
          <Eye size={15} />
        </button>
        {(role === 'admin' || role === 'content_editor') && (row.status === 'draft' || row.status === 'rejected') && (
          <button className={styles.actionBtn} onClick={() => navigate(`/admin/knowledge/${row.code || row.id}/edit`)} aria-label={t('knowledge.actions.edit')} title={t('knowledge.actions.edit')}>
            <Edit3 size={15} />
          </button>
        )}
        {canShowAction('submitReview', row) && (
          <button className={styles.actionBtn} onClick={() => openConfirm('submitReview', row.code)}
            disabled={actionLoading} aria-label={t('knowledge.actions.submitReview')} title={t('knowledge.actions.submitReview')}>
            <Send size={15} />
          </button>
        )}
        {canShowAction('approve', row) && (
          <button className={`${styles.actionBtn} ${styles.approve}`} onClick={() => openConfirm('approve', row.code)}
            disabled={actionLoading} aria-label={t('knowledge.actions.approve')} title={t('knowledge.actions.approve')}>
            <CheckCircle size={15} />
          </button>
        )}
        {canShowAction('reject', row) && (
          <button className={`${styles.actionBtn} ${styles.reject}`} onClick={() => openConfirm('reject', row.code)}
            disabled={actionLoading} aria-label={t('knowledge.actions.reject')} title={t('knowledge.actions.reject')}>
            <XCircle size={15} />
          </button>
        )}
        {role === 'admin' && row.status === 'approved' && (
          <button className={`${styles.actionBtn} ${styles.publish}`} onClick={() => openConfirm('publish', row.code)}
            disabled={actionLoading} aria-label={t('knowledge.actions.publish')} title={t('knowledge.actions.publish')}>
            <Upload size={15} />
          </button>
        )}
        {role === 'admin' && (row.status === 'published' || row.status === 'approved') && (
          <button className={`${styles.actionBtn} ${styles.archiveBtn}`} onClick={() => openConfirm('archive', row.code)}
            disabled={actionLoading} aria-label={t('knowledge.actions.archive')} title={t('knowledge.actions.archive')}>
            <Archive size={15} />
          </button>
        )}
      </div>
    )}
  ]

  const confirmCfg = activeAction ? {
    title: t(`knowledge.workflow.${activeAction}.title`),
    desc: t(`knowledge.workflow.${activeAction}.desc`),
    confirmLabel: t(`knowledge.workflow.${activeAction}.confirmLabel`),
    variant: WORKFLOW_VARIANTS[activeAction] || 'primary',
    requireNote: WORKFLOW_REQUIRE_NOTE[activeAction],
    noteLabel: WORKFLOW_REQUIRE_NOTE[activeAction] ? t(`knowledge.workflow.${activeAction}.noteLabel`) : undefined
  } : null
  const filteredObjects = objects

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {/* Toplam sayı başlıkta: liste güncelleme tarihine göre sıralı olduğu
            için ilk sayfa çoğunlukla yayındaki kayıtlardan oluşuyor ve
            arşivdekilerin varlığı hiç görünmüyordu. Filtre seçiliyken de
            kaç kayıt olduğu buradan okunur. */}
        <h2>{t('knowledge.heading')} {total > 0 && <span className={styles.totalBadge}>{total.toLocaleString(getFormatLocale())} {t('knowledge.recordCount')}</span>}</h2>
        {isEditor && (
          <Button onClick={() => navigate('/admin/knowledge/new')}>
            <Plus size={16} /> {t('knowledge.newKo')}
          </Button>
        )}
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className={styles.filters}>
        <input className={styles.filterInput} placeholder={t('knowledge.searchPlaceholder')} value={filters.search}
          onChange={e => handleFilterChange('search', e.target.value)} />
        <Select className={styles.filterSelect} aria-label={t('knowledge.filters.type')} options={typeOptions} value={filters.type} onChange={v => handleFilterChange('type', v)} />
        <Select className={styles.filterSelect} aria-label={t('knowledge.filters.status')} options={statusOptions} value={filters.status} onChange={v => handleFilterChange('status', v)} />
        <Select className={styles.filterSelect} aria-label={t('knowledge.filters.level')} options={levelOptions} value={filters.level} onChange={v => handleFilterChange('level', v)} />
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <DataTable
          columns={columns}
          data={filteredObjects}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          emptyMessage={t('knowledge.emptyMessage')}
          keyField="code"
        />
      </div>

      <ConfirmModal
        open={!!activeAction}
        onClose={() => { setActiveAction(null); setActiveCode(null) }}
        onConfirm={(note) => executeWorkflow(activeAction, note)}
        title={confirmCfg?.title || ''}
        description={confirmCfg?.desc || ''}
        confirmLabel={confirmCfg?.confirmLabel || t('knowledge.actions.approve')}
        variant={confirmCfg?.variant || 'primary'}
        requireNote={confirmCfg?.requireNote}
        noteLabel={confirmCfg?.noteLabel}
        loading={actionLoading}
      />
    </div>
  )
}
