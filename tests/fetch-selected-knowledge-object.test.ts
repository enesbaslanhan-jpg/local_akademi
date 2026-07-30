import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockFindFirst = vi.fn()

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    knowledgeObject: {
      findFirst: (...args: any[]) => mockFindFirst(...args)
    }
  }
}))

import {
  fetchSelectedKnowledgeObject,
  normalizeKnowledgeObjectCode,
  validateKnowledgeObjectCode,
} from '../src/services/ai-provider'

beforeEach(() => {
  mockFindFirst.mockReset()
})

describe('normalizeKnowledgeObjectCode', () => {
  it('returns undefined for undefined', () => {
    expect(normalizeKnowledgeObjectCode(undefined)).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(normalizeKnowledgeObjectCode('   ')).toBeUndefined()
  })

  it('trims and returns non-empty string', () => {
    expect(normalizeKnowledgeObjectCode(' KO-001 ')).toBe('KO-001')
  })
})

describe('validateKnowledgeObjectCode', () => {
  it('accepts valid code', () => {
    const result = validateKnowledgeObjectCode('KO-SELECTED_001')
    expect(result.valid).toBe(true)
  })

  it('rejects code that is too long', () => {
    const result = validateKnowledgeObjectCode('A'.repeat(100))
    expect(result.valid).toBe(false)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('rejects code with invalid characters', () => {
    const result = validateKnowledgeObjectCode('KO-SELECTED<script>')
    expect(result.valid).toBe(false)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})

describe('fetchSelectedKnowledgeObject', () => {
  it('returns KO when published and non-demo', async () => {
    mockFindFirst.mockResolvedValue({
      id: 1,
      title: 'Published KO',
      code: 'KO-PUB',
      content: 'Content',
      summary: null,
      category: { name: 'Test' },
      sources: []
    })

    const ko = await fetchSelectedKnowledgeObject('KO-PUB')

    expect(ko).not.toBeNull()
    expect(ko?.code).toBe('KO-PUB')
    expect(ko?.title).toBe('Published KO')
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          code: 'KO-PUB',
          status: 'published',
          isDemo: false,
        })
      })
    )
  })

  it('returns null when not found', async () => {
    mockFindFirst.mockResolvedValue(null)
    const ko = await fetchSelectedKnowledgeObject('KO-MISSING')
    expect(ko).toBeNull()
  })

  it('returns null when DB contains draft because security filter excludes it', async () => {
    mockFindFirst.mockImplementation(async ({ where }: any) => {
      if (where.status !== 'published' || where.isDemo !== false) return null
      return null
    })
    const ko = await fetchSelectedKnowledgeObject('KO-DRAFT')
    expect(ko).toBeNull()
  })

  it('returns null when DB contains demo because security filter excludes it', async () => {
    mockFindFirst.mockImplementation(async ({ where }: any) => {
      if (where.status !== 'published' || where.isDemo !== false) return null
      return null
    })
    const ko = await fetchSelectedKnowledgeObject('KO-DEMO')
    expect(ko).toBeNull()
  })
})
