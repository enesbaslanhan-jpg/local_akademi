import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const CATEGORY_MAP: Record<string, string> = {
  'temel-finans': 'Temel Finans',
  'maliyet': 'Maliyet ve Fiyatlandırma',
  'e-ticaret': 'E-Ticaret',
  'girisimcilik': 'Girişimcilik',
  'Yapay Zekâ ve Risk Yönetimi': 'Dijital Ekonomi',
  'Siber Güvenlik ve Veri': 'Dijital Ekonomi',
  'İhracat ve E-İhracat': 'Finansman ve Yatırım',
  'Satış ve Müşteri Yönetimi': 'Finansman ve Yatırım',
};

const PILOT_CATEGORIES = [
  { source: 'CUR', metaCat: 'temel-finans', targetCat: 'Temel Finans', count: 5 },
  { source: 'CUR', metaCat: 'maliyet', targetCat: 'Maliyet ve Fiyatlandırma', count: 5 },
  { source: 'CUR', metaCat: 'e-ticaret', targetCat: 'E-Ticaret', count: 5 },
  { source: 'CUR', metaCat: 'girisimcilik', targetCat: 'Girişimcilik', count: 5 },
  { source: 'KBX', metaCat: 'Yapay Zekâ ve Risk Yönetimi', targetCat: 'Dijital Ekonomi', count: 3 },
  { source: 'KBX', metaCat: 'Siber Güvenlik ve Veri', targetCat: 'Dijital Ekonomi', count: 2 },
  { source: 'KBX', metaCat: 'İhracat ve E-İhracat', targetCat: 'Finansman ve Yatırım', count: 3 },
  { source: 'KBX', metaCat: 'Satış ve Müşteri Yönetimi', targetCat: 'Finansman ve Yatırım', count: 2 },
];

interface PilotEntry {
  koId: number;
  code: string;
  title: string;
  category: string;
  topicKey: string;
  lessonId: number;
  courseId: number;
  courseTitle: string;
  sourceCodes: string[];
}

async function main() {
  console.log('=== Learning Pilot Selection ===\n');

  const allKos = await prisma.knowledgeObject.findMany({
    where: {
      status: 'published',
      isDemo: false,
      sources: { some: {} },
      quizzes: { some: {} },
      taskTemplates: { some: {} },
      courseLessons: { some: {} },
    },
    include: {
      sources: { include: { source: true } },
      courseLessons: { include: { course: true } },
    },
    orderBy: { code: 'asc' },
  });

  console.log(`Total eligible KOs: ${allKos.length}`);

  const pilot: PilotEntry[] = [];

  for (const cat of PILOT_CATEGORIES) {
    let pool: typeof allKos;
    if (cat.source === 'CUR') {
      pool = allKos.filter(k => {
        try {
          const m = JSON.parse(k.metadata);
          return m.category === cat.metaCat;
        } catch { return false; }
      });
    } else {
      pool = allKos.filter(k => {
        try {
          const m = JSON.parse(k.metadata);
          return m.category === cat.metaCat;
        } catch { return false; }
      });
    }

    pool.sort((a, b) => (a.code || '').localeCompare(b.code || ''));

    const selected = pool.slice(0, cat.count);
    for (const ko of selected) {
      const meta = JSON.parse(ko.metadata);
      const lesson = ko.courseLessons[0];
      pilot.push({
        koId: ko.id,
        code: ko.code || '',
        title: ko.title,
        category: cat.targetCat,
        topicKey: cat.targetCat,
        lessonId: lesson?.id || 0,
        courseId: lesson?.course?.id || 0,
        courseTitle: lesson?.course?.title || '',
        sourceCodes: ko.sources.map(s => s.source.title || s.sourceId),
      });
    }
    console.log(`  ${cat.targetCat}: selected ${selected.length} (pool: ${pool.length})`);
  }

  console.log(`\nTotal pilot KOs: ${pilot.length}`);

  const manifest = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    totalKos: pilot.length,
    categories: [...new Set(pilot.map(p => p.category))],
    kos: pilot,
  };

  const outputPath = path.resolve('content/learning-pilot-v1.json');
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\nManifest written to: ${outputPath}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
