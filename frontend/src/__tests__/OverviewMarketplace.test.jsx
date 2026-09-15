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
    request: vi.fn(async path => path.endsWith('/accounts') ? { accounts: [] } : { records: [], notice: 'Tarihi teyit edin.' }),
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
    nextThirtyDays: { payable: 100, receivable: 200, net: 100 },
    /* Bant artık tutar söylüyor (11.09.2026); sunucu bu üç alanı da veriyor. */
    thisWeek: { payable: 1500, payableCount: 2, receivable: 300, receivableCount: 1 },
    overdueTotals: { amount: 7000, count: 3 },
    /* 15.09.2026: bant 30 gün planını okur (hakediş dahil), geciken yön yön;
       Gerçekleşen satırı periods'tan gelir. */
    plan30: {
      payable: { amount: 1500, currency: 'TRY', otherCurrencies: [] },
      receivable: { amount: 300, currency: 'TRY', otherCurrencies: [] },
      hakedis: { net: { amount: 700, currency: 'TRY', otherCurrencies: [] }, orderCount: 2, estimated: true },
      net: -500, counts: { payable: 2, receivable: 1, hakedisOrders: 2 }, estimated: true, estimatedReasons: ['payoutDelay']
    },
    overdueSplit: { payable: { amount: 5000, currency: 'TRY', otherCurrencies: [] }, receivable: { amount: 2000, currency: 'TRY', otherCurrencies: [] }, count: 3 },
    periods: {
      today: { tahsilat: { amount: 0, currency: 'TRY', otherCurrencies: [] }, odeme: { amount: 0, currency: 'TRY', otherCurrencies: [] }, pazaryeriBrut: { amount: 0, currency: 'TRY', otherCurrencies: [] }, pazaryeriNet: { amount: 0, currency: 'TRY', otherCurrencies: [] }, iade: { amount: 0, currency: 'TRY', otherCurrencies: [] }, net: 0, kayitSayisi: { tahsilat: 0, odeme: 0 }, siparisSayisi: 0 },
      week: { tahsilat: { amount: 900, currency: 'TRY', otherCurrencies: [{ currency: 'USD', amount: 100, count: 1 }] }, odeme: { amount: 400, currency: 'TRY', otherCurrencies: [] }, pazaryeriBrut: { amount: 2500, currency: 'TRY', otherCurrencies: [] }, pazaryeriNet: { amount: 2000, currency: 'TRY', otherCurrencies: [] }, iade: { amount: 300, currency: 'TRY', otherCurrencies: [] }, net: 2500, kayitSayisi: { tahsilat: 1, odeme: 1 }, siparisSayisi: 3 },
      month: { tahsilat: { amount: 0, currency: 'TRY', otherCurrencies: [] }, odeme: { amount: 0, currency: 'TRY', otherCurrencies: [] }, pazaryeriBrut: { amount: 0, currency: 'TRY', otherCurrencies: [] }, pazaryeriNet: { amount: 0, currency: 'TRY', otherCurrencies: [] }, iade: { amount: 0, currency: 'TRY', otherCurrencies: [] }, net: 0, kayitSayisi: { tahsilat: 0, odeme: 0 }, siparisSayisi: 0 }
    },
    cash: null
  })
  mocks.trackerList.mockResolvedValue({ records: [{ id: 'r1', title: 'Elektrik faturası', status: 'open', type: 'payment', dueAt: '2026-09-05' }] })
  mocks.documentsList.mockResolvedValue({ documents: [] })
  mocks.activityList.mockResolvedValue({ items: [] })
})

describe('Genel Bakış — pazaryeri bağlı değil', () => {
  /*
   * 🔴 BANT SAYI DEĞİL TUTAR SÖYLÜYOR (ürün sahibi, 11.09.2026).
   * "3 geciken" karar verdirmez, "₺7.000 gecikmiş" verdirir. Kasa hesabı
   * yoksa "—": sıfır "kasa boş" demek olurdu.
   */
  it('bant 30 gün planı (hakediş dahil), geciken yön yön ve kasayı gösterir', async () => {
    mocks.marketplaceOperations.mockResolvedValue(null)
    renderOverview()

    expect(await screen.findByText('30 gün içinde ödenecek')).toBeInTheDocument()
    expect(screen.getByText('₺1.500,00')).toBeInTheDocument()
    /* tahsilat 300 + hakediş 700 = 1.000; alt yazı hakedişi "tahmini" der */
    expect(screen.getByText('₺1.000,00')).toBeInTheDocument()
    expect(screen.getByText('₺700,00 pazaryeri hakedişi (tahmini)')).toBeInTheDocument()
    expect(screen.getByText('₺7.000,00')).toBeInTheDocument()
    expect(screen.getByText('Ödeme ₺5.000,00 · Tahsilat ₺2.000,00')).toBeInTheDocument()
    /* Gerçekleşen satırı varsayılan "Bu hafta": USD ayrıca, toplanmaz */
    expect(screen.getByText('Gerçekleşen')).toBeInTheDocument()
    expect(screen.getByText('₺900,00')).toBeInTheDocument()
    expect(screen.getByText(/100 USD ayrıca/)).toBeInTheDocument()
    expect(screen.getAllByText('₺2.500,00').length).toBeGreaterThan(0) // pazaryeri satışı ve net aynı tutar
    expect(screen.getByText('Hesap ekle')).toBeInTheDocument()
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

    expect(await screen.findByText('30 gün içinde ödenecek')).toBeInTheDocument()
    // Marketplace istegi ana ozet isteklerinden bagimsiz tamamlanir. Yavas CI
    // makinesinde ilk bant gorunurken bu ikinci durum henuz render edilmemis
    // olabilir; gercek asenkron kullanici akisini bekle.
    expect(await screen.findByText('Bugünkü sipariş')).toBeInTheDocument()
    expect(screen.getByText('Bugünkü brüt satış')).toBeInTheDocument()
    // Aynı değer KPI şeridi ve Pazaryeri Özeti kartında da görünür.
    expect(screen.getAllByText('₺1.234,56').length).toBeGreaterThanOrEqual(1)
    // Bant kartları hâlâ yerinde.
    expect(screen.getByText('Geciken')).toBeInTheDocument()
    expect(screen.getByText('Kasada bugün')).toBeInTheDocument()
  })

  /* "Takip durumu" kutusu kaldırıldı; pazaryeri riskleri bağlıyken kendi
     KPI şeridinde, gecikme tutar kutusunda. Riskler kaybolmadı. */
  it('pazaryeri riskleri KPI şeridinde görünmeye devam eder', async () => {
    mocks.marketplaceOperations.mockResolvedValue(connectedOps())
    renderOverview()

    expect((await screen.findAllByText('Bekleyen kargo')).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Ödeme ₺5.000,00 · Tahsilat ₺2.000,00')).toBeInTheDocument() // geciken yön yön (15.09.2026)
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
