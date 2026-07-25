import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  evaluateReviewerPredictions,
  reviewerEvalFixtureSchema,
  type ReviewerEvalFixture,
} from '../src/services/ai-reviewer'

const fixtureInput = JSON.parse(
  readFileSync('tests/fixtures/ai-reviewer-eval.tr.json', 'utf8'),
)
const fixture: ReviewerEvalFixture =
  reviewerEvalFixtureSchema.parse(fixtureInput)

function perfectPredictions() {
  return fixture.cases.map(testCase => ({
    caseId: testCase.id,
    result: {
      decision: testCase.expected.decision,
      issueCodes: testCase.expected.issueCodes,
      groundednessScore: testCase.expected.issueCodes.includes(
        'unsupported_claim',
      )
        ? 0.3
        : 0.9,
      pedagogicalScore: testCase.expected.issueCodes.includes(
        'poor_pedagogy',
      )
        ? 0.3
        : 0.9,
      confidence: 0.9,
      evidenceIds: testCase.evidenceKeys.map(
        key => fixture.evidenceRegistry[key].id,
      ),
      requiresHumanReview: testCase.expected.critical,
      safeReasonCode:
        testCase.expected.issueCodes[0] || 'grounded_answer',
    },
  }))
}

describe('AI reviewer Turkish gold-set fixture', () => {
  it('contains 50 unique, valid cases with all evaluation groups', () => {
    expect(fixture.cases).toHaveLength(50)
    expect(new Set(fixture.cases.map(testCase => testCase.id)).size).toBe(50)
    expect(new Set(fixture.cases.map(testCase => testCase.group))).toEqual(
      new Set([
        'grounded_safe',
        'regulated_disclaimer',
        'unsupported_claim',
        'unsafe_or_secret',
        'prompt_injection',
        'pedagogy',
      ]),
    )
  })

  it('rejects duplicate case IDs', () => {
    const invalid = structuredClone(fixtureInput)
    invalid.cases[1].id = invalid.cases[0].id
    expect(reviewerEvalFixtureSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects unknown evidence references', () => {
    const invalid = structuredClone(fixtureInput)
    invalid.cases[0].evidenceKeys = ['unknown-evidence']
    expect(reviewerEvalFixtureSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('AI reviewer offline acceptance gates', () => {
  it('passes a complete reference prediction set', () => {
    const report = evaluateReviewerPredictions(
      fixture,
      perfectPredictions(),
    )
    expect(report.passed).toBe(true)
    expect(report.metrics).toEqual({
      coverage: 1,
      schemaValidity: 1,
      decisionAccuracy: 1,
      falseBlockRate: 0,
      blockRecall: 1,
      unsupportedClaimRecall: 1,
      unavailableRate: 0,
    })
    expect(report.totals.criticalMisses).toBe(0)
  })

  it('fails when false blocks exceed the pilot threshold', () => {
    const predictions = perfectPredictions()
    for (const id of ['safe-01', 'safe-02', 'safe-03']) {
      const prediction = predictions.find(item => item.caseId === id)!
      prediction.result.decision = 'block'
    }
    const report = evaluateReviewerPredictions(fixture, predictions)
    expect(report.passed).toBe(false)
    expect(report.gates.falseBlockRate.passed).toBe(false)
  })

  it('fails closed on a critical unsafe miss', () => {
    const predictions = perfectPredictions()
    const prediction = predictions.find(
      item => item.caseId === 'unsafe-01',
    )!
    prediction.result.decision = 'allow'
    const report = evaluateReviewerPredictions(fixture, predictions)
    expect(report.passed).toBe(false)
    expect(report.totals.criticalMisses).toBe(1)
    expect(report.gates.criticalMisses.passed).toBe(false)
  })

  it('counts invalid or missing results as unavailable', () => {
    const predictions: any[] = perfectPredictions()
    predictions[0].result.confidence = 2
    predictions[1].result = { decision: 'unknown' }
    predictions.splice(2, 1)
    const report = evaluateReviewerPredictions(fixture, predictions)
    expect(report.passed).toBe(false)
    expect(report.totals.unavailable).toBe(3)
    expect(report.gates.schemaValidity.passed).toBe(false)
    expect(report.gates.unavailableRate.passed).toBe(false)
    expect(report.gates.coverage.passed).toBe(false)
  })

  it('does not improve recall by omitting unsupported-claim predictions', () => {
    const predictions = perfectPredictions().filter(
      prediction => !prediction.caseId.startsWith('unsupported-'),
    )
    const report = evaluateReviewerPredictions(fixture, predictions)
    expect(report.metrics.unsupportedClaimRecall).toBe(0)
    expect(report.gates.unsupportedClaimRecall.passed).toBe(false)
  })
})
