import { describe, it, expect } from 'vitest'
import { detectMentorIntent } from '../src/services/mentor-intent'

describe('detectMentorIntent', () => {
  it('detects greetings deterministically', () => {
    const result = detectMentorIntent('Merhaba')
    expect(result.intent).toBe('greeting')
    expect(result.responseMode).toBe('deterministic')
    expect(result.requiresProvider).toBe(false)
    expect(result.requiresRetrieval).toBe(false)
  })

  it('detects farewell-style greetings', () => {
    const result = detectMentorIntent('Görüşürüz')
    expect(result.intent).toBe('greeting')
    expect(result.responseMode).toBe('deterministic')
  })

  it('detects system capability questions', () => {
    const result = detectMentorIntent('Hangi modelle çalışıyorsun?')
    expect(result.intent).toBe('system_capability')
    expect(result.responseMode).toBe('deterministic')
    expect(result.requiresRetrieval).toBe(false)
  })

  it('detects runtime provider questions', () => {
    const result = detectMentorIntent('Ollama mı kullanıyorsun?')
    expect(result.intent).toBe('system_capability')
    expect(result.responseMode).toBe('deterministic')
  })

  it('keeps system_capability even when a knowledge object code is provided', () => {
    const result = detectMentorIntent('Hangi modelle çalışıyorsun?', { knowledgeObjectCode: 'KO-1' })
    expect(result.intent).toBe('system_capability')
  })

  it('detects platform help questions', () => {
    const result = detectMentorIntent('Sohbeti nasıl arşivlerim?')
    expect(result.intent).toBe('platform_help')
    expect(result.responseMode).toBe('provider')
    expect(result.requiresRetrieval).toBe(false)
  })

  it('detects model laboratory help', () => {
    const result = detectMentorIntent('Model laboratuvar nerede?')
    expect(result.intent).toBe('platform_help')
  })

  it('detects business knowledge questions', () => {
    const result = detectMentorIntent('Gelir modeli nedir?')
    expect(result.intent).toBe('business_knowledge')
    expect(result.requiresRetrieval).toBe(true)
    expect(result.requiresProvider).toBe(true)
    expect(result.requiresDisclaimer).toBe(false)
  })

  it('detects financial analysis questions', () => {
    const result = detectMentorIntent('Brüt kâr nasıl hesaplanır?')
    expect(result.intent).toBe('financial_analysis')
    expect(result.requiresRetrieval).toBe(true)
    expect(result.requiresDisclaimer).toBe(true)
  })

  it('detects tax/legal questions', () => {
    const result = detectMentorIntent('KDV nedir?')
    expect(result.intent).toBe('tax_legal')
    expect(result.requiresRetrieval).toBe(true)
    expect(result.requiresDisclaimer).toBe(true)
  })

  it('detects user business data questions', () => {
    const result = detectMentorIntent('Geçen ay cirom neydi?')
    expect(result.intent).toBe('user_business_data')
    expect(result.requiresRetrieval).toBe(false)
    expect(result.requiresMemory).toBe(true)
  })

  it('detects explicit selected knowledge object intent', () => {
    const result = detectMentorIntent('Bunu açıkla', { knowledgeObjectCode: 'KO-SELECTED' })
    expect(result.intent).toBe('selected_knowledge_object')
    expect(result.requiresRetrieval).toBe(true)
    expect(result.requiresProvider).toBe(true)
  })

  it('detects clarification needed for ambiguous short queries', () => {
    const result = detectMentorIntent('öneri')
    expect(result.intent).toBe('clarification_needed')
    expect(result.responseMode).toBe('clarification')
  })

  it('detects clarification needed for "model" word', () => {
    const result = detectMentorIntent('model')
    expect(result.intent).toBe('clarification_needed')
  })

  it('falls back to general_chat for open-ended questions', () => {
    const result = detectMentorIntent('Bana ilham ver')
    expect(result.intent).toBe('general_chat')
    expect(result.responseMode).toBe('provider')
    expect(result.requiresRetrieval).toBe(false)
  })
})
