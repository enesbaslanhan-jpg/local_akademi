import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const threadSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  memberIds: z.array(z.number().int().positive()).min(1).max(49),
})
const messageSchema = z.object({ body: z.string().trim().min(1).max(2000) })
const adSchema = z.object({
  title: z.string().trim().min(2).max(100), body: z.string().trim().min(2).max(500),
  ctaLabel: z.string().trim().max(40).optional(), ctaUrl: z.string().url().max(1000).optional(),
})

/*
 * ENGELLEME İKİ YÖNLÜ SORULUYOR.
 *
 * "Ben onu engelledim" ve "o beni engelledi" farklı kayıtlar ama sonucu
 * aynı olmalı: aralarında mesaj akmamalı. Tek yönü kontrol etmek,
 * engellenen kişinin engelleyene yazmasına izin verirdi — yani
 * engellemeyi işlevsiz kılardı.
 */
async function aralarindaEngelVar(birisi: number, digeri: number) {
  const engel = await prisma.communityBlock.findFirst({
    where: {
      OR: [
        { blockerId: birisi, blockedId: digeri },
        { blockerId: digeri, blockedId: birisi },
      ],
    },
    select: { id: true },
  })
  return Boolean(engel)
}

/*
 * Hız sınırları. `community.ts` içindeki her yazma yolunda vardı, bu
 * serviste hiç yoktu -- yani takip, engelleme, sohbet açma ve mesaj
 * gönderme sınırsızdı. Mesaj yolunun sınırsız olması doğrudan bir
 * taciz ve spam yüzeyi.
 */
const YAZMA_SINIRI = { rateLimit: { max: 120, timeWindow: '1 hour' } }
const MESAJ_SINIRI = { rateLimit: { max: 240, timeWindow: '1 hour' } }

export async function communitySocialRoutes(fastify: FastifyInstance) {
  fastify.get('/people', { preHandler: [fastify.authenticate] }, async request => {
    const q = String((request.query as { q?: string }).q || '').trim().slice(0, 60)
    const userId = request.user.id
    const [people, following, blocks] = await Promise.all([
      prisma.user.findMany({
        where: { id: { not: userId }, deletedAt: null, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
        select: { id: true, name: true, role: true }, take: 30, orderBy: { name: 'asc' },
      }),
      prisma.communityFollow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
      prisma.communityBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
    ])
    return { people, followingIds: following.map(x => x.followingId), blockedIds: blocks.map(x => x.blockedId) }
  })

  fastify.post('/people/:personId/follow', { preHandler: [fastify.authenticate], config: YAZMA_SINIRI }, async (request, reply) => {
    const personId = Number((request.params as { personId: string }).personId)
    if (!Number.isInteger(personId) || personId === request.user.id) return reply.status(422).send({ error: 'Geçersiz kullanıcı.' })
    const blocked = await prisma.communityBlock.findFirst({ where: { OR: [{ blockerId: request.user.id, blockedId: personId }, { blockerId: personId, blockedId: request.user.id }] } })
    if (blocked) return reply.status(409).send({ error: 'Engellenmiş kullanıcı takip edilemez.' })
    await prisma.communityFollow.upsert({ where: { followerId_followingId: { followerId: request.user.id, followingId: personId } }, create: { followerId: request.user.id, followingId: personId }, update: {} })
    return { following: true }
  })
  fastify.delete('/people/:personId/follow', { preHandler: [fastify.authenticate], config: YAZMA_SINIRI }, async request => {
    const personId = Number((request.params as { personId: string }).personId)
    await prisma.communityFollow.deleteMany({ where: { followerId: request.user.id, followingId: personId } })
    return { following: false }
  })
  fastify.post('/people/:personId/block', { preHandler: [fastify.authenticate], config: YAZMA_SINIRI }, async (request, reply) => {
    const personId = Number((request.params as { personId: string }).personId)
    if (!Number.isInteger(personId) || personId === request.user.id) return reply.status(422).send({ error: 'Geçersiz kullanıcı.' })
    await prisma.$transaction([
      prisma.communityBlock.upsert({ where: { blockerId_blockedId: { blockerId: request.user.id, blockedId: personId } }, create: { blockerId: request.user.id, blockedId: personId }, update: {} }),
      prisma.communityFollow.deleteMany({ where: { OR: [{ followerId: request.user.id, followingId: personId }, { followerId: personId, followingId: request.user.id }] } }),
    ])
    return { blocked: true }
  })
  fastify.delete('/people/:personId/block', { preHandler: [fastify.authenticate], config: YAZMA_SINIRI }, async request => {
    const personId = Number((request.params as { personId: string }).personId)
    await prisma.communityBlock.deleteMany({ where: { blockerId: request.user.id, blockedId: personId } })
    return { blocked: false }
  })

  fastify.get('/threads', { preHandler: [fastify.authenticate] }, async request => ({ threads: await prisma.communityThread.findMany({
    where: { members: { some: { userId: request.user.id } } }, orderBy: { updatedAt: 'desc' },
    include: { members: { include: { user: { select: { id: true, name: true } } } }, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
  }) }))
  fastify.post('/threads', { preHandler: [fastify.authenticate], config: YAZMA_SINIRI }, async (request, reply) => {
    const parsed = threadSchema.safeParse(request.body); if (!parsed.success) return reply.status(422).send({ error: 'Geçersiz sohbet bilgisi.' })
    const ids = [...new Set([request.user.id, ...parsed.data.memberIds.filter(id => id !== request.user.id)])]

    /*
     * 🔴 ENGELLEME BURADA UYGULANMIYORDU.
     *
     * Engelleme takipte ve akışta çalışıyordu ama özel mesajda
     * çalışmıyordu: engellediğiniz kişi size sohbet açıp yazabiliyordu.
     * Engellemenin asıl beklenen işlevi tam olarak budur; olmayınca
     * özellik kullanıcıya YANLIŞ bir güven veriyordu.
     */
    for (const digeri of ids) {
      if (digeri === request.user.id) continue
      if (await aralarindaEngelVar(request.user.id, digeri)) {
        return reply.status(403).send({ error: 'Engellenen bir kullanıcıyla sohbet başlatılamaz.' })
      }
    }
    const thread = await prisma.communityThread.create({ data: { name: parsed.data.name, isGroup: ids.length > 2, createdById: request.user.id, members: { create: ids.map(userId => ({ userId, role: userId === request.user.id ? 'owner' : 'member' })) } } })
    return reply.status(201).send({ thread })
  })
  fastify.get('/threads/:threadId/messages', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const threadId = (request.params as { threadId: string }).threadId
    const member = await prisma.communityThreadMember.findUnique({ where: { threadId_userId: { threadId, userId: request.user.id } } })
    if (!member) return reply.status(403).send({ error: 'Bu sohbete erişiminiz yok.' })
    return { messages: await prisma.communityMessage.findMany({ where: { threadId }, include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' }, take: 200 }) }
  })
  fastify.post('/threads/:threadId/messages', { preHandler: [fastify.authenticate], config: MESAJ_SINIRI }, async (request, reply) => {
    const threadId = (request.params as { threadId: string }).threadId
    const parsed = messageSchema.safeParse(request.body); if (!parsed.success) return reply.status(422).send({ error: 'Mesaj boş olamaz.' })
    const member = await prisma.communityThreadMember.findUnique({ where: { threadId_userId: { threadId, userId: request.user.id } } })
    if (!member) return reply.status(403).send({ error: 'Bu sohbete erişiminiz yok.' })

    /*
     * Engel sohbet AÇILDIKTAN SONRA da konabilir; üyelik kontrolü tek
     * başına yetmiyor. Var olan bir sohbette engellenen kişinin
     * yazmaya devam edebilmesi, engellemeyi baştan anlamsız kılardı.
     */
    const digerUyeler = await prisma.communityThreadMember.findMany({
      where: { threadId, userId: { not: request.user.id } },
      select: { userId: true },
    })
    for (const { userId } of digerUyeler) {
      if (await aralarindaEngelVar(request.user.id, userId)) {
        return reply.status(403).send({ error: 'Engel nedeniyle bu sohbete mesaj gönderilemiyor.' })
      }
    }

    const message = await prisma.communityMessage.create({ data: { threadId, senderId: request.user.id, body: parsed.data.body } })
    await prisma.communityThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } })
    return reply.status(201).send({ message })
  })

  fastify.get('/ads', { preHandler: [fastify.authenticate] }, async () => ({ ads: await prisma.communityAd.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' }, take: 3 }) }))
  fastify.post('/ads', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (request.user.role !== 'admin') return reply.status(403).send({ error: 'Yalnız yöneticiler reklam oluşturabilir.' })
    const parsed = adSchema.safeParse(request.body); if (!parsed.success) return reply.status(422).send({ error: 'Geçersiz reklam bilgisi.' })
    return reply.status(201).send({ ad: await prisma.communityAd.create({ data: { ...parsed.data, createdById: request.user.id } }) })
  })
  fastify.delete('/ads/:adId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (request.user.role !== 'admin') return reply.status(403).send({ error: 'Yalnız yöneticiler reklam kaldırabilir.' })
    await prisma.communityAd.update({ where: { id: (request.params as { adId: string }).adId }, data: { active: false } })
    return { active: false }
  })
}
