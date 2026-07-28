# Tüm Kurslar Uyarlanabilir İçerik V2 Raporu

**Tarih:** 28.07.2026

**Karar:** GO
**Kapsam:** Mevcut 204 kursun tamamı; 200 konu kursu, 3 eski küratörlü yol, 1 fiyat/marj pilotu

## Sonuç

Pilot olarak geliştirilen operasyonel eğitim standardı bütün mevcut konu kurslarına uygulandı. Daha önce editoryal olarak geliştirilmiş 5 nakit akışı ve 5 fiyat/marj bilgi nesnesi korunarak, kalan 830 bilgi nesnesi yeniden üretildi ve yayımlandı.

Üç eski kursta bulunan 33 kısa, tekrarlı ve yer yer konu dışı ders temizlendi. Kurslar silinmeden, güçlendirilmiş bilgi nesnelerine bağlanan 10’ar derslik küratörlü öğrenme yollarına dönüştürüldü:

- E-ticaret Maliyet ve Kârlılık
- Nakit Akışı Yönetimi
- Vergi ve Yasal Yükümlülükler

| Ölçüt | Sonuç |
|---|---:|
| Konu kursu | 200 |
| Küratörlü eski kurs | 3 × 10 ders |
| Küratörlü fiyat/marj pilotu | 1 × 5 ders |
| Uygulamadaki toplam kurs | 204 |
| Kurslara bağlı benzersiz KO | 840 |
| V2 ölçekleme ile yenilenen KO | 830 |
| Korunan editoryal pilot KO | 10 |
| Üretilen öğretici quiz sorusu | 4.150 |
| Üretilen çift yüzlü flashcard | 4.980 |
| Üretilen işletme görevi | 830 |
| Yeni KO kaynak bağlantısı toplamı | 3.269 |
| İçerik uzunluğu | min. 6.291, medyan 6.699, maks. 7.088 karakter |
| Birebir benzersiz içerik | 840/840 |
| İçerik arketipi | 11 |

## Özgünlük yaklaşımı

İçerikler yalnızca başlık değiştiren tek bir şablondan üretilmedi. Konuya göre aşağıdaki arketipler kullanıldı:

- finansal simülasyon,
- süreç haritası,
- deney panosu,
- müşteri senaryosu,
- tedarikçi matrisi,
- uyum zaman çizelgesi,
- yetkinlik matrisi,
- iş modeli kanvası,
- risk kaydı,
- ihracat belge akışı,
- kaynak verimliliği.

Her arketibin kendine ait uygulama laboratuvarı vardır. Ayrıca başlangıç, süreç/ölçüm, senaryo, işletme uygulaması ve yönetişim seviyeleri farklı öğrenme akışları kullanır.

Beşli-kelime kümeleriyle yapılan komşu seviye benzerlik testinde:

- ilk ölçekleme en yüksek değer: **%82,68**
- arketip ve seviye laboratuvarları sonrası: **%69,28**
- kabul eşiği: **en fazla %72**

Sonuç kalite kapısını geçti.

## Pedagojik paket

Her yeni bilgi nesnesinde:

- açık karar problemi,
- konuya ve seviyeye özgü amaç,
- ölçüm kartı,
- “temsili vaka” olarak açıkça etiketlenmiş sayısal örnek,
- seçenek ve yan etki karşılaştırması,
- işletme verisiyle uygulama,
- beş açıklamalı quiz sorusu,
- altı çift yüzlü flashcard ve ipucu,
- örnek çıktı, kontrol listesi ve rubrik içeren görev,
- numaralı, tarihli kaynakça,
- değişken veya yüksek riskli konularda kapsam uyarısı

bulunur.

## Kaynak politikası

Kaynaklar resmî/birincil kurum önceliğiyle alan bazında eşleştirildi. Kullanılan ana kaynak aileleri KGK, GİB, Ticaret Bakanlığı, KVKK, SGK, KOSGEB, ILO, OECD, NIST, ENISA, ISO ve Avrupa Komisyonu kaynaklarıdır. Platform dokümantasyonu kullanılan alanlarda değişkenlik uyarısı eklenmiştir.

Temsili vaka sayıları kaynaklara atfedilmez ve sektör ortalaması olarak sunulmaz. Hukuk, vergi, sosyal güvenlik, ihracat, siber güvenlik ve yapay zekâ alanlarında profesyonel/güncel kontrol uyarıları bulunur.

## Güvenlik ve geri dönüş

Uygulama öncesi PostgreSQL custom-format yedeği alındı ve `pg_restore -l` ile okunabilirliği doğrulandı:

- `BACKUPS/localakademi_pre_adaptive_v2_2026-07-28.dump`
- SHA-256: `F54D0C6EF98AAB85945F2C151F1078C9306ECDA57A3759F15B9B017A943FD7FA`

Ölçekleme komutu varsayılan olarak salt-okunur önizleme çalıştırır. Veritabanına yazmak için ayrıca `--apply` gerekir. İşlem tekrar çalıştırılabilir; yayın olayı yinelenmez.

Başarıyla yayımlanan son durum da ayrıca yedeklendi ve okunabilirliği doğrulandı:

- `BACKUPS/localakademi_post_adaptive_v2_2026-07-28.dump`
- SHA-256: `A693823D020054F5FF7222EE4670B2F913871E9D3A2F59398B09E7310C17C814`

## Doğrulamalar

| Kontrol | Sonuç |
|---|---|
| Adaptive V2 içerik kapısı | PASS |
| 204 kursun tamamında kullanılabilir öğrenme yolu | PASS |
| 840/840 birebir benzersizlik | PASS |
| Komşu seviye benzerliği ≤ %72 | PASS — %69,28 |
| Nakit Akışı V2 doğrulaması | PASS |
| Fiyat/Marj pilot doğrulaması | PASS |
| Backend TypeScript derleme | PASS |
| Backend tam test paketi | PASS — 884/884 |
| Frontend testleri | PASS — 12/12 |
| Frontend üretim derlemesi | PASS |

Not: Eski `verify-topic-courses.ts`, özel fiyat/marj pilot kursunda aynı KO’ların ikinci bir küratörlü öğrenme yolunda kullanılmasını beş “duplicate mapping” olarak raporlar. Bu beklenen çapraz kurs kullanımıdır. Adaptive V2 doğrulayıcısı benzersiz topic-course kapsamını ve özel pilotu ayrı kurallarla doğrular.

## Kullanım komutları

```powershell
npm run learning:adaptive-v2:preview
npm run learning:adaptive-v2:verify
```

Yeniden uygulama yalnızca bilinçli veri güncellemesinde:

```powershell
npm run learning:adaptive-v2:apply
```

## Sonraki editoryal dalga

Bu çalışma bütün kurslara güvenli ve özgün bir operasyonel taban kazandırır. Bir sonraki dalga, kullanıcı geri bildirimine göre en çok kullanılan kurslarda insan editoryal derinleştirmesi, konuya özel SVG/grafik, indirilebilir şablon ve 3–7 dakikalık video üretimidir. Video metinleri ancak bu onaylı içerik sürümü üzerinden oluşturulmalıdır.
