import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../services/api'

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('token', 'test-token')
})

describe('conversation.sendMessage body', () => {
  it('includes knowledgeObjectCode when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'ok' }),
    })

    await api.conversation.sendMessage(1, 'merhaba', 'KO-SELECTED')

    expect(global.fetch).toHaveBeenCalled()
    const [, options] = global.fetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.message).toBe('merhaba')
    expect(body.knowledgeObjectCode).toBe('KO-SELECTED')
  })

  it('omits knowledgeObjectCode when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'ok' }),
    })

    await api.conversation.sendMessage(1, 'merhaba')

    const [, options] = global.fetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.message).toBe('merhaba')
    expect(body).not.toHaveProperty('knowledgeObjectCode')
  })

  it('includes contextOverride when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'ok' }),
    })

    const contextOverride = { contextType: 'knowledge_object', title: 'Test' }
    await api.conversation.sendMessage(1, 'merhaba', undefined, contextOverride)

    const [, options] = global.fetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.contextOverride).toEqual(contextOverride)
  })
})

describe('conversation.streamMessage body', () => {
  it('includes knowledgeObjectCode when provided', async () => {
    const stream = new ReadableStream({
      start(controller) { controller.close() }
    })
    global.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }))

    const onDone = vi.fn()
    await api.conversation.streamMessage({
      conversationId: 1,
      content: 'merhaba',
      knowledgeObjectCode: 'KO-SELECTED',
      onDone,
    })

    expect(global.fetch).toHaveBeenCalled()
    const [, options] = global.fetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.message).toBe('merhaba')
    expect(body.knowledgeObjectCode).toBe('KO-SELECTED')
  })

  it('omits knowledgeObjectCode when not provided', async () => {
    const stream = new ReadableStream({
      start(controller) { controller.close() }
    })
    global.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }))

    const onDone = vi.fn()
    await api.conversation.streamMessage({
      conversationId: 1,
      content: 'merhaba',
      onDone,
    })

    const [, options] = global.fetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.message).toBe('merhaba')
    expect(body).not.toHaveProperty('knowledgeObjectCode')
  })

  it('includes contextOverride when provided', async () => {
    const stream = new ReadableStream({
      start(controller) { controller.close() }
    })
    global.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }))

    const contextOverride = { contextType: 'feed_recommendation', title: 'Feed' }
    await api.conversation.streamMessage({
      conversationId: 1,
      content: 'merhaba',
      contextOverride,
      onDone: vi.fn(),
    })

    const [, options] = global.fetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.contextOverride).toEqual(contextOverride)
  })
})
