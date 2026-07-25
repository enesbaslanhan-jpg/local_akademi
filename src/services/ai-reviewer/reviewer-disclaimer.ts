import type { AiReviewerOutcome } from './types'

const STANDARD_DISCLAIMER =
  'Bu yanıt yerel kalite denetiminde ek doğrulama gerektiren noktalar içeriyor olabilir. İşlem yapmadan önce ilgili resmî kaynağı kontrol edin.'

const HIGH_RISK_DISCLAIMER =
  'Yerel kalite denetimi bu yanıtı yüksek riskli olarak işaretledi. Bu bilgiye dayanarak işlem yapmayın; resmî kaynağı veya yetkili bir uzmanı doğrulayın.'

export function getAiReviewerDisclaimer(
  outcome: AiReviewerOutcome | null,
): string | null {
  if (
    !outcome ||
    outcome.status !== 'reviewed' ||
    outcome.result.decision === 'allow'
  ) {
    return null
  }
  return outcome.result.decision === 'block'
    ? HIGH_RISK_DISCLAIMER
    : STANDARD_DISCLAIMER
}

export function formatAiReviewerDisclaimerContent(
  content: string,
  outcome: AiReviewerOutcome | null,
): string {
  const disclaimer = getAiReviewerDisclaimer(outcome)
  return disclaimer ? `${content}\n\n---\n${disclaimer}` : content
}
