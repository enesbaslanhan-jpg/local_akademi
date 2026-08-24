import { useCallback, useEffect, useState } from 'react'
import { X, FileSpreadsheet, Loader2, AlertCircle, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import styles from './ImportDialog.module.css'

const REQUIRED_FIELDS = ['type', 'title', 'direction']
const OPTIONAL_FIELDS = ['description', 'amount', 'currency', 'priority', 'dueAt', 'contactId', 'assignedToId', 'recurrenceRule']

const FIELD_LABELS = {
  type: 'Tür',
  title: 'Başlık',
  description: 'Açıklama',
  direction: 'Yön',
  amount: 'Tutar',
  currency: 'Para Birimi',
  priority: 'Öncelik',
  dueAt: 'Son Tarih',
  contactId: 'Cari',
  assignedToId: 'Sorumlu',
  recurrenceRule: 'Tekrarlama'
}

const FIELD_HELP = {
  type: 'Örn: payment, receivable, promissory_note, purchase, shipment, task, deferred, other',
  title: 'Kayıt başlığı (zorunlu)',
  direction: 'payable (ödenecek), receivable (tahsil edilecek), neutral (finansal değil)',
  amount: 'Sayısal değer',
  currency: 'TRY, USD, EUR vb. (varsayılan: TRY)',
  priority: 'low, normal, high, urgent (varsayılan: normal)',
  dueAt: 'ISO format: YYYY-MM-DDTHH:MM',
  contactId: 'Cari UUID',
  assignedToId: 'Kullanıcı ID (sayı)',
  recurrenceRule: 'weekly, monthly, quarterly, yearly'
}

const TYPE_OPTIONS = [
  { value: 'payment', label: 'Ödeme' },
  { value: 'receivable', label: 'Tahsilat' },
  { value: 'promissory_note', label: 'Senet' },
  { value: 'purchase', label: 'Alım' },
  { value: 'shipment', label: 'Kargo' },
  { value: 'task', label: 'Görev' },
  { value: 'deferred', label: 'Ertelenmiş' },
  { value: 'other', label: 'Diğer' }
]

const DIRECTION_OPTIONS = [
  { value: 'payable', label: 'Ödenecek' },
  { value: 'receivable', label: 'Tahsil edilecek' },
  { value: 'neutral', label: 'Finansal değil' }
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Düşük' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Yüksek' },
  { value: 'urgent', label: 'Acil' }
]

const RECURRENCE_OPTIONS = [
  { value: '', label: 'Tekrarlanmaz' },
  { value: 'weekly', label: 'Her hafta' },
  { value: 'monthly', label: 'Her ay' },
  { value: 'quarterly', label: 'Her 3 ayda' },
  { value: 'yearly', label: 'Her yıl' }
]

export default function ImportDialog({ workspaceId, onClose, onSuccess }) {
  const toast = useToast()
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
      toast.error('Sadece CSV ve XLSX dosyaları desteklenir.')
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
      toast.error(error.message || 'Dosya yüklenemedi.')
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
      toast.error('Sütunlar yüklenemedi.')
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
      toast.error(`Zorunlu alanlar eşleştirilmeli: ${missing.map(f => FIELD_LABELS[f]).join(', ')}`)
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
      toast.error(error.message || 'Önizleme alınamadı.')
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
      toast.success(`${result.imported} kayıt içe aktarıldı.${result.failed > 0 ? ` ${result.failed} satır başarısız.` : ''}`)
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(error.message || 'İçe aktarım başarısız.')
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
            <option value="">— Sütun seç —</option>
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
            <option value="">— Sütun seç —</option>
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
            <option value="">— Sütun seç —</option>
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
      <h3>Dosya Yükle</h3>
      <p className={styles.stepDesc}>
        CSV veya Excel (.xlsx) dosyanızı seçin. İlk satır başlık olmalıdır.
      </p>
      <input
        type="file"
        accept=".csv,.xlsx"
        onChange={handleFileChange}
        disabled={uploading}
        className={styles.fileInput}
      />
      {uploading && <p className={styles.loading}>Yükleniyor… <Loader2 size={16} className={styles.spin} /></p>}
    </div>
  )

  const renderStep2 = () => (
    <div className={styles.step}>
      <div className={styles.stepIcon}>
        <FileSpreadsheet size={48} />
      </div>
      <h3>Sütunları Eşleştir</h3>
      <p className={styles.stepDesc}>
        Dosyanızdaki sütunları kayıt alanlarıyla eşleştirin. Zorunlu alanlar <strong> yıldızlı</strong>.
      </p>
      {loading ? (
        <p className={styles.loading}>Sütunlar okunuyor… <Loader2 size={16} className={styles.spin} /></p>
      ) : (
        <div className={styles.mappingGrid}>
          {REQUIRED_FIELDS.map(field => (
            <div key={field} className={styles.mappingRow}>
              <label className={styles.mappingLabel}>
                <span className={styles.required}>*</span> {FIELD_LABELS[field]}
              </label>
              <div className={styles.mappingInput}>
                {getFieldInput(field)}
                <span className={styles.help}>{FIELD_HELP[field]}</span>
              </div>
            </div>
          ))}
          {OPTIONAL_FIELDS.map(field => (
            <div key={field} className={styles.mappingRow}>
              <label className={styles.mappingLabel}>{FIELD_LABELS[field]}</label>
              <div className={styles.mappingInput}>
                {getFieldInput(field)}
                <span className={styles.help}>{FIELD_HELP[field]}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={styles.stepActions}>
        <button className={styles.secondary} onClick={() => setStep(1)}>
          <ChevronLeft size={16} /> Geri
        </button>
        <button className={styles.primary} onClick={handlePreview} disabled={loading}>
          {loading ? 'Yükleniyor…' : 'Önizle'}
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
      <h3>Önizleme</h3>
      <p className={styles.stepDesc}>
        {preview?.validRows} geçerli, {errors.length} hatalı satır. Devam etmek için "İçe Aktar"a basın.
      </p>

      {errors.length > 0 && (
        <div className={styles.errorSummary}>
          <AlertCircle size={16} />
          <span>{errors.length} hatalı satır (ilk 50 gösteriliyor)</span>
        </div>
      )}

      {errors.length > 0 && (
        <details className={styles.errorDetails}>
          <summary>Hataları göster</summary>
          <ul className={styles.errorList}>
            {errors.slice(0, 50).map((err, i) => (
              <li key={i} className={styles.errorItem}>
                <strong>Satır {err.row}</strong> — <span className={styles.errorField}>{err.field}</span>: {err.message}
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
                <th>Satır</th>
                {REQUIRED_FIELDS.map(f => <th key={f}>{FIELD_LABELS[f]}</th>)}
                {OPTIONAL_FIELDS.filter(f => preview.sample[0]?.[f] !== undefined).map(f => <th key={f}>{FIELD_LABELS[f]}</th>)}
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
          <ChevronLeft size={16} /> Düzenle
        </button>
        <button className={styles.primary} onClick={handleImport} disabled={step === 4}>
          {step === 4 ? (
            <>İçe aktarılıyor… <Loader2 size={16} className={styles.spin} /></>
          ) : (
            <>İçe Aktar <ChevronRight size={16} /></>
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
            <h2>Toplu İçe Aktarım</h2>
            <div className={styles.stepIndicator}>
              {[1, 2, 3].map(s => (
                <span key={s} className={`${styles.stepDot} ${step >= s ? styles.active : ''} ${step === s ? styles.current : ''}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Kapat"><X size={20} /></button>
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