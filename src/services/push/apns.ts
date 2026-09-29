import { createPrivateKey, sign as imzala } from 'node:crypto'
import http2 from 'node:http2'

/*
 * APPLE PUSH (APNs) — HTTP/2 + JWT (jeton tabanlı kimlik).
 *
 * Neden kütüphane yok: Apple'ın protokolü küçük (bir HTTP/2 isteği + ES256
 * imzalı JWT) ve Node'un `http2` ile `crypto`su yetiyor. Yeni bir bağımlılık
 * hem güvenlik denetimi (`npm audit`) hem de sürüm bakımı demek.
 *
 * ⚠️ Ortam: App Store ve TestFlight derlemeleri PRODUCTION APNs kullanır
 * (`api.push.apple.com`). Yalnız Xcode'dan doğrudan yüklenen geliştirme
 * derlemeleri sandbox ister; bizde yok. `APNS_HOST` ile değiştirilebilir.
 *
 * Gizli anahtar (.p8) `APNS_KEY_P8_BASE64` içinde TEK SATIR base64 olarak
 * tutulur (çok satırlı PEM `.env`/compose'da bozulur). Hiçbir yerde
 * günlüğe yazılmaz.
 */

export interface ApnsAyari {
  keyId: string
  teamId: string
  keyPem: string
  bundleId: string
  host: string
}

export interface PushYuku {
  baslik: string
  govde: string
  /** Dokunulunca uygulamanın açacağı bağlantı (derin bağlantı). */
  url?: string
}

export type PushSonucu =
  | { durum: 'gonderildi' }
  /** Cihaz kodu artık geçersiz (uygulama silindi / kod değişti): satır silinmeli. */
  | { durum: 'gecersiz'; sebep: string }
  | { durum: 'hata'; sebep: string }

export function apnsAyari(ortam: NodeJS.ProcessEnv = process.env): ApnsAyari | null {
  const kapali = (ortam.APNS_ENABLED || '').trim().toLowerCase()
  if (kapali === '0' || kapali === 'false' || kapali === 'off') return null
  const keyId = (ortam.APNS_KEY_ID || '').trim()
  const teamId = (ortam.APNS_TEAM_ID || '').trim()
  const b64 = (ortam.APNS_KEY_P8_BASE64 || '').trim()
  if (!keyId || !teamId || !b64) return null
  let keyPem = ''
  try { keyPem = Buffer.from(b64, 'base64').toString('utf8') } catch { return null }
  if (!keyPem.includes('BEGIN PRIVATE KEY')) return null
  return {
    keyId,
    teamId,
    keyPem,
    bundleId: (ortam.APNS_BUNDLE_ID || 'com.localkarar.app').trim(),
    host: (ortam.APNS_HOST || 'api.push.apple.com').trim()
  }
}

function b64url(girdi: Buffer | string): string {
  return Buffer.from(girdi).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

/** ES256 JWT. Apple 20 dk–60 dk arası jeton ister; 40 dk önbelleklenir. */
export function jetonUret(ayar: Pick<ApnsAyari, 'keyId' | 'teamId' | 'keyPem'>, simdi = Math.floor(Date.now() / 1000)): string {
  const baslik = b64url(JSON.stringify({ alg: 'ES256', kid: ayar.keyId }))
  const govde = b64url(JSON.stringify({ iss: ayar.teamId, iat: simdi }))
  const imza = imzala('sha256', Buffer.from(`${baslik}.${govde}`), {
    key: createPrivateKey(ayar.keyPem),
    dsaEncoding: 'ieee-p1363'
  })
  return `${baslik}.${govde}.${b64url(imza)}`
}

let onbellek: { anahtar: string; jeton: string; alindi: number } | null = null
function jeton(ayar: ApnsAyari): string {
  const simdi = Date.now()
  const anahtar = `${ayar.keyId}:${ayar.teamId}`
  if (onbellek && onbellek.anahtar === anahtar && simdi - onbellek.alindi < 40 * 60 * 1000) return onbellek.jeton
  onbellek = { anahtar, jeton: jetonUret(ayar), alindi: simdi }
  return onbellek.jeton
}

/** Apple'ın "artık bu koda gönderme" dediği sebepler. */
const GECERSIZ_SEBEPLER = new Set(['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'])

export function sonucuSiniflandir(durumKodu: number, sebep: string): PushSonucu {
  if (durumKodu === 200) return { durum: 'gonderildi' }
  if (durumKodu === 410 || GECERSIZ_SEBEPLER.has(sebep)) return { durum: 'gecersiz', sebep: sebep || String(durumKodu) }
  return { durum: 'hata', sebep: `${durumKodu} ${sebep}`.trim() }
}

export function govdeUret(yuk: PushYuku): string {
  return JSON.stringify({
    aps: { alert: { title: yuk.baslik.slice(0, 80), body: yuk.govde.slice(0, 200) }, sound: 'default' },
    ...(yuk.url ? { url: yuk.url } : {})
  })
}

export type ApnsGonderici = (ayar: ApnsAyari, cihazKodu: string, yuk: PushYuku) => Promise<PushSonucu>

/** Gerçek gönderici: tek istek için kısa ömürlü HTTP/2 oturumu. */
export const apnsIstegi: ApnsGonderici = (ayar, cihazKodu, yuk) =>
  new Promise(coz => {
    let bitti = false
    const bitir = (s: PushSonucu) => { if (!bitti) { bitti = true; try { oturum.close() } catch { /* zaten kapalı */ } coz(s) } }
    const oturum = http2.connect(`https://${ayar.host}`)
    oturum.setTimeout(10_000, () => bitir({ durum: 'hata', sebep: 'zaman aşımı' }))
    oturum.on('error', e => bitir({ durum: 'hata', sebep: e.message.slice(0, 120) }))

    const istek = oturum.request({
      ':method': 'POST',
      ':path': `/3/device/${cihazKodu}`,
      authorization: `bearer ${jeton(ayar)}`,
      'apns-topic': ayar.bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json'
    })
    let durum = 0
    let govde = ''
    istek.setEncoding('utf8')
    istek.on('response', basliklar => { durum = Number(basliklar[':status']) || 0 })
    istek.on('data', parca => { govde += parca })
    istek.on('end', () => {
      let sebep = ''
      try { sebep = JSON.parse(govde || '{}').reason || '' } catch { /* boş gövde */ }
      bitir(sonucuSiniflandir(durum, sebep))
    })
    istek.on('error', e => bitir({ durum: 'hata', sebep: e.message.slice(0, 120) }))
    istek.end(govdeUret(yuk))
  })
