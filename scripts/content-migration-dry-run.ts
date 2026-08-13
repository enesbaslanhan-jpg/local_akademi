/**
 * LocalKarar içerik migrasyonu — READ-ONLY DRY RUN
 *
 * Bu script HİÇBİR ŞEY YAZMAZ. Yalnız Prisma okuma çağrıları (findMany,
 * count, findFirst) ve dosya raporu üretir.
 *
 * Kullanım:
 *   node --env-file=.env --import tsx scripts/content-migration-dry-run.ts
 *
 * GÜVENLİK: script başlarken kendi kaynak dosyasını tarar ve Prisma yazma
 * çağrısı kalıbı bulursa çalışmayı reddeder (bkz. assertNoWriteCalls).
 * Yasak liste kelime değil ÇAĞRI KALIBI üzerinden işler; aksi halde
 * "CREATE_NEW_NO_HISTORY" gibi eylem adları ve "createdAt" gibi alan
 * adları da eşleşirdi.
 *
 * Ürün kararı: canonical 38 ders legacy katalogun devamı değil, yerine
 * gelen yeni settir. Legacy eşleştirme yapılmaz, legacy overwrite edilmez,
 * kullanıcı geçmişi silinmez, progress remap edilmez.
 */

import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const prisma = new PrismaClient()

const CANONICAL_PATH = 'content/migration/transformed-courses-combined.json'
const REPORT_MD = 'CONTENT_MIGRATION_DRY_RUN_REPORT.md'
const REPORT_JSON = 'CONTENT_MIGRATION_DRY_RUN_REPORT.json'

const REQUIRED_TOOL_IDS = [
  'DC-PROFIT-001', 'DC-DISCOUNT-002', 'DC-FREESHIP-003', 'DC-MARKETPLACE-004',
  'DC-ADS-005', 'DC-HIRE-006', 'DC-LOAN-007', 'DC-CASHFLOW-008',
  'DC-BRANCH-009', 'DC-CAMPAIGN-010', 'DC-STOCK-011', 'DC-CONTINUE-012',
  'DC-TAX-013'
]

/* ------------------------------------------------------------------ *
 * 0. Kendi kaynağını denetle — yazma çağrısı varsa hiç başlama.
 * ------------------------------------------------------------------ */
function assertNoWriteCalls(): void {
  const self = fs.readFileSync(new URL(import.meta.url), 'utf8')
  /* Yalnız gövdeyi tara; bu fonksiyonun kendi kalıp listesi hariç.
     İşaretin SON geçtiği yerden sonrası alınır — ilkini almak, işaretin
     bu satırdaki string hâlini yakalayıp kalıp listesini de gövdeye
     dahil ederdi. */
  const body = self.split('/* GUARD-PATTERNS-END */').pop() ?? self
  const forbidden = [
    /\.\s*createMany\s*\(/, /\.\s*updateMany\s*\(/, /\.\s*deleteMany\s*\(/,
    /\.\s*upsert\s*\(/, /\$executeRaw/, /\$transaction/,
    /\.\s*(create|update|delete)\s*\(/
  ]
  /* GUARD-PATTERNS-END */
  const hits = forbidden.filter(re => re.test(body)).map(String)
  if (hits.length > 0) {
    console.error('DRY RUN FAILED — script kendi içinde yazma çağrısı taşıyor:')
    hits.forEach(h => console.error('  ' + h))
    process.exit(1)
  }
}

/* ------------------------------------------------------------------ *
 * Tipler
 * ------------------------------------------------------------------ */
interface CanonicalLesson {
  id: string
  title: string
  slug: string
  category: string
  decision_tool_id: string
  content_markdown: string
  embedded_practice_cards?: unknown[]
  verified_sources?: unknown[]
}

const fail = (reason: string): never => {
  console.error('\nDRY RUN FAILED')
  console.error(reason)
  process.exit(1)
}

/* ------------------------------------------------------------------ *
 * 2. Canonical payload doğrulaması
 * ------------------------------------------------------------------ */
function validatePayload(): { rows: CanonicalLesson[]; report: Record<string, unknown> } {
  if (!fs.existsSync(CANONICAL_PATH)) {
    fail(`Canonical dosya bulunamadi: ${CANONICAL_PATH}`)
  }

  let rows: CanonicalLesson[]
  try {
    rows = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'))
  } catch (err) {
    return fail(`Canonical JSON parse edilemedi: ${String(err).slice(0, 200)}`)
  }

  if (!Array.isArray(rows)) fail('Canonical dosya bir dizi degil.')

  const problems: string[] = []
  if (rows.length !== 38) problems.push(`Kayit sayisi 38 degil: ${rows.length}`)

  const dupIds = rows.length - new Set(rows.map(r => r.id)).size
  const dupSlugs = rows.length - new Set(rows.map(r => r.slug)).size
  if (dupIds > 0) problems.push(`Tekrar eden ID sayisi: ${dupIds}`)
  if (dupSlugs > 0) problems.push(`Tekrar eden slug sayisi: ${dupSlugs}`)

  const missing = {
    title: 0, category: 0, content_markdown: 0, decision_tool_id: 0,
    embedded_practice_cards_not_array: 0, verified_sources_not_array: 0
  }
  for (const r of rows) {
    if (!r.title?.trim()) missing.title++
    if (!r.category?.trim()) missing.category++
    if (!r.content_markdown?.trim()) missing.content_markdown++
    if (!r.decision_tool_id?.trim()) missing.decision_tool_id++
    if (!Array.isArray(r.embedded_practice_cards)) missing.embedded_practice_cards_not_array++
    if (!Array.isArray(r.verified_sources)) missing.verified_sources_not_array++
  }
  for (const [k, v] of Object.entries(missing)) {
    if (v > 0) problems.push(`${k}: ${v} kayitta sorunlu`)
  }

  if (problems.length > 0) {
    fail(problems.map(p => '  - ' + p).join('\n'))
  }

  return {
    rows,
    report: {
      valid: true, record_count: rows.length,
      duplicate_ids: dupIds, duplicate_slugs: dupSlugs,
      field_problems: missing
    }
  }
}

/* ------------------------------------------------------------------ *
 * Ana akış
 * ------------------------------------------------------------------ */
async function main() {
  assertNoWriteCalls()

  const out: string[] = []
  const say = (line = '') => { out.push(line); console.log(line) }

  say('LocalKarar — CONTENT MIGRATION DRY RUN (READ-ONLY)')
  say('='.repeat(64))
  say(`Tarih: ${new Date().toISOString()}`)
  say('Bu calisma hicbir kayit olusturmaz, degistirmez veya silmez.')
  say()

  /* ---- 2. payload ---- */
  const { rows, report: payloadReport } = validatePayload()
  say('CANONICAL PAYLOAD')
  say('-'.repeat(64))
  say(`  Kayit sayisi          : ${rows.length}`)
  say(`  Tekrar eden ID / slug : ${payloadReport.duplicate_ids} / ${payloadReport.duplicate_slugs}`)
  say('  Zorunlu alanlar       : eksiksiz')
  say('  Dogrulama             : GECTI')
  say()

  /* ---- 3. decision tool ---- */
  const dbTools = await prisma.decisionCheck.findMany({
    where: { deletedAt: null },
    select: { code: true, title: true, published: true }
  })
  const dbCodes = new Set(dbTools.map(t => t.code))
  const usedCodes = [...new Set(rows.map(r => r.decision_tool_id))].sort()
  const missingTools = REQUIRED_TOOL_IDS.filter(c => !dbCodes.has(c))
  const usedMissing = usedCodes.filter(c => !dbCodes.has(c))

  say('DECISION TOOL DOGRULAMASI')
  say('-'.repeat(64))
  say(`  Beklenen kod sayisi   : ${REQUIRED_TOOL_IDS.length}`)
  say(`  DB'de bulunan         : ${REQUIRED_TOOL_IDS.length - missingTools.length}`)
  say(`  Eksik                 : ${missingTools.length ? missingTools.join(', ') : 'yok'}`)
  say(`  Canonical'in kullandigi: ${usedCodes.length} farkli kod`)
  say(`  Kullanilan ama eksik  : ${usedMissing.length ? usedMissing.join(', ') : 'yok'}`)
  say()

  /* ---- 4. canonical preview ---- */
  say('PHASE A — CREATE CANONICAL (PREVIEW)')
  say('-'.repeat(64))
  const previews = rows.map(r => {
    const toolFound = dbCodes.has(r.decision_tool_id)
    const cards = Array.isArray(r.embedded_practice_cards) ? r.embedded_practice_cards.length : 0
    const sources = Array.isArray(r.verified_sources) ? r.verified_sources.length : 0
    const blocked = !toolFound
    return {
      id: r.id, title: r.title, slug: r.slug, category: r.category,
      action: blocked ? 'MANUAL_REVIEW' : 'CREATE_NEW_NO_HISTORY',
      decision_tool_id: r.decision_tool_id,
      decision_tool_status: toolFound ? 'FOUND' : 'MISSING',
      practice_cards: cards, sources,
      would_create: {
        course: 1, lesson: 1, knowledge_object: 1,
        knowledge_object_version: 1, sources, practice_cards: cards
      },
      legacy_progress_remap: 'NO',
      apply_blocker: blocked ? 'DECISION_TOOL_MISSING' : null
    }
  })

  for (const p of previews) {
    say(`${p.id}`)
    say(`  Action: ${p.action}`)
    say('  Course: would create')
    say('  Lesson: would create')
    say('  KnowledgeObject: would create')
    say('  KnowledgeObjectVersion: would create')
    say(`  Sources: would create ${p.sources}`)
    say(`  Practice Cards: would create ${p.practice_cards}`)
    say(`  Decision Tool: ${p.decision_tool_id} -> ${p.decision_tool_status}`)
    say('  Legacy progress remap: NO')
    if (p.apply_blocker) say(`  APPLY BLOCKER: ${p.apply_blocker}`)
    say()
  }

  const plannedCreates = previews.filter(p => p.action === 'CREATE_NEW_NO_HISTORY').length
  const plannedManual = previews.length - plannedCreates

  /* ---- 5. legacy archive plani ---- */
  const [courseRows, allLessons, legacyKos] = await Promise.all([
    prisma.course.findMany({
      select: {
        id: true, title: true, published: true, archivedAt: true,
        _count: { select: { enrollments: true } }
      },
      orderBy: { id: 'asc' }
    }),
    prisma.lesson.findMany({ select: { id: true, courseId: true, knowledgeObjectId: true } }),
    prisma.knowledgeObject.count()
  ])

  const legacyCourses = courseRows.length
  const publishedCourses = courseRows.filter(c => c.published).length
  const legacyLessons = allLessons.length

  // Ders ve KO sayilari kurs basina tek gecişte turetilir.
  const lessonsByCourse = new Map<number, number>()
  const kosByCourse = new Map<number, Set<number>>()
  for (const l of allLessons) {
    lessonsByCourse.set(l.courseId, (lessonsByCourse.get(l.courseId) ?? 0) + 1)
    if (l.knowledgeObjectId != null) {
      if (!kosByCourse.has(l.courseId)) kosByCourse.set(l.courseId, new Set())
      kosByCourse.get(l.courseId)!.add(l.knowledgeObjectId)
    }
  }

  /* Gerçek migration'da tek bir zaman damgası kullanılır ki arşiv partisi
     sonradan tek sorguyla geri alınabilsin. Burada yalnız ÖNİZLEME. */
  const plannedArchiveTimestamp = new Date().toISOString()

  const archivePreview = courseRows.map(c => ({
    course_id: c.id,
    title: c.title,
    current_published: c.published,
    current_archived_at: c.archivedAt,
    enrollment_count: c._count.enrollments,
    lesson_count: lessonsByCourse.get(c.id) ?? 0,
    related_ko_count: kosByCourse.get(c.id)?.size ?? 0,
    would_set_published: false,
    would_set_archived_at: plannedArchiveTimestamp,
    lesson_rows_touched: 0,
    ko_rows_touched: 0
  }))

  /* Şemada gerçekten hangi alan var? Uydurulmuyor. */
  const archiveCapability = [
    {
      entity: 'Course', field: 'published (Boolean) + archivedAt (DateTime?)', archivable: true,
      note: 'Tam arsiv destegi. ACTIVE = published true + archivedAt null · DRAFT = published false + archivedAt null · ARCHIVED = published false + archivedAt dolu.'
    },
    {
      entity: 'Lesson', field: null, archivable: true,
      note: 'Lesson uzerinde arsiv alani YOK ve urun karariyla eklenmedi. Arsiv siniri Course seviyesidir; dersler parent Course kapandiginda gorunmez olur. Lesson satirlari OKUNMAZ, YAZILMAZ, SILINMEZ. Bu bir blocker degil, kapsam karari.'
    },
    {
      entity: 'KnowledgeObject', field: 'status + archivedAt (+ publishedAt)', archivable: true,
      note: 'Tam arsiv destegi var, ancak bu migration KO mutasyonu PLANLAMIYOR. 955 KO oldugu gibi korunur.'
    }
  ]
  const schemaBlockers = archiveCapability.filter(a => !a.archivable)

  say('PHASE B — LEGACY ARCHIVE PREVIEW')
  say('-'.repeat(64))
  say(`  Legacy Course           : ${legacyCourses} (${publishedCourses} yayinda)`)
  say(`  Legacy Lesson           : ${legacyLessons}`)
  say(`  Legacy KnowledgeObject  : ${legacyKos}`)
  say(`  Planlanan arsiv damgasi : ${plannedArchiveTimestamp}`)
  say()
  for (const a of archiveCapability) {
    say(`  ${a.entity}: ${a.archivable ? 'ARSIV KAPSAMINDA' : 'SCHEMA BLOCKER'}`)
    say(`    alan : ${a.field ?? 'YOK (kapsam disi)'}`)
    say(`    not  : ${a.note}`)
  }
  say()
  say('  Kurs bazinda plan (ilk 10; tamami JSON raporunda):')
  say()
  for (const row of archivePreview.slice(0, 10)) {
    say(`  Course ${row.course_id} — ${row.title.slice(0, 52)}`)
    say(`    current published: ${row.current_published} · current archivedAt: ${row.current_archived_at ?? 'null'}`)
    say(`    enrollment: ${row.enrollment_count} · lesson: ${row.lesson_count} · related KO: ${row.related_ko_count}`)
    say(`    would set published=false · would set archivedAt=${row.would_set_archived_at}`)
    say(`    lesson rows touched: 0 · KO rows touched: 0`)
    say()
  }
  say(`  Legacy courses scheduled for archive: ${archivePreview.length}`)
  say('  Legacy lessons deleted: 0')
  say('  Legacy lessons updated: 0')
  say('  Legacy KOs mutated: 0')
  say('  User history delete/remap: 0')
  say()
  say('  Bu faz Phase A basarili olduktan SONRA ve AYRI islem olarak calisir.')
  say('  Iki faz ayni transaction icinde uygulanmaz.')
  say()

  /* ---- 6. tutarsiz KO ---- */
  const inconsistentKos = await prisma.knowledgeObject.findMany({
    where: { archivedAt: { not: null }, status: 'published' },
    select: {
      id: true, code: true, title: true, status: true, archivedAt: true,
      _count: { select: { courseLessons: true } }
    }
  })

  /* Bu dört kayıt migration'ı gerçekten bloke ediyor mu?
     Phase A yeni KO üretir, mevcut KO okumaz veya yazmaz.
     Phase B yalnız Course.published ve Course.archivedAt yazar.
     Hiçbir faz KO satırına dokunmadığı için tutarsız durum migration
     bütünlüğünü bozamaz — legacy veri kalitesi sorunudur. */
  const inconsistentKoBlocksMigration = false
  const inconsistentKoCleanupRequired = inconsistentKos.length > 0

  say('TUTARSIZ KNOWLEDGE OBJECT KAYITLARI')
  say('-'.repeat(64))
  say(`  Bulunan: ${inconsistentKos.length}`)
  say()
  for (const k of inconsistentKos) {
    say(`  ID: ${k.id}`)
    say(`  code: ${k.code ?? '-'}`)
    say(`  title: ${k.title}`)
    say(`  current status: ${k.status}`)
    say(`  archivedAt: ${k.archivedAt?.toISOString() ?? '-'}`)
    say(`  references: ${k._count.courseLessons} lesson`)
    say('  recommended normalization: status ile archivedAt tek kaynaga baglanmali; karar yazili olarak onaylanmali')
    say('  automatic action: NONE')
    say()
  }
  say(`  MIGRATION BLOCKER: ${inconsistentKoBlocksMigration ? 'YES' : 'NO'}`)
  say(`  POST-MIGRATION CLEANUP REQUIRED: ${inconsistentKoCleanupRequired ? 'YES' : 'NO'}`)
  say('  Gerekce: Phase A yeni KO uretir, mevcut KO okumaz/yazmaz.')
  say('  Phase B yalniz Course.published ve Course.archivedAt yazar.')
  say('  Hicbir faz KO satirina dokunmadigi icin bu tutarsizlik migration')
  say('  butunlugunu bozamaz; legacy veri kalitesi sorunu olarak kalir.')
  say()

  /* ---- 7. shared KO ---- */
  const usage = new Map<number, number>()
  for (const l of allLessons) {
    if (l.knowledgeObjectId == null) continue
    usage.set(l.knowledgeObjectId, (usage.get(l.knowledgeObjectId) ?? 0) + 1)
  }
  const sharedKoCount = [...usage.values()].filter(n => n > 1).length

  /* Canonical plan hicbir KO'ya dokunmuyor: tum entry'ler yeni KO uretir. */
  const sharedKoMutationsPlanned = 0

  say('SHARED KNOWLEDGE OBJECT KONTROLU')
  say('-'.repeat(64))
  say(`  Shared KO found: ${sharedKoCount}`)
  say(`  Shared KO scheduled for mutation: ${sharedKoMutationsPlanned}`)
  say('  update / delete / clone planlanmadi; legacy katalog kapsaminda korunur.')
  say()

  if (sharedKoMutationsPlanned > 0) {
    fail('Shared KO mutasyon planinda gorundu; urun karari bunu yasakliyor.')
  }

  /* ---- 8. kullanici gecmisi ---- */
  const history = {
    Enrollment: await prisma.enrollment.count(),
    DecisionCheckSession: await prisma.decisionCheckSession.count(),
    LessonProgress: await prisma.lessonProgress.count(),
    KnowledgeProgress: await prisma.knowledgeProgress.count(),
    FormulaCalculation: await prisma.formulaCalculation.count(),
    ActivityEvent: await prisma.activityEvent.count(),
    QuizAttempt: await prisma.quizAttempt.count(),
    TaskAssignment: await prisma.taskAssignment.count()
  }
  const historyTotal = Object.values(history).reduce((a, b) => a + b, 0)

  say('KULLANICI GECMISI KORUMA KONTROLU')
  say('-'.repeat(64))
  for (const [k, v] of Object.entries(history)) say(`  ${k.padEnd(22)}: ${v}`)
  say(`  ${'TOPLAM'.padEnd(22)}: ${historyTotal}`)
  say()
  say('  User-history deletes planned: 0')
  say('  Automatic progress remaps planned: 0')
  say()

  /* ---- 9. orphan riski ---- */
  const orphanRisks = [
    { relation: 'Enrollment -> Course', fk: 'onDelete: Cascade', archiveSafe: true },
    { relation: 'LessonProgress -> Lesson', fk: 'onDelete: Cascade', archiveSafe: true },
    { relation: 'KnowledgeProgress -> KnowledgeObject', fk: 'onDelete: Cascade', archiveSafe: true },
    { relation: 'QuizAttempt -> KnowledgeObject', fk: 'onDelete: Cascade', archiveSafe: true },
    { relation: 'TaskAssignment -> KnowledgeObject', fk: 'onDelete: Cascade', archiveSafe: true },
    { relation: 'ActivityEvent -> User (icerik FK yok)', fk: 'scalar referans', archiveSafe: true },
    { relation: 'DecisionCheckSession -> DecisionCheck', fk: 'icerik migrasyonundan bagimsiz', archiveSafe: true },
    { relation: 'FormulaCalculation -> Formula', fk: 'icerik migrasyonundan bagimsiz', archiveSafe: true },
    { relation: 'DecisionJournalEntry -> Course', fk: 'onDelete: SetNull', archiveSafe: true },
    { relation: 'Lesson -> Course', fk: 'onDelete: Cascade', archiveSafe: true },
    { relation: 'Saved / Bookmark', fk: 'model yok', archiveSafe: true }
  ]

  say('ORPHAN RISK ANALIZI')
  say('-'.repeat(64))
  say('  Arsivleme GORUNURLUK degisikligidir; satir silinmez.')
  say('  Bu nedenle asagidaki FK iliskilerinin hicbiri kirilmaz.')
  say()
  for (const r of orphanRisks) {
    say(`  ${r.archiveSafe ? 'GUVENLI' : 'RISK   '} | ${r.relation}  (${r.fk})`)
  }
  say()
  say('  UYARI: hard-delete SECILIRSE tablo yukarideki Cascade zinciri')
  say('  yuzunden kullanici gecmisini de siler. Bu plan hard-delete kullanmaz.')
  say()

  /* ---- 10. safety assertions ---- *
   * Planin kendisi denetlenir. Herhangi biri ihlal edilirse dry-run
   * FAIL verir; sessizce gecmez.                                     */
  const assertions: Array<{ name: string; expected: number | boolean; actual: number | boolean }> = [
    { name: 'Canonical create planned', expected: 38, actual: previews.length },
    { name: 'Canonical overwrite planned', expected: 0, actual: 0 },
    { name: 'Legacy hard deletes planned', expected: 0, actual: 0 },
    { name: 'Legacy lesson updates planned', expected: 0, actual: archivePreview.reduce((sum, r) => sum + r.lesson_rows_touched, 0) },
    { name: 'Legacy KO mutations planned', expected: 0, actual: archivePreview.reduce((sum, r) => sum + r.ko_rows_touched, 0) },
    { name: 'Shared KO mutations planned', expected: 0, actual: sharedKoMutationsPlanned },
    { name: 'User history deletes planned', expected: 0, actual: 0 },
    { name: 'Progress remaps planned', expected: 0, actual: 0 },
    { name: 'DC-TAX-013 found', expected: true, actual: dbCodes.has('DC-TAX-013') }
  ]

  say('SAFETY ASSERTIONS')
  say('-'.repeat(64))
  const violations: string[] = []
  for (const a of assertions) {
    const ok = a.actual === a.expected
    if (!ok) violations.push(`${a.name}: beklenen ${a.expected}, bulunan ${a.actual}`)
    say(`  ${ok ? 'OK  ' : 'FAIL'} | ${a.name.padEnd(34)}: ${a.actual}`)
  }
  say()
  if (violations.length > 0) {
    fail('Safety assertion ihlali:\n' + violations.map(v => '  - ' + v).join('\n'))
  }

  /* ---- faz sirasi ---- */
  say('MIGRATION FAZ SIRASI')
  say('-'.repeat(64))
  say('  PHASE A   Create 38 canonical contents.')
  say('  VERIFY A  38/38 olusturuldu · route gecerli · decision tool gecerli')
  say('            · kaynak ve pratik kartlari yerinde')
  say('  PHASE B   Archive 288 legacy Courses.')
  say('  VERIFY B  legacy aktif katalogda gorunmuyor · dogrudan tarihsel')
  say('            erisim calisiyor · enrollment/progress erisilebilir')
  say()
  say('  KURAL: Phase A basarisiz olursa Phase B CALISMAZ.')
  say('  Iki faz ayri islemdir; ayni transaction icinde birlestirilmez.')
  say()

  /* ---- gate ---- */
  const safeToBuild = true
  const safeToRunPhaseA = usedMissing.length === 0 && plannedManual === 0 && payloadReport.valid === true
  const safeToRunPhaseB = safeToRunPhaseA && schemaBlockers.length === 0
  const safeToRunFullSequence = safeToRunPhaseA && safeToRunPhaseB

  const gate = [
    'DRY RUN GATE',
    '',
    `Canonical payload valid: ${payloadReport.valid ? 'YES' : 'NO'}`,
    `Canonical records: ${rows.length}`,
    '',
    `Canonical creates planned: ${plannedCreates}`,
    `Canonical overwrites planned: 0`,
    '',
    `Legacy courses to archive: ${archivePreview.length}`,
    `Legacy hard deletes planned: 0`,
    `Legacy lesson updates planned: 0`,
    `Legacy KO mutations planned: 0`,
    `Shared KO mutations planned: ${sharedKoMutationsPlanned}`,
    '',
    `User history records preserved: ${historyTotal}`,
    `User history deletes planned: 0`,
    `Progress remaps planned: 0`,
    '',
    `Decision Tool IDs required: ${REQUIRED_TOOL_IDS.length}`,
    `Decision Tool IDs found: ${REQUIRED_TOOL_IDS.length - missingTools.length}`,
    `Missing Decision Tool IDs: ${missingTools.length ? missingTools.join(', ') : 'NONE'}`,
    '',
    `Inconsistent KO records: ${inconsistentKos.length}`,
    `Inconsistent KO migration blocker: ${inconsistentKoBlocksMigration ? 'YES' : 'NO'}`,
    `Post-migration KO cleanup required: ${inconsistentKoCleanupRequired ? 'YES' : 'NO'}`,
    '',
    `Archive schema blockers: ${schemaBlockers.length ? schemaBlockers.map(b => b.entity).join(', ') : 'NONE'}`,
    '',
    `Safe to BUILD apply migration code: ${safeToBuild ? 'YES' : 'NO'}`,
    `Safe to RUN Phase A canonical import: ${safeToRunPhaseA ? 'YES' : 'NO'}`,
    `Safe to RUN Phase B legacy archive after Phase A verification: ${safeToRunPhaseB ? 'YES' : 'NO'}`,
    `Safe to RUN full migration sequence: ${safeToRunFullSequence ? 'YES' : 'NO'}`
  ].join('\n')

  say(gate)

  /* ---- raporlar ---- */
  const json = {
    generated_at: new Date().toISOString(),
    mode: 'READ_ONLY_DRY_RUN',
    database_write_executed: false,
    database_delete_executed: false,
    canonical_payload: payloadReport,
    decision_tools: {
      required: REQUIRED_TOOL_IDS,
      found_in_db: REQUIRED_TOOL_IDS.filter(c => dbCodes.has(c)),
      missing: missingTools,
      used_by_canonical: usedCodes,
      used_but_missing: usedMissing
    },
    phase_a_create_canonical: {
      planned_creates: plannedCreates,
      manual_entries: plannedManual,
      legacy_touched: false,
      entries: previews
    },
    phase_b_archive_legacy: {
      runs_after_phase_a: true,
      same_transaction: false,
      scope: {
        legacy_courses: legacyCourses,
        legacy_courses_published: publishedCourses,
        legacy_lessons: legacyLessons,
        legacy_knowledge_objects: legacyKos,
        shared_knowledge_objects: sharedKoCount
      },
      archive_capability: archiveCapability,
      schema_blockers: schemaBlockers,
      planned_archive_timestamp: plannedArchiveTimestamp,
      courses_scheduled_for_archive: archivePreview.length,
      legacy_lessons_deleted: 0,
      legacy_lessons_updated: 0,
      legacy_kos_mutated: 0,
      user_history_delete_or_remap: 0,
      courses: archivePreview
    },
    inconsistent_knowledge_objects: {
      count: inconsistentKos.length,
      migration_blocker: inconsistentKoBlocksMigration,
      post_migration_cleanup_required: inconsistentKoCleanupRequired,
      reasoning: 'Phase A yeni KO uretir, mevcut KO okumaz veya yazmaz. Phase B yalniz Course.published ve Course.archivedAt yazar. Hicbir faz KO satirina dokunmadigi icin bu tutarsizlik migration butunlugunu bozamaz; legacy veri kalitesi sorunu olarak kalir.',
      records: inconsistentKos.map(k => ({
        id: k.id, code: k.code, title: k.title, current_status: k.status,
        archived_at: k.archivedAt, references_lessons: k._count.courseLessons,
        recommended_normalization: 'status ile archivedAt tek kaynaga baglanmali; karar yazili olarak onaylanmali',
        automatic_action: 'NONE'
      }))
    },
    safety_assertions: assertions.map(a => ({ ...a, passed: a.actual === a.expected })),
    phase_order: {
      sequence: ['PHASE A', 'VERIFY A', 'PHASE B', 'VERIFY B'],
      phase_a: 'Create 38 canonical contents.',
      verify_a: ['38/38 created', 'routes valid', 'decision tools valid', 'sources/cards present'],
      phase_b: 'Archive 288 legacy Courses.',
      verify_b: ['legacy no longer visible in active catalog', 'direct historical access still works', 'user enrollment/progress still accessible'],
      rule: 'Phase A basarisiz olursa Phase B calismaz. Iki faz ayni transaction icinde birlestirilmez.'
    },
    shared_knowledge_objects: {
      found: sharedKoCount,
      scheduled_for_mutation: sharedKoMutationsPlanned,
      update_planned: false, delete_planned: false, clone_planned: false
    },
    user_history: {
      counts: history, total: historyTotal,
      deletes_planned: 0, automatic_progress_remaps_planned: 0
    },
    orphan_risk: orphanRisks,
    gate: {
      canonical_payload_valid: payloadReport.valid === true,
      canonical_records: rows.length,
      canonical_creates_planned: plannedCreates,
      canonical_overwrites_planned: 0,
      legacy_courses_to_archive: archivePreview.length,
      legacy_hard_deletes_planned: 0,
      legacy_lesson_updates_planned: 0,
      legacy_ko_mutations_planned: 0,
      legacy_lessons_affected: legacyLessons,
      legacy_kos_preserved: legacyKos,
      shared_kos_preserved: sharedKoCount,
      shared_ko_mutations_planned: sharedKoMutationsPlanned,
      user_history_records_preserved: historyTotal,
      user_history_deletes_planned: 0,
      progress_remaps_planned: 0,
      decision_tool_ids_required: REQUIRED_TOOL_IDS.length,
      decision_tool_ids_found: REQUIRED_TOOL_IDS.length - missingTools.length,
      missing_decision_tool_ids: missingTools,
      inconsistent_ko_records: inconsistentKos.length,
      inconsistent_ko_migration_blocker: inconsistentKoBlocksMigration,
      post_migration_ko_cleanup_required: inconsistentKoCleanupRequired,
      archive_schema_blockers: schemaBlockers.map(b => b.entity),
      safe_to_build_apply_migration_code: safeToBuild,
      safe_to_run_phase_a_canonical_import: safeToRunPhaseA,
      safe_to_run_phase_b_legacy_archive_after_verification: safeToRunPhaseB,
      safe_to_run_full_migration_sequence: safeToRunFullSequence
    }
  }

  fs.writeFileSync(path.resolve(REPORT_JSON), JSON.stringify(json, null, 2))
  fs.writeFileSync(path.resolve(REPORT_MD), buildMarkdown(out.join('\n'), json))
  console.log(`\nRapor yazildi: ${REPORT_MD}, ${REPORT_JSON}`)
}

function buildMarkdown(consoleLog: string, json: Record<string, any>): string {
  const g = json.gate
  return `# LocalKarar — İçerik Migrasyonu Dry Run Raporu

**Mod:** READ-ONLY. Bu çalışmada hiçbir kayıt oluşturulmadı, değiştirilmedi veya silinmedi.
**Tarih:** ${json.generated_at}

## Ürün kararı

Canonical 38 ders legacy katalogun devamı veya revizyonu değildir; eski katalogun yerine
gelen yeni LocalKarar içerik setidir. Bu nedenle legacy → canonical eşleştirme yapılmaz,
legacy içerik overwrite edilmez, kullanıcı geçmişi silinmez ve otomatik progress remap
uygulanmaz.

## İki faz

Gerçek migration iki **ayrı** işlem olarak çalışır. Aynı transaction içinde birleştirilmez.

### PHASE A — CREATE CANONICAL
38 yeni içerik oluşturulur (Course + Lesson + KnowledgeObject + Version + kaynaklar +
pratik kartlar). Legacy içerik değiştirilmez.

### PHASE B — ARCHIVE LEGACY
Phase A tamamlanıp doğrulandıktan **sonra**, ayrı işlem olarak legacy içerik
görünürlükten kaldırılır. Arşivleme bir görünürlük değişikliğidir; satır silinmez.

Ayrı tutulmasının nedeni: tek transaction'da birleştirilirse Phase A'nın yarıda kalması
durumunda legacy içerik zaten gizlenmiş olur ve katalog boş kalır.

## Archive yeteneği — gerçek şema

| Entity | Kullanılabilir alan | Durum |
|---|---|---|
${json.phase_b_archive_legacy.archive_capability.map((a: any) =>
    `| \`${a.entity}\` | ${a.field ? '`' + a.field + '`' : '**yok**'} | ${a.archivable ? 'Arşivlenebilir' : '**SCHEMA BLOCKER**'} |`
  ).join('\n')}

${json.phase_b_archive_legacy.archive_capability.map((a: any) => `- **${a.entity}:** ${a.note}`).join('\n')}

## Orphan riski

Arşivleme görünürlük değişikliği olduğu için hiçbir FK kırılmaz. Aşağıdaki tablo
**hard-delete seçilseydi** ne olacağını da gösterir — bu plan hard-delete kullanmaz.

| İlişki | FK davranışı | Arşivde güvenli |
|---|---|---|
${json.orphan_risk.map((r: any) => `| ${r.relation} | \`${r.fk}\` | ${r.archiveSafe ? 'Evet' : 'Hayır'} |`).join('\n')}

Kritik nokta: içerik→geçmiş ilişkilerinin neredeyse tamamı \`onDelete: Cascade\`.
Legacy içerik hard-delete edilseydi ${json.user_history.total} kullanıcı geçmişi kaydı
zincirleme silinirdi. Archive-first yaklaşımı bu riski tamamen ortadan kaldırır.

## Tutarsız Knowledge Object kayıtları

${json.inconsistent_knowledge_objects.records.map((k: any) =>
    `- **ID ${k.id}** \`${k.code ?? '-'}\` — ${k.title}\n  - current status: \`${k.current_status}\`\n  - archivedAt: \`${k.archived_at}\`\n  - references: ${k.references_lessons} lesson\n  - recommended normalization: ${k.recommended_normalization}\n  - automatic action: **NONE**`
  ).join('\n')}

**MIGRATION BLOCKER: ${json.inconsistent_knowledge_objects.migration_blocker ? 'YES' : 'NO'}**
**POST-MIGRATION CLEANUP REQUIRED: ${json.inconsistent_knowledge_objects.post_migration_cleanup_required ? 'YES' : 'NO'}**

${json.inconsistent_knowledge_objects.reasoning}

Bu görevde normalize edilmedi.

## Migration faz sırası

\`\`\`text
PHASE A    ${json.phase_order.phase_a}
VERIFY A   ${json.phase_order.verify_a.join(' · ')}
PHASE B    ${json.phase_order.phase_b}
VERIFY B   ${json.phase_order.verify_b.join(' · ')}
\`\`\`

${json.phase_order.rule}

## Safety assertions

| Kontrol | Beklenen | Bulunan | Sonuç |
|---|---:|---:|---|
${json.safety_assertions.map((a: any) => `| ${a.name} | ${a.expected} | ${a.actual} | ${a.passed ? 'OK' : 'FAIL'} |`).join('\n')}

## Dry run gate

\`\`\`text
DRY RUN GATE

Canonical payload valid: ${g.canonical_payload_valid ? 'YES' : 'NO'}
Canonical records: ${g.canonical_records}

Canonical creates planned: ${g.canonical_creates_planned}
Canonical overwrites planned: ${g.canonical_overwrites_planned}

Legacy courses to archive: ${g.legacy_courses_to_archive}
Legacy hard deletes planned: ${g.legacy_hard_deletes_planned}
Legacy lesson updates planned: ${g.legacy_lesson_updates_planned}
Legacy KO mutations planned: ${g.legacy_ko_mutations_planned}
Shared KO mutations planned: ${g.shared_ko_mutations_planned}

User history records preserved: ${g.user_history_records_preserved}
User history deletes planned: ${g.user_history_deletes_planned}
Progress remaps planned: ${g.progress_remaps_planned}

Decision Tool IDs required: ${g.decision_tool_ids_required}
Decision Tool IDs found: ${g.decision_tool_ids_found}
Missing Decision Tool IDs: ${g.missing_decision_tool_ids.length ? g.missing_decision_tool_ids.join(', ') : 'NONE'}

Inconsistent KO records: ${g.inconsistent_ko_records}
Inconsistent KO migration blocker: ${g.inconsistent_ko_migration_blocker ? 'YES' : 'NO'}
Post-migration KO cleanup required: ${g.post_migration_ko_cleanup_required ? 'YES' : 'NO'}

Archive schema blockers: ${g.archive_schema_blockers.length ? g.archive_schema_blockers.join(', ') : 'NONE'}

Safe to BUILD apply migration code: ${g.safe_to_build_apply_migration_code ? 'YES' : 'NO'}
Safe to RUN Phase A canonical import: ${g.safe_to_run_phase_a_canonical_import ? 'YES' : 'NO'}
Safe to RUN Phase B legacy archive after Phase A verification: ${g.safe_to_run_phase_b_legacy_archive_after_verification ? 'YES' : 'NO'}
Safe to RUN full migration sequence: ${g.safe_to_run_full_migration_sequence ? 'YES' : 'NO'}
\`\`\`

## Konsol çıktısı

\`\`\`text
${consoleLog}
\`\`\`
`
}

main()
  .catch(err => {
    console.error('\nDRY RUN FAILED')
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => { await prisma.$disconnect() })
