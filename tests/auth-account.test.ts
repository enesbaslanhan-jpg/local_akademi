import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const marker = `account-${Date.now()}`
const password = 'StrongTestPassword!42'
let app: FastifyInstance
let userId: number
let token: string

beforeAll(async () => {
  process.env.JWT_SECRET = 'account-test-secret-key-min-32-bytes-long'
  process.env.NODE_ENV = 'test'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()
  const user = await prisma.user.create({
    data: { email: `${marker}@test.local`, password: await bcrypt.hash(password, 10), name: 'Account Test', role: 'learner' }
  })
  userId = user.id
  token = app.jwt.sign({ id: user.id, email: user.email, role: user.role })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorId: userId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await app.close()
  await prisma.$disconnect()
})

describe('account management', () => {
  it('changes the email only after password verification and returns a fresh session', async () => {
    const response = await app.inject({
      method: 'PUT', url: '/auth/email',
      headers: { authorization: `Bearer ${token}` },
      payload: { newEmail: `${marker}-new@test.local`, currentPassword: password }
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().user.email).toBe(`${marker}-new@test.local`)
    token = response.json().token

    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${token}` } })
    expect(me.statusCode).toBe(200)
    expect(me.json().email).toBe(`${marker}-new@test.local`)
  })

  it('requires an exact destructive confirmation', async () => {
    const response = await app.inject({
      method: 'DELETE', url: '/auth/account',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentPassword: password, confirmation: 'sil' }
    })
    expect(response.statusCode).toBe(422)
  })

  it('validates, stores and removes a profile photo', async () => {
    const boundary = `avatar-boundary-${Date.now()}`
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zr2AAAAAASUVORK5CYII=', 'base64')
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="avatar"; filename="profile.png"\r\nContent-Type: image/png\r\n\r\n`),
      png,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])
    const uploaded = await app.inject({
      method: 'POST', url: '/auth/avatar',
      headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    })
    expect(uploaded.statusCode).toBe(201)
    expect(uploaded.json().avatarUrl).toMatch(/^\/auth\/avatar\/[0-9a-f-]{36}\.png$/)

    const served = await app.inject({ method: 'GET', url: uploaded.json().avatarUrl })
    expect(served.statusCode).toBe(200)
    expect(served.headers['content-type']).toContain('image/png')

    const removed = await app.inject({ method: 'DELETE', url: '/auth/avatar', headers: { authorization: `Bearer ${token}` } })
    expect(removed.statusCode).toBe(204)
  })

  it('anonymizes and disables the account', async () => {
    const response = await app.inject({
      method: 'DELETE', url: '/auth/account',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentPassword: password, confirmation: 'HESABIMI SİL' }
    })
    expect(response.statusCode).toBe(204)

    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${token}` } })
    expect(me.statusCode).toBe(401)

    const deleted = await prisma.user.findUnique({ where: { id: userId } })
    expect(deleted?.deletedAt).toBeInstanceOf(Date)
    expect(deleted?.email).toContain('@deleted.local')
  })
})
