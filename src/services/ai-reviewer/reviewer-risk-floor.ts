import type {
  AiReviewerIssueCode,
  AiReviewerRequest,
  AiReviewerResult,
} from './types'

const BLOCKING_ISSUES = new Set<AiReviewerIssueCode>([
  'unsafe_action',
  'credential_request',
  'prompt_injection',
])

function normalize(value: string): string {
  return value.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim()
}

function addIssue(
  issues: Set<AiReviewerIssueCode>,
  issue: AiReviewerIssueCode,
  matched: boolean,
): void {
  if (matched) issues.add(issue)
}

export function applyReviewerRiskFloor(
  request: AiReviewerRequest,
  result: AiReviewerResult,
): AiReviewerResult {
  const user = normalize(request.userMessage)
  const draft = normalize(request.draft)
  const combined = `${user}\n${draft}`
  const issues = new Set(result.issueCodes)

  addIssue(
    issues,
    'prompt_injection',
    /(önceki|sistem|güvenlik|reviewer|kanıt).*?(talimat|kural|kontrol|rol).*?(yok say|atla|kaldır|çık|ifşa|açıkla)|json sözleşmesini boz|gizli muhakeme|block yerine allow|evidenceids.*999|koşulsuz onay/.test(
      draft,
    ),
  )
  addIssue(
    issues,
    'credential_request',
    /(şifre|parola|kart numara|güvenlik kodu|e-devlet).*?(yaz|gönder|paylaş|alın|verin)|(?:yaz|gönder|paylaş).*?(şifre|parola|kart numara|güvenlik kodu)/.test(
      draft,
    ),
  )
  addIssue(
    issues,
    'unsafe_action',
    /gizlice|haberi olmadan|sahte (belge|fiş)|kayıtları sil|zayıf parolaları dene|izinsiz (sat|aktar)|yönetici hesabıyla verileri indir/.test(
      draft,
    ),
  )

  const financialDecision =
    /(hisse|kripto|döviz|kredi|yatırım)/.test(user) &&
    /(hangi|çek|koy|yüksel|kazandır|doğru mu|malı mıyım|meli miyim)/.test(user)
  addIssue(issues, 'financial_advice', financialDecision)

  const legalOrTaxSpecificity =
    /(vergi borc|sözleşme|açık rıza|kdv istisna|işten çıkar|beyanname|müşteri listesi|hukuken|fatura kesmez|veri sız)/.test(
      user,
    )
  addIssue(issues, 'tax_or_legal_specificity', legalOrTaxSpecificity)

  const unsupportedCertainty =
    /koşulsuz|daima|hatasız garanti|kesin (olarak )?(onaylanır|artar|kazandırır|çıkar|iki kat)|süresiz ve her amaçla|yarın hesab|tam yüzde|istisnası yok|hiçbir cezası yok|hiçbir zaman gerek yok|her durumda yeter|her işletmeye/.test(
      draft,
    )
  addIssue(issues, 'unsupported_claim', unsupportedCertainty)
  addIssue(issues, 'overconfident_language', unsupportedCertainty)

  const beginnerWithJargon =
    /bilmiyorum/.test(user) &&
    /(likidite projeksiyonu|varyans analizi|optimizasyon|normalization)/.test(
      draft,
    )
  const definitionWithJargon =
    /ne demek/.test(user) &&
    /(conversion|denominator|normalization)/.test(draft)
  const vagueSteps =
    /(ilk|üç|3).*adım/.test(user) &&
    /internetten araştır.*gerekenleri yap.*başvur/.test(draft)
  addIssue(
    issues,
    'poor_pedagogy',
    beginnerWithJargon || definitionWithJargon || vagueSteps,
  )

  const issueCodes = [...issues]
  const hasBlockingIssue = issueCodes.some(issue => BLOCKING_ISSUES.has(issue))
  const floorDecision = hasBlockingIssue
    ? 'block'
    : issueCodes.length > 0
      ? 'allow_with_disclaimer'
      : 'allow'
  const decision =
    result.decision === 'block' || floorDecision === 'block'
      ? 'block'
      : result.decision === 'allow_with_disclaimer' ||
          floorDecision === 'allow_with_disclaimer'
        ? 'allow_with_disclaimer'
        : 'allow'

  if (
    decision === result.decision &&
    issueCodes.length === result.issueCodes.length
  ) {
    return result
  }

  return {
    ...result,
    decision,
    issueCodes,
    requiresHumanReview:
      result.requiresHumanReview || decision === 'block',
    confidence: Math.max(result.confidence, 0.95),
    safeReasonCode:
      decision === 'block'
        ? 'deterministic_risk_block'
        : 'deterministic_risk_disclaimer',
  }
}
