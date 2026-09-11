import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '@/components/ui/Button'
import { FinanceField, financeMoney, financeCategory, financeRequest, useFinanceText } from './Finance'
import styles from './Finance.module.css'

export function FinanceOverview() {
  const text = useFinanceText(); const { workspaceId } = useParams()
  const [accounts, setAccounts] = useState(null); const [deadlines, setDeadlines] = useState(null)
  const [error, setError] = useState(''); const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true; setError('')
    Promise.all([financeRequest(workspaceId, 'accounts'), financeRequest(workspaceId, 'finance/deadlines')])
      .then(([a, d]) => { if (active) { setAccounts(a.accounts); setDeadlines(d) } })
      .catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [workspaceId, revision])
  return <section className={styles.page} aria-label={text('Nakit ve yaklaşan yükümlülükler', 'Cash and upcoming obligations')}>
    <h3>{text('Bugünkü kasa / banka durumu', 'Cash / bank position today')}</h3>
    {error && <div role="alert">{error} <Button onClick={() => setRevision(v => v + 1)}>{text('Tekrar dene', 'Retry')}</Button></div>}
    {!accounts && !error && <p role="status">{text('Yükleniyor…', 'Loading…')}</p>}
    {accounts?.length === 0 && <p>{text('Canlı bakiyeyi görmek için kasa veya banka hesabı ekleyin.', 'Add a cash or bank account to see its live balance.')}</p>}
    {accounts?.map(a => <p key={a.id}>{a.name}: {financeMoney(a.balance, a.currency)} · {text('Valör bekleyen', 'Awaiting settlement')}: {financeMoney(a.inTransit, a.currency)}</p>)}
    <Link to={`/app/workspaces/${workspaceId}/accounts`}>{text('Kasa / Banka hesaplarını aç', 'Open cash / bank accounts')}</Link>
    <h3>{text('Vergi / SGK — geciken ve 30 gün içinde yaklaşan', 'Tax / social security — overdue and next 30 days')}</h3>
    {deadlines && <><p>{deadlines.notice}</p>{deadlines.records.length === 0 ? <p>{text('Bu aralıkta kayıtlı hatırlatma yok. Vergi profilinizi işletme ayarlarından oluşturabilirsiniz.', 'No reminders in this period. Configure your tax profile in business settings.')}</p> : <ul>{deadlines.records.map(r => <li key={r.id}><Link to={`/app/workspaces/${workspaceId}/tracker?record=${r.id}`}>{r.title}</Link> · {new Date(r.dueAt).toLocaleDateString(text('tr-TR', 'en-GB'))}</li>)}</ul>}</>}
  </section>
}

export function MonthlyFinance() {
  const text = useFinanceText(); const { workspaceId } = useParams()
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [data, setData] = useState(null); const [error, setError] = useState('')
  useEffect(() => {
    let active = true; setData(null); setError('')
    financeRequest(workspaceId, `finance/monthly?month=${encodeURIComponent(month)}`).then(d => { if (active) setData(d) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [workspaceId, month])
  const currencies = [...new Set([...Object.keys(data?.current.currencies || {}), ...Object.keys(data?.previous.currencies || {})])]
  return <section className={styles.page}><h3>{text('Aylık gelir / gider', 'Monthly income / expenses')}</h3>
    <p>{text('Tamamlanan kayıtlara göre nakit esaslı özet. Kredi anaparası, transfer ve sermaye hariçtir. Muhasebesel kâr değildir.', 'Cash-basis summary of completed records, excluding loan principal, transfers and capital. This is not accounting profit.')}</p>
    <FinanceField label={text('Ay', 'Month')} type="month" value={month} required onChange={e => { if (e.target.value) setMonth(e.target.value) }} />
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">{text('Yükleniyor…', 'Loading…')}</p>}
    {data && currencies.length === 0 && <p>{text('Bu dönemlerde tamamlanan gelir / gider kaydı yok.', 'No completed income or expense records for these periods.')}</p>}
    {currencies.map(c => { const current = data.current.currencies[c] || { income: 0, expense: 0, net: 0 }; const previous = data.previous.currencies[c] || { net: 0 }
      return <div key={c} className={styles.item}><h4>{c}</h4><div className={styles.scroll}><table className={styles.table}><thead><tr>
        {[text('Gelir', 'Income'), text('Gider', 'Expenses'), text('Net', 'Net'), text('Önceki ay net', 'Previous month net')].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody><tr>{[current.income, current.expense, current.net, previous.net].map((v, i) => <td key={i}>{financeMoney(v, c)}</td>)}</tr></tbody></table></div>
        <ul>{data.current.categories.filter(g => g.currency === c && ['payable', 'receivable'].includes(g.direction)).map(g => <li key={`${g.category}-${g.direction}`}>{financeCategory(g.category, text)} · {g.direction === 'payable' ? text('Gider', 'Expense') : text('Gelir', 'Income')}: {financeMoney(g.amount, c)}</li>)}</ul>
      </div> })}
  </section>
}

export function RenewalPanel({ onSaved }) {
  const text = useFinanceText(); const { workspaceId } = useParams()
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('')
  const [key, setKey] = useState(() => crypto.randomUUID())
  async function save(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true)
    try { await financeRequest(workspaceId, 'renewals', { template: form.get('template'), dueAt: `${form.get('date')}T09:00:00+03:00`, yearly: form.get('yearly') === 'on', requestKey: key });
      setKey(crypto.randomUUID()); setMessage(text('Hatırlatma kaydedildi.', 'Reminder saved.')); onSaved?.() }
    catch (e) { setMessage(e.message) } finally { setBusy(false) }
  }
  return <details className={styles.item}><summary>{text('Yenileme hatırlatması ekle', 'Add renewal reminder')}</summary><form className={styles.form} onSubmit={save}>
    <FinanceField label={text('Belge', 'Document')}><select name="template">{Object.entries({ tax_certificate: text('Vergi levhası kontrolü', 'Tax certificate review'), business_license: text('İşyeri ruhsatı kontrolü', 'Business licence review'), vehicle_inspection: text('Araç muayenesi', 'Vehicle inspection'), insurance: text('Sigorta', 'Insurance'), comprehensive_insurance: text('Kasko', 'Comprehensive insurance') }).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></FinanceField>
    <FinanceField label={text('Belgenizdeki tarih', 'Date on your document')} type="date" name="date" required />
    <FinanceField label={text('Her yıl tekrarla (belgenizin süresini teyit edin)', 'Repeat yearly (verify your document’s validity)')} type="checkbox" name="yearly" />
    <Button type="submit" disabled={busy}>{text('Hatırlatma ekle', 'Add reminder')}</Button>{message && <p role="status">{message}</p>}
  </form></details>
}

export function TaxProfilePanel() {
  const text = useFinanceText(); const { workspaceId } = useParams()
  const [profile, setProfile] = useState(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { let active = true; financeRequest(workspaceId, 'tax-profile').then(d => { if (active) setProfile(d.profile) }).catch(e => { if (active) setMessage(e.message) }); return () => { active = false } }, [workspaceId])
  async function save(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage('')
    const deadlines = ['vat', 'withholding', 'provisional', 'sgk', 'bagkur'].filter(k => form.get(k)).map(kind => ({ kind, firstDueAt: `${form.get(kind)}T09:00:00+03:00` }))
    try { const d = await financeRequest(workspaceId, 'tax-profile', { taxpayerType: form.get('taxpayerType'), vatPeriod: form.get('vatPeriod'), hasEmployees: form.get('hasEmployees') === 'on', bagkur: form.get('hasBagkur') === 'on', year: Number(form.get('year')), deadlines });
      setMessage(text(`${d.created} hatırlatma eklendi. Mevcut tarihler korunur; düzeltmek için Kayıtlar’ı kullanın.`, `${d.created} reminders added. Existing dates remain unchanged; edit them in Records.`)) }
    catch (e) { setMessage(e.message) } finally { setBusy(false) }
  }
  return <section className={styles.page}><h3>{text('Vergi ve SGK hatırlatmaları', 'Tax and insurance reminders')}</h3>
    <p>{text('İlk tarihleri GİB ve SGK’dan teyit ederek girin. Sonraki dönemler planlama amaçlı üretilir; tatil ve süre uzatımları otomatik uygulanmaz. Her hatırlatmada tarihi yeniden teyit edin.', 'Confirm initial dates with GİB and SGK. Later periods are planning projections; holidays and deadline extensions are not applied automatically. Reconfirm each deadline.')}</p>
    <p><a href="https://gib.gov.tr/vergi-takvimi" target="_blank" rel="noreferrer">GİB — {text('Vergi takvimi', 'Tax calendar')}</a> · <a href="https://www.sgk.gov.tr" target="_blank" rel="noreferrer">SGK</a></p>
    {profile && <form className={styles.form} onSubmit={save}>
      <FinanceField label={text('Mükellefiyet', 'Taxpayer type')}><select name="taxpayerType" defaultValue={profile.taxpayerType || 'individual'}><option value="individual">{text('Şahıs', 'Individual')}</option><option value="limited">{text('Limited', 'Limited company')}</option></select></FinanceField>
      <FinanceField label={text('KDV dönemi', 'VAT period')}><select name="vatPeriod" defaultValue={profile.vatPeriod || 'monthly'}><option value="monthly">{text('Aylık', 'Monthly')}</option><option value="quarterly">{text('3 aylık (uygunluğunuzu teyit edin)', 'Quarterly (verify eligibility)')}</option></select></FinanceField>
      <FinanceField label={text('SGK’lı personel var', 'Has insured staff')} type="checkbox" name="hasEmployees" defaultChecked={profile.hasEmployees} />
      <FinanceField label={text('Bağ-Kur yükümlülüğü var', 'Has Bağ-Kur obligation')} type="checkbox" name="hasBagkur" defaultChecked={profile.bagkur} />
      <FinanceField label={text('Takvim yılı', 'Calendar year')} type="number" name="year" defaultValue={new Date().getFullYear()} min="2026" max="2100" required />
      {Object.entries({ vat: 'KDV', withholding: 'Muhtasar', provisional: text('Geçici vergi', 'Provisional tax'), sgk: 'SGK', bagkur: 'Bağ-Kur' }).map(([kind, label]) => <FinanceField key={kind} label={`${label} — ${text('ilk teyit edilen tarih (uygunsa)', 'first confirmed date (if applicable)')}`} type="date" name={kind} defaultValue={profile.deadlines?.find(d => d.kind === kind)?.firstDueAt.slice(0, 10)} />)}
      <div className={styles.actions}><Button type="submit" disabled={busy}>{text('Profili kaydet ve takvime ekle', 'Save profile and add to calendar')}</Button></div>
    </form>}{message && <p role="status">{message}</p>}
  </section>
}
