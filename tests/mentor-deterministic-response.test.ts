import { describe, it, expect } from 'vitest'
import {
  buildDeterministicResponse,
  buildPlatformHelpResponse,
  getStaticDisclaimerForIntent,
  appendDisclaimer,
  FINANCIAL_DISCLAIMER,
  TAX_DISCLAIMER,
  LEGAL_DISCLAIMER,
} from '../src/services/mentor-deterministic-responses'

describe('deterministic responses', () => {
  it('greets with a short Turkish response', () => {
    const result = buildDeterministicResponse('greeting', 'Merhaba')
    expect(result).toContain('Merhaba')
    expect(result).toContain('Size nasıl yardımcı olabilirim')
  })

  it('returns a good evening response', () => {
    const result = buildDeterministicResponse('greeting', 'İyi akşamlar')
    expect(result).toContain('İyi akşamlar')
  })

  it('returns runtime info when available', () => {
    const result = buildDeterministicResponse('system_capability', 'Hangi modelle çalışıyorsun?', { provider: 'ollama', model: 'llama3.2:3b', executionType: 'local' })
    expect(result).toContain('Sağlayıcı: Ollama')
    expect(result).toContain('Model: llama3.2:3b')
    expect(result).toContain('Yerel')
  })

  it('returns an error message when runtime info is missing', () => {
    const result = buildDeterministicResponse('system_capability', 'Hangi modelle çalışıyorsun?')
    expect(result).toContain('çalışma zamanı bilgisi alınamıyor')
  })

  it('returns a clarification for model ambiguity', () => {
    const result = buildDeterministicResponse('clarification_needed', 'model')
    expect(result).toContain('AI modeli')
    expect(result).toContain('İşletme gelir modeli')
  })

  it('returns a generic clarification for other ambiguous input', () => {
    const result = buildDeterministicResponse('clarification_needed', 'öneri')
    expect(result).toContain('Sorunuzu biraz daha açabilir misiniz')
  })
})

describe('platform help', () => {
  it('returns archive help', () => {
    const result = buildPlatformHelpResponse('Sohbeti nasıl arşivlerim?')
    expect(result).toContain('Arşivle')
  })

  it('returns model lab help', () => {
    const result = buildPlatformHelpResponse('Model laboratuvarı nerede?')
    expect(result).toContain('Model Laboratuvarı')
  })

  it('returns null for non-help questions', () => {
    const result = buildPlatformHelpResponse('KDV nedir?')
    expect(result).toBeNull()
  })
})

describe('disclaimers', () => {
  it('selects tax disclaimer for tax/legal intent', () => {
    expect(getStaticDisclaimerForIntent('tax_legal')).toBe(TAX_DISCLAIMER)
  })

  it('selects financial disclaimer for financial analysis', () => {
    expect(getStaticDisclaimerForIntent('financial_analysis')).toBe(FINANCIAL_DISCLAIMER)
  })

  it('returns no disclaimer for business knowledge', () => {
    expect(getStaticDisclaimerForIntent('business_knowledge')).toBeNull()
  })

  it('appends disclaimer once', () => {
    const text = 'Brüt kâr hesabı.'
    const result = appendDisclaimer(text, FINANCIAL_DISCLAIMER)
    expect(result).toContain(FINANCIAL_DISCLAIMER)
    expect(result).not.toContain('\n\n---\n\n\n---\n')
  })

  it('does not duplicate an existing disclaimer', () => {
    const text = `Brüt kâr.\n\n---\n${FINANCIAL_DISCLAIMER}`
    expect(appendDisclaimer(text, FINANCIAL_DISCLAIMER)).toBe(text)
  })

  it('returns content unchanged for null disclaimer', () => {
    expect(appendDisclaimer('Kısa cevap.', null)).toBe('Kısa cevap.')
  })

  it('returns empty string for empty content with disclaimer', () => {
    expect(appendDisclaimer('', FINANCIAL_DISCLAIMER)).toBe('')
  })
})
