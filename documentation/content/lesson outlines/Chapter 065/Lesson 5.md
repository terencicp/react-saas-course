# Lesson 5 — Ship the three-method billing interface

## Lesson title

Chapter-outline title fits. Keep: **Ship the three-method billing interface**.
Sidebar: **Billing interface**.

## Lesson type

`Implementation`

(Test-coder runs. Writer renders the Implementation section list.)

## Lesson framing

The student installs the thin out-bound seam that is the *only* way the app speaks to Stripe: three methods behind `lib/billing/` — `upgrade` and `openPortal` (admin Server Actions returning a Stripe-hosted URL) and `requirePlan` (a `server-only` Server-Component gate that throws). The senior payoff is the discipline of a deliberately small interface: actions mutate and return `Result`, gates throw and rely on `error.tsx`, and the SDK never leaks past this directory. With the inbound projection already landed (lesson 4), wiring these three closes the user-facing loop end-to-end — Upgrade → Checkout → success-page poll → Pro; Portal cancel → flag flips; `/inspector/pro-only` gates before, content after.

## Codebase state

**Entry.** Inbound webhook is complete: route handler verifies and claims in one transaction (lessons 2–3), the three handlers project Stripe Subscriptions into the `plan_entitlements` row with the ordering predicate and audit logs (lesson 4), `getEntitlement`/`hasActiveAccess` read and decide. But the out-bound side is stubbed — `upgrade.ts` and `portal.ts` return `err('internal', 'Not implemented')`, `require-plan.ts` always throws `BillingError('plan_required', …)` after `requireOrgUser()`. The inspector's Checkout/Portal buttons render but do nothing useful, and `/inspector/pro-only` always shows the gate fallback. The starter's `billing-error.ts` and `index.ts` ship complete (only carry cosmetic `TODO(L5)` comments); `pro-only/error.tsx`, the success page + `Poller`, and both button islands ship complete.

**Exit.** The three methods are implemented. `upgrade` ensures the Stripe Customer (create-on-Stripe-first), resolves the Price by `lookup_key`, and creates a Checkout session with trial + metadata carry-channel. `openPortal` guards the no-Customer case with `err('forbidden', …)` and otherwise opens a Billing Portal session. `requirePlan` reads the entitlement, throws `BillingError('no_access')` on inactive and `BillingError('plan_required')` on too-low tier via `PLAN_RANK`. The `TODO(L5)` comments in `billing-error.ts` and `index.ts` are removed. The full user loop works against a test-mode Stripe account; only lesson 6's metadata cross-check remains.

## Lesson sections

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: implement the three billing methods so a user can upgrade through Stripe Checkout, manage billing in the Portal, and have paywalled pages gate on plan. Then a one-paragraph description of the loop working: clicking Upgrade opens hosted Checkout; paying `4242 4242 4242 4242` lands on `/billing/success` showing "Finalizing your subscription…" then "You are all set" / "Your plan is now pro" as the entitlement panel flips; the Portal opens in a new tab and a cancel-at-period-end surfaces `cancelAtPeriodEnd: true`; `/inspector/pro-only` shows the upgrade fallback before, the content after. Brief the `Screenshot` (or short description) of the success page mid-poll and the entitlement panel post-flip; do not over-invest — prose carries it.

### Your mission

Prose-only, no subsection headers, no implementation hints. Weave:

- **Feature** (user terms): three billing methods that let an admin start a paid subscription, manage it, and gate Pro-only surfaces.
- **Constraints** that shape the solution (the senior content):
  - `lib/billing/` is the single place `import Stripe from 'stripe'` appears (re-exported through `lib/billing/stripe.ts`); every other call site reads the entitlement row or calls one of the three methods. State this is a *convention held by re-export + review*, not a lint rule.
  - Actions vs gate split: `upgrade`/`openPortal` are `authedAction('admin', …)` mutations returning `Result<{ url }>`; `requirePlan` is `import 'server-only'` (not `'use server'`), Server-Component-callable, and *throws* `BillingError` rather than returning `Result` — because gates rely on `error.tsx` while actions return `Result`. Forgetting `requirePlan` on a paywalled component is the same audit class as forgetting `authedAction`.
  - The one genuine cross-system write: lazy Customer creation in `upgrade` must do the Stripe-side `customers.create` *before* the local `setStripeCustomerId` — an orphan-but-duplicate Customer on retry is fixable, a local pointer to a non-existent Customer is not. Name the production hardening (idempotency key on `customers.create`) without building it.
  - `organization_id` set on both Customer `metadata` and `subscription_data.metadata` — the carry-channel the webhook reads back off `sub.metadata` (lesson 4). Checkout opts: `trial_period_days: 14`, `payment_method_collection: 'always'` (collect card at trial start so the trial-end downgrade dance never happens), `allow_promotion_codes: false` as the conservative default. Price resolved from catalog `lookup_key` via `stripe.prices.list`, never a hardcoded `price_id`.
  - The success URL carries `{CHECKOUT_SESSION_ID}` but the success page never calls `sessions.retrieve` — webhook owns writes, page reads-and-polls; structurally cleaner than trusting `session_id`.
  - Portal opens in a new tab (`window.open`) so its `return_url` navigation does not fight the SPA back button; `STRIPE_PORTAL_RETURN_URL` is a default the action overrides via `returnPath`.
- **Out of scope:** any `cancel`/`changePlan` method — the Portal owns user-initiated mutations (lesson 6 of chapter 064); wrapping more "for symmetry" is the named failure mode. The interface stays at exactly three methods. The forged-metadata cross-check is lesson 6.

Then the **functional requirements** checklist (the only list). Phrase each as a verifiable user outcome, never a file/export. Tag each `[tested]`/`[untested]`:

1. Clicking "Upgrade to Pro" opens Stripe-hosted Checkout; paying with `4242 4242 4242 4242` lands on `/billing/success`, which shows "Finalizing your subscription…" then "You are all set" / "Your plan is now pro" as the entitlement flips. `[untested]` (full Stripe round-trip; manual checklist)
2. A first-time upgrade creates the Stripe Customer and persists `stripeCustomerId` on the org; the inspector header shows the id populated where it was null before. `[untested]` (Stripe round-trip; manual)
3. `upgrade` returns a `Result.ok` carrying a Checkout `url` for a valid plan, and resolves the Price from the catalog `lookup_key` rather than a hardcoded id. `[tested]` (asserted via a stubbed/mocked Stripe client at the action boundary — see note to test-coder below)
4. `upgrade` for a plan with no configured Price returns `err('not_found', …)`. `[tested]`
5. Clicking "Manage billing" opens the Customer Portal in a new tab; cancelling there returns to the app and the entitlement panel shows `cancelAtPeriodEnd: true` within a moment. `[untested]` (Stripe round-trip; manual)
6. `openPortal` with no Stripe Customer yet returns `err('forbidden', …)` (its `userMessage` sourced from a `BillingError('no_customer')`), and the inspector's Portal button is disabled with its tooltip until a Checkout has run. `[tested]` for the `err('forbidden')` shape; `[untested]` for the button-disabled UI (manual).
7. `requirePlan('pro')` resolves (no throw) when the org's entitlement is active and rank ≥ pro; throws `BillingError('no_access')` when the entitlement is inactive; throws `BillingError('plan_required')` when the tier is too low. `[tested]`
8. `/inspector/pro-only` renders the `error.tsx` fallback ("Upgrade to Pro") before the upgrade, the protected content after, and reverts to the fallback once the subscription is deleted. `[untested]` (renders the provided gate; covered by req 7 at the unit level; manual end-to-end)

Note for the test-coder: requirements 1, 2, 5 are full Stripe-hosted round-trips and belong on the manual checklist, not the automated suite. The automated assertions should target the seam behavior the methods own without a live Stripe call — `upgrade`'s Price-resolution/`not_found` branch, `openPortal`'s no-Customer `err('forbidden')` branch, and `requirePlan`'s three dispositions driven by the entitlement row (use the inspector's "Force entitlement status" path or a seeded row to walk active/inactive/low-tier). Where a Stripe SDK call is unavoidable in the path under test, isolate it so the assertion stays on the method's observable Result/throw, not on Stripe.

### Coding time

One line directing the student to implement against the brief + tests before reading. State up front that `BillingError`, the `index.ts` barrel, and `pro-only/error.tsx` ship complete — this lesson only removes their `TODO(L5)` markers; the work is the three method bodies.

Reference implementation, organized as in the repo. Writer wraps in `<details>`. Cover:

- **`lib/billing/upgrade.ts`** — `'use server'`, `authedAction('admin', z.strictObject({ planSlug: z.enum(['pro','team']) }), …)`. Body: `getOrgWithOwnerEmail(ctx.orgId)`; ensure Customer (`stripe.customers.create({ email, metadata: { organization_id } })` then `setStripeCustomerId` — only when `stripeCustomerId` is null); resolve `lookupKey` by reverse-scanning `catalog.lookupKeys` for `planSlug`, `err('not_found', …)` if absent; `stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })`, `err('not_found', …)` if none; `stripe.checkout.sessions.create({ mode: 'subscription', customer, line_items, subscription_data: { metadata, trial_period_days: 14 }, payment_method_collection: 'always', allow_promotion_codes: false, success_url, cancel_url })`; `err('internal', …)` if `!session.url`, else `ok({ url })`. Use `AnnotatedCode` here — direct focus to (a) the ensure-Customer ordering, (b) the `lookup_key` → Price resolution, (c) the metadata + trial Checkout opts. This is the most decision-dense file.
- **`lib/billing/portal.ts`** — `'use server'`, `authedAction('admin', z.strictObject({ returnPath: z.string().optional() }), …)`. No-Customer branch builds a `BillingError('no_customer', …)` and returns `err('forbidden', reason.userMessage)` (note: the inspector already disables the button, so this is belt-and-suspenders; the `BillingError` carries the machine-readable distinction the `Result.userMessage` cannot). Else `stripe.billingPortal.sessions.create({ customer, return_url: returnPath ?? env.STRIPE_PORTAL_RETURN_URL })` → `ok({ url })`. Simple `Code` block.
- **`lib/billing/require-plan.ts`** — `import 'server-only'`, the `PLAN_RANK = { free: 0, pro: 1, team: 2 } as const satisfies Record<PlanSlug, number>` table (note `satisfies` keeps it exhaustive over `PlanSlug`), `requireOrgUser()` → `getEntitlement(orgId)`, `throw BillingError('no_access', …)` if `!hasActiveAccess(e)`, `throw BillingError('plan_required', …)` if `PLAN_RANK[e.plan] < PLAN_RANK[planSlug]`. `Code` block; one callout that this is the load-bearing gate and that it throws (caught by `error.tsx`) rather than returning `Result`.
- **The provided pieces** (show briefly, label as starter-provided, do not re-derive): `billing-error.ts` `code` union (`no_access | plan_required | no_customer | unknown_customer | unknown_plan`), `index.ts` barrel exporting exactly the three methods (no Stripe/BillingError/catalog re-export), and `pro-only/error.tsx` switching on `error.code` (`no_access` → reactivate, else → upgrade; reads `code` off the serialized shape, not `instanceof`, because the prototype is lost across the boundary). Mention the `CheckoutButton` (`window.location.assign`) and `PortalButton` (`window.open`, `disabled` + tooltip when `!hasCustomer`) islands are provided.

**Decision rationale** (one or two sentences each): create-on-Stripe-first ordering and orphan-vs-dangling-pointer trade-off (+ idempotency-key hardening named, not built); why `requirePlan` throws instead of returning `Result`; `payment_method_collection: 'always'` and `allow_promotion_codes: false` as trial-flow defaults; why the success page reads-and-polls instead of trusting `session_id`; why the Portal opens in a new tab; why the interface stays at three methods and the boundary is a convention not a lint rule; the `STRIPE_PORTAL_RETURN_URL`-with-`returnPath`-override shape.

**`[untested]` coverage:** code organization (each method in its own file under `lib/billing/`, re-exported only through the barrel); naming (`upgrade`/`openPortal`/`requirePlan`); error-handling placement (`err` for action-recoverable cases, `throw BillingError` for the gate; no Stripe leak past the directory).

**Callouts** (anything odd at a glance): `requirePlan` uses `import 'server-only'` *not* `'use server'`; the `PortalButton` tooltip wraps a `<span>` because a disabled button fires no pointer events; the success page never imports Stripe.

**Links (don't re-explain):** lesson 6 of chapter 064 (the three-method interface principle + the load-bearing gate), lesson 2 of chapter 064 (Checkout sessions + trials + `success_url`), lesson 3 of chapter 064 (Customer Portal + graceful cancel), chapter 043 (`error.tsx` interop + `Result`/Server Action plumbing).

No diagram — lesson 4 owns the sequence diagram; this lesson's flow is carried by prose and the finished-result figure.

### Moment of truth

Command: `pnpm test:lesson 5`. Show the expected pass output (the suite's pass lines for `upgrade` Price-resolution + `not_found`, `openPortal` no-Customer `err('forbidden')`, `requirePlan` active/inactive/low-tier). Then the manual checklist (`Checklist`/`ChecklistItem`) for the `[untested]` round-trip requirements the suite can't reach: full Upgrade → test-card → success-page flip (req 1), first-time Customer creation + `stripeCustomerId` populated in header (req 2), Portal cancel → `cancelAtPeriodEnd: true` (req 5), Portal button disabled+tooltip when no Customer (req 6 UI half), `/inspector/pro-only` gate-before / content-after / gate-again-after-delete (req 8).

## Scope

- Inbound webhook (verify/claim/project/audit) — built in lessons 2–4 of this chapter; this lesson only consumes the entitlement row it produces.
- The forged-`organization_id` metadata cross-check in `onCheckoutCompleted` — lesson 6 of this chapter.
- User-initiated cancellation / plan-change UI — out of scope project-wide; the Stripe Portal owns it (lesson 3 of chapter 064). No in-house cancel screen.
- Seat enforcement — the `seats` column ships unenforced; the membership gate is Unit 9, the over-seat banner Unit 13.
- The redirect-vs-webhook race resolution lives in the provided success page + `Poller` (lesson 3 of chapter 063 pattern); this lesson does not re-build it.
