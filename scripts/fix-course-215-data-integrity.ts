import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_COURSE_ID = 215
const TARGET_LESSON_ID = 919
const TARGET_KO_ID = 206
const DUPLICATE_COURSE_ID = 44
const DUPLICATE_KO_ID = 207

const newContent = `# Pazar Yeri Seçimi: Başlangıç Kanalını Belirleme

İnternetten satışa başlarken vereceğin ilk önemli karar "En büyük platform hangisi?" değildir. Asıl yanıtlaman gereken soru şudur:

> "Hedef müşterime ulaşabildiğim, ürün başına yeterli katkı bırakan ve mevcut kapasitemle yönetebildiğim başlangıç kanalı hangisi?"

Bir kanal çok yüksek ziyaretçi çekebilir; ancak komisyonlar, kargo, iadeler ve reklam giderleri nedeniyle sana yeterli katkı bırakmayabilir. Kendi e-ticaret sitende pazar yeri komisyonunun olmaması da o kanalın maliyetsiz olduğu anlamına gelmez; ödeme altyapısı, yazılım, reklam ve müşteri edinme giderleri hesaba katılmalıdır.

Bu dersin amacı sonsuza kadar kullanacağın kanalı seçmek değil; **ilk 30 günlük satış denemeni yapacağın kanalı somut verilerle belirlemektir**.

## 1. Ürün, Müşteri ve Operasyon Uyumunu Ölç

Değerlendirmek üzere üç seçenek belirle: **Pazar Yeri A**, **Pazar Yeri B** ve **Kendi E-Ticaret Siten**.

İşe şu cümleyi doldurarak başla:

> "Ben, [Ürünüm] ürününü; [İhtiyacı] olan [Hedef Müşterim] müşterisine satıyorum."

Ardından her kanal için şu 4 temel soruyu yanıtla:

- **Hedef Müşteri:** Müşterim bu kanalda ürün arıyor mu? Fiyata mı, görsele mi yoksa **teslimat hızına** mı bakıyor?
- **Ürün Uyumu:** Ürünüm kolay paketlenebiliyor mu, varyantı çok mu, kişiselleştirme gerekiyor mu?
- **Mali Katkı:** Tüm kesintilerden sonra ürün başına yeterli katkı kalıyor mu?
- **Operasyon:** Günlük sipariş, kargo, iade ve müşteri hizmetleri yükünü mevcut kapasitemle yönetebilir miyim?

Bu sorulardan biri cevapsızsa mağaza açma aşamasında değilsin; önce veri toplamalısın.

## 2. Finansal Gerçeklik: Katkı Payı ve Nakit Akışı

Bir platformun maliyetini yalnızca ilan edilen komisyon oranıyla öçme. Gerçek maliyet; komisyon, ödeme kesintisi, sabit işlem ücreti, kargo, reklam ve iade yükünün aynı siparişte birlikte hesaplanmasıyla görülür.

> **🛠️ Uygulama bloğu:** Katkı hesabı aşağıdaki formül bloğunda gösterilmiştir.

**Karar Araçları:**
- Komisyon sonrası kalan tutarı hızlıca görmek için **[Pazaryeri komisyonundan sonra ne kalıyor?](/app/decision-checks/DC-MARKETPLACE-004)** aracını kullan.
- Ürün bazlı nihai kârlılığını doğrulamak için **[Ürünüm gerçekten kârlı mı?](/app/decision-checks/DC-PROFIT-001)** aracına başvur.

### Kendi Site Hesabı

Kendi sitende pazar yeri komisyonu yoktur ancak sipariş başına düşen altyapı, sanal POS kesintisi, alan adı, güvenlik, içerik üretimi ve müşteri edinme (reklam) maliyetlerini eklemelisin.

### Nakit Zamanlaması

Hakedişin hesabına yattığı tarih ile tedarikçine, kargoya veya personele ödeme yaptığın tarihi karşılaştır. Hakediş, tedarikçi ödemesinden geç geliyorsa aradaki dönemi kendi paranla finanse etmen gerekir.

> **🛠️ Karar Aracı:** Nakit baskısını öngörmek için **[Nakit akışım riskli mi?](/app/decision-checks/DC-CASHFLOW-008)** aracını çalıştır.

## 3. Kanal Karşılaştırma Tablosu

| Değerlendirme Alanı | Pazar Yeri A | Pazar Yeri B | Kendi E-Ticaret Siten |
|---|---|---|---|
| Müşteri Erişimi | Platform içi arama / Hazır trafik | Platform içi arama / Hazır trafik | Trafiği reklamla sen oluşturursun |
| Ürün Uyumu | Standart listeleme ve kategoriler | Standart listeleme ve kategoriler | Özel ürün sunumu ve kişiselleştirme |
| Maliyet Yapısı | Komisyon + Sabit kesinti + Kargo | Komisyon + Sabit kesinti + Kargo | Ödeme altyapısı + Reklam + Altyapı |
| Nakit Zamanlaması | Sözleşmeli hakediş süresi | Sözleşmeli hakediş süresi | Sanal POS valör süresi |
| Operasyon & İade | Platform kurallarına bağımlı | Platform kurallarına bağımlı | İade ve iletişimi sen yönetirsin |
| En Büyük Risk | Fiyat rekabeti ve yüksek kesinti | Bağımlılık ve ceza puanları | Trafik çekememe ve yüksek reklam maliyeti |

## 4. Vaka Analizi: Derya’nın 30 Günlük Başlangıç Kararı

Ankara’da el yapımı bez çanta üreten Derya, sipariş ve paketlemeyi tek başına yönetmektedir. Ürün satış fiyatı 650 TL, ürün maliyeti 280 TL, ambalaj 25 TL ve iade payı 20 TL'dir. *(Örnek varsayımsal verilerdir.)*

| Kanal | Kesintiler | Kargo | Reklam | Tahmini Ürün Başına Katkı |
|---|---|---|---|---|
| Pazar Yeri A | 105 TL | 60 TL | 25 TL | 135 TL |
| Pazar Yeri B | 80 TL | 75 TL | 45 TL | 125 TL |
| Kendi Site | 35 TL | 80 TL | 110 TL | 100 TL |

**Derya’nın Kararı:** Derya ilk 30 günlük test için Pazar Yeri A'yı seçer.

**Seçim Gerekçeleri:**
1. Hedef kitlenin benzer ürünleri bu kanalda aradığına dair güçlü gözlem olması.
2. Tahmini hesapta ürün başına en yüksek katkıyı sunması.
3. Hazır altyapının tek kişilik operasyon kapasitesine uygunluğu.

Kendi sitesini ise pazarı, müşteri sorularını ve iade nedenlerini öğrendikten sonra değerlendirmek üzere erteler.

## 5. Kanal Seçim Kartı

Aşağıdaki şablonu kendi işletme verilerinle doldur. Bu kartı doldurmadan başlangıç kanalı kararını kesinleştirme.

> **🛠️ Uygulama bloğu:** Kanal Seçim Kartı aşağıda gösterilmiştir.

## 6. İlk 30 Gün Takip Edilecek 5 Temel Metrik

30 günlük test boyunca yalnızca satış adedine değil, şu 5 temel göstergeye bak:

1. **Dönüşüm Oranı (Sepet/Sipariş):** Ürün sayfasının ziyaretçiyi alıcıya dönüştürme gücü.
2. **Sipariş Başına Net Katkı (TL):** Her satışın tüm kesintilerden sonra işletmeye bıraktığı tutar.
3. **Müşteri Edinme Maliyeti (CAC / Reklam Payı):** Tek bir sipariş elde etmek için harcanan reklam tutarı.
4. **İade Oranı ve Nedenleri:** Ürün veya beklenti uyumsuzluğundan kaynaklanan zararlar.
5. **Hakediş-Ödeme Farkı:** Nakit akışında oluşan operasyonel sıkışma düzeyi.

## 7. Mevzuat ve Resmî Kontrol Listesi

E-ticarete başlarken aşağıdaki resmî kontrolleri tamamla. Liste detaylı uygulama bloğu olarak gösterilmiştir.

## Ders Sonu Görevi

**En az iki gerçekçi satış kanalının güncel koşullarını araştır. İşletmen için anlamlıysa kendi e-ticaret siteni üçüncü seçenek olarak ekle.**

Kararını şu cümleyle kesinleştir:

> "İlk 30 günlük satış denememe [Kanal Adı] kanalında başlayacağım. Bu kanalı seçtim çünkü [Gerekçe 1], [Gerekçe 2] ve [Gerekçe 3]. Kararımı 30 gün sonra [Metrik 1], [Metrik 2] ve [Metrik 3] verilerini kullanarak yeniden değerlendireceğim."

## Doğrulanmış Kaynaklar

1. [T.C. Ticaret Bakanlığı – ETBİS E-Ticaret Akademisi](https://eticaret.gov.tr/cevrimiciegitim)
2. [T.C. Ticaret Bakanlığı – Elektronik Ticaret Mevzuatı](https://ticaret.gov.tr/ic-ticaret/elektronik-ticaret/mevzuat)
3. [T.C. Ticaret Bakanlığı – Mesafeli Sözleşmeler Rehberi](https://tuketici.ticaret.gov.tr)
4. [Gelir İdaresi Başkanlığı – e-Belge Uygulamaları](https://ebelge.gib.gov.tr)

*(Kaynaklar kavramsal çerçeveyi destekler. Ders örneklerindeki sayılar sektör ortalaması değildir; kendi işletmenin güncel verileriyle değiştirilmelidir.)*`

const newSummary = 'İnternetten satışa başlarken hedef müşteriye ulaşan, yeterli katkı bırakan ve mevcut kapasiteyle yönetilebilen başlangıç kanalını komisyon, kargo, reklam ve nakit akışı verileriyle somutlaştır.'

const newLearningOutcomes = [
  'Ürün, müşteri ve operasyon uyumunu ölçerek başlangıç kanalı adaylarını belirlemek',
  'Ürün başına katkıyı ve nakit zamanlamasını hesaplayarak kanalın gerçek maliyetini karşılaştırmak',
  'İlk 30 günlük deneme için kanal seçimini ve izlenecek metrikleri kaydetmek'
]

const newKeyTakeaways = [
  'Başlangıç kanalı seçerken yalnızca komisyon değil; ödeme, kargo, reklam ve iade yükünün toplam katkıyı belirlediğini hatırla.',
  'Kendi e-ticaret sitesi komisyonsuz değildir; altyapı, POS, reklam ve trafik maliyetleri vardır.',
  'İlk 30 günlük deneme için 5 temel metriği takip et; kararı 30 gün sonra verilerle yeniden değerlendir.',
  'Nakit akışındaki hakediş-ödeme farkı, kanal seçiminde en az komisyon kadar kritiktir.'
]

const newCommonMistakes = [
  'Yalnızca komisyon oranına bakıp diğer kesintileri unutmak.',
  'En popüler platformu seçmek yerine ürün–müşteri uyumunu ve operasyon kapasitesini göz ardı etmek.',
  'Başlangıç için birden fazla kanalı eş zamanlı yönetmeye kalkmak.'
]

const newExample = 'Ankara’da el yapımı bez çanta üreten Derya, ilk 30 günlük test için Pazar Yeri A’yı seçer; çünkü hedef kitlesi bu kanalda arıyor, ürün başına katkı en yüksek ve tek kişilik operasyonu yönetebiliyor.'

const newNextAction = 'En az iki gerçekçi satış kanalının güncel koşullarını araştır; kendi e-ticaret siteni anlamlıysa üçüncü seçenek olarak ekle ve ilk 30 günlük deneme kararını kaydet.'

const newTaskText = 'En az iki gerçekçi satış kanalının güncel koşullarını araştır. İşletmen için anlamlıysa kendi e-ticaret siteni üçüncü seçenek olarak ekle. Kararını şu cümleyle kesinleştir: "İlk 30 günlük satış denememe [Kanal Adı] kanalında başlayacağım. Bu kanalı seçtim çünkü [Gerekçe 1], [Gerekçe 2] ve [Gerekçe 3]. Kararımı 30 gün sonra [Metrik 1], [Metrik 2] ve [Metrik 3] verilerini kullanarak yeniden değerlendireceğim."'

const sourceDefinitions = [
  { title: 'T.C. Ticaret Bakanlığı – ETBİS E-Ticaret Akademisi', url: 'https://eticaret.gov.tr/cevrimiciegitim', authorityLevel: 'high' },
  { title: 'T.C. Ticaret Bakanlığı – Elektronik Ticaret Mevzuatı', url: 'https://ticaret.gov.tr/ic-ticaret/elektronik-ticaret/mevzuat', authorityLevel: 'high' },
  { title: 'T.C. Ticaret Bakanlığı – Mesafeli Sözleşmeler Rehberi', url: 'https://tuketici.ticaret.gov.tr', authorityLevel: 'high' },
  { title: 'Gelir İdaresi Başkanlığı – e-Belge Uygulamaları', url: 'https://ebelge.gib.gov.tr', authorityLevel: 'high' }
]

async function getOrCreateSources() {
  const ids: string[] = []
  for (const s of sourceDefinitions) {
    let source = await prisma.source.findFirst({ where: { url: s.url } })
    if (!source) {
      source = await prisma.source.create({ data: { ...s, lastChecked: new Date() } })
      console.log('Created source', source.id, source.title)
    } else {
      source = await prisma.source.update({
        where: { id: source.id },
        data: { title: s.title, authorityLevel: s.authorityLevel, lastChecked: new Date() }
      })
      console.log('Updated source', source.id, source.title)
    }
    ids.push(source.id)
  }
  return ids
}

async function main() {
  const sourceIds = await getOrCreateSources()

  // Move practical cards from duplicate KO 207 to target KO 206
  const cardsOn207 = await prisma.practicalCardKnowledgeObject.findMany({
    where: { knowledgeObjectId: DUPLICATE_KO_ID }
  })
  console.log(`Found ${cardsOn207.length} practical cards linked to KO ${DUPLICATE_KO_ID}`)

  for (const link of cardsOn207) {
    await prisma.practicalCardKnowledgeObject.delete({
      where: {
        practicalCardId_knowledgeObjectId: {
          practicalCardId: link.practicalCardId,
          knowledgeObjectId: DUPLICATE_KO_ID
        }
      }
    })
    await prisma.practicalCardKnowledgeObject.create({
      data: {
        practicalCardId: link.practicalCardId,
        knowledgeObjectId: TARGET_KO_ID,
        order: link.order
      }
    })
  }
  console.log(`Moved practical cards to KO ${TARGET_KO_ID}`)

  // Update source links for target KO
  await prisma.knowledgeObjectSource.deleteMany({ where: { koId: TARGET_KO_ID } })
  await prisma.knowledgeObjectSource.createMany({
    data: sourceIds.map((sourceId) => ({
      koId: TARGET_KO_ID,
      sourceId,
      relation: 'references'
    } as any))
  })
  console.log(`Updated KO ${TARGET_KO_ID} sources`)

  // Read current metadata and update
  const ko = await prisma.knowledgeObject.findUnique({ where: { id: TARGET_KO_ID } })
  if (!ko) throw new Error(`KO ${TARGET_KO_ID} not found`)
  const meta = JSON.parse(ko.metadata || '{}')

  meta.summary = newSummary
  meta.learningOutcomes = newLearningOutcomes
  meta.keyTakeaways = newKeyTakeaways
  meta.commonMistakes = newCommonMistakes
  meta.example = newExample
  meta.nextAction = newNextAction
  meta.level = 'Orta'
  meta.difficulty = 3
  meta.estimatedTime = '16 dakika'
  meta.estimatedMinutes = 16
  meta.contentVersion = (meta.contentVersion || 0) + 1
  meta.taskVersion = (meta.taskVersion || 0) + 1
  meta.editorialState = 'published-owner-authorized-v3'
  meta.courseTopic = 'Pazar Yeri Seçimi'
  meta.illustrativeCasePolicy = 'labeled-not-benchmark'
  meta.sourcePolicy = 'linked-source-bibliography-no-unsupported-current-rates'
  // Remove stale enrichment fields that contain old jargon
  delete meta.quiz
  delete meta.coursePurpose
  delete meta.courseOutcomes

  // Update KO
  await prisma.knowledgeObject.update({
    where: { id: TARGET_KO_ID },
    data: {
      title: 'Pazar Yeri Seçimi: Başlangıç Kanalını Belirleme',
      content: newContent,
      summary: newSummary,
      task: newTaskText,
      metadata: JSON.stringify(meta),
      status: 'published',
      verificationStatus: 'verified',
      reviewGate: 'standard',
      archivedAt: null
    }
  })
  console.log(`Updated KO ${TARGET_KO_ID} content and metadata`)

  // Create a new version record
  const latestVersion = await prisma.knowledgeObjectVersion.findFirst({
    where: { koId: TARGET_KO_ID },
    orderBy: { versionNumber: 'desc' }
  })
  const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1
  const newVersion = await prisma.knowledgeObjectVersion.create({
    data: {
      koId: TARGET_KO_ID,
      versionNumber: nextVersionNumber,
      changes: 'Altın standart Pazar Yeri Seçimi içeriği course 215 1. derse uygulandı; eski kanıt çantası/vardiyalık gözlem içeriği kaldırıldı.',
      createdBy: 1
    }
  })
  await prisma.knowledgeObject.update({
    where: { id: TARGET_KO_ID },
    data: { currentVersionId: newVersion.id }
  })
  console.log(`Created KO version ${nextVersionNumber} and set currentVersionId`)

  // Update task template
  const existingTemplate = await prisma.taskTemplate.findFirst({ where: { koId: TARGET_KO_ID } })
  const taskPayload = {
    koId: TARGET_KO_ID,
    title: 'Pazar Yeri Seçimi: İlk 30 Günlük Kanal Kararını Kaydet',
    description: 'En az iki gerçekçi satış kanalının güncel koşullarını araştır; kendi e-ticaret siteni anlamlıysa üçüncü seçenek olarak ekle ve kararını cümleyle kaydet.',
    estimatedTime: 25,
    instructions: JSON.stringify([
      'İki gerçekçi satış kanalının güncel komisyon, kargo ve hakediş koşullarını araştır.',
      'İşletmen için anlamlıysa kendi e-ticaret siteni üçüncü seçenek olarak ekle.',
      'Her kanal için ürün başına katkıyı hesapla.',
      'Hakediş ile tedarikçi ödeme zamanını karşılaştır.',
      'Kararını önerilen cümleyle yaz ve 30 gün sonra değerlendireceğin metrikleri belirle.'
    ]),
    exampleOutput: JSON.stringify({
      kanal: 'Pazar Yeri A',
      gerekce: 'Hedef kitle bu kanalda arıyor; ürün başına katkı en yüksek; tek kişilik operasyona uygun',
      alternatif: 'Pazar Yeri B',
      gecisKosulu: '30 günde 10 sipariş ve pozitif katkı sağlanamazsa Pazar Yeri B’ye geç',
      metrikler: 'Dönüşüm oranı, sipariş başına net katkı, müşteri edinme maliyeti, iade oranı, hakediş-ödeme farkı'
    }),
    checklist: JSON.stringify([
      'En az iki gerçekçi kanal araştırıldı',
      'Ürün başına katkı hesaplandı',
      'Hakediş/ödeme zamanlaması karşılaştırıldı',
      'Karar cümlesiyle kaydedildi',
      '30 günlük metrikler belirlendi'
    ]),
    rubric: JSON.stringify({
      '0': 'Şablon boş veya kanal yok.',
      '1': 'Kanallar listelendi ama katkı veya zamanlama eksik.',
      '2': 'Katkı ve zamanlama var ama karar cümlesi veya metrik eksik.',
      '3': 'Kanal, gerekçe, katkı, zamanlama, karar cümlesi ve 30 günlük metrikler eksiksiz.'
    })
  }
  if (existingTemplate) {
    await prisma.taskTemplate.update({ where: { id: existingTemplate.id }, data: taskPayload })
  } else {
    await prisma.taskTemplate.create({ data: taskPayload as any })
  }
  console.log(`Updated task template for KO ${TARGET_KO_ID}`)

  // Update target lesson
  await prisma.lesson.update({
    where: { id: TARGET_LESSON_ID },
    data: {
      title: '1. Pazar Yeri Seçimi: Başlangıç Kanalını Belirleme',
      content: newContent,
      order: 1,
      knowledgeObjectId: TARGET_KO_ID,
      estimatedMinutes: 16
    }
  })
  console.log(`Updated lesson ${TARGET_LESSON_ID}`)

  // Archive duplicate KO 207
  await prisma.knowledgeObject.update({
    where: { id: DUPLICATE_KO_ID },
    data: {
      status: 'archived',
      archivedAt: new Date()
    }
  })
  console.log(`Archived duplicate KO ${DUPLICATE_KO_ID}`)

  // Unpublish duplicate course 44
  await prisma.course.update({
    where: { id: DUPLICATE_COURSE_ID },
    data: {
      published: false,
      title: '[Eski Kopya] Pazar Yeri Seçimi'
    }
  })
  console.log(`Unpublished duplicate course ${DUPLICATE_COURSE_ID}`)

  // Verify course 215 first lesson order and titles
  const course215 = await prisma.course.findUnique({
    where: { id: TARGET_COURSE_ID },
    include: { lessons: { orderBy: { order: 'asc' } } }
  })
  console.log('\nCourse 215 lessons after fix:')
  for (const l of course215?.lessons || []) {
    console.log(`  ${l.order}. lesson ${l.id}: ${l.title}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
