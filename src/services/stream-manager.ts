import { randomUUID } from 'crypto'

export class StreamSlotManager {
  private activeStreams: Map<number, Set<string>> = new Map()
  private requestLog: Map<number, number[]> = new Map()

  private readonly MAX_CONCURRENT = 2
  private readonly MAX_RATE = 10
  private readonly RATE_WINDOW_MS = 60_000

  checkRateLimit(userId: number): boolean {
    const now = Date.now()
    const timestamps = this.requestLog.get(userId) || []
    const recent = timestamps.filter(t => now - t < this.RATE_WINDOW_MS)
    if (recent.length >= this.MAX_RATE) return false
    recent.push(now)
    this.requestLog.set(userId, recent)
    return true
  }

  acquireSlot(userId: number): string | null {
    const slots = this.activeStreams.get(userId)
    if (slots?.size && slots.size >= this.MAX_CONCURRENT) return null
    const slotId = randomUUID()
    if (!slots) {
      this.activeStreams.set(userId, new Set([slotId]))
    } else {
      slots.add(slotId)
    }
    return slotId
  }

  releaseSlot(userId: number, slotId: string): void {
    const slots = this.activeStreams.get(userId)
    if (!slots) return
    slots.delete(slotId)
    if (slots.size === 0) this.activeStreams.delete(userId)
  }

  getActiveCount(userId: number): number {
    return this.activeStreams.get(userId)?.size || 0
  }

  cleanupUser(userId: number): void {
    this.activeStreams.delete(userId)
    this.requestLog.delete(userId)
  }

  reset(): void {
    this.activeStreams.clear()
    this.requestLog.clear()
  }

  getSnapshot(): Record<number, number> {
    const snapshot: Record<number, number> = {}
    for (const [userId, slots] of this.activeStreams) {
      snapshot[userId] = slots.size
    }
    return snapshot
  }

  get concurrentMax(): number { return this.MAX_CONCURRENT }
  get rateLimitMax(): number { return this.MAX_RATE }
  get rateWindowMs(): number { return this.RATE_WINDOW_MS }
}

export const streamSlotManager = new StreamSlotManager()
