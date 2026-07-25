import { PrismaClient } from '@prisma/client'
import manifest from '../content/learning-pilot-v1.json'

const prisma = new PrismaClient()

function text(value: unknown): string {
  return String(value || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function list(value: unknown, limit = 3): string {
  if (!Array.isArray(value)) return ''
  return value.map(text).filter(Boolean).slice(0, limit).map(item => `• ${item}`).join('\n')
}

function section(content: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = content.match(new RegExp(`##\\s+${escaped}\\s+([\\s\\S]*?)(?=\\n##\\s+|$)`, 'i'))
  return text(match?.[1] || '')
}

async function main() {
  const pilotCodes = (manifest as any).kos.map((entry: any) => entry.code) as string[]
  const kos = await prisma.knowledgeObject.findMany({
    where: { code: { in: pilotCodes }, status: 'published', isDemo: false },
    include: { flashcards: { orderBy: { order: 'asc' } } },
  })

  let updated = 0
  let linkedReviews = 0
  const problems: string[] = []

  for (const ko of kos) {
    let metadata: any = {}
    try { metadata = JSON.parse(ko.metadata || '{}') } catch { /* use content fallbacks */ }

    const summary = text(metadata.summary) || section(ko.content, 'Konunun özü')
    const takeaways = list(metadata.keyTakeaways) || section(ko.content, 'Kontrol listesi')
    const mistakes = list(metadata.commonMistakes, 2) || 'Kapsamı ve veri kaynağını tanımlamadan karar vermek sonuçları yanıltabilir.'
    const example = section(ko.content, 'Örnek uygulama') || text(metadata.example)
    const nextAction = text(metadata.nextAction) || section(ko.content, 'Uygulama adımları')

    const specs = [
      { front: `${ko.title} nedir ve işletme açısından neden önemlidir?`, back: summary, hint: 'Kavramın işletme kararlarına etkisini düşünün.' },
      { front: `${ko.title} konusunda hangi temel karar kriterleri dikkate alınmalıdır?`, back: takeaways, hint: 'Maliyet, fayda, risk ve veri kalitesini birlikte değerlendirin.' },
      { front: `${ko.title} uygulanırken hangi yaygın hatalardan kaçınılmalıdır?`, back: mistakes, hint: 'Eksik veriyle veya tek göstergeyle karar verme riskini düşünün.' },
      { front: `${ko.title} için kısa bir işletme örneği nedir?`, back: example, hint: 'Kavramı gerçek bir KOBİ senaryosuna uygulayın.' },
      { front: `${ko.title} için bugün atılabilecek ilk somut adım nedir?`, back: nextAction, hint: 'Küçük, ölçülebilir ve sorumlusu belli bir adım seçin.' },
    ]

    if (ko.flashcards.length !== 5 || specs.some(card => card.back.length < 30)) {
      problems.push(`${ko.code}: 5 kart veya yeterli metadata bulunamadı`)
      continue
    }

    linkedReviews += await prisma.flashcardReview.count({
      where: { flashcardId: { in: ko.flashcards.map(card => card.id) } },
    })
    await prisma.$transaction(ko.flashcards.map((card, index) => prisma.flashcard.update({
      where: { id: card.id },
      data: { ...specs[index], status: 'published' },
    })))
    updated += 5
  }

  console.log(JSON.stringify({ pilotKos: kos.length, updatedCards: updated, preservedLinkedReviews: linkedReviews, problems }, null, 2))
  if (problems.length) process.exit(1)
}

main().catch(error => { console.error(error); process.exit(1) }).finally(() => prisma.$disconnect())
