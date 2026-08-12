# FAZ 5G RAPORU

Tarih: 2026-08-11 · Kapsam: News + Community · Otorite: `DESIGN.md` · Git işlemi yapılmadı.

## News

- Sayfa `var(--content-max-width)`, semantic page-title, 48px brand-tonal ikon ve 40px filter chip sözleşmesine alındı.
- Kartlar 16px grid/padding, `radius-md`, `surface-2`, `shadow-sm/md` oldu.
- Görsel bulunmayan haber kartlarında kategori başına rastgele hardcoded yeşil/mavi/mor/sarı gradientler kaldırıldı; brand-tonal fallback kullanıldı. Gerçek haber görselleri değişmedi.
- Empty state 160px/32px; load-more 40px secondary; shimmer gradient yerine reduced-motion dostu statik tonal skeleton kullanıldı.

## Community

- Composer ve post kartları 16px standard karta, form kontrolleri 40px/`radius-sm` contractına taşındı.
- Primary post/AI/moderation eylemlerindeki 3D gradient ve büyük özel gölge kaldırıldı; 40px solid primary + standard hover/active kullanıldı.
- Attachment, media, AI draft, moderation queue, avatar ve news list yüzeyleri standard radius/spacing/tokenlara getirildi.
- Featured News gerçek feature yüzeyi olarak korundu; normal haber/post kartlarıyla karıştırılmadı.

## Korunan işlevler

News fetch/filter/source linkleri; community publish, media attachment, AI draft, moderation, reactions ve admin davranışları değiştirilmedi.

## Doğrulama

- `npm run build`: başarılı; yalnız mevcut >500kB chunk uyarısı.
- `npm test`: 25 dosya / 138 test geçti.
- Otomatik tarama: News normal kartlarında hardcoded kategori renkleri ve 20px radius; Community normal kontrollerinde 9/11/13/14/18px radius ve 3D CTA gölgeleri temizlendi.
- Manuel smoke/tarayıcı erişimi yok; light/dark ve 1440/1280/768/430/400/390/360 render kontrolü açık bırakıldı.

## Kalan borç

Featured News overlay renkleri fotoğraf okunabilirliği için içerik-overlay istisnasıdır. Gerçek görsel üzerinde kontrast ölçümü tarayıcı/görsel QA olmadan doğrulanamadı ve yapılmış gibi raporlanmadı.
