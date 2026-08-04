const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const DATA_DIR = path.resolve(__dirname, 'data');
const LESSON_MINUTES = 14;
const TASK_MINUTES = 15;
const STALE_TEMPLATE_TERMS = [
  'genel müdür',
  'duyarlılık matrisi',
  'gerçek işletme kaydını oluştur',
  'birim maliyet kartı hazırlayın',
  'fiyat ve kampanya senaryo tablosu hazırlayın'
];

// Metadata definitions — content loaded from .txt files at runtime
const TARGETS = [
  {
    koId: 95, courseId: 210, lessonId: 896, code: 'CUR-018-05', file: 'finance-wave-1-ko95.txt',
    title: 'Gider Tanımı: Kasadan Çıkan Her Para Gider Midir?',
    artifact: 'Gider Sınıflandırma Kartı',
    metric: 'Doğru sınıflandırılan gider kalemi sayısı',
    summary: 'Nakit çıkışı ile gideri ayırt et. Giderlerini iki bağımsız eksende (hacme göre sabit/değişken/karma ve ürünle ilişkisine göre doğrudan/dolaylı) sınıflandırarak bilinçli maliyet kararı ver.',
    outcomes: [
      'Nakit çıkışı (ödeme) ile gider arasındaki farkı ayırt etmek',
      'Giderleri satış hacmine göre (sabit/değişken/karma) ve ürünle ilişkisine göre (doğrudan/dolaylı) iki bağımsız eksende sınıflandırmak',
      'Kendi işletme giderlerini sınıflandırma kartına işleyerek maliyet hesaplamaya hazırlık yapmak'
    ],
    task: 'İşletmene ait 5 harcama kalemini belirle. Her birini hacme göre (sabit/değişken/karma) ve ürünle ilişkisine göre (doğrudan/dolaylı) iki bağımsız eksende değerlendir. Sınıflandırma kartını doldur ve sonuç beyanını yaz.',
    blocks: [
      { type: 'checklist', label: 'Gider Kaydı Kontrolü', items: [
        'Bu harcama ilgili dönemde gerçekten tüketildi mi yoksa gelecek döneme sarkan bir hakkı mı temsil ediyor?',
        'Satış hacmine göre değişken/sabit ayrımı doğru yapıldı mı?',
        'Ürünle doğrudan ilişkili kalemler dolaylı genel giderlerden ayrıldı mı?',
        'KDV yaklaşımının işletme yapına uygunluğu mali müşavirinle doğrulandı mı?'
      ], warningIfIncomplete: 'Giderlerini yanlış sınıflandırırsan başabaş ve birim maliyet hesapların gerçeği yansıtmaz.' },
      { type: 'common_mistake', label: 'Kasadan Çıkan Her Parayı Dönem Gideri Sanmak',
        mistake: 'Bu ay dükkana 50.000 TL hammadde satın aldım. Dolayısıyla bu ay 50.000 TL giderim var.',
        correction: 'Satın alıp depoya koyduğun hammadde nakit çıkışıdır. O hammadde işlenip satıldıkça tüketilen kısmı gider yazılır. Satılmayan tutar stokta kalır.',
        consequence: 'Bu hata yapılırsa dönem kârlılığı yanlış hesaplanır; stokta bekleyen hammadde gider yazılırsa gerçekte kârda olan işletme zararda görünür.' },
      { type: 'quick_application', label: 'Kendi İşletmenin Giderlerini Sınıflandır',
        instruction: 'İşletmene ait 5 harcama kalemini belirle ve iki bağımsız eksende değerlendir.',
        axes: [{ name: 'Hacme Göre', options: ['Sabit', 'Değişken', 'Karma'] }, { name: 'Ürünle İlişkisine Göre', options: ['Doğrudan', 'Dolaylı'] }] }
    ],
    tools: [],
    sources: [
      { title: 'Anadolu Üniversitesi AÖF – Genel Muhasebe Ders Kitabı (Ünite 1 ve 5)', url: 'https://ekampus.anadolu.edu.tr/', note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.' },
      { title: 'Atatürk Üniversitesi AÖF – Maliyet Muhasebesi Ders Kitabı (Ünite 2)', url: 'https://www.atauni.edu.tr/', note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.' }
    ]
  },
  {
    koId: 108, courseId: 211, lessonId: 899, code: 'CUR-021-03', file: 'finance-wave-1-ko108.txt',
    title: 'Gerçek Birim Maliyet: Üretim Maliyeti ile Sipariş Başına Toplam Ekonomik Yük Farkı',
    artifact: 'Ürüne Özel Ekonomik Yük Kartı',
    metric: 'Sipariş başına toplam ekonomik yük',
    summary: 'Ürünün ham alış veya malzeme fiyatının ötesine geç. Ambalaj, komisyon, kargo, genel gider payı ve fire riskini ekleyerek sipariş başına gerçek ekonomik yükü hesapla.',
    outcomes: [
      'Resmî stok maliyeti ile işletme kararı için tahmini sipariş başına ekonomik yük arasındaki farkı ayırt etmek',
      'Sipariş başına ekonomik yükü oluşturan altı temel bileşeni hesaplamak',
      'Ürüne Özel Ekonomik Yük Kartı hazırlayarak bilinçli fiyat ve kârlılık kararı vermek'
    ],
    task: 'Kendi sattığın bir ürün için Ürüne Özel Ekonomik Yük Kartını doldur. Altı bileşeni kendi verilerinle hesapla ve sonuç değerlendirmeni yaz.',
    blocks: [
      { type: 'formula', label: 'Sipariş Başına Toplam Ekonomik Yük', formulas: ['EY = DM + Dİ + AMB + DG_birim + SG_payı + RİK_payı'],
        inputs: [
          { key: 'DM', label: 'Doğrudan Malzeme / Alış Fiyatı', unit: 'TL' },
          { key: 'DI', label: 'Doğrudan İşçilik Payı', unit: 'TL' },
          { key: 'AMB', label: 'Ambalaj ve Paketleme', unit: 'TL' },
          { key: 'DG', label: 'Komisyon, POS ve Kargo Kesintileri', unit: 'TL' },
          { key: 'SG', label: 'Genel Gider Payı', unit: 'TL' },
          { key: 'RIK', label: 'Fire, Hasar ve İade Risk Payı', unit: 'TL' }
        ], outputs: [{ key: 'EY', label: 'Sipariş Başına Toplam Ekonomik Yük', unit: 'TL' }] },
      { type: 'checklist', label: 'Unutulan Maliyet Kalemleri', items: [
        'Ambalaj ve paketleme gideri eklendi mi?',
        'Pazaryeri komisyonu, POS ve kargo kesintileri kendi panelinden doğrulandı mı?',
        'İşletme yapına uygun ve tutarlı bir genel gider dağıtım anahtarı seçildi mi?',
        'Fire ve iadesi geri alınamayan harcamaların risk payı eklendi mi?'
      ], warningIfIncomplete: 'Maliyet kalemlerini eksik hesaplarsan sipariş başına ekonomik yükün gerçekte olduğundan düşük çıkar; fiyat kararın hatalı olur.' },
      { type: 'common_mistake', label: 'Yalnızca Alış veya Malzeme Fiyatını Maliyet Sanmak',
        mistake: 'Ürünü 100 TL malzeme ile ürettim. 200 TL\'ye satarsam 100 TL net kâr ederim.',
        correction: '100 TL malzemenin üzerine 15 TL ambalaj, 30 TL komisyon, 25 TL kargo ve 20 TL genel gider payı eklendiğinde sipariş başına ekonomik yük 190 TL\'ye ulaşır.',
        consequence: 'Bu hata yapılırsa kârlı sanılan ürün aslında zarar ettiriyor olabilir; fiyat tüm ekonomik yükü karşılamaz.' }
    ],
    tools: [{ code: 'DC-PROFIT-001', label: 'Ürünüm Gerçekten Kârlı mı?' }],
    sources: [
      { title: 'Anadolu Üniversitesi AÖF – Maliyet Muhasebesi Ders Kitabı (Ünite 1 ve 4)', url: 'https://ekampus.anadolu.edu.tr/', note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.' },
      { title: 'Atatürk Üniversitesi AÖF – Maliyet Muhasebesi Ders Kitabı (Ünite 3)', url: 'https://www.atauni.edu.tr/', note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.' }
    ]
  },
  {
    koId: 122, courseId: 211, lessonId: 902, code: 'CUR-024-02', file: 'finance-wave-1-ko122.txt',
    title: 'Ambalaj Maliyeti: En Ucuz Ambalaj Gerçekten En Düşük Toplam Maliyet Midir?',
    artifact: 'Ambalaj Seçim ve Maliyet Kartı',
    metric: 'Ambalaj seçeneği başına toplam maliyet',
    summary: 'Ambalaj seçimini yalnızca malzeme fiyatına göre yapma. Paketleme süresi, koruma performansı ve hasar kaynaklı iade maliyetini birlikte hesaplayarak gerçek toplam maliyeti gör.',
    outcomes: [
      'Ambalaj seçiminin toplam maliyetini malzeme, işçilik, hasar riski ve kargo desisi boyutlarıyla değerlendirmek',
      'En az iki ambalaj seçeneğini toplam maliyet ve koruma performansı eksenlerinde karşılaştırmak',
      'Ambalaj Seçim ve Maliyet Kartı hazırlayarak veriye dayalı ambalaj kararı vermek'
    ],
    task: 'Sattığın bir ürün için en az iki ambalaj seçeneğini karşılaştır. Malzeme maliyeti, paketleme süresi ve gözlenen hasar oranlarını kullanarak toplam maliyeti hesapla. Ambalaj karar beyanını yaz.',
    blocks: [
      { type: 'comparison', label: 'Ambalaj Seçenekleri Karşılaştırma', axes: [
        { name: 'Malzeme Maliyeti', key: 'materialCost', unit: 'TL' },
        { name: 'Paketleme Süresi', key: 'packTime', unit: 'dk' },
        { name: 'Koruma Performansı', key: 'protection', options: ['Düşük', 'İyi', 'Yüksek'] },
        { name: 'Gözlenen Kayıp', key: 'observedLoss', unit: 'TL' }
      ]},
      { type: 'checklist', label: 'Ambalaj Karar Kontrolü', items: [
        'Dış kutu, bant, etiket ve dolgu malzemesi maliyeti dâhil edildi mi?',
        'Paket hazırlama süresinin işçilik etkisi hesaba katıldı mı?',
        'Ambalaj ebatlarının kargo desisini artırıp artırmadığı kontrol edildi mi?',
        'Seçilen ambalajın koruma performansı kendi gönderi ve hasar kayıtlarınla doğrulandı mı?'
      ], warningIfIncomplete: 'Yalnızca malzeme fiyatına bakarak seçim yaparsan, hasar ve iade maliyetleri toplamı malzeme tasarrufunu aşabilir.' },
      { type: 'common_mistake', label: 'Yalnızca Kutu Fiyatına Bakarak Ambalaj Seçmek',
        mistake: 'Kutuya fazla para vereceğime ucuz poşet kullanırım, paket başına kesin tasarruf ederim.',
        correction: 'Malzeme ucuz olsa da paketleme süresi uzuyorsa veya kırılma nedeniyle iade artıyorsa toplam maliyet yükselebilir. Doğru karar kutu fiyatıyla değil, kendi kayıtlarındaki toplam maliyetle verilir.',
        consequence: 'Ucuz ambalaj kısa vadede tasarruf gibi görünür ancak artan hasar ve iade maliyetleri toplamı aştığında işletmeye net zarar yazar.' }
    ],
    tools: [{ code: 'DC-FREESHIP-003', label: 'Kargo Ücretsiz Olabilir mi?' }],
    sources: [
      { title: 'ILO – Start and Improve Your Business (SIYB) Costing Module', url: 'https://www.ilo.org/publications/start-and-improve-your-business-siyb', note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.' },
      { title: 'IFC (World Bank Group) – SME Management Toolkits', url: 'https://www.ifc.org/', note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.' }
    ]
  },
  {
    koId: 153, courseId: 212, lessonId: 908, code: 'CUR-030-03', file: 'finance-wave-1-ko153.txt',
    title: 'İade Maliyeti: Bir İadenin Sana Gerçek Maliyeti Yalnızca Dönüş Kargosu Mudur?',
    artifact: 'İade Maliyet Analiz Kartı',
    metric: 'Sipariş başına beklenen iade risk payı',
    summary: 'İadenin toplam maliyetini yalnızca dönüş kargosuyla sınırlama. Boşa çıkan gidiş kargosu, yeniden paketleme, kontrol işçiliği ve ürün değer kaybını ekleyerek sipariş başına beklenen iade risk payını hesapla.',
    outcomes: [
      'İade maliyetini oluşturan altı bileşeni ayırt etmek',
      'Geçmiş iade oranına dayanarak sipariş başına beklenen iade risk payını hesaplamak',
      'İade Maliyet Analiz Kartı hazırlayarak yüksek iadeli ürünler için bilinçli devam/durdur kararı vermek'
    ],
    task: 'En çok iade alan ürünün için İade Maliyet Analiz Kartını doldur. Kendi panelindeki geçmiş iade oranını kullanarak sipariş başına beklenen iade risk payını hesapla.',
    blocks: [
      { type: 'formula', label: 'İade Başına Maliyet ve Beklenen İade Risk Payı',
        formulas: ['İMZ = GK + DK + YAMB + İŞÇ + DKAY + KES', 'İRP = İMZ × Geçmiş İade Oranı'],
        inputs: [
          { key: 'GK', label: 'Gidiş Kargo Bedeli (Üzerinde kalan)', unit: 'TL' },
          { key: 'DK', label: 'Dönüş Kargo Bedeli (Üzerinde kalan)', unit: 'TL' },
          { key: 'YAMB', label: 'Yeniden Paketleme ve Ambalaj', unit: 'TL' },
          { key: 'ISC', label: 'İnceleme ve Kontrol İşçiliği', unit: 'TL' },
          { key: 'DKAY', label: 'Ürün Değer Kaybı veya Hurda Zararı', unit: 'TL' },
          { key: 'KES', label: 'Geri Alınamayan Platform Kesintisi', unit: 'TL' },
          { key: 'IORAN', label: 'Geçmiş İade Oranı', unit: '%' }
        ], outputs: [
          { key: 'IMZ', label: 'İade Başına Satıcı Zararı', unit: 'TL' },
          { key: 'IRP', label: 'Sipariş Başına Beklenen İade Risk Payı', unit: 'TL' }
        ] },
      { type: 'checklist', label: 'Unutulan İade Maliyetleri', items: [
        'Anlaşmana göre üzerinde kalan gidiş ve dönüş kargo tutarları teyit edildi mi?',
        'Tahrip olan ambalaj ve kontrol süresi maliyete eklendi mi?',
        'Ürünün yeniden satışındaki olası değer kaybı hesaplandı mı?',
        'İşletmene uygulanmayan kalemler sıfır (0) olarak bırakıldı mı?'
      ], warningIfIncomplete: 'Eksik hesaplanan iade maliyeti, düşük marjlı ürünlerde tüm kârı silebilir.' },
      { type: 'common_mistake', label: 'İade Maliyetini Yalnızca Dönüş Kargosu Sanmak',
        mistake: 'İade maliyeti sadece dönüş kargosudur, 30 TL.',
        correction: 'İade maliyeti; boşa çıkan gidiş kargosu, dönüş kargosu, yeni ambalaj, kontrol işçiliği, ürün değer kaybı ve geri alınamayan platform kesintilerinin toplamıdır.',
        consequence: 'Bu hata yapılırsa iade yoğun ürünlerde gerçek maliyet görünmez; ürün kârlı sanılır ancak iadeler tüm katkıyı siler.' }
    ],
    tools: [{ code: 'DC-CONTINUE-012', label: 'Bu Ürünü Satmaya Devam Etmeli miyim?' }],
    sources: [
      { title: 'IFC (World Bank Group) – SME Financial Management Toolkits', url: 'https://www.ifc.org/', note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.' },
      { title: 'Anadolu Üniversitesi AÖF – Yönetim Muhasebesi Ders Kitabı', url: 'https://ekampus.anadolu.edu.tr/', note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.' }
    ]
  },
  {
    koId: 163, courseId: 213, lessonId: 910, code: 'CUR-032-03', file: 'finance-wave-1-ko163.txt',
    title: 'Fiyat Belirleme: Rakibin Fiyatını Kopyalamadan Gerekçeli Fiyat Nasıl Belirlenir?',
    artifact: 'Fiyat Karar Kartı',
    metric: 'Hedef satış marjı ve gerekçeli satış fiyatı',
    summary: 'Maliyet tabanlı hesaplama ile pazar kanıtlarını birleştir. Markup ve hedef satış marjı yöntemlerini karşılaştır, gerekçeli fiyat kararı ver.',
    outcomes: [
      'Maliyet üzerine ekleme (markup) ile hedef satış marjına göre fiyatlama (margin) arasındaki farkı ayırt etmek',
      'Hedef satış marjına göre fiyat hesaplamak',
      'Pazar kanıtları ve karşılaştırılabilir ürünlerle fiyatı doğrulayıp gerekçeli fiyat kararı vermek'
    ],
    task: 'Bir ürünün için Fiyat Karar Kartını doldur. Sipariş başına ekonomik yükünü, hedef marjını ve en az 3 karşılaştırılabilir ürünün fiyat/değer farkını girerek nihai fiyat kararını ver.',
    blocks: [
      { type: 'formula', label: 'Hedef Satış Marjına Göre Fiyatlama', formulas: ['P_net = Ekonomik Yük / (1 − Hedef Satış Marjı Oranı)'],
        inputs: [
          { key: 'EY', label: 'Sipariş Başına Ekonomik Yük', unit: 'TL' },
          { key: 'MARJ', label: 'Hedef Satış Marjı Oranı (örn: 0,30)', unit: '' }
        ], outputs: [{ key: 'P', label: 'Hesaplanan Satış Fiyatı', unit: 'TL' }] },
      { type: 'comparison', label: 'Fiyat Yaklaşımları Karşılaştırma', axes: [
        { name: 'Maliyet Üzerine Ekleme (Markup)', key: 'markup' },
        { name: 'Hedef Satış Marjına Göre (Margin)', key: 'margin' },
        { name: 'Pazar Kanıtları ile Doğrulama', key: 'market' }
      ]},
      { type: 'checklist', label: 'Fiyat Kararı Öncesi Kontrol', items: [
        'Sipariş başına ekonomik yük doğru hesaplandı mı?',
        'Markup (ekleme) ile Hedef Satış Marjı (margin) kavramları doğru kullanıldı mı?',
        'Karşılaştırılabilir ürünlerin değer farkları incelendi mi?',
        'Hesaplanan fiyatın pazardaki talep ve kapasitenle uyumu test edildi mi?'
      ], warningIfIncomplete: 'Ekonomik yükünü hesaplamadan verilen fiyat zarara yol açabilir.' },
      { type: 'common_mistake', label: 'Rakip Fiyatını Doğrudan Kopyalamak',
        mistake: 'Rakibim bu ürünü 200 TL\'ye satıyor, ben de 195 TL yaparsam satarım.',
        correction: 'Rakibin ölçek ekonomisinden faydalanıyor olabilir. Kendi sipariş başına ekonomik yükünü hesaplamadan verilen fiyat zarara yol açabilir.',
        consequence: 'Rakip fiyatını kopyalamak, maliyet yapını bilmeden fiyat rekabetine girmektir; sonuç genellikle zarar olur.' }
    ],
    tools: [{ code: 'DC-DISCOUNT-002', label: 'Bu İndirimi Yapabilir miyim?' }],
    sources: [
      { title: 'KOSGEB – Girişimcilik Eğitimi Katılımcı El Kitabı (İş Planı ve Finansal Planlama)', url: 'https://www.kosgeb.gov.tr/', note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.' },
      { title: 'Anadolu Üniversitesi AÖF – Pazarlama Yönetimi Ders Kitabı', url: 'https://ekampus.anadolu.edu.tr/', note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.' }
    ]
  }
];

async function verifyRelation(t) {
  const lesson = await prisma.lesson.findUnique({ where: { id: t.lessonId }, include: { course: true, knowledgeObject: true } });
  if (!lesson) throw new Error('Lesson ' + t.lessonId + ' not found');
  if (lesson.courseId !== t.courseId) throw new Error('Lesson ' + t.lessonId + ' linked to course ' + lesson.courseId + ', expected ' + t.courseId);
  if (lesson.knowledgeObjectId !== t.koId) throw new Error('Lesson ' + t.lessonId + ' linked to KO ' + lesson.knowledgeObjectId + ', expected ' + t.koId);
  if (lesson.knowledgeObject.code !== t.code) throw new Error('KO ' + t.koId + ' code ' + lesson.knowledgeObject.code + ', expected ' + t.code);
  return lesson;
}

async function updateKO(t, content) {
  const ko = await prisma.knowledgeObject.findUnique({ where: { id: t.koId } });
  const meta = JSON.parse(ko.metadata || '{}');
  const updatedMeta = {
    ...meta,
    summary: t.summary,
    task: t.task,
    estimatedTime: LESSON_MINUTES + ' dakika',
    estimatedMinutes: LESSON_MINUTES,
    learningOutcomes: t.outcomes,
    coursePurpose: t.summary,
    courseOutcomes: t.outcomes,
    targetRole: 'KOBİ sahibi veya işletme yöneticisi',
    solvedProblem: t.summary,
    learningArtifact: t.artifact,
    metric: t.metric,
    nextAction: t.task,
    embeddedPracticeBlocks: t.blocks,
    decisionToolLinks: t.tools
  };
  await prisma.knowledgeObject.update({ where: { id: t.koId }, data: { title: t.title, content, summary: t.summary, task: t.task, metadata: JSON.stringify(updatedMeta) } });
}

async function updateLessonAndTask(t) {
  await prisma.lesson.update({
    where: { id: t.lessonId },
    data: { estimatedMinutes: LESSON_MINUTES }
  });

  const templates = await prisma.taskTemplate.findMany({ where: { koId: t.koId } });
  if (templates.length !== 1) {
    throw new Error('KO ' + t.koId + ' has ' + templates.length + ' task templates; expected exactly 1');
  }

  const checklist = t.blocks.find(block => block.type === 'checklist')?.items || [];
  await prisma.taskTemplate.update({
    where: { id: templates[0].id },
    data: {
      title: t.title.split(':')[0] + ' Uygulaması',
      description: t.task,
      estimatedTime: TASK_MINUTES,
      instructions: JSON.stringify([
        t.task,
        'Kullandığın tutarların ve oranların hangi işletme kaydından geldiğini belirt.',
        'Hesabını kontrol et ve ulaştığın kararı tek bir sonuç cümlesiyle yaz.'
      ]),
      checklist: JSON.stringify(checklist),
      rubric: JSON.stringify([
        { level: 'Tam', description: 'İstenen kart gerçek verilerle doldurulmuş, hesap kontrol edilmiş ve karar gerekçelendirilmiş.' },
        { level: 'Geliştirilmeli', description: 'Eksik veri, hesap veya karar gerekçesi bulunuyor.' }
      ]),
      exampleOutput: JSON.stringify({ minWords: 20 })
    }
  });
}

async function upsertSources(t) {
  // Clean old sources not in gold list
  const goldTitles = new Set(t.sources.map(s => s.title));
  const oldToRemove = await prisma.knowledgeObjectSource.findMany({ where: { koId: t.koId, source: { title: { notIn: Array.from(goldTitles) } } } });
  if (oldToRemove.length > 0) {
    await prisma.knowledgeObjectSource.deleteMany({ where: { id: { in: oldToRemove.map(r => r.id) } } });
    console.log('  Removed ' + oldToRemove.length + ' old source(s)');
  }
  const existing = await prisma.knowledgeObjectSource.findMany({ where: { koId: t.koId }, include: { source: true } });
  const existingTitles = new Set(existing.map(s => s.source.title));
  let created = 0, skipped = 0;
  for (const s of t.sources) {
    if (existingTitles.has(s.title)) {
      const ex = existing.find(e => e.source.title === s.title);
      if (ex.note !== s.note) {
        await prisma.knowledgeObjectSource.update({ where: { id: ex.id }, data: { note: s.note } });
        console.log('  Updated source note: ' + s.title.substring(0, 60));
      } else { skipped++; }
      continue;
    }
    let src = await prisma.source.findFirst({ where: { title: s.title } });
    if (!src) { src = await prisma.source.create({ data: { title: s.title, url: s.url, authorityLevel: 'medium', lastChecked: new Date() } }); }
    await prisma.knowledgeObjectSource.create({ data: { koId: t.koId, sourceId: src.id, relation: 'references', note: s.note } });
    created++;
  }
  if (skipped > 0) console.log('  ' + skipped + ' sources already present, skipped');
  const total = await prisma.knowledgeObjectSource.count({ where: { koId: t.koId } });
  return total;
}

async function verifyUpdate(t, content) {
  const ko = await prisma.knowledgeObject.findUnique({
    where: { id: t.koId },
    include: { taskTemplates: true }
  });
  const lesson = await prisma.lesson.findUnique({ where: { id: t.lessonId } });
  const meta = JSON.parse(ko.metadata || '{}');
  const ok = (label, pass) => { console.log('  ' + (pass ? '✓' : '✗') + ' ' + label); return pass; };
  let all = true;
  all = ok('title matches', ko.title === t.title) && all;
  all = ok('summary matches in KO and metadata', ko.summary === t.summary && meta.summary === t.summary) && all;
  all = ok('task matches in KO and metadata', ko.task === t.task && meta.task === t.task) && all;
  all = ok('editorial metadata matches lesson', meta.coursePurpose === t.summary && JSON.stringify(meta.courseOutcomes) === JSON.stringify(t.outcomes) && meta.learningArtifact === t.artifact && meta.metric === t.metric) && all;
  all = ok('lesson duration=' + LESSON_MINUTES + ' dk', lesson?.estimatedMinutes === LESSON_MINUTES && meta.estimatedTime === LESSON_MINUTES + ' dakika') && all;
  all = ok('task duration=' + TASK_MINUTES + ' dk', ko.taskTemplates.length === 1 && ko.taskTemplates[0].estimatedTime === TASK_MINUTES) && all;
  all = ok('task description matches', ko.taskTemplates.length === 1 && ko.taskTemplates[0].description === t.task) && all;
  all = ok('content length=' + content.length, ko.content.length === content.length) && all;
  all = ok('content has no raw LaTeX delimiters', !/\$\$|\\frac|\\text\{|\\mathbf\{|\\times/.test(content)) && all;
  all = ok('checklists have visible box glyphs', !/- \[ \]/.test(content) && (!content.includes('CHECKLIST:') || content.includes('☐'))) && all;
  all = ok('blocks count=' + t.blocks.length, meta.embeddedPracticeBlocks?.length === t.blocks.length) && all;
  all = ok('tools count=' + t.tools.length, meta.decisionToolLinks?.length === t.tools.length) && all;
  const blockTypes = meta.embeddedPracticeBlocks?.map(b => b.type).join(',');
  all = ok('block types: ' + blockTypes, blockTypes === t.blocks.map(b => b.type).join(',')) && all;
  const toolCodes = meta.decisionToolLinks?.map(d => d.code).join(',');
  all = ok('tool codes: ' + toolCodes, toolCodes === t.tools.map(d => d.code).join(',')) && all;
  const srcCount = await prisma.knowledgeObjectSource.count({ where: { koId: t.koId } });
  all = ok('sources count=' + srcCount, srcCount === t.sources.length) && all;
  const staleText = [JSON.stringify(meta), ...ko.taskTemplates.map(template => template.title + ' ' + template.description)].join(' ').toLocaleLowerCase('tr-TR');
  all = ok('no stale template terms', !STALE_TEMPLATE_TERMS.some(term => staleText.includes(term))) && all;
  const expectedToolRoute = t.tools[0] ? '/app/decision-checks/' + t.tools[0].code : null;
  all = ok('decision tool link ' + (expectedToolRoute || 'not present'), expectedToolRoute ? content.includes(expectedToolRoute) : !content.includes('/app/decision-checks/')) && all;
  return all;
}

async function main() {
  console.log('Finance Wave 1 — updating 5 gold lessons\n');
  let totalOK = 0, totalFail = 0;
  for (const t of TARGETS) {
    console.log('KO ' + t.koId + ' [' + t.code + '] ' + t.title);
    await verifyRelation(t);
    console.log('  ✓ Relationship verified: Course ' + t.courseId + ' → Lesson ' + t.lessonId + ' → KO ' + t.koId);
    const content = fs.readFileSync(path.join(DATA_DIR, t.file), 'utf8');
    await updateKO(t, content);
    await updateLessonAndTask(t);
    console.log('  ✓ KO updated');
    const srcCount = await upsertSources(t);
    console.log('  ✓ Sources: ' + srcCount);
    const ok = await verifyUpdate(t, content);
    if (ok) { totalOK++; console.log('  ✓ All checks passed\n'); }
    else { totalFail++; console.log('  ✗ Some checks failed\n'); }
  }
  console.log('=== DONE: ' + totalOK + ' OK, ' + totalFail + ' failed ===');
  if (totalFail > 0) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
