# Lesson 1 — Two channels: throw the unexpected, return the expected

## Title and sidebar

- **Title (h1):** Two channels: throw the unexpected, return the expected
- **Sidebar label:** Two error channels

The chapter-outline title is load-bearing — it names the chapter's central decision and the lesson's reading reflex in one phrase. Keep verbatim.

## Lesson framing

This lesson is a **Decision archetype**. The lesson teaches a decision (which channel does a failure ride?) and the small set of mechanics needed to ride either channel — `try`/`catch`/`finally` shape, the async-throw flow, the "only throw `Error`" rule, and the `Result<T, E>` shape. **The decision is the lesson; the mechanics serve the decision.**

Pedagogical conclusions from brainstorming:

- **Lead with the senior question, refuse to answer until both channels exist.** Open with `parseInvoiceCsv(file)` and its four failure modes (empty file, malformed row, out-of-range column, disk read error). State the four modes; do not write the signature. The student should feel the routing question before any mechanics land. The signature is what the lesson is heading toward — keep it as the payoff that arrives in the `Result<T, E>` section.
- **The decision is one question.** "Can the caller do something *different* per case?" If yes → return (`Result`). If no → throw. State this rule once, then use it consistently across the lesson, the exercises, and every example.
- **The mental model is two channels with two homes.** Returns flow up the call chain into specific business logic that branches. Throws bubble past every catch-less frame until a framework boundary catches them. The student should leave with a clear picture: which channel each failure type travels through, and where each channel terminates. A one-figure diagram (two-lane illustration) anchors this image once and is referred back to.
- **Mechanics are deliberately compact.** `try`/`catch`/`finally` syntax, async-throw, "only throw `Error`", and `Result<T, E>` are the four mechanics this lesson needs. Each gets one small snippet. No deep dive — narrowing is L2's payload, custom error classes are L2's payload, framework boundaries are Unit 9's payload. This lesson stops at "the catch parameter is `unknown` — accessing `err.message` is a compile error" and explicitly forward-links L2 for the narrow.
- **The "only throw `Error`" rule earns one wrong-then-right snippet.** Show `throw 'oh no'`, name the three downsides (no `instanceof Error` narrow, no stack trace, every catch becomes a type-check chore), then the right shape `throw new Error('...')`. Quick and decisive.
- **`Result<T, E>` is the lesson's structural payoff.** This is where lesson 1 of chapter 005 (discriminated unions) gets applied to async returns. Show the shape, the `ok`/`err` helpers with `never` on the absent side, and one call site that `switch`es on `error.code` with a forward-link to lesson 3 of chapter 005's `assertNever`. Make the connection to the prior chapter explicit — the student has the structural tool already, this lesson teaches *when* to reach for it.
- **The async-throw flow is short but critical.** Three consequences in three short snippets: `try`/`catch` around `await` catches the rejection; un-awaited `async` calls escape; `return await` inside `try` is mandatory. The last two come pre-installed from chapter 007 lesson 3 — name them as the catch-up reinforcement, do not re-teach. The first is the new beat: a rejected Promise is *the* throw at the `await` site.
- **The catch placement reflex closes the channel-decision loop.** Two right places (framework boundary for unexpected; call site to convert vendor shape into `Result.err`) and one anti-pattern (catch-and-log-and-continue with no remediation). The placement decision is the *companion* to the channel decision — together they're the senior's full reading reflex.
- **Practice both halves with one exercise each.** A `Buckets` exercise routes eight realistic SaaS failures into the right channel — this is the canonical channel-decision drill named in the chapter outline. A `ScriptCoding` exercise has the student refactor a function that throws validation errors into one that returns `Result<T, E>` — this is the structural payoff in practice.
- **Forward-link aggressively, never re-teach.** L2 owns narrowing, custom error classes, `Error.cause`, `ensureError`. Chapter 080 owns the framework-boundary catch. Lesson 3 of chapter 043 locks `Result` into Server Actions. Lesson 2 of chapter 011 / lesson 2 of chapter 046 own RFC 9457 Problem Details. Name each forward-link in one sentence at the moment the lesson would have gone deeper.
- **Beginners' biggest trap: throwing for everything.** The junior shape — `throw new Error('Row out of range at line 7')` for *every* failure mode — feels like the right move because it's the language's default mechanic. The senior reframing is that the throw channel is too coarse: the caller cannot branch on the cause, so the caller wraps the whole thing in `try`/`catch` and renders "something went wrong." Name this anti-pattern explicitly so the student carries the reframing forward.
- **Beginners' second trap: `Result<T, E>` for everything.** Symmetrically, overuse of `Result` lands in the return channel things that have no per-case caller response (`{ ok: false; error: 'DATABASE_DOWN' }` — what does the caller do? log and re-render the same way as any other unexpected failure). Name the overuse trap once in the `Result` section.

## Lesson sections

### Opening (no h2 — intro paragraphs only)

Two short paragraphs.

- **The senior question.** Frame the lesson's central scenario in prose: `parseInvoiceCsv(file)` can fail four ways — the file is empty, a row is malformed, a column exceeds the numeric range, the disk read itself errors. Refuse to write the signature. State: "A junior writes `throw new Error(...)` for all four. A senior reads each case and asks one question — *can the caller do something different per case?* — and that question splits the four failures into two channels." Tell the student they will end the lesson with the answer to that signature and a reading reflex they can apply to every failure they meet from here on.

  No code block — the signature is the payoff. Keep this a prose-only opener.

- **Chapter framing in one sentence.** Chapter 008 installs the error channel as a first-class design decision. This lesson teaches *the channel decision* and the minimum mechanics to ride either channel. Lesson 2 of chapter 008 owns reading errors inside the catch (narrowing, custom error classes, `Error.cause`); together they're the language-level substrate every Unit 6+ chapter rides on.

### The two channels

The first technical beat. Goal: install the channel split as named furniture before any mechanics land.

Content:

- **One framing sentence.** Every failure rides one of two channels. Returns travel up the call chain through normal control flow; throws bubble past every catch-less frame until something catches them.
- **The comparison.** Author this as a **two-pane `<TabbedContent>`** (or — preferred — a small HTML+CSS two-column table inside `<Figure>`), not as paragraphs. Four rows: *what it carries*, *who handles it*, *canonical site*, *example*. The visual side-by-side is load-bearing — the student should see the parallel structure of the two channels at a glance.

  | | Return the expected | Throw the unexpected |
  | --- | --- | --- |
  | What it carries | A failure the caller is expected to handle as part of normal flow — validation, business-rule rejection, "not found" for an optional lookup, conflict, rate-limited | An operational failure the caller cannot reasonably recover from inside its own logic — database down, request canceled, invariant violated, disk full |
  | Who handles it | The immediate caller branches on `error.code` and renders a different message, retries, or falls back | A framework boundary — `error.tsx`, the route handler's catch, the action wrapper — decides on the user-visible response |
  | Canonical site | `Result<T, E>` discriminated union return shape | `throw new Error(...)` (or a custom `Error` subclass — L2) |
  | Example | `parseInvoiceCsv` returns `Result.err({ code: 'OUT_OF_RANGE', ... })` for a row whose total exceeds the column's max | `parseInvoiceCsv` throws when the disk read fails — no caller of `parseInvoiceCsv` can do anything different about a missing file |

  The figure component choice is `<Figure>` wrapping a plain HTML two-column table. Use semantic `<table>` with `<thead>` row labels for the rightmost cells if the writing agent prefers; the goal is parallel side-by-side rendering, not just markdown's stacked rows.

- **The one-question heuristic.** State it verbatim and bold it: **"Can the caller reasonably do something different per case?"** If yes, the cause is part of the contract — return. If no, the cause is operational — throw.

  Two short follow-ups:
  - *Yes, the caller branches on the cause.* The discriminant in `error.code` lets the caller render a different message, retry with different inputs, or fall back to a different path. Return.
  - *No, the caller would log-and-rethrow or display "something went wrong."* The framework boundary handles the chrome. Throw.

- **The `parseInvoiceCsv` answer, finally.** Apply the heuristic to the opener's four failure modes:
  - **Empty file** → the caller renders "this file has no invoices, please check and re-upload" differently from a malformed row → **return** (`{ code: 'EMPTY' }`).
  - **Malformed row** → the caller can highlight the specific row to the user → **return** (`{ code: 'INVALID_ROW', row: number }`).
  - **Out-of-range column** → the caller can highlight the specific column → **return** (`{ code: 'OUT_OF_RANGE', column: string }`).
  - **Disk read failed** → no caller of `parseInvoiceCsv` has a recovery path different from "show the global error toast" → **throw**.

  Frame this as a small bulleted "applying the heuristic" beat, not a section of its own. The signature itself doesn't land yet — that's the `Result<T, E>` section's payoff.

`<Term>` candidates introduced in this section:
- *throw* — "A `throw` statement bubbles a value up the call stack, past every frame that doesn't catch it, until either a `try`/`catch` block catches it or the program crashes."
- *framework boundary* — "The catch site at the edge of the framework's request lifecycle — `error.tsx`, the route handler's catch, the Server Action wrapper. The buck stops here; the boundary decides on the user-visible response."

No tooltip for *Result* — define it in prose in the `Result<T, E>` section since the lesson is explicitly installing the shape there.

### `try`/`catch`/`finally` mechanics

The mechanics beat for the throw channel's *handling* side. Goal: name each piece, mark the strict-mode `unknown` catch type, and install the `finally`-is-for-side-effects discipline.

Content:

- **One framing sentence.** A `try` block guards a section of code; if anything inside throws, control jumps to `catch`; `finally` runs whatever happened.
- **One labeled `<AnnotatedCode>` walkthrough** of a small canonical snippet that exercises all three. Three steps total — each step highlights one of `try` / `catch (err)` / `finally`. Keep the snippet under 12 lines.

  ```ts
  const closeStaleSessions = async (orgId: string) => {
    const connection = await pool.acquire();
    try {
      const stale = await connection.query(/* ... */);
      await connection.execute(/* ... */);
      return stale.length;
    } catch (err) {
      // err is typed `unknown` — accessing err.message here is a compile error
      log.error('closeStaleSessions failed', { orgId });
      throw err;
    } finally {
      connection.release();
    }
  };
  ```

  Step 1 (highlight `try { ... }` lines): The guarded block. Any synchronous throw inside, or any rejection from an `await`ed Promise, jumps to `catch`. Throws from nested `async` calls that aren't awaited do **not** — they escape as unhandled rejections (L4 of chapter 007).

  Step 2 (highlight `catch (err) { ... }`, color `red` or `orange` to mark the compile error): `err` is typed `unknown` under `strict` (TypeScript's `useUnknownInCatchVariables` flag is on by default when `strict: true`). The comment is the load-bearing pedagogical mark — the student should leave knowing `err.message` does not compile yet. Forward-link in the step prose: "Lesson 2 of chapter 008 owns the narrow that unlocks `err.message`; for now, the rule is that the catch type is `unknown` and the compiler enforces it." Use `color="orange"` on this step.

  Step 3 (highlight `finally { ... }` line, color `green`): Runs whether `try` completed normally or `catch` ran. Canonical reach: release a connection, abort a controller on shutdown, increment a counter. The watch-out goes in the step prose: a `return` or `throw` from inside `finally` *overrides* the `try`/`catch` outcome — so `finally` is for side effects, **not control flow**.

- **The bare `catch` shape, in one paragraph.** `try { ... } catch { ... }` with no parameter is legal and the right reach when the catch genuinely doesn't read the error. Show the one-line shape (use a plain `Code` block):

  ```ts
  try { await logEvent(event); } catch { /* swallow — logging is fire-and-forget */ }
  ```

  Frame this as the carve-out for fire-and-forget cleanup — *not* as a general escape from the `unknown` typing. The shape is honest: the catch isn't going to read the error because there's nothing to do with it.

- **The async-throw flow, three short snippets.** This is the bridge between the synchronous mechanics above and the async substrate the student already knows from chapter 007. Use a single `<CodeVariants>` block (three tabs, `syncKey="async-throw"`).

  - **Tab 1: `await` inside `try` catches the rejection.** Mark the `try`/`catch` lines green.
    ```ts
    try {
      const invoice = await fetchInvoice(id);
      return invoice;
    } catch (err) {
      // err is unknown — the rejection from fetchInvoice lands here
    }
    ```
    Prose: "The senior takeaway in one line: **a rejected Promise becomes a throw at the `await` site.** Synchronous catch rules apply." Use `<div data-mark-color="green">` wrapper.

  - **Tab 2: un-awaited `async` call escapes the catch.** Mark the bug line red (`del` or `data-mark-color="red"`).
    ```ts
    try {
      fetchInvoice(id); // missing await — the rejection escapes as an unhandled rejection
    } catch (err) {
      // never runs — the catch sees nothing
    }
    ```
    Prose: "No `await`, no catch. The Promise rejects after the `try` block has already exited. The rejection becomes an unhandled rejection — the process logs it, and in Node 24+ defaults the process exits non-zero. Chapter 007 lesson 3 named the fix: `void fetchInvoice(id).catch((err) => log.error(err))`." Use `<div data-mark-color="red">` wrapper.

  - **Tab 3: `return await` inside `try` is mandatory.** Mark the wrong vs. right shapes with `del`/`ins`.
    ```ts
    // wrong — `return getInvoice(id)` returns the promise to the caller; the catch never sees the rejection
    try {
      return getInvoice(id);
    } catch (err) {
      // never runs
    }

    // right — `return await` keeps the function on the stack until the promise settles
    try {
      return await getInvoice(id);
    } catch (err) {
      // catches rejection
    }
    ```
    Prose: "Inside a `try`, the function must stay on the stack to catch the rejection. `return await` is the discipline — chapter 007 lesson 3 named it; this is where the discipline pays off." Use `<div data-mark-color="orange">`.

  The writing agent should *not* deep-dive these — they are 1-paragraph beats each. The substrate is from chapter 007; the lesson here is naming the rejection-as-throw-at-await-site link.

`<Term>` candidates in this section:
- *unhandled rejection* — "A rejected Promise with no `.catch`, no `await` inside a `try`/`catch`, and no combinator handling the rejection branch. In modern Node, this terminates the process by default."

### The "only throw `Error`" rule

Goal: install one project-wide rule. One wrong-then-right snippet, three reasons, and the forward-link to L2's `ensureError`.

Content:

- **The rule, stated.** **The throwable is always an `Error` instance (or a subclass).** JavaScript permits `throw 'something went wrong'` and `throw { code: 'BILLING' }` — both are footguns the project never reaches for.

- **One `<CodeVariants>` with two tabs (`syncKey="throw-shape"`).**
  - **Tab 1: wrong.** `data-mark-color="red"`.
    ```ts
    if (!total) throw 'missing total'; // string thrown — every catch becomes a type-check chore
    if (status === 'void') throw { code: 'VOID_INVOICE' }; // plain object — no stack trace
    ```
  - **Tab 2: right.** `data-mark-color="green"`.
    ```ts
    if (!total) throw new Error('missing total');
    // for domain failures with structure, reach for a custom Error subclass — lesson 2 of chapter 008
    ```

- **Three reasons, named tight.** Use a small bulleted list, not a section.
  - **Predictable catch shape.** `instanceof Error` narrows `err` to a known surface (`message`, `name`, `stack`, `cause`). Throwing a string forces every catch site to type-check the value.
  - **Stack traces.** Only `Error` instances carry a `stack`. Throwing a plain object means the failure point isn't recoverable from the trace alone.
  - **The `ensureError` normalizer (L2).** A small helper exists specifically to recover from third-party code that breaks this rule. Inside the course's own code, the rule is absolute.

  One sentence forward-link to L2: "When you author a domain error class — `BillingError`, `RateLimitError` — the class extends `Error` and the rule still holds. L2 of this chapter walks the shape."

### The `Result<T, E>` shape

Goal: install the return-channel shape, connect it to lesson 1 of chapter 005's discriminated unions, and forward-link lesson 3 of chapter 043 where it locks into Server Actions.

Content:

- **One framing sentence.** When the failure rides the return channel, the shape is a discriminated union the type system forces the caller to inspect.

- **The canonical shape, one labeled `<AnnotatedCode>` block, three steps.**

  ```ts
  // lib/result.ts
  export type Result<T, E> =
    | { ok: true; value: T }
    | { ok: false; error: E };

  export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
  export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
  ```

  Step 1 (highlight the `type Result<T, E>` lines, `color="blue"`): The shape from lesson 1 of chapter 005 applied to async returns. Boolean `ok` is the discriminant; `value` lives on the success variant, `error` on the failure variant. Each variant carries only the field that's valid for its state — the impossible-state principle from chapter 005.

  Step 2 (highlight the `ok = ...` helper, `color="green"`): A factory that builds the success variant. The return type is `Result<T, never>` — the `never` on the absent side is what makes this narrow correctly when assigned into a `Result<T, E>` slot. The caller's discriminant check on `ok === true` peels off the right variant.

  Step 3 (highlight the `err = ...` helper, `color="red"`): The mirror factory. `Result<never, E>` lets it land in any `Result<T, E>` slot regardless of the `T`. Together, `ok` and `err` are the only two ways the project constructs a `Result`.

  Pedagogical note for the writing agent: This is the exact shape the project's `lib/result.ts` will export and lock in. Use `value`/`error` as the field names (matching the chapter-outline shape and the rest of chapter 008). Do not write `data` — the older shape from lesson 1 of chapter 005's pedagogical introduction was `{ ok; data; error: { code; userMessage } }`; **this lesson's `Result<T, E>` is the cleaner generic shape** that chapter 008 establishes. Note this carve-out explicitly so the writing agent doesn't re-use the L1 shape.

- **The `E` channel is a discriminated union.** Once the shape lands, one short snippet shows what `E` looks like in practice — the `parseInvoiceCsv` answer the opener has been heading toward.

  Plain `<Code>` block:

  ```ts
  type ParseError =
    | { code: 'EMPTY' }
    | { code: 'INVALID_ROW'; row: number }
    | { code: 'OUT_OF_RANGE'; column: string };

  const parseInvoiceCsv = async (file: File): Promise<Result<Invoice[], ParseError>> => {
    // ... can throw on disk read errors; returns ok(invoices) or err({ code: '...' })
  };
  ```

  One paragraph: "`E` is *itself* a discriminated union — each tag carries the data the caller needs to render a different message or retry differently. The point of `Result` is not 'return an error string'; it is 'return a *structured*, *tagged* failure the type system makes the caller inspect.' The disk-read failure is absent from `ParseError` — it rides the throw channel."

- **The call site, with exhaustiveness.** One short `<Code>` snippet showing the caller's `switch` on `result.error.code` and the `assertNever(result.error)` floor at the bottom (forward link to lesson 3 of chapter 005):

  ```ts
  const result = await parseInvoiceCsv(file);
  if (result.ok) {
    return showInvoices(result.value);
  }
  switch (result.error.code) {
    case 'EMPTY':
      return showEmptyMessage();
    case 'INVALID_ROW':
      return highlightRow(result.error.row);
    case 'OUT_OF_RANGE':
      return highlightColumn(result.error.column);
    default:
      return assertNever(result.error);
  }
  ```

  One paragraph: "The caller branches on the discriminant; `assertNever` makes adding a new `code` a compile error at every consumer until exhaustively handled. The compiler is the contract." This is exactly the payoff lesson 3 of chapter 005 set up.

- **The overuse trap, one paragraph.** State the trap: `Result<T, E>` for *every* failure is overuse. A function that returns `Result<T, 'DATABASE_DOWN' | 'TIMEOUT' | 'INVALID'>` is doing operator-error reporting in the return channel — those belong in throws. The rule restated: **expected, *and* the caller branches.** Both conditions, or it's a throw.

- **Forward links, one sentence each.**
  - "Lesson 3 of chapter 043 locks the `Result<T, E>` shape into Server Actions — every form action returns this shape; the form-side `useActionState` reads `result.ok` to render success or error."
  - "Lesson 2 of chapter 011 and lesson 2 of chapter 046 own the *wire shape* for thrown errors that cross the network — RFC 9457 Problem Details. Throws on the server become an HTTP error response on the client; `Result` rides inside the response body for the expected failures."

`<Term>` candidates in this section:
- *Result* — "A discriminated union return shape — `{ ok: true; value: T } | { ok: false; error: E }` — that forces the caller to check the `ok` discriminant before reading either field. The course's return-channel error shape."
- *`assertNever`* — Don't define here; the term is from lesson 3 of chapter 005 and is recalled, not introduced. Use plain inline code or — if needed — a `<Term>` recalling the lesson 3 definition verbatim. The writing agent should check if the L3 definition tooltip carries forward; if so, reuse it.

### Where the catch lives

Goal: install the placement reflex as the companion to the channel decision. Two right places, one anti-pattern.

Content:

- **One framing sentence.** The channel decision tells you whether to throw or return; the placement reflex tells you *where* the catch lives.

- **Two right places.**
  - **At the framework boundary, for unexpected throws.** Server Actions, route handlers, page-level loaders, and the `error.tsx` boundary catch the throws that escaped business code. The audit log and the user-vs-operator message split land there. **Unit 9 chapter 080 owns the deep treatment** — name in one line, do not preview the wrappers.
  - **At a call site that has a non-throw alternative.** A `try`/`catch` that wraps a third-party SDK call to translate a vendor-shaped throw into a domain `Result.err(...)`. The catch *converts* the channel — vendor's throw becomes the project's return.

- **The anti-pattern, named once.** A `try`/`catch` that logs and continues with no remediation — neither converts the channel nor lets the boundary handle it. Code-review failure shape. Either:
  - The failure is recoverable (the catch should convert to `Result.err`, *not* log-and-continue), or
  - The failure isn't recoverable (the catch shouldn't exist; let the boundary catch it).

  One short `<CodeVariants>` (`syncKey="catch-placement"`) with two tabs:

  - **Tab 1: anti-pattern.** `data-mark-color="red"`.
    ```ts
    try {
      await chargeInvoice(invoiceId);
    } catch (err) {
      log.error('charge failed', { invoiceId, err }); // logs and continues — the caller still thinks the charge succeeded
    }
    return ok(invoice);
    ```
  - **Tab 2: converted.** `data-mark-color="green"`.
    ```ts
    try {
      await chargeInvoice(invoiceId);
      return ok(invoice);
    } catch (err) {
      // vendor's throw becomes our Result.err — the caller can branch on `card_declined`
      if (err instanceof Stripe.errors.StripeCardError) {
        return err({ code: 'CARD_DECLINED', userMessage: 'Your card was declined.' });
      }
      throw err; // operational — let the boundary catch it
    }
    ```

  Note for the writing agent: the second tab previews L2's narrowing (`instanceof`) — that's fine here as a forward-link demonstration; do *not* deep-dive the narrow. The point is to show the *shape* of the conversion, not the narrow's mechanics.

### Practice

Two exercises, in this order. The first checks the channel decision (the lesson's center of gravity); the second checks the structural payoff (`Result<T, E>` in code).

#### Exercise 1 — Route each failure

A `<Buckets>` exercise (canonical for this lesson per chapter outline). Two columns, two buckets:

- **Bucket A:** `Return — Result<T, E>` (description: "The caller branches on the cause")
- **Bucket B:** `Throw — let the boundary catch` (description: "The caller cannot reasonably recover per-case")

Eight items, drawn from the chapter outline's scenario list, all realistic 2026 SaaS shapes. The writing agent should verify the verdict on each (the channel-decision rule is the grader):

1. **"CSV row out of range during invoice import"** → Return. The caller can highlight the specific row and column for the user to fix.
2. **"Postgres connection refused"** → Throw. No caller of `parseInvoiceCsv` has a per-case recovery for a missing database; framework boundary shows "something went wrong."
3. **"Stripe API key rotated mid-request"** → Throw. Operator alarm, not a per-call user remediation.
4. **"User submitted a duplicate email at sign-up"** → Return. The form shows "this email is already registered" — per-case message.
5. **"S3 (or R2) returned 503"** → Throw. Retriable at the boundary or surfaced as a generic error; no per-case caller branch.
6. **"Zod parse failed on form input"** → Return. The form shows per-field errors; the user fixes and resubmits.
7. **"Invariant violated: tenant ID mismatch between session and resource"** → Throw. Programmer error or security event; the boundary handles it; the user sees a generic message.
8. **"OAuth provider returned an unknown error code"** → Throw. Operational — the user cannot fix it; the boundary surfaces a sign-in retry. *(Note: borderline case; the writing agent should ensure the grading aligns with the "can the caller do something different *per case*?" heuristic — since "unknown" by definition has no per-case branch, throw is correct.)*

Use `twoCol` layout. Instructions prop: `"Sort each failure into the channel a senior would route it through. Apply the 'can the caller do something different per case?' heuristic."`

#### Exercise 2 — Refactor throws to `Result<T, E>`

A `<ScriptCoding>` exercise (vanilla runner — pure TS). The student takes a function that throws for every validation error and rewrites it to return `Result<T, E>` with a tagged-union `E`.

- **Starter** (the writing agent fills in details; rough shape):

  ```ts
  type User = { id: string; email: string; age: number };

  type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
  const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
  const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

  // Rewrite this function so it returns Result<User, ParseError>
  // ParseError should be a discriminated union of two cases:
  //   - { code: 'INVALID_EMAIL' }
  //   - { code: 'INVALID_AGE'; received: unknown }
  // Don't change the database-read failure — let it throw.

  const parseUser = (input: { id: string; email: string; age: unknown }): User => {
    if (!input.email.includes('@')) throw new Error('invalid email');
    if (typeof input.age !== 'number') throw new Error('invalid age');
    return { id: input.id, email: input.email, age: input.age };
  };

  // your code here — declare ParseError and rewrite parseUser to return Result<User, ParseError>
  ```

- **Tests** (vanilla runner; the assertion shim supports `toBe`, `toEqual`, `toThrow`, etc.):

  ```ts
  test('returns ok on valid input', () => {
    const result = parseUser({ id: '1', email: 'a@b.com', age: 30 });
    expect(result).toEqual({ ok: true, value: { id: '1', email: 'a@b.com', age: 30 } });
  });

  test('returns INVALID_EMAIL on a missing @', () => {
    const result = parseUser({ id: '1', email: 'no-at-sign', age: 30 });
    expect(result.ok).toBe(false);
    expect(result.error).toEqual({ code: 'INVALID_EMAIL' });
  });

  test('returns INVALID_AGE on a non-number age', () => {
    const result = parseUser({ id: '1', email: 'a@b.com', age: 'thirty' });
    expect(result.ok).toBe(false);
    expect(result.error).toEqual({ code: 'INVALID_AGE', received: 'thirty' });
  });
  ```

  Note for the writing agent: the vanilla runner is sufficient — no JSX, no imports, all types are inline. Use `runner` default (vanilla). The tests verify the *shape* (return values), not the type signatures — which is fine since the runtime shape is what matters for the assertion.

  Optional `instructions`: `"Refactor parseUser so it returns Result<User, ParseError> for the two validation failures, where ParseError is a discriminated union with codes 'INVALID_EMAIL' and 'INVALID_AGE'. The 'INVALID_AGE' variant should carry the offending value as 'received'."`

### Closing

One short paragraph that returns to the senior question and ties off.

- Restate: every failure rides one of two channels. **Return the expected; throw the unexpected.** The reading reflex is one question — *can the caller do something different per case?* — and the answer routes the failure.
- Forward to lesson 2 of chapter 008 in one sentence: the catch still says `unknown`, and the next lesson installs the narrow that unlocks `err.message`, authors small custom `Error` subclasses with literal `name` discriminants, and walks `Error.cause` chains.

### External resources

`CardGrid` with two `ExternalResource` cards. Keep tight.

- **MDN — `try...catch`** (`https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch`). The canonical reference for the mechanics. Use this as the "look here for syntax depth I didn't teach" link.
- **TypeScript Handbook — `unknown`** (`https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#unknown`). Names the type the strict-mode catch parameter receives. Forward-link to L2's narrowing in the card description.

Optional: a `<VideoCallout>` only if the writing agent finds a 2024+ talk that lands at the exact altitude (channel decision + `Result<T, E>`). Theo Browne, Matt Pocock, and Mark Erikson have all spoken on `Result`-style error handling at conferences — if a clean ~10-min cut exists, embed; if it lands in libraries (`neverthrow`, `effect`), skip. The course rolls its own `Result` and does not teach libraries here.

## Components, diagrams, exercises — summary roll-up

- **Code blocks.** Plain `<Code>` for the bare-catch snippet, the `ParseError` shape, the `parseInvoiceCsv` signature, the caller `switch`. `<AnnotatedCode>` for the `try`/`catch`/`finally` walkthrough (3 steps, mixed colors) and the `Result<T, E>` + helpers shape (3 steps, blue / green / red). `<CodeVariants>` thrice — async-throw flow (3 tabs, `syncKey="async-throw"`), only-throw-`Error` (2 tabs, `syncKey="throw-shape"`), catch placement (2 tabs, `syncKey="catch-placement"`). `<CodeTooltips>` not needed — the inline definitions land in prose or `<Term>` tooltips. `<DiagramSequence>` not needed — there's nothing temporal to scrub through.
- **Diagrams.** One `<Figure>` wrapping a small two-column HTML+CSS table that lays out the channel comparison (the "two channels" beat). This is the lesson's single visual anchor. No Mermaid, no D2 — this is annotated-illustration shape, and a table is the right vehicle.
- **No custom component.** The lesson is decision-heavy and snippet-heavy; no widget needs building. (Contrast: L1 of chapter 007 had `EventLoopWalker` because the runtime model is dynamic. The channel decision is static furniture.)
- **Exercises.** One `<Buckets>` exercise (eight items into two channels) and one `<ScriptCoding>` exercise (refactor throws to `Result<T, E>`). The `Buckets` is the lesson's center-of-gravity exercise; the `ScriptCoding` is the structural payoff.
- **Tooltips (`<Term>`).** *throw* (introduced in the two-channels section), *framework boundary* (same section), *unhandled rejection* (in the async-throw beat), *Result* (in the `Result<T, E>` section). Four tooltips, all introduced in the lesson's first half. *`assertNever`* and *discriminated union* are recalled from chapter 005 — use plain inline code if the writing agent finds the L3-of-chapter-005 tooltip definition carries forward consistently; otherwise re-tooltip.
- **Video.** None planned. The lesson's altitude is decisional and short; a video would dilute. Skip unless a clean 8–12 min cut surfaces.

## Scope

What this lesson does **not** cover:

- **Narrowing inside the catch.** L2 of chapter 008 owns `instanceof Error`, `Error.isError()`, the `error.name` fallback, and the `ensureError` normalizer. This lesson stops at "the catch parameter is `unknown`; reading `err.message` is a compile error." The cross-realm `instanceof` gotcha is named in passing only if the writing agent finds a natural seam — otherwise wait for L2.
- **Authoring custom `Error` subclasses.** L2 of chapter 008. Domain error class shape (`BillingError`, literal-typed `name`, structured `code` field) lands there.
- **`Error.cause` chaining.** L2 of chapter 008.
- **The framework-boundary catch in depth.** Unit 9 chapter 080 owns the `error.tsx` React boundary, the action wrapper, and the audit-log seam. This lesson names the boundary as a destination, not a mechanic.
- **RFC 9457 Problem Details and the on-the-wire error body.** Lesson 2 of chapter 011 and lesson 2 of chapter 046.
- **`neverthrow`, `effect`, `fp-ts`, or any other Result-library.** The course rolls its own minimal `Result<T, E>` shape because the discipline is the lesson, not the library. Name once if a student asks; do not deep-dive.
- **Logging frameworks (`pino`, Sentry).** Unit 20 chapter 092.
- **Refuse-by-default at the gate.** Lesson 1 of chapter 080 (Architectural Principle for refusal as the default branch).
- **React error boundaries (`error.tsx`, `<ErrorBoundary>`).** Unit 4 React error boundaries.
- **Async stack traces under Node.** `--async-stack-traces` is on by default in Node 22+; name in one line at most if a snippet's stack trace would be misleading without it. No deep treatment.
- **`AggregateError` and `Promise.any` rejection.** L2 of chapter 008 names it once (since it's a catch shape); this lesson does not.
- **The full `unknown`-to-`Error` narrowing pattern.** L2 of chapter 008.

## Code conventions alignment

Skimming the relevant sections of `Code conventions.md` (TypeScript, Function form, Error handling, Async-cancellation-and-time):

- **TypeScript.** Snippets are `.ts` shape — annotated where the lesson needs them readable, otherwise inference. `strict: true` is assumed; the `useUnknownInCatchVariables` flag (a strict-mode default since TS 4.4) is the load-bearing fact in the `try`/`catch` section. Return types are not annotated on illustrative async helpers (consistent with chapter 007 lessons). The `parseInvoiceCsv` signature *is* annotated because it's the lesson's payoff signature.
- **Function form.** Arrow functions bound to `const` for every callable in the lesson. `closeStaleSessions = async (orgId) => { ... }` shape. No `function` keyword anywhere; the carve-outs (hoisting, recursion, type-guard signatures) don't apply.
- **Error handling section of conventions.** This lesson establishes the section's first principles. Match the convention shape: `Result<T, E>` with `value`/`error` fields (not `data`); `ok`/`err` helpers live at `lib/result.ts`; the `error.code` discriminated-union shape. Note one carve-out for the writing agent: the conventions doc shows a single-generic `Result<T>` with a hard-coded error shape (`{ code: 'validation' | 'conflict' | ...; userMessage: string; fieldErrors? }`) because that's the *project-specific* Server Action contract. This lesson teaches the *generic* `Result<T, E>` because the chapter 008 thread is the language-level substrate; the project-specific shape lands at lesson 3 of chapter 043. Both coexist — `Result<T, E>` is the general tool, `Result<T, ActionError>` is one application.
- **Async, cancellation, and time.** The `return await` discipline is mandatory inside `try` (matches the convention). `Promise.all` is not in scope this lesson. `Promise.allSettled` not in scope.
- **Semicolons, single quotes, two-space indent.** Standard.
- **Naming.** `parseInvoiceCsv` matches verb-led helper convention. `chargeInvoice` matches the Server Action convention. `closeStaleSessions` matches verb-led pure helper convention. `Result`, `ParseError`, `User` types are PascalCase.

Pedagogical divergences from conventions:

- The lesson's `Result<T, E>` is the *generic* two-parameter form, not the project-specific `Result<T>` from `Code conventions.md` § Error handling. This is deliberate: the chapter teaches the substrate; chapter 043 lands the project-specific shape on top. Note this in passing if needed so the writing agent doesn't reach for the chapter-043 form and confuse the substrate-vs-application order.
- Some snippets use placeholders (`/* ... */`) where production code would have full Drizzle / Stripe calls. The lesson is about channel decisions, not query authoring — keep snippets terse.
- The `log.error('charge failed', ...)` calls in the catch-placement anti-pattern snippet use a hypothetical `log` object — the project's `pino` wiring lands in Unit 20. Don't reach for it here; the placeholder is fine.

## Estimated student time

40 to 50 minutes (matches the chapter outline estimate). The opening scenario, the two-channels comparison, and the `Result<T, E>` walkthrough are the time sinks; the mechanics (try/catch, only-throw-Error) move quickly. The two exercises (Buckets + ScriptCoding) add another 10–15 minutes of practice.
