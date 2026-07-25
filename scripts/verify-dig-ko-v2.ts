import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const legacyUrls = new Set([
  'https://www.tubitak.gov.tr/dijital-olgunluk',
  'https://www.sanayi.gov.tr/dijital-donusum',
  'https://www.kosgeb.gov.tr/dijital-donusum',
  'https://www.iso.org/dijital-araclar',
  'https://bilgem.tubitak.gov.tr/veri-yonetisim',
  'https://cbddo.gov.tr/',
  'https://www.enisa.europa.eu/siber-guvenlik',
  'https://www.iso.org/isoiec-27001',
  'https://ec.europa.eu/ai-ethics',
  'https://www.oecd.org/ai-smes'
])

async function main() {
  const pack = JSON.parse(readFileSync(resolve(process.cwd(), 'DIG_5_KO_CONTENT_V2.json'), 'utf8'))
  const expected = new Map(pack.knowledgeObjects.map((item: any) => [item.code, item]))
  const kos = await prisma.knowledgeObject.findMany({
    where: { code: { in: [...expected.keys()] as string[] } },
    include: { sources: { include: { source: true } }, versions: true, reviews: true }
  })

  const failures: string[] = []
  if (kos.length !== 5) failures.push(`Expected 5 KOs, found ${kos.length}`)

  for (const ko of kos) {
    const item: any = expected.get(ko.code!)
    let metadata: any = {}
    try { metadata = JSON.parse(ko.metadata) } catch { failures.push(`${ko.code}: invalid metadata JSON`) }
    if (metadata.contentVersion !== 2) failures.push(`${ko.code}: contentVersion is not 2`)
    if (ko.content !== item.content) failures.push(`${ko.code}: content does not match V2 pack`)
    if (ko.status !== 'in_review') failures.push(`${ko.code}: expected in_review, got ${ko.status}`)
    if (ko.verificationStatus !== 'pending_review') failures.push(`${ko.code}: expected pending_review`)
    if (ko.publishedAt !== null) failures.push(`${ko.code}: publishedAt must be null during review`)
    if (ko.versions.length === 0) failures.push(`${ko.code}: previous version snapshot missing`)
    if (!ko.reviews.some(review => review.status === 'submitted_for_review' && review.notes?.includes('V2 revision'))) {
      failures.push(`${ko.code}: V2 review submission record missing`)
    }
    for (const link of ko.sources) {
      if (link.source.url && legacyUrls.has(link.source.url)) failures.push(`${ko.code}: legacy source still linked`)
    }
    for (const key of item.sourceKeys) {
      if (!ko.sources.some(link => link.note?.includes(key))) failures.push(`${ko.code}: required source key missing: ${key}`)
    }
  }

  if (failures.length > 0) throw new Error(failures.join('\n'))
  console.log('[DIG_KO_V2_VERIFY] 5/5 content records match V2 pack')
  console.log('[DIG_KO_V2_VERIFY] 5/5 are fail-closed in_review + pending_review')
  console.log('[DIG_KO_V2_VERIFY] 0 legacy source links remain')
  console.log('[DIG_KO_V2_VERIFY] Version snapshots and review records present')
}

main()
  .catch(error => {
    console.error(`[DIG_KO_V2_VERIFY] Failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
