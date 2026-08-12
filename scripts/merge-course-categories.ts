/*
 * Kurs kategorilerini 32'den 8'e indirir.
 *
 * Kaynak: KURS_KATEGORI_ESLEME.md
 * Yalnızca Course.category alanını günceller. Kurs, ders, kayıt, ilerleme
 * verisine dokunmaz. Hiçbir şey silmez.
 *
 * Kullanım:
 *   npm run courses:merge-categories              → ne olacağını gösterir (dry-run)
 *   npm run courses:merge-categories -- --apply   → uygular
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

/** Türkçe karakter duyarlı slug — "girisimcilik" ve "Girişimcilik" aynı anahtara düşer. */
function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u'
  }
  return value
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, char => map[char] ?? char)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Eski kategori → yeni kategori. Anahtarlar slug'a çevrilerek eşleştirilir. */
const MAP: Record<string, string> = {
  // 1 — Finans ve Nakit
  'Finans ve Nakit': 'Finans ve Nakit',
  'Finansal Analiz': 'Finans ve Nakit',
  'Veri Okuryazarlığı': 'Finans ve Nakit',
  'Nakit Yönetimi': 'Finans ve Nakit',
  'Operasyonel Finans': 'Finans ve Nakit',
  'Risk Yönetimi': 'Finans ve Nakit',
  'Planlama': 'Finans ve Nakit',
  'Finans': 'Finans ve Nakit',                    // yayında değil
  'temel-finans': 'Finans ve Nakit',              // yayında değil (taslak müfredat)

  // 2 — Maliyet ve Fiyatlama
  'Maliyet ve Fiyatlama': 'Maliyet ve Fiyatlama',
  'Maliyet Yönetimi': 'Maliyet ve Fiyatlama',
  'Ticari Kararlar': 'Maliyet ve Fiyatlama',
  'maliyet': 'Maliyet ve Fiyatlama',              // yayında değil (taslak müfredat)

  // 3 — Satış ve Pazarlama
  'Pazarlama': 'Satış ve Pazarlama',
  'Pazarlama ve Müşteri Sadakati': 'Satış ve Pazarlama',
  'Satış ve İhracat': 'Satış ve Pazarlama',
  'Satış ve Müşteri Yönetimi': 'Satış ve Pazarlama',
  'Satış ve Pazarlama': 'Satış ve Pazarlama',     // birleştirme scripti tarafından atandı
  'Büyüme Ekonomisi': 'Satış ve Pazarlama',
  'Büyüme Analitiği': 'Satış ve Pazarlama',
  'E-Ticaret Finansı': 'Satış ve Pazarlama',
  'İhracat ve E-İhracat': 'Satış ve Pazarlama',   // yayında değil

  // 4 — E-Ticaret
  'E-Ticaret': 'E-Ticaret',

  // 5 — Hukuk ve Vergi
  'Hukuk ve Vergi': 'Hukuk ve Vergi',
  'Hukuk': 'Hukuk ve Vergi',                      // yayında değil
  'hukuk-vergi': 'Hukuk ve Vergi',                // yayında değil (taslak müfredat)

  // 6 — Girişimcilik ve Yatırım
  'Girişimcilik': 'Girişimcilik ve Yatırım',
  'Girişimcilik ve Yatırım': 'Girişimcilik ve Yatırım', // birleştirme scripti tarafından atandı
  'Finansman ve Kredi Yönetimi': 'Girişimcilik ve Yatırım',
  'İşi Satın Alma ve Yatırım Değerlendirmesi': 'Girişimcilik ve Yatırım',
  'Yatırım Analizi': 'Girişimcilik ve Yatırım',
  'Değerleme': 'Girişimcilik ve Yatırım',
  'Kurumsal Finans': 'Girişimcilik ve Yatırım',
  'Girişim Finansı': 'Girişimcilik ve Yatırım',

  // 7 — Operasyon ve Perakende
  'Operasyon ve İnsan': 'Operasyon ve Perakende',
  'Perakende ve Mağaza Yönetimi': 'Operasyon ve Perakende',
  'Sürdürülebilirlik ve Tedarik': 'Operasyon ve Perakende',
  'Operasyon ve Kalite': 'Operasyon ve Perakende',                  // yayında değil
  'İnsan ve İş Sağlığı': 'Operasyon ve Perakende',                  // yayında değil
  'Tedarik Zinciri': 'Operasyon ve Perakende',                      // yayında değil
  'Sürdürülebilirlik ve Kaynak Verimliliği': 'Operasyon ve Perakende', // yayında değil

  // 8 — Teknoloji ve Güvenlik
  'Dijitalleşme ve Teknoloji': 'Teknoloji ve Güvenlik',
  'Siber Güvenlik ve AI': 'Teknoloji ve Güvenlik',
  'Siber Güvenlik ve Veri': 'Teknoloji ve Güvenlik',        // yayında değil
  'Yapay Zekâ ve Risk Yönetimi': 'Teknoloji ve Güvenlik'    // yayında değil
}

const SLUG_MAP = new Map<string, string>()
for (const [from, to] of Object.entries(MAP)) SLUG_MAP.set(slugify(from), to)

async function main() {
  const courses = await prisma.course.findMany({
    select: { id: true, title: true, category: true, published: true },
    orderBy: { id: 'asc' }
  })

  const changes: Array<{ id: number; title: string; from: string; to: string; published: boolean }> = []
  const unmapped = new Map<string, string[]>()
  const unchanged: string[] = []

  for (const course of courses) {
    const current = (course.category || '').trim()
    const target = SLUG_MAP.get(slugify(current))

    if (!target) {
      const list = unmapped.get(current) ?? []
      list.push(course.title)
      unmapped.set(current, list)
      continue
    }
    if (target === current) { unchanged.push(course.title); continue }
    changes.push({ id: course.id, title: course.title, from: current, to: target, published: course.published })
  }

  // Eşlenmemiş kategori varsa DURDUR. Sessizce atlarsak kurs kaybolmuş gibi olur.
  if (unmapped.size) {
    console.error('Eşleme tablosunda karşılığı olmayan kategoriler var:\n')
    for (const [category, titles] of unmapped) {
      console.error(`  "${category}" (${titles.length} kurs)`)
      titles.forEach(t => console.error(`      - ${t}`))
    }
    console.error('\nKURS_KATEGORI_ESLEME.md ve bu script\'teki MAP tablosunu güncelle.')
    process.exitCode = 1
    return
  }

  const after = new Map<string, { published: number; draft: number }>()
  for (const course of courses) {
    const target = SLUG_MAP.get(slugify((course.category || '').trim()))!
    const bucket = after.get(target) ?? { published: 0, draft: 0 }
    if (course.published) bucket.published++; else bucket.draft++
    after.set(target, bucket)
  }

  const publishedCount = courses.filter(c => c.published).length
  console.log(`Toplam kurs: ${courses.length}  (yayında ${publishedCount} · taslak ${courses.length - publishedCount})`)
  console.log(`Değişecek: ${changes.length} · Aynı kalacak: ${unchanged.length}\n`)

  const changedPublished = changes.filter(c => c.published).length
  console.log(`Değişecek kurslardan ${changedPublished} tanesi yayında, ${changes.length - changedPublished} tanesi taslak.\n`)

  console.log('Değişecek kurslar (yayında olanlar):')
  for (const change of changes.filter(c => c.published)) {
    console.log(`  [${String(change.id).padStart(4)}] ${change.title}`)
    console.log(`         ${change.from}  →  ${change.to}`)
  }

  console.log('\nSonraki kategori dağılımı:')
  console.log(`  ${'Kategori'.padEnd(28)} ${'yayın'.padStart(5)} ${'taslak'.padStart(7)}`)
  for (const [category, bucket] of [...after].sort((a, b) => b[1].published - a[1].published)) {
    console.log(`  ${category.padEnd(28)} ${String(bucket.published).padStart(5)} ${String(bucket.draft).padStart(7)}`)
  }
  console.log(`  ${'—'.repeat(28)}`)
  console.log(`  Kategori sayısı: ${after.size}`)

  if (!APPLY) {
    console.log('\nDRY-RUN — hiçbir kayıt değiştirilmedi.')
    console.log('Uygulamak için: npm run courses:merge-categories -- --apply')
    return
  }

  // Tek transaction: ya hepsi ya hiçbiri.
  await prisma.$transaction(
    changes.map(change =>
      prisma.course.update({ where: { id: change.id }, data: { category: change.to } })
    )
  )

  console.log(`\nUYGULANDI — ${changes.length} kursun kategorisi güncellendi.`)
}

main()
  .catch(error => { console.error(error); process.exitCode = 1 })
  .finally(async () => prisma.$disconnect())
