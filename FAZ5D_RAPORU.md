# FAZ 5D RAPORU

Tarih: 2026-08-11 · Otorite: `DESIGN.md` · Kanonik ağaç: `frontend/src` · Git işlemi yapılmadı.

1. **Finance audit:** `ToolsPage` başlığı clamp ile aşırı büyüyor, kartlar yeşil/teal kimlik taşıyor, özel tactile gölge/radius ve 38px CTA kullanıyordu.
2. **Finance header:** Başlık semantic page-title tokenına, giriş metni page-intro tokenına ve üst boşluk 16px ritmine çekildi.
3. **Renk hiyerarşisi:** Normal yüzeyler `surface-0/1/2/elevated`; vurgu `primary`; success yalnız sonuç durumu/rozeti olarak kaldı.
4. **Hesaplama kartları:** 16px padding, `radius-md`, `shadow-sm`, 16px grid ve içerik-temelli yükseklik.
5. **Formlar:** Sayısal kontroller 40px, 12px grid; modal `surface-elevated` ve `shadow-overlay`.
6. **Sonuç hiyerarşisi:** Ana sonuç brand tonal yüzeyde; destekleyici metrikler neutral kartlarda; semantik durum rozette.
7. **Runway/geçersiz sonuç:** Formül veya validation mantığı değiştirilmedi. Sıfır/eksik veri için backend sözleşmesini aşan tahmin üretilmedi; gerçek business-logic ayrımı ileride ürün/veri kararı gerektirir.
8. **Finance geçmiş:** Kayıtlar 12x16 compact kart, 8px liste ritmi ve neutral yüzeye taşındı.
9. **Finance fiş/detay:** Mevcut sonuç modalı korunup tasarım sistemi modal yüzeyine getirildi; yeni backend/drawer üretilmedi.
10. **Model Lab audit:** `1240px`, 20/10/11/13px radiuslar, beyaz/gradient prototype hero, yeşil run-bar ve özel CTA geometrileri bulundu.
11. **Model Lab header:** Kütüphane ve workspace üst alanları kompakt neutral surface hiyerarşisine alındı.
12. **Yüzey normalizasyonu:** `surface-0/1/2/3/elevated` kullanıldı; hardcoded beyaz gradient/glow kaldırıldı.
13. **Model kartları:** 16px padding, `radius-md`, 16px grid, neutral secondary açma eylemi.
14. **Girdi/parametre panelleri:** 40px kontrol, 12px iç grid, 16px panel padding; gereksiz beyaz kutu ve özel radius temizlendi.
15. **Model sonuçları:** Metrikler neutral kartlarda; güven semantic badge düzeyinde.
16. **Senaryo/duyarlılık:** Aktif senaryo brand selected state; kartlar standard radius/padding; neon/yeşil dekor yok.
17. **Model geçmiş:** Mevcut sürüm listesi compact divider ritminde korundu.
18. **Ortak dil:** Finance ve Model Lab artık aynı neutral surface + brand accent sistemini kullanıyor.
19. **CTA:** Normal eylemler 40px; primary yalnız gerçek ana eylem; kart içi açma secondary ağırlıkta.
20. **Max-width:** `1220/1240px` kaldırıldı, üç yüzey de `var(--content-max-width)` kullanıyor.
21. **Spacing/radius:** Legacy 20/10/11/13px kart radiusları ve 13/14/18/22/25/27px ana layout aralıkları normalize edildi.
22. **Dark/light:** Yeni yüzeyler merkezi token varyantlarını kullanıyor; mode-specific yeni renk eklenmedi.
23. **Chart istisnaları:** Grafik paleti ve hesap motoru değişmedi.
24. **Erişilebilirlik:** Focus ring, modal semantics ve metin+rozet durum sunumu korundu; renk tek veri taşıyıcısı yapılmadı.
25. **Responsive:** Gridler 900/640 katmanlarında 3→2→1; mobil sticky run-bar bottom-tab ve safe-area üstüne alındı.
26. **Kaldırılan override:** Koyu/yeşil kart kimliği, custom glow, 38px CTA, 1220/1240px width, 20/10px legacy radius.
27. **Kalan borç:** Tarayıcı olmadan görsel kırılma/kontrast ölçümü yapılamadı. Runway sıfırının domain anlamı UI fazında değiştirilemez.
28. **Build/test:** `npm run build` başarılı (yalnız mevcut >500kB chunk uyarısı); `npm test` 25 dosya / 138 test geçti.
29. **Manuel smoke:** Tarayıcı/manual smoke erişimi yok; 1440/1280/768/430/390/360 light/dark doğrulaması açık bırakıldı, yapılmış gibi raporlanmadı.
30. **Faz 5E:** Business Tracking ve Workspaces sayfa yoğunluğu, workspace alt-nav/list/table sözleşmeleri.

`DecisionToolsPage` router tarafından import edilmeyen referanssız mockup olarak doğrulandı; `/decision-tools` redirecti `/app/decision-checks` olarak korundu ve dosya yeniden tasarlanmadı.
