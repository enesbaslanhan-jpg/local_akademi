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
 * 🔴 "OTOMATİK YENİLENİR" DENMİYOR.
 * Yenilemenin otomatik mi elle mi olacağı (`renewalMode`) ödeme
 * turunda kararlaştırılacak. Olmayan bir davranışı taahhüt etmek
 * yanlış beyandır; karar verildiğinde bu bölüm ve sürüm güncellenir.
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
        `Kurucu üye, bu bedelin %${kuruculIndirimYuzdesi()} altını öder.`,
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
      id: 'ucretsiz',
      baslik: '4. Ücretsiz kullanım dönemi',
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
      baslik: '5. Bedel değişikliği',
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
      baslik: '6. İptal',
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
      baslik: '7. Faturalandırma',
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
      baslik: '8. Tahsilatın gerçekleşmemesi',
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
      baslik: '9. Vergiler',
      paragraflar: [
        'Belirtilen tüm bedeller Türk Lirası cinsindendir ve yürürlükteki vergiler ' +
        'dâhildir. Vergi oranlarında mevzuat kaynaklı bir değişiklik olması hâlinde, ' +
        'değişiklik yürürlük tarihinden itibaren bedellere yansıtılabilir ve üyeye ' +
        'önceden bildirilir.'
      ]
    }
  ]
}
