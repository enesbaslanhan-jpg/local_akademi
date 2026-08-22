import { createHmac, timingSafeEqual } from 'crypto'

/*
 * İMZALI MEDYA BAĞLANTISI — tek kaynak.
 *
 * NEDEN AYRI DOSYA: topluluk gönderileri (`community.ts`) ve artık
 * reklamlar (`community-social.ts`) aynı imzalı adrese ihtiyaç
 * duyuyor. İkinci bir kopya, imza mantığının iki yerde yaşaması
 * demekti — biri düzeltilip diğeri unutulunca doğrulama ile üretim
 * ayrışır ve TÜM görseller sessizce kırılır.
 *
 * NEDEN İMZA VAR: topluluk giriş duvarının arkasında ama medya rotası
 * kimlik doğrulayamıyor — `<img src>` ve `<video src>` Authorization
 * başlığı taşıyamaz. Sonuç, gönderi METNİ duvarın arkasında, fotoğraf
 * ve video dışında kalıyordu.
 *
 * ÇEREZ İLE ÇÖZÜLMEDİ: uygulama hiç çerez kullanmıyor ve
 * `StorageNotice` bunu kullanıcıya YAZILI olarak taahhüt ediyor. Tek
 * bir medya çerezi o cümleyi yalanlar ve çerez politikası metnini
 * değiştirmeyi gerektirirdi.
 *
 * DÜRÜST SINIR: bu, sızan bir bağlantıyı imkânsız kılmaz, ÖMRÜNÜ
 * sınırlar. "Sonsuza kadar açık" yerine "en fazla 12 saat".
 */

/*
 * Süre neden 12 saat: sekmesini açık bırakan kullanıcının görselleri
 * elinde patlamamalı. Daha kısası kullanıcıyı bozuk görsele, daha
 * uzunu sızan bağlantıyı uzun ömürlü yapardı.
 */
const OMUR_SANIYE = 12 * 60 * 60

/*
 * `JWT_SECRET` DOĞRUDAN kullanılmıyor: aynı gizli anahtarı iki farklı
 * amaca koşmak, birinde bulunan zayıflığı diğerine taşır. Ondan
 * türetilmiş ayrı bir anahtar kullanılıyor.
 */
function medyaAnahtari(): Buffer {
  const temel = process.env.JWT_SECRET || ''
  return createHmac('sha256', temel).update('community-media-url-v1').digest()
}

function medyaImzasi(mediaId: string, bitis: number): string {
  return createHmac('sha256', medyaAnahtari())
    .update(`${mediaId}.${bitis}`)
    .digest('hex')
}

export function imzaliMedyaUrl(mediaId: string): string {
  const bitis = Math.floor(Date.now() / 1000) + OMUR_SANIYE
  return `/community/media/${mediaId}?e=${bitis}&s=${medyaImzasi(mediaId, bitis)}`
}

export type ImzaSonucu = 'gecerli' | 'suresi-doldu' | 'gecersiz'

export function imzayiDogrula(mediaId: string, e?: string, imza?: string): ImzaSonucu {
  if (!e || !imza) return 'gecersiz'
  const bitis = Number.parseInt(e, 10)
  if (!Number.isFinite(bitis)) return 'gecersiz'

  const beklenen = Buffer.from(medyaImzasi(mediaId, bitis), 'utf8')
  const gelen = Buffer.from(imza, 'utf8')
  /* Uzunluk eşit değilse `timingSafeEqual` FIRLATIR; önce o kontrol. */
  if (beklenen.length !== gelen.length) return 'gecersiz'
  if (!timingSafeEqual(beklenen, gelen)) return 'gecersiz'

  /*
   * İmza geçerli ama vakti geçmiş: bağlantı bir zamanlar meşruydu.
   * Bunu "bulunamadı" ile karıştırmamak arayüze akışı tazeleme
   * fırsatı veriyor.
   */
  return bitis * 1000 > Date.now() ? 'gecerli' : 'suresi-doldu'
}

/**
 * Medyayı istemciye verirken imzalı adresi de ekler.
 *
 * Tek yerden geçmesi önemli: bir listede unutulursa orada görseller
 * kırılır ve bu ancak o listeye bakan biri fark edince anlaşılır.
 */
export function medyaCikti<T extends { id: string } | null | undefined>(media: T) {
  return media ? { ...media, url: imzaliMedyaUrl(media.id) } : media
}
