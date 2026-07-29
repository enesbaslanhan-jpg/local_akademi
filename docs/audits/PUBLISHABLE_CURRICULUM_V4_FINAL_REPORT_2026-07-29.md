# LocalAkademi Yayınlanabilir Müfredat V4 — Nihai Rapor

Tarih: 29 Temmuz 2026
Karar: **PASS / Yayına hazır**

## 1. Sonuç

Önceki yapıdaki 204 dağınık kurs ve aynı konunun seviye varyantı olarak çoğaltılmış 840 bilgi nesnesi, veri silinmeden yeniden düzenlendi.

Nihai görünür katalog:

- 10 işletme alanı
- 40 sonuç odaklı kurs
- Her kursta tam 5 ders
- 200 benzersiz, kanonik bilgi nesnesi
- 200 farklı görsel
- Her bilgi nesnesinde 5 açıklamalı quiz sorusu
- Her bilgi nesnesinde 6 ön/arka flashcard
- Her bilgi nesnesinde rubrikli gerçek işletme görevi
- Her bilgi nesnesinde en az 2 bağlantılı kaynak

Eski kurslar yayından kaldırıldı. Kanonik olmayan 640 seviye kopyası ve diğer eski bilgi nesneleri silinmedi; `archived` durumuna alındı.

## 2. Bilgi mimarisi

Katalog sırası veritabanında `Course.sortOrder` alanıyla sabitlendi. Kurslar sonuç üretme sırasına göre Finans ve Nakit alanından başlıyor, Siber Güvenlik ve AI alanıyla tamamlanıyor.

E-ticaret artık dört görünür yol olarak düzenlendi:

1. E-Ticarete Başla: Kanalını Seç ve Mağazanı Kur
2. Sipariş, Stok ve İade Operasyonunu Kur
3. Ürün Kataloğunu ve Pazar Yeri Performansını Geliştir
4. Kargo Anlaşmasını ve Teslimat Sistemini Kur

## 3. Öğretim tasarımı

Tekrarlanan sabit bölüm şablonu kaldırıldı. Kurslar 12 farklı öğretim biçiminden uygun olanıyla yazıldı:

- örnek çözüm
- saha rehberi
- hata sökümü
- simülasyon
- süreç yürüyüşü
- karar laboratuvarı
- kanıt denetimi
- görüşme kliniği
- operasyon oyun planı
- zaman çizelgesi kliniği
- deney
- risk atölyesi

Her derste doğal giriş, konuya özgü ölçü veya süreç, temsili ama açıklanmış işletme vakası, uygulama çıktısı ve kaynak güncellik notu bulunur.

## 4. Görsel standardı

Dekoratif dört kutu düzeni kaldırıldı. V4 görselleri şu 11 görsel dilini kullanır:

- çizgi grafik
- sütun grafik
- yığılmış sütun
- şelale
- huni
- dağılım
- karar/risk matrisi
- süreç akışı
- yüzme kulvarı
- zaman çizelgesi
- karar ağacı

Grafiklerde ölçek, değer, birim ve konuya özgü seri etiketleri; süreçlerde konuya özgü düğümler bulunur. Her SVG erişilebilir `title` ve `desc` bilgisi ile benzersiz görsel parmak izi taşır.

## 5. Kaynak politikası

Mevcut kaynak bağlantıları korundu. E-ticaret, hukuk/vergi ve siber güvenlik/AI derslerine birincil ve resmî kaynaklar ayrıca bağlandı.

Örnek resmî kaynaklar:

- T.C. Ticaret Bakanlığı Elektronik Ticaret Mevzuatı
- Amazon Türkiye resmî satıcı ve ürün listeleme kılavuzu
- Trendyol iş ortakları resmî sayfası
- Hepsiburada resmî satıcı başvuru sayfası
- n11 resmî Mağaza Destek Merkezi
- Yurtiçi Kargo resmî standart taşıma sözleşmesi
- Gelir İdaresi Başkanlığı E-Belge portalı
- NIST Cybersecurity Framework
- NIST AI Risk Management Framework

Değişken ücret, oran, süre ve hukuki koşullar metinde sabit gerçek gibi sunulmaz; işlem tarihinde resmî kaynaktan yeniden doğrulama uyarısı bulunur.

## 6. Otomatik yayın kapısı

`npm run learning:publishable-v4:verify` sonucu:

| Kontrol | Sonuç |
|---|---:|
| Yayındaki kurs | 40/40 |
| Ders | 200/200 |
| Benzersiz KO | 200/200 |
| Öğretim biçimi | 12 |
| Görsel dili | 11 |
| Benzersiz görsel | 200/200 |
| En yüksek içerik benzerliği | 0,838 |
| Kalite hatası | 0 |

Yayın kapısı ayrıca kaynak, içerik uzunluğu, bölüm yapısı, quiz cevap ve açıklamaları, flashcard ön/arka kalitesi, görev yönergesi/rubriği, görsel dosya ve erişilebilirlik bilgilerini kontrol eder.

## 7. Uygulama testleri

- Backend TypeScript build: PASS
- Backend: 50 test dosyası, 888/888 PASS
- Frontend: 3 test dosyası, 12/12 PASS
- Frontend production build: PASS
- V4 yayın kapısı: PASS

## 8. Geri dönüş ve veri güvenliği

Yayın öncesi PostgreSQL yedeği:

`BACKUPS/localakademi_pre_publishable_v4_2026-07-29.dump`

Yedek `pg_restore -l` ile okunabilirlik kontrolünden geçti. Eski kurs ve bilgi nesneleri fiziksel olarak silinmediğinden içerik düzeyinde geri dönüş de mümkündür.

## 9. Tekrar çalıştırma

İşlem idempotent tasarlandı:

```powershell
npm run learning:publishable-v4:preview
npm run learning:publishable-v4:apply
npm run learning:publishable-v4:verify
```

Önizleme veri değiştirmez. Uygulama komutu kanonik seti günceller. Doğrulama başarısızsa yayın tamamlanmış kabul edilmez.
