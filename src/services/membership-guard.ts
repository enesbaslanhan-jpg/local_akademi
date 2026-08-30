import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { BILLING_STARTS_AT, hesaplaUyelikDurumu } from '../config/billing.js'

/*
 * SALT OKUNUR MOD — ücretsiz süresi dolmuş kullanıcı YAZAMAZ.
 *
 * Bugüne kadar süre dolduğunda kullanıcı yalnız bir uyarı görüyordu ve
 * yazmaya devam edebiliyordu. Ücretlendirme açıldığı gün bu, "ödeme
 * yapmayan herkes serbest" demek olurdu.
 *
 * 🔴 TEK KAPI, 188 YAZMA ROTASI.
 * Rotalara tek tek koruma eklemek denenmedi ve eklenmeyecek: 188 rota
 * var ve yenisi her eklendiğinde biri unutulur. Unutulan tek rota
 * bütün zorlamayı işlevsiz kılar. Bu yüzden kök seviyesinde tek bir
 * `preHandler` ve YAZMAYA İZİN VERİLENLERİN açık listesi.
 *
 * 🔴 VARSAYILAN ENGELLE.
 * Liste "engellenecekler" değil "izin verilenler" listesi. Yeni bir
 * yazma rotası eklendiğinde otomatik olarak KORUNUYOR; muafiyet açık
 * bir karar gerektiriyor.
 *
 * ⚠️ KÖK KANCA, EKLENTİ KANCALARINDAN ÖNCE ÇALIŞIR.
 * Yani `fastify.authenticate` henüz çalışmamış ve `request.user` boş.
 * Bu yüzden token doğrudan başlıktan çözülüyor — aynı desen
 * `genelHizSiniriAnahtari` (`index.ts`) içinde de kullanılıyor.
 * Geçersiz token burada 401 ÜRETMEZ: kimlik doğrulama rotanın kendi
 * işi, biz yalnız üyeliğe bakıyoruz.
 */

/** Yanıt gövdesindeki makine tarafından okunabilir kod. */
export const UYELIK_SURESI_DOLDU = 'MEMBERSHIP_EXPIRED'

/*
 * Süre dolmuşken de YAZILABİLEN yollar.
 *
 * Buradaki her madde bir gerekçeye dayanıyor; gerekçesiz ekleme
 * yapılmayacak çünkü her muafiyet zorlamada bir delik demek.
 */
const MUAF_ONEKLER = [
  /*
   * Hesap yönetiminin tamamı. Giriş, çıkış, token yenileme, parola,
   * e-posta doğrulama, onaylar, tercihler, profil ve HESAP SİLME.
   *
   * 🔴 `/auth/refresh` özellikle kritik: engellenirse süresi dolmuş
   * kullanıcı sessizce oturumdan atılır ve ödeme yapacak ekrana bile
   * ulaşamaz.
   *
   * 🔴 `POST /auth/consents` de burada olmak zorunda. Yasal metin
   * sürümü arttığında onay şeridi çıkıyor; onayı engellersek kullanıcı
   * ne onaylayabilir ne de ilerleyebilir — kilitlenir.
   *
   * 🔴 `DELETE /auth/account`: KVKK kapsamında hesabını silme hakkı
   * ödemeye bağlanamaz.
   */
  '/auth',

  /*
   * Rapor ve veri dışa aktarımı. `POST /reports/generate/:fmt` yöntemi
   * gereği yazma görünüyor ama yaptığı iş OKUMA — kullanıcının kendi
   * verisini indirmesi. Salt okunur modun sözü "verilerin görünür ve
   * dışa aktarılabilir kalır"; onu engellemek o sözü bozardı.
   */
  '/reports',

  /*
   * Gelen e-posta kancası. JWT taşımıyor, `request.user` hiç yok;
   * aşağıdaki token kontrolü zaten geçirirdi ama açıkça yazmak
   * niyeti belli ediyor.
   */
  '/inbound',
]

/** Tam eşleşen muaf yollar (önek vermek fazla geniş olurdu). */
const MUAF_YOLLAR = new Set([
  /*
   * Bildirimi okundu işaretleme. Süresi dolduğunu SÖYLEYEN bildirimin
   * kendisi kapatılamazsa kullanıcı onu sonsuza kadar görür.
   */
  '/account/notifications/read',

  /*
   * Destek formu. Kilitlenen kullanıcının tek çıkış kapısı; zaten
   * kimlik doğrulaması istemiyor.
   */
  '/support/contact',

  '/health',
])

const OKUMA_YONTEMLERI = new Set(['GET', 'HEAD', 'OPTIONS'])

interface TokenIcerigi {
  id?: number
  role?: string
}

/** Rota, süresi dolmuş kullanıcıya açık mı. */
export function rotaMuafMi(yol: string | undefined, config: unknown): boolean {
  /* Rotaya özel muafiyet: `config: { uyelikMuaf: true }`. Aynı yerde
     hız sınırı da tanımlanıyor, desen tanıdık. */
  if ((config as { uyelikMuaf?: boolean } | undefined)?.uyelikMuaf === true) return true
  if (!yol) return false
  if (MUAF_YOLLAR.has(yol)) return true
  return MUAF_ONEKLER.some(onek => yol === onek || yol.startsWith(`${onek}/`))
}

/**
 * Kök seviyesinde çalışan üyelik kapısı.
 *
 * `prisma` parametre: test veritabanı ayağa kaldırmadan sahte istemciyle
 * sınanabilsin diye. Aynı saflık kararı `hesaplaUyelikDurumu`da da var.
 */
export function uyelikKapisi(
  server: FastifyInstance,
  prisma: PrismaClient = sharedPrisma,
  /*
   * Ücretlendirme başlangıcı SON parametre ve varsayılanı config'ten.
   *
   * Modül sabitini gövdenin içinden okusaydı bu kanca TEST EDİLEMEZDİ:
   * bugün `BILLING_STARTS_AT` null olduğu için kapı hep kapalı olur,
   * asıl davranış (engelleme) hiç sınanamazdı. Aynı karar
   * `hesaplaUyelikDurumu`da da verildi ve sebebi aynı.
   */
  ucretlendirmeBaslangici: string | null = BILLING_STARTS_AT,
) {
  return async function kapi(request: FastifyRequest, reply: FastifyReply) {
    /*
     * 🔴 ANA ŞALTER. Ücretlendirme başlamadıysa bu kanca hiçbir şey
     * yapmıyor — tek bir karşılaştırma ve çıkış. Bugün sevk edilen
     * davranış bu: kimse engellenmiyor.
     */
    if (!ucretlendirmeBaslangici) return

    if (OKUMA_YONTEMLERI.has(request.method)) return
    if (rotaMuafMi(request.routeOptions?.url, request.routeOptions?.config)) return

    /*
     * Token'ı başlıktan kendimiz çözüyoruz: bu kanca eklenti
     * kancalarından önce çalıştığı için `request.user` henüz boş.
     * Geçersiz ya da eksik token burada SESSİZCE geçiliyor — rotanın
     * kendi kimlik doğrulaması 401 verecek. Burada 401 vermek, herkese
     * açık yazma uçlarını (destek formu gibi) kırardı.
     */
    const authorization = request.headers.authorization
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return
    const token = authorization.slice(7).trim()
    if (!token) return

    let icerik: TokenIcerigi
    try {
      icerik = server.jwt.verify<TokenIcerigi>(token)
    } catch {
      return
    }

    if (!Number.isInteger(icerik.id) || (icerik.id as number) <= 0) return

    /* Yöneticinin kendi üyeliği dolmuş olsa bile yönetim işlerinden
       kilitlenmesi anlamsız olurdu. */
    if (icerik.role === 'admin') return

    /*
     * `createdAt` token'da taşınmıyor, veritabanından okunuyor.
     *
     * Token'a claim olarak koymak bir sorgu tasarruf ederdi ve
     * `createdAt` değişmediği için bayatlamazdı — ama `issueToken`in
     * yedi çağrı yerini değiştirmeyi ve eski token'lar için yedek yol
     * yazmayı gerektirirdi. Birincil anahtar üzerinden tek alanlık bir
     * okuma, yalnız YAZMA isteklerinde ve yalnız ücretlendirme açıkken
     * çalışıyor; bu maliyet kabul edilebilir.
     */
    const kullanici = await prisma.user.findUnique({
      where: { id: icerik.id as number },
      select: { createdAt: true },
    })
    /* Kullanıcı yoksa karar bize ait değil; rotanın kimlik doğrulaması
       zaten 401 verecek. */
    if (!kullanici) return

    const durum = hesaplaUyelikDurumu(kullanici.createdAt, new Date(), ucretlendirmeBaslangici)
    if (durum.state !== 'expired') return

    return reply.status(403).send({
      error: 'Ücretsiz kullanım süreniz doldu. Hesabınız salt okunur modda; '
        + 'verileriniz duruyor ve dışa aktarılabilir. Yeni kayıt eklemek için '
        + 'üyeliğinizi başlatmanız gerekiyor.',
      code: UYELIK_SURESI_DOLDU,
    })
  }
}
