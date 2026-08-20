# Faz 2 — Veritabanı Sertleştirme Raporu

Tarih: 18.08.2026 · Kapsam: `prisma/`, `scripts/`, `docker-compose.yml`,
`docker-entrypoint.sh`, `.env.example`

---

## 1. `npm test` gerçek veritabanını siliyordu — ✅ KAPATILDI

### Bulgu

`package.json` içindeki `pretest` adımı şunu çalıştırıyor:

```
prisma db push --skip-generate --accept-data-loss
```

Hedef doğrudan `process.env.DATABASE_URL` idi. Sabit `_test` adresi **yalnızca
bu değişken tanımsızsa** devreye giriyordu.

Kritik nokta: `vitest.config.ts` içindeki `env` bloğu bu betiğe **ulaşmaz** —
`pretest`, vitest'ten önce ayrı bir süreç olarak çalışır. Dolayısıyla
`DATABASE_URL` dolu olan her ortamda (`.env` yüklü geliştirici kabuğu, Docker
Compose, CI) `npm test` komutu **gerçek veritabanına yıkıcı şema push'u**
uyguluyordu. Depodaki `.env` gerçek `localakademi` veritabanını gösteriyor.

### Düzeltme

- `scripts/test-db-guard.ts` (yeni) — yan etkisiz, test edilebilir mantık.
- `scripts/apply-migration-to-tests.ts` — artık hedef, adı `_test` ile biten
  bir veritabanı olmak **zorunda**; değilse çıkış kodu 1 ile durur.
- Öncelik sırası: `TEST_DATABASE_URL` > `DATABASE_URL` > sabit test adresi.

Yıkıcı komutun kendisi yumuşatılmadı; **nereye gidebileceği** kısıtlandı.

### Kanıt

`tests/test-db-guard.test.ts` — 13 test. Aralarında gerçek alt süreç testi:
gerçek veritabanı hedeflendiğinde betik **çıkış kodu 1** veriyor, çıktıda
`DURDURULDU` var ve Prisma hiç konuşmuyor (komuta ulaşılmıyor).

Elle de doğrulandı: `DATABASE_URL`'i gerçek veritabanına ayarlayınca reddediyor,
tanımsızken `localakademi_test` üzerinde normal çalışıyor.

---

## 2. Sıcak sorgu yollarında eksik indeksler — ✅ EKLENDİ

### Bulgu

PostgreSQL'de yabancı anahtarlar MySQL'in aksine **otomatik indekslenmez**.
FK'si olup hiç indeksi olmayan 26 model vardı. Bunların hepsine körlemesine
indeks eklemedim; koda bakıp **gerçek okuma sorgusu olan** 7 modeli seçtim.

### Eklenen indeksler ve gerekçeleri

| Tablo | İndeks | Karşılık geldiği sorgu |
|---|---|---|
| `ActivityEvent` | `(userId, createdAt)` | `learnerDashboard.ts:48` |
| `Conversation` | `(userId, lastMessageAt)` | `conversation.ts:288` |
| `ConversationMessage` | `(conversationId, createdAt)` | `conversation.ts:79,218` |
| `FormulaCalculation` | `(userId, createdAt)` | `formulas.ts:518` — hesaplama geçmişi |
| `MentorSession` | `(userId, updatedAt)` | `mentor.ts:304` |
| `QuizAttempt` | `(userId, createdAt)` | `learnerDashboard.ts:71` |
| `QuizAttempt` | `(userId, koId)` | `learningPath.ts:289`, `pilotDashboard.ts:34` |
| `QuizQuestion` | `(quizId)` | `quiz-engine.ts:171` |

Okuma sorgusu bulamadığım tablolara (ör. `GeneratedReport`,
`DocumentConversation`, `KnowledgeObjectSource`) **indeks eklemedim** — tahmine
dayalı indeks yazma maliyeti getirir, kazanç getirmez.

### Uygulama

`prisma/migrations/20260818230000_add_hot_path_indexes/` · `prisma migrate deploy`
ile uygulandı (`migrate dev` bilinçli olarak kullanılmadı: drift görürse
veritabanını sıfırlamayı önerebilir).

**Yan bulgu:** `migrate diff` çıktısı tam olarak 8 `CREATE INDEX` ve başka
hiçbir şey içeriyordu — yani canlı geliştirme veritabanı ile şema arasında
**drift yok**.

### Kanıt

`pg_indexes` sorgusu 8/8 indeksi doğruladı. Tam test takımı şema değişikliğinden
sonra **91/91 dosya, 1355/1355 test** ile temiz geçti.

---

## 3. Uygulama veritabanına superuser olarak bağlanıyordu — ✅ ROL AYRILDI

### Bulgu

Uygulamanın bağlandığı `localakademi` rolü, Docker imajının bootstrap rolüydü:

```
rolsuper = true · rolbypassrls = true · rolcreaterole = true · rolcreatedb = true
```

Yani uygulamada bir açık, tek veritabanının değil **PostgreSQL sunucusunun
tamamının** ele geçmesi anlamına geliyordu. RLS baypası ve rol oluşturma dahil.

### Düzeltme — iki rol

| Rol | Kullanım | Yetki |
|---|---|---|
| `localakademi` | yalnız `prisma migrate deploy` | sahip, DDL |
| `localakademi_app` | çalışma zamanı sunucu | yalnız SELECT/INSERT/UPDATE/DELETE |

`scripts/setup-app-db-role.ts` (yeni) rolü oluşturur, yükseltilmiş nitelikleri
kapatır, DML yetkilerini verir ve şemada `CREATE`'i geri alır.

**`ALTER DEFAULT PRIVILEGES` adımı kritik:** onsuz, sahip rolün ileride
migration'la oluşturduğu her yeni tablo uygulama rolüne kapalı olur ve
uygulama bir sonraki migration'dan sonra kırılırdı.

Bu kısıtlamanın güvenli olduğunu önce doğruladım: `src/` içinde **tek bir ham
SQL yok** (`$executeRaw` / `$queryRaw` sıfır kullanım), uygulama tamamen Prisma
ORM. Çalışma zamanında DDL'e ihtiyaç yok.

`docker-entrypoint.sh` artık göç adımını `MIGRATE_DATABASE_URL` ile, sunucuyu
`DATABASE_URL` ile çalıştırıyor. `MIGRATE_DATABASE_URL` tanımsızsa eski
davranış korunuyor (geriye dönük uyumlu).

### Kanıt — rol gerçekten kısıtlı

`localakademi_app` ile bağlanıp denendi:

```
IZIN VERILDI : SELECT · INSERT · UPDATE · DELETE
REDDEDILDI   : CREATE TABLE · DROP TABLE · TRUNCATE · ALTER TABLE
               CREATE ROLE · ALTER ROLE ... SUPERUSER
```

Reddedilenlerin hepsi PostgreSQL hata kodu `42501` (insufficient_privilege).
10/10 beklenen davranış.

---

## 4. Zayıf varsayılan veritabanı parolası — ✅ KALDIRILDI

`docker-compose.yml` içinde iki yerde `${DB_PASSWORD:-localakademi}` vardı —
yani `DB_PASSWORD` tanımlanmazsa **üretim parolası "localakademi" oluyordu**.

Artık `${DB_PASSWORD:?...}` ve `${APP_DB_PASSWORD:?...}`. Tanımsızsa Compose
yüksek sesle duruyor:

```
required variable DB_PASSWORD is missing a value: DB_PASSWORD tanimlanmali
```

Bu, dosyada `CORS_ORIGIN` ve `AI_PROVIDER` için daha önce uygulanmış olan
kalıbın aynısı.

---

## 5. Veritabanı TLS — bilinçli olarak YAPILMADI

Faz 2 listesinde vardı, ama mevcut mimaride kazanç sağlamıyor:

- Postgres portu `127.0.0.1:5432`'ye bağlı — dışarı açık değil.
- Uygulama ile veritabanı arasındaki trafik Docker'ın iç ağında kalıyor,
  makineyi hiç terk etmiyor.

TLS'i **veritabanı ayrı bir sunucuya taşındığı gün** gerekli hale gelir. O
zamana kadar eklemek, koruma sağlamadan yapılandırma karmaşası getirir. Faz 3
(ops) altında "yönetilen/uzak veritabanına geçiş" koşuluna bağlandı.

---

## Yapılması gerekenler (sende)

1. **Üretimde rolü oluştur:**
   ```
   APP_DB_PASSWORD="<güçlü-parola>" npx tsx scripts/setup-app-db-role.ts
   ```
2. **`DB_PASSWORD` ve `APP_DB_PASSWORD` tanımla** — artık ikisi de zorunlu,
   tanımsızsa konteyner hiç başlamaz.
3. **`localakademi` parolasını döndür** — varsayılan "localakademi" parolası
   bugüne kadar geçerliydi, sızmış kabul edilmeli.

### Bilinçli olarak dokunulmadı

Yerel `.env` dosyandaki `DATABASE_URL` hâlâ `localakademi` (sahip rol).
Çalışan geliştirme ortamın; uygulama roluna çevirirsem `prisma migrate dev`
senin kabuğunda çalışmaz. Üretim yolu (Compose) bağlandı, yerel ortam sende.

---

## Değişen dosyalar

| Dosya | Durum |
|---|---|
| `scripts/test-db-guard.ts` | yeni |
| `scripts/setup-app-db-role.ts` | yeni |
| `tests/test-db-guard.test.ts` | yeni (13 test) |
| `prisma/migrations/20260818230000_add_hot_path_indexes/` | yeni, uygulandı |
| `scripts/apply-migration-to-tests.ts` | guard eklendi |
| `prisma/schema.prisma` | 8 `@@index` |
| `docker-entrypoint.sh` | göç/çalışma rolleri ayrıldı |
| `docker-compose.yml` | en az yetkili rol + zorunlu parolalar |
| `.env.example` | yeni değişkenler belgelendi |

Commit/push yapılmadı.
