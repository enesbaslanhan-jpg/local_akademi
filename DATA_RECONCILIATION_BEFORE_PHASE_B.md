# DATA RECONCILIATION BEFORE PHASE B (READ-ONLY)

Tarih: 2026-08-17 · Mod: yalnızca okuma (`prisma/_qa-reconcile.mjs`, `_qa-dc-tax013` probe) — DB'ye hiçbir yazma/delete yapılmadı.

## 1. Soru: Toplam KO neden 993? (955 baseline + 38 canonical bekleniyordu)

**Doğrulandı: Güncel toplam KnowledgeObject = 993.** Beklenti birebir tutuyor:

| Ölçüt | Beklenen | Güncel | Fark |
|---|---|---|---|
| KO toplam (tüm satırlar) | 955 + 38 = **993** | **993** | 0 |
| KO canonical (`code` CANON- ile başlar) | 38 | 38 | 0 |
| Course canonical / legacy | 38 / 288 | 38 / 288 | 0 |
| Lesson canonical / legacy | 38 / 1170 | 38 / 1170 | 0 |

## 2. "950" nereden geliyor? (Phase A raporundaki legacy KO sayısı)

Phase A preflight `kos=950` sayısı bir **veri kaybı değil, filtre tanımı artefaktıdır**:

- Phase A (`scripts/content-migration-phase-a.ts:105`) legacy KO'yu `NOT { code: { startsWith: 'CANON-' } }` ile saydı.
- Bu filtre, `code = NULL` olan satırları SQL NULL semantiği gereği **dışlar**.
- DB'de **5 adet `code = NULL` KO** var (tamamı arşivli, Phase A'dan **önce** mevcut):

| id | title | status | createdAt | archivedAt |
|---|---|---|---|---|
| 621 | Değişken (Variable) | archived | 2026-07-19 | 2026-07-29 |
| 622 | Fonksiyon (Function) | archived | 2026-07-19 | 2026-07-29 |
| 623 | Python'da Değişken Oluşturma | archived | 2026-07-19 | 2026-07-29 |
| 624 | Python'da len() fonksiyonu | archived | 2026-07-19 | 2026-07-29 |
| 625 | DRY (Don't Repeat Yourself) | archived | 2026-07-19 | 2026-07-29 |

Bu kayıtlar ilk seed'in arşivlenmiş programlama-demo içerikleridir; Phase A ile ilgisi yok.

**Matematik:** 993 toplam = 950 kodlu legacy (CANON- dışı) + 38 canonical + 5 NULL-code arşivli = **tam isabet**.

## 3. Legacy KO kimliği — audit baseline (13 Ağu) ile birebir eşleşme

| Kırılım (güncel) | Adet | Audit 13 Ağu karşılığı |
|---|---|---|
| published, archivedAt NULL | 295 | 299 published = 295 + 4 inconsistent |
| published, archivedAt dolu (INCONSISTENT) | 4 | 4 inconsistent ✅ |
| archived, archivedAt dolu (kodlu) | 651 | 656 archived = 651 + 5 NULL-code |
| NULL code, archived | 5 | (yukarıdaki 656'nın içinde) |
| **Legacy toplam (tüm satırlar)** | **955** | **955** ✅ |

- 13–15 Ağu arasında KO **yaratılmadı** (sorgu penceresi = 0 satır); KO kümesi yalnızca Phase A'nın 38 canonical kaydıyla büyüdü.
- Bu penceredeki tek veri eklemesi `DecisionCheck` tablosuna `DC-TAX-013`'ün 14 Ağu'da yayınlanmasıydı (audit'in "eksik" bulgusuyla dry-run'un "bulundu" bulgusunu çözen kayıt; KO sayısını etkilemez).
- Legacy KO'ların hiçbirine hiçbir patch dokunmadı (TAB patch, command repair, source patch scriptleri yalnız CANON- satırlarına yazar; legacy bağlantı sayıları apply öncesi/sonrası eşit doğrulandı).

## 4. Enrollment — "47 + 3" değil, "47 + 6" (hepsi test kökenli, legacy'ye sıfır dokunuş)

**Güncel toplam Enrollment = 53.** Audit baselinindeki 47 kayıt (id 1–45, 48, 49) bugün **tamamı mevcut** → audit sonrası **hiçbir silme yok**.

Audit sonrası eklenen 6 kayıt, hepsi `canonical-v1` kurslarında ve yalnız iç test hesaplarında:

| id | user | course | createdAt | Kaynak |
|---|---|---|---|---|
| 50 | Admin User (id 1) | CANON: Gerçek Birim Maliyet Hesaplama Pusulası | 2026-08-15 19:29 | Phase A import sonrası manuel/QA kaydı |
| 51 | Admin User (id 1) | CANON: Şirket Kurulumu ve Vergi Planlaması | 2026-08-15 19:33 | aynı |
| 52 | Admin User (id 1) | CANON: KOBİ'ler için Kur ve Enflasyon Riski Yönetimi | 2026-08-15 19:33 | aynı |
| 53 | Demo Student (id 2) | CANON: Gerçek Birim Maliyet Hesaplama Pusulası | 2026-08-17 11:18 | Bugünkü görsel QA oturumu |
| 54 | Demo Student (id 2) | CANON: Şirket Kurulumu ve Vergi Planlaması | 2026-08-17 11:18 | aynı |
| 55 | Demo Student (id 2) | CANON: KOBİ'ler için Kur ve Enflasyon Riski Yönetimi | 2026-08-17 11:18 | aynı |

Ek notlar:
- id 46–47 boşluğu (auto-increment atlaması): bu kayıtlar audit anlık görüntüsünden **önce** oluşturulup silinmiş (örn. tarayıcı testi temizliği); audit sonrası silme yok.
- Tüm kullanıcılar iç/demo hesaplarıdır (Demo Student, Beta Learner, Beta Admin, Admin User, Browser Test) — gerçek dış kullanıcı verisi yok.
- Phase A'nın kendisi kullanıcı verisine dokunmadı: rapor `user_history` Enrollment 47→47, deletes=0, remaps=0.

## 5. FINAL DATA RECONCILIATION

- **Legacy KO:** expected **955** · actual **955** · difference **0** · reason — "950" yalnızca `NOT startsWith 'CANON-'` filtresinin 5 NULL-code arşivli satırı dışlamasıdır; kayıp yok.
- **Enrollment:** expected **47** · current **53** · difference **+6** · QA test IDs: **50, 51, 52, 53, 54, 55** · contamination: **NO** (6'sı da canonical-v1 kurslarında, iç test hesaplarında; legacy enrollment kümesi aynen korundu).
- **Course/Lesson:** 288/1170 legacy aynen; +38 canonical beklenen.
- **Karar:** Görsel QA ve **Phase B'ye geçiş GÜVENLİ** (GÖRSEL QA TAMAMLANINCA). Phase B scriptlerinin karışıklığı önlemek için `code: { not: null }` veya toplam sayım kullanması önerilir.