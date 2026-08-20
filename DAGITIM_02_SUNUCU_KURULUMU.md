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
git clone https://github.com/enesbaslanhan-jpg/local_akademi.git localkarar
cd localkarar
```

> Depoda commit edilmemiş çalışmalar var. Bu makinedeki güncel hâli
> kullanmak istersen `scp` ile kopyalarız — söyle, birlikte yaparız.

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

## 7. Başlat

```bash
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d
docker compose logs -f server
```

Göçler açılışta otomatik çalışır (`docker-entrypoint.sh`).

Başlayan servisler: **postgres**, **server**, **caddy**.

> Compose'da bir `redis` servisi de tanımlı ama `with-redis` profili
> arkasında ve **kod onu hiç kullanmıyor** (`REDIS_URL` yok, istemci
> yok). Varsayılanda başlamıyor — doğru davranış, dokunma.

---

## 8. En az yetkili veritabanı rolü

Uygulama superuser olarak bağlanmamalı.

```bash
docker compose exec server npx tsx scripts/setup-app-db-role.ts
docker compose restart server
```

**Doğrula** — uygulama rolü tablo düşüremiyor olmalı:

```bash
docker compose exec postgres psql -U localakademi_app -d localakademi \
  -c 'DROP TABLE IF EXISTS "User";'
```

**`ERROR: permission denied` (42501) beklenen çıktı.** Komut başarılı
olursa rol yanlış kurulmuş demektir — durdur, bana söyle.

---

## 9. Yedekleme zamanlaması

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

## 10. Kabul testleri — hepsi geçmeli

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

9. adımdaki `backup:restore:verify` çıktısı.

---

## Sorun çıkarsa

| Belirti | Muhtemel sebep |
|---|---|
| Cloudflare **Error 522** | Güvenlik duvarı Cloudflare'ı engelliyor ya da IP aralıkları değişmiş → `sudo bash deploy/firewall.sh` |
| Cloudflare **Error 526** | Origin sertifikası geçersiz/eksik → 5. adım |
| Sayfa açılıyor ama API 404 | Frontend derlenmemiş; `docker compose logs server` |
| E-posta gitmiyor | `RESEND_API_KEY` boş → günlükte "gerçek gönderim KAPALI" satırı görünür |
| Hepsi `200`, `429` yok | `TRUST_PROXY` ya da güvenlik duvarı yanlış → **durdur** |

---

## Sonraki adım

Kurulum bittikten sonra sırada **19. madde — yasal metinler** var.
Avukata verilecek yurt dışına aktarım tablosu planda hazır (H bölümü);
sunucunun hangi ülkede olduğunu sağlayıcı panelinden teyit etmen
gerekiyor.
