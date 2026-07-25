import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const profileUpdateSchema = z.object({
  name: z.string().trim().max(200).optional(),
  sector: z.string().trim().max(200).optional(),
  city: z.string().trim().max(200).optional(),
  currency: z.string().length(3).optional(),
  monthly_sales: z.number().finite().nonnegative().max(1e15).optional(),
  monthly_expenses: z.number().finite().nonnegative().max(1e15).optional(),
  cash_balance: z.number().finite().nonnegative().max(1e15).optional(),
  debt_balance: z.number().finite().nonnegative().max(1e15).optional(),
  businessStage: z.string().max(50).optional(),
  employeeCount: z.number().int().nonnegative().max(1000000).nullable().optional(),
  salesChannels: z.array(z.string().max(50)).optional(),
  primaryGoal: z.string().max(50).optional(),
  challenges: z.array(z.string().max(50)).optional(),
  weeklyLearningMinutes: z.number().int().min(0).max(10000).optional()
})

function parseJsonArray(val: string | string[]): string[] {
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) }
  catch { return [] }
}

export async function businessRoutes(fastify: FastifyInstance, opts?: { prisma?: PrismaClient }) {
  const prisma = opts?.prisma || new PrismaClient()

  fastify.get('/business-profile', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    try {
      const profile = await prisma.businessProfile.findFirst({
        where: { userId: user.id }
      })

      if (!profile) {
        return {
          name: '',
          sector: '',
          city: '',
          currency: 'TRY',
          monthly_sales: 0,
          monthly_expenses: 0,
          cash_balance: 0,
          debt_balance: 0,
          businessStage: null,
          employeeCount: null,
          salesChannels: [],
          primaryGoal: null,
          challenges: [],
          weeklyLearningMinutes: 60
        }
      }

      return {
        name: profile.name,
        sector: profile.sector,
        city: profile.city,
        currency: profile.currency,
        monthly_sales: profile.monthlySales,
        monthly_expenses: profile.monthlyExpenses,
        cash_balance: profile.cashBalance,
        debt_balance: profile.debtBalance,
        businessStage: profile.businessStage,
        employeeCount: profile.employeeCount,
        salesChannels: parseJsonArray(profile.salesChannels),
        primaryGoal: profile.primaryGoal,
        challenges: parseJsonArray(profile.challenges),
        weeklyLearningMinutes: profile.weeklyLearningMinutes ?? 60
      }
    } catch (error) {
      request.log.error({ userId: user.id }, 'Failed to fetch business profile')
      return reply.status(500).send({ error: 'Failed to load profile' })
    }
  })

  fastify.put('/business-profile', {
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

    try {
      const profile = await prisma.businessProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          name: validated.name ?? '',
          sector: validated.sector ?? '',
          city: validated.city ?? '',
          currency: validated.currency ?? 'TRY',
          monthlySales: validated.monthly_sales ?? 0,
          monthlyExpenses: validated.monthly_expenses ?? 0,
          cashBalance: validated.cash_balance ?? 0,
          debtBalance: validated.debt_balance ?? 0,
          businessStage: validated.businessStage ?? null,
          employeeCount: validated.employeeCount ?? null,
          salesChannels: JSON.stringify(validated.salesChannels ?? []),
          primaryGoal: validated.primaryGoal ?? null,
          challenges: JSON.stringify(validated.challenges ?? []),
          weeklyLearningMinutes: validated.weeklyLearningMinutes ?? 60
        },
        update: {
          ...(validated.name !== undefined && { name: validated.name }),
          ...(validated.sector !== undefined && { sector: validated.sector }),
          ...(validated.city !== undefined && { city: validated.city }),
          ...(validated.currency !== undefined && { currency: validated.currency }),
          ...(validated.monthly_sales !== undefined && { monthlySales: validated.monthly_sales }),
          ...(validated.monthly_expenses !== undefined && { monthlyExpenses: validated.monthly_expenses }),
          ...(validated.cash_balance !== undefined && { cashBalance: validated.cash_balance }),
          ...(validated.debt_balance !== undefined && { debtBalance: validated.debt_balance }),
          ...(validated.businessStage !== undefined && { businessStage: validated.businessStage }),
          ...(validated.employeeCount !== undefined && { employeeCount: validated.employeeCount }),
          ...(validated.salesChannels !== undefined && { salesChannels: JSON.stringify(validated.salesChannels) }),
          ...(validated.primaryGoal !== undefined && { primaryGoal: validated.primaryGoal }),
          ...(validated.challenges !== undefined && { challenges: JSON.stringify(validated.challenges) }),
          ...(validated.weeklyLearningMinutes !== undefined && { weeklyLearningMinutes: validated.weeklyLearningMinutes })
        }
      })

      return {
        name: profile.name,
        sector: profile.sector,
        city: profile.city,
        currency: profile.currency,
        monthly_sales: profile.monthlySales,
        monthly_expenses: profile.monthlyExpenses,
        cash_balance: profile.cashBalance,
        debt_balance: profile.debtBalance,
        businessStage: profile.businessStage,
        employeeCount: profile.employeeCount,
        salesChannels: parseJsonArray(profile.salesChannels),
        primaryGoal: profile.primaryGoal,
        challenges: parseJsonArray(profile.challenges),
        weeklyLearningMinutes: profile.weeklyLearningMinutes ?? 60
      }
    } catch (error) {
      request.log.error({ userId: user.id }, 'Failed to save business profile')
      return reply.status(500).send({ error: 'Failed to save profile' })
    }
  })

  fastify.get('/dashboard', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }

    try {
      const profile = await prisma.businessProfile.findFirst({
        where: { userId: user.id }
      })

      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.id }
      })

      const tasks = await prisma.taskAssignment.findMany({
        where: { userId: user.id }
      })

      const quizzes = await prisma.quizAttempt.findMany({
        where: { userId: user.id }
      })

      const calculations = await prisma.formulaCalculation.findMany({
        where: { userId: user.id }
      })

      const sales = profile?.monthlySales ?? 0
      const expenses = profile?.monthlyExpenses ?? 0
      const cash = profile?.cashBalance ?? 0
      const debt = profile?.debtBalance ?? 0
      const profit = sales - expenses

      const completedTasks = tasks.filter((t: { status: string; progressPercent: number }) => t.status === 'completed' || t.progressPercent === 100).length
      const avgQuizScore = quizzes.length > 0
        ? Math.round(quizzes.reduce((s: number, q: { score: number }) => s + (q.score || 0), 0) / quizzes.length)
        : 0

      return {
        monthly_sales: sales,
        monthly_expenses: expenses,
        monthly_profit_estimate: profit,
        profit_margin_percent: sales > 0 ? Math.round((profit / sales) * 100) : 0,
        cash_balance: cash,
        debt_balance: debt,
        net_cash_position: cash - debt,
        task_completion_percent: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
        quiz_average: avgQuizScore,
        assigned_tasks: tasks.length,
        completed_tasks: completedTasks,
        formula_calculations: calculations.length
      }
    } catch (error) {
      request.log.error({ userId: user.id }, 'Failed to load dashboard')
      return reply.status(500).send({ error: 'Failed to load dashboard' })
    }
  })
}
