import { describe, it, expect } from 'vitest'
import { getPromptProfile, getProviderParameters, shouldIncludeCitations, shouldSkipOutputReview } from '../src/services/mentor-prompt-profile'

describe('Mentor Prompt Profile', () => {
  it('business_knowledge doğru profile gider', () => {
    const profile = getPromptProfile('business_knowledge')
    expect(profile.name).toBe('business_knowledge')
  })

  it('financial_analysis doğru profile gider', () => {
    const profile = getPromptProfile('financial_analysis')
    expect(profile.name).toBe('financial_analysis')
  })

  it('tax_legal doğru profile gider', () => {
    const profile = getPromptProfile('tax_legal')
    expect(profile.name).toBe('tax_legal')
  })

  it('selected_knowledge_object doğru profile gider', () => {
    const profile = getPromptProfile('selected_knowledge_object')
    expect(profile.name).toBe('selected_knowledge_object')
  })

  it('conversation_control/rewrite doğru profile gider', () => {
    const profile = getPromptProfile('conversation_control')
    expect(profile.name).toBe('conversation_rewrite')
  })

  it('her profil merkezi maxOutputTokens kullanır', () => {
    const params = getProviderParameters('business_knowledge')
    expect(params.maxOutputTokens).toBeDefined()
  })

  it('temperature profil bazlı güvenli aralıktadır', () => {
    const params = getProviderParameters('business_knowledge')
    expect(params.temperature).toBeGreaterThanOrEqual(0.1)
    expect(params.temperature).toBeLessThanOrEqual(0.7)
  })

  it('kısa cevap isteği output budgetı düşürür', () => {
    const shortParams = getProviderParameters('business_knowledge', { userRequestedLength: 'short' })
    const longParams = getProviderParameters('business_knowledge', { userRequestedLength: 'detailed' })
    expect(shortParams.maxOutputTokens).toBeLessThan(longParams.maxOutputTokens)
  })

  it('global maksimum aşılmaz', () => {
    const params = getProviderParameters('default')
    expect(params.maxOutputTokens).toBeLessThanOrEqual(2048)
  })

  it('tax/legal profili gereksiz yüksek temperature kullanmaz', () => {
    const params = getProviderParameters('tax_legal')
    expect(params.temperature).toBeLessThanOrEqual(0.3)
  })
})
