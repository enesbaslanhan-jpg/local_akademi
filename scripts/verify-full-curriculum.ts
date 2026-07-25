import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.knowledgeObject.findMany({ where: { code: { startsWith: 'CUR-' } }, include: { sources: true } })
  const problems: string[] = []
  if (rows.length !== 600) problems.push(`600 CUR kaydı bekleniyordu, ${rows.length} bulundu`)
  const codes = new Set(rows.map(row => row.code))
  if (codes.size !== rows.length) problems.push('yinelenen kod var')
  for (const row of rows) {
    if (row.content.length < 1200) problems.push(`${row.code}: içerik kısa`)
    if (!row.content.includes('## Öğrenme hedefleri') || !row.content.includes('## Kontrol listesi')) problems.push(`${row.code}: zorunlu bölüm eksik`)
    if (!row.sources.length) problems.push(`${row.code}: kaynak bağlantısı yok`)
    if (row.status === 'published' || row.publishedAt) problems.push(`${row.code}: incelemesiz yayımlanmış`)
  }
  if (problems.length) throw new Error(problems.slice(0, 30).join('\n'))
  const topics = new Set(rows.map(row => { try { return JSON.parse(row.metadata).curriculumTopicId } catch { return null } }))
  console.log(JSON.stringify({ records: rows.length, topics: topics.size, sourceLinks: rows.reduce((n, row) => n + row.sources.length, 0), published: 0, result: 'PASS' }, null, 2))
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
