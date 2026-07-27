# LocalAkademi v1.0 Master Plan

**Document Code:** LA-MP-01
**Version:** 0.1
**Status:** Draft - Product Strategy Foundation
**Target Product:** LocalAkademi v1.0
**Initial Market:** Türkiye
**Architecture Direction:** Globally scalable, country/language agnostic core

**Document Owner:** LocalAkademi Core Team

**Binding Effect:** This document is the official reference for product decisions, sprint scopes, OpenCode tasks, and architectural designs.

---

## 1. Belgenin Amacı

Bu belge, LocalAkademi'nin neden var olduğunu, hangi kullanıcı problemlerini çözdüğünü, hangi kullanıcı gruplarına nasıl değer sunduğunu ve ürünün v1.0 sürümüne kadar hangi stratejik sınırlar içinde geliştirileceğini tanımlar.

Belgenin amacı yalnızca bir vizyon cümlesi üretmek değildir. Amaç; ürün yönetimi, yazılım geliştirme, içerik üretimi, yapay zekâ mimarisi, kullanıcı deneyimi ve operasyon ekiplerinin aynı ürün anlayışına göre hareket etmesini sağlamaktır.

Bu belge aşağıdaki sorulara bağlayıcı cevap verir:
- LocalAkademi hangi temel problemi çözer?
- Ürünün birincil ve ikincil kullanıcıları kimlerdir?
- Kullanıcılar LocalAkademi'yi hangi işlerini tamamlamak için kullanır?
- Ürünün diğer eğitim, danışmanlık ve yapay zekâ çözümlerinden farkı nedir?
- Başarı hangi metriklerle ölçülür?
- v1.0 kapsamında hangi yetenekler bulunur, hangileri bilinçli olarak ertelenir?
- Türkiye ilk pazar olurken küresel genişlemeye nasıl hazırlanılır?
- Yeni özellik talepleri hangi ürün ilkeleriyle değerlendirilir?

Bu belge, üç katmanlı ürün yaklaşımını ayrıntılandırır:
1. **Knowledge Layer:** Doğrulanmış, sürümlenmiş ve kaynaklandırılmış bilgi.
2. **Formula Layer:** Denetlenebilir ve deterministik hesaplama.
3. **Reasoning Layer:** Kullanıcının bağlamına göre açıklama, yönlendirme ve aksiyon önerisi.

---

## 2. Ürün Tezi

### 2.1 Ana tez

LocalAkademi'nin ana ürün tezi şudur: Küçük işletmelerin ve girişimcilerin başarısız kararlarının önemli bir kısmı, bilgi eksikliğinden çok; doğru bilginin doğru zamanda, işletmenin gerçek bağlamına uygun ve uygulanabilir biçimde sunulamamasından kaynaklanır.

Geleneksel eğitim platformları kullanıcının bir içeriği izlemesini veya okumasını sağlar; ancak içeriğin işletmeye nasıl uygulanacağını çoğu zaman kullanıcıya bırakır. Genel amaçlı yapay zekâ araçları hızlı cevap verir; ancak yanıtın hangi kaynağa dayandığı, hesabın nasıl yapıldığı ve önerinin kullanıcının özel koşullarına uygun olup olmadığı her zaman açık değildir. Muhasebe ve ERP yazılımları ise veri kaydeder; fakat çoğu kullanıcıya neyi neden yapması gerektiğini öğretmez.

LocalAkademi bu boşluğu, eğitim ve karar desteğini aynı kullanıcı yolculuğunda birleştirerek kapatır.

### 2.2 Ürün kategorisi

LocalAkademi tek başına aşağıdaki kategorilerden biri değildir: çevrim içi kurs platformu, genel amaçlı sohbet botu, muhasebe yazılımı, iş planı hazırlama aracı, doküman arama sistemi, görev yönetim uygulaması.

LocalAkademi bunların kesişiminde konumlanan bir **işletme öğrenme ve karar destek sistemi** dir.

Ürünün kategori tanımı: Doğrulanmış işletme bilgisi, deterministik analiz araçları ve bağlamsal yapay zekâ rehberliği sunan modüler girişimcilik öğrenme platformu.

### 2.3 Kullanıcıya verilen temel söz

LocalAkademi kullanıcıya şu sözü verir: "İşletmenle ilgili bir konuda yalnızca bilgi vermekle kalmayacağız; bilgiyi anlamana, kendi verine uygulamana ve bir sonraki doğru adımı belirlemene yardımcı olacağız."

Bu söz üç kalite şartına bağlıdır:
- Yanıtın bilgi kaynağı izlenebilir olmalıdır.
- Hesaplanabilir konular formül motoruyla doğrulanmalıdır.
- Öneri, kullanıcının rolü, işletme profili ve hedefleriyle ilişkilendirilmelidir.

---

## 3. Misyon, Vizyon ve Uzun Vadeli Yön

### 3.1 Misyon

Girişimcilerin, esnafın ve küçük işletmelerin doğrulanmış bilgiye erişmesini, işletme verilerini anlamasını ve daha bilinçli kararlar almasını kolaylaştırmak.

Misyonun anahtar unsurları:
- **Erişilebilirlik:** Teknik veya finansal geçmişi olmayan kullanıcıların anlayabileceği dil.
- **Güvenilirlik:** Kaynaklandırılmış bilgi ve denetlenebilir hesaplama.
- **Uygulanabilirlik:** Her öğrenme sonucunun mümkün olduğunca somut bir aksiyona dönüşmesi.
- **Kişiselleştirme:** Aynı içeriğin farklı kullanıcı rolleri ve işletme koşulları için farklı şekilde sunulması.
- **Sürdürülebilirlik:** Kullanıcının tek seferlik cevap değil, zaman içinde gelişen bir öğrenme ve karar verme alışkanlığı kazanması.

### 3.2 Vizyon

Türkiye'de başlayan ve farklı ülke pazarlarına genişleyebilen, küçük işletmeler için en güvenilir yapay zekâ destekli öğrenme ve karar destek altyapılarından biri olmak.

Vizyon, yalnızca kullanıcı sayısı veya pazar büyüklüğü hedefi değildir. Ürünün ulaşmak istediği kalite standardını da ifade eder:
- kaynak göstermeyen kritik önerilerin azaltılması,
- hesaplamaların açıklanabilir olması,
- içeriklerin güncellik ve ülke bağlamına göre yönetilmesi,
- yapay zekânın sınırlarının açıkça belirtilmesi,
- kullanıcı davranışına göre öğrenme yolunun uyarlanması,
- ürün mimarisinin tek bir ülkenin mevzuatına kilitlenmemesi.

### 3.3 Üç yıllık yön

**Yıl 1 - Türkiye'de güvenilir çekirdek ürün**
- Temel bilgi kütüphanesinin geliştirilmesi.
- AI Mentor'un kaynaklandırılmış cevap üretmesi.
- Finansal formül motorunun ilk sürümünün tamamlanması.
- Öğrenme yolu, quiz ve görev akışlarının ürünleştirilmesi.
- Kapalı beta ve sınırlı açık beta.
- Ürün-pazar uyumu göstergelerinin ölçülmesi.

**Yıl 2 - Dikeyleşme ve kurumlarla çalışma**
- Sektör bazlı bilgi paketleri.
- Danışman ve kurum panelleri.
- Ülke/dil bağımsız içerik modelinin olgunlaştırılması.
- Kurumsal eğitim ve girişimcilik programları için B2B özellikleri.
- Gelişmiş işletme analitiği ve raporlama.

**Yıl 3 - Kontrollü uluslararası genişleme**
- İkinci dil ve ikinci ülke pilotu.
- Ülkeye özgü mevzuat ve kaynak sağlayıcı modülleri.
- Çoklu para birimi ve yerelleştirilmiş formül paketleri.
- İş ortaklığı ve uzman içerik ağı.
- Bölgesel iş geliştirme ve eğitim programlarıyla entegrasyon.

---

## 4. Hedef Pazar Yaklaşımı

### 4.1 Stratejik karar

LocalAkademi'nin ilk pazarı Türkiye'dir; ancak ürün çekirdeği, veri modeli ve içerik yaşam döngüsü farklı ülkelere uyarlanabilecek şekilde tasarlanır.

Bu kararın anlamı:
- v1.0 içinde tüm ülkeler için özellik geliştirilmez.
- Türkiye'ye özgü kullanıcı deneyimi ve içerik önceliklidir.
- Veri modellerinde ülke, dil, para birimi, yargı alanı ve kaynak kapsamı için genişleme alanı bırakılır.
- Mevzuat ve teşvik içerikleri küresel gerçekmiş gibi modellenmez.
- Ülkeye özgü kurallar çekirdek iş mantığına dağınık biçimde gömülmez.

### 4.2 Neden Türkiye ilk pazar?

- Ürünün çıkış problemi Türkiye'deki girişimcilik ve küçük işletme ihtiyaçlarından doğmuştur.
- İçerik üretimi ve doğrulaması Türkçe yürütülebilir.
- Vergi, teşvik, e-ticaret ve yerel pazarlama konularında somut kullanıcı senaryoları mevcuttur.
- Erken kullanıcı geri bildirimi doğrudan alınabilir.
- Ürünün güven ve kaynaklandırma yaklaşımı yerel ihtiyaçlarla test edilebilir.

### 4.3 Küresel hazırlık ilkeleri

- **GPR-001 - Dil bağımsızlık:** Kullanıcı arayüzü metinleri uygulama koduna dağınık biçimde gömülmemelidir.
- **GPR-002 - Ülke kapsamı:** Knowledge Object ve Source kayıtları ülke/yargı alanı kapsamı taşıyabilmelidir.
- **GPR-003 - Para birimi:** Finansal değerler yalnızca TRY varsayımıyla modellenmemelidir.
- **GPR-004 - Tarih ve sayı biçimleri:** Gösterim katmanı yerel biçimleri desteklemelidir.
- **GPR-005 - Mevzuat ayrımı:** Hukuki ve vergisel içeriklerde geçerlilik tarihi ve yargı alanı zorunlu metadata olmalıdır.
- **GPR-006 - AI bağlamı:** AI Mentor, kullanıcının ülke ve dil bağlamını cevap üretiminde açık girdi olarak kullanmalıdır.

---

## 5. Kullanıcı Segmentleri

### 5.1 Birincil segmentler

**Persona P-01 - Yeni Girişimci**

Profil: İş fikri olan veya işletmesini yeni kurmuş kişi. Finans, vergi, maliyet ve pazarlama konularında parçalı bilgiye sahiptir.

Temel hedefleri: İş fikrini yapılandırmak. Başlangıç maliyetini anlamak. Doğru fiyat belirlemek. Resmî süreçlerde hata yapmamak. İlk müşterilere ulaşmak.

Başlıca sorunları: Nereden başlayacağını bilememek. Çok fazla ve çelişkili içerikle karşılaşmak. Finansal kavramlardan çekinmek. Genel tavsiyeyi kendi işine uygulayamamak.

LocalAkademi değeri: Rol ve hedefe göre başlangıç öğrenme yolu. Adım adım iş kurma görevleri. Basitleştirilmiş finansal hesaplamalar. Kaynaklandırılmış mevzuat ve destek içerikleri. AI Mentor ile bağlamsal soru-cevap.

**Persona P-02 - Esnaf / Mikro İşletme Sahibi**

Profil: Günlük operasyonu yoğun, sınırlı zamanı olan, çoğunlukla işletme verilerini düzenli analiz etmeyen kullanıcı.

Temel hedefleri: Kârlılığı artırmak. Giderleri kontrol etmek. Müşteri sayısını artırmak. Dijital kanalları daha etkili kullanmak. Nakit sıkışıklığını azaltmak.

Başlıca sorunları: Eğitim için uzun süre ayıramamak. Ciro ile kârı karıştırmak. Maliyetleri tam hesaplayamamak. Kampanyaların sonucunu ölçememek. Tavsiyelerin fazla teorik olması.

LocalAkademi değeri: Beş-on dakikalık mikro öğrenme içerikleri. İşletme verisiyle çalışan kârlılık ve maliyet araçları. Haftalık küçük görevler. İşletmenin mevcut durumuna göre öneriler. Mobil öncelikli hızlı kullanım.

**Persona P-03 - Büyüme Aşamasındaki KOBİ Yöneticisi**

Profil: Çalışanları ve düzenli operasyonu olan, kararlarını veriyle güçlendirmek isteyen işletme sahibi veya yönetici.

Temel hedefleri: Büyümeyi sistematikleştirmek. Süreçleri ölçmek. Ekip eğitimini geliştirmek. Finansal performansı izlemek. Yeni satış kanalları açmak.

Başlıca sorunları: Bilginin ekip içinde dağınık olması. Eğitimlerin işletme hedefleriyle bağlantısız kalması. Raporların karar aksiyonuna dönüşmemesi. Danışmanlık maliyetlerinin yüksek olması.

LocalAkademi değeri: Yapılandırılmış öğrenme yolları. Yönetim ve finans göstergeleri. Ekip veya kurum özelliklerine genişleyebilen mimari. Kaynak ve hesaplamayı birleştiren karar desteği.

### 5.2 İkincil segmentler

- **Persona P-04 - Freelancer / Bağımsız Çalışan:** Teklif fiyatlandırma, gelir-gider takibi, kişisel marka, müşteri yönetimi ve vergi farkındalığı konularında desteğe ihtiyaç duyar.
- **Persona P-05 - Üniversite Öğrencisi / Girişimci Adayı:** Teorik bilgiyi uygulama senaryoları, quiz, görev ve örnek işletme verileriyle öğrenmek ister.
- **Persona P-06 - İşletme Danışmanı / Eğitmen:** Doğrulanmış içerikleri eğitimlerinde kullanmak, kullanıcı ilerlemesini görmek ve yapılandırılmış görevler sunmak ister. Bu persona v1.0'ın birincil geliştirme odağı değildir; ancak v2.0 kurumsal modelinin temelidir.

### 5.3 Segment önceliği

v1.0 ürün kararlarında öncelik sırası:
1. Yeni girişimci.
2. Esnaf ve mikro işletme sahibi.
3. Büyüme aşamasındaki küçük işletme yöneticisi.
4. Freelancer.
5. Öğrenci.
6. Danışman ve kurum kullanıcıları.

---

## 6. Jobs To Be Done

- **JTBD-001 - İşletme durumumu anlamak:** Kullanıcı gerekli verileri girer, formül motoru sonucu hesaplar, AI Mentor sonucu sade dille açıklar ve uygulanabilir aksiyonlar önerir.
- **JTBD-002 - Güvenilir bilgiye ulaşmak:** Kullanıcı güncel, geçerlilik alanı belirtilmiş, kaynaklandırılmış bilgi nesnesine ulaşır.
- **JTBD-003 - Nereden başlayacağımı belirlemek:** İhtiyaç testi sonucunda kişisel öğrenme yolu ve ilk üç görev sunulur.
- **JTBD-004 - Öğrendiğimi uygulamak:** İçerik, örnek, mini quiz ve uygulama göreviyle tamamlanır; AI Mentor kullanıcının sonucunu yorumlar.
- **JTBD-005 - Hızlı karar desteği almak:** Sistem eksik veriyi sorar, gerekli hesabı yapar, varsayımları gösterir ve seçenekleri karşılaştırır.
- **JTBD-006 - İlerlememi takip etmek:** Dashboard öğrenme, görev ve işletme gelişim sinyallerini tek görünümde sunar.

---

## 7. Değer Önerisi

### 7.1 Temel değer önerisi

LocalAkademi, dağınık işletme bilgisini kullanıcı bağlamına göre yapılandırır; bilgiyi hesaplama ve aksiyonlarla birleştirir.

**Kullanıcı kazançları:**
- Daha kısa sürede güvenilir bilgiye erişim.
- Finansal kavramları daha kolay anlama.
- Genel tavsiyeyi işletme verisine uygulama.
- Öğrenme içeriğini göreve dönüştürme.
- Hatalı veya kaynaksız öneri riskini azaltma.
- İlerlemeyi görünür kılma.

**Kullanıcının azalacak yükleri:**
- Kaynaklar arasında karşılaştırma yapma süresi.
- Karmaşık finansal formülleri elle uygulama.
- Bir sonraki adımı belirleme belirsizliği.
- Uzun ve teorik içeriklerde kaybolma.
- Genel amaçlı AI yanıtlarını doğrulama ihtiyacı.

### 7.2 Farklılaştırıcı unsurlar

- **D-001 - Doğrulanmış bilgi nesneleri:** İçerik yalnızca metin değildir; sürüm, kaynak, kategori, seviye, geçerlilik alanı ve inceleme kaydı taşıyan bir bilgi nesnesidir.
- **D-002 - Deterministik hesaplama:** AI hesaplamanın sahibi değildir. Formül motoru hesaplar; AI sonucu açıklar.
- **D-003 - Öğrenmeden aksiyona geçiş:** İçerik, quiz, görev ve mentor etkileşimi aynı akış içinde bağlanır.
- **D-004 - Kullanıcı ve işletme bağlamı:** Öneriler kullanıcının rolü, işletme verileri, tamamladığı içerikler ve hedefleriyle ilişkilendirilir.
- **D-005 - Kaynaklandırılmış AI:** AI Mentor kritik bilgi iddialarında mümkün olduğunda kullanılan Knowledge Object ve Source kayıtlarını gösterir.
- **D-006 - Yerel derinlik, küresel çekirdek:** İlk içerik ve kullanıcı deneyimi Türkiye'ye özgüdür; çekirdek mimari farklı ülke ve dillere genişleyebilir.

---

## 8. Kullanıcı Yolculuğu

### 8.1 Aşama 1 - Keşif ve kayıt

Kullanıcı ürünün ne sunduğunu kısa ve somut bir değer ifadesiyle anlamalıdır. Kayıt süreci minimum bilgi istemeli; kullanıcıdan işletme ayrıntıları ilk ekranda zorunlu tutulmamalıdır.

Başarı ölçütü: Kullanıcının kayıt formunu tamamlayıp rol seçimine geçmesi.

### 8.2 Aşama 2 - Rol ve ihtiyaç tespiti

Kullanıcı Girişimci, Esnaf, Yatırımcı veya desteklenen diğer rollerden uygun olanı seçer. Kısa ihtiyaç testi aşağıdaki alanlardan başlangıç sinyali üretir: finans ve maliyet, satış ve pazarlama, e-ticaret, hukuk ve vergi, girişimcilik, işletme operasyonu.

Başarı ölçütü: Kullanıcının ilk kişiselleştirilmiş öneri setini görmesi.

### 8.3 Aşama 3 - İlk değer anı

İlk oturumda kullanıcı en az bir somut değer elde etmelidir: işletmesiyle ilgili bir hesaplama sonucu, ihtiyaçlarına uygun kısa bir içerik, AI Mentor'dan kaynaklı bir açıklama, tamamlanabilir ilk görev.

Ürün hedefi: İlk değer anı kayıt sonrasında mümkün olan en az adımda gerçekleşmelidir.

### 8.4 Aşama 4 - Öğrenme ve uygulama

Kullanıcı içerik okur veya kısa eğitim tamamlar; ardından quiz, örnek veya görevle bilgiyi uygular. AI Mentor gerektiğinde içeriği sadeleştirir veya kullanıcının işletmesine uyarlar.

### 8.5 Aşama 5 - Düzenli kullanım

Dashboard kullanıcının açık görevlerini, önerilen öğrenme adımlarını, son mentor konuşmalarını ve temel ilerleme göstergelerini sunar.

Düzenli kullanımın amacı kullanıcının uygulamayı her gün açması değil; anlamlı bir işletme veya öğrenme ihtiyacı olduğunda güvenilir ilk başvuru noktası haline gelmesidir.

### 8.6 Aşama 6 - Sonuç ve geri bildirim

Kullanıcı tamamladığı görevlerin sonucunu işaretleyebilir, önerinin yararlı olup olmadığını belirtebilir ve gerekirse yeni hedef oluşturabilir. Bu sinyaller kişiselleştirme sistemini besler; ancak kullanıcı izni olmadan hassas profilleme yapılmaz.

---

## 9. Ürün Deneyimi İlkeleri

- **UX-001 - Basit dil:** Finansal ve teknik terimler kullanıcı seviyesine göre açıklanmalıdır. Sadeleştirme doğruluk kaybına yol açmamalıdır.
- **UX-002 - Aşamalı açıklama:** Kullanıcı önce kısa cevabı görmeli; detay, formül, kaynak ve ileri açıklama gerektiğinde açılabilmelidir.
- **UX-003 - Mobil öncelik:** Temel görevler küçük ekranda tek elle ve kısa oturumlarla tamamlanabilmelidir.
- **UX-004 - Eylem odaklılık:** Her eğitim içeriği "bu bilgiyle ne yapabilirim?" sorusunun cevabını sunmalıdır.
- **UX-005 - Güven göstergeleri:** Kaynak, güncellik tarihi, uzman inceleme durumu ve hesaplama varsayımları görünür olmalıdır.
- **UX-006 - Hata toleransı:** Kullanıcı eksik veya hatalı veri girdiğinde sistem sessizce yanlış sonuç üretmemeli; eksik alanı ve etkisini açıklamalıdır.
- **UX-007 - Kontrol kullanıcıda:** AI Mentor öneri sunar; kullanıcının onayı olmadan kritik işlem, dış gönderim veya kalıcı işletme değişikliği gerçekleştirmez.
- **UX-008 - Tutarlı geri bildirim:** Kaydetme, tamamlama, hata, yükleme ve AI işlem durumları kullanıcıya açık biçimde gösterilmelidir.

---

## 10. Ürün İlkeleri ve Karar Filtreleri

- **PF-001 - Kullanıcı problemi:** Özellik açıkça tanımlanmış bir kullanıcı problemine veya JTBD kaydına bağlanmalıdır.
- **PF-002 - Çekirdek değer:** Özellik Knowledge, Formula veya Reasoning katmanlarından en az birini güçlendirmelidir.
- **PF-003 - Ölçülebilir sonuç:** Özelliğin başarı göstergesi tanımlanmalıdır.
- **PF-004 - Güven ve doğruluk:** Özellik kaynak doğruluğu, hesap güvenliği veya kullanıcı verisi açısından yeni riskler oluşturuyorsa kontrol mekanizması tasarlanmalıdır.
- **PF-005 - Bakım maliyeti:** Bir özellik yalnızca geliştirme maliyetiyle değil, içerik güncelleme, destek, gözlemleme ve güvenlik maliyetiyle değerlendirilmelidir.
- **PF-006 - Kapsam disiplini:** v1.0'ın temel değerini doğrulamayan özellikler, popüler veya teknik olarak ilgi çekici olsa bile ertelenebilir.
- **PF-007 - Küresel uyumluluk:** Türkiye'ye özgü özellikler geliştirilebilir; ancak ülkeye özgü mantık, genişlemeyi imkânsızlaştıracak şekilde çekirdeğe gömülmemelidir.

---

## 11. Başarı Modeli

### 11.1 North Star Metric

**NSM-001: Aylık Aktif İşletme Kullanıcısı (Monthly Active Business User - MABU)**

Tanım: Bir takvim ayı içinde işletme profiline bağlı olarak en az bir anlamlı aksiyon tamamlayan benzersiz kullanıcı.

Anlamlı aksiyon örnekleri: Öğrenme içeriği tamamlama, işletme verisiyle hesaplama yapma, AI Mentor'dan kaynaklı yanıt alma, görev tamamlama, quiz tamamlama, işletme hedefi güncelleme.

### 11.2 Ürün KPI'ları

- **Aktivasyon:** Kayıttan ihtiyaç testine geçiş oranı. İlk oturumda değer anına ulaşma oranı. İlk 24 saatte tamamlanan ilk anlamlı aksiyon.
- **Etkileşim:** Aylık aktif kullanıcı başına anlamlı aksiyon. AI Mentor oturumu başına tamamlanan görev. İçerikten quiz veya göreve geçiş oranı.
- **Öğrenme:** Başlanan ve tamamlanan öğrenme yolu oranı. Quiz başarı değişimi. Aynı konuda tekrar yardım isteme oranının zaman içindeki değişimi.
- **Güven:** Kaynak görüntüleme oranı. Yararlı/yararsız mentor yanıtı geri bildirimi. Kullanıcı tarafından bildirilen hatalı bilgi sayısı. Güncellik süresi geçen yayımlanmış içerik sayısı.
- **Teknik kalite:** API hata oranı. Kritik kullanıcı akışlarının başarı oranı. AI yanıt gecikmesi. Veritabanı yedekleme ve geri yükleme doğrulama başarısı. Test ve release kalite kapıları.
- **Tutundurma:** 7, 30 ve 90 günlük geri dönüş oranı. İlk görevini tamamlayan kullanıcıların 30 günlük geri dönüşü. Aylık aktif işletme kullanıcısı büyümesi.

### 11.3 KPI kullanım ilkesi

Metrikler kullanıcıyı uygulamada daha uzun tutmak için değil, gerçek değer üretimini ölçmek için kullanılmalıdır. "Ekranda geçirilen süre" tek başına başarı metriği değildir.

---

## 12. v1.0 Ürün Hedefleri

- **GOAL-001 - Güvenilir bilgi erişimi:** Kullanıcı yayımlanmış Knowledge Object'leri kategori, seviye ve arama yoluyla bulabilmelidir. İçeriklerin kaynak, sürüm ve inceleme bilgileri bulunmalıdır.
- **GOAL-002 - Kişiselleştirilmiş başlangıç:** Rol ve ihtiyaç testine göre kullanıcıya anlamlı bir başlangıç öğrenme yolu sunulmalıdır.
- **GOAL-003 - Kaynaklı AI Mentor:** AI Mentor, yalnızca yetkili kullanıcının bağlamına erişmeli; yayımlanmamış bilgileri kullanmamalı ve uygun yanıtlarında Knowledge Object/Source atfı göstermelidir.
- **GOAL-004 - Uygulanabilir öğrenme:** İçeriklerin quiz, görev veya örneklerle desteklenebilmesi gerekir.
- **GOAL-005 - İşletme hesaplamaları:** Temel finans ve maliyet hesapları deterministik olarak yürütülmeli; girdiler, varsayımlar ve sonuçlar açıklanmalıdır.
- **GOAL-006 - İlerleme görünürlüğü:** Kullanıcı dashboard üzerinden öğrenme, görev ve mentor aktivitelerinin özetini görebilmelidir.
- **GOAL-007 - Yönetilebilir içerik sistemi:** Yetkili kullanıcılar içerik yaşam döngüsünü, kaynakları, incelemeleri ve yayın durumunu yönetebilmelidir.
- **GOAL-008 - Üretim güvenilirliği:** PostgreSQL, migration, yedekleme, gözlemlenebilirlik, güvenlik kontrolleri ve otomatik testler üretim sürecinin parçası olmalıdır.

---

## 13. v1.0 Kapsamı

### 13.1 Kimlik ve profil
- Kayıt ve giriş.
- Güvenli oturum yönetimi.
- Rol seçimi.
- Kullanıcı ve işletme profili.
- Rol tabanlı erişim kontrolü.

### 13.2 Bilgi kütüphanesi
- Knowledge Object listeleme.
- Arama, filtreleme ve sıralama.
- Detay, kaynak ve ilişkili içerik görünümü.
- Sürüm ve yayın durumu.
- Kategori ve alt kategori yönetimi.

### 13.3 Öğrenme
- Kurs ve ders yapısı.
- Öğrenme yolu.
- Enrollment ve ilerleme.
- Quiz ve sorular.
- Görev şablonları ve kullanıcı görevleri.

### 13.4 AI Mentor
- Konuşma oluşturma ve yönetme.
- Kullanıcı sahipliği ve izolasyonu.
- Kaynaklı bilgi erişimi.
- Mesaj ve token sınırları.
- Çoklu AI sağlayıcı soyutlaması.
- Hata ve kullanım kaydı.

### 13.5 İşletme analizi
- Temel veri girişleri.
- Kârlılık, maliyet ve başa baş gibi ilk formül araçları.
- Sonuç açıklaması.
- Sonuçtan göreve geçiş.

### 13.6 Yönetim
- Kullanıcı ve rol yönetimi.
- İçerik kalite ve yayın görünümü.
- Temel ürün istatistikleri.
- Audit ve operasyon kayıtlarına genişleyebilir altyapı.

### 13.7 Teknik altyapı
- PostgreSQL ve Prisma.
- Docker tabanlı geliştirme/dağıtım.
- CI testleri.
- Geri yüklemesi doğrulanmış yedekleme süreci.
- Merkezi hata ve log yaklaşımı.
- Production readiness kontrolleri.

---

## 14. v1.0 Kapsam Dışı ve Ertelenen Alanlar

Aşağıdaki başlıklar v1.0 çekirdek kapsamının dışındadır:
- Native iOS ve Android uygulamaları.
- Tam çok kiracılı kurumsal mimari.
- Kullanıcılar arası açık sosyal ağ.
- Marketplace ve üçüncü taraf satıcı ekosistemi.
- Tam kapsamlı muhasebe/ERP sistemi.
- Otomatik vergi beyannamesi veya hukuki temsil.
- Kullanıcı onayı olmadan dış sistemlerde işlem yapan otonom ajanlar.
- Çok ülke için tam mevzuat kapsamı.
- Gelişmiş ödeme ve abonelik altyapısı.
- Geniş ölçekli kurum analitiği.

Bu sınırlar, kapsamın kontrol altında tutulması ve v1.0'ın ana değer önerisinin doğrulanması için belirlenmiştir.

---

## 15. AI Mentor Ürün Konumlandırması

### 15.1 Rol

AI Mentor bir uzman, mali müşavir, avukat veya kullanıcı adına karar veren otonom yönetici değildir. Rolü:
- kullanıcının sorusunu anlamlandırmak,
- eksik bilgiyi istemek,
- doğrulanmış içerikleri bulmak,
- formül motorundan sonuç almak,
- sonucu sade biçimde açıklamak,
- alternatifleri ve riskleri göstermek,
- gerektiğinde öğrenme içeriği veya görev önermek.

### 15.2 Güven sınırları

- Kritik bilgi iddiası mümkün olduğunda kaynakla desteklenir.
- Hesap sonucu AI tarafından tahmin edilmez.
- Yayımlanmamış içerik son kullanıcı yanıtında kullanılmaz.
- Kullanıcı verileri başka kullanıcının oturumuna sızmaz.
- Kesin hukuki veya mali hüküm dili kullanılmaz.
- Güncelliği belirsiz mevzuat içeriği açık uyarı taşır.
- Kullanıcıdan gelen dokümanlar güvenli işleme katmanından geçer.

### 15.3 Başarı tanımı

AI Mentor başarısı yalnızca yanıt kalitesiyle ölçülmez. Başarılı bir mentor etkileşimi:
- sorunu doğru sınıflandırır,
- gereken veriyi toplar,
- güvenilir bağlam kullanır,
- anlaşılır cevap verir,
- kullanıcıya bir sonraki adımı gösterir,
- gereksiz kesinlikten kaçınır.

---

## 16. Ürün Riskleri ve Azaltma Stratejileri

- **RISK-001 - Güncelliğini kaybeden bilgi:** Vergi, destek veya mevzuat içerikleri eskiyebilir. Azaltma: Kaynak son kontrol tarihi, geçerlilik alanı, inceleme durumu, otomatik güncellik uyarıları ve yayın kapıları.
- **RISK-002 - AI halüsinasyonu:** Model, kaynakta bulunmayan bilgi üretebilir. Azaltma: RAG sınırları, kaynak zorunluluğu, yanıt doğrulama, düşük güven uyarısı ve deterministik araç kullanımı.
- **RISK-003 - Kullanıcının yanlış veri girmesi:** Hesaplama doğru olsa bile girdi yanlış olabilir. Azaltma: Girdi doğrulaması, açıklayıcı örnekler, aralık kontrolleri ve varsayım özeti.
- **RISK-004 - Ürünün fazla genişlemesi:** Eğitim, ERP, danışmanlık ve sosyal ağ özelliklerinin aynı anda geliştirilmesi odağı kaybettirebilir. Azaltma: v1.0 kapsam sınırı, ürün filtreleri ve sprint kabul kriterleri.
- **RISK-005 - Güven eksikliği:** Kullanıcı kaynakları veya AI sınırlarını anlamazsa ürüne güvenmeyebilir. Azaltma: Açık kaynak gösterimi, hesap açıklaması, veri kullanımı şeffaflığı ve hata bildirim kanalı.
- **RISK-006 - Düşük dijital okuryazarlık:** Birincil kullanıcıların bazıları karmaşık akışlarda zorlanabilir. Azaltma: Mobil öncelik, sade dil, aşamalı açıklama, örnek veri ve rehberli onboarding.
- **RISK-007 - Küresel mimarinin erken karmaşıklığı:** Geleceğe hazırlık adına v1.0 gereksiz karmaşık hâle gelebilir. Azaltma: Yalnızca veri ve servis sınırlarında genişleme noktaları bırakmak; kullanılmayan ülke özelliklerini erken geliştirmemek.

---

## 17. Ürün Yönetişimi

### 17.1 Karar hiyerarşisi

Ürün kararları aşağıdaki öncelik sırasına göre değerlendirilir:
1. Kullanıcı güvenliği ve veri güvenliği.
2. Bilgi ve hesaplama doğruluğu.
3. Birincil kullanıcı probleminin çözümü.
4. Kullanılabilirlik ve erişilebilirlik.
5. Teknik sürdürülebilirlik.
6. Teslim hızı.
7. Deneysel veya farklılaştırıcı özellikler.

### 17.2 Gereksinim izlenebilirliği

Her büyük özellik aşağıdaki kayıtlarla ilişkilendirilmelidir: ürün hedefi, persona veya JTBD, fonksiyonel gereksinim, teknik tasarım, test planı, başarı metriği, ilgili ADR.

### 17.3 OpenCode ve AI ajanlarının kullanımı

OpenCode, Cursor, Codex veya benzeri ajanlara verilen görevlerde:
- ilgili Master Plan belgeleri okunmalı,
- görev kapsamı açıkça sınırlandırılmalı,
- değişmez güvenlik kuralları belirtilmeli,
- kabul kriterleri test edilebilir olmalı,
- çalıştırılmayan doğrulamalar başarılı gösterilmemeli,
- görev sonunda değişen dosyalar ve açık riskler raporlanmalıdır.

AI ajanı ürün veya mimari kararın sahibi değildir. Belgelerde açık karar yoksa ajan mevcut yapıyı analiz eder, seçenekleri raporlar ve kritik kararda insan onayı ister.

---

## 18. v2.0 ve Sonrası Vizyonu

v2.0, v1.0'ın doğrulanmış çekirdeği üzerine inşa edilir. Olası kapsam:
- Çoklu dil, ikinci ülke bilgi paketi,
- kurum ve danışman çalışma alanları,
- gelişmiş belge zekâsı,
- sektör bazlı mentor araçları,
- ekip öğrenme ve performans panelleri,
- abonelik ve lisanslama,
- gelişmiş analitik,
- PWA ve native mobil uygulama,
- kontrollü entegrasyon pazarı,
- insan uzman ile AI Mentor arasında yönlendirme.

v2.0 geliştirmeleri, v1.0 kullanıcı davranışları ve ürün metrikleriyle doğrulanmadan otomatik olarak başlatılmaz.

---

## 19. Ürün Vizyonu Kabul Kriterleri

Bu belgeye göre LocalAkademi ürün vizyonu aşağıdaki şartları sağlamalıdır:
- [ ] İlk pazar Türkiye olarak açıkça tanımlanmıştır.
- [ ] Çekirdek mimari küresel genişlemeye hazırdır.
- [ ] Birincil kullanıcı segmentleri önceliklendirilmiştir.
- [ ] En az altı temel JTBD tanımlanmıştır.
- [ ] Ürünün farklılaştırıcı unsurları ölçülebilir veya doğrulanabilir biçimde açıklanmıştır.
- [ ] North Star Metric tanımlanmıştır.
- [ ] v1.0 hedefleri ve kapsam dışı alanlar ayrılmıştır.
- [ ] AI Mentor'un rolü ve sınırları belirlenmiştir.
- [ ] Yeni özellikler için karar filtreleri tanımlanmıştır.
- [ ] Başlıca ürün riskleri ve azaltma yolları kaydedilmiştir.
- [ ] Gelecek sprintler bu belgeye referans verebilir.

---

## 20. Sonuç

LocalAkademi'nin hedefi daha fazla içerik sunmak veya daha uzun yapay zekâ sohbetleri üretmek değildir. Hedef; kullanıcının bir işletme problemini güvenilir bilgiyle anlamasını, doğru yöntemle hesaplamasını ve uygulanabilir bir sonraki adıma dönüştürmesini sağlamaktır.

Bu nedenle ürünün başarısı üç unsurun birlikte çalışmasına bağlıdır: doğru ve güncel bilgi, denetlenebilir hesaplama, bağlama uygun rehberlik.

Türkiye'de başlayan ürün, yerel kullanıcı ihtiyaçlarını derinlemesine çözerken; dil, ülke, para birimi ve mevzuat kapsamını modüler biçimde genişletebilen bir çekirdek üzerinde gelişecektir.

Bu Product Vision belgesi, `02-Product-Strategy.md`, `03-System-Architecture.md`, sprint teknik tasarımları ve OpenCode görev dosyaları için bağlayıcı ürün temelidir.

---

## Ek A - Hızlı Referans

| Alan | Karar |
|---|---|
| İlk pazar | Türkiye |
| Uzun vadeli yaklaşım | Küresel genişlemeye hazır çekirdek |
| Birincil kullanıcı | Yeni girişimci, esnaf, mikro/KOBİ işletme sahibi |
| Ürün kategorisi | İşletme öğrenme ve karar destek sistemi |
| Ana değer modeli | Knowledge + Formula + Reasoning |
| North Star Metric | Aylık Aktif İşletme Kullanıcısı |
| AI rolü | Açıklama, yönlendirme, bağlamsal destek |
| AI dışı alan | Kesin hüküm, otonom kritik karar, doğrulanmamış hesap |
| v1.0 odağı | Güvenilir çekirdek ürün ve beta hazırlığı |
| v2.0 yönü | Çoklu dil/ülke, kurumlar ve gelişmiş analitik |

## Ek B - Kimlik Kodları

| Kod | Açıklama |
|---|---|
| P-XX | Persona |
| JTBD-XXX | Kullanıcının tamamlamak istediği iş |
| KP-XXX | Temel ürün ilkesi |
| GPR-XXX | Küresel hazırlık gereksinimi |
| UX-XXX | Kullanıcı deneyimi ilkesi |
| PF-XXX | Ürün karar filtresi |
| GOAL-XXX | v1.0 ürün hedefi |
| RISK-XXX | Ürün riski |
| NSM-XXX | North Star Metric |
