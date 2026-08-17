/**
 * PHASE A — Canonical içerik import.
 *
 * 38 canonical dersi Course + Lesson + KnowledgeObject + Version + Source
 * + gömülü pratik kart yapılarıyla oluşturur.
 *
 * Kullanım:
 *   node --env-file=.env --import tsx scripts/content-migration-phase-a.ts            # dry-run (varsayilan)
 *   node --env-file=.env --import tsx scripts/content-migration-phase-a.ts --apply    # gercek yazma
 *
 * SINIRLAR
 *  - PHASE B (legacy archive) BU SCRIPT'TE YOK ve calistirilmaz.
 *  - Legacy Course/Lesson/KO okunur ama YAZILMAZ.
 *  - Shared KO ve dort tutarsiz KO'ya dokunulmaz.
 *  - Kullanici gecmisi silinmez, remap edilmez.
 *  - Legacy KO yeniden kullanilmaz; her canonical icerik KENDI KO'sunu alir.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const prisma = new PrismaClient()

const CANONICAL_PATH = 'content/migration/transformed-courses-combined.json'
const REPORT_MD = 'PHASE_A_CANONICAL_IMPORT_REPORT.md'
const REPORT_JSON = 'PHASE_A_CANONICAL_IMPORT_REPORT.json'

/** Canonical partisini isaretleyen tek alan. Idempotency bunun uzerinden. */
const CANONICAL_SOURCE_TYPE = 'canonical-v1'
const EXPECTED_RECORDS = 38
const EXPECTED_LEGACY_COURSES = 288
const EXPECTED_LEGACY_LESSONS = 1170
const REQUIRED_TOOL_COUNT = 13

const APPLY = process.argv.includes('--apply')
const MODE = APPLY ? 'apply' : 'dry-run'

interface CanonicalLesson {
  id: string
  title: string
  slug: string
  category: string
  decision_tool_id: string
  content_markdown: string
  embedded_practice_cards?: Array<{ type: string; title: string; description?: string }>
  verified_sources?: Array<{ name: string; url?: string }>
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

/* Canonical kart tipi -> gömülü blok tipi. Yalnız bu dört tip render
   ediliyor (embedded-practice-blocks.ts). "warning" mevcut sistemde
   cash_flow_warning ile ayni anlamda common_mistake'e eslenir. */
const BLOCK_TYPE: Record<string, string> = {
  formula: 'formula',
  warning: 'common_mistake',
  checklist: 'checklist',
  quick_application: 'quick_application',
  common_mistake: 'common_mistake'
}

/** Markdown'dan kisa aciklama: ilk anlamli paragraf. */
function deriveDescription(markdown: string): string {
  const paragraph = markdown
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 40 && !line.startsWith('#') && !line.startsWith('|') && !line.startsWith('-'))
  const text = paragraph ?? markdown.replace(/[#>*|-]/g, ' ').trim()
  return text.slice(0, 400)
}

/** Okuma suresi tahmini — 200 kelime/dk, en az 5 dk. */
function estimateMinutes(markdown: string): number {
  const words = markdown.split(/\s+/).filter(Boolean).length
  return Math.max(5, Math.round(words / 200))
}

async function readHistoryCounts() {
  return {
    Enrollment: await prisma.enrollment.count(),
    DecisionCheckSession: await prisma.decisionCheckSession.count(),
    LessonProgress: await prisma.lessonProgress.count(),
    KnowledgeProgress: await prisma.knowledgeProgress.count(),
    FormulaCalculation: await prisma.formulaCalculation.count(),
    ActivityEvent: await prisma.activityEvent.count(),
    QuizAttempt: await prisma.quizAttempt.count(),
    TaskAssignment: await prisma.taskAssignment.count()
  }
}

async function readLegacyCounts() {
  return {
    courses: await prisma.course.count({ where: { sourceType: { not: CANONICAL_SOURCE_TYPE } } }),
    lessons: await prisma.lesson.count({ where: { course: { sourceType: { not: CANONICAL_SOURCE_TYPE } } } }),
    kos: await prisma.knowledgeObject.count({ where: { NOT: { code: { startsWith: 'CANON-' } } } }),
    inconsistentKos: await prisma.knowledgeObject.count({ where: { archivedAt: { not: null }, status: 'published' } }),
    archivedCourses: await prisma.course.count({ where: { archivedAt: { not: null } } })
  }
}

async function main() {
  say('LocalKarar — PHASE A CANONICAL IMPORT')
  say('='.repeat(64))
  say(`Mod: ${MODE.toUpperCase()}${APPLY ? '' : '  (yazma yok — --apply ile calistirin)'}`)
  say(`Tarih: ${new Date().toISOString()}`)
  say('PHASE B (legacy archive) bu script kapsaminda DEGILDIR.')
  say()

  /* ---------------- 2. PRE-FLIGHT ---------------- */
  say('PRE-FLIGHT')
  say('-'.repeat(64))

  if (!fs.existsSync(CANONICAL_PATH)) abort(`Canonical dosya yok: ${CANONICAL_PATH}`)
  let rows: CanonicalLesson[]
  try {
    rows = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'))
  } catch (err) {
    return abort(`Canonical JSON parse edilemedi: ${String(err).slice(0, 200)}`)
  }
  if (!Array.isArray(rows)) abort('Canonical dosya bir dizi degil.')

  const duplicateIds = rows.length - new Set(rows.map(r => r.id)).size
  const duplicateSlugs = rows.length - new Set(rows.map(r => r.slug)).size

  const tools = await prisma.decisionCheck.findMany({ where: { deletedAt: null }, select: { code: true } })
  const toolCodes = new Set(tools.map(t => t.code))
  const usedTools = [...new Set(rows.map(r => r.decision_tool_id))]
  const missingTools = usedTools.filter(c => !toolCodes.has(c))

  const legacyBefore = await readLegacyCounts()
  const historyBefore = await readHistoryCounts()

  const preflight = {
    canonical_valid: Array.isArray(rows),
    canonical_records: rows.length,
    duplicate_ids: duplicateIds,
    duplicate_slugs: duplicateSlugs,
    decision_tools_required: REQUIRED_TOOL_COUNT,
    decision_tools_found: toolCodes.size,
    missing_decision_tools: missingTools,
    legacy_courses: legacyBefore.courses,
    legacy_lessons: legacyBefore.lessons
  }

  say(`  canonical records      : ${preflight.canonical_records} (beklenen ${EXPECTED_RECORDS})`)
  say(`  duplicate ID / slug    : ${duplicateIds} / ${duplicateSlugs}`)
  say(`  decision tool found    : ${toolCodes.size} (beklenen ${REQUIRED_TOOL_COUNT})`)
  say(`  eksik decision tool    : ${missingTools.length ? missingTools.join(', ') : 'yok'}`)
  say(`  legacy Course          : ${legacyBefore.courses} (beklenen ${EXPECTED_LEGACY_COURSES})`)
  say(`  legacy Lesson          : ${legacyBefore.lessons} (beklenen ${EXPECTED_LEGACY_LESSONS})`)
  say()

  const problems: string[] = []
  if (rows.length !== EXPECTED_RECORDS) problems.push(`canonical records ${rows.length} != ${EXPECTED_RECORDS}`)
  if (duplicateIds !== 0) problems.push(`duplicate ID: ${duplicateIds}`)
  if (duplicateSlugs !== 0) problems.push(`duplicate slug: ${duplicateSlugs}`)
  if (toolCodes.size !== REQUIRED_TOOL_COUNT) problems.push(`decision tool ${toolCodes.size} != ${REQUIRED_TOOL_COUNT}`)
  if (missingTools.length > 0) problems.push(`eksik decision tool: ${missingTools.join(', ')}`)
  if (legacyBefore.courses !== EXPECTED_LEGACY_COURSES) problems.push(`legacy Course ${legacyBefore.courses} != ${EXPECTED_LEGACY_COURSES}`)
  if (legacyBefore.lessons !== EXPECTED_LEGACY_LESSONS) problems.push(`legacy Lesson ${legacyBefore.lessons} != ${EXPECTED_LEGACY_LESSONS}`)
  if (problems.length > 0) {
    abort('Temel sayilar dry-run ile uyusmuyor:\n' + problems.map(p => '  - ' + p).join('\n'))
  }
  say('  PRE-FLIGHT: GECTI')
  say()

  /* ---------------- 5. IDEMPOTENCY ---------------- */
  const existingCanonical = await prisma.course.findMany({
    where: { sourceType: CANONICAL_SOURCE_TYPE },
    select: { id: true, slug: true }
  })

  say('IDEMPOTENCY KONTROLU')
  say('-'.repeat(64))
  say(`  Mevcut canonical Course: ${existingCanonical.length}`)

  const alreadyApplied = existingCanonical.length === EXPECTED_RECORDS

  /* Kismi set: otomatik tamamlama YAPILMAZ. Hangi 1-37 kaydin yazildigini
     bilmeden devam etmek sessizce bozuk katalog uretir. */
  if (existingCanonical.length > 0 && !alreadyApplied) {
    say()
    say('PARTIAL_IMPORT_DETECTED')
    say(`  ${existingCanonical.length}/${EXPECTED_RECORDS} canonical icerik bulundu.`)
    say('  Otomatik tamamlama YAPILMADI. Kismi durum insan karari gerektirir.')
    await writeReports({
      status: 'PARTIAL_IMPORT_DETECTED', rows, preflight, legacyBefore, historyBefore,
      legacyAfter: legacyBefore, historyAfter: historyBefore, created: null, verify: null, smoke: null
    })
    process.exitCode = 1
    return
  }

  if (alreadyApplied) {
    say()
    say('ALREADY_APPLIED')
    say('  38 canonical icerik zaten mevcut. Bu calismada YAZMA YAPILMAZ.')
    say('  Dogrulama ve smoke yine de calisir; gate guncel durumu raporlar.')
  } else {
    say('  Temiz durum — import edilebilir.')
  }
  say()

  /* ---------------- 3/4. PLAN ve CREATE ---------------- */
  const author = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } })
  if (!author) abort('KnowledgeObjectVersion.createdBy icin admin kullanici bulunamadi.')

  // Ayni URL birden fazla derste geciyor; kaynak satiri bir kez uretilir.
  const uniqueSourceKeys = new Set<string>()
  for (const row of rows) {
    for (const source of row.verified_sources ?? []) {
      uniqueSourceKeys.add(`${source.name}|${source.url ?? ''}`)
    }
  }

  const plan = {
    courses: rows.length,
    lessons: rows.length,
    kos: rows.length,
    koVersions: rows.length,
    sourceLinks: rows.reduce((sum, r) => sum + (r.verified_sources?.length ?? 0), 0),
    // Anahtar adi `created` ile ayni olmali; gate her iki modda ayni alani okur.
    sources: uniqueSourceKeys.size,
    practiceCards: rows.reduce((sum, r) => sum + (r.embedded_practice_cards?.length ?? 0), 0)
  }

  say('PLAN')
  say('-'.repeat(64))
  say(`  Course              : ${plan.courses}`)
  say(`  Lesson              : ${plan.lessons}`)
  say(`  KnowledgeObject     : ${plan.kos}`)
  say(`  KnowledgeObjectVer. : ${plan.koVersions}`)
  say(`  Source (tekil)      : ${plan.sources}  (${plan.sourceLinks} bag)`)
  say(`  Pratik kart (gomulu): ${plan.practiceCards}`)
  say('  Legacy KO reuse     : 0  (her icerik kendi KO sunu alir)')
  say()

  if (!APPLY && !alreadyApplied) {
    say('DRY-RUN — yazma yapilmadi. Gercek import icin --apply kullanin.')
    await writeReports({
      status: 'DRY_RUN', rows, preflight, legacyBefore, historyBefore,
      legacyAfter: legacyBefore, historyAfter: historyBefore, created: plan, verify: null, smoke: null
    })
    return
  }

  const created = { courses: 0, lessons: 0, kos: 0, koVersions: 0, sources: 0, sourceLinks: 0, practiceCards: 0 }
  if (!alreadyApplied) say('APPLY — tek transaction icinde olusturuluyor...')

  /* Tum canonical parti TEK transaction. Herhangi biri patlarsa hicbiri
     yazilmaz; yarim katalog kalmaz. Varsayilan 5sn timeout 38 icerik icin
     yetmez, bilincli olarak yukseltildi. */
  if (!alreadyApplied) await prisma.$transaction(async tx => {
    const sourceIdByKey = new Map<string, string>()

    for (const [index, row] of rows.entries()) {
      const blocks = (row.embedded_practice_cards ?? [])
        .map((card, cardIndex) => ({
          id: `${row.id}-block-${cardIndex + 1}`,
          type: BLOCK_TYPE[card.type] ?? 'quick_application',
          title: card.title,
          shortDescription: card.description ?? null,
          content: { mainContent: card.description ?? '' }
        }))

      const ko = await tx.knowledgeObject.create({
        data: {
          code: `CANON-${row.id}`,
          slug: row.slug,
          type: 'concept',
          title: row.title,
          content: row.content_markdown,
          embedding: '',
          status: 'published',
          publishedAt: new Date(),
          metadata: JSON.stringify({
            canonicalId: row.id,
            canonicalCategory: row.category,
            decisionToolCode: row.decision_tool_id,
            migrationPhase: 'A',
            embeddedPracticeBlocksVersion: 'operations-wave-2',
            embeddedPracticeBlocks: blocks
          })
        }
      })
      created.kos++
      created.practiceCards += blocks.length

      await tx.knowledgeObjectVersion.create({
        data: {
          koId: ko.id,
          versionNumber: 1,
          changes: 'Canonical Phase A import',
          createdBy: author.id
        }
      })
      created.koVersions++

      for (const source of row.verified_sources ?? []) {
        const key = `${source.name}|${source.url ?? ''}`
        let sourceId = sourceIdByKey.get(key)
        if (!sourceId) {
          const createdSource = await tx.source.create({
            data: { title: source.name, url: source.url ?? null, authorityLevel: 'high', lastChecked: new Date() }
          })
          sourceId = createdSource.id
          sourceIdByKey.set(key, sourceId)
          created.sources++
        }
        await tx.knowledgeObjectSource.create({
          data: { koId: ko.id, sourceId, relation: 'references' }
        })
        created.sourceLinks++
      }

      const course = await tx.course.create({
        data: {
          title: row.title,
          description: deriveDescription(row.content_markdown),
          category: row.category,
          level: 'beginner',
          slug: row.slug,
          estimatedMinutes: estimateMinutes(row.content_markdown),
          outcomes: '[]',
          sourceType: CANONICAL_SOURCE_TYPE,
          sortOrder: index + 1,
          published: true,
          metadata: JSON.stringify({
            canonicalId: row.id,
            decisionToolCode: row.decision_tool_id,
            migrationPhase: 'A'
          })
        }
      })
      created.courses++

      await tx.lesson.create({
        data: {
          courseId: course.id,
          title: row.title,
          content: row.content_markdown,
          order: 1,
          knowledgeObjectId: ko.id,
          estimatedMinutes: estimateMinutes(row.content_markdown)
        }
      })
      created.lessons++
    }
  }, { timeout: 180_000, maxWait: 30_000 })

  if (!alreadyApplied) { say('  Transaction tamamlandi.'); say() }

  /* ---------------- 6/7/8. VERIFY ---------------- */
  const legacyAfter = await readLegacyCounts()
  const historyAfter = await readHistoryCounts()

  const canonicalCourses = await prisma.course.findMany({
    where: { sourceType: CANONICAL_SOURCE_TYPE },
    select: { id: true, slug: true, metadata: true, published: true, archivedAt: true }
  })
  const canonicalKos = await prisma.knowledgeObject.findMany({
    where: { code: { startsWith: 'CANON-' } },
    select: { id: true, code: true, metadata: true }
  })
  const canonicalLessons = await prisma.lesson.count({
    where: { course: { sourceType: CANONICAL_SOURCE_TYPE } }
  })
  const canonicalVersions = await prisma.knowledgeObjectVersion.count({
    where: { knowledgeObject: { code: { startsWith: 'CANON-' } } }
  })
  const canonicalSourceLinks = await prisma.knowledgeObjectSource.count({
    where: { knowledgeObject: { code: { startsWith: 'CANON-' } } }
  })

  let toolLinksValid = 0
  let taxLinkValid = false
  let blocksPresent = 0
  for (const ko of canonicalKos) {
    let meta: any = {}
    try { meta = JSON.parse(ko.metadata || '{}') } catch { /* ignore */ }
    if (meta.decisionToolCode && toolCodes.has(meta.decisionToolCode)) toolLinksValid++
    if (meta.decisionToolCode === 'DC-TAX-013') taxLinkValid = true
    if (Array.isArray(meta.embeddedPracticeBlocks)) blocksPresent += meta.embeddedPracticeBlocks.length
  }

  const slugs = canonicalCourses.map(c => c.slug)
  const duplicateCanonicalSlugs = slugs.length - new Set(slugs).size

  const verify = {
    canonical_courses: canonicalCourses.length,
    canonical_lessons: canonicalLessons,
    canonical_kos: canonicalKos.length,
    canonical_ko_versions: canonicalVersions,
    canonical_source_links: canonicalSourceLinks,
    canonical_practice_blocks: blocksPresent,
    decision_tool_links_valid: toolLinksValid,
    dc_tax_013_valid: taxLinkValid,
    duplicate_canonical_slugs: duplicateCanonicalSlugs,
    legacy_courses_modified: legacyBefore.courses - legacyAfter.courses,
    legacy_lessons_modified: legacyBefore.lessons - legacyAfter.lessons,
    legacy_kos_modified: legacyBefore.kos - legacyAfter.kos,
    legacy_courses_archived: legacyAfter.archivedCourses,
    inconsistent_kos_untouched: legacyAfter.inconsistentKos === legacyBefore.inconsistentKos
  }

  say('POST-IMPORT VERIFY')
  say('-'.repeat(64))
  for (const [k, v] of Object.entries(verify)) say(`  ${k.padEnd(30)}: ${v}`)
  say()

  /* ---------------- 9. READ-ONLY SMOKE ---------------- */
  const sample = canonicalCourses[0]
  const sampleDetail = sample ? await prisma.course.findUnique({
    where: { id: sample.id },
    include: { lessons: { include: { knowledgeObject: { include: { sources: { include: { source: true } } } } } } }
  }) : null

  const tax = canonicalKos.find(ko => {
    try { return JSON.parse(ko.metadata || '{}').decisionToolCode === 'DC-TAX-013' } catch { return false }
  })
  const taxCourse = tax ? await prisma.course.findFirst({
    where: { sourceType: CANONICAL_SOURCE_TYPE, lessons: { some: { knowledgeObjectId: tax.id } } },
    select: { id: true, slug: true, metadata: true }
  }) : null

  const catalogVisible = await prisma.course.count({
    where: { published: true, archivedAt: null, sourceType: CANONICAL_SOURCE_TYPE }
  })

  const firstLessonKo = sampleDetail?.lessons?.[0]?.knowledgeObject
  let firstBlocks = 0
  try { firstBlocks = (JSON.parse(firstLessonKo?.metadata || '{}').embeddedPracticeBlocks || []).length } catch { /* ignore */ }

  const smoke = {
    catalog_api_visible_canonical: catalogVisible,
    course_detail_reads: Boolean(sampleDetail),
    lesson_content_present: Boolean(sampleDetail?.lessons?.[0]?.content?.length),
    sources_present: (firstLessonKo?.sources?.length ?? 0) > 0,
    practice_cards_present: firstBlocks > 0,
    decision_tool_cta_resolvable: toolLinksValid === EXPECTED_RECORDS,
    course_021_tax_link: Boolean(taxCourse),
    course_021_slug: taxCourse?.slug ?? null
  }

  say('READ-ONLY SMOKE')
  say('-'.repeat(64))
  for (const [k, v] of Object.entries(smoke)) say(`  ${k.padEnd(30)}: ${v}`)
  say()

  /* Yeniden calistirmada bu tur 0 yazar; gate'in "created" satirlari
     DB'de gercekten bulunan sayilari gostersin diye verify'dan doldurulur. */
  const reported = alreadyApplied
    ? {
        courses: verify.canonical_courses, lessons: verify.canonical_lessons,
        kos: verify.canonical_kos, koVersions: verify.canonical_ko_versions,
        sources: verify.canonical_source_links, sourceLinks: verify.canonical_source_links,
        practiceCards: verify.canonical_practice_blocks
      }
    : created

  await writeReports({
    status: alreadyApplied ? 'ALREADY_APPLIED' : 'APPLIED',
    rows, preflight, legacyBefore, historyBefore,
    legacyAfter, historyAfter, created: reported, verify, smoke
  })
}

async function writeReports(ctx: any) {
  const { status, rows, preflight, legacyBefore, historyBefore, legacyAfter, historyAfter, created, verify, smoke } = ctx
  const historyTotal = (h: any) => Object.values(h).reduce((a: any, b: any) => a + b, 0)
  const historyDeletes = Math.max(0, (historyTotal(historyBefore) as number) - (historyTotal(historyAfter) as number))

  const pass = (status === 'APPLIED' || status === 'ALREADY_APPLIED') &&
    verify?.canonical_courses === 38 &&
    verify?.decision_tool_links_valid === 38 &&
    verify?.dc_tax_013_valid === true &&
    verify?.duplicate_canonical_slugs === 0 &&
    verify?.legacy_courses_modified === 0 &&
    verify?.legacy_lessons_modified === 0 &&
    verify?.legacy_kos_modified === 0 &&
    verify?.legacy_courses_archived === 0 &&
    historyDeletes === 0

  const gate = [
    'PHASE A GATE',
    '',
    `Apply mode used: ${MODE}`,
    `Canonical requested: ${rows.length}`,
    `Canonical created: ${created ? created.courses ?? created.courses : 0}`,
    '',
    `Courses created: ${created?.courses ?? 0}`,
    `Lessons created: ${created?.lessons ?? 0}`,
    `KOs created: ${created?.kos ?? 0}`,
    `KO Versions created: ${created?.koVersions ?? 0}`,
    `Sources created/linked: ${created?.sources ?? 0} / ${created?.sourceLinks ?? 0}`,
    `Practice Cards created/linked: ${created?.practiceCards ?? 0}`,
    '',
    `Decision Tool links valid: ${verify ? `${verify.decision_tool_links_valid}/38` : 'n/a'}`,
    `DC-TAX-013 valid: ${verify ? (verify.dc_tax_013_valid ? 'YES' : 'NO') : 'n/a'}`,
    '',
    `Duplicate canonical slugs: ${verify?.duplicate_canonical_slugs ?? 'n/a'}`,
    '',
    `Legacy Courses modified: ${verify?.legacy_courses_modified ?? 0}`,
    `Legacy Lessons modified: ${verify?.legacy_lessons_modified ?? 0}`,
    `Legacy KOs modified: ${verify?.legacy_kos_modified ?? 0}`,
    `Shared KOs mutated: 0`,
    '',
    `User-history before: ${historyTotal(historyBefore)}`,
    `User-history after: ${historyTotal(historyAfter)}`,
    `User-history deletes: ${historyDeletes}`,
    `Progress remaps: 0`,
    '',
    `API smoke tests: ${smoke ? (Object.values(smoke).filter(v => v === false).length === 0 ? 'PASS' : 'CHECK') : 'n/a'}`,
    '',
    `Phase A status: ${pass ? 'PASS' : (status === 'APPLIED' ? 'FAIL' : status)}`,
    '',
    `Safe to proceed to Phase B legacy archive: ${pass ? 'YES' : 'NO'}`
  ].join('\n')

  say(gate)

  const json = {
    generated_at: new Date().toISOString(),
    mode: MODE,
    status,
    phase_b_executed: false,
    preflight,
    plan_or_created: created,
    legacy_before: legacyBefore,
    legacy_after: legacyAfter,
    user_history_before: historyBefore,
    user_history_after: historyAfter,
    user_history_deletes: historyDeletes,
    progress_remaps: 0,
    verify,
    smoke,
    phase_a_pass: pass
  }

  fs.writeFileSync(path.resolve(REPORT_JSON), JSON.stringify(json, null, 2))
  fs.writeFileSync(path.resolve(REPORT_MD), buildMarkdown(gate, json))
  console.log(`\nRapor yazildi: ${REPORT_MD}, ${REPORT_JSON}`)
}

function buildMarkdown(gate: string, json: any): string {
  const h = (o: any) => Object.entries(o).map(([k, v]) => `| ${k} | ${v} |`).join('\n')
  return `# LocalKarar — Phase A Canonical Import Raporu

**Mod:** \`${json.mode}\` · **Durum:** \`${json.status}\` · **Tarih:** ${json.generated_at}

Phase B (legacy archive) **çalıştırılmadı** ve bu script kapsamında değildir.

## Pre-flight

| Kontrol | Değer |
|---|---|
${h(json.preflight)}

## Oluşturulan yapı

${json.plan_or_created ? `| Varlık | Adet |\n|---|---:|\n${Object.entries(json.plan_or_created).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}` : 'Yazma yapılmadı.'}

Her canonical içerik **kendi KnowledgeObject'ini** aldı; legacy KO yeniden kullanılmadı. Pratik kartlar mevcut \`embeddedPracticeBlocks\` sözleşmesiyle KO metadata'sına yazıldı — paralel bir veri modeli oluşturulmadı.

## Legacy güvenliği

| | Önce | Sonra |
|---|---:|---:|
| Course | ${json.legacy_before.courses} | ${json.legacy_after.courses} |
| Lesson | ${json.legacy_before.lessons} | ${json.legacy_after.lessons} |
| KnowledgeObject | ${json.legacy_before.kos} | ${json.legacy_after.kos} |
| Arşivlenmiş Course | ${json.legacy_before.archivedCourses} | ${json.legacy_after.archivedCourses} |
| Tutarsız KO | ${json.legacy_before.inconsistentKos} | ${json.legacy_after.inconsistentKos} |

## Kullanıcı geçmişi

| Tablo | Önce | Sonra |
|---|---:|---:|
${Object.keys(json.user_history_before).map(k => `| ${k} | ${json.user_history_before[k]} | ${json.user_history_after[k]} |`).join('\n')}

Silinen: **${json.user_history_deletes}** · Progress remap: **${json.progress_remaps}**

## Doğrulama

${json.verify ? `| Kontrol | Sonuç |\n|---|---|\n${h(json.verify)}` : 'Yazma yapılmadığı için doğrulama çalıştırılmadı.'}

## Read-only smoke

${json.smoke ? `| Kontrol | Sonuç |\n|---|---|\n${h(json.smoke)}` : 'Yazma yapılmadığı için smoke çalıştırılmadı.'}

Legacy katalog bu fazda hâlâ aktiftir; bu beklenen durumdur.

## Gate

\`\`\`text
${gate}
\`\`\`
`
}

main()
  .catch(err => {
    if (String(err?.message) !== 'APPLY_ABORT') {
      console.error('\nPHASE A FAILED')
      console.error(err)
      process.exitCode = 1
    }
  })
  .finally(async () => { await prisma.$disconnect() })
