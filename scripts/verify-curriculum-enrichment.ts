import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.knowledgeObject.findMany({ where: { code: { startsWith: 'CUR-' } }, include: { quizzes: { include: { questions: true } }, taskTemplates: true } })
  const errors: string[] = []
  const hashes = new Set<string>()
  let questionCount = 0
  for (const row of rows) {
    hashes.add(createHash('sha256').update(row.content).digest('hex'))
    const quiz = row.quizzes.find(q => q.title === 'Kazanım Kontrolü V1')
    const task = row.taskTemplates.find(t => t.title === 'İşletmene Uygula V1')
    if (!quiz || quiz.questions.length !== 3) errors.push(`${row.code}: quiz veya 3 soru eksik`)
    if (!task) errors.push(`${row.code}: görev eksik`)
    if (!row.content.includes('## İşletme senaryosu')) errors.push(`${row.code}: senaryo eksik`)
    let metadata: any = {}; try { metadata = JSON.parse(row.metadata) } catch {}
    if (!Array.isArray(metadata.quiz) || metadata.quiz.length !== 3) errors.push(`${row.code}: API quiz metadatası eksik`)
    questionCount += quiz?.questions.length || 0
  }
  if (hashes.size !== 600) errors.push(`İçerikler benzersiz değil: 600 yerine ${hashes.size} benzersiz metin`)
  if (errors.length) throw new Error(errors.slice(0, 30).join('\n'))
  console.log(JSON.stringify({ records: rows.length, uniqueContents: hashes.size, quizzes: rows.length, questions: questionCount,
    tasks: rows.length, result: 'PASS' }, null, 2))
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
