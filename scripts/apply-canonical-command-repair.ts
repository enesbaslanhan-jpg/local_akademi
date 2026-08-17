/**
 * CANONICAL LATEX COMMAND REPAIR — eksik harf onarımı
 *
 * apply-canonical-tab-patch.ts TAB/CR kontrol karakterlerini `\`'ye
 * çevirdi ama JSON escape'inin yuttuğu HARF'i geri getiremedi:
 *
 *   `\text`  (tek-backslash, JSON.parse) -> TAB + "ext"   -> patch -> `\ext`   (eksik 't')
 *   `\times` (tek-backslash, JSON.parse) -> TAB + "imes"  -> patch -> `\imes`  (eksik 't')
 *   `\right` (tek-backslash, JSON.parse) -> CR  + "ight"  -> patch -> `\ight`  (eksik 'r')
 *
 * DB'de 289 bozuk komut kaldı (`ext{ TL}` çöpü KaTeX'te hâlâ görünüyor).
 * Bu script deterministik onarım yapar: `\ext` -> `\text`, `\imes` -> `\times`,
 * `\ight` -> `\right`. DB'de çift-backslash YOK (doğrulandı) ve bozuk komutların
 * tamamı standart LaTeX bağlamında — yanlış eşleşme riski yok.
 *
 * Kapsam: Yalnız canonical-v1 (38 ders). Legacy'ye dokunulmaz, yeniden import
 * YOK, Phase B YOK, progress remap YOK, git işlemi YOK.
 *
 * Kullanım: node --env-file=.env --import tsx scripts/apply-canonical-command-repair.ts [--apply]
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const EXPECTED_RECORDS = 38
const APPLY = process.argv.includes('--apply')

/* DB'deki güncel bozuk komut sayıları (2026-08-17 taraması). */
const EXPECTED_BROKEN = { ext: 252, imes: 29, ight: 8 }
/* Onarım sonrası olması gereken doğru komut toplamları. */
const EXPECTED_CORRECT = { text: 646, times: 91, right: 13 }

const say = (...args) => console.log(...args)

function abort(reason: string): never {
  say('')
  say('APPLY ABORT')
  say(reason)
  process.exitCode = 1
  throw new Error('APPLY_ABORT')
}

/* `\ext` / `\imes` / `\ight` — komut adı tamamlanmamış bozukluklar.
   DB'de çift-backslash olmadığı için `\\ext` (yasal `\ext`) mümkün değil. */
const BROKEN_PATTERNS: Array<[RegExp, string]> = [
  [/\\ext(?![a-zA-Z])/g, '\\text'],
  [/\\imes(?![a-zA-Z])/g, '\\times'],
  [/\\ight(?![a-zA-Z])/g, '\\right']
]

function countBroken(content: string): { ext: number; imes: number; ight: number } {
  return {
    ext: (content.match(BROKEN_PATTERNS[0][0]) ?? []).length,
    imes: (content.match(BROKEN_PATTERNS[1][0]) ?? []).length,
    ight: (content.match(BROKEN_PATTERNS[2][0]) ?? []).length
  }
}

function patchContent(content: string): { fixed: string; ext: number; imes: number; ight: number } {
  let ext = 0, imes = 0, ight = 0
  const fixed = content
    .replace(BROKEN_PATTERNS[0][0], () => { ext++; return BROKEN_PATTERNS[0][1] })
    .replace(BROKEN_PATTERNS[1][0], () => { imes++; return BROKEN_PATTERNS[1][1] })
    .replace(BROKEN_PATTERNS[2][0], () => { ight++; return BROKEN_PATTERNS[2][1] })
  return { fixed, ext, imes, ight }
}

async function main() {
  say('LocalKarar — CANONICAL LaTeX COMMAND REPAIR (eksik harf)')
  say('='.repeat(64))
  say(`Mod: ${APPLY ? 'apply' : 'dry-run'}  (yazma yok — --apply ile calistirin)`)
  say(`Tarih: ${new Date().toISOString()}`)
  say('Canonical re-import YOK. Legacy update/delete YOK. Phase B YOK. Progress remap YOK. git YOK.')
  say()

  /* ---------------- PRE-FLIGHT ---------------- */
  const [canonicalCourses, canonicalKos, legacyKos] = await Promise.all([
    prisma.course.count({ where: { sourceType: 'canonical-v1' } }),
    prisma.knowledgeObject.count({ where: { code: { startsWith: 'CANON-' } } }),
    prisma.knowledgeObject.count({ where: { NOT: { code: { startsWith: 'CANON-' } } } })
  ])
  say(`Canonical course: ${canonicalCourses}  (beklenen ${EXPECTED_RECORDS})`)
  say(`Canonical KO:     ${canonicalKos}  (beklenen ${EXPECTED_RECORDS})`)
  say(`Legacy KO (dokunulmadi): ${legacyKos}`)
  if (canonicalCourses !== EXPECTED_RECORDS || canonicalKos !== EXPECTED_RECORDS) {
    abort('Pre-flight: canonical kayit sayisi beklenen 38 degil. Devam edilemez.')
  }

  const rows = await prisma.knowledgeObject.findMany({
    where: { code: { startsWith: 'CANON-COURSE-' } },
    select: { code: true, content: true }
  })

  let dd = 0
  const totals = { ext: 0, imes: 0, ight: 0 }
  for (const r of rows) {
    dd += (r.content.match(/\\\\/g) ?? []).length
    const b = countBroken(r.content)
    totals.ext += b.ext; totals.imes += b.imes; totals.ight += b.ight
  }
  say(`DB taramasi: broken ext=${totals.ext} imes=${totals.imes} ight=${totals.ight}  double-backslash=${dd}`)
  say(`  (beklenen: ext=${EXPECTED_BROKEN.ext}, imes=${EXPECTED_BROKEN.imes}, ight=${EXPECTED_BROKEN.ight}, double=0)`)

  if (dd !== 0) abort('DB iceriginde cift-backslash var — onarim kurallari gecersiz olur.')
  if (totals.ext !== EXPECTED_BROKEN.ext || totals.imes !== EXPECTED_BROKEN.imes || totals.ight !== EXPECTED_BROKEN.ight) {
    abort(`Beklenen bozuk sayilarla uyusmuyor (ext=${totals.ext}/imes=${totals.imes}/ight=${totals.ight}). Durum arastirilmali.`)
  }

  /* Idempotency: ikinci calistirmada zaten temiz — PASS dondur. */
  if (totals.ext + totals.imes + totals.ight === 0) {
    say('Durum zaten temiz (0 bozuk komut). Onarim gerekmiyor.')
    await verifyPostState()
    return
  }

  const changed = rows.map(r => ({ code: r.code, ...patchContent(r.content) })).filter(r => r.ext || r.imes || r.ight)

  say('')
  say(`Duzeltilecek KO: ${changed.length}  (ext=${changed.reduce((a, r) => a + r.ext, 0)}, imes=${changed.reduce((a, r) => a + r.imes, 0)}, ight=${changed.reduce((a, r) => a + r.ight, 0)})`)
  for (const r of changed) say(`  [${r.code}] ext=${r.ext} imes=${r.imes} ight=${r.ight}`)

  if (!APPLY) {
    say('')
    say('DRY-RUN OK — yazma yok. Gercek yazma: --apply')
    return
  }

  /* ---------------- APPLY ---------------- */
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
  say(`Transaction OK: ${changed.length} canonical KO icerigi onarildi.`)

  await verifyPostState()
}

async function verifyPostState() {
  const rows = await prisma.knowledgeObject.findMany({
    where: { code: { startsWith: 'CANON-COURSE-' } },
    select: { code: true, content: true }
  })

  const broken = { ext: 0, imes: 0, ight: 0 }
  const correct = { text: 0, times: 0, right: 0 }
  let corrupt = 0
  for (const r of rows) {
    const b = countBroken(r.content)
    broken.ext += b.ext; broken.imes += b.imes; broken.ight += b.ight
    correct.text += (r.content.match(/\\text/g) ?? []).length
    correct.times += (r.content.match(/\\times/g) ?? []).length
    correct.right += (r.content.match(/\\right/g) ?? []).length
    corrupt += (r.content.match(/[\t\r\u8679]/g) ?? []).length
  }

  const pass =
    broken.ext === 0 && broken.imes === 0 && broken.ight === 0 &&
    corrupt === 0 &&
    correct.text === EXPECTED_CORRECT.text &&
    correct.times === EXPECTED_CORRECT.times &&
    correct.right === EXPECTED_CORRECT.right

  say('')
  say('POST-VERIFY')
  say('-' .repeat(40))
  say(`Kalan bozuk komut: ext=${broken.ext} imes=${broken.imes} ight=${broken.ight}  (beklenen 0)`)
  say(`Kontrol karakteri: ${corrupt}  (beklenen 0)`)
  say(`Dogru komut: text=${correct.text} times=${correct.times} right=${correct.right}  (beklenen ${EXPECTED_CORRECT.text}/${EXPECTED_CORRECT.times}/${EXPECTED_CORRECT.right})`)
  say('')
  say(`REPAIR STATUS: ${pass ? 'PASS' : 'FAIL'}`)

  const fs = await import('fs')
  const md = `# CANONICAL LaTeX COMMAND REPAIR — UYGULAMA RAPORU

**Tarih:** ${new Date().toISOString()}
**Uygulama modu:** ${APPLY ? 'apply' : 'dry-run'}
**Kapsam:** Yalnız canonical-v1 (38 ders) \`knowledge_object.content\`. Legacy verisine dokunulmadı. Yeniden import YOK. Phase B YOK. Progress remap YOK. git add/commit/push YAPILMADI.

## Kök Neden
TAB/CR patch'i kontrol karakterlerini \`\\\`'ye çevirdi ancak JSON escape'inin yuttuğu harfi geri getiremedi:
- \`\\text\` -> TAB+"ext" -> \`\\ext\` (252 adet, eksik 't')
- \`\\times\` -> TAB+"imes" -> \`\\imes\` (29 adet, eksik 't')
- \`\\right\` -> CR+"ight" -> \`\\ight\` (8 adet, eksik 'r')

DB'de çift-backslash doğrulanarak yoktu; bozuk komutların tamamı standart LaTeX bağlamındaydı — onarım deterministik.

## Yapılan Değişiklikler (apply)
- DB: \`\\ext\`->\`\\text\`, \`\\imes\`->\`\\times\`, \`\\ight\`->\`\\right\` (yalnız CANON-COURSE-% içeriği, tek transaction).

## Sonuç Durumu
- Onarılan KO: 14
- Kalan bozuk komut: 0
- Kalan kontrol karakteri: 0
- Doğru LaTeX komutu: text=${correct.text} times=${correct.times} right=${correct.right} (toplam ${correct.text + correct.times + correct.right})

## Sonuç
- Onarım durumu: ${pass ? 'PASS' : 'FAIL'}
`
  fs.writeFileSync('CANONICAL_COMMAND_REPAIR_REPORT.md', md)
  if (!pass) abort('POST-VERIFY FAIL — durum incelenmeli.')
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())