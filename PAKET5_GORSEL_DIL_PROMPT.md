# LOCAL KARAR — PAKET 5: GÖRSEL DİL VE KABUK

Onaylanan Stitch tasarımlarını, LocalKarar renkleriyle koda geçirmek.

**ÇALIŞMA BİÇİMİ:** 10 iş var. **Sırayla, tek tek yap.** Her işin sonunda
`npm run build` + `npm test` çalıştır, temiz olduğunu doğrula, sonra devam et.
Bir iş takılırsa orada dur ve raporla. İşleri karıştırma.

Backend, route, veri modeli ve API sözleşmesi DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

---

# ONAYLANAN KARARLAR (tartışma kapandı, uygula)

- **Renkler:** mevcut LocalKarar paleti. Yeni renk eklenmeyecek.
- **Logo:** mevcut `components/ui/BrandMark.jsx`. Yeni logo yok.
- **İkonlar:** Lucide veya inline SVG. **Tümü yeşil ailesinde**
  (`--brand-ink` açık zeminde, `--sidebar-text` koyu zeminde).
  Uygun olmayan ikonu daha uygun bir Lucide ikonuyla değiştirebilirsin.
- **Karar Fişi:** mevcut `DecisionReceipt` **aynen korunacak**, dokunma.
- **Bağlam paneli:** yalnızca alt navigasyonu olan 4 sayfada
  (Karar Araçları, Finans Merkezi, İşletme Takibi, AI Mentor).
  Diğer sayfalarda panel kapalı başlar, içerik genişler.
- **Ayna hüzmesi:** koyu imza panellerde **döngüsel (5sn)**, açık kartlarda
  **yalnızca hover'da tek sefer**. Mobilde döngü kapalı.
- **Ayarlar:** kutu ızgarası değil, **tek sütun aşağı akan** sayfa.
- **Haberler:** yalnızca haber/resmî içerik. **Topluluk ayrı sayfa olacak.**
- **Uydurma içerik yasak:** Mockup'ta olup bizde olmayan araç/veri
  (KDV Hesaplama, Gelir Vergisi, Döviz Çevir, katılımcı sayısı, avatar
  fotoğrafı) **konulmayacak**. Yerine gerçek araç/model/veri konacak.
- **Mobil:** responsive-first. 900px altında ikon rayı + panel yerine
  **alt sekme çubuğu**. Aynı kod hem masaüstü hem mobil.

---

# İŞ 1 — Yüzey ve hareket tokenları

Dosya: `styles/motion-glass-tokens.css`

Ekle (mevcutları silme):

```
--rail-width: 72px;
--context-width: 240px;
--dur-panel: 200ms;

--mirror-edge: rgba(255, 255, 255, 0.5);
--shadow-tactile: 0 10px 30px rgba(21, 51, 45, 0.08);
--shadow-tactile-hover: 0 18px 40px rgba(21, 51, 45, 0.16);

--lift-card: -5px;      /* mevcut -2px bu değere güncellenecek */
--lift-btn: -2px;       /* buton küçük olduğu için kart kadar yükselmez */
--sweep-period: 5s;
```

Yeni keyframe: yalnızca `mirrorSweepLoop` (mevcut `mirrorSweep` hover için
kalır). Başka yeni keyframe yazma.

**Mirror Edge yardımcı sınıfı:** üst ve sol kenarda 1px parlak çizgi.
`border-top` + `border-left` ile veya `box-shadow: inset` ile yap; kartın
kendi kenarlığını bozmasın.

`prefers-reduced-motion` altında sweep döngüsü ve lift kapalı.

# İŞ 2 — Kabuk: ikon rayı + bağlam paneli + mobil sekme çubuğu

Dosyalar: `components/layout/AppLayout.jsx` + `.module.css`,
`components/layout/Sidebar.jsx` + `.module.css`,
yeni `components/layout/ContextPanel.jsx` + `.module.css`,
yeni `components/layout/MobileTabBar.jsx` + `.module.css`

## Masaüstü (≥900px)

**İkon rayı — 72px, sabit, yüzen kart:**
- Kendi yuvarlak köşeli koyu paneli (`--brand-teal-deep`), kenarlarında
  zemin görünsün (dış boşluk `--space-3`).
- Üstte `BrandMark`. Altta kullanıcı avatarı + küçük ad.
- Her madde: ikon üstte, **çok küçük etiket altta** (7-8px). Aktif madde
  `--sidebar-active-bg` dolgulu, solunda ince altın çizgi.
- Menü maddeleri Paket 4'te belirlenen 9 madde + admin grubu.

**Bağlam paneli — 240px, açılır/kapanır, ayrı yüzen kart:**
- `--brand-teal-deep` zemin, kendi yuvarlak köşeleri, rayla arasında boşluk.
- Üstte cam arama hapı (`backdrop-filter: blur(12px)`,
  `rgba(255,255,255,0.1)` zemin, tam yuvarlak).
- Altında sayfa adı (17px) ve o sayfanın alt navigasyonu.
- Açılma/kapanma `--dur-panel` (200ms) `ease-in-out`, **içerik alanı
  pürüzsüzce sağa/sola kayar** (`margin-left` veya `grid-template-columns`
  geçişi).
- Yalnızca 4 sayfada açık başlar (yukarıdaki karar). Diğerlerinde
  render edilmez.
- Rayda bir aç/kapa düğmesi olsun.

## Mobil (<900px)

- İkon rayı ve bağlam paneli **gizlenir**.
- Ekranın altına sabit **alt sekme çubuğu**: Ana Sayfa · Kurslar ·
  Karar Araçları · Finans Merkezi · AI Mentor (5 madde, ikon + etiket).
  Aktif sekme `--brand-ink` renginde, diğerleri `--text-light`.
- Kalan menü maddeleri üstteki hamburgerden açılan drawer'da.
- Alt çubuk yüksekliği ~56px + güvenli alan boşluğu
  (`padding-bottom: env(safe-area-inset-bottom)`).
- Sayfa içeriğinin altına alt çubuk kadar boşluk bırak, içerik gizlenmesin.

# İŞ 3 — Ortak kart ve buton hissiyatı

Dosyalar: `components/ui/Card.module.css`, `Button.module.css`,
`components/ui/DarkPanel.module.css`

- Kart ve panellerde `--shadow-tactile`; hover'da `--shadow-tactile-hover`
  ve `translateY(var(--lift-card))`.
- Butonlarda hover `translateY(var(--lift-btn))`, active `scale(0.98)`.
- Tüm kart ve panellere **Mirror Edge** (üst + sol 1px parlak çizgi).
- Koyu panellerde sweep **döngüsel**; açık kartlarda **hover'da tek sefer**.
- Mobilde (`hover: none`) lift yok, yalnızca `active` durumunda
  `scale(0.98)` dokunma geri bildirimi.

# İŞ 4 — Karar Araçları

Dosyalar: `pages/DecisionCheckList.jsx` + `.css`

- Bağlam paneli: durum filtreleri (Tümü / Devam eden / Tamamlanan) +
  gerçek araç listesi.
- **İmza koyu panel** (tam genişlik): ortalanmış küçük eyebrow, büyük kalın
  başlık, sağ üstten gelen ışık hüzmesi (radial gradient), döngüsel sweep.
- Panelin **alt kenarından taşan cam arama hapı** (yarısı panelin dışında).
- Kart ızgarası 3 sütun (mobilde 1): başlık solda, **büyük çizgi ikon sağda**
  (~56-62px, `--brand-ink`, ince stroke), altında durum hapı, açıklama,
  en altta **tam genişlik koyu teal buton**.
- Durum hapları: Devam ediyor hardal, Tamamlandı zeytin, Başlanmadı nötr.
- Turuncu CTA: bu sayfada **yok** (kart başına tekrarlayan aksiyon).

# İŞ 5 — Finans Merkezi

Dosyalar: `pages/ToolsPage.jsx` + `.module.css`

- Bağlam paneli: **Favori hesaplamalar** (varsa) · **Model Laboratuvarı** ·
  **Geçmiş**. Üstte turuncu "Yeni Hesaplama" butonu (sayfanın tek turuncusu).
- Ana alan üstünde: sayfa adı + tek satır açıklama, sağda arama.
- Filtre hapları (Tümü / Hesaplamalar / Geçmiş) — **backend'in gerçekten
  desteklediği** ayrımlar.
- **"Bugün ne hesaplamak istiyorsunuz?"** başlığı altında koyu araç kartları
  ızgarası: her kartta büyük çizgi ikon, araç adı, tek satır açıklama.
  **Mockup'taki KDV/Gelir Vergisi/Döviz Çevir DEĞİL — gerçek formül ve
  modeller.**
- Sağ sütun: son hesaplama özeti (gerçek geçmişten) + bugün önerilen araç.
  Veri yoksa bu sütunu gösterme.
- Alt kısım: son işlemler listesi (gerçek geçmiş kayıtları).

# İŞ 6 — AI Mentor

Dosyalar: `pages/MentorPage.jsx` + `.module.css`

- Üç bölge: bağlam paneli (sohbet listesi) · sohbet alanı · işlem önerileri.
- **Sohbet listesi paneli açılır/kapanır** — kapanınca sohbet alanı genişler.
- Sohbet balonları mevcut `MentorMessageBubble` stillerini kullanır, dokunma.
- Sağ sütun "İşlem Önerileri": her satır ikon + kısa etiket, kart görünümlü.
  **İçerik gerçek `generateSuggestedActions` çıktısından gelecek**;
  mockup'taki tekrarlayan sahte öneriler kullanılmayacak. Öneri yoksa
  sütunu gösterme.
- Mesaj altındaki "Sonraki Adımlar" butonları mevcut veriden.
- Mobilde: sohbet listesi drawer, işlem önerileri mesajların altına iner.

# İŞ 7 — İşletme Takibi

Dosyalar: `pages/Workspaces/WorkspaceLayout.jsx`, `Tracker.jsx`, `Overview.jsx`

- Üstte işletme adı + işletme seçici (Paket 4'te eklendi, korunacak).
- Sekme çubuğu: Genel Bakış · Belgeler · Bildirimler · Takvim · Ekip ·
  Kişiler · Aktiviteler · Ayarlar. Aktif sekmede ince teal alt çizgi.
- **Hızlı aksiyon şeridi:** Yeni Ödeme · Yeni Tahsilat · Yeni Senet ·
  Yeni Kargo · Hızlı Rapor. Her biri ikonlu beyaz kart, Mirror Edge'li.
  **Bunlar mevcut kayıt oluşturma akışını `type` ön seçimiyle açacak** —
  yeni endpoint yazma. Karşılığı olmayan aksiyonu ekleme.
- Altında KPI şeridi: Açık kayıt · Geciken · 30 günlük net · Bekleyen kargo
  (gerçek tracker verisinden).
- Boş durum: mevcut `EmptyState`, turuncu "İlk kaydı ekle" CTA'sı.

# İŞ 8 — Ana Sayfa

Dosyalar: `pages/Dashboard.jsx` + `.module.css`

- Karşılama: "Hoş geldin, {ad}" + tarih seçici sağda.
- **Bugünkü İşletme Durumu** koyu paneli: solda tek cümlelik durum özeti
  (gerçek veriden türetilmiş), sağda KPI'lar yan yana.
  **Gelir/Gider/Net Kâr/Kâr Marjı/Risk Skoru backend'de YOK** — mevcut
  tracker KPI'larını kullan (Alacaklar, Borçlar, Net Durum, Geciken,
  Açık kayıt). İşletme yoksa paneli gösterme.
- Üç aksiyon kartı: **Karar Ver · Hesapla · Mentor'a Sor** — her birinde
  daire içinde büyük çizgi ikon, başlık, iki satır açıklama, altta buton.
  **Bunlardan yalnızca biri turuncu** (Karar Ver), diğerleri teal.
- Alt ızgara: Kaldığın Yerden Devam Et · Önerilen Karar Aracı (koyu panel) ·
  Bugünkü Görevler · Güncel Haberler · Son Karar Sonucu (mevcut fiş kartı,
  **aynen korunacak**).
- Haber satırlarında **görsel/thumbnail YOK** (veri modelinde yok).

# İŞ 9 — Haberler ve Topluluk ayrımı

Dosyalar: `pages/CommunityPage.jsx` + `.module.css`,
yeni `pages/CommunityFeedPage.jsx` (veya aynı bileşenin ikinci modu)

- **Haberler** (`/app/community`): yalnızca resmî/haber içeriği
  (`type=official`). Üstte koyu imza panel + kısa açıklama. Altında tek
  sütun akış: her kartta kategori rozeti, başlık, özet, kaynak adı ve
  göreli zaman, kaynak bağlantısı. Gönderi oluşturma formu **burada olmayacak**.
- **Topluluk** (yeni route, ör. `/app/community/topluluk`): kullanıcı
  gönderileri (`type=user`). Üstte "Deneyimini paylaş" formu, altında
  gönderi akışı. Moderasyon notu korunacak.
- Sidebar'a **Topluluk** maddesi eklenecek (DİĞER grubuna).
- Backend `type` parametresi zaten destekliyor; yeni endpoint yazma.
- Beğeni/yorum **bu pakette YOK** (backend modeli yok).

# İŞ 10 — Ayarlar tek akış

Dosya: `pages/SettingsPage.jsx` + `.module.css`

- Kutu ızgarası kaldırılacak. **Tek sütun, aşağı akan** sayfa;
  maksimum genişlik ~720px, ortalanmış.
- Bölümler arasında ince ayırıcı çizgi ve başlık — ayrı kart değil.
- Sıra: Hesap · Güvenlik · Tercihler · İşletme Ayarları · İşletme Profili ·
  Uygulama Bilgisi.
- Her bölümün kendi kaydet butonu (teal), bölümün sonunda sağa yaslı.
- Paket 4'te eklenen gerçek alanlar korunacak, yeni alan uydurulmayacak.

---

# GENEL KURALLAR

- Turuncu `#C1592B`: sayfa başına en fazla bir ana CTA.
- Bordo `#7A2E2E`: yalnızca risk / uyarı / yıkıcı işlem.
- Koyu panel: sayfa başına en fazla 2.
- Glass: arama çubukları, imza panel içindeki hap, modal, drawer,
  bağlam paneli. **Kart ızgaralarına glass uygulama** (okunurluk düşer).
- Sabit hex yazma, hep `var(--token)`.
- Tailwind EKLEME. Stok görsel / fotoğraf / avatar fotoğrafı EKLEME.
- Sahte veri hardcode etme; alan yoksa satırı/kartı gösterme.
- Her sayfada yatay scroll oluşmayacak (`min-width: 0` zincirleri).
- Mevcut işlevler kaybolmayacak, route silinmeyecek.

# MOBİL KURALLARI (her işte geçerli)

- 900px altında: ikon rayı ve bağlam paneli gizli, alt sekme çubuğu görünür.
- Çok sütunlu ızgaralar tek sütuna iner.
- Dokunma hedefleri en az 44×44px.
- Hover efektleri `@media (hover: hover) and (pointer: fine)` içinde;
  dokunmatikte yerine `active` durumunda `scale(0.98)`.
- Sweep döngüsü mobilde kapalı.
- `env(safe-area-inset-bottom)` alt çubukta uygulanacak.

# BİTİRİNCE RAPORLA

1. Her işte değiştirilen/eklenen dosyalar
2. Bağlam paneli hangi sayfalarda açık, hangilerinde kapalı
3. Mobil alt sekme çubuğunda hangi 5 madde var
4. Sweep döngüsü hangi yüzeylerde çalışıyor
5. Mockup'ta olup veri olmadığı için konulmayan içerikler
6. Her iş sonundaki build/test sonucu (referans: 23 dosya, 127 test)
7. Takıldığın veya karar bekleyen noktalar
