import type { RiskLevel } from '../review-gate'
import type { SourceRef } from '../retrieval/types'

export type AiReviewerDecision = 'allow' | 'allow_with_disclaimer' | 'block'

export type AiReviewerIssueCode =
  | 'unsupported_claim'
  | 'source_conflict'
  | 'overconfident_language'
  | 'financial_advice'
  | 'tax_or_legal_specificity'
  | 'unsafe_action'
  | 'credential_request'
  | 'prompt_injection'
  | 'poor_pedagogy'
  | 'irrelevant_answer'

export interface ReviewerEvidence {
  id: number
  code: string | null
  title: string
  excerpt: string
  category: string | null
  sourceRefs: SourceRef[]
  status: 'published'
  isDemo: false
}

export interface AiReviewerRequest {
  userMessage: string
  draft: string
  evidence: ReviewerEvidence[]
  riskLevel: RiskLevel
}

export interface AiReviewerResult {
  decision: AiReviewerDecision
  issueCodes: AiReviewerIssueCode[]
  groundednessScore: number
  pedagogicalScore: number
  confidence: number
  evidenceIds: number[]
  requiresHumanReview: boolean
  safeReasonCode: string
}

export type AiReviewerMode = 'shadow' | 'enforce' | 'disclaimer_only'

export interface AiReviewerConfig {
  enabled: boolean
  mode: AiReviewerMode
  disclaimerRolloutApproved: boolean
  sampleRate: number
  timeoutMs: number
  maxDraftChars: number
  maxEvidenceChars: number
  model?: string
}

export type AiReviewerFailureCode =
  | 'reviewer_timeout'
  | 'reviewer_queue_full'
  | 'reviewer_provider_error'
  | 'reviewer_invalid_json'
  | 'reviewer_invalid_schema'
  | 'reviewer_invalid_evidence'
  | 'reviewer_response_too_large'

export type AiReviewerOutcome =
  | { status: 'disabled' }
  | { status: 'reviewed'; result: AiReviewerResult; latencyMs: number }
  | { status: 'unavailable'; failureCode: AiReviewerFailureCode; latencyMs: number }

export interface ReviewerMessage {
  role: 'system' | 'user'
  content: string
}

export interface ReviewerProviderRequest {
  messages: ReviewerMessage[]
  model?: string
  timeoutMs: number
  abortSignal: AbortSignal
}

export interface ReviewerProviderResult {
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
