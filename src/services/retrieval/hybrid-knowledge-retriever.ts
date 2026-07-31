import type {
  KnowledgeObjectResult,
  Retriever,
  RetrieverQuery,
} from './types'

const RRF_K = 60

export class HybridKnowledgeRetriever implements Retriever {
  constructor(
    private lexical: Retriever,
    private semantic: Retriever,
  ) {}

  async retrieve(query: RetrieverQuery): Promise<KnowledgeObjectResult[]> {
    const topK = Math.max(
      1,
      Math.min(Math.floor(query.maxResults || 3), 5),
    )
    const expanded = { ...query, maxResults: 5 }
    const lexical = await this.lexical.retrieve(expanded)
    let semantic: KnowledgeObjectResult[] = []
    try {
      semantic = await this.semantic.retrieve(expanded)
    } catch {
      return lexical.slice(0, topK)
    }

    const byId = new Map<
      number,
      { result: KnowledgeObjectResult; rankScore: number }
    >()
    const add = (
      rows: KnowledgeObjectResult[],
      channel: 'lexical' | 'semantic',
    ) => {
      rows.forEach((result, index) => {
        const existing = byId.get(result.id)
        const rankScore =
          (existing?.rankScore || 0) + 1 / (RRF_K + index + 1)
        byId.set(result.id, {
          result: existing
            ? {
                ...existing.result,
                matchedTerms: Array.from(
                  new Set([
                    ...existing.result.matchedTerms,
                    ...result.matchedTerms,
                    channel,
                  ]),
                ).sort(),
              }
            : {
                ...result,
                matchedTerms: Array.from(
                  new Set([...result.matchedTerms, channel]),
                ).sort(),
              },
          rankScore,
        })
      })
    }
    add(lexical, 'lexical')
    add(semantic, 'semantic')

    return Array.from(byId.values())
      .sort((left, right) => {
        const leftExact = left.result.matchedTerms.some(term =>
          term.startsWith('code:'),
        )
        const rightExact = right.result.matchedTerms.some(term =>
          term.startsWith('code:'),
        )
        if (leftExact !== rightExact) return leftExact ? -1 : 1
        return (
          right.rankScore - left.rankScore ||
          right.result.score - left.result.score ||
          left.result.id - right.result.id
        )
      })
      .filter((item, index, rows) => {
        const exactCode = item.result.matchedTerms.some(term =>
          term.startsWith('code:'),
        )
        if (exactCode) return true
        const topic = item.result.title.toLocaleLowerCase('tr-TR')
        return rows.findIndex(candidate =>
          candidate.result.title.toLocaleLowerCase('tr-TR') === topic
        ) === index
      })
.slice(0, topK)
    .map(item => ({
      ...item.result,
      score: Number((item.rankScore * 10000).toFixed(4)),
      confidence: Number(item.rankScore.toFixed(4)),
    }))
  }
}
