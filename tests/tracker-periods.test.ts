import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import {
  periodRange, startOfDayIst, startOfWeekIst, startOfMonthIst, istDayKey, customRange
} from '../src/lib/istanbul-time'
import {
  paraKovala, hakedisSatiri, hakedisOzeti, effectivePayoutDelay, donemOzetiniKur, PAYOUT_DELAY_DEFAULTS
} from '../src/services/tracker-periods'

/*
 * Saf hesap testleri — veritabanı yok. Bu dosya, ürün sahibinin
 * "veriler birbirini tutmuyor" şikâyetinin altındaki tanımları kilitler:
 * İstanbul günü/haftası/ayı, 30 günlük plan penceresi, para birimi
 * ayrımı, pazaryeri hakedişi ve "tahmini" bayrağı.
 */

const D = (iso: string) => new Date(iso)

describe('İstanbul takvimi', () => {
  it('21:00Z İstanbul için ertesi güne düşer', () => {
    // 14 Eylül 21:30Z = 15 Eylül 00:30 İstanbul
    expect(istDayKey(D('2026-09-14T21:30:00Z'))).toBe('2026-09-15')
    expect(startOfDayIst(D('2026-09-14T21:30:00Z')).toISOString()).toBe('2026-09-14T21:00:00.000Z')
  })

  it('hafta Pazartesi başlar; Pazar 23:30 İstanbul hâlâ o haftadadır', () => {
    // 20 Eylül 2026 Pazar. 20:30Z = 23:30 İstanbul.
    const pazarGece = D('2026-09-20T20:30:00Z')
    expect(startOfWeekIst(pazarGece).toISOString()).toBe('2026-09-13T21:00:00.000Z') // Pzt 14 Eylül 00:00 IST
    // 21:00Z = Pazartesi 00:00 İstanbul → yeni hafta
    expect(startOfWeekIst(D('2026-09-20T21:00:00Z')).toISOString()).toBe('2026-09-20T21:00:00.000Z')
  })

  it('ay başı ve dönem aralıkları [from, to)', () => {
    const simdi = D('2026-09-15T10:00:00Z')
    expect(startOfMonthIst(simdi).toISOString()).toBe('2026-08-31T21:00:00.000Z')
    const ay = periodRange('month', simdi)
    expect(ay.to.toISOString()).toBe('2026-09-30T21:00:00.000Z') // 1 Ekim 00:00 IST
    const gun = periodRange('today', simdi)
    expect(gun.from.toISOString()).toBe('2026-09-14T21:00:00.000Z')
    expect(gun.to.toISOString()).toBe('2026-09-15T21:00:00.000Z')
    const hafta = periodRange('week', simdi)
    expect(hafta.from.toISOString()).toBe('2026-09-13T21:00:00.000Z')
    expect(hafta.to.toISOString()).toBe('2026-09-20T21:00:00.000Z')
  })

  it('özel aralık bitiş gününü dahil eder', () => {
    const a = customRange('2026-09-01', '2026-09-07')
    expect(a.from.toISOString()).toBe('2026-08-31T21:00:00.000Z')
    expect(a.to.toISOString()).toBe('2026-09-07T21:00:00.000Z')
  })
})

describe('para birimi kovalama', () => {
  it('yalnız işletme para birimini toplar, diğerlerini ayrı listeler', () => {
    const t = paraKovala([
      { amount: 1000, currency: 'TRY' },
      { amount: new Prisma.Decimal('250.50'), currency: 'try' },
      { amount: 1000, currency: 'USD' },
      { amount: 5, currency: 'USD' },
      { amount: null, currency: 'EUR' }
    ], 'TRY')
    expect(t.amount).toBe(1250.5)
    expect(t.otherCurrencies).toEqual([{ currency: 'USD', amount: 1005, count: 2 }])
  })
})

describe('pazaryeri hakedişi', () => {
  const trendyolBaglanti = { provider: 'TRENDYOL', payoutDelayDays: 10, avgCommissionPercent: 20 }
  const siparis = (ek: Partial<Parameters<typeof hakedisSatiri>[0]> = {}) => ({
    provider: 'TRENDYOL', status: 'DELIVERED', orderDate: D('2026-09-10T15:00:00Z'), currency: 'TRY',
    grossAmount: 1000, discountAmount: 0, commissionAmount: 215, shippingAmount: 79.9, refundAmount: 0, ...ek
  })

  it('bilinen kesintileri düşer; komisyon geldiyse tahmin yok', () => {
    const s = hakedisSatiri(siparis(), trendyolBaglanti)!
    expect(Number(s.net)).toBeCloseTo(1000 - 215 - 79.9, 2)
    expect(s.estimatedReasons).toEqual([])
    // ödeme günü: 10 Eylül İstanbul 00:00 + 10 gün
    expect(s.expectedPayoutAt.toISOString()).toBe('2026-09-19T21:00:00.000Z')
  })

  it('komisyon gelmediyse ortalama % ile düşer ve tahmini işaretler', () => {
    const s = hakedisSatiri(siparis({ commissionAmount: null }), trendyolBaglanti)!
    expect(Number(s.net)).toBeCloseTo(1000 - 200 - 79.9, 2)
    expect(s.estimatedReasons).toEqual(['commission'])
  })

  it('bağlantı ayarı yoksa sağlayıcı varsayılan vadesi + tahmini; komisyon %0', () => {
    expect(effectivePayoutDelay(undefined, 'N11')).toEqual({ days: PAYOUT_DELAY_DEFAULTS.N11, estimated: true })
    const s = hakedisSatiri(siparis({ provider: 'N11', commissionAmount: null }), undefined)!
    expect(s.estimatedReasons).toEqual(['payoutDelay', 'commission'])
    expect(Number(s.net)).toBeCloseTo(1000 - 79.9, 2)
  })

  it('iptal satır üretmez; iade net 0 ve iade tutarı brüt', () => {
    expect(hakedisSatiri(siparis({ status: 'CANCELLED' }), trendyolBaglanti)).toBeNull()
    const iade = hakedisSatiri(siparis({ status: 'RETURNED' }), trendyolBaglanti)!
    expect(Number(iade.net)).toBe(0)
    expect(Number(iade.refund)).toBe(1000)
  })

  it('özet sağlayıcı kırılımı ve bayrağı toplar', () => {
    const o = hakedisOzeti([
      hakedisSatiri(siparis(), trendyolBaglanti)!,
      hakedisSatiri(siparis({ provider: 'HEPSIBURADA', commissionAmount: null }), undefined)!
    ], 'TRY')
    expect(o.orderCount).toBe(2)
    expect(o.estimated).toBe(true)
    expect(o.estimatedReasons.sort()).toEqual(['commission', 'payoutDelay'])
    expect(o.byProvider.map(p => p.provider).sort()).toEqual(['HEPSIBURADA', 'TRENDYOL'])
  })
})

describe('dönem özeti', () => {
  const now = D('2026-09-15T10:00:00Z')
  const aralik = periodRange('today', now)
  const baglantilar = new Map([['TRENDYOL', { provider: 'TRENDYOL', payoutDelayDays: 5, avgCommissionPercent: null }]])

  it('geciken plana girmez, kendi kutusunda yön yön; USD toplama girmez', () => {
    const oz = donemOzetiniKur({
      aralik, paraBirimi: 'TRY', gerceklesen: [], siparisler: [], baglantilar, now,
      acik: [
        { direction: 'receivable', amount: 500, currency: 'TRY', dueAt: D('2026-09-20T09:00:00Z') },   // planda
        { direction: 'receivable', amount: 900, currency: 'TRY', dueAt: D('2026-09-01T09:00:00Z') },   // geciken
        { direction: 'payable', amount: 300, currency: 'TRY', dueAt: D('2026-10-10T09:00:00Z') },      // 30 gün içinde
        { direction: 'payable', amount: 1000, currency: 'USD', dueAt: D('2026-09-18T09:00:00Z') },     // USD → ayrıca
        { direction: 'payable', amount: 50, currency: 'TRY', dueAt: D('2026-12-01T09:00:00Z') }        // pencere dışı
      ]
    })
    expect(oz.plan.receivable.amount).toBe(500)
    expect(oz.plan.payable.amount).toBe(300)
    expect(oz.plan.payable.otherCurrencies).toEqual([{ currency: 'USD', amount: 1000, count: 1 }])
    expect(oz.overdue.receivable.amount).toBe(900)
    expect(oz.overdue.count).toBe(1)
    expect(oz.plan.net).toBe(200)
  })

  it('sipariş hakedişi plana ve gerçekleşene girer; iade düşer', () => {
    const oz = donemOzetiniKur({
      aralik, paraBirimi: 'TRY', gerceklesen: [{ direction: 'receivable', amount: 100, currency: 'TRY' }], acik: [], baglantilar, now,
      siparisler: [
        { provider: 'TRENDYOL', status: 'SHIPPED', orderDate: D('2026-09-15T08:00:00Z'), currency: 'TRY', grossAmount: 1000, commissionAmount: 200, shippingAmount: 50 },
        { provider: 'TRENDYOL', status: 'RETURNED', orderDate: D('2026-09-15T09:00:00Z'), currency: 'TRY', grossAmount: 400, commissionAmount: 80, shippingAmount: 50 },
        { provider: 'TRENDYOL', status: 'DELIVERED', orderDate: D('2026-08-01T09:00:00Z'), currency: 'TRY', grossAmount: 999, commissionAmount: 1, shippingAmount: 0 } // eski: plan penceresi dışı, bugün değil
      ]
    })
    expect(oz.gerceklesen.siparisSayisi).toBe(2)
    expect(oz.gerceklesen.pazaryeriBrut.amount).toBe(1400)
    expect(oz.gerceklesen.pazaryeriNet.amount).toBe(750)
    expect(oz.gerceklesen.iade.amount).toBe(400)
    expect(oz.gerceklesen.net).toBe(850) // 100 tahsilat + 750
    expect(oz.plan.hakedis.orderCount).toBe(1) // iade planda yok, eski sipariş pencere dışı
    expect(oz.plan.hakedis.net.amount).toBe(750)
    expect(oz.plan.estimated).toBe(false)
  })
})

describe('dönem raporu satırları', () => {
  it('≤31 gün → günlük; boş günler de satır; toplamlar satırlarla tutar', async () => {
    const { raporuKur } = await import('../src/services/tracker-periods')
    const now = D('2026-09-15T10:00:00Z')
    const r = raporuKur({
      aralik: periodRange('month', now), paraBirimi: 'TRY', now,
      baglantilar: new Map([['TRENDYOL', { provider: 'TRENDYOL', payoutDelayDays: 10, avgCommissionPercent: null }]]),
      gerceklesen: [
        { direction: 'payable', amount: 4400, currency: 'TRY', settlementAt: null, completedAt: D('2026-09-03T09:00:00Z') },
        { direction: 'receivable', amount: 100, currency: 'USD', settlementAt: null, completedAt: D('2026-09-03T09:00:00Z') } // satıra girmez
      ],
      siparisler: [
        { provider: 'TRENDYOL', status: 'DELIVERED', orderDate: D('2026-09-10T15:00:00Z'), currency: 'TRY', grossAmount: 1000, commissionAmount: 200, shippingAmount: 50 },
        { provider: 'TRENDYOL', status: 'RETURNED', orderDate: D('2026-09-10T16:00:00Z'), currency: 'TRY', grossAmount: 300, commissionAmount: 60, shippingAmount: 50 }
      ]
    })
    expect(r.granularity).toBe('day')
    expect(r.rows.length).toBe(30) // Eylül
    const g3 = r.rows.find(x => x.key === '2026-09-03')!
    expect(g3.odeme).toBe(4400); expect(g3.tahsilat).toBe(0)
    const g10 = r.rows.find(x => x.key === '2026-09-10')!
    expect(g10.siparisSayisi).toBe(2); expect(g10.pazaryeriNet).toBe(750); expect(g10.iade).toBe(300)
    expect(r.totals.net).toBe(750 - 4400)
    expect(r.rows.reduce((a, x) => a + x.net, 0)).toBeCloseTo(r.totals.net, 2)
    expect(r.totals.tahsilat.otherCurrencies).toEqual([{ currency: 'USD', amount: 100, count: 1 }])
  })

  it('>31 gün → haftalık, Pazartesi anahtarlı', async () => {
    const { raporuKur } = await import('../src/services/tracker-periods')
    const r = raporuKur({
      aralik: customRange('2026-07-01', '2026-09-15'), paraBirimi: 'TRY', now: D('2026-09-15T10:00:00Z'),
      baglantilar: new Map(), gerceklesen: [], siparisler: []
    })
    expect(r.granularity).toBe('week')
    expect(r.rows[0].key).toBe('2026-06-29') // 1 Temmuz Çarşamba → haftanın Pazartesisi
    expect(r.rows[r.rows.length - 1].key).toBe('2026-09-14')
  })
})
