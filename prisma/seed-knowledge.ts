import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function asCode(title: string): string {
  return title
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğ]/g, 'c')
    .replace(/[ş]/g, 's')
    .replace(/[ü]/g, 'u')
    .replace(/[ö]/g, 'o')
    .replace(/[ı]/g, 'i')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

interface TopicDef {
  title: string
  desc: string
  problem: string
  quickAnswer: string
  cat: string
  sub: string
  steps: string[]
  example: string
  checklist: string[]
  warning: string
  formula?: string
  seeAlso: string[]
}

const financeTopics: TopicDef[] = [
  {
    title: 'Nakit Akışı',
    desc: 'İşletmeye giren ve çıkan paranın takibi',
    problem: 'Kasamda para nereye gidiyor? Neden ay sonu hep açık veriyorum?',
    quickAnswer: 'Net Nakit = Giren Para − Çıkan Para. Negatifse nakit açığı var.',
    cat: 'temel-finans', sub: 'Nakit Yönetimi',
    steps: [
      '1. Ayın tüm gelirlerini listele (tahsilatlar)',
      '2. Ayın tüm giderlerini listele (ödemeler)',
      '3. Farkı al = net nakit değişimi',
      '4. Dönem başı bakiyeye ekle = dönem sonu bakiye',
    ],
    example: 'Ali Bakkal: Mart ayında 50.000 TL satış, 42.000 TL gider, dönem başı 10.000 TL → net nakit +8.000 TL, dönem sonu 18.000 TL',
    checklist: ['Tüm nakit girişleri kaydedildi mi?', 'Vergi gibi dönemsel çıkışlar dahil mi?', 'Tahmini rakam mı gerçekleşen mi?'],
    warning: 'Kâr ile nakit aynı şey değildir. Kâr tablosu nakit akışını göstermez.',
    seeAlso: ['Ciro Nedir?', 'Brüt Kâr', 'İşletme Bütçesi'],
  },
  {
    title: 'Ciro Nedir?',
    desc: 'Toplam satış tutarının anlamı',
    problem: 'Ciro mu kâr mı takip etmeliyim?',
    quickAnswer: 'Ciro = toplam satış tutarı (KDV dahil/hariç). Kâr değildir, sadece büyüklük göstergesidir.',
    cat: 'temel-finans', sub: 'Kâr Analizi',
    steps: [
      '1. Dönemdeki tüm satış faturalarını topla',
      '2. İadeleri düş',
      '3. KDV dahil veya hariç olduğuna karar ver, tutarlı ol',
      '4. Geçen dönemle karşılaştır',
    ],
    example: 'Mart ayında 40 adet ürün satıldı, adedi 250 TL → ciro 10.000 TL (KDV hariç)',
    checklist: ['KDV dahil/hariç tutarlı mı?', 'İadeler düşüldü mü?', 'Aynı dönem geçen yıl ile karşılaştırıldı mı?'],
    warning: 'Ciro artarken kâr düşebilir. Tek başına ciro yeterli gösterge değildir.',
    seeAlso: ['Brüt Kâr', 'Net Kâr', 'Karlılık Oranı'],
  },
  {
    title: 'Brüt Kâr',
    desc: 'Satıştan ürün maliyetinin çıkarılması',
    problem: 'Ürün satıyorum ama ne kadar kazandığımı tam bilmiyorum',
    quickAnswer: 'Brüt Kâr = Net Satışlar − Satılan Malın Maliyeti. Ürün bazlı kârlılığı gösterir.',
    cat: 'temel-finans', sub: 'Kâr Analizi',
    steps: [
      '1. Dönem net satışlarını hesapla (ciro − iadeler − iskontolar)',
      '2. Satılan malın maliyetini hesapla (hammadde + işçilik + genel gider payı)',
      '3. Brüt Kâr = net satışlar − maliyet',
      '4. Brüt Kâr Marjı = Brüt Kâr / Net Satışlar × 100',
    ],
    example: 'Bir tişört 200 TL satılır, maliyeti 120 TL → brüt kâr 80 TL, marj %40',
    checklist: ['Maliyete tüm değişken giderler dahil mi?', 'Stok maliyeti doğru yöntemle mi hesaplandı?'],
    warning: 'Brüt kâr faaliyet giderlerini (kira, maaş, reklam) kapsamaz. Onlar düşünce net kâr oluşur.',
    seeAlso: ['Net Kâr', 'Karlılık Oranı', 'Sabit Giderler'],
  },
  {
    title: 'Net Kâr',
    desc: 'Tüm giderlerden sonra kalan tutar',
    problem: 'Ay sonu ne kadar kazandığımı nasıl hesaplarım?',
    quickAnswer: 'Net Kâr = Brüt Kâr − Faaliyet Giderleri − Vergiler. Gerçek kazancınız budur.',
    cat: 'temel-finans', sub: 'Kâr Analizi',
    steps: [
      '1. Brüt Kâr\'ı hesapla',
      '2. Tüm faaliyet giderlerini topla (kira, maaş, elektrik, reklam, kırtasiye)',
      '3. Faiz ve vergi öncesi kâr (FVÖK) = Brüt Kâr − Faaliyet Giderleri',
      '4. Net Kâr = FVÖK − Faiz − Vergiler',
    ],
    example: 'Brüt kâr 30.000 TL, giderler 18.000 TL, faiz 2.000 TL, vergi 2.000 TL → Net Kâr 8.000 TL',
    checklist: ['Tüm faaliyet giderleri kaydedildi mi?', 'Vergi karşılığı ayrıldı mı?', 'Faiz giderleri dahil mi?'],
    warning: 'Net kâr pozitif olabilir ama nakit akışı negatif olabilir. İkisini ayrı takip edin.',
    seeAlso: ['Brüt Kâr', 'Nakit Akışı', 'Karlılık Oranı'],
  },
  {
    title: 'Karlılık Oranı',
    desc: 'Kârın satışa oranı',
    problem: 'İşletmem kârlı mı değil mi nasıl anlarım?',
    quickAnswer: 'Net Kâr Marjı = Net Kâr / Net Satışlar × 100. %5 altı düşük, %10-20 normal, %20+ yüksek.',
    cat: 'temel-finans', sub: 'Kâr Analizi',
    steps: [
      '1. Net Kâr\'ı hesapla',
      '2. Net Satışlar\'a böl',
      '3. 100 ile çarp → yüzde',
      '4. Sektör ortalamasıyla karşılaştır',
    ],
    example: 'Net kâr 8.000 TL, net satışlar 50.000 TL → Net Kâr Marjı %16',
    checklist: ['Aynı dönem verileri mi?', 'Sektör ortalaması biliniyor mu?', 'Brüt ve net marj ayrı hesaplandı mı?'],
    warning: 'Marj tek başına yeterli değil. Büyüme, nakit ve verimlilikle birlikte değerlendirin.',
    formula: 'net_kar_marji = net_kar / net_satislar * 100',
    seeAlso: ['Brüt Kâr', 'Net Kâr', 'Ciro Nedir?'],
  },
  {
    title: 'Nakit Büyüme Oranı',
    desc: 'Dönemler arası nakit değişimi',
    problem: 'Nakit durumum iyiye mi gidiyor kötüye mi?',
    quickAnswer: 'Nakit Büyümesi = (Bu dönem nakit − Geçen dönem nakit) / Geçen dönem nakit × 100',
    cat: 'temel-finans', sub: 'Nakit Yönetimi',
    steps: [
      '1. Dönem başı nakit bakiyesini al',
      '2. Dönem sonu nakit bakiyesini al',
      '3. Farkı hesapla',
      '4. Dönem başına böl, 100 ile çarp',
    ],
    example: 'Geçen ay 15.000 TL, bu ay 18.000 TL → büyüme %20',
    checklist: ['Kasa ve bankadaki tüm nakit dahil mi?', 'Döviz kur etkisi var mı?', 'Dönemler karşılaştırılabilir mi?'],
    warning: 'Büyüme oranı düşükse nedenini araştırın: tahsilat yavaşlamış, gider artmış olabilir.',
    seeAlso: ['Nakit Akışı', 'Tahsilat Süresi', 'Ödeme Süresi'],
  },
  {
    title: 'Tahsilat Süresi',
    desc: 'Müşterilerin ödeme hızı',
    problem: 'Müşteriler ödemeleri geç yapıyor, nakit sıkışıyor',
    quickAnswer: 'Ortalama Tahsilat Süresi = (Alacaklar / Günlük Satışlar) gün. 30+ gün risklidir.',
    cat: 'temel-finans', sub: 'Nakit Yönetimi',
    steps: [
      '1. Toplam alacak bakiyesini bul',
      '2. Günlük ortalama satışı hesapla (aylık satış / 30)',
      '3. Tahsilat Süresi = Alacaklar / Günlük Satış',
      '4. Vade farkı uygulama kararı al',
    ],
    example: 'Alacak 30.000 TL, günlük satış 2.000 TL → süre 15 gün (sağlıklı)',
    checklist: ['Vadesi geçmiş alacaklar takip ediliyor mu?', 'Tahsilat politikası yazılı mı?'],
    warning: 'Uzun tahsilat süresi nakit akışını bozar. Vade farkı veya erken ödeme iskontosu düşünün.',
    seeAlso: ['Nakit Akışı', 'Ödeme Süresi'],
  },
  {
    title: 'Ödeme Süresi',
    desc: 'Tedarikçiye ödeme hızı',
    problem: 'Tedarikçilere ne zaman ödeme yapmalıyım?',
    quickAnswer: 'Ortalama Ödeme Süresi = (Borçlar / Günlük Alış) gün. Tahsilat süresinden uzun olmalı.',
    cat: 'temel-finans', sub: 'Nakit Yönetimi',
    steps: [
      '1. Toplam tedarikçi borcunu bul',
      '2. Günlük ortalama alışı hesapla',
      '3. Ödeme Süresi = Borçlar / Günlük Alış',
      '4. Vadeyi optimize et (erken ödeme iskontosu vs geç ödeme)',
    ],
    example: 'Borç 20.000 TL, günlük alış 1.000 TL → süre 20 gün',
    checklist: ['Vadeyi geçen borç var mı?', 'Erken ödeme iskontosu avantajlı mı?'],
    warning: 'Tahsilat sürenizden kısa ödeme süreniz varsa nakit açığı oluşur. Vade dengesini koruyun.',
    seeAlso: ['Nakit Akışı', 'Tahsilat Süresi'],
  },
  {
    title: 'İşletme Bütçesi',
    desc: 'Gelir gider planlaması',
    problem: 'Bütçe yapmam gerek ama nereden başlayacağımı bilmiyorum',
    quickAnswer: 'Bütçe = Tahmini Gelirler − Tahmini Giderler. 12 aylık yapılır, her ay gerçekleşenle karşılaştırılır.',
    cat: 'temel-finans', sub: 'Bütçe',
    steps: [
      '1. Geçmiş 12 ayın gerçekleşmelerini topla',
      '2. Bir sonraki 12 ay için tahmin yap',
      '3. Gelir ve gider kalemlerini ayrı grupla',
      '4. Her ay sonu gerçekleşeni bütçeyle karşılaştır',
    ],
    example: 'Aylık bütçe: gelir 40.000 TL, gider 35.000 TL → hedef kâr 5.000 TL. Gerçekleşen: 38.000 / 36.000 → sapma analizi yap',
    checklist: ['Tüm kalemler dahil mi?', 'Mevsimsellik dikkate alındı mı?', 'Acil durum kalemi eklendi mi?'],
    warning: 'Bütçe sadece rakam değil, bir taahhüttür. Sapmaları nedenleriyle analiz edin.',
    seeAlso: ['Nakit Akışı', 'Sabit Giderler', 'Acil Durum Rezervi'],
  },
  {
    title: 'Acil Durum Rezervi',
    desc: 'Beklenmeyen giderler için para',
    problem: 'Beklenmedik bir masraf çıkarsa ne yaparım?',
    quickAnswer: 'Acil durum rezervi = en az 3 aylık işletme gideri kadar nakit. Kârdan ayrılır, dokunulmaz.',
    cat: 'temel-finans', sub: 'Rezerv',
    steps: [
      '1. Aylık işletme giderlerini hesapla',
      '2. 3 ile çarp → hedef rezerv tutarı',
      '3. Her ay kârın %10\'unu rezerve ayır',
      '4. Sadece gerçek acil durumda kullan',
    ],
    example: 'Aylık gider 30.000 TL → hedef 90.000 TL. Kâr 8.000 TL/ay → ayda 800 TL ayrılır, ~9 ayda tamamlanır',
    checklist: ['Rezerv hesabı ayrı mı?', 'Acil durum tanımı yapıldı mı?', 'Düzenli ekleme yapılıyor mu?'],
    warning: 'Rezervi işletme sermayesi olarak kullanmayın. Acil durum = deprem, hastalık, büyük müşteri kaybı.',
    seeAlso: ['Nakit Akışı', 'İşletme Bütçesi'],
  },
  {
    title: 'Borç Ödeme Stratejisi',
    desc: 'Borçları yönetme yöntemleri',
    problem: 'Birden fazla borcum var, hangisini önce ödemeliyim?',
    quickAnswer: 'En yüksek faizli borcu önce öde (avalanche yöntemi) veya en küçük borcu önce öde (snowball yöntemi).',
    cat: 'temel-finans', sub: 'Borç Yönetimi',
    steps: [
      '1. Tüm borçları listele (faiz, vade, taksit)',
      '2. En yüksek faizli borcu belirle',
      '3. Minimum taksitleri öde, kalan parayla en yüksek faizli borca yüklen',
      '4. Borç bittiğinde sıradakine geç',
    ],
    example: 'Kredi kartı %36 faiz (5.000 TL), ticari kredi %12 faiz (20.000 TL) → önce kredi kartı',
    checklist: ['Tüm borçlar listelendi mi?', 'Faiz oranları güncel mi?', 'Yapılandırma seçeneği var mı?'],
    warning: 'Borcu borçla kapatmak çözüm değildir. Gelir artırmadan borç azalmaz.',
    seeAlso: ['Kredi Kullanımı', 'Nakit Akışı'],
  },
  {
    title: 'Kredi Kullanımı',
    desc: 'Ne zaman kredi alınır',
    problem: 'Kredi çekmeli miyim, yoksa kendi paramla mı devam etmeliyim?',
    quickAnswer: 'Kredi sadece yatırımın getirisi faizinden yüksekse alınır. İşletme sermayesi için kredi risklidir.',
    cat: 'temel-finans', sub: 'Borç Yönetimi',
    steps: [
      '1. Yatırımın beklenen getirisini hesapla (ROI)',
      '2. Kredi faizini hesapla (yıllık maliyet)',
      '3. ROI > Faiz ise kredi düşünülebilir',
      '4. Geri ödeme planını nakit akışına göre yap',
    ],
    example: 'Yeni makina 50.000 TL, yıllık getirisi 15.000 TL (ROI %30). Kredi faizi %18 → kredi mantıklı',
    checklist: ['ROI hesaplandı mı?', 'Faiz oranı karşılaştırıldı mı?', 'Geri ödeme planı nakit akışına uygun mu?'],
    warning: 'Kredi işletme sermayesi için değil, yatırım için kullanılmalıdır. Maaş ödemek için kredi almayın.',
    seeAlso: ['Borç Ödeme Stratejisi', 'Nakit Akışı'],
  },
  {
    title: 'Sabit Giderler',
    desc: 'Değişmeyen maliyetler',
    problem: 'Giderlerim çok yüksek, nereden kısabilirim?',
    quickAnswer: 'Sabit giderler = satıştan bağımsız, her ay ödenen giderler (kira, maaş, aidat). En tehlikeli gider türüdür.',
    cat: 'temel-finans', sub: 'Gider Yönetimi',
    steps: [
      '1. Tüm sabit giderleri listele',
      '2. Gerekli (kira) ve gereksiz (lüks) diye ayır',
      '3. Gereksizleri kes',
      '4. Gereklileri müzakere et (indirim, küçülme)',
    ],
    example: 'Kira 5.000, maaşlar 15.000, aidat 500, yazılım lisans 300 → toplam 20.800 TL/ay',
    checklist: ['Her kalem sorgulandı mı?', 'Alternatif teklif alındı mı?', 'Dijital abonelikler kontrol edildi mi?'],
    warning: 'Sabit giderler satış düşse bile ödenir. Oranı toplam giderin %50\'sini geçmemelidir.',
    seeAlso: ['Değişken Giderler', 'İşletme Bütçesi'],
  },
  {
    title: 'Değişken Giderler',
    desc: 'Satışla orantılı giderler',
    problem: 'Satış arttıkça giderler de artıyor, normal mi?',
    quickAnswer: 'Değişken gider = satışla doğru orantılı (hammadde, kargo, komisyon). Satışın %60-70\'ini geçmemelidir.',
    cat: 'temel-finans', sub: 'Gider Yönetimi',
    steps: [
      '1. Tüm değişken giderleri satış yüzdesi olarak hesapla',
      '2. Sektör ortalamasıyla karşılaştır',
      '3. Yüksekse tedarikçi değiştir veya fiyat güncelle',
      '4. Sabit/değişken oranını optimize et',
    ],
    example: 'Satış 50.000 TL, hammadde 20.000 TL (%40), kargo 3.000 TL (%6), komisyon 5.000 TL (%10) → toplam %56',
    checklist: ['Oranlar sektör ortalamasına uygun mu?', 'Alternatif tedarikçi var mı?', 'Toplu alım iskontosu mümkün mü?'],
    warning: 'Satış artarken toplam değişken gider artar, ama birim maliyet düşmelidir.',
    seeAlso: ['Sabit Giderler', 'Brüt Kâr'],
  },
  {
    title: 'Fırsat Maliyeti',
    desc: 'Bir seçimden vazgeçmenin bedeli',
    problem: 'İki iş arasında kararsız kaldım, hangisini seçmeliyim?',
    quickAnswer: 'Fırsat maliyeti = seçmediğin alternatifin getireceği en yüksek fayda. Karar verirken bunu hesaba kat.',
    cat: 'temel-finans', sub: 'Gider Yönetimi',
    steps: [
      '1. Seçenekleri listele',
      '2. Her birinin beklenen getirisini hesapla',
      '3. En yüksek getirili alternatifi belirle',
      '4. Seçtiğinin getirisi ile vazgeçtiğinin getirisini karşılaştır',
    ],
    example: 'Ya yeni ürün çıkar (tahmini kâr 20.000 TL) ya da mevcut ürüne yatırım yap (tahmini kâr 15.000 TL). Yeni ürünü seçersen fırsat maliyeti 15.000 TL değil, net kazanç 5.000 TL.',
    checklist: ['Tüm alternatifler değerlendirildi mi?', 'Getiri tahmini gerçekçi mi?', 'Risk faktörü dahil edildi mi?'],
    warning: 'Fırsat maliyeti sadece parayla ölçülmez. Zaman, enerji ve ekip kaynağını da hesaba katın.',
    seeAlso: ['Kredi Kullanımı', 'Yatırım Getirisi'],
  },
]

function buildKnowledgeObjects(defs: TopicDef[]): any[] {
  const kos: any[] = []
  for (const t of defs) {
    const learnSteps = [
      { type: 'concept', title: 'Konunun Özü', body: t.desc },
      { type: 'steps', title: 'Uygulama Adımları', steps: t.steps },
      { type: 'example', title: 'Örnek', scenario: t.example },
    ]
    if (t.formula) {
      learnSteps.push({ type: 'concept', title: 'Formül', body: t.formula })
    }
    const applySteps = [
      { type: 'checklist', title: 'Kontrol Listesi', items: t.checklist },
    ]

    kos.push({
      type: 'concept',
      title: t.title,
      summary: t.desc,
      problem: t.problem,
      quickAnswer: t.quickAnswer,
      learnSteps: JSON.stringify(learnSteps),
      applySteps: JSON.stringify(applySteps),
      warning: t.warning,
      task: `${t.title} konusunu kendi işletmende uygula ve sonuçları bir hafta sonra değerlendir.`,
      seeAlso: JSON.stringify(t.seeAlso),
      embedding: '[]',
      metadata: JSON.stringify({
        category: t.cat,
        subcategory: t.sub,
        level: 'Başlangıç',
        difficulty: 1,
        estimatedTime: '10-15 dakika',
        tags: [t.cat, t.sub, t.title.toLocaleLowerCase('tr-TR')],
      }),
    })
  }
  return kos
}

async function main() {
  console.log('Knowledge Object seed başlıyor...')

  const knowledgeObjects = buildKnowledgeObjects(financeTopics)

  console.log(`Siliniyor...`)
  await prisma.knowledgeObject.deleteMany({})

  console.log(`${knowledgeObjects.length} KO ekleniyor...`)
  const batchSize = 20
  for (let i = 0; i < knowledgeObjects.length; i += batchSize) {
    const batch = knowledgeObjects.slice(i, i + batchSize)
    await prisma.knowledgeObject.createMany({ data: batch })
    console.log(`  ${Math.min(i + batchSize, knowledgeObjects.length)}/${knowledgeObjects.length}`)
  }

  console.log('Seed tamamlandı!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())