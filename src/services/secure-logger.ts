export interface LogEntry {
  requestId?: string
  userId?: number
  provider?: string
  model?: string
  durationMs?: number
  errorCode?: string
  /**
   * Sağlayıcının döndürdüğü HTTP durum kodu.
   *
   * 🔴 Bu alan bir arıza teşhisinden sonra eklendi. Mistral
   * `mistral-large-latest` için 403 `tier_not_allowed` döndürüyordu ama
   * günlükte yalnız `PROVIDER_ERROR` görünüyordu; kod, fırlatılan
   * `GatewayProviderError.statusCode` içinde VARDI ve buraya
   * geçirilmediği için kayboluyordu. 401 (anahtar), 403 (plan), 429
   * (kota) ve 400 (model adı) birbirinden ayırt edilemiyordu.
   *
   * ⚠️ Sağlayıcının hata METNİ bilerek alınmıyor: bu kaydedici bir
   * izin listesi ve serbest metin, isteğe ait içeriği günlüğe
   * sızdırabilir. Sayısal durum kodu teşhis için yeterli ve güvenli.
   */
  providerStatus?: number
  tokenCount?: number
  riskLevel?: string
  message?: string
  reviewerStatus?: string
  reviewerDecision?: string
  reviewerFailureCode?: string
  reviewerLatencyMs?: number
  reviewerMode?: string
}

export function secureLog(entry: LogEntry): void {
  const safe: Record<string, unknown> = {}
  if (entry.requestId) safe.requestId = entry.requestId
  if (entry.userId) safe.userId = entry.userId
  if (entry.provider) safe.provider = entry.provider
  if (entry.model) safe.model = entry.model
  if (entry.durationMs !== undefined) safe.durationMs = entry.durationMs
  if (entry.errorCode) safe.errorCode = entry.errorCode
  if (entry.tokenCount !== undefined) safe.tokenCount = entry.tokenCount
  if (entry.riskLevel) safe.riskLevel = entry.riskLevel
  if (entry.message) safe.message = entry.message
  if (entry.reviewerStatus) safe.reviewerStatus = entry.reviewerStatus
  if (entry.reviewerDecision) safe.reviewerDecision = entry.reviewerDecision
  if (entry.reviewerFailureCode) safe.reviewerFailureCode = entry.reviewerFailureCode
  if (entry.reviewerLatencyMs !== undefined) safe.reviewerLatencyMs = entry.reviewerLatencyMs
  if (entry.reviewerMode) safe.reviewerMode = entry.reviewerMode
  console.info('[AIGW]', JSON.stringify(safe))
}

export function secureLogError(entry: LogEntry): void {
  const safe: Record<string, unknown> = {}
  if (entry.requestId) safe.requestId = entry.requestId
  if (entry.userId) safe.userId = entry.userId
  if (entry.provider) safe.provider = entry.provider
  if (entry.model) safe.model = entry.model
  if (entry.durationMs !== undefined) safe.durationMs = entry.durationMs
  if (entry.errorCode) safe.errorCode = entry.errorCode
  if (entry.providerStatus !== undefined) safe.providerStatus = entry.providerStatus
  if (entry.message) safe.message = entry.message
  console.warn('[AIGW-ERR]', JSON.stringify(safe))
}
