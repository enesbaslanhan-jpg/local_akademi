import type { ChatMessage } from './ai-provider'
import type { MentorIntent } from './mentor-intent'
import { getHistoryLimit } from './mentor-prompt-profile'

const DISPOSABLE_INTENTS: Set<MentorIntent> = new Set([
  'greeting',
  'system_capability',
  'clarification_needed',
])

const DISCLAIMER_MARKER = /---\nBu bilgi genel .*? niteliği taşımaz.*?$/
const TAX_DISCLAIMER_MARKER = /---\nBu bilgi genel .*?vergi danışmanlığı.*?$/
const FINANCIAL_DISCLAIMER_MARKER = /---\nBu bilgi genel finansal .*?yatırım veya kredi tavsiyesi.*?$/

function looksLikeDeterministicResponse(content: string): boolean {
  // Very short or well-known deterministic prefixes.
  if (content.length <= 30) return true
  const lower = content.toLocaleLowerCase('tr-TR')
  return (
    lower.startsWith('merhaba') ||
    lower.startsWith('selam') ||
    lower.startsWith('günaydın') ||
    lower.startsWith('iyi günler') ||
    lower.startsWith('iyi akşamlar') ||
    lower.startsWith('sağlayıcı:') ||
    lower.startsWith('model:') ||
    lower.startsWith('elbette. hangi konuda') ||
    lower.startsWith('rıca ederim')
  )
}

function stripOldDisclaimer(content: string): string {
  return content
    .replace(DISCLAIMER_MARKER, '')
    .replace(TAX_DISCLAIMER_MARKER, '')
    .replace(FINANCIAL_DISCLAIMER_MARKER, '')
    .trim()
}

function stripOldCitations(content: string): string {
  return content.replace(/\n\n---\nKaynaklar:.*?$/s, '').trim()
}

function cleanHistoryContent(message: ChatMessage): ChatMessage | null {
  if (!message.content) return null
  if (message.role !== 'user' && message.role !== 'assistant') return null

  // Drop broken/placeholder messages (same rule as conversation pipeline).
  if (/(?:\?{2,}|[A-Za-zÇĞİÖŞÜçğıöşü]\?[A-Za-zÇĞİÖŞÜçğıöşü])/.test(message.content)) {
    return null
  }

  let cleaned = message.content
  cleaned = stripOldDisclaimer(cleaned)
  cleaned = stripOldCitations(cleaned)

  if (cleaned.length === 0) return null

  return { role: message.role, content: cleaned }
}

export function isDisposableHistoryMessage(content: string, intent?: MentorIntent): boolean {
  if (intent && DISPOSABLE_INTENTS.has(intent)) return true
  return looksLikeDeterministicResponse(content)
}

export function applyHistoryBudget(
  messages: ChatMessage[],
  intent: MentorIntent,
  options?: { userMessage?: string; preserveUserInstruction?: boolean },
): ChatMessage[] {
  const limit = getHistoryLimit(intent)
  const cleaned = messages.map(cleanHistoryContent).filter((m): m is ChatMessage => m !== null)

  // Keep the most recent messages, then optionally drop disposable greetings.
  let recent = cleaned.slice(-limit)

  if (intent === 'conversation_control') {
    // For rewrites, keep the user's latest instruction and the immediately preceding assistant turn.
    const userInstruction = options?.userMessage
      ? { role: 'user' as const, content: options.userMessage }
      : null
    const assistantTurn = recent.filter(m => m.role === 'assistant').pop()
    const kept: ChatMessage[] = []
    if (assistantTurn) kept.push(assistantTurn)
    if (userInstruction) kept.push(userInstruction)
    return kept
  }

  // Remove deterministic greetings from the provider-bound context unless it is the last user message.
  recent = recent.filter((m, index) => {
    if (index === recent.length - 1 && m.role === 'user') return true
    return !isDisposableHistoryMessage(m.content)
  })

  // If the user explicitly asked for a rewrite, ensure the latest instruction is preserved.
  if (options?.preserveUserInstruction && options.userMessage) {
    const lastIsUser = recent[recent.length - 1]?.role === 'user'
    if (!lastIsUser) {
      recent.push({ role: 'user', content: options.userMessage })
    }
  }

  return recent
}

export function estimateHistoryCharacters(messages: ChatMessage[]): number {
  return messages.reduce((sum, m) => sum + m.content.length, 0)
}

export function countHistoryMessages(messages: ChatMessage[]): number {
  return messages.length
}
