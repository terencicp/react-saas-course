# Lesson title

- Title: Claim once, mutate once
- Sidebar label: Claim once, mutate once

# Lesson framing

This is the structural backbone of every webhook handler in the course. Lesson 1 ended the moment the signature passed (a `200` stub at `// hand off to dedup + business logic`); this lesson picks up exactly there and answers the next senior question: a verified event can still arrive **more than once** (Stripe's delivery contract is at-least-once, retried on any non-2xx or slow response, concurrent across workers, and crash-interrupted) — how do we process it **exactly once**?

The whole lesson is one idea expressed in DB primitives the student already owns: a `processed_events` ledger with a composite unique key, claimed atomically with `INSERT ... ON CONFLICT DO NOTHING RETURNING`, where the claim and the business mutation share **one transaction**. Two failure modes motivate every piece — the `select-then-insert` race (two retries both see "missing", both process) and the claim-then-process-outside split (claim commits, business work fails, retry skips the now-"processed" event leaving data wrong). Both are dissolved structurally, not patched procedurally. This mirrors the chapter's recurring move: lean on the database, not on application-level cleverness.

Mental model the student should leave with: **the claim row and its consequences are the same commit.** The receipt (`processed_events` row) and the effect (business mutation) commit together or not at all. A duplicate loses the claim and short-circuits to `200`; a crash mid-handler rolls both back and the retry re-processes cleanly.

Pedagogical decisions for the lesson as a whole:

- **Heavy reuse of prior knowledge, restated in one line each.** `onConflictDoNothing`/`.returning()` (ch038 L5), `db.transaction(async (tx) => …)` + `read committed` default + the no-external-IO-inside-transactions rule (ch039 L4), the verified handler skeleton + `runtime='nodejs'` + problem+json (ch063 L1). Do **not** re-teach these; name them at the call site and link once. The lesson's new surface is small and that's the point — this is a *composition* lesson.
- **Wrong-then-right is the spine.** Two of the three core sections lead with a broken shape (the race, the split) and derive the fix. This is the most load-bearing pattern per the pedagogical guidelines for "why this approach" — the student must *feel* the race window before the atomic claim lands.
- **Concurrency is the hard intuition.** Beginners assume "one Postgres connection ⇒ no race." The race is across *workers/requests*, not within one statement. A timeline diagram (DiagramSequence) makes the interleaving visceral — this is where students struggle most and where a visual earns its weight.
- **Status-code discipline is a recurring trap.** "Lost the claim ⇒ 200, not 4xx/5xx" is counter-intuitive (a duplicate *feels* like an error). Frame it in production stakes: a 5xx tells Stripe to retry forever; a 4xx is fine but misleading; the dedup short-circuit is a *success path*. Pin the full status surface in one place.
- **Timing budget = the bridge to background jobs.** Stripe's short response window is why side-effects (email, analytics) get queued, not awaited (note: the "30s" in the chapter outline is stale — Stripe doesn't publish a fixed timeout; see the timing-section fact-check). This dovetails with the ch039 L4 rule (no external IO inside a transaction) — same conclusion from two directions. Foreshadow ch066, don't drill it.
- **One live exercise** (DrizzleCoding) so the student *writes* the atomic claim and sees the second insert return zero rows. The rest of the lesson's checks are recall/ordering drills. Keep cognitive load low: build the ledger first, claim second, transaction third, status/timing fourth, then a worked scaffold capstone.

Continuity debts to honor (from Continuity notes + ch038/ch039 outlines): the hand-rolled HMAC verifier from L1 is a teaching device — never resurrect it; verification has already run when this lesson's code begins (start from `event: Stripe.Event` in hand). The `applyBusinessLogic`/`onCheckoutCompleted(tx, event)` body is intentionally a stub here — concrete Stripe event handling is ch064 and the project (ch065). Out-of-order/`last_event_at` is L3's job — do not introduce the ordering predicate here.

# Lesson sections

## Introduction (no header)

Open by cashing in L1's cliffhanger: the signature passed, the handler trusts the event — but trust is not the same as "process once." State the delivery reality concretely and in production stakes: Stripe **retries** any webhook that doesn't return 2xx fast enough (the response window is short — seconds, not minutes), retries can land **concurrently** on different server instances, and a crash between "I saw this" and "I did the work" is a real timeline. The worst-case made vivid: a `checkout.session.completed` processed twice = a customer provisioned twice, or in a billing-credit handler, **credited twice**. That's the money stake.

Then the senior question, stated once: *how does the handler process each event exactly once under retries, concurrency, and crashes?* Preview the one-sentence answer the lesson unpacks: **claim the event in a ledger row and do the work in the same transaction — the receipt and the effect commit together or not at all.** Tell the student that by the end they'll have extended L1's handler with a `processed_events` ledger, an atomic claim, and the full `verify → claim → mutate → 200` scaffold the rest of the chapter and the project build on. Keep it warm and brief (~3 short paragraphs).

Render `<CourseProgressBar value={frontmatter['course-progress']} />` right after the intro prose, matching sibling lessons. (Course-progress value: continue the chapter's sequence — L1 was `0.00005`; pick the next increment consistent with neighbors. The build agent should read the actual sibling value and nudge it forward, not invent a far-off number.)

## At-least-once is the contract, not the exception

Goal: install the threat model so every later mechanism has a reason. This is the "decisions before syntax" framing.

- State Stripe's delivery contract plainly: **at-least-once**, not exactly-once. Stripe retries on any non-2xx (and on timeout) with backoff over hours/days. The same `event.id` can therefore arrive 2+ times — by retry, by network partition re-send, or by two workers picking up overlapping deliveries.
- Enumerate the three "arrives twice" sources concretely so the student sees this isn't hypothetical: (1) handler was slow → Stripe timed out → retried while the first is still running (concurrent); (2) handler succeeded but the 200 was lost in transit → Stripe never heard the ack → retried; (3) handler crashed mid-work → retried. Each is a different interleaving, same defense.
- Name the senior anchor: **idempotency is a property you engineer, not a guarantee the sender gives you.** The sender promises *at least* once; *exactly* once is your job, at the boundary.
- Forward-link in one line: this same "could happen twice" shape generalizes to Server Actions, jobs, and public APIs — but that generalization is L4 ([One pattern, four surfaces]); here we make it concrete for webhooks.

Small visual aid here: a `<Figure>` with a compact HTML/CSS strip (or `<ArrowDiagram>`) showing one event fanning into the handler N times (retry, lost-ack, crash-retry) converging on a single "process exactly once?" gate. Pedagogical goal: cement that the *input* is plural and the *desired effect* is singular — the gap the rest of the lesson closes. Keep it horizontal and short.

Tooltip candidates in this section: **idempotency** (define: an operation that produces the same result whether applied once or many times) on first use; **at-least-once delivery** (the sender guarantees a message arrives one or more times, never zero, so duplicates are expected).

## The dedup ledger: one row per event ever seen

Goal: introduce the `processed_events` table as the durable memory of "what have I already handled." Build the schema first so the claim has something to claim into.

- Motivate the shape: to recognize a duplicate you need a record of every event you've finished. That record is a table, one row per `(provider, eventId)`, written the first time and consulted forever after.
- Present the Drizzle schema. Use an **`AnnotatedCode`** so each column's *why* gets a focused step (the schema is short but each decision is load-bearing). Columns:
  - `provider: text('provider').notNull()` — `'stripe'`, `'resend'`, future providers.
  - `eventId: text('event_id').notNull()` — the sender's ID (`event.id` for Stripe). Note the explicit snake-case string per the per-column escape hatch (see Scope/conventions note below — the sandbox needs it, and it documents the SQL name).
  - `eventType: text('event_type').notNull()` — stored for observability, **not** for dedup (call this out: the unique key is `(provider, eventId)`, type is along for the ride).
  - `receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull()` — when we claimed it; powers the retention sweep.
  - A surrogate PK (`id`) so `.returning()` has a small stable column to hand back.
  - The composite unique constraint, table-level: `(t) => [unique('processed_events_provider_event_id_unique').on(t.provider, t.eventId)]`.
- Explain the **composite key** decision explicitly: why `(provider, eventId)` and not `eventId` alone. Stripe and Resend mint IDs in independent spaces; an ID collision across providers is possible and would make one provider's event silently mask another's. The composite key lets one table serve every provider with zero cross-provider interference. This is the same tenancy-scoping instinct the course applies to unique constraints generally (one line, link to data-layer conventions).
- Senior anchor: the table is **append-only** — no in-place updates, no deletes except a scheduled retention sweep. It's a log of receipts, not mutable state.

AnnotatedCode steps (each ≤6 lines prose, single color per step): (1) the table declaration + provider column [blue]; (2) `eventId` + the explicit snake-case name, tie to "sender's ID" [blue]; (3) `eventType` — observability only, not the key [orange, to flag the easy misconception]; (4) `receivedAt` defaultNow + retention hook [blue]; (5) the table-level composite `unique(...)` — *this constraint is the entire dedup guarantee* [green, the payoff].

Tooltip candidate: **composite unique constraint** (a uniqueness rule spanning two or more columns; the *combination* must be unique, individual columns may repeat).

## Why select-then-insert is broken

Goal: derive the need for atomicity by watching the obvious approach fail under concurrency. This is the lesson's pivotal "wrong" beat — do not skip the broken version.

- Show the intuitive shape first and let it look reasonable: `SELECT` from `processed_events` by `(provider, eventId)`; if a row exists, skip; else do the work and `INSERT` the receipt. Present as a `CodeVariant` "Broken" tab (Drizzle: a `findFirst`/select, an `if`, then insert). Prose names the appeal: reads like plain English, "check then act."
- Then break it with a timeline. Use a **`DiagramSequence`** of two concurrent handlers (Worker A, Worker B) for the *same* `event.id`:
  1. A `SELECT` → row missing.
  2. B `SELECT` → row missing (A hasn't inserted yet).
  3. A does the business work + INSERT receipt.
  4. B does the business work (again!) + INSERT (now either a duplicate row or a unique-violation crash).
  - Final caption: both workers passed the check, both mutated — **double-processing**. The check and the act were two separate moments; concurrency slipped between them.
  - Pedagogical goal: make the **race window** physically visible — it's the gap between read and write, and it exists no matter how fast the code is. Each step highlights the active worker's action.
- Drive home the senior point: this is a **time-of-check-to-time-of-use (TOCTOU)** race. The fix is never "check faster" or "add a mutex in app code" — it's to make the check and the claim **one atomic statement** the database serializes for you. This sets up the next section.
- Explicitly correct the beginner intuition "it's one database, surely it can't run both": the two `SELECT`s run on *different connections/requests*, and `read committed` (the default, ch039 L4) means B genuinely cannot see A's uncommitted INSERT. The isolation level isn't the bug and bumping it isn't the fix — the constraint is.

Tooltip candidate: **race condition** (a bug where the result depends on the unpredictable interleaving of concurrent operations) — or **TOCTOU** if introduced.

## INSERT ... ON CONFLICT DO NOTHING RETURNING: check and claim in one shot

Goal: land the atomic claim as the structural fix, and teach how `.returning()`'s row-count *is* the win/lose signal.

- State the fix in one sentence: collapse "check if seen" and "record as seen" into a single `INSERT ... ON CONFLICT (provider, event_id) DO NOTHING RETURNING id`. The database evaluates the conflict under the unique constraint atomically — exactly one of the concurrent inserts wins the row, the rest hit the conflict and do nothing.
- The **signal**: `.returning()` yields **one row if you won the claim** (the insert happened) and **zero rows if you lost it** (the row already existed). That row-count is how the handler knows whether *it* is the one responsible for doing the work. Make this the mental hook: *won the claim ⇒ I own this event; lost the claim ⇒ someone already has it.*
- Show the Drizzle call as a `CodeVariant` "Correct" tab paired with the previous section's "Broken" tab (use `CodeVariants` with both, so the A/B is one component):
  - Broken: select → if → insert (carried from prior section).
  - Correct: `const claimed = await tx.insert(processedEvents).values({ provider: 'stripe', eventId: event.id, eventType: event.type }).onConflictDoNothing({ target: [processedEvents.provider, processedEvents.eventId] }).returning({ id: processedEvents.id });` then branch on `claimed.length`.
  - Correct-tab prose: one statement, atomic; `claimed.length === 0` means a concurrent/earlier handler already claimed it — short-circuit. Highlight `onConflictDoNothing` + `.returning(...)` green.
- Tie back to ch038 L5 in one line: this is the exact `onConflictDoNothing` + `returning()` idempotent-insert shape from upserts — now in its production home. Link, don't re-teach.
- Senior anchor: **the unique constraint does the concurrency work.** No application lock, no `serializable`, no `SELECT ... FOR UPDATE`. Lean on the constraint (this restates ch039 L4's "constraint-first reflex" — name it).
- Brief note on the alternative outcome: with `onConflictDoNothing` the loser gets **zero rows, no error**. (Contrast in one line with a bare insert that would raise SQLSTATE 23505 — `DO NOTHING` is what turns the conflict into a quiet signal instead of an exception. Reference the ch039 L4 `isUniqueViolation` helper as the *other* way to detect conflicts, used when you didn't pre-empt with `DO NOTHING`.)

CodeTooltips candidate on the correct snippet: hover `.returning({ id })` to show it returns `{ id: string }[]` (inferred), reinforcing "array length is the signal." Use `CodeTooltips` only if it reads cleanly; otherwise a prose sentence suffices.

## The claim and the work are one transaction

Goal: the second "wrong" beat — show that claiming and mutating in *separate* commits reintroduces inconsistency, then wrap both in one transaction.

- Set up the broken split: "what if I claim first, return early on duplicate, then do the business work after?" Looks clean. Break it: if the claim INSERT commits but the business mutation then fails (DB hiccup, bug, crash), the event is now **marked processed** but its effect **never happened**. The retry sees the claim row, concludes "already done", short-circuits to 200 — and the subscription/entitlement is **permanently wrong**. No further retry will fix it because the receipt lies.
- The fix: put the claim INSERT *and* the business mutation inside **one `db.transaction(async (tx) => …)`**. Now the receipt and the effect share a commit boundary:
  - Both commit → event recorded and applied. 
  - Anything throws → **both roll back**, the claim row vanishes, and the retry re-claims and re-processes cleanly.
- Use a `DiagramSequence` or a small `TabbedContent` (two panels: "Split commits" vs "One transaction") contrasting the crash-after-claim timeline:
  - Split: claim commits ✓ → work fails ✗ → retry sees claim → skips → data wrong (red end state).
  - One transaction: claim + work in flight → crash → rollback (no claim row) → retry re-claims → work succeeds → committed (green end state).
  - Pedagogical goal: the commit boundary *is* the correctness boundary. Same-transaction = the receipt can't outlive a failed effect.
- Thread `tx`, not `db`, through the claim and every mutation inside the closure — restate the ch039 L4 `db`-vs-`tx` discipline in one line (mixing `db` inside leaks to the outer connection and breaks atomicity). Link.
- Note the throw-to-rollback contract: inside the transaction you *let it throw* on genuine failure so Postgres rolls back; you don't swallow the error. The outer handler turns an uncaught throw into a 5xx (next section) so Stripe retries. This is the deliberate, correct use of "throw the unexpected" from the error-handling conventions.

Tooltip candidate: **atomic** / **commit boundary** if not already clear from context (all-or-nothing: every statement in the transaction lands together or none do).

## What to return to Stripe (and why 200 on a duplicate)

Goal: pin the full status-code surface and correct the most common reflex — treating a lost claim as an error.

- Lead with the counter-intuitive rule: **losing the claim returns `200`, not a 4xx or 5xx.** A duplicate is not an error — there is simply nothing left to do, and "nothing to do" is success. Frame in stakes:
  - **5xx** tells Stripe "I failed, **retry me**" — returning 5xx for a duplicate causes Stripe to retry an event that's already handled, forever (until it gives up), amplifying load for nothing.
  - **4xx** tells Stripe "this request is **terminally wrong**, stop" — technically halts retries, but it's a lie (the request was fine) and pollutes your error dashboards / Stripe's delivery stats with false failures.
  - **200** is the truth: received, recognized as already-processed, done.
- Present the complete status map for the handler in one place (a small table or `Code` block of the decision):
  - `200` — claimed-and-processed now (happy path).
  - `200` — lost the claim / already processed (dedup short-circuit, **success**).
  - `400` — signature verification failed (from L1) — link, don't re-teach.
  - `5xx` — genuine server error only: DB unreachable, an unhandled throw inside the transaction, a real bug. **This is the only thing that should make Stripe retry.**
- Senior anchor, stated as a rule: **never use 5xx as a soft "please retry" signal.** Retry-worthiness is the dedup ledger's job, not the status code's. The status code reports *what actually happened*; the ledger decides *whether work happens*.
- Logging hook (one line, link ch092 observability, don't drill): every path logs `event.id` + disposition (`claimed` / `duplicate` / `error`). Webhook handlers are debug-hostile — the log is all you have at 2am. Use the per-seam child logger (`seam: 'webhook.stripe'`).

Exercise here — a `MultipleChoice` (multi-select) to lock the status reflexes. Stem: "Which responses does this webhook handler send, and when?" Make options force reasoning, not prose-matching:
- Correct: "A duplicate event (lost the claim) returns 200." 
- Correct: "A failed signature check returns 400 with problem+json." 
- Correct: "A 5xx is reserved for genuine server errors so Stripe retries."
- Distractor: "A duplicate should return 409 Conflict so Stripe stops retrying." — Why-not: 409 is terminal-but-misleading; there's no conflict to surface, the event was successfully handled already; 200 is correct.
- Distractor: "Returning 500 on a duplicate is a safe way to make Stripe skip it." — Why-not: 5xx makes Stripe *retry*, not skip; it's the opposite of safe.
Each choice reveals a one-line `McqWhy`.

## The timing budget: do the minimum, queue the rest

Goal: explain Stripe's timing window and the resulting split-work discipline; bridge to background jobs.

- **Fact-check correction (build agent: heed this).** The chapter outline says "30-second window" — that number is stale/unreliable. Stripe's own docs deliberately do **not** publish a fixed timeout; they instruct you to "return a 2xx quickly, before any complex logic that could time out." Third-party measurements cite a short window (commonly ~10–20s) and a retry schedule of exponential backoff over ~3 days (and Stripe stops after a bounded number of attempts). **Do not teach a single hard number as if it were contractual.** Teach the principle: the window is *short and not guaranteed*, so treat "respond within a couple of seconds" as the target and never gate the 2xx behind slow work. If you cite a figure, frame it as "Stripe currently times out delivery after a short window (on the order of seconds)" and link the docs, not a magic constant.
- State the budget as a principle: Stripe waits only a short, bounded time for a 2xx before treating the delivery as failed and scheduling a retry. A handler that does heavy work synchronously risks **timing out**, which Stripe reads as failure → retry → the same heavy work runs again (and the duplicate may itself time out — a doom loop).
- The discipline: **inside the transaction, do only the minimal DB mutation that must be atomic with the claim.** Everything else — sending a welcome email, recomputing analytics, calling another API — is queued to the background job system and runs after the 200.
- Connect the two reasons this rule exists, from two directions the student has now seen:
  1. **Timing** (this section): synchronous side-effects blow the short response budget.
  2. **Pool/correctness** (ch039 L4): you must never `await` external IO inside a `db.transaction` — it starves the connection pool and stretches the transaction. Restate in one line and link.
  - Both converge on the same shape: DB-only work inside the transaction, side-effects out.
- Show the shape in prose/Code: after the transaction commits, enqueue (foreshadow ch066 / Trigger.dev — name it, the webhook fan-out idempotency-key convention `webhook:${event.id}:${step}` is mentioned in conventions but **owned by ch066**; do not drill). The key line: **the webhook's synchronous job is to record-and-apply the state change; consequences are someone else's job.**
- Retention, in one short paragraph (named, not drilled): `processed_events` grows unbounded; a scheduled sweep deletes rows older than the longest provider retry window (e.g. 30–90 days). It's a background job, not a foreground delete; document the policy in a schema comment. Forward-link ch066.

Tooltip candidate: **connection pool** (a fixed set of reusable DB connections shared across requests; holding one too long during external IO starves the rest) — only if it wasn't already defined upstream; otherwise skip to avoid redundancy.

## The full handler scaffold

Goal: assemble everything into the reference shape the rest of the chapter and the project extend. This is the capstone.

- Present the complete `app/api/webhooks/stripe/route.ts` `POST` as an **`AnnotatedCode`**, picking up from L1's verified-event point (the verify block can be lightly elided/summarized with a comment `// verify (lesson 1)` to keep focus on the new dedup+transact surface, then the new code in full). Shape:
  - `// signature verified — event: Stripe.Event` (from L1).
  - `await db.transaction(async (tx) => { ... })`:
    - claim: `onConflictDoNothing(...).returning({ id })`.
    - `if (claimed.length === 0) return;` — duplicate, the transaction commits trivially, handler will 200.
    - `switch (event.type) { case 'checkout.session.completed': await onCheckoutCompleted(tx, event); break; /* ... */ }` — the typed-handler dispatch; bodies are stubs owned by ch064/project.
  - `return new Response(null, { status: 200 });` after the transaction (covers both processed-now and duplicate).
  - A `catch` at the outer boundary that lets genuine errors become 5xx (or rethrow to the framework) — distinct from L1's 400 problem+json catch which is signature-only. Be precise: the verify `try/catch` returns 400; failures *inside* the transaction propagate to a 5xx so Stripe retries.
- AnnotatedCode steps (single color each): (1) start from verified event [neutral/blue]; (2) open the transaction, thread `tx` [blue]; (3) the atomic claim + `.returning()` [green — the heart]; (4) `claimed.length === 0` early-return = duplicate path [orange]; (5) `switch (event.type)` dispatch to `onX(tx, event)` stubs [blue]; (6) single `200` after commit for both paths [green]; (7) the outer error path → 5xx for genuine failures [orange/red].
- Reiterate the canonical ordering as the takeaway: **verify → open transaction → claim → (duplicate? 200) → mutate → commit → 200; genuine error → 5xx.** This is the skeleton L3 (out-of-order) and L5 (Resend) extend, and the project (ch065) ships.
- Note the shared helpers worth extracting (named, light): a `claimEvent(tx, provider, eventId, eventType)` helper and the `processedEvents` table become the reusable seam L5 reuses for Resend. Mention so the student sees the portability coming (owned/expanded in L4/L5).

Live exercise — a `DrizzleCoding` so the student writes the atomic claim and *sees* dedup work. Design (account for PGlite/DrizzleCoding harness limits — no `casing` config, so column names are raw camelCase keys unless an explicit SQL-name string is given; `onConflictDoNothing`/`returning` and a table-level `unique()` are supported; avoid `uuidv7()` defaults — use a plain `uuid('id').primaryKey()` or `text` id with explicit seed literals):
- **Schema** (visible): a `processedEvents` `pgTable` with `provider`, `eventId` (explicit `text('event_id')`), `eventType`, a plain `id` PK, and a **table-level** `unique().on(t.provider, t.eventId)` (table-level is required for the constraint to register in the harness per the schema-exercise gotcha — and it's what we teach anyway).
- **Seed**: one pre-existing row, e.g. `('stripe', 'evt_existing', 'checkout.session.completed')`.
- **Task / instructions**: "Claim event `evt_existing` for provider `stripe` using an atomic insert that does nothing on conflict, and return the claimed rows. Then observe: because the row already exists, your claim returns zero rows — you lost the claim." Starter provides the `.insert(...).values({...})` skeleton with `/* finish: ON CONFLICT DO NOTHING on (provider, eventId), RETURNING id */` to complete.
- **`expectedRows`: `[]`** (zero rows — the claim is lost because the seed row exists). `ordered: false`. This makes the *point* of the lesson the grading criterion: a correct atomic claim against an already-claimed event returns nothing. Add one sentence below telling the student to try changing the `eventId` to a fresh value and re-running to see one row return (winning the claim) — turning the graded case into a mini-exploration.
- If the harness can't cleanly grade the empty-result case (verify during build), fall back to: claim a **fresh** `eventId` and assert one returned row `[{ id: ... }]` — but prefer the zero-row version because "lost claim ⇒ empty" is the lesson's core insight. (Build agent: pick whichever grades reliably; note the choice.)

## Closing (no header)

Two or three sentences. Recap the mental model: the receipt and the effect are one commit; a duplicate loses the claim and short-circuits to 200; a crash rolls both back and the retry heals itself. Name what's still unhandled to set up L3: dedup protects against the *same* event arriving twice, but it says nothing about *different* events for the same entity arriving in the **wrong order** — that's the next lesson, [Newer wins, single writer]. Link.

Optional `ExternalResource` card: Stripe's "Best practices for using webhooks" / event-delivery docs (verify current URL in fact-check) — for the delivery-contract and retry-window details. One card max; keep it relevant.

# Scope

**This lesson covers:** the `processed_events(provider, eventId)` ledger schema; `INSERT ... ON CONFLICT DO NOTHING RETURNING` as atomic check-and-claim; why `select-then-insert` races; the one-transaction wrap of claim + business mutation; the full status-code surface (200 on processed and on duplicate, 400 on signature fail, 5xx on genuine error only); the 30-second timing budget and the split-work discipline (DB-only inside the transaction, side-effects queued); the full `verify → claim → mutate → 200` handler scaffold.

**Explicitly out of scope (do not teach):**
- **Out-of-order delivery, `event.created`, the `last_event_at` predicate, UPDATE-RETURNING for stale no-ops, the redirect-vs-webhook race, `router.refresh()` polling** — all L3 ([Newer wins, single writer]). Do not introduce any ordering predicate in this lesson's mutations; the `switch` bodies stay stubs.
- **Generalizing the pattern to Server Actions / jobs / public-route `Idempotency-Key`** — L4 ([One pattern, four surfaces]). One forward-link sentence only.
- **Svix/Resend verification and the `email_suppressions` business work** — L5. The `claimEvent`/`processedEvents` reuse may be *named* as portable, not demonstrated for Resend.
- **Concrete Stripe event handling (`onCheckoutCompleted` bodies, subscription/entitlement state, `plan_entitlements`)** — ch064 + project (ch065). Keep `applyBusinessLogic`/`onX(tx, event)` as stubs.
- **Background job mechanics (Trigger.dev, `schemaTask`, queues, the retention sweep implementation, the `webhook:${event.id}:${step}` idempotency key)** — ch066. Name and foreshadow only.
- **Observability / structured logging internals (pino config, redaction, `requestId`)** — ch092. One-line hook only.

**Prerequisites to restate concisely (already taught — redefine in ≤1 line each, link, do not re-teach):**
- `onConflictDoNothing` + `.returning()` idempotent-insert and the `excluded`/`target` mechanics — ch038 L5.
- `db.transaction(async (tx) => …)`, the `read committed` default, the `db`-vs-`tx` discipline, the no-external-IO-inside-transactions / pool-starvation rule, the constraint-first reflex, SQLSTATE 23505 vs 40001 — ch039 L4.
- The verified Stripe handler skeleton, `runtime='nodejs'`, RFC 9457 problem+json, the singleton `stripe` client, `STRIPE_WEBHOOK_SECRET` — ch063 L1 (and the Continuity notes).
- Composite/tenant-scoped unique constraints as the course default — data-layer conventions (one line).

**Code-convention notes for the build agent (deliberate divergences flagged):**
- Production code uses Drizzle's client-level `casing: 'snake_case'`, so production schema would read `text('eventId')` etc. with auto snake-case. **In the DrizzleCoding sandbox only**, there's no `casing` config — write explicit SQL names (`text('event_id')`) so DDL and grading match. Note this divergence in the exercise prose or a `:::note` so a student copying the sandbox schema into a real project understands the difference. The lesson's *non-sandbox* schema block should follow the production convention (snake-case mapping on the client, camelCase keys) and may add explicit names only where it aids the reader.
- Follow route-handler conventions from §Route handlers: named `POST` export, problem+json for the 400, the webhook-claim-in-one-transaction rule (this lesson *is* that rule's home).
- Branded IDs: `eventId` is an external identifier (Stripe's), keep it `text`, no brand needed; the surrogate `id` may be a plain `uuid`/`text` — don't over-engineer for the ledger.
