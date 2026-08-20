# Düzeltme Listesi — A Grubu (Hatalar) Raporu

Tarih: 19.08.2026

Listendeki hatalardan beşi kapandı, hepsi tarayıcıda doğrulandı.
Yol üstünde iki şey daha çıktı; ikisi de aşağıda.

---

## Madde 2 — Toplulukta haber paneli ✅

`AdminPanel` hem Haberler hem Topluluk dalında render ediliyordu
(`CommunityPage.jsx:326` ve `:340`) ve içinde "Resmî güncelleme oluştur"
formu vardı.

**Düzeltme:** panel moda göre ayrıldı — moderasyon her iki modda kalır,
resmî içerik oluşturma yalnız Haberler'de görünür. Başlık da moda göre
değişiyor ("Moderasyon araçları" / "Yayın ve moderasyon araçları").

**İki yan bulgu:**
- `CommunityPage`'in haber dalı **rota üzerinden hiç erişilemiyor** —
  `/app/community` ayrı bir `NewsPage` render ediyor. Yani o kod ölü.
- Resmî haber oluşturma zaten `/admin/community` → Haberler sekmesinde
  doğru yerde duruyor. O form Toplulukta hem yanlış yerdeydi hem gereksizdi.

**Ek düzeltme — sol menüdeki "Haber oluştur":** ekran görüntünde Toplulukta
da duruyordu. Sebebi `Sidebar.jsx:202`'deki `startsWith('/app/community')`
koşuluydu; bu, `/app/community/topluluk` yolunu da kapsıyordu. Ayrıca hedefi
`#yayin-araclari` çapasıydı — o form artık orada olmadığı için bağlantı
işlevsizdi. Artık yalnız Haberler ekranında çıkıyor ve `/admin/community`
adresine gidiyor. Toplulukta hızlı eylem yok; sayfanın kendi "Gönderi
oluştur" düğmesi zaten en üstte.

---

## Madde 9 — Resme basınca bir şey görünmüyor ✅

`PostMedia` düz bir `<img>`'di, tıklama işleyicisi yoktu.

**Düzeltme:** tam ekran görüntüleyici. Görsel bir **düğmenin içine** alındı —
tıklanabilir bir `<img>` klavyeyle açılamaz ve ekran okuyucuya tıklanabilir
olduğunu söylemez.

Görüntüleyici `frontend/src/components/ui/ImageViewer.jsx` olarak **paylaşılan
bileşen**: Topluluk görselleri ve profil fotoğrafı aynı bileşeni kullanıyor,
iki kopya iki farklı davranış demek olurdu.

Davranış: Esc ile kapanır · arka plana tıklayınca kapanır · odak kutunun
içinde döner (Tab arkadaki sayfaya kaçmaz) · kapanınca odak geldiği yere
döner · açıkken sayfa kaymaz.

**Doğrulama (gerçek akış):** PNG üretildi → yüklendi → gönderi oluşturuldu →
admin onayıyla yayınlandı → açıldı. Kutu 1280×720 tam ekran, kapatma düğmesi
sağ üstte (1218, 20) ve görünür, Esc kapatıyor, kaydırma kilidi bırakılıyor.

---

## Madde 3 — Yazı alanında gri boşluk ✅ (iki ayrı sebep)

Bunu ilk turda bulamamıştım; yerini söyleyince ikiye ayrıldı.

**Sebep 1 — gri kutu:** Ölçtüm; DOM'da yeni öğe yok, düzen hiç kaymıyor.
Sebep bizim kodumuz değildi: iki alanda da `type="search"` var ve tarayıcı
kendi **arama geçmişi önerisini** çiziyordu. Sayfa DOM'unun dışına çizildiği
için ölçümlerde görünmüyordu.

Üstteki aramada bu gerçek bir hataya yol açıyormuş: o alanın **kendi öneri
paneli** var, tarayıcınınki üstüne biniyordu — aynı anda iki liste.
İkisine de `autoComplete="off"` eklendi.

**Sebep 2 — mavi kare:** Ekran görüntünde işaret ettiğin sert mavi
dikdörtgen. `base.css` içindeki

```css
input:focus-visible { outline: 2px solid var(--theme-focus); }
```

kuralı, modül CSS'indeki `outline: 0` ile **aynı özgüllükte** (0,1,1) ve
sonra yüklendiği için kazanıyordu. Sonuç: kapsayıcının yumuşak halkasının
üstüne binen ikinci, sert bir odak göstergesi.

**Düzeltme:** her iki arama alanında da input'un outline'ı daha yüksek
özgüllükle geçersiz kılındı; odak göstergesi kapsayıcının halkasında
toplandı. Kenar çubuğu araması, üstteki aramanın zaten kullandığı yumuşak
halka diline getirildi — ikisi artık aynı görünüyor.

Odak görünürlüğü **kaybolmadı** (erişilebilirlik gereği); tek ve daha sakin
bir göstergeye indi. Ölçümle doğrulandı: kapalıyken şeffaf, odakta
`rgb(148, 206, 237)` kenarlık + yumuşak halka, input outline `none`.

---

## Profil fotoğrafı ✅ (senin eklediğin istek)

Ayarlar → profil fotoğrafına tıklanınca büyüyor, altında **"Fotoğrafı
değiştir"** ve **"Kaldır"** çıkıyor. Aynı `ImageViewer` bileşeni, `actions`
parametresiyle.

Fotoğraf yoksa baş harfler duruyor ve tıklanabilir değil — tıklanacak bir
şey olmadığında düğme göstermek yanıltıcı olurdu.

**Doğrulama:** avatar yüklendi, tıklandı, 300px görsel açıldı, iki eylem
göründü, odak kapatma düğmesinde, kaydırma kilitli.

---

## Yol üstünde çıkan: test takımı kendi kendini kırıyordu

Değişikliklerden sonra tam takım iki koşuda da tek bir testte kırıldı — ama
**farklı dosyalarda, aynı uç noktada** (`/admin/stats`). Rastgele değil,
örüntü.

İncelediğimde uygulama hatası çıkmadı: hata **429**'du, 500 değil.
`/admin/stats`'in kendi sınırı yok, **global** sınıra tabi: 300 istek /
15 dakika. `app.inject` ile yapılan her istek aynı adresten sayıldığı için
95 test dosyasının tamamı tek kovayı paylaşıyor. Eklediğim ~40 yeni istek
toplamı eşiğin üstüne çıkardı ve alakasız testler kırılmaya başladı.

**İki düzeltme:**

1. `password-reset.test.ts` `TRUST_PROXY`'yi ayarlayıp **temizlemiyordu** —
   testler tek süreçte çalıştığı için değer sonraki dosyalara sızıyordu.
   Temizlik eklendi. (Bu benim hatamdı.)
2. Global sınır testte yüksek tutuldu (`NODE_ENV === 'test'` iken 100.000).
   **Bu bir zayıflatma değil:** rota bazlı sınırlar (giriş 10/dk, şifre
   sıfırlama 3/saat…) testte de aynen geçerli ve testler onları doğruluyor —
   nitekim `password-reset.test.ts` sınırın 3'te kapandığını kanıtlıyor.
   Global sınırı doğrulayan bir test yok. Üretimde 300/15dk aynen duruyor.

**Not:** daha önce bu kırılmayı iki kez "yük altında flakiness" diye
geçmiştim. Yanlıştı — gerçek ve açıklanabilir bir sebebi varmış.

---

## Sonuç

**Tam takım: 95/95 dosya, 1397/1397 test — üst üste iki koşuda temiz.**

Doğrulama için açılan test kullanıcıları, gönderiler ve medya silindi
(veritabanında kalıntı yok).

### Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `components/ui/ImageViewer.jsx` + `.module.css` | yeni, paylaşılan görüntüleyici |
| `pages/CommunityPage.jsx` | panel moda göre ayrıldı, görsel büyütme |
| `pages/SettingsPage.jsx` + `.module.css` | profil fotoğrafı büyütme + eylemler |
| `components/layout/Sidebar.jsx` + `.module.css` | hızlı eylem koşulu, arama odağı, `autoComplete` |
| `components/layout/Header.jsx` + `.module.css` | arama odağı, `autoComplete` |
| `src/index.ts` | global hız sınırı testte yüksek |
| `tests/password-reset.test.ts` | `TRUST_PROXY` sızıntısı kapatıldı |

Commit/push yapılmadı.

### Sırada

A5 (KO yönetimi + "görüntüle → boş sayfa") ve A6 (kullanıcı askıya alma).
A5 için senin gördüğün adımları tekrarlamam gerekiyor.
