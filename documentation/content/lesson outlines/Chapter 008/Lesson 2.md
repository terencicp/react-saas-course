# Lesson 2 — Narrowing the catch and authoring domain errors

## Title and sidebar

- **Title (h1):** Narrowing the catch and authoring domain errors
- **Sidebar label:** Narrowing and domain errors

The chapter-outline title names both halves of the lesson (the unknown-narrowing reflex and the custom-class authoring shape) in one phrase. Keep verbatim.

## Lesson framing

This lesson is a **Pattern archetype**. Lesson 1 left the student with one open question: the catch parameter is typed `unknown`, so `err.message` is a compile error — *how* does the catch read it? This lesson installs the four-move reading reflex (`instanceof Error` → `error.name` discriminant → `ensureError` normalizer → `Error.cause` walk) and the small custom-`Error`-subclass authoring shape that makes the catch a discrimination site, not a "log and pray" site.

Pedagogical conclusions from brainstorming:

- **Open with one scenario that motivates all four moves.** The `chargeInvoice` Server Action that touches Stripe is the right vehicle — it produces three structurally different failures at one catch (a Stripe network throw the boundary should see, a `card_declined` the user should see, and an `AbortError` from navigation that the action should silently swallow). The student should *feel* why "the catch is one move" doesn't work before any mechanics land.
- **Two narrowing moves before any custom class lands.** `instanceof Error` is the cheapest narrow and unlocks `err.message`. `Error.isError()` (Stage 4 / ES2026, ships unflagged in Node 24 LTS — the course's pinned runtime — via V8 13.6, and is in Chrome 135+, Firefox 134+, Safari 18.4+) is the cross-realm-safe replacement. Show both, mark when each one wins. Don't introduce custom classes until the narrowing reflex exists — the class is what makes the narrow *useful*, not the thing that produces it.
- **Custom `Error` subclasses are the lesson's center of gravity.** The 2026 senior shape is small: extends `Error` directly, `readonly name = 'X' as const` as the discriminant, structured fields (`code`, `retryAfter`, ...), and `{ cause }` passed through to `super(message, options)`. No abstract base classes. No taxonomy trees. This is where the "decisions before syntax" pillar lands hardest — the shape is short, but the design moves it encodes are senior.
- **The literal-`name` discriminant is the durable contract.** When the catch is in a different module than the throw site (or worse — across a realm boundary), the *class* may not be importable, but the *name string* always reads. `error.name === 'BillingError'` works where `instanceof BillingError` doesn't. Name this explicitly so the student carries the discriminant forward.
- **`Error.cause` is the rewrap pattern, not the deep-tree pattern.** The senior reach: catch a vendor error at a seam, throw a domain error with `cause: vendorError`. The chain is two or three deep at most. The chain-walking helper exists for the structured logger, not for routine reads. Show the rewrap; gesture at the walker; do not deep-dive the production logger.
- **`ensureError` is a one-line helper, not a section.** It exists for one job: third-party code that broke the "only throw Error" rule from lesson 1. Show the shape, show where it lands in the canonical catch ladder, move on. Don't dwell.
- **The cross-realm gotcha is real but rare.** Web Workers, `vm` modules, and the Next.js edge/Node split are the three sites where `instanceof Error` fails because the realms have different `Error` constructors. `Error.isError()` is the 2026 fix; the `error.name` fallback is the portable form for any code that crosses module boundaries. Name once with a small illustrating diagram; don't drown the student in realms.
- **The canonical catch ladder is the lesson's structural payoff.** Specific subclass first (`instanceof BillingError`), then `error.name` cross-realm cases (`AbortError`, `TimeoutError`), then a generic `Error` branch, then `ensureError` as the catch-all for vendors that threw a string. One labeled block, end of lesson, the student leaves with the shape memorized.
- **Beginners' biggest trap: reading `err.message` and hoping.** The junior shape is `catch (err: any) { console.log(err.message) }` — types lied about, message string parsed for branching. The senior reframing: the catch is a *discrimination site*. Branch on type and tag, not on substring matches.
- **Beginners' second trap: building an error taxonomy.** Junior reach is `abstract class AppError extends Error { ... }` with a tree of subclasses for every domain. The 2026 shape is flat — one class per domain concern, no abstract base, the literal `name` set *is* the taxonomy. Name this explicitly.
- **`Error.message` is for operators, not users.** The user-facing message lives on the `Result.err.code` discriminant the UI maps to a translation key. The `message` field carries the technical detail (SQL constraint name, Stripe code, Zod path) that lands in the structured log. Name once; forward-link to the user-vs-operator split in chapter 080.
- **`AggregateError` is named once.** `Promise.any` rejects with one. The catch shape is `err instanceof AggregateError → err.errors` (typed `Error[]`). One paragraph because chapter 007 lesson 2 installed `Promise.any` and the student needs the discriminator. No deep dive.
- **Practice both halves with one exercise each.** A `CodeReview` exercise where the student spots three bugs in catch blocks (unguarded `err.message`, `instanceof` across a worker boundary, missing `ensureError` for a vendor seam). A `ScriptCoding` exercise where the student authors a `RateLimitError` subclass with the literal `name` + `retryAfter` field + `{ cause }` passthrough, then writes the catch that discriminates it.

## Lesson sections

### Opening (no h2 — intro paragraphs only)

Three short paragraphs. Goal: motivate all four moves with one scenario, recall the unresolved question from lesson 1, preview the lesson's end state.

- **The scenario.** Frame in prose: a `chargeInvoice(invoiceId)` Server Action calls Stripe, writes an invoice row, and enqueues a confirmation email. The action wraps the work in `try`/`catch`. Three different failures can arrive at that catch:
  - A Stripe network error — Stripe's API was unreachable; the catch should let the failure bubble for the operator log and the framework boundary.
  - A Stripe `card_declined` — the issuer rejected the card; the user should see "Your card was declined."
  - An `AbortError` — the user navigated away mid-charge; the catch should silently no-op.

  The catch parameter is typed `unknown`. **How does the catch tell these three apart, and how does it carry the original failure forward so the operator log has the full chain?** No code yet — the lesson's payoff signature is the canonical catch ladder at the end.

- **Recall lesson 1.** The catch is typed `unknown` under `strict` + `useUnknownInCatchVariables` (the 2026 default). `err.message` is a compile error. This lesson installs the four moves that unlock it: **narrow** (`instanceof Error`), **discriminate** (`error.name` or a literal-typed `name` on a custom subclass), **normalize** (`ensureError` for vendor seams), and **walk** (`Error.cause` for the chain).

- **Where this lesson ends.** The student leaves able to write any `catch` block as a discrimination ladder — specific subclasses first, cross-realm `error.name` checks next, generic `Error` after, and `ensureError` as the catch-all — and able to author small custom `Error` subclasses with a literal `name` discriminant, structured fields, and `Error.cause` passthrough. Chapter 008 closes here; chapter 080 turns this into the framework-boundary discipline; chapter 092 turns `Error.cause` into the structured-log pipeline.

### The `instanceof Error` narrow

The first technical beat. Goal: install the cheapest narrow and unlock `err.message`. Two paired snippets, one short paragraph each.

Content:

- **One framing sentence.** The cheapest narrow on `unknown` is `instanceof Error` — after the check, the compiler knows `err.message`, `err.name`, `err.stack`, `err.cause` are all readable.

- **`<CodeVariants syncKey="catch-narrow">` with two tabs.** The wrong-then-right pair the student needs to see.

  - **Tab 1: wrong (compile error).** `data-mark-color="red"`.
    ```ts
    try {
      await chargeInvoice(invoiceId);
    } catch (err) {
      log.error('charge failed', { message: err.message }); // err is unknown — compile error
    }
    ```
    Prose: "The catch parameter is `unknown`. The compiler refuses `err.message` — it has no proof that `err` is even an object, let alone one with a `message` field. Reading without narrowing is the lesson 1 footgun." Frame as the trailing edge of lesson 1's `unknown` rule.

  - **Tab 2: right (narrowed).** `data-mark-color="green"`.
    ```ts
    try {
      await chargeInvoice(invoiceId);
    } catch (err) {
      if (err instanceof Error) {
        log.error('charge failed', { message: err.message, name: err.name });
      }
    }
    ```
    Prose: "`err instanceof Error` narrows `err` from `unknown` to `Error`. Inside the `if`, every standard property (`message`, `name`, `stack`, `cause`) is typed and readable. Because the project obeys the 'only throw Error' rule from lesson 1, this narrow catches everything thrown from the project's own code."

- **One short paragraph on what the narrow gives you.** Standard `Error` surface — `message` (string), `name` (string — the constructor's name by default), `stack` (string, captured at construction), `cause` (any value, set via the `Error` constructor's second-argument options). Note: this is the *minimum* surface. Custom subclasses (next section but one) add their own typed fields on top.

`<Term>` candidates in this section:
- *narrow* — "A TypeScript control-flow check that refines a value's type from broader to more specific (`unknown` to `Error`, `string | undefined` to `string`). After the narrow, the compiler reasons about the refined type inside the guarded block."

### `Error.isError()` and the cross-realm gotcha

Goal: name the realm boundary, install `Error.isError()` as the 2026 cross-realm-safe narrow, and forward the portable `error.name` fallback to the next section.

Content:

- **One framing sentence.** `instanceof Error` works inside a single JavaScript realm. The moment a thrown value crosses a realm boundary — a Web Worker, a `vm` sandbox, the Next.js edge/Node split — the catching side and the throwing side hold different `Error` constructors, and `instanceof Error` returns `false` on a real `Error`.

- **One small diagram.** A small `<Figure>` wrapping an `<ArrowDiagram>` (or — if `<ArrowDiagram>` is too heavy for this — a plain HTML+CSS two-panel illustration) showing two realm boundaries:
  - **Realm A** (left): a small "main thread" panel with `catch (err) { if (err instanceof Error) /* false! */ }`.
  - **Realm B** (right): a small "worker thread" panel with `throw new Error('boom')`.
  - One arrow between them labeled "postMessage / structured clone".
  - A small annotation badge: "Realm A's `Error` ≠ Realm B's `Error` — different constructors."

  Pedagogical goal: the student should see the realm boundary as a *structural* fact, not a niche edge case. One image is enough; do not over-engineer. If the diagram becomes hard to author, fall back to a `<TabbedContent>` showing the two realms side-by-side. Use `expandable={false}` on the `<Figure>` only if the inner content has positioning constraints (e.g., `<ArrowDiagram>`).

- **`Error.isError()`, the 2026 fix.** One short `<Code>` block:
  ```ts
  catch (err) {
    if (Error.isError(err)) {
      log.error('charge failed', { message: err.message });
    }
  }
  ```
  Prose: "`Error.isError(value)` is the cross-realm-safe equivalent of `value instanceof Error`. It's a Stage 4 (ES2026) proposal that ships unflagged in **Node 24 LTS** (the course's pinned runtime — V8 13.6 brings it) and in modern browsers (Chrome 135+, Firefox 134+, Safari 18.4+). It's the senior reach in any code that crosses a realm boundary. Inside a single realm — most app code — `instanceof Error` is still fine; reach for `Error.isError()` when the catch is on the receiving side of a worker, a `vm` context, an iframe, or the edge/Node split in Next.js."

- **Three sites where this bites in 2026 SaaS code.** A tight three-bullet list:
  - **Web Workers and `MessageChannel` boundaries.** Rare in app code, common in observability libraries and heavy-compute offload.
  - **The `vm` module in Node.** Test runners and sandbox evaluators.
  - **The Next.js edge / Node runtime split.** An error thrown in middleware (edge runtime) and caught in a Server Component (Node runtime) crosses realms.

- **The portable fallback, in one sentence.** "If `Error.isError()` isn't available — and as a discriminator that works across module boundaries — the `error.name` string fallback (next section) is the durable form." This sets up the next section without re-explaining.

`<Term>` candidates in this section:
- *realm* — "A JavaScript execution context with its own global object and own copy of every built-in constructor — Web Worker, `vm` context, iframe, the Next.js edge runtime. `instanceof` fails across realms because each side holds a different constructor reference for the same built-in name."

### The `error.name` discriminant

Goal: name the portable cross-realm fallback and set up the foundation for the literal-typed `name` on custom subclasses.

Content:

- **One framing sentence.** Every `Error` subclass sets `name`. Strings are values, not constructor references — so `err.name === 'AbortError'` works across realms, across module boundaries, even when the class itself isn't importable.

- **The canonical 2026 sites.** Three short snippets in a single `<CodeVariants syncKey="error-name-sites">` block, two tabs:

  - **Tab 1: `AbortError`.** The signal-cancelled discriminant from chapter 007 lesson 4.
    ```ts
    try {
      const data = await fetch(url, { signal: controller.signal });
      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // user navigated away — silent no-op
        return;
      }
      throw err;
    }
    ```
    Prose: "`AbortError` is what `fetch`, `AbortSignal.timeout`, and most cancellable APIs throw when the signal aborts. In browsers it's a `DOMException`; in Node it varies. The shape that always works is `err.name === 'AbortError'` — the string is the contract."

  - **Tab 2: `TimeoutError`.** Specific to `AbortSignal.timeout`.
    ```ts
    try {
      const data = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        // deadline hit — retry or surface as timeout
        return retry();
      }
      throw err;
    }
    ```
    Prose: "`AbortSignal.timeout(ms)` fires a distinct `TimeoutError` (a `DOMException` with `name === 'TimeoutError'`) when the deadline hits — not `AbortError`. The discrimination matters: a timeout is recoverable with a retry; a user-cancel is not." Forward-link in passing: "Chapter 007 lesson 4 named the discrimination; here, the realm-safe form is the durable contract."

- **One short paragraph: `name` as the durable contract.** When the catch and the throw are in different modules — or worse, different bundles — the class may not be importable but the `name` string always reads. This is exactly why the next section's custom subclasses pin `name` as a `readonly ... as const` literal: the literal is the discriminant, the class is the implementation. The two are kept in lockstep so either narrow works.

### Authoring a custom `Error` subclass

Goal: install the 2026-current minimum-surface shape for domain error classes. One labeled block at the lesson's center of gravity.

Content:

- **One framing sentence.** When a failure rides the throw channel and the catch needs to read structured data (a Stripe error code, a retry-after duration, a tenant ID), reach for a small custom `Error` subclass. The 2026 shape is minimal: extends `Error` directly, a literal-typed `name`, typed structured fields, and `{ cause }` passed through to `super`.

- **The canonical shape, one labeled `<AnnotatedCode>` block, four steps.** This is the lesson's structural payoff.

  ```ts
  // lib/errors.ts
  export class BillingError extends Error {
    readonly name = 'BillingError' as const;
    readonly code: 'card_declined' | 'insufficient_funds' | 'authentication_required';

    constructor(
      code: 'card_declined' | 'insufficient_funds' | 'authentication_required',
      message: string,
      options?: { cause?: unknown },
    ) {
      super(message, options);
      this.code = code;
    }
  }
  ```

  Step 1 (highlight `class BillingError extends Error`, `color="blue"`): **Extends `Error` directly.** No abstract base class. No `AppError` parent. Domain errors are a flat namespace — one class per domain concern (`BillingError`, `RateLimitError`, `TenancyError`), all extending `Error`. The taxonomy is the *literal `name` set*, not an inheritance tree. The senior reframing: a base class adds shared behavior; the catch reads a *tag*, not a method.

  Step 2 (highlight `readonly name = 'BillingError' as const`, `color="green"`): **The literal-typed `name`.** This is the discriminant. `readonly` so the field can't be reassigned. `'BillingError' as const` so the type is the string literal `'BillingError'`, not the wider type `string`. Combined with `instanceof Error`, `err.name === 'BillingError'` narrows the type at the catch — and across realm or module boundaries where `instanceof BillingError` would fail. Watch-out worth naming: do **not** write `super('BillingError', ...)` to set the name; that puts `'BillingError'` into `message`. The `readonly = ... as const` form is the right move.

  Step 3 (highlight the `code` field and constructor parameter, `color="orange"`): **Structured fields.** The class carries the data the catch needs to branch — `code` is the per-failure-mode discriminant inside the class. Typed as a string-literal union so the consumer's `switch` is exhaustive. Other shapes add fields freely: `RateLimitError` carries `retryAfter: Temporal.Duration`, `TenancyError` carries `expectedOrgId` / `actualOrgId`. No string parsing.

  Step 4 (highlight `options?: { cause?: unknown }` and `super(message, options)`, `color="violet"`): **`{ cause }` passes through.** The `Error` constructor's second-argument options object accepts a `cause` field. Passing it through (rather than ignoring it) preserves the chain — the next section's rewrap pattern depends on this. Without the passthrough, `err.cause` is `undefined` even when callers tried to set it.

- **One paragraph: the four senior moves, restated.** A quick recap of what the block encodes — flat inheritance, literal `name`, typed structured fields, `cause` passthrough. This is the *shape*. Reach for it every time you need a domain error class.

- **A small note on naming.** Use `PascalCase` matching the class name (`BillingError`, `RateLimitError`, `TenancyError`). One error class per domain concern. The flat namespace lives at `/lib/errors.ts` next to the `Result` helpers and the `ensureError` normalizer. Name once, do not dwell.

`<Term>` candidates in this section:
- *literal type* — "A TypeScript type that's a specific string, number, or boolean value rather than the wider category. `'BillingError'` is a literal type; `string` is the wider type. Use `as const` (or explicit annotation) to keep a value at its literal type instead of widening to `string`."

### `Error.cause`: rewrap at the seam

Goal: install the rewrap-at-the-seam pattern (the senior reach for `Error.cause`) and gesture at the chain-walking helper without deep-diving the production logger.

Content:

- **One framing sentence.** `Error.cause` is the 2026-current standard for "this failure was caused by that one." Two patterns: **rewrap at the seam** (a function catches a vendor error and throws a domain error carrying the original) and **walk the chain** (the structured logger reads `cause` recursively to log the full chain). The first is the daily reach; the second lives in the logger.

- **The rewrap pattern, one `<Code>` block.** The canonical shape — catch Stripe, throw `BillingError`, carry the original through `cause`.

  ```ts
  try {
    await stripe.charges.create({ amount, source: token });
  } catch (e) {
    if (e instanceof Stripe.errors.StripeCardError) {
      throw new BillingError('card_declined', 'Card declined by issuer', {
        cause: e,
      });
    }
    throw e; // operational — let the boundary catch it
  }
  ```
  Prose: "The vendor's `StripeCardError` becomes the project's `BillingError`. The user-facing branch in the action reads `err instanceof BillingError && err.code === 'card_declined'`. The operator log walks `err.cause` and gets the full Stripe response — including the request ID, the decline code, the network timing — without any string parsing. The chain is the contract."

  Pedagogical note for the writing agent: the snippet uses `catch (e)` not `catch (err)` to avoid shadowing the `err` factory helper from `lib/result.ts` (the project-wide convention from lesson 1's continuity notes). Carry the convention.

- **The chain-walking helper, named in one paragraph.** Show the shape in a small `<Code>` block:

  ```ts
  const causes: Error[] = [];
  let current: unknown = err;
  while (current instanceof Error && !causes.includes(current)) {
    causes.push(current);
    current = current.cause;
  }
  ```
  Prose: "The structured logger reads `err.cause` recursively, stops when `cause` is undefined, and stops if it ever sees a cause it's already pushed (cause cycles, while rare, crash an unguarded walker). Chapter 092 owns the production logger; this lesson installs the *pattern*. The takeaway is the discipline: any catch that wants the full chain reads `cause` in a loop, not via a single `err.cause.cause.cause` access — production stack traces have surprised more than one engineer."

- **Watch-out, one sentence.** Setting `cause` to a non-`Error` value (a string, a plain object) is legal but loses the structured chain. Inside the project's own code, `cause` is always an `Error` (or `undefined`). Vendor seams may set it to anything — which is why the walker checks `current instanceof Error` before reading `current.cause`.

### The `ensureError` normalizer

Goal: one-paragraph helper. Install where it lives, what it does, where it lands in the canonical ladder (next section). Do not dwell.

Content:

- **One framing sentence.** The "only throw `Error`" rule from lesson 1 is absolute inside the project's own code. At third-party seams — legacy callback adapters, some browser APIs, SDK rejections — a thrown value may be a string, a plain object, even `null`. The `ensureError` helper normalizes any `unknown` into an `Error` so the rest of the catch can treat it uniformly.

- **The shape, one `<Code>` block.**
  ```ts
  // lib/errors.ts
  export const ensureError = (value: unknown): Error =>
    value instanceof Error
      ? value
      : new Error(
          typeof value === 'string' ? value : JSON.stringify(value),
          { cause: value },
        );
  ```
  Prose: "If `value` is already an `Error`, return it. Otherwise, wrap it in a new `Error` whose `message` is a sensible string and whose `cause` is the original value (so the structured logger can still find it). The catch becomes `catch (err) { const error = ensureError(err); ... }` and the rest of the block treats `error` as `Error` safely."

- **Where it lives.** `/lib/errors.ts` next to the custom subclasses. Imported at every catch that touches a vendor seam. Inside the project's own code (where the "only throw Error" rule holds), the catch doesn't need it — `instanceof Error` is enough.

- **Forward to the canonical ladder.** "The `ensureError` call lives at the *bottom* of the canonical catch ladder — it's the catch-all for the third-party-threw-a-string case after the specific-subclass and `error.name` branches have run."

### The canonical catch ladder

Goal: install the lesson's structural payoff — a single labeled block showing the four-move ladder in order. Specific subclasses first, then `error.name` for cross-realm cases, then generic `Error`, then `ensureError`.

Content:

- **One framing sentence.** Put the four moves together. The canonical 2026 catch reads top to bottom: specific subclasses first (the cheapest, type-safest narrows), then `error.name` for cross-realm errors the catch can recognize by string, then the generic `Error` branch for everything else the project threw, then `ensureError` as the final catch-all for vendors that broke the rules.

- **One labeled `<AnnotatedCode>` block, four steps.** The lesson's payoff snippet. Use the `chargeInvoice` Server Action scenario from the opening so the scenario closes.

  ```ts
  // app/(app)/invoices/actions.ts
  export const chargeInvoice = async (invoiceId: string) => {
    try {
      await processCharge(invoiceId); // throws BillingError, rethrows Stripe ops errors
      return ok({ chargedAt: Temporal.Now.instant() });
    } catch (e) {
      if (e instanceof BillingError) {
        switch (e.code) {
          case 'card_declined':
            return err({ code: 'CARD_DECLINED', userMessage: 'Your card was declined.' });
          case 'insufficient_funds':
            return err({ code: 'INSUFFICIENT_FUNDS', userMessage: 'Not enough funds.' });
          case 'authentication_required':
            return err({ code: '3DS_REQUIRED', userMessage: 'Additional verification needed.' });
        }
      }
      if (e instanceof Error && e.name === 'AbortError') {
        return; // user navigated away — silent no-op
      }
      if (e instanceof Error) {
        throw e; // operational — let the framework boundary catch it
      }
      throw ensureError(e); // vendor threw something non-Error — normalize and rethrow
    }
  };
  ```

  Step 1 (highlight the `if (e instanceof BillingError) { switch ... }` lines, `color="blue"`): **Specific subclass first.** The `instanceof BillingError` narrow gives the typed `e.code` discriminant. The `switch` runs the per-code branches. The branch is the lesson's payoff: the catch converts the vendor's failure into a `Result.err` with a user-facing message and a stable code. Per-code branching at the seam, not at the UI. Note: the switch only covers the `BillingError` cases — anything else falls through to the next branches in the ladder.

  Step 2 (highlight the `if (e instanceof Error && e.name === 'AbortError')` line, `color="orange"`): **Cross-realm `name` check next.** `AbortError` may come from a different realm (an Edge middleware that cancelled, a worker that aborted) — the `error.name` string is the portable discriminant. The combined `instanceof Error && e.name === '...'` shape works inside the same realm; for true cross-realm code, swap `instanceof Error` for `Error.isError(e)`.

  Step 3 (highlight the `if (e instanceof Error) { throw e }` line, `color="violet"`): **Generic `Error` branch.** Everything that's an `Error` but isn't a `BillingError` and isn't an `AbortError` is operational — Stripe's API is down, the database is unreachable, an invariant tripped. Rethrow and let the framework boundary handle it. The boundary owns the user-vs-operator split (chapter 080).

  Step 4 (highlight `throw ensureError(e)`, `color="red"`): **`ensureError` as the catch-all.** If `e` isn't an `Error` at all — a third-party adapter threw a string — `ensureError` normalizes it. Then rethrow. Two things land at the boundary: a real `Error` instance (so the boundary's narrowing reads), and the original value preserved on `cause` (so the operator log can still see what came in).

- **One paragraph: order matters.** The ladder reads top to bottom because narrows get less specific. `instanceof BillingError` is the most specific; `instanceof Error` matches everything `BillingError` would have matched and more; `ensureError` matches *anything*. Putting `instanceof Error` before `instanceof BillingError` would swallow `BillingError`s into the generic branch and lose the discriminant. The trailing `ensureError` exists only for the "third party broke the rules" case; inside the project's own code, it would never fire.

- **A small note on what's *not* in the ladder.** `Error.isError()` is the cross-realm swap for `instanceof Error` — the writing agent can show a one-line alternate ladder if it feels natural, or skip and reference the earlier section. Don't double up.

### `AggregateError`, named once

Goal: name the catch shape for `Promise.any` rejections in one paragraph. Do not deep-dive.

Content:

- **One framing sentence.** Chapter 007 lesson 2 installed `Promise.any` as the "first to succeed" combinator. When *all* inputs reject, `Promise.any` rejects with an `AggregateError` carrying every individual rejection on an `errors` array.

- **The catch shape, one short `<Code>` block.**
  ```ts
  try {
    const winner = await Promise.any([fetchPrimary(), fetchSecondary(), fetchTertiary()]);
    return winner;
  } catch (e) {
    if (e instanceof AggregateError) {
      // e.errors is the array of all rejections — Error[] if every input obeyed the rule
      log.error('all sources failed', { errors: e.errors.map((err) => err.message) });
    }
    throw e;
  }
  ```
  Prose: "Narrow with `e instanceof AggregateError`. Read `e.errors` to decide on the response — log every rejection, surface a 'no sources available' message, or trigger a fallback. Each entry in `errors` is itself a value that the catch can narrow with the same ladder (specific subclass, `error.name`, generic `Error`). One paragraph because the substrate is from chapter 007; the discrimination is the new beat."

### `Error.message` is for operators

Goal: name the user-vs-operator audience split in one paragraph. Forward-link to chapter 080 lesson 2 for the deep treatment.

Content:

- **One framing sentence.** The `message` field on an `Error` is for *operators*, not users. It carries the technical detail the structured log needs — the SQL constraint name, the Stripe decline code, the Zod path, the request ID.

- **The split, one paragraph.** The user-facing message lives elsewhere — on the `Result.err.code` discriminant the UI maps to a translation key (or — at framework boundaries — on the `error.tsx` boundary's user-visible chrome). The rule, restated tight: **don't render `err.message` to users.** The technical detail leaks information and reads as gibberish; the localized, audience-appropriate message lives on the `code` the type system already forced the caller to inspect.

- **Forward-link, one sentence.** "Chapter 080 lesson 2 owns the two-audience split — the wrapper that produces the user-visible message from the `code` and the operator-visible log line from `err.message` + `err.cause`. Here, the rule is named so the student keeps `err.message` out of the UI from the start."

### Practice

Two exercises. The first checks discrimination (the cheapest read of "did the student internalize the ladder"). The second checks authoring (can the student write a custom subclass and the matching catch).

#### Exercise 1 — Review three broken catches

A `<CodeReview>` exercise. The student is given three catch blocks, each with one defect, and leaves inline review comments. The grader scores each against the issue's `kernel`.

Use one `<ReviewFile>` per defect (three tabs) so each block reads cleanly:

- **File 1: `lib/billing/charge.ts`** — unguarded `err.message`. The catch reads `err.message` without `instanceof Error`. The `kernel` is "unguarded err.message — catch parameter is `unknown`, needs `instanceof Error` narrow first."
  ```ts
  try {
    await stripe.charges.create({ amount });
  } catch (err) {
    log.error(err.message); // err is unknown
    throw err;
  }
  ```
  `<ReviewIssue>` slot reveal: "Same trap lesson 1 named. `err` is typed `unknown` — `err.message` is a compile error. Narrow with `if (err instanceof Error)` first, or normalize with `ensureError` and read from the normalized value."

- **File 2: `app/workers/import-csv.ts`** — `instanceof Error` across a worker boundary. A Web Worker throws; the main thread catches and narrows with `instanceof Error` which returns `false` because the realms hold different `Error` constructors. The `kernel` is "`instanceof Error` fails across realms — use `Error.isError()` or check `err.name`."
  ```ts
  worker.addEventListener('error', (event) => {
    if (event.error instanceof Error) {
      // never true — worker's Error ≠ main thread's Error
      handleError(event.error);
    }
  });
  ```
  `<ReviewIssue>` slot reveal: "Web Workers run in a separate realm with their own `Error` constructor. Use `Error.isError(event.error)` for the cross-realm-safe narrow, or fall back to `typeof event.error === 'object' && event.error?.name === 'CSVParseError'` if `Error.isError` isn't available."

- **File 3: `lib/storage/upload.ts`** — missing `ensureError` at a vendor seam. The catch wraps an SDK call that may throw a string, but the catch assumes `Error`. The `kernel` is "vendor SDK may throw non-Error — wrap with `ensureError` before reading."
  ```ts
  try {
    await legacyS3SDK.upload({ key, body }); // SDK throws strings on auth failures
  } catch (err) {
    log.error('upload failed', { message: err.message }); // err might be a string
    throw err;
  }
  ```
  `<ReviewIssue>` slot reveal: "This SDK is known to throw strings on certain failure modes. Wrap with `const error = ensureError(err); log.error('upload failed', { message: error.message }); throw error;` — the normalizer guarantees an `Error` instance so the rest of the catch is safe."

Add a `<ReviewWhy>` at the end: "The three defects map to the lesson's first three sections — narrow before reading, realm-safe narrows when realms are involved, and `ensureError` at vendor seams. The canonical ladder section put them in order; this drill checks you can spot them out of order."

Pedagogical note for the writing agent: the `kernel` strings are what the AI grader reads — keep each kernel as a single sentence naming the defect, not a paragraph. The slot text is the reveal.

#### Exercise 2 — Author a `RateLimitError` and catch it

A `<ScriptCoding>` exercise (Sandpack runner — needs `class extends Error` and TypeScript syntax). The student authors a `RateLimitError` subclass with the literal `name`, a `retryAfter` field, and `{ cause }` passthrough, then writes the catch that discriminates it from `BillingError` and a generic `Error`.

- **Starter** (the writing agent fills in the imports and detail):
  ```ts
  // Author RateLimitError as a small custom Error subclass.
  // Required shape:
  //   - extends Error directly (no abstract base)
  //   - readonly name = 'RateLimitError' as const
  //   - readonly retryAfter: number (seconds until retry is allowed)
  //   - constructor accepts (retryAfter, message, options?: { cause?: unknown })
  //     and passes options through to super(message, options)

  export class RateLimitError extends Error {
    // your code here
  }

  // Write a catch that discriminates RateLimitError from a generic Error.
  // - If it's a RateLimitError, return { ok: false, retryAfter: e.retryAfter }
  // - Otherwise, rethrow.

  export const callApi = async (fn: () => Promise<unknown>): Promise<{ ok: true } | { ok: false; retryAfter: number }> => {
    try {
      await fn();
      return { ok: true };
    } catch (e) {
      // your code here
    }
  };
  ```

- **Tests** (Sandpack runner, jest-flavoured assertions):
  ```ts
  test('RateLimitError carries a literal name', () => {
    const e = new RateLimitError(30, 'too many requests');
    expect(e.name).toBe('RateLimitError');
  });

  test('RateLimitError carries retryAfter', () => {
    const e = new RateLimitError(30, 'too many requests');
    expect(e.retryAfter).toBe(30);
  });

  test('RateLimitError preserves cause', () => {
    const original = new Error('429');
    const e = new RateLimitError(30, 'too many requests', { cause: original });
    expect(e.cause).toBe(original);
  });

  test('callApi returns retryAfter on RateLimitError', async () => {
    const result = await callApi(async () => {
      throw new RateLimitError(45, 'slow down');
    });
    expect(result).toEqual({ ok: false, retryAfter: 45 });
  });

  test('callApi rethrows generic Error', async () => {
    await expect(
      callApi(async () => {
        throw new Error('network down');
      }),
    ).rejects.toThrow('network down');
  });
  ```

  Use `runner="sandpack"` because the exercise needs `class extends Error` syntax and TypeScript field declarations. The vanilla runner would refuse the TS.

  Optional `instructions`: `"Author the RateLimitError class with a literal-typed name, a retryAfter field, and a {cause} passthrough. Then write the catch that discriminates it."`

Pedagogical note for the writing agent: the canonical solution (revealed in a `<details>` collapsible after the exercise) should mirror the four senior moves named in the lesson — `extends Error` directly, `readonly name = '...' as const`, typed `retryAfter`, `super(message, options)` for the cause passthrough.

### Closing

One short paragraph that returns to the opening scenario and ties off.

- Restate: the `unknown` catch is a discrimination ladder. **Narrow with `instanceof Error`** (or `Error.isError()` across realms), **discriminate with `error.name`** for cross-realm or cross-module errors, **normalize with `ensureError`** at vendor seams, and **walk `Error.cause`** when the structured log needs the chain. Custom subclasses pin a literal-typed `name` and structured fields so the catch reads tagged data, not parsed strings.
- Forward, one sentence: "Chapter 008 closes here. Chapter 080 lesson 2 turns the `err.message`-is-for-operators rule into the wrapper that produces user-visible and operator-visible audiences from one throw. Chapter 092 turns the `Error.cause` walker into the structured-log pipeline."

### External resources

`CardGrid` with two `ExternalResource` cards. Keep tight.

- **MDN — `Error.cause`** (`https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause`). The canonical reference for the `cause` field, the constructor options shape, and the chain semantics.
- **TC39 — `Error.isError`** (`https://github.com/tc39/proposal-is-error`). The proposal page for the Stage 4 (ES2026) cross-realm check. Useful for the student who wants to see the rationale.

Optional: a `<VideoCallout>` only if the writing agent finds a 2024+ talk that lands at the lesson's altitude (custom Error subclasses + `Error.cause` + cross-realm narrows). If nothing clean exists, skip — the lesson's altitude is decisional and the snippets carry the weight.

## Components, diagrams, exercises — summary roll-up

- **Code blocks.** Plain `<Code>` for the rewrap pattern, the `ensureError` shape, the chain-walker, the `AggregateError` catch, and the `error.name` site snippets. `<AnnotatedCode>` for the `BillingError` class shape (4 steps, mixed colors) and the canonical catch ladder (4 steps, mixed colors). `<CodeVariants>` twice — `instanceof Error` wrong/right (2 tabs, `syncKey="catch-narrow"`) and `error.name` sites (2 tabs, `syncKey="error-name-sites"`). No `<CodeTooltips>` needed — definitions land in prose or `<Term>` tooltips.
- **Diagrams.** One `<Figure>` for the realm-boundary illustration (left panel: main thread, right panel: worker thread, one arrow between). Prefer plain HTML+CSS two-panel illustration over `<ArrowDiagram>` — the figure carries one boundary line and one label, which doesn't justify leader-line overhead. The pedagogical goal is to show realms are *structural*, not niche. If the writing agent finds `<ArrowDiagram>` more natural, that's also fine — set `expandable={false}` on the `<Figure>` if so.
- **No custom component required.** The lesson is snippet-heavy and reasoning-heavy; no widget needs building. (The realm diagram is small enough to author inline.) The writing agent may build a single small `.astro` component for the realm illustration at `src/components/lessons/008/2/RealmBoundary.astro` if it improves authorship clarity — it's not required.
- **Exercises.** One `<CodeReview>` exercise (three broken catch blocks across three files) and one `<ScriptCoding>` exercise (author `RateLimitError` + discriminating catch). The `CodeReview` is the discrimination drill; the `ScriptCoding` is the authoring drill.
- **Tooltips (`<Term>`).** *narrow* (in the `instanceof Error` section), *realm* (in the `Error.isError()` section), *literal type* (in the custom-subclass section). Three tooltips, all introduced in the lesson's first half. Recall *unhandled rejection* from chapter 007 and *unknown* / *framework boundary* from lesson 1 — use plain inline mentions if the prior definition carries forward; otherwise re-tooltip lightly.
- **Video.** None planned. Lesson's altitude is pattern + reasoning; a video would dilute.

## Scope

What this lesson does **not** cover:

- **The two-audiences user-vs-operator split at depth.** Chapter 080 lesson 2 owns the wrapper that produces both messages from one throw. This lesson names the rule (`err.message` is for operators) but does not build the wrapper.
- **The framework-boundary catch and the `error.tsx` React boundary.** Chapter 080 lesson 3 + Unit 4 React error boundaries. This lesson assumes the throw goes *somewhere*; that somewhere is not authored here.
- **Logging-framework wiring (`pino`, Sentry).** Chapter 092. The lesson uses a hypothetical `log` object as a placeholder.
- **The wire format for thrown errors that cross the network (RFC 9457 Problem Details).** Chapter 011 lesson 2 and chapter 046 lesson 2. Throws on the server become an HTTP error response on the wire — that's a different lesson.
- **Sourcemaps for production stack traces.** Chapter 092.
- **Async stack traces under Node.** `--async-stack-traces` is on by default in Node 22+; name once in passing only if a snippet's stack trace would be misleading without it. No deep treatment.
- **Custom `Symbol.for('nodejs.util.inspect.custom')` for pretty-printing in the REPL.** Niche.
- **Re-throwing with `Error.captureStackTrace` for vendor SDKs that lose traces.** Out of scope.
- **`neverthrow`, `effect`, `fp-ts`, or any other Result / error-handling library.** The course rolls its own.
- **The `Result<T, E>` shape.** Lesson 1 of chapter 008 owns it. This lesson uses it inline in the canonical ladder (`return err({ code: 'CARD_DECLINED', ... })`) without re-teaching.
- **The channel-routing decision.** Lesson 1 of chapter 008 owns it. This lesson assumes the throw decision is already made; the question is how to read the catch.
- **Refusal-as-error-discipline at the gate.** Chapter 080 lesson 1.

## Code conventions alignment

Skimming the relevant sections of `Code conventions.md` (TypeScript, Function form, Error handling):

- **TypeScript.** Snippets are `.ts` shape. `strict: true` assumed throughout. The `useUnknownInCatchVariables` flag is the load-bearing fact, recalled from lesson 1. The custom `BillingError` class uses `readonly` fields and `as const` to pin the literal type — matches the convention.
- **Function form.** Arrow functions bound to `const` for every helper (`ensureError`, `callApi`). `class` for the custom error subclasses — the only `class` reach in chapter 008. No `function` keyword.
- **Error handling section of conventions.** This lesson lands the *narrowing and authoring* half of the section. Match the convention shape: `Result<T, E>` with `value`/`error` fields (carried forward from lesson 1); custom `Error` subclasses with literal-typed `name`; `Error.cause` for wrap-and-rethrow; `ensureError` in `/lib/errors.ts`. The conventions doc names "custom error classes for domain failures live next to where they're thrown" — the lesson softens to "live at `/lib/errors.ts` next to the `Result` helpers" because the chapter is teaching the substrate, and the per-feature placement lands in chapter 080. Note this in passing.
- **Naming.** `BillingError`, `RateLimitError`, `TenancyError` — PascalCase, matches the convention. `ensureError`, `callApi`, `chargeInvoice` — camelCase, verb-led. The exception-rule of `catch (e)` in the rewrap-at-the-seam snippet (lesson 1's continuity note carries forward) avoids shadowing the `err` factory helper.

Pedagogical divergences from conventions:

- The lesson uses `e` (not `err`) in catch blocks that contain an `err(...)` factory call, matching the lesson-1 continuity note. Other catches use `err` for readability.
- Some snippets use placeholders (`processCharge(invoiceId)`, `legacyS3SDK.upload`) where production code would have full implementations. The lesson is about narrowing and authoring shapes, not implementing Stripe handlers — keep snippets terse.
- The `log` placeholder (lesson 1 continuity note carries forward) is used in catch examples. Production wiring lands in chapter 092.
- The `Temporal.Now.instant()` reach in the canonical ladder's `ok(...)` return is technically forward-referencing chapter 009's Temporal lesson. The writing agent should either replace with a plain `Date.now()` placeholder or accept the forward reference as a one-line gesture. Prefer the latter — `Temporal` is the project default.

## Estimated student time

45 to 55 minutes (matches the chapter outline estimate). The opening scenario and the canonical catch ladder are the time sinks; the smaller mechanics (`ensureError`, `AggregateError`, `error.name`) move quickly. The two exercises (CodeReview + ScriptCoding) add another 12–18 minutes of practice.
