import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import jwt from '@fastify/jwt'
import { z } from 'zod'
import { createAuditLog } from './audit.js'
import { randomBytes } from 'node:crypto'
import { randomUUID } from 'node:crypto'
import fastifyMultipart from '@fastify/multipart'
import { createReadStream } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { detectFileType, FileValidationError, validateImageFile } from './documentSecurity.js'
import { generateNumericCode, generateRawToken, hashToken, safeEqual } from '../lib/tokens.js'
import { LEGAL_DOCUMENTS, missingConsents, requiredDocuments } from '../config/legal-documents.js'
import { sendMail } from './mailer.js'
import { dogrulamaKoduMaili, sifreDegistiMaili, sifreSifirlamaMaili } from './mail-templates.js'
import {
  suresiGecenleriTemizle,
  tokenIptalEt,
  tokenYenile,
  yeniAileOlustur
} from './refresh-tokens.js'

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_NAME_RE = /^[0-9a-f-]{36}\.(png|jpg)$/i

/* Parola politikası tek yerden. Kayıt ve değiştirme AYNI kuralı kullanmalı;
   önceden kayıt 10, değiştirme 8 karakter istiyordu, yani kullanıcı 10 ile
   kaydolup hemen 8'e düşerek politikayı geçersizleştirebiliyordu. */
const PASSWORD_MIN = 10
const passwordField = z
  .string()
  .min(PASSWORD_MIN, `Şifre en az ${PASSWORD_MIN} karakter olmalı.`)
  .max(128)

const registerSchema = z.object({
  email: z.string().email().max(254).transform(value => value.trim().toLowerCase()),
  password: passwordField,
  name: z.string().trim().min(2).max(100),
  /*
   * Yasal onay. `true` gelmezse kayıt yapılmaz.
   *
   * Sunucuda da doğrulanıyor — arayüzdeki kutu tek başına yeterli değil:
   * kayıt uç noktası doğrudan da çağrılabilir ve o zaman onaysız hesap
   * açılırdı. Onayın KANITI veritabanına yazılır (bkz. UserConsent).
   */
  acceptedLegal: z.literal(true, {
    errorMap: () => ({ message: 'Kullanım Koşulları ve Aydınlatma Metni onaylanmalı.' })
  })
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordField
})

/* Sıfırlama bağlantısı 1 saat geçerli: kullanıcının e-postasını açmasına
   yetecek kadar uzun, çalınan bir bağlantının işe yaramasına yetmeyecek
   kadar kısa. */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
/* Doğrulama kodu 15 dakika — kod kısa (6 hane) olduğu için ömrü de kısa. */
const VERIFY_CODE_TTL_MS = 15 * 60 * 1000
/* 6 hane kaba kuvvetle denenebilir; deneme sayısı sınırlı olmak zorunda. */
const VERIFY_MAX_ATTEMPTS = 5

const resetRequestSchema = z.object({
  email: z.string().email().max(254).transform(value => value.trim().toLowerCase())
})

const resetConfirmSchema = z.object({
  token: z.string().min(16).max(256),
  newPassword: passwordField
})

const verifyCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Kod 6 haneli olmalı.')
})

const changeEmailSchema = z.object({
  newEmail: z.string().email().max(254).transform(value => value.trim().toLowerCase()),
  currentPassword: z.string().min(1).max(128)
})

const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  confirmation: z.literal('HESABIMI SİL')
})

const loginSchema = z.object({
  email: z.string().email().max(254).transform(value => value.trim().toLowerCase()),
  password: z.string().min(1).max(128)
})

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    /* tv = token surumu. Eski tokenlarda YOK, bu yuzden opsiyonel;
       dogrulamada eksik olan 0 sayilir (bkz. authenticate). */
    payload: { id: number; email: string; role: string; tv?: number }
    user: { id: number; email: string; role: string; tv?: number }
  }
}

/*
 * Tek token uretim noktasi.
 *
 * Önceden üç ayrı yerde `fastify.jwt.sign` çağrılıyordu. `tv` claim'i eklenince
 * bunlardan birinin unutulması, o yoldan alınan tokenin ASLA iptal edilememesi
 * demek olurdu. Tek fonksiyon o riski ortadan kaldırıyor.
 */
function issueToken(
  fastify: FastifyInstance,
  user: { id: number; email: string; role: string; tokenVersion: number }
): string {
  return fastify.jwt.sign(
    { id: user.id, email: user.email, role: user.role, tv: user.tokenVersion },
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  )
}

export async function authRoutes(fastify: FastifyInstance) {
  const avatarDirectory = join(process.cwd(), 'uploads', 'avatars')
  await fastify.register(fastifyMultipart, { limits: { fileSize: AVATAR_MAX_BYTES, files: 1 } })
  await mkdir(avatarDirectory, { recursive: true })

  function avatarUrl(storedName: string | null) {
    return storedName ? `/auth/avatar/${encodeURIComponent(storedName)}` : null
  }

  function safeAvatarPath(storedName: string) {
    if (!AVATAR_NAME_RE.test(storedName)) throw new Error('Geçersiz avatar dosya adı')
    const base = resolve(avatarDirectory)
    const target = resolve(join(avatarDirectory, storedName))
    const fromBase = relative(base, target)
    if (!fromBase || fromBase.startsWith('..') || isAbsolute(fromBase)) throw new Error('Geçersiz avatar yolu')
    return target
  }
  fastify.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    if (process.env.BETA_MODE === 'invite_only') {
      return reply.status(403).send({ error: 'Registration is closed. Beta is invite-only.' })
    }

    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({ error: 'Geçersiz kayıt bilgileri', details: parsed.error.flatten().fieldErrors })
    }
    const { email, password, name } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(400).send({ error: 'Email already in use' })
    }

    const hashed = await bcrypt.hash(password, 10)

    /*
     * Kullanıcı ve onay kaydı AYNI işlemde yazılır. Ayrı yazılsaydı ikinci
     * adım düştüğünde onaysız bir hesap kalırdı — ve onayın kanıtı yoksa
     * onay alınmamış sayılır.
     *
     * Hangi metnin hangi SÜRÜMÜ onaylandığı kaydediliyor; metin değişip
     * sürüm artınca bu kayıt yeni metni kapsamaz.
     */
    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({
        data: { email, password: hashed, name }
      })
      await tx.userConsent.createMany({
        data: requiredDocuments().map(doc => ({
          userId: created.id,
          documentType: doc.type,
          version: doc.version
        }))
      })
      return created
    })

    const token = issueToken(fastify, user)

    await createAuditLog({
      action: 'user.registered',
      entityType: 'user',
      entityId: user.id,
      actorId: user.id,
      actorName: email
    })

    const yenileme = await yeniAileOlustur(prisma, user.id, user.tokenVersion)

    return {
      token,
      refreshToken: yenileme.rawToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: avatarUrl(user.avatarStoredName), emailVerified: !!user.emailVerifiedAt }
    }
  })

  fastify.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({ error: 'Geçersiz giriş bilgileri' })
    }
    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (user?.deletedAt) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = issueToken(fastify, user)

    const yenileme = await yeniAileOlustur(prisma, user.id, user.tokenVersion)
    /* Fırsatçı temizlik: tablo yalnız giriş/yenileme ile büyüdüğü için
       temizliğin de aynı yolda olması yeterli. Hata bastırılıyor —
       bakım işi girişi düşürmemeli. */
    suresiGecenleriTemizle(prisma).catch(() => {})

    return {
      token,
      refreshToken: yenileme.rawToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: avatarUrl(user.avatarStoredName), emailVerified: !!user.emailVerifiedAt }
    }
  })

  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    const found = await prisma.user.findUnique({ where: { id: user.id } })
    if (!found || found.deletedAt) {
      return reply.status(404).send({ error: 'User not found' })
    }
    const pref = await prisma.userPreference.findUnique({ where: { userId: found.id } })
    return {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
      avatarUrl: avatarUrl(found.avatarStoredName),
      onboardingCompleted: pref?.onboardingCompleted ?? false,
      emailVerified: !!found.emailVerifiedAt
    }
  })

  fastify.get('/avatar/:storedName', async (request, reply) => {
    const storedName = String((request.params as { storedName?: string }).storedName || '')
    if (!AVATAR_NAME_RE.test(storedName)) return reply.status(404).send({ error: 'Profil fotoğrafı bulunamadı.' })
    const owner = await prisma.user.findFirst({ where: { avatarStoredName: storedName, deletedAt: null }, select: { avatarMimeType: true } })
    if (!owner?.avatarMimeType) return reply.status(404).send({ error: 'Profil fotoğrafı bulunamadı.' })
    reply.header('Content-Type', owner.avatarMimeType)
    reply.header('Cache-Control', 'public, max-age=86400, immutable')
    reply.header('X-Content-Type-Options', 'nosniff')
    return reply.send(createReadStream(safeAvatarPath(storedName)))
  })

  fastify.post('/avatar', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    let upload
    try {
      upload = await request.file()
    } catch (error: any) {
      return reply.status(error?.statusCode === 413 ? 413 : 400).send({ error: error?.statusCode === 413 ? 'Profil fotoğrafı en fazla 5 MB olabilir.' : 'Dosya okunamadı.' })
    }
    if (!upload) return reply.status(400).send({ error: 'Fotoğraf seçilmedi.' })
    if (!['image/png', 'image/jpeg'].includes(upload.mimetype)) return reply.status(415).send({ error: 'Yalnız PNG veya JPEG fotoğraf yükleyin.' })

    const buffer = await upload.toBuffer().catch(() => Buffer.alloc(0))
    if (!buffer.length || buffer.length > AVATAR_MAX_BYTES) return reply.status(buffer.length > AVATAR_MAX_BYTES ? 413 : 422).send({ error: 'Fotoğraf boş veya çok büyük.' })
    const detected = detectFileType(buffer)
    const expected = upload.mimetype === 'image/png' ? 'png' : 'jpeg'
    if (!detected.valid || detected.detectedType !== expected) return reply.status(415).send({ error: 'Fotoğraf içeriği dosya türüyle uyuşmuyor.' })
    try {
      validateImageFile(buffer, expected)
    } catch (error) {
      if (error instanceof FileValidationError) return reply.status(error.statusCode).send({ error: error.message })
      throw error
    }

    const found = await prisma.user.findUnique({ where: { id: request.user.id }, select: { avatarStoredName: true } })
    if (!found) return reply.status(404).send({ error: 'User not found' })
    const storedName = `${randomUUID()}.${expected === 'png' ? 'png' : 'jpg'}`
    const target = safeAvatarPath(storedName)
    await writeFile(target, buffer, { flag: 'wx' })
    try {
      await prisma.user.update({ where: { id: request.user.id }, data: { avatarStoredName: storedName, avatarMimeType: upload.mimetype } })
    } catch (error) {
      await unlink(target).catch(() => {})
      throw error
    }
    if (found.avatarStoredName) await unlink(safeAvatarPath(found.avatarStoredName)).catch(() => {})
    return reply.status(201).send({ avatarUrl: avatarUrl(storedName) })
  })

  fastify.delete('/avatar', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const found = await prisma.user.findUnique({ where: { id: request.user.id }, select: { avatarStoredName: true } })
    if (!found) return reply.status(404).send({ error: 'User not found' })
    await prisma.user.update({ where: { id: request.user.id }, data: { avatarStoredName: null, avatarMimeType: null } })
    if (found.avatarStoredName) await unlink(safeAvatarPath(found.avatarStoredName)).catch(() => {})
    return reply.status(204).send()
  })

  /*
   * PUT /auth/password — oturum açmış kullanıcının şifresini değiştirir.
   * Prisma şeması değişmez; yalnızca mevcut `password` alanı güncellenir.
   * Yanıt gövdesinde şifre veya hash döndürülmez.
   */
  fastify.put('/password', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Şifre bilgileri geçersiz.',
        fields: parsed.error.issues.map(issue => String(issue.path[0]))
      })
    }

    const { currentPassword, newPassword } = parsed.data
    const user = request.user as any

    const found = await prisma.user.findUnique({ where: { id: user.id } })
    if (!found) {
      return reply.status(404).send({ error: 'User not found' })
    }

    // Mevcut şifre yanlışsa hangi alanın hatalı olduğunu sızdırmadan 401 dön.
    const valid = await bcrypt.compare(currentPassword, found.password)
    if (!valid) {
      return reply.status(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Şifre değiştirilemedi. Bilgileri kontrol edip tekrar deneyin.'
      })
    }

    // Yeni şifre eskisiyle aynı olamaz.
    const same = await bcrypt.compare(newPassword, found.password)
    if (same) {
      return reply.status(422).send({
        error: 'PASSWORD_UNCHANGED',
        message: 'Yeni şifre mevcut şifreyle aynı olamaz.'
      })
    }

    // Kayıt akışıyla aynı bcrypt maliyeti (10).
    const hashed = await bcrypt.hash(newPassword, 10)
    /*
     * `tokenVersion` artırılıyor: şifre değiştiren kişi çoğu zaman hesabının
     * ele geçirildiğinden şüphelendiği için değiştirir. Önceden yalnız parola
     * güncelleniyordu, saldırganın elindeki token 8 saat daha çalışıyordu.
     * Artık o tokenlar bir sonraki istekte ölüyor.
     */
    const updated = await prisma.user.update({
      where: { id: found.id },
      data: { password: hashed, tokenVersion: { increment: 1 } }
    })

    await createAuditLog({
      action: 'auth.password_changed',
      entityType: 'user',
      entityId: found.id,
      actorId: found.id,
      actorName: found.name
    }).catch(() => {})

    /* Bilgilendirme: şifre değişimini kullanıcı yapmadıysa bu e-posta
       hesabının ele geçirildiğinin ilk sinyali olur. Gönderim hatası akışı
       kesmemeli — şifre zaten değişti. */
    await sendMail(sifreDegistiMaili(updated.email, updated.name))
      .catch(err => request.log.error({ err }, 'şifre değişikliği bildirimi gönderilemedi'))

    /*
     * Sürüm artırıldığı için çağıranın kendi tokeni de geçersiz oldu. Taze
     * token dönüyoruz: şifresini değiştiren cihaz oturumda kalır, DİĞER tüm
     * cihazlar düşer. İstenen davranış bu.
     */
    /* `tokenVersion` arttığı için çağıranın elindeki yenileme tokeni de
       geçersiz oldu; tazesi veriliyor. Verilmeseydi kullanıcı kendi
       cihazından da düşerdi — iki uç noktanın da amacı bu değil. */
    const yenileme = await yeniAileOlustur(prisma, updated.id, updated.tokenVersion)

    return reply.send({
      success: true,
      token: issueToken(fastify, updated),
      refreshToken: yenileme.rawToken,
      user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, avatarUrl: avatarUrl(updated.avatarStoredName) }
    })
  })

  /**
   * POST /auth/logout-all — kullanıcının tüm oturumlarını sonlandırır.
   *
   * Cihazını kaybeden ya da bir yerde oturumunu açık bıraktığından şüphelenen
   * kullanıcının şifresini değiştirmeden oturumları kapatabilmesi için.
   * Sürümü artırır, çağıran cihaza taze token döner.
   */
  fastify.post('/logout-all', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const updated = await prisma.user.update({
      where: { id: request.user.id },
      data: { tokenVersion: { increment: 1 } }
    })
    if (updated.deletedAt) {
      return reply.status(404).send({ error: 'User not found' })
    }

    await createAuditLog({
      action: 'auth.sessions_revoked',
      entityType: 'user',
      entityId: updated.id,
      actorId: updated.id,
      actorName: updated.name
    }).catch(() => {})

    /* `tokenVersion` arttığı için çağıranın elindeki yenileme tokeni de
       geçersiz oldu; tazesi veriliyor. Verilmeseydi kullanıcı kendi
       cihazından da düşerdi — iki uç noktanın da amacı bu değil. */
    const yenileme = await yeniAileOlustur(prisma, updated.id, updated.tokenVersion)

    return reply.send({
      success: true,
      token: issueToken(fastify, updated),
      refreshToken: yenileme.rawToken,
      user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, avatarUrl: avatarUrl(updated.avatarStoredName) }
    })
  })

  /**
   * GET /auth/legal-documents — güncel metinler ve sürümleri (herkese açık).
   *
   * Frontend sürümü buradan alır; iki yerde ayrı ayrı yazılsaydı
   * kaydedilen onay ile gösterilen metin zamanla ayrışırdı.
   */
  /**
   * POST /auth/refresh — erişim tokenini yeniler.
   *
   * Kimlik doğrulama İSTEMEZ: çağrının amacı zaten süresi dolmuş bir
   * erişim tokenini değiştirmek. Yetki, sunulan yenileme tokeninin
   * kendisinden geliyor.
   */
  fastify.post('/refresh', {
    config: { rateLimit: { max: 60, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const parsed = z.object({ refreshToken: z.string().min(32).max(256) }).safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Geçersiz istek' })

    const sonuc = await tokenYenile(prisma, parsed.data.refreshToken)
    if (!sonuc.ok) {
      /*
       * İstemciye TEK bir hata dönüyor: "bulunamadı", "süresi doldu" ve
       * "tekrar kullanım" ayrımı saldırgana bilgi verirdi. Ayrım yalnız
       * günlükte kalıyor — tekrar kullanım bir hırsızlık sinyali ve
       * ayırt edilebilmeli.
       */
      if (sonuc.hata === 'TEKRAR_KULLANIM') {
        request.log.warn('yenileme tokeni TEKRAR kullanildi - aile iptal edildi')
      }
      return reply.status(401).send({ error: 'Oturum süresi doldu', reason: 'REFRESH_REJECTED' })
    }

    const user = await prisma.user.findUnique({ where: { id: sonuc.userId } })
    if (!user || user.deletedAt) {
      return reply.status(401).send({ error: 'Oturum süresi doldu', reason: 'REFRESH_REJECTED' })
    }

    return reply.send({
      token: issueToken(fastify, user),
      refreshToken: sonuc.yeni.rawToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: avatarUrl(user.avatarStoredName),
        emailVerified: !!user.emailVerifiedAt
      }
    })
  })

  /**
   * POST /auth/logout — YALNIZ bu cihazın oturumunu kapatır.
   *
   * `logout-all`den farkı: `tokenVersion` artmıyor, diğer cihazlar
   * etkilenmiyor. Kimlik doğrulama istemiyor — elinde tokeni olan zaten
   * onu iptal edebilmeli ve süresi dolmuş erişim tokeniyle de çıkış
   * yapılabilmeli.
   */
  fastify.post('/logout', {
    config: { rateLimit: { max: 60, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const parsed = z.object({ refreshToken: z.string().min(32).max(256).optional() }).safeParse(request.body)
    if (parsed.success && parsed.data.refreshToken) {
      await tokenIptalEt(prisma, parsed.data.refreshToken)
    }
    /* Token verilmese ya da tanınmasa bile 200: çıkış kullanıcıya asla
       hata göstermemeli. */
    return reply.send({ success: true })
  })

  fastify.get('/legal-documents', async () => {
    return { documents: LEGAL_DOCUMENTS }
  })

  /**
   * GET /auth/consents — oturum açmış kullanıcının onay durumu.
   *
   * `missing` doluysa metin sürümü kullanıcının onayından sonra artmış
   * demektir; arayüz yeniden onay ister.
   */
  fastify.get('/consents', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const kabuller = await prisma.userConsent.findMany({
      where: { userId: request.user.id },
      select: { documentType: true, version: true, acceptedAt: true },
      orderBy: { acceptedAt: 'desc' }
    })
    return { accepted: kabuller, missing: missingConsents(kabuller) }
  })

  /**
   * POST /auth/consents — güncel sürümleri onaylar.
   *
   * Metin sürümü arttığında mevcut kullanıcıdan yeniden onay almak için.
   * Yalnız EKSİK olanlar yazılır; tekrar çağrılması zararsızdır.
   */
  fastify.post('/consents', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 20, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const mevcut = await prisma.userConsent.findMany({
      where: { userId: request.user.id },
      select: { documentType: true, version: true }
    })
    const eksik = missingConsents(mevcut)
    if (eksik.length === 0) {
      return reply.send({ success: true, added: 0 })
    }

    await prisma.userConsent.createMany({
      data: eksik.map(doc => ({
        userId: request.user.id,
        documentType: doc.type,
        version: doc.version
      })),
      /* Yarışan iki istek aynı anda gelirse benzersizlik kısıtı hata
         vermesin; sonuç yine tek kayıt olur. */
      skipDuplicates: true
    })

    await createAuditLog({
      action: 'auth.legal_accepted',
      entityType: 'user',
      entityId: request.user.id,
      actorId: request.user.id,
      actorName: request.user.email,
      metadata: { documents: eksik.map(d => `${d.type}@${d.version}`) }
    }).catch(() => {})

    return reply.send({ success: true, added: eksik.length })
  })

  /*
   * ŞİFRE SIFIRLAMA
   *
   * Kullanıcı şifresini unuttuğunda hesabına dönebilmesinin tek yolu; bu
   * yüzden akışın kendisi bir saldırı yüzeyi. İki tasarım kararı önemli:
   *
   * 1. İstek uç noktası HER ZAMAN 200 döner. "Bu e-posta kayıtlı değil"
   *    demek, saldırgana hangi adreslerin sistemde olduğunu söyler
   *    (kullanıcı sayımı). Kayıtlı olmayan adres için hiçbir şey yapılmaz
   *    ama cevap ayırt edilemez.
   * 2. Token veritabanında ham haliyle DURMAZ. Yalnız sha256 özeti yazılır;
   *    ham değer sadece e-postaya gider.
   */
  fastify.post('/password-reset/request', {
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const parsed = resetRequestSchema.safeParse(request.body)
    /* Geçersiz gövdede bile ayırt edilebilir bir cevap vermiyoruz. */
    if (!parsed.success) return reply.send({ success: true })

    const email = parsed.data.email
    const user = await prisma.user.findUnique({ where: { email } })

    /*
     * Sıfırlama yalnız DOĞRULANMIŞ adrese gönderilir. Aksi halde birinin
     * başkasının adresiyle açtığı doğrulanmamış hesap, o adresin gerçek
     * sahibine sıfırlama e-postası yağdırmak için kullanılabilirdi.
     */
    if (user && !user.deletedAt && user.emailVerifiedAt) {
      const rawToken = generateRawToken()
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS)
        }
      })

      /*
       * Gönderim hatası YUTULUYOR — bilinçli. Sağlayıcı hatasını kullanıcıya
       * yansıtmak, cevabı ayırt edilebilir kılar ve yukarıdaki 1. maddeyi
       * boşa çıkarır. Hata sunucu logunda görünür.
       */
      await sendMail(sifreSifirlamaMaili(user.email, user.name, rawToken))
        .catch(err => request.log.error({ err }, 'şifre sıfırlama e-postası gönderilemedi'))

      await createAuditLog({
        action: 'auth.password_reset_requested',
        entityType: 'user', entityId: user.id,
        actorId: user.id, actorName: user.name
      }).catch(() => {})
    }

    return reply.send({ success: true })
  })

  fastify.post('/password-reset/confirm', {
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const parsed = resetConfirmSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Sıfırlama bilgileri geçersiz.',
        fields: parsed.error.issues.map(issue => String(issue.path[0]))
      })
    }

    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash: hashToken(parsed.data.token) },
      include: { user: true }
    })

    /* Süresi geçmiş, kullanılmış ve var olmayan token AYNI cevabı alır —
       hangisi olduğunu söylemek saldırgana bilgi verir. */
    const gecerli =
      record !== null &&
      record.usedAt === null &&
      record.expiresAt > new Date() &&
      !record.user.deletedAt

    if (!gecerli) {
      return reply.status(400).send({
        error: 'INVALID_RESET_TOKEN',
        message: 'Bağlantı geçersiz ya da süresi dolmuş. Yeni bir sıfırlama isteyin.'
      })
    }

    const hashed = await bcrypt.hash(parsed.data.newPassword, 10)
    const updated = await prisma.$transaction(async tx => {
      /* Token tek kullanımlık: aynı işlemde işaretleniyor. */
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() }
      })
      /* Kullanıcının BEKLEYEN diğer sıfırlama tokenları da geçersiz olur. */
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() }
      })
      /* `tokenVersion` artışı tüm oturumları kapatır — sıfırlamanın amacı bu:
         hesabı ele geçiren kişinin açık oturumu da ölmeli. */
      return tx.user.update({
        where: { id: record.userId },
        data: { password: hashed, tokenVersion: { increment: 1 } }
      })
    })

    await createAuditLog({
      action: 'auth.password_reset_completed',
      entityType: 'user', entityId: updated.id,
      actorId: updated.id, actorName: updated.name
    }).catch(() => {})

    await sendMail(sifreDegistiMaili(updated.email, updated.name))
      .catch(err => request.log.error({ err }, 'şifre değişikliği bildirimi gönderilemedi'))

    /*
     * Taze token: kullanıcı sıfırlama sonrası doğrudan oturum açmış olur.
     * Yenileme tokeni de tazeleniyor — `tokenVersion` arttığı için varsa
     * eskisi geçersiz; verilmeseydi kullanıcı ilk yenilemede atılırdı.
     */
    const yenileme = await yeniAileOlustur(prisma, updated.id, updated.tokenVersion)

    return reply.send({
      success: true,
      token: issueToken(fastify, updated),
      refreshToken: yenileme.rawToken,
      user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, avatarUrl: avatarUrl(updated.avatarStoredName) }
    })
  })

  /*
   * E-POSTA DOĞRULAMA (6 haneli kod)
   *
   * Bağlantı yerine kod: mobil istemcide derin bağlantı kurmaya gerek
   * kalmıyor, aynı akış web ve Android'de çalışıyor.
   */
  fastify.post('/email/verify-request', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } })
    if (!user || user.deletedAt) return reply.status(404).send({ error: 'User not found' })
    if (user.emailVerifiedAt) {
      return reply.send({ success: true, alreadyVerified: true })
    }

    /* Önceki kodlar geçersiz kılınır: aynı anda birden çok geçerli kod
       olması, deneme sayacını anlamsızlaştırırdı. */
    await prisma.emailVerificationCode.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    })

    const kod = generateNumericCode(6)
    await prisma.emailVerificationCode.create({
      data: {
        userId: user.id,
        codeHash: hashToken(kod),
        expiresAt: new Date(Date.now() + VERIFY_CODE_TTL_MS)
      }
    })

    /* Burada hata YUTULMUYOR: kullanıcı oturum açmış durumda, kendi
       adresini doğruluyor — sayım riski yok. "Kod gönderildi" deyip
       göndermemek ise kullanıcıyı bekletir. */
    await sendMail(dogrulamaKoduMaili(user.email, user.name, kod))

    return reply.send({ success: true, expiresInMinutes: VERIFY_CODE_TTL_MS / 60000 })
  })

  fastify.post('/email/verify-confirm', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 20, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const parsed = verifyCodeSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Kod 6 haneli olmalı.' })
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } })
    if (!user || user.deletedAt) return reply.status(404).send({ error: 'User not found' })
    if (user.emailVerifiedAt) return reply.send({ success: true, alreadyVerified: true })

    const record = await prisma.emailVerificationCode.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' }
    })

    if (!record || record.expiresAt <= new Date()) {
      return reply.status(400).send({
        error: 'CODE_EXPIRED',
        message: 'Kodun süresi dolmuş. Yeni kod isteyin.'
      })
    }

    /* Deneme sayacı: 6 hane = 1.000.000 olasılık, sayaç olmadan kaba
       kuvvetle denenebilirdi. Sayacı ARTMADAN önce kontrol ediyoruz. */
    if (record.attempts >= VERIFY_MAX_ATTEMPTS) {
      await prisma.emailVerificationCode.update({
        where: { id: record.id }, data: { usedAt: new Date() }
      })
      return reply.status(429).send({
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Çok fazla hatalı deneme. Yeni kod isteyin.'
      })
    }

    if (!safeEqual(record.codeHash, hashToken(parsed.data.code))) {
      await prisma.emailVerificationCode.update({
        where: { id: record.id }, data: { attempts: { increment: 1 } }
      })
      return reply.status(400).send({
        error: 'INVALID_CODE',
        message: 'Kod hatalı.',
        remainingAttempts: VERIFY_MAX_ATTEMPTS - (record.attempts + 1)
      })
    }

    const updated = await prisma.$transaction(async tx => {
      await tx.emailVerificationCode.update({
        where: { id: record.id }, data: { usedAt: new Date() }
      })
      return tx.user.update({
        where: { id: user.id }, data: { emailVerifiedAt: new Date() }
      })
    })

    await createAuditLog({
      action: 'auth.email_verified',
      entityType: 'user', entityId: updated.id,
      actorId: updated.id, actorName: updated.name
    }).catch(() => {})

    return reply.send({ success: true, emailVerifiedAt: updated.emailVerifiedAt })
  })

  fastify.put('/email', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const parsed = changeEmailSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'E-posta bilgileri geçersiz.' })
    }

    const found = await prisma.user.findUnique({ where: { id: request.user.id } })
    if (!found || found.deletedAt) return reply.status(404).send({ error: 'User not found' })

    const valid = await bcrypt.compare(parsed.data.currentPassword, found.password)
    if (!valid) {
      return reply.status(401).send({ error: 'INVALID_CREDENTIALS', message: 'E-posta değiştirilemedi. Şifrenizi kontrol edin.' })
    }
    if (parsed.data.newEmail === found.email) {
      return reply.status(422).send({ error: 'EMAIL_UNCHANGED', message: 'Yeni e-posta mevcut e-posta ile aynı.' })
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.newEmail } })
    if (existing) return reply.status(409).send({ error: 'EMAIL_IN_USE', message: 'Bu e-posta başka bir hesapta kullanılıyor.' })

    const updated = await prisma.user.update({ where: { id: found.id }, data: { email: parsed.data.newEmail } })
    await createAuditLog({
      action: 'auth.email_changed', entityType: 'user', entityId: found.id,
      actorId: found.id, actorName: found.name
    }).catch(() => {})

    const token = issueToken(fastify, updated)
    return reply.send({ token, user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, avatarUrl: avatarUrl(updated.avatarStoredName) } })
  })

  fastify.delete('/account', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const parsed = deleteAccountSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({ error: 'CONFIRMATION_REQUIRED', message: 'Hesap silme onayı geçersiz.' })
    }

    const found = await prisma.user.findUnique({ where: { id: request.user.id } })
    if (!found || found.deletedAt) return reply.status(404).send({ error: 'User not found' })
    const valid = await bcrypt.compare(parsed.data.currentPassword, found.password)
    if (!valid) return reply.status(401).send({ error: 'INVALID_CREDENTIALS', message: 'Hesap silinemedi. Şifrenizi kontrol edin.' })

    if (found.role === 'admin') {
      const activeAdmins = await prisma.user.count({ where: { role: 'admin', deletedAt: null } })
      if (activeAdmins <= 1) return reply.status(409).send({ error: 'LAST_ADMIN', message: 'Son yönetici hesabı silinemez.' })
    }

    const soleOwnerMembership = await prisma.businessMember.findFirst({
      where: {
        userId: found.id,
        role: 'owner',
        status: 'active',
        workspace: { members: { none: { userId: { not: found.id }, role: 'owner', status: 'active' } } }
      },
      select: { workspace: { select: { name: true } } }
    })
    if (soleOwnerMembership) {
      return reply.status(409).send({
        error: 'SOLE_WORKSPACE_OWNER',
        message: `Önce “${soleOwnerMembership.workspace.name}” işletmesine başka bir sahip atayın.`
      })
    }

    const deletedEmail = `deleted-${found.id}-${Date.now()}@deleted.local`
    const unusablePassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10)
    await prisma.$transaction([
      prisma.businessMember.updateMany({ where: { userId: found.id }, data: { status: 'inactive' } }),
      prisma.user.update({
        where: { id: found.id },
        data: { email: deletedEmail, name: 'Silinmiş Kullanıcı', password: unusablePassword, avatarStoredName: null, avatarMimeType: null, deletedAt: new Date() }
      })
    ])

    if (found.avatarStoredName) await unlink(safeAvatarPath(found.avatarStoredName)).catch(() => {})

    return reply.status(204).send()
  })
}

export function registerJwtPlugin(fastify: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  }
  if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must be at least 32 bytes (256 bits) for production/beta. Use a strong random value.')
  }

  fastify.register(jwt, { secret: jwtSecret })

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, role: true, deletedAt: true, tokenVersion: true }
    })
    if (!dbUser || dbUser.deletedAt) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    /*
     * Oturum iptali. Token içindeki sürüm kullanıcının güncel sürümüyle
     * eşleşmezse istek reddedilir; böylece şifre değişimi ve "tüm cihazlardan
     * çık" işlemi çalınmış tokenları ANINDA öldürür. Önceden bu mümkün
     * değildi: token 8 saat boyunca geçerli kalıyordu.
     *
     * Bu kontrol EK SORGU MALİYETİ GETİRMEZ — kullanıcı zaten yukarıda
     * çekiliyor, yalnız bir alan daha seçiliyor.
     *
     * `tv` eksikse 0 sayılır: bu değişiklikten önce üretilmiş tokenlar
     * dağıtım anında geçersiz olmasın diye. Sürüm bir kez artırıldığında
     * (>= 1) o eski tokenlar da doğal olarak reddedilir.
     */
    if ((request.user.tv ?? 0) !== dbUser.tokenVersion) {
      return reply.status(401).send({ error: 'Unauthorized', reason: 'SESSION_REVOKED' })
    }

    request.user.email = dbUser.email
    request.user.role = dbUser.role
  })
}
