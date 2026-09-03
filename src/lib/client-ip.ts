/**
 * Gerçek istemci adresinin tek kaynağı.
 *
 * Bu iki işlev `index.ts` içindeydi. Oradan çıkarıldılar çünkü `auth.ts` de
 * (başarısız giriş denetim kaydı için) gerçek istemci adresine ihtiyaç duyuyor
 * ve `index.ts` zaten `auth.ts`'i içe aktarıyor — aradaki bağ dairesel olurdu.
 *
 * Gerekçeler değişmedi, aşağıda korunuyor.
 */

/**
 * `TRUST_PROXY` çözümlemesi.
 *
 *   (boş) / false        → hiçbir vekile güvenilmez [varsayılan, güvenli]
 *   1, 2, ...            → o kadar sıçrama geriye bakılır
 *   10.0.0.1, 10.0.0.0/8 → yalnız bu adreslere güvenilir
 *   true                 → her kaynağa güvenilir  [sınırlar aşılabilir]
 */
export function resolveTrustProxy(): boolean | number | string[] {
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
 * Hız sınırlarının ve denetim kayıtlarının kime ait olduğunu belirleyen adres.
 *
 * SORUN: Cloudflare arkasında `request.ip` GERÇEK KULLANICI DEĞİL,
 * Cloudflare'ın o isteği taşıyan kenar sunucusu oluyordu. Ölçüldü
 * (22.08.2026) — aynı istemciden iki istek, iki farklı adres:
 *
 *     "remoteAddress":"172.71.164.99"
 *     "remoteAddress":"104.23.239.60"
 *
 * Kenar sunucusu istekten isteğe değiştiği için sınır kovaları dağılıyordu:
 * sahte `X-Forwarded-For` ile 8/8 istek geçiyor, sahtesiz denemede bile
 * `200 200 429 429 200 200` gibi düzensiz bir sonuç çıkıyordu. Yani giriş,
 * kayıt ve şifre sıfırlama sınırları fiilen çalışmıyordu.
 *
 * NEDEN SIÇRAMA SAYISI DEĞİL: `TRUST_PROXY` zaten `2` idi ve yetmedi. Hop
 * sayarak doğru adrese ulaşmak, zincirdeki her değişiklikte (bir vekil
 * eklenmesi, Cloudflare'ın başlığı farklı yazması) sessizce bozulan kırılgan
 * bir yöntem. `CF-Connecting-IP` ise Cloudflare'ın gerçek istemci için yazdığı
 * TEK ve kesin değer.
 *
 * GÜVENLİK: bu başlık yalnız bir ters vekil arkasındayken (`TRUST_PROXY`
 * tanımlıyken) dikkate alınıyor. Sunucuya doğrudan ulaşabilen biri onu
 * uydurabilirdi; ulaşamıyor, çünkü güvenlik duvarı 80/443'ü yalnız Cloudflare
 * aralıklarına açıyor ve uygulama portu yalnız makine içine bağlı. İki katman.
 */
export function hizSiniriAnahtari(request: { ip: string; headers: Record<string, unknown> }): string {
  if (resolveTrustProxy() !== false) {
    const baslik = request.headers['cf-connecting-ip']
    const deger = Array.isArray(baslik) ? baslik[0] : baslik
    if (typeof deger === 'string' && deger.trim()) return deger.trim()
  }
  return request.ip
}
