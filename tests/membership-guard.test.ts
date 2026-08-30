import { describe, it, expect, beforeAll, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { uyelikKapisi, rotaMuafMi, UYELIK_SURESI_DOLDU } from '../src/services/membership-guard.js'
import { BILLING_STARTS_AT, TRIAL_DAYS } from '../src/config/billing.js'

/*
 * SALT OKUNUR MOD.
 *
 * Korunan sözleşme: ücretsiz süresi dolmuş kullanıcı YAZAMAZ, ama
 * okuyabilir, verisini dışa aktarabilir, hesabını yönetebilir, onay
 * verebilir ve destek isteyebilir.
 *
 * 🔴 Muafiyet listesindeki her madde ayrı ayrı sınanıyor. Biri
 * silinirse ilgili test düşer — çünkü o maddelerin her biri bir
 * kilitlenme senaryosunu önlüyor:
 *   - `/auth/refresh` engellenirse kullanıcı oturumdan atılır
 *   - `POST /auth/consents` engellenirse onay şeridi kilitler
 *   - `DELETE /auth/account` engellenirse KVKK hakkı ödemeye bağlanır
 *   - bildirim okundu engellenirse uyarı sonsuza kadar kalır
 *   - destek formu engellenirse tek çıkış kapısı kapanır
 */

const GUN = 24 * 60 * 60 * 1000
const SIR = 'uyelik-kapisi-test-gizli-anahtari-32-bayt'

/** Süresi dolmuş bir kullanıcı: ücretlendirme çoktan başlamış. */
const COKTAN_KAYITLI = new Date(Date.now() - (TRIAL_DAYS + 60) * GUN)
/** Denemesi süren kullanıcı. */
const YENI_KAYITLI = new Date()

function sahtePrisma(createdAt: Date | null) {
  return {
    user: {
      findUnique: vi.fn(async () => (createdAt ? { createdAt } : null)),
    },
  } as never
}

/**
 * Kapıyı, ücretlendirme AÇIKMIŞ gibi kurar.
 *
 * `BILLING_STARTS_AT` modül sabiti olduğu için doğrudan
 * değiştirilemiyor; bunun yerine kapının kendisi mock'lanıyor ve
 * gerçek karar mantığı (`hesaplaUyelikDurumu`) `billing-membership`
 * testlerinde ayrıca sınanıyor.
 */
async function sunucuKur(createdAt: Date | null, rol = 'learner') {
  const app = Fastify()
  await app.register(jwt, { secret: SIR })
  app.addHook('preHandler', uyelikKapisi(app, sahtePrisma(createdAt)))

  const ekle = (yol: string) => {
    app.post(yol, async () => ({ ok: true }))
    app.get(yol, async () => ({ ok: true }))
  }
  ekle('/workspaces/:id/records')
  ekle('/community/posts')
  ekle('/auth/refresh')
  ekle('/auth/consents')
  ekle('/auth/account')
  ekle('/account/notifications/read')
  ekle('/support/contact')
  ekle('/reports/generate/:fmt')
  app.post('/ozel-muaf', { config: { uyelikMuaf: true } }, async () => ({ ok: true }))

  await app.ready()
  const token = app.jwt.sign({ id: 1, email: 'a@b.c', role: rol })
  return { app, token }
}

function basliklar(token?: string) {
  return token ? { authorization: `Bearer ${token}` } : {}
}

describe('rota muafiyeti (saf mantık)', () => {
  it('hesap yönetiminin tamamı muaf', () => {
    for (const yol of ['/auth', '/auth/refresh', '/auth/consents', '/auth/account', '/auth/preferences']) {
      expect(rotaMuafMi(yol, undefined), yol).toBe(true)
    }
  })

  it('rapor ve dışa aktarım muaf', () => {
    expect(rotaMuafMi('/reports/generate/:fmt', undefined)).toBe(true)
  })

  it('bildirim okundu ve destek formu muaf', () => {
    expect(rotaMuafMi('/account/notifications/read', undefined)).toBe(true)
    expect(rotaMuafMi('/support/contact', undefined)).toBe(true)
  })

  it('🔴 asıl yazma rotaları MUAF DEĞİL', () => {
    for (const yol of [
      '/workspaces/:workspaceId/records',
      '/community/posts',
      '/mentor/conversations',
      '/documents/upload',
      '/api/v1/decision-checks/start',
    ]) {
      expect(rotaMuafMi(yol, undefined), yol).toBe(false)
    }
  })

  it('🦷 "/auth" öneki başka bir yolun BAŞINA denk gelirse muaf saymaz', () => {
    /* Naif `startsWith('/auth')` uygulaması `/authoring/posts` gibi bir
       rotayı yanlışlıkla muaf yapardı. Sınır `/auth/` ya da tam eşleşme. */
    expect(rotaMuafMi('/authoring/posts', undefined)).toBe(false)
    expect(rotaMuafMi('/reports-admin/wipe', undefined)).toBe(false)
  })

  it('rotaya özel muafiyet bayrağı çalışıyor', () => {
    expect(rotaMuafMi('/herhangi/bir/yol', { uyelikMuaf: true })).toBe(true)
    expect(rotaMuafMi('/herhangi/bir/yol', { uyelikMuaf: false })).toBe(false)
  })
})

describe('ÜRETİMDEKİ HÂL: ücretlendirme kapalı', () => {
  it('BILLING_STARTS_AT null — kapı hiçbir şey yapmıyor', async () => {
    expect(BILLING_STARTS_AT).toBeNull()

    const { app, token } = await sunucuKur(COKTAN_KAYITLI)
    const yanit = await app.inject({
      method: 'POST', url: '/workspaces/1/records', headers: basliklar(token),
    })

    /* Süresi dolmuş görünen bir kullanıcı bile engellenmiyor, çünkü
       ücretlendirme hiç başlamadı. Bugün sevk edilen davranış bu. */
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })

  it('kapalıyken veritabanına HİÇ gitmiyor', async () => {
    const prisma = sahtePrisma(COKTAN_KAYITLI)
    const app = Fastify()
    await app.register(jwt, { secret: SIR })
    app.addHook('preHandler', uyelikKapisi(app, prisma))
    app.post('/workspaces/:id/records', async () => ({ ok: true }))
    await app.ready()

    await app.inject({
      method: 'POST',
      url: '/workspaces/1/records',
      headers: basliklar(app.jwt.sign({ id: 1, email: 'a@b.c', role: 'learner' })),
    })

    /* Ana şalter kapalıyken tek karşılaştırmayla çıkılıyor; boşuna
       sorgu atılmıyor. */
    expect((prisma as unknown as { user: { findUnique: ReturnType<typeof vi.fn> } })
      .user.findUnique).not.toHaveBeenCalled()
    await app.close()
  })
})

describe('kapı davranışı (kimlik doğrulaması olmayan istekler)', () => {
  it('token yoksa kapı karışmıyor — 401 rotanın işi', async () => {
    const { app } = await sunucuKur(COKTAN_KAYITLI)
    const yanit = await app.inject({ method: 'POST', url: '/workspaces/1/records' })

    /* Kapı 401 üretseydi, kimlik doğrulaması istemeyen yazma uçları
       (destek formu gibi) kırılırdı. */
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })

  it('geçersiz token de kapıyı tetiklemiyor', async () => {
    const { app } = await sunucuKur(COKTAN_KAYITLI)
    const yanit = await app.inject({
      method: 'POST', url: '/workspaces/1/records',
      headers: { authorization: 'Bearer bozuk.token.degeri' },
    })
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })

  it('okuma yöntemleri hiç incelenmiyor', async () => {
    const { app, token } = await sunucuKur(COKTAN_KAYITLI)
    const yanit = await app.inject({
      method: 'GET', url: '/workspaces/1/records', headers: basliklar(token),
    })
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })
})

/* ------------------------------------------------------------------ *
 * ASIL DAVRANIŞ: ücretlendirme AÇIK
 * ------------------------------------------------------------------ */

/** Ücretlendirmenin çoktan başladığı bir dünya. */
const ACILIS = new Date(Date.now() - (TRIAL_DAYS + 30) * GUN).toISOString()

async function acikSunucuKur(createdAt: Date, rol = 'learner') {
  const app = Fastify()
  await app.register(jwt, { secret: SIR })
  /* Üçüncü parametre: ücretlendirme açıkmış gibi davran. */
  app.addHook('preHandler', uyelikKapisi(app, sahtePrisma(createdAt), ACILIS))

  for (const yol of [
    '/workspaces/:id/records', '/community/posts', '/mentor/conversations',
    '/auth/refresh', '/auth/consents', '/auth/account',
    '/account/notifications/read', '/support/contact', '/reports/generate/:fmt',
  ]) {
    app.post(yol, async () => ({ ok: true }))
    app.get(yol, async () => ({ ok: true }))
  }
  app.delete('/auth/account', async () => ({ ok: true }))

  await app.ready()
  return { app, token: app.jwt.sign({ id: 1, email: 'a@b.c', role: rol }) }
}

describe('🔴 SÜRESİ DOLMUŞ kullanıcı', () => {
  it('yazma rotaları 403 ve makine kodu döndürüyor', async () => {
    const { app, token } = await acikSunucuKur(COKTAN_KAYITLI)

    for (const yol of ['/workspaces/1/records', '/community/posts', '/mentor/conversations']) {
      const yanit = await app.inject({ method: 'POST', url: yol, headers: basliklar(token) })
      expect(yanit.statusCode, yol).toBe(403)
      expect(yanit.json().code, yol).toBe(UYELIK_SURESI_DOLDU)
    }
    await app.close()
  })

  it('OKUYABİLİYOR — salt okunur modun sözü bu', async () => {
    const { app, token } = await acikSunucuKur(COKTAN_KAYITLI)
    const yanit = await app.inject({
      method: 'GET', url: '/workspaces/1/records', headers: basliklar(token),
    })
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })

  it('🦷 oturumunu YENİLEYEBİLİYOR — yoksa uygulamadan atılırdı', async () => {
    const { app, token } = await acikSunucuKur(COKTAN_KAYITLI)
    const yanit = await app.inject({ method: 'POST', url: '/auth/refresh', headers: basliklar(token) })
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })

  it('🦷 ONAY VEREBİLİYOR — yoksa onay şeridi kilitlerdi', async () => {
    const { app, token } = await acikSunucuKur(COKTAN_KAYITLI)
    const yanit = await app.inject({ method: 'POST', url: '/auth/consents', headers: basliklar(token) })
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })

  it('🦷 HESABINI SİLEBİLİYOR — KVKK hakkı ödemeye bağlanamaz', async () => {
    const { app, token } = await acikSunucuKur(COKTAN_KAYITLI)
    const yanit = await app.inject({ method: 'DELETE', url: '/auth/account', headers: basliklar(token) })
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })

  it('🦷 VERİSİNİ DIŞA AKTARABİLİYOR — POST olsa bile', async () => {
    const { app, token } = await acikSunucuKur(COKTAN_KAYITLI)
    const yanit = await app.inject({ method: 'POST', url: '/reports/generate/pdf', headers: basliklar(token) })
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })

  it('🦷 uyarı bildirimini KAPATABİLİYOR', async () => {
    const { app, token } = await acikSunucuKur(COKTAN_KAYITLI)
    const yanit = await app.inject({
      method: 'POST', url: '/account/notifications/read', headers: basliklar(token),
    })
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })

  it('🦷 DESTEĞE YAZABİLİYOR — tek çıkış kapısı', async () => {
    const { app, token } = await acikSunucuKur(COKTAN_KAYITLI)
    const yanit = await app.inject({ method: 'POST', url: '/support/contact', headers: basliklar(token) })
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })
})

describe('süresi DOLMAMIŞ kullanıcı', () => {
  it('denemesi sürerken yazabiliyor', async () => {
    const { app, token } = await acikSunucuKur(YENI_KAYITLI)
    const yanit = await app.inject({
      method: 'POST', url: '/workspaces/1/records', headers: basliklar(token),
    })
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })

  it('yönetici, kendi süresi dolmuş olsa bile yazabiliyor', async () => {
    const { app, token } = await acikSunucuKur(COKTAN_KAYITLI, 'admin')
    const yanit = await app.inject({
      method: 'POST', url: '/workspaces/1/records', headers: basliklar(token),
    })
    expect(yanit.statusCode).toBe(200)
    await app.close()
  })
})

describe('yanıt sözleşmesi', () => {
  it('403 kullanılıyor, 401 DEĞİL', () => {
    /*
     * 🔴 Bu sabit bir tercih değil, ölçülmüş bir zorunluluk.
     * `frontend/src/services/api.js` 401 aldığında sessiz token
     * yenilemesi başlatıyor, başarısız olunca da oturumu SİLİYOR.
     * Süresi dolan kullanıcı 401 alsaydı uygulamadan atılırdı ve
     * ödeme yapacağı ekrana bile ulaşamazdı. 403 ise olduğu gibi
     * geçiyor.
     */
    expect(UYELIK_SURESI_DOLDU).toBe('MEMBERSHIP_EXPIRED')
  })
})
