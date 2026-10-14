import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { SAYFA_META as arkaUc } from '../src/lib/sayfa-meta-html.js'
// @ts-expect-error — ön yüz JS modülü, tip bildirimi yok; bilerek.
import { SAYFA_META as onYuz } from '../frontend/src/config/sayfa-meta.js'
import tr from '../frontend/src/i18n/locales/tr/common.json'

/*
 * Sayfa başlıkları İKİ dosyada yazılı (ayrı derleme hedefleri):
 *   frontend/src/config/sayfa-meta.js   (ön yüzün kaynağı)
 *   src/lib/sayfa-meta-html.ts          (sunucunun ham HTML'e yazdığı)
 *
 * Ayrışırlarsa Google ilk gördüğü HTML'de bir başlık, JavaScript çalışınca
 * başka bir başlık görür; bu da hem tutarsız arama sonucu hem de "sayfa
 * içeriği değişti" sinyali demek.
 */

describe('sayfa meta tablosu: ön yüz ↔ sunucu', () => {
  it('aynı adresler, aynı başlık ve açıklamalar', () => {
    expect(Object.keys(onYuz).sort()).toEqual(Object.keys(arkaUc).sort())
    for (const yol of Object.keys(arkaUc)) {
      expect(onYuz[yol], yol).toEqual(arkaUc[yol])
    }
  })

  it('komisyon aracı: i18n metni tabloyla aynı', () => {
    /* Sayfa başlığını `t('tools.commission.metaTitle')`dan yazıyor. */
    const yol = '/araclar/pazaryeri-komisyon-hesaplayici'
    expect(tr.tools.commission.metaTitle).toBe(arkaUc[yol].baslik)
    expect(tr.tools.commission.metaDescription).toBe(arkaUc[yol].aciklama)
  })

  it('sitemap’teki her herkese açık sayfanın (ana sayfa hariç) sayfaya özel başlığı var', () => {
    /* Sitemap'e yeni adres eklenip tabloya eklenmezse o sayfa yine "ana sayfanın kopyası" görünür. */
    const sitemap = readFileSync(new URL('../frontend/public/sitemap.xml', import.meta.url), 'utf8')
    const adresler = [...sitemap.matchAll(/<loc>https:\/\/localkarar\.com([^<]*)<\/loc>/g)].map(m => m[1] || '/')
    const eksik = adresler.filter(yol => yol !== '/' && !arkaUc[yol])
    expect(eksik).toEqual([])
  })

  it('başlıklar makul uzunlukta (arama sonucunda kesilmesin)', () => {
    for (const [yol, meta] of Object.entries(arkaUc)) {
      expect(meta.baslik.length, `${yol} başlık`).toBeLessThanOrEqual(70)
      expect(meta.aciklama.length, `${yol} açıklama`).toBeLessThanOrEqual(175)
    }
  })
})
