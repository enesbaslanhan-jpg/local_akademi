import { describe, expect, it, vi, beforeEach } from 'vitest'
import { generateKeyPairSync, verify } from 'node:crypto'
import Fastify from 'fastify'

/*
 * Telefon bildirimi (Apple APNs) — ağa ÇIKMADAN doğrulanabilen her şey:
 *  - JWT gerçekten ES256 ve doğru anahtarla doğrulanıyor mu (Apple bunu
 *    reddederse bildirim sessizce gitmez; canlıda bulmak pahalı)
 *  - yapılandırma yoksa hiçbir gönderim denenmez
 *  - geçersiz cihaz kodu satırı siler, geçici hata silmez
 *  - cihaz kaydı: yalnız kendi kaydını siler, kod başka hesaba taşınır
 */

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const P8_B64 = Buffer.from(PEM).toString('base64')

const bul = vi.fn(); const sil = vi.fn(); const upsert = vi.fn()
vi.mock('../src/lib/prisma.js', () => ({
  prisma: { deviceToken: { findMany: (...a: unknown[]) => bul(...a), deleteMany: (...a: unknown[]) => sil(...a), upsert: (...a: unknown[]) => upsert(...a) } }
}))

const apns = await import('../src/services/push/apns.js')
const { pushBildir, pushGondericiAyarla } = await import('../src/services/push/push-gonder.js')
const { cihazRoutes } = await import('../src/services/push/cihaz-routes.js')

const ORTAM = { APNS_KEY_ID: 'ABCDE12345', APNS_TEAM_ID: 'TEAM123456', APNS_KEY_P8_BASE64: P8_B64 } as NodeJS.ProcessEnv

describe('apnsAyari', () => {
  it('tam yapılandırmada ayarı döner, varsayılanlar doğru', () => {
    const a = apns.apnsAyari(ORTAM)!
    expect(a.keyId).toBe('ABCDE12345'); expect(a.bundleId).toBe('com.localkarar.app'); expect(a.host).toBe('api.push.apple.com')
  })
  it('eksik değişken, bozuk anahtar ya da APNS_ENABLED=0 → null', () => {
    expect(apns.apnsAyari({})).toBeNull()
    expect(apns.apnsAyari({ ...ORTAM, APNS_KEY_ID: '' })).toBeNull()
    expect(apns.apnsAyari({ ...ORTAM, APNS_KEY_P8_BASE64: Buffer.from('bozuk').toString('base64') })).toBeNull()
    expect(apns.apnsAyari({ ...ORTAM, APNS_ENABLED: '0' })).toBeNull()
  })
})

describe('jetonUret', () => {
  it('ES256 JWT üretir ve imza açık anahtarla DOĞRULANIR', () => {
    const ayar = apns.apnsAyari(ORTAM)!
    const jwt = apns.jetonUret(ayar, 1_790_000_000)
    const [b, g, i] = jwt.split('.')
    expect(JSON.parse(Buffer.from(b, 'base64url').toString())).toEqual({ alg: 'ES256', kid: 'ABCDE12345' })
    expect(JSON.parse(Buffer.from(g, 'base64url').toString())).toEqual({ iss: 'TEAM123456', iat: 1_790_000_000 })
    const dogru = verify('sha256', Buffer.from(`${b}.${g}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(i, 'base64url'))
    expect(dogru).toBe(true)
  })
})

describe('sonucuSiniflandir / govdeUret', () => {
  it('200 gönderildi; 410 ve BadDeviceToken geçersiz; diğerleri geçici hata', () => {
    expect(apns.sonucuSiniflandir(200, '').durum).toBe('gonderildi')
    expect(apns.sonucuSiniflandir(410, 'Unregistered').durum).toBe('gecersiz')
    expect(apns.sonucuSiniflandir(400, 'BadDeviceToken').durum).toBe('gecersiz')
    expect(apns.sonucuSiniflandir(403, 'ExpiredProviderToken').durum).toBe('hata')
    expect(apns.sonucuSiniflandir(500, '').durum).toBe('hata')
  })
  it('gövde aps.alert + url taşır, uzun metni keser', () => {
    const j = JSON.parse(apns.govdeUret({ baslik: 'B', govde: 'x'.repeat(500), url: 'https://localkarar.com/app/bildirimler' }))
    expect(j.aps.alert.title).toBe('B'); expect(j.aps.alert.body.length).toBe(200); expect(j.url).toContain('/app/bildirimler')
  })
})

describe('pushBildir', () => {
  const ESKI = { ...process.env }
  beforeEach(() => {
    bul.mockReset(); sil.mockReset(); upsert.mockReset()
    process.env = { ...ESKI, ...ORTAM } as NodeJS.ProcessEnv
  })

  it('yapılandırma yoksa veritabanına bile bakmaz, ağa çıkmaz', async () => {
    process.env = { ...ESKI } as NodeJS.ProcessEnv
    delete process.env.APNS_KEY_ID
    const g = vi.fn(); pushGondericiAyarla(g)
    await pushBildir(1, { baslik: 'a', govde: 'b' })
    expect(bul).not.toHaveBeenCalled(); expect(g).not.toHaveBeenCalled()
    pushGondericiAyarla(null)
  })

  it('kayıtlı her iOS cihazına gönderir; geçersiz kodu SİLER, geçici hatayı silmez', async () => {
    bul.mockResolvedValue([{ id: 'c1', token: 'gecersiz-kod-0123456789' }, { id: 'c2', token: 'gecici-hata-0123456789' }, { id: 'c3', token: 'saglam-kod-0123456789' }])
    const g = vi.fn(async (_a: any, kod: string) =>
      kod.startsWith('gecersiz') ? ({ durum: 'gecersiz', sebep: 'Unregistered' } as const)
        : kod.startsWith('gecici') ? ({ durum: 'hata', sebep: '503' } as const) : ({ durum: 'gonderildi' } as const))
    pushGondericiAyarla(g as any)
    await pushBildir(7, { baslik: 'a', govde: 'b' })
    expect(g).toHaveBeenCalledTimes(3)
    expect(sil).toHaveBeenCalledTimes(1)
    expect(sil).toHaveBeenCalledWith({ where: { id: 'c1' } })
    pushGondericiAyarla(null)
  })

  it('veritabanı ya da gönderici çökerse FIRLATMAZ', async () => {
    bul.mockRejectedValue(new Error('db down'))
    await expect(pushBildir(1, { baslik: 'a', govde: 'b' })).resolves.toBeUndefined()
    bul.mockResolvedValue([{ id: 'c1', token: 'kod-0123456789abcdef' }])
    pushGondericiAyarla((async () => { throw new Error('ag') }) as any)
    await expect(pushBildir(1, { baslik: 'a', govde: 'b' })).resolves.toBeUndefined()
    pushGondericiAyarla(null)
  })
})

describe('cihaz kaydı', () => {
  async function sunucu(girisli = true) {
    const app = Fastify()
    app.decorate('authenticate', async (req: any, reply: any) => { if (!girisli) return reply.status(401).send({}); req.user = { id: 5 } })
    await app.register(cihazRoutes, { prefix: '/account/devices' })
    await app.ready(); return app
  }
  beforeEach(() => { upsert.mockReset(); sil.mockReset() })

  it('kodu kullanıcıya bağlar (upsert userId günceller = başka hesaba taşınır)', async () => {
    const app = await sunucu()
    const r = await app.inject({ method: 'POST', url: '/account/devices', payload: { platform: 'ios', token: 'a'.repeat(64), appVersion: '1.0.2 (170)' } })
    expect(r.statusCode).toBe(200)
    const cagri = upsert.mock.calls[0][0]
    expect(cagri.create.userId).toBe(5); expect(cagri.update.userId).toBe(5)
    await app.close()
  })
  it('geçersiz kod/platformu 422 ile reddeder; girişsiz 401', async () => {
    const app = await sunucu()
    expect((await app.inject({ method: 'POST', url: '/account/devices', payload: { platform: 'ios', token: 'kisa' } })).statusCode).toBe(422)
    expect((await app.inject({ method: 'POST', url: '/account/devices', payload: { platform: 'symbian', token: 'a'.repeat(64) } })).statusCode).toBe(422)
    const yetkisiz = await sunucu(false)
    expect((await yetkisiz.inject({ method: 'POST', url: '/account/devices', payload: { platform: 'ios', token: 'a'.repeat(64) } })).statusCode).toBe(401)
    expect(upsert).not.toHaveBeenCalled()
    await app.close(); await yetkisiz.close()
  })
  it('silme yalnız KENDİ kaydını hedefler', async () => {
    const app = await sunucu()
    await app.inject({ method: 'DELETE', url: `/account/devices/${'b'.repeat(64)}` })
    expect(sil).toHaveBeenCalledWith({ where: { token: 'b'.repeat(64), userId: 5 } })
    await app.close()
  })
})
