import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { createAuditLog } from '../src/services/audit'

describe('security audit metadata', () => {
  it('preserves investigation fields without retaining secrets', async () => {
    const create = vi.fn().mockResolvedValue({ id: 1 })
    await createAuditLog({ action: 'auth.login_failed', entityType: 'user', actorId: 1,
      metadata: { ip: '203.0.113.10', attempt: 3, userAgent: 'browser', privateRelay: false,
        password: 'never-store', token: 'never-store', body: 'private-message' }
    }, { auditLog: { create } } as unknown as PrismaClient)
    expect(JSON.parse(create.mock.calls[0][0].data.metadata)).toEqual({
      ip: '203.0.113.10', attempt: 3, userAgent: 'browser', privateRelay: false
    })
  })
  it('bounds stored strings', async () => {
    const create = vi.fn().mockResolvedValue({ id: 1 })
    await createAuditLog({ action: 'auth.login', entityType: 'user', actorId: 1,
      metadata: { userAgent: 'a'.repeat(1000) }
    }, { auditLog: { create } } as unknown as PrismaClient)
    expect(JSON.parse(create.mock.calls[0][0].data.metadata).userAgent).toHaveLength(500)
  })
  it('reports persistence failure without leaking database errors or metadata', async () => {
    const error = new Error('secret database connection')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(createAuditLog({ action: 'auth.login', entityType: 'user', actorId: 1 },
        { auditLog: { create: vi.fn().mockRejectedValue(error) } } as unknown as PrismaClient
      )).rejects.toBe(error)
      expect(log).toHaveBeenCalledWith(JSON.stringify({ event: 'SECURITY_AUDIT_WRITE_FAILED', action: 'auth.login' }))
    } finally { log.mockRestore() }
  })
})
