# Chapter 12.2 — Pedagogical approach

## Concept 1 — The four-object Stripe graph

**Why it's hard.** Stripe's API surface is sprawling, and the natural first instinct is to map "Pro plan, monthly + yearly, 14-day trial" onto a single object. Students collapse Product and Price (or worse, model one Product per billing cycle), wire `price_id` strings into code, and don't see why a Customer is org-scoped instead of user-scoped until seats break it months later.

**Ideal teaching artifact.** A static, hand-laid anatomy figure of the four-object graph — Product at the top, two Prices fanning off it (monthly + yearly, each carrying a `lookup_key`), a Customer node bound to one Organization (with `metadata.organization_id` annotated as a callout pin), and one Subscription joining Customer to Price-items. The figure annotates each edge with the cardinality rule the chapter pins ("one Product per plan tier, not per cycle"; "one Customer per org, not per user"). A Concept archetype: the student studies the graph once, then sees every later code sample refer back to the same nodes.

**Engagement.** A bucket sort: a dozen real-shaped tokens (`prod_...`, `price_...`, `cus_...`, `sub_...`, `course_pro_monthly`, `org_abc123`, an email address, a `created` timestamp) sorted into the four object columns plus a "metadata" column. Locks the graph's vocabulary and surfaces the lookup-key-is-not-an-ID distinction.

**Components.**
- Hand-SVG inside `Figure` for the anatomy diagram (single-use composition — `Figure` carries it).
- `Buckets` (two-column) for the sort.

**Project link.** Every webhook handler in 12.3 reads `event.data.object` and resolves Customer → Org via the metadata pin; the projection function reads `items.data[0].price.lookup_key`. The figure is the map the student keeps open.

---

## Concept 2 — Test mode and live mode are separate universes

**Why it's hard.** Students intuit "test mode" as a flag on a single account — same Customers, same Subscriptions, just no real money. It isn't. Every object lives in one universe and the IDs never cross. The first time `price_id_test_xyz` lands in production code as a string literal, the deploy breaks silently.

**Ideal teaching artifact.** A side-by-side comparison figure: two mirrored panels labeled "Test mode" and "Live mode," each showing the same shape of objects (Product, Price, Customer) with different-prefixed IDs (`prod_test_...` vs `prod_live_...`, `sk_test_...` vs `sk_live_...`). An arrow labeled `lookup_key` jumps across the gap — the only handle that survives promotion. A Concept archetype with an explicit "what's stable across the gap" annotation, so the reader sees why the chapter never lets a `price_id` string into code.

**Engagement.** A short `MultipleChoice`: "Production deploy fails with `No such price: price_1Q...`. The most likely cause?" with the test-mode-ID-in-code option correct, alongside two plausible distractors (webhook secret mismatch, missing env). Confirms the student internalized the asymmetric trust between IDs and lookup keys.

**Components.**
- Hand-SVG inside `Figure` for the two-universe panel (single-use, but pairs structurally with Concept 1's graph — same node shapes in two columns; `Figure` carries it).
- `MultipleChoice`.

**Project link.** The starter ships `.env.example` with `sk_test_` only and the typed env validates the prefix at boot; the student paste-cycles a `whsec_` from `stripe listen` every session.

---

## Concept 3 — Metadata as the org-id carry-channel

**Why it's hard.** When a webhook fires, the handler holds a Stripe Customer ID but needs to write to one app-side `organizations` row. The naïve answer is a lookup table; the right answer is a piece of metadata stamped at creation. Students don't see why until the lookup query becomes the slowest part of the handler or the "wrong org got upgraded" incident lands.

**Ideal teaching artifact.** A scrubbable sequence diagram — `DiagramSequence` with four steps: (1) user clicks Upgrade in app, handler stamps `subscription_data.metadata.organization_id = org_abc`; (2) Stripe creates Subscription, metadata travels with it; (3) webhook fires, payload carries the metadata; (4) handler reads `event.data.object.metadata.organization_id` and writes to that org's entitlement row. Each step highlights the same `org_abc` token traveling through the system. A Concept archetype showing the carry-channel as one continuous thread, not three independent reads. A second annotated panel below the sequence shows the safety-net fallback: the `stripeCustomerId` reverse lookup if metadata is missing, plus the cross-check (forward to 12.3.7) when both are present and disagree.

**Engagement.** A `PredictOutput`-style question: a code block creates a Checkout session without the metadata. The webhook handler later runs and asks "what does the handler need to do to find the org?" — student picks between "read metadata," "look up by `stripeCustomerId`," "fail closed." Forces them to articulate the primary path and the fallback explicitly.

**Components.**
- `DiagramSequence` with four `DiagramStep`s.
- Hand-SVG inside `Figure` for the safety-net + cross-check panel.
- `PredictOutput`.

**Project link.** The `billing.upgrade` Server Action (12.3.6) sets `subscription_data.metadata.organization_id`; `onCheckoutCompleted` reads it; 12.3.7 lands the cross-check as the chapter's last hardening.

---

## Concept 4 — Checkout is a single-use server-created URL

**Why it's hard.** Students who've done client-side payments before expect "a checkout component you render on the pricing page." Stripe's hosted Checkout is the opposite: the server creates a one-time URL parameterized with Customer + Price + URLs, the client redirects, payment happens on Stripe's domain, redirect back. The mental shift is "the page lives elsewhere; my server's job is to mint the link."

**Ideal teaching artifact.** A Mechanics-archetype walkthrough of the `billing.upgrade` action body using `AnnotatedCode` — step the student through (1) resolve org and ensure Customer, (2) look up Price by `lookup_key` (the catalog dereference), (3) `stripe.checkout.sessions.create` with the load-bearing fields highlighted (`mode: 'subscription'`, `customer`, `line_items`, `success_url`, `cancel_url`, `subscription_data.metadata`), (4) return `{ url }`. Each step's annotation names what the field does *and* what breaks if you skip it (no `customer` → orphan Customer; no `metadata` → no carry-channel; `success_url` to a marketing page → polling story dies). A small inset panel calls hosted-vs-embedded as the default-and-trigger: hosted by default, embedded earns its weight only when redirect-breaks-conversion data shows it.

**Engagement.** A `Dropdowns` fill-in over the action body with four blanks: `mode`, the `success_url` interpolation token, the `subscription_data.metadata` key, the return shape. Confirms the student can rebuild the call without looking, including the load-bearing field names.

**Components.**
- `AnnotatedCode` for the action walkthrough.
- `Aside` (note) for the hosted-vs-embedded threshold callout.
- `Dropdowns`.

**Project link.** 12.3.6 ships this code verbatim; the inspector's "Upgrade to Pro" button fires it.

---

## Concept 5 — Lazy Customer creation is the one cross-system write

**Why it's hard.** Creating a Stripe Customer and updating `organizations.stripe_customer_id` are two writes against two systems. They can't be atomic. Students reach for transactions, fail to find one that spans both, and either give up (creating duplicate Customers on every retry) or invent a saga pattern that overshoots. The senior move is much smaller: order the writes Stripe-first, accept orphan Customers on retry as the recoverable failure mode, never accept a dangling app-side pointer.

**Ideal teaching artifact.** A two-branch decision figure showing both failure orderings — left panel: app write first, Stripe write fails → app has a pointer to a Customer that doesn't exist (unrecoverable, gate fails forever); right panel: Stripe write first, app write fails → Stripe has an orphan Customer (recoverable, retry finds-or-creates). A Decision archetype: name the trade-off, name the cost of each side, declare the default. A short prose callout adds the production-grade reach (`stripe.customers.list({ email })` as the find-step before create).

**Engagement.** A `TrueFalse` round of three: "Creating the Stripe Customer before the local write is a transactionality bug" (false — the asymmetric failure modes are the lesson); "A duplicate Stripe Customer on retry can be reconciled by listing by email" (true); "Storing a `stripe_customer_id` that points at a non-existent Customer is recoverable by retry" (false). Surfaces the recoverability asymmetry the figure pins.

**Components.**
- Hand-SVG inside `Figure` for the two-branch decision diagram (single-use, structural; `Figure` carries it without bespoke tooling).
- `TrueFalse`.

**Project link.** The `billing.upgrade` action body in 12.3.6 implements the Stripe-first ordering; the senior-call commentary names the production hardening.

---

## Concept 6 — The redirect-vs-webhook race and read-and-poll

**Why it's hard.** The user pays on Stripe and gets redirected to `/billing/success?session_id=...` *before* the `checkout.session.completed` webhook arrives at the app. Students' first instinct is to write entitlements from the success page (using the `session_id` to fetch the session). That creates a second writer, races the webhook, and breaks the single-writer rule from 12.1. The right shape is structurally smaller: success page reads-and-polls only; the webhook owns the write.

**Ideal teaching artifact.** A scrubbable timeline — `DiagramSequence` with five steps showing the parallel tracks: t=0 user lands on success page (entitlement still `free`); t=200ms webhook in flight; t=400ms webhook lands, UPSERTs `plan_entitlements`; t=500ms success page's `router.refresh()` fires, reads new entitlement; t=600ms page swaps from "finalizing" to "you're on Pro." A separate track underneath shows the *wrong* shape (success page also writes) with the two arrows colliding into the same row. A Concept archetype with the explicit "two writers vs. one writer" contrast — the visual is the lesson.

**Engagement.** A `Sequence` ordering drill: the student arranges six events (Checkout submit, redirect to success URL, webhook receipt, dedup claim, entitlement UPSERT, success-page refresh) in the order they happen, *and* in the order the success-page render must tolerate them happening. The two orderings differ at one boundary — that's the load-bearing recall.

**Components.**
- `DiagramSequence` for the parallel-tracks timeline (with hand-SVG inside each step showing both the right and wrong shapes side by side).
- `Sequence` for the ordering drill.

**Project link.** The provided `Poller.tsx` in 12.3's starter runs the 500ms `router.refresh`; 12.3.7 verifies the fallback when the webhook is disabled (the page sits at "finalizing" until the 30s budget elapses).

---

## Concept 7 — The Portal owns user-initiated mutations

**Why it's hard.** The Portal looks like "another screen Stripe gives you" — easy to dismiss as a shortcut. The senior framing inverts that: the Portal is the *default* for everything the user initiates (plan change, cancel, card update, invoice download), and building any of those screens in-house is a permanent maintenance bill the chapter explicitly refuses. Students underestimate this; they want the brand consistency and don't see the per-screen cost.

**Ideal teaching artifact.** A comparison figure with two columns labeled "Build in-house" and "Use the Portal." Each row is a billing screen (change plan, cancel, update payment method, download invoice, manage tax ID); the in-house column lists what the team would own (UI, validation, PCI compliance for card update, i18n, accessibility); the Portal column is one cell with "redirect." A Decision archetype: the cost asymmetry is the visual, not a paragraph. A footer row pins the threshold conditions that flip the choice (regulated industries with explicit consent, slider-driven seat counts, B2B contract upgrades). Add a small inset on Portal deep-link flows (`flow_data: { type: 'subscription_cancel' }`) as the conditional reach.

**Engagement.** A `Buckets` sort of ten billing-related UX moments ("user cancels," "user upgrades from Pro to Team," "user updates expired card," "user downloads last quarter's invoices," "user with custom contract negotiates renewal," "user wants seat-count slider with live price preview," etc.) into "Portal" vs "Build in-house." Surfaces the threshold conditions rather than reciting them.

**Components.**
- Hand-SVG inside `Figure` for the cost-asymmetry comparison (single-use but content-heavy; `Figure` carries it).
- `Buckets`.

**Project link.** 12.3.6's `billing.openPortal` is the entire surface; the inspector's "Manage billing" button opens it; 12.3.7 verifies cancel-at-period-end.

---

## Concept 8 — `cancel_at_period_end` is a winding-down state, not a cancellation

**Why it's hard.** "Canceled" feels like a single event. It isn't. When a user cancels in the Portal, the Subscription stays `active` with `cancel_at_period_end: true` until `current_period_end` arrives; only then does Stripe fire `customer.subscription.deleted`. The application must keep access live throughout, surface a "ends on Aug 14" banner, and only flip to free at the deletion event. Students who model status as a boolean lose this state entirely.

**Ideal teaching artifact.** A state-machine diagram (Mermaid `stateDiagram-v2`) showing the Subscription lifecycle: `active` → `active + cancel_at_period_end=true` (the winding-down state, labeled with the banner copy) → `canceled`. Transitions are labeled with the events that drive them (`customer.subscription.updated` flipping the flag, `customer.subscription.deleted` at period end). The diagram makes "winding down" a named node, not a footnote on `active`. A Concept archetype.

**Engagement.** A `MultipleChoice` (multi-correct): "A user clicks Cancel in the Portal on Aug 1; their current period ends Aug 14. Which are true at Aug 7?" with options including "they still have Pro access" (correct), "the entitlement row shows `status: 'canceled'`" (wrong — still `active`), "the UI shows a banner with the end date" (correct), "`cancel_at_period_end` is `true`" (correct), "the webhook has already fired `subscription.deleted`" (wrong). Locks the temporal distinction.

**Components.**
- Mermaid `stateDiagram-v2`.
- `MultipleChoice` (multi-select).

**Project link.** 12.3.6's verification clicks Cancel in the Portal and watches the inspector pick up `cancel_at_period_end: true` while keeping access live; 12.3.7 walks the period-end deletion.

---

## Concept 9 — `plan_entitlements` is a derived, single-writer view

**Why it's hard.** Two failure modes pull in opposite directions. Mirroring Stripe's full Subscription schema creates schema churn and stale columns. Calling `stripe.subscriptions.retrieve` on the request path makes every page Stripe-dependent (latency, rate limits). The senior shape is a third option students don't reach for: a small projection table, written exclusively by the webhook, read by every gate. Two rules, structurally enforced — one writer, hot-path-readable shape.

**Ideal teaching artifact.** A two-panel figure. Left panel: Stripe's Subscription object with every field listed (status, items, current_period_end, cancel_at_period_end, latest_invoice, default_payment_method, livemode, billing_cycle_anchor, …) — the visual point is *how much there is.* Right panel: the `plan_entitlements` row with eight columns highlighted. Arrows from a subset of left-panel fields to right-panel columns trace the projection; the rest of the Stripe fields fade out, labeled "not read on the hot path." Below the figure, a single-arrow diagram makes the writer rule explicit: webhook → table (one arrow); every other surface → table (crossed out). A Concept archetype where the figure's information density carries the "small projection" insight.

**Engagement.** A `Buckets` two-column sort of fifteen Stripe-side fields into "project into `plan_entitlements`" vs. "leave on Stripe." Followed by a `MultipleChoice`: "A Server Action needs to know whether the user has Pro access. The right call is …" with `getEntitlement(orgId)` correct against three distractors (`stripe.subscriptions.retrieve`, a fresh DB query against `subscriptions` table, a Portal-session check). The sort exercises the projection cut; the MCQ locks the read-side rule.

**Components.**
- Hand-SVG inside `Figure` for the projection diagram + the single-writer arrow (content-rich, two panels; `Figure` carries the composition).
- `Buckets`.
- `MultipleChoice`.

**Project link.** 12.3.5 lands the schema, the pure `subscriptionToEntitlement` projection, and the three handlers; `getEntitlement` is the read seam every gate calls.

---

## Concept 10 — Status is a string with semantics, not a boolean

**Why it's hard.** The naive shape is `is_paid: boolean`. Stripe ships seven status values (`trialing`, `active`, `past_due`, `canceled`, `incomplete`, `incomplete_expired`, `unpaid`), and each one has a distinct application response: grant access (trialing, active, past_due), grant conditionally (canceled + future period_end), deny (incomplete, unpaid). Collapsing this to a boolean either locks out paying customers in `past_due` grace or grants access to never-paid `incomplete` users.

**Ideal teaching artifact.** A decision-table figure rendered as a real table — rows are the seven statuses, columns are "grant access," "banner copy," "CTA target." Each cell is filled. The table is the `hasActiveAccess` function in tabular form before the student writes it as code. Below the table, the function shape itself in a small code block: `(e: PlanEntitlement) => boolean`, with one annotated line per row of the table. A Concept-into-Pattern artifact: the table is the spec, the function is its mechanical translation.

**Engagement.** A guided puzzle — the student is shown six concrete scenarios ("user's card failed yesterday, retry scheduled tomorrow"; "user filled out Checkout, 3DS failed, never completed"; "user canceled five days ago, period ends in nine days"; etc.) and must, for each, pick the right status, predict `hasActiveAccess`, and pick the right banner. Three rounds locked in: status → access → banner. This is the recall test for the decision table.

**Components.**
- Hand-SVG inside `Figure` for the decision table (a real `<table>` styled — single-use composition, no widget needed).
- A new `StatusScenarios` puzzle widget that walks the student through six scenarios with three dropdowns each (status / access / banner) — see proposals below.

**Project link.** 12.3.5 ships `hasActiveAccess` as a pure function; 12.3.7 walks all eight scenarios via the inspector's "force entitlement status" debug.

---

## Concept 11 — Plan tier and access are orthogonal gates

**Why it's hard.** Students conflate "are you on Pro?" with "do you have access?" — they're not the same question. A `past_due` user on Pro still has Pro features during grace; a `canceled` user is on free regardless of what they had. The shape is two-dimensional: `(plan, hasAccess)`. Conflating to one dimension produces either over-restrictive gates (lockout during grace) or over-permissive gates (lapsed customer keeps Pro).

**Ideal teaching artifact.** A 2×2 (really 3×2) matrix figure — rows are plans (`free`, `pro`, `team`), columns are `hasActiveAccess` (true / false). Each cell shows what the application renders (free-true: free features; pro-true: pro features; pro-false: pro account with a "no access" banner; etc.). A Concept-into-Decision artifact: the orthogonality is the visual, not a paragraph. A short prose follow-on names `requirePlan(planSlug)` as the composition of both dimensions.

**Engagement.** A `Matching` exercise: left column lists six user states ("Pro, trialing"; "Pro, past_due"; "Pro, canceled with period_end last week"; "Team, active"; "Free, active"; "Pro, incomplete"); right column lists six application responses ("render Pro dashboard," "render Pro dashboard + 'update your card' banner," "render free dashboard + 'resubscribe' CTA," "render Team dashboard," "render free dashboard," "render free dashboard + 'finish Checkout' CTA"). Pairing them surfaces the two-dimensional thinking concretely.

**Components.**
- Hand-SVG inside `Figure` for the 3×2 matrix (single-use, structural).
- `Matching`.

**Project link.** 12.3.6's `requirePlan` is the matrix encoded — reads entitlement, checks both `hasActiveAccess` and tier; the inspector's `/inspector/pro-only` exercises the composition.

---

## Concept 12 — The `billing.*` interface is the only place `stripe` is imported

**Why it's hard.** Architectural Principle #5 said "don't wrap the framework." Now the chapter introduces a wrapper. Students either over-apply the wrapper instinct (wanting to wrap every SDK) or read the carve-out as an exception that loosens the principle. The carve-out actually *sharpens* the principle: wrap when the discipline matters more than the call site's clarity, and only then. The structural enforcement — `/lib/billing/` is the SDK's only home, every other file imports from `billing` — is what makes the rule keep itself.

**Ideal teaching artifact.** A FileTree composition (`FileTree` component) showing the project's `lib/` directory with `billing/` highlighted as the SDK boundary — `stripe.ts` (the singleton, marked "only file that imports `stripe`"), `upgrade.ts`, `portal.ts`, `require-plan.ts`, `entitlement.ts`, `index.ts` (the public surface). Beside it, an `ArrowDiagram` shows the import graph: app code → `billing` (allowed), app code → `stripe` (forbidden, struck through), `billing` → `stripe` (allowed, inside the boundary). The ESLint `no-restricted-imports` rule is the structural enforcement, shown as a small code block underneath. A Pattern archetype — the wrapper's payoff is the rule it enforces.

**Engagement.** A `CodeReview`-style exercise: a small diff introduces `import Stripe from 'stripe'` in `app/(app)/billing/page.tsx` to "save a call." The student leaves a review comment naming the violated boundary and the right fix (import from `billing` instead). AI grades against a kernel like "names the `/lib/billing/` boundary or the lint rule."

**Components.**
- `FileTree` for the directory shape.
- `ArrowDiagram` for the import graph.
- `Code` for the ESLint rule.
- `CodeReview` for the engagement.

**Project link.** 12.3.6 lands the three methods, the directory shape, and the lint rule; 12.3.7 verifies the rule blocks a stray `import Stripe`.

---

## Concept 13 — `requirePlan` is the load-bearing gate

**Why it's hard.** Of the three methods in `billing.*`, `requirePlan` is the one whose absence is invisible until production. Forgetting it on a paywalled Server Component means the page renders for everyone — no error, no test failure, just a silent leak. The pattern that protects this is structural: every privileged Server Component imports `requirePlan` from `billing` and calls it at the top, before any data read. The same "audit for missing calls" lint pattern that `authedAction` uses.

**Ideal teaching artifact.** A wrong-by-default code sample using `CodeVariants`: tab 1 is a paywalled Server Component without the gate (renders Pro features for any signed-in user); tab 2 is the same component with `await billing.requirePlan('pro')` at the top and `BillingError` discrimination in `error.tsx`. The diff between tabs is one line in the component plus one branch in `error.tsx`. A Pattern archetype: the failure mode is named (silent leak), the structural fix is one import + one call, the lint rule is the safety net for the missing call. A second short paragraph names the parallel to `authedAction` from 10.2.2 — same audit class, same "find every privileged surface without the call" lint pattern.

**Engagement.** A `Tokens` exercise on the corrected Server Component code: the student clicks the load-bearing pieces — the `await billing.requirePlan('pro')` call site, the `BillingError` discrimination in `error.tsx`, the `instanceof` check. Decoys: the data read, the JSX render, the `'use server'` directive (none of those are the gate). Surfaces "which line is the gate" as a recallable visual.

**Components.**
- `CodeVariants` for the wrong/right comparison.
- `Tokens` for the engagement.

**Project link.** 12.3.6 ships `requirePlan` and wires `/inspector/pro-only`; 12.3.7 verifies the gate against every status in the decision table.

---

## Concept 14 — The three-test threshold for wrapping an SDK

**Why it's hard.** "When do I wrap an SDK?" has no good aesthetic answer — symmetry is the wrong heuristic, and "consistency" is a smell. The chapter's answer is a decidable three-test threshold: read-hostile shape, real swap cost, discipline to centralize. Auth and billing pass three-for-three; Resend, Trigger.dev, R2 fail at least one. Students who don't see this end up either wrapping everything (maintenance bill) or wrapping nothing (no audit boundary for the things that need one).

**Ideal teaching artifact.** The matrix already in the chapter outline rendered as a real table figure — rows are the three tests, columns are the five SDKs (Resend, Trigger.dev, R2, Auth, Billing). Each cell is filled with yes/no/partly. Below the table, a one-line summary per column states the verdict ("helper," "no extra layer," "helper," "interface in `/lib`," "interface in `/lib`"). A Decision archetype where the matrix *is* the threshold, not an illustration of it. The cell pattern (3/3 → interface; 2/3 → helper at call site; fewer → leave it) is the take-home.

**Engagement.** A guided puzzle: the student is given three hypothetical new SDKs the team is considering wrapping — a Slack notifier (terse shape, low swap cost, no discipline), a feature-flag service (medium shape, high swap cost, gating discipline), a date library (terse shape, low swap cost, no discipline) — and runs each through the three tests, then picks the verdict (interface / helper / nothing). The puzzle's correctness is the recall: did the student internalize the threshold as a procedure?

**Components.**
- Hand-SVG inside `Figure` for the matrix table (a styled `<table>` — single-use, content-heavy; `Figure` carries it).
- A new `WrapperDecider` puzzle widget that walks three hypothetical SDKs through the three-test threshold with radio-button verdicts — see proposals below.
- Fallback: if `WrapperDecider` doesn't earn its weight, three sequential `MultipleChoice`s do the same job at lower cost.

**Project link.** No direct project artifact — this lesson is the architectural posture that explains the silence around the project's other third-party calls (Resend's `sendEmail` helper, the absence of a `notifications.*` interface).

---

## Component proposals

- **`StatusScenarios` puzzle widget**
  - Walks the student through six scenarios. Each scenario shows a short prose situation; the student picks (status enum, hasActiveAccess boolean, banner copy) from three dropdowns. Per-scenario feedback; round score at the end.
  - Uses in this chapter: Concept 10.
  - Forward-links: Unit 14 (notification dispatcher — same status enum drives email/in-app banners), Unit 19.6 (Stripe integration tests walk the same status table).
  - Leanest v1: a single MDX-driven array of scenarios, each with three `<select>`s, a check button, and an end-of-round score. No animation, no per-keystroke validation. If even leaner is needed, six sequential `Dropdowns` exercises with the same content carry 80% of the teaching value at zero new-component cost — and given the forward-links are about *content reuse* (same scenarios), not *widget reuse*, the `Dropdowns` fallback is genuinely competitive. Build the widget only if the per-scenario feedback shape (showing the right answer with prose explanation, not just a green tick) materially helps recall.

- **`WrapperDecider` puzzle widget**
  - Walks the student through N hypothetical SDKs against the three-test threshold. Each SDK shows a short prose description; the student answers three yes/no questions (read-hostile shape? real swap cost? discipline to centralize?), and a final dropdown picks the verdict (interface / helper / nothing). The widget grades the verdict against the test answers (3/3 → interface; 2/3 → helper; <2 → nothing).
  - Uses in this chapter: Concept 14.
  - Forward-links: None — single-use. The three-test threshold is named once in the course (this chapter) and applied to the existing five SDKs; no other chapter introduces a new wrapper-decision.
  - Leanest v1: three `MultipleChoice` questions per scenario (one per test) plus a final `MultipleChoice` for the verdict, threaded by prose. This is the demotion the single-use-discipline rule predicts: build the widget only if a richer single-page-form-with-feedback shape would materially out-teach three sequential MCQs. The default recommendation in Concept 14 is the MCQ fallback.

## Build priority

The only proposal that carries real forward-link weight is `StatusScenarios` — its content (the status × access × banner table) recurs in Unit 14's notification dispatcher and Unit 19.6's Stripe integration tests. Even there, the leanest v1 (six sequential `Dropdowns`) probably teaches the concept well enough that the bespoke widget needs an explicit per-scenario feedback affordance to justify the build. Start by drafting the lesson with six `Dropdowns`; if the recall affordance feels thin in review, upgrade to the widget.

`WrapperDecider` is single-use without a forward-link — the proposal is demoted in Concept 14's recommendation and likely should not be built. Three `MultipleChoice` questions per scenario are the default.

## Open pedagogical questions

- Concept 6's parallel-tracks timeline visualizes two simultaneous tracks (user-facing redirect vs. webhook); `DiagramSequence` is linear-step-based. The hand-SVG inside each step works, but if the human reviewer finds the timing comparison muddied, a small bespoke `ParallelTimeline` component (two horizontal swimlanes with shared timestamp axis) might earn its weight — it would also serve Chapter 13.1's `after()` lifecycle and Chapter 13.2's parent/child task drill. Flagging as a forward-link candidate worth tracking.
- Concept 10's `hasActiveAccess` decision table is at the boundary between "static table" and "small interactive playground where the student flips status and watches access toggle." The chapter outline's verify step (12.3.7) already provides the interactive version in the inspector itself — the lesson doesn't need to duplicate it. Confirming the chapter inherits the inspector as the interactive surface and leaves the lesson static.
