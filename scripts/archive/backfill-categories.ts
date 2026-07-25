// one-time, idempotent, already executed (2026-07-17)
// Extracts unique category names from KO metadata JSON, creates Category records,
// and links KOs to categories via categoryId.
//
// Usage: npx tsx scripts/archive/backfill-categories.ts
// Do NOT run automatically on startup — manual execution only.

import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  console.log('=== Category Backfill ===')

  const allKos = await p.knowledgeObject.findMany({
    select: { id: true, metadata: true, categoryId: true }
  })
  console.log(`Total KOs: ${allKos.length}`)

  const categorySet = new Set<string>()
  for (const ko of allKos) {
    try {
      const meta = JSON.parse(ko.metadata)
      if (meta.category && typeof meta.category === 'string') {
        categorySet.add(meta.category.trim())
      }
    } catch { /* skip unparseable metadata */ }
  }
  const categoryNames = Array.from(categorySet).filter(Boolean)
  console.log(`Unique categories found in metadata: ${categoryNames.length}`)
  console.log('  ' + categoryNames.join(', '))

  let createdCount = 0
  const nameToId = new Map<string, number>()
  for (const name of categoryNames) {
    let cat = await p.category.findUnique({ where: { name } })
    if (!cat) {
      cat = await p.category.create({
        data: { name, description: 'Imported from KO metadata during backfill' }
      })
      createdCount++
    }
    nameToId.set(name, cat.id)
  }
  console.log(`Created new categories: ${createdCount}`)
  console.log(`Total categories now: ${await p.category.count()}`)

  let linked = 0
  let skipped = 0
  let errors = 0
  for (const ko of allKos) {
    if (ko.categoryId !== null) {
      skipped++
      continue
    }
    try {
      const meta = JSON.parse(ko.metadata)
      const catName = meta.category?.trim()
      if (catName && nameToId.has(catName)) {
        await p.knowledgeObject.update({
          where: { id: ko.id },
          data: { categoryId: nameToId.get(catName) }
        })
        linked++
      }
    } catch { errors++ }
  }
  console.log(`Linked KOs to categories: ${linked}`)
  console.log(`Skipped (already linked): ${skipped}`)
  console.log(`Errors: ${errors}`)

  const linkedTotal = await p.knowledgeObject.count({ where: { categoryId: { not: null } } })
  const unlinkedTotal = await p.knowledgeObject.count({ where: { categoryId: null } })
  console.log(`\nFinal state:`)
  console.log(`  Linked KOs: ${linkedTotal}`)
  console.log(`  Unlinked KOs: ${unlinkedTotal}`)

  const catDist = await p.knowledgeObject.groupBy({ by: ['categoryId'], _count: true })
  for (const entry of catDist) {
    if (entry.categoryId !== null) {
      const cat = await p.category.findUnique({ where: { id: entry.categoryId } })
      console.log(`  ${cat?.name || '?'}: ${entry._count} KOs`)
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect())
