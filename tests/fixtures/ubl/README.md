# UBL-TR fatura örnekleri

Bu klasördeki dosyalar **Gelir İdaresi Başkanlığı'nın resmî örnekleri**;
elle yazılmadı, olduğu gibi alındı.

Kaynak: `https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/UBL-TR1.2.1_Paketi.zip`
İndirme tarihi: 23.08.2026 · SHA-256: `cb583941b8a8a239c59902c6bc455c0f75d48f2bb81d7d3fbe1ae827f981f7db`

## Neden gerçek dosyalar

Kendi yazdığım örneğe göre yazılan bir ayrıştırıcı yalnız kendi
örneğimi okur. Paketteki 28 fatura taranınca üç varsayım yanlış çıktı:

1. **Vade zorunlu değil** — `PaymentDueDate` yalnız 4/28 dosyada var
2. **Kimlik hep VKN değil** — `TCKN` ve `MERSISNO` da geçiyor, biri hiç
   kimlik taşımıyor
3. **Unvan hep `PartyName` altında değil** — gerçek kişide
   `Person/FirstName + FamilyName`

## Dosyalar

| Dosya | Ne için |
|---|---|
| `TemelFaturaOrnegi.xml` | Gerçek kişi alıcı (Person), TCKN, vade var. Alıcının altında TESISATNO/SAYACNO tuzağı da burada |
| `TicariFaturaOrnegi.xml` | İki taraf da VKN, vade var |
| `ISTISNA-1.xml` | **USD** fatura; alıcının hiç kimliği yok |
| `OZELMATRAH.xml` | TCKN alıcı, vadesiz |
| `Irsaliye-Ornek1.xml` | e-İrsaliye — geçerli UBL ama fatura DEĞİL, reddedilmeli |
| `KabulUygulamaYanitiOrnegi.xml` | Uygulama yanıtı — reddedilmeli |
| `CizimFormati-FaturaDegil.xml` | GİB'den değil. Ürün sahibinin "e-fatura" diye gönderdiği Canva baskı çıktısından kısaltıldı: geçerli XML ama fatura verisi yok. Ayrıştırıcının bunu reddettiğini korur |
