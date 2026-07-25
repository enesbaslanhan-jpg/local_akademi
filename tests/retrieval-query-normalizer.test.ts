import { describe, it, expect } from 'vitest'
import { normalizeQuery } from '../src/services/retrieval/query-normalizer'

describe('normalizeQuery — NormalizedRetrievalQuery shape', () => {
  it('returns object with original, normalized, phrase, tokens', () => {
    const r = normalizeQuery('ŞİRKET')
    expect(r).toHaveProperty('original')
    expect(r).toHaveProperty('normalized')
    expect(r).toHaveProperty('phrase')
    expect(r).toHaveProperty('tokens')
  })
})

describe('normalizeQuery — Turkish locale', () => {
  it('İ -> i', () => {
    expect(normalizeQuery('İ').normalized).toBe('i')
  })

  it('I -> ı', () => {
    expect(normalizeQuery('I').normalized).toBe('ı')
  })

  it('Ş -> ş', () => {
    expect(normalizeQuery('Ş').normalized).toBe('ş')
  })

  it('Ç -> ç', () => {
    expect(normalizeQuery('Ç').normalized).toBe('ç')
  })

  it('Ğ -> ğ', () => {
    expect(normalizeQuery('Ğ').normalized).toBe('ğ')
  })

  it('Ö -> ö', () => {
    expect(normalizeQuery('Ö').normalized).toBe('ö')
  })

  it('Ü -> ü', () => {
    expect(normalizeQuery('Ü').normalized).toBe('ü')
  })

  it('ŞİRKET -> şirket', () => {
    const r = normalizeQuery('ŞİRKET')
    expect(r.normalized).toBe('şirket')
    expect(r.tokens).toEqual(['şirket'])
  })

  it('IŞIK -> ışık', () => {
    const r = normalizeQuery('IŞIK')
    expect(r.normalized).toBe('ışık')
    expect(r.tokens).toEqual(['ışık'])
  })

  it('İSTANBUL -> istanbul', () => {
    expect(normalizeQuery('İSTANBUL').normalized).toBe('istanbul')
  })

  it('lowercase passes through unchanged', () => {
    expect(normalizeQuery('şirket').normalized).toBe('şirket')
    expect(normalizeQuery('ışık').normalized).toBe('ışık')
  })
})

describe('normalizeQuery — punctuation removal', () => {
  it('removes ?', () => {
    const r = normalizeQuery('ŞİRKET NEDİR?')
    expect(r.normalized).toBe('şirket nedir')
    expect(r.tokens).toEqual(['şirket', 'nedir'])
  })

  it('removes punctuation but keeps Turkish chars', () => {
    const r = normalizeQuery('şirket kurulumu için?')
    expect(r.normalized).toBe('şirket kurulumu için')
    expect(r.tokens).toContain('şirket')
    expect(r.tokens).toContain('kurulumu')
    expect(r.tokens).not.toContain('için')
  })
})

describe('normalizeQuery — stop words', () => {
  it('filters stop words from tokens', () => {
    const r = normalizeQuery('şirket kurulumu için gerekenler')
    expect(r.tokens).toContain('şirket')
    expect(r.tokens).toContain('kurulumu')
    expect(r.tokens).toContain('gerekenler')
    expect(r.tokens).not.toContain('için')
  })

  it('stop-word-only query returns empty tokens', () => {
    const r = normalizeQuery('ve veya ile')
    expect(r.tokens).toHaveLength(0)
  })
})

describe('normalizeQuery — limits', () => {
  it('trims whitespace', () => {
    expect(normalizeQuery('  ŞİRKET  ').normalized).toBe('şirket')
  })

  it('empty string returns empty tokens', () => {
    const r = normalizeQuery('')
    expect(r.normalized).toBe('')
    expect(r.tokens).toHaveLength(0)
  })

  it('single-char tokens are filtered (min length 2)', () => {
    const r = normalizeQuery('a b c şirket')
    expect(r.tokens).toEqual(['şirket'])
  })

  it('preserves original text separately', () => {
    const r = normalizeQuery('  ŞİRKET KURULUMU  ')
    expect(r.original).toBe('ŞİRKET KURULUMU')
    expect(r.normalized).not.toBe(r.original)
  })
})

describe('normalizeQuery — determinism', () => {
  it('same input always produces same output', () => {
    const input = 'ŞİRKET KURULUMU IÇIN GEREKENLER'
    const first = normalizeQuery(input)
    const second = normalizeQuery(input)
    expect(first).toStrictEqual(second)
  })
})

describe('normalizeQuery — NFKC normalization', () => {
  it('normalizes compatible Unicode characters', () => {
    const r = normalizeQuery('\ufb00nansiye')  // ﬀ (FF ligature)
    expect(r.normalized).not.toContain('\ufb00')
  })
})
