# Chapter 008 — Errors as a first-class concern

## Lesson 1 — Two channels: throw the unexpected, return the expected

- **Taught** — Channel routing heuristic ("can the caller reasonably do something different per case?") splitting failures into `Result<T, E>` returns vs thrown `Error`s; `try`/`catch`/`finally` mechanics with strict-mode `unknown` catch parameter; async-throw flow (rejection at `await` site, missing-await escape, mandatory `return await` inside `try`); "only throw `Error`" rule; the canonical `Result<T, E>` shape with `ok`/`err` factories; catch-placement reflex (framework boundary vs vendor-seam conversion vs log-and-continue anti-pattern).
- **Cut** — None significant; the fire-and-forget catch beat from the outline collapsed into a single bare-`catch` paragraph and a callout in the missing-await tab.
- **Debts** — L2 owes: `instanceof Error` narrow to unlock `err.message`, custom `Error` subclasses with literal-typed `name`, `Error.cause` chains, `ensureError` normalizer, `AbortError`/`TimeoutError` discrimination, `Error.isError()` cross-realm reach, `AggregateError`. Chapter 080 owes framework-boundary catch in depth. Lesson 3 of chapter 043 owes the Server Action `Result<T, ActionError>` contract. Lesson 2 of chapter 011 + lesson 2 of chapter 046 owe RFC 9457 Problem Details wire shape.
- **Terminology** — *throw channel* / *return channel* / *two channels*; *framework boundary* (Term defined: edge catch site — `error.tsx`, route handler catch, Server Action wrapper); *unhandled rejection* (Term, recalled from ch 007); *Result* (the shape, not formally Term-defined); `ok(value)` / `err(error)` factory names; `Result<T, never>` / `Result<never, E>` factory return types; `E` is itself a discriminated union of `{ code: '...' }` tagged variants; `assertNever` recalled from ch 005 L3.
- **Patterns and best practices** —
  - `Result<T, E>` lives at `lib/result.ts` with field names `value` (success) and `error` (failure). **Generic two-parameter form** (not the project-specific `Result<T, ActionError>` from ch 043).
  - Factories: `const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })` and `const err = <E>(error: E): Result<never, E> => ({ ok: false, error })`. No inline `{ ok: true, value }` construction.
  - Throwables are always `Error` instances or subclasses — never strings or plain objects.
  - Inside `try`, always `return await` (not bare `return`) for async calls.
  - Catches only exist to (a) convert vendor throws into `Result.err`, or (b) sit at framework boundaries. No log-and-continue catches.
  - In converting-catch shape, use `e` (not `err`) as the catch parameter to avoid shadowing the `err` factory helper.
  - `E` in `Result<T, E>` is a discriminated union with `code` discriminant; callers `switch` on `result.error.code` with `assertNever` floor.
  - Overuse trap: don't use `Result` for operational failures with no per-case caller branch (e.g. `'DATABASE_DOWN'`).
- **Misc.** —
  - Canonical example function name for the chapter: `parseInvoiceCsv(file)` with `ParseError = { code: 'EMPTY' } | { code: 'INVALID_ROW'; row: number } | { code: 'OUT_OF_RANGE'; column: string }`. Disk-read failure throws.
  - Custom component used: `src/components/lessons/008/1/TwoChannels.astro` (two-channel comparison visual, replaces the planned `<Figure>` + HTML table).
  - Lesson explicitly notes that `Result<T, E>` here differs from the older `Result<T>` shape in ch 005 L1 pedagogical intro — this is the canonical shape going forward.
  - Stripe vendor-seam example uses `Stripe.errors.StripeCardError` and returns `err({ code: 'CARD_DECLINED', userMessage: '...' })`.
  - `log` is a hypothetical placeholder; pino wiring lands in Unit 20 ch 092.

## Lesson 2 — Narrowing the catch and authoring domain errors

- **Taught** — Four-move catch ladder: narrow with `instanceof Error`, discriminate by `error.name`, normalize via `ensureError` at vendor seams, walk `Error.cause` for chains. Cross-realm `instanceof` gotcha and `Error.isError()` (ES2026, Node 24 LTS unflagged) fix. Custom `Error` subclass shape: `extends Error` directly, `readonly name = 'X' as const`, typed structured fields, `{ cause }` passthrough to `super(message, options)`. Rewrap-at-the-seam pattern. `AggregateError` narrow for `Promise.any`. Rule: `err.message` is for operators, not users.
- **Cut** — None significant; realm-boundary diagram delivered as a custom Astro component instead of `<ArrowDiagram>`; `SandboxCallout` for a walkable cause chain was optional and skipped.
- **Debts** — Ch 080 L2 owes user-vs-operator two-audience wrapper (renders user message from `Result.err.code`, operator log from `err.message` + `err.cause`). Ch 080 L3 + Unit 4 owe framework boundary / `error.tsx`. Ch 092 owes the production structured logger and `Error.cause` walker pipeline. Ch 009 owes Temporal substrate (lesson uses `Temporal.Now.instant()` as a one-line forward gesture).
- **Terminology** — *narrow* (Term defined), *realm* (Term defined), *literal type* (Term defined); *rewrap at the seam*; *canonical catch ladder* (specific subclass → `error.name` → generic `Error` → `ensureError`); *discrimination ladder*. Discriminant is `error.name` string literal pinned via `readonly name = 'X' as const`.
- **Patterns and best practices** —
  - Custom error classes live at `/lib/errors.ts` next to `Result` helpers and `ensureError`. Per-feature placement deferred to ch 080.
  - Class shape: `extends Error` directly (no `AppError` base), `readonly name = 'X' as const`, typed structured fields (e.g. `code` as string-literal union, `retryAfter: number`, `retryAfter: Temporal.Duration`), constructor signature `(...domainArgs, message: string, options?: { cause?: unknown })` with `super(message, options)` passthrough.
  - Naming: `PascalCase` matching class name (`BillingError`, `RateLimitError`, `TenancyError`); one class per domain concern; flat namespace (taxonomy = literal `name` set, not inheritance tree).
  - Never write `super('BillingError', ...)` to set name — that fills `message`.
  - `ensureError(value: unknown): Error` — returns value if `Error`, else wraps with `JSON.stringify` (or string) and sets original on `cause`. Lives at `/lib/errors.ts`.
  - Catch ladder order: specific subclass → `instanceof Error && err.name === '...'` → generic `instanceof Error` rethrow → `throw ensureError(e)` catch-all. Order matters (narrows get less specific descending).
  - Cause chain walker must guard with `current instanceof Error && !causes.includes(current)` to avoid cycles; reads `cause` in a loop, never `err.cause.cause.cause`.
  - Inside project code, `cause` is always `Error` or `undefined`; vendors may break this.
  - `err.message` never rendered to users; user message comes from `Result.err.code` mapped to translation key.
  - `catch (e)` (not `err`) inside any catch body that calls the `err` factory from `lib/result.ts` (continuity from L1).
  - `Error.isError()` is the cross-realm-safe swap for `instanceof Error`; reach for it at Web Workers, `vm` contexts, iframes, Next.js edge/Node split. Inside a single realm, `instanceof Error` is still fine.
- **Misc.** —
  - Custom component built: `src/components/lessons/008/2/RealmBoundary.astro` (two-panel main-thread / worker-thread realm illustration).
  - Canonical example classes named: `BillingError` (code: `'card_declined' | 'insufficient_funds' | 'authentication_required'`), `RateLimitError` (`retryAfter: number` in exercise; `retryAfter: Temporal.Duration` named in prose), `TenancyError` (`expectedOrgId` / `actualOrgId`).
  - Canonical `chargeInvoice` Server Action shape returns `Result` with codes `'CARD_DECLINED'`, `'INSUFFICIENT_FUNDS'`, `'3DS_REQUIRED'` and `userMessage` field.
  - `Temporal.Now.instant()` used as forward reference; ch 009 installs Temporal substrate.
  - Stripe vendor narrow: `e instanceof Stripe.errors.StripeCardError`.
  - `AbortError` / `TimeoutError` are `DOMException` in browsers, vary in Node — `err.name === '...'` is the durable contract (recalled from ch 007 L4).
