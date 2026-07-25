export { LexicalKnowledgeRetriever } from './lexical-knowledge-retriever'
export { normalizeQuery } from './query-normalizer'
export { expandDomainQuery } from './domain-query-expander'
export { formatKnowledgeContext } from './knowledge-context-formatter'
export { OllamaEmbeddingProvider } from './embedding-provider'
export type { EmbeddingProvider } from './embedding-provider'
export {
  SemanticKnowledgeRetriever,
  cosineSimilarity,
  parseStoredEmbedding,
} from './semantic-knowledge-retriever'
export { HybridKnowledgeRetriever } from './hybrid-knowledge-retriever'
export { createKnowledgeRetriever } from './retriever-factory'
export {
  formatKnowledgeEmbeddingInput,
  indexKnowledgeObjectEmbedding,
  scheduleKnowledgeObjectEmbedding,
} from './knowledge-embedding-indexer'
export type { KnowledgeObjectResult, NormalizedRetrievalQuery, RetrieverQuery, Retriever, SourceRef } from './types'
