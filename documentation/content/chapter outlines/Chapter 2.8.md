# Chapter 2.8 — Errors as a first-class concern

## Chapter framing

Chapter 2.7 closed the async substrate — the event loop, the four Promise combinators, parallel-by-default rewrites, and the `AbortSignal` cancellation surface — and named the abort/error seam without teaching it. This chapter installs the error channel as a first-class design decision rather than a `try`/`catch` reflex bolted onto control flow. Two questions sit at the center. **Which failures throw and which return?** A senior reads each potential failure, asks whether the caller can reasonably recover, and routes the failure into one of two channels: a `Result<T, E>` discriminated union the caller must inspect (from 2.5.1) or a throw the framework boundary catches. **Once a throw happens, how does the catch read it safely?** TypeScript's strict catch types every caught value as `unknown`; the senior reflex narrows with `instanceof Error` (or `Error.isError()` in 2026), reaches for a literal-typed `name` discriminant on custom subclasses, and walks `Error.cause` chains when a failure was rewrapped.

Threads that must run through every lesson:

- **Two channels, one decision per failure.** Throw the unexpected; return the expected. The "expected vs. unexpected" cut is the senior question, and the chapter installs it as the reading reflex behind every async function the student writes from Unit 7 onward.
- **The `Result<T, E>` shape is named here, locked in at 7.2.3.** This chapter introduces the discriminated-union return shape and the `ok`/`err` helpers; Unit 7 turns it into the Server Action contract. No re-teaching at that point.
- **Catch typed as `unknown`, narrow before reading.** Every snippet that catches obeys the `strict` + `useUnknownInCatchVariables` shape. `err.message` access without narrowing is a compile error, not a lint warning.
- **Domain errors carry a literal `name`, not a custom class hierarchy.** The 2026 senior shape is small custom `Error` subclasses with a `readonly name = 'BillingError' as const` discriminant, optional structured fields, and `Error.cause` for the original failure. No abstract base classes, no error taxonomies for their own sake.
- **The cross-realm gotcha is structural.** `instanceof Error` fails across realms (workers, vm contexts, edge runtime boundaries); 2026 ships `Error.isError()` (Stage 4 / ES2026) and the `error.name` fallback. Named once, used consistently.
- **Async throws are still throws.** A rejected Promise is the throw at the `await` site. The same `try`/`catch` rules apply, with the `return await` stack-trace discipline from 2.7.3 as the only extra reflex.
- **No history.** Callback-style `(err, result)` signatures, custom error-event emitters, the `domain` module — gone. The chapter writes the form a 2026 SaaS engineer writes and names the legacy only at third-party-SDK seams.

The student finishes the chapter able to route any new failure into the correct channel (`Result` or throw) by reading the caller's recovery path, write a `try`/`catch`/`finally` that satisfies the strict-mode `unknown` catch type, narrow with `instanceof` and the `error.name` fallback, author a small custom `Error` subclass with a literal `name` discriminant and an `Error.cause` link, and recognize `Error.isError()` as the 2026 cross-realm reach. The chapter does not teach refusal-as-error-discipline at the route/action seam (Unit 17.1) or the wire-format error shape (RFC 9457 Problem Details, owned by 3.2.2 and 7.5.2) — it installs the language-level substrate those chapters land on.

---

## Lesson 2.8.1 — Two channels: throw the unexpected, return the expected

Teaches the `try`/`catch`/`finally` mechanics, the async-throw flow, the "only throw `Error`" rule, and the heuristic for routing each failure into either a `Result<T, E>` return or a throw the framework boundary catches.

Topics to cover:

- The senior question. `parseInvoiceCsv(file)` can fail four ways: the file is empty, a row is malformed, a column exceeds the numeric range, the disk read itself errors. Which of those should throw and which should return? A junior writes `throw new Error(...)` for all four and the caller wraps the whole call in `try`/`catch`. A senior reads each failure, asks "can the caller reasonably do something different per case?", and splits: malformed-row and out-of-range become a `Result<Invoice[], ParseError>` the caller inspects; the disk-read failure throws because no caller of `parseInvoiceCsv` can recover from "the file vanished." The lesson installs that split as the reading reflex.
- The two channels, stated plainly.
  - **Return the expected.** Failures the caller is expected to handle as part of normal flow — validation errors, "not found" for an optional lookup, business-rule rejections (insufficient balance, role too low, plan limit hit). These are part of the function's contract. The shape: a `Result<T, E>` discriminated union the type system forces the caller to inspect.
  - **Throw the unexpected.** Failures the caller cannot reasonably recover from inside its own logic — the database is down, the request was canceled, an invariant was violated, the disk is full. These bubble up to a framework boundary (the `error.tsx` boundary, the route-handler catch, the audit-log seam) that decides on the user-visible response. The shape: a thrown `Error`.
- The "can the caller do something different per case?" heuristic. The one-question test that routes any new failure.
  - **Yes, the caller branches on the cause.** Return. The cause is part of the contract; the discriminant lets the caller render a different message, retry differently, or fall back.
  - **No, the caller would log-and-rethrow or display "something went wrong."** Throw. The cause is operational, not domain. The framework boundary handles it.
- The `try`/`catch`/`finally` mechanics, in the strict-mode shape.
  - **`try { ... }`** — the guarded block. Synchronous throws inside it are caught; throws inside nested `async` functions that aren't awaited are not.
  - **`catch (err) { ... }`** — `err` is typed `unknown` under `strict` + `useUnknownInCatchVariables` (the 2026 default). 2.8.2 owns the narrowing; here, the student should leave knowing `err.message` is a compile error before narrowing.
  - **`finally { ... }`** — runs after the `try` completes or after the `catch` runs. The canonical reach: releasing resources (connection.release, controller.abort on shutdown), counter increments, observability spans. The watch-out: a `return` or `throw` from `finally` overrides the `try`/`catch` outcome. Senior reflex: `finally` is for side effects, not control flow.
  - The bare `catch` shape — `try { ... } catch { ... }` with no parameter — is legal and the right reach when the catch genuinely doesn't read the error (a fire-and-forget cleanup wrapper).
- The async-throw flow. The senior takeaway in one line: **a rejected Promise becomes a throw at the `await` site.** Three consequences named.
  - `try`/`catch` around `await someAsync()` catches the rejection just like a synchronous throw. The Promise-level `.catch` is the chained equivalent.
  - `try`/`catch` around an `async` function that isn't `await`ed catches nothing — the rejection escapes as an unhandled rejection (2.7.2 named the consequence).
  - `return await getX()` inside `try` is mandatory; `return getX()` lets the rejection escape past the `catch` because the function has already returned (the discipline from 2.7.3 lands here).
- The "only throw `Error`" rule. JavaScript permits `throw 'something went wrong'` and `throw { code: 'BILLING' }`; both are footguns. The senior rule: **the throwable is always an `Error` instance (or a subclass).** The reasons named.
  - **The catch can rely on the shape.** `instanceof Error` narrows the catch to a known surface (`message`, `name`, `stack`, `cause`). Throwing a string forces every catch site to type-check the value.
  - **Stack traces.** Only `Error` instances carry a stack. Throwing a plain object means the failure point is unrecoverable from the trace alone.
  - **The `ensureError` normalizer (forward link to 2.8.2)** exists specifically to recover from third-party code that breaks this rule. Inside the course's own code, the rule is absolute.
- The `Result<T, E>` shape, named here, locked at 7.2.3. The discriminated union from 2.5.1 applied to the return channel.
  - Canonical shape: `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`.
  - The `ok`/`err` helpers: `const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })` and `const err = <E>(error: E): Result<never, E> => ({ ok: false, error })`. The `never` on the absent side is what makes the union narrow correctly at the call site.
  - The `E` channel is a discriminated union of literal-tagged variants (`{ code: 'INVALID_ROW'; row: number } | { code: 'OUT_OF_RANGE'; column: string }`), not a generic `string`. The point of `Result` is that the caller branches on `error.code` and the compiler enforces exhaustiveness via `assertNever` (2.5.3).
  - The senior watch-out: `Result` for *every* failure is overuse. The rule is "expected and the caller branches"; a function that returns `Result<T, 'DATABASE_DOWN' | 'TIMEOUT' | 'INVALID'>` is doing operator-error reporting in the return channel — those belong in throws.
- The `try`/`catch` placement reflex. Where should the catch live? Two answers, both stated.
  - **At the framework boundary** for unexpected failures. Server Actions, route handlers, page-level loaders, and the `error.tsx` boundary catch the throws that escaped business code. The audit log and the user-vs-operator message split land there. Unit 17.1 owns the deep treatment.
  - **At the call site that has a non-throw alternative.** A `try`/`catch` that wraps a third-party SDK call to translate a vendor-shaped throw into a domain `Result.err(...)`. The catch exists to *convert* the channel, not to swallow.
  - The anti-pattern: a `try`/`catch` that logs and continues with no remediation. Either the failure is recoverable (and the catch converts to `Result.err`) or it isn't (and the catch shouldn't exist; let the boundary catch it).
- The fire-and-forget catch (one paragraph, named once). 2.7.3 introduced `void logEvent(...).catch(...)` for the fire-and-forget pattern. The senior rule restated: **every Promise not awaited has either a `.catch` or is fed to a combinator that handles rejection.** Unhandled rejections crash Node in 2026; the course writes the explicit `.catch` even on logging calls.
- Forward references named in one line each. The `Result` shape lands as the Server Action contract in 7.2.3. The framework-boundary catch (the route handler, the `error.tsx` boundary, the audit-log seam) is Unit 17.1. The wire shape for thrown errors that cross the network is RFC 9457 Problem Details, taught at 3.2.2 and 7.5.2.

What this lesson does not cover:

- Narrowing inside the catch (2.8.2 owns the `instanceof`/`name` discrimination and the `ensureError` helper).
- Authoring custom `Error` subclasses (2.8.2).
- `Error.cause` chaining (2.8.2).
- The `error.tsx` React boundary or the action-level wrapper (Unit 17.1).
- RFC 9457 Problem Details and the on-the-wire error body (3.2.2, 7.5.2).
- `neverthrow`, `effect`, `fp-ts`, or any other Result-library. The course rolls its own minimal `Result<T, E>` shape because the discipline is the lesson, not the library.
- Logging frameworks (Unit 20.1).
- Refuse-by-default at the gate (Unit 17.1.1).

Pedagogical approach: Decision archetype. Open with the `parseInvoiceCsv` four-failure scenario in prose, and refuse to write the function signature until the channel split lands — the student should feel the routing decision. Walk the two channels as one tight comparison table (channel / what it carries / who handles it / canonical site) and name the "can the caller do something different per case?" heuristic explicitly. Walk the `try`/`catch`/`finally` mechanics with one small labeled snippet that demonstrates the strict-mode `unknown` catch type — leave `err.message` underlined as a compile error to motivate 2.8.2. Walk the async-throw flow with a two-snippet pair: the `await` inside `try` that catches, and the un-awaited `async` call that escapes; mark the difference in the surrounding prose. The "only throw `Error`" rule gets one wrong-then-right snippet. Walk the `Result<T, E>` shape with one labeled block showing the type, the `ok`/`err` helpers, and a `parseInvoiceCsv` return whose `E` is a discriminated union of two tagged variants; the call site `switch`es on `result.error.code` with `assertNever` (forward-link to 2.5.3). Close with a `Buckets` or `Dropdowns` exercise: given eight failure scenarios ("CSV row out of range", "Postgres connection refused", "Stripe API key rotated mid-request", "user submitted a duplicate email", "S3 returned 503", "Zod parse failed on form input", "invariant violated: tenant ID mismatch", "OAuth provider returned an unknown error code"), the student routes each to `Result` or `throw`. Optional short `script-coding` exercise where the student takes a function that throws on validation errors and refactors it to return `Result<T, E>` with a tagged-union `E`.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.8.2 — Narrowing the catch and authoring domain errors

Teaches the `unknown`-in-catch narrow with `instanceof Error` and the `ensureError` normalizer, small custom `Error` subclasses with literal-typed `name` discriminants, `Error.cause` for re-wrap and chain walking, and the `error.name` fallback for `AbortError`, `TimeoutError`, and the cross-realm `instanceof` gotcha.

Topics to cover:

- The senior question. A `chargeInvoice(invoiceId)` Server Action calls Stripe, writes a row, and enqueues an email. Any of three failures can land at the action's catch: a Stripe network error (retryable, log and rethrow for the framework boundary), a Stripe `card_declined` (a domain failure the user should see as "Your card was declined"), and an `AbortError` if the user navigated away (silent no-op). The catch parameter is typed `unknown`. How does the catch tell the three apart, and how does it carry the original failure forward so the operator log has the full chain? The lesson installs the four moves: narrow with `instanceof Error`, discriminate with `error.name` (or a literal-typed `name` on a custom subclass), normalize unknown shapes through `ensureError`, and walk `Error.cause` to read the chain.
- The `unknown`-in-catch narrow, the strict-mode shape. Under `strict` plus `useUnknownInCatchVariables` (TS 4.4+, the 2026 default), `catch (err)` types `err` as `unknown`. The compiler refuses `err.message`. Two narrows named, both senior reflexes.
  - **`instanceof Error`** — the cheapest narrow. After the check, `err` is `Error` and `err.message` / `err.name` / `err.stack` / `err.cause` are typed. Works for everything thrown by application code that obeys the "only throw `Error`" rule.
  - **`Error.isError(value)`** — ES2026 / Stage 4, Node 24+. The cross-realm-safe equivalent of `instanceof Error`. The senior reach in any code that crosses a realm boundary (workers, `vm` contexts, the edge-runtime split, iframes). Named in one paragraph with the trigger; 2026-current and available unflagged in Node 26.
- The cross-realm `instanceof` gotcha, stated plainly. Each JavaScript realm has its own `Error` constructor; an error thrown in a Web Worker and caught in the main thread fails `instanceof Error` because the two `Error` references are different objects. Three sites where this bites in 2026 SaaS code.
  - **Web Workers and `MessageChannel` boundaries** — rare in app code, common in observability libraries.
  - **The `vm` module in Node** — used by test runners and sandboxes.
  - **The edge / Node runtime boundary in Next.js** (Next.js runtime split — covered in Unit 5) — errors thrown in middleware (edge) and caught in a Server Component (Node) cross realms.
  - The fix: `Error.isError(err)` in 2026, or the `error.name` fallback (next bullet) where realms are an issue.
- The `error.name` fallback, the portable form. Every `Error` subclass sets `name`. Discriminating on `err.name === 'AbortError'` or `err.name === 'TimeoutError'` works across realms because strings are values, not constructor references. The canonical sites.
  - **`AbortError`** — `DOMException` in browsers, varies in Node depending on the API. 2.7.4 named the discrimination; here, name the realm-safe form.
  - **`TimeoutError`** — fired by `AbortSignal.timeout(ms)` in 2026.
  - **Custom domain errors** — when the catch is in a different module than the throw site, the `name` literal is the durable contract; the class itself may not be importable.
- The `ensureError` normalizer. A small helper that turns any `unknown` into an `Error`. The shape:
  - `const ensureError = (value: unknown): Error => value instanceof Error ? value : new Error(typeof value === 'string' ? value : JSON.stringify(value), { cause: value })`.
  - The reach: every catch around a third-party SDK that may break the "only throw `Error`" rule (legacy callback adapters, some browser APIs, the `unknown` rejection from a Promise constructed inside a SDK). The catch becomes `catch (err) { const error = ensureError(err); ... }` and the rest of the block treats `error` as `Error` safely.
  - The senior placement: in `/lib/errors.ts` next to the `Result` helpers, imported at every catch that touches a vendor seam.
- Authoring custom `Error` subclasses, the 2026 minimum-surface shape. Two paragraphs, one code block.
  - The canonical shape: `class BillingError extends Error { readonly name = 'BillingError' as const; readonly code: 'card_declined' | 'insufficient_funds' | 'authentication_required'; constructor(code: 'card_declined' | 'insufficient_funds' | 'authentication_required', message: string, options?: { cause?: unknown }) { super(message, options); this.code = code; } }`.
  - The senior moves named.
    - **Literal-typed `name`.** `readonly name = 'BillingError' as const` — not `super('BillingError', ...)`. The literal is the discriminant; `err.name === 'BillingError'` narrows the type when combined with `instanceof Error`.
    - **Structured fields (`code`, `cause`, ...).** The class carries the data the catch needs to branch. No string parsing.
    - **`{ cause }` passed through to `super(message, options)`.** The `Error.cause` chain is part of the contract.
    - **No abstract base class.** Domain errors are flat. A `BillingError` extends `Error` directly, not `AppError extends Error`. The taxonomy is the literal `name` set, not an inheritance tree.
- `Error.cause` and chain walking. The 2026-current standard for "this failure was caused by that one." Two patterns named.
  - **Rewrap at the seam.** A function that catches a vendor error and rethrows a domain error preserves the original: `throw new BillingError('card_declined', 'Card declined by issuer', { cause: stripeError })`. The operator log walks the chain; the user-facing message stays clean.
  - **Walking the chain.** The structured-log helper recursively reads `err.cause`, stopping when undefined or when it loops. The shape: `const causes = []; let current: unknown = err; while (current instanceof Error && !causes.includes(current)) { causes.push(current); current = current.cause }`. The loop guard exists because cause cycles, while rare, crash the walker. The course's `logError` in 20.1 owns the production version; the chapter installs the pattern.
- The `instanceof` narrow with custom errors. The full discriminate pattern, demonstrated once.
  - The shape: `if (err instanceof BillingError) { switch (err.code) { case 'card_declined': ...; case 'insufficient_funds': ... } } else if (err instanceof Error && err.name === 'AbortError') { return } else if (err instanceof Error) { throw err } else { throw ensureError(err) }`.
  - The senior watch-out: order matters. Specific subclasses before the generic `Error` check. The trailing `ensureError` is the catch-all for the "third-party threw a string" case.
- The "what about `AggregateError`?" aside, in one paragraph. `Promise.any` rejects with an `AggregateError` carrying an `errors` array. The narrow is `err instanceof AggregateError`. The catch reads `err.errors` (typed `Error[]` if every input obeyed the rule) to decide on the response. Named once because the `Promise.any` reach was installed in 2.7.2 and the catch needs the discriminator.
- Naming conventions for the literal `name` set. One short paragraph. The course uses `PascalCase` matching the class name (`BillingError`, `RateLimitError`, `TenancyError`), one error class per domain concern, and a flat namespace in `/lib/errors.ts`. The pattern installs at Unit 17.1; here, the convention is named so the student sees the shape consistently across chapters.
- The `error.message` discipline, named in one paragraph. The `message` field is for *operators*, not users. It carries the technical detail (the SQL constraint name, the Stripe error code, the Zod path). The user-facing message lives elsewhere — on the `Result.err.code` discriminant the UI maps to a translation key. Unit 17.1.2 owns the two-audience split; here, the rule "don't render `err.message` to users" is named once.

What this lesson does not cover:

- The two-audiences user-vs-operator split at depth (17.1.2).
- The framework-boundary catch and the `error.tsx` boundary (17.1.3, Unit 4 React error boundaries).
- Logging-framework wiring (`pino`, Sentry — Unit 20.1).
- The wire format for thrown errors (RFC 9457 Problem Details — 3.2.2, 7.5.2).
- Sourcemaps for production stack traces (Unit 20.1).
- Async stack traces under Node (`--async-stack-traces` is on by default in Node 22+; named once, no deep treatment).
- Custom `Symbol.for('nodejs.util.inspect.custom')` for pretty-printing in the REPL. Niche.
- Re-throwing with `Error.captureStackTrace` for vendor SDKs that lose traces. Out of scope.

Pedagogical approach: Pattern archetype with one structural code block at the center. Open with the `chargeInvoice` three-failure scenario in prose to motivate the four moves. Walk the `unknown`-in-catch narrow with a two-step paired snippet: the wrong shape (`catch (err) { console.log(err.message) }` — compile error) and the right one (`catch (err) { if (err instanceof Error) console.log(err.message) }`). Name `Error.isError()` in one paragraph with the trigger; show the cross-realm scenario with a small `ArrowDiagram` (main thread, worker, the `Error` constructor mismatch). Walk the `ensureError` helper with one labeled snippet in `/lib/errors.ts`. The `BillingError` class is the lesson's center of gravity — one labeled block showing the full shape (literal `name`, typed `code`, `{ cause }` passthrough) with side annotations highlighting the four senior moves. Walk `Error.cause` with two adjacent snippets: the rewrap-at-the-seam pattern (catching Stripe, throwing `BillingError`) and the chain-walking helper. The full discriminate pattern (specific subclass, then `error.name`, then generic `Error`, then `ensureError`) gets one labeled block as the canonical catch shape. Use a `code-review` exercise where the student is given three catch blocks and identifies the bugs (unguarded `err.message`, `instanceof` reach across a worker boundary, missing `ensureError` for a vendor seam). Close with a short `script-coding` exercise: the student authors a `RateLimitError` subclass with a literal `name`, a `retryAfter: number` field, and a `{ cause }` passthrough, then writes the catch block that discriminates it from `BillingError` and a generic `Error`. Optional `SandboxCallout` with a working `Error.cause` chain the student can walk.

Estimated student time: 45 to 55 minutes.

---

## Lesson 2.8.3 — Quizz

Top 10 topics to quiz:

1. The two-channel routing decision: expected failures the caller branches on go through `Result<T, E>`; unexpected operational failures throw and bubble to the framework boundary.
2. The "can the caller do something different per case?" heuristic as the one-question test that routes any new failure.
3. The `try`/`catch`/`finally` mechanics under `strict` + `useUnknownInCatchVariables`: `err` typed `unknown`, the `finally` side-effects-only rule, and the bare `catch` shape.
4. The async-throw flow: a rejected Promise is the throw at the `await` site, un-awaited `async` calls escape the surrounding `try`, and `return await` inside `try` is mandatory.
5. The "only throw `Error`" rule with the three consequences (predictable catch shape, stack traces, the `ensureError` recovery for vendor seams).
6. The `Result<T, E>` shape with `ok`/`err` helpers, a discriminated `E` channel, and the `assertNever` exhaustiveness at the call site.
7. The `unknown`-in-catch narrow with `instanceof Error`, the `Error.isError()` cross-realm 2026 replacement, and the `error.name` fallback for portable discrimination.
8. The custom `Error` subclass shape: literal-typed `readonly name`, structured fields (`code`), `{ cause }` passed through `super(message, options)`, and no abstract base class.
9. `Error.cause` for rewrap-at-the-seam and the chain-walking pattern (with the loop-guard against cycles).
10. The canonical catch ordering: specific subclasses first, then `error.name` for cross-realm errors like `AbortError` and `TimeoutError`, then a generic `Error` branch, then `ensureError` as the catch-all.

---

## Total chapter time

Roughly 85 to 105 minutes across the two content lessons plus the quiz. The chapter fits one or two evenings — 2.8.1 (channel decision and mechanics) and 2.8.2 (narrowing and domain errors) split naturally if the student wants two sittings, but both can run together as a single 90-minute session. At the end the student can route any new failure into the correct channel (`Result` or throw) by reading the caller's recovery path, write a `try`/`catch` that satisfies the strict-mode `unknown` catch type, narrow with `instanceof Error` and the `error.name` fallback, reach for `Error.isError()` at realm boundaries, normalize unknown throws through `ensureError`, author small custom `Error` subclasses with literal-typed `name` discriminants and `Error.cause` passthrough, and walk a cause chain without looping. Chapter 2.9 lands on this floor with the wire-boundary error story (JSON parse failures as a `Result`-channel candidate) and the `Date`-to-Temporal pivot. Unit 7.2.3 locks the `Result` contract into Server Actions; Unit 17.1 turns the catch reflexes into a refuse-by-default error-discipline pass; Unit 20.1 turns the `Error.cause` walker into the production structured-log pipeline.
