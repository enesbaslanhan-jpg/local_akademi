import {
  FOUNDER_STAGES,
  TRIAL_DAYS,
  YEARLY_FREE_MONTHS,
  kuruculUyeFiyati,
  kuruculIndirimYuzdesi,
  ilkUcretliTutar,
  nihaiFiyataGecisAyi,
  yillikTutar,
  fiyatYaz,
} from '@/config/billing'
import { saticiTanimlari } from './satici-kimligi'

/*
 * ÖN BİLGİLENDİRME FORMU
 *
 * Mesafeli Sözleşmeler Yönetmeliği, sözleşme kurulmadan ÖNCE
 * tüketiciye belirli bilgilerin verilmesini şart koşuyor. Bu form o
 * yükümlülüğü karşılıyor ve ödeme ekranından bağlantılı.
 *
 * 🔴 FİYAT SAYILARI ELLE YAZILMADI.
 * Hepsi `config/billing.js`ten okunuyor. Metne `299` yazsaydık,
 * standart fiyat değiştiği gün sözleşme yanlış beyan olurdu ve bunu
 * kimse fark etmezdi.
 *
 * ✅ OTOMATİK YENİLEME yazılı (30.08.2026 kararı). Ayrıntısı
 * Abonelik ve Faturalandırma Koşulları'nda; buradaki özet onunla
 * birebir aynı kalmalı.
 *
 * ⚠️ CAYMA HAKKI bölümü, ödeme ekranındaki AYRI onay kutusuna
 * dayanıyor (ürün sahibi kararı, 29.08.2026). O kutu kaldırılırsa bu
 * bölüm de geçersizleşir — ikisi birlikte değişmeli.
 */

const ucretsizAy = FOUNDER_STAGES[0].months
const lansman = FOUNDER_STAGES.find(s => s.code === 'launch')

export default {
  /*
   * ⚠️ Önceki hâli "ödeme adımına geçtiğinizde bu formu okuduğunuzu ve
   * kabul ettiğinizi beyan etmiş olursunuz" diyordu.
   *
   * İki sorunu vardı. Birincisi zayıftı: sayfaya geçmeyi onay saymak,
   * mevzuatın aradığı açık onay değil. İkincisi ve daha önemlisi
   * YANLIŞTI — ödeme ekranında gerçekten AYRI onay kutuları var ve
   * işaretlenmeden düğme açılmıyor. Metin, yaptığımızdan azını
   * söylüyordu.
   */
  giris:
    'Bu form, LocalKarar üyeliğini satın almadan önce bilmeniz gereken bilgileri ' +
    'içerir. Mesafeli Sözleşmeler Yönetmeliği uyarınca, sözleşme kurulmadan önce ' +
    'size sunulur. Ödeme ekranında bu formu ve Mesafeli Hizmet Sözleşmesi\'ni ' +
    'okuduğunuza dair ayrı bir onay kutusu işaretlemeniz istenir; onay verilmeden ' +
    'ödeme alınmaz.',

  bolumler: [
    {
      id: 'satici',
      baslik: '1. Satıcının kimliği ve iletişim bilgileri',
      paragraflar: [
        'LocalKarar, aşağıda kimliği belirtilen gerçek kişi tarafından işletilmektedir. ' +
        'Her türlü soru, talep ve şikâyetinizi aşağıdaki kanallardan iletebilirsiniz.'
      ],
      tanimlar: saticiTanimlari(),
      son: [
        'Şikâyetleriniz, tarafımıza ulaştığı tarihten itibaren en geç otuz gün içinde ' +
        'yanıtlanır.'
      ]
    },

    {
      id: 'hizmet',
      baslik: '2. Hizmetin temel nitelikleri',
      paragraflar: [
        'LocalKarar, küçük işletme sahiplerine yönelik bir web uygulamasıdır. Üyelik, ' +
        'uygulamanın tüm modüllerine erişim hakkı verir.',
        'Hizmet tamamen elektronik ortamda sunulur. Fiziksel bir ürün gönderimi ' +
        'yoktur; bu nedenle kargo, teslimat süresi ve teslimat masrafı söz konusu ' +
        'değildir.'
      ],
      liste: [
        'Karar Araçları — bir kararı vermeden önce rakamların ne söylediğini gösterir',
        'İşletme Takibi — çek, senet, fatura ve tahsilat kayıtları tek yerde',
        'Hesaplamalar ve finansal modeller',
        'AI Mentor — kendi işletme verinizle konuşur',
        'Kurslar ve pratik içerik',
        'Pazaryeri entegrasyonları (Trendyol, Hepsiburada, N11, Shopify)',
        'Topluluk'
      ],
      son: [
        'Yapay zekâ destekli özelliklerin çıktıları bilgilendirme amaçlıdır ve mali, ' +
        'hukuki veya vergisel danışmanlık niteliği taşımaz. Ayrıntı için Kullanım ' +
        'Koşulları metnine bakınız.'
      ]
    },

    {
      id: 'fiyat',
      baslik: '3. Hizmetin bedeli ve ödeme planı',
      paragraflar: [
        'Tüm tutarlar Türk Lirası cinsindendir ve vergiler dâhildir. Aşağıdaki plan ' +
        'Kurucu Üye Programı kapsamındadır.'
      ],
      tablo: {
        basliklar: ['Dönem', 'Aylık bedel', 'Açıklama'],
        satirlar: [
          [
            `İlk ${ucretsizAy} ay`,
            'Ücretsiz',
            'Kart bilgisi istenmez, ödeme alınmaz'
          ],
          [
            `Sonraki ${lansman.months} ay`,
            fiyatYaz(lansman.monthlyPrice),
            'Lansman dönemi bedeli'
          ],
          [
            `${nihaiFiyataGecisAyi()}. aydan itibaren`,
            fiyatYaz(kuruculUyeFiyati()),
            `Kurucu üye bedeli — standart bedelin en az %${kuruculIndirimYuzdesi()} altı`
          ]
        ]
      },
      son: [
        `Yıllık ödemeyi seçmeniz hâlinde on iki ay yerine ${12 - YEARLY_FREE_MONTHS} ay ` +
        `bedeli tahsil edilir; yıllık toplam ${fiyatYaz(yillikTutar())} olur.`,
        `Ödeme adımına geçtiğinizde tahsil edilecek ilk tutar ${fiyatYaz(ilkUcretliTutar())}'dir. ` +
        'Ödeme ekranında bugün ödenecek tutar, bir sonraki tahsilatın tarihi ve tutarı ' +
        'ile uzun vadeli bedel ayrı ayrı gösterilir.'
      ]
    },

    {
      id: 'indirim',
      baslik: '4. Kurucu üye indiriminin niteliği',
      paragraflar: [
        `Kurucu üye bedeli sabitlenmemiş, standart bedele BAĞLANMIŞTIR. Üyeliğiniz ` +
        `sürdüğü sürece, geçerli standart bedelin EN AZ %${kuruculIndirimYuzdesi()} altını ` +
        `ödersiniz. Tutar aşağı yuvarlandığı için gerçek indirim biraz daha yüksek ` +
        `olabilir.`,
        'Bunun anlamı şudur: standart bedel ileride yükselirse sizin bedeliniz de ' +
        'yükselir, ancak her zaman aynı oranda altında kalır. Kurucu üye, bedel ' +
        'artışlarından muaf değildir; diğer üyelere göre daha az etkilenir.',
        'Bedel değişikliği yürürlüğe girmeden önce tarafınıza bildirim yapılır. ' +
        'Bildirimden sonra üyeliğinizi sürdürmemeyi tercih ederseniz, aşağıdaki ' +
        'koşullarla iptal edebilirsiniz.'
      ]
    },

    {
      id: 'odeme',
      baslik: '5. Ödeme şekli',
      paragraflar: [
        'Ödemeler, ödeme kuruluşu PayTR aracılığıyla kredi kartı veya banka kartı ile ' +
        'alınır. Kart bilgileriniz PayTR\'nin kendi güvenli ödeme çerçevesinde girilir; ' +
        'LocalKarar sunucularına ulaşmaz ve tarafımızca saklanmaz.',
        'Tarafımızca saklanan ödeme verileri işlem tutarı, işlem tarihi, sipariş ' +
        'numarası, işlem durumu ve kartın maskelenmiş son hanelerinden ibarettir. ' +
        'Ayrıntı için Gizlilik ve KVKK Aydınlatma Metni\'ne bakınız.'
      ]
    },

    {
      id: 'ifa',
      baslik: '6. İfa süresi',
      paragraflar: [
        'Ödemeniz onaylandığı anda üyelik haklarınız LocalKarar hesabınızda elektronik ' +
        'ortamda derhal aktive edilir. Beklenmesi gereken bir teslimat süresi yoktur.',
        `Ücretsiz kullanım dönemi ${TRIAL_DAYS} gündür ve ödeme yapılmadan başlar.`
      ]
    },

    {
      id: 'cayma',
      baslik: '7. Cayma hakkı',
      paragraflar: [
        'Mesafeli Sözleşmeler Yönetmeliği, elektronik ortamda anında ifa edilen ' +
        'hizmetleri cayma hakkının istisnaları arasında saymaktadır.',
        'LocalKarar üyeliği, ödeme onaylandığı anda ifa edilmeye başlanır. Bu nedenle ' +
        'ödeme ekranında, hizmetin derhal ifasına başlanmasını istediğinize ve bu ' +
        'nedenle cayma hakkınızı kaybedeceğinizi bildiğinize dair AYRI bir onay ' +
        'vermeniz istenir.',
        'Bu onayı vermediğiniz sürece ödeme alınmaz. Onayı verdiğinizde, ifaya ' +
        'başlanmış olması nedeniyle cayma hakkınız sona erer.',
        'Cayma hakkınızın sona ermesi, üyeliğinizi iptal etme hakkınızı ortadan ' +
        'kaldırmaz. İptal koşulları için Teslimat, İptal ve İade Koşulları metnine ' +
        'bakınız.'
      ]
    },

    {
      id: 'sure',
      baslik: '8. Sözleşmenin süresi ve sona ermesi',
      paragraflar: [
        'Üyelik belirsiz sürelidir ve seçtiğiniz dönem (aylık veya yıllık) boyunca ' +
        'geçerlidir.',
        'ÜYELİĞİNİZ DÖNEM SONUNDA SONA ERER. Otomatik yenileme yoktur ve kartınız ' +
        'saklanmaz; sizin başlatmadığınız bir tahsilat yapılmaz. Dönemin bitiş ' +
        'tarihi, bitmeden önce size bildirilir.',
        'Üyeliğinizi sürdürmek isterseniz, Ayarlar → Üyelik ve Faturalandırma ' +
        'bölümünden yeni dönemin bedelini kendiniz ödersiniz.',
        'Üyeliği bitirmek için ayrıca bir işlem yapmanız, tarafımızla iletişime ' +
        'geçmeniz veya gerekçe bildirmeniz gerekmez; ödeme yapmadığınızda üyelik ' +
        'dönem sonunda sona erer.',
        'Bedeli ödenmiş dönemin sonuna kadar erişiminiz sürer. Sonrasında hesabınız ' +
        'salt okunur moda geçer; verileriniz silinmez, görüntülenebilir ve dışa ' +
        'aktarılabilir hâlde kalır.'
      ]
    },

    {
      id: 'uyusmazlik',
      baslik: '9. Şikâyet ve uyuşmazlık çözümü',
      paragraflar: [
        'Talep ve şikâyetlerinizi yukarıdaki iletişim kanallarından iletebilirsiniz.',
        'Tüketici sıfatını taşıyorsanız, Gümrük ve Ticaret Bakanlığı\'nca her yıl ' +
        'belirlenen parasal sınırlar çerçevesinde, hizmeti satın aldığınız veya ' +
        'ikametgâhınızın bulunduğu yerdeki Tüketici Hakem Heyetlerine veya Tüketici ' +
        'Mahkemelerine başvurma hakkınız saklıdır.'
      ]
    }
  ]
}
