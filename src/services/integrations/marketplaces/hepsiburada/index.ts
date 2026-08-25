import type { ResolvedHepsiburadaCredentials } from './HepsiburadaAdapter.js'
import { HepsiburadaAdapter } from './HepsiburadaAdapter.js'

export { HepsiburadaAdapter, type HbsProductRaw } from './HepsiburadaAdapter.js'
export { HepsiburadaClient, redactBasicToken } from './HepsiburadaClient.js'
export { HepsiburadaClientError } from './HepsiburadaErrors.js'
export {
  extractHepsiburadaImages,
  mapHepsiburadaLineToNormalizedItem,
  mapHepsiburadaListingToProduct,
  mapHepsiburadaPackageToNormalizedOrder,
  mapHepsiburadaStatus,
  minimizeHepsiburadaCustomerName
} from './HepsiburadaMapper.js'
export * from './HepsiburadaTypes.js'

export function createHepsiburadaAdapter(credentials?: Partial<ResolvedHepsiburadaCredentials>) {
  void credentials
  return new HepsiburadaAdapter()
}

export const hepsiburadaAdapter = new HepsiburadaAdapter()
