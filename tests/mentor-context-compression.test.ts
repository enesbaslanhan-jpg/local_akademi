import { describe, it, expect } from 'vitest'
import { formatKnowledgeContext, formatKnowledgeContextForIntent, MAX_KO_COUNT, MAX_TOTAL_CHARS } from '../src/services/retrieval/knowledge-context-formatter'
import type { KnowledgeObjectResult } from '../src/services/retrieval/types'

function makeKO(id: number, content: string, quickAnswer?: string, summary?: string): KnowledgeObjectResult {
  return {
    id,
    title: `KO ${id}`,
    code: `KO-${id}`,
    content,
    quickAnswer: quickAnswer ?? null,
    summary: summary ?? null,
    score: 0.9,
    confidence: 0.9,
    category: { name: 'Kategori' },
    matchedTerms: ['semantic'],
    sourceRefs: [{ sourceId: 's1', title: 'Kaynak', url: null, authorityLevel: 'high' }],
  }
}

describe('context compression', () => {
  it('prefers quickAnswer for business/tax/financial intents', () => {
    const kos = [makeKO(1, 'long content', 'short answer', 'medium summary')]
    const context = formatKnowledgeContextForIntent(kos, 'business_knowledge')
    expect(context).toContain('short answer')
    expect(context).not.toContain('long content')
  })

  it('prefers summary when quickAnswer is missing', () => {
    const kos = [makeKO(1, 'long content', undefined, 'medium summary')]
    const context = formatKnowledgeContextForIntent(kos, 'business_knowledge')
    expect(context).toContain('medium summary')
    expect(context).not.toContain('long content')
  })

  it('gives selected KO more room', () => {
    const kos = [makeKO(1, 'long content', undefined, 'summary')]
    const context = formatKnowledgeContextForIntent(kos, 'selected_knowledge_object')
    expect(context).toContain('summary')
  })

  it('compresses context for user_business_data', () => {
    const kos = [makeKO(1, 'x'.repeat(10000), 'short answer', undefined)]
    const context = formatKnowledgeContextForIntent(kos, 'user_business_data')
    expect(context).toContain('short answer')
    expect(context.length).toBeLessThan(10000)
  })

  it('limits to MAX_KO_COUNT objects', () => {
    const kos = Array.from({ length: 5 }, (_, i) => makeKO(i + 1, 'body', 'answer'))
    const context = formatKnowledgeContext(kos, 'default')
    const matches = context.match(/\[KO-/g) ?? []
    expect(matches.length).toBeLessThanOrEqual(MAX_KO_COUNT)
  })

  it('returns empty string for no objects', () => {
    expect(formatKnowledgeContext([], 'default')).toBe('')
    expect(formatKnowledgeContextForIntent([], 'business_knowledge')).toBe('')
  })

  it('truncates total context to maxTotalChars', () => {
    const kos = Array.from({ length: 5 }, (_, i) => makeKO(i + 1, 'a'.repeat(5000), 'answer'))
    const context = formatKnowledgeContext(kos, 'default')
    expect(context.length).toBeLessThanOrEqual(MAX_TOTAL_CHARS + 200)
    expect(context).toContain('[kesildi]')
  })

  it('marks reference data as untrusted', () => {
    const context = formatKnowledgeContextForIntent([makeKO(1, 'body', 'answer')], 'business_knowledge')
    expect(context).toContain('GÜVENİLMEYEN REFERANS VERİSİ')
  })
})
