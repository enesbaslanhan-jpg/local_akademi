export interface ReviewerPilotMetrics {
  totals?: {
    sampled?: number
    reviewed?: number
    unavailable?: number
  }
  rates?: {
    availability?: number
  }
  latencyMs?: {
    p95?: number | null
  }
}

export interface ReviewerPilotAcceptanceConfig {
  minimumSampled: number
  minimumAvailability: number
  maximumP95LatencyMs: number
  minimumHumanAudits?: number
  humanAuditApproved?: boolean
}

export interface ReviewerHumanAuditSummary {
  total: number
  criticalMisses: number
}

export interface ReviewerPilotAcceptance {
  readyForHumanAudit: boolean
  readyForDisclaimerOnly: boolean
  progress: {
    sampled: number
    target: number
    percent: number
  }
  gates: {
    sampleSize: boolean
    availability: boolean
    latency: boolean
    humanAudit: boolean
    criticalMissAudit: boolean
  }
  observed: {
    availability: number
    p95LatencyMs: number | null
  }
  pendingActions: string[]
}

function boundedNumber(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(parsed, max))
}

export function getReviewerPilotAcceptanceConfig(
  env: NodeJS.ProcessEnv = process.env,
): ReviewerPilotAcceptanceConfig {
  return {
    minimumSampled: Math.floor(
      boundedNumber(
        env.AI_REVIEWER_PILOT_MIN_SAMPLES,
        200,
        25,
        10000,
      ),
    ),
    minimumAvailability: boundedNumber(
      env.AI_REVIEWER_PILOT_MIN_AVAILABILITY,
      0.98,
      0.5,
      1,
    ),
    maximumP95LatencyMs: Math.floor(
      boundedNumber(
        env.AI_REVIEWER_PILOT_MAX_P95_MS,
        Number(env.AI_REVIEWER_TIMEOUT_MS) || 60000,
        250,
        120000,
      ),
    ),
    minimumHumanAudits: Math.floor(
      boundedNumber(
        env.AI_REVIEWER_HUMAN_AUDIT_MIN_SAMPLES,
        20,
        5,
        1000,
      ),
    ),
    humanAuditApproved:
      env.AI_REVIEWER_HUMAN_AUDIT_APPROVED === 'true',
  }
}

export function evaluateReviewerPilotAcceptance(
  metrics: ReviewerPilotMetrics,
  config: ReviewerPilotAcceptanceConfig =
    getReviewerPilotAcceptanceConfig(),
  humanAudit: ReviewerHumanAuditSummary = {
    total: 0,
    criticalMisses: 0,
  },
): ReviewerPilotAcceptance {
  const sampled = Math.max(0, metrics.totals?.sampled || 0)
  const minimumHumanAudits = config.minimumHumanAudits ?? 20
  const availability = Math.max(
    0,
    Math.min(1, metrics.rates?.availability || 0),
  )
  const p95LatencyMs = metrics.latencyMs?.p95 ?? null
  const gates = {
    sampleSize: sampled >= config.minimumSampled,
    availability:
      sampled > 0 && availability >= config.minimumAvailability,
    latency:
      p95LatencyMs !== null &&
      p95LatencyMs <= config.maximumP95LatencyMs,
    humanAudit:
      humanAudit.total >= minimumHumanAudits &&
      config.humanAuditApproved === true,
    criticalMissAudit:
      humanAudit.total >= minimumHumanAudits &&
      humanAudit.criticalMisses === 0,
  }
  const pendingActions: string[] = []
  if (!gates.sampleSize) {
    pendingActions.push(
      `${Math.max(0, config.minimumSampled - sampled)} ek shadow sonucu topla`,
    )
  }
  if (!gates.availability) {
    pendingActions.push(
      `Reviewer kullanılabilirliğini en az ${Math.round(config.minimumAvailability * 100)}% seviyesine getir`,
    )
  }
  if (!gates.latency) {
    pendingActions.push(
      `p95 gecikmesini ${config.maximumP95LatencyMs} ms veya altına getir`,
    )
  }
  if (!gates.humanAudit) {
    pendingActions.push(
      `${Math.max(0, minimumHumanAudits - humanAudit.total)} ek içeriksiz insan denetimi kaydet ve açık onayı ver`,
    )
  }
  if (!gates.criticalMissAudit) {
    pendingActions.push(
      'Kritik güvenlik kaçırması olmadığını insan denetimiyle doğrula',
    )
  }

  const readyForHumanAudit =
    gates.sampleSize && gates.availability && gates.latency

  return {
    readyForHumanAudit,
    readyForDisclaimerOnly:
      readyForHumanAudit &&
      gates.humanAudit &&
      gates.criticalMissAudit,
    progress: {
      sampled,
      target: config.minimumSampled,
      percent: Number(
        Math.min(100, (sampled / config.minimumSampled) * 100).toFixed(1),
      ),
    },
    gates,
    observed: {
      availability,
      p95LatencyMs,
    },
    pendingActions,
  }
}
