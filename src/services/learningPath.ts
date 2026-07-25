import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import manifest from '../../content/learning-pilot-v1.json'

const PILOT_CATEGORIES = [
  'Temel Finans', 'Maliyet ve Fiyatlandırma', 'E-Ticaret',
  'Girişimcilik', 'Dijital Ekonomi', 'Finansman ve Yatırım'
]

interface PilotKoStep {
  koId: number
  code: string
  title: string
}

interface PilotPathStep {
  step: number
  category: string
  title: string
  description: string
  kos: PilotKoStep[]
  estimatedDays: number
  status: string
}

function buildPilotPathData(): PilotPathStep[] {
  const m = manifest as any
  const entries = m.kos as Array<{ koId: number; code: string; title: string; category: string }>

  const byCategory: Record<string, PilotKoStep[]> = {}
  for (const cat of PILOT_CATEGORIES) byCategory[cat] = []

  for (const e of entries) {
    const cat = PILOT_CATEGORIES.includes(e.category) ? e.category : PILOT_CATEGORIES[0]
    byCategory[cat].push({ koId: e.koId, code: e.code, title: e.title })
  }

  return PILOT_CATEGORIES.filter(c => byCategory[c].length > 0).map((cat, idx) => ({
    step: idx + 1,
    category: cat,
    title: cat,
    description: `${byCategory[cat].length} konu ile ${cat.toLowerCase()} alanında temel bilgileri öğrenin.`,
    kos: byCategory[cat],
    estimatedDays: byCategory[cat].length * 2,
    status: 'pending',
  }))
}

export async function learningPathRoutes(fastify: FastifyInstance) {
  fastify.get('/current', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const user = request.user
    const learningPath = await prisma.learningPath.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    if (!learningPath) {
      return { learningPath: null }
    }
    return { learningPath }
  })

  fastify.post('/generate', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    const { title, pathData } = request.body as {
      title: string
      pathData: string
    }

    const learningPath = await prisma.learningPath.create({
      data: {
        userId: user.id,
        title,
        pathData
      }
    })
    return reply.status(201).send({ learningPath })
  })

  fastify.put('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }
    const { title, pathData } = request.body as {
      title?: string
      pathData?: string
    }

    const existing = await prisma.learningPath.findUnique({
      where: { id: parseInt(id) }
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Learning path not found' })
    }
    if (existing.userId !== user.id) {
      return reply.status(403).send({ error: 'Not your learning path' })
    }

    const updated = await prisma.learningPath.update({
      where: { id: parseInt(id) },
      data: { title, pathData }
    })
    return { learningPath: updated }
  })

  fastify.delete('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }

    const existing = await prisma.learningPath.findUnique({
      where: { id: parseInt(id) }
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Learning path not found' })
    }
    if (existing.userId !== user.id) {
      return reply.status(403).send({ error: 'Not your learning path' })
    }

    await prisma.learningPath.delete({ where: { id: parseInt(id) } })
    return reply.status(204).send()
  })

  fastify.post('/generate-personalized', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    const { title } = request.body as { title?: string }

    const [profile, assessment] = await Promise.all([
      prisma.businessProfile.findUnique({ where: { userId: user.id } }),
      prisma.businessAssessment.findFirst({
        where: { userId: user.id },
        orderBy: { version: 'desc' }
      })
    ])

    const priorityDomains: string[] = assessment
      ? JSON.parse(assessment.priorityDomains)
      : []

    const kos = await prisma.knowledgeObject.findMany({
      where: { status: 'published', isDemo: false },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const domainKeywords: Record<string, string[]> = {
      finance: ['finans', 'muhasebe', 'bütçe', 'nakit', 'gelir', 'gider', 'vergi'],
      marketing: ['pazarlama', 'satış', 'müşteri', 'sosyal medya', 'reklam', 'marka'],
      digital: ['dijital', 'e-ticaret', 'web', 'yazılım', 'otomasyon'],
      hr: ['insan kaynakları', 'işe alım', 'performans', 'ekip', 'yetenek'],
      operations: ['operasyon', 'süreç', 'tedarik', 'lojistik', 'üretim'],
      legal: ['hukuk', 'mevzuat', 'sözleşme', 'şirket kuruluş'],
      strategy: ['strateji', 'büyüme', 'iş planı', 'vizyon'],
      product: ['ürün', 'geliştirme', 'inovasyon', 'tasarım']
    }

    const domainCategories: Record<string, string[]> = {
      finance: ['Finans'],
      marketing: ['Pazarlama'],
      digital: ['Dijital', 'Teknoloji'],
      hr: ['İnsan Kaynakları'],
      operations: ['Operasyon'],
      legal: ['Hukuk'],
      strategy: ['Strateji', 'Yönetim'],
      product: ['Ürün']
    }

    const matchedKOs: Record<string, typeof kos> = {}
    const domainsToUse = priorityDomains.length > 0 ? priorityDomains : ['finance', 'marketing', 'digital']
    const domainTitles: Record<string, string> = {
      finance: 'Finansal Yönetim',
      marketing: 'Pazarlama & Satış',
      digital: 'Dijital Dönüşüm',
      hr: 'İnsan Kaynakları',
      operations: 'Operasyon Yönetimi',
      legal: 'Hukuk & Mevzuat',
      strategy: 'Strateji & Yönetim',
      product: 'Ürün Geliştirme'
    }

    for (const domain of domainsToUse) {
      const cats = domainCategories[domain] || []
      matchedKOs[domain] = kos.filter(ko => {
        if (ko.category && cats.includes(ko.category.name)) return true
        const meta = JSON.parse(ko.metadata || '{}')
        const content = (ko.title + ' ' + (meta.summary || '')).toLowerCase()
        const keywords = domainKeywords[domain] || []
        return keywords.some(kw => content.includes(kw))
      })
    }

    let step = 1
    const pathSteps: any[] = []
    for (const domain of domainsToUse) {
      const domainKOs = matchedKOs[domain] || []
      if (domainKOs.length === 0) continue

      const koCodes = domainKOs.slice(0, 3).map(ko => ko.code)
      pathSteps.push({
        step: step++,
        domain,
        title: domainTitles[domain] || domain,
        description: `${domainKOs.length} içerik bulundu. Temel kavramları öğrenerek başlayın.`,
        koCodes,
        estimatedDays: domainKOs.length * 2,
        status: 'pending'
      })
    }

    if (pathSteps.length === 0) {
      pathSteps.push({
        step: 1,
        domain: 'general',
        title: 'Genel Girişimcilik',
        description: 'Henüz değerlendirme yapılmamış. Genel içeriklerle başlayın.',
        koCodes: kos.slice(0, 3).map(ko => ko.code),
        estimatedDays: 7,
        status: 'pending'
      })
    }

    const planTitle = title || `Kişisel Öğrenme Planı (${new Date().toLocaleDateString('tr-TR')})`

    const learningPath = await prisma.learningPath.create({
      data: {
        userId: user.id,
        title: planTitle,
        pathData: JSON.stringify(pathSteps)
      }
    })

    await prisma.activityEvent.create({
      data: {
        userId: user.id,
        eventType: 'learning_path_generated',
        title: 'Öğrenme planı oluşturuldu',
        detail: JSON.stringify({ pathId: learningPath.id, steps: pathSteps.length, domains: domainsToUse })
      }
    }).catch(() => {})

    return reply.status(201).send({ learningPath, steps: pathSteps })
  })

  fastify.post('/generate-pilot', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    const { title } = request.body as { title?: string }

    const steps = buildPilotPathData()
    const planTitle = title || `Pilot Öğrenme Programı (${PILOT_CATEGORIES.length} kategori)`

    const learningPath = await prisma.learningPath.create({
      data: {
        userId: user.id,
        title: planTitle,
        pathData: JSON.stringify(steps),
      }
    })

    return reply.status(201).send({ learningPath, steps })
  })

  fastify.get('/:id/progress', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    const { id } = request.params as { id: string }

    const lp = await prisma.learningPath.findUnique({ where: { id: parseInt(id) } })
    if (!lp) return reply.status(404).send({ error: 'Learning path not found' })
    if (lp.userId !== user.id) return reply.status(403).send({ error: 'Not your learning path' })

    const steps: PilotPathStep[] = JSON.parse(lp.pathData)
    const allKoIds = steps.flatMap(s => s.kos.map(k => k.koId))

    const [flashcardProgress, knowledgeProgress, quizAttempts, flashcardReviews] = await Promise.all([
      prisma.flashcardProgress.findMany({ where: { userId: user.id, koId: { in: allKoIds } } }),
      prisma.knowledgeProgress.findMany({ where: { userId: user.id, koId: { in: allKoIds } } }),
      prisma.quizAttempt.findMany({ where: { userId: user.id, koId: { in: allKoIds } }, select: { koId: true, passed: true } }),
      prisma.flashcardReview.findMany({
        where: { userId: user.id, flashcard: { koId: { in: allKoIds } } },
        select: { flashcard: { select: { koId: true } }, rating: true, repetition: true },
      }),
    ])

    const fcProgMap = new Map(flashcardProgress.map(p => [p.koId, p]))
    const koProgMap = new Map(knowledgeProgress.map(p => [p.koId, p]))

    const quizPassed = new Set(quizAttempts.filter(a => a.passed).map(a => a.koId))
    const fcMastered = new Map<number, number>()
    for (const r of flashcardReviews) {
      const koId = r.flashcard.koId
      fcMastered.set(koId, (fcMastered.get(koId) || 0) + (r.rating === 'good' || r.rating === 'easy' ? 1 : 0))
    }

    const enrichedSteps = steps.map(s => {
      let totalProgress = 0
      let totalItems = 0
      const enrichedKos = s.kos.map(k => {
        const fcp = fcProgMap.get(k.koId)
        const kp = koProgMap.get(k.koId)
        const quizDone = quizPassed.has(k.koId)
        const fcMasteredCount = fcMastered.get(k.koId) || 0

        const koProgress = kp?.progressPercent || 0
        const fcPercent = fcp?.percent || 0
        const stepKoProgress = Math.round(Math.max(koProgress, quizDone ? 100 : 0, fcPercent))
        totalProgress += stepKoProgress
        totalItems++

        return { ...k, progress: stepKoProgress, quizPassed: quizDone, fcMasteredCount }
      })

      const avgProgress = totalItems > 0 ? Math.round(totalProgress / totalItems) : 0
      const stepStatus = avgProgress >= 100 ? 'completed' : avgProgress > 0 ? 'in_progress' : 'pending'

      return { ...s, kos: enrichedKos, progress: avgProgress, status: stepStatus }
    })

    const overallProgress = enrichedSteps.length > 0
      ? Math.round(enrichedSteps.reduce((a, s) => a + (s.progress || 0), 0) / enrichedSteps.length)
      : 0

    return reply.send({
      id: lp.id,
      title: lp.title,
      createdAt: lp.createdAt,
      overallProgress,
      steps: enrichedSteps
    })
  })
}