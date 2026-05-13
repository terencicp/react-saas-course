# Chapter 2.8 — Errors as a first-class concern

## Chapter framing

Chapter 2.7 closed on `AbortController` and named, in passing, the discrimination at the catch — `if (error instanceof DOMException && error.name === 'AbortError')` — that distinguishes a user-cancel from a real failure. That line was a promise. This chapter pays it: errors are a first-class concern, the `catch` binding is `unknown`, the language *cannot* promise an `Error`, and the senior 2026 surface for shaping, throwing, narrowing, and re-wrapping errors is the discipline that turns "we got an exception" into "we know exactly what went wrong, who it's for, and how the caller responds." By the end the student writes `try`/`catch`/`finally` by reflex, knows which errors to throw and which to return as `Result`, authors small domain-error classes with discriminants, re-wraps with `Error.cause`, narrows `unknown` at the catch site without `as`, and recognizes the cross-realm and AbortError gotchas before they bite.

The senior framing for the chapter: **two error channels, two disciplines.** A 2026 SaaS codebase has two distinct kinds of failure flowing through it. *Expected* failures — validation rejected, the row wasn't found, the user lacks the role, the payment was declined — are part of the contract; the senior reach is to model them as values and return them, because the caller has a specific UI response for each one. *Unexpected* failures — a network blip, a database deadlock, a third-party 500, a bug — are not part of the contract; the senior reach is to throw and let the framework's error boundary catch it, log it, and show the generic fallback. The student leaves able to put any given failure in the right channel on sight, and to write each channel's machinery correctly.

Threads that must run through every lesson:

- **`unknown` is the catch binding's type, by spec.** The chapter installs the fact plainly: the language allows `throw` of *any* value, so the runtime cannot promise that `catch (error)` binds an `Error`. With `useUnknownInCatchVariables` (on by default in TS strict, which the course's tsconfig from 1.4.3 turned on), the binding is `unknown`. Every catch in every snippet narrows before reading any property. The 2.5.3 type-predicate and 2.4.6 narrowing toolkit cashes in here in full.
- **Expected vs. unexpected, named at every call site.** The decision question fires on every error-producing operation in the chapter: is this failure something the caller is going to *act on differently* (show a field error, retry, route to a different page)? If yes, model it as a return value (`Result<T, E>` from 2.5.1 or a Server Action's typed return shape from Unit 7.3). If no, throw and let the boundary handle it. The chapter teaches the heuristic, not a dogma — the senior knows when to break the rule.
- **The 2026 Next.js floor is operating.** Server Actions return typed state to `useActionState`, throwing from a Server Action triggers the nearest `error.tsx` boundary, and Server Components throw `notFound()` or `redirect()` as control-flow exceptions the framework owns. The chapter doesn't *teach* those surfaces — Unit 5 and Unit 7 own them — but every lesson plants the forward reference so the framework's behavior makes sense when it lands. The student finishes Chapter 2.8 knowing that "throw" in a Next.js route segment lands somewhere specific, not "into the void."
- **Custom errors are small and discriminant-typed.** The course teaches one shape for domain errors: a subclass of `Error` with a literal-typed `name` (or an explicit `kind` field) used as the discriminant for a `switch` at the catch site. The 2.5.1 discriminated-union pattern operates over error classes the same way it operates over state. The lesson cuts the heavyweight error hierarchies (`AbstractDomainError extends BusinessError extends ...`) and the FP-style `Tagged` libraries; the senior reach in 2026 is a flat set of three to six domain-error classes per feature, named for the failure they represent.
- **`Error.cause` is the re-wrap primitive.** Native since ES2022 / Node 16.9, every modern JS engine supports it. When a lower layer's error is caught and a higher-layer error is thrown, the senior reach is `throw new InvoiceCreationError('...', { cause: dbError })`. The cause chain is what observability tooling (Sentry — Unit 20.1) walks to surface the root cause. The student writes `cause` by reflex and never silently swallows the original.
- **`error.name` discrimination is the lightweight narrow for runtime-typed errors.** Some errors don't have a class the consumer can `instanceof` against — `AbortError` from `fetch`'s abort path is a `DOMException`, `TimeoutError` from `AbortSignal.timeout(ms)` is also a `DOMException`, errors crossing structured-clone boundaries (Web Workers, Node `worker_threads`) lose their prototype chain. The senior reach there is the `error.name` discriminant. The 2.7.4 reflex lands at its full weight here.
- **No `Result<T, E>` library lock-in.** The course writes the `Result<T, E>` discriminated union by hand (the shape from 2.5.1). Libraries like `neverthrow` are named once and dismissed: the unmaintained-library risk plus the build-time cost of ESLint plugins to enforce `.unwrap()` discipline plus the cognitive cost of teaching a second control flow doesn't earn its weight for the 90% of SaaS code the course targets. The 10% where the library would help (deeply chained Result-returning pipelines) is rare in idiomatic Next.js code where Server Actions already model the channel.
- **Senior anchors for later units are seeded here.** Server Action error returns (Unit 7.2 and 7.3) land on the `Result`/discriminated-union form 2.8.1 names. The route-handler error contract (Unit 7.5) lands on the same. The `error.tsx` boundary (Unit 5.6) lands on what an unhandled throw does in a Next.js route segment. The Sentry integration (Unit 20.1) lands on the `Error.cause` chain and the custom-error `name` field. The Zod parse-error at the wire (Unit 7.1) lands on the `unknown`-to-domain-type narrow this chapter teaches. Each lesson plants its forward reference at the call site where the move earns its weight.
- **Naming for intent stays operating.** A custom error is named for what failed (`InvoiceNotFoundError`, `PaymentDeclinedError`, `RateLimitExceededError`), never `MyError` or `AppError`. A re-wrap's cause is the original, not a stringified copy. The 2.2.3 naming reflex applies to the error surface as much as to any other type.

This chapter ships small standalone TypeScript snippets in `ScriptCoding` and a couple of `TypeCoding` blocks for the `unknown`-narrowing patterns. A `CodeVariants` block carries the throw-vs-return decision side-by-side; a `TabbedContent` block organizes the narrowing primitives; an `AnnotatedCode` block walks the `Error.cause` re-wrap. The student finishes the chapter able to write a `try`/`catch`/`finally` that distinguishes expected from unexpected failures, author a custom error subclass with a discriminant, re-wrap with `Error.cause` and walk the cause chain, narrow `unknown` at the catch site with `instanceof Error` and the `error.name` discriminator, and recognize the cross-realm `instanceof` failure mode before it bites in production.

The chapter ordering follows the layering. The throw-and-catch surface comes first because it's the mechanics every later beat depends on — what `try`/`catch`/`finally` actually does, when an `async` function's `throw` lands in the caller's `catch`, the throw-vs-return-`Result` decision, the `finally` cleanup discipline. Authoring and narrowing errors comes second as the consumer-side and author-side discipline — custom `Error` subclasses with discriminants, `Error.cause` for re-wrap, the `unknown`-in-catch narrow with `instanceof Error`, the `error.name` discriminator, the cross-realm gotcha. The quiz closes.

---

## Lesson 2.8.1 — `try`/`catch`/`finally` and the throw-vs-return decision

Topics to cover:

- The chapter-opening senior question: in a 2026 SaaS function, the operation might fail. What's the form? Throw an `Error`? Return `null`? Return a `Result`? The wrong call here is the single most common reason a codebase ends up with "every function returns `T | undefined` and the caller spreads null-checks everywhere" or, on the other side, "every helper throws and the route handler is a wall of nested `try`/`catch`." The lesson installs the decision rule — *expected* failures are returned as values, *unexpected* failures are thrown — and the mechanics that make each channel correct.
- **`try`/`catch`/`finally`** as the synchronous mechanics, named concretely:
  - **`try`** — the block whose throw the `catch` (and `finally`) catches. Synchronous throws inside `try` divert to `catch`; throws that escape the `try` keep propagating up the call stack.
  - **`catch (error)`** — the handler. The binding is `unknown` under strict mode. The handler runs once on a throw, and execution continues after the `try`/`catch` block (unless the `catch` itself throws or returns).
  - **`finally`** — the cleanup block. Runs regardless of whether the `try` completed normally, the `catch` ran, or the `catch` itself threw. The senior site: closing a file handle, releasing a database connection from a manually-acquired pool, clearing a UI loading state in legacy code (modern React lets the framework own this; named for completeness).
  - **The flow when `catch` re-throws** — the `finally` block still runs before the re-thrown error propagates. The senior reflex: cleanup belongs in `finally`, not at the bottom of the `try`, so an unexpected throw doesn't leak the resource.
  - **The `return`-from-`finally` watch-out**, named in one line. A `return` inside `finally` overrides the value the `try` or `catch` would have returned, *and* swallows a propagating throw. The senior reach: never `return` from `finally`; use it for cleanup only.
- **`throw`** as the language primitive:
  - The form — `throw new Error('...')`, `throw new InvoiceNotFoundError(id)`, `throw error` (re-throw inside a `catch`).
  - The language allows `throw` of *any* value — `throw 'oops'`, `throw 42`, `throw { reason: '...' }`. The senior reach is to *always* throw an `Error` (or a subclass), because the catch site's narrowing toolkit (`instanceof Error`, `error.message`, `error.stack`, the `cause` chain) only works on instances of `Error`. The lesson names the rule plainly: **only throw `Error`.** Code that throws strings or POJOs is legacy; the catch site has to handle the chaos.
  - Re-throw discipline. Inside a `catch`, the senior reach is either to *handle* the error (return a value, log and continue) or to *re-throw* (often wrapped with `Error.cause` — full treatment in 2.8.2). Silent catches that swallow the error and return `undefined` are the bug class that breaks every observability tool downstream.
- **Async/await error flow**, restated from 2.7.3. A rejected Promise awaited inside an `async` function throws at the `await` site — the throw lands in the enclosing `try`/`catch` just like a synchronous one. An unawaited Promise that rejects lands on the runtime's `unhandledRejection` (Node terminates the process by default since Node 16). The senior reflex: every `await` that can reject is either inside a `try`/`catch`, or its rejection is intentionally propagated to a caller that handles it.
  - The Promise-rejection form, named once: `.catch(handler)` chained to a Promise. Equivalent semantics to `try`/`catch` around `await`, but the `try`/`catch` form keeps the local in scope after the catch, which the chained `.catch` doesn't. The course writes `try`/`catch` inside `async` functions by default and uses `.catch` only at top-level entry points (`main().catch(handleFatal)`) and rare single-expression Promise consumers.
- **Throw vs. return** — the chapter's load-bearing decision, named as a heuristic the student applies on every error-producing function:
  - **Throw when the failure is unexpected.** The caller cannot recover with a different code path; the right response is to log, surface a generic message, and stop. Network errors talking to Stripe, a database connection dropped mid-transaction, an `assertNever` triggered by a programming error, a bug — all throws. The framework's error boundary catches them. The caller's code reads straight, no `if`/`else` per call.
  - **Return when the failure is expected.** The caller has a specific UI for it; the rejected case is part of the contract. Validation failed and the form should show field errors; the row wasn't found and the page should render a 404; the user isn't authorized and the action should re-render the form with an error message. The senior reach is a discriminated-union return — `Result<T, E>` from 2.5.1 — so the consumer narrows on `result.ok` and the type system enforces both branches are handled.
  - **The decision question** — the heuristic the student applies on every call site: *does the caller want a different code path, or just a generic failure*? Different path → return. Generic failure → throw. The student practices this in the exercises.
  - **The 2026 Next.js floor**, named with the forward reference. Server Actions in Unit 7.2 model the expected channel as a typed return shape (`useActionState`'s state); throwing from a Server Action triggers the nearest `error.tsx` (Unit 5.6) for the unexpected channel. The chapter doesn't teach the surfaces, but every lesson notes that this is the form the framework expects.
- **The `Result<T, E>` shape** as the senior 2026 return type for the expected channel. Restated from 2.5.1 with the focus on the *consumer*:
  ```ts
  type Result<T, E> =
    | { ok: true; value: T }
    | { ok: false; error: E };

  async function findInvoice(id: InvoiceId): Promise<Result<Invoice, 'not_found' | 'unauthorized'>> {
    const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
    if (!invoice) return { ok: false, error: 'not_found' };
    if (invoice.orgId !== currentOrgId()) return { ok: false, error: 'unauthorized' };
    return { ok: true, value: invoice };
  }
  ```
  The consumer narrows on `if (!result.ok)` and the compiler grants access to `result.error`; the success branch grants access to `result.value`. The 2.5.1 narrow pays off here in full. The error variant's type is a literal union of the failure codes the caller acts on — not a free-form string, not a generic `Error`.
- **What the senior cuts**:
  - **`neverthrow`** and the `Result`-as-library pattern. Named once and dismissed: an unmaintained library plus an ESLint plugin to enforce `.unwrap()` plus the cognitive cost of a second control flow doesn't earn its weight in a Next.js codebase where Server Actions already model the channel. The hand-rolled discriminated union is the senior default.
  - **`Effect-ts`** and the heavy FP error tracks. Out of scope for a 2026 SaaS course; the runtime weight and the learning curve don't fit a stack where most error handling lives inside framework-owned seams.
  - **Tuple-style `[error, value]` returns** (Go-style). Named once and dismissed in favor of the discriminated-union `{ ok, value | error }` — same information, but the narrow is in the type, not the position, and the discriminant reads better at the call site.
- **The watch-outs a senior names**:
  - **Empty catch blocks.** `try { ... } catch {}` silently swallows every error including bugs. The senior reflex is "never silent — log, return, or re-throw, always one of the three." Reviews catch the pattern; the lesson installs the reflex.
  - **The catch-and-rethrow that loses context.** `catch (e) { throw new Error('something failed'); }` — the original error and its stack are gone, the observability tool sees a meaningless message. The fix is `Error.cause` (full treatment in 2.8.2); seeded here so the student sees the bug class before the fix lands.
  - **Awaiting in `finally` for cleanup that can itself throw.** A `finally { await closeConnection(); }` block whose `await` rejects throws *over* the original error from the `try` — the original error is lost. The senior reach: wrap the cleanup itself in a `try`/`catch` if it can throw, and log-and-continue rather than re-throw.
  - **Throwing in a hot path.** `throw`/`catch` is *not* free — V8 deoptimizes throw-heavy code paths, and the stack-walking on construction costs measurable microseconds. The senior reach: don't use throws as a control-flow primitive for expected branches (return the `Result`); reserve throws for the truly exceptional. Rarely a bottleneck in application code; named so the student doesn't reach for throws in tight loops.

What this lesson does not cover:

- Subclassing `Error`, the discriminant pattern, and `Error.cause` (2.8.2).
- The `unknown`-in-catch narrow with `instanceof Error` and `error.name` (2.8.2).
- Cross-realm `instanceof` failures (2.8.2).
- `AbortError` and `TimeoutError` discrimination at depth — 2.7.4 introduced it, 2.8.2 closes the narrow.
- Zod's parse-error shape — Unit 7.1 owns the wire-boundary validation.
- React 19 `error.tsx` boundaries and `useActionState` error returns — Unit 5.6 and Unit 7.3 own them.
- Process-level `unhandledRejection` and `uncaughtException` handlers — Unit 20.1 owns the observability seam.
- `AggregateError` from `Promise.any` and the multi-error shape — named once in passing if it lands, 2.7.2 introduced it.
- Stack-trace formatting, source maps, and Sentry — Unit 20.1.

Pedagogical approach:

Mechanics archetype with a load-bearing Decision beat — the throw-vs-return call. The lesson opens with the senior question — "the operation can fail; what's the form?" — and a `CodeVariants` block showing the same `findInvoice` function written three ways. Tab 1: returns `null` on miss, throws on unauthorized (mixed channel — the bug). Tab 2: throws on both miss and unauthorized (single channel — the caller writes `try`/`catch` and discriminates on `instanceof InvoiceNotFoundError`; works but heavyweight for an expected branch). Tab 3: returns `Result<Invoice, 'not_found' | 'unauthorized'>` for the expected channel, throws only on unexpected DB errors. The annotation on each tab names the trade-off and the call site that prefers it. The senior call — tab 3 — is the chapter's default; the lesson cements it.

A `ScriptCoding` block has the student write the `try`/`catch`/`finally` mechanics: a small `processPayment` function with a `try` that calls a fake gateway, a `catch` that logs and re-throws, and a `finally` that releases a fake lock. The student adds a throw inside the `try`, observes the `finally` fire before the throw propagates, then adds a throw inside the `catch` and observes the `finally` still firing. The flow is concrete.

A `TabbedContent` block organizes the three failure-handling shapes as a reference card. One tab for `throw`, one for return-`null`, one for `Result<T, E>`. Each tab has the signature, the consumer-side narrow, the trigger ("when the caller wants a different code path / when missing is normal / when there are 2+ legal failure reasons"), and the canonical SaaS site.

A `Buckets` exercise sorts ten operations into "throw" or "return `Result`": `findInvoiceById` (return — not-found is expected), `chargeCard` (return — decline is expected), `parseUserInput` (return — validation is expected), `connectToDatabase` (throw — connection failure is unexpected), `assertNever` (throw — programming error), `lookupRoleForUser` (return — depends on what the caller does with no-role), etc. The decision discipline is the deliverable. The exercise includes a few intentionally ambiguous cases where the student picks based on the calling context the prompt names.

A `CodeReview` exercise on a 25-line route handler with three errors: an empty `catch {}` that swallows a Stripe error, a `catch (e) { throw new Error('failed') }` that loses the original, and a `finally { await closeConn(); }` whose `await` itself can throw. The student leaves a comment per bug with the fix.

A small `ScriptCoding` block has the student refactor a function that returns `Invoice | null` and throws on auth failure into one that returns `Result<Invoice, 'not_found' | 'unauthorized'>` and only throws on database errors. The student writes the consumer-side narrow on `if (!result.ok)` and watches the compiler enforce both branches. The 2.5.1 cash-in is concrete.

Close with a `PredictOutput` exercise on a small program with nested `try`/`catch`/`finally` where the `try` throws, the `catch` throws a wrapped error, and the `finally` does cleanup. The student predicts the order of side effects (cleanup runs before the wrapped error propagates) and the final caught value. The mechanics are airtight.

Estimated student time: 50 to 60 minutes.

---

## Lesson 2.8.2 — `unknown` in catch, custom errors, and `Error.cause`

Topics to cover:

- The senior question: 2.8.1 named the rule — only throw `Error` — and the consumer-side reality — `catch (error)` binds `unknown`. The catch site is therefore a narrowing problem. What's the senior 2026 narrow, what shape do the errors *being* thrown take (so the narrow is tractable), how does the catch site walk the cause chain when a lower layer wrapped its failure, and what's the cross-realm gotcha that makes `instanceof Error` quietly lie? The lesson installs the full surface.
- **The `unknown` binding**, named with the spec rationale. The language allows `throw` of any value; the compiler cannot statically prove that `catch (error)` binds an `Error`. With `useUnknownInCatchVariables` enabled (on by default in TS strict, on in the course's tsconfig from 1.4.3), the binding is `unknown`. Reading any property without narrowing is a compile error. The senior reflex: the *first* line of every catch block is a narrow.
  - The legacy form, named for recognition. Before `useUnknownInCatchVariables`, the binding was `any`. Older codebases that haven't upgraded their tsconfig still bind `any`; the senior reflex on entering such a codebase is to flip the flag and fix the catches.
- **The senior narrow on `unknown`**, named as the standard form:
  ```ts
  try {
    await chargeCard(amount);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('charge failed', { message: error.message, stack: error.stack });
    } else {
      logger.error('charge failed with non-Error throw', { value: error });
    }
    throw error;
  }
  ```
  The `instanceof Error` narrow is the floor; with the 2.8.1 rule operating ("only throw `Error`"), the `else` branch is the legacy-third-party defense. The student writes the narrow by reflex on every catch.
- **The `ensureError` helper**, named as the senior idiom when the catch site doesn't want to branch on the `else` case at every site:
  ```ts
  function ensureError(value: unknown): Error {
    if (value instanceof Error) return value;
    return new Error(`Non-Error thrown: ${JSON.stringify(value)}`);
  }
  ```
  Used at the top of every catch to normalize the binding: `const error = ensureError(thrown);`. The senior reach when the codebase wires Sentry / a logger that expects an `Error` — every catch produces a real `Error` and the cause-chain machinery operates.
- **Custom `Error` subclasses for domain errors**, named as the senior shape:
  ```ts
  class InvoiceNotFoundError extends Error {
    readonly name = 'InvoiceNotFoundError' as const;
    constructor(readonly invoiceId: InvoiceId, options?: ErrorOptions) {
      super(`Invoice ${invoiceId} not found`, options);
    }
  }
  ```
  - The pieces, named:
    - **`extends Error`** — the prototype chain that makes `instanceof Error` and `instanceof InvoiceNotFoundError` both work. The runtime `Error` constructor is what gives the instance its `stack` property.
    - **`readonly name = '...' as const`** — the discriminant for the catch-site narrow. A literal-typed `name` field is what makes a `switch (error.name)` exhaustive (paired with 2.5.3's `assertNever`). The 2.4 literal-union discipline cashes in.
    - **Carry the domain identifier as a typed field** (`invoiceId: InvoiceId`). The catch site reads `error.invoiceId` without re-parsing the message string. The senior reach: messages are for humans, fields are for callers.
    - **Forward `options` to `super()`** — so the caller can pass `{ cause: originalError }` and the cause chain just works.
  - The senior triggers. Not every error class is its own subclass; the lesson teaches three to six classes per feature, named for the failure shapes the consumer discriminates on. A `RateLimitExceededError` because the UI shows a different message; a `PaymentDeclinedError` with a `declineCode` field because the UI surfaces the specific decline reason; a `WebhookSignatureMismatchError` because the route handler logs and returns 401 instead of the generic 500. The course's later units land on this shape.
  - **The discriminant pattern**, named as the catch-site cash-in:
    ```ts
    try {
      await processWebhook(payload);
    } catch (error) {
      if (error instanceof WebhookSignatureMismatchError) return new Response('Unauthorized', { status: 401 });
      if (error instanceof RateLimitExceededError) return new Response('Too Many Requests', { status: 429 });
      if (error instanceof Error) {
        logger.error('webhook failed', { error });
        return new Response('Internal Error', { status: 500 });
      }
      throw error;
    }
    ```
    The handler reads as a small dispatch table. The 2.5.1 discriminated-union narrow operates over error classes the same way it operates over states.
- **`Error.cause`** — the re-wrap primitive (ES2022 / Node 16.9+, every modern engine since early 2022):
  ```ts
  try {
    await db.insert(invoices).values(row);
  } catch (dbError) {
    throw new InvoiceCreationError(`Failed to create invoice for ${row.orgId}`, { cause: dbError });
  }
  ```
  - The mechanics. The second argument to `new Error(message, options)` is an `ErrorOptions` object with a `cause` field. The runtime attaches `cause` to the new error's `.cause` property; Node and modern browsers print the cause chain in stack traces (`Caused by: ...`). The chain is what Sentry, Datadog, and any other observability tool walks to find the root cause.
  - The senior reach. Every catch that wraps and re-throws sets `cause`. The lower-layer error's stack and fields are preserved through the chain. The student walks the chain at the catch site:
    ```ts
    let current: unknown = error;
    while (current instanceof Error) {
      logger.error('error in chain', { name: current.name, message: current.message });
      current = current.cause;
    }
    ```
    Used inside the top-level error handler that translates exceptions to log lines or HTTP responses. Lands in Unit 20.1 (Sentry's automatic cause-walking).
  - **Don't swallow the cause.** The lesson's load-bearing rule: every catch that re-throws either propagates the original (`throw error`) or wraps with `cause` (`throw new HigherLayerError('...', { cause: error })`). The catch that throws a fresh `Error` without `cause` is the bug class observability tools complain about.
- **The `error.name` discriminant** for runtime-typed errors that don't have a class the catch site can `instanceof` against:
  - **`AbortError`** — `fetch`'s abort path throws a `DOMException` with `.name === 'AbortError'`. The 2.7.4 introduction is now the senior idiom:
    ```ts
    if (error instanceof DOMException && error.name === 'AbortError') return;
    ```
  - **`TimeoutError`** — `AbortSignal.timeout(ms)` throws a `DOMException` with `.name === 'TimeoutError'`. Same form, different name.
  - **Zod's parse errors** — `ZodError` is a class the catch site can `instanceof`. Named here as a one-line forward reference; full treatment in Unit 7.1.
  - **Errors that crossed structured-clone boundaries** — Web Workers, Node `worker_threads`, `postMessage`. The error's prototype chain doesn't survive; `instanceof Error` returns false on the receiving side, but `error.name` and `error.message` round-trip. The senior reach in those code paths is `error.name` as the discriminant. Named because the course will not detour to Workers but the student should recognize the gotcha.
  - The senior framing: `instanceof` is the strong narrow when the class is in scope; `error.name` is the weaker narrow when the class isn't. The course writes `instanceof` by default and falls back to `error.name` for the runtime-typed cases above.
- **The cross-realm `instanceof` gotcha**, named in one paragraph. JavaScript's `instanceof` checks the *current* realm's prototype chain. An `Error` constructed in a different realm (a Node `vm` context, a Web Worker, an iframe, an Edge Function vs. a Node Function in the same process) has a different `Error.prototype` and `instanceof Error` returns false. Rare in 2026 SaaS application code — the framework keeps boundaries clean — but lands when an error crosses a Web Worker boundary or when a third-party library bundles its own Error class. The senior reach: `error.name === 'AbortError'` (a string compare) or a duck-typed check (`typeof error === 'object' && error !== null && 'message' in error`) when `instanceof` is unreliable. Named so the student isn't surprised when the narrow lies.
- **Stack-trace preservation**, named in one paragraph and one watch-out:
  - The `Error` constructor captures the stack at *construction*, not at `throw`. A long-lived `Error` constructed early and thrown later has the early stack. The senior reach: construct the `Error` at the point of failure, not earlier.
  - `return await` (from 2.7.3) keeps the `async` function's frame on the stack for the duration of the awaited operation — better stack traces in rejections. Restated here so the student remembers the 2026 senior call when the error path matters.
  - V8's `Error.captureStackTrace(target, constructorOpt)` (Node-specific) lets a custom error subclass omit its own constructor from the stack. The senior reach is rare — modern Node already does this for `Error` subclasses; named here for recognition.
- **The watch-outs a senior names**:
  - **`catch (error: Error)`** — annotating the catch binding as `Error` directly was a pre-strict TypeScript escape hatch. It's still legal syntactically in some configurations but defeats the `useUnknownInCatchVariables` safety. The senior reach: let the binding be `unknown` and narrow.
  - **The `as Error` cast inside catch.** Equivalent failure mode — the cast trusts what the language can't promise. Use the `instanceof Error` narrow or the `ensureError` helper.
  - **Comparing errors with `===`** — two `Error` instances are reference-distinct even with the same message. The senior reach: compare by class (`instanceof`) or by `name`/discriminant field, never by reference.
  - **Throwing inside a constructor** — legal but the partially-constructed instance is gone, no `this` references survive. Rare in application code; named for the custom-error author who's tempted to validate in `super()`.
  - **Async constructor anti-pattern**, named once for adjacency. A class constructor can't `await`. The senior reach when initialization is async is a static factory method (`static async create()`) that does the async work and returns the instance. Out of scope here (Chapter 2.9 lightly touches classes); named because some error subclasses want async init for the message.
  - **The Zod `safeParse` seam**, named as the forward reference. Zod's `safeParse` returns `{ success: true; data } | { success: false; error }` — a discriminated union, same shape as `Result<T, E>`. The 2.8.1 channel for expected errors is exactly what Zod produces at the wire. Full treatment in Unit 7.1; the lesson plants the seed so the shape is familiar.

What this lesson does not cover:

- The throw-vs-return decision (2.8.1).
- `try`/`catch`/`finally` mechanics in depth (2.8.1).
- Zod schema design and `safeParse` at depth (Unit 7.1).
- The `error.tsx` Next.js boundary and `useActionState` error returns (Unit 5.6 and Unit 7.3).
- Sentry integration and the cause-chain walker in production (Unit 20.1).
- `process.on('uncaughtException')` and `unhandledRejection` (Unit 20.1).
- Custom-error subclasses for HTTP route handlers (Unit 7.5) — named once.
- Source maps and stack-trace symbolication (Unit 20.1).

Pedagogical approach:

Pattern archetype with two Mechanics beats (the custom-error subclass and the `Error.cause` re-wrap) plus a Decision-style narrow walk. The lesson opens with a senior question — "the catch binding is `unknown`. What's the first line of every catch block in a 2026 codebase?" — and a small `TypeCoding` block where the student writes a catch that reads `error.message` and watches the compile error. The student adds `if (error instanceof Error)` and the error vanishes; the narrow is concrete.

A `ScriptCoding` block has the student write the `ensureError` helper and use it at the top of a catch block. The student throws three values from the `try` — a real `Error`, a string, and an object — and observes the helper normalize each into an `Error`. The pattern lands in muscle memory.

An `AnnotatedCode` block walks the custom `InvoiceNotFoundError` subclass, with annotations on each piece — `extends Error`, the literal `name`, the typed domain field, the `super(message, options)` forwarding. A `TypeCoding` block has the student write a second error class (`PaymentDeclinedError` with a `declineCode` field) and exercise the catch-site narrow with `instanceof PaymentDeclinedError`. The dispatch-table catch pattern is shown in an `AnnotatedCode` block — a webhook handler with three `instanceof` branches mapping to three HTTP responses.

The `Error.cause` beat lands in a `ScriptCoding` block where the student wraps a low-level DB error in a higher-level `InvoiceCreationError` with `cause`, then writes a small while-loop walker that prints the cause chain. The student sees the original error's message and stack in the chain output — the observability win is concrete.

A `TabbedContent` block organizes the narrowing primitives the chapter teaches: one tab for `instanceof Error` (the floor), one for `instanceof CustomErrorClass` (the discriminant per-class), one for `error.name === 'AbortError'` (the runtime-typed narrow), one for `ensureError(value)` (the normalizer). Each tab has a signature, a one-line trigger, and a canonical site.

A `CodeReview` exercise on a 30-line function with five issues: an empty `catch`, a `catch (e: Error)` annotation, an `as Error` cast inside the catch, a re-throw without `cause`, and a `finally` block that returns a value. The student leaves a comment per bug with the senior fix.

A `Buckets` exercise sorts eight catch-site scenarios into the right narrow form: a generic logger that just needs `message` and `stack` (use `instanceof Error`), a webhook handler that returns specific HTTP codes (use `instanceof CustomError` per class), a fetch wrapper that distinguishes user-cancel from real error (use `error.name === 'AbortError'`), a function that re-throws everything but logs first (use `ensureError` to normalize), etc.

Close with a small `PredictOutput` exercise on a function that throws an `InvoiceCreationError` with a `cause` chain three deep. The student predicts what the cause-chain walker logs and in what order. The cause-chain mental model is the deliverable.

Estimated student time: 55 to 65 minutes.

---

## Lesson 2.8.3 — Quizz

Top ten topics to quiz:

1. The throw-vs-return decision — expected failures (validation, not-found, unauthorized, payment decline) return a `Result<T, E>` or a typed discriminated union; unexpected failures (network, DB, programming errors) throw and the framework's boundary catches them.
2. `try`/`catch`/`finally` mechanics — `finally` runs on every exit path including re-throws; never `return` from `finally`; cleanup that can itself throw needs its own `try`/`catch`.
3. The "only throw `Error`" rule — the language allows `throw` of any value, but the catch-site narrow only works on `Error` instances; throwing strings or POJOs is legacy.
4. The `Result<T, E>` discriminated-union shape as the senior 2026 return type for the expected channel; the consumer narrows on `if (!result.ok)` and the compiler enforces both branches.
5. `unknown` in the catch binding (TS strict default) — the language can't promise an `Error`; the first line of every catch is a narrow; `instanceof Error` is the floor.
6. The `ensureError` helper — normalizing a non-`Error` throw into an `Error` for downstream tooling; the senior reach when a logger or observability tool expects an `Error`.
7. Custom `Error` subclasses for domain errors — `extends Error`, `readonly name = '...' as const`, typed domain fields, forward `options` to `super()` so `cause` works; three to six per feature, never one heavyweight hierarchy.
8. `Error.cause` for re-wrap — every catch that wraps and re-throws passes `{ cause: original }`; observability tools walk the chain; "don't swallow the cause" is the load-bearing rule.
9. The `error.name` discriminant for runtime-typed errors — `AbortError` and `TimeoutError` from `DOMException`, errors crossing structured-clone boundaries that lose `instanceof`; the senior fallback when the class isn't in scope.
10. The cross-realm `instanceof Error` gotcha — different realms have different `Error.prototype`; `instanceof` returns false on cross-realm errors; the fix is `error.name` or a duck-typed check.

---

## Total chapter time

Roughly 105 to 125 minutes across the two teaching lessons plus the quiz. The chapter fits in one evening — the throw-and-catch surface plus the throw-vs-return decision in the first sitting, the custom errors plus `Error.cause` plus the `unknown` narrow in the second. The student finishes the chapter able to put any failure in the right channel on sight, write `try`/`catch`/`finally` with cleanup discipline, author small domain-error subclasses with discriminants, re-wrap with `Error.cause` and walk the cause chain, narrow `unknown` at the catch with `instanceof Error` and `error.name`, and recognize the cross-realm `instanceof` failure mode before it bites. Chapter 2.9 (Practical odds and ends) lands directly on this floor — JSON parsing's `unknown` return and custom-error subclasses as the rare class site both reach back to the moves this chapter taught.
