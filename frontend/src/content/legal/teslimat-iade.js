import { TRIAL_DAYS } from '@/config/billing'
import { saticiTanimlari } from './satici-kimligi'

/*
 * TESLİMAT, İPTAL VE İADE KOŞULLARI
 *
 * 🔴 BU BELGE ŞABLONDAN YAZILAMAZ.
 *
 * Hazır "teslimat ve iade" şablonlarının tamamı fiziksel ürün varsayar:
 * kargo firması, teslim süresi, ambalajın açılmamış olması, iade
 * gönderim masrafı. LocalKarar'da bunların HİÇBİRİ yok. Şablon
 * kopyalansaydı belge var olmayan bir süreci tarif eder, kullanıcıyı
 * yanıltır ve ilk uyuşmazlıkta satıcı aleyhine yorumlanırdı.
 *
 * Bu yüzden metin "teslimat yoktur, çünkü hizmet elektroniktir"
 * cümlesini açıkça kuruyor ve iade yerine İPTAL kavramını anlatıyor.
 *
 * 🔴 İPTAL SEMANTİĞİ: dönem sonuna kadar devam, kısmi iade yok
 * (ürün sahibi kararı, 29.08.2026). Bu, ödeme panelindeki ve fiyat
 * sayfasındaki metinlerle birebir aynı olmalı — üçü ayrışırsa
 * hangisinin bağlayıcı olduğu tartışmalı hâle gelir.
 */

export default {
  giris:
    'LocalKarar elektronik ortamda sunulan bir hizmettir. Bu metin, hizmetin nasıl ' +
    'ifa edildiğini, üyeliğin nasıl iptal edileceğini ve hangi hâllerde iade ' +
    'yapıldığını açıklar.',

  bolumler: [
    {
      id: 'teslimat',
      baslik: '1. Teslimat',
      paragraflar: [
        'LocalKarar üyeliği fiziksel bir ürün değildir. Kargo gönderimi, teslimat ' +
        'süresi, teslimat adresi ve teslimat masrafı söz konusu değildir.',
        'Ödemeniz onaylandığı anda üyelik haklarınız LocalKarar hesabınızda elektronik ' +
        'ortamda derhal aktive edilir. Beklemeniz gereken bir süre yoktur.',
        'Aktivasyonun gerçekleştiği, uygulama içinde Ayarlar → Üyelik ve Faturalandırma ' +
        'bölümünden her zaman görülebilir.'
      ]
    },

    {
      id: 'ucretsiz-donem',
      baslik: '2. Ücretsiz kullanım dönemi',
      paragraflar: [
        `Üyelik ücretlendirmesi başlamadan önce ${TRIAL_DAYS} günlük ücretsiz kullanım ` +
        'dönemi tanınır. Bu dönemde kart bilgisi istenmez ve hiçbir tahsilat yapılmaz.',
        'Ücretsiz dönemin bitmesine yaklaştığınızda uygulama içi bildirim ve e-posta ile ' +
        'önceden bilgilendirilirsiniz.',
        'Ücretsiz dönem sonunda üyeliği başlatmazsanız hesabınız salt okunur moda geçer: ' +
        'verileriniz durur ve dışa aktarılabilir kalır, ancak yeni kayıt ekleme ve ' +
        'hesaplama özellikleri kapanır. Hiçbir veriniz silinmez.'
      ]
    },

    {
      id: 'iptal',
      baslik: '3. Üyeliğin iptali',
      paragraflar: [
        'Üyeliğinizi dilediğiniz zaman, uygulama içinden Ayarlar → Üyelik ve ' +
        'Faturalandırma bölümünden iptal edebilirsiniz.',
        'İptal için tarafımızla iletişime geçmeniz, telefon etmeniz, bir form ' +
        'doldurmanız veya gerekçe bildirmeniz gerekmez. İptal, üye olmak kadar kolaydır.',
        'İptal ettiğinizde bedeli ödenmiş dönemin sonuna kadar erişiminiz sürer. Dönem ' +
        'sonunda üyelik kendiliğinden sona erer ve yeni bir tahsilat yapılmaz.'
      ]
    },

    {
      id: 'iade',
      baslik: '4. İade koşulları',
      paragraflar: [
        'Üyelik iptal edildiğinde, içinde bulunulan dönemin kullanılmayan günleri için ' +
        'kısmi iade yapılmaz. Bunun sebebi, ödenen bedelin karşılığı olan hizmetin o ' +
        'dönem boyunca kesintisiz sunulmaya devam etmesidir.',
        'İade yapılan hâller aşağıda sayılmıştır.'
      ],
      liste: [
        'Teknik bir arıza nedeniyle hizmete makul olmayan bir süre boyunca ' +
        'erişilememesi',
        'Aynı dönem için mükerrer tahsilat yapılması',
        'Hatalı tutar tahsil edilmesi',
        'Üyeliğin, kullanıcı kaynaklı olmayan bir sebeple tarafımızca sona erdirilmesi'
      ],
      son: [
        'İade talepleriniz, aşağıdaki iletişim kanallarından iletildikten sonra en geç ' +
        'otuz gün içinde değerlendirilir ve sonuçlandırılır.',
        'Onaylanan iadeler, ödemenin yapıldığı karta ve ödeme kuruluşu PayTR ' +
        'aracılığıyla gerçekleştirilir. Tutarın kartınıza yansıma süresi bankanıza ' +
        'bağlıdır ve tarafımızca belirlenmez.'
      ]
    },

    {
      id: 'cayma',
      baslik: '5. Cayma hakkı ile ilişkisi',
      paragraflar: [
        'Hizmet, ödeme onaylandığı anda ifa edilmeye başlandığı için, ödeme ekranında ' +
        'verdiğiniz açık onayla birlikte cayma hakkınız sona erer. Ayrıntı Ön ' +
        'Bilgilendirme Formu ve Mesafeli Hizmet Sözleşmesi\'nde açıklanmıştır.',
        'Cayma hakkının sona ermesi, bu metinde düzenlenen iptal ve iade haklarınızı ' +
        'ortadan kaldırmaz.'
      ]
    },

    {
      id: 'iletisim',
      baslik: '6. İletişim',
      paragraflar: [
        'İptal, iade ve tahsilatla ilgili her türlü talebinizi aşağıdaki kanallardan ' +
        'iletebilirsiniz.'
      ],
      tanimlar: saticiTanimlari(),
      son: [
        'Tüketici sıfatını taşıyorsanız, Tüketici Hakem Heyetlerine ve Tüketici ' +
        'Mahkemelerine başvurma haklarınız saklıdır.'
      ]
    }
  ]
}
