import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma as sharedPrisma } from '../../lib/prisma.js'

const paramsSchema = z.object({
  installationId: z
    .string()
    .trim()
    .min(1, 'Kurulum kimligi gereklidir.')
    .max(128, 'Kurulum kimligi en fazla 128 karakter olabilir.')
})

const registerDeviceBodySchema = z
  .object({
    pushToken: z
      .string()
      .trim()
      .min(10, 'Push token en az 10 karakter olmalidir.')
      .max(4096, 'Push token en fazla 4096 karakter olabilir.'),
    platform: z.enum(['android', 'ios'], {
      errorMap: () => ({ message: 'Gecerli bir platform belirtilmelidir (android veya ios).' })
    }),
    appVersion: z
      .string()
      .trim()
      .max(64, 'Uygulama surumu en fazla 64 karakter olabilir.')
      .optional(),
    locale: z
      .string()
      .trim()
      .max(16, 'Yerel kod en fazla 16 karakter olabilir.')
      .optional()
  })
  .strict()

/**
 * Mobil Cihaz Kayit Uç Noktalari.
 *
 * GUVENLIK VE SOZLESME KURALLARI:
 * 1. Tum uclarda JWT zorunludur (`fastify.authenticate`).
 * 2. `userId` istemciden asla alinmaz; yalnizca dogrulanmis oturumdan (`request.user.id`) cozulur.
 * 3. `pushToken` yanit govdesinde dondurulmez.
 * 4. Token veya kurulum cakismalari veritabani seviyesinde guvenle yonetilir.
 */
export async function deviceRoutes(fastify: FastifyInstance) {
  fastify.put(
    '/:installationId',
    {
      preHandler: [fastify.authenticate],
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } }
    },
    async (request, reply) => {
      const paramsResult = paramsSchema.safeParse(request.params)
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Gecersiz kurulum parametresi.',
          details: paramsResult.error.flatten()
        })
      }

      const bodyResult = registerDeviceBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Gecersiz cihaz kayit bilgileri.',
          details: bodyResult.error.flatten()
        })
      }

      const { installationId } = paramsResult.data
      const { pushToken, platform, appVersion, locale } = bodyResult.data
      const userId = request.user.id

      const executeRegistration = async () => {
        return sharedPrisma.$transaction(async tx => {
          // 1. Ayni pushToken baska bir eski kurulum tarafindan tutuluyorsa, cakismayi temizle
          await tx.pushInstallation.deleteMany({
            where: {
              pushToken,
              installationId: { not: installationId }
            }
          })

          // 2. Kurulumu upsert et (veya sahibi degismisse yeni kullaniciya devret)
          const now = new Date()
          return tx.pushInstallation.upsert({
            where: { installationId },
            update: {
              userId,
              platform,
              pushToken,
              appVersion: appVersion ?? undefined,
              locale: locale ?? undefined,
              enabled: true,
              lastSeenAt: now
            },
            create: {
              installationId,
              userId,
              platform,
              pushToken,
              appVersion: appVersion ?? null,
              locale: locale ?? 'tr',
              enabled: true,
              lastSeenAt: now
            },
            select: {
              id: true,
              installationId: true,
              platform: true,
              enabled: true,
              appVersion: true,
              locale: true,
              lastSeenAt: true
            }
          })
        })
      }

      let installation
      try {
        installation = await executeRegistration()
      } catch (err: any) {
        if (err?.code === 'P2002') {
          // Eszamanli yaris (concurrent collision) durumunda cakismayi temizleyip bir kez daha dene
          installation = await executeRegistration()
        } else {
          throw err
        }
      }

      return reply.status(200).send(installation)
    }
  )

  fastify.delete(
    '/:installationId',
    {
      preHandler: [fastify.authenticate],
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } }
    },
    async (request, reply) => {
      const paramsResult = paramsSchema.safeParse(request.params)
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Gecersiz kurulum parametresi.'
        })
      }

      const { installationId } = paramsResult.data
      const userId = request.user.id

      // Yalnizca su anki oturum sahibine ait kurulumu kaldir (bilgi sizdirmadan idempotent 204)
      await sharedPrisma.pushInstallation.deleteMany({
        where: {
          installationId,
          userId
        }
      })

      return reply.status(204).send()
    }
  )
}
