// Apply approved source-link changes for Batch 2 KOs.
// Updates: KO.content, related Lesson.content, Source URL, and scripts/data/*.md source files.
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const DATA_DIR = path.join(__dirname, 'data');

// KO-level content replacements. Each entry is { code, replacements: [{search, replace}] }
const KO_REPLACEMENTS = [
  {
    code: 'CUR-130-01',
    replacements: [
      {
        search: '[SPK — pay sahipliği ve girişim sermayesi düzenlemeleri](https://www.spk.gov.tr/)',
        replace: '[SPK — Girişim Sermayesi Yatırım Fonları](https://www.spk.gov.tr/kurumlar/fonlar/yatirim-fonlari/girisim-sermayesi-yatirim-fonlari)'
      }
    ]
  },
  {
    code: 'CUR-131-01',
    replacements: [
      {
        search: '[T.C. Ticaret Bakanlığı — 6502 sayılı Kanun ve ayıplı mal seçimlik hakları](https://ticaret.gov.tr/)',
        replace: '[T.C. Ticaret Bakanlığı — Ayıplı Mal ve Hizmetler Hakkında Bilgilendirme](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/ayipli-mal-ve-hizmetler-hakkinda-bilgilendirme)'
      },
      {
        search: '[T.C. Ticaret Bakanlığı — Mesafeli sözleşmeler ve cayma hakkı bilgilendirmesi](https://ticaret.gov.tr/)',
        replace: '[T.C. Ticaret Bakanlığı — Mesafeli Sözleşmeler Hakkında Bilgilendirme](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme)'
      },
      {
        search: '[T.C. Ticaret Bakanlığı — Satış sonrası hizmetlere ilişkin bilgilendirme](https://ticaret.gov.tr/)',
        replace: '[T.C. Ticaret Bakanlığı — Satış Sonrası Hizmetler Hakkında Bilgilendirme](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/satis-sonrasi-hizmetler-hakkinda-bilgilendirme)'
      }
    ]
  },
  {
    code: 'CUR-133-01',
    replacements: [
      {
        search: '[GİB — Yeni Nesil Ödeme Kaydedici Cihaz portalı, mevzuat ve onaylı cihaz listeleri](https://www.gib.gov.tr/)',
        replace: '[GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)'
      },
      {
        search: '[GİB — 593 Sıra No.lu VUK Genel Tebliği ve e-belge düzenlemeleri](https://www.gib.gov.tr/)',
        replace: '[GİB — 593 Sıra No.lu Vergi Usul Kanunu Genel Tebliği (PDF)](https://ynokc.gib.gov.tr/UploadedFiles/Files/vuk_593_20260508.pdf)'
      },
      {
        search: '[GİB — Yeni Nesil ÖKC rehber ve yayınları](https://www.gib.gov.tr/)',
        replace: '[GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)'
      }
    ]
  },
  {
    code: 'CUR-134-01',
    replacements: [
      {
        search: '[GİB — e-Belge portalı ve e-Fatura Portal kullanım kılavuzu](https://www.gib.gov.tr/)',
        replace: '[GİB — e-Belge Portalı](https://ebelge.gib.gov.tr/)'
      },
      {
        search: '[GİB — YN ÖKC ve e-belge düzenlemelerine ilişkin güncel duyurular](https://www.gib.gov.tr/)',
        replace: '[GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)'
      }
    ]
  },
  {
    code: 'CUR-135-01',
    replacements: [
      {
        search: '[KOSGEB — KOBİ Dijital Dönüşüm Destek Programı ve güncel uygulama belgeleri](https://www.kosgeb.gov.tr/)',
        replace: '[KOSGEB — KOBİ Dijital Dönüşüm Destek Programı](https://www.kosgeb.gov.tr/site/tr/genel/destekdetay/9144/kobi-dijital-donusum-destek-programi)'
      }
    ]
  },
  {
    code: 'CUR-121-01',
    replacements: [
      {
        search: '[SCORE — Buying a Business: Due Diligence Checklist](https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist)',
        replace: '[SCORE — Buying a Business: Due Diligence Checklist](https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist/)'
      }
    ]
  },
  {
    code: 'CUR-121-03',
    replacements: [
      {
        search: '[SCORE — Buying a Business: Due Diligence Checklist](https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist)',
        replace: '[SCORE — Buying a Business: Due Diligence Checklist](https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist/)'
      }
    ]
  },
  {
    code: 'CUR-121-04',
    replacements: [
      {
        search: '[SCORE — Buying a Business: Due Diligence Checklist](https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist)',
        replace: '[SCORE — Buying a Business: Due Diligence Checklist](https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist/)'
      }
    ]
  }
];

// Source data files that need to be kept in sync with DB changes.
const FILE_REPLACEMENTS = [
  {
    file: 'lesson-ders7-ortaklik-teklifi.md',
    replacements: [
      {
        search: '[SPK — pay sahipliği ve girişim sermayesi düzenlemeleri](https://www.spk.gov.tr/)',
        replace: '[SPK — Girişim Sermayesi Yatırım Fonları](https://www.spk.gov.tr/kurumlar/fonlar/yatirim-fonlari/girisim-sermayesi-yatirim-fonlari)'
      }
    ]
  },
  {
    file: 'lesson-ders9-sikayet-yonetimi.md',
    replacements: [
      {
        search: '[T.C. Ticaret Bakanlığı — 6502 sayılı Kanun ve ayıplı mal seçimlik hakları](https://ticaret.gov.tr/)',
        replace: '[T.C. Ticaret Bakanlığı — Ayıplı Mal ve Hizmetler Hakkında Bilgilendirme](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/ayipli-mal-ve-hizmetler-hakkinda-bilgilendirme)'
      },
      {
        search: '[T.C. Ticaret Bakanlığı — Mesafeli sözleşmeler ve cayma hakkı bilgilendirmesi](https://ticaret.gov.tr/)',
        replace: '[T.C. Ticaret Bakanlığı — Mesafeli Sözleşmeler Hakkında Bilgilendirme](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme)'
      },
      {
        search: '[T.C. Ticaret Bakanlığı — Satış sonrası hizmetlere ilişkin bilgilendirme](https://ticaret.gov.tr/)',
        replace: '[T.C. Ticaret Bakanlığı — Satış Sonrası Hizmetler Hakkında Bilgilendirme](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/satis-sonrasi-hizmetler-hakkinda-bilgilendirme)'
      }
    ]
  },
  {
    file: 'lesson-ders13-pos-kasa.md',
    replacements: [
      {
        search: '[GİB — Yeni Nesil Ödeme Kaydedici Cihaz portalı, mevzuat ve onaylı cihaz listeleri](https://www.gib.gov.tr/)',
        replace: '[GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)'
      },
      {
        search: '[GİB — 593 Sıra No.lu VUK Genel Tebliği ve e-belge düzenlemeleri](https://www.gib.gov.tr/)',
        replace: '[GİB — 593 Sıra No.lu Vergi Usul Kanunu Genel Tebliği (PDF)](https://ynokc.gib.gov.tr/UploadedFiles/Files/vuk_593_20260508.pdf)'
      },
      {
        search: '[GİB — Yeni Nesil ÖKC rehber ve yayınları](https://www.gib.gov.tr/)',
        replace: '[GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)'
      }
    ]
  },
  {
    file: 'lesson-ders14-muhasebe-yazilimi.md',
    replacements: [
      {
        search: '[GİB — e-Belge portalı ve e-Fatura Portal kullanım kılavuzu](https://www.gib.gov.tr/)',
        replace: '[GİB — e-Belge Portalı](https://ebelge.gib.gov.tr/)'
      },
      {
        search: '[GİB — YN ÖKC ve e-belge düzenlemelerine ilişkin güncel duyurular](https://www.gib.gov.tr/)',
        replace: '[GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)'
      }
    ]
  },
  {
    file: 'lesson-ders16-entegrasyon-manuel.md',
    replacements: [
      {
        search: '[KOSGEB — KOBİ Dijital Dönüşüm Destek Programı ve güncel uygulama belgeleri](https://www.kosgeb.gov.tr/)',
        replace: '[KOSGEB — KOBİ Dijital Dönüşüm Destek Programı](https://www.kosgeb.gov.tr/site/tr/genel/destekdetay/9144/kobi-dijital-donusum-destek-programi)'
      }
    ]
  }
];

// Shared SCORE source row ID (used in CUR-121-01, 03, 04)
const SCORE_SOURCE_ID = '7f835c44-4ff2-4495-90c8-1def2a6e7b32';

async function main() {
  console.log(`Batch 2 source-link update ${apply ? '(APPLY)' : '(DRY RUN)'}`);
  let totalReplacements = 0;
  let koUpdated = 0;
  let lessonUpdated = 0;
  let fileUpdated = 0;

  // 1. Update KO and Lesson contents
  for (const item of KO_REPLACEMENTS) {
    const ko = await prisma.knowledgeObject.findUnique({ where: { code: item.code } });
    if (!ko) {
      console.warn(`  ⚠ KO not found: ${item.code}`);
      continue;
    }
    let content = ko.content;
    let replacements = 0;
    for (const r of item.replacements) {
      if (content.includes(r.search)) {
        content = content.replace(r.search, r.replace);
        replacements++;
        totalReplacements++;
        console.log(`  ✓ ${item.code}: replaced ${r.search.substring(0, 60)}...`);
      } else {
        console.log(`  ℹ ${item.code}: search not found (already updated?): ${r.search.substring(0, 60)}...`);
      }
    }
    if (replacements === 0) {
      console.log(`  (no changes for ${item.code})`);
      continue;
    }
    if (apply) {
      await prisma.knowledgeObject.update({
        where: { id: ko.id },
        data: { content }
      });
      const lessons = await prisma.lesson.findMany({ where: { knowledgeObjectId: ko.id } });
      for (const lesson of lessons) {
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { content }
        });
      }
      console.log(`  ✓ ${item.code}: KO + ${lessons.length} lesson(s) updated`);
      koUpdated++;
      lessonUpdated += lessons.length;
    } else {
      console.log(`  (dry run — would update ${item.code})`);
    }
  }

  // 2. Update shared SCORE Source row URL
  const scoreSource = await prisma.source.findUnique({ where: { id: SCORE_SOURCE_ID } });
  if (scoreSource) {
    const newUrl = 'https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist/';
    if (scoreSource.url !== newUrl) {
      if (apply) {
        await prisma.source.update({
          where: { id: SCORE_SOURCE_ID },
          data: { url: newUrl, lastChecked: new Date() }
        });
        console.log(`  ✓ SCORE source row updated: ${scoreSource.url} -> ${newUrl}`);
      } else {
        console.log(`  (dry run — would update SCORE source row URL to ${newUrl})`);
      }
    } else {
      console.log(`  ℹ SCORE source row already has trailing slash`);
    }
  } else {
    console.warn(`  ⚠ SCORE source row not found: ${SCORE_SOURCE_ID}`);
  }

  // 3. Update source data files
  for (const item of FILE_REPLACEMENTS) {
    const filePath = path.join(DATA_DIR, item.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ File not found: ${item.file}`);
      continue;
    }
    let fileContent = fs.readFileSync(filePath, 'utf8');
    let replacements = 0;
    for (const r of item.replacements) {
      if (fileContent.includes(r.search)) {
        fileContent = fileContent.replace(r.search, r.replace);
        replacements++;
        console.log(`  ✓ ${item.file}: replaced ${r.search.substring(0, 60)}...`);
      } else {
        console.log(`  ℹ ${item.file}: search not found (already updated?): ${r.search.substring(0, 60)}...`);
      }
    }
    if (replacements > 0) {
      if (apply) {
        fs.writeFileSync(filePath, fileContent, 'utf8');
        console.log(`  ✓ ${item.file}: written`);
        fileUpdated++;
      } else {
        console.log(`  (dry run — would write ${item.file})`);
      }
    }
  }

  console.log(`\nSummary: ${totalReplacements} replacements found, ${koUpdated} KOs updated, ${lessonUpdated} lessons updated, ${fileUpdated} files updated`);
  if (!apply) {
    console.log('Run with --apply to persist changes.');
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
