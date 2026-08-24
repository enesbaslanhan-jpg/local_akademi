import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { timingSafeEqual, randomBytes } from 'crypto'
import { z } from 'zod'
import { dosyayiDogrula, FileValidationError } from './documentSecurity.js'
import { belgeyiKaydet } from './documents.js'
import { buildDocumentSuggestion, oneriKaydet } from './document-suggestions.js'

/*
 * GELEN E-POSTA KANALI.
 *
 * Kullanıcı muhasebe programından e-Fatura XML'ini doğrudan bir adrese
 * gönderiyor; belge elle yüklenmiş gibi işleniyor.
 *
 * ZİNCİR: gönderen -> Cloudflare Email Routing -> Email Worker ->
 * BU UÇ -> mevcut belge hattı -> onay bekleyen öneri.
 *
 * NEDEN CLOUDFLARE: alan adının MX kayıtları zaten Cloudflare Email
 * Routing'e bakıyor (`kvkk@` böyle çalışıyor). Yeni bir sağlayıcı
 * eklemek KVKK aktarım tablosuna yeni bir satır yazmak demekti;
 * Cloudflare tabloda zaten var.
 *
 * 🔴 BU UÇ İNTERNETE AÇIK VE JWT TAŞIMIYOR. Postayı gönderen kişi
 * bizim kullanıcımız değil; kimlik doğrulaması Worker ile bu uç
 * arasındaki PAYLAŞILAN GİZLİ ANAHTAR üzerinden yapılıyor.
 *
 * ÜÇ KATMANLI SAVUNMA -- hiçbiri tek başına yeterli değil:
 *
 *   1. Paylaşılan anahtar: isteği yalnız bizim Worker gönderebilir.
 *      Anahtar yoksa uç HİÇ KAYDEDİLMİYOR (aşağıda).
 *   2. Tahmin edilemez adres: hangi çalışma alanına gideceğini bilmek
 *      için adresi bilmek gerekiyor.
 *   3. Gönderen doğrulaması: gönderen, o çalışma alanının DOĞRULANMIŞ
 *      e-postalı bir üyesi olmalı VE postanın DKIM/SPF sonucu
 *      geçmeli.
 *
 * 3. madde neden şart: `From` başlığı uydurulabilir. Yalnız adrese
 * baksaydık, adresi bir kez sızmış bir kutuya herkes belge
 * gönderebilirdi. DKIM/SPF, gönderenin gerçekten o alan adından
 * yazdığını kanıtlıyor.
 */

/** Worker'ın gönderdiği yük. */
const gelenPostaSemasi = z.object({
  /** Kutunun yerel parçası: `fatura-a1b2c3...` */
  inboxKey: z.string().trim().min(8).max(64),
  from: z.string().trim().email().max(320),
  subject: z.string().max(500).optional(),
  /* Worker'ın okuduğu kimlik doğrulama sonuçları. */
  dkim: z.enum(['pass', 'fail', 'none']),
  spf: z.enum(['pass', 'fail', 'none']),
  ekler: z.array(z.object({
    filename: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().max(200),
    /** base64 */
    content: z.string().max(15 * 1024 * 1024)
  })).max(10)
})

export type GelenPosta = z.infer<typeof gelenPostaSemasi>

/**
 * Gelen kutusu adresi üretir.
 *
 * 16 bayt = 32 onaltılık karakter. Tahmin edilebilirliği bir güvenlik
 * katmanı olarak SAYMIYORUZ (gönderen doğrulaması asıl kapı), ama
 * adresin kolayca denenememesi gereksiz gürültüyü kesiyor.
 */
export function gelenKutusuAnahtariUret(): string {
  return `fatura-${randomBytes(16).toString('hex')}`
}

/**
 * Paylaşılan anahtarı SABİT ZAMANDA karşılaştırır.
 *
 * Basit `===` karşılaştırması, karakterleri sırayla kontrol edip ilk
 * farkta durur; saldırgan yanıt süresini ölçerek anahtarı harf harf
 * bulabilir. `timingSafeEqual` her durumda aynı sürede döner.
 */
export function anahtarDogru(gelen: string | undefined, beklenen: string): boolean {
  if (!gelen) return false
  const a = Buffer.from(gelen, 'utf8')
  const b = Buffer.from(beklenen, 'utf8')
  /* Uzunluk eşit değilse `timingSafeEqual` FIRLATIR; önce o kontrol.
     Uzunluk farkı zaten anahtarın yanlış olduğunu gösteriyor. */
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export type PostaSonucu =
  | { durum: 'kabul'; belgeSayisi: number }
  | { durum: 'atildi'; sebep: string }

/**
 * Gelen postayı değerlendirir ve ne yapılacağına karar verir.
 *
 * 🔴 REDDEDİLEN POSTA SESSİZCE ATILIYOR, hata dönülmüyor.
 *
 * Sebep: bu uca yanıt veren taraf posta sunucusu. Ayrıntılı bir hata
 * ("böyle bir kutu yok" / "sen üye değilsin") gönderene BİLGİ SIZDIRIR
 * -- adresin var olup olmadığını, kimlerin üye olduğunu deneyerek
 * öğrenebilir. Karar günlüğe yazılıyor, gönderene değil.
 */
export async function postayiDegerlendir(
  prisma: PrismaClient,
  posta: GelenPosta
): Promise<{ workspaceId: string; userId: number } | { red: string }> {
  /*
   * DKIM/SPF ÖNCE. Gönderen adresine bakmadan önce o adresin gerçekten
   * o kişiye ait olduğunu bilmemiz gerekiyor; sıra tersine dönerse
   * uydurma bir `From` ile üye araması yapmış oluruz.
   *
   * `none` de reddediliyor: kimlik doğrulaması OLMAYAN posta,
   * doğrulaması BAŞARISIZ olan postadan daha güvenli değil.
   */
  if (posta.dkim !== 'pass' && posta.spf !== 'pass') {
    return { red: 'dkim_spf_gecmedi' }
  }

  const workspace = await prisma.businessWorkspace.findUnique({
    where: { inboxKey: posta.inboxKey },
    select: { id: true, status: true }
  })
  if (!workspace) return { red: 'kutu_yok' }
  if (workspace.status !== 'active') return { red: 'calisma_alani_pasif' }

  /*
   * Gönderen, bu çalışma alanının AKTİF ve e-postası DOĞRULANMIŞ bir
   * üyesi olmalı.
   *
   * `emailVerified` şartı önemli: doğrulanmamış bir hesap, sahibi
   * olmadığı bir e-posta adresiyle açılmış olabilir. O adresten gelen
   * postayı kabul etmek, doğrulama adımını anlamsız kılardı.
   */
  const uye = await prisma.businessMember.findFirst({
    where: {
      workspaceId: workspace.id,
      status: 'active',
      user: {
        email: { equals: posta.from, mode: 'insensitive' },
        emailVerifiedAt: { not: null },
        deletedAt: null
      }
    },
    select: { userId: true }
  })
  if (!uye) return { red: 'gonderen_uye_degil' }

  return { workspaceId: workspace.id, userId: uye.userId }
}

export async function gelenEpostaRotalari(
  fastify: FastifyInstance,
  opts?: { prisma?: PrismaClient }
) {
  const prisma = opts?.prisma ?? sharedPrisma
  const anahtar = process.env.INBOUND_MAIL_SECRET

  /*
   * 🔴 ANAHTAR YOKSA UÇ HİÇ KAYDEDİLMİYOR.
   *
   * Boş bir anahtarla açık bırakmak, internete kimliksiz bir belge
   * yükleme kapısı açmak olurdu. "Yapılandırılmamış" durumu, kapının
   * VAR OLMAMASI demek -- 401 dönen ama var olan bir kapı değil.
   */
  if (!anahtar || anahtar.trim().length < 32) {
    fastify.log.warn(
      'INBOUND_MAIL_SECRET tanımlı değil ya da 32 karakterden kısa; gelen e-posta kanalı KAPALI.'
    )
    return
  }

  fastify.post('/email', {
    config: { rateLimit: { max: 120, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    if (!anahtarDogru(request.headers['x-inbound-secret'] as string | undefined, anahtar)) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const ayristirilan = gelenPostaSemasi.safeParse(request.body)
    if (!ayristirilan.success) {
      return reply.status(422).send({ error: 'Geçersiz yük' })
    }
    const posta = ayristirilan.data

    const karar = await postayiDegerlendir(prisma, posta)
    if ('red' in karar) {
      /*
       * Günlüğe YAZILIYOR, gönderene DÖNÜLMÜYOR. Worker her durumda
       * "kabul edildi" görüyor; posta sunucusuna hata dönmek, gönderene
       * geri sekme (bounce) üretip kutunun varlığını açık ederdi.
       */
      request.log.info(
        { sebep: karar.red, inboxKey: posta.inboxKey.slice(0, 12) },
        'gelen posta atıldı'
      )
      return reply.status(202).send({ durum: 'atildi' })
    }

    /*
     * EKLER TEK TEK, BAĞIMSIZ.
     *
     * Bir ek reddedilirse (sahte uzantı, DTD taşıyan XML) diğerleri
     * yine işleniyor. Tek postada üç fatura varsa, birinin bozuk olması
     * diğer ikisini kaybettirmemeli.
     *
     * Ekler mevcut kapıdan geçiyor: `dosyayiDogrula` HTTP yüklemesiyle
     * AYNI işlev. E-postayla gelen dosya, tarayıcıdan geçemeyeceği bir
     * kapıdan giremiyor.
     */
    let kabulEdilen = 0
    const reddedilen: string[] = []

    for (const ek of posta.ekler) {
      try {
        const buffer = Buffer.from(ek.content, 'base64')
        const { ext } = dosyayiDogrula(buffer, ek.filename, ek.mimeType)
        const savedDoc = await belgeyiKaydet({
          prisma,
          buffer,
          filename: ek.filename,
          mimeType: ek.mimeType,
          ext,
          userId: karar.userId,
          workspaceId: karar.workspaceId
        })

        // e-Fatura XML ise öneri üret (belge zaten kaydedildi, analysis içinde eFatura var)
        if (ext === 'xml') {
          try {
            // Belgeyi yeniden oku analysis alanını al
            const docWithAnalysis = await prisma.uploadedDocument.findUnique({
              where: { id: savedDoc.id },
              select: { analysis: true }
            })

            if (docWithAnalysis?.analysis) {
              const analysis = JSON.parse(docWithAnalysis.analysis)
              const eFatura = analysis.eFatura

              if (eFatura) {
                const workspace = await prisma.businessWorkspace.findUnique({
                  where: { id: karar.workspaceId },
                  select: { taxNumber: true }
                })
                const suggestion = buildDocumentSuggestion(
                  {
                    originalName: ek.filename,
                    extractedText: buffer.toString('utf-8'),
                    category: null,
                    dueDate: null,
                    eFatura
                  },
                  workspace?.taxNumber ?? null
                )
                if (suggestion) {
                  await oneriKaydet(prisma, {
                    workspaceId: karar.workspaceId,
                    documentId: savedDoc.id,
                    generated: suggestion
                  })
                  await prisma.uploadedDocument.update({
                    where: { id: savedDoc.id },
                    data: { analysisStatus: 'review_required' }
                  })
                }
              }
            }
          } catch (suggestionError) {
            // Log but don't fail the email processing
            request.log.warn({ error: suggestionError }, 'e-Fatura önerisi üretilemedi')
          }
        }

        kabulEdilen++
      } catch (hata) {
        /* Reddedilen ek GÖNDERENE bildirilmiyor -- bilgi sızdırmamak
           için tüm yanıtlar aynı. Günlüğe yazılıyor. */
        reddedilen.push(
          hata instanceof FileValidationError ? `${ek.filename}: ${hata.message}` : ek.filename
        )
      }
    }

    if (reddedilen.length > 0) {
      request.log.info({ workspaceId: karar.workspaceId, reddedilen }, 'gelen posta ekleri reddedildi')
    }

    return reply.status(202).send({
      durum: 'kabul',
      workspaceId: karar.workspaceId,
      belgeSayisi: kabulEdilen
    })
  })
}

/**
 * Gelen kutusu adreslerinin alan adı.
 *
 * `APP_PUBLIC_URL` üzerinden türetiliyor: adresin, uygulamanın
 * yayınlandığı alan adıyla AYNI olması şart, çünkü Cloudflare Email
 * Routing yalnız o alan adının postasını dinliyor.
 *
 * ⚠️ ALT ALAN ADI KULLANILMIYOR. `inbox.localkarar.com` gibi bir alt
 * alan denendi ve çalışmadı: Cloudflare Email Routing alan adının
 * KENDİSİNDE çalışıyor, alt alanlarında değil.
 */
export function gelenKutusuAlanAdi(): string {
  const ham = process.env.APP_PUBLIC_URL || 'https://localkarar.com'
  try {
    return new URL(ham).hostname.replace(/^www\./, '')
  } catch {
    return 'localkarar.com'
  }
}
