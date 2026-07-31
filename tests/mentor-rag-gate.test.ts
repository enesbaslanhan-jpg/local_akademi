import { describe, it, expect } from 'vitest'
import {
  shouldRunKnowledgeRetrieval,
  applyRelevanceGate,
  buildCitations,
  shouldUseMemory,
  shouldSkipOutputReview,
  shouldFetchSelectedKnowledgeObject,
  resolveEffectiveIntent,
} from '../src/services/mentor-rag-gate'
import { detectMentorIntent } from '../src/services/mentor-intent'
import type { KnowledgeObjectResult } from '../src/services/retrieval/types'

function makeKO(id: number, score: number, terms: string[]): KnowledgeObjectResult {
  return {
    id, title: `KO ${id}`, code: `KO-${id}`, content: 'content', score, confidence: score, matchedTerms: terms,
    category: { name: 'Test' }, sourceRefs: [{ sourceId: 's1', title: 'Source', url: null, authorityLevel: 'high' }],
  }
}

describe('RAG gate', () => {
  it('runs retrieval for business/tax/financial/selected intents', () => {
    expect(shouldRunKnowledgeRetrieval('business_knowledge')).toBe(true)
    expect(shouldRunKnowledgeRetrieval('tax_legal')).toBe(true)
    expect(shouldRunKnowledgeRetrieval('financial_analysis')).toBe(true)
    expect(shouldRunKnowledgeRetrieval('selected_knowledge_object')).toBe(true)
  })

  it('skips retrieval for greetings and system questions', () => {
    expect(shouldRunKnowledgeRetrieval('greeting')).toBe(false)
    expect(shouldRunKnowledgeRetrieval('system_capability')).toBe(false)
    expect(shouldRunKnowledgeRetrieval('platform_help')).toBe(false)
  })

  it('uses intent result flag when an object is passed', () => {
    const result = detectMentorIntent('KDV nedir?')
    expect(shouldRunKnowledgeRetrieval(result)).toBe(true)
  })

  it('accepts high-confidence results above threshold', () => {
    const kos = [makeKO(1, 0.95, ['semantic'])]
    const { accepted, rejected } = applyRelevanceGate(kos, 'business_knowledge')
    expect(accepted).toHaveLength(1)
    expect(rejected).toHaveLength(0)
  })

  it('rejects low-confidence results below threshold', () => {
    const kos = [makeKO(1, 0.1, ['semantic'])]
    const { accepted, rejected } = applyRelevanceGate(kos, 'tax_legal')
    expect(accepted).toHaveLength(0)
    expect(rejected).toHaveLength(1)
  })

  it('always accepts exact code matches regardless of score', () => {
    const kos = [makeKO(1, 0.05, ['code:KO-1'])]
    const { accepted } = applyRelevanceGate(kos, 'business_knowledge')
    expect(accepted).toHaveLength(1)
  })

  it('deduplicates knowledge objects by id', () => {
    const ko = makeKO(1, 0.9, ['semantic'])
    const { accepted } = applyRelevanceGate([ko, ko], 'business_knowledge')
    expect(accepted).toHaveLength(1)
  })

  it('limits citations to 3 for relevant intents', () => {
    const kos = Array.from({ length: 5 }, (_, i) => makeKO(i + 1, 0.9, ['semantic']))
    expect(buildCitations(kos, 'business_knowledge')).toHaveLength(3)
  })

  it('omits citations for non-citation intents', () => {
    const kos = [makeKO(1, 0.9, ['semantic'])]
    expect(buildCitations(kos, 'greeting')).toHaveLength(0)
  })

  it('uses memory for user business and financial intents', () => {
    expect(shouldUseMemory('user_business_data')).toBe(true)
    expect(shouldUseMemory('financial_analysis')).toBe(true)
    expect(shouldUseMemory('general_chat')).toBe(true)
  })

  it('does not use memory for greetings or system questions', () => {
    expect(shouldUseMemory('greeting')).toBe(false)
    expect(shouldUseMemory('system_capability')).toBe(false)
  })

  it('skips output review for greetings and financial/business intents', () => {
    expect(shouldSkipOutputReview('greeting')).toBe(true)
    expect(shouldSkipOutputReview('financial_analysis')).toBe(true)
    expect(shouldSkipOutputReview('business_knowledge')).toBe(true)
  })

  it('does not skip output review for tax/legal and selected KO', () => {
    expect(shouldSkipOutputReview('tax_legal')).toBe(false)
    expect(shouldSkipOutputReview('selected_knowledge_object')).toBe(false)
  })

  it('fetches selected KO when a code is provided', () => {
    expect(shouldFetchSelectedKnowledgeObject('business_knowledge', 'KO-1')).toBe(true)
  })

  it('does not fetch selected KO for system capability questions', () => {
    expect(shouldFetchSelectedKnowledgeObject('system_capability', 'KO-1')).toBe(false)
  })

  it('overrides intent to selected_knowledge_object when a code exists', () => {
    const result = detectMentorIntent('Gelir modeli', { knowledgeObjectCode: 'KO-1' })
    expect(resolveEffectiveIntent(result, true)).toBe('selected_knowledge_object')
  })

  it('keeps system capability when a code exists', () => {
    const result = detectMentorIntent('Hangi modelle çalışıyorsun?', { knowledgeObjectCode: 'KO-1' })
    expect(resolveEffectiveIntent(result, true)).toBe('system_capability')
  })
})
