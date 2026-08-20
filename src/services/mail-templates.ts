import { uygulamaAdresi, type MailMesaji } from './mailer.js'

/*
 * E-posta şablonları.
 *
 * Gönderim mantığından ayrı tutuluyor: metinler ürün diline aittir ve
 * sağlayıcı değişse de aynı kalır. Her şablon düz metin gövdeyi ZORUNLU
 * üretir — HTML engellenen ya da okunmayan istemcilerde e-posta işe yaramaz
 * hale gelmesin.
 *
 * Güvenlik e-postalarında ortak kural: kullanıcıya "bu isteği sen yapmadıysan
 * ne olacağı" her zaman söylenir. Şifre sıfırlama ve doğrulama kodu
 * e-postaları, hesabın ele geçirildiğinin ilk sinyali olabilir.
 */

const IMZA = 'LocalKarar'

function cerceve(baslik: string, govde: string, dipnot: string): string {
  return [
    baslik,
    '',
    govde,
    '',
    dipnot,
    '',
    '—',
    IMZA,
    uygulamaAdresi()
  ].join('\n')
}

/** Basit, satır içi stilli HTML. E-posta istemcileri harici CSS yüklemez. */
function htmlCerceve(baslik: string, paragraflar: string[], vurgu?: string): string {
  const p = paragraflar
    .map(t => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1f2933">${t}</p>`)
    .join('')
  const kutu = vurgu
    ? `<div style="margin:24px 0;padding:18px 24px;background:#f1f4f5;border-radius:12px;text-align:center;
         font-size:30px;font-weight:700;letter-spacing:6px;color:#0d556f;font-family:monospace">${vurgu}</div>`
    : ''
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
    <h1 style="margin:0 0 20px;font-size:19px;color:#0d556f">${baslik}</h1>
    ${p}${kutu}
    <p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #d8dcde;font-size:12px;color:#6b7780">
      ${IMZA} · ${uygulamaAdresi()}
    </p>
  </div>`
}

/** Şifre sıfırlama bağlantısı. Bağlantı tek kullanımlık ve 1 saat geçerli. */
export function sifreSifirlamaMaili(to: string, ad: string, rawToken: string): MailMesaji {
  const link = `${uygulamaAdresi()}/reset-password?token=${encodeURIComponent(rawToken)}`
  const govde = [
    `Merhaba ${ad},`,
    '',
    'LocalKarar hesabınız için şifre sıfırlama talebi aldık.',
    'Yeni şifrenizi belirlemek için aşağıdaki bağlantıyı açın:',
    '',
    link,
    '',
    'Bu bağlantı 1 saat boyunca ve yalnızca bir kez geçerlidir.'
  ].join('\n')

  return {
    to,
    subject: 'LocalKarar — şifre sıfırlama',
    text: cerceve(
      'Şifre sıfırlama',
      govde,
      'Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez. Hesabınıza başkasının eriştiğinden şüpheleniyorsanız şifrenizi değiştirin — bu işlem tüm cihazlardaki oturumları kapatır.'
    ),
    html: htmlCerceve('Şifre sıfırlama', [
      `Merhaba <strong>${ad}</strong>,`,
      'LocalKarar hesabınız için şifre sıfırlama talebi aldık.',
      `<a href="${link}" style="color:#0d556f;font-weight:600">Yeni şifremi belirle</a>`,
      'Bu bağlantı <strong>1 saat</strong> boyunca ve yalnızca <strong>bir kez</strong> geçerlidir.',
      '<span style="color:#6b7780;font-size:13px">Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.</span>'
    ])
  }
}

/** E-posta doğrulama kodu. 6 hane, 15 dakika. */
export function dogrulamaKoduMaili(to: string, ad: string, kod: string): MailMesaji {
  const govde = [
    `Merhaba ${ad},`,
    '',
    'LocalKarar hesabınızın e-posta adresini doğrulamak için kodunuz:',
    '',
    `    ${kod}`,
    '',
    'Kod 15 dakika boyunca geçerlidir.'
  ].join('\n')

  return {
    to,
    subject: `LocalKarar doğrulama kodu: ${kod}`,
    text: cerceve(
      'E-posta doğrulama',
      govde,
      'Bu kodu siz istemediyseniz birisi e-posta adresinizle hesap açmaya çalışıyor olabilir. Kodu kimseyle paylaşmayın.'
    ),
    html: htmlCerceve(
      'E-posta doğrulama',
      [
        `Merhaba <strong>${ad}</strong>,`,
        'LocalKarar hesabınızın e-posta adresini doğrulamak için kodunuz:'
      ],
      kod
    ) + `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:0 24px">
      <p style="font-size:13px;color:#6b7780;line-height:1.6">Kod <strong>15 dakika</strong> geçerlidir. Bu kodu siz istemediyseniz kimseyle paylaşmayın.</p>
    </div>`
  }
}

/** Şifre başarıyla değiştiğinde bilgilendirme — ele geçirmenin erken sinyali. */
export function sifreDegistiMaili(to: string, ad: string): MailMesaji {
  return {
    to,
    subject: 'LocalKarar — şifreniz değiştirildi',
    text: cerceve(
      'Şifreniz değiştirildi',
      [
        `Merhaba ${ad},`,
        '',
        'LocalKarar hesabınızın şifresi az önce değiştirildi.',
        'Diğer cihazlardaki oturumlarınız güvenlik gereği kapatıldı.'
      ].join('\n'),
      'Bu işlemi siz yapmadıysanız hesabınıza erişim kaybetmiş olabilirsiniz. Hemen şifre sıfırlama talebinde bulunun.'
    ),
    html: htmlCerceve('Şifreniz değiştirildi', [
      `Merhaba <strong>${ad}</strong>,`,
      'LocalKarar hesabınızın şifresi az önce değiştirildi. Diğer cihazlardaki oturumlarınız güvenlik gereği kapatıldı.',
      '<span style="color:#6b7780;font-size:13px">Bu işlemi siz yapmadıysanız hemen şifre sıfırlama talebinde bulunun.</span>'
    ])
  }
}
