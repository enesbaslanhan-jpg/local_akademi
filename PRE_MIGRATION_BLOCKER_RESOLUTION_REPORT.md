# LocalKarar — Pre-Migration Blocker Resolution Raporu

**Tarih:** 14 Ağustos 2026
**Kapsam:** Yalnız blocker çözümü. Canonical 38 içerik import edilmedi, 288 legacy Course arşivlenmedi.

---

## TASK 1 — DC-TAX-013

**Kod:** `DC-TAX-013` · **Başlık:** Hangi şirket türü bana uygun? · **Kategori:** Hukuk ve Vergi · **Sürüm:** 1.0

Mevcut mimari yeniden kullanıldı; paralel sistem kurulmadı:

| Katman | Kullanılan | Değişiklik |
|---|---|---|
| Tanım | `STRUCTURED_TOOL_CONFIGS` (`src/services/decision-tool-catalog.ts`) | 12. yapılandırma eklendi |
| Hesaplama | `calculateStructuredDecisionTool` switch | `case 'DC-TAX-013'` eklendi |
| Doğrulama | `validateStructuredToolAnswers` | Seçenekli soru dalı eklendi |
| API | `GET/POST /api/v1/decision-checks/:code` | Değişiklik yok |
| Route | `/app/decision-checks/:code` | Değişiklik yok |
| Bileşen | `StructuredDecisionTool.jsx` | Seçenekli girdi render'ı eklendi |
| Karar fişi | `DecisionReceipt` / snapshot | Değişiklik yok |

### Girdi tasarımı — ürün kararındaki altı faktör

| Soru | Tip | Değerler |
|---|---|---|
| Tahmini yıllık kâr | `money` | ₺ |
| Kârı ne yapmayı planlıyorsunuz? | `choice` | 0 dağıt · 1 karma · 2 işletmede bırak |
| Dışarıdan yatırım almayı hedefliyor musunuz? | `choice` | 0 hayır · 1 belirsiz · 2 evet |
| Kaç ortakla yola çıkıyorsunuz? | `number` | 1–50 kişi |
| Kişisel mal varlığı riski ne kadar önemli? | `choice` | 0 düşük · 1 orta · 2 yüksek |
| 3 yıllık büyüme planınız | `choice` | 0 sabit · 1 kademeli · 2 hızlı |

### Mimariye eklenen tek yenilik: `choice` girdi tipi

Mevcut sistem yalnız sayısal girdi tanımlıyordu (`money`, `percentage`, `number`, `days`, `months`). Şirket türü kararının yarısı kategorik olduğu için `choice` tipi eklendi.

Kritik tasarım kararı: **seçenek değerleri sayıdır.** Böylece hesaplama katmanının `Record<string, number>` sözleşmesi değişmedi ve mevcut 11 aracın hiçbiri etkilenmedi. Doğrulama, seçenekli sorularda aralık değil **tanımlı değer kümesi** kontrol eder — aralık kontrolü 0–2 arasında `1.5` gibi anlamsız bir değeri geçirirdi.

### Sonuç etiketleri

`DecisionLabel` birleşimi dört etiketle genişletildi. Şirket türü kararı "uygun/riskli" ölçeğine oturmaz; bir yön önerisidir.

- `ŞAHIS İŞLETMESİNİ DEĞERLENDİR`
- `LİMİTED ŞİRKETİ DEĞERLENDİR`
- `ANONİM ŞİRKETİ DEĞERLENDİR`
- `PROFESYONEL DOĞRULAMA GEREKLİ`

### Danışmanlık sınırı

Araç bilinçli olarak **hiçbir vergi oranı veya tutarı hesaplamaz.** Oranlar mevzuata bağlı ve sık değişiyor; sabitlenmiş bir oran yanlış güven üretirdi. Bunun yerine girdilerden bir *kurumsallaşma sinyali* üretilir ve kullanıcı hangi seçeneği mali müşavirle konuşacağı konusunda yönlendirilir.

- Her sonuçta "bu bir vergi veya hukuk danışmanlığı değildir" uyarısı yer alır.
- Çelişkili sinyalde (örn. yüksek yatırımcı hedefi + çok düşük kâr) araç **yön önermez**, `PROFESYONEL DOĞRULAMA GEREKLİ` döner.
- Tek para birimli metrik kullanıcının kendi girdiği kârdır; hesaplanmış vergi metriği yoktur. Bu bir testle sabitlendi.

### COURSE-021 bağlantısı

`DC-TAX-013` veritabanında yayında (`published = true`, `currentVersion = 1.0`). COURSE-021'in `decision_tool_id` bağı artık çözülüyor; kod kaldırılmadı, başka araca yönlendirilmedi.

`scripts/seed-dc-tax-013.ts` yalnız bu aracı yayına alır — diğer 12 araca, kurslara, derslere, KO'lara ve kullanıcı geçmişine dokunmaz. Tanım tek kaynaktan okunur, ikinci bir tanım tutulmaz.

---

## TASK 2 — Course archive desteği

`Course` modeline `archivedAt DateTime?` eklendi. **`Lesson` modeli değiştirilmedi.**

### Durum semantiği

| Durum | published | archivedAt |
|---|---|---|
| ACTIVE | `true` | `null` |
| DRAFT | `false` | `null` |
| ARCHIVED | `false` | `!= null` |
| **GEÇERSİZ** | `true` | `!= null` |

### Migration

`prisma/migrations/20260814000000_add_course_archived_at/migration.sql` — yalnız şema. Yeni sütun tüm mevcut satırlarda `NULL` kalır, yani 288 kursun tamamı bugünkü ACTIVE/DRAFT durumunu aynen korur.

İndeksler yeni sorgu desenine göre düzenlendi:
- `Course_published_archivedAt_sortOrder_idx` — katalog sorgusu (`published + archivedAt IS NULL`, `sortOrder` sıralı)
- `Course_archivedAt_idx` — arşiv yönetimi filtresi
- Eski `Course_published_sortOrder_idx` kaldırıldı; yeni bileşik indeksin öneki onu karşılıyor

### Sorgu davranışı

| Yer | Değişiklik |
|---|---|
| `src/services/courses.ts` — katalog listesi | `where` artık `{ published: true, archivedAt: null }` |
| `src/services/courses.ts` — kurs detayı | Arşivli kurs **404 vermez**; `archived` ve `archivedAt` alanlarıyla döner |
| `src/index.ts` — health sayaçları | Arşivli kurs ve dersleri saymaz |
| `src/services/learnerDashboard.ts` — legacy eşleme | Arşivli kursu aktif eşleşme olarak önermez |

Detayın 404 vermemesi bilinçli: bir kursa kayıtlı kullanıcı sonradan o kurs arşivlense bile ilerleme ve tamamlama geçmişine erişebilmeli. 404 vermek geçmişi koparırdı. İstemci `archived` bayrağıyla "bu içerik arşivlendi" uyarısı gösterebilir.

Admin tarafı engellenmedi; arşivli kayıtlar okunabilir kalır.

---

## TASK 3 — Güvenlik doğrulaması

```
Legacy Course deleted: 0        (288 → 288)
Legacy Lesson deleted: 0        (1170 → 1170)
Legacy KO deleted: 0            (955 → 955)
User-history deleted: 0         (127 → 127)

Legacy Course archived during this task: 0
Invalid state (published + archivedAt): 0
```

Kullanıcı geçmişi dağılımı değişmedi: Enrollment 47 · DecisionCheckSession 45 · LessonProgress 12 · KnowledgeProgress 6 · FormulaCalculation 6 · ActivityEvent 5 · QuizAttempt 3 · TaskAssignment 3.

Bu görevde yapılan tek veri yazması: `DecisionCheck` + `DecisionCheckVersion` tablolarına `DC-TAX-013` eklenmesi (12 → 13 araç).

---

## TASK 4 — Testler ve build

| Kontrol | Sonuç |
|---|---|
| `prisma validate` | Geçti |
| `prisma migrate deploy` | Uygulandı, veri değişmedi |
| Backend tam paket | **84 dosya / 1254 test** geçti |
| `tests/decision-tool-tax-013.test.ts` (yeni) | 13 test geçti |
| `tests/decision-tools-12.test.ts` | 11 → 12 araç olarak güncellendi, geçti |
| Frontend tam paket | **27 dosya / 145 test** geçti |
| `TaxDecisionTool.test.jsx` (yeni) | 5 test geçti |
| Frontend production build | Başarılı |

DC-TAX-013 route/link testi ayrıca doğrulandı: araç **ayrı bir route veya bileşen gerektirmiyor**; generic `/app/decision-checks/:code` üzerinden `StructuredDecisionTool`'a düşüyor. Test bu bağın çalıştığını, seçenekli girdinin radyo grubu olarak render edildiğini ve seçilen değerin sayı olarak kaydedildiğini doğruluyor.

---

## Final

```
DC-TAX-013 implemented: YES
COURSE-021 link operational: YES

Course.archivedAt added: YES
Lesson schema changed: NO

Legacy courses modified: 0
Legacy lessons modified: 0
Legacy KOs modified: 0
User history modified: 0

Prisma valid: YES
Tests: backend 1254/1254 · frontend 145/145
Build: SUCCESS

Safe to rebuild dry-run after blocker resolution: YES
Safe to run actual content migration: NO
```

### Neden "actual migration" hâlâ NO

İki blocker çözüldü, biri kısmen kaldı:

1. ~~`DC-TAX-013` eksik~~ → **çözüldü**, yayında.
2. ~~Course arşiv semantiği yetersiz~~ → **çözüldü**, `archivedAt` eklendi.
3. `Lesson` arşiv alanı yok → **ürün kararıyla kapatıldı** (arşiv sınırı Course seviyesi), şema değişmedi.

Kalan neden bir blocker değil, **sıra meselesi**: dry-run bu değişikliklerden önce üretildi ve artık güncel değil. Dry-run yeniden çalıştırılıp `Missing Decision Tool IDs: none` ve `Archive schema blockers: none` sonucu doğrulandıktan sonra gerçek migration kapısı açılabilir.

Ayrıca hâlâ ele alınmamış iki nokta var:
- **Dört tutarsız KO** (`archivedAt` dolu, `status = published`) normalize edilmedi; ayrı yazılı karar bekliyor.
- **Phase B arşiv adımının kendi dry-run planı** yazılmadı. Bu görev arşivlemeyi *mümkün kıldı*, planlamadı.
