import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'

const ALLOWED_METADATA_KEYS = new Set([
  'fromStatus', 'toStatus', 'reason', 'note', 'notes',
  'role', 'oldRole', 'newRole', 'gate', 'reviewGate',
  'importJobId', 'rowsImported', 'sourceId', 'sourceTitle',
  'entityTitle', 'entityCode', 'versionNumber',
  'verificationStatus', 'provider', 'model',
  /* Odeme (31.08.2026). Bu liste bir IZIN LISTESI ve listede olmayan
     her alani SESSIZCE siliyor; eklenmezlerse odeme denetim kaydi
     tutar ve siparis numarasi olmadan yaziliyor, yani ise yaramiyor. */
  'amount', 'currency', 'merchantOid', 'paymentStatus'
])

function sanitizeMetadata(raw: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (ALLOWED_METADATA_KEYS.has(key)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        clean[key] = value
      } else if (value === null) {
        clean[key] = null
      }
    }
  }
  return clean
}

export async function createAuditLog(params: {
  action: string
  entityType: string
  entityId?: string | number | null
  actorId: number
  actorName?: string | null
  metadata?: Record<string, unknown>
},
/*
 * Prisma istemcisi SON PARAMETRE ve varsayılanı paylaşılan istemci.
 *
 * Kardeş işlev `bildirimYaz` (account-notifications.ts) zaten böyle;
 * ikisinin ayrışması, denetim kaydı yazan bir rotanın test edilemez
 * olması demekti — ödeme callback'i tam olarak buna takıldı ve
 * kapalı veritabanına gitmeye çalıştı.
 */
prismaIstemcisi: PrismaClient = sharedPrisma) {
  const sanitized = sanitizeMetadata(params.metadata || {})
  return prismaIstemcisi.auditLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId != null ? String(params.entityId) : null,
      actorId: params.actorId,
      actorName: params.actorName || null,
      metadata: JSON.stringify(sanitized)
    }
  })
}

export async function queryAuditLogs(params: {
  entityType?: string
  entityId?: string
  action?: string
  actorId?: number
  limit?: number
  offset?: number
  orderDirection?: 'asc' | 'desc'
}) {
  const where: Prisma.AuditLogWhereInput = {}
  if (params.entityType) where.entityType = params.entityType
  if (params.entityId) where.entityId = params.entityId
  if (params.action) where.action = params.action
  if (params.actorId) where.actorId = params.actorId

  const [logs, total] = await Promise.all([
    sharedPrisma.auditLog.findMany({
      where,
      orderBy: { createdAt: params.orderDirection === 'asc' ? 'asc' : 'desc' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0
    }),
    sharedPrisma.auditLog.count({ where })
  ])

  return {
    logs: logs.map(l => ({
      ...l,
      metadata: safeParseJson(l.metadata)
    })),
    total
  }
}

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function withAuditTransaction<T>(
  operations: (tx: Prisma.TransactionClient) => Promise<T>,
  auditEntries: Array<{
    action: string
    entityType: string
    entityId?: string | number | null
    actorId: number
    actorName?: string | null
    metadata?: Record<string, unknown>
  }>
): Promise<T> {
  return sharedPrisma.$transaction(async (tx) => {
    const result = await operations(tx)
    for (const entry of auditEntries) {
      const sanitized = sanitizeMetadata(entry.metadata || {})
      await tx.auditLog.create({
        data: {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId != null ? String(entry.entityId) : null,
          actorId: entry.actorId,
          actorName: entry.actorName || null,
          metadata: JSON.stringify(sanitized)
        }
      })
    }
    return result
  })
}
