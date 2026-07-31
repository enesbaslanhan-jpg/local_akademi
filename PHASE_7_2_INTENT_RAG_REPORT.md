# Phase 7.2 — Intent Routing, RAG Gating, Context Compression & Response Quality

## Goal
Reduce unnecessary LLM calls, cut cloud/CPU costs, and make Mentor responses more predictable for non-technical questions while preserving retrieval + memory for business, tax, and financial questions.

## Constraints respected
- No new AI provider, no model change, no schema migration, no frontend Mentor redesign.
- No KO data changes, no self-knowledge KO, no memory extraction redesign.
- Telemetry flag `AI_MENTOR_TELEMETRY_ENABLED` remains opt-in and never logs user messages, assistant content, secrets, memory, or system prompts.

## What changed

### 1. Deterministic intent router (`src/services/mentor-intent.ts`)
Added a local, regex-based classifier with a small, auditable intent taxonomy:

- `greeting` — Merhaba, Selam, Nasılsın, Teşekkürler, Görüşürüz, etc.
- `system_capability` — "Hangi modelle çalışıyorsun?", "Ollama mı kullanıyorsun?", "AI provider kim?", etc.
- `platform_help` — "Sohbeti nasıl arşivlerim?", "Model laboratuvarı nerede?", etc.
- `clarification_needed` — short ambiguous queries such as "öneri", "model", "yardım".
- `business_knowledge` — gelir modeli, iş modeli Canvas, müşteri segmenti, değer önerisi, SWOT, etc.
- `financial_analysis` — brüt kâr, ciro/kâr farkı, başabaş noktası, nakit akışı, fiyatlandırma, etc.
- `tax_legal` — KDV, vergi, şahıs işletmesi, fatura, vergi levhası, mevzuat, etc.
- `user_business_data` — "geçen ay cirom", "kaydettiğim maliyet", "verilerimi analiz et", etc.
- `selected_knowledge_object` — explicit `knowledgeObjectCode` in the request.
- `general_chat` — fallback for open-ended questions.

An explicit knowledge object code overrides the generic route unless the message is a pure system meta question.

### 2. Deterministic responses (`src/services/mentor-deterministic-responses.ts`)
- Greetings return short, tone-aware Turkish replies.
- System capability questions return the active provider/model/execution type from `getActiveAiRuntimeInfo()`.
- Platform help questions return concise UI guidance.
- Clarification questions ask the user to disambiguate.
- Static disclaimers are attached for `tax_legal` and `financial_analysis` only when a provider is used.

### 3. RAG gating (`src/services/mentor-rag-gate.ts`)
- Knowledge retrieval runs only for `business_knowledge`, `tax_legal`, `financial_analysis`, and `selected_knowledge_object`.
- A relevance gate with per-intent thresholds (tax 0.32, financial 0.36, business 0.30, selected 0.25) filters low-confidence results.
- Exact code matches always pass the gate.
- Citations are emitted only for the intents above plus `user_business_data`.
- Memory is used only for `user_business_data`, `financial_analysis`, `conversation_control`, `general_chat`, and `business_knowledge`.
- Output review is skipped for non-risk intents (`greeting`, `system_capability`, `platform_help`, `clarification_needed`, `business_knowledge`, `financial_analysis`, etc.) to avoid false finance/legal disclaimers.
- Tax/legal and selected-KO keep the output review gate.

### 4. Context compression (`src/services/retrieval/knowledge-context-formatter.ts`)
- `quickAnswer` and `summary` fields are preferred over full KO content for business/tax/financial/user-data intents.
- A 3-KO limit and per-intent total budget (default 6000, compressed 3000) keep prompts short.
- Context is explicitly marked as untrusted reference data.

### 5. Conversation pipeline integration (`src/services/conversation.ts`)
- Non-stream and stream handlers branch on intent before calling the provider.
- Deterministic paths persist a `system` / `intent-rule` response with zero token cost.
- Provider paths pass the intent to `resolveKnowledgeContext`, conditionally build memory, skip output review when safe, and attach a deterministic disclaimer for tax/legal/financial intents.
- Telemetry records the detected intent, confidence, retrieval decision, memory usage, compressed context size, and disclaimer status.

### 6. Model Laboratory visibility fix (already shipped in Phase 7.1 closure)
- Added `/financial-models` and `/financial-cases` proxy rules to `frontend/vite.config.js`.
- Hardened `frontend/src/services/api.js` to reject non-JSON responses.
- Separated API error, real empty, and filtered-empty states in `FinancialModelLibrary.jsx`.
- Added regression tests for the library, `api.request`, and the Vite config.

## Tests added
- `tests/mentor-intent.test.ts` — intent classification coverage.
- `tests/mentor-rag-gate.test.ts` — retrieval, relevance, citation, memory, and output-review gates.
- `tests/mentor-deterministic-response.test.ts` — greeting, runtime info, clarification, platform help, and disclaimers.
- `tests/mentor-context-compression.test.ts` — quickAnswer/summary preference, limits, and truncation.
- `tests/mentor-disclaimer.test.ts` — static disclaimer selection and `skipOutputReview` option propagation.
- Updated `tests/conversation-citation.test.ts` and `tests/mentor-telemetry.test.ts` to align with intent-based routing.

## Verification results

| Check | Command | Result |
|---|---|---|
| Backend test suite | `npm test` | **1075/1075 passed** |
| Type check | `npx tsc --noEmit` | **no errors** |
| Schema validation | `npx prisma validate` | **valid** |
| Frontend tests | `cd frontend; npm test -- --run` | **52/52 passed** |
| Frontend build | `cd frontend; npm run build` | **success** |
| Benchmark (5 representative prompts, llama3.2:3b) | `npm run benchmark:mentor -- --max-prompts=5` | `reports/phase7/mentor-phase7-2-intent-baseline.json` |

### Benchmark observations
- Deterministic greetings (`Merhaba`, `Nasılsın?`, `Teşekkürler`) completed in ~17–25 ms with no LLM call.
- Conversation-control prompts (`Bana kısa cevap ver`, `Önceki cevabı özetle`) still hit the provider and took ~27–70 s on CPU-bound `llama3.2:3b`.
- The memory-conversation test took ~64 s, confirming the heavier provider path is reserved for complex questions.
- The report confirms the intent router successfully avoids provider calls for greetings.

## Files touched
- `src/services/mentor-intent.ts`
- `src/services/mentor-deterministic-responses.ts`
- `src/services/mentor-rag-gate.ts`
- `src/services/ai-provider.ts`
- `src/services/ai-gateway.ts`
- `src/services/conversation.ts`
- `src/services/mentor-telemetry.ts`
- `src/services/retrieval/types.ts`
- `src/services/retrieval/hybrid-knowledge-retriever.ts`
- `src/services/retrieval/semantic-knowledge-retriever.ts`
- `src/services/retrieval/lexical-knowledge-retriever.ts`
- `src/services/retrieval/knowledge-context-formatter.ts`
- `tests/conversation-citation.test.ts`
- `tests/mentor-telemetry.test.ts`
- `tests/mentor-intent.test.ts`
- `tests/mentor-rag-gate.test.ts`
- `tests/mentor-deterministic-response.test.ts`
- `tests/mentor-context-compression.test.ts`
- `tests/mentor-disclaimer.test.ts`
- `reports/phase7/mentor-phase7-2-intent-baseline.json`

## Next steps
1. Run the full 30-prompt benchmark on `llama3.2:3b` once CPU time is available and compare before/after token spend and latency.
2. Add a lightweight smoke test that verifies a greeting returns `provider: system` / `model: intent-rule`.
3. Consider a small set of Turkish synonym expansions for the intent patterns if user logs show misclassification.
4. Keep the output-review bypass under observation; if tax/legal content starts slipping into non-tax intents, tighten the `shouldSkipOutputReview` whitelist.
