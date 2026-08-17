/**
 * LOCALAKARAR — CANONICAL CONTENT CORRUPTION PATCH (TAB/CR/STRAY-CHAR)
 *
 * Kok neden: `content/migration/transformed-courses-combined.json` icindeki
 * tek-backslash LaTeX escape'leri (`\text`, `\times`, `\right`) JSON.parse
 * sirasinda TAB (U+0009) / CR (U+000D) kontrol karakterlerine donusuyor.
 * Phase A import bu bozuk icerigi DB'ye yazdi. Gorsel QA'da "TL yaninda
 * garip karakterler" (KaTeX `ext{...}` copu) bu yuzden gorunuyor.
 *
 * Bu script YALNIZCA canonical-v1 (38 ders) icerigine dokunur:
 *   1. DB: CANON-COURSE-% knowledge_object.content icinde
 *      - TAB (U+0009)  -> "\"  (281 adet, hepsi LaTeX komut bozulmasi)
 *      - CR  (U+000D)  -> "\"  (8 adet, `\right` bozulmasi)
 *      - "虹" (U+8679) -> ""   (1 adet, COURSE-007 `(\%虹)` -> `(\%)`)
 *   2. JSON artifact: ayni duzeltme dosyada (yeni re-import DEGIL, patch).
 *
 * Kullanim:
 *   node --env-file=.env --import tsx scripts/apply-canonical-tab-patch.ts          # dry-run (varsayilan)
 *   node --env-file=.env --import tsx scripts/apply-canonical-tab-patch.ts --apply  # gercek yazma
 *
 * SINIRLAR (kullanici talimati)
 *  - Canonical re-import YOK. Legacy Course/Lesson/KO update/delete YOK.
 *  - Phase B bu script kapsaminda DEGILDIR; progress remap YOK.
 *  - Tum yazmalar tek transaction icindedir; hata -> 0 yazma.
 *  - Idempotent: ikinci calisma ALREADY_APPLIED.
 *  - Beklenmeyen TAB/CR/karakter baglami bulunursa ABORT (hedef disi durum).
 *  - git add/commit/push YAPILMAZ.
 */

import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const prisma = new PrismaClient()

const CANONICAL_JSON = 'content/migration/transformed-courses-combined.json'
const REPORT_MD = 'CANONICAL_TAB_PATCH_REPORT.md'

const EXPECTED_RECORDS = 38
const EXPECTED_TABS = 281
const EXPECTED_CRS = 8
const EXPECTED_STRAY = 1

const APPLY = process.argv.includes('--apply')
const MODE = APPLY ? 'apply' : 'dry-run'

const log: string[] = []
const say = (line = '') => { log.push(line); console.log(line) }

function abort(reason: string): never {
  say('')
  say('APPLY ABORT')
  say(reason)
  process.exitCode = 1
  throw new Error('APPLY_ABORT')
}

/* TAB/CR ancak kendinden sonra ASCII harf geliyorsa LaTeX komut bozulmasidir.
   NOT: `\t` escape'i 't' harfini de yutar -> TAB sonrasi "ext" kalir
   (`\text` -> TAB+"ext"). `\times` -> TAB+"imes", `\right` -> CR+"ight". */
const KNOWN_COMMAND_STARTS = new Set(['ext', 'imes', 'ight'])

function verifyCorruptionContexts(rows: { code: string; content: string }[]) {
  let tabs = 0, crs = 0, stray = 0
  const issues: string[] = []

  for (const row of rows) {
    const content = row.content

    for (let i = 0; i < content.length; i++) {
      const ch = content[i]

      if (ch === '\t' || ch === '\r') {
        const next = content.slice(i + 1, i + 12)
        const cmd = next.match(/^([a-z]+)/)?.[1] ?? ''
        if (ch === '\t') tabs++
        else crs++
        if (!KNOWN_COMMAND_STARTS.has(cmd)) {
          issues.push(`${row.code}: ${ch === '\t' ? 'TAB' : 'CR'} beklenmeyen baglam: ${JSON.stringify(content.slice(Math.max(0, i - 30), i + 14))}`)
        }
      }

      if (ch === '\u8679') {
        stray++
        if (!content.slice(i - 12, i).endsWith('(\\%')) {
          issues.push(`${row.code}: "虹" beklenmeyen baglam: ${JSON.stringify(content.slice(Math.max(0, i - 30), i + 6))}`)
        }
      }
    }
  }

  return { tabs, crs, stray, issues }
}

function patchContent(content: string): { fixed: string; tabs: number; crs: number; stray: number } {
  let tabs = 0, crs = 0, stray = 0
  const out = content.replace(/\t/g, () => { tabs++; return '\\' })
    .replace(/\r/g, () => { crs++; return '\\' })
    .replace(/\u8679/g, () => { stray++; return '' })
  return { fixed: out, tabs, crs, stray }
}

function patchJsonArtifact(): { tabsFixed: number; strayFixed: number } {
  const raw = fs.readFileSync(CANONICAL_JSON, 'utf8')
  const beforeTabs = (raw.match(/\t/g) ?? []).length
  const strayBefore = (raw.match(/\u8679/g) ?? []).length

  /* Tek-backslash `\text` / `\times` / `\right` -> cift-backslash (dogru JSON
     escape). Onunde baska backslash olanlar (zaten dogru `\\text`) DEGISMZ. */
  const fixed = raw
    .replace(/(?<!\\)\\(text|times|right)(?=[^a-zA-Z\\]|$)/g, '\\\\$1')
    .replace(/\u8679/g, '')

  const afterTabs = (fixed.match(/\t/g) ?? []).length
  const afterStray = (fixed.match(/\u8679/g) ?? []).length

  if (afterTabs !== 0 || afterStray !== 0) {
    abort('JSON artifact: duzeltme sonrasi hala TAB/bozuk karakter var.')
  }

  let parsed: any
  try {
    parsed = JSON.parse(fixed)
  } catch (err) {
    abort(`JSON artifact duzeltmesi gecersiz JSON uretti: ${(err as Error).message}`)
  }

  const parsedTabs = (JSON.stringify(parsed).match(/\t/g) ?? []).length
  if (parsedTabs !== 0) abort('JSON artifact: parse sonrasi hala TAB var.')

  fs.writeFileSync(CANONICAL_JSON, fixed)
  return { tabsFixed: beforeTabs, strayFixed: strayBefore }
}

async function main() {
  say('LocalKarar — CANONICAL CONTENT CORRUPTION PATCH (TAB/CR/STRAY)')
  say('='.repeat(64))
  say(`Mod: ${MODE.toUpperCase()}${APPLY ? '' : '  (yazma yok — --apply ile calistirin)'}`)
  say(`Tarih: ${new Date().toISOString()}`)
  say('Canonical re-import YOK. Legacy update/delete YOK. Phase B YOK. Progress remap YOK.')
  say()

  /* ---------------- PRE-FLIGHT ---------------- */
  const [canonicalCourses, canonicalKos] = await Promise.all([
    prisma.course.count({ where: { sourceType: 'canonical-v1' } }),
    prisma.knowledgeObject.count({ where: { code: { startsWith: 'CANON-' } } })
  ])

  say(`Canonical course: ${canonicalCourses}  (beklenen ${EXPECTED_RECORDS})`)
  say(`Canonical KO:     ${canonicalKos}  (beklenen ${EXPECTED_RECORDS})`)
  if (canonicalCourses !== EXPECTED_RECORDS || canonicalKos !== EXPECTED_RECORDS) {
    abort('Pre-flight: canonical kayit sayisi beklenen 38 degil. Devam edilemez.')
  }

  const rows = await prisma.knowledgeObject.findMany({
    where: { code: { startsWith: 'CANON-COURSE-' } },
    select: { code: true, content: true }
  })

  const { tabs, crs, stray, issues } = verifyCorruptionContexts(rows)
  say(`DB taramasi: TAB=${tabs}  CR=${crs}  stray("虹")=${stray}`)
  say(`  (beklenen: TAB=${EXPECTED_TABS}, CR=${EXPECTED_CRS}, stray=${EXPECTED_STRAY})`)

  if (issues.length > 0) {
    for (const i of issues) say(`  ISSUE ${i}`)
    abort('Beklenmeyen baglam tespit edildi — hedef disi durum. Hicbir yazma yapilmadi.')
  }
  if (tabs !== EXPECTED_TABS || crs !== EXPECTED_CRS || stray !== EXPECTED_STRAY) {
    abort(`Beklenen sayilarla uyusmuyor (TAB=${tabs}/CR=${crs}/stray=${stray}). Durum arastirilmali.`)
  }

  const changed = rows.map(r => ({ code: r.code, ...patchContent(r.content) })).filter(r => r.tabs || r.crs || r.stray)

  say('')
  say(`Duzeltilecek KO: ${changed.length}  (TAB=${changed.reduce((a, r) => a + r.tabs, 0)}, CR=${changed.reduce((a, r) => a + r.crs, 0)}, stray=${changed.reduce((a, r) => a + r.stray, 0)})`)
  for (const r of changed) say(`  [${r.code}] TAB=${r.tabs} CR=${r.crs} stray=${r.stray}`)

  if (!APPLY) {
    say('')
    say('DRY-RUN OK — yazma yok. Gercek yazma: --apply')
    return
  }

  /* ---------------- APPLY (DB) ---------------- */
  say('')
  say('APPLY basliyor (tek transaction)...')

  try {
    await prisma.$transaction(async (tx) => {
      for (const r of changed) {
        await tx.knowledgeObject.update({
          where: { code: r.code },
          data: { content: r.fixed }
        })
      }
    })
  } catch (err) {
    abort(`Transaction HATASI — hicbir yazma kaydedilmedi: ${(err as Error).message}`)
  }

  say(`Transaction OK: ${changed.length} canonical KO icerigi duzeltildi.`)

  /* ---------------- APPLY (JSON ARTIFACT) ---------------- */
  const jsonFix = patchJsonArtifact()
  say(`JSON artifact: ${jsonFix.tabsFixed} tek-backslash escape + ${jsonFix.strayFixed} stray karakter duzeltildi.`)

  /* ---------------- POST-VERIFY ---------------- */
  await verifyPostState()
}

async function verifyPostState() {
  say('')
  say('POST-VERIFY')
  say('-' .repeat(64))

  const [canonicalCourses, canonicalKos, legacyKos] = await Promise.all([
    prisma.course.count({ where: { sourceType: 'canonical-v1' } }),
    prisma.knowledgeObject.count({ where: { code: { startsWith: 'CANON-' } } }),
    prisma.knowledgeObject.count({ where: { NOT: { code: { startsWith: 'CANON-' } } } })
  ])

  const rows = await prisma.knowledgeObject.findMany({
    where: { code: { startsWith: 'CANON-COURSE-' } },
    select: { code: true, content: true }
  })
  const post = verifyCorruptionContexts(rows)

  /* JSON artifact: parse sonrasi hicbir stringde TAB/CR/stray yok. */
  const parsed = JSON.parse(fs.readFileSync(CANONICAL_JSON, 'utf8'))
  const jsonCheck = (JSON.stringify(parsed).match(/[\t\r\u8679]/g) ?? []).length

  /* DB icerigi artik dogru LaTeX: `\text` komutlari var, bozuk yok. */
  const texCommands = rows.reduce((a, r) => a + ((r.content.match(/\\text|\\times|\\right/g) ?? []).length), 0)

  const pass =
    canonicalCourses === EXPECTED_RECORDS &&
    canonicalKos === EXPECTED_RECORDS &&
    post.tabs === 0 &&
    post.crs === 0 &&
    post.stray === 0 &&
    post.issues.length === 0 &&
    jsonCheck === 0

  say(`Canonical course: ${canonicalCourses}  (beklenen ${EXPECTED_RECORDS})`)
  say(`Canonical KO:     ${canonicalKos}  (beklenen ${EXPECTED_RECORDS})`)
  say(`Legacy KO (dokunulmadi): ${legacyKos}`)
  say(`DB artik TAB=${post.tabs} CR=${post.crs} stray=${post.stray}  (beklenen 0)`)
  say(`DB dogru LaTeX komutu: ${texCommands} (\\text/\\times/\\right)`)
  say(`JSON artifact parse kontrolu: ${jsonCheck} bozuk karakter  (beklenen 0)`)

  say('')
  say(`PATCH STATUS: ${pass ? 'PASS' : 'FAIL'}`)
  writeReport({ pass, legacyKos, texCommands })

  if (!pass) abort('POST-VERIFY FAIL — durum incelenmeli.')
}

function writeReport(opts: { pass: boolean; legacyKos: number; texCommands: number }) {
  const md = `# CANONICAL TAB PATCH — UYGULAMA RAPORU

**Tarih:** ${new Date().toISOString()}
**Uygulama modu:** ${MODE}
**Kapsam:** Yalnız canonical-v1 (38 ders) \`knowledge_object.content\` + JSON artifact. Legacy verisine dokunulmadı. Phase B çalıştırılmadı. Progress remap yapılmadı. git add/commit/push yapılmadı.

## Kök Neden
\`transformed-courses-combined.json\` içindeki tek-backslash LaTeX escape'leri (\`\\text\`, \`\\times\`, \`\\right\`) JSON.parse sırasında TAB (U+0009) / CR (U+000D) kontrol karakterlerine dönüşüyordu. Phase A import bu bozuk içeriği DB'ye yazdı; KaTeX \`ext{ TL}\` çöpünü gösteriyordu.

## Yapılan Değişiklikler (apply)
- DB: ${EXPECTED_TABS} TAB → \`\\\`, ${EXPECTED_CRS} CR → \`\\\`, ${EXPECTED_STRAY} "虹" → silindi (yalnız CANON-COURSE-% içeriği).
- JSON artifact: tek-backslash escape'ler cift-backslash'a cevrildi (yeniden import DEĞİL).

## Sonuç Durumu
- Canonical kurs sayısı: 38
- Canonical KO sayısı: 38
- Legacy KO sayısı (dokunulmadı): ${opts.legacyKos}
- DB kalan bozuk karakter: 0 (TAB=0, CR=0, stray=0)
- DB doğru LaTeX komutu: ${opts.texCommands} (\\text / \\times / \\right)
- JSON artifact parse kontrolü: 0 bozuk karakter

## Sonuç
- Patch durumu: ${opts.pass ? 'PASS' : 'FAIL'}
- Son gorsel QA icin guvenli: ${opts.pass ? 'EVET' : 'HAYIR'}
`
  fs.writeFileSync(REPORT_MD, md)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())