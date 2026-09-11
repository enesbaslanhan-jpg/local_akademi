import type { FastifyInstance } from 'fastify'
import { Prisma, type PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { access } from './business-tracker.js'
import { syncAutomaticReminder } from './business-reminder-worker.js'
import { hesapBakiyeleri } from './kasa-bakiye.js'
import { DEADLINE_SOURCES, RENEWAL_LABELS, RENEWAL_TEMPLATES } from '../config/business-deadlines.js'

const money = z.number().finite().nonnegative().max(1e12).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.001)
const currency = z.enum(['TRY', 'USD', 'EUR', 'GBP']).default('TRY')
const date = z.string().datetime({ offset: true })
const name = z.string().trim().min(1).max(160)
export const loanInput = z.object({
  institution: name, amount: money.refine(v => v > 0), currency,
  installmentCount: z.number().int().min(1).max(360),
  installmentAmount: money.refine(v => v > 0), firstPaymentAt: date,
  requestKey: z.string().uuid()
})
const accountInput = z.object({ name, type: z.enum(['cash', 'bank']), currency,
  openingBalance: z.number().finite().min(-1e12).max(1e12), openingAt: date })
const employeeInput = z.object({ name, startedAt: date, salaryAmount: money, currency,
  insured: z.boolean(), firstSalaryAt: date, firstPremiumAt: date.optional(), premiumAmount: money.optional(),
  leaveAllowance: z.number().min(0).max(366).multipleOf(0.5), requestKey: z.string().uuid()
}).superRefine((v, ctx) => {
  if (v.insured && (!v.firstPremiumAt || v.premiumAmount === undefined)) ctx.addIssue({ code: 'custom', message: 'SGK tarihi ve tutarı girilmelidir.' })
  if (new Date(v.firstSalaryAt) < new Date(v.startedAt)) ctx.addIssue({ code: 'custom', message: 'Maaş tarihi işe girişten önce olamaz.' })
})

/** Anchor every installment to the original day: Jan 31 → Feb 28 → Mar 31. */
export function installmentDate(first: Date, offset: number) {
  const result = new Date(first)
  result.setUTCDate(1)
  result.setUTCMonth(first.getUTCMonth() + offset)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(first.getUTCDate(), lastDay))
  return result
}

export function remainingInstallments(records: { status: string; amount: Prisma.Decimal | string | number | null }[]) {
  // Cancelled installments remain outstanding until corrected; hiding one is not repayment.
  return records.filter(r => r.status !== 'completed').reduce((sum, r) => sum.plus(r.amount ?? 0), new Prisma.Decimal(0)).toFixed(2)
}

async function createScheduledRecord(tx: Prisma.TransactionClient, data: Prisma.BusinessRecordUncheckedCreateInput, actorId: number) {
  const record = await tx.businessRecord.create({ data: { ...data, createdById: actorId } })
  await tx.businessRecordHistory.create({ data: { workspaceId: record.workspaceId, recordId: record.id, actorId,
    action: 'created', newData: JSON.stringify(record) } })
  await syncAutomaticReminder(tx, record)
  return record
}

export async function businessFinanceRoutes(app: FastifyInstance, opts?: { prisma?: PrismaClient }) {
  const prisma = opts?.prisma ?? sharedPrisma
  app.addHook('preHandler', async (request, reply) => {
    await app.authenticate(request as any, reply as any)
  })
  async function allowed(request: any, reply: any, write = false, personnel = false) {
    const member = await access(prisma, request.user.id, request.params.workspaceId, reply, write)
    if (member && personnel && !['owner', 'manager', 'admin', 'accountant'].includes(member.role)) {
      reply.status(403).send({ error: 'Personel bilgileri için yönetim yetkisi gerekir.' }); return null
    }
    return member
  }

  app.get('/:workspaceId/tax-profile', async (request, reply) => {
    if (!await allowed(request, reply)) return
    const { workspaceId } = request.params as { workspaceId: string }
    const setting = await prisma.businessSetting.findUnique({ where: { workspaceId } })
    return { profile: JSON.parse(setting?.taxProfile ?? '{}'), sources: DEADLINE_SOURCES }
  })
  app.get('/:workspaceId/finance/deadlines', async (request, reply) => {
    if (!await allowed(request, reply)) return
    const { workspaceId } = request.params as { workspaceId: string }
    const until = new Date(Date.now() + 30 * 86400000)
    const records = await prisma.businessRecord.findMany({ where: { workspaceId, archivedAt: null,
      category: { in: ['tax', 'sgk'] }, status: { notIn: ['completed', 'cancelled'] }, dueAt: { lte: until } },
      select: { id: true, title: true, dueAt: true }, orderBy: { dueAt: 'asc' }, take: 10 })
    return { records, notice: DEADLINE_SOURCES.notice }
  })
  app.post('/:workspaceId/tax-profile', async (request, reply) => {
    if (!await allowed(request, reply, true, true)) return
    const parsed = z.object({ taxpayerType: z.enum(['individual', 'limited']), vatPeriod: z.enum(['monthly', 'quarterly']),
      hasEmployees: z.boolean(), bagkur: z.boolean(), year: z.number().int().min(2026).max(2100),
      deadlines: z.array(z.object({ kind: z.enum(['vat', 'withholding', 'provisional', 'sgk', 'bagkur']), firstDueAt: date })).min(1).max(5)
    }).safeParse(request.body)
    if (!parsed.success) return reply.code(422).send({ error: 'Mükellefiyet ve teyit ettiğiniz ilk tarihleri girin.' })
    const input = parsed.data
    if (input.deadlines.some(d => Number(d.firstDueAt.slice(0, 4)) !== input.year)) return reply.code(422).send({ error: 'İlk tarihler seçilen yıl içinde olmalıdır.' })
    if (new Set(input.deadlines.map(d => d.kind)).size !== input.deadlines.length) return reply.code(422).send({ error: 'Her yükümlülük bir kez seçilmelidir.' })
    if (input.deadlines.some(d => (d.kind === 'sgk' && !input.hasEmployees) || (d.kind === 'bagkur' && !input.bagkur))) return reply.code(422).send({ error: 'Tarihler mükellefiyet profiliyle uyuşmuyor.' })
    const { workspaceId } = request.params as { workspaceId: string }
    const actorId = (request.user as { id: number }).id
    const labels = { vat: 'KDV', withholding: 'Muhtasar', provisional: input.taxpayerType === 'limited' ? 'Kurum geçici vergi' : 'Gelir geçici vergi', sgk: 'SGK primi', bagkur: 'Bağ-Kur primi' }
    const result = await prisma.$transaction(async tx => {
      await tx.businessWorkspace.update({ where: { id: workspaceId }, data: { updatedAt: new Date() } })
      await tx.businessSetting.upsert({ where: { workspaceId }, update: { taxProfile: JSON.stringify(input) }, create: { workspaceId, taxProfile: JSON.stringify(input) } })
      let created = 0
      for (const deadline of input.deadlines) {
        const step = deadline.kind === 'provisional' || (deadline.kind === 'vat' && input.vatPeriod === 'quarterly') ? 3 : 1
        for (let offset = 0; offset < 12; offset += step) {
          const dueAt = installmentDate(new Date(deadline.firstDueAt), offset)
          if (dueAt.getUTCFullYear() !== input.year) continue
          const sourceKey = `tax:${deadline.kind}:${dueAt.toISOString().slice(0, 7)}`
          const existing = await tx.businessRecord.findUnique({ where: { workspaceId_sourceKey: { workspaceId, sourceKey } } })
          if (existing) continue
          await createScheduledRecord(tx, { workspaceId, createdById: actorId, sourceKey, type: 'other', direction: 'neutral', category: 'tax',
            title: `${labels[deadline.kind]} — tarihi teyit edin`, description: DEADLINE_SOURCES.notice, dueAt, originalDueAt: dueAt,
            metadata: JSON.stringify({ deadlineKind: deadline.kind, sources: DEADLINE_SOURCES, projected: offset !== 0 }) }, actorId)
          created++
        }
      }
      return { created, notice: DEADLINE_SOURCES.notice }
    }, { timeout: 60000, maxWait: 15000 })
    return result
  })
  app.post('/:workspaceId/renewals', async (request, reply) => {
    if (!await allowed(request, reply, true)) return
    const parsed = z.object({ template: z.enum(RENEWAL_TEMPLATES), dueAt: date, yearly: z.boolean(), requestKey: z.string().uuid() }).safeParse(request.body)
    if (!parsed.success) return reply.code(422).send({ error: 'Yenileme türü ve tarihi girin.' })
    const { workspaceId } = request.params as { workspaceId: string }
    const actorId = (request.user as { id: number }).id
    const input = parsed.data
    return prisma.$transaction(async tx => {
      await tx.businessWorkspace.update({ where: { id: workspaceId }, data: { updatedAt: new Date() } })
      const sourceKey = `renewal:${input.requestKey}`
      const existing = await tx.businessRecord.findUnique({ where: { workspaceId_sourceKey: { workspaceId, sourceKey } } })
      if (existing) return existing
      return createScheduledRecord(tx, { workspaceId, createdById: actorId, sourceKey, type: 'other', title: RENEWAL_LABELS[input.template],
        dueAt: new Date(input.dueAt), originalDueAt: new Date(input.dueAt), recurrenceRule: input.yearly ? 'yearly' : null,
        description: 'Geçerlilik ve yenileme süresini belgenizden teyit edin.' }, actorId)
    })
  })

  app.get('/:workspaceId/loans', async (request, reply) => {
    if (!await allowed(request, reply)) return
    const { workspaceId } = request.params as { workspaceId: string }
    const loans = await prisma.businessLoan.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' },
      include: { records: { orderBy: { installmentNo: 'asc' } } } })
    return { loans: loans.map(loan => ({ ...loan, remainingBalance: remainingInstallments(loan.records),
      paidCount: loan.records.filter(r => r.status === 'completed').length,
      totalRepayment: loan.installmentAmount.mul(loan.installmentCount).toFixed(2) })) }
  })
  app.post('/:workspaceId/loans', async (request, reply) => {
    if (!await allowed(request, reply, true)) return
    const parsed = loanInput.safeParse(request.body)
    if (!parsed.success) return reply.code(422).send({ error: 'Kredi bilgilerini kontrol edin.', details: parsed.error.flatten() })
    const { workspaceId } = request.params as { workspaceId: string }
    const actorId = (request.user as { id: number }).id
    const input = parsed.data
    const result = await prisma.$transaction(async tx => {
      // Serialize retries per workspace without blocking other workspaces.
      await tx.businessWorkspace.update({ where: { id: workspaceId }, data: { updatedAt: new Date() } })
      const existing = await tx.businessLoan.findUnique({ where: { workspaceId_requestKey: { workspaceId, requestKey: input.requestKey } } })
      if (existing) return existing
      const loan = await tx.businessLoan.create({ data: { ...input, workspaceId, firstPaymentAt: new Date(input.firstPaymentAt) } })
      for (let i = 0; i < loan.installmentCount; i++) {
        const dueAt = installmentDate(loan.firstPaymentAt, i)
        await createScheduledRecord(tx, { workspaceId, createdById: actorId, loanId: loan.id, installmentNo: i + 1,
          type: 'payment', direction: 'payable', title: `${loan.institution} — ${i + 1}/${loan.installmentCount}`,
          amount: loan.installmentAmount, currency: loan.currency, category: 'loan_repayment', dueAt, originalDueAt: dueAt }, actorId)
      }
      await tx.workspaceActivity.create({ data: { workspaceId, actorId, action: 'loan.created', entityType: 'business_loan', entityId: loan.id } })
      return loan
    }, { timeout: 60000, maxWait: 15000 })
    return reply.code(201).send(result)
  })

  app.get('/:workspaceId/accounts', async (request, reply) => {
    if (!await allowed(request, reply)) return
    const { workspaceId } = request.params as { workspaceId: string }
    /* Bakiye hesabı `kasa-bakiye.ts`te; Genel Bakış da aynı sayıyı okuyor. */
    const balances = await hesapBakiyeleri(prisma, workspaceId)
    return { accounts: balances }
  })
  app.post('/:workspaceId/accounts', async (request, reply) => {
    if (!await allowed(request, reply, true)) return
    const parsed = accountInput.safeParse(request.body)
    if (!parsed.success) return reply.code(422).send({ error: 'Hesap bilgilerini kontrol edin.' })
    const { workspaceId } = request.params as { workspaceId: string }
    return reply.code(201).send(await prisma.businessAccount.create({ data: { ...parsed.data, workspaceId, openingAt: new Date(parsed.data.openingAt) } }))
  })

  app.get('/:workspaceId/employees', async (request, reply) => {
    if (!await allowed(request, reply, false, true)) return
    const { workspaceId } = request.params as { workspaceId: string }
    const employees = await prisma.businessEmployee.findMany({ where: { workspaceId, archivedAt: null }, include: { leaves: true }, orderBy: { name: 'asc' } })
    return { employees: employees.map(e => ({ ...e, leaveUsed: e.leaves.reduce((sum, l) => sum.plus(l.days), new Prisma.Decimal(0)).toString() })) }
  })
  app.post('/:workspaceId/employees', async (request, reply) => {
    if (!await allowed(request, reply, true, true)) return
    const parsed = employeeInput.safeParse(request.body)
    if (!parsed.success) return reply.code(422).send({ error: 'Personel bilgilerini kontrol edin.', details: parsed.error.flatten() })
    const { workspaceId } = request.params as { workspaceId: string }
    const actorId = (request.user as { id: number }).id
    const { firstSalaryAt, firstPremiumAt, premiumAmount, ...input } = parsed.data
    const employee = await prisma.$transaction(async tx => {
      await tx.businessWorkspace.update({ where: { id: workspaceId }, data: { updatedAt: new Date() } })
      const existing = await tx.businessEmployee.findUnique({ where: { workspaceId_requestKey: { workspaceId, requestKey: input.requestKey } } })
      if (existing) return existing
      const e = await tx.businessEmployee.create({ data: { ...input, workspaceId, startedAt: new Date(input.startedAt) } })
      await createScheduledRecord(tx, { workspaceId, createdById: actorId, employeeId: e.id, type: 'payment', direction: 'payable', category: 'salary',
        title: `${e.name} — Maaş`, amount: e.salaryAmount, currency: e.currency, dueAt: new Date(firstSalaryAt), originalDueAt: new Date(firstSalaryAt), recurrenceRule: 'monthly' }, actorId)
      if (e.insured && firstPremiumAt && premiumAmount !== undefined) await createScheduledRecord(tx, { workspaceId, createdById: actorId, employeeId: e.id,
        type: 'payment', direction: 'payable', category: 'sgk', title: `${e.name} — SGK primi`, description: 'Ödeme tarihini SGK’dan teyit edin. Tutar kullanıcı tarafından girilmiştir.',
        amount: premiumAmount, currency: e.currency, dueAt: new Date(firstPremiumAt), originalDueAt: new Date(firstPremiumAt), recurrenceRule: 'monthly' }, actorId)
      return e
    })
    return reply.code(201).send(employee)
  })
  app.post('/:workspaceId/employees/:employeeId/leaves', async (request, reply) => {
    if (!await allowed(request, reply, true, true)) return
    const parsed = z.object({ date, days: z.number().positive().max(366).multipleOf(0.5), requestKey: z.string().uuid() }).safeParse(request.body)
    if (!parsed.success) return reply.code(422).send({ error: 'İzin tarihi ve gün sayısını kontrol edin.' })
    const { workspaceId, employeeId } = request.params as { workspaceId: string; employeeId: string }
    const employee = await prisma.businessEmployee.findFirst({ where: { id: employeeId, workspaceId, archivedAt: null } })
    if (!employee) return reply.code(404).send({ error: 'Personel bulunamadı.' })
    return reply.code(201).send(await prisma.businessEmployeeLeave.upsert({ where: { employeeId_requestKey: { employeeId, requestKey: parsed.data.requestKey } },
      update: {}, create: { ...parsed.data, employeeId, date: new Date(parsed.data.date) } }))
  })

  app.get('/:workspaceId/finance/monthly', async (request, reply) => {
    if (!await allowed(request, reply)) return
    const parsed = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).safeParse(request.query)
    if (!parsed.success) return reply.code(422).send({ error: 'Ay YYYY-AA biçiminde olmalıdır.' })
    const { workspaceId } = request.params as { workspaceId: string }
    const start = new Date(`${parsed.data.month}-01T00:00:00+03:00`)
    const [year, month] = parsed.data.month.split('-').map(Number)
    const boundary = (offset: number) => new Date(Date.UTC(year, month - 1 + offset, 1) - 3 * 3600000)
    async function period(from: Date, to: Date) {
      const now = new Date()
      const groups = await prisma.businessRecord.groupBy({ by: ['currency', 'direction', 'category'], where: { workspaceId, archivedAt: null,
        status: 'completed', loanId: null,
        AND: [{ OR: [{ settlementAt: null, completedAt: { gte: from, lt: to, lte: now } }, { settlementAt: { gte: from, lt: to, lte: now } }] },
          { OR: [{ category: null }, { category: { notIn: ['loan_repayment', 'transfer', 'capital'] } }] }] }, _sum: { amount: true } })
      const currencies: Record<string, { income: string; expense: string; net: string }> = {}
      for (const g of groups) {
        if (!['receivable', 'payable'].includes(g.direction)) continue
        const current = currencies[g.currency] ?? { income: '0.00', expense: '0.00', net: '0.00' }
        const key = g.direction === 'receivable' ? 'income' : 'expense'
        current[key] = new Prisma.Decimal(current[key]).plus(g._sum.amount ?? 0).toFixed(2)
        current.net = new Prisma.Decimal(current.income).minus(current.expense).toFixed(2)
        currencies[g.currency] = current
      }
      return { currencies, categories: groups.map(g => ({ currency: g.currency, direction: g.direction, category: g.category ?? 'other', amount: g._sum.amount?.toFixed(2) ?? '0.00' })) }
    }
    return { month: parsed.data.month, basis: 'completed_records', current: await period(start, boundary(1)), previous: await period(boundary(-1), start) }
  })
}
