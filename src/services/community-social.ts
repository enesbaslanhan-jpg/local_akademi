import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { bildirimYaz } from './community-bildirim.js'

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

  /*
   * 🔴 BASKASININ PROFILI.
   *
   * Profiller ziyaret edilebilir hale gelince YENI BIR YUZEY aciliyor.
   * Engelleme bugun akista ve ozel mesajda calisiyor; burada da
   * calismazsa engellenen kisi profile girip paylasimlari okur ve
   * takip eder -- yani engelleme yine yarim kalir. Ozel mesajda tam
   * olarak bu olmustu.
   *
   * ASKIYA ALINMIS hesap (`deletedAt` dolu) 404 doner: yonetici birini
   * askiya aldiginda profili acik kalirsa yaptirim gorunurde kalir,
   * fiilen olmaz.
   *
   * BEGENILER VE KAYDETTIKLERI BURADA YOK (urun karari): "kaydettiklerim"
   * tanimi geregi kisisel, begeni de is dunyasinda rakip gozetimi
   * anlamina gelebiliyor.
   */
  fastify.get('/people/:personId/profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const personId = Number((request.params as { personId: string }).personId)
    if (!Number.isInteger(personId)) return reply.status(422).send({ error: 'Geçersiz kullanıcı.' })

    if (personId !== request.user.id && await aralarindaEngelVar(request.user.id, personId)) {
      /* 404, 403 degil: 403 "boyle biri var ama goremezsin" derdi ve
         engelleyenin varligini ele verirdi. */
      return reply.status(404).send({ error: 'Profil bulunamadı.' })
    }

    const kisi = await prisma.user.findFirst({
      where: { id: personId, deletedAt: null },
      select: {
        id: true, name: true, role: true, createdAt: true,
        bio: true, location: true, websiteUrl: true,
        avatarStoredName: true, coverStoredName: true,
      },
    })
    if (!kisi) return reply.status(404).send({ error: 'Profil bulunamadı.' })

    const [paylasim, takipci, takipEdilen, takipEdiyorMuyum] = await Promise.all([
      prisma.communityPost.count({ where: { authorId: personId, status: 'published', parentId: null } }),
      prisma.communityFollow.count({ where: { followingId: personId } }),
      prisma.communityFollow.count({ where: { followerId: personId } }),
      prisma.communityFollow.findFirst({
        where: { followerId: request.user.id, followingId: personId },
        select: { id: true },
      }),
    ])

    const gorselAdresi = (ad: string | null) => (ad ? `/auth/avatar/${ad}` : null)

    return {
      profil: {
        id: kisi.id,
        name: kisi.name,
        role: kisi.role,
        bio: kisi.bio,
        location: kisi.location,
        websiteUrl: kisi.websiteUrl,
        avatarUrl: gorselAdresi(kisi.avatarStoredName),
        coverUrl: gorselAdresi(kisi.coverStoredName),
        katilma: kisi.createdAt,
        kendisi: personId === request.user.id,
      },
      sayilar: { paylasim, takipci, takipEdilen },
      takipEdiyorum: Boolean(takipEdiyorMuyum),
    }
  })

  /*
   * Profildeki listeler. `liste` = posts | media | followers | following
   * Begeni ve kaydetme YOK -- onlar `/community/me/...` altinda ve
   * yalniz kendine gorunur.
   */
  fastify.get('/people/:personId/:liste', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { personId: ham, liste } = request.params as { personId: string; liste: string }
    const personId = Number(ham)
    if (!Number.isInteger(personId)) return reply.status(422).send({ error: 'Geçersiz kullanıcı.' })
    /* posts ve media BURADA DEGIL: gonderi serilestirme yardimcilari
       (`gonderiCikti`, `etkilesimIcerigi`) community.ts icinde ve
       oraya tasimak, ikinci bir serilestirme kopyasi yazmaktan iyi.
       Bkz. GET /community/people/:userId/posts */
    if (!['followers', 'following'].includes(liste)) {
      return reply.status(404).send({ error: 'Bilinmeyen liste.' })
    }
    if (personId !== request.user.id && await aralarindaEngelVar(request.user.id, personId)) {
      return reply.status(404).send({ error: 'Profil bulunamadı.' })
    }
    const varMi = await prisma.user.findFirst({ where: { id: personId, deletedAt: null }, select: { id: true } })
    if (!varMi) return reply.status(404).send({ error: 'Profil bulunamadı.' })

    if (liste === 'followers' || liste === 'following') {
      const kayitlar = liste === 'followers'
        ? await prisma.communityFollow.findMany({
          where: { followingId: personId }, take: 100, orderBy: { createdAt: 'desc' },
          include: { follower: { select: { id: true, name: true, avatarStoredName: true, bio: true } } },
        })
        : await prisma.communityFollow.findMany({
          where: { followerId: personId }, take: 100, orderBy: { createdAt: 'desc' },
          include: { following: { select: { id: true, name: true, avatarStoredName: true, bio: true } } },
        })
      const kisiler = kayitlar.map((k: any) => {
        const u = liste === 'followers' ? k.follower : k.following
        return { id: u.id, name: u.name, bio: u.bio, avatarUrl: u.avatarStoredName ? `/auth/avatar/${u.avatarStoredName}` : null }
      })
      return { people: kisiler }
    }

    return reply.status(404).send({ error: 'Bilinmeyen liste.' })
  })

  fastify.post('/people/:personId/follow', { preHandler: [fastify.authenticate], config: YAZMA_SINIRI }, async (request, reply) => {
    const personId = Number((request.params as { personId: string }).personId)
    if (!Number.isInteger(personId) || personId === request.user.id) return reply.status(422).send({ error: 'Geçersiz kullanıcı.' })
    const blocked = await prisma.communityBlock.findFirst({ where: { OR: [{ blockerId: request.user.id, blockedId: personId }, { blockerId: personId, blockedId: request.user.id }] } })
    if (blocked) return reply.status(409).send({ error: 'Engellenmiş kullanıcı takip edilemez.' })
    await prisma.communityFollow.upsert({ where: { followerId_followingId: { followerId: request.user.id, followingId: personId } }, create: { followerId: request.user.id, followingId: personId }, update: {} })
    await bildirimYaz(personId, request.user.id, 'follow')
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

  fastify.get('/threads', { preHandler: [fastify.authenticate] }, async request => {
    const threads = await prisma.communityThread.findMany({
      where: { members: { some: { userId: request.user.id } } },
      orderBy: { updatedAt: 'desc' },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatarStoredName: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    })

    /*
     * KENDI uyelik durumum ciktiya ekleniyor: arayuz "davet" ile
     * "katildigim sohbet"i ayirt edebilmeli. Uye listesinden
     * cikarmak istemciye ekstra is yuklerdi ve her ekranda tekrar
     * edilirdi.
     *
     * Bekleyen davette SON MESAJ GONDERILMIYOR: onizleme, kabul
     * edilmemis bir grubun icerigini sizdirirdi.
     */
    return {
      threads: threads.map(t => {
        const benim = t.members.find(m => m.userId === request.user.id)
        const bekliyor = benim?.status !== 'joined'
        return {
          ...t,
          durumum: benim?.status ?? 'joined',
          messages: bekliyor ? [] : t.messages,
          members: t.members.map(m => ({
            ...m,
            user: {
              ...m.user,
              avatarUrl: m.user.avatarStoredName ? `/auth/avatar/${m.user.avatarStoredName}` : null,
            },
          })),
        }
      }),
    }
  })

  /*
   * DAVETI KABUL ET / REDDET.
   *
   * Reddetmek uyelik satirini SILIYOR: 'declined' gibi bir durum
   * tutmak, reddedilen grubun listede asili kalmasi demek olurdu.
   * Ayni kisi tekrar davet edilebilir.
   */
  fastify.post('/threads/:threadId/invite/:karar', {
    preHandler: [fastify.authenticate],
    config: YAZMA_SINIRI,
  }, async (request, reply) => {
    const { threadId, karar } = request.params as { threadId: string; karar: string }
    if (karar !== 'accept' && karar !== 'decline') {
      return reply.status(422).send({ error: 'Geçersiz karar.' })
    }
    const uyelik = await prisma.communityThreadMember.findUnique({
      where: { threadId_userId: { threadId, userId: request.user.id } },
    })
    if (!uyelik) return reply.status(404).send({ error: 'Davet bulunamadı.' })
    if (uyelik.status === 'joined') return { durum: 'joined' }

    if (karar === 'decline') {
      await prisma.communityThreadMember.delete({
        where: { threadId_userId: { threadId, userId: request.user.id } },
      })
      return { durum: 'declined' }
    }

    await prisma.communityThreadMember.update({
      where: { threadId_userId: { threadId, userId: request.user.id } },
      data: { status: 'joined' },
    })
    return { durum: 'joined' }
  })
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
    /*
     * 🔴 GRUP DAVETI KABUL ISTER, BIREBIR SOHBET ISTEMEZ.
     *
     * Urun karari: kimse haberi olmadan bir gruba atilamaz. Birebir
     * sohbet ise dogrudan aciliyor -- her mesaj icin onay istemek,
     * mesajlasmayi kullanilmaz yapardi.
     *
     * Kuran kisi HER ZAMAN 'joined': kendi actigi sohbete davet
     * gondermek anlamsiz olurdu.
     */
    const grupMu = ids.length > 2
    const thread = await prisma.communityThread.create({
      data: {
        name: parsed.data.name,
        isGroup: grupMu,
        createdById: request.user.id,
        members: {
          create: ids.map(userId => ({
            userId,
            role: userId === request.user.id ? 'owner' : 'member',
            status: userId === request.user.id || !grupMu ? 'joined' : 'invited',
          })),
        },
      },
    })

    if (grupMu) {
      for (const userId of ids) {
        await bildirimYaz(userId, request.user.id, 'thread_invite', { threadId: thread.id })
      }
    }
    return reply.status(201).send({ thread })
  })
  fastify.get('/threads/:threadId/messages', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const threadId = (request.params as { threadId: string }).threadId
    const member = await prisma.communityThreadMember.findUnique({ where: { threadId_userId: { threadId, userId: request.user.id } } })
    if (!member) return reply.status(403).send({ error: 'Bu sohbete erişiminiz yok.' })
    /* 🔴 Uyelik satirinin VARLIGI tek basina yetmiyor: davet kabul
       edilene kadar mesajlar gorunmemeli. Yoksa "kabul" dugmesi susten
       ibaret olurdu -- davet edilen zaten her seyi okuyor olurdu. */
    if (member.status !== 'joined') {
      return reply.status(403).send({ error: 'Bu grup davetini henüz kabul etmediniz.', code: 'THREAD_INVITE_PENDING' })
    }
    return { messages: await prisma.communityMessage.findMany({ where: { threadId }, include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' }, take: 200 }) }
  })
  fastify.post('/threads/:threadId/messages', { preHandler: [fastify.authenticate], config: MESAJ_SINIRI }, async (request, reply) => {
    const threadId = (request.params as { threadId: string }).threadId
    const parsed = messageSchema.safeParse(request.body); if (!parsed.success) return reply.status(422).send({ error: 'Mesaj boş olamaz.' })
    const member = await prisma.communityThreadMember.findUnique({ where: { threadId_userId: { threadId, userId: request.user.id } } })
    if (!member) return reply.status(403).send({ error: 'Bu sohbete erişiminiz yok.' })
    if (member.status !== 'joined') {
      return reply.status(403).send({ error: 'Bu grup davetini henüz kabul etmediniz.', code: 'THREAD_INVITE_PENDING' })
    }

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
    /* Sohbetteki HERKESE, gonderen haric. `bildirimYaz` kendine
       gondermeyi zaten engelliyor ama liste yine de filtreleniyor:
       gereksiz veritabani cagrisi acmayalim. */
    for (const { userId } of digerUyeler) {
      await bildirimYaz(userId, request.user.id, 'message', { threadId })
    }
    await prisma.communityThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } })
    return reply.status(201).send({ message })
  })

  /*
   * BILDIRIMLER.
   *
   * Kimlik JETONDAN okunuyor, adresten degil: adresten alinsaydi bir
   * kullanici digerinin bildirimlerini -- yani kimin kime yazdigini --
   * gorurdu.
   */
  fastify.get('/notifications', { preHandler: [fastify.authenticate] }, async request => {
    const userId = request.user.id
    const [items, unread] = await Promise.all([
      prisma.communityNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          actor: { select: { id: true, name: true, avatarStoredName: true } },
          post: { select: { id: true, summary: true } },
        },
      }),
      prisma.communityNotification.count({ where: { userId, readAt: null } }),
    ])
    return {
      unread,
      items: items.map(n => ({
        id: n.id,
        type: n.type,
        createdAt: n.createdAt,
        readAt: n.readAt,
        postId: n.postId,
        threadId: n.threadId,
        post: n.post ? { id: n.post.id, ozet: (n.post.summary || '').slice(0, 90) } : null,
        actor: n.actor
          ? {
            id: n.actor.id,
            name: n.actor.name,
            avatarUrl: n.actor.avatarStoredName ? `/auth/avatar/${n.actor.avatarStoredName}` : null,
          }
          : null,
      })),
    }
  })

  fastify.post('/notifications/read', {
    preHandler: [fastify.authenticate],
    config: YAZMA_SINIRI,
  }, async request => {
    /* `updateMany` + `userId` sarti: tek bir bildirimin kimligini alip
       sahipligini kontrol etmeyi unutmak yerine, sorgu zaten yalniz
       kendi satirlarina dokunuyor. */
    const sonuc = await prisma.communityNotification.updateMany({
      where: { userId: request.user.id, readAt: null },
      data: { readAt: new Date() },
    })
    return { okundu: sonuc.count }
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
