# İşletme finansı B/C/D — çalışma durumu

## Uygulananlar

- Kredi/taksit planı, kasa/banka, personel ve izin modelleri; eklemeli migration.
- Tekrarlı isteklerde kredi/taksit, personel, izin ve yenileme kayıtları çoğalmaz.
- Mevcut kayıt, tekrarlama ve hatırlatma motorları kullanılır. Faiz veya bordro hesaplanmaz.
- Hesap bakiyesi tamamlanan hareketlerden türetilir. POS valörü gelmeden bakiye ve gerçekleşen gelir artırılmaz.
- Vergi profili, teyit edilmiş ilk tarihten planlama hatırlatmaları üretir. Bu otomatik resmî vergi takvimi entegrasyonu değildir; süre uzatımları/tatiller otomatik uygulanmaz.
- Web ve mobil: Krediler, Kasa/Banka, Personel; kayıt düzenlemede hesap/kategori/valör; aylık rapor; yenileme/vergi profili; Genel Bakış finans özeti.
- Okuma ekranı olmayan DocumentConversation için yeni yazımlar durduruldu; eski kayıtlar silinmedi.

## Doğrulama

- Web: 70 dosya / 514 test geçti. Production build geçti.
- Backend: genel turda 161 dosya geçti; conversation ve admin-bootstrap zaman aşımına takıldı. İkisi ayrı tekrar çalıştırıldığında 60/60 geçti.
- Finans + belge testleri: 45/45. Son POS tarih kontrolünden sonra finans testleri 7/7 tekrar geçti.
- Android: asıl mobil projede testDebugUnitTest geçti; installDebug Pixel_8 üzerinde başarılı.
- Emülatör ilk açılışında ANR uyarısı görüldü; yeniden başlatmada giriş ekranı açıldı. Oturum olmadığı için finans ekranları uçtan uca henüz gezilmedi.
- iOS cihaz/simülatör testi Windows üzerinde yapılmadı.

## Kapanmadan kontrol edilecekler

- Oturum açılmış emülatörde ve web tarayıcısında gerçek API ile yeni ekranların görsel/etkileşim kontrolü.
- Personel ekranı yönetim rolleriyle sınırlı; maaş/SGK kayıtları mevcut ortak kayıt motorunda tutuluyor. Genel kayıt, dışa aktarma ve hatırlatma yüzeylerinin personel verisi görünürlüğü ayrıca gözden geçirilmeli.
- Eski 30 günlük nakit projeksiyonunun POS valörüyle uyumu; yeni hesap ve aylık rapor valörü kullanıyor.
- Mobil aylık raporda kategori kırılımının web ile eşitlenmesi; form alanlarının tarih/sayı bileşenleriyle son uyum kontrolü.
- Vergi profili tekrar kaydedildiğinde mevcut üretilmiş tarihleri değiştirmez, eksikleri ekler. Mevcut tarih düzenleme ve yükümlülükten çıkış davranışı ürün kontrolü gerektirir.
- GeneratedReport listesi ve gerçek taranmış fatura OCR kontrolü bu turda yapılmadı.

## Çalışma alanları ve güvenlik

- Web/API: mevcut LocalAkademi_fixed çalışma alanı.
- Mobil değişiklikler asıl Desktop/localkarar mobil app/LocalKarar-Mobile klasörüne aktarıldı. Kullanıcının ContactsScreen.kt değişikliği korunmuştur.
- Ayrı mobil çalışma kopyası mobile-finance / codex/business-finance-bcd dalında duruyor.
- Yalnız 127.0.0.1/localakademi veritabanında migration uygulandı. Önceden var olan üç analyticsConsent alanı şemadan teyit edilip eski migration uygulanmış olarak işaretlendi.
- Yerel sunucu yeniden açıldı. Canlı sunucuya deploy, commit veya push yapılmadı.
