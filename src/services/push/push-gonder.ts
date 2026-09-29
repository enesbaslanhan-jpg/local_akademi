import { prisma } from '../../lib/prisma.js'
import { apnsAyari, apnsIstegi, type ApnsGonderici, type PushYuku } from './apns.js'

/*
 * TELEFON BİLDİRİMİ GÖNDERİCİ (29.09.2026).
 *
 * Mevcut zil bildirimleri (pazaryeri, hatırlatıcı, topluluk) veritabanına
 * yazıldıktan SONRA bu fonksiyon çağrılır; kullanıcının kayıtlı cihazlarına
 * Apple üzerinden iletir.
 *
 * 🔴 ASLA FIRLATMAZ, ASLA BEKLETMEZ: çağıranlar `void pushBildir(...)` der.
 * Bildirim bir YAN ETKİDİR; gönderim çöktü diye hatırlatıcı işleyicisi, beğeni
 * ya da eşitleme başarısız olmamalı (bkz. community-bildirim.ts, 2. madde).
 *
 * 🔴 YAPILANDIRMA YOKSA SESSİZ KAPALI: APNS_* değişkenleri girilmemişse
 * hiçbir ağ isteği yapılmaz; deploy güvenle önce çıkabilir, anahtar sonra
 * eklenir.
 *
 * Geçersiz cihaz kodu (Apple 410 / BadDeviceToken) satırı SİLER; yoksa her
 * bildirimde ölü koda gönderim denenirdi.
 */

let gonderici: ApnsGonderici = apnsIstegi
/** Yalnız testler için. */
export function pushGondericiAyarla(g: ApnsGonderici | null) { gonderici = g ?? apnsIstegi }

export async function pushBildir(userId: number, yuk: PushYuku): Promise<void> {
  try {
    const ayar = apnsAyari()
    if (!ayar) return
    const cihazlar = await prisma.deviceToken.findMany({
      where: { userId, platform: 'ios' },
      select: { id: true, token: true },
      take: 10
    })
    for (const c of cihazlar) {
      const sonuc = await gonderici(ayar, c.token, yuk)
      if (sonuc.durum === 'gecersiz') {
        await prisma.deviceToken.deleteMany({ where: { id: c.id } })
        console.log(JSON.stringify({ event: 'PUSH_KOD_SILINDI', sebep: sonuc.sebep }))
      } else if (sonuc.durum === 'hata') {
        console.error(JSON.stringify({ event: 'PUSH_HATA', sebep: sonuc.sebep }))
      }
    }
  } catch (err) {
    console.error(JSON.stringify({ event: 'PUSH_HATA', message: (err as Error)?.message?.slice(0, 200) }))
  }
}

/** Uygulamanın derin bağlantı ayrıştırıcısının tanıdığı adresler (DeepLinkParser). */
export const PUSH_ADRESLERI = {
  bildirimler: 'https://localkarar.com/app/bildirimler',
  sohbetler: 'https://localkarar.com/app/community/sohbetler',
  isletmeBildirimleri: (workspaceId: string) => `https://localkarar.com/app/workspaces/${encodeURIComponent(workspaceId)}/notifications`
} as const
