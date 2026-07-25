import { PrismaClient } from '@prisma/client'
import manifest from '../content/learning-pilot-v1.json'

const prisma = new PrismaClient()

const instructions = (title: string) => JSON.stringify([
  { step: 1, text: `${title} konusundaki mevcut durumunuzu yazın.` },
  { step: 2, text: 'Ölçülebilir hedefinizi ve kullanacağınız veriyi belirleyin.' },
  { step: 3, text: 'Uygulanabilir aksiyonu, sorumluyu ve tamamlanma tarihini yazın.' },
])

const exampleOutput = JSON.stringify({
  format: 'text',
  minWords: 120,
  sections: ['Mevcut durum', 'Hedef', 'Aksiyon', 'Sorumlu ve tarih', 'Başarı ölçütü'],
})

const checklist = JSON.stringify([
  { item: 'Mevcut durum somut veriyle açıklandı', weight: 20 },
  { item: 'Hedef ölçülebilir ve süreli', weight: 20 },
  { item: 'Aksiyon uygulanabilir', weight: 20 },
  { item: 'Sorumlu ve tarih belirtildi', weight: 20 },
  { item: 'Başarı ölçütü yazıldı', weight: 20 },
])

const rubric = JSON.stringify([
  { level: 'Eksik', minScore: 0, maxScore: 39, description: 'Planın temel alanları eksik.' },
  { level: 'Gelişiyor', minScore: 40, maxScore: 69, description: 'Plan var ancak ölçüm veya sorumluluk net değil.' },
  { level: 'Uygulanabilir', minScore: 70, maxScore: 89, description: 'Plan ölçülebilir ve uygulanabilir.' },
  { level: 'Güçlü', minScore: 90, maxScore: 100, description: 'Plan veri, risk ve takip adımlarını birlikte içeriyor.' },
])

async function main() {
  const entries = (manifest as any).kos as Array<{ koId: number; code: string; title: string }>
  let updated = 0

  for (const entry of entries) {
    const title = entry.code.startsWith('CUR-') ? 'İşletmene Uygula V1' : 'Yeni Alan Uygulaması V1'
    const tasks = await prisma.taskTemplate.findMany({ where: { koId: entry.koId } })
    const canonical = tasks.find(task => task.title === title)

    if (!canonical || tasks.length !== 1) {
      throw new Error(`${entry.code}: canonical task contract is not exactly one task; refusing destructive repair`)
    }

    await prisma.taskTemplate.update({
      where: { id: canonical.id },
      data: {
        instructions: instructions(entry.title),
        exampleOutput,
        checklist,
        rubric,
      },
    })
    updated++
  }

  console.log(`Pilot canonical tasks enriched in place: ${updated}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
