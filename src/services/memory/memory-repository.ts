import { PrismaClient } from '@prisma/client'
import type { MemoryInput, MemoryRecord } from './memory-types'
import {
  isValidMemoryType, isValidMemoryStatus,
  normalizeKey, normalizeValue
} from './memory-types'

interface RepoContext {
  prisma: PrismaClient
}

export async function findActiveByTypeAndKey(
  { prisma }: RepoContext,
  userId: number,
  type: string,
  key: string
): Promise<MemoryRecord | null> {
  return prisma.userMemory.findFirst({
    where: { userId, type, key, status: 'active', deletedAt: null }
  }) as Promise<MemoryRecord | null>
}

export async function findSupersedeCandidates(
  { prisma }: RepoContext,
  userId: number,
  type: string,
  normalizedKey: string,
  value: string,
  normalizedVal: string
): Promise<MemoryRecord[]> {
  const active = await prisma.userMemory.findMany({
    where: {
      userId, type, status: 'active', deletedAt: null,
      OR: [
        { normalizedValue: normalizedVal },
        ...(normalizedKey ? [{ key: normalizedKey }] : [])
      ]
    }
  }) as MemoryRecord[]
  return active
}

export async function supersedeExisting(
  { prisma }: RepoContext,
  existingIds: number[]
): Promise<void> {
  if (existingIds.length === 0) return
  await prisma.userMemory.updateMany({
    where: { id: { in: existingIds } },
    data: { status: 'superseded', updatedAt: new Date() }
  })
}

export async function createMemory(
  { prisma }: RepoContext,
  input: MemoryInput
): Promise<MemoryRecord> {
  const key = input.key || normalizeKey(input.type, input.value)
  const normalizedValue = input.normalizedValue || normalizeValue(input.value)

  const existing = await findSupersedeCandidates(
    { prisma }, input.userId, input.type, key, input.value, normalizedValue
  )
  if (existing.length > 0) {
    const ids = existing.map(e => e.id)
    await supersedeExisting({ prisma }, ids)
  }

  return prisma.userMemory.create({
    data: {
      userId: input.userId,
      type: input.type,
      key,
      value: input.value,
      normalizedValue,
      summary: input.summary || null,
      sourceType: input.sourceType,
      sourceMessageId: input.sourceMessageId || null,
      conversationId: input.conversationId || null,
      importance: input.importance ?? 0.5,
      confidence: input.confidence ?? 0.5,
      status: input.status || 'active',
      validationStatus: input.validationStatus || 'inferred',
    }
  }) as Promise<MemoryRecord>
}

export async function listMemories(
  { prisma }: RepoContext,
  userId: number,
  filters: {
    type?: string
    status?: string
    search?: string
    page?: number
    pageSize?: number
  } = {}
): Promise<{ memories: MemoryRecord[]; total: number }> {
  const { type, status, search, page = 1, pageSize = 50 } = filters
  const where: Record<string, unknown> = { userId, deletedAt: null }

  if (type && isValidMemoryType(type)) where.type = type
  if (status && isValidMemoryStatus(status)) where.status = status
  if (search) {
    where.OR = [
      { value: { contains: search } },
      { key: { contains: search } },
      { summary: { contains: search } }
    ]
  }

  const [memories, total] = await Promise.all([
    prisma.userMemory.findMany({
      where: where as any,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.userMemory.count({ where: where as any })
  ])

  return { memories: memories as MemoryRecord[], total }
}

export async function getMemory(
  { prisma }: RepoContext,
  id: number,
  userId: number
): Promise<MemoryRecord | null> {
  return prisma.userMemory.findFirst({
    where: { id, userId, deletedAt: null }
  }) as Promise<MemoryRecord | null>
}

export async function updateMemory(
  { prisma }: RepoContext,
  id: number,
  userId: number,
  data: Partial<{
    value: string
    key: string
    summary: string
    status: string
    confidence: number
    importance: number
  }>
): Promise<MemoryRecord | null> {
  const existing = await getMemory({ prisma }, id, userId)
  if (!existing) return null

  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() }
  if (data.value) {
    updateData.normalizedValue = normalizeValue(data.value)
  }

  return prisma.userMemory.update({
    where: { id },
    data: updateData as any
  }) as Promise<MemoryRecord | null>
}

export async function softDeleteMemory(
  { prisma }: RepoContext,
  id: number,
  userId: number
): Promise<boolean> {
  const existing = await getMemory({ prisma }, id, userId)
  if (!existing) return false
  await prisma.userMemory.update({
    where: { id },
    data: { status: 'deleted', deletedAt: new Date(), updatedAt: new Date() }
  })
  return true
}

export async function clearAllMemories(
  { prisma }: RepoContext,
  userId: number
): Promise<number> {
  const result = await prisma.userMemory.updateMany({
    where: { userId, deletedAt: null },
    data: { status: 'deleted', deletedAt: new Date(), updatedAt: new Date() }
  })
  return result.count
}

export async function touchMemories(
  { prisma }: RepoContext,
  ids: number[]
): Promise<void> {
  if (ids.length === 0) return
  await prisma.userMemory.updateMany({
    where: { id: { in: ids } },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 }
    }
  })
}
