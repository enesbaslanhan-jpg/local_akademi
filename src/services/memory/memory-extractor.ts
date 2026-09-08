import { PrismaClient } from '@prisma/client'
import { containsSensitiveData, isAllowedMemoryValue } from './sensitive-data-filter'
import type { MemoryInput, MemoryType } from './memory-types'
import { createMemory } from './memory-repository'

interface ExtractorContext {
  prisma: PrismaClient
}

interface ExtractedMemory {
  type: string
  key: string | null
  value: string
  summary: string | null
  importance: number
  confidence: number
  shouldPersist: boolean
}

const EXTRACTION_PROMPT = `Sen bir işletme asistanısın. Kullanıcı ve AI arasındaki konuşmadan önemli işletme bilgilerini çıkarıyorsun.

Çıkarılacak bilgi türleri:
- profile: işletme profili (sektör, şehir, işletme adı, çalışan sayısı, satış kanalı vb.)
- fact: ölçülebilir iş verisi (ciro, gider, sepet tutarı, reklam bütçesi vb.)
- problem: devam eden sorun (satış düşüşü, stok sorunu, nakit akışı vb.)
- goal: hedef (ciro hedefi, yeni kanal, ihracat vb.)
- preference: tercih (kısa/detaylı cevap, risk toleransı, iletişim biçimi vb.)
- decision: alınan karar (bütçe artışı, fiyat güncellemesi, kanal seçimi vb.)

KURALLAR (kesinlikle uyulmalıdır):
1. Yalnızca kullanıcının açıkça söylediği bilgileri çıkar.
2. AI'nın tahmin ettiği veya varsaydığı bilgileri çıkarma.
3. Selamlaşma, teşekkür, küçük sohbet gibi geçici konuşmaları memory yapma.
4. Şu bilgileri KESİNLİKLE memory olarak kaydetme:
   - API anahtarları, tokenlar, şifreler
   - Kredi kartı, kimlik numarası gibi hassas veriler
   - Siyasi görüş, din, etnik köken
5. Her memory için doğru türü seç.
6. Aynı bilgiyi tekrar çıkarma.
7. Emin değilsen confidence değerini düşük tut.
8. İşletme için önemli bilgilerde importance yüksek olmalı.

Yanıtı SADECE JSON formatında ver, ek açıklama ekleme:`

const MEMORY_SIGNAL_PATTERNS = [
  /\b(işletmem(?:iz)?|şirketim(?:iz)?|dükkanım(?:ız)?|hedefim(?:iz)?|cirom(?:uz)?|giderim(?:iz)?|bütçem(?:iz)?|satışlarım(?:ız)?|borcum(?:uz)?|nakdim(?:iz)?|çalışanım(?:ız)?|tercihim(?:iz)?)\b/i,
  /\b(karar verdim|karar verdik|faaliyet gösteriyorum|faaliyet gösteriyoruz|satıyorum|satıyoruz|üretiyorum|üretiyoruz)\b/i,
  /\b(my business|my company|my shop|my goal|my revenue|my expenses|my budget|my sales|my debt|my cash|my employees|my preference)\b/i,
  /\b(i run|we run|i sell|we sell|i produce|we produce|i prefer|we prefer|i decided|we decided)\b/i,
]

/** Avoid spending a second provider request on ordinary questions with no durable user fact. */
export function shouldExtractMemoryFromMessage(userMessage: string): boolean {
  const normalized = userMessage.trim().toLocaleLowerCase('tr-TR')
  if (normalized.length < 8) return false
  return MEMORY_SIGNAL_PATTERNS.some(pattern => pattern.test(normalized))
}

export function buildExtractionPrompt(userMessage: string, assistantReply: string): string {
  return `${EXTRACTION_PROMPT}
{
  "memories": [
    {
      "type": "fact|profile|goal|preference|problem|decision",
      "key": "normalize_ed_key_ornegin_monthly_revenue",
      "value": "çıkarılan bilginin metni",
      "summary": "kısa özet",
      "importance": 0.0-1.0,
      "confidence": 0.0-1.0,
      "shouldPersist": true/false
    }
  ]
}

KULLANICI MESAJI:
${userMessage}

ASISTAN CEVABI:
${assistantReply}`
}

export function parseExtractionJson(raw: string): ExtractedMemory[] {
  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (!parsed.memories || !Array.isArray(parsed.memories)) return []
    return parsed.memories.filter((m: any) => {
      if (!m.type || !m.value) return false
      if (typeof m.value !== 'string') return false
      if (containsSensitiveData(m.value)) return false
      if (!isAllowedMemoryValue(m.value)) return false
      return true
    })
  } catch {
    return []
  }
}

export async function extractAndStoreMemories(
  ctx: ExtractorContext,
  userId: number,
  userMessage: string,
  assistantReply: string,
  sourceMessageId: number,
  conversationId: number,
  rawJson?: string
): Promise<number> {
  if (!rawJson) return 0

  const extracted = parseExtractionJson(rawJson)
  let stored = 0

  for (const mem of extracted) {
    if (!mem.shouldPersist) continue

    const input: MemoryInput = {
      userId,
      type: mem.type as MemoryType,
      key: mem.key || undefined,
      value: mem.value,
      summary: mem.summary,
      sourceType: 'ai_extraction',
      sourceMessageId,
      conversationId,
      importance: Math.max(0, Math.min(1, mem.importance ?? 0.5)),
      confidence: Math.max(0, Math.min(1, mem.confidence ?? 0.5)),
    }

    await createMemory(ctx, input)
    stored++
  }

  return stored
}
