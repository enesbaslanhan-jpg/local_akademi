import { describe, it, expect } from 'vitest'
import { getSafeErrorMessage } from './MentorErrorAlert'

describe('safe mentor gateway errors', () => {
  it('maps unavailable code to localization rather than upstream details', () => {
    const t = key => key
    expect(getSafeErrorMessage('AI_MENTOR_TEMPORARILY_UNAVAILABLE',t)).toBe('errors.mentorTemporarilyUnavailable')
    expect(getSafeErrorMessage('AI Mentor şu anda yanıt veremiyor. Birkaç dakika sonra tekrar deneyebilirsin.',t)).toBe('errors.mentorTemporarilyUnavailable')
    expect(getSafeErrorMessage('provider 500 private response',t)).not.toContain('private')
  })
})
