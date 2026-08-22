import { prisma } from '../lib/prisma.js'

/*
 * TOPLULUK BİLDİRİMLERİ — tek kaynak.
 *
 * NEDEN AYRI DOSYA: hem `community.ts` (beğeni, yanıt, alıntı) hem
 * `community-social.ts` (takip, mesaj, grup daveti) bildirim üretiyor.
 * İki yerde ayrı ayrı yazılsaydı, biri düzeltilip diğeri unutulunca
 * bildirimler türüne göre farklı davranırdı — ve bunu kimse fark
 * etmezdi, çünkü ikisi de "çalışıyor" görünür.
 *
 * NEDEN `BusinessNotification` KULLANILMADI: o model çalışma alanına
 * bağlı (`workspaceId` zorunlu) ve topluluk olaylarının çalışma alanı
 * yok. Zorlamak, olmayan bir alanı uydurmak olurdu.
 */

export type BildirimTuru =
  | 'follow'
  | 'message'
  | 'reply'
  | 'like'
  | 'quote'
  | 'thread_invite'

interface BildirimEkleri {
  postId?: string
  threadId?: string
}

/**
 * Bildirim yazar.
 *
 * İki davranış bilinçli:
 *
 * 1. KENDİNE bildirim gitmez. Kendi gönderini beğenmek ya da kendi
 *    yazına yanıt yazmak bildirim üretmemeli; yoksa her eylem kendi
 *    bildirimini doğurur ve liste anlamsızlaşır.
 *
 * 2. HATA YUTULUR. Bildirim bir YAN ETKİDİR. Bildirim yazılamadı diye
 *    beğeninin, yanıtın ya da mesajın başarısız olması, asıl işi
 *    ikincil bir işe feda etmek olurdu. Kullanıcı gönderisini
 *    kaybetmektense bildirimi kaçırsın.
 */
export async function bildirimYaz(
  alanKullaniciId: number,
  aktorId: number,
  tur: BildirimTuru,
  ekler: BildirimEkleri = {},
): Promise<void> {
  if (alanKullaniciId === aktorId) return
  try {
    await prisma.communityNotification.create({
      data: { userId: alanKullaniciId, actorId: aktorId, type: tur, ...ekler },
    })
  } catch {
    /* Sessiz — yukarıdaki 2. maddeye bakınız. */
  }
}

/**
 * Bir gönderinin yazarına bildirim yazar.
 *
 * Gönderi silinmişse ya da yazarı yoksa (anonimleştirilmiş hesap)
 * sessizce vazgeçer: `authorId` nullable ve bunu her çağrı yerinde
 * ayrı ayrı kontrol etmek tekrar olurdu.
 */
export async function gonderiSahibineBildir(
  postId: string,
  aktorId: number,
  tur: BildirimTuru,
): Promise<void> {
  try {
    const gonderi = await prisma.communityPost.findUnique({
      where: { id: postId },
      select: { authorId: true },
    })
    if (!gonderi?.authorId) return
    await bildirimYaz(gonderi.authorId, aktorId, tur, { postId })
  } catch {
    /* Sessiz. */
  }
}
