import { describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { NEWS_SOURCES, type NewsSourceConfig } from '../src/config/news-sources.js'
import { selectNewsImage } from '../src/config/news-images.js'
import {
  canonicalizeNewsUrl,
  createNewsAdapter,
  normalizeOfficialTitle,
  parseOfficialDate,
  parseOfficialPage,
  parseRssFeed,
  sanitizeNewsText,
  stripMarkup,
  type NewsFetch,
} from '../src/services/news/adapters.js'
import { newsAnalysisSchema, normalizeNewsAnalysis } from '../src/services/news/analyzer.js'
import { createNewsContentHash, runNewsIngestion } from '../src/services/news/ingestion.js'
import { decodeNewsCursor, encodeNewsCursor, newsRoutes } from '../src/services/news/routes.js'
import { millisecondsUntilNextHour, NEWS_CRON_TIME_ZONE } from '../src/services/news/worker.js'

const source = NEWS_SOURCES.find(item => item.id === 'tcmb')!

describe('news source adapters', () => {
  it('parses RSS and rejects links outside the official allowlist', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title>Faiz Oranlarına İlişkin Basın Duyurusu</title><link>/duyuru/1</link><pubDate>Mon, 10 Aug 2026 11:00:00 GMT</pubDate><description>Politika faizine ilişkin resmî açıklama metni.</description></item>
      <item><title>Sahte bağlantı duyurusu</title><link>https://example.com/x</link><pubDate>Mon, 10 Aug 2026 11:00:00 GMT</pubDate></item>
    </channel></rss>`
    const result = parseRssFeed(xml, source)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://www.tcmb.gov.tr/duyuru/1')
  })

  it('extracts dated official-page links and canonicalizes tracking parameters', () => {
    const gib = NEWS_SOURCES.find(item => item.id === 'gib')!
    const html = '<div>10 Ağustos 2026 <a href="/duyuru/vergi?utm_source=x&id=7">Vergi ödeme dönemine ilişkin duyuru</a></div>'
    const result = parseOfficialPage(html, gib)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://www.gib.gov.tr/duyuru/vergi?id=7')
    expect(parseOfficialDate('10 Ağustos 2026')?.toISOString()).toBe('2026-08-09T21:00:00.000Z')
    expect(parseOfficialDate('22 Tem 2026 14:00')?.toISOString()).toBe('2026-07-22T11:00:00.000Z')
  })
})

describe('fixed official source parsing', () => {
  it('parses day-first DD.MM.YYYY dates used by BDDK, Ticaret and KVKK', () => {
    expect(parseOfficialDate('30.07.2026')?.toISOString()).toBe('2026-07-29T21:00:00.000Z')
    expect(parseOfficialDate('11/8/2026 09:30')?.toISOString()).toBe('2026-08-11T06:30:00.000Z')
    const ticaret = NEWS_SOURCES.find(item => item.id === 'ticaret-bakanligi')!
    const html = '<div><a href="/duyuru/inkilap-kayit-belgesi-19-06-2026">Uzunca ticaret duyurusu başlık metni burada</a></div>'
    const [item] = parseOfficialPage(html, ticaret)
    expect(item.sourcePublishedAt.toISOString()).toBe('2026-06-18T21:00:00.000Z')
  })

  it('parses compact YYYYMMDD dates from Resmî Gazete eskiler URLs', () => {
    expect(parseOfficialDate('https://www.resmigazete.gov.tr/eskiler/2026/08/20260811-1.htm')?.toISOString())
      .toBe('2026-08-10T21:00:00.000Z')
    const rg = NEWS_SOURCES.find(item => item.id === 'resmi-gazete')!
    const html = '<div><a href="/eskiler/2026/08/20260811-1.htm">-- Galatasaray Üniversitesine Alemdar Mahallesi Turgut Özal Caddesi adresinde tahsis</a></div>'
    const [item] = parseOfficialPage(html, rg)
    expect(item.title).toBe('Galatasaray Üniversitesine Alemdar Mahallesi Turgut Özal Caddesi adresinde tahsis')
    expect(item.url).toBe('https://www.resmigazete.gov.tr/eskiler/2026/08/20260811-1.htm')
  })

  it('uses the KVKK date paragraph next to each announcement card', () => {
    const kvkk = NEWS_SOURCES.find(item => item.id === 'kvkk')!
    const html = '<div><a href="/Icerik/8835/veri-sorumlulari-incelemesi">Kamu Tüzel Kişiliğini Haiz Veri Sorumluları Tarafından İnternet Ortamında Paylaşılması</a><p class="date">7 Ağustos 2026, Cuma</p></div>'
    const [item] = parseOfficialPage(html, kvkk)
    expect(item.sourcePublishedAt.toISOString()).toBe('2026-08-06T21:00:00.000Z')
  })

  it('normalizes leading dashes, numeric and repeated Turkish date prefixes', () => {
    expect(normalizeOfficialTitle('-- Galatasaray Üniversitesine tahsis')).toBe('Galatasaray Üniversitesine tahsis')
    expect(normalizeOfficialTitle('30.07.2026 FinTürk Kira Sertifikası ihracı')).toBe('FinTürk Kira Sertifikası ihracı')
    expect(normalizeOfficialTitle('10 Ağustos 2026 10 Ağustos 2026 Finansal Yatırım Araçları oranları')).toBe('Finansal Yatırım Araçları oranları')
  })

  it('upgrades http feed links to https inside official domains', () => {
    expect(canonicalizeNewsUrl('http://www.tcmb.gov.tr/wps/wcm/connect/duy2026-34')).toBe('https://www.tcmb.gov.tr/wps/wcm/connect/duy2026-34')
  })

  it('parses the TCMB Atom feed with http links and Turkish published dates', () => {
    const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <entry><title>13 Ağustos 2026 Tarihli Enflasyon Raporu Toplantısına İlişkin Basın Duyurusu</title>
      <link rel="alternate" type="text/html" href="http://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/duyurular/basin/2026/duy2026-34"></link>
      <published>22 Nis 2026 14:00:00</published><summary type="html">Özet metni</summary></entry></feed>`
    const result = parseRssFeed(xml, source)
    expect(result).toHaveLength(1)
    expect(result[0].url.startsWith('https://')).toBe(true)
    expect(result[0].sourcePublishedAt.toISOString()).toBe('2026-04-22T11:00:00.000Z')
  })

  it('maps the GİB API POST response to candidates with slug detail URLs', async () => {
    const call: any[] = []
    const body = JSON.stringify({ resultContainer: { content: [
      { title: '10995 Sayılı Cumhurbaşkanı Kararı Uyarınca Uygulanacak Özel Tüketim Vergisi Tutarları', slug: '18628_otv_tutarlari', startdate: '2026-08-10T14:35:54', description: '<p>Mallar için uygulanacak tutarlar ekteki tabloda yer almaktadır.</p>', summary: 'Özet' },
      { title: '', slug: 'x', startdate: '2026-08-10T00:00:00' },
    ] } })
    const fetcher = (async (url: string, init?: any) => {
      call.push({ url, init })
      return { ok: true, status: 200, statusText: 'OK', url, headers: { get: () => 'application/json' }, text: async () => body }
    }) as unknown as NewsFetch
    const gib = NEWS_SOURCES.find(item => item.id === 'gib')!
    const adapter = createNewsAdapter(gib, fetcher)
    const candidates = await adapter.fetchCandidates(gib)
    expect(candidates).toHaveLength(1)
    expect(candidates[0].title).toBe('10995 Sayılı Cumhurbaşkanı Kararı Uyarınca Uygulanacak Özel Tüketim Vergisi Tutarları')
    expect(candidates[0].url).toBe('https://www.gib.gov.tr/duyuru/18628_otv_tutarlari')
    expect(candidates[0].sourcePublishedAt.toISOString()).toBe('2026-08-10T11:35:54.000Z')
    expect(call[0].url).toContain('/api/gibportal/duyuru/listPublish?')
    expect(call[0].init.method).toBe('POST')
    expect(JSON.parse(call[0].init.body)).toMatchObject({ type: 0, ilkodu: 'UNIVERSAL' })
  })

  it('fetches the Resmî Gazete issue page for today via the adapter', async () => {
    const calls: string[] = []
    const html = '<div><a href="/eskiler/2026/08/20260811-2.htm">-- Madde başlığına ilişkin karar metni burada yer alır</a></div>'
    const fetcher = (async (url: string) => {
      calls.push(url)
      return { ok: true, status: 200, statusText: 'OK', url, headers: { get: () => 'text/html' }, text: async () => html }
    }) as unknown as NewsFetch
    const rg = NEWS_SOURCES.find(item => item.id === 'resmi-gazete')!
    const adapter = createNewsAdapter(rg, fetcher)
    const candidates = await adapter.fetchCandidates(rg)
    expect(/https:\/\/www\.resmigazete\.gov\.tr\/\d{2}\.\d{2}\.\d{4}/.test(calls[0])).toBe(true)
    expect(candidates).toHaveLength(1)
    expect(candidates[0].title).toBe('Madde başlığına ilişkin karar metni burada yer alır')
  })

  it('reports JS-rendered sources instead of silently returning nothing', () => {
    const spk = NEWS_SOURCES.find(item => item.id === 'spk')!
    const adapter = createNewsAdapter(spk)
    expect(adapter.fetchCandidates(spk)).rejects.toThrow('NEWS_SOURCE_JS_RENDER_REQUIRED:spk')
  })
})

describe('news validation, dedupe and image rotation', () => {
  it('requires every structured AI field and rejects extra fields', () => {
    expect(newsAnalysisSchema.safeParse({ summary: 'eksik' }).success).toBe(false)
    expect(newsAnalysisSchema.safeParse({
      summary: 'İşletmeleri ilgilendiren resmî gelişmenin kısa ve özgün özeti burada yer alır.',
      whyItMatters: 'KOBİ sahiplerinin ödeme ve planlama takvimini gözden geçirmesi gerekebilir.',
      tags: ['vergi'], affectedAudience: ['KOBİ'], importance: 'HIGH', isRelevant: true, extra: true,
    }).success).toBe(false)
  })

  it('normalizes content hashes and rotates away from recent images', () => {
    expect(createNewsContentHash({ title: 'Vergi Duyurusu', content: 'Ödeme  tarihi açıklandı.' }))
      .toBe(createNewsContentHash({ title: 'vergi duyurusu', content: 'ödeme tarihi açıklandı.' }))
    expect(selectNewsImage('FINANS', ['kredi'], ['finance-credit']).id).not.toBe('finance-credit')
    expect(canonicalizeNewsUrl('https://www.tcmb.gov.tr/a/?utm_campaign=x')).toBe('https://www.tcmb.gov.tr/a')
  })
})

describe('news text sanitization', () => {
  it('decodes hex and decimal HTML entities', () => {
    expect(sanitizeNewsText('M&#xFC;d&#xFC;rl&#xFC;&#x11F;&#xFC;')).toBe('Müdürlüğü')
    expect(sanitizeNewsText('Oran &amp; kapsam')).toBe('Oran & kapsam')
    expect(sanitizeNewsText('<![CDATA[İçerik]]>')).toBe('İçerik')
  })

  it('strips NUL and other control characters', () => {
    expect(sanitizeNewsText('a\u0000b')).toBe('ab')
    expect(sanitizeNewsText('a\u0001b\u007Fc\u200Bd')).toBe('abcd')
    expect(sanitizeNewsText('a\u0085b')).toBe('ab')
  })

  it('passes stripMarkup output through sanitization and removes encoded scripts', () => {
    expect(stripMarkup('<p title="x">Merhaba&#xFC;</p>')).toBe('Merhabaü')
    expect(stripMarkup('&lt;script&gt;alert(1)&lt;/script&gt;tetik')).toBe('tetik')
  })
})

describe('news AI output normalization', () => {
  const base = {
    summary: 'İşletmeleri ilgilendiren resmî gelişmenin kısa ve özgün özeti burada yer alır.',
    whyItMatters: 'KOBİ sahiplerinin ödeme ve planlama takvimini gözden geçirmesi gerekebilir.',
    tags: ['vergi'],
    affectedAudience: ['KOBİ'],
    importance: 'HIGH',
    isRelevant: true,
  }

  it('normalizes audience strings, Turkish variants and invalid values', () => {
    const parsed = newsAnalysisSchema.parse(normalizeNewsAnalysis({
      ...base,
      affectedAudience: 'KOBİ, GİRİŞİMCİ, büyük şirket, esnaf; YATIRIMCI',
    }))
    expect(parsed.affectedAudience).toEqual(['KOBI', 'GIRISIMCI', 'ESNAF', 'YATIRIMCI'])
  })

  it('normalizes importance case and falls back to MEDIUM for invalid values', () => {
    expect(newsAnalysisSchema.parse(normalizeNewsAnalysis({ ...base, importance: 'High' })).importance).toBe('HIGH')
    expect(newsAnalysisSchema.parse(normalizeNewsAnalysis({ ...base, importance: 'YÜKSEK' })).importance).toBe('MEDIUM')
    expect(newsAnalysisSchema.parse(normalizeNewsAnalysis({ ...base, importance: 5 })).importance).toBe('MEDIUM')
    expect(newsAnalysisSchema.parse(normalizeNewsAnalysis({ ...base, importance: undefined })).importance).toBe('MEDIUM')
  })

  it('truncates tags to 40 chars, caps at 8 and drops empty entries', () => {
    const longTag = 'a'.repeat(60)
    const parsed = newsAnalysisSchema.parse(normalizeNewsAnalysis({
      ...base,
      tags: [longTag, '  ', 'tek', 'tek', ...Array.from({ length: 10 }, (_v, i) => `tag${i}`)],
    }))
    expect(parsed.tags).toHaveLength(8)
    expect(parsed.tags[0]).toBe('a'.repeat(40))
    expect(parsed.tags.filter(tag => tag === 'tek')).toHaveLength(1)
  })

  it('normalizes boolean strings and drops unknown extra keys', () => {
    const parsed = newsAnalysisSchema.parse(normalizeNewsAnalysis({ ...base, isRelevant: 'false', extra: 'x' }))
    expect(parsed.isRelevant).toBe(false)
    expect(newsAnalysisSchema.parse(normalizeNewsAnalysis({ ...base, isRelevant: 'true' })).isRelevant).toBe(true)
  })

  it('rejects genuinely insufficient content instead of fabricating', () => {
    const short = newsAnalysisSchema.safeParse(normalizeNewsAnalysis({ ...base, summary: 'kısa özet' }))
    expect(short.success).toBe(false)
    const noTags = newsAnalysisSchema.safeParse(normalizeNewsAnalysis({ ...base, tags: 'vergi' }))
    expect(noTags.success).toBe(false)
  })

  it('rejects non-object AI responses', () => {
    expect(() => normalizeNewsAnalysis('düz metin')).toThrow('NEWS_AI_INVALID_JSON')
    expect(() => normalizeNewsAnalysis(null)).toThrow('NEWS_AI_INVALID_JSON')
  })
})

describe('news ingestion state transitions', () => {
  it('publishes valid relevant content and deduplicates a second run', async () => {
    const articles: any[] = []
    const fakePrisma = {
      newsSource: { upsert: vi.fn(async () => ({})) },
      newsArticle: {
        findFirst: vi.fn(async ({ where }: any) => articles.find(row => where.OR.some((value: any) => value.canonicalUrl === row.canonicalUrl || value.contentHash === row.contentHash)) ?? null),
        create: vi.fn(async ({ data }: any) => { const row = { ...data, id: 'article-1' }; articles.push(row); return row }),
        update: vi.fn(async ({ where, data }: any) => Object.assign(articles.find(row => row.id === where.id), data)),
        findMany: vi.fn(async () => []),
      },
    } as unknown as PrismaClient
    const testSource: NewsSourceConfig = { ...source, id: 'test-source' }
    const adapter = { fetchCandidates: vi.fn(async () => [{
      title: 'KOBİ kredilerine ilişkin resmî duyuru',
      url: 'https://www.tcmb.gov.tr/duyuru/kobi',
      sourcePublishedAt: new Date('2026-08-10T08:00:00Z'),
      content: 'Küçük ve orta büyüklükteki işletmeler için kredi koşullarına ilişkin yeterince uzun resmî açıklama metni.',
    }]) }
    const analyzer = vi.fn(async () => ({ provider: 'existing-gateway', model: 'test', analysis: {
      summary: 'KOBİ kredilerine ilişkin resmî koşullar ve uygulama çerçevesi kurum tarafından açıklandı.',
      whyItMatters: 'Finansman arayan işletmeler güncel koşulları nakit akışı planlarına dahil edebilir.',
      tags: ['kredi'], affectedAudience: ['KOBİ'], importance: 'HIGH' as const, isRelevant: true,
    } }))

    const first = await runNewsIngestion({ prisma: fakePrisma, sources: [testSource], analyzer, adapterFactory: () => adapter })
    const second = await runNewsIngestion({ prisma: fakePrisma, sources: [testSource], analyzer, adapterFactory: () => adapter })
    expect(first.published).toBe(1)
    expect(articles[0]).toMatchObject({ status: 'PUBLISHED', imageId: 'finance-credit', aiProvider: 'existing-gateway' })
    expect(second.duplicates).toBe(1)
    expect(analyzer).toHaveBeenCalledOnce()
  })
})

describe('news API cursor pagination', () => {
  it('returns only the requested published category order and a stable cursor', async () => {
    const rows = [
      { id: 'b', title: 'İkinci', category: 'FINANS', canonicalUrl: 'https://www.tcmb.gov.tr/b', imageId: 'finance-market', sourcePublishedAt: new Date('2026-08-10T10:00:00Z'), summary: 'Özet', whyItMatters: 'Etki', tags: ['piyasa'], affectedAudience: ['KOBİ'], importance: 'HIGH', source: { name: 'TCMB' } },
      { id: 'a', title: 'Birinci', category: 'FINANS', canonicalUrl: 'https://www.tcmb.gov.tr/a', imageId: 'finance-credit', sourcePublishedAt: new Date('2026-08-10T09:00:00Z'), summary: 'Özet', whyItMatters: 'Etki', tags: ['kredi'], affectedAudience: ['KOBİ'], importance: 'MEDIUM', source: { name: 'TCMB' } },
    ]
    const findMany = vi.fn(async () => rows)
    const app = Fastify()
    await app.register(newsRoutes, { prisma: { newsArticle: { findMany } } as unknown as PrismaClient })
    const response = await app.inject({ method: 'GET', url: '/api/news?category=FINANS&limit=1' })
    expect(response.statusCode).toBe(200)
    expect(response.json().items).toHaveLength(1)
    expect(response.json().items[0]).toMatchObject({ imageId: 'finance-market', sourceName: 'TCMB' })
    expect(decodeNewsCursor(response.json().nextCursor)).toMatchObject({ id: 'b' })
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'PUBLISHED', category: 'FINANS' },
      orderBy: [{ sourcePublishedAt: 'desc' }, { id: 'desc' }],
      take: 2,
    }))
    await app.close()
  })

  it('rejects malformed cursors and computes the next hourly Istanbul run', async () => {
    const app = Fastify()
    await app.register(newsRoutes, { prisma: { newsArticle: { findMany: vi.fn() } } as unknown as PrismaClient })
    expect((await app.inject({ method: 'GET', url: '/api/news?cursor=bad' })).statusCode).toBe(400)
    expect(NEWS_CRON_TIME_ZONE).toBe('Europe/Istanbul')
    expect(millisecondsUntilNextHour(new Date('2026-08-10T10:42:30.250Z'))).toBe(1_049_750)
    expect(decodeNewsCursor(encodeNewsCursor({ sourcePublishedAt: '2026-08-10T10:00:00.000Z', id: 'x' })).id).toBe('x')
    await app.close()
  })
})
