/*
 * KARAR ARACI REHBER SAYFALARI — İÇERİK (14.10.2026).
 *
 * Uygulamadaki karar araçlarının her biri için, arama sorusuyla eşleşen
 * herkese açık bir bilgi sayfası: soru, formül, çözümlü örnek, sonucu okuma,
 * sık hatalar, SSS. Taslak ve gerekçe: Masaüstü/SEO-sayfa-taslaklari.md.
 *
 * 🔴 ÖRNEK SAYILARI ELLE YAZILMADI, ARACIN KENDİ HESABINDAN ALINDI ve
 * `dogrulama` alanı bunu KANITLIYOR: `tests/karar-rehberi-ornekleri.test.ts`
 * her örnek için sunucudaki gerçek hesap fonksiyonunu (`calculateStructuredDecisionTool`)
 * `dogrulama.girdi` ile çalıştırır, metrikleri ve sonuç etiketini buradakilerle
 * karşılaştırır ve her sayının sayfa metninde GEÇTİĞİNİ denetler. Araç mantığı
 * değişirse test kırılır; sayfada eski sayı kalamaz.
 *
 * ⚠️ Resmî ve sık değişen rakamlar (pazaryeri komisyonu, işveren prim yükü)
 * YAZILMADI; örneklerde "örnek değer" diye açıkça belirtildi. Mali/hukuki konuda
 * (yeni personel) "genel bilgilendirme" notu var.
 *
 * Başlık ve açıklamalar `config/sayfa-meta.js` tablosunda
 * (`/karar-araclari/<slug>`), sunucu ham HTML'e oradan yazıyor.
 */

export const KARAR_REHBERI_ONEK = '/karar-araclari/'

export const KARAR_REHBERLERI = {
  'indirim-yapabilir-miyim': {
    etiket: 'İndirim kararı',
    baslik: 'Bu indirimi yapabilir miyim?',
    giris: 'İndirim satışı artırır ama kâr, fiyattan değil fiyattan maliyet çıkınca kalandan oluşur. Maliyet sabit kaldığı için küçük görünen bir indirim kârın büyük bölümünü götürebilir. İndirime girmeden önce üç şeyi bilmen gerekir: indirimden sonra ürün başına ne kalıyor, satışın kaç adet olması lazım ve hangi indirim oranından sonra zarar ediyorsun.',
    formuller: [
      'İndirimli fiyat = Mevcut fiyat × (1 − indirim oranı)',
      'Ürün katkısı = Fiyat − maliyet − fiyat × komisyon oranı',
      'Kampanya başabaş adedi = Mevcut aylık toplam katkı ÷ indirimli ürün katkısı',
    ],
    ornek: {
      girdiler: [
        ['Satış fiyatı', '1.000 ₺'], ['Ürün başı toplam maliyet', '600 ₺'], ['Komisyon', '%15'],
        ['Planlanan indirim', '%20'], ['Mevcut aylık satış', '100 adet'], ['İndirimle beklenen artış', '%50'],
      ],
      adimlar: [
        'İndirim öncesi ürün katkısı: 1.000 − 600 − 150 = 250 ₺.',
        'İndirimli fiyat 800 ₺ olur; indirim sonrası katkı: 800 × 0,85 − 600 = 80 ₺. Ürün başı katkı yaklaşık %68 düşer.',
        'Mevcut aylık katkı 100 × 250 = 25.000 ₺. Kampanyada 150 adet × 80 = 12.000 ₺.',
        'Satış %50 artsa bile aylık katkı yarıdan aza iner. Aynı katkıya ulaşmak için 313 adet satmak gerekir (yaklaşık 3 kat).',
        'Bu ürün için maksimum güvenli indirim yaklaşık %29,4: bunun üstünde ürün başına zarar var.',
      ],
      sonuc: 'Sonuç etiketi: Sınırda. İndirim pozitif katkı bırakıyor ama beklenen satış, kaybedilen marjı karşılamıyor.',
    },
    dogrulama: {
      kod: 'DC-DISCOUNT-002',
      girdi: { salePrice: 1000, unitCost: 600, commissionRate: 15, plannedDiscountRate: 20, currentMonthlyUnits: 100, expectedSalesLiftPercent: 50 },
      etiket: 'SINIRDA',
      metrikler: { discountedPrice: 800, baseContribution: 250, discountedContribution: 80, maxSafeDiscount: 29.4, breakEvenUnits: 313 },
      senaryolar: { 'Mevcut aylık katkı': 25000, 'Kampanya aylık katkısı': 12000 },
    },
    nasilOkunur: 'Maksimum güvenli indirim, ürün başına zarara geçeceğin sınırı; kampanya başabaş adedi ise ulaşman gereken satışı gösterir. İkincisine ulaşamayacağını düşünüyorsan indirim oranını düşür ya da kampanyayı kısa tut.',
    hatalar: [
      ['Komisyonu eski fiyattan hesaplamak', 'Komisyon indirimli satış fiyatı üzerinden kesilir; eski fiyattan hesaplarsan katkıyı olduğundan farklı görürsün.'],
      ['Kargo ve paketlemeyi maliyete katmamak', 'Ürün başı maliyet yalnız alış fiyatı değil; paketleme ve taşıma gibi değişken giderleri de içermeli.'],
      ['Satış artışını ölçmeden yüksek varsaymak', 'Geçmiş kampanyalarındaki gerçek artışı kullan; yoksa düşük bir değerle dene ve sonucun nasıl değiştiğine bak.'],
    ],
    sss: [
      ['%20 indirim kârı %20 mi düşürür?', 'Hayır. Maliyet sabit olduğu için kâr çok daha fazla düşebilir; yukarıdaki örnekte ürün başı katkı %68 düşüyor.'],
      ['Hangi indirim oranı güvenlidir?', 'Ürüne bağlıdır: maliyetinin ve komisyonunun sana kalan paya oranına göre değişir. Aracın “maksimum güvenli indirim” sonucu bunu kendi rakamlarınla hesaplar.'],
      ['Beklenen satış artışını nasıl tahmin ederim?', 'Geçmiş kampanyalarındaki gerçek artışı baz al. Yoksa düşük bir artışla hesapla ve “kampanya başabaş adedi”ni gerçekçi bulup bulmadığına bak.'],
    ],
    ilgili: [['Pazaryeri komisyon hesaplayıcı', '/araclar/pazaryeri-komisyon-hesaplayici'], ['Kâr marjı ve başabaş araçları', '/hesaplamalar'], ['Tüm karar araçları', '/karar-araclari']],
  },

  'ucretsiz-kargo-hesaplama': {
    etiket: 'Ücretsiz kargo kararı',
    baslik: 'Kargo ücretsiz olabilir mi?',
    giris: '“Ücretsiz kargo” müşteriyi çeker ama taşıma bedelini sen ödersin. Bu ancak sepet tutarı yeterince yüksekse kârlıdır. Doğru soru “ücretsiz kargo verelim mi” değil, hangi sepet tutarının altında vermemeliyiz.',
    formuller: [
      'Mevcut katkı = Sepet + müşteriden alınan kargo − ürün maliyeti − komisyon − paketleme − taşıma',
      'Ücretsiz kargo katkısı = Sepet − ürün maliyeti − komisyon − paketleme − taşıma',
      'Güvenli sepet eşiği = (ürün maliyeti + paketleme + taşıma) ÷ (1 − komisyon oranı − 0,10). Araç, %10’luk asgari katkı payını güvenlik olarak ekler.',
    ],
    ornek: {
      girdiler: [
        ['Ortalama sepet', '450 ₺'], ['Sepetteki ürünlerin maliyeti', '250 ₺'], ['Komisyon', '%15'], ['Paketleme', '10 ₺'],
        ['Kargo firmasına ödenen', '60 ₺'], ['Müşteriden alınan kargo', '40 ₺'], ['Sepetteki ürün adedi', '2'],
      ],
      adimlar: [
        'Müşteri kargoyu öderse katkı: 450 + 40 − 250 − 67,5 − 10 − 60 = 102,5 ₺.',
        'Sen ödersen katkı 62,5 ₺ olur: 40 ₺ daha az.',
        'Güvenli minimum sepet: (250 + 10 + 60) ÷ 0,75 = 426,67 ₺. Ortalama sepet 450 ₺ olduğu için eşiğin üstünde.',
        'Kargo bedeli, sepetteki ürün başı katkının yaklaşık 1 ürünüyle karşılanıyor.',
      ],
      sonuc: 'Sonuç etiketi: Uygun. Ücretsiz kargo alt limitini en az 426,67 ₺ belirlemen öneriliyor.',
    },
    dogrulama: {
      kod: 'DC-FREESHIP-003',
      girdi: { basketValue: 450, basketProductCost: 250, commissionRate: 15, packagingCost: 10, carrierCost: 60, customerShippingFee: 40, itemsPerBasket: 2 },
      etiket: 'UYGUN',
      metrikler: { currentContribution: 102.5, freeContribution: 62.5, safeBasketThreshold: 426.67, coveringItems: 1 },
      senaryolar: { 'Müşteri kargoyu öder': 102.5, 'Satıcı kargoyu öder': 62.5 },
    },
    nasilOkunur: 'Güvenli minimum sepet, ücretsiz kargoyu kâr bırakarak verebileceğin en düşük sepet tutarıdır. Alt limiti bunun üstünde, yuvarlak bir tutara koymak mantıklıdır.',
    hatalar: [
      ['Kargo bedelini tek bir değer sanmak', 'Taşıma bedeli ağırlığa ya da desiye göre değişir; ortalama değer yerine en sık siparişlerinin değerini kullan.'],
      ['İade kargosunu hesaba katmamak', 'İade edilen siparişlerde gidiş ve dönüş taşıması senin üzerinde kalabilir; iade oranın yüksekse eşiği yukarı çek.'],
      ['Komisyonun neye uygulandığını doğrulamamak', 'Bazı pazaryerlerinde komisyon kargo bedelini de kapsayabilir. Satıcı panelinden doğrula.'],
    ],
    sss: [
      ['Ücretsiz kargo limitini nasıl belirlerim?', 'Güvenli sepet eşiğinin üstünde bir tutar seç. Aracın sonucu bu eşiği kendi rakamlarınla verir.'],
      ['Ücretsiz kargo her zaman zarar mı yazar?', 'Hayır; sepet yeterince yüksekse kârlıdır. Düşük sepetlerde katkıyı negatife çevirebilir.'],
      ['Komisyon oranım kargo bedelini de kapsıyor mu?', 'Pazaryerine göre değişir. Satıcı panelindeki kesinti kalemlerinden doğrula.'],
    ],
    ilgili: [['Pazaryeri komisyon hesaplayıcı', '/araclar/pazaryeri-komisyon-hesaplayici'], ['İndirim yapabilir miyim?', '/karar-araclari/indirim-yapabilir-miyim'], ['Tüm karar araçları', '/karar-araclari']],
  },

  'reklam-butcesi-artirma': {
    etiket: 'Reklam bütçesi kararı',
    baslik: 'Reklam bütçemi artırmalı mıyım?',
    giris: 'ROAS (reklama harcanan her liraya karşılık gelen ciro) tek başına iyi ya da kötü demek değildir. Önemli olan, ROAS’ın senin başabaş ROAS’ının üstünde olup olmadığıdır. Başabaş ROAS, ürün katkına göre değişir.',
    formuller: [
      'ROAS = Reklam kaynaklı ciro ÷ reklam harcaması',
      'Reklam sonrası katkı = Sipariş sayısı × reklam öncesi sipariş katkısı − reklam harcaması',
      'Ek bütçe katkısı = Tahmini ek sipariş × sipariş katkısı − ek harcama',
    ],
    ornek: {
      girdiler: [
        ['Reklam harcaması', '10.000 ₺'], ['Reklam kaynaklı ciro', '40.000 ₺'], ['Reklam kaynaklı sipariş', '80 adet'],
        ['Reklam öncesi sipariş katkısı', '180 ₺'], ['Planlanan bütçe artışı', '%30'], ['Ek bütçede beklenen verim değişimi', '%−20'],
      ],
      adimlar: [
        'ROAS = 40.000 ÷ 10.000 = 4.',
        'Reklam sonrası katkı: 80 × 180 − 10.000 = 4.400 ₺.',
        'Ortalama sipariş 500 ₺, sipariş katkısı 180 ₺ olduğu için başabaş ROAS yaklaşık 2,8. ROAS’ın 4 olması bunun üstünde.',
        '%30 ek bütçe (3.000 ₺) ve verimde %20 düşüş varsayımıyla yaklaşık 19 ek sipariş gelir; ek katkı yaklaşık 456 ₺. Pozitif ama küçük.',
      ],
      sonuc: 'Sonuç etiketi: Uygun. Ek bütçeyi kademeli aç ve günlük katkı limitiyle izle.',
    },
    dogrulama: {
      kod: 'DC-ADS-005',
      girdi: { adSpend: 10000, revenueFromAds: 40000, ordersFromAds: 80, unitContributionBeforeAds: 180, conversionRate: 2, plannedIncreasePercent: 30, expectedEfficiencyChangePercent: -20 },
      etiket: 'UYGUN',
      metrikler: { currentContribution: 4400, roas: 4, breakEvenRoas: 2.8, extraContribution: 456 },
      senaryolar: { 'Mevcut bütçe': 4400, 'Ek bütçe': 456 },
    },
    nasilOkunur: 'ROAS’ı başabaş ROAS ile karşılaştır: üstündeyse reklam kâr bırakıyor. Ek bütçe katkısı küçükse ya da negatifse bütçeyi büyütmek yerine mevcut kampanyanın verimini artırmaya bak.',
    hatalar: [
      ['Organik satışı ayırmamak', 'Reklama atfedilen ciro, reklam olmasa da gelecek satışları içerebilir. Atıf penceresini ve organik payı ayrıca kontrol et.'],
      ['Sipariş katkısını komisyon ve kargodan önce almak', 'Sipariş katkısı, reklam hariç tüm değişken maliyetlerden sonraki tutar olmalı.'],
      ['Bütçe artınca verimin düşeceğini varsaymamamak', 'Ek bütçede genellikle sipariş başı verim azalır. Aracın “beklenen verim değişimi” alanıyla bunu dene.'],
    ],
    sss: [
      ['İyi ROAS kaç olmalı?', 'Evrensel bir sayı yok. Ürünün katkısına göre hesaplanan başabaş ROAS’ın üstü kârlıdır.'],
      ['Bütçeyi artırınca ROAS düşer mi?', 'Çoğu zaman evet; ek bütçede verim düşer. Bu yüzden artışı kademeli yapıp günlük izlemek mantıklıdır.'],
      ['Reklam kaynaklı ciroyu nasıl bulurum?', 'Reklam panelinin verdiği atıf rakamını kullan; atıf penceresini ve organik satış payını ayrıca kontrol et.'],
    ],
    ilgili: [['İndirim yapabilir miyim?', '/karar-araclari/indirim-yapabilir-miyim'], ['Kâr marjı ve başabaş araçları', '/hesaplamalar'], ['Tüm karar araçları', '/karar-araclari']],
  },

  'nakit-akisi-riskli-mi': {
    etiket: 'Nakit akışı kararı',
    baslik: 'Nakit akışım riskli mi?',
    giris: 'Kârlı bir işletme de nakitsizlikten zor duruma düşebilir. Sebep çoğu zaman satış değil vadedir: parayı geç tahsil edip tedarikçiye erken ödüyorsan, aradaki günlerin finansmanını kendi kasan taşır.',
    formuller: [
      'Aylık net akış = Nakit girişi − nakit çıkışı',
      'Vade etkisi = Aylık giriş × (tahsilat günü − ödeme günü) ÷ 30',
      'Runway = Mevcut nakit ÷ aylık nakit açığı',
    ],
    ornek: {
      girdiler: [
        ['Mevcut nakit', '60.000 ₺'], ['Aylık nakit girişi', '120.000 ₺'], ['Aylık nakit çıkışı', '125.000 ₺'],
        ['Ortalama tahsilat vadesi', '45 gün'], ['Ortalama ödeme vadesi', '20 gün'], ['Hedef minimum nakit tamponu', '30.000 ₺'],
      ],
      adimlar: [
        'Aylık net akış −5.000 ₺: muhasebe açısından küçük bir açık.',
        'Vade etkisi: 120.000 × (45 − 20) ÷ 30 = 100.000 ₺ vade kaynaklı finansman ihtiyacı (25 günlük fark).',
        'Düzeltilmiş dönem sonu nakit: 60.000 − 5.000 − 100.000 = −45.000 ₺.',
        'Minimum tampona göre fark: −75.000 ₺.',
      ],
      sonuc: 'Sonuç etiketi: Riskli. Önerilen adımlar: tahsilat vadesini kısaltmak ya da tedarikçi vadesini uzatmak, en az 75.000 ₺ ek tampon oluşturmak ve 13 haftalık nakit planı yapmak.',
    },
    dogrulama: {
      kod: 'DC-CASHFLOW-008',
      girdi: { openingCash: 60000, monthlyCashInflow: 120000, monthlyCashOutflow: 125000, receivableDays: 45, payableDays: 20, minimumCashBuffer: 30000 },
      etiket: 'RİSKLİ',
      metrikler: { netMonthlyFlow: -5000, timingGap: 100000, adjustedCash: -45000, bufferGap: -75000 },
      senaryolar: { 'Muhasebe akışı': 55000, 'Tahsilat vadesi sonrası': -45000 },
    },
    nasilOkunur: 'Aylık net akış küçük görünse de vade etkisi büyükse asıl risk oradadır. “Düzeltilmiş dönem sonu nakit” hedef tamponun altındaysa, satışlar yeterli olsa bile kasa ihtiyacı karşılamayabilir.',
    hatalar: [
      ['Ciroyu nakit girişi sanmak', 'Tahsil edilmemiş satış kasaya girmedi. Nakit girişi olarak yalnız tahsil edilen tutarı say.'],
      ['Yalnız ay sonu bakiyesine bakmak', 'Ay içinde ödeme günleri tahsilattan önce gelirse, ay sonu bakiyesi pozitif olsa bile ay içinde açık oluşabilir.'],
      ['Vadeyi hiç hesaba katmamak', 'Tahsilat ve ödeme vadeleri arasındaki fark, nakit ihtiyacının en büyük kalemlerinden biri olabilir.'],
    ],
    sss: [
      ['Kârlıyım ama neden paramın olmadığını nasıl anlarım?', 'Tahsilat vadesi ödeme vadesinden uzunsa aradaki farkı sen finanse ediyorsun. Aracın “vade kaynaklı finansman ihtiyacı” sonucu bunu gösterir.'],
      ['Minimum nakit tamponu ne kadar olmalı?', 'Kesin bir kural yok; sektöre ve gider yapına göre değişir. Birçok işletme aylık sabit giderlerinin birkaç katını hedefler. Önemli olan bunu bilinçli bir hedef olarak yazmak.'],
      ['Vade farkını nasıl kapatırım?', 'Tahsilatı hızlandır (peşin ya da erken ödeme kampanyası), ödeme vadesini görüşerek uzat ve nakit tamponunu büyüt.'],
    ],
    ilgili: [['Kâr marjı ve başabaş araçları', '/hesaplamalar'], ['İşletme takibi ve cari hesap', '/isletme-takibi'], ['Tüm karar araçları', '/karar-araclari']],
  },

  'yeni-personel-maliyeti': {
    etiket: 'Personel kararı',
    baslik: 'Yeni personel alabilir miyim?',
    giris: 'Brüt maaş, işverenin ödeyeceği toplamın yalnızca bir kısmıdır. Prim, yan haklar ve ek giderler eklenince yeni bir çalışanın maliyeti beklediğinden yüksek çıkar. Bu sayfa, karar vermeden önce tam aylık maliyeti ve çalışanın kendini ne zaman amorti edeceğini görmeni sağlar.',
    not: 'Bu sayfa genel bilgilendirmedir. İşveren ek yük oranını (prim ve vergi kalemleri) sen girersin; güncel oranlar ve bordro maliyetleri için mali müşavirine danış.',
    formuller: [
      'Tam istihdam maliyeti = Brüt ücret × (1 + işveren ek yük oranı) + diğer aylık gider',
      'Başabaş ek ciro = Tam maliyet ÷ ciro katkı marjı',
      'Rezerv dayanıklılığı = Nakit rezervi ÷ aylık istihdam maliyeti',
    ],
    ornek: {
      girdiler: [
        ['Aylık brüt ücret', '30.000 ₺'], ['İşveren ek yükü (örnek değer)', '%25'], ['Diğer aylık gider', '3.000 ₺'],
        ['Beklenen ek aylık ciro', '120.000 ₺'], ['Ciro katkı marjı', '%35'], ['Aylık serbest nakit', '20.000 ₺'], ['Nakit rezervi', '90.000 ₺'],
      ],
      adimlar: [
        'Tam aylık işveren maliyeti: 30.000 × 1,25 + 3.000 = 40.500 ₺.',
        'Beklenen aylık katkı: 120.000 × %35 = 42.000 ₺; net aylık etki yalnızca +1.500 ₺.',
        'Başabaş ek ciro: 40.500 ÷ 0,35 ≈ 115.714 ₺. Bu ciroya ulaşılmazsa çalışan zarar yazar.',
        'Rezerv dayanıklılığı: 90.000 ÷ 40.500 ≈ 2,2 ay.',
        'Kötü senaryoda (ek ciro %30 düşük) aylık etki −11.100 ₺ olur.',
      ],
      sonuc: 'Sonuç etiketi: Riskli. Katkı maliyeti zor karşılıyor ve nakit rezervi üç aylık maliyetin altında.',
    },
    dogrulama: {
      kod: 'DC-HIRE-006',
      girdi: { grossSalary: 30000, employerOnCostRate: 25, otherMonthlyCost: 3000, expectedMonthlyRevenue: 120000, contributionMarginRate: 35, monthlyFreeCash: 20000, cashReserve: 90000 },
      etiket: 'RİSKLİ',
      metrikler: { employmentCost: 40500, expectedContribution: 42000, breakEvenRevenue: 115714.29, reserveMonths: 2.2, monthlyImpact: 1500 },
      senaryolar: { 'Beklenen kapasite': 1500, '%30 düşük ciro': -11100 },
    },
    nasilOkunur: 'Net aylık etki küçük ya da negatifse, çalışan ancak ek ciroyu gerçekten getirirse kendini öder. Başabaş ek ciroyu gerçekçi bulup bulmadığına ve rezervin en az üç aylık maliyeti karşılayıp karşılamadığına bak.',
    hatalar: [
      ['Brüt maaşı toplam maliyet sanmak', 'İşverene maliyet; prim, yan haklar ve ek giderlerle birlikte brüt maaşın üzerindedir.'],
      ['Ek cironun kaynağını ayırmamak', 'Beklenen ciro gerçekten çalışanın katkısı mı, yoksa zaten gelecek satış mı? İkisini karıştırma.'],
      ['İlk aylardaki verimsizliği hesaba katmamak', 'Yeni çalışanın tam verime ulaşması zaman alır; ilk ayların cirosunu daha düşük gir.'],
    ],
    sss: [
      ['Bir çalışanın işverene maliyeti brüt maaşın kaç katıdır?', 'Prim ve yan haklara göre değişir; aracın “işveren ek yük oranı” alanına kendi oranını gir. Güncel oranlar için mali müşavirine danış.'],
      ['Başabaş ek ciro ne demek?', 'Çalışanın maliyetini çıkarabilmesi için işletmeye eklemesi gereken minimum aylık ciro.'],
      ['Yarı zamanlı ya da deneme dönemi için hesap değişir mi?', 'Evet; maliyeti ve beklenen cirosunu o döneme göre gir.'],
    ],
    ilgili: [['Nakit akışım riskli mi?', '/karar-araclari/nakit-akisi-riskli-mi'], ['Kâr marjı ve başabaş araçları', '/hesaplamalar'], ['Tüm karar araçları', '/karar-araclari']],
  },
}

export const KARAR_REHBERI_SLUGLARI = Object.keys(KARAR_REHBERLERI)
