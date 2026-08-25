import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Products from '@/pages/Workspaces/Products'

/*
 * ISLETME TAKIBI > URUNLER ekran testleri.
 *
 * Kurallar: performans kolonlari LocalKarar aggregate'inden; provider
 * analytics (views/favorites) ekranda HIC YER ALMAZ. Dusuk stok
 * esigi sunucudan gelir ve satir vurgusu icin kullanilir.
 */

const mocks = vi.hoisted(() => ({
  products: vi.fn(),
  product: vi.fn()
}))

vi.mock('@/services/api', () => ({
  api: {
    marketplace: {
      products: mocks.products,
      product: mocks.product,
      productsOverview: vi.fn()
    }
  }
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() })
}))

const urun = (ek = {}) => ({
  id: 'p1',
  provider: 'TRENDYOL',
  externalId: 'BC-A',
  title: 'Urun A',
  brand: 'Marka X',
  category: 'Kategori Y',
  sku: 'SKU-A',
  barcode: 'BC-A',
  salePrice: 100,
  listPrice: 120,
  stockQuantity: 8,
  isActive: true,
  syncedAt: '2026-08-20T10:00:00.000Z',
  lowStock: true,
  performance: {
    windowDays: 30,
    unitsSold: 5,
    orderCount: 2,
    grossSales: 500,
    averageSellingPrice: 100,
    returnedUnits: 2,
    returnRate: 0.4,
    commissionTotal: null,
    shippingTotal: null,
    refundTotal: null,
    netContribution: null
  },
  ...ek
})

function ciz() {
  // useParams calismasi icin gercek rota sablonuyla sarilir.
  return render(
    <MemoryRouter initialEntries={['/app/workspaces/w1/products']}>
      <Routes>
        <Route path="/app/workspaces/:workspaceId/products" element={<Products />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Ürünler sekmesi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.products.mockResolvedValue({ products: [urun()], total: 1, threshold: 10, windowDays: 30 })
  })

  it('ürün satırlarını kaynak etiketi ve stokla listeler', async () => {
    ciz()

    expect(await screen.findByText('Urun A')).toBeInTheDocument()
    const badge = screen.getAllByText(/Trendyol/).find(el => el.closest('td'))
    expect(badge).toBeInTheDocument()
    expect(screen.getByText('SKU-A')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Yenile/i })).toBeEnabled()
    expect(screen.getByText(/Düşük stok eşiği: ≤ 10/)).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Shopify' })).toBeInTheDocument()
  })

  it('eksik finansalları “—” olarak gösterir, 0 yazmaz', async () => {
    ciz()
    const row = await screen.findByText('Urun A').then(cell => cell.closest('tr'))
    // NOT: ilk kolon urun gorseli (thumbnail) oldugu icin veri kolonlari
    // birer kaydiridir.
    expect(within(row).getAllByRole('cell')[10].textContent).toContain('%40') // iade orani var

    const noPerf = urun({
      id: 'p2',
      title: 'Urun Sifir',
      performance: { ...urun().performance, unitsSold: 0, orderCount: 0, grossSales: 0, returnRate: null, averageSellingPrice: null }
    })
    mocks.products.mockResolvedValue({ products: [noPerf], total: 1, threshold: 10, windowDays: 30 })

    ciz()
    const row2 = await screen.findByText('Urun Sifir').then(cell => cell.closest('tr'))
    const cells = within(row2).getAllByRole('cell')
    expect(cells[7].textContent).toBe('0')
    expect(cells[10].textContent).toBe('—') // iade orani null → uydurma yok
  })

  it('filtre değişikliklerini sunucuya iletir', async () => {
    const user = userEvent.setup()
    ciz()
    await screen.findByText('Urun A')

    await user.type(screen.getByLabelText('Ürün ara'), 'tepsi')
    // Her tuş vuruşu yeniden yüklemeyi tetikler; son durumda arama
    // terimi sunucuya ulaşmış olmalı.
    await waitFor(() => expect(mocks.products).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({ q: 'tepsi', windowDays: '30' })
    ))
  })

  it('boş durum gösterir', async () => {
    mocks.products.mockResolvedValue({ products: [], total: 0, threshold: 10, windowDays: 30 })
    ciz()
    expect(await screen.findByText(/Henüz ürün yok/)).toBeInTheDocument()
  })

  it('satıra tıklayınca detay drawer’ı ürün bilgileri + 7/30/90 performans açar', async () => {
    const user = userEvent.setup()
    mocks.product.mockResolvedValue({
      product: urun(),
      performance: {
        7: { ...urun().performance, windowDays: 7, unitsSold: 3 },
        30: urun().performance,
        90: { ...urun().performance, windowDays: 90, unitsSold: 12, grossSales: 1200 }
      },
      capabilities: { supportsProductViews: false, supportsFavorites: false, supportsProductAnalytics: false }
    })
    ciz()

    await user.click(await screen.findByText('Urun A'))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Ürün Bilgileri')).toBeInTheDocument()
    expect(within(dialog).getByText('Performans')).toBeInTheDocument()
    expect(within(dialog).getByRole('tab', { selected: true })).toHaveTextContent('30 gün')

    // 90 güne geç — brüt ciro 1200 TL olmalı (para biçimi ICU'ya göre değişebilir)
    await user.click(within(dialog).getByRole('tab', { name: /90 gün/ }))
    expect(await within(dialog).findByText(/1\.200/)).toBeInTheDocument()

    // Provider analytics alanlari hicbir sekilde render edilmez:
    const text = dialog.textContent || ''
    for (const forbidden of ['Görüntülenme', 'Favori', 'Beğeni', 'views']) {
      expect(text).not.toContain(forbidden)
    }
  })
})
