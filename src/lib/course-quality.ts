export type CourseQualityDocument = {
  id: number
  title: string
  purpose: string
  outcomes: string[]
  koIds: number[]
  lessonContents: string[]
  quizTexts: string[]
  taskTexts: string[]
  visualKeys: string[]
}

export type CourseSimilarityBreakdown = {
  purposeAndOutcomes: number
  lessonContent: number
  koOverlap: number
  assessment: number
  openingAndClosing: number
  application: number
  visuals: number
  total: number
}

export type CompiledCourseQualityDocument = {
  source: CourseQualityDocument
  purposeAndOutcomes: Set<string>
  lessonContent: Set<string>
  koIds: Set<number>
  assessment: Set<string>
  openingAndClosing: Set<string>
  application: Set<string>
  visuals: Set<string>
}

const TURKISH_STOP_WORDS = new Set([
  'acaba', 'ama', 'ancak', 'artık', 'aslında', 'aynı', 'bazı', 'belirli',
  'bile', 'bir', 'birçok', 'biri', 'biz', 'bu', 'buna', 'bunu', 'bunun',
  'çok', 'çünkü', 'daha', 'da', 'de', 'değil', 'diğer', 'diye', 'en',
  'gibi', 'göre', 'hem', 'her', 'için', 'ile', 'ise', 'kadar', 'kendi',
  'mi', 'mı', 'mu', 'mü', 'nasıl', 'ne', 'neden', 'olarak', 'olan',
  'olduğunu', 'olur', 'önce', 'sonra', 'şu', 've', 'veya', 'ya',
])

export function normalizeQualityText(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\d[\d.,:%/-]*/g, '#')
    .replace(/[^\p{L}#\s]/gu, ' ')
    .split(/\s+/)
    .filter(word => (word === '#' || word.length > 1) && !TURKISH_STOP_WORDS.has(word))
}

export function ngrams(value: string, size: number) {
  const words = normalizeQualityText(value)
  const result = new Set<string>()
  for (let index = 0; index <= words.length - size; index += 1) {
    result.add(words.slice(index, index + size).join(' '))
  }
  return result
}

export function jaccard<T>(left: Set<T>, right: Set<T>) {
  if (!left.size && !right.size) return 0
  let intersection = 0
  for (const item of left) if (right.has(item)) intersection += 1
  return intersection / Math.max(1, left.size + right.size - intersection)
}

function edgeText(contents: string[]) {
  return contents.map(content => {
    const words = content.split(/\s+/)
    return [...words.slice(0, 90), ...words.slice(-90)].join(' ')
  }).join('\n')
}

function applicationText(contents: string[]) {
  return contents
    .map(content => content
      .split(/^##\s+/m)
      .filter(section => /uygulama|vaka|senaryo|örnek|çalışma|görev/i.test(section.slice(0, 80)))
      .join('\n'))
    .join('\n')
}

export function compareCourses(
  left: CourseQualityDocument,
  right: CourseQualityDocument,
): CourseSimilarityBreakdown {
  return compareCompiledCourses(
    compileCourseQualityDocument(left),
    compileCourseQualityDocument(right),
  )
}

export function compileCourseQualityDocument(
  source: CourseQualityDocument,
): CompiledCourseQualityDocument {
  return {
    source,
    purposeAndOutcomes: ngrams(`${source.purpose}\n${source.outcomes.join('\n')}`, 3),
    lessonContent: ngrams(source.lessonContents.join('\n'), 5),
    koIds: new Set(source.koIds),
    assessment: ngrams(`${source.quizTexts.join('\n')}\n${source.taskTexts.join('\n')}`, 4),
    openingAndClosing: ngrams(edgeText(source.lessonContents), 5),
    application: ngrams(applicationText(source.lessonContents), 4),
    visuals: new Set(source.visualKeys),
  }
}

export function compareCompiledCourses(
  left: CompiledCourseQualityDocument,
  right: CompiledCourseQualityDocument,
): CourseSimilarityBreakdown {
  const purposeAndOutcomes = jaccard(
    left.purposeAndOutcomes,
    right.purposeAndOutcomes,
  )
  const lessonContent = jaccard(
    left.lessonContent,
    right.lessonContent,
  )
  const koOverlap = jaccard(left.koIds, right.koIds)
  const assessment = jaccard(
    left.assessment,
    right.assessment,
  )
  const openingAndClosing = jaccard(
    left.openingAndClosing,
    right.openingAndClosing,
  )
  const application = jaccard(
    left.application,
    right.application,
  )
  const visuals = jaccard(left.visuals, right.visuals)
  const total =
    purposeAndOutcomes * 0.25 +
    lessonContent * 0.20 +
    koOverlap * 0.15 +
    assessment * 0.10 +
    openingAndClosing * 0.10 +
    application * 0.10 +
    visuals * 0.10

  return {
    purposeAndOutcomes,
    lessonContent,
    koOverlap,
    assessment,
    openingAndClosing,
    application,
    visuals,
    total,
  }
}
