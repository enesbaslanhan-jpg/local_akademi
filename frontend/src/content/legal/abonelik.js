import {
  FOUNDER_STAGES,
  STANDARD_MONTHLY_PRICE,
  TRIAL_DAYS,
  YEARLY_FREE_MONTHS,
  kuruculUyeFiyati,
  kuruculIndirimYuzdesi,
  nihaiFiyataGecisAyi,
  yillikTutar,
  yillikKazanc,
  fiyatYaz,
} from '@/config/billing'

/*
 * ABONELİK VE FATURALANDIRMA KOŞULLARI
 *
 * 🔴 STANDART BEDEL BU METİNDE AÇIKÇA YAZILI.
 *
 * Fiyat sayfasında bilerek gösterilmiyor (üstü çizili e-ticaret dili
 * reddedildi) ama burada yazılmak ZORUNDA: kurucu üyeye verilen taahhüt
 * bir oran ve oranın neye göre ölçüldüğü yazılmadan doğrulanamaz.
 * "Standart bedelin %40 altı" cümlesi, standart bedel gizliyken
 * ölçülemez bir vaattir.
 *
 * ✅ OTOMATİK YENİLEME KARARI VERİLDİ (30.08.2026, ürün sahibi).
 *
 * Bu dosya uzun süre "otomatik yenilenir denmiyor, karar verilmedi"
 * diyordu — ama metnin geri kalanı ("sonraki tahsilat", "tahsilat
 * gerçekleşmezse", "iptal edilince yeni tahsilat yapılmaz") otomatiği
 * zaten İMA EDİYORDU. Söylemeden ima etmek üç seçenek arasında en
 * kötüsüydü: kullanıcı ne olacağını bilmiyor, metin de kendi içinde
 * tutarsız kalıyordu.
 *
 * 🔴 BU BİR YETENEK BAĞIMLILIĞI TAŞIYOR.
 * Kayıtlı kartla tekrarlayan tahsilat, PayTR'de ayrı bir yetki (kart
 * saklama + Non-3D). Ödeme entegrasyonu yazılırken bu yetkinin
 * gerçekten verildiği DOĞRULANMALI. Verilmezse 4. bölüm elle
 * yenilemeye göre yeniden yazılıp sürüm artırılacak — metnin
 * yetenekten önce yayımlanması bu riski taşıyor ve bilinçli.
 *
 * 🔴 Fiyatların hiçbiri elle yazılmadı; hepsi `config/billing.js`ten.
 */

const ucretsizAy = FOUNDER_STAGES[0].months
const lansman = FOUNDER_STAGES.find(s => s.code === 'launch')

export default {
  giris:
    'Bu metin, LocalKarar üyeliğinin bedelini, dönemlerini, bedel değişikliklerinin ' +
    'nasıl uygulanacağını ve faturalandırmayı açıklar. Kullanım Koşulları ve Mesafeli ' +
    'Hizmet Sözleşmesi ile birlikte okunur.',

  bolumler: [
    {
      id: 'plan',
      baslik: '1. Kurucu Üye Programı',
      paragraflar: [
        'LocalKarar tek bir üyelik planı sunar. Farklı özellik paketleri ya da ' +
        'kademeli sürümler yoktur; her üye uygulamanın tamamına erişir.',
        'Erken dönem kullanıcıları Kurucu Üye Programı kapsamındadır. Program, ' +
        'aşağıdaki aşamalardan oluşur.'
      ],
      tablo: {
        basliklar: ['Aşama', 'Süre', 'Aylık bedel'],
        satirlar: [
          ['Ücretsiz kullanım', `${ucretsizAy} ay`, 'Ücretsiz'],
          ['Lansman dönemi', `${lansman.months} ay`, fiyatYaz(lansman.monthlyPrice)],
          ['Kurucu üye bedeli', 'Süresiz', fiyatYaz(kuruculUyeFiyati())]
        ]
      },
      son: [
        `Kurucu üye bedeli ${nihaiFiyataGecisAyi()}. aydan itibaren geçerlidir.`
      ]
    },

    {
      id: 'indirim',
      baslik: '2. Kurucu üye indiriminin niteliği',
      paragraflar: [
        `LocalKarar\'ın standart aylık bedeli ${fiyatYaz(STANDARD_MONTHLY_PRICE)}\'dir. ` +
        `Kurucu üye, bu bedelin EN AZ %${kuruculIndirimYuzdesi()} altını öder. ` +
        `Tutar tam sayıya aşağı yuvarlandığı için gerçek indirim biraz daha ` +
        `yüksek olabilir; hiçbir koşulda bu oranın altına düşmez.`,
        'İndirim ORANSALDIR ve üyelik sürdüğü sürece değişmez. Bedelin kendisi ' +
        'sabitlenmiş değildir.',
        'Bunun pratik sonucu şudur: standart bedel ileride yükselirse kurucu üyenin ' +
        'bedeli de yükselir, ancak her zaman aynı oranda altında kalır. Kurucu üye ' +
        'bedel artışlarından muaf değildir; diğer üyelere göre daha az etkilenir.',
        'Bu ayrım, üyeye verilen taahhüdün tam karşılığıdır ve uygulama içindeki ' +
        'metinlerle aynıdır.'
      ]
    },

    {
      id: 'donem',
      baslik: '3. Tahsilat dönemi',
      paragraflar: [
        'Üye, ödeme sırasında aylık veya yıllık tahsilat dönemi seçer.',
        `Yıllık dönem seçildiğinde on iki ay yerine ${12 - YEARLY_FREE_MONTHS} ay bedeli ` +
        `tahsil edilir; yıllık toplam ${fiyatYaz(yillikTutar())} olur ve yılda ` +
        `${fiyatYaz(yillikKazanc())} tasarruf edilir.`,
        'Dönem seçimi, kurucu üye bedelinin geçerli olduğu aşamadan itibaren ' +
        'uygulanır. Lansman dönemi bedeli her hâlükârda aylık tahsil edilir.',
        'Tahsilat dönemi, sonraki dönem başlangıcından önce Ayarlar → Üyelik ve ' +
        'Faturalandırma bölümünden değiştirilebilir. Değişiklik yürürlükteki dönemi ' +
        'etkilemez.'
      ]
    },

    {
      id: 'yenileme',
      baslik: '4. Otomatik yenileme',
      paragraflar: [
        'Üyeliğiniz, siz iptal etmediğiniz sürece seçtiğiniz dönemin sonunda ' +
        'KENDİLİĞİNDEN YENİLENİR ve kayıtlı ödeme yönteminizden otomatik olarak ' +
        'tahsil edilir. Aylık dönem seçtiyseniz her ay, yıllık dönem seçtiyseniz ' +
        'her yıl aynı gün tahsilat yapılır.',
        'Yenilemenin yapılabilmesi için kartınız, ödeme kuruluşu PayTR nezdinde ' +
        'saklanır. Kart numarası ve güvenlik kodu LocalKarar sunucularına ULAŞMAZ; ' +
        'tarafımızda yalnızca kartın maskelenmiş son haneleri ve PayTR tarafından ' +
        'verilen bir referans tutulur.',
        'Kartınızın saklanmasına ve otomatik tahsilata, ödeme ekranında AYRI bir ' +
        'onay kutusu işaretleyerek izin verirsiniz. Bu onayı vermezseniz üyelik ' +
        'başlatılmaz.',
        'Her tahsilattan önce, tahsilatın tarihi ve tutarı size uygulama içi ' +
        'bildirim ve e-posta ile duyurulur.',
        'İptal ettiğinizde otomatik yenileme derhal durur; ödemesi yapılmış dönemin ' +
        'sonuna kadar erişiminiz sürer ve yeni bir tahsilat yapılmaz.',
        'Kayıtlı kartınızı Ayarlar → Üyelik ve Faturalandırma bölümünden ' +
        'değiştirebilir veya silebilirsiniz. Kartın silinmesi, üyeliğin dönem ' +
        'sonunda sona ermesi anlamına gelir.'
      ]
    },

    {
      id: 'ucretsiz',
      baslik: '5. Ücretsiz kullanım dönemi',
      paragraflar: [
        `Ücretlendirme başlamadan önce ${TRIAL_DAYS} günlük ücretsiz kullanım dönemi ` +
        'tanınır. Bu dönemde kart bilgisi istenmez ve tahsilat yapılmaz.',
        'Ücretlendirmenin başladığı tarihte hâlihazırda kayıtlı olan kullanıcılar da ' +
        'ücretsiz dönemin tamamından yararlanır; süre, kayıt tarihinden değil ' +
        'ücretlendirmenin başladığı tarihten işlemeye başlar.',
        'Sürenin bitmesine yaklaşıldığında uygulama içi bildirim ve e-posta ile ' +
        'önceden bilgilendirme yapılır.'
      ]
    },

    {
      id: 'degisiklik',
      baslik: '6. Bedel değişikliği',
      paragraflar: [
        'Bedel değişiklikleri yürürlüğe girmeden önce üyeye uygulama içi bildirim ve ' +
        'e-posta yoluyla duyurulur.',
        'Yürürlükteki dönemin bedeli, o dönem içinde değiştirilmez. Değişiklik ancak ' +
        'bir sonraki dönemden itibaren uygulanır.',
        'Yeni bedeli kabul etmeyen üye, üyeliğini iptal edebilir. İptal hâlinde bedeli ' +
        'ödenmiş dönemin sonuna kadar erişim sürer.'
      ]
    },

    {
      id: 'iptal',
      baslik: '7. İptal',
      paragraflar: [
        'Üyelik dilendiği zaman, uygulama içinden Ayarlar → Üyelik ve Faturalandırma ' +
        'bölümünden iptal edilebilir. Gerekçe bildirmek ya da tarafımızla iletişime ' +
        'geçmek gerekmez.',
        'İptal hâlinde bedeli ödenmiş dönemin sonuna kadar erişim sürer; dönem sonunda ' +
        'üyelik kendiliğinden sona erer ve yeni tahsilat yapılmaz. Kullanılmayan günler ' +
        'için kısmi iade yapılmaz.',
        'Ayrıntılı iade koşulları Teslimat, İptal ve İade Koşulları metnindedir.'
      ]
    },

    {
      id: 'fatura',
      baslik: '8. Faturalandırma',
      paragraflar: [
        'Her tahsilat için fatura düzenlenir ve hesabınıza tanımlı e-posta adresine ' +
        'iletilir. Geçmiş faturalarınıza Ayarlar → Üyelik ve Faturalandırma bölümünden ' +
        'ulaşabilirsiniz.',
        'Fatura düzenlenebilmesi için ödeme sırasında fatura bilgileriniz istenir. ' +
        'Bireysel veya kurumsal fatura tercihinize göre aşağıdaki bilgiler talep edilir.'
      ],
      tablo: {
        basliklar: ['Fatura tipi', 'İstenen bilgiler'],
        satirlar: [
          ['Bireysel', 'Ad soyad, T.C. kimlik numarası, fatura adresi'],
          ['Kurumsal', 'Unvan, vergi kimlik numarası, vergi dairesi, fatura adresi']
        ]
      },
      son: [
        'Bu bilgiler yalnızca fatura düzenleme ve yasal saklama yükümlülüğünün yerine ' +
        'getirilmesi amacıyla işlenir. Ayrıntı için Gizlilik ve KVKK Aydınlatma ' +
        'Metni\'ne bakınız.',
        'Fatura bilgilerinin doğruluğundan üye sorumludur. Hatalı bilgi nedeniyle ' +
        'düzenlenemeyen ya da yeniden düzenlenmesi gereken faturalar için üyeyle ' +
        'iletişime geçilir.'
      ]
    },

    {
      id: 'odeme-basarisiz',
      baslik: '9. Tahsilatın gerçekleşmemesi',
      paragraflar: [
        'Tahsilat, kartın limiti, geçerlilik süresi veya bankanın reddi gibi ' +
        'sebeplerle gerçekleşmezse üyeye uygulama içi bildirim ve e-posta ile bilgi ' +
        'verilir.',
        'Bildirim üzerine ödeme yönteminizi güncelleyebilirsiniz. Tahsilatın ' +
        'gerçekleşmemesi hâlinde üyelik hakları, ödenmiş dönemin sonunda sona erer ve ' +
        'hesap salt okunur moda geçer.',
        'Salt okunur modda verileriniz durur, görüntülenebilir ve dışa aktarılabilir. ' +
        'Hiçbir veriniz silinmez.'
      ]
    },

    {
      id: 'vergi',
      baslik: '10. Vergiler',
      paragraflar: [
        'Belirtilen tüm bedeller Türk Lirası cinsindendir ve yürürlükteki vergiler ' +
        'dâhildir. Vergi oranlarında mevzuat kaynaklı bir değişiklik olması hâlinde, ' +
        'değişiklik yürürlük tarihinden itibaren bedellere yansıtılabilir ve üyeye ' +
        'önceden bildirilir.'
      ]
    }
  ]
}
