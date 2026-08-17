# SOURCE_POLICY_FINAL_REPORT

**Tarih:** 16 Ağustos 2026 · **Kapsam:** yalnız Phase A ile oluşturulan **38 canonical Course** (`CANON-COURSE-*`).
**Güncelleme (17 Ağustos 2026):** 7 içerik düzeltme kaydı çözüldü — bkz. aşağıdaki **İçerik Düzeltmesi** bölümü ve `CANONICAL_SOURCE_CONTENT_PATCH.json`.

**Yapılanlar:** yalnız audit/policy cleanup. Kaynak politikası `content/migration/transformed-courses-combined.json` içindeki `verified_sources` alanına uygulandı: doğrulanmış deep-link'ler korundu, kırık URL'ler düzeltildi, kaynak adları spesifikleştirildi, var olmayan kaynaklar ve ders-iddiasını desteklemeyen kaynaklar işaretlendi.

**Dokunulmayanlar:** Legacy 288 Course · eski Lesson/KO kaynakları · DB · Phase B · canonical re-import · git add/commit/push.

---

## Final (içerik düzeltmesi sonrası — 17 Ağustos 2026)

```text
Canonical courses checked:                    38
Canonical source links checked:               80  (77 kalan)
Broken links remaining:                        0
Nonexistent sources:                           0  (2 çözüldü — REMOVE_SOURCE)
Claim/source mismatches:                       0  (5 çözüldü — 4 REPLACE, 1 REMOVE)
Verified deep-links retained:                 39  (36 + 3 yeni)
Safe portal/homepage fallbacks:               38  (37 + 1 yeni CFA)
Professional authority sources:               23
Sources requiring content correction:          0  (7 çözüldü)
```

**Doğrulama:** 39 + 38 = **77** ✓ · Benzersiz Source satırı: **75** (2 paylaşılan satır ek bağlantı: ETBİS ×2 ders, Tüketici Portalı ×2).
Önceki durum (16 Ağustos): 80 bağlantı · 2 NONEXISTENT · 5 MISMATCH · 7 düzeltme gerektiren kayıt — tamamı bu turda çözüldü.

---

## İçerik Düzeltmesi — 17 Ağustos 2026 (7 kayıt)

`SOURCE_POLICY_FINAL_REPORT`'ta işaretlenen 7 kayıt çözüldü. Makine-okunur patch: **`CANONICAL_SOURCE_CONTENT_PATCH.json`** (uygulanmadı, yalnız üretildi). `SOURCE_DEEP_LINK_PATCH.json`'a `content_correction_round_2026_08_17` bölümü eklendi.

### REPLACE_WITH_VALID_SOURCE — 4

| Ders | Eski (mismatch) | Yeni | Kanıt |
|---|---|---|---|
| COURSE-006 | KGK genel (`kgk.gov.tr`) — başa baş noktasını karşılamıyordu | **SBA — Break-even Point** (`sba.gov/business-guide/.../break-even-point`) | canlı HTTP 200; başlık + gövde doğrulandı: başa baş formülü, sabit/değişken maliyet, katkı payı — birebir eşleşme |
| COURSE-007 | KGK genel (`kgk.gov.tr`) — SKU kârlılığını karşılamıyordu | **CFA Institute Financial Resources** (`rpc.cfainstitute.org/`) | canlı HTTP 200; ürün kârlılık/maliyet analizi CFA müfredatı konusu; mevcut CFA ×4 kayıt seviyesi (belge adı uydurulmadı) |
| COURSE-008 | KGK genel (`kgk.gov.tr`) — işletme sermayesini karşılamıyordu | **SBA — Manage Your Finances** (`sba.gov/business-guide/manage-your-business/manage-your-finances`) | canlı HTTP 200; bilanço, nakit akışı, alacak/borç, nakit yönetimi — işletme sermayesi iddiasını destekliyor |
| COURSE-017 | KAP (`kap.org.tr`) — LTV/churn'ü karşılamıyordu | **HBR — What Most Companies Miss About Customer Lifetime Value** (`hbr.org/2017/04/what-most-companies-miss-about-customer-lifetime-value`) | canlı HTTP 200; makale (M. Schrage, 18.04.2017) CLV ve kazanım/elde tutma kararları — birebir eşleşme |

### REMOVE_SOURCE — 3

| Ders | Kaynak | Gerekçe |
|---|---|---|
| COURSE-007 | Kamuyu Aydınlatma Platformu (`kap.org.tr`) | KAP halka açık şirket bildirim platformu; SKU kârlılığını destekleyen içerik yok. Konuyu destekleyen doğrulanmış alternatif bulunamadı (mükerrer CFA eklenmedi). |
| COURSE-034 | "Kamu Gözetimi Kurumu Analiz Standartları" | Uydurma belge adı — KGK yayın kataloğunda karşılığı yok. Gerçek yayın karşılığı olmadığından REMOVE_SOURCE; kaynak sayısını korumak için sahte replacement üretilmedi. |
| COURSE-034 | "Gelir İdaresi Başkanlığı Analiz Rehberi" | Uydurma belge adı — GİB yayın kataloğunda karşılığı yok. Gerçek yayın karşılığı olmadığından REMOVE_SOURCE; sahte replacement üretilmedi. |

**RENAME_AND_KEEP:** 0 · **MANUAL_REVIEW:** 0

COURSE-034 `verified_sources` artık boş (kaynak sayısı kaybı bilinçli kabul edildi); ders içeriği değişmedi.

---

## Kural bazında uygulama

| Kural | Uygulama |
|---|---|
| 1. Doğrulanmış deep-link koru | 36 bağlantı `VERIFIED_DEEP_LINK` — 35'i `SOURCE_DEEP_LINK_PATCH.json`'dan (33 kayıt, 2 paylaşımlı satır dâhil), 1'i zaten doğru olan NIST CSF 2.0 (`nist.gov/cyberframework`) |
| 2. Portal/kategori fallback'i | 37 bağlantı `PORTAL_FALLBACK` — deep-link doğrulanamayan kayıtlarda resmî kurum ana portalı korundu, üretilmedi |
| 3. Tahmini URL üretme | 0 tahmini URL yazıldı. Bu turda denenip reddedilenler: `ispat.gov.tr` NXDOMAIN, `www.iys.org.tr` 404, `cbddo.gov.tr` bağlantı sıfırlanması |
| 4. Kırık URL bırakma | 4 kırık bağlantı düzeltildi (aşağıda); kalan 0 |
| 5. Var olmayan kaynakları işaretle | 2 kaynak `NONEXISTENT_SOURCE` olarak işaretlendi (COURSE-034) |
| 6. Dersi desteklemeyen kaynaklar | 5 bağlantı `CLAIM_SOURCE_MISMATCH` — içerik temizliği listesine alındı |
| 7. Non-gov otoriterleri silme | 21 bağlantı `PROFESSIONAL_AUTHORITY` — hiçbiri silinmedi; Damodaran/ICC/IFRS/NIST deep-link aldı, CFA ×4 ve SBA/Google/ISO/KGF/TBB/TOBB/BDDK/KAP/İYS/TOCICO portal düzeyinde korundu |
| 8. Kaynak adı spesifikliği | Patch adları uygulandı (kurum + belge/tebliğ/rehber). Jenerik adlar (CFA ×4) kurum adıyla korundu, belge adı uydurulmadı |
| 9. Patch kayıtlarını koru | `SOURCE_DEEP_LINK_PATCH.json` kayıtları aynen korundu; 2 yeni kayıt `policy_final_round_2026_08_16` bölümüne **eklendi** |

`verified_sources` kayıtlarına eklenen işaret alanları (importer yalnız `name`/`url` okur — uyumluluk etkilenmez):
- `policy_status`: `VERIFIED_DEEP_LINK` · `PORTAL_FALLBACK` · `CLAIM_SOURCE_MISMATCH` · `NONEXISTENT_SOURCE`
- `source_class`: `OFFICIAL_GOV` · `PROFESSIONAL_AUTHORITY`
- `policy_note`: yalnız istisna/kırık URL açıklaması olan kayıtlarda

---

## Kırık URL'ler — düzeltilen 4

| Ders | Eski (kırık) | Sorun | Yeni | Kanıt |
|---|---|---|---|---|
| COURSE-011, 025 | `www.etbis.gov.tr` | **NXDOMAIN** — alan adı hiç yok | `etbis.ticaret.gov.tr/` | patch kaydı, portal içeriği okundu |
| COURSE-014 | `www.gib.gov.tr/ynokc` | soft-404 (HTTP 200 yalan söyler, DOM'da görülür) | `ynokc.gib.gov.tr/` | patch kaydı, GİB kendi menüsünden alındı |
| COURSE-018 | `www.iys.org.tr` | **HTTP 404** — www alt alanı yayında değil | `iys.org.tr/` | HTTP 200 + başlık "İleti Yönetim Sistemi" ✅ **bu turda bulundu** |
| COURSE-036 | `www.ispat.gov.tr` | **NXDOMAIN** — alan adı hiç yok | `www.tocico.org/` | TOCICO canlı (DNS+HTTP 200+render) ✅ **bu turda bulundu** |

**Açık izlenenler (kırık sayılmaz, DNS çözümleniyor):**
- `www.cbddo.gov.tr` (COURSE-038): bu ağdan bağlantı reset — resmî kurum alan adı, periyodik kontrol önerilir (JSON'da `policy_note`).
- `www.iso.org` (COURSE-020): Cloudflare bot koruması 403 — kurum portalı, korundu.

## Var olmayan kaynaklar — 2 (COURSE-034) — ÇÖZÜLDÜ (17.08.2026)

Her iki kaynak adı da kurumun yayın kataloğunda karşılığı olmayan belgeleri işaret ediyordu (uydurma isimli):
- "Kamu Gözetimi Kurumu Analiz Standartları"
- "Gelir İdaresi Başkanlığı Analiz Rehberi"

→ `NONEXISTENT_SOURCE` işaretlendi; **17 Ağustos 2026'da her ikisi de REMOVE_SOURCE ile içerikten çıkarıldı** (gerçek yayın karşılığı yok; sahte replacement üretilmedi). `verified_sources` boş bırakıldı.

## İddia/kaynak eşleşmesi olmayanlar — 5 — ÇÖZÜLDÜ (17.08.2026)

Sayfalar gerçek ve canlı ama dersin konusunu desteklemiyordu:

| Ders | Kaynak | Konu uyuşmazlığı | Çözüm (17.08.2026) |
|---|---|---|---|
| COURSE-006 | T.C. Kamu Gözetimi Kurumu (genel) | Başa baş/güvenlik marjı — KGK set sayfası karşılamıyor | REPLACE → SBA Break-even Point |
| COURSE-007 | T.C. Kamu Gözetimi Kurumu (genel) | SKU kârlılık — karşılamıyor | REPLACE → CFA Institute Financial Resources |
| COURSE-007 | Kamuyu Aydınlatma Platformu | SKU kârlılık — KAP bildirim sorgusu karşılamıyor | REMOVE_SOURCE |
| COURSE-008 | T.C. Kamu Gözetimi Kurumu (genel) | İşletme sermayesi — karşılamıyor | REPLACE → SBA Manage Your Finances |
| COURSE-017 | KAP Finansal Raporlama Portalı | LTV/churn — karşılamıyor | REPLACE → HBR CLV makalesi |

→ `CLAIM_SOURCE_MISMATCH` işaretlenmişti; **hepsi 17 Ağustos 2026'da çözüldü** (4 REPLACE, 1 REMOVE). Detaylar `CANONICAL_SOURCE_CONTENT_PATCH.json`.

## PROFESSIONAL_AUTHORITY — 21 bağlantı (hiçbiri silinmedi, kural 7)

| Kaynak | Dersler | Durum |
|---|---|---|
| CFA Institute (rpc.cfainstitute.org) ×4 | 005, 008, 009, 010 | Portal korundu; adlar jenerik, belge adı uydurulmadı |
| NYU Stern / Damodaran (WACC Central) | 010 | ✅ deep-link |
| IFRS 15 | 017 | ✅ deep-link |
| NIST C-SCRM | 020 | ✅ deep-link |
| NIST CSF 2.0 | 019 | ✅ zaten doğruydu |
| ICC Incoterms 2020 | 037 | ✅ deep-link |
| TOCICO | 036 | ✅ kırık URL düzeltmesi (bu tur) |
| SBA | 006 | Portal |
| Google Ads ROI Kılavuzları | 016 | Portal (`support.google.com`) |
| ISO | 020 | Portal (bot koruması notlu) |
| KGF | 024 | Portal |
| TBB | 024 | Portal |
| BDDK | 024 | Portal |
| TOBB Perakende Meclisi | 030 | Portal |
| TMMOB İçmimarlar Odası | 023 | Portal |
| İYS | 018 | Portal (kırık URL düzeltmesi, bu tur) |
| KAP ×2 | 007, 017 | Portal — ama **mismatch** (içerik temizliği listesi) |

## Verified deep-links — 36 bağlantı

- **mevzuat.gov.tr (8):** VUK 213 (001, 035) · TTK 6102 (021, 029) · TKHK 6502 (012) · İş Kanunu 4857 (022) · TBK 6098 (023, 030) · KVKK 6698 (019) · Fiyat Etiketi Yönetmeliği (003) · Perakende Kanunu 6585 (004)
- **gib.gov.tr (4):** KDV Kanunu 3065/kanun/436 (003, 028) · Gelir Vergisi Tarifesi (021) · YNOKC portalı (014)
- **ebelge.gib.gov.tr (2):** e-Arşiv hakkında (011) · e-Fatura entegratörlük (015)
- **kgk.gov.tr (4):** TMS/TFRS setleri (005) · TMS 2 PDF (031) · TFRS 13 PDF (026) · TMS 7 PDF (009)
- **tuketici.ticaret.gov.tr (1 paylaşımlı):** Mesafeli Sözleşmeler bilgilendirmesi (012, 013)
- **etbis.ticaret.gov.tr (1 paylaşımlı):** ETBİS portalı (011, 025)
- **sgk.gov.tr (1):** Güncel Sigorta Primi Teşvikleri (022) — slug değişebilir, periyodik kontrol
- **kosgeb.gov.tr (2):** Destekler listesi (025, 033)
- **tubitak.gov.tr (2):** Ulusal Destek Programları (027) · BİLGEM YZE (038)
- **Non-gov (5):** Damodaran WACC (010) · ICC Incoterms 2020 (037) · IFRS 15 (017) · NIST C-SCRM (020) · NIST CSF (019)
- **Tocico (1):** kırık ispat.gov.tr yerine (036) — bu turun yeni kaydı

## Safe portal/homepage fallbacks — 37 bağlantı

Deep-link doğrulanamayan ancak resmî/otoriter kurum ana portalı olan kayıtlar (kural 2). Örnekler: SGK (001), ETBİS/Tüketici Portalı (002), BTK (013), KOSGEB ×4 (014, 015, 016, 027), ticaret.gov.tr ×3 (021, 028, 033), csgb.gov.tr (022), gib.gov.tr ×3 (023, 029, 031, 035), TCMB/HMB (032), SPK (026), sanayi.gov.tr (036), kolayihracat.gov.tr (037), CBDDO (038), CFA/SBA/Google/ISO/KGF/TBB/BDDK/TOBB/İçmimarlar/KAP/İYS/TOCICO.

---

## Yöntem

1. 80 bağlantının tamamı `content/migration/transformed-courses-combined.json`'dan çekilip benzersiz kayıtlara ayrıştırıldı (76 benzersiz kayıt).
2. Her benzersiz alan adı **DNS** ile doğrulandı (NXDOMAIN yakalaması) → `etbis.gov.tr` ve `ispat.gov.tr` yakalandı.
3. Tüm benzersiz URL'lere HTTP HEAD/GET erişim testi → `www.iys.org.tr` 404 yakalandı; `iso.org` 403, `cbddo.gov.tr` reset notlandı.
4. `SOURCE_DEEP_LINK_PATCH.json` kayıtları canonical JSON'a deterministik uygulandı (35 bağlantı, isim+URL birlikte).
5. Yeni kırık URL düzeltmeleri patch dosyasına `policy_final_round_2026_08_16` bölümü olarak **eklendi** (mevcut 33 kayıt aynen korundu).
6. Kalan kayıtlar sınıflandırıldı ve işaretlendi.

## Kısıtlar (uyuldu)

Phase B: YAPILMADI · Legacy archive/update/delete: YAPILMADI · Canonical re-import: YAPILMADI · DB write: YAPILMADI · git add/commit/push: YAPILMADI

**Değişen dosyalar (16.08.2026):** `content/migration/transformed-courses-combined.json` (yalnız `verified_sources`), `SOURCE_DEEP_LINK_PATCH.json` (yalnız başlık + ek bölüm).
**Değişen dosyalar (17.08.2026):** `content/migration/transformed-courses-combined.json` (yalnız 7 kayıt: 4 replace + 3 remove), `SOURCE_DEEP_LINK_PATCH.json` (yalnız `content_correction_round_2026_08_17` bölümü eklendi), `SOURCE_POLICY_FINAL_REPORT.md` (bu bölüm), `CANONICAL_SOURCE_CONTENT_PATCH.json` (yeni, machine-readable patch — DB'ye uygulanmadı).
