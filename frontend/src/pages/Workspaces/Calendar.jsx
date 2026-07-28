import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import styles from './Calendar.module.css'

const typeLabels = {
  payment: 'Ödeme', receivable: 'Tahsilat', promissory_note: 'Senet',
  purchase: 'Alım', shipment: 'Kargo', task: 'Yapılacak',
  deferred: 'Ertelenen', other: 'Diğer'
}

function monthRange(anchor) {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999)
  return { from, to }
}

function money(value) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0)
}

export default function WorkspaceCalendar() {
  const { workspaceId } = useParams()
  const toast = useToast()
  const [anchor, setAnchor] = useState(() => new Date())
  const [data, setData] = useState({ days: {}, totals: { records: 0, payable: 0, receivable: 0 } })
  const [loading, setLoading] = useState(true)
  const range = useMemo(() => monthRange(anchor), [anchor])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.workspace.tracker.calendar(workspaceId, range.from.toISOString(), range.to.toISOString()))
    } catch (error) {
      toast.error(error.message || 'Takvim yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [range, toast, workspaceId])

  useEffect(() => { load() }, [load])

  const days = useMemo(() => {
    const firstWeekday = (range.from.getDay() + 6) % 7
    const result = Array(firstWeekday).fill(null)
    for (let day = 1; day <= range.to.getDate(); day += 1) {
      const date = new Date(anchor.getFullYear(), anchor.getMonth(), day)
      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(day).padStart(2, '0')
      ].join('-')
      result.push({ day, key, records: data.days[key] || [] })
    }
    return result
  }, [anchor, data.days, range])

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div><h2>İşletme Takvimi</h2><p>Ödeme, tahsilat, senet, kargo ve görev tarihlerini birlikte görün.</p></div>
        <div className={styles.navigation}>
          <button aria-label="Önceki ay" onClick={() => setAnchor(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ChevronLeft /></button>
          <strong>{anchor.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</strong>
          <button aria-label="Sonraki ay" onClick={() => setAnchor(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ChevronRight /></button>
        </div>
      </div>
      <div className={styles.metrics}>
        <span><small>Toplam kayıt</small><strong>{data.totals.records}</strong></span>
        <span><small>Ödenecek</small><strong>{money(data.totals.payable)}</strong></span>
        <span><small>Tahsil edilecek</small><strong>{money(data.totals.receivable)}</strong></span>
        <span><small>Net</small><strong>{money(data.totals.receivable - data.totals.payable)}</strong></span>
      </div>
      {loading ? <div className={styles.empty}>Takvim yükleniyor…</div> : (
        <div className={styles.calendar}>
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(label => <div className={styles.weekday} key={label}>{label}</div>)}
          {days.map((item, index) => item === null ? <div className={styles.blank} key={`blank-${index}`} /> : (
            <article className={styles.day} key={item.key}>
              <strong>{item.day}</strong>
              <div className={styles.events}>
                {item.records.slice(0, 4).map(record => (
                  <div className={`${styles.event} ${styles[record.direction] || ''}`} key={record.id}>
                    <small>{typeLabels[record.type] || record.type}</small>
                    <span>{record.title}</span>
                    {record.amount != null && <b>{money(record.amount)}</b>}
                  </div>
                ))}
                {item.records.length > 4 && <small className={styles.more}>+{item.records.length - 4} kayıt</small>}
              </div>
            </article>
          ))}
        </div>
      )}
      {data.totals.records === 0 && !loading && <div className={styles.empty}><CalendarDays size={38} />Bu ay için tarihli kayıt bulunmuyor.</div>}
    </section>
  )
}
