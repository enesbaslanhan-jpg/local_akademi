# AI Gateway & Provider Failover v1

Date: 2026-09-07. Branch: `design/localkarar-18`. The gateway baseline was committed locally as `cec48b4`; the later latency and legal-disclosure updates remain uncommitted. No push, deployment, or database migration was performed. The ignored local `.env` was configured without committing secrets.

## Current architecture audit

The active Mentor flow is `conversation.ts` → `ai-provider.ts` → `ai-gateway.ts`. The deprecated Mentor endpoint uses `RealAiChatProvider`, which reaches the same gateway. Conversation persistence, citations, retrieval, history budgets, deterministic intent replies and financial-model calculations already exist. They have not been replaced.

Before this change, the gateway selected one provider from environment configuration. It supported Ollama, NVIDIA, OpenAI, DeepSeek and OmniRoute through a shared chat-completions body and separate completion/stream transports. There was no Gemini adapter. Mistral is referenced in operational comments as an upstream service, not as a standalone adapter; OmniRoute already supports routing to compatible upstream endpoints. Existing OmniRoute URL/model restrictions and the external-provider opt-in policy are reused.

The gateway already masked sensitive patterns, reviewed input/output, supported a shadow/disclaimer reviewer, normalized usage, and logged through a safe field allowlist. Completion had two retries against the same provider with exponential delay; streaming used an inactivity timeout but had no provider failover. Completion timeout ended after response headers, leaving body consumption unbounded. Retry-After was parsed as integer seconds with no upper bound. There was no circuit breaker or provider health surface. The eager configuration dictionary could let one unrelated malformed endpoint disable another provider.

Single points of failure: selected provider/key/model, shared upstream quota behind a router, and the local process. Provider/model defaults lived in gateway configuration; Mentor call wrappers also read `MENTOR_AI_PROVIDER` / `MENTOR_AI_MODEL`. These legacy settings remain supported when V1 is off. With V1 on, a logical profile selects candidates instead. No provider/model selection branches were added to Mentor business logic.

Privacy audit: marketplace context already uses aggregates and normalized product metrics, not raw orders. System prompts included the user's full name. Workspace context included record titles/descriptions, document filenames and extracted document text. Provider exceptions could be stored in `conversationMessage.error` and later returned to the browser; the deprecated endpoint logged raw exception messages. These paths were corrected below.

Existing tests cover provider policy, OmniRoute/Ollama, streaming timeouts, deterministic Mentor behavior, prompt profiles, masking, retrieval, financial tools and reviewer gates. New fake-provider and gateway integration suites extend them.

## Implementation

`provider-router.ts` defines `AIProvider`, `ProviderRegistry`, `ProviderRouter`, logical profiles, normalized failures, process-local health and an injectable attempt-metrics sink. `ai-provider-registry.ts` contains Gemini and a generic OpenAI-compatible adapter. The latter reuses the existing gateway's configuration, policy and request-body builder for NVIDIA, OmniRoute, OpenAI, DeepSeek and Ollama. Configuration is now lazy per provider.

Gemini uses `generateContent`, `systemInstruction`, `contents` with user/model roles, `generationConfig`, the `x-goog-api-key` header and normalized usage. Thought parts are not returned as answer text. The implementation was checked against the [official Gemini API reference](https://ai.google.dev/api/generate-content). NVIDIA uses the existing chat-completions endpoint and normalized choices/usage, consistent with the [official NVIDIA NIM API reference](https://docs.api.nvidia.com/nim/reference/llm-apis). OmniRoute remains configurable through its existing OpenAI-compatible contract; no new assumptions about its upstream availability or SLA are made.

## Profiles and routing

- `MENTOR_FAST`, `MENTOR_STANDARD`, `MENTOR_REASONING`, `MENTOR_FALLBACK` are accepted logical profiles.
- `AI_PROVIDER_CANDIDATES_JSON` maps each configured profile to ordered candidates: enabled, providerId, model, priority, timeoutMs, maxRetries, supportsReasoning.
- Configuration is validated, limited to 12 candidates per profile, 120 seconds per attempt and at most 3 retries. Malformed configuration fails closed without exposing its contents.
- Without JSON, configured Gemini → OmniRoute → NVIDIA → existing configured providers are considered. FAST/STANDARD/FALLBACK initially share this migration-safe order; production can tune them independently in JSON.
- REASONING requires an explicit verified `supportsReasoning: true` candidate. It does not guess reasoning capability from a model name.
- Disabled or open candidates are skipped. Priority orders the remaining healthy candidates. Authentication/configuration errors immediately open that candidate and try the next one.
- 429, timeout, 5xx, network and empty/malformed responses use bounded retries then failover. Invalid requests and safety refusals stop routing instead of attempting to evade the problem through another provider.

## Retry, timeout and circuit breaker

Each attempt has an abortable deadline covering fetch and body parsing. User cancellation interrupts the attempt and retry wait without counting as provider failure or calling another provider. Backoff starts at 250 ms, doubles with 0–250 ms jitter, and is bounded at 2 seconds. Retry-After supports seconds and HTTP dates. Longer rate-limit waits cool down the candidate and immediately try another provider instead of holding the request asleep.

Three consecutive failed attempts open a circuit; auth/config errors open immediately. Cooldown is at least 30 seconds and at most 5 minutes according to Retry-After. After cooldown, one request owns the half-open probe; concurrent requests skip it. Success resets consecutive failures and the circuit. State is per provider/model, in memory, and resets on process restart. Multiple application instances have independent circuits. No DB migration or PostHog dependency was added.

## Streaming and compatibility

V1 uses an explicit buffered policy: generate a complete answer, run existing output checks/reviewer handling, then emit provider → delta → done. Usage, citations and conversation persistence retain their contracts. Failure before completion can fail over; no partial answer is emitted, so two provider answers cannot be combined. Cancellation keeps the existing cancelled state. Native token-by-token streaming remains available on the legacy path when V1 is disabled.

Tradeoff: V1 increases time to first visible answer. The loading/cancel UI remains active. This is intentional; low-latency native streaming can be added later with the same no-failover-after-first-delta rule.

Deterministic calculation code is unchanged. Existing calculation results remain inputs to explanation, and numeric aggregate fields are preserved by structured redaction. The gateway performs no financial calculation.

## Context redaction

Existing email, Turkish phone, identity/tax-ID, IBAN, card, bearer-token and credential masking is retained. Added labeled customer/full-name/address redaction, key-pattern coverage and recursive structured context redaction. Customer, address, credentials, payments and raw-order fields are removed by key; aggregate/calculation values remain unchanged. V1 forces masking even if a caller requests `skipMasking`.

User full names are removed at prompt construction. In V1, active-workspace records use normalized type/status/amount/date fields instead of free-text title/description; document context uses metadata instead of filenames/raw extracted text; workspace legal names are omitted. This deliberately limits cloud document explanation to the supplied metadata and deterministic results.

Scope limitation: pattern redaction is not named-entity recognition. Unlabeled names/addresses voluntarily typed into free-form messages, historical summaries, product titles or memory text cannot be guaranteed identifiable by regex. Structured customer/order sources are excluded and supported formats are tested; do not interpret PASS as a universal PII-detection guarantee.

## User-facing errors

All exhausted provider paths use `AI_MENTOR_TEMPORARILY_UNAVAILABLE`.

TR: AI Mentor şu anda yanıt veremiyor. Birkaç dakika sonra tekrar deneyebilirsin.

EN: AI Mentor is temporarily unavailable. Please try again in a few minutes.

Frontend i18n maps the code and persisted failed messages to the localized text. New failed conversation records store the safe code, not exception text. Readback sanitizes older error records, and message bubbles never render raw error text. The deprecated endpoint returns the same safe error without raw exception logging. Successful conversation/citation contracts are preserved.

## Observability and admin

Every attempt emits allowlisted metadata: generated requestId, provider, logical profile, model, latency, success, normalized error/status, retry count, fallback position and token usage if provided. Events with the same requestId reconstruct the failover path. Neither prompts, provider response bodies, headers, keys nor customer payloads are logged. Metrics sink failure cannot change routing.

`GET /admin/ai-gateway/health` uses existing authentication plus admin-role enforcement. It returns HEALTHY/DEGRADED/OPEN/DISABLED, last success/failure, consecutive failures, process-lifetime rate-limit count and average latency, circuit state and cooldown/config-error state. It intentionally excludes models, URLs and keys. The endpoint is the minimal admin surface; no dashboard dependency was added.

## Configuration and production rollout

`.env.example` documents the new flag, profile, Gemini key/model, NVIDIA base URL and JSON mapping. Existing key/URL/model environment variables remain reusable. Legacy `NVIDIA_API_URL` takes precedence over `NVIDIA_BASE_URL`. Credentials remain in environment configuration only.

Recommended production after successful provider checks:

```dotenv
AI_GATEWAY_ENABLED=true
AI_ALLOW_EXTERNAL_PROVIDERS=true
AI_MENTOR_PROFILE=MENTOR_STANDARD
```

Set actual supported models and credentials through the deployment's existing secret/configuration mechanism; do not use placeholder model names. The local development gateway is enabled. For the production deployment, keep `AI_GATEWAY_ENABLED=false` until a second independent live candidate joins the verified Gemini path and the rotated credentials are installed. Rollback is the same flag set to false. The ignored local `.env` was corrected during follow-up configuration, but is not tracked or committed.

### Server-hosted OmniRoute topology

The repository now supports LocalKarar running in Docker while OmniRoute runs on the same server host. `docker-compose.yml` passes all gateway, Gemini, NVIDIA and OmniRoute variables into the application container and maps `host.docker.internal` to Docker's host gateway on Linux.

The recommended stable contract is a Priority combo named `localkarar-mentor` in the OmniRoute dashboard. LocalKarar sends that logical model ID on every OpenAI-compatible request; the dashboard controls the combo's concrete model order. Selecting a model elsewhere in the OmniRoute UI does not remove the OpenAI API's required `model` field. A stable combo name prevents UI model changes from requiring a LocalKarar deployment.

Use `OMNIROUTE_BASE_URL=http://host.docker.internal:<published-api-port>/v1` when OmniRoute publishes its API on the host. Do not assume the dashboard and API ports are the same in split-port production mode. OmniRoute's documented defaults are single-port 20128, or separate production API port 20131. If both applications are containers on the same Docker network, prefer `http://<omniroute-service-name>:<container-api-port>/v1` and avoid a host-published internal API port.

The local configuration now places the verified direct Gemini adapter first for `MENTOR_STANDARD`, followed by OmniRoute and NVIDIA. This avoids adding a known five-second upstream wait to every user response while keeping OmniRoute available as a failover. The OmniRoute candidate has `maxRetries: 0` because its combo owns upstream retry/failover; this prevents multiplicative retries across both routing layers. `AI_GATEWAY_ENABLED=true` and `AI_ALLOW_EXTERNAL_PROVIDERS=true` are applied in the ignored local `.env`.

Local OmniRoute 3.8.48 is operational on port 20128 and `/v1/models` exposes the stable `localkarar-mentor` combo. Its Priority sequence is now native Gemini `gemini-3.6-flash` followed by native NVIDIA `google/gemma-3-4b-it`; the quota-exhausted Mistral target and the slow custom NVIDIA-compatible target were removed from this combo. Both connections reuse the existing gitignored environment credentials, and the OmniRoute database was backed up before the change. Combo retries are disabled so a failed target hands off immediately, while request metrics remain enabled. `host.docker.internal` is accepted as a local gateway host by both the registry and the legacy OmniRoute policy, matching the existing Docker host-gateway mapping. On this Windows development host, a `LocalKarar OmniRoute` logon task starts the daemon from the user home directory; its database was checkpointed after a stale read-only launch and the authenticated model catalog returned 200.

## Verification

| Check | Result |
|---|---|
| Full backend `npm test`, final run | PASS — 152 files, 2,208 tests |
| Previously failing `business-tracker` suite, repeated after repair | PASS — 1 file, 27 tests |
| New router + gateway/provider policy tests, final targeted run | PASS — 3 files, 37 tests |
| Related Mentor/provider/financial tests | PASS — 10 files, 87 tests before final additions; included in final full run |
| Failed-suite isolation + workspace privacy check | PASS — 5 files, 72 tests |
| Full frontend tests | PASS — 63 files, 471 tests |
| Backend TypeScript / build | PASS — `npm run build` |
| Frontend production build | PASS — existing large-chunk warning; no build error |
| i18n validation | PASS — 10 namespaces, 3,958 aligned keys; 105 existing dynamic-key warnings |
| Repository secret scanner | PASS exit code — 179 warnings remain in existing content/test/sample files; not a zero-warning repository |
| Actual environment-secret comparison against 23 task files | PASS — 0 matches; no values printed |
| Git diff whitespace check | PASS |
| Lint | No lint script configured in either package |

The first full run reported 7 failures: 2 streaming assertions still expected the old provider error code, and 5 failures involved retrieval schema preparation and marketplace sync state. The streaming assertions now enforce the new safe error contract, including persisted error readback. The other suites passed when rerun without product changes to those subsystems. A later run exposed an order-dependent `business-tracker` test: it expected a record created by an earlier test and did not fully clean both workspaces. The test now creates and deletes its own uniquely named fixtures, while suite cleanup removes records, history, notifications, reminders, documents and contacts for both workspaces. The repaired file passed 27/27 and the latest full run passed 2,208/2,208.

Vitest now pins default AI transport to an unreachable loopback endpoint with a test-only key. Provider-specific tests override it and stub `fetch`. This prevents a developer `.env` from sending test prompts to OmniRoute or consuming live quotas.

The deterministic fake-provider suites cover all 17 requested scenarios: primary-only success, 429 retry/backoff, timeout, 500, auth/config, third fallback, total failure, open skip, cooldown/probe/reset, bounded retries, no secret/prompt log leakage, safe client errors, PII removal, preserved calculation values, profile mapping, disabled candidates and buffered streaming failover. Additional tests cover caller cancellation, body-read deadlines, malformed/truncated responses, invalid-request/safety no-failover without damaging health, Retry-After cooldown, Gemini request shape, Gemini `MAX_TOKENS` rejection and admin authentication/authorization.

## Real provider smoke

Executed `scripts/smoke-ai-gateway-v1.ts` with the existing environment using a benign `Reply with OK.` request, no customer/business data and no response-body logging. The smoke deadline is bounded and can be raised through `AI_SMOKE_TIMEOUT_MS` for slow development endpoints.

| Provider | Result |
|---|---|
| Gemini | PASS — direct request returned a valid response within the 30-second smoke deadline |
| NVIDIA | FAIL — NETWORK_OR_TIMEOUT at the 30-second direct smoke deadline |
| OmniRoute | PASS — updated `localkarar-mentor` completed through native Gemini 3.6 Flash in 2.160 seconds and produced 176 output tokens |
| OpenAI | SKIP — no key |
| DeepSeek | SKIP — no key |

Follow-up after operator configuration: `GEMINI_MODEL=gemini-3.7-flash`, `NVIDIA_MODEL=deepseek-ai/deepseek-v4-flash-0731`, `AI_MENTOR_PROFILE=MENTOR_STANDARD`, `AI_GATEWAY_ENABLED=true` and `AI_ALLOW_EXTERNAL_PROVIDERS=true` are set in the local, gitignored `.env`. All three provider keys are detected. Earlier outcomes were Gemini `EMPTY_RESPONSE` under the original 16-token ceiling and direct NVIDIA `INVALID_REQUEST` before the model/endpoint correction.

Gemini 3 thinking tokens initially exhausted the 450-token Mentor profile and produced only an introductory sentence. The adapter now uses `thinkingLevel: low`, reserves a configurable 2,048-token output floor for thinking plus visible text, and rejects `MAX_TOKENS` results instead of returning partial content. A real `/mentor/conversations/:id/messages` request using the reported prompt, `Kâr marjını nasıl hesaplarım?`, returned 200 through Gemini in 2.731 seconds with an 885-character answer containing the requested formula. The backend was restarted with this configuration.

The Privacy and KVKK Notice and Terms of Use now disclose dynamic provider failover, Google Gemini, NVIDIA NIM, data minimisation/masking, provider-dependent retention and training conditions, and the deterministic calculation boundary. Their required-consent versions are `2026-09-07`; the existing consent mechanism will request acceptance of the new versions.

Provider policy tests now stub the network transport unconditionally. A developer's live `.env` can no longer make these tests consume provider quota.

Mistral currently has no available quota. NVIDIA's corrected endpoint/model reached generation through OmniRoute but did not complete inside the tested deadlines. Gemini is the currently verified live provider and successfully carries the gateway fallback path.

The OmniRoute free-provider catalog was also checked directly. Its 100-item free-tier category includes many providers that still require an account or API key; only six are no-auth. One benign test per attempted no-auth provider found DuckDuckGo AI Chat blocked by its anonymous-session anti-abuse limit (418), Chipotle unavailable upstream (502), MiMoCode rejecting its advertised auto model (400), and The Old LLM forbidden (403). They were not added to the production combo. Gemini 2.5 Flash was also rejected for new users (404); OmniRoute's upstream response directed migration to Gemini 3.6 Flash, which passed. NVIDIA's advertised Step 3.5 Flash model was retired (410), so the native NVIDIA fallback now uses `google/gemma-3-4b-it`, selected from NVIDIA's authenticated live model catalog. Its next live generation should remain a production preflight check because the task's provider smoke policy limits repeated real requests.

## Remaining production blockers

1. Run one production-preflight generation against native NVIDIA `google/gemma-3-4b-it`; it is present in NVIDIA's live authenticated catalog but was not called again after the catalog's retired Step model consumed the bounded smoke attempt. Today Gemini is the independently verified successful live candidate.
2. Configure a verified reasoning-capable model before selecting MENTOR_REASONING.
3. Rotate the OmniRoute and NVIDIA credentials before production because their values appeared in local diagnostic tool output during this work. No credential value was committed to Git or included in application logs/reports.
Free-form PII limitations and buffered-stream latency remain explicit operational constraints, even though the final full test suite passes.

## Final readiness

Adapter READY means implementation and mocked contract tests; individual live availability is reported separately above. The gateway is implemented, enabled in the local environment and verified through a real fallback to Gemini.

| Required verdict | Status |
|---|---|
| Gemini adapter | READY |
| NVIDIA adapter | READY |
| OmniRoute adapter | READY |
| Existing provider adapter | READY |
| Automatic failover | READY |
| Circuit breaker | READY |
| Raw provider error leakage | 0 — tested client/error persistence paths |
| PII redaction | PASS — supported structured fields and labeled formats; limitations above |
| Admin health | READY |
| Tests | PASS — 152 files, 2,208 tests; frontend 63 files, 471 tests |
| AI GATEWAY V1 READY | YES — local gateway enabled; complete 2.731-second Mentor response verified; OmniRoute active as failover |
