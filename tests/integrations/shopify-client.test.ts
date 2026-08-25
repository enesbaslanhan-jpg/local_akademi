import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShopifyAdapter } from '../../src/services/integrations/marketplaces/shopify/ShopifyAdapter.js'
import { ShopifyClient, normalizeShopDomain, redactShopifySecrets } from '../../src/services/integrations/marketplaces/shopify/ShopifyClient.js'
import type { ShopifyOrder, ShopifyProductVariant } from '../../src/services/integrations/marketplaces/shopify/ShopifyTypes.js'
import { buildShopifyOrder, buildShopifyVariant } from './fixtures/shopify-fixtures.js'

const TOKEN = 'shpat_test_secret_token_123456'

function response(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers })
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('ShopifyClient', () => {
  it('uses versioned GraphQL Admin endpoint and token header', async () => {
    const fetchImpl = vi.fn(async (_url, init) => response({ data: { shop: { id: 'gid://shopify/Shop/1' } } })) as any
    const client = new ShopifyClient({ shopDomain: 'qa-store.myshopify.com', accessToken: TOKEN, fetchImpl })
    await client.query('{ shop { id } }')
    expect(fetchImpl.mock.calls[0][0]).toBe('https://qa-store.myshopify.com/admin/api/2026-07/graphql.json')
    expect(fetchImpl.mock.calls[0][1].headers['X-Shopify-Access-Token']).toBe(TOKEN)
  })

  it('normalizes only canonical myshopify.com domains', () => {
    expect(normalizeShopDomain('https://QA-Store.myshopify.com/')).toBe('qa-store.myshopify.com')
    expect(normalizeShopDomain('evil.example.com')).toBeNull()
    expect(normalizeShopDomain('qa-store.myshopify.com.evil.test')).toBeNull()
  })

  it.each([[401, 'AUTH'], [403, 'FORBIDDEN']] as const)('%s -> %s without leaking response body', async (status, kind) => {
    const client = new ShopifyClient({
      shopDomain: 'qa-store.myshopify.com', accessToken: TOKEN,
      fetchImpl: vi.fn(async () => response(`raw ${TOKEN}`, status)) as any
    })
    await expect(client.query('{ shop { id } }')).rejects.toMatchObject({ kind })
  })

  it('rejects malformed JSON and malformed GraphQL envelopes', async () => {
    const invalidJson = new ShopifyClient({
      shopDomain: 'qa-store.myshopify.com', accessToken: TOKEN,
      fetchImpl: vi.fn(async () => response('{bad json')) as any
    })
    await expect(invalidJson.query('query')).rejects.toMatchObject({ kind: 'MALFORMED_RESPONSE' })

    const invalidEnvelope = new ShopifyClient({
      shopDomain: 'qa-store.myshopify.com', accessToken: TOKEN,
      fetchImpl: vi.fn(async () => response({ hello: 'world' })) as any
    })
    await expect(invalidEnvelope.query('query')).rejects.toMatchObject({ kind: 'MALFORMED_RESPONSE' })
  })

  it('maps GraphQL errors to a controlled error without raw text', async () => {
    const client = new ShopifyClient({
      shopDomain: 'qa-store.myshopify.com', accessToken: TOKEN,
      fetchImpl: vi.fn(async () => response({ errors: [{ message: `secret ${TOKEN}`, extensions: { code: 'ACCESS_DENIED' } }] })) as any
    })
    const error = await client.query('query').catch(value => value)
    expect(error.kind).toBe('GRAPHQL')
    expect(error.message).not.toContain(TOKEN)
    expect(error.message).not.toContain('secret')
  })

  it('retries GraphQL THROTTLED using throttle budget, then succeeds', async () => {
    let calls = 0
    const client = new ShopifyClient({
      shopDomain: 'qa-store.myshopify.com', accessToken: TOKEN,
      fetchImpl: vi.fn(async () => {
        calls += 1
        if (calls === 1) return response({
          errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }],
          extensions: { cost: { throttleStatus: { maximumAvailable: 1000, currentlyAvailable: 0, restoreRate: 50 } } }
        })
        return response({ data: { shop: { id: 'gid://shopify/Shop/1' } } })
      }) as any
    })
    const promise = client.query<{ shop: { id: string } }>('query')
    await vi.advanceTimersByTimeAsync(2000)
    expect((await promise).shop.id).toContain('Shop')
    expect(calls).toBe(2)
  })

  it('retries HTTP 429/5xx at most twice', async () => {
    let calls = 0
    const client = new ShopifyClient({
      shopDomain: 'qa-store.myshopify.com', accessToken: TOKEN,
      fetchImpl: vi.fn(async () => { calls += 1; return response('', 500) }) as any
    })
    const expectation = expect(client.query('query')).rejects.toMatchObject({ kind: 'PROVIDER_ERROR' })
    await vi.advanceTimersByTimeAsync(10_000)
    await expectation
    expect(calls).toBe(3)
  })

  it('classifies repeated aborts as timeout', async () => {
    const client = new ShopifyClient({
      shopDomain: 'qa-store.myshopify.com', accessToken: TOKEN,
      fetchImpl: vi.fn(async () => { const error = new Error('aborted'); error.name = 'AbortError'; throw error }) as any
    })
    const expectation = expect(client.query('query')).rejects.toMatchObject({ kind: 'TIMEOUT' })
    await vi.advanceTimersByTimeAsync(10_000)
    await expectation
  })
})

describe('Shopify cursor pagination', () => {
  class FakeAdapter extends ShopifyAdapter {
    calls: Array<Record<string, unknown>> = []
    private orderCall = 0
    private productCall = 0

    protected createClient(): any {
      return {
        query: async (query: string, variables: Record<string, unknown>) => {
          this.calls.push(variables)
          if (query.includes('LocalKararOrders')) {
            this.orderCall += 1
            return {
              orders: {
                nodes: [buildShopifyOrder(this.orderCall)],
                pageInfo: { hasNextPage: this.orderCall === 1, endCursor: this.orderCall === 1 ? 'orders-cursor-1' : null }
              }
            }
          }
          this.productCall += 1
          return {
            productVariants: {
              nodes: [buildShopifyVariant(this.productCall)],
              pageInfo: { hasNextPage: this.productCall === 1, endCursor: this.productCall === 1 ? 'products-cursor-1' : null }
            }
          }
        }
      }
    }
  }

  it('follows order and product endCursor until hasNextPage=false', async () => {
    const adapter = new FakeAdapter()
    const credentials = { externalAccountId: 'qa.myshopify.com', accessToken: TOKEN }
    const orders = await adapter.fetchOrders({ credentials, fromDate: new Date('2026-08-01'), toDate: new Date('2026-08-25') })
    const products = await adapter.fetchProducts({ credentials })
    expect(orders.orders).toHaveLength(2)
    expect(products.products).toHaveLength(2)
    expect(adapter.calls.some(call => call.after === 'orders-cursor-1')).toBe(true)
    expect(adapter.calls.some(call => call.after === 'products-cursor-1')).toBe(true)
    expect(adapter.calls[0].query).toContain('updated_at:>=')
  })
})

describe('Shopify secret redaction', () => {
  it('redacts explicit token, token prefix and access-token header', () => {
    const safe = redactShopifySecrets(`X-Shopify-Access-Token: ${TOKEN} and ${TOKEN}`, TOKEN)
    expect(safe).not.toContain(TOKEN)
    expect(safe).toContain('[REDACTED]')
  })
})

