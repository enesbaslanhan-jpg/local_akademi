# DIG 5 KO Pilot Import — Preview Report

## Status: VALID (Ready for Commit Approval)

| Metric | Value |
|---|---|
| valid | true |
| totalRows | 5 |
| wouldCreate | 5 |
| wouldUpdate | 0 |
| errors | 0 |

## KO List

| Index | Code | Slug | Type | Category | Review Gate | Sources | Status |
|---|---|---|---|---|---|---|---|
| 0 | DIG-MATURITY-001 | dijital-olgunluk-degerlendirme | concept | Dijitalleşme ve Teknoloji | standard | 3/3 matched | draft |
| 1 | DIG-TOOL-001 | dijital-arac-secimi | procedure | Dijitalleşme ve Teknoloji | standard | 2/2 matched | draft |
| 2 | DIG-DATA-001 | veri-yonetisimi | concept | Dijitalleşme ve Teknoloji | requires_professional_approval | 2/2 matched | draft |
| 3 | DIG-CYBER-001 | siber-guvenlik-temelleri | procedure | Dijitalleşme ve Teknoloji | requires_professional_approval | 2/2 matched | draft |
| 4 | DIG-AI-001 | yapay-zeka-kobi-firsatlari | concept | Dijitalleşme ve Teknoloji | requires_professional_approval | 2/2 matched | draft |

## Source Match Summary

- DIG-MATURITY-001 → TÜBİTAK ✅, Sanayi Bakanlığı ✅, KOSGEB ✅
- DIG-TOOL-001 → ISO Araç Seçim ✅, KOSGEB ✅
- DIG-DATA-001 → TÜBİTAK BİLGEM ✅, CB Dijital Ofis ✅
- DIG-CYBER-001 → ENISA ✅, ISO/IEC 27001 ✅
- DIG-AI-001 → Avrupa Komisyonu ✅, OECD ✅

## Category Match

All 5 KOs → `dijitallesme-teknoloji` ✅

## Fields Verified

- [x] code — all specified (no auto-generated for professional KOs)
- [x] slug — all unique, no DB conflicts
- [x] type — all valid (`concept`, `procedure`)
- [x] status — all `draft`
- [x] isDemo — all `false`
- [x] verificationStatus — all `source_verified`
- [x] version — all `1`
- [x] publishedAt — all `null`
- [x] categorySlug — resolves to existing Category
- [x] sources — all reference existing Source Registry entries
- [x] reviewGate — appropriate per content risk level

## Database State

- KO count before preview: 600
- KO count after preview: 600
- Preview did not create any database records ✅

## Next Steps

1. User reviews and approves the preview
2. POST to `/api/v2/admin/knowledge-objects/import/commit` with the same JSON
3. After commit, add companion content (quiz/task) from `DIG_5_KO_Pilot_Companion_Content.json`
