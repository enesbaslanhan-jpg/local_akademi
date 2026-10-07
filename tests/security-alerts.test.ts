import { describe, expect, it, vi } from 'vitest'
import { createSecurityEventMonitor } from '../src/services/security-alerts'

describe('bounded security activity detection', () => {
  it('does not label four signups as an attack, warns once at ten', () => {
    const notify = vi.fn()
    const observe = createSecurityEventMonitor(notify)
    for (let i = 0; i < 4; i++) observe('user.registered_social', { provider: 'google' })
    expect(notify).not.toHaveBeenCalled()
    for (let i = 0; i < 20; i++) observe('user.registered')
    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledWith({ event: 'SECURITY_ACTIVITY_ALERT', kind: 'signup_burst', count: 10, windowMinutes: 15 })
  })
  it('separates source addresses and shares password/social failure detection', () => {
    const notify = vi.fn()
    const observe = createSecurityEventMonitor(notify)
    for (let i = 0; i < 9; i++) observe('auth.login_failed', { ip: '203.0.113.1' })
    observe('auth.login_failed', { ip: '203.0.113.2' })
    expect(notify).not.toHaveBeenCalled()
    observe('auth.social_rejected', { ip: '203.0.113.1', token: 'not-in-alert' })
    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify.mock.calls[0][0]).not.toHaveProperty('token')
    expect(notify.mock.calls[0][0]).not.toHaveProperty('ip')
  })
  it('resets expired windows and ignores ordinary activity', () => {
    let clock = 0
    const notify = vi.fn()
    const observe = createSecurityEventMonitor(notify, () => clock)
    for (let i = 0; i < 9; i++) observe('auth.login_failed', { ip: '203.0.113.1' })
    clock = 15 * 60_000
    observe('auth.login_failed', { ip: '203.0.113.1' })
    for (let i = 0; i < 30; i++) observe('community.post.created')
    expect(notify).not.toHaveBeenCalled()
  })
})
