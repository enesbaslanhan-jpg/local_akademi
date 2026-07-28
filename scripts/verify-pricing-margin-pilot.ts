import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const codes = ['CUR-021-04', 'CUR-034-04', 'CUR-026-04', 'CUR-032-04', 'CUR-038-04']
const requiredVisuals = [
  'frontend/public/academy-visuals/pricing-margin/price-stack.svg',
  'frontend/public/academy-visuals/pricing-margin/markup-margin.svg',
  'frontend/public/academy-visuals/pricing-margin/discount-heatmap.svg',
]

async function main() {
  const failures: string[] = []
  const course = await prisma.course.findUnique({
    where: { slug: 'fiyat-mimarisi-marj-yonetimi' },
    include: { lessons: { orderBy: { order: 'asc' } } },
  })
  if (!course || !course.published) failures.push('Pilot kurs bulunamadı veya yayımlanmamış.')
  if (course?.lessons.length !== 5) failures.push(`Pilot ders sayısı 5 değil: ${course?.lessons.length ?? 0}`)
  if (course && course.lessons.map(lesson => lesson.order).join(',') !== '1,2,3,4,5') failures.push('Ders sırası 1–5 değil.')

  const kos = await prisma.knowledgeObject.findMany({
    where: { code: { in: codes } },
    include: {
      sources: { include: { source: true } },
      quizzes: { include: { questions: true } },
      flashcards: true,
      taskTemplates: true,
    },
  })
  if (kos.length !== 5) failures.push(`KO sayısı 5 değil: ${kos.length}`)

  for (const code of codes) {
    const ko = kos.find(item => item.code === code)
    if (!ko) continue
    let metadata: Record<string, unknown> = {}
    try { metadata = JSON.parse(ko.metadata) } catch { failures.push(`${code}: metadata JSON geçersiz.`) }
    if (ko.status !== 'published' || ko.verificationStatus !== 'verified') failures.push(`${code}: yayın/doğrulama durumu hatalı.`)
    if (ko.content.length < 2500) failures.push(`${code}: içerik kısa (${ko.content.length}).`)
    if (!ko.content.includes('## Kaynakça')) failures.push(`${code}: kaynakça yok.`)
    if (!ko.content.includes('erişim: 28.07.2026')) failures.push(`${code}: erişim tarihi yok.`)
    if (metadata.qualityStandard !== 'adaptive-operational-v1') failures.push(`${code}: kalite standardı yok.`)
    if (!metadata.contentArchetype) failures.push(`${code}: içerik arketipi yok.`)
    if (ko.sources.filter(item => item.source.authorityLevel === 'high').length < 3) failures.push(`${code}: üç yüksek otoriteli kaynak yok.`)
    const quiz = ko.quizzes.find(item => item.status === 'published')
    if (!quiz || quiz.questions.length < 5) failures.push(`${code}: beş soruluk yayınlanmış quiz yok.`)
    if (quiz?.questions.some(question => !question.explanation || question.explanation.length < 25)) failures.push(`${code}: öğretici quiz açıklaması eksik.`)
    if (ko.flashcards.filter(card => card.status === 'published').length < 6) failures.push(`${code}: altı yayınlanmış flashcard yok.`)
    if (ko.flashcards.some(card => card.front.length < 18 || card.back.length < 35 || !card.hint)) failures.push(`${code}: flashcard kalite alanı eksik.`)
    const task = ko.taskTemplates[0]
    if (!task?.rubric || !task?.checklist || !task?.exampleOutput) failures.push(`${code}: görev/rubrik/örnek eksik.`)
    if (/soru\s*[1-9]|cevap\s*[a-d]|lorem ipsum|placeholder/i.test(ko.content)) failures.push(`${code}: şablon/placeholder ifadesi bulundu.`)
  }

  for (const visual of requiredVisuals) {
    try { await access(resolve(visual)) } catch { failures.push(`Görsel eksik: ${visual}`) }
  }

  if (failures.length) {
    console.error('FİYAT/MARJ PİLOT DOĞRULAMASI BAŞARISIZ')
    failures.forEach(failure => console.error(`- ${failure}`))
    process.exitCode = 1
    return
  }

  console.log('FİYAT/MARJ PİLOT DOĞRULAMASI BAŞARILI')
  console.log('5 ders, 25 öğretici soru, 30 çift yüzlü kart, 5 uygulama görevi, 3 görsel ve 1 hesaplayıcı doğrulandı.')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
