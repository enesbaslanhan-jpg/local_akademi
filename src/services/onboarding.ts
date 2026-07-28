import { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { z } from 'zod'

async function ensureWorkspace(prisma: PrismaClient, userId: number, name?: string): Promise<string> {
  const existing = await prisma.businessMember.findFirst({
    where: { userId, status: 'active' },
    include: { workspace: true }
  })
  if (existing) return existing.workspaceId

  const ws = await prisma.$transaction(async (tx) => {
    const workspace = await tx.businessWorkspace.create({
      data: {
        name: name || 'My Business',
        createdById: userId
      }
    })
    await tx.businessMember.create({
      data: { workspaceId: workspace.id, userId, role: 'owner', status: 'active' }
    })
    await tx.businessSetting.create({
      data: { workspaceId: workspace.id }
    })
    await tx.workspaceActivity.create({
      data: {
        workspaceId: workspace.id,
        actorId: userId,
        action: 'workspace.created',
        entityType: 'workspace',
        entityId: workspace.id,
        metadata: JSON.stringify({ source: 'onboarding' })
      }
    })
    return workspace
  })

  await prisma.userPreference.upsert({
    where: { userId },
    update: { activeWorkspaceId: ws.id },
    create: { userId, activeWorkspaceId: ws.id }
  })

  return ws.id
}

async function syncWorkspaceToLegacyProfile(prisma: PrismaClient, userId: number, workspaceId?: string): Promise<void> {
  let wsId = workspaceId
  if (!wsId) {
    const pref = await prisma.userPreference.findUnique({ where: { userId } })
    wsId = pref?.activeWorkspaceId ?? undefined
  }
  if (!wsId) {
    const member = await prisma.businessMember.findFirst({
      where: { userId, status: 'active' },
      orderBy: { joinedAt: 'desc' }
    })
    if (!member) return
    wsId = member.workspaceId
  }

  const ws = await prisma.businessWorkspace.findUnique({ where: { id: wsId } })
  if (!ws) return

  const existing = await prisma.businessProfile.findUnique({ where: { userId } })
  const data = {
    name: ws.name || '',
    sector: ws.sector || '',
    city: ws.city || '',
    currency: ws.currency || 'TRY',
    monthlySales: ws.monthlySales,
    monthlyExpenses: ws.monthlyExpenses,
    cashBalance: ws.cashBalance,
    debtBalance: ws.debtBalance,
    businessStage: ws.businessStage,
    employeeCount: ws.employeeCount,
    salesChannels: ws.salesChannels || '[]',
    primaryGoal: ws.primaryGoal,
    challenges: ws.challenges || '[]'
  }

  if (existing) {
    await prisma.businessProfile.update({ where: { userId }, data })
  } else {
    await prisma.businessProfile.create({ data: { userId, ...data } })
  }
}

const BUSINESS_STAGES = ['startup', 'growth', 'mature'] as const
const SALES_CHANNELS = ['retail_store', 'ecommerce', 'wholesale', 'marketplace', 'export', 'service', 'other'] as const
const CHALLENGES = ['digital_skills', 'cash_flow', 'customer_acquisition', 'cost_control', 'employee_finding', 'competition', 'technology_adoption', 'regulation', 'other'] as const

const profileUpdateSchema = z.object({
  name: z.string().trim().max(200).optional(),
  sector: z.string().trim().max(200).optional(),
  city: z.string().trim().max(200).optional(),
  currency: z.string().length(3).optional(),
  monthlySales: z.number().finite().nonnegative().max(1e15).optional(),
  monthlyExpenses: z.number().finite().nonnegative().max(1e15).optional(),
  cashBalance: z.number().finite().nonnegative().max(1e15).optional(),
  debtBalance: z.number().finite().nonnegative().max(1e15).optional(),
  businessStage: z.enum(BUSINESS_STAGES).nullable().optional(),
  employeeCount: z.number().int().nonnegative().max(100000).nullable().optional(),
  salesChannels: z.array(z.enum(SALES_CHANNELS)).max(10).optional(),
  primaryGoal: z.string().trim().max(500).nullable().optional(),
  weeklyLearningMinutes: z.number().int().min(0).max(3000).nullable().optional(),
  challenges: z.array(z.enum(CHALLENGES)).max(10).optional()
})

const completeSchema = z.object({
  onboardingCompleted: z.literal(true)
})

export async function onboardingRoutes(fastify: FastifyInstance, opts?: { prisma?: PrismaClient }) {
  const prisma = opts?.prisma ?? sharedPrisma

  fastify.get('/onboarding/status', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const user = request.user as { id: number }
    const [pref, profile] = await Promise.all([
      prisma.userPreference.findUnique({ where: { userId: user.id } }),
      prisma.businessProfile.findUnique({ where: { userId: user.id } })
    ])
    const hasEssentialFields = !!(profile?.name || profile?.sector)
    return {
      onboardingCompleted: pref?.onboardingCompleted || false,
      profileComplete: hasEssentialFields,
      hasProfile: !!profile
    }
  })

  fastify.get('/onboarding/profile', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const user = request.user as { id: number }
    const profile = await prisma.businessProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      return {
        name: '', sector: '', city: '', currency: 'TRY',
        monthlySales: 0, monthlyExpenses: 0, cashBalance: 0, debtBalance: 0,
        businessStage: null, employeeCount: null, salesChannels: [],
        primaryGoal: null, weeklyLearningMinutes: null, challenges: []
      }
    }
    return {
      name: profile.name,
      sector: profile.sector,
      city: profile.city,
      currency: profile.currency,
      monthlySales: profile.monthlySales,
      monthlyExpenses: profile.monthlyExpenses,
      cashBalance: profile.cashBalance,
      debtBalance: profile.debtBalance,
      businessStage: profile.businessStage,
      employeeCount: profile.employeeCount,
      salesChannels: safeJsonParse(profile.salesChannels, []),
      primaryGoal: profile.primaryGoal,
      weeklyLearningMinutes: profile.weeklyLearningMinutes,
      challenges: safeJsonParse(profile.challenges, [])
    }
  })

  fastify.put('/onboarding/profile', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }

    let validated: z.infer<typeof profileUpdateSchema>
    try {
      validated = profileUpdateSchema.parse(request.body)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      }
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const profile = await prisma.businessProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        name: validated.name ?? '',
        sector: validated.sector ?? '',
        city: validated.city ?? '',
        currency: validated.currency ?? 'TRY',
        monthlySales: validated.monthlySales ?? 0,
        monthlyExpenses: validated.monthlyExpenses ?? 0,
        cashBalance: validated.cashBalance ?? 0,
        debtBalance: validated.debtBalance ?? 0,
        businessStage: validated.businessStage ?? null,
        employeeCount: validated.employeeCount ?? null,
        salesChannels: JSON.stringify(validated.salesChannels ?? []),
        primaryGoal: validated.primaryGoal ?? null,
        weeklyLearningMinutes: validated.weeklyLearningMinutes ?? null,
        challenges: JSON.stringify(validated.challenges ?? [])
      },
      update: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.sector !== undefined && { sector: validated.sector }),
        ...(validated.city !== undefined && { city: validated.city }),
        ...(validated.currency !== undefined && { currency: validated.currency }),
        ...(validated.monthlySales !== undefined && { monthlySales: validated.monthlySales }),
        ...(validated.monthlyExpenses !== undefined && { monthlyExpenses: validated.monthlyExpenses }),
        ...(validated.cashBalance !== undefined && { cashBalance: validated.cashBalance }),
        ...(validated.debtBalance !== undefined && { debtBalance: validated.debtBalance }),
        ...(validated.businessStage !== undefined && { businessStage: validated.businessStage }),
        ...(validated.employeeCount !== undefined && { employeeCount: validated.employeeCount }),
        ...(validated.salesChannels !== undefined && { salesChannels: JSON.stringify(validated.salesChannels) }),
        ...(validated.primaryGoal !== undefined && { primaryGoal: validated.primaryGoal }),
        ...(validated.weeklyLearningMinutes !== undefined && { weeklyLearningMinutes: validated.weeklyLearningMinutes }),
        ...(validated.challenges !== undefined && { challenges: JSON.stringify(validated.challenges) })
      }
    })

    await syncWorkspaceToLegacyProfile(prisma, user.id)

    return reply.status(200).send({
      name: profile.name, sector: profile.sector, city: profile.city,
      currency: profile.currency, monthlySales: profile.monthlySales,
      monthlyExpenses: profile.monthlyExpenses, cashBalance: profile.cashBalance,
      debtBalance: profile.debtBalance, businessStage: profile.businessStage,
      employeeCount: profile.employeeCount,
      salesChannels: safeJsonParse(profile.salesChannels, []),
      primaryGoal: profile.primaryGoal,
      weeklyLearningMinutes: profile.weeklyLearningMinutes,
      challenges: safeJsonParse(profile.challenges, [])
    })
  })

  fastify.post('/onboarding/complete', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }

    let validated: z.infer<typeof completeSchema>
    try {
      validated = completeSchema.parse(request.body)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      }
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const profile = await prisma.businessProfile.findUnique({ where: { userId: user.id } })
    if (!profile || (!profile.name && !profile.sector)) {
      return reply.status(422).send({ error: 'Profile must have at least name or sector before completing onboarding' })
    }

    await ensureWorkspace(prisma, user.id, profile.name || undefined)

    await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, onboardingCompleted: true, activeWorkspaceId: undefined },
      update: { onboardingCompleted: true }
    })

    return { onboardingCompleted: true }
  })

  fastify.post('/onboarding/reset', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }

    await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, onboardingCompleted: false },
      update: { onboardingCompleted: false }
    })

    return { onboardingCompleted: false }
  })
}

function safeJsonParse(val: string, fallback: any) {
  try { return JSON.parse(val) } catch { return fallback }
}
