import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import Select from '@/components/ui/Select'
import styles from './Calendar.module.css'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'
import { formatCurrency, formatDate } from '@/utils/formatters'

const typeKeys = {
  payment: 'payment', receivable: 'receivable', promissory_note: 'promissoryNote', cheque: 'cheque',
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

  const bugun = useMemo(() => new Date(), [])
  const buAyAcik = anchor.getFullYear() === bugun.getFullYear() && anchor.getMonth() === bugun.getMonth()

  /* Ay adları çeviri dosyasına KOPYALANMIYOR: tarih biçimleyici zaten
     kullanıcının diline göre veriyor. İkinci bir liste tutmak, dil
     eklendiğinde güncellenmeyi unutulacak bir yer daha demekti. */
  const ayLari = useMemo(() => Array.from({ length: 12 }, (_, ay) => ({
    value: String(ay),
    label: formatDate(new Date(2000, ay, 1), { locale: formatLocale, month: 'long' }),
  })), [formatLocale])

  /*
   * ⚠️ Yıl aralığı VERİDEN türetilemiyor: sunucu yalnız açık ayı
   * döndürüyor, en eski/en yeni kaydın yılı burada bilinmiyor. Bu
   * yüzden bugüne göre makul bir pencere veriliyor — geriye beş yıl
   * (geçmiş kayıtlar incelenir), ileriye iki yıl (vade ve senetler
   * ileri tarihli olabilir).
   *
   * ⚠️ Açık olan yıl pencerenin dışındaysa yine de listeye giriyor;
   * aksi hâlde seçici kendi gösterdiği yılı seçeneklerinde bulamaz ve
   * boş görünürdü.
   */
  const yillar = useMemo(() => {
    const buYil = bugun.getFullYear()
    const kume = new Set([anchor.getFullYear()])
    for (let yil = buYil - 5; yil <= buYil + 2; yil += 1) kume.add(yil)
    return [...kume].sort((a, b) => b - a).map(yil => ({ value: String(yil), label: String(yil) }))
  }, [anchor, bugun])

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
        {/*
          * 🔴 AY VE YIL SEÇİLEMİYORDU — yalnız tek tek ileri/geri.
          *
          * Ürün sahibi bildirdi (09.09.2026): bir yıl öncesine gitmek
          * için oka on iki kez basmak gerekiyordu. Ödeme, tahsilat ve
          * senet tarihleri geriye dönük incelenen şeyler; takvimin
          * geçmişe gitmesi istisna değil olağan kullanım.
          *
          * Oklar KALDIRILMADI: komşu aya geçmek en sık yapılan hareket
          * ve tek tıkla olmalı. Seçiciler onun yerine değil yanına.
          */}
        <div className={styles.navigation}>
          <button aria-label={t('calendar.prevMonth')} onClick={() => setAnchor(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ChevronLeft /></button>
          <Select
            aria-label={t('calendar.monthLabel')}
            options={ayLari}
            value={String(anchor.getMonth())}
            onChange={ay => setAnchor(value => new Date(value.getFullYear(), Number(ay), 1))}
          />
          <Select
            aria-label={t('calendar.yearLabel')}
            options={yillar}
            value={String(anchor.getFullYear())}
            onChange={yil => setAnchor(value => new Date(Number(yil), value.getMonth(), 1))}
          />
          <button aria-label={t('calendar.nextMonth')} onClick={() => setAnchor(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ChevronRight /></button>
          {/* Uzağa gidildikten sonra dönüş yolu; bu ay açıkken gereksiz. */}
          {!buAyAcik && (
            <button type="button" className={styles.today} onClick={() => setAnchor(new Date(bugun.getFullYear(), bugun.getMonth(), 1))}>
              {t('calendar.today')}
            </button>
          )}
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
