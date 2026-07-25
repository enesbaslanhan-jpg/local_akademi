import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const domains = [
  { key: 'finance', label: 'Finansal Yönetim', questions: ['Gelir, gider ve nakit durumumu düzenli olarak izliyorum.', 'Önümüzdeki haftalara ilişkin nakit planım var.', 'Ürün veya hizmetlerimin gerçek maliyetini ve kârlılığını biliyorum.'] },
  { key: 'sales', label: 'Satış ve Müşteri', questions: ['Satış fırsatlarını belirli aşamalarla takip ediyorum.', 'Müşteri ihtiyaçlarını ve kayıp nedenlerini düzenli analiz ediyorum.', 'Satış ve pazarlama sonuçlarını maliyet ve dönüşümle ölçüyorum.'] },
  { key: 'operations', label: 'Operasyon ve Kalite', questions: ['Kritik işlerimizin yazılı ve tekrarlanabilir süreçleri var.', 'Hata, gecikme ve darboğazları veriye dayanarak iyileştiriyoruz.', 'Kalite, hız ve maliyet göstergelerini birlikte takip ediyoruz.'] },
  { key: 'people', label: 'İnsan ve İş Güvenliği', questions: ['Ekipte roller, sorumluluklar ve başarı beklentileri açık.', 'Çalışanların yetkinlik ve gelişim ihtiyaçlarını takip ediyoruz.', 'İş sağlığı ve güvenliği risklerini sistematik biçimde yönetiyoruz.'] },
  { key: 'supply', label: 'Tedarik Zinciri', questions: ['Kritik tedarikçileri performans ve risk açısından değerlendiriyoruz.', 'Stok ve yeniden sipariş kararlarımız ölçülebilir kurallara dayanıyor.', 'Tedarik kesintileri için uygulanabilir alternatif planımız var.'] },
  { key: 'cyber', label: 'Siber Güvenlik ve Veri', questions: ['Cihaz, hesap, yazılım ve kritik veri envanterimiz güncel.', 'Çok faktörlü doğrulama, yedekleme ve erişim kontrolleri uygulanıyor.', 'Siber olay durumunda roller ve müdahale adımları biliniyor.'] },
  { key: 'export', label: 'İhracat Hazırlığı', questions: ['Ürün ve kapasitemizin ihracata uygunluğunu değerlendirdik.', 'Hedef pazarları talep, rekabet, uyum ve riskle karşılaştırdık.', 'Belge, lojistik, ödeme ve gümrük ihtiyaçlarını biliyoruz.'] },
  { key: 'ai', label: 'Yapay Zekâ Hazırlığı', questions: ['Yapay zekâ için ölçülebilir bir iş problemi veya kullanım senaryosu seçtik.', 'Kullanılacak verinin kalite, izin ve gizlilik koşullarını değerlendiriyoruz.', 'AI çıktıları için insan kontrolü, başarı ölçütü ve risk sınırı tanımlı.'] }
] as const

const scaleOptions = [
  { value: '0', label: 'Hiç uygulanmıyor' },
  { value: '1', label: 'Başlangıç aşamasında' },
  { value: '2', label: 'Kısmen uygulanıyor' },
  { value: '3', label: 'Büyük ölçüde uygulanıyor' },
  { value: '4', label: 'Düzenli ölçülüyor ve geliştiriliyor' }
]

export const ASSESSMENT_QUESTIONS = domains.flatMap((domain, domainIndex) =>
  domain.questions.map((title, questionIndex) => ({
    id: `${domain.key}_${questionIndex + 1}`,
    domain: domain.key,
    domainLabel: domain.label,
    step: domainIndex * 3 + questionIndex,
    title,
    subtitle: `${domain.label} — mevcut işletme uygulamanızı değerlendirin.`,
    type: 'single',
    options: scaleOptions
  }))
)

const answerIds = new Set<string>(ASSESSMENT_QUESTIONS.map(question => question.id))
const submitSchema = z.object({
  answers: z.record(z.string().regex(/^[0-4]$/)),
  version: z.number().int().positive().default(1)
}).superRefine((data, ctx) => {
  const keys = Object.keys(data.answers)
  const missing = [...answerIds].filter(id => !(id in data.answers))
  const unknown = keys.filter(id => !answerIds.has(id))
  if (missing.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['answers'], message: `Eksik cevaplar: ${missing.join(', ')}` })
  if (unknown.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['answers'], message: `Bilinmeyen sorular: ${unknown.join(', ')}` })
})

export function calculateScores(answers: Record<string, string>) {
  const scores: Record<string, number> = {}
  for (const domain of domains) {
    const values = [1, 2, 3].map(index => Number(answers[`${domain.key}_${index}`]))
    scores[domain.key] = Math.round((values.reduce((sum, value) => sum + value, 0) / 12) * 100)
  }
  return scores
}

function getPriorityDomains(scores: Record<string, number>) {
  return Object.entries(scores).sort(([, a], [, b]) => a - b).slice(0, 3).map(([key]) => key)
}

function generateRecommendations(scores: Record<string, number>) {
  const labels = new Map<string, string>(domains.map(domain => [domain.key, domain.label]))
  return getPriorityDomains(scores).map(key => `${labels.get(key)} puanınız ${scores[key]}/100. Önce bu alandaki başlangıç seviyesi içeriği ve uygulama görevini tamamlayın; ardından değerlendirmeyi yenileyin.`)
}

export async function assessmentRoutes(fastify: FastifyInstance, opts?: { prisma?: PrismaClient }) {
  const prisma = opts?.prisma || new PrismaClient()

  fastify.get('/assessment/questions', { preHandler: [fastify.authenticate] }, async () => ({
    questions: ASSESSMENT_QUESTIONS, totalSteps: ASSESSMENT_QUESTIONS.length,
    scale: { min: 0, max: 100, explanation: 'Her alandaki üç yanıt eşit ağırlıkla 0–100 puana dönüştürülür.' }
  }))

  fastify.post('/assessment/submit', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number }
    const parsed = submitSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const scores = calculateScores(parsed.data.answers)
    const priorityDomains = getPriorityDomains(scores)
    const recommendations = generateRecommendations(scores)
    const existing = await prisma.businessAssessment.findFirst({ where: { userId: user.id }, orderBy: { version: 'desc' } })
    const assessment = await prisma.businessAssessment.create({ data: {
      userId: user.id, version: (existing?.version ?? 0) + 1, answers: JSON.stringify(parsed.data.answers),
      scores: JSON.stringify(scores), priorityDomains: JSON.stringify(priorityDomains), recommendations: JSON.stringify(recommendations)
    } })
    return { id: assessment.id, version: assessment.version, scores, priorityDomains, recommendations, createdAt: assessment.createdAt,
      explanation: 'Düşük puanlar gelişim önceliğini gösterir; her alan üç eşit ağırlıklı sorudan hesaplanır.' }
  })

  fastify.get('/assessment/results', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number }
    const assessment = await prisma.businessAssessment.findFirst({ where: { userId: user.id }, orderBy: { version: 'desc' } })
    if (!assessment) return reply.status(404).send({ error: 'No assessment found' })
    return { id: assessment.id, version: assessment.version, answers: JSON.parse(assessment.answers), scores: JSON.parse(assessment.scores),
      priorityDomains: JSON.parse(assessment.priorityDomains), recommendations: JSON.parse(assessment.recommendations), createdAt: assessment.createdAt }
  })

  fastify.get('/assessment/status', { preHandler: [fastify.authenticate] }, async request => {
    const user = request.user as { id: number }
    const assessment = await prisma.businessAssessment.findFirst({ where: { userId: user.id }, orderBy: { version: 'desc' } })
    return { completed: !!assessment, version: assessment?.version ?? 0, hasResults: !!assessment }
  })

  fastify.get('/assessment/history', { preHandler: [fastify.authenticate] }, async request => {
    const user = request.user as { id: number }
    const items = await prisma.businessAssessment.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 })
    return { results: items.map(item => ({ id: item.id, version: item.version, scores: JSON.parse(item.scores), priorityDomains: JSON.parse(item.priorityDomains), createdAt: item.createdAt })) }
  })

  fastify.post('/assessment/restart', { preHandler: [fastify.authenticate] }, async request => {
    const user = request.user as { id: number }
    const existing = await prisma.businessAssessment.findFirst({ where: { userId: user.id }, orderBy: { version: 'desc' } })
    return { nextVersion: (existing?.version ?? 0) + 1, message: 'Yeni değerlendirme başlatılabilir.' }
  })
}
