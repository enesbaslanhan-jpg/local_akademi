/*
 * Yayındaki kursları NotebookLM için markdown olarak dışa aktarır.
 *
 * Çıktı: exports/kurslar/<kategori>.md  (kategori başına bir dosya)
 *        exports/kurslar/00-ozet.md     (başlık listesi + sayım)
 *
 * Yalnızca OKUR. Hiçbir kaydı değiştirmez, silmez, yayından kaldırmaz.
 *
 * Kullanım:
 *   npm run courses:export
 *
 * Sadece yayında olanları saymak/görmek için (dosya yazmaz):
 *   npm run courses:export -- --dry-run
 */

import { PrismaClient } from '@prisma/client'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const prisma = new PrismaClient()

const OUT_DIR = join(process.cwd(), 'exports', 'kurslar')
const DRY_RUN = process.argv.includes('--dry-run')

/** Dosya adı için kategori sluglaştırma (Türkçe karakterler dahil). */
function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u'
  }
  return value
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, char => map[char] ?? char)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'kategori'
}

/** outcomes / seeAlso gibi JSON string alanları güvenli çöz. */
function parseList(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    return []
  } catch {
    return []
  }
}

async function main() {
  const courses = await prisma.course.findMany({
    where: { published: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: { knowledgeObject: true }
      }
    }
  })

  if (!courses.length) {
    console.log('Yayında kurs bulunamadı. (Course.published = true olan kayıt yok.)')
    return
  }

  /*
   * Kategoriler SLUG üzerinden gruplanır, ham metin üzerinden değil.
   * Veride hem "girisimcilik" hem "Girişimcilik" var; ham metne göre
   * gruplayınca ikisi ayrı grup oluyor ama aynı dosya adına yazılıyor ve
   * biri diğerinin üstüne biniyordu. Slug'a göre gruplayınca ikisi doğru
   * şekilde tek kategoride birleşiyor.
   */
  const byCategory = new Map<string, { label: string; variants: Set<string>; items: typeof courses }>()
  for (const course of courses) {
    const raw = (course.category || 'kategorisiz').trim()
    const key = slugify(raw)
    const group = byCategory.get(key) ?? { label: raw, variants: new Set<string>(), items: [] as typeof courses }
    group.variants.add(raw)
    // Görünen ad olarak düzgün yazılmış varyantı (büyük harf içeren) tercih et.
    if (/[A-ZÇĞİÖŞÜ]/.test(raw) && !/[A-ZÇĞİÖŞÜ]/.test(group.label)) group.label = raw
    group.items.push(course)
    byCategory.set(key, group)
  }

  console.log(`Yayındaki kurs sayısı: ${courses.length}`)
  console.log(`Kategori sayısı: ${byCategory.size}`)
  console.log('Kategori dağılımı:')
  for (const [, group] of byCategory) {
    const merged = group.variants.size > 1 ? `  ← birleştirildi: ${[...group.variants].join(' + ')}` : ''
    console.log(`  ${group.label.padEnd(42)} ${String(group.items.length).padStart(2)}${merged}`)
  }

  const exportedTotal = [...byCategory.values()].reduce((sum, group) => sum + group.items.length, 0)
  if (exportedTotal !== courses.length) {
    throw new Error(`Sayım tutmuyor: ${courses.length} kurs okundu, ${exportedTotal} kurs gruplandı.`)
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: dosya yazılmadı.')
    return
  }

  await mkdir(OUT_DIR, { recursive: true })

  const written: string[] = []
  const summaryLines: string[] = [
    '# Yayındaki Kurslar — Özet',
    '',
    `Toplam kurs: **${courses.length}**`,
    `Dışa aktarma: ${new Date().toISOString()}`,
    ''
  ]

  for (const [slug, group] of byCategory) {
    const { label, items: list } = group
    const fileName = `${slug}.md`
    const lines: string[] = [
      `# ${label}`,
      '',
      `Bu dosya "${label}" kategorisindeki **${list.length}** yayınlanmış kursu içerir.`,
      ''
    ]
    if (group.variants.size > 1) {
      lines.push(
        `> Not: Veritabanında bu kategori şu farklı yazımlarla kayıtlı: ${[...group.variants].map(v => `\`${v}\``).join(', ')}`,
        ''
      )
    }
    lines.push('---', '')

    summaryLines.push(`## ${label} (${list.length})`, '')

    for (const course of list) {
      summaryLines.push(`- ${course.title}`)

      lines.push(`## ${course.title}`, '')

      const meta: string[] = []
      if (course.slug) meta.push(`**Slug:** \`${course.slug}\``)
      if (course.level) meta.push(`**Seviye:** ${course.level}`)
      if (course.estimatedMinutes) meta.push(`**Süre:** ~${course.estimatedMinutes} dk`)
      meta.push(`**Ders sayısı:** ${course.lessons.length}`)
      if (meta.length) lines.push(meta.join(' · '), '')

      if (course.description) lines.push(course.description, '')

      const outcomes = parseList(course.outcomes)
      if (outcomes.length) {
        lines.push('**Kazanımlar**', '')
        outcomes.forEach(item => lines.push(`- ${item}`))
        lines.push('')
      }

      for (const lesson of course.lessons) {
        lines.push(`### ${lesson.order}. ${lesson.title}`, '')

        const ko = lesson.knowledgeObject

        // Bilgi nesnesinin yapılandırılmış alanları varsa onları da yaz —
        // NotebookLM'in altın standarda göre yeniden düzenlemesi için
        // ham metinden daha değerliler.
        if (ko) {
          if (ko.code) lines.push(`*Bilgi nesnesi: \`${ko.code}\`*`, '')
          if (ko.problem) lines.push(`**Problem:** ${ko.problem}`, '')
          if (ko.quickAnswer) lines.push(`**Kısa yanıt:** ${ko.quickAnswer}`, '')
          if (ko.summary) lines.push(`**Özet:** ${ko.summary}`, '')
        }

        if (lesson.content?.trim()) {
          lines.push(lesson.content.trim(), '')
        }

        if (ko) {
          if (ko.warning) lines.push(`> **Uyarı:** ${ko.warning}`, '')
          if (ko.task) lines.push(`**Görev:** ${ko.task}`, '')
          const seeAlso = parseList(ko.seeAlso)
          if (seeAlso.length) lines.push(`**Ayrıca bakınız:** ${seeAlso.join(', ')}`, '')
        }

        lines.push('')
      }

      lines.push('---', '')
    }

    summaryLines.push('')

    const filePath = join(OUT_DIR, fileName)
    if (written.some(entry => entry.startsWith(`${fileName} `))) {
      throw new Error(`Dosya adı çakışması: ${fileName} — üzerine yazma engellendi.`)
    }
    await writeFile(filePath, lines.join('\n'), 'utf8')
    written.push(`${fileName} (${list.length} kurs)`)
  }

  await writeFile(join(OUT_DIR, '00-ozet.md'), summaryLines.join('\n'), 'utf8')

  console.log(`\nYazılan dosyalar (${OUT_DIR}):`)
  written.forEach(item => console.log(`  ${item}`))
  console.log('  00-ozet.md')
}

main()
  .catch(error => { console.error(error); process.exitCode = 1 })
  .finally(async () => prisma.$disconnect())
