import { Prisma } from '@prisma/client'

/*
 * PARA HESAPLARI.
 *
 * Finansal degerler DB'de Decimal(18,2). Provider JSON'u JS number
 * olarak gelir (binary float); string'e sabitlenmis bicimde cevirip
 * Prisma'ya oyle veriyoruz ki 498.9 gibi degerler 498.90000000000003
 * olmasin. Toplamlar Prisma aggregate ile SQL tarafinda toplanir;
 * burada yalnizca donusum ve deterministik net katki hesabi var.
 */

export function toMoneyString(value: number | null | undefined, fallback?: string): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback ?? null
  // toFixed(2) yeterli: Decimal.toString() sondaki sifirlari kirpar
  // ("498.90" -> "498.9"), DB bicimi icin sabit iki hane korunur.
  return value.toFixed(2)
}

export function moneyOrNull(value: number | null | undefined): Prisma.Decimal | null {
  const str = toMoneyString(value)
  return str === null ? null : new Prisma.Decimal(str)
}

/**
 * Deterministik net katki:
 *   gross - discount - commission - shipping - refund
 * Bilesenlerden herhangi bir provider'da yoksa SONUC UYDURULMAZ:
 * null doner. Sahte "0" kullaniciyi yaniltirdi.
 */
export function computeNetContribution(parts: {
  gross: Prisma.Decimal
  discount?: Prisma.Decimal | null
  commission?: Prisma.Decimal | null
  shipping?: Prisma.Decimal | null
  refund?: Prisma.Decimal | null
}): Prisma.Decimal | null {
  const { gross } = parts
  const discount = parts.discount ?? null
  const commission = parts.commission ?? null
  const shipping = parts.shipping ?? null
  const refund = parts.refund ?? null
  if (!gross || [discount, commission, shipping, refund].some(v => v === null)) return null

  let net = new Prisma.Decimal(gross)
  for (const component of [discount, commission, shipping, refund]) {
    if (component) net = net.minus(component)
  }
  return net.toDecimalPlaces(2)
}

/** API cevaplari icin Decimal -> number (yalniz gosterim amacli). */
export function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}
