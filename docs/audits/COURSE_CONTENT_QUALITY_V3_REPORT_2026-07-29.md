# LocalAkademi Kurs İçeriği Kalite V3 Raporu

Tarih: 29 Temmuz 2026
Karar: **PASS**

## 1. Kapsam

Bu çalışma, `sourceType=topic` olan 200 kursun tamamını ve bu kurslara bağlı 840 bilgi nesnesini yeni içerik standardına taşımıştır. Üç eski kurs ile bir küratörlü pilot kurs, yeni ve bağımsız içerik üretmek yerine onaylı bilgi nesnelerini yeniden kullanan gezinme koleksiyonlarıdır; benzerlik kapısında yapısal istisna olarak ayrı tutulmuştur.

## 2. Uygulanan içerik standardı

Her konu kursu aşağıdaki bileşenlere sahiptir:

- Konuya özgü amaç, hedef kullanıcı, iş problemi, karar ve ölçülebilir öğrenme çıktıları.
- Teşhis, ölçüm, senaryo, işletme uygulaması ve yönetişim rollerine ayrılmış üç veya beş ders.
- Teknik tanım, formül veya ölçüm kuralı; veri kapsamı ve yanlış yorum sınırı.
- KOBİ bağlamına uyarlanmış vaka, dengeleyici gösterge, karar eşiği ve uygulanabilir çalışma çıktısı.
- Her bilgi nesnesinde en az iki kayıtlı kaynak, görünür kaynakça ve en az bir bağlantılı kaynak.
- Her bilgi nesnesinde beş seçenekli değil, dört seçenekli ve açıklamalı beş öğretici soru.
- Her bilgi nesnesinde ön/arka yüz, ipucu ve uygulama bağlantısı bulunan altı flashcard.
- Talimat, örnek çıktı, kontrol listesi ve puanlama anahtarı bulunan bir işletme görevi.
- Kursa özgü bir SVG karar görseli ve erişilebilir açıklama.

Yakın fakat farklı konular ayrıca editoryal olarak ayrıştırılmıştır. Net kâr/kârlılık oranı, maliyet artı marj/maliyet değişim analizi, iade yönetimi/iade koşulları, mesafeli satış/mesafeli sözleşme ve MVP/lisanslama çiftleri ayrı tanım, karar, ölçüt, vaka ve teslim çıktıları kullanır.

## 3. Benzerlik kalite kapısı

Ölçüm; amaç ve çıktılar, ders içeriği, bilgi nesnesi çakışması, değerlendirme, açılış-kapanış, uygulama bölümleri ve görseller için ağırlıklı benzerlik hesaplar. Kabul sınırı her kurs çifti için en fazla `%25` olarak uygulanmıştır.

| Ölçüm | Önceki durum | Son durum |
|---|---:|---:|
| Karşılaştırılan kurs çifti | 19.900 | 19.900 |
| `%25` sınırını aşan çift | 20.031 (eski tüm-kurs ölçümünde) / V3 ilk turda 5.956 | **0** |
| Medyan benzerlik | `%48,70` (eski tüm-kurs ölçümü) | **%11,61** |
| En yüksek benzerlik | `%91,68` (eski tüm-kurs ölçümü) | **%24,82** |
| Bilgi nesnesi kimliği çakışması | — | **0** |

Son en yüksek çift, “İhracat Belge Kontrolü” ile “İhracat Sonrası Performans” kurslarıdır ve `%24,82` ile kabul sınırının altındadır.

## 4. Veri ve öğrenme bileşenleri

| Kontrol | Sonuç |
|---|---:|
| Konu kursu | 200 |
| Bilgi nesnesi / ders | 840 |
| Ders içinde görsel kullanımı | 840 / 840 |
| Kursa özgü SVG dosyası | 200 / 200 |
| Yayınlanmış ve doğrulanmış bilgi nesnesi | 840 / 840 |
| Geçerli güncel sürüm bağlantısı | 840 / 840 |
| En az iki kaynak | 840 / 840 |
| Kaynak başlığı ve otorite seviyesi | 840 / 840 |
| En az bir bağlantılı kaynak | 840 / 840 |
| Beş soruluk öğretici quiz | 840 / 840 |
| Dört seçenek ve doğru cevap eşleşmesi | 4.200 / 4.200 |
| Altı çift yüzlü flashcard | 5.040 / 5.040 |
| Uygulanabilir görev paketi | 840 / 840 |

## 5. Otomatik doğrulama

- Backend TypeScript derlemesi: **PASS**
- Backend testleri: **888/888 PASS**
- Frontend testleri: **12/12 PASS**
- Frontend üretim derlemesi: **PASS**
- V3 kurs kalite doğrulaması: **PASS**
- Quiz placeholder/kalite taraması: **PASS**
- V3 kalite modeli birim testleri: **4/4 PASS**

Eski `courses:verify` komutu, üç legacy gezinme kursunun onaylı bilgi nesnelerini bilinçli olarak yeniden kullanmasını 35 adet “duplicate mapping” olarak raporlamaktadır. Yeni V3 kapısı, 200 bağımsız konu kursunda bilgi nesnesi tekrarını ayrıca kontrol eder ve `0` çakışma bulur. Legacy koleksiyonların tekrar kullanımı içerik kopyası değil, belgelenmiş gezinme davranışıdır.

## 6. Tekrar çalıştırma

Ön izleme, uygulama ve doğrulama işlemleri ayrı komutlara bağlanmıştır:

```powershell
npm run learning:course-v3:preview
npm run learning:course-v3:apply
npm run learning:course-v3:verify
```

Üretici idempotent çalışır; içerik ve kalite sürümü değişmemiş bilgi nesneleri yeniden sürümlenmez. Yeni bir konu veya editoryal değişiklik eklendiğinde V3 doğrulaması yayın öncesi zorunlu kapı olarak çalıştırılmalıdır.

## 7. Sonuç

200 bağımsız konu kursunun tümü yeni içerik standardına geçirilmiş, kaynak–görsel–quiz–flashcard–görev bileşenleri doğrulanmış ve kurslar arası `%25` benzerlik sınırı sıfır ihlalle sağlanmıştır. İçerik paketi, uygulama içinde kullanıcı denemesi ve sonraki aşamadaki video senaryosu üretimi için hazırdır.
