import { describe, expect, it } from 'vitest'
import { maskSensitiveData, isValidTckn } from '../src/services/sensitive-data-masker'

/**
 * Maskeleyicinin finans bağlamında kendini kapatmadığını doğrular.
 *
 * Önceki sürümde `isFinancialFigure()` sezgisi, eşleşmenin ±30 karakterinde
 * `tutar|maaş|gelir|TL|₺…` geçiyorsa maskelemeyi iptal ediyordu — yani tam
 * olarak bu uygulamanın normal cümlelerinde PII açık gidiyordu.
 */

/* Sağlama algoritmasını geçen örnek TCKN (gerçek bir kişiye ait değil). */
const GECERLI_TCKN = '10000000146'

describe('isValidTckn', () => {
  it('sağlama algoritmasını geçen numarayı kabul eder', () => {
    expect(isValidTckn(GECERLI_TCKN)).toBe(true)
  })

  it('sıfırla başlayanı reddeder', () => {
    expect(isValidTckn('01234567890')).toBe(false)
  })

  it('kontrol basamağı tutmayanı reddeder', () => {
    expect(isValidTckn('12345678901')).toBe(false)
  })

  it('11 haneden farklı uzunluğu reddeder', () => {
    expect(isValidTckn('1234567890')).toBe(false)
    expect(isValidTckn('123456789012')).toBe(false)
  })
})

describe('finans bağlamı maskelemeyi ARTIK iptal etmiyor', () => {
  it('IBAN "tutar" kelimesinin yanındayken maskelenir', () => {
    const out = maskSensitiveData('Ödenecek tutar TR330006100519786457841326 hesabına yatırılacak.')
    expect(out).not.toContain('TR330006100519786457841326')
    expect(out).toContain('***masked***')
  })

  it('TCKN "maaş" kelimesinin yanındayken maskelenir', () => {
    const out = maskSensitiveData(`Personelin maaş bordrosunda TCKN ${GECERLI_TCKN} yazıyor.`)
    expect(out).not.toContain(GECERLI_TCKN)
  })

  it('e-posta "fiyat" kelimesinin yanındayken maskelenir', () => {
    const out = maskSensitiveData('Fiyat teklifini ahmet.yilmaz@ornek.com adresine gönder.')
    expect(out).not.toContain('ahmet.yilmaz@ornek.com')
  })

  it('telefon "gelir" kelimesinin yanındayken maskelenir', () => {
    const out = maskSensitiveData('Gelir tablosu için 0532 111 22 33 numarasından ara.')
    expect(out).not.toContain('0532 111 22 33')
  })

  it('kart numarası "ödeme" bağlamında maskelenir', () => {
    const out = maskSensitiveData('Ödeme kartı 4111 1111 1111 1111 ile yapıldı, tutar 500 TL.')
    expect(out).not.toContain('4111 1111 1111 1111')
  })
})

describe('yanlış pozitif kontrolü — gerçek rakamlar korunur', () => {
  it('sağlama geçmeyen VE etiketsiz 11 haneli tutar maskelenmez', () => {
    const out = maskSensitiveData('Yıllık ciro 12345678901 TL olarak kaydedildi.')
    expect(out).toContain('12345678901')
  })

  it('sağlama geçmese bile "TCKN" etiketliyse maskelenir (yazım hatası senaryosu)', () => {
    const out = maskSensitiveData('TCKN: 12345678901')
    expect(out).not.toContain('12345678901')
  })

  it('"kimlik no" etiketi de yakalar', () => {
    const out = maskSensitiveData('Çalışanın kimlik no 12345678901 kayıtlarda.')
    expect(out).not.toContain('12345678901')
  })

  it('etiketsiz 10 haneli sayı maskelenmez', () => {
    const out = maskSensitiveData('Toplam bütçe 1234567890 TL.')
    expect(out).toContain('1234567890')
  })

  it('VKN etiketliyse maskelenir', () => {
    const out = maskSensitiveData('Firmanın vergi no 1234567890 olarak görünüyor.')
    expect(out).not.toContain('1234567890')
  })

  it('normal finansal cümle bozulmaz', () => {
    const metin = 'Aylık kira 25.000 TL, kâr marjı %18, nakit pozisyonu 1.250.000 TL.'
    expect(maskSensitiveData(metin)).toBe(metin)
  })
})

describe('anahtar ve kimlik bilgileri', () => {
  it('Bearer token maskelenir', () => {
    const out = maskSensitiveData('Authorization: Bearer abc.def.ghi')
    expect(out).not.toContain('abc.def.ghi')
  })

  it('api_key ataması maskelenir', () => {
    const out = maskSensitiveData('api_key=sk-1234567890abcdef')
    expect(out).not.toContain('sk-1234567890abcdef')
  })

  it('nvapi anahtarı maskelenir', () => {
    const out = maskSensitiveData('nvapi-abcdefghijklmnop kullanılıyor')
    expect(out).not.toContain('nvapi-abcdefghijklmnop')
  })
})
