# CANONICAL TAB PATCH — UYGULAMA RAPORU

**Tarih:** 2026-08-17T12:09:18.604Z
**Uygulama modu:** apply
**Kapsam:** Yalnız canonical-v1 (38 ders) `knowledge_object.content` + JSON artifact. Legacy verisine dokunulmadı. Phase B çalıştırılmadı. Progress remap yapılmadı. git add/commit/push yapılmadı.

## Kök Neden
`transformed-courses-combined.json` içindeki tek-backslash LaTeX escape'leri (`\text`, `\times`, `\right`) JSON.parse sırasında TAB (U+0009) / CR (U+000D) kontrol karakterlerine dönüşüyordu. Phase A import bu bozuk içeriği DB'ye yazdı; KaTeX `ext{ TL}` çöpünü gösteriyordu.

## Yapılan Değişiklikler (apply)
- DB: 281 TAB → `\`, 8 CR → `\`, 1 "虹" → silindi (yalnız CANON-COURSE-% içeriği).
- JSON artifact: tek-backslash escape'ler cift-backslash'a cevrildi (yeniden import DEĞİL).

## Sonuç Durumu
- Canonical kurs sayısı: 38
- Canonical KO sayısı: 38
- Legacy KO sayısı (dokunulmadı): 950
- DB kalan bozuk karakter: 0 (TAB=0, CR=0, stray=0)
- DB doğru LaTeX komutu: 461 (\text / \times / \right)
- JSON artifact parse kontrolü: 0 bozuk karakter

## Sonuç
- Patch durumu: PASS
- Son gorsel QA icin guvenli: EVET
