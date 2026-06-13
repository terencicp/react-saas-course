# Chapter 080 — Error discipline

## Lesson 1 — Refuse by default

**Taught.** Fail-closed as the load-bearing rule of the chapter: every access gate (auth, tenancy, paywall, signature verify, idempotency claim, CSRF) must treat a thrown exception as a refusal, never a pass; the structural enforcement is two seams — the check throws on failure, one wrapper catches and converts to refusal in one place.

**Cut.** The paywall-fails-open-for-UX anti-pattern (e) from the outline was described in the Buckets caution callout but not given its own named code example; the outline listed it as a fifth named anti-pattern — later lessons needing it will have to construct the example themselves.

**Debts.** Lesson 1 closes by pointing forward: lesson 2 covers the user-message vs operator-message split (what the user sees vs what lands in the log/Sentry); lesson 3 walks all six seams end to end as a codebase audit. Sentry capture wiring is forward-referenced to ch092 — named once as "where the operator detail goes."

**Terminology.**
- **Fail-closed** — gate refuses when it cannot *prove* the request is allowed, including when the check itself throws. Term component used.
- **Fail-open** — gate allows on a broken check; always a bug unless deliberately documented. Term component used.
- **"Every doubt is a deny"** — the durable one-liner for fail-closed.
- **"One place to lint"** — architectural property: all fail-closed logic lives inside `authedAction`/`authedRoute`; auditors read one file.
- Named anti-patterns to grep for: *log-and-continue empty catch*, *boolean swallow*, *`||` carve-out*, *signature verify returns `false` on exception*.
- **`safeLimit`** — the one deliberate fail-open helper (`lib/rate-limit.ts`); Redis down → `{ success: true }` + error log.

**Patterns and best practices.**
- `requireOrgUser()` / `requireRole()` never return a "we don't know" sentinel (`null`/`false`/`boolean`). A clean signed-out / org-less state is a **`redirect()`** (control flow → `/sign-in` or `/onboarding/create-org`, passes through `error.tsx` untouched); a genuinely **broken** read (dropped connection, impossible `null`) **throws** to `error.tsx`. Both refuse — the user never gets the resource.
- `authedAction` is the canonical wrapper: `requireOrgUser` → `roleAtLeast` check → `schema.safeParse` → `tenantDb(orgId)` ctx → `fn(input, ctx)`. Role-too-low returns `err('forbidden', ...)` (an expected refusal, **not** a throw); no-session/no-org `redirect`s; a broken session/membership read throws to `error.tsx`; bad input returns `err('validation', ...)`. Note: `requireOrgUser()` takes **no** role argument — the role gate is the separate `roleAtLeast(role)` check.
- `authedAction` must never be forked/copied; extend it when a real need appears.
- Audit grep: `'use server'` files not importing `authedAction`; exported route verbs in `route.ts` not importing `authedRoute`.
- `notFound()` / `redirect()` are framework control-flow — re-throw them if caught, never swallow.
- Fail-open is allowed only as a documented carve-out with a written reason in one helper (e.g., `safeLimit`).
- Canonical `Result` codes used: `'forbidden'`, `'validation'`, `'unauthorized'`, `'internal'`. (`'validation'` — not `'invalid_input'`.)

**Misc.**
- `authedAction` signature: `(role: Role, schema: ZodType, fn: (input, ctx) => Promise<Result<T>>) => (formData: FormData) => Promise<Result<T>>`. `ctx` carries `{ user, orgId, role, db: tenantDb(orgId) }`.
- The `AnnotatedCode` block for `authedAction` is intentionally paraphrased/trimmed from the real implementation — later lessons should treat the shape (not literal code) as canonical.
- Fail-closed boundary: applies only to **access decisions**; product defaults (e.g., theme → `'system'`) are neither fail-open nor fail-closed.
- The webhook seam lesson tie-in: fail-closed + idempotency are paired — refuse aggressively (500), retry safely; dedup ledger ensures exactly-once execution.

## Lesson 2 — Two audiences, two messages

**Taught.** Every error is two artifacts forked at the wrapper's catch block: a sanitized one-sentence `userMessage` for the user, and a rich structured operator record (cause chain, ctx, redacted input, requestId) for the engineer/support/auditor; the split is a property of the wrapper, not a per-call-site discipline.

**Cut.** The chapter outline listed `plan_limit` as a named `ErrorCode`; the lesson explicitly rejected it — the canonical set is the seven from ch043 (`validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal`). `plan_limit` is a sanctioned domain extension at most, not a core code.

**Debts.**
- Sentry SDK setup (`beforeSend` config, breadcrumbs, releases, source maps) deferred to ch092 L1 — named here as "where the operator side is consumed."
- pino setup, fixed JSON key set, `requestId` via AsyncLocalStorage, pino redaction config, Vercel Drains — ch092 L2/L3/L4. The rule (one redaction list, structural) landed here; wiring did not.
- i18n of `userMessage` strings — ch084; noted once as "string is still authored for a human."
- ESLint rules catching leak/bypass patterns — ch097.
- Tests against wrappers/mapper — ch088.
- Audit entries not being error logs (they ride inside the write transaction and roll back with it) — ch057 L5 / ch081 L3; named once.
- Full seam-by-seam audit walk + grep-for-bypass steps — lesson 3.

**Terminology.**
- **Two messages / one failure, two readers** — the chapter's second load-bearing rule; every error produces two artifacts diverging at the wrapper.
- **Operator** — the on-call engineer reading Sentry, the support rep, the auditor; distinct from the end user. (Term component used.)
- **Read-aloud test** — if a support rep can't read the string aloud on a call without translating or leaking, it isn't user-shaped.
- **Operator-honest, user-opaque** — durable one-liner for the operator vs user side.
- **Cause chain** — the `Error.cause` linked list walked from outer error to root, lives on the operator side. (Term component used.)
- **Correlation ID / `requestId`** — per-request ID joining the user-quoted reference to the full operator event; rule defined here, wiring deferred to ch092. (Term component used.)
- **Redactor** — the single config (pino redaction + Sentry `beforeSend`) stripping sensitive keys; rule defined here, wiring deferred to ch092. (Term component used.)
- **`digest`** — Next.js's stable opaque hash replacing `error.message` on the client in production; the only operator detail allowed through to the user; joinable via Sentry/logs.
- **RFC 9457 Problem Details** — standard HTTP error body shape `{ type, title, status, detail, fieldErrors? }`; project's `problem()` helper omits `instance`.
- **`mapError`** — the single dispatch in `lib/error-mapping.ts` mapping error instances to `Result<never>`; every wrapper calls it; every new error class adds one row.

**Patterns and best practices.**
- The wrapper's catch block is the one place the fork lives: (1) capture rich operator record, (2) return sanitized `Result`/Problem Details. `error.message` is read for the log, never for `userMessage`.
- `mapError(error): Result<never>` in `lib/error-mapping.ts` is the centralized split enforcer. New error class → one new row; no per-action user string invention.
- `ZodError` → `err('validation', 'Check the highlighted fields.', z.flattenError(e).fieldErrors)` — use `flattenError`, not `treeifyError`.
- Postgres 23505 → `err('conflict', 'That value is already taken.')` via `isUniqueViolation` helper; individual actions may override copy with more context.
- Postgres 23503 → `err('conflict', 'A related record is missing.')`.
- Domain error classes → their tailored `err(code, userMessage)` with no operator detail in the sentence.
- Unmatched fallback → `err('internal', 'Something went wrong. Please try again.')`.
- `code` is the stable machine identifier (analytics, branching); `userMessage` is the human display string (rendered, translatable). Never render `code` as the message; never group analytics on `userMessage`.
- Field errors (`flattenError` output) are user messages — flow through the same channel, not a bypass. Author Zod error messages user-shaped at the schema.
- `error.tsx` renders product copy only; never reads `error.message`; uses `unstable_retry()` (not `reset()`) for the retry affordance; exposes at most `error.digest` as a quotable reference.
- `global-error.tsx` wraps the entire shell — assume nothing above survived; same `useEffect` Sentry capture.
- 404 over 403 on cross-tenant access: user sees generic "Not found" (identical to a truly missing resource); operator log carries `cross_tenant_attempt` event with user/org/ID.
- Never derive `userMessage` from `cause.message`; the rewrap pattern (`new DomainError('…', { cause })`) enforces the split if respected — pasting `cause.message` into the rendered string re-leaks the inner error.
- Passwords must never appear in the operator log even though the wrapper logs parsed input; for sign-in/password-change actions, log only action name + userId, not the input object.
- Sensitive keys stripped structurally: `password`, `token`, `secret`, `apiKey`, `authorization`, `cookie`, `set-cookie`, `paymentMethodId`, `webhookSecret` — one list, one config location.
- Webhook seam: provider is the "user"; response body is minimal Problem Details; status codes by failure class: 400 malformed, 401 bad signature, 409 dedup, 200 processed, 500 unexpected (triggers retry). Rate-limit rejections use identical opaque message regardless of which gate tripped.

**Misc.**
- The `authedAction` catch block shown is intentionally paraphrased/illustrative (same posture as lesson 1); treat shape as canonical, not literal source.
- `problemFrom(result.error)` maps a `Result` error to the matching HTTP status; one business function feeds both `authedAction` (returns `Result`) and `authedRoute` (returns Problem Details).
- `authedRoute` catch mirrors `authedAction` catch: same two moves (capture → map), different user-facing artifact (Problem Details instead of `Result`).
- `error.tsx` is a `'use client'` component; Sentry capture via `useEffect(() => Sentry.captureException(error), [error])`. Sentry's React integration auto-captures but the explicit call is the canonical anchor, especially in `global-error.tsx`.
- Lesson 2 introduced the `lib/error-mapping.ts` file by name and showed its shape; it is not exhaustively built — the lesson's posture is "name and recognize, not author."

## Lesson 3 — Walking the six error seams

**Taught.** Applied the two rules (fail-closed, two messages) as a codebase-wide audit walk across all six error seams: `authedAction`, `authedRoute`, page/layout `requireOrgUser()`, webhook receiver, `safeLimit`, and `error.tsx`/`global-error.tsx`; each seam was walked via the same four-question template (where it lives, where fail-closed lands, where message-split lands, audit grep) and the lesson closed with the rule that every new feature's errors must fit one of the six or add a seventh seam deliberately.

**Cut.** The chapter outline's "audit deliverable — six paragraphs" exercise (student writes one paragraph per seam naming the file, wrapper, and a concrete commit/PR) was replaced by a `Buckets` classification drill and a `TextAnswer` recall exercise for one assigned seam — the six-paragraph free-write was too heavy for an inline exercise. The chapter outline listed `plan_limit` in the canonical `code` set; the lesson used the seven-code set from lesson 2 (`validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal`) without `plan_limit`.

**Debts.**
- ESLint/lint rules automating the grep patterns at PR time — ch097 (named once in the closing section).
- Sentry SDK wiring and structured-logger consumption of the operator side — ch092 (named once).
- Full audit project (error discipline + security baseline against a seeded codebase) — ch082 (named as the consumer of this lesson's mental map).
- Security baseline audit (CSP, headers, GDPR, secrets, dep hygiene) against the same seams — ch081.

**Terminology.**
- **Six seams** — the complete, closed catalog of error-flow shapes in the app: `authedAction` (Server Action boundary), `authedRoute` (route-handler boundary), `requireOrgUser()` (Server Component boundary), webhook receiver (`app/api/webhooks/*`), `safeLimit` (rate-limiter call, documented fail-open carve-out), `error.tsx`/`global-error.tsx` (page boundary/catcher).
- **Four-question template** — the per-seam audit rhythm: (1) where it lives, (2) where fail-closed lands, (3) where message-split lands, (4) audit grep + triage rule.
- **`digest`** — Next.js opaque error hash; the only operator detail the user is allowed to see; safe to expose because it leaks nothing, joinable via Sentry/logs.
- **`unstable_retry()`** — Next.js 16.2+ retry prop for `error.tsx`; runs `router.refresh()` + `reset()` in a transition; use instead of bare `reset()` because bare reset re-renders without re-fetching data.
- **`proxy.ts`** — Next.js 16 middleware (outer ring); does cheap cookie-presence check only, does NOT authorize; `requireOrgUser()` is the inner ring that re-checks against the DB.
- **Defense in depth** — two-ring model: outer ring (proxy) bounces signed-out users; inner ring (`requireOrgUser()`) authorizes; both run on every protected page.
- **HMAC** — hash-based message authentication code; webhook signature primitive; compare must be constant-time.
- **Svix** — Resend's webhook-signing service; SHA-256 verify with a 5-minute replay window.
- **`idempotent`** — a request that can be sent more than once safely; the dedup ledger makes webhook retries idempotent.
- **`problemFrom(result.error)`** — bridge helper mapping a `Result` error to RFC 9457 Problem Details + matching HTTP status; lets one business function feed both `authedAction` and `authedRoute`.
- **Enumeration** — account-existence leak via differential responses (e.g., "your email is being limited" vs. identical opaque 429).

**Patterns and best practices.**
- Audit grep patterns established as canonical: `rg -l "'use server'" --glob '*.ts' | xargs rg -L 'authedAction'`; `rg -l 'export (async )?function (GET|POST|PUT|PATCH|DELETE)' --glob '**/route.ts' | xargs rg -L 'authedRoute'`; `rg 'error\.message' --glob '**/{error,global-error}.tsx'`; `rg -i 'show details' --glob '**/{error,global-error}.tsx'`; grep for `.limit(` calls not going through `safeLimit`.
- Webhook receiver layer order is load-bearing: (1) read raw body, (2) verify signature (constant-time HMAC), (3) `INSERT ... ON CONFLICT DO NOTHING` into dedup ledger, (4) business work inside transaction, (5) respond with status. Parse after verify; dedup before business work.
- A receiver that catches a bad signature and responds 200 is fail-open; a receiver that echoes the full provider payload leaks; a receiver that JSON-parses before verifying accepts forged events — all three are named audit findings.
- The 429 body is identical regardless of which rate-limit gate tripped; never reveal which key was limited (enumeration signal).
- `safeLimit` fail-open policy is scoped to Redis-availability failures only; actual quota exhaustion still fails closed. Admin/destructive paths may override to fail-closed; policy belongs in the helper, not at call sites.
- `error.tsx` must never render `error.message`; exposes only `error.digest`; uses `unstable_retry()` not `reset()`; Sentry capture in `useEffect`.
- `global-error.tsx` carries its own `<html>`/`<body>`; explicit `captureException` call is the anchor (render already failed once by the time it fires).
- `notFound()` and `redirect()` are framework control-flow, not errors; `error.tsx` does not catch them; if caught accidentally, re-throw — never swallow.
- A "Show details" toggle in `error.tsx` is a leak vector by design; treat it as a finding.
- A seam "almost like `authedAction` but with one extra param" must extend the wrapper, not fork it — a parallel wrapper drifts and the audit grep for the original never finds the copy.
- Authorization belongs on the server seam; a page check inside a Client Component bypasses the Server Component perimeter.
- `console.log(error)` in production branches is a leak; use structured logger's `debug` level (full logging discipline lands ch092).

**Misc.**
- The six-seam catalog is closed: every new feature's error paths must fit one of the six. A genuinely new shape (e.g., hand-rolled internal API client) becomes a seventh seam added deliberately with its own wrapper, its own two commitments documented, and its own audit grep — never a quiet drift.
- `code` is the shared spine across all six seams; the analytics layer groups on it (PostHog, ch092/093); a free-form code in any single seam fragments the dashboard. Ch082 project consumes the six-seam map as its audit checklist.
- Route/webhook status-code table (canonical): 400 malformed, 401 no identity/bad signature, 403 forbidden, 404 not-found/cross-tenant, 409 conflict, 422 validation, 429 rate-limited, 5xx server bug.
- Lesson code fragments are intentionally paraphrased/minimal (recognition posture, same as lessons 1–2); treat canonical contracts from lessons 1–2 continuity notes as ground truth.
