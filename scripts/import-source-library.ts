import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

type LibrarySource = {
  key: string
  title: string
  url: string
  authorityLevel: 'high' | 'medium' | 'low'
  lastChecked: string
  koCodes?: string[]
}

type SourceLibrary = {
  version: number
  sources: LibrarySource[]
}

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

function loadLibrary(): SourceLibrary {
  const path = resolve(process.cwd(), 'SOURCE_LIBRARY_V1.json')
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as SourceLibrary

  if (parsed.version !== 1 || !Array.isArray(parsed.sources) || parsed.sources.length === 0) {
    throw new Error('Unsupported or empty source library')
  }

  const keys = new Set<string>()
  const urls = new Set<string>()
  for (const source of parsed.sources) {
    if (!source.key || !source.title || !source.url || !source.lastChecked) {
      throw new Error(`Invalid source record: ${source.key || 'unknown'}`)
    }
    if (!['high', 'medium', 'low'].includes(source.authorityLevel)) {
      throw new Error(`Invalid authority level for ${source.key}`)
    }
    const parsedUrl = new URL(source.url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(`Invalid URL protocol for ${source.key}`)
    }
    if (keys.has(source.key)) throw new Error(`Duplicate source key: ${source.key}`)
    if (urls.has(source.url)) throw new Error(`Duplicate source URL: ${source.url}`)
    keys.add(source.key)
    urls.add(source.url)
  }

  return parsed
}

async function main() {
  const library = loadLibrary()
  const koCodes = [...new Set(library.sources.flatMap(source => source.koCodes || []))]
  const [existingSources, existingKOs] = await Promise.all([
    prisma.source.findMany({ where: { url: { in: library.sources.map(source => source.url) } } }),
    prisma.knowledgeObject.findMany({ where: { code: { in: koCodes } }, select: { id: true, code: true } })
  ])

  const missingKOs = koCodes.filter(code => !existingKOs.some(ko => ko.code === code))
  console.log(`[SOURCE_LIBRARY] Version: ${library.version}`)
  console.log(`[SOURCE_LIBRARY] Verified records: ${library.sources.length}`)
  console.log(`[SOURCE_LIBRARY] Existing exact URL matches: ${existingSources.length}`)
  console.log(`[SOURCE_LIBRARY] KO links requested: ${koCodes.length}`)
  if (missingKOs.length > 0) console.log(`[SOURCE_LIBRARY] Missing KO codes: ${missingKOs.join(', ')}`)

  if (!apply) {
    console.log('[SOURCE_LIBRARY] DRY RUN — no database changes made. Use --apply to import.')
    return
  }

  const result = await prisma.$transaction(async tx => {
    let created = 0
    let updated = 0
    let linked = 0

    for (const item of library.sources) {
      const existing = await tx.source.findFirst({ where: { url: item.url } })
      const source = existing
        ? await tx.source.update({
            where: { id: existing.id },
            data: {
              title: item.title,
              authorityLevel: item.authorityLevel,
              lastChecked: new Date(item.lastChecked)
            }
          })
        : await tx.source.create({
            data: {
              title: item.title,
              url: item.url,
              authorityLevel: item.authorityLevel,
              lastChecked: new Date(item.lastChecked)
            }
          })

      if (existing) updated += 1
      else created += 1

      for (const code of item.koCodes || []) {
        const ko = existingKOs.find(candidate => candidate.code === code)
        if (!ko) continue
        const relation = await tx.knowledgeObjectSource.findFirst({
          where: { koId: ko.id, sourceId: source.id }
        })
        if (!relation) {
          await tx.knowledgeObjectSource.create({
            data: {
              koId: ko.id,
              sourceId: source.id,
              relation: 'references',
              note: `Verified source library v${library.version}: ${item.key}`
            }
          })
          linked += 1
        }
      }
    }

    return { created, updated, linked }
  })

  console.log(`[SOURCE_LIBRARY] Created: ${result.created}`)
  console.log(`[SOURCE_LIBRARY] Updated: ${result.updated}`)
  console.log(`[SOURCE_LIBRARY] New KO links: ${result.linked}`)
  console.log('[SOURCE_LIBRARY] Import completed successfully.')
}

main()
  .catch(error => {
    console.error(`[SOURCE_LIBRARY] Failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
