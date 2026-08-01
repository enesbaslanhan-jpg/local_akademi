import type { MentorIntent, MentorIntentResult } from './mentor-intent'
import { rerankKnowledgeObjects, toKnowledgeObjectResults } from './mentor-retrieval-rerank'
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

export function applyRelevanceGate(
  knowledgeObjects: KnowledgeObjectResult[],
  intent: MentorIntent,
  query?: string,
): { accepted: KnowledgeObjectResult[]; rejected: KnowledgeObjectResult[] } {
  const reranker = rerankKnowledgeObjects(query ?? '', intent, knowledgeObjects)
  return {
    accepted: toKnowledgeObjectResults(reranker.accepted),
    rejected: toKnowledgeObjectResults(reranker.rejected),
  }
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
