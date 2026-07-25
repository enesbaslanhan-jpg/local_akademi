import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  aiReviewerResultSchema,
  aiReviewerResponseJsonSchema,
  buildReviewerMessages,
  applyReviewerRiskFloor,
  reviewerEvalFixtureSchema,
  type AiReviewerRequest,
  type AiReviewerResult,
} from '../src/services/ai-reviewer/index.js'

const DEFAULT_FIXTURE = 'tests/fixtures/ai-reviewer-eval.tr.json'
const DEFAULT_OUTPUT = 'outputs/reviewer-ollama-predictions.json'
const DEFAULT_URL = 'http://127.0.0.1:11434/v1/chat/completions'
const DEFAULT_MODEL = 'qwen3:4b-instruct'

interface Prediction {
  caseId: string
  result?: AiReviewerResult
  failureCode?: string
}

function argumentValue(name: string): string | undefined {
  const inline = process.argv.find(argument => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function assertLoopbackUrl(value: string): URL {
  const url = new URL(value)
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
  ) {
    throw new Error('OLLAMA_EVAL_LOCAL_URL_REQUIRED')
  }
  return url
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(path), 'utf8'))
}

function readPredictions(path: string): Prediction[] {
  try {
    const value = readJson(path)
    if (!Array.isArray(value)) return []
    return value.filter(
      item =>
        item &&
        typeof item === 'object' &&
        typeof (item as { caseId?: unknown }).caseId === 'string',
    ) as Prediction[]
  } catch {
    return []
  }
}

function savePredictions(path: string, predictions: Prediction[]): void {
  const absolutePath = resolve(path)
  mkdirSync(dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, `${JSON.stringify(predictions, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'w',
  })
}

async function requestPrediction(params: {
  url: URL
  model: string
  timeoutMs: number
  request: AiReviewerRequest
}): Promise<AiReviewerResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), params.timeoutMs)

  try {
    const response = await fetch(params.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        messages: buildReviewerMessages(params.request),
        temperature: 0,
        max_tokens: 500,
        stream: false,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'ai_reviewer_result',
            strict: true,
            schema: aiReviewerResponseJsonSchema,
          },
        },
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`OLLAMA_HTTP_${response.status}`)
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      throw new Error('OLLAMA_EMPTY_RESPONSE')
    }

    return applyReviewerRiskFloor(
      params.request,
      aiReviewerResultSchema.parse(JSON.parse(content)),
    )
  } finally {
    clearTimeout(timer)
  }
}

async function main(): Promise<void> {
  const fixturePath = argumentValue('--fixture') || DEFAULT_FIXTURE
  const outputPath = argumentValue('--output') || DEFAULT_OUTPUT
  const model =
    argumentValue('--model') ||
    process.env.AI_REVIEWER_MODEL ||
    process.env.OLLAMA_MODEL ||
    DEFAULT_MODEL
  const url = assertLoopbackUrl(
    argumentValue('--url') || process.env.OLLAMA_API_URL || DEFAULT_URL,
  )
  const timeoutMs = positiveInteger(
    argumentValue('--timeout-ms') || process.env.AI_REVIEWER_TIMEOUT_MS,
    60000,
  )
  const maxCases = positiveInteger(
    argumentValue('--max-cases'),
    Number.MAX_SAFE_INTEGER,
  )
  const caseId = argumentValue('--case-id')
  const overwrite = process.argv.includes('--overwrite')

  const fixture = reviewerEvalFixtureSchema.parse(readJson(fixturePath))
  const predictions = overwrite ? [] : readPredictions(outputPath)
  const casesById = new Map(
    fixture.cases.map(testCase => [testCase.id, testCase]),
  )
  for (const prediction of predictions) {
    const testCase = casesById.get(prediction.caseId)
    if (!testCase || !prediction.result) continue
    prediction.result = applyReviewerRiskFloor(
      {
        userMessage: testCase.userMessage,
        draft: testCase.draft,
        evidence: testCase.evidenceKeys.map(
          key => fixture.evidenceRegistry[key],
        ),
        riskLevel: testCase.riskLevel,
      },
      prediction.result,
    )
  }
  if (predictions.length > 0) {
    savePredictions(outputPath, predictions)
  }
  const completed = new Set(predictions.map(prediction => prediction.caseId))
  const selectedCases = caseId
    ? fixture.cases.filter(testCase => testCase.id === caseId)
    : fixture.cases
  if (caseId && selectedCases.length === 0) {
    throw new Error(`OLLAMA_EVAL_CASE_NOT_FOUND:${caseId}`)
  }
  const pending = selectedCases
    .filter(testCase => !completed.has(testCase.id))
    .slice(0, maxCases)

  console.log(JSON.stringify({
    event: 'ollama_reviewer_eval_started',
    fixtureCases: fixture.cases.length,
    alreadyCompleted: completed.size,
    scheduled: pending.length,
    model,
    endpoint: `${url.protocol}//${url.host}${url.pathname}`,
    output: resolve(outputPath),
  }, null, 2))

  for (const [index, testCase] of pending.entries()) {
    const request: AiReviewerRequest = {
      userMessage: testCase.userMessage,
      draft: testCase.draft,
      evidence: testCase.evidenceKeys.map(key => fixture.evidenceRegistry[key]),
      riskLevel: testCase.riskLevel,
    }

    let prediction: Prediction
    try {
      prediction = {
        caseId: testCase.id,
        result: await requestPrediction({ url, model, timeoutMs, request }),
      }
    } catch (error) {
      prediction = {
        caseId: testCase.id,
        failureCode:
          error instanceof Error && error.name === 'AbortError'
            ? 'reviewer_timeout'
            : 'reviewer_provider_or_schema_error',
      }
    }

    predictions.push(prediction)
    savePredictions(outputPath, predictions)
    console.log(JSON.stringify({
      event: 'ollama_reviewer_eval_progress',
      completed: completed.size + index + 1,
      total: fixture.cases.length,
      caseId: testCase.id,
      status: prediction.result ? 'reviewed' : 'unavailable',
    }))
  }

  console.log(JSON.stringify({
    event: 'ollama_reviewer_eval_finished',
    predictions: predictions.length,
    remaining: Math.max(0, fixture.cases.length - predictions.length),
    output: resolve(outputPath),
  }, null, 2))
}

void main().catch(error => {
  console.error(
    error instanceof Error ? error.message : 'OLLAMA_REVIEWER_EVAL_FAILED',
  )
  process.exitCode = 1
})
