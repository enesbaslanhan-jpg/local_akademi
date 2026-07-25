import { PrismaClient } from '@prisma/client'
import type { MemoryRecord } from './memory-types'

const MAX_MEMORIES = 12
const MAX_MEMORY_CHARS = 4000

interface RetrieverContext {
  prisma: PrismaClient
}

function scoreMemory(memory: MemoryRecord, query: string): number {
  let score = 0

  const key = (memory.key || '').toLowerCase()
  const value = (memory.value || '').toLowerCase()
  const summary = (memory.summary || '').toLowerCase()
  const q = query.toLowerCase()

  if (key && q.includes(key)) score += 3
  if (value.includes(q)) score += 2
  if (summary && summary.includes(q)) score += 1.5

  Object.values({ value, key }).forEach(v => {
    const words = q.split(/\s+/)
    for (const word of words) {
      if (word.length < 3) continue
      if (v.includes(word)) score += 1
    }
  })

  score += memory.importance * 2
  score += memory.confidence * 1

  const recencyHours = (Date.now() - new Date(memory.updatedAt).getTime()) / (1000 * 3600)
  if (recencyHours < 24) score += 2
  else if (recencyHours < 168) score += 1
  else if (recencyHours > 720) score -= 1

  if (memory.type === 'profile') score += 1.5
  if (memory.type === 'fact') score += 1
  if (memory.type === 'problem') score += 1

  return Math.max(0, score)
}

export async function retrieveMemories(
  { prisma }: RetrieverContext,
  userId: number,
  query: string
): Promise<MemoryRecord[]> {
  const all = await prisma.userMemory.findMany({
    where: {
      userId,
      status: 'active',
      deletedAt: null
    },
    orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }]
  }) as MemoryRecord[]

  const scored = all
    .map(m => ({ memory: m, score: scoreMemory(m, query) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)

  const seenKeys = new Set<string>()
  const filtered: MemoryRecord[] = []
  let charTotal = 0

  for (const { memory } of scored) {
    const key = memory.key || `${memory.type}:${memory.value.slice(0, 50)}`
    if (seenKeys.has(key)) continue
    seenKeys.add(key)

    const charCost = (memory.value?.length || 0) + (memory.summary?.length || 0)
    if (charTotal + charCost > MAX_MEMORY_CHARS && filtered.length > 0) continue

    filtered.push(memory)
    charTotal += charCost

    if (filtered.length >= MAX_MEMORIES) break
  }

  return filtered
}
