sources:
  87.1: Pure-function tests, the daily shape
  87.2: Factories over shared fixtures
  87.3: Pinning time, IDs, and randomness
  87.4: Type-level tests with expectTypeOf
  87.5: Async tests without the forgotten-await trap
  87.6: Asserting the unhappy path

questions:
  - source: 87.5
    question: |
      A `/lib` function `refundCharge` is broken — it resolves `false` for every charge. This test reports a **pass** under Vitest 3:

      ```ts
      it('refunds a settled charge', async () => {
        expect(refundCharge(charge)).resolves.toBe(true);
      });
      ```

      Why does the broken code slip through green?
    choices:
      - text: |
          The `.resolves` assertion builds a promise that the `it` callback never awaits, so the callback finishes cleanly and the runner records a pass before the rejection lands.
        correct: true
      - text: |
          `.resolves` only works on functions that throw, so it silently skips any promise that resolves to a boolean.
        correct: false
      - text: |
          The callback is marked `async`, which tells Vitest to ignore the assertions inside it.
        correct: false
    why: |
      The runner can only judge what it waits for. Without the outer `await`, the assertion's rejection happens a tick later in a void — the canonical form is `await expect(refundCharge(charge)).resolves.toBe(true)`. Vitest 4 turns this exact case into a hard failure.

  - source: 87.1
    question: |
      A date codec hands back a `Temporal.PlainDate`. Which assertion actually pins the calendar day the test cares about?
    choices:
      - text: |
          ```ts
          expect(due.toString()).toBe('2026-03-15');
          ```
        correct: true
      - text: |
          ```ts
          expect(due).toEqual(Temporal.PlainDate.from('2026-03-15'));
          ```
        correct: false
      - text: |
          ```ts
          expect(due).toBe(Temporal.PlainDate.from('2026-03-15'));
          ```
        correct: false
    why: |
      `toEqual` on a Temporal value compares opaque internal slots, not the day — it can pass by accident or fail on a value that represents the same day. `toBe` compares references and fails for two distinct objects. Assert on the observable parts: the ISO string, or `.year`/`.month`/`.day`.

  - source: 87.3
    question: |
      A test calls `vi.useFakeTimers()` and `vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))`, then asserts that `Temporal.Now.instant()` reports that frozen moment. The assertion fails and reads the real wall-clock time. Why?
    choices:
      - text: |
          `vi.useFakeTimers()` patches `Date`, `setTimeout`, and friends, but not `Temporal.Now` — Temporal's clock is a separate mechanism the fakes never reach.
        correct: true
      - text: |
          `vi.setSystemTime` only takes effect after the first `vi.advanceTimersByTime` call.
        correct: false
      - text: |
          Fake timers were installed in `beforeEach` instead of `beforeAll`, so they hadn't taken effect yet.
        correct: false
    why: |
      Temporal's clock is decoupled from `Date`, so fake timers sail right past it. That is exactly why domain "now" goes through the `clock.now()` seam — you swap a module you own instead of fighting over whether Temporal is faked.

  - source: 87.4
    question: |
      You want a type test that catches it when someone adds a fourth `cancelled` member to the `InvoiceState` discriminated union. Which matcher fails loudly on the widening?
    choices:
      - text: |
          ```ts
          expectTypeOf<InvoiceState>().toEqualTypeOf<Draft | Sent | Paid>();
          ```
        correct: true
      - text: |
          ```ts
          expectTypeOf<InvoiceState>().toExtend<Draft | Sent | Paid>();
          ```
        correct: false
    why: |
      `toEqualTypeOf` is bidirectional, so a widened union breaks the "right side is assignable to the left" half and the test goes red. `toExtend` is one-way assignability — a wider supertype still satisfies "is-a", so the new case slips through unnoticed.

  - source: 87.2
    question: |
      Sort these test-data needs by the tool you'd reach for: a single paid invoice for one test's assertion, a captured Stripe `checkout.session.completed` payload for signature verification, and 50 invoices to fill the dev list page. Which mapping is right?
    choices:
      - text: |
          Single invoice → **factory**; captured Stripe payload → **static fixture**; 50 invoices → **seed**.
        correct: true
      - text: |
          Single invoice → **fixture**; captured Stripe payload → **factory**; 50 invoices → **seed**.
        correct: false
      - text: |
          Single invoice → **factory**; captured Stripe payload → **seed**; 50 invoices → **fixture**.
        correct: false
    why: |
      A factory is a function producing fresh per-test entities; a static fixture is external data used verbatim where exact bytes matter (signature verification hashes the raw payload); a seed populates a database with realistic volume. Conflating them reintroduces run-order coupling.

  - source: 87.6
    question: |
      You're testing that a `/lib` function returns `Result.err` with a particular `code`. Which assertion is the durable one, and why?
    choices:
      - text: |
          ```ts
          expect(result).toMatchObject({ ok: false, error: { code: 'not_found' } });
          ```
          Partial match pins the discriminator and the code — the contract — and stays quiet about `userMessage` and any field the error grows later.
        correct: true
      - text: |
          ```ts
          expect(result).toEqual({
            ok: false,
            error: { code: 'not_found', userMessage: 'Invoice not found.' },
          });
          ```
          Exhaustive match proves the whole shape, so nothing can drift unnoticed.
        correct: false
    why: |
      `toEqual` is an exhaustive deep match — it breaks the day someone adds `error.traceId`, and it forces you to restate `userMessage`, the localizable wording you should never pin. Assert the machine-readable contract (class and code), not the user-facing prose.
