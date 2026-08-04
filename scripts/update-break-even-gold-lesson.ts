import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_COURSE_ID = 210
const TARGET_LESSON_ID = 897
const TARGET_KO_ID = 99

const EXPECTED_KO_CODE = 'CUR-019-04'

const GOLD_TITLE = 'Başabaş Noktası: Sabit Giderleri Kapatmak İçin Kaç Satış Yapmalısın?'

const GOLD_SUMMARY = 'Toplam gelirlerin toplam maliyetlere eşit olduğu kritik satış eşiğini hesapla. Birim katkı payı, sabit/değişken gider ayrımı, güvenlik marjı ve senaryo analiziyle bilinçli fiyat ve kapasite kararı ver.'

const GOLD_TASK = `Çalışma tablonu doldurduktan sonra aşağıdaki cümleyi kendi gerçek verilerinle tamamlayarak işletme kararını kesinleştir:

"Bu ürün için aylık başabaş noktam yaklaşık [ ___ ] adettir. Mevcut kapasitem [ ___ ] adet, gerçekçi satış hedefim [ ___ ] adettir. Fiyat [ ___ ] TL olduğunda ve birim değişken gider [ ___ ] TL olduğunda kararım [ ___ ] olacaktır."

Görev tamamlandığında, başabaş tablonu ve karar cümleni işletme dosyana kaydet. Bir sonraki ay gerçekleşen satışlarınla karşılaştırarak güvenlik marjını güncelle.`

const GOLD_LEARNING_OUTCOMES = [
  'Sabit, değişken ve karma giderleri doğru sınıflandırarak başabaş hesabına hazırlık yapmak',
  'Birim katkı payını hesaplamak ve başabaş satış adedi ile tutarını belirlemek',
  'Fiyat, maliyet veya sabit gider değişimlerinde başabaş eşiğinin nasıl kaydığını senaryo analiziyle değerlendirip bilinçli fiyat kararı vermek'
]

const GOLD_EMBEDDED_BLOCKS = [
  {
    type: 'formula',
    label: 'Birim Katkı ve Başabaş Satış Adedi',
    formulas: ['BKP = P_net − V_net', 'BSA = SG / BKP', 'BST = SG / KMO'],
    inputs: [
      { key: 'P_net', label: 'Birim Satış Fiyatı (KDV hariç)', unit: 'TL' },
      { key: 'V_net', label: 'Birim Değişken Gider (KDV hariç)', unit: 'TL' },
      { key: 'SG', label: 'Toplam Sabit Giderler (aylık)', unit: 'TL' }
    ],
    outputs: [
      { key: 'BKP', label: 'Birim Katkı Payı', unit: 'TL' },
      { key: 'BSA', label: 'Başabaş Satış Adedi', unit: 'adet/ay' }
    ]
  },
  {
    type: 'common_mistake',
    label: 'Birim Katkıyı Net Kâr Sanmak',
    mistake: '"Ürünü 500 TL\'ye satıyorum, değişken giderim 300 TL, her üründen 200 TL kâr ediyorum."',
    correction: 'Sabit giderler tamamen kapanmadan kâr oluşmaz. Birim katkı payı (200 TL) önce biriken sabit giderleri kapatır. Başabaş noktası aşıldıktan sonraki her satış faaliyet sonucuna birim katkı kadar olumlu etki eder.',
    consequence: 'Bu hata yapılırsa erkenden kârda sanılan işletme, sabit giderler eklendiğinde aslında zarar ediyor olabilir.'
  },
  {
    type: 'checklist',
    label: 'Giderleri Hesaba Katmadan Önce Kontrol',
    items: [
      'Sabit ve değişken giderleri aynı zaman dilimi (aylık) için mi topladın?',
      'KDV yaklaşımın tüm kalemlerde tutarlı mı?',
      'Komisyon, kargo, ambalaj, POS kesintisi ve iade payı gibi değişken giderleri ekledin mi?',
      'Karma giderlerin değişken ve sabit paylarını doğru ayırdın mı?'
    ],
    warningIfIncomplete: 'Giderlerini eksik veya yanlış sınıflandırırsan başabaş hesabın gerçeği yansıtmaz; eksik hesaplanan eşik seni zarara sürükleyebilir.'
  },
  {
    type: 'quick_application',
    label: 'Fiyat, Değişken Gider ve Sabit Gider Senaryoları',
    baseScenario: { P_net: 500, V_net: 300, SG: 12000, BKP: 200, BSA: 60 },
    scenarios: [
      { name: 'Satış Fiyatı %10 İndirim', changes: 'P_net: 450', result_BKP: 150, result_BSA: 80 },
      { name: 'Hammadde ve Kargo Zammı', changes: 'V_net: 350', result_BKP: 150, result_BSA: 80 },
      { name: 'Kira Zammı', changes: 'SG: 16000', result_BKP: 200, result_BSA: 80 }
    ],
    insight: 'Her üç senaryoda da başabaş noktası 20 adet yükseldi. Bu, eşiğin fiyat, maliyet ve sabit gider değişimlerine karşı hassas olduğunu gösterir.'
  }
]

const GOLD_DECISION_TOOL_LINKS = [
  { code: 'DC-PROFIT-001', label: 'Ürünüm Gerçekten Kârlı mı?' },
  { code: 'DC-DISCOUNT-002', label: 'Bu indirimi yapabilir miyim?' },
  { code: 'DC-CAMPAIGN-010', label: 'Kampanya yapmak mantıklı mı?' },
  { code: 'DC-CONTINUE-012', label: 'Bu ürünü satmaya devam etmeli miyim?' }
]

const GOLD_SOURCES = [
  {
    title: 'Anadolu Üniversitesi Açıköğretim Fakültesi Yayınları – Yönetim Muhasebesi Ders Kitabı (Ünite 4: Maliyet-Hacim-Kâr Analizleri)',
    url: 'https://ekampus.anadolu.edu.tr/',
    note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.'
  },
  {
    title: 'Atatürk Üniversitesi Açıköğretim Fakültesi Yayınları – Maliyet Muhasebesi Ders Kitabı (Ünite 6)',
    url: 'https://ataaof.edu.tr/',
    note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.'
  },
  {
    title: 'International Labour Organization (ILO) – Start and Improve Your Business (SIYB) Maliyetlendirme Modülü',
    url: 'https://www.ilo.org/',
    note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.'
  },
  {
    title: 'T.C. KOSGEB – Girişimcilik Eğitimi Katılımcı El Kitabı (İş Planı ve Finansal Planlama)',
    url: 'https://www.kosgeb.gov.tr/',
    note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.'
  },
  {
    title: 'International Finance Corporation (IFC / World Bank Group) – SME Financial Management Toolkits',
    url: 'https://www.ifc.org/',
    note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.'
  }
]

async function verifyRelationship() {
  const lesson = await prisma.lesson.findUnique({
    where: { id: TARGET_LESSON_ID },
    include: { course: true, knowledgeObject: true }
  })

  if (!lesson) {
    throw new Error(`Lesson ${TARGET_LESSON_ID} bulunamadı`)
  }
  if (lesson.courseId !== TARGET_COURSE_ID) {
    throw new Error(`Lesson ${TARGET_LESSON_ID}, Course ${TARGET_COURSE_ID} yerine ${lesson.courseId}'e bağlı`)
  }
  if (lesson.knowledgeObjectId !== TARGET_KO_ID) {
    throw new Error(`Lesson ${TARGET_LESSON_ID}, KO ${TARGET_KO_ID} yerine ${lesson.knowledgeObjectId}'e bağlı`)
  }
  if (lesson.knowledgeObject.code !== EXPECTED_KO_CODE) {
    throw new Error(`KO ${TARGET_KO_ID} code '${lesson.knowledgeObject.code}', beklenen '${EXPECTED_KO_CODE}'`)
  }

  console.log(`✓ İlişki doğrulandı: Course ${TARGET_COURSE_ID} → Lesson ${TARGET_LESSON_ID} → KO ${TARGET_KO_ID} (${EXPECTED_KO_CODE})`)
  console.log(`  Course başlığı: "${lesson.course.title}"`)
  console.log(`  Lesson başlığı: "${lesson.title}"`)
}

async function updateKnowledgeObject() {
  const current = await prisma.knowledgeObject.findUnique({ where: { id: TARGET_KO_ID } })
  if (!current) {
    throw new Error(`KO ${TARGET_KO_ID} bulunamadı`)
  }

  const currentMeta = JSON.parse(current.metadata || '{}')

  const updatedMeta = {
    ...currentMeta,
    learningOutcomes: GOLD_LEARNING_OUTCOMES,
    embeddedPracticeBlocks: GOLD_EMBEDDED_BLOCKS,
    decisionToolLinks: GOLD_DECISION_TOOL_LINKS
  }

  await prisma.knowledgeObject.update({
    where: { id: TARGET_KO_ID },
    data: {
      title: GOLD_TITLE,
      content: GOLD_CONTENT,
      summary: GOLD_SUMMARY,
      task: GOLD_TASK,
      metadata: JSON.stringify(updatedMeta)
    }
  })

  console.log(`✓ KO ${TARGET_KO_ID} güncellendi`)
  console.log(`  title: "${GOLD_TITLE}"`)
  console.log(`  content: ${GOLD_CONTENT.length} karakter`)
  console.log(`  learningOutcomes: ${GOLD_LEARNING_OUTCOMES.length} öğe`)
  console.log(`  embeddedPracticeBlocks: ${GOLD_EMBEDDED_BLOCKS.map(b => b.type).join(', ')}`)
  console.log(`  decisionToolLinks: ${GOLD_DECISION_TOOL_LINKS.map(d => d.code).join(', ')}`)
}

async function upsertSources() {
  const existingSources = await prisma.knowledgeObjectSource.findMany({
    where: { koId: TARGET_KO_ID },
    include: { source: true }
  })

  const existingTitles = new Set(existingSources.map(s => s.source.title))

  let created = 0
  let skipped = 0

  for (const s of GOLD_SOURCES) {
    if (existingTitles.has(s.title)) {
      const existing = existingSources.find(es => es.source.title === s.title)!
      if (existing.note !== s.note) {
        await prisma.knowledgeObjectSource.update({
          where: { id: existing.id },
          data: { note: s.note }
        })
        console.log(`  ↻ Kaynak güncellendi: "${s.title.substring(0, 60)}..."`)
      } else {
        skipped++
      }
      continue
    }

    let source = await prisma.source.findFirst({ where: { title: s.title } })
    if (!source) {
      source = await prisma.source.create({
        data: { title: s.title, url: s.url, authorityLevel: 'medium', lastChecked: new Date() }
      })
    }

    await prisma.knowledgeObjectSource.create({
      data: { koId: TARGET_KO_ID, sourceId: source.id, relation: 'references', note: s.note }
    })
    created++
    console.log(`  + Kaynak eklendi: "${s.title.substring(0, 60)}..."`)
  }

  if (skipped > 0) {
    console.log(`  ✓ ${skipped} kaynak zaten mevcut, atlandı`)
  }

  const total = await prisma.knowledgeObjectSource.count({ where: { koId: TARGET_KO_ID } })
  console.log(`  Toplam kaynak: ${total}`)
}

async function verifyUpdate() {
  const ko = await prisma.knowledgeObject.findUnique({ where: { id: TARGET_KO_ID } })
  const meta = JSON.parse(ko!.metadata || '{}')

  const checks: { label: string; pass: boolean }[] = []

  checks.push({ label: 'title', pass: ko!.title === GOLD_TITLE })
  checks.push({ label: 'summary', pass: ko!.summary === GOLD_SUMMARY })
  checks.push({ label: 'content', pass: ko!.content.length === GOLD_CONTENT.length })
  checks.push({ label: 'task', pass: ko!.task?.length === GOLD_TASK.length })
  checks.push({ label: 'learningOutcomes (3 öğe)', pass: meta.learningOutcomes?.length === 3 })
  checks.push({ label: 'embeddedPracticeBlocks (4 blok)', pass: meta.embeddedPracticeBlocks?.length === 4 })
  checks.push({ label: 'decisionToolLinks (4 araç)', pass: meta.decisionToolLinks?.length === 4 })

  const blockTypes = meta.embeddedPracticeBlocks?.map((b: any) => b.type).join(',')
  checks.push({ label: `blok tipleri: ${blockTypes}`, pass: blockTypes === 'formula,common_mistake,checklist,quick_application' })

  const toolCodes = meta.decisionToolLinks?.map((d: any) => d.code).join(',')
  checks.push({ label: `araç kodları: ${toolCodes}`, pass: toolCodes === 'DC-PROFIT-001,DC-DISCOUNT-002,DC-CAMPAIGN-010,DC-CONTINUE-012' })

  // Verify 5 corrections
  checks.push({
    label: 'Sabit gider tanımı: doğru metin',
    pass: ko!.content.includes('Belirlenen dönem ve mevcut kapasite aralığında satış hacmindeki değişimden doğrudan etkilenmeyen giderlerdir')
  })
  checks.push({
    label: 'Giriş: "işletmem faaliyet giderlerini karşılamaya başlar"',
    pass: ko!.content.includes('işletmem faaliyet giderlerini karşılamaya başlar')
  })
  checks.push({
    label: 'Eski "kârlılığa geçerim" yok',
    pass: !ko!.content.includes('kârlılığa geçerim')
  })
  checks.push({
    label: 'Güvenlik marjı: gerçekleşen/hedef ayrımı',
    pass: ko!.content.includes('mevcut güvenlik marjıdır') && ko!.content.includes('planlama varsayımıdır')
  })
  checks.push({
    label: 'Kaynak lisansı: 5 kaynak doğru',
    pass: ko!.content.includes('Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.')
  })

  const srcCount = await prisma.knowledgeObjectSource.count({ where: { koId: TARGET_KO_ID } })
  checks.push({ label: `Kaynak sayısı: ${srcCount}`, pass: srcCount === 5 })

  console.log('\n=== DOĞRULAMA ===')
  let allPass = true
  for (const c of checks) {
    const icon = c.pass ? '✓' : '✗'
    if (!c.pass) allPass = false
    console.log(`  ${icon} ${c.label}`)
  }

  if (!allPass) {
    throw new Error('Doğrulama başarısız!')
  }
  console.log('\n✓ Tüm doğrulamalar geçti.')
}

async function main() {
  console.log('update-break-even-gold-lesson.ts başlatılıyor...\n')
  console.log(`Hedef: Course ${TARGET_COURSE_ID} → Lesson ${TARGET_LESSON_ID} → KO ${TARGET_KO_ID} (${EXPECTED_KO_CODE})\n`)

  await verifyRelationship()
  console.log()
  await updateKnowledgeObject()
  console.log()
  await upsertSources()
  console.log()
  await verifyUpdate()

  console.log('\n✓ Script başarıyla tamamlandı.')
}

const GOLD_CONTENT = String.raw`# Başabaş Noktası: Sabit Giderleri Kapatmak İçin Kaç Satış Yapmalısın?

Hiç satış yapmadığın bir ayda dahi ödemek zorunda olduğun dükkan kirası veya sabit giderlerin var. Peki, işletmenin zarardan kurtulup kâra geçmeye başladığı o kritik eşiği nasıl hesaplarsın?

İnternetten veya fiziksel dükkandan satış yaparken vermen gereken en temel kararlardan biri şudur:

"Hangi satış seviyesinden sonra cebimden para harcamayı bırakır, işletmenin sabit giderlerini kapatır ve işletmem faaliyet giderlerini karşılamaya başlar?"

Başabaş Noktası (Break-Even Point), toplam satış gelirlerinin toplam maliyetlere (sabit ve değişken giderler) eşit olduğu, belirlenen kapsam ve dönemde faaliyet sonucunun sıfır gerçekleştiği satış düzeyidir.

## 1. Gider Türlerini Tanı: Sabit, Değişken ve Karma Giderler

Giderlerini doğru sınıflandırmadan başabaş noktanı hesaplayamazsın. Giderler üç ana gruba ayrılır:

**Sabit Giderler:** Belirlenen dönem ve mevcut kapasite aralığında satış hacmindeki değişimden doğrudan etkilenmeyen giderlerdir. (Örn: Dükkan kirası, sabit personel maaşı ve SGK primleri, muhasebeci ücreti, sabit yazılım abonelikleri).

**Değişken Giderler:** Satış veya üretim miktarın arttıkça buna paralel artan, satış yapmadığında sıfıra inen giderlerdir. (Örn: Hammadde maliyeti, ürün ambalajı, parça başı kargo ücreti, pazaryeri satış komisyonu, POS kesintisi).

**Karma Giderler:** Bazı giderler doğrudan sabit veya değişken olarak etiketlenemez. Elektrik ve su temel kullanımda sabit, üretim arttıkça değişkendir. Personel giderleri sabit maaş içerirken mesai ve primle değişkenleşebilir.

**KDV ve Vergisel Tutarlılık Uyarısı:** Tüm hesaplamalarda tutarlılık esastır. Satış fiyatını ve değişken maliyetlerini aynı yaklaşımla (tercihen KDV hariç net tutarlarla) girmelisin. Hesaplamalarının vergi mevzuatına ve işletmenin özel yapısına uygunluğunu mali müşavirinle doğrulamalısın.

> **CHECKLIST: Hesaba Başlamadan Önce Gider Kontrolü**
>
> - [ ] Sabit ve değişken giderleri aynı zaman dilimi (aylık) için mi topladın?
> - [ ] KDV yaklaşımın tüm kalemlerde tutarlı mı?
> - [ ] Komisyon, kargo, ambalaj, POS kesintisi ve iade payı gibi değişken giderleri ekledin mi?
> - [ ] Karma giderlerin değişken ve sabit paylarını doğru ayırdın mı?

## 2. Birim Katkı Payı: Her Satış Sana Ne Bırakıyor?

Bir ürün sattığında elinde kalan para doğrudan kârın değildir. Ürünün kendi değişken maliyetini çıkardıktan sonra kalan tutar, dükkanın sabit giderlerini ödemek üzere havuza aktarılır. Buna Birim Katkı Payı denir.

> **FORMULA: Birim Katkı Payı**
>
> $$\text{Birim Katkı Payı } (BKP) = \text{Birim Satış Fiyatı } (P_{net}) - \text{Birim Değişken Gider } (V_{net})$$

> **COMMON_MISTAKE: Katkı Payını "Net Kâr" Sanmak!**
>
> **Yanılgı:** "Ürünü 500 TL'ye satıyorum, birim değişken giderim 300 TL. Sattığım her üründen 200 TL kâr elde ediyorum."
>
> **Gerçek:** Sabit giderler tamamen kapanmadan kâr oluşmaz. Birim katkı payı (200 TL), önce biriken sabit gider borcunu kapatır. Başabaş noktası aşıldıktan sonraki her ek satış, diğer koşullar değişmiyorsa belirlenen kapsam ve dönemde faaliyet sonucuna birim katkı kadar olumlu etki eder.

**⚠️ Sıfır ve Negatif Katkı Uyarısı**

Birim Katkı Payı = 0 ise: Ürün satış fiyatı yalnızca kendi değişken giderine eşittir. Sabit giderlerin karşılanmasına hiç pay kalmaz.

Birim Katkı Payı < 0 ise: Satış fiyatı, birim değişken giderin altındadır. Satılan her ürün işletmeye doğrudan ek zarar yazar.

**Karar:** Bu durumlarda başabaş adedi hesaplanamaz; "Mevcut fiyat-maliyet yapısıyla başabaşa ulaşılamaz" kararı verilir.

## 3. Başabaş Noktası Hesabı

Sabit giderlerini birim katkı payına böldüğünde, işletmenin zarardan kurtulması için gereken asgari satış adedini bulursun.

> **FORMULA: Başabaş Satış Adedi ve Tutarı**
>
> $$\text{Başabaş Satış Adedi } (BSA) = \frac{\text{Toplam Sabit Giderler } (SG)}{\text{Birim Katkı Payı } (BKP)}$$
>
> $$\text{Başabaş Satış Tutarı } (BST) = \frac{\text{Toplam Sabit Giderler } (SG)}{\text{Katkı Marjı Oranı } (KMO)}$$
>
> (Burada Katkı Marjı Oranı: $KMO = \frac{BKP}{P_{net}}$)

**Yuvarlama Kuralı:** Başabaş satış adedi küsüratlı (ondalıklı) bir sayı çıkarsa, sabit giderlerin tam karşılanabilmesi için sonuç her zaman bir üst tam sayıya yuvarlanır (Örn: $59,2$ adet çıkarsa başabaş adedi $60$ kabul edilir).

**Çok Ürünlü İşletmelerde Satış Karması Sınırı**

Farklı kâr marjlarına sahip birden fazla ürün satıyorsan, tek ürün formülünü tüm işletmeye uygulayamazsın. Çok ürünlü yapılarda, ürünlerin toplam ciro içindeki satış paylarına göre Ağırlıklı Katkı Oranı (Satış Karması) hesaplanmalıdır.

🛠️ **Karar Aracı Yönlendirmesi:**

Tekil bir ürünün maliyet ve komisyon sonrası kârlılık katkısını doğrulamak için "Ürünüm Gerçekten Kârlı mı?" aracını çalıştırabilirsin.

## 4. Tek Ürünlü İşletme Örneği

*(Aşağıdaki tüm veriler ve hesaplamalar varsayımsal eğitim örneğidir).*

Bir girişimcinin atölyesinde tek tip el yapımı ahşap oyuncak ürettip sattığını varsayalım:

| Kalem | Tutar |
|---|---|
| Birim Satış Fiyatı ($P_{net}$) | 500 TL |
| **Birim Değişken Giderler ($V_{net}$)** | |
| Hammadde ve malzeme | 150 TL |
| Ambalaj/Kutu | 20 TL |
| Pazaryeri komisyonu (varsayımsal %15) | 75 TL |
| Kargo bedeli | 55 TL |
| **Toplam Değişken Gider** | **300 TL** |
| **Aylık Sabit Giderler ($SG$)** | |
| Atölye kirası | 8.000 TL |
| Muhasebe | 2.000 TL |
| İnternet/Yazılım | 2.000 TL |
| **Toplam Sabit Gider** | **12.000 TL** |

**Hesaplama:**

Birim Katkı Payı ($BKP$): $500 \text{ TL} - 300 \text{ TL} = 200 \text{ TL}$

Başabaş Satış Adedi ($BSA$): $\frac{12.000 \text{ TL}}{200 \text{ TL}} = 60 \text{ adet/ay}$

**Sonuç:** Girişimci ayda 60 adet oyuncak sattığında belirlenen kapsam ve dönemde faaliyet sonucu sıfır gerçekleşir. 61. oyuncaktan itibaren satılan her ürün, faaliyet sonucuna 200 TL olumlu katkı sağlar.

## 5. Kapasite, Talep ve Güvenlik Marjı

Formülün bulduğu satış adedi teorik olarak doğrudur; ancak gerçek dünyada iki sınıra çarpar:

**Kapasite Sınırı:** Aylık başabaş noktan 200 adet çıkabilir; ancak atölye kapasiten ayda en fazla 120 adete izin veriyorsa, bu iş modeli mevcut ölçekte imkânsızdır.

**Talep Sınırı:** Başabaş için 150 adet satman gerekiyordur ancak pazardaki aylık toplam talep 80 adettir.

**Güvenlik Marjı:** Gerçekleşen veya hedeflenen satış seviyesinin başabaş noktasından ne kadar yüksek olduğunu gösterir.

$$\text{Güvenlik Marjı (Tutar)} = \text{Hedeflenen/Gerçekleşen Satış} - \text{Başabaş Satışı}$$

$$\text{Güvenlik Marjı Oranı (\%)} = \frac{\text{Hedeflenen/Gerçekleşen Satış} - \text{Başabaş Satışı}}{\text{Hedeflenen/Gerçekleşen Satış}} \times 100$$

**Örnek:** Başabaş noktan 60 adet olsun.

- **Gerçekleşen satış** 100 adet olduğunda güvenlik marjı oranın %40'tır ($\frac{100 - 60}{100} \times 100$). Bu, mevcut satışlarının başabaş noktasına göre %40 tamponla çalıştığını ve satışlar %40 düşse dahi zarara geçmeyeceğini gösterir. Bu **mevcut güvenlik marjıdır.**
- **Hedeflenen satış** 100 adet olarak planlandığında %40 yalnızca bir planlama senaryosudur; gerçekleşene kadar güvenlik marjı teyit edilmiş sayılmaz. Satışlar hedeflenen seviyeye ulaşana kadar bu oran **planlama varsayımıdır.**

## 6. Senaryo Analizi: Koşullar Değişirse Ne Olur?

Fiyat veya maliyetler değiştiğinde başabaş eşiğinin nasıl kaydığını üç farklı senaryoda inceleyelim *(varsayımsal eğitim örneği)*:

> **QUICK_APPLICATION: Üç Senaryoyu Karşılaştırma**
>
> **Mevcut Durum:** $P = 500 \text{ TL}$, $V = 300 \text{ TL}$, $BKP = 200 \text{ TL}$, $SG = 12.000 \text{ TL}$ $\rightarrow$ **BSA = 60 adet**
>
> | Senaryo | Değişiklik | Yeni BKP | Yeni BSA | Değişim |
> |---|---|---|---|---|
> | 1: %10 Fiyat İndirimi | $P = 450$ TL | $150$ TL | **80 adet** | +20 adet |
> | 2: Hammadde ve Kargo Zammı | $V = 350$ TL | $150$ TL | **80 adet** | +20 adet |
> | 3: Kira Zammı | $SG = 16.000$ TL | $200$ TL | **80 adet** | +20 adet |

Her üç senaryoda da başabaş noktası 20 adet yükseldi. Bu, başabaş eşiğinin fiyat, maliyet ve sabit gider değişimlerine karşı ne kadar hassas olduğunu gösterir.

🛠️ **Karar Aracı Yönlendirmeleri:**

- İndirim yapmayı düşünüyorsan başabaş riskini görmek için "Bu indirimi yapabilir miyim?" aracına başvur.
- Reklam veya kampanya bütçesi eklerken "Kampanya yapmak mantıklı mı?" aracını çalıştır.
- Sürekli negatif katkı veren ürünlerde "Bu ürünü satmaya devam etmeli miyim?" aracını değerlendir.

## 7. Kendi İşletmen İçin Başabaş Çalışma Tablosu

Aşağıdaki tabloyu kendi işletmenin verileriyle doldur:

| Adım | Hesaplama Kalemi | Senin İşletme Verilerin |
|---|---|---|
| 1 | Analiz Edilen Ürün ve Dönem | Ürün: ............... / Dönem: Aylık |
| 2 | Satış Fiyatı ($P_{net}$) | ............... TL |
| 3 | **Birim Değişken Giderler ($V_{net}$)** | |
| | - Tedarik / Hammadde | ............... TL |
| | - Ambalaj ve Paketleme | ............... TL |
| | - Komisyon ve POS Kesintisi | ............... TL |
| | - Kargo Bedeli ve İade Payı | ............... TL |
| | **Toplam Birim Değişken Gider** | ............... TL |
| 4 | Birim Katkı Payı ($BKP$) | $(P_{net} - V_{net}) =$ ............... TL |
| 5 | **Aylık Toplam Sabit Giderler ($SG$)** | |
| | - Dükkan / Ofis Kirası | ............... TL |
| | - Sabit Personel / SGK / Maaş | ............... TL |
| | - Muhasebe / Yazılım / Fatura | ............... TL |
| | **Toplam Sabit Gider** | ............... TL |
| 6 | Başabaş Satış Adedi ($BSA$) | $(SG \div BKP) =$ ............... Adet (Yukarı Yuvarla) |
| 7 | Kapasite & Talep Kontrolü | Aylık Azami Kapasite: ............... Adet |

## 8. Ders Sonu Görevi ve Nihai Karar

Çalışma tablonu doldurduktan sonra aşağıdaki cümleyi kendi gerçek verilerinle tamamlayarak işletme kararını kesinleştir:

> "Bu ürün için aylık başabaş noktam yaklaşık [ ___ ] adettir. Mevcut kapasitem [ ___ ] adet, gerçekçi satış hedefim [ ___ ] adettir. Fiyat [ ___ ] TL olduğunda ve birim değişken gider [ ___ ] TL olduğunda kararım [ ___ ] olacaktır."

## Doğrulanmış Kaynaklar ve Lisans Bilgileri

**Anadolu Üniversitesi Açıköğretim Fakültesi Yayınları – Yönetim Muhasebesi Ders Kitabı (Ünite 4: Maliyet-Hacim-Kâr Analizleri)**
Yayınlayan Kurum: Anadolu Üniversitesi eKampüs Portalı.
Erişim Türü: Açık Erişim.
Lisans/Telif Durumu: Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.

**Atatürk Üniversitesi Açıköğretim Fakültesi Yayınları – Maliyet Muhasebesi Ders Kitabı (Ünite 6)**
Yayınlayan Kurum: Atatürk Üniversitesi ATA-AÖF.
Erişim Türü: Açık Erişim.
Lisans/Telif Durumu: Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.

**International Labour Organization (ILO) – Start and Improve Your Business (SIYB) Maliyetlendirme Modülü**
Yayınlayan Kurum: Uluslararası Çalışma Örgütü (ILO).
Erişim Türü: Açık Erişim.
Lisans/Telif Durumu: Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.

**T.C. KOSGEB – Girişimcilik Eğitimi Katılımcı El Kitabı (İş Planı ve Finansal Planlama)**
Yayınlayan Kurum: T.C. Küçük ve Orta Ölçekli İşletmeleri Geliştirme ve Destekleme İdaresi Başkanlığı.
Erişim Türü: Açık Erişim.
Lisans/Telif Durumu: Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.

**International Finance Corporation (IFC / World Bank Group) – SME Financial Management Toolkits**
Yayınlayan Kurum: Uluslararası Finans Kurumu (IFC / Dünya Bankası Grubu).
Erişim Türü: Açık Erişim.
Lisans/Telif Durumu: Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.`

main()
  .catch(e => {
    console.error('\n✗ HATA:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
