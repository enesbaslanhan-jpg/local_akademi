import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, CalendarDays, Check, Package, Plus, WalletCards, X,
  Receipt, HandCoins, FileSignature, Truck
} from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { Select } from '@/components/ui'
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
 *
 * Mockup'taki "Hızlı Rapor" BURADA YOK: backend'de rapor/dışa aktarım
 * endpoint'i bulunmuyor, karşılığı olmayan aksiyon eklenmedi. Özet rakamlar
 * zaten hemen altındaki KPI şeridinde ve Genel Bakış sekmesinde.
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
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
          <h2>İşletme Takibi</h2>
          <p>Ödemeleri, tahsilatları, senetleri, alımları ve kargo günlerini tek yerde izleyin.</p>
        </div>
        {/* Sayfanın TEK turuncu ana CTA'sı. Kayıt yokken boş durumdaki
            "İlk kaydı ekle" turuncu olduğu için bu düğme gizlenir —
            sayfada aynı anda iki turuncu bulunmaz. */}
        {records.length > 0 && (
          <button className={styles.cta} onClick={() => openForm()}>
            <Plus size={18} /> Yeni kayıt
          </button>
        )}
      </div>

      {/* Hızlı aksiyon şeridi — mevcut kayıt akışını tür ön seçimiyle açar. */}
      <div className={styles.quickStrip} role="group" aria-label="Hızlı kayıt oluştur">
        {QUICK_ACTIONS.map(action => {
          const ActionIcon = action.icon
          return (
            <button
              key={action.id}
              type="button"
              className={styles.quickCard}
              onClick={() => openForm(action.preset)}
            >
              <ActionIcon size={19} aria-hidden="true" />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>

      <div className={styles.metrics}>
        <Metric icon={<CalendarDays />} label="Açık kayıt" value={summary?.counts.open ?? 0} />
        <Metric icon={<AlertTriangle />} label="Geciken" value={summary?.counts.overdue ?? 0} danger />
        <Metric icon={<WalletCards />} label="30 günlük net" value={money(summary?.nextThirtyDays.net ?? 0)} />
        <Metric icon={<Package />} label="Bekleyen kargo" value={summary?.counts.shipments ?? 0} />
      </div>

      <div className={styles.toolbar}>
        <Select aria-label="Durum filtresi" placeholder="Tüm durumlar" options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} value={filters.status} onChange={v => setFilters(current => ({ ...current, status: v }))} />
        <Select aria-label="Kayıt türü filtresi" placeholder="Tüm kayıt türleri" options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} value={filters.type} onChange={v => setFilters(current => ({ ...current, type: v }))} />
      </div>

      {loading ? (
        <div className={styles.empty}>Kayıtlar yükleniyor…</div>
      ) : records.length === 0 ? (
        <div className={styles.empty}>
          <CalendarDays size={40} />
          <h3>Henüz takip kaydı yok</h3>
          <p>İlk ödeme, tahsilat veya yapılacak işinizi ekleyerek başlayın.</p>
          {/* Boş durumda sayfanın tek turuncu CTA'sı burası */}
          <button className={styles.cta} onClick={() => openForm()}><Plus size={17} /> İlk kaydı ekle</button>
        </div>
      ) : (
        <div className={styles.list}>
          {records.map(record => (
            <article className={`${styles.record} ${overdueIds.has(record.id) ? styles.overdue : ''}`} key={record.id}>
              <div className={styles.recordMain}>
                <div className={styles.badges}>
                  <span className={styles.type}>{typeLabels[record.type] || record.type}</span>
                  <span className={`${styles.status} ${styles[record.status] || ''}`}>{statusLabels[record.status] || record.status}</span>
                  {overdueIds.has(record.id) && <span className={styles.late}>Gecikti</span>}
                </div>
                <h3>{record.title}</h3>
                <p>{record.description || record.contact?.name || 'Açıklama eklenmedi.'}</p>
              </div>
              <div className={styles.recordSide}>
                {record.amount !== null && <strong>{money(record.amount, record.currency)}</strong>}
                <span>{localDate(record.dueAt)}</span>
                <button
                  className={record.status === 'completed' ? styles.reopen : styles.complete}
                  onClick={() => setStatus(record.id, record.status === 'completed' ? 'open' : 'completed')}
                >
                  <Check size={15} /> {record.status === 'completed' ? 'Yeniden aç' : 'Tamamla'}
                </button>
              </div>
            </article>
          ))}
        </div>
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
