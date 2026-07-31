import { PrismaClient } from '@prisma/client'
import { normalizeQuery } from './query-normalizer'
import { expandDomainQuery } from './domain-query-expander'
import type { KnowledgeObjectResult, Retriever, RetrieverQuery, SourceRef } from './types'

const CANDIDATE_LIMIT = 200
const DEFAULT_TOP_K = 3
const MAX_TOP_K = 5
const MIN_SCORE = 1
const EXACT_CODE_LIMIT = 50
const PRIORITY_LIMIT = 200
const CONTENT_LIMIT = 200
const MAX_VARIANTS_PER_TOKEN = 4

const SCORE_EXACT_CODE = 100
const SCORE_TITLE_PHRASE = 40
const SCORE_TITLE_TOKEN = 12
const SCORE_CATEGORY_TOKEN = 6
const SCORE_CONTENT_TOKEN = 3
const SCORE_CONTENT_TOKEN_MAX_HITS = 5
const SCORE_SOURCE_TITLE_TOKEN = 2
const SCORE_VERIFIED_BONUS = 3
const SCORE_HIGH_AUTHORITY_BONUS = 2
const SCORE_HIGH_AUTHORITY_MAX = 6

export {
  CANDIDATE_LIMIT, DEFAULT_TOP_K, MAX_TOP_K, MIN_SCORE,
  EXACT_CODE_LIMIT, PRIORITY_LIMIT, CONTENT_LIMIT,
  SCORE_EXACT_CODE, SCORE_TITLE_PHRASE, SCORE_TITLE_TOKEN,
  SCORE_CATEGORY_TOKEN, SCORE_CONTENT_TOKEN, SCORE_CONTENT_TOKEN_MAX_HITS,
  SCORE_SOURCE_TITLE_TOKEN, SCORE_VERIFIED_BONUS,
  SCORE_HIGH_AUTHORITY_BONUS, SCORE_HIGH_AUTHORITY_MAX,
}

interface ScorableKo {
  id: number
  code: string | null
  title: string
  content: string
  summary: string | null
  quickAnswer: string | null
  verificationStatus: string
  category: { name: string } | null
  sources: Array<{
    source: {
      id: string
      title: string
      url: string | null
      authorityLevel: string
    }
  }>
}

function clampTopK(value: number | undefined): number {
  if (value === undefined) return DEFAULT_TOP_K
  const num = Number(value)
  if (!Number.isFinite(num)) return DEFAULT_TOP_K
  const intVal = Math.floor(num)
  return Math.max(1, Math.min(intVal, MAX_TOP_K))
}

function generateCaseVariants(token: string, originalTokens: string[]): string[] {
  const tr = 'tr-TR'
  const variants = new Set<string>()
  variants.add(token)
  variants.add(token.toLocaleUpperCase(tr))
  if (token.length > 0) {
    variants.add(token[0].toLocaleUpperCase(tr) + token.slice(1))
  }
  const tokLower = token.toLocaleLowerCase(tr)
  for (const orig of originalTokens) {
    if (orig.length >= 2 && orig.toLocaleLowerCase(tr) === tokLower && orig !== token) {
      variants.add(orig)
    }
  }
  return Array.from(variants).slice(0, MAX_VARIANTS_PER_TOKEN)
}

function countOccurrences(text: string, token: string): number {
  let count = 0
  let pos = 0
  const lowerText = text.toLocaleLowerCase('tr-TR')
  const lowerToken = token.toLocaleLowerCase('tr-TR')
  while (true) {
    pos = lowerText.indexOf(lowerToken, pos)
    if (pos === -1) break
    count++
    pos += lowerToken.length
  }
  return count
}

function scoreAndRank(
  kos: ScorableKo[],
  tokens: string[],
  phrase: string,
  topK: number,
): KnowledgeObjectResult[] {
  const scored: Array<{ ko: ScorableKo; score: number; matchedTerms: Set<string>; sourceRefs: SourceRef[] }> = []

  for (const ko of kos) {
    const matchedTerms = new Set<string>()
    let score = 0

    const lowerCode = ko.code?.toLocaleLowerCase('tr-TR') || ''
    const lowerTitle = ko.title.toLocaleLowerCase('tr-TR')
    const lowerContent = ko.content.toLocaleLowerCase('tr-TR')
    const lowerCategory = ko.category?.name?.toLocaleLowerCase('tr-TR') || ''

    for (const token of tokens) {
      const lowerToken = token.toLocaleLowerCase('tr-TR')

      if (lowerCode === lowerToken) {
        score += SCORE_EXACT_CODE
        matchedTerms.add(`code:${token}`)
      }

      if (lowerTitle.includes(lowerToken)) {
        score += SCORE_TITLE_TOKEN
        matchedTerms.add(`title:${token}`)
      }

      if (lowerCategory.includes(lowerToken)) {
        score += SCORE_CATEGORY_TOKEN
        matchedTerms.add(`category:${token}`)
      }

      if (lowerContent.includes(lowerToken)) {
        const hits = Math.min(countOccurrences(lowerContent, lowerToken), SCORE_CONTENT_TOKEN_MAX_HITS)
        score += hits * SCORE_CONTENT_TOKEN
        matchedTerms.add(`content:${token}`)
      }

      for (const kSource of ko.sources) {
        const lowerSourceTitle = kSource.source.title.toLocaleLowerCase('tr-TR')
        if (lowerSourceTitle.includes(lowerToken)) {
          score += SCORE_SOURCE_TITLE_TOKEN
          matchedTerms.add(`source:${token}`)
        }
      }
    }

    if (phrase && lowerTitle.includes(phrase.toLocaleLowerCase('tr-TR'))) {
      score += SCORE_TITLE_PHRASE
      matchedTerms.add('title:phrase')
    }

    if (ko.verificationStatus === 'verified') {
      score += SCORE_VERIFIED_BONUS
      matchedTerms.add('verified')
    }

    let authorityBonus = 0
    for (const kSource of ko.sources) {
      if (kSource.source.authorityLevel === 'high' && authorityBonus < SCORE_HIGH_AUTHORITY_MAX) {
        authorityBonus += SCORE_HIGH_AUTHORITY_BONUS
      }
    }
    if (authorityBonus > 0) {
      score += authorityBonus
      matchedTerms.add('authority')
    }

    const sourceRefs: SourceRef[] = ko.sources.map(s => ({
      sourceId: s.source.id,
      title: s.source.title,
      url: s.source.url,
      authorityLevel: s.source.authorityLevel,
    }))

    scored.push({ ko, score, matchedTerms, sourceRefs })
  }

  const filtered = scored.filter(s => s.score >= MIN_SCORE)

  filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score

    const aExact = a.ko.code && tokens.some(t => a.ko.code!.toLocaleLowerCase('tr-TR') === t.toLocaleLowerCase('tr-TR'))
    const bExact = b.ko.code && tokens.some(t => b.ko.code!.toLocaleLowerCase('tr-TR') === t.toLocaleLowerCase('tr-TR'))
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1

    const aPhrase = phrase && a.ko.title.toLocaleLowerCase('tr-TR').includes(phrase.toLocaleLowerCase('tr-TR'))
    const bPhrase = phrase && b.ko.title.toLocaleLowerCase('tr-TR').includes(phrase.toLocaleLowerCase('tr-TR'))
    if (aPhrase && !bPhrase) return -1
    if (!aPhrase && bPhrase) return 1

    const titleCmp = a.ko.title.localeCompare(b.ko.title, 'tr-TR')
    if (titleCmp !== 0) return titleCmp

    return a.ko.id - b.ko.id
  })

  const distinctTopics = filtered.filter((item, index, rows) => {
    const exactCode = item.matchedTerms.has(
      `code:${item.ko.code?.toLocaleLowerCase('tr-TR')}`,
    )
    if (exactCode) return true
    const topic = item.ko.title.toLocaleLowerCase('tr-TR')
    return rows.findIndex(candidate =>
      candidate.ko.title.toLocaleLowerCase('tr-TR') === topic
    ) === index
  })

  return distinctTopics.slice(0, topK).map(s => ({
    id: s.ko.id,
    title: s.ko.title,
    code: s.ko.code,
    content: s.ko.content,
    summary: s.ko.summary,
    quickAnswer: s.ko.quickAnswer,
    category: s.ko.category,
    score: s.score,
    confidence: Math.min(s.score / 100, 1),
    matchedTerms: Array.from(s.matchedTerms).sort(),
    sourceRefs: s.sourceRefs,
  }))
}

export class LexicalKnowledgeRetriever implements Retriever {
  constructor(private prisma: PrismaClient) {}

  async retrieve(query: RetrieverQuery): Promise<KnowledgeObjectResult[]> {
    const nq = normalizeQuery(expandDomainQuery(query.text))

    if (nq.tokens.length === 0) {
      return []
    }

    const topK = clampTopK(query.maxResults)

    const originalTokens = nq.original.split(/\s+/).filter(t => t.length >= 2)

    const allVariants: string[] = []
    const seenVariants = new Set<string>()
    for (const token of nq.tokens) {
      for (const v of generateCaseVariants(token, originalTokens)) {
        if (!seenVariants.has(v)) {
          seenVariants.add(v)
          allVariants.push(v)
        }
      }
    }

    const baseInclude = {
      category: { select: { name: true } },
      sources: {
        include: {
          source: {
            select: { id: true, title: true, url: true, authorityLevel: true },
          },
        },
      },
    }

    const baseWhere = { status: 'published', isDemo: false }

    const exactCodeCandidates = await this.prisma.knowledgeObject.findMany({
      where: {
        ...baseWhere,
        code: { in: allVariants },
      },
      include: baseInclude,
      take: EXACT_CODE_LIMIT,
    })

    const priorityOR: Array<Record<string, unknown>> = []
    for (const v of allVariants) {
      priorityOR.push({ code: { contains: v, mode: 'insensitive' } })
      priorityOR.push({ title: { contains: v, mode: 'insensitive' } })
      priorityOR.push({ category: { name: { contains: v, mode: 'insensitive' } } })
      priorityOR.push({ sources: { some: { source: { title: { contains: v, mode: 'insensitive' } } } } })
    }
    if (nq.phrase) {
      priorityOR.push({ title: { contains: nq.phrase, mode: 'insensitive' } })
    }

    const priorityCandidates = await this.prisma.knowledgeObject.findMany({
      where: { ...baseWhere, OR: priorityOR },
      include: baseInclude,
      orderBy: { id: 'asc' },
      take: PRIORITY_LIMIT,
    })

    const contentOR: Array<Record<string, unknown>> = []
    for (const v of allVariants) {
      contentOR.push({ content: { contains: v, mode: 'insensitive' } })
    }
    if (nq.phrase) {
      contentOR.push({ content: { contains: nq.phrase, mode: 'insensitive' } })
    }

    const contentCandidates = await this.prisma.knowledgeObject.findMany({
      where: { ...baseWhere, OR: contentOR },
      include: baseInclude,
      orderBy: { id: 'asc' },
      take: CONTENT_LIMIT,
    })

    const seenIds = new Set<number>()
    const merged: ScorableKo[] = []

    for (const ko of exactCodeCandidates) {
      if (merged.length >= CANDIDATE_LIMIT) break
      if (!seenIds.has(ko.id)) {
        seenIds.add(ko.id)
        merged.push(ko)
      }
    }

    for (const ko of priorityCandidates) {
      if (merged.length >= CANDIDATE_LIMIT) break
      if (!seenIds.has(ko.id)) {
        seenIds.add(ko.id)
        merged.push(ko)
      }
    }

    for (const ko of contentCandidates) {
      if (!seenIds.has(ko.id) && merged.length < CANDIDATE_LIMIT) {
        seenIds.add(ko.id)
        merged.push(ko)
      }
    }

    return scoreAndRank(merged, nq.tokens, nq.phrase, topK)
  }
}
