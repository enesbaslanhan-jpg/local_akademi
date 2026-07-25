import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
async function main() {
const p = new PrismaClient();
const manifest = JSON.parse(fs.readFileSync('content/learning-pilot-v1.json', 'utf-8'));
const seen = new Map<string, string[]>();
for (const entry of manifest.kos) {
  const ko = await p.knowledgeObject.findUnique({ where: { id: entry.koId }, select: { metadata: true } });
  if (!ko) continue;
  const m = JSON.parse(ko.metadata);
  if (m.keyTakeaways) {
    for (const t of m.keyTakeaways) {
      const norm = t.replace(/\s+/g, ' ').trim();
      if (!seen.has(norm)) seen.set(norm, []);
      seen.get(norm)!.push(entry.code);
    }
  }
}
let dups = 0;
for (const [takeaway, codes] of seen) {
  if (codes.length > 1 && takeaway.length > 30) {
    console.log(`DUPLICATE: "${takeaway.substring(0, 80)}..."`);
    console.log(`  Used in: ${codes.join(', ')}`);
    dups++;
  }
}
console.log(`Total duplicates: ${dups}`);
await p.$disconnect();
}
main();
