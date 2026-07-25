import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

type LibrarySource = { key: string; url: string }
type ContentItem = {
  code: string
  title: string
  type: string
  reviewGate: string
  sourceKeys: string[]
  content: string
  metadata: Record<string, unknown>
}

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

const legacyUrls = [
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
]

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8')) as T
}

async function main() {
  const library = readJson<{ sources: LibrarySource[] }>('SOURCE_LIBRARY_V1.json')
  const contentPack = readJson<{ version: number; knowledgeObjects: ContentItem[] }>('DIG_5_KO_CONTENT_V2.json')
  if (contentPack.version !== 2 || contentPack.knowledgeObjects.length !== 5) {
    throw new Error('DIG content pack must contain exactly five version 2 objects')
  }

  const codes = contentPack.knowledgeObjects.map(item => item.code)
  if (new Set(codes).size !== codes.length) throw new Error('Duplicate KO code in content pack')

  const sourceByKey = new Map(library.sources.map(source => [source.key, source]))
  const requiredKeys = [...new Set(contentPack.knowledgeObjects.flatMap(item => item.sourceKeys))]
  for (const key of requiredKeys) {
    if (!sourceByKey.has(key)) throw new Error(`Source key not found in library: ${key}`)
  }

  const requiredUrls = requiredKeys.map(key => sourceByKey.get(key)!.url)
  const [kos, sources, actor] = await Promise.all([
    prisma.knowledgeObject.findMany({
      where: { code: { in: codes } },
      include: { sources: { include: { source: true } } }
    }),
    prisma.source.findMany({ where: { url: { in: requiredUrls } } }),
    prisma.user.findFirst({ where: { role: 'admin' }, orderBy: { id: 'asc' } })
  ])

  if (kos.length !== 5) throw new Error(`Expected five existing KOs, found ${kos.length}`)
  if (sources.length !== requiredUrls.length) {
    const found = new Set(sources.map(source => source.url))
    const missing = requiredUrls.filter(url => !found.has(url))
    throw new Error(`Required sources must be imported first: ${missing.join(', ')}`)
  }
  if (!actor) throw new Error('An admin user is required for version and audit records')

  const legacyLinks = kos.flatMap(ko => ko.sources.filter(link => link.source.url && legacyUrls.includes(link.source.url)))
  const alreadyV2 = kos.filter(ko => {
    try { return JSON.parse(ko.metadata)?.contentVersion === 2 } catch { return false }
  })

  console.log(`[DIG_KO_V2] Objects: ${kos.length}`)
  console.log(`[DIG_KO_V2] Required verified sources: ${sources.length}`)
  console.log(`[DIG_KO_V2] Legacy links to detach: ${legacyLinks.length}`)
  console.log(`[DIG_KO_V2] Already at V2: ${alreadyV2.length}`)

  if (!apply) {
    console.log('[DIG_KO_V2] DRY RUN — no database changes made. Use --apply to update and submit for review.')
    return
  }

  const sourceByUrl = new Map(sources.map(source => [source.url, source]))
  const now = new Date()
  const result = await prisma.$transaction(async tx => {
    let updated = 0
    let detached = 0
    let linked = 0

    for (const item of contentPack.knowledgeObjects) {
      const ko = kos.find(candidate => candidate.code === item.code)!
      let currentMetadata: Record<string, unknown> = {}
      try { currentMetadata = JSON.parse(ko.metadata) } catch {}
      if (currentMetadata.contentVersion === 2) continue

      const oldLinkIds = ko.sources
        .filter(link => link.source.url && legacyUrls.includes(link.source.url))
        .map(link => link.id)
      if (oldLinkIds.length > 0) {
        const deletion = await tx.knowledgeObjectSource.deleteMany({ where: { id: { in: oldLinkIds } } })
        detached += deletion.count
      }

      for (const key of item.sourceKeys) {
        const url = sourceByKey.get(key)!.url
        const source = sourceByUrl.get(url)!
        const relation = await tx.knowledgeObjectSource.findFirst({ where: { koId: ko.id, sourceId: source.id } })
        if (!relation) {
          await tx.knowledgeObjectSource.create({
            data: { koId: ko.id, sourceId: source.id, relation: 'references', note: `Verified source library v1: ${key}` }
          })
          linked += 1
        }
      }

      const latestVersion = await tx.knowledgeObjectVersion.aggregate({
        where: { koId: ko.id },
        _max: { versionNumber: true }
      })
      await tx.knowledgeObjectVersion.create({
        data: {
          koId: ko.id,
          versionNumber: (latestVersion._max.versionNumber || 0) + 1,
          createdBy: actor.id,
          changes: JSON.stringify({
            reason: 'Verified source library V1 and content V2 revision',
            previous: {
              title: ko.title,
              content: ko.content,
              metadata: ko.metadata,
              status: ko.status,
              verificationStatus: ko.verificationStatus,
              publishedAt: ko.publishedAt
            }
          })
        }
      })

      await tx.knowledgeObject.update({
        where: { id: ko.id },
        data: {
          title: item.title,
          type: item.type,
          content: item.content,
          metadata: JSON.stringify(item.metadata),
          reviewGate: item.reviewGate,
          status: 'in_review',
          verificationStatus: 'pending_review',
          publishedAt: null,
          archivedAt: null,
          reviewDue: now
        }
      })

      await tx.reviewRecord.create({
        data: {
          koId: ko.id,
          reviewerId: actor.id,
          status: 'submitted_for_review',
          notes: 'Verified-source V2 revision submitted; professional approval has not been granted.',
          reviewedAt: now
        }
      })

      if (ko.status === 'published') {
        await tx.publicationEvent.create({
          data: {
            koId: ko.id,
            action: 'withdrawn_for_revision',
            performedBy: actor.id,
            note: 'Published V1 withdrawn while verified-source V2 is reviewed.',
            timestamp: now
          }
        })
      }

      await tx.auditLog.create({
        data: {
          action: 'knowledge_object.updated',
          entityType: 'knowledge_object',
          entityId: String(ko.id),
          actorId: actor.id,
          actorName: 'system:dig-ko-v2',
          metadata: JSON.stringify({ entityCode: ko.code, contentVersion: 2, previousStatus: ko.status })
        }
      })
      await tx.auditLog.create({
        data: {
          action: 'knowledge_object.submitted_for_review',
          entityType: 'knowledge_object',
          entityId: String(ko.id),
          actorId: actor.id,
          actorName: 'system:dig-ko-v2',
          metadata: JSON.stringify({ entityCode: ko.code, fromStatus: ko.status, toStatus: 'in_review' })
        }
      })
      updated += 1
    }

    return { updated, detached, linked }
  })

  console.log(`[DIG_KO_V2] Updated and submitted: ${result.updated}`)
  console.log(`[DIG_KO_V2] Legacy links detached: ${result.detached}`)
  console.log(`[DIG_KO_V2] Missing verified links added: ${result.linked}`)
  console.log('[DIG_KO_V2] No object was approved or published automatically.')
}

main()
  .catch(error => {
    console.error(`[DIG_KO_V2] Failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
