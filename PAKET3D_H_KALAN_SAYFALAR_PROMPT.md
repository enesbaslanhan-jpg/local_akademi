# LOCAL KARAR — KALAN TÜM SAYFALAR (3D – 3H)

Uygulamada tasarım dili henüz uygulanmamış tüm sayfaları, Ana Sayfa / Karar
Araçları / Kurslar'da kurulan sisteme geçirmek.

**ÇALIŞMA BİÇİMİ — ÖNEMLİ**

Bu dosya 7 gruba bölünmüştür. **Grupları sırayla, tek tek bitir.** Her grubun
sonunda `npm run build` + `npm test` çalıştır ve temiz olduğunu doğrula;
ancak ondan sonra bir sonraki gruba geç. Tüm grupları tek seferde açıp
karıştırma. Bir grup takılırsa orada dur, raporla, sonrakine geçme.

Backend, route, veri modeli ve API sözleşmesi DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

---

# ORTAK KURALLAR (her grup için geçerli)

## Renk

- Turuncu `#C1592B` → **sayfa başına en fazla BİR** ana CTA
  (`<Button variant="cta">`). Emin değilsen KULLANMA, teal kullan.
  Kart/satır başına tekrarlayan butonlar her zaman teal (`variant="primary"`).
- Bordo `#7A2E2E` → yalnızca risk, uyarı, hata, yıkıcı işlem.
- Zeytin `#3E5D50` → tamamlandı, başarılı, pozitif.
- Hardal `--warning` → orta seviye uyarı.
- Öncelik/risk skalası: Düşük yeşil, Orta turuncu, Yüksek bordo.
- "Çıkış Yap" nötr renk, bordo değil.
- **Sabit hex YAZMA**, hep `var(--token)`. Her dosyada mevcut hex'leri temizle.

## Yüzey ve hareket

- Koyu panel (`DarkPanel`): **sayfa başına en fazla 1**, çoğu sayfada 0.
  Geniş şeritte `bevel={false}`, dar kartta varsayılan. `sweep` yalnızca
  nadiren bakılan yüzeylerde.
- Glass YOK (mevcut izinli alanlar dışında: modal, drawer, mentor paneli,
  Model Lab parametre paneli).
- Kart hover en fazla `translateY(-2px)`, buton hover `-1px`, active `0.98`.
- **Yeni keyframe, yeni token, yeni ortak bileşen YAZMA.** Mevcutlar:
  `fadeSlideUp`, `fadeSlideIn`, `growIn`, `fichOpen`, `mirrorSweep`.

## Sayfa yapısı

- Sayfa içi görünür `h1` YOK. Üst barda sayfa adı zaten yazıyor.
  Erişilebilirlik için `<h1 className="sr-only">` bırak (kural Paket 3BC'de
  belirlendi, 7 sayfada uygulandı — aynısını yap).
- Sayfa tek satır açıklamayla açılsın (`--font-size-page-intro`).
- Üst boşluk dar tutulsun.

## İçerik

- **Sahte veri hardcode ETME.** Alan yoksa o satırı/kartı gösterme.
- Backend'in desteklemediği filtre, sıralama, sayaç, rozet UYDURMA.
- Yeni görsel, kapak resmi, stok görsel, avatar EKLEME.
- Tailwind EKLEME (projede kurulu değil, class'lar CSS üretmez).
- İçerik veya route SİLME. Admin görünümünü bozma. Mevcut işlevler kaybolmasın.
- Boş durumlarda `EmptyState` bileşenini kullan.

## Responsive

- Mobil ve masaüstü çalışsın, yatay scroll oluşmasın.
- Grid/flex zincirlerinde `min-width: 0`.

## Mevcut altyapı (yeniden yaratma, KULLAN)

`tokens.css` · `motion-glass-tokens.css` ·
`components/ui/` (Button, Card, Badge, Progress, EmptyState, Modal, Tabs,
Loading, DataTable, SearchBar, Input, Select, ConfirmModal, DarkPanel)

---

# GRUP 1 — Finans yüzeyi

Dosyalar: `pages/ToolsPage`, `pages/FinancialModelLibrary`,
`pages/FinancialModelWorkspace` (+ `.module.css`)

Kalan sabit hex: FinancialModelLibrary 18, FinancialModelWorkspace 46.

**ToolsPage (Finans Merkezi)**
- Üstteki dekoratif `hero` bandını sadeleştir: büyük başlık yok, eyebrow +
  tek satır açıklama + varsa gerçek bir metrik. Renkli bant kalabilir ama
  görsel ağırlığı azalsın.
- Formül kartları: koyu teal ikon karosu + başlık + tek satır açıklama +
  kategori rozeti. Seçili kart `--primary-light` zemin + sol ince teal çizgi.
- Hesaplama paneli: girdiler ızgarada, etiket üstte, yardım metni küçük.
- Sonuç kutusu: ana metrik büyük ve ayrı; destekleyiciler altta ızgarada;
  uyarı satırı bordo ailesinde.
- Geçmiş listesi: formül adı, tarih, ana sonuç.
- Ana CTA: **"Hesapla"** (tek turuncu). Koyu panel: 0 veya 1 (sonuç kutusu).

**FinancialModelLibrary**
- Kompakt açılış + küçük istatistik şeridi (koyu panel değil).
- Model kartları 3-2-1 ızgara: ikon karosu, ad, kısa açıklama, kategori ve
  seviye rozetleri, altta tek teal buton.
- Koyu panel 0, turuncu CTA 0.

**FinancialModelWorkspace**
- Yapıyı DEĞİŞTİRME, yalnızca görsel dile geçir.
- Gradyanlı `header` bloğunu düz `--white` karta çevir.
- Sekmelerde aktif olana ince teal alt çizgi.
- `.inputPanel` üzerindeki mevcut glass **KORUNACAK**.
- Güven rozeti: yüksek zeytin, orta hardal, düşük bordo.
- Metrik kartları `--white` + `--border`; anlam rengi yalnızca değerde.
- Kontroller: geçti zeytin ✓, kaldı bordo ✗.
- Renk eşlemesi: `#0f766e` → `--brand-ink`/`--brand-teal`,
  `#ecfdf5` → `--success-bg`, `#fef2f2`/`#991b1b` → `--danger-bg`/`--danger`.
- Ana CTA: **"Modeli Çalıştır"**. Koyu panel: en fazla 1.

**Grup sonu:** `npm run build` + `npm test`.

---

# GRUP 2 — İşletme Takibi (Workspaces)

Dosyalar: `pages/Workspaces/` altındaki 11 sayfa
(index/WorkspaceList, WorkspaceLayout, Overview, Tracker, Calendar, Documents,
Notifications, Team, Contacts, Settings, Activity) + `.module.css`

Not: Bu dosyalarda sabit hex neredeyse hiç yok (Calendar'da 2). Tanımsız
tokenlar önceki turda düzeltildi. Buradaki iş **kompozisyon**.

- **WorkspaceLayout**: sekme çubuğu tek satır, aktif sekmede ince teal alt
  çizgi, mobilde yatay kaydırılabilir. İşletme adı ve seçici üstte kompakt.
- **WorkspaceList**: işletme kartları ızgarada; her kartta ad, sektör rozeti,
  kısa özet, tek teal buton. Boş durumda `EmptyState` + "İşletme oluştur".
- **Overview**: Ana Sayfa'daki KPI şeridi diliyle özet kartları (etiket +
  değer + tek satır bağlam). Altında son kayıtlar ve yaklaşanlar listesi.
  Koyu panel: en fazla 1 (net durum kartı olabilir).
- **Tracker**: kayıt listesi. Her satırda: tür ikonu, başlık, kişi/kurum,
  tutar, vade tarihi, durum rozeti (açık/gecikmiş/tamamlandı → teal/bordo/
  zeytin), sağda aksiyon. Filtre satırı üstte tek satır.
- **Calendar**: ay ızgarası; günlerde kayıt sayısı rozeti; seçili gün
  `--primary-light`. Bugün ince teal çerçeve. Gecikmiş kayıt bordo nokta.
- **Documents**: dosya listesi — ikon, ad, tür, boyut, tarih, indir.
- **Notifications**: bildirim satırları — ikon, başlık, açıklama, göreli
  zaman; okunmamış olanlar `--primary-light` zeminli.
- **Team / Contacts**: kişi satırları — baş harf avatarı (renk tokenlarıyla,
  **fotoğraf değil**), ad, rol/e-posta, aksiyon.
- **Activity**: zaman çizgisi listesi — sol ince çizgi, her olayda ikon,
  metin, zaman.
- **Settings**: form düzeni; kaydet butonu teal; yıkıcı işlem varsa bordo.

Her sayfada turuncu CTA: **yalnızca sayfanın gerçek ana aksiyonu varsa**
(ör. Tracker'da "Yeni kayıt"). Emin değilsen teal.

**Grup sonu:** `npm run build` + `npm test`.

---

# GRUP 3 — Bilgi Nesneleri ve Öğrenme Yolu

Dosyalar: `pages/KnowledgePage` (28 hex), `pages/KnowledgeDetail` (77 hex),
`pages/KnowledgeTopicPage` (19 hex), `pages/LearningPathPage` (23 hex),
`pages/PilotLearningPathPage` (1 hex)

- **KnowledgePage**: arama + filtre tek satır; konu/nesne kartları ızgarada;
  her kartta tür rozeti, başlık, kısa açıklama, kategori. Boş durum
  `EmptyState`.
- **KnowledgeTopicPage**: konu başlığı + açıklama, altında o konuya ait
  nesne listesi (satır düzeni, durum ikonu + başlık + meta).
- **KnowledgeDetail**: ders oynatıcıyla **aynı okuma düzeni** —
  metin sütunu ~70ch, `--line-height-relaxed`, formül/örnek blokları
  `--bg-tertiary` + sol teal çizgi, kaynak listesi ikon + başlık + yayıncı.
  Gömülü pratik kart blokları korunsun. Sağ sütun varsa ilerleme +
  kazanımlar + kaynaklar.
  Koyu panel: en fazla 1 (üst başlık bloğu, `bevel={false}`).
- **LearningPathPage**: adım listesi dikey zaman çizgisi — her adımda durum
  ikonu (tamamlandı zeytin ✓ / sıradaki vurgulu / başlamadı soluk), başlık,
  açıklama, tahmini süre. Üstte genel ilerleme kartı.
- **PilotLearningPathPage**: aynı düzen; pilot istatistikleri Ana Sayfa'daki
  stat kartı diliyle.

Turuncu CTA: LearningPath'te **"Sıradaki adıma git"** (tek). Diğerlerinde 0.

**Grup sonu:** `npm run build` + `npm test`.

---

# GRUP 4 — Haberler, Ayarlar, AI Mentor

Dosyalar: `pages/CommunityPage` (37 hex), `pages/SettingsPage` (0 hex),
`pages/MentorPage`

- **CommunityPage (Haberler)**: akış düzeni — tek sütun, kart listesi.
  Her kartta: kategori rozeti, başlık, özet (2-3 satır), kaynak adı ve
  göreli zaman, varsa kaynak bağlantısı. Resmi/AI kaynaklı içerikler için
  küçük ayırt edici rozet. Üstte tür sekmeleri (Tümü / Haberler / Topluluk —
  backend `type` parametresini destekliyorsa).
  Koyu panel 0. Turuncu CTA: gönderi oluşturma varsa **tek** o.
- **SettingsPage**: bölümlere ayrılmış form (Hesap / İşletme / Bildirim /
  Güvenlik — mevcut yapıya sadık kal). Her bölüm ayrı kart, başlık +
  alanlar. Kaydet butonları teal. Hesap silme gibi yıkıcı işlem bordo ve
  ayrı bir bölümde. Koyu panel 0, turuncu CTA 0.
- **MentorPage**: Paket 2'de kabuk migre edilmişti; kompozisyonu hizala —
  sohbet listesi sol, mesaj alanı orta, bağlam üstte. Mesaj balonları
  `MentorMessageBubble` stillerini kullanıyor, dokunma. Koyu panel 0.
  Turuncu CTA 0 (gönder butonu teal).

**Grup sonu:** `npm run build` + `npm test`.

---

# GRUP 5 — Giriş akışı

Dosyalar: `pages/AuthPage`, `pages/OnboardingPage` (24 hex),
`pages/AssessmentPage` (32 hex)

- **AuthPage**: iki panelli düzen — solda koyu teal marka paneli
  (`BrandMark` + LocalKarar + tek satır slogan, **görsel yok**), sağda form.
  Form: e-posta, şifre, giriş/kayıt geçişi. Ana CTA turuncu (**tek**).
  Not: `.auth-form` çıplak `label`/`input` kullanıyor ve `main.css`'te
  `.auth-form` kapsamlı kuralla besleniyor — bozma.
- **OnboardingPage**: adım göstergesi üstte (1-2-3), her adımda tek kart,
  altta "Geri" (nötr) ve "Devam Et" (**son adımda turuncu, ara adımlarda
  teal**). Rol seçimi varsa seçilebilir kartlar, seçili olan teal çerçeve.
- **AssessmentPage**: soru kartı düzeni — soru metni, seçenekler (seçili
  `--primary-light` + teal çerçeve), altta ilerleme ve gezinme.
  Sonuç ekranı varsa: ana skor büyük, açıklama altında.

**Grup sonu:** `npm run build` + `npm test`.

---

# GRUP 6 — Uç durumlar ve legacy

Dosyalar: `pages/NotFound`, `pages/Unauthorized`,
`pages/FlashcardDashboardPage`, `pages/FlashcardStudyPage`,
`pages/QuizDashboardPage`, `pages/QuizTakePage`

Not: Flashcard ve Quiz feature flag arkasında. Kapsamı büyütme, yalnızca
görsel dile geçir.

- **NotFound / Unauthorized**: ortalanmış sade blok — ikon, kısa başlık,
  tek satır açıklama, tek turuncu CTA ("Ana Sayfaya Dön").
- **Flashcard / Quiz**: kart ve soru yüzeyleri `--white` + `--border`;
  doğru zeytin, yanlış bordo; ilerleme `Progress` ile. Koyu panel 0.
  Sayfa başına en fazla bir turuncu CTA (çalışmaya başla / sınavı bitir).

**Grup sonu:** `npm run build` + `npm test`.

---

# GRUP 7 — Yönetim paneli

Dosyalar: `pages/admin/` altındaki 7 sayfa (AdminDashboard 12 hex,
AdminKnowledge 2, AdminUsers 3, AdminImports 2, AdminKOForm 1,
AdminKOReview 0, AdminAuditLog 0)

Bu sayfalar yalnızca yöneticinin kullandığı iç araçlar — **sade ve işlevsel**
kalsın, dekoratif öğe ekleme.

- Tablolar `DataTable` bileşeniyle; başlık satırı `--bg-tertiary`,
  satır ayırıcıları `--border`, hover `--bg-hover`.
- Durum rozetleri: onaylı zeytin, beklemede hardal, reddedildi bordo.
- Form sayfaları (KOForm): alanlar ızgarada, kaydet teal, sil bordo.
- Koyu panel: hiçbirinde kullanma.
- Turuncu CTA: sayfa başına en fazla bir (ör. "Yeni KO", "İçe Aktar").
- **Admin görünümünü ve işlevlerini bozma** — bu en riskli grup, dikkatli ol.

**Grup sonu:** `npm run build` + `npm test`.

---

# BİTİRİNCE RAPORLA

Grup grup, kısa:

1. Her grupta değiştirilen dosyalar
2. Her sayfada ana CTA hangi buton (yoksa "yok")
3. Koyu panel kullanılan sayfalar (kullanılmadıysa "yok")
4. Temizlenen sabit hex sayısı (grup toplamı)
5. Gerçek veri olmadığı için gösterilemeyen alanlar
6. Her grup sonundaki build/test sonucu
7. Takıldığın veya karar bekleyen noktalar

Referans: 23 test dosyası, 126 test geçmeli.
