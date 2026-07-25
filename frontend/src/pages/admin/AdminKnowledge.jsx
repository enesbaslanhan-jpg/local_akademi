import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Button, Badge, DataTable } from '@/components/ui'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { Plus, Eye, Edit3, CheckCircle, XCircle, Send, Upload, Archive } from 'lucide-react'
import styles from './AdminKnowledge.module.css'

const STATUS_MAP = {
  draft: { label: 'Taslak', variant: 'default' },
  in_review: { label: 'İncelemede', variant: 'warning' },
  approved: { label: 'Onaylı', variant: 'info' },
  published: { label: 'Yayında', variant: 'success' },
  archived: { label: 'Arşiv', variant: 'danger' },
  rejected: { label: 'Red', variant: 'danger' }
}

const TYPE_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'concept', label: 'Kavram' },
  { value: 'fact', label: 'Gerçek' },
  { value: 'procedure', label: 'Prosedür' },
  { value: 'principle', label: 'İlke' }
]

const STATUS_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'draft', label: 'Taslak' },
  { value: 'in_review', label: 'İncelemede' },
  { value: 'approved', label: 'Onaylı' },
  { value: 'published', label: 'Yayında' },
  { value: 'archived', label: 'Arşiv' },
  { value: 'rejected', label: 'Red' }
]

const LEVEL_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'beginner', label: 'Başlangıç' },
  { value: 'intermediate', label: 'Orta' },
  { value: 'advanced', label: 'İleri' }
]

const WORKFLOW_CONFIRM = {
  submitReview: {
    title: 'İncelemeye Gönder',
    desc: 'Bu KO inceleme sürecine gönderilecek.',
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
    desc: 'Bu KO yayına alınacak.',
    confirmLabel: 'Yayınla',
    variant: 'success'
  },
  archive: {
    title: 'KO\'yu Arşivle',
    desc: 'Bu KO arşivlenecek.',
    confirmLabel: 'Arşivle',
    variant: 'warning'
  }
}

export default function AdminKnowledge() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const isEditor = user?.role === 'content_editor' || user?.role === 'admin'

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
      if (!fn) throw new Error('Geçersiz işlem')
      await fn(activeCode, note || undefined)
      toast.success(
        action === 'submitReview' ? 'İncelemeye gönderildi' :
        action === 'approve' ? 'KO onaylandı' :
        action === 'reject' ? 'KO reddedildi' :
        action === 'publish' ? 'KO yayınlandı' :
        action === 'archive' ? 'KO arşivlendi' : 'İşlem başarılı'
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
    return new Date(d).toLocaleDateString('tr-TR')
  }

  const columns = [
    { key: 'code', label: 'Kod', width: '120px', render: row => <code className={styles.code}>{row.code || row.id}</code> },
    { key: 'title', label: 'Başlık', render: row => (
      <div>
        <div className={styles.title}>{row.title}</div>
        <div className={styles.meta}>{row.type}</div>
      </div>
    )},
    { key: 'level', label: 'Seviye', width: '90px', render: row => <Badge>{row.level || 'beginner'}</Badge> },
    { key: 'status', label: 'Durum', width: '110px', render: row => {
      const s = STATUS_MAP[row.status] || STATUS_MAP.draft
      return <Badge variant={s.variant}>{s.label}</Badge>
    }},
    { key: 'verificationStatus', label: 'Doğrulama', width: '100px', render: row => (
      <Badge variant={row.verificationStatus === 'verified' ? 'success' : 'warning'}>
        {row.verificationStatus === 'verified' ? 'Doğrulandı' : 'Beklemede'}
      </Badge>
    )},
    { key: 'updatedAt', label: 'Güncelleme', width: '100px', render: row => formatDate(row.updatedAt) },
    { key: 'actions', label: 'İşlemler', width: '200px', render: row => (
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={() => navigate(`/admin/knowledge/${row.code || row.id}`)} aria-label="Detay" title="Detay">
          <Eye size={15} />
        </button>
        {(role === 'admin' || role === 'content_editor') && (row.status === 'draft' || row.status === 'rejected') && (
          <button className={styles.actionBtn} onClick={() => navigate(`/admin/knowledge/${row.code || row.id}/edit`)} aria-label="Düzenle" title="Düzenle">
            <Edit3 size={15} />
          </button>
        )}
        {canShowAction('submitReview', row) && (
          <button className={styles.actionBtn} onClick={() => openConfirm('submitReview', row.code)}
            disabled={actionLoading} aria-label="İncelemeye gönder" title="İncelemeye gönder">
            <Send size={15} />
          </button>
        )}
        {canShowAction('approve', row) && (
          <button className={`${styles.actionBtn} ${styles.approve}`} onClick={() => openConfirm('approve', row.code)}
            disabled={actionLoading} aria-label="Onayla" title="Onayla">
            <CheckCircle size={15} />
          </button>
        )}
        {canShowAction('reject', row) && (
          <button className={`${styles.actionBtn} ${styles.reject}`} onClick={() => openConfirm('reject', row.code)}
            disabled={actionLoading} aria-label="Reddet" title="Reddet">
            <XCircle size={15} />
          </button>
        )}
        {role === 'admin' && row.status === 'approved' && (
          <button className={`${styles.actionBtn} ${styles.publish}`} onClick={() => openConfirm('publish', row.code)}
            disabled={actionLoading} aria-label="Yayınla" title="Yayınla">
            <Upload size={15} />
          </button>
        )}
        {role === 'admin' && (row.status === 'published' || row.status === 'approved') && (
          <button className={`${styles.actionBtn} ${styles.archiveBtn}`} onClick={() => openConfirm('archive', row.code)}
            disabled={actionLoading} aria-label="Arşivle" title="Arşivle">
            <Archive size={15} />
          </button>
        )}
      </div>
    )}
  ]

  const confirmCfg = WORKFLOW_CONFIRM[activeAction]
  const filteredObjects = objects

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>KO Yönetimi</h2>
        {isEditor && (
          <Button onClick={() => navigate('/admin/knowledge/new')}>
            <Plus size={16} /> Yeni KO
          </Button>
        )}
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className={styles.filters}>
        <input className={styles.filterInput} placeholder="Ara..." value={filters.search}
          onChange={e => handleFilterChange('search', e.target.value)} />
        <select className={styles.filterSelect} value={filters.type} onChange={e => handleFilterChange('type', e.target.value)}>
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={styles.filterSelect} value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={styles.filterSelect} value={filters.level} onChange={e => handleFilterChange('level', e.target.value)}>
          {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
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
          emptyMessage="Bilgi nesnesi bulunamadı"
          keyField="code"
        />
      </div>

      <ConfirmModal
        open={!!activeAction}
        onClose={() => { setActiveAction(null); setActiveCode(null) }}
        onConfirm={(note) => executeWorkflow(activeAction, note)}
        title={confirmCfg?.title || ''}
        description={confirmCfg?.desc || ''}
        confirmLabel={confirmCfg?.confirmLabel || 'Onayla'}
        variant={confirmCfg?.variant || 'primary'}
        requireNote={confirmCfg?.requireNote}
        noteLabel={confirmCfg?.noteLabel}
        loading={actionLoading}
      />
    </div>
  )
}
