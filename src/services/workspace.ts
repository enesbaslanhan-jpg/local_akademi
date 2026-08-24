import { FastifyInstance } from 'fastify'
import type { PrismaClient, Prisma } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { z } from 'zod'
import crypto from 'crypto'
import { hashToken } from '../lib/tokens.js'
import { sendMail } from './mailer.js'
import { isletmeDavetiMaili } from './mail-templates.js'
import { gelenKutusuAnahtariUret, gelenKutusuAlanAdi } from './gelen-eposta.js'

const ROLE_ORDER = ['viewer', 'accountant', 'staff', 'manager', 'owner'] as const
type WorkspaceRole = typeof ROLE_ORDER[number]

const OWNER: WorkspaceRole[] = ['owner']
const MANAGER: WorkspaceRole[] = ['owner', 'manager']
const STAFF: WorkspaceRole[] = ['owner', 'manager', 'staff']
const ACCOUNTANT: WorkspaceRole[] = ['owner', 'manager', 'staff', 'accountant']
const ALL: WorkspaceRole[] = ['owner', 'manager', 'staff', 'accountant', 'viewer']

function normalizeRole(role: string): WorkspaceRole {
  if (role === 'admin') return 'manager'
  if (ROLE_ORDER.includes(role as WorkspaceRole)) return role as WorkspaceRole
  return 'staff'
}

function roleAtLeast(role: string, minRole: WorkspaceRole): boolean {
  const idx = ROLE_ORDER.indexOf(normalizeRole(role))
  const minIdx = ROLE_ORDER.indexOf(minRole)
  return idx >= minIdx
}

/* `hashToken` ortak modüle taşındı (`src/lib/tokens.ts`) — şifre sıfırlama ve
   e-posta doğrulama da aynı deseni kullanıyor, üç kopya olmasın. */

function parseJsonArray(val: string | string[]): string[] {
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) }
  catch { return [] }
}

async function recordWorkspaceActivity(
  prisma: PrismaClient | Prisma.TransactionClient,
  params: {
    workspaceId: string
    actorId?: number
    action: string
    entityType: string
    entityId?: string
    metadata?: Record<string, unknown>
  }
) {
  await (prisma as any).workspaceActivity.create({
    data: {
      workspaceId: params.workspaceId,
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: JSON.stringify(params.metadata ?? {})
    }
  })
}

async function syncWorkspaceToLegacyProfile(
  prisma: PrismaClient,
  userId: number,
  workspaceId: string
): Promise<void> {
  const ws = await prisma.businessWorkspace.findUnique({ where: { id: workspaceId } })
  if (!ws) return

  const existing = await prisma.businessProfile.findUnique({ where: { userId } })
  if (!existing) {
    await prisma.businessProfile.create({
      data: {
        userId,
        name: ws.name || '',
        sector: ws.sector || '',
        city: ws.city || '',
        currency: ws.currency || 'TRY',
        businessStage: ws.businessStage,
        employeeCount: ws.employeeCount,
        salesChannels: ws.salesChannels || '[]',
        primaryGoal: ws.primaryGoal,
        challenges: ws.challenges || '[]',
        monthlySales: ws.monthlySales,
        monthlyExpenses: ws.monthlyExpenses,
        cashBalance: ws.cashBalance,
        debtBalance: ws.debtBalance
      }
    })
  } else {
    await prisma.businessProfile.update({
      where: { userId },
      data: {
        name: ws.name || existing.name,
        sector: ws.sector || existing.sector,
        city: ws.city || existing.city,
        currency: ws.currency || existing.currency,
        businessStage: ws.businessStage ?? existing.businessStage,
        employeeCount: ws.employeeCount ?? existing.employeeCount,
        salesChannels: ws.salesChannels || existing.salesChannels,
        primaryGoal: ws.primaryGoal ?? existing.primaryGoal,
        challenges: ws.challenges || existing.challenges,
        monthlySales: ws.monthlySales ?? existing.monthlySales,
        monthlyExpenses: ws.monthlyExpenses ?? existing.monthlyExpenses,
        cashBalance: ws.cashBalance ?? existing.cashBalance,
        debtBalance: ws.debtBalance ?? existing.debtBalance
      }
    })
  }
}

async function setActiveWorkspace(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: number,
  workspaceId: string
): Promise<void> {
  await (prisma as any).userPreference.upsert({
    where: { userId },
    update: { activeWorkspaceId: workspaceId },
    create: { userId, activeWorkspaceId: workspaceId }
  })
}

async function requireMember(
  prisma: PrismaClient,
  userId: number,
  workspaceId: string
) {
  const member = await prisma.businessMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } }
  })
  return member
}

async function assertMember(
  prisma: PrismaClient,
  userId: number,
  workspaceId: string,
  reply: any
) {
  const member = await requireMember(prisma, userId, workspaceId)
  if (!member) return reply.status(403).send({ error: 'Access denied' })
  if (member.status !== 'active') return reply.status(403).send({ error: 'Membership is not active' })
  return member
}

async function assertActiveWorkspace(
  prisma: PrismaClient,
  workspaceId: string,
  reply: any
) {
  const ws = await prisma.businessWorkspace.findUnique({ where: { id: workspaceId }, select: { id: true, status: true } })
  if (!ws) return reply.status(404).send({ error: 'Workspace not found' })
  if (ws.status !== 'active') return reply.status(400).send({ error: 'Workspace is not active' })
  return ws
}

async function assertRole(
  prisma: PrismaClient,
  userId: number,
  workspaceId: string,
  allowedRoles: WorkspaceRole[],
  reply: any
) {
  const member = await assertMember(prisma, userId, workspaceId, reply)
  if (!member) return null
  if (!allowedRoles.includes(normalizeRole(member.role))) {
    return reply.status(403).send({ error: 'Insufficient permissions' })
  }
  return member
}

async function assertContactInWorkspace(
  prisma: PrismaClient,
  contactId: string,
  workspaceId: string,
  reply: any
) {
  const contact = await prisma.businessContact.findUnique({ where: { id: contactId } })
  if (!contact || contact.workspaceId !== workspaceId) return reply.status(404).send({ error: 'Contact not found' })
  return contact
}

async function assertInvitationInWorkspace(
  prisma: PrismaClient,
  invitationId: string,
  workspaceId: string,
  reply: any
) {
  const inv = await prisma.businessInvitation.findUnique({ where: { id: invitationId } })
  if (!inv || inv.workspaceId !== workspaceId) return reply.status(404).send({ error: 'Invitation not found' })
  return inv
}

/*
 * VKN (10 hane) / TCKN (11 hane).
 *
 * YALNIZ BİÇİM doğrulanıyor, kontrol hanesi (checksum) HESAPLANMIYOR.
 * Sebep: yanlış girilmiş bir numaranın buradaki tek sonucu, e-Fatura
 * yönünün belirlenememesi ve kullanıcıya sorulmasıdır -- güvenli bir
 * başarısızlık. Buna karşılık fazla katı bir doğrulama, geçerli ama
 * beklenmedik bir numarayı reddedip kullanıcıyı işletmesini
 * kaydedemez hale getirirdi.
 */
const vergiNumarasi = z.string().trim().regex(/^\d{10}$|^\d{11}$/, 'Vergi numarası 10 (VKN) ya da 11 (TCKN) haneli olmalı')

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  legalName: z.string().trim().max(200).optional(),
  taxNumber: vergiNumarasi.optional(),
  sector: z.string().trim().max(200).optional(),
  city: z.string().trim().max(200).optional(),
  currency: z.string().length(3).optional()
})

const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  legalName: z.string().trim().max(200).nullable().optional(),
  taxNumber: vergiNumarasi.nullable().optional(),
  sector: z.string().trim().max(200).optional(),
  city: z.string().trim().max(200).optional(),
  country: z.string().trim().length(2).optional(),
  currency: z.string().length(3).optional(),
  businessStage: z.string().max(50).nullable().optional(),
  employeeCount: z.number().int().nonnegative().max(1000000).nullable().optional(),
  salesChannels: z.array(z.string().max(50)).optional(),
  primaryGoal: z.string().max(50).nullable().optional(),
  challenges: z.array(z.string().max(50)).optional(),
  monthlySales: z.number().finite().nonnegative().max(1e15).optional(),
  monthlyExpenses: z.number().finite().nonnegative().max(1e15).optional(),
  cashBalance: z.number().finite().nonnegative().max(1e15).optional(),
  debtBalance: z.number().finite().nonnegative().max(1e15).optional()
})

const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'manager', 'staff', 'accountant', 'viewer'])
})

const inviteSchema = z.object({
  email: z.string().email().max(254),
  role: z.enum(['manager', 'staff', 'accountant', 'viewer']).default('staff')
})

const createContactSchema = z.object({
  type: z.enum(['customer', 'supplier', 'partner', 'other']).default('customer'),
  name: z.string().trim().min(1).max(200),
  legalName: z.string().trim().max(200).optional(),
  contactPerson: z.string().trim().max(200).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(100).optional(),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional()
})

const updateContactSchema = z.object({
  type: z.enum(['customer', 'supplier', 'partner', 'other']).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  legalName: z.string().trim().max(200).nullable().optional(),
  contactPerson: z.string().trim().max(200).nullable().optional(),
  email: z.string().email().max(254).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional()
})

const updateSettingsSchema = z.object({
  timezone: z.string().trim().max(50).optional(),
  locale: z.string().trim().max(10).optional(),
  defaultCurrency: z.string().length(3).optional(),
  weekStartsOn: z.number().int().min(0).max(6).optional(),
  notificationPrefs: z.record(z.unknown()).optional()
})

const switchWorkspaceSchema = z.object({
  workspaceId: z.string().uuid()
})

const acceptInvitationSchema = z.object({
  token: z.string().min(1).max(512)
})

export async function workspaceRoutes(fastify: FastifyInstance, opts?: { prisma?: PrismaClient }) {
  const prisma = opts?.prisma ?? sharedPrisma

  fastify.addHook('preHandler', async (request, reply) => {
    try { await fastify.authenticate(request as any, reply as any) } catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })

  fastify.post('/switch', async (request, reply) => {
    const user = request.user as { id: number }
    let validated: z.infer<typeof switchWorkspaceSchema>
    try { validated = switchWorkspaceSchema.parse(request.body) }
    catch (err) {
      if (err instanceof z.ZodError) return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const member = await prisma.businessMember.findUnique({
      where: { workspaceId_userId: { workspaceId: validated.workspaceId, userId: user.id } }
    })
    if (!member) return reply.status(403).send({ error: 'Not a member of this workspace' })
    if (member.status !== 'active') return reply.status(403).send({ error: 'Membership is not active' })

    const activeWs = await assertActiveWorkspace(prisma, validated.workspaceId, reply)
    if (!activeWs) return

    await setActiveWorkspace(prisma, user.id, validated.workspaceId)
    return { workspaceId: validated.workspaceId }
  })

  fastify.get('/', async (request, reply) => {
    const user = request.user as { id: number }

    const memberships = await prisma.businessMember.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          include: {
            _count: { select: { members: true, contacts: true } }
          }
        }
      },
      orderBy: { workspace: { createdAt: 'desc' } }
    })

    const activeId = await prisma.userPreference.findUnique({
      where: { userId: user.id },
      select: { activeWorkspaceId: true }
    })

    const storedActiveId = activeId?.activeWorkspaceId ?? null

    let effectiveActiveId: string | null = storedActiveId
    if (storedActiveId) {
      const activeWs = memberships.find(m => m.workspace.id === storedActiveId)
      if (!activeWs || activeWs.workspace.status !== 'active') {
        const firstActive = memberships.find(m => m.workspace.status === 'active')
        effectiveActiveId = firstActive?.workspace.id ?? null
      }
    }

    return {
      workspaces: memberships.map(m => ({
        id: m.workspace.id,
        name: m.workspace.name,
        legalName: m.workspace.legalName,
        sector: m.workspace.sector,
        city: m.workspace.city,
        currency: m.workspace.currency,
        status: m.workspace.status,
        role: m.role,
        memberCount: m.workspace._count.members,
        contactCount: m.workspace._count.contacts,
        createdAt: m.workspace.createdAt
      })),
      activeWorkspaceId: effectiveActiveId,
      storedActiveWorkspaceId: storedActiveId !== effectiveActiveId ? storedActiveId : undefined
    }
  })

  fastify.post('/', async (request, reply) => {
    const user = request.user as { id: number }
    let validated: z.infer<typeof createWorkspaceSchema>
    try { validated = createWorkspaceSchema.parse(request.body) }
    catch (err) {
      if (err instanceof z.ZodError) return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.businessWorkspace.create({
        data: {
          name: validated.name,
          legalName: validated.legalName ?? null,
          taxNumber: validated.taxNumber ?? null,
          sector: validated.sector ?? '',
          city: validated.city ?? '',
          currency: validated.currency ?? 'TRY',
          createdById: user.id
        }
      })

      await tx.businessMember.create({
        data: {
          workspaceId: ws.id,
          userId: user.id,
          role: 'owner',
          status: 'active'
        }
      })

      await tx.businessSetting.create({
        data: {
          workspaceId: ws.id,
          defaultCurrency: validated.currency ?? 'TRY'
        }
      })

      await tx.workspaceActivity.create({
        data: {
          workspaceId: ws.id,
          actorId: user.id,
          action: 'workspace.created',
          entityType: 'workspace',
          entityId: ws.id
        }
      })

      await tx.userPreference.upsert({
        where: { userId: user.id },
        update: { activeWorkspaceId: ws.id },
        create: { userId: user.id, activeWorkspaceId: ws.id }
      })

      return ws
    })

    return {
      id: workspace.id,
      name: workspace.name,
      legalName: workspace.legalName,
      sector: workspace.sector,
      city: workspace.city,
      currency: workspace.currency,
      createdAt: workspace.createdAt
    }
  })

  fastify.get('/:workspaceId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }

    const member = await assertMember(prisma, user.id, workspaceId, reply)
    if (!member) return

    const workspace = await prisma.businessWorkspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: { select: { members: true, contacts: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      }
    })
    if (!workspace) return reply.status(404).send({ error: 'Workspace not found' })

    return {
      id: workspace.id,
      name: workspace.name,
      legalName: workspace.legalName,
      taxNumber: workspace.taxNumber,
      sector: workspace.sector,
      city: workspace.city,
      country: workspace.country,
      currency: workspace.currency,
      businessStage: workspace.businessStage,
      employeeCount: workspace.employeeCount,
      salesChannels: parseJsonArray(workspace.salesChannels),
      primaryGoal: workspace.primaryGoal,
      challenges: parseJsonArray(workspace.challenges),
      monthlySales: workspace.monthlySales,
      monthlyExpenses: workspace.monthlyExpenses,
      cashBalance: workspace.cashBalance,
      debtBalance: workspace.debtBalance,
      status: workspace.status,
      memberCount: workspace._count.members,
      contactCount: workspace._count.contacts,
      members: workspace.members.map(m => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt
      })),
      myRole: member.role,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt
    }
  })

  /*
   * GELEN KUTUSU — açma, adresi görme, kapatma.
   *
   * Adres VARSAYILAN OLARAK YOK. Kullanıcı açıkça açmadan hiçbir
   * çalışma alanı e-posta almıyor: kullanılmayan bir kanal, açık
   * bırakılmış bir kapıdır.
   *
   * Yalnız yönetici açabiliyor -- bu adres işletmeye belge sokan bir
   * kanal, her üyenin açıp kapatabileceği bir tercih değil.
   */
  fastify.get('/:workspaceId/inbox', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await assertRole(prisma, user.id, workspaceId, MANAGER, reply)) return

    const ws = await prisma.businessWorkspace.findUnique({
      where: { id: workspaceId },
      select: { inboxKey: true }
    })
    if (!ws) return reply.status(404).send({ error: 'Workspace not found' })

    return {
      acik: Boolean(ws.inboxKey),
      adres: ws.inboxKey ? `${ws.inboxKey}@${gelenKutusuAlanAdi()}` : null,
      /* Kanal sunucuda yapılandırılmamışsa kullanıcıya adres
         göstermek yanlış olur -- posta gelse bile işlenmez. */
      kanalHazir: Boolean(process.env.INBOUND_MAIL_SECRET)
    }
  })

  fastify.post('/:workspaceId/inbox', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await assertRole(prisma, user.id, workspaceId, MANAGER, reply)) return
    if (!await assertActiveWorkspace(prisma, workspaceId, reply)) return

    /*
     * Her çağrı YENİ adres üretiyor -- yani bu aynı zamanda
     * "adresi yenile" işlevi. Adres sızdığında (iletilen bir postada,
     * ekran görüntüsünde) kullanıcının onu değiştirebilmesi gerekiyor;
     * aksi hâlde tek çare kanalı tamamen kapatmak olurdu.
     */
    /*
     * Adres işletme ADINDAN türetiliyor: kullanıcı onu muhasebe
     * programına elle yazacak ve tedarikçisine verecek. 32 karakterlik
     * rastgele dizi bu yüzden kullanılmıyordu -- ürün sahibinin
     * "çok uzun" tespiti.
     *
     * Sondaki kısa ek hem aynı adlı iki işletmenin çakışmasını hem de
     * adresin kolayca denenmesini engelliyor. Tahmin edilebilirlik
     * güvenlik katmanı SAYILMIYOR (gönderen doğrulaması asıl kapı),
     * ama gereksiz gürültüyü kesiyor.
     */
    const ws = await prisma.businessWorkspace.findUnique({
      where: { id: workspaceId },
      select: { name: true }
    })

    /*
     * `inboxKey` şemada @unique. Rastgele ek 65.536 ihtimal veriyor;
     * aynı adlı iki işletmede çakışma İHTİMALİ var, o yüzden başarıya
     * kadar deneniyor. Sessizce çakışıp 500 dönmek, kullanıcıya
     * anlamsız bir hata göstermek olurdu.
     */
    let inboxKey = ''
    for (let deneme = 0; deneme < 8; deneme++) {
      const aday = gelenKutusuAnahtariUret(ws?.name)
      const dolu = await prisma.businessWorkspace.findUnique({
        where: { inboxKey: aday }, select: { id: true }
      })
      if (!dolu) { inboxKey = aday; break }
    }
    if (!inboxKey) {
      return reply.status(503).send({ error: 'Adres üretilemedi, lütfen tekrar deneyin' })
    }

    await prisma.businessWorkspace.update({
      where: { id: workspaceId },
      data: { inboxKey }
    })
    await recordWorkspaceActivity(prisma, {
      workspaceId, actorId: user.id, action: 'inbox.enabled', entityType: 'workspace'
    })

    return { acik: true, adres: `${inboxKey}@${gelenKutusuAlanAdi()}` }
  })

  fastify.delete('/:workspaceId/inbox', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await assertRole(prisma, user.id, workspaceId, MANAGER, reply)) return

    await prisma.businessWorkspace.update({
      where: { id: workspaceId },
      data: { inboxKey: null }
    })
    await recordWorkspaceActivity(prisma, {
      workspaceId, actorId: user.id, action: 'inbox.disabled', entityType: 'workspace'
    })
    return { acik: false, adres: null }
  })

  /*
   * GÜVENİLİR GÖNDERENLER.
   *
   * Kullanıcı, kendi posta kutusundan fatura YÖNLENDİRDİĞİNDE `From`
   * başlığı gönderende kalıyor; bu liste o adresleri kabul etmeyi
   * mümkün kılıyor. DKIM şartı listeye bakılırken de ATLANMIYOR
   * (`gelen-eposta.ts`).
   *
   * Yetki `MANAGER`: kutuyu açan/kapatanla aynı seviye. Bu liste
   * işletmeye belge sokan bir kapı, sıradan bir tercih değil.
   */
  fastify.get('/:workspaceId/inbox/senders', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await assertRole(prisma, user.id, workspaceId, MANAGER, reply)) return

    /* 🔴 workspaceId ile KAPSANIYOR: yalnız `id` ile sorgulamak başka
       çalışma alanının listesini okutabilirdi (BOLA). */
    const gonderenler = await prisma.businessInboxSender.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, label: true, createdAt: true }
    })
    return { gonderenler }
  })

  fastify.post('/:workspaceId/inbox/senders', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await assertRole(prisma, user.id, workspaceId, MANAGER, reply)) return
    if (!await assertActiveWorkspace(prisma, workspaceId, reply)) return

    const govde = z.object({
      email: z.string().trim().email().max(254),
      label: z.string().trim().max(80).optional()
    }).safeParse(request.body)
    if (!govde.success) {
      return reply.status(422).send({ error: 'Geçerli bir e-posta adresi girin' })
    }

    /* E-posta adresleri büyük/küçük harfe duyarsız; hem saklama hem
       eşleştirme küçük harfte yapılıyor ki `@Trendyol.com` ile
       `@trendyol.com` iki ayrı kayıt olmasın. */
    const email = govde.data.email.toLowerCase()

    const mevcut = await prisma.businessInboxSender.findUnique({
      where: { workspaceId_email: { workspaceId, email } },
      select: { id: true }
    })
    if (mevcut) return reply.status(409).send({ error: 'Bu adres zaten listede' })

    const kayit = await prisma.businessInboxSender.create({
      data: { workspaceId, email, label: govde.data.label || null, addedById: user.id },
      select: { id: true, email: true, label: true, createdAt: true }
    })

    /* Denetim kaydı: bu liste bir güvenlik kararı, kimin ne zaman
       hangi adrese güvendiği sonradan sorulabilmeli. */
    await recordWorkspaceActivity(prisma, {
      workspaceId, actorId: user.id, action: 'inbox.sender.added',
      entityType: 'workspace', metadata: { email }
    })
    return kayit
  })

  fastify.delete('/:workspaceId/inbox/senders/:senderId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, senderId } = request.params as { workspaceId: string; senderId: string }
    if (!await assertRole(prisma, user.id, workspaceId, MANAGER, reply)) return

    /* 🔴 SİLME DE KAPSANIYOR: `where: { id }` tek başına, başka
       çalışma alanının kaydını sildirirdi. */
    const silinen = await prisma.businessInboxSender.deleteMany({
      where: { id: senderId, workspaceId }
    })
    if (silinen.count === 0) return reply.status(404).send({ error: 'Kayıt bulunamadı' })

    await recordWorkspaceActivity(prisma, {
      workspaceId, actorId: user.id, action: 'inbox.sender.removed', entityType: 'workspace'
    })
    return { silindi: true }
  })

  fastify.put('/:workspaceId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }

    const currentMember = await assertRole(prisma, user.id, workspaceId, MANAGER, reply)
    if (!currentMember) return

    const activeWs = await assertActiveWorkspace(prisma, workspaceId, reply)
    if (!activeWs) return

    let validated: z.infer<typeof updateWorkspaceSchema>
    try { validated = updateWorkspaceSchema.parse(request.body) }
    catch (err) {
      if (err instanceof z.ZodError) return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const data: Record<string, unknown> = {}
    const fieldMap: Record<string, string> = {
      name: 'name', sector: 'sector', city: 'city', country: 'country',
      currency: 'currency', businessStage: 'businessStage', employeeCount: 'employeeCount',
      primaryGoal: 'primaryGoal', monthlySales: 'monthlySales', monthlyExpenses: 'monthlyExpenses',
      cashBalance: 'cashBalance', debtBalance: 'debtBalance'
    }
    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (key in validated && validated[key as keyof typeof validated] !== undefined) {
        data[dbKey] = validated[key as keyof typeof validated]
      }
    }
    if (validated.legalName !== undefined) data.legalName = validated.legalName
    if (validated.taxNumber !== undefined) data.taxNumber = validated.taxNumber
    if (validated.salesChannels !== undefined) data.salesChannels = JSON.stringify(validated.salesChannels)
    if (validated.challenges !== undefined) data.challenges = JSON.stringify(validated.challenges)

    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.businessWorkspace.update({
        where: { id: workspaceId },
        data
      })

      await (tx as any).workspaceActivity.create({
        data: {
          workspaceId,
          actorId: user.id,
          action: 'workspace.updated',
          entityType: 'workspace',
          entityId: workspaceId,
          metadata: JSON.stringify({ updated: Object.keys(data) })
        }
      })

      return ws
    })

    await syncWorkspaceToLegacyProfile(prisma, user.id, workspaceId)

    return { id: workspace.id, name: workspace.name, updatedAt: workspace.updatedAt }
  })

  fastify.delete('/:workspaceId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }

    const currentMember = await assertRole(prisma, user.id, workspaceId, OWNER, reply)
    if (!currentMember) return

    const activeWs = await assertActiveWorkspace(prisma, workspaceId, reply)
    if (!activeWs) return

    await prisma.$transaction(async (tx) => {
      await tx.businessWorkspace.update({
        where: { id: workspaceId },
        data: { status: 'archived', archivedAt: new Date() }
      })

      await (tx as any).userPreference.updateMany({
        where: { activeWorkspaceId: workspaceId },
        data: { activeWorkspaceId: null }
      })

      await (tx as any).workspaceActivity.create({
        data: {
          workspaceId,
          actorId: user.id,
          action: 'workspace.archived',
          entityType: 'workspace',
          entityId: workspaceId
        }
      })
    })

    return { archived: true }
  })

  fastify.get('/:workspaceId/members', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }

    const member = await assertMember(prisma, user.id, workspaceId, reply)
    if (!member) return

    const members = await prisma.businessMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: 'asc' }
    })

    return members.map(m => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt
    }))
  })

  fastify.put('/:workspaceId/members/:memberId/role', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, memberId } = request.params as { workspaceId: string; memberId: string }

    const currentMember = await assertRole(prisma, user.id, workspaceId, OWNER, reply)
    if (!currentMember) return

    const activeWs = await assertActiveWorkspace(prisma, workspaceId, reply)
    if (!activeWs) return

    let validated: z.infer<typeof updateMemberRoleSchema>
    try { validated = updateMemberRoleSchema.parse(request.body) }
    catch (err) {
      if (err instanceof z.ZodError) return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const target = await prisma.businessMember.findUnique({ where: { id: memberId } })
    if (!target || target.workspaceId !== workspaceId) return reply.status(404).send({ error: 'Member not found' })
    if (normalizeRole(target.role) === 'owner') return reply.status(400).send({ error: 'Cannot change owner role' })
    if (target.userId === user.id) return reply.status(400).send({ error: 'Cannot change your own role' })

    await prisma.$transaction(async (tx) => {
      await tx.businessMember.update({
        where: { id: memberId },
        data: { role: validated.role }
      })

      await (tx as any).workspaceActivity.create({
        data: {
          workspaceId,
          actorId: user.id,
          action: 'member.role.updated',
          entityType: 'member',
          entityId: memberId,
          metadata: JSON.stringify({ from: target.role, to: validated.role })
        }
      })
    })

    return { updated: true }
  })

  fastify.delete('/:workspaceId/members/:memberId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, memberId } = request.params as { workspaceId: string; memberId: string }

    const currentMember = await assertRole(prisma, user.id, workspaceId, MANAGER, reply)
    if (!currentMember) return

    const activeWs = await assertActiveWorkspace(prisma, workspaceId, reply)
    if (!activeWs) return

    const target = await prisma.businessMember.findUnique({ where: { id: memberId } })
    if (!target || target.workspaceId !== workspaceId) return reply.status(404).send({ error: 'Member not found' })
    if (normalizeRole(target.role) === 'owner') return reply.status(400).send({ error: 'Cannot remove owner' })
    if (normalizeRole(target.role) === 'manager' && normalizeRole(currentMember.role) !== 'owner') {
      return reply.status(403).send({ error: 'Only owner can remove a manager' })
    }

    const ownerCount = await prisma.businessMember.count({
      where: { workspaceId, role: 'owner', status: 'active' }
    })
    if (normalizeRole(target.role) === 'owner' && ownerCount <= 1) {
      return reply.status(400).send({ error: 'Cannot remove the last owner' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.businessMember.delete({ where: { id: memberId } })

      await (tx as any).workspaceActivity.create({
        data: {
          workspaceId,
          actorId: user.id,
          action: 'member.removed',
          entityType: 'member',
          entityId: memberId
        }
      })
    })

    return { removed: true }
  })

  fastify.post('/:workspaceId/invitations', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }

    const currentMember = await assertRole(prisma, user.id, workspaceId, MANAGER, reply)
    if (!currentMember) return

    const activeWs = await assertActiveWorkspace(prisma, workspaceId, reply)
    if (!activeWs) return

    let validated: z.infer<typeof inviteSchema>
    try { validated = inviteSchema.parse(request.body) }
    catch (err) {
      if (err instanceof z.ZodError) return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    if (normalizeRole(currentMember.role) === 'manager' && normalizeRole(validated.role) === 'manager') {
      return reply.status(403).send({ error: 'Manager cannot invite another manager' })
    }

    const normalizedEmail = validated.email.toLowerCase().trim()

    const existingMember = await prisma.businessMember.findFirst({
      where: { workspaceId, user: { email: normalizedEmail } }
    })
    if (existingMember) return reply.status(400).send({ error: 'User is already a member' })

    const existingPending = await prisma.businessInvitation.findFirst({
      where: {
        workspaceId,
        email: normalizedEmail,
        status: 'pending',
        expiresAt: { gt: new Date() }
      }
    })
    if (existingPending) return reply.status(400).send({ error: 'A pending invitation already exists for this email' })

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(rawToken)

    const invitation = await prisma.$transaction(async (tx) => {
      const inv = await tx.businessInvitation.create({
        data: {
          workspaceId,
          email: normalizedEmail,
          role: validated.role,
          tokenHash,
          invitedById: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      })

      await (tx as any).workspaceActivity.create({
        data: {
          workspaceId,
          actorId: user.id,
          action: 'invitation.sent',
          entityType: 'invitation',
          entityId: inv.id,
          metadata: JSON.stringify({ email: normalizedEmail, role: validated.role })
        }
      })

      return inv
    })

    /*
     * Davet e-postası. Ham token YANITTA DÖNMÜYOR — yalnız bu postanın
     * içinde gidiyor.
     *
     * Önceden `token: rawToken` yanıta konuyordu ve arayüz onu ekranda
     * gösteriyordu (Team.jsx'te "geliştirme aşamasında" notuyla). Bu,
     * davetin gerçekten o adresin sahibine ulaştığına dair hiçbir garanti
     * olmaması demekti: tokeni gören herkes daveti başka bir yere
     * iletebilirdi.
     *
     * Posta gönderilemezse davet SİLİNİYOR. Aksi halde kimsenin kabul
     * edemeyeceği bekleyen bir davet kalır ve aynı e-postaya yeniden
     * davet göndermek "zaten bekleyen davet var" hatasına takılırdı.
     */
    const [ws, davetEden] = await Promise.all([
      prisma.businessWorkspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: user.id }, select: { name: true } })
    ])

    try {
      await sendMail(isletmeDavetiMaili(
        normalizedEmail,
        ws?.name || 'İşletme',
        davetEden?.name || 'Bir ekip yöneticisi',
        rawToken
      ))
    } catch (err) {
      await prisma.businessInvitation.delete({ where: { id: invitation.id } }).catch(() => {})
      request.log.error({ err, invitationId: invitation.id }, 'davet e-postasi gonderilemedi')
      return reply.status(502).send({ error: 'Davet e-postası gönderilemedi. Lütfen tekrar deneyin.' })
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt
    }
  })

  fastify.get('/:workspaceId/invitations', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }

    const currentMember = await assertRole(prisma, user.id, workspaceId, MANAGER, reply)
    if (!currentMember) return

    const invitations = await prisma.businessInvitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    })

    return invitations.map(i => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt
    }))
  })

  fastify.delete('/:workspaceId/invitations/:invitationId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, invitationId } = request.params as { workspaceId: string; invitationId: string }

    const currentMember = await assertRole(prisma, user.id, workspaceId, MANAGER, reply)
    if (!currentMember) return

    const inv = await assertInvitationInWorkspace(prisma, invitationId, workspaceId, reply)
    if (!inv) return

    await prisma.$transaction(async (tx) => {
      await tx.businessInvitation.update({
        where: { id: invitationId },
        data: { status: 'cancelled' }
      })

      await (tx as any).workspaceActivity.create({
        data: {
          workspaceId,
          actorId: user.id,
          action: 'invitation.cancelled',
          entityType: 'invitation',
          entityId: invitationId
        }
      })
    })

    return { cancelled: true }
  })

  fastify.post('/invitations/accept', async (request, reply) => {
    const user = request.user as { id: number }
    if (!user || !user.id) return reply.status(401).send({ error: 'Authentication required' })

    let validated: z.infer<typeof acceptInvitationSchema>
    try { validated = acceptInvitationSchema.parse(request.body) }
    catch (err) {
      if (err instanceof z.ZodError) return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const userRecord = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, email: true } })
    if (!userRecord) return reply.status(401).send({ error: 'User not found' })

    const tokenHash = hashToken(validated.token)
    const invitation = await prisma.businessInvitation.findFirst({
      where: { tokenHash }
    })
    if (!invitation) return reply.status(404).send({ error: 'Invalid or expired invitation' })
    if (invitation.status !== 'pending') return reply.status(400).send({ error: 'Invitation already used or cancelled' })
    if (invitation.expiresAt < new Date()) return reply.status(400).send({ error: 'Invitation expired' })

    if (invitation.email.toLowerCase().trim() !== userRecord.email.toLowerCase().trim()) {
      return reply.status(403).send({ error: 'Invitation was sent to a different email address' })
    }

    const existingMember = await prisma.businessMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id } }
    })
    if (existingMember) return reply.status(400).send({ error: 'Already a member of this workspace' })

    const ws = await prisma.businessWorkspace.findUnique({
      where: { id: invitation.workspaceId },
      select: { status: true }
    })
    if (!ws || ws.status !== 'active') return reply.status(400).send({ error: 'Workspace is not active' })

    await prisma.$transaction(async (tx) => {
      await tx.businessInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted', acceptedAt: new Date() }
      })
      await tx.businessMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
          status: 'active'
        }
      })
      await (tx as any).workspaceActivity.create({
        data: {
          workspaceId: invitation.workspaceId,
          actorId: user.id,
          action: 'invitation.accepted',
          entityType: 'invitation',
          entityId: invitation.id
        }
      })
      await (tx as any).userPreference.upsert({
        where: { userId: user.id },
        update: { activeWorkspaceId: invitation.workspaceId },
        create: { userId: user.id, activeWorkspaceId: invitation.workspaceId }
      })
    })

    return { accepted: true, workspaceId: invitation.workspaceId }
  })

  fastify.get('/:workspaceId/contacts', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }

    const member = await assertMember(prisma, user.id, workspaceId, reply)
    if (!member) return

    const contacts = await prisma.businessContact.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: { name: 'asc' }
    })

    return contacts.map(c => ({
      id: c.id,
      type: c.type,
      name: c.name,
      legalName: c.legalName,
      contactPerson: c.contactPerson,
      email: c.email,
      phone: c.phone,
      city: c.city,
      address: c.address,
      notes: c.notes,
      status: c.status,
      createdAt: c.createdAt
    }))
  })

  fastify.post('/:workspaceId/contacts', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }

    const currentMember = await assertRole(prisma, user.id, workspaceId, STAFF, reply)
    if (!currentMember) return

    const activeWs = await assertActiveWorkspace(prisma, workspaceId, reply)
    if (!activeWs) return

    let validated: z.infer<typeof createContactSchema>
    try { validated = createContactSchema.parse(request.body) }
    catch (err) {
      if (err instanceof z.ZodError) return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const contact = await prisma.$transaction(async (tx) => {
      const c = await tx.businessContact.create({
        data: {
          workspaceId,
          type: validated.type,
          name: validated.name,
          legalName: validated.legalName ?? null,
          contactPerson: validated.contactPerson ?? null,
          email: validated.email ?? null,
          phone: validated.phone ?? null,
          city: validated.city ?? null,
          address: validated.address ?? null,
          notes: validated.notes ?? null,
          createdById: user.id
        }
      })

      await (tx as any).workspaceActivity.create({
        data: {
          workspaceId,
          actorId: user.id,
          action: 'contact.created',
          entityType: 'contact',
          entityId: c.id,
          metadata: JSON.stringify({ type: validated.type, name: validated.name })
        }
      })

      return c
    })

    return { id: contact.id, name: contact.name, type: contact.type, createdAt: contact.createdAt }
  })

  fastify.put('/:workspaceId/contacts/:contactId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, contactId } = request.params as { workspaceId: string; contactId: string }

    const currentMember = await assertRole(prisma, user.id, workspaceId, STAFF, reply)
    if (!currentMember) return

    const activeWs = await assertActiveWorkspace(prisma, workspaceId, reply)
    if (!activeWs) return

    const existing = await assertContactInWorkspace(prisma, contactId, workspaceId, reply)
    if (!existing) return

    let validated: z.infer<typeof updateContactSchema>
    try { validated = updateContactSchema.parse(request.body) }
    catch (err) {
      if (err instanceof z.ZodError) return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const data: Record<string, unknown> = {}
    const contactFields = ['type', 'name', 'legalName', 'contactPerson', 'email', 'phone', 'city', 'address', 'notes']
    for (const field of contactFields) {
      if (field in validated && validated[field as keyof typeof validated] !== undefined) {
        data[field] = validated[field as keyof typeof validated]
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.businessContact.update({
        where: { id: contactId },
        data
      })

      await (tx as any).workspaceActivity.create({
        data: {
          workspaceId,
          actorId: user.id,
          action: 'contact.updated',
          entityType: 'contact',
          entityId: contactId
        }
      })
    })

    return { updated: true }
  })

  fastify.delete('/:workspaceId/contacts/:contactId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, contactId } = request.params as { workspaceId: string; contactId: string }

    const currentMember = await assertRole(prisma, user.id, workspaceId, MANAGER, reply)
    if (!currentMember) return

    const activeWs = await assertActiveWorkspace(prisma, workspaceId, reply)
    if (!activeWs) return

    const existing = await assertContactInWorkspace(prisma, contactId, workspaceId, reply)
    if (!existing) return

    await prisma.$transaction(async (tx) => {
      await tx.businessContact.update({
        where: { id: contactId },
        data: { status: 'archived', archivedAt: new Date() }
      })

      await (tx as any).workspaceActivity.create({
        data: {
          workspaceId,
          actorId: user.id,
          action: 'contact.archived',
          entityType: 'contact',
          entityId: contactId
        }
      })
    })

    return { archived: true }
  })

  fastify.get('/:workspaceId/settings', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }

    const member = await assertMember(prisma, user.id, workspaceId, reply)
    if (!member) return

    const settings = await prisma.businessSetting.findUnique({ where: { workspaceId } })
    if (!settings) {
      return {
        id: null,
        timezone: 'Europe/Istanbul',
        locale: 'tr-TR',
        defaultCurrency: 'TRY',
        weekStartsOn: 1,
        notificationPrefs: {}
      }
    }

    let notificationPrefs: Record<string, unknown> = {}
    try { notificationPrefs = JSON.parse(settings.notificationPrefs) }
    catch { notificationPrefs = {} }

    return {
      id: settings.id,
      timezone: settings.timezone,
      locale: settings.locale,
      defaultCurrency: settings.defaultCurrency,
      weekStartsOn: settings.weekStartsOn,
      notificationPrefs
    }
  })

  fastify.put('/:workspaceId/settings', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }

    const currentMember = await assertRole(prisma, user.id, workspaceId, MANAGER, reply)
    if (!currentMember) return

    const activeWs = await assertActiveWorkspace(prisma, workspaceId, reply)
    if (!activeWs) return

    let validated: z.infer<typeof updateSettingsSchema>
    try { validated = updateSettingsSchema.parse(request.body) }
    catch (err) {
      if (err instanceof z.ZodError) return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const data: Record<string, unknown> = {}
    if (validated.timezone !== undefined) data.timezone = validated.timezone
    if (validated.locale !== undefined) data.locale = validated.locale
    if (validated.defaultCurrency !== undefined) data.defaultCurrency = validated.defaultCurrency
    if (validated.weekStartsOn !== undefined) data.weekStartsOn = validated.weekStartsOn
    if (validated.notificationPrefs !== undefined) data.notificationPrefs = JSON.stringify(validated.notificationPrefs)

    await prisma.$transaction(async (tx) => {
      await tx.businessSetting.upsert({
        where: { workspaceId },
        update: data,
        create: { workspaceId, ...data }
      })

      await (tx as any).workspaceActivity.create({
        data: {
          workspaceId,
          actorId: user.id,
          action: 'settings.updated',
          entityType: 'settings',
          entityId: workspaceId,
          metadata: JSON.stringify({ updated: Object.keys(data) })
        }
      })
    })

    return { updated: true }
  })

  fastify.get('/:workspaceId/activity', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    const query = request.query as { limit?: string; offset?: string }

    const member = await assertMember(prisma, user.id, workspaceId, reply)
    if (!member) return

    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200)
    const offset = Math.max(Number(query.offset) || 0, 0)

    const [items, total] = await Promise.all([
      prisma.workspaceActivity.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.workspaceActivity.count({ where: { workspaceId } })
    ])

    return {
      items: items.map(a => ({
        id: a.id,
        actorId: a.actorId,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        metadata: (() => { try { return JSON.parse(a.metadata) } catch { return {} } })(),
        createdAt: a.createdAt
      })),
      total,
      limit,
      offset
    }
  })
}
