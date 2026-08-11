# LocalKarar — Tasarım Uygulama Fazı / Paket 1 Raporu

Tarih: 2026-08-06
Kapsam: uygulama kabuğu, sidebar, header, dashboard, ortak tokenlar.
Backend, route, veri modeli, API bağlantıları ve iş mantığı **değiştirilmedi**. Commit/push **yapılmadı**.

---

## Değiştirilen / eklenen dosyalar

| Dosya | Durum | Ne yapıldı |
|---|---|---|
| `src/styles/tokens.css` | değiştirildi | Mavi tema tamamen kaldırıldı; koyu teal + fildişi palet. **Değişken isimleri korundu**, böylece ~70 CSS modülü dokunulmadan yeni renklere geçti. Sidebar tokenları eklendi, header 64→52px |
| `src/components/ui/BrandMark.jsx` | **yeni** | Pusula iğnesi + C/K monogramı, inline SVG (geçici asset) |
| `src/components/layout/Sidebar.jsx` + `.module.css` | değiştirildi | Koyu teal (#15332D), LocalKarar logosu, ANA MENÜ / DİĞER / Yönetim grupları, Karar Araçları'nda altın çizgi + "Önerilen" rozeti, aktif menü zeytin (#3E5D50), altta profil + çıkış |
| `src/components/layout/Header.jsx` + `.module.css` | değiştirildi | Beyaz büyük header kaldırıldı; 52px, ana zemine entegre, route'tan türeyen sayfa başlığı + tarih + bildirim + avatar |
| `src/components/layout/AppLayout.module.css` | değiştirildi | Zemin `--bg`, `min-width: 0` (yatay scroll koruması) |
| `src/pages/Dashboard.jsx` + `.module.css` | yeniden yazıldı | Yeni bilgi mimarisi (aşağıda) |
| `src/components/ui/Button.module.css` | değiştirildi | **`cta` varyantı eklendi** (turuncu), `primary` teal oldu, `danger` bordo, `outline` varyantı eklendi (kodda kullanılıyordu ama tanımlı değildi) |
| `src/components/ui/Card / Badge / Progress .module.css` | değiştirildi | Mavi gradyanlar ve `#e8f4fd`/`#f7faff` gibi sabit maviler palete çevrildi |
| `src/styles/main.css` | değiştirildi | KPI/progress/auth/backup gradyanları düz yeni renklere çevrildi |
| `src/pages/AuthPage.jsx`, `OnboardingPage.jsx`, `CommunityPage.jsx`, `FinancialModelWorkspace.jsx`, `index.html` | metin | "LocalAkademi" → "LocalKarar" |

---

## Dashboard bilgi mimarisi

1. **Karşılama** — "Hoş geldin, {ad} — {işletme adı}" (işletme adı gerçek workspace'ten; yoksa gösterilmez)
2. **KPI şeridi** — aşağıdaki önemli notu oku
3. **Hızlı erişim** (5 kart) — Karar Araçları, Finans Merkezi, AI Mentor, Görevlerim, Kaydedilenler; her birinde gerçek veriden türeyen küçük metrik
4. **Ana içerik (sol)** — Kaldığın yerden devam et, Önerilen Karar Aracı, Öğrenme Yolu, Önerilen İçerikler, Pilot Program
5. **Sağ kolon** — Görevler, Güncel Haberler, Son Aktiviteler, Öğrenme Özeti

Eski dashboard'un tüm işlevleri korundu: pilot program, feature flag'li Flashcard/Quiz, `PersonalizedFeed` + `LearningProgressPanel` flag yolu, demo modu rozeti, skeleton ve hata durumu.

### ⚠️ KPI kartları hakkında önemli sapma

Senin verdiğin brief'te KPI'lar **Gelir / Gider / Net kâr / Brüt kâr marjı / Risk skoru** olarak isteniyordu. Kod tabanını inceledim: **backend'de bu beş metriği döndüren bir endpoint yok.** Var olan tek gerçek finansal kaynak `GET /workspaces/:id/tracker/summary` ve şunları veriyor: 30 günlük `receivable`, `payable`, `net`, ayrıca `open` / `overdue` / `dueToday` sayıları.

"Mockup'taki sahte veriyi hardcode etme" kuralı gereği uydurmak yerine KPI'ları gerçek veriye bağladım:

**Alacaklar (30 gün) · Borçlar (30 gün) · Net Durum · Geciken Kayıt · Açık Kayıt**

Aktif işletme yoksa veya endpoint erişilemezse KPI şeridi yerine boş durum kartı çıkıyor ("İşletme özetini görmek için bir işletme profili oluştur" + İşletme Takibi'ne yönlendirme). Gelir/gider/kâr marjı KPI'ları isteniyorsa önce backend'de bir finansal özet endpoint'i gerekiyor — bunu Paket 2'ye alabiliriz.

---

## Renk disiplini

- **Turuncu (#C1592B):** dashboard'da yalnızca tek yerde — karşılama alanındaki ana CTA ("Kaldığın Yerden Devam Et" / "Kurslara Göz At"). Yeni `variant="cta"` ile. Ayrıca sidebar'daki kullanıcı avatarında kimlik vurgusu olarak.
- **Bordo (#7A2E2E):** negatif net durum, geciken kayıt sayısı, hata ikonu, `danger` butonlar. Başka hiçbir yerde yok.
- **Zeytin (#3E5D50):** aktif menü, pozitif değerler, başarı.
- **Altın (#B8923F):** yalnızca Karar Araçları menü öğesinin sol çizgisi ve Önerilen Karar Aracı kartının kenarı.
- Glass yalnızca header ve mobil sidebar drawer'da (mevcut motion-glass tokenları kullanıldı); **hiçbir dashboard kartında glass yok**.

---

## Doğrulama — ne yapıldı, ne yapılamadı

**Yapılan (statik):**
- Tüm değiştirilen `.css` dosyalarında `{}` dengesi — hepsi OK
- Tüm değiştirilen `.jsx` dosyalarında `{}`/`()`/`[]` dengesi — hepsi OK
- `lucide-react`'ten import edilen 33 ikonun paketten gerçekten export edildiği doğrulandı — eksik yok
- Kullanılan tüm ikonların import edildiği, kullanılmayan import kalmadığı doğrulandı (bir tane bulundu, temizlendi)
- `styles.X` ile kullanılan **her** CSS module class'ının ilgili `.module.css`'te tanımlı olduğu doğrulandı — 4 dosyanın hiçbirinde tanımsız class yok

**Yapılamayan — ortam kısıtı:**
`npm run build`, `vitest` ve tarayıcı ekran görüntüsü **çalıştırılamadı.** Sebep: bu sandbox Linux x64, ama `node_modules` Windows'ta kurulmuş (yalnızca `rollup-win32-*` ve `esbuild/win32-x64` binary'leri var) ve npm registry'ye ağ erişimi tamamen kapalı (`403 Forbidden` — `npm view rollup` bile çalışmıyor). Bu, yaptığım kod değişiklikleriyle ilgisi olmayan bir altyapı kısıtı.

**Senin yapman gereken:**
```
cd frontend
npm run dev
```
Sonra kontrol et: Ana Sayfa, sidebar (masaüstü + mobil hamburger), route geçişleri, bir işletme profili varsa KPI şeridi. Ekran görüntüsü alıp buraya atarsan farkları birlikte gözden geçiririz.

`npm run build` yerel makinende sorun çıkarırsa çıktıyı bana ilet, düzeltirim.

---

## Kabul kriterleri durumu

| Kriter | Durum |
|---|---|
| Eski mavi-beyaz tema görünmeyecek | ✅ token seviyesinde kaldırıldı, sabit mavi hex'ler temizlendi |
| LocalKarar adı + koyu teal sidebar | ✅ |
| Dashboard yeni bilgi mimarisi | ✅ (KPI sapması yukarıda açıklandı) |
| Gerçek API verileri çalışmaya devam edecek | ✅ mevcut çağrılar korundu, tracker + community eklendi (ikisi de hata durumunda sessizce boş kalır) |
| Sidebar/header mobilde bozulmayacak | ✅ kodda responsive kuralları var — **tarayıcıda doğrulanmadı** |
| Yatay scroll oluşmayacak | ✅ `min-width: 0` zincirleri eklendi — **tarayıcıda doğrulanmadı** |
| Route geçişleri çalışacak | ✅ hiçbir route/path değiştirilmedi |
| Build ve testler çalıştırılacak | ❌ ortam kısıtı (yukarıda) |
| Tarayıcı ekran görüntüsü | ❌ ortam kısıtı |
| Commit/push yapılmayacak | ✅ yapılmadı |
