import { PrismaClient } from '@prisma/client'

const SUMMARY_MESSAGE_THRESHOLD = 20
const SUMMARY_PROMPT = `Aşağıdaki sohbeti özetle. Sadece JSON formatında yanıt ver:

{
  "summary": "konuşmanın kısa özeti (2-3 cümle)",
  "keyFacts": "kullanıcının verdiği önemli bilgiler",
  "decisions": "alınan kararlar",
  "openQuestions": "cevaplanmamış sorular"
}

SOHBET:`

interface SummaryInput {
  prisma: PrismaClient
  conversationId: number
  userId: number
  existingSummary: string | null
  newMessages: string
  messageCount: number
  lastMessageId: number
}

export async function updateConversationSummary(
  input: SummaryInput
): Promise<boolean> {
  const { prisma, conversationId, userId, existingSummary, newMessages, messageCount, lastMessageId } = input

  const summaryText = existingSummary
    ? `Önceki ÖZET:\n${existingSummary}\n\nYeni Mesajlar:\n${newMessages}`
    : newMessages

  if (messageCount < SUMMARY_MESSAGE_THRESHOLD) {
    await upsertSummary(prisma, conversationId, userId, {
      summary: '',
      keyFacts: null,
      decisions: null,
      openQuestions: null
    }, messageCount, lastMessageId)
    return false
  }

  const rawResponse = await callSummaryAi(summaryText)
  const parsed = parseSummaryResponse(rawResponse)
  if (!parsed) return false

  await upsertSummary(prisma, conversationId, userId, parsed, messageCount, lastMessageId)
  return true
}

async function callSummaryAi(text: string): Promise<string> {
  try {
    const response = await fetch('http://127.0.0.1:11434/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:4b-instruct',
        messages: [
          { role: 'system', content: SUMMARY_PROMPT },
          { role: 'user', content: text.slice(0, 8000) }
        ],
        temperature: 0.3,
        max_tokens: 500,
        stream: false
      }),
      signal: AbortSignal.timeout(15000)
    })
    if (!response.ok) return ''
    const data = await response.json() as any
    return data?.choices?.[0]?.message?.content || ''
  } catch {
    return ''
  }
}

function parseSummaryResponse(raw: string): {
  summary: string
  keyFacts: string | null
  decisions: string | null
  openQuestions: string | null
} | null {
  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (!parsed.summary) return null
    return {
      summary: parsed.summary.slice(0, 2000),
      keyFacts: parsed.keyFacts?.slice(0, 1000) || null,
      decisions: parsed.decisions?.slice(0, 1000) || null,
      openQuestions: parsed.openQuestions?.slice(0, 1000) || null
    }
  } catch {
    return null
  }
}

async function upsertSummary(
  prisma: PrismaClient,
  conversationId: number,
  userId: number,
  data: {
    summary: string
    keyFacts: string | null
    decisions: string | null
    openQuestions: string | null
  },
  messageCount: number,
  lastMessageId: number
): Promise<void> {
  await prisma.conversationSummary.upsert({
    where: { conversationId },
    create: {
      conversationId,
      userId,
      summary: data.summary,
      keyFacts: data.keyFacts,
      decisions: data.decisions,
      openQuestions: data.openQuestions,
      messageCount,
      lastMessageId
    },
    update: {
      summary: data.summary,
      keyFacts: data.keyFacts,
      decisions: data.decisions,
      openQuestions: data.openQuestions,
      messageCount,
      lastMessageId,
      updatedAt: new Date()
    }
  })
}
