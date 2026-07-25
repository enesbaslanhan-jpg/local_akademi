import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import {
  listMemories, getMemory, createMemory, updateMemory,
  softDeleteMemory, clearAllMemories
} from './memory-repository'
import { extractAndStoreMemories, buildExtractionPrompt, parseExtractionJson } from './memory-extractor'
import { isValidMemoryType, isValidMemoryStatus, type MemoryType, type SourceType, type ValidationStatus } from './memory-types'

function parseId(id: string): number | null {
  const n = parseInt(id, 10)
  if (!Number.isInteger(n) || n < 1) return null
  return n
}

function validationError(code: string, message: string) {
  return { error: { code, message } }
}

const repo = { prisma }

export async function memoryRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', async (request, reply) => {
    const user = request.user as { id: number }
    const query = request.query as { type?: string; status?: string; search?: string; page?: string; pageSize?: string }
    const result = await listMemories(repo, user.id, {
      type: query.type,
      status: query.status,
      search: query.search,
      page: query.page ? parseInt(query.page) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize) : 50
    })
    return result
  })

  fastify.get('/:id', async (request, reply) => {
    const user = request.user as { id: number }
    const { id } = request.params as { id: string }
    const memId = parseId(id)
    if (!memId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz memory ID'))
    const memory = await getMemory(repo, memId, user.id)
    if (!memory) return reply.status(404).send(validationError('NOT_FOUND', 'Memory bulunamadı'))
    return { memory }
  })

  fastify.post('/', async (request, reply) => {
    const user = request.user as { id: number }
    const body = request.body as {
      type: string
      key?: string
      value: string
      summary?: string
      importance?: number
      confidence?: number
    }

    if (!body.value?.trim()) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Değer boş olamaz'))
    }
    if (!body.type || !isValidMemoryType(body.type)) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Geçersiz memory türü'))
    }

    const sensitivityCheck = await import('./sensitive-data-filter.js')
    if (sensitivityCheck.containsSensitiveData(body.value)) {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Hassas veri memory olarak kaydedilemez'))
    }

    const memory = await createMemory(repo, {
      userId: user.id,
      type: body.type as MemoryType,
      key: body.key || null,
      value: body.value.trim(),
      summary: body.summary || null,
      sourceType: 'user_manual',
      importance: Math.max(0, Math.min(1, body.importance ?? 0.5)),
      confidence: Math.max(0, Math.min(1, body.confidence ?? 0.8)),
      validationStatus: 'user_entered'
    })

    return reply.status(201).send({ memory })
  })

  fastify.patch('/:id', async (request, reply) => {
    const user = request.user as { id: number }
    const { id } = request.params as { id: string }
    const memId = parseId(id)
    if (!memId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz memory ID'))

    const body = request.body as {
      value?: string
      key?: string
      summary?: string
      status?: string
      confidence?: number
      importance?: number
    }

    if (body.status && body.status === 'disputed') {
      body.confidence = 0
      body.importance = 0
    }

    const updated = await updateMemory(repo, memId, user.id, body as any)
    if (!updated) return reply.status(404).send(validationError('NOT_FOUND', 'Memory bulunamadı'))
    return { memory: updated }
  })

  fastify.delete('/:id', async (request, reply) => {
    const user = request.user as { id: number }
    const { id } = request.params as { id: string }
    const memId = parseId(id)
    if (!memId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz memory ID'))

    const deleted = await softDeleteMemory(repo, memId, user.id)
    if (!deleted) return reply.status(404).send(validationError('NOT_FOUND', 'Memory bulunamadı'))
    return reply.status(204).send()
  })

  fastify.delete('/', async (request, reply) => {
    const user = request.user as { id: number }
    const body = (request.body || {}) as { confirmation?: string }

    if (body.confirmation !== 'DELETE_ALL_MEMORIES') {
      return reply.status(422).send(validationError('VALIDATION_ERROR', 'Tüm memory\'leri silmek için confirmation alanı "DELETE_ALL_MEMORIES" olmalıdır'))
    }

    const count = await clearAllMemories(repo, user.id)
    return { deletedCount: count }
  })

  fastify.post('/:id/dispute', async (request, reply) => {
    const user = request.user as { id: number }
    const { id } = request.params as { id: string }
    const memId = parseId(id)
    if (!memId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz memory ID'))

    const updated = await updateMemory(repo, memId, user.id, {
      status: 'disputed',
      confidence: 0,
      importance: 0
    })
    if (!updated) return reply.status(404).send(validationError('NOT_FOUND', 'Memory bulunamadı'))
    return { memory: updated }
  })

  fastify.post('/:id/confirm', async (request, reply) => {
    const user = request.user as { id: number }
    const { id } = request.params as { id: string }
    const memId = parseId(id)
    if (!memId) return reply.status(400).send(validationError('VALIDATION_ERROR', 'Geçersiz memory ID'))

    const updated = await updateMemory(repo, memId, user.id, {
      confidence: 0.95,
      importance: 0.9
    })
    if (!updated) return reply.status(404).send(validationError('NOT_FOUND', 'Memory bulunamadı'))
    return { memory: updated }
  })
}
