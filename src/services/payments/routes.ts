import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { parse as querystringAyristir } from 'node:querystring'
import { prisma as sharedPrisma } from '../../lib/prisma'
import { createAuditLog } from '../audit'
import { bildirimYaz } from '../account-notifications'
import { randomUUID } from 'node:crypto'
import { BILLING_CURRENCY, BILLING_STARTS_AT, ilkUcretliTutar } from '../../config/billing'
import { LEGAL_DOCUMENTS } from '../../config/legal-documents'
import { callbackHashDogrula, iframeTokenAl, odemeCercevesiAdresi, paytrYapilandirmasi, siparisNumarasiUret } from './paytr'
import { faturaKimligiDogrula, paytrAdresi } from './fatura-kimlik'

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
/*
 * ⚠️ `OTOMATIK_TAHSILAT` KALDIRILDI (01.09.2026).
 *
 * PayTR'nin cevabı: kayıtlı karttan tahsilat yalnız Direkt API +
 * Non3D ile mümkün ve o yol kart verisini bizim sunucumuzdan geçirir.
 * Ürün sahibi otomatik yenilemeden vazgeçti; kart saklanmıyor.
 *
 * Yapılmayacak bir işlem için izin toplamak KVKK veri
 * minimizasyonuna aykırı olurdu — onay sayısı ALTIDAN BEŞE indi.
 */

export async function paymentRoutes(
  fastify: FastifyInstance,
  opts?: { prisma?: PrismaClient; ucretlendirmeBaslangici?: string | null; fetchIslevi?: typeof fetch }
) {
  const prisma = opts?.prisma ?? sharedPrisma
  /* Ağ çağrısı enjekte edilebilir: testler gerçek PayTR'ye çıkmamalı. */
  const fetchIslevi = opts?.fetchIslevi ?? fetch

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
   * FATURA KİMLİK BİLGİSİ — okuma ve yazma.
   *
   * 🔴 Bu uç OLMADAN ödeme çalışıyordu ama fatura kesilemiyordu:
   * PayTR token'ına `user_address` ve `user_phone` olarak
   * "Belirtilmedi" gidiyordu.
   *
   * Kullanıcı BAŞINA saklanıyor (abonelik başına değil): abonelik
   * iptal edilip yeniden başlatıldığında bilgi tekrar sorulmasın.
   */
  fastify.get('/fatura-kimligi', async (request, reply) => {
    const userId = (request as any).user?.id as number
    const kayit = await prisma.billingProfile.findUnique({ where: { userId } })

    /* Kayıt yoksa 404 DEĞİL: "henüz doldurmadın" bir hata değil,
       formun ilk hâli. 404 dönmek arayüzü hata gösterip formu
       gizlemeye iterdi. */
    if (!kayit) return reply.send({ faturaKimligi: null })

    return reply.send({
      faturaKimligi: {
        tip: kayit.type,
        unvan: kayit.title,
        tckn: kayit.tckn,
        vkn: kayit.vkn,
        vergiDairesi: kayit.taxOffice,
        telefon: kayit.phone,
        adres: kayit.address,
        il: kayit.city,
        ilce: kayit.district,
      },
    })
  })

  fastify.put('/fatura-kimligi', {
    config: { rateLimit: { max: 30, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const userId = (request as any).user?.id as number
    const sonuc = faturaKimligiDogrula((request.body ?? {}) as Record<string, unknown>)

    if (!sonuc.ok) {
      /*
       * ⚠️ Hatalar ALAN ALAN dönüyor. Tek bir "form hatalı" mesajı,
       * kullanıcıya hangi kutuyu düzelteceğini söylemez.
       *
       * 🔴 Gövde yanıtta YANKILANMIYOR: gönderilen TCKN/VKN'yi geri
       * yazmak, o değerin proxy günlüklerine ve hata izlemesine
       * düşmesi demek olurdu.
       */
      return reply.status(422).send({
        error: 'Fatura bilgileri eksik veya hatalı.',
        code: 'BILLING_PROFILE_INVALID',
        hatalar: sonuc.hatalar,
      })
    }

    const d = sonuc.deger!
    const alanlar = {
      type: d.tip,
      title: d.unvan,
      tckn: d.tckn,
      vkn: d.vkn,
      taxOffice: d.vergiDairesi,
      phone: d.telefon,
      address: d.adres,
      city: d.il,
      district: d.ilce,
    }

    await prisma.billingProfile.upsert({
      where: { userId },
      create: { userId, ...alanlar },
      update: alanlar,
    })

    /* 🔴 Denetim kaydına DEĞERLER yazılmıyor, yalnız olayın kendisi.
       Kimlik numarasını denetim kaydına düşürmek, onu okuma yetkisi
       olan herkese açmak olurdu. */
    await createAuditLog({
      action: 'billing_profile.updated',
      entityType: 'billing_profile',
      entityId: userId,
      actorId: userId,
      metadata: { provider: 'paytr' },
    }, prisma)

    return reply.send({ ok: true })
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
    /*
     * 🔴 4xx KULLANILIYOR, 5xx DEĞİL — Cloudflare sebebiyle.
     *
     * Cloudflare origin'den gelen 502/503'ü KENDİ hata sayfasıyla
     * değiştiriyor. 31.08.2026'da bunu bizzat yaşadık: PayTR imzayı
     * reddediyordu, sunucu doğru cevabı üretiyordu, ama tarayıcıya
     * Cloudflare'ın "Bad gateway" HTML'i ulaşıyordu. Gerçek sebep
     * yalnız sunucu günlüğünden görülebildi.
     *
     * 424 (Failed Dependency) semantik olarak da doğru: istek
     * geçerli, bağımlı olduğumuz servis kullanılamıyor.
     */
    if (!cfg) return reply.status(424).send({ error: 'Ödeme altyapısı etkin değil.', code: 'PAYMENT_DISABLED' })

    /*
     * 🔴 ÜCRETLENDİRME KAPALIYKEN SATIN ALMA YOK — TEK İSTİSNAYLA.
     *
     * `BILLING_STARTS_AT` null iken hiçbir kullanıcı ödeme ekranı
     * görmüyor; buraya bir istek gelirse ya hata ya kötü niyet demek.
     * Ön yüzün gizlemesine güvenmek yeterli değil — kapı sunucuda.
     *
     * İSTİSNA: PayTR test kipi AÇIK ve kullanıcı ADMIN ise geçiliyor.
     * Gerekçe: ödeme akışının uçtan uca denenmesi gerekiyor, ama bunun
     * için `BILLING_STARTS_AT`i açmak, doğrulanmamış bir ödeme ekranını
     * BÜTÜN kullanıcılara göstermek olurdu.
     *
     * ⚠️ İki şart BİRLİKTE aranıyor. Yalnız test kipine bakmak üretimde
     * herkese kapı açardı; yalnız admin'e bakmak, canlı kipte gerçek
     * para çekilmesine yol açardı.
     */
    const testKipiDenemesi = cfg.testMode && (request as any).user?.role === 'admin'
    if (!ucretlendirmeBaslangici && !testKipiDenemesi) {
      return reply.status(409).send({ error: 'Ücretlendirme henüz başlamadı.', code: 'BILLING_NOT_STARTED' })
    }

    const govde = (request.body ?? {}) as Record<string, unknown>
    const donem = govde.period === 'yearly' ? 'YEARLY' : 'MONTHLY'

    /*
     * Üç onayın da açıkça verilmiş olması ŞART.
     *
     * Ödeme ekranındaki iki kutu ile birebir aynı: sözleşmeler ve
     * cayma feragati. İkisini tek kutuya sıkıştırmak istisnanın
     * dayanağını ortadan kaldırdığı için ayrılar; burada da ayrı ayrı
     * aranıyorlar.
     */
    if (govde.sozlesmeOnayi !== true || govde.caymaFeragati !== true) {
      return reply.status(422).send({ error: 'Onaylar eksik.', code: 'CONSENTS_REQUIRED' })
    }

    const userId = (request as any).user?.id as number
    const kullanici = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })
    if (!kullanici) return reply.status(404).send({ error: 'Kullanıcı bulunamadı.' })

    /*
     * 🔴 FATURA BİLGİSİ OLMADAN ÖDEME BAŞLAMAZ.
     *
     * Ön yüz formu ödemeden önceki adım olarak gösteriyor, ama kapı
     * BURADA: `/checkout` doğrudan da çağrılabilir ve o zaman yine
     * fatura kesilemeyen bir tahsilat yapılırdı. Ön yüzün sırasına
     * güvenmek, kapıyı olmayan bir yere koymak olurdu.
     */
    const faturaKimligi = await prisma.billingProfile.findUnique({ where: { userId } })
    if (!faturaKimligi) {
      return reply.status(422).send({
        error: 'Fatura bilgileri eksik.',
        code: 'BILLING_PROFILE_REQUIRED',
      })
    }

    /* Onaylar — sürümler `LEGAL_DOCUMENTS`ten okunuyor; elle yazmak
       metin sürümü artınca sessizce eski sürümü kaydetmek olurdu. */
    const bugununSurumu = (tip: string) =>
      LEGAL_DOCUMENTS.find(d => d.type === tip)?.version ?? 'bilinmiyor'

    const onaylar = [
      ...SATIN_ALMA_BELGELERI.map(tip => ({ documentType: tip, version: bugununSurumu(tip) })),
      { documentType: CAYMA_FERAGATI, version: bugununSurumu('mesafeli-satis') },
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

    const taban = process.env.APP_PUBLIC_URL || 'https://localkarar.com'
    const sonuc = await iframeTokenAl(cfg, {
      merchantOid,
      email: kullanici.email,
      tutar,
      /* Gerçek istemci IP'si: `trustProxy` açık olduğu için Fastify
         bunu X-Forwarded-For'dan doğru çözüyor. PayTR hash'i bu değeri
         içeriyor, yani yanlışsa token isteği reddedilir. */
      kullaniciIp: request.ip,
      urunAdi: 'LocalKarar Uyelik',
      basariliUrl: `${taban}/app/odeme/basarili?siparis=${merchantOid}`,
      basarisizUrl: `${taban}/app/odeme/basarisiz?siparis=${merchantOid}`,
      /* Fatura kimliğinden geliyor — hesap adından DEĞİL. Fatura
         kime kesilecekse PayTR'ye giden ad da o olmalı; kurumsalda
         bu, kişinin adı değil ticari unvan. */
      kullaniciAdi: faturaKimligi.title,
      kullaniciAdres: paytrAdresi({
        tip: faturaKimligi.type,
        unvan: faturaKimligi.title,
        tckn: faturaKimligi.tckn,
        vkn: faturaKimligi.vkn,
        vergiDairesi: faturaKimligi.taxOffice,
        telefon: faturaKimligi.phone,
        adres: faturaKimligi.address,
        il: faturaKimligi.city,
        ilce: faturaKimligi.district,
      }),
      kullaniciTelefon: faturaKimligi.phone,
    }, fetchIslevi)

    if (!sonuc.ok) {
      /* 🔴 SEBEP GÜNLÜĞE YAZILIYOR. PayTR'nin `reason` alanı sorunun
         ne olduğunu söyleyen tek yer; yazmamak bu oturumda iki kez
         saatlerce süren teşhise yol açtı. */
      request.log.error({ merchantOid, sebep: sonuc.sebep }, 'paytr token alinamadi')
      /* 502 DEĞİL: Cloudflare onu kendi sayfasıyla değiştirir ve
         kullanıcı "Bad gateway" görür. Bkz. yukarıdaki not. */
      return reply.status(424).send({
        error: 'Ödeme başlatılamadı. Lütfen tekrar deneyin.',
        code: 'PAYMENT_INIT_FAILED',
      })
    }

    return reply.status(201).send({
      merchantOid,
      amount: tutar,
      currency: BILLING_CURRENCY,
      period: donem,
      iframeToken: sonuc.token,
      iframeUrl: odemeCercevesiAdresi(sonuc.token),
    })
  })

  /*
   * SİPARİŞ DURUMU — dönüş sayfasının okuduğu tek kaynak.
   *
   * 🔴 BU UÇ HİÇBİR ŞEY DEĞİŞTİRMEZ, yalnız okur. Aktivasyon
   * yalnızca callback'te olur. Dönüş sayfası kullanıcının
   * tarayıcısından geliyor ve adres çubuğuna elle yazılabilir; ona
   * karar verdirmek, ödemeden abonelik açtırmak demek olurdu.
   *
   * ⚠️ Sahiplik kontrolü şart: sipariş numarası tahmin edilebilir
   * olmasa da, başkasının ödemesinin durumu okunamamalı.
   */
  fastify.get('/:merchantOid/status', async (request, reply) => {
    const { merchantOid } = request.params as { merchantOid: string }
    const userId = (request as any).user?.id as number

    const odeme = await prisma.payment.findUnique({
      where: { merchantOid },
      select: {
        status: true, amount: true, currency: true, paidAt: true,
        subscription: { select: { userId: true, status: true } },
      },
    })

    /* Başkasının siparişi de yokmuş gibi 404: varlığını doğrulamak
       sipariş numarası denemeyi anlamlı kılardı. */
    if (!odeme || odeme.subscription.userId !== userId) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı.' })
    }

    return {
      status: odeme.status,
      amount: Number(odeme.amount),
      currency: odeme.currency,
      paidAt: odeme.paidAt,
      subscriptionStatus: odeme.subscription.status,
    }
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
    /* Burada da 4xx: Cloudflare 503'ü değiştirirse PayTR bizim
       gövdemizi değil onun HTML'ini görür ve sebebi anlayamaz. */
    if (!cfg) return reply.status(424).type('text/plain').send('PAYMENT_DISABLED')

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
