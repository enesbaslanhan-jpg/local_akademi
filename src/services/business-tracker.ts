import type { FastifyInstance } from 'fastify'
import type { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { processDueBusinessReminders, syncAutomaticReminder } from './business-reminder-worker.js'
import { buildDocumentSuggestion } from './document-suggestions.js'

const RECORD_TYPES = [
  'payment', 'receivable', 'promissory_note', 'purchase',
  'shipment', 'task', 'deferred', 'other'
] as const
const RECORD_STATUSES = ['open', 'in_progress', 'completed', 'cancelled', 'deferred'] as const
const RECURRENCE_RULES = ['weekly', 'monthly', 'quarterly', 'yearly'] as const
const WRITE_ROLES = new Set(['owner', 'manager', 'staff', 'accountant', 'admin'])

const nullableText = z.string().trim().max(4000).nullable().optional()
const optionalDate = z.string().datetime().nullable().optional()

const recordInput = z.object({
  type: z.enum(RECORD_TYPES),
  title: z.string().trim().min(1).max(240),
  description: nullableText,
  direction: z.enum(['payable', 'receivable', 'neutral']).default('neutral'),
  amount: z.number().finite().nonnegative().max(1e15).nullable().optional(),
  currency: z.string().trim().length(3).default('TRY'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueAt: optionalDate,
  contactId: z.string().uuid().nullable().optional(),
  assignedToId: z.number().int().positive().nullable().optional(),
  recurrenceRule: z.enum(RECURRENCE_RULES).nullable().optional(),
  metadata: z.record(z.unknown()).optional()
})

const recordUpdate = recordInput.partial().extend({
  status: z.enum(RECORD_STATUSES).optional(),
  reason: z.string().trim().max(1000).optional()
})

const deferInput = z.object({
  dueAt: z.string().datetime(),
  reason: z.string().trim().min(1).max(1000)
})

const reminderInput = z.object({
  scheduledAt: z.string().datetime(),
  recipientId: z.number().int().positive().optional(),
  channel: z.enum(['in_app']).default('in_app')
})

const documentMetadataInput = z.object({
  category: z.enum(['invoice', 'receipt', 'contract', 'promissory_note', 'shipment', 'purchase', 'other']).nullable().optional(),
  documentDate: optionalDate,
  dueDate: optionalDate,
  contactId: z.string().uuid().nullable().optional()
})

function normalizeRole(role: string) {
  return role === 'admin' ? 'manager' : role
}

function parseJson(value: string | null) {
  if (!value) return {}
  try { return JSON.parse(value) }
  catch { return {} }
}

function recordJson(record: any) {
  return {
    ...record,
    amount: record.amount === null || record.amount === undefined ? null : Number(record.amount),
    metadata: parseJson(record.metadata)
  }
}

async function access(
  prisma: PrismaClient,
  userId: number,
  workspaceId: string,
  reply: any,
  write = false
) {
  const member = await prisma.businessMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: { select: { status: true } } }
  })
  if (!member || member.status !== 'active') {
    reply.status(403).send({ error: 'Access denied' })
    return null
  }
  if (member.workspace.status !== 'active') {
    reply.status(400).send({ error: 'Workspace is not active' })
    return null
  }
  if (write && !WRITE_ROLES.has(normalizeRole(member.role))) {
    reply.status(403).send({ error: 'Insufficient permissions' })
    return null
  }
  return member
}

async function scopedRecord(
  prisma: PrismaClient,
  workspaceId: string,
  recordId: string,
  reply: any
) {
  const record = await prisma.businessRecord.findUnique({ where: { id: recordId } })
  if (!record || record.workspaceId !== workspaceId || record.archivedAt) {
    reply.status(404).send({ error: 'Record not found' })
    return null
  }
  return record
}

async function validateReferences(
  prisma: PrismaClient,
  workspaceId: string,
  contactId: string | null | undefined,
  assignedToId: number | null | undefined,
  reply: any
) {
  if (contactId) {
    const contact = await prisma.businessContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.workspaceId !== workspaceId || contact.status !== 'active') {
      reply.status(422).send({ error: 'Contact does not belong to this workspace' })
      return false
    }
  }
  if (assignedToId) {
    const member = await prisma.businessMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: assignedToId } }
    })
    if (!member || member.status !== 'active') {
      reply.status(422).send({ error: 'Assignee is not an active workspace member' })
      return false
    }
  }
  return true
}

function updateDates(status: typeof RECORD_STATUSES[number]) {
  if (status === 'completed') return { completedAt: new Date(), cancelledAt: null }
  if (status === 'cancelled') return { cancelledAt: new Date(), completedAt: null }
  return { completedAt: null, cancelledAt: null }
}

function nextRecurringDate(current: Date, rule: typeof RECURRENCE_RULES[number]) {
  if (rule === 'weekly') return new Date(current.getTime() + 7 * 86400000)
  const months = rule === 'monthly' ? 1 : rule === 'quarterly' ? 3 : 12
  const year = current.getUTCFullYear()
  const month = current.getUTCMonth() + months
  const day = current.getUTCDate()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(
    new Date(Date.UTC(year, month, 1)).getUTCFullYear(),
    new Date(Date.UTC(year, month, 1)).getUTCMonth(),
    Math.min(day, lastDay),
    current.getUTCHours(),
    current.getUTCMinutes(),
    current.getUTCSeconds(),
    current.getUTCMilliseconds()
  ))
}

async function createNextRecurringRecord(
  tx: Prisma.TransactionClient,
  record: any,
  actorId: number
) {
  if (!record.dueAt || !RECURRENCE_RULES.includes(record.recurrenceRule)) return null
  const existing = await tx.businessRecord.findFirst({ where: { parentRecordId: record.id } })
  if (existing) return existing
  const dueAt = nextRecurringDate(record.dueAt, record.recurrenceRule)
  const created = await tx.businessRecord.create({
    data: {
      workspaceId: record.workspaceId,
      type: record.type,
      title: record.title,
      description: record.description,
      direction: record.direction,
      amount: record.amount,
      currency: record.currency,
      priority: record.priority,
      dueAt,
      originalDueAt: dueAt,
      contactId: record.contactId,
      assignedToId: record.assignedToId,
      createdById: actorId,
      recurrenceRule: record.recurrenceRule,
      parentRecordId: record.id,
      metadata: record.metadata
    }
  })
  await tx.businessRecordHistory.create({
    data: {
      workspaceId: record.workspaceId,
      recordId: created.id,
      actorId,
      action: 'generated.recurrence',
      newData: JSON.stringify(recordJson(created))
    }
  })
  await syncAutomaticReminder(tx, created)
  return created
}

export async function businessTrackerRoutes(
  fastify: FastifyInstance,
  opts?: { prisma?: PrismaClient }
) {
  const prisma = opts?.prisma ?? sharedPrisma

  fastify.addHook('preHandler', async (request, reply) => {
    try { await fastify.authenticate(request as any, reply as any) }
    catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })

  fastify.get('/:workspaceId/tracker/summary', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return

    const now = new Date()
    const nextThirtyDays = new Date(now.getTime() + 30 * 86400000)
    const records = await prisma.businessRecord.findMany({
      where: { workspaceId, archivedAt: null, status: { in: ['open', 'in_progress', 'deferred'] } },
      orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }],
      include: { contact: { select: { id: true, name: true } } }
    })

    const payable = records
      .filter(r => r.direction === 'payable' && r.dueAt && r.dueAt <= nextThirtyDays)
      .reduce((sum, r) => sum + Number(r.amount ?? 0), 0)
    const receivable = records
      .filter(r => r.direction === 'receivable' && r.dueAt && r.dueAt <= nextThirtyDays)
      .reduce((sum, r) => sum + Number(r.amount ?? 0), 0)

    return {
      counts: {
        open: records.length,
        overdue: records.filter(r => r.dueAt && r.dueAt < now && r.status !== 'completed').length,
        dueToday: records.filter(r => r.dueAt && r.dueAt.toDateString() === now.toDateString()).length,
        shipments: records.filter(r => r.type === 'shipment').length,
        deferred: records.filter(r => r.status === 'deferred' || r.type === 'deferred').length
      },
      nextThirtyDays: { payable, receivable, net: receivable - payable },
      upcoming: records.slice(0, 10).map(recordJson)
    }
  })

  fastify.get('/:workspaceId/tracker/calendar', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    const parsed = z.object({
      from: z.string().datetime(),
      to: z.string().datetime()
    }).safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid calendar range', details: parsed.error.errors })
    const from = new Date(parsed.data.from)
    const to = new Date(parsed.data.to)
    if (to <= from || to.getTime() - from.getTime() > 366 * 86400000) {
      return reply.status(422).send({ error: 'Calendar range must be between 1 and 366 days' })
    }
    const records = await prisma.businessRecord.findMany({
      where: { workspaceId, archivedAt: null, dueAt: { gte: from, lte: to } },
      include: { contact: { select: { id: true, name: true } } },
      orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }]
    })
    const days: Record<string, ReturnType<typeof recordJson>[]> = {}
    for (const record of records) {
      const key = record.dueAt!.toISOString().slice(0, 10)
      ;(days[key] ??= []).push(recordJson(record))
    }
    const activeFinancialRecords = records.filter(record => !['completed', 'cancelled'].includes(record.status))
    return {
      from,
      to,
      days,
      totals: {
        records: records.length,
        payable: activeFinancialRecords.filter(record => record.direction === 'payable').reduce((sum, record) => sum + Number(record.amount ?? 0), 0),
        receivable: activeFinancialRecords.filter(record => record.direction === 'receivable').reduce((sum, record) => sum + Number(record.amount ?? 0), 0)
      }
    }
  })

  fastify.get('/:workspaceId/records', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return

    const query = z.object({
      type: z.enum(RECORD_TYPES).optional(),
      status: z.enum(RECORD_STATUSES).optional(),
      direction: z.enum(['payable', 'receivable', 'neutral']).optional(),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      q: z.string().trim().max(200).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0)
    }).safeParse(request.query)
    if (!query.success) return reply.status(422).send({ error: 'Invalid filters', details: query.error.errors })

    const { type, status, direction, from, to, q, limit, offset } = query.data
    const where: Prisma.BusinessRecordWhereInput = {
      workspaceId,
      archivedAt: null,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(direction ? { direction } : {}),
      ...(from || to ? { dueAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {})
    }
    const [records, total] = await prisma.$transaction([
      prisma.businessRecord.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { documents: true, reminders: true } }
        },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset
      }),
      prisma.businessRecord.count({ where })
    ])
    return { records: records.map(recordJson), total, limit, offset }
  })

  fastify.post('/:workspaceId/records', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const parsed = recordInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const input = parsed.data
    if (!await validateReferences(prisma, workspaceId, input.contactId, input.assignedToId, reply)) return

    const record = await prisma.$transaction(async tx => {
      const created = await tx.businessRecord.create({
        data: {
          workspaceId,
          type: input.type,
          title: input.title,
          description: input.description ?? null,
          direction: input.direction,
          amount: input.amount ?? null,
          currency: input.currency.toUpperCase(),
          priority: input.priority,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          originalDueAt: input.dueAt ? new Date(input.dueAt) : null,
          contactId: input.contactId ?? null,
          assignedToId: input.assignedToId ?? null,
          recurrenceRule: input.recurrenceRule ?? null,
          createdById: user.id,
          metadata: JSON.stringify(input.metadata ?? {})
        }
      })
      await tx.businessRecordHistory.create({
        data: { workspaceId, recordId: created.id, actorId: user.id, action: 'created', newData: JSON.stringify(recordJson(created)) }
      })
      await tx.workspaceActivity.create({
        data: { workspaceId, actorId: user.id, action: 'record.created', entityType: 'business_record', entityId: created.id }
      })
      await syncAutomaticReminder(tx, created)
      return created
    })
    return reply.status(201).send(recordJson(record))
  })

  fastify.get('/:workspaceId/records/:recordId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, recordId } = request.params as { workspaceId: string, recordId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    if (!await scopedRecord(prisma, workspaceId, recordId, reply)) return
    const record = await prisma.businessRecord.findUnique({
      where: { id: recordId },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        history: { orderBy: { createdAt: 'desc' }, take: 50 },
        reminders: { orderBy: { scheduledAt: 'asc' } },
        documents: { include: { document: true }, orderBy: { createdAt: 'desc' } }
      }
    })
    return recordJson(record)
  })

  fastify.patch('/:workspaceId/records/:recordId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, recordId } = request.params as { workspaceId: string, recordId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const previous = await scopedRecord(prisma, workspaceId, recordId, reply)
    if (!previous) return
    const parsed = recordUpdate.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const input = parsed.data
    if (!await validateReferences(prisma, workspaceId, input.contactId, input.assignedToId, reply)) return

    const data: Prisma.BusinessRecordUpdateInput = {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.direction !== undefined ? { direction: input.direction } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.currency !== undefined ? { currency: input.currency.toUpperCase() } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(input.dueAt) : null } : {}),
      ...(input.contactId !== undefined ? { contact: input.contactId ? { connect: { id: input.contactId } } : { disconnect: true } } : {}),
      ...(input.assignedToId !== undefined ? { assignedTo: input.assignedToId ? { connect: { id: input.assignedToId } } : { disconnect: true } } : {}),
      ...(input.recurrenceRule !== undefined ? { recurrenceRule: input.recurrenceRule } : {}),
      ...(input.metadata !== undefined ? { metadata: JSON.stringify(input.metadata) } : {}),
      ...(input.status !== undefined ? { status: input.status, ...updateDates(input.status) } : {}),
      updatedBy: { connect: { id: user.id } }
    }

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.businessRecord.update({ where: { id: recordId }, data })
      await tx.businessRecordHistory.create({
        data: {
          workspaceId,
          recordId,
          actorId: user.id,
          action: input.status && input.status !== previous.status ? `status.${input.status}` : 'updated',
          previousData: JSON.stringify(recordJson(previous)),
          newData: JSON.stringify(recordJson(result)),
          reason: input.reason
        }
      })
      await syncAutomaticReminder(tx, result)
      if (input.status === 'completed') {
        await createNextRecurringRecord(tx, result, user.id)
      }
      return result
    })
    return recordJson(updated)
  })

  fastify.post('/:workspaceId/records/:recordId/defer', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, recordId } = request.params as { workspaceId: string, recordId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const previous = await scopedRecord(prisma, workspaceId, recordId, reply)
    if (!previous) return
    const parsed = deferInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const dueAt = new Date(parsed.data.dueAt)
    if (dueAt <= new Date()) return reply.status(422).send({ error: 'New due date must be in the future' })

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.businessRecord.update({
        where: { id: recordId },
        data: { status: 'deferred', dueAt, updatedById: user.id }
      })
      await tx.businessRecordHistory.create({
        data: {
          workspaceId, recordId, actorId: user.id, action: 'deferred',
          previousData: JSON.stringify({ dueAt: previous.dueAt, status: previous.status }),
          newData: JSON.stringify({ dueAt, status: 'deferred' }),
          reason: parsed.data.reason
        }
      })
      await syncAutomaticReminder(tx, result)
      return result
    })
    return recordJson(updated)
  })

  fastify.delete('/:workspaceId/records/:recordId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, recordId } = request.params as { workspaceId: string, recordId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    if (!await scopedRecord(prisma, workspaceId, recordId, reply)) return
    await prisma.businessRecord.update({ where: { id: recordId }, data: { archivedAt: new Date(), updatedById: user.id } })
    return { archived: true }
  })

  fastify.post('/:workspaceId/records/:recordId/reminders', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, recordId } = request.params as { workspaceId: string, recordId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    if (!await scopedRecord(prisma, workspaceId, recordId, reply)) return
    const parsed = reminderInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const recipientId = parsed.data.recipientId ?? user.id
    if (!await validateReferences(prisma, workspaceId, undefined, recipientId, reply)) return
    const scheduledAt = new Date(parsed.data.scheduledAt)
    const dedupeKey = `${recordId}:${recipientId}:${scheduledAt.toISOString()}:${parsed.data.channel}`
    const reminder = await prisma.businessReminder.upsert({
      where: { dedupeKey },
      update: { scheduledAt, status: 'pending' },
      create: { workspaceId, recordId, recipientId, scheduledAt, channel: parsed.data.channel, dedupeKey }
    })
    return reply.status(201).send(reminder)
  })

  fastify.get('/:workspaceId/notifications', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    await processDueBusinessReminders(prisma).catch(error => {
      request.log.error({ error }, 'Due reminder processing failed')
    })
    const [notifications, unreadCount] = await prisma.$transaction([
      prisma.businessNotification.findMany({
        where: { workspaceId, userId: user.id },
        include: { record: { select: { id: true, title: true, type: true, dueAt: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.businessNotification.count({ where: { workspaceId, userId: user.id, readAt: null } })
    ])
    return { notifications, unreadCount }
  })

  fastify.patch('/:workspaceId/notifications/:notificationId/read', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, notificationId } = request.params as { workspaceId: string; notificationId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    const notification = await prisma.businessNotification.findUnique({ where: { id: notificationId } })
    if (!notification || notification.workspaceId !== workspaceId || notification.userId !== user.id) {
      return reply.status(404).send({ error: 'Notification not found' })
    }
    return prisma.businessNotification.update({
      where: { id: notificationId },
      data: { readAt: notification.readAt ?? new Date() }
    })
  })

  fastify.post('/:workspaceId/notifications/read-all', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    const result = await prisma.businessNotification.updateMany({
      where: { workspaceId, userId: user.id, readAt: null },
      data: { readAt: new Date() }
    })
    return { updated: result.count }
  })

  fastify.post('/:workspaceId/records/:recordId/documents/:documentId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, recordId, documentId } = request.params as { workspaceId: string, recordId: string, documentId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    if (!await scopedRecord(prisma, workspaceId, recordId, reply)) return
    const document = await prisma.uploadedDocument.findUnique({ where: { id: documentId } })
    if (!document || document.archivedAt || (document.workspaceId && document.workspaceId !== workspaceId) || (!document.workspaceId && document.userId !== user.id)) {
      return reply.status(404).send({ error: 'Document not found' })
    }
    const link = await prisma.$transaction(async tx => {
      if (!document.workspaceId) await tx.uploadedDocument.update({ where: { id: documentId }, data: { workspaceId } })
      return tx.businessRecordDocument.upsert({
        where: { recordId_documentId: { recordId, documentId } },
        update: {},
        create: { workspaceId, recordId, documentId, attachedById: user.id }
      })
    })
    return reply.status(201).send(link)
  })

  fastify.get('/:workspaceId/documents', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    const documents = await prisma.uploadedDocument.findMany({
      where: { workspaceId, archivedAt: null },
      include: {
        contact: { select: { id: true, name: true } },
        suggestions: { orderBy: { createdAt: 'desc' } },
        _count: { select: { recordDocuments: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return {
      documents: documents.map(document => ({
        id: document.id,
        originalName: document.originalName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        category: document.category,
        documentDate: document.documentDate,
        dueDate: document.dueDate,
        analysisStatus: document.analysisStatus,
        analysis: parseJson(document.analysis),
        extractedText: document.extractedText.substring(0, 20000),
        suggestions: document.suggestions.map(suggestion => ({
          ...suggestion,
          payload: parseJson(suggestion.payload),
          evidence: parseJson(suggestion.evidence)
        })),
        contact: document.contact,
        linkedRecordCount: document._count.recordDocuments,
        createdAt: document.createdAt
      }))
    }
  })

  fastify.patch('/:workspaceId/documents/:documentId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, documentId } = request.params as { workspaceId: string, documentId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const document = await prisma.uploadedDocument.findUnique({ where: { id: documentId } })
    if (!document || document.archivedAt || (document.workspaceId && document.workspaceId !== workspaceId) || (!document.workspaceId && document.userId !== user.id)) {
      return reply.status(404).send({ error: 'Document not found' })
    }
    const parsed = documentMetadataInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    if (!await validateReferences(prisma, workspaceId, parsed.data.contactId, undefined, reply)) return
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.uploadedDocument.update({
        where: { id: documentId },
        data: {
          workspaceId,
          ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
          ...(parsed.data.documentDate !== undefined ? { documentDate: parsed.data.documentDate ? new Date(parsed.data.documentDate) : null } : {}),
          ...(parsed.data.dueDate !== undefined ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null } : {}),
          ...(parsed.data.contactId !== undefined ? { contactId: parsed.data.contactId } : {})
        }
      })
      const existing = await tx.documentSuggestion.findFirst({
        where: { workspaceId, documentId, suggestionType: 'business_record', status: 'proposed' }
      })
      const generated = buildDocumentSuggestion(result)
      if (!existing && generated) {
        await tx.documentSuggestion.create({
          data: {
            workspaceId,
            documentId,
            suggestionType: generated.suggestionType,
            payload: JSON.stringify(generated.payload),
            confidence: generated.confidence,
            evidence: JSON.stringify(generated.evidence),
            status: 'proposed'
          }
        })
      }
      await tx.uploadedDocument.update({
        where: { id: documentId },
        data: { analysisStatus: existing || generated ? 'review_required' : 'no_suggestion' }
      })
      return result
    })
    return updated
  })

  fastify.get('/:workspaceId/documents/:documentId/suggestions', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, documentId } = request.params as { workspaceId: string; documentId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    const document = await prisma.uploadedDocument.findUnique({ where: { id: documentId } })
    if (!document || document.workspaceId !== workspaceId || document.archivedAt) {
      return reply.status(404).send({ error: 'Document not found' })
    }
    const suggestions = await prisma.documentSuggestion.findMany({
      where: { workspaceId, documentId },
      orderBy: { createdAt: 'desc' }
    })
    return {
      suggestions: suggestions.map(suggestion => ({
        ...suggestion,
        payload: parseJson(suggestion.payload),
        evidence: parseJson(suggestion.evidence)
      }))
    }
  })

  fastify.post('/:workspaceId/document-suggestions/:suggestionId/accept', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, suggestionId } = request.params as { workspaceId: string; suggestionId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const suggestion = await prisma.documentSuggestion.findUnique({
      where: { id: suggestionId },
      include: { document: true }
    })
    if (!suggestion || suggestion.workspaceId !== workspaceId || suggestion.document.workspaceId !== workspaceId) {
      return reply.status(404).send({ error: 'Suggestion not found' })
    }
    if (suggestion.status !== 'proposed') {
      return reply.status(409).send({ error: 'Suggestion was already reviewed' })
    }
    const overrides = recordInput.partial().safeParse(request.body ?? {})
    if (!overrides.success) return reply.status(422).send({ error: 'Validation failed', details: overrides.error.errors })
    const merged = recordInput.safeParse({ ...parseJson(suggestion.payload), ...overrides.data })
    if (!merged.success) return reply.status(422).send({ error: 'Suggestion is incomplete', details: merged.error.errors })
    if (!await validateReferences(prisma, workspaceId, merged.data.contactId, merged.data.assignedToId, reply)) return

    const record = await prisma.$transaction(async tx => {
      const claimed = await tx.documentSuggestion.updateMany({
        where: { id: suggestionId, workspaceId, status: 'proposed' },
        data: { status: 'accepted', reviewedById: user.id, reviewedAt: new Date() }
      })
      if (claimed.count !== 1) throw new Error('SUGGESTION_ALREADY_REVIEWED')
      const input = merged.data
      const created = await tx.businessRecord.create({
        data: {
          workspaceId,
          type: input.type,
          title: input.title,
          description: input.description ?? null,
          direction: input.direction,
          amount: input.amount ?? null,
          currency: input.currency.toUpperCase(),
          priority: input.priority,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          originalDueAt: input.dueAt ? new Date(input.dueAt) : null,
          contactId: input.contactId ?? null,
          assignedToId: input.assignedToId ?? null,
          createdById: user.id,
          metadata: JSON.stringify({ ...(input.metadata ?? {}), sourceSuggestionId: suggestion.id })
        }
      })
      await tx.businessRecordDocument.create({
        data: { workspaceId, recordId: created.id, documentId: suggestion.documentId, attachedById: user.id }
      })
      await tx.businessRecordHistory.create({
        data: { workspaceId, recordId: created.id, actorId: user.id, action: 'created.from_document_suggestion', newData: JSON.stringify(recordJson(created)) }
      })
      await tx.uploadedDocument.update({ where: { id: suggestion.documentId }, data: { analysisStatus: 'accepted' } })
      await syncAutomaticReminder(tx, created)
      return created
    }).catch(error => {
      if (error instanceof Error && error.message === 'SUGGESTION_ALREADY_REVIEWED') return null
      throw error
    })
    if (!record) return reply.status(409).send({ error: 'Suggestion was already reviewed' })
    return reply.status(201).send(recordJson(record))
  })

  fastify.post('/:workspaceId/document-suggestions/:suggestionId/reject', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, suggestionId } = request.params as { workspaceId: string; suggestionId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const suggestion = await prisma.documentSuggestion.findUnique({ where: { id: suggestionId } })
    if (!suggestion || suggestion.workspaceId !== workspaceId) {
      return reply.status(404).send({ error: 'Suggestion not found' })
    }
    const result = await prisma.documentSuggestion.updateMany({
      where: { id: suggestionId, workspaceId, status: 'proposed' },
      data: { status: 'rejected', reviewedById: user.id, reviewedAt: new Date() }
    })
    if (result.count !== 1) return reply.status(409).send({ error: 'Suggestion was already reviewed' })
    await prisma.uploadedDocument.update({
      where: { id: suggestion.documentId },
      data: { analysisStatus: 'rejected' }
    })
    return { rejected: true }
  })

  fastify.delete('/:workspaceId/documents/:documentId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, documentId } = request.params as { workspaceId: string, documentId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const document = await prisma.uploadedDocument.findUnique({ where: { id: documentId } })
    if (!document || document.workspaceId !== workspaceId || document.archivedAt) {
      return reply.status(404).send({ error: 'Document not found' })
    }
    await prisma.uploadedDocument.update({ where: { id: documentId }, data: { archivedAt: new Date() } })
    return { archived: true }
  })
}
