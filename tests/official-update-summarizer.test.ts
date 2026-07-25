import { describe, expect, it, vi } from 'vitest'
import {
  generateOfficialSummary,
  officialSummaryRequestSchema,
  officialSummarySchema,
} from '../src/services/official-update-summarizer'

const request = {
  sourceTitle: 'Resmî kurum',
  sourceUrl: 'https://example.gov.tr/duyuru',
  sourceText:
    'Resmî kurum tarafından yayımlanan bu duyuruda başvuru dönemine ilişkin koşullar ve tarihler açıklanmaktadır. Başvurular kurumun resmî sistemi üzerinden alınacaktır.',
}

describe('official update summarizer', () => {
  it('accepts only bounded HTTP(S) source requests', () => {
    expect(officialSummaryRequestSchema.safeParse(request).success).toBe(true)
    expect(
      officialSummaryRequestSchema.safeParse({
        ...request,
        sourceUrl: 'file:///etc/passwd',
      }).success,
    ).toBe(false)
    expect(
      officialSummaryRequestSchema.safeParse({
        ...request,
        sourceText: 'kısa',
      }).success,
    ).toBe(false)
  })

  it('requires an original bounded summary', () => {
    expect(
      officialSummarySchema.safeParse({
        title: 'Başvuru dönemi güncellendi',
        summary:
          'Kurum, başvuru dönemine ilişkin koşulları resmî duyurusunda açıkladı. Başvurular resmî sistem üzerinden alınacak.',
      }).success,
    ).toBe(true)
    expect(
      officialSummarySchema.safeParse({
        title: 'Başlık',
        summary: 'çok kısa',
      }).success,
    ).toBe(false)
  })

  it('validates local provider output before returning it', async () => {
    const output = {
      title: 'Başvuru dönemi güncellendi',
      summary:
        'Kurum, başvuru dönemine ilişkin koşulları resmî duyurusunda açıkladı. Başvurular resmî sistem üzerinden alınacak.',
    }
    const provider = {
      summarize: vi.fn(async () => output),
    }
    await expect(
      generateOfficialSummary(request, provider),
    ).resolves.toEqual(output)
    expect(provider.summarize).toHaveBeenCalledOnce()
  })
})
