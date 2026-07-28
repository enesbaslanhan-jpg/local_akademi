# Faz 3 — Fiyat Mimarisi ve Marj Yönetimi Pilot Raporu

Tarih: 28.07.2026
Karar: **GO — pilot yayınlandı ve kalite kapıları geçti**

## Teslim edilen kullanıcı deneyimi

Yeni yayımlanan **Fiyat Mimarisi ve Marj Yönetimi** kursu beş uygulama dersinden oluşur:

1. Gerçek Birim Maliyet — maliyet matrisi
2. Satış Marjı — ek oran/marj karşılaştırması
3. Pazar Yeri Komisyonu — fiyat katmanları
4. Fiyat Belirleme — karar akışı ve fiyat koridoru
5. Kampanya Fiyatlandırma — indirim duyarlılık tablosu

Her ders mevcut bilgi nesnesini zenginleştirir; aynı içeriğin yeni ve kopuk bir kopyası oluşturulmamıştır.

## Öğrenme bileşenleri

| Bileşen | Sonuç |
|---|---:|
| Zenginleştirilen/yayınlanan bilgi nesnesi | 5 |
| Pilot kurs dersi | 5 |
| Öğretici quiz sorusu | 25 |
| Çift yüzlü flashcard | 30 |
| Gerçek işletme görevi | 5 |
| Açıklayıcı SVG görsel | 3 |
| Deterministik hesaplayıcı | 1 |
| Birincil/resmî kaynak | 3 |

Görevlerde talimat, örnek çıktı, kontrol listesi ve dereceli rubrik bulunur. Quizlerde doğru cevapla birlikte neden açıklaması vardır. Flashcard ön yüzü soru, arka yüzü bağımsız ve öğretici cevap olarak hazırlanmıştır.

## Hesaplayıcı

`fiyat_mimarisi` aracı şu ayrımı uygular:

- doğrudan, operasyon, sabit gider payı ve beklenen iade kaybı sabit tutarlı maliyet tarafında;
- kanal komisyonu, ödeme kesintisi ve hedef marj satış fiyatına bağlı oran tarafında çözülür.

Temel denklem:

`KDV hariç yönetim fiyatı = ilgili sabit tutarlı birim maliyetler ÷ (1 − komisyon − ödeme kesintisi − hedef marj)`

Araç, oranların toplamı yüzde 100 veya üzerindeyse hesabı reddeder. Sonucun KDV hariç yönetim fiyatı olduğu ve güncel sözleşme/işletme verisinin kullanılması gerektiği ekranda belirtilir.

## Kaynak ve gözden geçirme

- KGK — TMS 2 Stoklar
  https://kgk.gov.tr/Portalv2Uploads/files/Duyurular/v2/TMS/TMS_2_Stoklar.pdf
- U.S. Small Business Administration — Break-even Point
  https://www.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point
- Gelir İdaresi Başkanlığı — Katma Değer Vergisi Kanunu
  https://www.gib.gov.tr/mevzuat/kanun/436

İçeriklerde iddia yanı numaralı atıf, kaynakçada başlık/bağlantı/erişim tarihi ve vergi-profesyonel görüş kapsam uyarısı bulunur. Bir sonraki gözden geçirme 90 gün olarak ayarlanmıştır.

## Veri güvenliği ve geri dönüş

Pilot uygulanmadan önce özel format PostgreSQL yedeği alındı:

- Dosya: `BACKUPS/localakademi_phase3_pre_pilot_2026-07-28.dump`
- Boyut: 3.960.723 bayt
- SHA-256: `DD016333FE08CD583B52D313D2FE471235F9923984F0225F58998E3AC04A5CD3`
- `pg_restore -l` okunabilirlik kontrolü: başarılı

Uygulama betiği varsayılan olarak dry-run çalışır; veri yazmak için açıkça `--apply` gerekir. İşlem beş seçili bilgi nesnesi ve tek pilot kursla sınırlıdır.

## Doğrulama sonuçları

| Kontrol | Sonuç |
|---|---|
| Pilot içerik kalite doğrulaması | PASS |
| Backend TypeScript build | PASS |
| Frontend Vite build | PASS |
| Fiyat formülü birim testleri | 2/2 PASS |
| E2E | 86/86 PASS |
| Admin bootstrap izole | 30/30 PASS |
| Tam backend paket, seri dosya modu | 884/884 PASS (exit 0) |
| Canlı backend sağlık | HTTP 200 |
| Canlı hesaplayıcı listesi | `fiyat_mimarisi` mevcut |
| Canlı SVG sunumu | 3/3 HTTP 200, `image/svg+xml` |
| `git diff --check` | PASS |

Tam paket ilk paralel çalışmada ortak test veritabanını sıfırlayan `admin-bootstrap` ve E2E dosyalarının eş zamanlı çalışması nedeniyle 4 sahte hata verdi. İki dosya izole edildiğinde ve tam paket dosya paralelliği kapalı çalıştırıldığında bütün testler geçti.

## Sonraki karar

Pilot artık gerçek kullanıcı denemesine hazırdır. Sonraki adım, içeriği bütün 860 bilgi nesnesine otomatik yaymak değildir. Önce bu beş ders; anlaşılabilirlik, görev tamamlama, quiz madde kalitesi, kart hatırlama ve araç kullanım verileriyle değerlendirilmelidir. Kabulden sonra arketip bazlı dalgalar hâlinde diğer konulara uygulanmalıdır.
