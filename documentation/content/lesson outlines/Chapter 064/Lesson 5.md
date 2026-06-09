# Lesson 5 — Subscription status as first-class state

- **Title (h1):** Subscription status as first-class state
- **Sidebar label:** Subscription status

---

## Lesson framing

**What this lesson lands.** The student already has the `plan_entitlements` projection from L4: one row per org, written only by the webhook, read on every request via `getEntitlement(orgId)`. L4 deliberately stored `status` as an *opaque* `text({ enum: [...] })` label and explicitly deferred all meaning to this lesson. This lesson supplies that meaning. The student leaves able to (1) read each Stripe status and say what the app does, (2) implement `hasActiveAccess(entitlement)` as the single access gate encoding a decision table, (3) understand the `(plan, hasAccess)` two-dimensional model — access and tier are orthogonal, and (4) drive a status-keyed banner system so a lapsing user is warned, not silently locked out.

**The core senior reframe.** The naive shape is a boolean `is_paid`. That boolean destroys information the business depends on: a `past_due` user mid-dunning must keep working while Stripe retries the card; a user who cancelled but whose paid period hasn't elapsed has *paid for the month* and must keep access (revoking early is a fair-billing violation); an `incomplete` Checkout where the first charge failed must be treated as *never subscribed*. Status is a string with semantics, decoded once. This is the load-bearing idea — lead with it, return to it.

**Best teaching vehicle.** Subscription lifecycle is literally a state machine, so the spine of the lesson is a `StateMachineWalker kind="machine"` with a Mermaid `stateDiagram-v2` in the `diagram` slot. The student walks one state at a time and reads "what the app does here," while the topology diagram shows where each state sits and which transitions Stripe fires. This beats a static table for the lifecycle because the *transitions* (trial→active, active→past_due→canceled, the `cancel_at_period_end` winding-down loop) carry the lesson. A compact decision table (status → access) is shown *separately and statically* as the thing `hasActiveAccess` encodes — the table is a contract, the walker is the journey.

**Cognitive-load staging.** Build up, don't dump the enum. (1) Motivate with the boolean's failure. (2) Walk the lifecycle states one at a time (happy path first: `trialing`→`active`; then the failure arc; then the cancellation arc). (3) Collapse the walk into the access decision table. (4) Encode the table as `hasActiveAccess`. (5) Separate access from tier (`(plan, hasAccess)`). (6) Surface it all as banners. (7) Name two real-world traps (don't synthesize statuses Stripe doesn't ship; the seat-overage human-in-the-loop).

**Scope discipline (critical, from continuity notes).** This is a *teaching* lesson. The full webhook handler that produces these statuses, the success-page poller, and the `billing.*`/`requirePlan` interface are owned elsewhere (ch063, L6, project ch065). Show `hasActiveAccess` in full (it is the lesson's artifact) and *sketch* its call sites — do not ship a finished `requirePlan` or a wired banner component; foreshadow them as L6's job. Reuse, never redefine, the `PlanEntitlement` type from L4 (`typeof planEntitlements.$inferSelect`) and keep `currentPeriodEnd` a `Date` living on the subscription *item* (the L4 gotcha) — never reintroduce `subscription.current_period_end` at the root.

**Stored-vs-wire status reconciliation (must address explicitly).** Stripe's wire `Subscription.status` enum is wider than L4's stored 5-value column. L4 stores `'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'`. Stripe also emits `incomplete_expired` and `unpaid`. The lesson's rule: the *projection* (`subscriptionToEntitlement`, L4) normalizes the wider Stripe set into the stored set at write time — `incomplete_expired` collapses into the same "no access, treat as never subscribed" bucket as `incomplete`; `unpaid` (Stripe's terminal dunning cliff, configurable to land as `canceled` instead) collapses into the "no access" terminal bucket alongside `canceled`. So the app reads five labels, but the student must understand the wider source set those five summarize, and that the collapse happens in the projection, not in `hasActiveAccess`. Keep `hasActiveAccess` switching only over the five stored labels.

---

## Lesson sections

### Introduction (no header)

Open on the concrete problem, warmly and tersely. A user's renewal card expires overnight. With a boolean `is_paid`, Saturday morning they are locked out of the product they thought they were paying for, with no warning — the worst possible support ticket. The opposite failure: a churned user who never finished Checkout gets a free ride because a half-built subscription row looked "active enough." Both bugs come from the same mistake — collapsing a rich status into a yes/no. State the goal: make the app *status-aware*. Connect back to L4 ("the `status` column we stored but left meaningless"). Preview the artifact: one function, `hasActiveAccess`, that every gate calls, plus the banner system that warns before it ever revokes.

### Why a boolean throws away money

Short, sharp section establishing the senior reframe before any enum is shown. Present `is_paid: boolean` as the tempting model and demolish it with three concrete cases the boolean can't represent:
- `past_due` — card failed, Stripe is *retrying*; locking out now loses a customer Stripe is about to recover.
- cancelled-but-not-expired — they paid through Aug 14; cutting access on the 2nd is taking money for nothing.
- `incomplete` — the row exists but the first charge never cleared; "exists" is not "paid."

Land the thesis sentence: **status is a string with semantics, decoded in exactly one place.** Reinforce with the L4 continuity hook — explain *why* L4 stored the raw string and refused to add `is_paid` (deriving at read time keeps the two from drifting; a stored boolean alongside a stored status is two sources of truth that desynchronize). Use an `Aside` (caution) for the "don't add `is_paid` next to `status`" trap since it qualifies this concept directly.

No diagram here — this is the framing punch. Keep it under ~6 short paragraphs.

### The subscription lifecycle, state by state

The spine of the lesson. A `StateMachineWalker kind="machine"` titled "Subscription lifecycle" with a Mermaid `stateDiagram-v2` in the `diagram` slot. The walker shows one state's "what it means / what the app does" at a time; the synced diagram shows the whole topology and highlights the current state on each transition.

**Diagram (Mermaid `stateDiagram-v2`, `direction LR`, in `<Figure slot="diagram">`).** Pedagogical goal: make the lifecycle's *shape* visible — a happy spine, a failure branch that loops while dunning, a graceful cancellation loop, and terminal sinks. Nodes (use ids that normalize cleanly hyphen→underscore for highlight matching): `[*] --> trialing` (or `--> active` for no-trial), `trialing --> active` (trial converts), `active --> past_due` (payment fails), `past_due --> active` (retry succeeds), `past_due --> canceled` (dunning gives up), `active --> active : cancel_at_period_end=true` shown as a self-note for winding-down, `active --> canceled` (period ends after cancel), `[*] --> incomplete` (first charge fails in Checkout), `incomplete --> active` (completed within window), `incomplete --> canceled` (window expired / `incomplete_expired` collapses here). Annotate the failure and cancel edges with the Stripe event that fires them (`invoice.payment_failed`, `customer.subscription.deleted`) so the student connects status to the ch063 webhook surface without re-teaching it. Keep it compact (vertical budget; ~9 nodes max).

**Walker states (one `<Question>` per stored status; `prompt` = state name, `description` = one-line meaning, `<Branch>`es = the transitions out, label naming the trigger).** Order so the happy path comes first, then failure, then cancellation, then the Checkout-failure sink — this is the cognitive-load ramp. For each state, the `description` carries the *meaning* and the body of the conceptual answer is "what the app does":
- `trialing` — trial active, *full access*, expires at `currentPeriodEnd`. App grants access, surfaces "X days left." Branch: "trial converts → `active`".
- `active` — paid and healthy, full access. Branches: "payment fails → `past_due`", "user cancels in Portal → winding down (`cancel_at_period_end`)".
- `past_due` — an invoice failed but Stripe is retrying (Smart Retries; the configurable default is ~8 attempts over 2 weeks — state it as "days to weeks," not a hard number, since the merchant configures it). **Keep access**, show a "update your card" banner; flip only when it moves on. Branches: "retry succeeds → `active`", "dunning exhausts → `canceled` (or `unpaid`)".
- winding-down (model as a `description` on `active` with `cancel_at_period_end: true`, not a separate Stripe status — important: Stripe keeps it `active`). App keeps access until `currentPeriodEnd`, shows "ends on <date>" + undo. Branch: "period ends → `canceled`".
- `canceled` — relationship over (gracefully at period end, or terminally after dunning, or via the `unpaid` collapse). Row stays for history; **no access**. Terminal.
- `incomplete` — Checkout submitted, subscription created, first charge failed (3DS/declined). **Treat as never subscribed, no access**; entitlement stays `free`. Stripe gives ~23h, then `incomplete_expired` (collapses to `canceled`/no-access in our store). Branches: "completed in window → `active`", "window expires → `canceled`".

Add one `<Term>` on first mention of **dunning** (Stripe's automatic failed-payment retry sequence). This lesson *owns* the `dunning` term per the L3 continuity note ("L3 must NOT define dunning; L5 owns it") — define it here, not before.

After the walker, a one-paragraph bridge that states the stored-vs-wire reconciliation explicitly (the five stored labels summarize a wider Stripe set; `incomplete_expired` and `unpaid` are *collapsed in the projection*, L4, not seen by the app). Use an `Aside` (note) so it reads as a precision footnote, not a new concept.

### The access decision, encoded once

Collapse the walk into the contract. Two parts.

**The decision table (static).** A small visual table — render as a plain Markdown table or a `Buckets`-style grouping is overkill; a static table is clearest here. Three columns: status, access?, why. Rows for all five stored labels plus the cancelled-but-not-expired nuance:
- `trialing` → grant → trial is full access
- `active` → grant → healthy (covers winding-down: still `active` until period end)
- `past_due` → grant → dunning grace; warn, don't lock
- `canceled` → deny → relationship ended (grant *only* while `currentPeriodEnd` is future AND `cancelAtPeriodEnd` — but note the winding-down case is `active`, so in practice `canceled` means access is already over; call this out precisely)
- `incomplete` → deny → never truly subscribed

Be precise about the cancelled edge: because Stripe holds the status at `active` with `cancelAtPeriodEnd: true` during the paid-through window and only flips to `canceled` at the period boundary (`customer.subscription.deleted`), the "still has access after cancelling" case is handled by the `active` row, not by special-casing `canceled`. This corrects the chapter-outline's looser phrasing ("`canceled` grants access while period_end is future") — with this projection, by the time status is `canceled`, the period is over. State this as the senior nuance so a downstream agent doesn't write an access check that grants on `canceled`.

**`hasActiveAccess` (the artifact).** Show the full function with `AnnotatedCode` (single block, focus moves part to part). Signature and shape:
- `export const hasActiveAccess = (entitlement: PlanEntitlement): boolean => { ... }` — arrow bound to `const` per Function-form conventions (not a `function` declaration; it is neither hoisted nor a type guard).
- Body: a `switch (entitlement.status)` over the five stored labels returning `true` for `trialing | active | past_due` and `false` for `canceled | incomplete`. `noFallthroughCasesInSwitch` and an exhaustive default (a `never` check, e.g. `const _exhaustive: never = entitlement.status`) so adding a future stored status is a compile error — this *is* the "one place to change when Stripe semantics shift" payoff, made structural.
- Reuse `PlanEntitlement` from L4 (`import type { PlanEntitlement }` from the entitlements query/schema module) — annotate this in a step; do not redefine the type.
- Annotated steps: (1) signature + why `PlanEntitlement` in / `boolean` out, (2) the three grant cases as one group, (3) the two deny cases, (4) the exhaustive `never` default and what it buys.

Land the senior anchor: one function, one switch, every gate calls it — never ad-hoc `status === 'active' || status === 'trialing'` scattered across the codebase (that is the bug class — someone forgets `trialing`, or `past_due`, and ships a lockout).

**Where it's called (sketch only).** Brief prose + a tiny `Code` snippet showing two representative call sites as *reads* — a Server Component gate (`if (!hasActiveAccess(entitlement)) return <Paywall />`) and the *idea* that L6's `requirePlan` will wrap this server-side. Explicitly defer the real `requirePlan`/`BillingError`/throwing contract to L6 with one sentence. Do not build `requirePlan` here.

### Access and tier are different questions

Teach the orthogonality the chapter framing calls out: `(plan, hasAccess)` is two-dimensional. A `past_due` Pro user still has *Pro* features during grace (tier = pro, access = true). A `canceled` user is access=false regardless of what plan they were on. The two gates compose; conflating them ("downgrade to free on past_due") is wrong — `past_due` is an *access* signal, not a *tier* change; tier only changes when the plan slug changes.

Small visual: a 2×2 (or 2-axis) framing — one axis `hasAccess` (true/false), one axis `plan` (free/pro/team) — rendered as a compact HTML+CSS grid inside a `<Figure>`, or simplest, a short `Buckets` exercise (see below) doubling as the check. Pedagogical goal: cement that "can they in at all" and "what tier" are answered by different fields and different helpers. Name the two helpers: `hasActiveAccess(entitlement)` for the gate, `entitlement.plan` (and any `requirePlan('pro')` tier check, L6) for the tier — they are read independently at the call site.

### Surfacing status: the banner above the app

Status awareness is a UI concern, not only a gate. Every authenticated page renders a small status banner above the main content whenever `status` is neither `active` nor `trialing` (the two "nothing to say" states), plus the winding-down case (`active` + `cancelAtPeriodEnd`). Copy is keyed by status; each banner carries a CTA that deep-links into the Portal (`billing.openPortal`, L3) — naming the destination, never a generic "Manage billing."

Show the *shape* of the banner-copy mapping (a `Record` from status/condition to `{ message, ctaLabel }`) with a small `Code` block — this is illustrative, not a finished component. Three canonical rows:
- `past_due` → "Your payment failed — update your card to keep <Pro>." → Portal (payment-method update deep-link).
- winding-down (`active` + `cancelAtPeriodEnd`) → "Your subscription ends on <date> — keep your features." → Portal / reactivate (sets `cancelAtPeriodEnd: false`; mention `billing.reactivate` or a Portal flow, foreshadow, don't build).
- `canceled` / terminal → "Your subscription was canceled — re-subscribe." → Checkout (`billing.upgrade`, L2), *not* Portal (no live subscription to manage).

Note the asymmetry the chapter framing flags: *starting* from free uses Checkout; *modifying* an existing subscription (confirm trial, undo cancel, change plan) uses the Portal or the API — so the terminal-state CTA routes to Checkout while the grace/winding CTAs route to the Portal. Render the three banners as a `Screenshot`-style mock or, better, a `TabbedContent` with three tabs (one per status) each holding a small styled HTML banner mock inside a `<Figure>` — lets the student see the copy/CTA per state without three separate figures. Keep mocks as plain HTML+CSS, not wired components.

Accessibility note inline (one sentence, per code standards): the banner is a `role="status"` live region for the non-urgent cases. Do not over-elaborate; just plant it.

### The two traps seniors hit here

Fold the two highest-value real-world watch-outs into a content section (not a tip dump), each as a short subsection-worthy beat:

**Don't invent statuses Stripe doesn't ship.** The tempting move is a synthetic `'trial_ended'` status. Stripe never emits that; computing it means a state machine over event history ("was trialing, now isn't") that someone has to own and that drifts from Stripe. The senior pattern: read the Stripe-derived stored status, and compose *semantic predicates at the call site* — e.g. `isInGracePeriod(e)`, `isWindingDown(e)` — as pure functions over the existing fields, never as new stored statuses. Show one tiny predicate (`isWindingDown = (e) => e.status === 'active' && e.cancelAtPeriodEnd`) as the contrast to a stored field. This also reinforces the `hasActiveAccess`-is-the-only-switch discipline.

**Seat overage is a human decision, not an automatic one.** A Team plan that downgrades from 10 seats to 5 (via Portal) leaves 5 members over the new limit. The app must *not* auto-kick members — it surfaces the constraint ("10 members, 5 seats — remove 5 or upgrade"), blocks *new* invites until reconciled, and lets the owner choose. Tie to L4's `seats` column and the ch056 membership source of truth (the entitlement says how many you bought; membership says how many you have; the gate is the action that crosses the line). Flag this as product-specific — the project ships banner-and-block; real products may invert. Keep it to one tight paragraph; it is a named discipline, not a build.

### Check your understanding

Place exercises *in the sections they reinforce* per pedagogy (the framing here just lists them; move each to its home section when writing, or keep a small consolidated check here — author's call, but prefer in-section for the buckets and a consolidated MCQ/TrueFalse round at the end).

- **`Buckets` (status → access)** — best fit for the decision-table section. Two buckets: "Grant access" / "Deny access." Chips: `trialing`, `active`, `past_due`, `canceled`, `incomplete`, plus a prose chip "cancelled, period ends next week (status still `active`)". Grades the core decision table directly. Reuse this as the orthogonality check too or keep separate.
- **`MultipleChoice` (the boolean trap)** — single question: "A customer's renewal payment just failed. What should the app do?" with the `past_due` grace answer correct and the instant-lockout / instant-downgrade distractors. Reinforces the lesson's thesis.
- **`Sequence` (the winding-down arc)** — order the steps of a graceful cancellation: user cancels in Portal → status stays `active`, `cancelAtPeriodEnd=true` → app shows "ends on <date>" banner → period end → `customer.subscription.deleted` fires → webhook writes `status: 'canceled'` → access ends. Cements that cancellation is a *sequence over time*, not an instant flip, and ties status to the ch063 webhook without re-teaching it.

(`ReactCoding` is viable for a tiny `hasActiveAccess` implement-the-switch exercise since it is pure React/TS with no third-party npm — see the env note that ReactCoding is react-only. Optional: a target-tests `ScriptCoding`/`ReactCoding` where the student fills the switch and tests assert each status maps correctly. If included, place it right after the `AnnotatedCode` in "The access decision, encoded once." Prefer this guided exercise over any sandbox.)

### External resources (optional, end)

One or two `ExternalResource` cards: Stripe's "Subscription lifecycle / statuses" docs page and the "smart retries / failed payments (dunning)" docs page. Keep to canonical Stripe docs; no blog posts.

---

## Components and code-handling summary

- **`StateMachineWalker` (`kind="machine"`)** + Mermaid `stateDiagram-v2` in `diagram` slot — the lifecycle spine. One `<Question>` per stored status, branches = transitions, ids chosen to highlight-match the diagram.
- **`AnnotatedCode`** — the `hasActiveAccess` switch, 4 steps. The lesson's one finished artifact.
- **`Code`** — small illustrative snippets: two call sites (sketch), the banner-copy `Record`, the `isWindingDown` predicate. None are finished components; mark them illustrative.
- **`TabbedContent`** (3 tabs) or `Screenshot`/`Figure` — three status banners as HTML+CSS mocks.
- **`Figure` + HTML/CSS grid** — the `(plan, hasAccess)` 2-axis visual (or fold into the `Buckets` exercise).
- **Exercises:** `Buckets` (status→access), `MultipleChoice` (boolean trap), `Sequence` (winding-down arc), optional `ReactCoding`/`ScriptCoding` (implement the switch).
- **`Term`:** **dunning** (owned by this lesson). Consider `<Term>` also on **proration** only if it appears (it shouldn't need to — L3 owns it; skip). Optionally **smart retries** if used in prose.
- **`Aside`:** caution for "no `is_paid` beside `status`"; note for the stored-vs-wire reconciliation footnote.

## Code conventions to honor

- `hasActiveAccess` is an **arrow bound to `const`** with an explicit `boolean` return (exported function → annotate return), `switch` with an **exhaustive `never` default** (leans on `noFallthroughCasesInSwitch`).
- **Never `enum`** — statuses are the L4 string-literal union; reuse it, don't restate.
- Reuse **`PlanEntitlement`** (`typeof planEntitlements.$inferSelect`) from L4; do not redefine. `currentPeriodEnd` is a `Date` on the subscription *item* — do not reintroduce root-level `current_period_end`.
- Predicates (`isWindingDown`, `isInGracePeriod`) are pure, intent-named arrow helpers (Naming §"Pure helpers").
- Booleans read as predicates; **no negated booleans** (`hasActiveAccess`, not `isLockedOut`).
- Banner live region uses `role="status"` (Accessibility baseline). The `&&`-render of a banner must guard on a proper boolean.
- Deep-link CTA copy names the destination (carried from L3's discipline).
- Defer all throwing/`Result`/`BillingError` shapes to L6 — this lesson returns a `boolean` and renders UI; it does not own the error contract.

---

## Scope

**Prerequisites to restate concisely (one line each, do not re-teach):**
- `plan_entitlements` is a one-row-per-org derived projection, webhook is the only writer, read via `getEntitlement(orgId)` (L4).
- `status` was stored as an opaque label in L4; this lesson gives it meaning.
- Checkout starts subscriptions (L2); the Portal manages them and `cancel_at_period_end` is its cancellation default (L3); the webhook produces status changes (ch063).

**This lesson does NOT cover (defer, do not write):**
- The `plan_entitlements` schema/columns or write side, and `subscriptionToEntitlement` internals — L4. (Only *reference* that the projection normalizes wire→stored statuses.)
- The webhook handler that emits status updates (signature verify, `processed_events`, UPSERT, ordering predicate) — ch063 + project ch065.
- The `billing.*` interface, `/lib/billing/`, `requirePlan`, and the full `BillingError`/`Result` throwing contract — L6. Sketch call sites only.
- The success-page poller / redirect-vs-webhook race — ch063 L4 (reference by name only).
- Dunning *configuration* in the Stripe dashboard, custom retry logic, in-app payment recovery — out of scope; Stripe owns it. Define the *term* dunning; do not drill the dashboard.
- Building `billing.reactivate` / trial-confirm actions — foreshadow only; the API exists, the implementation ships in the project.
- Seat-enforcement *mechanics* (invite/role gate) — built in ch056; here only name the seat-overage *policy* (surface + block), don't implement.

**Boundary corrections for downstream agents:**
- Keep `hasActiveAccess` switching over the **five stored labels only**; `incomplete_expired`/`unpaid` are collapsed in the L4 projection and must not appear in the switch.
- Do **not** write an access check that grants on `status === 'canceled'`; with this projection, the winding-down grace is carried by `active` + `cancelAtPeriodEnd`, and `canceled` always means access is over.
