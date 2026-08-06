// Creates Course + Lesson + KnowledgeObject for the 7 batch-2 lessons that do not
// yet exist in the DB (Ders 6, 7, 9, 11, 13, 14, 16), following the exact v5 pilot pattern.
// Content is taken verbatim (formatting-only pass) from scripts/data/lesson-ders*.md.
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const DATA_DIR = path.join(__dirname, 'data');

const TARGETS = [
  {
    file: 'lesson-ders6-melek-yatirim.md',
    title: 'Melek Yatırımcıya Hazır mıyım?',
    description: 'Melek yatırım için şirket hazırlığını müşteri kanıtı, ölçeklenebilirlik, hukuki düzen ve kurucu-yatırımcı uyumu açısından değerlendirin.',
    slug: 'v5-melek-yatirimciya-hazir-miyim',
    curCode: 'CUR-129-01',
    categoryName: 'girisimcilik',
    subcategory: 'Yatırım Hazırlığı',
    metric: 'Post-money Değerleme = Yatırım ÷ Yatırımcı Payı; Pre-money = Post-money − Yatırım',
    learningArtifact: 'Melek Yatırım Uygunluk ve Hazırlık Kartı',
    ctaBlock:
`> Bu ders için mevcut Karar Araçları arasında doğrudan uygun bir tanı aracı bulunmuyor — melek yatırım hazırlığı çok yönlü bir hazırlık ve uzman görüşü konusudur.
>
> İleri seviyede değerleme senaryoları için Model Laboratuvarı'ndaki **[Basitleştirilmiş WACC ve FCFF DCF](/app/finance/models/WACC_FCFF_DCF)** modelini kullanabilirsiniz.

`,
    decisionToolLinks: [],
    modelLabLinks: [{ code: 'WACC_FCFF_DCF', label: 'Basitleştirilmiş WACC ve FCFF DCF' }],
    financeToolLinks: []
  },
  {
    file: 'lesson-ders7-ortaklik-teklifi.md',
    title: 'Ortaklık Teklifini Değerlendir',
    description: 'Term sheet maddelerini (değerleme, tasfiye önceliği, veto, tag/drag, vesting) birlikte değerlendirerek karşı teklif hazırlayın.',
    slug: 'v5-ortaklik-teklifini-degerlendir',
    curCode: 'CUR-130-01',
    categoryName: 'girisimcilik',
    subcategory: 'Yatırım Sözleşmeleri',
    metric: 'Yatırımcı Payı = Yatırım ÷ Post-money Değerleme',
    learningArtifact: 'Term Sheet Değerlendirme ve Karşı Teklif Matrisi',
    ctaBlock:
`> Bu ders için mevcut Karar Araçları arasında doğrudan uygun bir tanı aracı bulunmuyor — ortaklık teklifinin değerleme, hukuk ve yönetim yapısı birlikte incelenmelidir.

`,
    decisionToolLinks: [],
    modelLabLinks: [],
    financeToolLinks: []
  },
  {
    file: 'lesson-ders9-sikayet-yonetimi.md',
    title: 'Şikâyeti Kayba Dönüştürmeden Yönet',
    description: 'Müşteri şikâyetini hukuki kategori, teknik inceleme ve ticari telafi açılarından ayırarak karar verin.',
    slug: 'v5-sikayeti-kayba-donusturmeden-yonet',
    curCode: 'CUR-131-01',
    categoryName: 'Satış ve Müşteri Yönetimi',
    subcategory: 'Müşteri Hizmetleri',
    metric: 'Telafinin Beklenen Değeri = Korunması Beklenen Katkı − Telafi ve Operasyon Maliyeti',
    learningArtifact: 'Müşteri Şikâyet ve Telafi Karar Matrisi',
    ctaBlock:
`> Bu ders için mevcut Karar Araçları arasında doğrudan uygun bir tanı aracı bulunmuyor — şikâyet yönetimi hukuki, operasyonel ve müşteri ilişkisi boyutları birlikte değerlendirilen bir süreçtir.

`,
    decisionToolLinks: [],
    modelLabLinks: [],
    financeToolLinks: []
  },
  {
    file: 'lesson-ders11-yorum-itibar.md',
    title: 'Yorum ve İtibar Yönetimi',
    description: 'Dijital yorumları sınıflandırın, yanıt protokolü oluşturun, krizleri kök nedenle yönetin ve organik yorum toplayın.',
    slug: 'v5-yorum-ve-itibar-yonetimi',
    curCode: 'CUR-132-01',
    categoryName: 'Satış ve Müşteri Yönetimi',
    subcategory: 'Dijital İtibar',
    metric: 'Yanıt Süresi (medyan) + Çözülen Şikâyet Oranı + Şikâyet Tekrar Oranı',
    learningArtifact: 'Dijital Yorum Yanıt Protokolü ve Kriz Kontrol Listesi',
    ctaBlock:
`> Bu ders için mevcut Karar Araçları arasında doğrudan uygun bir tanı aracı bulunmuyor — yorum yönetimi bilgi ağırlıklı bir operasyon ve itibar sürecidir.

`,
    decisionToolLinks: [],
    modelLabLinks: [],
    financeToolLinks: []
  },
  {
    file: 'lesson-ders13-pos-kasa.md',
    title: 'POS ve Kasa Yazılımı Nasıl Seçilir?',
    description: 'YN ÖKC, EFT-POS ve kasa yazılımı arasındaki farkı ayırarak teknik uygunluk, çevrim dışı çalışma ve toplam sahip olma maliyetine göre seçim yapın.',
    slug: 'v5-pos-ve-kasa-yazilimi-secimi',
    curCode: 'CUR-133-01',
    categoryName: 'Dijitalleşme ve Teknoloji',
    subcategory: 'Sistem Seçimi',
    metric: 'Toplam Sahip Olma Maliyeti = Donanım + Lisans + Kurulum + Entegrasyon + Eğitim + Bakım + Servis + Yedek Cihaz + Veri Aktarımı',
    learningArtifact: 'POS ve Kasa Yazılımı Teknik İhtiyaç ve Seçim Listesi',
    ctaBlock:
`> Bu ders için mevcut Karar Araçları arasında doğrudan uygun bir tanı aracı bulunmuyor — POS seçimi teknik, mevzuatsal ve operasyonel bir değerlendirme konusudur.
>
> Yatırımın geri dönüşünü hızlı karşılaştırmak için **[Finans Merkezi'nde Yatırım Getirisi (ROI)](/app/tools?tool=roi)** aracını kullanabilirsiniz.

`,
    decisionToolLinks: [],
    modelLabLinks: [],
    financeToolLinks: [{ id: 'roi', label: 'Yatırım Getirisi (ROI)' }]
  },
  {
    file: 'lesson-ders14-muhasebe-yazilimi.md',
    title: 'Muhasebe Yazılımına Geçmeli miyim?',
    description: 'Excel yetersizliği sinyallerini, ön muhasebe yazılımı işlevlerini ve zaman/finans katkısını karşılaştırarak geçiş kararı verin.',
    slug: 'v5-muhasebe-yazilimina-gecme',
    curCode: 'CUR-134-01',
    categoryName: 'Dijitalleşme ve Teknoloji',
    subcategory: 'Sistem Seçimi',
    metric: 'Aylık Zaman Maliyeti = İşlem Sayısı × Ortalama İşlem Süresi × Saatlik Tam Personel Maliyeti',
    learningArtifact: 'Ön Muhasebe Yazılımı Geçiş ve ROI Analiz Cetveli',
    ctaBlock:
`> Bu ders için mevcut Karar Araçları arasında doğrudan uygun bir tanı aracı bulunmuyor — muhasebe yazılımı geçişi süreç ve uyum kararıdır.
>
> Yatırımın geri dönüşünü hızlı karşılaştırmak için **[Finans Merkezi'nde Yatırım Getirisi (ROI)](/app/tools?tool=roi)** aracını kullanabilirsiniz.

`,
    decisionToolLinks: [],
    modelLabLinks: [],
    financeToolLinks: [{ id: 'roi', label: 'Yatırım Getirisi (ROI)' }]
  },
  {
    file: 'lesson-ders16-entegrasyon-manuel.md',
    title: 'Entegrasyon mu, Manuel Süreç mi?',
    description: 'Manuel süreç, yarı otomasyon ve tam entegrasyon arasında maliyet-fayda ve kontrol düzeyine göre karar verin.',
    slug: 'v5-entegrasyon-mu-manuel-surec-mi',
    curCode: 'CUR-135-01',
    categoryName: 'Dijitalleşme ve Teknoloji',
    subcategory: 'Süreç Otomasyonu',
    metric: 'Net Otomasyon Katkısı = Brüt Fayda − Toplam Entegrasyon Maliyeti',
    learningArtifact: 'Süreç Entegrasyonu Maliyet-Fayda ve Karar Matrisi',
    ctaBlock:
`> Bu ders için mevcut Karar Araçları arasında doğrudan uygun bir tanı aracı bulunmuyor — entegrasyon kararı süreç ve maliyet-fayda analizidir.
>
> Yatırımın geri dönüşünü hızlı karşılaştırmak için **[Finans Merkezi'nde Yatırım Getirisi (ROI)](/app/tools?tool=roi)** aracını kullanabilirsiniz.

`,
    decisionToolLinks: [],
    modelLabLinks: [],
    financeToolLinks: [{ id: 'roi', label: 'Yatırım Getirisi (ROI)' }]
  }
];

async function getCategory(name) {
  const cat = await prisma.category.findUnique({ where: { name } });
  if (!cat) throw new Error(`Category not found: ${name}`);
  return cat;
}

async function main() {
  console.log(`Batch 2 — creating ${TARGETS.length} new lessons ${apply ? '(APPLY)' : '(DRY RUN)'}\n`);
  const maxCourse = await prisma.course.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
  let sortOrder = (maxCourse?.sortOrder ?? 0) + 1;
  for (const t of TARGETS) {
    console.log(`\n${t.title} [${t.curCode}]`);

    const existingKo = await prisma.knowledgeObject.findUnique({ where: { code: t.curCode } });
    if (existingKo) { console.log('  ✗ KO code already exists, skipping'); continue; }

    let raw = fs.readFileSync(path.join(DATA_DIR, t.file), 'utf8').trimEnd() + '\n';
    if (!raw.includes('## Kaynaklar')) throw new Error(`${t.file}: "## Kaynaklar" anchor not found`);
    // Avoid duplicate CTA blocks if the source file already contains this CTA.
    const ctaSignature = t.ctaBlock.trim();
    const content = raw.includes(ctaSignature)
      ? raw
      : raw.replace('## Kaynaklar', t.ctaBlock + '## Kaynaklar');
    console.log(`  content: ${raw.length} -> ${content.length} chars`);

    const category = await getCategory(t.categoryName);

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
