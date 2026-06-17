# Chapter 092 — Error monitoring and structured logs

## Lesson 1 — Sentry: capture, releases, and breadcrumbs

**Taught.** Installed Sentry via wizard, wired the two server-side capture paths (`onRequestError` for uncaught throws, `captureException` inside `authedAction`/`authedRoute` catches for handled errors), enriched events with source maps, releases, user/org/plan tags, and custom breadcrumbs; covered `beforeSend` redaction and sampling floor; wired `global-error.tsx` (wizard-provided) and per-segment `error.tsx` (student's responsibility) with `digest` in `contexts`.

**Cut.** `withServerActionInstrumentation` (named once, not wired); deep fingerprinting beyond a one-line mention; Sentry Replay (deliberately off — PostHog owns replay in ch093).

**Debts.**
- `requestId` mentioned as the future Sentry↔log join key but not yet generated or threaded — lesson 2 owns generation via ALS.
- Full PII/secret denylist referenced as "same posture as the logger" but deferred to lesson 3.
- `tracesSampleRate` set to `0` with forward pointer to ch094 when performance traces earn weight.
- Sentry-to-logs pivot UI deferred to lesson 4.

**Terminology.**
- **Two capture paths**: uncaught → `onRequestError` (wired by wizard in `instrumentation.ts`); caught-and-handled → manual `captureException` inside the wrapper catch.
- **`instrumentation.ts`**: Next.js file with `register()` (lazy-imports server/edge config by `NEXT_RUNTIME`) and `export const onRequestError = Sentry.captureRequestError`.
- **`sentry.server.config.ts`** / **`sentry.edge.config.ts`** / **`instrumentation-client.ts`**: where `Sentry.init` actually lives (not in `instrumentation.ts` itself).
- **DSN**: single DSN shared by client and server SDKs.
- **`tunnelRoute`**: same-origin proxy in `withSentryConfig` that prevents ad-blocker drops of client events — must stay on.
- **Release**: commit SHA via `VERCEL_GIT_COMMIT_SHA`; links events to deploy and author.
- **`digest`**: opaque Next.js hash on server errors; threads into `contexts` (not `tags`) in `error.tsx` capture to join server-side grouping.
- **Tags vs. context**: tags = low-cardinality filter dimensions; high-cardinality one-offs (e.g. `requestId`, full URL) → `contexts`/`extra`; secrets → never send.
- **Breadcrumbs**: per-event, ephemeral trail dropped after the error fires — distinct from persistent logs (lesson 2) and durable audit log (ch081).
- **`beforeSend`**: last-chance redaction hook; strips `Authorization`, `Cookie`, `password`, `token`, `apiKey` from event request data; lets `userId`/`email` through (operator-side per ch080 decision).

**Patterns and best practices.**
- `authedAction` catch shape: `ensureError(e)` → `logger.error(...)` → `Sentry.captureException(error, { tags: { seam: 'authedAction', action: fn.name }, user: { id: ctx.user.id, email: ctx.user.email } })` → `return mapError(error)`. Every action inheriting the wrapper gets Sentry capture for free.
- Every per-segment `error.tsx` added to the app must include `Sentry.captureException(error, { contexts: { nextjs: { digest: error.digest } } })` in a `useEffect` — the wizard only wires `global-error.tsx`.
- Sampling floor: `tracesSampleRate: 0`, `replaysSessionSampleRate: 0` (override wizard default of `0.1`); 100% error capture.
- Config files (`sentry.server.config.ts` etc.) read `process.env` directly — intentional, they sit outside the `@t3-oss/env-nextjs` schema.
- Delete the wizard's example error-route before shipping.

**Misc.**
- Sentry and pino share one redaction posture (same denylist concept, two enforcement points). Lesson 3 owns the canonical denylist; lesson 1 only shows `beforeSend` as Sentry's enforcement point.
- Lesson 1 plants "errors and logs are two surfaces of one incident" as the chapter thesis; lesson 4 pays it off via the shared `requestId` pivot.

---

## Lesson 2 — Structured logs with correlation IDs

**Taught.** Wired `lib/logger.ts` (pino singleton with fixed `base` keys, `err` serializer, `redact` slot, dev-only `pino-pretty` transport); built `lib/request-context.ts` (typed `RequestContext` ALS module with `runWithContext` / `getRequestContext`); threaded `requestId` through two entry seams (`proxy.ts` reads-or-generates + echoes on response, `authedAction` recovers from `x-request-id` header and opens enriched scope with `userId`/`orgId`); showed `logger.child(getRequestContext() ?? {})` as the correlated child; explained pino transport footgun on Vercel (worker-thread teardown → sync stdout only in prod); taught level semantics (`debug`/`info`/`warn`/`error`) and cardinality discipline; retired `console.log` in server code via `no-console` lint rule (server glob only); cross-referenced audit log as a separate durable stream.

**Cut.** `logWithBreadcrumb` helper that dual-writes log + `Sentry.addBreadcrumb` (mentioned in chapter outline, not implemented — lesson 1 owns breadcrumbs); OpenTelemetry named-once-only (no depth); `ulid()` as requestId alternative (lesson used `uuidv7()` exclusively); the optional ALS call-stack ArrowDiagram was dropped (DiagramSequence step 3 covered it sufficiently).

**Debts.**
- `redact` config: slot exists in `lib/logger.ts` (`redact: redactionConfig`) but denylist contents explicitly deferred to lesson 3.
- "What each seam should log" (the 3am rule) deferred to lesson 3.
- Sentry-to-logs pivot UI (pasting `requestId` into the drain destination) deferred to lesson 4.
- Vercel Drains setup deferred to lesson 4.

**Terminology.**
- **`lib/logger.ts`**: pino singleton; `base: { service, env, release }` baked once; `release` reads `VERCEL_GIT_COMMIT_SHA` (same value Sentry uses — joins logs to Sentry events on release).
- **`lib/request-context.ts`**: exports `RequestContext` type `{ requestId: string; userId?: string; orgId?: string }`, `runWithContext`, `getRequestContext`.
- **`AsyncLocalStorage` (ALS)**: `node:async_hooks`; module-scope instance, per-request value via `runWithContext` — never set a value at module scope (canonical ALS footgun).
- **Two entry seams**: (1) `proxy.ts` — bare context `{ requestId }`, no auth yet, echoes `x-request-id` on both request and response; (2) `authedAction` — enriched context `{ requestId, userId, orgId }`, recovers same ID from the `x-request-id` header the proxy forwarded. ALS scope set in proxy does NOT propagate into route handlers/RSC/actions in Next.js 16 — two independent `runWithContext` calls required.
- **Child logger**: `logger.child(getRequestContext() ?? {})` — pre-binds request IDs onto every line; correlation becomes structural, not per-call-site discipline.
- **`pino` transport footgun**: transports run in a worker thread torn down by Vercel between invocations → silent log loss on cold paths; production must use no-transport (sync stdout); `pino-pretty` gated behind `NODE_ENV !== 'production'`.
- **`requestId` on Sentry**: placed in `Sentry.getCurrentScope().setContext('request', { requestId })` (context, not a tag — high-cardinality, ephemeral; not indexed as a filter dimension but readable on an open event).
- **Entry seam**: the single chokepoint every request of a kind passes through; where cross-cutting setup belongs.

**Patterns and best practices.**
- `authedAction` catch now extends lesson 1's shape: open `runWithContext({ requestId, userId, orgId }, ...)` before invoking `fn`; `logger.child(getRequestContext() ?? {})` inside the wrapper's catch emits correlated `error` lines; `Sentry.getCurrentScope().setContext('request', { requestId })` placed before `captureException` so events carry the join key.
- Per-seam child logger idiom: `const log = logger.child({ seam: 'webhook.stripe', webhookEventId: event.id, stripeEventType: event.type })` — seam name matches the file; every `log.info(...)` in the handler carries those keys plus request IDs.
- Level discipline: `info` = significant successful state change (not a synonym for `console.log`; routine reads do not log at info); `warn` = recoverable abnormality; `error` = exception with `{ err }` serializer (never `JSON.stringify(err)`, never hand-built `error: err.stack` string field).
- Cardinality rule: structured facts in keys, narrative in `msg`; don't log whole DB rows; don't use free-text keys.
- `no-console` lint rule scoped to server globs (`src/app/**`, `src/lib/**`, `src/server/**`); client code retains `console.error`; tests excluded.
- Config files (`lib/logger.ts`) read `process.env` directly — same intentional exception as Sentry config files, outside the `@t3-oss/env-nextjs` schema.

**Misc.**
- Operational logs (this lesson) vs. audit log (`logAudit(tx, event)`, ch081): explicitly distinguished — operational is ephemeral/best-effort; audit is durable/transactional/compliance-scoped. Students told to never route one through the other.
- `uuidv7()` is the course-standard requestId generator (consistent with primary-key convention); `crypto.randomUUID()` named as zero-dep fallback.

---

## Lesson 3 — The 3am rule and PII exclusion

**Taught.** Established the 3am rule (log what, which, and outcome — not control-flow transitions), per-seam log-call shape for four seams (server action, webhook, background job, external API call); defined the exclusion list in three tiers (secrets, GDPR PII, Art. 9 special-category); named the safe list (`userId`, `email`, `orgId`, `plan`, `role`, `requestId`, `durationMs`, `error.issues`, `Error.stack`, last-octet-zeroed IP); filled the `redact` slot in `lib/logger.ts` with `redactionConfig` and the shared `PII_KEYS` constant; taught why structural redaction beats per-call-site pruning; covered three edge cases (raw request body, `Error.message` trap, IP addresses under GDPR); closed with the operational-vs-audit-log distinction.

**Cut.** CI grep backstop for literal `password:`/`secret:` patterns in committed code (named as a concept, not implemented); sampling threshold trigger (named but not instrumented); IP-specific shorter-retention enforcement (deferred to ch081 lesson 4); `logWithBreadcrumb` helper for dual log+breadcrumb emission (chapter outline scope; lesson 1 owns breadcrumbs and this was not built).

**Debts.**
- Sentry-to-logs pivot UI and drain setup deferred to lesson 4.
- Shorter retention for security-event logs (full IP) deferred to ch081 lesson 4.
- CI grep tooling for hardcoded secrets named as a backstop but not implemented here; a downstream lesson or the project chapter would need to wire it.

**Terminology.**
- **3am rule**: log the *what* and the *which*, not the *how* — one `info` line per successful operation, one `error` line per failure with `{ err }` serializer; decisions earn a line, transitions don't.
- **`PII_KEYS`**: `['fullName', 'name', 'phone', 'address', 'dateOfBirth', 'ip']` — exported constant shared between `redactionConfig` (pino) and Sentry's `beforeSend` so both enforcement points stay in sync from one source of truth.
- **`redactionConfig`**: `{ paths: ['password', '*.password', 'token', '*.token', '*.apiKey', '*.secret', 'req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]', ...PII_KEYS.flatMap(k => [k, '*.'+k])], censor: '[REDACTED]' }` — fills the `redact` slot in `lib/logger.ts` left empty by lesson 2.
- **Redact-config drift**: the named failure mode — a new PII field added to a logged object without a paired `PII_KEYS` update leaks silently; PRs that add logged fields must include a redact-config review.
- **Structural redaction**: redaction is the logger's job (in config, once, auditable in PR), not the caller's (hand-pruning per call site is fragile).
- **Operator/user split applied to logging**: same split from ch080 lesson 2 — `userId`/`email`/`orgId` are operator-side and safe; full name/address/phone are user-side PII and must be redacted. Over-redacting `userId`/`email` is the named anti-pattern.
- **Operational log vs. audit log**: operational = ephemeral, best-effort, ~30 days, aggressively redacted, on-call audience; audit = durable transactional DB write, per-legal-basis retention, preserves payloads, compliance audience. Never route one through the other.
- **IP address under GDPR**: personal data; routine `info` logs → last octet zeroed; security events → full IP under legitimate-interest basis with shorter retention. Octet-masking is data-minimization, not an exemption.
- **`JSON.stringify(err)` footgun**: drops `Error.message` and `Error.stack` (non-enumerable) — always pass `{ err }` and use the pino serializer.

**Patterns and best practices.**
- Per-seam child logger call site: `const log = logger.child({ seam: 'action.createInvoice', userId, orgId })` then `log.info({ input, durationMs }, 'invoice created')` / `log.error({ err, code, durationMs }, 'create invoice failed')`.
- Never log `req.body` before Zod parse; log the validated output — the parse enforces known keys that the redact config can cover.
- Log Zod validation errors as `log.warn({ issues: parsed.error.issues }, 'validation failed')` — `issues` gives paths and codes without the input payload.
- Background jobs (Trigger.dev): IDs come from the payload, not a session; include `attempt` so retry patterns are visible across runs.
- `log.info` for state-changing operations and errors; `debug` for hot read paths (off in production); sample `info` on high-RPS read endpoints but never sample errors (100% error capture always).

**Misc.**
- `PII_KEYS` is the shared denylist source: lesson 1's `beforeSend` and lesson 3's `redactionConfig` are two enforcement points off one constant — downstream project chapter must keep them in sync when adding new PII fields to the schema.
- Pino `redact` path wildcards (`*`) are measurably slower than explicit paths; fan out by name when the shape is known, use `*` only for genuinely unknown nesting.
- Pino `redact` paths are case-sensitive: lowercase header keys before logging (`authorization` not `Authorization`); Node normalises incoming headers to lowercase but hand-built objects can reintroduce capitals.

---

## Lesson 4 — Shipping logs with Vercel Drains

**Taught.** Shipped pino stdout to Axiom via a Vercel Drain; explained the two-layer envelope (Vercel wrapper + inner `message` string containing pino JSON); covered the Axiom marketplace integration, field-indexed verification, APL query for org-scoped errors, and the full Sentry-to-logs pivot (`requestId` as join key); modeled a 3-hour single-org webhook 500 post-incident drill end-to-end; drew the three-tool observability floor (Sentry / drain destination / Vercel UI) and the operational-vs-audit-log boundary.

**Cut.** Detailed retention-timer enforcement (ch081 lesson 4 owns it); OpenTelemetry / full distributed tracing (named once only); custom drain destinations beyond the single short manual section; Vercel Speed Insights / Web Analytics drains (ch093/ch094); building the saved dashboard (ch095 project owns that hands-on step); the Sentry-Axiom deep-link (mentioned in one line, not walked through).

**Debts.**
- Full dashboard and seeded-failure drill hands-on deferred to ch095 project.
- VS Code debugger ("when the narrative runs out") forward-pointer to lesson 5 — lesson 5 completes the three-tool picture.
- Product analytics and performance traces referenced as "additions to this floor" — ch093 and ch094 own them.

**Terminology.**
- **Drain**: one-way fan-out from Vercel runtime stdout to an external log destination; renamed from "Log Drains" in 2026 (the same primitive now carries traces too); scoped per environment; Pro/Enterprise only.
- **Two-layer envelope**: Vercel wraps each pino line as a `message` string inside a JSON object carrying its own `id`, `timestamp`, `source`, `level`, `requestId`, `deploymentId`, etc. App fields (`orgId`, pino's `requestId`) live inside `message` and must be parsed by the destination to become queryable columns.
- **Schema-on-read**: destination infers field types from the JSON at query time; Axiom does this automatically for the inner `message` JSON (no pipeline required).
- **APL (Axiom Processing Language)**: Axiom's query language; clause pattern `['dataset'] | where level == "error" | where orgId == "org_x" | where _time > ago(24h)`. Field-filter idea transfers to any destination's syntax.
- **Sentry-to-logs pivot**: read `requestId` from Sentry event's request *context* → filter drain by that value → read per-request narrative. Three clicks from error toast to per-request story.
- **Observability floor**: Sentry (what threw) + drain destination (what happened) + Vercel UI (platform health) — minimum viable; anything beyond must earn its weight.
- **Drain is not the audit log**: drain is best-effort / stdout can drop on function timeout / ~30 day retention; audit log (`logAudit(tx, event)`) is a transactional DB write, durable, compliance-scoped. Never route durable records through stdout.

**Patterns and best practices.**
- Default to production-only drain; preview/dev drains flood the destination and burn the free tier.
- After any drain setup, verify that `level`, `requestId`, and `orgId` appear as top-level indexed columns in the destination — not trapped inside a `message` string blob. Axiom auto-parses; Datadog needs a parsing pipeline.
- On-call diagnostic order: Sentry (what + scope by tag) → logs filtered by `requestId` (narrative) → widen to `orgId` + time window (blast radius) → pre-divergence `info` lines (root cause). Order matters.
- Level and cardinality discipline (no `info` on hot reads, no free-text keys) directly controls the monthly drain bill; Axiom pauses ingest on overage rather than deleting old data, so a noisy deploy can blind new-event capture mid-incident.
- Store manual-drain auth headers as Vercel project secrets (sensitive flag), never as `NEXT_PUBLIC_*` env vars; no app-side `AXIOM_TOKEN`/`AXIOM_DATASET` needed for the marketplace-integration path.

**Misc.**
- `requestId` is in Sentry **context** (not a tag) — high-cardinality, readable on an open event, not a filter dimension. Lesson 5 and the quiz must not call it a Sentry tag.
- Axiom free Personal tier: ~500 GB ingest/month (monthly, not cumulative); Vercel bills drain egress at ~$0.50/GB on top. Treat figures as approximate — vendor tiers move.
- The Sentry-Axiom integration can deep-link from an event to the matching logs; for Better Stack / Datadog the link is a manual copy-paste of `requestId` — workflow is identical either way.

---

## Lesson 5 — Server-side debugging with the inspector

**Taught.** Installed the decision ladder for when a debugger earns its weight (Sentry + logs cover ~90%; the debugger is for the tenth — when the deciding state was never logged, or it's a heisenbug, or the call stack points inside a library); taught the V8 inspector / CDP mental model (runtime feature, many clients attach); shipped `pnpm dev --inspect` (Next.js 16.1 integrated flag) and the three-entry `.vscode/launch.json` (`node-terminal` auto-attach as primary, `attach`-to-9229 as named fallback); covered plain breakpoints, conditional breakpoints, logpoints, and `debugger;` statement; walked the Debug Console REPL bound to the paused frame; walked the complete server-action-failed drill tying lessons 1–4 into a single incident; showed Chrome DevTools (`chrome://inspect`) as the editor-agnostic alternative; closed with the production prohibition framed as an RCE surface.

**Cut.** `--inspect-brk` startup debugging beyond the one-paragraph caution (crashes Turbopack; rarely needed for app code); the chapter outline's `node-terminal` vs `attach` distinction was corrected — the outline listed an `attach`-to-9229 config as the primary; webpack fallback for unbound-breakpoint workaround was mentioned but demoted to "last resort" (not the smooth path — Turbopack is the default); performance profiling (CPU/heap/async waterfalls) forward-pointed to ch094 but not demonstrated; React DevTools, Vitest inspector, edge-runtime debugging all named-only-out-of-scope.

**Debts.**
- Performance profiling — CPU, heap, async waterfalls — deferred to ch094.
- The chapter quiz (lesson 6) covers the debugger workflow, the `--inspect` production prohibition, and the Turbopack unbound-breakpoint caveat as three of its ten topics.

**Terminology.**
- **`node-terminal` launch type**: VS Code config type that launches the dev command in the integrated terminal and auto-attaches to the spawned Node process — replaces the older `"request": "attach"` pattern; no manual port wrangling needed.
- **`--inspect` flag**: `pnpm dev --inspect` (Next.js 16.1+) passes `--inspect` to only the server's Node process; preferred over `NODE_OPTIONS=--inspect next dev` (which attaches to every spawned process and causes port conflicts).
- **CDP (Chrome DevTools Protocol)**: wire protocol Node's inspector speaks; one protocol, many clients (VS Code, Chrome DevTools, WebStorm, Firefox) — the inspector is a runtime feature, not an editor feature.
- **Bound vs. unbound breakpoint**: solid red dot = source map resolved, breakpoint will fire; hollow grey dot = resolution failed, won't fire; workaround is `debugger;` statement or dev-server restart.
- **Debug Console**: REPL bound to the paused frame's scope; supports top-level `await` in VS Code — `await db.query.invoices.findFirst(...)` resolves to the row, not a Promise.
- **Logpoint**: breakpoint that prints `{expressions}` to the Debug Console without pausing — ephemeral, dev-only, never committed; not a substitute for `logger` (pino) calls.
- **`debugger;` statement**: pauses when a debugger is attached; no-op otherwise; treated as strictly temporary — CI must grep-fail on commit (same guardrail as stray `console.log`).
- **Diagnostic ladder order**: Sentry stack trace (*what threw*) → log narrative filtered by `requestId` (*what happened*) → attach debugger (*what's in scope right now*); descend only when the rung above runs out of answers.
- **RCE surface**: the inspector port on a live server lets anyone who can reach it evaluate arbitrary code including live DB queries — the reason production never runs `--inspect`.

**Patterns and best practices.**
- Commit `.vscode/launch.json` with all three official Next.js entries; the `node-terminal` server-side config is the everyday button; the `attach`-to-9229 config is the named fallback for manual server management.
- `skipFiles: ["<node_internals>/**"]` (optionally `"**/node_modules/**"`) — keeps step-into inside project code; without it, stepping into any function dives into Node internals.
- Conditional breakpoint before plain breakpoint inside loops or hot paths — a plain breakpoint in a tight loop pauses thousands of times; key the condition to the failing user ID or attempt count.
- `debugger;` workaround order when a gutter breakpoint won't bind: (1) `debugger;` statement, (2) restart the dev server (regenerates source maps), (3) `next dev --webpack` as last resort only.
- Logpoints are additive, not substitutes — real operator diagnostics go through `logger` (pino, `lib/logger.ts`); logpoints are for quick dev-session observation on hot paths where pausing breaks timing.
- Set breakpoints *around* a Drizzle call, not "inside" it — the debugger sees JS; SQL is generated lazily and isn't inspectable at the breakpoint level.
- Restart the dev server if a breakpoint looks misaligned — Fast Refresh can stale the file the debugger maps against.

**Misc.**
- Chapter thesis landed here: Sentry (*what threw*) + logs (*what happened*) + debugger (*what's in scope right now*) — three surfaces, three questions, one incident.
- `requestId` in Sentry is in **context**, not a tag (high-cardinality; this was reinforced per lesson 4's misc note — must remain consistent in the quiz).
- The lesson explicitly positions `debugger;` and logpoints as ephemeral dev-only artifacts that never reach committed code — consistent with ch092's CI grep motif for `console.log`.
- Turbopack source-map caveat: improved in early 2026 but not universally smooth; `--inspect-brk` specifically crashes Turbopack; webpack fallback exists but is an escape hatch.
- DevTools file-path gotcha: server source files appear under `webpack://_N_E/./…` prefix even under Turbopack — use `⌘P` / `Ctrl+P` to fuzzy-find by filename.
- Next.js error overlay (dev) carries a Node.js icon that copies the inspector's DevTools URL to the clipboard — fastest path from a thrown error to a live inspector.
- `launch.json` and Debug Console query snippets are debugging artifacts intentionally outside the project's `Result`/module-boundary conventions — downstream agents must not "fix" Debug Console examples to return `Result` types.
