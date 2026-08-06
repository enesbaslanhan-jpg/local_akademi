import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Bilgi Nesneleri (Knowledge Objects) listeleme sayfasının doğru görünmesi için
// eksik kalan iki ilişkisel alanı tamamlar:
// 1. categoryId — KnowledgeObject.category ilişkisi (Course.category'den AYRI bir sistem).
// 2. KnowledgeObjectSource kayıtları — "N kaynak" sayacının doğru görünmesi için.
// Ayrıca meta.duration alanını (dakika sayacı için okunan gerçek alan) ekler.
// Kullanıcı bildirimi üzerine 2026-08-06'da eklendi.

const CATEGORY_NAME = 'İşi Satın Alma ve Yatırım Değerlendirmesi'
const CATEGORY_SLUG = 'isi-satin-alma-yatirim'

const KO_SOURCES: Record<string, { title: string; url: string }[]> = {
  'CUR-121-01': [
    { title: 'SCORE — Buying a Business: Due Diligence Checklist', url: 'https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist' },
    { title: 'FindLaw — Buying a Business Due Diligence Checklist', url: 'https://www.findlaw.com/smallbusiness/starting-a-business/buying-a-business-due-diligence-checklist.html' }
  ],
  'CUR-121-02': [
    { title: 'mevzuat.gov.tr — 6098 sayılı Türk Borçlar Kanunu (m.202, m.323)', url: 'https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6098.pdf' },
    { title: 'mevzuat.gov.tr — 4857 sayılı İş Kanunu (m.6)', url: 'https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4857.pdf' },
    { title: 'mevzuat.gov.tr — 5510 sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu (m.89)', url: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.5.5510.pdf' },
    { title: 'mevzuat.gov.tr — 6183 sayılı Amme Alacaklarının Tahsil Usulü Hakkında Kanun (m.35)', url: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.3.6183.pdf' }
  ],
  'CUR-121-03': [
    { title: 'Peak Business Valuation — SBA Business Valuation Methods', url: 'https://peakbusinessvaluation.com/sba-business-valuation-methods/' },
    { title: 'SCORE — Buying a Business: Due Diligence Checklist', url: 'https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist' }
  ],
  'CUR-121-04': [
    { title: 'SCORE — Buying a Business: Due Diligence Checklist', url: 'https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist' },
    { title: 'ticaret.gov.tr — Esnaf ve Sanatkârlar', url: 'https://ticaret.gov.tr/esnaf-sanatkarlar' }
  ],
  'CUR-122-01': [
    { title: 'mevzuat.gov.tr — 6098 sayılı Türk Borçlar Kanunu (m.202, m.323)', url: 'https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6098.pdf' },
    { title: 'TOBB — Türkiye Ticaret Sicili Gazetesi Müdürlüğü', url: 'https://www.tobb.org.tr/Documents/ttk/ttk_tescil_ilan_maddeler.pdf' }
  ],
  'CUR-122-02': [
    { title: 'Rekabet Kurumu — Dikey Anlaşmalara İlişkin Kılavuz', url: 'https://www.rekabet.gov.tr/Dosya/kilavuzlar/dikeykilavuz2018-20180330155908926.pdf' },
    { title: 'Rekabet Kurumu — 2021/4 sayılı Tebliğ değişikliği duyurusu', url: 'https://www.rekabet.gov.tr/tr/Guncel/dikey-anlasmalara-iliskin-grup-muafiyeti-fcb6e3a0a440ec118144005056b1ce21' }
  ],
  'CUR-122-03': [
    { title: 'mevzuat.gov.tr — 6098 sayılı Türk Borçlar Kanunu', url: 'https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6098.pdf' },
    { title: 'TOBB — perakende sektör raporları', url: 'https://www.tobb.org.tr/Documents/ttk/ttk_tescil_ilan_maddeler.pdf' }
  ]
}

async function findOrCreateSource(title: string, url: string) {
  const existing = await prisma.source.findFirst({ where: { url } })
  if (existing) return existing
  return prisma.source.create({
    data: { title, url, authorityLevel: 'high', lastChecked: new Date('2026-08-06') }
  })
}

async function main() {
  let category = await prisma.category.findUnique({ where: { slug: CATEGORY_SLUG } })
  if (!category) {
    category = await prisma.category.create({ data: { name: CATEGORY_NAME, slug: CATEGORY_SLUG, isActive: true } })
    console.log(`✅ Kategori oluşturuldu: ${category.name} (id=${category.id})`)
  } else {
    console.log(`ℹ️ Kategori zaten var: ${category.name} (id=${category.id})`)
  }

  for (const [code, sources] of Object.entries(KO_SOURCES)) {
    const ko = await prisma.knowledgeObject.findUnique({ where: { code } })
    if (!ko) { console.warn(`⚠️ KO bulunamadı: ${code}`); continue }

    const meta = JSON.parse(ko.metadata || '{}')
    const minutes = meta.estimatedMinutes || 15
    meta.duration = String(minutes)

    await prisma.knowledgeObject.update({
      where: { id: ko.id },
      data: { categoryId: category.id, metadata: JSON.stringify(meta) }
    })

    // Var olan kaynak bağlantılarını temizleyip yeniden kur (idempotent)
    await prisma.knowledgeObjectSource.deleteMany({ where: { koId: ko.id } })
    let order = 0
    for (const s of sources) {
      const source = await findOrCreateSource(s.title, s.url)
      await prisma.knowledgeObjectSource.create({
        data: { koId: ko.id, sourceId: source.id, relation: 'references', note: String(order++) }
      })
    }
    console.log(`✅ ${code} güncellendi: categoryId=${category.id}, duration=${meta.duration}dk, ${sources.length} kaynak bağlandı`)
  }

  console.log('✅ Düzeltme tamamlandı.')
}

main()
  .catch((e) => { console.error('❌ HATA:', e); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
