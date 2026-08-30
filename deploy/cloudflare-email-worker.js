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
/*
 * Postadaki BÜTÜN sınırlar toplanıyor.
 *
 * 🔴 Önceki sürüm yalnız İLK `boundary=` değerini alıyordu. Gmail ve
 * iCloud `multipart/mixed` içine `multipart/alternative` gömüyor; ilk
 * değer çoğu zaman İÇ sınır oluyor ve eki taşıyan dış parça hiç
 * ayrılamıyordu. Ölçüldü (31.08.2026): ekli üç posta arka arkaya
 * "eksiz" sayılıp sessizce atıldı.
 */
function sinirlariBul(hamMetin) {
  const sinirlar = new Set()
  const desen = /boundary\s*=\s*"?([^";\r\n]+)"?/gi
  let eslesme
  while ((eslesme = desen.exec(hamMetin)) !== null) sinirlar.add(eslesme[1].trim())
  return [...sinirlar]
}

/*
 * Dosya adı üç ayrı yerden gelebiliyor.
 *
 * 🔴 `filename*=UTF-8''...` (RFC 2231) biçimini önceki regex HİÇ
 * görmüyordu. Türkçe karakterli ya da boşluklu dosya adları tam olarak
 * böyle kodlanıyor — yani "E-Fatura Örnek.pdf" adlı bir ek, ayrıştırıcı
 * onu bulamadığı için yok sayılıyordu.
 */
function dosyaAdi(parca) {
  const utf = parca.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^\r\n;]+)/i)
  if (utf) {
    try { return decodeURIComponent(utf[1].trim()) } catch { return utf[1].trim() }
  }
  const duz = parca.match(/filename\s*=\s*"?([^";\r\n]+)"?/i)
  if (duz) return duz[1].trim()
  /* Bazı istemciler adı yalnız `content-type: application/pdf; name="..."`
     içinde veriyor. */
  const ad = parca.match(/\bname\s*=\s*"?([^";\r\n]+)"?/i)
  return ad ? ad[1].trim() : null
}

function ekleriCikar(hamMetin) {
  const ekler = []
  const sinirlar = sinirlariBul(hamMetin)
  if (!sinirlar.length) return { ekler, parcaSayisi: 0, sinirSayisi: 0 }

  /* Her sınıra göre sırayla bölünüyor: iç içe multipart'ta tek bölme
     yetmiyor, dış parça bölünmeden iç parçalara inilemiyor. */
  let parcalar = [hamMetin]
  for (const sinir of sinirlar) {
    const yeni = []
    for (const p of parcalar) yeni.push(...p.split(`--${sinir}`))
    parcalar = yeni
  }

  let toplam = 0

  for (const parca of parcalar) {
    if (ekler.length >= EN_FAZLA_EK) break
    if (!/content-transfer-encoding:\s*base64/i.test(parca)) continue

    /*
     * `content-disposition: attachment` ARTIK ŞART DEĞİL.
     *
     * Bazı istemciler faturayı `inline` olarak işaretliyor. Asıl sinyal
     * base64 gövde + dosya adı ikilisi. Gereksiz şey (imzadaki logo)
     * gelirse sunucu zaten uzantı/MIME/sihirli bayt kapısında
     * reddediyor VE sebebini günlüğe yazıyor — yani gürültü görünür
     * kalıyor, sessiz kayıp değil. Ters yönde hata yapmak daha pahalı.
     */
    const adDegeri = dosyaAdi(parca)
    const tur = parca.match(/content-type:\s*([^;\r\n]+)/i)
    if (!adDegeri) continue
    const ad = [null, adDegeri]

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
  return { ekler, parcaSayisi: parcalar.length, sinirSayisi: sinirlar.length }
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
      const cozum = ekleriCikar(ham)

      const yuk = {
        inboxKey: kutuAnahtari(message.to),
        from: String(message.from || '').trim().toLowerCase(),
        subject: (message.headers.get('subject') || '').slice(0, 500),
        dkim: kimlikSonucu(message.headers, 'dkim'),
        spf: kimlikSonucu(message.headers, 'spf'),
        ekler: cozum.ekler
      }

      /*
       * 🔴 HER SONUÇ GÜNLÜĞE YAZILIYOR.
       *
       * Önceki sürüm eksiz postada sessizce çıkıyordu ve iletim
       * sonucunu da hiç yazmıyordu. Sonuç: "Cloudflare Handled diyor
       * ama sunucuda iz yok" durumu ortaya çıktı ve sebebi ancak
       * ayrıştırıcı elle okunarak bulunabildi.
       *
       * Cloudflare'ın "Handled" demesi Worker'ın ÇALIŞTIĞINI söyler,
       * bir iş YAPTIĞINI değil. Aradaki farkı yalnız bu satırlar
       * gösteriyor.
       */
      const tani = {
        kutu: yuk.inboxKey,
        dkim: yuk.dkim,
        spf: yuk.spf,
        sinir: cozum.sinirSayisi,
        parca: cozum.parcaSayisi,
        ek: yuk.ekler.length,
        adlar: yuk.ekler.map(e => e.filename).slice(0, 5)
      }

      /* Eksiz posta sunucuya HİÇ gitmiyor: işlenecek bir şey yok ve
         gereksiz istek hız sınırından yer yer. Ama artık SESSİZ değil. */
      if (yuk.ekler.length === 0) {
        console.log('EK BULUNAMADI, sunucuya gonderilmedi', JSON.stringify(tani))
        return
      }

      const yanit = await fetch(`${env.API_URL}/inbound/email`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-inbound-secret': env.INBOUND_SECRET
        },
        body: JSON.stringify(yuk)
      })

      /* Durum kodu şart: 401 (secret uyuşmuyor) ile 202 (kabul edildi)
         arasındaki farkı başka hiçbir yerden göremiyoruz. */
      console.log('sunucuya iletildi', JSON.stringify({ ...tani, status: yanit.status }))
    } catch (hata) {
      /* Worker'ın çökmesi de sessiz kalmalı; gönderene bilgi gitmesin.
         Cloudflare kendi günlüğüne yazıyor. */
      console.error('gelen posta işlenemedi', hata && hata.message)
    }
  }
}
