import { describe, expect, it } from 'vitest'
import { normalizeSourceUrl } from '../src/services/sources.js'

describe('source URL normalization', () => {
  it('preserves case-sensitive path and query values', () => {
    expect(normalizeSourceUrl('HTTPS://Example.COM/Files/OfficialGuide.PDF?objectKey=CaseSensitive'))
      .toBe('https://example.com/Files/OfficialGuide.PDF?objectKey=CaseSensitive')
  })

  it('removes fragments and trailing path slashes', () => {
    expect(normalizeSourceUrl('https://Example.com/Guide/#section'))
      .toBe('https://example.com/Guide')
  })

  it('normalizes a root URL without a trailing slash', () => {
    expect(normalizeSourceUrl('https://Example.com/'))
      .toBe('https://example.com')
  })

  it('rejects non-http protocols', () => {
    expect(() => normalizeSourceUrl('file:///tmp/source.pdf')).toThrow()
  })

  it('rejects invalid URLs', () => {
    expect(() => normalizeSourceUrl('not a url')).toThrow()
  })
})
