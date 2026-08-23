import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BarChart3, Camera, Check, Eye, FileImage, FileText, ImagePlus, Trash2, Upload, X } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { Select } from '@/components/ui'
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
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef(null)
  const photoInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [documents, setDocuments] = useState([])
  const [category, setCategory] = useState('other')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const [modelMappings, setModelMappings] = useState({})
  const [mappingLoading, setMappingLoading] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await api.workspace.documents.list(workspaceId)
      setDocuments(data.documents)
    } catch (error) {
      toast.error(error.message || 'Belgeler yüklenemedi.')
    }
  }, [toast, workspaceId])

  useEffect(() => { load() }, [load])

  async function processFile(file) {
    if (!file) return
    setUploading(true)
    try {
      await api.workspace.documents.upload(workspaceId, file, { category })
      toast.success('Belge okundu. Algılanan takip bilgilerini kontrol edin.')
      await load()
    } catch (error) {
      toast.error(error.message || 'Belge yüklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  async function uploadFile(event) {
    await processFile(event.target.files?.[0])
    event.target.value = ''
  }

  function dropFile(event) {
    event.preventDefault()
    setDragging(false)
    if (!uploading) processFile(event.dataTransfer.files?.[0])
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

  async function findFinancialModels(document) {
    setMappingLoading(document.id)
    try {
      const data = await api.workspace.documents.financialModelSuggestions(workspaceId, document.id)
      setModelMappings(current => ({ ...current, [document.id]: data }))
      if (!data.models?.length) toast.info('Bu belgede finansal model girdisi olarak eşleşen alan bulunamadı.')
    } catch (error) {
      toast.error(error.message || 'Model eşleştirmesi yapılamadı.')
    } finally {
      setMappingLoading(null)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h2>İşletme Belgeleri</h2>
          <p>Belgeyi yükleyin veya fotoğrafını çekin; sistem metni okuyup takip kaydı önerisi hazırlasın.</p>
        </div>
      </div>

      <div
        className={`${styles.uploadPanel} ${dragging ? styles.dragging : ''}`}
        onDragEnter={event => { event.preventDefault(); setDragging(true) }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
        }}
        onDrop={dropFile}
      >
        <div className={styles.uploadIcon}><FileImage size={34} /></div>
        <div className={styles.uploadText}>
          <h3>{uploading ? 'Belge okunuyor ve analiz ediliyor…' : 'Belge veya fotoğraf ekleyin'}</h3>
          <p>Dosyayı buraya sürükleyebilir ya da aşağıdaki seçeneklerden birini kullanabilirsiniz.</p>
        </div>

        <label className={styles.categoryField}>
          Belge türü
          <Select aria-label="Belge türü" options={Object.entries(categories).map(([value, label]) => ({ value, label }))} value={category} onChange={setCategory} disabled={uploading} />
        </label>

        <div className={styles.uploadActions}>
          <button className={styles.primaryUpload} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload size={18} /> Dosya seç
          </button>
          <button onClick={() => photoInputRef.current?.click()} disabled={uploading}>
            <ImagePlus size={18} /> Fotoğraf seç
          </button>
          <button onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
            <Camera size={18} /> Fotoğraf çek
          </button>
        </div>

        <input ref={fileInputRef} hidden type="file" accept=".txt,.md,.csv,.json,.xml,.docx,.pdf,.png,.jpg,.jpeg" onChange={uploadFile} />
        <input ref={photoInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={uploadFile} />
        <input ref={cameraInputRef} hidden type="file" accept="image/*" capture="environment" onChange={uploadFile} />
      </div>

      <div className={styles.note}>
        PDF, DOCX, PNG, JPEG, CSV, JSON, XML, TXT ve MD desteklenir. Muhasebe programınızdan aldığınız e-Fatura XML dosyasını doğrudan yükleyebilirsiniz. Fotoğraf ve taranmış belgeler yerel Türkçe OCR ile okunur; dış servise gönderilmez. Algılanan kayıt siz onaylamadan kesinleşmez.
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
                  {document.analysisStatus === 'review_required' && <span className={styles.reviewBadge}>Veriler algılandı · onay bekliyor</span>}
                  {document.analysisStatus === 'accepted' && <span className={styles.acceptedBadge}>Takip kaydı oluşturuldu</span>}
                  {document.analysisStatus === 'no_suggestion' && <span className={styles.noSuggestionBadge}>Metin okundu · takip bilgisi bulunamadı</span>}
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
              <div className={styles.modelMapping}>
                <button onClick={() => findFinancialModels(document)} disabled={mappingLoading === document.id}>
                  <BarChart3 size={17} /> {mappingLoading === document.id ? 'Alanlar eşleştiriliyor…' : 'Finansal model öner'}
                </button>
                {modelMappings[document.id] && (
                  <div className={styles.modelResults}>
                    <small>{modelMappings[document.id].warning}</small>
                    {modelMappings[document.id].models?.slice(0, 4).map(model => (
                      <button key={model.code} onClick={() => navigate(`/app/finance/models/${model.code}?documentId=${document.id}`)}>
                        <span><strong>{model.name}</strong><small>%{Math.round(model.coverage * 100)} alan eşleşmesi · {model.missingFields.length} eksik alan</small></span>
                        <BarChart3 size={16} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
