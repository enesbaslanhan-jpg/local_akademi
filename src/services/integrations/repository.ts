import { Prisma, type PrismaClient } from '@prisma/client'
import { computeNetContribution } from '../../lib/money.js'
import type { NormalizedOrder, NormalizedProduct } from './types.js'

/*
 * UPSERT REPOSITORY.
 *
 * Duplicate onleme: (workspaceId, provider, externalId) bilesik
 * UNIQUE uzerinden upsert. Ayni siparis/urun tekrar cekilirse yeni
 * kayit URETMEZ; degisen alanlar guncellenir. Tenant isolation:
 * workspaceId hem where'de hem unique anahtarda.
 *
 * Para kurallari: provider JSON'daki float degerler toFixed(2) ile
 * sabitlenip Decimal'e cevrilir. Komisyon/kargo/iade provider
 * vermedikce null kalir; netContribution yalnizca tum bilesenler
 * mevcutsa deterministik olarak hesaplanir, aksi halde null.
 */

function decOrNull(value: number | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  return new Prisma.Decimal(value.toFixed(2))
}

function dec(value: number): Prisma.Decimal {
  return new Prisma.Decimal(((Number.isFinite(value) ? value : 0)).toFixed(2))
}

/**
 * Sync sirasinda tespit edilen anlamlı durum gecisleri (teslim/iade).
 * Activity feed siparis basina event URETMEZ; toplam sayi tek
 * aggregate event'e yazilir.
 */
export interface OrderTransitionSink {
  deliveredDetected: number
  returnDetected: number
}

export function newOrderTransitionSink(): OrderTransitionSink {
  return { deliveredDetected: 0, returnDetected: 0 }
}

function recordTransitions(
  sink: OrderTransitionSink | undefined,
  previousStatus: string | null,
  nextStatus: string,
  created: boolean
): void {
  if (!sink) return
  if (nextStatus === 'DELIVERED' && (created || previousStatus !== 'DELIVERED')) {
    sink.deliveredDetected += 1
  }
  const isReturn = nextStatus === 'RETURNED' || nextStatus === 'PARTIALLY_RETURNED'
  const previouslyReturned = previousStatus === 'RETURNED' || previousStatus === 'PARTIALLY_RETURNED'
  if (isReturn && (created || !previouslyReturned)) {
    sink.returnDetected += 1
  }
}

export async function upsertOrderWithItems(
  prisma: PrismaClient,
  workspaceId: string,
  provider: string,
  order: NormalizedOrder,
  /** Opsiyonel gecis toplama: activity feed aggregate event'leri icin. */
  transitions?: OrderTransitionSink
): Promise<'created' | 'updated'> {
  if (!order.externalId) throw new Error('NormalizedOrder.externalId is required')

  return prisma.$transaction(async tx => {
    const uniqueKey = {
      workspaceId_provider_externalId: {
        workspaceId,
        provider: provider as any,
        externalId: order.externalId
      }
    }

    const existing = await tx.marketplaceOrder.findUnique({
      where: uniqueKey,
      select: { id: true, status: true }
    })

    const grossAmount = dec(order.grossAmount ?? 0)
    const discountAmount = decOrNull(order.discountAmount)
    const commissionAmount = decOrNull(order.commissionAmount)
    const shippingAmount = decOrNull(order.shippingAmount)
    const refundAmount = decOrNull(order.refundAmount)
    const taxAmount = decOrNull(order.taxAmount)

    const netContribution = order.netContribution !== undefined && order.netContribution !== null
      ? order.netContribution
      : computeNetContribution({
          gross: grossAmount,
          discount: discountAmount,
          commission: commissionAmount,
          shipping: shippingAmount,
          refund: refundAmount
        })

    // Provider tam anlik gorunum verir: satirlar once silinir sonra
    // yeniden yazilir. Kismi guncellemelerde eski satirlar birikip
    // yanlis toplam uretmesin.
    let orderId: string
    if (existing) {
      await tx.marketplaceOrder.update({
        where: { id: existing.id },
        data: {
          externalOrderNumber: order.externalOrderNumber ?? null,
          externalCustomerId: order.externalCustomerId ?? null,
          customerDisplayName: order.customerDisplayName ?? null,
          currency: order.currency || 'TRY',
          grossAmount,
          discountAmount,
          commissionAmount,
          shippingAmount,
          refundAmount,
          taxAmount,
          netContribution,
          status: order.status as any,
          orderDate: order.orderDate,
          providerUpdatedAt: order.providerUpdatedAt ?? null,
          syncedAt: new Date(),
          metadata: (order.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull
        }
      })
      orderId = existing.id
      recordTransitions(transitions, String(existing.status), order.status, false)
    } else {
      orderId = (
        await tx.marketplaceOrder.create({
          data: {
            workspaceId,
            provider: provider as any,
            externalId: order.externalId,
            externalOrderNumber: order.externalOrderNumber ?? null,
            externalCustomerId: order.externalCustomerId ?? null,
            customerDisplayName: order.customerDisplayName ?? null,
            currency: order.currency || 'TRY',
            grossAmount,
            discountAmount,
            commissionAmount,
            shippingAmount,
            refundAmount,
            taxAmount,
            netContribution,
            status: order.status as any,
            orderDate: order.orderDate,
            providerUpdatedAt: order.providerUpdatedAt ?? null,
            syncedAt: new Date(),
            metadata: (order.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull
          }
        })
      ).id
      recordTransitions(transitions, null, order.status, true)
    }

    await tx.marketplaceOrderItem.deleteMany({ where: { orderId } })
    if (order.items.length > 0) {
      await tx.marketplaceOrderItem.createMany({
        data: order.items.map(item => ({
          orderId,
          externalId: item.externalId ?? null,
          externalProductId: item.externalProductId ?? null,
          sku: item.sku ?? null,
          barcode: item.barcode ?? null,
          title: item.title.slice(0, 500),
          quantity: Math.max(0, Math.trunc(item.quantity || 0)),
          unitPrice: dec(item.unitPrice ?? 0),
          grossAmount: dec(item.grossAmount ?? 0),
          discountAmount: decOrNull(item.discountAmount),
          commissionAmount: decOrNull(item.commissionAmount),
          shippingAllocation: decOrNull(item.shippingAllocation),
          refundAmount: decOrNull(item.refundAmount),
          netContribution: item.netContribution ?? null,
          metadata: (item.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull
        }))
      })
    }

    return existing ? 'updated' : 'created'
  })
}

export async function upsertNormalizedProduct(
  prisma: PrismaClient | Prisma.TransactionClient,
  workspaceId: string,
  provider: string,
  product: NormalizedProduct
): Promise<'created' | 'updated'> {
  if (!product.externalId) throw new Error('NormalizedProduct.externalId is required')

  const shared = {
    sku: product.sku ?? null,
    barcode: product.barcode ?? null,
    title: product.title.slice(0, 500),
    brand: product.brand ?? null,
    category: product.category ?? null,
    salePrice: decOrNull(product.salePrice),
    listPrice: decOrNull(product.listPrice),
    stockQuantity: product.stockQuantity === undefined ? null : product.stockQuantity ?? null,
    currency: product.currency ?? null,
    isActive: product.isActive,
    imageUrl: product.imageUrl ?? null,
    providerUpdatedAt: product.providerUpdatedAt ?? null,
    syncedAt: new Date(),
    metadata: (product.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull
  }

  const existing = await prisma.marketplaceProduct.findUnique({
    where: {
      workspaceId_provider_externalId: {
        workspaceId,
        provider: provider as any,
        externalId: product.externalId
      }
    },
    select: { id: true }
  })

  if (existing) {
    // YALNIZCA provider sahipli alanlar guncellenir. internalNote/tags/
    // lowStockThresholdOverride/isFavorite LocalKarar'in isletme verisi-
    // dir; sync bu alanlari ASLA ezmez.
    await prisma.marketplaceProduct.update({ where: { id: existing.id }, data: shared })
    return 'updated'
  }
  await prisma.marketplaceProduct.create({
    data: {
      ...shared,
      workspaceId,
      provider: provider as any,
      externalId: product.externalId
    }
  })
  return 'created'
}
