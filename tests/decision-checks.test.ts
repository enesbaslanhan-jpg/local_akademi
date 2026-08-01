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
    allocatedFixedCost: 0
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
    allocatedFixedCost: 0
  }

  const dcRes = calculateDecisionCheckProfitability(dcInput)
  expect(dcRes.calculationComplete).toBe(false)
  expect(dcRes.unknownCostCodes).toContain('productCost')
  expect(dcRes.totalKnownCost).toBe(1000 * 0.15 + 50 + 20 + 30) 
})
