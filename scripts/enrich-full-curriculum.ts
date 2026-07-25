import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

const lenses = [
  { name: 'Mikro işletme', context: 'Sınırlı ekip ve nakitle çalışan bir mikro işletmede tek haftalık uygulanabilir bir iyileştirme seçin.' },
  { name: 'E-ticaret', context: 'Bir e-ticaret işletmesinde ürün, kanal, komisyon, iade ve müşteri deneyimi etkilerini birlikte değerlendirin.' },
  { name: 'Hizmet işletmesi', context: 'Bir hizmet işletmesinde zaman, kapasite, tahsilat ve müşteri beklentisini ölçülebilir hale getirin.' },
  { name: 'Üretim işletmesi', context: 'Bir üretim işletmesinde malzeme, işçilik, kapasite, kalite ve teslimat etkilerini ayrı ayrı izleyin.' },
  { name: 'Büyüme senaryosu', context: 'Satış hacminin yüzde olarak değiştiği bir büyüme senaryosunda maliyet, nakit ve operasyon riskini yeniden hesaplayın.' }
]

function readMetadata(raw: string): Record<string, any> { try { return JSON.parse(raw) } catch { return {} } }

function questions(title: string, description: string, gate: string, code: string) {
  const verification = gate === 'professional'
    ? 'İşlem tarihindeki resmî kaynağı kontrol edip yetkili uzman incelemesi almak'
    : gate === 'freshness'
      ? 'Karar gününde hizmet sağlayıcının resmî belge ve koşullarını yeniden kontrol etmek'
      : 'Kapsamı, dönemi ve veri kaynağını açıkça tanımlamak'
  return [
    {
      id: `${code}-q1`,
      question: `${title} çalışmasına başlarken en doğru yaklaşım hangisidir?`,
      correct_answer: 'Kapsamı, hedefi, dönemi ve başlangıç değerini yazmak',
      options: ['Kapsamı, hedefi, dönemi ve başlangıç değerini yazmak', 'Yalnızca toplam satışa bakmak', 'Kaynağı belirtmeden sektör ortalaması kullanmak', 'Sonucu ölçmeden yöntemi kalıcılaştırmak'],
      explanation: 'Ölçülebilir bir başlangıç tanımı olmadan sonuç karşılaştırılamaz.'
    },
    {
      id: `${code}-q2`,
      question: `${title} sonucunu değerlendirirken hangisi yapılmalıdır?`,
      correct_answer: 'Maliyet, fayda, risk ve veri kalitesini birlikte değerlendirmek',
      options: ['Maliyet, fayda, risk ve veri kalitesini birlikte değerlendirmek', 'Tek bir olumlu örneği genellemek', 'Yalnızca ciro değişimine bakmak', 'Olumsuz sonuçları veri dışı bırakmak'],
      explanation: `${description}; sonuç tek bir göstergeyle yorumlanmamalıdır.`
    },
    {
      id: `${code}-q3`,
      question: 'Kaynak ve güncellik açısından doğru kontrol hangisidir?',
      correct_answer: verification,
      options: [verification, 'Kaynağın başlığı uygun görünüyorsa içeriğini okumamak', 'Tarihsiz bir blog yazısını kesin kural kabul etmek', 'Değişken oranları süresiz geçerli saymak'],
      explanation: 'Kaynak otoritesi, kapsamı ve kontrol tarihi birlikte değerlendirilir.'
    }
  ]
}

async function main() {
  const rows = await prisma.knowledgeObject.findMany({ where: { code: { startsWith: 'CUR-' } }, include: { quizzes: true, taskTemplates: true }, orderBy: { code: 'asc' } })
  if (rows.length !== 600) throw new Error(`600 müfredat kaydı bekleniyordu; bulunan: ${rows.length}`)
  const wouldCreateQuiz = rows.filter(row => !row.quizzes.some(q => q.title === 'Kazanım Kontrolü V1')).length
  const wouldCreateTask = rows.filter(row => !row.taskTemplates.some(t => t.title === 'İşletmene Uygula V1')).length
  console.log(`Plan: 600 senaryo zenginleştirmesi, ${wouldCreateQuiz} quiz, ${wouldCreateTask} görev.`)
  if (!apply) { console.log('DRY RUN — veritabanı değiştirilmedi.'); return }

  let quizzes = 0
  let tasks = 0
  for (const row of rows) {
    const metadata = readMetadata(row.metadata)
    const variant = Math.max(0, (Number(row.code?.split('-').at(-1)) || 1) - 1)
    const lens = lenses[variant % lenses.length]
    const gate = row.reviewGate || 'standard'
    const qs = questions(row.title, String(metadata.subcategory || row.title), gate, row.code!)
    const scenarioMarker = '\n\n## İşletme senaryosu'
    const baseContent = row.content.includes(scenarioMarker) ? row.content.split(scenarioMarker)[0] : row.content
    const scenario = `${scenarioMarker}: ${lens.name}\n\n${lens.context}\n\n**Teslim:** Başlangıç değeri, hedef, uygulanacak adım, sorumlu, son tarih ve başarı ölçütünü tek sayfalık bir çalışma notunda gösterin.`
    const nextMetadata = JSON.stringify({ ...metadata, scenarioLens: lens.name, quizVersion: 1, taskVersion: 1,
      quiz: qs, enrichmentState: 'assessment_and_task_ready' })
    await prisma.$transaction(async tx => {
      await tx.knowledgeObject.update({ where: { id: row.id }, data: { content: baseContent + scenario, metadata: nextMetadata } })
      const existingQuiz = await tx.quiz.findFirst({ where: { koId: row.id, title: 'Kazanım Kontrolü V1' } })
      if (!existingQuiz) {
        const quiz = await tx.quiz.create({ data: { koId: row.id, title: 'Kazanım Kontrolü V1', passScore: 70 } })
        await tx.quizQuestion.createMany({ data: qs.map((q, order) => ({
          quizId: quiz.id, questionText: q.question, options: JSON.stringify(q.options), correctAnswer: q.correct_answer,
          explanation: q.explanation, order: order + 1
        })) })
        quizzes++
      }
      const existingTask = await tx.taskTemplate.findFirst({ where: { koId: row.id, title: 'İşletmene Uygula V1' } })
      if (!existingTask) {
        await tx.taskTemplate.create({ data: { koId: row.id, title: 'İşletmene Uygula V1',
          description: `${lens.name} bağlamında ${row.title} için mevcut durum, hedef, aksiyon, sorumlu, tarih ve ölçüm içeren tek sayfalık plan hazırla.`,
          estimatedTime: metadata.level === 'İleri' ? 35 : metadata.level === 'Orta' ? 25 : 15 } })
        tasks++
      }
    })
  }
  console.log(`Zenginleştirme tamamlandı: ${quizzes} quiz × 3 soru, ${tasks} uygulama görevi.`)
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
