import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BarChart3, Download, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { useLocalization } from '@/context/LocalizationContext'
import { formatCurrency } from '@/utils/formatters'
import { MonthlyFinance } from './FinancePanels'
import styles from './Rapor.module.css'

/*
 * RAPOR — İşletme Takibi'nin dönem raporu (Faz 2, 15.09.2026).
 *
 * Ürün sahibi: "günlük haftalık aylık rapor alabilmeli, hiçbiri
 * birbirinden farklı olmamalı." Bu sayfa `tracker/report` ucunu okur;
 * Genel Bakış ve mobil de aynı tanımları (tracker-periods.ts) kullanır.
 * Sayfa hesap YAPMAZ, yalnız gösterir; XLSX/PDF de aynı uçtan üretilir.
 *
 * Gerçekleşen = tamamlanmış kayıtlar + pazaryeri siparişleri (o dönemde
 * verilen). Plan (30 gün) bu sayfada yok; o Genel Bakış'ta.
 */

const DONEMLER = ['today', 'week', 'month']

export default function Rapor() {
  const { workspaceId } = useParams()
  const { t } = useTranslation(['workspace', 'common'])
  const toast = useToast()
  const { formatLocale } = useLocalization()
  const [donem, setDonem] = useState('month')
  const [ozel, setOzel] = useState({ from: '', to: '' })
  const [rapor, setRapor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [indiriliyor, setIndiriliyor] = useState(null)

  const secim = donem === 'custom'
    ? (ozel.from && ozel.to && ozel.from <= ozel.to ? { from: ozel.from, to: ozel.to } : null)
    : { period: donem }

  const yukle = useCallback(async () => {
    if (!secim) return
    setLoading(true); setError(null)
    try {
      setRapor(await api.workspace.tracker.report(workspaceId, secim))
    } catch (err) {
      setError(err.message || t('common:errors.generic'))
    } finally {
      setLoading(false)
    }
  }, [workspaceId, donem, ozel.from, ozel.to]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { yukle() }, [yukle])

  const money = value => formatCurrency(value ?? 0, { locale: formatLocale, currency: rapor?.currency || 'TRY' })
  const gun = iso => new Date(iso).toLocaleDateString(formatLocale, { timeZone: 'Europe/Istanbul', day: '2-digit', month: 'short' })
  const ayrica = p => p?.otherCurrencies?.length
    ? ' ' + t('workspace:report.alsoOther', { list: p.otherCurrencies.map(o => `${o.amount.toLocaleString(formatLocale)} ${o.currency}`).join(', ') })
    : ''

  async function indir(format) {
    if (!secim) return
    setIndiriliyor(format)
    try {
      await api.workspace.exports.downloadReport(workspaceId, format, secim)
    } catch (err) {
      toast.error(err.message || t('common:errors.exportFailed'))
    } finally {
      setIndiriliyor(null)
    }
  }

  const toplam = rapor?.totals

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h2><BarChart3 size={20} aria-hidden="true" /> {t('workspace:report.title')}</h2>
          <p>{t('workspace:report.subtitle')}</p>
        </div>
        <div className={styles.indir}>
          <button type="button" onClick={() => indir('xlsx')} disabled={!rapor || indiriliyor !== null}><Download size={14} /> Excel</button>
          <button type="button" onClick={() => indir('pdf')} disabled={!rapor || indiriliyor !== null}><Download size={14} /> PDF</button>
        </div>
      </header>

      {/* Dönem çipleri: takvim günü / haftası (Pzt–Paz) / ayı, İstanbul. */}
      <div className={styles.donemler} role="tablist" aria-label={t('workspace:report.periodAria')}>
        {DONEMLER.map(d => (
          <button key={d} type="button" role="tab" aria-selected={donem === d} className={donem === d ? styles.secili : ''} onClick={() => setDonem(d)}>
            {t(`workspace:report.period.${d}`)}
          </button>
        ))}
        <button type="button" role="tab" aria-selected={donem === 'custom'} className={donem === 'custom' ? styles.secili : ''} onClick={() => setDonem('custom')}>
          {t('workspace:report.period.custom')}
        </button>
        {donem === 'custom' && (
          <span className={styles.ozelAralik}>
            <input type="date" value={ozel.from} onChange={e => setOzel(o => ({ ...o, from: e.target.value }))} aria-label={t('workspace:report.from')} />
            <span>–</span>
            <input type="date" value={ozel.to} onChange={e => setOzel(o => ({ ...o, to: e.target.value }))} aria-label={t('workspace:report.to')} />
          </span>
        )}
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {rapor && toplam && (
        <>
          <p className={styles.aralik}>
            {gun(rapor.period.from)} – {gun(new Date(new Date(rapor.period.to).getTime() - 1).toISOString())}
            {rapor.estimated && (
              <span className={styles.tahmini} title={t('workspace:report.estimatedHint')}>
                <Info size={12} aria-hidden="true" /> {t('workspace:report.estimated')} · <Link to="/app/settings?bolum=integrations">{t('workspace:report.fixInSettings')}</Link>
              </span>
            )}
          </p>

          <div className={styles.toplamlar}>
            <article><span>{t('workspace:report.rows.collected')}</span><strong>{money(toplam.tahsilat.amount)}</strong><small>{t('workspace:report.recordCount', { count: toplam.kayitSayisi?.tahsilat ?? 0 })}{ayrica(toplam.tahsilat)}</small></article>
            <article><span>{t('workspace:report.rows.paid')}</span><strong>{money(toplam.odeme.amount)}</strong><small>{t('workspace:report.recordCount', { count: toplam.kayitSayisi?.odeme ?? 0 })}{ayrica(toplam.odeme)}</small></article>
            <article><span>{t('workspace:report.rows.marketplaceGross')}</span><strong>{money(toplam.pazaryeriBrut.amount)}</strong><small>{t('workspace:report.orderCount', { count: toplam.siparisSayisi })}{ayrica(toplam.pazaryeriBrut)}</small></article>
            <article><span>{t('workspace:report.rows.marketplaceNet')}</span><strong>{money(toplam.pazaryeriNet.amount)}</strong><small>{t('workspace:report.rows.returns')}: {money(toplam.iade.amount)}</small></article>
            <article className={toplam.net < 0 ? styles.negatif : styles.pozitif}><span>{t('workspace:report.rows.net')}</span><strong>{money(toplam.net)}</strong><small>{t('workspace:report.netHint')}</small></article>
          </div>

          <div className={styles.tabloSar}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{rapor.granularity === 'day' ? t('workspace:report.day') : t('workspace:report.weekOf')}</th>
                  <th scope="col" className={styles.sayi}>{t('workspace:report.rows.collected')}</th>
                  <th scope="col" className={styles.sayi}>{t('workspace:report.rows.paid')}</th>
                  <th scope="col" className={styles.sayi}>{t('workspace:report.rows.marketplaceGross')}</th>
                  <th scope="col" className={styles.sayi}>{t('workspace:report.rows.marketplaceNet')}</th>
                  <th scope="col" className={styles.sayi}>{t('workspace:report.rows.returns')}</th>
                  <th scope="col" className={styles.sayi}>{t('workspace:report.rows.net')}</th>
                </tr>
              </thead>
              <tbody>
                {rapor.rows.map(r => {
                  const bos = !r.tahsilat && !r.odeme && !r.siparisSayisi
                  return (
                    <tr key={r.key} className={bos ? styles.bosSatir : ''}>
                      <th scope="row">{gun(r.from)}</th>
                      <td className={styles.sayi}>{bos ? '—' : money(r.tahsilat)}</td>
                      <td className={styles.sayi}>{bos ? '—' : money(r.odeme)}</td>
                      <td className={styles.sayi}>{bos ? '—' : money(r.pazaryeriBrut)}</td>
                      <td className={styles.sayi}>{bos ? '—' : money(r.pazaryeriNet)}</td>
                      <td className={styles.sayi}>{bos ? '—' : money(r.iade)}</td>
                      <td className={`${styles.sayi} ${r.net < 0 ? styles.negatifMetin : ''}`}>{bos ? '—' : money(r.net)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {loading && !rapor && <p className={styles.state}>{t('common:states.loading')}</p>}

      {/* Aylık finans (gelir/gider kategorileri) aynı "gerçekleşen" filtresini
          kullanır; bu sayfada dursun ki iki rakam yan yana okunsun. */}
      <MonthlyFinance />
    </section>
  )
}
