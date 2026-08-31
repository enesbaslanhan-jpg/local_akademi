import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { pushService, FakePushTransport } from '../src/services/push/index.js'
import { bildirimYaz as communityBildirimYaz } from '../src/services/community-bildirim.js'
import { bildirimYaz as accountBildirimYaz } from '../src/services/account-notifications.js'
import { processDueBusinessReminders } from '../src/services/business-reminder-worker.js'

const prisma = new PrismaClient()
const marker = `push-evt-${Date.now()}`
let userRecipient: { id: number; email: string }
let userActor: { id: number; email: string }
let testThreadId: string
let testPostId: string
let workspaceId: string
let fakeTransport: FakePushTransport

beforeAll(async () => {
  fakeTransport = new FakePushTransport()
  pushService.setTransport(fakeTransport)

  const uR = await prisma.user.create({
    data: {
      email: `${marker}-rec@test.local`,
      password: 'HashedPassword!123',
      name: 'Recipient User',
      role: 'learner'
    }
  })
  userRecipient = { id: uR.id, email: uR.email }

  const uA = await prisma.user.create({
    data: {
      email: `${marker}-act@test.local`,
      password: 'HashedPassword!123',
      name: 'Actor User',
      role: 'learner'
    }
  })
  userActor = { id: uA.id, email: uA.email }

  // Push cihazi kaydet
  await prisma.pushInstallation.create({
    data: {
      installationId: `inst-evt-rec-${Date.now()}`,
      userId: userRecipient.id,
      platform: 'android',
      pushToken: `token-evt-rec-${Date.now()}`
    }
  })

  // Test Community Thread
  const thread = await prisma.communityThread.create({
    data: {
      name: 'Test Sohbet',
      createdById: userRecipient.id,
      members: {
        create: [
          { userId: userRecipient.id, role: 'owner' },
          { userId: userActor.id, role: 'member' }
        ]
      }
    }
  })
  testThreadId = thread.id

  // Test Community Post
  const post = await prisma.communityPost.create({
    data: {
      authorId: userRecipient.id,
      postType: 'question',
      summary: 'Test Gonderi Ozeti',
      status: 'approved'
    }
  })
  testPostId = post.id

  // Test Workspace
  const ws = await prisma.businessWorkspace.create({
    data: {
      name: 'Event Test Workspace',
      createdById: userRecipient.id,
      members: {
        create: {
          userId: userRecipient.id,
          role: 'owner',
          status: 'active'
        }
      },
      settings: {
        create: {
          notificationPrefs: JSON.stringify({ dueReminders: true })
        }
      }
    }
  })
  workspaceId = ws.id
})

afterAll(async () => {
  await prisma.businessNotification.deleteMany({
    where: { userId: userRecipient.id }
  })
  await prisma.businessReminder.deleteMany({
    where: { workspaceId }
  })
  await prisma.businessRecord.deleteMany({
    where: { workspaceId }
  })
  await prisma.businessMember.deleteMany({
    where: { workspaceId }
  })
  await prisma.businessSetting.deleteMany({
    where: { workspaceId }
  })
  await prisma.businessWorkspace.deleteMany({
    where: { id: workspaceId }
  })
  await prisma.communityNotification.deleteMany({
    where: { userId: { in: [userRecipient.id, userActor.id] } }
  })
  await prisma.communityPost.deleteMany({
    where: { id: testPostId }
  })
  await prisma.communityThreadMember.deleteMany({
    where: { threadId: testThreadId }
  })
  await prisma.communityThread.deleteMany({
    where: { id: testThreadId }
  })
  await prisma.accountNotification.deleteMany({
    where: { userId: userRecipient.id }
  })
  await prisma.pushInstallation.deleteMany({
    where: { userId: userRecipient.id }
  })
  await prisma.user.deleteMany({
    where: { id: { in: [userRecipient.id, userActor.id] } }
  })
  await prisma.$disconnect()
})

beforeEach(() => {
  fakeTransport.clear()
})

describe('Topluluk Bildirim Olaylari (Community Push Events)', () => {
  it('Direkt mesaj (message) olayi hem in-app bildirim olusturur hem de community_thread push gonderir', async () => {
    await communityBildirimYaz(userRecipient.id, userActor.id, 'message', { threadId: testThreadId })

    // In-app bildirim kontrolu
    const inApp = await prisma.communityNotification.findFirst({
      where: { userId: userRecipient.id, actorId: userActor.id, type: 'message', threadId: testThreadId }
    })
    expect(inApp).not.toBeNull()

    // Push kontrolu
    expect(fakeTransport.sentMessages.length).toBe(1)
    expect(fakeTransport.sentMessages[0].message.data).toEqual({
      target: 'community_thread',
      threadId: testThreadId
    })
  })

  it('Grup daveti (thread_invite) olayi community_thread push gonderir', async () => {
    await communityBildirimYaz(userRecipient.id, userActor.id, 'thread_invite', { threadId: testThreadId })

    expect(fakeTransport.sentMessages.length).toBe(1)
    expect(fakeTransport.sentMessages[0].message.data).toEqual({
      target: 'community_thread',
      threadId: testThreadId
    })
  })

  it('Gonderi yaniti (reply) olayi community_post push gonderir', async () => {
    await communityBildirimYaz(userRecipient.id, userActor.id, 'reply', { postId: testPostId })

    expect(fakeTransport.sentMessages.length).toBe(1)
    expect(fakeTransport.sentMessages[0].message.data).toEqual({
      target: 'community_post',
      postId: testPostId
    })
  })

  it('Begeni (like) olayi in-app olusturur fakat push GONDERMEZ (IN_APP_ONLY)', async () => {
    await communityBildirimYaz(userRecipient.id, userActor.id, 'like', { postId: testPostId })

    const inApp = await prisma.communityNotification.findFirst({
      where: { userId: userRecipient.id, type: 'like', postId: testPostId }
    })
    expect(inApp).not.toBeNull()

    expect(fakeTransport.sentMessages.length).toBe(0) // Push yok
  })

  it('Kullanici kendine eylem yaptiginda (actor == recipient) bildirim ve push uretilmez', async () => {
    await communityBildirimYaz(userRecipient.id, userRecipient.id, 'reply', { postId: testPostId })

    const inApp = await prisma.communityNotification.findFirst({
      where: { userId: userRecipient.id, actorId: userRecipient.id }
    })
    expect(inApp).toBeNull()
    expect(fakeTransport.sentMessages.length).toBe(0)
  })
})

describe('Isletme Hatirlatici Olaylari (Business Reminder Push Events)', () => {
  it('Vadesi gelen gorev hatirlaticisi in-app bildirim yazar ve workspace_record push gonderir', async () => {
    const now = new Date()
    const record = await prisma.businessRecord.create({
      data: {
        workspaceId,
        createdById: userRecipient.id,
        title: 'Vergi Beyannamesi Odemesi',
        type: 'tax',
        status: 'pending',
        direction: 'payable',
        amount: 15000,
        currency: 'TRY',
        dueAt: new Date(now.getTime() - 1000)
      }
    })

    const reminder = await prisma.businessReminder.create({
      data: {
        workspaceId,
        recordId: record.id,
        recipientId: userRecipient.id,
        scheduledAt: new Date(now.getTime() - 2000),
        status: 'pending',
        dedupeKey: `rem-test-${record.id}`
      }
    })

    const result = await processDueBusinessReminders(prisma, now)
    expect(result.sent).toBeGreaterThanOrEqual(1)

    // In-app bildirim kontrolu
    const inApp = await prisma.businessNotification.findFirst({
      where: { workspaceId, recordId: record.id, userId: userRecipient.id }
    })
    expect(inApp).not.toBeNull()

    // Push gonderim kontrolu
    expect(fakeTransport.sentMessages.length).toBeGreaterThanOrEqual(1)
    const match = fakeTransport.sentMessages.find(
      m =>
        m.message.data.target === 'workspace_record' &&
        (m.message.data as any).recordId === record.id
    )
    expect(match).toBeDefined()
    expect(match?.message.data).toEqual({
      target: 'workspace_record',
      workspaceId,
      recordId: record.id
    })
  })
})

describe('Hesap ve Faturalama Olaylari (Account & Billing Push Events)', () => {
  it('payment_failed kritik olayinda hem in-app bildirim hem account push gonderilir', async () => {
    await accountBildirimYaz(
      {
        userId: userRecipient.id,
        type: 'payment_failed',
        title: 'Ödeme Başarısız',
        body: 'Abonelik yenileme ödemeniz alınamadı.',
        dedupeKey: `pay-fail-${Date.now()}`
      },
      prisma
    )

    const inApp = await prisma.accountNotification.findFirst({
      where: { userId: userRecipient.id, type: 'payment_failed' }
    })
    expect(inApp).not.toBeNull()

    expect(fakeTransport.sentMessages.length).toBe(1)
    expect(fakeTransport.sentMessages[0].message.data).toEqual({
      target: 'account'
    })
  })

  it('trial_ending olayinda account push gonderilir', async () => {
    await accountBildirimYaz(
      {
        userId: userRecipient.id,
        type: 'trial_ending',
        title: 'Deneme Süreniz Bitiyor',
        body: 'LocalKarar deneme süreniz 3 gün içinde sona erecek.',
        dedupeKey: `trial-end-${Date.now()}`
      },
      prisma
    )

    expect(fakeTransport.sentMessages.length).toBe(1)
    expect(fakeTransport.sentMessages[0].message.data).toEqual({
      target: 'account'
    })
  })

  it('payment_succeeded olayi yalnizca in-app uretir, push GONDERMEZ', async () => {
    await accountBildirimYaz(
      {
        userId: userRecipient.id,
        type: 'payment_succeeded',
        title: 'Ödeme Alındı',
        body: 'Ödemeniz başarıyla tamamlandı.',
        dedupeKey: `pay-ok-${Date.now()}`
      },
      prisma
    )

    const inApp = await prisma.accountNotification.findFirst({
      where: { userId: userRecipient.id, type: 'payment_succeeded' }
    })
    expect(inApp).not.toBeNull()

    expect(fakeTransport.sentMessages.length).toBe(0) // Push yok
  })
})
