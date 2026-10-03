# LocalKarar SEO ve GEO çalışma planı

Son güncelleme: 3 Ekim 2026

## 1. Hedef

LocalKarar’ın yalnız marka adıyla değil, küçük işletme sahibinin gerçek sorularıyla bulunmasını sağlamak:

- “pazaryeri komisyon hesaplama”
- “ürün gerçekten kârlı mı”
- “küçük işletme takip programı”
- “cari hesap takip uygulaması”
- “kâr marjı nasıl hesaplanır”
- “başabaş noktası hesaplama”
- “indirim yaparsam satış ne kadar artmalı”
- “Trendyol satışından ne kadar kalır”

SEO hedefi Google/Bing organik görünürlüğüdür. GEO hedefi ChatGPT, Gemini, Perplexity, Claude ve Copilot gibi sistemlerin LocalKarar’ı doğru tanımlaması, resmî sayfalarını kaynak olarak bulması ve uygun sorularda ürünü adaylar arasına almasıdır.

## 2. Bugünkü başlangıç durumu

### Güçlü taraflar

- HTTPS ve tek resmî alan adı var: `localkarar.com`.
- Herkese açık bir komisyon hesaplayıcı ve açıklayıcı metni var.
- `robots.txt` ve `sitemap.xml` mevcut.
- Ana sayfada ürün kapsamı, hedef kitle ve kullanım sınırları açıkça yazılıyor.
- Ürün, güven açısından önemli sınırları saklamıyor: muhasebe programı veya profesyonel danışmanlık olmadığı belirtiliyor.

### Başlangıçtaki temel açıklar

- Organik aramaya açık ürün yüzeyi çok dardı; ana sayfa dışında yalnız bir ücretsiz araç güçlü arama niyeti taşıyordu.
- İşletme Takibi, Karar Araçları, Hesaplamalar, AI Mentor ve entegrasyonlar ayrı URL’lerle açıklanmıyordu.
- Ana HTML’de ürün varlığını tanımlayan Organization, WebSite ve SoftwareApplication şemaları yoktu.
- Fiyat, ürün kapsamı ve önemli sayfalar yapay zekâ ajanlarının kolay okuyacağı düz metin dosyalarında sunulmuyordu.
- Sitemap giriş, kayıt ve düşük değerli yasal sayfalara fazla ağırlık veriyor; ürün sayfalarını içermiyordu.
- Bazı genel meta açıklamalarında “30 gün ücretsiz” denirken güncel fiyat sayfası tüm özelliklerin süresiz olarak şu an ücretsiz olduğunu söylüyordu.
- Uygulama React SPA olduğu için görünür metin JavaScript çalıştıktan sonra oluşuyor. Google bunu çoğunlukla işleyebilir; bazı AI tarayıcıları ve daha sınırlı botlar için açık metin yüzeyi gerekiyordu.

## 3. Uygulanan teknik temel

- Ana sayfaya Organization, WebSite ve SoftwareApplication JSON-LD eklendi.
- Sayfa meta sistemi robots, Twitter etiketleri ve sayfaya özel JSON-LD üretecek biçimde genişletildi.
- Beş indekslenebilir özellik sayfası oluşturuldu:
  - `/isletme-takibi`
  - `/karar-araclari`
  - `/hesaplamalar`
  - `/ai-mentor`
  - `/pazaryeri-entegrasyonlari`
- Her özellik sayfasına benzersiz title, meta description, canonical, tek H1, doğrudan cevap bölümü, kullanım adımları, SSS, BreadcrumbList ve FAQPage şeması eklendi.
- Fiyatlar, Yardım Merkezi ve ücretsiz komisyon hesaplayıcıya sayfaya özel yapılandırılmış veri eklendi.
- `sitemap.xml` yüksek niyetli ürün sayfalarını içerecek biçimde sadeleştirildi.
- GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot ve Google-Extended için herkese açık sayfalara erişim açık bırakıldı; `/app` ve `/admin` kapalı tutuldu.
- `llms.txt`, `llms-full.txt` ve `pricing.md` eklendi.
- Alt bilgiye yeni ürün sayfalarına kalıcı iç bağlantılar eklendi.

## 4. Anahtar kelime ve sayfa haritası

Arama hacmi verisi olmadan rakam uydurulmamalıdır. Aşağıdaki kümeler önce Search Console gösterimleri, sonra reklam anahtar kelime verisiyle sıralanacaktır.

| Arama niyeti | Birincil sorgular | Hedef sayfa | Durum |
|---|---|---|---|
| Ürün/kategori | küçük işletme takip programı, işletme takip uygulaması | `/isletme-takibi` | Hazır |
| Cari ve vade | cari hesap takip programı, alacak verecek takip | `/isletme-takibi` + yeni alt rehber | Temel hazır |
| Karar desteği | işletme karar destek sistemi, indirim yapmalı mıyım | `/karar-araclari` | Hazır |
| Finansal hesap | kâr marjı hesaplama, başabaş noktası hesaplama | `/hesaplamalar` + ayrı araçlar | Temel hazır |
| Pazaryeri kârlılığı | Trendyol komisyon hesaplama, pazaryeri kâr hesaplama | `/araclar/pazaryeri-komisyon-hesaplayici` | Hazır |
| Entegrasyon | Trendyol sipariş takip programı, pazaryeri entegrasyonu | `/pazaryeri-entegrasyonlari` | Hazır |
| AI destek | küçük işletme yapay zekâ asistanı, işletme AI danışmanı | `/ai-mentor` | Hazır |
| Eğitim | küçük işletme finans kursu, e-ticaret kârlılık eğitimi | Yeni `/kurslar` tanıtım sayfası | Sırada |
| Topluluk | küçük işletme topluluğu, e-ticaret satıcı topluluğu | Yeni `/topluluk` tanıtım sayfası | Sırada |
| Güncel bilgi | KOBİ mevzuat haberleri, işletme vergi haberleri | Yeni herkese açık haber arşivi | Sonraki faz |

## 5. GEO için takip edilecek soru seti

Her sorgu tek kez değil, platform başına ayda 3–5 kez denenmeli; sonuç “anıldı/citedildi” oranıyla kaydedilmelidir.

### Kategori ve tavsiye soruları

1. Türkiye’de küçük işletmeler için en kullanışlı takip uygulamaları hangileri?
2. Pazaryeri satıcıları komisyon ve kargo sonrası kârlılığı hangi araçla hesaplayabilir?
3. Trendyol satıcısı için sipariş, maliyet ve kâr takibini tek yerde yapan uygulamalar nelerdir?
4. Küçük işletmeler için Türkçe yapay zekâ destekli karar araçları var mı?
5. Cari hesap ve vade takibi için sade bir web uygulaması önerir misin?

### Problem soruları

6. Bir ürünün pazaryerinde gerçekten kârlı olup olmadığı nasıl hesaplanır?
7. Yüzde 20 indirimde aynı kârı korumak için satış kaç kat artmalı?
8. Ücretsiz kargo vermek mantıklı mı, nasıl hesaplanır?
9. Reklam bütçesini artırmadan önce hangi metriklere bakılmalı?
10. Küçük işletmede nakit açığı önceden nasıl görülür?

### Marka doğruluğu

11. LocalKarar nedir ve kimler için uygundur?
12. LocalKarar muhasebe programı mı?
13. LocalKarar hangi pazaryerleriyle çalışır?
14. LocalKarar ücretsiz mi?
15. LocalKarar AI Mentor hangi kaynakları kullanır?

## 6. Sıradaki organik büyüme işleri

### Faz 1 — ücretsiz hesaplayıcılar

Ürün sayfasından daha kolay bağlantı ve arama talebi toplayabilecek beş ücretsiz araç:

1. Kâr marjı hesaplayıcı
2. Başabaş satış adedi hesaplayıcı
3. İndirim sonrası gereken satış artışı hesaplayıcı
4. Ücretsiz kargo eşiği hesaplayıcı
5. Nakit tamponu ve vade farkı hesaplayıcı

Her araçta şunlar bulunmalı:

- Tarayıcıda çalışan gerçek hesaplama
- Formülün sade açıklaması
- Bir örnek senaryo
- Sonucun nasıl yorumlanacağı
- Sık sorulan sorular
- İlgili LocalKarar modülüne ölçülü CTA
- WebApplication + FAQPage şeması

### Faz 2 — kaynaklı rehberler

- Pazaryeri komisyonu nasıl hesaplanır?
- Ürün başına gerçek maliyet nasıl bulunur?
- Kâr ile nakit akışı arasındaki fark nedir?
- Cari hesap nedir, küçük işletmede nasıl tutulur?
- Başabaş noktası nedir ve nasıl kullanılır?
- İndirim kampanyasında marj nasıl korunur?

Bu içerikler genel tavsiye üretmemeli; formül, tarih, kaynak ve örnek işletme senaryosu içermelidir. Mevzuat içeren her sayfa resmî kaynağa bağlantı vermeli ve “son güncelleme” tarihi taşımalıdır.

### Faz 3 — ürün kanıtı ve üçüncü taraf varlığı

- Gerçek kullanıcı izinleriyle vaka çalışmaları
- YouTube’da hesaplamaların kısa uygulama videoları; tam transkript ve bölüm başlıkları
- LinkedIn’de kurucu imzalı, veri ve ekran örnekli makaleler
- Uygun olduğunda G2/Capterra benzeri yazılım dizinlerinde eksiksiz profil
- Sektörel yayınlarda özgün veri veya hesaplama metodolojisiyle konuk içerik

Sahte yorum, ücretli gizli tavsiye veya yapay Reddit/Wikipedia çalışması yapılmamalıdır.

## 7. Ölçüm planı

### Kurulum

1. Google Search Console alan adı doğrulaması tamamlanmalı.
2. `https://localkarar.com/sitemap.xml` Search Console’a gönderilmeli.
3. Bing Webmaster Tools kurulmalı ve aynı sitemap gönderilmeli.
4. İndeksleme kapsamı, canonical seçimleri ve Core Web Vitals izlenmeli.
5. Analitikte organik ziyaret, ücretsiz araç kullanımı, hesap oluşturma ve kaynak bazlı dönüşüm ölçülmeli.

### Haftalık göstergeler

- İndekslenen yüksek değerli sayfa sayısı
- Organik gösterim ve tıklama
- Marka dışı sorgu sayısı
- Ücretsiz araç başlangıç ve tamamlanma oranı
- Organikten hesap oluşturma oranı

### Aylık GEO göstergeleri

- 15 sorguda platform başına marka anılma oranı
- LocalKarar alan adının kaynak olarak gösterilme oranı
- Yanlış ürün/fiyat/entegrasyon bilgisinin görülme sayısı
- AI yönlendirme trafiği
- Rakiplerin tekrar eden kaynakları ve içerik türleri

## 8. Teknik borç ve önemli karar

Public içerik hâlâ React SPA içinde çalışıyor. Google JavaScript’i işleyebilse de daha hızlı ve tutarlı tarama için sonraki teknik adım public sayfaları statik üretmek veya SSR/prerender uygulamaktır. Bu değişiklik giriş gerektiren uygulamayı etkilemeden yalnız `/`, özellik sayfaları, ücretsiz araçlar, fiyatlar ve yardım merkezi için yapılmalıdır.

Öncelik sırası:

1. Bu sürümü canlıya almak ve sitemap göndermek
2. İndeksleme ve gerçek sorgu verisini toplamak
3. İlk iki ücretsiz hesaplayıcıyı yayımlamak
4. Public sayfalar için prerender/SSR eklemek
5. Sorgu verisine göre içerik kümesini genişletmek

## 9. 3 Ekim 2026 canlı/yerel doğrulama durumu

Canlı alan adı ile yerel build ayrı ayrı tarayıcıda kontrol edildi. Bu bölüm, canlıya alınmış SEO başarısı iddiası değildir; yerel düzeltmelerin hazır olup olmadığını ve yayım öncesi farkı kaydeder.

- Canlı `https://localkarar.com/` açılıyor; ancak beş yeni özellik URL'si (`/isletme-takibi`, `/karar-araclari`, `/hesaplamalar`, `/ai-mentor`, `/pazaryeri-entegrasyonlari`) 404 veriyor.
- Canlı ana sayfada eski genel title/description bulunuyor; tarayıcı DOM'unda JSON-LD bulunmadı.
- Yerel production build'de ana sayfa ve beş özellik URL'si açılıyor. Her birinde ayrı title, description, canonical ve H1 var; JSON-LD'de Organization, WebSite, SoftwareApplication ve sayfa bazlı WebPage, BreadcrumbList, FAQPage nesneleri görüldü.
- Yerel sitemap beş özellik sayfasını içeriyor; robots.txt sitemap adresini bildiriyor ve uygulama içi/admin/güvenlik rotalarını dışarıda bırakıyor.
- Otomatik denetim aracı 79/100 gösterdi; ancak aynı rapordaki “yetim sayfalar / sıfır iç bağlantı” bulgusu tarayıcıda görülen gezinme bağlantılarıyla çelişiyor. Bu puan ve bağlantı bulguları güvenilir site puanı olarak kullanılmamalı. Aracın raporu keşif listesi olarak tutulmalı.
- PageSpeed/CrUX ve Search Console verileri bu doğrulamada elde edilmedi. Hız, indekslenme, sorgu talebi ve dönüşüm hakkında sonuç çıkarılamaz.

### Doğrulanmış aksiyonlar ve yayın kapısı

1. Yerel metadata, canonical, yapılandırılmış veri, robots ve sitemap değişiklikleri mevcut build'de doğrulandı.
2. Canlıdaki 404, henüz yayınlanmamış yerel sayfalardan kaynaklanıyor; canlı sunucuda düzeltme yapılmadı.
3. Yayın öncesi build/route kontrolü; yayın sonrası Search Console ve Bing Webmaster Tools üzerinden sitemap gönderimi ve URL incelemesi yapılmalı.
4. Canlı metadata/schema tekrar tarayıcıda doğrulanmalı. Otomatik tarayıcıdaki bağlantı sayısı bulguları, crawler kısıtı ayrıştırılmadan kabul edilmemeli.
5. Prerender/SSR, canlı sürüm yayımlandıktan ve public rotalar doğrulandıktan sonra ayrı teknik iş olarak ele alınmalı.
