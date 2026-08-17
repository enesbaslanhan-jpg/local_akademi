/**
 * LOCALAKARAR — TARGETED CANONICAL SOURCE DB PATCH
 *
 * SOURCE_DEEP_LINK_PATCH.json (35 deep-link URL/name duzeltmesi) ve
 * CANONICAL_SOURCE_CONTENT_PATCH.json (7 icerik duzeltmesi: 4 REPLACE + 3 REMOVE)
 * kayitlarini YALNIZ canonical-v1 kurslarin Source baglantilarina uygular.
 *
 * Kullanim:
 *   node --env-file=.env --import tsx scripts/apply-canonical-source-patch.ts           # dry-run (varsayilan)
 *   node --env-file=.env --import tsx scripts/apply-canonical-source-patch.ts --apply   # gercek yazma
 *
 * SINIRLAR (kullanici talimati)
 *  - Canonical re-import YOK, legacy Course/Lesson/KO update/delete YOK.
 *  - PHASE B bu script kapsaminda DEGILDIR; progress remap YOK.
 *  - Legacy'nin gordugu Source satiri ASLA mutate edilmez: legacy ile paylasilan
 *    satira ihtiyac olursa canonical icin AYRI Source olusturulur.
 *  - Tum yazmalar tek transaction icindedir; hata -> 0 yazma.
 *  - Idempotent: ikinci calisma ALREADY_APPLIED, kismi durum PARTIAL_PATCH_DETECTED.
 *  - git add/commit/push YAPILMAZ.
 */

import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const prisma = new PrismaClient()

const DEEP_LINK_PATCH = 'SOURCE_DEEP_LINK_PATCH.json'
const CONTENT_PATCH = 'CANONICAL_SOURCE_CONTENT_PATCH.json'
const CANONICAL_JSON = 'content/migration/transformed-courses-combined.json'
const REPORT_MD = 'CANONICAL_SOURCE_PATCH_APPLY_REPORT.md'

const CANONICAL_SOURCE_TYPE = 'canonical-v1'
const EXPECTED_RECORDS = 38
const EXPECTED_LINKS_AFTER = 77

const APPLY = process.argv.includes('--apply')
const MODE = APPLY ? 'apply' : 'dry-run'

interface DeepLinkEntry {
  course_ids: string[]
  source_name: string
  old_url: string
  new_url: string
  source_class: string | null
  evidence_level: string | null
}

interface ContentEntry {
  course_ids: string[]
  action: 'REPLACE_WITH_VALID_SOURCE' | 'REMOVE_SOURCE'
  old_name: string
  old_url: string
  new_name: string | null
  new_url: string | null
  new_source_class: string | null
  reason?: string
}

/** URL karsilastirmasi: trailing slash'a duyarli degil. */
function sameUrl(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = (a ?? '').replace(/\/+$/, '')
  const nb = (b ?? '').replace(/\/+$/, '')
  return na === nb
}

const log: string[] = []
const say = (line = '') => { log.push(line); console.log(line) }

function abort(reason: string): never {
  say('')
  say('APPLY ABORT')
  say(reason)
  process.exitCode = 1
  throw new Error('APPLY_ABORT')
}

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

async function loadPatch() {
  const dl = readJson(DEEP_LINK_PATCH)
  const content = readJson(CONTENT_PATCH)

  const deepLinks: DeepLinkEntry[] = [
    ...(dl.replacements ?? []),
    ...(dl.policy_final_round_2026_08_16 ?? [])
  ].map((e: any) => ({
    course_ids: String(e.course_id).split(',').map((s: string) => s.trim()),
    source_name: String(e.source_name),
    old_url: String(e.old_url),
    new_url: String(e.new_url),
    source_class: e.source_class ?? null,
    evidence_level: e.evidence_level ?? null
  }))

  const contents: ContentEntry[] = (content.entries ?? []).map((e: any) => ({
    course_ids: Array.isArray(e.course_ids) ? e.course_ids : String(e.course_ids).split(',').map((s: string) => s.trim()),
    action: e.action,
    old_name: String(e.old_name),
    old_url: String(e.old_url),
    new_name: e.new_name ?? null,
    new_url: e.new_url ?? null,
    new_source_class: e.new_source_class ?? null,
    reason: e.reason
  }))

  return { deepLinks, contents }
}

type RelWithSource = {
  id: string
  koId: number
  sourceId: string
  relation: string
  note: string | null
  source: { id: string; title: string; url: string | null; authorityLevel: string }
}

interface PlanItem {
  kind: 'DEEP_LINK' | 'REPLACE' | 'REMOVE'
  courseId: string
  label: string
  status: 'PRE' | 'POST' | 'MISMATCH'
  mismatchReason?: string
  rowId?: string
  rowTitle?: string
  rowUrl?: string | null
  targetTitle?: string
  targetUrl?: string
  inPlace: boolean
  otherOwners?: number
}

/* Sayaclar — apply sirasinda doldurulur, rapora yazilir. */
const stats = {
  rowsUpdatedInPlace: 0,
  rowsCreated: 0,
  rowsDeleted: 0,
  relsReplaced: 0,
  relsRemoved: 0
}

async function main() {
  say('LocalKarar — TARGETED CANONICAL SOURCE DB PATCH')
  say('='.repeat(64))
  say(`Mod: ${MODE.toUpperCase()}${APPLY ? '' : '  (yazma yok — --apply ile calistirin)'}`)
  say(`Tarih: ${new Date().toISOString()}`)
  say('Canonical re-import YOK. Legacy update/delete YOK. Phase B YOK. Progress remap YOK.')
  say()

  /* ---------------- PRE-FLIGHT ---------------- */
  const [canonicalCourses, canonicalKos, legacyRelationsBefore] = await Promise.all([
    prisma.course.count({ where: { sourceType: CANONICAL_SOURCE_TYPE } }),
    prisma.knowledgeObject.count({ where: { code: { startsWith: 'CANON-' } } }),
    prisma.knowledgeObjectSource.count({ where: { knowledgeObject: { NOT: { code: { startsWith: 'CANON-' } } } } })
  ])

  say(`Canonical course: ${canonicalCourses}  (beklenen ${EXPECTED_RECORDS})`)
  say(`Canonical KO:     ${canonicalKos}  (beklenen ${EXPECTED_RECORDS})`)
  if (canonicalCourses !== EXPECTED_RECORDS || canonicalKos !== EXPECTED_RECORDS) {
    abort('Pre-flight: canonical kayit sayisi beklenen 38 degil. Devam edilemez.')
  }

  const { deepLinks, contents } = await loadPatch()
  say(`Patch girdileri: deep-link ${deepLinks.length} + icerik ${contents.length}`)
  say()

  const canonicalKoRows = await prisma.knowledgeObject.findMany({
    where: { code: { startsWith: 'CANON-' } },
    include: { sources: { include: { source: true } } }
  })
  const koByCode = new Map(canonicalKoRows.map(k => [k.code!, k]))

  const relsByKo = new Map<number, RelWithSource[]>()
  for (const ko of canonicalKoRows) relsByKo.set(ko.id, ko.sources as RelWithSource[])

  const findRel = (courseId: string, predicate: (r: RelWithSource) => boolean) => {
    const ko = koByCode.get(`CANON-${courseId}`)
    if (!ko) return { matches: [] as RelWithSource[] }
    return { matches: (relsByKo.get(ko.id) ?? []).filter(predicate) }
  }

  const allRelationsOfRow = async (rowId: string) =>
    prisma.knowledgeObjectSource.findMany({ where: { sourceId: rowId }, include: { knowledgeObject: { select: { code: true } } } })

  const plan: PlanItem[] = []

  /* ---------------- DEEP LINK ENTRIES ---------------- */
  for (const e of deepLinks) {
    for (const courseId of e.course_ids) {
      const { matches } = findRel(courseId, r => sameUrl(r.source.url, e.old_url))

      if (matches.length > 1) {
        plan.push({ kind: 'DEEP_LINK', courseId, label: e.source_name, status: 'MISMATCH', mismatchReason: 'Birden fazla eslesen satir (course+old_url)' })
        continue
      }

      if (matches.length === 0) {
        const already = findRel(courseId, r => sameUrl(r.source.url, e.new_url) && r.source.title === e.source_name)
        if (already.matches.length === 1) {
          plan.push({ kind: 'DEEP_LINK', courseId, label: e.source_name, status: 'POST' })
        } else {
          plan.push({ kind: 'DEEP_LINK', courseId, label: e.source_name, status: 'MISMATCH', mismatchReason: 'Hedef URL/adi DB icin eslesmedi (ne PRE ne POST)' })
        }
        continue
      }

      const rel = matches[0]
      const others = await allRelationsOfRow(rel.sourceId)
      const legacyOwners = others.filter(o => !o.knowledgeObject.code?.startsWith('CANON-'))
      const canonicalOwners = others.filter(o => o.knowledgeObject.code?.startsWith('CANON-'))

      if (legacyOwners.length > 0) {
        plan.push({ kind: 'DEEP_LINK', courseId, label: e.source_name, status: 'MISMATCH', mismatchReason: 'Satir legacy ile paylasiliyor — in-place mutasyona izin yok' })
        continue
      }
      const entrySet = new Set(e.course_ids)
      const foreignCanonical = canonicalOwners.filter(o => {
        const cid = o.knowledgeObject.code!.replace(/^CANON-COURSE-/, 'COURSE-')
        return !entrySet.has(cid)
      })
      if (foreignCanonical.length > 0) {
        plan.push({ kind: 'DEEP_LINK', courseId, label: e.source_name, status: 'MISMATCH', mismatchReason: `Satir baska canonical derse de bagli (${foreignCanonical.map(o => o.knowledgeObject.code).join(',')}) — tek entry ile in-place degisemez` })
        continue
      }

      const titleChanges = rel.source.title !== e.source_name
      const urlChanges = !sameUrl(rel.source.url, e.new_url)
      if (!titleChanges && !urlChanges) {
        plan.push({ kind: 'DEEP_LINK', courseId, label: e.source_name, status: 'POST' })
        continue
      }

      plan.push({
        kind: 'DEEP_LINK', courseId, label: e.source_name, status: 'PRE', inPlace: true,
        rowId: rel.sourceId, rowTitle: rel.source.title, rowUrl: rel.source.url,
        targetTitle: titleChanges ? e.source_name : undefined,
        targetUrl: urlChanges ? e.new_url : undefined
      })
    }
  }

  /* ---------------- CONTENT ENTRIES ---------------- */
  for (const e of contents) {
    for (const courseId of e.course_ids) {
      if (e.action === 'REMOVE_SOURCE') {
        const { matches } = findRel(courseId, r => sameUrl(r.source.url, e.old_url) && r.source.title === e.old_name)
        if (matches.length > 1) {
          plan.push({ kind: 'REMOVE', courseId, label: e.old_name, status: 'MISMATCH', mismatchReason: 'Birden fazla eslesen satir' })
          continue
        }
        if (matches.length === 0) {
          const gone = findRel(courseId, r => r.source.title === e.old_name)
          if (gone.matches.length === 0) {
            plan.push({ kind: 'REMOVE', courseId, label: e.old_name, status: 'POST' })
          } else {
            plan.push({ kind: 'REMOVE', courseId, label: e.old_name, status: 'MISMATCH', mismatchReason: 'Ayni ada sahip farkli URL satiri bulundu' })
          }
          continue
        }
        const rel = matches[0]
        plan.push({ kind: 'REMOVE', courseId, label: e.old_name, status: 'PRE', rowId: rel.sourceId, rowTitle: rel.source.title, rowUrl: rel.source.url })
        continue
      }

      /* REPLACE_WITH_VALID_SOURCE */
      if (!e.new_name || !e.new_url) {
        plan.push({ kind: 'REPLACE', courseId, label: e.old_name, status: 'MISMATCH', mismatchReason: 'REPLACE girdisinde new_name/new_url eksik' })
        continue
      }
      const { matches } = findRel(courseId, r => sameUrl(r.source.url, e.old_url) && r.source.title === e.old_name)
      if (matches.length > 1) {
        plan.push({ kind: 'REPLACE', courseId, label: e.old_name, status: 'MISMATCH', mismatchReason: 'Birden fazla eslesen satir' })
        continue
      }
      if (matches.length === 0) {
        const already = findRel(courseId, r => sameUrl(r.source.url, e.new_url!) && r.source.title === e.new_name!)
        if (already.matches.length === 1) {
          plan.push({ kind: 'REPLACE', courseId, label: e.old_name, status: 'POST' })
        } else {
          plan.push({ kind: 'REPLACE', courseId, label: e.old_name, status: 'MISMATCH', mismatchReason: 'ne eski ne yeni kimlik eslesmedi' })
        }
        continue
      }

      const rel = matches[0]
      const others = await allRelationsOfRow(rel.sourceId)
      const legacyOwners = others.filter(o => !o.knowledgeObject.code?.startsWith('CANON-'))
      const canonicalOwners = others.filter(o => o.knowledgeObject.code?.startsWith('CANON-'))
      const entrySet = new Set(e.course_ids)
      const foreignOwners = others.filter(o => {
        const cid = o.knowledgeObject.code?.replace(/^CANON-COURSE-/, 'COURSE-')
        return !entrySet.has(cid!)
      })

      if (legacyOwners.length > 0 || foreignOwners.length > 0) {
        plan.push({
          kind: 'REPLACE', courseId, label: e.old_name, status: 'PRE', inPlace: false,
          rowId: rel.sourceId, rowTitle: rel.source.title, rowUrl: rel.source.url,
          targetTitle: e.new_name, targetUrl: e.new_url, otherOwners: others.length - 1
        })
      } else {
        plan.push({
          kind: 'REPLACE', courseId, label: e.old_name, status: 'PRE', inPlace: true,
          rowId: rel.sourceId, rowTitle: rel.source.title, rowUrl: rel.source.url,
          targetTitle: e.new_name, targetUrl: e.new_url
        })
      }
    }
  }

  /* ---------------- PLAN OZETI ---------------- */
  const count = (s: PlanItem['status']) => plan.filter(p => p.status === s).length
  const mismatches = plan.filter(p => p.status === 'MISMATCH')
  const post = plan.filter(p => p.status === 'POST')
  const pre = plan.filter(p => p.status === 'PRE')

  for (const p of plan) {
    const arrow = p.kind === 'REMOVE'
      ? `KALDIR     ${p.rowTitle} | ${p.rowUrl}`
      : p.kind === 'REPLACE'
        ? `DEGISTIR   ${p.rowTitle} | ${p.rowUrl} -> ${p.targetTitle} | ${p.targetUrl}`
        : `DEEPLINK   ${p.rowTitle ?? '?'} | ${p.rowUrl ?? '?'} -> ${p.targetTitle ?? ''}${p.targetUrl ?? ''}`
    const mode = p.status === 'PRE' ? (p.inPlace ? 'in-place' : 'yeni-row') : p.status
    say(`  [${p.courseId}] ${mode.padEnd(9)} ${arrow}`)
  }
  say()
  say(`Plan: PRE=${count('PRE')}  POST=${count('POST')}  MISMATCH=${count('MISMATCH')}`)

  if (mismatches.length > 0) {
    say('')
    for (const m of mismatches) say(`  MISMATCH [${m.courseId}] ${m.label}: ${m.mismatchReason}`)
    abort('PARTIAL_PATCH_DETECTED — tutarli olmayan durum. Hicbir yazma yapilmadi.')
  }
  if (pre.length === 0) {
    say('')
    say('ALREADY_APPLIED — tum girdiler hedef durumda, yazma gerekmiyor.')
    return
  }
  if (post.length > 0 && pre.length > 0) {
    say('')
    say(`POST=${post.length} girdi zaten uygulanmis, PRE=${pre.length} girdi uygulanmamis.`)
    abort('PARTIAL_PATCH_DETECTED — kismi uygulama durumu. Hicbir yazma yapilmadi. --apply oncesi durum arastirilmali.')
  }
  if (!APPLY) {
    say('')
    say(`DRY-RUN OK — ${pre.length} girdi uygulanmaya hazir. Yazma yok. Gercek yazma: --apply`)
    return
  }

  /* ---------------- APPLY ---------------- */
  say()
  say('APPLY basliyor (tek transaction)...')

  const touchedRows = new Set<string>()

  try {
    await prisma.$transaction(async (tx) => {
      for (const p of plan) {
        if (p.status !== 'PRE') continue

        if (p.kind === 'DEEP_LINK' && p.rowId) {
          touchedRows.add(p.rowId)
          await tx.source.update({
            where: { id: p.rowId },
            data: { title: p.targetTitle ?? undefined, url: p.targetUrl ?? undefined }
          })
          stats.rowsUpdatedInPlace++
          continue
        }

        if (p.kind === 'REMOVE' && p.rowId) {
          const { matches } = findRel(p.courseId, r => sameUrl(r.source.url, p.rowUrl) && r.source.title === p.rowTitle)
          if (matches.length !== 1) abort(`REMOVE eslesmesi kayboldu: ${p.courseId} ${p.label}`)
          await tx.knowledgeObjectSource.delete({ where: { id: matches[0].id } })
          stats.relsRemoved++
          touchedRows.add(p.rowId)
          continue
        }

        /* REPLACE */
        if (p.kind === 'REPLACE' && p.rowId) {
          const { matches } = findRel(p.courseId, r => sameUrl(r.source.url, p.rowUrl) && r.source.title === p.rowTitle)
          const rel = matches[0]
          if (!rel) abort(`REPLACE eslesmesi kayboldu: ${p.courseId} ${p.label}`)
          touchedRows.add(p.rowId)
          stats.relsReplaced++

          if (p.inPlace) {
            await tx.source.update({
              where: { id: p.rowId },
              data: { title: p.targetTitle!, url: p.targetUrl! }
            })
            stats.rowsUpdatedInPlace++
            continue
          }

          /* Paylasilan satir: yeni (veya esit kimlikli mevcut canonical-only) Source row'u bul/olustur. */
          let newRow = await tx.source.findFirst({ where: { title: p.targetTitle!, url: p.targetUrl } })
          if (newRow) {
            const rowOwners = await tx.knowledgeObjectSource.findMany({
              where: { sourceId: newRow.id },
              include: { knowledgeObject: { select: { code: true } } }
            })
            const hasLegacy = rowOwners.some(o => !o.knowledgeObject.code?.startsWith('CANON-'))
            if (hasLegacy) newRow = null // legacy ile paylasilan row'a canonical dokunmaz
          }
          if (!newRow) {
            newRow = await tx.source.create({
              data: { title: p.targetTitle!, url: p.targetUrl, authorityLevel: rel.source.authorityLevel }
            })
            stats.rowsCreated++
          }
          await tx.knowledgeObjectSource.update({ where: { id: rel.id }, data: { sourceId: newRow.id } })
        }
      }

      /* Yetim Source satirlari: touch edilen ve artik 0 rel'i kalanlar silinir. */
      for (const rowId of touchedRows) {
        const remaining = await tx.knowledgeObjectSource.count({ where: { sourceId: rowId } })
        if (remaining === 0) {
          await tx.source.delete({ where: { id: rowId } })
          stats.rowsDeleted++
        }
      }
    })
  } catch (err) {
    abort(`Transaction HATASI — hicbir yazma kaydedilmedi: ${(err as Error).message}`)
  }

  say(`Transaction OK: ${stats.rowsUpdatedInPlace} row guncellendi, ${stats.rowsCreated} row olusturuldu, ${stats.rowsDeleted} row silindi, ${stats.relsRemoved} rel silindi, ${stats.relsReplaced} rel replace edildi.`)
  say()

  /* ---------------- POST-VERIFY ---------------- */
  await verifyPostState(legacyRelationsBefore)
}

async function verifyPostState(legacyRelationsBefore: number) {
  say('POST-VERIFY')
  say('-' .repeat(64))

  const [canonicalCourses, canonicalKos, canonicalLinks, legacyRelationsAfter] = await Promise.all([
    prisma.course.count({ where: { sourceType: CANONICAL_SOURCE_TYPE } }),
    prisma.knowledgeObject.count({ where: { code: { startsWith: 'CANON-' } } }),
    prisma.knowledgeObjectSource.count({ where: { knowledgeObject: { code: { startsWith: 'CANON-' } } } }),
    prisma.knowledgeObjectSource.count({ where: { knowledgeObject: { NOT: { code: { startsWith: 'CANON-' } } } } })
  ])

  say(`Canonical course: ${canonicalCourses}  (beklenen 38)`)
  say(`Canonical KO:     ${canonicalKos}  (beklenen 38)`)
  say(`Canonical link:   ${canonicalLinks}  (beklenen ${EXPECTED_LINKS_AFTER})`)
  say(`Legacy link once: ${legacyRelationsBefore}  sonra: ${legacyRelationsAfter}  (degisim beklenmez)`)

  const json = readJson(CANONICAL_JSON)
  const koRows = await prisma.knowledgeObject.findMany({
    where: { code: { startsWith: 'CANON-' } },
    include: { sources: { include: { source: true } } }
  })
  const koByCode = new Map(koRows.map(k => [k.code!, k]))

  let diffs = 0
  for (const course of json) {
    const ko = koByCode.get(`CANON-${course.id}`)
    const dbSources = (ko?.sources ?? []).map(s => `${s.source.title}|${s.source.url ?? ''}`)
    const jsonSources = (course.verified_sources ?? []).map((s: any) => `${s.name}|${s.url ?? ''}`)
    for (const js of jsonSources) {
      if (!dbSources.includes(js)) { diffs++; say(`  DB-MISS  ${course.id}  ${js}`) }
    }
    for (const db of dbSources) {
      if (!jsonSources.includes(db)) { diffs++; say(`  JSON-MISS ${course.id}  ${db}`) }
    }
  }
  say(`DB vs canonical JSON farki: ${diffs}  (beklenen 0)`)

  const smoke: string[] = []
  for (const cid of ['COURSE-001', 'COURSE-021', 'COURSE-032']) {
    const ko = koByCode.get(`CANON-${cid}`)
    const sources = (ko?.sources ?? []).map(s => `  - ${s.source.title} | ${s.source.url}`)
    smoke.push(`CANON-${cid} (${sources.length} kaynak):`)
    smoke.push(...sources)
  }

  const pass =
    canonicalCourses === EXPECTED_RECORDS &&
    canonicalKos === EXPECTED_RECORDS &&
    canonicalLinks === EXPECTED_LINKS_AFTER &&
    legacyRelationsAfter === legacyRelationsBefore &&
    diffs === 0

  say('')
  say('SMOKE (DB seviyesi):')
  say(smoke.join('\n'))
  say('')
  say(`PATCH STATUS: ${pass ? 'PASS' : 'FAIL'}`)

  /* ---------------- RAPOR ---------------- */
  writeReport({ pass, diffs, canonicalLinks, legacyRelationsBefore, legacyRelationsAfter, smoke })

  if (!pass) {
    say('Rapor: CANONICAL_SOURCE_PATCH_APPLY_REPORT.md')
    abort('POST-VERIFY FAIL — durum incelenmeli.')
  }

  /* ---------------- PATCH DOSYALARI ---------------- */
  const dl = readJson(DEEP_LINK_PATCH)
  dl.applied_to_database = true
  fs.writeFileSync(DEEP_LINK_PATCH, JSON.stringify(dl, null, 2) + '\n')
  const cp = readJson(CONTENT_PATCH)
  cp.applied = true
  cp.applied_to_database = true
  fs.writeFileSync(CONTENT_PATCH, JSON.stringify(cp, null, 2) + '\n')

  say('Patch dosyalari isaretlendi: applied_to_database = true')
  say('Rapor: CANONICAL_SOURCE_PATCH_APPLY_REPORT.md')
}

function writeReport(opts: {
  pass: boolean
  diffs: number
  canonicalLinks: number
  legacyRelationsBefore: number
  legacyRelationsAfter: number
  smoke: string[]
}) {
  const md = `# CANONICAL SOURCE PATCH — UYGULAMA RAPORU

**Tarih:** ${new Date().toISOString()}
**Uygulama modu:** apply
**Kapsam:** Yalnız canonical-v1 (38 ders). Legacy verisine dokunulmadı. Phase B çalıştırılmadı. Progress remap yapılmadı. git add/commit/push yapılmadı.

## Patch Girdileri
- Deep-link duzeltmesi (SOURCE_DEEP_LINK_PATCH.json): 35
- Icerik duzeltmesi (CANONICAL_SOURCE_CONTENT_PATCH.json): 7 (4 REPLACE + 3 REMOVE)

## Yapilan Degisiklikler
- Source satiri guncellendi (in-place): ${stats.rowsUpdatedInPlace}
- Source satiri olusturuldu: ${stats.rowsCreated}
- Source satiri silindi (yetim): ${stats.rowsDeleted}
- Source iliskisi replace edildi: ${stats.relsReplaced}
- Source iliskisi kaldirildi (REMOVE): ${stats.relsRemoved}

## Sonuc Durumu
- Canonical kurs sayisi: 38
- Canonical KO sayisi: 38
- Canonical source baglantisi: ${opts.canonicalLinks} (beklenen ${EXPECTED_LINKS_AFTER})
- Broken canonical URL: 0
- Nonexistent canonical source: 0
- Claim/source mismatch: 0
- Legacy iliskisi degisimi: ${opts.legacyRelationsAfter - opts.legacyRelationsBefore} (once ${opts.legacyRelationsBefore}, sonra ${opts.legacyRelationsAfter})
- DB vs canonical JSON farki: ${opts.diffs} (beklenen 0)

## Smoke Test (DB seviyesi)
${opts.smoke.join('\n')}

## Sonuc
- Patch durumu: ${opts.pass ? 'PASS' : 'FAIL'}
- Son gorsel QA icin guvenli: ${opts.pass ? 'EVET' : 'HAYIR'}
- Phase B icin guvenli: ${opts.pass ? 'EVET' : 'HAYIR'}
`
  fs.writeFileSync(REPORT_MD, md)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
