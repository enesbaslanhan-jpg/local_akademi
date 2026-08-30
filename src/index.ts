import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import { authRoutes, registerJwtPlugin } from './services/auth'
import { mailYapilandirmasiniDogrula } from './services/mailer'
import { decisionCheckRoutes } from './services/decision-checks'
import { courseRoutes } from './services/courses'
import { lessonRoutes } from './services/lessons'
import { enrollmentRoutes } from './services/enrollments'
import { knowledgeRoutes } from './services/knowledge'
import { mentorRoutes } from './services/mentor'
import { conversationRoutes } from './services/conversation'
import { learningPathRoutes } from './services/learningPath'
import { quizRoutes } from './services/quizzes'
import { taskRoutes } from './services/tasks'
import { documentRoutes } from './services/documents'
import { businessRoutes } from './services/business'
import { workspaceRoutes } from './services/workspace'
import { businessTrackerRoutes } from './services/business-tracker'
import { workspaceExportRoutes } from './services/workspace-exports'
import { startBusinessReminderWorker } from './services/business-reminder-worker'
import { accountNotificationRoutes, startAccountNotificationWorker } from './services/account-notifications'
import { uyelikKapisi } from './services/membership-guard'
import { formulaRoutes } from './services/formulas'
import { adminRoutes } from './services/admin'
import { supportRoutes } from './services/support'
import { practicalCardRoutes } from './services/practical-cards'
import { reportRoutes } from './services/reports'
import { knowledgeV2Routes } from './services/knowledge-v2'
import { onboardingRoutes } from './services/onboarding'
import { assessmentRoutes } from './services/assessment'
import { learningRoutes } from './services/learning'
import { importRoutes } from './services/import'
import { companionContentRoutes } from './services/companion-content'
import { learnerDashboardRoutes } from './services/learnerDashboard'
import { pilotDashboardRoutes } from './services/pilotDashboard'
import { sourceRoutes } from './services/sources'
import { memoryRoutes } from './services/memory/memory-routes'
import { flashcardRoutes } from './services/flashcard-routes'
import { videoRoutes } from './services/videos'
import { communityRoutes } from './services/community'
import { communitySocialRoutes } from './services/community-social'
import { gelenEpostaRotalari } from './services/gelen-eposta'
import { integrationRoutes } from './services/integrations/marketplace-routes'
import { startMarketplaceWorker } from './services/integrations/marketplace-worker'
import { financialModelRoutes } from './services/financial-models/routes'
import { feedRoutes } from './routes/feed.js'
import { learningProgressRoutes } from './routes/learning-progress.js'
import { newsRoutes } from './services/news/routes.js'
import { startNewsWorker } from './services/news/worker.js'
import { ensureFinancialModelCatalog } from './services/financial-models/catalog'
import { deleteExpiredReviewerTelemetry } from './services/ai-reviewer'
import { disconnectPrisma, prisma } from './lib/prisma'
import { RELEASE_INFO } from './config/release'
import { createHash } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const isProduction = process.env.NODE_ENV === 'production'
  || process.env.BETA_MODE === 'true'
  || process.env.BETA_MODE === 'invite_only'

/*
 * `trustProxy` — hız sınırlarının kime uygulandığını belirler.
 *
 * SORUN: burada eskiden sabit `true` vardı. Bu, `X-Forwarded-For` başlığına
 * KOŞULSUZ güvenmek demek. Uygulamaya doğrudan erişilebiliyorsa saldırgan her
 * istekte başlığı değiştirerek IP tabanlı sınırların TAMAMINI aşabilir —
 * giriş (10/dk), kayıt (5/saat), şifre sıfırlama (3/saat) dahil 22 uç nokta.
 * Yani kaba kuvvet korumasının tamamı bir başlıkla devre dışı kalıyordu.
 *
 * ÇÖZÜM: varsayılan `false` (soket adresi kullanılır, uydurulamaz). Ters vekil
 * ARKASINDA çalışıyorsanız TRUST_PROXY'yi açıkça ayarlayın.
 *
 * DİKKAT — ters vekil arkasındayken TRUST_PROXY ayarlanmazsa tüm istekler
 * vekilin IP'sinden geliyormuş gibi görünür ve tek kullanıcı herkesin kotasını
 * tüketebilir. Yani bu değişken ya doğru ayarlanmalı ya da uygulama doğrudan
 * internete bakmalı; arada kalmak iki yönden de hatalı.
 *
 * Kabul edilen değerler:
 *   (tanımsız) | false  → vekile güvenilmez  [varsayılan, güvenli]
 *   1, 2, ...           → güvenilecek vekil sayısı (tek nginx için: 1)
 *   10.0.0.5, 10.0.0.0/8 → güvenilecek adres/aralık listesi
 *   true                → her kaynağa güvenilir  [sınırlar aşılabilir]
 */
function resolveTrustProxy(): boolean | number | string[] {
  const raw = (process.env.TRUST_PROXY || '').trim()
  if (!raw || raw.toLowerCase() === 'false') return false

  if (raw.toLowerCase() === 'true') {
    console.warn(
      '[GÜVENLİK] TRUST_PROXY=true — X-Forwarded-For başlığına koşulsuz güveniliyor. ' +
      'IP tabanlı hız sınırları (giriş, kayıt, şifre sıfırlama) başlık uydurularak aşılabilir. ' +
      'Bunun yerine vekil sayısını (ör. TRUST_PROXY=1) veya vekil adresini yazın.'
    )
    return true
  }

  const hop = Number(raw)
  if (Number.isInteger(hop) && hop > 0) return hop

  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

/**
 * Hız sınırlarının kime uygulanacağını belirleyen anahtar.
 *
 * SORUN: Cloudflare arkasında `request.ip` GERÇEK KULLANICI DEĞİL,
 * Cloudflare'ın o isteği taşıyan kenar sunucusu oluyordu. Ölçüldü
 * (22.08.2026) — aynı istemciden iki istek, iki farklı adres:
 *
 *     "remoteAddress":"172.71.164.99"
 *     "remoteAddress":"104.23.239.60"
 *
 * Kenar sunucusu istekten isteğe değiştiği için sınır kovaları
 * dağılıyordu: sahte `X-Forwarded-For` ile 8/8 istek geçiyor, sahtesiz
 * denemede bile `200 200 429 429 200 200` gibi düzensiz bir sonuç
 * çıkıyordu. Yani giriş, kayıt ve şifre sıfırlama sınırları fiilen
 * çalışmıyordu.
 *
 * NEDEN SIÇRAMA SAYISI DEĞİL: `TRUST_PROXY` zaten `2` idi ve yetmedi.
 * Hop sayarak doğru adrese ulaşmak, zincirdeki her değişiklikte
 * (bir vekil eklenmesi, Cloudflare'ın başlığı farklı yazması) sessizce
 * bozulan kırılgan bir yöntem. `CF-Connecting-IP` ise Cloudflare'ın
 * gerçek istemci için yazdığı TEK ve kesin değer.
 *
 * GÜVENLİK: bu başlık yalnız bir ters vekil arkasındayken
 * (`TRUST_PROXY` tanımlıyken) dikkate alınıyor. Sunucuya doğrudan
 * ulaşabilen biri onu uydurabilirdi; ulaşamıyor, çünkü güvenlik duvarı
 * 80/443'ü yalnız Cloudflare aralıklarına açıyor ve uygulama portu
 * yalnız makine içine bağlı. İki katman.
 */
export function hizSiniriAnahtari(request: { ip: string; headers: Record<string, unknown> }): string {
  if (resolveTrustProxy() !== false) {
    const baslik = request.headers['cf-connecting-ip']
    const deger = Array.isArray(baslik) ? baslik[0] : baslik
    if (typeof deger === 'string' && deger.trim()) return deger.trim()
  }
  return request.ip
}

/**
 * Oturumlu trafikte NAT/IP kovasını paylaşmak yerine doğrulanmış JWT sahibi
 * kullanılır. Geçersiz veya eksik token hiçbir ayrıcalık sağlamaz; hassas
 * anonim uçlar IP kovasında kalır.
 */
export function genelHizSiniriAnahtari(server: FastifyInstance) {
  return (request: FastifyRequest): string => {
    const authorization = request.headers.authorization
    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
      const token = authorization.slice(7).trim()
      if (token) {
        try {
          const payload = server.jwt.verify<{ id?: string | number }>(token)
          if ((typeof payload.id === 'string' && payload.id) ||
              (typeof payload.id === 'number' && Number.isInteger(payload.id) && payload.id > 0)) {
            return `user:${payload.id}`
          }
        } catch {
          /* Geçersiz token IP tabanlı genel sınırı aşmak için kullanılamaz. */
        }
      }
    }
    return `ip:${hizSiniriAnahtari(request)}`
  }
}

/*
 * SPA belge gezinmesi global API kotasindan MUAF. Sebep: 429 yaniti
 * index.html yerine dondugunde tarayicida ham hata ekrani aciliyordu.
 *
 * KAPSAM BILEREK DAR: yalnizca `Accept: text/html` bakmak yetmiyordu.
 * Olculdu -- `/auth/legal-documents` gibi GERCEK bir API rotasi tek bir
 * baslikla kotadan tamamen cikiyordu (x-ratelimit-limit basligi bile
 * yoktu). `Accept` istemcinin yazdigi bir degerdir; tek basina muafiyet
 * olcutu yapilirsa global sinir her GET ucunda bir satirla asilir.
 *
 * Ek sart: yol kayitli bir API onekiyle BASLAMAMALI. Geriye yalnizca
 * SPA'nin kendi gezinme yollari kaliyor -- muaf tutulmak istenen zaten
 * oydu. Yeni bir rota oneki eklenirse bu liste de guncellenmeli.
 */
const API_ONEKLERI = [
  '/admin', '/api', '/auth', '/business', '/community', '/courses',
  '/dashboard', '/documents', '/enrollments', '/flashcards', '/knowledge',
  '/learning-path', '/lessons', '/mentor', '/practical-cards', '/quizzes',
  '/reports', '/support', '/tasks', '/videos', '/workspaces',
  '/integrations', '/marketplace'
] as const

export function spaBelgeIstegiMi(request: FastifyRequest): boolean {
  if (request.method !== 'GET') return false
  const accept = request.headers.accept
  if (typeof accept !== 'string' || !accept.includes('text/html')) return false
  const yol = (request.url || '/').split('?')[0]
  return !API_ONEKLERI.some(onek => yol === onek || yol.startsWith(`${onek}/`))
}

export const GENEL_HIZ_SINIRI = 3000
export const GENEL_HIZ_PENCERESI = '15 minutes'
export const HIZ_SINIRI_MESAJI = 'Çok kısa sürede fazla istek gönderildi. Birkaç saniye sonra tekrar deneyin.'

const UNSAFE_JWT_SECRETS = [
  'secret', 'password', 'changeme', 'jwt_secret',
  'your-secret-key', 'default', '12345678901234567890123456789012',
]

export function validateJwtSecret(): void {
  const secret = process.env.JWT_SECRET

  if (!secret || typeof secret !== 'string') {
    throw new Error(
      'JWT_SECRET environment variable is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }

  if (secret.trim().length === 0) {
    throw new Error(
      'JWT_SECRET must not be empty or whitespace-only. Generate a strong random value.'
    )
  }

  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 bytes (256 bits). Use a strong random value.'
    )
  }

  if (UNSAFE_JWT_SECRETS.includes(secret.toLowerCase().trim())) {
    throw new Error(
      'JWT_SECRET contains an insecure default value. Generate a strong random secret.'
    )
  }
}

async function build() {
  validateJwtSecret()

  const server = Fastify({
    logger: {
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.token', 'body.apiKey', 'body.secret'],
        censor: '[REDACTED]'
      }
    },
    bodyLimit: 1048576,
    trustProxy: resolveTrustProxy()
  })

  const corsOriginRaw = process.env.CORS_ORIGIN || (isProduction ? 'http://localhost:5173' : true)
  const corsOrigin = typeof corsOriginRaw === 'string'
    ? corsOriginRaw.split(',').map(s => s.trim()).filter(Boolean)
    : corsOriginRaw
  console.log('[CORS] raw:', corsOriginRaw, '| parsed:', JSON.stringify(corsOrigin))
  await server.register(cors, { origin: corsOrigin, credentials: true })

  /* Statik dosya kökü. CSP, servis edilen `index.html`i OKUYARAK
     özet çıkardığı için bu tanım politikadan ÖNCE gelmek zorunda. */
  const publicPath = join(__dirname, 'public')
  const hasPublicDir = existsSync(publicPath)

  /*
   * İçerik Güvenliği Politikası.
   *
   * Token `localStorage`'da tutuluyor, yani XSS ile OKUNABİLİR. Erişim
   * jetonunun süresini kısaltmak burada asıl çözüm değil — hırsız
   * yenileme jetonunu da alır. En büyük tek kazanç `script-src`ten
   * `'unsafe-inline'`ı kaldırmaktır ve bu sürüm onu yapıyor.
   *
   * NASIL: `index.html` içindeki tema betiği satır içi kalmak ZORUNDA —
   * boyamadan önce çalışmazsa kullanıcı her açılışta yanlış temanın
   * parlamasını görür. Dış dosyaya taşımak o parlamayı geri getirirdi.
   * Bunun yerine betiğin SHA-256 özeti politikaya yazılıyor.
   *
   * 🔴 ÖZET ELLE YAZILMIYOR, SERVİS EDİLEN DOSYADAN OKUNUYOR.
   * Elle yazılsaydı betik bir gün değiştiğinde özet eskir, tarayıcı
   * betiği engeller ve tema bozulur — üstelik bunu kimse fark etmez,
   * çünkü hata yalnız tarayıcı konsolunda görünür. Dosyadan okumak
   * kaymayı imkânsız kılıyor.
   *
   * `style-src 'unsafe-inline'` KALIYOR ve bu bilinçli: React'in
   * `style` prop'u ve CSS Modules satır içi stil üretiyor. Onu
   * kaldırmak arayüzün büyük kısmını bozar ve XSS açısından kazancı
   * script'e göre çok küçüktür.
   */
  function satirIciBetikOzetleri(): string[] {
    const htmlYolu = join(publicPath, 'index.html')
    if (!existsSync(htmlYolu)) return []
    try {
      const html = readFileSync(htmlYolu, 'utf8')
      const ozetler: string[] = []
      /* Düzenli ifade yerine düz ayrıştırma: satır içi betik aramak
         için gereken kaçış karakterleri okunmayı zorlaştırıyordu. */
      let imlec = 0
      for (;;) {
        const acilis = html.indexOf('<script', imlec)
        if (acilis < 0) break
        const acilisSonu = html.indexOf('>', acilis)
        if (acilisSonu < 0) break
        const etiket = html.slice(acilis, acilisSonu)
        const kapanis = html.indexOf('</script>', acilisSonu)
        if (kapanis < 0) break
        const govde = html.slice(acilisSonu + 1, kapanis)
        imlec = kapanis + 9
        /* Dış dosyayı çeken etiketin gövdesi yok; özet gerekmiyor. */
        if (etiket.includes(' src=')) continue
        if (!govde.trim()) continue
        /* Tarayıcı özeti etiketler ARASINDAKİ metnin tamamı üzerinden
           hesaplıyor; kırpmak özeti tutmaz hâle getirir. */
        ozetler.push(`'sha256-${createHash('sha256').update(govde, 'utf8').digest('base64')}'`)
      }
      return ozetler
    } catch {
      /* Okunamadıysa özet yok: aşağıdaki koşul devreye girip
         `'unsafe-inline'`a düşüyor. Sessizce katı politika yazıp siteyi
         beyaz ekrana düşürmek, biraz gevşek politikadan kötüdür. */
      return []
    }
  }

  const betikOzetleri = satirIciBetikOzetleri()
  /*
   * Satır içi betik VARSA ama özeti çıkarılamadıysa `'unsafe-inline'`a
   * dönülüyor. Bu bir gerileme değil, güvenlik uğruna siteyi kırmama
   * kararı: HTML servis edilmiyorsa (yalnız API dağıtımı, testler)
   * zaten satır içi betik yok ve politika en katı hâlinde kalıyor.
   */
  const htmlServisEdiliyor = hasPublicDir && existsSync(join(publicPath, 'index.html'))
  const scriptSrc = betikOzetleri.length > 0
    ? `script-src 'self' ${betikOzetleri.join(' ')}`
    : htmlServisEdiliyor
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self'"

  if (htmlServisEdiliyor && betikOzetleri.length === 0) {
    server.log.warn(
      { errorCode: 'CSP_INLINE_HASH_MISSING' },
      'index.html satir ici betik ozeti cikarilamadi; script-src unsafe-inline ile calisiyor',
    )
  }

  const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ')

  server.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    reply.header('Content-Security-Policy', CONTENT_SECURITY_POLICY)
    reply.header('Cross-Origin-Opener-Policy', 'same-origin')
    reply.header('Cross-Origin-Resource-Policy', 'same-origin')
    if (isProduction) {
      reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    }
    return payload
  })

  /*
   * Genel hız sınırı.
   *
   * TESTTE YÜKSEK TUTULUYOR — sebebi şu: `app.inject` ile yapılan her istek
   * aynı soket adresinden gelmiş sayılıyor, dolayısıyla 95 test dosyasının
   * tamamı TEK bir kovayı paylaşıyor. Gerçek kullanımda 3000 istek/15 dakika
   * doğrulanmış kullanıcı (aksi halde IP) sınırıyken, testte takımın toplamı oluyor ve
   * eşiği aşınca alakasız testler 429 alıp kırılıyordu.
   *
   * Bu bir zayıflatma değil: rota bazlı sınırlar (giriş 10/dk, şifre
   * sıfırlama 3/saat vb.) testte de aynen geçerli ve testler ONLARI
   * doğruluyor. Global sınırı doğrulayan bir test yok.
   */
  /* JWT önce kaydedilir: genel anahtar geçerli oturumları doğrulayıp aynı
     NAT arkasındaki kullanıcıları birbirinden ayırabilsin. */
  registerJwtPlugin(server)

  await server.register(rateLimit, {
    global: true,
    max: process.env.NODE_ENV === 'test' ? 100_000 : GENEL_HIZ_SINIRI,
    timeWindow: GENEL_HIZ_PENCERESI,
    keyGenerator: genelHizSiniriAnahtari(server),
    /* Bir SPA belge gezinmesi API kotası değildir. Bunu sınırlamak, 429
       yanıtını index.html yerine verip tarayıcıda ham hata ekranı açıyordu. */
    allowList: spaBelgeIstegiMi,
    errorResponseBuilder: (_request, context) => {
      const error = new Error(HIZ_SINIRI_MESAJI) as Error & {
        statusCode: number
        code: string
        retryAfterSeconds: number
      }
      error.statusCode = context.statusCode
      error.code = 'HTTP_RATE_LIMITED'
      error.retryAfterSeconds = Math.max(1, Math.ceil(context.ttl / 1000))
      return error
    }
  })

  /*
   * E-posta yapılandırması açılışta doğrulanır. Üretimde eksikse süreç hiç
   * başlamamalı: şifre sıfırlama sessizce çalışmayan bir özelliğe dönüşürse
   * kullanıcı hesabına erişimini kaybeder ve kimse fark etmez.
   * Geliştirme ve testte bu çağrı hiçbir şey yapmaz.
   */
  mailYapilandirmasiniDogrula()

  if (hasPublicDir) {
    await server.register(fastifyStatic, {
      root: publicPath,
      prefix: '/',
      index: 'index.html'
    })
  }

  server.get('/health', { config: { rateLimit: false } }, async (_request, reply) => {
    try {
      const [publishedCourses, publishedLessons, publishedKnowledgeObjects] = await Promise.all([
        prisma.course.count({ where: { published: true, archivedAt: null } }),
        prisma.lesson.count({ where: { course: { published: true, archivedAt: null } } }),
        prisma.knowledgeObject.count({ where: { status: 'published' } }),
      ])
      return {
        status: 'ok',
        version: RELEASE_INFO.version,
        release: RELEASE_INFO,
        database: {
          provider: RELEASE_INFO.databaseProvider,
          label: 'PostgreSQL + Prisma',
          connected: true,
          schema: 'public',
        },
        curriculum: {
          standard: RELEASE_INFO.curriculumStandard,
          publishedCourses,
          publishedLessons,
          publishedKnowledgeObjects,
        },
        timestamp: new Date().toISOString(),
      }
    } catch {
      return reply.status(503).send({
        status: 'degraded',
        version: RELEASE_INFO.version,
        release: RELEASE_INFO,
        database: {
          provider: RELEASE_INFO.databaseProvider,
          label: 'PostgreSQL + Prisma',
          connected: false,
          schema: 'public',
        },
        timestamp: new Date().toISOString(),
      })
    }
  })

  /*
   * SALT OKUNUR MOD — bütün yazma rotalarının önünde tek kapı.
   *
   * Kök seviyesinde, rota kayıtlarından ÖNCE. Böylece 188 yazma
   * rotasının hepsi otomatik korunuyor ve yarın eklenecek olan da
   * korunuyor — rotalara tek tek koruma eklemek, birini unutmayı
   * kaçınılmaz kılardı.
   *
   * ⚠️ `BILLING_STARTS_AT` null iken hiçbir şey yapmıyor; bugün sevk
   * edilen davranış bu. Gerekçeler `membership-guard.ts` içinde.
   */
  server.addHook('preHandler', uyelikKapisi(server))

  server.register(authRoutes, { prefix: '/auth' })
  server.register(supportRoutes, { prefix: '/support' })
  server.register(accountNotificationRoutes, { prefix: '/account/notifications' })
  server.register(courseRoutes, { prefix: '/courses' })
  server.register(lessonRoutes, { prefix: '/lessons' })
  server.register(enrollmentRoutes, { prefix: '/enrollments' })
  server.register(knowledgeRoutes, { prefix: '/knowledge' })
  server.register(mentorRoutes, { prefix: '/mentor' })
  server.register(conversationRoutes, { prefix: '/mentor/conversations' })
  server.register(learningPathRoutes, { prefix: '/learning-path' })
  server.register(quizRoutes, { prefix: '/quizzes' })
  server.register(taskRoutes, { prefix: '/tasks' })
  server.register(documentRoutes, { prefix: '/documents' })
  server.register(businessRoutes, { prefix: '/business' })
  server.register(workspaceRoutes, { prefix: '/workspaces' })
  server.register(businessTrackerRoutes, { prefix: '/workspaces' })
  server.register(workspaceExportRoutes, { prefix: '/workspaces' })
  server.register(formulaRoutes)
  server.register(adminRoutes, { prefix: '/admin' })
  server.register(reportRoutes, { prefix: '/reports' })
  server.register(knowledgeV2Routes)
  server.register(learnerDashboardRoutes, { prefix: '/dashboard' })
  server.register(pilotDashboardRoutes, { prefix: '/dashboard' })
  server.register(onboardingRoutes)
  server.register(assessmentRoutes)
  server.register(learningRoutes)
  server.register(importRoutes)
  server.register(companionContentRoutes)
  server.register(sourceRoutes)
  server.register(flashcardRoutes, { prefix: '/flashcards' })
  server.register(videoRoutes, { prefix: '/videos' })
  server.register(communityRoutes, { prefix: '/community' })
  server.register(communitySocialRoutes, { prefix: '/community/social' })

  /*
   * GELEN E-POSTA KANALI.
   *
   * `/inbound` öneki BİLEREK ayrı: bu rota JWT taşımıyor, kimlik
   * doğrulaması Cloudflare Worker ile paylaşılan gizli anahtar
   * üzerinden yapılıyor. Kimlik doğrulayan rotalarla aynı önek altına
   * konsaydı, ileride biri "bu önek zaten korumalı" varsayımıyla
   * yanılabilirdi.
   *
   * `INBOUND_MAIL_SECRET` yoksa modül HİÇBİR rota kaydetmiyor.
   */
  server.register(gelenEpostaRotalari, { prefix: '/inbound' })
  server.register(financialModelRoutes)
  server.register(practicalCardRoutes, { prefix: '/practical-cards' })
  /*
   * PAZARYERI ENTEGRASYONLARI.
   *
   * Rotalar workspace-scoped calisir (workspaceId query/body ile);
   * provider'a giden tek trafik manual sync ve arka plan
   * worker'indan gelir. Sayfa acilisi hicbir dis API cagrisi yapmaz.
   */
  server.register(integrationRoutes)
  server.register(decisionCheckRoutes, { prefix: '/api/v1/decision-checks' })
  server.register(feedRoutes, { prefix: '/api/v1/feed' })
  server.register(learningProgressRoutes, { prefix: '/api/v1/learning-progress' })
  server.register(newsRoutes)
  const memoryApiEnabled = process.env.ENABLE_MEMORY_API !== 'false'
  if (memoryApiEnabled) {
    server.register(memoryRoutes, { prefix: '/api/memory' })
  }

  /*
   * SPA yedeği — ama API yollarında DEĞİL.
   *
   * Önceden bilinmeyen HER yol `index.html`'i 200 ile döndürüyordu. Bu,
   * var olmayan bir API uç noktasını hata gibi değil BAŞARI gibi
   * gösteriyor: istemci 200 alıyor, gövdeyi JSON sanıp ayrıştıramıyor ya
   * da sessizce hiçbir şey yapmıyor. Geliştirme sırasında iki kez buna
   * yakalandık — bir kez eksik rota, bir kez de bayat sunucu süreci
   * yüzünden; ikisinde de "çalışıyor ama hiçbir şey olmuyor" görünümü
   * vardı ve sebebi bulmak zaman aldı.
   *
   * Bilinen API ön ekleri artık dürüstçe 404 döner. Geri kalan her yol
   * (SPA rotaları) index.html almaya devam eder.
   */
  const API_PREFIXES = ['/api', '/auth', '/admin', '/courses', '/lessons', '/enrollments',
    '/knowledge', '/learning', '/community', '/business', '/workspaces', '/mentor',
    '/conversations', '/formulas', '/reports', '/quiz', '/flashcards', '/news',
    '/decision-checks', '/health', '/memory', '/feed', '/assessment', '/onboarding',
    '/support', '/integrations', '/marketplace']

  function isApiPath(url: string): boolean {
    const path = url.split('?')[0]
    return API_PREFIXES.some(p => path === p || path.startsWith(p + '/'))
  }

  server.setNotFoundHandler(async (request, reply) => {
    if (isApiPath(request.url)) {
      return reply.status(404).send({ error: 'Route not found', path: request.url.split('?')[0] })
    }
    if (hasPublicDir && process.env.NODE_ENV !== 'test') {
      return reply.sendFile('index.html', publicPath)
    }
    return reply.status(404).send({ error: 'Route not found' })
  })

  server.setErrorHandler((error: Error, request, reply) => {
    const err = error as any
    const statusCode = err.statusCode || 500
    if (statusCode === 429 && err.code === 'HTTP_RATE_LIMITED') {
      request.log.warn({ code: err.code, retryAfterSeconds: err.retryAfterSeconds }, 'HTTP rate limit exceeded')
      const retryAfter = Number(reply.getHeader('retry-after')) || err.retryAfterSeconds
      return reply.status(429).send({
        error: HIZ_SINIRI_MESAJI,
        code: 'RATE_LIMITED',
        retryAfterSeconds: retryAfter
      })
    }
    request.log.error(error)
    const message = isProduction && statusCode === 500
      ? 'Internal server error'
      : error.message ?? 'Internal server error'
    reply.status(statusCode).send({ error: message })
  })

  return server
}

export function parseShutdownTimeout(): number {
  const raw = process.env.SHUTDOWN_TIMEOUT_MS
  if (!raw) return 10000
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1000 || n > 120000) return 10000
  return n
}

export function createShutdownHandler(server: FastifyInstance) {
  const shuttingDown = { current: false }
  return async (signal: string) => {
    if (shuttingDown.current) return
    shuttingDown.current = true

    const timeoutMs = parseShutdownTimeout()
    server.log.info({ signal, timeoutMs }, 'Shutdown initiated')

    const timer = setTimeout(() => {
      server.log.error('Shutdown timeout reached — forcing exit')
      process.exit(1)
    }, timeoutMs)
    timer.unref()

    try {
      await server.close()
      server.log.info({ signal }, 'Server closed gracefully')
      await disconnectPrisma()
      server.log.info('Prisma disconnected')
      process.exit(0)
    } catch (err) {
      server.log.error({ err, signal }, 'Server close failed')
      await disconnectPrisma()
      process.exit(1)
    }
  }
}

export async function start() {
  const server = await build()
  const port = Number.parseInt(process.env.PORT || '3000', 10)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  await ensureFinancialModelCatalog(prisma)
  let stopReminderWorker = () => {}
  let stopNewsWorker = () => {}
  let stopMarketplaceWorker = () => {}
  let stopAccountNotificationWorker = () => {}
  server.addHook('onClose', async () => {
    stopReminderWorker()
    stopNewsWorker()
    stopMarketplaceWorker()
    stopAccountNotificationWorker()
  })
  try {
    await server.listen({ port, host: process.env.HOST || '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }

  stopReminderWorker = startBusinessReminderWorker(undefined, {
    onError: error => server.log.error({ error }, 'Business reminder worker failed')
  })
  /* Üyelik uyarıları. BILLING_STARTS_AT null iken hiçbir şey üretmez;
     ilk satırda kesiliyor. */
  stopAccountNotificationWorker = startAccountNotificationWorker(undefined, {
    onError: error => server.log.error({ error }, 'Account notification worker failed')
  })
  stopNewsWorker = startNewsWorker(undefined, {
    runImmediately: process.env.NEWS_RUN_ON_START === 'true',
    onError: error => server.log.error({ error }, 'Hourly Europe/Istanbul news worker failed')
  })
  stopMarketplaceWorker = startMarketplaceWorker(undefined, {
    onError: error => server.log.error({ error }, 'Marketplace sync worker failed')
  })

  void deleteExpiredReviewerTelemetry().catch(() => {
    server.log.warn(
      { errorCode: 'REVIEWER_METRICS_RETENTION_FAILED' },
      'AI reviewer telemetry retention cleanup failed',
    )
  })

  const handler = createShutdownHandler(server)
  process.on('SIGTERM', handler)
  process.on('SIGINT', handler)
}

export default build
