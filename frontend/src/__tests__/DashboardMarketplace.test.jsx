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
    awaitingDirection: null
  })
  mocks.trackerList.mockResolvedValue({ records: [{ id: 'r1', title: 'Kira ödemesi', status: 'open', priority: 'normal', dueAt: '2026-09-01', type: 'payment' }] })
})

describe('Ana Sayfa — pazaryeri bağlı değil', () => {
  it('hero ve görev akışı mevcut davranışını korur, pazaryeri kartı çizilmez', async () => {
    mocks.marketplaceOperations.mockResolvedValue(null)
    renderDashboard()

    await waitFor(() => expect(screen.getByText('İşletmeniz dengeli, 3 konu dikkat istiyor.')).toBeInTheDocument())
    expect(screen.queryByText('Pazaryeri Özeti')).not.toBeInTheDocument()
    expect(screen.queryByText('4 sipariş kargoya verilmeyi bekliyor')).not.toBeInTheDocument()
    // Bagli degil CTA'si gorunur.
    expect(screen.getByText(/Henüz pazaryeri bağlantısı yok/)).toBeInTheDocument()
  })

  it('operations endpoint hata verirse dashboard çökmez', async () => {
    mocks.marketplaceOperations.mockRejectedValue(new Error('network down'))
    renderDashboard()

    await waitFor(() => expect(screen.getByText('İşletmeniz dengeli, 3 konu dikkat istiyor.')).toBeInTheDocument())
    expect(screen.getByText(/Henüz pazaryeri bağlantısı yok/)).toBeInTheDocument()
  })
})

describe('Ana Sayfa — pazaryeri bağlı', () => {
  it('marketplace riskleri hero cümlesiyle BİRLEŞİR (override etmez)', async () => {
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    renderDashboard()

    await waitFor(() => expect(screen.getByText('İşletmeniz dengeli, 6 konu dikkat istiyor.')).toBeInTheDocument())
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

  it('Pazaryeri Özeti kompakt kartı bugünün aggregate değerlerini gösterir', async () => {
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    renderDashboard()

    expect(await screen.findByText('Pazaryeri Özeti')).toBeInTheDocument()
    expect(screen.getByText('₺1.235')).toBeInTheDocument()
    expect(screen.getByText('En çok satan')).toBeInTheDocument()
    expect(screen.getByText('Trendyol')).toBeInTheDocument()
  })
})
