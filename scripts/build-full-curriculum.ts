import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

type Source = { key: string; coverage: string[] }
type Topic = { title: string; description: string; category: string; subcategory: string }

const categoryNames: Record<string, string> = {
  'temel-finans': 'Temel Finans', maliyet: 'Maliyet ve Fiyatlandırma',
  'e-ticaret': 'E-Ticaret', 'hukuk-vergi': 'Hukuk ve Vergi',
  girisimcilik: 'Girişimcilik', pazarlama: 'Pazarlama'
}

const fallbackSources: Record<string, string[]> = {
  'temel-finans': ['SRC-FIN-001', 'SRC-FIN-002', 'SRC-FIN-003', 'SRC-FIN-004'],
  maliyet: ['SRC-FIN-001', 'SRC-FIN-003', 'SRC-FIN-004'],
  'e-ticaret': ['SRC-ECOM-001', 'SRC-LAW-001', 'SRC-LAW-003'],
  'hukuk-vergi': ['SRC-TAX-001', 'SRC-TAX-002', 'SRC-TAX-003', 'SRC-LAW-001', 'SRC-LAW-004', 'SRC-LAW-006'],
  girisimcilik: ['SRC-ENT-001', 'SRC-ENT-002'],
  pazarlama: ['SRC-MKT-001', 'SRC-MKT-002', 'SRC-MKT-003', 'SRC-LAW-004']
}

const highRisk = /KDV|Vergi|Fatura|E-defter|Yasal|Tüketici|Mesafeli|Gizlilik|İade Koşulları|Garanti|Çalışan|SGK|İş Kazası|Lisanslama|Franchising|Ortaklık|Çıkış Stratejisi/i
const volatile = /Komisyon|Kargo|Desi|Ekspres|Ücretsiz Kargo|Google Ads|Meta Ads|Instagram|TikTok|LinkedIn|Influencer|Affiliate|Vergi Avantaj/i

const formulas: Record<string, string> = {
  'Karlılık Oranı': '`Net kârlılık = Net kâr / Net satışlar × 100`',
  'Nakit Büyüme Oranı': '`Nakit büyümesi = (Dönem sonu nakit - Önceki dönem nakit) / Önceki dönem nakit × 100`',
  'Başabaş Noktası': '`Başabaş adedi = Sabit giderler / (Birim satış fiyatı - Birim değişken maliyet)`',
  'Gerçek Birim Maliyet': '`Birim maliyet = Ürüne yüklenen toplam maliyet / Üretilen veya satılan uygun birim sayısı`',
  'Maliyet Artı Marj': '`Satış fiyatı = Birim maliyet × (1 + maliyet üzerine eklenen oran)`',
  'Satış Marjı': '`Satış marjı = (Satış fiyatı - ilgili maliyet) / Satış fiyatı × 100`',
  'Brüt Marj': '`Brüt marj = Brüt kâr / Net satışlar × 100`',
  'Net Marj': '`Net marj = Net kâr / Net satışlar × 100`',
  'İskonto Oranı': '`İndirim oranı = İndirim tutarı / Liste fiyatı × 100`',
  'ROAS Hesaplama': '`ROAS = Reklama atfedilen gelir / Reklam harcaması`',
  'Dönüşüm Oranı': '`Dönüşüm oranı = Dönüşüm sayısı / Uygun ziyaret veya etkileşim sayısı × 100`',
  'Müşteri Edinme Maliyeti': '`CAC = Müşteri edinmeye ayrılan ilgili toplam gider / Yeni müşteri sayısı`',
  'Müşteri Yaşam Boyu Değeri': '`Basit LTV yaklaşımı = Ortalama katkı × Satın alma sıklığı × Beklenen müşteri süresi`'
}

const playbooks: Record<string, string[]> = {
  'temel-finans': ['İlgili gelir, gider ve nakit hareketlerini aynı dönem için toplayın.', 'Tahmin ile gerçekleşeni ayrı sütunlarda izleyin.', 'Farkın tutarını, nedenini ve sorumlu aksiyonu kaydedin.', 'Sonucu kâr ve nakit göstergeleriyle birlikte değerlendirin.'],
  maliyet: ['Maliyet kapsamını ve ölçüm dönemini yazın.', 'Doğrudan, dolaylı, sabit ve değişken kalemleri ayırın.', 'Ürün, sipariş ve kanal bazında hesaplayın.', 'Fiyat veya hacim değiştiğinde senaryoyu yeniden çalıştırın.'],
  'e-ticaret': ['Mevcut süreci sipariş öncesi, sipariş ve satış sonrası olarak haritalayın.', 'Sorumlu kişi, süre, maliyet ve hata noktasını kaydedin.', 'Müşteri deneyimi ile operasyon maliyetini birlikte ölçün.', 'Küçük bir pilot uygulayın ve sonuçtan sonra standardı güncelleyin.'],
  'hukuk-vergi': ['İşletme türü, işlem türü ve tarihi netleştirin.', 'Yayın gününde geçerli resmî düzenlemeyi kontrol edin.', 'Belge, onay ve saklama kanıtlarını kayıt altına alın.', 'Uygulamadan önce yetkili mali müşavir veya hukuk uzmanından görüş alın.'],
  girisimcilik: ['Varsayımı tek ve ölçülebilir bir cümleyle yazın.', 'Hedef müşteriyle düşük maliyetli kanıt toplayın.', 'Başarı ve durdurma ölçütünü testten önce belirleyin.', 'Sonuca göre sürdürme, değiştirme veya bırakma kararı verin.'],
  pazarlama: ['Hedef kitleyi ve tek bir iş hedefini seçin.', 'Mesaj, teklif, kanal ve bütçe varsayımını yazın.', 'Ölçüm olaylarını kampanya başlamadan doğrulayın.', 'Sonucu maliyet, gelir ve müşteri kalitesiyle birlikte değerlendirin.']
}

function slugify(value: string) {
  return value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseTopics(seed: string): Topic[] {
  const matches = [...seed.matchAll(/\{ title: '([^']+)', desc: '([^']+)', cat: '([^']+)', sub: '([^']+)' \}/g)]
  return matches.map(match => ({ title: match[1].trim(), description: match[2].trim(), category: match[3].trim(), subcategory: match[4].trim() }))
}

function buildContent(topic: Topic, sourceKeys: string[]) {
  const risk = highRisk.test(topic.title)
  const changes = volatile.test(topic.title)
  const formula = formulas[topic.title]
  const steps = playbooks[topic.category] || playbooks.girisimcilik
  const riskText = risk
    ? '\n\n## Zorunlu doğrulama\n\nBu konu mevzuat, vergi veya sözleşme sonucu doğurabilir. Oran, süre, parasal sınır ve yükümlülükler değişebilir. İşlem tarihinde resmî kaynağı kontrol edin ve uygulamayı yetkili uzman incelemesinden geçirin.'
    : changes
      ? '\n\n## Güncellik notu\n\nPlatform özellikleri, ücretler ve ticari koşullar değişebilir. Sabit bir oran varsaymayın; karar gününde ilgili hizmet sağlayıcının resmî sözleşme ve yardım belgelerini doğrulayın.'
      : ''
  const formulaText = formula ? `\n\n## Hesaplama çerçevesi\n\n${formula}\n\nFormüldeki kapsamı ve dönemi yazmadan farklı sonuçları karşılaştırmayın.` : ''
  return `## Öğrenme hedefleri\n\nBu bölüm sonunda **${topic.title}** kavramını açıklayabilecek, işletmeniz için temel bir uygulama planı kurabilecek ve sonucu ölçmek için doğru kontrol sorularını seçebileceksiniz.\n\n## Konunun özü\n\n${topic.description}. ${topic.title}, ${categoryNames[topic.category] || topic.category} alanında tek başına bir amaç değil, daha iyi karar vermeyi sağlayan bir araçtır. Sağlıklı uygulama için kapsam, dönem, veri kaynağı ve sorumlu kişi açıkça tanımlanmalıdır.\n\n## Neden önemlidir?\n\nBu konu; gelir, maliyet, müşteri deneyimi, operasyon riski veya yasal uyum üzerinde doğrudan etki yaratabilir. Yalnızca toplam sonuca bakmak neden-sonuç ilişkisini gizler. Sonucu ürün, kanal, müşteri ve dönem kırılımlarında incelemek daha güvenilir bir yönetim görünümü sağlar.\n\n## Uygulama adımları\n\n${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\n## Örnek uygulama\n\nBir KOBİ, ${topic.title.toLocaleLowerCase('tr-TR')} için mevcut durumu ve hedefi aynı tabloda gösterir. Bir dönemlik küçük pilot seçer; başlangıç değerini, yapılan değişikliği ve dönem sonu sonucunu kaydeder. Sonuç hedefe ulaşmadıysa yalnızca sonucu değil, varsayım ve uygulama kalitesini de inceler.${formulaText}\n\n## Kontrol listesi\n\n- Tanım ve kapsam ekip içinde aynı mı?\n- Kullanılan verinin dönemi ve kaynağı belli mi?\n- Maliyet, fayda ve risk birlikte değerlendirildi mi?\n- Sonuçtan sorumlu kişi ve sonraki kontrol tarihi belirlendi mi?\n- İddialar seçilen kaynakların gerçekten desteklediği sınırlar içinde mi?${riskText}\n\n## Kaynak kullanımı\n\nBu eğitim nesnesi ${sourceKeys.join(', ')} kaynak anahtarlarıyla ilişkilidir. Kaynak bağlantıları sistemde ayrıca saklanır; içerik, kaynak metnin kopyası değil eğitim amaçlı özgün bir sentezdir.\n\n> Genel eğitim içeriğidir; işletmeye özel hukuk, vergi, muhasebe, yatırım veya finansman danışmanlığı değildir.`
}

async function main() {
  const [seed, libraryRaw] = await Promise.all([
    readFile(resolve('prisma/seed-knowledge.ts'), 'utf8'),
    readFile(resolve('SOURCE_LIBRARY_V1.json'), 'utf8')
  ])
  const topics = parseTopics(seed)
  const library = JSON.parse(libraryRaw) as { sources: Source[] }
  if (topics.length !== 120) throw new Error(`120 konu bekleniyordu, ${topics.length} bulundu.`)
  const items = topics.map((topic, index) => {
    const exact = library.sources.filter(source => source.coverage.some(title => slugify(title) === slugify(topic.title))).map(source => source.key)
    const sourceKeys = exact.length ? exact : fallbackSources[topic.category]
    return {
      topicId: `CUR-${String(index + 1).padStart(3, '0')}`,
      ...topic,
      sourceKeys,
      reviewGate: highRisk.test(topic.title) ? 'professional' : volatile.test(topic.title) ? 'freshness' : 'standard',
      content: buildContent(topic, sourceKeys)
    }
  })
  await mkdir(resolve('content'), { recursive: true })
  await writeFile(resolve('content/full-curriculum-v1.json'), JSON.stringify({ schemaVersion: '1.0', generatedAt: new Date().toISOString(), items }, null, 2) + '\n', 'utf8')
  console.log(`120 konu üretildi: ${items.filter(item => item.reviewGate === 'professional').length} profesyonel, ${items.filter(item => item.reviewGate === 'freshness').length} güncellik, ${items.filter(item => item.reviewGate === 'standard').length} standart kapı.`)
}

main().catch(error => { console.error(error); process.exitCode = 1 })
