import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Select, Button, Badge, Loading, DataTable } from '@/components/ui'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { Upload, FileJson, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight, Clock, Archive } from 'lucide-react'
import styles from './AdminImports.module.css'
import { getFormatLocale } from '@/utils/formatters'

const MAX_FILE_SIZE = import.meta.env.VITE_IMPORT_MAX_SIZE 
  ? parseInt(import.meta.env.VITE_IMPORT_MAX_SIZE) 
  : 5 * 1024 * 1024

export default function AdminImports() {
  const { t } = useTranslation('admin')
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
      setError(t('imports.errors.jsonOnly'))
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      const mb = Math.round(MAX_FILE_SIZE / (1024 * 1024))
      setError(t('imports.errors.fileTooLarge', { mb }))
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
        setError(t('imports.errors.invalidJson'))
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
      toast.success(t('imports.toasts.commitSuccess'))
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
    { key: 'code', label: t('imports.table.koCode'), width: '130px', render: row => <code className={styles.smallCode}>{row.code || '-'}</code> },
    { key: 'title', label: t('imports.table.title'), render: row => <span className={styles.issueTitle}>{row.title || '-'}</span> },
    { key: 'field', label: t('imports.table.field'), width: '100px', render: row => row.field ? <Badge>{row.field}</Badge> : '-' },
    { key: 'severity', label: t('imports.table.severity'), width: '90px', render: row => (
      <Badge variant={row.severity === 'error' ? 'danger' : 'warning'}>
        {row.severity === 'error' ? t('imports.severity.error') : t('imports.severity.warning')}
      </Badge>
    )},
    { key: 'message', label: t('imports.table.message'), render: row => (
      <div className={styles.issueMessage}>
        <span>{row.message}</span>
        {row.errorCode && <small className={styles.errorCode}>{t('imports.table.code')}: {row.errorCode}</small>}
      </div>
    )}
  ]

  const jobColumns = [
    { key: 'id', label: 'Job ID', width: '80px', render: row => <code className={styles.smallCode}>#{row.id}</code> },
    { key: 'status', label: t('imports.table.status'), width: '90px', render: row => (
      <Badge variant={row.status === 'completed' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'}>
        {row.status === 'completed' ? t('imports.status.completed') : row.status === 'failed' ? t('imports.status.failed') : t('imports.status.processing')}
      </Badge>
    )},
    { key: 'summary', label: t('imports.table.summary'), render: row => (
      <div className={styles.jobSummary}>
        <span>+{row.createdCount ?? 0} {t('imports.summary.new')}</span>
        <span>~{row.versionedCount ?? 0} {t('imports.summary.update')}</span>
        <span>⚠{row.errorCount ?? 0} {t('imports.summary.error')}</span>
      </div>
    )},
    { key: 'createdAt', label: t('imports.table.date'), width: '140px', render: row => {
      const d = row.createdAt || row.startedAt || row.completedAt
      return d ? new Date(d).toLocaleString(getFormatLocale()) : '-'
    }}
  ]

  const hasExistingFile = file && fileContent

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>{t('imports.heading')}</h2>
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
        aria-label={t('imports.upload.aria')}
      >
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
        {hasExistingFile ? (
          <div className={styles.fileInfo}>
            <FileJson size={24} />
            <div>
              <div className={styles.fileName}>{file.name}</div>
              <div className={styles.fileMeta}>
                {(file.size / 1024).toFixed(1)} KB — 
                {previewResult ? t('imports.file.previewDone') : t('imports.file.previewPending')}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); setFileContent(null); setPreviewResult(null); setCommitResult(null) }}>
              {t('imports.file.change')}
            </Button>
          </div>
        ) : (
          <div className={styles.dropContent}>
            <Upload size={32} />
            <p>{t('imports.upload.dropText')}</p>
            <small>.json — {t('imports.upload.maxSize')} {Math.round(MAX_FILE_SIZE / (1024 * 1024))} MB</small>
          </div>
        )}
      </div>

      {/* Preview Button */}
      {hasExistingFile && !previewResult && !commitResult && (
        <Button onClick={handlePreview} disabled={previewing} full>
          {previewing ? t('imports.preview.loading') : t('imports.preview.button')}
        </Button>
      )}

      {/* Preview Result */}
      {previewResult && !commitResult && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <small>{t('imports.stats.totalKo')}</small>
              <b>{summary.total ?? summary.totalCount ?? 0}</b>
            </div>
            <div className={`${styles.statCard} ${styles.statOk}`}>
              <small>{t('imports.stats.valid')}</small>
              <b>{summary.valid ?? summary.validCount ?? 0}</b>
            </div>
            <div className={`${styles.statCard} ${styles.statBad}`}>
              <small>{t('imports.stats.error')}</small>
              <b>{errors.length > 0 ? errors.length : (summary.errors ?? 0)}</b>
            </div>
            <div className={`${styles.statCard} ${styles.statWarn}`}>
              <small>{t('imports.stats.warning')}</small>
              <b>{warnings.length > 0 ? warnings.length : (summary.warnings ?? 0)}</b>
            </div>
            <div className={styles.statCard}>
              <small>{t('imports.stats.newKo')}</small>
              <b>{summary.newCount ?? summary.created ?? 0}</b>
            </div>
            <div className={styles.statCard}>
              <small>{t('imports.stats.duplicate')}</small>
              <b>{summary.duplicateCount ?? summary.duplicates ?? 0}</b>
            </div>
            <div className={styles.statCard}>
              <small>{t('imports.stats.newVersion')}</small>
              <b>{summary.versionCount ?? summary.versions ?? 0}</b>
            </div>
            <div className={styles.statCard}>
              <small>{t('imports.stats.sourceError')}</small>
              <b>{summary.sourceErrorCount ?? summary.sourceErrors ?? 0}</b>
            </div>
          </div>

          {/* Errors / Warnings */}
          {allIssues.length > 0 && (
            <div className="panel" style={{ padding: 0 }}>
              <div className={styles.issueFilters}>
                <Select
                  aria-label={t('imports.filters.severityAria')}
                  options={[
                    { value: '', label: t('imports.severity.all') },
                    { value: 'error', label: t('imports.severity.error') },
                    { value: 'warning', label: t('imports.severity.warning') }
                  ]}
                  value={errorFilters.severity}
                  onChange={v => setErrorFilters(f => ({ ...f, severity: v }))}
                />
                <input placeholder={t('imports.filters.fieldPlaceholder')} value={errorFilters.field} onChange={e => setErrorFilters(f => ({ ...f, field: e.target.value }))} />
                <input placeholder={t('imports.filters.codePlaceholder')} value={errorFilters.code} onChange={e => setErrorFilters(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div className={styles.issuesDesktop}>
                <DataTable
                  columns={issueColumns}
                  data={filteredIssues}
                  emptyMessage={t('imports.table.emptyIssues')}
                  keyField="index"
                />
              </div>
              <div className={styles.issuesMobile}>
                {filteredIssues.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-light)' }}>{t('imports.table.noRecords')}</div>
                ) : (
                  filteredIssues.map((issue, i) => (
                    <div key={i} className={styles.mobileIssueCard}>
                      <div className={styles.mobileIssueHead} onClick={() => setExpandedErrors(p => ({ ...p, [i]: !p[i] }))}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Badge variant={issue.severity === 'error' ? 'danger' : 'warning'}>
                            {issue.severity === 'error' ? t('imports.severity.error') : t('imports.severity.warning')}
                          </Badge>
                          <span className={styles.issueTitle}>{issue.title || issue.code || `#${issue.index}`}</span>
                        </div>
                        {expandedErrors[i] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      {expandedErrors[i] && (
                        <div className={styles.mobileIssueBody}>
                          <div><small>{t('imports.table.koCode')}:</small> {issue.code || '-'}</div>
                          <div><small>{t('imports.table.field')}:</small> {issue.field || '-'}</div>
                          <div><small>{t('imports.table.message')}:</small> {issue.message}</div>
                          {issue.errorCode && <div><small>{t('imports.table.errorCode')}:</small> {issue.errorCode}</div>}
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
                <AlertTriangle size={16} /> {t('imports.commit.errorsBlock')}
              </div>
            )}
            {hasWarnings && !hasErrors && (
              <div className="alert alert-warning">
                <AlertTriangle size={16} /> {t('imports.commit.warningsAllowed')}
              </div>
            )}
            {canCommit && (
              <Button onClick={() => setShowCommitConfirm(true)} disabled={committing} variant="success" full>
                {committing ? t('imports.commit.loading') : t('imports.commit.button')}
              </Button>
            )}
            {isEditor && !isAdmin && (
              <div className="alert alert-info">
                {t('imports.commit.adminRequired')}
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
            <h3>{t('imports.result.heading')}</h3>
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <small>Job ID</small>
              <b><code>#{commitResult.id || commitResult.importJob?.id}</code></b>
            </div>
            <div className={styles.statCard}>
              <small>{t('imports.result.created')}</small>
              <b>{commitResult.createdCount ?? commitResult.created ?? 0}</b>
            </div>
            <div className={styles.statCard}>
              <small>{t('imports.result.updated')}</small>
              <b>{commitResult.versionedCount ?? commitResult.updated ?? 0}</b>
            </div>
            <div className={styles.statCard}>
              <small>{t('imports.result.skipped')}</small>
              <b>{commitResult.skippedCount ?? commitResult.skipped ?? 0}</b>
            </div>
            {commitResult.duration && (
              <div className={styles.statCard}>
                <small>{t('imports.result.duration')}</small>
                <b>{(commitResult.duration / 1000).toFixed(1)}s</b>
              </div>
            )}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <Button onClick={() => { setFile(null); setFileContent(null); setPreviewResult(null); setCommitResult(null) }}>
              {t('imports.result.newImport')}
            </Button>
            <Button variant="ghost" onClick={() => loadJobs()}>
              <Clock size={16} /> {t('imports.result.refreshHistory')}
            </Button>
          </div>
        </div>
      )}

      {/* Import Jobs History */}
      <div className="panel">
        <div className={styles.sectionHeader}>
          <h3>{t('imports.history.heading')}</h3>
          <Button variant="ghost" size="sm" onClick={loadJobs}><Clock size={14} /> {t('imports.history.refresh')}</Button>
        </div>
        {jobsLoading ? (
          <Loading text={t('imports.history.loading')} />
        ) : importJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>
            <Archive size={24} />
            <p style={{ marginTop: 8 }}>{t('imports.history.empty')}</p>
          </div>
        ) : (
          <DataTable
            columns={jobColumns}
            data={importJobs}
            loading={false}
            emptyMessage={t('imports.history.noRecords')}
            keyField="id"
          />
        )}
      </div>

      {/* Commit Confirm Modal */}
      <ConfirmModal
        open={showCommitConfirm}
        onClose={() => setShowCommitConfirm(false)}
        onConfirm={handleCommit}
        title={t('imports.confirm.title')}
        description={
          `${t('imports.confirm.fileLabel')}: ${file?.name || '-'}\n` +
          `${t('imports.confirm.totalKo')}: ${summary.total ?? 0}\n` +
          `${t('imports.confirm.newLabel')}: ${summary.newCount ?? 0}\n` +
          `${t('imports.confirm.updateLabel')}: ${summary.versionCount ?? 0}\n` +
          `${t('imports.confirm.warningLabel')}: ${warnings.length}\n\n` +
          t('imports.confirm.description')
        }
        confirmLabel={t('imports.confirm.button')}
        variant="success"
        loading={committing}
      />
    </div>
  )
}
