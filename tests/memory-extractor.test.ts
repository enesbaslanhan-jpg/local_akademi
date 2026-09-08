import { describe, expect, it } from 'vitest'
import { shouldExtractMemoryFromMessage } from '../src/services/memory/memory-extractor'

describe('memory extraction request gate', () => {
  it.each([
    'Nakit akışı nedir?',
    'KDV oranları hakkında genel bilgi verir misin?',
    'Bana üç pazarlama önerisi ver.',
    'Merhaba, nasılsın?',
  ])('genel sorular için ikinci AI çağrısını çalıştırmaz: %s', message => {
    expect(shouldExtractMemoryFromMessage(message)).toBe(false)
  })

  it.each([
    'İşletmem Ankara’da ve üç çalışanım var.',
    'Aylık cirom 200 bin TL, hedefim bunu artırmak.',
    'Karar verdik, e-ticaret kanalına geçeceğiz.',
    'My business has five employees and my goal is exporting.',
  ])('kalıcı kullanıcı bilgisi için hafıza çıkarımını çalıştırır: %s', message => {
    expect(shouldExtractMemoryFromMessage(message)).toBe(true)
  })
})
