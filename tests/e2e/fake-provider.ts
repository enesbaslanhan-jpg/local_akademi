import Fastify from 'fastify'
import cors from '@fastify/cors'
import { randomUUID } from 'crypto'

export interface FakeProviderConfig {
  port: number
  defaultResponse?: string
  streamingChunks?: string[]
  shouldTimeout?: boolean
  shouldError?: boolean
  errorStatus?: number
}

export async function startFakeProvider(config: FakeProviderConfig) {
  const app = Fastify({ logger: false })

  await app.register(cors, { origin: true })

  app.post('/v1/chat/completions', async (request, reply) => {
    const body = request.body as any
    const isStream = body?.stream === true

    if (config.shouldTimeout) {
      return
    }

    if (config.shouldError) {
      return reply.status(config.errorStatus || 500).send({ error: 'Mock provider error' })
    }

    if (isStream) {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      })

      const chunks = config.streamingChunks || ['Bu bir test yanıtıdır.']

      reply.raw.write(`data: {"choices":[{"delta":{"role":"assistant","content":""},"finish_reason":null}]}\n\n`)

      for (const chunk of chunks) {
        reply.raw.write(`data: {"choices":[{"delta":{"content":"${chunk}"},"finish_reason":null}]}\n\n`)
      }

      reply.raw.write(`data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}\n\n`)
      reply.raw.write('data: [DONE]\n\n')
      reply.raw.end()
      return reply
    }

    const content = config.defaultResponse || 'Bu bir mock AI yanıtıdır. Gerçek bir AI çağrısı yapılmamıştır.'
    return {
      id: `chatcmpl-${randomUUID()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body?.model || 'mock-model',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    }
  })

  await app.listen({ port: config.port, host: '127.0.0.1' })
  return app
}
