import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const newContent = `# Pazar Yeri Seçimi: Başlangıç Kanalını Belirleme

İnternetten satışa başlarken vereceğin ilk önemli karar "En büyük platform hangisi?" değildir. Asıl yanıtlaman gereken soru şudur:

> "Hedef müşterime ulaşabildiğim, ürün başına yeterli katkı bırakan ve mevcut kapasitemle yönetebildiğim başlangıç kanalı hangisi?"

Bir kanal çok yüksek ziyaretçi çekebilir; ancak komisyonlar, kargo, iadeler ve reklam giderleri nedeniyle sana yeterli katkı bırakmayabilir. Kendi e-ticaret sitende pazar yeri komisyonunun olmaması da o kanalın maliyetsiz olduğu anlamına gelmez; ödeme altyapısı, yazılım, reklam ve müşteri edinme giderleri hesaba katılmalıdır.

Bu dersin amacı sonsuza kadar kullanacağın kanalı seçmek değil; **ilk 30 günlük satış denemeni yapacağın kanalı somut verilerle belirlemektir**.

## 1. Ürün, Müşteri ve Operasyon Uyumunu Ölç

Değerlendirmek üzere üç seçenek belirle: **Pazar Yeri A**, **Pazar Yeri B** ve **Kendi E-Ticaret Siten**.

İşe şu cümleyi doldurarak başla:

> "Ben, [Ürünüm] ürününü; [İhtiyacı] olan [Hedef Müşterim] müşterisine satıyorum."

Ardından her kanal için şu 4 temel soruyu yanıtla:

- **Hedef Müşteri:** Müşterim bu kanalda ürün arıyor mu? Fiyata mı, görsele mi yoksa **teslimat hızına** mı bakıyor?
- **Ürün Uyumu:** Ürünüm kolay paketlenebiliyor mu, varyantı çok mu, kişiselleştirme gerekiyor mu?
- **Mali Katkı:** Tüm kesintilerden sonra ürün başına yeterli katkı kalıyor mu?
- **Operasyon:** Günlük sipariş, kargo, iade ve müşteri hizmetleri yükünü mevcut kapasitemle yönetebilir miyim?

Bu sorulardan biri cevapsızsa mağaza açma aşamasında değilsin; önce veri toplamalısın.

## 2. Finansal Gerçeklik: Katkı Payı ve Nakit Akışı

Bir platformun maliyetini yalnızca ilan edilen komisyon oranıyla öçme. Gerçek maliyet; komisyon, ödeme kesintisi, sabit işlem ücreti, kargo, reklam ve iade yükünün aynı siparişte birlikte hesaplanmasıyla görülür.

> **🛠️ Uygulama bloğu:** Katkı hesabı aşağıdaki formül bloğunda gösterilmiştir.

**Karar Araçları:**
- Komisyon sonrası kalan tutarı hızlıca görmek için **[Pazaryeri komisyonundan sonra ne kalıyor?](/app/decision-checks/DC-MARKETPLACE-004)** aracını kullan.
- Ürün bazlı nihai kârlılığını doğrulamak için **[Ürünüm gerçekten kârlı mı?](/app/decision-checks/DC-PROFIT-001)** aracına başvur.

### Kendi Site Hesabı

Kendi sitende pazar yeri komisyonu yoktur ancak sipariş başına düşen altyapı, sanal POS kesintisi, alan adı, güvenlik, içerik üretimi ve müşteri edinme (reklam) maliyetlerini eklemelisin.

### Nakit Zamanlaması

Hakedişin hesabına yattığı tarih ile tedarikçine, kargoya veya personele ödeme yaptığın tarihi karşılaştır. Hakediş, tedarikçi ödemesinden geç geliyorsa aradaki dönemi kendi paranla finanse etmen gerekir.

> **🛠️ Karar Aracı:** Nakit baskısını öngörmek için **[Nakit akışım riskli mi?](/app/decision-checks/DC-CASHFLOW-008)** aracını çalıştır.

## 3. Kanal Karşılaştırma Tablosu

| Değerlendirme Alanı | Pazar Yeri A | Pazar Yeri B | Kendi E-Ticaret Siten |
|---|---|---|---|
| Müşteri Erişimi | Platform içi arama / Hazır trafik | Platform içi arama / Hazır trafik | Trafiği reklamla sen oluşturursun |
| Ürün Uyumu | Standart listeleme ve kategoriler | Standart listeleme ve kategoriler | Özel ürün sunumu ve kişiselleştirme |
| Maliyet Yapısı | Komisyon + Sabit kesinti + Kargo | Komisyon + Sabit kesinti + Kargo | Ödeme altyapısı + Reklam + Altyapı |
| Nakit Zamanlaması | Sözleşmeli hakediş süresi | Sözleşmeli hakediş süresi | Sanal POS valör süresi |
| Operasyon & İade | Platform kurallarına bağımlı | Platform kurallarına bağımlı | İade ve iletişimi sen yönetirsin |
| En Büyük Risk | Fiyat rekabeti ve yüksek kesinti | Bağımlılık ve ceza puanları | Trafik çekememe ve yüksek reklam maliyeti |

## 4. Vaka Analizi: Derya’nın 30 Günlük Başlangıç Kararı

Ankara’da el yapımı bez çanta üreten Derya, sipariş ve paketlemeyi tek başına yönetmektedir. Ürün satış fiyatı 650 TL, ürün maliyeti 280 TL, ambalaj 25 TL ve iade payı 20 TL'dir. *(Örnek varsayımsal verilerdir.)*

| Kanal | Kesintiler | Kargo | Reklam | Tahmini Ürün Başına Katkı |
|---|---|---|---|---|
| Pazar Yeri A | 105 TL | 60 TL | 25 TL | 135 TL |
| Pazar Yeri B | 80 TL | 75 TL | 45 TL | 125 TL |
| Kendi Site | 35 TL | 80 TL | 110 TL | 100 TL |

**Derya’nın Kararı:** Derya ilk 30 günlük test için Pazar Yeri A'yı seçer.

**Seçim Gerekçeleri:**
1. Hedef kitlenin benzer ürünleri bu kanalda aradığına dair güçlü gözlem olması.
2. Tahmini hesapta ürün başına en yüksek katkıyı sunması.
3. Hazır altyapının tek kişilik operasyon kapasitesine uygunluğu.

Kendi sitesini ise pazarı, müşteri sorularını ve iade nedenlerini öğrendikten sonra değerlendirmek üzere erteler.

## 5. Kanal Seçim Kartı

Aşağıdaki şablonu kendi işletme verilerinle doldur. Bu kartı doldurmadan başlangıç kanalı kararını kesinleştirme.

> **🛠️ Uygulama bloğu:** Kanal Seçim Kartı aşağıda gösterilmiştir.

## 6. İlk 30 Gün Takip Edilecek 5 Temel Metrik

30 günlük test boyunca yalnızca satış adedine değil, şu 5 temel göstergeye bak:

1. **Dönüşüm Oranı (Sepet/Sipariş):** Ürün sayfasının ziyaretçiyi alıcıya dönüştürme gücü.
2. **Sipariş Başına Net Katkı (TL):** Her satışın tüm kesintilerden sonra işletmeye bıraktığı tutar.
3. **Müşteri Edinme Maliyeti (CAC / Reklam Payı):** Tek bir sipariş elde etmek için harcanan reklam tutarı.
4. **İade Oranı ve Nedenleri:** Ürün veya beklenti uyumsuzluğundan kaynaklanan zararlar.
5. **Hakediş-Ödeme Farkı:** Nakit akışında oluşan operasyonel sıkışma düzeyi.

## 7. Mevzuat ve Resmî Kontrol Listesi

E-ticarete başlarken aşağıdaki resmî kontrolleri tamamla. Liste detaylı uygulama bloğu olarak gösterilmiştir.

## Ders Sonu Görevi

**En az iki gerçekçi satış kanalının güncel koşullarını araştır. İşletmen için anlamlıysa kendi e-ticaret siteni üçüncü seçenek olarak ekle.**

Kararını şu cümleyle kesinleştir:

> "İlk 30 günlük satış denememe [Kanal Adı] kanalında başlayacağım. Bu kanalı seçtim çünkü [Gerekçe 1], [Gerekçe 2] ve [Gerekçe 3]. Kararımı 30 gün sonra [Metrik 1], [Metrik 2] ve [Metrik 3] verilerini kullanarak yeniden değerlendireceğim."

## Doğrulanmış Kaynaklar

1. [T.C. Ticaret Bakanlığı – ETBİS E-Ticaret Akademisi](https://eticaret.gov.tr/cevrimiciegitim)
2. [T.C. Ticaret Bakanlığı – Elektronik Ticaret Mevzuatı](https://ticaret.gov.tr/ic-ticaret/elektronik-ticaret/mevzuat)
3. [T.C. Ticaret Bakanlığı – Mesafeli Sözleşmeler Rehberi](https://tuketici.ticaret.gov.tr)
4. [Gelir İdaresi Başkanlığı – e-Belge Uygulamaları](https://ebelge.gib.gov.tr)

*(Kaynaklar kavramsal çerçeveyi destekler. Ders örneklerindeki sayılar sektör ortalaması değildir; kendi işletmenin güncel verileriyle değiştirilmelidir.)*`

const TARGET_KO_ID = 206
const TARGET_LESSON_ID = 919

async function main() {
  await prisma.knowledgeObject.update({
    where: { id: TARGET_KO_ID },
    data: {
      title: 'Pazar Yeri Seçimi: Başlangıç Kanalını Belirleme',
      content: newContent
    }
  })
  await prisma.lesson.update({
    where: { id: TARGET_LESSON_ID },
    data: {
      title: '1. Pazar Yeri Seçimi: Başlangıç Kanalını Belirleme'
    }
  })
  console.log(`KO ${TARGET_KO_ID} and lesson ${TARGET_LESSON_ID} updated`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
