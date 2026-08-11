import type { NewsCategory } from '@prisma/client'

export interface NewsImageMetadata {
  id: string
  path: string
  categories: NewsCategory[]
  tags: string[]
}

const PLACEHOLDER_ROOT = '/assets/news/placeholders'

export const NEWS_IMAGE_LIBRARY: readonly NewsImageMetadata[] = [
  { id: 'finance-credit', path: `${PLACEHOLDER_ROOT}/finance-credit.webp`, categories: ['FINANS'], tags: ['kredi', 'faiz', 'banka', 'finansman'] },
  { id: 'finance-cashflow', path: `${PLACEHOLDER_ROOT}/finance-cashflow.webp`, categories: ['FINANS', 'IS_DUNYASI'], tags: ['nakit', 'ödeme', 'likidite', 'tahsilat'] },
  { id: 'finance-market', path: `${PLACEHOLDER_ROOT}/finance-market.webp`, categories: ['FINANS', 'GENEL_EKONOMI'], tags: ['piyasa', 'sermaye', 'kur', 'enflasyon'] },
  { id: 'tax-digital', path: `${PLACEHOLDER_ROOT}/tax-digital.webp`, categories: ['VERGI', 'DIJITALLESME'], tags: ['e-belge', 'e-fatura', 'dijital vergi'] },
  { id: 'tax-calendar', path: `${PLACEHOLDER_ROOT}/tax-calendar.webp`, categories: ['VERGI'], tags: ['vergi', 'beyanname', 'son tarih', 'ödeme'] },
  { id: 'regulation', path: `${PLACEHOLDER_ROOT}/regulation.webp`, categories: ['MEVZUAT'], tags: ['mevzuat', 'yönetmelik', 'tebliğ', 'karar'] },
  { id: 'business-sme', path: `${PLACEHOLDER_ROOT}/business-sme.webp`, categories: ['IS_DUNYASI'], tags: ['kobi', 'esnaf', 'işletme', 'ticaret'] },
  { id: 'digital', path: `${PLACEHOLDER_ROOT}/digital.webp`, categories: ['DIJITALLESME'], tags: ['dijital', 'veri', 'kvkk', 'teknoloji'] },
  { id: 'support', path: `${PLACEHOLDER_ROOT}/support.webp`, categories: ['DESTEK'], tags: ['destek', 'hibe', 'teşvik', 'kosgeb'] },
  { id: 'economy', path: `${PLACEHOLDER_ROOT}/economy.webp`, categories: ['GENEL_EKONOMI'], tags: ['ekonomi', 'istatistik', 'üretim', 'istihdam'] },
] as const

export function selectNewsImage(
  category: NewsCategory,
  tags: string[],
  recentImageIds: string[] = [],
): NewsImageMetadata {
  const normalizedTags = tags.map(tag => tag.toLocaleLowerCase('tr-TR'))
  const recentPenalty = new Map<string, number>()
  recentImageIds.forEach((id, index) => recentPenalty.set(id, recentImageIds.length - index))

  return [...NEWS_IMAGE_LIBRARY]
    .map((image, index) => ({
      image,
      index,
      score:
        (image.categories.includes(category) ? 10 : 0) +
        image.tags.filter(tag => normalizedTags.some(value => value.includes(tag) || tag.includes(value))).length * 3 -
        (recentPenalty.get(image.id) ?? 0) * 4,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0].image
}

export function getNewsImagePath(imageId: string): string | null {
  return NEWS_IMAGE_LIBRARY.find(image => image.id === imageId)?.path ?? null
}
