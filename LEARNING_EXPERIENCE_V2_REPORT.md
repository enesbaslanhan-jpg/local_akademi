# Öğrenme Deneyimi V2 — Doğrulanmış Durum Raporu

## Sonuç

Okuma, quiz, uygulama görevi, flashcard ve video bileşenlerini aynı ders içinde birleştiren altyapı hazırdır. Uygulama, var olmayan videoları yayınlanmış gibi göstermemekte ve doğrudan istemciden gönderilen sahte video tamamlanma yüzdesini kabul etmemektedir.

Video senaryoları ve prodüksiyon kayıtları hazır olmakla birlikte gerçek MP4/HLS üretimi yapılmadığı için video yayın kapısı **MEDIA_RENDER_PENDING** durumundadır.

## Yayındaki eğitim kapsamı

| Metrik | Doğrulanmış değer |
|---|---:|
| Yayındaki bilgi nesnesi | 840 |
| CUR bilgi nesnesi | 600 |
| KBX bilgi nesnesi | 240 |
| Konu kursu | 200 |
| Legacy kurs / ders | 3 / 33 |
| Canonical quiz / soru | 840 / 2.520 |
| Canonical görev | 840 |
| V2 pilot bilgi nesnesi | 30 |
| Pilot flashcard | 150 |
| Video prodüksiyon paketi | 30 |
| Gerçekten yayınlanmış video | 0 |
| Prisma migration | 18 |

## Tamamlanan kullanıcı deneyimi

- Ders sayfasında bilgilendirici kısa özet, ayrıntılı Markdown içerik, öğrenme çıktıları, örnekler, adımlar, kontrol listeleri ve kaynaklar gösterilir.
- Quiz cevapları seçilebilir, sunucu tarafında değerlendirilir ve geçmişe kaydedilir.
- Görev çalışma alanı yönerge, kontrol listesi, örnek çıktı ölçütü ve rubriği gösterir. Boş veya asgari uzunluğun altındaki cevap tamamlanmış sayılamaz.
- Flashcard kartları çevrilebilir ve `again`, `hard`, `good`, `easy` değerlendirmeleriyle aralıklı tekrar planlanır.
- Flashcard tamamlanması benzersiz görülen kart sayısına dayanır; aynı kartı tekrar tekrar puanlamak ilerlemeyi yapay olarak yükseltmez.
- Video sekmesi yalnızca gerçekten yayınlanmış ve oynatılabilir URL'si bulunan içerikte görünür.
- Video ilerlemesi istemcinin gönderdiği yüzde yerine sunucunun biriktirdiği izlenen saniyelerden hesaplanır; %90 izlenme tamamlanma eşiğidir.
- Ders ve kurs ilerlemesi mevcut bileşenlere göre yeniden ağırlıklandırılır. Video bulunmayan ders, eksik video nedeniyle hiçbir zaman takılı kalmaz.

## Veri güvenliği ve idempotency

- Quiz ve görev seed işlemleri mevcut canonical kayıtları silmez, yeniden adlandırmaz veya çoğaltmaz.
- Flashcard seed işlemi mevcut kartları ve bunlara bağlı tekrar geçmişini korur; yalnızca eksik canonical kartları oluşturur.
- Toplu pilot seed iki kez arka arkaya çalıştırılmıştır.
- Son canonical denetim sonucu: 840/840 bilgi nesnesinde tam olarak 1 quiz, 3 soru ve 1 görev; etkilenen quiz denemesi veya görev ataması yoktur.

## Video prodüksiyon durumu

30 pilot bilgi nesnesi için senaryo, storyboard, transkript, WebVTT, kapak tarifi, seslendirme rehberi, çıktı anahtarı ve kaynak kodlarını içeren paketler `content/video-production-v1.json` içinde hazırdır. Aynı 30 paket veritabanında `script_ready` durumunda ve prodüksiyon işiyle eşlenmiştir.

Yayın için şu alanların tümü zorunludur:

- desteklenen sağlayıcı: `local`, `youtube` veya `vimeo`;
- geçerli oynatma URL'si;
- transkript;
- WebVTT altyazı;
- kapak bilgisi.

Gerçek medya üretimi OpenCode/LLM işi değildir. Bir video üretim veya yükleme sağlayıcısı çıktıyı üretip URL'yi sisteme vermeden video yayınlanmış sayılmaz.

## Doğrulama sonuçları

| Kontrol | Sonuç |
|---|---:|
| Backend TypeScript build | Geçti |
| Backend testleri | 473 test geçti |
| Frontend testleri | 11 test geçti |
| Frontend production build | Geçti |
| Pilot doğrulama kapıları | 12 geçti, 1 medya bekliyor, 0 hata |
| Video API güvenlik/ilerleme testleri | 5 geçti |

## Kalan gerçek iş

Tek harici bağımlılık gerçek video üretimi ve barındırmasıdır. Önce 30 pilot paket render edilmeli, kalite kontrolünden geçirilmeli, MP4/HLS URL'leri yönetici video API'sine girilmeli ve yayın kapısı tekrar çalıştırılmalıdır. Pilot ölçümleri olumluysa aynı üretim hattı 840 bilgi nesnesine kademeli olarak genişletilebilir.
