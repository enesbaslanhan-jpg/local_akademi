export type MentorIntent =
  | 'greeting'
  | 'system_capability'
  | 'platform_help'
  | 'conversation_control'
  | 'business_knowledge'
  | 'financial_analysis'
  | 'tax_legal'
  | 'user_business_data'
  | 'selected_knowledge_object'
  | 'general_chat'
  | 'clarification_needed'

export interface MentorIntentResult {
  intent: MentorIntent
  confidence: number
  requiresRetrieval: boolean
  requiresProvider: boolean
  requiresMemory: boolean
  requiresDisclaimer: boolean
  responseMode: 'deterministic' | 'provider' | 'clarification'
  reasonCode: string
}

interface DetectionPattern {
  intent: MentorIntent
  confidence: number
  requiresRetrieval: boolean
  requiresProvider: boolean
  requiresMemory: boolean
  requiresDisclaimer: boolean
  responseMode: MentorIntentResult['responseMode']
  reasonCode: string
  test: (normalized: string, tokens: string[]) => boolean
}

function normalizeTurkish(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[\.\,!\?:;]+$/g, '')
    .trim()
}

function tokenize(text: string): string[] {
  return text
    .split(/[^\p{L}\p{N}]+/u)
    .filter(t => t.length >= 2)
}

const GREETINGS = new Set([
  'merhaba', 'selam', 'selamlar', 'günaydın', 'günaydin', 'iyi akşamlar',
  'iyi aksamlar', 'iyi günler', 'hey', 'alo', 'sa', 'selamün aleyküm',
  'naber', 'nasılsın', 'nasilsin', 'nasıl gidiyor', 'nasil gidiyor',
  'teşekkür', 'teşekkur', 'teşekkürler', 'tesekkurler', 'sağol', 'sagol',
  'eyvallah', 'kolay gelsin', 'hoş geldin', 'hosgeldin', 'görüşürüz',
  'görüşmek üzere', 'hoşça kal', 'hoscakal',
])

const SYSTEM_CAPABILITY_PATTERNS = [
  /\bhangi\s+(?:llm|ai|yapay zeka|model|sağlayıcı|provider)\b/,
  /\bhangi\s+modelle\s+çalış/,
  /\bteknik\s+model\s+ad/,
  /\bollama\s+mı\s+nvidia\s+mı\b/,
  /\bollama\s+mı\s+kullan/,
  /\bnvidia\s+mı\s+kullan/,
  /\byerel\s+model\s+misin\b/,
  /\binternet\s+olmadan\s+çalış/,
  /\bsağlayıcın\s+kim\b/,
  /\bai\s+sağlayıcı/,
  /\bai\s+provider/,
]

const PLATFORM_HELP_PATTERNS = [
  /\barşiv/,
  /\bkaynaklara\s+nasıl\s+gider/,
  /\bmodel\s+laboratuvar/,
  /\beğitimleri\s+nereden\s+aç/,
  /\bsohbeti\s+nasıl\s+sile/,
  /\bsohbeti\s+sil/,
  /\bnasıl\s+kullanır/,
  /\bnerede\s+bulunur/,
]

const CONVERSATION_CONTROL_PATTERNS = [
  /\bönceki\s+cevabı\s+kısalt/,
  /\byeniden\s+anlat/,
  /\bdaha\s+kısa\s+yaz/,
  /\bmadde\s+madde\s+açıkla/,
  /\bbu\s+cevabı\s+özetle/,
  /\bözetle\b/,
  /\baynı\s+cevabı\s+yeniden\s+üret/,
  /\btekrar\s+üret/,
]

const BUSINESS_KNOWLEDGE_PATTERNS = [
  /\bgelir\s+model/,
  /\biş\s+modeli\s+canvas/,
  /\bmüşteri\s+segment/,
  /\bdeğer\s+önerisi/,
  /\bpazarlama\s+plan/,
  /\bswot/,
  /\bgirişimcilik/,
  /\bpazar\s+araştırma/,
  /\brekabet\s+analiz/,
  /\bmüşteri\s+ilişki/,
  /\bgelir\s+akış/,
  /\bmaliyet\s+yapısı/,
  /\banahtar\s+faaliyet/,
  /\bkaynaklar/,
  /\biş\s+ortaklığı/,
]

const FINANCIAL_ANALYSIS_PATTERNS = [
  /\bciroy?\s+ile\s+kâr\s+arası/,
  /\bbrüt\s+kâr\s+nasıl\s+hesaplan/,
  /\bbaşabaş\s+nokta/,
  /\bnakit\s+akış/,
  /\bkar\s+zarar/,
  /\bmaliyet\s+hesap/,
  /\bfiyatlandırma/,
  /\bkârlılık/,
  /\bkarlilik/,
  /\bfinansal\s+(?:oran|tablo|analiz)/,
  /\bciro\s+\d/,
  /\bmaliyet\s+\d/,
  /\bmarj\s+hesap/,
]

const TAX_LEGAL_PATTERNS = [
  /\bkdv\b/,
  /\bvergi\b/,
  /\bşahıs\s+işletme/,
  /\bfatura\s+kes/,
  /\bvergi\s+levha/,
  /\bmevzuat/,
  /\bhukuki?\b/,
  /\bavukat/,
  /\bdava\b/,
  /\bnoter/,
  /\bresmî\s+yükümlülük/,
  /\byasal\s+zorunlu/,
]

const USER_BUSINESS_DATA_PATTERNS = [
  /\bgeçen\s+ay\s+satış/,
  /\bgeçen\s+ay\s+ciro/,
  /\bişletme\s+bilgilerime\s+göre/,
  /\bkaydettiğim\s+maliyet/,
  /\bönceki\s+verdiğim\s+ciro/,
  /\bh[ae]t[ıi]rl[ıi]yor\s+musun/,
  /\bverilerimi\s+analiz/,
]

const SELECTED_KO_MARKERS = /\bselected:|seçili:|aktif konu:/i

function isGreeting(normalized: string, tokens: string[]): boolean {
  if (normalized.length <= 25 && tokens.some(t => GREETINGS.has(t))) return true
  if (GREETINGS.has(normalized)) return true
  if (/^(merhaba|selam|günaydın|iyi akşamlar|iyi günler|nasılsın|naber)$/.test(normalized)) return true
  return false
}

function isSystemCapability(normalized: string): boolean {
  return SYSTEM_CAPABILITY_PATTERNS.some(p => p.test(normalized))
}

function isPlatformHelp(normalized: string): boolean {
  return PLATFORM_HELP_PATTERNS.some(p => p.test(normalized))
}

function isConversationControl(normalized: string): boolean {
  return CONVERSATION_CONTROL_PATTERNS.some(p => p.test(normalized))
}

function isBusinessKnowledge(normalized: string): boolean {
  return BUSINESS_KNOWLEDGE_PATTERNS.some(p => p.test(normalized))
}

function isFinancialAnalysis(normalized: string): boolean {
  return FINANCIAL_ANALYSIS_PATTERNS.some(p => p.test(normalized))
}

function isTaxLegal(normalized: string): boolean {
  return TAX_LEGAL_PATTERNS.some(p => p.test(normalized))
}

function isUserBusinessData(normalized: string): boolean {
  return USER_BUSINESS_DATA_PATTERNS.some(p => p.test(normalized))
}

function isSelectedKnowledgeObjectContext(normalized: string): boolean {
  return SELECTED_KO_MARKERS.test(normalized)
}

function isClarificationNeeded(normalized: string, tokens: string[]): boolean {
  const short = normalized.length <= 30
  if (short && /^model\s*(ne|nedir)?$/.test(normalized)) return true
  if (short && /^hangisi\s*daha\s*iyi$/.test(normalized)) return true
  if (short && /^bu\s*nasıl\s+oluyor$/.test(normalized)) return true
  if (short && /^bana\s+uygun\s+olan\s+ne$/.test(normalized)) return true
  if (short && /^bunu\s+anlat$/.test(normalized)) return true
  if (short && tokens.length <= 2 && /^(öneri|fikir|tavsiye)$/.test(tokens[0])) return true
  if (short && /^(yardım|destek|help)$/.test(tokens[0])) return true
  return false
}

const PATTERNS: DetectionPattern[] = [
  {
    intent: 'greeting',
    confidence: 0.95,
    requiresRetrieval: false,
    requiresProvider: false,
    requiresMemory: false,
    requiresDisclaimer: false,
    responseMode: 'deterministic',
    reasonCode: 'greeting_pattern',
    test: (n, t) => isGreeting(n, t),
  },
  {
    intent: 'system_capability',
    confidence: 0.95,
    requiresRetrieval: false,
    requiresProvider: false,
    requiresMemory: false,
    requiresDisclaimer: false,
    responseMode: 'deterministic',
    reasonCode: 'system_capability_pattern',
    test: (n) => isSystemCapability(n),
  },
  {
    intent: 'platform_help',
    confidence: 0.85,
    requiresRetrieval: false,
    requiresProvider: true,
    requiresMemory: false,
    requiresDisclaimer: false,
    responseMode: 'provider',
    reasonCode: 'platform_help_pattern',
    test: (n) => isPlatformHelp(n),
  },
  {
    intent: 'conversation_control',
    confidence: 0.9,
    requiresRetrieval: false,
    requiresProvider: true,
    requiresMemory: true,
    requiresDisclaimer: false,
    responseMode: 'provider',
    reasonCode: 'conversation_control_pattern',
    test: (n) => isConversationControl(n),
  },
  {
    intent: 'tax_legal',
    confidence: 0.9,
    requiresRetrieval: true,
    requiresProvider: true,
    requiresMemory: false,
    requiresDisclaimer: true,
    responseMode: 'provider',
    reasonCode: 'tax_legal_pattern',
    test: (n) => isTaxLegal(n),
  },
  {
    intent: 'financial_analysis',
    confidence: 0.88,
    requiresRetrieval: true,
    requiresProvider: true,
    requiresMemory: true,
    requiresDisclaimer: true,
    responseMode: 'provider',
    reasonCode: 'financial_analysis_pattern',
    test: (n) => isFinancialAnalysis(n),
  },
  {
    intent: 'business_knowledge',
    confidence: 0.85,
    requiresRetrieval: true,
    requiresProvider: true,
    requiresMemory: false,
    requiresDisclaimer: false,
    responseMode: 'provider',
    reasonCode: 'business_knowledge_pattern',
    test: (n) => isBusinessKnowledge(n),
  },
  {
    intent: 'user_business_data',
    confidence: 0.85,
    requiresRetrieval: false,
    requiresProvider: true,
    requiresMemory: true,
    requiresDisclaimer: false,
    responseMode: 'provider',
    reasonCode: 'user_business_data_pattern',
    test: (n) => isUserBusinessData(n),
  },
]

export function detectMentorIntent(
  message: string,
  context?: { knowledgeObjectCode?: string | null | undefined },
): MentorIntentResult {
  const normalized = normalizeTurkish(message)
  const tokens = tokenize(normalized)

  // Explicit selected knowledge object overrides the generic route when the
  // question is actually about that content. Technical meta questions about
  // the AI itself are handled separately below and keep their intent.
  if (context?.knowledgeObjectCode && !isSystemCapability(normalized)) {
    return {
      intent: 'selected_knowledge_object',
      confidence: 0.9,
      requiresRetrieval: true,
      requiresProvider: true,
      requiresMemory: false,
      requiresDisclaimer: false,
      responseMode: 'provider',
      reasonCode: 'explicit_selected_knowledge_object',
    }
  }

  for (const pattern of PATTERNS) {
    if (pattern.test(normalized, tokens)) {
      return {
        intent: pattern.intent,
        confidence: pattern.confidence,
        requiresRetrieval: pattern.requiresRetrieval,
        requiresProvider: pattern.requiresProvider,
        requiresMemory: pattern.requiresMemory,
        requiresDisclaimer: pattern.requiresDisclaimer,
        responseMode: pattern.responseMode,
        reasonCode: pattern.reasonCode,
      }
    }
  }

  if (isClarificationNeeded(normalized, tokens)) {
    return {
      intent: 'clarification_needed',
      confidence: 0.8,
      requiresRetrieval: false,
      requiresProvider: false,
      requiresMemory: false,
      requiresDisclaimer: false,
      responseMode: 'clarification',
      reasonCode: 'ambiguous_short_query',
    }
  }

  return {
    intent: 'general_chat',
    confidence: 0.6,
    requiresRetrieval: false,
    requiresProvider: true,
    requiresMemory: true,
    requiresDisclaimer: false,
    responseMode: 'provider',
    reasonCode: 'fallback_general_chat',
  }
}
