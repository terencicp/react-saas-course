# Lesson title

- Title: After the write
- Sidebar label: After the write

# Lesson framing

This is the closing lesson of Chapter 043. The previous four lessons assembled the Server Action seam from the entry inward: the `'use server'` boundary (L1), parse-on-entry (L2), the `Result`/throw error model (L3), and the thin-action / pure-`/lib` shape (L4). The running example `createInvoice(formData): Promise<Result<{ id }>>` has, by the end of L4, a body that parses, authorizes, and calls `db/queries` — but the mutate and revalidate seams are still `// → next lesson` comments. This lesson fills them and closes the action surface.

Three distinct senior moves, taught in order, each answering a concrete production failure:
1. **`revalidatePath`** — the cached list page doesn't show the new row after a write. The basic post-mutation cache move.
2. **`db.transaction`** — a two-table write half-fails and leaves the database inconsistent. Atomicity for multi-step mutations, plus the load-bearing "no external IO inside the transaction" rule.
3. **Idempotency keys** — a double-click creates two rows. Foreshadowed, not built: name the problem, write the form-side hidden input, point to Ch 063.

The pedagogical spine is the five-seam shape the chapter has carried since L1 (`parse → authorize → mutate → revalidate → return`). This lesson's job is to make **ordering** intuitive — the student must feel *why* revalidate comes after mutate and before return, *why* the cache call lives outside the transaction, *why* external IO fires after the commit. These are all sequencing errors a junior makes by default, and each has a sharp production symptom (stale UI, diverged external state, double-charged customer). Lead every subsection with the symptom, then the rule.

Deliberate scope discipline carried from the continuity notes: this lesson is the *basic move* lesson, not the *full surface* lesson. `revalidatePath` only — the four-tool decision tree (`updateTag` / `revalidateTag` / `revalidatePath` / `router.refresh`) was owned by Ch 032.6 and is named-once with a link, never re-taught. Transactions reuse Ch 039.4's machinery — isolation levels, savepoints, `FOR UPDATE`, the retry pattern — all named-once with a link, never re-taught; this lesson uses the default flat transaction. The discipline keeps the lesson at ~40–50 min and prevents re-teaching.

Cognitive-load strategy: the student is at the end of a five-lesson arc and already holds a lot. Do not re-derive the action shape — show it as already-built and add the two missing seams onto it. The closing beat assembles the complete end-to-end action so the student sees the whole thing once, which is also the artifact the Ch 047 project extends. Keep new vocabulary minimal: `revalidatePath`, `db.transaction`/`tx`, "idempotency key" are the only new terms.

Code-component strategy: the post-mutation seams are best shown by *evolving* the L4 action, so before/after framing via `CodeVariants` and `del`/`ins` markers carries most of the teaching. The transaction body and the assembled final action each warrant an `AnnotatedCode` walkthrough (multiple parts need focus). The ordering intuition is reinforced with one `DiagramSequence` (the five seams firing in time, with the cache and external-IO placement called out) and a `Sequence` ordering drill. The "no external IO in the transaction" landmine gets a `CodeVariants` wrong/right pair plus an `MCQ`. Idempotency is prose + a small diagram of the double-submit race.

This lesson does not introduce a new Architectural Principle (L4 introduced #3 and #5); it *applies* #5 (use the framework's conventions — `revalidatePath`, `db.transaction`, `redirect` are all platform seams) and reinforces the five-seam house shape from the code conventions. Note inline so downstream agents know the principle work is done.

# Lesson sections

## Introduction (no header)

Warm, brief, decisions-first. Frame the lesson with the senior question from the chapter outline, concretely: the `createInvoice` action has parsed, authorized, and written the row — it is one `return ok({ id })` away from done. But three things still have to be right, and a junior gets all three wrong by default:
- the user navigates back to `/invoices` and the new row **isn't there** (stale cache);
- the invoice wrote but its line items didn't, leaving a **half-built record** (no transaction);
- the user double-clicked and there are now **two invoices** (no idempotency key).

State the lesson's promise: by the end the student completes the five-seam action — fills the `mutate` and `revalidate` seams — and knows the ordering rules that make the difference between a correct mutation and a subtly broken one. Preview that the assembled action is the exact one the Ch 047 project picks up.

Reconnect to prior knowledge in one sentence: the five-seam shape (`parse → authorize → mutate → revalidate → return`) is the spine from L1; transactions were met read-side in Ch 039; the cache was met in Ch 032. This lesson is where they meet the mutation seam.

Do **not** re-explain the `Result` shape, the parse discipline, or the thin-action rule — link back in a half-sentence if needed and move on.

## Refreshing the cache after a write

**Goal:** install `revalidatePath` as the reflex fourth seam, and lock its placement (after mutate, before return). This is the most common post-mutation move and the one the project leans on.

Lead with the symptom: a Next.js 16 app is dynamic-by-default but cached reads are opt-in via `'use cache'`; the invoices list page caches its query for speed. After `createInvoice` writes the row and the user navigates back, the cached page serves the **old** list — the new invoice is missing until the cache entry expires on its own. The fix is to tell the cache the data it holds is stale.

Teach `revalidatePath('/invoices')`: called inside the action after the successful write, it marks the cached entry for that path stale so the next request to that route refetches. Keep the mental model blunt and correct for the simple list-and-detail case: *the path string is the URL*. Mention the second-argument form for paths with a dynamic segment — `revalidatePath('/[org]/invoices', 'page')`, where `'page' | 'layout'` is the *second argument* and is **required** when the path contains a dynamic segment like `[org]` — but keep it a one-liner; this is an edge the project rarely hits. Downstream note: never append `/page` or `/layout` to the path string itself (the docs call this out); the type goes in the second argument.

**The placement rule — the load-bearing beat.** `revalidatePath` mutates the *server-side* cache. Calling it before the `db.insert` runs invalidates against an unchanged database, the next request re-reads the same stale data, and the user still sees no new row. The ordering is fixed: `mutate → revalidate → return`. Tie this back explicitly to the five-seam spine — revalidate is seam 4, and seam order is not stylistic, it is correctness. The `del`/`ins` `CodeVariants` (below) makes the wrong-order failure concrete.

**Why this lesson stops here.** One short paragraph + a `LinkCard`/`ExternalResource` is enough: the full invalidation decision tree — `updateTag` (read-your-writes inside an action), `revalidateTag(tag, profile)` (eventual, for webhooks/jobs), `revalidatePath`, `router.refresh()` — was decided in Ch 032.6 and is not re-taught here. State the one-line senior frame: `revalidatePath` is the blunt, always-correct move for "this path's data changed"; the tag-based tools earn their weight when the app has a tag scheme and wants surgical, read-your-writes invalidation (a Ch 072-era concern). Do **not** reproduce the decision tree.

> Watch-out to fold into this section (not a separate section): `revalidatePath` before the mutation revalidates stale state — order is correctness, not style.

**Components:**
- `CodeVariants` (before/after), two tabs, `maxLines` ~12, building directly on L4's assembled action:
  - Tab "Before — stale list": the L4 action ending at `return ok({ id: invoice.id })`, the `// → next lesson` comment where revalidate goes. One-line prose: the write lands but the cached `/invoices` page never refreshes.
  - Tab "After — refreshed": same action with `ins`-marked `revalidatePath('/invoices')` placed after the write and before the return. One-line prose: the next request to `/invoices` refetches and the row appears.
- A small inline `Code` block (or a third `CodeVariant` labelled "Wrong order") showing `revalidatePath` *before* the `db.insert`, with prose naming the exact failure (revalidates against unchanged data → still stale). Use `del`/`ins` to dramatize the move.

**Terms (use `Term`):**
- "revalidate" — definition: mark a cached entry stale so the next request rebuilds it from fresh data; it does not rebuild immediately.

## redirect after a successful create

**Goal:** teach the common follow-up move (navigate to the new record on success) and resolve the apparent conflict with the `Result` shape and the throw-vs-return rule from L3.

Lead with the pattern, since the student will reach for it immediately: after creating an invoice, send the user to its detail page — `redirect('/invoices/' + id)` at the end of the action. Frame it via Architectural Principle #5 (already introduced in L4): `redirect()` is a framework *convention*, not an error. The runtime implements it by throwing a special control-flow signal it catches internally and turns into an HTTP redirect; the student writes `redirect(...)` and the framework does the navigation.

Resolve the L3 tension explicitly — this is the beat that prevents confusion. L3 said "return `Result`, throw only the unexpected." `redirect()` rides the *throw* mechanism but is not a failure: it fires on the **success** path, after the write and the revalidate, *instead of* returning the `Result`. So there is no contradiction — the action either redirects (success, navigate away) or returns a `Result` (the caller stays and renders the outcome). Reuse the L3 vocabulary "throw that isn't an error."

**The try/catch landmine.** Because `redirect()` throws, a broad `try { ... } catch (e) { ... }` wrapping the whole action body — the kind L3 used to map DB errors — will *catch the redirect signal* and swallow the navigation. Two senior defenses, in order of preference:
1. Call `redirect()` at the very end of the action, **outside** any `try`/`catch`. This is the default the course writes.
2. If a redirect must live inside a try block, re-throw framework control-flow signals (Next.js exposes a predicate to detect them) so they propagate.
State the reflex plainly: put `redirect()` last, outside the catch.

Foreshadow once, no depth: pairing `redirect()` with optimistic UI needs care — the redirect cancels the optimistic state. That interaction is Ch 044.5 (`useOptimistic`) and Ch 047.5 (optimistic create); named here, not solved.

> Watch-outs folded here: a `try`/`catch` around `redirect()` swallows the navigation unless framework signals are re-thrown; the safe default is `redirect()` last.

**Components:**
- `CodeVariants`, two tabs, illustrating the landmine concretely:
  - Tab "Swallowed redirect": the whole body in a `try`/`catch (e) { return err('internal', ...) }`, `redirect()` inside it — annotate that the catch eats the navigation and the user sees a generic error instead of the detail page.
  - Tab "Redirect last": the DB write wrapped in a narrow `try`/`catch` that maps known violations and `throw e`s the rest, with `redirect('/invoices/' + id)` placed *after* the catch block, outside it. Prose: the catch only guards the mutation; the redirect is the last line.

## Atomic multi-step writes with db.transaction

**Goal:** teach `db.transaction(async (tx) => {...})` as the mutate-seam shape for any write that touches more than one row/table, and make all-or-nothing atomicity intuitive.

Lead with the symptom: `createInvoice` doesn't write one row — it writes the invoice **and** its line items, two `insert`s. If the first succeeds and the second throws (constraint violation, connection blip), the database now holds an invoice with no line items: a half-built, inconsistent record the rest of the app will choke on. Plain sequential `await db.insert(...)` calls have no all-or-nothing guarantee.

Teach the shape: wrap the related writes in `db.transaction(async (tx) => { ... })`. Every write inside the callback uses `tx`, not `db`. On the callback returning normally the transaction **commits** atomically; on any throw it **rolls back** — either both rows land or neither does. Give the senior trigger from Ch 039.4 in one line: reach for a transaction on any multi-table write, or any update-then-derive flow where a later step depends on an earlier write having committed.

Place the transaction in the five-seam shape: it *is* the mutate seam (seam 3). Parse and authorize fire before it; revalidate and return fire after it. Reinforce that the transaction is for **atomicity**, not for general error handling — error mapping is still L3's catch-map-rethrow, and it wraps the transaction call.

**`tx` threading.** Any `db/queries` helper called inside the transaction must take `tx` as its argument (the L4 `db/queries` functions are written to accept `tx` as the first param — call that contract out, it pays off here). A helper that closes over the pooled `db` instead of the passed `tx` runs *outside* the transaction and breaks atomicity silently. This is the subtle bug worth naming.

**What carries over from Ch 039.4 — and what doesn't.** One short paragraph + a `LinkCard`: isolation levels (`{ isolationLevel: 'serializable' }`), nested transactions as savepoints, `SELECT ... FOR UPDATE` row locking, and the SQLSTATE 40001 serialization-failure retry loop were all taught read-side in Ch 039.4. This lesson uses the **default isolation and a flat transaction** — the right choice for the create-invoice-plus-lines case. State the senior call: most action transactions don't need a non-default isolation level; reach for `serializable` only when a consistency-sensitive flow names the trigger (a later unit). Do not re-teach the levers.

**Components:**
- `AnnotatedCode`, the transaction body (the chapter's worked shape), `maxLines` ~12, stepped to focus attention:
  ```
  const invoice = await db.transaction(async (tx) => {
    const [invoice] = await tx.insert(invoicesTable).values(data).returning();
    await insertInvoiceLines(tx, linesFor(invoice.id));
    return invoice;
  });
  ```
  Steps (each one paragraph, ≤6 lines, prefer `color`):
  1. `{1}` — the `db.transaction` call wraps the mutate seam; its return value is the committed result.
  2. `"tx"` (all occurrences), color green — every write uses `tx`, not `db`; this is what binds them to one atomic unit.
  3. `{2}` — first insert returns the new row so its `id` is available to the next step.
  4. `"insertInvoiceLines(tx,"` — the `db/queries` helper takes `tx` as its first arg; threading it keeps the second write inside the transaction.
  5. `{4}` — returning from the callback commits; any throw before here rolls both inserts back.
- A small `DiagramSequence` (2–3 steps) showing commit-vs-rollback: step 1 both inserts succeed → commit (both rows persisted); step 2 second insert throws → rollback (neither row persisted). Pedagogical goal: make "all-or-nothing" visual, not just asserted. Wrap per `DiagramSequence` rules (no outer `Figure`).

**Terms (use `Term`):**
- "atomic" — definition: all the writes commit together or none do; the database is never left in a half-applied state.
- "roll back" — definition: undo every write made inside the transaction so far, returning the database to its pre-transaction state.

## Keep external calls outside the transaction

**Goal:** install the single most important transaction landmine for SaaS — no external IO inside `db.transaction` — and give the fix (fire side effects after the commit). This is a production-grade reflex, worth its own subsection.

Lead with the divergence symptom, made vivid: the action creates an invoice and emails the customer. Putting `await resend.emails.send(...)` *inside* the transaction means that if the transaction rolls back *after* the email sent, the customer has a confirmation email for an invoice that doesn't exist. Worse with money: charge Stripe inside the transaction, the transaction rolls back, the customer is charged for nothing. The database and the outside world diverge, and there is no rollback for an email already delivered or a card already charged.

Add the second, quieter reason from the code conventions: a transaction holds a database connection from the pool for its entire duration. An external call (`fetch`, Stripe, Resend, R2, a queue trigger) inside the transaction holds that connection open across a slow network round-trip — under load this is **pool starvation**, where every connection is parked waiting on external IO and new requests can't get one. So the rule has two teeth: correctness (no rollback for external effects) and performance (don't park a pooled connection on the network).

State the reflex and the shape: **external side effects fire after the transaction commits, never inside it.** Capture only what you need from the transaction, then do the external work outside:
```
const invoice = await db.transaction(async (tx) => { /* writes only */ return ... });
await sendInvoiceEmail(invoice);   // outside, after commit
```
Foreshadow once: for external effects that must be reliable even if the process dies right after the commit, the durable answer is a background job — `after()` / a job queue — which is Ch 066.1 ("Inline, then after()"). Named here, built there. The rule for *this* lesson is simply "no external IO inside the transaction; fire it after the commit."

> Watch-outs folded here: external IO inside a transaction diverges state on rollback and starves the pool; `revalidatePath` (or any cache call) inside the transaction has no rollback semantics — the cache is invalidated even if the write rolls back, so keep cache calls outside the transaction too (this also re-anchors the placement rule: revalidate is seam 4, *after* the transaction).

**Components:**
- `CodeVariants`, two tabs (wrong/right), the canonical landmine:
  - Tab "Diverges on rollback": `await stripe.charges.create(...)` (or `resend.emails.send`) inside the `db.transaction` callback, `del`-marked. Prose: the charge succeeds, the transaction rolls back, the customer is charged for nothing — plus the connection is parked on the network.
  - Tab "Side effect after commit": writes only inside the transaction; the external call moved below it, `ins`-marked. Prose: the external effect fires only once the data is durably committed.
- `MultipleChoice` (single-correct, standalone) checking the reasoning, not the slogan. Stem: an action wraps two DB inserts and a Stripe charge; where does the charge belong and why? Choices phrased so the right answer requires understanding *both* the rollback-divergence and pool-starvation reasons, with distractors like "inside the transaction so it rolls back if the charge fails" (the seductive wrong model — you can't roll back a charge) and "before the transaction so it's fast." Author choices that aren't verbatim prose (per MCQ guidance). Include `McqWhy`.

**Terms (use `Term`):**
- "pool starvation" — definition: every database connection in the pool is held open waiting on slow work, so new requests can't get a connection and stall.

## Idempotency keys, foreshadowed

**Goal:** name the double-submit problem, give the senior fix at the concept level, write the *form-side* hidden input that Ch 063 will read, and explicitly defer the implementation. Do not build the action-side dedup here.

Lead with the symptom: the user clicks "Create invoice," the network hangs, they click again — or the browser auto-retries the POST. The action runs twice; the database has two identical invoices. For internal CRUD this is annoying; for an action that charges money, sends an email, or ships a package, it's a real incident.

Teach the fix at the concept level, no code beyond the form input:
- The **form** generates a stable key once per intent — a `crypto.randomUUID()` placed in a hidden input — so the *same* submit, retried, carries the *same* key.
- The **action** parses the key, checks a dedup ledger (a `processed_actions`-style table with a unique constraint on the key), returns the prior result if the key was already seen, otherwise does the write and records the key atomically.
Make one nuance explicit because juniors get it wrong: the key must come from the **form**, generated once at render, *not* derived server-side from a hash of the inputs. A server-derived input-hash would dedup two *legitimate* repeat creates that happen to be identical (two real invoices for the same amount on the same day), which is wrong.

**Scope discipline — what this lesson writes vs. defers.** This lesson writes *only* the form-side hidden input (a forward-compatible seam) and names the slot. The full mechanism — the unique constraint, `INSERT ... ON CONFLICT DO NOTHING RETURNING` as atomic check-and-claim, the dedup ledger, the cleanup — is Ch 063.4 ("One pattern, four surfaces"), which applies the exact same pattern to webhooks, actions, jobs, and public endpoints. Make the `LinkCard`/`ExternalResource` to Ch 063 explicit. State the 2026 reflex as the takeaway: every action that creates something **non-recoverable** (charges money, sends mail, ships goods) needs an idempotency key from day one; pure internal CRUD can defer until the bug bites.

**Components:**
- A small visual of the double-submit race — a `Figure` wrapping a hand-built HTML/CSS strip or a 2-step `DiagramSequence`: "without key" (two clicks → two rows) vs "with key" (two clicks, same key → one row, second click returns the first result). Pedagogical goal: show that the key collapses the duplicate, not that it blocks the second click. Keep it small and horizontal.
- One inline `Code` block: the form-side hidden input only —
  ```tsx
  <input type="hidden" name="idempotencyKey" defaultValue={crypto.randomUUID()} />
  ```
  Prose: this is the only piece this lesson writes; the action-side claim lands in Ch 063. (Note `defaultValue`, uncontrolled — consistent with the Ch 044 forms convention, even though forms aren't taught until Ch 044; keep it to the one line.)

**Terms (use `Term`):**
- "idempotent" — definition: running the operation more than once with the same key has the same effect as running it once.

## The complete action, end to end

**Goal:** assemble all five seams into the finished `createInvoice` — the artifact the whole chapter has been building and the one Ch 047 extends. This is the payoff beat: the student sees the whole thing, in order, once.

Frame it as the closing assembly: every seam has now been taught (parse → L2, authorize → one-line for now/Ch 057, mutate+transaction → this lesson, revalidate → this lesson, return → L3). Present the complete action and walk the five seams in sequence so the ordering is cemented as a single mental template.

Be explicit about what is real vs. still-stubbed so downstream agents and the student aren't misled (continuity: the non-working-skeleton convention ends here for the seams this chapter owns):
- parse, mutate (transaction), revalidate, return are **real**.
- authorize is still the one-line user check / `getCurrentUser()` used abstractly — the `authedAction` wrapper and session read are Ch 057.
- external side effects (email send) appear as a single line *after* the commit, marked as the Ch 066/Ch 048 concern.

**Components:**
- `AnnotatedCode`, the full assembled action, `maxLines` ~16 (scrolls if longer), one step per seam — this is the spine made concrete:
  1. parse — `safeParse(Object.fromEntries(formData))`, branch on `parsed.success`, `return err('validation', ...)` (color, points back to L2/L3).
  2. authorize — the one-line `getCurrentUser()` / user check; annotate "Ch 057 lifts this into `authedAction`."
  3. mutate — the `db.transaction` block, `tx`-threaded inserts (this lesson).
  4. revalidate — `revalidatePath('/invoices')`, after the commit, before the return (this lesson; call out the ordering one last time).
  5. return / redirect — `return ok({ id })` or `redirect('/invoices/' + id)`, last, outside any catch.
  Keep each step's prose to one paragraph; the goal is recognition of the template, not new teaching.
- `Sequence` ordering drill (capstone check): shuffled seam lines — `safeParse` the FormData; check the current user; `db.transaction` the inserts; `revalidatePath('/invoices')`; `redirect` to the new invoice. Source order is correct order. `instructions`: "Order the bodies of a Server Action that creates an invoice and sends the user to its detail page." This makes the student *commit* to the ordering they've been told matters, and the wrong-slot marking surfaces the exact sequencing mistakes the lesson warned about (revalidate before mutate, redirect not last). Optionally include the action signature as the fixed code block above the steps.

## External resources (optional, end of lesson)

`ExternalResource`/`LinkCard`s, only if they add signal beyond the inline links already placed:
- Next.js docs — `revalidatePath`.
- Next.js docs — `redirect`.
- Drizzle docs — transactions.
Keep to three at most; the in-section `LinkCard`s to Ch 032.6, Ch 039.4, and Ch 063.4 are the load-bearing cross-references.

# Scope

**Prerequisites — redefine in one half-sentence each, do not re-teach:**
- The five-seam shape `parse → authorize → mutate → revalidate → return` (L1; the spine this lesson completes).
- The `Result<T>` shape, `ok`/`err`, and throw-vs-return (L3; this lesson *returns* and *redirects*, doesn't re-derive the model).
- `safeParse(Object.fromEntries(formData))` on entry (L2).
- Thin action / pure-`/lib` / `db/queries` helpers taking `tx` (L4; reused, the `tx`-first-param contract pays off here).
- `'use cache'` / cached reads exist (Ch 032; assumed, not re-explained).
- `db.transaction` machinery exists read-side (Ch 039.4; reused, not re-taught).

**Explicitly out of scope (belongs to other lessons — name once, link, do not teach):**
- The full cache-invalidation decision tree: `updateTag`, `revalidateTag(tag, profile)`, `router.refresh` — Ch 032.6 (and the SaaS-pattern depth in a later Unit). This lesson teaches `revalidatePath` only.
- Transaction isolation levels, savepoints/nested transactions, `SELECT ... FOR UPDATE`, the SQLSTATE 40001 retry loop — Ch 039.4. This lesson uses the default flat transaction.
- The idempotency-key *implementation* (unique constraint, `ON CONFLICT DO NOTHING RETURNING`, the dedup ledger, cleanup) — Ch 063.4. This lesson writes only the form-side hidden input.
- Authentication / the `authedAction` wrapper / session read for `organizationId` — Ch 057. The authorize seam stays a one-line abstract check.
- Background jobs and `after()` for durable external side effects — Ch 066.1. This lesson's rule is only "external IO after the commit, outside the transaction."
- Email send / `lib/email.ts` / suppression list — Ch 048. Appears as a single named line after the commit.
- The form layer that consumes the action — `<form action>`, `useActionState`, field-error rendering, `useFormStatus` — Ch 044. The idempotency hidden input is the only form-side line this lesson writes, and it's a forward-compatible seam, not a forms lesson.
- `useOptimistic` and rollback on `ok: false`, optimistic-create-with-redirect interaction — Ch 044.5 / Ch 047.5. Foreshadowed once where `redirect()` is taught.
- The writable `headers()` surface inside a Server Action (appending response headers) — the chapter outline names it once at this seam, but it's a niche security-headers concern with no payoff in the create-invoice flow; **cut** from the body to protect cognitive load, or demote to a single one-sentence aside at most. Depth lives in the security/headers chapter. (Flagging the deliberate cut for downstream agents.)
- The Postgres unique-violation detection helper `isUniqueViolation` — Ch 039 owns the implementation; L3 owns its use in catch-map-rethrow. Reference abstractly if a transaction `catch` appears; do not implement.

# Notes for downstream agents

- Architectural-Principle work is **done** in earlier lessons — this lesson *applies* #5 (framework conventions: `revalidatePath`, `db.transaction`, `redirect` are platform seams) and reinforces the code-conventions five-seam shape. Do not re-introduce a principle as if new.
- Running entity is fixed chapter-wide: `createInvoice` / `invoicesTable` / `Promise<Result<{ id }>>`. Do not rename.
- The continuity convention of a "deliberately non-working skeleton" (L1→L4) **ends here** for the mutate and revalidate seams — those are now real, working code. The authorize seam remains abstract (Ch 057) and is the only intentionally-stubbed part of the assembled action.
- Drizzle import/version notes inherited from earlier lessons: snake-case casing is set on the `db` client; `db/queries` helpers take `tx` as the first arg. Don't restate Drizzle setup; assume it.
- `crypto.randomUUID()` is the form-side key generator (Web Crypto, available in the browser); the action-side claim is Ch 063 — keep the form input to one line.
