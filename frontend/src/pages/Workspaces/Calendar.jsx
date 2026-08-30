import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import styles from './Calendar.module.css'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'
import { formatCurrency, formatDate } from '@/utils/formatters'

const typeKeys = {
  payment: 'payment', receivable: 'receivable', promissory_note: 'promissoryNote',
  purchase: 'purchase', shipment: 'shipment', task: 'task', deferred: 'deferred', other: 'other'
}

function monthRange(anchor) {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999)
  return { from, to }
}

export default function WorkspaceCalendar() {
  const { t } = useTranslation('workspace')
  const { formatLocale } = useLocalization()
  const money = value => formatCurrency(value || 0, { locale: formatLocale, currency: 'TRY' })
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
      toast.error(error.message || t('calendar.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [range, t, toast, workspaceId])

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
        <div><h2>{t('calendar.title')}</h2><p>{t('calendar.subtitle')}</p></div>
        <div className={styles.navigation}>
          <button aria-label={t('calendar.prevMonth')} onClick={() => setAnchor(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ChevronLeft /></button>
          <strong>{formatDate(anchor, { locale: formatLocale, month: 'long', year: 'numeric' })}</strong>
          <button aria-label={t('calendar.nextMonth')} onClick={() => setAnchor(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ChevronRight /></button>
        </div>
      </div>
      <div className={styles.metrics}>
        <span><small>{t('calendar.totalRecords')}</small><strong>{data.totals.records}</strong></span>
        <span><small>{t('calendar.payable')}</small><strong>{money(data.totals.payable)}</strong></span>
        <span><small>{t('calendar.receivable')}</small><strong>{money(data.totals.receivable)}</strong></span>
        <span><small>{t('calendar.net')}</small><strong>{money(data.totals.receivable - data.totals.payable)}</strong></span>
      </div>
      {loading ? <div className={styles.empty}>{t('calendar.loading')}</div> : (
        <div className={styles.calendar}>
          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(key => <div className={styles.weekday} key={key}>{t(`calendar.weekday.${key}`)}</div>)}
          {days.map((item, index) => item === null ? <div className={styles.blank} key={`blank-${index}`} /> : (
            <article className={styles.day} key={item.key}>
              <strong>{item.day}</strong>
              <div className={styles.events}>
                {item.records.slice(0, 4).map(record => (
                  <div className={`${styles.event} ${styles[record.direction] || ''}`} key={record.id}>
                    <small>{typeKeys[record.type] ? t(`type.${typeKeys[record.type]}`) : record.type}</small>
                    <span>{record.title}</span>
                    {record.amount != null && <b>{money(record.amount)}</b>}
                  </div>
                ))}
                {item.records.length > 4 && <small className={styles.more}>{t('calendar.moreRecords', { count: item.records.length - 4 })}</small>}
              </div>
            </article>
          ))}
        </div>
      )}
      {data.totals.records === 0 && !loading && <div className={styles.empty}><CalendarDays size={38} />{t('calendar.monthEmpty')}</div>}
    </section>
  )
}
