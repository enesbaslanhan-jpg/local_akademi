import { createHmac, timingSafeEqual } from 'node:crypto'
import { ShopifyClientError } from './ShopifyErrors.js'
import { normalizeShopDomain } from './ShopifyClient.js'
import { SHOPIFY_REQUIRED_SCOPES } from './ShopifyTypes.js'

const STATE_TTL_MS = 10 * 60 * 1000

export interface ShopifyOAuthState {
  workspaceId: string
  userId: number
  shopDomain: string
  expiresAt: number
}

export interface ShopifyTokenResponse {
  access_token: string
  scope?: string
}

export function hasRequiredShopifyScopes(scope: string | undefined): boolean {
  const granted = new Set(String(scope || '').split(',').map(value => value.trim()).filter(Boolean))
  return SHOPIFY_REQUIRED_SCOPES.every(required => granted.has(required))
}

function oauthConfig() {
  const clientId = process.env.SHOPIFY_CLIENT_ID || ''
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || ''
  const redirectUri = process.env.SHOPIFY_OAUTH_REDIRECT_URI || ''
  if (!clientId || !clientSecret || !redirectUri) {
    throw new ShopifyClientError('BAD_REQUEST', 'Shopify OAuth is not configured')
  }
  return { clientId, clientSecret, redirectUri }
}

export function createShopifyOAuthState(input: Omit<ShopifyOAuthState, 'expiresAt'>): string {
  const { clientSecret } = oauthConfig()
  const payload = Buffer.from(JSON.stringify({ ...input, expiresAt: Date.now() + STATE_TTL_MS })).toString('base64url')
  const signature = createHmac('sha256', clientSecret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifyShopifyOAuthState(value: string): ShopifyOAuthState | null {
  try {
    const { clientSecret } = oauthConfig()
    const [payload, signature, extra] = String(value || '').split('.')
    if (!payload || !signature || extra) return null
    const expected = createHmac('sha256', clientSecret).update(payload).digest('base64url')
    const actualBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ShopifyOAuthState
    if (!parsed.workspaceId || !Number.isInteger(parsed.userId) || parsed.expiresAt < Date.now()) return null
    const shopDomain = normalizeShopDomain(parsed.shopDomain)
    return shopDomain ? { ...parsed, shopDomain } : null
  } catch {
    return null
  }
}

export function buildShopifyAuthorizationUrl(shopDomainInput: string, state: string): string {
  const shopDomain = normalizeShopDomain(shopDomainInput)
  if (!shopDomain) throw new ShopifyClientError('BAD_REQUEST', 'Invalid Shopify shop domain')
  const { clientId, redirectUri } = oauthConfig()
  const url = new URL(`https://${shopDomain}/admin/oauth/authorize`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', SHOPIFY_REQUIRED_SCOPES.join(','))
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  return url.toString()
}

export function verifyShopifyCallbackHmac(query: Record<string, unknown>): boolean {
  try {
    const { clientSecret } = oauthConfig()
    const provided = String(query.hmac || '')
    if (!/^[a-f0-9]{64}$/i.test(provided)) return false
    const message = Object.entries(query)
      .filter(([key]) => key !== 'hmac' && key !== 'signature')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : String(value ?? '')}`)
      .join('&')
    const expected = createHmac('sha256', clientSecret).update(message).digest('hex')
    const a = Buffer.from(provided, 'hex')
    const b = Buffer.from(expected, 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function exchangeShopifyAuthorizationCode(shopDomainInput: string, code: string): Promise<ShopifyTokenResponse> {
  const shopDomain = normalizeShopDomain(shopDomainInput)
  if (!shopDomain || !code) throw new ShopifyClientError('BAD_REQUEST', 'Invalid Shopify OAuth callback')
  const { clientId, clientSecret } = oauthConfig()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  let response: Response
  try {
    response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code }),
      signal: controller.signal
    })
  } catch (error) {
    throw new ShopifyClientError((error as Error)?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK', 'Shopify token exchange failed')
  } finally {
    clearTimeout(timer)
  }
  if (!response.ok) throw new ShopifyClientError(response.status === 401 ? 'AUTH' : 'PROVIDER_ERROR', 'Shopify token exchange failed', response.status)
  let payload: unknown
  try { payload = await response.json() } catch { throw new ShopifyClientError('MALFORMED_RESPONSE', 'Shopify token response is malformed') }
  const token = (payload as ShopifyTokenResponse)?.access_token
  if (typeof token !== 'string' || !token) throw new ShopifyClientError('MALFORMED_RESPONSE', 'Shopify token response is malformed')
  return payload as ShopifyTokenResponse
}
