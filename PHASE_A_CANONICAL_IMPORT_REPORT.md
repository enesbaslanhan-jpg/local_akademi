# LocalKarar — Phase A Canonical Import Raporu

**Mod:** `apply` · **Durum:** `ALREADY_APPLIED` · **Tarih:** 2026-08-15T09:09:14.157Z

Phase B (legacy archive) **çalıştırılmadı** ve bu script kapsamında değildir.

## Pre-flight

| Kontrol | Değer |
|---|---|
| canonical_valid | true |
| canonical_records | 38 |
| duplicate_ids | 0 |
| duplicate_slugs | 0 |
| decision_tools_required | 13 |
| decision_tools_found | 13 |
| missing_decision_tools |  |
| legacy_courses | 288 |
| legacy_lessons | 1170 |

## Oluşturulan yapı

| Varlık | Adet |
|---|---:|
| courses | 38 |
| lessons | 38 |
| kos | 38 |
| koVersions | 38 |
| sources | 80 |
| sourceLinks | 80 |
| practiceCards | 76 |

Her canonical içerik **kendi KnowledgeObject'ini** aldı; legacy KO yeniden kullanılmadı. Pratik kartlar mevcut `embeddedPracticeBlocks` sözleşmesiyle KO metadata'sına yazıldı — paralel bir veri modeli oluşturulmadı.

## Legacy güvenliği

| | Önce | Sonra |
|---|---:|---:|
| Course | 288 | 288 |
| Lesson | 1170 | 1170 |
| KnowledgeObject | 950 | 950 |
| Arşivlenmiş Course | 0 | 0 |
| Tutarsız KO | 4 | 4 |

## Kullanıcı geçmişi

| Tablo | Önce | Sonra |
|---|---:|---:|
| Enrollment | 47 | 47 |
| DecisionCheckSession | 45 | 45 |
| LessonProgress | 12 | 12 |
| KnowledgeProgress | 6 | 6 |
| FormulaCalculation | 6 | 6 |
| ActivityEvent | 5 | 5 |
| QuizAttempt | 3 | 3 |
| TaskAssignment | 3 | 3 |

Silinen: **0** · Progress remap: **0**

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| canonical_courses | 38 |
| canonical_lessons | 38 |
| canonical_kos | 38 |
| canonical_ko_versions | 38 |
| canonical_source_links | 80 |
| canonical_practice_blocks | 76 |
| decision_tool_links_valid | 38 |
| dc_tax_013_valid | true |
| duplicate_canonical_slugs | 0 |
| legacy_courses_modified | 0 |
| legacy_lessons_modified | 0 |
| legacy_kos_modified | 0 |
| legacy_courses_archived | 0 |
| inconsistent_kos_untouched | true |

## Read-only smoke

| Kontrol | Sonuç |
|---|---|
| catalog_api_visible_canonical | 38 |
| course_detail_reads | true |
| lesson_content_present | true |
| sources_present | true |
| practice_cards_present | true |
| decision_tool_cta_resolvable | true |
| course_021_tax_link | true |
| course_021_slug | sirket-kurulumu-ve-vergi-planlamasi |

Legacy katalog bu fazda hâlâ aktiftir; bu beklenen durumdur.

## Gate

```text
PHASE A GATE

Apply mode used: apply
Canonical requested: 38
Canonical created: 38

Courses created: 38
Lessons created: 38
KOs created: 38
KO Versions created: 38
Sources created/linked: 80 / 80
Practice Cards created/linked: 76

Decision Tool links valid: 38/38
DC-TAX-013 valid: YES

Duplicate canonical slugs: 0

Legacy Courses modified: 0
Legacy Lessons modified: 0
Legacy KOs modified: 0
Shared KOs mutated: 0

User-history before: 127
User-history after: 127
User-history deletes: 0
Progress remaps: 0

API smoke tests: PASS

Phase A status: PASS

Safe to proceed to Phase B legacy archive: YES
```
