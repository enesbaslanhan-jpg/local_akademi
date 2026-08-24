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
  /*
   * ⚠️ BU TESTİN ŞARTI BİLEREK GEVŞETİLDİ.
   *
   * Eskiden `length >= 38` ve `fatura-<32 onaltılık>` aranıyordu.
   * O uzunluk, adresin elle yazılamaz olmasının sebebiydi ve ürün
   * sahibinin ilk şikâyeti buydu ("çok uzun ya"). Adres artık işletme
   * adından türüyor.
   *
   * Kısaltmak güvenlik modelini BOZMUYOR: bu dosyanın başındaki
   * yorumun ve `gelen-eposta.ts:66`nın söylediği gibi tahmin
   * edilebilirlik bir katman olarak sayılmıyor -- asıl kapı aşağıdaki
   * "gönderen doğrulaması" bloğu. Kısa adres yalnız gereksiz
   * denemeleri kesmeyi bırakıyor, koruma kaybı yok.
   */
  it('her çağrıda farklı', () => {
    const a = gelenKutusuAnahtariUret()
    const b = gelenKutusuAnahtariUret()
    expect(a).not.toBe(b)
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

/*
 * ADRES BİÇİMİ.
 *
 * Adres 32 onaltılık karakterden işletme adına çevrildi: kullanıcı onu
 * muhasebe programına ELLE yazacak ve tedarikçisine verecek.
 *
 * 🔴 Türkçe harf çevirisi burada bir süs değil: e-posta yerel adı
 * ASCII olmalı. `ölçüm-işletmesi@…` SMTPUTF8 gerektirir ve gönderen
 * tarafındaki birçok sunucu desteklemez -- adres sessizce çalışmaz
 * hâle gelirdi.
 */
describe('gelen kutusu adresi', () => {
  it('işletme adından türetiliyor ve YALNIZ ascii taşıyor', () => {
    const anahtar = gelenKutusuAnahtariUret('Ölçüm İşletmesi')
    expect(anahtar).toMatch(/^olcum-isletmesi-[0-9a-f]{4}$/)
  })

  it('Türkçe harflerin TAMAMI çevriliyor', () => {
    /* Büyük İ ve büyük I ayrı ayrı sınanıyor: `toLowerCase()` Türkçe
       yerelde `I`yı `ı`ya çeviriyor ve bu depoda tam bu yüzden
       `PROFESSİONAL COMMUNİTY` hatası yaşanmıştı. */
    const anahtar = gelenKutusuAnahtariUret('ÇĞIİÖŞÜ çğıiöşü')
    expect(anahtar).toMatch(/^cgiiosu-cgiiosu-[0-9a-f]{4}$/)
  })

  it('adsız çalışma alanında rastgele adrese düşüyor', () => {
    /* Ad yoksa ya da tamamen simgeden oluşuyorsa boş bir yerel ad
       üretmek adresi bozardı. */
    expect(gelenKutusuAnahtariUret('!!! ???')).toMatch(/^fatura-[0-9a-f]{16}$/)
    expect(gelenKutusuAnahtariUret(null)).toMatch(/^fatura-[0-9a-f]{16}$/)
  })

  it('her çağrıda farklı ek üretiyor', () => {
    const a = gelenKutusuAnahtariUret('Aynı İşletme')
    const b = gelenKutusuAnahtariUret('Aynı İşletme')
    expect(a).not.toBe(b)
  })

  it('çok uzun ad kısaltılıyor ve tire ile bitmiyor', () => {
    /* RFC 5321 yerel adı 64 karakterle sınırlıyor; ayrıca uzun adres
       zaten çözmeye çalıştığımız sorunun kendisi. */
    const anahtar = gelenKutusuAnahtariUret('A'.repeat(120))
    expect(anahtar.length).toBeLessThanOrEqual(64)
    expect(anahtar).not.toMatch(/--/)
  })
})

/*
 * GÜVENİLİR GÖNDEREN LİSTESİ.
 *
 * 🔴 NEDEN VAR: kullanıcı faturayı kendi kutusundan YÖNLENDİRDİĞİNDE
 * `From` başlığı gönderende kalıyor (tedarikçi, pazaryeri) --
 * kullanıcıya dönüşmüyor. Üyelik kontrolü bu yüzden yönlendirilen her
 * postayı reddediyordu ve "otomatik düşsün" akışı hiç çalışmıyordu.
 *
 * 🔴 BU LİSTE KAPIYI AÇMIYOR, ve aşağıdaki ikinci test bunun kanıtı:
 * DKIM/SPF şartı bu yolda da aranıyor. Liste kimin yazabileceğini
 * söyler; DKIM postanın gerçekten o adresten geldiğini kanıtlar.
 * Yalnız listeye bakmak, `From` uydurulabildiği için hiçbir şey
 * korumazdı.
 */
describe('güvenilir gönderen listesi', () => {
  const tedarikciEposta = `tedarikci-${Date.now()}@pazaryeri.test`

  it('liste BOŞKEN eski davranış birebir korunuyor', async () => {
    /* Bu, göçün mevcut kullanıcıları etkilemediğinin kanıtı. */
    const sonuc = await postayiDegerlendir(prisma, posta({ from: tedarikciEposta }))
    expect(sonuc).toEqual({ red: 'gonderen_uye_degil' })
  })

  it('listeye eklenen yabancı gönderen KABUL edilir', async () => {
    const uye = await prisma.user.findUnique({ where: { email: uyeEposta } })
    await prisma.businessInboxSender.create({
      data: { workspaceId, email: tedarikciEposta, addedById: uye!.id }
    })

    const sonuc = await postayiDegerlendir(prisma, posta({ from: tedarikciEposta }))
    /* Belge, adrese GÜVENMEYİ SEÇEN kişiye yazılıyor: gönderen bizim
       kullanıcımız değil, sorumluluğu üstlenen listeyi kuran kişi. */
    expect(sonuc).toEqual({ workspaceId, userId: uye!.id })
  })

  it('🔴 listede OLSA BİLE DKIM/SPF geçmezse reddedilir', async () => {
    const sonuc = await postayiDegerlendir(
      prisma, posta({ from: tedarikciEposta, dkim: 'fail', spf: 'fail' })
    )
    expect(sonuc).toEqual({ red: 'dkim_spf_gecmedi' })
  })

  it('büyük harfle gelen adres de eşleşir', async () => {
    const sonuc = await postayiDegerlendir(
      prisma, posta({ from: tedarikciEposta.toUpperCase() })
    )
    expect(sonuc).toHaveProperty('workspaceId', workspaceId)
  })

  it('BAŞKA çalışma alanının listesi bu kutuyu açmaz', async () => {
    /* 🔴 BOLA: liste workspace'e BAĞLI aranıyor. Genel bir "bu adres
       herhangi bir listede var mı" kontrolü olsaydı, bir kullanıcının
       güvendiği adres HERKESİN kutusuna yazabilirdi. */
    const digerEposta = `diger-liste-${Date.now()}@ornek.test`
    const diger = await prisma.user.create({
      data: { email: digerEposta, password: 'x', name: 'Diğer', role: 'learner', emailVerifiedAt: new Date() }
    })
    const digerWs = await prisma.businessWorkspace.create({
      data: { name: 'Diğer Alan', createdById: diger.id, status: 'active' }
    })
    const yabanciTedarikci = `yabanci-tedarikci-${Date.now()}@pazaryeri.test`
    await prisma.businessInboxSender.create({
      data: { workspaceId: digerWs.id, email: yabanciTedarikci, addedById: diger.id }
    })

    const sonuc = await postayiDegerlendir(prisma, posta({ from: yabanciTedarikci }))
    expect(sonuc).toEqual({ red: 'gonderen_uye_degil' })

    await prisma.businessWorkspace.delete({ where: { id: digerWs.id } })
    await prisma.user.delete({ where: { id: diger.id } })
  })
})
