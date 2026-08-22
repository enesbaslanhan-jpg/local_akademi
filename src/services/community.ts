import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { z } from 'zod'
import fastifyMultipart from '@fastify/multipart'
import { createReadStream } from 'fs'
import { mkdir, stat, unlink, writeFile } from 'fs/promises'
import { isAbsolute, join, relative, resolve } from 'path'
import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import {
  ALLOWED_MIME_MAP,
  MAX_FILE_SIZE,
  detectFileType,
  inspectZip,
  validateImageFile,
  validatePdfFile,
  validateVideoFile,
  FileValidationError,
} from './documentSecurity'
import {
  generateOfficialSummary,
  officialSummaryRequestSchema,
} from './official-update-summarizer'
import {
  localAiGenerationQueue,
  LocalAiQueueFullError,
} from './local-ai-job-queue'

/*
 * Topluluk medyası için boyut sınırı — belge yüklemeninkinden AYRI.
 *
 * Belgeler 10 MB (`MAX_FILE_SIZE`) ile sınırlı ve orada video kabul
 * edilmiyor. Video o sınıra sığmadığı için topluluk tarafına 20 MB
 * verildi (ürün kararı, 22.08.2026).
 *
 * Sayı bilinçli olarak ölçülü: sunucuda 28 GB boş alan var ve videolar
 * `uploads` biriminde birikiyor. 20 MB'lık videolarla bu ~1400 video
 * demek. Disk dolarsa uygulama durur, o yüzden büyütmeden önce izleme
 * gerekir.
 */
const TOPLULUK_MEDYA_SINIRI = 20 * 1024 * 1024

/*
 * RESMÎ gönderiler için. Başlık + özet zorunlu; kaynak gösterimi olan,
 * kurumsal duyuru biçimindeki içerik bunlar.
 *
 * `officialPostSchema` bunu genişletiyor — bu yüzden kullanıcı
 * paylaşımları için AYRI bir şema var (aşağıda). İkisini tek şemada
 * toplamak, resmî gönderilerin başlık zorunluluğunu da kaldırırdı.
 */
export const communityPostSchema = z.object({
  title: z.string().trim().min(5).max(180),
  summary: z.string().trim().min(20).max(1200),
  mediaId: z.string().uuid().optional(),
})

/*
 * KULLANICI paylaşımı — tek metin kutusu.
 *
 * Başlık yok: ürün kararı, paylaşım biçimi X'teki gibi kısa ve tek
 * parça olacak (22.08.2026). Eski gönderiler başlıklarını koruyor;
 * `CommunityPost.title` bu yüzden silinmedi, yalnız isteğe bağlı oldu.
 *
 * Alt sınır 1: yalnız görsel/video paylaşmak isteyen için metin zorunlu
 * olmamalı — ama ikisi de boş olan bir gönderi anlamsız, o kontrol
 * uç noktada yapılıyor.
 */
export const kullaniciPaylasimSemasi = z.object({
  metin: z.string().trim().max(500).default(''),
  mediaId: z.string().uuid().optional(),
  /* Yanit ve alinti da birer gonderi -- ayri uc nokta yok. */
  parentId: z.string().uuid().optional(),
  quotedPostId: z.string().uuid().optional(),
})

export const officialPostSchema = communityPostSchema.extend({
  content: z.string().trim().max(10000).optional(),
  category: z.string().trim().max(60).optional(),
  sourceUrl: z.string().url().max(1000),
  sourceTitle: z.string().trim().min(2).max(200),
  sourcePublishedAt: z.string().datetime().optional(),
}).superRefine((value, context) => {
  let protocol = ''
  try {
    protocol = new URL(value.sourceUrl).protocol
  } catch {
    return
  }
  if (protocol !== 'https:' && protocol !== 'http:') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sourceUrl'],
      message: 'Yalnız HTTP(S) kaynak bağlantıları kabul edilir',
    })
  }
})

const moderationSchema = z.object({
  action: z.enum(['publish', 'reject']),
  reason: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (value.action === 'reject' && !value.reason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: 'Ret nedeni zorunludur',
    })
  }
})

const reportSchema = z.object({
  reason: z.enum([
    'spam',
    'misinformation',
    'harassment',
    'unsafe',
    'copyright',
    'other',
  ]),
  details: z.string().trim().min(5).max(500).optional(),
}).superRefine((value, context) => {
  if (value.reason === 'other' && !value.details) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['details'],
      message: 'Diğer nedeni için açıklama zorunludur',
    })
  }
})

const reportResolutionSchema = z.object({
  action: z.enum(['dismiss', 'hide_post']),
  note: z.string().trim().max(500).optional(),
})

export async function communityRoutes(
  fastify: FastifyInstance,
  opts?: { prisma?: PrismaClient },
) {
  const prisma = opts?.prisma ?? sharedPrisma
  const mediaDirectory = join(process.cwd(), 'uploads', 'community')

  /*
   * Topluluk medyasinin kendi siniri var: video 10 MB'a sigmiyor.
   * Belge yuklemenin siniri (MAX_FILE_SIZE, 10 MB) degismedi -- orada
   * video zaten kabul edilmiyor.
   */
  await fastify.register(fastifyMultipart, {
    limits: { fileSize: TOPLULUK_MEDYA_SINIRI, files: 1 },
  })
  await mkdir(mediaDirectory, { recursive: true })

  const mediaSelect = {
    id: true,
    originalName: true,
    mimeType: true,
    sizeBytes: true,
    kind: true,
  } as const

  /*
   * IMZALI MEDYA BAGLANTISI
   *
   * Topluluk giris arkasinda ama medya rotasi kimlik dogrulayamiyor:
   * <img src> ve <video src> Authorization basligi tasiyamaz. Sonuc,
   * gonderi METNI duvarin arkasinda, fotograf ve video disinda kaliyordu.
   *
   * Cerez ile cozulebilirdi ama COZULMEDI: uygulama hic cerez
   * kullanmiyor ve StorageNotice bunu kullaniciya YAZILI olarak taahhut
   * ediyor. Tek bir medya cerezi o cumleyi yalanlar ve cerez politikasi
   * metnini degistirmeyi gerektirirdi.
   *
   * Bunun yerine kisa omurlu imza: adres HMAC ile muhurleniyor ve
   * suresi dolunca oluyor. DURUST SINIR -- bu, sizan bir baglantiyi
   * imkansiz kilmaz, omrunu SINIRLAR. "Sonsuza kadar acik" yerine
   * "en fazla 12 saat".
   *
   * Sure neden 12 saat: sekmesini acik birakan kullanicinin gorselleri
   * elinde patlamamali. Daha kisasi kullaniciyi bozuk gorsele, daha
   * uzunu sizan baglantiyi uzun omurlu yapardi.
   */
  const MEDYA_BAGLANTI_OMRU_SN = 12 * 60 * 60

  /* JWT_SECRET dogrudan kullanilmiyor: ayni gizli anahtari iki farkli
     amaca kosmak, birinde bulunan zayifligi digerine tasir. Ondan
     turetilmis ayri bir anahtar kullaniliyor. */
  function medyaAnahtari() {
    const temel = process.env.JWT_SECRET || ''
    return createHmac('sha256', temel).update('community-media-url-v1').digest()
  }

  function medyaImzasi(mediaId: string, bitis: number) {
    return createHmac('sha256', medyaAnahtari())
      .update(`${mediaId}.${bitis}`)
      .digest('hex')
  }

  function imzaliMedyaUrl(mediaId: string) {
    const bitis = Math.floor(Date.now() / 1000) + MEDYA_BAGLANTI_OMRU_SN
    return `/community/media/${mediaId}?e=${bitis}&s=${medyaImzasi(mediaId, bitis)}`
  }

  type ImzaSonucu = 'gecerli' | 'suresi-doldu' | 'gecersiz'

  function imzayiDogrula(mediaId: string, e?: string, imza?: string): ImzaSonucu {
    if (!e || !imza) return 'gecersiz'
    const bitis = Number.parseInt(e, 10)
    if (!Number.isFinite(bitis)) return 'gecersiz'

    const beklenen = Buffer.from(medyaImzasi(mediaId, bitis), 'utf8')
    const gelen = Buffer.from(imza, 'utf8')
    /* Uzunluk esit degilse timingSafeEqual FIRLATIR; once o kontrol. */
    if (beklenen.length !== gelen.length) return 'gecersiz'
    if (!timingSafeEqual(beklenen, gelen)) return 'gecersiz'

    /* Imza gecerli ama vakti gecmis: baglanti bir zamanlar mesruydu.
       Bunu "bulunamadi" ile karistirmamak arayuze akisi tazeleme
       firsati veriyor. */
    return bitis * 1000 > Date.now() ? 'gecerli' : 'suresi-doldu'
  }

  /* Medyayi istemciye verirken imzali adresi de ekler. Tek yerden
     gecmesi onemli: bir listede unutulursa orada gorseller kirilir. */
  function medyaCikti<T extends { id: string } | null | undefined>(media: T) {
    return media ? { ...media, url: imzaliMedyaUrl(media.id) } : media
  }

  /*
   * ETKILESIM BILGISI
   *
   * Sayilar tabloda TUTULMUYOR, `_count` ile okunuyor. Erken
   * denormalizasyon tutarsizlik kaynagidir; akis yavaslarsa sayac
   * sutunu o zaman eklenir.
   *
   * "Ben begendim mi" sorusu ayri bir sorguyla degil, kullaniciya
   * suzulmus bir iliskiyle cevaplaniyor: N gonderi icin N+1 sorgu
   * yerine tek sorgu.
   */
  function etkilesimIcerigi(kullaniciId: number) {
    return {
      _count: { select: { likes: true, replies: true, quotes: true } },
      likes: { where: { userId: kullaniciId }, select: { id: true } },
      bookmarks: { where: { userId: kullaniciId }, select: { id: true } },
    } as const
  }

  /*
   * Ham Prisma kaydini istemci govdesine cevirir.
   *
   * `likes`/`bookmarks` dizileri istemciye GITMEZ: onlar yalniz
   * "ben begendim mi" sorusunu cevaplamak icin cekilen ic veri.
   * Oldugu gibi gonderilseydi kimlik sizdirmasa da gereksiz yuk olurdu.
   */
  function gonderiCikti(post: any): any {
    if (!post) return post
    const { _count, likes, bookmarks, ...kalan } = post
    return {
      ...kalan,
      media: medyaCikti(post.media),
      begeniSayisi: _count?.likes ?? 0,
      yanitSayisi: _count?.replies ?? 0,
      alintiSayisi: _count?.quotes ?? 0,
      begendim: Array.isArray(likes) && likes.length > 0,
      kaydettim: Array.isArray(bookmarks) && bookmarks.length > 0,
      ...(post.quotedPost !== undefined
        ? { quotedPost: alintiCikti(post.quotedPost) }
        : {}),
    }
  }

  /*
   * Alintilanan gonderi KUCULTULEREK gonderiliyor.
   *
   * Alintinin alintisinin alintisi zinciri, tek bir akis isteginde
   * sinirsiz derinlige gidebilirdi. Ayrica kaldirilmis bir gonderinin
   * icerigi alinti icinde yasamaya devam etmemeli -- kaldirma yetkisi
   * aksi halde alintiyla atlatilirdi.
   */
  function alintiCikti(alinti: any) {
    if (!alinti) return null
    if (alinti.status !== 'published') {
      return { id: alinti.id, kaldirildi: true, author: null, summary: null, media: null }
    }
    return {
      id: alinti.id,
      kaldirildi: false,
      summary: alinti.summary,
      title: alinti.title,
      publishedAt: alinti.publishedAt,
      author: alinti.author,
      media: medyaCikti(alinti.media),
    }
  }

  /* Alinti icin cekilecek alanlar. `status` SART: kaldirilmis alintiyi
     ayirt etmenin tek yolu. */
  const alintiIcerigi = {
    select: {
      id: true,
      status: true,
      title: true,
      summary: true,
      publishedAt: true,
      author: { select: { id: true, name: true } },
      media: { select: mediaSelect },
    },
  } as const

  function safeMediaPath(storedName: string) {
    const base = resolve(mediaDirectory)
    const target = resolve(join(mediaDirectory, storedName))
    const pathFromBase = relative(base, target)
    if (!pathFromBase || pathFromBase.startsWith('..') || isAbsolute(pathFromBase)) {
      throw new FileValidationError('Geçersiz dosya yolu', 400)
    }
    return target
  }

  async function ownedMedia(mediaId: string | undefined, userId: number) {
    if (!mediaId) return null
    return prisma.communityMedia.findFirst({
      where: { id: mediaId, uploaderId: userId, postId: null },
      select: { id: true },
    })
  }

  fastify.post('/media', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 12, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    let upload
    try {
      upload = await request.file()
    } catch (error: any) {
      const tooLarge = error?.statusCode === 413 || error?.message?.includes('file size limit')
      return reply.status(tooLarge ? 413 : 400).send({
        error: tooLarge ? 'Dosya en fazla 20 MB olabilir.' : 'Dosya okunamadı.',
      })
    }
    if (!upload) return reply.status(400).send({ error: 'Dosya seçilmedi.' })

    const originalName = upload.filename.slice(0, 255)
    const extension = (originalName.split('.').pop() || '').toLowerCase()
    const allowedExtensions = new Set(['png', 'jpg', 'jpeg', 'pdf', 'docx', 'mp4', 'webm'])
    if (!allowedExtensions.has(extension) || ALLOWED_MIME_MAP[extension] !== upload.mimetype) {
      return reply.status(415).send({ error: 'PNG, JPEG, MP4, WebM, PDF veya DOCX dosyası yükleyin.' })
    }

    let buffer: Buffer
    try {
      buffer = await upload.toBuffer()
    } catch {
      return reply.status(400).send({ error: 'Dosya okunamadı.' })
    }
    if (!buffer.length || buffer.length > TOPLULUK_MEDYA_SINIRI) {
      return reply.status(buffer.length > TOPLULUK_MEDYA_SINIRI ? 413 : 422).send({ error: 'Dosya boş veya çok büyük.' })
    }

    try {
      const detected = detectFileType(buffer)
      if (!detected.valid) throw new FileValidationError(detected.error || 'Dosya türü doğrulanamadı', 415)
      if (extension === 'png' && detected.detectedType !== 'png') throw new FileValidationError('Görsel içeriği uzantıyla uyuşmuyor', 415)
      if (['jpg', 'jpeg'].includes(extension) && detected.detectedType !== 'jpeg') throw new FileValidationError('Görsel içeriği uzantıyla uyuşmuyor', 415)
      if (extension === 'mp4') validateVideoFile(buffer, 'mp4')
      if (extension === 'webm') validateVideoFile(buffer, 'webm')
      if (extension === 'pdf') validatePdfFile(buffer)
      if (extension === 'png') validateImageFile(buffer, 'png')
      if (['jpg', 'jpeg'].includes(extension)) validateImageFile(buffer, 'jpeg')
      if (extension === 'docx') {
        const zip = inspectZip(buffer)
        if (!zip.valid || !zip.hasContentTypesXml || !zip.hasWordDocumentXml) {
          throw new FileValidationError(zip.error || 'Geçersiz DOCX dosyası', 422)
        }
      }
    } catch (error) {
      if (error instanceof FileValidationError) return reply.status(error.statusCode).send({ error: error.message })
      throw error
    }

    const id = randomUUID()
    const storedName = `${id}.${extension}`
    const path = safeMediaPath(storedName)
    try {
      await writeFile(path, buffer, { flag: 'wx' })
      const media = await prisma.communityMedia.create({
        data: {
          id,
          uploaderId: request.user.id,
          originalName,
          storedName,
          mimeType: upload.mimetype,
          sizeBytes: buffer.length,
          kind: upload.mimetype.startsWith('image/')
            ? 'image'
            : upload.mimetype.startsWith('video/') ? 'video' : 'file',
        },
        select: mediaSelect,
      })
      return reply.status(201).send({ media: medyaCikti(media) })
    } catch (error) {
      await unlink(path).catch(() => {})
      request.log.error({ error }, 'Community media upload failed')
      return reply.status(500).send({ error: 'Dosya kaydedilemedi.' })
    }
  })

  fastify.get('/media/:mediaId', async (request, reply) => {
    const mediaId = String((request.params as { mediaId?: string }).mediaId || '')

    /* Imza once dogrulaniyor: veritabanina gitmeden. Gecersiz imzayla
       gelen istek bir sorgu bile actirmasin. */
    const sorgu = request.query as { e?: string; s?: string }
    const imzaDurumu = imzayiDogrula(mediaId, sorgu.e, sorgu.s)
    if (imzaDurumu === 'suresi-doldu') {
      return reply.status(403).send({
        error: 'Bu baglantinin suresi doldu, sayfayi yenileyin.',
        code: 'MEDIA_LINK_EXPIRED',
      })
    }
    if (imzaDurumu !== 'gecerli') {
      /* Gecersiz imzada 404: 403 donmek, o kimlikte bir dosya OLDUGUNU
         soylerdi. Bulunamayan dosyayla ayni cevap veriliyor. */
      return reply.status(404).send({ error: 'Dosya bulunamadı.' })
    }
    const media = await prisma.communityMedia.findFirst({
      where: { id: mediaId, post: { status: 'published' } },
      select: { storedName: true, mimeType: true, originalName: true },
    })
    if (!media) return reply.status(404).send({ error: 'Dosya bulunamadı.' })
    try {
      const path = safeMediaPath(media.storedName)
      const bilgi = await stat(path)

      reply.header('Content-Type', media.mimeType)
      reply.header('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(media.originalName)}`)
      /*
       * ONBELLEK: `public, max-age=86400, immutable` DEGIL.
       *
       * Yazar ve yonetici artik gonderiyi kaldirabiliyor (22.08.2026).
       * Onunde Cloudflare var; `public` demek kenar sunucusunun dosyayi
       * kendi diskine almasi demekti. Uygunsuz bir video kaldirildiginda
       * gonderi akistan dusuyor ama dosyanin KENDISI kenar onbelleginden
       * 24 saat daha servis edilmeye devam ederdi — kaldirma yetkisini
       * fiilen 24 saat geciktiren bir davranis.
       *
       * `private`: yalniz tarayici saklar, ara sunucular saklamaz.
       * `no-cache`: tarayici saklayabilir ama her kullanimda sunucuya
       * sorar; dosya silinmisse 404 alir. Icerik degismedigi icin
       * bant genisligi kaybi yok, tazelik kazanci var.
       */
      reply.header('Cache-Control', 'private, no-cache')

      /*
       * KISMİ İNDİRME (Range) — video için şart.
       *
       * Tarayıcı bir videoda ileri sarabilmek için dosyanın ortasından
       * parça isteyebilmeli. Sunucu `Accept-Ranges` söylemezse tarayıcı
       * bunu yapamaz: ileri sarma çalışmaz ve bazı tarayıcılar oynatmaya
       * hiç başlamaz, çünkü önce dosyanın tamamını indirmeleri gerekir.
       *
       * Görseller için de zararsız; küçük oldukları için tarayıcı zaten
       * tek parça istiyor.
       */
      reply.header('Accept-Ranges', 'bytes')
      const rangeBasligi = request.headers.range

      if (typeof rangeBasligi === 'string' && rangeBasligi.startsWith('bytes=')) {
        const [hamBas, hamSon] = rangeBasligi.replace('bytes=', '').split('-')

        /*
         * `Number.parseInt(hamBas) || 0` YAZILAMAZ.
         *
         * Iki ayri sey bozuluyordu. Birincisi `bytes=-500` ("son 500
         * bayt") — RFC 7233 sonek araligi. `hamBas` bos, parseInt NaN,
         * `|| 0` onu 0 yapiyordu; istemci SON 500 bayti isterken ILK 501
         * bayti aliyor, ustelik `Content-Range` bunu dogru sanip
         * `bytes 0-500` diye etiketliyordu. Ikincisi `bytes=abc-100`
         * gibi bozuk bir baslik 416 yerine sessizce 0'dan basliyordu —
         * ve `|| 0` yuzunden asagidaki `Number.isNaN(bas)` kontrolu
         * hicbir zaman calisamayan olu koddu.
         */
        let bas: number
        let son: number
        if (hamBas === '') {
          /* Sonek: `bytes=-N` son N bayt demek. */
          const uzunluk = Number.parseInt(hamSon, 10)
          if (Number.isNaN(uzunluk) || uzunluk <= 0) {
            reply.header('Content-Range', `bytes */${bilgi.size}`)
            return reply.status(416).send()
          }
          bas = Math.max(0, bilgi.size - uzunluk)
          son = bilgi.size - 1
        } else {
          bas = Number.parseInt(hamBas, 10)
          son = hamSon ? Number.parseInt(hamSon, 10) : bilgi.size - 1
        }

        /* Geçersiz aralık: RFC 7233 bu durumda 416 ve dosya boyutunu ister. */
        if (Number.isNaN(bas) || Number.isNaN(son) || bas >= bilgi.size || son >= bilgi.size || bas > son) {
          reply.header('Content-Range', `bytes */${bilgi.size}`)
          return reply.status(416).send()
        }

        reply.header('Content-Range', `bytes ${bas}-${son}/${bilgi.size}`)
        reply.header('Content-Length', String(son - bas + 1))
        return reply.status(206).send(createReadStream(path, { start: bas, end: son }))
      }

      reply.header('Content-Length', String(bilgi.size))
      return reply.send(createReadStream(path))
    } catch {
      return reply.status(404).send({ error: 'Dosya bulunamadı.' })
    }
  })

  fastify.delete('/media/:mediaId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const mediaId = String((request.params as { mediaId?: string }).mediaId || '')
    const media = await prisma.communityMedia.findFirst({
      where: { id: mediaId, uploaderId: request.user.id, postId: null },
    })
    if (!media) return reply.status(404).send({ error: 'Dosya bulunamadı.' })
    await prisma.communityMedia.delete({ where: { id: media.id } })
    await unlink(safeMediaPath(media.storedName)).catch(() => {})
    return { deleted: true }
  })

  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async request => {
    const query = request.query as {
      type?: string
      cursor?: string
    }
    const type =
      query.type === 'official' || query.type === 'user'
        ? query.type
        : undefined
    const cursorId = query.cursor?.slice(0, 100)
    const engellenenler = await prisma.communityBlock.findMany({ where: { blockerId: request.user.id }, select: { blockedId: true } })
    const posts = await prisma.communityPost.findMany({
      where: {
        status: 'published',
        ...(type ? { postType: type } : {}),
        /*
         * 🔴 BU SATIR AKISI AYAKTA TUTUYOR.
         *
         * Yanitlar da CommunityPost (X'te bir yanit kendisi de bir
         * gonderidir). Bu kosul olmazsa her yanit ana akista ayri bir
         * kart olarak belirir ve akis, baglamindan kopmus yanit
         * parcalariyla dolar.
         *
         * tests/topluluk-etkilesim.test.ts bunu koruyor.
         */
        parentId: null,
        authorId: { notIn: engellenenler.map(kayit => kayit.blockedId) },
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        media: { select: mediaSelect },
        quotedPost: alintiIcerigi,
        ...etkilesimIcerigi(request.user.id),
      },
      orderBy: [
        { publishedAt: 'desc' },
        { id: 'desc' },
      ],
      take: 21,
      ...(cursorId
        ? { cursor: { id: cursorId }, skip: 1 }
        : {}),
    })
    const hasMore = posts.length > 20
    const visible = posts.slice(0, 20)
    return {
      posts: visible.map(gonderiCikti),
      nextCursor: hasMore
        ? visible.at(-1)?.id || null
        : null,
    }
  })

  fastify.post('/posts', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 5, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    const parsed = kullaniciPaylasimSemasi.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    const media = await ownedMedia(parsed.data.mediaId, request.user.id)
    if (parsed.data.mediaId && !media) {
      return reply.status(422).send({ error: 'Yüklenen dosya bulunamadı veya başka bir paylaşıma bağlı.' })
    }

    /*
     * Metin de görsel de yoksa ortada paylaşılacak bir şey yok.
     * ALINTI bunun istisnası: alıntının kendisi bir içeriktir, tek
     * başına "şuna bakın" demek meşru bir paylaşım.
     */
    if (!parsed.data.metin && !media && !parsed.data.quotedPostId) {
      return reply.status(422).send({ error: 'Bir şeyler yazın veya bir görsel ekleyin.' })
    }

    /*
     * Yanıt ve alıntı hedefleri DOĞRULANIYOR.
     *
     * Doğrulanmasaydı: var olmayan bir kimliğe yanıt yazmak veritabanı
     * kısıt hatasıyla 500 döndürürdü, ve kaldırılmış bir gönderiye
     * yanıt/alıntı eklemek kaldırma kararını fiilen geri alırdı.
     */
    async function yayimdaMi(id: string | undefined) {
      if (!id) return true
      const hedef = await prisma.communityPost.findFirst({
        where: { id, status: 'published' },
        select: { id: true },
      })
      return Boolean(hedef)
    }

    if (!(await yayimdaMi(parsed.data.parentId))) {
      return reply.status(404).send({ error: 'Yanıt verilen paylaşım bulunamadı.' })
    }
    if (!(await yayimdaMi(parsed.data.quotedPostId))) {
      return reply.status(404).send({ error: 'Alıntılanan paylaşım bulunamadı.' })
    }

    /*
     * DOĞRUDAN YAYIMLANIYOR — ön moderasyon kaldırıldı (ürün kararı,
     * 22.08.2026). Önceden `status: 'pending'` ile kuyruğa giriyordu ve
     * onaylanana kadar kimse göremiyordu.
     *
     * Denetim şikâyet üzerine yapılıyor: `POST /:postId/reports` zaten
     * vardı, kaldırma yolu ise yeni eklendi (`DELETE /:postId`).
     * Bu iki parça olmadan ön moderasyonu kaldırmak sorumsuzluk olurdu.
     */
    const post = await prisma.communityPost.create({
      data: {
        authorId: request.user.id,
        postType: 'user',
        title: null,
        summary: parsed.data.metin,
        status: 'published',
        publishedAt: new Date(),
        parentId: parsed.data.parentId ?? null,
        quotedPostId: parsed.data.quotedPostId ?? null,
        ...(media ? { media: { connect: { id: media.id } } } : {}),
      },
    })
    return reply.status(201).send({
      post: {
        id: post.id,
        summary: post.summary,
        status: post.status,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
        parentId: post.parentId,
        quotedPostId: post.quotedPostId,
      },
      message: 'Paylaşımın yayımlandı.',
    })
  })

  /*
   * Yayımlanmış bir paylaşımı kaldırma.
   *
   * YAZAR kendi paylaşımını, YÖNETİCİ her paylaşımı kaldırabilir.
   * Ön moderasyon kalktığı için bu uç nokta zorunlu: uygunsuz içeriğe
   * müdahale edilebilecek tek yol burası.
   *
   * GERÇEK SİLME DEĞİL, durum değişikliği. Sebebi teknik: `CommunityReport`
   * kayıtları gönderiye bağlı; satırı silmek hem şikâyet geçmişini hem
   * "kim neyi ne zaman kaldırdı" izini götürürdü. Kullanıcı açısından
   * fark yok — gönderi listelerden düşüyor.
   */
  /*
   * BENIM SAYFAM: paylasimlarim / begendiklerim / kaydettiklerim
   *
   * Uc yol da YALNIZ kendi verisini veriyor -- kullanici kimligi
   * adresten degil JETONDAN okunuyor. Adresten alinsaydi bir kullanici
   * digerinin kaydettiklerini gorurdu; "kaydettiklerim" kisiye ozel bir
   * yer imi ve baskasina gosterilmesi bir gizlilik ihlalidir.
   *
   * BASKASININ profili bilerek YOK: kimin ne begendiginin baskasina
   * gorunmesi ayri bir urun karari ve ayri bir metin degisikligi.
   */
  fastify.get('/me/summary', {
    preHandler: [fastify.authenticate],
  }, async request => {
    const userId = request.user.id
    const [paylasim, begeni, kayit] = await Promise.all([
      prisma.communityPost.count({ where: { authorId: userId, status: 'published' } }),
      prisma.communityLike.count({ where: { userId } }),
      prisma.communityBookmark.count({ where: { userId } }),
    ])
    return { paylasim, begeni, kayit }
  })

  fastify.get('/me/:liste', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { liste } = request.params as { liste: string }
    const userId = request.user.id

    /* `take` BURAYA konmuyor. Bu nesne asagida hem liste sorgusunda hem
       de `include: { post: ... }` icinde kullaniliyor; tekil bir iliskiye
       `take` gecmek Prisma'yi kiriyor. Sinir cagri yerinde veriliyor. */
    const ortak = {
      include: {
        author: { select: { id: true, name: true } },
        media: { select: mediaSelect },
        quotedPost: alintiIcerigi,
        ...etkilesimIcerigi(userId),
      },
    } as const

    if (liste === 'posts') {
      const posts = await prisma.communityPost.findMany({
        where: { authorId: userId, status: 'published' },
        orderBy: { publishedAt: 'desc' },
        take: 50,
        ...ortak,
      })
      return { posts: posts.map(gonderiCikti) }
    }

    if (liste === 'likes' || liste === 'bookmarks') {
      /* Iliskiden gidiliyor: sirayi BEGENME/KAYDETME zamani belirlemeli,
         gonderinin yayim zamani degil. Eski bir gonderiyi bugun
         kaydettiysem listemin basinda olmali. */
      /* Iki delege ayri ayri cagriliyor: birlesimleri (union) cagrilabilir
         degil -- imzalari uyusmuyor ve TypeScript hakli olarak reddediyor. */
      const sorgu = {
        where: { userId },
        orderBy: { createdAt: 'desc' as const },
        take: 50,
        include: { post: ortak },
      }
      const kayitlar: any[] = liste === 'likes'
        ? await prisma.communityLike.findMany(sorgu)
        : await prisma.communityBookmark.findMany(sorgu)

      /* Kaldirilmis gonderiler listeden dusuyor -- kayit duruyor ama
         gosterilmiyor; kaldirma kararina saygi. */
      const posts = kayitlar
        .map(k => k.post).filter(post => post && post.status === 'published')
        .map(gonderiCikti)
      return { posts }
    }

    return reply.status(404).send({ error: 'Bilinmeyen liste.' })
  })

  /*
   * TEK GONDERI + YANIT AGACI  (kalici adres / alinti / paylas)
   *
   * Rota SIRASI onemli: bu `/:postId` kalibi `/moderation` ve
   * `/reports` gibi sabit yollardan SONRA tanimlanmali, yoksa onlari
   * yutar. Fastify sabit yolu parametreli yola tercih ediyor ama buna
   * guvenip sirayi bozmuyoruz.
   *
   * DERINLIK: veritabaninda sinirsiz, burada 3 seviye. Sinirsiz
   * cekmek tek istekte butun bir konusma agacini yukleyebilirdi.
   * Daha derini icin kullanici o yanitin kendi adresine gider.
   */
  const YANIT_DERINLIGI = 3

  fastify.get('/post/:postId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { postId } = request.params as { postId: string }
    const kullaniciId = request.user.id

    /* Yanit agaci ic ice `include` ile cekiliyor. Uc seviye sabit
       oldugu icin ozyineleme yerine acik yazim: okunmasi kolay ve
       sorgu sayisi ongorulebilir. */
    const yanitIcerigi = (derinlik: number): any => ({
      where: { status: 'published' },
      orderBy: { createdAt: 'asc' as const },
      take: 50,
      include: {
        author: { select: { id: true, name: true } },
        media: { select: mediaSelect },
        ...etkilesimIcerigi(kullaniciId),
        ...(derinlik > 1 ? { replies: yanitIcerigi(derinlik - 1) } : {}),
      },
    })

    const post = await prisma.communityPost.findFirst({
      where: { id: postId, status: 'published' },
      include: {
        author: { select: { id: true, name: true } },
        media: { select: mediaSelect },
        quotedPost: alintiIcerigi,
        parent: {
          include: {
            author: { select: { id: true, name: true } },
            media: { select: mediaSelect },
            ...etkilesimIcerigi(kullaniciId),
          },
        },
        replies: yanitIcerigi(YANIT_DERINLIGI),
        ...etkilesimIcerigi(kullaniciId),
      },
    })

    if (!post) {
      return reply.status(404).send({ error: 'Paylaşım bulunamadı.' })
    }

    /* Agacin her dugumu ayni doldurmadan gecmeli; yoksa ust gonderide
       begeni sayisi olur, yanitlarda olmaz. */
    const agac = (dugum: any): any => dugum && ({
      ...gonderiCikti(dugum),
      ...(Array.isArray(dugum.replies)
        ? { replies: dugum.replies.map(agac) }
        : {}),
    })

    return {
      post: agac(post),
      parent: post.parent ? gonderiCikti(post.parent) : null,
    }
  })

  /*
   * BEGENI ve KAYDETME
   *
   * Ikisi de ayni sekle sahip ama AYRI tablolar: begeni herkese acik
   * bir onay, kaydetme kisiye ozel bir yer imi. Tek tabloda `tur`
   * sutunuyla birlestirmek, biri herkese acik digeri gizli kaldiginda
   * yetki mantigini tek satirda cakistirirdi.
   *
   * Cift basma tek kayit uretir (`@@unique`), o yuzden `create` yerine
   * `upsert`: kullanicinin cift tiklamasi 500 dondurmemeli.
   */
  async function yayimlanmisGonderi(postId: string) {
    return prisma.communityPost.findFirst({
      where: { id: postId, status: 'published' },
      select: { id: true },
    })
  }

  function etkilesimUclari(
    ad: 'like' | 'bookmark',
    tablo: { upsert: Function; deleteMany: Function; count: Function },
  ) {
    fastify.post(`/:postId/${ad}`, {
      preHandler: [fastify.authenticate],
      config: { rateLimit: { max: 300, timeWindow: '1 hour' } },
    }, async (request, reply) => {
      const { postId } = request.params as { postId: string }
      if (!(await yayimlanmisGonderi(postId))) {
        return reply.status(404).send({ error: 'Paylaşım bulunamadı.' })
      }
      const userId = request.user.id
      await tablo.upsert({
        where: { userId_postId: { userId, postId } },
        create: { userId, postId },
        update: {},
      })
      return { aktif: true, sayi: await tablo.count({ where: { postId } }) }
    })

    fastify.delete(`/:postId/${ad}`, {
      preHandler: [fastify.authenticate],
      config: { rateLimit: { max: 300, timeWindow: '1 hour' } },
    }, async request => {
      const { postId } = request.params as { postId: string }
      /* `deleteMany`: kayit yoksa `delete` firlatirdi. Begenilmemis bir
         gonderinin begenisini kaldirmak hata degil, bos islemdir. */
      await tablo.deleteMany({ where: { userId: request.user.id, postId } })
      return { aktif: false, sayi: await tablo.count({ where: { postId } }) }
    })
  }

  etkilesimUclari('like', prisma.communityLike as never)
  etkilesimUclari('bookmark', prisma.communityBookmark as never)

  fastify.delete('/:postId', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 30, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const { postId } = request.params as { postId: string }
    const kullanici = request.user as { id: number; role?: string }

    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, status: true },
    })
    if (!post || post.status === 'removed') {
      return reply.status(404).send({ error: 'Paylaşım bulunamadı.' })
    }

    const yonetici = kullanici.role === 'admin'
    const yazar = post.authorId === kullanici.id
    if (!yonetici && !yazar) {
      return reply.status(403).send({ error: 'Bu paylaşımı kaldırma yetkiniz yok.' })
    }

    await prisma.communityPost.update({
      where: { id: postId },
      data: {
        status: 'removed',
        moderatedById: kullanici.id,
        moderatedAt: new Date(),
        moderationReason: yazar && !yonetici ? 'Yazar kaldırdı' : 'Yönetici kaldırdı',
      },
    })

    return reply.send({ success: true })
  })

  fastify.post('/:postId/reports', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 10, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    const parsed = reportSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    const postId = String(
      (request.params as { postId?: string }).postId || '',
    )
    const post = await prisma.communityPost.findFirst({
      where: { id: postId, status: 'published' },
      select: { id: true },
    })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    const existing = await prisma.communityReport.findUnique({
      where: {
        postId_reporterId: {
          postId,
          reporterId: request.user.id,
        },
      },
      select: { id: true },
    })
    if (existing) {
      return reply.status(409).send({
        error: 'Post already reported',
        code: 'COMMUNITY_REPORT_DUPLICATE',
      })
    }
    const report = await prisma.communityReport.create({
      data: {
        postId,
        reporterId: request.user.id,
        reason: parsed.data.reason,
        details: parsed.data.details || null,
      },
      select: { id: true, status: true, createdAt: true },
    })
    return reply.status(201).send({ report })
  })

  fastify.post('/official', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 20, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Admin access required',
      })
    }
    const parsed = officialPostSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    const media = await ownedMedia(parsed.data.mediaId, request.user.id)
    if (parsed.data.mediaId && !media) {
      return reply.status(422).send({ error: 'Yüklenen dosya bulunamadı veya başka bir paylaşıma bağlı.' })
    }
    const post = await prisma.communityPost.create({
      data: {
        authorId: request.user.id,
        postType: 'official',
        title: parsed.data.title,
        summary: parsed.data.summary,
        content: parsed.data.content || null,
        category: parsed.data.category || null,
        sourceUrl: parsed.data.sourceUrl,
        sourceTitle: parsed.data.sourceTitle,
        sourcePublishedAt: parsed.data.sourcePublishedAt
          ? new Date(parsed.data.sourcePublishedAt)
          : null,
        status: 'draft',
        ...(media ? { media: { connect: { id: media.id } } } : {}),
      },
    })
    return reply.status(201).send({
      post,
      requiresModeration: true,
    })
  })

  fastify.post('/official/ai-draft', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 10, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Admin access required',
      })
    }
    if (process.env.AI_OFFICIAL_SUMMARIZER_ENABLED !== 'true') {
      return reply.status(503).send({
        error: 'Official summarizer is disabled',
        code: 'AI_OFFICIAL_SUMMARIZER_DISABLED',
      })
    }
    const parsed = officialSummaryRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    try {
      const generated = await localAiGenerationQueue.run(
        'official_summary',
        () => generateOfficialSummary(parsed.data),
      )
      const post = await prisma.communityPost.create({
        data: {
          authorId: request.user.id,
          postType: 'official',
          title: generated.title,
          summary: generated.summary,
          sourceUrl: parsed.data.sourceUrl,
          sourceTitle: parsed.data.sourceTitle,
          sourcePublishedAt: parsed.data.sourcePublishedAt
            ? new Date(parsed.data.sourcePublishedAt)
            : null,
          status: 'draft',
        },
      })
      return reply.status(201).send({
        post,
        sourceTextStored: false,
        requiresModeration: true,
      })
    } catch (error) {
      if (error instanceof LocalAiQueueFullError) {
        return reply.status(429).send({
          error: 'Local AI queue is full',
          code: 'LOCAL_AI_QUEUE_FULL',
        })
      }
      request.log.error(
        { errorCode: 'AI_OFFICIAL_SUMMARY_FAILED' },
        'Official update summary failed',
      )
      return reply.status(502).send({
        error: 'Official update summary could not be generated',
        code: 'AI_OFFICIAL_SUMMARY_FAILED',
      })
    }
  })

  fastify.get('/moderation', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Admin access required',
      })
    }
    const posts = await prisma.communityPost.findMany({
      where: { status: { in: ['draft', 'pending'] } },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        media: { select: mediaSelect },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    return { posts: posts.map(post => ({ ...post, media: medyaCikti(post.media) })) }
  })

  fastify.get('/reports', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const reports = await prisma.communityReport.findMany({
      where: { status: 'open' },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            summary: true,
            postType: true,
            status: true,
          },
        },
        reporter: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    return { reports }
  })

  fastify.post('/reports/:reportId/resolve', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 60, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const parsed = reportResolutionSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    const reportId = String(
      (request.params as { reportId?: string }).reportId || '',
    )
    const existing = await prisma.communityReport.findFirst({
      where: { id: reportId, status: 'open' },
      select: { id: true, postId: true },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Report not found' })
    }
    const result = await prisma.$transaction(async tx => {
      if (parsed.data.action === 'hide_post') {
        await tx.communityPost.update({
          where: { id: existing.postId },
          data: {
            status: 'rejected',
            moderationReason:
              parsed.data.note || 'Kullanıcı raporu sonrası gizlendi',
            moderatedById: request.user.id,
            moderatedAt: new Date(),
            publishedAt: null,
          },
        })
      }
      return tx.communityReport.update({
        where: { id: existing.id },
        data: {
          status: 'resolved',
          resolution: parsed.data.action,
          resolvedById: request.user.id,
          resolvedAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          resolution: true,
          resolvedAt: true,
        },
      })
    })
    return { report: result }
  })

  fastify.post('/:postId/moderate', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 60, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Admin access required',
      })
    }
    const parsed = moderationSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    const postId = String(
      (request.params as { postId?: string }).postId || '',
    )
    const existing = await prisma.communityPost.findFirst({
      where: {
        id: postId,
        status: { in: ['draft', 'pending'] },
      },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Post not found' })
    }
    const post = await prisma.communityPost.update({
      where: { id: postId },
      data: {
        status:
          parsed.data.action === 'publish'
            ? 'published'
            : 'rejected',
        moderationReason: parsed.data.reason || null,
        moderatedById: request.user.id,
        moderatedAt: new Date(),
        publishedAt:
          parsed.data.action === 'publish'
            ? new Date()
            : null,
      },
    })
    return { post }
  })
}
