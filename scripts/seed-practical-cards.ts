import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 1. Gerçek Ürün Maliyeti -> KO: `CUR-021-01`
// 2. İndirim Öncesi Kontrol -> KO: `CUR-039-01`
// 3. Başabaş Noktası -> KO: `CUR-019-04`
// 4. Brüt Kâr Marjı -> KO: `CUR-035-01`
// 5. Komisyon Maliyeti -> KO: `CUR-026-04`
// 6. Kargo Maliyeti -> KO: `CUR-025-01`
// 7. Sabit ve Değişken Gider Ayrımı -> KO: `CUR-013-02`, `CUR-014-02`
// 8. Nakit Akışı Uyarısı -> KO: `CUR-001-01`, `FIN-CASHFLOW-001`
// 9. Ciro ve Kâr Farkı -> KO: `CUR-002-03`, `FIN-REVENUE-001`
// 10. Kampanya Öncesi Kontrol Listesi -> KO: `CUR-038-01`

const CARDS = [
  {
    code: 'PC-COST-001',
    title: 'Gerçek Ürün Maliyeti',
    type: 'pricing_check',
    shortDescription: 'Ürününüzün size olan tam maliyetini hesaplayın.',
    category: 'Maliyet ve Fiyatlandırma',
    published: true,
    kos: ['CUR-021-01'],
    contentJson: {
      mainContent: 'Gerçek ürün maliyeti sadece hammadde ve işçilikten ibaret değildir. Görünmeyen maliyetler kârlılığınızı doğrudan etkiler.',
      formula: 'Birim Maliyet = Hammadde + İşçilik + Ambalaj + (Sabit Giderler / Üretim Miktarı)',
      example: 'Eğer üretiminiz 1000 adetse ve aylık kira gideriniz 10.000 TL ise, birim başına 10 TL sabit gider payı eklemelisiniz.',
      warning: 'Pazar yeri komisyonları ve kargo maliyetleri bu formüle dahil edilmemiştir.',
      keyTakeaway: 'Tüm maliyet kalemlerini birime yansıtmadığınızda gizli zararlar edersiniz.',
      primaryAction: {
        label: 'Karlılığımı Kontrol Et',
        code: 'open_profitability_check'
      }
    }
  },
  {
    code: 'PC-DISCOUNT-001',
    title: 'İndirim Öncesi Kontrol',
    type: 'checklist',
    shortDescription: 'İndirim yapmadan önce kâr marjınızın yeterli olup olmadığını doğrulayın.',
    category: 'Maliyet ve Fiyatlandırma',
    published: true,
    kos: ['CUR-039-01'],
    contentJson: {
      mainContent: 'Bilinçsiz yapılan indirimler, cironuzu artırırken işletmenizi nakit krizine sokabilir.',
      checklistItems: [
        'Mevcut kâr marjınızı hesapladınız mı?',
        'İndirim sonrası başabaş noktanızı biliyor musunuz?',
        'İndirim, beklenen satış hacmini karşılayacak kadar kârlı mı?'
      ],
      warning: '%20 kâr marjıyla çalışan bir işletme, %10 indirim yaptığında aynı kârı elde etmek için satışlarını iki katına çıkarmalıdır.',
      primaryAction: {
        label: 'İndirim Etkisini Analiz Et',
        code: 'open_profitability_check'
      }
    }
  },
  {
    code: 'PC-BREAKEVEN-001',
    title: 'Başabaş Noktası',
    type: 'quick_formula',
    shortDescription: 'Zarar etmemek için kaç adet ürün satmanız gerektiğini öğrenin.',
    category: 'Finansal Analiz',
    published: true,
    kos: ['CUR-019-04'],
    contentJson: {
      mainContent: 'Başabaş noktası, toplam gelirlerinizin toplam giderlerinizi (sabit ve değişken) tam olarak karşıladığı noktadır.',
      formula: 'Başabaş Miktarı = Toplam Sabit Giderler / (Birim Satış Fiyatı - Birim Değişken Gider)',
      example: 'Aylık sabit gideriniz 50.000 TL, ürün satış fiyatınız 200 TL ve değişken gideriniz 100 TL ise: 50.000 / (200 - 100) = 500 adet satmalısınız.',
      keyTakeaway: 'Bu noktanın altındaki her satış zarardır, üzerindeki her satış kârdır.'
    }
  },
  {
    code: 'PC-MARGIN-001',
    title: 'Brüt Kâr Marjı',
    type: 'quick_formula',
    shortDescription: 'Satışlarınızdan elde ettiğiniz brüt kârlılığı ölçün.',
    category: 'Finansal Analiz',
    published: true,
    kos: ['CUR-035-01'],
    contentJson: {
      mainContent: 'Brüt kâr marjı, işletmenizin temel faaliyetlerinden ne kadar verimli kâr elde ettiğini gösterir.',
      formula: 'Brüt Kâr Marjı = ((Satış Geliri - Satışların Maliyeti) / Satış Geliri) * 100',
      warning: 'Brüt kârınız yüksek olsa da, operasyonel giderleriniz (pazarlama, maaşlar) yüksekse net kârınız düşük olabilir.',
      keyTakeaway: 'Marjlarınızı düzenli olarak takip ederek fiyatlandırma stratejinizi optimize edin.'
    }
  },
  {
    code: 'PC-COMMISSION-001',
    title: 'Komisyon Maliyeti',
    type: 'example_calculation',
    shortDescription: 'Pazar yeri ve ödeme sistemleri komisyonlarının etkisini hesaplayın.',
    category: 'Maliyet ve Fiyatlandırma',
    published: true,
    kos: ['CUR-026-04'],
    contentJson: {
      mainContent: 'Online satışlarda platform ve ödeme geçidi kesintileri kâr marjını doğrudan ve sert biçimde azaltır.',
      example: 'Satış fiyatınız 100 TL. Pazar yeri komisyonu %15, ödeme altyapısı kesintisi %2. Toplam kesinti 17 TL. Ürün maliyetiniz 70 TL ise kârınız sadece 13 TL olur.',
      checklistItems: [
        'Komisyon oranları satış fiyatı üzerinden mi, KDV dahil mi hesaplanıyor?',
        'Gizli hizmet bedelleri var mı?'
      ]
    }
  },
  {
    code: 'PC-SHIPPING-001',
    title: 'Kargo Maliyeti',
    type: 'pricing_check',
    shortDescription: 'Kargo masraflarını doğru hesaplayın ve fiyatlandırın.',
    category: 'Lojistik',
    published: true,
    kos: ['CUR-025-01'],
    contentJson: {
      mainContent: 'Kargo giderleri, özellikle desi ağırlıklı ürünlerde ve iadelerde kârlılığı en çok etkileyen faktördür.',
      warning: 'Ücretsiz kargo sunuyorsanız, kargo bedelini ürünün taban fiyatına eklemeyi unutmayın.',
      checklistItems: [
        'Ortalama desi miktarınızı biliyor musunuz?',
        'İade kargo masraflarını maliyetinize yansıttınız mı?'
      ]
    }
  },
  {
    code: 'PC-COSTTYPE-001',
    title: 'Sabit ve Değişken Gider Ayrımı',
    type: 'comparison',
    shortDescription: 'Hangi giderlerinizin satışa bağlı olduğunu anlayın.',
    category: 'Finansal Analiz',
    published: true,
    kos: ['CUR-013-02', 'CUR-014-02'],
    contentJson: {
      mainContent: 'Maliyetleri kontrol altına almak için önce onları doğru sınıflandırmak gerekir.',
      example: 'Sabit Gider: Kira, personel maaşı, yazılım abonelikleri. \nDeğişken Gider: Hammadde, kargo, komisyon oranları.',
      keyTakeaway: 'Satışlarınız dursa bile sabit giderleri ödemek zorundasınız.'
    }
  },
  {
    code: 'PC-CASHFLOW-001',
    title: 'Nakit Akışı Uyarısı',
    type: 'cash_flow_warning',
    shortDescription: 'Kârlı olmak ile nakde sahip olmak arasındaki fark.',
    category: 'Nakit Yönetimi',
    published: true,
    kos: ['CUR-001-01', 'FIN-CASHFLOW-001'],
    contentJson: {
      mainContent: 'Kâğıt üzerinde çok kârlı görünebilirsiniz, ancak tahsilatlarınızı yapamazsanız faturalarınızı ödeyemezsiniz.',
      warning: 'Satışın yapıldığı an kâr doğar, paranın bankaya girdiği an nakit doğar.',
      checklistItems: [
        'Müşterilerin ortalama ödeme vadesi ne kadar?',
        'Tedarikçilere ödeme vadeniz, tahsilat vadenizden kısa mı?'
      ],
      keyTakeaway: 'İşletmeleri kârın azlığı değil, nakdin bitmesi batırır.'
    }
  },
  {
    code: 'PC-REVENUE-PROFIT-001',
    title: 'Ciro ve Kâr Farkı',
    type: 'common_mistake',
    shortDescription: 'Ciro büyüklüğünün kârlılık demek olmadığını anlayın.',
    category: 'Finansal Analiz',
    published: true,
    kos: ['CUR-002-03', 'FIN-REVENUE-001'],
    contentJson: {
      mainContent: 'Cironun (toplam satış geliri) yüksek olması başarının tek ölçütü değildir. Asıl olan günün sonunda kalan net kârdır.',
      example: 'İşletme A: 1.000.000 TL ciro, %2 kâr marjı (Kâr: 20.000 TL). \nİşletme B: 500.000 TL ciro, %10 kâr marjı (Kâr: 50.000 TL). \nİşletme B çok daha sağlıklıdır.',
      warning: 'Ciroyu artırmak için yapılan agresif indirimler kâr marjını eritebilir.'
    }
  },
  {
    code: 'PC-CAMPAIGN-001',
    title: 'Kampanya Öncesi Kontrol Listesi',
    type: 'checklist',
    shortDescription: 'Pazarlama kampanyalarınızdan zarar etmemek için kontrol listesi.',
    category: 'Satış ve Pazarlama',
    published: true,
    kos: ['CUR-038-01'],
    contentJson: {
      mainContent: 'Kampanyalar doğru planlanmadığında stoklarınızı eritirken kasanızı da boşaltabilir.',
      checklistItems: [
        'Kampanya maliyetini (reklam, indirim) hesapladınız mı?',
        'Stok miktarınız kampanya talebini karşılayacak düzeyde mi?',
        'İade oranının kampanya döneminde artabileceğini öngördünüz mü?',
        'Lojistik ve paketleme altyapınız yoğun talebe hazır mı?'
      ],
      primaryAction: {
        label: 'Detaylı Kontrol Et',
        code: 'open_decision_check'
      }
    }
  },
  // KO 446 — Rekabet Analizi
  {
    code: 'PC-COMP-001',
    title: 'Rakibi Yalnızca Benzer Şirket Sanma Hatası',
    type: 'common_mistake',
    shortDescription: 'Pazardaki alternatifleri listelerken yalnızca aynı işi yapan firmalara odaklanma hatası.',
    category: 'Girişimcilik',
    published: true,
    kos: ['CUR-089-01'],
    contentJson: {
      mistake: 'Rakip yalnızca benzer şirketler sanılır; müşterinin Excel, kâğıt-kalem veya hiçbir şey yapmama eylemsizliği gözden kaçırılır.',
      correctApproach: 'Müşterinin "biz olmasak aynı ihtiyacı hangi manuel yöntemle çözerdi?" sorusuna tek bir araç veya yöntem adı yazın; bu genellikle gerçek rakibinizdir.',
      keyTakeaway: 'Ana alternatif çoğu zaman başka bir şirket değil; mevcut alışkanlık veya eylemsizliktir.'
    }
  },
  {
    code: 'PC-COMP-002',
    title: 'Rakip İddiası Kanıt Kaydı',
    type: 'checklist',
    shortDescription: 'Rakip hakkındaki güçlü/zayıf yön iddialarını kanıtla desteklemek için dört alanlık kayıt şablonu.',
    category: 'Girişimcilik',
    published: true,
    kos: ['CUR-089-01'],
    contentJson: {
      mainContent: 'Rekabet matrisine yazılan hiçbir güçlü veya zayıf yön iddiası varsayım olarak bırakılamaz. Tekil yorumlar kesin zayıflık sayılmaz.',
      checklistItems: [
        'Kanıt Türü (Görüşme / Yorum / Deneme / Sayfa)',
        'Kaynak Adı',
        'Tarih',
        'Bulgu Tipi (Tekil Olay mı / Tekrarlanan Kalıp mı?)'
      ],
      keyTakeaway: 'Kanıtın tarihi, kaynağı ve tekrarlanma sıklığı sorgulanmalıdır.'
    }
  },
  {
    code: 'PC-COMP-003',
    title: 'Statüko Engelini Teşhis Etme',
    type: 'quick_application',
    shortDescription: 'Müşteri ürünü beğenmesine rağmen mevcut yöntemini değiştirmediğinde statüko engelini yazma.',
    category: 'Girişimcilik',
    published: true,
    kos: ['CUR-089-01'],
    contentJson: {
      mainContent: 'Müşterinin eylemsizliği genellikle değişim riski veya öğrenme zahmetinden kaynaklanır.',
      quickSteps: [
        'Müşterinin mevcut yöntemini bir cümleyle yazın.',
        'Değiştirmeme gerekçesini dinleyin.',
        'Gerekçeyi tek cümlelik statüko engeli olarak kaydedin.',
        'Öğrenme zahmeti ve değişim riskini azaltacak ilk adımı belirleyin.'
      ],
      keyTakeaway: 'Statüko engeli, ürün özelliğinden çok müşterinin mevcut düzenini bozmaya dair algısıdır.'
    }
  },
  // KO 453 — Farklılaştırma
  {
    code: 'PC-DIFF-001',
    title: '4 Filtreli Mesaj Kontrolü',
    type: 'checklist',
    shortDescription: 'Farklılaştırma mesajını sahaya sürmeden önce dört süzgeçten geçirme.',
    category: 'Girişimcilik',
    published: true,
    kos: ['CUR-090-03'],
    contentJson: {
      mainContent: 'Mesajınızı sırasıyla dört süzgeçten geçirin: açıklık, özgünlük, uygulanabilirlik, kanıtlanabilirlik.',
      checklistItems: [
        'Açıklık: Tek okumada anlaşılıyor mu?',
        'Özgünlük: Rakipler de aynen söyleyebilir mi?',
        'Uygulanabilirlik: Operasyonel gücüm her siparişte sunmaya yetiyor mu?',
        'Kanıtlanabilirlik: Gözlem, süreç veya kayıtla kanıtlanıyor mu?'
      ],
      keyTakeaway: "Dört süzgecin tamamına 'Evet' yanıtı verdiğinizi doğrulayın; 'Hayır' alanları spesifikleştirin."
    }
  },
  // KO 457 — Fiyat Stratejisi
  {
    code: 'PC-PRICE-001',
    title: 'Formül ve Girdi Ayrımı',
    type: 'quick_formula',
    shortDescription: 'Minimum sürdürülebilir fiyat hesaplanırken TL girdileri paya, yüzde kesintileri paydaya yerleştirme.',
    category: 'Fiyatlandırma',
    published: true,
    kos: ['CUR-091-02'],
    contentJson: {
      mainContent: 'Minimum sürdürülebilir fiyat = (Birim ürün/hizmet maliyeti + birim sabit gider payı + adet başına diğer TL giderler) ÷ (1 − satış fiyatına bağlı toplam kesinti oranı).',
      formula: 'Minimum Fiyat = (Birim Maliyet + Sabit Gider Payı + Diğer TL Giderler) ÷ (1 − Toplam Kesinti Oranı)',
      example: 'Birim maliyet 400 TL, sabit pay 600 TL, diğer gider 100 TL, toplam kesinti %5 ise: 1.100 ÷ 0.95 ≈ 1.158 TL.',
      keyTakeaway: 'TL giderleri paya, yüzde kesintileri paydaya ekleyin.',
      primaryAction: {
        label: 'Karlılığımı Kontrol Et',
        code: 'open_profitability_check'
      }
    }
  },
  {
    code: 'PC-PRICE-002',
    title: 'Satış Hacmi Duyarlılığı',
    type: 'quick_formula',
    shortDescription: 'Satış adedi düştükçe birim başına düşen sabit gider payının artışını hesaplama.',
    category: 'Fiyatlandırma',
    published: true,
    kos: ['CUR-091-02'],
    contentJson: {
      mainContent: 'Satış adedi düştükçe birim başına düşen sabit gider payı yükselir ve minimum sürdürülebilir fiyat yukarı kayar.',
      formula: 'Yeni Birim Sabit Pay = Toplam Sabit Giderler ÷ Yeni Satış Adedi',
      example: 'Aylık sabit gider 12.000 TL; 20 müşteride 600 TL, 14 müşteride 857 TL sabit pay çıkar. Minimum fiyat sırasıyla 1.158 TL ve 1.429 TL olur.',
      keyTakeaway: 'Düşük hacim senaryosunda aynı fiyat zarar ettirebilir.'
    }
  },
  {
    code: 'PC-PRICE-003',
    title: 'Davranışsal Fiyat Testi',
    type: 'quick_application',
    shortDescription: 'Fiyat adaylarının geçerliliğini müşterinin ödeme, satın alma ve yenileme davranışıyla doğrulama.',
    category: 'Fiyatlandırma',
    published: true,
    kos: ['CUR-091-02'],
    contentJson: {
      mainContent: 'Müşterinin "fiyat uygun" beyanı doğrulama değildir; gerçek doğrulama ödeme, satın alma ve yenileme davranışıdır.',
      quickSteps: [
        'İlk test fiyatını (örn. 2.000 TL) bir müşteri grubuna sunun.',
        'Daha yüksek test fiyatını (örn. 3.500 TL) başka bir gruba sunun.',
        'Her iki grupta gerçek satın alma oranını kaydedin.',
        'Yenileme oranlarını takip edin ve kârlı fiyatı seçin.'
      ],
      keyTakeaway: 'Fiyat, müşterinin cüzdanıyla doğrulanır.'
    }
  },
  // KO 461 — Dağıtım Kanalları
  {
    code: 'PC-CHANNEL-001',
    title: 'Kanal Başına Birim Katkı Formülü',
    type: 'formula',
    shortDescription: 'Farklı satış kanallarının net finansal getirisini kıyaslama.',
    category: 'Satış Kanalları',
    published: true,
    kos: ['CUR-092-01'],
    contentJson: {
      mainContent: 'Birim Katkı = Müşterinin ödediği KDV temeli tutarlı satış fiyatı − birim ürün/hizmet değişken maliyeti − kanal kesintilerinin TL karşılığı − siparişe bağlı lojistik ve diğer değişken giderler.',
      formula: 'Birim Katkı = KDV Temeli Fiyat − Birim Değişken Maliyet − Kanal Kesintileri (TL) − Lojistik/Değişken Giderler',
      example: 'Satış fiyatı 100 TL (KDV hariç), birim maliyet 40 TL, komisyon 15 TL, kargo 8 TL, iade maliyeti 5 TL → Birim Katkı = 32 TL.',
      keyTakeaway: 'Satış fiyatından güncel satıcı paneli kesintilerini ve lojistik giderlerini düşerek net katkıyı hesaplayın.'
    }
  },
  {
    code: 'PC-CHANNEL-002',
    title: 'Pilot Sipariş Üst Sınırı Hesaplama',
    type: 'quick_application',
    shortDescription: 'Pilot satış planında işletmeyi riske atmayacak güvenli üst sınır belirleme.',
    category: 'Satış Kanalları',
    published: true,
    kos: ['CUR-092-01'],
    contentJson: {
      mainContent: 'Pilot sınırı, kapasite ve bütçe sınırlarından düşük olanıdır.',
      quickSteps: [
        'Günlük güvenli teslimat kapasitesini yazın.',
        'Test süresini (gün) belirleyin.',
        'Kapasite sınırı = günlük kapasite × test süresi.',
        'Riske ayrılan bütçeyi ve sipariş başına riske edilen maliyeti yazın.',
        'Bütçe sınırı = bütçe ÷ sipariş başı maliyet.',
        'İki sınırdan düşük olanı pilot üst sınırı olarak kaydedin.'
      ],
      keyTakeaway: 'Bu hesaplama öğrenme yeterliliğini değil, güvenli üst sınırı verir.'
    }
  },
  {
    code: 'PC-CHANNEL-003',
    title: 'Pilot İzleme Metrikleri Kontrolü',
    type: 'checklist',
    shortDescription: 'Pilot sürecinde yalnızca satış adedine değil, dört metriği eş zamanlı izleme.',
    category: 'Satış Kanalları',
    published: true,
    kos: ['CUR-092-01'],
    contentJson: {
      mainContent: 'Pilot sürecinde yalnız satış adedine bakılmaz; birim katkı, teslimat başarısı, iade nedenleri ve müşteri hizmeti yükü eş zamanlı izlenir.',
      checklistItems: [
        'Net Birim Katkı (TL) hesaplanıyor mu?',
        'Zamanında Teslimat Başarısı (%) ölçülüyor mu?',
        'İade Nedenleri Dağılımı kaydediliyor mu?',
        'Müşteri Hizmeti Yükü (gelen destek talebi sayısı) takip ediliyor mu?'
      ],
      keyTakeaway: 'Dört metrik, kanalın sadece ciro değil gerçek sürdürülebilirliğini gösterir.'
    }
  },

  // --- Pilot kurs: "Var Olan İşletmeyi Devralmadan Önce Kontrol Et" (v5, 2026-08-05) ---
  // 1. Mali Doğrulama Kontrol Listesi -> KO: CUR-121-01
  // 2. Devir Sözleşmesi Risk Uyarısı -> KO: CUR-121-02
  // 3. Kâr Çarpanı ile Hızlı Değerleme -> KO: CUR-121-03
  // 4. Devir Sonrası 90 Gün Aksiyon Planı -> KO: CUR-121-04
  {
    code: 'PC-ACQ-001',
    title: 'Mali Doğrulama Kontrol Listesi',
    type: 'checklist',
    shortDescription: 'Devren satılık bir işletmede satıcının anlattığı rakamla resmi belgeleri karşılaştırın.',
    category: 'İşi Satın Alma ve Yatırım Değerlendirmesi',
    published: true,
    kos: ['CUR-121-01'],
    contentJson: {
      mainContent: 'Satıcının sözlü rakamı, devir kararının girdisi olamaz. Karar, yalnızca resmi belgelerle doğrulanmış rakamlara dayanmalıdır.',
      checklistItems: [
        'Son 12 ayın KDV beyannameleri alındı mı?',
        'Gelir/kurumlar vergisi beyannamesi ile satıcının sözlü kâr rakamı karşılaştırıldı mı?',
        'En az 6 aylık banka hesap dökümü istendi mi?',
        'Sözlü rakam ile beyan edilen rakam arasındaki fark yüzdesi hesaplandı mı?'
      ],
      warning: 'Fark %20\'nin üzerindeyse, nedeni açıklanana kadar hiçbir fiyat teklifi bu rakamlara dayandırılmamalı.',
      keyTakeaway: 'Doğrulanmamış bir rakam üzerinden verilen fiyat teklifi, satıcının en iyimser senaryosunu kabul etmek demektir.',
      primaryAction: {
        label: 'Kredi Taksitini Karşılayabilir miyim?',
        code: 'open_loan_check'
      }
    }
  },
  {
    code: 'PC-ACQ-002',
    title: 'Devir Sözleşmesi Risk Uyarısı',
    type: 'common_mistake',
    shortDescription: 'Ticari işletme devrinde borçların da devralana geçebileceğini unutmayın.',
    category: 'İşi Satın Alma ve Yatırım Değerlendirmesi',
    published: true,
    kos: ['CUR-121-02'],
    contentJson: {
      mainContent: 'Türk Ticaret Kanunu\'na göre, aksi sözleşmede açıkça yazılmadıkça, işletmeyle ilgili borç ve yükümlülükler de devralana geçer.',
      mistake: '"Ben sadece dükkânı ve malı aldım, eski borçlar satıcının sorunu" varsayımıyla sözleşmeyi imzalamak.',
      correctApproach: 'Devir kapsamına giren/girmeyen her kalemi (demirbaş, kiracılık hakkı, ticaret unvanı, borçlar) sözleşmede tek tek yazılı hâle getirin; ayrıca icra takibi ve tedarikçi borcu sorgusu yapın.',
      warning: 'Sözleşmede açıkça hariç tutulmayan bir borç, devir sonrası alıcının sorunu olabilir.',
      keyTakeaway: 'Sözlü "borcum yok" beyanı, TTK karşısında hiçbir koruma sağlamaz.'
    }
  },
  {
    code: 'PC-ACQ-003',
    title: 'Kâr Çarpanı ile Hızlı Değerleme',
    type: 'quick_formula',
    shortDescription: 'Devren satılık bir işletmenin istenen fiyatının makul olup olmadığını hızlıca test edin.',
    category: 'İşi Satın Alma ve Yatırım Değerlendirmesi',
    published: true,
    kos: ['CUR-121-03'],
    contentJson: {
      mainContent: 'Küçük işletme devirlerinde en hızlı ilk kontrol, doğrulanmış yıllık net kârın bir çarpanla (genelde 1,5–3 kat) çarpılmasıdır.',
      formula: 'Tahmini Değer Aralığı = Doğrulanmış Yıllık Net Kâr × (1,5 ile 3 arası çarpan)',
      example: 'Doğrulanmış yıllık net kâr 310.000 TL ise, tahmini değer aralığı 465.000–930.000 TL arasıdır; satıcı 900.000 TL istiyorsa bu aralığın üst sınırına yakındır, gerekçe sorulmalıdır.',
      warning: 'Kâr çarpanı tek başına yeterli değildir; varlık bazlı değer ve piyasa karşılaştırmasıyla birlikte kullanılmalıdır.',
      keyTakeaway: 'Üç farklı değerleme yöntemi aynı bölgeye işaret ediyorsa, pazarlık gücünüz artar.'
    }
  },
  {
    code: 'PC-ACQ-004',
    title: 'Devir Sonrası 90 Gün Aksiyon Planı',
    type: 'quick_application',
    shortDescription: 'İşletmeyi devraldıktan sonraki ilk 90 günü riskten çıkaracak somut adımlar.',
    category: 'İşi Satın Alma ve Yatırım Değerlendirmesi',
    published: true,
    kos: ['CUR-121-04'],
    contentJson: {
      mainContent: 'Devir sonrası en sık yapılan hata, geçiş sürecini plansız bırakmaktır. İlk 90 gün, işletmenin hayatta kalıp kalmayacağını çoğu zaman belirler.',
      quickSteps: [
        '1. hafta: resmi devir tescili, tedarikçi ve banka bilgilendirmesi, tabela/unvan güncellemesi.',
        '2-3. hafta: eski sahiple birlikte çalışma dönemi, personelle bireysel görüşmeler, sadık müşterilere tanıtım.',
        '4-12. hafta: doğrulanmış hedef ciroyla gerçekleşen ciroyu haftalık karşılaştırın.'
      ],
      warning: 'Sözleşmede tanıtım süresi ve rekabet etmeme maddesi yoksa, müşteri ve rekabet riski açık kalır.',
      keyTakeaway: 'Sapma erken fark edilirse (mevsimsel mi, müşteri kaybı mı) düzeltme şansı yüksektir.',
      primaryAction: {
        label: 'Nakit Akışım Riskli mi?',
        code: 'open_cashflow_check'
      }
    }
  }
]

async function seed() {
  console.log('🌱 Pratik Kartlar Seed İşlemi Başlıyor...')

  for (const cardDef of CARDS) {
    let card = await prisma.practicalCard.findUnique({ where: { code: cardDef.code } })

    if (!card) {
      card = await prisma.practicalCard.create({
        data: {
          code: cardDef.code,
          title: cardDef.title,
          type: cardDef.type,
          shortDescription: cardDef.shortDescription,
          category: cardDef.category,
          published: cardDef.published,
        }
      })
      console.log(`✅ Kart oluşturuldu: ${card.code}`)
    } else {
      card = await prisma.practicalCard.update({
        where: { code: cardDef.code },
        data: {
          title: cardDef.title,
          type: cardDef.type,
          shortDescription: cardDef.shortDescription,
          category: cardDef.category,
          published: cardDef.published,
        }
      })
      console.log(`♻️ Kart güncellendi: ${card.code}`)
    }

    // Version management
    const existingVersion = await prisma.practicalCardVersion.findFirst({
      where: { practicalCardId: card.id },
      orderBy: { version: 'desc' }
    })

    const newVersionNum = existingVersion ? existingVersion.version + 1 : 1
    
    // Create new version and set it as published
    await prisma.practicalCardVersion.create({
      data: {
        practicalCardId: card.id,
        version: newVersionNum,
        status: 'published',
        contentJson: cardDef.contentJson as any
      }
    })

    // Update previous versions to archived
    if (existingVersion) {
      await prisma.practicalCardVersion.updateMany({
        where: {
          practicalCardId: card.id,
          version: { lt: newVersionNum }
        },
        data: { status: 'archived' }
      })
    }
    
    // Link KOs
    // first clean existing links
    await prisma.practicalCardKnowledgeObject.deleteMany({
      where: { practicalCardId: card.id }
    })
    
    let orderIndex = 0;
    for (const koCode of cardDef.kos) {
      const ko = await prisma.knowledgeObject.findFirst({ where: { code: koCode } })
      if (ko) {
        await prisma.practicalCardKnowledgeObject.create({
          data: {
            practicalCardId: card.id,
            knowledgeObjectId: ko.id,
            order: orderIndex++
          }
        })
      } else {
        console.warn(`⚠️ UYARI: KO bulunamadı: ${koCode}`);
      }
    }
  }

  console.log('✅ Seed işlemi başarıyla tamamlandı.')
}

seed()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
