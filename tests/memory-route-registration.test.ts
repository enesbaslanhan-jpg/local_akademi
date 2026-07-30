import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import build from '../src/index'

const TEST_JWT_SECRET = 'test-secret-key-min-32-bytes-long!!'

describe('Memory API route registration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: TEST_JWT_SECRET }
    delete process.env.ENABLE_MEMORY_API
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('ENABLE_MEMORY_API tanımsızken /api/memory route kayıtlıdır', async () => {
    delete process.env.ENABLE_MEMORY_API
    const app = await build()
    const res = await app.inject({ method: 'GET', url: '/api/memory' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('ENABLE_MEMORY_API=true iken /api/memory route kayıtlıdır', async () => {
    process.env.ENABLE_MEMORY_API = 'true'
    const app = await build()
    const res = await app.inject({ method: 'GET', url: '/api/memory' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('ENABLE_MEMORY_API=false iken /api/memory route kayıtlı değildir', async () => {
    process.env.ENABLE_MEMORY_API = 'false'
    const app = await build()
    const res = await app.inject({ method: 'GET', url: '/api/memory' })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})
