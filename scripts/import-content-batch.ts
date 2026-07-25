import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

type Item = {
  code: string
  slug: string
  title: string
  type: string
  level: string
  estimatedMinutes: number
  reviewGate: string
  sourceKeys: string[]
  content: string
}

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const batchArg = process.argv.find(arg => arg.endsWith('.json')) || 'content/finance-batch-01.json'

function validate(item: Item, sourceKeys: Set<string>) {
  const errors: string[] = []
  if (!/^[A-Z0-9-]+$/.test(item.code)) errors.push('geçersiz kod')
  if (!item.slug || !item.title) errors.push('slug veya başlık eksik')
  if (item.content.length < 700) errors.push('içerik 700 karakterden kısa')
  if (!item.content.includes('## Öğrenme hedefleri')) errors.push('öğrenme hedefleri eksik')
  if (item.sourceKeys.length === 0) errors.push('kaynak yok')
  for (const key of item.sourceKeys) if (!sourceKeys.has(key)) errors.push(`bilinmeyen kaynak: ${key}`)
  return errors
}

async function main() {
  const [batchRaw, libraryRaw] = await Promise.all([
    readFile(resolve(batchArg), 'utf8'),
    readFile(resolve('SOURCE_LIBRARY_V1.json'), 'utf8')
  ])
  const batch = JSON.parse(batchRaw) as { batch: string; items: Item[] }
  const library = JSON.parse(libraryRaw) as { sources: Array<{ key: string; url: string }> }
  const sourceByKey = new Map(library.sources.map(source => [source.key, source]))
  const codes = new Set<string>()
  const slugs = new Set<string>()
  const failures: Array<{ code: string; errors: string[] }> = []

  for (const item of batch.items) {
    const errors = validate(item, new Set(sourceByKey.keys()))
    if (codes.has(item.code)) errors.push('yinelenen kod')
    if (slugs.has(item.slug)) errors.push('yinelenen slug')
    codes.add(item.code)
    slugs.add(item.slug)
    if (errors.length) failures.push({ code: item.code, errors })
  }

  if (failures.length) throw new Error(`İçerik doğrulaması başarısız:\n${JSON.stringify(failures, null, 2)}`)
  console.log(`${batch.batch}: ${batch.items.length} içerik doğrulandı.`)
  if (!apply) {
    console.log('Önizleme tamamlandı. Veritabanı değiştirilmedi; uygulamak için --apply kullanın.')
    return
  }

  for (const item of batch.items) {
    const urls = item.sourceKeys.map(key => sourceByKey.get(key)!.url)
    const sources = await prisma.source.findMany({ where: { url: { in: urls } } })
    if (sources.length !== urls.length) {
      throw new Error(`${item.code}: kaynaklar veritabanında eksik. Önce npm run sources:import -- --apply çalıştırın.`)
    }
    const metadata = JSON.stringify({
      category: 'temel-finans', level: item.level, estimatedTime: `${item.estimatedMinutes} dakika`,
      sourceKeys: item.sourceKeys, editorialState: 'machine_validated_human_review_pending', batch: batch.batch
    })
    const ko = await prisma.knowledgeObject.upsert({
      where: { code: item.code },
      update: { slug: item.slug, title: item.title, type: item.type, content: item.content, metadata,
        status: 'draft', verificationStatus: 'source_checked', reviewGate: item.reviewGate, isDemo: false },
      create: { code: item.code, slug: item.slug, title: item.title, type: item.type, content: item.content,
        embedding: '[]', metadata, status: 'draft', verificationStatus: 'source_checked',
        reviewGate: item.reviewGate, isDemo: false }
    })
    await prisma.knowledgeObjectSource.deleteMany({ where: { koId: ko.id } })
    await prisma.knowledgeObjectSource.createMany({
      data: sources.map(source => ({ koId: ko.id, sourceId: source.id, relation: 'supports', note: `Kaynak eşlemesi: ${batch.batch}` }))
    })
  }
  console.log(`${batch.items.length} taslak KO ve kaynak bağlantıları uygulandı; yayın durumu değiştirilmedi.`)
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
