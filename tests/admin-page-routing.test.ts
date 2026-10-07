import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../src/lib/prisma'

let app: FastifyInstance
const previousEnv = process.env.NODE_ENV

beforeAll(async () => {
  // Exercise the actual SPA fallback, disabled in NODE_ENV=test.
  process.env.NODE_ENV = 'development'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()
})

afterAll(async () => {
  await app?.close()
  process.env.NODE_ENV = previousEnv
})
afterEach(() => vi.restoreAllMocks())

describe('admin document and API separation', () => {
  it.each(['/admin', '/admin/dashboard', '/admin/users', '/admin/audit-logs', '/admin/community', '/admin/knowledge/new'])('%s loads the SPA on direct navigation/reload', async url => {
    const response = await app.inject({ url, headers: { accept: 'text/html' } })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')
    expect(response.body).toMatch(/<html/i)
    expect(response.body).not.toContain('"error":"Unauthorized"')
  })

  it.each(['/api/admin/audit-logs', '/api/admin/users', '/api/admin/stats'])('%s remains protected even with HTML Accept', async url => {
    const response = await app.inject({ url, headers: { accept: 'text/html' } })
    expect(response.statusCode).toBe(401)
    expect(response.headers['content-type']).toContain('application/json')
    expect(response.json().error).toBe('Unauthorized')
  })

  it('unknown admin API is JSON 404, never the SPA', async () => {
    const response = await app.inject({ url: '/api/admin/missing', headers: { accept: 'text/html' } })
    expect(response.statusCode).toBe(404)
    expect(response.json().path).toBe('/api/admin/missing')
  })

  it('old JSON API requests fail explicitly rather than receiving HTML', async () => {
    const response = await app.inject({ url: '/admin/audit-logs', headers: { accept: 'application/json' } })
    expect(response.statusCode).toBe(404)
    expect(response.headers['content-type']).toContain('application/json')
  })

  it('moving the API preserves the server-side admin role check', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 42, email: 'test@example.invalid', role: 'learner', deletedAt: null, tokenVersion: 0 } as any)
    // Even a stale token claiming admin must use the current database role.
    const token = app.jwt.sign({ id: 42, role: 'admin', tv: 0 })
    const response = await app.inject({ url: '/api/admin/audit-logs', headers: { authorization: `Bearer ${token}` } })
    expect(response.statusCode).toBe(403)
    expect(response.json().error).toBe('Admin access required')
  })
})
