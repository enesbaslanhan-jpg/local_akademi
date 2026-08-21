/*
 * GİZLİLİK VE KVKK AYDINLATMA METNİ
 *
 * Buradaki HER teknik iddia ölçülerek yazıldı (21.08.2026):
 *   - Sunucunun ülkesi: IP konumu + ters DNS (vps.ovh.net) → Fransa
 *   - Mistral saklama süresi ve eğitim ayarı: sağlayıcı panelinden
 *   - Çerez kullanılmadığı: canlıda Set-Cookie başlığı aranarak
 *   - İşlenen veri alanları: prisma/schema.prisma
 *
 * Bir alıcı, ülke ya da süre değişirse ÖNCE burası güncellenir, sonra
 * src/config/legal-documents.ts içindeki `version` artırılır. Sürüm
 * artınca mevcut kullanıcılardan yeniden onay isteniyor — mekanizma
 * `missingConsents` içinde, yeni kod gerekmiyor.
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
        'Uygulamayı nasıl kullandığınıza göre aşağıdaki veriler işlenebilir. Burada ' +
        'listelenmeyen bir veri kategorisi işlenmemektedir.'
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
          'Sektör, şehir, işletme aşaması, çalışan sayısı, hedefler ve sizin girdiğiniz ' +
          'finansal büyüklükler (aylık satış, aylık gider, nakit mevcudu, borç durumu).'
        ],
        [
          'İşletme kayıtları',
          'Gelir ve gider kayıtları, cari hesaplar, hatırlatmalar, yüklediğiniz belgeler ' +
          've bu belgelerden çıkarılan metin.'
        ],
        [
          'Kullanıcı içeriği',
          'AI Mentor ile yazışmalarınız, mentorun sizinle ilgili tuttuğu notlar, ' +
          'topluluk gönderileriniz ve yorumlarınız.'
        ],
        [
          'Öğrenme verileri',
          'Kurs kayıtlarınız, ders ilerlemeniz, quiz ve alıştırma sonuçlarınız.'
        ],
        ['Görsel', 'Yüklemeyi seçerseniz profil fotoğrafınız.'],
        [
          'İşlem güvenliği',
          'Sunucu erişim kayıtlarında IP adresi, tarayıcı bilgisi ve istek zamanı. ' +
          'Bu bilgiler veritabanında hesabınızla ilişkilendirilerek saklanmaz; ' +
          'yalnızca teknik günlük dosyalarında yer alır.'
        ]
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
            'İşletme profili, işletme kayıtları, öğrenme verileri',
            'Sözleşmenin ifası (m.5/2-c)'
          ],
          [
            'AI Mentor soru–cevap hizmetini sunmak',
            'Kullanıcı içeriği, işletme profili',
            'Sözleşmenin ifası (m.5/2-c)'
          ],
          [
            'Hesap güvenliğini sağlamak ve kötüye kullanımı önlemek',
            'Hesap ve güvenlik, işlem güvenliği',
            'Meşru menfaat (m.5/2-f)'
          ],
          [
            'Destek taleplerinizi karşılamak',
            'Kimlik, iletişim, talebin içeriği',
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
        'Üçüncü kaynaklardan kişisel veri toplanmamaktadır.'
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
            'AI Mentor\'a yazdığınız mesajlar ve mentora iletilen işletme bağlamı',
            'Yapay zekâ yanıtlarının üretilmesi'
          ],
          [
            'Resend',
            'İrlanda',
            'Ad ve e-posta adresi',
            'Doğrulama, şifre sıfırlama ve bildirim e-postaları'
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
        'Onayınızın gerekli olduğu bir değişiklik yapıldığında, uygulamayı kullanmaya ' +
        'devam edebilmeniz için güncel metni onaylamanız istenir. Sayfanın başındaki ' +
        'sürüm bilgisi, o an yürürlükte olan metni gösterir.'
      ]
    }
  ]
}
