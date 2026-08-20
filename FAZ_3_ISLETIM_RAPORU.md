# Faz 3 — İşletim: Yedekleme ve CI

Tarih: 20.08.2026

**Tam takım: arka uç 103/103 dosya · 1483/1483 test. Derleme temiz.**

Bu faza "kısmen var, neyin gerçekten çalıştığı ölçülecek" notuyla
başladım. Ölçtüm. İki şey çalışmıyordu ve ikisi de **çalışıyormuş gibi
görünüyordu** — asıl tehlikeli olan kısım bu.

---

## 1. 🔴 Hiç çalışan yedek yokmuş

### Bulgu

`BACKUPS/` klasöründe otomatik yedekleme betiğinin ürettiği **5 adet
`.sql` dosyası vardı ve BEŞİ DE 0 BAYTTI.**

Buna rağmen `npm run backup:restore:verify` şunu diyordu:

```json
{"ok":true,"engine":"postgresql","integrity":"N/A (pg_dump)","users":39,...}
```

### Neden

İki ayrı kusur üst üste binmiş:

**a) `verify-backup-restore.ts` hiçbir şey doğrulamıyordu.** PostgreSQL
dalında yedek dosyasına **hiç bakmıyordu**: canlı veritabanına bağlanıp
satır sayıyor ve `ok: true` basıyordu. Her yedek bozuk olsa bile aynı
çıktıyı verirdi.

**b) `pg_dump` çağrısı hiçbir ortamda çalışamazdı.** `DATABASE_URL`
Prisma'ya özel `?schema=public` parametresini taşıyor; `pg_dump` bunu
reddediyor:

```
pg_dump: error: invalid URI query parameter: "schema"
```

Ve kabuk yönlendirmesi (`> dosya`) hedefi pg_dump çalışmadan **önce**
oluşturduğu için geriye her seferinde 0 baytlık bir "yedek" kalıyordu.

Yani eksik olan sadece bir ikili değildi — **bağlantı dizesi yüzünden
yedekleme hiçbir makinede çalışmazdı.**

### Düzeltme

| Ne | Nasıl |
|---|---|
| `scripts/lib/pg-url.ts` (yeni) | Prisma parametrelerini temizler; libpq'nun tanıdığı alanlar kalır |
| `backup-database.ts` | Temiz URL kullanır; başarısızlıkta yarım dosyayı **siler**; dosya boşsa ya da pg_dump çıktısına benzemiyorsa **hata verir** |
| `verify-backup-restore.ts` | **Gerçekten geri yükler** (aşağıda) |
| İkisi de | `PG_DOCKER_CONTAINER` ile kapsayıcıdaki araçları kullanabilir |

Doğrulama artık üç kademeli ve hiçbiri atlanınca `ok: true` dönmüyor:

1. **Dosya** — en yeni yedek var mı, boş mu, pg_dump çıktısına benziyor mu
2. **Geri yükleme** — geçici bir veritabanına gerçekten yükleniyor mu
   (`ON_ERROR_STOP=1`, yani yarım yükleme başarı sayılmıyor)
3. **İçerik** — yüklenen kopyada beklenen tablolar dolu mu

`psql` yoksa **`PSQL_NOT_FOUND` ile çöker** — "doğrulayamadım" ile
"doğruladım" karıştırılmaz.

### Kanıt

```
1) npm run backup:database
   → ok: true, 57.009.145 bayt          ← ilk gerçek yedek

2) npm run backup:restore:verify
   → ok: true, "verified": "gerçek geri yükleme"
     restoredInto: restore_check_1787248745943
     users: 39, knowledgeObjects: 993, published: 337,
     quizzes: 872, communityPosts: 5     ← canlıyla birebir aynı
```

Geçici veritabanının düşürüldüğü ayrıca kontrol edildi.

**Diş kontrolü:** yedek dosyası bozulunca →
`BACKUP_NOT_A_DUMP`, çıkış kodu **1**.

---

## 2. 🔴 CI frontend'i hiç kapsamıyordu

### Bulgu

`release.yml` içindeki tek frontend satırı şuydu:

```yaml
- name: Frontend smoke test
  run: |
    ...
    node scripts/frontend-smoke.js || true
```

Üç sorun:

1. **`|| true`** — betik `process.exit(EXIT_CODE)` ile düzgün çıkıyor
   ama bu her başarısızlığı yutuyordu. Adım **asla** yapıyı kıramazdı.
2. **Adı yanlıştı.** Betik backend uç noktalarını deniyor (`/health`,
   `/auth/register`, `/business/business-profile`, `/dashboard`). Yanlış
   ad, frontend'in hiç kapsanmadığını gizliyordu.
3. **Gerçek frontend hiç yoktu.** 252 birim testi ve Vite derlemesi
   CI'da çalışmıyordu; kırık bir arayüz release gate'ten temiz geçerdi.

### `|| true` neyi gizliyormuş

Kaldırıp çalıştırınca duman testi **düştü** — üç ayrı bayat beklenti:

| Kontrol | Sorun |
|---|---|
| `/auth/register` | **Faz 6'da zorunlu kıldığım `acceptedLegal` eksikti** → 422. Kendi kırdığım şey, `\|\| true` yüzünden görünmemiş |
| `/non-existent-path` 404 bekliyordu | API dışı yol; SPA yedeği bilerek 200 dönüyor. Üstelik sonuç `public/` klasörüne göre değiştiği için **ortama bağlıydı** — hiçbir şey kanıtlamıyordu |
| `/dashboard` içinde `monthly_sales` arıyordu | O alan `/business/business-profile`'a ait. Uç nokta yeniden şekillendirilmiş, kontrol güncellenmemiş. Hata mesajı da yanlıştı: "expected 200, got 200" |

Üçü de düzeltildi; duman testi artık **7 geçti, 0 düştü, çıkış 0**.

### CI'ya eklenen

- `|| true` kaldırıldı, adım **API smoke test** olarak adlandırıldı
- Yeni **`frontend` işi**: `npm ci` → `vitest run` → `npm run build`
  (veritabanı gerektirmiyor, backend ile paralel koşuyor)

YAML geçerliliği doğrulandı; her iki komut da yerelde çalıştırıldı
(252/252 test, derleme temiz) — CI'ı kırmızıya düşürmediğinden emin
olmak için.

---

## 3. Log döndürme

`npm run logs:rotate` çalışıyor (kuru çalışma, 0 aşırı büyük dosya).
Sorun görülmedi.

---

## Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `scripts/lib/pg-url.ts` | yeni — Prisma parametrelerini temizler |
| `scripts/backup-database.ts` | temiz URL, boş/geçersiz dosya reddi, docker desteği |
| `scripts/verify-backup-restore.ts` | gerçek geri yükleme doğrulaması |
| `scripts/frontend-smoke.js` | üç bayat beklenti düzeltildi |
| `.github/workflows/release.yml` | `\|\| true` kaldırıldı, frontend işi eklendi |

Commit/push yapılmadı.

---

## Kalan / senin kararın

- **`BACKUPS/` içindeki 5 adet 0 baytlık `.sql`** duruyor. İçlerinde
  hiçbir şey yok ama "yedek" gibi görünüyorlar. Saklama mantığı en yeni
  6'yı tuttuğu için gerçek yedekler biriktikçe kendiliğinden düşecekler.
  Silmemi istersen söyle — silme geri alınamaz olduğu için kendiliğimden
  yapmadım.
- **Yedekleme zamanlanmış değil.** Betik artık çalışıyor ama onu düzenli
  çalıştıran bir şey yok; sunucu kurulunca cron/systemd timer gerekiyor
  (16. madde).
- **İzleme yok.** `/admin/stats` aralıklı 500'ü de bu yüzden hâlâ
  kanıtlanabilir değil.
