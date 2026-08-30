import { beforeAll, describe, expect, it } from 'vitest'
import {
  PROVIDER_CATALOG,
  getAdapter,
  registerAdapter,
  resetAdaptersForTests
} from '../../src/services/integrations/adapter-registry.js'
import { trendyolAdapter } from '../../src/services/integrations/marketplaces/trendyol/TrendyolAdapter.js'
import { hepsiburadaAdapter } from '../../src/services/integrations/marketplaces/hepsiburada/index.js'
import { n11Adapter } from '../../src/services/integrations/marketplaces/n11/index.js'
import { shopifyAdapter } from '../../src/services/integrations/marketplaces/shopify/index.js'

/*
 * KATALOG SÖZLEŞMESİ — veritabanı istemez, saf birim testidir.
 *
 * Amazon katalogda "Yakında" kartı olarak durur ama gerçek bağdaştırıcı
 * YAZILMAMALI: SP-API geliştirici hesabı/onay süreci olmadan bağlantı
 * akışını çalıştırmaya kalkmak, kullanıcıya bağlanamayan bir alan
 * sunmak demektir. WooCommerce ise katalogdan çıkarıldı.
 */
describe('provider catalog', () => {
  beforeAll(() => {
    /* Kayıt deseni marketplace-routes modül yüklemesiyle aynı;
       burada izole tekrarlanıyor ki test rota katmanına bağlı kalmasın. */
    resetAdaptersForTests()
    registerAdapter(trendyolAdapter)
    registerAdapter(hepsiburadaAdapter)
    registerAdapter(n11Adapter)
    registerAdapter(shopifyAdapter)
  })

  it('Amazon yalnızca etikettir: devre dışı, adapter yok', () => {
    const amazon = PROVIDER_CATALOG.find(entry => entry.provider === 'AMAZON')
    expect(amazon).toBeDefined()
    expect(amazon?.label).toBe('Amazon')
    expect(amazon?.enabled).toBe(false)
    expect(amazon?.comingSoon).toBe(true)
    expect(getAdapter('AMAZON')).toBeNull()
  })

  it('WooCommerce katalogda yer almaz', () => {
    expect(PROVIDER_CATALOG.some(entry => entry.provider === 'WOOCOMMERCE')).toBe(false)
  })

  it('aktif dört sağlayıcının gerçek adapteri vardır', () => {
    for (const code of ['TRENDYOL', 'HEPSIBURADA', 'N11', 'SHOPIFY'] as const) {
      const kayit = PROVIDER_CATALOG.find(entry => entry.provider === code)
      expect(kayit?.enabled, `${code} aktif olmalı`).toBe(true)
      expect(getAdapter(code), `${code} için adapter tanımlı olmalı`).not.toBeNull()
    }
  })

  it('katalog etiketleri benzersizdir', () => {
    const etiketler = PROVIDER_CATALOG.map(entry => entry.label)
    expect(new Set(etiketler).size).toBe(etiketler.length)
  })
})
