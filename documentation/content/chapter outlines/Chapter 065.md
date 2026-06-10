# Chapter 065 — Project: From Stripe webhook to plan entitlement

## Chapter framing

Chapter 065 stitches the webhook discipline from chapter 063 and the Stripe billing model from chapter 064 into one runnable surface: the `/api/webhooks/stripe` route handler that ingests `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` — signature-verified with constant-time compare, deduped via `processed_events`, wrapped in one outer transaction, ordered with a `last_event_at` predicate — and the derived `plan_entitlements` row the app reads on every request.
On the in-bound side the student writes the `billing.*` interface (`upgrade`, `openPortal`, `requirePlan`), wires the inspector's Checkout and Portal buttons through it, and proves the loop end-to-end with `stripe listen` + `stripe trigger` against a local dev URL.

The project is **done when**, against the provided inspector and a test-mode Stripe account:

- `stripe listen` forwards a test checkout to the dev server and the inspector's `processed_events` panel gains one row within a second.
- The derived `plan_entitlements` row reflects the new plan after the trigger — `plan: 'pro'`, a populated `subscriptionId`, `currentPeriodEnd` set, `lastEventAt` set from the event's `created` (as a `Date`).
- Replaying the same event ID leaves the event landed exactly once: no second `processed_events` row, `plan_entitlements.updatedAt` does not advance, no second `audit_logs` row.
- Out-of-order delivery silently no-ops the older event: the newer values stand and `lastEventAt` does not regress.
- Signature tampering and a missing signature header both return 400 `application/problem+json` with no `processed_events` row and no body parsing.
- The Portal button opens the Stripe customer portal in a new tab, and a cancel-at-period-end there surfaces the new flag on the entitlement panel.
- `billing.requirePlan('pro')` gates a paywalled Server Component — the `error.tsx` fallback before the upgrade, the protected content after.
- The redirect-versus-webhook race resolves cleanly: the success page shows "Finalizing your subscription…" then swaps to "You are all set" / "Your plan is now pro" within a second or two as the Poller refreshes.
- A forged `organization_id` in the Subscription's `metadata` cannot write to the wrong org — the handler cross-checks it against the Customer's owning org and rejects a mismatch.

Threads that run through every lesson: the webhook is the only writer for `plan_entitlements` — Server Actions, the Portal return, and the Checkout success page all read, never write; the route handler verifies before parsing before logging, returns 400 on signature failure with no body work; the dedup INSERT and the entitlement UPSERT live in one transaction so a crash mid-handler can never leave partial state and a replay never mutates twice; the entitlement UPSERT/UPDATE carries the `lastEventAt < eventAt` predicate so out-of-order delivery silently no-ops the older event; `lookup_key` is the only stable handle Stripe IDs travel by — `price_id` strings never appear in app code; `lib/billing/` is the only place `stripe` is imported, every other call site reads the entitlement row or calls one of the three exported methods (`upgrade`, `openPortal`, `requirePlan`); `hasActiveAccess(entitlement)` and `requirePlan(planSlug)` are the two gate functions, encoded once.
The chapter inherits the chapter framing of chapter 062 — every UPDATE carries tenancy + lifecycle + ordering preconditions in its `WHERE`, zero-rows-affected is the honest no-op.

Scope cuts the project makes, named once here so each lesson can lean on them: test mode only, never a `sk_live_` key; hosted Checkout, no embedded form (lesson 2 of chapter 064); the Portal owns cancellation, no in-house cancel screen (lesson 3 of chapter 064); the three subscription events are enough for the entitlement projection — no `invoice.paid` / `invoice.payment_failed` handling (the past-due banner is a forward reference to chapter 071); the `seats` column ships but seat enforcement is left to Unit 9's membership gate and Unit 13's over-seat banner; plan changes go through the Portal, never `stripe.subscriptions.update` from app code; automatic tax off, no promotion codes, no `incomplete_expired` recovery flow, no webhook-secret-rotation drill (the rotation drill is a forward reference to Unit 16).

### Dependency carry-in

- **From chapter 063 (the webhook discipline):** the canonical handler skeleton (verify → parse → claim → mutate inside one transaction → 200/400), the `processed_events(provider, eventId, eventType, receivedAt)` table with `unique(provider, eventId)`, the `claimEvent(tx, provider, eventId, eventType)` helper, `stripe.webhooks.constructEvent` and the raw-body rule, the `last_event_at` ordering predicate, the 200-on-dedup-hit success path, the `STRIPE_WEBHOOK_SECRET` env entry, the `stripe listen` / `stripe trigger` local loop.
- **From chapter 059 (tenancy + RBAC):** the Better Auth `organization` table (with `member`/`invitation`); the active org resolved via `requireOrgUser() → { user, orgId, role }`; `tenantDb(orgId)`; `authedAction(role, schema, fn)`; the `audit_logs` table and `logAudit(tx, event)` helper. The starter adds `getOrgWithOwnerEmail(orgId)` (returns `{ id, stripeCustomerId, ownerEmail }`) so `stripe.customers.create({ email })` has something to pass, and `setStripeCustomerId(orgId, customerId)` to persist the Customer pointer.
- **From chapter 055 (auth + protected routes):** the `proxy.ts` matcher and the session reads in the layout; the `BillingError` subclass (closes the thread from lesson 2 of chapter 009) is added in lesson 5 of chapter 065, the existing `error.tsx` segment renders it.
- **From chapter 043 + chapter 047 (Server Actions):** the canonical Result shape `{ ok: true, data } | { ok: false, error: { code, userMessage } }`, `useActionState` plumbing, Server Action with `'use server'` directive.
- **From chapter 041 (schema):** Drizzle setup, the migration cadence (`drizzle-kit generate` then `db:migrate`), `db.transaction` shape, `ON CONFLICT` upserts.
- **From chapter 050 (Resend):** `sendEmail({ to, subject, react, idempotencyKey })` lives in `/lib/email.ts`; not exercised in this project but referenced when an entitlement change should email the org owner ("forward note — Unit 13 wires the notification").
- **From lesson 1 of chapter 016 (Web Crypto):** HMAC primitives (acknowledged; the project uses `stripe.webhooks.constructEvent`, the lesson notes the hand-rolled path).
- **From chapter 062 (URL state, optional):** the starter's inspector follows the same `/inspector` Server Component shape — the student does not re-derive it.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided: three-schema array (schema.ts, schema/auth.ts, audit.ts), snake_case
.env.example                    # provided: DATABASE_URL(+_UNPOOLED), SEED, BETTER_AUTH_SECRET/URL,
                                #           RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO, INVITATION_SIGNING_SECRET,
                                #           STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PORTAL_RETURN_URL,
                                #           APP_URL, NEXT_PUBLIC_APP_NAME/URL
package.json                    # provided: db:generate, db:migrate, db:seed, seed:stripe, stripe:listen, dev, build
scripts/
  seed.ts                       # provided: two orgs (Acme/Globex), four users, one free plan_entitlements row per org
  seed-stripe.ts                # provided: creates pro/team Products + monthly Prices in the student's
                                #           test-mode account, rewrites lib/billing/catalog.json with their lookup_keys
src/
  env.ts                        # provided: t3-env boundary, validates STRIPE_SECRET_KEY sk_test_ prefix at boot
  db/
    schema.ts                   # provided: emailSuppressions, processed_events (full from lesson 2 of chapter 063),
                                #           plan_entitlements stub (PK-only) — TODO student adds columns in lesson 4 of chapter 065
    schema/auth.ts              # provided: Better Auth tables (user, session, organization (+ stripeCustomerId), member, invitation)
    index.ts                    # provided: Drizzle db singleton + Transaction type export
    audit.ts                    # provided: auditLogs table + AuditEvent type
    audit-log.ts                # provided: logAudit(tx, event) writer
    tenant.ts                   # provided: tenantDb(orgId) RLS-scoped client
    queries/
      entitlements.ts           # TODO student: getEntitlement(orgId), hasActiveAccess(e)
      organizations.ts          # provided: getOrgWithOwnerEmail(orgId), setStripeCustomerId(orgId, customerId)
  lib/
    auth.ts                     # provided: requireOrgUser() → {user, orgId, role}
    auth/authed-action.ts       # provided: authedAction(role, schema, fn)
    email.ts                    # provided (Unit 7)
    logger.ts                   # provided: structured Pino logger (Chapter 092)
    problem.ts                  # provided: problemJson() RFC 7807 helper
    result.ts                   # provided: Result<T>, ok(), err()
    webhooks/
      stripe.ts                 # TODO student: dispatch + handlers (onCheckoutCompleted/Updated/Deleted, resolveOrgIdFromCustomer)
      processed-events.ts       # provided: claimEvent(tx, provider, eventId, eventType) from lesson 2 of chapter 063
    billing/
      stripe.ts                 # provided: configured Stripe SDK singleton (apiVersion pinned, server-only) — sole importer of `stripe`
      catalog.json              # rewritten by seed-stripe.ts: lookup_key → planSlug mapping (pro, team)
      catalog.ts                # provided: loadCatalog() typed loader, PlanSlug type
      projection.ts             # TODO student: subscriptionToEntitlement(sub, catalog) — EntitlementPatch + PlanSlug types provided
      upgrade.ts                # TODO student: upgrade action
      portal.ts                 # TODO student: openPortal action
      require-plan.ts           # TODO student: requirePlan gate
      billing-error.ts          # provided class; TODO comment removed in lesson 5 of chapter 065
      index.ts                  # provided barrel (upgrade, openPortal, requirePlan); TODO comment removed in lesson 5
  app/
    api/
      webhooks/
        stripe/
          route.ts              # TODO student: the POST handler — verify, claim, dispatch, 200/400
    (protected)/
      billing/
        success/page.tsx        # provided: read-and-poll Server Component, refreshes via Client poller
        success/Poller.tsx      # provided: 2000ms router.refresh while finalizing, "finalizing" → "you are all set"
      inspector/
        page.tsx                # provided: Header, Entitlement, Events, Audit panels; Checkout/Portal buttons
        actions.ts              # provided: dev-only debugs — switchUser, resetAndReseed, forceEntitlementStatus,
                                #           tamperSignature, missingHeader, replayLastEvent, forceOlderEvent, forgeMetadata
        _data.ts                # provided: getInspectorContext() (cache-deduped)
        pro-only/
          page.tsx              # provided: calls requirePlan('pro') at the top, renders gated content
          error.tsx             # provided: ProOnlyGate, switches on BillingError.code
```

### Reference solution signatures lessons display

- **The webhook route** (`app/api/webhooks/stripe/route.ts`):
  - `export const POST = async (request: Request): Promise<Response>` — reads `await request.text()` once, reads `request.headers.get('stripe-signature')` (a null header is the same 400 as a bad signature), calls `stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)`, returns `400 application/problem+json` on `stripe.errors.StripeSignatureVerificationError`. No `runtime` segment export — Node is the Next 16 default and `cacheComponents` rejects an explicit `runtime`.
  - On success, opens `db.transaction(async (tx) => { const claimed = await claimEvent(tx, 'stripe', event.id, event.type); if (!claimed) { duplicate = true; return; } await dispatch(tx, event); })`, returns `Response.json({ received: true, duplicate }, { status: 200 })`.
- **The dispatch** (`lib/webhooks/stripe.ts`):
  - `dispatch(tx, event)` switches on `event.type`, calls `onCheckoutCompleted`, `onSubscriptionUpdated`, or `onSubscriptionDeleted`. Unknown event types log + return.
- **The projection function** (`lib/billing/projection.ts`):
  - `subscriptionToEntitlement(sub: Stripe.Subscription, catalog: Catalog): EntitlementPatch` where `EntitlementPatch = Pick<PlanEntitlement, 'plan' | 'status' | 'subscriptionId' | 'currentPeriodEnd' | 'cancelAtPeriodEnd' | 'seats'>`. Reads `item = sub.items.data[0]`, resolves `plan` via `catalog.planFromLookupKey(item.price.lookup_key)`, throws `BillingError('unknown_plan')` if the item is missing or the lookup_key is unknown, and reads `currentPeriodEnd = new Date(item.current_period_end * 1000)` (item-level, not the subscription root).
- **The handlers** (`lib/webhooks/stripe.ts`):
  - `onCheckoutCompleted(tx, event)` — reads `session.customer` and `session.subscription` (ids, via an `asId` helper), calls `stripe.subscriptions.retrieve(subscriptionId)` once (the one allowed `stripe.*` call inside a handler — names the carve-out), resolves `organizationId` via `resolveOrgIdFromCustomer(tx, customerId)` (the authoritative Customer→org mapping), reads the carry-channel from `sub.metadata.organization_id` (the retrieved Subscription's metadata — `subscription_data` is a create-only Checkout param, absent from the retrieved Session), UPSERTs `plan_entitlements` from the projection with `lastEventAt = new Date(event.created * 1000)`, writes `audit_logs` row `{ action: 'billing.subscription.activated', subjectType: 'subscription', subjectId: sub.id, organizationId, actorUserId: null, payload: { plan } }` via `logAudit(tx, ...)`.
  - `onSubscriptionUpdated(tx, event)` — projects the subscription (no re-fetch — the payload is the full Subscription), UPDATEs `plan_entitlements` with `WHERE subscriptionId = sub.id AND (lastEventAt IS NULL OR lastEventAt < eventAt)`, writes `audit_logs` `{ action: 'billing.subscription.updated', subjectType: 'subscription', subjectId: sub.id, organizationId, actorUserId: null, payload: { plan, status } }` via `logAudit(tx, ...)` (only when the UPDATE returns a row; otherwise logs `stale_ordering`).
  - `onSubscriptionDeleted(tx, event)` — UPDATEs `plan_entitlements` to `plan: 'free'`, `status: 'canceled'`, `subscriptionId: null`, same `WHERE subscriptionId = sub.id AND (...)` ordering predicate, writes `audit_logs` `{ action: 'billing.subscription.canceled', subjectType: 'subscription', subjectId: sub.id, organizationId, actorUserId: null, payload: { plan: 'free' } }` via `logAudit(tx, ...)`.
- **The metadata cross-check** (`lib/webhooks/stripe.ts`):
  - `resolveOrgIdFromCustomer(tx, stripeCustomerId)` reads `organization.id WHERE stripeCustomerId = ?`; throws `BillingError('unknown_customer')` if not found. This resolved org is authoritative from lesson 4; lesson 6 adds the explicit cross-check in `onCheckoutCompleted` — if `sub.metadata.organization_id` is present and does not equal the resolved org, log `metadata_org_mismatch` and throw `BillingError('unknown_customer')` so the transaction rolls back and the route 500s.
- **The `plan_entitlements` schema** (`db/schema.ts`):
  - `organizationId text pk references organization(id)`, `plan text enum('free','pro','team') not null default 'free'`, `status text enum('trialing','active','past_due','canceled','incomplete') not null default 'active'`, `subscriptionId text` nullable, `currentPeriodEnd timestamptz` nullable, `cancelAtPeriodEnd boolean not null default false`, `seats integer not null default 1`, `lastEventAt timestamptz` nullable, `updatedAt timestamptz not null default now()`. (Better Auth's `organization` id is a `text` PK, so the FK is `text`.) The free row is inserted per org by the seed.
- **`getEntitlement(orgId)`** (`db/queries/entitlements.ts`):
  - `getEntitlement(orgId: string): Promise<PlanEntitlement>` — a `React.cache`-wrapped `db.query.planEntitlements.findFirst` keyed by the org PK (not `tenantDb` — the webhook runs as the BYPASSRLS superuser and the gate reads by PK); throws if the row is missing (should never happen).
  - `hasActiveAccess(e: PlanEntitlement): boolean` — exhaustive switch encoding the decision table from lesson 5 of chapter 064 (`trialing | active | past_due → true`).
  - These live in `db/queries/`, not `lib/billing/` (the chapter 064 lesson 6 placement contract: the billing seam is Stripe calls + the gate; the entitlement read is a data-layer read).
- **`billing.upgrade`** (`lib/billing/upgrade.ts`):
  - `upgrade = authedAction('admin', z.strictObject({ planSlug: z.enum(['pro', 'team']) }), async ({ planSlug }, ctx) => ...): Promise<Result<{ url: string }>>`. Ensures the Customer (Stripe create before `setStripeCustomerId`), resolves the Price by `lookup_key`, creates `checkout.sessions.create` with `subscription_data.metadata.organization_id`, `trial_period_days: 14`, `payment_method_collection: 'always'`, `allow_promotion_codes: false`, `success_url` `${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`, `cancel_url` `${APP_URL}/inspector`; returns `{ url }`.
- **`billing.openPortal`** (`lib/billing/portal.ts`):
  - `openPortal = authedAction('admin', z.strictObject({ returnPath: z.string().optional() }), async ({ returnPath }, ctx) => ...): Promise<Result<{ url: string }>>`. Returns `err('forbidden', ...)` (its `userMessage` taken from a `BillingError('no_customer')`) if `stripeCustomerId` is null; else `billingPortal.sessions.create({ customer, return_url: returnPath ?? env.STRIPE_PORTAL_RETURN_URL })`.
- **`billing.requirePlan`** (`lib/billing/require-plan.ts`):
  - `requirePlan(planSlug: 'pro' | 'team'): Promise<void>` — `import 'server-only'` (not `'use server'`); `requireOrgUser()` → `getEntitlement(orgId)`, throws `BillingError('no_access')` if `!hasActiveAccess`, throws `BillingError('plan_required')` if `PLAN_RANK[e.plan] < PLAN_RANK[planSlug]` (`{ free: 0, pro: 1, team: 2 }`). Server-Component-callable; not an action.
- **Env entries** (`.env.example`, copied to `.env`):
  - `STRIPE_SECRET_KEY=sk_test_...` (the env boundary refuses a non-`sk_test_` key at boot)
  - `STRIPE_WEBHOOK_SECRET=whsec_...` (from `stripe listen` output locally)
  - `STRIPE_PORTAL_RETURN_URL=http://localhost:3000/inspector`
  - `APP_URL=http://localhost:3000` (used for Checkout `success_url`/`cancel_url`)

### Inspector page spec

A Server Component at `/inspector` (under the `(protected)` route group, behind auth) providing the verification surface for every later lesson. It composes `Header`, `Entitlement`, `Events`, and `Audit` panels, each Suspense-wrapped and reading from a `React.cache`-deduped `getInspectorContext()`:

- **Header:** org switcher (two seeded orgs), dev-only acting-user switcher (Alice/Bob/Carol/Dave, swapped via a cookie), the current org's `stripeCustomerId` rendered raw (`null` until first Checkout).
- **`plan_entitlements` panel:** the full row for the active org — `plan`, `status`, `subscriptionId`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `seats`, `lastEventAt`, `updatedAt`. Updates after every webhook landing via `router.refresh` polling at 1s while the success-page loop is open.
- **`processed_events` tail:** the last 20 rows for `provider='stripe'`, newest first. Each row shows `eventId`, `eventType`, `receivedAt`. The student watches rows land here in real time as `stripe trigger` fires.
- **Checkout button:** calls `upgrade({ planSlug: 'pro' })` and navigates to the returned URL with `window.location.assign`. A second button passes `'team'`.
- **Portal button:** calls `openPortal()`, opens the returned URL in a new tab via `window.open`. Disabled (with a tooltip) when `stripeCustomerId` is null (the `hasCustomer` prop is false).
- **"Replay last event" debug:** re-fires the last claimed event by re-POSTing the original raw body and signature to the local webhook URL via the Stripe CLI (`stripe events resend <event_id>`). Used to prove idempotency.
- **"Tamper signature" debug:** sends a forged POST to `/api/webhooks/stripe` with a body but an invalid `stripe-signature` header; the panel shows the 400 + problem+json response.
- **"Missing header" debug:** sends a POST with a body and no `stripe-signature` header at all; the panel shows the same 400.
- **"Force older event" debug:** re-fires a `customer.subscription.updated`-shaped event with a hand-rolled `created` value 60 seconds before the row's `lastEventAt`, to exercise the ordering predicate.
- **"Forge metadata" debug:** fires a Checkout event whose Subscription `metadata.organization_id` points at an org other than the one owning the Customer, to exercise the cross-check.
- **"Force entitlement status" debug:** writes a chosen `status` onto the active org's entitlement row directly so the gate function can be walked through all five stored statuses (`trialing`, `active`, `past_due`, `canceled`, `incomplete`) without Stripe round-trips.
- **Audit-log tail:** the last 20 `audit_logs` rows for the active org. Every successful entitlement transition writes one.

The inspector is provided in full; the student writes only the handlers and the `billing.*` methods it exercises.

### Concepts demonstrated → owning lesson

- Signature verification at the route handler boundary, raw body via `request.text()`, constant-time compare via `stripe.webhooks.constructEvent`, 400 with RFC 9457 on failure — lesson 1 of chapter 063.
- `processed_events(provider, eventId)` composite unique, atomic `INSERT ... ON CONFLICT DO NOTHING RETURNING` as check-and-claim — lesson 2 of chapter 063.
- Outer transaction wrapping dedup INSERT and business work, partial-state impossibility, 200-on-dedup-hit success path — lesson 2 of chapter 063.
- Out-of-order events and the `lastEventAt < eventAt` predicate in the UPDATE WHERE, UPDATE-RETURNING to detect no-op — lesson 3 of chapter 063.
- Redirect-versus-webhook race, the webhook as the only writer for entitlement state, success page reads-and-polls via `router.refresh` — lesson 3 of chapter 063.
- Idempotency as a unifying discipline: the same unique-on-key pattern across webhooks, Server Actions, and retried jobs — lesson 4 of chapter 063.
- The Stripe object graph — Products, Prices (`lookup_key` not `price_id`), Customers (one per org), Subscriptions, metadata as the carry-channel for `organization_id` — lesson 1 of chapter 064.
- Checkout sessions — server-created single-use URL, hosted-vs-embedded default, lazy Customer creation, trials, `success_url` polling — lesson 2 of chapter 064.
- Customer Portal — `cancel_at_period_end` graceful cancel, deep-link flows, return URL as navigation hint not state-change proof — lesson 3 of chapter 064.
- `plan_entitlements` as a derived view, webhook-only writes, one row per org, `lookup_key` mapping to plan slug — lesson 4 of chapter 064.
- Subscription status as first-class state, `hasActiveAccess(e)` as the single decision-table function — lesson 5 of chapter 064.
- `billing.upgrade` / `openPortal` / `requirePlan` interface, `/lib/billing/` as the only place `stripe` is imported, `requirePlan` as the load-bearing gate — lesson 6 of chapter 064.
- `authedAction(role, schema, fn)` at the Server Action seam — lesson 2 of chapter 057.
- `tenantDb(orgId)` for org-scoped reads — chapter 056.
- `audit_logs` append-only on every privileged transition — chapter 059.
- Custom `BillingError` Error subclass and `error.tsx` interop — lesson 2 of chapter 009, chapter 043.
- Structured logging keyed by event id, verify-before-log discipline — lesson 2 of chapter 092.

---

## Lesson 1 — Project Overview

The student leaves with the starter cloned and running: Postgres up, schema migrated and seeded, the Stripe test-mode catalog created, the Stripe CLI tunnel forwarding to the dev server, and the inspector showing `plan: 'free'` for the active org with a disabled Portal button.
No webhook logic exists yet — a `stripe trigger` would 404 — and that is the starting line the implementation lessons build from.

This project ingests three Stripe webhooks, projects them into one `plan_entitlements` row per org, exposes three methods (`upgrade`, `openPortal`, `requirePlan`) behind `/lib/billing/`, and proves the loop with `stripe listen` + `stripe trigger`.
A single figure shows the finished inspector: the entitlement panel reading `plan: 'pro'`, the `processed_events` tail with one row, the Portal button enabled, plus a short animated capture of the end UX — clicking Upgrade through Stripe test-card checkout to the success page flipping to Pro, the Portal cancel-at-period-end picking up the new flag, and the "Tamper signature" debug returning 400.

### What we'll practice

The webhook seam is the production async edge of every modern SaaS — and the careless code is the most expensive code in the codebase.
This project practices the discipline that makes the seam safe: verify-then-claim-then-mutate inside one transaction, the `last_event_at` ordering predicate, the single-writer rule for derived state, the derived-view projection, and the thin interface that earns wrapping around an SDK.
These patterns carry into every async ingest the student writes next — payment webhooks, email-bounce webhooks, third-party callbacks, internal event buses.
The starter already ships the webhook claim helper and the Stripe SDK singleton; the chapter 063 discipline is carry-in, not something the student re-derives — this project is its application to one real third-party.

### Architecture

The shape of the loop, named here and built across the lessons:

- **In-bound (the webhook):** Stripe → `POST /api/webhooks/stripe` → verify signature → claim in `processed_events` → dispatch by event type → project the Subscription → UPSERT/UPDATE `plan_entitlements` → write `audit_logs` → 200. All DB work inside one `db.transaction`.
- **Out-bound (the interface):** the inspector's buttons → `upgrade` / `openPortal` (Server Actions) → Stripe-hosted Checkout / Portal → navigate back. `requirePlan` gates Server Components by reading the entitlement row.
- **The contract between them:** the webhook is the only writer for `plan_entitlements`; every other surface reads. The Subscription's `metadata.organization_id` is the carry-channel from Checkout to webhook; the `stripeCustomerId` reverse lookup (`resolveOrgIdFromCustomer`) is the authoritative resolver and cross-check.

### Starting file tree

See the annotated starter file tree in the Chapter framing above — the TODO-marked files are the focus: the webhook route handler, `lib/webhooks/stripe.ts`, the three `lib/billing/` stubs (`projection.ts`, `upgrade.ts`, `portal.ts`, `require-plan.ts`), the `db/queries/entitlements.ts` read helpers, and the `plan_entitlements` schema stub.
Everything else — the SDK singleton, the claim helper, the catalog loader, `billing-error.ts`, the `index.ts` barrel, the inspector, the success page and poller, the seeds — is provided.
The starter's `billing/stripe.ts` is the only file that may import `stripe`; the SDK singleton is configured there with `apiVersion` pinned (`'2026-05-27.dahlia'`), `STRIPE_SECRET_KEY` from the typed env, and `typescript: true`.
The catalog loader's `planFromLookupKey(key) → 'free' | 'pro' | 'team' | null` is the projection function's only path from Stripe-side IDs to app-side plan slugs, over the `{ "lookup_keys": { "course_pro_monthly": "pro", "course_team_monthly": "team" } }` that `seed:stripe` writes.
The provided `lib/webhooks/processed-events.ts` exports `claimEvent(tx, provider, eventId, eventType)` from lesson 2 of chapter 063, returning `boolean` (true = claimed, false = already processed) — the seam every webhook handler in the codebase shares.
The provided success page reads the entitlement and renders the `Poller` Client Component (`router.refresh()` every 2s while `plan` is still `free`) — the resolution of the redirect-versus-webhook race from lesson 3 of chapter 063.

### Roadmap

- **Lesson 2 — Verify before you parse.** Lands the route handler's read-raw-body, `constructEvent`, and 400-with-problem+json verification skeleton with structured logging on every disposition.
- **Lesson 3 — Claim the event inside one transaction.** Wraps the post-verify path in `db.transaction`, dedupes against `processed_events`, and stubs the dispatch switch.
- **Lesson 4 — Project three events into one entitlement row.** Completes the `plan_entitlements` schema, writes the pure projection, and lands the three handlers with the ordering predicate and audit logs.
- **Lesson 5 — Ship the three-method billing interface.** Implements `upgrade`, `openPortal`, and `requirePlan`, wires the Checkout and Portal buttons, and exercises the Stripe-hosted flow end-to-end with a test card.
- **Lesson 6 — Harden the webhook against forged tenancy.** Adds the metadata cross-check so a forged `organization_id` cannot write to the wrong org.

### Setup

Run these once, in order (the Stripe CLI must already be installed — see the official install docs):

1. `cp .env.example .env`.
2. `docker compose up -d` — starts local Postgres 18; expect the container healthy.
3. `pnpm install` — installs dependencies (`preinstall` enforces pnpm; engines require Node 24).
4. Fill in `.env` (see the env list below): the Better Auth and invitation secrets via `openssl rand -base64 32`, and the Stripe test-mode secret key.
5. `pnpm db:migrate` — applies the 059 migration set plus `processed_events`, the `plan_entitlements` PK stub, and `organization.stripe_customer_id`.
6. `pnpm db:seed` — seeds two orgs (Acme, Globex), four users, and one `'free'` `plan_entitlements` row per org (the org's `stripe_customer_id` stays null — no Stripe round-trip in the seed).
7. `stripe login`, then in a second terminal `pnpm stripe:listen` (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`) — prints the local webhook signing secret. Paste it into `.env` as `STRIPE_WEBHOOK_SECRET`. Keep this terminal running for the rest of the project.
8. `pnpm seed:stripe` — creates the pro/team Products and monthly Prices in the student's test-mode account and rewrites `src/lib/billing/catalog.json` with their `lookup_key`s; re-running is idempotent (find-or-create by `lookup_key`). Run this once before the project works.
9. `pnpm dev` — starts the app (restart it after pasting `STRIPE_WEBHOOK_SECRET` so the env reloads).

Env vars (`.env`):

- `STRIPE_SECRET_KEY` — the test-mode secret key (`sk_test_...`), from the Stripe Dashboard → Developers → API keys in **test mode**. Server-only; never paste a `sk_live_` key here — the typed env (`src/env.ts`) validates the `sk_test_` prefix at boot.
- `STRIPE_WEBHOOK_SECRET` — the local signing secret (`whsec_...`) printed by `stripe listen`. Different on every fresh CLI session and from the dashboard-configured production secret; re-paste each time the CLI restarts.
- `STRIPE_PORTAL_RETURN_URL` — `http://localhost:3000/inspector`, the Portal's return navigation target.
- `APP_URL` — `http://localhost:3000`, used for Checkout `success_url` / `cancel_url`.
- existing `DATABASE_URL`(`_UNPOOLED`), `SEED`, `BETTER_AUTH_SECRET`/`URL`, `INVITATION_SIGNING_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`/`REPLY_TO`, `NEXT_PUBLIC_APP_NAME`/`URL` from prior projects.

**Expected result:** `pnpm dev` shows the inspector at `/inspector` with `plan: 'free'` for the active org and a disabled Portal button.
The `stripe listen` terminal prints `200 OK` or `404` on every forward — it is the live verification that the tunnel is alive.
Firing `stripe trigger checkout.session.completed` now returns 404 (no route logic yet); the next lesson lands the 200.

---

## Lesson 2 — Verify before you parse

Write the webhook route handler's verification skeleton: read the raw body once, verify the Stripe signature with constant-time compare, and answer 400 `application/problem+json` on any failure — all with structured logging on every disposition.

The finished route accepts a `stripe trigger checkout.session.completed` with a logged `verified` disposition and a 200, and rejects both the inspector's "Tamper signature" and "Missing header" debugs with a 400 and a problem+json body the inspector renders inline.
No `processed_events` row appears and no business logic runs yet.

### Your mission

This is the boundary of the webhook seam, and the order of operations is the whole lesson: read the raw request body exactly once with `request.text()`, verify the signature, and only then trust anything in the payload.
`stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)` encapsulates the timestamp parse, the HMAC compute, the constant-time compare, and the 5-minute tolerance; it throws `stripe.errors.StripeSignatureVerificationError` on failure, and that `instanceof` check is the discrimination — any other thrown error is re-thrown (a genuine 500, not a 400).
The constraint that shapes everything else: never read the body twice (calling `request.json()` after `request.text()` consumes the stream and returns empty — the canonical chapter 063 bug), never log the body before verification (attacker-controlled strings in a structured log are a log-injection vector), and answer 400 rather than 401 on a bad signature so Stripe treats the delivery as terminal instead of retrying.
A null `stripe-signature` header is checked first and answered with the same 400 — the signature is the contract.
The route runs on the Node runtime (the Stripe SDK is Node-only), and the starter sets no `runtime` segment export: Node is the Next 16 default, and with `cacheComponents` enabled Next rejects an explicit `runtime` export.
The structured logger from chapter 092 (provided as `lib/logger.ts`, scoped with `logger.child({ seam: 'webhook.stripe' })`) records every disposition so 2am debugging can filter by event id.
Out of scope this lesson: claiming the event, the dispatch switch, and any DB write — those land next; `problemJson(status, title)` ships in the starter as `lib/problem.ts`, returning `application/problem+json` with no body echo and no detail leakage.

- A valid `stripe trigger checkout.session.completed` returns 200 and the structured log carries one line with the event id, event type, and disposition `verified`.
- The inspector's "Tamper signature" debug returns 400 `application/problem+json` with `title: 'invalid_signature'`, and the inspector's debug panel renders the 400 status and body inline.
- A POST with no `stripe-signature` header (the inspector's "Missing header" debug or `curl`) returns the same 400 `invalid_signature` — disposition `missing_header` in the log, same answer to the caller.
- No request body is parsed or logged before the signature verifies — the structured log on a tampered request contains no body content.
- The 200 response carries no business effect yet — firing a trigger adds no `processed_events` row.

### Coding time

Implement the route handler against the brief and the lesson's tests, then read the reference solution.

[Reference solution `<details>`: the `POST` handler reading `request.text()` once, the null-check on the header, the `try`/`catch` around `constructEvent` with the `StripeSignatureVerificationError` discrimination, the `problemJson` helper, and the structured-log calls on the `verified` / `invalid_signature` / `missing_header` paths.
Decision rationale to cover: why 400 not 401 (Stripe retries 5xx, treats 4xx as terminal; a 401 misleads operators reading the dashboard's failed-delivery panel); why the body is read once and parsed only after `constructEvent` succeeds (show the broken `request.json()` shape and the fix); why no body logging before verify; why no `runtime` segment export — Node is the Next 16 default and `cacheComponents` rejects an explicit `runtime` (lesson 1 of chapter 063 covered the hand-rolled HMAC path an Edge runtime would need); why the 5-minute tolerance is left at the SDK default (tightening it produces false-positive `invalid_signature` errors under clock skew that look exactly like an attack).
Link to lesson 1 of chapter 063 for the verification primitives rather than re-explaining.]

---

## Lesson 3 — Claim the event inside one transaction

Wrap the post-verification path in `db.transaction`, claim the event against `processed_events` to dedupe, and stub the dispatch switch so every event type is logged.

The finished route writes one `processed_events` row per first-seen event and none on a replay: firing `stripe trigger checkout.session.completed` lands a row, and the inspector's "Replay last event" re-fires the same `event.id` to a logged `duplicate` and a 200 with `{ received: true, duplicate: true }`, leaving the panel at one row.
The `plan_entitlements` panel stays `free` — the handlers the switch routes to are still `'not implemented'` stubs that land next lesson.

### Your mission

Idempotency is structural here, not hopeful: the dedup INSERT and the business work must live in the same `db.transaction`, because claiming outside the transaction and dispatching inside (or the reverse) re-introduces the partial-state bug from lesson 2 of chapter 063 — the claim row commits, the work fails, the next retry sees "already processed" and skips, and the database is left wrong.
`claimEvent(tx, 'stripe', event.id, event.type)` is the provided check-and-claim: it returns `true` when the row is freshly inserted and `false` when the `unique(provider, eventId)` constraint blocked it (an `onConflictDoNothing` insert), and on `false` the route sets `duplicate = true`, logs `duplicate`, returns from the transaction, and answers 200 below — never a 4xx or 5xx, which would tell Stripe to retry forever.
Every database call inside a handler goes through the transaction handle `tx`, never the global `db`; mis-routing to `db` opens an outer transaction that races the inner one.
The dispatch switch is exhaustive over the three subscription events the app acts on, routing each to its handler, with the `default` case logging `unhandled` and returning (Stripe sends events from dashboard misconfigurations the app never subscribed to; refusing them is just dashboard noise) and a final `dispatched` log on the routed path.
Structured logging covers every path — `verified`, `duplicate`, `claimed`, `dispatched`, `unhandled` — each keyed by event id, because the log is the live forensic surface and the inspector's panels are the user-visible one.
Out of scope: the projection and the mutations — the handlers the switch routes to still throw `'not implemented'` until next lesson.
Mind the timing budget named here so next lesson's Stripe API call does not look like an accident: Stripe waits 30 seconds for a 2xx, and side effects inside the transaction (a `subscriptions.retrieve`, a Resend send, an R2 upload) hold a DB connection across network IO — the one allowed reach lands next lesson; anything heavier queues to a background job (a forward note to chapter 066).

- Firing `stripe trigger checkout.session.completed` once adds exactly one row to the `processed_events` panel with the event id, `eventType`, and `receivedAt`, and the log shows `verified` then `claimed`.
- The inspector's "Replay last event" (or `stripe events resend <eventId>`) re-delivers the same `event.id`, the panel still shows one row, and the response is 200 with `{ received: true, duplicate: true }`.
- A duplicate delivery never returns a 4xx or 5xx — the dedup-hit path is a success path.
- An event type the app does not handle returns 200 and logs disposition `unhandled` with no error.
- Every disposition is logged with its event id; the `plan_entitlements` panel remains `free` because the handlers are still stubs.

### Coding time

Implement the transaction wrapper and dispatch stub against the brief and the tests, then read the reference solution.

[Reference solution `<details>`: the `db.transaction(async (tx) => { ... })` body with the `claimEvent` call, the `duplicate = true` flag + `return` on a lost claim, the `dispatch(tx, event)` call, the route's final `Response.json({ received: true, duplicate }, { status: 200 })`, and the dispatch switch in `lib/webhooks/stripe.ts` routing the three subscription cases to their handlers plus the `default` `unhandled` case.
Decision rationale to cover: why one transaction is one boundary (the partial-state failure mode spelled out); why `tx` not `db` inside handlers; why the `default` returns 200 not 400; why the response carries a `duplicate` flag (operators and the chapter 091 test depend on the shape); the (optional) note that `processed_events.eventType` is stored for observability so an analyst can count event types without a Stripe round-trip.
Link to lesson 2 of chapter 063 for the claim-and-transaction pattern rather than re-explaining.]

---

## Lesson 4 — Project three events into one entitlement row

Complete the `plan_entitlements` schema, write the pure `subscriptionToEntitlement` projection, and land the three handlers with the `last_event_at` ordering predicate and an audit-log write on every transition.

After this lesson the inspector's panel flips through `free → pro → free` as the student fires events: `checkout.session.completed` activates Pro, `customer.subscription.updated` refreshes status and the cancel flag, `customer.subscription.deleted` reverts to free — each with a matching `audit_logs` row, and an out-of-order replay leaving the row untouched.
`upgrade` and `openPortal` still return `err`, so the Checkout flow is not yet exercisable end-to-end.

### Your mission

This is the heart of the project: the derived view.
The `plan_entitlements` row is computed *from* Stripe's events and read by every request, which is why the webhook is its only writer and why the projection that turns a `Stripe.Subscription` into an `EntitlementPatch` is a pure function — no DB access, no SDK calls — that becomes the unit-test seam in Unit 18.
The projection reads `item = sub.items.data[0]` and its only path from Stripe IDs to app plan slugs is `catalog.planFromLookupKey(item.price.lookup_key)`; a missing item or unrecognized `lookup_key` (a Stripe-side seed drift) makes the projection throw `BillingError('unknown_plan')` so the handler 500s and Stripe retries. `currentPeriodEnd` is read item-level (`new Date(item.current_period_end * 1000)`), not from the subscription root.
The ordering predicate is the subtle constraint: the `lastEventAt < eventAt` test lives in the UPDATE's `WHERE` (`eventAt = new Date(event.created * 1000)`), not in a pre-read, because a read-then-write opens the race from lesson 3 of chapter 063 where two concurrent handlers both believe theirs is newer — the atomic `UPDATE ... WHERE (lastEventAt IS NULL OR lastEventAt < ?)` lets Postgres evaluate the condition under row-lock, and a zero-row result is the honest no-op.
`onCheckoutCompleted` is the one place inside a handler where a single `stripe.subscriptions.retrieve` is allowed (the Checkout event's `subscription` is just an ID); it UPSERTs onto the org PK because the entitlement row might not exist yet, while the other two UPDATE keyed by `subscriptionId = sub.id` because the row is guaranteed by the time they fire — and `onSubscriptionUpdated` must *not* re-fetch, since its payload is already the full Subscription (re-fetching is the "I copied the Checkout handler" bug).
The audit-log write lives inside the same transaction as the entitlement write, so a logging failure rolls the change back (the chapter 081 discipline, restated not re-taught).
Org resolution: `onCheckoutCompleted` resolves the org from the Customer via `resolveOrgIdFromCustomer(tx, customerId)` (the authoritative mapping — the app owns the Customer↔org link), while the update/delete handlers resolve the org from the matched row's own `subscriptionId`; the explicit metadata cross-check is lesson 6's hardening.
Out of scope: the cross-check itself (lesson 6); the `seats` column ships but no enforcement does (the gate is Unit 9, the banner Unit 13).

- Running `pnpm db:generate` then `pnpm db:migrate` adds the full `plan_entitlements` shape (org `text` PK, plan, status, subscriptionId, currentPeriodEnd, cancelAtPeriodEnd, seats, lastEventAt, updatedAt) via migration `0010_add_entitlement_columns.sql`, and the seeded orgs keep their `'free'` row.
- `stripe trigger checkout.session.completed` flips the panel to `plan: 'pro'`, populates `subscriptionId` and `currentPeriodEnd`, sets `lastEventAt` from the event's `created` (as a `Date`), and adds a `billing.subscription.activated` audit row.
- `stripe trigger customer.subscription.updated` refreshes `status`, `currentPeriodEnd`, and `cancelAtPeriodEnd` on the existing row and adds a `billing.subscription.updated` audit row.
- `stripe trigger customer.subscription.deleted` reverts the panel to `plan: 'free'`, `status: 'canceled'`, `subscriptionId: null`, and adds a `billing.subscription.canceled` audit row.
- The inspector's "Force older event" debug replays an update with a `created` 60 seconds in the past and the entitlement does not regress — the handler logs `stale_ordering`.
- `getEntitlement(orgId)` returns the active org's row (deduped per request) and `hasActiveAccess(e)` returns the decision-table answer for every subscription status.

### Coding time

Implement the schema, projection, three handlers, and the two entitlement read helpers against the brief and the tests, then read the reference solution.

[Reference solution `<details>`: the `plan_entitlements` table definition (`text` PK FK to `organization.id`, the plan/status enums); `subscriptionToEntitlement` reading `item.price.lookup_key`, `sub.status`, `item.current_period_end` (×1000 to a `Date`), `sub.cancel_at_period_end`, and the seat `quantity`; the three handlers with the UPSERT (org PK) vs UPDATE (`subscriptionId = sub.id`) asymmetry, the `WHERE ... (lastEventAt IS NULL OR lastEventAt < ?)` predicate, the UPDATE-`.returning(...)` no-op detection, and the `logAudit(tx, ...)` calls; `getEntitlement` as a `React.cache`-wrapped `db.query.planEntitlements.findFirst` keyed by the org PK (not `tenantDb`) that throws on a missing row; `hasActiveAccess` encoding the lesson-5-of-chapter-064 decision table (`trialing | active | past_due → true`; `canceled | incomplete → false`, with an exhaustive `never` default — `canceled` always denies, and the wind-down grace window is carried entirely by `active` + `cancelAtPeriodEnd`).
Include one Mermaid sequence diagram: Checkout → event → claim → resolveOrgIdFromCustomer → project → UPSERT → audit → 200 → inspector poll.
Decision rationale to cover: the single allowed `subscriptions.retrieve` in `onCheckoutCompleted` and why the alternative (waiting for `customer.subscription.created`) introduces a second event; why `onSubscriptionUpdated` does not re-fetch; why the ordering predicate is in the `WHERE` not a pre-read; the UPSERT-vs-UPDATE asymmetry; the `unknown_plan` throw trade-off; why `currentPeriodEnd` is item-level; `resolveOrgIdFromCustomer` as the authoritative Customer→org mapping (cross-check is lesson 6); why `seats` ships unenforced.
Link to lesson 5 of chapter 064 (decision table), lesson 3 of chapter 063 (ordering), and chapter 081 (audit-in-transaction) rather than re-explaining.]

---

## Lesson 5 — Ship the three-method billing interface

Implement `upgrade`, `openPortal`, and `requirePlan` behind `lib/billing/`, wire the inspector's Checkout and Portal buttons, and exercise the Stripe-hosted flow end-to-end with a test card.

After this lesson the loop the user touches is closed: clicking Upgrade opens Stripe Checkout, paying with the test card lands on the success page that polls until the entitlement flips to Pro, the Portal opens in a new tab and a cancel-at-period-end picks up on the entitlement panel, and `/inspector/pro-only` renders its gate before the upgrade and its content after.

### Your mission

This lesson installs the thin interface that is the only seam through which the app speaks to Stripe — `lib/billing/` is the only place `import Stripe from 'stripe'` appears (re-exported through `lib/billing/stripe.ts`), and every other call site reads the entitlement row or calls one of three exported methods. (The single-importer boundary is a convention held by the re-export + review, not a lint rule.)
Two of them are `authedAction('admin', ...)` mutations that return the canonical Result with a Stripe-hosted URL the client island navigates to; `requirePlan` is deliberately *not* an action but a `server-only` Server-Component-callable helper that throws `BillingError`, because actions handle mutations and return Result while gates throw and rely on `error.tsx` — and `requirePlan` is the load-bearing gate every paywalled Server Component calls before any data read (forgetting it is the same audit class as forgetting `authedAction`).
The one genuine cross-system write is the lazy Customer creation in `upgrade`: the Stripe-side `customers.create` must happen before the local `setStripeCustomerId`, because a duplicate-but-orphan Customer on retry is fixable while a local pointer to a non-existent Customer is not — the project ships the simpler retry-with-orphan path for clarity and names the production hardening (an idempotency key on `customers.create`).
`organization_id` is set on both the Customer's `metadata` and `subscription_data.metadata` here — the carry-channel the webhook reads back off `sub.metadata` to resolve the org — alongside `trial_period_days: 14`, `payment_method_collection: 'always'` (collect a card at trial start so the trial-end downgrade dance never happens), and `allow_promotion_codes: false` as the conservative default. The Price is resolved from the catalog `lookup_key` via `stripe.prices.list`, never a hardcoded `price_id`.
The success URL carries `{CHECKOUT_SESSION_ID}` but the success page never calls `sessions.retrieve` — the webhook owns writes and the page reads-and-polls, which is structurally cleaner than trusting the `session_id`.
Out of scope: any `cancel` or `changePlan` method — the Portal owns user-initiated mutations (lesson 6 of chapter 064), and wrapping more "for symmetry" is the named failure mode; the interface stays at three methods.
The Portal opens in a new tab (`window.open`) so its `return_url` navigation does not fight the SPA back button, and `STRIPE_PORTAL_RETURN_URL` is a default the action can override via `returnPath`.

- Clicking "Upgrade to Pro" opens Stripe-hosted Checkout; paying with `4242 4242 4242 4242` lands on `/billing/success`, which shows "Finalizing your subscription…" for a beat and then "You are all set" / "Your plan is now pro" as the entitlement panel flips.
- A first-time upgrade creates the Stripe Customer and persists `stripeCustomerId` on the org; the inspector header shows the id populated where it was null before.
- Clicking "Manage billing" opens the Customer Portal in a new tab; cancelling there returns to the app and the entitlement panel shows `cancelAtPeriodEnd: true` within a moment.
- `openPortal` with no Customer yet returns `err('forbidden', ...)` (its `userMessage` sourced from a `BillingError('no_customer')`) and the inspector's Portal button is disabled with its tooltip until a Checkout has run.
- `/inspector/pro-only` renders the `error.tsx` fallback ("Upgrade to Pro") before the upgrade and the protected content after, and reverts to the fallback once the subscription is deleted.

### Coding time

Implement the three methods and wire the Checkout/Portal buttons against the brief and the tests, then read the reference solution. (`BillingError`, the `index.ts` barrel, and `pro-only/error.tsx` ship complete in the starter — this lesson only removes their TODO markers.)

[Reference solution `<details>`: `upgrade` with the ensure-Customer ordering, the catalog `lookup_key` → Price lookup via `prices.list`, and the `checkout.sessions.create` call (mode `subscription`, trial, `payment_method_collection`, `allow_promotion_codes: false`, `success_url`/`cancel_url`); `openPortal` with the no-Customer `err('forbidden', ...)` and the `billingPortal.sessions.create` call; `requirePlan` with the `PLAN_RANK` table and the `no_access` / `plan_required` `BillingError` throws; the provided `BillingError` code union and the provided `error.tsx` `code` switch (`no_access` → reactivate, else → upgrade); the provided `index.ts` barrel; the `CheckoutButton` (`window.location.assign`) and `PortalButton` (`window.open`, disabled when `!hasCustomer`) client islands.
Decision rationale to cover: the create-on-Stripe-first ordering and the orphan-vs-dangling-pointer trade-off; why `requirePlan` throws instead of returning Result; `payment_method_collection: 'always'` and `allow_promotion_codes: false` as trial-flow defaults; why the success page reads-and-polls instead of trusting `session_id`; why the Portal opens in a new tab; why the interface stays at three methods and the boundary is a convention not a lint rule; the `STRIPE_PORTAL_RETURN_URL`-with-`returnPath`-override shape.
Link to lesson 6 of chapter 064 (the interface principle and the load-bearing gate), lesson 2 of chapter 064 (Checkout), lesson 3 of chapter 064 (Portal), and chapter 043 (`error.tsx` interop) rather than re-explaining.]

---

## Lesson 6 — Harden the webhook against forged tenancy

Add a cross-check so the webhook cannot be tricked into writing an entitlement to the wrong org: the handler verifies that the Subscription's `metadata.organization_id` matches the org that actually owns the Customer, and rejects a mismatch.

After this lesson the inspector's "Forge metadata" debug — a Checkout event whose metadata points at org B while the Customer belongs to org A — is rejected with a 500 and writes nothing, while a legitimate Checkout still lands cleanly.

### Your mission

The carry-channel `sub.metadata.organization_id` is attacker-influenceable (a malicious-or-buggy `upgrade` could set the wrong `organization_id`), so it must never be trusted on its own.
Lesson 4 already made `resolveOrgIdFromCustomer(tx, customerId)` the authoritative resolver — the app owns the Customer↔org mapping, so it cannot be forged through the event payload — and this lesson adds the explicit cross-check: read `sub.metadata.organization_id` and, when present, require it to equal the Customer-resolved org; a mismatch is a hard failure (log `metadata_org_mismatch` + throw `BillingError('unknown_customer')`, rolling the transaction back so the route 500s) rather than picking a winner.
This is a small addition on the `onCheckoutCompleted` path from lesson 4, not new surface area, and it is the chapter's last hardening — surfaced as its own lesson because trusting upstream metadata is exactly the trap an inexperienced dev walks into, and the fix deserves to be confirmed against a concrete probe rather than buried in the projection lesson.
The cross-check belongs only where metadata is read (`onCheckoutCompleted`); the subscription update and delete handlers resolve the org from the matched row's own `subscriptionId` and need no metadata trust.
Out of scope: the webhook-secret-rotation drill — a forward reference to Unit 16.

- The inspector's "Forge metadata" debug fires a Checkout event whose `metadata.organization_id` names a different org than the Customer's owner, and the handler rejects it: no `plan_entitlements` write, no `audit_logs` row, a logged `metadata_org_mismatch`, and a 500 so Stripe surfaces the failure.
- A legitimate Checkout — metadata and Customer owner agree (or metadata absent) — still flips the entitlement to Pro exactly as before.
- An event for a Stripe Customer the app never created resolves to no org and is rejected by `resolveOrgIdFromCustomer`'s `BillingError('unknown_customer')` throw, rather than silently creating or mutating a row.

### Coding time

Implement the cross-check against the brief and the tests, then read the reference solution.

[Reference solution `<details>`: the `resolveOrgIdFromCustomer` resolver (already authoritative from lesson 4), the `sub.metadata.organization_id` equality check, and the `metadata_org_mismatch` log + `BillingError('unknown_customer')` throw in `onCheckoutCompleted`.
Decision rationale to cover: why a mismatch is a hard failure rather than preferring one source; why the cross-check lives only in the Checkout handler (the only place metadata is read); why the Customer-resolved org is authoritative and the metadata is only a corroborating signal; the reject-loudly choice for an unknown Customer (a mismatch signals either a bug or an attack).
Link to lesson 4 of chapter 065 for the original `resolveOrgIdFromCustomer` rather than re-explaining.]
