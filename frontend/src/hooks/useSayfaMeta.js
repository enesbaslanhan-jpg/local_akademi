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
  aciklama: 'Küçük işletmeler için kayıt, cari hesap, pazaryeri siparişi, kâr hesaplama ve AI Mentor tek uygulamada. 30 gün ücretsiz.',
}

function etiket(secici, olustur) {
  let el = document.head.querySelector(secici)
  if (!el) {
    el = olustur()
    document.head.appendChild(el)
  }
  return el
}

function yaz({ baslik, aciklama, yol }) {
  document.title = baslik
  etiket('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' }))
    .setAttribute('content', aciklama)
  etiket('meta[property="og:title"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:title'); return m })
    .setAttribute('content', baslik)
  etiket('meta[property="og:description"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:description'); return m })
    .setAttribute('content', aciklama)
  const adres = `https://localkarar.com${yol}`
  etiket('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }))
    .setAttribute('href', adres)
  etiket('meta[property="og:url"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:url'); return m })
    .setAttribute('content', adres)
}

export default function useSayfaMeta({ baslik, aciklama, yol }) {
  useEffect(() => {
    yaz({ baslik, aciklama, yol })
    return () => yaz({ ...VARSAYILAN, yol: '/' })
  }, [baslik, aciklama, yol])
}
