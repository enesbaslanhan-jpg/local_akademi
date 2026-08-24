import { prisma } from '../lib/prisma.js'
import { trackerOzetiHesapla } from './business-tracker.js'

import { z } from 'zod'

export type ContextType = 'general' | 'page' | 'knowledge_object' | 'practical_card' | 'decision_check' | 'decision_check_result' | 'learning_progress' | 'feed_recommendation' | 'financial_tool' | 'workspace_tracker'
export type ContextSource = 'direct' | 'feed' | 'content_detail' | 'decision_result' | 'progress' | 'dashboard'

const VALID_CONTEXT_TYPES: ContextType[] = [
  'general', 'page', 'knowledge_object', 'practical_card', 'decision_check', 
  'decision_check_result', 'learning_progress', 'feed_recommendation', 'financial_tool',
  'workspace_tracker'
]

const VALID_CONTEXT_SOURCES: ContextSource[] = [
  'direct', 'feed', 'content_detail', 'decision_result', 'progress', 'dashboard'
]

export const MentorContextSchema = z.object({
  contextType: z.enum(VALID_CONTEXT_TYPES as [string, ...string[]]).optional(),
  source: z.enum(VALID_CONTEXT_SOURCES as [string, ...string[]]).optional(),
  entityType: z.string().max(100).optional(),
  entityId: z.string().max(100).optional(),
  entityCode: z.string().max(100).optional(),
  route: z.string().max(200).optional(),
  title: z.string().max(200).optional(),
  selectedSection: z.string().max(100).optional(),
  decisionCheckResultId: z.string().max(100).optional(),
  practicalCardCode: z.string().max(100).optional(),
  knowledgeObjectCode: z.string().max(100).optional(),
  feedItemKey: z.string().max(100).optional(),
  learningProgressStatus: z.string().max(50).optional(),
  intentHint: z.string().max(100).optional(),
  createdAt: z.string().optional()
}).strict()

export type MentorContextEnvelope = z.infer<typeof MentorContextSchema>

export interface ResolvedMentorContext {
  valid: boolean
  contextDisplay?: string
  systemPromptAdditions?: string
  error?: string
  starterPrompts?: string[]
}

export async function resolveContext(
  rawEnvelope: any,
  userId: number
): Promise<ResolvedMentorContext> {
  if (!rawEnvelope) return { valid: true }

  const parseResult = MentorContextSchema.safeParse(rawEnvelope)
  if (!parseResult.success) {
    return { valid: false, error: 'Invalid context schema' }
  }

  const envelope = parseResult.data

  // Handle various contexts
  switch (envelope.contextType) {
    case 'knowledge_object':
      return resolveKnowledgeObjectContext(envelope)
    case 'practical_card':
      return resolvePracticalCardContext(envelope)
    case 'decision_check_result':
      return resolveDecisionCheckResultContext(envelope, userId)
    case 'learning_progress':
      return resolveLearningProgressContext(envelope, userId)
    case 'feed_recommendation':
      return resolveFeedContext(envelope, userId)
    case 'workspace_tracker':
      return resolveWorkspaceTrackerContext(envelope, userId)
    default:
      return { valid: true } // Treat unknown as valid but empty system additions (fallback to general)
  }
}

async function resolveKnowledgeObjectContext(envelope: MentorContextEnvelope): Promise<ResolvedMentorContext> {
  const code = envelope.knowledgeObjectCode || envelope.entityCode
  if (!code) return { valid: false, error: 'Knowledge object code is missing' }

  const ko = await prisma.knowledgeObject.findFirst({
    where: { code, status: 'published', isDemo: false },
    select: { title: true, summary: true, category: { select: { name: true } } }
  })

  if (!ko) return { valid: false, error: 'Knowledge object not found or not published' }

  const sectionText = envelope.selectedSection ? `\nAktif Bölüm: ${envelope.selectedSection}` : ''
  const systemPromptAdditions = `[AÇIK İÇERİK BAĞLAMI]\nKullanıcı şu anda "${ko.title}" başlıklı içeriği (Kategori: ${ko.category?.name || 'Genel'}) görüntülüyor.${sectionText}\nİçerik Özeti: ${ko.summary || 'Özet yok.'}`

  return {
    valid: true,
    contextDisplay: ko.title,
    systemPromptAdditions,
    starterPrompts: [
      'Bu konuyu işletmeme nasıl uygularım?',
      'En önemli noktaları özetle.',
      'Bir kontrol listesi oluştur.'
    ]
  }
}

async function resolvePracticalCardContext(envelope: MentorContextEnvelope): Promise<ResolvedMentorContext> {
  const code = envelope.practicalCardCode || envelope.entityCode
  if (!code) return { valid: false, error: 'Practical card code is missing' }

  const card = await prisma.practicalCard.findUnique({
    where: { code },
    select: { title: true, type: true, shortDescription: true }
  })

  if (!card) return { valid: false, error: 'Practical card not found' }

  const systemPromptAdditions = `[AÇIK PRATİK KART BAĞLAMI]\nKullanıcı "${card.title}" adlı pratik kartı inceliyor (Tür: ${card.type}).\nAçıklama: ${card.shortDescription || 'Yok'}`

  return {
    valid: true,
    contextDisplay: card.title,
    systemPromptAdditions,
    starterPrompts: [
      'Bu formülü örnekle açıkla.',
      'Hangi verileri hazırlamalıyım?',
      'Yaygın hatayı işletmeme göre açıkla.'
    ]
  }
}

async function resolveDecisionCheckResultContext(envelope: MentorContextEnvelope, userId: number): Promise<ResolvedMentorContext> {
  const resultId = envelope.decisionCheckResultId || envelope.entityId
  if (!resultId) return { valid: false, error: 'Result ID is missing' }

  const result = await prisma.decisionCheckResult.findFirst({
    where: { id: resultId, session: { userId } },
    include: { session: { include: { decisionCheck: { select: { title: true } } } } }
  })

  if (!result) return { valid: false, error: 'Result not found or access denied' }

  let scoreText = 'Belirsiz'
  if (result.riskLevel === 'low') scoreText = 'Düşük risk'
  else if (result.riskLevel === 'medium') scoreText = 'Orta risk / dikkat'
  else if (result.riskLevel === 'high' || result.riskLevel === 'critical') scoreText = 'Yüksek / kritik risk'

  const snapshot = result.snapshotJson as any
  const calculation = snapshot?.calculationOutput
  const safeSummary = Array.isArray(calculation?.mentorSummary)
    ? calculation.mentorSummary.slice(0, 8).map((line: unknown) => String(line)).join('\n')
    : calculation ? [
    `Ürün başına katkı: ${Number(calculation.contribution ?? 0).toFixed(2)} TL`,
    `Katkı marjı: %${Number(calculation.contributionMarginPercent ?? 0).toFixed(1)}`,
    calculation.breakEvenPrice == null ? 'Başabaş fiyatı: hesaplanamadı' : `Başabaş fiyatı: ${Number(calculation.breakEvenPrice).toFixed(2)} TL`,
    calculation.discountedScenario
      ? `İndirim sonrası katkı: ${Number(calculation.discountedScenario.contribution ?? 0).toFixed(2)} TL`
      : null,
    ...(Array.isArray(calculation.riskWarnings) ? calculation.riskWarnings.slice(0, 3).map((warning: string) => `Risk: ${warning}`) : []),
    ...(Array.isArray(calculation.safeNextSteps) ? calculation.safeNextSteps.slice(0, 3).map((step: string) => `Güvenli adım: ${step}`) : [])
  ].filter(Boolean).join('\n') : 'Hesaplama özeti bulunmuyor.'

  const systemPromptAdditions = `[KARAR ARACI SONUCU BAĞLAMI]\nKullanıcı "${result.session.decisionCheck.title}" aracını tamamladı.\nDurum: ${result.status}\nRisk özeti: ${scoreText}\n${safeSummary}\nHam kullanıcı girdilerini tahmin etme veya değiştirme. Sonucu açıkla; kesin finansal, vergi ya da muhasebe tavsiyesi verme ve yalnız güvenli sonraki adımları öner.`

  return {
    valid: true,
    contextDisplay: result.session.decisionCheck.title + ' Sonucu',
    systemPromptAdditions,
    starterPrompts: [
      'Bu sonucu neden aldım?',
      'Eksik bilgiler neler?',
      'Sonraki en güvenli adım nedir?'
    ]
  }
}

async function resolveLearningProgressContext(envelope: MentorContextEnvelope, userId: number): Promise<ResolvedMentorContext> {
  const contentCode = envelope.entityCode
  if (!contentCode) return { valid: false, error: 'Content code is missing' }

  const progress = await prisma.learningProgress.findFirst({
    where: { userId, contentCode }
  })

  if (!progress) return { valid: false, error: 'Progress not found' }

  const systemPromptAdditions = `[ÖĞRENME İLERLEMESİ BAĞLAMI]\nKullanıcı "${contentCode}" kodlu içerikte (Tür: ${progress.contentType}).\nDurum: ${progress.status}\nSonraki adım için rehberlik et, tamamlandı bilgisini değiştirme.`

  return {
    valid: true,
    contextDisplay: 'Öğrenme İlerlemesi',
    systemPromptAdditions,
    starterPrompts: [
      'Kaldığım yerden devam etmeme yardım et.',
      'Sonraki öğrenme adımım ne olmalı?',
      'Tamamladığım konuları özetle.'
    ]
  }
}

async function resolveFeedContext(envelope: MentorContextEnvelope, userId: number): Promise<ResolvedMentorContext> {
  const itemKey = envelope.feedItemKey
  if (!itemKey) return { valid: false, error: 'Feed item key missing' }

  const interaction = await prisma.feedInteraction.findFirst({
    where: { userId, itemKey }
  })

  if (!interaction) return { valid: false, error: 'Feed interaction not found or access denied' }

  const [type, code] = itemKey.split(':')
  
  const systemPromptAdditions = `[ÖNERİ BAĞLAMI]\nKullanıcıya Feed üzerinden "${code}" (Tür: ${type}) önerildi.\nNeden önerildiğini açıkla.`

  return {
    valid: true,
    contextDisplay: 'Akış Önerisi',
    systemPromptAdditions,
    starterPrompts: [
      'Bunu işletmeme göre değerlendir',
      'Neden önerildiğini açıkla',
      'Uygulamak için ne yapmalıyım?'
    ]
  }
}

async function resolveWorkspaceTrackerContext(envelope: MentorContextEnvelope, userId: number): Promise<ResolvedMentorContext> {
  const workspaceId = envelope.entityId
  if (!workspaceId) return { valid: false, error: 'Workspace ID is missing' }

  // Verify user has access to this workspace
  const member = await prisma.businessMember.findFirst({
    where: { workspaceId, userId, status: 'active' }
  })
  if (!member) return { valid: false, error: 'Access denied to workspace' }

  /*
   * Özet TEK hesaptan geliyor: `/tracker/summary` ucu da
   * `trackerOzetiHesapla`yı kullanıyor. Buradaki eski satır satır kopya,
   * uç değişince sessizce ayrışacaktı -- mentor "3 geciken var" derken
   * ekranda başka sayı görünebilirdi.
   *
   * 🔴 İsteme yalnız counts/toplamlar yazılıyor. `ozet.upcoming` içindeki
   * müşteri adları ve kayıt başlıkları BİLİNÇLİ olarak kullanılmıyor:
   * dışarıya (Mistral AI) giden işletme verisi asgaride kalır ve cevabın
   * işe yaraması için tanımlayıcılar gerekmez.
   */
  const ozet = await trackerOzetiHesapla(prisma, workspaceId)
  const tl = (n: number) => n.toLocaleString('tr-TR')

  const systemPromptAdditions =
    `[İŞLETME TAKİP ÖZETİ]\nKullanıcının çalışma alanına ait işletme takip özeti:\n` +
    `- Açık kayıt: ${ozet.counts.open}\n` +
    `- Vadesi geçmiş: ${ozet.counts.overdue}\n` +
    `- Bugün vadesi: ${ozet.counts.dueToday}\n` +
    `- Kargo/Sevkiyat: ${ozet.counts.shipments}\n` +
    `- Ertelenen: ${ozet.counts.deferred}\n` +
    `- Yönü belirsiz: ${ozet.counts.awaitingDirection} (${tl(ozet.awaitingDirection.amount)} TL)\n` +
    `- 30 günlük ödenecek: ${tl(ozet.nextThirtyDays.payable)} TL\n` +
    `- 30 günlük tahsil edilecek: ${tl(ozet.nextThirtyDays.receivable)} TL\n` +
    `- Net: ${tl(ozet.nextThirtyDays.net)} TL\n` +
    `\nNot: Bu özet yalnızca sayılar ve toplamlar içerir; müşteri adı, fatura numarası veya kayıt başlığı taşımaz.`

  return {
    valid: true,
    contextDisplay: 'İşletme Takip Özeti',
    systemPromptAdditions,
    starterPrompts: [
      'Geciken ödemelerim neler?',
      'Bu ay ne kadar tahsil etmem gerekiyor?',
      'Hangi kayıtlar yön bekliyor?'
    ]
  }
}
