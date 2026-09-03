import { FastifyInstance } from 'fastify'
import { RELEASE_INFO } from '../config/release.js'

/*
 * MOBİL İSTEMCİ YAPILANDIRMASI VE UYGULAMA BAĞLANTI DOSYALARI
 *
 * Üç uç nokta, üç ayrı boşluğu kapatıyor.
 */

/**
 * Desteklenen en düşük mobil sürüm.
 *
 * 🔴 SUNUCU BİR İSTEMCİYE "GÜNCELLE" DİYEMİYORDU.
 *
 * `/health` yalnız arka uç sürümünü veriyordu; `minAppVersion` benzeri hiçbir
 * alan yoktu. Bunun bir zorunluluğa dönüşmesi zamana bağlı: bugün yayımlanan
 * sürüm bu kapıyı BİLMEZSE, yarın eklendiğinde de bilmeyecek. Yani mağazaya
 * ilk çıkıştan ÖNCE var olmak zorunda.
 *
 * Değerler ortam değişkeninden okunuyor ki yeni bir sürüm zorunlu kılınırken
 * kod değişikliği ve yeniden dağıtım gerekmesin.
 */
function minimumSurumler() {
  return {
    android: (process.env.MIN_APP_VERSION_ANDROID || '1.0.0').trim(),
    ios: (process.env.MIN_APP_VERSION_IOS || '1.0.0').trim()
  }
}

/**
 * `/.well-known/assetlinks.json` içeriği.
 *
 * Android App Links doğrulaması bu dosyaya bakıyor; içindeki SHA-256 parmak
 * izi uygulamanın RELEASE İMZASINA ait olmak zorunda.
 *
 * ⚠️ Parmak izi ortam değişkeninde YOKSA dosya HİÇ SUNULMUYOR (404).
 *
 * Bilerek: yer tutucu ya da yanlış parmak izi içeren bir dosya yayımlamak
 * hiç yayımlamamaktan KÖTÜ. Google doğrulama sonucunu önbelleğe alıyor ve
 * yanlış bir dosya, sonradan düzeltilse bile bir süre "doğrulanmadı" olarak
 * kalıyor. 404 ise yalnızca "henüz yok" demek.
 */
function assetlinksIcerigi(): unknown[] | null {
  const parmakIzi = (process.env.ANDROID_CERT_SHA256 || '').trim()
  if (!parmakIzi) return null

  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: (process.env.ANDROID_PACKAGE_NAME || 'com.localkarar.app').trim(),
        sha256_cert_fingerprints: parmakIzi.split(',').map(s => s.trim()).filter(Boolean)
      }
    }
  ]
}

/**
 * `/.well-known/apple-app-site-association` içeriği.
 *
 * iOS Universal Links bu dosyaya bakıyor. `appID` biçimi `TEAMID.BUNDLEID`.
 *
 * ⚠️ Team ID yoksa 404 — gerekçe assetlinks ile aynı, üstelik Apple'ın
 * önbelleği daha uzun ömürlü.
 *
 * Dosya `Content-Type: application/json` ile ve YÖNLENDİRMESİZ sunulmalı;
 * Apple yönlendirilen bir yanıtı kabul etmiyor.
 */
function aasaIcerigi(): unknown | null {
  const teamId = (process.env.APPLE_TEAM_ID || '').trim()
  if (!teamId) return null

  const bundleId = (process.env.APPLE_BUNDLE_ID || 'com.localkarar.app').trim()
  const appId = `${teamId}.${bundleId}`

  return {
    applinks: {
      apps: [],
      details: [
        {
          appID: appId,
          // Mobil derin bağlantı ayrıştırıcısı yalnız /app/ önekini kabul
          // ediyor (DeepLinkParser). Buradaki desen onunla AYNI olmalı;
          // geniş tutulursa iOS her adresi uygulamaya yönlendirir ve
          // uygulama da onu reddedip kullanıcıyı ana ekrana atardı.
          paths: ['/app/*']
        }
      ]
    }
  }
}

export async function appConfigRoutes(fastify: FastifyInstance) {
  /**
   * GET /app-config — mobil istemcinin açılışta okuduğu yapılandırma.
   *
   * `/health` bunun yerine kullanılamaz: o uç çağrı başına üç `COUNT(*)`
   * sorgusu yapıyor, yani düzenli yoklama hedefi olarak uygun değil.
   */
  fastify.get('/app-config', { config: { rateLimit: false } }, async () => {
    const minimum = minimumSurumler()
    return {
      minAppVersion: minimum,
      storeUrls: {
        android: (process.env.STORE_URL_ANDROID || '').trim() || null,
        ios: (process.env.STORE_URL_IOS || '').trim() || null
      },
      // Bakım kipi: mobil istemci sunucunun geçici olarak kapalı olduğunu
      // istek başına 503 toplamadan öğrenebilsin.
      maintenance: (process.env.MAINTENANCE_MODE || '').trim().toLowerCase() === 'true',
      apiVersion: RELEASE_INFO.version
    }
  })

  /*
   * ⚠️ AŞAĞIDAKİ İKİ ROTA AÇIKÇA KAYDEDİLMEK ZORUNDA.
   *
   * `/.well-known/...` API önekleri listesinde (API_ONEKLERI) YOK. Kayıtsız
   * bir yol SPA yedeğine düşüyor ve **200 + HTML** dönüyor. Apple ve Google
   * o yanıtı JSON sanmıyor, sessizce doğrulamayı bırakıyorlardı — hata da
   * hiçbir yere yazılmıyordu.
   *
   * Bu, projede daha önce ölçülmüş bir arızanın aynısı: "başarılı yanıt,
   * doğru yanıt demek değil."
   */
  fastify.get('/.well-known/assetlinks.json', { config: { rateLimit: false } }, async (_request, reply) => {
    const icerik = assetlinksIcerigi()
    if (!icerik) {
      return reply.status(404).type('application/json').send({ error: 'Not configured' })
    }
    return reply.type('application/json').send(icerik)
  })

  fastify.get('/.well-known/apple-app-site-association', { config: { rateLimit: false } }, async (_request, reply) => {
    const icerik = aasaIcerigi()
    if (!icerik) {
      return reply.status(404).type('application/json').send({ error: 'Not configured' })
    }
    // Apple bu dosyayı uzantısız istiyor ve içerik türü application/json olmalı.
    return reply.type('application/json').send(icerik)
  })
}
