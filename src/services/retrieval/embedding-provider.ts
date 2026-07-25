export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedMany?(texts: string[]): Promise<number[][]>
}

function getLoopbackOrigin(): URL {
  const configured =
    process.env.OLLAMA_API_URL ||
    'http://127.0.0.1:11434/v1/chat/completions'
  const url = new URL(configured)
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
  ) {
    throw new Error('EMBEDDING_NON_LOOPBACK_URL')
  }
  return new URL(url.origin)
}

function boundedTimeout(): number {
  const parsed = Number(process.env.RAG_EMBEDDING_TIMEOUT_MS)
  if (!Number.isFinite(parsed)) return 30000
  return Math.max(1000, Math.min(Math.floor(parsed), 60000))
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    const vectors = await this.embedMany([text])
    return vectors[0] || []
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    const normalized = texts.map(text => text.trim().slice(0, 12000))
    if (
      normalized.length === 0 ||
      normalized.length > 32 ||
      normalized.some(text => !text)
    ) {
      throw new Error('EMBEDDING_INVALID_BATCH')
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), boundedTimeout())
    try {
      const response = await fetch(
        new URL('/api/embed', getLoopbackOrigin()),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model:
              process.env.RAG_EMBEDDING_MODEL ||
              'nomic-embed-text',
            input: normalized,
          }),
          signal: controller.signal,
        },
      )
      if (!response.ok) throw new Error('EMBEDDING_PROVIDER_ERROR')
      const payload = (await response.json()) as {
        embeddings?: unknown
      }
      const vectors = payload.embeddings
      if (
        !Array.isArray(vectors) ||
        vectors.length !== normalized.length ||
        !vectors.every(
          vector =>
            Array.isArray(vector) &&
            vector.length > 0 &&
            vector.length <= 4096 &&
            vector.every(value => Number.isFinite(value)),
        )
      ) {
        throw new Error('EMBEDDING_INVALID_VECTOR')
      }
      return vectors as number[][]
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'AbortError'
      ) {
        throw new Error('EMBEDDING_TIMEOUT')
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  }
}
