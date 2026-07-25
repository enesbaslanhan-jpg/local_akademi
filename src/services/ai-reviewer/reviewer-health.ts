function boundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(Math.floor(parsed), max))
}

function getLoopbackOllamaOrigin(): URL | null {
  try {
    const configured =
      process.env.OLLAMA_API_URL ||
      'http://127.0.0.1:11434/v1/chat/completions'
    const url = new URL(configured)
    if (
      url.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
    ) {
      return null
    }
    return new URL(url.origin)
  } catch {
    return null
  }
}

export async function getReviewerOllamaHealth() {
  const provider = (
    process.env.AI_REVIEWER_PROVIDER || 'inherit'
  ).toLowerCase()
  const model =
    process.env.AI_REVIEWER_MODEL ||
    process.env.OLLAMA_MODEL ||
    'qwen3:4b-instruct'

  if (provider !== 'ollama') {
    return {
      configured: false,
      reachable: null,
      model,
      modelAvailable: null,
      latencyMs: null,
    }
  }

  const origin = getLoopbackOllamaOrigin()
  if (!origin) {
    return {
      configured: true,
      reachable: false,
      model,
      modelAvailable: false,
      latencyMs: null,
      errorCode: 'OLLAMA_NON_LOOPBACK_URL',
    }
  }

  const startedAt = Date.now()
  const controller = new AbortController()
  const timeoutMs = boundedInteger(
    process.env.AI_REVIEWER_HEALTH_TIMEOUT_MS,
    1500,
    250,
    5000,
  )
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(new URL('/api/tags', origin), {
      signal: controller.signal,
    })
    if (!response.ok) {
      return {
        configured: true,
        reachable: false,
        model,
        modelAvailable: false,
        latencyMs: Date.now() - startedAt,
        errorCode: 'OLLAMA_HEALTH_HTTP_ERROR',
      }
    }
    const data = (await response.json()) as {
      models?: Array<{ name?: unknown; model?: unknown }>
    }
    const names = (data.models || [])
      .flatMap(item => [item.name, item.model])
      .filter((value): value is string => typeof value === 'string')
    return {
      configured: true,
      reachable: true,
      model,
      modelAvailable: names.includes(model),
      latencyMs: Date.now() - startedAt,
    }
  } catch {
    return {
      configured: true,
      reachable: false,
      model,
      modelAvailable: false,
      latencyMs: Date.now() - startedAt,
      errorCode: 'OLLAMA_HEALTH_UNAVAILABLE',
    }
  } finally {
    clearTimeout(timer)
  }
}
