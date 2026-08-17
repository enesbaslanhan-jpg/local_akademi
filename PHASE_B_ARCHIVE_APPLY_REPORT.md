# Phase B — Legacy Course Archive · APPLY

**Tarih:** 17 Ağustos 2026 · Checkpoint: `356a0aa`

**Uygulandı:** 288 legacy Course arşivlendi, tek transaction.
**Yapılmadı:** hard delete, Lesson/KO mutasyonu, progress remap, Enrollment değişikliği, canonical mutasyonu, QA cleanup, git add/commit/push.

---

## 1. Apply öncesi gate'ler

Tüm değerler canlı DB'den okundu; statik geçmiş sayısı kullanılmadı.

| Gate | Bulunan | Beklenen | Sonuç |
|---|---:|---:|---|
| Hedef kümedeki canonical kurs | 0 | 0 | GEÇTİ |
| Canonical kurs toplamı | 38 | 38 | GEÇTİ |
| Canonical kurs aktif | 38 | 38 | GEÇTİ |
| Toplam kurs | 326 | 326 | GEÇTİ |
| Toplam ders | 1208 | 1208 | GEÇTİ |
| Toplam KO | 993 | 993 | GEÇTİ |
| Arşivlenecek legacy kurs | 288 | 288 | GEÇTİ |

Gate'ler apply sırasında **transaction içinde tekrar** çalıştı; hedefte canonical bulunsaydı veya yazma sonrası canonical aktif 38 olmasaydı `throw` ile rollback edilecekti.

## 2. Apply

```
published  = false
archivedAt = <tek zaman damgası>
```

Kapsam tek tablo: `Course`. Sonuç: **288 satır güncellendi.**

Arşiv damgasının `DISTINCT` sayısı **1** — tek transaction kanıtı.

## 3. Before → After farkı (bit düzeyinde)

Aynı anlık görüntü sorgusu apply öncesi ve sonrası çalıştırıldı. `diff` çıktısı **tam olarak iki satır**:

```diff
- course.legacy.archived = 0
+ course.legacy.archived = 288
- course.legacy.notArchived = 288
+ course.legacy.notArchived = 0
```

Başka hiçbir satır değişmedi. Değişmeyenler arasında:

| Ölçüm | Değer | Durum |
|---|---|---|
| `course.total` | 326 | değişmedi |
| `course.canonical` / `.active` | 38 / 38 | değişmedi |
| `course.canonical.idhash` | `1fb62034…` | değişmedi |
| `course.legacy.idhash` | `3621b08d…` | değişmedi (satır eklenmedi/silinmedi) |
| `course.invalidState` | 0 | geçersiz durum oluşmadı |
| `lesson.total` / `lesson.idhash` | 1208 / `3e9fe61e…` | değişmedi |
| `ko.total` / `ko.idhash` | 993 / `d1e7d587…` | değişmedi |
| `ko.statushash` | `f46883e9…` | **KO status/archivedAt hiç değişmedi** |
| `ko.legacy.nullsafe` | 955 | değişmedi |
| `ko.legacy.nullcode` + idhash | 5 / `8bafb1f5…` | değişmedi |
| `ko.inconsistent4` + idhash | 4 / `b078fca5…` | değişmedi |

## 4. Post-verify

| Kontrol | Değer |
|---|---:|
| Legacy: `published=false` **ve** `archivedAt` dolu | 288 |
| Legacy: hâlâ `published=true` | 0 |
| Legacy: `archivedAt` NULL | 0 |
| Canonical: `published=true` | 38 |
| Canonical: `archivedAt` NULL | 38 |
| Geçersiz durum (`published` + `archived`) | 0 |
| Arşivlenen kursların dersleri (silinmemiş) | 1170 |

## 5. Kullanıcı geçmişi kimliği

Canlı okundu; eski 47/53/57 sayıları gate olarak kullanılmadı.

| Tablo | Önce | Sonra | ID hash |
|---|---:|---:|---|
| Enrollment | 57 | 57 | değişmedi |
| LessonProgress | 14 | 14 | değişmedi |
| KnowledgeProgress | 6 | 6 | değişmedi |
| DecisionCheckSession | 46 | 46 | değişmedi |
| FormulaCalculation | 7 | 7 | değişmedi |
| ActivityEvent | 5 | 5 | değişmedi |
| QuizAttempt | 3 | 3 | değişmedi |
| TaskAssignment | 3 | 3 | değişmedi |

`Enrollment` için ayrıca **veri hash'i** (`id:courseId:progress:status`) alındı: `6a6462e8…` → **değişmedi**. Yani yalnız satır sayısı değil, ilerleme ve durum değerleri de aynı.

**History identity preserved: YES** · delete 0 · update 0 · remap 0.

## 6. API smoke — 16/16

Gerçek HTTP, gerçek kullanıcı token'ı. Test kullanıcısı #6, arşivli legacy kurs #3 "Vergi ve Yasal Yükümlülükler", canonical kurs #439.

| # | Senaryo | Sonuç |
|---|---|---|
| A | Katalogda arşivli legacy yok · katalog toplamı **38** | PASS |
| B | Global aramada arşivli legacy yok | PASS |
| C | 38 canonical katalogda görünür | PASS |
| D | Arşivli legacy detay **200**, `archived:true`, enrollment korunuyor, **ilerleme sıfırlanmamış** | PASS |
| E | Arşivli legacy ders **200** | PASS |
| F | DRAFT kurs hâlâ kapalı (detay 404, ders 404) | PASS |
| G | Canonical detay 200, `archived:false`, ders 404 değil | PASS |
| H | Dashboard 200, patlamıyor | PASS |

F testi için geçici bir taslak kurs oluşturuldu ve **test sonunda silindi** (doğrulandı: 0 artık).

### Gözlem — "devam et" kartı legacy-only kullanıcılarda boşalıyor

Smoke sırasında `resumeItem: null` görüldü. Sebep: `learnerDashboard.ts:78` aktif kurs listesini `e.course.published` ile süzüyor; arşivlenen legacy kurslar `published=false` olduğu için dashboard'un aktif listesinden düşüyor.

Etki ölçüldü:

| | Kullanıcı |
|---|---:|
| Kayıtlı kullanıcı toplam | 5 |
| Yalnız legacy kayıtlı → "devam et" kartı boş | **3** |
| En az 1 canonical kaydı olan | 2 |

Bu bir veri kaybı **değil**: 49 legacy enrollment satırı korunuyor ve doğrudan adresten erişim çalışıyor (D ve E testleri geçti). Dashboard'un "aktif kurslar" semantiği gereği arşivlenen içerik orada listelenmiyor. Ürün kararı gerekiyorsa ayrı bir iş — bu turda değiştirilmedi.

## 7. Idempotency

Apply sonrası aynı script **yalnız dry-run** çalıştırıldı (`--apply` verilmedi):

```
GEÇTİ  Arşivlenecek legacy kurs: 0 (beklenen 0)
Course arşivleme: 0
```

İkinci apply gereksiz mutasyon üretmez.

---

## Final

```text
PHASE B APPLY RESULT

Apply status:                        SUCCESS

Legacy archive target before:        288
Legacy courses archived:             288
Legacy archive target after:           0

Canonical courses mutated:             0

Lesson mutations:                      0
KO mutations:                          0
Shared KO mutations:                   0

Deletes:                               0
Hard deletes:                          0
Relation deletes:                      0
Progress remaps:                       0

User history before:                 141 satır
  Enrollment 57 · DecisionCheckSession 46 · LessonProgress 14
  FormulaCalculation 7 · KnowledgeProgress 6 · ActivityEvent 5
  QuizAttempt 3 · TaskAssignment 3
User history after:                  141 satır (aynı)
History identity preserved:          YES  (ID hash + Enrollment veri hash'i birebir)

Total Course before/after:           326 / 326
Total Lesson before/after:           1208 / 1208
Total KO before/after:               993 / 993

Canonical active after:               38
Legacy archived after:               288

Archived direct Course access:       PASS
Archived Lesson access:              PASS
Catalog hidden:                      PASS
Search hidden:                       PASS
Canonical catalog:                   PASS  (38/38)
Recent/Continue regression:          PASS  (dashboard 200; legacy-only kullanıcıda kart boş — §6 gözlemi)

Second dry-run targets:                0

Backend/API smoke:                   16/16 PASS
Backend tests:                       88 dosya / 1315 test PASS
Frontend tests:                      28 dosya / 201 test PASS
Frontend build:                      SUCCESS
Errors:                              NONE

PHASE B PASS: YES
```

**Durum:** Phase B tamamlandı. Phase C / cleanup / legacy delete **çalıştırılmadı**. Git commit/push **yapılmadı**.
