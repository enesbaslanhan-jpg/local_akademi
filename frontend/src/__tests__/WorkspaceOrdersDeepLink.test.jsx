import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Orders from '@/pages/Workspaces/Orders'

/* Siparişler ekranı — deep-link durum filtresi testleri.
   Overview/Dashboard aksiyonlari ?status=CREATED,PROCESSING seklinde
   gelir; sayfa istemci tarafinda filtreler ve kaldirilabilir etiket
   gosterir. */

const mocks = vi.hoisted(() => ({
  orders: vi.fn(),
  trendyolStatus: vi.fn(),
  trendyolSync: vi.fn()
}))

vi.mock('@/services/api', () => ({
  api: {
    marketplace: {
      orders: mocks.orders,
      order: vi.fn()
    },
    integrations: {
      trendyolStatus: mocks.trendyolStatus,
      trendyolSync: mocks.trendyolSync
    }
  }
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() })
}))

function order(id, status) {
  return {
    id,
    externalId: id,
    externalOrderNumber: `ORD-${id}`,
    provider: 'TRENDYOL',
    customerDisplayName: 'Ali V.',
    currency: 'TRY',
    grossAmount: 100,
    commissionAmount: null,
    shippingAmount: null,
    refundAmount: null,
    netContribution: null,
    status,
    orderDate: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
    itemCount: 1
  }
}

function renderOrders(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/app/workspaces/:workspaceId/orders" element={<Orders />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.orders.mockResolvedValue({
    orders: [
      order('1', 'PROCESSING'),
      order('2', 'DELIVERED'),
      order('3', 'CREATED')
    ],
    total: 3
  })
  mocks.trendyolStatus.mockResolvedValue({ connected: true, syncing: false, connections: [{ lastSyncedAt: new Date().toISOString() }] })
})

describe('Siparişler — deep-link filtre', () => {
  it('URL parametresiz tüm siparişler listelenir', async () => {
    renderOrders('/app/workspaces/w1/orders')
    expect(await screen.findByText('ORD-1')).toBeInTheDocument()
    expect(screen.getByText('ORD-2')).toBeInTheDocument()
    expect(screen.queryByText(/Durum:/)).not.toBeInTheDocument()
  })

  it('?status=CREATED,PROCESSING ile yalnız kargoya bekleyenler gelir + etiket', async () => {
    renderOrders('/app/workspaces/w1/orders?status=CREATED,PROCESSING')

    expect(await screen.findByText('ORD-1')).toBeInTheDocument()
    expect(screen.getByText('ORD-3')).toBeInTheDocument()
    expect(screen.queryByText('ORD-2')).not.toBeInTheDocument()
    expect(screen.getByText(/Durum: Kargoya bekleyen/)).toBeInTheDocument()
  })

  it('provider filtresi sunucuya iletilir (HEPSIBURADA)', async () => {
    const user = userEvent.setup()
    renderOrders('/app/workspaces/w1/orders')
    await screen.findByText('ORD-1')

    await user.selectOptions(screen.getByLabelText('Kaynak filtresi'), 'HEPSIBURADA')
    await waitFor(() => expect(mocks.orders).toHaveBeenCalledWith('w1', expect.objectContaining({ provider: 'HEPSIBURADA' })))
  })

  it('provider filtresi sunucuya iletilir (N11)', async () => {
    const user = userEvent.setup()
    renderOrders('/app/workspaces/w1/orders')
    await screen.findByText('ORD-1')

    await user.selectOptions(screen.getByLabelText('Kaynak filtresi'), 'N11')
    await waitFor(() => expect(mocks.orders).toHaveBeenCalledWith('w1', expect.objectContaining({ provider: 'N11' })))
  })

  it('etiketten filtre kaldırılınca liste tamalanır', async () => {
    const user = userEvent.setup()
    renderOrders('/app/workspaces/w1/orders?status=RETURNED,PARTIALLY_RETURNED')

    await screen.findByText(/Bu filtreyle eşleşen sipariş yok/)
    await user.click(screen.getByRole('button', { name: 'Filtreyi kaldır' }))
    expect(await screen.findByText('ORD-2')).toBeInTheDocument()
  })
})
