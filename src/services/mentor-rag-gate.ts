import type { MentorIntent, MentorIntentResult } from './mentor-intent'
import type { KnowledgeObjectResult } from './retrieval/types'

export function shouldRunKnowledgeRetrieval(
  intentOrResult: MentorIntent | MentorIntentResult,
): boolean {
  const retrievalIntents: MentorIntent[] = [
    'business_knowledge',
    'tax_legal',
    'financial_analysis',
    'selected_knowledge_object',
  ]
  if (typeof intentOrResult === 'string') {
    return retrievalIntents.includes(intentOrResult)
  }
  return intentOrResult.requiresRetrieval
}

function getRelevanceThreshold(intent: MentorIntent): number {
  const raw = process.env.RAG_MIN_RELEVANCE_SCORE
  const configured = raw ? Number(raw) : Number.NaN
  if (Number.isFinite(configured) && configured >= 0 && configured <= 1) {
    return configured
  }

  // Default per-intent thresholds (normalized 0-1).
  switch (intent) {
    case 'tax_legal':
      return 0.32
    case 'financial_analysis':
      return 0.36
    case 'business_knowledge':
      return 0.30
    case 'selected_knowledge_object':
      return 0.25
    default:
      return 0.30
  }
}

function getConfidence(ko: KnowledgeObjectResult): number {
  if (typeof (ko as any).confidence === 'number') {
    return (ko as any).confidence
  }
  // Fallback heuristic that works with the existing score scales.
  if (ko.matchedTerms.includes('semantic')) {
    // Semantic score is similarity * 100.
    return ko.score / 100
  }
  if (ko.matchedTerms.includes('lexical')) {
    // Lexical exact-code max is 100; normalize to a 0-1-ish scale.
    return Math.min(ko.score / 100, 1)
  }
  return Math.min(ko.score, 1)
}

function isExactCodeMatch(ko: KnowledgeObjectResult): boolean {
  return ko.matchedTerms.some(term => term.startsWith('code:'))
}

export function applyRelevanceGate(
  knowledgeObjects: KnowledgeObjectResult[],
  intent: MentorIntent,
): { accepted: KnowledgeObjectResult[]; rejected: KnowledgeObjectResult[] } {
  const threshold = getRelevanceThreshold(intent)
  const accepted: KnowledgeObjectResult[] = []
  const rejected: KnowledgeObjectResult[] = []
  const seenIds = new Set<number>()

  for (const ko of knowledgeObjects) {
    if (seenIds.has(ko.id)) continue
    seenIds.add(ko.id)
    if (isExactCodeMatch(ko) || getConfidence(ko) >= threshold) {
      accepted.push(ko)
    } else {
      rejected.push(ko)
    }
  }

  return { accepted, rejected }
}

export function shouldIncludeCitations(intent: MentorIntent): boolean {
  switch (intent) {
    case 'business_knowledge':
    case 'tax_legal':
    case 'financial_analysis':
    case 'selected_knowledge_object':
    case 'user_business_data':
      return true
    default:
      return false
  }
}

export function buildCitations(
  knowledgeObjects: KnowledgeObjectResult[],
  intent: MentorIntent,
): KnowledgeObjectResult[] {
  if (!shouldIncludeCitations(intent)) return []
  return knowledgeObjects.slice(0, 3)
}

export function shouldUseMemory(intent: MentorIntent): boolean {
  switch (intent) {
    case 'user_business_data':
    case 'financial_analysis':
    case 'conversation_control':
    case 'general_chat':
    case 'business_knowledge':
      return true
    default:
      return false
  }
}

export function shouldSkipOutputReview(intent: MentorIntent): boolean {
  // Avoid false disclaimers triggered by the system prompt for intents that
  // do not require a legal/financial disclaimer. Tax uses the review gate
  // because the user message already signals the category. Financial analysis
  // uses a deterministic disclaimer to avoid duplicate/implicit finance
  // disclaimers on ordinary business accounting questions.
  switch (intent) {
    case 'greeting':
    case 'system_capability':
    case 'platform_help':
    case 'clarification_needed':
    case 'conversation_control':
    case 'general_chat':
    case 'business_knowledge':
    case 'user_business_data':
    case 'financial_analysis':
      return true
    case 'tax_legal':
    case 'selected_knowledge_object':
      return false
    default:
      return true
  }
}

export function shouldAttachStaticDisclaimer(
  intent: MentorIntent,
  existingContent: string,
  staticDisclaimer: string | null,
): string | null {
  if (!staticDisclaimer) return null
  if (existingContent.includes(staticDisclaimer)) return null
  return staticDisclaimer
}

export function shouldFetchSelectedKnowledgeObject(
  intent: MentorIntent,
  knowledgeObjectCode?: string | null,
): boolean {
  if (!knowledgeObjectCode) return false
  // Never force a selected KO into a pure technical system question.
  if (intent === 'system_capability') return false
  return true
}

export function resolveEffectiveIntent(
  intentResult: MentorIntentResult,
  hasExplicitKnowledgeObjectCode: boolean,
): MentorIntent {
  // Explicit selected KO overrides everything except pure system meta questions.
  if (hasExplicitKnowledgeObjectCode && intentResult.intent !== 'system_capability') {
    return 'selected_knowledge_object'
  }
  return intentResult.intent
}
