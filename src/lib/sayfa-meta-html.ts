/*
 * HAM HTML'E SAYFAYA ÖZEL BAŞLIK / AÇIKLAMA / CANONICAL YAZMA (14.10.2026).
 *
 * Bkz. frontend/src/config/sayfa-meta.js başındaki not: tek sayfalık uygulama
 * her adrese aynı index.html'i veriyordu, yani ham HTML'de her sayfa ana
 * sayfa başlığı + `canonical = /` taşıyordu. Burada herkese açık sayfa
 * adreslerinde bu etiketler tabloya göre yeniden yazılır.
 *
 * 🔴 SADECE HEAD ETİKETLERİ DEĞİŞİR, `<script>` GÖVDELERİNE DOKUNULMAZ:
 * İçerik Güvenliği Politikası, `index.html` içindeki satır içi betiklerin
 * SHA-256 özetini açılışta DOSYADAN okuyup politikaya yazıyor (bkz.
 * index.ts `satirIciBetikOzetleri`). Bir betik gövdesi değişirse tarayıcı o
 * betiği engeller ve tema bozulur. Bu yüzden burada yalnız başlık, açıklama,
 * canonical ve paylaşım etiketleri değiştirilir; testte betiklerin aynı
 * kaldığı denetleniyor.
 *
 * ⚠️ Bu tablo `frontend/src/config/sayfa-meta.js`in AYNASI (ayrı derleme
 * hedefleri). `tests/sayfa-meta-drift.test.ts` eşitliği zorluyor.
 */

export const SAYFA_META: Record<string, { baslik: string; aciklama: string }> = {
  '/hakkinda': {
    baslik: 'LocalKarar Hakkında — Küçük İşletmeler İçin Karar Desteği',
    aciklama: 'LocalKarar’ın küçük işletmeler için işletme takibi, hesaplamalar, karar araçları ve kaynaklı AI Mentor yaklaşımını keşfet.',
  },
  '/fiyatlar': {
    baslik: 'LocalKarar Fiyatları — Şu Anda Ücretsiz',
    aciklama: 'LocalKarar’ın tüm özellikleri şu anda ücretsiz. Kart bilgisi gerekmez; ücretlendirme başlamadan en az bir ay önce bilgi verilir.',
  },
  '/yardim': {
    baslik: 'LocalKarar Yardım Merkezi ve Kullanma Kılavuzu',
    aciklama: 'LocalKarar hesabı, işletme takibi, belge yükleme, pazaryeri bağlantıları ve AI Mentor hakkında sık sorulan sorular ve adım adım kullanım kılavuzu.',
  },
  '/araclar/pazaryeri-komisyon-hesaplayici': {
    baslik: 'Pazaryeri Komisyon Oranı ve Kâr Hesaplama | LocalKarar',
    aciklama: 'Pazaryeri komisyon oranını ve ürün maliyetlerini gir; kargo ve iade giderleri sonrası satış başına net katkını ücretsiz hesapla. Oranını satıcı panelinden doğrula.',
  },
  '/isletme-takibi': {
    baslik: 'Küçük İşletme Takip Programı | LocalKarar',
    aciklama: 'Gelir, gider, cari hesap, tahsilat, ödeme, sipariş ve belgeleri tek yerde takip et. Küçük işletmeler için sade işletme takip uygulaması.',
  },
  '/karar-araclari': {
    baslik: 'Küçük İşletmeler İçin Karar Araçları | LocalKarar',
    aciklama: 'İndirim, ücretsiz kargo, reklam bütçesi, personel ve nakit akışı kararlarını kendi rakamlarınla değerlendir. Sonucu ve riskleri birlikte gör.',
  },
  '/hesaplamalar': {
    baslik: 'Kâr Marjı ve Başabaş Hesaplama Araçları | LocalKarar',
    aciklama: 'Kâr marjı, başabaş noktası, birim maliyet, nakit akışı ve kampanya kârlılığını hazır şablonlarla hesapla; sonucun ne anlama geldiğini gör.',
  },
  '/ai-mentor': {
    baslik: 'Küçük İşletmeler İçin Kaynaklı AI Mentor | LocalKarar',
    aciklama: 'İşletme sorularını kendi cümlelerinle sor. LocalKarar AI Mentor, içerik kütüphanesine ve izin verdiğin işletme bağlamına dayanarak kaynaklı yanıt verir.',
  },
  '/pazaryeri-entegrasyonlari': {
    baslik: 'Pazaryeri Entegrasyonları: Trendyol, Hepsiburada, N11 | LocalKarar',
    aciklama: 'Trendyol, Hepsiburada, N11 ve Shopify siparişlerini ve ürünlerini tek yerde takip et; satışları işletme kayıtları ve kârlılık hesaplarıyla birleştir.',
  },
  '/privacy': {
    baslik: 'Gizlilik Politikası | LocalKarar',
    aciklama: 'LocalKarar’ın kişisel verileri nasıl topladığını, işlediğini ve koruduğunu; haklarını nasıl kullanabileceğini açıklayan gizlilik politikası.',
  },
  '/terms': {
    baslik: 'Kullanım Şartları | LocalKarar',
    aciklama: 'LocalKarar’ı kullanırken geçerli olan koşullar, hesap sorumlulukları ve kullanıcı yükümlülükleri.',
  },
}

const ALAN_ADI = 'https://localkarar.com'

function kacir(deger: string): string {
  return deger
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** İstek adresini tablo anahtarına çevirir: sorgu/parça atılır, sondaki "/" ve büyük harf yok sayılır. */
export function sayfaMetaYolu(url: string): string | null {
  const ham = url.split('?')[0].split('#')[0]
  let yol = ham.length > 1 ? ham.replace(/\/+$/, '') : ham
  yol = yol.toLowerCase()
  return Object.prototype.hasOwnProperty.call(SAYFA_META, yol) ? yol : null
}

/**
 * `html` içindeki başlık, açıklama, canonical ve paylaşım etiketlerini `yol`
 * için yazar. Tabloda olmayan yolda HTML'i aynen döndürür. Hiçbir `<script>`
 * gövdesine dokunmaz.
 */
export function sayfaMetaUygula(html: string, yol: string): string {
  const meta = SAYFA_META[yol]
  if (!meta) return html
  const baslik = kacir(meta.baslik)
  const aciklama = kacir(meta.aciklama)
  const adres = `${ALAN_ADI}${yol}`

  let sonuc = html
  /* Her değiştirme TEK bir etiketi hedefler (ilk eşleşme). Etiket
     bulunamazsa hiçbir şey olmaz; HTML şablonu değişirse bozulmaz,
     yalnızca o alan varsayılan kalır (test bunu yakalar). */
  const degistir = (kalip: RegExp, yerine: string) => {
    sonuc = sonuc.replace(kalip, () => yerine)
  }
  degistir(/<title>[^<]*<\/title>/, `<title>${baslik}</title>`)
  degistir(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${aciklama}" />`)
  degistir(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${adres}" />`)
  degistir(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${baslik}" />`)
  degistir(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${aciklama}" />`)
  degistir(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${adres}" />`)
  degistir(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${baslik}" />`)
  degistir(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${aciklama}" />`)
  return sonuc
}
