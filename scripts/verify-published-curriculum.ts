import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.knowledgeObject.findMany({ where: { code: { startsWith: 'CUR-' } }, include: {
    sources: true, reviews: true, publicationEvents: true, quizzes: { include: { questions: true } }, taskTemplates: true
  } })
  const errors: string[] = []
  for (const row of rows) {
    if (row.status !== 'published' || row.verificationStatus !== 'verified' || !row.publishedAt || row.isDemo) errors.push(`${row.code}: yayın durumu hatalı`)
    if (!row.sources.length) errors.push(`${row.code}: kaynak yok`)
    if (!row.reviews.some(review => review.status === 'approved')) errors.push(`${row.code}: onay kaydı yok`)
    if (!row.publicationEvents.some(event => event.action === 'published')) errors.push(`${row.code}: yayın olayı yok`)
    if (row.quizzes.length !== 1 || row.quizzes[0].questions.length !== 3 || row.taskTemplates.length !== 1) errors.push(`${row.code}: öğrenme bileşenleri eksik`)
  }
  const publicCount = await prisma.knowledgeObject.count({ where: { code: { startsWith: 'CUR-' }, status: 'published', isDemo: false } })
  if (rows.length !== 600 || publicCount !== 600) errors.push(`Yayın sayısı hatalı: rows=${rows.length}, public=${publicCount}`)
  if (errors.length) throw new Error(errors.slice(0, 30).join('\n'))
  console.log(JSON.stringify({ records: rows.length, publicRecords: publicCount, verified: rows.filter(row => row.verificationStatus === 'verified').length,
    approvedReviews: rows.filter(row => row.reviews.some(review => review.status === 'approved')).length,
    publicationEvents: rows.filter(row => row.publicationEvents.some(event => event.action === 'published')).length, result: 'PASS' }, null, 2))
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
