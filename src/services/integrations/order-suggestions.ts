import type { Prisma, PrismaClient } from '@prisma/client'
import type { RecordSuggestionPayload } from '../document-suggestions.js'

/*
 * PAZARYERI SIPARISI -> ONAY BEKLEYEN KAYIT ONERISI.
 *
 * 🔴 NEDEN BU KOPRU VAR: siparisler `MarketplaceOrder` tablosuna
 * dusuyordu ama Isletme Takibi'ne, takvime, hatirlatmalara ve 30
 * gunluk tahsilat toplamina HIC girmiyordu. Ayarlardaki kart ise
 * "siparisler esitlenip isletme takibine dussun" diyordu. Marketci
 * tahsilatini iki ayri yerden takip etmek zorunda kaliyordu -- bu
 * isin baslangictaki gerekcesi tam olarak buydu.
 *
 * 🔴 NEDEN GUNLUK OZET, SIPARIS BASINA DEGIL: marketci gunde 40
 * hareket yapiyor. Siparis basina oneri, gunde 40 onay kuyrugu
 * demekti; kullanicinin uygulamayi ikinci gun birakmasinin sebebi tam
 * olarak bu tur bir yuktu. Nakit takibinde dogru soru "37. siparis ne
 * kadardi" degil, "bugun ne kadar tahsilat dustu".
 *
 * 🔴 OTOMATIK KAYIT YAZILMIYOR: oneri `proposed` olarak bekliyor,
 * `BusinessRecord` ancak kullanici onaylayinca olusuyor. Bu ilke
 * depoda zaten yazili (oneri kabulunde `createdById: user.id`) ve
 * korunuyor -- yanlis yazilan veri, hic yazilmayan veriden kotudur.
 */

/** Iptal/iade edilen siparis tahsilat uretmez. */
const HARIC_DURUMLAR = ['CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED']

const SAGLAYICI_ADI: Record<string, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  N11: 'n11',
  SHOPIFY: 'Shopify'
}

/** `marketplace:TRENDYOL:2026-08-24` — gun basina tekil kaynak kimligi. */
export function siparisOzetiAnahtari(provider: string, gun: string): string {
  return `marketplace:${provider}:${gun}`
}

/** Yerel gun sinirini degil, UTC gununu kullanir; esitleme de UTC. */
function gunAnahtari(tarih: Date): string {
  return tarih.toISOString().slice(0, 10)
}

function sayi(deger: Prisma.Decimal | null): number {
  return deger === null ? 0 : Number(deger)
}

export type SiparisOzeti = {
  gun: string
  provider: string
  siparisSayisi: number
  brut: number
  /* Komisyon/kargo/iade dusulmus hâli. Saglayici bu alanlari
     vermiyorsa null kalir ve brut kullanilir -- ama aciklamada
     bunun tahmin degil eksik veri oldugu YAZILIR. */
  net: number | null
}

/*
 * Bir gunun siparislerini saglayici bazinda toplar.
 *
 * Yalniz ONERISI HENUZ URETILMEMIS gunler doner: `sourceKey` uzerindeki
 * benzersizlik kisiti ikinci kaydi zaten reddederdi, ama gereksiz
 * yazma denemesi yapmamak icin burada da suzuluyor.
 */
export async function bekleyenGunlukOzetler(
  db: PrismaClient | Prisma.TransactionClient,
  workspaceId: string,
  gunler: Array<{ provider: string; gun: string }>
): Promise<SiparisOzeti[]> {
  if (gunler.length === 0) return []

  const anahtarlar = gunler.map(g => siparisOzetiAnahtari(g.provider, g.gun))
  const mevcut = await db.documentSuggestion.findMany({
    where: { workspaceId, sourceKey: { in: anahtarlar } },
    select: { sourceKey: true }
  })
  const uretilmis = new Set(mevcut.map(m => m.sourceKey))

  const ozetler: SiparisOzeti[] = []
  for (const { provider, gun } of gunler) {
    if (uretilmis.has(siparisOzetiAnahtari(provider, gun))) continue

    const baslangic = new Date(`${gun}T00:00:00.000Z`)
    const bitis = new Date(`${gun}T23:59:59.999Z`)
    const siparisler = await db.marketplaceOrder.findMany({
      where: {
        workspaceId,
        provider: provider as any,
        orderDate: { gte: baslangic, lte: bitis },
        status: { notIn: HARIC_DURUMLAR as any[] }
      },
      select: { grossAmount: true, netContribution: true }
    })
    if (siparisler.length === 0) continue

    const brut = siparisler.reduce((t, s) => t + sayi(s.grossAmount), 0)
    /* Saglayicilarin BIR KISMI komisyon/kargo vermiyor. Eksik veriyi
       sifir sayip "net" diye sunmak, kullaniciya gercekte alacagindan
       fazlasini vaat etmek olurdu. Hepsi doluysa net, degilse null. */
    const netVar = siparisler.every(s => s.netContribution !== null)
    const net = netVar
      ? siparisler.reduce((t, s) => t + sayi(s.netContribution), 0)
      : null

    ozetler.push({ gun, provider, siparisSayisi: siparisler.length, brut, net })
  }
  return ozetler
}

/*
 * Odeme vadesi: siparis gunu + kullanicinin girdigi gun sayisi.
 *
 * 🔴 GOMULU VARSAYILAN YOK. Odeme tarihi hicbir saglayicinin
 * API'sinde bulunmuyor; "Trendyol 14 gunde oder" gibi bir varsayilan
 * yanlis oldugunda SESSIZCE hatali nakit tahmini uretirdi. Kullanici
 * girmediyse vade yazilmiyor -- kayit yine olusuyor, yalnizca takvime
 * ve 30 gunluk toplama girmiyor.
 */
export function vadeHesapla(gun: string, gecikmeGunu: number | null): string | null {
  if (gecikmeGunu === null || !Number.isFinite(gecikmeGunu) || gecikmeGunu < 0) return null
  const tarih = new Date(`${gun}T00:00:00.000Z`)
  tarih.setUTCDate(tarih.getUTCDate() + gecikmeGunu)
  return tarih.toISOString()
}

export function ozettenOneriUret(
  ozet: SiparisOzeti,
  paraBirimi: string,
  odemeGecikmesiGunu: number | null = null
) {
  const ad = SAGLAYICI_ADI[ozet.provider] ?? ozet.provider
  const [yil, ay, gun] = ozet.gun.split('-')
  const okunurGun = `${gun}.${ay}.${yil}`

  const payload: RecordSuggestionPayload = {
    type: 'receivable',
    title: `${ad} — ${okunurGun} tarihli ${ozet.siparisSayisi} sipariş`,
    description: ozet.net !== null
      ? `${ad} üzerinden ${ozet.siparisSayisi} sipariş. Tutar komisyon, kargo ve iadeler düşülerek hesaplandı.`
      : `${ad} üzerinden ${ozet.siparisSayisi} sipariş. BRÜT tutardır — bu sağlayıcı komisyon ve kargo bilgisini vermediği için kesintiler düşülemedi; eline geçecek tutar daha düşük olacaktır.`,
    direction: 'receivable',
    amount: ozet.net ?? ozet.brut,
    currency: paraBirimi || 'TRY',
    /* Vade YALNIZCA kullanici odeme gununu girdiyse yaziliyor
       (bkz. `vadeHesapla`). Girmediyse null kaliyor -- uydurma vade
       yanlis hatirlatma kurardi; ayni karar e-Fatura yolunda da
       verilmisti. */
    dueAt: vadeHesapla(ozet.gun, odemeGecikmesiGunu),
    priority: 'normal'
  }

  return {
    suggestionType: 'business_record',
    payload,
    /* Sayilar veritabanindan toplaniyor, metinden tahmin edilmiyor.
       Ama net veri eksikse guven dusuruluyor: kullanici tutari
       gozden gecirmeli. */
    confidence: ozet.net !== null ? 1 : 0.6,
    evidence: {
      kaynak: 'marketplace_order_daily',
      provider: ozet.provider,
      gun: ozet.gun,
      siparisSayisi: ozet.siparisSayisi,
      brut: ozet.brut,
      net: ozet.net
    }
  }
}

/*
 * Esitleme sonrasi cagrilir: dokunulan gunler icin oneri uretir.
 *
 * Hata halinde FIRLATMAZ. Oneri uretimi esitlemenin yan urunu; burada
 * cikan bir sorun, basariyla cekilmis siparis verisinin kaydini geri
 * almamali.
 */
export async function siparisOnerileriniUret(
  db: PrismaClient,
  workspaceId: string,
  provider: string,
  siparisTarihleri: Date[],
  paraBirimi = 'TRY',
  odemeGecikmesiGunu: number | null = null
): Promise<number> {
  const gunler = [...new Set(siparisTarihleri.map(gunAnahtari))]
    .map(gun => ({ provider, gun }))
  if (gunler.length === 0) return 0

  const ozetler = await bekleyenGunlukOzetler(db, workspaceId, gunler)
  let uretilen = 0

  for (const ozet of ozetler) {
    const oneri = ozettenOneriUret(ozet, paraBirimi, odemeGecikmesiGunu)
    try {
      await db.documentSuggestion.create({
        data: {
          workspaceId,
          documentId: null,
          sourceKey: siparisOzetiAnahtari(ozet.provider, ozet.gun),
          suggestionType: oneri.suggestionType,
          payload: JSON.stringify(oneri.payload),
          confidence: oneri.confidence,
          evidence: JSON.stringify(oneri.evidence),
          status: 'proposed'
        }
      })
      uretilen++
    } catch (hata: any) {
      /* P2002 = benzersizlik ihlali: iki esitleme ayni anda kostu ve
         digeri onceden yazdi. Beklenen bir yaris; hata degil. */
      if (hata?.code !== 'P2002') throw hata
    }
  }
  return uretilen
}
