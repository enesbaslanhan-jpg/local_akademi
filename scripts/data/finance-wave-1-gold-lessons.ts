// Gold lesson content for Finance Wave 1 — 5 KOs
// Source of truth for scripts/update-finance-wave-1-gold-lessons.ts

export interface GoldLesson {
  koId: number;
  courseId: number;
  lessonId: number;
  code: string;
  title: string;
  summary: string;
  content: string;
  task: string;
  learningOutcomes: string[];
  embeddedPracticeBlocks: any[];
  decisionToolLinks: { code: string; label: string }[];
  sources: { title: string; url: string; note: string }[];
}

export const GOLD_LESSONS: GoldLesson[] = [
  // KO 95 — Gider Tanımı
  {
    koId: 95, courseId: 210, lessonId: 896, code: 'CUR-018-05',
    title: 'Gider Tanımı: Kasadan Çıkan Her Para Gider Midir?',
    summary: 'Nakit çıkışı ile gideri ayırt et. Giderlerini iki bağımsız eksende (hacme göre sabit/değişken/karma ve ürünle ilişkisine göre doğrudan/dolaylı) sınıflandırarak bilinçli maliyet kararı ver.',
    learningOutcomes: [
      'Nakit çıkışı (ödeme) ile gider arasındaki farkı ayırt etmek',
      'Giderleri satış hacmine göre (sabit/değişken/karma) ve ürünle ilişkisine göre (doğrudan/dolaylı) iki bağımsız eksende sınıflandırmak',
      'Kendi işletme giderlerini sınıflandırma kartına işleyerek maliyet hesaplamaya hazırlık yapmak'
    ],
    task: 'İşletmene ait 5 harcama kalemini belirle. Her birini hacme göre (sabit/değişken/karma) ve ürünle ilişkisine göre (doğrudan/dolaylı) iki bağımsız eksende değerlendir. Sınıflandırma kartını doldur ve sonuç beyanını yaz.',
    content: "# Gider Tanımı: Kasadan Çıkan Her Para Gider Midir?\n\nİşletmende gün boyu nakit çıkışları gerçekleşir: Dükkan kirası ödersin, tedarikçiye hammadde parası havale edersin veya borç kapatırsın. Ancak Ödeme (Nakit Çıkışı) ile Gider aynı şey değildir.\n\n**Ödeme (Nakit Çıkışı):** Paranın fiziksel veya dijital olarak işletmeden ayrıldığı andır.\n\n**Gider:** İşletmenin faaliyetlerini sürdürmek ve gelir elde etmek amacıyla belirli bir dönemde tüketilen, kullanılan veya döneme ait maktu hakkı tükenen değerlerdir.\n\nÖrneğin, önümüzdeki 12 aylık dükkan kirasını peşin ödediğinde kasandan nakit çıkar. Ancak bu tutarın tamamı bu ayın gideri değildir; harcanmamış hak olarak varlık niteliğindedir. Zaman geçtikçe yalnızca ilgili aya düşen kısım gidere dönüşür. Benzer şekilde, satın alıp depoya koyduğun hammadde nakit çıkışıdır; ürün üretilip satıldıkça tüketilen kısım gidere dönüşür.\n\n## Giderlerini İki Bağımsız Eksen Üzerinden Tespitle\n\nGiderler birbiriyle karıştırılmaması gereken iki ayrı bağımsız eksende sınıflandırılır:\n\n**Eksen 1: Satış Hacmine Bağlılığına Göre**\n\n| Sınıf | Tanım | Örnek |\n|---|---|---|\n| Sabit Gider | Belirli bir dönemde satış hacmindeki değişimlerden etkilenmeyen maktu harcamalar | Kira, maktu personel maaşı, muhasebeci ücreti |\n| Değişken Gider | Üretim veya satış adedi değiştikçe bu hacme bağlı olarak artan veya azalan harcamalar | Ürün hammaddesi, ambalaj malzemesi |\n| Karma Gider | Yapısında hem sabit hem değişken öğe barındırır | Elektrik faturası (aydınlatma sabit + makineler değişken) |\n\n*(Satış yavaşladığında veya durduğunda değişken giderler azalır ancak taahhütler veya stok yapısı nedeniyle her zaman anında sıfırlanmayabilir).*\n\n**Eksen 2: Ürün veya Hizmetle Doğrudan İlişkisine Göre**\n\n| Sınıf | Tanım | Örnek |\n|---|---|---|\n| Doğrudan (Direkt) Gider | Hangi üründen ne kadar harcandığı net şekilde takibe uygun gider | Ahşap sehpadaki ahşap maliyeti |\n| Dolaylı (İndirekt) Gider | Birden fazla ürün için ortak kullanılan ve tek ürüne düşen payı izleme anahtarıyla dağıtılan gider | Atölye kirası, ortak yazılım |\n\n**📌 Sınıflandırma Esnekliği:** Aynı gider kalemi işletme modeline göre farklı eksenlerde yer alabilir. Bir kargo ücreti e-ticaret satıcısında doğrudan ve değişken bir giderken; demirbaş nakliyesinde varlık maliyeti, genel merkez yazışmalarında ise maktu/dolaylı bir harcama niteliği taşıyabilir.\n\n> **CHECKLIST: Gider Kaydı Kontrolü**\n>\n> - [ ] Bu harcama ilgili dönemde gerçekten tüketildi mi yoksa gelecek döneme sarkan bir hakkı mı temsil ediyor?\n> - [ ] Satış hacmine göre değişken/sabit ayrımı doğru yapıldı mı?\n> - [ ] Ürünle doğrudan ilişkili kalemler dolaylı genel giderlerden ayrıldı mı?\n> - [ ] KDV yaklaşımının işletme yapına uygunluğu mali müşavirinle doğrulandı mı? (İndirilemeyen KDV veya özel durumlar maliyeti etkileyebilir).\n\n> **COMMON_MISTAKE: Kasadan Çıkan Her Parayı Dönem Gideri Sanmak!**\n>\n> **Yanılgı:** \"Bu ay dükkana 50.000 TL hammadde satın aldım. Dolayısıyla bu ay 50.000 TL giderim var.\"\n>\n> **Gerçek:** Satın alıp depoya koyduğun hammadde nakit çıkışıdır. O hammadde işlenip satıldıkça tüketilen kısmı gider yazılır. Satılmayan tutar stokta kalır.\n\n## Uygulama: Gider Sınıflandırma Senaryosu\n\n*(Varsayımsal eğitim örneğidir).*\n\nTekstil atölyesi işleten Selin'in harcamalarının iki ayrı eksende sınıflandırılması:\n\n| Harcama | Hacme Göre | Ürünle İlişkisine Göre |\n|---|---|---|\n| Atölye Kirası | Sabit (hacimden bağımsız) | Dolaylı (ürüne doğrudan atanamaz) |\n| Kumaş ve İplik | Değişken (ürettikçe değişir) | Doğrudan (ürüne yazılır) |\n| Atölye Elektriği | Karma (taban sabit + makineler değişken) | Dolaylı |\n\n> **QUICK_APPLICATION: Kendi İşletmenin Giderlerini Sınıflandır**\n>\n> İşletmene ait 5 harcama kalemini belirle ve iki bağımsız eksende değerlendir.\n\n## Somut Çıktı: Gider Sınıflandırma Kartı\n\n| Gider Kalemi | Hacme Göre Sınıf | Ürünle İlişkisine Göre Sınıf | Sınıflandırma Gerekçesi |\n|---|---|---|---|\n| 1. ................. | [ ]Sabit [ ]Değişken [ ]Karma | [ ]Doğrudan [ ]Dolaylı | ................. |\n| 2. ................. | [ ]Sabit [ ]Değişken [ ]Karma | [ ]Doğrudan [ ]Dolaylı | ................. |\n| 3. ................. | [ ]Sabit [ ]Değişken [ ]Karma | [ ]Doğrudan [ ]Dolaylı | ................. |\n| 4. ................. | [ ]Sabit [ ]Değişken [ ]Karma | [ ]Doğrudan [ ]Dolaylı | ................. |\n| 5. ................. | [ ]Sabit [ ]Değişken [ ]Karma | [ ]Doğrudan [ ]Dolaylı | ................. |\n\n**Sonuç Beyanı:**\n\n> \"İşletmemde doğrudan ürünle ilişkili giderler .............., ortak giderler .............., satış hacmiyle değişen giderler ise .............. 'dir.\"\n\n## Kaynakça ve Lisans Bilgisi\n\n**Anadolu Üniversitesi Açıköğretim Fakültesi – Genel Muhasebe Ders Kitabı (Ünite 1 ve 5)**\nYayınlayan Kurum: Anadolu Üniversitesi eKampüs Portalı.\nErişim Türü: Açık Erişim.\nLisans/Telif Durumu: Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.\n\n**Atatürk Üniversitesi Açıköğretim Fakültesi – Maliyet Muhasebesi Ders Kitabı (Ünite 2)**\nYayınlayan Kurum: Atatürk Üniversitesi AÖF Portalı.\nErişim Türü: Açık Erişim.\nLisans/Telif Durumu: Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.",
    embeddedPracticeBlocks: [
      { type: 'checklist', label: 'Gider Kaydı Kontrolü', items: [
        'Bu harcama ilgili dönemde gerçekten tüketildi mi yoksa gelecek döneme sarkan bir hakkı mı temsil ediyor?',
        'Satış hacmine göre değişken/sabit ayrımı doğru yapıldı mı?',
        'Ürünle doğrudan ilişkili kalemler dolaylı genel giderlerden ayrıldı mı?',
        'KDV yaklaşımının işletme yapına uygunluğu mali müşavirinle doğrulandı mı?'
      ], warningIfIncomplete: 'Giderlerini yanlış sınıflandırırsan başabaş ve birim maliyet hesapların gerçeği yansıtmaz.' },
      { type: 'common_mistake', label: 'Kasadan Çıkan Her Parayı Dönem Gideri Sanmak',
        mistake: '"Bu ay dükkana 50.000 TL hammadde satın aldım. Dolayısıyla bu ay 50.000 TL giderim var."',
        correction: 'Satın alıp depoya koyduğun hammadde nakit çıkışıdır. O hammadde işlenip satıldıkça tüketilen kısmı gider yazılır. Satılmayan tutar stokta kalır.',
        consequence: 'Bu hata yapılırsa dönem kârlılığı yanlış hesaplanır; stokta bekleyen hammadde gider yazılırsa gerçekte kârda olan işletme zararda görünür.' },
      { type: 'quick_application', label: 'Kendi İşletmenin Giderlerini Sınıflandır',
        instruction: 'İşletmene ait 5 harcama kalemini belirle ve iki bağımsız eksende değerlendir.',
        axes: [ { name: 'Hacme Göre', options: ['Sabit', 'Değişken', 'Karma'] }, { name: 'Ürünle İlişkisine Göre', options: ['Doğrudan', 'Dolaylı'] } ] }
    ],
    decisionToolLinks: [{ code: 'DC-PROFIT-001', label: 'Ürünüm Gerçekten Kârlı mı?' }],
    sources: [
      { title: 'Anadolu Üniversitesi Açıköğretim Fakültesi – Genel Muhasebe Ders Kitabı (Ünite 1 ve 5)', url: 'https://ekampus.anadolu.edu.tr/', note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.' },
      { title: 'Atatürk Üniversitesi Açıköğretim Fakültesi – Maliyet Muhasebesi Ders Kitabı (Ünite 2)', url: 'https://www.atauni.edu.tr/', note: 'Açık erişimli; yeniden kullanım lisansı ayrıca doğrulanmadı. İçerik özgün biçimde özetlenmiştir.' }
    ]
  },
];