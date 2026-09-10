export const ANALYTICS_CONSENT_KEY = 'localkarar-analytics-consent-v1'
export const ANALYTICS_CONSENT_EVENT = 'localkarar:analytics-consent'
export const ANALYTICS_CONSENT_VERSION = '2026-09-08'

const ALLOWED_EVENTS = new Set([
  '$identify',
  'page_view',
  'signup_started',
  'signup_completed',
  'onboarding_started',
  'onboarding_step_completed',
  'onboarding_completed',
  /*
   * 🔴 AKTİVASYON OLAYLARI — izin listesine EKLENMEYİ UNUTMUŞTU.
   *
   * Olaylar 09.09.2026'da çağrı yerlerine eklendi ama buraya
   * yazılmadığı için `captureAnalytics` ikisini de SESSİZCE düşürdü.
   * PostHog'da yalnız `page_view` göründü (ürün sahibi bildirdi).
   *
   * ⚠️ Bu liste bilerek var: yeni bir olay eklerken buraya da yazmak
   * ZORUNLU, yoksa hiç gitmiyor. Sessiz düşürme, izinsiz veri
   * göndermekten iyi -- ama olayı ekleyip burayı unutmak da veri
   * kaybettiriyor. Test artık ikisini bağlıyor.
   */
  'workspace_created',
  'record_created',
  'integration_connect_started',
  'integration_connect_succeeded',
  'integration_connect_failed',
  'sync_started',
  'sync_succeeded',
  'sync_failed',
  'calculation_started',
  'calculation_completed',
  'calculation_failed',
  'decision_tool_started',
  'decision_tool_completed',
  'decision_follow_up_created',
  'mentor_session_started',
  'mentor_response_completed',
  'mentor_failed',
  'subscription_checkout_started',
  'subscription_activated',
  'subscription_failed',
  'app_error'
])

const SAFE_PROPERTIES = new Set([
  'route', 'source', 'platform', 'language', 'app_version', 'release_sha',
  'user_role', 'workspace_role', 'subscription_status', 'integration_type',
  'sync_mode', 'calculation_code', 'decision_tool_code', 'outcome',
  'duration_bucket', 'error_code', 'plan_code', 'billing_period',
  'onboarding_step', 'mentor_mode',
  /* Aktivasyon olaylarının özellikleri. Hepsi ya sabit bir kod ya da
     sayı; işletme adı, kayıt başlığı ve tutar BİLEREK yok. */
  'sector', 'workspace_index', 'record_type', 'direction', 'is_first_record'
])

const SDK_PROPERTIES = new Set([
  'token', 'distinct_id', '$token', '$distinct_id', '$device_id', '$session_id',
  '$anon_distinct_id', '$lib', '$lib_version', '$browser', '$browser_version',
  '$os', '$os_version', '$device_type', '$screen_height', '$screen_width',
  '$viewport_height', '$viewport_width', '$timezone', '$language', '$geoip_disable',
  '$process_person_profile'
])

const FORBIDDEN_PROPERTY_PATTERN = /(email|e-?mail|name|phone|address|message|content|prompt|response|amount|price|revenue|cost|profit|order|customer|credential|secret|token|document|file|url|path|referrer)/i

let configPromise = null
let clientPromise = null
let client = null

function safePrimitive(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') return value.slice(0, 80)
  return undefined
}

export function sanitizeAnalyticsProperties(properties = {}) {
  const safe = {}
  for (const [key, value] of Object.entries(properties || {})) {
    if (!SAFE_PROPERTIES.has(key) || FORBIDDEN_PROPERTY_PATTERN.test(key)) continue
    const normalized = safePrimitive(value)
    if (normalized !== undefined) safe[key] = normalized
  }
  return safe
}

function sanitizeSdkEvent(event) {
  if (!event || !ALLOWED_EVENTS.has(event.event)) return null
  const properties = {}
  for (const [key, value] of Object.entries(event.properties || {})) {
    if (SAFE_PROPERTIES.has(key)) {
      const normalized = safePrimitive(value)
      if (normalized !== undefined) properties[key] = normalized
      continue
    }
    if (SDK_PROPERTIES.has(key)) properties[key] = value
  }

  if (event.event === '$identify' && event.properties?.$set) {
    properties.$set = sanitizeAnalyticsProperties(event.properties.$set)
  }
  return { ...event, properties }
}

export function normalizeAnalyticsRoute(pathname = '/') {
  const path = String(pathname).split(/[?#]/, 1)[0] || '/'
  const rules = [
    [/^\/app\/workspaces\/[^/]+(?:\/(overview|tracker|orders|products|calendar|documents|notifications|team|contacts|settings|activity))?$/, match => `/app/workspaces/:workspaceId${match[1] ? `/${match[1]}` : ''}`],
    [/^\/app\/decision-checks\/[^/]+$/, () => '/app/decision-checks/:decisionCheck'],
    [/^\/app\/courses\/[^/]+\/learn(?:\/[^/]+)?$/, () => '/app/courses/:courseId/learn/:lessonId'],
    [/^\/app\/finance\/models\/[^/]+$/, () => '/app/finance/models/:modelCode'],
    [/^\/app\/community\/gonderi\/[^/]+$/, () => '/app/community/gonderi/:postId'],
    [/^\/app\/profil\/[^/]+$/, () => '/app/profil/:userId']
  ]
  for (const [pattern, formatter] of rules) {
    const match = path.match(pattern)
    if (match) return formatter(match)
  }
  return path.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id').replace(/\/\d+(?=\/|$)/g, '/:id').slice(0, 120)
}

export function getAnalyticsConsent() {
  if (typeof window === 'undefined') return 'unknown'
  const stored = window.localStorage.getItem(ANALYTICS_CONSENT_KEY)
  return stored === 'granted' || stored === 'denied' ? stored : 'unknown'
}

function validAnalyticsConfig(raw) {
  if (!raw?.enabled || !raw?.projectToken || !raw?.host) return null
  try {
    const url = new URL(raw.host)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') return null
    return { enabled: true, projectToken: String(raw.projectToken), host: url.origin }
  } catch {
    return null
  }
}

export async function loadAnalyticsConfig() {
  if (typeof window === 'undefined') return null
  if (!configPromise) {
    configPromise = fetch('/app-config', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(data => validAnalyticsConfig(data?.analytics))
      .catch(() => null)
  }
  return configPromise
}

export async function isAnalyticsConfigured() {
  return Boolean(await loadAnalyticsConfig())
}

export async function startAnalytics() {
  if (getAnalyticsConsent() !== 'granted') return null
  if (client) return client
  if (!clientPromise) {
    clientPromise = loadAnalyticsConfig().then(async config => {
      if (!config) return null
      const module = await import('posthog-js')
      const posthog = module.default
      posthog.init(config.projectToken, {
        api_host: config.host,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        capture_heatmaps: false,
        capture_performance: false,
        disable_session_recording: true,
        disable_surveys: true,
        advanced_disable_feature_flags: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
        person_profiles: 'identified_only',
        persistence: 'localStorage',
        respect_dnt: true,
        property_denylist: ['$current_url', '$pathname', '$referrer', '$referring_domain', '$initial_current_url', '$initial_referrer'],
        before_send: sanitizeSdkEvent
      })
      client = posthog
      return client
    }).catch(() => {
      clientPromise = null
      return null
    })
  }
  return clientPromise
}

export async function setAnalyticsConsent(consent) {
  if (typeof window === 'undefined') return
  const normalized = consent === 'granted' ? 'granted' : 'denied'
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, normalized)
  if (normalized === 'granted') {
    const activeClient = await startAnalytics()
    activeClient?.opt_in_capturing?.()
  } else if (client) {
    client.opt_out_capturing()
    client.reset()
  }
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: { consent: normalized } }))
}

export async function captureAnalytics(event, properties = {}) {
  if (!ALLOWED_EVENTS.has(event) || event.startsWith('$')) return false
  const activeClient = await startAnalytics()
  if (!activeClient) return false
  activeClient.capture(event, sanitizeAnalyticsProperties(properties))
  return true
}

export async function identifyAnalytics(userId, properties = {}) {
  if (userId === null || userId === undefined || userId === '') return false
  const activeClient = await startAnalytics()
  if (!activeClient) return false
  activeClient.identify(String(userId), sanitizeAnalyticsProperties(properties))
  return true
}

export function resetAnalytics() {
  if (!client) return
  client.reset()
}

export function resetAnalyticsForTests() {
  configPromise = null
  clientPromise = null
  client = null
}
