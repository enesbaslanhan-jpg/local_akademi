import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

/*
 * CİHAZ KAYDI (telefon bildirimi için). POST /account/devices
 *
 * Kod BENZERSİZ: aynı telefon başka bir hesaba giriş yaparsa satır yeni
 * kullanıcıya taşınır — yoksa önceki kullanıcının bildirimleri yeni
 * kullanıcının cihazına düşerdi. Bu yüzden `upsert` `userId`yi de günceller.
 *
 * Çıkışta (`DELETE`) uygulama kodu siler; silmezse de sonraki hesap
 * girişi taşır, geçersiz kodu Apple'ın 410'u temizler.
 */
const kayitSemasi = z.object({
  platform: z.enum(['ios', 'android']),
  token: z.string().trim().regex(/^[A-Za-z0-9:_.\-]{16,300}$/),
  appVersion: z.string().trim().max(30).optional()
})

export async function cihazRoutes(fastify: FastifyInstance) {
  fastify.post('/', {
    preHandler: [(fastify as any).authenticate],
    config: { rateLimit: { max: 30, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const parsed = kayitSemasi.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Cihaz bilgisi geçersiz' })
    const kullanici = (request as any).user as { id: number }
    const { platform, token, appVersion } = parsed.data
    await prisma.deviceToken.upsert({
      where: { token },
      create: { userId: kullanici.id, platform, token, appVersion },
      update: { userId: kullanici.id, platform, appVersion, lastSeenAt: new Date() }
    })
    return reply.send({ success: true })
  })

  fastify.delete('/:token', {
    preHandler: [(fastify as any).authenticate],
    config: { rateLimit: { max: 30, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const kullanici = (request as any).user as { id: number }
    const { token } = request.params as { token: string }
    /* Yalnız KENDİ kaydını siler: başkasının kodunu bilse bile silemez. */
    await prisma.deviceToken.deleteMany({ where: { token, userId: kullanici.id } })
    return reply.send({ success: true })
  })
}
