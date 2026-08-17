/**
 * Phase B — Legacy Course arşivleme.
 *
 * VARSAYILAN DAVRANIŞ: dry-run. `--apply` verilmeden HİÇBİR yazma yapılmaz.
 *
 * Kapsam sınırı KURS satırıdır:
 *   - Course.published  = false
 *   - Course.archivedAt = now
 *
 * Lesson, KnowledgeObject ve kullanıcı geçmişi tabloları DOĞRUDAN
 * DEĞİŞTİRİLMEZ. Dersler ebeveyn kurs üzerinden katalogdan düşer
 * (`courses.ts` liste sorgusu `archivedAt: null` filtreliyor).
 *
 * Çalıştırma:
 *   npx tsx scripts/content-migration-phase-b.ts            # dry-run
 *   npx tsx scripts/content-migration-phase-b.ts --apply     # uygula
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const CANONICAL_SOURCE_TYPE = 'canonical-v1'

/* Canonical hariç tutma NULL-SAFE olmalı.
   `sourceType` bugün NOT NULL ama şema ileride gevşerse `!=` sessizce
   satır kaçırırdı; `IS DISTINCT FROM` semantiği için `not: null` + `not:
   value` yerine açıkça iki koşul yazıyoruz. */
const legacyCourseWhere = {
  NOT: { sourceType: CANONICAL_SOURCE_TYPE },
  archivedAt: null
} as const

interface Gate {
  ad: string
  beklenen: number
  bulunan: number
}

async function toplaGateler(): Promise<Gate[]> {
  const [
    canonicalHedefte,
    hedefSayisi,
    canonicalToplam,
    canonicalAktif,
    dersToplam,
    koToplam,
    kursToplam
  ] = await Promise.all([
    /* EN KRİTİK GATE: hedef kümede canonical kurs olmamalı. */
    prisma.course.count({
      where: { ...legacyCourseWhere, sourceType: CANONICAL_SOURCE_TYPE }
    }),
    prisma.course.count({ where: legacyCourseWhere }),
    prisma.course.count({ where: { sourceType: CANONICAL_SOURCE_TYPE } }),
    prisma.course.count({
      where: { sourceType: CANONICAL_SOURCE_TYPE, published: true, archivedAt: null }
    }),
    prisma.lesson.count(),
    prisma.knowledgeObject.count(),
    prisma.course.count()
  ])

  return [
    { ad: 'Hedef kümedeki canonical kurs', beklenen: 0, bulunan: canonicalHedefte },
    { ad: 'Canonical kurs toplamı', beklenen: 38, bulunan: canonicalToplam },
    { ad: 'Canonical kurs aktif', beklenen: 38, bulunan: canonicalAktif },
    { ad: 'Toplam kurs', beklenen: 326, bulunan: kursToplam },
    { ad: 'Toplam ders', beklenen: 1208, bulunan: dersToplam },
    { ad: 'Toplam KO', beklenen: 993, bulunan: koToplam },
    { ad: 'Arşivlenecek legacy kurs', beklenen: hedefSayisi, bulunan: hedefSayisi }
  ]
}

/** Kullanıcı geçmişi kimliği — apply öncesi/sonrası aynı kalmalı. */
async function gecmisAnlikGoruntusu() {
  const [enrollment, lessonProgress, knowledgeProgress, decisionCheckSession,
         formulaCalculation, activityEvent, quizAttempt, taskAssignment] = await Promise.all([
    prisma.enrollment.count(),
    prisma.lessonProgress.count(),
    prisma.knowledgeProgress.count(),
    prisma.decisionCheckSession.count(),
    prisma.formulaCalculation.count(),
    prisma.activityEvent.count(),
    prisma.quizAttempt.count(),
    prisma.taskAssignment.count()
  ])
  return { enrollment, lessonProgress, knowledgeProgress, decisionCheckSession,
           formulaCalculation, activityEvent, quizAttempt, taskAssignment }
}

async function main() {
  console.log(`\nPhase B — Legacy Course arşivleme (${APPLY ? 'APPLY' : 'DRY-RUN'})\n`)

  const hedefler = await prisma.course.findMany({
    where: legacyCourseWhere,
    select: { id: true, title: true, sourceType: true, published: true },
    orderBy: { id: 'asc' }
  })

  const gecmisOnce = await gecmisAnlikGoruntusu()
  const gateler = await toplaGateler()

  console.log('GATE KONTROLLERİ')
  let gateFail = false
  for (const g of gateler) {
    const ok = g.bulunan === g.beklenen
    if (!ok) gateFail = true
    console.log(`  ${ok ? 'GEÇTİ' : 'KALDI'}  ${g.ad}: ${g.bulunan} (beklenen ${g.beklenen})`)
  }

  console.log('\nPLANLANAN MUTASYONLAR')
  console.log(`  Course arşivleme      : ${hedefler.length}`)
  console.log(`    - hâlen yayında     : ${hedefler.filter(c => c.published).length}`)
  console.log(`    - hâlen taslak      : ${hedefler.filter(c => !c.published).length}`)
  console.log('  Lesson güncelleme     : 0')
  console.log('  KnowledgeObject güncelleme: 0')
  console.log('  Silme (soft/hard)     : 0')
  console.log('  İlişki silme          : 0')
  console.log('  İlerleme remap        : 0')
  console.log('  Kullanıcı geçmişi     : 0')

  console.log('\nKULLANICI GEÇMİŞİ (değişmemeli)')
  for (const [k, v] of Object.entries(gecmisOnce)) console.log(`  ${k}: ${v}`)

  if (gateFail) {
    console.error('\nGATE BAŞARISIZ — apply başlatılmadı.')
    process.exitCode = 1
    return
  }

  if (!APPLY) {
    console.log('\nDRY-RUN. Hiçbir yazma yapılmadı. Uygulamak için --apply.')
    return
  }

  /* APPLY — gate'ler transaction İÇİNDE yeniden çalışır. Dry-run ile apply
     arasında veri değişmiş olabilir; dışarıda doğrulamak yetmez. */
  const now = new Date()
  const sonuc = await prisma.$transaction(async tx => {
    const canonicalHedefte = await tx.course.count({
      where: { ...legacyCourseWhere, sourceType: CANONICAL_SOURCE_TYPE }
    })
    if (canonicalHedefte !== 0) {
      throw new Error(`GATE: hedef kümede ${canonicalHedefte} canonical kurs var — iptal`)
    }

    const canonicalAktif = await tx.course.count({
      where: { sourceType: CANONICAL_SOURCE_TYPE, published: true, archivedAt: null }
    })
    if (canonicalAktif !== 38) {
      throw new Error(`GATE: canonical aktif kurs ${canonicalAktif}, 38 bekleniyordu — iptal`)
    }

    const guncellenen = await tx.course.updateMany({
      where: legacyCourseWhere,
      data: { published: false, archivedAt: now }
    })

    /* Transaction içinde son kontrol: canonical'a dokunulmadı mı. */
    const canonicalSonra = await tx.course.count({
      where: { sourceType: CANONICAL_SOURCE_TYPE, published: true, archivedAt: null }
    })
    if (canonicalSonra !== 38) {
      throw new Error(`GATE: canonical aktif ${canonicalSonra} oldu — geri alınıyor`)
    }

    return guncellenen.count
  })

  const gecmisSonra = await gecmisAnlikGoruntusu()
  const gecmisBozuldu = Object.entries(gecmisOnce)
    .filter(([k, v]) => (gecmisSonra as any)[k] !== v)

  console.log(`\nUYGULANDI: ${sonuc} legacy kurs arşivlendi.`)
  console.log(`Kullanıcı geçmişi değişimi: ${gecmisBozuldu.length === 0 ? 'YOK' : JSON.stringify(gecmisBozuldu)}`)
}

main()
  .catch(err => { console.error('HATA:', err.message); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
