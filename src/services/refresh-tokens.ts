import crypto from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { generateRawToken, hashToken } from '../lib/tokens.js'

/*
 * Oturum yenileme tokenleri.
 *
 * NEDEN VAR: erişim tokeni 8 saat geçerli ve yenilenmiyordu. Web'de
 * katlanılır, ama mobilde kullanıcı günde birkaç kez yeniden giriş
 * yapmak zorunda kalıyordu.
 *
 * TASARIM KARARLARI
 *
 * 1. Ham değer yalnız istemciye gider; veritabanında sha256 özeti durur
 *    (parola sıfırlama ve davet tokenleriyle aynı desen).
 *
 * 2. DÖNÜŞ (rotation): her yenileme eski tokeni harcayıp yenisini
 *    veriyor. Böylece çalınan bir token sınırsız süre kullanılamaz.
 *
 * 3. TEKRAR KULLANIM = HIRSIZLIK SİNYALİ. Harcanmış bir token yeniden
 *    sunulduysa iki taraf da aynı tokene sahip demektir; hangisinin
 *    saldırgan olduğunu bilemeyiz, bu yüzden AİLENİN TAMAMI iptal
 *    edilir ve iki taraf da yeniden giriş yapmak zorunda kalır.
 *
 * 4. `tokenVersion` satırda TUTULUYOR ve yenilemede karşılaştırılıyor.
 *    Bu, tasarımın en önemli parçası: `tokenVersion` beş ayrı yerde
 *    artıyor (şifre değişimi, tüm cihazlardan çıkış, şifre sıfırlama,
 *    askıya alma, anonimleştirme). Her birine ayrıca "yenileme
 *    tokenlerini de sil" eklenseydi, ileride eklenecek altıncı yolun
 *    unutulması sessiz bir güvenlik açığı olurdu: iptal edilmiş bir
 *    oturum, yenileme yoluyla taze bir erişim tokeni üretmeye devam
 *    ederdi. Kontrol tek yerde.
 */

/** Yenileme tokeni ömrü. Erişim tokeninden (8sa) çok daha uzun. */
export const REFRESH_TTL_GUN = 30

const gunToMs = (gun: number) => gun * 24 * 60 * 60 * 1000

export interface YenilemeSonucu {
  rawToken: string
  familyId: string
  expiresAt: Date
}

/** Yeni bir aile başlatır (giriş / kayıt). */
export async function yeniAileOlustur(
  prisma: PrismaClient,
  userId: number,
  tokenVersion: number
): Promise<YenilemeSonucu> {
  return tokenYaz(prisma, userId, tokenVersion, crypto.randomUUID())
}

async function tokenYaz(
  prisma: PrismaClient,
  userId: number,
  tokenVersion: number,
  familyId: string
): Promise<YenilemeSonucu> {
  const rawToken = generateRawToken(48)
  const expiresAt = new Date(Date.now() + gunToMs(REFRESH_TTL_GUN))
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(rawToken), familyId, tokenVersion, expiresAt }
  })
  return { rawToken, familyId, expiresAt }
}

export type YenilemeHatasi =
  | 'BULUNAMADI'
  | 'SURESI_DOLDU'
  | 'IPTAL_EDILDI'
  | 'TEKRAR_KULLANIM'
  | 'OTURUM_IPTAL'

export type YenilemeCevabi =
  | { ok: true; userId: number; yeni: YenilemeSonucu }
  | { ok: false; hata: YenilemeHatasi }

/**
 * Sunulan yenileme tokenini harcayıp yenisini üretir.
 *
 * Dönen hata türleri BİLEREK ayrıntılı — çağıran taraf hepsini aynı 401
 * ile karşılıyor (istemciye ayrım sızdırmamak için), ama günlükte ve
 * testte "tekrar kullanım" ile "süresi doldu" ayırt edilebilmeli:
 * ilki bir saldırı sinyali, ikincisi sıradan.
 */
export async function tokenYenile(
  prisma: PrismaClient,
  rawToken: string
): Promise<YenilemeCevabi> {
  const tokenHash = hashToken(rawToken)
  const kayit = await prisma.refreshToken.findUnique({ where: { tokenHash } })
  if (!kayit) return { ok: false, hata: 'BULUNAMADI' }

  if (kayit.usedAt) {
    /*
     * Harcanmış token yeniden sunuldu. Meşru istemci her yenilemede yeni
     * token aldığı için eskisini bir daha göndermez; bu durumda tokeni
     * kopyalayan biri var demektir. Hangi tarafın saldırgan olduğunu
     * bilemediğimizden ailenin tamamı iptal ediliyor.
     */
    await prisma.refreshToken.updateMany({
      where: { familyId: kayit.familyId, revokedAt: null },
      data: { revokedAt: new Date() }
    })
    return { ok: false, hata: 'TEKRAR_KULLANIM' }
  }

  if (kayit.revokedAt) return { ok: false, hata: 'IPTAL_EDILDI' }
  if (kayit.expiresAt <= new Date()) return { ok: false, hata: 'SURESI_DOLDU' }

  const user = await prisma.user.findUnique({
    where: { id: kayit.userId },
    select: { id: true, deletedAt: true, tokenVersion: true }
  })
  if (!user || user.deletedAt) return { ok: false, hata: 'BULUNAMADI' }

  /* Oturum iptal edilmiş mi (şifre değişimi, logout-all, askı…). */
  if (user.tokenVersion !== kayit.tokenVersion) {
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    })
    return { ok: false, hata: 'OTURUM_IPTAL' }
  }

  const yeni = await prisma.$transaction(async tx => {
    /*
     * `updateMany` + `usedAt: null` koşulu, aynı tokenle gelen eşzamanlı
     * iki isteğin ikisinin birden yenileme almasını engelliyor: yalnız
     * biri satırı işaretleyebilir.
     */
    const harcandi = await tx.refreshToken.updateMany({
      where: { id: kayit.id, usedAt: null },
      data: { usedAt: new Date() }
    })
    if (harcandi.count === 0) return null

    const rawYeni = generateRawToken(48)
    const expiresAt = new Date(Date.now() + gunToMs(REFRESH_TTL_GUN))
    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawYeni),
        familyId: kayit.familyId,
        tokenVersion: user.tokenVersion,
        expiresAt
      }
    })
    return { rawToken: rawYeni, familyId: kayit.familyId, expiresAt }
  })

  if (!yeni) return { ok: false, hata: 'TEKRAR_KULLANIM' }
  return { ok: true, userId: user.id, yeni }
}

/** Tek tokeni iptal eder (bu cihazdan çıkış). */
export async function tokenIptalEt(prisma: PrismaClient, rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() }
  })
}

/**
 * Süresi geçmiş kayıtları siler.
 *
 * Ayrı bir zamanlanmış iş yerine girişte fırsatçı olarak çağrılıyor:
 * tablo yalnız giriş/yenileme ile büyüyor, dolayısıyla temizliğin aynı
 * yolda olması yeterli ve çalışmayan bir cron'a bağımlılık yaratmıyor.
 */
export async function suresiGecenleriTemizle(prisma: PrismaClient): Promise<number> {
  const sonuc = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - gunToMs(1)) } }
  })
  return sonuc.count
}
