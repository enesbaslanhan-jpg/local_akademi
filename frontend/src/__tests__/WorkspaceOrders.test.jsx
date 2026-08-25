import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Orders from '@/pages/Workspaces/Orders'

/*
 * ISLETME TAKIBI > SIPARISLER ekran testleri.
 *
 * Kritik sozlesme: bu ekran yalnizca LocalKarar DB'sinden okur;
 * "Simdi esitle" disinda hicbir provider cagrisi tetiklemez.
 */

const mocks = vi.hoisted(() => ({
  orders: vi.fn(),
  trendyolStatus: vi.fn()
}))

vi.mock('@/services/api', () => ({
  api: {
    marketplace: { orders: mocks.orders },
    integrations: { trendyolStatus: mocks.trendyolStatus, trendyolSync: vi.fn() }
  }
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() })
}))

const siparis = (ek = {}) => ({
  id: 'o1',
  provider: 'TRENDYOL',
  externalId: 'PKG-1',
  externalOrderNumber: '10654411111',
  customerDisplayName: 'Ayşe Y.',
  currency: 'TRY',
  grossAmount: 498.9,
  discountAmount: 20,
  commissionAmount: null,
  shippingAmount: null,
  refundAmount: null,
  netContribution: null,
  status: 'DELIVERED',
  orderDate: '2026-08-01T10:00:00.000Z',
  syncedAt: '2026-08-20T10:00:00.000Z',
  itemCount: 2,
  items: [
    { id: 'it1', title: 'Desenli Tepsi', quantity: 2, unitPrice: 249.45, grossAmount: 498.9, discountAmount: 20, sku: 'MSKU-1', barcode: '8683772071724' }
  ],
  ...ek
})

function ciz() {
  return render(
    <MemoryRouter>
      <Orders />
    </MemoryRouter>,
    { wrapper: undefined }
  )
}

describe('Siparişler sekmesi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.trendyolStatus.mockResolvedValue({
      connected: true,
      syncing: false,
      counts: { orders: 1, products: 3 },
      connections: [{ lastSyncedAt: '2026-08-20T09:00:00.000Z' }]
    })
  })

  it('sipariş satırlarını kaynak etiketiyle listeler', async () => {
    mocks.orders.mockResolvedValue({ orders: [siparis()], total: 1 })
    ciz()

    expect(await screen.findByText('10654411111')).toBeInTheDocument()
    // Provider filtresi select'i de "Trendyol" icerir; kaynak etiketini
    // tablo hucresi icinde arariz.
    expect(screen.getAllByText(/Trendyol/).some(el => el.closest('td'))).toBe(true)
    expect(screen.getByText('Teslim edildi')).toBeInTheDocument()
    expect(screen.getByText('Ayşe Y.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Şimdi eşitle/i })).toBeEnabled()
    expect(screen.getByText(/Son eşitleme:/)).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Shopify' })).toBeInTheDocument()
  })

  it('eksik finansal değerleri uydurmadan “—” gösterir', async () => {
    mocks.orders.mockResolvedValue({ orders: [siparis()], total: 1 })
    ciz()

    const row = await screen.findByText('10654411111').then(cell => cell.closest('tr'))
    const cells = within(row).getAllByRole('cell')
    // Komisyon/Kargo/İade/Net Katkı sütunlari "—" olmali.
    expect(cells[5].textContent).toBe('—')
    expect(cells[6].textContent).toBe('—')
    expect(cells[7].textContent).toBe('—')
    expect(cells[8].textContent).toBe('—')
  })

  it('boş durumda rehberlik eder ve çökmez', async () => {
    mocks.orders.mockResolvedValue({ orders: [], total: 0 })
    ciz()

    expect(await screen.findByText(/Henüz sipariş yok/)).toBeInTheDocument()
  })

  it('bağlı değilken eşitlemeyi devre dışı bırakır', async () => {
    mocks.trendyolStatus.mockResolvedValue({ connected: false, syncing: false, connections: [] })
    mocks.orders.mockResolvedValue({ orders: [], total: 0 })
    ciz()

    expect(await screen.findByRole('button', { name: /Şimdi eşitle/i })).toBeDisabled()
    expect(screen.getByText(/Pazaryeri bağlı değil/)).toBeInTheDocument()
  })

  it('hata durumunda tekrar deneme sunar', async () => {
    mocks.orders.mockRejectedValue(new Error('Sunucuya ulaşılamadı'))
    ciz()

    expect(await screen.findByRole('alert')).toHaveTextContent(/Sunucuya ulaşılamadı/)
    expect(screen.getByRole('button', { name: /Tekrar dene/i })).toBeInTheDocument()
  })

  it('satıra tıklayınca detay çekmecesi açılır (ürünler + tutarlar)', async () => {
    mocks.orders.mockResolvedValue({ orders: [siparis()], total: 1 })
    const user = userEvent.setup()
    ciz()

    await user.click(await screen.findByText('10654411111'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Sipariş detayı')).toBeInTheDocument()
    expect(within(dialog).getByText('Desenli Tepsi')).toBeInTheDocument()
    expect(within(dialog).getByText('Hesaplanamaz*')).toBeInTheDocument()
  })
})
