import { PostHog } from 'posthog-node'
import type { PrismaClient } from '@prisma/client'

const SERVER_EVENTS = new Set([
  'sync_succeeded', 'sync_failed',
  'calculation_completed', 'calculation_failed',
  'decision_tool_completed',
  'mentor_response_completed', 'mentor_failed',
  'subscription_activated', 'subscription_failed',
  'app_error'
])

const SAFE_PROPERTIES = new Set([
  'source', 'platform', 'app_version', 'release_sha', 'integration_type',
  'sync_mode', 'calculation_code', 'decision_tool_code', 'outcome',
  'duration_bucket', 'error_code', 'plan_code', 'billing_period', 'mentor_mode'
])

let client: PostHog | null | undefined

function primitive(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') return value.slice(0, 80)
  return undefined
}

export function sanitizeProductAnalyticsProperties(properties: Record<string, unknown> = {}) {
  const safe: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (!SAFE_PROPERTIES.has(key)) continue
    const normalized = primitive(value)
    if (normalized !== undefined) safe[key] = normalized
  }
  return safe
}

/*
 * 🔴 YALNIZ AB BÖLGESİ KABUL EDİLİYOR.
 *
 * Aydınlatma metni (frontend/src/content/legal/privacy.js, "Yurt dışına
 * aktarım" tablosu) analitik verisinin AB'ye aktarıldığını YAZILI olarak
 * beyan ediyor. `POSTHOG_HOST` bir çevre değişkeni; yanlışlıkla ABD
 * bölgesine çevrilirse metin sessizce YANLIŞ BEYAN hâline gelir ve bunu
 * fark ettirecek hiçbir şey olmaz.
 *
 * Bu yüzden bölge kodda kilitli: metinde ne yazıyorsa sunucu ancak oraya
 * gönderebiliyor. Bölge değişecekse önce metin değişmeli.
 *
 * ⚠️ localhost geliştirme için açık; orada gerçek kullanıcı verisi yok.
 */
const IZINLI_ANALITIK_SUNUCULARI = [
  'eu.i.posthog.com',
  'eu.posthog.com'
]

export function analitikSunucusuIzinli(hostname: string): boolean {
  return IZINLI_ANALITIK_SUNUCULARI.includes(hostname) || hostname === 'localhost'
}

function getClient(): PostHog | null {
  if (client !== undefined) return client
  const enabled = (process.env.PRODUCT_ANALYTICS_ENABLED || '').trim().toLowerCase() === 'true'
  const token = (process.env.POSTHOG_PROJECT_TOKEN || '').trim()
  const host = (process.env.POSTHOG_HOST || '').trim()
  if (!enabled || !token || !host) {
    client = null
    return null
  }
  try {
    const url = new URL(host)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
      client = null
      return null
    }
    if (!analitikSunucusuIzinli(url.hostname)) {
      /* Sessizce kapatmak yetmez: yanlış bölge YAZILI BEYANLA çelişir,
         kurulumu yapan kişinin bunu görmesi gerekir. */
      console.error(
        '[analytics] POSTHOG_HOST AB bölgesinde değil: ' + url.hostname +
        ' -- aydınlatma metni AB beyan ediyor, analitik KAPATILDI.'
      )
      client = null
      return null
    }
    client = new PostHog(token, {
      host: url.origin,
      disableGeoip: true,
      flushAt: 20,
      flushInterval: 10_000
    })
    return client
  } catch {
    client = null
    return null
  }
}

export async function captureProductEvent(
  prisma: PrismaClient,
  userId: number,
  event: string,
  properties: Record<string, unknown> = {}
): Promise<boolean> {
  if (!SERVER_EVENTS.has(event)) return false
  const analytics = getClient()
  if (!analytics) return false
  const preference = await prisma.userPreference.findUnique({
    where: { userId },
    select: { analyticsConsent: true }
  })
  if (preference?.analyticsConsent !== true) return false
  analytics.capture({
    distinctId: String(userId),
    event,
    properties: {
      ...sanitizeProductAnalyticsProperties(properties),
      platform: 'server',
      $process_person_profile: false
    },
    disableGeoip: true
  })
  return true
}

export async function shutdownProductAnalytics() {
  if (client) await client.shutdown()
  client = undefined
}

export function resetProductAnalyticsForTests() {
  client = undefined
}
