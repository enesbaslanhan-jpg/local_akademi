import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const sourceKeys = ['SRC-FIN-001', 'SRC-FIN-002', 'SRC-FIN-003']
type Q = { q: string; o: string[]; a: string; e: string }
type C = { front: string; back: string; hint: string }
type Spec = { code: string; title: string; level: string; minutes: number; summary: string; content: string; quiz: Q[]; cards: C[]; task: string }

const specs: Spec[] = [
  {
    code: 'CUR-001-01', title: 'Kâr ile Nakit Arasındaki Fark', level: 'Başlangıç', minutes: 12,
    summary: 'Satış, kâr ve tahsilatın neden aynı anda oluşmayabileceğini öğretir.',
    content: `## Öğrenme hedefleri

Bu ders sonunda satış, kâr ve nakdi ayırabilecek; vadeli bir işlemin banka bakiyesine etkisini açıklayabilecek; dönem sonu nakdi hesaplayabileceksiniz.

## Kısa cevap

**Kâr**, dönemin gelirleri ile giderleri arasındaki muhasebesel sonuçtur. **Nakit akışı**, paranın gerçekten ne zaman işletmeye girip çıktığını gösterir. Kârlı bir işletme, tahsilatı geciktiğinde ödeme güçlüğü yaşayabilir.

## İşlemler iki tabloyu farklı etkileyebilir

Peşin satış gelir ve nakdi aynı gün etkileyebilir. Vadeli satışta gelir oluştuğu hâlde para daha sonra gelir. Eski bir alacağın tahsili bugün nakdi artırır fakat gelir daha önce kaydedilmiştir. Kredi nakdi artırır ancak satış geliri değildir. Amortisman kârı azaltabilir fakat bu dönemde yeni bir para çıkışı yaratmaz.

| İşlem | Kâr etkisi | Anlık nakit etkisi |
|---|---|---|
| Peşin satış | Var | Var |
| 30 gün vadeli satış | Var | Yok |
| Eski alacağın tahsili | Daha önce oluştu | Var |
| Banka kredisi | Satış kârı değildir | Var |

## Çözülmüş örnek senaryo

İşletme haftaya 40.000 TL ile başlıyor. 90.000 TL satışın 50.000 TL'si peşin, 40.000 TL'si vadeli. Nakit ödemeleri 65.000 TL.

**Dönem sonu nakit = 40.000 + 50.000 − 65.000 = 25.000 TL.**

Satış 90.000 TL olsa da vadeli 40.000 TL henüz ödeme kapasitesine eklenmez. Bu hafta alınabilecek kararların sınırını 25.000 TL nakit belirler.

## Karar kuralları

- Ödeme kararında fatura toplamına değil banka/kasa bakiyesine ve gerçekçi tahsilat tarihine bakın.
- Peşin ve vadeli satışları ayrı izleyin.
- Kâr-zarar ile nakit akışını birlikte okuyun: biri performansı, diğeri ödeme gücünü açıklar.

## Sık hatalar

- Satışı tahsilat saymak → tahsilat tarihini ayrı kaydedin.
- Krediyi gelir saymak → finansman nakit girişi olarak etiketleyin.
- Kişisel harcamaları karıştırmak → işletme hesabını ayırın.

## Uygulama

Son yedi gündeki beş işlemi “kârı etkiler”, “nakdi etkiler” ve “etki tarihi” sütunlarıyla sınıflandırın. Banka bakiyesiyle kontrol edin.

## Kaynaklar

KGK BOBİ FRS Modül 2 kâr ile nakit farkını ve faaliyet sınıflarını; TMS 7 sunum ilkelerini; FDIC/SBA Money Smart küçük işletme uygulamasını destekler.`,
    quiz: [
      { q: '40.000 TL başlangıç, 50.000 TL tahsilat ve 65.000 TL ödeme varsa kapanış nakdi kaçtır?', o: ['25.000 TL','40.000 TL','65.000 TL','90.000 TL'], a: '25.000 TL', e: '40.000 + 50.000 − 65.000 = 25.000 TL.' },
      { q: '30 gün vadeli satış için hangisi doğrudur?', o: ['Gelir oluşabilir fakat nakit henüz girmemiştir','Her zaman aynı gün nakit yaratır','Kredi sayılır','Kârı hiç etkilemez'], a: 'Gelir oluşabilir fakat nakit henüz girmemiştir', e: 'Tahakkuk ve tahsilat tarihleri farklı olabilir.' },
      { q: 'Banka kredisi hesaba geçtiğinde en doğru sınıflandırma nedir?', o: ['Finansman nakit girişi','Satış geliri','Müşteri tahsilatı','Brüt kâr'], a: 'Finansman nakit girişi', e: 'Kredi nakdi artırır, satış geliri değildir.' },
    ],
    cards: [
      { front: 'Kâr ile nakit arasındaki temel fark nedir?', back: 'Kâr dönemsel performansı; nakit gerçek para giriş ve çıkış zamanını gösterir.', hint: 'Performans ve ödeme gücü' },
      { front: 'Vadeli satış neden hemen nakit değildir?', back: 'Müşteri ödeme yapana kadar banka veya kasaya para girmez.', hint: 'Tahsilat tarihi' },
      { front: 'Kapanış nakdi formülü nedir?', back: 'Açılış nakdi + nakit girişleri − nakit çıkışları.', hint: 'Üç bileşen' },
      { front: 'Kredi satış geliri midir?', back: 'Hayır; geri ödeme yükümlülüğü doğuran finansman girişidir.', hint: 'Borçlanma' },
      { front: 'Ödeme kararında neye bakılır?', back: 'Mevcut bakiye ile tarihleri gerçekçi nakit giriş ve çıkışlarına.', hint: 'Gerçek para' },
    ], task: 'Son yedi gündeki en az beş işlemi kâr etkisi, nakit etkisi ve etki tarihiyle sınıflandır; bir uyumsuzluğu yorumla.'
  },
  {
    code: 'CUR-001-02', title: 'Nakit Akışlarını Doğru Sınıflandırma', level: 'Başlangıç', minutes: 14,
    summary: 'Para hareketlerini esas faaliyet, yatırım ve finansman olarak ayırmayı öğretir.',
    content: `## Öğrenme hedefleri

Bu ders sonunda para hareketlerini üç faaliyet sınıfına ayırabilecek; nakdin nereden üretildiğini yorumlayabilecek; nakit olmayan işlemleri fark edebileceksiniz.

## Üç faaliyet sınıfı

**Esas faaliyetler**, müşteriden tahsilat ile tedarikçi ve çalışan ödemeleri gibi ana işin günlük hareketleridir. **Yatırım faaliyetleri**, makine, araç ve uzun vadeli varlık alım-satımlarıdır. **Finansman faaliyetleri**, kredi, kredi anaparası ve sermaye hareketleridir.

Bu ayrım önemlidir: banka bakiyesi kredi nedeniyle artmışsa ana işin nakit ürettiği sonucuna varılamaz.

## Çözülmüş örnek senaryo

Bir atölyede müşteriden tahsilat +120.000 TL, tedarikçi ödemesi −70.000 TL ve çalışan ödemesi −25.000 TL'dir. Esas faaliyet nakdi **+25.000 TL** olur. Yeni makine −60.000 TL yatırım çıkışı; alınan kredi +80.000 TL ve anapara ödemesi −10.000 TL finansman hareketidir.

| Sınıf | Net nakit |
|---|---:|
| Esas faaliyet | +25.000 TL |
| Yatırım | −60.000 TL |
| Finansman | +70.000 TL |
| Toplam değişim | +35.000 TL |

Nakit 35.000 TL artmıştır; fakat artışın büyük bölümü krediden gelir. Esas faaliyet pozitif olsa da yatırımı tek başına karşılamamıştır. Bu mutlaka kötü değildir; ancak finansman girişi faaliyet başarısı gibi sunulmamalıdır.

## Nakit olmayan işlemler

Amortisman veya karşılık gibi kalemler sonucu etkileyebilir fakat o anda nakit hareketi yaratmaz. Borçla varlık edinimi de para hareketi olmadan gerçekleşebilir. Nakit tablosu gerçek giriş ve çıkışı izler.

## Karar soruları

- Ana iş kendi başına nakit üretiyor mu?
- Yatırım çıkışı tek seferlik mi?
- Kredi olmasa kapanış bakiyesi ne olurdu?
- Geri ödeme gelecek dönemi nasıl etkiler?

## Sık hatalar

Krediyi satış saymak, makine alımını günlük giderle karıştırmak ve toplam değişimi kaynağına ayırmadan yorumlamak en yaygın hatalardır.

## Uygulama

Son bir aydaki on büyük banka hareketini üç sınıfa ayırın. Her sınıfın netini hesaplayıp nakit değişiminin ana kaynağını bir cümleyle açıklayın.

## Kaynaklar

KGK BOBİ FRS Modül 2 ile TMS 7 üçlü sınıflandırmayı; FDIC/SBA Money Smart pratik nakit yönetimi yaklaşımını destekler.`,
    quiz: [
      { q: 'Müşteriden yapılan tahsilat genellikle hangi sınıftadır?', o: ['Esas faaliyet','Yatırım','Finansman','Nakit olmayan işlem'], a: 'Esas faaliyet', e: 'Ana gelir üretme faaliyetinden doğar.' },
      { q: 'Yeni makine için nakit ödeme hangi sınıftadır?', o: ['Yatırım','Esas faaliyet','Finansman','Satış'], a: 'Yatırım', e: 'Uzun vadeli varlık edinimidir.' },
      { q: 'Nakit artışının çoğu krediden geliyorsa doğru yorum hangisidir?', o: ['Artış finansman kaynaklıdır; faaliyet ayrıca incelenmelidir','Ana iş kesin yüksek kâr üretmiştir','Kredi satış geliridir','Yatırım yoktur'], a: 'Artış finansman kaynaklıdır; faaliyet ayrıca incelenmelidir', e: 'Toplam değişim kaynağına ayrılmalıdır.' },
    ],
    cards: [
      { front: 'Üç nakit akışı sınıfı nedir?', back: 'Esas faaliyet, yatırım ve finansman.', hint: 'İş, varlık, kaynak' },
      { front: 'Müşteri tahsilatı hangi sınıftadır?', back: 'Genellikle esas faaliyet nakit girişidir.', hint: 'Ana iş' },
      { front: 'Makine alımı hangi sınıftadır?', back: 'Yatırım faaliyeti nakit çıkışıdır.', hint: 'Uzun vadeli varlık' },
      { front: 'Banka kredisi hangi sınıftadır?', back: 'Finansman faaliyeti nakit girişidir.', hint: 'Borçlanma' },
      { front: 'Amortisman neden anlık nakit çıkışı değildir?', back: 'Dönem gideridir fakat bu dönemde yeni ödeme yapıldığı anlamına gelmez.', hint: 'Nakit olmayan gider' },
    ], task: 'Bir aylık on büyük banka hareketini üç faaliyet sınıfına ayır; sınıf netlerini ve nakit değişiminin ana kaynağını yaz.'
  },
  {
    code: 'CUR-001-03', title: 'Dört Haftalık Nakit Projeksiyonu', level: 'Orta', minutes: 18,
    summary: 'İlk nakit açığının tutarını ve zamanını dört haftalık tahminle bulmayı öğretir.',
    content: `## Öğrenme hedefleri

Bu ders sonunda dört haftalık projeksiyon kurabilecek; kesin ve olası tahsilatları ayırabilecek; ilk açığın tarihini ve tutarını belirleyebileceksiniz.

## Temel model

**Kapanış nakdi = Açılış nakdi + Tahsilatlar − Ödemeler.** Bir haftanın kapanışı sonraki haftanın açılışıdır. Tahsilat fatura tarihine değil gerçekçi ödeme tarihine yazılır. Kesinleşmemiş satış ana tabloya tam tutarla değil ayrı senaryoya eklenir.

## Çözülmüş dört haftalık vaka

| Hafta | Açılış | Tahsilat | Ödeme | Kapanış |
|---|---:|---:|---:|---:|
| 1 | 50.000 | 80.000 | 100.000 | 30.000 |
| 2 | 30.000 | 45.000 | 90.000 | **−15.000** |
| 3 | −15.000 | 120.000 | 55.000 | 50.000 |
| 4 | 50.000 | 60.000 | 70.000 | 40.000 |

Ay sonu +40.000 TL olsa da ikinci hafta −15.000 TL açık vardır. Aylık toplam, maaş veya tedarikçi ödemesinin yapılamayacağı kritik günü gizleyebilir.

## Üç senaryo

**Temel senaryo** en gerçekçi tarihleri, **temkinli senaryo** riskli tahsilatların gecikmesini, **iyimser senaryo** planlanan veya erken tahsilatı kullanır. Temkinli senaryo felaket tahmini değil, dayanıklılık kontrolüdür.

## Açık görüldüğünde

Önce bakiye ve tarihleri doğrulayın. Gecikmiş alacağı takip edin; ödeme bağlantısı veya aşamalı tahsilatı değerlendirin. Kritik olmayan harcamayı erteleyin. Tedarikçi vadesini ilişkiyi bozmadan görüşün. Finansman gerekiyorsa tutar ve süreyi projeksiyondan çıkarın.

## Tahmin-gerçekleşen kontrolü

Hafta sonunda farkı “geç tahsilat”, “beklenmeyen gider” veya “tutar hatası” gibi kodlarla kaydedin. Sürekli iyimser tahsilat tarihi kullanılıyorsa sorun hesapta değil varsayımdadır.

## Sık hatalar

Ay sonuna bakmak, olası satışı kesin saymak, vergi/kredi tarihlerini unutmak ve sonraki haftaya yanlış açılış devretmek projeksiyonu bozar.

## Uygulama

Dört haftayı; açılış, kesin/olası tahsilat, zorunlu/diğer ödeme ve kapanış sütunlarıyla doldurun. En düşük bakiyeyi işaretleyip bir önlem yazın.

## Kaynaklar

KGK/TMS 7 doğrudan nakit giriş-çıkış mantığını; FDIC/SBA Money Smart projeksiyonla önceden problem çözmeyi destekler.`,
    quiz: [
      { q: '50.000 TL açılış, 80.000 TL tahsilat ve 100.000 TL ödeme varsa kapanış kaçtır?', o: ['30.000 TL','50.000 TL','80.000 TL','130.000 TL'], a: '30.000 TL', e: '50.000 + 80.000 − 100.000.' },
      { q: 'Ay sonu pozitifken ara haftanın negatif olması neyi gösterir?', o: ['Zamanlamaya bağlı nakit açığı','Projeksiyona gerek olmadığını','Kesin zarar oluştuğunu','Tüm satışların tahsil edildiğini'], a: 'Zamanlamaya bağlı nakit açığı', e: 'Ay sonu toplamı ara dönem ödeme riskini gizleyebilir.' },
      { q: 'Temkinli senaryoda riskli tahsilata nasıl yaklaşılır?', o: ['Gecikme olasılığı hesaba katılır','Kesin sayılır','Ödemeler silinir','Kredi gelir sayılır'], a: 'Gecikme olasılığı hesaba katılır', e: 'Amaç alt sınırı görmektir.' },
    ],
    cards: [
      { front: 'Haftalık kapanış nasıl hesaplanır?', back: 'Açılış + tahsilatlar − ödemeler.', hint: 'Giriş ve çıkış' },
      { front: 'Tahsilat hangi tarihe yazılır?', back: 'Müşterinin gerçekçi ödeme yapacağı tarihe.', hint: 'Fatura tarihi olmayabilir' },
      { front: 'Temel senaryo nedir?', back: 'Mevcut bilgilere göre en gerçekçi nakit tahminidir.', hint: 'En olası' },
      { front: 'Neden ay sonu tek başına yetmez?', back: 'Ay içindeki geçici ödeme açığını gizleyebilir.', hint: 'Zamanlama' },
      { front: 'Tahmin farkı neden kodlanır?', back: 'Tekrarlayan varsayım ve süreç hatalarını bulmak için.', hint: 'Öğrenen tahmin' },
    ], task: 'Dört haftalık temel ve temkinli projeksiyon hazırla; en düşük bakiyeyi, tarihini ve bir önlemi yaz.'
  },
  {
    code: 'CUR-001-04', title: 'Tahsilat ve Ödeme Döngüsünü İyileştirme', level: 'Orta', minutes: 17,
    summary: 'Müşteri, stok ve tedarikçi vadelerinin nakit ihtiyacına etkisini öğretir.',
    content: `## Öğrenme hedefleri

Bu ders sonunda vade uyumsuzluğunu teşhis edebilecek; nakit dönüşüm süresini hesaplayabilecek; iyileştirmeyi maliyet ve ilişki etkisiyle değerlendirebileceksiniz.

## Nakit neden bağlanır?

İşletme, müşteriden para almadan stok ve tedarikçi için ödeme yaparsa aradaki süreyi kendi nakdiyle taşır.

**Nakit dönüşüm süresi = Stokta kalma süresi + Tahsilat süresi − Tedarikçiye ödeme süresi.**

Süre uzadıkça işletme sermayesi ihtiyacı genellikle artar. Ama hedef gün sayısını körü körüne düşürmek değildir; stok bulunabilirliği, iskonto maliyeti ve ticari ilişkiler de korunmalıdır.

## Çözülmüş örnek senaryo

Ürün 25 gün stokta kalıyor, müşteri 45 günde ödüyor, tedarikçiye 20 günde ödeme yapılıyor:

**25 + 45 − 20 = 50 gün.**

Tahsilat 35 güne inerse süre 40 güne düşer; nakit yaklaşık 10 gün daha az bağlı kalır. Fakat bunun için yüzde 5 erken ödeme iskontosu veriliyorsa nakit avantajı ile kaybedilen marj karşılaştırılmalıdır.

## Müdahale seçenekleri

- Vade koşulunu teklifte açık yazın.
- Faturayı teslimatla birlikte ve hatasız düzenleyin.
- Vade öncesi hatırlatma ve gecikme takibi kurun.
- Büyük işlerde avans veya aşamalı ödeme isteyin.
- Yavaş dönen stoku ve satın alma miktarını inceleyin.
- Tedarikçi vadesini karşılıklı güven içinde görüşün.

## Karar filtresi

Her aksiyon için kaç gün kazandırdığını, maliyetini, müşteri/tedarikçi etkisini ve operasyon riskini yazın. En hızlı çözüm her zaman en iyi çözüm değildir.

## Sık hatalar

Her müşteriye aynı vade vermek, fatura hatasının gecikme etkisini görmemek, tedarikçiyi geciktirmeyi ücretsiz finansman sanmak ve stoku analiz dışı bırakmak.

## Uygulama

Üç müşteri, üç tedarikçi ve üç ürün için gün bilgisi çıkarın. En büyük nakit bağlanma noktasına 30 günlük düşük riskli bir deney tasarlayın.

## Kaynaklar

FDIC/SBA Money Smart planlama ve problem çözmeyi; KGK BOBİ FRS Modül 2 ile TMS 7 nakdin kaynak ve kullanım yerlerinin görünürlüğünü destekler.`,
    quiz: [
      { q: 'Stok 25, tahsilat 45 ve ödeme 20 günse nakit dönüşüm süresi kaçtır?', o: ['50 gün','90 gün','40 gün','20 gün'], a: '50 gün', e: '25 + 45 − 20 = 50.' },
      { q: 'Erken ödeme iskontosunda ne birlikte incelenmelidir?', o: ['Kazanılan gün ve kaybedilen marj','Yalnız satış adedi','Sadece banka bakiyesi','Fatura numarası'], a: 'Kazanılan gün ve kaybedilen marj', e: 'Nakit hızının bir maliyeti olabilir.' },
      { q: 'Tahsilatı hızlandıran temel süreç adımı hangisidir?', o: ['Doğru ve zamanında fatura','Herkese uzun vade','Gecikmeyi kaydetmemek','Stoku yok saymak'], a: 'Doğru ve zamanında fatura', e: 'Fatura hatası tahsilatı geciktirir.' },
    ],
    cards: [
      { front: 'Nakit dönüşüm süresi formülü nedir?', back: 'Stok günü + tahsilat günü − tedarikçi ödeme günü.', hint: 'Stok + alacak − borç' },
      { front: 'Tahsilatı 10 gün kısaltmak ne sağlar?', back: 'Diğer koşullar aynıysa nakdin yaklaşık 10 gün daha az bağlı kalmasını.', hint: 'Bağlanma süresi' },
      { front: 'Erken ödeme iskontosunun maliyeti nedir?', back: 'Nakit hızlanırken marjın bir kısmı kaybedilir.', hint: 'Hız ve fiyat' },
      { front: 'Fatura hatası nakdi nasıl etkiler?', back: 'Onay ve ödeme tarihini geciktirebilir.', hint: 'Operasyon engeli' },
      { front: 'Tedarikçi vadesi neden sınırsız uzatılmaz?', back: 'Fiyatı, teslimatı, güveni ve itibarı bozabilir.', hint: 'Ücretsiz değildir' },
    ], task: 'Üç müşteri, üç tedarikçi ve üç ürünün sürelerini çıkar; gün kazancı, maliyet ve risk içeren bir iyileştirme deneyi tasarla.'
  },
  {
    code: 'CUR-001-05', title: 'Nakit Açığı Senaryosu ve Müdahale Planı', level: 'İleri', minutes: 20,
    summary: 'Nakit açığını ölçmeyi, stres senaryosu kurmayı ve müdahaleleri önceliklendirmeyi öğretir.',
    content: `## Öğrenme hedefleri

Bu ders sonunda açığı tarih, tutar ve süreyle tanımlayabilecek; tahsilat gecikmesi ile maliyet artışını test edebilecek; müdahaleleri hız, maliyet ve riskle sıralayabileceksiniz.

## Açığı doğru tanımlayın

“Nakit yetersiz” karar vermeye yetmez. İlk açık tarihi, en düşük bakiye ve bakiyenin yeniden pozitife dönme süresi yazılmalıdır. Böylece finansmanın tutarı ve vadesi gereğinden büyük seçilmez.

## Çözülmüş stres senaryosu

Temel projeksiyonda ikinci hafta −15.000 TL, üçüncü hafta +50.000 TL olsun. Üçüncü haftadaki 120.000 TL müşteri tahsilatı bir hafta gecikirse yeni bakiye:

**50.000 − 120.000 = −70.000 TL.**

Aynı hafta hammadde ödemesi 10.000 TL artarsa en düşük bakiye **−80.000 TL** olur. Sadece temel senaryodaki 15.000 TL açığa göre plan yapmak yeterli tampon sağlamaz. Bu sonuç otomatik olarak 80.000 TL kredi alınması gerektiğini söylemez; olasılık, rezerv, iç kaynak ve finansman maliyeti karşılaştırılır.

## Müdahale merdiveni

1. Bakiye, tarih, tutar ve mükerrer kayıtları doğrulayın.
2. Gecikmiş alacak, gereksiz stok ve ertelenebilir harcamadan iç kaynak yaratın.
3. Avans, aşamalı ödeme ve tedarikçi vadesini değerlendirin.
4. Maaş, vergi, kritik tedarik ve müşteri teslimatını koruyun.
5. Finansmanı tutar, toplam maliyet, vade, teminat ve geri ödeme kaynağıyla karşılaştırın.

## Karar matrisi

Her seçeneğe hız, nakit etkisi, doğrudan maliyet, ilişki riski ve uygulanabilirlik için 1–5 puan verin. Yüksek etki tek başına yeterli değildir; geri ödeme ve sürdürülebilirlik açık olmalıdır.

## Erken uyarılar

Vadesi geçen alacak payı, haftalık en düşük bakiye, tahmin sapması, esas faaliyet nakdinin yönü ve rezervin zorunlu giderleri karşılama süresi birlikte izlenir.

## Sık hatalar

Tek iyimser tahmine güvenmek, kısa açığı pahalı uzun finansmanla kapatmak, kredi geri ödemesini gelecek plana eklememek ve tüm ödemeleri aynı öncelikte görmek.

## Uygulama

En büyük iki tahsilatı yedi gün geciktirin, büyük değişken gideri yüzde 10 artırın. Yeni en düşük bakiyeyi bulun; üç müdahaleyi puanlayıp birincil ve yedek plan seçin.

## Kaynaklar

KGK BOBİ FRS Modül 2 ve TMS 7 faaliyet nakdini diğer kaynaklardan ayırmayı; FDIC/SBA Money Smart projeksiyon ve pratik sorun çözmeyi destekler.`,
    quiz: [
      { q: '50.000 TL bakiyedeki 120.000 TL tahsilat bir hafta gecikirse yeni bakiye kaçtır?', o: ['−70.000 TL','−15.000 TL','50.000 TL','170.000 TL'], a: '−70.000 TL', e: '50.000 − 120.000 = −70.000.' },
      { q: 'Nakit açığını tanımlayan doğru üçlü hangisidir?', o: ['İlk tarih, en düşük bakiye, süre','Ciro, çalışan, alan','Fatura, renk, yaş','Kâr, takipçi, gösterim'], a: 'İlk tarih, en düşük bakiye, süre', e: 'Tutar ve zaman kararını bu bilgiler belirler.' },
      { q: 'Müdahalede neden önce veri doğrulanır?', o: ['Yanlış tarih veya mükerrer ödeme sahte açık yaratabilir','Kredi yasaktır','Satış önemsizdir','Her ödeme ertelenir'], a: 'Yanlış tarih veya mükerrer ödeme sahte açık yaratabilir', e: 'Aksiyon öncesi açığın gerçekliği doğrulanır.' },
    ],
    cards: [
      { front: 'Nakit açığını tanımlayan üç bilgi nedir?', back: 'İlk açık tarihi, en düşük bakiye ve açığın süresi.', hint: 'Ne zaman, ne kadar, ne kadar süre' },
      { front: 'Duyarlılık analizi neyi gösterir?', back: 'Varsayımlar değiştiğinde nakit sonucunun ne kadar değiştiğini.', hint: 'Stres testi' },
      { front: 'Müdahalenin ilk adımı nedir?', back: 'Bakiye, tarih, tutar ve kayıtları doğrulamak.', hint: 'Önce veri' },
      { front: 'Finansman tutarı neye göre belirlenir?', back: 'Açığın tutarı/süresi, senaryo riski, tampon ve geri ödeme kapasitesine.', hint: 'İhtiyaç kadar' },
      { front: 'Kredi geri ödemesi neden projeksiyona eklenir?', back: 'Bugünkü çözüm gelecekte yeni nakit çıkışı yaratır.', hint: 'Gelecek yükümlülük' },
    ], task: 'İki tahsilatı 7 gün geciktirip büyük gideri %10 artır; yeni en düşük bakiyeyi bul ve üç müdahaleden birincil/yedek plan seç.'
  },
]

function parseMeta(raw: string) { try { return JSON.parse(raw) as Record<string, unknown> } catch { return {} } }

async function main() {
  const library = JSON.parse(await readFile(resolve('SOURCE_LIBRARY_V1.json'), 'utf8')) as { sources: { key: string; url: string }[] }
  const urls = sourceKeys.map(key => library.sources.find(source => source.key === key)?.url).filter(Boolean) as string[]
  const sources = await prisma.source.findMany({ where: { url: { in: urls } } })
  const kos = await prisma.knowledgeObject.findMany({ where: { code: { in: specs.map(spec => spec.code) } } })
  if (kos.length !== 5 || sources.length !== 3) throw new Error(`Beklenen 5 ders/3 kaynak; bulunan ${kos.length}/${sources.length}.`)
  console.log('Nakit Akışı V2 paketi doğrulandı.')
  if (!apply) return console.log('DRY RUN — --apply ile uygula.')
  for (const spec of specs) {
    const ko = kos.find(item => item.code === spec.code)!
    await prisma.$transaction(async tx => {
      const meta = { ...parseMeta(ko.metadata), level: spec.level, difficulty: spec.level === 'İleri' ? 3 : spec.level === 'Orta' ? 2 : 1, estimatedTime: `${spec.minutes} dakika`, estimatedMinutes: spec.minutes, summary: spec.summary, contentVersion: 2, enrichmentVersion: 6, qualityStandard: 'knowledge-v2', sourceKeys, editorialState: 'published_quality_v2', upgradedAt: new Date().toISOString() }
      await tx.knowledgeObject.update({ where: { id: ko.id }, data: { title: spec.title, content: spec.content, metadata: JSON.stringify(meta), status: 'published', verificationStatus: 'verified', reviewDue: new Date(Date.now() + 180 * 86_400_000) } })
      await tx.lesson.updateMany({ where: { knowledgeObjectId: ko.id }, data: { title: spec.title, content: spec.content, estimatedMinutes: spec.minutes } })
      for (const source of sources) {
        const relation = await tx.knowledgeObjectSource.findFirst({ where: { koId: ko.id, sourceId: source.id } })
        if (relation) await tx.knowledgeObjectSource.update({ where: { id: relation.id }, data: { relation: 'supports', note: `Knowledge Quality V2 — ${spec.code}` } })
        else await tx.knowledgeObjectSource.create({ data: { koId: ko.id, sourceId: source.id, relation: 'supports', note: `Knowledge Quality V2 — ${spec.code}` } })
      }
      let quiz = await tx.quiz.findFirst({ where: { koId: ko.id }, orderBy: { createdAt: 'asc' } })
      quiz = quiz ? await tx.quiz.update({ where: { id: quiz.id }, data: { title: `${spec.title} — Mini Quiz`, passScore: 70 } }) : await tx.quiz.create({ data: { koId: ko.id, title: `${spec.title} — Mini Quiz`, passScore: 70 } })
      const old = await tx.quizQuestion.findMany({ where: { quizId: quiz.id }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })
      for (let i = 0; i < spec.quiz.length; i++) {
        const q = spec.quiz[i]; const data = { questionText: q.q, options: JSON.stringify(q.o), correctAnswer: q.a, explanation: q.e, order: i + 1 }
        if (old[i]) await tx.quizQuestion.update({ where: { id: old[i].id }, data }); else await tx.quizQuestion.create({ data: { quizId: quiz.id, ...data } })
      }
      if (old.length > spec.quiz.length) await tx.quizQuestion.deleteMany({ where: { id: { in: old.slice(spec.quiz.length).map(q => q.id) } } })
      for (let i = 0; i < spec.cards.length; i++) await tx.flashcard.upsert({ where: { koId_order: { koId: ko.id, order: i + 1 } }, create: { koId: ko.id, order: i + 1, status: 'published', ...spec.cards[i] }, update: { status: 'published', ...spec.cards[i] } })
      const task = await tx.taskTemplate.findFirst({ where: { koId: ko.id }, orderBy: { createdAt: 'asc' } })
      const taskData = { title: `${spec.title} — Uygulama`, description: spec.task, instructions: spec.task, exampleOutput: 'Çıktı; veri, hesap, yorum ve sonraki aksiyonu birlikte göstermelidir.', checklist: JSON.stringify(['Veri kullanıldı','Hesap gösterildi','Sonuç yorumlandı','Aksiyon belirlendi']), rubric: 'Tam: veri, hesap, yorum ve aksiyon. Kısmi: bu dört öğeden biri eksik.', estimatedTime: Math.max(15, spec.minutes) }
      if (task) await tx.taskTemplate.update({ where: { id: task.id }, data: taskData }); else await tx.taskTemplate.create({ data: { koId: ko.id, ...taskData } })
    })
    console.log(`Güncellendi: ${spec.code} — ${spec.title}`)
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
