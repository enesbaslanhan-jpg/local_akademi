import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const DIG_SOURCES = [
  { title: 'TÜBİTAK - Dijital Olgunluk Değerlendirme Raporu', url: 'https://www.tubitak.gov.tr/dijital-olgunluk', authorityLevel: 'high' },
  { title: 'Sanayi ve Teknoloji Bakanlığı - Dijital Dönüşüm Stratejisi', url: 'https://www.sanayi.gov.tr/dijital-donusum', authorityLevel: 'high' },
  { title: 'KOSGEB - Dijital Dönüşüm Destek Programları', url: 'https://www.kosgeb.gov.tr/dijital-donusum', authorityLevel: 'high' },
  { title: 'ISO - Dijital Araç Seçim Kılavuzu', url: 'https://www.iso.org/dijital-araclar', authorityLevel: 'medium' },
  { title: 'TÜBİTAK BİLGEM - Veri Yönetişim Rehberi', url: 'https://bilgem.tubitak.gov.tr/veri-yonetisim', authorityLevel: 'high' },
  { title: 'Türkiye Cumhuriyeti Cumhurbaşkanlığı Dijital Dönüşüm Ofisi', url: 'https://cbddo.gov.tr/', authorityLevel: 'high' },
  { title: 'ENISA - Siber Güvenlik Rehberi', url: 'https://www.enisa.europa.eu/siber-guvenlik', authorityLevel: 'high' },
  { title: 'ISO/IEC 27001 Bilgi Güvenliği Yönetim Sistemi Standardı', url: 'https://www.iso.org/isoiec-27001', authorityLevel: 'high' },
  { title: 'Avrupa Komisyonu - Yapay Zeka Etik Rehberi', url: 'https://ec.europa.eu/ai-ethics', authorityLevel: 'high' },
  { title: 'OECD - Yapay Zeka ve KOBİ Rehberi', url: 'https://www.oecd.org/ai-smes', authorityLevel: 'high' },
]

async function main() {
  // 1. Update existing categories with proper slugs
  const existingCats = await p.category.findMany()
  for (const cat of existingCats) {
    if (!cat.slug) {
      const slug = cat.name.toLowerCase().replace(/[^a-z0-9çşğıüö-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      await p.category.update({ where: { id: cat.id }, data: { slug } })
      console.log(`Updated category '${cat.name}' -> slug: ${slug}`)
    }
  }

  // 2. Create DIG category idempotently
  const existingDig = await p.category.findFirst({ where: { name: 'Dijitalleşme ve Teknoloji' } })
  if (!existingDig) {
    await p.category.create({
      data: {
        name: 'Dijitalleşme ve Teknoloji',
        slug: 'dijitallesme-teknoloji',
        description: 'Dijital dönüşüm, araç seçimi, veri yönetişimi, siber güvenlik ve yapay zeka konularını kapsar'
      }
    })
    console.log('Created category: Dijitalleşme ve Teknoloji')
  } else {
    console.log('Category already exists: Dijitalleşme ve Teknoloji')
  }

  // 3. Create DIG sources idempotently (by URL)
  let created = 0
  let skipped = 0
  for (const src of DIG_SOURCES) {
    const existing = await p.source.findFirst({ where: { url: src.url } })
    if (!existing) {
      await p.source.create({
        data: {
          title: src.title,
          url: src.url,
          authorityLevel: src.authorityLevel,
          lastChecked: new Date()
        }
      })
      created++
    } else {
      skipped++
    }
  }
  console.log(`Sources: ${created} created, ${skipped} skipped`)

  // 4. Report
  const allSources = await p.source.findMany()
  const totalSources = allSources.length
  const emptyUrl = allSources.filter(s => !s.url).length
  const dupUrl = allSources.filter(s => s.url).length - new Set(allSources.filter(s => s.url).map(s => s.url)).size
  const authDist: Record<string, number> = {}
  for (const s of allSources) {
    authDist[s.authorityLevel] = (authDist[s.authorityLevel] || 0) + 1
  }

  console.log('\n=== SOURCE REGISTRY REPORT ===')
  console.log(`Total sources: ${totalSources}`)
  console.log(`Empty URL: ${emptyUrl}`)
  console.log(`Duplicate URLs: ${dupUrl}`)
  console.log(`Authority level distribution:`, authDist)
  console.log('=== DONE ===')

  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
