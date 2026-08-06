// Adds real PracticalCard rows (+ published version + KO link) for batch 1.
// Reuses the exact upsert pattern from scripts/seed-practical-cards.ts.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const CARDS = [
  // Ders 2 — Sahada Stok ve Sayım Düzenini Kur (already has PC-RETAIL-002 checklist) — 2nd card
  {
    code: 'PC-RETAIL-005',
    title: 'Stok Fark Oranı Hesabı',
    type: 'quick_formula',
    shortDescription: 'Sayım sonucundaki sistem-fiilî stok farkını yüzdeye çevirin.',
    category: 'Stok ve Envanter',
    published: true,
    kos: ['CUR-123-02'],
    contentJson: {
      mainContent: 'Sayım sonunda çıkan fark tutarını, karşılaştırma yapılabilir bir orana çevirin.',
      formula: 'Fark Oranı (%) = (Sistem Stoğu − Fiilî Stok) ÷ Ortalama Stok Değeri × 100',
      example: 'Ortalama stok değeri 800.000 TL, sistem-fiilî fark 48.000 TL ise fark oranı 48.000 ÷ 800.000 = %6.',
      warning: 'Bu oran tek başına "yıllık kayıp oranı" değildir; dönem başı/sonu, alışlar, satışlar ve iadeler birlikte incelenmelidir.',
      keyTakeaway: 'Fark oranı yüksek çıkan ürün grubunda sayım sıklığını artırın.'
    }
  },
  // Ders 3 — Personel Vardiyasını ve Kasa Güvenini Yönet (already has PC-RETAIL-003 checklist) — 2nd card
  {
    code: 'PC-RETAIL-006',
    title: 'Ek Personel Net Fayda Hesabı',
    type: 'quick_formula',
    shortDescription: 'Vardiya değişikliğiyle eklenen personelin gerçek net faydasını hesaplayın.',
    category: 'Perakende Operasyonu',
    published: true,
    kos: ['CUR-123-03'],
    contentJson: {
      mainContent: 'Ek ciro katkısı ve azalan kasa farkını, eklenen personelin toplam maliyetiyle birlikte değerlendirin — ikisinin toplamı tek başına "net fayda" değildir.',
      formula: 'Net Fayda = (Ek Ciro Katkısı + Kasa Farkı Azalması) − Ek Personelin Toplam Aylık Maliyeti',
      example: 'Ek ciro katkısı 11.250 TL, kasa farkı azalması 3.350 TL ise toplam 14.600 TL — ancak yarı zamanlı çalışanın ücret ve yan giderleri bu tutardan düşülmeden "net fayda" ilan edilmemeli.',
      warning: 'Yeni personelin tam maliyetini (ücret + yan haklar + işveren yükü) çıkarmadan yapılan hesap yanıltıcıdır.',
      keyTakeaway: 'Bu hesap pozitif çıksa bile, personel maliyetinin işletmenin serbest nakdine etkisini ayrıca kontrol edin.'
    }
  },
  // Ders 4 — Mağaza Genişletme veya Taşıma (already has PC-RETAIL-004 quick_formula, primaryAction=open_branch_check) — 2nd card
  {
    code: 'PC-RETAIL-007',
    title: 'Yamyamlaşma Oranı Hesabı',
    type: 'quick_formula',
    shortDescription: 'Yeni şubenin mevcut şubeden çaldığı satış payını hesaplayın.',
    category: 'Perakende Operasyonu',
    published: true,
    kos: ['CUR-123-04'],
    contentJson: {
      mainContent: 'Yeni şubenin yaptığı her satış "yeni satış" olmayabilir; mevcut müşteriler yeni şubeye kayarsa toplam ciro beklenenden az artar.',
      formula: 'Yamyamlaşma Oranı (%) = Yeni Şubeye Kayan Eski Şube Satışı ÷ Yeni Şubenin Toplam Satışı × 100',
      warning: 'Bu oranı açılış öncesi kesin bilmek mümkün değildir; müşteri adresleri, sadakat programı verisi ve iki mağaza arası ulaşım süresiyle senaryolaştırın.',
      keyTakeaway: 'Yamyamlaşma yüksek çıkarsa, beklenen senaryodaki geri dönüş süresi gerçekte daha uzun olabilir.'
    }
  },
  // Ders 17 — İş Kurma mı, Var Olanı Devralmak mı? (0 cards) — 2 new cards
  {
    code: 'PC-BIZBUY-001',
    title: 'Kurma vs Devralma Toplam Nakit İhtiyacı',
    type: 'quick_formula',
    shortDescription: 'İki seçeneğin toplam nakit ihtiyacını aynı kalemlerle karşılaştırın.',
    category: 'İşi Satın Alma ve Yatırım Değerlendirmesi',
    published: true,
    kos: ['CUR-122-01'],
    contentJson: {
      mainContent: 'Kararı yalnızca kurulum ucuz mu, devir bedeli mi ucuz sorusuyla vermeyin; toplam nakit ihtiyacını aynı kalemlerle karşılaştırın.',
      formula: 'Sıfırdan Kuruluş = Kurulum + İlk Stok + Depozito/İzin + Başabaşa Kadarki Nakit Açığı  ·  Devralma = Devir Bedeli + Kullanılabilir Stok + Yenileme + İnceleme Gideri + Çalışma Sermayesi',
      example: 'Sıfırdan kuruluşta toplam 3.800.000 TL, devralmada 3.850.000 TL çıkarsa — devralma ilk bakışta ucuz görünse de geçiş giderleri eklenince neredeyse eşitlenebilir.',
      warning: '"Devralma her zaman ucuzdur" varsayımı yanıltıcı olabilir; her iki seçeneği de aynı kalemlerle topla.',
      keyTakeaway: 'Toplam nakit ihtiyacını karşılaştırmadan verilen karar, gizli maliyetleri gözden kaçırabilir.'
    }
  },
  {
    code: 'PC-BIZBUY-002',
    title: 'Devralma Karar Kuralı Kontrolü',
    type: 'checklist',
    shortDescription: 'Devralmanın sıfırdan kuruluştan daha güvenli olup olmadığını kontrol edin.',
    category: 'İşi Satın Alma ve Yatırım Değerlendirmesi',
    published: true,
    kos: ['CUR-122-01'],
    contentJson: {
      mainContent: 'Devralma her zaman daha güvenli değildir; aşağıdaki koşullar sağlanmadan devir teklifine olumlu bakmayın.',
      checklistItems: [
        'Geçmiş satış ve kâr kayıtları belge ile doğrulanabiliyor mu?',
        'Kira ilişkisinin devri (varsa) ev sahibi onayıyla sürdürülebiliyor mu?',
        'Stok ve demirbaşlar gerçek (ikinci el) değerinden mi alınıyor?',
        'Hukuki ve mali riskler fiyata yansıtılmış mı (fiyattan düşülmüş mü)?',
        'Ciro, eski sahibin kişisel ilişkisine değil işletmenin kendisine mi bağlı?'
      ],
      warning: 'Bu kontroller yapılmadan verilen devir teklifi, gerçekte sıfırdan kuruluştan daha pahalıya gelebilir.',
      keyTakeaway: 'Hukuki/mali risk tespitinin ayrıntısı için "Devraldığınızda Borçları da Devralabilirsiniz" dersine bakın.'
    }
  }
];

async function seed() {
  for (const cardDef of CARDS) {
    console.log(`\n${cardDef.code} — ${cardDef.title}`);
    if (!apply) { console.log('  (dry run — not written)'); continue; }

    let card = await prisma.practicalCard.findUnique({ where: { code: cardDef.code } });
    if (!card) {
      card = await prisma.practicalCard.create({
        data: { code: cardDef.code, title: cardDef.title, type: cardDef.type, shortDescription: cardDef.shortDescription, category: cardDef.category, published: cardDef.published }
      });
      console.log('  ✓ card created');
    } else {
      card = await prisma.practicalCard.update({
        where: { code: cardDef.code },
        data: { title: cardDef.title, type: cardDef.type, shortDescription: cardDef.shortDescription, category: cardDef.category, published: cardDef.published }
      });
      console.log('  ♻ card updated');
    }

    const existingVersion = await prisma.practicalCardVersion.findFirst({ where: { practicalCardId: card.id }, orderBy: { version: 'desc' } });
    const newVersionNum = existingVersion ? existingVersion.version + 1 : 1;
    await prisma.practicalCardVersion.create({ data: { practicalCardId: card.id, version: newVersionNum, status: 'published', contentJson: cardDef.contentJson } });
    if (existingVersion) {
      await prisma.practicalCardVersion.updateMany({ where: { practicalCardId: card.id, version: { lt: newVersionNum } }, data: { status: 'archived' } });
    }
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
