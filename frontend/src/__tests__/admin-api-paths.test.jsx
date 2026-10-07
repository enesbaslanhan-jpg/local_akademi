import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../services/api'

afterEach(() => vi.restoreAllMocks())

describe('admin API namespace', () => {
  it.each([
    ['getStats', ['30d'], '/api/admin/stats?period=30d'],
    ['getReviewerMetrics', [], '/api/admin/ai-reviewer/metrics'],
    ['getReviewerHealth', [], '/api/admin/ai-reviewer/health'],
    ['generateQuizDraft', [7], '/api/admin/quiz-generator/7/draft'],
    ['publishQuizDraft', [7], '/api/admin/quiz-generator/7/publish'],
    ['listUsers', [], '/api/admin/users'],
    ['updateUserRole', [7, 'learner'], '/api/admin/users/7/role'],
    ['suspendUser', [7], '/api/admin/users/7/suspend'],
    ['unsuspendUser', [7], '/api/admin/users/7/unsuspend'],
    ['anonymizeUser', [7], '/api/admin/users/7/anonymize'],
    ['getAuditLogs', [{ actorId: 17 }], '/api/admin/audit-logs?actorId=17'],
  ])('%s uses the API path, not the page URL', async (method, args, path) => {
    const request = vi.spyOn(api, 'request').mockResolvedValue({})
    await api.admin[method](...args)
    expect(request.mock.calls[0][0]).toBe(path)
  })
})
