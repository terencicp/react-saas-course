# Chapter 064 — Stripe billing and plan entitlements

## Lesson 1 — The Stripe object graph

**Taught.** Four Stripe objects (Product, Price, Customer, Subscription), their relationships, metadata as webhook carry-channel, test/live mode discipline, `lib/stripe.ts` singleton, pricing-as-code convention, and the Stripe-owns-truth / app-stores-projection boundary.

**Cut.** Chapter outline mentioned `current_period_start` alongside `current_period_end`; the lesson only teaches `current_period_end` (on the item) since start is not used in the projection.

**Debts.**
- Lazy Customer creation deferred to L2 (Checkout).
- Trial wiring (`subscription_data.trial_period_days`) deferred to L2.
- Full `plan_entitlements` schema and write side deferred to L4.
- Subscription status semantics deferred to L5.
- `billing.*` interface directory shape (`lib/billing/`) deferred to L6; L1 only names `lib/stripe.ts` as the single SDK import point.
- Full webhook handler code and seed-script implementation deferred to project chapter 065.

**Terminology.**
- `lookup_key` — author-chosen string handle on a Price; identical across test and live mode; the query handle app code uses instead of `price_id`.
- `current_period_end` — lives on `subscription.items.data[0].current_period_end` (Stripe API `2025-03-31.basil`), NOT on the Subscription root; earlier tutorials/libraries that read the top-level field get `undefined`.
- Subscription item — the Price-plus-quantity line inside a Subscription; the unit that carries the billing period.
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` — server-only vs. client-safe key distinction established here.
- Metadata — arbitrary key/value pairs echoed on every webhook event; used for `Customer.metadata.organization_id` and `Subscription.metadata.plan`.

**Patterns and best practices.**
- One Product per plan tier, not per billing cycle.
- One Stripe Customer per organization (never per user); pointer stored as `organizations.stripe_customer_id text` (nullable until first Checkout).
- Reference Prices by `lookup_key`, never by raw `price_id`.
- `Customer.metadata.organization_id`, `Subscription.metadata.plan` stamped at creation so webhook handler needs no DB round-trip to identify the org and plan.
- `lib/stripe.ts` exports a single configured `stripe` instance with `import 'server-only'` and a pinned `apiVersion: '2025-03-31.basil'`; this is the only file allowed to instantiate the SDK.
- The derived projection stores only `{ plan, status, currentPeriodEnd, cancelAtPeriodEnd }` (illustrative sketch, not final schema — that is L4's job); do not mirror the full Stripe Subscription shape.
- Event surface: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed` — full handler code in project ch065.
- Catalog defined in code (`pnpm seed:stripe`), not dashboard clicks; same seed applied to test and live for parity.
- One active Subscription per Customer, one item per Subscription (`items.data[0]`) is the course default.
- Never call `stripe.*` on the request hot path; read from `plan_entitlements` instead (L4).

**Misc.**
- The entitlement projection sketch in this lesson (`plan`, `status`, `currentPeriodEnd`, `cancelAtPeriodEnd`) is explicitly marked illustrative and partial — L4 owns the canonical column-by-column schema. Later lesson writers must not treat the sketch as the contract.
- The `billing.*` interface and `/lib/billing/` directory are only foreshadowed here; `lib/stripe.ts` is the actual artifact introduced in L1. L6 relocates it to `lib/billing/stripe.ts` — same singleton, not a second client.
- Running example used throughout the chapter: Pro plan, monthly ($20/month = `2000` cents, `lookup_key: 'pro_monthly'`) and yearly ($200/year = `20000` cents, `lookup_key: 'pro_yearly'`), 14-day trial.
- Catalog seed file shown as `stripe/catalog.ts` (top-level `stripe/` directory, not inside `lib/billing/`); full script ships in ch065.

---

## Lesson 2 — Starting subscriptions with Checkout


**Taught.** Checkout Session as a server-created, single-use, short-lived URL that hands payment to Stripe and provisioning to the webhook; the `billing.upgrade` Server Action (resolve org → lazy Customer create/reuse → resolve Price by `lookup_key` → create subscription-mode session → return URL); `subscription_data.metadata.organization_id` as the webhook carry-channel; the full click→provisioned timeline including the redirect-vs-webhook race; `success_url`/`cancel_url` semantics; and session configuration knobs (`trial_period_days`, `payment_method_collection`, hosted-vs-embedded, `allow_promotion_codes`, `customer_update`, `automatic_tax`).

**Cut.** Chapter outline mentioned the embedded Checkout client wiring (`ui_mode`, Stripe.js, `clientSecret`, `<EmbeddedCheckout>`) — lesson names embedded as the alternative but explicitly does not drill it. The `stripe.checkout.sessions.retrieve` fast-path for the success page (mentioned in ch063 L4) is also name-dropped but deliberately not recommended as the default.

**Debts.**
- `plan_entitlements` row shape (columns, write side) deferred to L4.
- Subscription status semantics (`trialing`, `active`, etc. and what they mean for access) deferred to L5.
- `billing.*` interface architecture, `/lib/billing/` directory, `requirePlan`, `BillingError` deferred to L6.
- Customer Portal (plan changes, cancellation, `openPortal`) deferred to L3.
- Full implementation of `billing.upgrade` with `resolvePrice` helper deferred to project ch065.
- Success-page polling mechanism (component, `router.refresh()`, 30-second budget) belongs to ch063 L4 — this lesson only references it.

**Terminology.**
- Checkout Session — server-created, single-use URL good for one checkout, expires ~24 hours; never store or email it.
- `mode: 'subscription'` — the session param that makes it recurring (vs. `'payment'` for one-off).
- `subscription_data.metadata` — the field that stamps metadata onto the resulting Subscription; the carry-channel for `organization_id` to the webhook.
- `{CHECKOUT_SESSION_ID}` — Stripe placeholder in `success_url` string; Stripe substitutes the real session id on redirect; it is a polling handle, not proof of payment.
- Lazy Customer creation — create Stripe Customer only when `stripe_customer_id` is null, immediately persist the returned id, reuse thereafter; never create-per-session.
- `payment_method_collection: 'always'` — course default; collects card at trial start even when nothing is immediately due; `'if_required'` is the card-less-trial alternative.
- Hosted Checkout — the course default; achieved by omitting `ui_mode` (do NOT write a `ui_mode` literal — the enum value changed across Stripe API versions).
- Org resolution pattern in `upgrade`: `const { orgId } = await requireOrgUser(); const org = await getOrganization(orgId);` — two calls, NOT `const { org } = await requireOrgUser()`.

**Patterns and best practices.**
- `billing.upgrade(planSlug: 'pro' | 'team'): Promise<{ url: string }>` — the reference signature; returns URL rather than calling `redirect()` so the caller picks navigation.
- Action is NOT wired through `<form action={...}>`; it is a programmatic call from a button click handler.
- Resolve Price by `lookup_key`, never by `price_id`; resolve before the `checkout.sessions.create` call.
- Stamp `subscription_data: { metadata: { organization_id: org.id } }` so the resulting Subscription carries the org identity to the webhook without a lookup table.
- `success_url` must stay inside the app shell (a route the application renders) so the read-and-poll can run.
- `cancel_url` is a "no state change" event — do not log "user canceled subscription"; they never had one.
- Never grant access based on the presence of `?session_id=...` in the URL; the webhook is the only proof of payment.
- The success page reads and polls the entitlement row; it never writes it (single-writer rule from ch063).
- Course default for trials: `trial_period_days: 14` under `subscription_data`, `payment_method_collection: 'always'`.

**Misc.**
- `billing.upgrade` is introduced as the first of three `billing.*` methods; `openPortal` (L3) and `requirePlan` (L6) are named but not explained here.
- The full Stripe API version note: chapter pins `apiVersion: '2025-03-31.basil'`; the `ui_mode` enum literal changed in the `2026-03-25.dahlia` release — omitting `ui_mode` keeps the sample valid on both versions.
- `resolvePrice` helper (maps plan slug to `lookup_key`, fetches via `stripe.prices.list`) is used in the action code but its internals are not shown; project ch065 ships the full implementation.

---

## Lesson 3 — Managing subscriptions with the Portal

**Taught.** `billing.openPortal(returnPath?)` as the second `billing.*` Server Action; the Portal round-trip (app initiates → Stripe hosts → app receives return); Portal capabilities (plan switch, cancel at period end, payment-method update, invoice history); cancellation event sequence (`customer.subscription.updated` now, `customer.subscription.deleted` at period end); return-URL discipline (redirect is navigation, not state-change proof); proration as Stripe-owned math; `flow_data` deep-link flows; the Customer-outlives-subscription rule; build-vs-buy threshold for in-house billing UI.

**Cut.** Chapter outline included `allow_tax_id` and `billing_address_collection` Portal-config toggles and a `trialing` UI note — neither surfaced; not plausibly depended on by later lessons.

**Debts.**
- `BillingError` is used (throw form) but its full definition (`Error` subclass with machine-readable code, action-level `Result` wrapping) is deferred to L6.
- `plan_entitlements` columns `cancel_at_period_end` and `current_period_end` motivated here but schema definition deferred to L4.
- Winding-down banner, "ends on Aug 14" surface, undo/reactivate, `dunning`, `hasActiveAccess`, `past_due` grace period — all deferred to L5. `dunning` must NOT be defined before L5.
- `/lib/billing/` directory architecture deferred to L6.
- `FinalizePoller` referenced by name (from ch063 L4) — not re-introduced.

**Terminology.**
- `openPortal(returnPath = '/settings/billing'): Promise<{ url: string }>` — arrow-function form (`export const openPortal = async (...)`), parallel shape to `upgrade` (both return `{ url }`, never call `redirect()`).
- `billing.*` org-resolution pattern: both `upgrade` (L2) and `openPortal` (L3) use the same two-call pattern — `const { orgId } = await requireOrgUser(); const org = await getOrganization(orgId);` — NOT `const { org } = await requireOrgUser()`. Both read `org.stripeCustomerId`. `upgrade` uses `export async function` declaration form, `openPortal` uses `export const` arrow form — both are valid; later lessons should pick one and stay consistent.
- `cancel_at_period_end` — Portal flag; `true` means subscription stays `active` until `current_period_end`, then `customer.subscription.deleted` fires; reactivate by setting back to `false`.
- Portal session — short-lived, single-use, bearer-style URL; mint fresh per click, never store or log.
- `flow_data` — portal-session param for deep-linking to `subscription_cancel`, `subscription_update`, or `payment_method_update` flows.
- `absoluteUrl(path)` — project helper that converts a relative path to a full `https://…` URL; required because Stripe redirect targets must be absolute.
- Return-page finalized check: `const isFinalized = entitlement.status === 'active';` then `if (!isFinalized) return <FinalizePoller isFinalized={isFinalized} />;` — the pattern for detecting a not-yet-landed webhook on the Portal return page.

**Patterns and best practices.**
- `openPortal` lives at `lib/billing/portal.ts`; `stripe` is imported only inside `/lib/billing/`; file starts with `import 'server-only'`.
- No `stripeCustomerId` → throw `BillingError('no_customer', …)`; never lazily create a Customer in the Portal path (inverse of L2's lazy-create).
- Return-page rule: never write `plan_entitlements` on Portal return; read-and-poll (`FinalizePoller`) if the webhook hasn't landed yet; the webhook is the only writer.
- Billing entry-point decision: `stripeCustomerId` present → `openPortal()`; absent → `upgrade()` (Checkout). No third path.
- Trust Stripe's proration; never compute it in-app.
- Portal default is the chapter's shipped baseline; in-house build is justified only by legal/consent requirements, complex plan-change UX, B2B contract motions, or unsupported i18n — never by aesthetics.
- Deep-link button copy must name the destination (e.g., "Cancel subscription", not "Manage billing").

**Misc.**
- L3 explicitly does not define `dunning`; L5 owns that term.
- Portal configuration ships dashboard-configured for the project; `stripe.billingPortal.configurations.*` API named as the code-path alternative for reviewable diffs (same pattern as L1's seed script).
- L3 foreshadows L5's winding-down banner and L6's full `BillingError` contract; lesson writers for those lessons should treat those as open debts to close, not new ground.

---

## Lesson 4 — Plan entitlements as a derived view

**Taught.** The derived-view pattern (read-shaped local projection over full mirror or per-request call); the canonical `plan_entitlements` Drizzle schema column-by-column; one-row-per-org rationale; the single-writer rule reframed as read-trustworthiness; the `subscriptionToEntitlement` pure projection function shape; the `getEntitlement(orgId)` read helper with non-null return and `cache()` wrapping; free-row-at-org-creation provisioning; and the backfill discipline when projection logic changes.

**Cut.** Chapter outline scope was fully covered; no cuts plausibly depended on by later lessons.

**Debts.**
- `status` values stored as opaque string-literal union here; meaning (`trialing`/`active`/`past_due`/`canceled` and the access decision), `hasActiveAccess`, grace-period banners, dunning, winding-down UI — all deferred to **L5**.
- `billing.*` interface architecture, `/lib/billing/` directory, `requirePlan`, `BillingError` full definition — deferred to **L6**. L4 only foreshadows that the projection lives behind that seam.
- Full webhook handler (signature verify, `processed_events` claim, UPSERT statement, `lastEventAt` predicate implementation) — deferred to project **ch065**.
- Seat enforcement implementation (invite/role gate `members.count <= seats`) — already built in ch056; L4 only defines the column and names the gate.

**Terminology.**
- `plan_entitlements` — one-row-per-org Drizzle table; PK `organizationId` (UUID, FK→`organizations.id` `onDelete: 'cascade'`).
- `PlanEntitlement` — row type via `typeof planEntitlements.$inferSelect`; the type `getEntitlement` returns and L5's `hasActiveAccess` will consume.
- `plan` — `text({ enum: ['free', 'pro', 'team'] }).notNull()` — never a Postgres enum.
- `status` — `text({ enum: ['trialing', 'active', 'past_due', 'canceled', 'incomplete'] }).notNull()` — stored as opaque label here; semantics owned by L5.
- `subscriptionId` — `text()` nullable; free orgs have none.
- `currentPeriodEnd` — `timestamp({ withTimezone: true })` nullable; lives on `subscription.items.data[0].current_period_end` (NOT the Subscription root); `* 1000` to convert Stripe epoch-seconds to JS `Date`.
- `cancelAtPeriodEnd` — `boolean().notNull().default(false)`.
- `seats` — `integer().notNull().default(1)`.
- `lastEventAt` — `timestamp({ withTimezone: true })` nullable; the ordering guard (webhook skips events older than stored value); no feature reads it directly.
- `updatedAt` — `timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())`.
- `subscriptionToEntitlement(subscription: Stripe.Subscription): EntitlementPatch` — pure function, no IO; the single place a Stripe Subscription shape becomes an app shape. `EntitlementPatch` is a named type picking the writable columns, deriving `plan`/`status` union from `PlanEntitlement`.
- `resolvePlan(priceId)` — maps a price id (from the app's seeded price→plan catalog) to a plan slug; used inside `subscriptionToEntitlement`; plan is never hardcoded against a raw `price_id`.
- `getEntitlement(orgId: string): Promise<PlanEntitlement>` — non-null return guaranteed by provisioning; single invariant guard `if (!entitlement) throw new Error(...)` inside the helper (not at call sites); wrapped in React `cache()` for request-scoped dedup; lives at `db/queries/entitlements.ts`; reads via the scoped relational API: `const entitlement = await tenantDb(orgId).query.planEntitlements.findFirst()` — NOT `.select().from(planEntitlements).where(...)`.
- Request-scoped memoization — `cache()` dedupes calls within one render, discarded after; NOT cross-request persistence.
- Derived view / projection — a read-shaped local table of only the facts request paths read, refreshed only on Stripe webhook events; "read-shaped, not write-shaped, every column earns its place by being read on the hot path without a join."

**Patterns and best practices.**
- Free org provisioning: insert `plan_entitlements` row at org creation with `plan: 'free'`, `status: 'active'`, `seats: 1`, Stripe-side columns (`subscriptionId`, `currentPeriodEnd`) null. Eliminates null-branch at every gate.
- Free plan is not a special case — same `getEntitlement` shape for all orgs; only column values differ.
- Single writer: only the webhook path writes `plan_entitlements`; no Server Action, Checkout success page, or Portal return handler may write it.
- Read helper lives in `db/queries/entitlements.ts`; no ad-hoc `db.select` at call sites.
- Projection logic change requires a backfill job (re-run `subscriptionToEntitlement` for each org with non-null `stripe_customer_id`) in addition to a schema migration.
- Hot-path tables model current state; subscription history is a separate table derived when a feature needs it.

**Misc.**
- `DrizzleSchemaCoding` exercise uses plain `text`/`integer` (not `text({ enum })`, no UUIDv7 PKs) for PGlite grader compatibility; narrative schema keeps `text({ enum })` and UUID PKs — do not reconcile them.
- `status` must remain an opaque stored string in L5 and L6 code that touches this table; do not add semantic branching to L4's schema or `subscriptionToEntitlement`.
- L5 consumes `PlanEntitlement` (from `getEntitlement`) to define `hasActiveAccess`; the type contract is `typeof planEntitlements.$inferSelect` — do not redefine it.
- The `item.current_period_end * 1000` conversion and the item-not-root gotcha are explicitly taught here; L5/L6 must not re-introduce `subscription.current_period_end` at the root level.

---

## Lesson 5 — Subscription status as first-class state

**Taught.** The five stored status labels (`trialing`, `active`, `past_due`, `canceled`, `incomplete`), the full subscription lifecycle as a state machine (StateMachineWalker + Mermaid `stateDiagram-v2`), the access decision table, `hasActiveAccess(entitlement)` as the single gate function, the `(plan, hasAccess)` two-axis orthogonality model (illustrated via the `AccessVsTier` custom Astro component), a status-keyed banner system (copy + CTA + destination, illustrated via the `StatusBanners` custom Astro component and the `bannerCopy` record shape), the `isWindingDown` derived predicate, and the seat-overage human-in-the-loop discipline.

**Cut.** Chapter outline treated `canceled` + `cancelAtPeriodEnd` + future `currentPeriodEnd` as a potential access-grant case; lesson corrects this: with this projection `canceled` always denies access — the grace window is carried entirely by `active` + `cancelAtPeriodEnd`, so by the time status is `canceled` the paid period is over. Also cut: `unpaid` and `incomplete_expired` as separately reasoned-about statuses in the switch (both are collapsed into the five stored labels by the L4 projection and do not appear in `hasActiveAccess`). `billing.reactivate()` and `billing.confirmTrial()` are foreshadowed but not built. `trialing` days-remaining UI surface was sketched rather than drilled.

**Debts.**
- `requirePlan(planSlug)` — the gate wrapper that calls `hasActiveAccess` and throws `BillingError` — deferred to L6.
- Full `BillingError` / `Result` error contract deferred to L6.
- `billing.reactivate()` and `billing.confirmTrial()` Server Action implementations deferred to project ch065.
- `/lib/billing/` directory architecture deferred to L6.

**Terminology.**
- `hasActiveAccess(entitlement: PlanEntitlement): boolean` — arrow bound to `const`, explicit `boolean` return; `switch (entitlement.status)` over the five stored labels; `trialing | active | past_due` fall-through to `return true`; `canceled | incomplete` fall-through to `return false`; exhaustive `never` default: `const _exhaustive: never = entitlement.status; return _exhaustive`.
- `canceled` always denies — the canonical rule with this projection; do NOT write an access check that grants on `canceled` with a future `currentPeriodEnd`. Wind-down grace is carried entirely by `active` + `cancelAtPeriodEnd`; by the time status flips to `canceled`, the paid period is genuinely over.
- `isWindingDown(entitlement: PlanEntitlement): boolean` — `entitlement.status === 'active' && entitlement.cancelAtPeriodEnd`; a pure derived predicate over existing fields, not a stored status.
- `dunning` — Stripe's automatic failed-payment retry sequence; first defined in this lesson (L3 explicitly must NOT define it — L5 owns it).
- `bannerCopy` — illustrative record keyed by `past_due | winding_down | canceled`, each entry `{ message, ctaLabel, destination: 'portal' | 'checkout' }`. `destination: 'portal'` for `past_due` (update card) and winding-down (undo cancel); `destination: 'checkout'` for `canceled` (re-subscribe). Shorthand: starting → Checkout, modifying → Portal.

**Patterns and best practices.**
- One switch, one function (`hasActiveAccess`) — never scatter `status === 'active' || status === 'trialing'` inline; the exhaustive `never` default turns a missing case into a compile error at the one place that owns the decision.
- Derived semantic predicates (`isWindingDown`, `isInGracePeriod`) are pure arrow helpers over existing fields; never add synthetic stored statuses Stripe doesn't ship.
- `past_due` keeps access + shows banner; only `canceled` or `incomplete` denies. Locking out at the first dunning failure throws away customers Stripe is actively recovering.
- Banner CTA destination: terminal states (`canceled`) → Checkout; grace/wind-down states → Portal.
- Banner container uses `role="status"` live region for non-urgent polite announcement.
- Seat overage: surface constraint + block new invites; never auto-kick existing members.

**Misc.**
- L6 consumes `hasActiveAccess` as the boolean core that `requirePlan` is built on; L6 must import it, not reimplement it.
- ReactCoding sandbox narrows `hasActiveAccess` to a bare `Status` string union (no DB type import in iframe) — the production signature takes `PlanEntitlement`; the lesson explicitly calls this out so students are not confused by the signature difference.
- The `never` exhaustive default relies on `noFallthroughCasesInSwitch` already present in the project `tsconfig`; L6 must not relax that compiler rule.
- Custom lesson components: `src/components/lessons/064/5/AccessVsTier.astro` (the plan×access grid) and `src/components/lessons/064/5/StatusBanners.astro` (tabbed banner previews). Not imported by later lessons; for reference only.

---

## Lesson 7 — When an SDK adapter earns its weight

**Taught.** The three-question threshold for wrapping an SDK (read-hostile shape / real swap cost / discipline-to-centralize), the helper-vs-interface distinction framed by enforcement ("is other code forbidden from touching the SDK?"), the matrix applied to all five course integrations (auth + billing → interface; Resend + R2 → helper; Trigger.dev → direct call), why "wrap for consistency" fails as a reason, and the four dividends the two interfaces pay (test seam, API-version pinning, observability gravity, class-based adapter pattern).

**Cut.** Chapter outline covered Trigger.dev task-primitive detail and watch-outs about over-mocking in tests — lesson flags Trigger.dev as "shape only, taught later" and the testing section stays at the argument level (no mock code). Nothing cut that a later lesson would depend on; Unit 18 owns the full test-seam implementation.

**Terminology.**
- Three-question threshold: (a) read-hostile shape, (b) real swap cost, (c) discipline-to-centralize — three-of-three → interface; two-of-three → helper; fewer → direct call.
- Helper — a function that simplifies one call; the underlying SDK remains importable everywhere; not a boundary.
- Interface — a module with a stable public surface where the SDK is forbidden outside one directory; the SDK becomes a transitive dependency.
- Transitive dependency — "a package your code reaches only through another module, never by importing it directly."
- Adapter — "a thin module that exposes your own stable interface over a third-party library, so call sites depend on your shape, not the vendor's."
- Anti-corruption layer — a boundary that keeps vendor shapes out of domain code.
- `presignedPut(key)` — the R2 helper name (ch068 forward reference); helper verdict, SDK still importable.
- "Named once, applied twice, withheld three times" — the chapter's one-line architectural posture toward third-party SDKs.

**Patterns and best practices.**
- Never wrap an SDK for symmetry or consistency — decision quality, not uniformity, is the bar.
- The forbidden question is the helper/interface separator: if other code must be prevented from touching the SDK, the verdict is interface; otherwise helper or direct.
- Wrappers attract observability gravity — logs and metrics belong at the seam where every call already passes.
- API version pinning (`apiVersion: '2025-03-31.basil'`) belongs inside the one file that constructs the client (`lib/billing/stripe.ts`), not in env or scattered call sites.
- The class-instance is hidden inside `/lib/billing/`; the public surface is plain functions — "wrap the class behind functions" and "give this SDK an interface" are the same decision.

**Misc.**
- The absence of a wrapper around Resend, Trigger.dev, and R2 is a deliberate architectural decision, not an oversight — later lesson writers must not propose wrapping them.
- Trigger.dev (`myTask.trigger(payload)`) and R2 (`PutObjectCommand`) are shown as call-site shapes only; their full APIs are taught in ch066 and ch068 respectively.
- The full test-seam implementation (mocks, fixtures, test files) is forwarded to Unit 18; this lesson only delivers the argument for why the seam makes tests tractable.
- The optional `CodeReview` exercise (PR wrapping Resend "for consistency", kernel: "pure indirection — wraps the SDK without centralizing any discipline") did ship.
- Custom lesson component: `src/components/lessons/064/7/ForbiddenVsCoexist.astro` — side-by-side layers figure showing "wall on the left (Stripe/billing), open door on the right (Resend/sendEmail)"; the load-bearing visual for the helper-vs-interface distinction.
- This is the last teaching lesson of the chapter; L8 is the quiz.

---

## Lesson 6 — The thin billing interface

**Taught.** The `/lib/billing/` directory seam (sole Stripe SDK import point), the three-method `billing.*` public surface (`upgrade`, `openPortal`, `requirePlan`), the `requirePlan` gate implementation composing `hasActiveAccess` + `planAtLeast`, `BillingError` definition, and the two-surface failure pattern (Server Component throws → `error.tsx`; Server Action catches → `err('forbidden', …)`).

**Cut.** Chapter outline listed testability as a topic (mock the three methods, shrink test surface area); lesson only names testing as a production stake in one sentence, explicitly forwarding the full testing-seam argument to L7. The chapter outline's general three-test threshold (read-hostile shape / swap cost / discipline-to-centralize) and the Resend/Trigger.dev/R2 contrast matrix are entirely deferred to L7 — the lesson hands them forward explicitly.

**Debts.**
- General SDK-wrapping threshold and the Resend/Trigger.dev/R2 contrast matrix — **L7**.
- `billing.reactivate()` and `billing.confirmTrial()` — deferred to project **ch065** (named but not built).
- Full `requirePlan` wired to real privileged surfaces — **project ch065**.

**Terminology.**
- `/lib/billing/` — the only directory that may `import Stripe` or `import { stripe }`; everywhere else imports from `billing`.
- `billing.*` — the three-method public surface re-exported from `lib/billing/index.ts`: `upgrade`, `openPortal`, `requirePlan`.
- `PLAN_RANK` — `{ free: 0, pro: 1, team: 2 } as const satisfies Record<Plan, number>`; the plan ladder as data, mirrors `ROLE_RANK` from ch057 L1.
- `planAtLeast(plan: Plan, required: Plan): boolean` — `PLAN_RANK[plan] >= PLAN_RANK[required]`; mirrors `roleAtLeast`.
- `requirePlan(planSlug: 'pro' | 'team'): Promise<void>` — throws `BillingError` on failure, returns `void` on success; `import 'server-only'` (not `'use server'`); never calls Stripe on the hot path.
- `BillingError` — `extends Error`, `readonly name = 'BillingError' as const`, `readonly code: 'no_access' | 'plan_required' | 'no_customer'`; constructor `(code, userMessage)` with `super(userMessage)`. Lives at `lib/billing/billing-error.ts`; internal to the directory (not re-exported from `index.ts`).
- Transitive dependency — the SDK is reached only through `billing`, never imported directly by routes/actions/components.
- Fail closed — on any uncertainty the gate denies; absence of a throw is the only grant.

**Patterns and best practices.**
- `lib/billing/index.ts` re-exports exactly three named methods (`upgrade`, `openPortal`, `requirePlan`) with a one-line comment; no `export *`; no re-export of `stripe` client or `BillingError`. This is the sanctioned barrel exception (small module, stable named public API).
- `stripe.ts` relocated from `lib/stripe.ts` → `lib/billing/stripe.ts`; same singleton, same `import 'server-only'` + pinned `apiVersion`; not a second client.
- `getEntitlement` stays in `db/queries/entitlements.ts`; do not move it into `/lib/billing/` — the seam is Stripe calls + the gate, not everything billing-flavored.
- Every file in `/lib/billing/` opens with `import 'server-only'`.
- `requirePlan` body: `const { orgId } = await requireOrgUser();` then `await getEntitlement(orgId)` — destructures `orgId` directly from `requireOrgUser()`, no `org.id` indirection (there is no separate `getOrganization` call in the gate).
- Plan-gate failure in a Server Action maps to `err('forbidden', error.message)` — the fixed `Result` union has no `payment_required` or `paywall` code. Machine-readable billing distinction is carried by `BillingError.code` (available to logs/telemetry), not by a new transport code.
- `catch` in the Server Action narrows with `instanceof BillingError` and re-throws anything else; never swallow unrelated errors.
- `requirePlan` is `server-only`, not `'use server'`; it is a guard called from server code, not a Server Action callable from the client.
- `stripe.ts` and `require-plan.ts` open with `import 'server-only'`; `upgrade.ts` and `portal.ts` carry `'use server'` (they are Server Actions callable from the client) — not every file in `/lib/billing/` is `server-only`.

**Misc.**
- Two sanctioned SDK/seam wrappers in the course: `authedAction` (ch057 L2) and `billing.*` (this lesson). No others.
- L7 is explicitly called out as the lesson that makes the general three-test threshold explicit and contrasts billing/auth (wrapped) vs. Resend/Trigger/R2 (not wrapped). L6 writers must not build that matrix or generalize the rule beyond billing-specific terms.
- The `lib/billing/index.ts` barrel exception is deliberate and should not be flagged by code-conventions reviewers — the lesson documents the rationale.
