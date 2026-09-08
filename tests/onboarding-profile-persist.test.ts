import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { onboardingRoutes } from '../src/services/onboarding'

/*
 * 🔴 KURULUM ANKETI CEVAPLARI SESSIZCE KAYBOLUYORDU.
 *
 * Olculdu (08.09.2026, calisan sunucu + Android emulator): ankette
 * "Büyüyor" ve "Nakit akışı" secilip kaydedilince yanit 200 donuyor ve
 * govdede dogru degerler geliyordu, ama veritabaninda `businessStage`
 * `null`, `challenges` `"[]"` kaliyordu. Kullaniciya hicbir hata
 * gosterilmiyordu -- arayuz "kaydedildi" diyordu.
 *
 * Sebep: `PUT /onboarding/profile` once `BusinessProfile`a yaziyor,
 * hemen ardindan `syncWorkspaceToLegacyProfile` `BusinessWorkspace`i
 * profilin ustune KOSULSUZ kopyaliyordu. Anket cevaplari calisma
 * alanina hic yazilmadigi icin, yazilan degerler ayni istek icinde
 * geri siliniyordu.
 *
 * ⚠️ Arıza WEBI DE etkiliyordu (ayni uc nokta, `OnboardingPage.jsx`),
 * ve yalnizca ZATEN calisma alani olan kullanicida gorunuyordu: alani
 * olmayanda sync erken donuyor, veri sag kaliyordu.
 */

type Kayit = Record<string, unknown>

function sahtePrisma(calismaAlaniVar: boolean) {
  const calismaAlani: Kayit = {
    id: 'ws-1',
    name: 'Butik Ada',
    sector: '',
    city: '',
    currency: 'TRY',
    businessStage: null,
    employeeCount: null,
    salesChannels: '[]',
    primaryGoal: null,
    challenges: '[]',
    monthlySales: 0,
    monthlyExpenses: 0,
    cashBalance: 0,
    debtBalance: 0
  }
  let profil: Kayit | null = null

  return {
    calismaAlani,
    profil: () => profil,
    userPreference: {
      findUnique: async () => (calismaAlaniVar ? { activeWorkspaceId: 'ws-1' } : null)
    },
    businessMember: {
      findFirst: async () => (calismaAlaniVar ? { workspaceId: 'ws-1' } : null)
    },
    businessWorkspace: {
      findUnique: async () => (calismaAlaniVar ? calismaAlani : null),
      update: async ({ data }: { data: Kayit }) => {
        Object.assign(calismaAlani, data)
        return calismaAlani
      }
    },
    businessProfile: {
      findUnique: async () => profil,
      upsert: async ({ create, update }: { create: Kayit; update: Kayit }) => {
        profil = profil ? { ...profil, ...update } : { ...create }
        return profil
      },
      create: async ({ data }: { data: Kayit }) => {
        profil = { ...data }
        return profil
      },
      update: async ({ data }: { data: Kayit }) => {
        profil = { ...(profil ?? {}), ...data }
        return profil
      }
    }
  }
}

async function uygulama(prisma: unknown) {
  const app = Fastify()
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: 6 }
  })
  await app.register(onboardingRoutes as any, { prisma })
  return app
}

const ANKET = {
  name: 'Butik Ada',
  sector: 'Perakende',
  city: 'İzmir',
  businessStage: 'growth',
  challenges: ['cash_flow'],
  salesChannels: ['retail_store']
}

describe('kurulum anketi kalicilik', () => {
  it('calisma alani olan kullanicinin cevaplari ayni istekte geri silinmiyor', async () => {
    const prisma = sahtePrisma(true)
    const app = await uygulama(prisma)
    try {
      const yanit = await app.inject({
        method: 'PUT',
        url: '/onboarding/profile',
        payload: ANKET
      })
      expect(yanit.statusCode).toBe(200)

      /* Asil sart: sunucunun DEPOSUNDA duruyor mu. Yanit govdesi
         yaniltici olabiliyordu -- arıza tam olarak buradaydi. */
      expect(prisma.profil()).toMatchObject({
        businessStage: 'growth',
        challenges: JSON.stringify(['cash_flow']),
        salesChannels: JSON.stringify(['retail_store'])
      })
    } finally {
      await app.close()
    }
  })

  it('cevaplar dogruluk kaynagina, yani calisma alanina yaziliyor', async () => {
    const prisma = sahtePrisma(true)
    const app = await uygulama(prisma)
    try {
      await app.inject({ method: 'PUT', url: '/onboarding/profile', payload: ANKET })
      expect(prisma.calismaAlani).toMatchObject({
        sector: 'Perakende',
        city: 'İzmir',
        businessStage: 'growth',
        challenges: JSON.stringify(['cash_flow'])
      })
    } finally {
      await app.close()
    }
  })

  it('bos ad calisma alaninin adini silmiyor', async () => {
    const prisma = sahtePrisma(true)
    const app = await uygulama(prisma)
    try {
      await app.inject({
        method: 'PUT',
        url: '/onboarding/profile',
        payload: { name: '', businessStage: 'startup' }
      })
      expect(prisma.calismaAlani.name).toBe('Butik Ada')
      expect(prisma.calismaAlani.businessStage).toBe('startup')
    } finally {
      await app.close()
    }
  })

  it('calisma alani olmayan kullanicida da cevaplar duruyor', async () => {
    const prisma = sahtePrisma(false)
    const app = await uygulama(prisma)
    try {
      const yanit = await app.inject({ method: 'PUT', url: '/onboarding/profile', payload: ANKET })
      expect(yanit.statusCode).toBe(200)
      expect(prisma.profil()).toMatchObject({ businessStage: 'growth' })
    } finally {
      await app.close()
    }
  })
})
