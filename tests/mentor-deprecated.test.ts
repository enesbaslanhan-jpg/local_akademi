import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import { mentorRoutes } from '../src/services/mentor'
import { conversationRoutes } from '../src/services/conversation'
import { MockAiChatProvider } from '../src/services/ai-chat-provider'

let app: FastifyInstance

beforeAll(async () => {
  app = Fastify({ logger: false })

  app.decorate('authenticate', async function (request: any, _reply: any) {
    request.user = { id: 1, email: 'deprecated@test.com', role: 'learner' }
  })

  await app.register(mentorRoutes, {
    prefix: '/mentor',
    aiProvider: new MockAiChatProvider('deprecated endpoint reply')
  })
  await app.register(conversationRoutes, { prefix: '/mentor/conversations' })
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

function expectDeprecationHeaders(res: any) {
  expect(res.headers.deprecation).toBe('true')
  expect(res.headers.warning).toContain('299')
  expect(res.headers.warning).toContain('Deprecated API')
  expect(res.headers.link).toContain('/mentor/conversations')
  expect(res.headers.link).toContain('rel="successor-version"')
}

describe('Legacy /mentor endpoints deprecation headers', () => {
  it('POST /mentor/chat returns deprecation headers on validation error', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      payload: {},
      headers: { authorization: 'Bearer ignored' }
    })
    expectDeprecationHeaders(res)
    expect(res.statusCode).toBe(400)
  })

  it('GET /mentor/history returns deprecation headers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/mentor/history',
      headers: { authorization: 'Bearer ignored' }
    })
    expectDeprecationHeaders(res)
  })

  it('DELETE /mentor/history returns deprecation headers', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/mentor/history',
      headers: { authorization: 'Bearer ignored' }
    })
    expectDeprecationHeaders(res)
  })
})

describe('Current /mentor/conversations endpoints do not expose deprecation headers', () => {
  it('GET /mentor/conversations/ omits deprecation headers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/mentor/conversations/',
      headers: { authorization: 'Bearer ignored' }
    })
    expect(res.headers.deprecation).toBeUndefined()
    expect(res.headers.warning).toBeUndefined()
  })
})
