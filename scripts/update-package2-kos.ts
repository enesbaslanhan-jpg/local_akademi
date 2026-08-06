import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

const TARGETS = [
  { topicId: 'CUR-089', code: 'CUR-089-01' },
  { topicId: 'CUR-090', code: 'CUR-090-03' },
  { topicId: 'CUR-091', code: 'CUR-091-02' },
  { topicId: 'CUR-092', code: 'CUR-092-01' },
]

async function main() {
  const packRaw = await readFile(resolve('content/full-curriculum-v1.json'), 'utf8')
  const pack = JSON.parse(packRaw) as { items: Array<{ topicId: string; content: string }> }

  const contentByTopicId = new Map(pack.items.map(item => [item.topicId, item.content]))
  const missing = TARGETS.filter(t => !contentByTopicId.has(t.topicId))
  if (missing.length) {
    throw new Error(`Eksik içerik: ${missing.map(t => t.topicId).join(', ')}`)
  }

  for (const target of TARGETS) {
    const existing = await prisma.knowledgeObject.findUnique({ where: { code: target.code } })
    if (!existing) {
      console.warn(`⚠️ KO bulunamadı: ${target.code}`)
      continue
    }

    const newContent = contentByTopicId.get(target.topicId)!
    if (!apply) {
      console.log(`DRY RUN — ${target.code} güncellenecek (${newContent.length} karakter)`)
      continue
    }

    await prisma.knowledgeObject.update({
      where: { id: existing.id },
      data: {
        content: newContent,
        updatedAt: new Date()
      }
    })
    console.log(`✅ Güncellendi: ${target.code}`)
  }

  if (!apply) {
    console.log('DRY RUN tamamlandı. Uygulamak için --apply ekleyin.')
  }
}

main()
  .catch(error => { console.error(error); process.exitCode = 1 })
  .finally(async () => prisma.$disconnect())
