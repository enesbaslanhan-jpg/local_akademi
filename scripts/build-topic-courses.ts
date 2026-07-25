import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const KBX_LEVEL_ORDER: Record<string, number> = { B: 0, O: 1, I: 2 }
const KBX_LEVEL_NAMES: Record<string, string> = { B: 'Başlangıç', O: 'Orta', I: 'İleri' }
const CUR_LEVEL_ORDER: Record<string, number> = {
  'Başlangıç': 0, 'Temel': 0, 'başlangıç': 0,
  'Orta': 1, 'orta': 1,
  'İleri': 2, 'ileri': 2, 'İleri Seviye': 2,
}

function extractTopicKey(code: string): string | null {
  if (!code) return null
  if (code.startsWith('CUR-')) {
    const parts = code.split('-')
    if (parts.length >= 2) return `CUR-${parts[1]}`
  }
  if (code.startsWith('KBX-')) {
    const parts = code.split('-')
    if (parts.length >= 3) return `${parts[0]}-${parts[1]}-${parts[2]}`
  }
  return null
}

function parseMeta(metadata: string): any {
  try { return JSON.parse(metadata) } catch { return {} }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9çşğüöı\- ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function estimateMinutes(meta: any): number {
  const t = meta.estimatedTime || ''
  const nums = t.match(/\d+/g)
  if (nums) return nums.map(Number).reduce((a: number, b: number) => a + b, 0)
  return 10
}

function extractOutcomes(meta: any, content: string): string[] {
  if (meta.learningOutcomes && Array.isArray(meta.learningOutcomes)) return meta.learningOutcomes
  const outcomes: string[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^(öğren|kazan|beceri|anla|uygula)/i.test(trimmed)) {
      outcomes.push(trimmed.replace(/^[•\-*\d.]+/, '').trim())
      if (outcomes.length >= 5) break
    }
  }
  return outcomes.length > 0 ? outcomes : [`${meta.category || ''} konusunda temel bilgi edinme`]
}

function sortKOs(kos: any[]): any[] {
  return [...kos].sort((a, b) => {
    const codeA = a.code || ''
    const codeB = b.code || ''
    const metaA = parseMeta(a.metadata)
    const metaB = parseMeta(b.metadata)

    if (codeA.startsWith('KBX-') && codeB.startsWith('KBX-')) {
      const levelA = KBX_LEVEL_ORDER[codeA.split('-').pop() || ''] ?? 99
      const levelB = KBX_LEVEL_ORDER[codeB.split('-').pop() || ''] ?? 99
      if (levelA !== levelB) return levelA - levelB
    }

    const diffA = CUR_LEVEL_ORDER[metaA.level] ?? (metaA.difficulty ?? 99)
    const diffB = CUR_LEVEL_ORDER[metaB.level] ?? (metaB.difficulty ?? 99)
    if (diffA !== diffB) return diffA - diffB

    return codeA.localeCompare(codeB)
  })
}

function buildCourseTitle(topicKey: string, kos: any[]): string {
  const meta = parseMeta(kos[0].metadata)
  if (meta.subcategory) return meta.subcategory
  if (meta.category) return meta.category
  return topicKey
}

function buildCourseDescription(topicKey: string, kos: any[]): string {
  const meta = parseMeta(kos[0].metadata)
  const cat = meta.category || topicKey
  const sub = meta.subcategory ? ` - ${meta.subcategory}` : ''
  return `${cat}${sub} konusunda ${kos.length} adet bilgi nesnesinden oluşan kapsamlı kurs.`
}

function getCategory(topicKey: string, kos: any[]): string {
  const meta = parseMeta(kos[0].metadata)
  return meta.category || topicKey
}

function getLevel(topicKey: string, kos: any[]): string {
  const levels = new Set<string>()
  for (const ko of kos) {
    const meta = parseMeta(ko.metadata)
    if (meta.level) levels.add(meta.level)
  }
  if (levels.has('Başlangıç') && levels.has('Orta') && levels.has('İleri')) return 'mixed'
  if (levels.size === 1) return [...levels][0]
  return 'mixed'
}

async function main() {
  const kos = await prisma.knowledgeObject.findMany({
    where: { status: 'published', isDemo: false, code: { not: null } },
    include: {
      quizzes: { include: { questions: true } },
      taskTemplates: true,
    },
  })

  const groups = new Map<string, any[]>()
  for (const ko of kos) {
    if (!ko.code) continue
    const key = extractTopicKey(ko.code)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(ko)
  }

  console.log(`Found ${groups.size} topic groups from ${kos.length} KOs`)

  let created = 0, updated = 0, lessonCount = 0

  for (const [topicKey, groupKOs] of groups) {
    const sorted = sortKOs(groupKOs)
    const title = buildCourseTitle(topicKey, sorted)
    const description = buildCourseDescription(topicKey, sorted)
    const category = getCategory(topicKey, sorted)
    const level = getLevel(topicKey, sorted)
    const slug = slugify(`topic-${topicKey}`)

    const allOutcomes: string[] = []
    let totalMinutes = 0
    for (const ko of sorted) {
      const meta = parseMeta(ko.metadata)
      allOutcomes.push(...extractOutcomes(meta, ko.content))
      totalMinutes += estimateMinutes(meta)
    }
    const uniqueOutcomes = [...new Set(allOutcomes)].slice(0, 10)

    const existingCourse = await prisma.course.findUnique({ where: { slug } })

    let course: any
    if (existingCourse) {
      course = await prisma.course.update({
        where: { id: existingCourse.id },
        data: {
          title,
          description,
          category,
          level,
          estimatedMinutes: totalMinutes,
          outcomes: JSON.stringify(uniqueOutcomes),
          sourceType: 'topic',
          published: true,
        },
      })
      updated++
    } else {
      course = await prisma.course.create({
        data: {
          title,
          description,
          category,
          level,
          slug,
          estimatedMinutes: totalMinutes,
          outcomes: JSON.stringify(uniqueOutcomes),
          sourceType: 'topic',
          published: true,
        },
      })
      created++
    }

    for (let i = 0; i < sorted.length; i++) {
      const ko = sorted[i]
      const meta = parseMeta(ko.metadata)
      const existingLesson = await prisma.lesson.findFirst({
        where: { courseId: course.id, knowledgeObjectId: ko.id },
      })

      if (existingLesson) {
        await prisma.lesson.update({
          where: { id: existingLesson.id },
          data: {
            title: ko.title,
            order: i,
            estimatedMinutes: estimateMinutes(meta),
          },
        })
      } else {
        await prisma.lesson.create({
          data: {
            courseId: course.id,
            title: ko.title,
            content: '',
            order: i,
            knowledgeObjectId: ko.id,
            estimatedMinutes: estimateMinutes(meta),
          },
        })
      }
      lessonCount++
    }

    // Delete lessons that no longer have a matching KO (stale)
    const keptIds = sorted.map(ko => ko.id)
    const lessonsToDelete = await prisma.lesson.findMany({
      where: {
        courseId: course.id,
        knowledgeObjectId: { not: null },
        NOT: { knowledgeObjectId: { in: keptIds } },
      },
    })
    for (const l of lessonsToDelete) {
      await prisma.lesson.delete({ where: { id: l.id } })
      lessonCount--
    }
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}, Total lessons: ${lessonCount}`)
  await prisma.$disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
