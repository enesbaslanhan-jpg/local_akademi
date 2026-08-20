# Faz 0 — Ön Koşullar (kod yazılmadan netleşmesi gerekenler)

**Tarih:** 17 Ağustos 2026 · Kod değişikliği yok, DB yazma yok, commit yok.

Faz 4 (hukuki metinler) bu üç maddenin cevabı olmadan yazılamaz. Aydınlatma
metni gerçekle uyuşmak zorunda; tahminle yazılan bir metin yanlış beyandır.

---

## 1. OmniRoute nereye gönderiyor? — ✅ ÇÖZÜLDÜ (ölçüldü)

### Yöntem

OmniRoute yerel olarak açıldı (`http://localhost:20128`) ve **canlı sorgulandı**:
`/v1/models` listesi alındı, ardından zararsız bir istem (`"1+1?"`, kullanıcı
verisi içermeyen) 5 kez gönderilip yanıtın hangi modele düştüğü okundu.

### Bulgu — OmniRoute yerel çıkarım YAPMIYOR

`.env`'de adres loopback (`localhost:20128`) olduğu için "yerel" görünüyordu.
Değil: OmniRoute bir **yönlendirici**. Yerel olan yalnız HTTP sıçraması;
çıkarım dış sağlayıcılarda yapılıyor.

**654 model**, yukarı akış dağılımı:

| Adet | Ön ek | Gerçekte nerede |
|---:|---|---|
| 145 | `zenmux` | ZenMux toplayıcı → Anthropic, Google, OpenAI modelleri |
| 145 | `zm` | aynı toplayıcının ikinci ön eki |
| 118 | `nvbuild` | NVIDIA bulut (ABD) |
| 118 | `openai-compatible-chat-…` | adı belirsiz OpenAI-uyumlu uç |
| 36 | `auto` | birleştirici — istek başına seçim yapar |
| 26 | `tllm` · 17 `no-think` · 12 `aug` | çeşitli |
| 8 | `ollamacloud` / `ollama-cloud` | Ollama'nın **BULUT** servisi — yerel Ollama değil |
| 7 | `mistral` | Mistral AI (Fransa / AB) |
| kalan | `ddgw`, `veo-free`, `pepper`, `mcode` | çeşitli |

Örnek model kimlikleri, hedefi açıkça gösteriyor:
`zenmux/anthropic/claude-opus-5`, `zenmux/openai/gpt-5.6-luna`,
`zenmux/google/gemini-3.6-flash`, `nvbuild/01-ai/yi-large`,
`ollamacloud/deepseek-v4-pro`, `mistral/mistral-large-latest`.

### Kullandığımız model: `auto/best-free`

`.env` → `MENTOR_AI_MODEL=auto/best-free`, `NEWS_AI_MODEL=auto/best-free`.

Model kaydı: `"owned_by": "combo"` — yani **sabit bir sağlayıcı değil**,
istek anında seçim yapan bir birleştirici.

**Ölçüm (5 istek):**

```
1 -> mistral-large-latest
2 -> mistral-large-latest
3 -> mistral-large-latest
4 -> (yanıt alınamadı)
5 -> mistral-large-latest
```

Bugünkü fiili alıcı: **Mistral AI — Fransa (AB)**.

### Bunun anlamı

**İyi haber:** bugünkü hedef ABD veya Çin değil, AB. Mistral Fransa'da ve AB
veri koruma rejimine tabi; standart sözleşme ile aktarım kurgulanabilir.
Başlangıç varsayımımdan (NVIDIA/DeepSeek) daha iyi bir tablo.

**Sorun:** hedef **bizim kontrolümüzde değil ve sessizce değişebilir.**
`auto/best-free` bir havuzdan seçim yapıyor; havuzda ABD merkezli
(`nvbuild`, `zenmux/openai`, `zenmux/anthropic`, `zenmux/google`) ve bulut
Ollama seçenekleri de var. OmniRoute yarın yönlendirmeyi değiştirirse bizim
kodumuzda hiçbir şey değişmez ama **aydınlatma metnimiz yanlış hale gelir**.

Bir aydınlatma metni alıcı kategorilerini ve ülkeleri adlandırmak zorundadır.
"Değişken bir havuz" beyan edilemez.

### Karar gerekiyor

| Seçenek | Sonuç |
|---|---|
| **A. Modeli sabitle** — `auto/best-free` yerine ör. `mistral/mistral-large-latest` | Alıcı tek ve bilinir olur; metin yazılabilir. Ücretsiz katman sürerse maliyet aynı. **Önerilen.** |
| **B. Havuzu AB ile sınırla** | OmniRoute'ta böyle bir kısıt var mı bilinmiyor; araştırılmalı. |
| **C. Gerçekten yerel modele geç** (kendi sunucumuzda Ollama) | Yurt dışı aktarımı tamamen ortadan kalkar, KVKK bölümü çok basitleşir. Donanım maliyeti ve kalite düşüşü var. |
| D. Olduğu gibi bırak | Aydınlatma metni yazılamaz — bu seçenek canlıya çıkışı bloke eder. |

### 1d. Zincirin tamamı — ✅ ÇÖZÜLDÜ (belgelerden)

OmniRoute'un sağlayıcı referansı `mistral` ön ekini şöyle tanımlıyor:

> `mistral` | Mistral | API key | **"Free Experiment tier: rate-limited access
> to all models, no credit card required"**

Yani zincir bir toplayıcıdan geçmiyor, **doğrudan Mistral'ın kendi API'sine**
gidiyor:

```
LocalKarar → OmniRoute (yerel yönlendirici) → api.mistral.ai (Fransa)
```

Karşılaştırma için: `zenmux` ön eki `https://zenmux.ai/api/v1` toplayıcısına,
`ollamacloud` ise Ollama'nın bulut servisine gidiyor. Bizim yolumuz bunlar
değil — ama `auto/best-free` havuzunda bunlar da var (bkz. yukarıdaki karar).

### 1e. 🔴 Mistral ücretsiz katman girdileri EĞİTİMDE KULLANIYOR (varsayılan)

**Dikkat: iki farklı Mistral belgesi var ve zıt şeyler söylüyorlar.**

| Belge | Ne diyor | Bizim durumumuza uyuyor mu |
|---|---|---|
| *Partner-Served Deployment Terms* | "We do not use Your Data to train our Models." | **HAYIR.** Bu belge, Mistral modelleri bir **bulut iş ortağı** (Azure vb.) üzerinden sunulduğunda geçerli. Biz doğrudan Mistral API'sine gidiyoruz. |
| *Privacy Policy* (doğrudan API) | "Your Input and Output, **subject to your opt-out**" → "To train our artificial intelligence models" | **EVET.** Bizi bu bağlıyor. |

Yani doğrudan API kullanımında **varsayılan davranış eğitimde kullanmaktır**;
hukuki sebep olarak "meşru menfaat" gösteriliyor. Kapatmak için açık bir
tercih yapmak gerekiyor:

> "We've introduced a user control which allows you to object to the use of
> your input and output data for model training directly from your account."

Saklama:

> "we keep your Input and Output for the period necessary to generate the
> Output and then for **thirty (30) rolling days** to monitor abuse
> (unless **zero data retention** is activated)."

Barındırma AB önceliklidir ama istisna kabul ediliyor: *"in exceptional cases,
we may opt for non-EU providers"* — bu durumda Standart Sözleşme Hükümleri
uygulanıyor.

**Sonuç:** işletme belgeleri ve mentor sohbetleri, hiçbir şey yapılmazsa
Mistral'ın model eğitiminde kullanılabilir ve 30 gün saklanır.

### 1f. OmniRoute istekleri YEREL OLARAK logluyor (varsayılan)

`SECURITY.md`'den:

> "Per API key `noLog` flag disables request logging"
> "Automatic cleanup after `CALL_LOG_RETENTION_DAYS`"

Yani istek logu **varsayılan olarak açık**; anahtar bazında kapatılabiliyor.
Loglar SQLite'ta ve AES-256-GCM ile şifreli tutuluyor. API anahtarları da
şifreli saklanıyor (`enc:v1:<iv>:<ciphertext>:<authTag>`). Dışarıya telemetri
gönderdiğine dair bir ifade yok.

Belge OmniRoute'u açıkça bir **yönlendirme/vekil katmanı** olarak tanımlıyor,
"yerel-only" iddiası yok — ölçümümüzle birebir örtüşüyor.

**Bunun bizim için anlamı:** mentor sohbetleri (işletme verisi, olası kişisel
veri) hiç hesaba katmadığımız ikinci bir yerde daha duruyor. Türkiye'de
duruyor, yani yurt dışı aktarımı değil — ama:

- Bizim saklama/imha politikamızda yok
- Yedeklememizde yok
- **Kullanıcı hesabını sildiğinde OmniRoute'un çağrı logunda sohbetleri kalıyor**

### 1g. Anahtar sahipliği — ✅ ÇÖZÜLDÜ

Mistral API anahtarı **ürün sahibinin kendi Mistral hesabından** alınıp
OmniRoute'a girilmiş. Yani gizlilik ayarları **bizim kontrolümüzde** —
OmniRoute'un havuz anahtarı değil. Bu, eğitim itirazını yapabileceğimiz
anlamına geliyor.

### 1h. Hangi kontrol ücretsiz katmanda var, hangisi yok

| Kontrol | Ücretsiz katmanda | Nasıl |
|---|---|---|
| **Eğitimde kullanıma itiraz** | ✅ VAR | Admin panel → **Privacy** → *Anonymous improvement data* kapat. Ayrıca **API › Privacy** → *"Data usage for improving our services"* kapat. |
| **Zero Data Retention (ZDR)** | ❌ YOK | Yalnız **Scale (ücretli)** planda ve yalnız durumsuz (stateless) API çağrıları için. |

**Sonuç:** eğitimde kullanımı ücretsiz olarak durdurabiliriz, ama
**30 günlük saklamayı durduramayız.** Ücretsiz katmanda kaldığımız sürece
mentor istem/yanıtları Mistral'da 30 gün (kötüye kullanım izlemesi için)
saklanır ve bu **aydınlatma metninde açıkça yazılmalı**.

Bu, "para nerede çıkar" sorusunun somut cevabı: ZDR isteniyorsa Scale planı
gerekir. İstenmiyorsa ücretsiz katman kullanılabilir — yeter ki 30 günlük
saklama beyan edilsin.

### Yapılacaklar

1. ✅ **YAPILDI — Mistral eğitim itirazı kapatıldı.**
   `admin.mistral.ai/plateforme/privacy` → *"API çağrılarınızın Mistral'ın
   yapay zeka modellerini eğitmek için kullanılmasına izin verin"* kapatıldı.
   Not: bu ayar yalnız **yeni** etkileşimleri kapsıyor, geriye dönük değil.
   Ürün canlı olmadığı için pratikte gerçek kullanıcı verisi etkilenmedi.

   🔴 **KALICI UYARI — Labs modelleri asla açılmamalı.** Aynı sayfadaki
   *"Labs modellerini etkinleştir"* seçeneğinin metni şunu diyor:
   *"verilerimin, abonelik planım veya **opt-out ayarlarım ne olursa olsun**
   … Mistral modellerini eğitmek için kullanılabileceğini kabul ediyorum."*
   Yani Labs açılırsa yukarıdaki itiraz **geçersiz kalır**. Şu an kapalı,
   kapalı kalmalı.

2. ✅ **YAPILDI — Model sabitlendi.**
   `.env` → `MENTOR_AI_MODEL` ve `NEWS_AI_MODEL`:
   `auto/best-free` → `mistral/mistral-large-latest`.
   Doğrulandı: 3 ardışık istek de `mistral-large-latest`'e düştü.
   Artık alıcı istek başına değişmiyor; aydınlatma metninde
   **Mistral AI (Fransa)** tek alıcı olarak adlandırılabilir.

3. ⏸ **OmniRoute'ta LocalKarar anahtarına `noLog` ver** — ya da
   `CALL_LOG_RETENTION_DAYS`'i bilinçli bir değere çekip politikaya yaz.
   (OmniRoute yönetici arayüzünden yapılır; `/api/config` çağrı anahtarına
   403 döndüğü için dışarıdan ayarlanamıyor.)

4. ⏸ Aydınlatma metnine **30 günlük Mistral saklaması** yazılacak (ZDR
   ücretli Scale planı gerektirdiği için ücretsiz katmanda kaçınılmaz).

5. ⏸ OmniRoute kendi sunucumuzda çalıştığı için ayrı bir veri işleyen değil,
   **altyapımızın parçası** — ama çağrı logları saklama/imha politikamıza
   ve yedekleme kapsamımıza dahil edilmeli.

### Yan bulgu — mentor şu anda kırık olabilir

Bu inceleme sırasında OmniRoute kapalıyken port 20128 yanıt vermiyordu.
`MENTOR_AI_PROVIDER=omniroute` ayarlı olduğu için OmniRoute çalışmıyorken
mentor bağlantı hatası döndürür. Üretimde OmniRoute'un yaşam döngüsü
(servis olarak çalışması, yeniden başlatma) çözülmemiş bir konu.
Ayrıca gözlem sırasında servis bir ara 20127'de, sonra 20128'de göründü —
port sabit değilse yapılandırma kırılgan demektir.

---

## 2. Veri sorumlusu kimliği — ⏸ CEVAP BEKLİYOR

Aydınlatma metni KVKK m.10 gereği veri sorumlusunu **adıyla** belirtmek
zorunda. Mevcut metin "uygulamanın yetkili işletmecisi" diyor; bu yeterli değil.

Gerekenler:

- Tüzel kişi tam unvanı (ya da gerçek kişi ad-soyad)
- MERSİS / vergi numarası
- Açık adres
- KEP adresi (varsa) ve başvuru için e-posta adresi
- İrtibat kişisi (tüzel kişi veri sorumlusu için zorunlu)

**Not:** başvuru kanalı için çalışan bir e-posta adresi şart. Uygulamada
**hiç e-posta altyapısı yok** (Faz 6). Şirket e-postası kullanılacaksa
sorun değil, ama metinde yazan adresin gerçekten okunuyor olması gerekir.

---

## 3. VERBİS kayıt yükümlülüğü — ⏸ CEVAP BEKLİYOR

Kayıt yükümlülüğü eşiklere bağlı. Cevaplanması gerekenler:

- Yıllık çalışan sayısı
- Yıllık mali bilanço toplamı
- Ana faaliyet konusu özel nitelikli kişisel veri işlemeyi içeriyor mu

Bu üç bilgi olmadan yükümlülük belirlenemez. Eşikler ve istisnalar
Kurul kararlarıyla güncellendiği için **karar anındaki güncel eşik**
teyit edilmeli — bu bir hukukçu teyidi gerektirir, kod tarafından
belirlenemez.

---

## Özet

| Madde | Durum |
|---|---|
| 1. OmniRoute hedefi | ✅ Ölçüldü — yerel değil; `auto/best-free` bugün Mistral'a düşüyor |
| 1d. Zincir | ✅ Belgelendi — OmniRoute → `api.mistral.ai` doğrudan, ücretsiz deneme katmanı |
| 1e. Eğitimde kullanım | ✅ Cevaplandı — **varsayılan EVET**, itiraz edilebilir; 30 gün saklama |
| 1f. OmniRoute logu | ✅ Cevaplandı — varsayılan açık, `noLog` ile kapatılabilir, yerel ve şifreli |
| 1g. Mistral anahtarı kimin | ✅ Ürün sahibinin kendi hesabı — ayarlar bizde |
| 1h. Kontrollerin erişilebilirliği | ✅ Eğitim itirazı ücretsiz VAR · ZDR yalnız ücretli Scale |
| 1i. Eğitim itirazı | ✅ **KAPATILDI** (18.08.2026) · Labs asla açılmamalı |
| 1b. Model sabitleme | ✅ **YAPILDI** — `mistral/mistral-large-latest`, 3/3 doğrulandı |
| 1f-eylem. OmniRoute `noLog` | ⏸ Yönetici arayüzünden yapılacak |
| 2. Veri sorumlusu bilgileri | ⏸ Cevap bekliyor |
| 3. VERBİS eşiği | ⏸ Cevap bekliyor (hukukçu teyidi) |

### Faz 4 öncesi kapatılması gerekenler

Teknik/ayar tarafı (ücretsiz, bugün yapılabilir):
eğitim itirazını kapat · OmniRoute `noLog` · modeli sabitle.

Bilgi/hukuk tarafı: veri sorumlusu bilgileri ve VERBİS eşiği.

Kabul edilmesi gereken gerçek: **ücretsiz katmanda Mistral 30 gün saklıyor**
ve bunu ancak ücretli Scale planı değiştirir. Metin buna göre yazılacak.

**Faz 2 ve Faz 3 bunlardan bağımsız** — hemen ilerletilebilir.
