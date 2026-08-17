# Canonical Kaynak Deep-Link Audit

**Tarih:** 15 Ağustos 2026 · DB güncellemesi, canonical re-import, Phase B ve commit **yapılmadı.**

**Kapsam:** yalnız Phase A ile oluşturulan **38 canonical Course** (`CANON-COURSE-*`). Legacy 288 Course / eski Lesson / eski KO kaynaklarına bakılmadı, dokunulmadı.

Doğrulanmış kayıt: 4 → **33 Source satırı**. Tahmini URL üretilmedi; her kayıt ya belgenin kendi metniyle ya da render edilen sayfanın içeriğiyle teyit edildi.

---

## Kapsam doğrulaması

| Ölçüm | Değer |
|---|---:|
| Canonical KO (`CANON-COURSE-*`) | 38 |
| KO ↔ Source bağlantısı | **80** ✅ beklenenle aynı |
| Benzersiz `Source` satırı | 76 |

Fark 4 bağlantı, **3 paylaşılan Source satırından** geliyor. Bunlar tek kayıt olduğu için hedefleri her iki/üç dersi birden karşılamak zorunda:

| Paylaşılan kaynak | Dersler |
|---|---|
| T.C. Ticaret Bakanlığı Tüketici Portalı | COURSE-012, 013 |
| T.C. Ticaret Bakanlığı ETBİS | COURSE-011, 025 |
| T.C. Kamu Gözetimi Kurumu | COURSE-006, 007, 008 |

## Bulgu: sorun münferit değil

80 kaynak kaydının **78'i kurum ana sayfasına** gidiyordu. Yalnız 2'si doğrudan sayfaydı.

**14 kayıt `.gov.tr` dışı domainde:** CFA Institute, NYU Stern (Damodaran), SBA, Google Ads, ISO, NIST, IFRS, KAP, KGF, ICC. Kullanıcı talimatı gereği bunlar otomatik reddedilmedi; gerçekten otoriter olanlar `PROFESSIONAL_AUTHORITY` olarak kabul edildi — Damodaran, ICC, IFRS ve NIST bu turda doğrulanıp bağlandı.

## Doğrulama yöntemi ve üç somut engel

Kabul eşiği: **resmî/otoriter domain + sayfanın gerçekten yüklenmesi + başlık eşleşmesi + belgenin dersin iddiasını desteklemesi.**

**1. HTTP 200 tek başına yalan söylüyor.** `gib.gov.tr` bir SPA; var olmayan her yola da **HTTP 200** ve aynı boyutta kabuk döndürüyor. Ölü sayfa yalnız render edilmiş DOM'da görülüyor ("ARADIĞINIZ SAYFA BULUNAMIYOR"). Bu sitede durum kodu ile doğrulama yapan her yöntem yanlış pozitif üretir.

Bu sayede **iki kırık kayıt yakalandı:**

| Ders | Kırık URL | Sorun | Doğrusu |
|---|---|---|---|
| COURSE-014 | `www.gib.gov.tr/ynokc` | soft-404 — HTTP 200 döndüğü için yalnız render edilmiş DOM'da görülüyor | `ynokc.gib.gov.tr` |
| COURSE-011, 025 | `www.etbis.gov.tr` | **NXDOMAIN** — `etbis.gov.tr` alan adı hiç yok; bu kayıt hiçbir zaman çalışmamış | `etbis.ticaret.gov.tr` |

İkincisi ilk turda "HOMEPAGE_ROOT" sayılmıştı — ana sayfa değil, var olmayan bir alan adıymış. Paylaşılan satır olduğu için iki dersi birden etkiliyordu.

**2. URL kalıbından türetme çalışmıyor — üç kez daha doğrulandı.** İlk turda `mevzuat.gov.tr` kalıbı 6102'den 213'e uygulanınca 404 vermişti. Bu turda üç makul görünen adres daha denendi ve üçü de tutmadı:

| Denenen | Sonuç |
|---|---|
| `nist.gov/itl/smallbusinesscyber/...c-scrm` | **404** — doğrusu `csrc.nist.gov` alt alanında |
| `tcmb.gov.tr/wps/wcm/.../Sermaye+Hareketleri` | **404** |
| `cbddo.gov.tr/ai-strategy/` | bağlantı kurulamadı |

Her doğru adres yalnız arama veya kurumun kendi navigasyonundan çıktı.

**3. Bazı kurumlar tekil belgeyi adreslenebilir kılmıyor.** GİB'in tebliğ sekmeleri ve KGK'nın set bağlantıları `href` üretmeyen JS düğmeleri. KOSGEB'in tekil program sayfaları (`/destekler/6524/...`) boş şablon render ediyor. Bu kurumlarda adreslenebilir en derin gerçek seviye kanun/liste sayfası; patch bunu `evidence_level` alanında açıkça işaretliyor.

## Kanıt seviyeleri

| Seviye | Anlamı | Adet |
|---|---|---:|
| `DOCUMENT` | Belgenin kendi metni okundu (RG tarih/sayı veya standart başlığı) | 20 |
| `KANUN` | Kanunun resmî künye sayfası doğrulandı; tebliğ alt sekmede | 2 |
| `CATEGORY` | Kurumun gerçek liste sayfası doğrulandı; tekil belge adreslenebilir değil | 4 |

## Doğrulanmış 26 replacement

### mevzuat.gov.tr — 7/7 kaynak tamamlandı

| Ders | Kanun | Doğrulama |
|---|---|---|
| COURSE-001, 035 | 213 VUK | RG 10.01.1961 / 10705 |
| COURSE-021, 029 | 6102 TTK | RG 14.02.2011 / 27846 |
| COURSE-012 | 6502 TKHK | RG 28.11.2013 / 28835 |
| COURSE-022 | 4857 İş Kanunu | RG 10.06.2003 / 25134 |
| COURSE-023, 030 | 6098 TBK | RG 04.02.2011 / 27836 |

Ayrıca başka domainlerden mevzuat.gov.tr'ye taşınanlar:

| Ders | Kaynak | Doğrulama |
|---|---|---|
| COURSE-019 | 6698 KVKK | RG 07.04.2016 / 29677 |
| COURSE-003 | Fiyat Etiketi Yönetmeliği | Yönetmelik metni okundu (Madde 1 amaç) |
| COURSE-004 | 6585 Perakende Kanunu | RG 29/1/2015 / 29251 |

### gib.gov.tr — 4/9

| Ders | Kaynak | Yeni | Seviye |
|---|---|---|---|
| COURSE-021 | Gelir Vergisi Tarifesi | `/yardim-kaynaklar/yararli-bilgiler/gelir-vergisi-tarifesi` | DOCUMENT |
| COURSE-014 | Yeni Nesil ÖKC | `ynokc.gib.gov.tr` — **kırık URL düzeltildi** | DOCUMENT |
| COURSE-003, 028 | KDV Tebliği | `/mevzuat/kanun/436` (3065, RG 02.11.1984 / 18563) | KANUN |

### kgk.gov.tr — 4/8

| Ders | Standart | Doğrulama |
|---|---|---|
| COURSE-031 | TMS 2 Stoklar | RG 24/05/2018 / 30430 |
| COURSE-026 | TFRS 13 Gerçeğe Uygun Değer | RG 15/01/2019 / 30656 (Mükerrer) |
| COURSE-009 | TMS 7 Nakit Akış Tabloları | RG 18/01/2005 / 25704 |
| COURSE-005 | TMS/TFRS Setleri | Set listesi 2011-2026 (CATEGORY) |

### Diğer gov.tr — 3

COURSE-004 Tüketicinin Korunması GM → `tuketici.ticaret.gov.tr` · COURSE-033 ve COURSE-025 KOSGEB → Destekler Listesi (CATEGORY).

### Non-gov otoriter — 4

| Ders | Kaynak | Yeni | Neden otoriter |
|---|---|---|---|
| COURSE-010 | NYU Stern / Damodaran | Cost of Capital Central | Sermaye maliyeti veri setlerinin standart referansı |
| COURSE-037 | ICC Incoterms 2020 | ICC Incoterms 2020 sayfası | Incoterms'in sahibi ve tek resmî yayıncısı |
| COURSE-017 | IFRS 15 | IFRS 15 standart sayfası | Standardın yayıncısı IFRS Foundation |
| COURSE-020 | NIST C-SCRM | `csrc.nist.gov/projects/cyber-supply-chain-risk-management` | Tedarik zinciri siber risk çerçevesinin kaynağı |

**Zaten doğru olan:** COURSE-019 `nist.gov/cyberframework` — başlık "Cybersecurity Framework | NIST". Değişiklik gerekmiyor.

### İkinci turda eklenenler

| Ders | Kaynak | Yeni | Kanıt |
|---|---|---|---|
| COURSE-011 | GİB e-Belge Uygulamaları | `ebelge.gib.gov.tr/earsivhakkinda.html` | e-Arşiv Fatura usul ve esasları metni |
| COURSE-015 | GİB e-Belge Entegrasyon Kılavuzları | `ebelge.gib.gov.tr/efaturaentegratorluk.html` | "Entegrasyon Yöntemi... Entegrasyon Kılavuzu v1.3" |
| COURSE-012, 013 | Tüketici Portalı *(paylaşılan)* | Mesafeli Sözleşmeler bilgilendirmesi | "nakliye, teslim ve benzeri ek masraflar" + "Cayma hakkı" |
| COURSE-011, 025 | ETBİS *(paylaşılan)* | `etbis.ticaret.gov.tr` | **NXDOMAIN düzeltmesi** |
| COURSE-022 | SGK İşveren Teşvikleri | Güncel Sigorta Primi Teşvik sayfası | "işveren hissesinin 2 puanlık kısmı Hazinece karşılanmaktadır" |
| COURSE-027 | TÜBİTAK TEYDEB Rehberi | Ulusal Destek Programları | Başlık teyidi (CATEGORY) |
| COURSE-038 | TÜBİTAK BİLGEM YZE | `bilgem.tubitak.gov.tr/yze/` | Başlık "YZE - TÜBİTAK BİLGEM" |

Tüketici Bilgi Rehberi'nin 23 alt sayfası kurumun kendi DOM'undan listelendi — hedef oradan seçildi, üretilmedi.

## Doğrulanamayanlar ve nedenleri

| Neden | Örnek | Bağlantı |
|---|---|---:|
| Kaynak adı belirli bir belge tanımlamıyor | CFA Institute ×4 ("Global/Financial/Analyst **Resources**") | 4 |
| Karşılığı olmayan kaynak adı | "GİB Analiz Rehberi", "KGK Analiz Standartları" | 2 |
| İçerik eşleşmesi yok | KAP ×2 — sayfa gerçek ama ders konusunu (LTV/SKU kârlılık) desteklemiyor | 2 |
| Bot koruması | `iso.org` Cloudflare 403 | 1 |
| Ağ erişilemiyor | `cbddo.gov.tr` bağlantı kurulamadı | 1 |
| Sıra gelmedi | tbb, tobb, spk, bddk, btk, hmb, csgb, iys, sanayi, ispat, kolayihracat, icmimarlarodasi, kgf, tcmb, kvkk, SBA, Google Ads, KGK genel ×3, SGK genel, ticaret kalanı | 35 |

**Neden bazıları bilerek doğrulanmadı:**

*CFA Institute (4 kayıt).* Kayıt adları jenerik ("CFA Institute Financial Resources"), belirli bir belge işaret etmiyor. `rpc.cfainstitute.org` gerçek ve otoriter bir araştırma platformu — yani URL yanlış değil, yalnız derin değil. Konuyla ilgili bir CFA blog yazısı bulundu (nakit dönüşüm döngüsü) ama jenerik "Resources" atfını belirli bir blog yazısıyla değiştirmek **atfın iddiasını değiştirir**. Kaynak adları netleşmeden bağlanmamalı.

*KAP (2 kayıt).* `kap.org.tr/tr/bildirim-sorgu` sayfası gerçek ve doğrulandı, ama COURSE-017 (LTV/Churn) ve COURSE-007 (SKU kârlılık) konularını desteklemiyor. Sayfanın var olması içerik eşleşmesi sayılmaz.

*KGK genel (3 bağlantı, paylaşılan satır).* COURSE-006/007/008 yönetim muhasebesi konuları (başa baş, SKU kârlılık, işletme sermayesi); KGK'nın TMS/TFRS set sayfası bunları karşılamıyor. Zorlanmadı.

*COURSE-034.* İki kaynak da uydurma isimli: ne GİB'in "Analiz Rehberi" ne KGK'nın "Analiz Standartları" diye bir yayını var. Bu kaynakların **içerikten çıkarılması** gerekiyor — canonical içerik değişikliği olduğu için bu turda yapılmadı.

"Sıra gelmedi" **"karşılığı yok" demek değil.** Bu kayıtların mevcut URL'leri korundu.

## QA — zorunlu üç ders

| Ders | Kaynak | Durum |
|---|---|---|
| CANON-001 | Vergi Usul Kanunu | ✅ gerçek kanun metni |
| CANON-001 | Sosyal Güvenlik Kurumu | ⏸ sıra gelmedi |
| CANON-021 | 6102 TTK | ✅ gerçek kanun metni |
| CANON-021 | GİB Gelir Vergisi Tarifesi | ✅ **çözüldü** — tarife sayfası |
| CANON-021 | Ticaret Bakanlığı Kuruluş Rehberi | ⏸ sıra gelmedi |
| CANON-032 | TCMB Sermaye Hareketleri Genelgesi | ❌ tahmin edilen adres 404 |
| CANON-032 | Hazine ve Maliye Bakanlığı | ⏸ sıra gelmedi |

CANON-021 artık 3 kaynağın 2'sinde gerçek belgeye gidiyor. **CANON-032 hâlâ 0/2** — bu ders için "Kaynağa Git" henüz hiçbir gerçek belgeye gitmiyor.

## Final

```text
SCOPE: yalnız Phase A canonical 38 Course. Legacy 288 Course'a dokunulmadı.

Canonical KO:                    38
KO-source links:                 80   (beklenen 80 ✅)
Unique Source rows:              76   (3'ü paylaşımlı)

Direct links already correct:     2  (+1 doğrulandı: nist.gov/cyberframework)
Homepage/root URLs at start:     78
Broken URLs found:                2
  gib.gov.tr/ynokc      soft-404 (HTTP 200 döner, yalnız DOM'da görülür)
  www.etbis.gov.tr      NXDOMAIN (alan adı hiç yok)

Deep links resolved:             33 Source satırı = 35 KO-source bağlantısı
  evidence DOCUMENT:             26
  evidence CATEGORY:              5
  evidence KANUN:                 2
  paylaşılan satır:               2  (her biri 2 dersi karşılıyor)

Deep links unresolved:           45 bağlantı
  kaynak adı belge tanımlamıyor:  4  (CFA)
  karşılığı olmayan kaynak adı:   2  (COURSE-034)
  içerik eşleşmesi yok:           5  (KAP ×2, KGK genel ×3)
  bot koruması / ağ engeli:       2  (iso.org, cbddo.gov.tr)
  sıra gelmedi:                  32

Domain tamamlanma:
  mevzuat.gov.tr   7/7   ✅
  ebelge.gib.gov.tr 3/3  ✅  (1'i mevzuat.gov.tr'ye taşındı)
  etbis            2/3
  tuketici         2/3
  gib.gov.tr       4/9
  kgk.gov.tr       4/8
  ticaret.gov.tr   3/6
  kosgeb.gov.tr    2/6
  sgk.gov.tr       1/2
  tubitak.gov.tr   2/2   ✅
  kap.org.tr       0/2   (içerik eşleşmesi yok)
  CFA              0/4   (kaynak adı belirsiz)
  diğer non-gov    5/10

Guessed URLs written:             0
Guessed URLs tested and rejected: 7  (hepsi 404/NXDOMAIN/erişilemez)

CANON-001: 1/2 çözüldü
CANON-021: 2/3 çözüldü
CANON-032: 0/2 çözüldü

Safe to apply source deep-link patch: YES (33 kaydın hepsi tek tek doğrulandı)
DB updated: NO · Phase B: NO · Commit/push: NO
```

## Durum

Audit **tamamlanmadı.** 33 Source satırı (35 bağlantı) uygulanmaya hazır; 45 bağlantı açık. Patch dosyası `SOURCE_DEEP_LINK_PATCH.json` — `applied: false`.

Bu turda hedeflenen domainler bitti: ebelge ✅, tuketici ✅, sgk ✅, etbis ✅, tubitak ✅, kap (içerik eşleşmesi yok — bilerek bağlanmadı), CFA (kaynak adı belirsiz — bilerek bağlanmadı).

**Sıradaki iş:** 32 kayıt için henüz sıra gelmedi — tbb, tobb, spk, bddk, btk, hmb, csgb, iys, sanayi, ispat, kolayihracat, icmimarlarodasi, kgf, tcmb, SBA, Google Ads ve gib/kgk/ticaret/kosgeb kalanları.

**Ürün kararı gereken 6 kayıt** (link bulmakla çözülmez):
- COURSE-034'ün iki uydurma kaynağı içerikten çıkarılmalı
- CFA ×4 kaydının adları belirli bir belgeye netleştirilmeli, yoksa kaldırılmalı
- KAP ×2 kaydı ilgili derslerin konusunu desteklemiyor

**Yöntem notları:** **(a)** SPA siteleri (gib, kosgeb, kgk, tuketici) yalnız tarayıcı DOM'u ile doğrulanabilir — curl ve HTTP durum kodu yanıltır; **(b)** `pdftotext` ile PDF ilk sayfasından Resmî Gazete künyesi okumak en güçlü kanıt; **(c)** kurumun kendi navigasyonundan href toplamak, arama sonuçlarından daha güvenilir — GİB'in eski indekslenmiş tebliğ linkleri ölüyken kendi menüsündeki adresler çalışıyordu.
