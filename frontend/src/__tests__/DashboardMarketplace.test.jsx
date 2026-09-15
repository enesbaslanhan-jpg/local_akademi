import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'

/* Ana Sayfa / Kontrol Merkezi — marketplace entegrasyon testleri.
   Ortak operations servisi tek endpoint'ten okunur; bagli degilse
   mevcut davranis AYNEN kalir. */

const mocks = vi.hoisted(() => ({
  getSummary: vi.fn(),
  trackerSummary: vi.fn(),
  trackerList: vi.fn(),
  marketplaceOperations: vi.fn(),
  listSessions: vi.fn(),
  getResult: vi.fn()
}))

vi.mock('@/services/api', () => ({
  api: {
    dashboard: { getSummary: mocks.getSummary },
    workspace: {
      tracker: {
        summary: mocks.trackerSummary,
        list: mocks.trackerList
      }
    },
    marketplace: { operations: mocks.marketplaceOperations },
    decisionChecks: {
      listSessions: mocks.listSessions,
      getResult: mocks.getResult
    }
  }
}))

vi.mock('@/context/WorkspaceContext', () => ({
  useWorkspace: () => ({ activeWorkspaceId: 'ws-1' })
}))

vi.mock('@/components/decision-checks/DecisionReceipt', () => ({
  default: () => <div data-testid="receipt" />
}))

function connectedOps(overrides = {}) {
  return {
    summary: {
      connected: true,
      providers: [{ provider: 'TRENDYOL', displayName: null, status: 'ACTIVE', hasError: false }],
      today: { orderCount: 5, grossSales: 1234.56, pendingShipmentCount: 4, returnCount: 1 },
      inventory: { threshold: 10, lowStockCount: 2, outOfStockCount: 1 },
      performance: { bestSeller: { title: 'Tepsi', unitsSold: 9 }, topRevenueProduct: null },
      sync: { lastSyncedAt: new Date().toISOString(), hasError: false }
    },
    actions: [
      { type: 'PENDING_SHIPMENT', severity: 'ATTENTION', count: 4, title: '4 sipariş kargoya verilmeyi bekliyor', category: 'Operasyon', link: { page: 'orders', query: { status: 'CREATED,PROCESSING' } } },
      { type: 'LOW_STOCK', severity: 'ATTENTION', count: 2, title: '2 ürün düşük stokta', category: 'Stok', link: { page: 'products', query: { stockFilter: 'low' } } },
      { type: 'OUT_OF_STOCK', severity: 'CRITICAL', count: 1, title: '1 ürün stokta yok', category: 'Stok', link: { page: 'products', query: { stockFilter: 'out' } } }
    ],
    ...overrides
  }
}

/* Derin baglanti dogrulamasi icin hedef rotalarda prob sayfalari var;
   aksiyon satiri tiklandiginda ilgili prob render edilir. */
function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/app/dashboard']}>
      <Routes>
        <Route path="/app/workspaces/ws-1/orders" element={<div>PROBE ORDERS</div>} />
        <Route path="/app/workspaces/ws-1/products" element={<div>PROBE PRODUCTS</div>} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSummary.mockResolvedValue({ resumeItem: null, upcomingTasks: [] })
  mocks.listSessions.mockResolvedValue([])
  mocks.trackerSummary.mockResolvedValue({
    counts: { open: 1, overdue: 3 },
    nextThirtyDays: { payable: 100, receivable: 200, net: 100 },
    awaitingDirection: null,
    /* 15.09.2026: Gerçekleşen kartı Ana Sayfa'da; sunucu üç dönemi veriyor. */
    periods: {
      today: { tahsilat: { amount: 0, currency: 'TRY', otherCurrencies: [] }, odeme: { amount: 0, currency: 'TRY', otherCurrencies: [] }, pazaryeriBrut: { amount: 0, currency: 'TRY', otherCurrencies: [] }, pazaryeriNet: { amount: 0, currency: 'TRY', otherCurrencies: [] }, iade: { amount: 0, currency: 'TRY', otherCurrencies: [] }, net: 0, kayitSayisi: { tahsilat: 0, odeme: 0 }, siparisSayisi: 0 },
      week: { tahsilat: { amount: 900, currency: 'TRY', otherCurrencies: [] }, odeme: { amount: 400, currency: 'TRY', otherCurrencies: [] }, pazaryeriBrut: { amount: 1235, currency: 'TRY', otherCurrencies: [] }, pazaryeriNet: { amount: 1000, currency: 'TRY', otherCurrencies: [] }, iade: { amount: 50, currency: 'TRY', otherCurrencies: [] }, net: 1500, kayitSayisi: { tahsilat: 1, odeme: 1 }, siparisSayisi: 5 },
      month: { tahsilat: { amount: 0, currency: 'TRY', otherCurrencies: [] }, odeme: { amount: 0, currency: 'TRY', otherCurrencies: [] }, pazaryeriBrut: { amount: 0, currency: 'TRY', otherCurrencies: [] }, pazaryeriNet: { amount: 0, currency: 'TRY', otherCurrencies: [] }, iade: { amount: 0, currency: 'TRY', otherCurrencies: [] }, net: 0, kayitSayisi: { tahsilat: 0, odeme: 0 }, siparisSayisi: 0 }
    }
  })
  mocks.trackerList.mockResolvedValue({ records: [{ id: 'r1', title: 'Kira ödemesi', status: 'open', priority: 'normal', dueAt: '2026-09-01', type: 'payment' }] })
})

describe('Ana Sayfa — pazaryeri bağlı değil', () => {
  it('does not label an empty business as healthy or show positive zero KPIs', async () => {
    mocks.marketplaceOperations.mockResolvedValue(null)
    mocks.trackerSummary.mockResolvedValue({ counts: { open: 0, overdue: 0 }, nextThirtyDays: { payable: 0, receivable: 0, net: 0 } })
    mocks.trackerList.mockResolvedValue({ records: [], total: 0 })
    renderDashboard()
    expect(await screen.findByText('Değerlendirme için henüz kayıt yok.')).toBeInTheDocument()
    expect(screen.queryByText('Olumlu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /İlk kaydı ekle/ })).toBeInTheDocument()
  })

  it('distinguishes unavailable records from an empty business', async () => {
    mocks.marketplaceOperations.mockResolvedValue(null)
    mocks.trackerList.mockRejectedValue(new Error('offline'))
    renderDashboard()
    expect(await screen.findByText('İşletme durumu şu anda değerlendirilemiyor.')).toBeInTheDocument()
    expect(screen.queryByText('Değerlendirme için henüz kayıt yok.')).not.toBeInTheDocument()
  })
  it('hero ve görev akışı mevcut davranışını korur, pazaryeri kartı çizilmez', async () => {
    mocks.marketplaceOperations.mockResolvedValue(null)
    renderDashboard()

    await waitFor(() => expect(screen.getByText('3 konu dikkat istiyor.')).toBeInTheDocument())
    expect(screen.queryByText('Pazaryeri Özeti')).not.toBeInTheDocument()
    expect(screen.queryByText('4 sipariş kargoya verilmeyi bekliyor')).not.toBeInTheDocument()
    /* 15.09.2026: bağlı değilken CTA yok; Gerçekleşen kartı bağlantıdan bağımsız durur. */
    expect(screen.queryByText(/Henüz pazaryeri bağlantısı yok/)).not.toBeInTheDocument()
    expect(screen.getByText('Gerçekleşen')).toBeInTheDocument()
  })

  it('operations endpoint hata verirse dashboard çökmez', async () => {
    mocks.marketplaceOperations.mockRejectedValue(new Error('network down'))
    renderDashboard()

    await waitFor(() => expect(screen.getByText('3 konu dikkat istiyor.')).toBeInTheDocument())
    expect(screen.getByText('Gerçekleşen')).toBeInTheDocument()
  })
})

describe('Ana Sayfa — pazaryeri bağlı', () => {
  it('marketplace riskleri hero cümlesiyle BİRLEŞİR (override etmez)', async () => {
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    renderDashboard()

    await waitFor(() => expect(screen.getByText('6 konu dikkat istiyor.')).toBeInTheDocument())
    expect(screen.getAllByText(/4 sipariş kargoya verilmeyi bekliyor/).length).toBeGreaterThanOrEqual(1)
  })

  it('Sıradaki işler listesinde aggregate aksiyon satırları görünür, manuel kayıt bastırılmaz', async () => {
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    renderDashboard()

    await waitFor(() => expect(screen.getByText('Kira ödemesi')).toBeInTheDocument())
    expect(screen.getByText('4 sipariş kargoya verilmeyi bekliyor')).toBeInTheDocument()
    // Dedup: aynı aksiyon iki kez listelenmez.
    expect(screen.getAllByText('4 sipariş kargoya verilmeyi bekliyor')).toHaveLength(1)
  })

  it('aksiyon satırına tıklayınca doğru filtreyle derin bağlantı açılır', async () => {
    const user = userEvent.setup()
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    renderDashboard()

    const row = await screen.findByText('4 sipariş kargoya verilmeyi bekliyor')
    await user.click(row.closest('button'))
    expect(await screen.findByText('PROBE ORDERS')).toBeInTheDocument()
  })

  it('Gerçekleşen kartı "Pazaryeri Özeti" yerine gelir; dönem çipi değişince rakam değişir', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    renderDashboard()

    expect(await screen.findByText('Gerçekleşen')).toBeInTheDocument()
    expect(screen.queryByText('Pazaryeri Özeti')).not.toBeInTheDocument()
    /* Varsayılan "Bu hafta": pazaryeri net 1.000, alt yazıda brüt/iade/sipariş. */
    expect(screen.getByText('₺1.000')).toBeInTheDocument()
    expect(screen.getByText(/brüt ₺1.235 · iade ₺50 · 5 sipariş/)).toBeInTheDocument()
    expect(screen.getByText('₺1.500')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Bugün' }))
    expect(screen.queryByText('₺1.500')).not.toBeInTheDocument()
  })
})
