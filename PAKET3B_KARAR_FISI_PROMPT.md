# LOCAL KARAR — PAKET 3B: KARAR FİŞİ

Karar sonucunu, saklanabilir ve yazdırılabilir bir "fiş" artefaktına dönüştürmek.

Backend, route, veri modeli ve API sözleşmesi DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

---

## İş 0 — main.css'te kalan iki global sızıntı (önce bunu yap)

Paket 3A'da `header` seçicisinin CSS Module'lere sızdığı bulundu ve `.app header`
olarak kapsandı. Aynı türden **iki seçici daha** duruyor:

- `styles/main.css:118` → `input, select, textarea { width: 100%; padding: 12px; ... }`
- `styles/main.css:132` → `label { display: block; margin: 12px 0 6px; ... }`

Bunlar tüm uygulamaya sızıyor: her `input`'a `width: 100%` veriyor (onay
kutularını ve satır içi girdileri bozar), her `label`'a `display: block`
veriyor (onay kutusu + etiket yan yana düzenlerini kırar).

Yapılacak:
- İkisini de `nav` ve `header` gibi `.app` altına kapsa.
- Kural içinde kalan sabit hex varsa (`#cfd6e2` gibi) `var(--token)`'a çevir.
- Bu değişiklikten sonra form içeren sayfaların (Ayarlar, Onboarding, karar
  araçları formu, admin formları) girdileri hâlâ düzgün görünüyor mu kontrol et.
  Bozulan yer varsa ilgili modülde açık genişlik/padding tanımı ekle —
  global kuralı geri getirme.

## İş 1 — Karar Fişi bileşeni

Yeni: `components/decision-checks/DecisionReceipt.jsx` + `.module.css`

Bu, kararın **özet artefaktı**: kısa, okunur, saklanabilir, yazdırılabilir.
Mevcut detaylı sonuç sayfasının yerini ALMAZ; onun yanında durur.

Görünüm — **fildişi kağıt** (koyu değil):
- `--white` kağıt yüzey, ince `--border` kenarlık, belirgin ama yumuşak gölge
  (`--shadow-lg`) — karanlık zeminden ayrılsın.
- **Sağ üst köşe kesik** (`DarkPanel`'deki `--panel-bevel` ile aynı pah,
  aynı imza dili — ama açık yüzeyde).
- **Alt kenar tırtıklı** (gerçek fiş hissi). CSS ile: tekrarlayan konik/radyal
  gradyan `mask-image`. Görsel dosya kullanma.
- Üstte: daire içinde terazi ikonu (lucide `Scale`, `--primary-light` daire,
  `--brand-ink` ikon — **turuncu değil**), yanında "KARAR FİŞİ" etiketi
  (`--font-size-page-eyebrow`, harf aralıklı, `--text-light`) ve altında tarih.
- Ardından kararın başlığı (aracın adı / sorusu).
- **Satır kalemleri**: etiket solda, değer sağda, aralarında ince ayırıcı.
  Kaynak: `calculationOutput.metrics` (girdi yankısı olanlar dahil — burada
  detay göstermek doğru).
- Ana sonuç satırı diğerlerinden ayrı: üstünde çizgi, kalın, daha büyük punto.
- Altında **karar manşeti**: yuvarlak onay/uyarı ikonu + `decisionLabel`,
  altında `summary`. Renk tonu: olumlu → zeytin, dikkat → hardal,
  olumsuz → bordo.
- En altta aksiyon satırı — dikey ikon + etiket biçiminde:
  **Yazdır** (çalışacak), Kaydet / Paylaş / Not Ekle (devre dışı görünümlü,
  `title` ile "yakında"). Var olmayan işlevi çalışıyormuş gibi gösterme.

Açılış hareketi — **keskin ve hızlı**:
- Mevcut `fichOpen` keyframe'i kullan; süresi `--dur-slow`'u aşmasın.
- Açılışla birlikte fiş yüzeyinde **tek seferlik mirror sweep** geçsin
  (`mirrorSweep` keyframe'i zaten var). Açık yüzeyde olduğu için
  `--sweep-tint` yerine daha düşük opaklıkta bir ton kullan; parlama
  abartılı olmasın.
- `prefers-reduced-motion` altında ikisi de kapalı.

Kurallar:
- Turuncu YOK (sayfanın ana CTA'sı başka yerde).
- Bordo yalnızca olumsuz karar tonunda.
- Fişin kendisinde glass YOK — kağıt yüzey. Arkasındaki modal örtüsü zaten
  bulanık, o yeterli.

## İş 2 — Fişi sonuç sayfasına bağla (ayna şeritli tetikleyici)

Dosyalar: `components/decision-checks/StructuredDecisionTool.jsx`,
`ProfitabilityDecisionTool.jsx`

- Sonuç ekranının üst kısmına, mevcut koyu hero'nun altına **tam genişlikte
  koyu bir bar** ekle: sol tarafta kare ikon karosu, ortada
  **"Karar fişini görüntüle"**, sağda chevron.
- Bu bar `DarkPanel` bileşenini `sweep` açık şekilde kullansın — yani hover'da
  ayna şeridi geçsin. Yeni bir koyu yüzey tipi icat etme, mevcut imza
  panelini kullan.
- Tıklanınca `DecisionReceipt` mevcut `Modal` içinde açılsın; arka plan
  bulanık ve koyulaşmış olsun (Modal'ın mevcut overlay'i bunu zaten yapıyor,
  gerekiyorsa blur miktarını biraz artır).
- Detaylı analiz bölümleri olduğu gibi kalsın, silinmesin.

Not: Ana Sayfa'daki "Son Karar Sonucu" koyu kartı da aynı fişi açabilir.
Zahmetsizse bağla; değilse mevcut davranışı (sonuç sayfasına gitme) koru ve
raporda belirt.

## İş 3 — Yazdırılabilir çıktı

- `@media print` bloğu yaz (fiş modülünün kendi CSS'inde veya
  `styles/print.css` olarak — hangisini seçtiğini raporla).
- Yazdırmada: sidebar, üst bar, AI Mentor balonu, modal arka planı, aksiyon
  satırı ve tüm gölge/animasyonlar gizlensin.
- Yalnızca fiş basılsın; siyah metin, beyaz zemin, kenarlıklar ince gri.
  Koyu zeminleri yazdırma (mürekkep israfı).
- Sayfa altına küçük "LocalKarar" imzası ve tarih.
- "Yazdır" butonu `window.print()` çağırsın.

## İş 4 — Sonuç sayfası metrik kartları

Şu an hardal/haki zeminde duruyorlar ve kart sistemiyle uyuşmuyorlar.
`--white` zemin + `--border` kenarlığa çevir. Anlam renkleri (olumlu zeytin,
olumsuz bordo) yalnızca değerin kendisinde kalsın, zeminde değil.

---

## Kurallar (değişmedi)

- Turuncu: sayfa başına tek ana CTA.
- Bordo: yalnızca risk / uyarı / olumsuz sonuç.
- Sabit hex yazma, hep `var(--token)`.
- Yeni keyframe yazma.
- Tailwind EKLEME. Yeni görsel/stok görsel EKLEME.
- Sahte veri hardcode etme; alan yoksa o satırı gösterme.
- Mobilde fiş tek kolon, yatay scroll oluşmasın.

## Bitince

```
npm run build
npm test
```

## Raporla

- Yeni oluşturulan dosyalar
- Fişte hangi alanlar hangi snapshot alanından geliyor
- Tetikleyici barın `DarkPanel` + sweep ile yapılıp yapılmadığı
- Açılış animasyonunun süresi ve sweep'in açık yüzeydeki opaklığı
- Print CSS'i nereye koydun ve ne gizleniyor
- İş 0'dan sonra bozulan form var mıydı, nasıl çözüldü
- Ana Sayfa'daki fiş kartı modalı açıyor mu, yoksa hâlâ sayfaya mı gidiyor
- Build ve test sonucu
- Veri olmadığı için gösterilemeyen fiş alanları
