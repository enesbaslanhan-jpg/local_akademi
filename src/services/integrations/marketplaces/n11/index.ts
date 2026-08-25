import type { ResolvedN11Credentials } from './N11Adapter.js'
import { N11Adapter } from './N11Adapter.js'

export { N11Adapter, buildDateWindows, type ResolvedN11Credentials, type N11OrderRaw, type N11ProductRaw } from './N11Adapter.js'
export { N11Client, redactN11Credentials } from './N11Client.js'
export { N11ClientError } from './N11Errors.js'
export {
  extractN11Brand,
  extractN11Images,
  mapN11Currency,
  mapN11LineToNormalizedItem,
  mapN11PackageToNormalizedOrder,
  mapN11ProductToNormalizedProduct,
  mapN11Status,
  minimizeN11CustomerName
} from './N11Mapper.js'
export * from './N11Types.js'

export function createN11Adapter(credentials?: Partial<ResolvedN11Credentials>) {
  void credentials
  return new N11Adapter()
}

export const n11Adapter = new N11Adapter()
