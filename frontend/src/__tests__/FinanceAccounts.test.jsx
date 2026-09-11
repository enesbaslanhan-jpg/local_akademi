import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Finance from '@/pages/Workspaces/Finance'

const request = vi.fn()
vi.mock('@/services/api', () => ({ api: { request: (...args) => request(...args) } }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key, i18n: { language: 'tr' } }) }))

function renderPage() {
  return render(<MemoryRouter initialEntries={['/app/workspaces/ws-1/accounts']}><Routes>
    <Route path="/app/workspaces/:workspaceId/accounts" element={<Finance section="accounts" />} />
  </Routes></MemoryRouter>)
}

describe('Kasa / Banka', () => {
  beforeEach(() => request.mockReset())

  it('sunucunun ayrı para birimi bakiyelerini toplamadan gösterir', async () => {
    request.mockResolvedValueOnce({ accounts: [
      { id: 'a1', name: 'Merkez kasa', type: 'cash', currency: 'TRY', balance: '1250.50', inTransit: '0.00' },
      { id: 'a2', name: 'Döviz hesabı', type: 'bank', currency: 'USD', balance: '80.00', inTransit: '12.00' }
    ] })
    renderPage()
    expect(await screen.findByText('Merkez kasa')).toBeInTheDocument()
    expect(screen.getByText('Döviz hesabı')).toBeInTheDocument()
    expect(screen.getByText(/₺1\.250,50/)).toBeInTheDocument()
    expect(screen.getByText(/\$80,00/)).toBeInTheDocument()
    expect(screen.queryByText(/Toplam bakiye/i)).not.toBeInTheDocument()
  })

  it('hesabı ayrı pencereden doğru alanlarla kaydeder', async () => {
    request.mockResolvedValueOnce({ accounts: [] }).mockResolvedValueOnce({ id: 'new-account' }).mockResolvedValueOnce({ accounts: [] })
    const user = userEvent.setup(); renderPage()
    await screen.findByText('İlk hesabınızı ekleyin')
    await user.click(screen.getAllByRole('button', { name: 'Hesap ekle' })[0])
    await user.type(screen.getByLabelText('Hesap adı'), 'Merkez kasa')
    await user.type(screen.getByLabelText('Açılış bakiyesi'), '2500')
    await user.click(screen.getByRole('button', { name: 'Hesabı kaydet' }))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3))
    const [path, options] = request.mock.calls[1]
    expect(path).toBe('/workspaces/ws-1/accounts')
    expect(JSON.parse(options.body)).toMatchObject({ name: 'Merkez kasa', type: 'cash', currency: 'TRY', openingBalance: 2500 })
  })
})
