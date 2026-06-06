# Thin actions, pure /lib

- Title: Thin actions, pure /lib
- Sidebar label: Thin actions, pure /lib

---

## Lesson framing

This is the **architecture lesson** of the chapter. L1-L3 built one growing `createInvoice` action body — parse, then conflict-check, then `db.insert`, then map errors to `Result`. By now that body is long enough to ask the senior question this lesson answers: **where does each line belong, and do twenty actions justify inventing a wrapper?** The lesson introduces two Architectural Principles at the exact moment they earn their weight — #3 (pure functions in `/lib`, side effects at named boundaries) and #5 (use the framework's conventions, don't invent parallel ones) — and names the two future carve-outs (auth wrapper Ch 057, billing interface Ch 064) that are the *sanctioned* exceptions to #5.

Pedagogical posture (from guidelines + the chapter's established voice):

- **Decisions over syntax.** This is a "decision archetype" lesson per the chapter outline — almost no new API surface. The deliverable is a *mental model* and a *directory shape*, not a new function the student calls. Code samples illustrate the slicing decision; they are not the point.
- **This is a refactor lesson, so teach it as a refactor.** The single strongest pedagogical move: take the fat L3 action body the student already knows and *split it* before their eyes (before → after). The student feels the win (the action becomes scannable; the math becomes unit-testable) rather than being told it. Lead with the fat body as the pain.
- **The two principles are the spine.** Principle #3 answers "extract to `/lib`?"; Principle #5 answers "extract a wrapper?". Teach #3 first (the constructive move — pull pure logic out), then #5 (the *restraining* move — don't pull the orchestration into a clever abstraction). #3 says "split *down* into helpers"; #5 says "don't build *up* into a framework." Students conflate these — make the contrast explicit.
- **Where beginners go wrong (the watch-outs that matter most).** (1) The `/lib` helper that imports `db` or `cookies()` — they think "it's a helper, helpers go in `/lib`" and smuggle a side effect in, killing the testability that was the whole point. (2) Passing `db` as a parameter to a "pure" helper (`createInvoice(db, data)`) — looks like DI, but the function is now impure the moment it can write. (3) After the third near-identical action body, the overwhelming urge to write `safeAction(schema, fn)`. Name this urge explicitly as the smell — the student *will* feel it, and a real, well-built library (`next-safe-action`) exists, so "just don't" is not enough; they need the *reason* (it costs platform static analysis + call-site visibility + a custom DSL) and the *threshold* where it flips.
- **The mental model to leave with.** Three sentences. (a) Side effects fire at three named boundaries only — Server Actions, route handlers, background jobs; everything else is a pure function of inputs to outputs. (b) The action body is *thin orchestration*: parse → authorize → call `/lib` → revalidate → return; if it grows past ~30 lines the next extraction is a `/lib` helper, never a new abstraction layer. (c) The one decision rule: *does this function touch a database, cache, queue, or external API? Yes → it's a boundary (action). No → it's a `/lib` helper.*
- **Real production stakes.** Frame the payoff concretely: the same `calculateInvoiceTotal` feeds an action today, a CSV-export job (Ch 067) and a route handler (Ch 046) later — one place to fix a money bug. Tests run without a database. A reviewer scans the action in seconds because it reads as a sequence of named calls. These are the wins the student should *anticipate*, named here, paid off across the unit.
- **Cognitive-load management.** Start simple: one fat action, split into one pure helper. Add the repository (data-access) and policy (authorization predicate) layers only after the pure-calc split has landed. Introduce the wrapper temptation last, once the directory shape is stable, so the "don't" has a concrete shape to argue against.

Running example stays chapter-wide: `createInvoice` / `invoicesTable` returning `Result<{ id: string }>`, with `ok`/`err` and `Result` already imported from `@/lib/result` (L3). Do **not** redefine `Result`. This lesson's new files are `/lib/invoices/calculate-total.ts` (pure), `/lib/invoices/repository.ts` (the only file importing `db`), `/lib/invoices/policy.ts` (pure predicate), and the thin `/app/.../actions.ts`.

---

## Lesson sections

### Introduction (no header)

Warm, brief, second-person, matching the chapter voice. Open on the concrete pain: the `createInvoice` body the student has been building across three lessons now does parsing, a uniqueness check, a total calculation, the insert, and error mapping — and it's getting hard to scan. State the senior question implicitly: every line in there is *some kind* of work, but the kinds are different — some is pure logic (compute a total), some is a side effect (write a row), some is orchestration (decide what runs when). Preview the payoff: by the end the student can look at any line of an action and say "that belongs in `/lib`" or "that stays in the body," and knows why the course doesn't wrap actions in a generic helper. Connect to what they know: they already write `Result` and `safeParse`; this is about *where the code that produces them lives*.

Reasoning: the chapter's intros all lead with a concrete failure/pain and end with a one-line thesis + a "by the end you'll be able to…". Match that exactly. No "in this lesson we will learn" scaffolding.

### The action body that grew too big

**Goal:** make the pain visceral before naming the cure. Show the fat action, then diagnose it.

Content:
- Present the assembled L3-style `createInvoice` body in full — parse, authorize stub, a uniqueness check, an inline total calculation over the line items, the `db.transaction`/insert, the catch-map, the return. Deliberately let it be ~35-45 lines so the length *is* the argument. (Transactions/revalidate are L5's; here show them as the existing one-line shapes from L3 or as a `// L5: revalidate` comment — flag in prose that the post-write seams are L5's, do not pre-teach them.)
- Diagnose it out loud, naming **three different kinds of code tangled together**: pure logic (the total math — same inputs always give same output, no IO), side effects (the DB read for the uniqueness check, the DB write), and orchestration (the sequencing + the `Result` branching). The insight: these have different testability, different reuse, and different reasons to change — tangling them is the smell.
- **Component:** `AnnotatedCode` over the fat body. Steps tint the three kinds in three colors — e.g. green for the pure total math, red/orange for the IO lines (`db.select`, `db.insert`, the future `cookies()` read), blue for the orchestration/return spine. Goal: the student *sees* three colors interleaved in one function and feels the tangle. This sets up every later section as "untangle one color into its own home."
- Close with the question the rest of the lesson answers: which lines move out, where do they go, and what stays.

Reasoning: AnnotatedCode is the right tool — one complex block, attention directed to specific parts in sequence. Coloring by *kind of code* (not by line role) is the load-bearing idea; the colors recur as the organizing metaphor.

### Principle #3 — pure logic in /lib, side effects at named boundaries

**Goal:** introduce Architectural Principle #3 as the rule that untangles green (pure) from red (IO).

Content:
- State the principle plainly, in a callout sized to its weight (this is a load-bearing course principle, introduced here): **business logic is a pure function of its inputs to its outputs (or to a typed `Result`), free of `cookies()`, `headers()`, `db`, or HTTP calls. Side effects fire only at named boundaries.** Name the three boundaries in this course: **Server Actions, route handlers (Ch 046), background jobs (Ch 066)** — everything else is pure. Use a `:::note` or `:::tip` Aside, not a section, so it reads as a principle introduced inline.
- Define "pure" concretely for a student who may half-remember it: same inputs → same output, every time; no reaching outside the arguments for state; no leaving a mark on the world. The total calculation qualifies; the DB read does not.
- **Do the extraction.** Pull the green math out of the fat body into `/lib/invoices/calculate-total.ts` — a pure `(lines: LineItem[]) => Money` function. Show the new file and the now-shorter action body that calls it.
- **Component:** `CodeVariants` with two tabs — **Before** (the relevant slice of the fat body with the inline math) and **After** (the `/lib/invoices/calculate-total.ts` file + the one-line call site in the action). Each tab's prose explains what moved and why. This before/after is the canonical use of CodeVariants and the emotional core of the lesson — the action body visibly shrinks.
- Spell out the three concrete wins, framed as production stakes the student will *feel* later in the unit (tie each to a real future use):
  1. **Tests run without a database.** `calculateInvoiceTotal` takes line items, returns money — a pure unit test, no DB, no mocks. (Forward-ref: Vitest unit project, Ch on testing.)
  2. **One helper, many boundaries.** The same function feeds today's action, tomorrow's CSV-export job (Ch 067), a route handler (Ch 046). One place to fix a money-rounding bug.
  3. **The action reads as a sequence.** A reviewer scans parse → authorize → call `/lib` → revalidate → return without re-deriving the math.
- **Watch-out (inline, in this section):** the inverted anti-pattern — a `/lib` helper that imports `db` or calls `cookies()` has been *mis-sliced*. The fix is not "move it back," it's "the pure part stays in `/lib`, the side effect moves to the boundary." Show a one-line bad example (`/lib/invoices/save.ts` importing `db`) and name why it's wrong: it can no longer be tested without a database, and `/lib` is now a place side effects hide.

Reasoning: #3 is the constructive principle, taught first so the student does the satisfying extraction before being asked to *restrain* themselves (#5). CodeVariants before/after is the highest-impact component for a refactor. The "three wins" must be concrete and forward-linked, per the guidelines' production-stakes filter.

### The three layers under a feature

**Goal:** generalize the single extraction into the course's standard per-feature layout — pure helpers, the repository, the policy.

Content:
- Now that one pure helper is out, name the other two kinds of `/lib` file the course settles on per feature, so the student has a complete home for every line:
  - **`/lib/invoices/calculate-total.ts`** (and siblings) — pure helpers. Logic, no IO.
  - **`/lib/invoices/repository.ts`** — the **data-access layer**: the only file in the feature that imports `db`. Exports verb-led reads/writes (`insertInvoice(tx, data)`, `findInvoiceBySlug(orgId, slug)`). *Note divergence:* code conventions put tenant-scoped *reads* in `db/queries/<entity>.ts`; this lesson uses `/lib/invoices/repository.ts` per the chapter outline. Flag this to downstream agents — either align to `db/queries/` (preferred, matches conventions) or keep `repository.ts` and add a one-line aside that `db/queries/` is the convention name; **recommend aligning to `db/queries/invoices.ts`** to avoid teaching a name the rest of the course doesn't use. Decide and state it once.
  - **`/lib/invoices/policy.ts`** — authorization **predicates**: pure functions of session + target, e.g. `canCreateInvoice(user, org): boolean`. Pure (no session *read* — they take the already-read user as an argument). The *reading* of the session is the side effect and happens at the boundary (full wrapper Ch 057).
- **The action file** sits in `/app/<route>/actions.ts` with file-level `'use server'` — thin orchestration that calls the three layers in sequence.
- **Component:** a `FileTree` showing the settled per-feature shape, with dimmed inline comments marking each file's job and which one is allowed to touch `db`. Goal: one glance gives the student the layout they'll follow from the project chapter (Ch 047) forward.

  ```
  - app/
    - invoices/
      - actions.ts            'use server' — thin orchestration
  - lib/
    - invoices/
      - calculate-total.ts    pure — no db, no cookies
      - policy.ts             pure predicates — canCreateInvoice(user, org)
    - result.ts               Result<T>, ok, err (from L3)
  - db/
    - schema.ts               source of truth (Ch 037)
    - queries/
      - invoices.ts           tenant-scoped reads — the only db importer
  ```
  (Use the resolved repository decision here — `db/queries/invoices.ts` if aligning to conventions.)

- **The "is it a helper or a boundary?" decision rule** — the two-line test the student applies to any function: *does it touch a database, cache, queue, or external API? Yes → boundary (action / route handler / job). No → `/lib` helper.* Apply it to a deliberately gray case: "validate a payment and reserve inventory" is **two** functions — `validatePayment` (pure, `/lib`) and `reserveInventory` (side-effectful, called from the action). The rule cuts the gray case cleanly.
- **Exercise:** `Buckets`, two columns — "Lives in `/lib` (pure)" vs "Fires at the boundary (action body)". Items: compute the invoice total; read the current user's org from the session; insert the invoice row; decide whether a user's role can create an invoice (predicate); send the confirmation email; format a currency string; check the slug isn't already taken in the DB; sum line-item quantities. Goal: drill the decision rule on realistic cases, including the tempting traps (the policy *predicate* is pure → `/lib`; reading the session and checking the DB are side effects → boundary). Grading: each chip's `bucket` set per the rule above.

Reasoning: the three-layer shape is the concrete deliverable. FileTree is the diagrams-INDEX top pick for directory structure and is AI-authorable. Buckets is the ideal check-for-understanding here — the whole lesson is a classification skill ("which side of the boundary is this line?"), and Buckets *is* classification. The gray-case ("two functions") is the senior move from the chapter outline.

### Principle #5 — don't wrap the framework's seam

**Goal:** introduce Architectural Principle #5 and resolve the strongest temptation in the chapter — the `safeAction` wrapper.

Content:
- Set up the temptation honestly. After extracting `/lib` helpers, the *next* instinct is to attack the remaining repetition: every action does parse → authorize → result, so why not a generic wrapper `safeAction(schema, fn)` called like `safeAction(createInvoiceSchema, async (data, ctx) => { ... })` that owns those three? Show the tempting wrapper sketch — it genuinely looks clean. This honesty is required: a real, well-built library (`next-safe-action`, `zsa`) does exactly this, so a hand-wave "don't" won't land.
- State **Architectural Principle #5** in a callout sized to its weight: **when the framework ships a convention for a problem, use it; don't roll a parallel mechanism that competes with the platform.** A `'use server'` function *is* the framework's convention for "callable server mutation"; wrapping it in a custom DSL is the parallel mechanism.
- Lay out **what the wrapper costs** — three concrete prices, so the decision is reasoned, not dogmatic:
  1. **Platform static analysis.** Next.js analyzes `'use server'` exports directly (the opaque-ID emission, dead-code elimination, the closure-encryption from L1). A wrapper indirects the export and can blur what the compiler sees.
  2. **Call-site visibility.** `safeAction(schema, fn)` hides the five seams behind one call; the reviewer can no longer scan parse → authorize → mutate → revalidate → return. The repetition the wrapper removes was *legible*.
  3. **A custom DSL nobody else speaks.** A new hire (or an AI agent) knows `'use server'` + Zod + `Result`; they have to *learn* your `safeAction`. The five seams are small enough that repeating them per action is cheaper than the abstraction.
- **The 2026 reflex:** don't write the wrapper. The five seams are small; the repetition is a feature for the reviewer. Name that the wrapper libraries are real and the trigger for them is a real threshold — but the course default is the framework's convention, and the wrapper is a conditional past a clear bar (a large team standardizing dozens of actions), not the starting point.
- **Component:** `CodeVariants` — tab A "The tempting wrapper" (the `safeAction` sketch + a call site) vs tab B "The framework's seam, inline" (the same action written plainly with its five seams visible). Prose on each tab argues the trade. This is the decision made *visible* via side-by-side code, the chapter's house style for decisions.
- **Watch-out (inline):** the urge peaks after the *third* near-identical action — name that exact moment as the smell, and the move is to write the parse line inline again, not to abstract. Also: even when the auth carve-out lands (next section), resist a "while we're at it" wrapper that *also* swallows validation and revalidation — auth is the one concern that earns the wrapper; the rest stay inline.

Reasoning: #5 is the restraining principle, taught after #3's constructive one so the contrast lands (split down vs. don't build up). The honesty about real libraries is non-negotiable per the guidelines (mention alternatives so the student understands *why* we choose the default). CodeVariants again because this is a code-shape decision. Tooltip candidate: DSL.

### The two wrappers that earn their weight

**Goal:** name the *sanctioned* exceptions to #5 so the student isn't confused later when the course *does* extract a wrapper, and understand the bar an exception must clear.

Content:
- Reconcile the apparent contradiction: #5 says don't wrap, yet the course *will* ship exactly one action wrapper and one SDK interface. Resolve it by stating **the bar a carve-out must clear**: a single, security/compliance-sensitive concern that is *identical boilerplate at every call site* and where *getting it wrong is an incident, not a style nit*. That bar is what makes auth and billing exceptions and keeps everything else inline.
- **Carve-out 1 — authorization (Ch 057, named once).** `authedAction(role, schema, fn)` is the *only* sanctioned action wrapper. Why it survives #5: the auth check (`getSession` → check role → return `unauthorized`/`forbidden` if missing) is the *same* boilerplate at every single action, and a missed check is a security breach, not a code-smell. Centralizing it makes the policy explicit and the audit trivial. Note: it threads a `ctx = { user, orgId, role, db }` payload — named here only as the slot; full pattern is Ch 057. Crucially: this wrapper handles *auth only* — parse, validate, mutate, revalidate still live in the action body even with the wrapper.
- **Carve-out 2 — the thin billing interface (Ch 064, named once).** `billing.requirePlan()`, `billing.upgrade()` — a small typed surface so action bodies never import the Stripe SDK directly. Same bar: one concern, compliance-sensitive, worth a named interface. `/lib/billing/` becomes the only place the Stripe SDK is imported. Named here as a slot; full pattern Ch 064.6.
- Land the boundary: these two are the *whole* list. Every other concern in an action — parse, business-rule checks, transaction, revalidate — stays inline in the body. The student leaves knowing the two named exceptions exist and won't mistake them for permission to wrap freely.

Reasoning: the chapter outline requires both carve-outs be named here so Ch 057 and Ch 064 are "wiring, not invention." Stating the *bar* (not just listing the two) gives the student a reusable test for any future "should this be a wrapper?" question — that's the senior skill. No new code here; these are forward-references, so prose + a tight `:::note` per carve-out, not full samples (don't pre-teach Ch 057/064 code).

### The thin action, assembled

**Goal:** bring it together — show the final thin action reading as a sequence of named calls, and lock the mental model.

Content:
- Show the **after** state end-to-end: the `createInvoice` action body now reads as thin orchestration — parse (`safeParse`), authorize (`canCreateInvoice` predicate from `/lib/invoices/policy.ts`, with the session read at the boundary), call the repository/`db/queries` for the uniqueness check and insert, compute via `calculateInvoiceTotal`, map errors to `Result`, and (commented as L5's) revalidate + return. Contrast its scannability against the fat body from the first section — same behavior, now legible.
- **Component:** `AnnotatedCode` over the assembled thin action. Steps walk the spine — each step highlights one seam-line and names which `/lib` file does the actual work behind that call. Reuse the same color language from section 1 (the IO now lives behind named calls; the body is mostly blue orchestration + one green call). Goal: the student sees the *same three kinds of code* from the opener, now *separated* — the payoff visualized.
- Restate the **mental model** as the closing three sentences (the takeaways from the framing): (1) three named side-effect boundaries, everything else pure; (2) the action body is thin orchestration, next extraction goes to `/lib` not to a new layer; (3) the one decision rule (touches DB/cache/queue/external API → boundary; else → `/lib`).
- **Watch-outs roundup (woven into this section's close, not a separate "watch-outs" section):** the `db`-as-parameter anti-pattern (`createInvoice(db, data)` looks like DI but the function is impure once it can write — the course tests the *pure* helpers and integration-tests the action; DI variants are out of scope); over-structuring `/lib` by both feature *and* layer (`/lib/invoices/repository/select.ts`) is premature — one folder per feature until the feature genuinely splits.
- **Exercise (optional, if a second check earns its place):** a short `MultipleChoice` — "You add a function that emails the invoice PDF after creation. Where does it live?" with choices probing the decision rule (a pure `/lib` helper / inside the action body after the transaction commits / inside the transaction / a new wrapper). Correct: a thin `/lib/email.ts` adapter *called from* the action body *after* the write — testing both the boundary rule and (lightly) foreshadowing L5's "external calls after the commit." Keep it single-question; the Buckets drill already carried the main check.
- Close with a one-line bridge to L5: the body is thin and correctly sliced — next lesson fills the last two seams (revalidate, transaction) and what fires after the write.

Reasoning: a closing AnnotatedCode that mirrors the opener's coloring closes the pedagogical loop (pain → cure → resolved pain visualized). Folding watch-outs into the teaching close (not a trailing dump) follows the task's rule that watch-outs belong with the concept they qualify. The MCQ is marked optional to avoid over-assessing a decision lesson that already has a strong Buckets drill.

### External resources (optional)

One or two `ExternalResource` cards if a high-quality, current source exists: the Next.js Server Actions / "use server" docs (for the framework-convention anchor), and optionally the `next-safe-action` docs *framed honestly* as "the well-built wrapper the course deliberately doesn't reach for by default — read it to understand the trade, then decide at your team's threshold." Only include if they add signal; don't pad.

Reasoning: guidelines allow optional LinkCards/ExternalResource for official docs and supplementary material. Linking the wrapper library *as the named alternative* reinforces the "we know it exists, here's why we don't default to it" honesty.

---

## Terms for Tooltip (`<Term>`)

Strategic, lesson-supporting only:

- **Pure function** — re-explain the prerequisite concisely at first use (same inputs → same output, no side effects) without breaking flow.
- **Side effect** — a function reaching outside its arguments to read or change the world (DB, cookies, network, filesystem).
- **DSL** (domain-specific language) — non-obvious acronym; used in the #5 cost about a custom `safeAction` API the team must learn.
- **Predicate** — a function returning a boolean (used for `canCreateInvoice`); brief gloss since it's used as a precise term for the policy layer.
- **Repository** (data-access layer) — only if the lesson keeps the `repository.ts` name; gloss it as "the layer that owns database access for a feature." If aligning to `db/queries/`, gloss that instead.

Do **not** Tooltip already-taught terms the student owns by now: `safeParse`, `Result`, `'use server'`, `revalidatePath`, discriminated union.

---

## Scope

**Prerequisites to redefine briefly (one line each, do not re-teach):**
- The five-seam shape (parse → authorize → mutate → revalidate → return) — L1/L2 established; reference, don't rebuild.
- `Result<T>`, `ok`, `err`, the `ErrorCode` set — L3 owns these; import from `@/lib/result`, never redefine.
- `safeParse` + `createInsertSchema`-derived input schema — L2 owns; the parse line is shown as already-known.
- `'use server'`, opaque-ID round-trip, serializable-args — L1 owns; reference only.

**This lesson does NOT cover (defer, name once at most):**
- The `authedAction` wrapper *implementation* and the `ctx` payload — **Ch 057.2**. Named here as the sanctioned carve-out + slot only.
- The billing interface *implementation* — **Ch 064.6**. Named as a slot only.
- **`revalidatePath`, `db.transaction`, what fires after the write** — **L5 (next lesson)**. Show only as commented placeholders / one-line shapes carried from L3; explicitly flag them as L5's. Do not teach ordering, the no-external-calls-in-transaction rule, or `redirect()` here.
- Background jobs as a side-effect boundary — **Ch 066**. Named only as the third boundary in the #3 list.
- Route handlers as a side-effect boundary — **Ch 046**. Named only as the second boundary in the #3 list.
- Dependency-injection / swappable-repository testing variants — **out of scope** entirely. The 2026 default is: unit-test the pure helpers, integration-test the action. State this once (it's the `db`-as-param watch-out's resolution) and move on.
- Form-side consumption of `Result` (`useActionState`) — **Ch 044**. Not this lesson's concern.
- Tenant scoping via `tenantDb(orgId)` — **Unit 10 (Ch 057+)**. The repository/queries layer is shown reading by `orgId` but the `tenantDb` factory and the bare-`db` lint rule are not taught here; keep examples honest but don't introduce the factory.
- Drizzle 1.0 `db/queries` vs `drizzle-zod` path churn — already flagged in L2's notes; not re-litigated here.

---

## Notes for downstream agents

- **Repository naming decision is load-bearing — resolve it before writing.** The chapter outline says `/lib/invoices/repository.ts`; code conventions say tenant-scoped reads live in `db/queries/<entity>.ts` and `db/` holds no business logic. Recommendation: **use `db/queries/invoices.ts` for the data-access layer** to match the convention the rest of the course uses, and keep pure logic + policy in `/lib/invoices/`. If you keep `repository.ts`, add a single aside acknowledging `db/queries/` is the canonical name. Pick one and be consistent across every code sample and the FileTree.
- **Do not present working transaction/revalidate code** — those are L5's. Comment them as seams (`// revalidate → L5`) so the assembled action stays honest as "not-yet-finished," consistent with L1's deliberately-non-working skeleton convention.
- **Function form per conventions:** pure `/lib` helpers and policy predicates as `export const fn = (...) => ...` with explicit return types; the Server Action stays `export async function createInvoice(formData: FormData)`. Verb-led helper names (`calculateInvoiceTotal`, `canCreateInvoice`, `findInvoiceBySlug`), never `helper`/`util`. No `Action` suffix on the action.
- **`Money`/`LineItem` types** — if used in `calculateInvoiceTotal`'s signature, derive or reference from the schema/table rather than hand-writing a parallel interface (Architectural Principle #2); a one-line `type LineItem = ...` from `$inferSelect`/the schema is fine, but don't invent a duplicate domain model.
