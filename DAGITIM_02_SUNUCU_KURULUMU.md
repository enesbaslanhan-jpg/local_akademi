# Dağıtım — Adım 2: Sunucu Kurulumu

Tarih: 20.08.2026

Adım 1 (DNS + Resend) bitti. Bu adımın sonunda
`https://localkarar.com` çalışıyor ve e-posta gerçekten gidiyor olacak.

**Sunucu:** Ubuntu 24.04 · `57.131.143.54` · `ubuntu` kullanıcısı

> Komutları sen çalıştıracaksın — sunucuya erişimim yok ve olmasını da
> önermem. Her adımda **ne yaptığı** ve **nasıl doğrulanacağı** yazılı.
> Bir adım beklendiği gibi sonuçlanmazsa devam etme, bana söyle.

---

## Ön koşullar

Bunlar Adım 1'den kalmıştı, başlamadan tamamla:

- [ ] Namecheap'te `kvkk@localkarar.com` alias'ı açık
- [ ] Resend → API keys → bir anahtar oluşturulmuş (`re_...`)
- [ ] Cloudflare → SSL/TLS → **Full (strict)** seçili

---

## 1. Docker kurulumu

```bash
sudo apt update && sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

**Çıkış yapıp yeniden bağlan** (grup üyeliği yeni oturumda geçerli olur).

**Doğrula:**

```bash
docker run --rm hello-world
```

---

## 1.5. 🔴 ÖNCE: yereldeki işi push'la

Sunucu kodu **GitHub'dan** alıyor (aşağıdaki `git clone`). Yerel
diskindeki commit'lenmemiş iş sunucuya **ULAŞMAZ** — ne kadar test
edilmiş olursa olsun.

Bu rehber uzun süre bunu hiç söylemiyordu ve 30.08.2026'da tam olarak
bu duruma girildi: 202 dosyalık bir iş (yasal belgeler, satıcı
kimliği, ortak alt bilgi, üyelik ekranları, üç yeni göç) yalnız
yereldeydi; `origin` ile HEAD birebir aynıydı. O hâlde dağıtılsaydı
sunucu aylar öncesinin kodunu çekecekti.

Kendi makinende:

```bash
git status --porcelain | wc -l
```

**Sıfır olmalı.** Değilse commit'leyip push'la. Sonra:

```bash
git rev-list --left-right --count origin/design/localkarar-18...HEAD
```

**`0	0` olmalı** — soldaki sayı origin'de olup sende olmayanı, sağdaki
sende olup origin'de olmayanı gösterir. Sağdaki sıfır değilse
push'lanmamış commit var.

⚠️ Özellikle `prisma/migrations/` altındaki YENİ klasörler: izlenmeyen
bir göç klasörü sessizce dışarıda kalır, `migrate deploy` "bekleyen
göç yok" der ve o tabloya dokunan her sorgu üretimde 500 verir.

```bash
git ls-files prisma/migrations/ | cut -d/ -f3 | sort -u | tail -5
```

Çıktıdaki son klasörler, `ls prisma/migrations` çıktısındaki son
klasörlerle **aynı** olmalı.

---

## 2. Kodu sunucuya al

```bash
cd ~
git clone -b design/localkarar-18 https://github.com/enesbaslanhan-jpg/local_akademi.git localkarar
cd localkarar
```

> ⚠️ **Dal adı önemli.** Bütün bu çalışma `design/localkarar-18`
> dalında; varsayılan dal ESKİ kodu verir.

**Doğrula** — doğru dalda ve doğru commit'te misin:

```bash
git log --oneline -1
ls deploy/
```

`deploy/` içinde dört dosya olmalı
(`Caddyfile`, `docker-compose.prod.yml`, `env.production.example`,
`firewall.sh`). Yoksa yanlış dal çekilmiş.

---

## 3. Ortam değişkenleri

```bash
cp deploy/env.production.example .env
nano .env
```

Doldurulacaklar dosyada tek tek yazılı. Dördüne dikkat:

- **`JWT_SECRET`** — üret, elle uydurma:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  (Node yoksa: `openssl rand -hex 32`)
- **`INTEGRATION_ENCRYPTION_KEY`** — 🔴 **boş bırakma.** Aynı komutla
  ayrı bir değer üret. Boş kalırsa uygulama anahtarı `JWT_SECRET`'ten
  türetir; o zaman `JWT_SECRET` bir gün döndürüldüğünde saklanmış bütün
  pazaryeri mağaza kimlik bilgileri kalıcı olarak çözülemez hâle gelir.
  Hiçbir hata vermez, yıllar sonra ortaya çıkar.

  ⚠️ Bu değişken uzun süre bu dosyada **hiç yoktu** (30.08.2026'da
  eklendi). Eski bir sunucuda `.env` içinde yoksa şimdi ekle — üretimde
  henüz bağlı mağaza yokken bedelsiz, sonra değil.
- **`MAIL_FROM`** — `@mail.localkarar.com` ile bitmeli, yoksa Resend reddeder
- **`TRUST_PROXY=2`** — dosyada zaten yazılı, **değiştirme**. Sebebi
  aşağıda 6. adımda.

**Doğrula:** boş kalan zorunlu alan var mı:

```bash
grep -E '^[A-Z_]+=$' .env
```

Çıktı boşsa tamam.

---

## 4. Uygulama portu — yapacağın bir şey YOK

`docker-compose.yml` uygulamayı zaten `127.0.0.1:3000:3000` ile
bağlıyor: yalnız makine içinden erişilebiliyor, dışarı açılan tek şey
Caddy'nin 80/443'ü.

> **Bu adımda önceden bir düzenleme isteniyordu ve yanlıştı.**
> Rehber, `docker-compose.yml` içindeki port satırını sunucuda ELLE
> değiştirmeni söylüyordu. Sonuç: izlenen bir dosyada yerel değişiklik
> kaldı ve o dosyaya dokunan ilk güncellemede `git pull`
> *"local changes would be overwritten"* diyerek durdu (22.08.2026).
>
> Düzeltmenin neden prod override'a port eklemek olmadığı da önemli:
> Compose'da `ports` listesi override dosyasında **eklenir**, üst
> dosyadan kaldırılamaz. Yani oraya `127.0.0.1`li satırı yazmak
> `"3000:3000"`i silmez; ikisi birden geçerli olur ve port yine dışarı
> açık kalırdı. Doğru çözüm tabanı baştan güvenli yapmaktı.
>
> Eski kurulumdan gelen bir sunucuda bu yerel değişiklik hâlâ duruyor
> olabilir. `git status` temiz değilse:
> `git checkout -- docker-compose.yml`

---

## 5. TLS sertifikası (Cloudflare Origin Certificate)

**Neden ACME değil:** Cloudflare proxy'si açık olduğu için Let's
Encrypt'in HTTP-01 doğrulaması Cloudflare üzerinden geçmek zorunda ve
kırılgan. DNS-01 alternatifi ise Cloudflare'da **DNS yazma yetkisi**
olan bir API tokeni ister — aynı yetkiyi Resend'e vermeyi reddetmiştik,
kendimize de vermiyoruz.

Origin sertifikası ücretsiz, **15 yıl** geçerli ve yalnız Cloudflare
tarafından güvenilir — zaten istenen bu.

**Cloudflare'da:** SSL/TLS → Origin Server → **Create Certificate** →
varsayılanları kabul et → iki metin çıkar.

**Sunucuda:**

```bash
mkdir -p deploy/certs
nano deploy/certs/origin.pem   # "Origin Certificate" kutusunu yapıştır
nano deploy/certs/origin.key   # "Private Key" kutusunu yapıştır
chmod 600 deploy/certs/origin.key
```

> Özel anahtar Cloudflare'da **bir kez** gösteriliyor. Kaybedersen yeni
> sertifika üretmen gerekir.

---

## 6. Güvenlik duvarı — bu adımı atlama

```bash
sudo bash deploy/firewall.sh
```

**Neden kritik:** uygulama istemci IP'sini `X-Forwarded-For`
başlığından okuyor ve giriş/kayıt/şifre sıfırlama hız sınırları buna
dayanıyor. Sunucunun gerçek IP'sine **doğrudan** ulaşabilen biri bu
başlığı uydurup bütün sınırları aşabilir.

Bu ölçülmüştü: koşulsuz güven halinde 3/saat sınırında **6/6 istek
geçiyordu**.

Betik 80/443'ü yalnız Cloudflare IP aralıklarına açıyor. Böylece
başlığı uydurabilecek kimse kalmıyor — tek giriş yolu Cloudflare ve
başlığı o yazıyor.

`TRUST_PROXY=2` de buradan geliyor: zincir **Cloudflare → Caddy →
Fastify**, yani iki sıçrama.

---

## 7. Kısayol

Bundan sonraki her komut iki `-f` bayrağı istiyor. Bir kez kısaltalım:

```bash
echo "alias lk='docker compose -f ~/localkarar/docker-compose.yml -f ~/localkarar/deploy/docker-compose.prod.yml --project-directory ~/localkarar'" >> ~/.bashrc && source ~/.bashrc
```

`--project-directory` önemli: proje adı (`localkarar`) oradan türüyor.
Onsuz komutu başka bir klasörden çalıştırınca Compose farklı bir proje
adı uydurup **yeni ve boş** kapsayıcılar açar — mevcut veritabanını
görmezden gelerek. Birkaç gün sonra "verilerim gitti" gibi görünen,
bulması sinir bozucu bir hatadır.

---

## 8. Önce veritabanı, sonra uygulama rolü — sıra ÖNEMLİ

> ⚠️ Bu bölüm bir kez yanlış sırada yazılmıştı ve kurulum orada takıldı.
> Sebep: `docker-compose.yml` **iki ayrı rol** kullanıyor.
>
> | Rol | Nerede | Yetki |
> |---|---|---|
> | `localakademi` | yalnız `prisma migrate deploy` | sahip, DDL var |
> | `localakademi_app` | uygulamanın kendisi | yalnız `SELECT/INSERT/UPDATE/DELETE` |
>
> Uygulama ikinci rolle bağlanıyor. O rol yoksa göçler geçer ama sunucu
> açılışta `Authentication failed ... localakademi_app` ile döngüye
> girer. Yani rol, uygulamadan **önce** var olmalı.

### 8.1 Yalnız veritabanını başlat

```bash
lk up -d postgres
```

`lk ps` çıktısında `localakademi-postgres` **(healthy)** olmalı.

### 8.2 Uygulama rolünü oluştur

```bash
cd ~/localkarar && oku() { grep -m1 "^$1=" .env | cut -d= -f2- | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"; }; lk exec -T -e PGPASSWORD="$(oku DB_PASSWORD)" postgres psql -U localakademi -d localakademi -v ON_ERROR_STOP=1 -v pw="$(oku APP_DB_PASSWORD)" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', 'localakademi_app')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'localakademi_app')
\gexec
ALTER ROLE "localakademi_app" LOGIN PASSWORD :'pw';
ALTER ROLE "localakademi_app" NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE "localakademi" TO "localakademi_app";
GRANT USAGE ON SCHEMA public TO "localakademi_app";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "localakademi_app";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "localakademi_app";
ALTER DEFAULT PRIVILEGES FOR ROLE "localakademi" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "localakademi_app";
ALTER DEFAULT PRIVILEGES FOR ROLE "localakademi" IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "localakademi_app";
REVOKE CREATE ON SCHEMA public FROM "localakademi_app";
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
FROM pg_roles WHERE rolname = 'localakademi_app';
SQL
```

**Beklenen son satır:** `localakademi_app | f | f | f | f`

Tekrar çalıştırmak güvenli — rol varsa yalnız parolayı ve yetkileri
günceller.

> **`scripts/setup-app-db-role.ts` neden kullanılmıyor:** aynı işi yapar
> ama **son imajda çalıştırılamaz** — imaj `npm ci --production` ile
> kuruluyor, `tsx` bir dev bağımlılığı ve `scripts/` klasörü imaja hiç
> kopyalanmıyor. Betik geliştirme ortamı için duruyor; sunucuda
> yukarıdaki SQL kullanılıyor.

### 8.3 Rolün gerçekten kısıtlı olduğunu doğrula

```bash
cd ~/localkarar && oku() { grep -m1 "^$1=" .env | cut -d= -f2- | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"; }; lk exec -T -e PGPASSWORD="$(oku APP_DB_PASSWORD)" postgres psql -h 127.0.0.1 -U localakademi_app -d localakademi -c 'CREATE TABLE sizinti(x int);'
```

**`ERROR: permission denied for schema public` beklenen çıktı.**
Komut başarılı olursa rol yanlış kurulmuş demektir — durdur, bana söyle.

> `DROP TABLE` yerine `CREATE TABLE` deneniyor, çünkü `DROP` başarılı
> olsaydı tabloyu gerçekten silerdi. Yetki testinin kendisi veri
> kaybettirmemeli.

---

## 9. Tümünü başlat

```bash
lk up -d --build
lk logs --tail=40 server
```

Göçler açılışta otomatik çalışır (`docker-entrypoint.sh`) ve sahip
rolüyle koşar (`MIGRATE_DATABASE_URL`).

Aranan: göç satırları ve sonunda **`Server listening`**.

Ayakta olması gerekenler: **postgres**, **server**, **caddy**.

> Compose'da bir `redis` servisi de tanımlı ama `with-redis` profili
> arkasında ve **kod onu hiç kullanmıyor** (`REDIS_URL` yok, istemci
> yok). Varsayılanda başlamıyor — doğru davranış, dokunma.

**Doğrula** — uygulamanın kendisi ve dış zincir ayrı ayrı:

```bash
curl -s -o /dev/null -w "yerel health: %{http_code}\n" http://127.0.0.1:3000/health && curl -sI https://localkarar.com | head -3
```

İlki uygulamayı, ikincisi **Cloudflare → Caddy → uygulama** zincirini
ölçüyor. İlki 200 verip ikincisi vermezse sorun ağ/sertifika
tarafındadır, uygulamada değil.

---

## 10. Yedekleme zamanlaması

**Önce elle bir kez çalıştır ve gerçekten yedek alındığını gör:**

```bash
lk exec -T server npm run ops:backup
```

Beklenen: `"ok": true` ve **sıfırdan büyük** bir `bytes` değeri.

**Sonra yedeğin geri yüklenebildiğini kanıtla:**

```bash
lk exec -T server npm run ops:backup:verify
```

Bu komut yedeği geçici bir veritabanına **gerçekten geri yüklüyor** ve
satırları sayıyor. `"verified": "gerçek geri yükleme"` görmelisin.
Denenmemiş yedek yedek değildir.

**Sonra zamanla** — her gece 03:30:

```bash
crontab -e
```

Eklenecek satır:

```
30 3 * * * cd /home/ubuntu/localkarar && /usr/bin/docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml --project-directory /home/ubuntu/localkarar exec -T server npm run ops:backup >> /home/ubuntu/backup.log 2>&1
```

> `lk` kısayolu cron içinde ÇALIŞMAZ: kısayol `~/.bashrc`'de tanımlı,
> cron ise onu okumayan bir kabuk kullanıyor. Bu yüzden satırın tamamı
> açık yazılmış.

Ertesi gün kontrol:

```bash
tail -5 ~/backup.log
```

### Bu bölüm neden yeniden yazıldı

Önceki hâli `npm run backup:database` diyordu ve **sunucuda hiç
çalışamazdı**. Sebebi üç katlıydı, üçü de ölçülerek bulundu (22.08.2026):

| Eksik | Sonuç |
|---|---|
| İmajda `scripts/` ve `tsx` yok | Komut hiç başlamıyordu |
| İmajda `pg_dump` yok | Başlasa bile döküm alınamazdı |
| Yedekler için kalıcı birim yok | Alınsa bile kapsayıcı yenilenince silinirdi |

Aynı tuzak daha önce iki kez daha çıkmıştı (en az yetkili veritabanı
rolü ve yönetici oluşturma betikleri). Bu yüzden bu sefer yamamak yerine
kökten çözüldü: işletim betikleri artık derlenip imaja konuyor ve düz
`node` ile çalışıyorlar, `postgresql16-client` imaja eklendi,
yedekler `server-backups` biriminde duruyor.

Yol üstünde iki hata daha çıktı:

- **Saklama temizliği Linux'ta hiç çalışmıyordu.** Eski yedekleri silen
  kontrol `startsWith(klasör + '\')` yazıyordu — ters eğik çizgi
  Windows'a özgü. Linux'ta hiçbir dosya eşleşmiyor, yani hiçbir eski
  yedek silinmiyordu. Günde 57 MB ile disk zamanla dolardı.
- **Yedek, uygulamanın en az yetkili rolüyle alınıyordu.** O rol yalnız
  okuma/yazma yetkisine sahip; onunla alınan bir `pg_dump` sessizce
  eksik kalabilir ve bu ancak geri yüklerken anlaşılır. Artık göçlerde
  kullanılan sahip rolü tercih ediliyor.

---

## 11. Kabul testleri — hepsi geçmeli

### 11.1 Site açılıyor ve şifreli

```bash
curl -sI https://localkarar.com | head -3
```

Tarayıcıda da aç: kilit görünmeli. Cloudflare **Full (strict)** olduğu
için kenar–sunucu arası da şifreli demektir.

### 11.2 🔴 Hız sınırı — iki yönlü

`TRUST_PROXY` yanlışsa ikisinden biri kesin bozuk çıkar.

**a) Sahte başlıkla sınır aşılamıyor:**

```bash
for i in $(seq 1 8); do
  curl -s -o /dev/null -w "%{http_code} " \
    -H "X-Forwarded-For: 1.2.3.$i" \
    -X POST https://localkarar.com/auth/password-reset/request \
    -H "Content-Type: application/json" \
    -d '{"email":"yok@ornek.com"}'
done; echo
```

Sınır 3/saat. **Beklenen: birkaç `200`, sonra `429`.** Hepsi `200`
gelirse başlık uydurularak sınır aşılıyor demektir — **durdur**.

**b) Herkes tek kovaya düşmüyor:** telefonundan (mobil veri, farklı IP)
siteye gir, giriş yapmayı dene. Az önce sınıra takıldıysan bile
telefonda takılmamalısın.

### 11.3 🔴 E-posta gerçekten gidiyor

`https://localkarar.com/forgot-password` → kendi adresin.

Gelen postada kontrol et:

- Kutuya düştü mü (**spam klasörüne de bak**)
- Kaynağında `dkim=pass` ve `spf=pass` var mı
  (Gmail: postayı aç → ⋮ → "Orijinali göster")
- Bağlantı `https://localkarar.com/reset-password?token=...` mi —
  `links.mail.localkarar.com` gibi bir adrese dönüşmüşse tıklama takibi
  açık kalmış demektir

### 11.4 Yedek geri yükleniyor

10. adımdaki `backup:restore:verify` çıktısı.

---

## 🔴 Her güncellemede: göçler gerçekten ulaştı mı

Bu adım **atlanamaz**. 22.08.2026'da üç göç üretime hiç ulaşmadı ve
üç sayfa 500 verdi; belirtisi son derece sinsiydi.

`prisma migrate deploy` açılışta şunu yazıyordu:

```
23 migrations found in prisma/migrations
No pending migrations to apply.
```

Bu **yalan değildi**. Kapsayıcının elindeki listeye göre doğruydu —
ama o liste eskiydi. Sebep: `docker-compose.yml` içinde
`server-data:/app/prisma` diye adlandırılmış bir birim vardı.
Adlandırılmış birimler imajdan yalnız **ilk oluşturuldukları anda**
doldurulur; sonrasında imajdaki dosyalar bir daha görünmez. Yani ilk
dağıtımdaki göç listesi orada donmuştu.

Birim kaldırıldı (SQLite döneminden kalma bir artıktı; veritabanı
PostgreSQL'de). Ama aynı sınıftan başka bir hata yine olabilir, o
yüzden her güncellemeden sonra iki satır:

```bash
lk exec server ls prisma/migrations | wc -l
```

```bash
ls ~/localkarar/prisma/migrations | wc -l
```

**İki sayı eşit olmalı.** Eşit değilse kapsayıcı eski dosyalarla
çalışıyor demektir; `lk up -d --force-recreate server` ile tazele,
düzelmezse `lk build server --no-cache`.

### 🔴 Sayı saymak YETMEZ — şemayı doğrudan sor

Yukarıdaki karşılaştırma yalnız **dosya taşınmadıysa** işe yarar.
Başka bir arıza sınıfı daha var ve o buradan geçer: göç kaydı
`_prisma_migrations` tablosuna yazılmış ama DDL'i veritabanına
işlememiş. O zaman hem dosya sayıları eşit olur, hem
`prisma migrate status` "Database schema is up to date!" der, hem de
sütun ortada yoktur.

29.08.2026'da yerelde tam bu yaşandı: `UserPreference.uiLanguage` göçü
"uygulandı" görünüyordu, sütun yoktu ve **giriş tamamen kırıktı**
(`P2022`). `migrate status` bunu göstermedi çünkü o yalnız kayıtlara
bakıyor, gerçek şemaya değil.

Bu yüzden her güncellemeden sonra şemaya **doğrudan** sor:

```bash
lk exec -T postgres psql -U postgres -d localakademi -c \
  "SELECT to_regclass('public.\"AccountNotification\"') AS tablo;"
```

```bash
lk exec -T postgres psql -U postgres -d localakademi -c \
  "SELECT column_name FROM information_schema.columns
   WHERE table_name='UserPreference' AND column_name='uiLanguage';"
```

Birincisi `NULL` dönerse tablo yok. İkincisi boş dönerse sütun yok.
İkisi de doluysa göçler gerçekten işlemiş demektir.

⚠️ Eksik çıkarsa çözüm `migrate deploy`i tekrar çalıştırmak DEĞİL —
kayıt zaten "uygulandı" olduğu için hiçbir şey yapmaz. Eksik DDL'i
göç dosyasından alıp elle çalıştırmak gerekir.

### Neden log'a güvenmek yetmiyor

"No pending migrations" satırı **iki farklı durumda da** yazılır:
gerçekten uygulanacak bir şey yokken, ve kapsayıcı yeni göçlerden
haberdar değilken. İkisini ayırt etmenin tek yolu dosya saymaktır.

Yeni tablo ekleyen bir sürüm dağıttıysan ayrıca doğrula:

```bash
lk exec postgres psql -U localakademi -d localakademi -c "\dt" | tail -20
```

---

## Sorun çıkarsa

| Belirti | Muhtemel sebep |
|---|---|
| Cloudflare **Error 522** | Güvenlik duvarı Cloudflare'ı engelliyor ya da IP aralıkları değişmiş → `sudo bash deploy/firewall.sh` |
| Cloudflare **Error 526** | Origin sertifikası geçersiz/eksik → 5. adım |
| Sayfa açılıyor ama API 404 | Frontend derlenmemiş; `docker compose logs server` |
| E-posta gitmiyor | `RESEND_API_KEY` boş → günlükte "gerçek gönderim KAPALI" satırı görünür |
| Hepsi `200`, `429` yok | `TRUST_PROXY` ya da güvenlik duvarı yanlış → **durdur** |
| `server` sürekli **Restarting**, günlükte `Authentication failed ... localakademi_app` | Uygulama rolü yok ya da parolası `.env` ile uyuşmuyor → 8.2 |
| Derleme `TS2307: Cannot find module ...content/...` ile düşüyor | Eski kod; `git pull` (düzeltme `c7e1302`) |

---

## Sonraki adım

Kurulum bittikten sonra sırada **19. madde — yasal metinler** var.
Avukata verilecek yurt dışına aktarım tablosu planda hazır (H bölümü);
sunucunun hangi ülkede olduğunu sağlayıcı panelinden teyit etmen
gerekiyor.
