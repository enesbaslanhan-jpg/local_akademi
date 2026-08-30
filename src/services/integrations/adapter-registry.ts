import type { ProviderCode, MarketplaceProviderAdapter } from './types.js'

/*
 * ADAPTER REGISTRY.
 *
 * Yeni pazaryeri (Hepsiburada, Shopify, Amazon...) eklemek
 * icin core sync logic DEGISTIRILMEZ: yeni adapter yazilir ve
 * registerAdapter ile kaydedilir. Trendyol'a ozel hicbir tip/kod
 * bu dosyanin disindaki core katmaninda yer almaz.
 */

const adapters = new Map<ProviderCode, MarketplaceProviderAdapter<any, any>>()

export function registerAdapter<TOrderRaw, TProductRaw>(
  adapter: MarketplaceProviderAdapter<TOrderRaw, TProductRaw>
): void {
  adapters.set(adapter.provider, adapter as MarketplaceProviderAdapter<any, any>)
}

export function getAdapter(provider: ProviderCode): MarketplaceProviderAdapter<any, any> | null {
  return adapters.get(provider) ?? null
}

/** Desteklenen provider'lar ve MVP urun durumu. */
export const PROVIDER_CATALOG: Array<{
  provider: ProviderCode
  label: string
  enabled: boolean
  comingSoon: boolean
}> = [
  { provider: 'TRENDYOL', label: 'Trendyol', enabled: true, comingSoon: false },
  { provider: 'HEPSIBURADA', label: 'Hepsiburada', enabled: true, comingSoon: false },
  { provider: 'N11', label: 'N11', enabled: true, comingSoon: false },
  { provider: 'SHOPIFY', label: 'Shopify', enabled: true, comingSoon: false },
  /* Amazon "Yakinda": SP-API gelistirici hesabi/onay sureci olmadan
     gercek bagdastirici yazilamaz. Kart yalnizca varligi bildirir. */
  { provider: 'AMAZON', label: 'Amazon', enabled: false, comingSoon: true }
]

export function resetAdaptersForTests(): void {
  adapters.clear()
}
