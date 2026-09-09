import { describe, expect, it } from 'vitest'
import { menuKonumu } from '@/components/ui/Select'

/*
 * AÇILIR MENÜ KONUMU.
 *
 * Bu hesap iki kez arızalandı ve ikisi de ancak ürün sahibi bildirince
 * görüldü. Konum artık saf bir fonksiyon ve test altında.
 */
const EKRAN = { viewportWidth: 1000, viewportHeight: 800 }
const dikdortgen = (o) => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, ...o })

describe('menuKonumu', () => {
  it('menüyü tetikleyicinin altına ve soluyla hizalı koyuyor', () => {
    const k = menuKonumu({
      rect: dikdortgen({ left: 300, top: 100, bottom: 136, width: 200 }),
      menu: dikdortgen({ width: 200, height: 240 }),
      ...EKRAN,
    })
    expect(k.left).toBe(300)
    expect(k.top).toBe(142) // alt + 6px boşluk
    expect(k.width).toBe(200)
  })

  /*
   * 🔴 DAR TETİKLEYİCİ, SAĞ KENAR.
   *
   * Sınır önceden TETİKLEYİCİNİN genişliğiyle hesaplanıyordu. Menünün
   * `min-width: 160px` tabanı olduğu için dar bir tetikleyicide menü
   * ondan geniş çiziliyor ve ekrandan taşıyordu.
   *
   * Ölçüldü (09.09.2026, takvim ay seçici): 75px tetikleyici, 160px
   * menü; menü ekran sağında 43px taşıyor, seçenekler kırpılıyordu.
   */
  it('dar tetikleyicide bile menü ekranın sağından taşmıyor', () => {
    const k = menuKonumu({
      rect: dikdortgen({ left: 900, top: 100, bottom: 136, width: 75 }),
      menu: dikdortgen({ width: 160, height: 200 }),
      ...EKRAN,
    })
    expect(k.width).toBe(160)
    expect(k.left + k.width).toBeLessThanOrEqual(EKRAN.viewportWidth - 12)
  })

  it('sol kenarda da taşmıyor', () => {
    const k = menuKonumu({
      rect: dikdortgen({ left: 2, top: 100, bottom: 136, width: 60 }),
      menu: dikdortgen({ width: 160, height: 200 }),
      ...EKRAN,
    })
    expect(k.left).toBeGreaterThanOrEqual(12)
  })

  it('menü ekrandan genişse ekrana sığdırılıyor', () => {
    const k = menuKonumu({
      rect: dikdortgen({ left: 10, top: 100, bottom: 136, width: 2000 }),
      menu: dikdortgen({ width: 2000, height: 200 }),
      ...EKRAN,
    })
    expect(k.width).toBe(EKRAN.viewportWidth - 24)
    expect(k.left).toBe(12)
  })

  it('altta yer yoksa yukarı açılıyor', () => {
    /* Tetikleyici ekranın dibinde: menü altta sığmıyor, üstte sığıyor. */
    const k = menuKonumu({
      rect: dikdortgen({ left: 300, top: 700, bottom: 740, width: 200 }),
      menu: dikdortgen({ width: 200, height: 300 }),
      ...EKRAN,
    })
    expect(k.top).toBe(700 - 6 - 300)
  })

  it('yukarı açılırken de ekranın üstünden taşmıyor', () => {
    const k = menuKonumu({
      rect: dikdortgen({ left: 300, top: 60, bottom: 96, width: 200 }),
      menu: dikdortgen({ width: 200, height: 700 }),
      ...EKRAN,
    })
    expect(k.top).toBeGreaterThanOrEqual(12)
  })
})
