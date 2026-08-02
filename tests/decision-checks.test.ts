import { test, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { calculateDecisionCheckProfitability } from '../src/services/decision-check-rule-engine'
import { calculateMarketplaceProfit } from '../src/services/formulas'

const prisma = new PrismaClient()

afterAll(async () => {
  await prisma.$disconnect()
})

test('Helper Compatibility - Profitability calculations match for identical inputs', () => {
  const dcInput = {
    salePrice: 1000,
    productCost: 400,
    commissionRate: 15,
    shippingCost: 50,
    packagingCost: 20,
    taxOrDeduction: 0,
    otherVariableCost: 0,
    returnLossAllowance: 30,
    allocatedFixedCost: 0,
    discountRate: 0
  }
  
  const formulaInput = {
    satis_fiyati: 1000,
    urun_maliyeti: 400,
    komisyon_orani: 15,
    kargo: 50,
    ambalaj: 20,
    reklam_payi: 0,
    iade_riski: 30
  }

  const dcRes = calculateDecisionCheckProfitability(dcInput)
  const formRes = calculateMarketplaceProfit(formulaInput)

  expect(dcRes.revenue).toBe(1000)
  expect(dcRes.totalKnownCost).toBe(formRes.siparis_toplam_maliyeti)
  expect(dcRes.estimatedProfit).toBe(formRes.siparis_katkisi)
  expect(dcRes.estimatedMarginPercent).toBe(formRes.siparis_marji)
})

test('Helper - Unknown Behavior is respected', () => {
  const dcInput = {
    salePrice: 1000,
    productCost: null,
    commissionRate: 15,
    shippingCost: 50,
    packagingCost: 20,
    taxOrDeduction: 0,
    otherVariableCost: 0,
    returnLossAllowance: 30,
    allocatedFixedCost: 0,
    discountRate: 0
  }

  const dcRes = calculateDecisionCheckProfitability(dcInput)
  expect(dcRes.calculationComplete).toBe(false)
  expect(dcRes.unknownCostCodes).toContain('productCost')
  expect(dcRes.totalKnownCost).toBe(1000 * 0.15 + 50 + 20 + 30) 
})

test('Profitability tool calculates break-even price and discounted scenario', () => {
  const result = calculateDecisionCheckProfitability({
    salePrice: 1000,
    productCost: 400,
    commissionRate: 15,
    shippingCost: 50,
    packagingCost: 20,
    returnLossAllowance: 30,
    otherVariableCost: 50,
    discountRate: 20
  })

  expect(result.totalKnownCost).toBe(700)
  expect(result.contribution).toBe(300)
  expect(result.contributionMarginPercent).toBe(30)
  expect(result.breakEvenPrice).toBeCloseTo(550 / 0.85, 4)
  expect(result.discountedScenario).toMatchObject({
    salePrice: 800,
    commissionAmount: 120,
    totalCost: 670,
    contribution: 130,
    profitable: true
  })
})

test('Profitability tool warns when discount makes the product unprofitable', () => {
  const result = calculateDecisionCheckProfitability({
    salePrice: 1000,
    productCost: 650,
    commissionRate: 15,
    shippingCost: 50,
    packagingCost: 20,
    returnLossAllowance: 30,
    otherVariableCost: 0,
    discountRate: 20
  })

  expect(result.contribution).toBe(100)
  expect(result.discountedScenario?.contribution).toBe(-70)
  expect(result.riskWarnings).toContain('Planlanan indirim ürünü zarar noktasına geçiriyor.')
  expect(result.safeNextSteps).toContain('İndirim oranını azaltın veya indirimi maliyet düşüşüyle eşleştirin.')
})
