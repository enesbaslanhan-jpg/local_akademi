/*
 * GİZLİLİK VE KVKK AYDINLATMA METNİ
 *
 * Buradaki teknik iddialar kod ve release yapılandırması üzerinden
 * doğrulandı (23.08.2026):
 *   - Sunucunun ülkesi: IP konumu + ters DNS (vps.ovh.net) → Fransa
 *   - Mistral saklama süresi ve eğitim ayarı: sağlayıcı panelinden
 *   - Tarayıcı depolaması ve uygulama çerezleri: frontend kaynak kodundan
 *   - İşlenen veri alanları: prisma/schema.prisma
 *
 * Bir alıcı, ülke ya da süre değişirse ÖNCE burası güncellenir, sonra
 * src/config/legal-documents.ts içindeki `version` artırılır. Sürüm
 * artınca mevcut kullanıcılardan yeniden onay isteniyor — mekanizma
 * `missingConsents` içinde, yeni kod gerekmiyor.
 *
 * AI sağlayıcısı/modeli ya da verinin ulaştığı nihai API değişirse bu
 * alıcı tablosu yeniden doğrulanmalı ve AYRI bir legal version update
 * yapılmalıdır. Kod içindeki uyumluluk katmanı adı, tek başına ayrı bir
 * veri alıcısı olduğunu kanıtlamaz.
 *
 * Sayfadaki tarih buradan DEĞİL, API'den geliyor. İki yerde tarih
 * tutulursa kaçınılmaz olarak ayrışır.
 */

export default {
  giris:
    'Bu metin, LocalKarar uygulamasını kullandığınızda hangi kişisel verilerinizin ' +
    'işlendiğini, neden işlendiğini, kimlere aktarıldığını ve bu konuda hangi haklara ' +
    'sahip olduğunuzu 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca açıklar.',

  bolumler: [
    {
      id: 'veri-sorumlusu',
      baslik: '1. Veri sorumlusunun kimliği',
      paragraflar: [
        'KVKK kapsamında veri sorumlusu, gerçek kişi olarak Enes Buğra Aslanhan’dır. ' +
        'LocalKarar bir tüzel kişilik bünyesinde işletilmemektedir.'
      ],
      tanimlar: [
        ['Veri sorumlusu', 'Enes Buğra Aslanhan (gerçek kişi)'],
        ['Bulunduğu yer', 'Ankara / Yenimahalle'],
        ['Başvuru adresi', 'kvkk@localkarar.com'],
        ['Uygulama', 'localkarar.com']
      ],
      son: [
        'Açık posta adresi bu sayfada yayımlanmamaktadır. Yazılı başvuru yapmak ' +
        'istemeniz hâlinde adres bilgisi, yukarıdaki e-posta adresine ileteceğiniz ' +
        'talep üzerine tarafınıza bildirilir.'
      ]
    },

    {
      id: 'kapsam',
      baslik: '2. Bu metnin kapsamı',
      paragraflar: [
        'Bu aydınlatma metni, LocalKarar hesabınız ve oluşturduğunuz işletme çalışma ' +
        'alanları kapsamında gerçekleşen kişisel veri işleme faaliyetlerini kapsar.',
        'Uygulama içinden bağlantı verilen üçüncü taraf internet sitelerinde (örneğin ' +
        'bir haberin dayandığı resmî kaynak) geçerli olan gizlilik uygulamaları bu ' +
        'metnin kapsamı dışındadır.'
      ]
    },

    {
      id: 'islenen-veriler',
      baslik: '3. İşlenen kişisel veriler',
      paragraflar: [
        'Uygulamayı nasıl kullandığınıza göre aşağıdaki veri kategorileri işlenebilir.'
      ],
      tanimlar: [
        ['Kimlik', 'Ad ve soyad.'],
        ['İletişim', 'E-posta adresi.'],
        [
          'Hesap ve güvenlik',
          'Parolanızın kriptografik özeti — parolanın kendisi hiçbir biçimde ' +
          'saklanmaz —, oturum ve oturum yenileme anahtarları, e-posta doğrulama ' +
          'durumu, hesap oluşturma ve güncelleme zamanları.'
        ],
        [
          'İşletme profili',
          'İşletme adı ve unvanı, sektör, şehir, işletme aşaması, çalışan sayısı, satış ' +
          'kanalları, hedefler, zorluklar ve sizin girdiğiniz finansal büyüklükler ' +
          '(aylık satış, aylık gider, nakit mevcudu, borç durumu).'
        ],
        [
          'İşletme kayıtları',
          'Gelir, gider ve diğer takip kayıtları; cari hesaplar, hatırlatmalar, işletme ' +
          'üyelikleri ve davetleri, yüklediğiniz dosyalar ile bu dosyalardan çıkarılan metin.'
        ],
        [
          'Hesaplama ve karar verileri',
          'Hesaplamalara girdiğiniz değerler ve sonuçlar; finansal model çalışmaları, ' +
          'varsayımlar ve hesap izleri; Karar Araçları oturumları, yanıtları ve sonuçları; ' +
          'kaydettiğiniz pratik kartlar ve karar günlüğü kayıtları.'
        ],
        [
          'Öğrenme verileri',
          'Kurs kayıtlarınız; ders, bilgi nesnesi, video ve çalışma ilerlemeniz; görev ' +
          'kayıtlarınız ve ders içi alıştırma işaretleriniz.'
        ],
        [
          'AI Mentor verileri',
          'Mentor konuşmalarınız, konuşma özetleri, geçmiş konuşmalardan çıkarılan ve ' +
          'yönetebildiğiniz mentor notları ile yanıt üretiminde kullanılan bağlam kayıtları. ' +
          'İşletme takibi özeti (açık kayıt sayıları, vadesi geçmişler, 30 günlük borç/alacak ' +
          'toplamları, yönü belirsiz kayıtlar) de soruyla ilgili olduğunda aktarılır; ' +
          'müşteri adı, fatura numarası, kayıt başlığı gibi tanımlayıcı detaylar aktarılmaz.'
        ],
        [
          'Topluluk ve destek içeriği',
          'Topluluk gönderileri, yanıtlar, beğeniler, kaydetmeler, takip ilişkileri, ' +
          'engellediğiniz veya sizi engelleyen kullanıcı kayıtları, şikâyet kayıtları ' +
          've destek formuna yazdığınız iletişim ve talep içeriği.'
        ],
        [
          'Üyeler arası özel mesajlar',
          'Diğer üyelerle yaptığınız birebir ve grup yazışmalarının içeriği, gönderim ' +
          'zamanı, sohbet üyelikleri ve davetler. Bu mesajlar sunucuda saklanır ve ' +
          'uçtan uca şifreli DEĞİLDİR: teknik olarak sunucu tarafında okunabilir ' +
          'durumdadır. Yönetim bu içeriğe yalnızca bir şikâyet incelemesi gerektirdiğinde ' +
          'erişir.'
        ],
        [
          'Gelen e-posta kanalı',
          'İşletmenize özel gelen kutusu adresini açtığınızda: o adrese gönderilen ' +
          'postaların GÖNDEREN ADRESİ, konu başlığı ve EKLERİ. Ekler, elle yüklenmiş ' +
          'belgelerle aynı şekilde işlenir. Posta gövdesinin metni saklanmaz; yalnızca ' +
          'ekler ve yukarıdaki alanlar alınır.'
        ],
        ['Görsel', 'Yüklemeyi seçerseniz profil fotoğrafınız.'],
        [
          'İşlem güvenliği',
          'Sunucu erişim kayıtlarında IP adresi, tarayıcı bilgisi ve istek zamanı. ' +
          'Bu bilgiler veritabanında hesabınızla ilişkilendirilerek saklanmaz; ' +
          'yalnızca teknik günlük dosyalarında yer alır.'
        ]
      ],
      /* Reklam ölçümü BİLEREK kişisel veri kategorisi olarak
         yazılmadı: kişiye bağlanan hiçbir kayıt tutulmuyor. Onu bir
         kategori gibi listelemek, olmayan bir işlemeyi varmış gibi
         göstermek olurdu. */
      /* `son` alanı: listeden SONRA gelen kapanış paragrafı.
         `LegalPage` bunu zaten çiziyor -- yeni bir alan icat etmeye
         gerek yok, uydurulan alan sessizce görünmez kalırdı. */
      son: [
        'Topluluk alanında reklam gösterildiğinde yalnızca TOPLAM gösterim ve ' +
        'tıklama sayacı artırılır. Reklamı kimin gördüğü ya da tıkladığı ' +
        'KAYDEDİLMEZ; bu sayaçlar hiçbir kullanıcıyla ilişkilendirilemez ve bu ' +
        'nedenle kişisel veri işleme niteliği taşımaz.'
      ]
    },

    {
      id: 'ucuncu-kisi-verileri',
      baslik: '4. Üçüncü kişilere ait veriler ve sıfatımız',
      paragraflar: [
        'İşletme takibi özelliklerini kullanırken müşterilerinize, tedarikçilerinize ' +
        'veya çalışanlarınıza ait kişisel verileri (ad, e-posta, telefon, adres) ' +
        'uygulamaya girebilir; bu kişilere ait bilgiler içeren fatura ve benzeri ' +
        'belgeleri yükleyebilirsiniz.',
        'Aynı durum, işletmenize özel gelen kutusu adresini açtığınızda geçerlidir: ' +
        'o adrese gönderdiğiniz faturalar tedarikçilerinizin ve müşterilerinizin ' +
        'bilgilerini taşır. Bu kanalı açmak, o verileri uygulamaya aktarma kararını ' +
        'sizin vermeniz demektir.',
        'Bu veriler bakımından KVKK anlamında veri sorumlusu sizsiniz. LocalKarar bu ' +
        'veriler bakımından yalnızca veri işleyen sıfatıyla, sizin talimatınız ' +
        'doğrultusunda ve size hizmet sunmak amacıyla hareket eder.',
        'Söz konusu kişilerin verilerini işlemek için gerekli hukuki sebebe sahip olmak ' +
        've bu kişileri KVKK uyarınca aydınlatmak sizin sorumluluğunuzdadır. Ayrıntı ' +
        'için Kullanım Koşulları’na bakınız.'
      ]
    },

    {
      id: 'amaclar',
      baslik: '5. İşleme amaçları ve hukuki sebepleri',
      paragraflar: [
        'Verileriniz aşağıdaki amaçlarla ve karşılarında gösterilen hukuki sebeplere ' +
        'dayanılarak işlenir.'
      ],
      tablo: {
        basliklar: ['Amaç', 'İşlenen veriler', 'Hukuki sebep (KVKK m.5)'],
        satirlar: [
          [
            'Hesabınızı oluşturmak ve sürdürmek',
            'Kimlik, iletişim, hesap ve güvenlik',
            'Sözleşmenin kurulması ve ifası (m.5/2-c)'
          ],
          [
            'Uygulama özelliklerini sunmak: kurslar, hesaplamalar, karar araçları, işletme takibi',
            'İşletme profili, işletme kayıtları, öğrenme, hesaplama ve karar verileri',
            'Sözleşmenin ifası (m.5/2-c)'
          ],
          [
            'AI Mentor soru–cevap hizmetini sunmak',
            'AI Mentor verileri; soruyla ilgili olduğu ölçüde işletme profili, işletme takip özeti (sayılar ve toplamlar; müşteri adı, fatura no, başlık hariç), kurs kayıtları ve ilerleme, hesaplama sonuçları ve yüklenen dosyalardan kısa bölümler',
            'Sözleşmenin ifası (m.5/2-c)'
          ],
          [
            'Topluluk alanını ve üyeler arası özel mesajlaşmayı sunmak',
            'Topluluk ve destek içeriği, üyeler arası özel mesajlar',
            'Sözleşmenin ifası (m.5/2-c)'
          ],
          [
            'Engelleme ve şikâyet mekanizmalarını işletmek',
            'Engelleme ve şikâyet kayıtları',
            'Meşru menfaat (m.5/2-f) — kullanıcıların taciz ve istenmeyen iletişimden korunması'
          ],
          [
            'İşletmenize özel gelen kutusuna gönderilen belgeleri işlemek',
            'Gelen e-posta kanalı verileri; eklerden çıkarılan işletme kayıtları',
            'Sözleşmenin ifası (m.5/2-c) — bu kanalı siz açtığınızda'
          ],
          [
            'Hesap güvenliğini sağlamak ve kötüye kullanımı önlemek',
            'Hesap ve güvenlik, işlem güvenliği',
            'Meşru menfaat (m.5/2-f)'
          ],
          [
            'Destek taleplerinizi karşılamak',
            'Kimlik, iletişim, destek talebinin içeriği',
            'Meşru menfaat (m.5/2-f)'
          ],
          [
            'Yasal yükümlülükleri yerine getirmek ve yetkili taleplerini yanıtlamak',
            'İlgili tüm veriler',
            'Hukuki yükümlülük (m.5/2-ç)'
          ]
        ]
      },
      son: [
        'Bu işleme faaliyetleri açık rızaya dayanmamaktadır; hizmetin sunulabilmesi için ' +
        'gereklidir. Açık rıza gerektiren yeni bir işleme faaliyeti eklenirse ayrıca ve ' +
        'açıkça onayınız istenir.'
      ]
    },

    {
      id: 'toplama-yontemi',
      baslik: '6. Verilerin toplanma yöntemi',
      paragraflar: [
        'Veriler, uygulamayı kullanmanız sırasında doğrudan sizin girdiğiniz bilgiler ve ' +
        'teknik olarak otomatik üretilen kayıtlar (oturum anahtarları, sunucu erişim ' +
        'günlükleri) yoluyla elektronik ortamda toplanır.',
        'İşletme çalışma alanının diğer üyeleri, davet akışları ve yüklenen belgeler ' +
        'üçüncü kişilere ait verilerin uygulamaya girmesine neden olabilir. Bu durumun ' +
        'sorumlulukları 4. bölümde açıklanmıştır.'
      ]
    },

{
      id: 'yurt-disi',
      baslik: '7. Yurt dışına aktarım',
      paragraflar: [
        'LocalKarar\'ın teknik altyapısında yurt dışında bulunan veya küresel altyapı kullanan hizmet sağlayıcılar yer almaktadır. Bu nedenle kişisel verileriniz, kullanılan özelliğe göre aşağıda belirtilen hizmet sağlayıcılara ve amaçlarla yurt dışına aktarılabilir.'
      ],
      tablo: {
        basliklar: ['Alıcı', 'Ülke', 'Aktarılan veri', 'Amaç'],
        satirlar: [
          [
            'OVH SAS',
            'Fransa',
            'Uygulamada işlenen tüm veriler',
            'Sunucu ve veritabanı barındırma'
          ],
          [
            'Mistral AI',
            'Fransa',
            'AI Mentor mesajları ve yanıt üretimi için gerekli olduğu ölçüde işletme ' +
            'profili/kayıtları, ilgili belge bölümleri, kurs ve ilerleme bilgileri ile ' +
            'hesaplama/model sonuçları',
            'Yapay zekâ yanıtlarının üretilmesi'
          ],
          [
            'Resend',
            'ABD ve kullanılan küresel alt işleyenler',
            'Ad, e-posta adresi ve gönderilen e-postanın içeriği; destek formu ' +
            'kullanıldığında destek talebi',
            'Doğrulama, şifre sıfırlama, bildirim, davet ve destek e-postaları'
          ],
          [
            'Cloudflare',
            'Küresel altyapı',
            'IP adresi ve bağlantı üstverisi',
            'Saldırı koruması ve içerik dağıtımı'
          ]
        ]
      },
      son: [
        'AI Mentor\'a yazdıklarınız, Mistral AI tarafından kötüye kullanım denetimi ' +
        'amacıyla 30 gün süreyle saklanır. Bu süre, kullanılan hizmet planında ' +
        'kapatılabilir değildir.',
        'Mistral AI hesabımızda, verilerin yapay zekâ modellerinin eğitiminde ' +
        'kullanılmasına ilişkin seçenek kapatılmıştır. Yazışmalarınız model eğitiminde ' +
        'kullanılmaz.',
        'Yurt dışına kişisel veri aktarımı gerektiren hizmetlerde, 6698 sayılı Kanun\'un 9. maddesinde öngörülen aktarım şartları ve uygun güvence yöntemleri dikkate alınır. Uygulanması gereken hukuki aktarım mekanizmaları, ilgili hizmet sağlayıcının rolü ve aktarımın niteliğine göre ayrıca değerlendirilir.'
      ]
    },

    {
      id: 'saklama',
      baslik: '8. Saklama süreleri ve imha',
      tablo: {
        basliklar: ['Veri', 'Saklama süresi'],
        satirlar: [
          ['Hesap ve profil verileri', 'Hesabınız açık kaldığı sürece'],
          ['İşletme kayıtları ve belgeler', 'Siz silene kadar; hesap silinince birlikte silinir'],
          ['Öğrenme, hesaplama ve karar kayıtları', 'Hesabınız açık kaldığı sürece veya ilgili kaydı silene kadar'],
          ['AI Mentor konuşmaları, özetleri ve notları', 'Siz silene veya hesabınız silinene kadar'],
          ['Üyeler arası özel mesajlar', 'Sohbet ya da hesap silinene kadar'],
          ['Engelleme ve şikâyet kayıtları', 'Engeli kaldırana kadar; şikâyet kayıtları denetim izi olarak korunur'],
          ['Gelen kutusuna düşen belgeler', 'Elle yüklenen belgelerle aynı: siz silene kadar'],
          ['Oturum yenileme anahtarları', 'Azami 30 gün; çıkış yapıldığında geçersiz kılınır'],
          ['Doğrulama ve şifre sıfırlama anahtarları', 'Kısa süreli; kullanıldığında veya süresi dolduğunda geçersiz'],
          ['Sunucu erişim günlükleri', 'Sınırlı süre; dosya boyutuna göre döngüsel olarak silinir'],
          ['AI Mentor istemleri (Mistral AI nezdinde)', '30 gün'],
          ['İşlem ve denetim kayıtları', 'Güvenlik ve hukuki yükümlülükler için gerekli süre']
        ]
      },
      son: [
        'Hesabınızı sildiğinizde hesap devre dışı bırakılır, sizi tanımlayan bilgiler ' +
        'anonimleştirilir ve açık oturumlarınız sonlandırılır. Güvenlik, denetim veya ' +
        'hukuki saklama yükümlülüğüne tabi kayıtlar, kimliğinizle ilişkisi koparılarak ' +
        'saklanmaya devam edebilir.'
      ]
    },

    {
      id: 'haklar',
      baslik: '9. KVKK m.11 kapsamındaki haklarınız',
      paragraflar: ['Veri sorumlusuna başvurarak şu haklarınızı kullanabilirsiniz:'],
      liste: [
        'Kişisel verinizin işlenip işlenmediğini öğrenme',
        'İşlenmişse buna ilişkin bilgi talep etme',
        'İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme',
        'Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme',
        'Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme',
        'Kanunda öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme',
        'Düzeltme, silme ve yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme',
        'Münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme',
        'Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme'
      ]
    },

{
      id: 'basvuru',
      baslik: '10. Başvuru usulü',
      paragraflar: [
        'KVKK\'nın 11. maddesi kapsamındaki taleplerinizi yazılı olarak veya mevzuatta izin verilen elektronik yöntemlerle iletebilirsiniz. Elektronik posta ile başvuru yapmanız hâlinde, LocalKarar\'a daha önce bildirdiğiniz ve sistemimizde kayıtlı bulunan e-posta adresini kullanmanız gerekir. Bu yöntemle yapılacak başvurular kvkk@localkarar.com adresine gönderilebilir.'
      ],
      liste: [
        'Ad ve soyad; başvuru yazılı ise imza',
        'Türkiye Cumhuriyeti vatandaşları için T.C. kimlik numarası; yabancılar için uyruğu, pasaport numarası veya varsa kimlik numarası',
        'Tebligata esas yerleşim yeri veya iş yeri adresi',
        'Varsa bildirime esas e-posta adresi, telefon ve faks numarası',
        'Talebinizin konusu',
        'Talebinizle ilgili bilgi ve belgeler, varsa başvuruya eklenmelidir'
      ],
      son: [
        'Başvurularınız, talebin niteliğine göre en geç otuz gün içinde sonuçlandırılır ' +
        've size yazılı olarak veya elektronik ortamda bildirilir. İşlemin ayrıca bir ' +
        'maliyet gerektirmesi hâlinde Kurul\'ca belirlenen tarifedeki ücret alınabilir.',
        'Başvurunuz reddedilir, verilen cevabı yetersiz bulursanız veya süresinde cevap ' +
        'verilmezse Kişisel Verileri Koruma Kurulu\'na şikâyette bulunma hakkınız saklıdır.'
      ]
    },

    {
      id: 'guvenlik',
      baslik: '11. Alınan güvenlik tedbirleri',
      liste: [
        'Tüm trafiğin şifreli bağlantı (HTTPS) üzerinden taşınması',
        'Parolaların yalnızca kriptografik özet biçiminde saklanması',
        'Uygulamanın veritabanına gereken en düşük yetkiyle bağlanması',
        'Oturum anahtarlarının sınırlı ömürlü olması ve şüpheli kullanımda oturum ailesinin tümüyle geçersiz kılınması',
        'Giriş, kayıt ve şifre sıfırlama işlemlerinde hız sınırlaması',
        'Sunucuya doğrudan erişimin güvenlik duvarıyla kısıtlanması',
        'Yüklenen dosyaların tür ve içerik denetiminden geçirilmesi',
        'Düzenli veritabanı yedeği alınması'
      ]
    },

    {
      id: 'degisiklik',
      baslik: '12. Metindeki değişiklikler',
      paragraflar: [
        'Bu metin, uygulamada yapılan değişikliklere ve mevzuata uyum gereklerine göre ' +
        'güncellenebilir. Her güncelleme yeni bir sürüm numarasıyla yayımlanır.',
        'Onayınızın gerekli olduğu bir değişiklik yapıldığında, Ayarlar’daki onay ' +
        'bilgilerinde güncel metin gösterilir ve yeniden onayınız istenir. Sayfanın ' +
        'başındaki sürüm bilgisi, o an yürürlükte olan metni gösterir.'
      ]
    }
  ]
}
