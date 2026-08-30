import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, CalendarDays, Check, Package, Plus, WalletCards, X,
  Receipt, HandCoins, FileSignature, Truck, Search, ChevronRight, Download, Share2, FileDown,
  FileSpreadsheet
} from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { Select } from '@/components/ui'
import { dosyaPaylas, paylasabilirMi } from '@/utils/dosyaPaylas'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'
import { formatCurrency, formatDate } from '@/utils/formatters'
import KayitDetay from './KayitDetay'
import ImportDialog from './ImportDialog'
import styles from './Tracker.module.css'

const emptyForm = {
  type: 'payment',
  title: '',
  description: '',
  direction: 'payable',
  amount: '',
  currency: 'TRY',
  priority: 'normal',
  dueAt: '',
  recurrenceRule: ''
}

/*
 * HIZLI AKSİYON ŞERİDİ — her biri MEVCUT kayıt oluşturma akışını `type`
 * (ve mantıklı olduğunda `direction`) ön seçili açar. Yeni endpoint yok.
 */






export default function Tracker() {
  const { workspaceId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const { t } = useTranslation('workspace')
  const { formatLocale } = useLocalization()

  const typeLabels = {
    payment: t('type.payment'),
    receivable: t('type.receivable'),
    promissory_note: t('type.promissoryNote'),
    purchase: t('type.purchase'),
    shipment: t('type.shipment'),
    task: t('type.task'),
    deferred: t('type.deferred'),
    other: t('type.other')
  }

  const statusLabels = {
    open: t('status.open'),
    in_progress: t('status.inProgress'),
    completed: t('status.completed'),
    cancelled: t('status.cancelled'),
    deferred: t('status.deferred')
  }

  const QUICK_ACTIONS = [
    { id: 'payment', label: t('quickAction.newPayment'), icon: Receipt, preset: { type: 'payment', direction: 'payable' } },
    { id: 'receivable', label: t('quickAction.newReceivable'), icon: HandCoins, preset: { type: 'receivable', direction: 'receivable' } },
    { id: 'promissory_note', label: t('quickAction.newNote'), icon: FileSignature, preset: { type: 'promissory_note', direction: 'payable' } },
    { id: 'shipment', label: t('quickAction.newShipment'), icon: Truck, preset: { type: 'shipment', direction: 'neutral' } }
  ]

  function localDate(value) {
    if (!value) return t('dateNone')
    return formatDate(value, { locale: formatLocale, dateStyle: 'medium', timeStyle: 'short' })
  }
  const [summary, setSummary] = useState(null)
  const [records, setRecords] = useState([])
  const [filters, setFilters] = useState({ status: '', type: '' })
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  /* Satira tiklaninca acilan detay. Onceden satir sonundaki ok (>)
     hicbir seye baglanmamisti. */
  const [detayId, setDetayId] = useState(null)
  const [showImport, setShowImport] = useState(false)
  /* Hangi kaydın PDF'i hazırlanıyor -- düğme iki kez basılmasın. */
  const [kayitIsleniyor, setKayitIsleniyor] = useState('')
  /* Bir kez ölçülüyor: ortamın yeteneği kullanım sırasında değişmiyor. */
  const paylasimVar = useMemo(() => paylasabilirMi(), [])

  /*
   * TEK KAYDI GÖNDERMEK.
   *
   * Toplu dışa aktarım ekrandaki filtreye uyan HER kaydı tek belgeye
   * koyuyor; tek bir faturayı muhasebeciye göndermek isteyen kullanıcı
   * o belgeden kendi kaydını ayıklamak zorunda kalıyordu.
   */
  async function kaydiAl(record, paylas) {
    setKayitIsleniyor(record.id)
    try {
      const dosya = await api.workspace.exports.fetchRecordPdf(workspaceId, record.id)
      if (!paylas) {
        const { dosyaIndir } = await import('@/utils/dosyaPaylas')
        dosyaIndir(dosya)
        toast.success(t('toast.recordPdfDownloaded'))
        return
      }
      const sonuc = await dosyaPaylas(dosya, { baslik: record.title })
      /* İptal sessiz geçiliyor: kullanıcı vazgeçtiyse bu bir hata değil. */
      if (sonuc === 'paylasildi') toast.success(t('toast.recordShared'))
      else if (sonuc === 'indirildi') toast.success(t('toast.recordPdfDownloaded'))
    } catch (error) {
      toast.error(error.message || t('toast.recordDownloadFailed'))
    } finally {
      setKayitIsleniyor('')
    }
  }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
      const [summaryData, listData] = await Promise.all([
        api.workspace.tracker.summary(workspaceId),
        api.workspace.tracker.list(workspaceId, query)
      ])
      setSummary(summaryData)
      setRecords(listData.records)
    } catch (error) {
      toast.error(error.message || t('toast.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [filters, toast, workspaceId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const requestedType = searchParams.get('new')
    const action = QUICK_ACTIONS.find(item => item.id === requestedType)
    if (!action) return
    openForm(action.preset)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  /* Kayıt formunu ön seçimle açar. Hızlı aksiyon şeridi ve "Yeni kayıt"
     düğmesi aynı akışı kullanır. */
  function openForm(preset = {}) {
    setForm({ ...emptyForm, ...preset })
    setShowForm(true)
  }

  const overdueIds = useMemo(() => new Set(
    records.filter(record => record.dueAt && new Date(record.dueAt) < new Date() && !['completed', 'cancelled'].includes(record.status)).map(record => record.id)
  ), [records])

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(formatLocale)
    if (!query) return records
    return records.filter(record => `${record.title} ${record.description || ''} ${record.contact?.name || ''}`.toLocaleLowerCase(formatLocale).includes(query))
  }, [formatLocale, records, search])

  async function createRecord(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await api.workspace.tracker.create(workspaceId, {
        ...form,
        amount: form.amount === '' ? null : Number(form.amount),
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        recurrenceRule: form.recurrenceRule || null
      })
      setForm(emptyForm)
      setShowForm(false)
      toast.success(t('toast.recordCreated'))
      await load()
    } catch (error) {
      toast.error(error.message || t('toast.recordCreateFailed'))
    } finally {
      setSaving(false)
    }
  }

  /* Dışa aktarım, ekranda uygulanan filtrenin AYNISINI kullanır: tür ve
     durum sunucu tarafında, arama metni `q` olarak gönderilir. Böylece
     indirilen dosya kullanıcının gördüğü listeyle örtüşür. Tablo ilk 50
     kaydı gösterirken dosya filtreye uyan tüm kayıtları taşır. */
  async function downloadExport(format) {
    setExporting(format)
    try {
      const query = Object.fromEntries(
        Object.entries({ ...filters, q: search.trim() }).filter(([, value]) => value)
      )
      const result = await api.workspace.exports.downloadRecords(workspaceId, format, query)
      toast.success(t('export.downloaded', { count: result.rowCount }))
    } catch (error) {
      toast.error(error.message || t('export.failed'))
    } finally {
      setExporting('')
    }
  }

  async function setStatus(recordId, status) {
    try {
      await api.workspace.tracker.update(workspaceId, recordId, { status })
      toast.success(status === 'completed' ? t('toast.completed') : t('toast.reopened'))
      await load()
    } catch (error) {
      toast.error(error.message || t('toast.statusChangeFailed'))
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h2>{t('tracker.title')}</h2>
          <p>{t('tracker.subtitle')}</p>
        </div>
        <div className={styles.headingActions}>
          <div className={styles.exportGroup} role="group" aria-label={t('tracker.exportLabel')}>
            {[
              { fmt: 'csv', label: 'CSV' },
              { fmt: 'xlsx', label: 'Excel' },
              { fmt: 'pdf', label: 'PDF' }
            ].map(({ fmt, label }) => (
              <button
                key={fmt}
                type="button"
                className={styles.exportButton}
                onClick={() => downloadExport(fmt)}
                disabled={Boolean(exporting)}
                title={t('export.downloadTooltip', { format: label })}
              >
                <Download size={15} aria-hidden="true" />
                {exporting === fmt ? t('export.preparing') : label}
              </button>
            ))}
          </div>
          <button className={styles.secondaryCta} onClick={() => setShowImport(true)}>
            <FileSpreadsheet size={18} /> {t('tracker.import')}
          </button>
          <button className={styles.cta} onClick={() => openForm()}>
            <Plus size={18} /> {t('tracker.addRecord')}
          </button>
        </div>
      </div>

      <section className={styles.registry}>
        <div className={styles.registryToolbar}>
          <label><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t('tracker.searchPlaceholder')} /></label>
          <div className={styles.filterChips}>
            <button className={!filters.type ? styles.activeChip : ''} onClick={() => setFilters(current => ({ ...current, type: '' }))}>{t('tracker.all')}</button>
            {['payment', 'receivable', 'promissory_note', 'shipment', 'task'].map(type => <button key={type} className={filters.type === type ? styles.activeChip : ''} onClick={() => setFilters(current => ({ ...current, type }))}>{typeLabels[type]}</button>)}
          </div>
          <Select aria-label={t('tracker.statusFilter')} placeholder={t('tracker.allStatuses')} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} value={filters.status} onChange={v => setFilters(current => ({ ...current, status: v }))} />
        </div>

        <div className={styles.tableHead}><span>{t('tracker.col.record')}</span><span>{t('tracker.col.type')}</span><span>{t('tracker.col.updated')}</span><span>{t('tracker.col.status')}</span><span /><span /></div>
        {loading ? <div className={styles.tableState}>{t('tracker.col.loading')}</div> : visibleRecords.length === 0 ? (
          <div className={styles.tableState}><CalendarDays size={30} /><strong>{records.length ? t('tracker.col.noMatch') : t('tracker.col.noRecords')}</strong><span>{records.length ? t('tracker.col.adjustSearch') : t('tracker.col.startTracking')}</span></div>
        ) : <div className={styles.recordTable}>{visibleRecords.map(record => (
          <article
            className={`${styles.tableRow} ${overdueIds.has(record.id) ? styles.overdueRow : ''}`}
            key={record.id}
            role="button"
            tabIndex={0}
            onClick={() => setDetayId(record.id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetayId(record.id) } }}
          >
            <div><strong>{record.title}</strong><small>{record.description || record.contact?.name || (record.amount !== null ? formatCurrency(record.amount, { locale: formatLocale, currency: record.currency }) : t('tracker.noDescription'))}</small></div>
            <span>{typeLabels[record.type] || record.type}</span>
            <span>{localDate(record.updatedAt || record.dueAt || record.createdAt)}</span>
            <button className={`${styles.rowStatus} ${styles[record.status] || ''} ${overdueIds.has(record.id) ? styles.late : ''}`} onClick={e => { e.stopPropagation(); setStatus(record.id, record.status === 'completed' ? 'open' : 'completed') }}><Check size={13} />{overdueIds.has(record.id) ? t('tracker.overdue') : statusLabels[record.status] || record.status}</button>
            {/* 🔴 `stopPropagation` şart: satırın kendisi detay panelini
                açıyor; olmasaydı indirmeye basınca panel de açılırdı. */}
            <span className={styles.rowActions}>
              <button
                type="button"
                className={styles.rowAction}
                title={t('tracker.downloadPdf')}
                aria-label={t('tracker.downloadPdf')}
                disabled={kayitIsleniyor === record.id}
                onClick={e => { e.stopPropagation(); kaydiAl(record, false) }}
              ><FileDown size={14} /></button>
              {/* Paylaş YALNIZ gerçekten paylaşabilen ortamda çizilir.
                  Masaüstü tarayıcılar dosya paylaşımını desteklemiyor;
                  düğme orada her basışta özür dileyen bir mesaj
                  gösteriyordu. İndirme düğmesi zaten yanında. */}
              {paylasimVar && (
                <button
                  type="button"
                  className={styles.rowAction}
                  title={t('tracker.share')}
                  aria-label={t('tracker.share')}
                  disabled={kayitIsleniyor === record.id}
                  onClick={e => { e.stopPropagation(); kaydiAl(record, true) }}
                ><Share2 size={14} /></button>
              )}
            </span>
            <ChevronRight size={15} />
          </article>
        ))}</div>}
      </section>

      {detayId && (
        <KayitDetay
          workspaceId={workspaceId}
          recordId={detayId}
          onClose={() => setDetayId(null)}
        />
      )}

      {showForm && (
        <div className={styles.overlay} onMouseDown={() => setShowForm(false)}>
          <div className={styles.dialog} onMouseDown={event => event.stopPropagation()}>
            <div className={styles.dialogTitle}>
              <div><h3>{t('tracker.newRecordTitle')}</h3><p>{t('tracker.newRecordDesc')}</p></div>
              <button aria-label={t('common:buttons.close')} onClick={() => setShowForm(false)}><X /></button>
            </div>
            <form onSubmit={createRecord}>
              <div className={styles.grid}>
                <label>{t('form.type')}
                  <Select aria-label={t('form.type')} options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} value={form.type} onChange={v => setForm(current => ({ ...current, type: v }))} />
                </label>
                <label>{t('form.direction')}
                  <Select aria-label={t('form.direction')} options={[{ value: 'payable', label: t('form.payable') }, { value: 'receivable', label: t('form.receivable') }, { value: 'neutral', label: t('form.notFinancial') }]} value={form.direction} onChange={v => setForm(current => ({ ...current, direction: v }))} />
                </label>
              </div>
              <label>{t('form.title')}
                <input required maxLength={240} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder={t('form.titlePlaceholder')} />
              </label>
              <label>{t('form.description')}
                <textarea rows={3} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} />
              </label>
              <div className={styles.grid}>
                <label>{t('form.amount')}
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} />
                </label>
                <label>{t('form.dueDate')}
                  <input type="datetime-local" value={form.dueAt} onChange={event => setForm(current => ({ ...current, dueAt: event.target.value }))} />
                </label>
              </div>
              <label>{t('form.recurrence')}
                <Select aria-label={t('form.recurrence')} options={[{ value: '', label: t('form.none') }, { value: 'weekly', label: t('form.weekly') }, { value: 'monthly', label: t('form.monthly') }, { value: 'quarterly', label: t('form.quarterly') }, { value: 'yearly', label: t('form.yearly') }]} value={form.recurrenceRule} onChange={v => setForm(current => ({ ...current, recurrenceRule: v }))} />
              </label>
              <div className={styles.actions}>
                <button type="button" className={styles.secondary} onClick={() => setShowForm(false)}>{t('common:buttons.cancel')}</button>
                <button type="submit" className={styles.primary} disabled={saving}>{saving ? t('form.saving') : t('form.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showImport && (
        <ImportDialog
          workspaceId={workspaceId}
          onClose={() => setShowImport(false)}
          onSuccess={load}
        />
      )}
    </section>
  )
}

function Metric({ icon, label, value, danger = false }) {
  return (
    <div className={`${styles.metric} ${danger ? styles.metricDanger : ''}`}>
      <span className={styles.metricIcon}>{icon}</span>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  )
}
