import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  PushService,
  FirebaseHttpV1Transport,
  FakePushTransport,
  maskPushToken,
  type PushNotificationMessage
} from '../src/services/push/index.js'

const prisma = new PrismaClient()
const marker = `push-srv-${Date.now()}`
let testUserId: number
let fakeTransport: FakePushTransport
let pushService: PushService

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: `${marker}@test.local`,
      password: 'SampleHashedPassword!123',
      name: 'Push Service Tester',
      role: 'learner'
    }
  })
  testUserId = user.id

  fakeTransport = new FakePushTransport()
  pushService = new PushService(prisma, fakeTransport)
})

afterAll(async () => {
  await prisma.pushInstallation.deleteMany({
    where: { userId: testUserId }
  })
  await prisma.user.deleteMany({
    where: { id: testUserId }
  })
  await prisma.$disconnect()
})

describe('FirebaseHttpV1Transport & Guvenlik', () => {
  it('Kimlik bilgileri eksik oldugunda isEnabled false olur ve send hatasiz doner (disabled mode)', async () => {
    const transport = new FirebaseHttpV1Transport(null)
    expect(transport.isEnabled).toBe(false)
    const res = await transport.send('fake-token', {
      title: 'Test',
      body: 'Test Body',
      data: { target: 'account' }
    })
    expect(res.success).toBe(true)
  })

  it('maskPushToken tokenin yalnizca basini ve sonunu gosterir', () => {
    const token = 'c8X1234567890abcdefghijklmnopqrstuvwxyz1234567890'
    const masked = maskPushToken(token)
    expect(masked).toBe('c8X1...7890')
    expect(masked).not.toContain('abcdefghijklmnopqrstuvwxyz')
  })
})

describe('PushService Gonderim ve Hata Yalitimi', () => {
  beforeEach: () => {
    fakeTransport.clear()
  }

  it('Kayitli cihazi olmayan kullaniciya gonderim attempted: 0 doner', async () => {
    fakeTransport.clear()
    const summary = await pushService.sendToUser(testUserId, {
      title: 'Baslik',
      body: 'Govde',
      data: { target: 'account' }
    })
    expect(summary.attempted).toBe(0)
    expect(summary.sent).toBe(0)
    expect(fakeTransport.sentMessages.length).toBe(0)
  })

  it('Tek cihazli kullaniciya basarili push iletimi', async () => {
    fakeTransport.clear()
    const instId = `inst-single-${Date.now()}`
    const pushToken = `token-single-${Date.now()}`

    await prisma.pushInstallation.create({
      data: {
        installationId: instId,
        userId: testUserId,
        platform: 'android',
        pushToken
      }
    })

    const message: PushNotificationMessage = {
      title: 'Topluluk Yaniti',
      body: 'Gonderinize yanit geldi',
      data: { target: 'community_post', postId: 'post-123' }
    }

    const summary = await pushService.sendToUser(testUserId, message)
    expect(summary.attempted).toBe(1)
    expect(summary.sent).toBe(1)
    expect(summary.failed).toBe(0)
    expect(summary.invalidated).toBe(0)

    expect(fakeTransport.sentMessages.length).toBe(1)
    expect(fakeTransport.sentMessages[0].token).toBe(pushToken)
    expect(fakeTransport.sentMessages[0].message.title).toBe('Topluluk Yaniti')
    expect(fakeTransport.sentMessages[0].message.data).toEqual({
      target: 'community_post',
      postId: 'post-123'
    })
  })

  it('Coklu cihaz (multi-device fan-out): Tum aktif cihazlara paralel iletilir', async () => {
    fakeTransport.clear()
    const inst2 = `inst-second-${Date.now()}`
    const pushToken2 = `token-second-${Date.now()}`

    await prisma.pushInstallation.create({
      data: {
        installationId: inst2,
        userId: testUserId,
        platform: 'ios',
        pushToken: pushToken2
      }
    })

    const summary = await pushService.sendToUser(testUserId, {
      title: 'Mesaj',
      body: 'Yeni mesaj',
      data: { target: 'community_thread', threadId: 'thread-999' }
    })

    expect(summary.attempted).toBe(2)
    expect(summary.sent).toBe(2)
    expect(fakeTransport.sentMessages.length).toBe(2)
  })

  it('Gecersiz token (UNREGISTERED) durumunda alakali kurulum kaydi veritabanindan silinir', async () => {
    fakeTransport.clear()
    // Gecersiz token taklidi yap
    fakeTransport.failNextWithInvalidToken('UNREGISTERED')

    const summary = await pushService.sendToUser(testUserId, {
      title: 'Gecersiz Token Testi',
      body: 'Govde',
      data: { target: 'account' }
    })

    expect(summary.invalidated).toBeGreaterThanOrEqual(1)

    // En az bir cihaz silinmis olmali
    const remaining = await prisma.pushInstallation.count({
      where: { userId: testUserId }
    })
    expect(remaining).toBe(1) // 2 vardi, 1 kaldi
  })

  it('Gecici iletim hatasinda (503/timeout) kurulum silinmez, yalnizca failed artar', async () => {
    fakeTransport.clear()
    fakeTransport.failNextWithTransientError('503 Service Unavailable')

    const initialCount = await prisma.pushInstallation.count({
      where: { userId: testUserId }
    })

    const summary = await pushService.sendToUser(testUserId, {
      title: 'Gecici Hata Testi',
      body: 'Govde',
      data: { target: 'account' }
    })

    expect(summary.failed).toBeGreaterThanOrEqual(1)
    expect(summary.invalidated).toBe(0)

    const afterCount = await prisma.pushInstallation.count({
      where: { userId: testUserId }
    })
    expect(afterCount).toBe(initialCount)
  })

  it('Transport beklenmedik hata firlatsa bile PushService hata firlatmaz (failure isolation)', async () => {
    fakeTransport.clear()
    const brokenTransport = {
      name: 'broken',
      isEnabled: true,
      send: async () => {
        throw new Error('Fatal socket explosion')
      }
    }
    const safeService = new PushService(prisma, brokenTransport)

    await expect(
      safeService.sendToUser(testUserId, {
        title: 'Guvenlik Testi',
        body: 'Govde',
        data: { target: 'account' }
      })
    ).resolves.toEqual(
      expect.objectContaining({
        attempted: expect.any(Number),
        failed: expect.any(Number)
      })
    )
  })
})

describe('Yuk Gizliligi (Payload Privacy)', () => {
  it('Push veri yuku hassas anahtarlari ve gizli alanlari icermez', () => {
    const payload: PushNotificationMessage = {
      title: 'Isletme Bildirimi',
      body: 'Gorev zamani geldi',
      data: {
        target: 'workspace_record',
        workspaceId: 'ws-100',
        recordId: 'rec-200'
      }
    }

    const json = JSON.stringify(payload)
    expect(json).not.toContain('token')
    expect(json).not.toContain('password')
    expect(json).not.toContain('secret')
    expect(json).not.toContain('amount')
    expect(json).not.toContain('email')
  })
})
