import { describe, expect, it, vi, beforeEach } from 'vitest'

/*
 * Yeni sipariş bildirimi (29.09.2026).
 *
 * İddialar: (1) sahip/yönetici başına TEK özet satırı, sayıyla; (2) zamanlanmış
 * eşitlemede telefona gider, elle eşitlemede gitmez (zile yazılır); (3) aynı
 * çalıştırma iki kez bildirim üretmez (dedupeKey P2002 sessizce geçilir);
 * (4) sıfır sipariş = hiçbir şey.
 */

const pushBildir = vi.fn()
vi.mock('../src/services/push/push-gonder.js', async () => {
  const gercek = await vi.importActual<typeof import('../src/services/push/push-gonder.js')>('../src/services/push/push-gonder.js')
  return { ...gercek, pushBildir: (...a: unknown[]) => pushBildir(...a) }
})

const { yeniSiparisBildir } = await import('../src/services/integrations/marketplace-notifications.js')

function sahteVeritabani(varolanAnahtarlar: string[] = []) {
  const yazilan: any[] = []
  const prisma = {
    businessMember: { findMany: vi.fn(async () => [{ userId: 11 }, { userId: 12 }]) },
    businessNotification: {
      create: vi.fn(async ({ data }: any) => {
        if (varolanAnahtarlar.includes(`${data.userId}:${data.dedupeKey}`)) { const e: any = new Error('dup'); e.code = 'P2002'; throw e }
        yazilan.push(data); return data
      })
    }
  }
  return { prisma: prisma as any, yazilan }
}

const GIRDI = { workspaceId: 'ws-1', connectionId: 'c-1', runId: 'r-1', provider: 'TRENDYOL', adet: 3, telefona: true }

describe('yeniSiparisBildir', () => {
  beforeEach(() => pushBildir.mockReset())

  it('her sahip/yöneticiye tek özet satırı yazar ve telefona siparişler adresiyle gönderir', async () => {
    const { prisma, yazilan } = sahteVeritabani()
    await yeniSiparisBildir(prisma, GIRDI)
    expect(yazilan).toHaveLength(2)
    expect(yazilan[0]).toMatchObject({ type: 'marketplace_new_orders', title: 'Yeni sipariş', body: '3 yeni Trendyol siparişi geldi.', dedupeKey: 'marketplace_new_orders:c-1:r-1' })
    expect(yazilan[0]).not.toHaveProperty('pushUrl') // veritabanına sızmaz
    expect(pushBildir).toHaveBeenCalledTimes(2)
    expect(pushBildir.mock.calls[0][1].url).toBe('https://localkarar.com/app/workspaces/ws-1/orders')
  })

  it('tek sipariş için tekil metin', async () => {
    const { prisma, yazilan } = sahteVeritabani()
    await yeniSiparisBildir(prisma, { ...GIRDI, adet: 1, provider: 'SHOPIFY' })
    expect(yazilan[0].body).toBe('1 yeni Shopify siparişi geldi.')
  })

  it('elle eşitlemede zile yazar ama telefona GÖNDERMEZ', async () => {
    const { prisma, yazilan } = sahteVeritabani()
    await yeniSiparisBildir(prisma, { ...GIRDI, telefona: false })
    expect(yazilan).toHaveLength(2)
    expect(pushBildir).not.toHaveBeenCalled()
  })

  it('aynı çalıştırma ikinci kez bildirim üretmez (telefona da gitmez)', async () => {
    const { prisma, yazilan } = sahteVeritabani(['11:marketplace_new_orders:c-1:r-1', '12:marketplace_new_orders:c-1:r-1'])
    await yeniSiparisBildir(prisma, GIRDI)
    expect(yazilan).toHaveLength(0)
    expect(pushBildir).not.toHaveBeenCalled()
  })

  it('sıfır sipariş = hiçbir şey', async () => {
    const { prisma, yazilan } = sahteVeritabani()
    await yeniSiparisBildir(prisma, { ...GIRDI, adet: 0 })
    expect(yazilan).toHaveLength(0)
    expect(prisma.businessMember.findMany).not.toHaveBeenCalled()
  })
})
