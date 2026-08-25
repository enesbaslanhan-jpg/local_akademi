import type { PrismaClient } from '@prisma/client'
import { getMarketplaceSummary } from './queries.js'
import { getMarketplaceOperations } from './operations.js'

/*
 * AI MENTOR PAZARYERI BAGLAMI.
 *
 * Kurallar:
 * - RAW provider payload mentora HICBIR ZAMAN gonderilmez.
 * - Yalnizca normalize edilmis AGGREGATE veriler: sayilar ve toplamlar.
 * - Urun analytics'i (goruntuleme/favori) provider saglamadigi icin
 *   burada DA yer almaz; yalnizca LocalKarar siparis aggregate'i var.
 * - Mentor baglamina musteri bazli hicbir sey girmez. Urun basliklari
 *   saticinin kendi urunleridir, musteriverisi degildir.
 * - Mentor veriyi YORUMLAR; deterministik finansal sonucu yeniden
 *   HESAPLAMAZ.
 *
 * TEK KAYNAK: operasyonel snapshot Genel Bakis/Ana Sayfa ile AYNI
 * ortak operations servisinden gelir; mentor icin ikinci bir hesap
 * mantigi YAZILMAZ.
 */

export async function buildMarketplaceMentorContext(
  prisma: PrismaClient,
  workspaceId: string
): Promise<{ hasData: boolean; text: string }> {
  let summary
  try {
    summary = await getMarketplaceSummary(prisma, workspaceId, 30)
  } catch {
    return { hasData: false, text: '' }
  }

  if (summary.orderCount === 0) return { hasData: false, text: '' }

  const tl = (value: number | null) =>
    value === null ? 'veri yok' : `${Math.round(value).toLocaleString('tr-TR')} TL`

  const lines: string[] = [
    '[PAZARYERI OZETI - SON 30 GUN]',
    `- Siparis sayisi: ${summary.orderCount}`,
    `- Brüt satis: ${tl(summary.grossSales)}`,
    `- Indirim toplami: ${tl(summary.discountTotal || null)}`
  ]

  // Komisyon/kargo/iade provider tutar vermedikce "veri yok" olarak
  // gecer; mentor bunlari tahmin etmeye CALISMAMALI.
  lines.push(`- Komisyon toplami: ${tl(summary.commissionTotal)}`)
  lines.push(`- Kargo toplami: ${tl(summary.shippingTotal)}`)
  lines.push(`- Iade toplami: ${tl(summary.refundTotal)}`)
  lines.push(`- Net katki: ${summary.netContribution === null ? 'veri yok (komisyon/kargo/iade tutarlari saglanmadi)' : tl(summary.netContribution)}`)

  if (summary.topProducts.length > 0) {
    const top = summary.topProducts
      .slice(0, 3)
      .map((product, index) => `${index + 1}. ${product.title} (${product.quantity} adet)`)
      .join(', ')
    lines.push(`- Cok satan urunler: ${top}`)
  }

  // --- Ortak operations snapshot'i (Genel Bakis / Ana Sayfa ile ayni servis) ---
  try {
    const operations = await getMarketplaceOperations(prisma, workspaceId)
    const { summary: ops, actions, highReturnProducts } = operations

    if (ops.connected) {
      lines.push('[PAZARYERI BUGUNKU DURUM]')
      // Provider bazinda ozet: yalnizca aggregate sayilar, PII yok.
      const activeProviders = ops.providers.filter(p => p.status !== 'DISABLED')
      if (activeProviders.length > 0) {
        const labels = activeProviders.map(p => ({ TRENDYOL: 'Trendyol', HEPSIBURADA: 'Hepsiburada', N11: 'N11' }[p.provider] || p.provider))
        lines.push(`- Bagli saglayici(lar): ${labels.join(', ')}`)
      }
      lines.push(`- Bugunun siparisi: ${ops.today.orderCount} (brut satis: ${ops.today.grossSales === 0 ? 'yok' : tl(ops.today.grossSales)})`)
      if (ops.today.pendingShipmentCount > 0) {
        lines.push(`- Bugun kargoya verilmeyi bekleyen siparis: ${ops.today.pendingShipmentCount}`)
      }
      lines.push(`- Dusuk stoklu urun (esik ${ops.inventory.threshold}): ${ops.inventory.lowStockCount}`)
      lines.push(`- Stogu biten urun: ${ops.inventory.outOfStockCount}`)
      if (ops.performance.bestSeller) {
        lines.push(`- En cok satan urun (30 gun): ${ops.performance.bestSeller.title} (${ops.performance.bestSeller.unitsSold} adet)`)
      }
      for (const item of highReturnProducts) {
        const ratePercent = Math.round(item.returnRate * 100)
        lines.push(`- Iade orani yuksek: ${item.title} (%${ratePercent}, ${item.returnedUnits} adet)`)
      }
      if (ops.sync.lastSyncedAt) {
        lines.push(`- Son basarili esitleme: ${ops.sync.lastSyncedAt.toISOString()}`)
      }
      if (actions.length > 0) {
        lines.push(`- Acik dikkat noktalari: ${actions.map(action => action.title).join('; ')}`)
      }
    } else if (ops.sync.hasError) {
      lines.push('- Not: pazaryeri baglantisinda esitleme hatasi var; veriler guncel olmayabilir.')
    }
  } catch {
    /* Snapshot olusturulamadiysa mentor akisi bozulmaz. */
  }

  lines.push(
    '\nNot: Bu ozet yalnizca toplamlar ve urun adetleri icerir; musteri kimligi tasimaz. ' +
    '"veri yok" yazan alanlar saglayicidan gelmemistir, tahmin uydurma.'
  )

  return { hasData: true, text: lines.join('\n') }
}
