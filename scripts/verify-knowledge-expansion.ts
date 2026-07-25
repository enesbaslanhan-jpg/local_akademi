import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const rows = await prisma.knowledgeObject.findMany({ where: { code: { startsWith: 'KBX-' } }, include: { sources: true, quizzes: { include: { questions: true } }, taskTemplates: true, category: true, reviews: true, publicationEvents: true } })
  const errors: string[] = []
  for (const row of rows) {
    if (!row.category || !row.sources.length) errors.push(`${row.code}: kategori/kaynak eksik`)
    if (row.content.length < 1200 || !row.content.includes('## Öğrenme hedefleri')) errors.push(`${row.code}: içerik yetersiz`)
    if (row.quizzes.length !== 1 || row.quizzes[0].questions.length !== 3 || row.taskTemplates.length !== 1) errors.push(`${row.code}: öğrenme bileşeni eksik`)
    if (row.status !== 'published' || row.verificationStatus !== 'verified' || !row.publishedAt) errors.push(`${row.code}: yayın durumu eksik`)
    if (!row.reviews.some(review => review.status === 'approved')) errors.push(`${row.code}: onay kaydı eksik`)
    if (!row.publicationEvents.some(event => event.action === 'published')) errors.push(`${row.code}: yayın olayı eksik`)
  }
  const topics = new Set(rows.map(row => `${row.category?.name}:${row.title}`))
  const categories = new Set(rows.map(row => row.category?.name))
  if (rows.length !== 240 || topics.size !== 80 || categories.size !== 8) errors.push(`Sayım hatası: ${rows.length}/${topics.size}/${categories.size}`)
  if (errors.length) throw new Error(errors.slice(0, 30).join('\n'))
  console.log(JSON.stringify({ records: rows.length, uniqueTopics: topics.size, categories: categories.size, sourceLinks: rows.reduce((n, row) => n + row.sources.length, 0), quizzes: rows.length, questions: rows.length * 3, tasks: rows.length, approvedReviews: rows.filter(row => row.reviews.some(review => review.status === 'approved')).length, publicationEvents: rows.filter(row => row.publicationEvents.some(event => event.action === 'published')).length, status: 'published', result: 'PASS' }, null, 2))
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
