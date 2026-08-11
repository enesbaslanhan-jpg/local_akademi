import type { NewsSourceConfig } from '../../config/news-sources.js'
import { EXTRA_CA_BY_HOST } from '../../config/news-certs.js'
import * as https from 'node:https'
import * as zlib from 'node:zlib'

export interface NewsCandidate {
  title: string
  url: string
  sourcePublishedAt: Date
  content: string
}

export interface NewsSourceAdapter {
  fetchCandidates(source: NewsSourceConfig): Promise<NewsCandidate[]>
}

export type NewsFetch = typeof fetch

const MONTHS: Record<string, number> = {
  ocak: 0, oca: 0, şubat: 1, subat: 1, şub: 1, sub: 1, mart: 2, mar: 2,
  nisan: 3, nis: 3, mayıs: 4, mayis: 4, may: 4, haziran: 5, haz: 5,
  temmuz: 6, tem: 6, ağustos: 7, agustos: 7, ağu: 7, agu: 7,
  eylül: 8, eylul: 8, eyl: 8, ekim: 9, eki: 9, kasım: 10, kasim: 10,
  kas: 10, aralık: 11, aralik: 11, ara: 11,
}

function decodeCodePoint(code: number): string {
  try { return String.fromCodePoint(code) } catch { return '' }
}

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_match, code) => decodeCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]{1,6});/gi, (_match, hex) => decodeCodePoint(Number.parseInt(hex, 16)))
}

export function sanitizeNewsText(value: string): string {
  return decodeEntities(value)
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u0080-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function stripMarkup(value: string): string {
  return sanitizeNewsText(decodeEntities(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
}

export function parseOfficialDate(value: string): Date | null {
  const iso = value.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])(?:[T\s]+([0-2]?\d):([0-5]\d)(?::([0-5]\d))?)?\b/)
  if (iso) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = iso
    return new Date(Date.UTC(+year, +month - 1, +day, +hour - 3, +minute, +second))
  }
  const dayFirst = value.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})(?:[T\s]+([0-2]?\d):([0-5]\d)(?::([0-5]\d))?)?\b/)
  if (dayFirst) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = dayFirst
    return new Date(Date.UTC(+year, +month - 1, +day, +hour - 3, +minute, +second))
  }
  const tr = value.toLocaleLowerCase('tr-TR').match(/\b(0?[1-9]|[12]\d|3[01])\s+(ocak|oca|şubat|subat|şub|sub|mart|mar|nisan|nis|mayıs|mayis|may|haziran|haz|temmuz|tem|ağustos|agustos|ağu|agu|eylül|eylul|eyl|ekim|eki|kasım|kasim|kas|aralık|aralik|ara)\s+(20\d{2})(?:\s+([0-2]?\d):([0-5]\d))?\b/)
  if (tr) {
    const [, day, month, year, hour = '0', minute = '0'] = tr
    return new Date(Date.UTC(+year, MONTHS[month], +day, +hour - 3, +minute))
  }
  const compact = value.match(/(?:^|\D)(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:\D|$)/)
  return compact ? new Date(Date.UTC(+compact[1], +compact[2] - 1, +compact[3], -3)) : null
}

export function canonicalizeNewsUrl(input: string, baseUrl?: string): string {
  const url = new URL(input, baseUrl)
  if (url.protocol === 'http:') url.protocol = 'https:'
  url.hash = ''
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|ref$)/i.test(key)) url.searchParams.delete(key)
  }
  url.hostname = url.hostname.toLowerCase()
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = ''
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '')
  return url.toString()
}

export function isAllowedNewsUrl(input: string, source: NewsSourceConfig): boolean {
  try {
    const url = new URL(input, source.baseUrl)
    return url.protocol === 'https:' && source.allowedDomains.includes(url.hostname.toLowerCase())
  } catch {
    return false
  }
}

function decodeBody(buffer: Buffer, encodingValue: unknown): string {
  const encoding = typeof encodingValue === 'string' ? encodingValue.toLowerCase() : ''
  if (!encoding || encoding === 'identity') return buffer.toString('utf8')
  try {
    if (encoding.includes('gzip')) return zlib.gunzipSync(buffer).toString('utf8')
    if (encoding.includes('deflate')) return zlib.inflateSync(buffer).toString('utf8')
    if (encoding.includes('br')) return zlib.brotliDecompressSync(buffer).toString('utf8')
  } catch { /* fall through to raw */ }
  return buffer.toString('utf8')
}

interface NodeRequestResult {
  status: number
  statusText: string
  headers: Record<string, string | string[] | undefined>
  buffer: Buffer
}

function nodeRequest(
  url: URL,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
  signal: AbortSignal | null,
): Promise<NodeRequestResult> {
  return new Promise((resolve, reject) => {
    const ca = EXTRA_CA_BY_HOST[url.hostname.toLowerCase()]
    const options: https.RequestOptions = { method, headers, signal: signal ?? undefined }
    if (ca) options.ca = ca
    const req = https.request(url, options, res => {
      const chunks: Buffer[] = []
      res.on('data', chunk => chunks.push(chunk as Buffer))
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          statusText: res.statusMessage ?? '',
          headers: res.headers as Record<string, string | string[] | undefined>,
          buffer: Buffer.concat(chunks),
        })
      })
      res.on('error', reject)
    })
    req.setTimeout(30_000, () => req.destroy(new Error('NEWS_FETCH_TIMEOUT')))
    req.on('error', reject)
    if (body !== undefined) req.write(body)
    req.end()
  })
}

// Default transport for official sources. Some Turkish institutions omit their
// intermediate certificate in the TLS handshake, which Node's bundled trust
// store cannot verify; per-host CA bundles from news-certs.ts fix that.
export function createNewsFetch(): NewsFetch {
  const nodeFetch: NewsFetch = (async (input: string | URL, init?: RequestInit) => {
    let current = new URL(String(input))
    let method = (init?.method ?? 'GET').toUpperCase()
    const requestHeaders: Record<string, string> = {
      'user-agent': 'LocalKarar/1.0 (+official-source-monitor)',
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    }
    const signal = init?.signal ?? null
    let body = typeof init?.body === 'string' ? init.body : undefined
    let response: NodeRequestResult | undefined
    for (let hop = 0; hop <= 5; hop++) {
      response = await nodeRequest(current, method, requestHeaders, body, signal)
      const location = response.headers.location
      if (!location || response.status < 300 || response.status >= 400) break
      current = new URL(String(location), current)
      // fetch semantics: 301/302/303 switch to GET and drop the body
      if (response.status === 301 || response.status === 302 || response.status === 303) {
        if (method !== 'GET') method = 'GET'
        body = undefined
        delete requestHeaders['content-type']
        delete requestHeaders['content-length']
      }
    }
    const finalResponse = response!
    const text = decodeBody(finalResponse.buffer, finalResponse.headers['content-encoding'])
    const okResponse = {
      ok: finalResponse.status >= 200 && finalResponse.status < 300,
      status: finalResponse.status,
      statusText: finalResponse.statusText,
      url: current.toString(),
      headers: {
        get(name: string) {
          const value = finalResponse.headers[String(name).toLowerCase()]
          return Array.isArray(value) ? value.join(', ') : (value ?? null)
        },
      },
      text: async () => text,
    } as unknown as Response
    return okResponse
  }) as NewsFetch
  return nodeFetch
}

export function normalizeOfficialTitle(raw: string): string {
  let title = stripMarkup(raw)
  title = title.replace(/^(?:[\s\-–—:])+/, '')
  title = title.replace(/^(?:\d{1,2}\.\d{1,2}\.\d{4}\s*)+/, '')
  title = title.replace(/^(?:\d{1,2}\s+[a-zğüşöçıiI]+\s+20\d{2}\s*)+/i, '')
  title = title.replace(/^(?:[\s\-–—:])+/, '')
  return title
}

async function fetchText(url: string, source: NewsSourceConfig, fetcher: NewsFetch, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<string> {
  if (!isAllowedNewsUrl(url, source)) throw new Error(`NEWS_SOURCE_URL_NOT_ALLOWED:${source.id}`)
  const transportError = /(NEWS_FETCH_TIMEOUT|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up|abort)/i
  const http5xx = /^NEWS_SOURCE_HTTP_(5\d\d):/
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    try {
      const response = await fetcher(url, {
        headers: { 'user-agent': 'LocalKarar/1.0 (+official-source-monitor)', ...init?.headers },
        redirect: 'follow',
        signal: controller.signal,
        ...(init?.method ? { method: init.method } : {}),
        ...(init?.body !== undefined ? { body: init.body } : {}),
      })
      if (!response.ok) throw new Error(`NEWS_SOURCE_HTTP_${response.status}:${source.id}`)
      if (!isAllowedNewsUrl(response.url || url, source)) throw new Error(`NEWS_SOURCE_REDIRECT_NOT_ALLOWED:${source.id}`)
      return (await response.text()).slice(0, 2_000_000)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (attempt === 1 || !(transportError.test(message) || http5xx.test(message))) throw error
    } finally {
      clearTimeout(timeout)
    }
  }
  throw new Error(`NEWS_FETCH_FAILED:${source.id}`)
}

function xmlValue(block: string, tags: string[]): string {
  for (const tag of tags) {
    const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    if (match) return stripMarkup(match[1])
  }
  return ''
}

export function parseRssFeed(xml: string, source: NewsSourceConfig): NewsCandidate[] {
  const blocks = [...xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)]
  const candidates: NewsCandidate[] = []
  for (const [, block] of blocks) {
    const title = xmlValue(block, ['title'])
    const linkText = xmlValue(block, ['link', 'guid'])
    const href = block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1]
    const rawUrl = href || linkText
    const dateText = xmlValue(block, ['pubDate', 'published', 'updated', 'dc:date'])
    const sourcePublishedAt = parseOfficialDate(dateText) ?? new Date(dateText)
    if (!title || !rawUrl || Number.isNaN(sourcePublishedAt.getTime())) continue
    const url = canonicalizeNewsUrl(rawUrl, source.baseUrl)
    if (!isAllowedNewsUrl(url, source)) continue
    candidates.push({
      title,
      url,
      sourcePublishedAt,
      content: xmlValue(block, ['content:encoded', 'description', 'summary']) || title,
    })
  }
  return candidates
}

export function parseOfficialPage(html: string, source: NewsSourceConfig): NewsCandidate[] {
  const candidates: NewsCandidate[] = []
  const seen = new Set<string>()
  const hrefPatterns = source.listingHrefPattern
    ? (Array.isArray(source.listingHrefPattern) ? source.listingHrefPattern : [source.listingHrefPattern])
    : null
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const rawHref = decodeEntities(match[1])
    if (hrefPatterns && !hrefPatterns.some(pattern => rawHref.includes(pattern))) continue
    const anchorTitle = match[0].match(/\btitle=["']([^"']+)["']/i)?.[1]
    let title = normalizeOfficialTitle(match[2])
    if (title.length < 12 && anchorTitle) title = normalizeOfficialTitle(anchorTitle)
    if (title.length < 12 || title.length > 240 || /^(devam|detay|tümü|tüm |ana sayfa|duyurular|pdf görüntüle|görüntüle)$/i.test(title)) continue
    let url: string
    try { url = canonicalizeNewsUrl(rawHref, source.baseUrl) } catch { continue }
    if (!isAllowedNewsUrl(url, source) || seen.has(url)) continue
    const offset = match.index ?? 0
    const context = stripMarkup(html.slice(Math.max(0, offset - 350), Math.min(html.length, offset + match[0].length + 350)))
    const sourcePublishedAt = parseOfficialDate(`${context} ${url}`)
    if (!sourcePublishedAt) continue
    seen.add(url)
    candidates.push({ title, url, sourcePublishedAt, content: context })
  }
  return candidates
}

abstract class BaseAdapter {
  constructor(protected readonly fetcher: NewsFetch = createNewsFetch()) {}

  protected async hydrate(source: NewsSourceConfig, candidates: NewsCandidate[]): Promise<NewsCandidate[]> {
    const limit = Math.max(1, Math.min(Number(process.env.NEWS_MAX_ITEMS_PER_SOURCE) || 5, 20))
    return Promise.all(candidates.slice(0, limit).map(async candidate => {
      try {
        const detail = stripMarkup(await fetchText(candidate.url, source, this.fetcher)).slice(0, 12_000)
        return { ...candidate, content: detail.length >= 80 ? detail : candidate.content }
      } catch {
        return candidate
      }
    }))
  }
}

export class RssNewsAdapter extends BaseAdapter implements NewsSourceAdapter {
  async fetchCandidates(source: NewsSourceConfig): Promise<NewsCandidate[]> {
    if (!source.feedUrl) throw new Error(`NEWS_FEED_URL_MISSING:${source.id}`)
    return this.hydrate(source, parseRssFeed(await fetchText(source.feedUrl, source, this.fetcher), source))
  }
}

export class OfficialPageNewsAdapter extends BaseAdapter implements NewsSourceAdapter {
  async fetchCandidates(source: NewsSourceConfig): Promise<NewsCandidate[]> {
    if (!source.listingUrl) throw new Error(`NEWS_LISTING_URL_MISSING:${source.id}`)
    return this.hydrate(source, parseOfficialPage(await fetchText(source.listingUrl, source, this.fetcher), source))
  }
}

// Resmî Gazete publishes one numbered issue per day at /dd.MM.yyyy; walk back
// up to 7 days so early-morning runs still find the latest published issue.
export class ResmiGazeteNewsAdapter extends BaseAdapter implements NewsSourceAdapter {
  async fetchCandidates(source: NewsSourceConfig): Promise<NewsCandidate[]> {
    const candidates: NewsCandidate[] = []
    for (let back = 0; back < 7 && candidates.length === 0; back++) {
      const day = new Date(Date.now() - back * 86_400_000)
      const date = `${String(day.getDate()).padStart(2, '0')}.${String(day.getMonth() + 1).padStart(2, '0')}.${day.getFullYear()}`
      try {
        candidates.push(...parseOfficialPage(await fetchText(`https://www.resmigazete.gov.tr/${date}`, source, this.fetcher), source))
      } catch { /* issue not published yet for that day; try the previous day */ }
    }
    return this.hydrate(source, candidates)
  }
}

// GİB new site is a Next.js SPA; the archive reads from
// POST /api/gibportal/duyuru/listPublish (type 0 = Güncel, 1 = Mevzuat).
export class GibNewsAdapter extends BaseAdapter implements NewsSourceAdapter {
  async fetchCandidates(source: NewsSourceConfig): Promise<NewsCandidate[]> {
    if (!source.listingUrl) throw new Error(`NEWS_API_URL_MISSING:${source.id}`)
    const raw = await fetchText(
      `${source.listingUrl}?preview=false&page=0&size=10&sortFieldName=startdate&sortType=DESC`,
      source,
      this.fetcher,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 0, ilkodu: 'UNIVERSAL' }) },
    )
    const payload = JSON.parse(raw) as { resultContainer?: { content?: Array<Record<string, unknown>> } }
    const candidates: NewsCandidate[] = []
    for (const item of payload.resultContainer?.content ?? []) {
      const title = typeof item.title === 'string' ? sanitizeNewsText(item.title) : ''
      const slug = typeof item.slug === 'string' ? item.slug : ''
      const rawDate = typeof item.startdate === 'string' ? item.startdate : ''
      if (!title || !slug || !rawDate) continue
      const sourcePublishedAt = parseOfficialDate(rawDate)
      if (!sourcePublishedAt) continue
      const url = canonicalizeNewsUrl(new URL(`/duyuru/${slug}`, source.baseUrl).toString(), source.baseUrl)
      if (!isAllowedNewsUrl(url, source)) continue
      const detail = typeof item.description === 'string' ? item.description : (typeof item.summary === 'string' ? item.summary : '')
      const content = stripMarkup(detail) || title
      candidates.push({ title, url, sourcePublishedAt, content })
    }
    return this.hydrate(source, candidates)
  }
}

// These sources render their announcement listings entirely in the browser
// with no server-side dated markup or discoverable JSON endpoint, so static
// extraction cannot work without a headless browser.
export class RequiresJsNewsAdapter implements NewsSourceAdapter {
  async fetchCandidates(source: NewsSourceConfig): Promise<NewsCandidate[]> {
    throw new Error(`NEWS_SOURCE_JS_RENDER_REQUIRED:${source.id}: no server-rendered dating list available`)
  }
}

export class OfficialApiNewsAdapter extends BaseAdapter implements NewsSourceAdapter {
  async fetchCandidates(source: NewsSourceConfig): Promise<NewsCandidate[]> {
    if (!source.listingUrl) throw new Error(`NEWS_API_URL_MISSING:${source.id}`)
    const payload = JSON.parse(await fetchText(source.listingUrl, source, this.fetcher)) as { items?: Array<Record<string, unknown>> }
    const candidates = (payload.items ?? []).flatMap(item => {
      const title = typeof item.title === 'string' ? item.title : ''
      const rawUrl = typeof item.url === 'string' ? item.url : ''
      const sourcePublishedAt = typeof item.publishedAt === 'string' ? new Date(item.publishedAt) : null
      if (!title || !rawUrl || !sourcePublishedAt || Number.isNaN(sourcePublishedAt.getTime())) return []
      const url = canonicalizeNewsUrl(rawUrl, source.baseUrl)
      if (!isAllowedNewsUrl(url, source)) return []
      return [{ title, url, sourcePublishedAt, content: typeof item.content === 'string' ? item.content : title }]
    })
    return this.hydrate(source, candidates)
  }
}

export function createNewsAdapter(source: NewsSourceConfig, fetcher: NewsFetch = createNewsFetch()): NewsSourceAdapter {
  if (source.requiresJs) return new RequiresJsNewsAdapter()
  if (source.id === 'resmi-gazete') return new ResmiGazeteNewsAdapter(fetcher)
  if (source.id === 'gib') return new GibNewsAdapter(fetcher)
  if (source.type === 'RSS') return new RssNewsAdapter(fetcher)
  if (source.type === 'OFFICIAL_PAGE') return new OfficialPageNewsAdapter(fetcher)
  return new OfficialApiNewsAdapter(fetcher)
}