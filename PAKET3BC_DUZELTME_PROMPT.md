# LOCAL KARAR — 3B/3C DÜZELTMELERİ

Tarayıcıda incelendi. Yeni özellik ekleme, yerleşim değiştirme —
yalnızca aşağıdakiler.

> **DURUM NOTU:** Bu dosya daha önce verildi ama uygulanmadı. Aradan
> "3C EK — Kurslar" paketi geçti ve o paket, ihtiyaç duyduğu için
> **5. maddenin `DarkPanel bevel={false}` kısmını zaten ekledi.**
> O kısmı TEKRAR YAPMA. Diğer tüm maddeler (1, 2, 3, 4 ve 5'in
> CoursePlayerPage kısmı) hâlâ açık.

Backend, route, veri modeli ve API sözleşmesi DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

---

## 1. Fiş başlığı iki kez görünüyor

`pages/Dashboard.jsx:907` → `Modal`'a `title={lastDecision.session.decisionCheckTitle}`
veriliyor. Aynı başlık `DecisionReceipt`'e de `title` prop'u olarak geçiyor ve
fişin içinde tekrar basılıyor.

Yapılacak: **Modal'ın başlığı kaldırılsın** (`title` prop'u verilmesin veya boş
geçilsin). Başlık fişin kendi parçası; modal sadece çerçeve olmalı, üstünde
yalnızca kapatma düğmesi kalsın. Aynı durum sonuç sayfalarındaki modal
kullanımında da varsa orada da düzelt.

## 2. Ana sonuç satırı satır kalemlerinde de tekrarlıyor

`components/decision-checks/DecisionReceipt.jsx` — ana sonuç `metrics[]`
içinden seçiliyor ama o metrik satır kalemleri listesinden çıkarılmıyor.
Ekranda "Mevcut reklam sonrası katkı" hem listede hem ana satırda duruyor.

Yapılacak: ana sonuç olarak seçilen metrik, satır kalemleri listesinden
**filtrelensin**. Aynı etiket iki kez basılmasın.

## 3. Fiş modalı çok dar, fişin üstü görünmüyor

`pages/Dashboard.jsx:908` → `size="sm"` (400px). Fiş sığmıyor, modal içi dikey
kaydırma çıkıyor ve açılışta fişin üst bloğu (terazi ikonu, "KARAR FİŞİ"
etiketi, tarih) ekranın dışında kalıyor. Fişin görsel etkisi tam da orada.

Yapılacak:
- Modal boyutunu **`md`** yap (560px) — fiş rahat sığsın.
- Fiş modal içinde **üstten hizalı** başlasın ve açılışta üst bloğu görünür
  olsun; içerik uzunsa kaydırma fişin içinde değil modal gövdesinde olsun,
  ama açılış konumu her zaman en üst.
- Mobilde tam genişlik, kenar boşluğu dar.

## 4. Kurslar sayfasında sayfa başlığı yok

`pages/CoursesPage` doğrudan arama kutusuyla başlıyor; diğer sayfalarda
(`--font-size-page-title` ile) `h1` var. Tutarsız.

Yapılacak: **tek bir kural belirle ve hepsine uygula.** Öneri: üst barda sayfa
adı zaten yazdığı için sayfa içi `h1`'ler kaldırılsın; yerine yalnızca tek
satır açıklama (`--font-size-page-intro`) kalsın. Hangi kuralı seçersen seç,
Kurslar / Kayıtlarım / Karar Araçları / Finans Merkezi / Bilgi Nesneleri /
Haberler / Model Kütüphanesi'nde **aynı** olsun. Erişilebilirlik için görünmez
bir `h1` (`sr-only`) bırakılabilir.

## 5. Ders sayfasındaki koyu panelin pahı geniş yüzeyde çentik gibi duruyor

`CoursePlayerPage` üst bloğundaki `DarkPanel`, sayfa genişliğinde bir şerit
olduğu için sağ üst köşedeki 18px pah imza değil, kesik/çentik gibi okunuyor.

Yapılacak: `DarkPanel`'e **isteğe bağlı** bir "pahsız" varyant ekle
(ör. `bevel={false}` prop'u). Geniş şerit kullanımında pah kapatılsın; dar
kartlarda (Ana Sayfa'daki üç panel) mevcut haliyle kalsın. Altın hairline ve
iç yansıma her iki varyantta da korunsun.

Ayrıca aynı panelin içindeki "Kurs ilerlemesi" çubuğu koyu zeminde çok düşük
kontrastlı — dolgu rengini açık tona (`--success-bg` veya `--sidebar-text`)
çek, ray rengini de biraz açarak görünür kıl.

---

## 6. Kategori filtresi yalnızca o sayfadaki kursları görüyor

`pages/CoursesPage.jsx:127` →
`const categories = [...new Set(courses.map(c => c.category).filter(Boolean))]`

`courses` yalnızca o anki sayfanın 6 kursu. Katalogda 84 kurs ve 6+ kategori
var ama açılır menüde sadece 2 seçenek çıkıyor. Aynı hata üstteki
"N alanda M kurs" satırındaki alan sayısını da yanlış gösteriyor.

**Backend DEĞİŞTİRİLMEYECEK.** Çözüm frontend'de:
- Sayfa ilk yüklendiğinde, kategori listesini toplamak için ayrı çağrı(lar) yap:
  `pageSize=50` ile sayfa 1, `total > 50` ise sayfa 2, ... `total` bitene kadar.
- Toplanan kategorileri bileşen state'inde **bir kez** sakla; sayfa/filtre
  değişiminde tekrar çekme.
- Bu liste yalnızca filtre seçeneklerini ve "N alanda" sayısını beslesin;
  kartlar yine sayfalanmış `pageSize=6` çağrısından gelsin.
- Bu çağrılar başarısız olursa filtre menüsü mevcut sayfadan türetilen listeye
  düşsün (bozulmasın), sessizce.

## 7. "Devam ettiğin kurslar" kartları boşluklu duruyor

Kayıt endpoint'i (`GET /enrollments/me`) yalnızca `courseTitle`,
`courseCategory`, `courseLevel`, `courseLessonCount`, `progress`, `status`
döndürüyor — **açıklama ve süre yok.** Kart aynı ızgara kartı bileşeni olduğu
için açıklama yerinde boşluk kalıyor.

Yapılacak: bu bölüm için **ayrı, kompakt bir kart varyantı** kullan.
- Rozetler + başlık + "N ders" + ilerleme çubuğu + "Devam Et" butonu.
- Açıklama ve "Kurs çıktısı" kutusu için yer AYIRMA — böylece boşluk oluşmaz.
- Kart yüksekliği ızgara kartından kısa olacak, bu normaldir.
- Veri uydurma; açıklama/süre çekmek için ek istek yapma.

## 8. "Kurs çıktısı" kutusu tekrar dolgun olsun

Önceki turda "kompaktlaştır" demiştim — **bu talimat geri alındı.**
Onaylanan tasarımda bu kutu belirgin ve dolgun; kursun ne kazandırdığını
söylediği için kartın en değerli parçası.

Yapılacak (yalnızca ızgara görünümündeki "Tüm kurslar" kartlarında):
- Punto ve iç boşluğu eski dolgun haline döndür.
- 2 satır değil, **3 satırda** kırp.
- Mint/açık yeşil zemin ve küçük ikonlu "Kurs çıktısı:" etiketi korunsun.
- Liste görünümünde yine gizli kalsın.
- Kartlar farklı yükseklikte olursa `margin-top: auto` ile butonlar yine
  hizalı kalsın.

---

## Kurallar (değişmedi)

- Turuncu: sayfa başına en fazla bir ana CTA.
- Bordo: yalnızca risk / uyarı / yıkıcı işlem.
- Sabit hex yazma, hep `var(--token)`.
- Yeni keyframe yazma.
- Tailwind EKLEME. Yeni görsel EKLEME.
- Sahte veri hardcode etme.

## Bitince

```
npm run build
npm test
```

## Raporla

- Değiştirilen dosyalar
- Sayfa `h1`'leri için hangi kuralı seçtin ve hangi sayfalara uyguladın
- `DarkPanel` pahsız varyantının CoursePlayerPage'de kullanılıp kullanılmadığı
- Kategori listesi kaç çağrıyla toplanıyor, kaç kategori bulundu
- Devam eden kurs kartının kompakt varyantında hangi alanlar var
- Build ve test sonucu
