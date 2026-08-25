/*
 * KULLANIM KOŞULLARI
 *
 * İki bölüm bu metnin ASIL yükünü taşıyor ve şablon metinlerde
 * genellikle bulunmaz:
 *
 *   5. AI çıktılarının doğası — ürün bir dil modeline soru soruyor ve
 *      yanıtı kullanıcıya gösteriyor. Yanıtların hatalı olabileceğini
 *      söylememek, üründe olmayan bir güvenilirlik vaat etmek olurdu.
 *   7. Üçüncü kişilerin verileri — kullanıcı cari hesap ve fatura
 *      girdiğinde MÜŞTERİSİNİN verisini işliyor. O veriler bakımından
 *      veri sorumlusu kullanıcının kendisi; bunun yazılı olması şart.
 *
 * Abonelik, ödeme ve reklam maddeleri BİLEREK YOK: böyle bir akış
 * bulunmuyor. Var olmayan bir ödeme için cayma hakkı yazmak yanlış
 * beyandır. Eklendiğinde ayrı bölüm yazılıp sürüm artırılacak.
 */

export default {
  giris:
    'Bu koşullar, LocalKarar uygulamasını kullanımınıza ilişkin karşılıklı hak ve ' +
    'yükümlülükleri düzenler. Hesap oluşturarak bu koşulları kabul etmiş olursunuz.',

  bolumler: [
    {
      id: 'taraflar',
      baslik: '1. Taraflar',
      paragraflar: [
        'Bu koşullar, uygulamayı işleten Enes Buğra Aslanhan (gerçek kişi, Ankara / ' +
        'Yenimahalle) ile uygulamayı kullanan siz arasında kurulur.',
        'İletişim: kvkk@localkarar.com'
      ]
    },

    {
      id: 'hizmet',
      baslik: '2. Hizmetin kapsamı',
      paragraflar: [
        'LocalKarar; küçük işletmelere yönelik kurslar, Hesaplamalar, adım adım Karar ' +
        'Araçları, işletme profili ve kayıt takibi, AI Mentor, resmî kaynaklardan ' +
        'derlenen haberler ve topluluk alanı sunar. Finansal model çalışmaları ayrı ' +
        'bir hizmet değil, Hesaplamalar içindeki ayrıntılı hesaplama akışlarıdır.',
        'Hizmet, olduğu hâliyle sunulur. Özellikler ürün gereksinimleri, güvenlik veya ' +
        'mevzuat nedeniyle değişebilir.'
      ]
    },

    {
      id: 'hesap',
      baslik: '3. Hesap ve güvenlik',
      liste: [
        'Kayıt sırasında verdiğiniz bilgilerin doğru ve güncel olması gerekir.',
        'Giriş bilgilerinizi korumak ve üçüncü kişilerle paylaşmamak sizin sorumluluğunuzdadır.',
        'Hesabınız üzerinden gerçekleşen işlemlerden siz sorumlusunuz.',
        'Yetkisiz bir erişimden şüphelenirseniz gecikmeden bildirmeniz gerekir.',
        'Bir hesabı birden çok kişinin paylaşması önerilmez; işletme çalışma alanına üye davet ederek ayrı hesaplarla çalışabilirsiniz.'
      ]
    },

    {
      id: 'danismanlik-degildir',
      baslik: '4. Hizmet danışmanlık değildir',
      paragraflar: [
        'Uygulamadaki eğitim içerikleri, hesaplama sonuçları, Karar Aracı çıktıları ve ' +
        'AI Mentor yanıtları genel bilgilendirme ve karar desteği amaçlıdır.',
        'Bunlar mali müşavirlik, muhasebe, vergi, hukuk veya yatırım danışmanlığı ' +
        'niteliğinde değildir ve yetkili bir meslek mensubundan alınacak danışmanlığın ' +
        'yerine geçmez.',
        'İşletmenize ilişkin kararların sorumluluğu size aittir. Önemli mali ve hukuki ' +
        'kararlar öncesinde yetkili bir meslek mensubuna danışmanız beklenir.'
      ]
    },

    {
      id: 'yapay-zeka',
      baslik: '5. Yapay zekâ çıktılarının niteliği',
      paragraflar: [
        'AI Mentor, bir dil modeli tarafından üretilen yanıtlar sunar. Dil modelleri ' +
        'kendinden emin görünen ancak hatalı, eksik veya güncelliğini yitirmiş bilgi ' +
        'üretebilir.',
        'Hesaplamalar bölümündeki sayısal sonuçlar, kullanıcı girdilerini tanımlı ' +
        'formül ve kurallarla işleyen deterministik uygulama motoru tarafından üretilir. ' +
        'AI Mentor bu kayıtlı sonuçları yorumlayabilir ve açıklayabilir; deterministik ' +
        'sonucun yerine yeni bir kesin hesap üretmez.',
        'Uygulama, yanıtı mümkün olduğunda kendi içerik kütüphanesine dayandırır ve ' +
        'kaynağı gösterir. Buna rağmen doğruluk garanti edilmez.',
        'Bir yanıta dayanarak işlem yapmadan önce, özellikle rakam, oran, süre ve ' +
        'mevzuat içeren bilgileri resmî kaynağından doğrulamanız gerekir.',
        'Yapay zekâ yanıtları, 4. maddedeki danışmanlık istisnasına aynen tabidir.'
      ]
    },

    {
      id: 'kullanici-icerigi',
      baslik: '6. Yüklediğiniz içerik',
      paragraflar: [
        'Uygulamaya yüklediğiniz belgeler, girdiğiniz kayıtlar ve paylaştığınız ' +
        'gönderiler üzerindeki haklar sizde kalır.',
        'Hizmeti sunabilmek için bu içeriği saklama, işleme ve size geri gösterme ' +
        'yetkisi verirsiniz. Bu yetki hizmetin sunulmasıyla sınırlıdır; içeriğiniz ' +
        'pazarlama amacıyla kullanılmaz ve yapay zekâ modeli eğitiminde kullanılmaz.'
      ]
    },

    {
      id: 'ucuncu-kisi-verileri',
      baslik: '7. Üçüncü kişilere ait veriler — sizin sorumluluğunuz',
      paragraflar: [
        'Cari hesap oluşturduğunuzda veya fatura benzeri belge yüklediğinizde, ' +
        'müşterinize, tedarikçinize ya da çalışanınıza ait kişisel verileri uygulamaya ' +
        'girmiş olursunuz.',
        'Bu veriler bakımından KVKK anlamında veri sorumlusu sizsiniz. LocalKarar ' +
        'yalnızca veri işleyen sıfatıyla, sizin talimatınızla hareket eder.'
      ],
      liste: [
        'Bu verileri işlemek için geçerli bir hukuki sebebe sahip olmak sizin yükümlülüğünüzdür.',
        'İlgili kişileri KVKK uyarınca aydınlatmak sizin yükümlülüğünüzdür.',
        'Size yöneltilecek silme, düzeltme veya bilgi taleplerini karşılamak sizin yükümlülüğünüzdür; uygulama bunun için gerekli araçları sunar.',
        'Özel nitelikli kişisel verileri (sağlık, ceza mahkûmiyeti, biyometrik veri gibi) uygulamaya girmemeniz gerekir; uygulama bu tür verileri işlemek üzere tasarlanmamıştır.'
      ]
    },

    {
      id: 'yasak-kullanim',
      baslik: '8. Yasak kullanımlar',
      paragraflar: ['Aşağıdaki davranışlar hizmetin kullanım koşullarına aykırıdır:'],
      liste: [
        'Hukuka aykırı, yanıltıcı veya üçüncü kişilerin haklarını ihlal eden içerik paylaşmak',
        'Başkasının hesabına yetkisiz erişmeye çalışmak',
        'Uygulamanın güvenlik önlemlerini aşmaya, hız sınırlarını dolanmaya veya sistemi aşırı yüklemeye yönelik girişimlerde bulunmak',
        'Uygulamadan otomatik yöntemlerle toplu veri çekmek',
        'Yapay zekâ asistanını, hizmetin amacı dışında veya zararlı içerik üretmek için kullanmaya çalışmak',
        'Uygulamayı, sahibi olmadığınız kişisel verileri hukuka aykırı biçimde işlemek için kullanmak'
      ]
    },

    {
      id: 'topluluk',
      baslik: '9. Topluluk kuralları ve moderasyon',
      paragraflar: [
        'Topluluk alanı, benzer ölçekte işletme yürüten kişilerin deneyim paylaştığı bir ' +
        'alandır. Paylaşımlarınızın hukuka uygun, özgün ve saygılı olması beklenir.',
        'Paylaşımlar ÖN İNCELEMEDEN GEÇMEZ; yazdığınız anda yayımlanır ve diğer ' +
        'kullanıcılar tarafından görülebilir hâle gelir. Denetim sonradan, şikâyet ' +
        'üzerine yapılır. Bu nedenle paylaştığınız içeriğin sorumluluğu size aittir.',
        'Kendi paylaşımınızı istediğiniz zaman kaldırabilirsiniz. Kurallara aykırı ' +
        'gönderileri yönetim de kaldırabilir; tekrar eden ihlallerde hesabın topluluk ' +
        'erişimi kısıtlanabilir.',
        'Bir paylaşımı kaldırdığınızda gönderi listelerden düşer ve içeriği başka ' +
        'kullanıcılara gösterilmez. Şikâyet ve denetim kayıtlarının bütünlüğü için ' +
        'kayıt sistemde saklanmaya devam eder.',
        'Diğer kullanıcıların paylaşımlarına yanıt yazabilir, onları beğenebilir, ' +
        'alıntılayabilir veya kendinize kaydedebilirsiniz. Yanıt ve alıntılarınız da ' +
        'birer paylaşımdır ve aynı kurallara tabidir. Bir paylaşıma verdiğiniz yanıt, ' +
        'o paylaşım sonradan kaldırılsa dahi sizin içeriğiniz olarak yayında kalır.',
        'Beğenileriniz gönderi üzerinde toplu sayı olarak görünür. Kaydettikleriniz ' +
        'yalnızca size özeldir ve başka kullanıcılara gösterilmez.',
        'Topluluk gönderileri başka kullanıcılar tarafından görülebilir. Paylaşmak ' +
        'istemediğiniz işletme bilgilerini bu alana yazmayınız.',
        'ÖZEL MESAJLAŞMA: Diğer üyelerle birebir ya da grup hâlinde yazışabilirsiniz. ' +
        'Bu mesajlar diğer topluluk üyelerine gösterilmez, ancak UÇTAN UCA ŞİFRELİ ' +
        'DEĞİLDİR: içerik sunucuda saklanır ve teknik olarak okunabilir durumdadır. ' +
        'Yönetim bu içeriğe yalnızca bir şikâyet incelemesi gerektirdiğinde erişir. ' +
        'Bu nedenle özel mesajları da gizli bir kanal gibi kullanmayınız.',
        'ENGELLEME: Bir kullanıcıyı engellediğinizde o kullanıcı size mesaj ' +
        'gönderemez, profilinizi ve paylaşımlarınızı göremez; siz de onunkileri ' +
        'görmezsiniz. Engelleme kaydı, engeli kaldırana kadar sistemde tutulur.',
        'Bir kullanıcıyı şikâyet edebilirsiniz. Şikâyet kayıtları, aynı kişi hakkında ' +
        'tekrar eden bildirimlerin değerlendirilebilmesi için denetim izi olarak ' +
        'saklanır.'
      ]
    },

    {
      id: 'gelen-kutusu',
      baslik: '10. İşletmenize özel gelen e-posta kutusu',
      paragraflar: [
        'İşletme ayarlarından, size özel bir e-posta adresi oluşturabilirsiniz. Bu ' +
        'adrese gönderdiğiniz faturalar ve belgeler, uygulamaya elle yüklenmiş gibi ' +
        'işlenir ve ONAYINIZI BEKLEYEN kayıt önerisi olarak düşer. Hiçbir kayıt siz ' +
        'onaylamadan kesinleşmez.',
        'Bu adres VARSAYILAN OLARAK KAPALIDIR; yalnızca siz açtığınızda çalışır ve ' +
        'istediğiniz zaman kapatabilir ya da yenileyebilirsiniz.',
        'Adrese iki grup gönderim yapabilir: (a) çalışma alanınızın üyeleri, uygulamada ' +
        'doğrulanmış kendi e-posta adreslerinden; (b) GÜVENİLİR GÖNDEREN olarak ' +
        'kendi elinizle eklediğiniz adresler. Bu liste varsayılan olarak BOŞTUR; siz ' +
        'adres eklemedikçe yalnızca (a) geçerlidir. Bu iki grubun dışından gelen ' +
        'postalar işlenmez ve gönderene bilgi verilmeden atılır.',
        'Güvenilir gönderen listesi, faturaları kendi e-posta kutunuzdan otomatik ' +
        'yönlendirmenizi mümkün kılar: yönlendirilen bir postada gönderen adresi ' +
        'sizinki değil, faturayı düzenleyenin adresi olarak kalır. Listeye eklediğiniz ' +
        'her adresi, o adresten gelecek belgeleri kabul etmeyi kabul etmiş sayılırsınız; ' +
        'listeyi istediğiniz zaman görebilir ve adres çıkarabilirsiniz.',
        'Listede olan bir adresten gelse dahi, postanın gerçekten o adresten geldiği ' +
        'teknik olarak (DKIM/SPF) doğrulanamazsa posta işlenmez.',
        'Adresi üçüncü kişilerle paylaşmamanız önerilir. Adresin başkalarının eline ' +
        'geçmesi hâlinde ayarlardan yenileyerek eski adresi geçersiz kılabilirsiniz.',
        'Bu adrese gönderdiğiniz belgeler tedarikçilerinize ve müşterilerinize ait ' +
        'kişisel veriler taşıyabilir. Bu veriler bakımından 7. bölümdeki taahhütleriniz ' +
        'aynen geçerlidir.'
      ]
    },

    {
      id: 'pazaryeri-baglantisi',
      baslik: '11. Pazaryeri mağaza bağlantısı',
      paragraflar: [
        'İşletme ayarlarından pazaryeri mağazanızı (Trendyol, Hepsiburada, n11, ' +
        'Shopify) bağlayabilirsiniz. Bu bağlantı VARSAYILAN OLARAK KURULU DEĞİLDİR; ' +
        'yalnızca siz kurarsanız çalışır ve istediğiniz zaman kaldırabilirsiniz.',
        'Bağlantıyı kurarken verdiğiniz API anahtarı ve erişim bilgileri ŞİFRELENEREK ' +
        'saklanır, hiçbir ekranda ve hiçbir API cevabında geri gösterilmez.',
        'Bağlantıyı kurma yetkisinin size ait olduğunu ve ilgili pazaryerinin kendi ' +
        'kullanım koşullarına aykırı davranmadığınızı beyan edersiniz. Pazaryeri ile ' +
        'aranızdaki ilişki LocalKarar’ın tarafı olduğu bir sözleşme değildir.',
        'Çekilen siparişler ALICILARINIZIN ADINI taşır. Bu veriler bakımından 7. ' +
        'bölümdeki taahhütleriniz aynen geçerlidir.',
        'Siparişlerden ÜRETİLEN kayıt önerileri ONAYINIZI BEKLER; hiçbir kayıt siz ' +
        'onaylamadan işletme takibinize eklenmez.',
        'Pazaryerinden gelen verinin doğruluğu ilgili pazaryerinin sorumluluğundadır. ' +
        'LocalKarar bu veriyi olduğu gibi gösterir; muhasebe ve beyan yükümlülükleriniz ' +
        'bakımından resmî kaynak pazaryerinin kendi kayıtlarıdır.'
      ]
    },

    {
      id: 'fikri-mulkiyet',
      baslik: '12. Fikri mülkiyet',
      paragraflar: [
        'Uygulamanın arayüzü, yazılımı, eğitim içerikleri, karar araçları ve hesaplama ' +
        'şablonları üzerindeki haklar saklıdır.',
        'İçerikleri kendi işletmeniz için kullanabilirsiniz. Çoğaltmak, yeniden ' +
        'yayımlamak veya ticari olarak dağıtmak yazılı izin gerektirir.',
        'Resmî kaynaklardan derlenen haber özetlerinde kaynak gösterilir; asıl metnin ' +
        'hakları ilgili kuruma aittir.'
      ]
    },

    {
      id: 'hizmet-degisiklikleri',
      baslik: '13. Hizmette değişiklik, askıya alma ve sona erdirme',
      paragraflar: [
        'Özellikler eklenebilir, değiştirilebilir veya kaldırılabilir. Kullanımınızı ' +
        'esaslı biçimde etkileyen değişiklikler uygun kanallardan duyurulur.',
        'Bu koşulların ihlali hâlinde hesabınız geçici olarak askıya alınabilir veya ' +
        'sona erdirilebilir. Böyle bir durumda, hukuki bir engel bulunmadıkça gerekçe ' +
        'bildirilir ve verilerinizi dışa aktarmanız için makul süre tanınır.'
      ]
    },

    {
      id: 'sorumluluk',
      baslik: '14. Sorumluluğun sınırı',
      paragraflar: [
        'Hizmet kesintisiz ve hatasız olacağı taahhüt edilmeden sunulur. Bakım, ' +
        'sağlayıcı arızası veya güvenlik gereklilikleri nedeniyle geçici kesintiler ' +
        'yaşanabilir.',
        'Uygulamadaki bilgilere veya yapay zekâ yanıtlarına dayanılarak alınan işletme ' +
        'kararlarının sonuçlarından sorumluluk kabul edilmez.',
        'Bu maddedeki sınırlamalar, kanunen sınırlandırılamayacak sorumluluk hâllerini ' +
        've tüketici mevzuatından doğan haklarınızı etkilemez.'
      ]
    },

    {
      id: 'hesap-sonu',
      baslik: '15. Hesabınızı sona erdirmeniz',
      paragraflar: [
        'Hesabınızı istediğiniz zaman Ayarlar sayfasından silebilirsiniz.',
        'Tek sahibi olduğunuz bir işletme çalışma alanı varsa, önce başka bir üyeyi ' +
        'sahip yapmanız gerekir.',
        'Silme işleminden sonra verilerinize ne olduğu Gizlilik ve KVKK Aydınlatma ' +
        'Metni’nin saklama bölümünde açıklanmıştır.'
      ]
    },

    {
      id: 'uygulanacak-hukuk',
      baslik: '16. Uygulanacak hukuk ve yetkili yargı yeri',
      paragraflar: [
        'Bu koşullara Türk hukuku uygulanır.',
        'Uyuşmazlıklarda Ankara mahkemeleri ve icra daireleri yetkilidir. Tüketici ' +
        'sıfatını taşıyorsanız, tüketici hakem heyetlerine ve tüketici mahkemelerine ' +
        'başvuru hakkınız saklıdır.'
      ]
    },

    {
      id: 'yururluk',
      baslik: '17. Yürürlük ve değişiklikler',
      paragraflar: [
        'Bu koşullar, hesabınızı oluşturduğunuz anda yürürlüğe girer.',
        'Koşullar güncellendiğinde yeni bir sürüm numarasıyla yayımlanır; Ayarlar’daki ' +
        'onay bilgilerinde güncel metin gösterilir ve yeniden onayınız istenir. Sayfanın ' +
        'başındaki sürüm bilgisi, o an yürürlükte olan metni gösterir.'
      ]
    }
  ]
}
