# CANONICAL CONTENT FIDELITY QA — RAPOR

**Tarih:** 2026-08-17
**Kapsam:** 38 canonical ders — markdown gövdesi ile structured bileşen çıktıları arasındaki içerik sadakati.

## 1. Veri Bozukluğu Onarımı (Kök Neden)

- **TAB/CR patch'i** (`apply-canonical-tab-patch.ts`): 281 TAB + 8 CR → `\`, 1 stray `虹` silindi. Kontrol karakterleri temizlendi.
- **EKSPİK YAKALANDI:** TAB/CR patch'i, JSON escape'inin yuttuğu **harfi** geri getirmiyordu — DB'de hâlâ 289 bozuk komut vardı: `\ext` (252), `\imes` (29), `\ight` (8). Kullanıcının gördüğü `ext{ TL}` çöpünün asıl kaynağı buydu (patch raporundaki "461 doğru komut" sayısı yalnız zaten doğru olanları saymıştı).
- **Komut onarımı** (`apply-canonical-command-repair.ts --apply`): `\ext`→`\text`, `\imes`→`\times`, `\ight`→`\right`. Pre-flight: DB'de çift-backslash yok (0), bozuk komut bağlamları standart LaTeX (0 anormal) — onarım deterministik. 14 ders, tek transaction.
- **Son durum:** DB'de 0 kontrol karakteri, 0 bozuk komut, 750 doğru komut (text=646, times=91, right=13). Legacy (950 KO) dokunulmadı. Yeniden import YOK.
- **Render savunması:** `repairLaTeXEscapes()` artık TAB/CR + eksik harf kalıplarını da onarır (`splitCanonicalMarkdown` girişinde uygulanır).

## 2. Parser Doğrulaması (`prisma/_qa-parser-verify.mjs`)

| Kontrol | Sonuç |
|---|---|
| Karar aracı kartı (3. bölümden) | 35/38 — eksik: 015, 017, 019 (yalnız hesaplama referansı; metadata kodundan title-only kart üretilir, içerik uydurulmaz) |
| Kart başlığı (gerçek markdown'dan) | 23/35 — geri kalanlar metadata `decisionToolCode` + `DECISION_TOOL_TITLES`'tan |
| "Bu araçta" adımları | 18/38 (listesi olan tüm dersler) |
| Formül kartları (4. bölüm) | 38/38 (mathBlock: 38 ana + 24 örnek) |
| Hata/Doğru kartları | 38/38, wrong+correct çifti 38/38 |
| Formül→Hesaplama CTA eşleşmesi | 25 FOUND (single-candidate + dice≥0.35 + marj≥0.15; sahte CTA üretilmez) |

Düzeltilen parser hataları: `**X** içerisindeki **Y (DC-…)**` deseninde tüm segmentin başlığa yapışması (son `**…**` segmenti alınır), Türkçe noktalı büyük İ'nin regex `/i` ile eşleşmemesi (COURSE-035 "İş Akışı" adımları kayboluyordu).

## 3. UI Değişiklikleri

- `CanonicalLessonSections.jsx`: yeni karar aracı kartı (eyebrow "KARARINI TEST ET", gerçek başlık, bağlam, "Bu araçta" adımları, "Sonuç: gerekçeli karar fişi", `/app/decision-checks/{code}` CTA, ek DC kodları ikincil buton), gerçek hesaplama CTA satırları, KaTeX'li formül kartları (FORMÜL/ÖRNEK/YORUM + kart bazında `[ Hesaplamayı Aç → ]`), hata/doğru kartları (YAYGIN HATA / DOĞRU YAKLAŞIM + metadata `common_mistake` title'ı).
- `CoursePlayerPage.jsx`: canonical derslerde jenerik "Uygulama Kutuları" (EmbeddedPracticeBlock) kaldırıldı; içerik yalnız tam sadakat kartlarında. `embeddedPracticeBlocks` bileşene geçirildi.

## 4. Test ve Build

- Frontend unit test: **191/191 PASS** (canonicalContent: +23 yeni test — repair, decision parse, formula/example parse, practice cards, CTA eşleştirme).
- Frontend production build: **PASS** (mevcut chunk boyutu uyarıları dışında).
- API smoke (canonical içerik servisi): CANON-001/021/032 — TAB/CR yok, bozuk komut 0, doğru komutlar yerinde.

## 5. Manuel QA Kontrol Listesi (CANON-001 / CANON-021 / CANON-032)

1. CANON-001 "Gerçek Birim Maliyet": gövdede formüller doğru render (`\text{TL}` çöpü yok); karar kartı "Ürünüm Gerçekten Kârlı mı?" + 3 analiz adımı + CTA; formül kartında formül + hata/doğru çifti.
2. CANON-021 "Şirket Kurulumu": karar kartı başlığı "Hangi şirket türü bana uygun?" (markdown'da DC kodu yok — metadata'dan), vergi yükü formülü + örnek hesaplama render.
3. CANON-032 "Döviz Pozisyonu": karar kartı "Nakit akışım riskli mi?" (metadata'dan), formül kartı + hesaplama CTA'sı.

## 6. Kısıtlar

Legacy verisine dokunulmadı (950 KO). Yeniden import, Phase B, progress remap yapılmadı. git add/commit/push yapılmadı.
