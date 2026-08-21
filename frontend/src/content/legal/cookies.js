/*
 * ÇEREZ VE YEREL DEPOLAMA POLİTİKASI
 *
 * Bu metin ŞABLONDAN değil ÖLÇÜMDEN yazıldı (21.08.2026):
 *
 *   - Canlıda `Set-Cookie` başlığı arandı: ne uygulamada var ne
 *     Cloudflare'da. "Çerez kullanmıyoruz" iddiası doğrulanmıştır.
 *   - Aşağıdaki kalem listesi koddaki her localStorage çağrısı
 *     taranarak çıkarıldı. Tahmin yok.
 *
 * YENİ BİR KALEM EKLENİRSE burası da güncellenmeli. Özellikle:
 * herhangi bir izleme/analitik/reklam aracı eklendiği gün
 *   (a) buradaki "izleme yok" taahhüdü kalkmalı,
 *   (b) StorageNotice.jsx içindeki aynı cümle değişmeli,
 *   (c) bildirim, gerçek bir onay bandına dönüşmeli.
 * Üçü AYNI ANDA yapılmazsa ürün kullanıcıya yalan söyler.
 */

export default {
  giris:
    'LocalKarar çerez kullanmaz. Uygulamanın çalışması için gereken birkaç bilgi, ' +
    'tarayıcınızın yerel depolama alanında cihazınızda tutulur. Bu metin, o bilgilerin ' +
    'neler olduğunu ve neden gerekli olduğunu açıklar.',

  bolumler: [
    {
      id: 'cerez-yok',
      baslik: '1. Çerez kullanılmıyor',
      paragraflar: [
        'Uygulama tarayıcınıza çerez yerleştirmez. Sunucu yanıtlarında çerez ayarlayan ' +
        'bir başlık bulunmaz.',
        'Bunun yerine, yalnızca uygulamanın çalışması için zorunlu olan birkaç bilgi ' +
        'tarayıcınızın yerel depolama (localStorage) alanında saklanır. Yerel depolamadaki ' +
        'veriler çerezlerden farklı olarak sunucuya kendiliğinden gönderilmez; yalnızca ' +
        'uygulama gerektiğinde okur.'
      ]
    },

    {
      id: 'saklananlar',
      baslik: '2. Cihazınızda saklanan bilgiler',
      paragraflar: [
        'Saklanan kalemlerin tamamı aşağıdadır. Bu listede yer almayan bir bilgi ' +
        'cihazınızda tutulmaz.'
      ],
      tablo: {
        basliklar: ['Kalem', 'Ne işe yarar', 'Ne zaman silinir'],
        satirlar: [
          [
            'Oturum anahtarı',
            'Giriş yaptığınızı doğrular; her istekte kimliğinizi kanıtlar',
            'Çıkış yaptığınızda; ayrıca 8 saat sonra kendiliğinden geçersizleşir'
          ],
          [
            'Oturum yenileme anahtarı',
            'Her açılışta yeniden şifre girmenizi önler',
            'Çıkış yaptığınızda; en geç 30 gün sonra'
          ],
          [
            'Tema tercihi',
            'Açık/koyu görünüm seçiminizi hatırlar',
            'Tarayıcı verilerini silene kadar'
          ],
          [
            'Menü görünümü',
            'Kenar menüsünü daralttıysanız bunu hatırlar',
            'Tarayıcı verilerini silene kadar'
          ],
          [
            'Bildirim durumu',
            'Bu bildirimi kapattığınızı hatırlar, tekrar göstermez',
            'Tarayıcı verilerini silene kadar'
          ],
          [
            'Alıştırma işaretleri',
            'Ders içi kontrol listelerinde işaretlediklerinizi korur',
            'Tarayıcı verilerini silene kadar'
          ],
          [
            'Mentor geri bildirimleri',
            'Bir yanıta verdiğiniz beğendim/beğenmedim işaretini hatırlar',
            'Tarayıcı verilerini silene kadar'
          ]
        ]
      }
    },

    {
      id: 'neden-zorunlu',
      baslik: '3. Neden bu bilgiler gerekli',
      paragraflar: [
        'Yukarıdaki kalemlerin hepsi işlevseldir; hiçbiri sizi tanımak, davranışınızı ' +
        'ölçmek veya reklam göstermek için tutulmaz.',
        'Oturum anahtarları olmadan her sayfa geçişinde yeniden giriş yapmanız ' +
        'gerekirdi. Tercih kalemleri olmadan seçtiğiniz tema ve menü düzeni her ' +
        'açılışta sıfırlanırdı.',
        'Bu bilgiler işlevsel zorunluluk taşıdığı için ayrıca onay istenmemektedir.'
      ]
    },

    {
      id: 'izleme-yok',
      baslik: '4. Üçüncü taraf izleme bulunmuyor',
      paragraflar: [
        'Uygulamada analitik aracı, reklam ağı, sosyal medya izleyicisi veya benzeri ' +
        'bir üçüncü taraf izleme kodu çalıştırılmaz.',
        'Kullandığımız yazı tipleri kendi sunucumuzdan sunulur. Daha önce harici bir ' +
        'font servisi kullanılıyordu; bu, giriş sayfasını açan her ziyaretçinin IP ' +
        'adresini o servise göndermek anlamına geldiği için kaldırılmıştır.',
        'İleride izleme yapan bir özellik eklenirse bu politika güncellenir, ayrıca ' +
        'bilgilendirme yapılır ve gerekli tercih kontrolleri sunulur. Böyle bir özellik ' +
        'sessizce eklenmez.'
      ]
    },

    {
      id: 'altyapi',
      baslik: '5. Altyapı sağlayıcısı',
      paragraflar: [
        'Uygulama, saldırı koruması ve hız için Cloudflare altyapısı üzerinden sunulur. ' +
        'Bu hizmet, güvenlik amacıyla bağlantı bilgilerinizi (IP adresi, istek zamanı) ' +
        'işler.',
        'Cloudflare, ölçümlerimize göre tarayıcınıza çerez yerleştirmemektedir. Bu ' +
        'durum sağlayıcı yapılandırması nedeniyle değişirse politika güncellenir.'
      ]
    },

    {
      id: 'silme',
      baslik: '6. Bu bilgileri nasıl silersiniz',
      liste: [
        'Uygulamadan çıkış yapmak oturum anahtarlarını cihazınızdan kaldırır.',
        'Tarayıcınızın ayarlarından site verilerini silmek tüm kalemleri kaldırır.',
        'Tarayıcının gizli/özel penceresinde kullanırsanız pencereyi kapattığınızda veriler silinir.'
      ],
      son: [
        'Bu bilgileri sildiğinizde oturumunuz kapanır ve tema, menü gibi tercihleriniz ' +
        'varsayılana döner. Hesabınızdaki veriler etkilenmez; onlar sunucuda tutulur.'
      ]
    },

    {
      id: 'degisiklik',
      baslik: '7. Değişiklikler',
      paragraflar: [
        'Bu politika, cihazınızda saklanan kalemler değiştiğinde güncellenir ve yeni bir ' +
        'sürüm numarasıyla yayımlanır. Sayfanın başındaki sürüm bilgisi, o an yürürlükte ' +
        'olan metni gösterir.'
      ]
    }
  ]
}
