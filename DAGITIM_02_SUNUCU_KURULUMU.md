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

Doldurulacaklar dosyada tek tek yazılı. Üç tanesine dikkat:

- **`JWT_SECRET`** — üret, elle uydurma:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  (Node yoksa: `openssl rand -hex 32`)
- **`MAIL_FROM`** — `@mail.localkarar.com` ile bitmeli, yoksa Resend reddeder
- **`TRUST_PROXY=2`** — dosyada zaten yazılı, **değiştirme**. Sebebi
  aşağıda 6. adımda.

**Doğrula:** boş kalan zorunlu alan var mı:

```bash
grep -E '^[A-Z_]+=$' .env
```

Çıktı boşsa tamam.

---

## 4. Uygulama portunu dışarı kapat

`docker-compose.yml` içinde `server` servisinin port satırını bul ve
şu hâle getir:

```yaml
    ports:
      - "127.0.0.1:3000:3000"
```

Böylece uygulamaya yalnız makine içinden erişilir; dışarı açılan tek
şey Caddy'nin 80/443'ü olur.

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

```bash
crontab -e
```

Şu satırı ekle (her gece 03:30):

```
30 3 * * * cd /home/ubuntu/localkarar && /usr/bin/docker compose exec -T server npm run backup:database >> /home/ubuntu/backup.log 2>&1
```

**Doğrula — elle bir kez çalıştır:**

```bash
docker compose exec -T server npm run backup:database
docker compose exec -T server npm run backup:restore:verify
```

İkincisi **gerçekten geri yükleme** yapıyor: yedeği geçici bir
veritabanına yükleyip satırları sayıyor. `ok: true` ve
`"verified": "gerçek geri yükleme"` görmelisin.

> Bu betikler yakın zamanda onarıldı — önceden ürettiği bütün `.sql`
> yedekleri 0 bayttı ve doğrulama yine de "ok" diyordu. Ayrıntı:
> `FAZ_3_ISLETIM_RAPORU.md`.

---

## 11. Kabul testleri — hepsi geçmeli

### 10.1 Site açılıyor ve şifreli

```bash
curl -sI https://localkarar.com | head -3
```

Tarayıcıda da aç: kilit görünmeli. Cloudflare **Full (strict)** olduğu
için kenar–sunucu arası da şifreli demektir.

### 10.2 🔴 Hız sınırı — iki yönlü

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

### 10.3 🔴 E-posta gerçekten gidiyor

`https://localkarar.com/forgot-password` → kendi adresin.

Gelen postada kontrol et:

- Kutuya düştü mü (**spam klasörüne de bak**)
- Kaynağında `dkim=pass` ve `spf=pass` var mı
  (Gmail: postayı aç → ⋮ → "Orijinali göster")
- Bağlantı `https://localkarar.com/reset-password?token=...` mi —
  `links.mail.localkarar.com` gibi bir adrese dönüşmüşse tıklama takibi
  açık kalmış demektir

### 10.4 Yedek geri yükleniyor

10. adımdaki `backup:restore:verify` çıktısı.

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
