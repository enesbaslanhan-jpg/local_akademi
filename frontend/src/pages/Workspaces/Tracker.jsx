import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, CalendarDays, Check, Package, Plus, WalletCards, X,
  Receipt, HandCoins, FileSignature, Truck, Search, ChevronRight, Download
} from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { Select } from '@/components/ui'
import KayitDetay from './KayitDetay'
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

const typeLabels = {
  payment: 'Ödeme',
  receivable: 'Tahsilat',
  promissory_note: 'Senet',
  purchase: 'Alım',
  shipment: 'Kargo',
  task: 'Yapılacak',
  deferred: 'Ertelenen',
  other: 'Diğer'
}

/*
 * HIZLI AKSİYON ŞERİDİ — her biri MEVCUT kayıt oluşturma akışını `type`
 * (ve mantıklı olduğunda `direction`) ön seçili açar. Yeni endpoint yok.
 */
const QUICK_ACTIONS = [
  { id: 'payment', label: 'Yeni Ödeme', icon: Receipt, preset: { type: 'payment', direction: 'payable' } },
  { id: 'receivable', label: 'Yeni Tahsilat', icon: HandCoins, preset: { type: 'receivable', direction: 'receivable' } },
  { id: 'promissory_note', label: 'Yeni Senet', icon: FileSignature, preset: { type: 'promissory_note', direction: 'payable' } },
  { id: 'shipment', label: 'Yeni Kargo', icon: Truck, preset: { type: 'shipment', direction: 'neutral' } }
]

const statusLabels = {
  open: 'Açık',
  in_progress: 'Devam ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  deferred: 'Ertelendi'
}

function localDate(value) {
  if (!value) return 'Tarih yok'
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function money(value, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value || 0))
}

export default function Tracker() {
  const { workspaceId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const [summary, setSummary] = useState(null)
  const [records, setRecords] = useState([])
  const [filters, setFilters] = useState({ status: '', type: '' })
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  /* Satira tiklaninca acilan detay. Onceden satir sonundaki ok (>)
     hicbir seye baglanmamisti. */
  const [detayId, setDetayId] = useState(null)
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
      toast.error(error.message || 'İşletme kayıtları yüklenemedi.')
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
    const query = search.trim().toLocaleLowerCase('tr-TR')
    if (!query) return records
    return records.filter(record => `${record.title} ${record.description || ''} ${record.contact?.name || ''}`.toLocaleLowerCase('tr-TR').includes(query))
  }, [records, search])

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
      toast.success('Kayıt oluşturuldu.')
      await load()
    } catch (error) {
      toast.error(error.message || 'Kayıt oluşturulamadı.')
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
      toast.success(
        result.truncated
          ? `${result.rowCount} kayıt indirildi (üst sınıra ulaşıldı, filtre daraltın).`
          : `${result.rowCount} kayıt indirildi.`
      )
    } catch (error) {
      toast.error(error.message || 'Dışa aktarım başarısız.')
    } finally {
      setExporting('')
    }
  }

  async function setStatus(recordId, status) {
    try {
      await api.workspace.tracker.update(workspaceId, recordId, { status })
      toast.success(status === 'completed' ? 'Kayıt tamamlandı.' : 'Kayıt yeniden açıldı.')
      await load()
    } catch (error) {
      toast.error(error.message || 'Durum değiştirilemedi.')
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h2>İşletme Kayıtları</h2>
          <p>Ödeme, tahsilat, sözleşme ve operasyon kayıtlarını yönetin.</p>
        </div>
        <div className={styles.headingActions}>
          <div className={styles.exportGroup} role="group" aria-label="Kayıtları dışa aktar">
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
                title={`Ekrandaki filtreye uyan kayıtları ${label} olarak indir`}
              >
                <Download size={15} aria-hidden="true" />
                {exporting === fmt ? 'Hazırlanıyor…' : label}
              </button>
            ))}
          </div>
          <button className={styles.cta} onClick={() => openForm()}>
            <Plus size={18} /> Kayıt ekle
          </button>
        </div>
      </div>

      <section className={styles.registry}>
        <div className={styles.registryToolbar}>
          <label><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Kayıtlarda ara" /></label>
          <div className={styles.filterChips}>
            <button className={!filters.type ? styles.activeChip : ''} onClick={() => setFilters(current => ({ ...current, type: '' }))}>Tümü</button>
            {['payment', 'receivable', 'promissory_note', 'shipment', 'task'].map(type => <button key={type} className={filters.type === type ? styles.activeChip : ''} onClick={() => setFilters(current => ({ ...current, type }))}>{typeLabels[type]}</button>)}
          </div>
          <Select aria-label="Durum filtresi" placeholder="Tüm durumlar" options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} value={filters.status} onChange={v => setFilters(current => ({ ...current, status: v }))} />
        </div>

        <div className={styles.tableHead}><span>Kayıt</span><span>Tür</span><span>Güncelleme</span><span>Durum</span><span /></div>
        {loading ? <div className={styles.tableState}>Kayıtlar yükleniyor…</div> : visibleRecords.length === 0 ? (
          <div className={styles.tableState}><CalendarDays size={30} /><strong>{records.length ? 'Aramayla eşleşen kayıt yok' : 'Henüz işletme kaydı yok'}</strong><span>{records.length ? 'Arama veya filtreyi değiştirin.' : 'İlk kaydı ekleyerek işletme takibini başlatın.'}</span></div>
        ) : <div className={styles.recordTable}>{visibleRecords.map(record => (
          <article
            className={`${styles.tableRow} ${overdueIds.has(record.id) ? styles.overdueRow : ''}`}
            key={record.id}
            role="button"
            tabIndex={0}
            onClick={() => setDetayId(record.id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetayId(record.id) } }}
          >
            <div><strong>{record.title}</strong><small>{record.description || record.contact?.name || (record.amount !== null ? money(record.amount, record.currency) : 'Açıklama eklenmedi')}</small></div>
            <span>{typeLabels[record.type] || record.type}</span>
            <span>{localDate(record.updatedAt || record.dueAt || record.createdAt)}</span>
            <button className={`${styles.rowStatus} ${styles[record.status] || ''} ${overdueIds.has(record.id) ? styles.late : ''}`} onClick={e => { e.stopPropagation(); setStatus(record.id, record.status === 'completed' ? 'open' : 'completed') }}><Check size={13} />{overdueIds.has(record.id) ? 'Gecikti' : statusLabels[record.status] || record.status}</button>
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
              <div><h3>Yeni takip kaydı</h3><p>Günü geldiğinde gözden kaçmaması gereken işi kaydedin.</p></div>
              <button aria-label="Kapat" onClick={() => setShowForm(false)}><X /></button>
            </div>
            <form onSubmit={createRecord}>
              <div className={styles.grid}>
                <label>Tür
                  <Select aria-label="Kayıt türü" options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} value={form.type} onChange={v => setForm(current => ({ ...current, type: v }))} />
                </label>
                <label>Yön
                  <Select aria-label="Yön" options={[{ value: 'payable', label: 'Ödenecek' }, { value: 'receivable', label: 'Tahsil edilecek' }, { value: 'neutral', label: 'Finansal değil' }]} value={form.direction} onChange={v => setForm(current => ({ ...current, direction: v }))} />
                </label>
              </div>
              <label>Başlık
                <input required maxLength={240} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Örn. Tedarikçi senedi" />
              </label>
              <label>Açıklama
                <textarea rows={3} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} />
              </label>
              <div className={styles.grid}>
                <label>Tutar
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} />
                </label>
                <label>Son tarih
                  <input type="datetime-local" value={form.dueAt} onChange={event => setForm(current => ({ ...current, dueAt: event.target.value }))} />
                </label>
              </div>
              <label>Tekrarlama
                <Select aria-label="Tekrarlama" options={[{ value: '', label: 'Tekrarlanmaz' }, { value: 'weekly', label: 'Her hafta' }, { value: 'monthly', label: 'Her ay' }, { value: 'quarterly', label: 'Her 3 ayda' }, { value: 'yearly', label: 'Her yıl' }]} value={form.recurrenceRule} onChange={v => setForm(current => ({ ...current, recurrenceRule: v }))} />
              </label>
              <div className={styles.actions}>
                <button type="button" className={styles.secondary} onClick={() => setShowForm(false)}>Vazgeç</button>
                <button type="submit" className={styles.primary} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydı oluştur'}</button>
              </div>
            </form>
          </div>
        </div>
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
