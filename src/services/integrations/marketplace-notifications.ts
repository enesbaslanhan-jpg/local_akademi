import type { PrismaClient } from '@prisma/client'
import { resolveLowStockThreshold } from './product-analytics.js'
import { pushBildir, PUSH_ADRESLERI } from '../push/push-gonder.js'

/*
 * PAZARYERI BILDIRIMLERI.
 *
 * 🔴 NEDEN VAR: pazaryeri katmani hicbir `BusinessNotification`
 * uretmiyordu. Dusuk stok esigi tanimliydi ve stok verisi cekiliyordu
 * ama zil ikonuna HIC dusmuyordu -- kullanici ekrani acmadikca
 * stogunun bittigini ogrenemiyordu.
 *
 * 🔴 GURULTU KURALLARI (activity feed'deki desenle ayni):
 * - Urun basina bildirim YOK. 30 urun bitse tek satir yazilir; aksi
 *   halde zil kullanilmaz hale gelirdi.
 * - `dedupeKey` GUN bazinda: ayni gun icinde esitleme kac kez kosarsa
 *   kossun ikinci bildirim yazilmaz.
 * - Sayi degismedikce ertesi gun de tekrar yazilmaz; anahtar sayiyi
 *   iceriyor, yani yalniz durum DEGISTIGINDE yeni bildirim cikar.
 */

/** Bildirim kimin zil ikonuna dussun: baglantiyi kuran kisi. */
async function alicilar(prisma: PrismaClient, workspaceId: string): Promise<number[]> {
  const uyeler = await prisma.businessMember.findMany({
    where: { workspaceId, status: 'active', role: { in: ['owner', 'manager'] } },
    select: { userId: true }
  })
  return uyeler.map(u => u.userId)
}

async function bildirimYaz(
  prisma: PrismaClient,
  input: {
    workspaceId: string; userId: number; dedupeKey: string; type: string; title: string; body: string
    /** Telefon bildiriminin açacağı adres; `null` = telefona GÖNDERME (yalnız zil). */
    pushUrl?: string | null
  }
) {
  const { pushUrl, ...veri } = input
  try {
    await prisma.businessNotification.create({ data: { ...veri, recordId: null } })
    /* Telefon bildirimi: yalnız YENİ yazılan satır için (dedupeKey çakışırsa aşağıdaki catch'e düşer). */
    if (pushUrl !== null) {
      void pushBildir(input.userId, { baslik: input.title, govde: input.body, url: pushUrl ?? PUSH_ADRESLERI.isletmeBildirimleri(input.workspaceId) })
    }
    return true
  } catch (hata: any) {
    /* P2002 = ayni `dedupeKey` zaten var. Beklenen durum; sessizce
       geciliyor -- tekrar bildirim yazmamak zaten amac. */
    if (hata?.code === 'P2002') return false
    throw hata
  }
}

function gunAnahtari(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/*
 * DUSUK STOK.
 *
 * Esik LocalKarar tarafinda; saglayiciya hicbir sey gonderilmiyor.
 * `stockQuantity > 0` sarti bilincli: sifir stok "tukendi", ayri bir
 * durum ve ayri bir bildirim olmali -- ikisini karistirmak "azaldi"
 * diyip aslinda bitmis urunu gostermek olurdu.
 */
export async function dusukStokBildirimi(
  prisma: PrismaClient,
  workspaceId: string,
  now = new Date()
): Promise<number> {
  const esik = resolveLowStockThreshold()
  const adet = await prisma.marketplaceProduct.count({
    where: { workspaceId, isActive: true, stockQuantity: { gt: 0, lte: esik } }
  })
  if (adet === 0) return 0

  const kisiler = await alicilar(prisma, workspaceId)
  let yazilan = 0
  for (const userId of kisiler) {
    const oldu = await bildirimYaz(prisma, {
      workspaceId,
      userId,
      /* Sayi anahtarin PARCASI: durum degismedikce yeni bildirim
         cikmiyor, degisince cikiyor. */
      dedupeKey: `mp:lowstock:${workspaceId}:${userId}:${gunAnahtari(now)}:${adet}`,
      type: 'marketplace_low_stock',
      title: `${adet} üründe stok azaldı`,
      body: `Pazaryeri mağazanızda ${adet} ürünün stoğu ${esik} adedin altına düştü. Ürünler ekranından görebilirsiniz.`
    })
    if (oldu) yazilan++
  }
  return yazilan
}

/*
 * KARGOYA VERILMEYI BEKLEYEN SIPARIS.
 *
 * Yalniz gun sinirini ASMIS siparisler sayiliyor: bugun gelen siparise
 * "geciktin" demek yanlis olurdu.
 */
const GECIKME_ESIGI_GUN = 2

export async function gecikenKargoBildirimi(
  prisma: PrismaClient,
  workspaceId: string,
  now = new Date()
): Promise<number> {
  const sinir = new Date(now.getTime() - GECIKME_ESIGI_GUN * 24 * 60 * 60 * 1000)
  const adet = await prisma.marketplaceOrder.count({
    where: {
      workspaceId,
      status: { in: ['CREATED', 'PROCESSING'] as any[] },
      orderDate: { lt: sinir }
    }
  })
  if (adet === 0) return 0

  const kisiler = await alicilar(prisma, workspaceId)
  let yazilan = 0
  for (const userId of kisiler) {
    const oldu = await bildirimYaz(prisma, {
      workspaceId,
      userId,
      dedupeKey: `mp:latship:${workspaceId}:${userId}:${gunAnahtari(now)}:${adet}`,
      type: 'marketplace_late_shipment',
      title: `${adet} sipariş ${GECIKME_ESIGI_GUN} günden uzun süredir bekliyor`,
      body: `Kargoya verilmeyi bekleyen ${adet} sipariş var. Geciken kargo, pazaryeri puanınızı düşürebilir.`
    })
    if (oldu) yazilan++
  }
  return yazilan
}

/*
 * Esitleme sonrasi cagrilir.
 *
 * ⚠️ FIRLATMAZ: bildirim uretimi esitlemenin yan urunu. Burada cikan
 * bir sorun, basariyla cekilmis siparis/urun verisini kaybettirmemeli.
 */
export async function pazaryeriBildirimleriniUret(
  prisma: PrismaClient,
  workspaceId: string,
  now = new Date()
): Promise<{ dusukStok: number; gecikenKargo: number }> {
  const [dusukStok, gecikenKargo] = await Promise.all([
    dusukStokBildirimi(prisma, workspaceId, now).catch(() => 0),
    gecikenKargoBildirimi(prisma, workspaceId, now).catch(() => 0)
  ])
  return { dusukStok, gecikenKargo }
}

const PAZARYERI_ADI: Record<string, string> = {
  TRENDYOL: 'Trendyol', HEPSIBURADA: 'Hepsiburada', N11: 'N11', SHOPIFY: 'Shopify',
  AMAZON: 'Amazon', WOOCOMMERCE: 'WooCommerce'
}

/*
 * YENİ SİPARİŞ BİLDİRİMİ (29.09.2026).
 *
 * Eşitleme bu çalıştırmada `adet` yeni sipariş yazdıysa işletmenin sahip ve
 * yöneticilerine TEK özet bildirim: 20 sipariş = 1 satır, 20 telefon titremesi
 * değil (bkz. dosya başındaki gürültü kuralları).
 *
 * 🔴 İLK ESİTLEMEDE ÇAĞRILMAZ (çağıran karar verir): ilk eşitleme son 30
 * günün siparişini içeri alır; "30 yeni sipariş geldi" demek yalan olurdu.
 * `dedupeKey` çalıştırma numarasını içerir: aynı çalıştırma iki kez bildirim
 * üretemez. `telefona=false` (elle eşitleme): kullanıcı zaten ekrana bakıyor,
 * yalnız zilde görünür.
 */
export async function yeniSiparisBildir(
  prisma: PrismaClient,
  girdi: { workspaceId: string; connectionId: string; runId: string; provider: string; adet: number; telefona: boolean }
): Promise<void> {
  if (girdi.adet <= 0) return
  const ad = PAZARYERI_ADI[girdi.provider] ?? girdi.provider
  const govde = girdi.adet === 1 ? `1 yeni ${ad} siparişi geldi.` : `${girdi.adet} yeni ${ad} siparişi geldi.`
  for (const userId of await alicilar(prisma, girdi.workspaceId)) {
    await bildirimYaz(prisma, {
      workspaceId: girdi.workspaceId,
      userId,
      dedupeKey: `marketplace_new_orders:${girdi.connectionId}:${girdi.runId}`,
      type: 'marketplace_new_orders',
      title: 'Yeni sipariş',
      body: govde,
      pushUrl: girdi.telefona ? PUSH_ADRESLERI.isletmeSiparisleri(girdi.workspaceId) : null
    })
  }
}
