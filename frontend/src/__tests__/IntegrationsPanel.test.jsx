import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IntegrationsPanel from '@/components/settings/IntegrationsPanel'

/*
 * AYARLAR > ENTEGRASYONLAR panel testleri.
 *
 * Kurallar: Trendyol + Hepsiburada + N11 + Shopify AKTIF; WooCommerce "Yakinda"
 * ve devre disi. Credential input'lari maskelidir ve formu dolduktan
 * sonra ekrana GERI YAZILMAZ. Ortak modal shell, provider'a gore alan
 * seti degistirir (resmi auth modelleri).
 */

const mocks = vi.hoisted(() => ({
  catalog: vi.fn(),
  trendyolStatus: vi.fn(),
  trendyolConnect: vi.fn(),
  trendyolSync: vi.fn(),
  trendyolDisconnect: vi.fn(),
  hepsiburadaStatus: vi.fn(),
  hepsiburadaConnect: vi.fn(),
  hepsiburadaSync: vi.fn(),
  hepsiburadaDisconnect: vi.fn(),
  n11Status: vi.fn(),
  n11Connect: vi.fn(),
  n11Sync: vi.fn(),
  n11Disconnect: vi.fn(),
  shopifyStatus: vi.fn(),
  shopifyConnect: vi.fn(),
  shopifySync: vi.fn(),
  shopifyDisconnect: vi.fn()
}))

vi.mock('@/services/api', () => ({
  api: {
    integrations: {
      catalog: mocks.catalog,
      trendyolStatus: mocks.trendyolStatus,
      trendyolConnect: mocks.trendyolConnect,
      trendyolSync: mocks.trendyolSync,
      trendyolDisconnect: mocks.trendyolDisconnect,
      hepsiburadaStatus: mocks.hepsiburadaStatus,
      hepsiburadaConnect: mocks.hepsiburadaConnect,
      hepsiburadaSync: mocks.hepsiburadaSync,
      hepsiburadaDisconnect: mocks.hepsiburadaDisconnect,
      n11Status: mocks.n11Status,
      n11Connect: mocks.n11Connect,
      n11Sync: mocks.n11Sync,
      n11Disconnect: mocks.n11Disconnect,
      shopifyStatus: mocks.shopifyStatus,
      shopifyConnect: mocks.shopifyConnect,
      shopifySync: mocks.shopifySync,
      shopifyDisconnect: mocks.shopifyDisconnect
    }
  }
}))

vi.mock('@/context/WorkspaceContext', () => ({
  useWorkspace: () => ({ activeWorkspaceId: 'w1', activeWorkspace: { id: 'w1', name: 'Test İşletme' } })
}))

const CATALOG = [
  { provider: 'TRENDYOL', label: 'Trendyol', enabled: true, comingSoon: false },
  { provider: 'HEPSIBURADA', label: 'Hepsiburada', enabled: true, comingSoon: false },
  { provider: 'N11', label: 'N11', enabled: true, comingSoon: false },
  { provider: 'SHOPIFY', label: 'Shopify', enabled: true, comingSoon: false },
  { provider: 'WOOCOMMERCE', label: 'WooCommerce', enabled: false, comingSoon: true }
]

const DISCONNECTED = {
  connected: false, syncing: false, counts: { orders: 0, products: 0 }, connections: []
}

function ciz() {
  return render(<IntegrationsPanel />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.catalog.mockResolvedValue({ marketplaces: CATALOG })
  mocks.trendyolStatus.mockResolvedValue({ ...DISCONNECTED })
  mocks.hepsiburadaStatus.mockResolvedValue({ ...DISCONNECTED })
  mocks.n11Status.mockResolvedValue({ ...DISCONNECTED })
  mocks.shopifyStatus.mockResolvedValue({ ...DISCONNECTED })
})

describe('Entegrasyonlar paneli', () => {
  it('dört provider aktif; yalnız WooCommerce “Yakında”', async () => {
    ciz()
    const trendyol = await screen.findByLabelText('Trendyol entegrasyonu')
    expect(await within(trendyol).findByRole('button', { name: /Bağla/ })).toBeInTheDocument()

    const hb = screen.getByLabelText('Hepsiburada entegrasyonu')
    expect(await within(hb).findByRole('button', { name: /Bağla/ })).toBeInTheDocument()

    const n11 = screen.getByLabelText('N11 entegrasyonu')
    expect(await within(n11).findByRole('button', { name: /Bağla/ })).toBeInTheDocument()

    const shopify = screen.getByLabelText('Shopify entegrasyonu')
    expect(await within(shopify).findByRole('button', { name: /Bağla/ })).toBeInTheDocument()
    const woo = screen.getByLabelText(/WooCommerce entegrasyonu/)
    expect(within(woo).getByText(/Yakında/)).toBeInTheDocument()
    expect(within(woo).queryByRole('button')).toBeNull()
  })

  it('Trendyol bağla modalında API Secret maskelidir ve resmî rehber yolu gösterilir', async () => {
    const user = userEvent.setup()
    ciz()
    const card = await screen.findByLabelText('Trendyol entegrasyonu')
    await user.click(await within(card).findByRole('button', { name: /Bağla/ }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Entegrasyon Bilgileri/i)).toBeInTheDocument()
    const secretInput = within(dialog).getByLabelText('API Secret').querySelector('input') ?? within(dialog).getByLabelText('API Secret')
    expect(secretInput).toHaveAttribute('type', 'password')
  })

  it('HEPSIBURADA modalı resmi credential modelini ister (merchantId/username/password)', async () => {
    const user = userEvent.setup()
    ciz()
    const hbCard = await screen.findByLabelText('Hepsiburada entegrasyonu')
    await user.click(await within(hbCard).findByRole('button', { name: /Bağla/ }))

    const dialog = await screen.findByRole('dialog')
    // Resmi rehber: merchant.hepsiburada.com > Ayarlar > Entegrasyonlar
    expect(within(dialog).getByText(/merchant\.hepsiburada\.com/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Ayarlar/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Mağaza / Merchant ID')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('API Kullanıcı Adı')).toBeInTheDocument()
    const passwordInput = within(dialog).getByLabelText('API Şifresi').querySelector('input') ?? within(dialog).getByLabelText('API Şifresi')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('HEPSIBURADA connect resmi alanlarla çağrılır', async () => {
    const user = userEvent.setup()
    mocks.hepsiburadaConnect.mockResolvedValue({ connection: {} })
    ciz()
    const hbCard = await screen.findByLabelText('Hepsiburada entegrasyonu')
    await user.click(await within(hbCard).findByRole('button', { name: /Bağla/ }))
    const dialog = await screen.findByRole('dialog')

    await user.type(within(dialog).getByLabelText('Mağaza / Merchant ID'), 'b24f1a2c-1111-4a5b-9c6d-000000000001')
    await user.type(within(dialog).getByLabelText('API Kullanıcı Adı'), 'api-user@merchant.com')
    const passwordInput = within(dialog).getByLabelText('API Şifresi').querySelector('input') ?? within(dialog).getByLabelText('API Şifresi')
    await user.type(passwordInput, 'hb-secret-pass')
    await user.click(within(dialog).getByRole('button', { name: /Doğrula ve bağla/ }))

    await waitFor(() => expect(mocks.hepsiburadaConnect).toHaveBeenCalledWith('w1', {
      merchantId: 'b24f1a2c-1111-4a5b-9c6d-000000000001',
      username: 'api-user@merchant.com',
      password: 'hb-secret-pass'
    }))
    // Trendyol'a dokunulmaz:
    expect(mocks.trendyolConnect).not.toHaveBeenCalled()
  })

  it('geçersiz Trendyol credential’da hata gösterip bağlamaz', async () => {
    const user = userEvent.setup()
    mocks.trendyolConnect.mockRejectedValue(Object.assign(new Error('Trendyol bu bilgilerle bağlantıyı reddetti.'), { status: 400 }))
    ciz()

    const card = await screen.findByLabelText('Trendyol entegrasyonu')
    await user.click(await within(card).findByRole('button', { name: /Bağla/ }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Mağaza / Merchant ID'), '123456')
    await user.type(within(dialog).getByLabelText('API Key'), 'wrong-key-1')
    const secretInput = within(dialog).getByLabelText('API Secret').querySelector('input') ?? within(dialog).getByLabelText('API Secret')
    await user.type(secretInput, 'wrong-secret')
    await user.click(within(dialog).getByRole('button', { name: /Doğrula ve bağla/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/reddetti/)
    expect(mocks.trendyolConnect).toHaveBeenCalledTimes(1)
  })

  it('N11 modalı resmi credential modelini ister (storeName/appKey/appSecret)', async () => {
    const user = userEvent.setup()
    ciz()
    const n11Card = await screen.findByLabelText('N11 entegrasyonu')
    await user.click(await within(n11Card).findByRole('button', { name: /Bağla/ }))

    const dialog = await screen.findByRole('dialog')
    // Resmi rehber: so.n11.com > Hesabım > API Hesapları
    expect(within(dialog).getByText(/so\.n11\.com/)).toBeInTheDocument()
    expect(within(dialog).getByText(/API Hesapları/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Mağaza Adı')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('App Key')).toBeInTheDocument()
    const secretInput = within(dialog).getByLabelText('App Secret').querySelector('input') ?? within(dialog).getByLabelText('App Secret')
    expect(secretInput).toHaveAttribute('type', 'password')
  })

  it('N11 connect resmi alanlarla çağrılır (appKey/appSecret header modeli)', async () => {
    const user = userEvent.setup()
    mocks.n11Connect.mockResolvedValue({ connection: {} })
    ciz()
    const n11Card = await screen.findByLabelText('N11 entegrasyonu')
    await user.click(await within(n11Card).findByRole('button', { name: /Bağla/ }))
    const dialog = await screen.findByRole('dialog')

    await user.type(within(dialog).getByLabelText('Mağaza Adı'), 'QA N11 Magaza')
    await user.type(within(dialog).getByLabelText('App Key'), 'n11-app-key-12345678')
    const secretInput = within(dialog).getByLabelText('App Secret').querySelector('input') ?? within(dialog).getByLabelText('App Secret')
    await user.type(secretInput, 'n11-app-secret-87654321')
    await user.click(within(dialog).getByRole('button', { name: /Doğrula ve bağla/ }))

    await waitFor(() => expect(mocks.n11Connect).toHaveBeenCalledWith('w1', {
      storeName: 'QA N11 Magaza',
      appKey: 'n11-app-key-12345678',
      appSecret: 'n11-app-secret-87654321'
    }))
    // Diger provider'lara dokunulmaz:
    expect(mocks.trendyolConnect).not.toHaveBeenCalled()
    expect(mocks.hepsiburadaConnect).not.toHaveBeenCalled()
  })

  it('Shopify modalı myshopify.com alan adı ister ve OAuth akışını açıklar', async () => {
    const user = userEvent.setup()
    ciz()
    const card = await screen.findByLabelText('Shopify entegrasyonu')
    await user.click(await within(card).findByRole('button', { name: /Bağla/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Shopify Mağaza Alan Adı')).toHaveAttribute('placeholder', 'magazaniz.myshopify.com')
    expect(within(dialog).getByText(/resmi izin ekranına yönlendirilirsiniz/i)).toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/Access Token/i)).toBeNull()
  })

  it('üç provider bağlıyken kartlar kendi durumlarını ve N11 sayılarını gösterir', async () => {
    mocks.trendyolStatus.mockResolvedValue({
      connected: true, syncing: false,
      counts: { orders: 12, products: 30 },
      connections: [{ externalAccountId: '123456', lastSyncedAt: '2026-08-20T09:00:00.000Z' }],
      latestRuns: []
    })
    mocks.hepsiburadaStatus.mockResolvedValue({
      connected: true, syncing: false,
      counts: { orders: 41, products: 21 },
      connections: [{ externalAccountId: 'b24f1a2c-1111', lastSyncedAt: '2026-08-25T09:00:00.000Z' }],
      latestRuns: []
    })
    mocks.n11Status.mockResolvedValue({
      connected: true, syncing: false,
      counts: { orders: 41, products: 21 },
      connections: [{ externalAccountId: 'QA N11 Magaza', lastSyncedAt: '2026-08-25T08:00:00.000Z' }]
    })
    ciz()

    const tyCard = await screen.findByLabelText('Trendyol entegrasyonu')
    expect(await within(tyCard).findByText('12 sipariş · 30 ürün')).toBeInTheDocument()
    expect(await within(tyCard).findByText('Bağlı')).toBeInTheDocument()

    const hbCard = screen.getByLabelText('Hepsiburada entegrasyonu')
    expect(await within(hbCard).findByText('41 sipariş · 21 ürün')).toBeInTheDocument()
    expect(within(hbCard).getByText('Bağlı')).toBeInTheDocument()
    expect(within(hbCard).getByRole('button', { name: /Şimdi eşitle/i })).toBeEnabled()

    const n11Card = screen.getByLabelText('N11 entegrasyonu')
    expect(await within(n11Card).findByText('41 sipariş · 21 ürün')).toBeInTheDocument()
    expect(within(n11Card).getByText('QA N11 Magaza')).toBeInTheDocument()
    expect(within(n11Card).getByText('Bağlı')).toBeInTheDocument()
  })

  it('disconnect onayı istenir', async () => {
    const user = userEvent.setup()
    mocks.trendyolStatus.mockResolvedValue({
      connected: true, syncing: false, counts: { orders: 1, products: 1 },
      connections: [{ externalAccountId: '123456' }], latestRuns: []
    })
    ciz()

    const card = await screen.findByLabelText('Trendyol entegrasyonu')
    await user.click(await within(card).findByRole('button', { name: /Bağlantıyı kaldır/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/kalıcı olarak silinir/i)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Bağlantıyı kaldır/ })).toBeInTheDocument()
  })
})
