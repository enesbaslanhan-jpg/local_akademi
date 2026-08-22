import type { MentorIntent } from './mentor-intent'

export type MentorPromptProfileName =
  | 'business_knowledge'
  | 'financial_analysis'
  | 'tax_legal'
  | 'user_business_data'
  | 'conversation_rewrite'
  | 'selected_knowledge_object'
  | 'platform_help'
  | 'general_chat'

export interface MentorPromptProfile {
  name: MentorPromptProfileName
  systemInstruction: string
  intentInstruction: string
  maxOutputTokens: number
  temperature: number
  knowledgeContextLimit: number
  memoryLimit: number
  conversationHistoryLimit: number
  requiresStructuredAnswer: boolean
  allowsDisclaimer: boolean
  preferredAnswerLength: string
}

export type UserRequestedLength = 'short' | 'normal' | 'detailed'

const BASE_INSTRUCTION = `Sen LocalKarar'ın KOBİ, esnaf ve girişimcilere destek veren yapay zeka iş mentorusun.

Dil kuralları:
- Kullanıcı Türkçe yazıyorsa doğal, tutarlı Türkçe kullan.
- Zorunlu teknik terimler dışında yabancı dil karıştırma.
- Basit soruya kısa cevap ver.
- Bilmediğin konuda "Bilmiyorum" de, uydurma.
- Aynı cümleyi farklı biçimde tekrar etme.
- Gereksiz "Elbette", "Sonuç olarak" gibi giriş/sonuç kalıpları kullanma.`

const INTENT_INSTRUCTIONS: Record<MentorPromptProfileName, string> = {
  business_knowledge:
    'İşletme, pazarlama ve strateji konusunda uygulanabilir, düşük bütçeli ve ölçülebilir öneriler sun. En fazla 3 öncelikli adım ve mümkünse basit bir başarı ölçütü belirt.',
  financial_analysis:
    'Finansal kavramları açıkla. Hesaplanabilir sorularda mevcut deterministik finansal model sonuçlarını kullan; kendi başına farklı bir sayı üretme. Finansal model çıktılarının karar desteği olduğunu, yatırım/kredi tavsiyesi olmadığını belirt.',
  tax_legal:
    'Vergi veya yasal konularda genel bilgilendirme amaçlı kısa cevap ver. Kesin oran, güncel mevzuat veya kişisel durum değerlendirmesi uydurma. Gerekli olduğunda kısa bir uyarı ekle.',
  user_business_data:
    'Kullanıcının işletme profili, belge ve geçmiş kayıtlarına dayanarak kişiselleştirilmiş öneriler sun. Hangi kayıt veya dosyaya dayandığını adıyla belirt.',
  conversation_rewrite:
    'Kullanıcının talimatına göre önceki cevabı yeniden yaz. Yeni retrieval yapma, eski alakasız citation ekleme. İstenen uzunluğa sadık kal.',
  selected_knowledge_object:
    'Kullanıcı seçili içeriği soruyor. Öncelikle bu içeriğe dayanarak yanıt ver. İçerikte olmayan bilgiyi uydurma. Gerekirse diğer yayımlanmış içerikleri yardımcı bağlam olarak kullan.',
  platform_help:
    'Platform kullanımıyla ilgili net, kısa ve adım adım yönlendirme ver.',
  general_chat:
    'Kullanıcının açık uçlu sorusuna kısa ve net cevap ver. Gereksiz uzun giriş yapma.',
}

const DEFAULT_MAX_OUTPUT_TOKENS = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '2048', 10)

const GLOBAL_LIMITS = {
  maxOutputTokens: {
    short: 180,
    normal: 450,
    detailed: 700,
  },
  knowledgeContext: 3000,
  memory: 3000,
  history: {
    business_knowledge: 6,
    financial_analysis: 8,
    tax_legal: 6,
    user_business_data: 6,
    conversation_rewrite: 2,
    selected_knowledge_object: 4,
    platform_help: 4,
    general_chat: 6,
  },
}

const TEMPERATURES: Record<MentorPromptProfileName, number> = {
  business_knowledge: 0.3,
  financial_analysis: 0.15,
  tax_legal: 0.15,
  user_business_data: 0.25,
  conversation_rewrite: 0.25,
  selected_knowledge_object: 0.2,
  platform_help: 0.2,
  general_chat: 0.35,
}

function mapIntentToProfileName(intent: MentorIntent): MentorPromptProfileName {
  switch (intent) {
    case 'business_knowledge': return 'business_knowledge'
    case 'financial_analysis': return 'financial_analysis'
    case 'tax_legal': return 'tax_legal'
    case 'user_business_data': return 'user_business_data'
    case 'conversation_control': return 'conversation_rewrite'
    case 'selected_knowledge_object': return 'selected_knowledge_object'
    case 'platform_help': return 'platform_help'
    default: return 'general_chat'
  }
}

export function detectUserRequestedLength(message: string): UserRequestedLength {
  const lower = message.toLocaleLowerCase('tr-TR')
  if (/\b(kısa|özet|tek cümle|iki cümle|tek paragraf|özeti)\b/.test(lower)) return 'short'
  if (/\b(ayrıntılı|detaylı|uzun|geniş|adım adım|maddeli)\b/.test(lower)) return 'detailed'
  return 'normal'
}

export function getPromptProfile(
  intent: MentorIntent,
  options?: { userRequestedLength?: UserRequestedLength },
): MentorPromptProfile {
  const profileName = mapIntentToProfileName(intent)
  const userLength = options?.userRequestedLength ?? 'normal'
  const baseMax = GLOBAL_LIMITS.maxOutputTokens[userLength]
  const maxOutputTokens = Math.min(baseMax, DEFAULT_MAX_OUTPUT_TOKENS)

  return {
    name: profileName,
    systemInstruction: BASE_INSTRUCTION,
    intentInstruction: INTENT_INSTRUCTIONS[profileName],
    maxOutputTokens,
    temperature: TEMPERATURES[profileName],
    knowledgeContextLimit: GLOBAL_LIMITS.knowledgeContext,
    memoryLimit: GLOBAL_LIMITS.memory,
    conversationHistoryLimit: GLOBAL_LIMITS.history[profileName],
    requiresStructuredAnswer: false,
    allowsDisclaimer: profileName === 'tax_legal' || profileName === 'financial_analysis',
    preferredAnswerLength:
      userLength === 'short'
        ? 'Kısa ve özlü.'
        : userLength === 'detailed'
        ? 'Ayrıntılı ama tekrar içermeyen.'
        : 'Kısa, net ve somut.',
  }
}

export function getOutputBudget(intent: MentorIntent, userRequestedLength?: UserRequestedLength): number {
  return getPromptProfile(intent, { userRequestedLength }).maxOutputTokens
}

export function getTemperature(intent: MentorIntent): number {
  return getPromptProfile(intent).temperature
}

export function getHistoryLimit(intent: MentorIntent): number {
  return getPromptProfile(intent).conversationHistoryLimit
}

export interface UserBusinessContext {
  businessProfile?: {
    name?: string
    sector?: string
    city?: string
    monthlySales?: number
    monthlyExpenses?: number
    cashBalance?: number
    debtBalance?: number
    businessStage?: string
    employeeCount?: number
    primaryGoal?: string
  }
  enrollments?: Array<{ courseTitle: string; progress: number; status: string }>
  recentCalculations?: Array<{ formulaName: string; createdAt: Date }>
  recentModelRuns?: Array<{ modelName: string; createdAt: Date }>
  knowledgeProgress?: Array<{ koTitle: string; status: string; progressPercent: number }>
}

export interface ProductCatalogContext {
  summary: string
  fullCatalog?: string
}

export function buildProfiledSystemPrompt(
  user: { name: string; role: string },
  intent: MentorIntent,
  knowledgeContext: string,
  koTitle?: string,
  selectedKOTitle?: string,
  options?: { userRequestedLength?: UserRequestedLength },
  productCatalog?: ProductCatalogContext,
  userBusinessContext?: UserBusinessContext,
): string {
  const profile = getPromptProfile(intent, options)
  const parts: string[] = [profile.systemInstruction]

  parts.push(`Kullanıcı: ${user.name}\nRol: ${user.role}`)
  parts.push(profile.intentInstruction)
  parts.push(`Tercih edilen uzunluk: ${profile.preferredAnswerLength}`)

  if (productCatalog?.summary) {
    parts.push(`--- ÜRÜN BİLGİSİ ---\n${productCatalog.summary}`)
  }

  if (userBusinessContext) {
    const contextParts: string[] = []
    if (userBusinessContext.businessProfile) {
      const bp = userBusinessContext.businessProfile
      const bpLines = ['İşletme Profili:']
      if (bp.name) bpLines.push(`- Ad: ${bp.name}`)
      if (bp.sector) bpLines.push(`- Sektör: ${bp.sector}`)
      if (bp.city) bpLines.push(`- Şehir: ${bp.city}`)
      if (bp.monthlySales !== undefined) bpLines.push(`- Aylık Satış: ${bp.monthlySales.toLocaleString('tr-TR')} TL`)
      if (bp.monthlyExpenses !== undefined) bpLines.push(`- Aylık Gider: ${bp.monthlyExpenses.toLocaleString('tr-TR')} TL`)
      if (bp.cashBalance !== undefined) bpLines.push(`- Nakit: ${bp.cashBalance.toLocaleString('tr-TR')} TL`)
      if (bp.debtBalance !== undefined) bpLines.push(`- Borç: ${bp.debtBalance.toLocaleString('tr-TR')} TL`)
      if (bp.businessStage) bpLines.push(`- Aşama: ${bp.businessStage}`)
      if (bp.employeeCount !== undefined) bpLines.push(`- Çalışan: ${bp.employeeCount}`)
      if (bp.primaryGoal) bpLines.push(`- Hedef: ${bp.primaryGoal}`)
      if (bpLines.length > 1) contextParts.push(bpLines.join('\n'))
    }

    if (userBusinessContext.enrollments && userBusinessContext.enrollments.length > 0) {
      const enrLines = ['Kurs İlerlemeleri:']
      for (const e of userBusinessContext.enrollments.slice(0, 5)) {
        enrLines.push(`- ${e.courseTitle}: %${e.progress} (${e.status})`)
      }
      contextParts.push(enrLines.join('\n'))
    }

    if (userBusinessContext.knowledgeProgress && userBusinessContext.knowledgeProgress.length > 0) {
      const kpLines = ['Bilgi Nesnesi İlerlemeleri:']
      for (const kp of userBusinessContext.knowledgeProgress.slice(0, 5)) {
        kpLines.push(`- ${kp.koTitle}: %${kp.progressPercent} (${kp.status})`)
      }
      contextParts.push(kpLines.join('\n'))
    }

    if (userBusinessContext.recentCalculations && userBusinessContext.recentCalculations.length > 0) {
      const calcLines = ['Son Hesaplamalar:']
      for (const c of userBusinessContext.recentCalculations.slice(0, 3)) {
        calcLines.push(`- ${c.formulaName} (${c.createdAt.toLocaleDateString('tr-TR')})`)
      }
      contextParts.push(calcLines.join('\n'))
    }

    if (userBusinessContext.recentModelRuns && userBusinessContext.recentModelRuns.length > 0) {
      const runLines = ['Son Model Çalıştırmaları:']
      for (const r of userBusinessContext.recentModelRuns.slice(0, 3)) {
        runLines.push(`- ${r.modelName} (${r.createdAt.toLocaleDateString('tr-TR')})`)
      }
      contextParts.push(runLines.join('\n'))
    }

    if (contextParts.length > 0) {
      parts.push(`--- KULLANICI BAĞLAMI ---\n${contextParts.join('\n\n')}`)
    }
  }

  if (selectedKOTitle) {
    parts.push(`Kullanıcı şu içeriği seçerek soruyor: "${selectedKOTitle}".`)
  } else if (koTitle) {
    parts.push(`Soru şu içerikle ilgili: "${koTitle}".`)
  }

  if (knowledgeContext) {
    parts.push(`--- KAYNAKLAR ---${knowledgeContext}`)
  }

  return parts.join('\n\n')
}

export function buildPromptMetrics(prompt: string): {
  systemPromptCharacters: number
  estimatedSystemPromptTokens: number
} {
  return {
    systemPromptCharacters: prompt.length,
    estimatedSystemPromptTokens: Math.max(0, Math.round(prompt.length / 4)),
  }
}

export function getProviderParameters(
  intent: MentorIntent,
  options?: { userRequestedLength?: UserRequestedLength },
): { temperature: number; maxOutputTokens: number } {
  const profile = getPromptProfile(intent, options)
  return {
    temperature: profile.temperature,
    maxOutputTokens: profile.maxOutputTokens,
  }
}
