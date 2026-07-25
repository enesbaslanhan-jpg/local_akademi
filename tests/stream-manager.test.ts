import { describe, it, expect, beforeEach } from 'vitest'
import { streamSlotManager, StreamSlotManager } from '../src/services/stream-manager'

describe('StreamSlotManager — Rate Limiting', () => {
  beforeEach(() => {
    streamSlotManager.reset()
  })

  it('10 istek/dk limitini asan 429 doner', () => {
    const userId = 100
    for (let i = 0; i < 10; i++) {
      expect(streamSlotManager.checkRateLimit(userId)).toBe(true)
    }
    expect(streamSlotManager.checkRateLimit(userId)).toBe(false)
  })

  it('kullanici A limiti B yi etkilemez', () => {
    const userA = 101
    const userB = 102
    for (let i = 0; i < 10; i++) {
      expect(streamSlotManager.checkRateLimit(userA)).toBe(true)
    }
    expect(streamSlotManager.checkRateLimit(userA)).toBe(false)
    for (let i = 0; i < 10; i++) {
      expect(streamSlotManager.checkRateLimit(userB)).toBe(true)
    }
    expect(streamSlotManager.checkRateLimit(userB)).toBe(false)
  })

  it('body userId sayaç anahtarını değiştirmez', () => {
    const userId = 103
    for (let i = 0; i < 10; i++) {
      expect(streamSlotManager.checkRateLimit(userId)).toBe(true)
    }
    expect(streamSlotManager.checkRateLimit(userId)).toBe(false)
    expect(streamSlotManager.checkRateLimit(104)).toBe(true)
  })
})

describe('StreamSlotManager — Concurrent Stream Limit', () => {
  beforeEach(() => {
    streamSlotManager.reset()
  })

  it('ilk iki slot basariyla alinir', () => {
    const userId = 200
    const slot1 = streamSlotManager.acquireSlot(userId)
    expect(slot1).not.toBeNull()
    const slot2 = streamSlotManager.acquireSlot(userId)
    expect(slot2).not.toBeNull()
    expect(slot1).not.toBe(slot2)
  })

  it('ucuncu eszamanli stream 429 doner', () => {
    const userId = 201
    expect(streamSlotManager.acquireSlot(userId)).not.toBeNull()
    expect(streamSlotManager.acquireSlot(userId)).not.toBeNull()
    expect(streamSlotManager.acquireSlot(userId)).toBeNull()
  })

  it('basarili stream sonrasi slot bosalir', () => {
    const userId = 202
    const slot1 = streamSlotManager.acquireSlot(userId)
    expect(slot1).not.toBeNull()
    const slot2 = streamSlotManager.acquireSlot(userId)
    expect(slot2).not.toBeNull()
    // release one
    streamSlotManager.releaseSlot(userId, slot1!)
    const slot3 = streamSlotManager.acquireSlot(userId)
    expect(slot3).not.toBeNull()
  })

  it('iki slot da serbest kalinca yeni stream acilabilir', () => {
    const userId = 203
    const s1 = streamSlotManager.acquireSlot(userId)!
    const s2 = streamSlotManager.acquireSlot(userId)!
    expect(streamSlotManager.acquireSlot(userId)).toBeNull()
    streamSlotManager.releaseSlot(userId, s1)
    streamSlotManager.releaseSlot(userId, s2)
    const s3 = streamSlotManager.acquireSlot(userId)
    expect(s3).not.toBeNull()
  })

  it('slot id si olmayan release guvenlidir', () => {
    expect(() => streamSlotManager.releaseSlot(999, 'nonexistent')).not.toThrow()
  })

  it('cleanupUser tum state i temizler', () => {
    const userId = 204
    streamSlotManager.acquireSlot(userId)
    streamSlotManager.acquireSlot(userId)
    streamSlotManager.checkRateLimit(userId)
    expect(streamSlotManager.getActiveCount(userId)).toBe(2)
    streamSlotManager.cleanupUser(userId)
    expect(streamSlotManager.getActiveCount(userId)).toBe(0)
  })

  it('getSnapshot dogru sayilari doner', () => {
    streamSlotManager.acquireSlot(301)
    streamSlotManager.acquireSlot(301)
    streamSlotManager.acquireSlot(302)
    const snap = streamSlotManager.getSnapshot()
    expect(snap[301]).toBe(2)
    expect(snap[302]).toBe(1)
  })
})

describe('StreamSlotManager — Independent Instance', () => {
  it('ozel instance reset ve snapshot destekler', () => {
    const mgr = new StreamSlotManager()
    const s1 = mgr.acquireSlot(500)
    expect(s1).not.toBeNull()
    const s2 = mgr.acquireSlot(500)
    expect(s2).not.toBeNull()
    expect(mgr.acquireSlot(500)).toBeNull()
    mgr.releaseSlot(500, s1!)
    expect(mgr.acquireSlot(500)).not.toBeNull()
    mgr.reset()
    expect(mgr.getActiveCount(500)).toBe(0)
  })

  it('concurrentMax ve rateLimitMax erisilebilir', () => {
    const mgr = new StreamSlotManager()
    expect(mgr.concurrentMax).toBe(2)
    expect(mgr.rateLimitMax).toBe(10)
    expect(mgr.rateWindowMs).toBe(60000)
  })
})
