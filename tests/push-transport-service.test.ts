import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  PushService,
  FirebaseHttpV1Transport,
  FakePushTransport,
  maskPushToken,
  classifyFcmError,
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

beforeEach(() => {
  fakeTransport.clear()
})

describe('classifyFcmError - FCM HTTP v1 Hata Matrisi ve Token Koruma', () => {
  it('UNREGISTERED hata kodunda token kesinlikle gecersiz olarak siniflandirilir', () => {
    const res = classifyFcmError(404, {
      error: {
        code: 404,
        status: 'NOT_FOUND',
        message: 'Requested entity was not found.',
        details: [
          {
            '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
            errorCode: 'UNREGISTERED'
          }
        ]
      }
    })
    expect(res.invalidToken).toBe(true)
    expect(res.isRetryable).toBe(false)
  })

  it('Tokena ozgu acik INVALID_ARGUMENT (message.token alani) tokeni gecersiz kilar', () => {
    const res = classifyFcmError(400, {
      error: {
        code: 400,
        status: 'INVALID_ARGUMENT',
        message: 'The registration token is not a valid FCM registration token',
        details: [
          {
            '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
            errorCode: 'INVALID_ARGUMENT'
          },
          {
            '@type': 'type.googleapis.com/google.rpc.BadRequest',
            fieldViolations: [{ field: 'message.token', description: 'Invalid token format' }]
          }
        ]
      }
    })
    expect(res.invalidToken).toBe(true)
    expect(res.isRetryable).toBe(false)
  })

  it('Payload kaynakli genel INVALID_ARGUMENT (or. message.data hatasi) tokeni KESINLIKLE KORUR (invalidToken=false)', () => {
    const res = classifyFcmError(400, {
      error: {
        code: 400,
        status: 'INVALID_ARGUMENT',
        message: 'Payload data field is invalid or too large',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.BadRequest',
            fieldViolations: [{ field: 'message.data.customKey', description: 'Field too large' }]
          }
        ]
      }
    })
    expect(res.invalidToken).toBe(false)
    expect(res.isRetryable).toBe(false)
  })

  it('401 UNAUTHENTICATED sunucu kimlik hatasinda token silinmez (invalidToken=false)', () => {
    const res = classifyFcmError(401, {
      error: {
        code: 401,
        status: 'UNAUTHENTICATED',
        message: 'Request had invalid authentication credentials.'
      }
    })
    expect(res.invalidToken).toBe(false)
    expect(res.isRetryable).toBe(false)
  })

  it('403 PERMISSION_DENIED / SENDER_ID_MISMATCH saglayici yetki hatasinda token silinmez', () => {
    const res = classifyFcmError(403, {
      error: {
        code: 403,
        status: 'PERMISSION_DENIED',
        message: 'SenderId mismatch or permission denied.',
        details: [
          {
            '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
            errorCode: 'SENDER_ID_MISMATCH'
          }
        ]
      }
    })
    expect(res.invalidToken).toBe(false)
    expect(res.isRetryable).toBe(false)
  })

  it('429 QUOTA_EXCEEDED hiz sinirinda token silinmez ve retryable isaretlenir', () => {
    const res = classifyFcmError(429, {
      error: {
        code: 429,
        status: 'RESOURCE_EXHAUSTED',
        message: 'Quota exceeded for project.',
        details: [
          {
            '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
            errorCode: 'QUOTA_EXCEEDED'
          }
        ]
      }
    })
    expect(res.invalidToken).toBe(false)
    expect(res.isRetryable).toBe(true)
  })

  it('500 INTERNAL / 503 UNAVAILABLE sunucu hatalarinda token silinmez ve retryable isaretlenir', () => {
    const res503 = classifyFcmError(503, {
      error: {
        code: 503,
        status: 'UNAVAILABLE',
        message: 'The service is temporarily unavailable.',
        details: [
          {
            '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
            errorCode: 'UNAVAILABLE'
          }
        ]
      }
    })
    expect(res503.invalidToken).toBe(false)
    expect(res503.isRetryable).toBe(true)

    const res500 = classifyFcmError(500, {
      error: {
        code: 500,
        status: 'INTERNAL',
        message: 'Internal error encountered.'
      }
    })
    expect(res500.invalidToken).toBe(false)
    expect(res500.isRetryable).toBe(true)
  })

  it('Ag zaman asimi (timeout / network error) durumunda token silinmez', () => {
    const res = classifyFcmError(0)
    expect(res.invalidToken).toBe(false)
  })
})

describe('FirebaseHttpV1Transport & Guvenlik', () => {
  it('Kimlik bilgileri eksik oldugunda isEnabled false olur ve send skipped=true doner (sent olarak sayilmaz)', async () => {
    const transport = new FirebaseHttpV1Transport(null)
    expect(transport.isEnabled).toBe(false)
    const res = await transport.send('fake-token', {
      title: 'Test',
      body: 'Test Body',
      data: { target: 'account' }
    })
    expect(res.success).toBe(false)
    expect(res.skipped).toBe(true)
  })

  it('maskPushToken tokenin yalnizca basini ve sonunu gosterir', () => {
    const token = 'c8X1234567890abcdefghijklmnopqrstuvwxyz1234567890'
    const masked = maskPushToken(token)
    expect(masked).toBe('c8X1...7890')
    expect(masked).not.toContain('abcdefghijklmnopqrstuvwxyz')
  })
})

describe('PushService Gonderim, Hata Yalitimi ve Token Temizleme', () => {
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

  it('Devre disi (disabled) transport durumunda summary.skipped artar, summary.sent ARTMAZ', async () => {
    const instId = `inst-skip-${Date.now()}`
    await prisma.pushInstallation.create({
      data: {
        installationId: instId,
        userId: testUserId,
        platform: 'android',
        pushToken: `token-skip-${Date.now()}`
      }
    })

    const disabledTransport = new FakePushTransport()
    disabledTransport.isEnabled = false
    const disabledService = new PushService(prisma, disabledTransport)

    const summary = await disabledService.sendToUser(testUserId, {
      title: 'Test',
      body: 'Body',
      data: { target: 'account' }
    })

    expect(summary.attempted).toBe(1)
    expect(summary.sent).toBe(0)
    expect(summary.skipped).toBe(1)
    expect(summary.failed).toBe(0)

    // Temizlik
    await prisma.pushInstallation.delete({ where: { installationId: instId } })
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
    fakeTransport.failNextWithInvalidToken('UNREGISTERED')

    const summary = await pushService.sendToUser(testUserId, {
      title: 'Gecersiz Token Testi',
      body: 'Govde',
      data: { target: 'account' }
    })

    expect(summary.invalidated).toBeGreaterThanOrEqual(1)

    const remaining = await prisma.pushInstallation.count({
      where: { userId: testUserId }
    })
    expect(remaining).toBe(1)
  })

  it('Payload hatasi (INVALID_ARGUMENT) alan istekte kurulum kaydi KORUNUR, silinmez', async () => {
    fakeTransport.clear()
    fakeTransport.simulateResult({
      success: false,
      invalidToken: false, // Payload hatasi oldugu icin token invalid degil
      error: 'Invalid notification data payload'
    })

    const initialCount = await prisma.pushInstallation.count({
      where: { userId: testUserId }
    })

    const summary = await pushService.sendToUser(testUserId, {
      title: 'Payload Hata Testi',
      body: 'Govde',
      data: { target: 'account' }
    })

    expect(summary.failed).toBe(1)
    expect(summary.invalidated).toBe(0)

    const afterCount = await prisma.pushInstallation.count({
      where: { userId: testUserId }
    })
    expect(afterCount).toBe(initialCount)
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
