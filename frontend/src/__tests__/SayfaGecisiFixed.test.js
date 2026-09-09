import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
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

/*
 * 🔴 AYNI HATA İKİNCİ BİR YERDE DAHA VARDI.
 *
 * Yukarıdaki `.pageTransitionAnim` düzeltmesi yayına alındı ve arıza
 * SÜRDÜ (ürün sahibi, 09.09.2026: "hiçbiri olmamış"). Sebep:
 * `Workspaces/WorkspaceLayout.module.css` içindeki `.workspaceContent`
 * de `both` ile tanımlıydı ve bütün işletme ekranlarını sarıyordu.
 * Tek tek kural düzeltmek yetmiyor — bu yüzden test artık BÜTÜN CSS
 * dosyalarını tarıyor.
 *
 * Kural: bitişte `transform` bırakan bir dolgu kipi (`both`/`forwards`)
 * yalnızca istisna listesindeki öğelerde olabilir.
 */
const CSS_KOKU = join(__dirname, '..')

/* İstisnalar — hiçbirinin `position: fixed` torunu olamaz:
   ikisi süsleme amaçlı ::after şeridi, biri SVG ikon içi. Üçünün de
   bitiş karesi taban stilden FARKLI, yani dolgu kipi gerçekten
   gerekli; kaldırılırsa şerit geri sıçrar, ibre başa döner. */
const ISTISNALAR = ['mirrorSweep', 'heroSweep', 'needleSettle', 'needleSettleHover']

function cssDosyalari(dizin, toplam = []) {
  for (const girdi of readdirSync(dizin, { withFileTypes: true })) {
    const yol = join(dizin, girdi.name)
    if (girdi.isDirectory()) cssDosyalari(yol, toplam)
    else if (girdi.name.endsWith('.css')) toplam.push(yol)
  }
  return toplam
}

describe('kalıcı transform taraması', () => {
  const dosyalar = cssDosyalari(CSS_KOKU)
  const govdeler = new Map(
    dosyalar.map(yol => [yol, readFileSync(yol, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')]),
  )

  /* Kare tanımları ayrı dosyada olabiliyor (motion-glass-tokens.css),
     bu yüzden önce hepsi toplanıyor. */
  const kareler = new Map()
  for (const govde of govdeler.values()) {
    for (const eslesme of govde.matchAll(/@keyframes\s+([\w-]+)\s*{((?:[^{}]|{[^{}]*})*)}/g)) {
      kareler.set(eslesme[1], eslesme[2])
    }
  }

  it('hiçbir animasyon bitişte transform bırakmıyor', () => {
    const suclular = []
    for (const [yol, govde] of govdeler) {
      for (const eslesme of govde.matchAll(/animation:\s*([^;}]*?)\s*(both|forwards)\s*;/g)) {
        const ad = eslesme[1].trim().split(/\s+/)[0]
        if (ISTISNALAR.includes(ad)) continue
        if (/transform/.test(kareler.get(ad) || '')) {
          suclular.push(`${ad} @ ${yol.replace(CSS_KOKU, 'src')}`)
        }
      }
    }
    /* Çıktı ada göre veriliyor: düşerse hangi kuralın eklendiği belli
       olsun, bütün CSS'i tekrar taramak gerekmesin. */
    expect(suclular).toEqual([])
  })

  it('işletme ekranlarını saran kural da bitişte transform bırakmıyor', () => {
    const govde = govdeler.get(join(CSS_KOKU, 'pages', 'Workspaces', 'WorkspaceLayout.module.css'))
    const kural = govde.match(/\.workspaceContent\s*{[^}]*}/)
    expect(kural, '.workspaceContent kuralı bulunamadı').not.toBeNull()
    expect(kural[0]).not.toMatch(/\b(both|forwards)\b/)
    expect(kural[0]).toMatch(/\bbackwards\b/)
  })
})
