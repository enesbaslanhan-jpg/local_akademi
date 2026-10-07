import { sendMail } from './mailer.js'

export type SecurityAlert = {
  event: 'SECURITY_ACTIVITY_ALERT'
  kind: 'signup_burst' | 'login_failure_burst'
  count: number
  windowMinutes: number
}

// Bounded, process-local detector. Not a replacement for Cloudflare/host alerts.
// No message content, tokens or email addresses are copied into notifications.
export function createSecurityEventMonitor(
  notify: (alert: SecurityAlert) => void,
  now: () => number = Date.now
) {
  const buckets = new Map<string, { start: number; count: number; alerted: boolean }>()
  return (action: string, metadata: Record<string, unknown> = {}) => {
    const signup = action === 'user.registered' || action === 'user.registered_social'
    const failed = action === 'auth.login_failed' || action === 'auth.login_locked' || action === 'auth.social_rejected'
    if (!signup && !failed) return
    const timestamp = now()
    // Both rules use 15 minutes, which also bounds the notification cooldown.
    const windowMs = 15 * 60_000
    for (const [key, bucket] of buckets) {
      if (timestamp - bucket.start >= windowMs) buckets.delete(key)
    }
    const ip = typeof metadata.ip === 'string' ? metadata.ip.slice(0, 64) : 'unknown'
    const key = signup ? 'signups' : `failures:${ip}`
    let bucket = buckets.get(key)
    if (!bucket) {
      // Cap memory even if a distributed scanner supplies many distinct IPs.
      if (buckets.size >= 1000) buckets.delete(buckets.keys().next().value!)
      bucket = { start: timestamp, count: 0, alerted: false }
      buckets.set(key, bucket)
    }
    bucket.count++
    if (bucket.count >= 10 && !bucket.alerted) {
      bucket.alerted = true
      notify({ event: 'SECURITY_ACTIVITY_ALERT', kind: signup ? 'signup_burst' : 'login_failure_burst',
        count: bucket.count, windowMinutes: 15 })
    }
  }
}

async function notifySecurityAlert(alert: SecurityAlert) {
  console.warn(JSON.stringify(alert))
  if (process.env.SECURITY_ALERT_EMAIL_ENABLED !== 'true') return
  const recipient = (process.env.SECURITY_ALERT_EMAIL_TO || process.env.SUPPORT_MAIL_TO || '').trim()
  if (!recipient.includes('@')) {
    console.error(JSON.stringify({ event: 'SECURITY_ALERT_EMAIL_NOT_CONFIGURED' }))
    return
  }
  const activity = alert.kind === 'signup_burst' ? 'yeni kayıt' : 'aynı adresten başarısız giriş'
  try {
    await sendMail({
      to: recipient,
      subject: 'LocalKarar — güvenlik kontrolü gerektiren hareketlilik',
      text: `Son ${alert.windowMinutes} dakikalık pencerede ${alert.count} ${activity} kaydedildi. Bu bir saldırı kanıtı değildir. Yönetim → Denetim Kayıtları ve Cloudflare Güvenlik ekranlarını kontrol edin.`
    })
  } catch {
    console.error(JSON.stringify({ event: 'SECURITY_ALERT_EMAIL_FAILED', kind: alert.kind }))
  }
}

export const observeSecurityEvent = createSecurityEventMonitor(alert => {
  void notifySecurityAlert(alert)
})
