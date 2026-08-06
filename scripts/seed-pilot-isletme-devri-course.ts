import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Pilot kurs — "İşi Satın Alma ve Yatırım Değerlendirmesi" adayı kategori.
// Kaynak taslak: docs/content-pilot/isletmeyi-devralmadan-once-kontrol-et.md
// Kullanıcı onayı: 2026-08-05 (sohbet oturumu).
// Bu script idempotenttir; tekrar çalıştırıldığında mevcut kayıtları günceller, çoğaltmaz.

const COURSE_SLUG = 'v5-isletmeyi-devralmadan-once-kontrol-et'
const COURSE_CATEGORY = 'İşi Satın Alma ve Yatırım Değerlendirmesi'

const LESSONS = [
  {
    order: 1,
    koCode: 'CUR-121-01',
    title: '1. Satıcının Anlattığı Hikâye ile Kasadaki Rakam Aynı mı?',
    task: 'Mali Doğrulama Kontrol Listesi',
    estimatedMinutes: 12,
    metric: 'Sözlü rakam ile beyan edilen rakam arasındaki fark yüzdesi',
    content: `# Satıcının Anlattığı Hikâye ile Kasadaki Rakam Aynı mı?

İlan metni her zaman aynı cümleyle biter: "Devren satılık, sabit müşterisi var, kârlı işletme." Bu cümle bir gerçeklik değil, bir pazarlık açılışıdır. Sizin işiniz, satıcının anlattığıyla defterdeki rakamın örtüşüp örtüşmediğini, kapıyı çalmadan önce anlamaktır.

Bir örnekle başlayalım. Bursa'da bir kırtasiye-fotokopi işletmesine talip olduğunuzu düşünün. Satıcı size "ayda net 45.000 TL kâr bırakıyor" diyor. Bu cümle üç farklı şey anlamına gelebilir: (1) beyan edilen vergi matrahına göre net kâr, (2) satıcının kendi tahmini "cepte kalan" para, (3) kira ve elektrik gibi sabit giderler hâlâ ödenmeden önceki rakam. Üçü de "net kâr" diye anlatılır, üçü de farklı bir işletme değeri anlamına gelir.

## Hangi belgeyi isteyeceğinizi bilin

Sözle anlatılan hiçbir rakam, belgeyle doğrulanmadan pazarlık masasına girmemeli:

- Son 12 ayın **KDV beyannameleri** — gerçek aylık ciro dalgalanmasını gösterir, "iyi ay" seçilerek anlatılmaz.
- **Gelir/kurumlar vergisi beyannamesi** — yıllık beyan edilen kâr, satıcının sözlü rakamıyla karşılaştırılır.
- **Banka hesap dökümü** (en az 6 ay) — nakit girişleri beyan edilen ciroyla tutarlı mı?
- Varsa **POS/yazarkasa Z raporu özeti** — günlük satışın gerçek dağılımı.

Bu dört belge birbirini doğrulamıyorsa (örneğin banka girişi beyan edilen cironun çok altındaysa), bu tek başına "işletme kötü" anlamına gelmez — ama neden farklı olduğu açıklanana kadar hiçbir rakama güvenmeyin.

## Kırtasiye örneğinde ne çıktı?

Satıcının sözlü rakamı: aylık 45.000 TL net kâr.
KDV beyannamelerinden çıkan ortalama aylık ciro: 210.000 TL.
Vergi beyannamesindeki yıllık net kâr: 310.000 TL → aylık ortalama 25.833 TL.

Fark, sözlü rakamla beyan edilen rakam arasında %43. Bu, satıcının yalan söylediği anlamına gelmiyor olabilir — kayıt dışı satış, mevsimsel dalgalanma ya da iyimser yuvarlama söz konusu olabilir. Ama bu farkı görmeden fiyat pazarlığına oturursanız, satıcının en iyimser senaryosu üzerinden fiyat vermiş olursunuz.

## Bu dersten çıkacak çalışma kaydınız

**Mali Doğrulama Kontrol Listesi**: istenen 4 belge, alınıp alınmadığı, beyan edilen rakamla sözlü rakam arasındaki fark yüzdesi, ve bu farkın kabul edilebilir bir açıklaması olup olmadığı. Bu kayıt, üçüncü derste fiyat değerlendirmesinin girdisi olacak.

> Bu işletmeyi bir krediyle finanse etmeyi düşünüyorsanız, aylık taksitin gerçek (beyan edilen, sözlü değil) nakit akışını nasıl etkileyeceğini **Kredi Taksitini Karşılayabilir miyim?** karar aracıyla ayrıca kontrol edin.

## Kaynaklar

1. [SCORE — Buying a Business: Due Diligence Checklist](https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist)
2. [FindLaw — Buying a Business Due Diligence Checklist](https://www.findlaw.com/smallbusiness/starting-a-business/buying-a-business-due-diligence-checklist.html)

*Kaynaklar Ağustos 2026'da bağlantı ve konu uygunluğu açısından kontrol edilmiştir. Vergi ve muhasebe kayıtlarının doğrulanması için mutlaka bir mali müşavir görüşü alın.*`
  },
  {
    order: 2,
    koCode: 'CUR-121-02',
    title: '2. Devraldığınızda Borçları da Devralabilirsiniz: Sözleşmeleri Okuyun',
    task: 'Hukuki ve Sözleşme Kontrol Listesi',
    estimatedMinutes: 13,
    metric: 'Devir kapsamında açıkça yazılı kalem sayısı / toplam kritik kalem sayısı',
    content: `# Devraldığınızda Borçları da Devralabilirsiniz: Sözleşmeleri Okuyun

Burada çoğu ilk kez işletme alan kişinin bilmediği, ama sonucu ağır bir hukuki gerçek var: **Türk Ticaret Kanunu'na göre bir ticari işletme devredildiğinde, işletmeyle ilgili borç ve yükümlülükler de — aksi kararlaştırılmadıkça — devralana geçer.** Yani "ben sadece dükkânı ve malı aldım, eski borçlar satıcının sorunu" varsayımı, sözleşmede açıkça yazılmadığı sürece yanlıştır.

## Neyi devraldığınızı sözleşmede tek tek sayın

Devir sözleşmesi kapsamına şunlar girer, aksi açıkça belirtilmedikçe:

- duran malvarlığı (demirbaş, ekipman),
- işletme değeri (marka bilinirliği, müşteri portföyü),
- **kiracılık hakkı** — eğer dükkân kiralıksa, kira sözleşmesinin devredilip devredilemeyeceği ayrı bir konudur; ev sahibinin onayı gerekebilir,
- ticaret unvanı ve varsa diğer fikri mülkiyet hakları,
- işletmeye özgülenmiş borç ve yükümlülükler.

Bunlardan biri veya birkaçı devrin dışında bırakılabilir — **ama bu, sözleşmede açıkça yazılmalıdır.** "Ne varsa hepsi bende kalır" diyen bir satıcının sözlü beyanı, TTK karşısında hiçbir şey ifade etmez.

## Somut kontrol adımı: borç ve dava sorgusu

Devralmadan önce üç sorguyu ayrı ayrı yapın:

1. İşletmenin adına açılmış **icra takibi** var mı? (İcra dairesinden veya avukat aracılığıyla sorgulanabilir.)
2. Tedarikçilere, kargo firmasına, elektrik/su/doğalgaz aboneliğine **açık borç** var mı? Son 3 aylık fatura ve ödeme dekontu istenmeli.
3. Kira sözleşmesinin bitiş tarihi ne zaman, devrine ev sahibi onay veriyor mu?

Kırtasiye örneğimizde satıcı "borcum yok" dedi, ama kağıt tedarikçisine 3 aylık vadeli 40.000 TL borç çıktı. Bu borç sözleşmede açıkça satıcıda bırakılmazsa, alıcı bu borcu üstlenmiş sayılabilir.

## Esnaf düzeyindeki işletmelerde fark

İşletme bir şahıs esnaf işletmesi düzeyindeyse (anonim/limited şirket değilse), devir Türk Borçlar Kanunu hükümlerine tabi olur ve esnaf sicil kaydının da devri gerekir. Bu, ticaret sicilindeki büyük işletme devrinden ayrı bir süreçtir — hangi sicile kayıtlı olduğunuzu (esnaf sicili mi, ticaret sicili mi) en başta netleştirin, çünkü devir prosedürü buna göre değişir.

## Bu dersten çıkacak çalışma kaydınız

**Hukuki ve Sözleşme Kontrol Listesi**: devir kapsamına giren/girmeyen kalemlerin sözleşmede tek tek yazılı olup olmadığı, icra/borç sorgusu sonucu, kira sözleşmesi devrinin onaylanıp onaylanmadığı. Bu belge olmadan noterde imza atmayın.

## Kaynaklar

1. [TOBB — Türk Ticaret Kanunu Tescil ve İlana Tâbi Maddeler](https://www.tobb.org.tr/Documents/ttk/ttk_tescil_ilan_maddeler.pdf)
2. [DergiPark — Türk Ticaret Kanunu Uyarınca Ticari İşletmenin Devri (madde 11 incelemesi)](https://dergipark.org.tr/tr/download/article-file/179455)
3. [Resmî Gazete — Esnaf ve Sanatkârlar Sicili Yönetmeliği](https://www.resmigazete.gov.tr/eskiler/2018/12/20181214-2.htm)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Bu ders genel bilgilendirme amaçlıdır; devir sözleşmesini imzalamadan önce mutlaka bir hukuk uzmanına danışın.*`
  },
  {
    order: 3,
    koCode: 'CUR-121-03',
    title: '3. Bu Fiyat Gerçekten Değerine mi Satılıyor?',
    task: 'Devir Fiyatı Değerlendirme Tablosu',
    estimatedMinutes: 14,
    metric: 'Üç değerleme yöntemiyle çıkan aralık ile istenen fiyat arasındaki fark',
    content: `# Bu Fiyat Gerçekten Değerine mi Satılıyor?

Doğrulanmış rakamlarınız elinizde (Ders 1). Şimdi soru şu: satıcının istediği fiyat, bu rakamlara göre makul mü?

Küçük işletme devirlerinde en yaygın kullanılan üç yaklaşım var; hiçbiri tek başına "doğru fiyat" vermez, ama ikisi aynı bölgeye işaret ediyorsa pazarlık gücünüz artar.

## Yaklaşım 1 — Kâr çarpanı (en hızlı, esnaf ölçeğinde en yaygın)

Doğrulanmış yıllık net kârı, sektöre göre değişen bir çarpanla (genelde küçük işletmelerde 1,5–3 kat arası) çarparsınız. Kırtasiye örneğimizde doğrulanmış yıllık net kâr 310.000 TL idi. 2 kat çarpanla değer aralığı yaklaşık 465.000–620.000 TL çıkar (1,5–2 kat). Satıcının istediği fiyat 900.000 TL ise, bu aralığın belirgin şekilde üzerindedir — bu, "almayın" demek değil, "neden bu kadar yüksek?" sorusunu sormanız gerektiği anlamına gelir (belki lokasyon, belki uzun kalan kira süresi bunu açıklıyor olabilir).

## Yaklaşım 2 — Varlık bazlı değer

Demirbaş, stok ve ekipmanın ikinci el piyasa değeri toplanır, varsa borç düşülür. Bu yöntem özellikle "müşteri portföyü zayıf ama ekipman değerli" işletmelerde satıcının istediği fiyata bir taban çizer — fiyat bu tabanın çok altındaysa pazarlık payınız daha nettir.

## Yaklaşım 3 — Piyasa karşılaştırması

Aynı bölgede, benzer büyüklükte satılmış veya satılık başka işletmelerin fiyatları neyse, sizinkini onlarla kıyaslayın (esnaf odaları, sektör grupları veya emlak/işletme ilan siteleri üzerinden yaklaşık bir aralık çıkarılabilir).

## Üç yaklaşımı yan yana koyun

Kırtasiye örneği için üç yaklaşım: kâr çarpanı 465–620 bin TL, varlık bazlı 380 bin TL, piyasa karşılaştırması 500–700 bin TL bandı gösteriyor olsun. Üçü de 900 bin TL'nin belirgin altında kalıyorsa, bu tek bir yöntemin hatası değil, tutarlı bir sinyaldir.

## Bu dersten çıkacak çalışma kaydınız

**Devir Fiyatı Değerlendirme Tablosu**: üç yöntemle çıkan değer aralığı, satıcının istediği fiyat, aradaki fark ve pazarlıkta kullanacağınız somut gerekçe (örneğin "kâr çarpanına göre teklif fiyatınız X, gerekçeniz Y").

> Ödemeyi tamamen nakit değil, kısmen kredi ile yapmayı düşünüyorsanız, teklif fiyatınızı netleştirdikten sonra taksitin işletmenin gerçek nakit akışını nasıl etkileyeceğini **Nakit Akışım Riskli mi?** aracıyla test edin.

## Kaynaklar

1. [Peak Business Valuation — SBA Business Valuation Methods (piyasa/gelir/varlık yaklaşımları)](https://peakbusinessvaluation.com/sba-business-valuation-methods/)
2. [SCORE — Buying a Business: Due Diligence Checklist](https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Değerleme yöntemleri ABD küçük işletme piyasası referans alınarak anlatılmıştır; Türkiye'de sektöre özgü çarpan aralıkları için bölgenizdeki esnaf/ticaret odasına veya bir mali müşavire danışın.*`
  },
  {
    order: 4,
    koCode: 'CUR-121-04',
    title: '4. Devir Sonrası İlk 90 Günü Riskten Çıkarın',
    task: 'Devir Sonrası Aksiyon Planı',
    estimatedMinutes: 12,
    metric: 'Gerçekleşen haftalık ciro / Ders 1\'de doğrulanan hedef ciro',
    content: `# Devir Sonrası İlk 90 Günü Riskten Çıkarın

İşletmeyi doğru fiyata, sağlam bir sözleşmeyle devraldınız. En sık yapılan hata burada biter: "artık benim işletmem" diyip geçiş sürecini plansız bırakmak. Devirden sonraki ilk 90 gün, işletmenin hayatta kalıp kalmayacağını çoğu zaman belirler.

## Üç risk alanı

**Müşteri kaybı riski.** Sadık müşterilerin bir kısmı işletmeye değil, eski sahibine bağlıdır. Satıcıdan devir öncesi birlikte 2-3 hafta çalışmasını (tanıtım süresi) sözleşmeye madde olarak ekleyin.

**Personel kaybı riski.** Devirle birlikte çalışanların kıdem ve ihbar hakları genellikle korunur; ama personel, yeni sahibe güvenmediği için kendi isteğiyle ayrılabilir. Anahtar personelle (varsa ustabaşı, deneyimli tezgahtar) devir öncesi ayrı bir görüşme yapın.

**Rekabet riski.** Satıcı, aldığı parayla 200 metre ötede aynı işi tekrar açabilir mi? Sözleşmeye bölge ve süre belirten bir **rekabet etmeme maddesi** eklenmemişse, bu risk açık kalır.

## Geçiş planınızı üç haftaya bölün

- **1. hafta:** resmi devir işlemleri (esnaf/ticaret sicili tescili, ilan), tedarikçi ve banka bilgilendirmesi, tabela/unvan güncellemesi.
- **2-3. hafta:** eski sahiple birlikte çalışma dönemi, personelle bireysel görüşmeler, sadık müşterilere tanıtım.
- **4-12. hafta:** Ders 1'de doğruladığınız ciro rakamıyla gerçekleşen ciroyu haftalık karşılaştırın; sapma varsa nedenini (mevsimsel mi, müşteri kaybı mı) ayırt edin.

## Bu dersten çıkacak çalışma kaydınız

**Devir Sonrası Aksiyon Planı**: geçiş haftalarının takvimi, tanıtım süresi maddesinin sözleşmede olup olmadığı, rekabet etmeme maddesinin olup olmadığı, ve ilk 4 haftalık gerçekleşen cironun Ders 1'deki doğrulanmış rakamla haftalık karşılaştırması.

> İlk 90 günde ciro beklenenin altında kalırsa, bunun bir kriz mi yoksa normal dalgalanma mı olduğunu **Nakit Akışım Riskli mi?** aracıyla erken fark edin — bu dersin çıktısı olan haftalık karşılaştırma tablosu, o aracın girdisi olarak doğrudan kullanılabilir.

## Kaynaklar

1. [SCORE — Buying a Business: Due Diligence Checklist](https://www.score.org/westmoreland/resource/checklist/buying-a-business-due-diligence-checklist)
2. [ticaret.gov.tr — Esnaf ve Sanatkârlar](https://ticaret.gov.tr/esnaf-sanatkarlar)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Personel hakları (kıdem/ihbar) konusunda güncel iş hukuku kurallarını bir uzmanla doğrulayın.*`
  }
]

async function main() {
  console.log('Pilot kurs seed işlemi başlıyor: İşletmeyi Devralmadan Önce Kontrol Et')

  // 1. Course upsert
  let course = await prisma.course.findUnique({ where: { slug: COURSE_SLUG } })
  const courseData = {
    title: 'Var Olan İşletmeyi Devralmadan Önce Kontrol Et',
    description: 'Devren satılık bir işletmeyi almadan önce mali doğrulama, hukuki risk, fiyat değerlendirmesi ve devir sonrası geçişi tek bir kararlar zincirinde yönetin.',
    category: COURSE_CATEGORY,
    level: 'uygulamalı',
    slug: COURSE_SLUG,
    estimatedMinutes: LESSONS.reduce((sum, l) => sum + l.estimatedMinutes, 0),
    outcomes: JSON.stringify([
      'Satıcının beyan ettiği rakamla resmi belgeleri karşılaştırarak mali doğrulama yapabilir',
      'TTK madde 11 kapsamında hangi borç ve yükümlülüklerin devredildiğini ayırt edebilir',
      'Kâr çarpanı, varlık bazlı ve piyasa karşılaştırması yöntemleriyle devir fiyatını değerlendirebilir',
      'Devir sonrası ilk 90 gün için somut bir geçiş ve risk planı hazırlayabilir'
    ]),
    sourceType: 'curated-pilot-v5',
    sortOrder: 700,
    metadata: JSON.stringify({
      standard: 'manual-editorial-pilot-v5',
      qualityStandard: 'manual-pilot-v5',
      generatedFrom: 'manual-editorial-pilot',
      editorialState: 'owner-approved-final',
      teachingMode: 'field-guide',
      lessonCount: LESSONS.length,
      promise: 'Bir işletmeyi devralma kararını mali, hukuki, fiyat ve geçiş riski boyutlarıyla gerekçeli biçimde vermek.',
      sourceDraft: 'docs/content-pilot/isletmeyi-devralmadan-once-kontrol-et.md',
      approvedAt: new Date().toISOString(),
      candidateCategoryBatch: '5-category-20-course-completion-plan'
    }),
    published: true
  }

  if (!course) {
    course = await prisma.course.create({ data: courseData })
    console.log(`✅ Kurs oluşturuldu: ${course.slug} (id=${course.id})`)
  } else {
    course = await prisma.course.update({ where: { id: course.id }, data: courseData })
    console.log(`♻️ Kurs güncellendi: ${course.slug} (id=${course.id})`)
  }

  // 2. KnowledgeObject + Lesson upsert per ders
  for (const lesson of LESSONS) {
    let ko = await prisma.knowledgeObject.findUnique({ where: { code: lesson.koCode } })
    const koData = {
      code: lesson.koCode,
      slug: lesson.koCode.toLowerCase(),
      type: 'procedure',
      title: lesson.title.replace(/^\d+\.\s*/, ''),
      content: lesson.content,
      embedding: '',
      metadata: JSON.stringify({
        category: COURSE_CATEGORY,
        subcategory: 'İşletme Devralma',
        level: 'Orta',
        tags: ['işletme devri', 'due diligence', 'yatırım kararı'],
        version: '1.0',
        source: 'LocalAkademi Pilot v5',
        generatedFrom: 'manual-editorial-pilot',
        editorialState: 'owner-approved-final',
        qualityStandard: 'manual-pilot-v5',
        curriculumCourseSlug: COURSE_SLUG,
        lessonOrder: lesson.order,
        teachingMode: 'field-guide',
        metric: lesson.metric,
        learningArtifact: lesson.task,
        sourceCheckedAt: '2026-08-05',
        estimatedMinutes: lesson.estimatedMinutes,
        countryCode: 'TR',
        language: 'tr'
      }),
      status: 'published',
      verificationStatus: 'verified',
      reviewGate: 'standard',
      publishedAt: new Date(),
      task: lesson.task,
      summary: lesson.title.replace(/^\d+\.\s*/, '')
    }

    if (!ko) {
      ko = await prisma.knowledgeObject.create({ data: koData })
      console.log(`✅ Bilgi Nesnesi oluşturuldu: ${ko.code} (id=${ko.id})`)
    } else {
      ko = await prisma.knowledgeObject.update({ where: { id: ko.id }, data: koData })
      console.log(`♻️ Bilgi Nesnesi güncellendi: ${ko.code} (id=${ko.id})`)
    }

    const existingLesson = await prisma.lesson.findFirst({
      where: { courseId: course.id, knowledgeObjectId: ko.id }
    })
    const lessonData = {
      courseId: course.id,
      title: lesson.title,
      content: lesson.content,
      order: lesson.order,
      knowledgeObjectId: ko.id,
      estimatedMinutes: lesson.estimatedMinutes
    }
    if (!existingLesson) {
      const created = await prisma.lesson.create({ data: lessonData })
      console.log(`✅ Ders oluşturuldu: ${created.title} (id=${created.id})`)
    } else {
      await prisma.lesson.update({ where: { id: existingLesson.id }, data: lessonData })
      console.log(`♻️ Ders güncellendi: ${existingLesson.title} (id=${existingLesson.id})`)
    }
  }

  console.log('✅ Pilot kurs seed işlemi tamamlandı.')
}

main()
  .catch((e) => {
    console.error('❌ HATA:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
