import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  siparisOnerileriniUret,
  siparisOzetiAnahtari,
  ozettenOneriUret,
  vadeHesapla
} from '../../src/services/integrations/order-suggestions.js'

/*
 * SIPARIS -> ONAY BEKLEYEN KAYIT ONERISI.
 *
 * 🔴 NEDEN BU KOPRU: siparisler `MarketplaceOrder`a dusuyordu ama
 * Isletme Takibi'ne, takvime ve tahsilat toplamina HIC girmiyordu --
 * arayuz ise girdigini soyluyordu. Marketci tahsilatini iki ayri
 * yerden takip etmek zorunda kaliyordu.
 */

const prisma = new PrismaClient()
const damga = Date.now()
let workspaceId: string
let userId: number

async function siparisEkle(opts: {
  externalId: string
  tarih: string
  brut: number
  net?: number | null
  durum?: string
}) {
  return prisma.marketplaceOrder.create({
    data: {
      workspaceId,
      provider: 'TRENDYOL' as any,
      externalId: opts.externalId,
      currency: 'TRY',
      grossAmount: opts.brut,
      netContribution: opts.net === undefined ? opts.brut * 0.8 : opts.net,
      status: (opts.durum ?? 'DELIVERED') as any,
      orderDate: new Date(opts.tarih)
    }
  })
}

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `siparis-oneri-${damga}@test.local`, password: 'x', name: 'Test', role: 'learner' }
  })
  userId = user.id
  const ws = await prisma.businessWorkspace.create({
    data: { name: 'Siparis Oneri Testi', createdById: userId, status: 'active' }
  })
  workspaceId = ws.id
  await prisma.businessMember.create({
    data: { workspaceId, userId, role: 'owner', status: 'active' }
  })
})

afterAll(async () => {
  await prisma.businessWorkspace.deleteMany({ where: { id: workspaceId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await prisma.$disconnect()
})

beforeEach(async () => {
  await prisma.documentSuggestion.deleteMany({ where: { workspaceId } })
  await prisma.marketplaceOrder.deleteMany({ where: { workspaceId } })
})

describe('gunluk ozet onerisi', () => {
  it('bir gunun siparislerini TEK oneride topluyor', async () => {
    /* 🔴 ISIN OZU: marketci gunde 40 hareket yapiyor. Siparis basina
       oneri, gunde 40 onay kuyrugu demekti -- uygulamayi ikinci gun
       biraktiran yuk tam olarak budur. */
    await siparisEkle({ externalId: 'A1', tarih: '2026-08-20T09:00:00Z', brut: 100 })
    await siparisEkle({ externalId: 'A2', tarih: '2026-08-20T14:00:00Z', brut: 200 })
    await siparisEkle({ externalId: 'A3', tarih: '2026-08-20T19:00:00Z', brut: 300 })

    const uretilen = await siparisOnerileriniUret(
      prisma, workspaceId, 'TRENDYOL',
      [new Date('2026-08-20T09:00:00Z'), new Date('2026-08-20T14:00:00Z'), new Date('2026-08-20T19:00:00Z')]
    )

    expect(uretilen).toBe(1)
    const oneriler = await prisma.documentSuggestion.findMany({ where: { workspaceId } })
    expect(oneriler).toHaveLength(1)

    const payload = JSON.parse(oneriler[0].payload)
    expect(payload.direction).toBe('receivable')
    /* Net (komisyon dusulmus) tutar: 600 * 0.8 */
    expect(payload.amount).toBeCloseTo(480, 2)
    expect(payload.title).toContain('3 sipariş')
  })

  it('🔴 ayni gun IKINCI kez oneri uretmiyor', async () => {
    /*
     * Esitleme ayni gunu HER turda yeniden gorur. Koruma olmadan onay
     * kuyrugu ayni gunun kopyalariyla dolardi.
     *
     * ⚠️ DIS KONTROLU NOTU: koruma IKI KATMANLI -- bellekteki
     * `uretilmis` suzgeci ve veritabanindaki
     * `@@unique([workspaceId, sourceKey])`. Yalniz birini kaldirmak bu
     * testi DUSURMEZ, cunku digeri yakaliyor (olculdu). Test ancak
     * ikisi birden devre disi kalinca duser. Bu bilincli bir
     * derinlemesine savunma; testin neyi koruduguna dair yanlis bir
     * guven olusmasin diye yaziliyor.
     */
    await siparisEkle({ externalId: 'B1', tarih: '2026-08-21T10:00:00Z', brut: 500 })

    const ilk = await siparisOnerileriniUret(prisma, workspaceId, 'TRENDYOL', [new Date('2026-08-21T10:00:00Z')])
    const ikinci = await siparisOnerileriniUret(prisma, workspaceId, 'TRENDYOL', [new Date('2026-08-21T10:00:00Z')])

    expect(ilk).toBe(1)
    expect(ikinci).toBe(0)
    expect(await prisma.documentSuggestion.count({ where: { workspaceId } })).toBe(1)
  })

  it('iptal ve iade edilen siparisler tahsilata SAYILMIYOR', async () => {
    /* Iptal edilen siparis para getirmez; toplama katmak kullaniciya
       gercekte alamayacagi bir tutari vaat etmek olurdu. */
    await siparisEkle({ externalId: 'C1', tarih: '2026-08-22T10:00:00Z', brut: 100 })
    await siparisEkle({ externalId: 'C2', tarih: '2026-08-22T11:00:00Z', brut: 900, durum: 'CANCELLED' })
    await siparisEkle({ externalId: 'C3', tarih: '2026-08-22T12:00:00Z', brut: 900, durum: 'RETURNED' })

    await siparisOnerileriniUret(prisma, workspaceId, 'TRENDYOL', [new Date('2026-08-22T10:00:00Z')])

    const oneri = await prisma.documentSuggestion.findFirst({ where: { workspaceId } })
    const payload = JSON.parse(oneri!.payload)
    expect(payload.amount).toBeCloseTo(80, 2)
    expect(payload.title).toContain('1 sipariş')
  })

  it('farkli gunler AYRI oneri uretiyor', async () => {
    await siparisEkle({ externalId: 'D1', tarih: '2026-08-23T10:00:00Z', brut: 100 })
    await siparisEkle({ externalId: 'D2', tarih: '2026-08-24T10:00:00Z', brut: 200 })

    const uretilen = await siparisOnerileriniUret(
      prisma, workspaceId, 'TRENDYOL',
      [new Date('2026-08-23T10:00:00Z'), new Date('2026-08-24T10:00:00Z')]
    )
    expect(uretilen).toBe(2)
  })

  it('siparissiz gun icin oneri uretmiyor', async () => {
    const uretilen = await siparisOnerileriniUret(
      prisma, workspaceId, 'TRENDYOL', [new Date('2026-08-25T10:00:00Z')]
    )
    expect(uretilen).toBe(0)
  })
})

describe('eksik komisyon verisi', () => {
  it('net veri eksikse BRUT kullaniliyor ve bu ACIKCA soyleniyor', async () => {
    /* 🔴 Eksik komisyonu sifir sayip "net" diye sunmak, kullaniciya
       gercekte eline gececekten FAZLASINI vaat etmek olurdu. */
    await siparisEkle({ externalId: 'E1', tarih: '2026-08-26T10:00:00Z', brut: 1000, net: null })

    await siparisOnerileriniUret(prisma, workspaceId, 'TRENDYOL', [new Date('2026-08-26T10:00:00Z')])
    const oneri = await prisma.documentSuggestion.findFirst({ where: { workspaceId } })
    const payload = JSON.parse(oneri!.payload)

    expect(payload.amount).toBe(1000)
    expect(payload.description).toContain('BRÜT')
    /* Guven dusuruluyor: kullanici tutari gozden gecirmeli. */
    expect(oneri!.confidence).toBeLessThan(1)
  })

  it('bir siparis bile net veri tasimiyorsa TUM gun brut sayiliyor', async () => {
    /* Yarisini net, yarisini brut toplamak anlamsiz bir sayi uretirdi. */
    await siparisEkle({ externalId: 'F1', tarih: '2026-08-27T10:00:00Z', brut: 100, net: 80 })
    await siparisEkle({ externalId: 'F2', tarih: '2026-08-27T11:00:00Z', brut: 100, net: null })

    await siparisOnerileriniUret(prisma, workspaceId, 'TRENDYOL', [new Date('2026-08-27T10:00:00Z')])
    const oneri = await prisma.documentSuggestion.findFirst({ where: { workspaceId } })
    expect(JSON.parse(oneri!.payload).amount).toBe(200)
  })
})

describe('vade', () => {
  it('🔴 vade UYDURULMUYOR', () => {
    /* Pazaryerinin odeme tarihi API'de yok. Tahmini bir vade yazmak
       YANLIS hatirlatma kurardi -- ayni karar e-Fatura yolunda da
       verilmisti. */
    const oneri = ozettenOneriUret(
      { gun: '2026-08-20', provider: 'TRENDYOL', siparisSayisi: 2, brut: 100, net: 80 }, 'TRY'
    )
    expect(oneri.payload.dueAt).toBeNull()
  })

  it('kaynak anahtari gun ve saglayiciya gore tekil', () => {
    expect(siparisOzetiAnahtari('TRENDYOL', '2026-08-20')).toBe('marketplace:TRENDYOL:2026-08-20')
    expect(siparisOzetiAnahtari('N11', '2026-08-20'))
      .not.toBe(siparisOzetiAnahtari('TRENDYOL', '2026-08-20'))
  })
})

/*
 * ODEME VADESI.
 *
 * 🔴 NEDEN GEREKLI: vadesiz kayit Kayitlar'da gorunuyor ama TAKVIME ve
 * 30 gunluk tahsilat toplamina GIRMIYOR -- uctan uca olculdu
 * (`days: {}`, `receivable: 0`). Koprunun amaci nakit planlamasiydi,
 * dolayisiyla vadesiz kayit isin yalnizca yarisini yapiyor.
 *
 * Cozum kullanicinin bilgisine dayaniyor: odeme tarihi hicbir
 * saglayicinin API'sinde yok ve gomulu bir varsayilan yanlis
 * oldugunda SESSIZCE hatali nakit tahmini uretirdi.
 */
describe('odeme vadesi', () => {
  it('gun sayisi verilince vade siparis gunune EKLENIYOR', () => {
    expect(vadeHesapla('2026-08-25', 14)).toBe('2026-09-08T00:00:00.000Z')
  })

  it('0 gun = ayni gun oder', () => {
    expect(vadeHesapla('2026-08-25', 0)).toBe('2026-08-25T00:00:00.000Z')
  })

  it('ay ve yil sinirini dogru asiyor', () => {
    expect(vadeHesapla('2026-12-28', 10)).toBe('2027-01-07T00:00:00.000Z')
  })

  it('🔴 gun sayisi YOKSA vade yazilmiyor', () => {
    expect(vadeHesapla('2026-08-25', null)).toBeNull()
  })

  it('anlamsiz deger vade uretmiyor', () => {
    expect(vadeHesapla('2026-08-25', -5)).toBeNull()
    expect(vadeHesapla('2026-08-25', Number.NaN)).toBeNull()
  })

  it('oneri govdesine vade GERCEKTEN yaziliyor', () => {
    const oneri = ozettenOneriUret(
      { gun: '2026-08-25', provider: 'TRENDYOL', siparisSayisi: 3, brut: 1000, net: 800 },
      'TRY', 14
    )
    expect(oneri.payload.dueAt).toBe('2026-09-08T00:00:00.000Z')
  })
})
