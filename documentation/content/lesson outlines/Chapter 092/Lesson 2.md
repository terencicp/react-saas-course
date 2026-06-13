# Structured logs with correlation IDs

Sidebar label: Structured logs

## Lesson framing

This is the second of two surfaces the chapter promised. Lesson 1 built the error surface (Sentry); this lesson builds the **log surface** and the **`requestId` that joins the two**. The chapter thesis — *errors and logs are two surfaces of one incident* — is paid off structurally here: every server-side log line and every Sentry event for the same request will carry the same `requestId`, so an on-call engineer standing in a Sentry event can copy that ID and pivot to the per-request log narrative (the pivot UI itself is lesson 4; this lesson plants the shared ID).

**The senior question this lesson answers** (state implicitly in the intro, not as a heading): a webhook handler 500s for one org. Sentry shows the stack trace and the org tag, but not *what happened before the throw* — the last successful step, the upstream response, the idempotency hit. That narrative lives in request-scoped logs. The discipline that makes it queryable is what we install.

**Three concepts, taught in order of dependency** (each builds on the last — this ordering is the cognitive-load spine):
1. **Why JSON, not strings** — the queryability argument. Motivates everything else.
2. **The logger** (`lib/logger.ts`) — pino with a fixed base key set, the Vercel sync-stdout footgun, the `err` serializer.
3. **The correlation ID** (`requestId` via AsyncLocalStorage) — the load-bearing pattern; threads through two entry seams, surfaces via `logger.child(store)`.
4. **The level discipline** and the **`console.log` retirement** — the daily-use rules that make the above stick.

**Mental model the student should leave with:** a log line is a structured event, not a sentence. The logger is configured once and redacts/serializes for you; you never hand-format. A `requestId` is set at the request boundary, rides invisibly in AsyncLocalStorage, and gets stamped onto every line through a child logger — so correlation is free at every call site, not per-call-site discipline.

**What the student can do at the end:** stand up `lib/logger.ts` and the ALS request-context module; wire both entry seams (`proxy.ts`, `authedAction`/`authedRoute`); emit a correctly-leveled, correctly-correlated child-logger line from any server file; explain why a pino transport breaks on Vercel and why module-scope ALS is a bug.

**Where beginners get this wrong** (fold these into the relevant sections as the "why," never bundled):
- Pasting a `pino.transport(...)` config from a blog post — breaks on Vercel cold paths (worker-thread teardown). Sync stdout is the serverless-correct default.
- Logging via the base `logger` instead of the request child — the `requestId`/`userId` never appear, the line can't be joined back.
- `console.log('user ' + id + ' did X')` — string concat is grep-only, defeats the index, and bypasses redaction.
- Setting the ALS store at module scope (once, shared) instead of per-request inside `als.run(...)` — leaks one request's context into another. The web sources confirm this is the canonical ALS footgun; name it explicitly.
- Assuming one `als.run` in `proxy.ts` covers everything — Next.js does **not** propagate a proxy-set ALS store into route handlers / RSC / actions (verified: vercel/next.js Discussion #67305). Hence **two** owned seams. Be honest about this boundary; it's the subtle part.

**Pedagogical vehicles:**
- **Diagrams carry the two hardest ideas.** A `DiagramSequence` animates the `requestId`'s life through one request (enter → store in ALS → child logger stamps every line → echo on response → same ID lands on the Sentry event). An `ArrowDiagram` (or color-matched panels) shows `als.getStore()` reaching down a call stack without prop-drilling.
- **`AnnotatedCode`** for `lib/logger.ts` and the ALS module — both are configuration-dense files where attention must be directed part by part.
- **`CodeVariants`** for the two before/after contrasts that carry the most pedagogical weight: string-concat vs. structured line, and base-logger vs. child-logger.
- **Two checks of understanding:** a `Sequence` drill ordering the `requestId`'s journey, and a `Dropdowns` drill on picking the correct log level. Keep both lightweight — the chapter's heavy exercise is the lesson-4 incident drill.
- This is a mechanics-and-pattern lesson (45–55 min). No video needed; the patterns are course-specific plumbing better taught in prose + diagram than by an external talk. (One optional `ExternalResource` to pino docs at the end is enough.)

## Lesson sections

### Why a log line is a JSON object, not a sentence

**Goal:** motivate the entire discipline before any setup. This is the "trigger before tool" section — name the threshold the default (`console.log`) crosses.

Content:
- Open on the senior question (webhook 500s for one org; Sentry has the trace, not the narrative). Frame the log as the surface that answers "what happened," distinct from Sentry's "what threw" (this distinction recurs and is the chapter's spine).
- The core contrast: a string line (`console.log('user ' + userId + ' processed invoice ' + id)`) is **grep-only** — you can search for substrings in the last hour and nothing more. A JSON line (`{ level, msg, requestId, orgId, durationMs }`) is **queryable** — the destination (lesson 4) indexes every key, so `level:error AND orgId:"org_123" AND durationMs:>1000` is a filter, not a regex prayer.
- Land the discipline rule: every server-side log line is one JSON object; humans stop writing string log lines after this lesson.

Component: **`CodeVariants`** — tab A "String (grep-only)" showing the concatenated `console.log` (use `data-mark-color="red"`); tab B "Structured (queryable)" showing the equivalent `logger.info({ orgId, invoiceId, durationMs }, 'invoice processed')` (`data-mark-color="green"`). First sentence of each pane states the trade. This is the hook — show the payoff before the plumbing.

Introduce the **fixed key set** here as the contract every line honors:
- `level`, `time` (ISO 8601), `msg` (short, low-cardinality phrase), `requestId`, `userId?`, `orgId?`, `service` (`'app'` / `'worker'`), `env`.
- Domain keys append per line (`invoiceId`, `webhookEventType`, `durationMs`).
- The "why": a fixed set keeps dashboards consistent across services and over time. Note that `time`/`level` come from pino automatically, `service`/`env`/`release` from the logger's `base` (next section), `requestId`/`userId`/`orgId` from the request child (later section) — so the author wiring carries most keys for free. Flagging *where each key originates* here pre-loads the next two sections and lowers their cognitive cost.

Tooltip (`Term`): **correlation ID** — a value shared across otherwise-separate records (here: log lines and Sentry events) so they can be joined back to one request.

### The logger: `lib/logger.ts`

**Goal:** stand up the singleton, explain the base keys, and clear the Vercel transport footgun. This is configuration-dense — use `AnnotatedCode`.

Content, taught as annotated steps over one `lib/logger.ts` block:
- `import 'server-only';` first — the logger reads server env and must never ship to the client (matches the `lib/` adapter rule in conventions).
- `pino({ ... })` with `base: { service, env, release }` so every line carries those three for free. `release: process.env.VERCEL_GIT_COMMIT_SHA` — call out that this is the **same value Sentry tags releases with** (lesson 1 / continuity note), so logs and events join on release as well as `requestId`. Config files reading `process.env` directly is intentional here (logger sits at the same tier as the Sentry config files, outside the `@t3-oss/env-nextjs` schema — per lesson 1 continuity note; keep consistent).
- `level: process.env.LOG_LEVEL ?? 'info'` — `info` in prod, `debug` in dev.
- `serializers: { err: pino.stdSerializers.err }` — renders a thrown error as `{ type, message, stack, cause }`. Tie to the cause-chain discipline from Chapter 008: the serializer recurses `cause`, so a wrapped-and-rethrown error preserves its full chain in the log. (Redaction config is referenced as "configured here too, owned by lesson 3" — do **not** teach the denylist; lesson 3 owns it. One line + forward pointer.)

Component: **`AnnotatedCode`** (lang `ts`, ~14 lines) stepping through: the `server-only` import, the `base` object, the `release` line (colored to match the Sentry connection), `level`, the `err` serializer, and a greyed `redact:` line with a "lesson 3" note.

**The Vercel transport footgun** — its own short prose beat after the annotated file (this is a watch-out that *is* the teaching point, so it earns inline placement, not a separate watch-out dump):
- pino's `transport` option (e.g. `pino-pretty`, `pino-loki`) runs in a **worker thread** for performance. Serverless functions on Vercel tear workers down between invocations, so a transport silently breaks on cold paths.
- The fix: production logs go to **synchronous stdout** — pino's default when no transport is configured. Vercel captures stdout; the drain (lesson 4) ships it on.
- Transports are **dev-only**: gate a `pino-pretty` transport behind `process.env.NODE_ENV !== 'production'` for readable local lines.
- Name the trap once: "do not paste a `pino.transport(...)` from a blog post into the production config." (Verified current: pino 7+ transports are worker-thread based; sync stdout is the serverless-safe path.)

Component for the dev/prod split: a small **`Code`** block (or a second `CodeVariants`: "Production (stdout)" vs "Development (pino-pretty)") showing the env-gated transport. Keep it tight.

`Term` tooltips: **transport** (pino's pluggable log-shipping mechanism, runs off the main thread); **stdout** (the process's standard output stream Vercel captures line-by-line).

### The correlation ID: threading `requestId` through AsyncLocalStorage

**Goal:** the load-bearing pattern of the lesson. Build it in three moves — what ALS is, where the ID comes from, how it reaches every call site — simplest first.

This section needs the most scaffolding. Order:

**Move 1 — the problem ALS solves.** Without a shared store, getting `requestId` to a log line 6 frames deep means threading it as a parameter through every function (prop-drilling for the server). State the goal: a request-scoped store any code in the call stack can read, with no parameter passing. Introduce `AsyncLocalStorage` from `node:async_hooks` as Node's built-in answer — and that `proxy.ts` runs on the Node runtime in Next.js 16, so it's available at the request boundary (verified current).

`Term`: **AsyncLocalStorage (ALS)** — a Node API that keeps a value alive across an async call chain, isolated per request.

**Move 2 — where the `requestId` comes from.** Read-or-generate at the entry seam:
- Read the incoming `x-request-id` header if present (Vercel's edge / some proxies set one).
- Else generate — the course standard is `uuidv7()` (matches the UUIDv7 primary-key convention in the Data layer conventions; time-ordered, already in the toolbox) or `crypto.randomUUID()`. Pick `uuidv7()` for consistency with the rest of the codebase; note `randomUUID()` as the zero-dep fallback.
- Echo it back as `x-request-id` on the response so a client error report can quote the ID the operator searches.

**Move 3 — the ALS module and the child logger.** Build `lib/request-context.ts` (the ALS instance + typed store `{ requestId, userId?, orgId? }` + a `getRequestContext()` reader) and show `logger.child(getRequestContext() ?? {})` returning a logger with the request keys pre-bound. The payoff line: every `log.info(...)` inside the request now carries `requestId`/`userId`/`orgId` **without per-call-site discipline** — correlation is structural.

Component: **`AnnotatedCode`** over `lib/request-context.ts` — steps on the `AsyncLocalStorage` instantiation, the store `type`, the `run` wrapper signature, and the `getRequestContext` reader. Keep the store type explicit (it's a seam contract — conventions say annotate seam types).

**The two entry seams** — a subsection, because this is the subtle correctness point beginners miss:

#### Two seams own the context: `proxy.ts` and `authedAction`

- Why two and not one: Next.js does **not** automatically propagate an ALS store set in `proxy.ts` into route handlers, server components, or server actions (verified: vercel/next.js Discussion #67305 — proxy and the handler run in contexts that don't share the proxy's ALS frame). So the request context is established at **each** entry seam independently.
- Seam 1 — `proxy.ts`: wrap the downstream work in `als.run({ requestId }, () => ...)` and set the response `x-request-id`. This covers the proxy's own logging and header echo. (At this point `userId`/`orgId` aren't known — auth happens later.)
- Seam 2 — `authedAction` / `authedRoute` (the wrappers from Unit 6 / Unit 9-10): after the session and tenant are resolved, run the action body inside `als.run({ requestId, userId, orgId }, () => fn(...))`. This is where the *enriched* context (with user/org) lives, and where most domain logging happens.
- Reconcile with lesson 1: lesson 1's `authedAction` catch already calls `logger.error(...)` then `Sentry.captureException(...)`. This lesson is what makes those `logger` calls carry `requestId` — and the **same `requestId` goes onto the Sentry event** (add it to the Sentry scope/tags in the wrapper) so the two surfaces join. Show this connection explicitly; it's the chapter payoff and keeps the code contract consistent with what lesson 1 shipped.

Component: **`CodeVariants`** (or two side-by-side `Code` blocks) — "Seam 1: `proxy.ts`" and "Seam 2: `authedAction`" — each showing the `als.run(...)` wrap, with the enriched-vs-bare store difference highlighted.

**The journey diagram** — the section's centerpiece:

Component: **`DiagramSequence`** (4–5 steps), titled by captions, animating one `requestId` through a request:
1. Request arrives → `proxy.ts` reads-or-generates `requestId`, calls `als.run({ requestId }, ...)`.
2. Auth resolves in `authedAction` → `als.run({ requestId, userId, orgId }, ...)` enriches the store.
3. Deep in a `/lib` helper, `logger.child(getRequestContext())` emits a line — `requestId`/`userId`/`orgId` appear with no parameter passing.
4. The action throws / completes → `Sentry.captureException(err)` with the **same `requestId`** on the scope; response carries `x-request-id`.
5. (Foreshadow lesson 4, in caption prose only) on-call copies `requestId` from the Sentry event → filters the log destination → reads the narrative.

Pedagogical goal: make the *invisible* (ALS propagation) *visible*, and show the shared-ID join concretely so the chapter thesis lands as a picture, not a promise. Each step shows one node lit; vertical-compact (single horizontal flow of boxes), well under the 800px cap.

**`als.getStore()` reach without prop-drilling** — a second, smaller figure if the DiagramSequence doesn't already carry it:

Component (optional, only if it adds signal beyond the sequence): **`ArrowDiagram`** or color-matched panels — a call stack (`action → service → query helper`) on one side, the ALS store on the other, an arrow/tint from each frame's `getRequestContext()` to the one store. Goal: show that depth doesn't matter; any frame reads the same store. If the DiagramSequence step 3 already conveys this, cut this to avoid redundancy.

**Child loggers per scope** — a short beat: inside a webhook handler, `const log = logger.child({ webhookEventId: event.id, stripeEventType: event.type })` narrows scope; every `log.info(...)` after carries those keys *plus* the request IDs (because the request child composes). Idiomatic and cheap in pino. Frame it as scope-narrowing: the file's logger knows what the file is doing. (Connect to conventions' "one child logger per seam, seam name matches the file.")

Exercise — **`Sequence`** drill: "Order the journey of a `requestId` through one request." Steps (source order = correct): read-or-generate in `proxy.ts` → `als.run` opens the request store → auth enriches the store in `authedAction` → a deep helper's child logger stamps the ID on a line → the same ID is set on the Sentry event → the ID is echoed on the response. Reinforces the diagram by recall.

`Term` tooltips in this section: **child logger** (a derived logger that pre-binds extra keys onto every line it emits); **entry seam** (the single chokepoint where every request of a kind passes — where cross-cutting setup belongs).

### Levels, cardinality, and retiring console.log

**Goal:** the daily-use rules that keep the discipline honest. Three tied sub-beats; keep them in one section since they're all "how you use the logger correctly day to day."

**Log levels and what each means** — the decision rule:
- `debug` — high-volume tracing, off in production.
- `info` — significant *successful* state changes (signed in, webhook processed, job completed). Explicitly: `info` is not a synonym for `console.log`; routine reads don't get an `info` line.
- `warn` — recoverable abnormality (expected-cache-hit missed, retry fired, a fail-open carve-out triggered).
- `error` — handled or unhandled exception, with the `err` serializer; Sentry sees these too (the overlap with lesson 1's capture path — same incident, two stores).

Exercise — **`Dropdowns`** (inline-prose mode): 4–5 sentences each describing a logging moment, student picks the level. E.g. "A Stripe webhook was processed successfully → `___`" (`info`); "The rate limiter's Redis call failed and we fell open → `___`" (`warn`); "A server action caught a thrown error before returning the user-safe Result → `___`" (`error`); "Tracing which branch a pricing calc took, local only → `___`" (`debug`). Lightweight understanding check, placed right at the rule.

**The cost of cardinality** — why you index structured values, not prose:
- The destination indexes every key. `userId` is high-cardinality but bounded (by user count); `requestId` is high-cardinality and ephemeral (TTL drops it) — both fine.
- Don't index free text (`{ note: 'user clicked the green button while...' }`) — narrative belongs in `msg` (low-cardinality), structured facts belong in keys.
- The `err` serializer note: the long `stack` string lives inside the structured `{ type, message, stack }` object, not as a top-level free-text key — so it doesn't fragment the index. Reinforce: log `{ err }` and let the serializer run; never `JSON.stringify(err)` (drops non-enumerable `message`/`stack`) and never a hand-built `error: err.stack` string field.
- Don't log whole DB rows — volume and cost. Log the keys that identify the row.

**The `console.log` retirement** — the enforcement that makes it stick:
- After this lesson, `console.log` in server code is a lint failure (`no-console` scoped to a server-files glob). Server logs go through `logger`.
- Client code keeps `console.error` for browser DevTools — it's caught by the Sentry client SDK's `captureConsoleIntegration` (lesson 1). So the rule is server-scoped, not global.
- Tests may keep `console.log`; the lint rule excludes them.

Component: a small **`Code`** block sketching the Biome/ESLint `no-console` override with the server glob (illustrative, not a full config — note it's a sketch so downstream agents don't over-engineer it). Tie to conventions' Logging section ("no free-form string concatenation") and the existing `no-console` posture.

Close the section (and lesson) by restating the two-surface payoff in one or two sentences and pointing forward: lesson 3 decides *what* each seam logs and locks down PII redaction in this same logger config; lesson 4 ships these lines to a destination and walks the Sentry→logs pivot the `requestId` enables. Keep the handoff to one short paragraph.

Optional **`ExternalResource`**: pino docs (logging) and/or the Node `AsyncLocalStorage` API page. One or two cards max.

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- The user/operator message split (Chapter 080 L2): operator-side records carry IDs/emails/stacks; user-side sees a sanitized string. Here it only justifies that `userId`/`orgId`/`email` are safe to log. Full split is Chapter 080's.
- `authedAction` / `authedRoute` wrappers and `proxy.ts` (Units 6/9-10, Chapter 033): the entry seams this lesson wraps. Assume the student has them; do not rebuild them.
- The cause-chain / `Error.cause` discipline (Chapter 008) and `ensureError` (Chapter 080): referenced for the `err` serializer; not re-taught.
- UUIDv7 (`uuidv7()`) as the course ID standard (Data layer conventions): reused for `requestId` generation.

**Owned by other lessons — reference and stop:**
- **Sentry setup, `captureException`, `onRequestError`, breadcrumbs, `beforeSend`** — Chapter 092 L1. This lesson only *adds the shared `requestId`* to the Sentry scope and notes the level/error overlap; it does not teach Sentry.
- **The 3am rule (what each seam logs) and the PII/secret redaction denylist** — Chapter 092 L3. This lesson stands up the logger with a `redact` slot but leaves the denylist contents and the "what to log" decisions to L3. One forward pointer; no denylist here.
- **Shipping logs to a destination (Vercel Drains, Axiom) and the Sentry→logs pivot UI** — Chapter 092 L4. This lesson plants the shared `requestId` and foreshadows the pivot in diagram captions only; no drain setup.
- **VS Code inspector / server-side debugging** — Chapter 092 L5.
- **The audit log (`logAudit(tx, event)`, append-only domain events, RLS, retention)** — Chapter 081 L3/L4. It is a *different stream* with different rules (durable, transactional, compliance-scoped). Cross-reference once to prevent confusion (operational logs are ephemeral and best-effort; the audit log is durable and the system of record); do not cover it.

**Explicitly out of scope (named once at most, no depth):**
- OpenTelemetry / distributed tracing — name as the alternative path the course doesn't take; do not introduce spans.
- Frontend/browser logging beyond the `console.error`→Sentry note.
- Performance traces and `tracesSampleRate` — Chapter 094.
- Winston / Bunyan / Consola — name once as pino alternatives with no trigger to flip for this course; do not compare in depth.
- pino-pretty deep config, log rotation, self-hosted log infra — out; the destination is managed (lesson 4).
