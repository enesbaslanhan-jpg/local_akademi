import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const turkishMap: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u'
}

function slugify(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, char => turkishMap[char])
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } })
  const used = new Set(categories.flatMap(category => category.slug ? [category.slug] : []))

  for (const category of categories) {
    if (category.slug) continue
    const base = slugify(category.name) || `kategori-${category.id}`
    let slug = base
    if (used.has(slug)) slug = `${base}-${category.id}`
    used.add(slug)
    await prisma.category.update({ where: { id: category.id }, data: { slug } })
  }

  console.log(`${categories.length} kategori kontrol edildi; eksik slug alanları dolduruldu.`)
}

main()
  .catch(error => {
    console.error('Category slug backfill başarısız:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
