# İlk Uygulama Görevi: Sahte Başarıları Kaldır ve Yazma İşlemlerini Fail-Closed Yap

## Amaç

İşletme profili ve quiz denemelerinde veritabanı yazma hatası olduğunda kullanıcıya başarılı/kaydedilmiş görünümü verilmesini engellemek.

## Mevcut sorun

- `src/services/business.ts`, Prisma hatalarını `.catch(() => null)` veya `.catch(() => profile)` ile yutuyor ve payload/eski profil döndürebiliyor.
- `src/services/quizzes.ts`, quiz attempt create hatasını yutup `Date.now()` değerini ID gibi döndürüyor.
- Bu davranış veri kaybını görünmez yapar, dashboard sonuçlarını bozar ve destek/audit sürecini zorlaştırır.

## Kapsam

- Business profile GET/PUT ve dashboard sorgularında sessiz fallback'leri kaldır.
- Quiz attempt create ve history sorgularında sessiz fallback'leri kaldır.
- Beklenen not-found/validation durumlarını 4xx; DB/altyapı hatalarını tutarlı 5xx olarak döndür.
- Fastify logger'a request bağlamıyla hata yaz; payload, token veya hassas işletme verisini loglama.
- Frontend'de başarısız kaydı başarı gibi göstermeme ve tekrar deneme mesajı.
- Başarı ve hata yolları için otomatik testler.

## Kapsam dışı

- Yeni işletme özellikleri.
- Formula kataloğunu genişletme.
- Quiz soru üretim algoritmasını değiştirme.
- Genel Prisma repository katmanı refactor'u.

## Backend değişiklikleri

1. `business.ts` içindeki `as any`, optional chaining ve bütün `.catch` fallback'lerini kaldır; generated Prisma tiplerini kullan.
2. PUT payload'ını Zod ile doğrula; parasal alanlarda sonlu, sıfırdan büyük/eşit ve makul üst sınır uygula.
3. Upsert veya transaction kullanarak tek kullanıcı/tek profil bütünlüğünü garanti et.
4. `quizzes.ts` answers gövdesini Zod ile doğrula; boş, yinelenen veya bilinmeyen question ID'lerini reddet.
5. Attempt create başarısızsa 500 döndür; geçici ID üretme.
6. Public quiz GET'te yalnız published KO erişimine izin ver veya endpoint'i authenticate et.

## Frontend değişiklikleri

- Profil/quiz kaydetme çağrılarında non-2xx yanıtları başarı state'ine yazma.
- Kullanıcıya kalıcı olmayan, güvenli hata mesajı ve yeniden dene eylemi göster.
- Başarılı kayıttan sonra yalnız sunucudan gelen gerçek ID/veriyi kullan.

## Veri tabanı değişiklikleri

- Önce `BusinessProfile.userId` unique kısıtını doğrula; yoksa migration ekle.
- QuizAttempt için kullanıcı, KO ve zaman sorgularını destekleyen indeksleri doğrula.
- Veri silme veya backfill bu görevin parçası değildir.

## Güvenlik kuralları

- Tüm profil ve attempt sorgularında JWT `user.id` zorunlu.
- İstemciden userId kabul edilmez.
- Loglarda authorization, cevaplar içindeki hassas serbest metin veya finansal payload bulunmaz.
- Taslak/yayınlanmamış KO üzerinden quiz başlatılamaz.

## Test senaryoları

1. Kullanıcı kendi profilini oluşturur ve günceller.
2. Başka kullanıcının profiline erişemez.
3. Geçersiz para alanı 422 döndürür.
4. Prisma create/update/find hatası 500 döndürür ve başarı payload'ı dönmez.
5. Geçerli quiz attempt gerçek DB ID'siyle kaydolur.
6. Attempt create hatası 500 döndürür; `Date.now()` fallback'i yoktur.
7. Draft KO quiz isteği reddedilir.
8. Başka kullanıcının geçmişi görünmez.
9. Frontend hata durumunda başarı bildirimi göstermez.

## Kabul kriterleri

- Business ve quiz servislerinde DB işlemleri çevresinde boş/sahte fallback kalmaz.
- Başarılı her yazma yanıtının DB'de karşılığı vardır.
- Hata sözleşmeleri belgelenir ve test edilir.
- Mevcut 70 test ve yeni testler geçer.
- Backend/frontend build, Prisma validate ve Docker Compose config geçer.

## Geri alma planı

- Kod değişikliklerini tek committe tut.
- Şema değişikliği gerekiyorsa yalnız additive unique/index migration kullan.
- Hata oranı beklenmedik yükselirse kod commitini geri al; migration indeksi veri kaybetmeden yerinde kalabilir.

## Doğrulama komutları

```powershell
npm.cmd test
npm.cmd run build
npx.cmd prisma validate --schema prisma\schema.prisma
npm.cmd run build --prefix frontend
docker compose config
```
