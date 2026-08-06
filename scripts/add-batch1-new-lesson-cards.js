const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const CARDS = [
  // Ders 5 — Banka Kredisi mi, KOSGEB Desteği mi?
  {
    code: 'PC-FIN-010', title: 'Gecikmenin Fırsat Maliyeti Hesabı', type: 'quick_formula',
    shortDescription: 'Finansman kararının gecikmesinin işletmeye gerçek maliyetini hesaplayın.',
    category: 'Finansman ve Kredi Yönetimi', published: true, kos: ['CUR-124-01'],
    contentJson: {
      mainContent: 'Bir yatırımın gecikmesi nedeniyle kaybedilecek katkıyı, satış tutarıyla kâr tutarını karıştırmadan hesaplayın.',
      formula: 'Gecikmenin Fırsat Maliyeti = Kaybedilecek Satış Katkısı + Müşteri Kaybı + Gecikme Cezaları + Diğer Ek Maliyetler',
      warning: 'Sipariş tutarının tamamı kâr değildir; ürün maliyeti, işçilik, sevkiyat, garanti, vergi ve finansman giderleri çıkarılmadan hesap yapılmamalı.',
      keyTakeaway: 'Toplam finansman maliyetini yalnızca faizle değil, bu fırsat maliyetiyle birlikte karşılaştırın.'
    }
  },
  {
    code: 'PC-FIN-011', title: 'Banka Kredisi vs KOSGEB Karar Matrisi Kontrolü', type: 'checklist',
    shortDescription: 'İki finansman kaynağını karar vermeden önce aynı kriterlerle kontrol edin.',
    category: 'Finansman ve Kredi Yönetimi', published: true, kos: ['CUR-124-01'],
    contentJson: {
      mainContent: '"Devlet desteği bedavadır, banka kredisi pahalıdır" varsayımıyla karar vermeyin.',
      checklistItems: [
        'Toplam geri ödeme (yalnızca faiz değil, tüm masraf ve yükümlülükler) hesaplandı mı?',
        'Yatırımın gelir üretmeye başlaması ile kredi taksitlerinin başlangıcı zaman olarak karşılaştırıldı mı?',
        'KOSGEB program şartları (sektör, ölçek, gider kalemi, başvuru dönemi) güncel kılavuzdan doğrulandı mı?',
        'Destek başvurusu reddedilirse alternatif finansman planı var mı?'
      ],
      warning: 'Program koşulları ve banka teklifleri zaman içinde değişebilir; güncel kılavuz ve yazılı geri ödeme planı kontrol edilmeden karar verilmemeli.'
    }
  },
  // Ders 8 — Kredi Kartı ve Ticari Kredi Riskini Ölç
  {
    code: 'PC-FIN-012', title: 'Borç Karşılama Oranı Hesabı', type: 'quick_formula',
    shortDescription: 'Serbest nakdinizin toplam borç ödemesini kaç kat karşıladığını hesaplayın.',
    category: 'Finansman ve Kredi Yönetimi', published: true, kos: ['CUR-125-01'],
    contentJson: {
      mainContent: 'Kısa vadeli borçlanma araçlarını (kredi kartı, ticari kredi, faktoring) tek tek değil, toplam borç servisi üzerinden değerlendirin.',
      formula: 'Borç Karşılama Oranı = Serbest Nakit ÷ Toplam Aylık Borç Ödemesi',
      warning: 'Oran 1,25 güvenlik eşiğinin altındaysa yeni borçlanma riskli kabul edilir.',
      keyTakeaway: 'Kötü senaryoda (nakit düşüşünde) oranın hâlâ 1 üzerinde kalıp kalmadığını ayrıca kontrol edin.'
    }
  },
  {
    code: 'PC-FIN-013', title: 'Kısa Vadeli Borçlanma Riski Kontrolü', type: 'checklist',
    shortDescription: 'Yeni bir kredi kartı limiti veya ticari krediye geçmeden önce kontrol edin.',
    category: 'Finansman ve Kredi Yönetimi', published: true, kos: ['CUR-125-01'],
    contentJson: {
      mainContent: 'Kredi kartı ve ticari kredi kolay erişilebilir olduğu için hızlı büyüyen bir borç yüküne dönüşebilir.',
      checklistItems: [
        'Mevcut tüm kısa vadeli borç ödemeleri (kredi kartı asgari/tam, ticari kredi taksiti) tek tabloda toplandı mı?',
        'Efektif yıllık maliyet (yalnızca aylık oran değil) hesaplandı mı?',
        'Nakit rezervi en az üç aylık toplam taksiti karşılıyor mu?',
        'Kötü senaryoda (nakit girişinde düşüş) borç servisi hâlâ karşılanıyor mu?'
      ],
      warning: 'Yalnızca asgari ödeme yapılan kredi kartı bakiyeleri, görünürdeki aylık oranın çok üzerinde bir efektif maliyete ulaşabilir.'
    }
  },
  // Ders 10 — Sadakat Programı Kurmalı mıyım?
  {
    code: 'PC-MKT-010', title: 'Sadakat Programı Pilot Karar Kontrolü', type: 'checklist',
    shortDescription: 'Sadakat programını tüm işletmeye yaymadan önce pilot sonuçlarını kontrol edin.',
    category: 'Pazarlama ve Müşteri Sadakati', published: true, kos: ['CUR-126-01'],
    contentJson: {
      mainContent: 'Sadakat programının kararını tüm müşteri tabanına yaymadan önce kontrol grubuyla test edin.',
      checklistItems: [
        'Program maliyeti (indirim, puan, ödül) ürün katkısından karşılanıyor mu?',
        'Pilot grup ile kontrol grubu arasında tekrar satın alma oranı karşılaştırıldı mı?',
        'Programın kişisel veri işleme (KVKK/İYS) yükümlülükleri karşılanıyor mu?',
        'Pilot sonrası program tüm müşteri tabanına yayıldığında maliyet sürdürülebilir mi?'
      ],
      warning: 'Kontrol grubu olmadan yapılan ölçüm, doğal tekrar satın alma davranışını programın etkisi sanabilir.'
    }
  },
  {
    code: 'PC-MKT-011', title: 'Sadakat Programı Hızlı Fizibilite Hesabı', type: 'quick_formula',
    shortDescription: 'Program maliyetinin ek katkıyla karşılanıp karşılanmadığını hesaplayın.',
    category: 'Pazarlama ve Müşteri Sadakati', published: true, kos: ['CUR-126-01'],
    contentJson: {
      mainContent: 'Programın ürettiği ek katkıyı, program maliyetiyle (indirim + işletme gideri) karşılaştırın.',
      formula: 'Program Net Katkısı = (Pilot Grubun Ek Tekrar Satın Alma Katkısı) − (Program İndirimi + Program İşletme Gideri)',
      keyTakeaway: 'Net katkı negatifse veya kontrol grubuna göre anlamlı fark yoksa, program bu haliyle tüm müşteri tabanına yayılmamalı.'
    }
  },
  // Ders 12 — Tekrar Satın Almayı Artıran Deneyim Tasarımı
  {
    code: 'PC-MKT-012', title: 'Temas Noktası Maliyet-Katkı Kontrolü', type: 'checklist',
    shortDescription: 'Müşteri yolculuğundaki her temas noktasının maliyetini ve katkısını ayrı değerlendirin.',
    category: 'Satış ve Müşteri Yönetimi', published: true, kos: ['CUR-127-01'],
    contentJson: {
      mainContent: 'Deneyim iyileştirmesi maliyetsiz değildir; her temas noktasının kendi maliyeti ve tekrar satın almaya katkısı ayrı ölçülmelidir.',
      checklistItems: [
        'İyileştirilecek temas noktası (teslimat, destek, iletişim vb.) net tanımlandı mı?',
        'Bu temas noktasının maliyeti (zaman, araç, personel) hesaplandı mı?',
        'Kohort bazında (aynı dönemde alışveriş yapan müşteri grubu) tekrar satın alma oranı ölçülüyor mu?',
        'İyileştirme sonrası kohort, önceki kohortla karşılaştırıldı mı?'
      ],
      warning: 'Tüm temas noktalarını aynı anda değiştirmek, hangi değişikliğin etkili olduğunu belirlemeyi imkânsız kılar.'
    }
  },
  {
    code: 'PC-MKT-013', title: 'Kohort Tekrar Satın Alma Oranı Hesabı', type: 'quick_formula',
    shortDescription: 'Belirli bir dönemde alışveriş yapan müşteri grubunun tekrar satın alma oranını hesaplayın.',
    category: 'Satış ve Müşteri Yönetimi', published: true, kos: ['CUR-127-01'],
    contentJson: {
      mainContent: 'Genel "tekrar satın alma oranı" yerine, aynı dönemde alışveriş yapan müşteri grubunu (kohort) takip edin.',
      formula: 'Kohort Tekrar Satın Alma Oranı (%) = (Belirli Dönemde Tekrar Alışveriş Yapan Müşteri Sayısı ÷ Kohorttaki Toplam Müşteri Sayısı) × 100',
      keyTakeaway: 'Farklı kohortları (deneyim değişikliği öncesi/sonrası) karşılaştırmadan, tek bir dönemlik oran iyileşmeyi göstermez.'
    }
  },
  // Ders 15 — Stok Takip Sistemi Kurmalı mıyım?
  {
    code: 'PC-OPS-010', title: 'Ölü Stok Yükü Hesabı', type: 'quick_formula',
    shortDescription: 'Satılmayan stokun toplam ekonomik yükünü, yalnızca satın alma bedeliyle sınırlamadan hesaplayın.',
    category: 'Dijitalleşme ve Teknoloji', published: true, kos: ['CUR-128-01'],
    contentJson: {
      mainContent: 'Satılmayan stokun etkisi yalnızca satın alma bedeli değildir; bağlı sermaye, depolama ve değer kaybı da eklenmelidir.',
      formula: 'Ölü Stok Yükü = Bağlı Sermaye Maliyeti + Depolama + Hasar/Bozulma + Değer Kaybı + Elden Çıkarma Maliyeti',
      warning: 'Bağlı sermaye maliyetinde rastgele bir piyasa faizi kullanmak yerine işletmenin kendi kredi maliyeti veya özkaynak hedef getirisi esas alınmalı.',
      keyTakeaway: 'Ölü stok yükü, yeni bir stok takip sisteminin geri dönüş süresi hesabına mutlaka dahil edilmeli.'
    }
  },
  {
    code: 'PC-OPS-011', title: 'Stok Sistemi Geçiş İhtiyacı Sinyalleri', type: 'checklist',
    shortDescription: 'Excel veya basit takipten ERP/WMS düzeyine geçiş ihtiyacını gösteren belirtileri kontrol edin.',
    category: 'Dijitalleşme ve Teknoloji', published: true, kos: ['CUR-128-01'],
    contentJson: {
      mainContent: 'Stok sorununun her zaman yazılım eksikliğinden kaynaklanmadığını unutmayın — önce süreç disiplinini kontrol edin.',
      checklistItems: [
        'Satış kanallarındaki kullanılabilir stok bilgisi birbiriyle tutarlı mı?',
        'Stokta olmayan ürün için sipariş oluşuyor mu?',
        'Sayım farkları açıklanabiliyor mu, yoksa tekrarlı bir şekilde belirsiz mi kalıyor?',
        'Ürünün hangi rafta/depoda olduğu personel tarafından biliniyor mu?'
      ],
      warning: '"Sayım farkı %2\'yi aşınca mutlaka yazılım alınır" gibi evrensel bir eşik kullanılmamalı — yüksek değerli küçük ürün gruplarında daha düşük bir fark bile önemli olabilir.'
    }
  }
];

async function seed() {
  for (const cardDef of CARDS) {
    console.log(`\n${cardDef.code} — ${cardDef.title}`);
    if (!apply) { console.log('  (dry run — not written)'); continue; }

    let card = await prisma.practicalCard.findUnique({ where: { code: cardDef.code } });
    if (!card) {
      card = await prisma.practicalCard.create({ data: { code: cardDef.code, title: cardDef.title, type: cardDef.type, shortDescription: cardDef.shortDescription, category: cardDef.category, published: cardDef.published } });
      console.log('  ✓ card created');
    } else {
      card = await prisma.practicalCard.update({ where: { code: cardDef.code }, data: { title: cardDef.title, type: cardDef.type, shortDescription: cardDef.shortDescription, category: cardDef.category, published: cardDef.published } });
      console.log('  ♻ card updated');
    }

    const existingVersion = await prisma.practicalCardVersion.findFirst({ where: { practicalCardId: card.id }, orderBy: { version: 'desc' } });
    const newVersionNum = existingVersion ? existingVersion.version + 1 : 1;
    await prisma.practicalCardVersion.create({ data: { practicalCardId: card.id, version: newVersionNum, status: 'published', contentJson: cardDef.contentJson } });
    if (existingVersion) await prisma.practicalCardVersion.updateMany({ where: { practicalCardId: card.id, version: { lt: newVersionNum } }, data: { status: 'archived' } });
    console.log(`  ✓ version ${newVersionNum} published`);

    await prisma.practicalCardKnowledgeObject.deleteMany({ where: { practicalCardId: card.id } });
    let order = 0;
    for (const koCode of cardDef.kos) {
      const ko = await prisma.knowledgeObject.findFirst({ where: { code: koCode } });
      if (!ko) { console.warn(`  ⚠ KO not found: ${koCode}`); continue; }
      await prisma.practicalCardKnowledgeObject.create({ data: { practicalCardId: card.id, knowledgeObjectId: ko.id, order: order++ } });
      console.log(`  ✓ linked to KO ${ko.code} (id ${ko.id})`);
    }
  }
}

seed().catch(e => { console.error('FATAL:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
