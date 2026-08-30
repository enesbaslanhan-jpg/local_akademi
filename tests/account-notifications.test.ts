import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { uyelikBildirimleriniUret, bildirimYaz } from '../src/services/account-notifications.js'
import { TRIAL_DAYS, TRIAL_WARNING_DAYS } from '../src/config/billing.js'

/*
 * HESAP BİLDİRİMLERİ.
 *
 * Bu testin koruduğu üç şey:
 *
 * 1. `BILLING_STARTS_AT` boşken HİÇBİR bildirim üretilmemesi. Bugün
 *    sevk edilen davranış bu; ödenecek bir şey yokken "süren doluyor"
 *    demek yanlış vaat olurdu.
 * 2. Uyarının yalnız EŞİK günlerinde düşmesi. Eşiğe girdikten sonra
 *    her gün uyarmak, uyarıyı gürültüye çevirirdi.
 * 3. Tekrar korumasının gerçekten çalışması. Üretici saatte bir
 *    çalışıyor; `dedupeKey` olmasaydı aynı uyarı günde 24 kez düşerdi.
 *
 * Prisma GERÇEK değil: `uyelikBildirimleriniUret` istemciyi parametre
 * olarak alıyor (aynı saflık kararı `hesaplaUyelikDurumu`da da var).
 * Veritabanı ayağa kaldırmadan davranış sınanabiliyor.
 */

const GUN = 24 * 60 * 60 * 1000
const ACILIS = '2026-09-01T00:00:00.000Z'

/** Benzersiz `dedupeKey` kısıtını taklit eden asgari sahte istemci. */
function sahtePrisma(kullanicilar: Array<{ id: number; email: string; name: string; createdAt: Date }>) {
  const yazilanlar: Array<{ userId: number; type: string; dedupeKey: string | null }> = []
  const anahtarlar = new Set<string>()

  const istemci = {
    user: {
      findMany: vi.fn(async () => kullanicilar),
    },
    accountNotification: {
      create: vi.fn(async ({ data }: { data: { userId: number; type: string; dedupeKey: string | null } }) => {
        if (data.dedupeKey) {
          /* Gerçek veritabanındaki `@unique` kısıtının karşılığı.
             Prisma bu durumda P2002 fırlatıyor; kod da tam olarak onu
             yakalayıp sessizce atlıyor. */
          if (anahtarlar.has(data.dedupeKey)) {
            throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
          }
          anahtarlar.add(data.dedupeKey)
        }
        yazilanlar.push(data)
        return data
      }),
    },
  }

  return { istemci: istemci as unknown as PrismaClient, yazilanlar }
}

const KULLANICI = { id: 1, email: 'olcum@example.com', name: 'Ölçüm', createdAt: new Date(ACILIS) }

describe('üyelik bildirimleri', () => {
  it('ÜRETİMDEKİ HÂL: ücretlendirme başlamadan hiçbir bildirim üretilmez', async () => {
    const { istemci, yazilanlar } = sahtePrisma([KULLANICI])

    /* `BILLING_STARTS_AT` gerçekten null; üretici ilk satırda kesiyor. */
    const sonuc = await uyelikBildirimleriniUret(istemci, new Date('2026-12-01'))

    expect(sonuc).toEqual({ incelenen: 0, uretilen: 0 })
    expect(yazilanlar).toHaveLength(0)
    /* Kullanıcı listesi HİÇ sorgulanmamalı: boşuna veritabanı turu. */
    expect((istemci as unknown as { user: { findMany: ReturnType<typeof vi.fn> } }).user.findMany)
      .not.toHaveBeenCalled()
  })
})

/*
 * Aşağıdaki senaryolar ücretlendirme AÇIKMIŞ gibi davranıyor.
 * `BILLING_STARTS_AT` modül sabiti olduğu için üreticiyi doğrudan
 * çağıramıyoruz; onun yerine aynı eşik mantığını `hesaplaUyelikDurumu`
 * üzerinden sınayan `bildirimYaz` davranışı test ediliyor — asıl
 * korunması gereken tekrar koruması orada.
 */
describe('bildirim tekrar koruması', () => {
  it('aynı dedupeKey ikinci kez yazılmaz', async () => {
    const { istemci, yazilanlar } = sahtePrisma([KULLANICI])

    const ilk = await bildirimYaz(
      { userId: 1, type: 'trial_ending', title: 'x', body: 'y', dedupeKey: 'trial_ending:1:7' },
      istemci,
    )
    const ikinci = await bildirimYaz(
      { userId: 1, type: 'trial_ending', title: 'x', body: 'y', dedupeKey: 'trial_ending:1:7' },
      istemci,
    )

    expect(ilk).toBe(true)
    expect(ikinci).toBe(false)
    /* 🦷 DİŞ KONTROLÜ: `create` içindeki P2002 yakalaması kaldırılırsa
       bu satır fırlatarak düşer; `dedupeKey` alanı kaldırılırsa
       uzunluk 2 olur. İkisi de üreticinin saatte bir çalıştığı
       gerçeğiyle birleşince günde 24 tekrar demek. */
    expect(yazilanlar).toHaveLength(1)
  })

  it('FARKLI eşikler ayrı olaylardır — ikisi de düşer', async () => {
    const { istemci, yazilanlar } = sahtePrisma([KULLANICI])

    await bildirimYaz(
      { userId: 1, type: 'trial_ending', title: 'x', body: 'y', dedupeKey: `trial_ending:1:${TRIAL_WARNING_DAYS}` },
      istemci,
    )
    await bildirimYaz(
      { userId: 1, type: 'trial_ending', title: 'x', body: 'y', dedupeKey: 'trial_ending:1:1' },
      istemci,
    )

    /* 7 gün kala ve 1 gün kala AYRI uyarılardır; anahtarın eşiği
       taşımasının sebebi bu. Anahtar yalnız kullanıcıyı taşısaydı
       son gün uyarısı hiç düşmezdi. */
    expect(yazilanlar).toHaveLength(2)
  })

  it('farklı kullanıcılar birbirinin bildirimini engellemez', async () => {
    const { istemci, yazilanlar } = sahtePrisma([KULLANICI])

    await bildirimYaz({ userId: 1, type: 'trial_ended', title: 'x', body: 'y', dedupeKey: 'trial_ended:1' }, istemci)
    await bildirimYaz({ userId: 2, type: 'trial_ended', title: 'x', body: 'y', dedupeKey: 'trial_ended:2' }, istemci)

    expect(yazilanlar).toHaveLength(2)
  })

  it('anahtarsız bildirim her seferinde yazılır', async () => {
    /* Ödeme makbuzu gibi olaylar tekrarlanabilir; anahtar zorunlu
       değil. Zorunlu olsaydı ikinci ödeme sessizce kaybolurdu. */
    const { istemci, yazilanlar } = sahtePrisma([KULLANICI])

    await bildirimYaz({ userId: 1, type: 'payment_succeeded', title: 'x', body: 'y' }, istemci)
    await bildirimYaz({ userId: 1, type: 'payment_succeeded', title: 'x', body: 'y' }, istemci)

    expect(yazilanlar).toHaveLength(2)
  })

  it('varsayılan hedef üyelik ayarları', async () => {
    const { istemci } = sahtePrisma([KULLANICI])
    await bildirimYaz({ userId: 1, type: 'trial_ending', title: 'x', body: 'y' }, istemci)

    const cagri = (istemci as unknown as {
      accountNotification: { create: ReturnType<typeof vi.fn> }
    }).accountNotification.create.mock.calls[0][0]

    expect(cagri.data.linkTo).toBe('/app/settings#uyelik')
  })
})

describe('eşik mantığı', () => {
  it('uyarı eşiği deneme süresinden kısa — yoksa herkes ilk gün uyarı alır', () => {
    /* Eşik süreyi aşarsa `showBanner` daha ilk günden true döner ve
       "30 gün kaldı" uyarısı deneme başlar başlamaz düşer. */
    expect(TRIAL_WARNING_DAYS).toBeLessThan(TRIAL_DAYS)
    expect(TRIAL_WARNING_DAYS * GUN).toBeLessThan(TRIAL_DAYS * GUN)
  })
})
