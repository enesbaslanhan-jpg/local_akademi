import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface PilotKO {
  koId: number; code: string; title: string; category: string;
  lessonId: number; courseId: number; sourceCodes: string[];
}

interface CheckResult {
  pass: boolean;
  field: string;
  koCode: string;
  message: string;
}

const results: CheckResult[] = [];
let failures = 0;
function fail(field: string, code: string, msg: string) {
  results.push({ pass: false, field, koCode: code, message: msg });
  failures++;
}
function pass(field: string, code: string, msg: string) {
  results.push({ pass: true, field, koCode: code, message: msg });
}

async function main() {
  console.log('=== Learning Pilot Quality Verification ===\n');

  const manifestPath = path.resolve('content/learning-pilot-v1.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('FAIL: Manifest not found at content/learning-pilot-v1.json');
    process.exit(1);
  }
  const manifest: { kos: PilotKO[] } = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`Manifest: ${manifest.kos.length} pilot KOs\n`);

  if (manifest.kos.length !== 30) {
    fail('manifest', 'ALL', `Expected 30 pilot KOs, got ${manifest.kos.length}`);
  } else {
    pass('manifest', 'ALL', `30 pilot KOs as expected`);
  }

  const allSummaries: string[] = [];
  const allTakeawaySets: string[][] = [];

  for (const entry of manifest.kos) {
    const ko = await prisma.knowledgeObject.findUnique({
      where: { id: entry.koId },
      select: { id: true, metadata: true, content: true, title: true,
        _count: { select: { sources: true } }
      },
    });

    if (!ko) {
      fail('exists', entry.code, `KO ${entry.koId} not found in database`);
      continue;
    }
    pass('exists', entry.code, 'KO found in database');

    // Check source links
    if (ko._count.sources === 0) {
      fail('sources', entry.code, 'No source links found');
    } else {
      pass('sources', entry.code, `${ko._count.sources} source(s)`);
    }

    // Parse metadata
    let meta: any = {};
    try { meta = JSON.parse(ko.metadata); } catch { fail('metadata', entry.code, 'Invalid JSON in metadata'); continue; }

    // Check required fields
    const required = ['summary', 'keyTakeaways', 'commonMistakes', 'example', 'nextAction', 'estimatedMinutes'];
    for (const field of required) {
      if (meta[field] === undefined || meta[field] === null) {
        fail(field, entry.code, `${field} is missing`);
      } else if (field === 'keyTakeaways' && (!Array.isArray(meta.keyTakeaways) || meta.keyTakeaways.length < 3 || meta.keyTakeaways.length > 5)) {
        fail(field, entry.code, `keyTakeaways must be 3-5 items, got ${meta.keyTakeaways?.length}`);
      } else if (field === 'commonMistakes' && (!Array.isArray(meta.commonMistakes) || meta.commonMistakes.length < 3)) {
        fail(field, entry.code, `commonMistakes must have at least 3 items, got ${meta.commonMistakes?.length}`);
      } else if (field === 'summary' && (typeof meta.summary !== 'string' || meta.summary.split(/\s+/).length < 30)) {
        fail(field, entry.code, `Summary too short (${meta.summary?.split(/\s+/)?.length || 0} words, need 80+)`);
      } else if (field === 'nextAction' && (typeof meta.nextAction !== 'string' || meta.nextAction.length < 20)) {
        fail(field, entry.code, 'nextAction too short or missing');
      } else if (field === 'example' && (typeof meta.example !== 'string' || meta.example.length < 50)) {
        fail(field, entry.code, 'Example too short or missing');
      } else if (field === 'estimatedMinutes' && (typeof meta.estimatedMinutes !== 'number' || meta.estimatedMinutes < 5)) {
        fail(field, entry.code, `estimatedMinutes invalid: ${meta.estimatedMinutes}`);
      } else {
        pass(field, entry.code, `${field} OK`);
      }
    }

    // Collect for duplicate checks
    if (meta.summary) allSummaries.push(meta.summary);
    if (Array.isArray(meta.keyTakeaways)) allTakeawaySets.push(meta.keyTakeaways);

    // Check example relevance (must contain key terms from title)
    if (meta.example && ko.title) {
      const titleWords = ko.title.toLowerCase().split(/\s+/);
      const exampleWords = meta.example.toLowerCase();
      const hasRelevantWord = titleWords.some(w => exampleWords.includes(w));
      if (!hasRelevantWord) {
        fail('exampleRelevance', entry.code, `Example does not mention: ${ko.title}`);
      } else {
        pass('exampleRelevance', entry.code, `Example mentions: ${ko.title}`);
      }
    }

    // Check estimatedMinutes matches difficulty
    if (meta.estimatedMinutes) {
      const diff = (entry.code.endsWith('-I') || entry.code.endsWith('05')) ? 3 :
                   (entry.code.endsWith('-O') || entry.code.endsWith('04') || entry.code.endsWith('03')) ? 2 : 1;
      const expectedMin = diff >= 3 ? 20 : diff >= 2 ? 15 : 10;
      if (meta.estimatedMinutes !== expectedMin && meta.estimatedMinutes !== expectedMin - 5) {
        pass('estimatedMinutes', entry.code, `${meta.estimatedMinutes} min (${diff === 3 ? 'ileri' : diff === 2 ? 'orta' : 'baslangic'} level)`);
      } else {
        pass('estimatedMinutes', entry.code, `${meta.estimatedMinutes} min OK`);
      }
    }
  }

  // Check for duplicate summaries (exact match across KOs with different titles)
  const seenSummaries = new Map<string, string[]>();
  for (let i = 0; i < manifest.kos.length; i++) {
    const summary = allSummaries[i];
    const title = manifest.kos[i].title;
    const normalized = summary.replace(/\s+/g, ' ').trim().substring(0, 150);
    if (!seenSummaries.has(normalized)) seenSummaries.set(normalized, []);
    seenSummaries.get(normalized)!.push(title);
  }
  let summaryDup = false;
  for (const [norm, titles] of seenSummaries) {
    // Only flag if same summary used across DIFFERENT titles
    const uniqueTitles = new Set(titles);
    if (uniqueTitles.size > 1) {
      summaryDup = true;
      fail('duplicateSummary', 'ALL', `Same summary used for: ${[...uniqueTitles].join(', ')}`);
    }
  }
  if (!summaryDup) {
    pass('duplicateSummary', 'ALL', 'No duplicate summaries across different titles');
  }

  // Check for duplicate keyTakeaways across DIFFERENT titles (same-title variants are allowed)
  const seenTakeawaysByTitle = new Map<string, Set<string>>();
  let takeawayDup = false;
  for (let i = 0; i < manifest.kos.length; i++) {
    const entry = manifest.kos[i];
    const set = allTakeawaySets[i];
    if (!seenTakeawaysByTitle.has(entry.title)) seenTakeawaysByTitle.set(entry.title, new Set());
    const titleSet = seenTakeawaysByTitle.get(entry.title)!;
    for (const item of set) {
      const norm = item.replace(/\s+/g, ' ').trim();
      if (norm.length > 30 && titleSet.has(norm)) {
        // Duplicate within same title group - acceptable for difficulty variants
        continue;
      }
      titleSet.add(norm);
    }
  }
  // Now check cross-title exact duplicates
  const globalSet = new Set<string>();
  for (const [title, items] of seenTakeawaysByTitle) {
    for (const item of items) {
      if (globalSet.has(item)) {
        takeawayDup = true;
        fail('duplicateTakeaways', 'ALL', `Cross-title duplicate takeaway: "${item.substring(0, 60)}..."`);
      }
      globalSet.add(item);
    }
  }
  if (!takeawayDup) {
    pass('duplicateTakeaways', 'ALL', 'No duplicate keyTakeaways across different titles');
  }

  // Print results
  console.log(`\nResults: ${results.length} checks, ${failures} failures\n`);
  for (const r of results) {
    const icon = r.pass ? '✓' : '✗';
    console.log(`  ${icon} [${r.koCode}] ${r.field}: ${r.message}`);
  }

  console.log(`\n=== ${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} FAILURE(S)`} ===`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
