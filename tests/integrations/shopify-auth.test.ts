import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildShopifyAuthorizationUrl,
  createShopifyOAuthState,
  hasRequiredShopifyScopes,
  verifyShopifyCallbackHmac,
  verifyShopifyOAuthState
} from '../../src/services/integrations/marketplaces/shopify/ShopifyAuth.js'

beforeEach(() => {
  process.env.SHOPIFY_CLIENT_ID = 'test-client-id'
  process.env.SHOPIFY_CLIENT_SECRET = 'test-client-secret-at-least-32-characters'
  process.env.SHOPIFY_OAUTH_REDIRECT_URI = 'https://api.local.test/integrations/shopify/oauth/callback'
})

afterEach(() => {
  delete process.env.SHOPIFY_CLIENT_ID
  delete process.env.SHOPIFY_CLIENT_SECRET
  delete process.env.SHOPIFY_OAUTH_REDIRECT_URI
})

describe('Shopify OAuth', () => {
  it('builds official authorization-code URL with minimum read scopes', () => {
    const state = createShopifyOAuthState({ workspaceId: '00000000-0000-4000-8000-000000000001', userId: 7, shopDomain: 'qa.myshopify.com' })
    const url = new URL(buildShopifyAuthorizationUrl('qa.myshopify.com', state))
    expect(url.origin).toBe('https://qa.myshopify.com')
    expect(url.pathname).toBe('/admin/oauth/authorize')
    expect(url.searchParams.get('scope')?.split(',').sort()).toEqual(['read_inventory', 'read_orders', 'read_products', 'read_returns'])
    expect(url.searchParams.get('client_id')).toBe('test-client-id')
  })

  it('signed state round-trips and rejects tampering', () => {
    const state = createShopifyOAuthState({ workspaceId: '00000000-0000-4000-8000-000000000001', userId: 7, shopDomain: 'qa.myshopify.com' })
    expect(verifyShopifyOAuthState(state)).toMatchObject({ userId: 7, shopDomain: 'qa.myshopify.com' })
    expect(verifyShopifyOAuthState(`${state}x`)).toBeNull()
  })

  it('verifies Shopify callback HMAC and rejects altered shop', () => {
    const query: Record<string, string> = { code: 'code-1', shop: 'qa.myshopify.com', state: 'state-1', timestamp: '1787652000' }
    const message = Object.entries(query).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&')
    query.hmac = createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!).update(message).digest('hex')
    expect(verifyShopifyCallbackHmac(query)).toBe(true)
    query.shop = 'evil.myshopify.com'
    expect(verifyShopifyCallbackHmac(query)).toBe(false)
  })

  it('requires every minimum read scope from the token response', () => {
    expect(hasRequiredShopifyScopes('read_orders,read_products,read_inventory,read_returns')).toBe(true)
    expect(hasRequiredShopifyScopes('read_orders,read_products')).toBe(false)
  })
})
