import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const now = new Date()
const reviewDue = new Date(now.getTime() + 90 * 86_400_000)

type Question = { q: string; o: string[]; a: string; e: string }
type Card = { front: string; back: string; hint: string }
type PilotSpec = {
  code: string
  title: string
  minutes: number
  archetype: string
  summary: string
  outcomes: string[]
  content: string
  quiz: Question[]
  cards: Card[]
  task: {
    title: string
    description: string
    instructions: string
    exampleOutput: string
    checklist: string[]
    rubric: string
  }
}

const sourceSpecs = [
  {
    title: 'KGK — Türkiye Muhasebe Standardı 2 (TMS 2): Stoklar',
    url: 'https://kgk.gov.tr/Portalv2Uploads/files/Duyurular/v2/TMS/TMS_2_Stoklar.pdf',
    authorityLevel: 'high',
  },
  {
    title: 'U.S. Small Business Administration — Break-even Point',
    url: 'https://www.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point',
    authorityLevel: 'high',
  },
  {
    title: 'Gelir İdaresi Başkanlığı — Katma Değer Vergisi Kanunu',
    url: 'https://www.gib.gov.tr/mevzuat/kanun/436',
    authorityLevel: 'high',
  },
]

const specs: PilotSpec[] = [
  {
    code: 'CUR-021-04',
    title: 'Gerçek Birim Maliyet — Uygulama',
    minutes: 18,
    archetype: 'cost-matrix',
    summary: 'Bir ürünün görünmeyen maliyetlerini gerçek işletme verisiyle birim seviyesine indirir.',
    outcomes: [
      'Doğrudan, operasyonel ve dönemsel maliyetleri ayırmak',
      'Sabit giderleri savunulabilir bir dağıtım anahtarıyla birime yüklemek',
      'İade ve fire riskini beklenen birim kayıp olarak hesaplamak',
    ],
    content: `## Karar problemi

Satış fiyatını yalnızca alış veya hammadde tutarına göre belirlemek, ürün satıldıkça nakit kaybettiren bir model yaratabilir. Ama bütün işletme giderlerini gelişigüzel tek ürüne yüklemek de fiyatı gereksiz yükseltir. Amaç “mümkün olan en yüksek maliyeti” değil, **kararla ilişkili ve izlenebilir gerçek birim maliyeti** bulmaktır.

## 1. Maliyet haritasını kur

TMS 2; satın alma, dönüştürme ve stokları mevcut konum ve durumuna getirmek için katlanılan diğer maliyetleri stok maliyetinin bileşenleri olarak ele alır.[1] Bu muhasebe çerçevesi, yönetim fiyatlandırmasıyla tamamen aynı şey değildir; fakat hangi maliyetin ürünle ilişkilendirilebileceğini düşünmek için güvenilir bir başlangıçtır.

| Katman | Örnekler | Birime çevirme |
|---|---|---:|
| Doğrudan | ürün/ham madde, doğrudan işçilik | gerçekleşen toplam ÷ sağlam üretim |
| Sipariş operasyonu | ambalaj, hazırlama, kargo desteği | sipariş başına gerçekleşen ortalama |
| Sabit kapasite | kira, yazılım, ekipman, yönetim | uygun faaliyet ölçüsüyle dağıtım |
| Kalite riski | fire, hasar, iade sonrası değer kaybı | olay oranı × olay başına ortalama kayıp |

> **Önemli:** KDV, komisyon ve ödeme kesintisini aynı sepete atma. Komisyon satış fiyatının yüzdesiyse birim başına sabit tutar değildir. KDV ise işletmenin durumuna ve işleme göre farklı sonuçlar doğurabilir; bu dersteki yönetim fiyatı KDV hariç ele alınır.[3]

## 2. Payda hatasını önle

Bir ayda 1.000 ürün üretilmiş, 40 ürün fire olmuşsa birim üretim maliyetini 1.000’e değil, satılabilir **960 birime** bölmek gerekir. Aksi halde fire görünmez olur.

Örnek:

| Kalem | Aylık tutar |
|---|---:|
| Malzeme ve doğrudan işçilik | 96.000 TL |
| Ürünle ilişkili üretim gideri | 24.000 TL |
| Sağlam üretim | 960 adet |

**Üretim birim maliyeti = 120.000 ÷ 960 = 125 TL**

Ambalaj 6 TL, sipariş operasyonu 4 TL ve beklenen iade kaybı 5 TL ise yönetim amaçlı gerçek birim maliyet **140 TL** olur.

## 3. Sabit gider payını savun

Dağıtım anahtarı maliyeti neyin doğurduğuna yaklaşmalıdır:

- makine ağırlıklı üretimde makine saati,
- emek yoğun hizmette çalışma saati,
- depo operasyonunda sipariş veya hacim,
- ortak yazılım giderinde aktif kullanıcı ya da işlem sayısı.

Normal kapasite ile fiilî kapasite çok farklıysa sonuç ayrıca gösterilmelidir. Düşük kapasite döneminin bütün yükünü tek ayın ürününe bindirmek, kalıcı fiyat kararı için yanıltıcı olabilir.

## 4. Kontrol testi

Gerçek birim maliyet hesabını şu üç kontrolle kapat:

1. Toplam birim maliyet × adet, ilgili dönem toplamına makul ölçüde dönüyor mu?
2. Geçen aya göre büyük farkın veriyle açıklaması var mı?
3. Aynı maliyet iki katmanda iki kez sayılmış mı?

## Uygulamada kullan

[Fiyat Mimarisi ve Hedef Marj aracını aç](/app/tools?tool=fiyat_mimarisi). Kendi ürününden son 30–90 günlük gerçekleşen veriyi kullan. “Risk payı %3 olsun” gibi ezber oran yerine, iade oranı ile iade başına ortalama kaybı çarp.

## Kaynakça

1. [KGK, TMS 2 Stoklar — özellikle par. 10–16](https://kgk.gov.tr/Portalv2Uploads/files/Duyurular/v2/TMS/TMS_2_Stoklar.pdf), erişim: 28.07.2026.
2. [U.S. SBA, Break-even Point](https://www.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point), erişim: 28.07.2026.
3. [GİB, Katma Değer Vergisi Kanunu — matrah hükümleri](https://www.gib.gov.tr/mevzuat/kanun/436), erişim: 28.07.2026.

*Bu içerik yönetim kararı içindir; muhasebe kaydı veya vergi görüşü değildir.*`,
    quiz: [
      { q: '1.000 üretimin 40 adedi fireyse maliyet hangi adede bölünmelidir?', o: ['960', '1.000', '1.040', '40'], a: '960', e: 'Satılabilir sağlam üretim 1.000 − 40 = 960 adettir; aksi seçim fire maliyetini gizler.' },
      { q: 'İade risk payı için en savunulabilir yöntem hangisidir?', o: ['İade oranı × iade başına ortalama kayıp', 'Her ürüne ezbere %5', 'Yalnız en pahalı iade', 'İadeleri hiç saymamak'], a: 'İade oranı × iade başına ortalama kayıp', e: 'Beklenen kayıp, işletmenin gerçekleşen sıklık ve şiddet verisini birleştirir.' },
      { q: 'Makine ağırlıklı üretimde hangi dağıtım anahtarı genellikle daha anlamlıdır?', o: ['Makine saati', 'Ürün adının harf sayısı', 'Takvim günü', 'Müşteri yaşı'], a: 'Makine saati', e: 'Dağıtım anahtarı maliyeti doğuran faaliyetle ilişkili olmalıdır.' },
      { q: 'Hangisi satış fiyatına bağlı yüzde ise sabit birim maliyet gibi eklenmemelidir?', o: ['Pazar yeri komisyonu', 'Kutu bedeli', 'Ürün başı etiket', 'Birim işçilik'], a: 'Pazar yeri komisyonu', e: 'Yüzdesel komisyon, henüz bulunmaya çalışılan satış fiyatı üzerinden oluşur.' },
      { q: '120.000 TL ilişkili maliyet ve 960 sağlam üründe üretim birim maliyeti kaçtır?', o: ['125 TL', '120 TL', '115,20 TL', '80 TL'], a: '125 TL', e: 'İlişkili toplam maliyet sağlam üretime bölünür: 120.000 ÷ 960 = 125 TL.' },
    ],
    cards: [
      { front: 'Gerçek birim maliyetin dört katmanı nedir?', back: 'Doğrudan maliyet, sipariş operasyonu, dağıtılmış sabit kapasite gideri ve beklenen kalite/iade kaybı.', hint: 'Ürün, işlem, kapasite, risk' },
      { front: 'Fire varsa payda neden toplam üretim değildir?', back: 'Satılamayan birimler maliyet taşır; maliyet sağlam/satılabilir birimlere yayılmalıdır.', hint: 'Satılabilir adet' },
      { front: 'Beklenen iade kaybı nasıl bulunur?', back: 'Gerçekleşen iade oranı × iade başına ortalama net kayıp.', hint: 'Sıklık × şiddet' },
      { front: 'Dağıtım anahtarı neyi izlemelidir?', back: 'Maliyeti doğuran faaliyet veya kapasite kullanımını.', hint: 'Neden–sonuç' },
      { front: 'Komisyon neden sabit tutar değildir?', back: 'Sözleşmede satış fiyatının yüzdesi ise fiyat değiştikçe komisyon tutarı da değişir.', hint: 'Fiyata bağlı' },
      { front: 'Birim maliyet kontrol toplamı nedir?', back: 'Birim maliyet × ilgili adet, dönem toplamıyla makul biçimde uzlaşmalıdır.', hint: 'Geri çarp' },
    ],
    task: {
      title: 'Bir ürün için gerçek maliyet kartı',
      description: 'Kendi işletmendeki tek bir ürün veya hizmetin son 30–90 günlük verisiyle maliyet kartını çıkar.',
      instructions: 'Doğrudan maliyetleri, sipariş operasyonunu, sabit gider dağıtımını ve gerçekleşen risk kaybını ayrı göster. Dağıtım anahtarını ve veri dönemini yaz. Sonucu mevcut fiyatla karşılaştır.',
      exampleOutput: 'Ürün A: doğrudan 92 TL + operasyon 14 TL + sabit pay 18 TL + beklenen iade kaybı 6 TL = 130 TL. Veri dönemi: son 60 gün. Dağıtım anahtarı: makine saati.',
      checklist: ['Veri dönemi yazıldı', 'Satılabilir adet kullanıldı', 'Dağıtım anahtarı açıklandı', 'İade/fire gerçekleşen veriye dayandı', 'Çifte sayım kontrol edildi'],
      rubric: 'Tam (4): tüm katmanlar veriye dayalı ve kontrol toplamı var. İyi (3): bir varsayım belgelenmemiş. Gelişiyor (2): sabit gider veya risk eksik. Başlangıç (1): yalnız alış/hammadde tutarı var.',
    },
  },
  {
    code: 'CUR-034-04',
    title: 'Satış Marjı — Uygulama',
    minutes: 15,
    archetype: 'concept-comparison',
    summary: 'Maliyet üzerine ek oran ile satış marjını ayırır ve hedef marjdan doğru fiyatı çözer.',
    outcomes: ['Ek oran ve satış marjının farklı tabanlarını açıklamak', 'Hedef marjdan fiyatı ters denklemle bulmak', 'Sonucu birim katkı ile kontrol etmek'],
    content: `## Aynı yüzde, iki farklı sonuç

“Maliyetin üzerine %25 ekledim” cümlesi, “satış marjım %25” demek değildir. İlkinin tabanı **maliyet**, ikincinin tabanı **satış fiyatıdır**.

![100 TL maliyette ek oran ve satış marjı karşılaştırması](/academy-visuals/pricing-margin/markup-margin.svg)

## İki denklem

**Maliyet üzerine ek oran (markup):**

\`Fiyat = Maliyet × (1 + ek oran)\`

**Satış marjı:**

\`Marj = (Fiyat − ilgili maliyet) ÷ Fiyat\`

100 TL maliyete %25 eklenirse fiyat 125 TL olur. Kazanç 25 TL’dir; satış marjı 25 ÷ 125 = **%20** çıkar.

Hedef satış marjı %25 ise denklem ters çözülür:

\`Fiyat = Maliyet ÷ (1 − hedef marj)\`

\`100 ÷ 0,75 = 133,33 TL\`

## Hangi “maliyet”?

Marjın adı, paydan önce hangi maliyetlerin düşüldüğünü açıkça söylemelidir:

- **ürün katkı marjı:** satış fiyatı − ürünle birlikte değişen maliyetler,
- **kanal sonrası marj:** ayrıca komisyon ve ödeme kesintileri düşülür,
- **brüt marj:** finansal raporlama sınıflandırmasına bağlıdır,
- **net marj:** işletmenin dönemsel tüm gelir ve giderlerini içerir.

Bu nedenle “marj %30” tek başına eksik bir cümledir. Dönem, KDV durumu, kanal ve maliyet kapsamı yazılmalıdır.

## Hızlı hata testi

Maliyet 150 TL, fiyat 200 TL ise:

- maliyet üzerine ek oran = 50 ÷ 150 = **%33,33**
- satış marjı = 50 ÷ 200 = **%25**

İki oranın aynı çıkması ancak kazanç sıfırken mümkündür.

## Karar bağlantısı

Marj tek başına yeterli değildir. 10 TL katkılı 1.000 satış ile 100 TL katkılı 50 satış farklı toplam sonuç üretir. Başabaş analizi sabit maliyetleri birim katkıya böler; SBA da başabaş adedini sabit maliyet ÷ (fiyat − birim değişken maliyet) biçiminde açıklar.[2]

## Maliyet artışını doğru yorumla

Maliyet ve fiyatın aynı yüzdeyle artması marjın mutlaka düşeceği anlamına gelmez. Başlangıçta maliyet 100 TL, fiyat 125 TL ve satış marjı %20 olsun. İkisi de %10 artarsa maliyet 110 TL, fiyat 137,50 TL, katkı 27,50 TL ve marj yine %20’dir. Buna karşılık maliyet %10 artarken fiyat değişmezse marj (125 − 110) ÷ 125 = **%12** olur.

Bu yüzden “tedarikçi %10 zam yaptı, fiyata %10 ekledim” cümlesi şu kontroller olmadan tamamlanmış sayılmaz:

- Kanal komisyonu ve ödeme kesintisi de yeni fiyatla arttı mı?
- Yuvarlama veya sabit etiket kuralı hedef oranı değiştirdi mi?
- Yeni fiyat talep ve satış karmasını etkiledi mi?
- Hesaplanan oran ürün katkısı mı, kanal sonrası marj mı?

Marj köprüsü hazırlarken başlangıç katkısını; maliyet değişimi, fiyat değişimi, kanal kesintisi ve ürün karması etkisi olarak ayrı satırlarda göster. Böylece sonucun hangi karardan kaynaklandığı görünür olur.

## Kaynakça

1. [KGK, TMS 2 Stoklar](https://kgk.gov.tr/Portalv2Uploads/files/Duyurular/v2/TMS/TMS_2_Stoklar.pdf), erişim: 28.07.2026.
2. [U.S. SBA, Break-even Point](https://www.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point), erişim: 28.07.2026.

*Formüller yönetim analizi içindir; finansal tablo sınıflandırması işletmenin raporlama çerçevesine göre değerlendirilir.*`,
    quiz: [
      { q: '100 TL maliyete %25 eklenirse satış marjı kaç olur?', o: ['%20', '%25', '%33,33', '%125'], a: '%20', e: 'Fiyat 125 TL, kazanç 25 TL; satış marjı 25 ÷ 125 = %20.' },
      { q: '100 TL maliyette hedef satış marjı %25 ise fiyat kaçtır?', o: ['133,33 TL', '125 TL', '120 TL', '150 TL'], a: '133,33 TL', e: '100 ÷ (1 − 0,25) = 133,33 TL.' },
      { q: 'Satış marjının paydası nedir?', o: ['Satış fiyatı', 'Maliyet', 'Sabit gider', 'Stok adedi'], a: 'Satış fiyatı', e: 'Marj, kazancın satış fiyatındaki payını gösterir.' },
      { q: '“Marjımız %30” ifadesinde hangi bilgi eksiktir?', o: ['Maliyet kapsamı ve dönem', 'Logo rengi', 'Şirket kuruluş günü', 'Ürün barkodu'], a: 'Maliyet kapsamı ve dönem', e: 'Hangi maliyetlerin düşüldüğü ve hangi dönem/kanalın ölçüldüğü bilinmeden oran yorumlanamaz.' },
      { q: '150 TL maliyet, 200 TL fiyatta satış marjı kaçtır?', o: ['%25', '%33,33', '%50', '%75'], a: '%25', e: 'Kazanç 50 TL’dir ve satış fiyatına bölünür: (200 − 150) ÷ 200 = %25.' },
    ],
    cards: [
      { front: 'Maliyet üzerine ek oran formülü nedir?', back: 'Fiyat ile maliyet farkı maliyete bölünür: (Fiyat − maliyet) ÷ maliyet.', hint: 'Taban maliyet' },
      { front: 'Satış marjı formülü nedir?', back: 'Fiyat ile ilgili maliyet farkı satış fiyatına bölünür: (Fiyat − ilgili maliyet) ÷ fiyat.', hint: 'Taban satış' },
      { front: 'Hedef marjdan fiyat nasıl bulunur?', back: 'İlgili maliyet, bir eksi hedef marja bölünür: maliyet ÷ (1 − hedef marj).', hint: 'Ters çöz' },
      { front: '100 TL maliyete %25 eklemek kaç marj verir?', back: 'Fiyat 125 TL olur; satış marjı %20’dir.', hint: '25 ÷ 125' },
      { front: 'Birim katkı nedir?', back: 'Fiyattan satışla birlikte değişen ilgili maliyetler çıkarıldıktan sonra kalan tutardır.', hint: 'Fiyat eksi değişkenler' },
      { front: 'Marj raporunda hangi dört kapsam yazılmalı?', back: 'Dönem, kanal, KDV durumu ve düşülen maliyetler.', hint: 'Ne zaman, nerede, vergi, kapsam' },
    ],
    task: {
      title: 'Ek oran–marj mutabakatı',
      description: 'Üç ürünün mevcut fiyatını hem ek oran hem satış marjı açısından hesapla.',
      instructions: 'Her ürün için maliyet, fiyat, TL katkı, maliyet üzerine ek oran ve satış marjını yan yana yaz. Hedef marjdan olması gereken fiyatı ayrıca çöz.',
      exampleOutput: 'Maliyet 150 TL; fiyat 200 TL; katkı 50 TL; ek oran %33,33; satış marjı %25; hedef %30 fiyatı 214,29 TL.',
      checklist: ['İki oran ayrı hesaplandı', 'Paydalar doğru seçildi', 'TL katkı gösterildi', 'Hedef fiyat ters çözüldü', 'KDV/kapsam notu eklendi'],
      rubric: 'Tam (4): üç ürün ve tüm denklemler doğru. İyi (3): tek yuvarlama/kapsam eksiği. Gelişiyor (2): ek oran ile marj karışmış. Başlangıç (1): yalnız yüzde yazılmış.',
    },
  },
  {
    code: 'CUR-026-04',
    title: 'Pazar Yeri Komisyonu — Uygulama',
    minutes: 18,
    archetype: 'price-stack',
    summary: 'Komisyon ve ödeme kesintilerini fiyat denkleminin doğru tarafında çözer.',
    outcomes: ['Sabit tutar ve satışa bağlı oranı ayırmak', 'Kanal sonrası hedef marj fiyatını hesaplamak', 'Sözleşme ile gerçekleşen kesintiyi uzlaştırmak'],
    content: `## Kanal fiyatının anatomisi

Pazar yeri komisyonu çoğunlukla satış fiyatının yüzdesidir. Bu nedenle “maliyete %17,5 komisyon ekledim” yaklaşımı döngüsel hesabı eksik çözer: komisyon maliyetin değil, bulunan fiyatın üzerinden doğar.

![Satış fiyatının maliyet, komisyon, ödeme kesintisi ve katkı katmanları](/academy-visuals/pricing-margin/price-stack.svg)

## Denklem

\`P = C + cP + pP + mP\`

- P: KDV hariç yönetim satış fiyatı
- C: birim başına sabit tutarlı ilgili maliyetler
- c: kanal komisyon oranı
- p: ödeme kesinti oranı
- m: hedef satış marjı

Düzenlendiğinde:

\`P = C ÷ (1 − c − p − m)\`

Gerçek birim maliyet 135 TL, komisyon %17,5, ödeme kesintisi %3 ve hedef marj %20 ise:

\`P = 135 ÷ (1 − 0,175 − 0,03 − 0,20) = 226,89 TL\`

Bu bir **KDV hariç yönetim fiyatıdır**. Müşteriye gösterilecek etiket, işlemin vergi durumuna göre ayrıca ele alınır. GİB’de yayımlanan KDV Kanunu’nun 20. maddesi teslim ve hizmet işlemlerinde matrahı, işlem karşılığını oluşturan bedel olarak tanımlar.[3]

## Sözleşme oranı yetmez

Gerçek kanal maliyeti için şu kalemleri ayrı izle:

| Tür | Kontrol |
|---|---|
| Kategori komisyonu | güncel sözleşme/kategori oranı |
| Ödeme kesintisi | oran + sabit işlem ücreti |
| Kampanya katkısı | satıcı tarafından karşılanan pay |
| Lojistik/hizmet | sipariş, desi veya paket başı |
| İade/iptal | iade edilen ve edilmeyen ücretler |
| Reklam | siparişe atfedilebilen gerçekleşen gider |

Platform oranları zamanla, kategoriyle ve sözleşmeyle değişebilir. Bu yüzden eğitim içeriği sabit bir “doğru oran” vermez; kullanıcı güncel sözleşmesini ve son üç mutabakat raporunu kullanır.

## Mutabakat metriği

\`Gerçekleşen kesinti oranı = toplam kanal kesintileri ÷ KDV hariç ilgili satış\`

Sözleşmede %15 görünen bir komisyon, kampanya ve hizmet kalemleriyle fiilen daha yüksek olabilir. Sapma varsa önce iade/iptal, kategori eşlemesi, kampanya katılımı ve sabit ücretleri kontrol et.

## Uygulamada kullan

[Fiyat Mimarisi ve Hedef Marj aracında](/app/tools?tool=fiyat_mimarisi) sözleşme oranını değil, mümkünse gerçekleşen kesinti oranını senaryo olarak dene. Temel, temkinli ve yüksek kesinti olmak üzere üç sonuç sakla.

## Kaynakça

1. [KGK, TMS 2 Stoklar](https://kgk.gov.tr/Portalv2Uploads/files/Duyurular/v2/TMS/TMS_2_Stoklar.pdf), erişim: 28.07.2026.
2. [U.S. SBA, Break-even Point](https://www.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point), erişim: 28.07.2026.
3. [GİB, Katma Değer Vergisi Kanunu](https://www.gib.gov.tr/mevzuat/kanun/436), erişim: 28.07.2026.

*Platform koşulları değişkendir; karar öncesinde güncel sözleşme ve mutabakat raporu esas alınmalıdır.*`,
    quiz: [
      { q: 'Satış fiyatının %15’i olan komisyon denklemde nasıl ele alınır?', o: ['Fiyatın yüzdesi olarak', 'Maliyetin sabit 15 TL’si olarak', 'KDV ile aynı kalem olarak', 'Yok sayılarak'], a: 'Fiyatın yüzdesi olarak', e: 'Komisyon satış fiyatına bağlıdır; fiyat değiştikçe tutar da değişir.' },
      { q: '135 TL maliyet, %17,5 komisyon, %3 ödeme ve %20 hedef marjda doğru payda hangisidir?', o: ['0,595', '1,405', '0,825', '0,20'], a: '0,595', e: '1 − 0,175 − 0,03 − 0,20 = 0,595.' },
      { q: 'Gerçekleşen kesinti oranı nasıl bulunur?', o: ['Toplam kanal kesintileri ÷ ilgili KDV hariç satış', 'Satış ÷ stok', 'Kâr ÷ çalışan', 'Kargo ÷ kira'], a: 'Toplam kanal kesintileri ÷ ilgili KDV hariç satış', e: 'Mutabakat, bütün kanal kesintilerinin satıştaki payını ölçer.' },
      { q: 'Platform maliyeti için en güncel veri hangisidir?', o: ['Sözleşme ve son mutabakat raporları', 'Eski blog yazısı', 'Rakibin tahmini', 'Sabit eğitim oranı'], a: 'Sözleşme ve son mutabakat raporları', e: 'Oranlar kategori, kampanya ve tarihe göre değişebilir.' },
      { q: 'Komisyon dışındaki hangi kalem kanal sonrası marjı azaltabilir?', o: ['Kampanya katkı payı', 'Ürün rengi', 'Şirket logosu', 'Takvim haftası tek başına'], a: 'Kampanya katkı payı', e: 'Satıcı tarafından karşılanan kampanya payı ayrıca kesinti yaratabilir.' },
    ],
    cards: [
      { front: 'Yüzdesel kanal maliyeti hangi taban üzerinden doğar?', back: 'Sözleşmedeki tanıma göre satış fiyatı veya ilgili satış bedeli üzerinden.', hint: 'Maliyet değil, satış' },
      { front: 'Kanal sonrası hedef fiyat denklemi nedir?', back: 'Sabit ilgili maliyet ÷ (1 − komisyon − ödeme kesintisi − hedef marj).', hint: 'Oranlar paydada' },
      { front: 'Gerçekleşen kesinti oranı nedir?', back: 'Toplam kanal kesintilerinin ilgili KDV hariç satışa oranı.', hint: 'Mutabakat' },
      { front: 'Neden sabit platform oranı öğretmiyoruz?', back: 'Oran ve ücretler tarih, kategori, kampanya ve sözleşmeye göre değişir.', hint: 'Değişken koşullar' },
      { front: 'Kanal maliyetinde hangi rapor kontrol edilir?', back: 'Güncel sözleşme ile son dönem mutabakat/hakediş raporu birlikte.', hint: 'Taahhüt ve gerçekleşen' },
      { front: 'Etiket fiyatı neden yönetim fiyatından farklı olabilir?', back: 'Vergi ve fiyat gösterim kuralları ayrıca uygulanır; yönetim hesabı burada KDV hariçtir.', hint: 'KDV kapsamı' },
    ],
    task: {
      title: 'Kanal kesinti mutabakatı',
      description: 'Bir satış kanalının son üç dönem gerçekleşen kesintisini sözleşmeyle karşılaştır.',
      instructions: 'KDV hariç satış, komisyon, ödeme, kampanya, lojistik, iade ve diğer kesintileri ayrı sütunlarda göster. Gerçekleşen toplam oranı ve sözleşmeden sapmayı hesapla.',
      exampleOutput: 'KDV hariç satış 100.000 TL; toplam kanal kesintisi 21.400 TL; gerçekleşen oran %21,4; sözleşme ana oranı %17,5; farkın 2,1 puanı kampanya, 1,8 puanı hizmet ücretidir.',
      checklist: ['Güncel sözleşme kullanıldı', 'Üç dönem karşılaştırıldı', 'Tüm kesinti türleri ayrıldı', 'KDV kapsamı belirtildi', 'Sapma nedeni ve aksiyon yazıldı'],
      rubric: 'Tam (4): üç dönem, bütün kesintiler ve açıklanan sapma. İyi (3): küçük sınıflandırma eksiği. Gelişiyor (2): yalnız ana komisyon var. Başlangıç (1): oran tahmine dayanıyor.',
    },
  },
  {
    code: 'CUR-032-04',
    title: 'Fiyat Belirleme — Uygulama',
    minutes: 20,
    archetype: 'decision-flow',
    summary: 'Maliyet tabanı, müşteri değeri, pazar referansı ve kapasiteyi tek fiyat kararında birleştirir.',
    outcomes: ['Fiyat tabanı ile hedef fiyatı ayırmak', 'Tek fiyat yerine test edilebilir bir fiyat koridoru kurmak', 'Fiyat kararını ölçülebilir başarı ve durdurma koşuluna bağlamak'],
    content: `## Fiyat bir sayı değil, karar sistemidir

Maliyet hesabı “bu fiyatın altında ne olur?” sorusunu yanıtlar; müşterinin algıladığı değer “hangi fayda için ne öder?” sorusunu; pazar verisi ise “hangi alternatiflerle karşılaştırılıyorum?” sorusunu gösterir. Tek başına hiçbiri yeterli değildir.

## Dört mercekli fiyat koridoru

1. **Ekonomik taban:** ilgili maliyetler, kanal kesintileri ve asgari katkı.
2. **Değer kanıtı:** müşteriye sağlanan zaman, risk, gelir veya kolaylık etkisi.
3. **Pazar referansı:** aynı sonucu sunan gerçek alternatiflerin toplam maliyeti.
4. **Kapasite ve strateji:** talep, teslim kapasitesi, konumlandırma ve nakit hedefi.

### Karar akışı

- Fiyat ekonomik tabanın altındaysa: kapsamı, kanalı veya maliyet modelini değiştir; gerekçesiz satış yapma.
- Tabanın üstünde fakat değer kanıtı zayıfsa: müşteri görüşmesi, teklif testi ve paketleme deneyi yap.
- Değer kanıtı güçlü fakat dönüşüm düşükse: fiyatı hemen indirmeden mesaj, güven, ödeme ve teklif sürtünmesini kontrol et.
- Talep kapasiteyi aşıyorsa: teslim süresi, kalite ve fiyatı birlikte değerlendir.

## Örnek: hizmet paketi

Bir danışmanlık paketinin KDV hariç ilgili maliyet tabanı 6.000 TL, hedef katkılı tabanı 8.500 TL olsun. Müşteri aynı işi içeride yapmak için yaklaşık 18 saat ve ek yazılım maliyeti harcıyor. Rakip teklifleri 9.000–14.000 TL aralığında.

Tek “doğru” fiyat ilan etmek yerine üç paket test edilebilir:

| Paket | Kapsam | Fiyat | Başarı ölçütü |
|---|---|---:|---|
| Temel | analiz + rapor | 9.500 TL | nitelikli teklif dönüşümü |
| Standart | temel + uygulama oturumu | 12.000 TL | katkı ve memnuniyet |
| Destekli | standart + 30 gün takip | 15.500 TL | yenileme/yönlendirme |

Bu fiyatlar örnektir; gerçek karar işletme verisiyle kurulur.

## Deney tasarımı

Fiyat testinde aynı anda fiyat, hedef kitle, kanal ve teklif metnini değiştirme. Birincil ölçütü önceden seç:

- tekliften satışa dönüşüm,
- satış başına kanal sonrası katkı,
- toplam dönem katkısı,
- iade/iptal,
- teslim kapasitesi ve kalite.

Örneğin “20 nitelikli teklif boyunca standart paketi 12.000 TL ile test edeceğim; kanal sonrası katkı hedefin altına düşerse veya iptal oranı eşik değeri aşarsa durduracağım.”

## Başabaş bağlantısı

SBA’nın açıkladığı başabaş modeli, sabit maliyetleri fiyat ile birim değişken maliyet arasındaki katkıya böler.[2] Fiyat kararı verildikten sonra gereken satış adedi kapasitenin üzerindeyse model kâğıt üzerinde doğru, operasyonda imkânsız olabilir.

## Kaynakça

1. [KGK, TMS 2 Stoklar](https://kgk.gov.tr/Portalv2Uploads/files/Duyurular/v2/TMS/TMS_2_Stoklar.pdf), erişim: 28.07.2026.
2. [U.S. SBA, Break-even Point](https://www.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point), erişim: 28.07.2026.
3. [GİB, Katma Değer Vergisi Kanunu](https://www.gib.gov.tr/mevzuat/kanun/436), erişim: 28.07.2026.

*Müşteri değeri ve pazar aralığı varsayım değil, görüşme ve teklif verisiyle doğrulanmalıdır.*`,
    quiz: [
      { q: 'Maliyet hesabı fiyat kararında en doğrudan hangi soruyu yanıtlar?', o: ['Ekonomik taban nedir?', 'Müşterinin en sevdiği renk nedir?', 'Rakip ne yapacak?', 'Talep kesin kaç olur?'], a: 'Ekonomik taban nedir?', e: 'Maliyet, fiyatın sürdürülebilir alt sınırını değerlendirmeye yardım eder; değeri tek başına belirlemez.' },
      { q: 'Fiyat testi sırasında neden tek ana değişken değiştirilir?', o: ['Sonuç nedenini ayırabilmek için', 'Daha yavaş olmak için', 'Maliyeti gizlemek için', 'Rakibi kopyalamak için'], a: 'Sonuç nedenini ayırabilmek için', e: 'Fiyat, kanal ve mesaj aynı anda değişirse sonucun hangi etkenden geldiği bilinmez.' },
      { q: 'Dönüşüm düşükse ilk tepki neden her zaman indirim olmamalıdır?', o: ['Mesaj, güven veya ödeme sürtünmesi sorun olabilir', 'Fiyat hiçbir zaman önemli değildir', 'Maliyet yoktur', 'İndirim yasaktır'], a: 'Mesaj, güven veya ödeme sürtünmesi sorun olabilir', e: 'Düşük dönüşümün tek nedeni fiyat değildir; önce teşhis gerekir.' },
      { q: 'Başabaş adedi kapasitenin üzerindeyse ne anlaşılır?', o: ['Model operasyonel olarak sürdürülemez olabilir', 'Fiyat kesin doğrudur', 'Sabit gider yoktur', 'Marj yüzde 100’dür'], a: 'Model operasyonel olarak sürdürülemez olabilir', e: 'Gerekli adet üretim veya teslim kapasitesini aşıyorsa plan uygulanamaz.' },
      { q: 'Fiyat deneyinde iyi bir durdurma koşulu hangisidir?', o: ['Katkı hedef altına veya iptal eşik üstüne çıkarsa durdur', 'Canımız sıkılırsa durdur', 'Rakip paylaşım yaparsa durdur', 'Hiç ölçmeden sürdür'], a: 'Katkı hedef altına veya iptal eşik üstüne çıkarsa durdur', e: 'Önceden tanımlı ölçülebilir eşikler kararı disipline eder.' },
    ],
    cards: [
      { front: 'Fiyat koridorunun dört merceği nedir?', back: 'Ekonomik taban, müşteri değeri, pazar referansı ve kapasite/strateji.', hint: 'İç, müşteri, pazar, işletme' },
      { front: 'Ekonomik taban neyi gösterir?', back: 'İlgili maliyet, kesinti ve asgari katkıyla sürdürülebilir alt sınırı.', hint: 'Alt sınır' },
      { front: 'Değer kanıtı nasıl doğrulanır?', back: 'Müşteri görüşmesi, teklif davranışı ve ölçülebilir sonuç verisiyle.', hint: 'Söylem değil kanıt' },
      { front: 'Fiyat deneyinde neden tek ana değişken?', back: 'Sonuçtaki değişimin nedenini ayırabilmek için.', hint: 'Nedensellik' },
      { front: 'Başabaş adedi neden kapasiteyle karşılaştırılır?', back: 'Gerekli satış/teslim adedinin operasyonel olarak mümkün olup olmadığını görmek için.', hint: 'Kâğıt ve gerçek' },
      { front: 'İyi durdurma koşulu nasıldır?', back: 'Önceden belirlenmiş, ölçülebilir ve karar eşiği içeren.', hint: 'Eşik' },
    ],
    task: {
      title: 'Fiyat koridoru ve 20 teklif deneyi',
      description: 'Bir ürün veya hizmet için taban, hedef ve test fiyatı belirle.',
      instructions: 'Maliyet tabanını, değer kanıtını, üç pazar alternatifini ve kapasite sınırını yaz. Tek değişkenli 20 tekliflik deney, başarı ölçütü ve durdurma koşulu oluştur.',
      exampleOutput: 'Taban 8.500 TL; pazar 9.000–14.000 TL; test 12.000 TL; 20 nitelikli teklif; birincil ölçüt kanal sonrası toplam katkı; iptal %10’u aşarsa durdur.',
      checklist: ['Ekonomik taban hesaplandı', 'Değer kanıtı belgelendi', 'Gerçek alternatifler karşılaştırıldı', 'Kapasite kontrol edildi', 'Başarı ve durdurma eşiği yazıldı'],
      rubric: 'Tam (4): dört mercek ve ölçülebilir deney. İyi (3): tek kanıt eksik. Gelişiyor (2): yalnız maliyet ve rakip fiyatı var. Başlangıç (1): test planı olmadan tek fiyat seçilmiş.',
    },
  },
  {
    code: 'CUR-038-04',
    title: 'Kampanya Fiyatlandırma — Uygulama',
    minutes: 18,
    archetype: 'sensitivity-heatmap',
    summary: 'İndirimin birim katkıyı ve aynı toplam katkı için gereken satış adedini nasıl değiştirdiğini gösterir.',
    outcomes: ['İndirim sonrası birim katkıyı hesaplamak', 'Katkıyı korumak için gereken adet artışını bulmak', 'Kampanyayı ölçülebilir hipotez ve durdurma koşuluyla tasarlamak'],
    content: `## İndirim neden yanıltır?

%10 indirim, kârın yalnızca %10 azalacağı anlamına gelmez. Çünkü indirim satış fiyatından düşerken maliyetlerin büyük bölümü aynı kalır.

![İndirim oranına göre birim katkı ve gereken satış adedi](/academy-visuals/pricing-margin/discount-heatmap.svg)

Örnekte normal fiyat 300 TL, ilgili değişken maliyet 180 TL’dir. Normal birim katkı 120 TL’dir. %20 indirimde fiyat 240 TL, katkı 60 TL olur: fiyat %20 düşerken birim katkı **%50** düşmüştür.

## Katkıyı koruma denklemi

\`Gerekli kampanya adedi = normal adet × normal birim katkı ÷ kampanya birim katkısı\`

Normalde 100 adet × 120 TL = 12.000 TL toplam katkı elde ediliyorsa, %20 indirimli 60 TL katkıyla aynı toplam için:

\`12.000 ÷ 60 = 200 adet\`

Satış adedinin iki katına çıkması gerekir. Bu hesap ek reklam, fazla mesai, stok tükenmesi, iade artışı veya kanal kampanya katkısını henüz içermez.

## Kampanya maliyet kartı

| Kalem | Normal | Kampanya |
|---|---:|---:|
| KDV hariç fiyat | 300 TL | 240 TL |
| Ürünle değişen maliyet | 180 TL | 180 TL |
| Ek kampanya/reklam | 0 TL | ör. 8 TL |
| Kanal kampanya katkısı | 0 TL | sözleşmeden |
| Birim katkı | 120 TL | yeniden hesaplanır |
| Beklenen iade | gerçekleşen oran | senaryo |

Kampanyanın hedefi yalnız ciro olmamalıdır. Stok eritme, yeni müşteri edinme, tekrar satın alma veya kapasite doldurma gibi hedefler ayrı ölçülür.

## Üç kapılı karar

1. **Ekonomi:** Kampanya birim katkısı pozitif mi, toplam katkı için gereken adet gerçekçi mi?
2. **Operasyon:** Stok, kargo, ekip ve müşteri hizmeti bu adedi kaldırıyor mu?
3. **Öğrenme:** Hangi müşteri grubunda, hangi teklifin neden çalıştığını ölçebiliyor musun?

Kapılardan biri başarısızsa kampanya küçültülür, kapsamı değiştirilir veya durdurulur.

## İndirim dışı seçenekler

- ürün yerine paket/bundle,
- fiyat düşürmeden ek hizmet,
- minimum sepet eşiği,
- sınırlı segment veya kanal,
- ödeme koşulu avantajı,
- düşük talep saat/gün kapasite fiyatı.

## Başabaş ve kaynak bağlantısı

SBA başabaş yaklaşımı fiyat ile birim değişken maliyet arasındaki katkının önemini gösterir.[2] Kampanya kararı da aynı mantığı, normal ve indirimli senaryoları karşılaştırarak kullanır.

## Kaynakça

1. [KGK, TMS 2 Stoklar](https://kgk.gov.tr/Portalv2Uploads/files/Duyurular/v2/TMS/TMS_2_Stoklar.pdf), erişim: 28.07.2026.
2. [U.S. SBA, Break-even Point](https://www.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point), erişim: 28.07.2026.
3. [GİB, Katma Değer Vergisi Kanunu](https://www.gib.gov.tr/mevzuat/kanun/436), erişim: 28.07.2026.

*Kampanya öncesinde güncel kanal sözleşmesi, stok ve vergi koşulları ayrıca kontrol edilmelidir.*`,
    quiz: [
      { q: '300 TL fiyat ve 180 TL değişken maliyette normal birim katkı kaçtır?', o: ['120 TL', '180 TL', '300 TL', '480 TL'], a: '120 TL', e: 'Birim katkı fiyattan ilgili değişken maliyet çıkarılarak bulunur: 300 − 180 = 120 TL.' },
      { q: 'Aynı örnekte %20 indirim sonrası birim katkı kaçtır?', o: ['60 TL', '96 TL', '120 TL', '0 TL'], a: '60 TL', e: 'Yeni fiyat 240 TL; 240 − 180 = 60 TL.' },
      { q: 'Normalde 100 adet × 120 TL katkı, kampanyada 60 TL katkıyla kaç adet gerektirir?', o: ['200', '120', '160', '50'], a: '200', e: '12.000 TL toplam katkı ÷ 60 TL = 200 adet.' },
      { q: 'Kampanya değerlendirmesinde hangisi ciroya ek olarak izlenmelidir?', o: ['Kanal sonrası toplam katkı', 'Yalnız görüntülenme', 'Logo rengi', 'Takvim ayının adı'], a: 'Kanal sonrası toplam katkı', e: 'Ciro artarken birim veya toplam katkı düşebilir.' },
      { q: 'İndirim dışı marj koruyan seçenek hangisidir?', o: ['Paket/bundle oluşturmak', 'Maliyeti yok saymak', 'Her ürüne sınırsız indirim', 'İadeyi ölçmemek'], a: 'Paket/bundle oluşturmak', e: 'Paketleme algılanan değeri artırırken doğrudan fiyat indirimini sınırlayabilir.' },
    ],
    cards: [
      { front: 'Kampanya birim katkısı nasıl bulunur?', back: 'İndirimli KDV hariç fiyat − ilgili değişken maliyetler − kampanyaya özel kesintiler.', hint: 'Yeni fiyat eksi yeni yük' },
      { front: 'Katkıyı koruyan gerekli adet formülü nedir?', back: 'Normal adet × normal birim katkı ÷ kampanya birim katkısı.', hint: 'Toplam katkıyı sabitle' },
      { front: '%20 indirim neden katkıyı %20’den fazla azaltabilir?', back: 'Maliyetler aynı kalırken indirimin tamamı katkıdan düşer.', hint: 'Maliyet düşmez' },
      { front: 'Kampanyanın üç karar kapısı nedir?', back: 'Ekonomi, operasyon ve öğrenme/ölçüm.', hint: 'Para, kapasite, kanıt' },
      { front: 'Ciro neden tek başarı ölçütü değildir?', back: 'Satış artarken kanal sonrası toplam katkı veya nakit sonucu kötüleşebilir.', hint: 'Hacim ≠ sonuç' },
      { front: 'İndirim dışı iki seçenek nedir?', back: 'Paket/bundle, ek hizmet, sepet eşiği, segment veya ödeme avantajından herhangi ikisi.', hint: 'Değeri değiştir' },
    ],
    task: {
      title: 'Kampanya stres testi',
      description: 'Planlanan bir kampanyayı %0, %10, %20 ve %30 indirim senaryolarıyla test et.',
      instructions: 'Her senaryoda fiyat, birim katkı, aynı toplam katkı için gereken adet, ek kampanya maliyeti, kapasite ve durdurma koşulunu yaz.',
      exampleOutput: 'Normal 300/180/120 TL ve 100 adet. %20 senaryosu 240/180/60 TL; en az 200 adet; kapasite 170 olduğu için bu kampanya reddedildi.',
      checklist: ['Dört senaryo hesaplandı', 'Ek kampanya maliyeti eklendi', 'Gerekli adet bulundu', 'Kapasite ve stok test edildi', 'Durdurma koşulu yazıldı'],
      rubric: 'Tam (4): ekonomi, kapasite ve karar birlikte. İyi (3): tek yan maliyet eksik. Gelişiyor (2): yalnız indirimli fiyat var. Başlangıç (1): katkı veya gereken adet hesaplanmamış.',
    },
  },
]

function parseMetadata(raw: string) {
  try { return JSON.parse(raw) as Record<string, unknown> } catch { return {} }
}

async function ensureSources() {
  const sources = []
  for (const spec of sourceSpecs) {
    const existing = await prisma.source.findFirst({ where: { url: spec.url } })
    const source = existing
      ? await prisma.source.update({ where: { id: existing.id }, data: { ...spec, lastChecked: now } })
      : await prisma.source.create({ data: { ...spec, lastChecked: now } })
    sources.push(source)
  }
  return sources
}

async function main() {
  const kos = await prisma.knowledgeObject.findMany({ where: { code: { in: specs.map(spec => spec.code) } } })
  if (kos.length !== specs.length) {
    const found = new Set(kos.map(ko => ko.code))
    throw new Error(`Pilot KO eksik: ${specs.filter(spec => !found.has(spec.code)).map(spec => spec.code).join(', ')}`)
  }

  console.log(`Fiyat/marj pilotu hazır: ${specs.length} KO, ${specs.reduce((sum, spec) => sum + spec.quiz.length, 0)} soru, ${specs.reduce((sum, spec) => sum + spec.cards.length, 0)} kart.`)
  if (!apply) return console.log('DRY RUN — veritabanı değiştirilmedi. Uygulamak için --apply kullanın.')

  const sources = await ensureSources()
  const course = await prisma.course.upsert({
    where: { slug: 'fiyat-mimarisi-marj-yonetimi' },
    create: {
      slug: 'fiyat-mimarisi-marj-yonetimi',
      title: 'Fiyat Mimarisi ve Marj Yönetimi',
      description: 'Gerçek maliyetten kampanya kararına kadar uygulamalı fiyatlandırma pilot kursu.',
      category: 'Finans',
      level: 'intermediate',
      estimatedMinutes: specs.reduce((sum, spec) => sum + spec.minutes, 0),
      outcomes: JSON.stringify([
        'Gerçek birim maliyet kartı hazırlamak',
        'Ek oran ile satış marjını doğru ayırmak',
        'Kanal kesintileri sonrası hedef fiyatı hesaplamak',
        'Fiyat ve kampanya deneyini ölçülebilir tasarlamak',
      ]),
      sourceType: 'curated-operational-pilot-v1',
      published: true,
    },
    update: {
      title: 'Fiyat Mimarisi ve Marj Yönetimi',
      description: 'Gerçek maliyetten kampanya kararına kadar uygulamalı fiyatlandırma pilot kursu.',
      category: 'Finans',
      level: 'intermediate',
      estimatedMinutes: specs.reduce((sum, spec) => sum + spec.minutes, 0),
      outcomes: JSON.stringify([
        'Gerçek birim maliyet kartı hazırlamak',
        'Ek oran ile satış marjını doğru ayırmak',
        'Kanal kesintileri sonrası hedef fiyatı hesaplamak',
        'Fiyat ve kampanya deneyini ölçülebilir tasarlamak',
      ]),
      sourceType: 'curated-operational-pilot-v1',
      published: true,
    },
  })

  for (let index = 0; index < specs.length; index++) {
    const spec = specs[index]
    const ko = kos.find(item => item.code === spec.code)!

    await prisma.$transaction(async tx => {
      const metadata = {
        ...parseMetadata(ko.metadata),
        summary: spec.summary,
        level: 'Uygulama',
        difficulty: 2,
        estimatedMinutes: spec.minutes,
        estimatedTime: `${spec.minutes} dakika`,
        learningOutcomes: spec.outcomes,
        formulas: spec.code === 'CUR-034-04'
          ? ['Satış marjı = (Fiyat − ilgili maliyet) ÷ Fiyat', 'Hedef fiyat = ilgili maliyet ÷ (1 − hedef marj)']
          : [],
        contentArchetype: spec.archetype,
        qualityStandard: 'adaptive-operational-v1',
        editorialState: 'published-curated-pilot',
        sourcePolicy: 'inline-numbered-primary-sources',
        toolId: 'fiyat_mimarisi',
        contentVersion: 3,
        upgradedAt: now.toISOString(),
      }

      await tx.knowledgeObject.update({
        where: { id: ko.id },
        data: {
          title: spec.title,
          summary: spec.summary,
          content: spec.content,
          metadata: JSON.stringify(metadata),
          status: 'published',
          verificationStatus: 'verified',
          reviewGate: 'standard',
          publishedAt: ko.publishedAt || now,
          reviewDue,
        },
      })

      await tx.lesson.updateMany({
        where: { knowledgeObjectId: ko.id },
        data: { title: spec.title, content: spec.content, estimatedMinutes: spec.minutes },
      })

      const pilotLesson = await tx.lesson.findFirst({ where: { courseId: course.id, order: index + 1 } })
      const lessonData = {
        title: spec.title,
        content: spec.content,
        estimatedMinutes: spec.minutes,
        knowledgeObjectId: ko.id,
      }
      if (pilotLesson) await tx.lesson.update({ where: { id: pilotLesson.id }, data: lessonData })
      else await tx.lesson.create({ data: { courseId: course.id, order: index + 1, ...lessonData } })

      for (const source of sources) {
        const relation = await tx.knowledgeObjectSource.findFirst({ where: { koId: ko.id, sourceId: source.id } })
        const note = `Fiyat/marj pilotu ${spec.code}: içerik içi numaralı atıf ve kaynakça`
        if (relation) await tx.knowledgeObjectSource.update({ where: { id: relation.id }, data: { relation: 'supports', note } })
        else await tx.knowledgeObjectSource.create({ data: { koId: ko.id, sourceId: source.id, relation: 'supports', note } })
      }

      let quiz = await tx.quiz.findFirst({ where: { koId: ko.id }, orderBy: { createdAt: 'asc' } })
      quiz = quiz
        ? await tx.quiz.update({ where: { id: quiz.id }, data: { title: `${spec.title} — Öğretici Quiz`, passScore: 80, status: 'published' } })
        : await tx.quiz.create({ data: { koId: ko.id, title: `${spec.title} — Öğretici Quiz`, passScore: 80, status: 'published' } })
      const oldQuestions = await tx.quizQuestion.findMany({ where: { quizId: quiz.id }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })
      for (let questionIndex = 0; questionIndex < spec.quiz.length; questionIndex++) {
        const question = spec.quiz[questionIndex]
        const data = {
          questionText: question.q,
          options: JSON.stringify(question.o),
          correctAnswer: question.a,
          explanation: question.e,
          order: questionIndex + 1,
        }
        if (oldQuestions[questionIndex]) await tx.quizQuestion.update({ where: { id: oldQuestions[questionIndex].id }, data })
        else await tx.quizQuestion.create({ data: { quizId: quiz.id, ...data } })
      }
      if (oldQuestions.length > spec.quiz.length) {
        await tx.quizQuestion.deleteMany({ where: { id: { in: oldQuestions.slice(spec.quiz.length).map(question => question.id) } } })
      }

      for (let cardIndex = 0; cardIndex < spec.cards.length; cardIndex++) {
        await tx.flashcard.upsert({
          where: { koId_order: { koId: ko.id, order: cardIndex + 1 } },
          create: { koId: ko.id, order: cardIndex + 1, status: 'published', ...spec.cards[cardIndex] },
          update: { status: 'published', ...spec.cards[cardIndex] },
        })
      }
      await tx.flashcard.deleteMany({ where: { koId: ko.id, order: { gt: spec.cards.length } } })

      const existingTask = await tx.taskTemplate.findFirst({ where: { koId: ko.id }, orderBy: { createdAt: 'asc' } })
      const taskData = {
        title: spec.task.title,
        description: spec.task.description,
        instructions: spec.task.instructions,
        exampleOutput: spec.task.exampleOutput,
        checklist: JSON.stringify(spec.task.checklist),
        rubric: spec.task.rubric,
        estimatedTime: 30,
      }
      if (existingTask) await tx.taskTemplate.update({ where: { id: existingTask.id }, data: taskData })
      else await tx.taskTemplate.create({ data: { koId: ko.id, ...taskData } })
    })

    console.log(`Güncellendi: ${spec.code} — ${spec.archetype}`)
  }

  const extraLessons = await prisma.lesson.findMany({
    where: { courseId: course.id, order: { gt: specs.length } },
    select: { id: true },
  })
  if (extraLessons.length) await prisma.lesson.deleteMany({ where: { id: { in: extraLessons.map(lesson => lesson.id) } } })
  console.log(`Pilot kurs yayınlandı: ${course.slug}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
