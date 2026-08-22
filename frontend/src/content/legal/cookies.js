/*
 * ÇEREZ VE YEREL DEPOLAMA POLİTİKASI
 *
 * Bu metin ŞABLONDAN değil kod taramasından yazıldı (23.08.2026):
 *
 *   - LocalKarar sunucusu oturum/analitik/reklam çerezi ayarlamıyor.
 *   - Cloudflare güvenlik veya challenge özelliği devreye girerse teknik
 *     çerez koyabilir; bu nedenle altyapı için mutlak iddia kurulmaz.
 *   - Aşağıdaki kalem listesi koddaki localStorage ve sessionStorage çağrıları
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
    'LocalKarar kendi oturum, analitik veya reklam çerezini yerleştirmez. Oturum ve ' +
    'tercihler için gereken bilgiler tarayıcınızın yerel veya oturum depolama alanında ' +
    'cihazınızda tutulur. Cloudflare güvenlik koşullarında teknik çerez oluşturabilir. ' +
    'Bu metin, bu kullanımları birbirinden ayırarak açıklar.',

  bolumler: [
    {
      id: 'cerez-yok',
      baslik: '1. LocalKarar\'ın kendi çerezleri',
      paragraflar: [
        'LocalKarar uygulama sunucusu oturum açmak, analitik yapmak, reklam göstermek ' +
        'veya kullanıcıyı izlemek amacıyla çerez yerleştirmez.',
        'Bunun yerine bilgiler tarayıcınızın yerel depolama (localStorage) veya oturum ' +
        'depolama (sessionStorage) alanında saklanır. Bu alanlardaki veriler çerezlerden ' +
        'farklı olarak sunucuya kendiliğinden gönderilmez; uygulama gerektiğinde okur.'
      ]
    },

    {
      id: 'saklananlar',
      baslik: '2. Cihazınızda saklanan bilgiler',
      paragraflar: [
        'Bu sürümün uygulama kodunda tarayıcıya yazılan kalemlerin tamamı aşağıdadır.'
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
            'Depolama bildirimi durumu',
            'Tarayıcı depolaması bilgilendirmesini kapattığınızı hatırlar',
            'Tarayıcı verilerini silene kadar'
          ],
          [
            'E-posta doğrulama hatırlatıcısı',
            'Kapatılan doğrulama uyarısını aynı sekme oturumu boyunca yeniden göstermez',
            'Sekme veya tarayıcı oturumu kapandığında'
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
        'Yukarıdaki kalemler oturumun sürdürülmesi, güvenlik hatırlatmaları, tercihlerin ' +
        've sizin verdiğiniz alıştırma/mentor geri bildirimlerinin cihazda korunması için ' +
        'kullanılır; analitik veya reklam amacıyla kullanılmaz.',
        'Oturum anahtarları olmadan her sayfa geçişinde yeniden giriş yapmanız ' +
        'gerekirdi. Tercih kalemleri olmadan seçtiğiniz tema ve menü düzeni her ' +
        'açılışta sıfırlanırdı.',
        'Oturum anahtarları hizmetin çalışması için gereklidir. Diğer kalemler yaptığınız ' +
        'tercih veya işaretleme üzerine cihazınıza yazılır ve tarayıcı ayarlarından silinebilir. ' +
        'Analitik, reklam veya üçüncü taraf takip depolaması bulunmadığından ayrı bir takip ' +
        'çerezi onayı istenmemektedir.'
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
        'Normal uygulama akışında Cloudflare çerezi gözlemlenmemiş olsa da Cloudflare; ' +
        'bot koruması, WAF challenge, yük dengeleme veya benzeri güvenlik özellikleri ' +
        'devreye girdiğinde yalnız bu teknik işlevler için geçici güvenlik çerezleri ' +
        '(örneğin cf_clearance veya __cf_bm) oluşturabilir. Bunlar LocalKarar\'ın ' +
        'analitik ya da reklam çerezleri değildir.'
      ]
    },

    {
      id: 'silme',
      baslik: '6. Bu bilgileri nasıl silersiniz',
      liste: [
        'Uygulamadan çıkış yapmak oturum anahtarlarını cihazınızdan kaldırır.',
        'Tarayıcınızın ayarlarından LocalKarar site verilerini silmek yerel ve oturum ' +
        'depolamasındaki kalemleri ve varsa teknik güvenlik çerezlerini kaldırır.',
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
