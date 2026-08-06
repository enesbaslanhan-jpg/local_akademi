const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()
const DATA_DIR = path.resolve(__dirname, 'data')
const LESSON_MINUTES = 14
const TASK_MINUTES = 15
const INTEGRATION_KEY = 'operations-wave-2'

const SUPPORTED_BLOCK_TYPES = new Set([
  'formula',
  'checklist',
  'common_mistake',
  'quick_application'
])

const FORBIDDEN_VISIBLE_PATTERNS = [
  { label: 'DOCX', pattern: /\.docx|docxdocx/i },
  { label: 'Plaintext', pattern: /plaintext/i },
  { label: 'raw LaTeX', pattern: /\$\$|\\text\s*\{|\\frac\s*\{|\\mathbf\s*\{|\\times/ },
  { label: 'genel müdür', pattern: /genel müdür/i },
  { label: 'aylık yönetim toplantısı', pattern: /aylık yönetim toplantısı/i },
  { label: 'kanıt çantası', pattern: /kanıt çantası/i },
  { label: 'iyileştirme A3', pattern: /iyileştirme\s+A3/i },
  { label: 'ortak course intro', pattern: /ortak course intro/i }
]

const TARGETS = [
  {
    koId: 636,
    code: 'KBX-OPS-001-B',
    courseId: 231,
    lessonId: 999,
    file: 'operations-wave-2-ko636.md',
    artifact: 'Sipariş Akış Haritası',
    structure: 'field-observation-journey',
    taskTitle: 'Sipariş Akış Haritası',
    checklist: [
      'Yakın zamanda tamamlanan gerçek bir sipariş seçildi.',
      'Başlangıç ve bitiş olayları gözlenebilir biçimde yazıldı.',
      'Fiilî akışta işlem, bekleme, karar ve devirler işaretlendi.',
      'Zannedilen akış ile fiilî akış arasındaki fark yazıldı.',
      'En uzun bekleme veya en belirsiz devir kanıtıyla seçildi.'
    ],
    blocks: [
      block('opening_case', 'quick_application', 'Kargo yetişmedi, ama gecikme nerede başladı?', {
        mainContent: 'Kısa işlemlerden oluşan bir siparişin neden bir günü aştığını fiilî akış üzerinden incele.',
        quickSteps: ['Siparişin görünen ana adımlarını yaz.', 'Bekleme ve sorumluluk devirlerini ayrıca işaretle.', 'Gecikmenin başladığı noktayı kayıtlarla bul.']
      }),
      block('field_observation', 'quick_application', 'Bir sipariş seç ve peşinden yürü', {
        mainContent: 'Olması gereken süreci değil, yakın zamanda tamamlanan tek bir siparişin kayıtlarını izle.',
        quickSteps: ['Başlangıç ve bitiş olayını belirle.', 'Her adımda ne, kim ve ne zaman sorularını yanıtla.', 'Bir sonraki adıma hemen mi geçtiğini kaydet.']
      }),
      block('marking_key', 'checklist', 'Akış işaretleme anahtarı', {
        checklistItems: ['● İşlem: aktif çalışma', '⏳ Bekleme: iş ilerlemiyor', '◇ Karar: akış cevaba göre ayrılıyor', '→ Devir: sorumluluk el değiştiriyor']
      }),
      block('quick_application', 'quick_application', 'İki sınırı yaz', {
        quickSteps: ['Gözlenebilir başlangıç olayını yaz.', 'Gözlenebilir bitiş olayını yaz.', 'Sınırın dışında kalan işleri şimdilik haritaya alma.']
      }),
      block('process_map', 'quick_application', 'Sipariş Akış Haritası', {
        mainContent: 'Zannedilen akış ile fiilî akışı karşılaştır ve en görünür sorunu seç.',
        quickSteps: ['Gerçek adımları sırala.', 'Toplam akış süresini başlangıç ve bitiş zamanından bul.', 'En uzun bekleme veya en belirsiz devri kanıtıyla kaydet.']
      })
    ]
  },
  {
    koId: 642,
    code: 'KBX-OPS-003-B',
    courseId: 231,
    lessonId: 1001,
    file: 'operations-wave-2-ko642.md',
    artifact: 'Darboğaz Teşhis Tablosu',
    structure: 'quantitative-diagnostic-case',
    taskTitle: 'Darboğaz Teşhis Tablosu',
    checklist: [
      'Birbirini izleyen üç veya dört işlem adımı seçildi.',
      'Aynı dönem için kullanılabilir süre, birim süre ve paralel kaynak sayısı yazıldı.',
      'Tahmini kapasite aynı çıktı biriminde hesaplandı.',
      'Kuyruk veya boş bekleme gözlemi kaydedildi.',
      'İlk inceleme yöneltilecek adım veriyle gerekçelendirildi.'
    ],
    blocks: [
      block('diagnostic_case', 'common_mistake', 'En uzun işlem her zaman darboğaz mı?', {
        mistake: 'Tek ürün için en uzun süren adımı doğrudan darboğaz ilan etmek.',
        correctApproach: 'Kullanılabilir süreyi, paralel kaynak sayısını, toplam kapasiteyi ve saha işaretlerini birlikte karşılaştır.'
      }),
      block('initial_hypothesis', 'quick_application', 'İlk tahminini kaydet', {
        quickSteps: ['Darboğaz olduğunu düşündüğün adımı seç.', 'Tahmininin dayanağını yaz.', 'Hesap sonucundan sonra tahminini yeniden değerlendir.']
      }),
      block('formula', 'formula', 'Tahmini günlük kapasite', {
        mainContent: 'Bütün adımları aynı çıktı ve zaman biriminde karşılaştır.',
        formula: 'Tahmini günlük kapasite = kullanılabilir süre × paralel kaynak sayısı ÷ birim işlem süresi',
        example: '420 dakika × 1 çalışan ÷ 8 dakika = 52,5; tamamlanabilir tahmini kapasite yaklaşık 52 sipariş/gün.'
      }),
      block('evidence_check', 'checklist', 'Darboğaz kanıt kontrolü', {
        checklistItems: ['Adım önünde düzenli kuyruk var mı?', 'Aşağı akıştaki adım iş bekliyor mu?', 'Kapasite hesabı gerçek günlük çıktıyla uyumlu mu?', 'Arıza, mola, ürün çeşidi ve yeniden işleme ayrıca not edildi mi?']
      }),
      block('bottleneck_table', 'quick_application', 'Darboğaz Teşhis Tablosu', {
        quickSteps: ['Her adımın tahmini kapasitesini hesapla.', 'Gerçek çıktı ve kuyrukla karşılaştır.', 'Toplam çıktıyı sınırlayan ilk inceleme noktasını seç.']
      })
    ]
  },
  {
    koId: 648,
    code: 'KBX-OPS-005-B',
    courseId: 231,
    lessonId: 1003,
    file: 'operations-wave-2-ko648.md',
    artifact: 'Kalite Kontrol Planı',
    structure: 'backward-error-hunt',
    taskTitle: 'Kalite Kontrol Planı',
    checklist: [
      'Tek bir hata veya müşteri şikâyeti seçildi.',
      'Hatanın olası oluşum noktası ile kontrol noktası ayrıldı.',
      'Kabul ölçütü gözlenebilir biçimde yazıldı.',
      'En fazla iki öncelikli kalite kontrol noktası seçildi.',
      'Uygunsuzluk bulunduğunda yapılacak işlem belirtildi.',
      'Yalnız gerçekleşen kalite kaybı kalemleri kaydedildi.'
    ],
    blocks: [
      block('customer_complaint_case', 'common_mistake', 'Kusurlu kavanoz müşterinin elinde', {
        mistake: 'Hata sonrası bütün ürünleri tekrar tekrar kontrol ederek kontrol yükünü büyütmek.',
        correctApproach: 'Hatanın oluştuğu ve daha düşük yükle yakalanabileceği noktaları ayır; iki öncelikli kontrol noktası seç.'
      }),
      block('backward_error_trace', 'quick_application', 'Hatayı geriye doğru izle', {
        quickSteps: ['Müşterinin gördüğü kusurdan başla.', 'Süreç adımlarını geriye doğru sırala.', 'Oluşum noktası ile yakalama noktasını ayrı yaz.']
      }),
      block('criteria_transformation', 'quick_application', 'Belirsiz şartı kabul ölçütüne çevir', {
        mainContent: '“Kaliteli olsun” yerine iki kontrol edenin aynı kararı verebileceği bir ölçüt yaz.',
        quickSteps: ['Kontrol edilecek özelliği seç.', 'Uygun ve uygun olmayan durumu gözlenebilir yaz.', 'Gerekiyorsa ölçü birimi ve kabul aralığı ekle.']
      }),
      block('control_point_selection', 'checklist', 'Kontrol noktası seçim testi', {
        checklistItems: ['Kusur burada görülmezse müşteriye ilerler mi?', 'Burada kontrol etmek sonraki aşamadan daha kolay mı?', 'Kontrol kısa ve tekrarlanabilir mi?', 'Uygun olmayan ürün bulunduğunda tepki belli mi?']
      }),
      block('quality_control_card', 'quick_application', 'Kalite Kontrol Planı', {
        quickSteps: ['Özellik ve kabul ölçütünü yaz.', 'Yöntem, sıklık, sorumlu ve kaydı belirle.', 'Uygunsuzluk tepkisini ve görünür kalite kaybını kaydet.']
      })
    ]
  },
  {
    koId: 651,
    code: 'KBX-OPS-006-B',
    courseId: 232,
    lessonId: 1004,
    file: 'operations-wave-2-ko651.md',
    artifact: 'Kök Neden Sorgulama Kaydı',
    structure: 'evidence-led-inquiry',
    taskTitle: 'Kök Neden Sorgulama Kaydı',
    checklist: [
      'En az iki kez tekrarlanan tek bir sorun seçildi.',
      'Sorun dönem, olay sayısı ve beklenen şartla tanımlandı.',
      'Neden cevapları varsayım, destekleniyor veya çürütüldü olarak işaretlendi.',
      'En az bir neden iddiası doğrudan kanıta bağlandı.',
      'Eksik kanıt ve küçük doğrulama sınaması yazıldı.'
    ],
    blocks: [
      block('inquiry_dialogue', 'quick_application', '“Neden?” sorusunu olay üzerinden ilerlet', {
        quickSteps: ['Ölçülebilir sorun cümlesini yaz.', 'İlk “neden?” cevabını kaydet.', 'Cevabı kanıtlamadan sonraki sonuca atlama.']
      }),
      block('evidence_or_assumption', 'checklist', 'Kanıt mı, varsayım mı?', {
        checklistItems: ['İddia bir kayıt veya gözleme dayanıyor mu?', 'Hatalı ve hatasız örnekler karşılaştırıldı mı?', 'Alternatif açıklamalar açık mı?', 'Kanıt yoksa “doğrulanmadı” olarak işaretlendi mi?']
      }),
      block('cause_chain', 'quick_application', 'Neden zincirini kur', {
        mainContent: 'Beş sayısı zorunlu değildir; ilk belirtide durmamak için soruyu gerektiği kadar sürdür.',
        quickSteps: ['Her cevabı bir sonraki neden sorusuna dönüştür.', 'Zincir ayrılıyorsa yeni bir dal aç.', 'Kanıtın bittiği yerde kesin hüküm verme.']
      }),
      block('alternative_cause_check', 'common_mistake', 'İlk mantıklı nedeni kök neden sanmak', {
        mistake: '“Çalışan dikkatsizdi” veya “yoğunluktan oldu” açıklamasını ölçmeden kabul etmek.',
        correctApproach: 'İnsan, yöntem, bilgi, ekipman ve çalışma koşullarındaki alternatifleri kayıt, gözlem veya küçük bir denemeyle karşılaştır.'
      }),
      block('root_cause_sheet', 'quick_application', 'Kök Neden Sorgulama Kaydı', {
        quickSteps: ['En güçlü neden adayını ve kanıtını yaz.', 'Eksik kanıtı açıkça belirt.', 'Küçük, güvenli sınamayı ve değerlendirme ölçütünü belirle.']
      })
    ]
  },
  {
    koId: 789,
    code: 'KBX-SCM-002-B',
    courseId: 241,
    lessonId: 1050,
    file: 'operations-wave-2-ko789.md',
    artifact: 'Tedarikçi Performans Kartı',
    structure: 'supplier-decision-lab',
    taskTitle: 'Tedarikçi Performans Kartı',
    checklist: [
      'En az iki tedarikçi aynı ürün ve dönem için karşılaştırıldı.',
      'Her puan ham değer ve örnek sayısıyla gösterildi.',
      'Puan eşikleri ve ağırlıklar sonuçtan önce belirlendi.',
      'Ağırlıkların toplamı yüzde 100 olarak kontrol edildi.',
      'Sonucu değiştirebilecek veri boşluğu yazıldı.',
      'Tek kaynak riski ve alternatif plan not edildi.'
    ],
    blocks: [
      block('comparison_case', 'quick_application', 'Üç tedarikçiyi ham verilerle karşılaştır', {
        quickSteps: ['Aynı ürün ve dönem için fiyatı yaz.', 'Teslimat, kusursuz kabul ve yanıt verilerini ekle.', 'Örnek sayısını görünür tut.']
      }),
      block('priority_weighting', 'checklist', 'Öncelik ağırlıklarını belirle', {
        checklistItems: ['Ağırlıklar sonucu görmeden önce seçildi mi?', 'Toplam yüzde 100 mü?', 'Yüksek ağırlığın işletme gerekçesi yazıldı mı?', 'Ağırlık değiştiğinde sıralama yeniden kontrol edildi mi?']
      }),
      block('scoring_scale', 'quick_application', 'Ham veriyi ortak puan ölçeğine çevir', {
        mainContent: 'Puanlama evrensel standart değil, farklı birimleri karşılaştırmaya yarayan sade bir yönetim yöntemidir.',
        quickSteps: ['1–5 arası eşikleri önceden yaz.', 'Her puanın yanında ham değeri göster.', 'Ölçülmeyen veriye puan uydurma.']
      }),
      block('weighted_calculation', 'formula', 'Ağırlıklı toplam puan', {
        formula: 'Ağırlıklı toplam puan = her ölçütün puanı × ağırlığı; sonra katkıların toplamı',
        example: 'Kalite puanı 4 ve kalite ağırlığı 0,35 ise kalite katkısı 1,40 olur.'
      }),
      block('sensitivity_check', 'checklist', 'Sonuç duyarlılık kontrolü', {
        checklistItems: ['En yüksek puanı taşıyan ham veri güçlü mü?', 'Az sayıdaki sipariş sonucu yanıltıyor olabilir mi?', 'Kalite ağırlığı artınca sıralama değişiyor mu?', 'Tek kaynak kesintisi için alternatif var mı?']
      }),
      block('supplier_scorecard', 'quick_application', 'Tedarikçi Performans Kartı', {
        quickSteps: ['Ham veri, puan ve ağırlığı aynı kayıtta göster.', 'Ağırlıklı toplamı hesapla.', 'Kararı, veri boşluğunu ve tek kaynak riski uyarısını yaz.']
      })
    ]
  }
]

function block(originalType, type, title, content) {
  return {
    id: `${INTEGRATION_KEY}-${originalType}`,
    originalType,
    type,
    title,
    shortDescription: null,
    content,
    relatedDecisionCheckCode: null
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function readJson(value) {
  try { return JSON.parse(value || '{}') } catch { return {} }
}

function extractMetaValue(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = markdown.match(new RegExp(`^- \\*\\*${escaped}:\\*\\*\\s*(.+)$`, 'mi'))
  return match ? match[1].trim() : null
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell))
}

function convertTablesToCards(markdown) {
  const lines = markdown.split('\n')
  const output = []
  for (let index = 0; index < lines.length;) {
    if (
      lines[index].trim().startsWith('|') &&
      index + 1 < lines.length &&
      lines[index + 1].trim().startsWith('|')
    ) {
      const headers = splitTableRow(lines[index])
      const separators = splitTableRow(lines[index + 1])
      if (headers.length === separators.length && isSeparatorRow(separators)) {
        index += 2
        const rows = []
        while (index < lines.length && lines[index].trim().startsWith('|')) {
          rows.push(splitTableRow(lines[index]))
          index++
        }
        rows.forEach((row, rowIndex) => {
          const first = row[0] || `Kayıt ${rowIndex + 1}`
          output.push(`**${headers[0]}: ${first}**`)
          for (let cellIndex = 1; cellIndex < headers.length; cellIndex++) {
            output.push(`- **${headers[cellIndex]}:** ${row[cellIndex] || '—'}`)
          }
          output.push('')
        })
        continue
      }
    }
    output.push(lines[index])
    index++
  }
  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function parseSources(sourceSection) {
  const sources = []
  const pattern = /^- \[([^\]]+)\]\((https?:\/\/[^)]+)\)(?::\s*(.*))?$/gm
  let match
  while ((match = pattern.exec(sourceSection)) !== null) {
    sources.push({ title: match[1].trim(), url: match[2].trim(), note: (match[3] || '').trim() || null })
  }
  return sources
}

function parseLessonFile(target) {
  const filePath = path.join(DATA_DIR, target.file)
  assert(fs.existsSync(filePath), `Source file missing: ${filePath}`)
  const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').trim()
  const metadataStart = raw.indexOf('## Metadata')
  const lessonStartMatch = /\n## (?!Metadata|Kaynaklar|Ders sonu uygulama)/.exec(raw.slice(metadataStart + 1))
  assert(metadataStart >= 0 && lessonStartMatch, `${target.file}: metadata or lesson body heading missing`)
  const lessonStart = metadataStart + 1 + lessonStartMatch.index + 1
  const taskStart = raw.indexOf('\n## Ders sonu uygulama', lessonStart)
  const sourcesMatch = /\n## (?:Doğrudan yöntem )?Kaynakları?\b/i.exec(raw.slice(lessonStart))
  const sourcesStart = sourcesMatch ? lessonStart + sourcesMatch.index : -1
  assert(taskStart > lessonStart, `${target.file}: task section missing`)
  assert(sourcesStart > taskStart, `${target.file}: sources section missing`)

  const title = extractMetaValue(raw, 'Başlık')
  const summary = extractMetaValue(raw, 'Özet')
  const outcomesRaw = extractMetaValue(raw, 'Öğrenme çıktıları')
  const lessonDuration = extractMetaValue(raw, 'Ders süresi')
  const taskDuration = extractMetaValue(raw, 'Görev süresi')
  const outcomes = (outcomesRaw || '').split(';').map(item => item.trim()).filter(Boolean)
  const content = convertTablesToCards(raw.slice(lessonStart, taskStart).trim())
  const taskWithHeading = raw.slice(taskStart + 1, sourcesStart).trim()
  const task = convertTablesToCards(taskWithHeading.replace(/^## Ders sonu uygulama[^\n]*\n*/i, '').trim())
  const sources = parseSources(raw.slice(sourcesStart + 1))

  assert(title && summary, `${target.file}: title or summary missing`)
  assert(outcomes.length >= 3, `${target.file}: at least 3 learning outcomes required`)
  assert(lessonDuration === '14 dakika', `${target.file}: lesson duration must be 14 dakika`)
  assert(taskDuration === '15 dakika', `${target.file}: task duration must be 15 dakika`)
  assert(content && task, `${target.file}: visible content or task is empty`)
  assert(sources.length > 0, `${target.file}: no direct source URLs found`)
  assert(new Set(sources.map(source => source.url)).size === sources.length, `${target.file}: duplicate source URLs`)
  assert(!/^#\s+KO\s+/m.test(content), `${target.file}: raw KO heading leaked into content`)
  assert(!/^## Metadata/m.test(content), `${target.file}: raw metadata heading leaked into content`)

  const visible = [title, summary, outcomes.join(' '), content, task].join('\n')
  for (const forbidden of FORBIDDEN_VISIBLE_PATTERNS) {
    assert(!forbidden.pattern.test(visible), `${target.file}: forbidden visible text found (${forbidden.label})`)
  }
  return { filePath, title, summary, outcomes, content, task, sources }
}

function cleanMetadata(oldMetadata, target, lessonData) {
  const metadata = { ...oldMetadata }
  for (const staleKey of [
    'artifact', 'commonCourseIntro', 'courseIntro', 'decisionTool', 'decisionTools',
    'genericTask', 'persona', 'scenarioLens', 'sourceKeys', 'tools'
  ]) delete metadata[staleKey]

  return {
    ...metadata,
    summary: lessonData.summary,
    task: lessonData.task,
    taskChecklist: target.checklist,
    estimatedTime: `${LESSON_MINUTES} dakika`,
    estimatedMinutes: LESSON_MINUTES,
    taskDuration: `${TASK_MINUTES} dakika`,
    taskEstimatedMinutes: TASK_MINUTES,
    learningOutcomes: lessonData.outcomes,
    coursePurpose: lessonData.summary,
    courseOutcomes: lessonData.outcomes,
    solvedProblem: lessonData.summary,
    targetRole: 'KOBİ sahibi veya konu sorumlusu',
    learningArtifact: target.artifact,
    nextAction: lessonData.task,
    visibleLearningStructure: target.structure,
    embeddedPracticeBlocksVersion: INTEGRATION_KEY,
    embeddedPracticeBlocks: target.blocks,
    embeddedPracticeBlockMappings: target.blocks.map(item => ({
      requestedType: item.originalType,
      rendererType: item.type
    })),
    decisionToolLinks: [],
    decisionTools: [],
    tools: [],
    sourceUrls: lessonData.sources.map(source => source.url),
    contentIntegration: INTEGRATION_KEY
  }
}

async function verifyRelation(client, target) {
  const lesson = await client.lesson.findUnique({
    where: { id: target.lessonId },
    include: { course: true, knowledgeObject: true }
  })
  assert(lesson, `Lesson ${target.lessonId} not found`)
  assert(lesson.courseId === target.courseId, `Lesson ${target.lessonId} course ${lesson.courseId}; expected ${target.courseId}`)
  assert(lesson.knowledgeObjectId === target.koId, `Lesson ${target.lessonId} KO ${lesson.knowledgeObjectId}; expected ${target.koId}`)
  assert(lesson.knowledgeObject.code === target.code, `KO ${target.koId} code ${lesson.knowledgeObject.code}; expected ${target.code}`)
  assert(lesson.knowledgeObject.status === 'published', `KO ${target.koId} is not published`)
  assert(Boolean(lesson.knowledgeObject.publishedAt), `KO ${target.koId} has no publishedAt`)
  assert(lesson.course.published === true, `Course ${target.courseId} is not published`)
  const taskCount = await client.taskTemplate.count({ where: { koId: target.koId } })
  assert(taskCount === 1, `KO ${target.koId} has ${taskCount} task templates; expected exactly 1`)
  const cardLinks = await client.practicalCardKnowledgeObject.count({ where: { knowledgeObjectId: target.koId } })
  assert(cardLinks === 0, `KO ${target.koId} has ${cardLinks} practical-card links; expected 0 before scoped metadata integration`)
  return lesson
}

async function preflightAll(client, parsedTargets) {
  const seenKos = new Set()
  const seenLessons = new Set()
  for (const item of parsedTargets) {
    assert(!seenKos.has(item.target.koId), `Duplicate KO target ${item.target.koId}`)
    assert(!seenLessons.has(item.target.lessonId), `Duplicate lesson target ${item.target.lessonId}`)
    seenKos.add(item.target.koId)
    seenLessons.add(item.target.lessonId)
    const lesson = await verifyRelation(client, item.target)
    console.log(`  ✓ KO ${item.target.koId} / ${item.target.code} / Course ${item.target.courseId} / Lesson ${item.target.lessonId} / KO published / Course published`)
    assert(lesson.courseId === item.target.courseId && lesson.knowledgeObjectId === item.target.koId, 'Relationship changed during preflight')
  }
  assert(new Set(parsedTargets.map(item => item.data.summary)).size === parsedTargets.length, 'Summaries must be structurally distinct')
}

async function syncSources(client, target, sources) {
  const desiredUrls = new Set(sources.map(source => source.url))
  const existing = await client.knowledgeObjectSource.findMany({
    where: { koId: target.koId },
    include: { source: true },
    orderBy: { createdAt: 'asc' }
  })
  const keptUrls = new Set()
  const deleteIds = []
  for (const link of existing) {
    const url = link.source.url || ''
    if (!desiredUrls.has(url) || keptUrls.has(url)) deleteIds.push(link.id)
    else keptUrls.add(url)
  }
  if (deleteIds.length > 0) {
    await client.knowledgeObjectSource.deleteMany({ where: { id: { in: deleteIds } } })
  }

  for (const desired of sources) {
    const current = await client.knowledgeObjectSource.findFirst({
      where: { koId: target.koId, source: { url: desired.url } },
      include: { source: true }
    })
    if (current) {
      if (current.note !== desired.note) {
        await client.knowledgeObjectSource.update({ where: { id: current.id }, data: { note: desired.note } })
      }
      continue
    }
    let source = await client.source.findFirst({ where: { title: desired.title, url: desired.url } })
    if (!source) {
      source = await client.source.create({
        data: { title: desired.title, url: desired.url, authorityLevel: 'medium', lastChecked: new Date() }
      })
    }
    await client.knowledgeObjectSource.create({
      data: { koId: target.koId, sourceId: source.id, relation: 'references', note: desired.note }
    })
  }
  return client.knowledgeObjectSource.count({ where: { koId: target.koId } })
}

async function updateTarget(client, item) {
  const { target, data } = item
  const ko = await client.knowledgeObject.findUnique({ where: { id: target.koId } })
  assert(ko, `KO ${target.koId} disappeared before update`)
  const metadata = cleanMetadata(readJson(ko.metadata), target, data)

  await client.knowledgeObject.update({
    where: { id: target.koId },
    data: {
      title: data.title,
      summary: data.summary,
      content: data.content,
      task: data.task,
      metadata: JSON.stringify(metadata)
    }
  })
  await client.lesson.update({
    where: { id: target.lessonId },
    data: { title: data.title, content: data.content, estimatedMinutes: LESSON_MINUTES }
  })
  const template = await client.taskTemplate.findFirst({ where: { koId: target.koId } })
  assert(template, `KO ${target.koId} task template disappeared before update`)
  await client.taskTemplate.update({
    where: { id: template.id },
    data: {
      title: target.taskTitle,
      description: data.task,
      estimatedTime: TASK_MINUTES,
      instructions: JSON.stringify(target.checklist),
      checklist: JSON.stringify(target.checklist),
      rubric: JSON.stringify([
        { level: 'Tam', description: 'Çıktı gerçek kayıt veya gözleme dayanıyor; gerekli alanlar tamam ve karar gerekçeli.' },
        { level: 'Geliştirilmeli', description: 'Kayıt, hesap, kontrol veya karar gerekçesinde eksik bulunuyor.' }
      ]),
      exampleOutput: JSON.stringify({ artifact: target.artifact })
    }
  })
  const sourceCount = await syncSources(client, target, data.sources)
  assert(sourceCount === data.sources.length, `KO ${target.koId} source count ${sourceCount}; expected ${data.sources.length}`)
}

async function captureNonTargetFingerprint(client) {
  const koIds = TARGETS.map(target => target.koId)
  const lessonIds = TARGETS.map(target => target.lessonId)
  const [kos, lessons, courses, tasks, links] = await Promise.all([
    client.knowledgeObject.findMany({ where: { id: { notIn: koIds } }, select: { id: true, code: true, status: true, updatedAt: true }, orderBy: { id: 'asc' } }),
    client.lesson.findMany({ where: { id: { notIn: lessonIds } }, select: { id: true, courseId: true, knowledgeObjectId: true, updatedAt: true }, orderBy: { id: 'asc' } }),
    client.course.findMany({ select: { id: true, published: true, updatedAt: true }, orderBy: { id: 'asc' } }),
    client.taskTemplate.findMany({ where: { koId: { notIn: koIds } }, select: { id: true, koId: true, estimatedTime: true, description: true }, orderBy: { id: 'asc' } }),
    client.knowledgeObjectSource.findMany({ where: { koId: { notIn: koIds } }, select: { id: true, koId: true, sourceId: true, note: true }, orderBy: { id: 'asc' } })
  ])
  return crypto.createHash('sha256').update(JSON.stringify({ kos, lessons, courses, tasks, links })).digest('hex')
}

async function verifyTarget(client, item) {
  const { target, data } = item
  const ko = await client.knowledgeObject.findUnique({
    where: { id: target.koId },
    include: { taskTemplates: true, sources: { include: { source: true } } }
  })
  const lesson = await client.lesson.findUnique({ where: { id: target.lessonId }, include: { course: true } })
  assert(ko && lesson, `KO ${target.koId}: verification record missing`)
  const metadata = readJson(ko.metadata)
  const actualUrls = ko.sources.map(link => link.source.url).sort()
  const expectedUrls = data.sources.map(source => source.url).sort()
  const visible = [ko.title, ko.summary, ko.content, ko.task, JSON.stringify(metadata)].join('\n')

  assert(ko.code === target.code, `KO ${target.koId}: code changed`)
  assert(ko.status === 'published' && ko.publishedAt, `KO ${target.koId}: published state changed`)
  assert(lesson.courseId === target.courseId && lesson.knowledgeObjectId === target.koId, `KO ${target.koId}: lesson/course relation changed`)
  assert(lesson.course.published, `KO ${target.koId}: course is no longer published`)
  assert(ko.title === data.title && lesson.title === data.title, `KO ${target.koId}: title mismatch`)
  assert(ko.summary === data.summary && metadata.summary === data.summary, `KO ${target.koId}: summary mismatch`)
  assert(ko.content === data.content && lesson.content === data.content, `KO ${target.koId}: visible content mismatch`)
  assert(ko.task === data.task && metadata.task === data.task, `KO ${target.koId}: task mismatch`)
  assert(JSON.stringify(metadata.learningOutcomes) === JSON.stringify(data.outcomes), `KO ${target.koId}: learning outcomes mismatch`)
  assert(lesson.estimatedMinutes === LESSON_MINUTES && metadata.estimatedMinutes === LESSON_MINUTES, `KO ${target.koId}: lesson duration mismatch`)
  assert(ko.taskTemplates.length === 1 && ko.taskTemplates[0].estimatedTime === TASK_MINUTES, `KO ${target.koId}: task duration mismatch`)
  assert(JSON.stringify(readJson(ko.taskTemplates[0].checklist)) === JSON.stringify(target.checklist), `KO ${target.koId}: task checklist mismatch`)
  assert(metadata.decisionToolLinks.length === 0 && metadata.decisionTools.length === 0 && metadata.tools.length === 0, `KO ${target.koId}: decision tools must be empty`)
  assert(metadata.embeddedPracticeBlocks.length === target.blocks.length, `KO ${target.koId}: block count mismatch`)
  assert(metadata.embeddedPracticeBlocks.every(item => SUPPORTED_BLOCK_TYPES.has(item.type)), `KO ${target.koId}: unsupported renderer block type stored`)
  assert(metadata.visibleLearningStructure === target.structure, `KO ${target.koId}: visible structure mismatch`)
  assert(JSON.stringify(actualUrls) === JSON.stringify(expectedUrls), `KO ${target.koId}: source URLs mismatch`)
  assert(new Set(actualUrls).size === actualUrls.length, `KO ${target.koId}: duplicate sources`)
  assert(!/\n\|[^\n]+\|\n\|[-: |]+\|/.test(ko.content), `KO ${target.koId}: wide markdown table remains in visible content`)
  assert(!/^## Metadata/m.test(ko.content), `KO ${target.koId}: raw metadata is visible`)
  for (const forbidden of FORBIDDEN_VISIBLE_PATTERNS) {
    assert(!forbidden.pattern.test(visible), `KO ${target.koId}: stale or forbidden term remains (${forbidden.label})`)
  }

  return {
    koId: target.koId,
    code: target.code,
    courseId: target.courseId,
    lessonId: target.lessonId,
    sourceCount: ko.sources.length,
    toolCount: metadata.decisionToolLinks.length,
    blockCount: metadata.embeddedPracticeBlocks.length,
    blockTypes: metadata.embeddedPracticeBlocks.map(item => `${item.originalType}->${item.type}`),
    summary: ko.summary,
    taskTitle: ko.taskTemplates[0].title,
    lessonMinutes: lesson.estimatedMinutes,
    taskMinutes: ko.taskTemplates[0].estimatedTime
  }
}

async function main() {
  const verifyOnly = process.argv.includes('--verify-only')
  const parsedTargets = TARGETS.map(target => ({ target, data: parseLessonFile(target) }))

  console.log('Operations Wave 2 — preflight')
  await preflightAll(prisma, parsedTargets)
  if (verifyOnly) {
    console.log('=== VERIFY-ONLY: all 5 target relationships and source files are valid; no writes performed ===')
    return
  }

  const nonTargetBefore = await captureNonTargetFingerprint(prisma)
  await prisma.$transaction(async tx => {
    await preflightAll(tx, parsedTargets)
    for (const item of parsedTargets) await updateTarget(tx, item)
  }, { timeout: 30000 })
  const nonTargetAfter = await captureNonTargetFingerprint(prisma)
  assert(nonTargetBefore === nonTargetAfter, 'A non-target KO, lesson, course, task or KO-source link changed')

  console.log('\nOperations Wave 2 — post-update verification')
  const results = []
  for (const item of parsedTargets) results.push(await verifyTarget(prisma, item))
  for (const result of results) console.log(JSON.stringify(result))
  console.log(`NON_TARGET_FINGERPRINT=${nonTargetAfter}`)
  console.log('=== DONE: 5 OK, 0 failed ===')
}

main()
  .catch(error => {
    console.error('FATAL:', error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

module.exports = {
  TARGETS,
  convertTablesToCards,
  parseLessonFile,
  SUPPORTED_BLOCK_TYPES
}
