import { describe, expect, it } from 'vitest'
import { expandDomainQuery } from '../src/services/retrieval'

describe('Turkish domain query expansion', () => {
  it('bridges everyday cash wording to curriculum terms', () => {
    expect(
      expandDomainQuery('Satış yaptığım halde kasam neden boş kalıyor?'),
    ).toContain('kâr nakit arasındaki fark')
  })

  it('bridges account security wording', () => {
    expect(
      expandDomainQuery(
        'Hesap güvenliğini parolaya ek ikinci doğrulama ile nasıl güçlendiririm?',
      ),
    ).toContain('çok faktörlü kimlik doğrulama')
  })

  it('leaves unrelated queries unchanged', () => {
    const query = 'Bugün ne öğrenmeliyim?'
    expect(expandDomainQuery(query)).toBe(query)
  })

  it('is deterministic', () => {
    const query = 'Birden fazla borcu hangi sırayla kapatmalıyım?'
    expect(expandDomainQuery(query)).toBe(expandDomainQuery(query))
  })
})
