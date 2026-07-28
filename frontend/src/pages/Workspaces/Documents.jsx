import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Eye, FileText, Trash2, Upload, X } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import styles from './Documents.module.css'

const categories = {
  invoice: 'Fatura',
  receipt: 'Fiş / Makbuz',
  contract: 'Sözleşme',
  promissory_note: 'Senet',
  shipment: 'Kargo belgesi',
  purchase: 'Alım belgesi',
  other: 'Diğer'
}

const recordTypes = {
  payment: 'Ödeme',
  receivable: 'Tahsilat',
  promissory_note: 'Senet',
  purchase: 'Alım',
  shipment: 'Kargo'
}

export default function Documents() {
  const { workspaceId } = useParams()
  const toast = useToast()
  const inputRef = useRef(null)
  const [documents, setDocuments] = useState([])
  const [category, setCategory] = useState('other')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await api.workspace.documents.list(workspaceId)
      setDocuments(data.documents)
    } catch (error) {
      toast.error(error.message || 'Belgeler yüklenemedi.')
    }
  }, [toast, workspaceId])

  useEffect(() => { load() }, [load])

  async function uploadFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await api.workspace.documents.upload(workspaceId, file, { category })
      toast.success('Belge işletme alanına yüklendi.')
      await load()
    } catch (error) {
      toast.error(error.message || 'Belge yüklenemedi.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function archive(documentId) {
    if (!confirm('Bu belgeyi arşivlemek istiyor musunuz?')) return
    await api.workspace.documents.archive(workspaceId, documentId)
    toast.success('Belge arşivlendi.')
    await load()
  }

  async function acceptSuggestion(suggestionId) {
    try {
      await api.workspace.documents.acceptSuggestion(workspaceId, suggestionId)
      toast.success('Öneri onaylandı ve işletme takip kaydı oluşturuldu.')
      await load()
    } catch (error) {
      toast.error(error.message || 'Öneri onaylanamadı.')
    }
  }

  async function rejectSuggestion(suggestionId) {
    try {
      await api.workspace.documents.rejectSuggestion(workspaceId, suggestionId)
      toast.success('Öneri reddedildi. Takip kaydı oluşturulmadı.')
      await load()
    } catch (error) {
      toast.error(error.message || 'Öneri reddedilemedi.')
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h2>İşletme Belgeleri</h2>
          <p>Fatura, senet, sözleşme, alım ve kargo belgelerini işletmenizle birlikte saklayın.</p>
        </div>
        <div className={styles.uploadControls}>
          <select value={category} onChange={event => setCategory(event.target.value)}>
            {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload size={17} /> {uploading ? 'Yükleniyor…' : 'Belge yükle'}
          </button>
          <input ref={inputRef} hidden type="file" accept=".txt,.md,.csv,.json,.docx,.pdf,.png,.jpg,.jpeg" onChange={uploadFile} />
        </div>
      </div>

      <div className={styles.note}>
        TXT, MD, CSV, JSON, DOCX, PDF, PNG ve JPEG desteklenir. Taranmış belgeler yerel Türkçe OCR ile okunur; dış servise gönderilmez.
      </div>

      {documents.length === 0 ? (
        <div className={styles.empty}><FileText size={42} /><h3>Henüz belge yok</h3><p>İşletmenize ait ilk belgeyi yükleyin.</p></div>
      ) : (
        <div className={styles.grid}>
          {documents.map(document => (
            <article key={document.id} className={styles.card}>
              <div className={styles.documentRow}>
                <FileText size={28} />
                <div className={styles.body}>
                  <h3>{document.originalName}</h3>
                  <p>{categories[document.category] || 'Sınıflandırılmamış'} · {(document.sizeBytes / 1024).toFixed(1)} KB</p>
                  <span>{document.linkedRecordCount} takip kaydına bağlı</span>
                  {document.analysis?.extraction_method === 'ocr_tur' && <span className={styles.ocrBadge}>Yerel OCR ile okundu</span>}
                </div>
                <button className={styles.previewButton} onClick={() => setPreview(document)}><Eye size={17} /> İçerik</button>
                <button className={styles.delete} aria-label="Arşivle" onClick={() => archive(document.id)}><Trash2 size={17} /></button>
              </div>
              {document.suggestions?.filter(item => item.status === 'proposed').map(suggestion => (
                <div className={styles.suggestion} key={suggestion.id}>
                  <div>
                    <strong>Takip kaydı önerisi · %{Math.round(suggestion.confidence * 100)} güven</strong>
                    <p>
                      {recordTypes[suggestion.payload.type] || suggestion.payload.type}
                      {suggestion.payload.amount != null ? ` · ${Number(suggestion.payload.amount).toLocaleString('tr-TR')} ${suggestion.payload.currency}` : ''}
                      {suggestion.payload.dueAt ? ` · ${new Date(suggestion.payload.dueAt).toLocaleDateString('tr-TR')}` : ''}
                    </p>
                    <small>Bu öneri siz onaylamadan işletme kaydına dönüşmez.</small>
                  </div>
                  <div className={styles.suggestionActions}>
                    <button className={styles.accept} onClick={() => acceptSuggestion(suggestion.id)}><Check size={16} /> Kaydı oluştur</button>
                    <button className={styles.reject} onClick={() => rejectSuggestion(suggestion.id)}><X size={16} /> Reddet</button>
                  </div>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}

      {preview && (
        <div className={styles.overlay} onMouseDown={() => setPreview(null)}>
          <div className={styles.preview} onMouseDown={event => event.stopPropagation()}>
            <div className={styles.previewHeading}>
              <div><h3>{preview.originalName}</h3><p>{preview.analysis?.extraction_method === 'ocr_tur' ? 'Türkçe OCR sonucu' : 'Belgeden çıkarılan metin'}</p></div>
              <button aria-label="Kapat" onClick={() => setPreview(null)}><X /></button>
            </div>
            <pre>{preview.extractedText || 'Bu belgeden gösterilebilir metin çıkarılmadı.'}</pre>
          </div>
        </div>
      )}
    </section>
  )
}
