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
  route: string
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
  checklist: 'checklist'
}

const PRIMARY_ACTION_TO_DECISION_CHECK: Record<string, string | null> = {
  open_profitability_check: 'DC-PROFIT-001',
  open_decision_check: 'DC-CAMPAIGN-010',
  open_pricing_tool: null
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

  if (type === 'checklist' && Array.isArray(raw.checklistItems)) {
    result.checklistItems = raw.checklistItems.map((item: any) => String(item))
  }

  if (type === 'common_mistake') {
    if (raw.warning) result.mistake = String(raw.warning)
    if (raw.keyTakeaway) result.correctApproach = String(raw.keyTakeaway)
    else if (raw.mainContent) result.correctApproach = String(raw.mainContent)
  }

  if (type === 'quick_application') {
    const steps: string[] = []
    if (raw.formula) steps.push(raw.formula)
    if (raw.example) steps.push(raw.example)
    if (raw.warning) steps.push(raw.warning)
    if (raw.keyTakeaway) steps.push(raw.keyTakeaway)
    if (steps.length > 0) result.quickSteps = steps
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
    include: { practicalCard: true },
    orderBy: { order: 'asc' }
  })

  const blocks: EmbeddedPracticeBlock[] = []

  for (const link of links) {
    const card = await fetchPublishedCardWithLatestVersion(link.practicalCard.code)
    if (!card) continue

    const source: EmbeddedPracticeBlockSource = {
      id: link.knowledgeObjectId,
      title: link.practicalCard.title,
      code: link.practicalCard.code,
      route: `/app/knowledge/${link.practicalCard.code}`
    }

    blocks.push(buildBlockFromCard(card, source))
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
