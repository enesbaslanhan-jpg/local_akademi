import { PrismaClient } from '@prisma/client'
import { HybridKnowledgeRetriever } from './hybrid-knowledge-retriever'
import { LexicalKnowledgeRetriever } from './lexical-knowledge-retriever'
import { OllamaEmbeddingProvider } from './embedding-provider'
import { SemanticKnowledgeRetriever } from './semantic-knowledge-retriever'
import type { Retriever } from './types'

export function createKnowledgeRetriever(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Retriever {
  const lexical = new LexicalKnowledgeRetriever(prisma)
  if (env.RAG_RETRIEVAL_MODE !== 'hybrid') return lexical
  return new HybridKnowledgeRetriever(
    lexical,
    new SemanticKnowledgeRetriever(
      prisma,
      new OllamaEmbeddingProvider(),
    ),
  )
}
