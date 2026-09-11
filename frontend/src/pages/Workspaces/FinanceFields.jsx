import { useEffect, useState } from 'react'
import { FinanceField, financeRequest, useFinanceText } from './Finance'

export default function FinanceFields({ workspaceId, value, onChange }) {
  const text = useFinanceText()
  const [accounts, setAccounts] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    financeRequest(workspaceId, 'accounts').then(d => { if (active) setAccounts(d.accounts) })
      .catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [workspaceId])
  return <>
    {error && <p role="alert">{error}</p>}
    <FinanceField label={text('İşlenecek kasa / banka', 'Cash / bank account')}><select value={value.accountId || ''} onChange={e => onChange('accountId', e.target.value)}>
      <option value="">{text('Hesaba işleme', 'Do not post to an account')}</option>
      {accounts.filter(a => a.currency === value.currency).map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
    </select></FinanceField>
    <FinanceField label={text('Gelir / gider kategorisi', 'Income / expense category')}><select value={value.category || ''} disabled={Boolean(value.loanId)} onChange={e => onChange('category', e.target.value)}>
      <option value="">{text('Diğer', 'Other')}</option>
      {Object.entries({ sales: text('Satış', 'Sales'), supplies: text('Malzeme', 'Supplies'), rent: text('Kira', 'Rent'), utilities: text('Faturalar', 'Utilities'), salary: text('Maaş', 'Salary'), sgk: 'SGK', tax: text('Vergi', 'Tax'), loan_repayment: text('Kredi geri ödemesi', 'Loan repayment'), transfer: text('Transfer', 'Transfer'), capital: text('Sermaye', 'Capital') }).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select></FinanceField>
    {value.direction === 'receivable' && <FinanceField label={text('POS beklenen hesaba geçiş tarihi (valör)', 'Expected POS settlement date')}
      type="date" value={(value.settlementAt || '').slice(0, 10)} onChange={e => onChange('settlementAt', e.target.value)} />}
  </>
}
