import { describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from '../src/services/auth'
import { genelHizSiniriAnahtari } from '../src/index'

describe('anonymous auth endpoint quotas', () => {
  it.each([['/register', 5, 422], ['/login', 10, 422], ['/social', 10, 422],
    ['/password-reset/request', 3, 200], ['/password-reset/confirm', 10, 400]])(
    '%s stays in the same IP bucket when valid bearer sessions rotate', async (path, limit, invalidStatus) => {
      const app = Fastify()
      await app.register(jwt, { secret: 'test-auth-quota-secret-at-least-32-bytes' })
      app.decorate('authenticate', async () => {})
      await app.register(rateLimit, { global: true, max: 1000, keyGenerator: genelHizSiniriAnahtari(app) })
      await app.register(authRoutes, { prefix: '/auth' })
      await app.ready()
      const tokens = [app.jwt.sign({ id: 1 }), app.jwt.sign({ id: 2 })]
      try {
        for (let index = 0; index < limit; index++) {
          const response = await app.inject({ method: 'POST', url: '/auth' + path, payload: {},
            headers: index % 3 === 0 ? {} : { authorization: 'Bearer ' + tokens[index % 2] } })
          // Validation rejects malformed bodies before any DB operation.
          expect(response.statusCode).toBe(invalidStatus)
        }
        const response = await app.inject({ method: 'POST', url: '/auth' + path, payload: {},
          headers: { authorization: 'Bearer ' + tokens[1] } })
        expect(response.statusCode).toBe(429)
      } finally { await app.close() }
    }
  )
})
