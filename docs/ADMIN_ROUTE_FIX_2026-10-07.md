# Yönetim ekranı / API adres çakışması

## Sebep ve düzeltme

`/admin/audit-logs` ve `/admin/users` hem React sayfası hem Fastify API rotasıydı.
Doğrudan belge gezinmesi Bearer token taşımadığından API 401 JSON yanıtı ekrana çıkıyordu.

- Yönetim API'si `/api/admin` altında kayıtlı; frontend yönetim çağrıları güncellendi.
- `/admin` sayfa adresleri aynı kaldı; HTML GET istekleri SPA belgesini alıyor.
- Geliştirme proxy'sinde `/api/admin` için önek silmeyen kural eklendi.
- Eski `/admin` JSON/yazma API çağrıları açıkça 404 döner; HTML başarı yanıtı gibi görünmez.
- API authentication ve veritabanından güncel yönetici rolü kontrolü değiştirilmedi.
- Mevcut frontend oturum kapısı, girişsiz kullanıcıyı `/login` sayfasına yönlendiriyor.

## Dağıtım

Backend ile frontend birlikte yayınlanmalı. Eski frontend açık kalmış yönetim sekmeleri
yayından sonra yenilenmeli; eski API adresleri artık kullanılmıyor. Mobil Dart kodunda
bu yönetim API adreslerinin tüketicisi bulunmadı. Bu not yayın yapıldığı anlamına gelmez.

## Kontroller

Gerçek sunucu kayıtlarıyla HTML GET, API 401/403, bilinmeyen API 404 ve hız sınırı
ayrımı test edildi. Frontend API adresleri, oturum koruması ve mevcut token yenileme
testleri kapsandı. TypeScript kontrolü ve frontend üretim derlemesi başarılı.

Yerel PostgreSQL kapalı olduğu için mevcut `/health` testi 200 yerine 503 döndü.
Veritabanı gerektiren yönetici moderasyonu ve uçtan uca testler bu ortamda
doğrulanmadı; adresleri yeni API önekine güncellendi.
