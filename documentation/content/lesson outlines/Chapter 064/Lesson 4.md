# Lesson 4 — Plan entitlements as a derived view

**Title (h1):** Plan entitlements as a derived view
**Sidebar label:** Plan entitlements

---

## Lesson framing

This is the schema lesson that everything downstream reads. By the end the student can answer "can this org do this?" on every request **without touching Stripe**, because the app keeps a one-row-per-org projection of Stripe state — `plan_entitlements` — written exclusively by the webhook (ch063) and read by a single `getEntitlement(orgId)` helper.

The senior question driving the whole lesson: the app must gate features on every request, but `stripe.subscriptions.retrieve()` on the hot path is wrong (latency, rate limits, Stripe outage = your app down) and mirroring the full Stripe Subscription schema is also wrong (drift, schema churn). The lesson lands the middle path: **derived state** — a small, read-shaped projection, denormalized into one row, refreshed only when Stripe tells you it changed.

Pedagogical spine, ordered to minimize cognitive load:

1. **Motivate with the failed alternatives first.** Open on the gate ("render Pro features / block export / count seats") and walk the two wrong answers (call Stripe per request; mirror everything) before showing the projection. The student should feel the pain before seeing the relief. This is the "trigger before tool" filter — the projection is the tool, the hot-path-gate-without-Stripe is the trigger.
2. **Build the schema column by column, each column justified by a reader.** Every column exists because some request path reads it without joining. Do not present the schema as a fait accompli — derive each field from a concrete gate. This is the load-bearing mental model: *derived state is read-shaped, not write-shaped.*
3. **Single-writer is a structural rule, not a convention.** Restate ch063's "webhook is the only writer" but reframe it here as what makes the table *trustworthy to read*: if only the webhook writes, then the row is always a faithful projection of the last Stripe event, and no Server Action can race it. Connect to the dual-writer race from ch063 L3 explicitly.
4. **The projection function is the heart.** `subscriptionToEntitlement(subscription)` is where a Stripe shape becomes an app shape. Show its signature and the field-by-field mapping (status, `lookup_key`→plan, `current_period_end`, `cancel_at_period_end`). Keep the full handler/UPSERT in the project (ch065) — this lesson owns the *shape of the projection*, not the webhook plumbing.
5. **Close null-handling structurally.** The free-row-at-org-creation move means the read side never branches on "row missing." Frame it as a senior habit: design the data so the bug class can't exist, rather than handling it at every call site.

What the student should be able to do at the end: read and explain the `plan_entitlements` schema, justify each column, write the `getEntitlement` read helper, sketch the projection function, explain why the webhook is the only writer, and articulate why the free plan is "a full row in the app, no row in Stripe."

Tone and stack discipline: this is a Drizzle + Server Component lesson. Code is TS/Drizzle. The running example from L1 carries: Pro plan, `lookup_key: 'pro_monthly'` / `'pro_yearly'`, 14-day trial. Status *semantics* (`trialing` vs `past_due` vs `canceled` and the access decision) are L5's job — this lesson stores the status string and names that the meaning lands next lesson; it does **not** define `hasActiveAccess` or the decision table. Keep `status` typed as a string-literal union but treat its values as opaque labels here.

Diagrams carry two ideas: (a) the source-of-truth split (Stripe owns the machine, app owns the projection) and (b) the data flow (Stripe event → webhook → projection function → UPSERT → row → `getEntitlement` → gate). A schema-design exercise (`DrizzleSchemaCoding`) lets the student build the table and feel the constraints fire; a `Buckets` drill checks the Stripe-stores-vs-app-stores boundary.

---

## Lesson sections

### Introduction (no header)

Open on the concrete recurring need: every authenticated request has to decide what this org is allowed to do — show Pro-only panels, allow the CSV export, enforce the seat cap, paywall the free tier. Frame it as a question asked *thousands of times a day*, on the hot path of every page render. Name the tension in one sentence: Stripe is the source of truth for billing, but Stripe is a network call away and rate-limited. Preview the answer (a derived view the app reads locally) and the one rule that keeps it honest (only the webhook writes it). Keep it to ~4 sentences; connect back to ch063 ("you built the webhook that will write this; now we design what it writes").

### Why not just ask Stripe?

Teach by elimination — the two tempting wrong answers, each killed on production stakes.

- **Wrong answer 1: call `stripe.subscriptions.retrieve()` per request.** Walk the failure modes concretely: every page render now waits on a Stripe round-trip (latency stacks on the hot path); Stripe rate-limits, so a traffic spike trips you; and the worst one — *Stripe's availability becomes your app's availability*. A Stripe blip shouldn't blank every dashboard. This is the senior framing: a third-party on the read path is a third-party SPOF.
- **Wrong answer 2: mirror the full Stripe Subscription in your DB.** Killed on drift and churn: Stripe adds fields, changes shapes (call back to L1's `current_period_end`-moved-to-the-item surprise as proof the shape *does* move); you'd be chasing their schema forever, storing dozens of columns you never read. The senior anchor: don't mirror a schema you don't own.
- **The synthesis.** Between "ask every time" and "copy everything" sits the derived view: store *only what a request path reads*, refresh it *only when Stripe says it changed*. Name the pattern by name — **derived state / projection** — and state the load-bearing rule for the rest of the lesson: *derived state is read-shaped, not write-shaped. Every column earns its place by being read on the hot path without a join.*

Use a small `Buckets` exercise here (or defer to the next section — author's call; one Buckets total in the lesson) to make the boundary stick: "Stripe stores it" vs "the app stores it." Items: full Subscription state machine, payment methods, invoice PDFs, the Price catalog (Stripe); the current plan slug the dashboard reads, the status string the gate checks, the period-end the banner shows, the `stripe_customer_id` pointer (app). Two columns, `instructions` set to frame it as "who owns this fact at read time."

No code yet — this section is pure decision-making, matching the "decisions before syntax" filter.

### The source-of-truth split

Short conceptual section with one diagram. Make the two-source model explicit before any schema: **Stripe owns the billing facts and the full state machine; the app owns a derived projection of just-enough.** This is the mental model the schema hangs off.

Diagram (D2, `direction: right`, wrapped in `<Figure>`): two labeled regions. Left = "Stripe (source of truth)" containing Customer, Subscription (+ its status machine), Price catalog, Invoices. Right = "Your database (derived projection)" containing the single `plan_entitlements` row and the `organizations.stripe_customer_id` pointer. One arrow from Stripe to the projection labeled "webhook event → projection (the only write path)"; one arrow from the projection to a small "request / feature gate" node labeled "read on every request." Pedagogical goal: the student sees that reads and writes flow through *different* paths, and that Stripe never sits on the read path. Keep it under ~400px tall; bump font-size per the D2 guide.

Name the boundary rule in prose right after: *the app stores a pointer to Stripe (`stripe_customer_id`) and a projection of Stripe (`plan_entitlements`) — never a copy of Stripe.*

### The `plan_entitlements` schema

The center of the lesson. Build the table **column by column, each justified by a concrete reader**, then show the finished Drizzle table.

Teaching method: introduce each column with the gate that needs it, so the schema reads as a consequence of the app's questions, not an arbitrary list. Suggested order and justification:

- `organizationId` — PK and FK to `organizations`. One row per org; this *is* the identity of the projection. Note the one-row-per-org decision is justified in its own subsection next.
- `plan` — `'free' | 'pro' | 'team'` string-literal union. Read by: every dashboard / paywall ("what tier are you on"). Per code conventions, model as an `as const` union or a `text({ enum: [...] })`, **never** a Postgres enum (conventions: "Never `enum`").
- `status` — the Stripe-derived status string. Read by: the access gate (L5). Store it as a string-literal union of the Stripe values; **state explicitly that this lesson stores the label and L5 assigns meaning** — do not teach the decision table here.
- `subscriptionId` — the Stripe Subscription id, **nullable** (free plans have no Subscription). Read by: the projection's UPSERT predicate and any "open in Stripe" support tooling.
- `currentPeriodEnd` — `timestamptz`, nullable. Read by: the "renews/ends on …" surface and (L5) the cancel-at-period-end grace check. Note for downstream authors: per L1/continuity, this value comes off `subscription.items.data[0].current_period_end`, **not** the Subscription root — flag it where the projection function is shown, not here.
- `cancelAtPeriodEnd` — boolean. Read by: the winding-down banner (L5). Motivated in L3, defined here.
- `seats` — int, for seat-based plans. Read by: the invite/role gate (`members.count <= seats`). Covered in its own subsection.
- `lastEventAt` — `timestamptz`. The ordering predicate from ch063 L3 — the webhook only applies an event whose timestamp is newer than the stored one, so out-of-order Stripe deliveries can't regress the row. Name it as the same predicate, don't re-teach idempotency.
- `updatedAt` — `timestamptz`, `defaultNow()` + `$onUpdate`. Audit/debug.

Present the finished table with **`AnnotatedCode`**, stepping through the columns in reader-justified groups (identity & plan; status & subscription pointer; period & cancellation; seats; bookkeeping `lastEventAt`/`updatedAt`). One code block authored once, 4–6 steps, blue default tint, a contrasting color on the step that highlights `lastEventAt` (the non-obvious one). This directs attention to the *why* of each field group rather than dumping a 10-column table on the reader.

Code shape notes for the author (align to conventions, diverge only with a note):

- Drizzle `pgTable('plan_entitlements', { ... })`, snake_case mapping is on the client (don't restate per-column).
- `organizationId` FK with explicit `onDelete: 'cascade'` (entitlement is an owned child of the org).
- `plan` and `status` as `text({ enum: [...] }).notNull()` with the literal arrays, so the row type narrows to the union and SQL stays a checked string.
- `seats` `integer().notNull().default(1)` (or nullable — author picks one and states the reasoning; the running example is a single-seat-default).
- Row type via `typeof planEntitlements.$inferSelect` — name it `PlanEntitlement`; this is the type `getEntitlement` returns and L5's `hasActiveAccess` will consume.

Add a `Term` on **derived state / projection** (defined inline the first time, this is the reusable anchor) and on **timestamptz** if not already familiar.

### Why one row per org, not one per subscription

Short but important subsection — heads off a real modeling mistake.

The app's hot-path question is "what plan is this org on *right now*" — that has exactly one answer, so the hot-path table is one row. Subscription *history* (the log of past subscriptions, upgrades, cancellations) is a different concern with a different shape; it's derived from Stripe events into a separate table *when a feature needs it*, or read from Stripe directly for support tooling — never crammed into the entitlement row. State the general rule as a reusable senior heuristic: **hot-path tables model current state; history is a separate table.** One or two sentences on why mixing them hurts (the row would need to be append-only or carry effective-date ranges, killing the cheap single-row read).

### The single-writer rule

Restate ch063's load-bearing rule, reframed for *why it makes the table trustworthy to read*.

- **The rule:** only the webhook handler writes `plan_entitlements`. Not a Server Action, not the Checkout success page, not the Portal return handler.
- **Why it matters here:** because there is exactly one writer, the row is always a faithful projection of the most-recently-processed Stripe event. A reader never has to wonder "is this stale because a Server Action half-wrote it?" Connect explicitly to the **dual-writer race from ch063 L3**: two writers + out-of-order events = a row that flip-flops; one writer + the `lastEventAt` predicate = monotonic truth.
- **Structural enforcement, not discipline.** The senior framing: you don't *remember* not to write the table — you structure the code so the wrong place *can't*. The only functions that touch `plan_entitlements` for writes live in the webhook path; the rest of the app imports only the *read* helper. Foreshadow that Unit 16's audit/lint can mechanically check "no Server Action writes this table," same flavor as the `authedAction` audit. Keep it light — the enforcement tooling isn't this lesson's subject.

Small diagram or callout reinforcing: list the writers Stripe-side (Checkout, Portal) and the single writer app-side (webhook), against the single reader path (`getEntitlement`). A compact two-column `Aside` or a tiny `ArrowDiagram` is enough; do not over-build — the L2/L3 timeline diagrams already exist, reference the mental model rather than redrawing the full flow. Author's call whether this needs a figure at all or just tight prose plus the earlier source-of-truth diagram.

### The projection function

The heart of the write side, taught at the level of *shape*, not full plumbing.

Introduce `subscriptionToEntitlement(subscription)` as the pure function that turns a Stripe Subscription object into an entitlement patch — the single place where a Stripe shape becomes an app shape. Show its signature and the field-by-field mapping; keep the surrounding handler (signature verify, `processed_events` claim, UPSERT, `lastEventAt` predicate) in the project (ch065) and say so.

Use **`AnnotatedCode`** to walk the mapping, because the focus needs to move field-by-field:

- Signature: `subscriptionToEntitlement(subscription: Stripe.Subscription): EntitlementPatch` (a pure function, no IO — call out that purity makes it trivially unit-testable, the seam tests in Unit 18 live here).
- `status` ← `subscription.status` (the raw Stripe string; meaning assigned in L5).
- `plan` ← the item's price, mapped through the plan resolver. **This is where `lookup_key`-not-`price_id` shows up again** — restate from L1 briefly: the mapping goes through the stable lookup key so the projection is mode-independent and the catalog can be re-seeded without code changes. Color-highlight this line. **Correctness caveat for downstream authors (verify in sandbox, do not present `lookup_key` as guaranteed-present):** Stripe webhook payloads include the nested `price` object on `items.data[0]`, but the presence/expansion of `price.lookup_key` is *not* contractually guaranteed across API versions. The robust pattern the chapter already leans toward (L2's `resolvePrice` keys off `lookup_key`): resolve the plan from the price **id** via the app's own price→plan map (built from the seeded catalog), so the projection never depends on the webhook expanding `lookup_key`. Keep the *narrative* anchored on "the lookup key is the stable handle," but the *code* should map a price id the app already knows. State this so the sample doesn't ship a silent `undefined`.
- `currentPeriodEnd` ← `subscription.items.data[0].current_period_end`. **Flag the gotcha here** (not in the schema section): on API `2025-03-31.basil` this lives on the *item*, not the Subscription root; reading the top-level field returns `undefined`. One sentence, with the `Term`/note. This is the highest-value correctness detail in the lesson.
- `cancelAtPeriodEnd` ← `subscription.cancel_at_period_end`.
- `subscriptionId` ← `subscription.id`.

Then one or two sentences on how the patch is applied: the webhook UPSERTs the patch onto the org's row, guarded by `lastEventAt` so a late-arriving older event is a no-op. Reference, don't re-teach.

Type note: `EntitlementPatch` is a `Partial`-ish of the writable columns; author may define it as a named `type`. Keep `Stripe.Subscription` as the SDK type to anchor that this is the one place Stripe shapes are handled (foreshadows L6's `/lib/billing/` seam — the projection lives behind that boundary).

`CodeTooltips` candidate: hover the Stripe field paths (`items.data[0].current_period_end`, `price.lookup_key`) with one-line notes on what they are. Optional — only if it doesn't fight the AnnotatedCode.

### The read side: `getEntitlement`

The single function every gate calls. This is the payoff of the whole schema.

- Show `getEntitlement(orgId)` as a small Drizzle read returning the `PlanEntitlement` row. Because the free row is seeded at org creation (next subsection), it **always** returns a row — the signature is `Promise<PlanEntitlement>`, not `Promise<PlanEntitlement | null>`. Call that out: the non-null return is a direct consequence of the provisioning step, and it deletes a null-check from every call site.
- One well-named helper, called from every gate; **never** replaced with an ad-hoc `db.select` at the call site. The senior anchor: a single read seam means the caching decision, the tenancy scoping, and the return shape are decided once.
- Lives in `db/queries/` per conventions (tenant-scoped read helper, one entity per file: `db/queries/entitlements.ts`), closes over `tenantDb(orgId)`. State this so it matches the project's file layout; don't belabor the directory rationale (that's earlier-unit material).
- Usage sketch (1–2 lines, not a full feature): a Server Component reads `const entitlement = await getEntitlement(orgId)` and branches on `entitlement.plan`. Keep the *access* branch (status → allow/deny) out — gesture that L5 wraps that in `hasActiveAccess`; here we just show reading the row and checking `plan`.

Use a plain **`Code`** block for `getEntitlement` (it's short and single-focus; AnnotatedCode would be overkill).

#### Caching the read

Sub-point, keep tight. The per-request read is already cheap (`organizations` is small, it's a single-row lookup). Wrap `getEntitlement` in React's request-scoped **`cache()`** so multiple gates in one render dedupe to one query. Be precise about the boundary (this is a common student confusion): `cache()` is **per-request** memoization, *not* cross-request persistence — the result is discarded after the render. Cross-request caching (`'use cache'` + tags, Redis) is named with its threshold — only when the read is in a tight loop or a strict request budget — and pointed at the caching unit; for the default Server Component path, request-scoped `cache()` is enough. This matches conventions ("React `cache()` for request-scoped … `'use cache'` for cross-request … different tools"). Add a `Term` on **request-scoped memoization** if helpful.

### Every org gets a row at creation

The structural null-killer. Short, high-value.

Every new organization inserts a `plan_entitlements` row at creation time: `plan: 'free'`, `status: 'active'`, `seats: 1`, the Stripe-side fields null. Consequence: every org has an entitlement row from day one, so `getEntitlement` never handles "row missing," and the read side has no null branch. Frame as the senior habit: **design the data so the bug class can't exist** rather than guarding against it at every read.

Tie it to the free-plan model in the same breath (next subsection) — they're two faces of one idea.

#### The free plan: a full row in the app, no row in Stripe

The free plan has **no** Stripe Subscription, but a **full** `plan_entitlements` row (`free / active`, no `subscriptionId`, no `currentPeriodEnd`). The app's gates treat free like any other plan because the entitlement helper returns the same shape for everyone — the only difference is the column values. State the principle: *the same code path serves free and paid; free is not a special case, it's just particular column values.* This is why the schema's Stripe-side columns are nullable, and it's the reason `getEntitlement` can stay uniform.

### Re-deriving when the projection changes

The migration/maintenance reality, named not drilled.

When you add a column or change a mapping in `subscriptionToEntitlement`, existing rows are **stale until the next webhook fires** for each org — and a healthy paid org might not emit an event for weeks. The senior pattern: a one-shot backfill job that walks `organizations` with a non-null `stripe_customer_id`, fetches each Subscription from Stripe, re-runs the projection, and writes. Name the discipline (projection logic changes need a backfill, not just a migration); reference the seam (the same `subscriptionToEntitlement` function the webhook uses, run in a loop). Do **not** ship the backfill code — that's project/ops territory; one paragraph plus the reasoning is the right depth. Optionally connect to expand-migrate-contract (Unit 21) by name.

### Practice: build the entitlements schema

A `DrizzleSchemaCoding` exercise so the student builds the table and feels the constraints fire — far better than reading it.

- `instructions`: build `plan_entitlements` as the one-row-per-org projection; one row per organization, Stripe-side fields nullable for the free plan.
- `starter`: an `organizations` table stub (id PK, name) plus a `plan_entitlements` skeleton with `organizationId` and a `// add the projection columns` marker.
- `requirements`: `plan_entitlements` with `organization_id` (PK, FK→organizations.id), `plan` (text, notNull), `status` (text, notNull), `subscription_id` (text, nullable — i.e. no notNull requirement), `current_period_end` (timestamp, nullable), `cancel_at_period_end` (boolean, notNull), `seats` (integer, notNull), `last_event_at` (timestamp), `updated_at` (timestamp). PK on `organization_id`.
- `probes`:
  - mustSucceed — insert a free org row with `subscription_id`, `current_period_end` NULL (proves the free plan fits without Stripe fields).
  - mustSucceed — insert a paid org row with all fields populated.
  - mustFail — a second row for the same `organization_id` (proves one-row-per-org via the PK).
  - mustFail (optional) — insert referencing a non-existent organization (proves the FK).
- `seedSQL`: one or two `organizations` rows the probes reference.

Per the PGlite/DrizzleSchemaCoding gotchas in memory: keep types plain (`text`, `integer`, `timestamp`, `boolean`), **no `enum`** in the gradable schema (use plain `text` for `plan`/`status` in the exercise even though the real schema uses `text({ enum })` — note this divergence is for the grader; the union typing is a TS-layer concern the probe can't see), no `uuidv7()` in probes, no identity columns. Use plain integer PKs for `organizations` in the exercise to keep it PGlite-clean.

### Check your understanding (optional, author's call)

If a second checkpoint adds value beyond the Buckets and the schema build, a short `MultipleChoice` or `TrueFalse` on the two load-bearing rules: (a) which component is allowed to write `plan_entitlements` (webhook only), (b) why `getEntitlement` returns a non-null row (free row seeded at creation), (c) why the projection maps `lookup_key` not `price_id`. Keep to 2–3 items; don't pad. Skip if the section count is already heavy — the DrizzleSchemaCoding exercise is the primary assessment.

### External resources (optional)

`ExternalResource` cards if a high-quality, current source fits: Stripe's "subscription object" reference (for the field shapes), the React `cache()` reference, and Drizzle's column-types docs. Optional — only include genuinely load-bearing links. No YouTube video is a strong fit here (this is a schema/architecture lesson, not a procedural walkthrough); skip `VideoCallout` unless the resourcer surfaces something excellent.

---

## Scope

**This lesson teaches:** the derived-view pattern and why it beats both "ask Stripe per request" and "mirror Stripe's schema"; the `plan_entitlements` Drizzle schema column-by-column; one-row-per-org vs one-per-subscription; the single-writer rule (reframed as read-trust); the `subscriptionToEntitlement` projection function *shape* (field mapping); the `getEntitlement` read helper and request-scoped `cache()`; the free-row-at-org-creation provisioning and the free-plan model; the re-derivation/backfill discipline.

**Out of scope — do not teach:**

- **Subscription status *semantics*.** Storing the `status` string is in scope; what each value *means* for access (`trialing`/`active`/`past_due`/`canceled`/`incomplete`), the decision table, `hasActiveAccess`, grace-period banners, the winding-down UI — all **L5**. Treat status values as opaque labels here. Do not define `hasActiveAccess` or any access predicate.
- **The webhook handler plumbing.** Signature verification, `processed_events` claim, the UPSERT statement, the `lastEventAt` ordering predicate's *implementation* — built in **ch063** and shipped full in the project (**ch065**). This lesson names `lastEventAt` as the predicate and shows the projection function shape only.
- **The `billing.*` interface.** `requirePlan`, the `/lib/billing/` directory, `BillingError`, the SDK-import boundary — **L6**. This lesson may foreshadow that the projection lives behind that seam, but does not build it.
- **The Stripe object graph.** Products/Prices/Customers/Subscriptions, `lookup_key` mechanics, test/live mode, the `lib/stripe.ts` singleton — established in **L1**; restate `lookup_key`-not-`price_id` in one sentence at the projection function, nothing more.
- **Checkout and Portal.** New-subscription Checkout (**L2**) and Portal management (**L3**) are the Stripe-side writers; name them as "the things that change Stripe state," don't re-teach.
- **Seat enforcement mechanics.** The membership table and the invite/role gate are **Chapter 056**; this lesson defines the `seats` column and names the gate (`members.count <= seats`) as the reader that justifies the column — it does not implement the enforcement.
- **The full caching decision tree.** `'use cache'`, tags, cross-request invalidation — owned by the caching unit (Ch032 / Unit 15); this lesson uses request-scoped `cache()` and names the cross-request threshold by pointer only.

**Prerequisites to restate briefly (one sentence each, not re-taught):** the webhook is the only writer (ch063); `lookup_key` is the stable handle across Stripe modes (L1); `current_period_end` lives on the subscription item, not the root, on `2025-03-31.basil` (L1 continuity); one Stripe Customer per org, pointer at `organizations.stripe_customer_id` (L1); Drizzle conventions — snake_case on the client, `text({ enum })` over Postgres enums, `$inferSelect` for row types, `db/queries/` for tenant-scoped reads.

---

## Code conventions applied

- **Drizzle:** `db/schema.ts` source of truth; snake_case casing on the client; `text({ enum: [...] })` for `plan`/`status` (never Postgres `enum`); FK with explicit `onDelete: 'cascade'`; row type via `typeof planEntitlements.$inferSelect` named `PlanEntitlement`; read helper in `db/queries/entitlements.ts` closing over `tenantDb(orgId)`.
- **TypeScript:** string-literal unions for `plan`/`status`; annotate the exported `getEntitlement` and `subscriptionToEntitlement` return types; `import type` for `Stripe.Subscription` and `PlanEntitlement`; no `enum`.
- **Function form:** arrow-const for the projection function and the read helper; `getEntitlement` named per the reads-single-record convention (returns the row; non-null here because the row is guaranteed).
- **Time:** `timestamptz` columns for `currentPeriodEnd`/`lastEventAt`/`updatedAt`; note the Temporal-at-the-seam convention exists but keep the lesson's stored shape as `timestamptz` (the Stripe seam hands epoch seconds; the codec lives elsewhere — don't drill).
- **Caching:** React `cache()` for the request-scoped read; `'use cache'` named as the different, cross-request tool.
- **Deliberate divergence (note for downstream agents):** the `DrizzleSchemaCoding` exercise uses plain `text` (not `text({ enum })`) and plain integer PKs for `organizations`, because the PGlite grader can't see TS-level unions and the exercise must stay PGlite-clean (no `uuidv7()`, no identity, no enums in probes). The narrative schema keeps the `enum`-typed `text` and the project's UUIDv7 PKs. Flag this so the exercise and the prose schema aren't "reconciled" into conflict.
