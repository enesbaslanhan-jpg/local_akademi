# Phase B — Legacy Course Archive · Dry-Run Pre-Flight

**Tarih:** 17 Ağustos 2026 · **READ-ONLY.** DB yazma, apply, re-import, remap, git add/commit/push **yapılmadı.**

Checkpoint: `92c7140` · Phase A uygulanmış durumda. Tüm sayılar **canlı DB'den** okundu; statik/eski sayı kullanılmadı.

---

## 1. Mevcut DB durumu

| | Toplam | Canonical | Legacy |
|---|---:|---:|---:|
| Course | **326** | 38 | 288 |
| Lesson | **1208** | 38 | 1170 |
| KnowledgeObject | **993** | 38 | 955 |

Beklenen yapıyla **birebir** uyuşuyor. Yetim ders (kursu olmayan) yok.

**Canonical tanımı:** `Course.sourceType = 'canonical-v1'` (38 kayıt). Legacy = kalan 8 sourceType değeri:

| sourceType | Aktif | Taslak | Toplam |
|---|---:|---:|---:|
| topic | 0 | 200 | 200 |
| curated-v4 | 40 | 0 | 40 |
| phase6-financial-lab | 7 | 17 | 24 |
| curated-pilot-v5-source-doc | 12 | 0 | 12 |
| curated-pilot-v5-gdr | 7 | 0 | 7 |
| legacy | 0 | 3 | 3 |
| curated-operational-pilot-v1 | 0 | 1 | 1 |
| curated-pilot-v5 | 1 | 0 | 1 |

## 2. Legacy KO NULL-code tuzağı — doğrulandı

Naif filtre gerçekten satır kaçırıyor:

| Filtre | Sonuç |
|---|---:|
| `code NOT LIKE 'CANON-%'` (hatalı, tek başına) | 950 |
| `code IS NULL OR code NOT LIKE 'CANON-%'` (NULL-safe) | **955** ✅ |

| Kırılım | Adet |
|---|---:|
| canonical KO | 38 |
| legacy coded KO | 950 |
| legacy NULL-code KO | **5** |

**5 NULL-code KO:** id `621, 622, 623, 624, 625` — hepsi `status='archived'`, `archivedAt` dolu, `isDemo=false`. İçerik eski Python eğitim materyali (Değişken, Fonksiyon, `len()`, DRY). Zaten KO seviyesinde arşivli oldukları için aramada görünmüyorlar. **Phase B bunlara dokunmuyor** (Phase B yalnız `Course` satırı yazıyor).

## 3. Hedef küme — exact ID audit

Arşiv semantiği şemada tanımlı (`schema.prisma`, Course doc yorumu):
`ACTIVE = published:true, archivedAt:null` · `ARCHIVED = published:false, archivedAt:!null` · `published:true + archivedAt:!null` **geçersiz**.

| Küme | Adet | ID aralığı | ID hash (md5) |
|---|---:|---|---|
| `LEGACY_TARGET` — aktif | 67 | 207–438 | `ec9b60cdc7f06c1a19f5958c56947f2b` |
| `LEGACY_TARGET` — taslak | 221 | 1–394 | `2a0ad1c29f7a8847e8be8face9711b62` |
| **LEGACY_TARGET toplam** | **288** | | |
| `ALREADY_ARCHIVED` | **0** | — | — |
| `UNEXPECTED_STATE` | **0** | — | — |
| `CANONICAL_EXCLUDED` | 38 | 439–476 | `1fb6203469a0f8a2f0dbe49c9583a78e` |

Hedef sayısı beklenen **288 ile birebir aynı**; sapma yok, ID seviyesinde açıklama gerekmiyor.

Kırılımın anlamı: 67 kurs bugün katalogda **görünür** durumda ve arşivlemeyle katalogdan düşecek. 221 kurs zaten yayında değil; onlarda yalnız `archivedAt` yazılacak, kullanıcıya görünen davranış değişmeyecek.

`sourceType` kolonunda NULL yok (0 kayıt), ama hedef sorgusu yine de NULL-safe yazıldı.

## 4. Canonical koruma anlık görüntüsü

| Kontrol | Değer |
|---|---:|
| published = true | 38 / 38 |
| archivedAt NULL | 38 / 38 |
| slug dolu | 38 / 38 |
| slug benzersiz | 38 |
| metadata dolu (`<> '{}'`) | 38 / 38 |
| tam 1 ders taşıyan | 38 / 38 |
| dersi olmayan | 0 |
| Lesson → KO bağı olan | 38 / 38 |
| KO → kaynak bağı olan | 37 / 38 |

Son satır Phase B ile ilgisiz, önceden var olan bir durum: bir canonical KO'nun `Source` bağı yok. Kaynak audit'inin konusu, bu fazın değil.

**Plan içinde canonical ID: 0.**

## 5. Lesson / KO / geçmiş koruması

Mutasyon kapsamı tek tablo: `Course`. Planlanan yazma `published=false, archivedAt=now`.

| Planlanan | Adet |
|---|---:|
| Lesson doğrudan güncelleme | **0** |
| KnowledgeObject doğrudan güncelleme | **0** |
| Silme (soft) | **0** |
| Hard delete | **0** |
| İlişki silme | **0** |
| İlerleme remap | **0** |
| Paylaşılan KO mutasyonu | **0** |
| NULL-code KO'ya dokunma | **0** |

**4 tutarsız legacy KO** (canlı tespit): id `106` (CUR-021-01), `196` (CUR-039-01), `626` (FIN-CASHFLOW-001), `627` (FIN-REVENUE-001) — `status='published'` ama `archivedAt` dolu. Bu fazda **dokunulmuyor**.

## 6. Kullanıcı geçmişi anlık görüntüsü

Statik sayı kullanılmadı; apply öncesi/sonrası karşılaştırma için kimlik hash'i alındı.

| Tablo | Satır | ID hash (md5) |
|---|---:|---|
| Enrollment | 57 | `a3a5eba79573db805e9b7dc0c2d78443` |
| LessonProgress | 14 | `7982af76de186f91511921cc7ae5648d` |
| KnowledgeProgress | 6 | `92efbd047d71b1b08175b5cc5967de5e` |
| DecisionCheckSession | 46 | `6bdd6fca935bd293d4eed588022ffc38` |
| FormulaCalculation | 7 | `171d764eb26d3b40488d0c422f2c9e88` |
| ActivityEvent | 5 | `1e2c9ef44d083fd0d0fbe33ff1087b90` |
| QuizAttempt | 3 | `cfa459a2e147fd0494774e8387d1cafd` |
| TaskAssignment | 3 | `4d887cc43b7b46e067ef94f58f26d87e` |

`Enrollment = 57` — uyarıldığı gibi eski 47/53 sayıları geçersiz.

**Kullanıcı geçmişi için planlanan mutasyon: 0.**

## 7. Enrollment / arşivlenmiş kurs davranışı — ✅ ÇÖZÜLDÜ

`Course` satırı silinmediği için FK/cascade tetiklenmiyor; `Enrollment` fiziksel olarak korunuyor. **Ancak okuma yolu kırılıyor.**

Etkilenen geçmiş:

| Bağ | Adet |
|---|---:|
| Enrollment → legacy course | 49 |
| — bunlardan **hâlen aktif** kursa bağlı | **27** |
| Enrollment → canonical course | 8 |
| LessonProgress → legacy lesson | 13 |

`src/services/courses.ts:114-117` ürün kararını açıkça yazıyor:

> *"Arşivlenmiş kurs katalogda listelenmez ama kendi adresinden OKUNABİLİR kalır. 404 vermek, o kursa kayıtlı kullanıcının ilerleme ve tamamlama geçmişine erişimini koparırdı; ürün kararı geçmişin korunması yönünde."*

Fakat hemen üstündeki muhafız bunu geçersiz kılıyor:

- `courses.ts:110` → `if (!course || !course.published) return 404`
- `courses.ts:288` → `if (... || !lesson.course.published) return 404`

Arşivleme `published=false` yapmak **zorunda** (şema `published=true + archivedAt≠null` durumunu geçersiz sayıyor). Dolayısıyla apply sonrası 288 legacy kursun **detay ve ders uçları 404 dönecek** — yorumun reddettiği sonucun aynısı.

Bu bir kod hatası değil, **Phase B'nin açığa çıkaracağı gizli bir tutarsızlık**tı. Bugün hiçbir kurs arşivli olmadığı için (`ALREADY_ARCHIVED = 0`) fark edilmiyordu.

### Uygulanan düzeltme

Üç durum artık ayrı ayrı ele alınıyor; `published=false` **tek başına** 404 sebebi değil:

| Dosya | Eski | Yeni |
|---|---|---|
| `courses.ts` kurs detayı | `!course.published → 404` | `!course.published && !isArchived → 404` |
| `courses.ts` ders ucu | `!lesson.course.published → 404` | `!(published \|\| parentArchived) → 404` |

`isArchived` hesabı guard'ın **önüne** alındı (önce tanımlanıp sonra kullanılıyordu).

Taslak sızıntısı yok: DRAFT (`published=false, archivedAt=null`) hâlâ 404. Ders ucu ayrıca zaten `enrollment` şartı arıyor (kayıtsız kullanıcıya 403), yani arşiv erişimi kendiliğinden o kursa kayıtlı kullanıcıyla sınırlı.

Yanıt sözleşmesi değişmedi — `archived` ve `archivedAt` alanları zaten dönüyordu; yeni paralel uç açılmadı.

**Frontend:** `CoursePlayerPage` arşivli kursta sakin bir durum notu gösteriyor ("Bu kurs artık aktif katalogda yer almıyor. İçeriğe ve ilerlemene erişmeye devam edebilirsin."). İçerik, ilerleme ve geçmiş aynen korunuyor; yeniden tasarım yapılmadı.

**Regresyon taraması:** `learnerDashboard.ts:124`'teki legacy dalı `isLegacyCourseTitle` ile korunuyor — desen yalnız `[...kopya...]` başlıklarını yakalıyor ve 288 legacy kursun **yalnız 1'i** bu desene uyuyor. Phase B sonrası bu dal genişlemiyor.

## 8. Search / catalog koruması — uyumlu

| Yol | Filtre | Sonuç |
|---|---|---|
| Kurs kataloğu | `courses.ts:17` → `{ published: true, archivedAt: null }` | Arşivlenen legacy düşer ✅ |
| Global arama (kurs) | `knowledge-v2.ts:838` → `{ published: true, archivedAt: null }` | Arşivlenen legacy düşer ✅ |
| Bilgi araması | `knowledge.ts:16-18` → `status:'published', isDemo:false, NOT startsWith 'CANON-'` | Canonical KO aramada çıkmıyor (tasarım) ✅ |
| Bozuk/legacy KO | 5 NULL-code KO `status='archived'` | `status:'published'` filtresi dışlıyor ✅ |

Canonical kurslar `published=true, archivedAt=null` olduğu için aktif katalogda kalır.

## 9. Idempotency

Hedef sorgusu `archivedAt: null` koşulunu taşıdığı için ikinci koşu kendiliğinden boşalıyor:

| Koşu | Planlanan mutasyon |
|---|---:|
| 1. apply | 288 |
| 2. apply (hipotetik) | **0** — safe no-op |

## 10. Script

`scripts/content-migration-phase-b.ts` oluşturuldu. **Varsayılan dry-run**; `--apply` verilmeden yazma yapmıyor.

Güvenlikler:
- Gate'ler apply sırasında **transaction içinde yeniden** çalışır (dry-run ile apply arasında veri değişmiş olabilir).
- Hedef kümede canonical bulunursa `throw` → transaction rollback.
- Yazma sonrası canonical aktif sayısı 38 değilse `throw` → rollback.
- Canonical hariç tutma NULL-safe.
- Gate başarısızsa apply hiç başlamaz (`process.exitCode = 1`).

Dry-run çalıştırıldı; tüm 7 gate geçti ve DB değişmedi (arşivli kurs 0, canonical aktif 38, Enrollment 57, 326/1208/993 sabit).

## 11. Apply sonrası post-verify planı (henüz çalıştırılmadı)

- Legacy Course: `published=false` **ve** `archivedAt != null` → 288
- Canonical Course: 38 aktif, `archivedAt` NULL
- Total Course / Lesson / KO: 326 / 1208 / 993 **değişmemiş**
- Kullanıcı geçmişi: 8 tablonun satır sayısı **ve ID hash'i** yukarıdaki tabloyla birebir aynı
- Delete: 0 · Canonical mutasyon: 0
- API smoke: kurs kataloğu yalnız canonical döndürüyor · canonical Course Player açılıyor · "devam et" çalışıyor · karar/hesaplama CTA'sı çalışıyor
- **Ek smoke (bloker nedeniyle):** legacy kursa kayıtlı bir kullanıcı kendi kurs geçmişini açabiliyor mu

---

## 12. Erişim semantiği testleri

`tests/archived-course-access.test.ts` — **15 test**, A–G senaryolarının tamamı.

| # | Senaryo | Sonuç |
|---|---|---|
| A | ACTIVE: detay 200, ders 200 | PASS |
| B | DRAFT: detay 404, ders 404 (taslak sızmıyor) | PASS |
| C | ARCHIVED: detay 200, ders 200, `archived:true`, enrollment+ilerleme yanıtta | PASS |
| D | ARCHIVED katalogda yok, ACTIVE var | PASS |
| E | ARCHIVED global aramada yok, ACTIVE var | PASS |
| F | Okuma uçları enrollment satırlarını değiştirmiyor | PASS |
| G | Canonical aktif kurs regresyonu (detay/ders/katalog) | PASS |

**Testlerin diş taşıdığı kanıtlandı:** guard geçici olarak eski haline çevrildiğinde C bloğundaki 4 test düştü (`detay 200 döner`, `archived bayrağı`, `enrollment korunur`, `ders 200 döner`); dosya hemen geri alındı ve 15/15 tekrar geçti.

## Final

```text
PHASE B PRE-FLIGHT

Total courses:                       326
Canonical courses:                    38
Legacy courses:                      288

Legacy archive targets:              288   (67 aktif + 221 taslak)
Already archived legacy:               0
Unexpected legacy states:              0

Canonical courses in target set:       0

Lessons planned for update:            0
KOs planned for update:                0
Shared KOs planned for mutation:       0

Deletes planned:                       0
Hard deletes planned:                  0
Relation deletes planned:              0
Progress remaps planned:               0

Current user-history rows:           139
  Enrollment            57
  DecisionCheckSession  46
  LessonProgress        14
  FormulaCalculation     7
  KnowledgeProgress      6
  ActivityEvent          5
  QuizAttempt            3
  TaskAssignment         3
User-history rows planned for mutation: 0

Legacy null-code KOs:                  5   (id 621-625)
Null-code KOs touched:                 0

4 inconsistent KOs touched:            0   (id 106, 196, 626, 627)

Idempotency:
Second-run planned mutations:          0

ERİŞİM SEMANTİĞİ
Archived Course detail access:       PASS
Archived Lesson access:              PASS
Draft Course still hidden:           PASS
Archived Course catalog hidden:      PASS
Archived Course search hidden:       PASS

DOĞRULAMA
Backend tests:   88 dosya / 1315 test PASS
Frontend tests:  28 dosya / 201 test PASS
Frontend build:  SUCCESS
Typecheck:       CLEAN
Dry-run gates:   7/7 PASS
DB after dry-run: DEĞİŞMEDİ (arşivli kurs 0, 326/1208/993, Enrollment 57)

Safe for Phase B apply: YES

BLOCKERS:
NONE
```

**Karar:** veri tarafı zaten temizdi; tek engel olan okuma yolu tutarsızlığı giderildi ve testle kilitlendi.

Apply sırasında beklenen davranış: 288 legacy kurs katalogdan ve aramadan düşer, ama o kurslara kayıtlı **49 enrollment** (27'si hâlen aktif kurslarda) ve **13 LessonProgress** kaydı doğrudan adresten erişilebilir kalır; kullanıcı arşiv notunu görür, ilerlemesi sıfırlanmaz.

**APPLY ÇALIŞTIRILMADI. Onay bekleniyor.**
