import {
  FOUNDER_STAGES,
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
 * MESAFELİ HİZMET SÖZLEŞMESİ
 *
 * Ön Bilgilendirme Formu'ndan AYRI bir belge. İkisi aynı bilgileri
 * taşır ama işlevleri farklı: form sözleşme kurulmadan ÖNCE verilen
 * bilgidir, bu metin ise kurulan sözleşmenin kendisidir. Mevzuat
 * ikisini ayrı ayrı aradığı için tek belgede birleştirilmedi.
 *
 * 🔴 FİZİKSEL TESLİMAT DİLİ YOK.
 * Kargo, teslim süresi, ayıplı mal, iade gönderimi gibi kavramlar bu
 * hizmete uymuyor. Şablondan kopyalansaydı sözleşme var olmayan bir
 * süreci tarif ederdi.
 *
 * 🔴 Fiyat sayıları `config/billing.js`ten okunuyor — bkz.
 * `on-bilgilendirme.js` başlığındaki gerekçe.
 */

const ucretsizAy = FOUNDER_STAGES[0].months
const lansman = FOUNDER_STAGES.find(s => s.code === 'launch')

export default {
  giris:
    'Bu sözleşme, LocalKarar üyeliğinin elektronik ortamda satın alınmasına ilişkin ' +
    'şartları düzenler. Ödeme adımını tamamladığınızda bu sözleşme kurulmuş sayılır ' +
    've bir örneği hesabınıza tanımlı e-posta adresine iletilir.',

  bolumler: [
    {
      id: 'taraflar',
      baslik: '1. Taraflar',
      paragraflar: [
        'SATICI olarak anılan taraf aşağıda kimliği belirtilen gerçek kişidir.'
      ],
      tanimlar: saticiTanimlari(),
      son: [
        'ALICI olarak anılan taraf, LocalKarar hesabını oluşturan ve üyelik bedelini ' +
        'ödeyen kullanıcıdır. Alıcının adı ve iletişim bilgileri hesap kaydında yer alır.'
      ]
    },

    {
      id: 'konu',
      baslik: '2. Sözleşmenin konusu',
      paragraflar: [
        'Bu sözleşmenin konusu, Alıcı\'nın LocalKarar web uygulamasına üyelik hakkını ' +
        'elektronik ortamda satın alması ve tarafların bu ilişkiden doğan hak ve ' +
        'yükümlülükleridir.',
        'Sözleşmenin ayrılmaz parçaları: Ön Bilgilendirme Formu, Kullanım Koşulları, ' +
        'Gizlilik ve KVKK Aydınlatma Metni, Abonelik ve Faturalandırma Koşulları ile ' +
        'Teslimat, İptal ve İade Koşulları.'
      ]
    },

    {
      id: 'hizmet',
      baslik: '3. Hizmetin niteliği',
      paragraflar: [
        'Hizmet, tamamen elektronik ortamda sunulan bir yazılım kullanım hakkıdır. ' +
        'Fiziksel bir ürün gönderimi yoktur; kargo, teslimat süresi ve teslimat ' +
        'masrafı söz konusu değildir.',
        'Üyelik, uygulamanın Alıcı\'ya açık tüm modüllerine erişim sağlar. Hizmetin ' +
        'kapsamı ve sınırları Kullanım Koşulları metninde ayrıntılı olarak ' +
        'düzenlenmiştir.',
        'Uygulamadaki yapay zekâ destekli özelliklerin çıktıları bilgilendirme ' +
        'amaçlıdır; mali, hukuki veya vergisel danışmanlık niteliği taşımaz ve ' +
        'Alıcı\'nın kendi doğrulama sorumluluğunu ortadan kaldırmaz.'
      ]
    },

    {
      id: 'bedel',
      baslik: '4. Bedel ve ödeme',
      paragraflar: [
        'Tüm bedeller Türk Lirası cinsindendir ve vergiler dâhildir.'
      ],
      tablo: {
        basliklar: ['Dönem', 'Bedel'],
        satirlar: [
          [`İlk ${ucretsizAy} ay`, 'Ücretsiz'],
          [`Sonraki ${lansman.months} ay`, `${fiyatYaz(lansman.monthlyPrice)} / ay`],
          [`${nihaiFiyataGecisAyi()}. aydan itibaren (aylık ödemede)`, `${fiyatYaz(kuruculUyeFiyati())} / ay`],
          [`${nihaiFiyataGecisAyi()}. aydan itibaren (yıllık ödemede)`, `${fiyatYaz(yillikTutar())} / yıl`]
        ]
      },
      son: [
        `Yıllık ödemede on iki ay yerine ${12 - YEARLY_FREE_MONTHS} ay bedeli tahsil edilir.`,
        `Sözleşmenin kurulduğu anda tahsil edilecek ilk tutar ${fiyatYaz(ilkUcretliTutar())}'dir.`,
        'Ödemeler, ödeme kuruluşu PayTR aracılığıyla kredi kartı veya banka kartı ile ' +
        'alınır. Kart bilgileri PayTR\'nin güvenli ödeme çerçevesinde girilir; Satıcı ' +
        'sunucularına ulaşmaz ve Satıcı tarafından saklanmaz.',
        'ÜYELİK, SEÇİLEN DÖNEMİN SONUNDA SONA ERER. Otomatik yenileme yoktur ve ' +
        'Alıcı\'nın kartı saklanmaz; Satıcı, Alıcı\'nın başlatmadığı hiçbir tahsilat ' +
        'yapamaz. Alıcı üyeliğini sürdürmek isterse yeni dönemin bedelini kendisi ' +
        'öder. Dönemin bitiş tarihi, bitmeden önce Alıcı\'ya bildirilir. Ayrıntı ' +
        'Abonelik ve Faturalandırma Koşulları\'ndadır.'
      ]
    },

    {
      id: 'bedel-degisikligi',
      baslik: '5. Bedel değişikliği ve kurucu üye indirimi',
      paragraflar: [
        `Alıcı, Kurucu Üye Programı kapsamında, geçerli standart bedelin ` +
        `EN AZ %${kuruculIndirimYuzdesi()} altını öder. Bu indirim oranı üyelik sürdüğü sürece ` +
        'değişmez.',
        'İndirimin oransal olması, bedelin sabit olduğu anlamına gelmez. Standart bedel ' +
        'yükseldiğinde Alıcı\'nın ödeyeceği bedel de yükselir; ancak her zaman aynı ' +
        'oranda altında kalır.',
        'Bedel değişiklikleri, yürürlüğe girmeden önce Alıcı\'ya uygulama içi bildirim ' +
        've e-posta yoluyla duyurulur. Alıcı, yeni bedeli kabul etmemesi hâlinde ' +
        'üyeliğini bu sözleşmenin 7. maddesindeki koşullarla sona erdirebilir.',
        'Yürürlükteki dönemin bedeli, o dönem içinde değiştirilmez.'
      ]
    },

    {
      id: 'ifa',
      baslik: '6. İfa',
      paragraflar: [
        'Ödeme onaylandığı anda üyelik hakları Alıcı\'nın hesabında elektronik ortamda ' +
        'derhal aktive edilir. Ayrı bir teslimat işlemi ve bekleme süresi yoktur.',
        'Satıcı, hizmeti kesintisiz sunmak için makul çabayı gösterir. Planlı bakım ' +
        'çalışmaları önceden duyurulur.'
      ]
    },

    {
      id: 'fesih',
      baslik: '7. Sözleşmenin sona ermesi',
      paragraflar: [
        'Alıcı, üyeliğini dilediği zaman, uygulama içinden Ayarlar → Üyelik ve ' +
        'Faturalandırma bölümünden, gerekçe göstermeksizin ve Satıcı ile iletişime ' +
        'geçmeksizin sona erdirebilir.',
        'İptal hâlinde bedeli ödenmiş dönemin sonuna kadar erişim sürer; dönem sonunda ' +
        'üyelik kendiliğinden sona erer ve yeni bir tahsilat yapılmaz. Kullanılmayan ' +
        'günler için kısmi iade yapılmaz.',
        'Satıcı, Kullanım Koşulları\'nda sayılan yasak kullanımların gerçekleşmesi ' +
        'hâlinde üyeliği askıya alabilir veya sona erdirebilir. Bu durumda kalan döneme ' +
        'ilişkin bedel Alıcı\'ya iade edilir.',
        'Üyeliğin sona ermesi, Alıcı\'nın uygulamaya yüklediği verileri silmez. Veriler ' +
        'görüntülenebilir ve dışa aktarılabilir hâlde kalır; silme talebi ayrıca ' +
        'iletilebilir.'
      ]
    },

    {
      id: 'cayma',
      baslik: '8. Cayma hakkı',
      paragraflar: [
        'Mesafeli Sözleşmeler Yönetmeliği, elektronik ortamda anında ifa edilen ' +
        'hizmetleri cayma hakkının istisnaları arasında saymaktadır.',
        'Alıcı, ödeme ekranında, hizmetin derhal ifasına başlanmasını istediğine ve bu ' +
        'nedenle cayma hakkını kaybedeceğini bildiğine dair ayrı ve açık bir onay ' +
        'verir. Bu onay verilmeden ödeme alınmaz.',
        'Söz konusu onayın verilmesi ve ifaya başlanması ile birlikte Alıcı\'nın cayma ' +
        'hakkı sona erer. Bu durum, Alıcı\'nın 7. maddedeki iptal hakkını etkilemez.'
      ]
    },

    {
      id: 'kisisel-veri',
      baslik: '9. Kişisel verilerin işlenmesi',
      paragraflar: [
        'Tarafların bu sözleşme kapsamında işlediği kişisel veriler, Gizlilik ve KVKK ' +
        'Aydınlatma Metni\'nde açıklanan esaslara tabidir.',
        'Alıcı\'nın uygulamaya yüklediği, üçüncü kişilere ait kişisel veriler ' +
        'bakımından veri sorumlusu Alıcı\'dır; Satıcı veri işleyen sıfatıyla hareket ' +
        'eder. Ayrıntı Kullanım Koşulları\'nda düzenlenmiştir.'
      ]
    },

    {
      id: 'uyusmazlik',
      baslik: '10. Uyuşmazlık çözümü ve yetkili merci',
      paragraflar: [
        'Alıcı, talep ve şikâyetlerini 1. maddede belirtilen iletişim kanallarından ' +
        'iletebilir. Başvurular en geç otuz gün içinde yanıtlanır.',
        'Tüketici sıfatını taşıyan Alıcı, Gümrük ve Ticaret Bakanlığı\'nca her yıl ' +
        'belirlenen parasal sınırlar çerçevesinde, hizmeti satın aldığı veya ' +
        'ikametgâhının bulunduğu yerdeki Tüketici Hakem Heyetlerine ya da Tüketici ' +
        'Mahkemelerine başvurabilir.',
        'Tüketici sıfatını taşımayan Alıcı bakımından Ankara mahkemeleri ve icra ' +
        'daireleri yetkilidir.'
      ]
    },

    {
      id: 'yururluk',
      baslik: '11. Yürürlük',
      paragraflar: [
        'Bu sözleşme, Alıcı\'nın ödeme adımındaki onayları vermesi ve ödemenin ' +
        'onaylanması ile kurulur ve yürürlüğe girer.',
        'Sözleşme metninde yapılacak değişiklikler yürürlüğe girmeden önce Alıcı\'ya ' +
        'bildirilir; yürürlükteki dönem için kurulmuş sözleşmenin şartları ' +
        'değiştirilmez.'
      ]
    }
  ]
}
