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
