import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BarChart3, Camera, Check, Eye, FileImage, FileText, ImagePlus, Mail, Trash2, Upload, X } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { Select, Button } from '@/components/ui'
import styles from './Documents.module.css'
import { Trans, useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'
import { formatDate, formatNumber } from '@/utils/formatters'

const categoryKeys = {
  invoice: 'invoice', receipt: 'receipt', contract: 'contract',
  promissory_note: 'promissoryNote', shipment: 'shipment', purchase: 'purchase', other: 'other'
}

const recordTypeKeys = {
  payment: 'payment', receivable: 'receivable', promissory_note: 'promissoryNote', purchase: 'purchase', shipment: 'shipment'
}

export default function Documents() {
  const { t } = useTranslation('workspace')
  const { formatLocale } = useLocalization()
  const categoryLabel = value => t(`documents.category.${categoryKeys[value] || 'other'}`)
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
  /*
   * Gelen kutusu adresi BURADA gösteriliyor.
   *
   * Ayarların dibinde duruyordu ve ürün sahibi bulamadı ("yeri kötü").
   * Belge eklemenin diğer yolları (dosya seç, fotoğraf çek) bu panelde;
   * e-postayla göndermek de bir belge ekleme yolu, ayrı bir ayar değil.
   * Ayarlardaki blok yönetim işleri (yenile/kapat/güvenilir gönderen)
   * için duruyor; adres iki yerde de aynı uçtan okunuyor, ikinci bir
   * durum kopyası yok.
   */
  const [inbox, setInbox] = useState(null)
  const [epostaAcik, setEpostaAcik] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.workspace.documents.list(workspaceId)
      setDocuments(data.documents)
    } catch (error) {
      toast.error(error.message || t('documents.loadFailed'))
    }
  }, [t, toast, workspaceId])

  useEffect(() => { load() }, [load])

  /* Adres yalnız yöneticiye görünür (uç `MANAGER` istiyor); yetkisi
     olmayan üyede sessizce gizleniyor, hata gösterilmiyor. */
  useEffect(() => {
    api.workspace.inbox.get(workspaceId).then(setInbox).catch(() => setInbox(null))
  }, [workspaceId])

  async function processFile(file) {
    if (!file) return
    setUploading(true)
    try {
      await api.workspace.documents.upload(workspaceId, file, { category })
      toast.success(t('documents.uploadSuccess'))
      await load()
    } catch (error) {
      toast.error(error.message || t('documents.uploadFailed'))
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
    if (!confirm(t('documents.confirmArchive'))) return
    await api.workspace.documents.archive(workspaceId, documentId)
    toast.success(t('documents.archived'))
    await load()
  }

  async function acceptSuggestion(suggestionId) {
    try {
      await api.workspace.documents.acceptSuggestion(workspaceId, suggestionId)
      toast.success(t('documents.suggestionAccepted'))
      await load()
    } catch (error) {
      toast.error(error.message || t('documents.suggestionAcceptFailed'))
    }
  }

  async function rejectSuggestion(suggestionId) {
    try {
      await api.workspace.documents.rejectSuggestion(workspaceId, suggestionId)
      toast.success(t('documents.suggestionRejected'))
      await load()
    } catch (error) {
      toast.error(error.message || t('documents.suggestionRejectFailed'))
    }
  }

  async function findFinancialModels(document) {
    setMappingLoading(document.id)
    try {
      const data = await api.workspace.documents.financialModelSuggestions(workspaceId, document.id)
      setModelMappings(current => ({ ...current, [document.id]: data }))
      if (!data.models?.length) toast.info(t('documents.noModelMatch'))
    } catch (error) {
      toast.error(error.message || t('documents.modelMatchFailed'))
    } finally {
      setMappingLoading(null)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h2>{t('documents.title')}</h2>
          <p>{t('documents.subtitle')}</p>
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
          <h3>{uploading ? t('documents.analyzing') : t('documents.addDocument')}</h3>
          <p>{t('documents.dragHint')}</p>
        </div>

        <label className={styles.categoryField}>
          {t('documents.typeLabel')}
          <Select aria-label={t('documents.typeLabel')} options={Object.keys(categoryKeys).map(value => ({ value, label: categoryLabel(value) }))} value={category} onChange={setCategory} disabled={uploading} />
        </label>

        <div className={styles.uploadActions}>
          <button className={styles.primaryUpload} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload size={18} /> {t('documents.selectFile')}
          </button>
          <button onClick={() => photoInputRef.current?.click()} disabled={uploading}>
            <ImagePlus size={18} /> {t('documents.selectPhoto')}
          </button>
          <button onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
            <Camera size={18} /> {t('documents.takePhoto')}
          </button>
          {inbox?.kanalHazir && (
            <button onClick={() => setEpostaAcik(a => !a)} disabled={uploading} aria-expanded={epostaAcik}>
              <Mail size={18} /> {t('documents.emailSend')}
            </button>
          )}
        </div>

        {epostaAcik && inbox?.kanalHazir && (
          <div className={styles.epostaKanali}>
            {inbox.acik ? (
              <>
                <p>{t('documents.inboxHint')}</p>
                <div className={styles.epostaAdres}>
                  <code>{inbox.adres}</code>
                  <Button
                    type="button" variant="secondary"
                    onClick={() => {
                      navigator.clipboard?.writeText(inbox.adres)
                      toast.success(t('documents.addressCopied'))
                    }}
                  >
                    {t('documents.copy')}
                  </Button>
                </div>
                {/* Yönlendirme kuralı, ürün sahibinin "otomatik düşsün"
                    isteğinin karşılığı. Ama yönlendirilen postada
                    gönderen TEDARİKÇİ olarak kaldığı için o adresin
                    güvenilir listeye eklenmesi şart -- kullanıcı bunu
                    bilmezse kuralı kurar ve hiçbir şey gelmez. */}
                <p className={styles.epostaIpucu}><Trans t={t} i18nKey="documents.forwardingNote" components={{ strong: <strong /> }} /></p>
              </>
            ) : (
              <p><Trans t={t} i18nKey="documents.inboxNotCreated" components={{ strong: <strong /> }} /></p>
            )}
          </div>
        )}

        <input ref={fileInputRef} hidden type="file" accept=".txt,.md,.csv,.json,.xml,.docx,.xlsx,.pdf,.png,.jpg,.jpeg" onChange={uploadFile} />
        <input ref={photoInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={uploadFile} />
        <input ref={cameraInputRef} hidden type="file" accept="image/*" capture="environment" onChange={uploadFile} />
      </div>

      <div className={styles.note}>
        {t('documents.supportedFormats')}
      </div>

      {documents.length === 0 ? (
        <div className={styles.empty}><FileText size={42} /><h3>{t('documents.empty')}</h3><p>{t('documents.emptyHint')}</p></div>
      ) : (
        <div className={styles.grid}>
          {documents.map(document => (
            <article key={document.id} className={styles.card}>
              <div className={styles.documentRow}>
                <FileText size={28} />
                <div className={styles.body}>
                  <h3>{document.originalName}</h3>
                  <p>{categoryLabel(document.category) || t('documents.unclassified')} · {formatNumber(document.sizeBytes / 1024, { locale: formatLocale, maximumFractionDigits: 1 })} KB</p>
                  <span>{t('documents.linkedRecords', { count: document.linkedRecordCount })}</span>
                  {document.analysis?.extraction_method === 'ocr_tur' && <span className={styles.ocrBadge}>{t('documents.ocrBadge')}</span>}
                  {document.analysisStatus === 'review_required' && <span className={styles.reviewBadge}>{t('documents.reviewBadge')}</span>}
                  {document.analysisStatus === 'accepted' && <span className={styles.acceptedBadge}>{t('documents.acceptedBadge')}</span>}
                  {document.analysisStatus === 'no_suggestion' && <span className={styles.noSuggestionBadge}>{t('documents.noSuggestionBadge')}</span>}
                </div>
                <button className={styles.previewButton} onClick={() => setPreview(document)}><Eye size={17} /> {t('documents.viewContent')}</button>
                <button className={styles.delete} aria-label={t('documents.archive')} onClick={() => archive(document.id)}><Trash2 size={17} /></button>
              </div>
              {document.suggestions?.filter(item => item.status === 'proposed').map(suggestion => (
                <div className={styles.suggestion} key={suggestion.id}>
                  <div>
                    <strong>{t('documents.suggestionConfidence', { percent: Math.round(suggestion.confidence * 100) })}</strong>
                    <p>
                      {/* 🔴 Yön belirsizse TÜR ETİKETİ GÖSTERİLMEZ.
                          `payload.type` alanında "belirsiz" diye bir değer
                          yok; yön belirlenemediğinde tür zorunlu olarak
                          'payment'a düşüyor ve ekranda "Ödeme" yazıyordu.
                          Yani kullanıcıya, aslında alacağı olabilecek bir
                          fatura için "bu senin borcun" deniyordu.
                          Tarayıcıda görülüp düzeltildi. */}
                      {suggestion.payload.direction === 'neutral'
                        ? t('documents.directionUnknown')
                        : (recordTypeKeys[suggestion.payload.type] ? t(`type.${recordTypeKeys[suggestion.payload.type]}`) : suggestion.payload.type)}
                      {suggestion.payload.amount != null ? ` · ${formatNumber(suggestion.payload.amount, { locale: formatLocale })} ${suggestion.payload.currency}` : ''}
                      {suggestion.payload.dueAt ? ` · ${formatDate(suggestion.payload.dueAt, { locale: formatLocale })}` : ''}
                    </p>
                    {suggestion.payload.direction === 'neutral' && suggestion.payload.description && (
                      <p className={styles.suggestionHint}>{suggestion.payload.description}</p>
                    )}
                    <small>{t('documents.suggestionNote')}</small>
                  </div>
                  <div className={styles.suggestionActions}>
                    <button className={styles.accept} onClick={() => acceptSuggestion(suggestion.id)}><Check size={16} /> {t('documents.createRecord')}</button>
                    <button className={styles.reject} onClick={() => rejectSuggestion(suggestion.id)}><X size={16} /> {t('documents.reject')}</button>
                  </div>
                </div>
              ))}
              <div className={styles.modelMapping}>
                <button onClick={() => findFinancialModels(document)} disabled={mappingLoading === document.id}>
                  <BarChart3 size={17} /> {mappingLoading === document.id ? t('documents.matching') : t('documents.suggestModel')}
                </button>
                {modelMappings[document.id] && (
                  <div className={styles.modelResults}>
                    <small>{modelMappings[document.id].warning}</small>
                    {modelMappings[document.id].models?.slice(0, 4).map(model => (
                      <button key={model.code} onClick={() => navigate(`/app/finance/models/${model.code}?documentId=${document.id}`)}>
                        <span><strong>{model.name}</strong><small>{t('documents.modelCoverage', { percent: Math.round(model.coverage * 100), count: model.missingFields.length })}</small></span>
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
              <div><h3>{preview.originalName}</h3><p>{preview.analysis?.extraction_method === 'ocr_tur' ? t('documents.ocrResult') : t('documents.extractedText')}</p></div>
              <button aria-label={t('common:buttons.close')} onClick={() => setPreview(null)}><X /></button>
            </div>
            <pre>{preview.extractedText || t('documents.noExtractableText')}</pre>
          </div>
        </div>
      )}
    </section>
  )
}
