import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

let app: FastifyInstance
let userToken: string
let user2Token: string
let adminTok: string
let userId: number
let user2Id: number
let adminId: number

function post(url: string, payload: any, token?: string) {
  return app.inject({ method: 'POST', url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload })
}

function get(url: string, token?: string) {
  return app.inject({ method: 'GET', url, headers: token ? { authorization: `Bearer ${token}` } : {} })
}

function put(url: string, payload: any, token?: string) {
  return app.inject({ method: 'PUT', url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload })
}

function del(url: string, token?: string) {
  return app.inject({ method: 'DELETE', url, headers: token ? { authorization: `Bearer ${token}` } : {} })
}

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })

  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() }
    catch { reply.status(401).send({ error: 'Unauthorized' }) }
  })

  const { workspaceRoutes } = await import('../src/services/workspace')
  await app.register(workspaceRoutes, { prefix: '/workspaces', prisma })

  await app.ready()

  const now = Date.now()
  const user = await prisma.user.create({
    data: { email: `ws-user-${now}@test.com`, password: 'hashed', name: 'WS User', role: 'learner' }
  })
  userId = user.id
  userToken = app.jwt.sign({ id: userId, email: user.email, role: 'learner' })

  const user2 = await prisma.user.create({
    data: { email: `ws-user2-${now}@test.com`, password: 'hashed', name: 'WS User 2', role: 'learner' }
  })
  user2Id = user2.id
  user2Token = app.jwt.sign({ id: user2Id, email: user2.email, role: 'learner' })

  const admin = await prisma.user.create({
    data: { email: `ws-admin-${now}@test.com`, password: 'hashed', name: 'WS Admin', role: 'admin' }
  })
  adminId = admin.id
  adminTok = app.jwt.sign({ id: adminId, email: admin.email, role: 'admin' })
})

afterAll(async () => {
  await prisma.workspaceActivity.deleteMany({ where: { workspace: { createdById: { in: [userId, user2Id, adminId] } } } }).catch(() => {})
  await prisma.businessInvitation.deleteMany({ where: { workspace: { createdById: { in: [userId, user2Id, adminId] } } } }).catch(() => {})
  await prisma.businessContact.deleteMany({ where: { workspace: { createdById: { in: [userId, user2Id, adminId] } } } }).catch(() => {})
  await prisma.businessSetting.deleteMany({ where: { workspace: { createdById: { in: [userId, user2Id, adminId] } } } }).catch(() => {})
  await prisma.businessMember.deleteMany({ where: { userId: { in: [userId, user2Id, adminId] } } }).catch(() => {})
  await prisma.businessWorkspace.deleteMany({ where: { createdById: { in: [userId, user2Id, adminId] } } }).catch(() => {})
  await prisma.userPreference.deleteMany({ where: { userId: { in: [userId, user2Id, adminId] } } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: { in: [userId, user2Id, adminId] } } })
  await app.close()
})

let wsAId: string
let wsBId: string

describe('Workspace API', () => {
  describe('POST /workspaces', () => {
    it('creates a workspace and sets active', async () => {
      const res = await post('/workspaces', { name: 'WS A', sector: 'Tech', city: 'Istanbul' }, userToken)
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.id).toBeDefined()
      expect(body.name).toBe('WS A')
      wsAId = body.id
    })

    it('creates second workspace for user2', async () => {
      const res = await post('/workspaces', { name: 'WS B', sector: 'Finance' }, user2Token)
      expect(res.statusCode).toBe(200)
      wsBId = res.json().id
    })

    it('rejects unauthenticated requests', async () => {
      const res = await post('/workspaces', { name: 'Test' }, '')
      expect(res.statusCode).toBe(401)
    })

    it('rejects empty name', async () => {
      const res = await post('/workspaces', { name: '  ' }, userToken)
      expect(res.statusCode).toBe(422)
    })
  })

  describe('GET /workspaces', () => {
    it('lists workspaces for user', async () => {
      const res = await get('/workspaces', userToken)
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.workspaces.length).toBeGreaterThanOrEqual(1)
      expect(body.activeWorkspaceId).toBeDefined()
    })
  })

  describe('GET /workspaces/:id', () => {
    it('returns full workspace detail', async () => {
      const res = await get(`/workspaces/${wsAId}`, userToken)
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.name).toBe('WS A')
      expect(body.myRole).toBe('owner')
      expect(body.members).toHaveLength(1)
    })

    it('denies access to non-members', async () => {
      const res = await get(`/workspaces/${wsBId}`, userToken)
      expect(res.statusCode).toBe(403)
    })

    it('denies access to suspended members', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId } },
        data: { status: 'suspended' }
      })
      const res = await get(`/workspaces/${wsAId}`, userToken)
      expect(res.statusCode).toBe(403)
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId } },
        data: { status: 'active' }
      })
    })
  })

  describe('PUT /workspaces/:id', () => {
    it('owner can update workspace fields', async () => {
      const res = await put(`/workspaces/${wsAId}`, { name: 'WS A Updated', sector: 'Retail', city: 'Ankara' }, userToken)
      expect(res.statusCode).toBe(200)
      const detail = await get(`/workspaces/${wsAId}`, userToken)
      expect(detail.json().name).toBe('WS A Updated')
    })

    it('manager can update workspace', async () => {
      await prisma.businessMember.create({
        data: { workspaceId: wsAId, userId: user2Id, role: 'manager', status: 'active' }
      })
      const res = await put(`/workspaces/${wsAId}`, { name: 'WS A v2' }, user2Token)
      expect(res.statusCode).toBe(200)
    })

    it('staff cannot update workspace', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'staff' }
      })
      const res = await put(`/workspaces/${wsAId}`, { name: 'WS A v3' }, user2Token)
      expect(res.statusCode).toBe(403)
    })

    it('viewer cannot update workspace', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'viewer' }
      })
      const res = await put(`/workspaces/${wsAId}`, { name: 'WS A v4' }, user2Token)
      expect(res.statusCode).toBe(403)
    })

    it('accountant cannot update workspace', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'accountant' }
      })
      const res = await put(`/workspaces/${wsAId}`, { name: 'WS A v5' }, user2Token)
      expect(res.statusCode).toBe(403)
    })
  })

  describe('DELETE /workspaces/:id', () => {
    it('owner can archive workspace', async () => {
      const created = await post('/workspaces', { name: 'To Archive' }, userToken)
      const wsId = created.json().id
      const res = await del(`/workspaces/${wsId}`, userToken)
      expect(res.statusCode).toBe(200)
      expect(res.json().archived).toBe(true)
    })

    it('non-owner cannot archive', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'manager' }
      })
      const res = await del(`/workspaces/${wsAId}`, user2Token)
      expect(res.statusCode).toBe(403)
    })

    it('archived workspace rejects writes', async () => {
      await prisma.businessWorkspace.update({
        where: { id: wsAId },
        data: { status: 'archived', archivedAt: new Date() }
      })
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'manager' }
      })
      const res = await put(`/workspaces/${wsAId}`, { name: 'Should Fail' }, userToken)
      expect(res.statusCode).toBe(400)
      await prisma.businessWorkspace.update({
        where: { id: wsAId },
        data: { status: 'active', archivedAt: null }
      })
    })
  })

  describe('POST /workspaces/switch', () => {
    it('switches active workspace', async () => {
      const res = await post('/workspaces/switch', { workspaceId: wsBId }, user2Token)
      expect(res.statusCode).toBe(200)
      expect(res.json().workspaceId).toBe(wsBId)
    })

    it('rejects inactive member', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsBId, userId: user2Id } },
        data: { status: 'suspended' }
      })
      const res = await post('/workspaces/switch', { workspaceId: wsBId }, user2Token)
      expect(res.statusCode).toBe(403)
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsBId, userId: user2Id } },
        data: { status: 'active' }
      })
    })

    it('rejects archived workspace', async () => {
      await prisma.businessWorkspace.update({
        where: { id: wsBId },
        data: { status: 'archived', archivedAt: new Date() }
      })
      const res = await post('/workspaces/switch', { workspaceId: wsBId }, user2Token)
      expect(res.statusCode).toBe(400)
      await prisma.businessWorkspace.update({
        where: { id: wsBId },
        data: { status: 'active', archivedAt: null }
      })
    })
  })

  describe('Members', () => {
    it('GET /workspaces/:id/members lists members', async () => {
      const res = await get(`/workspaces/${wsAId}/members`, userToken)
      expect(res.statusCode).toBe(200)
      expect(res.json().length).toBeGreaterThanOrEqual(1)
    })

    it('owner can update member role', async () => {
      const memberId = (await prisma.businessMember.findFirst({ where: { workspaceId: wsAId, userId: user2Id } }))!.id
      const res = await put(`/workspaces/${wsAId}/members/${memberId}/role`, { role: 'manager' }, userToken)
      expect(res.statusCode).toBe(200)
    })

    it('manager cannot update roles', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'manager' }
      })
      const memberId = (await prisma.businessMember.findFirst({ where: { workspaceId: wsAId, userId: user2Id } }))!.id
      const res = await put(`/workspaces/${wsAId}/members/${memberId}/role`, { role: 'staff' }, user2Token)
      expect(res.statusCode).toBe(403)
    })

    it('cannot change own role', async () => {
      const ownerMember = await prisma.businessMember.findFirst({ where: { workspaceId: wsAId, userId } })
      const res = await put(`/workspaces/${wsAId}/members/${ownerMember!.id}/role`, { role: 'staff' }, userToken)
      expect(res.statusCode).toBe(400)
    })

    it('owner can remove regular member', async () => {
      const newUser = await prisma.user.create({
        data: { email: `ws-remove-${Date.now()}@test.com`, password: 'hashed', name: 'RemoveMe', role: 'learner' }
      })
      const mem = await prisma.businessMember.create({
        data: { workspaceId: wsAId, userId: newUser.id, role: 'staff', status: 'active' }
      })
      const res = await del(`/workspaces/${wsAId}/members/${mem.id}`, userToken)
      expect(res.statusCode).toBe(200)
      await prisma.user.delete({ where: { id: newUser.id } }).catch(() => {})
    })

    it('manager cannot remove another manager', async () => {
      const newUser = await prisma.user.create({
        data: { email: `ws-mgr-${Date.now()}@test.com`, password: 'hashed', name: 'Mgr2', role: 'learner' }
      })
      const mem = await prisma.businessMember.create({
        data: { workspaceId: wsAId, userId: newUser.id, role: 'manager', status: 'active' }
      })
      const res = await del(`/workspaces/${wsAId}/members/${mem.id}`, user2Token)
      expect(res.statusCode).toBe(403)
      await prisma.businessMember.delete({ where: { id: mem.id } }).catch(() => {})
      await prisma.user.delete({ where: { id: newUser.id } }).catch(() => {})
    })

    it('last owner cannot be removed', async () => {
      const ownerMember = await prisma.businessMember.findFirst({ where: { workspaceId: wsAId, userId } })
      const res = await del(`/workspaces/${wsAId}/members/${ownerMember!.id}`, userToken)
      expect(res.statusCode).toBe(400)
    })
  })

  describe('Contacts CRUD', () => {
    it('creates contact', async () => {
      const res = await post(`/workspaces/${wsAId}/contacts`, { type: 'customer', name: 'Acme Corp', email: 'info@acme.com' }, userToken)
      expect(res.statusCode).toBe(200)
    })

    it('lists contacts', async () => {
      const res = await get(`/workspaces/${wsAId}/contacts`, userToken)
      expect(res.statusCode).toBe(200)
      expect(res.json().length).toBeGreaterThanOrEqual(1)
    })

    it('updates contact', async () => {
      const contacts = await get(`/workspaces/${wsAId}/contacts`, userToken)
      const contactId = contacts.json()[0].id
      const res = await put(`/workspaces/${wsAId}/contacts/${contactId}`, { name: 'Acme Updated' }, userToken)
      expect(res.statusCode).toBe(200)
    })

    it('archives contact', async () => {
      const contacts = await get(`/workspaces/${wsAId}/contacts`, userToken)
      const contactId = contacts.json()[0].id
      const res = await del(`/workspaces/${wsAId}/contacts/${contactId}`, userToken)
      expect(res.statusCode).toBe(200)
      expect(res.json().archived).toBe(true)
    })

    it('staff can create contact', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'staff' }
      })
      const res = await post(`/workspaces/${wsAId}/contacts`, { name: 'Staff Contact' }, user2Token)
      expect(res.statusCode).toBe(200)
    })

    it('staff can update contact', async () => {
      const contacts = await get(`/workspaces/${wsAId}/contacts`, userToken)
      const contactId = contacts.json().find((c: any) => c.name === 'Staff Contact')?.id
      if (contactId) {
        const res = await put(`/workspaces/${wsAId}/contacts/${contactId}`, { name: 'Staff Updated' }, user2Token)
        expect(res.statusCode).toBe(200)
      }
    })

    it('staff cannot archive contact', async () => {
      const contacts = await get(`/workspaces/${wsAId}/contacts`, userToken)
      const contactId = contacts.json()[0]?.id
      if (contactId) {
        const res = await del(`/workspaces/${wsAId}/contacts/${contactId}`, user2Token)
        expect(res.statusCode).toBe(403)
      }
    })

    it('viewer cannot create contact', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'viewer' }
      })
      const res = await post(`/workspaces/${wsAId}/contacts`, { name: 'Viewer Contact' }, user2Token)
      expect(res.statusCode).toBe(403)
    })

    it('accountant can view contacts but not create', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'accountant' }
      })
      const viewRes = await get(`/workspaces/${wsAId}/contacts`, user2Token)
      expect(viewRes.statusCode).toBe(200)
      const createRes = await post(`/workspaces/${wsAId}/contacts`, { name: 'Acct Contact' }, user2Token)
      expect(createRes.statusCode).toBe(403)
    })
  })

  describe('Settings', () => {
    it('GET settings returns defaults when none exist', async () => {
      const res = await get(`/workspaces/${wsBId}`, user2Token)
      const wsId = res.json().id
      const settingsRes = await get(`/workspaces/${wsId}/settings`, user2Token)
      expect(settingsRes.statusCode).toBe(200)
      const body = settingsRes.json()
      expect(body.defaultCurrency).toBe('TRY')
    })

    it('owner can update settings', async () => {
      const res = await put(`/workspaces/${wsAId}/settings`, { defaultCurrency: 'USD' }, userToken)
      expect(res.statusCode).toBe(200)
    })

    it('manager can update settings', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'manager' }
      })
      const res = await put(`/workspaces/${wsAId}/settings`, { defaultCurrency: 'EUR' }, user2Token)
      expect(res.statusCode).toBe(200)
    })

    it('staff cannot update settings', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'staff' }
      })
      const res = await put(`/workspaces/${wsAId}/settings`, { defaultCurrency: 'GBP' }, user2Token)
      expect(res.statusCode).toBe(403)
    })

    it('accountant cannot update settings', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'accountant' }
      })
      const res = await put(`/workspaces/${wsAId}/settings`, { defaultCurrency: 'GBP' }, user2Token)
      expect(res.statusCode).toBe(403)
    })
  })

  describe('Activity', () => {
    it('records workspace activity', async () => {
      const res = await get(`/workspaces/${wsAId}/activity`, userToken)
      expect(res.statusCode).toBe(200)
      expect(res.json().items.length).toBeGreaterThanOrEqual(1)
      expect(res.json().items[0].action).toBeDefined()
    })
  })

  describe('Invitations', () => {
    it('owner creates invitation', async () => {
      const res = await post(`/workspaces/${wsAId}/invitations`, { email: 'invitee@example.com', role: 'staff' }, userToken)
      expect(res.statusCode).toBe(200)
      expect(res.json().id).toBeDefined()
    })

    /*
     * Ham token YANITTA DONMEMELI.
     *
     * Onceden donuyordu ve arayuz onu ekranda gosteriyordu; daveti
     * olusturan kisi tokeni kopyalayip elle iletiyordu. Bu, davetin
     * gercekten o e-posta adresinin sahibine gittigine dair hicbir
     * garanti olmamasi demekti. Token artik yalniz e-postayla gidiyor.
     */
    it('🔴 davet yaniti ham token SIZDIRMAZ', async () => {
      const res = await post(`/workspaces/${wsAId}/invitations`, { email: 'sizinti@example.com', role: 'staff' }, userToken)
      expect(res.statusCode).toBe(200)
      const govde = res.json()
      expect(govde.token).toBeUndefined()
      /* Alan adi degisse bile 64 hanelik hex bir degerin yanitta
         bulunmadigi kontrol ediliyor. */
      expect(JSON.stringify(govde)).not.toMatch(/[0-9a-f]{64}/)
    })

    it('manager can invite staff/accountant/viewer', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'manager' }
      })
      const res = await post(`/workspaces/${wsAId}/invitations`, { email: 'staff2@example.com', role: 'staff' }, user2Token)
      expect(res.statusCode).toBe(200)
    })

    it('manager cannot invite another manager', async () => {
      const res = await post(`/workspaces/${wsAId}/invitations`, { email: 'newmgr@example.com', role: 'manager' }, user2Token)
      expect(res.statusCode).toBe(403)
    })

    it('staff cannot invite', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'staff' }
      })
      const res = await post(`/workspaces/${wsAId}/invitations`, { email: 'nobody@example.com', role: 'staff' }, user2Token)
      expect(res.statusCode).toBe(403)
    })

    it('rejects duplicate pending invitation', async () => {
      await prisma.businessMember.update({
        where: { workspaceId_userId: { workspaceId: wsAId, userId: user2Id } },
        data: { role: 'owner' }
      })
      await post(`/workspaces/${wsAId}/invitations`, { email: 'dup@example.com', role: 'staff' }, userToken)
      const res = await post(`/workspaces/${wsAId}/invitations`, { email: 'dup@example.com', role: 'staff' }, userToken)
      expect(res.statusCode).toBe(400)
    })

    it('lists invitations', async () => {
      const res = await get(`/workspaces/${wsAId}/invitations`, userToken)
      expect(res.statusCode).toBe(200)
      expect(res.json().length).toBeGreaterThanOrEqual(1)
    })

    it('owner can cancel invitation', async () => {
      const invs = await get(`/workspaces/${wsAId}/invitations`, userToken)
      const invId = invs.json()[0]?.id
      if (invId) {
        const res = await del(`/workspaces/${wsAId}/invitations/${invId}`, userToken)
        expect(res.statusCode).toBe(200)
        expect(res.json().cancelled).toBe(true)
      }
    })
  })

  describe('Tenant Isolation (IDOR)', () => {
    let wsA_contactId: string
    let wsB_contactId: string
    let wsB_invitationId: string
    let wsB_memberId: string

    beforeAll(async () => {
      const c1 = await post(`/workspaces/${wsAId}/contacts`, { name: 'WS A Contact' }, userToken)
      wsA_contactId = c1.json().id
      const c2 = await post(`/workspaces/${wsBId}/contacts`, { name: 'WS B Contact' }, user2Token)
      wsB_contactId = c2.json().id
      const inv = await post(`/workspaces/${wsBId}/invitations`, { email: 'testidor@example.com', role: 'staff' }, user2Token)
      wsB_invitationId = inv.json().id
      const members = await get(`/workspaces/${wsBId}/members`, user2Token)
      wsB_memberId = members.json()[0].id
    })

    it('WS A user cannot update WS B contact', async () => {
      const res = await put(`/workspaces/${wsBId}/contacts/${wsB_contactId}`, { name: 'Hacked' }, userToken)
      expect(res.statusCode).toBe(403)
      const contact = await prisma.businessContact.findUnique({ where: { id: wsB_contactId } })
      expect(contact!.name).toBe('WS B Contact')
    })

    it('WS A user cannot delete WS B contact', async () => {
      const res = await del(`/workspaces/${wsBId}/contacts/${wsB_contactId}`, userToken)
      expect(res.statusCode).toBe(403)
    })

    it('WS A user cannot cancel WS B invitation', async () => {
      const res = await del(`/workspaces/${wsBId}/invitations/${wsB_invitationId}`, userToken)
      expect(res.statusCode).toBe(403)
    })

    it('WS A user cannot change WS B member role', async () => {
      const res = await put(`/workspaces/${wsBId}/members/${wsB_memberId}/role`, { role: 'staff' }, userToken)
      expect(res.statusCode).toBe(403)
    })

    it('WS A user cannot remove WS B member', async () => {
      const res = await del(`/workspaces/${wsBId}/members/${wsB_memberId}`, userToken)
      expect(res.statusCode).toBe(403)
    })

    it('global admin cannot bypass workspace isolation', async () => {
      const res = await get(`/workspaces/${wsBId}`, adminTok)
      expect(res.statusCode).toBe(403)
    })
  })

  describe('Invitation Security', () => {
    let rawToken: string
    let invitationId: string

    /*
     * Davet DOGRUDAN veritabaninda aciliyor: uc nokta artik ham tokeni
     * dondurmuyor (bilerek). Kabul akisini sinamak icin ham degere
     * ihtiyac var, o yuzden token burada uretilip ozeti yaziliyor —
     * sunucunun yaptiginin aynisi.
     */
    beforeAll(async () => {
      rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
      const inv = await prisma.businessInvitation.create({
        data: {
          workspaceId: wsAId,
          email: 'security-test@example.com',
          role: 'staff',
          tokenHash,
          invitedById: userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      })
      invitationId = inv.id
    })

    it('unauthenticated accept returns 401', async () => {
      const res = await post('/workspaces/invitations/accept', { token: rawToken }, '')
      expect(res.statusCode).toBe(401)
    })

    it('wrong email cannot accept', async () => {
      const wrongUser = await prisma.user.create({
        data: { email: `wrong-${Date.now()}@test.com`, password: 'hashed', name: 'Wrong', role: 'learner' }
      })
      const wrongToken = app.jwt.sign({ id: wrongUser.id, email: wrongUser.email, role: 'learner' })
      const res = await post('/workspaces/invitations/accept', { token: rawToken }, wrongToken)
      expect(res.statusCode).toBe(403)
      await prisma.user.delete({ where: { id: wrongUser.id } }).catch(() => {})
    })

    it('correct email can accept', async () => {
      const invitee = await prisma.user.create({
        data: { email: 'security-test@example.com', password: 'hashed', name: 'Security', role: 'learner' }
      })
      const inviteeToken = app.jwt.sign({ id: invitee.id, email: invitee.email, role: 'learner' })
      const res = await post('/workspaces/invitations/accept', { token: rawToken }, inviteeToken)
      expect(res.statusCode).toBe(200)
      expect(res.json().accepted).toBe(true)
      await prisma.user.delete({ where: { id: invitee.id } }).catch(() => {})
    })

    it('token cannot be reused', async () => {
      const invitee = await prisma.user.create({
        data: { email: `reuse-${Date.now()}@example.com`, password: 'hashed', name: 'Reuse', role: 'learner' }
      })
      const inviteeToken = app.jwt.sign({ id: invitee.id, email: invitee.email, role: 'learner' })
      const res = await post('/workspaces/invitations/accept', { token: rawToken }, inviteeToken)
      expect(res.statusCode).toBe(400)
      await prisma.user.delete({ where: { id: invitee.id } }).catch(() => {})
    })

    it('raw token is not stored in database', async () => {
      const inv = await prisma.businessInvitation.findUnique({ where: { id: invitationId } })
      expect(inv!.tokenHash).not.toBe(rawToken)
      expect(inv!.tokenHash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('expired token is rejected', async () => {
      const expSuffix = Date.now()
      const rawExpired = crypto.randomBytes(16).toString('hex')
      const hashedExpired = crypto.createHash('sha256').update(rawExpired).digest('hex')
      const oldInv = await prisma.businessInvitation.create({
        data: {
          workspaceId: wsAId, email: `expired-${expSuffix}@test.com`, role: 'staff',
          tokenHash: hashedExpired, invitedById: userId,
          expiresAt: new Date(Date.now() - 100000), status: 'pending'
        }
      })
      const invitee = await prisma.user.create({
        data: { email: `expired-${expSuffix}@test.com`, password: 'hashed', name: 'Expired', role: 'learner' }
      })
      const inviteeToken = app.jwt.sign({ id: invitee.id, email: invitee.email, role: 'learner' })
      const res = await post('/workspaces/invitations/accept', { token: rawExpired }, inviteeToken)
      expect(res.statusCode).toBe(400)
      await prisma.businessInvitation.delete({ where: { id: oldInv.id } }).catch(() => {})
      await prisma.user.delete({ where: { id: invitee.id } }).catch(() => {})
    })

    it('revoked token is rejected', async () => {
      const revSuffix = Date.now() + 1
      const rawRevoked = crypto.randomBytes(16).toString('hex')
      const hashedRevoked = crypto.createHash('sha256').update(rawRevoked).digest('hex')
      const revInv = await prisma.businessInvitation.create({
        data: {
          workspaceId: wsAId, email: `revoked-${revSuffix}@test.com`, role: 'staff',
          tokenHash: hashedRevoked, invitedById: userId,
          expiresAt: new Date(Date.now() + 100000), status: 'cancelled'
        }
      })
      const invitee = await prisma.user.create({
        data: { email: `revoked-${revSuffix}@test.com`, password: 'hashed', name: 'Revoked', role: 'learner' }
      })
      const inviteeToken = app.jwt.sign({ id: invitee.id, email: invitee.email, role: 'learner' })
      const res = await post('/workspaces/invitations/accept', { token: rawRevoked }, inviteeToken)
      expect(res.statusCode).toBe(400)
      await prisma.businessInvitation.delete({ where: { id: revInv.id } }).catch(() => {})
      await prisma.user.delete({ where: { id: invitee.id } }).catch(() => {})
    })
  })

  describe('Regression: No Redirect / No DML in GET', () => {
    it('archived activeWorkspaceId returns JSON 200, not redirect', async () => {
      const ws = await post('/workspaces', { name: 'Redirect Test' }, userToken)
      const wsId = ws.json().id

      await prisma.businessWorkspace.update({
        where: { id: wsId },
        data: { status: 'archived', archivedAt: new Date() }
      })

      const res = await get('/workspaces', userToken)
      expect(res.statusCode).toBe(200)
      expect(res.json().workspaces).toBeDefined()
      expect(typeof res.json().activeWorkspaceId).toBe('string')
    })

    it('GET /workspaces does not perform any DML', async () => {
      const ws = await post('/workspaces', { name: 'No DML' }, userToken)
      const wsId = ws.json().id

      await prisma.businessWorkspace.update({
        where: { id: wsId },
        data: { status: 'archived', archivedAt: new Date() }
      })

      const prefBefore = await prisma.userPreference.findUnique({ where: { userId } })

      await get('/workspaces', userToken)

      const prefAfter = await prisma.userPreference.findUnique({ where: { userId } })
      expect(prefAfter?.activeWorkspaceId).toBe(prefBefore?.activeWorkspaceId)
    })

    it('archive cleans up UserPreference references', async () => {
      const ws = await post('/workspaces', { name: 'Pref Cleanup' }, userToken)
      const wsId = ws.json().id

      await prisma.userPreference.update({
        where: { userId },
        data: { activeWorkspaceId: wsId }
      })

      const delRes = await del(`/workspaces/${wsId}`, userToken)
      expect(delRes.statusCode).toBe(200)

      const pref = await prisma.userPreference.findUnique({ where: { userId } })
      expect(pref?.activeWorkspaceId).not.toBe(wsId)
    })

    it('effectiveActiveWorkspaceId falls back to first active workspace', async () => {
      const ws1 = await post('/workspaces', { name: 'Fallback A' }, userToken)
      const ws2 = await post('/workspaces', { name: 'Fallback B' }, userToken)
      const ws1Id = ws1.json().id
      const ws2Id = ws2.json().id

      await prisma.userPreference.update({
        where: { userId },
        data: { activeWorkspaceId: ws1Id }
      })

      await prisma.businessWorkspace.update({
        where: { id: ws1Id },
        data: { status: 'archived', archivedAt: new Date() }
      })

      const res = await get('/workspaces', userToken)
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.activeWorkspaceId).toBe(ws2Id)
    })
  })
})
