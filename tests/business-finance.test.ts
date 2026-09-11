import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { businessFinanceRoutes, installmentDate, remainingInstallments } from '../src/services/business-finance'
import { businessTrackerRoutes } from '../src/services/business-tracker'

const prisma = new PrismaClient()
const app = Fastify()
let workspaceId: string, otherWorkspaceId: string, ownerId: number, viewerId: number, token: string, viewerToken: string
const call = (method: any, path: string, payload?: any, auth?: string) => app.inject({ method, url: `/workspaces/${workspaceId}/${path}`, headers: { authorization: `Bearer ${auth ?? token}` }, ...(payload ? { payload } : {}) })
beforeAll(async () => {
  await app.register(jwt, { secret: 'finance-test-secret-at-least-32-characters' })
  app.decorate('authenticate', async (request: any, reply: any) => { try { await request.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) } })
  await app.register(businessFinanceRoutes, { prefix: '/workspaces', prisma })
  await app.register(businessTrackerRoutes, { prefix: '/workspaces', prisma })
  await app.ready()
  const owner = await prisma.user.create({ data: { email: `finance-${randomUUID()}@test.local`, name: 'Finance Owner', password: 'hash' } })
  const viewer = await prisma.user.create({ data: { email: `viewer-${randomUUID()}@test.local`, name: 'Viewer', password: 'hash' } })
  ownerId = owner.id; viewerId = viewer.id; token = app.jwt.sign({ id: ownerId }); viewerToken = app.jwt.sign({ id: viewerId })
  workspaceId = (await prisma.businessWorkspace.create({ data: { name: 'Finance Test', createdById: ownerId } })).id
  otherWorkspaceId = (await prisma.businessWorkspace.create({ data: { name: 'Other Finance', createdById: ownerId } })).id
  await prisma.businessMember.createMany({ data: [{ workspaceId, userId: ownerId, role: 'owner' }, { workspaceId, userId: viewerId, role: 'viewer' }] })
})
afterAll(async () => {
  if (workspaceId) {
    await prisma.businessRecord.deleteMany({ where: { workspaceId } })
    await prisma.businessWorkspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId] } } })
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, viewerId] } } })
  }
  await app.close(); await prisma.$disconnect()
})

describe('business finance', () => {
  it('accepts client timezone dates and books POS income in its settlement month', async () => {
    const account = await call('POST', 'accounts', { name: 'Valör testi', type: 'bank', openingBalance: 0, openingAt: '2026-01-01T09:00:00+03:00' })
    expect(account.statusCode).toBe(201)
    const record = await call('POST', 'records', { type: 'receivable', title: 'Valör testi', direction: 'receivable', currency: 'GBP', amount: 42, status: 'completed', settlementAt: '2024-02-01T09:00:00+03:00' })
    expect(record.statusCode).toBe(201)
    await prisma.businessRecord.update({ where: { id: record.json().id }, data: { completedAt: new Date('2024-01-31T12:00:00Z') } })
    const january = (await call('GET', 'finance/monthly?month=2024-01')).json()
    const february = (await call('GET', 'finance/monthly?month=2024-02')).json()
    expect(january.current.currencies.GBP).toBeUndefined()
    expect(february.current.currencies.GBP.income).toBe('42.00')
    const renewal = await call('POST', 'renewals', { template: 'insurance', dueAt: '2027-02-01T09:00:00+03:00', yearly: true, requestKey: randomUUID() })
    expect(renewal.statusCode).toBe(200)
    expect(renewal.json().recurrenceRule).toBe('yearly')
  })
  it('preserves month-end anchors, including leap years', () => {
    expect(installmentDate(new Date('2028-01-31T06:00:00Z'), 1).toISOString()).toBe('2028-02-29T06:00:00.000Z')
    expect(installmentDate(new Date('2028-01-31T06:00:00Z'), 2).toISOString()).toBe('2028-03-31T06:00:00.000Z')
    expect(remainingInstallments([{ status: 'open', amount: '0.10' }, { status: 'cancelled', amount: '0.20' }, { status: 'completed', amount: '100' }])).toBe('0.30')
  })
  it('creates exactly 12 installments on concurrent retries and reminders for each', async () => {
    const payload = { institution: 'Test Bank', amount: 1000, installmentCount: 12, installmentAmount: 100, firstPaymentAt: '2028-01-31T06:00:00Z', requestKey: randomUUID() }
    const responses = await Promise.all([call('POST', 'loans', payload), call('POST', 'loans', payload)])
    expect(responses.map(r => r.statusCode)).toEqual([201, 201])
    expect(responses[0].json().id).toBe(responses[1].json().id)
    const list = (await call('GET', 'loans')).json().loans
    const loan = list.find((l: any) => l.id === responses[0].json().id)
    expect(loan.records).toHaveLength(12); expect(loan.remainingBalance).toBe('1200.00')
    expect(await prisma.businessReminder.count({ where: { recordId: { in: loan.records.map((r: any) => r.id) } } })).toBe(24)
    expect((await call('PATCH', `records/${loan.records[0].id}`, { status: 'completed' })).statusCode).toBe(200)
    expect((await call('GET', 'loans')).json().loans[0].remainingBalance).toBe('1100.00')
    expect((await call('PATCH', `records/${loan.records[0].id}`, { amount: 1 })).statusCode).toBe(422)
  })
  it('balances completed payments once, reverses reopened records, excludes future POS settlements', async () => {
    const a = (await call('POST', 'accounts', { name: 'Cash', type: 'cash', openingBalance: 1000, openingAt: '2020-01-01T06:00:00Z' })).json()
    const r = (await call('POST', 'records', { type: 'payment', title: 'Rent', direction: 'payable', amount: 100, accountId: a.id })).json()
    await call('PATCH', `records/${r.id}`, { status: 'completed' }); await call('PATCH', `records/${r.id}`, { status: 'completed' })
    let list = (await call('GET', 'accounts')).json().accounts
    expect(list.find((v: any) => v.id === a.id).balance).toBe('900.00')
    await call('PATCH', `records/${r.id}`, { status: 'open' })
    await call('POST', 'records', { type: 'receivable', title: 'POS', direction: 'receivable', amount: 75, status: 'completed', accountId: a.id, settlementAt: '2099-01-01T06:00:00Z' })
    list = (await call('GET', 'accounts')).json().accounts
    expect(list.find((v: any) => v.id === a.id).balance).toBe('1000.00')
    expect(list.find((v: any) => v.id === a.id).inTransit).toBe('75.00')
    const foreign = await prisma.businessAccount.create({ data: { workspaceId: otherWorkspaceId, name: 'Foreign', type: 'cash', openingBalance: 0, openingAt: new Date() } })
    expect((await call('PATCH', `records/${r.id}`, { accountId: foreign.id })).statusCode).toBe(422)
    expect((await call('PATCH', `records/${r.id}`, { currency: 'USD' })).statusCode).toBe(422)
  })
  it('denies viewers writes and access to personnel', async () => {
    expect((await call('POST', 'accounts', { name: 'X', type: 'cash', openingBalance: 0, openingAt: '2026-01-01T00:00:00Z' }, viewerToken)).statusCode).toBe(403)
    expect((await call('GET', 'employees', undefined, viewerToken)).statusCode).toBe(403)
  })
  it('generates salary and manually supplied SGK records and deduplicates leave', async () => {
    const e = await call('POST', 'employees', { name: 'Employee', startedAt: '2026-01-01T06:00:00Z', salaryAmount: 25000, insured: true,
      firstSalaryAt: '2028-02-01T06:00:00Z', firstPremiumAt: '2028-02-28T06:00:00Z', premiumAmount: 8000, leaveAllowance: 14, requestKey: randomUUID() })
    expect(e.statusCode).toBe(201)
    const records = await prisma.businessRecord.findMany({ where: { employeeId: e.json().id } })
    expect(records.map(r => Number(r.amount)).sort((a, b) => a - b)).toEqual([8000, 25000])
    expect(records.every(r => r.recurrenceRule === 'monthly')).toBe(true)
    const payload = { date: '2026-09-10T06:00:00Z', days: 1.5, requestKey: randomUUID() }
    await call('POST', `employees/${e.json().id}/leaves`, payload); await call('POST', `employees/${e.json().id}/leaves`, payload)
    expect((await call('GET', 'employees')).json().employees[0].leaveUsed).toBe('1.5')
  })
  it('generates different VAT periods without duplicating dates and always keeps the notice', async () => {
    const payload = { taxpayerType: 'individual', vatPeriod: 'quarterly', hasEmployees: false, bagkur: false, year: 2028, deadlines: [{ kind: 'vat', firstDueAt: '2028-01-28T06:00:00Z' }] }
    expect((await call('POST', 'tax-profile', payload)).json().created).toBe(4)
    expect((await call('POST', 'tax-profile', payload)).json().created).toBe(0)
    const records = await prisma.businessRecord.findMany({ where: { workspaceId, category: 'tax' } })
    expect(records.every(r => r.description?.includes('GİB'))).toBe(true)
    expect((await call('POST', 'tax-profile', { ...payload, vatPeriod: 'monthly' })).json().created).toBe(8)
  })
})
