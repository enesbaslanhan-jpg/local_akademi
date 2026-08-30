import type { FastifyRequest } from 'fastify'

export type ContentLanguage = 'tr' | 'en'

/**
 * İçerik dili arayüz dilinden gelir. Türkçe veritabanındaki kaynak metin
 * olarak korunur; yalnız İngilizce isteyen isteklere İngilizce görünüm
 * döndürülür. Bilinmeyen/eksik değerler güvenli biçimde Türkçeye düşer.
 */
export function contentLanguage(request: FastifyRequest): ContentLanguage {
  const raw = request.headers['accept-language']
  const value = Array.isArray(raw) ? raw[0] : raw
  return /^\s*en(?:-|,|;|\s|$)/i.test(value || '') ? 'en' : 'tr'
}

export function localized<T>(
  original: T,
  english: T | null | undefined,
  language: ContentLanguage,
): T {
  return language === 'en' && english != null ? english : original
}
