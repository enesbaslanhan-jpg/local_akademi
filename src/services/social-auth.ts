/*
 * SOSYAL GİRİŞ — Google ve Apple kimlik belirteci doğrulama (16.09.2026).
 *
 * Akış her platformda aynı: istemci (web / Android / iOS) sağlayıcıdan bir
 * KİMLİK BELİRTECİ (ID token, JWT) alır ve `POST /auth/social`a gönderir.
 * Sunucu belirteci sağlayıcının açık anahtarlarıyla (JWKS) doğrular, `sub`
 * ile UserIdentity tablosunda eşleştirir, yoksa e-postayla mevcut hesaba
 * bağlar ya da yeni hesap açar. Yönlendirmeli (redirect/callback) OAuth
 * akışı KULLANILMIYOR: mobil SDK'lar zaten belirteç veriyor, web'de de
 * Google Identity Services ve Apple JS belirteci doğrudan döndürüyor.
 *
 * Kabul edilen `aud` (istemci kimlikleri) ortam değişkenlerinden okunur:
 *   GOOGLE_CLIENT_IDS = web,android1,android2,ios  (virgülle)
 *   APPLE_CLIENT_IDS  = com.localkarar.app,com.localkarar.web
 * Boşsa o sağlayıcı KAPALI sayılır ve uç 503 döner; arayüz düğmeyi
 * `/app-config` üzerinden gizler.
 *
 * Apple özel durumu: hesap silinirken Apple belirtecinin iptali gerekir
 * (App Store İnceleme 5.1.1(v)). Bunun için ilk girişte gelen
 * `authorizationCode` .p8 anahtarıyla imzalanmış istemci sırrı kullanılarak
 * refresh token'a çevrilir ve şifreli saklanır; silmede `revoke` çağrılır.
 * .p8 yoksa değişim atlanır — giriş yine çalışır, yalnız iptal yapılamaz.
 */
import { createRemoteJWKSet, jwtVerify, SignJWT, importPKCS8, type JWTPayload, type JWTVerifyGetKey } from 'jose'

export type SocialProvider = 'google' | 'apple'

export type DogrulanmisKimlik = {
  provider: SocialProvider
  subject: string
  email: string | null
  emailVerified: boolean
  /** Apple "e-postamı gizle" aktarma adresi mi? (privaterelay.appleid.com) */
  privateRelay: boolean
  name: string | null
}

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']
const APPLE_ISSUER = 'https://appleid.apple.com'

function listeOku(ad: string): string[] {
  return (process.env[ad] || '').split(',').map(s => s.trim()).filter(Boolean)
}

export function googleIstemcileri(): string[] { return listeOku('GOOGLE_CLIENT_IDS') }
export function appleIstemcileri(): string[] { return listeOku('APPLE_CLIENT_IDS') }

export function sosyalGirisDurumu() {
  return {
    google: googleIstemcileri().length > 0,
    apple: appleIstemcileri().length > 0
  }
}

/*
 * JWKS anahtar çözücüleri süreç ömrünce önbelleklenir (jose kendisi
 * yeniler). Testler `anahtarCozucu` parametresiyle yerel anahtar seti verir;
 * ağa çıkılmaz.
 */
let googleJwks: JWTVerifyGetKey | null = null
let appleJwks: JWTVerifyGetKey | null = null
function googleAnahtarlari(): JWTVerifyGetKey {
  if (!googleJwks) googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
  return googleJwks
}
function appleAnahtarlari(): JWTVerifyGetKey {
  if (!appleJwks) appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))
  return appleJwks
}
/** YALNIZ TESTLER: uzak JWKS yerine yerel anahtar seti (ağa çıkılmaz). */
export function anahtarCozucuAyarlaTestIcin(provider: SocialProvider, cozucu: JWTVerifyGetKey | null): void {
  if (process.env.NODE_ENV !== 'test') throw new Error('yalniz test ortaminda')
  if (provider === 'google') googleJwks = cozucu; else appleJwks = cozucu
}

export class SosyalBelirtecHatasi extends Error {
  constructor(public readonly kod: 'PROVIDER_DISABLED' | 'INVALID_TOKEN' | 'EMAIL_NOT_VERIFIED', mesaj: string) {
    super(mesaj)
  }
}

export type DogrulamaSecenekleri = {
  anahtarCozucu?: JWTVerifyGetKey
  /** Test: saat kayması için. */
  simdi?: Date
}

function metin(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export async function googleBelirteciDogrula(idToken: string, sec: DogrulamaSecenekleri = {}): Promise<DogrulanmisKimlik> {
  const istemciler = googleIstemcileri()
  if (istemciler.length === 0) throw new SosyalBelirtecHatasi('PROVIDER_DISABLED', 'Google ile giriş kapalı')
  let payload: JWTPayload
  try {
    const sonuc = await jwtVerify(idToken, sec.anahtarCozucu ?? googleAnahtarlari(), {
      issuer: GOOGLE_ISSUERS,
      audience: istemciler,
      currentDate: sec.simdi,
      clockTolerance: 60
    })
    payload = sonuc.payload
  } catch {
    throw new SosyalBelirtecHatasi('INVALID_TOKEN', 'Google kimlik belirteci doğrulanamadı')
  }
  const email = metin(payload.email)?.toLowerCase() ?? null
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true'
  /*
   * Doğrulanmamış e-posta ile hesap BAĞLANMAZ: saldırgan, kurbanın
   * e-postasını Google'da doğrulamadan girip mevcut hesaba bağlanabilirdi.
   */
  if (!email || !emailVerified) throw new SosyalBelirtecHatasi('EMAIL_NOT_VERIFIED', 'Google hesabının e-postası doğrulanmamış')
  return {
    provider: 'google',
    subject: String(payload.sub),
    email,
    emailVerified: true,
    privateRelay: false,
    name: metin(payload.name) ?? (metin([metin(payload.given_name), metin(payload.family_name)].filter(Boolean).join(' ')))
  }
}

export async function appleBelirteciDogrula(idToken: string, sec: DogrulamaSecenekleri = {}): Promise<DogrulanmisKimlik> {
  const istemciler = appleIstemcileri()
  if (istemciler.length === 0) throw new SosyalBelirtecHatasi('PROVIDER_DISABLED', 'Apple ile giriş kapalı')
  let payload: JWTPayload
  try {
    const sonuc = await jwtVerify(idToken, sec.anahtarCozucu ?? appleAnahtarlari(), {
      issuer: APPLE_ISSUER,
      audience: istemciler,
      currentDate: sec.simdi,
      clockTolerance: 60
    })
    payload = sonuc.payload
  } catch {
    throw new SosyalBelirtecHatasi('INVALID_TOKEN', 'Apple kimlik belirteci doğrulanamadı')
  }
  const email = metin(payload.email)?.toLowerCase() ?? null
  // Apple e-postayı yalnız doğrulanmışsa verir; alan string "true" da gelebilir.
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true' || email !== null
  return {
    provider: 'apple',
    subject: String(payload.sub),
    email,
    emailVerified,
    privateRelay: email?.endsWith('@privaterelay.appleid.com') ?? false,
    name: null // Apple adı belirtece koymaz; istemci ilk girişte ayrı gönderir.
  }
}

export async function sosyalBelirteciDogrula(provider: SocialProvider, idToken: string, sec: DogrulamaSecenekleri = {}) {
  return provider === 'google' ? googleBelirteciDogrula(idToken, sec) : appleBelirteciDogrula(idToken, sec)
}

/*
 * ---- Apple belirteç değişimi ve iptali -------------------------------------
 * İstemci sırrı: .p8 (ES256) ile imzalı, en fazla 6 ay geçerli JWT.
 * Ortam: APPLE_TEAM_ID, APPLE_SIGNIN_KEY_ID, APPLE_SIGNIN_KEY_P8 (PEM, \n
 * kaçışlı olabilir). Eksikse null döner ve çağıran atlar.
 */
export function appleIptalYapilandirmasi() {
  const teamId = (process.env.APPLE_TEAM_ID || '').trim()
  const keyId = (process.env.APPLE_SIGNIN_KEY_ID || '').trim()
  const p8 = (process.env.APPLE_SIGNIN_KEY_P8 || '').trim().replace(/\\n/g, '\n')
  if (!teamId || !keyId || !p8) return null
  return { teamId, keyId, p8 }
}

async function appleIstemciSirri(clientId: string): Promise<string | null> {
  const y = appleIptalYapilandirmasi()
  if (!y) return null
  const key = await importPKCS8(y.p8, 'ES256')
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: y.keyId })
    .setIssuer(y.teamId)
    .setSubject(clientId)
    .setAudience(APPLE_ISSUER)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key)
}

/** authorizationCode → refresh_token. Başarısızlıkta null (giriş yine tamamlanır). */
export async function appleKoduDegistir(clientId: string, authorizationCode: string, fetchFn: typeof fetch = fetch): Promise<string | null> {
  const sir = await appleIstemciSirri(clientId).catch(() => null)
  if (!sir) return null
  try {
    const res = await fetchFn('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: authorizationCode, client_id: clientId, client_secret: sir })
    })
    if (!res.ok) return null
    const j = await res.json() as { refresh_token?: string }
    return typeof j.refresh_token === 'string' ? j.refresh_token : null
  } catch {
    return null
  }
}

/** Hesap silmede Apple belirtecini iptal eder; hata bastırılır (silme durmaz). */
export async function appleBelirteciIptalEt(clientId: string, refreshToken: string, fetchFn: typeof fetch = fetch): Promise<boolean> {
  const sir = await appleIstemciSirri(clientId).catch(() => null)
  if (!sir) return false
  try {
    const res = await fetchFn('https://appleid.apple.com/auth/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: refreshToken, token_type_hint: 'refresh_token', client_id: clientId, client_secret: sir })
    })
    return res.ok
  } catch {
    return false
  }
}
