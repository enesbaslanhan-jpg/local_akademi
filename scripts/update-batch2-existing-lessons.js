// Updates existing batch-2 lessons (Ders 1, 18, 19) to add Finance Tool CTA links
// and convert existing bold decision-tool mentions into real markdown links.
// No new decision-tool mappings are invented; only existing mentions are linked.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

function updateMetadata(metadata, patch) {
  let m;
  try { m = JSON.parse(metadata || '{}'); } catch { m = {}; }
  return JSON.stringify({ ...m, ...patch });
}

async function updateKO(koCode, transformations, metaPatch) {
  const ko = await prisma.knowledgeObject.findUnique({ where: { code: koCode } });
  if (!ko) { console.warn(`  ⚠ KO not found: ${koCode}`); return; }

  let content = ko.content;
  for (const t of transformations) {
    if (content.includes(t.search)) {
      content = content.replace(t.search, t.replace);
      console.log(`  ✓ replaced: "${t.search}" in ${koCode}`);
    } else {
      console.log(`  ℹ not found (already maybe linked?): "${t.search}" in ${koCode}`);
    }
  }

  // Insert CTA block right before ## Kaynaklar if not already present
  const ctaBlock = metaPatch.ctaBlock;
  if (ctaBlock && !content.includes(ctaBlock.trim())) {
    content = content.replace('## Kaynaklar', ctaBlock + '\n## Kaynaklar');
    console.log(`  ✓ CTA block added to ${koCode}`);
  } else if (ctaBlock) {
    console.log(`  ℹ CTA block already present in ${koCode}`);
  }
  delete metaPatch.ctaBlock;

  const metadata = updateMetadata(ko.metadata, metaPatch);

  if (apply) {
    await prisma.knowledgeObject.update({
      where: { id: ko.id },
      data: { content, metadata }
    });
    const lessons = await prisma.lesson.findMany({ where: { knowledgeObjectId: ko.id } });
    for (const lesson of lessons) {
      await prisma.lesson.update({ where: { id: lesson.id }, data: { content } });
    }
    console.log(`  ✓ KO ${koCode} and ${lessons.length} lesson(s) updated`);
  } else {
    console.log(`  (dry run — would update KO ${koCode})`);
  }
}

async function main() {
  console.log(`Batch 2 existing lessons update ${apply ? '(APPLY)' : '(DRY RUN)'}\n`);

  // Ders 1 — Vitrin ve Mağaza İçi Satışı Artır
  await updateKO('CUR-123-01', [], {
    ctaBlock:
`> Mağaza alanlarının kârlılık potansiyelini hızlı karşılaştırmak için **[Finans Merkezi'nde Kâr ve Kâr Marjı](/app/tools?tool=kar_hesabi)** aracını kullanabilirsiniz.
`,
    financeToolLinks: [{ id: 'kar_hesabi', label: 'Kâr ve Kâr Marjı' }],
    decisionToolLinks: [],
    modelLabLinks: []
  });

  // Ders 18 — 4 ders, existing bold mentions become links
  await updateKO('CUR-121-01', [
    { search: '**Kredi Taksitini Karşılayabilir miyim?**', replace: '**[Kredi Taksitini Karşılayabilir miyim?](/app/decision-checks/DC-LOAN-007)**' }
  ], {
    ctaBlock:
`> Devir sonrası nakit pozisyonunu hızlı kontrol etmek için **[Finans Merkezi'nde Nakit Pozisyonu](/app/tools?tool=nakit_pozisyonu)** aracını kullanabilirsiniz.
`,
    decisionToolLinks: [{ code: 'DC-LOAN-007', label: 'Kredi Taksitini Karşılayabilir miyim?' }],
    financeToolLinks: [{ id: 'nakit_pozisyonu', label: 'Nakit Pozisyonu' }],
    modelLabLinks: []
  });

  await updateKO('CUR-121-02', [], {
    ctaBlock:
`> Devir sonrası nakit pozisyonunu hızlı kontrol etmek için **[Finans Merkezi'nde Nakit Pozisyonu](/app/tools?tool=nakit_pozisyonu)** aracını kullanabilirsiniz.
`,
    financeToolLinks: [{ id: 'nakit_pozisyonu', label: 'Nakit Pozisyonu' }],
    decisionToolLinks: [],
    modelLabLinks: []
  });

  await updateKO('CUR-121-03', [
    { search: '**Nakit Akışım Riskli mi?**', replace: '**[Nakit Akışım Riskli mi?](/app/decision-checks/DC-CASHFLOW-008)**' }
  ], {
    ctaBlock:
`> Devir sonrası nakit pozisyonunu hızlı kontrol etmek için **[Finans Merkezi'nde Nakit Pozisyonu](/app/tools?tool=nakit_pozisyonu)** aracını kullanabilirsiniz.
`,
    decisionToolLinks: [{ code: 'DC-CASHFLOW-008', label: 'Nakit Akışım Riskli mi?' }],
    financeToolLinks: [{ id: 'nakit_pozisyonu', label: 'Nakit Pozisyonu' }],
    modelLabLinks: []
  });

  await updateKO('CUR-121-04', [
    { search: '**Nakit Akışım Riskli mi?**', replace: '**[Nakit Akışım Riskli mi?](/app/decision-checks/DC-CASHFLOW-008)**' }
  ], {
    ctaBlock:
`> Devir sonrası nakit pozisyonunu hızlı kontrol etmek için **[Finans Merkezi'nde Nakit Pozisyonu](/app/tools?tool=nakit_pozisyonu)** aracını kullanabilirsiniz.
`,
    decisionToolLinks: [{ code: 'DC-CASHFLOW-008', label: 'Nakit Akışım Riskli mi?' }],
    financeToolLinks: [{ id: 'nakit_pozisyonu', label: 'Nakit Pozisyonu' }],
    modelLabLinks: []
  });

  // Ders 19 — Franchise
  await updateKO('CUR-122-02', [
    { search: '**Kredi Taksitini Karşılayabilir miyim?**', replace: '**[Kredi Taksitini Karşılayabilir miyim?](/app/decision-checks/DC-LOAN-007)**' }
  ], {
    ctaBlock:
`> Franchise giriş maliyetinin toplam yatırım getirisini karşılaştırmak için **[Finans Merkezi'nde Yatırım Getirisi (ROI)](/app/tools?tool=roi)** aracını kullanabilirsiniz.
`,
    decisionToolLinks: [{ code: 'DC-LOAN-007', label: 'Kredi Taksitini Karşılayabilir miyim?' }],
    financeToolLinks: [{ id: 'roi', label: 'Yatırım Getirisi (ROI)' }],
    modelLabLinks: []
  });
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
