/*
 * HERKESE AÇIK SAYFALARIN BAŞLIK VE AÇIKLAMALARI — TEK KAYNAK (14.10.2026).
 *
 * 🔴 NEDEN VAR: Site tek sayfalık uygulama; sunucu her adrese AYNI
 * index.html'i veriyordu. Ham HTML'de /fiyatlar, /yardim, araç sayfası
 * dahil HER adres "LocalKarar — İşletmen için doğru kararlar" başlığıyla ve
 * `canonical = https://localkarar.com/` ile geliyordu; sayfaya özel başlık
 * yalnızca JavaScript çalışınca yazılıyordu (hooks/useSayfaMeta.js). Google
 * önce ham HTML'e bakar: her sayfa ana sayfanın kopyası görünür, bu da
 * "Keşfedildi — şu anda dizine eklenmedi" durumunun en olası sebebi.
 *
 * ÇÖZÜM: sunucu bu adreslerde HAM HTML'in başlık, açıklama, canonical ve
 * paylaşım etiketlerini bu tabloya göre yazıyor (`src/lib/sayfa-meta-html.ts`).
 * Ön yüz sayfaları da AYNI tablodan okuyor; böylece tarayıcıda JS'in
 * yazdığı ile sunucunun yazdığı ayrışmıyor.
 *
 * ⚠️ Sunucudaki tablo bunun AYNASI (ayrı derleme hedefleri, biri diğerini
 * import edemiyor). `tests/sayfa-meta-drift.test.ts` ikisinin eşitliğini
 * zorluyor: burayı değiştirirsen sunucu tablosunu da değiştir.
 *
 * ⚠️ Komisyon aracı başlığı `tr/common.json` içindeki
 * `tools.commission.metaTitle/metaDescription` ile AYNI olmalı (aynı test
 * bunu da denetler).
 */
export const SAYFA_META = {
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
  '/araclar/trendyol-komisyon-hesaplama': {
    baslik: 'Trendyol Komisyon ve Sipariş Kârlılığı Hesaplama | LocalKarar',
    aciklama: 'Trendyol siparişinde kendi komisyon oranını, ürün maliyetini, kargo ve diğer giderleri girerek tahmini sipariş katkını hesapla.',
  },
  '/araclar/hepsiburada-komisyon-hesaplama': {
    baslik: 'Hepsiburada Komisyon ve Sipariş Kârlılığı Hesaplama | LocalKarar',
    aciklama: 'Hepsiburada siparişindeki kendi komisyon oranını, ürün maliyetini, kargo ve ek giderleri girerek yaklaşık katkını hesapla.',
  },
  '/araclar/kdv-dahil-haric-hesaplama': {
    baslik: 'KDV Dahil Hariç Hesaplama Aracı | LocalKarar',
    aciklama: 'Tutarı ve uygulaman gereken KDV oranını girerek KDV hariç bedeli, vergi tutarını ve KDV dahil toplamı hesapla.',
  },
  '/araclar/kar-marji-hesaplama': {
    baslik: 'Kâr Marjı Hesaplama: Satıştan Kalan Oranı Bul | LocalKarar',
    aciklama: 'Satış geliri ve maliyetleri girerek katkıyı ve satışa göre kâr marjını hesapla; marj ile maliyet üzerine kâr ekleme oranını ayır.',
  },
  '/araclar/satis-fiyati-hesaplama': {
    baslik: 'Hedef Kâr Marjına Göre Satış Fiyatı Hesaplama | LocalKarar',
    aciklama: 'Ürün maliyeti, satışa bağlı giderler ve hedef marjı girerek gereken yaklaşık satış fiyatını bul.',
  },
  '/araclar/basabas-noktasi-hesaplama': {
    baslik: 'Başabaş Noktası Hesaplama: Gerekli Satış Adedi | LocalKarar',
    aciklama: 'Dönem sabit giderlerini ve satış başına katkıyı girerek başabaş için gereken tahmini satış adedini ve ciroyu hesapla.',
  },
  '/isletme-takibi': {
    baslik: 'Küçük İşletme Takip Programı | LocalKarar',
    aciklama: 'Gelir, gider, cari hesap, tahsilat, ödeme, sipariş ve belgeleri tek yerde takip et. Küçük işletmeler için sade işletme takip uygulaması.',
  },
  '/karar-araclari': {
    baslik: 'Küçük İşletmeler İçin Karar Araçları | LocalKarar',
    aciklama: 'İndirim, ücretsiz kargo, reklam bütçesi, personel ve nakit akışı kararlarını kendi rakamlarınla değerlendir. Sonucu ve riskleri birlikte gör.',
  },
  '/karar-araclari/indirim-yapabilir-miyim': {
    baslik: 'Bu İndirimi Yapabilir miyim? İndirim Kâr Hesabı | LocalKarar',
    aciklama: 'İndirim sonrası ürün başı katkıyı, maksimum güvenli indirim oranını ve kampanya başabaş adedini çözümlü örnekle öğren; kendi rakamlarınla hesapla.',
  },
  '/karar-araclari/ucretsiz-kargo-hesaplama': {
    baslik: 'Ücretsiz Kargo Kârlı mı? Sepet Eşiği Hesabı | LocalKarar',
    aciklama: 'Ücretsiz kargonun sepet katkısına etkisini ve güvenli minimum sepet tutarını çözümlü örnekle öğren; alt limiti kendi rakamlarınla belirle.',
  },
  '/karar-araclari/reklam-butcesi-artirma': {
    baslik: 'Reklam Bütçesini Artırmalı mıyım? ROAS Hesabı | LocalKarar',
    aciklama: 'ROAS’ı başabaş ROAS ile karşılaştır, ek bütçenin katkısını çözümlü örnekle gör; reklam kararını kendi rakamlarınla ver.',
  },
  '/karar-araclari/nakit-akisi-riskli-mi': {
    baslik: 'Nakit Akışım Riskli mi? Vade Etkisi Hesabı | LocalKarar',
    aciklama: 'Aylık net akış, tahsilat ve ödeme vadesi farkı ile nakit tamponunu çözümlü örnekle öğren; kârlıyken neden nakit sıkıştığını gör.',
  },
  '/karar-araclari/yeni-personel-maliyeti': {
    baslik: 'Yeni Personel Maliyeti ve Başabaş Ciro Hesabı | LocalKarar',
    aciklama: 'Bir çalışanın tam aylık maliyetini, başabaş ek cirosunu ve nakit rezerv dayanıklılığını çözümlü örnekle öğren; işe alım kararını rakamla ver.',
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
