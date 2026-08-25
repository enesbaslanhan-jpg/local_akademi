import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Overview from '@/pages/Workspaces/Overview'

/* İşletme Takibi > Genel Bakış — marketplace entegrasyon testleri.
   Mevcut 4 kartlık bant ve Yaklaşan/Son hareketler korunur; marketplace
   yalnızca zenginlestirir. */

const mocks = vi.hoisted(() => ({
  trackerSummary: vi.fn(),
  trackerList: vi.fn(),
  documentsList: vi.fn(),
  activityList: vi.fn(),
  marketplaceOperations: vi.fn()
}))

vi.mock('@/services/api', () => ({
  api: {
    workspace: {
      tracker: {
        summary: mocks.trackerSummary,
        list: mocks.trackerList
      },
      documents: { list: mocks.documentsList },
      activity: { list: mocks.activityList }
    },
    marketplace: { operations: mocks.marketplaceOperations }
  }
}))

vi.mock('@/context/WorkspaceContext', () => ({
  useWorkspace: () => ({ activeWorkspace: { id: 'w1', name: 'Test İşletme', currency: 'TRY' }, activeWorkspaceId: 'w1' })
}))

function renderOverview(initialEntry = '/app/workspaces/w1/overview') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/app/workspaces/:workspaceId/orders" element={<div>PROBE ORDERS</div>} />
        <Route path="/app/workspaces/:workspaceId/products" element={<div>PROBE PRODUCTS</div>} />
        <Route path="/app/workspaces/:workspaceId/overview" element={<Overview />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.trackerSummary.mockResolvedValue({
    counts: { open: 2, overdue: 3 },
    nextThirtyDays: { payable: 100, receivable: 200, net: 100 }
  })
  mocks.trackerList.mockResolvedValue({ records: [{ id: 'r1', title: 'Elektrik faturası', status: 'open', type: 'payment', dueAt: '2026-09-05' }] })
  mocks.documentsList.mockResolvedValue({ documents: [] })
  mocks.activityList.mockResolvedValue({ items: [] })
})

describe('Genel Bakış — pazaryeri bağlı değil', () => {
  it('mevcut bant ve takip durumu AYNEN çalışır', async () => {
    mocks.marketplaceOperations.mockResolvedValue(null)
    renderOverview()

    expect(await screen.findByText('Açık yükümlülük')).toBeInTheDocument()
    expect(screen.getByText('Dikkat')).toBeInTheDocument() // overdue=3
    expect(screen.getByText('3 kayıt bekliyor')).toBeInTheDocument()
    expect(screen.queryByText('Pazaryeri Özeti')).not.toBeInTheDocument()
    expect(screen.queryByText('Bugünkü sipariş')).not.toBeInTheDocument()
  })
})

describe('Genel Bakış — pazaryeri bağlı', () => {
  function connectedOps(overrides = {}) {
    return {
      summary: {
        connected: true,
        providers: [{ provider: 'TRENDYOL', displayName: null, status: 'ACTIVE', hasError: false }],
        today: { orderCount: 5, grossSales: 1234.56, pendingShipmentCount: 4, returnCount: 1 },
        inventory: { threshold: 10, lowStockCount: 2, outOfStockCount: 0 },
        performance: { bestSeller: { title: 'Tepsi', unitsSold: 9 }, topRevenueProduct: null },
        sync: { lastSyncedAt: new Date().toISOString(), hasError: false }
      },
      actions: [
        { type: 'PENDING_SHIPMENT', severity: 'ATTENTION', count: 4, title: '4 sipariş kargoya verilmeyi bekliyor', category: 'Operasyon', link: { page: 'orders', query: { status: 'CREATED,PROCESSING' } } },
        { type: 'LOW_STOCK', severity: 'ATTENTION', count: 2, title: '2 ürün düşük stokta', category: 'Stok', link: { page: 'products', query: { stockFilter: 'low' } } }
      ],
      ...overrides
    }
  }

  it('marketplace KPI şeridi mevcut bandın YANINA ayrı satırda gelir', async () => {
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    renderOverview()

    expect(await screen.findByText('Açık yükümlülük')).toBeInTheDocument()
    expect(screen.getByText('Bugünkü sipariş')).toBeInTheDocument()
    expect(screen.getByText('Bugünkü brüt satış')).toBeInTheDocument()
    // Aynı değer KPI şeridi ve Pazaryeri Özeti kartında da görünür.
    expect(screen.getAllByText('₺1.234,56').length).toBeGreaterThanOrEqual(1)
    // Mevcut kartlar hâlâ yerinde.
    expect(screen.getByText('Belge')).toBeInTheDocument()
    expect(screen.getByText('Son değişiklik')).toBeInTheDocument()
  })

  it('Takip durumu birleşik risk özeti üretir (geciken + marketplace)', async () => {
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    renderOverview()

    await waitFor(() => expect(screen.getByText('3 geciken kayıt · 4 sipariş kargoya verilmeyi bekliyor · 2 ürün düşük stokta')).toBeInTheDocument())
  })

  it('Pazaryeri Özeti kartı CTA ile doğru sayfaya derin bağlanır', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    renderOverview()

    const cta = await screen.findByText('Siparişleri gör')
    await user.click(cta)
    expect(await screen.findByText('PROBE ORDERS')).toBeInTheDocument()
  })

  it('Yaklaşan listesi aggregate aksiyonları kaynak etiketiyle gösterir', async () => {
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    renderOverview()

    expect(await screen.findByText('4 sipariş kargoya verilmeyi bekliyor')).toBeInTheDocument()
    expect(screen.getAllByText('Trendyol').length).toBeGreaterThan(0)
  })

  it('activity feed aggregate marketplace eventlerini provider etiketiyle çevirir', async () => {
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    mocks.activityList.mockResolvedValue({
      items: [{
        id: 'a1',
        action: 'MARKETPLACE_ORDERS_IMPORTED',
        metadata: JSON.stringify({ provider: 'TRENDYOL', count: 20 }),
        createdAt: new Date().toISOString()
      }]
    })
    renderOverview()

    // Son değişiklik karti da ayni event'i etiketledigi icin birden fazla konum olur.
    await waitFor(() => expect(screen.getAllByText('20 yeni pazaryeri siparişi eşitlendi').length).toBeGreaterThanOrEqual(1))
    expect(screen.getAllByText('Trendyol').length).toBeGreaterThan(0)
  })

  it('activity metadata OBJECT geldiğinde (gerçek API şekli) sayı ve provider kaybolmaz', async () => {
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    mocks.activityList.mockResolvedValue({
      items: [{
        id: 'a2',
        action: 'MARKETPLACE_ORDERS_IMPORTED',
        metadata: { provider: 'TRENDYOL', count: 20 },
        createdAt: new Date().toISOString()
      }]
    })
    renderOverview()

    await waitFor(() => expect(screen.getAllByText('20 yeni pazaryeri siparişi eşitlendi').length).toBeGreaterThanOrEqual(1))
    expect(screen.getAllByText('Trendyol').length).toBeGreaterThan(0)
  })

  it('sync hatasında kontrollü mesaj gösterir (raw error yok)', async () => {
    mocks.marketplaceOperations.mockResolvedValue({
      ...connectedOps(),
      summary: {
        ...connectedOps().summary,
        sync: { lastSyncedAt: new Date(Date.now() - 2 * 3600_000).toISOString(), hasError: true }
      },
      actions: [
        { type: 'SYNC_ERROR', severity: 'ATTENTION', count: 1, title: 'Pazaryeri verileri güncellenemedi', detail: 'Son başarılı eşitleme bir süredir yapılamıyor.', category: 'Bağlantı', link: { page: 'orders', query: {} } }
      ]
    })
    renderOverview()

    expect(await screen.findAllByText(/Pazaryeri verileri güncellenemedi/).then(rows => rows.length)).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Son başarılı eşitleme:/)).toBeInTheDocument()
    expect(screen.queryByText(/TRENDYOL_AUTH|PrismaClient|stack/i)).not.toBeInTheDocument()
  })
})
