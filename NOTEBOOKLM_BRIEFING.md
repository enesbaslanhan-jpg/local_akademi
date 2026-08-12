# NotebookLM Çalışma Paketi — Kurs İçeriklerinin Altın Standarda Çekilmesi

## Önce sıralama (bunu atlama)

NotebookLM'e içerik vermeden önce veritabanı düzeni bitmeli. Aksi halde orada
yaptığın iş, sonradan değişen kategori/kurs yapısıyla uyumsuz kalır.

```
1. npm run courses:merge-categories              (dry-run, çıktıyı oku)
2. npm run courses:merge-categories -- --apply
3. npm run courses:consolidate                   (dry-run, çıktıyı oku)
4. npm run courses:consolidate -- --apply
5. npm run courses:export                        (8 dosya üretir)
```

5. adımdan sonra `exports/kurslar/` içinde **8 markdown dosyası + 00-ozet.md**
olacak. NotebookLM'e verilecek olan bunlar.

---

## NotebookLM'e yüklenecek kaynaklar

| # | Dosya | Neden |
|---|---|---|
| 1–8 | `exports/kurslar/*.md` (8 kategori dosyası) | Mevcut içerik |
| 9 | `KNOWLEDGE_QUALITY_STANDARD_V2.md` | Altın standart — 10 zorunlu bileşen |
| 10 | `KURS_KATEGORI_ESLEME.md` | Yeni kurs/kategori yapısı |

Toplam 10 kaynak. NotebookLM'in kaynak limitine rahat sığar.

`00-ozet.md`'yi yüklemene gerek yok — içeriği 8 dosyada zaten var, tekrar
yüklemek atıfları bulandırır.

---

## Gerçekçi beklenti

NotebookLM **toplu yeniden yazma aracı değil.** Kaynaklara dayalı soru-cevap
ve analiz yapar. 67 kursu tek komutla yeniden yazmasını isteme — yüzeysel ve
tekrarlı çıktı verir.

Doğru kullanım iki aşamalı:

- **Aşama 1 — Denetim (toplu yapılabilir):** hangi kursun standarttaki hangi
  bileşeni eksik. Bu, NotebookLM'in güçlü olduğu iş.
- **Aşama 2 — Yeniden yazım (ders ders):** denetimde çıkan eksikleri tek tek
  kapatma. Her seferinde bir ders.

---

## Aşama 1 — Denetim promptları

Sırayla sor, çıktıları not olarak kaydet.

**1.1 — Standardı netleştir**

```
KNOWLEDGE_QUALITY_STANDARD_V2.md dosyasındaki 10 zorunlu bileşeni
madde madde listele. Her bileşen için, bir dersin o bileşeni
karşıladığını nasıl anlarım — somut bir kontrol kriteri yaz.
```

**1.2 — Kategori bazlı eksik haritası** (8 kez, her kategori için)

```
"Finans ve Nakit" dosyasındaki her kurs için, KNOWLEDGE_QUALITY_STANDARD_V2
standardındaki 10 bileşenden hangilerinin VAR hangilerinin EKSİK olduğunu
tablo halinde çıkar. Sütunlar: kurs adı, ders adı, karşılanan bileşenler,
eksik bileşenler. Tahmin yürütme — kaynakta olmayan bir şeyi "var" sayma.
```

**1.3 — Tekrar taraması**

```
Farklı kurslarda aynı kavramı anlatan, birbirinin kopyası olan dersler var mı?
Standart "aynı konu ailesindeki dersler birbirinin kopyası olamaz" diyor.
Çakışan ders çiftlerini ve hangisinin kalması gerektiğini gerekçesiyle listele.
```

**1.4 — Çözülmüş örnek denetimi**

```
Standart her içerikte "adım adım çözülmüş sayısal ya da durumsal vaka"
istiyor. Hangi derslerde çözülmüş örnek YOK? Sadece eksik olanları listele.
```

**1.5 — Görev denetimi**

```
Standart, kullanıcının kendi işletmesinde tamamlayacağı somut bir görev
istiyor. Hangi derslerdeki görev soyut, ölçülemez veya hiç yok?
```

Bu beş çıktı, yeniden yazım işinin tamamının listesi olacak.

---

## Aşama 2 — Ders yeniden yazım promptu

Denetimde eksik çıkan her ders için tek tek kullan. Çıktı formatı, geri
içe aktarılabilsin diye sabit:

```
Şu dersi KNOWLEDGE_QUALITY_STANDARD_V2'ye tam uyacak şekilde yeniden yaz:

Kurs: [kurs adı]
Ders: [ders adı]

Kurallar:
- Yalnızca kaynaklardaki bilgiye dayan. Kaynakta olmayan sayı, oran,
  yasal eşik veya başarı istatistiği UYDURMA.
- Emin olmadığın bir mevzuat/oran varsa "[DOĞRULANMALI]" etiketiyle işaretle.
- Hedef kitle: Türkiye'de esnaf, KOBİ sahibi, girişimci. Akademik dil kullanma.
- Örnekler Türkiye bağlamında olsun (TL, KDV, e-Fatura, KOSGEB vb.).
- Hayalî örnekleri açıkça "Örnek senaryo:" diye etiketle.

Şu yapıda üret:

## [Ders adı]

### Öğrenme hedefleri
- (ölçülebilir üç madde)

### Kısa cevap
(iki-üç cümle)

### Kavramın kapsamı
(ne olduğu + benzer kavramlardan farkı)

### Formül / karar modeli
(formül, sınıflandırma veya karar ağacı)

### Çözülmüş örnek
(adım adım, sayısal)

### Sonucu nasıl yorumlarsın
(karar kuralları — hangi değer ne anlama gelir)

### Sık yapılan üç hata
1. Hata — neden olur — nasıl düzeltilir
2. ...
3. ...

### Senin görevin
(kullanıcının kendi işletmesinde tamamlayacağı somut iş)

### Flashcard (3 adet)
Ön: ... / Arka: ...

### Quiz (3 soru)
Soru · şıklar · doğru cevap · neden doğru

### Kaynaklar
- Kaynak — hangi iddiayı destekliyor
```

---

## Dikkat edilecekler

**Uydurma sayı riski en büyük tehlike.** Standart "doğrulanmamış başarı
oranları kullanılmaz" diyor. Prompt'taki `[DOĞRULANMALI]` etiketi kuralını
her seferinde tekrarla; NotebookLM kaynak dışına çıkmaya meyilli değildir
ama boşluğu doldurma eğilimi vardır.

**Mevzuat ve oranlar.** KDV oranları, e-Fatura eşikleri, KOSGEB destek
tutarları, SGK yükümlülükleri — bunların hepsi değişken. NotebookLM'in
ürettiği her sayıyı yayına almadan önce resmî kaynaktan doğrula.

**Ders sayısını artırmasına izin verme.** "Bu kursa şu dersleri de eklemeli"
önerisi gelirse ayrı not olarak sakla, doğrudan uygulama. Kurs yapısı
`KURS_KATEGORI_ESLEME.md` ile sabitlendi.

**Çıktıyı biriktir.** Her yeniden yazılan dersi bir markdown dosyasına
kaydet. Toplu içe aktarma için `content/` klasöründeki mevcut JSON
şemasına (`full-curriculum-v1.json`) dönüştürülmesi gerekecek — o dönüşüm
scripti, elinde yeterince yeniden yazılmış ders olunca yazılır.

---

## Sonraki adım

Aşama 1'in çıktısını (özellikle 1.2 tabloları) bana getir. Kaç dersin kaç
bileşeni eksik görünce, yeniden yazım işinin gerçek büyüklüğünü ölçer ve
toplu içe aktarma scriptini ona göre tasarlarız.
