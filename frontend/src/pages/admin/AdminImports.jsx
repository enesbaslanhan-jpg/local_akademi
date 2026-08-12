import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Select, Button, Badge, Loading, DataTable } from '@/components/ui'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { Upload, FileJson, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight, Clock, Archive } from 'lucide-react'
import styles from './AdminImports.module.css'

const MAX_FILE_SIZE = import.meta.env.VITE_IMPORT_MAX_SIZE 
  ? parseInt(import.meta.env.VITE_IMPORT_MAX_SIZE) 
  : 5 * 1024 * 1024

const SEVERITY_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'error', label: 'Hata' },
  { value: 'warning', label: 'Uyarı' }
]

export default function AdminImports() {
  const { user } = useAuth()
  const toast = useToast()
  const fileInputRef = useRef(null)
  const isAdmin = user?.role === 'admin'
  const isEditor = user?.role === 'content_editor' || isAdmin

  const [file, setFile] = useState(null)
  const [fileContent, setFileContent] = useState(null)
  const [fileHash, setFileHash] = useState(null)
  const [previewResult, setPreviewResult] = useState(null)
  const [commitResult, setCommitResult] = useState(null)
  const [importJobs, setImportJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)

  const [previewing, setPreviewing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const [errorFilters, setErrorFilters] = useState({ severity: '', field: '', code: '' })
  const [expandedErrors, setExpandedErrors] = useState({})
  const [showCommitConfirm, setShowCommitConfirm] = useState(false)

  const loadJobs = useCallback(async () => {
    try {
      const data = await api.knowledgeV2.listImportJobs()
      setImportJobs(data.importJobs || data.jobs || data.results || [])
    } catch {} finally {
      setJobsLoading(false)
    }
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  async function computeHash(text) {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  function handleFileSelect(selectedFile) {
    setError('')
    setPreviewResult(null)
    setCommitResult(null)
    setFileHash(null)
    setFileContent(null)

    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.json')) {
      setError('Yalnızca .json dosyaları kabul edilir')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      const mb = Math.round(MAX_FILE_SIZE / (1024 * 1024))
      setError(`Dosya boyutu çok büyük. Maksimum ${mb} MB`)
      return
    }

    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target.result
      setFileContent(text)
      const hash = await computeHash(text)
      setFileHash(hash)
    }
    reader.readAsText(selectedFile)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  async function handlePreview() {
    if (!fileContent) return
    setPreviewing(true)
    setError('')
    try {
      const parsed = JSON.parse(fileContent)
      const data = await api.knowledgeV2.importPreview(parsed)
      setPreviewResult(data)
    } catch (err) {
      if (err.message?.includes('Unexpected token')) {
        setError('Geçersiz JSON formatı')
      } else {
        setError(err.message)
        setPreviewResult(err.data || null)
      }
    } finally {
      setPreviewing(false)
    }
  }

  async function handleCommit() {
    if (!fileContent || !fileHash) return
    setCommitting(true)
    setError('')
    try {
      const parsed = JSON.parse(fileContent)
      const payload = { ...parsed, checksum: fileHash }
      const data = await api.knowledgeV2.importCommit(payload)
      setCommitResult(data)
      setShowCommitConfirm(false)
      toast.success('Import başarıyla tamamlandı')
      await loadJobs()
    } catch (err) {
      setError(err.message)
    } finally {
      setCommitting(false)
    }
  }

  function handleFileChange() {
    if (fileInputRef.current?.files[0]) {
      handleFileSelect(fileInputRef.current.files[0])
    }
  }

  const summary = previewResult?.summary || previewResult || {}
  const errors = previewResult?.errors || []
  const warnings = previewResult?.warnings || []
  const allIssues = [...errors.map(e => ({ ...e, severity: e.severity || 'error' })), ...warnings.map(w => ({ ...w, severity: 'warning' }))]
  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0
  const canCommit = previewResult && !hasErrors && isAdmin

  const filteredIssues = allIssues.filter(issue => {
    if (errorFilters.severity && issue.severity !== errorFilters.severity) return false
    if (errorFilters.field && !(issue.field || '').toLowerCase().includes(errorFilters.field.toLowerCase())) return false
    if (errorFilters.code && !(issue.code || '').toLowerCase().includes(errorFilters.code.toLowerCase())) return false
    return true
  })

  const issueColumns = [
    { key: 'index', label: '#', width: '50px', render: row => row.index ?? '-' },
    { key: 'code', label: 'KO Kodu', width: '130px', render: row => <code className={styles.smallCode}>{row.code || '-'}</code> },
    { key: 'title', label: 'Başlık', render: row => <span className={styles.issueTitle}>{row.title || '-'}</span> },
    { key: 'field', label: 'Alan', width: '100px', render: row => row.field ? <Badge>{row.field}</Badge> : '-' },
    { key: 'severity', label: 'Seviye', width: '90px', render: row => (
      <Badge variant={row.severity === 'error' ? 'danger' : 'warning'}>
        {row.severity === 'error' ? 'Hata' : 'Uyarı'}
      </Badge>
    )},
    { key: 'message', label: 'Mesaj', render: row => (
      <div className={styles.issueMessage}>
        <span>{row.message}</span>
        {row.errorCode && <small className={styles.errorCode}>Kod: {row.errorCode}</small>}
      </div>
    )}
  ]

  const jobColumns = [
    { key: 'id', label: 'Job ID', width: '80px', render: row => <code className={styles.smallCode}>#{row.id}</code> },
    { key: 'status', label: 'Durum', width: '90px', render: row => (
      <Badge variant={row.status === 'completed' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'}>
        {row.status === 'completed' ? 'Tamam' : row.status === 'failed' ? 'Başarısız' : 'İşleniyor'}
      </Badge>
    )},
    { key: 'summary', label: 'Özet', render: row => (
      <div className={styles.jobSummary}>
        <span>+{row.createdCount ?? 0} yeni</span>
        <span>~{row.versionedCount ?? 0} güncelleme</span>
        <span>⚠{row.errorCount ?? 0} hata</span>
      </div>
    )},
    { key: 'createdAt', label: 'Tarih', width: '140px', render: row => {
      const d = row.createdAt || row.startedAt || row.completedAt
      return d ? new Date(d).toLocaleString('tr-TR') : '-'
    }}
  ]

  const hasExistingFile = file && fileContent

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>Toplu İçe Aktarma</h2>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      {/* File Upload */}
      <div
        className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''} ${hasExistingFile ? styles.hasFile : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !hasExistingFile && fileInputRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
        tabIndex={0}
        role="button"
        aria-label="JSON dosyası seçmek için tıklayın veya sürükleyin"
      >
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
        {hasExistingFile ? (
          <div className={styles.fileInfo}>
            <FileJson size={24} />
            <div>
              <div className={styles.fileName}>{file.name}</div>
              <div className={styles.fileMeta}>
                {(file.size / 1024).toFixed(1)} KB — 
                {previewResult ? 'Preview yapıldı' : 'Preview bekliyor'}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); setFileContent(null); setPreviewResult(null); setCommitResult(null) }}>
              Değiştir
            </Button>
          </div>
        ) : (
          <div className={styles.dropContent}>
            <Upload size={32} />
            <p>JSON dosyasını sürükleyin veya seçmek için tıklayın</p>
            <small>.json — Maksimum {Math.round(MAX_FILE_SIZE / (1024 * 1024))} MB</small>
          </div>
        )}
      </div>

      {/* Preview Button */}
      {hasExistingFile && !previewResult && !commitResult && (
        <Button onClick={handlePreview} disabled={previewing} full>
          {previewing ? 'Preview yapılıyor...' : 'Preview Yap'}
        </Button>
      )}

      {/* Preview Result */}
      {previewResult && !commitResult && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <small>Toplam KO</small>
              <b>{summary.total ?? summary.totalCount ?? 0}</b>
            </div>
            <div className={`${styles.statCard} ${styles.statOk}`}>
              <small>Geçerli</small>
              <b>{summary.valid ?? summary.validCount ?? 0}</b>
            </div>
            <div className={`${styles.statCard} ${styles.statBad}`}>
              <small>Hatalı</small>
              <b>{errors.length > 0 ? errors.length : (summary.errors ?? 0)}</b>
            </div>
            <div className={`${styles.statCard} ${styles.statWarn}`}>
              <small>Uyarı</small>
              <b>{warnings.length > 0 ? warnings.length : (summary.warnings ?? 0)}</b>
            </div>
            <div className={styles.statCard}>
              <small>Yeni KO</small>
              <b>{summary.newCount ?? summary.created ?? 0}</b>
            </div>
            <div className={styles.statCard}>
              <small>Duplicate</small>
              <b>{summary.duplicateCount ?? summary.duplicates ?? 0}</b>
            </div>
            <div className={styles.statCard}>
              <small>Yeni Versiyon</small>
              <b>{summary.versionCount ?? summary.versions ?? 0}</b>
            </div>
            <div className={styles.statCard}>
              <small>Kaynak Hatası</small>
              <b>{summary.sourceErrorCount ?? summary.sourceErrors ?? 0}</b>
            </div>
          </div>

          {/* Errors / Warnings */}
          {allIssues.length > 0 && (
            <div className="panel" style={{ padding: 0 }}>
              <div className={styles.issueFilters}>
                <Select
                  aria-label="Önem düzeyi filtresi"
                  options={SEVERITY_OPTIONS}
                  value={errorFilters.severity}
                  onChange={v => setErrorFilters(f => ({ ...f, severity: v }))}
                />
                <input placeholder="Alan ara..." value={errorFilters.field} onChange={e => setErrorFilters(f => ({ ...f, field: e.target.value }))} />
                <input placeholder="KO kodu ara..." value={errorFilters.code} onChange={e => setErrorFilters(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div className={styles.issuesDesktop}>
                <DataTable
                  columns={issueColumns}
                  data={filteredIssues}
                  emptyMessage="Filtreleme kriterine uygun kayıt yok"
                  keyField="index"
                />
              </div>
              <div className={styles.issuesMobile}>
                {filteredIssues.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>Kayıt yok</div>
                ) : (
                  filteredIssues.map((issue, i) => (
                    <div key={i} className={styles.mobileIssueCard}>
                      <div className={styles.mobileIssueHead} onClick={() => setExpandedErrors(p => ({ ...p, [i]: !p[i] }))}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Badge variant={issue.severity === 'error' ? 'danger' : 'warning'}>
                            {issue.severity === 'error' ? 'Hata' : 'Uyarı'}
                          </Badge>
                          <span className={styles.issueTitle}>{issue.title || issue.code || `#${issue.index}`}</span>
                        </div>
                        {expandedErrors[i] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      {expandedErrors[i] && (
                        <div className={styles.mobileIssueBody}>
                          <div><small>KO Kodu:</small> {issue.code || '-'}</div>
                          <div><small>Alan:</small> {issue.field || '-'}</div>
                          <div><small>Mesaj:</small> {issue.message}</div>
                          {issue.errorCode && <div><small>Hata Kodu:</small> {issue.errorCode}</div>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Commit area */}
          <div className={styles.commitArea}>
            {hasErrors && (
              <div className="alert alert-danger">
                <AlertTriangle size={16} /> Hatalar nedeniyle commit yapılamaz. Lütfen hataları düzeltin ve tekrar deneyin.
              </div>
            )}
            {hasWarnings && !hasErrors && (
              <div className="alert alert-warning">
                <AlertTriangle size={16} /> Uyarılar mevcut, ancak commit yapılabilir.
              </div>
            )}
            {canCommit && (
              <Button onClick={() => setShowCommitConfirm(true)} disabled={committing} variant="success" full>
                {committing ? 'İçe aktarılıyor...' : 'KO\'ları İçe Aktar'}
              </Button>
            )}
            {isEditor && !isAdmin && (
              <div className="alert alert-info">
                Commit işlemi için admin yetkisi gereklidir. Preview sonuçlarını inceleyebilirsiniz.
              </div>
            )}
          </div>
        </>
      )}

      {/* Commit Result */}
      {commitResult && (
        <div className="panel">
          <div className={styles.commitSuccess}>
            <CheckCircle size={32} />
            <h3>Import Başarılı</h3>
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <small>Job ID</small>
              <b><code>#{commitResult.id || commitResult.importJob?.id}</code></b>
            </div>
            <div className={styles.statCard}>
              <small>Oluşturulan</small>
              <b>{commitResult.createdCount ?? commitResult.created ?? 0}</b>
            </div>
            <div className={styles.statCard}>
              <small>Güncellenen</small>
              <b>{commitResult.versionedCount ?? commitResult.updated ?? 0}</b>
            </div>
            <div className={styles.statCard}>
              <small>Atlanan</small>
              <b>{commitResult.skippedCount ?? commitResult.skipped ?? 0}</b>
            </div>
            {commitResult.duration && (
              <div className={styles.statCard}>
                <small>Süre</small>
                <b>{(commitResult.duration / 1000).toFixed(1)}s</b>
              </div>
            )}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <Button onClick={() => { setFile(null); setFileContent(null); setPreviewResult(null); setCommitResult(null) }}>
              Yeni Import
            </Button>
            <Button variant="ghost" onClick={() => loadJobs()}>
              <Clock size={16} /> Geçmişi Güncelle
            </Button>
          </div>
        </div>
      )}

      {/* Import Jobs History */}
      <div className="panel">
        <div className={styles.sectionHeader}>
          <h3>Import Geçmişi</h3>
          <Button variant="ghost" size="sm" onClick={loadJobs}><Clock size={14} /> Yenile</Button>
        </div>
        {jobsLoading ? (
          <Loading text="Geçmiş yükleniyor..." />
        ) : importJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>
            <Archive size={24} />
            <p style={{ marginTop: 8 }}>Henüz import işlemi yapılmamış</p>
          </div>
        ) : (
          <DataTable
            columns={jobColumns}
            data={importJobs}
            loading={false}
            emptyMessage="Import kaydı yok"
            keyField="id"
          />
        )}
      </div>

      {/* Commit Confirm Modal */}
      <ConfirmModal
        open={showCommitConfirm}
        onClose={() => setShowCommitConfirm(false)}
        onConfirm={handleCommit}
        title="KO'ları İçe Aktar"
        description={
          `Dosya: ${file?.name || '-'}\n` +
          `Toplam KO: ${summary.total ?? 0}\n` +
          `Yeni: ${summary.newCount ?? 0}\n` +
          `Güncelleme: ${summary.versionCount ?? 0}\n` +
          `Uyarı: ${warnings.length}\n\n` +
          `Bu işlem atomic olarak gerçekleştirilecektir. Onaylıyor musunuz?`
        }
        confirmLabel="İçe Aktar"
        variant="success"
        loading={committing}
      />
    </div>
  )
}
