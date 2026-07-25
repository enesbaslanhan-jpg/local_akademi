# Dependency Security Analysis

## Executive Summary

- **Analysis Date:** 2026-07-25
- **Audited Commit:** `6ba19a3`
- **Total Audit Findings:** 4 high severity (npm audit)
- **Direct Vulnerable Packages:** 1 (`@fastify/static@10.1.0`)
- **Transitive Vulnerable Packages:** 3 (`brace-expansion`, `fast-uri`, `find-my-way`)
- **Exploitable in Current Configuration:** 0 (all 4 are NOT REACHABLE)
- **Recommended Action:** `npm audit fix` (patch/minor upgrades only, zero breaking change risk)
- **Final Verdict:** PATCH UPGRADE SUFFICIENT

All 4 advisories were published in July 2026. None of the vulnerabilities are exploitable in LocalAkademi's current configuration due to how the vulnerable code paths are used (or not used) in the application. Nevertheless, upgrading to patched versions is recommended to clean the audit trail and eliminate future risk.

---

## Current Audit Results

```
npm audit --omit=dev

@fastify/static  <=10.1.1  — HIGH  — Authorization Bypass + Path Traversal
brace-expansion  <=5.0.7   — HIGH  — DoS via OOM
fast-uri         3.x/4.x   — HIGH  — Host confusion
find-my-way      <=9.6.0   — HIGH  — HTTP2 DDoS

4 high severity vulnerabilities
```

### Working Tree State
- `git status`: clean (no uncommitted changes)
- Working branch: `audit/localakademi`
- All 741 tests pass

### npm outdated — Relevant Packages
| Package | Current | Wanted | Latest |
|---------|---------|--------|--------|
| `@fastify/static` | 10.1.0 | 10.1.2 | 10.1.2 |
| `@fastify/cors` | 10.1.0 | 10.1.0 | 11.3.0 |

---

## Vulnerability Dependency Chains

### VULN-1: @fastify/static — GHSA-8pvw-jcv7-9cmj + GHSA-83w8-p2f5-377r

| Field | Value |
|-------|-------|
| **Advisories** | GHSA-8pvw-jcv7-9cmj (CVE-2026-7120) + GHSA-83w8-p2f5-377r (CVE-2026-15074) |
| **npm Severity** | HIGH (advisory: 5.3 Moderate / 7.5 High) |
| **CWE** | CWE-180 (Validate Before Canonicalize) / CWE-22 (Path Traversal) |
| **Installed** | `@fastify/static@10.1.0` (direct dependency) |
| **Safe Version** | `10.1.2` |
| **Patch Type** | Minor (10.1.0 → 10.1.2, allowed by `^10.1.0`) |
| **Dependency Chain** | `package.json` → `@fastify/static@^10.1.0` |
| **Fix Command** | `npm audit fix` (updates to 10.1.2) |

**Details:**
- GHSA-8pvw-jcv7-9cmj: `allowedPath` callback evaluates before path normalization. Non-canonical paths bypass filter.
- GHSA-83w8-p2f5-377r: Route-based middleware/guards bypass via `..` / `%2E%2E` path segments.
- Both fixed in `@fastify/static@10.1.2` (which includes 10.1.1 fix for GHSA-83w8 + additional fix for GHSA-8pvw).

### VULN-2: brace-expansion — GHSA-mh99-v99m-4gvg (CVE-2026-14257)

| Field | Value |
|-------|-------|
| **Advisory** | GHSA-mh99-v99m-4gvg (CVE-2026-14257) |
| **Severity** | HIGH (CVSS 7.5) |
| **CWE** | CWE-400 / CWE-770 (Uncontrolled Resource Consumption) |
| **Installed** | `brace-expansion@5.0.7` (transitive) |
| **Safe Version** | `5.0.8` |
| **Patch Type** | Patch (5.0.7 → 5.0.8) |
| **Dependency Chain** | `@fastify/static@10.1.0` → `glob@13.0.6` → `minimatch@10.2.5` → `brace-expansion@5.0.7` |
| **Fix Command** | `npm audit fix` (updates glob's dependency tree) |

**Details:**
- `expand()` bounds result count but not result length. Chained brace groups cause O(n²) memory growth.
- ~7.5 KB input (`{a,b}`.repeat(1500)) crashes Node with uncatchable OOM.
- Fixed via `maxLength` option (default 4,000,000) in 5.0.8.

### VULN-3: fast-uri — GHSA-v2hh-gcrm-f6hx (CVE-2026-16221)

| Field | Value |
|-------|-------|
| **Advisory** | GHSA-v2hh-gcrm-f6hx (CVE-2026-16221) |
| **Severity** | HIGH (CVSS 7.5) |
| **CWE** | CWE-436 (Interpretation Conflict) |
| **Installed** | `fast-uri@3.1.3` + `fast-uri@4.1.0` (two instances, both transitive) |
| **Safe Version** | `3.1.4` / `4.1.1` |
| **Patch Type** | Patch (3.1.3→3.1.4, 4.1.0→4.1.1) |
| **Dependency Chain** | `fastify@5.10.0` → `@fastify/ajv-compiler@4.0.5` → `fast-uri@3.1.3` (via ajv) |
| | `fastify@5.10.0` → `fast-json-stringify@7.0.1` → `fast-uri@4.1.0` |
| **Fix Command** | `npm audit fix` (updates within `^3.1.3` / `^4.1.0` ranges) |

**Details:**
- `fast-uri` does not treat literal backslash (`\`) as authority delimiter. Node's WHATWG URL normalizes `\` to `/`.
- Desync between `fast-uri` and Node's URL parser allows SSRF-style bypass of host-based allowlists.
- Example: `http://evil.com\@allowed.com` — fast-uri sees host `allowed.com`, Node sees host `evil.com`.

### VULN-4: find-my-way — GHSA-c96f-x56v-gq3h (CVE-2026-47219)

| Field | Value |
|-------|-------|
| **Advisory** | GHSA-c96f-x56v-gq3h (CVE-2026-47219) |
| **Severity** | HIGH (CVSS 7.5) |
| **CWE** | CWE-1321 (Prototype Pollution) |
| **Installed** | `find-my-way@9.6.0` (transitive, direct dependency of fastify) |
| **Safe Version** | `9.7.0` |
| **Patch Type** | Minor (9.6.0 → 9.7.0, allowed by `^9.6.0` in fastify) |
| **Dependency Chain** | `fastify@5.10.0` → `find-my-way@9.6.0` |
| **Fix Command** | `npm audit fix` (updates within `^9.6.0` range) |

**Details:**
- `lookup()` passes `req.method` into `find()`, which indexes `this.trees[method]`.
- HTTP/2 methods like `constructor`, `toString`, `__proto__` resolve inherited properties.
- Crashing on `currentNode.prefix.length` when value is not a proper node.
- Requires HTTP/2 server configuration.

---

## @fastify/static Usage Analysis

### Registration
- **File:** `src/index.ts:67-74`
- **Configuration:**
  ```typescript
  const publicPath = join(__dirname, 'public')
  if (existsSync(publicPath)) {
    await server.register(fastifyStatic, {
      root: publicPath,
      prefix: '/',
      index: 'index.html'
    })
  }
  ```

### Purpose
- Serves the built frontend SPA (`dist/public/`) as a static file server.
- Provides SPA history fallback via `index: 'index.html'` (catches unmatched routes).
- Only registered if the `public` directory exists at startup.

### Security Posture
| Question | Answer |
|----------|--------|
| `allowedPath` callback used? | No → GHSA-8pvw-jcv7-9cmj NOT EXPLOITABLE |
| Route guards protecting static files? | No → GHSA-83w8-p2f5-377r NOT EXPLOITABLE |
| Uploaded files served statically? | No → Uploads are in `./uploads/`, not in `./dist/public/` |
| Direct backend file access possible? | Only files within `dist/public/` subtree |
| SPA history fallback present? | Yes, via `index: 'index.html'` |
| Production deployment behind reverse proxy? | Unknown — could be behind Nginx/CDN |

### Upgrade Impact
- `@fastify/static@10.1.2` is a minor bump within the `^10.1.0` range.
- API is fully backward-compatible.
- No code changes needed.
- Fastify 5.10.0 is compatible with `@fastify/static@10.x`.

---

## Reachability and Exploitability

| Vulnerability | CVE | Reachability | Classification |
|--------------|-----|-------------|----------------|
| @fastify/static — Auth bypass (non-canonical URL) | CVE-2026-7120 | `allowedPath` not used | **NOT REACHABLE** |
| @fastify/static — Route guard bypass (path traversal) | CVE-2026-15074 | No route guards on static files | **NOT REACHABLE** |
| brace-expansion — DoS (OOM) | CVE-2026-14257 | Glob only runs at startup on trusted patterns | **NOT REACHABLE** |
| fast-uri — Host confusion | CVE-2026-16221 | No host-based SSRF filtering in app | **NOT REACHABLE** |
| find-my-way — HTTP/2 DoS | CVE-2026-47219 | HTTP/2 not enabled (`http2: false`) | **NOT REACHABLE** |

### Detailed Rationale

**@fastify/static (both advisories):** The static plugin is used as a simple file server for the SPA build output. No `allowedPath` filter is configured, no route-based middleware protects specific files, and the root directory is the public build output which contains only frontend assets. An attacker gaining access to files in `dist/public/` gains nothing they couldn't get by loading the SPA directly. The real security boundary is at the authentication middleware, not at the static file level.

**brace-expansion:** The glob call chain (`@fastify/static` → `glob` → `minimatch` → `brace-expansion`) is used at server startup to enumerate static files. User-controlled input never reaches this code path. There are no user-facing endpoints that accept glob patterns.

**fast-uri:** `fast-uri` is used internally by Fastify for schema validation (ajv) and JSON serialization (fast-json-stringify). The application does not perform any host-based allowlist/denylist validation, SSRF filtering, redirect validation, or outbound proxy routing using `fast-uri`. AI provider URLs come from environment variables, not user input.

**find-my-way:** The HTTP/2 DoS vulnerability only triggers when the Fastify server is configured with `http2: true`. The current server configuration does not enable HTTP/2 (`Fastify({...})` without `http2: true`). Using standard HTTP/1.1, this code path is never reached.

---

## Upgrade Compatibility Matrix

| Package | Current | Safe | Upgrade Type | Fastify Compat | Breaking Risk | Code Changes |
|---------|---------|------|-------------|----------------|---------------|--------------|
| `@fastify/static` | 10.1.0 | 10.1.2 | Minor (patch) | ✅ Full | None | None |
| `brace-expansion` | 5.0.7 | 5.0.8 | Patch | N/A (transitive) | None | None |
| `fast-uri` (v3) | 3.1.3 | 3.1.4 | Patch | ✅ Full | None | None |
| `fast-uri` (v4) | 4.1.0 | 4.1.1 | Patch | ✅ Full | None | None |
| `find-my-way` | 9.6.0 | 9.7.0 | Minor | ✅ Full | None | None |
| `fastify` | 5.10.0 | — | — | — | — | Current version is stable |
| `@fastify/cors` | 10.1.0 | — | — | ✅ Full | — | No audit issue, no need |
| `@fastify/rate-limit` | 11.1.0 | — | — | ✅ Full | — | No audit issue, no need |
| `@fastify/multipart` | 10.1.0 | — | — | ✅ Full | — | No audit issue, no need |

All 4 upgrades are within semver ranges already specified in `package.json`. Running `npm audit fix` (without `--force`) will:
- Update `@fastify/static` from `10.1.0` to `10.1.2` (minor bump, `^10.1.0`)
- Update `brace-expansion` from `5.0.7` to `5.0.8` (transitive, through glob's semver)
- Update `fast-uri@3.1.3` to `3.1.4` (trapped in lockfile update)
- Update `fast-uri@4.1.0` to `4.1.1` (trapped in lockfile update)
- Update `find-my-way` from `9.6.0` to `9.7.0` (minor bump, `^9.6.0`)

---

## Remediation Options

### Option A — `npm audit fix` (Recommended)

| Question | Answer |
|----------|--------|
| Possible? | ✅ Yes, all fixes are within semver ranges |
| Audit closes? | ✅ Yes, all 4 vulnerabilities fixed |
| Breaking change risk | None — all are patch/minor bumps |
| Files to change | `package-lock.json` only (no `package.json` changes) |
| Test requirement | Full regression (741 tests) |
| Risk | None |

### Option B — `@fastify/static` Major Upgrade

| Question | Answer |
|----------|--------|
| Required? | No — patch upgrade is sufficient |
| Latest version | 10.1.2 (still within 10.x) |
| Risk | Not needed |

### Option C — Fastify + Plugin Major Upgrade

| Question | Answer |
|----------|--------|
| Required? | No — current Fastify 5.10.0 is stable and compatible |
| Risk | High (would require coordinated upgrade of all Fastify plugins) |

### Option D — Remove Static Serving

| Question | Answer |
|----------|--------|
| Possible? | Yes, but impractical |
| Impact | SPA would need to be served via separate webserver (Nginx, CDN) |
| Risk | Changes deployment architecture; development complexity increases |
| Recommendation | Not worth it — the vulnerabilities are not exploitable anyway |

### Option E — Accept Temporary Risk

| Question | Answer |
|----------|--------|
| Acceptable? | ✅ Yes — none of the 4 vulns are exploitable |
| Production-ready? | Partially — audit trail shows 4 HIGH findings |
| Compensating controls | Rate limiting, auth middleware, no user-controlled glob/file paths |
| Timeline | Should be fixed before external audit or compliance review |

---

## Recommended Remediation

**PATCH UPGRADE SUFFICIENT**

Run `npm audit fix` and verify with the full test suite. No code changes, no breaking changes, no new dependencies.

**Rationale:**
1. All 4 vulnerabilities are fixed by patch or minor version bumps within existing semver ranges.
2. `npm audit fix` (without `--force`) will update all 4 vulnerable packages in one command.
3. Zero breaking change risk — all updates are within `^` ranges.
4. No code changes needed in `src/` or any source files.
5. Clean audit trail is important for compliance and future reviews.

---

## Phased Implementation Plan

### FAZ 4E1 — Safe Dependency Update

| Item | Detail |
|------|--------|
| Command | `npm audit fix` |
| Files changed | `package-lock.json` only |
| Risk | None (all semver-compatible upgrades) |
| Expected audit result | `found 0 vulnerabilities` |

### FAZ 4E2 — Code Adaptation

| Item | Detail |
|------|--------|
| Required? | No — `@fastify/static@10.1.2` has no API changes |
| Files changed | None |

### FAZ 4E3 — Static Serving and SPA Verification

| Item | Detail |
|------|--------|
| Test | Access `/index.html` → should serve SPA |
| Test | Access non-existent route → should return SPA (history fallback) |
| Test | Access `/health` → should return 200 JSON |
| Files changed | None |

### FAZ 4E4 — Full Test and Audit Verification

| Item | Detail |
|------|--------|
| `npm audit` | `0 vulnerabilities` expected |
| `npm audit --omit=dev` | `0 vulnerabilities` expected |
| `npx tsc --noEmit` | 0 errors expected |
| `npm run build` | Expected success |
| `npx prisma validate` | Expected valid |
| `npm test` | 741/741 expected |

### Rollback
```bash
git checkout -- package-lock.json
npm install
```

---

## Validation Plan

| Step | Command | Expected |
|------|---------|----------|
| 1 | `npm audit fix` | All 4 vulnerabilities resolved |
| 2 | `npm audit` | `found 0 vulnerabilities` |
| 3 | `npm audit --omit=dev` | `found 0 vulnerabilities` |
| 4 | `npm ls @fastify/static` | `@fastify/static@10.1.2` |
| 5 | `npm ls find-my-way` | `find-my-way@9.7.0` |
| 6 | `npx tsc --noEmit` | 0 errors |
| 7 | `npm run build` | Build succeeds |
| 8 | `npx prisma validate` | Schema valid |
| 9 | `npm test` | 741/741 passed |
| 10 | Static file serving test | SPA loads correctly |
| 11 | SPA history fallback test | Non-file routes return SPA |
| 12 | Health endpoint test | `GET /health` returns 200 |
| 13 | Rate limiting test | Login rate limit still works |
| 14 | Security headers test | Headers present on responses |

---

## Rollback Plan

```bash
# Revert lockfile only (no source code changed)
git checkout HEAD -- package-lock.json package.json
npm install

# Verify rollback
npm audit  # Should show 4 vulnerabilities again
npm test   # Should still pass
```

---

## Residual Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| Transitive dependency freeze | If a parent package pins an exact vulnerable version, `npm audit fix` may skip it | Use `overrides` in package.json |
| Future advisories | New vulnerabilities may be discovered in the same packages | Regular `npm audit` in CI/CD |
| @fastify/static@10.1.2 availability | Package must be published and available on npm registry | Verify with `npm view @fastify/static versions` |

---

## Final Verdict

**PATCH UPGRADE SUFFICIENT**

All 4 high-severity npm audit findings are:

1. **Transitive dependencies** (3 of 4) routed through Fastify's internal packages
2. **Not exploitable** in LocalAkademi's current configuration (no `allowedPath`, no HTTP/2, no host-based SSRF filtering, no user-controlled glob patterns)
3. **Fixable with zero breaking changes** via `npm audit fix`

No source code changes are required. The fix is a single command (`npm audit fix`) followed by verification. The next phase (FAZ 4E) should execute this fix and run the full validation plan.

---

## Report Meta

- **Source Code Changes:** None (analysis-only phase)
- **Files Created:** `DEPENDENCY_SECURITY_ANALYSIS.md`
- **Files Modified:** None
- **Working Tree:** Clean (commit `6ba19a3`)
- **Test Results:** 741/741 (unchanged)
- **Next Phase:** FAZ 4E — Execute `npm audit fix` and validate
