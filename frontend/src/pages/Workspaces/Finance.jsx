import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import Button from '@/components/ui/Button'
import styles from './Finance.module.css'

export function useFinanceText() {
  const { i18n } = useTranslation()
  return (tr, en) => i18n.language.startsWith('en') ? en : tr
}
export const financeRequest = (workspaceId, path, body) => api.request(`/workspaces/${workspaceId}/${path}`,
  body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) })
const today = () => new Date().toISOString().slice(0, 10)
const iso = value => `${value}T09:00:00+03:00`
export const financeMoney = (value, currency) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value))
export const financeCategory = (category, text) => ({ sales: text('Satış', 'Sales'), supplies: text('Malzeme', 'Supplies'), rent: text('Kira', 'Rent'), utilities: text('Faturalar', 'Utilities'), salary: text('Maaş', 'Salary'), sgk: 'SGK', tax: text('Vergi', 'Tax'), loan_repayment: text('Kredi geri ödemesi', 'Loan repayment'), transfer: text('Transfer', 'Transfer'), capital: text('Sermaye', 'Capital') }[category] || text('Diğer', 'Other'))

export function FinanceField({ label, children, ...props }) {
  return <label className={styles.field}><span>{label}</span>{children || <input {...props} />}</label>
}

export default function Finance({ section }) {
  const text = useFinanceText()
  const { workspaceId } = useParams()
  const [data, setData] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID())
  const [revision, setRevision] = useState(0)
  const title = section === 'loans' ? text('Krediler', 'Loans') : section === 'accounts' ? text('Kasa / Banka', 'Cash / Bank') : text('Personel', 'Employees')
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setData([])
    financeRequest(workspaceId, section).then(result => { if (active) setData(result[section]) })
      .catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [workspaceId, section, revision])
  async function save(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const val = key => form.get(key)
    let payload
    if (section === 'loans') payload = { institution: val('name'), amount: Number(val('amount')), currency: val('currency'), installmentCount: Number(val('count')),
      installmentAmount: Number(val('installment')), firstPaymentAt: iso(val('date')), requestKey }
    else if (section === 'accounts') payload = { name: val('name'), type: val('type'), currency: val('currency'), openingBalance: Number(val('amount')), openingAt: iso(val('date')) }
    else payload = { name: val('name'), salaryAmount: Number(val('amount')), currency: val('currency'), startedAt: iso(val('date')), firstSalaryAt: iso(val('salaryDate')),
      insured: val('insured') === 'on', leaveAllowance: Number(val('leave')), requestKey,
      ...(val('premiumDate') ? { firstPremiumAt: iso(val('premiumDate')), premiumAmount: Number(val('premium')) } : {}) }
    setBusy(true); setError('')
    try { await financeRequest(workspaceId, section, payload); setOpen(false); setRequestKey(crypto.randomUUID()); setRevision(v => v + 1) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <section className={styles.page}>
    <header className={styles.heading}><div><h2>{title}</h2><p>{section === 'loans'
      ? text('Bankanın verdiği taksit planını kaydedin. Faiz hesaplanmaz; kredi açmak kasaya para girişi oluşturmaz.', 'Record your bank’s repayment plan. No interest is calculated; creating a loan does not credit cash.')
      : section === 'accounts' ? text('Açılış bakiyesi ve bu tarihten sonraki tamamlanan hareketler. Para birimleri ayrı tutulur.', 'Opening balances plus completed movements since opening. Currencies are kept separate.')
        : text('Maaş ve SGK tutarlarını siz girersiniz. Bordro ve prim hesaplanmaz.', 'You enter salary and insurance amounts. Payroll and contributions are not calculated.')}</p></div>
      <Button onClick={() => setOpen(v => !v)}>{open ? text('Vazgeç', 'Cancel') : text('Yeni ekle', 'Add new')}</Button></header>
    {error && <div role="alert" className={styles.error}>{error}<Button variant="secondary" onClick={() => setRevision(v => v + 1)}>{text('Yeniden dene', 'Retry')}</Button></div>}
    {open && <form onSubmit={save} className={styles.form}>
      <FinanceField label={section === 'loans' ? text('Kurum', 'Institution') : text('Ad', 'Name')} name="name" required maxLength={160} />
      {section === 'accounts' && <FinanceField label={text('Hesap türü', 'Account type')}><select name="type"><option value="cash">{text('Kasa', 'Cash')}</option><option value="bank">{text('Banka', 'Bank')}</option></select></FinanceField>}
      <FinanceField label={text('Para birimi', 'Currency')}><select name="currency">{['TRY', 'USD', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}</select></FinanceField>
      <FinanceField label={section === 'loans' ? text('Kredi anaparası', 'Loan principal') : section === 'accounts' ? text('Açılış bakiyesi', 'Opening balance') : text('Maaş tutarı', 'Salary amount')}
        name="amount" type="number" step="0.01" min={section === 'accounts' ? undefined : 0} required />
      <FinanceField label={section === 'loans' ? text('İlk taksit tarihi', 'First installment date') : section === 'accounts' ? text('Açılış tarihi', 'Opening date') : text('İşe giriş tarihi', 'Employment start')}
        name="date" type="date" defaultValue={today()} required />
      {section === 'loans' && <><FinanceField label={text('Taksit sayısı', 'Installment count')} name="count" type="number" min="1" max="360" defaultValue="12" required />
        <FinanceField label={text('Bankanın bildirdiği taksit tutarı', 'Installment amount supplied by bank')} name="installment" type="number" step="0.01" min="0.01" required /></>}
      {section === 'employees' && <>
        <FinanceField label={text('İlk maaş ödeme tarihi', 'First salary payment')} name="salaryDate" type="date" required />
        <FinanceField label={text('İzin hakkı (gün, manuel)', 'Leave allowance (days, manual)')} name="leave" type="number" min="0" max="366" step="0.5" defaultValue="0" required />
        <FinanceField label={text('SGK’lı çalışan', 'Insured employee')} name="insured" type="checkbox" />
        <FinanceField label={text('İlk SGK ödeme tarihi (SGK’dan teyit edin)', 'First contribution payment (verify with SGK)')} name="premiumDate" type="date" />
        <FinanceField label={text('SGK prim tutarı (manuel)', 'Contribution amount (manual)')} name="premium" type="number" step="0.01" min="0" />
      </>}
      <div className={styles.actions}><Button type="submit" disabled={busy}>{busy ? text('Kaydediliyor…', 'Saving…') : text('Kaydet', 'Save')}</Button></div>
    </form>}
    {loading ? <p role="status">{text('Yükleniyor…', 'Loading…')}</p> : !error && data.length === 0 ? <p className={styles.empty}>{text('Henüz kayıt yok. İlk kaydınızı ekleyerek başlayın.', 'No records yet. Add your first record to get started.')}</p> : null}
    <div className={styles.list}>{data.map(item => <article key={item.id} className={styles.item}>
      <h3>{item.institution || item.name}</h3>
      {section === 'loans' && <><p>{text('Kalan taksit toplamı', 'Remaining repayments')}: <strong>{financeMoney(item.remainingBalance, item.currency)}</strong></p>
        <p>{item.paidCount} / {item.installmentCount} {text('taksit ödendi', 'installments paid')} · {text('Toplam geri ödeme', 'Total repayment')}: {financeMoney(item.totalRepayment, item.currency)}</p>
        <details><summary>{text('Taksit planı', 'Repayment schedule')}</summary><ol>{item.records.map(r => <li key={r.id}>
          <Link to={`../tracker?record=${r.id}`}>{new Date(r.dueAt).toLocaleDateString()} · {financeMoney(r.amount, r.currency)} · {r.status === 'completed' ? text('Ödendi', 'Paid') : text('Bekliyor', 'Outstanding')}</Link>
        </li>)}</ol></details></>}
      {section === 'accounts' && <><p>{text('Kullanılabilir bakiye', 'Available balance')}: <strong>{financeMoney(item.balance, item.currency)}</strong></p>
        <p>{text('Valör bekleyen', 'Awaiting settlement')}: {financeMoney(item.inTransit, item.currency)}</p>
        <Link to="../tracker">{text('Ödeme ve tahsilat kayıtları', 'Payments and receivables')}</Link></>}
      {section === 'employees' && <><p>{text('Maaş', 'Salary')}: {financeMoney(item.salaryAmount, item.currency)} · SGK: {item.insured ? text('Var', 'Yes') : text('Yok', 'No')}</p>
        <p>{text('Kullanılan izin / hak', 'Leave used / allowance')}: {item.leaveUsed} / {item.leaveAllowance}</p><LeaveForm employee={item} onSaved={() => setRevision(v => v + 1)} /></>}
    </article>)}</div>
  </section>
}

function LeaveForm({ employee, onSaved }) {
  const { workspaceId } = useParams(); const text = useFinanceText()
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID())
  async function submit(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    setBusy(true); setError('')
    try { await financeRequest(workspaceId, `employees/${employee.id}/leaves`, { date: iso(form.get('date')), days: Number(form.get('days')), requestKey }); setRequestKey(crypto.randomUUID()); onSaved() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <details><summary>{text('İzin kaydı ekle', 'Add leave record')}</summary><form className={styles.form} onSubmit={submit}>
    <FinanceField label={text('Tarih', 'Date')} name="date" type="date" required />
    <FinanceField label={text('Kullanılan gün', 'Days used')} name="days" type="number" min="0.5" max="366" step="0.5" required />
    <Button type="submit" disabled={busy}>{text('İzni kaydet', 'Save leave')}</Button>{error && <p role="alert">{error}</p>}
  </form></details>
}
