import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type KeyLike } from 'jose'

/**
 * SOSYAL GİRİŞ (Google / Apple) — 16.09.2026.
 *
 * Sağlayıcı anahtarları ağdan değil, testte üretilen yerel anahtar
 * setinden okunur; belirteçler burada imzalanır. Kilitlenen davranış:
 *  - doğru aud/iss ile giriş; yanlış aud reddi; doğrulanmamış e-posta reddi
 *  - ilk girişte onay şart (409), onayla yeni hesap: hasPassword=false,
 *    e-posta doğrulanmış, onay kaydı var
 *  - aynı e-postalı mevcut hesaba BAĞLANMA (yeni hesap açılmaz)
 *  - ikinci giriş aynı kullanıcıya düşer
 *  - parolasız hesap parola vermeden silinebilir; kimlik satırı temizlenir
 *  - sağlayıcı kapalıysa 503
 */

const prisma = new PrismaClient()
const marker = `sosyal-${Date.now()}`
const GOOGLE_WEB = 'test-web.apps.googleusercontent.com'
const GOOGLE_IOS = 'test-ios.apps.googleusercontent.com'
const APPLE_APP = 'com.localkarar.app'
let app: FastifyInstance
let googleKey: KeyLike
let appleKey: KeyLike

beforeAll(async () => {
  process.env.JWT_SECRET = 'social-login-test-secret-min-32-byte-xx'
  process.env.NODE_ENV = 'test'
  process.env.GOOGLE_CLIENT_IDS = `${GOOGLE_WEB},${GOOGLE_IOS}`
  process.env.APPLE_CLIENT_IDS = `${APPLE_APP},com.localkarar.web`

  const g = await generateKeyPair('RS256')
  const a = await generateKeyPair('RS256')
  googleKey = g.privateKey
  appleKey = a.privateKey
  const { anahtarCozucuAyarlaTestIcin } = await import('../src/services/social-auth')
  anahtarCozucuAyarlaTestIcin('google', createLocalJWKSet({ keys: [{ ...(await exportJWK(g.publicKey)), kid: 'g1', alg: 'RS256', use: 'sig' }] }))
  anahtarCozucuAyarlaTestIcin('apple', createLocalJWKSet({ keys: [{ ...(await exportJWK(a.publicKey)), kid: 'a1', alg: 'RS256', use: 'sig' }] }))

  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()
})

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { email: { contains: marker } }, select: { id: true } })
  const ids = users.map(u => u.id)
  await prisma.userIdentity.deleteMany({ where: { userId: { in: ids } } })
  await prisma.userConsent.deleteMany({ where: { userId: { in: ids } } })
  await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } })
  await prisma.refreshToken?.deleteMany?.({ where: { userId: { in: ids } } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await app.close()
  await prisma.$disconnect()
})

async function googleBelirteci(claims: Record<string, unknown>, aud = GOOGLE_WEB) {
  return new SignJWT({ email_verified: true, ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'g1' })
    .setIssuer('https://accounts.google.com').setAudience(aud).setIssuedAt().setExpirationTime('1h')
    .sign(googleKey)
}
async function appleBelirteci(claims: Record<string, unknown>, aud = APPLE_APP) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'a1' })
    .setIssuer('https://appleid.apple.com').setAudience(aud).setIssuedAt().setExpirationTime('1h')
    .sign(appleKey)
}
function sosyal(payload: Record<string, unknown>) {
  return app.inject({ method: 'POST', url: '/auth/social', payload })
}

describe('POST /auth/social — Google', () => {
  it('ilk girişte onay şart: acceptedLegal yoksa 409 CONSENT_REQUIRED, hesap açılmaz', async () => {
    const email = `${marker}-g1@test.local`
    const r = await sosyal({ provider: 'google', idToken: await googleBelirteci({ sub: 'g-sub-1', email, name: 'Google Bir' }) })
    expect(r.statusCode).toBe(409)
    expect(r.json().error).toBe('CONSENT_REQUIRED')
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull()
  })

  it('onayla yeni hesap açılır: hasPassword=false, e-posta doğrulanmış, onay kaydı var, token döner', async () => {
    const email = `${marker}-g1@test.local`
    const r = await sosyal({ provider: 'google', idToken: await googleBelirteci({ sub: 'g-sub-1', email, name: 'Google Bir' }), acceptedLegal: true })
    expect(r.statusCode).toBe(200)
    const j = r.json()
    expect(j.isNewUser).toBe(true)
    expect(j.token).toBeTruthy(); expect(j.refreshToken).toBeTruthy()
    expect(j.user.email).toBe(email); expect(j.user.name).toBe('Google Bir')
    expect(j.user.hasPassword).toBe(false); expect(j.user.emailVerified).toBe(true)
    const u = await prisma.user.findUniqueOrThrow({ where: { email } })
    expect(await prisma.userConsent.count({ where: { userId: u.id } })).toBeGreaterThan(0)
    expect(await prisma.userIdentity.count({ where: { userId: u.id, provider: 'google', subject: 'g-sub-1' } })).toBe(1)

    /* Token gerçekten çalışıyor ve /me hasPassword bildiriyor. */
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${j.token}` } })
    expect(me.statusCode).toBe(200)
    expect(me.json().hasPassword).toBe(false)
  })

  it('ikinci giriş aynı kullanıcıya düşer; onay istenmez; iOS istemci aud kabul', async () => {
    const email = `${marker}-g1@test.local`
    const r = await sosyal({ provider: 'google', idToken: await googleBelirteci({ sub: 'g-sub-1', email }, GOOGLE_IOS) })
    expect(r.statusCode).toBe(200)
    expect(r.json().isNewUser).toBe(false)
    expect(await prisma.user.count({ where: { email } })).toBe(1)
  })

  it('aynı e-postalı MEVCUT hesaba bağlanır, yeni hesap açılmaz', async () => {
    const email = `${marker}-mevcut@test.local`
    const kayit = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email, password: 'GucluTestParolasi!42', name: 'Mevcut Kullanıcı', acceptedLegal: true }
    })
    expect(kayit.statusCode).toBe(200)
    const r = await sosyal({ provider: 'google', idToken: await googleBelirteci({ sub: 'g-sub-2', email }) })
    expect(r.statusCode).toBe(200)
    expect(r.json().isNewUser).toBe(false)
    expect(r.json().user.hasPassword).toBe(true)
    expect(r.json().user.name).toBe('Mevcut Kullanıcı')
    expect(await prisma.user.count({ where: { email } })).toBe(1)
  })

  it('yanlış aud reddedilir (401), doğrulanmamış e-posta reddedilir (403)', async () => {
    const yabanci = await new SignJWT({ email: `${marker}-x@test.local`, email_verified: true, sub: 'g-x' })
      .setProtectedHeader({ alg: 'RS256', kid: 'g1' }).setIssuer('https://accounts.google.com')
      .setAudience('baska-uygulama.apps.googleusercontent.com').setIssuedAt().setExpirationTime('1h').sign(googleKey)
    expect((await sosyal({ provider: 'google', idToken: yabanci, acceptedLegal: true })).statusCode).toBe(401)

    const dogrulanmamis = await googleBelirteci({ sub: 'g-y', email: `${marker}-y@test.local`, email_verified: false })
    const r = await sosyal({ provider: 'google', idToken: dogrulanmamis, acceptedLegal: true })
    expect(r.statusCode).toBe(403)
    expect(r.json().error).toBe('EMAIL_NOT_VERIFIED')
  })
})

describe('POST /auth/social — Apple', () => {
  it('Apple belirteci ile yeni hesap; ad istemciden gelir; gizli aktarma adresi kabul', async () => {
    const email = `${marker}-a1@privaterelay.appleid.com`
    const r = await sosyal({
      provider: 'apple', idToken: await appleBelirteci({ sub: 'apple-sub-1', email, email_verified: 'true' }),
      name: 'Apple Kullanıcı', acceptedLegal: true
    })
    expect(r.statusCode).toBe(200)
    expect(r.json().user.name).toBe('Apple Kullanıcı')
    expect(r.json().user.hasPassword).toBe(false)
  })

  it('parolasız (sosyal) hesap parola vermeden silinebilir; kimlik satırı temizlenir', async () => {
    const email = `${marker}-a1@privaterelay.appleid.com`
    const giris = await sosyal({ provider: 'apple', idToken: await appleBelirteci({ sub: 'apple-sub-1', email }) })
    const token = giris.json().token
    const u = await prisma.user.findUniqueOrThrow({ where: { email } })
    const sil = await app.inject({
      method: 'DELETE', url: '/auth/account', headers: { authorization: `Bearer ${token}` },
      payload: { confirmation: 'HESABIMI SİL' }
    })
    expect(sil.statusCode).toBe(204)
    expect(await prisma.userIdentity.count({ where: { userId: u.id } })).toBe(0)
    const sonra = await prisma.user.findUnique({ where: { id: u.id } })
    expect(sonra?.deletedAt).not.toBeNull()
  })

  it('parolalı hesap parola vermeden SİLİNEMEZ (422 PASSWORD_REQUIRED)', async () => {
    const email = `${marker}-mevcut@test.local`
    const giris = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'GucluTestParolasi!42' } })
    const sil = await app.inject({
      method: 'DELETE', url: '/auth/account', headers: { authorization: `Bearer ${giris.json().token}` },
      payload: { confirmation: 'HESABIMI SİL' }
    })
    expect(sil.statusCode).toBe(422)
    expect(sil.json().error).toBe('PASSWORD_REQUIRED')
  })
})

describe('yapılandırma', () => {
  it('/app-config sosyal giriş bayraklarını ve web istemci kimliğini verir', async () => {
    const r = await app.inject({ method: 'GET', url: '/app-config' })
    expect(r.statusCode).toBe(200)
    expect(r.json().socialLogin.google).toEqual({ enabled: true, webClientId: GOOGLE_WEB })
    expect(r.json().socialLogin.apple.enabled).toBe(true)
  })

  it('sağlayıcı kapalıyken 503 PROVIDER_DISABLED', async () => {
    const eski = process.env.GOOGLE_CLIENT_IDS
    process.env.GOOGLE_CLIENT_IDS = ''
    try {
      const r = await sosyal({ provider: 'google', idToken: await googleBelirteci({ sub: 'g-z', email: `${marker}-z@test.local` }), acceptedLegal: true })
      expect(r.statusCode).toBe(503)
      expect(r.json().error).toBe('PROVIDER_DISABLED')
    } finally {
      process.env.GOOGLE_CLIENT_IDS = eski
    }
  })
})
