import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sendMail } from './mailer.js'
import { destekTalebiMaili } from './mail-templates.js'

/*
 * İletişim formu.
 *
 * ÜÇ KARAR ve gerekçeleri:
 *
 * 1. MESAJ VERİTABANINA YAZILMIYOR, yalnız e-postayla iletiliyor.
 *    Saklanan her kayıt bir saklama/imha yükümlülüğü doğurur ve serbest
 *    metin kutusuna ne yazılacağı kestirilemez — kullanıcı oraya kimlik
 *    numarası da yazabilir, sağlık bilgisi de. Postayla iletmek aynı işi
 *    görüyor ve arkasında veri bırakmıyor.
 *
 * 2. GÖNDERİM BAŞARISIZSA HATA DÖNÜYOR, sessizce yutulmuyor. Aynı karar
 *    davet akışında da verilmişti (`workspace.ts`): posta gitmezse kayıt
 *    geri alınıp hata dönüyor. "Mesajınız iletildi" deyip iletmemek,
 *    kullanıcının cevap beklemesine ve talebinin kaybolmasına yol açar.
 *
 * 3. ÜÇÜNCÜ TARAF CAPTCHA YOK. Yeni bir yurt dışı aktarım kalemi ve yeni
 *    bir izleme yüzeyi açardı; aydınlatma metnini ve çerez politikasını
 *    da değiştirirdi. Yerine bal küpü alanı + hız sınırı kullanılıyor.
 *
 * Uç nokta giriş İSTEMİYOR: hesabına erişemeyen kullanıcı da yazabilmeli
 * (zaten en sık destek sebebi budur). Giriş yapılmışsa hesap bilgisi
 * mesaja ekleniyor.
 */

const iletisimSemasi = z.object({
  ad: z.string().trim().min(2).max(100),
  eposta: z.string().trim().toLowerCase().email().max(254),
  konu: z.string().trim().min(3).max(150),
  mesaj: z.string().trim().min(20).max(5000),
  /*
   * BAL KÜPÜ. Arayüzde gizli, gerçek kullanıcı görmez ve dolduramaz.
   * Formu otomatik dolduran botlar her alanı doldurur; dolu gelirse
   * istek sessizce başarılı sayılıp atılıyor — bota "yakalandın"
   * demiyoruz, yoksa bir sonraki denemede bu alanı atlar.
   */
  website: z.string().max(200).optional()
})

export async function supportRoutes(fastify: FastifyInstance) {
  fastify.post('/contact', {
    /*
     * Giriş gerektirmeyen ve e-posta gönderen bir uç nokta; sınır şart.
     * Saatte 5, uygulamanın diğer e-posta uçlarıyla aynı mertebede.
     */
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const parsed = iletisimSemasi.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Form eksik veya hatalı',
        details: parsed.error.flatten().fieldErrors
      })
    }

    const { ad, eposta, konu, mesaj, website } = parsed.data

    if (website && website.trim() !== '') {
      request.log.info({ event: 'DESTEK_BAL_KUPU' }, 'iletisim formu bal kupune takildi')
      return reply.send({ success: true })
    }

    const alici = process.env.SUPPORT_MAIL_TO?.trim()
    if (!alici) {
      /*
       * Yapılandırma eksikse kullanıcıya "gönderildi" DENMİYOR. Aksi
       * hâlde mesaj hiçbir yere gitmezken kullanıcı cevap bekler.
       */
      request.log.error('SUPPORT_MAIL_TO tanımlı değil — iletişim formu çalışamaz')
      return reply.status(503).send({
        error: 'İletişim formu şu anda kullanılamıyor. Lütfen kvkk@localkarar.com adresine yazın.'
      })
    }

    /* Giriş yapılmışsa hesabı da bildir; destek tarafında en çok bu lazım. */
    let hesapBilgisi = 'Giriş yapılmamış'
    try {
      await request.jwtVerify()
      const kullanici = (request as any).user
      if (kullanici?.email) hesapBilgisi = `#${kullanici.id} · ${kullanici.email}`
    } catch {
      /* Token yok ya da geçersiz; form yine de gönderilebilir. */
    }

    try {
      await sendMail(destekTalebiMaili(alici, ad, eposta, konu, mesaj, hesapBilgisi))
    } catch (err) {
      request.log.error({ err }, 'destek talebi e-postası gönderilemedi')
      return reply.status(502).send({
        error: 'Mesajınız şu anda iletilemedi. Lütfen biraz sonra tekrar deneyin veya kvkk@localkarar.com adresine yazın.'
      })
    }

    return reply.send({ success: true })
  })
}
