# Lesson title

- Title: The Stripe object graph
- Sidebar label: The Stripe object graph

# Lesson framing

This is the vocabulary lesson for the whole billing chapter. Everything downstream — Checkout (L2), Portal (L3), `plan_entitlements` (L4), status (L5), the `billing.*` interface (L6) — refers back to four Stripe objects: **Products, Prices, Customers, Subscriptions**. The lesson's job is to install that four-object mental model and the three conventions that ride on top of it (`lookup_key` over hardcoded IDs, metadata as the webhook carry-channel, test-vs-live mode discipline), plus the seam-level rules that frame the chapter (Stripe is the source of truth for billing facts; the app stores only a small projection; `lib/billing/stripe.ts` is the one place the SDK is imported).

Pedagogical stance and conclusions that apply lesson-wide:

- **Decisions before syntax.** This is not an API tour. Open with the senior question: Stripe's API surface is huge, but only a tiny subgraph matters for a SaaS subscription. The lesson's frame is "which four objects, how do they connect, and what does the app read vs. write." Every object is introduced by the *decision* it forces (one Product per tier, one Customer per org, `lookup_key` not `price_id`), not by listing its fields.
- **Anchor to what the student already shipped.** Chapter 063 gave them a verified, idempotent, single-writer webhook handler and the "webhook is the only writer for entitlement state" rule. Chapter 056 gave them Organizations as the tenancy unit and foreshadowed `organizations.stripe_customer_id`. Chapter 043 introduced Principle #5 and *named the billing carve-out as earning its weight later*. This lesson cashes none of those checks in full — it plants the flags so L2–L6 land cleanly. Constantly relate Stripe objects back to org-scoping and the webhook.
- **The hero visual is the graph itself.** A "Stripe object graph" is literally a small directed graph of four entities whose edges carry the lesson (a Subscription joins a Customer to Price items; a Price belongs to a Product). This is the exact shape `GraphExplorer` exists for — click each node for its role, click each edge for the relationship. This is the centerpiece of the lesson, introduced early and referred back to.
- **Minimize cognitive load via a running concrete example.** Use one example end-to-end: a SaaS with a **Pro plan** offered **monthly and yearly** with a **14-day trial**. Map that sentence onto the primitives (one Product "Pro"; two Prices `pro_monthly` / `pro_yearly`; the trial is a Subscription property). The concrete mapping is the payload of the whole lesson — abstract definitions land only after the student has seen "Pro, monthly/yearly, 14-day trial" decompose.
- **Mental model the student leaves with.** (1) Four objects, fixed relationships. (2) Stripe owns the billing state machine; the app mirrors only what it reads on the hot path. (3) Reference Prices by `lookup_key`, carry `organization_id` in metadata, never let a secret key reach the client, never mix test and live. (4) The catalog is code (`seed:stripe`), not dashboard clicks. (5) The SDK lives behind `lib/billing/`.
- **Keep code light.** This is conceptual; code samples are short and illustrative (a `lib/stripe.ts` singleton, a `plan_entitlements` column sketch, an env block, a webhook-event table). No full handlers — those are explicitly the project's job (chapter 065). State that boundary so the writer doesn't over-build.
- **Common beginner mistakes to surface as the watch-outs, inline.** Hardcoded `price_id` (breaks test→live), one Customer per user (kills seat plans), mirroring the full Stripe schema (drift), secret key in the client bundle (catastrophic leak), test/live key confusion. Each belongs *in the section teaching the concept it qualifies* — not bundled at the end.

Target time 35–45 min. No quiz (quiz is L8). No live-coding sandbox needs Stripe, so assessment is classification/recall exercises, not code execution.

# Lesson sections

## Introduction (no header)

State the goal warmly and briefly. The student has a webhook handler that can safely receive Stripe events (chapter 063) but hasn't met the objects those events describe. Before wiring Checkout or entitlements, they need the map: the handful of Stripe objects a subscription SaaS actually touches, how they relate, and the conventions that keep the integration from breaking on the first test-to-live promotion. Frame the senior question explicitly in prose: *Stripe's API is enormous; which small subgraph does a SaaS read, which does it write (always indirectly), and how does "Pro, monthly/yearly, 14-day trial" map onto Stripe primitives?* Preview the concrete example (Pro plan) and promise that by the end they can read any of the four objects in a Stripe payload and know what the app should do with it. Connect forward: this is the dictionary every later lesson in the chapter quotes.

## The four objects at a glance

Introduce the whole graph first, then drill each node — simplified-model-first, complexity-added-later. Lead with the hero `GraphExplorer` so the student sees the shape before the detail.

- **Diagram (centerpiece): `GraphExplorer`**, `direction="LR"`, title "The Stripe subscription graph". Four nodes: `product` ("Product — the plan"), `price` ("Price — cycle + amount"), `customer` ("Customer — the billing account"), `subscription` ("Subscription — the recurring link"). Each node's slot is a 2–3 sentence role summary written for the Pro example.
  - Edges (labelled, clickable — the relationship is the lesson):
    - `product` → `price`, label "priced by" — slot: a Product has no price of its own; one Product owns many Prices (monthly, yearly). This edge is where the "one Product per tier" rule lives.
    - `customer` → `subscription`, label "subscribes" — slot: a Customer owns subscriptions, payment methods, invoices. One active subscription per Customer is the SaaS default.
    - `subscription` → `price`, label "billed at" — slot: a Subscription references one (or more) Price items; the chosen Price decides amount and interval.
  - Optional `<Traversal label="Pro signup" sequence="customer,subscription,price,product" nodesOnly />` to walk "this org's Customer has a Subscription billed at the pro_monthly Price, which belongs to the Pro Product." Set the `placeholder` to point the reader at the play button.
  - Pedagogical goal: the student grasps the topology (Product↔Price one-to-many, Customer↔Subscription ownership, Subscription→Price reference) in one glance, then reads detail on demand. This replaces a wall of prose.
- After the diagram, a one-paragraph orientation: app **reads** these objects (mostly indirectly, via a projection — L4); app **writes** to them only through Stripe-hosted flows (Checkout L2, Portal L3); the webhook is how state changes come back. Plant "never call `stripe.*` on the request hot path" as a one-liner to be paid off in L4.

## Products: the plan as a sellable thing

Teach Product as "the thing you sell," carrying name, description, marketing-feature metadata, and a stable `id` — but **no price**. The senior anchor, stated up front as the decision: **one Product per plan tier, not per billing cycle.** Pro is *one* Product; its monthly and yearly are two Prices under it. Use the running example: "Pro plan" and "Team plan" are two Products.

- Why this matters: modeling per-cycle Products (a "Pro Monthly" Product and a "Pro Yearly" Product) duplicates the plan's identity and makes "is this org on Pro?" a two-value question instead of one. Tier is the Product; cycle is the Price.
- Keep it short — a few sentences and the example. No code (Products are created by the seed script, shown later).
- `<Term>` candidate: none new here; "metadata" is defined when it becomes load-bearing (the metadata section).

## Prices: the billing cycle and the amount

Teach Price as the object that binds a Product to a recurring **interval** (`month` / `year`), a **currency**, an **amount in the currency's smallest unit** (cents — call back to Chapter 001 "store cents, not dollars" in one clause), and a **`lookup_key`**. Pro example: `pro_monthly` (e.g. 2000 = $20.00/month) and `pro_yearly`.

- **The load-bearing rule of this section: code references `lookup_key`, never a raw `price_id`.** Explain *why* with the test/live frame the student will meet shortly: `price_id`s differ between test and live mode, so any hardcoded ID breaks the moment you promote to production; `lookup_key`s are author-chosen, stable, and identical across modes. The app resolves "the Price for plan `pro`, cycle `monthly`" by looking up the key.
- **Watch-out, inline:** putting `price_xxx` strings in code couples the app to a single Stripe mode and breaks on first test→live promotion — `lookup_key` instead. (This is the single most common beginner Stripe mistake; give it weight here, then it recurs as a callback in L2/L4.)
- Tiny `Code` snippet (illustrative, not a full helper): a one-line resolve like `await stripe.prices.list({ lookup_keys: ['pro_monthly'], limit: 1 })` returning the Price — just enough to show the key is the query handle. Note it's illustrative; the real resolver ships in the project.
- `<Term>` candidates: `lookup_key` (author-assigned stable handle for a Price, unique within the active set, identical in test and live mode); "smallest currency unit" if not obvious (cents for USD — amounts are integers).

## Customers: one billing account per organization

Teach Customer as the entity that owns subscriptions, payment methods, and invoice history. The course's pinned rule, stated as the decision: **one Stripe Customer per Organization (chapter 056), never per user.** Billing is org-scoped because seats, invoices, and tax IDs are org-scoped.

- Connect hard to prior knowledge: the student already has Organizations as the tenancy unit and a foreshadowed `organizations.stripe_customer_id` column. Name the column shape here: `stripe_customer_id text` (nullable until the org first checks out — its lazy creation is L2's job; here just establish the 1:1 org↔Customer mapping and where the pointer lives).
- **Watch-out, inline:** one Customer per *user* makes seat-based/team plans unmodellable later (which user's Customer holds the team's subscription?) and splits invoices across identities — one Customer per org from day one.
- Small `Code` sketch: the single column on the orgs table (`stripeCustomerId: text('stripe_customer_id')`) to make it concrete, plus a sentence that the app stores *this pointer and almost nothing else* of Stripe's Customer.
- Foreshadow `Customer.metadata.organization_id` (covered in the metadata section) as the reverse pointer the webhook uses.

## Subscriptions: the recurring relationship

Teach Subscription as the object that joins a Customer to one or more **Subscription Items** (each item pairs a Price with a quantity), carries a **`status`** (point forward: L5 owns the semantics — here just name that the field exists and is a string with meaning, not a boolean), tracks the **current billing period** on each item, and **emits a webhook on every state change** (callback to chapter 063 — this is *what* those events were about). Pro example: the org's Subscription has one item referencing `pro_monthly`, status `active`, period rolling monthly.

- **CRITICAL accuracy point — `current_period_end` location.** As of Stripe API version `2025-03-31` (Basil) and continuing in the current 2026 versions, `current_period_start` / `current_period_end` are **no longer top-level fields on the Subscription** — they moved to the **subscription item** (`subscription.items.data[0].current_period_end`). This is a recent breaking change and a live trap (the better-auth Stripe plugin and many tutorials hit it). The lesson MUST teach the period dates as living on the item, and any sketch that reads the period reads it from `items.data[0]`, not from the Subscription root. Frame it positively: per-item periods exist so a Subscription can mix billing intervals; for the single-item SaaS default the app reads item zero. Do NOT show `subscription.current_period_end`.
- Senior anchor, stated as the default and its exception: **one active Subscription per Customer, with one item**, is the SaaS default. Multiple subscriptions (or multiple items) are a real but advanced case (mixed B2C/B2B lines, mixed monthly+yearly items, multiple workspaces under one billing org) — name it as "earns a discussion when it comes up," don't drill it. Keeping the default crisp (one subscription, one item, read `items.data[0]`) is what lets the rest of the chapter assume "the org's subscription," singular. Name the two variants the `quantity: 1` default sets aside: **per-seat billing** (quantity is the seat count, changed by a Server Action calling `stripe.subscriptions.update` and projected into the `seats` column by the `customer.subscription.updated` webhook — single-writer rule intact) and **usage-based/metered billing** (no quantity; consumption reported as usage records, nothing to project). Both are a configuration change at this seam, not a re-architecture; reach for per-seat the day a plan is priced by head and metered the day it's billed by consumption.
- This is the object the webhook handler (chapter 063) and `plan_entitlements` (L4) revolve around — say so explicitly so the student sees the through-line: *Stripe mutates the Subscription → fires an event → the webhook projects it (status, plan via the item's Price `lookup_key`, the item's `current_period_end`) into the app's row.*
- No status table here (that's L5); just the field's existence and that the item's period bounds + the subscription's status are what the projection will read.
- `<Term>` candidates: `current_period_end` (timestamp the current paid interval ends and Stripe attempts renewal — drives "your plan renews/ends on …"; **lives on the subscription item**, read as `items.data[0].current_period_end`); "subscription item" (the Price-plus-quantity line inside a Subscription; the unit that carries the billing period).

## Metadata: the carry-channel back to your app

This is a distinct, high-value concept and earns its own section. Teach metadata as arbitrary key/value pairs Stripe stores on objects and **echoes back on every webhook event** — the channel for data the handler needs *at receipt time* without a database round-trip.

- The 80/20: exactly three pieces earn their keep in this stack.
  - `Customer.metadata.organization_id` — so a webhook can map a Stripe Customer back to the org without a separate lookup table.
  - `Subscription.metadata.plan` — the canonical plan slug (`pro`, `team`) carried alongside the Price, so the handler doesn't have to reverse-map.
  - `Price.lookup_key` — not metadata strictly, but the same idea: a stable, app-chosen handle. (Briefly distinguish: `lookup_key` is a first-class Price field, `metadata.*` is the generic bag — same *purpose*, find-by-app-meaning.)
- The discipline to state plainly: **metadata is for what you'll need at webhook-receipt time and don't want to round-trip the DB to discover.** Not a general-purpose store; not a substitute for app tables.
- Tie back to chapter 063: when an event lands, `event.data.object.metadata.organization_id` is how the single-writer handler knows *which org's row* to update. This sentence is the payoff of the whole section.
- Small `Code` sketch: a Customer create call showing `metadata: { organization_id: org.id }` (illustrative; the real call with lazy creation is L2).

## What the app stores vs. what Stripe stores

A decisions section, not a feature. Draw the line crisply with a side-by-side.

- **Diagram: `TabbedContent`** with two tabs (or a single two-column HTML table inside a `<Figure>` — pick the table; it reads faster). "Stripe owns" column: Customer, Subscription, Price catalog, Invoices, payment methods, **the full state machine**. "The app stores" column: `organizations.stripe_customer_id`; the derived `plan_entitlements` row (forward-ref L4); immutable invoice records pulled for reporting (named, not built).
- Senior anchor: **don't mirror Stripe's schema — mirror only what the app reads on the hot path.** Every column the app keeps exists because some request path reads it without calling Stripe.
- **Watch-out, inline:** storing the full Stripe Subscription shape in the app DB doubles schema work and goes stale every time Stripe adds a field — derive the projection, don't copy the object.
- Tiny `Code` sketch of the *projection target* (not the full table — that's L4): a 4–5 field comment-annotated sketch (`plan`, `status`, `current_period_end`, `cancel_at_period_end`) labelled "the shape L4 builds." Add a one-line comment that `current_period_end` is *derived from* `subscription.items.data[0].current_period_end` — reinforcing the location point without re-teaching it. So the student sees the destination without pre-teaching L4.

## The webhook events the application listens to

The student knows *how* to receive events safely (chapter 063); this section names *which* events matter and *what each means for the app* — the surface, not the handlers.

- **Diagram/table: a `Code`-free two-column table** (plain markdown or small HTML in `<Figure>`): event type → app action.
  - `checkout.session.completed` → provision the entitlement on first subscribe.
  - `customer.subscription.created` / `.updated` / `.deleted` → refresh the entitlement (plan, status, period).
  - `invoice.paid` → record the invoice, advance the period.
  - `invoice.payment_failed` → the `past_due` transition (forward-ref L5).
- State the boundary explicitly: **the full handler code lands in the project (chapter 065); this lesson states the surface and the meaning.** This keeps the writer from re-implementing chapter 063's machinery.
- Optional small **`Sequence` exercise** (ordering drill): give the student the happy-path event order for a first subscription (`checkout.session.completed` → `customer.subscription.created` → `invoice.paid`) shuffled, ask them to order it. Low-stakes, reinforces the through-line. Keep it optional/short.

## The Stripe Node SDK: one client, server-only

Teach the singleton pattern and the secret-key discipline — the concrete code anchor of the lesson.

- **`Code` block (the one "real" snippet): `lib/stripe.ts`** — `import 'server-only';` at the top, instantiate once with the env-sourced secret (read via `env.ts`, not raw `process.env`), pass an explicit `apiVersion`, export the configured client. Note on `apiVersion`: the `stripe` npm package pins the API version that was current at its release (the SDK's TS types are generated for that version), but pinning `apiVersion` explicitly makes the upgrade an intentional, reviewable bump — and it's *why* field locations like the item-level `current_period_end` are version-dependent (callback to the Subscriptions section). Mention that L6 makes `lib/billing/` the only importer of this client (foreshadow, don't build). Consider **`AnnotatedCode`** here (3–4 steps: the `server-only` guard / the env-sourced secret / the explicit `apiVersion` and why / the single exported instance) since each line carries a distinct rule and the student's attention should land on each. Do NOT hardcode a specific version date string in prose as "the" version — versions roll; show the *shape* (`apiVersion: '<pinned>'`) and the reasoning.
- The rule: this is the **one place `stripe.*` calls originate**; everything else goes through `billing.*` (L6). The SDK is class-based (callback to chapter 009's "classes earn their weight: SDK adapters") — the instance hides behind the module.
- `<Term>` candidates: `STRIPE_SECRET_KEY` (server-only secret that authenticates SDK calls — never client-bundled); `STRIPE_PUBLISHABLE_KEY` (its client-side counterpart, safe to ship, used by Stripe.js — named for contrast).

## Test mode and live mode: two parallel universes

Teach the test/live split as a hard discipline, because the most damaging beginner mistakes (hardcoded IDs, key confusion) are really mode mistakes.

- The model: every Stripe account is two fully separate universes. Test-mode keys, Customers, Subscriptions, Prices, and webhooks are wholly disjoint from live. Objects don't cross; IDs differ — which is *why* `lookup_key` (callback) matters.
- The environment mapping, stated as the convention: dev and CI → test; staging → test; production → live. The key is loaded from env (`env.ts`, validated at build — callback to the security baseline). The Stripe CLI defaults to test mode unless `--live` is passed.
- **`Code` sketch: the env block** — `STRIPE_SECRET_KEY` (note the `sk_test_…` vs `sk_live_…` prefix), `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — with a one-line note that a boot-time check can assert the prefix matches the environment.
- **Watch-outs, inline:** (1) secret keys in client bundles is the classic catastrophic leak — `STRIPE_SECRET_KEY` is server-only via `env.ts`'s server/client split, `STRIPE_PUBLISHABLE_KEY` is the client-side counterpart; (2) mixing test and live keys in one env file by name confusion is a real incident class — name entries explicitly and check the prefix on boot.
- **Diagram option:** a simple two-column `<Figure>` (HTML/CSS) "Test universe | Live universe" with the parallel object lists, visually reinforcing "nothing crosses." Keeps it a *visual aid*, not a system graph — appropriate per the diagram guidance that any simple visual that enriches counts.

## Pricing as code: the catalog seed script

Teach the catalog-as-source-of-truth default and *why*.

- The two options: version the Stripe catalog in code and apply via a `pnpm seed:stripe` script (creates/updates Products and Prices through the API), or click around the dashboard. Course default: **code-as-source-of-truth**, because diffs are reviewable in PRs and test/live parity is automatic (run the same seed against each mode). This mirrors Principle #2 (one source of truth) — name that link.
- State the boundary: **the project (chapter 065) ships the seed script; this lesson names the convention.** Don't write the full script.
- Tiny `Code` sketch: a fragment showing one Product + two Prices defined as a config array with `lookup_key`s, and a sentence that the script upserts them. Keep it short — the point is "the catalog is reviewable code," not the script's mechanics.

## Putting it together (recap + check)

Close by re-walking the Pro example through all four objects and the conventions, then check understanding.

- One tight paragraph: "Pro plan, monthly/yearly, 14-day trial" → Product `Pro`; Prices `pro_monthly` / `pro_yearly` (found by `lookup_key`); the org's Customer (`organizations.stripe_customer_id`, `metadata.organization_id`); a Subscription with one item referencing the chosen Price, status driven by Stripe, the item's period bounds tracked — and the webhook projects it (status, plan, the item's `current_period_end`) into the app row the rest of the chapter reads.
- **Exercise: `Buckets`** (`twoCol`) — "Which object owns each fact?" Buckets: Product / Price / Customer / Subscription (optionally a fifth "The app's DB"). Items: plan name & marketing description (Product); billing interval & amount in cents (Price); `lookup_key` (Price); payment method & invoice history (Customer); `organizations.stripe_customer_id` (The app's DB / Customer pointer); `status` (Subscription); `organization_id` carry-value (Customer metadata). Avoid placing `current_period_end` as a flat "Subscription" item — it lives on the subscription *item*, and a bucket drill can't capture that nuance cleanly; keep it out of this exercise and let the recap paragraph carry it. This directly tests the lesson's core mental model — which object holds which fact — and surfaces the metadata/projection distinctions.
- Optional **`MultipleChoice`**: "Why does the app reference `lookup_key` instead of `price_id`?" with the correct answer (IDs differ between test and live mode; lookup keys are stable across modes) and plausible distractors (performance; lookup keys are required by the SDK; price_id is deprecated). Reinforces the section's load-bearing rule.

## External resources (optional)

One or two `ExternalResource` cards: Stripe's "Billing / subscriptions overview" doc and the "Products and prices" doc. Keep to official Stripe docs; don't pad.

# Scope

**Prerequisites to restate briefly (do not re-teach):**
- Webhook ingestion, the single-writer rule, idempotency, and success-page polling — *taught in chapter 063*; reference in one clause each as already-known, don't re-explain the mechanics.
- Organizations as the tenancy unit and `organizations.stripe_customer_id` as a foreshadowed column — *chapter 056*; assume it, name the column, don't re-derive tenancy.
- Principle #5 and the existence of a sanctioned billing carve-out — *chapter 043*; mention only as a forward-ref to L6.
- "Store cents, not dollars" — *chapter 001*; one-clause callback when introducing Price amounts.
- Classes earn their weight for SDK adapters — *chapter 009*; one-clause callback at the SDK singleton.

**Explicitly out of scope (belongs to later lessons / out of course):**
- Checkout sessions and the subscribe flow, lazy Customer *creation*, trials wiring → **L2**. (Here: name that the Customer is created lazily and trials are a Subscription property; do not build the session.)
- Customer Portal, plan changes, cancellation flows → **L3**.
- The full `plan_entitlements` schema, the `getEntitlement` read helper, the write side → **L4**. (Here: only sketch the projection *target* shape; the column-by-column table and provisioning are L4.)
- Subscription **status semantics** (`trialing`/`active`/`past_due`/`canceled`/`incomplete`/`unpaid`), the decision table, `hasActiveAccess` → **L5**. (Here: only that `status` is a string field, not a boolean.)
- The `billing.*` interface (`upgrade`/`openPortal`/`requirePlan`) and the `/lib/billing/` directory shape → **L6**. (Here: only that `lib/stripe.ts` is the lone SDK importer and `billing.*` is coming.)
- The three-test wrapper threshold and the Resend/Trigger.dev/R2 contrast → **L7**.
- The **full** webhook handler code, the seed-script implementation, the Checkout/Portal Server Actions → **project chapter 065**. (Name surfaces and conventions only.)
- Tax, invoicing details, dunning, proration math, revenue recognition → **out of scope for the course**; do not open these threads.

# Code conventions applied

- `lib/stripe.ts` / `lib/billing/` begins with `import 'server-only';`; no React imports; SDK secret never client-reachable (Module boundaries; Security baseline).
- Env vars via `env.ts` (`@t3-oss/env-nextjs` + Zod), server/client split enforced — only `NEXT_PUBLIC_*` in client modules; `STRIPE_SECRET_KEY` server-only (Security baseline).
- Drizzle: `organizations.stripe_customer_id` as `text('stripe_customer_id')`; schema is source of truth; snake-case mapping on the client. The projection sketch is *illustrative* and deliberately partial — the canonical `plan_entitlements` table is L4's to define (note this so downstream agents don't treat the sketch as the contract).
- `lookup_key` and metadata conventions are this lesson's own; they align with "find-by-app-meaning, not by mode-specific ID."
- Catalog-as-code = Principle #2 (single source of truth).
- Any illustrative `stripe.*` snippet is explicitly marked "shipped in full in the project" so partial shapes aren't mistaken for the final contract.
