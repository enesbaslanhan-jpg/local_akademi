import type { RiskLevel } from '../review-gate'
import type {
  AiReviewerMode,
  AiReviewerOutcome,
} from './types'

const REVIEW_UNAVAILABLE_DISCLAIMER =
  'Otomatik kaynak doğrulaması tamamlanamadı. Önemli kararlar için resmî kaynakları kontrol edin.'

const REVIEW_DISCLAIMERS: Record<string, string> = {
  unsupported_claim:
    'Bu yanıttaki bazı iddialar sağlanan kaynaklarla tam doğrulanamamıştır. Resmî kaynakları kontrol edin.',
  source_conflict:
    'Kaynaklar arasında farklılık olabilir. Güncel resmî kaynağı kontrol edin.',
  financial_advice:
    'Bu bilgi yatırım tavsiyesi değildir. Finansal kararlar için uzman görüşü alın.',
  tax_or_legal_specificity:
    'Bu genel bilgilendirmedir. Özel durumunuz için mali müşavir veya hukuk uzmanına danışın.',
}

const BLOCKED_MESSAGE =
  'Bu yanıt güvenilirlik kontrolünü geçemedi. Sorunuzu daha dar ve resmî bir kaynağa bağlı biçimde yeniden sorabilirsiniz.'

export interface ReviewerPolicyResult {
  decision: 'allow' | 'allow_with_disclaimer' | 'block'
  content: string
  disclaimer: string | null
  blocked: boolean
}

function appendDisclaimer(content: string, disclaimer: string): string {
  return `${content}\n\n---\n${disclaimer}`
}

export function applyReviewerPolicy(
  draft: string,
  outcome: AiReviewerOutcome,
  mode: AiReviewerMode,
  riskLevel: RiskLevel,
): ReviewerPolicyResult {
  if (mode === 'shadow' || outcome.status === 'disabled') {
    return {
      decision: 'allow',
      content: draft,
      disclaimer: null,
      blocked: false,
    }
  }

  if (outcome.status === 'unavailable') {
    if (riskLevel === 'high') {
      return {
        decision: 'block',
        content: BLOCKED_MESSAGE,
        disclaimer: null,
        blocked: true,
      }
    }
    return {
      decision: 'allow_with_disclaimer',
      content: appendDisclaimer(draft, REVIEW_UNAVAILABLE_DISCLAIMER),
      disclaimer: REVIEW_UNAVAILABLE_DISCLAIMER,
      blocked: false,
    }
  }

  if (outcome.result.decision === 'block') {
    return {
      decision: 'block',
      content: BLOCKED_MESSAGE,
      disclaimer: null,
      blocked: true,
    }
  }

  if (outcome.result.decision === 'allow_with_disclaimer') {
    const disclaimer =
      outcome.result.issueCodes
        .map(code => REVIEW_DISCLAIMERS[code])
        .find(Boolean) || REVIEW_UNAVAILABLE_DISCLAIMER
    return {
      decision: 'allow_with_disclaimer',
      content: appendDisclaimer(draft, disclaimer),
      disclaimer,
      blocked: false,
    }
  }

  return {
    decision: 'allow',
    content: draft,
    disclaimer: null,
    blocked: false,
  }
}

export const reviewerPolicyMessages = {
  blocked: BLOCKED_MESSAGE,
  unavailableDisclaimer: REVIEW_UNAVAILABLE_DISCLAIMER,
} as const
