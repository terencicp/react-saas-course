# Lesson 4 — The production logger seam

## Lesson title

Chapter-outline title "The production logger seam" fits — it names the single structural artifact (one logger seam) that both fixes converge on. Keep it.

- Page title: `The production logger seam`
- Sidebar: `Logger seam`

## Lesson type

`Implementation`

(Covers findings 2 and 3; the student wires two source seams against `tests/lessons/Lesson 4.test.ts`. Test-coder runs.)

## Lesson framing

The student installs the audit's most load-bearing structural discipline: **one redactor, two callers, one correlation scope**. They leave knowing that a secret-scrubbing seam declared once and reused by both Pino and Sentry's `beforeSend` is the only way a drop-list stays honest (duplicating it is how a secret slips one sink), and that `AsyncLocalStorage` — not module-level state — is the primitive that lets a log line and its Sentry event join on a `requestId` under concurrency. The senior payoff is the seam-not-call-site mindset: the discipline lives in one file the team lints, not at every log statement.

## Codebase state

**Entry.** Sentry is wired across client/server/edge from lesson 3 — but `sentry.server.config.ts` has a `beforeSend` that does *not* yet scrub or carry a `requestId` (lesson 3 installed Sentry only; the redactor/correlation join is this lesson's work). `src/lib/logger.ts` is a bare `pino({ level, base: undefined })` with no `redact` export and no `mixin`. `src/lib/request-context.ts` does not exist. `src/proxy.ts` mints no `x-request-id` and opens no scope (carries `TODO(L4)`). The webhook handler `src/app/api/webhooks/stripe/route.ts` logs `{ headers: Object.fromEntries(request.headers) }` — the seeded leak that prints `stripe-signature` in the clear — and opens no `runWithContext` scope (carries `TODO(L4)`). `findings/002-log-secret-leak.md` and `findings/003-missing-correlation-id.md` are empty placeholders. `Lesson 4.test.ts` is `describe.todo`.

**Exit.** `src/lib/logger.ts` exports a single `redact<T>` and a `mixin` reading `getRequestContext()`. `src/lib/request-context.ts` exists, exporting `runWithContext` / `getRequestContext` over an `AsyncLocalStorage<RequestContext>`. `src/proxy.ts` reads-or-mints `x-request-id` (`uuidv7()`), echoes it on request + response headers, and opens a `runWithContext` scope. The webhook handler recovers the id from the header, opens its own scope, and logs only intentional fields (`log.info('request_received')`). `sentry.server.config.ts`'s `beforeSend` now calls the same `redact` and injects `requestId` into `event.contexts.request`. Findings 002 and 003 Fix sections name their seams. The app still boots; `pnpm test:lesson 4` passes.

## Lesson sections

Implementation type — render the contract's four sections.

### Goal + Finished result (intro, no header)

One-sentence goal in operator terms: make the structured logger production-grade — no secret ever serializes, and every log line and Sentry event for one request share a `requestId`. Then a one-paragraph description of the working result: replaying the webhook flow renders `stripe-signature` as `[REDACTED]` with a top-level `requestId` on every line, and the Sentry event for that request carries the matching `requestId` in its request context (not a tag) with no leaked secret. No screenshot needed — describe the two console/dashboard lines in prose, optionally a short `Code` block showing one before/after log line (the leaked headers blob vs the clean `request_received` line with `requestId`).

### Your mission (header: "Your mission")

Coherent prose paragraph, no subsection headers, no implementation hints. Weave:

- **Feature** (user/operator terms): the seeded Pino logger leaks the Stripe `stripe-signature` because the webhook handler serializes the whole header set, and nothing stamps a request with an id — so a log line and its Sentry event for the same request can't be joined. Close both gaps through one logger seam.
- **Constraints** (shape the solution, named not hinted): *one redactor, two callers* — the redaction logic and the correlation id both have to reach Sentry's `beforeSend` (installed last lesson) as well as Pino, so declare `redact` once and reuse it; duplicating it between the two sinks is the failure mode. For correlation, `AsyncLocalStorage` is the primitive that survives concurrent requests — module-level or `globalThis` state bleeds one request's id into another's logs. Note the Next.js 16 wrinkle: a proxy-set ALS scope does **not** propagate into route handlers, so each downstream handler recovers the id from the `x-request-id` header and opens its own scope.
- **Out of scope** (one line): the Vercel Log Drain that reads these logs in production is a deploy-time follow-up (carried from lesson 2 of chapter 092's lineage / lesson 4 of chapter 092), not wired locally.

Then the **Functional requirements** numbered list (use `Checklist` with `tested`/`untested` chips), every item phrased as a verifiable outcome, never a file/export/import:

1. A single redaction routine carries the canonical drop-list (`authorization`, `cookie`, `stripe-signature`, `password`, `token`, `apikey`, plus PII keys `email`/`phone`/`ip`/`ssn` and the `*_key`/`*_secret` suffix patterns, matched case-insensitively) and is the only redaction logic in the codebase. `[tested]` (source-shape probe: `lib/logger.ts` exports `redact`; the test-coder asserts `redact` scrubs a drop-list key and a `*_secret` suffix key while preserving structure)
2. Replaying the webhook flow renders `stripe-signature` as `[REDACTED]` in the log lines. `[tested]` (the test-coder runs the redactor over a header-shaped object and asserts the signature value is redacted; the live console replay is the by-hand half)
3. Any Sentry event captured during a request runs through the same redactor, so a secret named in the drop-list never reaches Sentry either. `[untested]` (asserted only structurally that `beforeSend` calls the shared seam; live Sentry breadcrumb check is by-hand)
4. Each request opens its own correlation scope (the proxy reads-or-mints `x-request-id`, echoes it on request and response headers; the webhook handler recovers the same id and opens its own scope). `[tested]` (source-shape probes: `proxy.ts` references `x-request-id`; `request-context.ts` uses `AsyncLocalStorage`)
5. Every log line for a request carries a top-level `requestId` field sourced from the request-scoped context. `[untested]` (live-console observation; structurally the `mixin` is present)
6. A thrown error inside a request produces a Sentry event carrying the same `requestId` in its **request context** (not a tag), so a log line and its Sentry event join on one value. `[untested]` (live Sentry-dashboard observation)
7. `findings/002-log-secret-leak.md` and `findings/003-missing-correlation-id.md` Fix sections name the installed seam and the call sites it governs. `[untested]` (by-hand; the findings-shape gate for these two is the lesson-7 SUMMARY pass, not here)

(The test-coder owns final `tested`/`untested` placement; this split is the brief's intent. Per the test stub, lesson-4 tests are `readFileSync` source-shape probes plus pure unit tests of `redact` — they never import the seam, node env, no DOM.)

### Coding time (header: "Coding time")

One line directing the student to implement against the brief and the tests, then read the reference. Wrap the solution in `<details>` (the writer handles the wrapper). Present the four touched/new files organized as they sit in the repo. Use `Code` for each file; reach for `AnnotatedCode` on `redact` (direct focus to the three branches: array recurse, object map-with-`shouldDrop`, scalar passthrough) and on `beforeSend` (focus the `redact(event)` call vs the `event.contexts.request.requestId` injection — two distinct responsibilities in one hook). Use `CodeVariants` for the webhook handler before/after (the leaked `{ headers: Object.fromEntries(...) }` log line vs the clean `log.info('request_received')` plus the `POST → runWithContext → handle` split).

Files, in repo order:

- `src/lib/request-context.ts` (new) — `RequestContext` type (`requestId` + optional `userId`/`orgId`), an `AsyncLocalStorage<RequestContext>`, `runWithContext`, `getRequestContext`. `import 'server-only'`.
- `src/lib/logger.ts` (enriched) — `DROP_KEYS` set, `PII_KEYS` set, `shouldDrop` (case-insensitive exact-match OR `_key`/`_secret` suffix), the exported `redact<T>` deep-walk, and the Pino instance gaining `formatters.log: (object) => redact(object)` and `mixin: () => getRequestContext() ?? {}`.
- `src/proxy.ts` (modified) — `proxy` reads-or-mints `requestId`, wraps the existing logic (now extracted into `handle`) in `runWithContext`; echoes `x-request-id` on every response path (the two redirects and the final `NextResponse.next`) and on the threaded request headers.
- `src/app/api/webhooks/stripe/route.ts` (modified) — `POST` recovers-or-mints `requestId` and wraps the handler in its own `runWithContext`; the leaked header log becomes `log.info('request_received')`.
- `sentry.server.config.ts` (modified) — `beforeSend` gains the `redact(event)` call and the `getRequestContext()?.requestId` injection into `event.contexts.request`.

Decision rationale (one or two sentences each, covering the `[untested]` reqs — code organization, naming, error-handling placement):

- **Why `redact` is refactored into one exported function before the second caller is wired** — the redactor must feed both Pino's `formatters.log` and Sentry's `beforeSend`; declaring it once is the "one redactor, two callers" discipline, and duplicating it is how a future drop-list edit lands in one sink and not the other.
- **Why the `requestId` join lives inside `beforeSend`, not at module scope** — `beforeSend` runs per event with the request scope live; reading `getRequestContext()` at module scope runs once at boot with no request and attaches nothing.
- **Why `requestId` is context, not a tag** — it is high-cardinality (one per request); a tag would blow Sentry's tag cardinality (carried from lesson 2 of chapter 092's correlation-id rule).
- **Why the proxy scope doesn't reach the route handler** — Next.js 16 does not propagate a proxy-opened ALS scope into route handlers, so each handler recovers the id from the `x-request-id` header and opens its own scope; the header is the cross-boundary carrier.
- **Why the response header is echoed** — downstream services join on the same id.
- **Why `AsyncLocalStorage` and not module/`globalThis` state** — module-level state is shared across concurrent requests and would bleed one request's id into another's logs. Call this out as the one primitive that must not be swapped.

For the 3am-rule and the secret/PII exclusion concept, link to the chapter-092 lesson rather than re-explaining (carried from lesson 3 of chapter 092); for correlation-id concepts link lesson 2 of chapter 092. The writer appends external resources here after the `<details>` (no header), added later by the resourcer.

### Moment of truth (header: "Moment of truth")

The command: `pnpm test:lesson 4`. Show expected clean-pass output (`Code` block). Named surfaces: the **dev console** (log lines) alongside the **Sentry dashboard**. Then a `Checklist` of by-hand confirmations the tests can't reach:

- Replaying the webhook flow shows `stripe-signature` as `[REDACTED]` in the console.
- Every log line carries a top-level `requestId` field.
- A thrown error inside the webhook flow produces a Sentry event whose breadcrumbs hold no un-redacted signature.
- That Sentry event carries the same `requestId` (in its request context) as the request's log line.
- `findings/002-log-secret-leak.md` and `findings/003-missing-correlation-id.md` Fix sections name their seams.

No diagram required — the flow (proxy mints id → header carries it across the boundary → handler reopens scope → mixin stamps each line → `beforeSend` joins the Sentry event) is short enough for prose plus the annotated code. If the writer judges the cross-boundary hop is the one thing prose can't carry, a small `ArrowDiagram` inside a `Figure` (proxy → request header → route handler → logger/Sentry, with the "scope does not propagate" break annotated) is acceptable but optional.

## Scope

- **Sentry init / config files / source maps / release tag** — owned by lesson 3 (Wire Sentry). This lesson only edits the existing `beforeSend`.
- **PostHog consent gate** — lesson 5.
- **The performance findings (waterfall, barrel, N+1) and `SUMMARY.md`** — lesson 6.
- **Filling the findings-shape gate for SUMMARY/out-of-scope and verifying the full report** — lesson 7 (verify + self-grade); this lesson only fills findings 002/003 Fix sections.
- **Vercel Log Drain** (the production read surface for these logs) — named as a deploy-time follow-up only; wired in the deployment chapter (lesson 4 of chapter 092 lineage / chapter 098).
- **The 3am-rule and correlation-id concepts themselves** — taught in lessons 2 and 3 of chapter 092; linked, not re-explained.
