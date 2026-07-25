import { describe, expect, it } from 'vitest'
import {
  communityPostSchema,
  officialPostSchema,
} from '../src/services/community'

describe('community post validation', () => {
  it('accepts a concise original user summary', () => {
    expect(
      communityPostSchema.safeParse({
        title: 'KOBİ deneyim paylaşımı',
        summary:
          'Nakit akışı tablosunu haftalık güncellemek tahsilat planımı daha görünür hale getirdi.',
      }).success,
    ).toBe(true)
  })

  it('rejects oversized or empty user content', () => {
    expect(
      communityPostSchema.safeParse({
        title: 'Kısa',
        summary: 'çok kısa',
      }).success,
    ).toBe(false)
    expect(
      communityPostSchema.safeParse({
        title: 'Geçerli başlık',
        summary: 'x'.repeat(1201),
      }).success,
    ).toBe(false)
  })

  it('requires a valid source for official updates', () => {
    expect(
      officialPostSchema.safeParse({
        title: 'Resmî destek güncellemesi',
        summary:
          'Başvuru koşullarındaki değişikliklerin kısa ve özgün özeti burada yer alır.',
        sourceTitle: 'Resmî kurum',
        sourceUrl: 'https://example.gov.tr/duyuru',
      }).success,
    ).toBe(true)
    expect(
      officialPostSchema.safeParse({
        title: 'Resmî destek güncellemesi',
        summary:
          'Başvuru koşullarındaki değişikliklerin kısa ve özgün özeti burada yer alır.',
        sourceTitle: 'Resmî kurum',
        sourceUrl: 'not-a-url',
      }).success,
    ).toBe(false)
  })
})
