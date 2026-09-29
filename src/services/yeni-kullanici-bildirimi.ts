import { prisma } from '../lib/prisma.js'
import { sendMail } from './mailer.js'
import { yeniKullaniciMaili } from './mail-templates.js'

/*
 * YENİ KULLANICI BİLDİRİMİ (29.09.2026).
 *
 * Ürün sahibi: "kullanıcılar var fakat geldiğinden benim haberim olmuyor".
 * Her yeni kayıtta (e-posta, Apple, Google) işletmeciye kısa bir e-posta:
 * kim, hangi yoldan, toplam kaç kullanıcı oldu.
 *
 * 🔴 KAYIT AKIŞINI ASLA BOZMAZ: çağıran `void` ile bekletmeden çağırır, bu
 * fonksiyon her hatayı yutar. Posta gitmediği için kayıt olamayan kullanıcı
 * kabul edilemez bir takas.
 *
 * Alıcı: YENI_KULLANICI_BILDIRIMI_ALICI, yoksa SUPPORT_MAIL_TO (yeni bir
 * ortam değişkeni gerekmesin). Kapatmak: YENI_KULLANICI_BILDIRIMI=0.
 * Kişisel veri yalnız işletmecinin kendi posta kutusuna gider.
 */
export type KayitKaynagi = 'e-posta' | 'apple' | 'google'

export function yeniKullaniciAlicisi(): string | null {
  const kapali = (process.env.YENI_KULLANICI_BILDIRIMI || '').trim().toLowerCase()
  if (kapali === '0' || kapali === 'false' || kapali === 'off') return null
  const alici = (process.env.YENI_KULLANICI_BILDIRIMI_ALICI || process.env.SUPPORT_MAIL_TO || '').trim()
  return alici.includes('@') ? alici : null
}

export async function yeniKullaniciBildir(
  kullanici: { id: number; email: string; name: string },
  kaynak: KayitKaynagi
): Promise<void> {
  try {
    const alici = yeniKullaniciAlicisi()
    if (!alici) return
    const toplam = await prisma.user.count({ where: { deletedAt: null } })
    await sendMail(yeniKullaniciMaili(alici, kullanici.name, kullanici.email, kaynak, toplam))
  } catch (err) {
    console.error(JSON.stringify({ event: 'YENI_KULLANICI_BILDIRIMI_HATA', message: (err as Error)?.message?.slice(0, 200) }))
  }
}
