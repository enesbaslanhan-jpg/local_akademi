import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import {
  BILLING_STARTS_AT,
  TRIAL_WARNING_DAYS,
  hesaplaUyelikDurumu,
} from '../config/billing.js'
import { sendMail } from './mailer.js'
import { denemeBitiyorMaili } from './mail-templates.js'

/*
 * HESAP BİLDİRİMLERİ — üyelik, ödeme, güvenlik.
 *
 * 🔴 NEDEN ÜÇÜNCÜ BİR BİLDİRİM TABLOSU (ölçüldü, tercih değil):
 *
 *   * `BusinessNotification.workspaceId` ZORUNLU. İşletmesi olmayan
 *     kullanıcı üyelik uyarısını hiç alamazdı; iki işletmesi olan
 *     aynı uyarıyı iki kez alırdı. Üyelik kullanıcı bazlı.
 *   * `CommunityNotification` kullanıcı bazlı ama türleri sosyal ve
 *     `dedupeKey`i YOK. Üretici belirli aralıklarla çalıştığı için
 *     aynı "5 gün kaldı" uyarısı her turda yeniden düşerdi.
 *
 * Zamanlama deseni `business-reminder-worker.ts`ten alındı: dayanıklı
 * satır + `dedupeKey` + aralıklı yoklayıcı. İkinci bir zamanlama
 * mantığı yazılmadı.
 */

export type AccountNotificationType =
  | 'trial_ending'
  | 'trial_ended'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'renewal_upcoming'
  | 'membership_cancelled'

interface BildirimGirdisi {
  userId: number
  type: AccountNotificationType
  title: string
  body: string
  linkTo?: string
  dedupeKey?: string
}

/**
 * Tek bildirim yazar. Aynı `dedupeKey` ikinci kez gelirse SESSİZCE
 * atlanır.
 *
 * ⚠️ Tekrar koruması veritabanı seviyesinde (`@unique`), uygulama
 * seviyesinde değil. "Önce oku, yoksa yaz" iki örnek aynı anda
 * çalıştığında yarışır ve çift kayıt üretir; benzersiz indeks
 * yarışmaz.
 */
export async function bildirimYaz(
  girdi: BildirimGirdisi,
  prisma: PrismaClient = sharedPrisma,
): Promise<boolean> {
  try {
    await prisma.accountNotification.create({
      data: {
        userId: girdi.userId,
        type: girdi.type,
        title: girdi.title,
        body: girdi.body,
        linkTo: girdi.linkTo ?? '/app/settings#uyelik',
        dedupeKey: girdi.dedupeKey ?? null,
      },
    })
    return true
  } catch (error) {
    /* P2002 = benzersiz kısıt ihlali: bu olay zaten yazılmış. Hata
       değil, beklenen durum. Başka bir hata ise yukarı çıkmalı. */
    if ((error as { code?: string })?.code === 'P2002') return false
    throw error
  }
}

/**
 * Deneme süresi biten/bitmek üzere olan kullanıcılara uyarı üretir.
 *
 * 🔴 `BILLING_STARTS_AT === null` iken HİÇBİR ŞEY ÜRETMEZ ve bu ilk
 * satırda kesiliyor. Bugün sevk edilen davranış bu: ödenecek bir şey
 * yokken "süren doluyor" demek yanlış vaat olurdu.
 */
export async function uyelikBildirimleriniUret(
  prisma: PrismaClient = sharedPrisma,
  simdi: Date = new Date(),
): Promise<{ incelenen: number; uretilen: number }> {
  if (!BILLING_STARTS_AT) return { incelenen: 0, uretilen: 0 }

  /* Yalnız aktif hesaplar. Silinmiş/askıya alınmış kullanıcıya üyelik
     uyarısı göndermek anlamsız ve rahatsız edici olurdu. */
  const kullanicilar = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true, name: true, createdAt: true },
  })

  let uretilen = 0

  for (const kullanici of kullanicilar) {
    const durum = hesaplaUyelikDurumu(kullanici.createdAt, simdi)

    if (durum.state === 'trial' && durum.showBanner && durum.trialDaysLeft !== null) {
      /* Eşiğe girdiği ANDA bir kez, son gün bir kez daha. İkisinin
         arasında her gün uyarmak, uyarıyı gürültüye çevirirdi. */
      const esikler = [TRIAL_WARNING_DAYS, 1]
      if (!esikler.includes(durum.trialDaysLeft)) continue

      const yazildi = await bildirimYaz({
        userId: kullanici.id,
        type: 'trial_ending',
        title: 'Ücretsiz kullanım süren doluyor',
        body: `Ücretsiz kullanım sürenin bitmesine ${durum.trialDaysLeft} gün kaldı. Üyeliğini başlatmazsan hesabın salt okunur moda geçer; verilerin silinmez.`,
        /* Anahtar hem kullanıcıyı hem eşiği taşıyor: 7. gün uyarısı ile
           1. gün uyarısı AYRI olaylar, ikisi de düşmeli. */
        dedupeKey: `trial_ending:${kullanici.id}:${durum.trialDaysLeft}`,
      }, prisma)

      if (yazildi) {
        uretilen += 1
        /*
         * E-posta bildirimi ZİLDEN SONRA ve hatası yutuluyor.
         * Posta gönderilemedi diye uygulama içi bildirimi geri almak,
         * kullanıcıyı iki kanaldan birden habersiz bırakırdı — zil
         * yazılmışsa en azından bir yerde görüyor.
         */
        try {
          await sendMail(denemeBitiyorMaili(kullanici.email, kullanici.name, durum.trialDaysLeft))
        } catch {
          /* Yutuluyor: yukarıdaki gerekçe. */
        }
      }
      continue
    }

    if (durum.state === 'expired') {
      const yazildi = await bildirimYaz({
        userId: kullanici.id,
        type: 'trial_ended',
        title: 'Ücretsiz kullanım süren doldu',
        body: 'Hesabın salt okunur modda. Verilerin duruyor ve dışa aktarılabilir; üyeliğini başlattığında kaldığın yerden devam edersin.',
        /* Tarihsiz anahtar: "süre doldu" bir kez söylenir. */
        dedupeKey: `trial_ended:${kullanici.id}`,
      }, prisma)
      if (yazildi) uretilen += 1
    }
  }

  return { incelenen: kullanicilar.length, uretilen }
}

/**
 * Üyelik bildirim üreticisini başlatır.
 *
 * Aralık saatlik: eşikler GÜN cinsinden, dakikalık yoklamak boşuna
 * sorgu olurdu. `unref()` ile süreç kapanmasını engellemiyor —
 * `business-reminder-worker` ile aynı desen.
 */
export function startAccountNotificationWorker(
  prisma: PrismaClient = sharedPrisma,
  options: { intervalMs?: number; onError?: (error: unknown) => void } = {},
) {
  const calistir = () => {
    void uyelikBildirimleriniUret(prisma).catch(error => options.onError?.(error))
  }
  calistir()
  const timer = setInterval(calistir, options.intervalMs ?? 60 * 60_000)
  timer.unref()
  return () => clearInterval(timer)
}

/* ------------------------------------------------------------------ *
 * UÇLAR
 * ------------------------------------------------------------------ */

export async function accountNotificationRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async request => {
    const userId = request.user.id
    const [items, unread] = await Promise.all([
      sharedPrisma.accountNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      sharedPrisma.accountNotification.count({ where: { userId, readAt: null } }),
    ])

    return {
      unread,
      items: items.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        linkTo: n.linkTo,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
    }
  })

  fastify.post('/read', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async request => {
    /* `updateMany` + `userId` şartı: tek bir bildirimin kimliğini alıp
       sahipliğini kontrol etmeyi unutmak yerine, sorgu zaten yalnız
       kendi satırlarına dokunuyor. Aynı desen `community-social.ts`te
       de kullanılıyor. */
    const sonuc = await sharedPrisma.accountNotification.updateMany({
      where: { userId: request.user.id, readAt: null },
      data: { readAt: new Date() },
    })
    return { okundu: sonuc.count }
  })
}
