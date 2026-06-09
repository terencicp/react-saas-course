# Lesson 3 — Managing subscriptions with the Portal

## Lesson title

- **Title:** Managing subscriptions with the Portal
- **Sidebar label:** Customer Portal

## Lesson framing

This is the "money managed" lesson — the screens the application does **not** build. Checkout (L2) turned a visitor into a subscriber; now that subscriber needs to switch plans, toggle monthly/yearly, update their card, download invoices, and cancel. Each is a screen Stripe ships, configured once in the dashboard, reached through one redirect. The senior payoff the lesson must land: **default to the Portal, earn the in-house build.** Every screen you hand-roll is a Stripe-maintained, PCI-aware, internationalized screen you now own in perpetuity.

The lesson is the third `billing.*` method (`upgrade` shipped in L2; `requirePlan` lands in L6). Keep `billing.openPortal(returnPath?)` parallel in shape to `billing.upgrade`: resolve org → ensure Customer → create session → return URL → client redirects. The one structural difference is the **typed-error branch**: no Customer means no subscription means no Portal, so `openPortal` errors instead of lazily creating an empty Customer (the inverse of L2's lazy-create).

Three threads carry the whole lesson and must stay foregrounded:

1. **The return URL is a navigation hint, not a state-change signal.** This is the single most important idea. It is the direct sibling of ch063's redirect-vs-webhook race, now on the *exit* side: the Portal redirects back regardless of what the user did (changed plan, browsed, did nothing). The webhook is the only writer for `plan_entitlements`; the redirect proves only that the user came back. Reuse ch063's vocabulary (single-writer rule, redirect-vs-webhook), do not re-teach it.
2. **Cancellation is `cancel_at_period_end`, never immediate.** Users paid for the month; keep their entitlement live until the period elapses. Name the event sequence: `customer.subscription.updated` with `cancel_at_period_end: true` fires now, `customer.subscription.deleted` fires at period end. The webhook handlers and the banner/winding-down UI that consume this are L5/ch065's job — this lesson states the Portal-side configuration and the events it emits, and stops there.
3. **Trust Stripe's proration.** A plan change generates Stripe's credit-and-charge math automatically; the app never computes it. The webhook refreshes the projection, the new plan takes effect on the next request.

Cognitive-load staging: open with the bare two-line `openPortal` happy path (the Portal is *almost nothing* to integrate), then layer the configuration surface, then the three sharp edges (return-URL discipline, period-end cancellation, no-Customer error), then the build-vs-buy threshold as the closing senior judgment. The mental model the student leaves with: **the application initiates billing (Checkout, Portal); the user manages billing (inside the Portal); the webhook records billing (entitlements). Three actors, three responsibilities, never crossed.**

Keep code light. This lesson is one short Server Action plus configuration objects — the heavy schema/handler code lives in L4/L5/ch065. Lead with decisions and the build-vs-buy reasoning, per the course's decisions-before-syntax stance. The running example stays the L1/L2 one: Pro plan, `pro_monthly` ($20) / `pro_yearly` ($200), 14-day trial.

## Lesson sections

### Introduction (no header)

Open on the concrete problem: the user is on Pro, and now wants to switch to yearly, fix a declined card, grab last month's invoice, or cancel. Frame the senior question implicitly — every one of those is a screen, a form, a validation, an edge case, and Stripe already built and maintains all of them. Preview what the lesson delivers: the `billing.openPortal()` action, the configuration the Portal reads, the three integration rules, and the judgment call for when to leave the Portal behind. Connect back: L2 got money *in* through Checkout; this lesson manages it *after*. One short warm paragraph, no header (per pedagogical structure).

### The Portal is a hosted billing screen you redirect to

Land the default. `stripe.billingPortal.sessions.create({ customer, return_url })` returns a one-shot URL; redirect the user; they manage billing; they come back to `return_url`. The application writes **zero** billing UI.

Show the minimal session creation as a plain `Code` block (3-4 lines, `ts`) so the student sees how little there is — this is the "it's almost nothing" beat. Senior anchor stated plainly: the Portal is the closest thing to a free, maintained, compliant settings screen in the entire SaaS toolchain; defaulting to it is the correct call, not a shortcut.

Pair this with a small orienting diagram. Use a **`<Figure>` with a plain HTML + CSS three-phase strip** (horizontal, per the vertical-space constraint) showing the round-trip: **App ("Manage billing" button) → Stripe Portal (hosted screens) → back to `return_url`**. Annotate underneath each phase with who owns it (app initiates · Stripe hosts · app receives the return). Pedagogical goal: cement the redirect round-trip shape before any code detail, and pre-stage the return-URL discipline three sections down. Keep it under ~300px tall; this is a simple orienting visual, not a system graph.

Terms to gloss with `<Term>`: **Customer Portal** (Stripe-hosted, prebuilt account-management UI for a single Customer); **portal session** (a short-lived, single-use URL scoped to one Customer).

### What the Portal lets a user do

The configuration surface — set per-account in the Stripe dashboard (the chapter default; configuration-as-code is its own short section below). Walk the toggles the course turns on:

- Switch plan within the same product family (Pro monthly ↔ Pro yearly; Pro ↔ Team).
- Cancel — **at period end** (the discipline, drilled next).
- Update the payment method.
- View and download invoice history.

Present this as a `CardGrid` of four `Card`s (one per capability), each with a `lucide:*` icon and a one-line "what it covers." Rationale: this is a scannable capability inventory, not a procedure or a decision — `CardGrid` reads faster than prose here and visually reinforces "four screens you didn't build." Avoid `Steps` (nothing is sequential) and avoid a `Tabs` (no choice being made).

State the boundary explicitly so L5's banner work has a clean seam: the Portal shows **Stripe-side billing facts** (plan, card, invoices). It will **not** show usage-based metrics, seat-overage warnings, or any product-internal state — those are the application's own screens. Name it; don't build it here.

### Opening the Portal: the `billing.openPortal` action

The chapter's reference Server Action. Build it up with `AnnotatedCode` (`ts`, this is one focused block whose parts each deserve attention). The block:

```
'use server';

export const openPortal = async (
  returnPath = '/settings/billing',
): Promise<{ url: string }> => {
  const { orgId } = await requireOrgUser();
  const org = await getOrganization(orgId);

  if (!org.stripeCustomerId) {
    throw new BillingError('no_customer', 'Subscribe before managing billing.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: absoluteUrl(returnPath),
  });

  return { url: session.url };
};
```

`AnnotatedStep`s (each one paragraph, ≤6 lines, prefer `color="blue"` as default, vary for emphasis):

1. `{1}` `'use server'` + the signature — `openPortal(returnPath?): Promise<{ url: string }>`. Returns the URL rather than calling `redirect()`, exactly like `billing.upgrade` (L2), so the caller chooses the navigation. Note the parallelism explicitly.
2. `{4-5} "requireOrgUser"` — server-side org resolution (Unit 9 / ch057). The Portal session is scoped to one Customer; the app authenticates and org-scopes *before* minting the URL. `color="orange"`.
3. `{7-9} "BillingError"` — **the no-Customer branch.** Unlike L2's lazy-create, `openPortal` throws instead of creating an empty Customer. No `stripe_customer_id` ⇒ no subscription ⇒ nothing to manage. `BillingError` is named here and fully specified in L6 — gloss it as a custom `Error` subclass carrying a code. `color="red"`.
4. `{11-14} "billing.billingPortal" "return_url"` — the actual Stripe call: `customer` + `return_url`. Two fields. Note `return_url` must be **absolute** (Stripe redirects the browser to it), via an `absoluteUrl` helper. `color="green"`.
5. `{16}` — return `{ url }`; the client redirects with `window.location.assign(url)`.

After the block, state where it lives: `lib/billing/portal.ts`, the second file in the `billing.*` interface (foreshadow L6's `/lib/billing/` directory; do not draw the full directory here — that's L6's job). The `stripe` import only ever happens inside `/lib/billing/`.

Add an `Aside` (caution) restating the authentication model: **the Portal URL is bearer-style.** Whoever holds it can manage that Customer's billing until it expires. The Portal does not re-authenticate — the URL *is* the auth. Treat it like any one-time link: never log it, never email it, never store it. (This is the exit-side twin of L2's "Checkout URL is single-use.")

`<Term>` candidates: **bearer-style** (possession of the token alone grants access — no further identity check); **proration** (defined here so the next section can lean on it without a detour).

### Cancellation defaults to the end of the period

The cancellation discipline — drill it, it's the highest-stakes correctness point on the user-facing side. When a user cancels in the Portal, the configured behavior is **cancel at period end**: the subscription stays `active` with `cancel_at_period_end: true` and a `current_period_end` in the future; access stays live; at the period boundary Stripe ends it.

Name the rule sharply: **never cancel immediately by default — the user paid for the month.** Immediate cancellation on a mid-cycle cancel is a fair-billing violation and a support-ticket generator.

Visualize the event sequence with a **`<Figure>` wrapping a Mermaid `sequenceDiagram`** (Mermaid is the doc's top pick for actors-over-time). Actors: **User**, **Stripe**, **Webhook → `plan_entitlements`**. Steps:

1. User clicks Cancel in the Portal.
2. Stripe sets `cancel_at_period_end: true`, keeps status `active`.
3. Stripe → Webhook: `customer.subscription.updated` (now). Handler records the winding-down state.
4. … period elapses …
5. Stripe → Webhook: `customer.subscription.deleted` (at `current_period_end`). Handler flips to no-access.

Pedagogical goal: make the *two-event, time-separated* shape unmistakable — one event now (schedule the cancel), one event later (apply it). This is exactly why a boolean `is_canceled` loses information and why L5 needs `cancel_at_period_end` + `current_period_end` as first-class columns. Caption the diagram pointing forward: "the winding-down banner and the access flip are L5's job; here we only note which events the Portal emits."

Hard scope fence in prose: the **banner copy, the "ends on Aug 14" surface, the undo/reactivate link, and the access decision** are all L5. This section states only the Portal configuration (`cancel_at_period_end` mode) and the events it produces. Restate the single-writer rule by reference (ch063): the webhook writes the entitlement; the Portal triggers events, it does not write the app's database.

`<Term>`: **`cancel_at_period_end`** (subscription flag: stays active and billed through the current period, then ends — reactivatable by setting it back to `false`); **dunning** is *not* introduced here (L5 owns the `past_due` story) — do not define it in this lesson.

### Plan changes and proration are Stripe's math

The upgrade/downgrade and monthly↔yearly path. A user switching Pro→Team or monthly→yearly inside the Portal generates a `customer.subscription.updated` event with new Price items, and Stripe computes the **proration**: a credit for the unused portion of the old price, an immediate charge for the new one (for upgrades; downgrades typically credit forward). The webhook refreshes `plan_entitlements`; the new plan is live on the next request.

Senior anchor, stated once and firmly: **trust Stripe's proration; never recompute it in-app.** Proration math (mid-cycle, tax-inclusive, multi-currency) is a deep well; reimplementing it is pure liability with no upside. The application's job is to read the post-change state from the webhook, not to predict the invoice.

No diagram needed here — it's a short conceptual section riding on the proration `<Term>` from two sections back. One `Aside` (note) is enough: the *new plan* is an entitlement change the webhook lands; the *charge* is Stripe's concern; the app surfaces neither the proration line items nor the invoice (the Portal already does).

Connect the `lookup_key` thread (L1): the projection maps the new Price back to an app plan slug via `lookup_key`, which is why a Portal-driven plan change needs no code change when the catalog is re-seeded. One sentence; the mechanics are L4.

### Deep-linking to a specific Portal flow

The 2026 reach — `flow_data` on the session. By default the Portal opens on its home screen; `flow_data` deep-links straight to one action, so a "Cancel subscription" button lands on the cancel-confirmation rather than the Portal lobby.

Show one `Code` snippet (`ts`) extending the session-create call with the cancel flow:

```
const session = await stripe.billingPortal.sessions.create({
  customer: org.stripeCustomerId,
  return_url: absoluteUrl(returnPath),
  flow_data: {
    type: 'subscription_cancel',
    subscription_cancel: { subscription: org.subscriptionId },
  },
});
```

Name the three flow types the course cares about (`subscription_cancel`, `subscription_update`, `payment_method_update`) in prose; show only the cancel one in code. Senior anchor on UX honesty: **name the destination in the link text.** A button that deep-links to cancellation must read "Cancel subscription," not "Manage billing" — dropping a user onto a confirmation screen they didn't ask for is a dark-pattern smell and a trust cost. State the default posture: deep-links are an enhancement; the plain `openPortal()` (Portal home) is the baseline the chapter ships.

`<Term>`: **`flow_data`** (Portal-session parameter that deep-links the user straight into one prebuilt flow instead of the Portal home).

### When the Portal stays open after the subscription ends

Two cases that surprise people, grouped because both turn on "the Customer outlives the subscription":

- **The free-plan ex-subscriber.** A user who paid, then downgraded to free, still has invoices to retrieve. The Stripe **Customer record persists** even with no active subscription, so `openPortal()` still works and still shows invoice history. Rule: the Customer outlives any individual subscription; the Portal stays reachable as long as the Customer exists.
- **The never-subscribed user.** The mirror image, already handled in the action: no `stripe_customer_id` ⇒ `BillingError`. The UI surfaces "subscribe to manage billing" and routes them to **Checkout** (L2), not the Portal. Portal is for existing Customers; new subscriptions start at Checkout.

A tight two-row decision aid earns its place here. Use a `<Figure>` wrapping a **Mermaid `flowchart LR`** (the doc's top pick for a decision tree): node "Open billing?" → branch on `stripeCustomerId` present? → **yes** ⇒ `openPortal()` → Portal; **no** ⇒ `upgrade()` → Checkout. Pedagogical goal: fuse "which billing entry point" into a single glance and reinforce the Checkout-vs-Portal division of labor (new vs. existing). Keep it to four nodes, horizontal.

Place a small **`Dropdowns`** check here (inline-prose mode) to verify the discrimination while it's fresh. Three blanks over a sentence each:

- "A user who has never paid hits the billing page → route them to ____ (Checkout / Portal)."
- "A user mid-cycle clicks Cancel → the subscription's `cancel_at_period_end` becomes ____ (true / false) and access ____ (stays live until period end / ends immediately)."
- "After the Portal redirects back, the app updates `plan_entitlements` from ____ (the return URL / the webhook)."

Rationale: `Dropdowns` is the lowest-friction recall check and these three blanks each pin one load-bearing rule (entry-point routing, period-end cancellation, single-writer). This is a comprehension gate, not a coding task, so a live-coding component would be overkill.

### Don't trust the return URL as proof of change

The capstone rule — the most common, most expensive mistake, given its own section because it deserves the weight. The `return_url` fires **regardless** of what the user did: they may have changed plan, browsed and left, or done nothing. The redirect proves the user came *back*; it proves nothing about *state*.

Make the failure mode concrete: a developer who "refreshes entitlements" on the return-URL render either (a) double-fires an update the webhook already owns, racing the single-writer, or (b) reads a not-yet-updated projection (the webhook may not have landed) and shows stale state with false confidence. The fix is structural: **do nothing stateful on return; let the webhook be the source of truth.** If the page must reflect a just-made change, it reads-and-polls the entitlement exactly like L2's success page (the `FinalizePoller` pattern from ch063) — it never writes.

Tie the two redirect rules together as one principle so they cement as a pair, not two facts:

- **Checkout success URL (L2 / ch063):** entry-side redirect — not proof of payment; the webhook proves it.
- **Portal return URL (here):** exit-side redirect — not proof of change; the webhook proves it.

Both reduce to: **a redirect is a navigation event, never a transaction-completion signal.** Reuse ch063's exact framing (redirect-vs-webhook race, single-writer rule) and explicitly call this the same pattern on the other side of the flow.

Reinforce with a `<Figure>` **`<TabbedContent>`** of two tiny panels, "Wrong" and "Right," each a 3-4 line `ts` sketch of the return-page component:

- **Wrong:** on render, `await refreshEntitlementFromStripe(orgId)` — annotated as the double-writer/race bug.
- **Right:** on render, read the entitlement; if not yet finalized, mount `<FinalizePoller>`; never write.

(Use `TabbedContent` rather than `CodeVariants` only because each panel pairs a code sketch with a one-line verdict and the contrast is conceptual, not a literal file diff — though `CodeVariants` is an acceptable substitute if the writer prefers tab-level prose. Either is fine; the point is the wrong/right juxtaposition.) Pedagogical goal: the anti-pattern and its fix sit side by side so the student encodes the boundary, not just the rule.

`<Term>`: reuse **single-writer** by reference only (defined ch063); do not redefine.

### Build the screen yourself only when product forces it

The closing senior judgment — the build-vs-buy threshold, the section that turns "use the Portal" from a rule into a decision the student can defend. Name the conditions that flip the choice away from the Portal:

- **Regulated consent flows** the Portal can't host (explicit retention/cancellation disclosures, jurisdiction-specific copy).
- **Complex plan-change UX** — seat-count sliders with custom validation, usage-tier pickers, add-on bundling.
- **B2B contract motions** — upgrades gated on sales approval, quotes, PO workflows.
- **Internationalization** beyond Stripe's supported Portal languages.

State the cost of the carve-out bluntly: **every screen you build is a Stripe-maintained, PCI-aware, localized, continuously-updated screen you now own forever** — cancellation logic, proration display, card tokenization, invoice rendering, and their long tail of edge cases. The chapter default is the Portal; the in-house build is a deliberate, justified exception, never a default and never an aesthetic preference ("it'd feel more on-brand" is not a reason).

Frame this as the senior's order of operations: **ship the Portal, instrument it, and let real product/retention data — not taste — earn the in-house screen.** This mirrors the chapter's recurring trigger-before-tool posture (the default crosses a named threshold before you reach for the heavier tool).

End with a short **`StateMachineWalker`** (`kind="decision"`, the doc's intended use for trigger-before-tool decision filters) walking the build-vs-buy call in the senior's question order:

- Q1 "Does the flow need consent/disclosure copy the Portal can't host, or sales-approval gating?" → yes ⇒ Leaf "Build in-house (the carve-out is earned)."
- else Q2 "Does plan-change UX need custom controls (seat sliders, usage tiers) beyond pick-a-plan?" → yes ⇒ Leaf "Build the plan-change screen; keep the Portal for cancel/invoices/card."
- else Q3 "Do you need Portal languages Stripe doesn't support?" → yes ⇒ Leaf "Build, or wait for Stripe coverage if the locale is on their roadmap."
- else ⇒ Leaf "Use the Portal. You have no product reason to build."

Pedagogical goal: the lesson lives in the *order* of the questions (product/legal blockers first, UX complexity next, i18n last, default last) — the walker forces the student through that order rather than handing them a verdict. Each leaf names the action and the residual Portal use, reinforcing that even an in-house build usually keeps the Portal for the boring screens (invoices, card update).

### Versioning the Portal config in code (optional reach)

A short closing section, kept deliberately brief — same calculus as L1's pricing-as-code. Stripe exposes `stripe.billingPortal.configurations.*`, so the Portal's enabled features and cancellation behavior can be versioned in code and applied per-mode, identically to the `pnpm seed:stripe` catalog story (L1). Code-as-source-of-truth wins on reviewable diffs and test/live parity. State the chapter's choice: **the project ships dashboard-configured for simplicity; the config-as-code path is named so the student knows it exists.** One paragraph, no diagram, no exercise — this is an awareness beat, not a skill.

### External resources (optional)

Close with one or two `ExternalResource` cards: the Stripe Customer Portal docs landing page and the deep-links/flows page. Optionally a `VideoCallout` *only if* a current (within ~12 months) Stripe-official or high-quality walkthrough of the Customer Portal integration is found during research — do not embed a stale or low-signal video; skip it if nothing strong surfaces. (Author should search at build time; YouTube MCP quota permitting.)

## Scope

**Prerequisites — restate in one line each, do not re-teach:**

- Stripe object graph (L1): Customer = per-org billing account, `organizations.stripe_customer_id`, `lookup_key`, `lib/stripe.ts` singleton, `apiVersion` pinned at the chapter level.
- Checkout / `billing.upgrade` (L2): the new-subscription entry point and lazy Customer creation — referenced as the contrast to the Portal (existing vs. new) and the no-Customer fallback target.
- Webhook discipline (ch063): single-writer rule, redirect-vs-webhook race, `FinalizePoller`, `last_event_at` — referenced by name as the source of truth on both redirect sides; never re-derived.
- `requireOrgUser` (Unit 9 / ch057): server-side org resolution — used, not explained.

**This lesson does NOT cover (defer explicitly):**

- The webhook **handlers** that consume `customer.subscription.updated/deleted` and write the projection — ch063 patterns, full code in project ch065. This lesson names which events the Portal emits and stops.
- The `plan_entitlements` **schema and write side** (columns, `cancel_at_period_end`, `current_period_end` types, the projection function) — L4.
- **Subscription status semantics** — `trialing`, `active`, `past_due`, `canceled`, the winding-down **banner**, the "ends on Aug 14" surface, the **undo/reactivate** flow, `dunning`, and the `hasActiveAccess` access decision — all L5. This lesson must not define `dunning` or build any banner.
- The **`billing.*` interface architecture** — the `/lib/billing/` directory composition, `requirePlan`, the full `BillingError` definition, why billing earns the carve-out — L6. This lesson uses `BillingError` and names `lib/billing/portal.ts` but does not draw the directory or argue the architecture.
- **Building custom billing UI** — named as the deliberate exception with its threshold; explicitly *not* the default path and not implemented here.
- **Embedded Checkout, tax/VAT compliance, dunning configuration, revenue recognition** — out of course scope or other lessons; do not drill.

## Code conventions notes

- Server Action shape per conventions: `'use server'`, arrow-function bound to `const`, named export, two-positional-params max (here one optional `returnPath` with a default — defaults fire on `undefined`, required-before-optional satisfied trivially). Explicit `Promise<{ url: string }>` return type (exported function → annotate return).
- Discriminated-union error contract: `BillingError` is a custom `Error` subclass (conventions §Error handling); when surfaced through a Server Action the return becomes the course `Result` shape (`{ ok: false, error }`) — but L3 shows the *throw* form inside the action body and defers the action-level `Result` wrapping mention to L6 to avoid front-loading the error-contract machinery. Note this staging so L6 owns the full contract.
- `stripe` is imported only inside `/lib/billing/` (conventions: SDK adapters centralized; `import 'server-only'` at the top of the file). The lesson's snippets assume that file context; the writer should show `import 'server-only'` at least once when introducing `lib/billing/portal.ts`.
- `return_url` must be absolute — use the project's `absoluteUrl(path)` helper rather than string-concatenating env vars at the call site.
- Naming: `openPortal`, `returnPath`, `stripeCustomerId`, `subscriptionId` — camelCase in TS, snake_case mapping handled at the Drizzle client level (do not write snake_case in TS reads).
- Deliberate divergence to note: code snippets are trimmed (no surrounding imports beyond the one `server-only`/`stripe` introduction, no exhaustive error handling) for teaching focus — flagged so downstream agents know the brevity is intentional, not a standards miss. The canonical full implementation ships in project ch065.

## Fact-check notes (verified June 2026)

- `stripe.billingPortal.sessions.create({ customer, return_url })` and `flow_data` (`subscription_cancel` / `subscription_update` / `payment_method_update`) are current (Stripe API ref, dahlia line). Deep-links page confirms the flow types. ✔
- `cancel_at_period_end` is **current and recommended** for end-of-period cancellation — NOT deprecated. The newer `cancel_at` enum helpers (`min_period_end` / `max_period_end`) are optional enhancements for mixed-interval subscriptions, not a replacement. Reactivation is `cancel_at_period_end: false`. The chapter keeps `cancel_at_period_end` as the taught primitive. ✔ (Stripe "Cancel subscriptions" docs.)
- Event sequence confirmed: `customer.subscription.updated` (with `cancel_at_period_end: true`) fires immediately, `customer.subscription.deleted` fires at period end. ✔
- Portal **configuration** exposes `subscription_cancel.mode: 'at_period_end'`, `subscription_cancel.proration_behavior`, and `subscription_update` options — supports the "configure cancellation at period end" claim and the config-as-code section. ✔
- API-version reality: the live Stripe API is on the `dahlia` line (`2026-04-22.dahlia` observed). The chapter pins `apiVersion: '2025-03-31.basil'` (per L1/L2 continuity notes) **on purpose** for chapter-wide consistency; L3 must not introduce a different pinned version. The Portal/`flow_data`/`cancel_at_period_end` surfaces used here are stable across basil→dahlia, so no sample changes are required. Author should keep the pinned version aligned with L1/L2 and not surface dahlia in code.
