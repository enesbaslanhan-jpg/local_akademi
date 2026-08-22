import { prisma } from '../lib/prisma.js'

export interface CourseCategoryInfo {
  category: string
  count: number
}

export interface FinancialModelInfo {
  code: string
  name: string
  category: string
  purpose: string
}

export interface DecisionCheckInfo {
  code: string
  title: string
  category: string | null
}

export interface PracticalCardInfo {
  code: string
  title: string
  type: string
  category: string | null
}

export interface ProductCatalog {
  courseCategories: CourseCategoryInfo[]
  financialModels: FinancialModelInfo[]
  decisionChecks: DecisionCheckInfo[]
  practicalCards: PracticalCardInfo[]
  sections: ProductSection[]
  generatedAt: Date
}

export interface ProductSection {
  key: string
  title: string
  description: string
}

let cachedCatalog: ProductCatalog | null = null
let catalogPromise: Promise<ProductCatalog> | null = null

export async function generateProductCatalog(): Promise<ProductCatalog> {
  const [courseCategories, financialModels, decisionChecks, practicalCards] = await Promise.all([
    prisma.course.groupBy({
      by: ['category'],
      where: { published: true, archivedAt: null },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    }),
    prisma.financialModel.findMany({
      where: { status: 'active' },
      select: { code: true, name: true, category: true, purpose: true },
      orderBy: { category: 'asc' },
    }),
    prisma.decisionCheck.findMany({
      where: { published: true, deletedAt: null },
      select: { code: true, title: true, category: true },
      orderBy: { title: 'asc' },
    }),
    prisma.practicalCard.findMany({
      where: { published: true },
      select: { code: true, title: true, type: true, category: true },
      orderBy: { title: 'asc' },
    }),
  ])

  const sections: ProductSection[] = [
    {
      key: 'courses',
      title: 'Kurslar',
      description: 'Farklı seviyelerde işletme, finans, pazarlama ve girişimcilik kursları. İlerleme takibi ve sertifika ile.',
    },
    {
      key: 'decision_tools',
      title: 'Karar Araçları',
      description: 'Fiyatlandırma, karlılık, kiralama vs. satın alma gibi iş kararları için adım adım kontrol listeleri ve hesaplamalar.',
    },
    {
      key: 'calculations',
      title: 'Hesaplamalar',
      description: 'Brüt kâr marjı, başabaş nokta, nakit akışı, ROI gibi finansal modellerle anlık hesaplama ve yorumlama.',
    },
    {
      key: 'business_tracking',
      title: 'İşletme Takibi',
      description: 'İşletme profili, satış/gider kayıtları, maliyet takibi ve karar günlüğü ile işletme verilerinizin merkezi.',
    },
    {
      key: 'community',
      title: 'Topluluk',
      description: 'Diğer girişimcilerin soruları, deneyimleri ve mentor yanıtları. Paylaşımlı bilgi havuzu.',
    },
    {
      key: 'news',
      title: 'Haberler',
      description: 'Resmi kaynaklardan (GİB, SGK, Resmi Gazete vb.) gelen güncel vergi, mevzuat ve destek haberleri.',
    },
  ]

  return {
    courseCategories: courseCategories.map(c => ({ category: c.category, count: c._count.category })),
    financialModels: financialModels.map(fm => ({
      code: fm.code,
      name: fm.name,
      category: fm.category,
      purpose: fm.purpose,
    })),
    decisionChecks: decisionChecks.map(dc => ({
      code: dc.code,
      title: dc.title,
      category: dc.category,
    })),
    practicalCards: practicalCards.map(pc => ({
      code: pc.code,
      title: pc.title,
      type: pc.type,
      category: pc.category,
    })),
    sections,
    generatedAt: new Date(),
  }
}

export async function getProductCatalog(): Promise<ProductCatalog> {
  if (cachedCatalog) return cachedCatalog

  if (!catalogPromise) {
    catalogPromise = generateProductCatalog().then(catalog => {
      cachedCatalog = catalog
      return catalog
    })
  }

  return catalogPromise
}

export function invalidateProductCatalog(): void {
  cachedCatalog = null
  catalogPromise = null
}

export function formatCatalogForPrompt(catalog: ProductCatalog): string {
  const lines: string[] = ['=== ÜRÜN KATALOĞU (LocalKarar) ===']

  lines.push('\n--- BÖLÜMLER ---')
  for (const section of catalog.sections) {
    lines.push(`${section.key}: ${section.title} — ${section.description}`)
  }

  lines.push('\n--- KURS KATEGORİLERİ ---')
  for (const cat of catalog.courseCategories) {
    lines.push(`- ${cat.category}: ${cat.count} kurs`)
  }

  lines.push('\n--- FİNANSAL MODELLER (24 adet) ---')
  for (const fm of catalog.financialModels) {
    lines.push(`- ${fm.code}: ${fm.name} [${fm.category}] — ${fm.purpose}`)
  }

  lines.push('\n--- KARAR KONTROLLERİ (13 adet) ---')
  for (const dc of catalog.decisionChecks) {
    lines.push(`- ${dc.code}: ${dc.title}${dc.category ? ` [${dc.category}]` : ''}`)
  }

  lines.push('\n--- PRATİK KARTLAR (86 adet) ---')
  for (const pc of catalog.practicalCards) {
    lines.push(`- ${pc.code}: ${pc.title} (${pc.type})${pc.category ? ` [${pc.category}]` : ''}`)
  }

  lines.push('\n=== KATALOG SONU ===')
  return lines.join('\n')
}

export function getCatalogSummary(catalog: ProductCatalog): string {
  return `LocalKarar platformunda: ${catalog.courseCategories.reduce((s, c) => s + c.count, 0)} kurs (${catalog.courseCategories.length} kategori), ${catalog.financialModels.length} finansal model, ${catalog.decisionChecks.length} karar kontrolü, ${catalog.practicalCards.length} pratik kart. Bölümler: ${catalog.sections.map(s => s.title).join(', ')}.`
}