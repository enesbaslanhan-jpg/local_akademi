import type { NormalizedRetrievalQuery } from './types'

const TURKISH_UPPER_TO_LOWER: Record<string, string> = {
  'İ': 'i',
  'I': 'ı',
  'Ş': 'ş',
  'Ç': 'ç',
  'Ğ': 'ğ',
  'Ö': 'ö',
  'Ü': 'ü',
}

const STOP_WORDS = new Set([
  've', 'ile', 'bir', 'bu', 'şu', 'o', 'için', 'olarak',
  'olan', 'daha', 'en', 'çok', 'az', 'veya', 'ya', 'da',
  'ama', 'ancak', 'fakat', 'lakin', 'çünkü', 'eğer',
  'ne', 'ki', 'de', 'mi', 'mu', 'mı',
  'gibi', 'kadar', 'sonra', 'önce', 'üzerine',
  'hangi', 'nasıl', 'neden', 'niçin', 'kim',
  'her', 'hiç', 'tüm', 'bazı', 'kendi',
  'ise', 'hem', 'karşı', 'diğer', 'gereken',
  'yani', 'üzere', 'doğru', 'altında', 'arasında',
  'birlikte', 'ayrıca', 'hemen', 'yine', 'gene',
  'nerede', 'nereden', 'nereye', 'kime', 'kimden',
  'şey', 'şeyler', 'yer',  'zaman',
  'acaba', 'yoksa', 'oysa', 'madem',
  'belki', 'kesin', 'sadece', 'yalnızca',
  'tek', 'başka', 'tüm', 'bütün',
  '2', '3', '4', '5', '6', '7', '8', '9', '0',
])

const MAX_INPUT_LENGTH = 500
const MAX_TOKENS = 20
const MIN_TOKEN_LENGTH = 2

export { MAX_INPUT_LENGTH, MAX_TOKENS, MIN_TOKEN_LENGTH }

export function normalizeQuery(text: string): NormalizedRetrievalQuery {
  const original = text.trim()

  const truncated = original.slice(0, MAX_INPUT_LENGTH)

  let result = truncated
  for (const [upper, lower] of Object.entries(TURKISH_UPPER_TO_LOWER)) {
    result = result.split(upper).join(lower)
  }

  result = result.normalize('NFKC')

  result = result.toLocaleLowerCase('tr-TR')

  result = result.replace(/[^\w\sçğıöşüa-z0-9-]/g, ' ').replace(/\s+/g, ' ').trim()

  const rawTokens = result.split(/\s+/).filter(t => t.length >= MIN_TOKEN_LENGTH)

  const seen = new Set<string>()
  const tokens: string[] = []
  for (const t of rawTokens) {
    if (!STOP_WORDS.has(t) && !seen.has(t)) {
      seen.add(t)
      tokens.push(t)
    }
  }

  const finalTokens = tokens.slice(0, MAX_TOKENS)

  return {
    original,
    normalized: result,
    phrase: result,
    tokens: finalTokens,
  }
}
