import type {
  ConfidenceComponent,
  ModelAssumptionInput,
  ModelConfidence,
  ValidationCheck,
} from './types.js'

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function sourceScore(sourceType: ModelAssumptionInput['sourceType']): number {
  if (sourceType === 'approved_dataset' || sourceType === 'market_data') return 95
  if (sourceType === 'document') return 85
  if (sourceType === 'business_record' || sourceType === 'case') return 80
  return 55
}

export function calculateModelConfidence(params: {
  requiredInputCount: number
  suppliedInputCount: number
  assumptions: ModelAssumptionInput[]
  checks: ValidationCheck[]
}): ModelConfidence {
  const completeness = params.requiredInputCount === 0
    ? 100
    : clamp(params.suppliedInputCount / params.requiredInputCount * 100)

  const assumptions = params.assumptions
  const sourceReliability = assumptions.length
    ? clamp(assumptions.reduce((sum, item) => sum + sourceScore(item.sourceType), 0) / assumptions.length)
    : 45
  const userVerification = assumptions.length
    ? clamp(assumptions.filter(item => item.userVerified).length / assumptions.length * 100)
    : 25

  const now = Date.now()
  const dated = assumptions.filter(item => item.effectiveDate && !Number.isNaN(Date.parse(item.effectiveDate)))
  const recency = dated.length
    ? clamp(dated.reduce((sum, item) => {
      const ageDays = (now - Date.parse(item.effectiveDate!)) / 86_400_000
      return sum + (ageDays <= 90 ? 100 : ageDays <= 365 ? 75 : ageDays <= 730 ? 50 : 25)
    }, 0) / dated.length)
    : 40

  const assumptionIntensity = assumptions.length
    ? clamp(100 - assumptions.filter(item => item.sourceType === 'user' && !item.userVerified).length / assumptions.length * 60)
    : 45

  const relevantChecks = params.checks.filter(check => check.severity !== 'info')
  const passedChecks = relevantChecks.length
    ? clamp(relevantChecks.filter(check => check.passed).length / relevantChecks.length * 100)
    : 100

  const components: ConfidenceComponent[] = [
    { key: 'completeness', label: 'Veri tamlığı', score: completeness, reason: `${params.suppliedInputCount}/${params.requiredInputCount} zorunlu alan sağlandı.` },
    { key: 'recency', label: 'Veri güncelliği', score: recency, reason: dated.length ? `${dated.length} tarihli kaynak değerlendirildi.` : 'Girdi kaynaklarında etkili tarih belirtilmedi.' },
    { key: 'sourceReliability', label: 'Kaynak güvenilirliği', score: sourceReliability, reason: assumptions.length ? 'Kaynak türleri açıklanmış varsayımlar üzerinden puanlandı.' : 'Kaynak metadatası sağlanmadı.' },
    { key: 'userVerification', label: 'Kullanıcı doğrulaması', score: userVerification, reason: assumptions.length ? `${assumptions.filter(item => item.userVerified).length}/${assumptions.length} varsayım kullanıcı tarafından doğrulandı.` : 'Doğrulanmış varsayım yok.' },
    { key: 'assumptionIntensity', label: 'Varsayım yoğunluğu', score: assumptionIntensity, reason: 'Kaynağı olmayan ve doğrulanmayan kullanıcı varsayımları puanı düşürür.' },
    { key: 'passedChecks', label: 'Kontroller', score: passedChecks, reason: `${params.checks.filter(check => check.passed).length}/${params.checks.length} kontrol geçti.` },
  ]

  const score = clamp(
    completeness * 0.25
    + recency * 0.1
    + sourceReliability * 0.2
    + userVerification * 0.15
    + assumptionIntensity * 0.1
    + passedChecks * 0.2,
  )

  return {
    score,
    label: score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low',
    disclaimer: 'Bu gösterge istatistiksel doğruluk veya sonuç garantisi değildir; yalnız veri ve kontrol kalitesinin şeffaf özetidir.',
    components,
  }
}
