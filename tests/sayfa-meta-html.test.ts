import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { SAYFA_META, sayfaMetaUygula, sayfaMetaYolu } from '../src/lib/sayfa-meta-html.js'

/*
 * Ham HTML'e sayfaya özel başlık/canonical yazma (14.10.2026).
 *
 * Buradaki testler tek bir vaadi koruyor: Google'ın ilk gördüğü HTML'de her
 * herkese açık sayfa KENDİ başlığını ve KENDİ canonical adresini taşır, ve
 * bunu yaparken `index.html` içindeki satır içi betiklere (CSP özeti bunlardan
 * hesaplanıyor) DOKUNULMAZ.
 */

const SABLON = readFileSync(new URL('../frontend/index.html', import.meta.url), 'utf8')

function betikGovdeleri(html: string): string[] {
  const sonuc: string[] = []
  const kalip = /<script\b[^>]*>([\s\S]*?)<\/script>/g
  let eslesme: RegExpExecArray | null
  while ((eslesme = kalip.exec(html))) sonuc.push(eslesme[1])
  return sonuc
}

describe('sayfaMetaYolu', () => {
  it('tablodaki adresleri tanır; sorgu, parça, sondaki eğik çizgi ve büyük harf yok sayılır', () => {
    expect(sayfaMetaYolu('/fiyatlar')).toBe('/fiyatlar')
    expect(sayfaMetaYolu('/fiyatlar/')).toBe('/fiyatlar')
    expect(sayfaMetaYolu('/Fiyatlar?utm_source=x#ucret')).toBe('/fiyatlar')
    expect(sayfaMetaYolu('/araclar/pazaryeri-komisyon-hesaplayici')).toBe('/araclar/pazaryeri-komisyon-hesaplayici')
  })

  it('tabloda olmayan ya da oturum gerektiren adresleri TANIMAZ', () => {
    for (const yol of ['/', '/login', '/app/ana-sayfa', '/admin', '/rastgele', '/fiyatlar/alt', '/constructor', '/__proto__', '/toString']) {
      expect(sayfaMetaYolu(yol), yol).toBeNull()
    }
  })
})

describe('sayfaMetaUygula', () => {
  it('her tablo adresi için başlık, açıklama, canonical ve paylaşım etiketlerini yazar', () => {
    for (const [yol, meta] of Object.entries(SAYFA_META)) {
      const html = sayfaMetaUygula(SABLON, yol)
      expect(html, yol).toContain(`<title>${meta.baslik}</title>`)
      expect(html, yol).toContain(`<link rel="canonical" href="https://localkarar.com${yol}" />`)
      expect(html, yol).toContain(`<meta property="og:url" content="https://localkarar.com${yol}" />`)
      expect(html, yol).toContain(`content="${meta.aciklama}"`)
      expect(html, yol).toContain(`<meta property="og:title" content="${meta.baslik}" />`)
      expect(html, yol).toContain(`<meta name="twitter:title" content="${meta.baslik}" />`)
      /* Ana sayfa varsayılanları KALMAMALI: asıl hata buydu. */
      expect(html, yol).not.toContain('<link rel="canonical" href="https://localkarar.com/" />')
      expect(html, yol).not.toContain('<title>LocalKarar — İşletmen için doğru kararlar</title>')
    }
  })

  it('satır içi betik gövdelerine DOKUNMAZ (CSP özeti bunlardan hesaplanıyor)', () => {
    const once = betikGovdeleri(SABLON)
    expect(once.length).toBeGreaterThan(0)
    for (const yol of Object.keys(SAYFA_META)) {
      expect(betikGovdeleri(sayfaMetaUygula(SABLON, yol)), yol).toEqual(once)
    }
  })

  it('tabloda olmayan yolda HTML’i aynen döndürür', () => {
    expect(sayfaMetaUygula(SABLON, '/login')).toBe(SABLON)
  })

  it('metindeki özel karakterleri kaçırır (başlık etiketi kırılamaz)', () => {
    /* Tabloyu değiştirmeden kaçırmayı sınamak için sahte şablon + geçici giriş. */
    SAYFA_META['/__deneme'] = { baslik: 'A "B" <i>C</i> & D', aciklama: 'x"onload="y' }
    try {
      const html = sayfaMetaUygula(SABLON, '/__deneme')
      expect(html).toContain('<title>A &quot;B&quot; &lt;i&gt;C&lt;/i&gt; &amp; D</title>')
      expect(html).toContain('content="x&quot;onload=&quot;y"')
      expect(html).not.toContain('<i>C</i>')
    } finally {
      delete SAYFA_META['/__deneme']
    }
  })

  it('"$&" gibi özel yerine kalıpları içeren metin olduğu gibi yazılır', () => {
    SAYFA_META['/__deneme2'] = { baslik: 'Fiyat $& $1 $` indirim', aciklama: 'a' }
    try {
      expect(sayfaMetaUygula(SABLON, '/__deneme2')).toContain('<title>Fiyat $&amp; $1 $` indirim</title>')
    } finally {
      delete SAYFA_META['/__deneme2']
    }
  })
})
