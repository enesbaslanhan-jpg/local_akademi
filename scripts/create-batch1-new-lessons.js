// Creates Course + Lesson + KnowledgeObject for the 5 batch-1 lessons that do not
// yet exist in the DB (Ders 5, 8, 10, 12, 15), following the exact v5 pilot pattern
// used for courses 419-426 (see scripts/_dump-meta.js output). Content is taken
// verbatim (formatting-only pass) from scripts/data/lesson-*.md — no rewriting.
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const DATA_DIR = path.join(__dirname, 'data');

const TARGETS = [
  {
    file: 'lesson-ders5-banka-kosgeb.md',
    title: 'Banka Kredisi mi, KOSGEB Desteği mi?',
    description: 'Banka kredisi ile KOSGEB bağlantılı finansman desteğini zamanlama, toplam maliyet ve nakit akışı uyumuna göre karşılaştırın.',
    slug: 'v5-banka-kredisi-kosgeb-destegi',
    curCode: 'CUR-124-01',
    categoryName: 'Finansman ve Kredi Yönetimi',
    subcategory: 'Finansman Kararları',
    metric: 'Gecikmenin Fırsat Maliyeti = Kaybedilecek Satış Katkısı + Müşteri Kaybı + Gecikme Cezaları + Diğer Ek Maliyetler',
    learningArtifact: 'Banka Kredisi-KOSGEB Finansman Seçim Karar Matrisi',
    ctaBlock:
`> Yeni taksitin nakit akışına etkisini **[Kredi Taksitini Karşılayabilir miyim?](/app/decision-checks/DC-LOAN-007)** karar aracıyla kontrol edin — bu ders finansman kaynağını seçmenize yardımcı olur, taksit dayanıklılığını bu araç hesaplar.
>
> Hızlı toplam kredi maliyeti kontrolü için **[Finans Merkezi'nde Kredi Maliyeti](/app/tools?tool=kredi_maliyeti)** aracını kullanabilirsiniz.

`,
    decisionToolLinks: [{ code: 'DC-LOAN-007', label: 'Kredi Taksitini Karşılayabilir miyim?' }],
    modelLabLinks: [],
    financeToolLinks: [{ id: 'kredi_maliyeti', label: 'Kredi Maliyeti' }]
  },
  {
    file: 'lesson-ders8-kredi-riski.md',
    title: 'Kredi Kartı ve Ticari Kredi Riskini Ölç',
    description: 'Kısa vadeli borçlanma araçlarının (kredi kartı, ticari kredi, faktoring) gerçek maliyetini ve likidite riskini ölçün.',
    slug: 'v5-kredi-karti-ticari-kredi-riski',
    curCode: 'CUR-125-01',
    categoryName: 'Finansman ve Kredi Yönetimi',
    subcategory: 'Finansman Kararları',
    metric: 'Borç Karşılama Oranı = Serbest Nakit ÷ Toplam Aylık Borç Ödemesi',
    learningArtifact: 'Kısa Vadeli Borçlanma ve Likidite Risk Analiz Cetveli',
    ctaBlock:
`> Yeni taksit veya borç yükünün serbest nakdi aşıp aşmadığını **[Kredi Taksitini Karşılayabilir miyim?](/app/decision-checks/DC-LOAN-007)** karar aracıyla test edin.
>
> Kısa vadeli likidite riskini daha ileri seviyede görmek için Model Laboratuvarı'ndaki **[Asit-Test Oranı (Quick Ratio)](/app/finance/models/QUICK_RATIO)** modelini kullanabilirsiniz.
>
> Hızlı kontrol için **[Finans Merkezi'nde Kredi Maliyeti](/app/tools?tool=kredi_maliyeti)** ve **[Nakit Dayanım Süresi](/app/tools?tool=nakit_dayanim)** araçları da kullanılabilir.

`,
    decisionToolLinks: [{ code: 'DC-LOAN-007', label: 'Kredi Taksitini Karşılayabilir miyim?' }],
    modelLabLinks: [{ code: 'QUICK_RATIO', label: 'Asit-Test Oranı (Quick Ratio)' }],
    financeToolLinks: [{ id: 'kredi_maliyeti', label: 'Kredi Maliyeti' }, { id: 'nakit_dayanim', label: 'Nakit Dayanım Süresi' }]
  },
  {
    file: 'lesson-ders10-sadakat.md',
    title: 'Sadakat Programı Kurmalı mıyım?',
    description: 'Sadakat programının maliyetini ve tekrar satın alma katkısını pilot bir grupla test ederek fizibilite kararı verin.',
    slug: 'v5-sadakat-programi-kurmali-miyim',
    curCode: 'CUR-126-01',
    categoryName: 'Pazarlama ve Müşteri Sadakati',
    subcategory: 'Müşteri Sadakati',
    metric: 'LTV/CAC Oranı',
    learningArtifact: 'Sadakat Programı Fizibilite ve Pilot Karar Formu',
    ctaBlock:
`> Sadakat programını bir kampanya/pilot olarak fizibilite açısından test etmek için **[Kampanya Yapmak Mantıklı mı?](/app/decision-checks/DC-CAMPAIGN-010)** karar aracını kullanabilirsiniz.
>
> Programın müşteri yaşam boyu değerine etkisini senaryolamak için Model Laboratuvarı'ndaki **[LTV/CAC Oranı](/app/finance/models/LTV_CAC)** modelini kullanın.
>
> Hızlı kontrol için **[Finans Merkezi'nde Müşteri Yaşam Boyu Değeri (LTV)](/app/tools?tool=ltv)** ve **[Müşteri Edinme Maliyeti (CAC)](/app/tools?tool=cac)** araçları da kullanılabilir.

`,
    decisionToolLinks: [{ code: 'DC-CAMPAIGN-010', label: 'Kampanya Yapmak Mantıklı mı?' }],
    modelLabLinks: [{ code: 'LTV_CAC', label: 'LTV/CAC Oranı' }],
    financeToolLinks: [{ id: 'ltv', label: 'Müşteri Yaşam Boyu Değeri' }, { id: 'cac', label: 'Müşteri Edinme Maliyeti' }]
  },
  {
    file: 'lesson-ders12-deneyim.md',
    title: 'Tekrar Satın Almayı Artıran Deneyim Tasarımı',
    description: 'Müşteri yolculuğundaki temas noktalarını ve tekrar satın alma oranını kohort verisiyle değerlendirin.',
    slug: 'v5-tekrar-satin-alma-deneyim-tasarimi',
    curCode: 'CUR-127-01',
    categoryName: 'Satış ve Müşteri Yönetimi',
    subcategory: 'Müşteri Deneyimi',
    metric: 'Müşteri Yaşam Boyu Değeri (LTV)',
    learningArtifact: 'Müşteri Yolculuğu ve Tekrar Satın Alma Temas Planı',
    ctaBlock:
`> Bu ders için mevcut Karar Araçları arasında doğrudan uygun bir tanı aracı bulunmuyor — tekrar satın alma kararı çok kriterli bir deneyim/operasyon konusudur.
>
> Tekrar satın alan müşterinin yarattığı değeri senaryolamak için Model Laboratuvarı'ndaki **[Müşteri Yaşam Boyu Değeri (LTV)](/app/finance/models/LTV)** modelini kullanabilirsiniz.
>
> Hızlı kontrol için **[Finans Merkezi'nde Müşteri Yaşam Boyu Değeri (LTV)](/app/tools?tool=ltv)** ve **[Müşteri Edinme Maliyeti (CAC)](/app/tools?tool=cac)** araçları kullanılabilir.

`,
    decisionToolLinks: [],
    modelLabLinks: [{ code: 'LTV', label: 'Müşteri Yaşam Boyu Değeri (LTV)' }],
    financeToolLinks: [{ id: 'ltv', label: 'Müşteri Yaşam Boyu Değeri' }, { id: 'cac', label: 'Müşteri Edinme Maliyeti' }]
  },
  {
    file: 'lesson-ders15-stok-takip.md',
    title: 'Stok Takip Sistemi Kurmalı mıyım?',
    description: 'Excel, basit stok yazılımı, ERP stok modülü ve WMS arasında ölü stok maliyeti ve geri dönüş süresine göre seçim yapın.',
    slug: 'v5-stok-takip-sistemi-kurmali-miyim',
    curCode: 'CUR-128-01',
    categoryName: 'Dijitalleşme ve Teknoloji',
    subcategory: 'Sistem Seçimi',
    metric: 'Ölü Stok Yükü = Bağlı Sermaye Maliyeti + Depolama + Hasar/Bozulma + Değer Kaybı + Elden Çıkarma Maliyeti',
    learningArtifact: 'Stok Yönetim Sistemi Otomasyon ve Geçiş Karar Formu',
    ctaBlock:
`> Stok seviyesi ve yeniden sipariş kararını **[Stok Artırmalı mıyım?](/app/decision-checks/DC-STOCK-011)** karar aracıyla test edin — bu ders hangi sistemi kullanacağınızı, o araç ise ne kadar sipariş vermeniz gerektiğini değerlendirir.
>
> Stok devir hızını senaryolamak için Model Laboratuvarı'ndaki **[Stokta Kalma Süresi (DIO)](/app/finance/models/DIO)** modelini kullanabilirsiniz.
>
> Hızlı kontrol için **[Finans Merkezi'nde Stok Devir Hızı](/app/tools?tool=stok_devir)** ve **[ROI](/app/tools?tool=roi)** araçları da kullanılabilir.

`,
    decisionToolLinks: [{ code: 'DC-STOCK-011', label: 'Stok Artırmalı mıyım?' }],
    modelLabLinks: [{ code: 'DIO', label: 'Stokta Kalma Süresi (DIO)' }],
    financeToolLinks: [{ id: 'stok_devir', label: 'Stok Devir Hızı' }, { id: 'roi', label: 'ROI' }]
  }
];

async function getOrCreateCategory(name) {
  let cat = await prisma.category.findUnique({ where: { name } });
  if (!cat) {
    if (!apply) { console.log(`  (would create category "${name}")`); return { id: null }; }
    cat = await prisma.category.create({ data: { name, isActive: true } });
    console.log(`  ✓ category created: ${name} (id ${cat.id})`);
  }
  return cat;
}

async function main() {
  console.log(`Batch 1 — creating ${TARGETS.length} new lessons ${apply ? '(APPLY)' : '(DRY RUN)'}\n`);
  let sortOrder = 900;
  for (const t of TARGETS) {
    console.log(`\n${t.title} [${t.curCode}]`);

    const existingKo = await prisma.knowledgeObject.findUnique({ where: { code: t.curCode } });
    if (existingKo) { console.log('  ✗ KO code already exists, skipping'); continue; }

    let raw = fs.readFileSync(path.join(DATA_DIR, t.file), 'utf8').trimEnd() + '\n';
    if (!raw.includes('## Kaynaklar')) throw new Error(`${t.file}: "## Kaynaklar" anchor not found`);
    const content = raw.replace('## Kaynaklar', t.ctaBlock + '## Kaynaklar');
    console.log(`  content: ${raw.length} -> ${content.length} chars`);

    const category = await getOrCreateCategory(t.categoryName);

    const metadata = {
      category: t.categoryName,
      subcategory: t.subcategory,
      level: 'Orta',
      tags: ['v5-pilot', t.categoryName],
      version: '1.0',
      source: 'LocalAkademi Pilot v5 — kurs yeni.rtf kaynağından biçimlendirme',
      generatedFrom: 'kurs-yeni-rtf-2026-08-06',
      editorialState: 'owner-approved-final',
      qualityStandard: 'manual-pilot-v5',
      curriculumCourseSlug: t.slug,
      teachingMode: 'field-guide-long-form',
      metric: t.metric,
      learningArtifact: t.learningArtifact,
      sourceCheckedAt: '2026-08-06',
      estimatedMinutes: 15,
      duration: '15',
      countryCode: 'TR',
      language: 'tr',
      decisionToolLinks: t.decisionToolLinks,
      modelLabLinks: t.modelLabLinks,
      financeToolLinks: t.financeToolLinks
    };

    if (!apply) { console.log('  (dry run — not written)'); sortOrder++; continue; }

    const course = await prisma.course.create({
      data: {
        title: t.title,
        description: t.description,
        category: t.categoryName,
        level: 'uygulamalı',
        slug: t.slug,
        estimatedMinutes: 15,
        outcomes: JSON.stringify([t.learningArtifact + ' hazırlayabilir']),
        sourceType: 'curated-pilot-v5-source-doc',
        sortOrder: sortOrder++,
        metadata: JSON.stringify({
          standard: 'manual-editorial-pilot-v5',
          qualityStandard: 'manual-pilot-v5',
          generatedFrom: 'kurs-yeni-rtf-2026-08-06',
          editorialState: 'owner-approved-final',
          teachingMode: 'field-guide-long-form',
          lessonCount: 1,
          approvedAt: new Date().toISOString()
        }),
        published: true
      }
    });
    console.log(`  ✓ course created: id ${course.id}`);

    const ko = await prisma.knowledgeObject.create({
      data: {
        code: t.curCode,
        slug: t.curCode.toLowerCase(),
        type: 'procedure',
        title: t.title,
        content,
        embedding: '',
        metadata: JSON.stringify(metadata),
        status: 'published',
        verificationStatus: 'verified',
        reviewGate: 'standard',
        categoryId: category.id,
        publishedAt: new Date()
      }
    });
    console.log(`  ✓ KO created: id ${ko.id} code ${ko.code}`);

    const lesson = await prisma.lesson.create({
      data: {
        courseId: course.id,
        title: t.title,
        content,
        order: 1,
        knowledgeObjectId: ko.id,
        estimatedMinutes: 15
      }
    });
    console.log(`  ✓ Lesson created: id ${lesson.id}`);
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
