import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  anahtarDogru,
  gelenKutusuAnahtariUret,
  postayiDegerlendir
} from '../src/services/gelen-eposta.js'

/*
 * GELEN E-POSTA KANALI — GÜVENLİK.
 *
 * 🔴 BU UÇ İNTERNETE AÇIK VE JWT TAŞIMIYOR. Postayı gönderen kişi bizim
 * kullanıcımız değil, dolayısıyla oturum tabanlı hiçbir koruma burada
 * çalışmıyor. Kabul kararının TAMAMI bu dosyadaki mantığa bağlı.
 *
 * Üç katman ayrı ayrı test ediliyor; hiçbiri tek başına yeterli değil:
 *   1. Paylaşılan anahtar (sabit zamanlı karşılaştırma)
 *   2. Tahmin edilemez kutu adresi
 *   3. Gönderen doğrulaması (üyelik + e-posta doğrulaması + DKIM/SPF)
 */

const prisma = new PrismaClient()

let workspaceId: string
let inboxKey: string
let uyeEposta: string
let dogrulanmamisEposta: string
let yabanciEposta: string
let pasifWorkspaceId: string
let pasifInboxKey: string

const posta = (ek: Partial<Parameters<typeof postayiDegerlendir>[1]> = {}) => ({
  inboxKey,
  from: uyeEposta,
  dkim: 'pass' as const,
  spf: 'pass' as const,
  ekler: [],
  ...ek
}) as Parameters<typeof postayiDegerlendir>[1]

beforeAll(async () => {
  const damga = Date.now()
  uyeEposta = `uye-${damga}@ornek.test`
  dogrulanmamisEposta = `dogrulanmamis-${damga}@ornek.test`
  yabanciEposta = `yabanci-${damga}@ornek.test`

  const uye = await prisma.user.create({
    data: { email: uyeEposta, password: 'x', name: 'Üye', role: 'learner', emailVerifiedAt: new Date() }
  })
  const dogrulanmamis = await prisma.user.create({
    data: { email: dogrulanmamisEposta, password: 'x', name: 'Doğrulanmamış', role: 'learner' }
  })
  await prisma.user.create({
    data: { email: yabanciEposta, password: 'x', name: 'Yabancı', role: 'learner', emailVerifiedAt: new Date() }
  })

  inboxKey = gelenKutusuAnahtariUret()
  const ws = await prisma.businessWorkspace.create({
    data: { name: 'Gelen Kutusu Testi', createdById: uye.id, status: 'active', inboxKey }
  })
  workspaceId = ws.id
  await prisma.businessMember.createMany({
    data: [
      { workspaceId, userId: uye.id, role: 'owner', status: 'active' },
      { workspaceId, userId: dogrulanmamis.id, role: 'staff', status: 'active' }
    ]
  })

  pasifInboxKey = gelenKutusuAnahtariUret()
  const pasif = await prisma.businessWorkspace.create({
    data: { name: 'Pasif Alan', createdById: uye.id, status: 'archived', inboxKey: pasifInboxKey }
  })
  pasifWorkspaceId = pasif.id
  await prisma.businessMember.create({
    data: { workspaceId: pasifWorkspaceId, userId: uye.id, role: 'owner', status: 'active' }
  })
})

afterAll(async () => {
  await prisma.businessWorkspace.deleteMany({ where: { id: { in: [workspaceId, pasifWorkspaceId] } } })
  await prisma.user.deleteMany({
    where: { email: { in: [uyeEposta, dogrulanmamisEposta, yabanciEposta] } }
  })
  await prisma.$disconnect()
})

describe('paylaşılan anahtar', () => {
  it('doğru anahtar kabul edilir', () => {
    expect(anahtarDogru('a'.repeat(40), 'a'.repeat(40))).toBe(true)
  })

  it('yanlış anahtar reddedilir', () => {
    expect(anahtarDogru('b'.repeat(40), 'a'.repeat(40))).toBe(false)
  })

  it('eksik anahtar reddedilir', () => {
    expect(anahtarDogru(undefined, 'a'.repeat(40))).toBe(false)
    expect(anahtarDogru('', 'a'.repeat(40))).toBe(false)
  })

  /*
   * Uzunluk farkı `timingSafeEqual`i FIRLATTIRIR. Önceden kontrol
   * edilmezse uç, kısa bir anahtar denemesinde 500 döner -- bu da
   * saldırgana "uzunluk yanlış" bilgisini verirdi.
   */
  it('farklı uzunlukta anahtar çökmeden reddedilir', () => {
    expect(() => anahtarDogru('kisa', 'a'.repeat(40))).not.toThrow()
    expect(anahtarDogru('kisa', 'a'.repeat(40))).toBe(false)
  })
})

describe('kutu adresi', () => {
  /* Tahmin edilebilirlik tek başına güvenlik değil ama gereksiz
     denemeleri kesiyor. */
  it('her çağrıda farklı ve yeterince uzun', () => {
    const a = gelenKutusuAnahtariUret()
    const b = gelenKutusuAnahtariUret()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(38)
    expect(a).toMatch(/^fatura-[0-9a-f]{32}$/)
  })
})

describe('gönderen doğrulaması', () => {
  it('doğrulanmış üyeden gelen posta kabul edilir', async () => {
    const sonuc = await postayiDegerlendir(prisma, posta())
    expect(sonuc).toHaveProperty('workspaceId', workspaceId)
  })

  /*
   * 🔴 EN ÖNEMLİ TEST. `From` başlığı UYDURULABİLİR. DKIM/SPF olmadan,
   * adresi bir kez sızmış bir kutuya herkes üye gibi görünüp belge
   * gönderebilirdi.
   */
  it('DKIM ve SPF geçmezse üye bile olsa reddedilir', async () => {
    const sonuc = await postayiDegerlendir(prisma, posta({ dkim: 'fail', spf: 'fail' }))
    expect(sonuc).toEqual({ red: 'dkim_spf_gecmedi' })
  })

  /* Kimlik doğrulaması OLMAYAN posta, BAŞARISIZ olandan güvenli değil. */
  it('DKIM/SPF sonucu "none" ise reddedilir', async () => {
    const sonuc = await postayiDegerlendir(prisma, posta({ dkim: 'none', spf: 'none' }))
    expect(sonuc).toEqual({ red: 'dkim_spf_gecmedi' })
  })

  it('ikisinden biri geçerse kabul edilir', async () => {
    expect(await postayiDegerlendir(prisma, posta({ dkim: 'pass', spf: 'fail' })))
      .toHaveProperty('workspaceId')
    expect(await postayiDegerlendir(prisma, posta({ dkim: 'fail', spf: 'pass' })))
      .toHaveProperty('workspaceId')
  })

  it('üye olmayan gönderen reddedilir', async () => {
    const sonuc = await postayiDegerlendir(prisma, posta({ from: yabanciEposta }))
    expect(sonuc).toEqual({ red: 'gonderen_uye_degil' })
  })

  /*
   * E-postası DOĞRULANMAMIŞ hesap, sahibi olmadığı bir adresle açılmış
   * olabilir. O adresten gelen postayı kabul etmek, doğrulama adımını
   * anlamsız kılardı.
   */
  it('e-postası doğrulanmamış üye reddedilir', async () => {
    const sonuc = await postayiDegerlendir(prisma, posta({ from: dogrulanmamisEposta }))
    expect(sonuc).toEqual({ red: 'gonderen_uye_degil' })
  })

  it('bilinmeyen kutu adresi reddedilir', async () => {
    const sonuc = await postayiDegerlendir(prisma, posta({ inboxKey: gelenKutusuAnahtariUret() }))
    expect(sonuc).toEqual({ red: 'kutu_yok' })
  })

  /* Arşivlenmiş çalışma alanı belge almamalı. */
  it('pasif çalışma alanının kutusu reddedilir', async () => {
    const sonuc = await postayiDegerlendir(prisma, posta({ inboxKey: pasifInboxKey }))
    expect(sonuc).toEqual({ red: 'calisma_alani_pasif' })
  })

  /* E-posta adresleri büyük/küçük harfe duyarsızdır. */
  it('gönderen adresi büyük harfle yazılsa da eşleşir', async () => {
    const sonuc = await postayiDegerlendir(prisma, posta({ from: uyeEposta.toUpperCase() }))
    expect(sonuc).toHaveProperty('workspaceId', workspaceId)
  })

  /*
   * BAŞKA çalışma alanının üyesi, bu kutuya gönderemez. Üyelik
   * kontrolü workspace'e BAĞLI yapılıyor; genel "kullanıcı var mı"
   * kontrolü olsaydı her kayıtlı kullanıcı her kutuya yazabilirdi.
   */
  it('başka çalışma alanının üyesi bu kutuya gönderemez', async () => {
    const digerEposta = `diger-${Date.now()}@ornek.test`
    const diger = await prisma.user.create({
      data: { email: digerEposta, password: 'x', name: 'Diğer', role: 'learner', emailVerifiedAt: new Date() }
    })
    const digerWs = await prisma.businessWorkspace.create({
      data: { name: 'Diğer Alan', createdById: diger.id, status: 'active' }
    })
    await prisma.businessMember.create({
      data: { workspaceId: digerWs.id, userId: diger.id, role: 'owner', status: 'active' }
    })

    const sonuc = await postayiDegerlendir(prisma, posta({ from: digerEposta }))
    expect(sonuc).toEqual({ red: 'gonderen_uye_degil' })

    await prisma.businessWorkspace.delete({ where: { id: digerWs.id } })
    await prisma.user.delete({ where: { id: diger.id } })
  })
})
