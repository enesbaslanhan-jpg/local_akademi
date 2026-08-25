import { describe, it, expect } from 'vitest'
import {
  sanitizeProductImageUrl,
  pickProductImageUrl,
  mapTrendyolContentVariantsToProducts
} from '../../src/services/integrations/marketplaces/trendyol/TrendyolMapper'
import type { TrendyolApprovedContent } from '../../src/services/integrations/marketplaces/trendyol/TrendyolTypes'

/*
 * URUN GORSEL NORMALIZASYONU.
 *
 * Kurallar:
 * - Yalnizca GERCEK https URL'ler kabul edilir (javascript:/data: yasak).
 * - Gorsel yoksa null tasinir; sahte/placeholder URL URETILMEZ
 *   (placeholder yalnizca UI katmanindadir).
 */

function contentWith(overrides: Partial<TrendyolApprovedContent>): TrendyolApprovedContent {
  return {
    contentId: 1,
    title: 'Test Urun',
    variants: [{ barcode: 'BC-IMG', stockCode: 'SC-IMG', onSale: true }],
    ...overrides
  } as TrendyolApprovedContent
}

describe('sanitizeProductImageUrl', () => {
  it('accepts real https urls', () => {
    expect(sanitizeProductImageUrl('https://cdn.dsmcdn.com/ty123/img.jpg')).toBe('https://cdn.dsmcdn.com/ty123/img.jpg')
  })

  it('rejects non-https and malicious schemes', () => {
    expect(sanitizeProductImageUrl('http://cdn.example.com/a.jpg')).toBeNull()
    expect(sanitizeProductImageUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeProductImageUrl('data:image/png;base64,AAAA')).toBeNull()
    expect(sanitizeProductImageUrl('')).toBeNull()
    expect(sanitizeProductImageUrl(null)).toBeNull()
    expect(sanitizeProductImageUrl(42)).toBeNull()
  })

  it('rejects absurdly long urls', () => {
    const long = `https://cdn.example.com/${'a'.repeat(3000)}`
    expect(sanitizeProductImageUrl(long)).toBeNull()
  })
})

describe('pickProductImageUrl', () => {
  it('prefers the first valid entry of images array', () => {
    expect(pickProductImageUrl(contentWith({ images: ['javascript:x', 'https://cdn.ok/1.jpg'] })))
      .toBe('https://cdn.ok/1.jpg')
  })

  it('falls back to legacy imageUrl field', () => {
    expect(pickProductImageUrl(contentWith({ imageUrl: 'https://cdn.legacy/2.jpg' })))
      .toBe('https://cdn.legacy/2.jpg')
  })

  it('returns null when provider sends no image', () => {
    expect(pickProductImageUrl(contentWith({}))).toBeNull()
  })
})

describe('mapTrendyolVariantToProduct image mapping', () => {
  it('carries imageUrl + metadata.images when provider provides them', () => {
    const products = mapTrendyolContentVariantsToProducts(contentWith({
      images: ['https://cdn.ok/main.jpg', 'https://cdn.ok/alt.jpg']
    }))
    expect(products).toHaveLength(1)
    expect(products[0].imageUrl).toBe('https://cdn.ok/main.jpg')
    expect(products[0].metadata?.images).toEqual(['https://cdn.ok/main.jpg', 'https://cdn.ok/alt.jpg'])
  })

  it('keeps imageUrl null (never fabricated) without provider images', () => {
    const products = mapTrendyolContentVariantsToProducts(contentWith({}))
    expect(products[0].imageUrl).toBeNull()
    expect(products[0].metadata?.images).toBeUndefined()
  })
})
