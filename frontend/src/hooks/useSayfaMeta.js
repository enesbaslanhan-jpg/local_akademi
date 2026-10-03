import { useEffect } from 'react'

/*
 * SAYFAYA ÖZEL BAŞLIK, AÇIKLAMA VE KANONİK ADRES.
 *
 * Tek sayfalık uygulamada her yol aynı index.html'i alıyor; Google ve
 * paylaşım kartları da öyle. Herkese açık sayfalar (araçlar, fiyatlar,
 * hakkında) kendi başlığını yazmadıkça arama sonucunda hepsi
 * "LocalKarar — İşletmen için doğru kararlar" olarak çıkıyordu ve
 * birbirinden ayrılmıyordu (14.09.2026).
 *
 * Kütüphane (react-helmet vb.) BİLEREK yok: üç etiketi güncellemek için
 * bağımlılık eklemek, paketi büyütmekten başka bir şey getirmiyor.
 *
 * ⚠️ Sayfadan çıkınca varsayılanlar GERİ YAZILIR; yoksa araç
 * sayfasından /login'e geçen ziyaretçinin sekmesinde araç başlığı
 * kalıyordu.
 */
const VARSAYILAN = {
  baslik: 'LocalKarar — İşletmen için doğru kararlar',
  aciklama: 'Küçük işletmeler için işletme takibi, pazaryeri siparişleri, kâr hesaplamaları, karar araçları ve AI Mentor tek yerde.',
}

function etiket(secici, olustur) {
  let el = document.head.querySelector(secici)
  if (!el) {
    el = olustur()
    document.head.appendChild(el)
  }
  return el
}

function meta(nitelik, deger) {
  const secici = `meta[${nitelik.ad}="${nitelik.deger}"]`
  return etiket(secici, () => {
    const m = document.createElement('meta')
    m.setAttribute(nitelik.ad, nitelik.deger)
    return m
  }).setAttribute('content', deger)
}

function sayfaSemasiYaz(schema) {
  document.head.querySelectorAll('script[data-localkarar-page-schema]').forEach(el => el.remove())
  if (!schema) return

  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.dataset.localkararPageSchema = 'true'
  /* `<` kaçışı, ileride şema metni dış kaynaktan gelirse script
     etiketinin erken kapanmasını önler. */
  script.textContent = JSON.stringify(schema).replace(/</g, '\\u003c')
  document.head.appendChild(script)
}

function yaz({ baslik, aciklama, yol, robots = 'index,follow', schema = null }) {
  document.title = baslik
  meta({ ad: 'name', deger: 'description' }, aciklama)
  meta({ ad: 'name', deger: 'robots' }, robots)
  meta({ ad: 'name', deger: 'twitter:title' }, baslik)
  meta({ ad: 'name', deger: 'twitter:description' }, aciklama)
  meta({ ad: 'property', deger: 'og:title' }, baslik)
  meta({ ad: 'property', deger: 'og:description' }, aciklama)
  const adres = `https://localkarar.com${yol}`
  etiket('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }))
    .setAttribute('href', adres)
  meta({ ad: 'property', deger: 'og:url' }, adres)
  sayfaSemasiYaz(schema)
}

export default function useSayfaMeta({ baslik, aciklama, yol, robots, schema }) {
  useEffect(() => {
    yaz({ baslik, aciklama, yol, robots, schema })
    return () => yaz({ ...VARSAYILAN, yol: '/' })
  }, [baslik, aciklama, yol, robots, schema])
}
