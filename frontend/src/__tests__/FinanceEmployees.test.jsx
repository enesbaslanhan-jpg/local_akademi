import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Finance from '@/pages/Workspaces/Finance'

const request = vi.fn()
vi.mock('@/services/api', () => ({ api: { request: (...args) => request(...args) } }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key, i18n: { language: 'tr' } }) }))

function renderEmployees() {
  return render(<MemoryRouter initialEntries={['/app/workspaces/ws-1/employees']}><Routes><Route path="/app/workspaces/:workspaceId/employees" element={<Finance section="employees" />} /></Routes></MemoryRouter>)
}

describe('Finance employees', () => {
  beforeEach(() => request.mockReset())

  it('shows salary, insurance and server-calculated leave usage', async () => {
    request.mockResolvedValueOnce({ employees: [{ id: 'emp-1', name: 'Ayşe Yılmaz', salaryAmount: '32000.00', currency: 'TRY', insured: true, leaveUsed: '1.5', leaveAllowance: '14.0' }] })
    renderEmployees()
    expect(await screen.findByText('Ayşe Yılmaz')).toBeInTheDocument()
    expect(screen.getByText('₺32.000,00')).toBeInTheDocument()
    expect(screen.getByText('1.5 / 14.0 gün')).toBeInTheDocument()
    expect(screen.getByText(/SGK’lı çalışan/)).toBeInTheDocument()
  })

  it('creates an insured employee with explicit payroll dates and amounts', async () => {
    request.mockResolvedValueOnce({ employees: [] }).mockResolvedValueOnce({ id: 'emp-2' }).mockResolvedValueOnce({ employees: [] })
    const user = userEvent.setup(); renderEmployees()
    await user.click(await screen.findByRole('button', { name: 'Çalışan ekle' }))
    await user.type(screen.getByLabelText('Ad soyad'), 'Mehmet Kaya')
    await user.type(screen.getByLabelText('Aylık maaş'), '28000')
    await user.click(screen.getByRole('checkbox', { name: /SGK’lı çalışan/ }))
    await user.type(screen.getByLabelText('SGK prim tutarı'), '7000')
    await user.click(screen.getByRole('button', { name: 'Çalışanı kaydet' }))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3))
    expect(JSON.parse(request.mock.calls[1][1].body)).toMatchObject({ name: 'Mehmet Kaya', salaryAmount: 28000, insured: true, premiumAmount: 7000, leaveAllowance: 0 })
  })

  it('records leave in a separate modal', async () => {
    request.mockResolvedValueOnce({ employees: [{ id: 'emp-1', name: 'Ayşe Yılmaz', salaryAmount: '32000.00', currency: 'TRY', insured: false, leaveUsed: '0', leaveAllowance: '14' }] }).mockResolvedValueOnce({ id: 'leave-1' }).mockResolvedValueOnce({ employees: [] })
    const user = userEvent.setup(); renderEmployees()
    await user.click(await screen.findByRole('button', { name: 'İzin ekle' }))
    await user.type(screen.getByLabelText('Kullanılan gün'), '1.5')
    await user.click(screen.getByRole('button', { name: 'İzni kaydet' }))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3))
    expect(JSON.parse(request.mock.calls[1][1].body)).toMatchObject({ days: 1.5 })
    expect(request.mock.calls[1][0]).toBe('/workspaces/ws-1/employees/emp-1/leaves')
  })
})
