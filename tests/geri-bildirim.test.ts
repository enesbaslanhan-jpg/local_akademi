import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'

/*
 * Uygulama içi kısa geri bildirim (POST /support/feedback).
 *
 * `/support/contact` testiyle aynı vaat: "iletildi" yalnız posta gerçekten
 * gittiyse. Ek olarak giriş zorunlu (kimliksiz istek posta ÜRETMEZ) ve
 * gönderenin kimliği jetondan geliyor, gövdeden değil.
 */

const sendMail = vi.fn()
vi.mock('../src/services/mailer.js', () => ({
  sendMail: (...args: unknown[]) => sendMail(...args),
  uygulamaAdresi: () => 'https://localkarar.com'
}))

const { geriBildirimRoutes } = await import('../src/services/geri-bildirim.js')

async function sunucuKur(girisli: boolean) {
  const app = Fastify()
  app.decorate('authenticate', async (request: any, reply: any) => {
    if (!girisli) return reply.status(401).send({ error: 'Giriş gerekli' })
    request.user = { id: 42, email: 'kullanici@ornek.com' }
  })
  await app.register(geriBildirimRoutes, { prefix: '/support' })
  await app.ready()
  return app
}

const GECERLI = { kategori: 'oneri', mesaj: 'Hesaplamalar sayfasına favori ekleme olsa çok iyi olur.', platform: 'ios', surum: '1.0.2' }

describe('POST /support/feedback', () => {
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

  it('giriş yapmış kullanıcının geri bildirimini kimliğiyle iletir', async () => {
    const app = await sunucuKur(true)
    const yanit = await app.inject({ method: 'POST', url: '/support/feedback', payload: GECERLI })
    expect(yanit.statusCode).toBe(200)
    expect(sendMail).toHaveBeenCalledTimes(1)
    const mesaj = sendMail.mock.calls[0][0] as any
    expect(mesaj.to).toBe('destek@ornek.com')
    expect(mesaj.replyTo).toBe('kullanici@ornek.com')
    expect(mesaj.subject).toContain('Geri bildirim (öneri)')
    expect(mesaj.text).toContain('#42')
    expect(mesaj.text).toContain('ios · sürüm 1.0.2')
    expect(mesaj.text).toContain(GECERLI.mesaj)
    await app.close()
  })

  it('girişsiz isteği reddeder ve posta GÖNDERMEZ', async () => {
    const app = await sunucuKur(false)
    const yanit = await app.inject({ method: 'POST', url: '/support/feedback', payload: GECERLI })
    expect(yanit.statusCode).toBe(401)
    expect(sendMail).not.toHaveBeenCalled()
    await app.close()
  })

  it('çok kısa mesajı ve bilinmeyen kategoriyi 422 ile reddeder', async () => {
    const app = await sunucuKur(true)
    const kisa = await app.inject({ method: 'POST', url: '/support/feedback', payload: { ...GECERLI, mesaj: 'kısa' } })
    const kategori = await app.inject({ method: 'POST', url: '/support/feedback', payload: { ...GECERLI, kategori: 'saldiri' } })
    expect(kisa.statusCode).toBe(422)
    expect(kategori.statusCode).toBe(422)
    expect(sendMail).not.toHaveBeenCalled()
    await app.close()
  })

  it('SUPPORT_MAIL_TO yoksa 503, posta yok', async () => {
    delete process.env.SUPPORT_MAIL_TO
    const app = await sunucuKur(true)
    const yanit = await app.inject({ method: 'POST', url: '/support/feedback', payload: GECERLI })
    expect(yanit.statusCode).toBe(503)
    expect(sendMail).not.toHaveBeenCalled()
    await app.close()
  })

  it('posta sağlayıcısı hata verirse 502 (sessizce "iletildi" denmez)', async () => {
    sendMail.mockRejectedValue(new Error('resend down'))
    const app = await sunucuKur(true)
    const yanit = await app.inject({ method: 'POST', url: '/support/feedback', payload: GECERLI })
    expect(yanit.statusCode).toBe(502)
    await app.close()
  })
})
