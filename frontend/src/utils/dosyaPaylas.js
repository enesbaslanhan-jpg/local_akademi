/*
 * DOSYA PAYLAŞMA — cihazın kendi paylaşım menüsü, üçüncü taraf yok.
 *
 * NEDEN ÜÇÜNCÜ TARAF YOK: WhatsApp/e-posta düğmeleri için hazır SDK'lar
 * var ama her biri bir izleme yüzeyi açar ve `StorageNotice`'taki
 * "hiçbir üçüncü taraf izleme aracı çalıştırmıyoruz" taahhüdünü
 * yalanlar. `navigator.share` işletim sisteminin kendi menüsü; hiçbir
 * şey bize ya da başkasına rapor edilmiyor.
 *
 * ÜÇ KADEMELİ YEDEK, sırasıyla:
 *   1. Paylaşım menüsü (telefonlar, bazı masaüstü tarayıcılar)
 *   2. İndirme (masaüstünde olağan durum)
 *   3. Kullanıcı menüyü kapatırsa SESSİZ ÇIKIŞ
 *
 * 🔴 3. madde önemli: `navigator.share` kullanıcı vazgeçince
 * `AbortError` fırlatır. Bunu hata saymak, kullanıcının kendi
 * kararına "başarısız oldu" demek olurdu.
 */

/*
 * 🔴 DOSYA PAYLAŞIMI PRATİKTE BİR MOBİL ÖZELLİĞİ.
 *
 * Ölçüldü (23.08.2026): masaüstü tarayıcılarda `navigator.share` ya hiç
 * yok ya da dosya kabul etmiyor. Ürün sahibi masaüstünde paylaş
 * düğmesine bastı ve her seferinde "paylaşım menüsü yok, indirildi"
 * uyarısı aldı.
 *
 * Yapamayacağı şeyi vaat eden bir düğme, hiç olmayan düğmeden kötüdür:
 * kullanıcı her basışında bir özür okuyor. Bu yüzden `paylasabilirMi`
 * DIŞA AÇILIYOR ve arayüz düğmeyi ancak gerçekten çalışacaksa
 * çiziyor -- telefonda görünür, masaüstünde görünmez. İndirme düğmesi
 * zaten yanında duruyor.
 */

/**
 * Bu ortam dosya paylaşımını destekliyor mu.
 *
 * Örnek bir PDF ile sorulur: `navigator.canShare` türe göre karar
 * verebiliyor, bu yüzden "share var mı" diye sormak yetmiyor.
 */
export function paylasabilirMi() {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false
  try {
    const ornek = new File([new Blob([''], { type: 'application/pdf' })], 'o.pdf', { type: 'application/pdf' })
    return navigator.canShare({ files: [ornek] })
  } catch {
    return false
  }
}

/** Paylaşım menüsü BU dosyayı kabul ediyor mu. */
function paylasilabilirMi(dosya) {
  return Boolean(
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [dosya] })
  )
}

function indir(dosya) {
  const url = URL.createObjectURL(dosya)
  const link = document.createElement('a')
  link.href = url
  link.download = dosya.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  /*
   * Blob adresi HEMEN serbest bırakılmıyor. Tıklamanın hemen ardından
   * `revokeObjectURL` çağırmak bazı tarayıcılarda indirmeyi yarıda
   * kesiyor; tarayıcının dosyayı okumasına zaman tanınıyor.
   */
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Dosyayı paylaşım menüsüne verir; menü yoksa indirir.
 *
 * @returns {Promise<'paylasildi'|'indirildi'|'iptal'>}
 */
export async function dosyaPaylas(dosya, { baslik, metin } = {}) {
  if (paylasilabilirMi(dosya)) {
    try {
      await navigator.share({ files: [dosya], title: baslik, text: metin })
      return 'paylasildi'
    } catch (hata) {
      /* Kullanıcı vazgeçti: hata değil. */
      if (hata?.name === 'AbortError') return 'iptal'
      /* Menü açıldı ama başarısız oldu -- indirmeye düş, kullanıcı
         elindeki dosyayı yine de alsın. */
      indir(dosya)
      return 'indirildi'
    }
  }

  indir(dosya)
  return 'indirildi'
}

export { indir as dosyaIndir }
