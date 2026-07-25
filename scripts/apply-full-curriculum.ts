import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

type Item = { topicId: string; title: string; category: string; subcategory: string; sourceKeys: string[]; reviewGate: string; summary?: string; problem?: string; quickAnswer?: string; learnSteps?: Array<{type: string; title: string; body?: string; steps?: string[]; scenario?: string; table?: any}>; applySteps?: Array<{type: string; items?: string[]; prompt?: string}>; warning?: string; task?: string; seeAlso?: string[]; content: string }
type LibrarySource = { key: string; url: string }
const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

function buildContentFromStructured(item: Item): string {
  const parts: string[] = []
  if (item.summary) parts.push(`## Özet\n\n${item.summary}`)
  if (item.problem) parts.push(`## Çözülmesi Gereken Problem\n\n${item.problem}`)
  if (item.quickAnswer) parts.push(`## Kısa Cevap\n\n${item.quickAnswer}`)
  if (item.learnSteps) {
    for (const s of item.learnSteps) {
      if (s.type === 'concept' && s.body) parts.push(`## ${s.title || 'Kavram'}\n\n${s.body}`)
      else if (s.type === 'steps' && Array.isArray(s.steps)) parts.push(`## ${s.title || 'Adımlar'}\n\n${s.steps.map((st: string, i: number) => `${i + 1}. ${st}`).join('\n')}`)
      else if (s.type === 'example') parts.push(`## ${s.title || 'Örnek'}\n\n${s.scenario || ''}`)
    }
  }
  if (item.applySteps) {
    for (const a of item.applySteps) {
      if (a.type === 'checklist' && Array.isArray(a.items)) parts.push(`## Kontrol Listesi\n\n${a.items.map((it: string) => `- ${it}`).join('\n')}`)
      else if (a.type === 'practice' && a.prompt) parts.push(`## Uygulama\n\n${a.prompt}`)
    }
  }
  if (item.warning) parts.push(`## Uyarı\n\n${item.warning}`)
  if (item.seeAlso && item.seeAlso.length > 0) parts.push(`## İlişkili Konular\n\n${item.seeAlso.map((t: string) => `- ${t}`).join('\n')}`)
  return parts.join('\n\n')
}

function safeMetadata(raw: string): Record<string, unknown> { try { return JSON.parse(raw) } catch { return {} } }

async function main() {
  const [packRaw, libraryRaw] = await Promise.all([
    readFile(resolve('content/full-curriculum-v1.json'), 'utf8'),
    readFile(resolve('SOURCE_LIBRARY_V1.json'), 'utf8')
  ])
  const pack = JSON.parse(packRaw) as { items: Item[] }
  const library = JSON.parse(libraryRaw) as { sources: LibrarySource[] }
  if (pack.items.length !== 120) throw new Error(`Paket 120 konu içermeli; bulunan: ${pack.items.length}`)
  const sourceByKey = new Map(library.sources.map(source => [source.key, source]))
  const legacy = await prisma.knowledgeObject.findMany({ where: { metadata: { contains: 'LocalAkademi Faz 5' } }, include: { sources: true }, orderBy: { id: 'asc' } })
  if (legacy.length !== 600) throw new Error(`600 eski eğitim kaydı bekleniyordu; bulunan: ${legacy.length}`)
  const titleCounts = new Map<string, number>()
  for (const ko of legacy) titleCounts.set(ko.title.trim(), (titleCounts.get(ko.title.trim()) || 0) + 1)
  const badCounts = [...titleCounts].filter(([, count]) => count !== 5)
  if (badCounts.length > 0) console.warn(`UYARI: ${badCounts.length} başlık 5× yapısında değil, atlanıyor: ${badCounts.map(([t]) => t).join(', ')}`)
  const validLegacy = legacy.filter(ko => (titleCounts.get(ko.title.trim()) || 0) === 5)
  if (validLegacy.length % 5 !== 0) throw new Error(`Geçerli legacy KO sayısı 5'in katı değil: ${validLegacy.length}`)
  const validTitles = new Set([...titleCounts].filter(([, c]) => c === 5).map(([t]) => t))
  const missing = pack.items.filter(item => !validTitles.has(item.title.trim()))
  if (missing.length) console.warn(`UYARI: ${missing.length} paket başlığı veritabanında yok, atlanıyor: ${missing.slice(0, 5).map(item => item.title).join(', ')}${missing.length > 5 ? '...' : ''}`)
  const requiredUrls = [...new Set(pack.items.flatMap(item => item.sourceKeys).map(key => sourceByKey.get(key)?.url).filter(Boolean))] as string[]
  const sources = await prisma.source.findMany({ where: { url: { in: requiredUrls } } })
  if (sources.length !== requiredUrls.length) throw new Error('Kaynak kütüphanesi önce veritabanına uygulanmalı.')
  console.log(`Doğrulandı: ${pack.items.length} konu, ${legacy.length} seviye kaydı, ${sources.length} kaynak.`)
  if (!apply) { console.log('DRY RUN — veritabanı değiştirilmedi.'); return }

  const sourceByUrl = new Map(sources.map(source => [source.url, source]))
  let updated = 0
  for (const item of pack.items) {
    const variants = legacy.filter(ko => ko.title.trim() === item.title.trim())
    for (let index = 0; index < variants.length; index++) {
      const ko = variants[index]
      const old = safeMetadata(ko.metadata)
      const levelSuffixes = ['Başlangıç', 'Orta', 'İleri', 'Uygulama', 'Uzman']
      const level = typeof old.level === 'string' ? old.level : levelSuffixes[index]
      const levelSuffix = levelSuffixes[index]
      const levelBlock = level === 'İleri'
        ? '\n\n## İleri Seviye Çalışma\n\nSonucu ürün, kanal ve müşteri kohortlarına ayırın; varsayım duyarlılığı ve ters senaryo analizi yapın.'
        : level === 'Orta'
          ? '\n\n## Orta Seviye Çalışma\n\nBir aylık temel ölçüm kurun, hedef-gerçekleşen farkını neden kodlarıyla izleyin ve iyileştirme deneyi tasarlayın.'
          : level === 'Başlangıç'
            ? '\n\n## Başlangıç Çalışması\n\nKendi işletmenizden tek bir örnek seçin; mevcut durumu, hedefi ve atacağınız ilk adımı üç cümleyle yazın.'
            : level === 'Uygulama'
              ? '\n\n## Uygulama Çalışması\n\nBu konuyu kendi işletmenizde uygulayın: mevcut durumu analiz edin, bir aksiyon planı oluşturun ve sonucu ölçün.'
              : '\n\n## Uzman Seviye Çalışma\n\nBirden fazla senaryo karşılaştırın, ekip eğitimi tasarlayın ve stratejik öneriler sunun.'
      const code = `${item.topicId}-${String(index + 1).padStart(2, '0')}`
      const metadata = JSON.stringify({ ...old, category: item.category, subcategory: item.subcategory, level: levelSuffix,
        contentVersion: 1, curriculumTopicId: item.topicId, sourceKeys: item.sourceKeys,
        editorialState: 'source_checked_review_pending', generatedFrom: 'full-curriculum-v1' })
      const urls = item.sourceKeys.map(key => sourceByKey.get(key)!.url)
      const itemSources = urls.map(url => sourceByUrl.get(url)!)
      const structuredContent = (item.summary || item.problem || item.quickAnswer || item.learnSteps || item.applySteps)
        ? buildContentFromStructured(item)
        : null;
      await prisma.$transaction(async tx => {
        await tx.knowledgeObject.update({ where: { id: ko.id }, data: {
          code, slug: `${item.topicId.toLowerCase()}-${index + 1}`, title: `${item.title} — ${levelSuffix}`,
          summary: item.summary ?? ko.summary,
          problem: item.problem ?? ko.problem,
          quickAnswer: item.quickAnswer ?? ko.quickAnswer,
          learnSteps: item.learnSteps ? JSON.stringify(item.learnSteps) : ko.learnSteps,
          applySteps: item.applySteps ? JSON.stringify(item.applySteps) : ko.applySteps,
          warning: item.warning ?? ko.warning,
          task: item.task ?? ko.task,
          seeAlso: item.seeAlso ? JSON.stringify(item.seeAlso) : ko.seeAlso,
          content: structuredContent ?? item.content + levelBlock,
          metadata, status: 'in_review', verificationStatus: 'pending_review', reviewGate: item.reviewGate,
          isDemo: false, publishedAt: null, reviewDue: new Date()
        } })
        await tx.knowledgeObjectSource.deleteMany({ where: { koId: ko.id } })
        await tx.knowledgeObjectSource.createMany({ data: itemSources.map(source => ({ koId: ko.id, sourceId: source.id, relation: 'supports', note: `Full curriculum V1: ${item.topicId}` })) })
      })
      updated++
    }
  }
  console.log(`${updated} kayıt kaynaklı eğitim içeriğine dönüştürüldü; hiçbiri otomatik yayımlanmadı.`)
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
