import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => {
  process.env.JWT_SECRET = 'http-test-secret-key-min-32-bytes-long!!'
  process.env.NODE_ENV = 'test'

  const { default: build } = await import('../src/index')
  app = await build()
})

afterAll(async () => {
  await app.close()
})

describe('HTTP Security Hardening', () => {
  describe('Body Limits', () => {
    it('accepts normal-sized JSON requests', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@test.com', password: 'x'.repeat(20) }
      })
      expect(res.statusCode).not.toBe(413)
    })

    it('rejects JSON body over 1MB with 413', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/knowledge/',
        payload: { data: 'x'.repeat(2 * 1024 * 1024) }
      })
      expect(res.statusCode).toBe(413)
      expect(res.headers['content-type']).toContain('application/json')
      const body = JSON.parse(res.body)
      expect(body).toHaveProperty('error')
    })
  })

  describe('Security Headers', () => {
    it('includes X-Content-Type-Options', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' })
      expect(res.headers['x-content-type-options']).toBe('nosniff')
    })

    it('includes X-Frame-Options', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' })
      expect(res.headers['x-frame-options']).toBe('DENY')
    })

    it('includes Referrer-Policy', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' })
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    })

    it('includes Permissions-Policy', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' })
      expect(res.headers['permissions-policy']).toMatch(/^camera=\(\)/)
    })
  })

  describe('Error Handling', () => {
    it('returns safe response for body limit exceeded (no stack)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/knowledge/',
        payload: { data: 'x'.repeat(2 * 1024 * 1024) }
      })
      expect(res.statusCode).toBe(413)
      const body = JSON.parse(res.body)
      expect(body).not.toHaveProperty('stack')
      expect(body).not.toHaveProperty('statusCode')
    })
  })

  describe('Global Rate Limiting', () => {
    it('includes rate limit headers on normal responses', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' })
      expect(res.statusCode).toBe(200)
      if (res.headers['x-ratelimit-limit']) {
        expect(Number(res.headers['x-ratelimit-remaining'])).toBeLessThanOrEqual(
          Number(res.headers['x-ratelimit-limit'])
        )
      }
    })

    it('health endpoint is not rate limited', async () => {
      const requests = Array.from({ length: 10 }, () =>
        app.inject({ method: 'GET', url: '/health' })
      )
      const results = await Promise.all(requests)
      for (const res of results) {
        expect(res.statusCode).toBe(200)
      }
    })

    it('30 hızlı normal GET isteğinde gezinme kilitlenmez', async () => {
      const results = await Promise.all(Array.from({ length: 30 }, () =>
        app.inject({ method: 'GET', url: '/auth/legal-documents' })
      ))
      expect(results.every(res => res.statusCode === 200)).toBe(true)
      expect(results.some(res => res.statusCode === 429)).toBe(false)
    })

    it('SPA belge gezinmesini global API kotasına dahil etmez', async () => {
      const results = await Promise.all(Array.from({ length: 30 }, (_, i) =>
        app.inject({
          method: 'GET',
          url: `/app/route-${i}`,
          headers: { accept: 'text/html,application/xhtml+xml' }
        })
      ))
      expect(results.some(res => res.statusCode === 429)).toBe(false)
      expect(results.every(res => res.headers['x-ratelimit-limit'] === undefined)).toBe(true)
    })
  })

  describe('Auth Rate Limiting', () => {
    it('exceeds login rate limit after too many rapid attempts', async () => {
      const requests = Array.from({ length: 12 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/auth/login',
          payload: { email: `rate-test-${i}@test.com`, password: 'wrong' }
        })
      )
      const results = await Promise.all(requests)
      const statusCodes = results.map(r => r.statusCode)
      const errorCount = statusCodes.filter(s => s === 429).length
      expect(errorCount).toBeGreaterThanOrEqual(2)
      for (const res of results) {
        if (res.statusCode === 429) {
          const body = JSON.parse(res.body)
          expect(body).toHaveProperty('error')
          expect(body.error).toBe('Çok kısa sürede fazla istek gönderildi. Birkaç saniye sonra tekrar deneyin.')
          expect(body.code).toBe('RATE_LIMITED')
          expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('AI Mentor Rate Limiting', () => {
    it('genel gezinme kotasından ayrı 30/dakika sınırını korur', async () => {
      const token = app.jwt.sign({ id: 987654321, email: 'rate-only@test.local', role: 'student', tv: 0 })
      const results = []
      for (let i = 0; i < 31; i++) {
        results.push(await app.inject({
          method: 'POST',
          url: '/mentor/chat',
          headers: { authorization: `Bearer ${token}` },
          payload: { message: 'limit doğrulaması' }
        }))
      }
      const first429 = results.findIndex(res => res.statusCode === 429)
      expect(first429, results.map(res => res.statusCode).join(',')).toBe(30)
      expect(Number(results[30].headers['retry-after'])).toBeGreaterThan(0)
    })
  })
})
