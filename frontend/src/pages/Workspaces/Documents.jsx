import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, Trash2, Upload } from 'lucide-react'
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

export default function Documents() {
  const { workspaceId } = useParams()
  const toast = useToast()
  const inputRef = useRef(null)
  const [documents, setDocuments] = useState([])
  const [category, setCategory] = useState('other')
  const [uploading, setUploading] = useState(false)

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
          <input ref={inputRef} hidden type="file" accept=".txt,.md,.csv,.json,.docx" onChange={uploadFile} />
        </div>
      </div>

      <div className={styles.note}>
        Şimdilik TXT, MD, CSV, JSON ve DOCX destekleniyor. PDF desteği güvenli metin çıkarma aşamasında eklenecek.
      </div>

      {documents.length === 0 ? (
        <div className={styles.empty}><FileText size={42} /><h3>Henüz belge yok</h3><p>İşletmenize ait ilk belgeyi yükleyin.</p></div>
      ) : (
        <div className={styles.grid}>
          {documents.map(document => (
            <article key={document.id} className={styles.card}>
              <FileText size={28} />
              <div className={styles.body}>
                <h3>{document.originalName}</h3>
                <p>{categories[document.category] || 'Sınıflandırılmamış'} · {(document.sizeBytes / 1024).toFixed(1)} KB</p>
                <span>{document.linkedRecordCount} takip kaydına bağlı</span>
              </div>
              <button className={styles.delete} aria-label="Arşivle" onClick={() => archive(document.id)}><Trash2 size={17} /></button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
