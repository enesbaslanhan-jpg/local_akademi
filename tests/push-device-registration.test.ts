import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const marker = `push-dev-${Date.now()}`
const password = 'StrongPassword!123'
let app: FastifyInstance
let userA: { id: number; email: string }
let userB: { id: number; email: string }
let tokenA: string
let tokenB: string

beforeAll(async () => {
  process.env.JWT_SECRET = 'push-device-test-secret-min-32-chars-key'
  process.env.NODE_ENV = 'test'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()

  const uA = await prisma.user.create({
    data: {
      email: `${marker}-a@test.local`,
      password: await bcrypt.hash(password, 10),
      name: 'User A',
      role: 'learner'
    }
  })
  userA = { id: uA.id, email: uA.email }

  const uB = await prisma.user.create({
    data: {
      email: `${marker}-b@test.local`,
      password: await bcrypt.hash(password, 10),
      name: 'User B',
      role: 'learner'
    }
  })
  userB = { id: uB.id, email: uB.email }

  const resA = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: userA.email, password }
  })
  tokenA = resA.json().token

  const resB = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: userB.email, password }
  })
  tokenB = resB.json().token
})

afterAll(async () => {
  await prisma.pushInstallation.deleteMany({
    where: { userId: { in: [userA.id, userB.id] } }
  })
  await prisma.auditLog.deleteMany({
    where: { actorId: { in: [userA.id, userB.id] } }
  })
  await prisma.user.deleteMany({
    where: { id: { in: [userA.id, userB.id] } }
  })
  await app.close()
  await prisma.$disconnect()
})

describe('PUT /devices/:installationId - Cihaz Kayit', () => {
  it('kimlik dogrulanmamis istek 401 ile reddedilir', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/devices/inst-unauth',
      payload: {
        pushToken: 'fcm-token-1234567890',
        platform: 'android'
      }
    })
    expect(res.statusCode).toBe(401)
  })

  it('gecersiz platform (ios/android disi) 422 ile reddedilir', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/devices/inst-bad-platform',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        pushToken: 'fcm-token-1234567890',
        platform: 'windows'
      }
    })
    expect(res.statusCode).toBe(422)
  })

  it('gecersiz/kisa token 422 ile reddedilir', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/devices/inst-short-token',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        pushToken: 'short',
        platform: 'android'
      }
    })
    expect(res.statusCode).toBe(422)
  })

  it('gecerli PUT cihaz kurulumunu olusturur ve hassas pushToken bilgisini dondurmez', async () => {
    const installationId = `inst-valid-${Date.now()}`
    const pushToken = `fcm-token-${Date.now()}-abc123456`

    const res = await app.inject({
      method: 'PUT',
      url: `/devices/${installationId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        pushToken,
        platform: 'android',
        appVersion: '1.2.0',
        locale: 'tr'
      }
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.installationId).toBe(installationId)
    expect(body.platform).toBe('android')
    expect(body.enabled).toBe(true)
    expect(body.appVersion).toBe('1.2.0')
    expect(body.locale).toBe('tr')
    expect(body.pushToken).toBeUndefined() // Hassas token donmez

    const inDb = await prisma.pushInstallation.findUnique({
      where: { installationId }
    })
    expect(inDb).not.toBeNull()
    expect(inDb?.userId).toBe(userA.id)
    expect(inDb?.pushToken).toBe(pushToken)
  })

  it('idempotency: 10 ardil ayni PUT tek bir veritabani kaydi uretir', async () => {
    const installationId = `inst-idempotent-${Date.now()}`
    const pushToken = `fcm-token-idempotent-${Date.now()}`

    for (let i = 0; i < 10; i++) {
      const res = await app.inject({
        method: 'PUT',
        url: `/devices/${installationId}`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          pushToken,
          platform: 'ios',
          appVersion: '2.0.1'
        }
      })
      expect(res.statusCode).toBe(200)
    }

    const count = await prisma.pushInstallation.count({
      where: { installationId }
    })
    expect(count).toBe(1)
  })

  it('token rotasyonu: ayni kurulum yeni token aldiginda kayit guncellenir', async () => {
    const installationId = `inst-rotate-${Date.now()}`
    const tokenOld = `token-old-${Date.now()}`
    const tokenNew = `token-new-${Date.now()}`

    await app.inject({
      method: 'PUT',
      url: `/devices/${installationId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { pushToken: tokenOld, platform: 'android' }
    })

    const res2 = await app.inject({
      method: 'PUT',
      url: `/devices/${installationId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { pushToken: tokenNew, platform: 'android' }
    })
    expect(res2.statusCode).toBe(200)

    const inDb = await prisma.pushInstallation.findUnique({
      where: { installationId }
    })
    expect(inDb?.pushToken).toBe(tokenNew)
  })

  it('coklu cihaz: Ayni kullanicinin birden cok kurulumu bir arada yasayabilir', async () => {
    const inst1 = `inst-multi-1-${Date.now()}`
    const inst2 = `inst-multi-2-${Date.now()}`

    await app.inject({
      method: 'PUT',
      url: `/devices/${inst1}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { pushToken: `tok-1-${Date.now()}`, platform: 'android' }
    })

    await app.inject({
      method: 'PUT',
      url: `/devices/${inst2}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { pushToken: `tok-2-${Date.now()}`, platform: 'ios' }
    })

    const count = await prisma.pushInstallation.count({
      where: { userId: userA.id, installationId: { in: [inst1, inst2] } }
    })
    expect(count).toBe(2)
  })

  it('hesap degisimi (account switch): ayni kurulum baska kullanici tarafindan kaydedilince yeni kullaniciya devredilir', async () => {
    const instId = `inst-switch-${Date.now()}`
    const pushToken = `tok-switch-${Date.now()}`

    // User A kaydeder
    await app.inject({
      method: 'PUT',
      url: `/devices/${instId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { pushToken, platform: 'android' }
    })

    // User B ayni cihazda giris yapip kaydeder
    const resB = await app.inject({
      method: 'PUT',
      url: `/devices/${instId}`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { pushToken, platform: 'android' }
    })
    expect(resB.statusCode).toBe(200)

    const inDb = await prisma.pushInstallation.findUnique({
      where: { installationId: instId }
    })
    expect(inDb?.userId).toBe(userB.id)
  })

  it('token cakismasi: Ayni pushToken baska bir eski kurulumda varsa, cakisma guvenle cozulur', async () => {
    const instOld = `inst-col-old-${Date.now()}`
    const instNew = `inst-col-new-${Date.now()}`
    const sharedToken = `tok-shared-${Date.now()}`

    // instOld token'i alir
    await app.inject({
      method: 'PUT',
      url: `/devices/${instOld}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { pushToken: sharedToken, platform: 'android' }
    })

    // instNew ayni token'i alir (or. uygulama yeniden kurulmus ama token ayni kalmis)
    const res = await app.inject({
      method: 'PUT',
      url: `/devices/${instNew}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { pushToken: sharedToken, platform: 'android' }
    })
    expect(res.statusCode).toBe(200)

    const oldExists = await prisma.pushInstallation.findUnique({
      where: { installationId: instOld }
    })
    expect(oldExists).toBeNull()

    const newExists = await prisma.pushInstallation.findUnique({
      where: { installationId: instNew }
    })
    expect(newExists).not.toBeNull()
    expect(newExists?.pushToken).toBe(sharedToken)
  })
})

describe('DELETE /devices/:installationId - Cihaz Silme', () => {
  it('kullanici kendi kurulumunu basariyla siler (204)', async () => {
    const instId = `inst-del-${Date.now()}`
    await app.inject({
      method: 'PUT',
      url: `/devices/${instId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { pushToken: `tok-del-${Date.now()}`, platform: 'android' }
    })

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/devices/${instId}`,
      headers: { authorization: `Bearer ${tokenA}` }
    })
    expect(delRes.statusCode).toBe(204)

    const inDb = await prisma.pushInstallation.findUnique({
      where: { installationId: instId }
    })
    expect(inDb).toBeNull()
  })

  it('olmayan kurulumu silmek idempotent sekilde 204 doner', async () => {
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/devices/inst-nonexistent-12345`,
      headers: { authorization: `Bearer ${tokenA}` }
    })
    expect(delRes.statusCode).toBe(204)
  })

  it('baska kullaniciya ait kurulum silinmeye calisildiginda silinmez ve 204 doner (bilgi sizdirilmaz)', async () => {
    const instId = `inst-user-b-${Date.now()}`
    await app.inject({
      method: 'PUT',
      url: `/devices/${instId}`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { pushToken: `tok-user-b-${Date.now()}`, platform: 'ios' }
    })

    // User A, User B'nin kurulumunu silmeye calisir
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/devices/${instId}`,
      headers: { authorization: `Bearer ${tokenA}` }
    })
    expect(delRes.statusCode).toBe(204)

    // User B'nin kurulumu hala veritabaninda durmalidir
    const inDb = await prisma.pushInstallation.findUnique({
      where: { installationId: instId }
    })
    expect(inDb).not.toBeNull()
    expect(inDb?.userId).toBe(userB.id)
  })
})

describe('Oturum ve Hesap Yasam Dongusu Entegrasyonu', () => {
  it('POST /auth/logout-all kullanicinin tum push kayitlarini temizler', async () => {
    const inst1 = `inst-lout-1-${Date.now()}`
    const inst2 = `inst-lout-2-${Date.now()}`

    await app.inject({
      method: 'PUT',
      url: `/devices/${inst1}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { pushToken: `tok-lout-1-${Date.now()}`, platform: 'android' }
    })
    await app.inject({
      method: 'PUT',
      url: `/devices/${inst2}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { pushToken: `tok-lout-2-${Date.now()}`, platform: 'ios' }
    })

    const loutRes = await app.inject({
      method: 'POST',
      url: '/auth/logout-all',
      headers: { authorization: `Bearer ${tokenA}` }
    })
    expect(loutRes.statusCode).toBe(200)

    const remaining = await prisma.pushInstallation.count({
      where: { userId: userA.id }
    })
    expect(remaining).toBe(0)
  })

  it('Kullanici hesabi silindiginde PushInstallation kayitlari cascade silinir', async () => {
    const tempUser = await prisma.user.create({
      data: {
        email: `temp-cascade-${Date.now()}@test.local`,
        password: await bcrypt.hash(password, 10),
        name: 'Temp User'
      }
    })

    const instId = `inst-cascade-${Date.now()}`
    await prisma.pushInstallation.create({
      data: {
        installationId: instId,
        userId: tempUser.id,
        platform: 'android',
        pushToken: `tok-cascade-${Date.now()}`
      }
    })

    await prisma.user.delete({
      where: { id: tempUser.id }
    })

    const instRemaining = await prisma.pushInstallation.findUnique({
      where: { installationId: instId }
    })
    expect(instRemaining).toBeNull()
  })

  it('es zamanli (concurrent) ayni token kayitlarinda tek bir aktif kayit kalir ve 200 doner', async () => {
    // Logout-all sonrasi taze token al
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: userA.email, password }
    })
    const freshTokenA = loginRes.json().token

    const inst1 = `inst-conc-1-${Date.now()}`
    const inst2 = `inst-conc-2-${Date.now()}`
    const sharedToken = `token-conc-${Date.now()}`

    const [res1, res2] = await Promise.all([
      app.inject({
        method: 'PUT',
        url: `/devices/${inst1}`,
        headers: { authorization: `Bearer ${freshTokenA}` },
        payload: { pushToken: sharedToken, platform: 'android' }
      }),
      app.inject({
        method: 'PUT',
        url: `/devices/${inst2}`,
        headers: { authorization: `Bearer ${freshTokenA}` },
        payload: { pushToken: sharedToken, platform: 'android' }
      })
    ])

    expect(res1.statusCode).toBe(200)
    expect(res2.statusCode).toBe(200)

    const tokenCount = await prisma.pushInstallation.count({
      where: { pushToken: sharedToken }
    })
    expect(tokenCount).toBe(1)
  })

  it('User A cevrimdisi oldugu icin DELETE yapamasa bile User B ayni kurulumu alinca User A erisimini kaybeder', async () => {
    const loginResA = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: userA.email, password }
    })
    const freshTokenA = loginResA.json().token

    const instId = `inst-offline-${Date.now()}`
    const tokenAInst = `tok-user-a-${Date.now()}`
    const tokenBInst = `tok-user-b-${Date.now()}`

    // User A cihazda oturum acmis ve kaydetmis
    await app.inject({
      method: 'PUT',
      url: `/devices/${instId}`,
      headers: { authorization: `Bearer ${freshTokenA}` },
      payload: { pushToken: tokenAInst, platform: 'android' }
    })

    // User A cikis yapmadan/DELETE gondermeden User B ayni cihazda giris yapip PUT gonderiyor
    const res = await app.inject({
      method: 'PUT',
      url: `/devices/${instId}`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { pushToken: tokenBInst, platform: 'android' }
    })
    expect(res.statusCode).toBe(200)

    const updated = await prisma.pushInstallation.findUnique({
      where: { installationId: instId }
    })
    expect(updated?.userId).toBe(userB.id)
    expect(updated?.pushToken).toBe(tokenBInst)

    // User A adina bu cihaz kayitli degildir
    const userAInstallations = await prisma.pushInstallation.findMany({
      where: { userId: userA.id, installationId: instId }
    })
    expect(userAInstallations.length).toBe(0)
  })
})
