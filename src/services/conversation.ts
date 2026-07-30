import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

import type { AiProvider, ChatMessage, TokenUsage } from './ai-provider'
import type { KnowledgeObjectResult } from './retrieval/types'
import {
  callAiProviderWithRetry, streamAiResponse, buildSystemPrompt,
  resolveKnowledgeContext,
  normalizeKnowledgeObjectCode,
  validateKnowledgeObjectCode,
  extractSelectedKnowledgeObjectCode,
  getRelevantKnowledgeObjects,
  formatKnowledgeContext,
  needsClarification
} from './ai-provider'
import type { Citation } from './ai-gateway'
import { buildMemoryContext } from './memory/context-builder'
import { streamSlotManager } from './stream-manager'
import { extractAndStoreMemories, buildExtractionPrompt } from './memory/memory-extractor'
import { updateConversationSummary } from './memory/summary-service'

const MAX_TITLE_LENGTH = 120
const MAX_MESSAGE_LENGTH = 8000
const CONTEXT_MESSAGE_LIMIT = 6

async function runBackgroundMemoryExtraction(
  userId: number,
  conversationId: number,
  userMessage: string,
  assistantReply: string,
  sourceMessageId: number
): Promise<void> {
  try {
    const extractPrompt = buildExtractionPrompt(userMessage, assistantReply)
    const extractMsgs: ChatMessage[] = [{ role: 'user', content: extractPrompt }]
    const result = await callAiProviderWithRetry(extractMsgs)
    if (result?.content) {
      await extractAndStoreMemories(
        { prisma },
        userId,
        userMessage,
        assistantReply,
        sourceMessageId,
        conversationId,
        result.content
      )
    }
  } catch {
    // best-effort
  }
}

async function runBackgroundSummaryUpdate(
  conversationId: number,
  userId: number,
  lastMessageId: number
): Promise<void> {
  try {
    const existingSummary = await prisma.conversationSummary.findUnique({
      where: { conversationId }
    })
    const msgCount = await prisma.conversationMessage.count({
      where: { conversationId }
    })
    const recentMsgs = await prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { role: true, content: true }
    })
    const newMessages = recentMsgs.reverse().map(m =>
      `${m.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${m.content}`
    ).join('\n')

    await updateConversationSummary({
      prisma,
      conversationId,
      userId,
      existingSummary: existingSummary?.summary ?? null,
      newMessages,
      messageCount: msgCount,
      lastMessageId
    })
  } catch {
    // best-effort
  }
}

function safeJsonParse(value: string | null | undefined): unknown {
  if (!value) return null
  try { return JSON.parse(value) } catch { return null }
}

function safeJsonStringify(value: unknown): string | null {
  if (value === undefined || value === null) return null
  try { return JSON.stringify(value) } catch { return null }
}

function toConversationCitation(ko: Citation): Citation {
  return {
    id: ko.id,
    title: ko.title,
    code: ko.code,
    category: ko.category ? { name: ko.category.name } : null,
    sourceRefs: ko.sourceRefs?.map(source => ({
      sourceId: source.sourceId,
      title: source.title,
      url: source.url,
      authorityLevel: source.authorityLevel,
    })),
  }
}

function parseId(id: string): number | null {
  const n = parseInt(id, 10)
  if (!Number.isInteger(n) || n < 1) return null
  return n
}

interface ValidationError {
  code: string
  message: string
}

function validationError(code: string, message: string): { error: ValidationError } {
  return { error: { code, message } }
}

async function ensureOwnership(conversationId: number, userId: number) {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, userId, deletedAt: null }
  })
  if (!conv) {
    throw { statusCode: 404, error: { code: 'NOT_FOUND', message: 'Conversation not found' } }
  }
  return conv
}

async function ensureMessageOwnership(messageId: number, conversationId: number, userId: number) {
  const msg = await prisma.conversationMessage.findFirst({
    where: { id: messageId, conversationId },
    include: { conversation: { select: { userId: true, deletedAt: true } } }
  })
  if (!msg || msg.conversation.userId !== userId || msg.conversation.deletedAt) {
    throw { statusCode: 404, error: { code: 'NOT_FOUND', message: 'Message not found' } }
  }
  return msg
}

async function generateTitle(firstMessage: string): Promise<string> {
  const cleaned = firstMessage.trim().slice(0, 60)
  if (cleaned.length <= 40) return cleaned
  const lastSpace = cleaned.lastIndexOf(' ', 40)
  return lastSpace > 0 ? cleaned.slice(0, lastSpace) + '...' : cleaned.slice(0, 40) + '...'
}

interface BuildContextResult {
  chatMessages: ChatMessage[]
  systemMessage: ChatMessage
  knowledgeObjects: KnowledgeObjectResult[]
  knowledgeContext: string
  koTitle: string | undefined
  selectedKOTitle: string | undefined
}

type ResolvedContext = Awaited<ReturnType<typeof resolveKnowledgeContext>>

async function buildContext(
  conversationId: number,
  user: { id: number; email: string; role: string },
  message: string,
  resolvedContext?: ResolvedContext,
): Promise<BuildContextResult> {
  const recentMessages = await prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: CONTEXT_MESSAGE_LIMIT
  })
  const chatMessages: ChatMessage[] = recentMessages
    .reverse()
    .filter(m => {
      if (m.error) return false
      if (m.role !== 'user' && m.role !== 'assistant') return false
      if (!m.content) return false
      if (/(?:\?{2,}|[A-Za-zÇĞİÖŞÜçğıöşü]\?[A-Za-zÇĞİÖŞÜçğıöşü])/.test(m.content)) return false
      return true
    })
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const [dbUser, ctx] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { name: true, role: true } }),
    resolvedContext ?? resolveKnowledgeContext(message)
  ])
  const systemContent = buildSystemPrompt(
    { name: dbUser?.name || user.email, role: dbUser?.role || user.role },
    ctx.knowledgeContext,
    ctx.koTitle,
    ctx.selectedKOTitle
  )
  const systemMessage: ChatMessage = { role: 'system', content: systemContent }

  return {
    chatMessages,
    systemMessage,
    knowledgeObjects: ctx.knowledgeObjects,
    knowledgeContext: ctx.knowledgeContext,
    koTitle: ctx.koTitle,
    selectedKOTitle: ctx.selectedKOTitle
  }
}

function sendSSE(reply: any, event: string, data: Record<string, unknown>) {
  reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function conversationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request, reply) => {
    const user = request.user
    const { archived } = request.query as { archived?: string }

    let archivedAtFilter: { not: null } | null
    if (archived === 'true') {
      archivedAtFilter = { not: null }
    } else if (archived === 'false' || archived === undefined) {
      archivedAtFilter = null
    } else {
      return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz archived parametresi'))
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id, deletedAt: null, archivedAt: archivedAtFilter },
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true }
        },
        _count: { select: { messages: true } }
      }
    })
    return {
      conversations: conversations.map(c => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        archivedAt: c.archivedAt,
        lastMessageAt: c.lastMessageAt,
        model: c.model,
        provider: c.provider,
        messageCount: c._count.messages,
        lastMessage: c.messages[0] ? {
          content: c.messages[0].content.slice(0, 100),
          role: c.messages[0].role,
          createdAt: c.messages[0].createdAt
        } : null
      }))
    }
  })

  fastify.post('/', async (request, reply) => {
    const user = request.user
    const { title } = request.body as { title?: string }
    const trimmed = title?.trim() || ''
    if (trimmed.length > MAX_TITLE_LENGTH) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', `Başlık en fazla ${MAX_TITLE_LENGTH} karakter olabilir`))
    }
    const conversation = await prisma.conversation.create({
      data: { userId: user.id, title: trimmed || 'Yeni Sohbet' }
    })
    return reply.status(201).send({ conversation })
  })

  fastify.get('/:id', async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }
    const convId = parseId(id)
    if (!convId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz sohbet ID'))
    const conv = await ensureOwnership(convId, user.id)
    const messages = await prisma.conversationMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, role: true, content: true, citations: true,
        knowledgeObjects: true, tokenUsage: true, error: true,
        generationStatus: true, regeneratedFromMessageId: true, editedFromMessageId: true,
        createdAt: true, updatedAt: true
      }
    })
    return {
      conversation: {
        id: conv.id, title: conv.title, createdAt: conv.createdAt,
        updatedAt: conv.updatedAt, lastMessageAt: conv.lastMessageAt,
        model: conv.model, provider: conv.provider
      },
      messages: messages.map(m => ({
        ...m,
        citations: safeJsonParse(m.citations),
        knowledgeObjects: safeJsonParse(m.knowledgeObjects),
        tokenUsage: safeJsonParse(m.tokenUsage)
      }))
    }
  })

  fastify.patch('/:id', async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }
    const { title } = request.body as { title: string }
    const trimmed = title?.trim() || ''
    if (!trimmed) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Başlık boş olamaz'))
    }
    if (trimmed.length > MAX_TITLE_LENGTH) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', `Başlık en fazla ${MAX_TITLE_LENGTH} karakter olabilir`))
    }
    const convId = parseId(id)
    if (!convId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz sohbet ID'))
    await ensureOwnership(convId, user.id)
    const conversation = await prisma.conversation.update({
      where: { id: convId },
      data: { title: trimmed }
    })
    return { conversation }
  })

  fastify.delete('/:id', async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }
    const convId = parseId(id)
    if (!convId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz sohbet ID'))
    await ensureOwnership(convId, user.id)
    await prisma.conversation.update({
      where: { id: convId },
      data: { deletedAt: new Date() }
    })
    return reply.status(204).send()
  })

  fastify.patch('/:id/archive', async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }
    const convId = parseId(id)
    if (!convId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz sohbet ID'))
    await ensureOwnership(convId, user.id)
    const conversation = await prisma.conversation.update({
      where: { id: convId },
      data: { archivedAt: new Date() }
    })
    return { conversation }
  })

  fastify.patch('/:id/unarchive', async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }
    const convId = parseId(id)
    if (!convId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz sohbet ID'))
    await ensureOwnership(convId, user.id)
    const conversation = await prisma.conversation.update({
      where: { id: convId },
      data: { archivedAt: null }
    })
    return { conversation }
  })

  fastify.post('/:id/messages', async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }
    const { message, knowledgeObjectCode: rawCode } = request.body as { message: string; knowledgeObjectCode?: string }

    const convId = parseId(id)
    if (!convId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz sohbet ID'))

    const cleanMessage = message?.trim() || ''
    if (!cleanMessage) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Mesaj boş olamaz'))
    }
    if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir`))
    }

    const knowledgeObjectCode = normalizeKnowledgeObjectCode(rawCode)
    if (knowledgeObjectCode) {
      const codeValidation = validateKnowledgeObjectCode(knowledgeObjectCode)
      if (!codeValidation.valid) {
        return reply.status(422).send(validationError(codeValidation.error!.code, codeValidation.error!.message))
      }
    }

    const conv = await ensureOwnership(convId, user.id)
    if (conv.archivedAt) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Arşivlenmiş sohbete mesaj gönderilemez'))
    }

    const resolvedContext = await resolveKnowledgeContext(cleanMessage, knowledgeObjectCode)
    if (knowledgeObjectCode && !resolvedContext.selected) {
      return reply.status(404).send(validationError('NOT_FOUND', 'Knowledge object not found'))
    }

    await prisma.conversationMessage.create({
      data: { conversationId: convId, role: 'user', content: cleanMessage, generationStatus: 'completed' }
    })

    if (needsClarification(cleanMessage)) {
      const clarification = 'Elbette. Hangi konuda öneri istiyorsun? Örneğin müşteri artırma, sosyal medya, satış, maliyet azaltma veya yeni iş fikri diyebilirsin.'
      const assistantMsg = await prisma.conversationMessage.create({
        data: { conversationId: convId, role: 'assistant', content: clarification, generationStatus: 'completed' }
      })
      const now = new Date()
      const updateData: Record<string, unknown> = {
        lastMessageAt: now, updatedAt: now, provider: 'system', model: 'clarification-rule'
      }
      if (conv.title === 'Yeni Sohbet') {
        updateData.title = await generateTitle(cleanMessage)
      }
      await prisma.conversation.update({
        where: { id: convId },
        data: updateData as any
      })
      return {
        messageId: assistantMsg.id,
        reply: clarification,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        provider: 'system',
        model: 'clarification-rule',
        sources: []
      }
    }

    const { chatMessages, systemMessage, knowledgeObjects } = await buildContext(convId, user, cleanMessage, resolvedContext)

    const memCtx = await buildMemoryContext({
      prisma,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      conversationId: convId,
      userMessage: cleanMessage,
      recentMessages: chatMessages,
      systemPrompt: systemMessage.content
    })

    let result: { content: string; usage: TokenUsage; provider: AiProvider; model: string; citations?: { id: number; title: string; code: string | null; category: { name: string } | null }[] }
    try {
      result = await callAiProviderWithRetry(memCtx.systemMessages, knowledgeObjects)
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      const assistantMsg = await prisma.conversationMessage.create({
        data: { conversationId: convId, role: 'assistant', content: '', error: errorMsg, generationStatus: 'failed' }
      })
      const now = new Date()
      const updateData: Record<string, unknown> = {
        lastMessageAt: now, updatedAt: now
      }
      if (conv.title === 'Yeni Sohbet') {
        updateData.title = await generateTitle(cleanMessage)
      }
      await prisma.conversation.update({
        where: { id: convId },
        data: updateData as any
      })
      return {
        messageId: assistantMsg.id,
        reply: null,
        error: 'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      }
    }

    const assistantMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: convId, role: 'assistant', content: result.content,
        generationStatus: 'completed',
        tokenUsage: safeJsonStringify(result.usage),
        knowledgeObjects: knowledgeObjects.length > 0
          ? safeJsonStringify(knowledgeObjects.map(toConversationCitation))
          : null
      }
    })

    const now = new Date()
    const updateData: Record<string, unknown> = {
      lastMessageAt: now, updatedAt: now,
      provider: result.provider, model: result.model
    }
    if (conv.title === 'Yeni Sohbet') {
      updateData.title = await generateTitle(cleanMessage)
    }
    await prisma.conversation.update({
      where: { id: convId },
      data: updateData as any
    })

    if (result.content) {
      runBackgroundMemoryExtraction(
        user.id, convId, cleanMessage, result.content, assistantMsg.id
      )
      runBackgroundSummaryUpdate(convId, user.id, assistantMsg.id)
    }

    return {
      messageId: assistantMsg.id,
      reply: result.content,
      usage: {
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens
      },
      provider: result.provider,
      model: result.model,
      sources: knowledgeObjects.map(toConversationCitation)
    }
  })

  fastify.post('/:id/messages/stream', async (request, reply) => {
    const user = request.user
    const { id } = request.params as { id: string }
    const { message, knowledgeObjectCode: rawCode } = request.body as { message: string; knowledgeObjectCode?: string }

    const convId = parseId(id)
    if (!convId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz sohbet ID'))

    const cleanMessage = message?.trim() || ''
    if (!cleanMessage) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Mesaj boş olamaz'))
    }
    if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir`))
    }

    const knowledgeObjectCode = normalizeKnowledgeObjectCode(rawCode)
    if (knowledgeObjectCode) {
      const codeValidation = validateKnowledgeObjectCode(knowledgeObjectCode)
      if (!codeValidation.valid) {
        return reply.status(422).send(validationError(codeValidation.error!.code, codeValidation.error!.message))
      }
    }

    const conv = await ensureOwnership(convId, user.id)
    if (conv.archivedAt) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Arşivlenmiş sohbete mesaj gönderilemez'))
    }

    const resolvedContext = await resolveKnowledgeContext(cleanMessage, knowledgeObjectCode)
    if (knowledgeObjectCode && !resolvedContext.selected) {
      return reply.status(404).send(validationError('NOT_FOUND', 'Knowledge object not found'))
    }

    if (!streamSlotManager.checkRateLimit(user.id)) {
      return reply.status(429).send(validationError('RATE_LIMIT', 'Çok fazla istek gönderildi. Lütfen 1 dakika bekleyin.'))
    }
    const slotId = streamSlotManager.acquireSlot(user.id)
    if (!slotId) {
      return reply.status(429).send(validationError('CONCURRENT_LIMIT', 'Aynı anda en fazla 2 işlem yapabilirsiniz.'))
    }

    const userMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: convId, role: 'user', content: cleanMessage,
        generationStatus: 'completed'
      }
    })

    const now = new Date()
    await prisma.conversation.update({
      where: { id: convId },
      data: { lastMessageAt: now, updatedAt: now }
    })
    if (conv.title === 'Yeni Sohbet') {
      const newTitle = await generateTitle(cleanMessage)
      await prisma.conversation.update({
        where: { id: convId },
        data: { title: newTitle }
      })
    }

    if (needsClarification(cleanMessage)) {
      const clarification = 'Elbette. Hangi konuda öneri istiyorsun? Örneğin müşteri artırma, sosyal medya, satış, maliyet azaltma veya yeni iş fikri diyebilirsin.'
      const assistantMsg = await prisma.conversationMessage.create({
        data: { conversationId: convId, role: 'assistant', content: clarification, generationStatus: 'completed' }
      })
      const now2 = new Date()
      await prisma.conversation.update({
        where: { id: convId },
        data: { lastMessageAt: now2, updatedAt: now2, provider: 'system', model: 'clarification-rule' }
      })
      streamSlotManager.releaseSlot(user.id, slotId!)
      return {
        messageId: assistantMsg.id,
        reply: clarification,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        provider: 'system',
        model: 'clarification-rule',
        sources: []
      }
    }

    let slotReleased = false
    function ensureSlotReleased() {
      if (!slotReleased) {
        slotReleased = true
        streamSlotManager.releaseSlot(user.id, slotId!)
      }
    }

    try {
      reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    })

    sendSSE(reply, 'start', {
      type: 'start',
      conversationId: convId,
      userMessageId: userMsg.id
    })

    const abortController = new AbortController()
    let finalized = false

    const onRequestClose = () => {
      if (!finalized) abortController.abort()
      ensureSlotReleased()
    }
    reply.raw.on('close', onRequestClose)

    const dbUserProfile = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, role: true } })
    const knowledgeObjects = resolvedContext.knowledgeObjects
    const knowledgeContext = resolvedContext.knowledgeContext
    const baseSystemPrompt = buildSystemPrompt(
      { name: dbUserProfile?.name || user.email, role: dbUserProfile?.role || user.role },
      knowledgeContext,
      resolvedContext.koTitle,
      resolvedContext.selectedKOTitle
    )

    const recentMsgs = await prisma.conversationMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'desc' },
      take: CONTEXT_MESSAGE_LIMIT
    })
    const chatMessages: ChatMessage[] = recentMsgs
      .reverse()
      .filter(m => {
        if (m.error) return false
        if (m.role !== 'user' && m.role !== 'assistant') return false
        if (!m.content) return false
        if (/(?:\?{2,}|[A-Za-zÇĞİÖŞÜçğıöşü]\?[A-Za-zÇĞİÖŞÜçğıöşü])/.test(m.content)) return false
        return true
      })
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const memCtx = await buildMemoryContext({
      prisma,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      conversationId: convId,
      userMessage: cleanMessage,
      recentMessages: chatMessages,
      systemPrompt: baseSystemPrompt
    })
    const systemMessages = memCtx.systemMessages

    let assistantContent = ''
    let assistantId: number | null = null
    let finalProvider = ''
    let finalModel = ''

    try {
      const stream = streamAiResponse(systemMessages, abortController.signal, knowledgeObjects)
      for await (const event of stream) {
        if (finalized) break
        if (event.type === 'provider') {
          finalProvider = event.provider
          finalModel = event.model
          sendSSE(reply, 'provider', { type: 'provider', provider: event.provider, model: event.model })
        } else if (event.type === 'delta') {
          assistantContent += event.delta
          sendSSE(reply, 'delta', { type: 'delta', delta: event.delta })
        } else if (event.type === 'done') {
          if (finalized) break
          finalized = true
          reply.raw.removeListener('close', onRequestClose)

          const citations = event.knowledgeObjects
          const assistantMsg = await prisma.conversationMessage.create({
            data: {
              conversationId: convId, role: 'assistant', content: assistantContent,
              generationStatus: 'completed',
              tokenUsage: event.tokenUsage ? safeJsonStringify(event.tokenUsage) : null,
              knowledgeObjects: citations && citations.length > 0
                ? safeJsonStringify(citations.map(toConversationCitation))
                : null
            }
          })
          assistantId = assistantMsg.id

          const now3 = new Date()
          await prisma.conversation.update({
            where: { id: convId },
            data: {
              lastMessageAt: now3, updatedAt: now3,
              provider: finalProvider, model: finalModel
            }
          })

          sendSSE(reply, 'done', {
            type: 'done',
            assistantMessage: {
              id: assistantMsg.id,
              role: 'assistant',
              content: assistantMsg.content,
              createdAt: assistantMsg.createdAt.toISOString(),
              generationStatus: assistantMsg.generationStatus
            },
            tokenUsage: event.tokenUsage ? {
              promptTokens: event.tokenUsage.prompt_tokens,
              completionTokens: event.tokenUsage.completion_tokens,
              totalTokens: event.tokenUsage.total_tokens
            } : null,
            sources: citations?.map(toConversationCitation) ?? []
          })
        }
      }

      if (!finalized) {
        finalized = true
        reply.raw.removeListener('close', onRequestClose)

        const assistantMsg = await prisma.conversationMessage.create({
          data: {
            conversationId: convId, role: 'assistant', content: assistantContent,
            generationStatus: 'cancelled',
            error: 'GENERATION_CANCELLED'
          }
        })
        assistantId = assistantMsg.id

        const now4 = new Date()
        await prisma.conversation.update({
          where: { id: convId },
          data: { lastMessageAt: now4, updatedAt: now4 }
        })

        sendSSE(reply, 'cancelled', {
          type: 'cancelled',
          assistantMessage: {
            id: assistantMsg.id,
            content: assistantContent,
            generationStatus: 'cancelled',
            error: 'GENERATION_CANCELLED',
            createdAt: assistantMsg.createdAt.toISOString()
          }
        })
      }
    } catch (err: unknown) {
      if (finalized) return
      finalized = true
      reply.raw.removeListener('close', onRequestClose)

      const errorMsg = err instanceof Error ? err.message : 'Unknown error'

      if (errorMsg === 'MENTOR_STREAM_ABORTED') {
        const assistantMsg = await prisma.conversationMessage.create({
          data: {
            conversationId: convId, role: 'assistant', content: assistantContent,
            generationStatus: 'cancelled',
            error: 'GENERATION_CANCELLED'
          }
        })
        assistantId = assistantMsg.id
        const now5 = new Date()
        await prisma.conversation.update({
          where: { id: convId },
          data: { lastMessageAt: now5, updatedAt: now5 }
        })
        sendSSE(reply, 'cancelled', {
          type: 'cancelled',
          assistantMessage: {
            id: assistantMsg.id,
            content: assistantContent,
            generationStatus: 'cancelled',
            error: 'GENERATION_CANCELLED',
            createdAt: assistantMsg.createdAt.toISOString()
          }
        })
      } else {
        const assistantMsg = await prisma.conversationMessage.create({
          data: {
            conversationId: convId, role: 'assistant', content: '',
            generationStatus: 'failed',
            error: errorMsg
          }
        })
        assistantId = assistantMsg.id
        const now6 = new Date()
        await prisma.conversation.update({
          where: { id: convId },
          data: { lastMessageAt: now6, updatedAt: now6 }
        })
        sendSSE(reply, 'error', {
          type: 'error',
          error: {
            code: 'AI_PROVIDER_ERROR',
            message: 'Yanıt oluşturulamadı. Lütfen tekrar deneyin.'
          }
        })
      }
    }

    if (finalized && assistantId && assistantContent) {
      runBackgroundMemoryExtraction(
        user.id, convId, cleanMessage, assistantContent, assistantId
      )
      runBackgroundSummaryUpdate(convId, user.id, assistantId)
    }

    reply.raw.end()
    } finally {
      ensureSlotReleased()
    }
  })

  fastify.post('/:id/messages/:messageId/regenerate', async (request, reply) => {
    const user = request.user
    const { id, messageId } = request.params as { id: string; messageId: string }

    const convId = parseId(id)
    if (!convId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz sohbet ID'))

    const msgId = parseId(messageId)
    if (!msgId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz mesaj ID'))

    const targetMsg = await ensureMessageOwnership(msgId, convId, user.id)

    if (targetMsg.role !== 'assistant') {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Yalnızca asistan mesajları yeniden oluşturulabilir'))
    }

    const conv = await prisma.conversation.findFirst({
      where: { id: convId, userId: user.id, deletedAt: null }
    })
    if (!conv) {
      return reply.status(404).send(validationError('NOT_FOUND', 'Conversation not found'))
    }
    if (conv.archivedAt) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Arşivlenmiş sohbete mesaj gönderilemez'))
    }

    if (!streamSlotManager.checkRateLimit(user.id)) {
      return reply.status(429).send(validationError('RATE_LIMIT', 'Çok fazla istek gönderildi. Lütfen 1 dakika bekleyin.'))
    }
    const slotId = streamSlotManager.acquireSlot(user.id)
    if (!slotId) {
      return reply.status(429).send(validationError('CONCURRENT_LIMIT', 'Aynı anda en fazla 2 işlem yapabilirsiniz.'))
    }

    let slotReleased = false
    function ensureSlotReleased() {
      if (!slotReleased) {
        slotReleased = true
        streamSlotManager.releaseSlot(user.id, slotId!)
      }
    }

    try {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    })

    sendSSE(reply, 'start', {
      type: 'start',
      conversationId: convId,
      userMessageId: null
    })

    const priorMessages = await prisma.conversationMessage.findMany({
      where: { conversationId: convId, id: { lt: msgId } },
      orderBy: { createdAt: 'asc' }
    })

    const chatMessages: ChatMessage[] = priorMessages
      .filter(m => {
        if (m.role === 'user' || m.role === 'assistant') return true
        return false
      })
      .filter(m => !m.error)
      .filter(m => m.content)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const lastUserContent = priorMessages.filter(m => m.role === 'user').pop()?.content || ''
    const selectedCode = extractSelectedKnowledgeObjectCode(targetMsg.knowledgeObjects)
    const resolvedContext = await resolveKnowledgeContext(lastUserContent, selectedCode)

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, role: true } })
    const systemContent = buildSystemPrompt(
      { name: dbUser?.name || user.email, role: dbUser?.role || 'learner' },
      resolvedContext.knowledgeContext,
      resolvedContext.koTitle,
      resolvedContext.selectedKOTitle
    )
    const systemMessage: ChatMessage = { role: 'system', content: systemContent }

    const abortController = new AbortController()
    let finalized = false

    const onRequestClose = () => {
      if (!finalized) abortController.abort()
    }
    reply.raw.on('close', onRequestClose)

    let assistantContent = ''
    let finalProvider = ''
    let finalModel = ''

    try {
      const stream = streamAiResponse([systemMessage, ...chatMessages], abortController.signal, resolvedContext.knowledgeObjects)
      for await (const event of stream) {
        if (finalized) break
        if (event.type === 'provider') {
          finalProvider = event.provider
          finalModel = event.model
          sendSSE(reply, 'provider', { type: 'provider', provider: event.provider, model: event.model })
        } else if (event.type === 'delta') {
          assistantContent += event.delta
          sendSSE(reply, 'delta', { type: 'delta', delta: event.delta })
        } else if (event.type === 'done') {
          if (finalized) break
          finalized = true
          reply.raw.removeListener('close', onRequestClose)

          const citations = event.knowledgeObjects
          const assistantMsg = await prisma.conversationMessage.create({
            data: {
              conversationId: convId, role: 'assistant', content: assistantContent,
              generationStatus: 'completed',
              regeneratedFromMessageId: msgId,
              tokenUsage: event.tokenUsage ? safeJsonStringify(event.tokenUsage) : null,
              knowledgeObjects: citations && citations.length > 0
                ? safeJsonStringify(citations.map(toConversationCitation))
                : null
            }
          })

          const now7 = new Date()
          await prisma.conversation.update({
            where: { id: convId },
            data: { lastMessageAt: now7, updatedAt: now7, provider: finalProvider, model: finalModel }
          })

          sendSSE(reply, 'done', {
            type: 'done',
            assistantMessage: {
              id: assistantMsg.id,
              role: 'assistant',
              content: assistantMsg.content,
              createdAt: assistantMsg.createdAt.toISOString(),
              generationStatus: assistantMsg.generationStatus
            },
            tokenUsage: event.tokenUsage ? {
              promptTokens: event.tokenUsage.prompt_tokens,
              completionTokens: event.tokenUsage.completion_tokens,
              totalTokens: event.tokenUsage.total_tokens
            } : null,
            sources: citations?.map(toConversationCitation) ?? []
          })
        }
      }

      if (!finalized) {
        finalized = true
        reply.raw.removeListener('close', onRequestClose)

        const assistantMsg = await prisma.conversationMessage.create({
          data: {
            conversationId: convId, role: 'assistant', content: assistantContent,
            generationStatus: 'cancelled',
            error: 'GENERATION_CANCELLED',
            regeneratedFromMessageId: msgId
          }
        })
        sendSSE(reply, 'cancelled', {
          type: 'cancelled',
          assistantMessage: {
            id: assistantMsg.id,
            content: assistantContent,
            generationStatus: 'cancelled',
            error: 'GENERATION_CANCELLED',
            createdAt: assistantMsg.createdAt.toISOString()
          }
        })
      }
    } catch (err: unknown) {
      if (finalized) return
      finalized = true
      reply.raw.removeListener('close', onRequestClose)

      const errorMsg = err instanceof Error ? err.message : 'Unknown error'

      if (errorMsg === 'MENTOR_STREAM_ABORTED') {
        const assistantMsg = await prisma.conversationMessage.create({
          data: {
            conversationId: convId, role: 'assistant', content: assistantContent,
            generationStatus: 'cancelled',
            error: 'GENERATION_CANCELLED',
            regeneratedFromMessageId: msgId
          }
        })
        sendSSE(reply, 'cancelled', {
          type: 'cancelled',
          assistantMessage: {
            id: assistantMsg.id,
            content: assistantContent,
            generationStatus: 'cancelled',
            error: 'GENERATION_CANCELLED',
            createdAt: assistantMsg.createdAt.toISOString()
          }
        })
      } else {
        const assistantMsg = await prisma.conversationMessage.create({
          data: {
            conversationId: convId, role: 'assistant', content: '',
            generationStatus: 'failed',
            error: errorMsg,
            regeneratedFromMessageId: msgId
          }
        })
        sendSSE(reply, 'error', {
          type: 'error',
          error: {
            code: 'AI_PROVIDER_ERROR',
            message: 'Yanıt oluşturulamadı. Lütfen tekrar deneyin.'
          }
        })
      }
    }

    reply.raw.end()
    } finally {
      ensureSlotReleased()
    }
  })

  fastify.post('/:id/messages/:messageId/edit-and-regenerate', async (request, reply) => {
    const user = request.user
    const { id, messageId } = request.params as { id: string; messageId: string }
    const { message } = request.body as { message?: string }

    const convId = parseId(id)
    if (!convId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz sohbet ID'))

    const msgId = parseId(messageId)
    if (!msgId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz mesaj ID'))

    const cleanNewMessage = message?.trim() || ''
    if (!cleanNewMessage) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Mesaj boş olamaz'))
    }
    if (cleanNewMessage.length > MAX_MESSAGE_LENGTH) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir`))
    }

    const targetMsg = await ensureMessageOwnership(msgId, convId, user.id)

    if (targetMsg.role !== 'user') {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Yalnızca kullanıcı mesajları düzenlenebilir'))
    }

    const conv = await prisma.conversation.findFirst({
      where: { id: convId, userId: user.id, deletedAt: null }
    })
    if (!conv) {
      return reply.status(404).send(validationError('NOT_FOUND', 'Conversation not found'))
    }
    if (conv.archivedAt) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Arşivlenmiş sohbete mesaj gönderilemez'))
    }

    if (!streamSlotManager.checkRateLimit(user.id)) {
      return reply.status(429).send(validationError('RATE_LIMIT', 'Çok fazla istek gönderildi. Lütfen 1 dakika bekleyin.'))
    }
    const slotId = streamSlotManager.acquireSlot(user.id)
    if (!slotId) {
      return reply.status(429).send(validationError('CONCURRENT_LIMIT', 'Aynı anda en fazla 2 işlem yapabilirsiniz.'))
    }

    let slotReleased = false
    function ensureSlotReleased() {
      if (!slotReleased) {
        slotReleased = true
        streamSlotManager.releaseSlot(user.id, slotId!)
      }
    }

    const editedUserMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: convId, role: 'user', content: cleanNewMessage,
        generationStatus: 'completed',
        editedFromMessageId: msgId
      }
    })

    const followingAssistant = await prisma.conversationMessage.findFirst({
      where: { conversationId: convId, role: 'assistant', createdAt: { gt: targetMsg.createdAt } },
      orderBy: { createdAt: 'asc' }
    })
    const selectedCode = extractSelectedKnowledgeObjectCode(followingAssistant?.knowledgeObjects)

    try {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    })

    sendSSE(reply, 'start', {
      type: 'start',
      conversationId: convId,
      userMessageId: editedUserMsg.id
    })

    const priorMessages = await prisma.conversationMessage.findMany({
      where: { conversationId: convId, id: { lt: msgId } },
      orderBy: { createdAt: 'asc' }
    })

    const chatMessages: ChatMessage[] = priorMessages
      .filter(m => {
        if (m.error) return false
        if (m.role !== 'user' && m.role !== 'assistant') return false
        if (!m.content) return false
        return true
      })
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    chatMessages.push({ role: 'user', content: cleanNewMessage })

    const resolvedContext = await resolveKnowledgeContext(cleanNewMessage, selectedCode)
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, role: true } })
    const systemContent = buildSystemPrompt(
      { name: dbUser?.name || user.email, role: dbUser?.role || user.role },
      resolvedContext.knowledgeContext,
      resolvedContext.koTitle,
      resolvedContext.selectedKOTitle
    )
    const systemMessage: ChatMessage = { role: 'system', content: systemContent }

    const abortController = new AbortController()
    let finalized = false

    const onRequestClose = () => {
      if (!finalized) abortController.abort()
      ensureSlotReleased()
    }
    reply.raw.on('close', onRequestClose)

    let assistantContent = ''
    let finalProvider = ''
    let finalModel = ''

    try {
      const stream = streamAiResponse([systemMessage, ...chatMessages], abortController.signal, resolvedContext.knowledgeObjects)
      for await (const event of stream) {
        if (finalized) break
        if (event.type === 'provider') {
          finalProvider = event.provider
          finalModel = event.model
          sendSSE(reply, 'provider', { type: 'provider', provider: event.provider, model: event.model })
        } else if (event.type === 'delta') {
          assistantContent += event.delta
          sendSSE(reply, 'delta', { type: 'delta', delta: event.delta })
        } else if (event.type === 'done') {
          if (finalized) break
          finalized = true
          reply.raw.removeListener('close', onRequestClose)

          const citations = event.knowledgeObjects
          const assistantMsg = await prisma.conversationMessage.create({
            data: {
              conversationId: convId, role: 'assistant', content: assistantContent,
              generationStatus: 'completed',
              tokenUsage: event.tokenUsage ? safeJsonStringify(event.tokenUsage) : null,
              knowledgeObjects: citations && citations.length > 0
                ? safeJsonStringify(citations.map(toConversationCitation))
                : null
            }
          })

          const now8 = new Date()
          await prisma.conversation.update({
            where: { id: convId },
            data: { lastMessageAt: now8, updatedAt: now8, provider: finalProvider, model: finalModel }
          })

          sendSSE(reply, 'done', {
            type: 'done',
            assistantMessage: {
              id: assistantMsg.id,
              role: 'assistant',
              content: assistantMsg.content,
              createdAt: assistantMsg.createdAt.toISOString(),
              generationStatus: assistantMsg.generationStatus
            },
            tokenUsage: event.tokenUsage ? {
              promptTokens: event.tokenUsage.prompt_tokens,
              completionTokens: event.tokenUsage.completion_tokens,
              totalTokens: event.tokenUsage.total_tokens
            } : null,
            sources: citations?.map(toConversationCitation) ?? []
          })
        }
      }

      if (!finalized) {
        finalized = true
        reply.raw.removeListener('close', onRequestClose)

        const assistantMsg = await prisma.conversationMessage.create({
          data: {
            conversationId: convId, role: 'assistant', content: assistantContent,
            generationStatus: 'cancelled', error: 'GENERATION_CANCELLED'
          }
        })
        sendSSE(reply, 'cancelled', {
          type: 'cancelled',
          assistantMessage: {
            id: assistantMsg.id,
            content: assistantContent,
            generationStatus: 'cancelled',
            error: 'GENERATION_CANCELLED',
            createdAt: assistantMsg.createdAt.toISOString()
          }
        })
      }
    } catch (err: unknown) {
      if (finalized) return
      finalized = true
      reply.raw.removeListener('close', onRequestClose)

      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      if (errorMsg === 'MENTOR_STREAM_ABORTED') {
        const assistantMsg = await prisma.conversationMessage.create({
          data: {
            conversationId: convId, role: 'assistant', content: assistantContent,
            generationStatus: 'cancelled', error: 'GENERATION_CANCELLED'
          }
        })
        sendSSE(reply, 'cancelled', {
          type: 'cancelled',
          assistantMessage: {
            id: assistantMsg.id, content: assistantContent,
            generationStatus: 'cancelled', error: 'GENERATION_CANCELLED',
            createdAt: assistantMsg.createdAt.toISOString()
          }
        })
      } else {
        const assistantMsg = await prisma.conversationMessage.create({
          data: {
            conversationId: convId, role: 'assistant', content: '',
            generationStatus: 'failed', error: errorMsg
          }
        })
        sendSSE(reply, 'error', {
          type: 'error',
          error: { code: 'AI_PROVIDER_ERROR', message: 'Yanıt oluşturulamadı. Lütfen tekrar deneyin.' }
        })
      }
    }

    reply.raw.end()
    } finally {
      ensureSlotReleased()
    }
  })
}
