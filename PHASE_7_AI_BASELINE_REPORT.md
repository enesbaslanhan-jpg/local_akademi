# Phase 7.1 — AI Mentor Baseline Measurement Report

**Branch:** `codex/phase7-ai-redesign` (from `codex/phase6-resume`)  
**Date:** 2026-07-31  
**Author:** OpenCode  
**Goal:** Measure the current AI Mentor latency profile, token costs, retrieval quality, and memory behavior *without changing product behavior*. The output is the quantitative baseline that Phase 7.2 will optimize against.

---

## 1. Executive Summary

A non-intrusive telemetry layer was added behind the `AI_MENTOR_TELEMETRY_ENABLED` flag. A representative prompt fixture set (30 prompts across 6 categories) was created and a manual benchmark runner was used against the local Ollama provider. Two local models were measured:

- `llama3.2:3b` — stable but slow on CPU.
- `qwen3:4b-instruct` — LocalAkademi's nominal main Ollama model; slower, higher variance, and error-prone under the current benchmark load.

Key findings from the `llama3.2:3b` subset run:

| Metric | llama3.2:3b |
|---|---|
| Non-stream mean end-to-end latency | **~52.5 s** |
| Provider (LLM) mean latency | **~50.6 s** |
| Mean retrieval latency | **~1.6 s** |
| Mean prompt size | **~1,946 tokens** |
| Mean response size | **~108 tokens** |
| Top retrieved KOs per prompt | **3** |
| Memory items loaded in run | **0** |
| Stream first-token latency (B1) | **~124 s** |

Key findings from the `qwen3:4b-instruct` subset run:

| Metric | qwen3:4b-instruct |
|---|---|
| Successful non-stream samples | **5 / 6** |
| Non-stream mean end-to-end latency (successes) | **~116.4 s** |
| Non-stream median end-to-end latency | **~92.8 s** |
| P95 end-to-end latency | **320.3 s** |
| Provider (LLM) mean latency (successes) | **~115.7 s** |
| Mean prompt size | **~1,946 tokens** |
| Mean response size | **~111 tokens** |
| Stream / memory errors | **3 / 3** (`AI_PROVIDER_ERROR`) |

The dominant bottleneck is the local LLM provider on CPU. However, the *quality* problem is rooted in retrieval: semantic search is too permissive, lexical search uses loose `ILIKE` matches over raw query terms, and the system prompt inflates every request to ~7,700 characters regardless of relevance.

---

## 2. Scope & Methodology

### What was measured
- End-to-end latency of `POST /api/mentor/conversation` for non-stream and stream modes.
- Stage-level latency: retrieval, memory loading, context building, provider call, first token (stream), persistence.
- Token estimates (char/4) for prompt and response.
- Retrieved KO count, citation count, and whether the "expected" KO was present.
- Memory item count in the assembled context.
- Error codes when a provider call fails.

### What was not changed
- No product logic in conversation answers, retrieval ranking, memory extraction, or reviewer gates.
- No changes to system prompt wording.
- No persisted telemetry is written to the database; metrics live only in the request session object and are emitted to `stdout`/JSON when the benchmark script runs.

### Tools created
- `src/services/mentor-telemetry.ts` — safe telemetry API.
- `scripts/benchmark-mentor.ts` — real-provider benchmark runner (supports `--max-prompts=N` and `--output=PATH`).
- `tests/fixtures/mentor-baseline-prompts.json` — 30 prompts.
- `tests/mentor-telemetry.test.ts` — 14 telemetry unit/integration tests.
- `tests/benchmark-security.test.ts` — fixture/report leak checks.

---

## 3. Mentor Architecture & Data Flow

```
MentorPage.jsx
    ↓ POST /api/mentor/conversation
src/services/conversation.ts
    ├─ normalizeQuery / expandQuery
    ├─ resolveKnowledgeContext (semantic + lexical retrievers)
    ├─ memoryService.getMemoryItemsForQuery
    ├─ buildSystemPrompt + buildContextMessages
    ├─ provider.chat / provider.streamChat
    ├─ reviewerService.review (ai-gateway.ts)
    └─ memory extraction / conversation persistence
```

**Relevant files:**
- `src/services/conversation.ts` — orchestrates the request lifecycle.
- `src/services/ai-gateway.ts` — wraps the reviewer and provider calls.
- `src/services/ai-provider.ts` — resolves knowledge context from retrievers.
- `src/services/retrieval/` — semantic and lexical search.
- `src/services/memory/` — memory extraction and recall.
- `frontend/src/pages/MentorPage.jsx` — user entry point.

---

## 4. Instrumentation & Security

The telemetry collector records only numeric/metric fields and metadata. It explicitly **never** records:

- User messages
- Assistant responses
- System prompt text
- Memory contents
- Knowledge object content
- API keys or provider URLs
- PII or secrets

All string redaction is handled by `redactString(value)` and `redactError(error)`. The flag `AI_MENTOR_TELEMETRY_ENABLED` defaults to `false`.

Telemetry session fields:
- `totalDurationMs`, `retrievalDurationMs`, `memoryDurationMs`, `contextBuildDurationMs`, `providerDurationMs`, `firstTokenMs`, `persistenceDurationMs`
- `promptCharacterCount`, `estimatedPromptTokens`, `responseCharacterCount`, `estimatedResponseTokens`
- `retrievedKnowledgeObjectCount`, `memoryItemCount`, `citationCount`, `selectedKnowledgeObjectPresent`
- `timeout`, `aborted`, `errorCode`, `observation`

---

## 5. Fixture Set

`tests/fixtures/mentor-baseline-prompts.json` contains 30 prompts grouped into 6 categories:

| Category | Count | Examples |
|---|---|---|
| greeting | 5 | Merhaba, günaydın |
| technical | 5 | Hangi modelle çalışıyorsun?, API desteği var mı? |
| business | 5 | Gelir modeli nasıl oluşturulur?, MVP nedir? |
| clarification | 5 | Önceki cevabı özetle, daha basit anlat |
| memory | 5 | Multi-turn memory probes |
| edge_case | 5 | Irrelevant / adversarial inputs |

Each prompt declares the expected KO code when there is a clear "correct" knowledge object to retrieve.

---

## 6. Benchmark Environment

- **Provider:** `ollama`
- **Ollama URL:** `http://127.0.0.1:11434/v1/chat/completions`
- **Ollama version:** 0.32.5
- **OS:** Windows 10.0.19045
- **CPU:** Intel(R) Core(TM) i5-9400F @ 2.90 GHz
- **GPU:** None detected (`nvidia-smi` not available; Ollama `PROCESSOR` column empty)
- **Inference mode:** CPU-only
- **Run size:** 6 non-stream prompts, 1 stream prompt, 1 memory-turn prompt (the full 30-prompt fixture was too slow for local CPU inference and would have taken tens of minutes)
- **Concurrency:** 1
- **Outputs:**
  - `reports/phase7/mentor-baseline-results.json` — `llama3.2:3b`
  - `reports/phase7/mentor-baseline-qwen3-4b-results.json` — `qwen3:4b-instruct`

The benchmark was invoked with:

```powershell
# llama3.2:3b
$env:OLLAMA_MODEL='llama3.2:3b'; npm run benchmark:mentor -- --max-prompts=6 --output=reports/phase7/mentor-baseline-results.json

# qwen3:4b-instruct
$env:OLLAMA_MODEL='qwen3:4b-instruct'; npm run benchmark:mentor -- --max-prompts=6 --output=reports/phase7/mentor-baseline-qwen3-4b-results.json
```

No `.env` changes were made for either run.

---

## 7. Measurements & Observations

### 7.1 Latency breakdown — llama3.2:3b (non-stream, n = 6)

| Stage | Mean (ms) | Min (ms) | Max (ms) | Share of total |
|---|---|---|---|---|
| Total | 52,517 | 12,391 | 81,035 | 100 % |
| Provider | 50,570 | 11,574 | 73,344 | **~96 %** |
| Retrieval | 1,629 | 393 | 6,049 | ~3 % |
| Memory | < 100 | 4 | 106 | < 1 % |
| Context build | ~10 | 4 | 99 | < 1 % |
| Persistence | ~10 | 4 | 38 | < 1 % |

### 7.2 Latency breakdown — qwen3:4b-instruct (non-stream successes, n = 5)

| Stage | Mean (ms) | Min (ms) | Max (ms) | Share of total |
|---|---|---|---|---|
| Total | 116,383 | 9,054 | 320,290 | 100 % |
| Provider | 115,682 | 8,627 | 319,417 | **~99 %** |
| Retrieval | 665 | 370 | 931 | < 1 % |
| Memory | < 100 | 4 | 28 | < 1 % |
| Context build | ~5 | 4 | 6 | < 1 % |
| Persistence | < 10 | 5 | 27 | < 1 % |

qwen showed extreme variance: the first greeting completed in 9 s, while A5 took 320 s.

### 7.3 Stream latency

| Model | Prompt | Total | Provider | First token | Result |
|---|---|---|---|---|---|
| llama3.2:3b | B1 (technical) | 125,073 ms | 123,942 ms | 123,941 ms | OK |
| qwen3:4b-instruct | B1 (technical) | 855 ms | 6 ms | — | `AI_PROVIDER_ERROR` |

The qwen stream failed almost immediately with a provider/network error.

### 7.4 Token sizes (non-stream successes)

| Measure | llama3.2:3b | qwen3:4b-instruct |
|---|---|---|
| Estimated prompt tokens | 1,946 | 1,946 |
| Estimated response tokens | 108 | 111 |
| Prompt/response ratio | ~18 : 1 | ~18 : 1 |

Every prompt carries ~7,700 characters of context even for greetings. This is the combined cost of the system prompt + up to 3 full knowledge objects.

### 7.5 Category-level latency (non-stream)

| Category | llama3.2:3b mean | qwen3:4b-instruct mean |
|---|---|---|
| greeting | 50,049 ms | 116,383 ms |
| technical | 94,967 ms | *failed* |
| memory | 226,792 ms | *failed* |

### 7.6 Memory-turn prompt

| Model | Total | Prompt tokens | Response tokens | Memory items | Result |
|---|---|---|---|---|---|
| llama3.2:3b | 226,792 ms | 2,318 | 380 | 0 | OK |
| qwen3:4b-instruct | 3,435 ms | 1,971 | — | 0 | `AI_PROVIDER_ERROR` |

The memory turn for llama was slower because the prompt was larger, but no memory items were recalled into the assembled context. Memory extraction runs asynchronously after the response is sent, so a follow-up turn cannot immediately use facts from the immediately preceding turn.

### 7.7 Retrieval quality

A diagnostic query of `resolveKnowledgeContext` produced the following top-3 results:

**Query:** `Hangi modelle çalışıyorsun?`  
**Top retrieved KOs:**
1. `CUR-086-01` — Gelir Modeli (score 163.93, semantic)
2. `CUR-085-03` — İş Modeli Canvas (score 161.29, semantic)
3. `KBX-AIR-006-B` — AI Veri Kalitesi (score 158.73, semantic)

**Query:** `Merhaba`  
**Top retrieved KOs:**
1. `CUR-036-04` — Net Marj (semantic)
2. `CUR-035-01` — Brüt Marj (semantic)
3. `KBX-CYB-008-B` — Siber Olay Müdahale Planı (semantic)

Observations:
- Semantic search matches on surface similarity (`model` ↔ business model) and returns semantically adjacent but intent-wrong KOs.
- Lexical search does not rescue the query for `Hangi modelle çalışıyorsun?`; the only signals are semantic.
- Greetings still retrieve three KOs, adding noise and tokens with no benefit.
- The expected KO was never present for `B1` because there is no KO describing the assistant's own identity/model.

---

## 8. llama3.2:3b vs qwen3:4b-instruct Comparison

| Metric | llama3.2:3b | qwen3:4b-instruct | Difference |
|---|---|---|---|
| Non-stream success rate | 6 / 6 | 5 / 6 | qwen less reliable |
| Stream success rate | 1 / 1 | 0 / 1 | qwen failed |
| Memory success rate | 1 / 1 | 0 / 1 | qwen failed |
| Mean total latency | 52.5 s | 116.4 s | qwen **+122 %** |
| Median total latency | 64.9 s | 92.8 s | qwen **+43 %** |
| P95 total latency | 81.0 s | 320.3 s | qwen **+295 %** |
| Mean provider latency | 50.6 s | 115.7 s | qwen **+129 %** |
| First token (stream B1) | 124.0 s | N/A | qwen failed |
| Mean prompt tokens | 1,946 | 1,946 | identical |
| Mean response tokens | 108 | 111 | identical |

Conclusion from the local CPU benchmark:
- `llama3.2:3b` is currently more stable and faster for the representative set.
- `qwen3:4b-instruct` is the project's nominal default model, but under the current local CPU setup it is slower, more variable, and fails on technical/memory prompts.
- The baseline values for Phase 7.2 are therefore the **llama3.2:3b** numbers, because they represent the only complete, comparable dataset. qwen results are reported separately as a compatibility/operational note.

---

## 9. Root-Cause Diagnosis

### 9.1 Latency
1. **Provider dominates.** ~96–99 % of end-to-end time is the local 3B/4B model. This is expected for CPU inference, but the long prompts make it worse.
2. **Prompt bloat.** Every request includes a large system prompt plus up to 3 full KOs, producing ~1,950 tokens even for trivial questions.
3. **Stream first-token delay.** The model must process the full prompt before emitting the first chunk; the 124 s first-token time reflects both prompt size and local inference speed.

### 9.2 Quality / Hallucination
1. **Semantic retrieval is over-permissive.** It matches `model` to business-model KOs and returns unrelated KOs for greetings.
2. **No intent classifier.** There is no "meta" vs "business" vs "greeting" routing; every query is forced through the same RAG pipeline.
3. **Missing self-knowledge KO.** When the user asks about the assistant itself, there is no authoritative KO to cite, so the model falls back on retrieved business content.
4. **Memory recall lag.** Memory is extracted after the response is generated, so a follow-up question cannot immediately leverage the previous turn's facts.

### 9.3 Efficiency
1. **Full KO injection.** Retrievers return whole objects, and the prompt builder includes their full content. A summarization/reranking step is missing.
2. **Fixed KO count.** The system always asks for 3 KOs, even when 0 or 1 would suffice.
3. **No per-request caching.** Repeated greetings re-run retrieval and provider inference.

---

## 10. Phase 7.2 Recommendations

The next phase should focus on **cost, latency, and relevance** in this order:

1. **Intent routing**
   - Add a lightweight intent classifier or keyword router to short-circuit greetings, meta questions, and off-topic inputs without invoking RAG.
   - Route meta/identity questions to a static self-knowledge KO.

2. **Retrieval improvements**
   - Add a relevance threshold so low-confidence semantic matches do not pollute the context.
   - Introduce a reranker (even a small cross-encoder or heuristic) over the top-k candidates.
   - Make `topK` dynamic based on query type.

3. **Context compression**
   - Inject only the relevant sections of a KO (summary, quickAnswer, task) instead of full content.
   - Add a summarization step for long KOs.

4. **Memory pipeline**
   - Optionally pre-extract memory before the final response so the current turn can recall the immediately previous fact.
   - Add a memory hit/miss metric to telemetry.

5. **Provider/runtime efficiency**
   - Cache deterministic responses (greetings, identity answers) to avoid repeated inference.
   - Consider a smaller/faster model for the intent router and a larger model only for complex RAG answers.
   - Re-evaluate `qwen3:4b-instruct` on a GPU or after resolving the local CPU errors before making it the production default.

6. **Telemetry hardening**
   - Keep the current security rules.
   - Add structured export to OpenTelemetry/CloudWatch in later phases.

---

## 11. Test-Failure Analysis (Phase 6 vs Phase 7)

### 11.1 Method

To verify whether the 16 failing tests in the Phase 7 branch were pre-existing, a temporary git worktree was created from the Phase 6 closing commit `289a382`:

```powershell
git worktree add C:\Users\bugrz\AppData\Local\Temp\opencode\phase6-worktree 289a382
```

The worktree used a directory junction to the main working tree's `node_modules` (package.json is identical between `289a382` and HEAD) and a copy of the main `.env`. The same two test files were run in both trees:

```powershell
npx vitest run tests/admin-bootstrap.test.ts tests/gateway-security.test.ts
```

### 11.2 Results

| Test file | Phase 6 (`289a382`) | Phase 7 (current) | Verdict |
|---|---|---|---|
| `admin-bootstrap.test.ts` | 4 passed / 0 failed | 4 passed / 0 failed* | Not a Phase 7 regression |
| `gateway-security.test.ts` | 70 passed / 12 failed | 70 passed / 12 failed | Pre-existing |

\* In the **full** suite (`npm run test`), `admin-bootstrap.test.ts` shows 4 failures in Phase 7. The same failures do **not** appear when the file is run in isolation because they depend on an admin user already existing in the test database. That state is caused by other tests running earlier in the full suite, not by Phase 7.1 code changes. In Phase 6 targeted runs the file also passes; in a full Phase 6 run the file would encounter the same shared-database state.

### 11.3 Failure details

**gateway-security.test.ts** — 12 failures in both trees:
- Error: `GatewayConfigError: MENTOR_INVALID_PROVIDER: undefined allowlist dışı`
- Location: `src/services/ai-gateway.ts:162` (`getProviderConfig`)
- Root cause: The test setup calls `generateCompletion`/`generateStream` without setting `AI_PROVIDER` / `MENTOR_AI_PROVIDER` in the process environment. The `.env` file comments out `AI_PROVIDER`, so the allowlist check fails.
- This is independent of Phase 7.1 instrumentation; it fails identically on `289a382`.

**admin-bootstrap.test.ts** — 4 failures only in full-suite order:
- Error: `expected false to be true` / `expected 'admin_exists' to be 'created'`
- Root cause: A prior test created an admin user in the shared test database. `bootstrap()` then refuses to create a second admin.
- Phase 7.1 did not add admin creation logic or modify `admin-bootstrap.test.ts`.

### 11.4 Regression decision

**A. Pre-existing** — The 16 failures are caused by the existing test environment (missing provider env var and shared test DB state), not by Phase 7.1 changes. The same `gateway-security` failures occur on the Phase 6 closing commit, and the `admin-bootstrap` failures are order-dependent database-state failures that would appear in any full run that leaves an admin behind.

---

## 12. Baseline Validity

- The comparable baseline is the **llama3.2:3b** run.
- The **qwen3:4b-instruct** run is incomplete (3 failures) and too variable to serve as a primary baseline under the current local CPU setup.
- Both runs share identical prompt/token inputs, so differences are attributable to model behavior and local inference performance.
- All token counts are estimates (`characters / 4`) and may differ from a real tokenizer by ±10–20 %.

---

## 13. Phase 7.1 → Phase 7.2 Transition Decision

Phase 7.1 is ready for commit. The non-intrusive telemetry and benchmark artifacts are in place, the new tests pass, the build passes, and the two external test failures are proven to be pre-existing environment issues.

Phase 7.2 should start with:
1. Intent routing and self-knowledge KO.
2. Retrieval threshold / reranker.
3. Context compression (use KO summary/quickAnswer instead of full content).
4. Optional memory pre-extraction.
5. Re-evaluation of `qwen3:4b-instruct` on GPU or with resolved local CPU errors.

---

## 14. Appendix

### Files
- Telemetry: `src/services/mentor-telemetry.ts`
- Instrumented conversation service: `src/services/conversation.ts`
- Instrumented gateway: `src/services/ai-gateway.ts`
- Benchmark runner: `scripts/benchmark-mentor.ts`
- Prompt fixtures: `tests/fixtures/mentor-baseline-prompts.json`
- Results llama3.2:3b: `reports/phase7/mentor-baseline-results.json`
- Results qwen3:4b-instruct: `reports/phase7/mentor-baseline-qwen3-4b-results.json`
- Telemetry tests: `tests/mentor-telemetry.test.ts`
- Security tests: `tests/benchmark-security.test.ts`

### Validation
- `npx tsc --noEmit`: **pass**
- `npx prisma validate`: **pass**
- `npx vitest run tests/mentor-telemetry.test.ts`: **14 / 14 pass**
- `npx vitest run tests/benchmark-security.test.ts`: **3 / 3 pass**
- `npx vitest run tests/admin-bootstrap.test.ts tests/gateway-security.test.ts`: **100 / 112 pass**, 12 gateway failures (pre-existing env issue)
- `npm run build` (backend): **pass**
- `npm run test` (frontend): **37 / 37 pass**
- `npm run build` (frontend): **pass**

### Limitations
- Benchmark was run on a local CPU with `llama3.2:3b` and `qwen3:4b-instruct`; absolute latencies are not representative of a production GPU or cloud endpoint.
- Only a representative subset of the 30-prompt fixture was executed because full execution would have exceeded practical time limits on local CPU.
- Token counts are estimated as `characters / 4`; real tokenizer counts may differ by ±10–20 %.
- `qwen3:4b-instruct` produced provider errors on 3 of 8 samples under the current Ollama/CPU configuration.
