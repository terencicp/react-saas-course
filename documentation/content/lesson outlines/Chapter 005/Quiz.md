sources:
  5.1: Impossible states, unrepresentable
  5.2: States plus transitions
  5.3: Exhaustiveness, enforced
  5.4: Branded IDs
  5.5: Derive types from values
  5.6: The utility-type toolbox
  5.7: Generics with constraints
questions:
  - source: 5.1
    question: |
      You're modeling a request lifecycle that produces exactly four runtime states (`idle`, `loading`, `success`, `error`). A teammate proposes:

      ```ts
      type RequestState = {
        status: 'idle' | 'loading' | 'success' | 'error';
        data?: User;
        error?: Error;
      };
      ```

      Why is this still the flag-set anti-pattern in disguise?
    choices:
      - text: |
          Because `data` and `error` are top-level optionals — the type still admits `status: 'loading'` with `data` set, and every consumer of `state.data` has to null-check.
        correct: true
      - text: |
          Because the discriminant should be named `kind`, not `status`, for non-async lifecycles.
        correct: false
      - text: |
          Because the union has no `Result` variant, so the function can't return a failure shape.
        correct: false
    why: |
      Per-variant fields belong inside the variant where they're valid. Promoting `data` and `error` to top-level optionals brings back the same impossible-state combinatorics the discriminated shape was supposed to close off — `success` without `data`, `error` without `error`, `loading` with `data`. The variants need to carry their own data.

  - source: 5.2
    question: |
      In the optimistic-mutation machine, why does the `optimistic` variant carry an `original: string` field that `confirmed` does not?
    choices:
      - text: |
          Per-state invariants — `rollback` is only callable from `optimistic`, and it needs the pre-change value to restore. `confirmed` is past the rollback window, so it has nothing to remember.
        correct: true
      - text: |
          To work around a TypeScript limitation where union variants must differ by at least two fields to narrow correctly.
        correct: false
      - text: |
          Because `confirmed` derives `original` from the server response and doesn't need to store it.
        correct: false
    why: |
      Each state holds exactly the data it's valid with. The `original` field is the data `rollback` needs to do its job, and the type encodes the safety property by living only on the variant where rollback is reachable. Once the mutation is confirmed, no rollback can fire, so the field is gone — the invariant lives in the type, not in a runtime check.

  - source: 5.3
    question: |
      A teammate writes an exhaustive `switch` on a discriminated union and ends it with `event satisfies never` instead of `return assertNever(event)`. Which framing is correct?
    choices:
      - text: |
          `satisfies never` is the right reach when the bottom is structurally unreachable and no runtime throw is needed — the check erases at compile time. `assertNever` is the default for real handlers where a malformed payload reaching the bottom should fail loudly.
        correct: true
      - text: |
          They're equivalent — `satisfies never` is just the newer syntax for the same runtime throw, so always prefer it.
        correct: false
      - text: |
          `satisfies never` is unsafe because it doesn't fire a compile error when a variant is missed; only `assertNever` enforces exhaustiveness.
        correct: false
    why: |
      Both produce the same compile-time exhaustiveness check (the missing-variant value isn't assignable to `never`). The difference is runtime behavior — `satisfies never` erases entirely, while `assertNever` throws. Reach for `assertNever` in production handlers (webhooks, reducers, dispatch) where a future payload reaching the bottom should be loud; reach for `satisfies never` when the bottom is genuinely unreachable.

  - source: 5.4
    question: |
      Which of these strings deserve a brand under the senior test (crosses a schema boundary, has semantic identity, can be confused with another value of the same shape)?
    choices:
      - text: |
          A `StripeCustomerId` value read from a Stripe webhook payload.
        correct: true
      - text: |
          A `WebhookSecret` used to verify incoming Stripe events.
        correct: true
      - text: |
          The body of a user-submitted comment.
        correct: false
      - text: |
          A search query the user typed into a filter input.
        correct: false
    why: |
      The Stripe customer ID has semantic identity and gets passed around with sibling IDs (`StripeSubscriptionId`, `StripePriceId`) that share the same shape — exactly the confusion the brand prevents. The webhook secret earns a brand to keep logging and response-body helpers from leaking it. The comment body and search query are free-form display strings — no semantic identity, nothing they get confused with. Branding them adds declaration noise without preventing a bug.

  - source: 5.5
    question: |
      A teammate writes:

      ```ts
      const LOCALES = ['en', 'es', 'fr'];
      type Locale = (typeof LOCALES)[number];
      ```

      and is surprised `Locale` resolves to `string` instead of `'en' | 'es' | 'fr'`. What's the fix?
    choices:
      - text: |
          Add `as const` to the value: `const LOCALES = ['en', 'es', 'fr'] as const`. Without the freeze, the array's inferred type is `string[]`, and indexing it by `number` returns `string`.
        correct: true
      - text: |
          Replace `[number]` with `[keyof typeof LOCALES]` — `[number]` only works on tuples that were declared with explicit length.
        correct: false
      - text: |
          The pattern doesn't work on arrays; hand-write `type Locale = 'en' | 'es' | 'fr'` instead.
        correct: false
    why: |
      `as const` first, then derive. Without the freeze, the literals widen to `string` at the value level before any type-level derivation runs — so there's nothing literal left for `typeof LOCALES[number]` to read. The `[number]` indexed-access trick is correct; it's the missing `as const` that's collapsing the result.

  - source: 5.6
    question: |
      You need: the same `Invoice` shape with `id`, `createdAt`, and `updatedAt` removed, then every remaining field optional (a `PATCH /invoices/:id` body). Which expression?
    choices:
      - text: |
          `Partial<Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>>`
        correct: true
      - text: |
          `Omit<Partial<Invoice>, 'id' | 'createdAt' | 'updatedAt'>`
        correct: true
      - text: |
          `Pick<Invoice, Exclude<keyof Invoice, 'id' | 'createdAt' | 'updatedAt'>>`
        correct: false
    why: |
      Both `Partial<Omit<...>>` and `Omit<Partial<...>>` produce the same shape here — drop three keys, mark the remaining fields optional. Read inside-out. The third option is the long-form expansion of `Omit` itself (the same shape minus the `Partial` wrap), so it doesn't make the fields optional and is the wrong answer for a PATCH body.

  - source: 5.7
    question: |
      Which generic signature lets `pluck(user, 'id')` return the precise type at that key (e.g., a branded `UserId`) instead of the union of all field types?
    choices:
      - text: |
          `<T, K extends keyof T>(obj: T, key: K): T[K]`
        correct: true
      - text: |
          `<T>(obj: T, key: keyof T): T[keyof T]`
        correct: false
      - text: |
          `<T extends Record<string, unknown>>(obj: T, key: string): unknown`
        correct: false
    why: |
      The `K extends keyof T` constraint is the load-bearing move. `K` infers to the narrow literal the caller passed (`'id'`), and the return type `T[K]` then recomputes per call site to the precise type at that key. The second option types `key` as the broad `keyof T` union, so the return widens to the union of every field type. The third throws away both the key narrowing and the return type.
