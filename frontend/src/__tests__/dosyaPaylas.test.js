import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { paylasabilirMi, dosyaPaylas } from '@/utils/dosyaPaylas'

/*
 * DOSYA PAYLAŞMA.
 *
 * 🔴 GERÇEK BİR GERİ BİLDİRİMİ KAPATIYOR (23.08.2026).
 *
 * Paylaş düğmesi her ortamda çiziliyordu. Masaüstü tarayıcılar dosya
 * paylaşımını desteklemediği için ürün sahibi her basışında
 * "paylaşım menüsü yok; kayıt indirildi" uyarısı aldı -- yani düğme
 * her seferinde özür diliyordu.
 *
 * Yapamayacağı şeyi vaat eden bir düğme, hiç olmayan düğmeden kötüdür.
 * `paylasabilirMi` arayüzün düğmeyi ancak gerçekten çalışacaksa
 * çizmesini sağlıyor.
 */

const orjinalNavigator = globalThis.navigator

function navigatorKur(deger) {
  Object.defineProperty(globalThis, 'navigator', {
    value: deger, configurable: true, writable: true
  })
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => navigatorKur(orjinalNavigator))

const pdf = () => new File([new Blob(['x'], { type: 'application/pdf' })], 'a.pdf', { type: 'application/pdf' })

describe('paylasabilirMi', () => {
  it('share ve canShare varsa ve dosyayı kabul ediyorsa true', () => {
    navigatorKur({ share: vi.fn(), canShare: () => true })
    expect(paylasabilirMi()).toBe(true)
  })

  /* Masaüstünün olağan durumu: API var ama DOSYA kabul etmiyor. */
  it('canShare dosyayı reddediyorsa false', () => {
    navigatorKur({ share: vi.fn(), canShare: () => false })
    expect(paylasabilirMi()).toBe(false)
  })

  it('share hiç yoksa false', () => {
    navigatorKur({})
    expect(paylasabilirMi()).toBe(false)
  })

  /* `canShare` fırlatırsa da çökmemeli. */
  it('canShare hata fırlatırsa false döner, çökmez', () => {
    navigatorKur({ share: vi.fn(), canShare: () => { throw new Error('desteklenmiyor') } })
    expect(paylasabilirMi()).toBe(false)
  })
})

describe('dosyaPaylas', () => {
  it('paylaşım varsa menüye verir', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    navigatorKur({ share, canShare: () => true })
    expect(await dosyaPaylas(pdf(), { baslik: 'Fatura' })).toBe('paylasildi')
    expect(share).toHaveBeenCalled()
  })

  /*
   * 🔴 İPTAL HATA DEĞİLDİR. Kullanıcı paylaşım menüsünü kapattığında
   * tarayıcı `AbortError` fırlatıyor; bunu hata saymak, kullanıcının
   * kendi kararına "başarısız oldu" demek olurdu.
   */
  it('kullanıcı vazgeçerse iptal döner, indirme yapılmaz', async () => {
    const hata = new Error('vazgeçildi')
    hata.name = 'AbortError'
    navigatorKur({ share: vi.fn().mockRejectedValue(hata), canShare: () => true })

    const tikla = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(await dosyaPaylas(pdf())).toBe('iptal')
    expect(tikla).not.toHaveBeenCalled()
    tikla.mockRestore()
  })

  it('paylaşım yoksa indirmeye düşer', async () => {
    navigatorKur({ canShare: () => false })
    const tikla = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(await dosyaPaylas(pdf())).toBe('indirildi')
    expect(tikla).toHaveBeenCalled()
    tikla.mockRestore()
  })

  /* Menü açıldı ama başarısız oldu: kullanıcı dosyayı yine de alsın. */
  it('paylaşım beklenmedik şekilde düşerse dosya indirilir', async () => {
    navigatorKur({ share: vi.fn().mockRejectedValue(new Error('kırıldı')), canShare: () => true })
    const tikla = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(await dosyaPaylas(pdf())).toBe('indirildi')
    expect(tikla).toHaveBeenCalled()
    tikla.mockRestore()
  })
})
