import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'

/*
 * İletişim formu.
 *
 * Buradaki testlerin hepsi TEK bir vaadi koruyor: kullanıcıya "iletildi"
 * denmesi, mesajın gerçekten iletildiği anlamına gelmeli.
 *
 * Sessizce bozulabilecek üç yol var:
 *   - Yapılandırma eksik (SUPPORT_MAIL_TO yok) → 503, posta YOK
 *   - Sağlayıcı hata verdi → 502, posta YOK
 *   - Bal küpü dolu → 200 ama posta YOK (bota yakalandığı söylenmez)
 *
 * Üçünde de "posta gönderilmedi" iddiası ölçülüyor; yalnız durum kodu
 * kontrol edilse, sendMail çağrılıp yutulsa bile testler geçerdi.
 */

const sendMail = vi.fn()
vi.mock('../src/services/mailer.js', () => ({
  sendMail: (...args: unknown[]) => sendMail(...args),
  uygulamaAdresi: () => 'https://localkarar.com'
}))

const { supportRoutes } = await import('../src/services/support.js')

async function sunucuKur() {
  const app = Fastify()
  /* Uç nokta girişi zorunlu tutmuyor ama token varsa okuyor. */
  app.decorateRequest('jwtVerify', async function () { throw new Error('token yok') })
  await app.register(supportRoutes, { prefix: '/support' })
  await app.ready()
  return app
}

const GECERLI = {
  ad: 'Deneme Kullanıcı',
  eposta: 'deneme@ornek.com',
  konu: 'Giriş yapamıyorum',
  mesaj: 'Şifremi sıfırladım ama gelen postadaki bağlantı çalışmıyor, ne yapmalıyım?'
}

describe('POST /support/contact', () => {
  let onceki: string | undefined

  beforeEach(() => {
    sendMail.mockReset()
    sendMail.mockResolvedValue(undefined)
    onceki = process.env.SUPPORT_MAIL_TO
    process.env.SUPPORT_MAIL_TO = 'destek@ornek.com'
  })

  afterEach(() => {
    if (onceki === undefined) delete process.env.SUPPORT_MAIL_TO
    else process.env.SUPPORT_MAIL_TO = onceki
  })

  it('geçerli formu iletir ve yanıt adresini gönderene ayarlar', async () => {
    const app = await sunucuKur()
    const yanit = await app.inject({ method: 'POST', url: '/support/contact', payload: GECERLI })

    expect(yanit.statusCode).toBe(200)
    expect(sendMail).toHaveBeenCalledTimes(1)

    const mesaj = sendMail.mock.calls[0][0] as any
    expect(mesaj.to).toBe('destek@ornek.com')
    /* Uygulamanın gönderen adresi okunmuyor; yanıt kullanıcıya gitmeli. */
    expect(mesaj.replyTo).toBe('deneme@ornek.com')
    expect(mesaj.text).toContain(GECERLI.mesaj)
    await app.close()
  })

  it('eksik formu 422 ile reddeder ve posta GÖNDERMEZ', async () => {
    const app = await sunucuKur()
    const yanit = await app.inject({
      method: 'POST', url: '/support/contact',
      payload: { ad: 'A', eposta: 'gecersiz', konu: 'x', mesaj: 'kısa' }
    })

    expect(yanit.statusCode).toBe(422)
    expect(sendMail).not.toHaveBeenCalled()
    await app.close()
  })

  it('bal küpü doluysa sessizce başarılı sayar ama posta GÖNDERMEZ', async () => {
    const app = await sunucuKur()
    const yanit = await app.inject({
      method: 'POST', url: '/support/contact',
      payload: { ...GECERLI, website: 'http://spam.example' }
    })

    /* Bota "yakalandın" denmiyor; yoksa bir sonraki denemede bu alanı atlar. */
    expect(yanit.statusCode).toBe(200)
    expect(JSON.parse(yanit.body)).toEqual({ success: true })
    expect(sendMail).not.toHaveBeenCalled()
    await app.close()
  })

  it('SUPPORT_MAIL_TO yoksa 503 döner — "gönderildi" DEMEZ', async () => {
    delete process.env.SUPPORT_MAIL_TO
    const app = await sunucuKur()
    const yanit = await app.inject({ method: 'POST', url: '/support/contact', payload: GECERLI })

    expect(yanit.statusCode).toBe(503)
    expect(sendMail).not.toHaveBeenCalled()
    /* Kullanıcı çıkışsız kalmamalı: alternatif kanal gösteriliyor. */
    expect(JSON.parse(yanit.body).error).toContain('kvkk@localkarar.com')
    await app.close()
  })

  it('posta gönderilemezse 502 döner — hata YUTULMAZ', async () => {
    sendMail.mockRejectedValue(new Error('saglayici hatasi'))
    const app = await sunucuKur()
    const yanit = await app.inject({ method: 'POST', url: '/support/contact', payload: GECERLI })

    expect(yanit.statusCode).toBe(502)
    expect(JSON.parse(yanit.body).error).not.toContain('saglayici hatasi')
    await app.close()
  })

  it('mesajı veritabanına YAZMAZ — yalnız e-posta ile iletir', async () => {
    /* Uç nokta hiçbir prisma modeline dokunmuyor; support.ts prisma
       import etmiyor. Bu test, ileride "kayıt tutalım" diye eklenecek
       bir değişikliğin sessizce geçmemesi için duruyor: saklanan her
       kayıt bir saklama/imha yükümlülüğü doğurur. */
    const kaynak = await import('node:fs/promises')
      .then(fs => fs.readFile(new URL('../src/services/support.ts', import.meta.url), 'utf8'))

    expect(kaynak).not.toContain('prisma')
  })
})
