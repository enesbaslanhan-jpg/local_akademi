import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Finance from '@/pages/Workspaces/Finance'
import { api } from '@/services/api'

vi.mock('@/services/api', () => ({ api: { request: vi.fn() } }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key, i18n: { language: 'tr' } }) }))

function renderLoans() {
  return render(<MemoryRouter initialEntries={['/app/workspaces/ws-1/loans']}><Routes><Route path="/app/workspaces/:workspaceId/loans" element={<Finance section="loans" />} /></Routes></MemoryRouter>)
}

describe('Finance loans', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows server-calculated loan totals and repayment records', async () => {
    api.request.mockResolvedValueOnce({ loans: [{ id: 'loan-1', institution: 'Örnek Banka', currency: 'TRY', paidCount: 1, installmentCount: 2, remainingBalance: '1250.00', totalRepayment: '2500.00', records: [{ id: 'rec-1', installmentNo: 1, dueAt: '2026-10-01T09:00:00+03:00', amount: '1250.00', currency: 'TRY', status: 'completed' }] }] })
    renderLoans()
    expect(await screen.findByText('Örnek Banka')).toBeInTheDocument()
    expect(screen.getAllByText('₺1.250,00')).toHaveLength(2)
    expect(screen.getByText('₺2.500,00')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Taksit planını göster'))
    expect(screen.getByText('Ödendi')).toBeInTheDocument()
  })

  it('creates a loan from the modal with the bank-supplied schedule', async () => {
    api.request.mockResolvedValueOnce({ loans: [] }).mockResolvedValueOnce({ id: 'loan-2' }).mockResolvedValueOnce({ loans: [] })
    renderLoans()
    await userEvent.click(await screen.findByRole('button', { name: 'Kredi ekle' }))
    await userEvent.type(screen.getByLabelText('Banka veya kurum'), 'Deneme Bankası')
    await userEvent.type(screen.getByLabelText('Kredi anaparası'), '10000')
    await userEvent.clear(screen.getByLabelText('Taksit sayısı'))
    await userEvent.type(screen.getByLabelText('Taksit sayısı'), '10')
    await userEvent.type(screen.getByLabelText('Bankanın bildirdiği taksit tutarı'), '1150')
    await userEvent.click(screen.getByRole('button', { name: 'Krediyi kaydet' }))
    await waitFor(() => expect(api.request).toHaveBeenCalledTimes(3))
    expect(JSON.parse(api.request.mock.calls[1][1].body)).toMatchObject({ institution: 'Deneme Bankası', amount: 10000, currency: 'TRY', installmentCount: 10, installmentAmount: 1150 })
  })
})
