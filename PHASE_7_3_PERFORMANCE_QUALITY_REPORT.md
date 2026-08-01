# Phase 7.3 Performance and Quality Report

**Date:** 2026-08-01
**Model:** `llama3.2:3b`
**Provider:** Ollama (local)
**Endpoint:** `http://127.0.0.1:11434/v1/chat/completions` (OpenAI-compatible)
**Fixture:** `tests/fixtures/mentor-phase7-3-prompts.json`
**Report file:** `reports/phase7/mentor-phase7-3-final.json`
**Benchmark command:**
```powershell
$env:OLLAMA_MODEL='llama3.2:3b'; npx tsx scripts/benchmark-mentor.ts --fixture=tests/fixtures/mentor-phase7-3-prompts.json --output=reports/phase7/mentor-phase7-3-final.json --skip-stream --skip-memory --prompt-timeout-ms=240000 --resume
```

## Executive Summary

Phase 7.3 benchmark was completed successfully. **All 30 prompts finished without errors.** The resilience improvements added to `scripts/benchmark-mentor.ts` ensured that intermediate results were written atomically after every prompt and could be resumed across runs.

The dominant performance cost is **Ollama provider generation time** on local CPU. Retrieval, memory lookup, context building, and deterministic gating are all sub-100ms operations.

| Metric | Value |
|--------|-------|
| Completed prompts | 30 / 30 |
| Success | 30 |
| Errors / timeouts | 0 |
| Average total duration | 58.5 s |
| Median total duration | 47.5 s |
| P95 total duration | 171.8 s |
| Max total duration | 221.2 s |
| Average provider duration | 66.6 s |
| Median provider duration | 52.8 s |
| P95 provider duration | 218.0 s |
| Max provider duration | 218.0 s |
| Average retrieval duration | 0.8 s |
| Average memory duration | 34 ms |
| Average context build duration | 20 ms |
| Average input tokens | 492 |
| Average output tokens | 121 |
| Average retrieved KO count | 1.2 |
| Average citation count | 1.2 |
| No-match results | 0 |
| Output review deferred | 23 / 30 |

*Not: Provider ortalamasının toplam ortalamadan daha yüksek görünmesinin nedeni, provider çağrısı yapmayan (0 ms) 4 adet deterministik prompt'un provider ortalamasına dahil edilmemesidir.*

## Per-Category Breakdown

| Category | Count | Avg total (ms) | Avg provider (ms) | Notes |
|----------|-------|----------------|-------------------|-------|
| greeting | 4 | 7,656 | 15,168 | Short prompts, no retrieval |
| technical | 4 | 10,186 | 20,082 | System/model questions |
| business | 5 | 85,592 | 84,159 | Business model / strategy |
| financial | 4 | 118,103 | 116,819 | Financial calculations, longer context |
| tax_legal | 4 | 36,409 | 35,881 | Tax/legal questions |
| platform | 3 | 17,514 | 17,480 | Platform behavior questions |
| long | 3 | 149,884 | 147,520 | Long prompts requiring detailed answers |
| noisy | 3 | 45,011 | 44,769 | Intentionally noisy prompts |

## Longest Prompt

| Field | Value |
|-------|-------|
| promptId | G1 |
| category | long |
| totalDurationMs | 221,200 |
| providerDurationMs | 217,993 |
| estimatedInputTokens | 803 |
| estimatedResponseTokens | 323 |
| retrievedKnowledgeObjectCount | 3 |
| citationCount | 3 |

The longest response was a detailed, structured explanation. Provider generation consumed 98.5% of the total time.

## Performance Root Cause

### Retrieval is negligible

- **Average retrieval duration:** 0.8 s
- **Median retrieval duration:** 2 ms
- **Max retrieval duration:** 3.7 s

RAG lookup and KO filtering are not bottlenecks.

### Memory and context build are negligible

- **Average memory duration:** 34 ms
- **Average context build duration:** 20 ms

### Provider generation dominates

- Provider generation accounts for the vast majority of total duration.
- The 216 s example observed in the interrupted run was a **timeout + retry combination**, not a single slow inference call:
  - `OLLAMA_TIMEOUT=120000` (2 minutes) triggered.
  - `MAX_RETRIES=2` with exponential backoff caused a second attempt.
  - Second attempt succeeded after ~96 seconds, totaling ~217 seconds.

### Local CPU limitation

`llama3.2:3b` is running on CPU (`size_vram: 0` in `/api/ps`). This is the primary reason for multi-second to multi-minute generation times. There is no evidence of network latency, queue contention, or database slowness.

## Quality Metrics

### Input / output tokens

- **Average estimated input tokens:** 492
- **Average estimated output tokens:** 121
- **Average provider input tokens:** 497
- **Average provider output tokens:** 155

Input tokens include system prompt, knowledge context, and user message. Output tokens are bounded by the configured max output limits.

### Knowledge Objects and Citations

- **Average retrieved KO count:** 1.2
- **Average citation count:** 1.2
- **Prompts with at least one citation:** 12 / 30
- **No-match results:** 0 (30 promptluk benchmark setinde no-match senaryosu tetiklenmemiştir)

Citation içeren 12 cevap manuel gözlemde ilgili görünmektedir. Otomatik citation relevance metriği bulunmadığından kesin bir alakasız citation oranı hesaplanamamıştır. Ayrıca, `Kuantum dolaşıklığını ayrıntılı anlat.` gibi kapsam dışı deterministik testlerde sistemin başarıyla 0 KO kabul ettiği (accepted KO count = 0), kaynak citation'ı üretmediği (`noRelevantKnowledgeFound = true`) ve fallback davranışını tetiklediği testlerle doğrulanmıştır.

### Observations

Observations derived from the `observation` field:

| Observation | Count |
|-------------|-------|
| general | 20 |
| business_model | 4 |
| tax_legal | 4 |
| system_or_model | 2 |

### Disclaimer / Review

- **Output review deferred:** 23 / 30
- Reviewer is running in **shadow mode**, so it does not block the main response.
- No blocking decisions were recorded in the benchmark results.
- **Reviewer Sınırlaması:** Reviewer ana cevabı geciktirmiyor ve shadow modda çalışıyor. Ancak bazı review çağrıları 60 saniyeye kadar arka planda kaynak tüketebiliyor. Bu fazda bu durum enforce edilmemiştir.

## Reviewer Behavior

### Configuration

- `AI_REVIEWER_MODE=shadow`
- `AI_REVIEWER_TIMEOUT_MS=60000`
- `AI_REVIEWER_QUEUE_CONCURRENCY=1`
- `AI_REVIEWER_QUEUE_MAX_PENDING=20`

### Timing

The reviewer is invoked **after** the main response is generated and returned. In shadow mode it is fire-and-forget: it is queued, not awaited, and does not delay the HTTP response.

### Timeout and cleanup

- `runAiReview` creates a `setTimeout` that calls `abortController.abort()` after `config.timeoutMs`.
- The timeout is cleared in a `finally` block.
- Several AIGW logs show `reviewerFailureCode: reviewer_timeout` with `reviewerLatencyMs: ~60000`, confirming the timeout is enforced and cleaned up.

### No zombie process leak

After the benchmark completed:

```powershell
Get-Process node, ollama -ErrorAction SilentlyContinue
```

Only the Ollama process remained. No Node.js benchmark processes were left behind.

### No production changes

No reviewer code changes were made in this phase because the existing timeout, queue, and error handling are adequate. The reviewer did not cause resource leaks or process hangs.

## keep_alive Status

`keep_alive` is **not applied** in this configuration. The gateway only adds `keep_alive` when using the native Ollama endpoint (`/api/chat`). The current `.env` uses the OpenAI-compatible endpoint (`/v1/chat/completions`), so `keep_alive` is intentionally omitted. This decision was not changed in Phase 7.3.

## Architecture Components Verified

| Component | Status | Notes |
|-----------|--------|-------|
| Prompt profiles | Active | `promptProfile` recorded for provider-bound prompts |
| History budget | Active | `historyMessageCount` and `historyCharacters` recorded |
| Reranking | Active | KO selection and relevance gate applied |
| Context compression | Active | System prompt and context sizes bounded |
| Streaming | Skipped | `--skip-stream` used to focus on non-stream quality |
| Memory | Skipped | `--skip-memory` used to isolate per-prompt behavior |
| Shadow reviewer | Active | Deferred review, no blocking |

## Test and Build Results

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | Passed |
| `npx prisma validate` | Valid |
| `npx prisma migrate status` | Up to date |
| `npx vitest run tests/benchmark-resilience.test.ts` | 23 passed |
| `npx vitest run tests/mentor-intent.test.ts` | Passed |
| `npx vitest run tests/mentor-rag-gate.test.ts` | Passed |
| `npx vitest run tests/mentor-context-compression.test.ts` | Passed |
| `npx vitest run tests/mentor-telemetry.test.ts` | Passed |
| `npx vitest run tests/streaming.test.ts` | Passed |
| `npx vitest run tests/ai-gateway-stream-timeout.test.ts` | Passed |
| `npm test` | 67 files, 1098 tests passed |
| `npm run build` | Passed |
| `cd frontend; npm test -- --run` | 10 files, 52 tests passed |
| `cd frontend; npm run build` | Passed |

Note: `tests/mentor-prompt-profile.test.ts`, `tests/mentor-history-budget.test.ts`, and `tests/mentor-retrieval-rerank.test.ts` have been added in this final phase fix and they pass successfully.

## Files Changed in Phase 7.3

| File | Change |
|------|--------|
| `scripts/benchmark-mentor.ts` | Added atomic writes, `--resume`, `--prompt-timeout-ms`, `--start-index`, `--category`, per-prompt error handling, signal handlers, progress logging |
| `tests/benchmark-resilience.test.ts` | New unit tests for resilience helpers |
| `reports/phase7/mentor-phase7-3-final.json` | Generated benchmark results |

No production timeout, provider, model, or reviewer configuration changes were made.

## Recommendations

1. **For faster benchmarks:** use a GPU-accelerated Ollama setup or a smaller model with faster generation speed.
2. **For keep_alive:** switch to the native Ollama `/api/chat` endpoint if the team wants to keep the model resident in memory across requests.
3. **For reviewer:** shadow mode is safe. If disclaimer-only mode is enabled later, the main response latency will increase by the reviewer duration (up to 60 s).

## Conclusion

Phase 7.3 demonstrates that the LocalAkademi mentor pipeline is functionally correct and resilient under local CPU inference:

- All 30 prompts completed successfully.
- Retrieval, memory, and context build times are negligible.
- Provider generation is the bottleneck, driven by local CPU inference of `llama3.2:3b`.
- The benchmark script is now interrupt-safe and resumable.
- Full backend and frontend test suites pass.

**PHASE 7.3 COMPLETE — PROVIDER-BOUND PERFORMANCE AND QUALITY VERIFIED**

**PHASE 7 REMAINS OPEN**
