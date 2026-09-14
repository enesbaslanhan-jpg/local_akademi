import type { PrismaClient } from '@prisma/client'

/*
 * SİPARİŞ SATIRINA ÜRÜN GÖRSELİ BAĞLAMA (15.09.2026).
 *
 * Sipariş satırı (MarketplaceOrderItem) görsel taşımaz; provider sipariş
 * API'leri görsel vermez. Görsel, aynı workspace'in ürün kataloğunda
 * (MarketplaceProduct.imageUrl) duruyor. Ürün sahibi: "siparişler sadece
 * yazı olarak görünüyor" — satıcı listeye bakınca ürünü tanımalı.
 *
 * Eşleşme sırası: barkod → sku → externalProductId. Trendyol'da ürünün
 * externalId'si zaten barkod (TrendyolMapper), o yüzden barkod en güvenli
 * anahtar. Eşleşme yoksa null: uydurma/yer tutucu görsel DÖNMEZ; arayüz
 * baş harfli kutu gösterir.
 *
 * Tek sorgu: sayfadaki bütün satırların anahtarları toplanır, ürünler bir
 * kerede çekilir. Sipariş başına sorgu atılsa 50 siparişlik sayfa 50
 * sorgu olurdu.
 */

type Satir = {
  externalProductId?: string | null
  sku?: string | null
  barcode?: string | null
}

export type GorselHaritasi = {
  barkod: Map<string, string>
  sku: Map<string, string>
  externalId: Map<string, string>
}

export async function urunGorselHaritasi(
  prisma: PrismaClient,
  workspaceId: string,
  provider: string,
  satirlar: Satir[]
): Promise<GorselHaritasi> {
  const bos: GorselHaritasi = { barkod: new Map(), sku: new Map(), externalId: new Map() }
  const barkodlar = [...new Set(satirlar.map(s => s.barcode).filter((x): x is string => !!x))]
  const skular = [...new Set(satirlar.map(s => s.sku).filter((x): x is string => !!x))]
  const disKimlikler = [...new Set(satirlar.map(s => s.externalProductId).filter((x): x is string => !!x))]
  if (!barkodlar.length && !skular.length && !disKimlikler.length) return bos

  const urunler = await prisma.marketplaceProduct.findMany({
    where: {
      workspaceId,
      provider: provider as any,
      imageUrl: { not: null },
      OR: [
        ...(barkodlar.length ? [{ barcode: { in: barkodlar } }] : []),
        ...(skular.length ? [{ sku: { in: skular } }] : []),
        ...(disKimlikler.length ? [{ externalId: { in: disKimlikler } }] : [])
      ]
    },
    select: { barcode: true, sku: true, externalId: true, imageUrl: true }
  })

  for (const u of urunler) {
    if (!u.imageUrl) continue
    if (u.barcode && !bos.barkod.has(u.barcode)) bos.barkod.set(u.barcode, u.imageUrl)
    if (u.sku && !bos.sku.has(u.sku)) bos.sku.set(u.sku, u.imageUrl)
    if (!bos.externalId.has(u.externalId)) bos.externalId.set(u.externalId, u.imageUrl)
  }
  return bos
}

export function satirGorseli(harita: GorselHaritasi, satir: Satir): string | null {
  return (satir.barcode && harita.barkod.get(satir.barcode))
    || (satir.sku && harita.sku.get(satir.sku))
    || (satir.externalProductId && harita.externalId.get(satir.externalProductId))
    || null
}

/*
 * Siparişleri provider'a göre gruplayıp her satıra `imageUrl` yazar.
 * Girdi nesneleri yerinde değiştirilir (orderJson öncesi çağrılır).
 */
export async function siparisSatirlarinaGorselBagla(
  prisma: PrismaClient,
  workspaceId: string,
  siparisler: Array<{ provider: string; items?: Satir[] | null }>
): Promise<void> {
  const gruplar = new Map<string, Satir[]>()
  for (const s of siparisler) {
    if (!Array.isArray(s.items)) continue
    const liste = gruplar.get(s.provider) ?? []
    liste.push(...s.items)
    gruplar.set(s.provider, liste)
  }
  const haritalar = new Map<string, GorselHaritasi>()
  await Promise.all([...gruplar.entries()].map(async ([provider, satirlar]) => {
    haritalar.set(provider, await urunGorselHaritasi(prisma, workspaceId, provider, satirlar))
  }))
  for (const s of siparisler) {
    if (!Array.isArray(s.items)) continue
    const harita = haritalar.get(s.provider)
    for (const satir of s.items) {
      ;(satir as Satir & { imageUrl?: string | null }).imageUrl = harita ? satirGorseli(harita, satir) : null
    }
  }
}
