import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

/*
 * Yeni kullanıcı bildirimi: işletmeciye kayıt postası.
 *
 * Asıl iddia iki tane: (1) kapatılınca ya da alıcı yoksa posta ÇIKMAZ,
 * (2) posta/veritabanı çökse bile fonksiyon FIRLATMAZ — çünkü çağıran kayıt
 * akışıdır ve kullanıcı yüzünden kayıt düşmemeli.
 */

const sendMail = vi.fn()
vi.mock('../src/services/mailer.js', () => ({
  sendMail: (...args: unknown[]) => sendMail(...args),
  uygulamaAdresi: () => 'https://localkarar.com'
}))

const sayim = vi.fn()
vi.mock('../src/lib/prisma.js', () => ({ prisma: { user: { count: (...a: unknown[]) => sayim(...a) } } }))

const { yeniKullaniciBildir, yeniKullaniciAlicisi } = await import('../src/services/yeni-kullanici-bildirimi.js')

const KULLANICI = { id: 7, email: 'yeni@ornek.com', name: 'Yeni Kişi' }
const ANAHTARLAR = ['YENI_KULLANICI_BILDIRIMI', 'YENI_KULLANICI_BILDIRIMI_ALICI', 'SUPPORT_MAIL_TO'] as const

describe('yeniKullaniciBildir', () => {
  const eski: Record<string, string | undefined> = {}
  beforeEach(() => {
    for (const k of ANAHTARLAR) { eski[k] = process.env[k]; delete process.env[k] }
    sendMail.mockReset(); sendMail.mockResolvedValue(undefined)
    sayim.mockReset(); sayim.mockResolvedValue(57)
  })
  afterEach(() => {
    for (const k of ANAHTARLAR) { if (eski[k] === undefined) delete process.env[k]; else process.env[k] = eski[k] }
  })

  it('SUPPORT_MAIL_TO varsa oraya, toplam sayıyla birlikte gönderir', async () => {
    process.env.SUPPORT_MAIL_TO = 'destek@ornek.com'
    await yeniKullaniciBildir(KULLANICI, 'apple')
    expect(sendMail).toHaveBeenCalledTimes(1)
    const m = sendMail.mock.calls[0][0] as any
    expect(m.to).toBe('destek@ornek.com')
    expect(m.subject).toContain('toplam 57')
    expect(m.subject).not.toContain('Yeni Kişi') // konu satırında kullanıcı metni yok
    expect(m.text).toContain('yeni@ornek.com')
    expect(m.text).toContain('apple')
  })

  it('özel alıcı SUPPORT_MAIL_TO’nun önüne geçer', async () => {
    process.env.SUPPORT_MAIL_TO = 'destek@ornek.com'
    process.env.YENI_KULLANICI_BILDIRIMI_ALICI = 'sahip@ornek.com'
    expect(yeniKullaniciAlicisi()).toBe('sahip@ornek.com')
  })

  it('kapatılınca ya da alıcı yoksa posta GÖNDERMEZ', async () => {
    await yeniKullaniciBildir(KULLANICI, 'e-posta')
    expect(sendMail).not.toHaveBeenCalled()
    process.env.SUPPORT_MAIL_TO = 'destek@ornek.com'
    process.env.YENI_KULLANICI_BILDIRIMI = '0'
    await yeniKullaniciBildir(KULLANICI, 'e-posta')
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('posta ya da veritabanı çökerse FIRLATMAZ (kayıt akışı bozulmaz)', async () => {
    process.env.SUPPORT_MAIL_TO = 'destek@ornek.com'
    sendMail.mockRejectedValue(new Error('resend down'))
    await expect(yeniKullaniciBildir(KULLANICI, 'google')).resolves.toBeUndefined()
    sayim.mockRejectedValue(new Error('db down'))
    await expect(yeniKullaniciBildir(KULLANICI, 'google')).resolves.toBeUndefined()
  })
})
