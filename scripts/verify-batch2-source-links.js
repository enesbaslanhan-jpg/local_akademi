// Verify approved source-link changes were applied correctly.
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const DATA_DIR = path.join(__dirname, 'data');

const CHECKS = [
  {
    code: 'CUR-130-01',
    mustContain: ['https://www.spk.gov.tr/kurumlar/fonlar/yatirim-fonlari/girisim-sermayesi-yatirim-fonlari'],
    mustNotContain: ['[SPK — pay sahipliği ve girişim sermayesi düzenlemeleri](https://www.spk.gov.tr/)']
  },
  {
    code: 'CUR-131-01',
    mustContain: [
      'https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/ayipli-mal-ve-hizmetler-hakkinda-bilgilendirme',
      'https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme',
      'https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/satis-sonrasi-hizmetler-hakkinda-bilgilendirme'
    ],
    mustNotContain: ['https://ticaret.gov.tr/']
  },
  {
    code: 'CUR-133-01',
    mustContain: [
      'https://www.gib.gov.tr/ynokc',
      'https://ynokc.gib.gov.tr/UploadedFiles/Files/vuk_593_20260508.pdf'
    ],
    mustNotContain: ['[GİB — Yeni Nesil Ödeme Kaydedici Cihaz portalı, mevzuat ve onaylı cihaz listeleri](https://www.gib.gov.tr/)']
  },
  {
    code: 'CUR-134-01',
    mustContain: [
      'https://ebelge.gib.gov.tr/',
      'https://www.gib.gov.tr/ynokc'
    ],
    mustNotContain: ['[GİB — e-Belge portalı ve e-Fatura Portal kullanım kılavuzu](https://www.gib.gov.tr/)']
  },
  {
    code: 'CUR-135-01',
    mustContain: ['https://www.kosgeb.gov.tr/site/tr/genel/destekdetay/9144/kobi-dijital-donusum-destek-programi'],
    mustNotContain: ['[KOSGEB — KOBİ Dijital Dönüşüm Destek Programı ve güncel uygulama belgeleri](https://www.kosgeb.gov.tr/)']
  },
  {
    code: 'CUR-121-01',
    mustContain: ['https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist/'],
    mustNotContain: ['https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist)']
  },
  {
    code: 'CUR-121-03',
    mustContain: ['https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist/'],
    mustNotContain: ['https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist)']
  },
  {
    code: 'CUR-121-04',
    mustContain: ['https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist/'],
    mustNotContain: ['https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist)']
  }
];

const FILE_CHECKS = [
  {
    file: 'lesson-ders7-ortaklik-teklifi.md',
    mustContain: ['[SPK — Girişim Sermayesi Yatırım Fonları](https://www.spk.gov.tr/kurumlar/fonlar/yatirim-fonlari/girisim-sermayesi-yatirim-fonlari)'],
    mustNotContain: ['[SPK — pay sahipliği ve girişim sermayesi düzenlemeleri](https://www.spk.gov.tr/)']
  },
  {
    file: 'lesson-ders9-sikayet-yonetimi.md',
    mustContain: [
      '[T.C. Ticaret Bakanlığı — Ayıplı Mal ve Hizmetler Hakkında Bilgilendirme](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/ayipli-mal-ve-hizmetler-hakkinda-bilgilendirme)',
      '[T.C. Ticaret Bakanlığı — Mesafeli Sözleşmeler Hakkında Bilgilendirme](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme)',
      '[T.C. Ticaret Bakanlığı — Satış Sonrası Hizmetler Hakkında Bilgilendirme](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/satis-sonrasi-hizmetler-hakkinda-bilgilendirme)'
    ],
    mustNotContain: [
      '[T.C. Ticaret Bakanlığı — 6502 sayılı Kanun ve ayıplı mal seçimlik hakları](https://ticaret.gov.tr/)',
      '[T.C. Ticaret Bakanlığı — Mesafeli sözleşmeler ve cayma hakkı bilgilendirmesi](https://ticaret.gov.tr/)',
      '[T.C. Ticaret Bakanlığı — Satış sonrası hizmetlere ilişkin bilgilendirme](https://ticaret.gov.tr/)'
    ]
  },
  {
    file: 'lesson-ders13-pos-kasa.md',
    mustContain: [
      '[GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)',
      '[GİB — 593 Sıra No.lu Vergi Usul Kanunu Genel Tebliği (PDF)](https://ynokc.gib.gov.tr/UploadedFiles/Files/vuk_593_20260508.pdf)'
    ],
    mustNotContain: [
      '[GİB — Yeni Nesil Ödeme Kaydedici Cihaz portalı, mevzuat ve onaylı cihaz listeleri](https://www.gib.gov.tr/)',
      '[GİB — 593 Sıra No.lu VUK Genel Tebliği ve e-belge düzenlemeleri](https://www.gib.gov.tr/)',
      '[GİB — Yeni Nesil ÖKC rehber ve yayınları](https://www.gib.gov.tr/)'
    ]
  },
  {
    file: 'lesson-ders14-muhasebe-yazilimi.md',
    mustContain: [
      '[GİB — e-Belge Portalı](https://ebelge.gib.gov.tr/)',
      '[GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)'
    ],
    mustNotContain: [
      '[GİB — e-Belge portalı ve e-Fatura Portal kullanım kılavuzu](https://www.gib.gov.tr/)',
      '[GİB — YN ÖKC ve e-belge düzenlemelerine ilişkin güncel duyurular](https://www.gib.gov.tr/)'
    ]
  },
  {
    file: 'lesson-ders16-entegrasyon-manuel.md',
    mustContain: ['[KOSGEB — KOBİ Dijital Dönüşüm Destek Programı](https://www.kosgeb.gov.tr/site/tr/genel/destekdetay/9144/kobi-dijital-donusum-destek-programi)'],
    mustNotContain: ['[KOSGEB — KOBİ Dijital Dönüşüm Destek Programı ve güncel uygulama belgeleri](https://www.kosgeb.gov.tr/)']
  }
];

const SCORE_SOURCE_ID = '7f835c44-4ff2-4495-90c8-1def2a6e7b32';

let allOk = true;

function ok(msg, condition) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.log(`  ✗ ${msg}`);
    allOk = false;
  }
  return condition;
}

async function main() {
  console.log('Verifying applied source-link changes...\n');

  for (const c of CHECKS) {
    const ko = await prisma.knowledgeObject.findUnique({ where: { code: c.code } });
    if (!ko) {
      console.log(`KO ${c.code}: NOT FOUND`);
      allOk = false;
      continue;
    }
    const lessons = await prisma.lesson.findMany({ where: { knowledgeObjectId: ko.id } });
    console.log(`KO ${c.code}:`);
    for (const s of c.mustContain) ok(`contains ${s}`, ko.content.includes(s));
    for (const s of c.mustNotContain) ok(`does not contain ${s}`, !ko.content.includes(s));
    for (const lesson of lessons) {
      ok(`lesson ${lesson.id} matches KO content`, lesson.content === ko.content);
    }
  }

  console.log('\nSource table:');
  const scoreSource = await prisma.source.findUnique({ where: { id: SCORE_SOURCE_ID } });
  if (scoreSource) {
    ok('SCORE source URL has trailing slash', scoreSource.url.endsWith('/'));
  } else {
    console.log('  ✗ SCORE source not found');
    allOk = false;
  }

  console.log('\nSource data files:');
  for (const c of FILE_CHECKS) {
    const filePath = path.join(DATA_DIR, c.file);
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`${c.file}:`);
    for (const s of c.mustContain) ok(`contains ${s}`, content.includes(s));
    for (const s of c.mustNotContain) ok(`does not contain ${s}`, !content.includes(s));
  }

  console.log(allOk ? '\n✓ All verification checks passed.' : '\n✗ Some verification checks failed.');
  process.exit(allOk ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
