import { describe, expect, it } from 'vitest'
import {
  compareCourses,
  jaccard,
  ngrams,
  normalizeQualityText,
  type CourseQualityDocument,
} from '../src/lib/course-quality'

function course(overrides: Partial<CourseQualityDocument>): CourseQualityDocument {
  return {
    id: 1,
    title: 'Kurs',
    purpose: 'İşletme kararını ölçülebilir hale getirir.',
    outcomes: ['Hesaplar', 'Karşılaştırır', 'Uygular'],
    koIds: [1, 2],
    lessonContents: ['## Uygulama\nÖzgün bir işletme vakası üzerinde karar verir.'],
    quizTexts: ['Doğru karar hangisidir?'],
    taskTexts: ['Bir karar tablosu oluştur.'],
    visualKeys: ['visual-1'],
    ...overrides,
  }
}

describe('course quality similarity', () => {
  it('Türkçe metni kararlı biçimde normalize eder', () => {
    expect(normalizeQualityText('Bu, KÂR için 1.250,00 TL örneğidir.'))
      .toEqual(['kâr', '#', 'tl', 'örneğidir'])
  })

  it('Jaccard benzerliğini güvenli hesaplar', () => {
    expect(jaccard(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3)
    expect(jaccard(new Set(), new Set())).toBe(0)
  })

  it('aynı kurs kopyasını yüksek benzerlikle yakalar', () => {
    const left = course({})
    const right = course({ id: 2 })
    expect(compareCourses(left, right).total).toBeGreaterThan(0.7)
  })

  it('özgün amaç, içerik, değerlendirme ve görseli ayırır', () => {
    const left = course({})
    const right = course({
      id: 2,
      purpose: 'İhracatçı işletmenin belge riskini azaltacak kontrol akışı kurar.',
      outcomes: ['GTİP riskini sınıflandırır', 'Belge kanıtını doğrular', 'Kontrol kapısı tasarlar'],
      koIds: [8, 9],
      lessonContents: ['## Belge kontrolü\nMenşe kanıtı, teslim şekli ve gümrük sorumluluğu ayrı doğrulanır.'],
      quizTexts: ['Menşe belgesinde hangi kanıt aranır?'],
      taskTexts: ['İhracat belge kontrol akışı hazırla.'],
      visualKeys: ['export-flow'],
    })
    expect(compareCourses(left, right).total).toBeLessThanOrEqual(0.25)
    expect(ngrams(left.lessonContents.join(' '), 5).size).toBeGreaterThan(0)
  })
})
