import { useCallback, useEffect, useState } from 'react'
import { X, FileSpreadsheet, Loader2, AlertCircle, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { useTranslation } from 'react-i18next'
import styles from './ImportDialog.module.css'

const REQUIRED_FIELDS = ['type', 'title', 'direction']
const OPTIONAL_FIELDS = ['description', 'amount', 'currency', 'priority', 'dueAt', 'contactId', 'assignedToId', 'recurrenceRule']

const IMPORT_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]

export default function ImportDialog({ workspaceId, onClose, onSuccess }) {
  const { t } = useTranslation('workspace')
  const toast = useToast()
  const fieldLabels = Object.fromEntries(IMPORT_FIELDS.map(field => [field, t(`import.field.${field === 'dueAt' ? 'dueDate' : field === 'contactId' ? 'contact' : field === 'assignedToId' ? 'responsible' : field === 'recurrenceRule' ? 'recurrence' : field}`)]))
  const fieldHelp = Object.fromEntries(IMPORT_FIELDS.map(field => [field, t(`import.help.${field === 'dueAt' ? 'dueDate' : field === 'contactId' ? 'contact' : field === 'assignedToId' ? 'responsible' : field === 'recurrenceRule' ? 'recurrence' : field}`)]))
  const [step, setStep] = useState(1) // 1: upload, 2: mapping, 3: preview, 4: importing
  const [file, setFile] = useState(null)
  const [fileId, setFileId] = useState(null)
  const [columns, setColumns] = useState([])
  const [mapping, setMapping] = useState({})
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState([])

  const handleFileChange = useCallback(async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx'].includes(ext)) {
      toast.error(t('import.unsupportedFormat'))
      return
    }

    setFile(selectedFile)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', selectedFile)
      const uploaded = await api.request('/documents/upload', { method: 'POST', body: form })
      setFileId(uploaded.id)
      setStep(2)
    } catch (error) {
      toast.error(error.message || t('import.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }, [toast])

  useEffect(() => {
    if (fileId && step === 2) {
      loadColumns()
    }
  }, [fileId, step])

  const loadColumns = async () => {
    setLoading(true)
    try {
      const doc = await api.workspace.documents.get(workspaceId, fileId)
      const ext = doc.originalName.split('.').pop()?.toLowerCase()
      let rows = []

      if (ext === 'csv') {
        rows = parseCsv(doc.extractedText)
      } else if (ext === 'xlsx') {
        // For xlsx, we need to get the file content differently
        // The extractedText might not have full data for xlsx
        rows = []
      }

      if (rows.length > 0) {
        const cols = Object.keys(rows[0])
        setColumns(cols)
        // Auto-map common fields
        const autoMap = {}
        const lowerCols = cols.map(c => c.toLowerCase())
        const fieldAliases = {
          type: ['type', 'tür', 'tur', 'kategori'],
          title: ['title', 'başlık', 'baslik', 'name', 'isim', 'konu'],
          description: ['description', 'açıklama', 'aciklama', 'detay', 'not'],
          direction: ['direction', 'yön', 'yon', 'tip'],
          amount: ['amount', 'tutar', 'miktar', 'price', 'fiyat'],
          currency: ['currency', 'para birimi', 'parabirimi', 'birim'],
          priority: ['priority', 'öncelik', 'oncelik'],
          dueAt: ['dueat', 'due_at', 'vade', 'son tarih', 'tarih', 'date'],
          contactId: ['contactid', 'contact_id', 'cari', 'müşteri', 'musteri', 'tedarikçi', 'tedarikci'],
          assignedToId: ['assignedtoid', 'assigned_to_id', 'sorumlu', 'assignee'],
          recurrenceRule: ['recurrencerule', 'recurrence_rule', 'tekrarlama', 'tekrar']
        }

        for (const [field, aliases] of Object.entries(fieldAliases)) {
          for (const alias of aliases) {
            const idx = lowerCols.indexOf(alias)
            if (idx !== -1) {
              autoMap[field] = cols[idx]
              break
            }
          }
        }
        setMapping(autoMap)
      }
    } catch (error) {
      toast.error(t('import.columnsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleMappingChange = (field, column) => {
    setMapping(prev => {
      const next = { ...prev }
      if (column) next[field] = column
      else delete next[field]
      return next
    })
  }

  const handlePreview = async () => {
    // Check required fields
    const missing = REQUIRED_FIELDS.filter(f => !mapping[f])
    if (missing.length > 0) {
      toast.error(t('import.requiredFieldsMissing', { fields: missing.map(field => fieldLabels[field]).join(', ') }))
      return
    }

    setLoading(true)
    try {
      const result = await api.workspace.tracker.import(workspaceId, {
        fileId,
        columnMapping: mapping,
        previewOnly: true
      })
      setPreview(result)
      setErrors(result.errors || [])
      setStep(3)
    } catch (error) {
      toast.error(error.message || t('import.previewFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    setStep(4)
    try {
      const result = await api.workspace.tracker.import(workspaceId, {
        fileId,
        columnMapping: mapping,
        previewOnly: false
      })
      toast.success(`${t('import.success', { count: result.imported })}${result.failed > 0 ? ` ${t('import.failures', { count: result.failed })}` : ''}`)
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(error.message || t('import.importFailed'))
      setStep(3)
    }
  }

  const getFieldInput = (field) => {
    const mappedColumn = mapping[field]
    if (!mappedColumn) return null

    switch (field) {
      case 'type':
        return (
          <select
            value={mappedColumn}
            onChange={e => handleMappingChange(field, e.target.value)}
            className={styles.select}
          >
            <option value="">{t('import.selectColumn')}</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        )
      case 'direction':
        return (
          <select
            value={mappedColumn}
            onChange={e => handleMappingChange(field, e.target.value)}
            className={styles.select}
          >
            <option value="">{t('import.selectColumn')}</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        )
      default:
        return (
          <select
            value={mappedColumn}
            onChange={e => handleMappingChange(field, e.target.value)}
            className={styles.select}
          >
            <option value="">{t('import.selectColumn')}</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        )
    }
  }

  const renderStep1 = () => (
    <div className={styles.step}>
      <div className={styles.stepIcon}>
        <FileSpreadsheet size={48} />
      </div>
      <h3>{t('import.step1Title')}</h3>
      <p className={styles.stepDesc}>
        {t('import.step1Desc')}
      </p>
      <input
        type="file"
        accept=".csv,.xlsx"
        onChange={handleFileChange}
        disabled={uploading}
        className={styles.fileInput}
      />
      {uploading && <p className={styles.loading}>{t('import.loading')} <Loader2 size={16} className={styles.spin} /></p>}
    </div>
  )

  const renderStep2 = () => (
    <div className={styles.step}>
      <div className={styles.stepIcon}>
        <FileSpreadsheet size={48} />
      </div>
      <h3>{t('import.step2Title')}</h3>
      <p className={styles.stepDesc}>
        {t('import.step2Desc')}
      </p>
      {loading ? (
        <p className={styles.loading}>{t('import.readingColumns')} <Loader2 size={16} className={styles.spin} /></p>
      ) : (
        <div className={styles.mappingGrid}>
          {REQUIRED_FIELDS.map(field => (
            <div key={field} className={styles.mappingRow}>
              <label className={styles.mappingLabel}>
                <span className={styles.required}>*</span> {fieldLabels[field]}
              </label>
              <div className={styles.mappingInput}>
                {getFieldInput(field)}
                <span className={styles.help}>{fieldHelp[field]}</span>
              </div>
            </div>
          ))}
          {OPTIONAL_FIELDS.map(field => (
            <div key={field} className={styles.mappingRow}>
              <label className={styles.mappingLabel}>{fieldLabels[field]}</label>
              <div className={styles.mappingInput}>
                {getFieldInput(field)}
                <span className={styles.help}>{fieldHelp[field]}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={styles.stepActions}>
        <button className={styles.secondary} onClick={() => setStep(1)}>
          <ChevronLeft size={16} /> {t('import.back')}
        </button>
        <button className={styles.primary} onClick={handlePreview} disabled={loading}>
          {loading ? t('import.loading') : t('import.preview')}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className={styles.step}>
      <div className={styles.stepIcon}>
        <FileSpreadsheet size={48} />
      </div>
      <h3>{t('import.step3Title')}</h3>
      <p className={styles.stepDesc}>
        {t('import.step3Desc', { validRows: preview?.validRows, errorCount: errors.length })}
      </p>

      {errors.length > 0 && (
        <div className={styles.errorSummary}>
          <AlertCircle size={16} />
          <span>{t('import.errorSummary', { count: errors.length })}</span>
        </div>
      )}

      {errors.length > 0 && (
        <details className={styles.errorDetails}>
          <summary>{t('import.showErrors')}</summary>
          <ul className={styles.errorList}>
            {errors.slice(0, 50).map((err, i) => (
              <li key={i} className={styles.errorItem}>
                <strong>{t('import.row', { row: err.row })}</strong> — <span className={styles.errorField}>{err.field}</span>: {err.message}
              </li>
            ))}
          </ul>
        </details>
      )}

      {preview?.sample && preview.sample.length > 0 && (
        <div className={styles.previewTable}>
          <table>
            <thead>
              <tr>
                <th>{t('import.col.row')}</th>
                {REQUIRED_FIELDS.map(f => <th key={f}>{fieldLabels[f]}</th>)}
                {OPTIONAL_FIELDS.filter(f => preview.sample[0]?.[f] !== undefined).map(f => <th key={f}>{fieldLabels[f]}</th>)}
              </tr>
            </thead>
            <tbody>
              {preview.sample.map((row, i) => (
                <tr key={i}>
                  <td>{row.row}</td>
                  {REQUIRED_FIELDS.map(f => <td key={f}>{row[f] ?? '—'}</td>)}
                  {OPTIONAL_FIELDS.filter(f => preview.sample[0]?.[f] !== undefined).map(f => <td key={f}>{row[f] ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.stepActions}>
        <button className={styles.secondary} onClick={() => setStep(2)}>
          <ChevronLeft size={16} /> {t('import.edit')}
        </button>
        <button className={styles.primary} onClick={handleImport} disabled={step === 4}>
          {step === 4 ? (
            <>{t('import.importing')} <Loader2 size={16} className={styles.spin} /></>
          ) : (
            <>{t('import.importButton')} <ChevronRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>{t('import.title')}</h2>
            <div className={styles.stepIndicator}>
              {[1, 2, 3].map(s => (
                <span key={s} className={`${styles.stepDot} ${step >= s ? styles.active : ''} ${step === s ? styles.current : ''}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className={styles.closeBtn} aria-label={t('common:buttons.close')}><X size={20} /></button>
        </header>
        <main className={styles.content}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </main>
      </div>
    </div>
  )
}

function parseCsv(text) {
  const lines = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === '\n' && !inQuotes) {
      lines.push(current)
      current = ''
    } else if (char === '\r' && !inQuotes) {
      // Skip \r
    } else {
      current += char
    }
  }
  if (current) lines.push(current)

  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = []
    let val = ''
    let inQ = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      const next = line[j + 1]

      if (char === '"') {
        if (inQ && next === '"') {
          val += '"'
          j++
        } else {
          inQ = !inQ
        }
      } else if (char === ',' && !inQ) {
        values.push(val.trim())
        val = ''
      } else {
        val += char
      }
    }
    values.push(val.trim())

    if (values.length !== headers.length) continue

    const row = {}
    for (let k = 0; k < headers.length; k++) {
      row[headers[k]] = values[k].replace(/^"|"$/g, '')
    }
    rows.push(row)
  }

  return rows
}
