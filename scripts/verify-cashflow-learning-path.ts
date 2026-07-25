import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.knowledgeObject.findMany({ where: { code: { startsWith: 'CUR-001-' } }, include: { sources: true, quizzes: { include: { questions: true } }, flashcards: true, taskTemplates: true, courseLessons: true }, orderBy: { code: 'asc' } })
  const errors: string[] = []
  if (rows.length !== 5) errors.push(`5 ders yerine ${rows.length} bulundu.`)
  if (new Set(rows.map(row => row.title)).size !== 5) errors.push('Başlıklar özgün değil.')
  for (const row of rows) {
    const words = row.content.split(/\s+/).filter(Boolean).length
    if (words < 240) errors.push(`${row.code}: yalnızca ${words} kelime.`)
    for (const section of ['## Öğrenme hedefleri','## Uygulama','## Kaynaklar']) if (!row.content.includes(section)) errors.push(`${row.code}: ${section} eksik.`)
    if (row.sources.length < 3) errors.push(`${row.code}: 3 kaynak gerekli.`)
    if (!row.quizzes.length || row.quizzes[0].questions.length < 3) errors.push(`${row.code}: 3 soru gerekli.`)
    if (row.flashcards.filter(card => card.status === 'published' && card.front.trim() && card.back.trim()).length < 5) errors.push(`${row.code}: 5 kart gerekli.`)
    if (!row.taskTemplates.length) errors.push(`${row.code}: görev eksik.`)
    if (!row.courseLessons.length || row.courseLessons.some(lesson => lesson.title !== row.title)) errors.push(`${row.code}: kurs dersi eşleşmiyor.`)
    if (row.status !== 'published' || row.verificationStatus !== 'verified') errors.push(`${row.code}: durum hatalı.`)
  }
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(`Nakit Akışı V2 doğrulandı: 5 özgün ders, ${rows.reduce((n,r)=>n+r.quizzes[0].questions.length,0)} soru, ${rows.reduce((n,r)=>n+r.flashcards.length,0)} flashcard, ${rows.reduce((n,r)=>n+r.taskTemplates.length,0)} görev.`)
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
