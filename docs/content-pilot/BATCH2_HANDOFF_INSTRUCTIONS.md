# LocalAkademi — Batch 2 Entegrasyon Talimatı (başka bir AI için hazırlanmıştır)

Bu doküman, Batch 1'i (Ders 2, 3, 4, 5, 8, 10, 12, 15, 17) tamamlamış olan bir önceki
oturumun bulgularını ve kurduğu mekanizmayı özetler. Sen (bu talimatı alan model) Batch 2'yi
yapacaksın: **Ders 1, 6, 7, 9, 11, 13, 14, 16, 18, 19**.

Kod değiştirmeden önce bu dokümanın TAMAMINI oku. Varsayımda bulunma — her iddiayı
kendi ortamında (DB sorgusu, dosya okuma) doğrula; burada verilen ID/kod numaraları
yazıldığı andaki gerçek DB durumudur ama sen çalışırken değişmiş olabilir.

## 0. Proje ve ortam

- Kök dizin: `C:\Users\bugrz\Documents\Codex\2026-07-19\new-chat\outputs\LocalAkademi_fixed`
- Backend: `npm run dev` (kökten) → `http://localhost:3000`, Fastify + Prisma + PostgreSQL
  (docker konteyneri `localakademi-postgres`, zaten çalışıyor olmalı — `docker ps` ile kontrol et).
- Frontend: `cd frontend && npm run dev` → `http://localhost:5173`, React + Vite.
- Demo kullanıcı: `student@localakademi.com` / `student123` (bkz. `prisma/seed.ts`).
- **Kaynak ders dosyası**: `kurs-yeni-extracted.txt` (proje kökünde, RTF'den düz metne
  çevrilmiş — orijinal RTF `C:\Users\bugrz\Desktop\kurs yeni.rtf`). Bazı ilk harfler RTF
  dönüşümünde düşmüş olabilir (ör. "anka Kredisi" = "Banka Kredisi") — bağlamdan düzelt.
- **Commit/push YAPMA.** Kullanıcı açıkça istemedikçe hiçbir git işlemi yapma.

## 1. Kullanıcının kesin kuralları (aynen geçerli)

1. Model Laboratuvarı: çoklu senaryo, duyarlılık, NPV/IRR/WACC ve ileri analiz için.
2. Finans Merkezi: hızlı tek hesap, günlük işletme kontrolü, kısa sonuç için.
3. Aynı konu iki yerde varsa: hızlı hesap → Finans Merkezi birincil, senaryo analizi →
   Model Laboratuvarı birincil. Gerçekten farklı işlev sunuyorlarsa ikisi de ayrı, açık
   etiketli buton/link olarak gösterilebilir.
4. **KARAR ARACI BAĞLANTISI KONUSUNDA ÇOK ÖNEMLİ**: Kullanıcı yalnızca şu 7 eşleştirmeyi
   açıkça onayladı (Batch 1 kapsamında, zaten yapıldı): Ders2→DC-STOCK-011,
   Ders3→DC-HIRE-006, Ders4→DC-BRANCH-009, Ders5→DC-LOAN-007, Ders8→DC-LOAN-007,
   Ders10→DC-CAMPAIGN-010, Ders15→DC-STOCK-011. **Batch 2'deki (1, 6, 7, 9, 11, 13, 14,
   16, 18, 19) hiçbir ders için kullanıcı yeni bir Karar Aracı eşleştirmesi ONAYLAMADI.**
   Bu yüzden: Batch 2'de YENİ bir Karar Aracı bağlantısı EKLEME — sadece raporla
   ("Bu ders için mevcut Karar Araçlarından uygun/onaylı biri yok"). TEK İSTİSNA: eğer
   ders içeriği zaten var olan bir taslaktan geliyorsa ve o taslak metninde ZATEN kalın
   yazıyla (`**Aracın Tam Başlığı**`) bir karar aracına atıf varsa (bkz. aşağıda 18, 19,
   1 numaralı dersler), bunu SADECE gerçek bir markdown linkine çevirebilirsin (yeni bir
   eşleştirme icat etmiyorsun, zaten metinde var olan referansı çalışır hale getiriyorsun
   — Batch 1'de Ders 4'te aynı şeyi yaptık). Emin değilsen eklemeden bırak ve raporla,
   kullanıcıya sor.
5. Karar Aracının kapsamadığı işlevi buton başlığında vaat etme. Yeni/sahte Karar Aracı
   veya route uydurma.
6. Ders içeriklerini yeniden yazma — sadece biçimlendir (bkz. 4. bölüm) ve sona CTA linki ekle.
7. Hukuki/mevzuat konularında (Ders 6, 7, 9, 18, 19 ağırlıklı) kesin teşhis/tavsiye üretme;
   kaynak metindeki "mali müşavir/hukuk danışmanına başvurun" uyarılarını koru.
8. Practical Card'lar: metni tekrarlamasın, hesap/kontrol/hata/uygulanabilir kayıt üretsin.
   Ders 11 için 1 kart, diğerleri için 2 kart (kullanıcının önceki onayı, Batch 1'dekiyle aynı mantık).
9. Her bağlantıyı gerçek route/model/formül koduyla doğrula (aşağıda tam liste var).
10. Masaüstü ve mobil tarayıcı doğrulaması iste/yap (bu oturumda kullanıcı tarayıcı
    doğrulamasını atlamayı seçti — sen kendi ortamında Playwright ile yapabilirsin, bkz. 7. bölüm).
11. Teslimatta önceki formatla aynı tablo ver (bkz. 8. bölüm).

## 2. Batch 1'de kurulan GERÇEK mekanizma (aynen kullan, değiştirme)

### 2.1. "Buton" aslında ders metnine gömülü gerçek bir markdown linkidir

`frontend/src/pages/KnowledgeDetail.jsx` ders içeriğini (`ko.content`) `ReactMarkdown` ile
render ediyor. **`metadata.decisionToolLinks` gibi alanlar hiçbir yerde buton olarak
render edilmiyor** — bunlar sadece dokümantasyon amaçlı, işlevsiz JSON alanları (yine de
tutarlılık için ekleyebilirsin, zarar vermez, ama tek başına yeterli değil). Gerçek
çalışan "buton", ders metninin sonunda `## Kaynaklar` başlığından hemen önce eklenen
şöyle bir blockquote'tur:

```markdown
> Bu kararı **[Buton Metni](/app/decision-checks/DC-XXX)** karar aracıyla doğrulayın.
>
> Senaryo analizi için Model Laboratuvarı'ndaki **[Model Adı](/app/finance/models/MODEL_KODU)** modelini kullanabilirsiniz.
>
> Hızlı kontrol için **[Finans Merkezi'nde Formül Adı](/app/tools?tool=formul_id)** aracı kullanılabilir.
```

Bu üç route gerçek ve doğrulanmıştır:
- `/app/decision-checks/DC-XXX` → `DecisionCheckSession.jsx`, kod `DC-` ile başlıyorsa
  otomatik yeni oturum başlatıyor (bkz. `frontend/src/pages/DecisionCheckSession.jsx`).
- `/app/finance/models/MODEL_KODU` → `FinancialModelWorkspace.jsx`.
- `/app/tools?tool=formul_id` → `ToolsPage.jsx`, `?tool=` query param'ını okuyup ilgili
  formülü otomatik seçiyor (bkz. `ToolsPage.jsx` satır ~140, `searchParams.get('tool')`).

### 2.2. "Practical Card" aslında gerçek `PracticalCard` DB tablosudur, KO metadata'sı DEĞİL

**ÖNEMLİ TUZAK (Batch 1'de bu hataya düşüldü, tekrarlama):** `src/services/embedded-practice-blocks.ts`
dosyasındaki `getEmbeddedPracticeBlocksForKnowledgeObject()` fonksiyonu önce
`PracticalCardKnowledgeObject` tablosundaki gerçek bağlantıları arar. Eğer bir KO'nun
gerçek `PracticalCard` bağlantısı varsa, `metadata.embeddedPracticeBlocks` JSON alanı
TAMAMEN GÖZ ARDI EDİLİR (fallback'e hiç düşülmez). O yüzden:

- **Kart eklemek için KO metadata'sını DEĞİL, gerçek `PracticalCard` + `PracticalCardVersion`
  + `PracticalCardKnowledgeObject` satırlarını oluştur.** Örnek script:
  `scripts/add-batch1-practical-cards.js` ve `scripts/add-batch1-new-lesson-cards.js`
  (bu oturumda yazıldı, dosyalar hâlâ repoda duruyor) — AYNI ŞABLONU KULLAN, sadece
  `CARDS` dizisini Batch 2 içeriğiyle değiştir.
- Geçerli `PracticalCard.type` değerleri: `checklist`, `quick_formula`, `pricing_check`,
  `example_calculation`, `comparison`, `cash_flow_warning`, `common_mistake`. `contentJson`
  şeması: `{ mainContent, formula, example, warning, keyTakeaway, checklistItems: string[],
  primaryAction?: { code, label } }`.
- `primaryAction.code` yalnızca şu whitelist'teyse bir Karar Aracı butonuna dönüşür
  (`PRIMARY_ACTION_TO_DECISION_CHECK` haritası, `embedded-practice-blocks.ts` içinde):
  `open_profitability_check→DC-PROFIT-001`, `open_decision_check→DC-CAMPAIGN-010`,
  `open_marketplace_check→DC-MARKETPLACE-004`, `open_cashflow_check→DC-CASHFLOW-008`,
  `open_loan_check→DC-LOAN-007`, `open_branch_check→DC-BRANCH-009`,
  `open_pattern_check→DC-CONTINUE-012`, `open_interpretation_check→DC-CONTINUE-012`,
  `open_problem_statement→DC-CONTINUE-012`, `open_segment_score→DC-CAMPAIGN-010`,
  `open_segment_card→DC-CAMPAIGN-010`, `open_experiment_card→DC-CAMPAIGN-010`,
  `open_assumption_check→DC-CAMPAIGN-010`. Bu listede olmayan bir kod (`open_stock_check`,
  `open_hire_check` gibi) YOK — bu **rapor edilmesi gereken eksik bir sistem özelliği**.
  Kural 4 gereği Batch 2'de zaten yeni Karar Aracı eşleştirmesi eklemeyeceğin için bu
  genelde sorun olmayacak; ama Ders 18/19 gibi zaten var olan taslaklarda mention varsa
  ve o kod whitelist'te değilse, `primaryAction` EKLEME — sadece ders metnindeki markdown
  linkini kullan (buton işlevini o karşılar).

### 2.3. Ders içeriği/Course/Lesson/KO oluşturma şablonu

`scripts/create-batch1-new-lessons.js` dosyasına bak (repoda duruyor) — Course, Lesson,
KnowledgeObject üçlüsünü nasıl oluşturduğunu birebir gösteriyor. Aynı metadata şemasını
kullan:

```js
{
  category, subcategory, level: 'Orta', tags: [...], version: '1.0',
  source: 'LocalAkademi Pilot v5 — kurs yeni.rtf kaynağından biçimlendirme',
  generatedFrom: 'kurs-yeni-rtf-2026-08-06', editorialState: 'owner-approved-final',
  qualityStandard: 'manual-pilot-v5', curriculumCourseSlug, teachingMode: 'field-guide-long-form',
  metric, learningArtifact, sourceCheckedAt: '2026-08-06', estimatedMinutes: 15, duration: '15',
  countryCode: 'TR', language: 'tr', decisionToolLinks: [...], modelLabLinks: [...], financeToolLinks: [...]
}
```

KO alanları: `type: 'procedure'`, `status: 'published'`, `verificationStatus: 'verified'`,
`reviewGate: 'standard'`, `code: 'CUR-XXX-01'`, `slug: 'cur-xxx-01'` (küçük harf).

Course alanları: `sourceType: 'curated-pilot-v5-source-doc'`, `published: true`,
`slug: 'v5-...'` (kebab-case), `level: 'uygulamalı'`.

## 3. Batch 2 ders envanteri — hangileri DB'de VAR, hangileri YOK

**Bu tabloyu kendi ortamında yeniden doğrula** (`node` ile aşağıdaki gibi bir sorgu çalıştır,
proje kökünden):

```js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.knowledgeObject.findMany({ where: { code: { in: ['CUR-121-01','CUR-121-02','CUR-121-03','CUR-121-04','CUR-122-02','CUR-123-01'] } } }).then(r => console.log(r.map(k=>[k.code,k.title])));
```

| Ders | Başlık | Kaynak satır aralığı (kurs-yeni-extracted.txt) | DB durumu |
|---|---|---|---|
| 1 | Vitrin ve Mağaza İçi Satışı Artır | 1–154 | **VAR** — KO `CUR-123-01` (id ~1035), Course 423 "Vitrin ve Mağaza İçi Satışı Artır" |
| 6 | Melek Yatırımcıya Hazır mıyım? | 811–957 | YOK — oluşturulacak |
| 7 | Ortaklık Teklifini Değerlendir | 958–1143 | YOK — oluşturulacak |
| 9 | Şikâyeti Kayba Dönüştürmeden Yönet | 1350–1559 | YOK — oluşturulacak. **DİKKAT**: DB'de "Müşteri Şikâyeti Yönetimi" adında BAŞKA bir kurs var (Course 151, `KBX-SAL-008-*` kodları, published=false) — bu FARKLI/eski bir içerik, kurs-yeni.rtf kaynaklı DEĞİL. Onunla karıştırma, yeni bir CUR kodu ile ayrı oluştur. |
| 11 | Yorum ve İtibar Yönetimi | 1790–1969 | YOK — oluşturulacak. Kaynak metinde ayrı "Kaynaklar" bölümü net değil, en yakın atıfları kullan, gerekirse "kaynaklar ayrıca doğrulanmalı" notu ekle. |
| 13 | POS ve Kasa Yazılımı Nasıl Seçilir? | 2194–2429 | YOK — oluşturulacak |
| 14 | Muhasebe Yazılımına Geçmeli miyim? | 2430–2632 | YOK — oluşturulacak |
| 16 | Entegrasyon mu, Manuel Süreç mi? | 2852–3115 | YOK — oluşturulacak |
| 18 | Devren Satın Almada Hukuki, Mali ve Operasyonel Risk Tespiti | 3302–3525 | **VAR** — Course 419 "Var Olan İşletmeyi Devralmadan Önce Kontrol Et", 4 ayrı ders: KO `CUR-121-01..04` (id 1028-1031). Bu kurs aslında `docs/content-pilot/isletmeyi-devralmadan-once-kontrol-et.md` taslağından geldi (kurs-yeni.rtf'in bir versiyonu/öncülü) — içerik zaten yayında, RTF'deki 3302-3525 aralığıyla birebir aynı olmayabilir, ÖNCE MEVCUT İÇERİĞİ OKU, RTF ile karşılaştır, çelişki varsa kullanıcıya sor, RTF'e göre YENİDEN YAZMA. |
| 19 | Franchise Almalı mıyım? | 3526–3583 | **VAR** — KO `CUR-122-02` (id 1033), Course 421 "Franchise Almalı mıyım?" |

**Ders 18'in taslak dosyasında** (`docs/content-pilot/isletmeyi-devralmadan-once-kontrol-et.md`,
zaten DB'ye işlenmiş hâli) şu kalın-metin (link olmayan) referanslar var — bunları gerçek
linke çevirmek "yeni eşleştirme icadı" SAYILMAZ, zaten metinde onaylı olarak var:
- Ders 1: `**Kredi Taksitini Karşılayabilir miyim?**` → `/app/decision-checks/DC-LOAN-007`
- Ders 3: `**Nakit Akışım Riskli mi?**` → `/app/decision-checks/DC-CASHFLOW-008`
- Ders 4: `**Nakit Akışım Riskli mi?**` → `/app/decision-checks/DC-CASHFLOW-008`

Gerçek DB içeriğinde bu cümleler AYNEN duruyor mu, önce kontrol et (`node` ile KO 1028-1031
içeriklerini dump et), duruyorsa yalnızca linke çevir.

**Ders 1'de** (KO `CUR-123-01`) da benzer bir durum olabilir mi kontrol et — Batch 1'deki
Ders 2/3/4 örneğinde olduğu gibi zaten var olan içerikte kalın-metin bir karar aracı
ataması olup olmadığına bak.

## 4. Kaynak metni biçimlendirme kuralları (Batch 1'de kullanılan, aynısını uygula)

- `# Ders Başlığı` (H1), alt başlıklar `##` (H2).
- `\[ ... \]` LaTeX blokları düz metne çevrilir: `\frac{A}{B}` → `A ÷ B`, `\times` → `×`,
  `\%` → `%`. Sonuçta hiçbir `\[`, `\]`, `\frac`, `\text{` kalmamalı.
- Madde madde alt alta duran kısa ifadeler ya `- ` listesine ya da akıcı bir cümleye
  birleştirilir (kaynak metnin RTF dönüşümünde her cümlecik ayrı satırdaydı).
- İçerik ANLAMI/BİLGİSİ değiştirilmez, eklenmez, çıkarılmaz — sadece format temizliği.
- `## Bu dersten çıkacak çalışma kaydınız` ve `## Kaynaklar` başlıkları korunur.
- CTA blockquote'u en son, `## Kaynaklar`dan HEMEN ÖNCE eklenir (örnek yukarıda 2.1'de).

## 5. Referans: gerçek route/kod listeleri (uydurma yasak, sadece bunlardan seç)

**Karar Araçları** (`src/services/decision-tool-catalog.ts`) — Batch 2'de KULLANMA
(kural 4 gereği), sadece referans için: `DC-PROFIT-001, DC-DISCOUNT-002, DC-FREESHIP-003,
DC-MARKETPLACE-004, DC-ADS-005, DC-HIRE-006, DC-LOAN-007, DC-CASHFLOW-008, DC-BRANCH-009,
DC-CAMPAIGN-010, DC-STOCK-011, DC-CONTINUE-012`.

**Model Laboratuvarı** (`src/services/financial-models/registry.ts`, `code` alanı):
`CURRENT_RATIO, QUICK_RATIO, NET_WORKING_CAPITAL, DUPONT_3_STEP, PROFIT_TO_CASH,
CASH_CONVERSION_CYCLE, DIO, DSO, DPO, BREAK_EVEN_QUANTITY, CONTRIBUTION_MARGIN,
PRODUCT_PROFITABILITY, ORDER_PROFITABILITY, POST_RETURN_MARGIN, CAC, LTV, LTV_CAC,
CAC_PAYBACK, GROSS_BURN, NET_BURN, RUNWAY, NPV, IRR, WACC_FCFF_DCF`.

**Finans Merkezi** (`src/services/formulas.ts`, `id` alanı): `fiyat_mimarisi, kar_hesabi,
basabas_noktasi, nakit_pozisyonu, isletme_sermayesi, roi, stok_devir, cac, ltv, ltv_cac,
indirim_kar, kredi_maliyeti, ihracat_maliyet, kdv_ekleme, kasa_kapanis, nakit_dayanim,
birim_maliyet, vade_farki, pazaryeri_siparis_kari`.

### Önerilen (zorunlu değil, mantıklı) eşleştirmeler — sadece Model Lab / Finans Merkezi, Karar Aracı YOK:

- Ders 1 (Vitrin/Mağaza İçi Satış): Finans Merkezi `kar_hesabi`; Model Lab: uygun yok
  (m² verimliliği modeli sistemde yok — raporla).
- Ders 6 (Melek Yatırımcı): Model Lab `WACC_FCFF_DCF` (değerleme, ileri analiz);
  Finans Merkezi: uygun yok (yatırım turu hazır formül değil — raporla).
- Ders 7 (Ortaklık Teklifi): uygun yok / uygun yok (cap table hesaplayan bileşen sistemde yok — raporla).
- Ders 9 (Şikâyet Yönetimi): uygun yok / uygun yok (belirgin boşluk, raporla).
- Ders 11 (Yorum/İtibar): uygun yok / uygun yok (bilgi ağırlıklı ders, raporla).
- Ders 13 (POS/Kasa Yazılımı): Finans Merkezi `roi`; Model Lab: uygun yok.
- Ders 14 (Muhasebe Yazılımı): Finans Merkezi `roi`; Model Lab: uygun yok.
- Ders 16 (Entegrasyon mu Manuel mi): Finans Merkezi `roi`; Model Lab: `CONTRIBUTION_MARGIN` (zayıf/dolaylı ilişki, zorlama, gerekirse atla).
- Ders 18 (Devren Satın Alma — 4 ders): mevcut metindeki `DC-LOAN-007` / `DC-CASHFLOW-008`
  mention'larını linke çevir (yukarı bkz); Model Lab: uygun yok; Finans Merkezi: `nakit_pozisyonu`.
- Ders 19 (Franchise): Finans Merkezi `roi` (royalty/giriş bedeli toplam maliyeti); Model Lab: uygun yok.

Bunlardan herhangi biri sana "zorlama" gibi geliyorsa EKLEME, "uygun yok" diye raporla —
kullanıcının orijinal talimatı böyle: "yalnız gerçekten uygun ve çalışan mevcut bileşenleri bağla."

## 6. Kategori (Course.category / KO.categoryId) önerisi

Mevcut kategoriler arasından uygun olanı seç (yenisini SADECE hiçbiri uymuyorsa oluştur,
`prisma.category.create` ile — Batch 1'de "Finansman ve Kredi Yönetimi" ve "Pazarlama ve
Müşteri Sadakati" böyle oluşturuldu):
- Ders 1 → `Perakende ve Mağaza Yönetimi` (zaten var, id'yi DB'den çek)
- Ders 6, 7 → `girisimcilik` YAZIM STİLİ eski/lowercase, v5 pilot Title-Case istiyorsa yeni
  bir kategori gerekebilir, örn "Girişimcilik ve Yatırım Hazırlığı" — kullanıcıya sormadan
  makul bir isim seçebilirsin, kritik değil.
- Ders 9, 11 → `Satış ve Müşteri Yönetimi` (zaten var, id 10)
- Ders 13, 14, 16 → `Dijitalleşme ve Teknoloji` (zaten var, id 7)
- Ders 18, 19 → `İşi Satın Alma ve Yatırım Değerlendirmesi` (zaten var, id 22)

## 7. Tarayıcı doğrulaması (bu oturum atladı, sen istersen yap)

Repoda hazır bir Playwright şablonu var: `scripts/validate-operations-wave-2-browser.ts`.
JWT'yi `fast-jwt` ile imzalayıp `localStorage`'a yazarak login ekranını atlıyor,
`page.goto(...)`, `page.getByText(...)`, masaüstü (1280×800) ve mobil (375×667) viewport
karşılaştırması, `data-testid^="practice-block-"` sayımı yapıyor. Aynı şablonu Batch 2
KO/Lesson id'leriyle uyarlayabilirsin. Playwright zaten kurulu (`node_modules/.bin/playwright`).

## 8. Teslimat formatı (kullanıcının istediği, aynen kullan)

Her ders için:
- Ders adı ve gerçek KO kodu
- Course → Lesson ilişkisi (id'lerle)
- Bağlanan Karar Aracı (yoksa "—" ve gerekçe)
- Model Lab modeli (yoksa "—" ve gerekçe)
- Finans Merkezi formülü (yoksa "—" ve gerekçe)
- Practical Card kodları (2 adet, Ders 11 için 1 adet)
- Görünen buton/link etiketleri (ders içeriğindeki gerçek markdown link metinleri)
- Tarayıcı doğrulama sonucu (yaptıysan) veya "kod-seviyesinde doğrulandı, tarayıcı atlandı" notu
- Bağlantı kurulmadıysa gerekçesi

Commit/push YAPMA. Kod değiştirmeden önce kullanıcıdan onay bekleme gerekmiyor (bu talimat
zaten kullanıcının onayı sayılır) ama iş bitince mutlaka özet tabloyu sun.
