import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

/*
 * MOBİL YAPILANDIRMA VE UYGULAMA BAĞLANTI DOSYALARI.
 *
 * 🔴 Bu testlerin en önemlisi `.well-known` yollarının HTML DÖNMEMESİ.
 *
 * O yollar API önekleri listesinde (API_ONEKLERI) yok. Açıkça
 * kaydedilmezlerse SPA yedeğine düşüyor ve **200 + HTML** dönüyorlar. Apple ve
 * Google o yanıtı JSON sanmıyor, doğrulamayı sessizce bırakıyor ve hata
 * hiçbir yere yazılmıyor — yani App Links ve Universal Links çalışmıyor ama
 * sunucu tarafında her şey "başarılı" görünüyor.
 *
 * Projede daha önce ölçülmüş bir arızanın aynısı: başarılı yanıt, doğru yanıt
 * demek değil.
 */

let app: FastifyInstance

beforeAll(async () => {
  process.env.JWT_SECRET = 'app-config-test-secret-key-min-32-bytes'
  process.env.NODE_ENV = 'test'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe('GET /app-config', () => {
  it('minimum sürüm ve mağaza adreslerini döner', async () => {
    const yanit = await app.inject({ method: 'GET', url: '/app-config' })

    expect(yanit.statusCode).toBe(200)
    const govde = yanit.json()
    expect(govde.minAppVersion).toBeDefined()
    expect(typeof govde.minAppVersion.android).toBe('string')
    expect(typeof govde.minAppVersion.ios).toBe('string')
    expect(govde).toHaveProperty('storeUrls')
    expect(govde).toHaveProperty('maintenance')
  })

  it('kimlik doğrulaması istemiyor', async () => {
    // Zorunlu güncelleme kapısı, oturum açamayan bir istemcinin de
    // okuyabilmesi gereken tek şey.
    const yanit = await app.inject({ method: 'GET', url: '/app-config' })
    expect(yanit.statusCode).toBe(200)
  })
})

describe('.well-known dosyaları', () => {
  /*
   * ⚠️ BU İKİ TESTİN İLK HALİ GEÇERSİZDİ.
   *
   * Yalnızca "404 + application/json" bakıyorlardı. Diş kontrolü yapıldığında
   * (rota kaydı `src/index.ts`ten kaldırıldı) DÖRT test düştü ama bu ikisi
   * GEÇMEYE DEVAM ETTİ — çünkü kayıtsız bir yol için genel notFound işleyicisi
   * de `404 { error: 'Route not found' }` dönüyor, o da JSON.
   *
   * Yani testler, korumayı iddia ettikleri şeyi ölçmüyorlardı. Artık GÖVDEYE
   * bakılıyor: `Not configured` bizim rotamızdan, `Route not found` genel
   * yedekten gelir. İkisi ayrışmazsa rota silindiğinde kimse fark etmez.
   */
  it('assetlinks yapılandırılmamışsa BİZİM rotamızdan JSON 404 döner', async () => {
    delete process.env.ANDROID_CERT_SHA256

    const yanit = await app.inject({ method: 'GET', url: '/.well-known/assetlinks.json' })

    expect(yanit.statusCode).toBe(404)
    expect(yanit.headers['content-type']).toContain('application/json')
    // 🔴 Asıl ölçülen şey: yanıt genel notFound yedeğinden DEĞİL.
    expect(yanit.json().error).toBe('Not configured')
  })

  it('AASA yapılandırılmamışsa BİZİM rotamızdan JSON 404 döner', async () => {
    delete process.env.APPLE_TEAM_ID

    const yanit = await app.inject({ method: 'GET', url: '/.well-known/apple-app-site-association' })

    expect(yanit.statusCode).toBe(404)
    expect(yanit.headers['content-type']).toContain('application/json')
    expect(yanit.json().error).toBe('Not configured')
  })

  it('parmak izi verildiğinde geçerli assetlinks üretir', async () => {
    process.env.ANDROID_CERT_SHA256 = 'AA:BB:CC:DD'
    process.env.ANDROID_PACKAGE_NAME = 'com.localkarar.app'

    const yanit = await app.inject({ method: 'GET', url: '/.well-known/assetlinks.json' })

    expect(yanit.statusCode).toBe(200)
    expect(yanit.headers['content-type']).toContain('application/json')
    const govde = yanit.json()
    expect(Array.isArray(govde)).toBe(true)
    expect(govde[0].target.package_name).toBe('com.localkarar.app')
    expect(govde[0].target.sha256_cert_fingerprints).toContain('AA:BB:CC:DD')
    expect(govde[0].relation).toContain('delegate_permission/common.handle_all_urls')

    delete process.env.ANDROID_CERT_SHA256
  })

  it('Team ID verildiğinde AASA yolu mobil ayrıştırıcıyla aynı öneki kullanır', async () => {
    process.env.APPLE_TEAM_ID = 'ABCDE12345'
    process.env.APPLE_BUNDLE_ID = 'com.localkarar.app'

    const yanit = await app.inject({ method: 'GET', url: '/.well-known/apple-app-site-association' })

    expect(yanit.statusCode).toBe(200)
    const detay = yanit.json().applinks.details[0]
    expect(detay.appID).toBe('ABCDE12345.com.localkarar.app')
    /*
     * Desen mobil DeepLinkParser ile AYNI olmak zorunda: o ayrıştırıcı yalnız
     * `/app/` önekini kabul ediyor. Burada daha geniş bir desen verilirse iOS
     * her adresi uygulamaya yönlendirir, uygulama da reddedip kullanıcıyı ana
     * ekrana atar — tıklanan bağlantı sessizce kaybolur.
     */
    expect(detay.paths).toEqual(['/app/*'])

    delete process.env.APPLE_TEAM_ID
  })
})
