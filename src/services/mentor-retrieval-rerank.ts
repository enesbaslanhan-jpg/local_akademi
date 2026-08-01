import type { MentorIntent } from './mentor-intent'
import type { KnowledgeObjectResult } from './retrieval/types'

export interface RerankedKnowledgeObject {
  knowledgeObject: KnowledgeObjectResult
  semanticScore: number
  lexicalScore: number
  categoryScore: number
  titleScore: number
  originalScore: number
  finalScore: number
  accepted: boolean
  rejectionReason?: string
}

const WEIGHTS = {
  exactCode: 1.0,
  semantic: 0.35,
  lexical: 0.25,
  titleMatch: 0.25,
  categoryMatch: 0.15,
  genericPenalty: -0.2,
  duplicatePenalty: -0.15,
  selectedBoost: 0.3,
}

const THRESHOLDS: Record<string, number> = {
  default: 0.35,
  tax_legal: 0.42,
  financial_analysis: 0.40,
  business_knowledge: 0.35,
  selected_knowledge_object: 0.30,
  user_business_data: 0.35,
}

const INTENT_CATEGORY_HINTS: Record<string, string[]> = {
  business_knowledge: ['iş', 'pazarlama', 'strateji', 'girişimcilik', 'müşteri', 'değer', 'canvas', 'gelir', 'swot', 'rekabet', 'segment'],
  financial_analysis: ['finans', 'maliye', 'kâr', 'kar', 'marj', 'ciro', 'nakit', 'oran', 'rasyo', 'başabaş', 'komisyon', 'fiyat'],
  tax_legal: ['vergi', 'hukuk', 'yasal', 'mevzuat', 'fatura', 'kdv', 'muhasebe', 'mali'],
}

const GENERIC_TITLES = new Set([
  'genel', 'giriş', 'tanım', 'nedir', 'özet', 'girişimcilik', 'işletme', 'konu anlatımı',
])

function normalize(text: string): string {
  return text.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter(t => t.length >= 2)
}

function hasSemantic(result: KnowledgeObjectResult): boolean {
  return result.matchedTerms.includes('semantic')
}

function hasLexical(result: KnowledgeObjectResult): boolean {
  return result.matchedTerms.includes('lexical')
}

function isExactCode(result: KnowledgeObjectResult): boolean {
  return result.matchedTerms.some(t => t.startsWith('code:'))
}

function isExplicitSelected(result: KnowledgeObjectResult): boolean {
  return result.matchedTerms.some(t => t === 'selected:explicit')
}

function titleScore(query: string, result: KnowledgeObjectResult): number {
  const queryTokens = new Set(tokens(query))
  const titleTokens = tokens(result.title)
  if (titleTokens.length === 0) return 0

  const matched = titleTokens.filter(t => queryTokens.has(t)).length
  const ratio = matched / titleTokens.length

  const exactPhrase = normalize(result.title).includes(normalize(query))
  const boost = exactPhrase && queryTokens.size > 0 ? 0.25 : 0

  return Math.min(1, ratio + boost)
}

function categoryScore(intent: MentorIntent, result: KnowledgeObjectResult): number {
  const hints = INTENT_CATEGORY_HINTS[intent] || INTENT_CATEGORY_HINTS.default || []
  if (!result.category?.name) return 0
  const category = result.category.name.toLocaleLowerCase('tr-TR')
  const matches = hints.filter(h => category.includes(h)).length
  if (matches > 0) return 0.5 + Math.min(0.5, matches * 0.1)
  return 0
}

function lexicalScore(result: KnowledgeObjectResult): number {
  if (!hasLexical(result)) return 0
  return Math.min(result.score / 100, 1)
}

function semanticScore(result: KnowledgeObjectResult): number {
  if (!hasSemantic(result)) return 0
  return Math.min(result.confidence, 1)
}

function genericPenalty(result: KnowledgeObjectResult): number {
  const title = normalize(result.title)
  if (GENERIC_TITLES.has(title)) return 0.4
  // Single token titles that are too broad.
  const titleTokens = tokens(result.title)
  if (titleTokens.length === 1 && ['model', 'iş', 'vergi', 'finans', 'hukuk'].includes(titleTokens[0])) {
    return 0.25
  }
  return 0
}

function intentCategoryPenalty(intent: MentorIntent, result: KnowledgeObjectResult): number {
  if (intent === 'financial_analysis') {
    const category = result.category?.name?.toLocaleLowerCase('tr-TR') || ''
    const title = normalize(result.title)
    if (category.includes('siber') || title.includes('siber') || title.includes('güvenlik')) return 0.6
  }
  return 0
}

export function rerankKnowledgeObjects(
  query: string,
  intent: MentorIntent,
  candidates: KnowledgeObjectResult[],
): { results: RerankedKnowledgeObject[]; accepted: RerankedKnowledgeObject[]; rejected: RerankedKnowledgeObject[] } {
  const queryNormalized = normalize(query)
  const queryTokenSet = new Set(tokens(query))
  const seenIds = new Set<number>()
  const results: RerankedKnowledgeObject[] = []

  const sorted = [...candidates].sort((a, b) => {
    const aSelected = isExplicitSelected(a)
    const bSelected = isExplicitSelected(b)
    if (aSelected && !bSelected) return -1
    if (!aSelected && bSelected) return 1

    const aExact = isExactCode(a)
    const bExact = isExactCode(b)
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    
    return (b.score || 0) - (a.score || 0)
  })

  for (const ko of sorted) {
    if (seenIds.has(ko.id)) continue
    seenIds.add(ko.id)

    const tScore = titleScore(query, ko)
    const cScore = categoryScore(intent, ko)
    const lScore = lexicalScore(ko)
    const sScore = semanticScore(ko)
    const genPenalty = genericPenalty(ko)
    const intentPenalty = intentCategoryPenalty(intent, ko)
    const duplicatePenalty = results.some(r => r.knowledgeObject.title === ko.title) ? WEIGHTS.duplicatePenalty : 0
    const selectedBoost = isExplicitSelected(ko) ? WEIGHTS.selectedBoost : 0
    const exactCodeBoost = isExactCode(ko) ? WEIGHTS.exactCode : 0

    const weightedScore =
      sScore * WEIGHTS.semantic +
      lScore * WEIGHTS.lexical +
      tScore * WEIGHTS.titleMatch +
      cScore * WEIGHTS.categoryMatch +
      selectedBoost +
      exactCodeBoost +
      duplicatePenalty

    const originalSignal = Math.max(ko.confidence || 0, (ko.score || 0) / 100)
    const normalizedScore = Math.max(0, weightedScore - genPenalty - intentPenalty)
    const finalScore = Math.max(0, 0.5 * originalSignal + 0.5 * normalizedScore)

    const threshold = THRESHOLDS[intent] ?? THRESHOLDS.default
    const accepted = finalScore >= threshold || isExactCode(ko) || isExplicitSelected(ko)

    let rejectionReason: string | undefined
    if (!accepted) {
      if (genPenalty > 0) rejectionReason = 'generic_title'
      else if (intentPenalty > 0) rejectionReason = 'intent_category_mismatch'
      else if (finalScore < threshold) rejectionReason = 'below_threshold'
      else rejectionReason = 'relevance_gate'
    }

    results.push({
      knowledgeObject: ko,
      semanticScore: sScore,
      lexicalScore: lScore,
      categoryScore: cScore,
      titleScore: tScore,
      originalScore: originalSignal,
      finalScore,
      accepted,
      rejectionReason,
    })
  }

  const accepted = results.filter(r => r.accepted)
  const rejected = results.filter(r => !r.accepted)
  return { results, accepted, rejected }
}

export function toKnowledgeObjectResults(
  reranked: RerankedKnowledgeObject[],
): KnowledgeObjectResult[] {
  return reranked.map(r => ({
    ...r.knowledgeObject,
    score: Number((r.finalScore * 100).toFixed(4)),
    confidence: Number(r.finalScore.toFixed(4)),
  }))
}

export function noRelevantKnowledgeFound(
  reranked: RerankedKnowledgeObject[],
): boolean {
  return reranked.every(r => !r.accepted)
}
