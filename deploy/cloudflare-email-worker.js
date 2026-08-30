/*
 * LOCALKARAR — GELEN E-POSTA WORKER'I
 *
 * Cloudflare panelinde: localkarar.com → E-posta Yönlendirmesi →
 * Varış Çalışanları → İşçi Yarat. Bu dosyanın tamamını oraya yapıştır.
 *
 * NE YAPIYOR: çalışma alanı gelen kutusuna gelen postayı alır,
 * DKIM/SPF sonucunu okur, ekleri çıkarır ve uygulamaya iletir.
 *
 * 🔴 ADRESLER ALAN ADININ KENDİSİNDE: `<isletme-slug>-<4hane>@localkarar.com`
 * (örn. `olcum-isletmesi-a7k3@localkarar.com`).
 *
 * Bu dosya bir zamanlar `fatura-*@inbox.localkarar.com` diyordu ve
 * YANLIŞTI: alt alan adı denendi, Cloudflare Email Routing alt
 * alanlarda ÇALIŞMIYOR — yalnız alan adının kendisinde dinliyor.
 * Sunucu da adresi `APP_PUBLIC_URL`den türetiyor
 * (`gelenKutusuAlanAdi()`, `src/services/gelen-eposta.ts`); ikisi
 * ayrışırsa posta hiçbir kutuya düşmez.
 *
 * ⚠️ BUNUN YÖNLENDİRME KURALLARINA ETKİSİ — atlanırsa insan postası
 * kaybolur:
 *
 * Gelen kutuları `kvkk@` ve `destek@` ile AYNI alan adını paylaşıyor.
 * Cloudflare özel adres kurallarını catch-all'dan ÖNCE değerlendirdiği
 * için sıra şöyle kurulmalı:
 *
 *   1. Özel adresler → posta kutusuna ilet:  kvkk@, destek@
 *   2. Catch-all     → bu Worker
 *
 * Catch-all'ı Worker'a bağlamak, YANLIŞ YAZILMIŞ her adresi de
 * (`destk@`, `info@`, `admin@`) buraya düşürür. Worker o anahtara ait
 * çalışma alanı bulamaz ve postayı SESSİZCE atar — gönderene geri
 * sekme gitmez. Yani insanlara duyurulan her adres 1. maddeye tek tek
 * yazılmalı; listede olmayan adrese yazan kimse cevap alamaz ve
 * yazdığının ulaşmadığını da öğrenemez.
 *
 * NE YAPMIYOR — ve bu bilinçli:
 *   - KABUL/RED KARARINI VERMİYOR. Gönderenin üye olup olmadığını,
 *     kutunun var olup olmadığını sunucu karara bağlıyor. Worker
 *     yalnızca taşıyıcı; kural iki yerde yaşarsa ayrışır.
 *   - Postayı SAKLAMIYOR. Ne Cloudflare'da ne başka bir yerde kopya
 *     kalıyor; içerik doğrudan sunucuya gidiyor.
 *
 * GEREKEN İKİ GİZLİ DEĞİŞKEN (Worker → Settings → Variables,
 * "Encrypt" işaretli):
 *   INBOUND_SECRET  — sunucudaki `INBOUND_MAIL_SECRET` ile AYNI değer
 *   API_URL         — https://localkarar.com
 */

/* Tek postada kabul edilen en fazla ek ve toplam boyut.
   Sunucu da kendi sınırlarını uyguluyor; bu, gereksiz trafiği
   Cloudflare tarafında kesiyor. */
const EN_FAZLA_EK = 10
const EN_FAZLA_TOPLAM_BAYT = 12 * 1024 * 1024

/*
 * `Authentication-Results` başlığından DKIM/SPF sonucunu okur.
 *
 * Cloudflare bu başlığı gelen postaya kendisi ekliyor ve içinde
 * `dkim=pass` / `spf=fail` gibi ifadeler bulunuyor.
 *
 * ⚠️ Başlık YOKSA sonuç `none` -- `pass` VARSAYILMIYOR. Eksik bilgiyi
 * olumlu saymak, kimlik doğrulaması olmayan postayı doğrulanmış gibi
 * geçirmek olurdu.
 */
function kimlikSonucu(basliklar, tur) {
  const ham = basliklar.get('authentication-results') || ''
  const eslesme = ham.match(new RegExp(`${tur}=(pass|fail|softfail|neutral|none|permerror|temperror)`, 'i'))
  if (!eslesme) return 'none'
  const deger = eslesme[1].toLowerCase()
  if (deger === 'pass') return 'pass'
  if (deger === 'none') return 'none'
  /* softfail, neutral, permerror... hepsi "geçmedi" sayılıyor. */
  return 'fail'
}

/** `olcum-isletmesi-a7k3@localkarar.com` → `olcum-isletmesi-a7k3` */
function kutuAnahtari(adres) {
  return String(adres || '').split('@')[0].trim().toLowerCase()
}

function baytlariBase64(baytlar) {
  let ikili = ''
  const parca = 0x8000
  for (let i = 0; i < baytlar.length; i += parca) {
    ikili += String.fromCharCode.apply(null, baytlar.subarray(i, i + parca))
  }
  return btoa(ikili)
}

/*
 * Ham postadan ekleri çıkarır.
 *
 * Cloudflare Email Workers ham RFC822 akışı veriyor; MIME ayrıştırması
 * bize kalıyor. Burada YALNIZ base64 kodlu ekler destekleniyor --
 * e-Fatura XML'i ve PDF'ler her zaman böyle gönderiliyor.
 *
 * ⚠️ Bu ayrıştırıcı bilerek DAR: her MIME biçimini desteklemeye
 * çalışmak, Worker içinde bakımı zor bir kütüphane yazmak demekti.
 * Tanınmayan ek sessizce atlanıyor; sunucu zaten sıfır ekli postayı
 * işlemiyor.
 */
function ekleriCikar(hamMetin) {
  const ekler = []
  const sinirEslesme = hamMetin.match(/boundary="?([^"\r\n;]+)"?/i)
  if (!sinirEslesme) return ekler

  const parcalar = hamMetin.split(`--${sinirEslesme[1]}`)
  let toplam = 0

  for (const parca of parcalar) {
    if (ekler.length >= EN_FAZLA_EK) break
    if (!/content-disposition:\s*attachment/i.test(parca)) continue
    if (!/content-transfer-encoding:\s*base64/i.test(parca)) continue

    const ad = parca.match(/filename="?([^"\r\n;]+)"?/i)
    const tur = parca.match(/content-type:\s*([^;\r\n]+)/i)
    if (!ad) continue

    /* Başlıklar ile gövde arasındaki boş satır. */
    const ayrac = parca.indexOf('\r\n\r\n')
    if (ayrac === -1) continue
    const govde = parca.slice(ayrac + 4).replace(/[\r\n]/g, '').trim()
    if (!govde) continue

    /* base64'ün çözülmüş boyutu ~ 3/4 */
    toplam += Math.floor(govde.length * 0.75)
    if (toplam > EN_FAZLA_TOPLAM_BAYT) break

    ekler.push({
      filename: ad[1].trim(),
      mimeType: (tur ? tur[1] : 'application/octet-stream').trim(),
      content: govde
    })
  }
  return ekler
}

export default {
  async email(message, env) {
    /*
     * 🔴 HER DURUMDA SESSİZ ÇIKIŞ.
     *
     * Hiçbir yolda `message.setReject()` çağrılmıyor. Reddetmek
     * gönderene geri sekme (bounce) üretir ve "bu adres var / yok"
     * bilgisini sızdırır -- adres deneyerek çalışma alanı keşfetmeyi
     * mümkün kılardı. Karar sunucunun günlüğünde.
     */
    try {
      if (!env.INBOUND_SECRET || !env.API_URL) return

      const ham = await new Response(message.raw).text()

      const yuk = {
        inboxKey: kutuAnahtari(message.to),
        from: String(message.from || '').trim().toLowerCase(),
        subject: (message.headers.get('subject') || '').slice(0, 500),
        dkim: kimlikSonucu(message.headers, 'dkim'),
        spf: kimlikSonucu(message.headers, 'spf'),
        ekler: ekleriCikar(ham)
      }

      /* Eksiz posta sunucuya HİÇ gitmiyor: işlenecek bir şey yok ve
         gereksiz istek, hız sınırından yer yer. */
      if (yuk.ekler.length === 0) return

      await fetch(`${env.API_URL}/inbound/email`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-inbound-secret': env.INBOUND_SECRET
        },
        body: JSON.stringify(yuk)
      })
    } catch (hata) {
      /* Worker'ın çökmesi de sessiz kalmalı; gönderene bilgi gitmesin.
         Cloudflare kendi günlüğüne yazıyor. */
      console.error('gelen posta işlenemedi', hata && hata.message)
    }
  }
}
