# Canonical Course Player Entegrasyonu — QA Raporu

**Tarih:** 15 Ağustos 2026 · **Kapsam:** Madde 1–3. Phase B, legacy archive, canonical re-import ve kaynak deep-link audit'i **yapılmadı.**

---

## Kök neden

`/app/knowledge/CANON-COURSE-xxx` bir yönlendirme hatası değildi. Phase A'da kanonik KO'lar `status: 'published'` yazıldığı için **Bilgi kataloğuna** girdiler; kullanıcı oraya `KnowledgeTopicPage`, `LearningPathPage` ya da Mentor'un `CitationBadge`'inden düşüyordu. `CoursesPage` zaten doğru şekilde `/app/courses/:id/learn`'e gidiyordu.

## 1. Routing + katalog ayrımı

| Değişiklik | Dosya |
|---|---|
| Kanonik KO'lar katalog listesinden çıkarıldı (admin için görünür kalır) | `src/services/knowledge-v2.ts` |
| Kanonik KO'lar aramadan çıkarıldı | `src/services/knowledge.ts` |
| KO detayı kanonik ders bağını döner (`canonicalLesson`) | `src/services/knowledge-v2.ts` |
| "Dersi Aç" CTA'sı | `frontend/src/pages/KnowledgeDetail.jsx` |

KO detayı **404 vermiyor**: mentor atfıyla gelen kullanıcı içeriği görebilmeli. Ekran referans olarak kalıyor, CTA asıl öğrenme deneyimine götürüyor. `CoursesPage` akışına dokunulmadı.

## 2. Canonical content renderer

`frontend/src/utils/canonicalContent.js` markdown'ı ayırır. Bölümler **numaraya değil başlık anlamına** göre yakalanır; numaralandırma derslere göre kayıyor.

- Gövde: 1. ve 2. bölümler
- Ayrılan: Karar Araçları Entegrasyonu · Pratik Bilgi Kartları · Doğrulanmış Resmî Kaynaklar

**Beklenmedik bulgu:** `[ Hesaplamalar > ... ]` referansları yalnız 3. bölümde değil, gövdenin ortasında da geçiyor (COURSE-021). Gövde satırlarından da temizlenip CTA olarak toplanıyor.

**Math:** Mevcut stack'te math desteği yoktu. 38 belgede 199 blok ve 87 `\frac` var — düz metne çevirmek finansal formülleri bozardı. `remark-math` + `rehype-katex` eklendi (KaTeX CSS dahil). Legacy dersler eski davranışta kalıyor: eklentiler yalnız kanonik derste devreye giriyor.

**Duplikasyon:** Uygulama kutuları ve kaynaklar Course Player'da zaten render ediliyordu. Kendi bileşenim onları tekrarlayacaktı — **kaldırıldı**, yalnız karar/hesaplama CTA'ları bende.

**Hata/Doğru kartı:** Kök neden Phase A'da yazdığım veriydi — açıklama hem `shortDescription` hem `content.mainContent`'e kopyalanmış, mevcut dönüştürücü de `correctApproach`'a aynısını atıyordu. Re-import yasak olduğu için düzeltme okuma katmanında (`src/services/embedded-practice-blocks.ts`): etiket varsa `wrong`/`correct` ayrılıyor, yoksa tek cümle yalnız "Yaygın Hata" tarafına yazılıyor. **Uydurma "doğru yaklaşım" üretilmiyor.**

## 3. Decision Tool + Calculation CTA

`decisionToolCode` metadata'sından gerçek CTA üretiliyor; `/app/decision-checks/:code` mevcut routing'i kullanılıyor. Markdown'daki DC-* kodlu ek referanslar ikincil buton oluyor.

### Calculation CTA mapping audit

39 referans (`CANONICAL_CALCULATION_CTA_AUDIT.json`):

| Durum | Adet |
|---|---:|
| FOUND | 29 |
| MISSING | 7 |
| AMBIGUOUS | 0 |
| DECISION_TOOL (hesaplama değil) | 3 |

MISSING olanlar katalogda gerçekten yok: Başabaş Noktası · Şirket Türü ve Vergi Optimizasyon Modeli · Şirket Değerleme Modelleri · Finansal Projeksiyon ve Senaryo Analizi · Döviz Pozisyonu ve Kur Riski · Tedarikçi Seçim Matrisi · Finansal Sağlık Dashboard. **Sahte route üretilmedi**; kullanıcı "Bu hesaplama henüz katalogda yok" görüyor.

Eşleştirmede iki tuzak vardı: `\b` sınırı Türkçe `ç`'den sonra çalışmıyor (JS'te ASCII dışı harf word-char değil) ve `ROI` gibi kısaltmalar Dice'ta 0.40'ta kalıyor. İkisi de giderildi.

---

## Final

```
Canonical KO hidden from knowledge catalog: YES
KnowledgeDetail "Dersi Aç" CTA: YES
Canonical Course Player integration: YES

Raw markdown leakage: 0
Raw LaTeX leakage: 0
Duplicate practice blocks: 0

Decision Tool CTA mappings: 38/38
Decision Tool CTA working: 38/38
COURSE-021 -> DC-TAX-013: PASS

Calculation CTA FOUND: 29
Calculation CTA MISSING: 7
Calculation CTA AMBIGUOUS: 0

Source duplication removed: YES

Frontend tests: 28 dosya / 161 test PASS
Build: SUCCESS

Visual QA pending login: NO
Safe to proceed to visual QA: YES
```

### Örnek QA sonuçları

| | CANON-001 | CANON-021 | CANON-032 |
|---|---|---|---|
| Course Player'da açılıyor | YES | YES | YES |
| Ham LaTeX | 0 | 0 | 0 |
| Ham markdown | 0 | 0 | 0 |
| Düz metin CTA | 0 | 0 | 0 |
| KaTeX elemanı | 4 | 8 | 0 (derste math yok) |
| Karar Aracı CTA | YES | YES (DC-TAX-013) | YES |
| Hesaplama CTA | 1 | fallback | — |
| Kaynaklar | 2 | 3 | 2 |
| AI Mentor | YES | YES | YES |

DC-TAX-013 uçtan uca doğrulandı: CTA → oturum açıldı → 12 radyo + 2 sayısal girdi + disclaimer + gönder butonu.

Koyu mod CANON-032'de ölçüldü: en kötü kontrast **14.21:1**.

---

## Kapsam dışı yaptıklarım

**Test hesabına 3 kayıt eklendi.** Course Player kayıtsız kullanıcıyı listeye atıyor; QA için `admin@localakademi.com` hesabıyla 439/459/470 kurslarına kaydolundu. Enrollment sayısı 47 → 50. Migration ile ilgisi yok, geri alınabilir.

**Backend süreci yeniden başlatıldı.** Çalışan sunucu benim değişikliklerimden önce başlamıştı ve izlemede değildi; backend düzeltmeleri yansımıyordu.

## Açık kalanlar

- **Kaynak deep-link audit'i** — ayrı tur, 80 kaynak URL'inin doğrulanması gerekiyor.
- **7 MISSING hesaplama** — katalogda karşılığı yok; ürün kararı gerekiyor (kataloğa eklensin mi, referans metinden çıkarılsın mı).
- Phase B legacy archive **çalıştırılmadı.**
