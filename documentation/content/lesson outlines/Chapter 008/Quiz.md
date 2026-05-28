sources:
  8.1: "Two channels: throw the unexpected, return the expected"
  8.2: Narrowing the catch and authoring domain errors
questions:
  - source: 8.1
    question: |
      A `signUp(email, password)` Server Action can fail in three ways: the email is already taken, the password is shorter than the minimum, and the Postgres pool is exhausted. Which channels should each failure ride?
    choices:
      - text: |
          Duplicate-email and short-password return a `Result<T, E>`; pool exhaustion throws.
        correct: true
      - text: |
          All three return a `Result<T, E>` with a tagged-union `E` — that's the whole point of `Result`.
        correct: false
      - text: |
          All three throw — the action's outer catch translates each into a user-visible message.
        correct: false
    why: |
      Apply the one-question test — can the caller reasonably do something different per case? Duplicate-email and short-password are domain validation failures the form branches on (highlight the email field vs. the password field), so they ride the return channel as tagged variants. Pool exhaustion is operational — every caller's response is "log it, show the global error" — so it throws and the framework boundary handles it. Putting `'POOL_EXHAUSTED'` into `E` would be doing operator-error reporting in the return channel.

  - source: 8.1
    question: |
      Which of these `try`/`catch` shapes is broken? (Select all that apply.)
    choices:
      - text: |
          ```ts
          try {
            return fetchUser(id);
          } catch (err) {
            return null;
          }
          ```
        correct: true
      - text: |
          ```ts
          try {
            void logEvent(e);
          } catch (err) {
            return null;
          }
          ```
        correct: true
      - text: |
          ```ts
          try {
            return await fetchUser(id);
          } catch (err) {
            return null;
          }
          ```
        correct: false
      - text: |
          ```ts
          try {
            await logEvent(e);
          } catch {
            /* swallow */
          }
          ```
        correct: false
    why: |
      The first is the missing-`await` trap: `return fetchUser(id)` pops the function off the stack before the Promise rejects, so the catch never runs and the rejection escapes. The second is the un-awaited-call variant — `void logEvent(e)` detaches the Promise entirely; the surrounding `try` is empty as far as rejections are concerned. The third (`return await`) keeps the function on the stack until settle, so the catch fires. The fourth uses the legal bare-`catch` shape for genuine fire-and-forget cleanup — terse but correct.

  - source: 8.2
    question: |
      A catch in a Server Component receives an error thrown by Next.js middleware running on the edge runtime. Which narrow is the right reach?
    choices:
      - text: |
          `Error.isError(err)` — middleware and Server Components run in different realms, so `instanceof Error` returns `false` on a real `Error` from the other side.
        correct: true
      - text: |
          `err instanceof Error` — the standard narrow works for any thrown `Error`, regardless of where it came from.
        correct: false
      - text: |
          `typeof err === 'object' && err !== null && 'message' in err` — duck-typing dodges the realm issue.
        correct: false
    why: |
      Each JavaScript realm holds its own `Error` constructor, and the edge/Node split in Next.js is one of those realm boundaries. `instanceof Error` compares against the catching realm's `Error`, so a real `Error` constructed in middleware fails the check on the Server Component side. `Error.isError()` (Stage 4, shipped in Node 24+) tests the internal `[[ErrorData]]` slot instead of constructor identity, so it stays true across realms. Duck-typing on `'message' in err` works but loses the typed surface and silently accepts non-`Error` shapes the catch then can't reason about.

  - source: 8.2
    question: |
      Which of these `BillingError` class shapes follow the 2026 senior pattern? (Select all that apply.)
    choices:
      - text: |
          ```ts
          class BillingError extends Error {
            readonly name = 'BillingError' as const;
            readonly code: 'card_declined' | 'insufficient_funds';
            constructor(code: 'card_declined' | 'insufficient_funds', message: string, options?: { cause?: unknown }) {
              super(message, options);
              this.code = code;
            }
          }
          ```
        correct: true
      - text: |
          ```ts
          abstract class AppError extends Error {}
          class BillingError extends AppError {
            constructor(code: string, message: string) {
              super(`BillingError: ${message}`);
              this.name = 'BillingError';
              (this as any).code = code;
            }
          }
          ```
        correct: false
      - text: |
          ```ts
          class BillingError extends Error {
            readonly name = 'BillingError' as const;
            readonly code: 'card_declined' | 'insufficient_funds';
            constructor(code: 'card_declined' | 'insufficient_funds', message: string) {
              super(message);
              this.code = code;
            }
          }
          ```
        correct: false
    why: |
      The first hits all four senior moves — extends `Error` directly (flat namespace), `readonly name = '...' as const` as the literal discriminant, a typed string-literal `code` field, and `{ cause }` passed through to `super(message, options)`. The second invents an `AppError` taxonomy tree, mangles `message` to encode the name, widens `code` to `string`, and drops `cause` entirely. The third looks close but silently drops the `cause` passthrough — `err.cause` will be `undefined` even when the throw site tried to set it, breaking the chain-walking pattern.

  - source: 8.1
    question: |
      A function returns `Result<Invoice[], ParseError>`. What's the structural payoff over throwing on every parse failure?
    choices:
      - text: |
          The compiler refuses to read `value` until the caller has checked `ok`, and adding a new variant to `ParseError` turns every consumer's `switch` into a compile error until they handle it.
        correct: true
      - text: |
          `Result` is faster — throwing builds a stack trace, returning a tagged object doesn't.
        correct: false
      - text: |
          `Result` propagates up the call stack the same way a throw would, but without the `unknown`-typed catch parameter.
        correct: false
    why: |
      The win is structural, not performance. The discriminated union forces the caller to narrow on `ok` before reading either side, and an exhaustive `switch` on `error.code` (closed with `assertNever`) breaks loudly the moment the failure shape grows. The performance framing misses the point — the chapter teaches `Result` because it makes the failure contract part of the type, not because it skips a stack capture. And `Result` is explicitly *not* propagated up the stack; the immediate caller inspects it. That's the whole reason it lives on the return channel.

  - source: 8.2
    question: |
      Reorder this catch ladder into the canonical 2026 shape.

      ```ts
      try {
        await processCharge(invoiceId);
      } catch (e) {
        // A — throw ensureError(e);
        // B — if (e instanceof BillingError) { switch (e.code) { ... } }
        // C — if (e instanceof Error) throw e;
        // D — if (e instanceof Error && e.name === 'AbortError') return;
      }
      ```
    choices:
      - text: |
          B, D, C, A
        correct: true
      - text: |
          C, B, D, A
        correct: false
      - text: |
          A, B, D, C
        correct: false
    why: |
      The ladder reads top to bottom from most specific to least. `instanceof BillingError` (B) is the narrowest — typed `e.code` discriminant unlocked. Then the `error.name` portable check (D) catches cross-realm errors like `AbortError`. Then the generic `instanceof Error` rethrow (C) lets everything else bubble to the framework boundary. `ensureError` (A) is the trailing catch-all for the rare third-party-threw-a-string case. Putting the generic `Error` check before the specific subclass swallows `BillingError`s into the wrong branch and loses the discriminant.

  - source: 8.2
    question: |
      You catch a `StripeCardError` at the Stripe seam and want to rethrow it as a `BillingError` so the operator log still has the original Stripe response. What's the right shape?
    choices:
      - text: |
          ```ts
          throw new BillingError('card_declined', 'Card declined by issuer', { cause: stripeErr });
          ```
        correct: true
      - text: |
          ```ts
          throw new BillingError('card_declined', `Card declined: ${stripeErr.message} (${stripeErr.code})`);
          ```
        correct: false
      - text: |
          ```ts
          stripeErr.name = 'BillingError';
          throw stripeErr;
          ```
        correct: false
    why: |
      `Error.cause` is the 2026-current standard for "this failure was caused by that one." Passing `{ cause: stripeErr }` preserves the full original error — request ID, decline code, headers — as a structured object the chain walker reads recursively. Stringifying Stripe's details into `message` throws away the structure (the operator log can't filter on `cause.code` anymore) and pollutes the user-facing seam. Mutating the original's `name` lies about the constructor and loses the chain entirely.

  - source: 8.1
    question: |
      A catch wraps a vendor SDK call and `console.error(err)`s, then continues with the original happy-path return. What's the senior critique?
    choices:
      - text: |
          The catch neither converts the channel to `Result.err` nor lets the boundary handle the failure — the caller sees success even though the call failed. Either recover and return `err({ ... })`, or remove the catch and let the throw bubble.
        correct: true
      - text: |
          `console.error` is the wrong logger — swap it for the project's structured logger and the catch is fine.
        correct: false
      - text: |
          The catch parameter should be typed `Error`, not `unknown` — narrow with `instanceof Error` and the shape becomes correct.
        correct: false
    why: |
      The anti-pattern isn't the logger choice or the catch typing — it's that the catch swallows a real failure and lets the function return success. A catch belongs in exactly two places: at the framework boundary (it owns the user-visible response) or at a call site that converts the channel (vendor throw becomes `Result.err`). "Log and continue" is neither — it hides the failure from both the caller and the boundary.
