// demo-mark.ts – Idempotent: marks all 600 auto-generated KOs as demo
// Run: npx tsx prisma/demo-mark.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function slugify(text: string, suffix: string): string {
  const trMap: Record<string, string> = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
  }
  let slug = text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, (c) => trMap[c] || '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80)

  return `${slug}-${suffix}`
}

async function main() {
  console.log('=== Knowledge Object Demo Marking Script ===')
  console.log('Idempotent: safe to run multiple times\n')

  // Step 0: Fix NULL defaults from ALTER TABLE (SQLite quirk)
  console.log('Fixing NULL defaults...')
  const nullCount = await (prisma as any).$executeRawUnsafe(
    `UPDATE KnowledgeObject SET isDemo = 0, status = 'draft', verificationStatus = 'unverified', reviewGate = 'standard' WHERE isDemo IS NULL`
  ).catch(() => 0)
  console.log(`Patched ${nullCount} NULL rows\n`)

  const total = await prisma.knowledgeObject.count()
  console.log(`Total KOs in database: ${total}`)

  // Only target KOs that have NOT been marked yet
  const target = await prisma.knowledgeObject.findMany({
    where: {
      OR: [
        { isDemo: false },
        { code: null },
        { code: { startsWith: 'DEMO-' } }
      ]
    }
  })

  console.log(`KOs needing transformation: ${target.length}`)

  if (target.length === 0) {
    console.log('All KOs already marked. Nothing to do.')
    return
  }

  // Pre-check: ensure no code/slug collisions will occur
  const codesSet = new Set<string>()
  const slugsSet = new Set<string>()
  const collisions: string[] = []

  const existingCodes = await prisma.knowledgeObject.findMany({
    where: { code: { not: null } },
    select: { code: true, slug: true }
  })
  existingCodes.forEach(k => {
    if (k.code) codesSet.add(k.code)
    if (k.slug) slugsSet.add(k.slug)
  })

  for (const ko of target) {
    const code = `DEMO-${ko.id}`
    const slug = slugify(ko.title, String(ko.id))

    if (codesSet.has(code)) collisions.push(`code collision: ${code}`)
    if (slugsSet.has(slug)) collisions.push(`slug collision: ${slug} (id=${ko.id})`)

    codesSet.add(code)
    slugsSet.add(slug)
  }

  if (collisions.length > 0) {
    console.error('❌ Collisions found, aborting:')
    collisions.forEach(c => console.error(`  - ${c}`))
    return
  }

  console.log('✅ No code/slug collisions detected')
  console.log('Applying transformations...\n')

  let updated = 0
  for (const ko of target) {
    await prisma.knowledgeObject.update({
      where: { id: ko.id },
      data: {
        code: `DEMO-${ko.id}`,
        slug: slugify(ko.title, String(ko.id)),
        status: 'published',
        verificationStatus: 'demo_unverified',
        reviewGate: 'demo_only',
        isDemo: true
      }
    })
    updated++
    if (updated % 100 === 0) {
      console.log(`  Updated ${updated}/${target.length}...`)
    }
  }

  console.log(`\n✅ All ${updated} KOs marked as demo`)

  // Verify
  const demoCount = await prisma.knowledgeObject.count({ where: { isDemo: true } })
  const withCode = await prisma.knowledgeObject.count({ where: { code: { not: null } } })
  const withSlug = await prisma.knowledgeObject.count({ where: { slug: { not: null } } })

  console.log('\n=== Verification ===')
  console.log(`Total KOs:              ${demoCount}`)
  console.log(`isDemo = true:          ${demoCount}/${total}`)
  console.log(`code not null:          ${withCode}/${total}`)
  console.log(`slug not null:          ${withSlug}/${total}`)

  if (demoCount === total && withCode === total && withSlug === total) {
    console.log('✅ All checks passed')
  } else {
    console.log('⚠️  Some checks failed – review')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())