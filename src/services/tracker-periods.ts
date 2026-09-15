import { Prisma, type PrismaClient } from '@prisma/client'
import {
  type DonemAnahtari,
  type DonemAraligi,
  addDays,
  customRange,
  periodRange,
  startOfDayIst,
  startOfWeekIst,
  istDayKey
} from '../lib/istanbul-time.js'

/*
 * İŞLETME TAKİBİ — TEK DÖNEM TANIMI (15.09.2026).
 *
 * Ürün sahibinin sorusu: "Ana Sayfa'da 30 gün, Genel Bakış'ta bu hafta,
 * pazaryeri şeridinde bugün — hangisi ne, veriler neden tutmuyor,
 * siparişler rakamlara giriyor mu?" Cevap kodda dağınıktı: her ekran
 * kendi penceresini kendi hesaplıyordu ve pazaryeri siparişleri HİÇBİR
 * toplama girmiyordu. Bu dosya tanımları bir kez yazar; web, mobil ve
 * rapor buradan okur.
 *
 * İKİ BAKIŞ:
 *  - GERÇEKLEŞEN (geriye): tahsil edilen, ödenen, pazaryeri satışı, iade.
 *    Takvim dönemi — bugün / bu hafta (Pzt–Paz) / bu ay, İstanbul saati.
 *  - PLAN (ileriye): vadesi [şimdi, şimdi+30 gün] içinde olanlar +
 *    beklenen pazaryeri hakedişi. GECİKEN BUNA GİRMEZ; kendi kutusunda.
 *
 * 🔴 PAZARYERİ KAYIT YAZMADAN HESABA GİRER. Önceki tasarım günlük bir
 * "kayıt önerisi" üretiyordu; öneri hiçbir ekranda listelenmedi, vade
 * bilgisi yoksa zaten toplama girmezdi (ölü özellik, kaldırıldı).
 * Şimdi sipariş doğrudan okunur: iade/iptal olunca kendiliğinden düşer,
 * çift sayım ve onay kuyruğu yok. Ürün sahibi kararı, 15.09.2026.
 *
 * 🔴 PARA BİRİMLERİ TOPLANMAZ. 1.000 USD + 1.000 TRY = 2.000 yazıyordu.
 * Toplamlar işletmenin para biriminde; başka birimler "ayrıca" listesinde.
 * Kur uydurulmaz.
 */

/* ---------- Para birimi kovalama ---------- */

export type ParaToplami = {
  amount: number
  currency: string
  /** İşletme para birimi dışındakiler — toplama GİRMEZ, ayrı yazılır. */
  otherCurrencies: Array<{ currency: string; amount: number; count: number }>
}

export function paraKovala(
  satirlar: Array<{ amount: number | Prisma.Decimal | null | undefined; currency?: string | null }>,
  isletmeParaBirimi: string
): ParaToplami {
  let ana = new Prisma.Decimal(0)
  const digerler = new Map<string, { amount: Prisma.Decimal; count: number }>()
  for (const s of satirlar) {
    if (s.amount === null || s.amount === undefined) continue
    const tutar = new Prisma.Decimal(s.amount)
    const birim = (s.currency || isletmeParaBirimi).toUpperCase()
    if (birim === isletmeParaBirimi.toUpperCase()) { ana = ana.plus(tutar); continue }
    const d = digerler.get(birim) ?? { amount: new Prisma.Decimal(0), count: 0 }
    d.amount = d.amount.plus(tutar); d.count += 1
    digerler.set(birim, d)
  }
  return {
    amount: yuvarla(ana),
    currency: isletmeParaBirimi,
    otherCurrencies: [...digerler.entries()].map(([currency, d]) => ({ currency, amount: yuvarla(d.amount), count: d.count }))
  }
}

function yuvarla(d: Prisma.Decimal): number {
  return Number(d.toDecimalPlaces(2))
}

/* ---------- Pazaryeri hakedişi ---------- */

/**
 * Sağlayıcı ödeme süresi varsayılanları (gün). Bağlantıda
 * `payoutDelayDays` girilmemişse kullanılır ve sonuç "tahmini" işaretlenir.
 * Kaynak: satıcı sözleşmelerindeki olağan hakediş dönemleri; kesin değil,
 * o yüzden etikette "tahmini" ve ayarlara bağlantı var.
 */
export const PAYOUT_DELAY_DEFAULTS: Record<string, number> = {
  TRENDYOL: 14,
  HEPSIBURADA: 14,
  N11: 7,
  SHOPIFY: 3,
  AMAZON: 14,
  WOOCOMMERCE: 0
}

export type TahminSebebi = 'payoutDelay' | 'commission'

export type HakedisBaglantisi = {
  provider: string
  payoutDelayDays: number | null
  avgCommissionPercent: number | Prisma.Decimal | null
}

export type HakedisSiparisi = {
  provider: string
  status: string
  orderDate: Date
  currency: string
  grossAmount: Prisma.Decimal | number
  discountAmount?: Prisma.Decimal | number | null
  commissionAmount?: Prisma.Decimal | number | null
  shippingAmount?: Prisma.Decimal | number | null
  refundAmount?: Prisma.Decimal | number | null
}

export type HakedisSatiri = {
  provider: string
  status: string
  orderDate: Date
  expectedPayoutAt: Date
  currency: string
  gross: Prisma.Decimal
  net: Prisma.Decimal
  refund: Prisma.Decimal
  estimatedReasons: TahminSebebi[]
}

export function effectivePayoutDelay(b: HakedisBaglantisi | undefined, provider: string): { days: number; estimated: boolean } {
  if (b && b.payoutDelayDays !== null && b.payoutDelayDays !== undefined) return { days: b.payoutDelayDays, estimated: false }
  return { days: PAYOUT_DELAY_DEFAULTS[provider.toUpperCase()] ?? 14, estimated: true }
}

const IPTAL = new Set(['CANCELLED'])
const IADE = new Set(['RETURNED'])

/**
 * Sipariş → beklenen hakediş satırı.
 *
 * net = brüt − indirim − komisyon − kargo − iade.
 *  - Komisyon gelmediyse bağlantıdaki ortalama % (yoksa 0) ile hesaplanır
 *    ve `commission` tahmin sebebi eklenir. Uydurma değil: kullanıcı oranı
 *    kendi girer; girmediyse ekranda "tahmini" görür.
 *  - RETURNED → net 0 (iade düşmüş sayılır), brüt bilgi için kalır.
 *  - CANCELLED satır üretmez.
 *  - Ödeme günü = sipariş gününün İstanbul 00:00'ı + ödeme süresi.
 */
export function hakedisSatiri(o: HakedisSiparisi, baglanti: HakedisBaglantisi | undefined): HakedisSatiri | null {
  if (IPTAL.has(o.status)) return null
  const gross = new Prisma.Decimal(o.grossAmount)
  const sebepler: TahminSebebi[] = []
  const vade = effectivePayoutDelay(baglanti, o.provider)
  if (vade.estimated) sebepler.push('payoutDelay')

  let komisyon: Prisma.Decimal
  if (o.commissionAmount !== null && o.commissionAmount !== undefined) {
    komisyon = new Prisma.Decimal(o.commissionAmount)
  } else {
    const oran = baglanti?.avgCommissionPercent === null || baglanti?.avgCommissionPercent === undefined
      ? new Prisma.Decimal(0)
      : new Prisma.Decimal(baglanti.avgCommissionPercent)
    komisyon = gross.mul(oran).div(100)
    sebepler.push('commission')
  }
  const indirim = new Prisma.Decimal(o.discountAmount ?? 0)
  const kargo = new Prisma.Decimal(o.shippingAmount ?? 0)
  const iade = new Prisma.Decimal(o.refundAmount ?? 0)

  let net = gross.minus(indirim).minus(komisyon).minus(kargo).minus(iade)
  if (IADE.has(o.status)) net = new Prisma.Decimal(0)
  if (net.lessThan(0)) net = new Prisma.Decimal(0)

  return {
    provider: o.provider,
    status: o.status,
    orderDate: o.orderDate,
    expectedPayoutAt: addDays(startOfDayIst(o.orderDate), vade.days),
    currency: o.currency || 'TRY',
    gross,
    net,
    refund: IADE.has(o.status) ? gross : iade,
    estimatedReasons: sebepler
  }
}

export type HakedisOzeti = {
  gross: ParaToplami
  net: ParaToplami
  returns: ParaToplami
  orderCount: number
  estimated: boolean
  estimatedReasons: TahminSebebi[]
  byProvider: Array<{ provider: string; orderCount: number; gross: number; net: number; estimated: boolean }>
}

export function hakedisOzeti(satirlar: HakedisSatiri[], isletmeParaBirimi: string): HakedisOzeti {
  const sebepler = new Set<TahminSebebi>()
  const saglayici = new Map<string, { orderCount: number; gross: Prisma.Decimal; net: Prisma.Decimal; estimated: boolean }>()
  for (const s of satirlar) {
    s.estimatedReasons.forEach(r => sebepler.add(r))
    const p = saglayici.get(s.provider) ?? { orderCount: 0, gross: new Prisma.Decimal(0), net: new Prisma.Decimal(0), estimated: false }
    p.orderCount += 1
    // Sağlayıcı kırılımı yalnız işletme para birimindeki siparişleri toplar.
    if ((s.currency || isletmeParaBirimi).toUpperCase() === isletmeParaBirimi.toUpperCase()) {
      p.gross = p.gross.plus(s.gross); p.net = p.net.plus(s.net)
    }
    if (s.estimatedReasons.length) p.estimated = true
    saglayici.set(s.provider, p)
  }
  return {
    gross: paraKovala(satirlar.map(s => ({ amount: s.gross, currency: s.currency })), isletmeParaBirimi),
    net: paraKovala(satirlar.map(s => ({ amount: s.net, currency: s.currency })), isletmeParaBirimi),
    returns: paraKovala(satirlar.map(s => ({ amount: s.refund, currency: s.currency })), isletmeParaBirimi),
    orderCount: satirlar.length,
    estimated: sebepler.size > 0,
    estimatedReasons: [...sebepler],
    byProvider: [...saglayici.entries()].map(([provider, p]) => ({
      provider, orderCount: p.orderCount, gross: yuvarla(p.gross), net: yuvarla(p.net), estimated: p.estimated
    }))
  }
}

/* ---------- Gerçekleşen kayıt filtresi (finance/monthly ile ortak) ---------- */

/**
 * Tamamlanmış kayıt = gerçekleşen para hareketi. Ölçüt tarihi
 * `settlementAt ?? completedAt` (valör varsa valör). Kredi taksiti,
 * hesaplar arası transfer ve sermaye hareketi gelir/gider değildir,
 * dışarıda. `finance/monthly` ile AYNI tanım — iki yerde iki filtre
 * olmasın diye buradan alınır.
 */
export function gerceklesenKayitWhere(workspaceId: string, from: Date, to: Date, now = new Date()): Prisma.BusinessRecordWhereInput {
  return {
    workspaceId,
    archivedAt: null,
    status: 'completed',
    loanId: null,
    AND: [
      { OR: [{ settlementAt: null, completedAt: { gte: from, lt: to, lte: now } }, { settlementAt: { gte: from, lt: to, lte: now } }] },
      { OR: [{ category: null }, { category: { notIn: ['loan_repayment', 'transfer', 'capital'] } }] }
    ]
  }
}

/* ---------- Dönem özeti ---------- */

export type GerceklesenOzeti = {
  tahsilat: ParaToplami
  odeme: ParaToplami
  pazaryeriBrut: ParaToplami
  pazaryeriNet: ParaToplami
  iade: ParaToplami
  /** tahsilat − ödeme + pazaryeri net (işletme para birimi). */
  net: number
  kayitSayisi: { tahsilat: number; odeme: number }
  siparisSayisi: number
}

export type PlanOzeti = {
  receivable: ParaToplami
  payable: ParaToplami
  /** Beklenen pazaryeri hakedişi (ödeme günü pencerede). */
  hakedis: HakedisOzeti
  /** receivable + hakedis.net − payable (işletme para birimi). */
  net: number
  counts: { receivable: number; payable: number; hakedisOrders: number }
  estimated: boolean
  estimatedReasons: TahminSebebi[]
}

export type GecikenOzeti = {
  payable: ParaToplami
  receivable: ParaToplami
  count: number
}

export type DonemOzeti = {
  period: { key: DonemAraligi['key']; from: string; to: string; timezone: string }
  currency: string
  gerceklesen: GerceklesenOzeti
  plan: PlanOzeti
  overdue: GecikenOzeti
}

const ACIK_DURUMLAR = ['open', 'in_progress', 'deferred']
export const PLAN_GUN = 30

async function baglantilar(prisma: PrismaClient, workspaceId: string): Promise<Map<string, HakedisBaglantisi>> {
  const rows = await prisma.integrationConnection.findMany({
    where: { workspaceId },
    select: { provider: true, payoutDelayDays: true, avgCommissionPercent: true }
  })
  const m = new Map<string, HakedisBaglantisi>()
  for (const r of rows) {
    // Aynı sağlayıcıdan birden çok mağaza: ilk dolu ayar kazanır.
    const mevcut = m.get(r.provider)
    if (!mevcut || (mevcut.payoutDelayDays === null && r.payoutDelayDays !== null)) {
      m.set(r.provider, { provider: r.provider, payoutDelayDays: r.payoutDelayDays, avgCommissionPercent: r.avgCommissionPercent })
    }
  }
  return m
}

/** Dönem içindeki gerçekleşen hareketler + 30 günlük plan + geciken. */
export async function donemOzeti(
  prisma: PrismaClient,
  workspaceId: string,
  secim: { period: DonemAnahtari } | { from: string; to: string },
  now = new Date()
): Promise<DonemOzeti> {
  const aralik = 'period' in secim ? periodRange(secim.period, now) : customRange(secim.from, secim.to)
  const ws = await prisma.businessWorkspace.findUnique({ where: { id: workspaceId }, select: { currency: true } })
  const paraBirimi = (ws?.currency || 'TRY').toUpperCase()
  const b = await baglantilar(prisma, workspaceId)

  const [gerceklesen, acik, siparisler] = await Promise.all([
    prisma.businessRecord.findMany({
      where: gerceklesenKayitWhere(workspaceId, aralik.from, aralik.to, now),
      select: { direction: true, amount: true, currency: true }
    }),
    prisma.businessRecord.findMany({
      where: { workspaceId, archivedAt: null, status: { in: ACIK_DURUMLAR }, dueAt: { not: null } },
      select: { direction: true, amount: true, currency: true, dueAt: true }
    }),
    prisma.marketplaceOrder.findMany({
      where: { workspaceId, status: { not: 'CANCELLED' } },
      select: { provider: true, status: true, orderDate: true, currency: true, grossAmount: true, discountAmount: true, commissionAmount: true, shippingAmount: true, refundAmount: true }
    })
  ])

  return donemOzetiniKur({ aralik, paraBirimi, gerceklesen, acik, siparisler, baglantilar: b, now })
}

/** Saf hesap — testlerde veritabanı olmadan çağrılır. */
export function donemOzetiniKur(g: {
  aralik: DonemAraligi
  paraBirimi: string
  gerceklesen: Array<{ direction: string; amount: Prisma.Decimal | number | null; currency: string }>
  acik: Array<{ direction: string; amount: Prisma.Decimal | number | null; currency: string; dueAt: Date | null }>
  siparisler: HakedisSiparisi[]
  baglantilar: Map<string, HakedisBaglantisi>
  now: Date
}): DonemOzeti {
  const { aralik, paraBirimi, now } = g
  const satirlar = g.siparisler
    .map(o => hakedisSatiri(o, g.baglantilar.get(o.provider.toUpperCase())))
    .filter((s): s is HakedisSatiri => s !== null)

  // GERÇEKLEŞEN: kayıtlar (dönem filtresi sorguda) + dönemdeki siparişler
  const donemSiparisleri = satirlar.filter(s => s.orderDate >= aralik.from && s.orderDate < aralik.to)
  const tahsilatlar = g.gerceklesen.filter(r => r.direction === 'receivable')
  const odemeler = g.gerceklesen.filter(r => r.direction === 'payable')
  const tahsilat = paraKovala(tahsilatlar, paraBirimi)
  const odeme = paraKovala(odemeler, paraBirimi)
  const pazaryeri = hakedisOzeti(donemSiparisleri, paraBirimi)

  // PLAN: vade [şimdi, +30g]; hakediş ödeme günü aynı pencerede
  const ufuk = addDays(now, PLAN_GUN)
  const plandaki = g.acik.filter(r => r.dueAt && r.dueAt >= now && r.dueAt <= ufuk)
  const planHakedis = satirlar.filter(s => s.status !== 'RETURNED' && s.expectedPayoutAt >= now && s.expectedPayoutAt <= ufuk)
  const planReceivable = paraKovala(plandaki.filter(r => r.direction === 'receivable'), paraBirimi)
  const planPayable = paraKovala(plandaki.filter(r => r.direction === 'payable'), paraBirimi)
  const hakedis = hakedisOzeti(planHakedis, paraBirimi)

  // GECİKEN: vadesi geçmiş açık kayıtlar — yönler AYRI
  const gecikenler = g.acik.filter(r => r.dueAt && r.dueAt < now)

  return {
    period: { key: aralik.key, from: aralik.from.toISOString(), to: aralik.to.toISOString(), timezone: aralik.timezone },
    currency: paraBirimi,
    gerceklesen: {
      tahsilat,
      odeme,
      pazaryeriBrut: pazaryeri.gross,
      pazaryeriNet: pazaryeri.net,
      iade: pazaryeri.returns,
      net: yuvarla(new Prisma.Decimal(tahsilat.amount).minus(odeme.amount).plus(pazaryeri.net.amount)),
      kayitSayisi: { tahsilat: tahsilatlar.length, odeme: odemeler.length },
      siparisSayisi: donemSiparisleri.length
    },
    plan: {
      receivable: planReceivable,
      payable: planPayable,
      hakedis,
      net: yuvarla(new Prisma.Decimal(planReceivable.amount).plus(hakedis.net.amount).minus(planPayable.amount)),
      counts: {
        receivable: plandaki.filter(r => r.direction === 'receivable').length,
        payable: plandaki.filter(r => r.direction === 'payable').length,
        hakedisOrders: planHakedis.length
      },
      estimated: hakedis.estimated,
      estimatedReasons: hakedis.estimatedReasons
    },
    overdue: {
      payable: paraKovala(gecikenler.filter(r => r.direction === 'payable'), paraBirimi),
      receivable: paraKovala(gecikenler.filter(r => r.direction === 'receivable'), paraBirimi),
      count: gecikenler.length
    }
  }
}

/**
 * Bugün / bu hafta / bu ay ÖZETLERİ TEK SORGU SETİYLE.
 * `/tracker/summary` üçünü birden veriyor; üç kez sorgu atmak yerine
 * en geniş aralık çekilir, dönem filtresi bellekte uygulanır.
 */
export async function donemOzetleri(
  prisma: PrismaClient,
  workspaceId: string,
  now = new Date()
): Promise<Record<DonemAnahtari, DonemOzeti>> {
  const araliklar: Record<DonemAnahtari, DonemAraligi> = {
    today: periodRange('today', now), week: periodRange('week', now), month: periodRange('month', now)
  }
  const from = new Date(Math.min(...Object.values(araliklar).map(a => a.from.getTime())))
  const to = new Date(Math.max(...Object.values(araliklar).map(a => a.to.getTime())))
  const ws = await prisma.businessWorkspace.findUnique({ where: { id: workspaceId }, select: { currency: true } })
  const paraBirimi = (ws?.currency || 'TRY').toUpperCase()
  const b = await baglantilar(prisma, workspaceId)
  const [gerceklesen, acik, siparisler] = await Promise.all([
    prisma.businessRecord.findMany({
      where: gerceklesenKayitWhere(workspaceId, from, to, now),
      select: { direction: true, amount: true, currency: true, settlementAt: true, completedAt: true }
    }),
    prisma.businessRecord.findMany({
      where: { workspaceId, archivedAt: null, status: { in: ACIK_DURUMLAR }, dueAt: { not: null } },
      select: { direction: true, amount: true, currency: true, dueAt: true }
    }),
    prisma.marketplaceOrder.findMany({
      where: { workspaceId, status: { not: 'CANCELLED' } },
      select: { provider: true, status: true, orderDate: true, currency: true, grossAmount: true, discountAmount: true, commissionAmount: true, shippingAmount: true, refundAmount: true }
    })
  ])
  const sonuc = {} as Record<DonemAnahtari, DonemOzeti>
  for (const key of Object.keys(araliklar) as DonemAnahtari[]) {
    const a = araliklar[key]
    const donemdeki = gerceklesen.filter(r => {
      const t = r.settlementAt ?? r.completedAt
      return t !== null && t >= a.from && t < a.to
    })
    sonuc[key] = donemOzetiniKur({ aralik: a, paraBirimi, gerceklesen: donemdeki, acik, siparisler, baglantilar: b, now })
  }
  return sonuc
}

/* ---------- Rapor: dönem satırları ---------- */

export type RaporSatiri = {
  /** 'YYYY-MM-DD' (gün) ya da haftanın Pazartesi günü. */
  key: string
  from: string
  to: string
  tahsilat: number
  odeme: number
  pazaryeriBrut: number
  pazaryeriNet: number
  iade: number
  /** tahsilat − odeme + pazaryeriNet. */
  net: number
  siparisSayisi: number
}

export type RaporOzeti = {
  period: DonemOzeti['period']
  currency: string
  /** 'day' ≤ 31 gün, üstü 'week'. */
  granularity: 'day' | 'week'
  rows: RaporSatiri[]
  totals: GerceklesenOzeti
  /** Aralık dışı ama bilgi için: raporun kapsadığı sipariş/kayıt sayısı. */
  estimated: boolean
  estimatedReasons: TahminSebebi[]
}

/**
 * Dönem raporu: aralık ≤ 31 gün ise gün, değilse hafta (Pzt) satırları.
 * Tanımlar `donemOzetiniKur` ile aynı; satırlar bellekte kovalanır.
 * Yalnız işletme para birimi satırlara girer (diğerleri toplamlarda
 * "ayrıca" listesinde).
 */
export async function donemRaporu(
  prisma: PrismaClient,
  workspaceId: string,
  secim: { period: DonemAnahtari } | { from: string; to: string },
  now = new Date()
): Promise<RaporOzeti> {
  const aralik = 'period' in secim ? periodRange(secim.period, now) : customRange(secim.from, secim.to)
  const ws = await prisma.businessWorkspace.findUnique({ where: { id: workspaceId }, select: { currency: true } })
  const paraBirimi = (ws?.currency || 'TRY').toUpperCase()
  const b = await baglantilar(prisma, workspaceId)
  const [gerceklesen, siparisler] = await Promise.all([
    prisma.businessRecord.findMany({
      where: gerceklesenKayitWhere(workspaceId, aralik.from, aralik.to, now),
      select: { direction: true, amount: true, currency: true, settlementAt: true, completedAt: true }
    }),
    prisma.marketplaceOrder.findMany({
      where: { workspaceId, status: { not: 'CANCELLED' }, orderDate: { gte: aralik.from, lt: aralik.to } },
      select: { provider: true, status: true, orderDate: true, currency: true, grossAmount: true, discountAmount: true, commissionAmount: true, shippingAmount: true, refundAmount: true }
    })
  ])
  return raporuKur({ aralik, paraBirimi, gerceklesen, siparisler, baglantilar: b, now })
}

export function raporuKur(g: {
  aralik: DonemAraligi
  paraBirimi: string
  gerceklesen: Array<{ direction: string; amount: Prisma.Decimal | number | null; currency: string; settlementAt: Date | null; completedAt: Date | null }>
  siparisler: HakedisSiparisi[]
  baglantilar: Map<string, HakedisBaglantisi>
  now: Date
}): RaporOzeti {
  const { aralik, paraBirimi } = g
  const gunSayisi = Math.round((aralik.to.getTime() - aralik.from.getTime()) / 86400_000)
  const granularity: 'day' | 'week' = gunSayisi <= 31 ? 'day' : 'week'
  const kovaBasi = (d: Date) => granularity === 'day' ? startOfDayIst(d) : startOfWeekIst(d)
  const kovaSonu = (d: Date) => addDays(d, granularity === 'day' ? 1 : 7)

  // Kovaları aralık üzerinde önceden aç ki boş günler de satır olsun.
  const kovalar = new Map<string, RaporSatiri>()
  for (let t = kovaBasi(aralik.from); t < aralik.to; t = kovaSonu(t)) {
    kovalar.set(istDayKey(t), {
      key: istDayKey(t), from: t.toISOString(), to: kovaSonu(t).toISOString(),
      tahsilat: 0, odeme: 0, pazaryeriBrut: 0, pazaryeriNet: 0, iade: 0, net: 0, siparisSayisi: 0
    })
  }
  const kova = (d: Date) => kovalar.get(istDayKey(kovaBasi(d)))
  const anaPara = (c: string | null | undefined) => (c || paraBirimi).toUpperCase() === paraBirimi

  for (const r of g.gerceklesen) {
    const t = r.settlementAt ?? r.completedAt
    if (!t || !anaPara(r.currency) || r.amount === null) continue
    const k = kova(t); if (!k) continue
    const tutar = Number(r.amount)
    if (r.direction === 'receivable') k.tahsilat += tutar
    else if (r.direction === 'payable') k.odeme += tutar
  }
  const satirlar = g.siparisler
    .map(o => hakedisSatiri(o, g.baglantilar.get(o.provider.toUpperCase())))
    .filter((s): s is HakedisSatiri => s !== null)
  for (const s of satirlar) {
    const k = kova(s.orderDate); if (!k) continue
    k.siparisSayisi += 1
    if (!anaPara(s.currency)) continue
    k.pazaryeriBrut += Number(s.gross); k.pazaryeriNet += Number(s.net); k.iade += Number(s.refund)
  }
  const yuvarlaSayi = (n: number) => Math.round(n * 100) / 100
  const rows = [...kovalar.values()].map(k => ({
    ...k,
    tahsilat: yuvarlaSayi(k.tahsilat), odeme: yuvarlaSayi(k.odeme),
    pazaryeriBrut: yuvarlaSayi(k.pazaryeriBrut), pazaryeriNet: yuvarlaSayi(k.pazaryeriNet), iade: yuvarlaSayi(k.iade),
    net: yuvarlaSayi(k.tahsilat - k.odeme + k.pazaryeriNet)
  }))

  const ozet = donemOzetiniKur({
    aralik, paraBirimi, now: g.now, baglantilar: g.baglantilar, siparisler: g.siparisler, acik: [],
    gerceklesen: g.gerceklesen.map(r => ({ direction: r.direction, amount: r.amount, currency: r.currency }))
  })
  const hak = hakedisOzeti(satirlar, paraBirimi)
  return {
    period: ozet.period,
    currency: paraBirimi,
    granularity,
    rows,
    totals: ozet.gerceklesen,
    estimated: hak.estimated,
    estimatedReasons: hak.estimatedReasons
  }
}
