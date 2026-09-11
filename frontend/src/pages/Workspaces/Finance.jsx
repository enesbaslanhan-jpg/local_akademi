import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Banknote, Building2, CalendarClock, Landmark, Plus, UserRound, WalletCards } from 'lucide-react'
import { api } from '@/services/api'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
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
  if (section === 'accounts') return <AccountsFinance />
  if (section === 'loans') return <LoansFinance />
  return <EmployeesFinance />
}

function LoansFinance() {
  const text = useFinanceText()
  const { workspaceId } = useParams()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID())
  const emptyForm = () => ({ institution: '', amount: '', currency: 'TRY', installmentCount: '12', installmentAmount: '', firstPaymentAt: today() })
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    financeRequest(workspaceId, 'loans')
      .then(result => { if (active) setLoans(result.loans || []) })
      .catch(e => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [workspaceId, revision])

  function closeForm() {
    if (!busy) { setFormOpen(false); setFormError('') }
  }

  async function save(event) {
    event.preventDefault(); setBusy(true); setFormError('')
    try {
      await financeRequest(workspaceId, 'loans', {
        institution: form.institution.trim(),
        amount: Number(form.amount),
        currency: form.currency,
        installmentCount: Number(form.installmentCount),
        installmentAmount: Number(form.installmentAmount),
        firstPaymentAt: iso(form.firstPaymentAt),
        requestKey
      })
      setForm(emptyForm()); setRequestKey(crypto.randomUUID())
      setFormOpen(false); setRevision(value => value + 1)
    } catch (e) { setFormError(e.message) } finally { setBusy(false) }
  }

  return <section className={styles.accountsPage}>
    <header className={styles.accountsHeading}>
      <div><h2>{text('Krediler', 'Loans')}</h2><p>{text('Bankanın verdiği taksit planını kaydedin; kalan borcu ve ödeme durumunu tek yerde izleyin.', 'Record the bank’s repayment schedule and track remaining debt and payment status in one place.')}</p></div>
      <Button onClick={() => setFormOpen(true)}><Plus size={16} aria-hidden="true" />{text('Kredi ekle', 'Add loan')}</Button>
    </header>

    <aside className={styles.truthNote}><CalendarClock size={18} aria-hidden="true" /><div><strong>{text('Banka planı esas alınır', 'The bank schedule is authoritative')}</strong><span>{text('LocalKarar faiz veya taksit hesaplamaz. Kredi kaydı oluşturmak kasaya otomatik para girişi oluşturmaz.', 'LocalKarar does not calculate interest or installments. Creating a loan does not automatically credit cash.')}</span></div></aside>

    {error && <div role="alert" className={styles.error}>{error}<Button variant="secondary" onClick={() => setRevision(value => value + 1)}>{text('Yeniden dene', 'Retry')}</Button></div>}
    {loading && <div className={styles.accountSkeleton} role="status" aria-label={text('Krediler yükleniyor', 'Loading loans')}><span /><span /><span /></div>}
    {!loading && !error && loans.length === 0 && <EmptyState icon={<Landmark size={32} />} title={text('İlk kredinizi ekleyin', 'Add your first loan')} message={text('Bankanın bildirdiği anapara, taksit sayısı, taksit tutarı ve ilk ödeme tarihini girin.', 'Enter the principal, installment count, installment amount, and first payment date supplied by the bank.')} action onAction={() => setFormOpen(true)} actionLabel={text('Kredi ekle', 'Add loan')} />}
    {!loading && loans.length > 0 && <div className={styles.loanGroup}>
      {loans.map(loan => <article className={styles.loanCard} key={loan.id}>
        <div className={styles.loanSummary}>
          <span className={styles.accountIcon}><Landmark size={20} aria-hidden="true" /></span>
          <span className={styles.loanIdentity}><strong>{loan.institution}</strong><small>{loan.paidCount} / {loan.installmentCount} {text('taksit ödendi', 'installments paid')} · {loan.currency}</small></span>
          <span className={styles.loanStat}><small>{text('Kalan taksit toplamı', 'Remaining repayments')}</small><strong>{financeMoney(loan.remainingBalance, loan.currency)}</strong></span>
          <span className={styles.loanStat}><small>{text('Toplam geri ödeme', 'Total repayment')}</small><strong>{financeMoney(loan.totalRepayment, loan.currency)}</strong></span>
        </div>
        <details className={styles.loanSchedule}>
          <summary>{text('Taksit planını göster', 'Show repayment schedule')}</summary>
          <ol>{loan.records.map(record => <li key={record.id}>
            <Link to={`../tracker?record=${record.id}`}>
              <span>{record.installmentNo}. {text('taksit', 'installment')}</span>
              <span>{new Date(record.dueAt).toLocaleDateString()}</span>
              <strong>{financeMoney(record.amount, record.currency)}</strong>
              <span className={record.status === 'completed' ? styles.statusPaid : styles.statusPending}>{record.status === 'completed' ? text('Ödendi', 'Paid') : text('Bekliyor', 'Outstanding')}</span>
            </Link>
          </li>)}</ol>
        </details>
      </article>)}
    </div>}

    <Modal open={formOpen} onClose={closeForm} title={text('Yeni kredi', 'New loan')}>
      <form onSubmit={save} className={styles.accountForm}>
        <p>{text('Rakamları bankanın ödeme planından aynen girin. Sistem faiz hesabı yapmaz.', 'Enter the figures exactly as shown in the bank schedule. The system does not calculate interest.')}</p>
        <FinanceField label={text('Banka veya kurum', 'Bank or institution')} value={form.institution} onChange={e => setForm(current => ({ ...current, institution: e.target.value }))} placeholder={text('Örn. İşletme kredisi', 'e.g. Business loan')} required maxLength={160} autoFocus />
        <Select label={text('Para birimi', 'Currency')} value={form.currency} onChange={currency => setForm(current => ({ ...current, currency }))} options={['TRY', 'USD', 'EUR', 'GBP'].map(value => ({ value, label: value }))} />
        <FinanceField label={text('Kredi anaparası', 'Loan principal')} value={form.amount} onChange={e => setForm(current => ({ ...current, amount: e.target.value }))} type="number" step="0.01" min="0.01" required />
        <FinanceField label={text('Taksit sayısı', 'Installment count')} value={form.installmentCount} onChange={e => setForm(current => ({ ...current, installmentCount: e.target.value }))} type="number" min="1" max="360" required />
        <FinanceField label={text('Bankanın bildirdiği taksit tutarı', 'Installment amount supplied by bank')} value={form.installmentAmount} onChange={e => setForm(current => ({ ...current, installmentAmount: e.target.value }))} type="number" step="0.01" min="0.01" required />
        <FinanceField label={text('İlk taksit tarihi', 'First installment date')} value={form.firstPaymentAt} onChange={e => setForm(current => ({ ...current, firstPaymentAt: e.target.value }))} type="date" required />
        {formError && <div role="alert" className={styles.error}>{formError}</div>}
        <div className={styles.formActions}><Button variant="secondary" onClick={closeForm} disabled={busy}>{text('Vazgeç', 'Cancel')}</Button><Button type="submit" disabled={busy}>{busy ? text('Kaydediliyor…', 'Saving…') : text('Krediyi kaydet', 'Save loan')}</Button></div>
      </form>
    </Modal>
  </section>
}

function AccountsFinance() {
  const text = useFinanceText()
  const { workspaceId } = useParams()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [form, setForm] = useState({ name: '', type: 'cash', currency: 'TRY', openingBalance: '', openingAt: today() })

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    financeRequest(workspaceId, 'accounts')
      .then(result => { if (active) setAccounts(result.accounts || []) })
      .catch(e => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [workspaceId, revision])

  function closeForm() {
    if (!busy) { setFormOpen(false); setFormError('') }
  }

  async function save(event) {
    event.preventDefault(); setBusy(true); setFormError('')
    try {
      await financeRequest(workspaceId, 'accounts', {
        name: form.name.trim(), type: form.type, currency: form.currency,
        openingBalance: Number(form.openingBalance), openingAt: iso(form.openingAt)
      })
      setForm({ name: '', type: 'cash', currency: 'TRY', openingBalance: '', openingAt: today() })
      setFormOpen(false); setRevision(value => value + 1)
    } catch (e) { setFormError(e.message) } finally { setBusy(false) }
  }

  return <section className={styles.accountsPage}>
    <header className={styles.accountsHeading}>
      <div><h2>{text('Kasa / Banka', 'Cash / Bank')}</h2><p>{text('Bugün kullanabileceğiniz para ile valör bekleyen tahsilatı hesap hesap görün.', 'See available money and settlements in transit, account by account.')}</p></div>
      <Button onClick={() => setFormOpen(true)}><Plus size={16} aria-hidden="true" />{text('Hesap ekle', 'Add account')}</Button>
    </header>

    <aside className={styles.truthNote}><WalletCards size={18} aria-hidden="true" /><div><strong>{text('Para birimleri ayrı tutulur', 'Currencies stay separate')}</strong><span>{text('Kur çevrimi yapılmaz. Bakiye; açılış tutarı ve bu hesaba işlenen tamamlanmış hareketlerden gelir.', 'No exchange-rate conversion. Balance comes from the opening amount and completed movements posted to this account.')}</span></div></aside>

    {error && <div role="alert" className={styles.error}>{error}<Button variant="secondary" onClick={() => setRevision(value => value + 1)}>{text('Yeniden dene', 'Retry')}</Button></div>}
    {loading && <div className={styles.accountSkeleton} role="status" aria-label={text('Hesaplar yükleniyor', 'Loading accounts')}><span /><span /><span /></div>}
    {!loading && !error && accounts.length === 0 && <EmptyState icon={<WalletCards size={32} />} title={text('İlk hesabınızı ekleyin', 'Add your first account')} message={text('Kasa veya banka hesabınızın açılış bakiyesini girin; tamamlanan hareketler bakiyeyi otomatik güncellesin.', 'Enter the opening balance for a cash or bank account; completed movements will update it automatically.')} action onAction={() => setFormOpen(true)} actionLabel={text('Hesap ekle', 'Add account')} />}
    {!loading && accounts.length > 0 && <div className={styles.accountGroup}>
      {accounts.map(account => {
        const isBank = account.type === 'bank'; const inTransit = Number(account.inTransit) !== 0
        return <article className={styles.accountRow} key={account.id}>
          <span className={styles.accountIcon}>{isBank ? <Building2 size={20} aria-hidden="true" /> : <Banknote size={20} aria-hidden="true" />}</span>
          <span className={styles.accountIdentity}><strong>{account.name}</strong><small>{isBank ? text('Banka hesabı', 'Bank account') : text('Kasa', 'Cash')} · {account.currency}</small></span>
          <span className={styles.accountAmount}><small>{text('Kullanılabilir', 'Available')}</small><strong>{financeMoney(account.balance, account.currency)}</strong></span>
          <span className={`${styles.accountTransit} ${inTransit ? styles.hasTransit : ''}`}><small>{text('Valör bekleyen', 'Awaiting settlement')}</small><strong>{financeMoney(account.inTransit, account.currency)}</strong></span>
        </article>
      })}
    </div>}
    <div className={styles.accountsFooter}><Link to="../tracker">{text('Ödeme ve tahsilat kayıtlarını aç', 'Open payments and receivables')}</Link></div>

    <Modal open={formOpen} onClose={closeForm} title={text('Yeni kasa / banka hesabı', 'New cash / bank account')}>
      <form onSubmit={save} className={styles.accountForm}>
        <p>{text('Açılış bakiyesi yalnız seçtiğiniz tarihten sonraki hareketler için başlangıç noktasıdır.', 'The opening balance is the starting point for movements after the selected date.')}</p>
        <FinanceField label={text('Hesap adı', 'Account name')} value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} placeholder={text('Örn. Merkez kasa', 'e.g. Main cash')} required maxLength={160} autoFocus />
        <Select label={text('Hesap türü', 'Account type')} value={form.type} onChange={type => setForm(current => ({ ...current, type }))} options={[{ value: 'cash', label: text('Kasa', 'Cash') }, { value: 'bank', label: text('Banka hesabı', 'Bank account') }]} />
        <Select label={text('Para birimi', 'Currency')} value={form.currency} onChange={currency => setForm(current => ({ ...current, currency }))} options={['TRY', 'USD', 'EUR', 'GBP'].map(value => ({ value, label: value }))} />
        <FinanceField label={text('Açılış bakiyesi', 'Opening balance')} value={form.openingBalance} onChange={e => setForm(current => ({ ...current, openingBalance: e.target.value }))} type="number" step="0.01" placeholder="0,00" required />
        <FinanceField label={text('Açılış tarihi', 'Opening date')} value={form.openingAt} onChange={e => setForm(current => ({ ...current, openingAt: e.target.value }))} type="date" required />
        {formError && <div role="alert" className={styles.error}>{formError}</div>}
        <div className={styles.formActions}><Button variant="secondary" onClick={closeForm} disabled={busy}>{text('Vazgeç', 'Cancel')}</Button><Button type="submit" disabled={busy}>{busy ? text('Kaydediliyor…', 'Saving…') : text('Hesabı kaydet', 'Save account')}</Button></div>
      </form>
    </Modal>
  </section>
}

function EmployeesFinance() {
  const text = useFinanceText()
  const { workspaceId } = useParams()
  const [employees, setEmployees] = useState([])
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [leaveEmployee, setLeaveEmployee] = useState(null)
  const [leaveForm, setLeaveForm] = useState({ date: today(), days: '' })
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID())
  const [leaveRequestKey, setLeaveRequestKey] = useState(() => crypto.randomUUID())
  const [revision, setRevision] = useState(0)
  const emptyForm = () => ({ name: '', salaryAmount: '', currency: 'TRY', startedAt: today(), firstSalaryAt: today(), leaveAllowance: '0', insured: false, firstPremiumAt: today(), premiumAmount: '' })
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    financeRequest(workspaceId, 'employees').then(result => { if (active) setEmployees(result.employees || []) })
      .catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [workspaceId, revision])

  function closeForm() {
    if (!busy) { setFormOpen(false); setFormError('') }
  }

  async function saveEmployee(event) {
    event.preventDefault(); setBusy(true); setFormError('')
    try {
      await financeRequest(workspaceId, 'employees', {
        name: form.name.trim(), salaryAmount: Number(form.salaryAmount), currency: form.currency,
        startedAt: iso(form.startedAt), firstSalaryAt: iso(form.firstSalaryAt),
        leaveAllowance: Number(form.leaveAllowance), insured: form.insured, requestKey,
        ...(form.insured ? { firstPremiumAt: iso(form.firstPremiumAt), premiumAmount: Number(form.premiumAmount) } : {})
      })
      setForm(emptyForm()); setRequestKey(crypto.randomUUID())
      setFormOpen(false); setRevision(value => value + 1)
    } catch (e) { setFormError(e.message) } finally { setBusy(false) }
  }

  async function saveLeave(event) {
    event.preventDefault(); setBusy(true); setFormError('')
    try {
      await financeRequest(workspaceId, `employees/${leaveEmployee.id}/leaves`, { date: iso(leaveForm.date), days: Number(leaveForm.days), requestKey: leaveRequestKey })
      setLeaveRequestKey(crypto.randomUUID()); setLeaveForm({ date: today(), days: '' }); setLeaveEmployee(null)
      setRevision(value => value + 1)
    } catch (e) { setFormError(e.message) } finally { setBusy(false) }
  }

  return <section className={styles.accountsPage}>
    <header className={styles.accountsHeading}>
      <div><h2>{text('Personel', 'Employees')}</h2><p>{text('Maaş, SGK ve izin kayıtlarını çalışan bazında takip edin.', 'Track salary, social security, and leave records by employee.')}</p></div>
      <Button onClick={() => setFormOpen(true)}><Plus size={16} aria-hidden="true" />{text('Çalışan ekle', 'Add employee')}</Button>
    </header>
    <aside className={styles.truthNote}><WalletCards size={18} aria-hidden="true" /><div><strong>{text('Tutarlar kullanıcı tarafından girilir', 'Amounts are entered by the user')}</strong><span>{text('LocalKarar bordro veya SGK primi hesaplamaz. Ödeme tarihlerini ve tutarlarını resmi kayıtlarınızdan teyit edin.', 'LocalKarar does not calculate payroll or social security contributions. Verify dates and amounts against your official records.')}</span></div></aside>
    {error && <div role="alert" className={styles.error}>{error}<Button variant="secondary" onClick={() => setRevision(value => value + 1)}>{text('Yeniden dene', 'Retry')}</Button></div>}
    {loading && <div className={styles.accountSkeleton} role="status" aria-label={text('Personel yükleniyor', 'Loading employees')}><span /><span /><span /></div>}
    {!loading && !error && employees.length === 0 && <EmptyState icon={<UserRound size={32} />} title={text('İlk çalışanınızı ekleyin', 'Add your first employee')} message={text('Maaş planı ve izin hakkı çalışan kaydıyla birlikte oluşturulur.', 'The salary schedule and leave allowance are created with the employee record.')} action onAction={() => setFormOpen(true)} actionLabel={text('Çalışan ekle', 'Add employee')} />}
    {!loading && employees.length > 0 && <div className={styles.employeeGroup}>{employees.map(employee => <article className={styles.employeeRow} key={employee.id}>
      <span className={styles.accountIcon}><UserRound size={20} aria-hidden="true" /></span>
      <span className={styles.employeeIdentity}><strong>{employee.name}</strong><small>{employee.insured ? text('SGK’lı çalışan', 'Insured employee') : text('SGK kaydı yok', 'No social security record')} · {employee.currency}</small></span>
      <span className={styles.employeeStat}><small>{text('Aylık maaş', 'Monthly salary')}</small><strong>{financeMoney(employee.salaryAmount, employee.currency)}</strong></span>
      <span className={styles.employeeStat}><small>{text('Kullanılan izin / hak', 'Leave used / allowance')}</small><strong>{employee.leaveUsed} / {employee.leaveAllowance} {text('gün', 'days')}</strong></span>
      <Button variant="secondary" onClick={() => { setFormError(''); setLeaveEmployee(employee) }}>{text('İzin ekle', 'Add leave')}</Button>
    </article>)}</div>}
    <div className={styles.accountsFooter}><Link to="../tracker">{text('Maaş ve SGK ödeme kayıtlarını aç', 'Open salary and contribution records')}</Link></div>

    <Modal open={formOpen} onClose={closeForm} title={text('Yeni çalışan', 'New employee')}>
      <form onSubmit={saveEmployee} className={styles.accountForm}>
        <p>{text('Maaş ve SGK tutarlarını resmi kayıtlarınızdaki haliyle girin.', 'Enter salary and contribution amounts as shown in your official records.')}</p>
        <FinanceField label={text('Ad soyad', 'Full name')} value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} required maxLength={160} autoFocus />
        <Select label={text('Para birimi', 'Currency')} value={form.currency} onChange={currency => setForm(current => ({ ...current, currency }))} options={['TRY', 'USD', 'EUR', 'GBP'].map(value => ({ value, label: value }))} />
        <FinanceField label={text('Aylık maaş', 'Monthly salary')} value={form.salaryAmount} onChange={e => setForm(current => ({ ...current, salaryAmount: e.target.value }))} type="number" step="0.01" min="0" required />
        <FinanceField label={text('İşe giriş tarihi', 'Employment start date')} value={form.startedAt} onChange={e => setForm(current => ({ ...current, startedAt: e.target.value }))} type="date" required />
        <FinanceField label={text('İlk maaş ödeme tarihi', 'First salary payment')} value={form.firstSalaryAt} onChange={e => setForm(current => ({ ...current, firstSalaryAt: e.target.value }))} type="date" min={form.startedAt} required />
        <FinanceField label={text('Yıllık izin hakkı (gün)', 'Annual leave allowance (days)')} value={form.leaveAllowance} onChange={e => setForm(current => ({ ...current, leaveAllowance: e.target.value }))} type="number" min="0" max="366" step="0.5" required />
        <label className={styles.toggleField}><input type="checkbox" checked={form.insured} onChange={e => setForm(current => ({ ...current, insured: e.target.checked }))} /><span><strong>{text('SGK’lı çalışan', 'Insured employee')}</strong><small>{text('Aylık SGK ödeme kaydı oluşturulur.', 'A monthly contribution record will be created.')}</small></span></label>
        {form.insured && <><FinanceField label={text('İlk SGK ödeme tarihi', 'First contribution payment')} value={form.firstPremiumAt} onChange={e => setForm(current => ({ ...current, firstPremiumAt: e.target.value }))} type="date" required />
          <FinanceField label={text('SGK prim tutarı', 'Contribution amount')} value={form.premiumAmount} onChange={e => setForm(current => ({ ...current, premiumAmount: e.target.value }))} type="number" step="0.01" min="0" required /></>}
        {formError && <div role="alert" className={styles.error}>{formError}</div>}
        <div className={styles.formActions}><Button variant="secondary" onClick={closeForm} disabled={busy}>{text('Vazgeç', 'Cancel')}</Button><Button type="submit" disabled={busy}>{busy ? text('Kaydediliyor…', 'Saving…') : text('Çalışanı kaydet', 'Save employee')}</Button></div>
      </form>
    </Modal>

    <Modal open={Boolean(leaveEmployee)} onClose={() => { if (!busy) { setLeaveEmployee(null); setFormError('') } }} title={leaveEmployee ? `${leaveEmployee.name} — ${text('İzin kaydı', 'Leave record')}` : text('İzin kaydı', 'Leave record')}>
      <form onSubmit={saveLeave} className={styles.accountForm}>
        <p>{text('Kullanılan izin süresini yarım gün hassasiyetinde kaydedebilirsiniz.', 'You can record leave used in half-day increments.')}</p>
        <FinanceField label={text('İzin tarihi', 'Leave date')} value={leaveForm.date} onChange={e => setLeaveForm(current => ({ ...current, date: e.target.value }))} type="date" required />
        <FinanceField label={text('Kullanılan gün', 'Days used')} value={leaveForm.days} onChange={e => setLeaveForm(current => ({ ...current, days: e.target.value }))} type="number" min="0.5" max="366" step="0.5" required />
        {formError && <div role="alert" className={styles.error}>{formError}</div>}
        <div className={styles.formActions}><Button variant="secondary" onClick={() => setLeaveEmployee(null)} disabled={busy}>{text('Vazgeç', 'Cancel')}</Button><Button type="submit" disabled={busy}>{busy ? text('Kaydediliyor…', 'Saving…') : text('İzni kaydet', 'Save leave')}</Button></div>
      </form>
    </Modal>
  </section>
}
