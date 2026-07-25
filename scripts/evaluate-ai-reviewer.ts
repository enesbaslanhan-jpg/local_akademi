import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  evaluateReviewerPredictions,
  reviewerEvalFixtureSchema,
} from '../src/services/ai-reviewer/index.js'

const DEFAULT_FIXTURE = 'tests/fixtures/ai-reviewer-eval.tr.json'

function argumentValue(name: string): string | undefined {
  const inline = process.argv.find(argument => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(path), 'utf8'))
}

const fixturePath = argumentValue('--fixture') || DEFAULT_FIXTURE
const predictionsPath = argumentValue('--predictions')
const validateOnly = process.argv.includes('--validate-only')

let fixture: ReturnType<typeof reviewerEvalFixtureSchema.parse>
try {
  fixture = reviewerEvalFixtureSchema.parse(readJson(fixturePath))
} catch (error) {
  console.error('AI_REVIEWER_EVAL_FIXTURE_INVALID')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const groupDistribution = fixture.cases.reduce<Record<string, number>>(
  (counts, testCase) => {
    counts[testCase.group] = (counts[testCase.group] || 0) + 1
    return counts
  },
  {},
)

if (validateOnly) {
  console.log(JSON.stringify({
    valid: true,
    fixture: resolve(fixturePath),
    cases: fixture.cases.length,
    groups: groupDistribution,
    thresholds: fixture.thresholds,
    performsProviderCalls: false,
  }, null, 2))
} else if (!predictionsPath) {
  console.error(
    'Kullanım: npm run reviewer:eval -- --predictions=<reviewer-results.json>',
  )
  console.error(
    'Yalnız fixture doğrulamak için: npm run reviewer:eval:validate',
  )
  process.exitCode = 2
} else {
  const predictions = readJson(predictionsPath)
  const report = evaluateReviewerPredictions(fixture, predictions)
  console.log(JSON.stringify(report, null, 2))
  if (!report.passed) process.exitCode = 1
}
