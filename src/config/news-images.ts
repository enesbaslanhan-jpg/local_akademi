import type { NewsCategory } from '@prisma/client'

/*
 * Haber GÖRSEL KİMLİĞİ seçimi — artık bir dosyaya değil, bir renge karşılık
 * geliyor.
 *
 * Bu dosya eskiden `/assets/news/placeholders/*.webp` yollarını üretiyordu
 * ama o görseller HİÇ ÜRETİLMEMİŞTİ. İstekler SPA yedeğine düşüp
 * `index.html` döndürüyor, tarayıcı çizemeyince arayüzde renkli boş bloklar
 * kalıyordu. Yolları taşımayı sürdürmek, var olmayan dosyaları var gibi
 * göstermekti; kaldırıldı.
 *
 * Seçim mantığının kendisi (kategori + etiket puanlaması, art arda aynı
 * kimliği vermeyen ceza) sağlam ve işe yarıyor: arayüzde haberlerin
 * birbirinden ayrışan bir zemin rengi olmasını sağlıyor. O yüzden duruyor.
 *
 * Gerçek illüstrasyon eklenecekse `path` alanı bilinçli olarak geri
 * konmalı — ve dosyalar gerçekten üretilmeli.
 */
export interface NewsImageMetadata {
  id: string
  categories: NewsCategory[]
  tags: string[]
}

export const NEWS_IMAGE_LIBRARY: readonly NewsImageMetadata[] = [
  { id: 'finance-credit', categories: ['FINANS'], tags: ['kredi', 'faiz', 'banka', 'finansman'] },
  { id: 'finance-cashflow', categories: ['FINANS', 'IS_DUNYASI'], tags: ['nakit', 'ödeme', 'likidite', 'tahsilat'] },
  { id: 'finance-market', categories: ['FINANS', 'GENEL_EKONOMI'], tags: ['piyasa', 'sermaye', 'kur', 'enflasyon'] },
  { id: 'tax-digital', categories: ['VERGI', 'DIJITALLESME'], tags: ['e-belge', 'e-fatura', 'dijital vergi'] },
  { id: 'tax-calendar', categories: ['VERGI'], tags: ['vergi', 'beyanname', 'son tarih', 'ödeme'] },
  { id: 'regulation', categories: ['MEVZUAT'], tags: ['mevzuat', 'yönetmelik', 'tebliğ', 'karar'] },
  { id: 'business-sme', categories: ['IS_DUNYASI'], tags: ['kobi', 'esnaf', 'işletme', 'ticaret'] },
  { id: 'digital', categories: ['DIJITALLESME'], tags: ['dijital', 'veri', 'kvkk', 'teknoloji'] },
  { id: 'support', categories: ['DESTEK'], tags: ['destek', 'hibe', 'teşvik', 'kosgeb'] },
  { id: 'economy', categories: ['GENEL_EKONOMI'], tags: ['ekonomi', 'istatistik', 'üretim', 'istihdam'] },
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
