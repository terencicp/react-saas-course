# Lesson 7 — Server Actions through the full wrapper

## Lesson title

- Title: `Server Actions through the full wrapper`
- Sidebar label: `Server Action tests`

## Lesson framing

This is the **composition lesson** of the chapter. Lessons 1–6 built and taught every primitive in isolation; this lesson assembles them into the single most common file in the integration suite — the Server Action test — and proves that the action's *whole contract* holds end to end. The student already owns every piece: `withRollback` + `tx` (L1), the per-worker DB (L2), `signedInAs` / `anonymous` (L3), the wire-mocking rationale (L4), MSW mechanics (L5), and the inbound-webhook shape (L6). Nothing new is *built* here; the lesson's job is to teach the **assembly discipline** and the **assertion surface** of an action test.

**The senior question that frames the whole lesson.** An exported Server Action does five things behind one call: parse input, authorize the caller, mutate Postgres, revalidate a cache path, return a typed `Result`. A unit test of the inner body skips four of those five. The reach: **test the exported action exactly as production calls it**, so the wrapper, the session resolution, the revalidate, and the typed return are all under test in one go. The mental model the student should leave with: *the action export is the unit of integration; arrange identity with a fixture, act through the real wrapper against `tx`, assert on three independent axes (return / DB rows / cache spies).*

**The branch matrix is the spine.** One action gets one `describe`; each documented behavior gets one `it`. The canonical branch set for the running `createInvoice` action is: happy path, validation failure, unauthenticated, insufficient role, and (for the outbound sibling) an action that calls Stripe. The student should finish able to *enumerate the branches an action owes* and write the test for each by reflex — this is the same "every behavior earns a test" discipline from Ch 087 L6, now at the integration seam.

**Critical correction carried throughout (diverges from the chapter outline).** The chapter outline describes an `'UNAUTHENTICATED'` `Result.err` branch and a `'PLAN_REQUIRED'` branch with SCREAMING_CASE codes. Neither matches the shipped codebase and **both must be corrected**:
- The project's auth ladder (`requireOrgUser` → `requireUser`, Ch 052/057) **redirects** on a missing session — it does *not* return `err('unauthenticated')`. So the unauthenticated path of a Server Action **throws `NEXT_REDIRECT`**, and the test asserts the *throw*, not a `Result`. This is the single most important teaching beat that the outline got wrong, and it is the natural home for the `redirect()`/`NEXT_REDIRECT` assertion topic the outline assigned to this lesson.
- The shipped `authedAction` wrapper is **session + role + schema, deliberately nothing more** (Ch 057 is explicit: no plan check in the wrapper). There is **no `PLAN_REQUIRED` transport code**. A plan/entitlement gate lives *inside the action body* and returns a domain `err(...)`. The lesson keeps the `signedInAs({ plan })` fixture parameter meaningful by testing a *body-level* entitlement refusal that returns `err('forbidden', …)` (or the project's domain code), but it must not invent a wrapper-level plan gate or a `PLAN_REQUIRED` code.
- All `Result` error codes are **lowercase**: `'validation'`, `'forbidden'`, `'conflict'`, `'not_found'`, `'internal'`. Never the outline's SCREAMING_CASE. Assert on `result.error.code`, never `result.error.userMessage`.

**The shipped call shape is load-bearing — match it exactly.** From the shipped L3 the project's actions are called `await createInvoice(input, { db: tx })` — a *parsed input object* plus an options-object `{ db }` handle that threads `tx` (the L1 explicit-handle pattern). Do **not** show the Ch 057 `FormData` call shape in this lesson's tests; the chapter adapted the wrapper to take a parsed object + `{ db }` so `tx` can be threaded. The outbound sibling is `createSubscription({ priceId: 'price_pro_monthly' }, { db: tx })`. Treat `authedAction`'s implementation as already-known (Ch 046/057); this lesson imports and *uses* it, never re-derives it.

**Tone.** Adult, terse, senior. No re-teaching of `withRollback`, `signedInAs`, or MSW mechanics — one-line refreshers with forward-pointers only. The lesson reads as "here is how the pieces snap together, and here is the one branch everyone gets wrong."

## Lesson sections

### Introduction (no header)

Open on the senior question. The action under test is `createInvoice`, the same domain the student has watched deepen across the whole chapter. State the five things the action does behind one call (parse / authorize / mutate / revalidate / return), and the gap: a body-level unit test sees one of five. Name the payoff in one sentence — by the end the student writes a complete action-test file (six-to-ten `it` blocks) that exercises every branch the action owes, composing `signedInAs` + `tx` + MSW + cache spies into one test each. Connect explicitly to L3's closing promise ("L7 owns all Server Action assertions beyond the authorize seam"). Keep it warm and short.

### The action test, end to end

**Goal.** Land the *complete happy-path test* first, as the template every later branch is a variation of. Showing the whole shape once, then varying one arrange line per branch, is the lowest-cognitive-load path — the student internalizes the skeleton, then each subsequent section is a single diff.

**Content.**
- Restate the action at its wrapper shape (the exact block from L3, ~8 lines) so the seams are legible — `createInvoice = authedAction('member', createInvoiceSchema, async (input, { user, orgId, db }) => { … insert … return ok(invoice) })`. One line: "you built this wrapper in Unit 10; here you test what it produces."
- Walk the canonical happy-path test with **AnnotatedCode** (one code block, focus moves across its parts — exactly the multi-part-focus case AnnotatedCode exists for). The block:
  - `withRollback(async ({ tx }) => { … })` body — one-line refresh: "test runs in a transaction that rolls back; `tx` is the handle."
  - Arrange: `const ctx = await signedInAs({ role: 'admin', plan: 'pro' }, tx)` — one-line refresh that this inserts user/org/membership/session and stubs the session seam.
  - Act: `const result = await createInvoice({ amount: 4200, currency: 'eur' }, { db: tx })` — emphasize input-object + `{ db: tx }` handle; this is the production call shape with `tx` substituted for the default `db`.
  - Assert axis 1 (return): `expect(result).toBeOkResult({ id: expect.stringMatching(/^inv_/) })` — the custom matcher from Ch 087 L6; assert *shape*, never an exact sequence id (L1 rule).
  - Assert axis 2 (DB row): re-read through the same `tx` — `const [row] = await tx.select().from(invoices).where(eq(invoices.orgId, ctx.org.id))` — and assert the persisted values. Stress: the read uses **the same `tx`** so it sees the action's uncommitted write; a read on the global `db` would see nothing.
  - Assert axis 3 (revalidate): `expect(revalidatePath).toHaveBeenCalledWith('/invoices')` (the spy is installed in setup, next section).
- **Annotated steps emphasis:** the three independent assertion axes. A 200-equivalent `ok` does *not* prove the row was written, and a written row does *not* prove the cache was revalidated — each axis catches a different regression. This three-axis framing is the lesson's core mental model and should be stated explicitly here.

**Diagram — the three assertion axes.** A small **`Figure`** wrapping a hand-coded HTML "three-lane" card (HTML+CSS per the diagrams index for color-coded callouts; this is a simple visual aid, not a system graph). One call (`createInvoice(...)`) fans out to three labeled assertion targets: **Return** (`Result.ok` / `.err`), **Database** (`tx.select` rows), **Cache** (`revalidatePath` spy). Caption: "One call, three independent things to verify — each axis catches a regression the others miss." Pedagogical goal: cement that the action test is not one assertion but three orthogonal checks. Keep it compact and horizontal (vertical-space constraint).

### Wiring the framework mocks once

**Goal.** Show the three module mocks an action test depends on and *where they live*, so per-test sections can assume them. Centralizing this once (in the integration `setupFiles`) and setting per-call values in the body is the same register-once / set-per-call discipline the student met for the auth seam in L3 — call that parallel out explicitly to reduce it to a known pattern.

**Content.**
- Three mocks, named with their seam and reason:
  - `next/headers` (`cookies`) — already registered in L3's setup; the wrapper reads cookies. One line, forward-reference L3.
  - `@/lib/auth` (`auth.api.getSession`) — already registered in L3's setup; this is *the* session seam. The fixture sets its per-call value; `anonymous()` sets it to `null`. One line, forward-reference L3.
  - `next/cache` (`revalidatePath`, `revalidateTag`, `updateTag`) — **the one this lesson adds.** Mock so the action's cache call becomes a spy the test asserts on, and so a real cache invalidation doesn't run against a non-existent router in the test process.
- **Code** (single block) showing the `next/cache` mock as it sits in `setupFiles`: `vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), updateTag: vi.fn() }))`. Note these are `vi.fn()` placeholders; `afterEach(() => vi.clearAllMocks())` (or the existing `resetAllMocks` from the clock seam) keeps call-history from leaking between tests — forward-crumb to L8's mock-leak taxon.
- **Next.js 16 signature accuracy (must be correct).** When the lesson shows or discusses the cache calls themselves:
  - `revalidatePath(path)` — single argument. This is what the running `createInvoice` calls and what the happy-path test asserts.
  - `revalidateTag(tag, profile)` — the `cacheLife` profile is **required as the second argument** in Next.js 16; the single-arg form is deprecated and a TypeScript error. If any example asserts a tag revalidation, it must be `expect(revalidateTag).toHaveBeenCalledWith('invoices', 'max')` (`'max'` is the senior default).
  - `updateTag(tag)` — the read-your-writes-within-the-request companion (synchronous in a Server Action). Mention only as the third spy; do not build a scenario on it unless natural.
- **CodeTooltips** candidate on this block: short inline notes on `revalidatePath` ("path-scoped cache invalidation; single arg") and `revalidateTag` ("Next 16 requires a cacheLife profile as the 2nd arg; 1-arg form is a TS error").

### Validation failure: the wrapper short-circuits before the body

**Goal.** First branch variation. Teach that an invalid input never reaches the mutate body — the wrapper's parse gate returns `err('validation', …)` and the DB stays untouched.

**Content.**
- One **Code** block (a single `it`): arrange `signedInAs(...)`, act `createInvoice({ amount: -1, currency: 'xyz' }, { db: tx })`, assert `toBeErrResult('validation')`, assert `result.error.fieldErrors` is present (asymmetric matcher `expect.any(Object)` — value is wording, presence is contract; echo Ch 087 L6), and assert **zero rows** written (`tx.select` returns empty). 
- Prose: the parse gate fires *before* the body, so "no DB write" is the structural proof the short-circuit worked. Assert the **code**, not the per-field message strings (those are localizable copy).

### Unauthenticated: the action redirects, it does not return an error

**Goal.** This is the lesson's headline correction and the natural home for the `redirect()` / `NEXT_REDIRECT` topic. It is the branch beginners model wrong, so it gets its own section and the most careful treatment.

**Content.**
- State the surprise up front, against the student's likely intuition: you might expect an unauthenticated call to return `err('unauthenticated')`. **It doesn't.** The project's `requireUser`/`requireOrgUser` (Ch 052/057) *redirect* a session-less caller to sign-in — a redirect is a navigation, not a value — so calling the action with no session **throws `NEXT_REDIRECT`** out of the wrapper before the body runs. The action's `Result` contract only covers failures the *body* can produce; a missing session is handled one layer up by a throw.
- Why `redirect()` throws (one tight paragraph, sourced): `redirect()` aborts execution by throwing a sentinel error whose `digest` is `NEXT_REDIRECT;<type>;<url>;<status>;`. Next.js relies on that throw propagating; the action must *not* swallow it.
- **CodeVariants** (two tabs, before/after — the intuition vs the reality, which is the case CodeVariants is for):
  - Tab "What you'd expect (wrong)": `anonymous(); const result = await createInvoice(input, { db: tx }); expect(result).toBeErrResult('unauthenticated');` — prose: this never even reaches the assert; the act *throws*, so the test errors at the act line. There is no `'unauthenticated'` code in this codebase.
  - Tab "What actually happens (right)": arrange with `anonymous()` (sets `getSession` → `null`), then `await expect(createInvoice(input, { db: tx })).rejects.toThrow('NEXT_REDIRECT')`. Prose: assert the *throw*, and (optional second assertion) inspect the digest — `err.digest.startsWith('NEXT_REDIRECT;')` — to prove it's a redirect and not some other error. Do **not** mock `redirect`; let it throw and assert the throw. Assert **zero DB writes** too — the redirect fired before the body.
- Mention `isRedirectError(error)` (from `next/navigation` / Next internals) as the production-grade predicate the digest-prefix check stands in for, so the student recognizes it; the `rejects.toThrow('NEXT_REDIRECT')` form is the simple test-side reflex.
- **Tie-in:** a Server Action that *itself* calls `redirect()` on success (e.g. a create-then-redirect action) is tested the same way — `rejects.toThrow('NEXT_REDIRECT')` plus a DB-row assertion to prove the write happened before the redirect. Show this as a one-paragraph note, not a second full block, so the student sees the pattern generalizes to deliberate redirects, not just the auth bounce.

**Aside (caution).** A `try/catch` around an action call in *production* code that swallows the redirect error breaks navigation — the same `NEXT_REDIRECT`-must-propagate rule the student saw conceptually in Ch 057. In tests, `rejects.toThrow` is the safe way to observe it without swallowing.

### Insufficient role: the authorize gate refuses in place

**Goal.** The third wrapper branch. Distinguish *refuse-in-place* (returns `err('forbidden')`) from *redirect* (the previous section) — same `roleAtLeast` check, opposite exit, the exact distinction Ch 057 drew between a guarded page and a wrapped action.

**Content.**
- One **Code** block (single `it`): arrange `signedInAs({ role: 'member' }, tx)` against an action that requires `'admin'` (use a deletion/admin action in the same domain, e.g. `archiveInvoice` or `deleteInvoice`, requiring admin — or state the `createInvoice` floor as `'admin'` for this example and keep it consistent). Act, assert `toBeErrResult('forbidden')`, assert zero DB writes.
- Prose contrast, two sentences: the wrapper *returns* `err('forbidden')` for an authenticated-but-underprivileged caller (so the UI can render "you don't have permission" in place), but *throws a redirect* for an unauthenticated one (so the user is sent to sign in). Same gate family, two exits — name why each fits its case.

### Plan-gated branch: an entitlement check inside the body

**Goal.** Test a body-level entitlement refusal, keeping the `signedInAs({ plan })` parameter meaningful **without** inventing a wrapper-level plan gate or a `PLAN_REQUIRED` code (the correction from the framing).

**Content.**
- Frame honestly: the `authedAction` wrapper is session + role + schema and *nothing more* (Ch 057). A plan/entitlement check therefore lives **inside the action body**, early, and returns a domain `err(...)` — the wrapper passes that `Result` straight through. So a plan test is really a body-logic test reached through the full wrapper.
- One **Code** block: arrange `signedInAs({ plan: 'free' }, tx)` on an action whose body refuses free-plan callers (a pro-only feature). Act, assert the *body's* error code — use `toBeErrResult('forbidden')` (the transport code the body returns for a refused entitlement) and, if the project carries a domain reason string, assert it via the error payload, not the user message. Assert zero side effects.
- One sentence on placement: the entitlement check belongs at the top of the body, before any write, so it fails as cheaply as the wrapper's own gates.

### Outbound HTTP inside the action: the full stack in one test

**Goal.** The capstone composition — an action that mutates the DB *and* calls a third party, tested end to end with MSW. This is where every chapter primitive appears in a single test, which is the lesson's high point.

**Content.**
- The action is `createSubscription({ priceId }, { db: tx })` (the L4/L5 outbound sibling): it posts to Stripe and writes a subscription row.
- One **Code** block (single `it`) showing the full arrange/act/assert:
  - Arrange identity: `signedInAs({ plan: 'pro' }, tx)`.
  - Arrange the wire: register an MSW override for `POST /v1/subscriptions` returning a canned subscription, capturing the request via the L5 `seen` / `request.clone()` pattern (one-line refresh, forward-reference L5 for mechanics).
  - Act: `await createSubscription({ priceId: 'price_pro_monthly' }, { db: tx })`.
  - Assert all four axes in one test: (1) `toBeOkResult(...)` return; (2) the **intercepted request** — `await seen[0].text()` decodes the Stripe form body, assert `metadata` fields and the `Idempotency-Key` header (the L4/L5 wire-shape point); (3) the **DB row** via `tx.select`; (4) the **cache** spy if the action revalidates.
- Prose: this single test is the chapter in miniature — real DB (L1/L2), real identity (L3), real wire mock (L4/L5), typed return (Ch 043/087) — all asserted at once. Reinforce: assert the *intercepted request*, never the SDK method call (L4 rule).

**Diagram — the composed test.** A **`DiagramSequence`** (the scrub-through-steps component) walking one `createSubscription` test as a temporal sequence: **arrange identity → arrange wire → act (call the export) → wrapper authorizes → body writes row in `tx` → body calls Stripe (MSW intercepts) → return `Result.ok` → rollback**. Each step shows which primitive is live. Pedagogical goal: make the *order of execution through the full stack* concrete, and show where each chapter primitive sits in the flow. This is the one place a step-by-step animation earns its weight, because the value is seeing the layers fire in sequence. (Alternative if a sequence feels heavy: a single static `Figure`+HTML "stack" diagram of the same layers — but the temporal version is preferred for a capstone.)

### One file, one action, every branch

**Goal.** Zoom out from individual `it` blocks to the *file* as a unit, and give the student the enumeration reflex: given an action, list the branches it owes.

**Content.**
- File convention: `src/server/actions/createInvoice.int.test.ts` colocated with `createInvoice.ts`; the `.int.test.ts` suffix routes it to the integration project (L1). One `describe` per action; one `it` per branch. Six-to-ten `it` blocks per file is healthy.
- **FileTree** (Starlight) showing the colocation: the action file and its `.int.test.ts` sibling under `src/server/actions/`, with the shared `src/test/` fixtures (`fixtures/auth.ts`, `db/with-rollback.ts`, `msw/server.ts`) they import. Pedagogical goal: situate the new file among the primitives it composes.
- The branch checklist for `createInvoice`, as a tickable **Checklist** (or prose list if Checklist feels heavy): happy path · validation failure · unauthenticated (redirect) · insufficient role · (outbound action only) third-party call. Frame as the reviewer reflex — "open an action test and check every branch has its `it`," echoing Ch 087 L6's audit pass.
- **Watch-outs woven into this section** (not bundled at the end — each sits with the concept it qualifies, but several are file-level so they live here): barrel/`index` imports pull Next runtime into the test bundle → import the action directly; every act is `await`ed or it races the rollback; reusing one `signedInAs` context across two `it` blocks shares mutable user state → call the fixture inside each test; mocking `db` instead of threading `tx` defeats the integration (the L1 silent-commit bug).

### Cross-action workflows in one transaction

**Goal.** Short closing technique — two actions in sequence inside one `tx`, where the second sees the first's writes. Demonstrates that `tx` is a shared, consistent view across multiple acts.

**Content.**
- One **Code** block (single `it`): a two-act narrative — e.g. `createInvoice(...)` then `markInvoicePaid(...)` (or `createSubscription` then an update) — both called with `{ db: tx }`. The second action reads the row the first wrote, because they share the same transaction. Assert the final combined state.
- Prose: this is how you test a *workflow*, not just an action, while keeping perfect isolation — everything still rolls back. Keep it to one block plus two sentences; it's a capstone flourish, not a new pillar.

### Exercise — write the failure branches

**Goal.** Active practice of the lesson's core skill: choosing the right assertion for each branch.

**Approach.** Per the project memory, `ReactCoding` can't load npm (no Vitest/Stripe in-iframe), so a real `.int.test.ts` against Postgres+MSW cannot run in-browser. Use a **`ScriptCoding` with `runner="sandpack"`** and lightweight shims — the exact pattern shipped in Ch 087 L6 and Ch 088 L3 (a fake `db`/`tx` store, a stubbed `signedInAs`/`anonymous` returning canned contexts, an in-memory action double that mimics the wrapper's parse→authorize→body→return order, and `redirect` modeled as a thrown `NEXT_REDIRECT` error). The student *writes the assertions*, which is the transferable skill; the runner verifies them against the shim.
- **Starter:** a happy-path test written and green, plus three empty `it` blocks to fill: validation-fail, unauthenticated (must assert the **throw**, not a Result — this is the branch the exercise most wants to drill), insufficient-role.
- **Grading criteria** (state for the builder): validation test asserts `err` with `code: 'validation'` and zero writes; unauthenticated test uses `rejects.toThrow('NEXT_REDIRECT')` (or catches and asserts the digest prefix) and asserts no write; role test asserts `err` with `code: 'forbidden'` and no write. The grader's hidden tests pin exactly these.
- Provide a `<details>` reveal-solution block.
- Instructions must tell the student: assert on `code`, never `userMessage`; the unauthenticated path *throws*, so use `rejects.toThrow`/`try-catch`, not an `err` assertion.

### Recap / where this goes (no header or short header)

One short paragraph: the action-test shape is now the student's default for the most common file in the suite — arrange identity, act through the wrapper against `tx`, assert return + DB + cache, and remember the unauthenticated branch *throws* rather than returns. Forward-pointer: L8 turns the reset discipline these tests rely on (mock-history, MSW handlers, `tx` rollback) into the flake taxonomy. Brief mention that component-level form tests (Ch 089) and browser E2E (Ch 090) cover the *other* sides of the same action.

### External resources

`ExternalResource` LinkCards (two to three, no more):
- Next.js `redirect` function reference (the `NEXT_REDIRECT` / digest behavior).
- Next.js `revalidateTag` reference (the Next-16 required-profile signature).
- Optionally the Vitest mocking guide (`vi.mock` / `vi.mocked` / `vi.fn`).

## Terms for Tooltip (`Term` / `CodeTooltips`)

Be strategic — only terms that support the lesson's goals and aren't already defined in earlier chapter lessons (`seam`, `false negative`, `aliasing`, `CookieJar`, `withRollback` are already established; one-line refreshers only, no `Term`):
- **`NEXT_REDIRECT`** — the sentinel error `redirect()` throws to abort execution and signal a navigation; carries a `digest` of the form `NEXT_REDIRECT;<type>;<url>;<status>`.
- **assertion axis** — one of the three independent things an action test verifies: the returned `Result`, the DB rows (read through `tx`), and the cache-revalidation spies.
- **`Idempotency-Key`** — SDK-generated header (re-explain briefly; defined in L4) — only if it appears in the outbound section and a refresher aids flow.
- **branch matrix** — the set of documented behaviors one action owes a test (happy, validation, unauthenticated, forbidden, …).
- **`revalidatePath` / `revalidateTag`** — `CodeTooltips` inline on the `next/cache` block (signatures + Next-16 profile rule), not full `Term`s.

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- `withRollback` / `tx` (L1): test body runs in a transaction, rolls back unconditionally; `tx` is the handle threaded via `{ db: tx }`.
- Per-worker DB (L2): the real Postgres `tx` runs against; assumed, not discussed.
- `signedInAs` / `anonymous` (L3): one call inserts identity + stubs the session seam (`auth.api.getSession`); `anonymous()` sets it null.
- MSW mechanics (L5): `server.use`, `request.clone()` + `seen` capture, `onUnhandledRequest: 'error'` — referenced, mechanics not re-taught.
- `Result` (Ch 043) and `toBeOkResult`/`toBeErrResult` (Ch 087 L6): used as-is.
- `authedAction` implementation (Ch 046/057): **imported and used, never re-derived.** The wrapper's internals (the four gates) are out of scope.

**Out of scope (defer with a pointer, do not cover):**
- `authedAction` internals / the four gates — Ch 046/057.
- The `Result` type's definition and matcher *implementation* — Ch 043 / Ch 087.
- MSW setup and full API surface — L5.
- Auth-fixture construction — L3.
- The transaction wrapper's construction — L1.
- Inbound webhook receiver testing (signature verification, `processed_events`) — L6 (and the inbound/outbound line must stay sharp: this lesson is the *action* seam; webhook receivers were L6).
- The AsyncLocalStorage escape hatch — explicitly **not** the tool for Server Actions (the explicit `{ db: tx }` handle is correct here); ALS is L6's route-handler tool only. State this once if a student might reach for it.
- Component-level / form `useActionState` tests — Ch 089.
- Browser E2E of the same action through the UI — Ch 090.
- Server Action security at depth (CSRF, Origin/Host) — Unit 8 (the fixture already sets the Origin/Host headers per L3; the test does not re-litigate CSRF).
- Flake taxonomy / the reset discipline as a named subject — L8 (forward-crumb the mock-history and handler resets only).
- Plan/entitlement *system* design — a later unit; this lesson only tests a body-level refusal, it does not design the entitlement layer.

## Notes for downstream agents

- **Match the shipped call shape exactly:** `await action(inputObject, { db: tx })`. Do not show the Ch 057 `FormData` action shape — the chapter's actions take a parsed object + `{ db }` handle (confirmed in the shipped L3 test). If unsure about a specific action's signature, ground it against `src/content/docs/088 …/3 signedInAs fixture.mdx` and `4 Mock the wire.mdx` before writing.
- **Codes are lowercase** (`'validation'`, `'forbidden'`, …). The chapter outline's SCREAMING_CASE codes and its `'UNAUTHENTICATED'` / `'PLAN_REQUIRED'` branches are wrong for this codebase — follow the corrections in the framing.
- The unauthenticated branch **throws `NEXT_REDIRECT`**; it does not return a `Result`. This is the headline correction; do not soften it back toward the outline.
- Keep the running domain `createInvoice` / `invoices` for DB-side examples and `createSubscription` for the outbound example — continuity with the whole chapter.
- `revalidateTag` second-arg profile is required in Next 16 (`'max'` default); `revalidatePath` is single-arg; `updateTag` is the read-your-writes companion. Keep all three signatures accurate if shown.
