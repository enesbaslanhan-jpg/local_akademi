import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Products from '@/pages/Workspaces/Products'

/* Ürünler ekranı — deep-link stok filtresi + gorsel fallback + yerel
   ayar kaydi testleri. */

const mocks = vi.hoisted(() => ({
  products: vi.fn(),
  product: vi.fn(),
  updateProductSettings: vi.fn()
}))

vi.mock('@/services/api', () => ({
  api: {
    marketplace: {
      products: mocks.products,
      product: mocks.product,
      updateProductSettings: mocks.updateProductSettings
    }
  }
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() })
}))

function productRow(overrides = {}) {
  return {
    id: 'p1',
    provider: 'TRENDYOL',
    externalId: 'BC-P1',
    title: 'Paslanmaz Tepsi',
    brand: 'Marka',
    category: 'Kategori',
    sku: 'SKU-1',
    barcode: 'BC-P1',
    salePrice: 99.9,
    listPrice: 120,
    stockQuantity: 3,
    isActive: true,
    imageUrl: 'https://cdn.example.com/img.jpg',
    syncedAt: new Date().toISOString(),
    lowStock: true,
    internalNote: null,
    tags: null,
    lowStockThresholdOverride: null,
    isFavorite: false,
    performance: { unitsSold: 5, orderCount: 4, grossSales: 499.5, averageSellingPrice: 99.9, returnedUnits: 0, returnRate: null, commissionTotal: null, shippingTotal: null, refundTotal: null, netContribution: null },
    ...overrides
  }
}

function renderProducts(initialEntry = '/app/workspaces/w1/products') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/app/workspaces/:workspaceId/products" element={<Products />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.products.mockResolvedValue({
    products: [productRow()],
    total: 1,
    threshold: 10,
    windowDays: 30
  })
})

describe('Ürünler — deep-link filtre', () => {
  it('?stockFilter=low ile açılışta düşük stok filtresi seçili gelir', async () => {
    renderProducts('/app/workspaces/w1/products?stockFilter=low')
    await waitFor(() => expect(mocks.products).toHaveBeenCalledWith('w1', expect.objectContaining({ stockFilter: 'low' })))
  })

  it('HIGH_RETURN_RATE aksiyonu ?sort=mostReturned ile açılır', async () => {
    renderProducts('/app/workspaces/w1/products?sort=mostReturned')
    await waitFor(() => expect(mocks.products).toHaveBeenCalledWith('w1', expect.objectContaining({ sort: 'mostReturned' })))
  })

  it('geçersiz stockFilter parametresi yok sayılır', async () => {
    renderProducts('/app/workspaces/w1/products?stockFilter=hack')
    await waitFor(() => expect(mocks.products).toHaveBeenCalled())
    const [, sentFilters] = mocks.products.mock.calls[0]
    expect(sentFilters.stockFilter).toBeUndefined()
  })
})

describe('Ürünler — provider filtresi', () => {
  it('HEPSIBURADA seçimi sunucuya iletilir', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderProducts()
    await screen.findByText('Paslanmaz Tepsi')

    await user.selectOptions(screen.getByLabelText('Kaynak'), 'HEPSIBURADA')
    await waitFor(() => expect(mocks.products).toHaveBeenCalledWith('w1', expect.objectContaining({ provider: 'HEPSIBURADA' })))
  })

  it('N11 seçimi sunucuya iletilir', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderProducts()
    await screen.findByText('Paslanmaz Tepsi')

    await user.selectOptions(screen.getByLabelText('Kaynak'), 'N11')
    await waitFor(() => expect(mocks.products).toHaveBeenCalledWith('w1', expect.objectContaining({ provider: 'N11' })))
  })
})

describe('Ürünler — görsel ve yerel ayarlar', () => {
  it('görsel yüklenemezse notr placeholder gösterilir (sahte resim yok)', async () => {
    const { fireEvent } = await import('@testing-library/react')
    mocks.product.mockResolvedValue({
      product: productRow({ imageUrl: 'https://cdn.example.com/broken.jpg' }),
      performance: {}
    })
    renderProducts()

    await screen.findByText('Paslanmaz Tepsi')
    const img = document.querySelector('img')
    expect(img).toBeTruthy()
    fireEvent.error(img)
    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelector('[class*="thumbPlaceholderIcon"]')).toBeTruthy()
  })

  it('yerel ayarlar (not/etiket/eşik/favori) PATCH ile kaydedilir', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mocks.product.mockResolvedValue({
      product: productRow(),
      performance: {}
    })
    mocks.updateProductSettings.mockResolvedValue({ product: { id: 'p1', isFavorite: true } })
    renderProducts()

    await user.click(await screen.findByText('Paslanmaz Tepsi'))
    const noteBox = await screen.findByPlaceholderText('Bu ürünle ilgili iç notunuz…')
    await user.type(noteBox, 'kampanya kontrolü')
    await user.click(screen.getByText('Ayarları kaydet'))

    await waitFor(() => expect(mocks.updateProductSettings).toHaveBeenCalledWith('w1', 'p1', expect.objectContaining({
      internalNote: 'kampanya kontrolü',
      isFavorite: false
    })))
  })
})
