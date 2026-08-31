import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { parse as querystringAyristir } from 'node:querystring'
import { prisma as sharedPrisma } from '../../lib/prisma'
import { createAuditLog } from '../audit'
import { bildirimYaz } from '../account-notifications'
import { randomUUID } from 'node:crypto'
import { BILLING_CURRENCY, BILLING_STARTS_AT, ilkUcretliTutar } from '../../config/billing'
import { LEGAL_DOCUMENTS } from '../../config/legal-documents'
import { callbackHashDogrula, paytrYapilandirmasi, siparisNumarasiUret } from './paytr'

/*
 * ÖDEME ROTALARI — PayTR callback'i
 *
 * 🔴 BU ROTA KİMLİKSİZ. PayTR sunucusu çağırıyor, oturum yok. Tek
 * güvenlik kapısı hash doğrulaması; o düşerse istek reddediliyor.
 */

/*
 * 🔴 `application/x-www-form-urlencoded` AYRIŞTIRICISI.
 *
 * PayTR callback'i gövdeyi bu biçimde POST ediyor ve depoda kayıtlı
 * hiçbir ayrıştırıcı yoktu. Olmadan Fastify 415 döner; PayTR "OK"
 * alamadığı sürece tekrar tekrar dener. Sonuç ölçülemeyecek kadar
 * kötü: para çekilir, abonelik hiç açılmaz ve günlükte yalnız
 * tekrarlayan 415'ler görünür.
 *
 * `@fastify/formbody` yerine `node:querystring` kullanılıyor: gövde
 * düz `key=value`, yeni bir bağımlılık ve tedarik zinciri yüzeyi
 * açmaya değmiyor.
 *
 * ⚠️ Ayrıştırıcı EKLENTİ KAPSAMINDA kayıtlı, kök sunucuda değil —
 * böylece `/payments` dışındaki hiçbir rota urlencoded gövde kabul
 * etmiyor ve saldırı yüzeyi genişlemiyor.
 */
function urlencodedAyristiriciKaydet(fastify: FastifyInstance): void {
  fastify.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_istek, govde, bitir) => {
      try {
        bitir(null, querystringAyristir(govde as string))
      } catch (hata) {
        bitir(hata as Error, undefined)
      }
    }
  )
}

/*
 * Satın alma anında onaylanan belgeler.
 *
 * 🔴 Bu dördü `requiredAtSignup: false` — KAYIT anında değil, SATIN
 * ALMA anında onaylanıyorlar. `requiredAtSignup: true` yapmak kayıt
 * formunun etiketini yalan hâline getirirdi (auth.ts her zorunlu
 * belgeye otomatik onay satırı yazıyor).
 */
const SATIN_ALMA_BELGELERI = [
  'mesafeli-satis',
  'on-bilgilendirme',
  'teslimat-iade',
  'abonelik',
] as const

/*
 * Ödeme ekranındaki iki AYRI onay kutusunun kaydı.
 *
 * Yasal belge değiller, o yüzden `LEGAL_DOCUMENTS`te yoklar — ama
 * ikisi de mevzuatın ayrı ve açık onay aradığı beyanlar, dolayısıyla
 * kanıtlarının saklanması gerekiyor. `UserConsent.documentType`
 * serbest `String` olduğu için göç gerekmiyor.
 */
const CAYMA_FERAGATI = 'cayma-feragati'
const OTOMATIK_TAHSILAT = 'otomatik-tahsilat-izni'

export async function paymentRoutes(
  fastify: FastifyInstance,
  opts?: { prisma?: PrismaClient; ucretlendirmeBaslangici?: string | null }
) {
  const prisma = opts?.prisma ?? sharedPrisma

  /*
   * Ücretlendirme anahtarı SON PARAMETRE, varsayılanı yapılandırma.
   *
   * 🔴 Sebebi ölçülmüş bir tuzak: `BILLING_STARTS_AT` bugün `null`
   * ve bu uçtaki ilk kapı o. Anahtar sabit kalsaydı ONAY KAPISI hiç
   * çalıştırılamaz, dolayısıyla hiç test edilemezdi — onayları
   * kaldırsak bile bütün testler yeşil kalırdı.
   *
   * Aynı desen `hesaplaUyelikDurumu` ve `uyelikKapisi`da da var.
   */
  const ucretlendirmeBaslangici = opts?.ucretlendirmeBaslangici !== undefined
    ? opts.ucretlendirmeBaslangici
    : BILLING_STARTS_AT

  urlencodedAyristiriciKaydet(fastify)

  /*
   * Kimlik doğrulaması callback DIŞINDA her rotada.
   *
   * `marketplace-routes.ts:232` ile aynı desen: kimliksiz olması
   * gereken tek uç açıkça listelenir, geri kalan varsayılan olarak
   * korunur. Ters kurgu (varsayılan açık, korunacaklar listelenir)
   * yeni bir rota eklendiğinde sessizce korumasız bırakırdı.
   */
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.routeOptions.url === '/payments/paytr/callback') return
    try { await (fastify as any).authenticate(request, reply) }
    catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })

  /*
   * SATIN ALMA BAŞLATMA.
   *
   * 🔴 ONAYLAR ÖDEMEDEN ÖNCE YAZILIYOR. Sonra yazmak iki şeyi birden
   * bozardı: ödeme başarısız olduğunda onay kaybolur, ve mevzuatın
   * aradığı sıra ("sözleşme kurulmadan ÖNCE bilgilendirme ve onay")
   * tersine döner.
   */
  fastify.post('/checkout', {
    config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const cfg = paytrYapilandirmasi()
    if (!cfg) return reply.status(503).send({ error: 'Ödeme altyapısı etkin değil.', code: 'PAYMENT_DISABLED' })

    /*
     * 🔴 ÜCRETLENDİRME KAPALIYKEN SATIN ALMA YOK.
     *
     * `BILLING_STARTS_AT` null iken hiçbir kullanıcı ödeme ekranı
     * görmüyor; buraya bir istek gelirse ya hata ya kötü niyet demek.
     * Ön yüzün gizlemesine güvenmek yeterli değil — kapı sunucuda.
     */
    if (!ucretlendirmeBaslangici) {
      return reply.status(409).send({ error: 'Ücretlendirme henüz başlamadı.', code: 'BILLING_NOT_STARTED' })
    }

    const govde = (request.body ?? {}) as Record<string, unknown>
    const donem = govde.period === 'yearly' ? 'YEARLY' : 'MONTHLY'

    /*
     * Üç onayın da açıkça verilmiş olması ŞART.
     *
     * Ödeme ekranındaki üç kutu ile birebir aynı: sözleşmeler, cayma
     * feragati, otomatik tahsilat izni. İkisini tek kutuya sıkıştırmak
     * istisnanın dayanağını ortadan kaldırdığı için ayrılar; burada da
     * ayrı ayrı aranıyorlar.
     */
    if (govde.sozlesmeOnayi !== true || govde.caymaFeragati !== true || govde.otomatikTahsilat !== true) {
      return reply.status(422).send({ error: 'Onaylar eksik.', code: 'CONSENTS_REQUIRED' })
    }

    const userId = (request as any).user?.id as number
    const kullanici = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })
    if (!kullanici) return reply.status(404).send({ error: 'Kullanıcı bulunamadı.' })

    /* Onaylar — sürümler `LEGAL_DOCUMENTS`ten okunuyor; elle yazmak
       metin sürümü artınca sessizce eski sürümü kaydetmek olurdu. */
    const bugununSurumu = (tip: string) =>
      LEGAL_DOCUMENTS.find(d => d.type === tip)?.version ?? 'bilinmiyor'

    const onaylar = [
      ...SATIN_ALMA_BELGELERI.map(tip => ({ documentType: tip, version: bugununSurumu(tip) })),
      { documentType: CAYMA_FERAGATI, version: bugununSurumu('mesafeli-satis') },
      { documentType: OTOMATIK_TAHSILAT, version: bugununSurumu('abonelik') },
    ]

    await prisma.userConsent.createMany({
      data: onaylar.map(o => ({ userId, ...o })),
      /* Aynı sürümü ikinci kez onaylamak hata değil: kullanıcı ödemeyi
         yarıda bırakıp tekrar deneyebilir. `@@unique` çakışması sessizce
         atlanıyor, onay zaten kayıtlı. */
      skipDuplicates: true,
    })

    const abonelik = await prisma.subscription.upsert({
      where: { userId },
      create: { userId, period: donem, status: 'TRIALING' },
      update: { period: donem },
      select: { id: true },
    })

    const tutar = ilkUcretliTutar()
    const merchantOid = siparisNumarasiUret(() => randomUUID())

    await prisma.payment.create({
      data: { subscriptionId: abonelik.id, merchantOid, amount: tutar, currency: BILLING_CURRENCY },
    })

    /*
     * ⚠️ PayTR token isteği HENÜZ ATILMIYOR.
     *
     * Gerçek merchant bilgileriyle uçtan uca denenmeden dış çağrı
     * yazmak, doğrulanmamış kod demek. Bu uç şu an sipariş kaydını ve
     * onayları üretiyor; iFrame token çağrısı, PayTR panelinden
     * anahtarlar alınıp test kipinde ilk istek atıldığında eklenecek.
     */
    return reply.status(201).send({
      merchantOid,
      amount: tutar,
      currency: BILLING_CURRENCY,
      period: donem,
      /* İstemci bunu görünce "ödeme altyapısı hazırlanıyor" gösterecek;
         token gelmeden iframe açılmamalı. */
      iframeToken: null,
    })
  })

  fastify.post('/paytr/callback', {
    /*
     * HIZ SINIRI BİLEREK GEVŞEK.
     *
     * PayTR "OK" alana kadar callback'i yeniden gönderiyor. Sıkı bir
     * sınır o denemeleri 429'a düşürür ve ödeme sonsuza kadar
     * onaylanmaz. `gelen-eposta.ts:243` ile aynı gerekçe ve aynı değer.
     */
    config: { rateLimit: { max: 120, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const cfg = paytrYapilandirmasi()
    /* Yapılandırma yoksa ödeme kapalı; sessizce OK dönmek yerine
       açıkça reddediliyor — PayTR'nin bu ortama istek atmaması gerekir. */
    if (!cfg) return reply.status(503).type('text/plain').send('PAYMENT_DISABLED')

    const govde = (request.body ?? {}) as Record<string, string>

    if (!callbackHashDogrula(cfg, govde)) {
      request.log.warn(
        { merchantOid: String(govde.merchant_oid || '').slice(0, 16) },
        'paytr callback hash dogrulanamadi'
      )
      return reply.status(401).type('text/plain').send('BAD_HASH')
    }

    const merchantOid = String(govde.merchant_oid)
    const basarili = govde.status === 'success'

    const odeme = await prisma.payment.findUnique({
      where: { merchantOid },
      select: {
        id: true, status: true, subscriptionId: true,
        subscription: { select: { userId: true } },
      },
    })

    /*
     * Bilinmeyen sipariş numarasına da `OK` dönülüyor.
     *
     * Hata dönmek PayTR'yi sonsuz yeniden denemeye sokar ve düzelecek
     * bir şey yoktur — kayıt bizde gerçekten yok. Günlüğe yazılıyor,
     * çünkü bu normalde olmamalı.
     */
    if (!odeme) {
      request.log.error({ merchantOid }, 'paytr callback: bilinmeyen siparis')
      return reply.type('text/plain').send('OK')
    }

    /*
     * 🔴 IDEMPOTENCY.
     *
     * PayTR aynı callback'i defalarca gönderiyor. Nihai duruma gelmiş
     * bir ödemeyi yeniden işlemek, ikinci bir bildirim ve ikinci bir
     * denetim kaydı üretir; kötü durumda aboneliğin süresini bir kez
     * daha uzatırdı.
     */
    if (odeme.status !== 'PENDING') {
      request.log.info({ merchantOid, durum: odeme.status }, 'paytr callback tekrari yok sayildi')
      return reply.type('text/plain').send('OK')
    }

    const userId = odeme.subscription.userId

    await prisma.payment.update({
      where: { id: odeme.id },
      data: {
        status: basarili ? 'SUCCEEDED' : 'FAILED',
        paidAt: basarili ? new Date() : null,
        failReason: basarili ? null : String(govde.failed_reason_msg || govde.failed_reason_code || '').slice(0, 500),
      },
    })

    if (basarili) {
      await prisma.subscription.update({
        where: { id: odeme.subscriptionId },
        data: { status: 'ACTIVE' },
      })
    }

    /*
     * Denetim kaydı — actor `merchantOid` üzerinden çözüldü.
     *
     * `AuditLog.actorId` zorunlu ve nullable değil; callback'in oturum
     * sahibi yok. `merchantOid`i BİZ ürettiğimiz için kullanıcıya
     * zincirle ulaşılıyor ve göç gerekmiyor.
     *
     * ⚠️ `metadata` bir İZİN LİSTESİNDEN geçiyor (`audit.ts`);
     * listede olmayan alan sessizce siliniyor. Buradaki dört anahtar
     * oraya eklendi.
     */
    await createAuditLog({
      action: basarili ? 'payment.succeeded' : 'payment.failed',
      entityType: 'payment',
      entityId: odeme.id,
      actorId: userId,
      metadata: {
        provider: 'paytr',
        merchantOid,
        amount: String(govde.total_amount || ''),
        currency: 'TRY',
        paymentStatus: basarili ? 'success' : 'failed',
      },
    }, prisma)

    await bildirimYaz({
      userId,
      type: basarili ? 'payment_succeeded' : 'payment_failed',
      title: basarili ? 'Ödemeniz alındı' : 'Ödeme alınamadı',
      body: basarili
        ? 'Üyeliğiniz etkinleştirildi. Makbuzunuz e-posta ile gönderildi.'
        : 'Kartınızdan tahsilat yapılamadı. Ayarlar → Üyelik bölümünden tekrar deneyebilirsiniz.',
      /* Aynı sipariş için ikinci bildirim yazılmasını veritabanı
         seviyesinde de engelliyor — idempotency kontrolünün yedeği. */
      dedupeKey: `payment:${merchantOid}`,
    }, prisma)

    /*
     * 🔴 DÜZ METİN `OK`.
     *
     * PayTR gövdenin tam olarak `OK` olmasını bekliyor. JSON dönmek —
     * Fastify'ın varsayılanı — başarısızlık sayılır ve callback
     * sonsuza kadar tekrarlanır.
     */
    return reply.type('text/plain').send('OK')
  })
}
