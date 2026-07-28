# Uyarlanabilir Kurs Arketipleri V2

## Kapsam

Bu katalog, mevcut konu kurslarının aynı metin şablonunun farklı başlıklarla çoğaltılmasını önler. Her kurs; konu, seviye, karar problemi ve kullanıcıdan beklenen iş çıktısına göre oluşturulur. Sayısal örnekler “temsili vaka” olarak etiketlenir; sektör ortalaması veya mevzuat hükmü gibi sunulmaz.

## Seviye yolculuğu

| Sıra | Rol | Kullanıcının ürettiği çıktı |
|---|---|---|
| 1 | Temel kavram ve teşhis | başlangıç fotoğrafı |
| 2 | Süreç ve ölçüm | ölçüm kartı veya süreç haritası |
| 3 | Ödünleşim ve senaryo | karşılaştırmalı karar |
| 4 | Gerçek işletme uygulaması | işletme verisiyle tamamlanmış çalışma |
| 5 | Yönetişim ve ölçekleme | sahip, eşik, ritim ve kontrol planı |

Üç seviyeli KBX kurslarında 1, 2 ve 5. roller kullanılır. Beş seviyeli CUR kurslarında rollerin tamamı uygulanır.

## Konu arketipleri

| Arketip | Uygun alan | Temel kanıt | Çalışma çıktısı |
|---|---|---|---|
| finansal-simulasyon | nakit, kâr, maliyet, fiyat | dönemsel gerçekleşen veri | senaryo tablosu |
| metrik-panosu | gelir, oran, kanal performansı | tanımlı pay ve payda | ölçüm kartı |
| surec-haritasi | sipariş, stok, kargo, kalite | zaman damgası ve hata kaydı | mevcut/hedef akış |
| karar-matrisi | kanal, tedarikçi, araç, strateji | ağırlıklı ölçütler | seçenek puan kartı |
| uyum-zaman-cizelgesi | vergi, hukuk, işveren yükümlülüğü | güncel resmî kaynak | tarih–sorumlu–kanıt planı |
| musteri-senaryosu | satış, itiraz, iletişim, sadakat | görüşme ve dönüşüm kaydı | konuşma/teklif taslağı |
| deney-panosu | reklam, içerik, dönüşüm | hipotez, kontrol ve sonuç | deney kartı |
| risk-kaydi | siber güvenlik, yapay zekâ, süreklilik | varlık, tehdit ve kontrol kanıtı | risk ve kontrol kaydı |
| yetkinlik-matrisi | ekip, işe alım, eğitim | rol ve gözlenebilir davranış | rol–yetkinlik planı |
| tedarikci-matrisi | satın alma ve tedarik zinciri | teslim, kalite ve maliyet kaydı | tedarikçi puan kartı |
| ihracat-belge-akisi | ihracat ve e-ihracat | resmî belge ve pazar gereği | belge kontrol listesi |
| kaynak-verimliligi | enerji, su, atık, sürdürülebilirlik | fiziksel tüketim ve faaliyet | baz çizgi panosu |
| is-modeli-kanvasi | girişimcilik ve büyüme | müşteri kanıtı ve varsayım testi | varsayım/deney matrisi |
| denetim-kontrol-listesi | kalite, veri, politika | tarihli kanıt ve istisna | öz denetim kaydı |

## Her bilgi nesnesinin kalite kapıları

- Konuya özgü bir karar problemi ve seviyeye özgü amaç
- En az üç ölçülebilir öğrenme çıktısı
- Kavram, sınır, ölçüm yöntemi, temsili vaka, uygulama ve kontrol bölümleri
- Konuya uygun tablo, akış veya karar görünümü
- En az iki doğrulanmış kaynak ve tarihli kaynakça
- Beş seçenekli değil, beş ayrı öğretici soru; her yanlış seçeneği ayırt ettiren açıklama
- Altı gerçek çift yüzlü kart: ön yüzde geri çağırma sorusu, arka yüzde bağımsız cevap, ayrıca ipucu
- İşletmenin kendi verisiyle yapılabilen görev, örnek çıktı, kontrol listesi ve dereceli puanlama
- Hukuk, vergi, platform ve profesyonel muhakeme konularında kapsam uyarısı ve kısa gözden geçirme süresi
- Placeholder, uydurma sektör ortalaması, kaynaksız kesin oran ve konu dışı kopya bulunmaması

## Yayın ilkesi

Önce bütün içerik bellekte üretilip kalite kapılarından geçirilir. Uygulama varsayılan olarak salt-okunur önizlemedir; yalnızca `--apply` kullanıldığında veritabanı değişir. Daha önce `adaptive-operational-v1` veya `knowledge-v2` standardıyla elle geliştirilmiş pilotlar korunur.
