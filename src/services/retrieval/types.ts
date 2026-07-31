export interface SourceRef {
  sourceId: string
  title: string
  url: string | null
  authorityLevel: string
}

export interface KnowledgeObjectResult {
  id: number
  title: string
  code: string | null
  content: string
  summary?: string | null
  quickAnswer?: string | null
  category: { name: string } | null
  score: number
  confidence: number
  matchedTerms: string[]
  sourceRefs: SourceRef[]
}

export interface NormalizedRetrievalQuery {
  original: string
  normalized: string
  phrase: string
  tokens: string[]
}

export interface RetrieverQuery {
  text: string
  maxResults?: number
}

export interface Retriever {
  retrieve(query: RetrieverQuery): Promise<KnowledgeObjectResult[]>
}
