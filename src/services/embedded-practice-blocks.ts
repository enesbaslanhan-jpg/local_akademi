import { prisma } from '../lib/prisma.js'

/**
 * Embedded practice blocks reuse published Practical Card content inside
 * courses and knowledge object detail pages. The legacy Practical Card module
 * is hidden from the learner UX, but its data remains intact for rollback.
 */

export type EmbeddedBlockType =
  | 'formula'
  | 'checklist'
  | 'common_mistake'
  | 'quick_application'

export interface EmbeddedPracticeBlockSource {
  id: number
  title: string
  code: string | null
  /*
   * `route` ALANI KALDIRILDI: Bilgi Kutuphanesi kapatildi
   * (03.09.2026, urun sahibi karari) ve `/app/knowledge/:code`
   * sayfasi yok. Kaynak adi ve kodu bilgi olarak duruyor; gidilecek
   * bir sayfa olmadigi icin arayuz baglanti basmiyor.
   */
}

export interface EmbeddedPracticeBlock {
  id: string
  type: EmbeddedBlockType
  title: string
  shortDescription: string | null
  content: {
    mainContent?: string
    formula?: string
    example?: string
    warning?: string
    checklistItems?: string[]
    quickSteps?: string[]
    mistake?: string
    correctApproach?: string
    keyTakeaway?: string
    primaryAction?: { code: string; label: string }
  }
  source?: EmbeddedPracticeBlockSource
  relatedDecisionCheckCode?: string | null
}

const CARD_TYPE_TO_BLOCK_TYPE: Record<string, EmbeddedBlockType> = {
  pricing_check: 'quick_application',
  quick_formula: 'formula',
  example_calculation: 'formula',
  comparison: 'common_mistake',
  cash_flow_warning: 'common_mistake',
  common_mistake: 'common_mistake',
  checklist: 'checklist',
  formula: 'formula',
  quick_application: 'quick_application'
}

const PRIMARY_ACTION_TO_DECISION_CHECK: Record<string, string | null> = {
  open_profitability_check: 'DC-PROFIT-001',
  open_decision_check: 'DC-CAMPAIGN-010',
  open_pricing_tool: null,
  open_marketplace_check: 'DC-MARKETPLACE-004',
  open_cashflow_check: 'DC-CASHFLOW-008',
  open_loan_check: 'DC-LOAN-007',
  open_branch_check: 'DC-BRANCH-009',
  open_sources: null,
  open_assumption_check: 'DC-CAMPAIGN-010',
  open_interview_guide: null,
  open_experiment_card: 'DC-CAMPAIGN-010',
  open_pattern_check: 'DC-CONTINUE-012',
  open_interpretation_check: 'DC-CONTINUE-012',
  open_problem_statement: 'DC-CONTINUE-012',
  open_segment_score: 'DC-CAMPAIGN-010',
  open_segment_guide: null,
  open_segment_card: 'DC-CAMPAIGN-010'
}

function mapCardType(type: string | null): EmbeddedBlockType {
  return CARD_TYPE_TO_BLOCK_TYPE[type ?? ''] ?? 'quick_application'
}

function mapPrimaryAction(action?: { code?: string } | null): string | null {
  if (!action?.code) return null
  return PRIMARY_ACTION_TO_DECISION_CHECK[action.code] ?? null
}

function extractContentFields(contentJson: any, type: EmbeddedBlockType) {
  const raw = contentJson ?? {}
  const result: EmbeddedPracticeBlock['content'] = {}

  if (raw.mainContent) result.mainContent = String(raw.mainContent)
  if (raw.formula) result.formula = String(raw.formula)
  if (raw.example) result.example = String(raw.example)
  if (raw.warning) result.warning = String(raw.warning)
  if (raw.keyTakeaway) result.keyTakeaway = String(raw.keyTakeaway)
  if (raw.primaryAction && typeof raw.primaryAction === 'object') {
    result.primaryAction = {
      code: String(raw.primaryAction.code || ''),
      label: String(raw.primaryAction.label || '')
    }
  }

  if (type === 'checklist' && Array.isArray(raw.checklistItems)) {
    result.checklistItems = raw.checklistItems.map((item: any) => String(item))
  }

  if (type === 'common_mistake') {
    if (raw.mistake) result.mistake = String(raw.mistake)
    else if (raw.warning) result.mistake = String(raw.warning)
    if (raw.correctApproach) result.correctApproach = String(raw.correctApproach)
    else if (raw.keyTakeaway) result.correctApproach = String(raw.keyTakeaway)
    else if (raw.mainContent) result.correctApproach = String(raw.mainContent)
  }

  if (type === 'quick_application') {
    if (Array.isArray(raw.quickSteps)) {
      result.quickSteps = raw.quickSteps.map((s: any) => String(s))
    } else {
      const steps: string[] = []
      if (raw.formula) steps.push(raw.formula)
      if (raw.example) steps.push(raw.example)
      if (raw.warning) steps.push(raw.warning)
      if (raw.keyTakeaway) steps.push(raw.keyTakeaway)
      if (steps.length > 0) result.quickSteps = steps
    }
  }

  return result
}

function buildBlockFromCard(
  card: any,
  source?: EmbeddedPracticeBlockSource
): EmbeddedPracticeBlock {
  const type = mapCardType(card.type)
  const content = extractContentFields(card.content, type)
  const relatedDecisionCheckCode = mapPrimaryAction(card.content?.primaryAction)

  return {
    id: card.id,
    type,
    title: card.title,
    shortDescription: card.shortDescription ?? null,
    content,
    source,
    relatedDecisionCheckCode
  }
}

/**
 * Canonical bloklarin duz aciklamasini yapisal alanlara ayirir.
 *
 * - common_mistake: "Yaygin Hata" / "Dogru Yaklasim" ayrimini cikarir.
 * - formula: aciklamadaki formulu content.formula'ya tasir.
 *
 * Ayrilan metin shortDescription'dan DUSURULUR; yoksa istemci ayni
 * icerigi hem ozet hem yapisal kutuda basiyor.
 */
function deriveCanonicalFields(
  type: EmbeddedBlockType,
  shortDescription: string | null,
  content: EmbeddedPracticeBlock['content']
): { shortDescription: string | null; content: EmbeddedPracticeBlock['content'] } {
  const text = (shortDescription ?? '').replace(/\*\*/g, '').trim()
  if (!text) return { shortDescription, content }

  if (type === 'common_mistake') {
    const hasLabels = /Yayg[ıi]n\s+Hata\s*:|Do[ğg]ru\s+Yakla[şs][ıi]m\s*:/i.test(text)

    if (hasLabels) {
      const wrong = text.match(/Yayg[ıi]n\s+Hata\s*:?\s*([\s\S]*?)(?=Do[ğg]ru\s+Yakla[şs][ıi]m\s*:|$)/i)?.[1]?.trim()
      const correct = text.match(/Do[ğg]ru\s+Yakla[şs][ıi]m\s*:?\s*([\s\S]*)$/i)?.[1]?.trim()
      return {
        // Ozet ve mainContent dusuruldu: ayni metin yapisal kutularda.
        shortDescription: null,
        content: {
          ...content,
          mainContent: undefined,
          ...(wrong ? { mistake: wrong } : {}),
          ...(correct ? { correctApproach: correct } : { correctApproach: undefined })
        }
      }
    }

    /* Etiket yok: tek cumlelik uyari. Bunu HEM ozet HEM "dogru yaklasim"
       olarak basmak ayni metni iki kez gosteriyordu. Tek yere, "yaygin
       hata" tarafina yaziyoruz; uydurma bir "dogru yaklasim" uretmiyoruz. */
    if (text) {
      return {
        shortDescription: null,
        content: { ...content, mainContent: undefined, mistake: text, correctApproach: undefined }
      }
    }
  }

  if (type === 'formula' && !content.formula) {
    /* "Ad = a + b + c" bicimindeki formulu ayir. Esitlik yoksa aciklama
       oldugu gibi kalir; uydurma formul uretilmez. */
    if (/=/.test(text)) {
      return { shortDescription: null, content: { ...content, formula: text } }
    }
  }

  return { shortDescription, content }
}

function buildScopedMetadataBlocks(metadataValue: string | null, koId: number): EmbeddedPracticeBlock[] {
  let metadata: any
  try {
    metadata = JSON.parse(metadataValue || '{}')
  } catch {
    return []
  }

  if (metadata.embeddedPracticeBlocksVersion !== 'operations-wave-2') return []
  if (!Array.isArray(metadata.embeddedPracticeBlocks)) return []

  return metadata.embeddedPracticeBlocks
    .filter((block: any) =>
      block &&
      typeof block.title === 'string' &&
      ['formula', 'checklist', 'common_mistake', 'quick_application'].includes(block.type)
    )
    .map((block: any, index: number) => {
      const shortDescription = block.shortDescription ? String(block.shortDescription) : null
      const content = extractContentFields(block.content, block.type as EmbeddedBlockType)

      /* Canonical import bloklari duz aciklama olarak tasiyor:
         "**Yaygin Hata:** ... **Dogru Yaklasim:** ..." veya ham formul.
         Bunlari yapisal alanlara burada ayiriyoruz — aksi halde istemci
         ham markdown basiyor ve ayni metin iki kez gorunuyor.
         Veri yeniden import edilmiyor; yalniz okuma katmani duzeltiliyor. */
      const derived = deriveCanonicalFields(
        block.type as EmbeddedBlockType,
        shortDescription,
        content
      )

      return {
        id: `ko-${koId}-${String(block.id || index)}`,
        type: block.type as EmbeddedBlockType,
        title: String(block.title),
        shortDescription: derived.shortDescription,
        content: derived.content,
        relatedDecisionCheckCode: null
      }
    })
}

async function fetchPublishedCardWithLatestVersion(code: string) {
  const card = await prisma.practicalCard.findUnique({
    where: { code, published: true },
    include: {
      versions: {
        where: { status: 'published' },
        orderBy: { version: 'desc' },
        take: 1
      }
    }
  })

  if (!card || card.versions.length === 0) return null

  return {
    ...card,
    content: card.versions[0].contentJson
  }
}

export async function getEmbeddedPracticeBlocksForKnowledgeObject(
  koId: number
): Promise<EmbeddedPracticeBlock[]> {
  const links = await prisma.practicalCardKnowledgeObject.findMany({
    where: { knowledgeObjectId: koId },
    include: {
      practicalCard: true,
      knowledgeObject: { select: { code: true, title: true } }
    },
    orderBy: { order: 'asc' }
  })

  const blocks: EmbeddedPracticeBlock[] = []

  for (const link of links) {
    const card = await fetchPublishedCardWithLatestVersion(link.practicalCard.code)
    if (!card) continue

    const source: EmbeddedPracticeBlockSource = {
      id: link.knowledgeObjectId,
      title: link.knowledgeObject?.title ?? link.practicalCard.title,
      code: link.knowledgeObject?.code ?? link.practicalCard.code
    }

    blocks.push(buildBlockFromCard(card, source))
  }

  if (blocks.length === 0) {
    const knowledgeObject = await prisma.knowledgeObject.findUnique({
      where: { id: koId },
      select: { metadata: true }
    })
    return buildScopedMetadataBlocks(knowledgeObject?.metadata ?? null, koId)
  }

  return blocks
}

export async function getEmbeddedPracticeBlocksForCourse(
  courseId: number
): Promise<EmbeddedPracticeBlock[]> {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    select: { knowledgeObjectId: true }
  })

  const koIds = [
    ...new Set(lessons.map(l => l.knowledgeObjectId).filter(Boolean))
  ] as number[]

  const blocks: EmbeddedPracticeBlock[] = []
  const seen = new Set<string>()

  for (const koId of koIds) {
    const koBlocks = await getEmbeddedPracticeBlocksForKnowledgeObject(koId)
    for (const block of koBlocks) {
      if (seen.has(block.id)) continue
      seen.add(block.id)
      blocks.push(block)
    }
  }

  return blocks
}

export async function getEmbeddedPracticeBlocksForLesson(
  lessonId: number
): Promise<EmbeddedPracticeBlock[]> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { knowledgeObjectId: true }
  })

  if (!lesson?.knowledgeObjectId) return []

  return getEmbeddedPracticeBlocksForKnowledgeObject(lesson.knowledgeObjectId)
}

export function isValidDecisionCheckCode(code: string | null | undefined): boolean {
  return typeof code === 'string' && code.startsWith('DC-') && code.length >= 6
}
