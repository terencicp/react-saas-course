# Lesson 2 — Starting subscriptions with Checkout

- **Title:** Starting subscriptions with Checkout
- **Sidebar label:** Checkout subscriptions

---

## Lesson framing

The "money in" lesson — the one path that turns a visitor into a paying customer. The student arrives from L1 with the four-object Stripe model (Product, Price, Customer, Subscription), `lib/stripe.ts` (the single SDK singleton, pinned `apiVersion: '2025-03-31.basil'`), the `lookup_key`-over-`price_id` discipline, `organizations.stripe_customer_id` (nullable text), and the running example (Pro plan: `pro_monthly` $20/mo, `pro_yearly` $200/yr, 14-day trial). They also arrive from **chapter 063** with the redirect-versus-webhook race already taught and solved (L4 of ch063: success page reads-and-polls via `router.refresh()`; the webhook is the only writer for entitlement state).

**The senior question this lesson answers (state it implicitly in the intro, not as a heading):** a user clicks "Upgrade to Pro." The app must (a) run a PCI-compliant payment flow without ever touching a card number, (b) start a Subscription bound to the right Customer at the right Price, (c) carry the org identity through so the webhook can provision the entitlement, and (d) land on a success page that doesn't lie about the plan before the entitlement exists. A Stripe Checkout Session delivers all four. This lesson teaches the **server side of starting a subscription** — the Server Action that creates the session and the redirect — and shows how it dovetails with the webhook machinery the student already built.

**The single mental model the student should leave with:** *Checkout is a server-created, single-use, short-lived URL that hands payment off to Stripe and hands provisioning off to the webhook.* The app does not create Customers carelessly, does not handle cards, does not write entitlements on the success page, and does not trust the redirect as proof of payment. The action's only job is: resolve the org → ensure a Customer → create the session → return the URL. Everything that actually changes state happens on the Stripe side and lands through the webhook.

**Pedagogical posture.** This is a decisions-and-flow lesson, not a syntax drill. Three things carry the cognitive weight and each deserves its own treatment:

1. **The end-to-end flow** — what happens between the click and "you're on Pro." This is the spine of the lesson and the thing beginners most often get wrong (they think the success-page render means provisioning is done). Teach it with an animated `DiagramSequence` so the student watches the redirect and the webhook race, and sees provisioning land on the Stripe side, not the app side.
2. **The Server Action shape** — `billing.upgrade(planSlug)`. One worked code block, walked with `AnnotatedCode`, foreshadowing the L6 interface but not drilling the architecture. The action returns `{ url }` rather than redirecting server-side; the client decides how to navigate.
3. **The parameter decisions** — trial, payment-method collection, hosted-vs-embedded, promo codes, tax. These are mostly "name the option, name the default, name the threshold." Group them as configuration *on the same session object* so the student sees them as knobs on one call, not separate features. Keep each terse.

**Things to actively prevent the student from doing** (these are the chapter outline's watch-outs, woven into the relevant section, never bundled into a "gotchas" list):
- creating a new Customer per Checkout (multiplies billing identities) → lazy lookup-and-reuse on `stripe_customer_id`.
- passing raw `price_id` strings (mode-coupled) → resolve via `lookup_key`.
- writing entitlements on the success page (dual-writer race) → success page reads-and-polls only; webhook owns the write.
- trusting `?session_id=...` as a "they paid" signal → the webhook is the proof; the session id is a polling handle, not an authz token.
- `success_url` pointing at a marketing page outside the app → keep the user inside the app shell so the poll can run.

**What NOT to re-teach.** The webhook handler, idempotency, ordering, and the success-page polling *mechanism* all belong to chapter 063 — restate them in one or two sentences as the thing Checkout plugs into, then point forward. The `plan_entitlements` schema is L4. Status semantics (`trialing` etc.) are L5. The `billing.*` architecture rationale is L6. This lesson plants `billing.upgrade` as a signature and a flow, nothing more.

---

## Lesson sections

### Introduction (no heading, opens the page)

Warm, brief, 2–3 short paragraphs. Open on the concrete moment: the pricing page, the "Upgrade to Pro" button, the click. Pose the four sub-problems (PCI, bind to Customer/Price, carry org identity, honest success page) as the thing the lesson solves. Name the payoff: by the end the student can describe and sketch the Server Action that starts a subscription and explain exactly where provisioning happens (Stripe + webhook, not the app). Connect explicitly back to ch063: "you already built the handler that lands the entitlement; this lesson builds the door the customer walks through to trigger it." One sentence foreshadowing that this `upgrade` call is the first method of the `billing.*` interface formalized in L6.

Do **not** include a separate "what you'll learn" bullet list — the pedagogical guidelines want this implicit and brief.

### What a Checkout Session actually is

Establish the primitive before any code. Teach these properties as the load-bearing facts the rest of the lesson leans on:
- **Server-created.** The session is created with the Stripe secret key, server-side only. The client never constructs it. (Ties back to L1's `STRIPE_SECRET_KEY` is server-only.)
- **Single-use and short-lived.** The returned URL is good for one checkout and expires (~24 hours). Storing or emailing it is pointless — name this as the reason you never persist the URL.
- **Parameterized once.** Customer, Price (the line item), success/cancel URLs, `mode: 'subscription'`, and optional trial are all set at creation. The user is redirected to the Stripe-hosted page, pays, and is redirected back.
- **It hands off two responsibilities.** Payment goes to Stripe's hosted page (no PCI in-house); provisioning goes to the webhook (no entitlement write on the app side). This sentence is the thesis of the lesson — state it explicitly here.

Use a small **`<Figure>` with a hand-authored HTML/CSS three-box strip** (or `ArrowDiagram`) to show the shape: `Your server (create session)` → `Stripe-hosted page (user pays)` → `Your success page (poll)`. Keep it horizontal, low height. Pedagogical goal: anchor "the app is at both ends but not in the middle." Do not make this the full sequence diagram — that comes later with timing; this is just the static topology.

`Term` candidates in this section: **PCI** (Payment Card Industry compliance — the standard you avoid handling yourself by using hosted Checkout), **single-use** if you judge it non-obvious (probably skip).

### The upgrade Server Action

The core code of the lesson. One worked Server Action, presented with **`AnnotatedCode`** (`maxLines` ≤ 18) so the student's focus is walked through the five moving parts one at a time. Foreshadow the L6 interface by naming the file `lib/billing/upgrade.ts` and the call `billing.upgrade('pro')`, but explicitly tell the writer: *do not explain the directory architecture or the carve-out rationale here — that is L6. Just write the action and point forward in one sentence.*

The action body, in order (these become the annotated steps):
1. **`'use server'` + signature.** `export async function upgrade(planSlug: 'pro' | 'team'): Promise<{ url: string }>`. Server Action file-level `'use server'`. Note for the writer: this action returns a URL rather than calling `redirect()` server-side, so the client chooses `window.location.assign` (default) or a new tab. This is a deliberate divergence from the form-bound `useActionState` shape — flag it so downstream agents don't "fix" it into a form action. It is **not** wired through `<form action={...}>`; it is a programmatic call from a button's click handler.
2. **Resolve the org.** Reuse the Unit-9/10 server-side org resolution (`requireOrgUser()` reflex, named not re-taught) to get the current org and its `stripe_customer_id`.
3. **Ensure the Customer (lazy creation).** If `stripe_customer_id` is null, call `stripe.customers.create({ email, metadata: { organization_id } })`, persist the returned `id` onto `organizations.stripe_customer_id`, then proceed. If present, reuse it. Emphasize: lookup-and-reuse, never create-per-session. (This pays off L1's debt: "lazy Customer creation deferred to L2.")
4. **Resolve the Price by `lookup_key`.** Map `planSlug` → `lookup_key` (e.g. `'pro'` → `'pro_monthly'` for the default cycle; mention the monthly/yearly toggle picks the key) and fetch the Price via `stripe.prices.list({ lookup_keys: [...], expand: ['data.product'] })` or a cached catalog lookup. Restate the one-liner: IDs differ between test and live mode, `lookup_key` is stable. Do not re-derive the whole L1 argument.
5. **Create the session + return the URL.** `stripe.checkout.sessions.create({ mode: 'subscription', customer, line_items: [{ price, quantity: 1 }], success_url, cancel_url, subscription_data: { metadata: { organization_id } } })`, then `return { url: session.url! }`.

After the annotated walkthrough, a short **`CodeTooltips`** pass (or inline `Term`s) is optional for the Stripe param object — only if it adds clarity; the annotation already covers it, so the writer should not duplicate.

Critical teaching point to state in prose right after the code: **`subscription_data.metadata.organization_id` is the thread that connects this action to the webhook.** The metadata rides on the Subscription, echoes on `customer.subscription.created`, and lets the ch063 handler find the org without a lookup table. Tie this back to L1's "metadata is the carry-channel" explicitly.

Watch-outs to weave into this section (not a separate block): create-per-session multiplies billing identities; raw `price_id` couples to mode. Both belong here because both are properties of how this action is written.

`Term` candidates: **lazy creation** (create-on-first-need, reuse thereafter), **`lookup_key`** (only if a one-line reminder helps; the student saw it in L1 so keep it to a refresher).

### What happens when Checkout completes

The spine of the lesson. The student must internalize the *ordering and the hand-off* — that the success page can render before the entitlement exists, and that provisioning lands through the webhook, not the redirect. Use a **`DiagramSequence`** (its own card, do not wrap in `<Figure>`) with one panel per step so the student scrubs the timeline:

1. User submits payment on the Stripe-hosted page.
2. Stripe creates the Subscription (status starts `trialing` if a trial, else `active`/`incomplete`).
3. Stripe fires `checkout.session.completed`, then `customer.subscription.created` — to the **webhook** built in ch063.
4. In parallel, Stripe redirects the browser to `/billing/success?session_id=...`. The success page renders and reads `plan_entitlements` — **may still see free** (the race).
5. The webhook lands, upserts `plan_entitlements` (single writer; the ch063 ordering predicate applies).
6. The success page's poll (`router.refresh()`, ch063) re-reads, now sees the new entitlement, swaps "finalizing…" → "you're on Pro."

Each step gets a one-line caption. Pedagogical goal: make the parallelism and the race *visible* so the student stops thinking "redirect == done." Highlight the active actor per step (color the box that's "live").

After the sequence, prose nails the rules (each is a chapter-outline watch-out, placed where it lands):
- **The success page reads-and-polls; it never writes the entitlement.** Restate the ch063 single-writer rule in one sentence and point back. Writing from the success page recreates the dual-writer race.
- **The cancel URL means "no state change."** Fires when the user dismisses Checkout without paying. The user never had a subscription — do not log "user canceled subscription"; they might come back. Treat as a navigation event, nothing more.
- **`?session_id=...` is a polling handle, not proof of payment.** It is forgeable; never grant access from its presence. The webhook is the proof. (Mention the ch063 conditional-reach `stripe.checkout.sessions.retrieve` fast path in one sentence as the thing the course deliberately does *not* default to — correctness over perceived latency — then move on.)
- **`success_url` stays inside the app shell.** A marketing-page success URL loses the polling story; keep the user on a route the app controls.

Note for the writer: do **not** re-implement the success page component or the polling code — that is ch063's artifact. Show at most a 3–4 line sketch of the `success_url` value and a one-line reminder of how the poll re-reads, and link back. This lesson owns the *create* side; ch063 owns the *land* side.

Small comprehension check at the end of this section: a **`Sequence`** exercise (drag-to-order) with the six steps above scrambled. Goal: verify the student can reconstruct the click→provisioned timeline and place the webhook *after* the redirect. This is the single most important thing to assess in the lesson; an ordering drill fits it exactly. Include one tempting distractor ordering in the prompt framing (e.g. that "entitlement written on success page" is not a step).

### Trials, payment methods, and other session options

Group the remaining parameters as **knobs on the one `checkout.sessions.create` call** so the student sees configuration, not new machinery. Keep the whole section terse — each knob is "what it does / course default / threshold to change." Use a single **`Code` block** showing the session object with the optional fields added and commented, OR a compact `Tabs`/`TabbedContent` of "minimal vs. fully-configured" — writer's choice; prefer one annotated block to avoid sprawl.

Knobs to cover, in priority order:
- **Trial — `subscription_data: { trial_period_days: 14 }`.** A trial is a Subscription property set at creation. The resulting Subscription starts `trialing`. Tie to the running example (14-day Pro trial). One sentence forward-pointer: the entitlement layer (L4) reads `trialing` as full access and the billing screen shows days remaining (L5) — do not drill status here.
- **Payment-method collection — `payment_method_collection`.** Two values: `'always'` (the default; collect a card even for a trial) and `'if_required'` (skip card when nothing is due, i.e. a card-less trial). **Course default: `'always'`** — converts higher, avoids the "trial ended, no card, forced downgrade" cliff. Name the trade-off in one line: card-less trials reduce friction but leak more non-converting signups. (Fact-checked: `'always'` is the API default and the correct value for "collect at trial start.")
- **Hosted vs. embedded — the 2026 default.** Stripe ships a hosted redirect page and an embedded on-page experience. **Course default: hosted** — ships faster, no client-side Stripe.js wiring, works identically in web and mobile webviews, sidesteps the parent page's CSP. Name the threshold to reach for embedded: retention data shows the redirect hurts conversion, or the brand demands a single-domain experience. **Author guidance:** teach hosted as *the default you get by omitting `ui_mode`* — do not write a `ui_mode` literal in the code. Rationale (fact-checked, see Scope note): the hosted value's enum string was renamed across Stripe API versions (`hosted` → `hosted_page` in the 2026-03-25 `dahlia` release), and the chapter pins `2025-03-31.basil`; omitting the param yields the hosted default on every version and keeps the sample version-proof. Mention embedded by name only; do not show its client wiring (explicitly out of scope).
- **Promotion codes — `allow_promotion_codes: true`.** Lets users redeem dashboard-created codes. Name it for the discount-code feature; the project ships without it. One line.
- **Customer updates — `customer_update: { address: 'auto', name: 'auto' }`.** Lets address/email edits in Checkout propagate to the Customer; pass it when collecting tax-relevant address. One line; keep minimal.
- **Tax — `automatic_tax: { enabled: true }`.** Stripe Tax computes sales tax/VAT on the session; requires tax registrations configured in the dashboard. Name the toggle and the prerequisite; do not drill compliance.

Pedagogical note for the writer: resist expanding any of these into a subsection. They are deliberately shallow — the lesson's depth budget is spent on the flow and the action, not on the option catalog. A short **`MultipleChoice`** at the end can check the one decision that actually bites: "your trial should collect a card up front — which option and why?" (answer: `payment_method_collection: 'always'`, higher conversion / no end-of-trial downgrade surprise).

`Term` candidates: **dunning** only if the trial-downgrade copy invokes it (probably defer to L5); **proration** — defer to L3. Likely none needed here.

### The billing.upgrade signature, one more time

Very short closing section (could fold into the action section, but a brief recap aids retention). Restate the reference signature the project will implement:

`billing.upgrade(planSlug: 'pro' | 'team'): Promise<{ url: string }>` — resolves org → ensures Customer → creates session → returns URL. Returns the URL (not a server redirect) so the client picks the navigation.

Name `upgrade` as the first of the three `billing.*` methods (with `openPortal` from L3 and `requirePlan` from L6) in one sentence, so the signature the student saw matches the interface L6 formalizes. **Do not** explain the carve-out, the directory, or `requirePlan` — pointer only.

Close with an **`ExternalResource`**/`LinkCard` or two: Stripe's "Build a subscriptions integration (Checkout)" doc and the Checkout Sessions API reference. Optional `VideoCallout` only if a current (<6 mo), high-quality Stripe Checkout subscription walkthrough is found by the resourcer — do not block on it; the flow diagram carries the lesson.

---

## Scope

**This lesson covers:** the Checkout Session primitive (server-created, single-use, short-lived, hands off payment + provisioning); the `billing.upgrade` Server Action (resolve org → lazy Customer create/reuse → resolve Price by `lookup_key` → create subscription-mode session → return URL); `subscription_data.metadata.organization_id` as the webhook carry-channel; the full click→provisioned timeline and where each piece lands; the success/cancel URL semantics; trials via `trial_period_days`; `payment_method_collection`; the hosted-vs-embedded default decision; and a name-only pass over promo codes, customer updates, and automatic tax.

**This lesson does NOT cover (redirect the writer away from these):**
- **The webhook handler that provisions the entitlement.** Built in chapter 063 (signature verification, idempotency, ordering, single-writer) and shipped as full code in the project chapter 065. Restate in ≤2 sentences as the thing Checkout triggers; never re-implement.
- **The success-page polling mechanism.** `router.refresh()` read-and-poll, the 30-second budget, the dual-writer-is-wrong argument — all taught in L4 of chapter 063. Reference and point back; show at most the `success_url` string and a one-line poll reminder.
- **The `plan_entitlements` row shape.** Columns, single-writer write side, `getEntitlement` read helper — all L4 of this chapter. This lesson may say "the webhook upserts the entitlement row" without showing the schema.
- **Subscription status semantics.** `trialing`, `active`, `past_due`, `canceled`, `incomplete`, the decision table, grace periods, banners — all L5. This lesson may *mention* that a session with a trial yields a `trialing` Subscription, but must not teach what `trialing` (or any status) means for access.
- **The `billing.*` interface architecture.** The carve-out rationale, `/lib/billing/` directory, `requirePlan`, `BillingError`, the three-test threshold — all L6 (and L7). This lesson plants `billing.upgrade` as a signature and names it as one of three methods; nothing more.
- **The Customer Portal.** Plan changes, cancellation, invoice history, deep links — all L3. New subscriptions go through Checkout (this lesson); managing existing ones goes through the Portal (L3). State the boundary once.
- **Embedded Checkout client wiring.** `ui_mode: embedded`, Stripe.js, `clientSecret`, the `<EmbeddedCheckout>` component — named as the alternative, never drilled.
- **Tax compliance, invoicing detail, revenue recognition.** Out of scope for the whole course; `automatic_tax` is named as a toggle only.

**Prerequisites to restate concisely (one line each, do not re-teach):** the four Stripe objects and `lib/stripe.ts` singleton (L1); `lookup_key` over `price_id` (L1); `organizations.stripe_customer_id` nullable text (L1); the redirect-versus-webhook race and its read-and-poll fix (ch063); server-side org resolution via `requireOrgUser()` (Unit 9/10).

---

## Author notes (versioning / fact-check)

- **Stripe API version:** the chapter pins `apiVersion: '2025-03-31.basil'` (L1 continuity). Keep it. As of June 2026 the latest Stripe API is `2026-05-27.dahlia` and `stripe-node` defaults to it, but the chapter deliberately pins basil for the `current_period_end`-on-item behavior L1 depends on. Do not bump the version inside this lesson; consistency with L1 outranks currency here. If a future revisit re-pins the whole chapter to dahlia, the only Checkout-side change is the `ui_mode` enum rename — which this lesson sidesteps by omitting `ui_mode` entirely.
- **`ui_mode` omission is deliberate, not an oversight.** Verified: default is the hosted redirect; the enum literal for "hosted" changed (`hosted` → `hosted_page`) in the 2026-03-25 dahlia release. Omitting the field keeps the sample correct on both basil and dahlia. The writer must teach "hosted is the default" rather than write the literal.
- **`payment_method_collection: 'always'` is the API default** and the correct value for the course's "collect a card at trial start" stance; `'if_required'` is the card-less-trial alternative. Verified June 2026.
- **`success_url` is required for hosted mode**, `cancel_url` is optional. Verified.
- **`trial_period_days` lives under `subscription_data`** on the session. Verified.
