# LocalKarar SEO/GEO denetimi — 3 Ekim 2026

## Kapsam ve yöntem

Canlı `https://localkarar.com/` ve aynı workspace'teki yerel production build tarayıcıda karşılaştırıldı. Yerel build altı rotada kontrol edildi: ana sayfa ile beş public özellik sayfası. Ayrıca `ultimate-seo-geo` denetim aracıyla keşif taraması alındı. Bu tarama Google Search Console, Bing Webmaster Tools veya PageSpeed/CrUX verisi yerine geçmez.

## Öncelikli bulgular

### Yüksek — yeni public sayfalar canlıda bulunmuyor

- **Kanıt:** Canlıdaki `/isletme-takibi`, `/karar-araclari`, `/hesaplamalar`, `/ai-mentor` ve `/pazaryeri-entegrasyonlari` rotaları 404 döndürdü. Aynı URL'ler yerel production build'de açıldı ve her birinde ayrı başlık, açıklama, canonical, H1 ve sayfa şeması bulundu.
- **Etki:** Bu açılış sayfaları henüz arama motoru ve ziyaretçi tarafından kullanılamıyor; sitemap'te yer almaları tek başına keşfedilmelerini sağlamaz.
- **Düzeltme:** Onaylı yayın sürecinde yeni build dağıtılmalı; sonrasında beş URL doğrudan açılarak 200 yanıtı ve doğru HTML metadata doğrulanmalı.
- **Güven:** Yüksek.
- **Yanlışlanabilirlik:** Canlı rotalar 200 döndürür ve tarayıcıda doğru sayfa içeriği/metadata görünürse bulgu kapanır.
- **İlk-prensip gözlem:** İstenen sayfanın kendisi sunulmadan o URL'nin içerik araması için açılış sayfası işlevi görmesi beklenemez.
- **Bağımlılık:** Yeni frontend build'inin production'a yayımlanması; bu denetimde yayın yapılmadı.
- **Öncü gösterge:** Beş URL'nin canlıda 200 vermesi ve Search Console URL incelemesinde Google tarafından alınabilmesi.

### Yüksek — canlı ana sayfa metadata ve yapılandırılmış verisi yerel sürümün gerisinde

- **Kanıt:** Canlı ana sayfada eski genel title/description ve tarayıcı DOM'unda boş JSON-LD görüldü. Yerel build'de başlık/açıklama güncel; Organization, WebSite ve SoftwareApplication JSON-LD nesneleri doğrulandı.
- **Etki:** Canlı arama sonucu görünümü ve makinece okunabilir marka/ürün bağlamı yerel uygulamadaki hedeflenen düzeltmeleri henüz almamış durumda.
- **Düzeltme:** Yeni build yayımlandıktan sonra canlı title, description, canonical ve schema'yı yeniden kontrol et; schema'yı Google Rich Results Test ve Schema Markup Validator ile doğrula.
- **Güven:** Yüksek.
- **Yanlışlanabilirlik:** Canlı DOM/HTML doğru metadata ve geçerli JSON-LD gösterirse bulgu kapanır.
- **İlk-prensip gözlem:** Yerelde bulunan işaretleme canlı yanıtın parçası değilse arama motoru canlıda bunu göremez.
- **Bağımlılık:** Build'in yayımlanması.
- **Öncü gösterge:** Canlı kaynak/DOM'da doğru canonical ve parse edilebilir JSON-LD; Search Console zengin sonuç ve URL raporları.

### Orta — SPA'nın ilk yanıtı, sayfaya özgü içeriği istemci tarafında üretiyor

- **Kanıt:** Uygulama Vite/React SPA olarak derleniyor; direct route fallback `index.html` döndürüyor. Yerel tarayıcı uygulama yüklendikten sonra sayfa-özel metadata ve şemayı görüyor. Bu denetimde ayrı ayrı prerender edilmiş HTML yanıtları doğrulanmadı.
- **Etki:** JavaScript çalıştırmayan veya geç işleyen crawler'larda sayfa içeriği ve metadata'nın alınması tutarsız olabilir.
- **Düzeltme:** Önce yayındaki rotaları doğrula; sonra yalnız public sayfalar için prerender/SSR seçeneğini ayrı teknik iş olarak değerlendir. Uygulama ve kimlik doğrulamalı rotaları kapsam dışında tut.
- **Güven:** Orta.
- **Yanlışlanabilirlik:** Canlı rotaların ilk HTTP HTML yanıtı her sayfa için doğru title, ana içerik ve canonical içeriyorsa risk daha düşüktür.
- **Öncü gösterge:** JavaScript kapalı/ham HTML kontrolünde sayfaya özgü içerik görünmesi; Search Console URL testinde başarılı render.

## Denetim sinyali olarak tutulacak, henüz bulgu sayılmayacaklar

- Otomatik rapor **79/100** skor verdi ve “13 yetim sayfa / ortalama sıfır iç bağlantı” uyarısı üretti. Tarayıcıda canlı sayfada 14 gezinme ve toplam 21 bağlantı görülmesi bu bağlantı bulgusuyla çelişiyor. Crawl kapsamı/link çıkarımı açıklığa kavuşmadan puan veya yetim sayfa sayısı kullanılmamalı.
- “Wikidata kaydı yok” uyarısı çıktı. Marka için uygun ve doğrulanabilir bir Wikidata varlığı olduğuna dair kanıt yok; kayıt açma aksiyonu önerilmiyor.
- PageSpeed/CrUX ve Search Console performans verileri alınmadı. Web Vitals, indekslenmiş URL sayısı, anahtar kelime talebi ve organik dönüşüm değerlendirilmedi.

## Hazır olan yerel değişiklikler

- Beş özellik açılış sayfası ve sayfa başına title, description, canonical, H1.
- Organization, WebSite, SoftwareApplication ve sayfaya göre WebPage/BreadcrumbList/FAQPage yapılandırılmış verileri.
- `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` ve `/pricing.md`.
- Yerel production build bu altı rotada tarayıcıyla kontrol edildi. Bu kontrol canlıya yayın yapıldığı anlamına gelmez.

## Yayın sonrası kontrol listesi

1. Onaylı dağıtım tamamlanınca ana sayfa ve beş özellik rotasını doğrudan aç; 404 ve yanlış canonical olmadığını doğrula.
2. Canlı title/description/JSON-LD'yi yeniden kontrol et; schema doğrulayıcılarından geçir.
3. Google Search Console ve Bing Webmaster Tools'a sitemap gönder; önemli URL'leri incele.
4. İlk 2–4 hafta indeksleme, gösterim, tıklama ve marka dışı sorguları izle.
5. Search Console sorgularına göre iki ücretsiz hesaplayıcıyı seç; her biri için çalışan hesaplama, formül, örnek, açıklama ve kaynaklı SSS hazırla.
