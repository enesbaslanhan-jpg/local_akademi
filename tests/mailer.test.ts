import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MailGonderimHatasi,
  gercekGonderimAcikMi,
  gondericiAdresi,
  mailYapilandirmasiniDogrula,
  sendMail,
  uygulamaAdresi
} from '../src/services/mailer'
import { dogrulamaKoduMaili, sifreDegistiMaili, sifreSifirlamaMaili } from '../src/services/mail-templates'

/**
 * E-posta altyapısı.
 *
 * Bu katman şifre sıfırlama ve e-posta doğrulamanın TEMELİ. Sessizce
 * çalışmaması, kullanıcının hesabına erişimini kaybetmesi demek — bu yüzden
 * testlerin ağırlığı "hata yutulmuyor mu" ve "üretimde eksik yapılandırma
 * yakalanıyor mu" üzerinde.
 */

let onceki: Record<string, string | undefined>

beforeEach(() => {
  onceki = {
    key: process.env.RESEND_API_KEY,
    from: process.env.MAIL_FROM,
    url: process.env.APP_PUBLIC_URL,
    env: process.env.NODE_ENV
  }
  delete process.env.RESEND_API_KEY
  delete process.env.MAIL_FROM
  delete process.env.APP_PUBLIC_URL
  process.env.NODE_ENV = 'test'
})

afterEach(() => {
  for (const [k, v] of Object.entries({
    RESEND_API_KEY: onceki.key,
    MAIL_FROM: onceki.from,
    APP_PUBLIC_URL: onceki.url,
    NODE_ENV: onceki.env
  })) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  vi.restoreAllMocks()
})

describe('yapılandırma', () => {
  it('anahtar yokken gerçek gönderim kapalıdır', () => {
    expect(gercekGonderimAcikMi()).toBe(false)
  })

  it('anahtar varken gerçek gönderim açıktır', () => {
    process.env.RESEND_API_KEY = 're_test'
    expect(gercekGonderimAcikMi()).toBe(true)
  })

  it('APP_PUBLIC_URL sonundaki eğik çizgiyi temizler', () => {
    process.env.APP_PUBLIC_URL = 'https://localkarar.com/'
    expect(uygulamaAdresi()).toBe('https://localkarar.com')
  })
})

describe('üretimde eksik yapılandırma açılışta yakalanır', () => {
  it('RESEND_API_KEY yoksa fırlatır', () => {
    process.env.NODE_ENV = 'production'
    expect(() => mailYapilandirmasiniDogrula()).toThrow(/RESEND_API_KEY/)
  })

  it('MAIL_FROM yoksa fırlatır', () => {
    process.env.NODE_ENV = 'production'
    process.env.RESEND_API_KEY = 're_test'
    expect(() => mailYapilandirmasiniDogrula()).toThrow(/MAIL_FROM/)
  })

  it('APP_PUBLIC_URL yoksa fırlatır', () => {
    process.env.NODE_ENV = 'production'
    process.env.RESEND_API_KEY = 're_test'
    process.env.MAIL_FROM = 'LocalKarar <no-reply@localkarar.com>'
    expect(() => mailYapilandirmasiniDogrula()).toThrow(/APP_PUBLIC_URL/)
  })

  it('hepsi tamsa sessizce geçer', () => {
    process.env.NODE_ENV = 'production'
    process.env.RESEND_API_KEY = 're_test'
    process.env.MAIL_FROM = 'LocalKarar <no-reply@localkarar.com>'
    process.env.APP_PUBLIC_URL = 'https://localkarar.com'
    expect(() => mailYapilandirmasiniDogrula()).not.toThrow()
  })

  it('üretim DIŞINDA hiçbir şey yapmaz', () => {
    expect(() => mailYapilandirmasiniDogrula()).not.toThrow()
    expect(() => gondericiAdresi()).not.toThrow()
  })
})

describe('sendMail', () => {
  it('anahtar yokken konsola yazar, ağa ÇIKMAZ', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await sendMail({ to: 'kisi@ornek.com', subject: 'Deneme', text: 'gövde' })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalled()
    expect(String(logSpy.mock.calls[0][0])).toContain('kisi@ornek.com')
  })

  it('geçersiz alıcıyı reddeder', async () => {
    await expect(sendMail({ to: 'gecersiz', subject: 'x', text: 'y' }))
      .rejects.toThrow(MailGonderimHatasi)
  })

  it('anahtar varken sağlayıcıya doğru gövdeyi gönderir', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.MAIL_FROM = 'LocalKarar <no-reply@localkarar.com>'
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"id":"1"}', { status: 200 })
    )
    await sendMail({ to: 'kisi@ornek.com', subject: 'Konu', text: 'gövde' })

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect((init.headers as any).Authorization).toBe('Bearer re_test')
    const govde = JSON.parse(String(init.body))
    expect(govde.to).toEqual(['kisi@ornek.com'])
    expect(govde.from).toBe('LocalKarar <no-reply@localkarar.com>')
    expect(govde.text).toBe('gövde')
  })

  it('sağlayıcı hatasını YUTMAZ', async () => {
    /* Sessiz başarısızlık bu katmanda en tehlikeli davranış: kullanıcıya
       "kod gönderildi" denir ama kod hiç ulaşmaz. */
    process.env.RESEND_API_KEY = 're_test'
    process.env.MAIL_FROM = 'LocalKarar <no-reply@localkarar.com>'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"message":"domain not verified"}', { status: 403 })
    )
    await expect(sendMail({ to: 'kisi@ornek.com', subject: 'x', text: 'y' }))
      .rejects.toThrow(/HTTP 403/)
  })
})

describe('şablonlar', () => {
  it('sıfırlama maili tek kullanımlık bağlantı ve süre bilgisi içerir', () => {
    process.env.APP_PUBLIC_URL = 'https://localkarar.com'
    const m = sifreSifirlamaMaili('kisi@ornek.com', 'Ayşe', 'abc123')
    expect(m.text).toContain('https://localkarar.com/reset-password?token=abc123')
    expect(m.text).toContain('1 saat')
    /* "Ben yapmadıysam ne olacak" her güvenlik e-postasında olmalı. */
    expect(m.text).toMatch(/siz yapmadıysanız/i)
  })

  it('token URL için kaçışlanır', () => {
    const m = sifreSifirlamaMaili('kisi@ornek.com', 'Ayşe', 'a+b/c=d')
    expect(m.text).toContain(encodeURIComponent('a+b/c=d'))
  })

  it('doğrulama maili kodu hem konuda hem gövdede taşır', () => {
    const m = dogrulamaKoduMaili('kisi@ornek.com', 'Ayşe', '482913')
    expect(m.subject).toContain('482913')
    expect(m.text).toContain('482913')
    expect(m.text).toContain('15 dakika')
  })

  it('şifre değişti maili oturumların kapandığını söyler', () => {
    const m = sifreDegistiMaili('kisi@ornek.com', 'Ayşe')
    expect(m.text).toMatch(/oturum/i)
    expect(m.text).toMatch(/siz yapmadıysanız/i)
  })

  it('her şablon düz metin gövde üretir', () => {
    /* HTML engellenirse e-posta işe yaramaz hale gelmesin. */
    const hepsi = [
      sifreSifirlamaMaili('a@b.com', 'X', 't'),
      dogrulamaKoduMaili('a@b.com', 'X', '123456'),
      sifreDegistiMaili('a@b.com', 'X')
    ]
    for (const m of hepsi) {
      expect(m.text.length).toBeGreaterThan(50)
      expect(m.subject).toBeTruthy()
    }
  })
})
