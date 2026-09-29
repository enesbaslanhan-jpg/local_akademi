import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sendMail } from './mailer.js'
import { destekTalebiMaili } from './mail-templates.js'

/*
 * UYGULAMA İÇİ KISA GERİ BİLDİRİM (29.09.2026).
 *
 * Neden ayrı uç: `/support/contact` ad + e-posta + konu + en az 20 karakter
 * ister ve girişsiz de çalışır; giriş yapmış bir kullanıcı için bu, "iki
 * cümle yazıp geçeyim" anını öldüren bir form. Burada yalnız kategori ve
 * kısa mesaj var; kim olduğu jeton ve hesap kaydından bilinir.
 *
 * `/support/contact` ile AYNI kararlar geçerli (bkz. support.ts): mesaj
 * veritabanına yazılmaz, yalnız e-postayla iletilir; gönderim başarısızsa
 * hata döner, "iletildi" yalan söylenmez; yapılandırma yoksa 503.
 *
 * Giriş ZORUNLU (`authenticate`): burada zaten hesabı olanlar yazıyor, hız
 * sınırı tek başına kötüye kullanımı durdurmaz. `support.ts`ten AYRI bir
 * eklenti: o dosyanın testleri `authenticate` süslemesi olmadan sunucu
 * kuruyor ve preHandler'da tanımsız değer rota kaydını düşürürdü.
 */

const KATEGORI_ETIKETI = {
  oneri: 'öneri',
  sorun: 'sorun',
  begeni: 'beğeni'
} as const

const geriBildirimSemasi = z.object({
  kategori: z.enum(['oneri', 'sorun', 'begeni']),
  mesaj: z.string().trim().min(10).max(2000),
  platform: z.enum(['android', 'ios', 'web']).optional(),
  surum: z.string().trim().max(20).optional()
})

export async function geriBildirimRoutes(fastify: FastifyInstance) {
  fastify.post('/feedback', {
    preHandler: [(fastify as any).authenticate],
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const parsed = geriBildirimSemasi.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Geri bildirim eksik veya hatalı',
        details: parsed.error.flatten().fieldErrors
      })
    }

    const alici = process.env.SUPPORT_MAIL_TO?.trim()
    if (!alici) {
      request.log.error('SUPPORT_MAIL_TO tanımlı değil — geri bildirim iletilemez')
      return reply.status(503).send({ error: 'Geri bildirim şu anda alınamıyor. Lütfen daha sonra tekrar deneyin.' })
    }

    const kullanici = (request as any).user as { id: number; email: string }
    const { kategori, mesaj, platform, surum } = parsed.data
    const ortam = [platform, surum ? `sürüm ${surum}` : null].filter(Boolean).join(' · ') || 'bilinmiyor'

    try {
      await sendMail(destekTalebiMaili(
        alici,
        kullanici.email,
        kullanici.email,
        `Geri bildirim (${KATEGORI_ETIKETI[kategori]})`,
        `Ortam: ${ortam}\n\n${mesaj}`,
        `#${kullanici.id} · ${kullanici.email}`
      ))
    } catch (err) {
      request.log.error({ err }, 'geri bildirim e-postası gönderilemedi')
      return reply.status(502).send({ error: 'Geri bildiriminiz şu anda iletilemedi. Lütfen biraz sonra tekrar deneyin.' })
    }

    request.log.info({ event: 'GERI_BILDIRIM', kategori, platform }, 'geri bildirim iletildi')
    return reply.send({ success: true })
  })
}
