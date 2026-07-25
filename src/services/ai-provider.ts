import { PrismaClient } from '@prisma/client'
import { createKnowledgeRetriever, formatKnowledgeContext as retrievalFormatContext } from './retrieval/index.js'
import type { KnowledgeObjectResult } from './retrieval/types.js'
import type { Citation } from './ai-gateway.js'
import type { ReviewerEvidence } from './ai-reviewer/index.js'

const prisma = new PrismaClient()
const retriever = createKnowledgeRetriever(prisma)

export type AiProvider = 'nvidia' | 'openai' | 'deepseek'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export type AiStreamEvent =
  | { type: 'provider'; provider: string; model: string }
  | { type: 'delta'; delta: string }
  | { type: 'done'; tokenUsage?: TokenUsage; knowledgeObjects?: Citation[] }

function toReviewerEvidence(
  knowledgeObjects?: KnowledgeObjectResult[],
): ReviewerEvidence[] | undefined {
  return knowledgeObjects?.map(ko => ({
    id: ko.id,
    code: ko.code,
    title: ko.title,
    excerpt: ko.summary ? `${ko.summary}\n${ko.content}` : ko.content,
    category: ko.category?.name || null,
    sourceRefs: ko.sourceRefs,
    status: 'published',
    isDemo: false,
  }))
}

export async function callAiProviderWithRetry(
  messages: ChatMessage[],
  knowledgeObjects?: KnowledgeObjectResult[],
): Promise<{ content: string; usage: TokenUsage; provider: AiProvider; model: string; citations?: Citation[] }> {
  const { generateCompletion } = await import('./ai-gateway.js')
  const citations: Citation[] | undefined = knowledgeObjects?.map(ko => ({
    id: ko.id,
    title: ko.title,
    code: ko.code,
    category: ko.category,
    sourceRefs: ko.sourceRefs,
  }))
  const result = await generateCompletion({
    messages,
    skipMasking: false,
    skipInputReview: false,
    skipOutputReview: false,
    knowledgeObjects: citations,
    reviewerEvidence: toReviewerEvidence(knowledgeObjects),
  })
  return {
    content: result.content,
    usage: result.usage,
    provider: result.provider as AiProvider,
    model: result.model,
    citations: result.citations,
  }
}

export async function* streamAiResponse(
  messages: ChatMessage[],
  abortSignal?: AbortSignal,
  knowledgeObjects?: KnowledgeObjectResult[],
): AsyncGenerator<AiStreamEvent> {
  const { generateStream } = await import('./ai-gateway.js')
  const citations: Citation[] | undefined = knowledgeObjects?.map(ko => ({
    id: ko.id,
    title: ko.title,
    code: ko.code,
    category: ko.category,
    sourceRefs: ko.sourceRefs,
  }))

  const stream = generateStream({
    messages,
    abortSignal,
    skipMasking: false,
    skipInputReview: false,
    skipOutputReview: false,
    knowledgeObjects: citations,
    reviewerEvidence: toReviewerEvidence(knowledgeObjects),
  })

  for await (const event of stream) {
    if (event.type === 'error') {
      if (event.code === 'STREAM_ABORTED') {
        throw new Error('MENTOR_STREAM_ABORTED')
      }
      if (event.code === 'INPUT_BLOCKED') {
        throw new Error('MENTOR_INPUT_BLOCKED')
      }
      throw new Error(`MENTOR_PROVIDER_ERROR:${event.code}`)
    }
    const base = event as AiStreamEvent
    if (base.type === 'done') {
      yield { ...base, knowledgeObjects: citations }
    } else {
      yield base
    }
  }
}

export async function getRelevantKnowledgeObjects(query: string): Promise<KnowledgeObjectResult[]> {
  return retriever.retrieve({ text: query })
}

export function formatKnowledgeContext(kos: KnowledgeObjectResult[]): string {
  return retrievalFormatContext(kos)
}

export function buildSystemPrompt(user: { name: string; role: string }, knowledgeContext: string, koTitle?: string): string {
  let prompt = `Sen LocalAkademi'nin KOBİ, esnaf ve girişimcilere destek veren yapay zeka iş mentorusun.

Kurallar:
- Her zaman TÜRKÇE cevap ver. Sadece teknik terimler İngilizce olabilir.
- Kullanıcının seviyesine uygun cevap ver (${user.role}).
- Uygulanabilir, düşük bütçeli ve ölçülebilir öneriler sun.
- Kesin bilmediğin bir konuda "Bilmiyorum" de, uydurma.
- En fazla 140 kelime kullan; kısa, net ve somut ol.
- Öncelikli 3 adımı ve mümkünse basit bir başarı ölçütünü belirt.
- Soru çok kısa veya belirsizse varsayım üretmek yerine tek bir açıklayıcı soru sor.
- Sohbet geçmişindeki bozuk veya anlamsız metinleri kaynak kabul etme.

Kullanıcı: ${user.name}
Rol: ${user.role}`

  if (koTitle) {
    prompt += `\nÖğrencinin sorusu şu içerikle ilgili: "${koTitle}"`
  }

  if (knowledgeContext) {
    prompt += `\n\n--- KULLANILAN KAYNAKLAR ---\n${knowledgeContext}`
  }

  return prompt
}

export function needsClarification(text: string): boolean {
  const normalized = text.trim().toLocaleLowerCase('tr-TR').replace(/[.!?]+$/g, '')
  return /^(öneri|fikir|tavsiye) ver$|^yardım et$|^ne yapmalıyım$|^ne yapayım$/.test(normalized)
}
