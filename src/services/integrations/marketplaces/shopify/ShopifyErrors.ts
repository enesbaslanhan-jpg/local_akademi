export type ShopifyErrorKind =
  | 'AUTH'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'BAD_REQUEST'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'MALFORMED_RESPONSE'
  | 'GRAPHQL'
  | 'PROVIDER_ERROR'

export class ShopifyClientError extends Error {
  constructor(
    readonly kind: ShopifyErrorKind,
    readonly safeMessage: string,
    readonly status?: number
  ) {
    super(safeMessage)
    this.name = 'ShopifyClientError'
  }
}

