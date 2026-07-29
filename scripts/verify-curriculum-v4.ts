import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { CURRICULUM_V4 } from './lib/publishable-curriculum-v4.js'

const prisma = new PrismaClient()
const STANDARD = 'publishable-curriculum-v4'
const failures: string[] = []
const check = (condition: unknown, message: string) => { if (!condition) failures.push(message) }
const parse = (value: string) => { try { return JSON.parse(value || '{}') } catch { return {} } }

const tokens = (content: string) => new Set(content
  .toLocaleLowerCase('tr-TR')
  .replace(/https?:\/\/\S+/g, '')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .split(/\s+/)
  .filter(word => word.length > 4))

const jaccard = (a: Set<string>, b: Set<string>) => {
  const intersection = [...a].filter(item => b.has(item)).length
  return intersection / (a.size + b.size - intersection || 1)
}

async function main() {
  const published = await prisma.course.findMany({
    where: { published: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: {
          knowledgeObject: {
            include: {
              currentVersion: true,
              sources: { include: { source: true } },
              quizzes: { where: { status: 'published' }, include: { questions: true } },
              flashcards: { where: { status: 'published' }, orderBy: { order: 'asc' } },
              taskTemplates: true,
            },
          },
        },
      },
    },
  })
  check(published.length === 40, `Expected exactly 40 published courses; found ${published.length}.`)
  check(published.every(item => item.sourceType === 'curated-v4'), 'A non-v4 course is still published.')
  check(published.map(item => item.sortOrder).join(',') === Array.from({ length: 40 }, (_, i) => i + 1).join(','), 'Course sort order is not 1..40.')
  check(new Set(published.map(item => item.title)).size === 40, 'Published course titles are not unique.')
  check(published.every(item => item.lessons.length === 5), 'Every published course must have exactly five lessons.')
  check(published.some(item => item.title.includes('E-Ticarete Başla')), 'Discoverable E-Ticarete Başla course is missing.')
  check(published.filter(item => item.category === 'E-Ticaret').length === 4, 'Expected four E-Ticaret courses.')

  const lessons = published.flatMap(item => item.lessons.map(lesson => ({ course: item, lesson })))
  check(lessons.length === 200, `Expected 200 published lessons; found ${lessons.length}.`)
  const koIds = lessons.map(item => item.lesson.knowledgeObjectId).filter((id): id is number => Boolean(id))
  check(new Set(koIds).size === 200, `Expected 200 unique canonical KOs; found ${new Set(koIds).size}.`)

  const visualKinds = new Set<string>()
  const visualFingerprints = new Set<string>()
  const contentTokenSets: Array<{ title: string; value: Set<string> }> = []
  for (const { course, lesson } of lessons) {
    const ko = lesson.knowledgeObject
    check(Boolean(ko), `${course.title}/${lesson.title}: missing KO.`)
    if (!ko) continue
    const metadata = parse(ko.metadata)
    check(ko.status === 'published', `${ko.code}: not published.`)
    check(ko.verificationStatus === 'verified', `${ko.code}: not verified.`)
    check(Boolean(ko.currentVersionId && ko.currentVersion), `${ko.code}: missing current version.`)
    check(metadata.qualityStandard === STANDARD, `${ko.code}: wrong quality standard.`)
    check(metadata.editorialState === 'owner-approved-final', `${ko.code}: not owner-approved-final.`)
    check(ko.content.length >= 2400, `${ko.code}: content too short (${ko.content.length}).`)
    check((ko.content.match(/^## /gm) || []).length >= 6, `${ko.code}: insufficient learning sections.`)
    check(!ko.content.includes('Karar bağlamı'), `${ko.code}: rejected generic "Karar bağlamı" section remains.`)
    check(ko.content.includes('## Kaynaklar ve güncellik'), `${ko.code}: missing bibliography.`)
    check(ko.sources.length >= 2, `${ko.code}: fewer than two sources.`)
    check(ko.sources.every(ref => Boolean(ref.source.url)), `${ko.code}: a source URL is missing.`)
    check(ko.quizzes.length === 1, `${ko.code}: expected one published quiz.`)
    check(ko.quizzes[0]?.questions.length === 5, `${ko.code}: quiz must have five questions.`)
    check(ko.quizzes[0]?.questions.every(q => {
      const options = parse(q.options)
      return Array.isArray(options) && options.length === 4 && options.includes(q.correctAnswer) && (q.explanation?.length || 0) >= 30
    }), `${ko.code}: quiz options/answer/explanation gate failed.`)
    check(ko.flashcards.length === 6, `${ko.code}: expected six published flashcards.`)
    check(ko.flashcards.every(card => card.front.length >= 18 && card.back.length >= 25 && card.front !== card.back), `${ko.code}: flashcards are not true front/back teaching cards.`)
    check(ko.taskTemplates.length >= 1, `${ko.code}: missing workplace task.`)
    check((ko.taskTemplates[0]?.instructions?.length || 0) >= 100, `${ko.code}: task instructions too weak.`)
    check((ko.taskTemplates[0]?.rubric?.length || 0) >= 100, `${ko.code}: task rubric too weak.`)
    check(/^([1-5])\. /.test(lesson.title), `${lesson.title}: lesson order prefix missing.`)
    check(lesson.order >= 1 && lesson.order <= 5, `${lesson.title}: lesson order outside 1..5.`)

    const visualPath = String(metadata.visualAsset || '')
    check(visualPath.startsWith('/academy-visuals/publishable-v4/'), `${ko.code}: wrong visual path.`)
    visualKinds.add(String(metadata.visualKind || ''))
    visualFingerprints.add(String(metadata.visualFingerprint || ''))
    if (visualPath) {
      const diskPath = resolve('frontend/public', visualPath.replace(/^\//, ''))
      try {
        const svg = await readFile(diskPath, 'utf8')
        check(svg.includes(`data-visual-kind="${metadata.visualKind}"`), `${ko.code}: SVG visual kind mismatch.`)
        check(svg.includes(`data-fingerprint="${metadata.visualFingerprint}"`), `${ko.code}: SVG fingerprint mismatch.`)
        check(svg.includes('<title') && svg.includes('<desc'), `${ko.code}: SVG accessibility metadata missing.`)
        const kind = String(metadata.visualKind)
        if (['line', 'bar', 'stacked-bar', 'waterfall', 'scatter', 'sawtooth', 'matrix'].includes(kind)) {
          check(svg.includes('class="axis"') && (svg.includes('<polyline') || svg.includes('<rect') || svg.includes('<circle')), `${ko.code}: chart has no axes/marks.`)
        } else {
          check((svg.match(/<rect/g) || []).length >= 3 || (svg.match(/<circle/g) || []).length >= 3, `${ko.code}: process/decision visual has too few nodes.`)
        }
      } catch {
        failures.push(`${ko.code}: visual file cannot be read (${diskPath}).`)
      }
    }
    contentTokenSets.push({ title: ko.title, value: tokens(ko.content) })
  }
  check(visualKinds.size >= 10, `Expected at least 10 visual grammars; found ${visualKinds.size}.`)
  check(visualFingerprints.size === 200, `Expected 200 unique visual fingerprints; found ${visualFingerprints.size}.`)

  let highestSimilarity = 0
  let closestPair = ''
  for (let i = 0; i < contentTokenSets.length; i += 1) {
    for (let j = i + 1; j < contentTokenSets.length; j += 1) {
      const score = jaccard(contentTokenSets[i].value, contentTokenSets[j].value)
      if (score > highestSimilarity) {
        highestSimilarity = score
        closestPair = `${contentTokenSets[i].title} ↔ ${contentTokenSets[j].title}`
      }
    }
  }
  check(highestSimilarity < 0.86, `Content similarity too high: ${highestSimilarity.toFixed(3)} (${closestPair}).`)

  const canonicalPublished = await prisma.knowledgeObject.count({
    where: { id: { in: koIds }, status: 'published' },
  })
  check(canonicalPublished === 200, `Expected 200 canonical published KOs; found ${canonicalPublished}.`)
  const nonCanonicalPublished = await prisma.knowledgeObject.count({
    where: { id: { notIn: koIds }, status: 'published' },
  })
  check(nonCanonicalPublished === 0, `${nonCanonicalPublished} non-canonical KOs are still published.`)

  const modes = new Set(published.map(item => parse(item.metadata).teachingMode))
  check(modes.size >= 10, `Expected at least 10 teaching modes; found ${modes.size}.`)

  console.log(JSON.stringify({
    courses: published.length,
    lessons: lessons.length,
    uniqueKnowledgeObjects: new Set(koIds).size,
    teachingModes: modes.size,
    visualKinds: visualKinds.size,
    uniqueVisuals: visualFingerprints.size,
    highestContentSimilarity: Number(highestSimilarity.toFixed(3)),
    closestPair,
    failures: failures.length,
  }, null, 2))
  if (failures.length) {
    for (const failure of failures.slice(0, 100)) console.error(`FAIL: ${failure}`)
    if (failures.length > 100) console.error(`...and ${failures.length - 100} more failures.`)
    process.exitCode = 1
  } else {
    console.log('PUBLISHABLE CURRICULUM V4: PASS')
  }
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
