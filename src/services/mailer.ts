/*
 * E-posta gönderimi — sağlayıcıdan bağımsız ince katman.
 *
 * NEDEN BU KATMAN VAR: uygulamada e-posta gönderimi hiç yoktu; şifre
 * sıfırlama ve e-posta doğrulama tamamen buna bağlı. Sağlayıcı seçimi ise
 * KVKK açısından yük taşıyor (Resend ABD merkezli, kullanıcının adresi yurt
 * dışına aktarılıyor). Bu yüzden gönderim tek dosyada toplandı: Türkiye'de
 * sunucusu olan bir sağlayıcıya geçilmek istenirse yalnız `resendGonder`
 * değişir, çağıran hiçbir kod değişmez.
 *
 * SDK KULLANILMIYOR: Resend'in tek bir REST uç noktası var, `fetch` yeterli.
 * Bir bağımlılık daha eklemek, güncellenmesi ve denetlenmesi gereken bir
 * yüzey daha demek.
 */

export interface MailMesaji {
  to: string
  subject: string
  /** Düz metin gövde — her istemcide okunur, zorunlu. */
  text: string
  /** İsteğe bağlı HTML gövde. */
  html?: string
}

export class MailGonderimHatasi extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message)
    this.name = 'MailGonderimHatasi'
  }
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/** Gönderen adresi. Üretimde zorunlu, geliştirmede makul bir varsayılan. */
export function gondericiAdresi(): string {
  const from = process.env.MAIL_FROM
  if (from) return from
  if (isProduction()) {
    throw new MailGonderimHatasi('MAIL_FROM tanımlı değil — üretimde zorunludur.')
  }
  return 'LocalKarar <onboarding@resend.dev>'
}

/**
 * Uygulamanın kullanıcıya göstereceği genel adres (sıfırlama bağlantısı vb.).
 * Sonundaki eğik çizgi temizlenir ki bağlantılarda çift `//` oluşmasın.
 */
export function uygulamaAdresi(): string {
  const url = process.env.APP_PUBLIC_URL
  if (!url) {
    if (isProduction()) {
      throw new MailGonderimHatasi('APP_PUBLIC_URL tanımlı değil — üretimde zorunludur.')
    }
    return 'http://localhost:5173'
  }
  return url.replace(/\/+$/, '')
}

/**
 * Gerçek gönderim yapılabiliyor mu.
 *
 * Anahtar yoksa geliştirme ve testte e-postalar konsola yazılır; bu sayede
 * akışın tamamı sağlayıcı olmadan test edilebilir. Üretimde anahtarsız
 * çalışmaya izin verilmez — bkz. `mailYapilandirmasiniDogrula`.
 */
export function gercekGonderimAcikMi(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

/**
 * Açılışta çağrılır. Üretimde e-posta yapılandırması eksikse süreç hiç
 * başlamamalı: şifre sıfırlama sessizce çalışmayan bir özelliğe dönüşürse
 * kullanıcı hesabına erişimini kaybeder ve bunu kimse fark etmez.
 */
export function mailYapilandirmasiniDogrula(): void {
  if (!isProduction()) return
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY tanımlı değil. Üretimde e-posta gönderimi zorunludur (şifre sıfırlama ve e-posta doğrulama buna bağlı).')
  }
  /* Bunlar da eksikse ilk gönderimde patlar; açılışta patlaması daha iyi. */
  gondericiAdresi()
  uygulamaAdresi()
}

async function resendGonder(mesaj: MailMesaji): Promise<void> {
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: gondericiAdresi(),
      to: [mesaj.to],
      subject: mesaj.subject,
      text: mesaj.text,
      ...(mesaj.html ? { html: mesaj.html } : {})
    })
  })

  if (!response.ok) {
    /* Sağlayıcı gövdesi hata ayıklama için yararlı ama kullanıcıya gitmemeli. */
    const govde = await response.text().catch(() => '')
    throw new MailGonderimHatasi(
      `E-posta gönderilemedi (HTTP ${response.status}): ${govde.slice(0, 200)}`,
      response.status
    )
  }
}

/** Sağlayıcı yokken: e-postayı loga yaz. Geliştirme ve test yolu. */
function konsolaYaz(mesaj: MailMesaji): void {
  const cizgi = '─'.repeat(64)
  console.log(
    `\n${cizgi}\n[E-POSTA — gerçek gönderim KAPALI (RESEND_API_KEY yok)]\n` +
    `Kime : ${mesaj.to}\nKonu : ${mesaj.subject}\n${cizgi}\n${mesaj.text}\n${cizgi}\n`
  )
}

/**
 * Tek gönderim noktası.
 *
 * Hata FIRLATIR, sessizce yutmaz: çağıran, kullanıcıya "kod gönderildi"
 * demeden önce gerçekten gönderildiğini bilmek zorunda. Tek istisna, çağıranın
 * bilinçli olarak yuttuğu yerlerdir (ör. e-posta sayımını engellemek için
 * şifre sıfırlama isteğinin her koşulda 200 dönmesi).
 */
export async function sendMail(mesaj: MailMesaji): Promise<void> {
  if (!mesaj.to || !mesaj.to.includes('@')) {
    throw new MailGonderimHatasi(`Geçersiz alıcı adresi: ${mesaj.to}`)
  }
  if (!gercekGonderimAcikMi()) {
    konsolaYaz(mesaj)
    return
  }
  await resendGonder(mesaj)
}
