// Adds real PracticalCard rows (+ published version + KO link) for batch 2.
// Reuses the exact upsert pattern from scripts/add-batch1-new-lesson-cards.js.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const CARDS = [
  // Ders 1 — Vitrin ve Mağaza İçi Satışı Artır
  {
    code: 'PC-RETAIL-008',
    title: 'Metrekare Başına Brüt Kâr Hesabı',
    type: 'quick_formula',
    shortDescription: 'Mağaza alanlarının satış ve kârlılık potansiyelini karşılaştırın.',
    category: 'Perakende ve Mağaza Yönetimi',
    published: true,
    kos: ['CUR-123-01'],
    contentJson: {
      mainContent: 'Her metrekarenin sadece ciro değil, brüt kâr ürettiğini ölçün. Yüksek ciro ama düşük marjlı alan, düşük ciro ama yüksek marjlı alandan daha az katkı sağlayabilir.',
      formula: 'm² Başına Brüt Kâr = Bölgenin Brüt Kârı ÷ Bölgenin Metrekare Alanı',
      example: 'Giriş bölgesi 15 m², aylık brüt kâr 60.500 TL ise m² başına brüt kâr ≈ 4.033 TL.',
      warning: 'Bu tutar "net kâr" değildir; vergi, fire, personel ve diğer giderler henüz düşülmemiştir.',
      keyTakeaway: 'Sıcak bölgeleri yüksek marjlı ürünlerle test edip, m² başına katkıyı ölçün.'
    }
  },
  {
    code: 'PC-RETAIL-009',
    title: 'Mağaza Yerleşimi ve Vitrin Kontrol Listesi',
    type: 'checklist',
    shortDescription: 'Vitrin, sıcak bölge ve kasa çevresi yerleşimini kontrol edin.',
    category: 'Perakende ve Mağaza Yönetimi',
    published: true,
    kos: ['CUR-123-01'],
    contentJson: {
      mainContent: 'Mağaza yerleşimi yalnızca estetik değil, satış ve kârlılık kararıdır.',
      checklistItems: [
        'Sıcak, nötr ve soğuk bölgeler kendi mağaza verinizle belirlendi mi?',
        'Vitrin üç temel soruya hızlı cevap veriyor mu?',
        'Planlı ve anlık karar satışı ürünleri ayrı stratejilerle sergileniyor mu?',
        'Kasa çevresi çapraz satış ürünleri brüt kâr ve kasa süresine göre seçildi mi?'
      ],
      keyTakeaway: 'Yerleşim değişikliğini iki haftalık pilotla test edip önce-sonra verisiyle karşılaştırın.'
    }
  },
  // Ders 6 — Melek Yatırımcıya Hazır mıyım?
  {
    code: 'PC-ENT-001',
    title: 'Melek Yatırım Hazırlık Kontrol Listesi',
    type: 'checklist',
    shortDescription: 'Yatırım görüşmesi öncesi beş hazırlık kapısını kontrol edin.',
    category: 'Girişimcilik ve Yatırım',
    published: true,
    kos: ['CUR-129-01'],
    contentJson: {
      mainContent: 'Yatırım talebi yalnızca nakit ihtiyacı değil, şirketin hazır olup olmadığı sorusudur.',
      checklistItems: [
        'Yatırım gerçekten özsermaye gerektiriyor mu, yoksa borçlanma daha uygun mu?',
        'Ödeme yapan müşteri ve tekrarlayan gelir kanıtı var mı?',
        'Pay yapısı, fikri mülkiyet ve mali kayıtlar düzenli mi?',
        'Kurucu ile yatırımcının çıkış beklentisi ve büyüme stratejisi uyumlu mu?',
        'Hukuki ve mali belgeler görüşme öncesi hazır mı?'
      ],
      warning: 'Lisanslı bireysel katılım yatırımcısı mevzuatı her yatırımı kapsamaz; somut sözleşme için hukukçu desteği alın.',
      keyTakeaway: 'Hazırlık eksikse "görüşmeye hazır" değil "hazırlık gerekli" kararı verin.'
    }
  },
  {
    code: 'PC-ENT-002',
    title: 'Post-money / Pre-money Hızlı Hesabı',
    type: 'quick_formula',
    shortDescription: 'Yatırım tutarı ve pay oranından değerlemeyi doğrulayın.',
    category: 'Girişimcilik ve Yatırım',
    published: true,
    kos: ['CUR-129-01'],
    contentJson: {
      mainContent: 'Aynı yatırım tutarında pre-money ile post-money arasındaki fark, kurucunun ne kadar pay verdiğini değiştirir.',
      formula: 'Post-money = Yatırım ÷ Yatırımcı Payı; Pre-money = Post-money − Yatırım',
      example: '3.000.000 TL yatırım, %15 pay karşılığında post-money = 20.000.000 TL ve pre-money = 17.000.000 TL.',
      warning: 'ARR çarpanı sektör, büyüme ve kanıt kalitesine göre değişir; evrensel çarpan kullanmayın.',
      keyTakeaway: 'Teklifte pre-money mi yoksa post-money mi yazdığını mutlaka doğrulayın.'
    }
  },
  // Ders 7 — Ortaklık Teklifini Değerlendir
  {
    code: 'PC-ENT-003',
    title: 'Term Sheet Temel Maddeler Kontrol Listesi',
    type: 'checklist',
    shortDescription: 'Teklif paketini tek madde yerine bütün olarak değerlendirin.',
    category: 'Girişimcilik ve Yatırım',
    published: true,
    kos: ['CUR-130-01'],
    contentJson: {
      mainContent: 'Bir term sheet maddesi tek başına değerlendirilmemeli; maddeler birlikte etki yaratır.',
      checklistItems: [
        'Pre-money/post-money değerleme net mi?',
        'Tasfiye önceliği türü (1x non-participating, participating vb.) hesaplandı mı?',
        'Veto listesi günlük operasyonu kilitlemiyor mu?',
        'Tag-along ve drag-along hakları dengeli mi?',
        'Vesting süresi, cliff ve ayrılma koşulları belirli mi?'
      ],
      warning: 'Term sheet bazı maddeler için bağlayıcı olabilir; her maddenin hukuki niteliğini ayırt edin.',
      keyTakeaway: 'Karşı teklif hazırlarken maddeleri paket olarak, ayrı ayrı senaryolarla değerlendirin.'
    }
  },
  {
    code: 'PC-ENT-004',
    title: 'Tasfiye Önceliği Etkisi Hesabı',
    type: 'quick_formula',
    shortDescription: 'Aynı değerlemede tasfiye önceliğinin kurucu dağıtımını nasıl değiştirdiğini görün.',
    category: 'Girişimcilik ve Yatırım',
    published: true,
    kos: ['CUR-130-01'],
    contentJson: {
      mainContent: 'Aynı yatırım ve satış değerinde bile tasfiye önceliği maddesi kurucu dağıtımını önemli ölçüde değiştirebilir.',
      formula: 'Kurucu Dağıtımı = Satış Tutarı − Yatırımcı Öncelik Tutarı − (Kalan × Yatırımcı Payı)',
      example: '25.000.000 TL satışta, 5.000.000 TL yatırım, %30 pay, 2x participating ile yatırımcı 14.500.000 TL alır; kurucular 10.500.000 TL.',
      warning: 'Hesap basitleştirilmiştir; vergi, borç, opsiyon havuzu ve işlem giderleri hesaba katılmamıştır.',
      keyTakeaway: 'Farklı tasfiye senaryolarını yan yana hesaplayarak maddenin gerçek etkisini görün.'
    }
  },
  // Ders 9 — Şikâyeti Kayba Dönüştürmeden Yönet
  {
    code: 'PC-CS-001',
    title: 'Şikâyet Karar Akışı Kontrol Listesi',
    type: 'checklist',
    shortDescription: 'Şikâyeti kayıttan kök nedene kadar sistematik yönetin.',
    category: 'Satış ve Müşteri Yönetimi',
    published: true,
    kos: ['CUR-131-01'],
    contentJson: {
      mainContent: 'Her şikâyet aynı süreçle yönetilmemeli; önce hukuki kategori, sonra teknik inceleme, sonra çözüm.',
      checklistItems: [
        'Satış kanalı (mağaza/mesafeli satış) belirlendi mi?',
        'Şikâyetin hukuki kategorisi (ayıplı mal, cayma, garanti vb.) ayırt edildi mi?',
        'Teknik inceleme tarafsız ve kayıtlı yapıldı mı?',
        'Yasal zorunluluk ile gönüllü ticari telafi birbirinden ayrıldı mı?',
        'Kapatmadan önce kök neden ve tekrarını önleyici işlem kaydedildi mi?'
      ],
      warning: 'Müşteri yaşam boyu değeri bir tahmindir; gelecekte kesin alışveriş yapacakmış gibi telafi maliyeti hesaplamayın.',
      keyTakeaway: 'Hukuki hak ile ticari inisiyatifi karıştırmadan, tutarlı yetki sınırlarıyla karar verin.'
    }
  },
  {
    code: 'PC-CS-002',
    title: 'Telafi Beklenen Değer Hesabı',
    type: 'quick_formula',
    shortDescription: 'Gönüllü telafinin maliyetini korunması beklenen katkıyla karşılaştırın.',
    category: 'Satış ve Müşteri Yönetimi',
    published: true,
    kos: ['CUR-131-01'],
    contentJson: {
      mainContent: 'Telafi kararı yalnızca müşteri ilişkisi değil, maliyet-fayda hesabıdır.',
      formula: 'Telafinin Beklenen Değeri = Korunması Beklenen Katkı − Telafi ve Operasyon Maliyeti',
      example: 'Korunması beklenen katkı 1.500 TL, telafi maliyeti 1.800 TL ise telafi negatif değerdedir.',
      warning: 'Geçmiş harcama, gelecekteki kârı garanti etmez; satış tutarı ile kâr tutarını karıştırmayın.',
      keyTakeaway: 'Telafi maliyeti, operasyon giderleri ve ihtimali birlikte değerlendirin.'
    }
  },
  // Ders 11 — Yorum ve İtibar Yönetimi (1 card)
  {
    code: 'PC-REP-001',
    title: 'Dijital Yorum Yanıt Protokolü',
    type: 'checklist',
    shortDescription: 'Yorumları dört aşamalı süreçle yönetin ve KVKK riskinden kaçının.',
    category: 'Satış ve Müşteri Yönetimi',
    published: true,
    kos: ['CUR-132-01'],
    contentJson: {
      mainContent: 'Yorum yanıtı yalnızca şikayet sahibine değil, gelecekte okuyacaklara da görünür.',
      checklistItems: [
        'Yorum platform, tarih, iddia ve siparişle eşleştirilerek kaydedildi mi?',
        'Kamusal yanıt kişisel veri içermiyor mu?',
        'Sorun özel kanalda çözülüp sonuç kaydedildi mi?',
        'Yorum güncelleme talebi olumlu yorum şartına bağlanmamış mı?',
        'Sahte/hukuka aykırı içerikler için platform şikâyet mekanizması ve delil saklama yapıldı mı?'
      ],
      warning: '"İlk dört saatte yanıt" gibi evrensel kurallar yerine kendi hizmet seviyenizi tanımlayın.',
      keyTakeaway: 'Tarafsız örnekleme ile organik yorum toplayın; puanı tek başına yeterli göstergesi saymayın.'
    }
  },
  // Ders 13 — POS ve Kasa Yazılımı Nasıl Seçilir?
  {
    code: 'PC-TECH-001',
    title: 'POS ve Kasa Yazılımı Seçim Kontrol Listesi',
    type: 'checklist',
    shortDescription: 'Teklif öncesi ihtiyaç, uyumluluk ve senkronizasyon kriterlerini kontrol edin.',
    category: 'Dijitalleşme ve Teknoloji',
    published: true,
    kos: ['CUR-133-01'],
    contentJson: {
      mainContent: 'POS seçimi yalnızca cihaz fiyatı değil; mali cihaz, banka altyapısı ve kasa yazılımının uyum kararıdır.',
      checklistItems: [
        'GİB onaylı YN ÖKC modeli ve entegrasyon yöntemi yazılı olarak doğrulandı mı?',
        'Çevrim dışı çalışma sınırları, kartlı ödeme ve mali belge açısından test edildi mi?',
        'Stok/fiyat senkronizasyonunda çift kayıt ve hata yönetimi var mı?',
        'Kullanıcı yetkileri, iade onayı ve kasa açma-kapama kaydı bulunuyor mu?',
        'Toplam sahip olma maliyeti (donanım, lisans, entegrasyon, eğitim, bakım) hesaplandı mı?'
      ],
      warning: '"GİB uyumlu" satıcı beyanı tek başına yeterli değildir; onaylı model listesi ve entegrasyon testi şart.',
      keyTakeaway: 'Canlı geçişten önce 12 temel senaryoyu kapsayan pilot test yapın.'
    }
  },
  {
    code: 'PC-TECH-002',
    title: 'POS Geri Dönüş Süresi Hesabı',
    type: 'quick_formula',
    shortDescription: 'Yeni POS sisteminin hata ve zaman tasarrufu üzerinden basit geri dönüş süresini hesaplayın.',
    category: 'Dijitalleşme ve Teknoloji',
    published: true,
    kos: ['CUR-133-01'],
    contentJson: {
      mainContent: 'Sadece cihaz maliyetine değil, manuel giriş hatası, kuyruk ve mutabakat maliyetine göre değerlendirin.',
      formula: 'Geri Dönüş Süresi (ay) = Toplam İlk Yıl Maliyeti ÷ Aylık Korunan Maliyet',
      example: 'İlk yıl maliyeti 73.000 TL, aylık hata/azalan maliyet 18.000 TL ise geri dönüş ≈ 4,1 ay.',
      warning: 'Hesap kuyruk azalması, bakım, geçiş hatası ve finansman maliyetini içermez.',
      keyTakeaway: 'Pilot sonrası gerçek hata azalma oranı ile geri dönüşü tekrar hesaplayın.'
    }
  },
  // Ders 14 — Muhasebe Yazılımına Geçmeli miyim?
  {
    code: 'PC-TECH-003',
    title: 'Muhasebe Yazılımı Geçiş Kontrol Listesi',
    type: 'checklist',
    shortDescription: 'Geçiş kararı öncesi süreç, modül ve uyum ihtiyaçlarını kontrol edin.',
    category: 'Dijitalleşme ve Teknoloji',
    published: true,
    kos: ['CUR-134-01'],
    contentJson: {
      mainContent: 'Ön muhasebe yazılımı SMMM ve resmî muhasebenin yerine geçmez; günlük kayıtları düzenler.',
      checklistItems: [
        'e-Fatura/e-Arşiv yükümlülüğü için GİB Portal veya yazılım seçeneği değerlendirildi mi?',
        'Gerekli modüller (cari, banka, stok, fatura, SMMM aktarımı) belirlendi mi?',
        'Veri dışarı aktarımı, yedekleme ve abonelik bitişinde erişim koşulları soruldu mu?',
        'Paralel kontrol ve mutabakat planı hazır mı?',
        'SMMM hangi formatta veri alacağını netleştirdi mi?'
      ],
      warning: '"Ayda X faturadan sonra yazılım şart" gibi evrensel sınır yoktur; karmaşıklık ve hata riski belirleyicidir.',
      keyTakeaway: 'Eski Excel dosyalarını salt okunur arşivleyin; hata listesini kapatmadan eski yöntemi bırakmayın.'
    }
  },
  {
    code: 'PC-TECH-004',
    title: 'Yazılım Zaman Tasarrufu Hesabı',
    type: 'quick_formula',
    shortDescription: 'Otomasyon sonrası gerçekçi zaman tasarrufunu hesaplayın.',
    category: 'Dijitalleşme ve Teknoloji',
    published: true,
    kos: ['CUR-134-01'],
    contentJson: {
      mainContent: 'Yazılım tüm manuel işi ortadan kaldırmaz; kontrol, istisna ve eşleştirme süresi kalır.',
      formula: 'Aylık Zaman Katkısı = (Eski Süre − Yeni Süre) × Saatlik Tam Personel Maliyeti',
      example: '42,5 saat tasarruf × 300 TL/saat = 12.750 TL/ay zaman katkısı.',
      warning: 'Saatlik maliyet yalnızca net ücret değil, işveren yükü ve yan giderlerdir.',
      keyTakeaway: 'Serbest kalan zamanın değer üreten işe aktarıldığından emin olun.'
    }
  },
  // Ders 16 — Entegrasyon mu, Manuel Süreç mi?
  {
    code: 'PC-TECH-005',
    title: 'Entegrasyon Öncelik Puanı',
    type: 'checklist',
    shortDescription: 'Bir sürecin entegrasyon adayı olup olmadığını 6 ölçütle puanlayın.',
    category: 'Dijitalleşme ve Teknoloji',
    published: true,
    kos: ['CUR-135-01'],
    contentJson: {
      mainContent: 'Yüksek puan entegrasyon adayını gösterir; ancak finansal fizibilitenin yerine geçmez.',
      checklistItems: [
        'İşlem yüksek tekrara sahip mi?',
        'Girdi ve çıktı alanları standart mı?',
        'Hata etkisi finansal veya müşteri kaybı açısından yüksek mi?',
        'Gecikme stok, teslimat veya iletişimi bozuyor mu?',
        'Hangi kaydın ne zaman aktarıldığı izlenebiliyor mu?',
        'Hacim, kurulum ve bakım maliyetini karşılayacak düzeyde mi?'
      ],
      keyTakeaway: 'Önce süreci düzeltin, sonra entegre edin; hatalı veriyi otomasyon daha hızlı yayar.'
    }
  },
  {
    code: 'PC-TECH-006',
    title: 'Net Otomasyon Katkısı Hesabı',
    type: 'quick_formula',
    shortDescription: 'Entegrasyonun işçilik, hata ve hız kazancından toplam maliyetini çıkarın.',
    category: 'Dijitalleşme ve Teknoloji',
    published: true,
    kos: ['CUR-135-01'],
    contentJson: {
      mainContent: 'Nakit tasarruf olarak kabul edilmemeli; personel işine son verilmediyse maliyet aynı kalabilir.',
      formula: 'Net Otomasyon Katkısı = (Azalan İşçilik + Azalan Hata + Hızlanan Tahsilat + Korunan Satış) − Toplam Entegrasyon Maliyeti',
      example: '33.175 TL brüt fayda − 8.000 TL aylık entegrasyon maliyeti = 25.175 TL net aylık katkı.',
      warning: 'Çalışanın işine son verilmediyse serbest kalan zamanın değer üreten işe aktarılması gerekir.',
      keyTakeaway: 'Pilot sonrası gerçek fayda oranlarıyla net katkıyı tekrar hesaplayın.'
    }
  },
  // Ders 18 — Devren Satın Almada Risk Tespiti (4 KOs)
  {
    code: 'PC-BIZBUY-003',
    title: 'Devralma Öncesi Risk Tespiti Kontrol Listesi',
    type: 'checklist',
    shortDescription: 'Devralmadan önce hukuki, mali ve operasyonel başlıkları sistematik kontrol edin.',
    category: 'İşi Satın Alma ve Yatırım Değerlendirmesi',
    published: true,
    kos: ['CUR-121-01', 'CUR-121-02', 'CUR-121-03', 'CUR-121-04'],
    contentJson: {
      mainContent: 'Devralma sadece satış hacmine ve dekorasyona bakılarak karar verilmemeli.',
      checklistItems: [
        'İşlem türü net (şirket payı, ticari işletme, tekil varlık)?',
        'Vergi/SGK borçları ve devam eden incelemeler yazılı olarak incelendi mi?',
        'Çalışan yükümlülükleri doğmuş/gelecekte doğabilecek olarak ayrıldı mı?',
        'Kira devri için kiraya verenin yazılı rızası alınacak mı?',
        'Stok ve demirbaşlar satılabilir/hasarlı/konsinye olarak ayrılıp değerlendirildi mi?'
      ],
      warning: '"Borcu yoktur" yazısı sonradan çıkabilecek tüm riskleri ortadan kaldırmaz.',
      keyTakeaway: 'Sözleşmede beyan, garanti, tazmin ve bedel bloke hükümleri bulundurun.'
    }
  },
  {
    code: 'PC-BIZBUY-004',
    title: 'Devir Bedeli Düzeltme Hesabı',
    type: 'quick_formula',
    shortDescription: 'Tespit edilen riskleri devir bedelinden düşülebilecek ve pazarlık gerekçesi yapılabilecek olarak ayırın.',
    category: 'İşi Satın Alma ve Yatırım Değerlendirmesi',
    published: true,
    kos: ['CUR-121-01', 'CUR-121-02', 'CUR-121-03', 'CUR-121-04'],
    contentJson: {
      mainContent: 'Her risk doğrudan bedelden düşülmez; bazıları pazarlık gerekçesi, bazıları somut indirimdir.',
      formula: 'Düzeltilebilir Riskler = Doğmuş Borçlar + Stok Değer Kaybı + Fiyatlandırılmış Risk İndirimi',
      example: '150.000 TL stok değer kaybı doğrudan indirim; 840.000 TL iki yıllık kira artışı pazarlık gerekçesi.',
      warning: 'Gelecekte doğabilecek kıdem karşılığı gibi tahmini yükler devir günü kesin borç değildir.',
      keyTakeaway: 'Riskleri kesin, tahmini ve pazarlık kalemi olarak sınıflandırın.'
    }
  },
  // Ders 19 — Franchise Almalı mıyım?
  {
    code: 'PC-BIZBUY-005',
    title: 'Franchise Sözleşmesi Kontrol Listesi',
    type: 'checklist',
    shortDescription: 'Franchise teklifinin temel mali ve hukuki maddelerini kontrol edin.',
    category: 'İşi Satın Alma ve Yatırım Değerlendirmesi',
    published: true,
    kos: ['CUR-122-02'],
    contentJson: {
      mainContent: 'Franchise bir marka adı değil; sistem, kısıtlama ve maliyet bütünüdür.',
      checklistItems: [
        'Giriş bedeli, royalty tabanı, reklam fonu ve zorunlu tedarik maliyetleri net mi?',
        'Bölge koruması, internet satışı, pasif satış ve e-ticaret hakları açık mı?',
        'Rekabet etmeme süresi ve kapsamı değerlendirildi mi?',
        'Erken fesih, devir hakkı ve çıkış maliyeti hesaplanabiliyor mu?',
        'Benzer mağazaların doğrulanmış performans verisi istendi mi?'
      ],
      warning: 'Grup muafiyeti dışında kalan hüküm otomatik geçersiz değildir; bireysel değerlendirme gerekir.',
      keyTakeaway: 'Franchise verenin vaat ettiği rakamlar değil, mevcut bayilerin doğrulanmış sonuçları esas alınmalı.'
    }
  },
  {
    code: 'PC-BIZBUY-006',
    title: 'Franchise Toplam Giriş Maliyeti Hesabı',
    type: 'quick_formula',
    shortDescription: 'Giriş bedeli, royalty ve zorunlu harcamaların toplam ilk yıl yükünü hesaplayın.',
    category: 'İşi Satın Alma ve Yatırım Değerlendirmesi',
    published: true,
    kos: ['CUR-122-02'],
    contentJson: {
      mainContent: 'Yalnızca giriş bedeline bakmak yerine ilk yıl toplam maliyeti ve nakit çıkışını hesaplayın.',
      formula: 'İlk Yıl Toplam Maliyet = Giriş Bedeli + Yıllık Royalty + Reklam Fonu + Zorunlu Tedarik + Yazılım + Eğitim + Dekorasyon/Yenileme',
      example: 'Giriş bedeli 500.000 TL + yıllık royalty 120.000 TL + reklam fonu 60.000 TL + zorunlu tedarik 400.000 TL = 1.080.000 TL.',
      warning: 'Tahmini ciroya göre royalty maliyeti değişebilir; kötü senaryoda da hesap yapın.',
      keyTakeaway: 'Toplam giriş maliyetini sıfırdan kuruluş veya başka franchise alternatifleriyle karşılaştırın.'
    }
  }
];

async function seed() {
  for (const cardDef of CARDS) {
    console.log(`\n${cardDef.code} — ${cardDef.title}`);
    if (!apply) { console.log('  (dry run — not written)'); continue; }

    let card = await prisma.practicalCard.findUnique({ where: { code: cardDef.code } });
    if (!card) {
      card = await prisma.practicalCard.create({
        data: { code: cardDef.code, title: cardDef.title, type: cardDef.type, shortDescription: cardDef.shortDescription, category: cardDef.category, published: cardDef.published }
      });
      console.log('  ✓ card created');
    } else {
      card = await prisma.practicalCard.update({
        where: { code: cardDef.code },
        data: { title: cardDef.title, type: cardDef.type, shortDescription: cardDef.shortDescription, category: cardDef.category, published: cardDef.published }
      });
      console.log('  ♻ card updated');
    }

    const existingVersion = await prisma.practicalCardVersion.findFirst({ where: { practicalCardId: card.id }, orderBy: { version: 'desc' } });
    const newVersionNum = existingVersion ? existingVersion.version + 1 : 1;
    await prisma.practicalCardVersion.create({ data: { practicalCardId: card.id, version: newVersionNum, status: 'published', contentJson: cardDef.contentJson } });
    if (existingVersion) {
      await prisma.practicalCardVersion.updateMany({ where: { practicalCardId: card.id, version: { lt: newVersionNum } }, data: { status: 'archived' } });
    }
    console.log(`  ✓ version ${newVersionNum} published`);

    await prisma.practicalCardKnowledgeObject.deleteMany({ where: { practicalCardId: card.id } });
    let order = 0;
    for (const koCode of cardDef.kos) {
      const ko = await prisma.knowledgeObject.findFirst({ where: { code: koCode } });
      if (!ko) { console.warn(`  ⚠ KO not found: ${koCode}`); continue; }
      await prisma.practicalCardKnowledgeObject.create({ data: { practicalCardId: card.id, knowledgeObjectId: ko.id, order: order++ } });
      console.log(`  ✓ linked to KO ${ko.code} (id ${ko.id})`);
    }
  }
}

seed().catch(e => { console.error('FATAL:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
