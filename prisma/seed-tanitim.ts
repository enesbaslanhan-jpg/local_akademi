import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

/*
 * TANITIM EKRAN GÖRÜNTÜLERİ İÇİN ÖRNEK VERİ.
 *
 * Amaç: /hakkinda ve diğer tanıtım sayfalarındaki ürün görselleri boş
 * listeler ve ₺0 yerine gerçekçi bir işletme görünümü göstersin.
 *
 * ⚠️ BU VERİ GERÇEK MÜŞTERİ DEĞİLDİR VE ÖYLE SUNULMAZ.
 * Tanıtım sayfasında "N işletme bize güveniyor" gibi bir sayı ya da
 * müşteri görüşü olarak kullanılamaz. Yalnızca ürünün kendi arayüzünü
 * dolu hâliyle göstermek için var.
 *
 * ⚠️ HER SATIR İŞARETLİ. Kullanıcı e-postaları `@ornek.localkarar` ile
 * biter ve oluşturulan her şey o kullanıcılara bağlıdır. `--temizle`
 * tam olarak bunları siler; mevcut verine dokunmaz.
 *
 * Kullanım:
 *   node --env-file=.env --import tsx prisma/seed-tanitim.ts
 *   node --env-file=.env --import tsx prisma/seed-tanitim.ts --temizle
 */

const prisma = new PrismaClient()

/** Tek işaret. Silme bu deseni kullanır; değiştirilirse temizlik bozulur. */
const ISARET = '@ornek.localkarar'

type Isletme = {
  ad: string
  sahip: string
  sektor: string
  sehir: string
  kanallar: string[]
  aylikSatis: number
  aylikGider: number
  nakit: number
  saglayici: 'TRENDYOL' | 'HEPSIBURADA' | 'N11' | 'SHOPIFY' | 'WOOCOMMERCE' | null
  urunler: { ad: string; fiyat: number; stok: number; kategori: string }[]
  kayitlar: { tur: string; baslik: string; yon: string; tutar: number; gunSonra: number; durum?: string }[]
  paylasim?: string
}

/*
 * On işletme. Sektör, şehir ve kanal dağılımı bilinçli çeşitli: tanıtım
 * görselinde hepsi aynı tip işletme görünürse ürün dar bir kitleye
 * hitap ediyormuş gibi durur.
 *
 * Rakamlar tutarlı seçildi: aylık satış > aylık gider olan da var, sıkışan
 * da var. Hepsi kârlı görünseydi "Neyi yapmaz?" bölümündeki dürüst tonla
 * çelişirdi.
 */
const ISLETMELER: Isletme[] = [
  {
    ad: 'Deniz Tekstil', sahip: 'Deniz Yılmaz', sektor: 'Tekstil', sehir: 'Bursa',
    kanallar: ['magaza', 'pazaryeri'], aylikSatis: 284000, aylikGider: 212000, nakit: 96000,
    saglayici: 'TRENDYOL',
    urunler: [
      { ad: 'Premium Pamuk Kumaş 1m', fiyat: 189, stok: 340, kategori: 'Kumaş' },
      { ad: 'Keten Karışım Kumaş 1m', fiyat: 245, stok: 120, kategori: 'Kumaş' },
      { ad: 'Astar Kumaş 1m', fiyat: 74, stok: 890, kategori: 'Kumaş' },
    ],
    kayitlar: [
      { tur: 'receivable', baslik: 'Toptan sipariş tahsilatı', yon: 'receivable', tutar: 48500, gunSonra: 6 },
      { tur: 'payment', baslik: 'İplik tedarikçi ödemesi', yon: 'payable', tutar: 31200, gunSonra: 3 },
      { tur: 'shipment', baslik: 'İzmir sevkiyatı', yon: 'neutral', tutar: 0, gunSonra: 1 },
    ],
    paylasim: 'Kumaş metrajında fire oranını hesaba katmadan fiyat veriyormuşuz. Birim maliyeti yeniden çıkarınca aradaki fark %7 çıktı.',
  },
  {
    ad: 'Kahve Durağı', sahip: 'Elif Arslan', sektor: 'Kafe', sehir: 'İstanbul',
    kanallar: ['magaza'], aylikSatis: 148000, aylikGider: 131000, nakit: 34000,
    saglayici: null,
    urunler: [
      { ad: 'Filtre Kahve 250g', fiyat: 165, stok: 64, kategori: 'Kahve' },
      { ad: 'Espresso Blend 1kg', fiyat: 520, stok: 22, kategori: 'Kahve' },
    ],
    kayitlar: [
      { tur: 'payment', baslik: 'Kira ödemesi', yon: 'payable', tutar: 42000, gunSonra: 2 },
      { tur: 'payment', baslik: 'Süt ve ürün tedariki', yon: 'payable', tutar: 18400, gunSonra: 5 },
      { tur: 'receivable', baslik: 'Kurumsal kahve aboneliği', yon: 'receivable', tutar: 12500, gunSonra: 11 },
    ],
    paylasim: 'Kira artışından sonra fincan başı kârı yeniden hesapladım. Menüde üç üründe fiyat güncellemem gerekiyormuş.',
  },
  {
    ad: 'Atölye Ahşap', sahip: 'Murat Kaya', sektor: 'Mobilya', sehir: 'Ankara',
    kanallar: ['pazaryeri', 'web'], aylikSatis: 92000, aylikGider: 78000, nakit: 21000,
    saglayici: 'HEPSIBURADA',
    urunler: [
      { ad: 'Meşe Yan Sehpa', fiyat: 2450, stok: 8, kategori: 'Mobilya' },
      { ad: 'Ceviz Kitaplık', fiyat: 5900, stok: 3, kategori: 'Mobilya' },
    ],
    kayitlar: [
      { tur: 'promissory_note', baslik: 'Makine kredisi taksiti', yon: 'payable', tutar: 8750, gunSonra: 9 },
      { tur: 'receivable', baslik: 'Pazaryeri hakediş', yon: 'receivable', tutar: 16300, gunSonra: 14 },
    ],
    paylasim: 'Pazaryeri komisyonu ve kargo dahil edilince sehpada kâr marjı %31\'den %12\'ye düşüyordu. Fiyatı güncelledim.',
  },
  {
    ad: 'Yeşil Market', sahip: 'Ayşe Demir', sektor: 'Gıda', sehir: 'İzmir',
    kanallar: ['magaza', 'web'], aylikSatis: 310000, aylikGider: 289000, nakit: 47000,
    saglayici: 'SHOPIFY',
    urunler: [
      { ad: 'Organik Zeytinyağı 1L', fiyat: 420, stok: 156, kategori: 'Gıda' },
      { ad: 'Çiğ Bal 850g', fiyat: 385, stok: 74, kategori: 'Gıda' },
    ],
    kayitlar: [
      { tur: 'payment', baslik: 'Toptancı ödemesi', yon: 'payable', tutar: 64000, gunSonra: 4 },
      { tur: 'receivable', baslik: 'Web sipariş tahsilatı', yon: 'receivable', tutar: 28900, gunSonra: 2 },
      { tur: 'task', baslik: 'Stok sayımı', yon: 'neutral', tutar: 0, gunSonra: 7 },
    ],
  },
  {
    ad: 'Mavi Kırtasiye', sahip: 'Can Öztürk', sektor: 'Perakende', sehir: 'Eskişehir',
    kanallar: ['magaza'], aylikSatis: 76000, aylikGider: 81000, nakit: 9000,
    saglayici: null,
    urunler: [{ ad: 'Okul Seti', fiyat: 340, stok: 210, kategori: 'Kırtasiye' }],
    kayitlar: [
      { tur: 'payment', baslik: 'Dağıtımcı ödemesi', yon: 'payable', tutar: 22000, gunSonra: -2, durum: 'open' },
      { tur: 'receivable', baslik: 'Kurumsal fatura', yon: 'receivable', tutar: 14800, gunSonra: 8 },
    ],
    paylasim: 'Sezon dışında nakit sıkışıyoruz. Nakit dayanma süresini görünce stok alım takvimini değiştirdim.',
  },
  {
    ad: 'Nar Kozmetik', sahip: 'Zeynep Şahin', sektor: 'Kozmetik', sehir: 'Antalya',
    kanallar: ['pazaryeri', 'web'], aylikSatis: 196000, aylikGider: 152000, nakit: 88000,
    saglayici: 'TRENDYOL',
    urunler: [
      { ad: 'Nar Özlü Serum 30ml', fiyat: 640, stok: 92, kategori: 'Bakım' },
      { ad: 'Yüz Temizleme Jeli', fiyat: 285, stok: 148, kategori: 'Bakım' },
    ],
    kayitlar: [
      { tur: 'receivable', baslik: 'Pazaryeri hakediş', yon: 'receivable', tutar: 52400, gunSonra: 10 },
      { tur: 'payment', baslik: 'Ambalaj tedariki', yon: 'payable', tutar: 19700, gunSonra: 6 },
      { tur: 'shipment', baslik: 'Kargo teslimi', yon: 'neutral', tutar: 0, gunSonra: 1 },
    ],
  },
  {
    ad: 'Usta Servis', sahip: 'Hakan Doğan', sektor: 'Hizmet', sehir: 'Kocaeli',
    kanallar: ['web'], aylikSatis: 118000, aylikGider: 94000, nakit: 52000,
    saglayici: null,
    urunler: [],
    kayitlar: [
      { tur: 'receivable', baslik: 'Bakım sözleşmesi hakedişi', yon: 'receivable', tutar: 34000, gunSonra: 12 },
      { tur: 'payment', baslik: 'Yedek parça alımı', yon: 'payable', tutar: 11200, gunSonra: 3 },
    ],
    paylasim: 'Saatlik servis ücretini yol ve parça maliyetiyle birlikte hesaplamamışım. Karar aracı bunu net gösterdi.',
  },
  {
    ad: 'Pastane Buğday', sahip: 'Selin Aksoy', sektor: 'Gıda', sehir: 'Bursa',
    kanallar: ['magaza'], aylikSatis: 134000, aylikGider: 118000, nakit: 27000,
    saglayici: null,
    urunler: [{ ad: 'Yaş Pasta (orta boy)', fiyat: 780, stok: 12, kategori: 'Pastane' }],
    kayitlar: [
      { tur: 'payment', baslik: 'Un ve şeker tedariki', yon: 'payable', tutar: 26500, gunSonra: 5 },
      { tur: 'receivable', baslik: 'Toplu sipariş', yon: 'receivable', tutar: 9800, gunSonra: 4 },
    ],
  },
  {
    ad: 'Teknoloji Deposu', sahip: 'Emre Çelik', sektor: 'Elektronik', sehir: 'İstanbul',
    kanallar: ['pazaryeri', 'web'], aylikSatis: 442000, aylikGider: 398000, nakit: 121000,
    saglayici: 'N11',
    urunler: [
      { ad: 'Kablosuz Kulaklık', fiyat: 1290, stok: 46, kategori: 'Aksesuar' },
      { ad: 'Taşınabilir Şarj 20000mAh', fiyat: 890, stok: 118, kategori: 'Aksesuar' },
    ],
    kayitlar: [
      { tur: 'receivable', baslik: 'Pazaryeri hakediş', yon: 'receivable', tutar: 96000, gunSonra: 15 },
      { tur: 'payment', baslik: 'İthalat ödemesi', yon: 'payable', tutar: 128000, gunSonra: 8 },
      { tur: 'promissory_note', baslik: 'Senet ödemesi', yon: 'payable', tutar: 45000, gunSonra: 20 },
    ],
    paylasim: 'İade oranını maliyete katınca en çok sattığımız üründe kârın çok düşük olduğunu gördük.',
  },
  {
    ad: 'Butik Ada', sahip: 'Merve Yıldız', sektor: 'Giyim', sehir: 'Muğla',
    kanallar: ['magaza', 'pazaryeri'], aylikSatis: 88000, aylikGider: 72000, nakit: 31000,
    saglayici: 'WOOCOMMERCE',
    urunler: [
      { ad: 'Keten Elbise', fiyat: 1450, stok: 24, kategori: 'Giyim' },
      { ad: 'Pamuk Gömlek', fiyat: 890, stok: 41, kategori: 'Giyim' },
    ],
    kayitlar: [
      { tur: 'receivable', baslik: 'Sezon sonu tahsilat', yon: 'receivable', tutar: 21500, gunSonra: 9 },
      { tur: 'payment', baslik: 'Vitrin yenileme', yon: 'payable', tutar: 8600, gunSonra: 13 },
    ],
  },
]

function eposta(ad: string) {
  const slug = ad.toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')
  return `${slug}${ISARET}`
}

const gun = (n: number) => new Date(Date.now() + n * 86400000)

async function temizle() {
  const kullanicilar = await prisma.user.findMany({
    where: { email: { endsWith: ISARET } },
    select: { id: true },
  })
  if (kullanicilar.length === 0) {
    console.log('Silinecek örnek veri yok.')
    return
  }
  const idler = kullanicilar.map((k) => k.id)

  /* Workspace'ler `createdById` üzerinden bulunuyor; onları silmek
     kayıt/ürün/entegrasyonu cascade ile götürüyor (şemada onDelete:
     Cascade tanımlı). Paylaşımlar kullanıcıya bağlı, o da cascade. */
  const wsler = await prisma.businessWorkspace.findMany({
    where: { createdById: { in: idler } },
    select: { id: true },
  })
  await prisma.businessWorkspace.deleteMany({ where: { id: { in: wsler.map((w) => w.id) } } })
  await prisma.user.deleteMany({ where: { id: { in: idler } } })

  console.log(`Silindi: ${idler.length} kullanıcı, ${wsler.length} işletme (ve bağlı tüm kayıtlar).`)
}

/*
 * Ekran goruntusu cekecek hesabi demo isletmelere UYE yapar.
 *
 * Gerekli: veri ayri hesaplara ait oldugu icin, giris yapmis kullanici
 * bu isletmeleri aksi halde GOREMEZ ve cekim yapilamaz.
 *
 * Uyelik satiri demo isletmede duruyor; `--temizle` isletmeyi silince
 * uyelik de gidiyor. Kullanicinin kendi verisine dokunulmuyor.
 */
async function uyeYap(epostaAdresi: string, wsIdler: string[]) {
  const k = await prisma.user.findUnique({ where: { email: epostaAdresi } })
  if (!k) {
    console.log("UYARI: " + epostaAdresi + " bulunamadi, uyelik eklenmedi.")
    return
  }
  for (const wsId of wsIdler) {
    await prisma.businessMember.upsert({
      where: { workspaceId_userId: { workspaceId: wsId, userId: k.id } },
      update: { role: "owner", status: "active" },
      create: { workspaceId: wsId, userId: k.id, role: "owner", status: "active" },
    })
  }
  console.log(epostaAdresi + " -> " + wsIdler.length + " ornek isletmeye uye yapildi.")
}

async function olustur(gozlemciEposta?: string) {
  /* Parola her çalıştırmada rastgele: bu hesaplar giriş için değil,
     yalnız ekran görüntüsünde veri göstermek için var. Sabit bir parola
     yazmak, depoya kimlik bilgisi gömmek olurdu. */
  const parola = await bcrypt.hash(
    'ornek-' + Math.random().toString(36).slice(2) + Date.now().toString(36),
    10,
  )

  let sayac = { ws: 0, kayit: 0, urun: 0, entegrasyon: 0, paylasim: 0, kisi: 0 }
  const wsIdler: string[] = []

  for (const isletme of ISLETMELER) {
    const kullanici = await prisma.user.create({
      data: {
        email: eposta(isletme.sahip),
        password: parola,
        name: isletme.sahip,
        role: 'student',
        emailVerifiedAt: new Date(),
        location: isletme.sehir,
        bio: `${isletme.sektor} · ${isletme.sehir}`,
      },
    })

    const ws = await prisma.businessWorkspace.create({
      data: {
        name: isletme.ad,
        sector: isletme.sektor,
        city: isletme.sehir,
        currency: 'TRY',
        salesChannels: JSON.stringify(isletme.kanallar),
        monthlySales: isletme.aylikSatis,
        monthlyExpenses: isletme.aylikGider,
        cashBalance: isletme.nakit,
        status: 'active',
        createdById: kullanici.id,
        members: { create: { userId: kullanici.id, role: 'owner', status: 'active' } },
      },
    })
    wsIdler.push(ws.id)
    sayac.ws++

    const kisi = await prisma.businessContact.create({
      data: {
        workspaceId: ws.id,
        type: 'customer',
        name: `${isletme.sektor} Toptan A.Ş.`,
        city: isletme.sehir,
        createdById: kullanici.id,
      },
    })
    sayac.kisi++

    for (const k of isletme.kayitlar) {
      await prisma.businessRecord.create({
        data: {
          workspaceId: ws.id,
          type: k.tur,
          title: k.baslik,
          direction: k.yon,
          amount: k.tutar || null,
          currency: 'TRY',
          status: k.durum ?? 'open',
          priority: k.gunSonra < 0 ? 'high' : 'normal',
          dueAt: gun(k.gunSonra),
          contactId: k.yon === 'receivable' ? kisi.id : null,
          createdById: kullanici.id,
        },
      })
      sayac.kayit++
    }

    if (isletme.saglayici) {
      await prisma.integrationConnection.create({
        data: {
          workspaceId: ws.id,
          createdByUserId: kullanici.id,
          provider: isletme.saglayici as any,
          externalAccountId: `ornek-${ws.id.slice(0, 8)}`,
          displayName: `${isletme.ad} mağazası`,
          status: 'ACTIVE',
          lastSyncedAt: gun(0),
          lastSuccessfulSyncAt: gun(0),
          syncEnabled: true,
        },
      })
      sayac.entegrasyon++

      for (const u of isletme.urunler) {
        await prisma.marketplaceProduct.create({
          data: {
            workspaceId: ws.id,
            provider: isletme.saglayici as any,
            externalId: `ornek-${Math.random().toString(36).slice(2, 10)}`,
            title: u.ad,
            category: u.kategori,
            salePrice: u.fiyat,
            stockQuantity: u.stok,
            currency: 'TRY',
            isActive: true,
          },
        })
        sayac.urun++
      }
    }

    if (isletme.paylasim) {
      await prisma.communityPost.create({
        data: {
          authorId: kullanici.id,
          postType: 'user',
          summary: isletme.paylasim,
          category: isletme.sektor,
          status: 'approved',
          publishedAt: gun(-Math.floor(Math.random() * 20) - 1),
        },
      })
      sayac.paylasim++
    }
  }

  console.log('Örnek veri oluşturuldu:')
  console.log(`  ${sayac.ws} işletme, ${sayac.kayit} kayıt, ${sayac.urun} ürün,`)
  console.log(`  ${sayac.entegrasyon} entegrasyon, ${sayac.paylasim} paylaşım, ${sayac.kisi} kişi.`)
  console.log(`\nTemizlemek için: --temizle`)

  if (gozlemciEposta) await uyeYap(gozlemciEposta, wsIdler)
}

async function main() {
  const temizleMi = process.argv.includes('--temizle')
  /* --kullanici=<eposta>: bu hesap demo isletmelere uye yapilir ki
     ekran goruntusu cekerken onlari gorebilsin. */
  const gozlemci = process.argv.find((a) => a.startsWith('--kullanici='))?.split('=')[1]
  if (temizleMi) await temizle()
  else {
    await temizle() /* Tekrar çalıştırmada kopya oluşmasın. */
    await olustur(gozlemci)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
