# FAZ 3.1 RAPORU — Shell Son Doğrulama

Tarih: 2026-08-11 · Kapsam: 3 kesinleştirme noktası (768 tab bar / navigation drawer genişliği / header-sidebar z-index) · git commit yapılmadı.

---

## 1. 768 BottomTabBar gerçek sonucu

**768px'te tab bar GÖRÜNÜR — kod doğru, Faz 3 raporundaki manuel smoke maddesi yanlıştı.**

Gerçek CSS (tek kaynak, başka override yok — MobileTabBar.jsx'te de gizleme kuralı yok):

- `MobileTabBar.module.css` base: `.tabBar { display: none }`
- `@media (max-width: 899px) { .tabBar { display: flex; ... } }`

| Viewport | Koşul | Sonuç |
|---|---|---|
| 900px | 900 > 899 → media eşleşmez | **GİZLİ** ✓ |
| 899px | 899 ≤ 899 → eşleşir | **GÖRÜNÜR** ✓ |
| 768px | 768 ≤ 899 → eşleşir | **GÖRÜNÜR** ✓ |
| 430px | eşleşir | **GÖRÜNÜR** ✓ |
| 360px | eşleşir | **GÖRÜNÜR** ✓ |

Ek doğrulama: 768px'te aynı anda hamburger de görünür (≤1023) — yani dokunma noktası: 5 ana item (tab) + ek menü (drawer). DESIGN ile çelişki yok (≤899 tab görünür, ≤1023 hamburger görünür).

Düzeltme: `FAZ3_SHELL_RAPORU.md` madde 17'deki 768 satırı güncellendi (`"tab 768'de GÖRÜNMEZ"` → `"tab 768'de GÖRÜNÜR"`). Kod değişikliği gerekmedi.

## 2. 899/900 boundary sonucu

- 900px: hamburger görünür (≤1023), tab gizli (>899) → menü yalnız drawer'dan. DESIGN uyumlu.
- 899px: ikisi de görünür → çift erişim yolu. DESIGN uyumlu (tab ≤899, hamburger ≤1023).
- Keskin sınır: `max-width: 899px` tek kural; 1px farkla davranış değişimi doğru. 900/899 arası hiçbir CSS'te çift tanım yok (Faz 3 raporu 9. maddesindeki "900 vs 899 1px çakışma" yalnız sayfa içerik grid'lerine aittir — tab bar'ı etkilemez).
- MentorPanel (768'de): drawer 320px + backdrop gizli (≥768) — tab bar (≤899) ile çakışma yok: drawer `--z-drawer` 210 > `--z-bottom-tab` 110, drawer üstte kalır ve alt kısmında tab bar görünmez.

## 3. Navigation drawer genişlik kararı

**KARAR: Sidebar'ın mobil navigation drawer'ı bilinçli olarak `--sidebar-width` (256px) kullanır — generic Drawer contract'ından (320px) AYRI bir varyanttır; yeni keyfi genişlik üretilmedi.**

Gerekçe:
1. Mobil navigation drawer, ayrı bir Drawer bileşeni DEĞİL — Sidebar bileşeninin mobil görünümüdür (aynı JSX, transform ile girer). Masaüstünde ray 256px ise mobilde aynı bileşenin 256px kalması görsel ve mekansal olarak tutarlıdır.
2. Faz 3 kapsamındaki kullanıcı problemi "drawer çok geniş/büyük hissediyor" idi — 256px bu sorunu çözmüş halde; 320'ye çıkarmak çözümün tersine döner.
3. Token adı zaten sidebar'a ait: `--sidebar-width: 256px` (DESIGN "desktop sidebar width 256px"). Drawer contract'ı "mobil: min(320px, 92vw)" YALNIZCA generic Drawer (right/left/bottom-sheet) içindir.

Sonuç:
- Generic Drawer (MentorPanel): `--drawer-width` 320px (tablet/desktop), mobilde tam genişlik (`100%`, DESIGN'ın "uygun full-width varyant" istisnası — chat UI için belgeli).
- Navigation drawer (Sidebar): `--sidebar-width` 256px — belgeli bilinçli varyant.
- Nerede belgelendi: bu rapor + Faz 3 raporu madde 7.

## 4. Header/sidebar z-index kararı

**KARAR: `--z-header: 100` ve `--z-sidebar: 100` eşit kalır — gerçek stacking context'lerde belirsizlik YOK.**

Kod düzeyi doğrulama (AppLayout DOM sırası: `<Sidebar/>` → `<div.main><Header/>...`):

- **Desktop**: sidebar `position: fixed` sol sütun, header `position: sticky` sağ sütun (`margin-left: --app-rail-width`). Alanlar disjoint — hiçbir pikselde kesişim yok, DOM sırasına bağımlılık yok. İstenen tek overlap: sidebar'ın sağ kenar gölgesi content üzerine düşer; sidebar z100 > content (auto) olduğundan gölge content'in üstünde çizilir ✓ (istenen davranış).
- **Header/content**: header sticky z100 > content auto → içerik header'ın altından scroll ederken header üstte kalır ✓.
- **ContextPanel** (--z-sidebar 100): desktop'ta main'in soluna `left: --app-rail-width` ile yerleşir — header (sağ sütun) ile kesişmez; content margin ile ayrıktır ✓.
- **Mobil**: drawer `--z-drawer` 210 > header 100 ve bottom tab 110 ✓ — drawer açıkken header ve tab drawer'ın altında kalır ("drawer foreground katmanda" kuralı korunur). Overlay 200 > header 100 → arka plan doğru kararır. Overlay < drawer ✓.
- Mobilde drawer kapalıyken header z100, sidebar drawer kapalı kalır (translateX(-100%)) — çakışma yok.

Değişiklik yapılmadı; merkezi hiyerarşi (Faz 3 raporu madde 10) olduğu gibi geçerli.

## 5. Build/test

- `npm run build` → ✓ (9.75s; mevcut chunk-boyutu uyarısı korunuyor).
- `npm test` → ✓ 25 dosya / 136 test geçti.
- Kod değişikliği bu fazda yalnızca rapor düzeltmesi olduğundan test kümesi Faz 3 son haliyle aynı kapsamda.

Kalan manuel smoke (tarayıcı erişimi yok): Faz 3 raporu madde 17'deki liste + bu fazda doğrulanan sınırlar (900/899/768/430/360) geliştiricide görsel olarak taranacak.