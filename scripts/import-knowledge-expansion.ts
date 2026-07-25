import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

type Domain = { code: string; name: string; sources: string[]; topics: [string, string][] }
type SourceItem = { key: string; url: string }
const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const levels = [
  { code: 'B', name: 'Başlangıç', minutes: 15, work: 'Kendi işletmenden tek örnek seç; mevcut durum, hedef ve ilk adımı yaz.' },
  { code: 'O', name: 'Orta', minutes: 25, work: 'Bir aylık ölçüm kur; hedef-gerçekleşen farkını nedenleriyle izle ve küçük bir deney uygula.' },
  { code: 'I', name: 'İleri', minutes: 40, work: 'Süreci segmentlere ayır; risk, duyarlılık ve alternatif senaryoları karşılaştırarak yönetim kararı hazırla.' }
]

function quiz(code: string, title: string, description: string) {
  return [
    { id: `${code}-q1`, question: `${title} uygulamasının ilk adımı nedir?`, correct_answer: 'Kapsamı, amacı, sorumluyu ve başlangıç değerini tanımlamak', options: ['Kapsamı, amacı, sorumluyu ve başlangıç değerini tanımlamak', 'Aracı satın alıp sonra hedef belirlemek', 'Tek bir örneği genellemek', 'Ölçüm yapmadan kalıcılaştırmak'], explanation: 'Karşılaştırılabilir sonuç için başlangıç ve kapsam açık olmalıdır.' },
    { id: `${code}-q2`, question: `${title} konusunda doğru yönetim yaklaşımı hangisidir?`, correct_answer: 'Fayda, maliyet, risk ve veri kalitesini birlikte değerlendirmek', options: ['Fayda, maliyet, risk ve veri kalitesini birlikte değerlendirmek', 'Yalnızca olumlu sonucu raporlamak', 'Sorumlu belirlememek', 'Kaynağın güncelliğini önemsememek'], explanation: description },
    { id: `${code}-q3`, question: 'Bir uygulamanın kalıcılaştırılması için ne gerekir?', correct_answer: 'Ölçülen sonuç, öğrenilen ders ve tanımlanmış yeni standart', options: ['Ölçülen sonuç, öğrenilen ders ve tanımlanmış yeni standart', 'Yalnızca ekip görüşü', 'Tek seferlik başarı', 'Rakibin aynı yöntemi kullanması'], explanation: 'İyileştirme, kanıt ve standartlaştırma döngüsüyle kalıcı olur.' }
  ]
}

function content(domain: Domain, title: string, description: string, level: typeof levels[number], sourceKeys: string[]) {
  const riskNote = domain.code === 'EXP' || domain.code === 'HR'
    ? '\n\n## Güncellik ve uzman kontrolü\n\nMevzuat, ülke, ürün ve işlem koşulları değişebilir. Uygulamadan önce işlem tarihindeki resmî kaynağı ve yetkili uzman görüşünü kontrol edin.' : ''
  return `## Öğrenme hedefleri\n\nBu bölüm sonunda **${title}** kavramını açıklayabilecek, işletmeniz için uygulanabilir bir çalışma kurabilecek ve sonucu ölçebileceksiniz.\n\n## Tanım\n\n${description}. Konu, ${domain.name} alanında karar kalitesini artırmak için kapsam, veri, sorumlu ve kontrol tarihiyle birlikte ele alınır.\n\n## Uygulama yöntemi\n\n1. Çözmek istediğiniz problemi ve süreç sınırını yazın.\n2. Mevcut durumu kanıtlayan başlangıç verisini toplayın.\n3. Beklenen sonucu, başarı ölçütünü ve risk sınırını belirleyin.\n4. Küçük kapsamlı bir uygulama yapın; sonucu başlangıçla karşılaştırın.\n5. Öğrenilen dersi kaydedin ve işe yarayan yöntemi sorumlu ve kontrol tarihiyle standartlaştırın.\n\n## ${level.name} seviye çalışması\n\n${level.work}\n\n## Örnek\n\nBir KOBİ, ${title.toLocaleLowerCase('tr-TR')} için son dört haftalık veriyi toplar. Tek bir süreç veya müşteri grubunda iyileştirme uygular. Sonuçları hız, kalite, maliyet ve risk açısından karşılaştırır; beklenmeyen etkileri de raporlar.\n\n## Kontrol listesi\n\n- Amaç ve kapsam açık mı?\n- Veri kaynağı ve dönem belli mi?\n- Sorumlu, tarih ve başarı ölçütü tanımlı mı?\n- Maliyet, fayda ve risk birlikte değerlendirildi mi?\n- Kaynakların güncelliği ve konuya uygunluğu kontrol edildi mi?${riskNote}\n\n## Kaynaklar\n\nBu özgün eğitim sentezi ${sourceKeys.join(', ')} kaynak anahtarlarıyla ilişkilidir. Kaynak bağlantıları knowledge base içinde ayrıca saklanır.\n\n> Genel eğitim içeriğidir; işletmeye özel hukuk, vergi, güvenlik veya yatırım danışmanlığı değildir.`
}

async function main() {
  const [packRaw, libraryRaw] = await Promise.all([
    readFile(resolve('content/knowledge-expansion-v1.json'), 'utf8'), readFile(resolve('SOURCE_LIBRARY_V1.json'), 'utf8')
  ])
  const pack = JSON.parse(packRaw) as { domains: Domain[] }
  const library = JSON.parse(libraryRaw) as { sources: SourceItem[] }
  if (pack.domains.length !== 8 || pack.domains.some(domain => domain.topics.length !== 10)) throw new Error('Paket 8 alan × 10 konu içermeli.')
  const sourceByKey = new Map(library.sources.map(source => [source.key, source]))
  const missingKeys = [...new Set(pack.domains.flatMap(domain => domain.sources))].filter(key => !sourceByKey.has(key))
  if (missingKeys.length) throw new Error(`Kaynak anahtarları eksik: ${missingKeys.join(', ')}`)
  const allUrls = [...new Set(pack.domains.flatMap(domain => domain.sources).map(key => sourceByKey.get(key)!.url))]
  const dbSources = await prisma.source.findMany({ where: { url: { in: allUrls } } })
  if (dbSources.length !== allUrls.length) throw new Error('Yeni kaynakları önce npm run sources:import -- --apply ile içe aktarın.')
  const sourceByUrl = new Map(dbSources.map(source => [source.url, source]))
  const expected = pack.domains.length * 10 * levels.length
  const existing = await prisma.knowledgeObject.count({ where: { code: { startsWith: 'KBX-' } } })
  console.log(JSON.stringify({ domains: 8, topics: 80, variants: expected, existing, apply }, null, 2))
  if (!apply) { console.log('DRY RUN — veritabanı değiştirilmedi.'); return }

  let written = 0
  for (const domain of pack.domains) {
    const category = await prisma.category.upsert({ where: { name: domain.name }, update: { isActive: true }, create: { name: domain.name, slug: `kbx-${domain.code.toLowerCase()}`, description: `${domain.name} knowledge base alanı` } })
    const linkedSources = domain.sources.map(key => sourceByUrl.get(sourceByKey.get(key)!.url)!)
    for (let topicIndex = 0; topicIndex < domain.topics.length; topicIndex++) {
      const [title, description] = domain.topics[topicIndex]
      for (const level of levels) {
        const code = `KBX-${domain.code}-${String(topicIndex + 1).padStart(3, '0')}-${level.code}`
        const qs = quiz(code, title, description)
        const metadata = JSON.stringify({ category: domain.name, level: level.name, estimatedTime: `${level.minutes} dakika`, sourceKeys: domain.sources,
          quiz: qs, expansionVersion: 1, editorialState: 'source_checked_review_pending' })
        const ko = await prisma.knowledgeObject.upsert({ where: { code }, update: { title, content: content(domain, title, description, level, domain.sources), metadata,
          categoryId: category.id, status: 'in_review', verificationStatus: 'pending_review', reviewGate: domain.code === 'EXP' || domain.code === 'HR' ? 'professional' : 'standard', isDemo: false, publishedAt: null },
          create: { code, slug: code.toLowerCase(), type: topicIndex % 3 === 0 ? 'procedure' : 'concept', title,
            content: content(domain, title, description, level, domain.sources), embedding: '[]', metadata, categoryId: category.id,
            status: 'in_review', verificationStatus: 'pending_review', reviewGate: domain.code === 'EXP' || domain.code === 'HR' ? 'professional' : 'standard', isDemo: false } })
        await prisma.knowledgeObjectSource.deleteMany({ where: { koId: ko.id } })
        await prisma.knowledgeObjectSource.createMany({ data: linkedSources.map(source => ({ koId: ko.id, sourceId: source.id, relation: 'supports', note: 'Knowledge expansion V1' })) })
        const existingQuiz = await prisma.quiz.findFirst({ where: { koId: ko.id, title: 'Yeni Alan Kazanım Testi V1' } })
        if (!existingQuiz) {
          const created = await prisma.quiz.create({ data: { koId: ko.id, title: 'Yeni Alan Kazanım Testi V1', passScore: 70 } })
          await prisma.quizQuestion.createMany({ data: qs.map((q, index) => ({ quizId: created.id, questionText: q.question, options: JSON.stringify(q.options), correctAnswer: q.correct_answer, explanation: q.explanation, order: index + 1 })) })
        }
        if (!(await prisma.taskTemplate.findFirst({ where: { koId: ko.id, title: 'Yeni Alan Uygulaması V1' } }))) {
          await prisma.taskTemplate.create({ data: { koId: ko.id, title: 'Yeni Alan Uygulaması V1', description: `${title} için mevcut durum, hedef, aksiyon, sorumlu, tarih ve başarı ölçütü içeren tek sayfalık plan hazırla.`, estimatedTime: level.minutes } })
        }
        written++
      }
    }
  }
  console.log(`${written} yeni KO yazıldı veya güncellendi; tamamı incelemeye alındı, otomatik yayımlanmadı.`)
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
