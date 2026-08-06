# PİLOT KURS (onay bekliyor — veritabanına henüz yazılmadı)

**Kategori (yeni, aday):** İşi Satın Alma ve Yatırım Değerlendirmesi
**Kurs:** Var Olan İşletmeyi Devralmadan Önce Kontrol Et
**Hedef kullanıcı:** Yatırım yapmayı veya iş kurmayı değerlendiren kullanıcı, girişimci
**Ders sayısı:** 4
**Durum:** Taslak — onaylanırsa `scripts/seed-...ts` ile veritabanına işlenecek, önce hiçbir DB yazımı yapılmadı.

---

## Ders 1 — Satıcının Anlattığı Hikâye ile Kasadaki Rakam Aynı mı?

İlan metni her zaman aynı cümleyle biter: "Devren satılık, sabit müşterisi var, kârlı işletme." Bu cümle bir gerçeklik değil, bir pazarlık açılışıdır. Sizin işiniz, satıcının anlattığıyla defterdeki rakamın örtüşüp örtüşmediğini, kapıyı çalmadan önce anlamaktır.

Bir örnekle başlayalım. Bursa'da bir kırtasiye-fotokopi işletmesine talip olduğunuzu düşünün. Satıcı size "ayda net 45.000 TL kâr bırakıyor" diyor. Bu cümle üç farklı şey anlamına gelebilir: (1) beyan edilen vergi matrahına göre net kâr, (2) satıcının kendi tahmini "cepte kalan" para, (3) kira ve elektrik gibi sabit giderler hâlâ ödenmeden önceki rakam. Üçü de "net kâr" diye anlatılır, üçü de farklı bir işletme değeri anlamına gelir.

### Hangi belgeyi isteyeceğinizi bilin

Sözle anlatılan hiçbir rakam, belgeyle doğrulanmadan pazarlık masasına girmemeli:

- Son 12 ayın **KDV beyannameleri** — gerçek aylık ciro dalgalanmasını gösterir, "iyi ay" seçilerek anlatılmaz.
- **Gelir/kurumlar vergisi beyannamesi** — yıllık beyan edilen kâr, satıcının sözlü rakamıyla karşılaştırılır.
- **Banka hesap dökümü** (en az 6 ay) — nakit girişleri beyan edilen ciroyla tutarlı mı?
- Varsa **POS/yazarkasa Z raporu özeti** — günlük satışın gerçek dağılımı.

Bu dört belge birbirini doğrulamıyorsa (örneğin banka girişi beyan edilen cironun çok altındaysa), bu tek başına "işletme kötü" anlamına gelmez — ama neden farklı olduğu açıklanana kadar hiçbir rakama güvenmeyin.

### Kırtasiye örneğinde ne çıktı?

Satıcının sözlü rakamı: aylık 45.000 TL net kâr.
KDV beyannamelerinden çıkan ortalama aylık ciro: 210.000 TL.
Vergi beyannamesindeki yıllık net kâr: 310.000 TL → aylık ortalama 25.833 TL.

Fark, sözlü rakamla beyan edilen rakam arasında %43. Bu, satıcının yalan söylediği anlamına gelmiyor olabilir — kayıt dışı satış, mevsimsel dalgalanma ya da iyimser yuvarlama söz konusu olabilir. Ama bu farkı görmeden fiyat pazarlığına oturursanız, satıcının en iyimser senaryosu üzerinden fiyat vermiş olursunuz.

### Bu dersten çıkacak çalışma kaydınız

**Mali Doğrulama Kontrol Listesi**: istenen 4 belge, alınıp alınmadığı, beyan edilen rakamla sözlü rakam arasındaki fark yüzdesi, ve bu farkın kabul edilebilir bir açıklaması olup olmadığı. Bu kayıt, üçüncü derste fiyat değerlendirmesinin girdisi olacak.

> Bu işletmeyi bir krediyle finanse etmeyi düşünüyorsanız, aylık taksitin gerçek (beyan edilen, sözlü değil) nakit akışını nasıl etkileyeceğini **Kredi Taksitini Karşılayabilir miyim?** karar aracıyla ayrıca kontrol edin.

### Kaynaklar

1. [SCORE — Buying a Business: Due Diligence Checklist](https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist)
2. [FindLaw — Buying a Business Due Diligence Checklist](https://www.findlaw.com/smallbusiness/starting-a-business/buying-a-business-due-diligence-checklist.html)

*Kaynaklar Ağustos 2026'da bağlantı ve konu uygunluğu açısından kontrol edilmiştir. Vergi ve muhasebe kayıtlarının doğrulanması için mutlaka bir mali müşavir görüşü alın.*

---

## Ders 2 — Devraldığınızda Borçları da Devralabilirsiniz: Sözleşmeleri Okuyun

Burada çoğu ilk kez işletme alan kişinin bilmediği, ama sonucu ağır bir hukuki gerçek var: **Türk Ticaret Kanunu'na göre bir ticari işletme devredildiğinde, işletmeyle ilgili borç ve yükümlülükler de — aksi kararlaştırılmadıkça — devralana geçer.** Yani "ben sadece dükkânı ve malı aldım, eski borçlar satıcının sorunu" varsayımı, sözleşmede açıkça yazılmadığı sürece yanlıştır.

### Neyi devraldığınızı sözleşmede tek tek sayın

Devir sözleşmesi kapsamına şunlar girer, aksi açıkça belirtilmedikçe:

- duran malvarlığı (demirbaş, ekipman),
- işletme değeri (marka bilinirliği, müşteri portföyü),
- **kiracılık hakkı** — eğer dükkân kiralıksa, kira sözleşmesinin devredilip devredilemeyeceği ayrı bir konudur; ev sahibinin onayı gerekebilir,
- ticaret unvanı ve varsa diğer fikri mülkiyet hakları,
- işletmeye özgülenmiş borç ve yükümlülükler.

Bunlardan biri veya birkaçı devrin dışında bırakılabilir — **ama bu, sözleşmede açıkça yazılmalıdır.** "Ne varsa hepsi bende kalır" diyen bir satıcının sözlü beyanı, TTK karşısında hiçbir şey ifade etmez.

### Somut kontrol adımı: borç ve dava sorgusu

Devralmadan önce üç sorguyu ayrı ayrı yapın:

1. İşletmenin adına açılmış **icra takibi** var mı? (İcra dairesinden veya avukat aracılığıyla sorgulanabilir.)
2. Tedarikçilere, kargo firmasına, elektrik/su/doğalgaz aboneliğine **açık borç** var mı? Son 3 aylık fatura ve ödeme dekontu istenmeli.
3. Kira sözleşmesinin bitiş tarihi ne zaman, devrine ev sahibi onay veriyor mu?

Kırtasiye örneğimizde satıcı "borcum yok" dedi, ama kağıt tedarikçisine 3 aylık vadeli 40.000 TL borç çıktı. Bu borç sözleşmede açıkça satıcıda bırakılmazsa, alıcı bu borcu üstlenmiş sayılabilir.

### Esnaf düzeyindeki işletmelerde fark

İşletme bir şahıs esnaf işletmesi düzeyindeyse (anonim/limited şirket değilse), devir Türk Borçlar Kanunu hükümlerine tabi olur ve esnaf sicil kaydının da devri gerekir. Bu, ticaret sicilindeki büyük işletme devrinden ayrı bir süreçtir — hangi sicile kayıtlı olduğunuzu (esnaf sicili mi, ticaret sicili mi) en başta netleştirin, çünkü devir prosedürü buna göre değişir.

### Bu dersten çıkacak çalışma kaydınız

**Hukuki ve Sözleşme Kontrol Listesi**: devir kapsamına giren/girmeyen kalemlerin sözleşmede tek tek yazılı olup olmadığı, icra/borç sorgusu sonucu, kira sözleşmesi devrinin onaylanıp onaylanmadığı. Bu belge olmadan noterde imza atmayın.

### Kaynaklar

1. [TOBB — Türk Ticaret Kanunu Tescil ve İlana Tâbi Maddeler](https://www.tobb.org.tr/Documents/ttk/ttk_tescil_ilan_maddeler.pdf)
2. [DergiPark — Türk Ticaret Kanunu Uyarınca Ticari İşletmenin Devri (madde 11 incelemesi)](https://dergipark.org.tr/tr/download/article-file/179455)
3. [Resmî Gazete — Esnaf ve Sanatkârlar Sicili Yönetmeliği](https://www.resmigazete.gov.tr/eskiler/2018/12/20181214-2.htm)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Bu ders genel bilgilendirme amaçlıdır; devir sözleşmesini imzalamadan önce mutlaka bir hukuk uzmanına danışın.*

---

## Ders 3 — Bu Fiyat Gerçekten Değerine mi Satılıyor?

Doğrulanmış rakamlarınız elinizde (Ders 1). Şimdi soru şu: satıcının istediği fiyat, bu rakamlara göre makul mü?

Küçük işletme devirlerinde en yaygın kullanılan üç yaklaşım var; hiçbiri tek başına "doğru fiyat" vermez, ama ikisi aynı bölgeye işaret ediyorsa pazarlık gücünüz artar.

### Yaklaşım 1 — Kâr çarpanı (en hızlı, esnaf ölçeğinde en yaygın)

Doğrulanmış yıllık net kârı, sektöre göre değişen bir çarpanla (genelde küçük işletmelerde 1,5–3 kat arası) çarparsınız. Kırtasiye örneğimizde doğrulanmış yıllık net kâr 310.000 TL idi. 2 kat çarpanla değer aralığı yaklaşık 465.000–620.000 TL çıkar (1,5–2 kat). Satıcının istediği fiyat 900.000 TL ise, bu aralığın belirgin şekilde üzerindedir — bu, "almayın" demek değil, "neden bu kadar yüksek?" sorusunu sormanız gerektiği anlamına gelir (belki lokasyon, belki uzun kalan kira süresi bunu açıklıyor olabilir).

### Yaklaşım 2 — Varlık bazlı değer

Demirbaş, stok ve ekipmanın ikinci el piyasa değeri toplanır, varsa borç düşülür. Bu yöntem özellikle "müşteri portföyü zayıf ama ekipman değerli" işletmelerde satıcının istediği fiyata bir taban çizer — fiyat bu tabanın çok altındaysa pazarlık payınız daha nettir.

### Yaklaşım 3 — Piyasa karşılaştırması

Aynı bölgede, benzer büyüklükte satılmış veya satılık başka işletmelerin fiyatları neyse, sizinkini onlarla kıyaslayın (esnaf odaları, sektör grupları veya emlak/işletme ilan siteleri üzerinden yaklaşık bir aralık çıkarılabilir).

### Üç yaklaşımı yan yana koyun

Kırtasiye örneği için üç yaklaşım: kâr çarpanı 465–620 bin TL, varlık bazlı 380 bin TL, piyasa karşılaştırması 500–700 bin TL bandı gösteriyor olsun. Üçü de 900 bin TL'nin belirgin altında kalıyorsa, bu tek bir yöntemin hatası değil, tutarlı bir sinyaldir.

### Bu dersten çıkacak çalışma kaydınız

**Devir Fiyatı Değerlendirme Tablosu**: üç yöntemle çıkan değer aralığı, satıcının istediği fiyat, aradaki fark ve pazarlıkta kullanacağınız somut gerekçe (örneğin "kâr çarpanına göre teklif fiyatınız X, gerekçeniz Y").

> Ödemeyi tamamen nakit değil, kısmen kredi ile yapmayı düşünüyorsanız, teklif fiyatınızı netleştirdikten sonra taksitin işletmenin gerçek nakit akışını nasıl etkileyeceğini **Nakit Akışım Riskli mi?** aracıyla test edin.

### Kaynaklar

1. [Peak Business Valuation — SBA Business Valuation Methods (piyasa/gelir/varlık yaklaşımları)](https://peakbusinessvaluation.com/sba-business-valuation-methods/)
2. [SCORE — Buying a Business: Due Diligence Checklist](https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Değerleme yöntemleri ABD küçük işletme piyasası referans alınarak anlatılmıştır; Türkiye'de sektöre özgü çarpan aralıkları için bölgenizdeki esnaf/ticaret odasına veya bir mali müşavire danışın.*

---

## Ders 4 — Devir Sonrası İlk 90 Günü Riskten Çıkarın

İşletmeyi doğru fiyata, sağlam bir sözleşmeyle devraldınız. En sık yapılan hata burada biter: "artık benim işletmem" diyip geçiş sürecini plansız bırakmak. Devirden sonraki ilk 90 gün, işletmenin hayatta kalıp kalmayacağını çoğu zaman belirler.

### Üç risk alanı

**Müşteri kaybı riski.** Sadık müşterilerin bir kısmı işletmeye değil, eski sahibine bağlıdır. Satıcıdan devir öncesi birlikte 2-3 hafta çalışmasını (tanıtım süresi) sözleşmeye madde olarak ekleyin.

**Personel kaybı riski.** Devirle birlikte çalışanların kıdem ve ihbar hakları genellikle korunur; ama personel, yeni sahibe güvenmediği için kendi isteğiyle ayrılabilir. Anahtar personelle (varsa ustabaşı, deneyimli tezgahtar) devir öncesi ayrı bir görüşme yapın.

**Rekabet riski.** Satıcı, aldığı parayla 200 metre ötede aynı işi tekrar açabilir mi? Sözleşmeye bölge ve süre belirten bir **rekabet etmeme maddesi** eklenmemişse, bu risk açık kalır.

### Geçiş planınızı üç haftaya bölün

- **1. hafta:** resmi devir işlemleri (esnaf/ticaret sicili tescili, ilan), tedarikçi ve banka bilgilendirmesi, tabela/unvan güncellemesi.
- **2-3. hafta:** eski sahiple birlikte çalışma dönemi, personelle bireysel görüşmeler, sadık müşterilere tanıtım.
- **4-12. hafta:** Ders 1'de doğruladığınız ciro rakamıyla gerçekleşen ciroyu haftalık karşılaştırın; sapma varsa nedenini (mevsimsel mi, müşteri kaybı mı) ayırt edin.

### Bu dersten çıkacak çalışma kaydınız

**Devir Sonrası Aksiyon Planı**: geçiş haftalarının takvimi, tanıtım süresi maddesinin sözleşmede olup olmadığı, rekabet etmeme maddesinin olup olmadığı, ve ilk 4 haftalık gerçekleşen cironun Ders 1'deki doğrulanmış rakamla haftalık karşılaştırması.

> İlk 90 günde ciro beklenenin altında kalırsa, bunun bir kriz mi yoksa normal dalgalanma mı olduğunu **Nakit Akışım Riskli mi?** aracıyla erken fark edin — bu dersin çıktısı olan haftalık karşılaştırma tablosu, o aracın girdisi olarak doğrudan kullanılabilir.

### Kaynaklar

1. [SCORE — Buying a Business: Due Diligence Checklist](https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist)
2. [ticaret.gov.tr — Esnaf ve Sanatkârlar](https://ticaret.gov.tr/esnaf-sanatkarlar)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Personel hakları (kıdem/ihbar) konusunda güncel iş hukuku kurallarını bir uzmanla doğrulayın.*
