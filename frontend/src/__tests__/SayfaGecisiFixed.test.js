import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/*
 * 🔴 SAYFA GEÇİŞİ, UYGULAMADAKİ BÜTÜN AÇILIR MENÜLERİ VE MODALLARI
 * BOZUYORDU.
 *
 * `.pageTransitionAnim` animasyonu `both` dolgu kipiyle tanımlıydı:
 * animasyon bittikten sonra son kare öğenin üzerinde kalıyor, yani
 * `transform: translateY(0)` kalıcı oluyordu. `none` olmayan bir
 * `transform`, içindeki `position: fixed` öğeler için yeni bir referans
 * kutusu yaratır.
 *
 * Bu sarmalayıcı bütün sayfa içeriğini kapsadığı için etki geneldi.
 * Tarayıcıda ölçüldü (09.09.2026): kabuğun içindeki `fixed` bir öğe
 * `top:0;left:0` verilmesine rağmen (241, 111) noktasına düşüyordu —
 * sol ray genişliği ve üst bar yüksekliği kadar kayma. `backwards` ile
 * (0, 0).
 *
 * Kullanıcıya yansıması: Ekip'te rol menüsü ekranın sağ alt köşesinde
 * açılıyordu; Kişiler > Yeni Kişi formunun üstü ekran dışında kalıyordu.
 *
 * ⚠️ Bu bir CSS kuralı; birim testi koşulamıyor. Ama arıza sessiz ve
 * geneldi, geri gelmesi pahalı — desen bozulursa test düşsün.
 */
const css = readFileSync(
  join(__dirname, '..', 'components', 'layout', 'AppLayout.module.css'),
  'utf8',
)

/* Yorum satırları ayıklanıyor: arızayı ANLATAN yorum da `both` içeriyor. */
const kurallar = css
  .replace(/\/\*[\s\S]*?\*\//g, '')

describe('sayfa geçişi — fixed konumlandırmayı bozmamalı', () => {
  it('sarmalayıcı bitişte transform bırakmıyor', () => {
    const kural = kurallar.match(/\.pageTransitionAnim\s*{[^}]*}/)
    expect(kural, '.pageTransitionAnim kuralı bulunamadı').not.toBeNull()
    expect(kural[0]).toMatch(/animation:/)
    /* `both` ve `forwards` son kareyi öğede bırakır. */
    expect(kural[0]).not.toMatch(/\b(both|forwards)\b/)
  })

  it('dolgu kipi tümden kaldırılmamış — ilk karede titreme olmasın', () => {
    /* Dolgusuz bırakılırsa öğe bir kare opak çizilip sonra saydama
       düşer. `backwards` başlangıcı önden uygular, bitişte bırakmaz. */
    const kural = kurallar.match(/\.pageTransitionAnim\s*{[^}]*}/)
    expect(kural[0]).toMatch(/\bbackwards\b/)
  })
})
