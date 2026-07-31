import { describe, it, expect, vi } from 'vitest'
import { callAiProviderWithRetry } from '../src/services/ai-provider'
import { getStaticDisclaimerForIntent } from '../src/services/mentor-deterministic-responses'
import { shouldSkipOutputReview } from '../src/services/mentor-rag-gate'

const mockGenerateCompletion = vi.fn()

vi.mock('../src/services/ai-gateway', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    generateCompletion: mockGenerateCompletion,
  }
})

vi.mock('../src/services/ai-reviewer', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    runAiReview: vi.fn().mockResolvedValue({ status: 'ok', reason: 'skipped' }),
  }
})

function makeMessages() {
  return [{ role: 'system' as const, content: 'test system' }]
}

describe('disclaimer policy', () => {
  it('selects financial disclaimer for financial analysis', () => {
    expect(getStaticDisclaimerForIntent('financial_analysis')).toContain('finansal bilgilendirme')
  })

  it('selects tax disclaimer for tax/legal intent', () => {
    expect(getStaticDisclaimerForIntent('tax_legal')).toContain('vergi danışmanlığı')
  })

  it('does not select a disclaimer for business knowledge', () => {
    expect(getStaticDisclaimerForIntent('business_knowledge')).toBeNull()
  })

  it('skips output review for financial analysis to avoid false disclaimers', () => {
    expect(shouldSkipOutputReview('financial_analysis')).toBe(true)
  })

  it('keeps output review for tax/legal intent', () => {
    expect(shouldSkipOutputReview('tax_legal')).toBe(false)
  })
})

describe('callAiProviderWithRetry options', () => {
  it('passes skipOutputReview true to the gateway', async () => {
    mockGenerateCompletion.mockResolvedValue({
      content: 'Cevap',
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      provider: 'nvidia',
      model: 'test',
    })

    await callAiProviderWithRetry(makeMessages(), [], { skipOutputReview: true })

    expect(mockGenerateCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ skipOutputReview: true })
    )
  })

  it('passes skipOutputReview false to the gateway by default', async () => {
    mockGenerateCompletion.mockResolvedValue({
      content: 'Cevap',
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      provider: 'nvidia',
      model: 'test',
    })

    await callAiProviderWithRetry(makeMessages())

    expect(mockGenerateCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ skipOutputReview: false })
    )
  })
})
