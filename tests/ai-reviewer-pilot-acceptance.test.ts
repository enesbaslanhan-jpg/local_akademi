import { describe, expect, it } from 'vitest'
import {
  evaluateReviewerPilotAcceptance,
  getReviewerPilotAcceptanceConfig,
} from '../src/services/ai-reviewer'

describe('AI reviewer pilot acceptance', () => {
  it('reports progress without auto-approving rollout', () => {
    const result = evaluateReviewerPilotAcceptance({
      totals: { sampled: 50, reviewed: 49, unavailable: 1 },
      rates: { availability: 0.98 },
      latencyMs: { p95: 12000 },
    })

    expect(result.progress).toEqual({
      sampled: 50,
      target: 200,
      percent: 25,
    })
    expect(result.readyForHumanAudit).toBe(false)
    expect(result.readyForDisclaimerOnly).toBe(false)
    expect(result.gates.sampleSize).toBe(false)
  })

  it('requires human and critical-miss audits after machine gates pass', () => {
    const result = evaluateReviewerPilotAcceptance({
      totals: { sampled: 200, reviewed: 198, unavailable: 2 },
      rates: { availability: 0.99 },
      latencyMs: { p95: 59000 },
    })

    expect(result.readyForHumanAudit).toBe(true)
    expect(result.readyForDisclaimerOnly).toBe(false)
    expect(result.gates).toMatchObject({
      sampleSize: true,
      availability: true,
      latency: true,
      humanAudit: false,
      criticalMissAudit: false,
    })
  })

  it('fails availability and latency gates at unsafe values', () => {
    const result = evaluateReviewerPilotAcceptance({
      totals: { sampled: 200, reviewed: 190, unavailable: 10 },
      rates: { availability: 0.95 },
      latencyMs: { p95: 60001 },
    })

    expect(result.readyForHumanAudit).toBe(false)
    expect(result.gates.availability).toBe(false)
    expect(result.gates.latency).toBe(false)
  })

  it('bounds environment thresholds', () => {
    expect(
      getReviewerPilotAcceptanceConfig({
        AI_REVIEWER_PILOT_MIN_SAMPLES: '1',
        AI_REVIEWER_PILOT_MIN_AVAILABILITY: '2',
        AI_REVIEWER_PILOT_MAX_P95_MS: '1',
      }),
    ).toEqual({
      minimumSampled: 25,
      minimumAvailability: 1,
      maximumP95LatencyMs: 250,
      minimumHumanAudits: 20,
      humanAuditApproved: false,
    })
  })
})

describe('AI reviewer human audit gate', () => {
  it('opens disclaimer-only only after enough approved audits with no critical miss', () => {
    const result = evaluateReviewerPilotAcceptance(
      {
        totals: { sampled: 200, reviewed: 200, unavailable: 0 },
        rates: { availability: 1 },
        latencyMs: { p95: 1000 },
      },
      {
        minimumSampled: 200,
        minimumAvailability: 0.98,
        maximumP95LatencyMs: 60000,
        minimumHumanAudits: 20,
        humanAuditApproved: true,
      },
      { total: 20, criticalMisses: 0 },
    )
    expect(result.readyForDisclaimerOnly).toBe(true)
  })

  it('keeps the gate closed after a critical miss', () => {
    const result = evaluateReviewerPilotAcceptance(
      {
        totals: { sampled: 200 },
        rates: { availability: 1 },
        latencyMs: { p95: 1000 },
      },
      {
        minimumSampled: 200,
        minimumAvailability: 0.98,
        maximumP95LatencyMs: 60000,
        minimumHumanAudits: 20,
        humanAuditApproved: true,
      },
      { total: 20, criticalMisses: 1 },
    )
    expect(result.readyForDisclaimerOnly).toBe(false)
    expect(result.gates.criticalMissAudit).toBe(false)
  })
})
