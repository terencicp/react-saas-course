sources:
  63.1: Verify before parse
  63.2: Claim once, mutate once
  63.3: Newer wins, single writer
  63.4: One pattern, four surfaces
  63.5: Resend bounces and complaints

questions:
  - source: 63.1
    question: |
      Your Stripe webhook verifies fine against `stripe trigger` events locally, but in production every real event returns 400. The handler reads the body like this:
      ```ts
      const event = await request.json();
      const ok = await verify(JSON.stringify(event), signature, secret);
      ```
      What's the bug?
    choices:
      - text: |
          `JSON.parse` then `JSON.stringify` rebuilds *a* JSON string, not *the* bytes Stripe signed — whitespace, key order, and number formatting drift, so the HMAC over the re-stringified body never matches `v1`. Read the body once with `request.text()` and verify those exact bytes.
        correct: true
      - text: |
          The production webhook secret is wrong; the local CLI secret happens to match. Verifying against `JSON.stringify(event)` is fine once the secret is correct.
        correct: false
      - text: |
          `request.json()` is too slow and Stripe times out before the 400 is sent. Switch to `request.text()` to read the body faster.
        correct: false
    why: |
      The signature is computed over the raw bytes on the wire. `JSON.parse` discards those bytes, and `JSON.stringify` produces a re-formatted string that diverges in whitespace, key order, and number formatting — one changed byte and the HMAC no longer matches. It "works locally" because synthetic payloads happen to round-trip cleanly; real payloads don't. The fix is to read once as text and hash that exact string. A wrong secret would fail locally too, and `request.text()` isn't a speed fix.

  - source: 63.2
    question: |
      Two retries of the same `checkout.session.completed` land on two workers at once. The handler does `SELECT` from `processed_events`, and if no row exists, does the work and `INSERT`s the receipt. Why does this double-process, and what's the structural fix?
    choices:
      - text: |
          Both workers' `SELECT`s run before either `INSERT`s, so both see "not seen" and both proceed — a TOCTOU race. Collapse check and claim into one `INSERT ... ON CONFLICT DO NOTHING RETURNING`; a returned row means you won, zero rows means stand down.
        correct: true
      - text: |
          The `SELECT` runs on a stale read replica. Point the dedup read at the primary and the second worker will see the first worker's row.
        correct: false
      - text: |
          Raise the isolation level to `serializable` so the second worker's `SELECT` blocks until the first transaction commits.
        correct: false
    why: |
      The check and the claim are two separate moments, and under `read committed` the second worker genuinely can't see the first's uncommitted insert — so both pass the check. No speed of code closes a structural gap. The fix is to make the insert itself the check: `ON CONFLICT DO NOTHING RETURNING` lets the unique constraint serialize the claim atomically. Replica lag isn't the issue, and cranking isolation to `serializable` is the heavy, wrong tool — the unique constraint already does the work.

  - source: 63.2
    question: |
      The handler can't do everything a `checkout.session.completed` implies — send the welcome email, recompute analytics, call a CRM — synchronously before returning `2xx`. What's the durable rule about timing?
    choices:
      - text: |
          Return `2xx` quickly — on the order of a couple of seconds — doing only the minimal DB mutation that must be atomic with the claim, and hand every side effect (email, analytics, API calls) to a background job that runs after the response.
        correct: true
      - text: |
          You have a hard 30-second contractual budget; as long as the whole handler — emails and API calls included — finishes under 30 seconds, doing it all inline is fine.
        correct: false
      - text: |
          Do all the work inline but wrap the slow parts in `Promise.race` with a timeout, returning `200` if they don't finish in time.
        correct: false
    why: |
      Stripe deliberately doesn't publish a fixed contractual timeout — the durable guidance is "return `2xx` quickly, before any complex logic that could time out," which means treating the budget as a couple of seconds and deferring heavy work to background jobs. Anchoring to a hard 30-second number is fragile and not guaranteed. And racing a timeout returns `200` while the work is unfinished — a partial-state bug. The split is: DB-only inside the transaction, side effects out.

  - source: 63.3
    question: |
      Two `customer.subscription.updated` events for one org arrive reordered: `past_due` (created at T) lands first, then `active` (created at T-5s, an *older* event) lands second. How do you stop the stale `active` from clobbering newer state?
    choices:
      - text: |
          Put the ordering check inside the UPDATE's `WHERE`: update only `where last_event_at is null or last_event_at < event.created`, and set `last_event_at = event.created` in the same statement. The stale event matches zero rows and is a silent no-op.
        correct: true
      - text: |
          In application code, `SELECT` the row's `last_event_at`, compare it to `event.created`, and skip the UPDATE if the incoming event is older.
        correct: false
      - text: |
          Reject any event whose `event.created` is older than `now()` minus a few seconds, since a stale event will have an older timestamp than the current clock.
        correct: false
    why: |
      The predicate belongs *inside* the UPDATE so the database evaluates it atomically under the row lock — newer-wins becomes structural, with no race. The read-then-compare-in-code version is the same TOCTOU race the chapter keeps killing: two handlers both read the old mark, both decide they're newer, both write. And comparing `event.created` against `now()` is a clock-skew bug — the reference point is the *row's* stored mark, never the wall clock.

  - source: 63.3
    question: |
      The Checkout redirect lands the user on `/success` before the `checkout.session.completed` webhook has updated their entitlement, so the page shows "Free plan" to someone who just paid. What's the senior fix?
    choices:
      - text: |
          Keep the success page a reader: render a "finalizing…" state and have a Client Component poll via `router.refresh()` (with a time budget) until the webhook lands and the read returns "paid."
        correct: true
      - text: |
          Have the success page confirm the session and write the entitlement itself, so the row is correct the moment the page renders and the webhook becomes a no-op.
        correct: false
      - text: |
          Cache the entitlement read on the success page and call `router.refresh()` to bust the cache once the webhook fires.
        correct: false
    why: |
      The webhook is the single writer for the entity it owns; the page reads and waits. Letting the success page write the entitlement creates a *second writer* racing the webhook — reintroducing the out-of-order corruption and duplicating write logic that will drift. And `router.refresh()` does *not* bust the server cache; if the read is cached, every refresh returns the same stale value and the poll spins until it "fails" even though the webhook landed — the success-page read must be dynamic.

  - source: 63.4
    question: |
      A teammate "adds idempotency" to a public POST route by generating the dedup key inside the handler: `const key = crypto.randomUUID()` on each request, then `INSERT ... ON CONFLICT DO NOTHING`. Why does this protect nothing?
    choices:
      - text: |
          A retry re-enters the handler and generates a *different* UUID, so the two attempts never share a key and the unique constraint has nothing to catch on. The key must be minted by the source that owns "this attempt" and re-sent on the retry.
        correct: true
      - text: |
          `crypto.randomUUID()` isn't collision-free enough for an idempotency key; switch to a UUIDv7 so retries hash to the same value.
        correct: false
      - text: |
          `ON CONFLICT DO NOTHING` swallows the conflict silently; you need to catch the unique-violation error instead for the dedup to register.
        correct: false
    why: |
      Idempotency depends on the *same* key arriving on the original and the retry. A server-minted-per-request key is fresh every time, so the constraint never fires — the whole table protects nothing. The key has to come from the source that defines the attempt and be re-sent: the client's `Idempotency-Key` header for a public route, the form's UUID for a Server Action, `event.id` for a webhook. UUID version is irrelevant, and `ON CONFLICT DO NOTHING` is a perfectly good way to detect the conflict.

  - source: 63.5
    question: |
      A user whose address bounced once (their inbox was full) is now suppressed and locked out. They request a password reset. What does the system do, and where does the decision live?
    choices:
      - text: |
          The reset call passes `bypassSuppression: true` at the call site, so `sendEmail` sends despite the suppression row. The webhook still records the bounce as a fact; the *send* side decides when a fact can be overridden.
        correct: true
      - text: |
          The webhook handler skips writing the suppression row for addresses tied to accounts that might need recovery, so the reset isn't blocked.
        correct: false
      - text: |
          The reset is blocked and the user must contact support to be un-suppressed before any account-recovery email can reach them.
        correct: false
    why: |
      Account recovery must reach the user even past a bounce, so the call site opts in with the narrow, audited `bypassSuppression: true` flag — a privilege used at three or four transactional call sites, never marketing. The clean separation is the point: the webhook always records the truth (the address bounced); the send side reads that truth and decides whether to override it. The handler never second-guesses what it writes, and blocking recovery would trap the user.
