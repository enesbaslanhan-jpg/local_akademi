# LocalKarar — targeted security diagnosis, 2026-10-07

Scope: local source review and isolated, non-production reproductions of registration, authentication, audit logging and community controls. No live configuration changes, account deletion or production attack simulation. This is not a complete penetration test. Production source parity, host firewall state and Cloudflare alert configuration were not verified.

## Incident evidence

User-provided audit screenshots show users 17–20 registered through Google on 7 October at 00:27, 00:27, 00:55 and 01:14. User 19 logged in again at 01:05. This does not establish nationality, maliciousness, store-review affiliation or acquisition source. Earlier PostHog persons 12 and 13 correspond to older registrations, not these four accounts.

Cloudflare screenshots show 11 blocked requests in the selected 24 hours. Country counts are pageviews, not registrations. Requests to `/xmlrpc.php` suggest generic scanning but do not establish successful exploitation.

## Confirmed findings

### 1. Failed-login evidence is silently discarded

- `src/services/auth.ts:354` submits `attempt` and `ip` to `createAuditLog`.
- `src/services/audit.ts:4` omits both fields from its metadata allowlist; `sanitizeMetadata` drops them.
- Isolated invocation with a mocked audit database submitted `{attempt:3, ip:'203.0.113.10'}` and captured stored metadata `{}`.
- Impact: failed-login/lock events can appear, but their origin and attempt count are lost in this audit store. Other HTTP logs may retain some information; those were not inspected live.
- Remediation: define a privacy-conscious security-event schema and retention/access policy, preserve the intended fields, and regression-test sanitization.

### 2. Anonymous authentication routes inherit a user-based quota key

- `src/index.ts:114` chooses `user:<id>` for any verified Bearer JWT, otherwise an IP key.
- Registration (`src/services/auth.ts:215`) and social authentication (`:1374`) specify maximum/window but do not override this key generator.
- Installed `@fastify/rate-limit` merges route options with global settings.
- Isolated Fastify reproduction used the production key function and a registration-style route with max=2: same IP, anonymous requests returned `200,200,429`; account A returned `200,200,429`; account B returned `200,200,429`.
- Impact: existing valid sessions multiply the effective per-IP quota on registration/login endpoints. This requires valid signed sessions; forged tokens do not work. No production account creation was performed. Existing per-target login lockouts still apply.
- Remediation: explicitly assign an IP-based key to anonymous auth endpoints; consider additional target-identity limits and separate new-registration limits.

### 3. Unverified email accounts can publish community posts

- Normal registration issues an access token without requiring `emailVerifiedAt`.
- `authenticate` validates account/session/role but does not enforce email verification.
- `src/services/community.ts:619` authenticates and rate-limits posting but has no email verification gate; accepted posts are immediately `published` at line 684.
- Impact: spam/abuse surface, not evidence of admin compromise. Posts remain limited to five per hour per quota key. These four Google accounts use a different flow that verifies Google email.
- Remediation: decide and enforce verification for community writes, with test/review-account behavior explicitly covered. Avoid making all read access dependent on verification without a product decision.

### 4. Audit coverage cannot explain community activity

- Community post/message/report handlers store their domain records but do not call `createAuditLog`.
- Therefore a blank audit history does not mean no community activity occurred. The supplied screenshots already show reports attributed to some new accounts.
- Social audit events record provider, not origin/device; `actorName` is not supplied, so UI shows IDs.
- Auth audit failures are swallowed with `.catch(() => {})`, without a warning at those call sites.
- Remediation: log minimal meaningful security/moderation actions, surface audit-write failures, add user-filtered activity views. Do not copy private message bodies into security logs.

### 5. Application-level security alerting is not established

- Inspected auth/rate-limit paths log or store events but contain no notification threshold for repeated failures, lockouts or signup bursts.
- `src/services/yeni-kullanici-bildirimi.ts` DOES implement a new-user email notice. This is not an attack detector, and its production delivery/settings were not verified.
- Cloudflare external alerts and any host monitoring cannot be assessed from local code alone.
- Remediation: inventory live alerts, then implement deduplicated, threshold-based notifications rather than treating every signup as an attack.

## Checks that succeeded

- `tests/rate-limit-client-key.test.ts`: 14/14 passed.
- Isolated Google token validation: correct token accepted; wrong audience, expired token and unverified email rejected. Local keys only, no external OAuth traffic.
- Inspected admin endpoints enforce admin role server-side; `authenticate` refreshes role from the database and rejects deleted accounts/revoked token versions.
- Inspected workspace membership helpers and private chat routes enforce membership/role checks. This is not exhaustive authorization coverage.
- Docker configuration binds application/Postgres/Redis ports to loopback; firewall script restricts HTTP/S to Cloudflare ranges. Live enforcement is unverified.

## Analytics is not the security audit

`frontend/src/services/analytics.js:163` requires analytics consent; automatic capture, session recording and exception capture are disabled. Missing PostHog data does not establish missing backend activity or failure of Google registration. This privacy choice should not be bypassed to create a security log.

## Recommended order

1. Fix lost audit metadata and silent audit-write failures with regression tests.
2. Correct authentication route quota keys and test same-IP valid-session rotation.
3. Establish verified-email policy for community writes and moderation activity coverage.
4. Verify live firewall/proxy settings and actual alert delivery with authorized read-only production access.
5. Add a minimal admin user-security/activity view, without exposing tokens or private message contents.

No confirmed production compromise was established. Confirmed local-code weaknesses must not be attributed to users 17–20 without further evidence.

## Implementation follow-up (not deployed)

- Audit metadata now retains bounded IP/user-agent, attempt and private-relay fields; persistence errors produce a sanitized operational diagnostic rather than disappearing silently.
- Register/login/social and password-reset endpoints explicitly use IP quota keys, regardless of supplied valid user sessions.
- Community post/media creation and thread/message creation require live database email verification. Read access and reporting/blocking/removing abuse are not verification-gated. No implicit review/admin-account bypass was added.
- Normal successful login, community post creation, private-message creation (identifier only, NOT content) and post/user reports gain audit records. Social login records include actor name and origin/device information. This is not full click/session tracking or exhaustive moderation coverage.
- Admin audit view gains an actor-ID filter; it does not reconstruct previously discarded data.
- A bounded process-local detector emits one warning per 15-minute window at 10 registrations globally or 10 failures from one IP. An optional email notifier is configured through `SECURITY_ALERT_EMAIL_ENABLED=true` and `SECURITY_ALERT_EMAIL_TO` (fallback `SUPPORT_MAIL_TO`). Default is log-only. Live mail delivery has NOT been verified. Counters reset on restart and are not shared across replicas; centralized Cloudflare/host monitoring remains necessary.
- Isolated backend regression tests: 34 passed, including real route verification bindings, rotating-session registration/password-reset quotas, safe audit metadata and detection cooldown. The frontend actor-filter test also passed (1 test). TypeScript no-emit check and frontend production build passed.
- PostgreSQL on local port 5432 is unavailable. Database-backed integration tests have NOT been run; existing community fixtures were updated to represent verified writers.

Before deployment, run database-backed community/auth tests, verify the review/test accounts through the existing email flow if they need to publish/message, and verify the live firewall/proxy configuration. Do not silently mark existing accounts verified. Enable and test mail alerts separately. Define restricted audit access/retention for security-origin data; no retention deletion was introduced here.
