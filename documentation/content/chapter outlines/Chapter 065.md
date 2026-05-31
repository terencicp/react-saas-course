# Chapter 065 — Project: From Stripe webhook to plan entitlement

## Chapter framing

Chapter 065 stitches the webhook discipline from chapter 063 and the Stripe billing model from chapter 064 into one runnable surface: the `/api/webhooks/stripe` route handler that ingests `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` — signature-verified with constant-time compare, deduped via `processed_events`, wrapped in one outer transaction, ordered with a `last_event_at` predicate — and the derived `plan_entitlements` row the app reads on every request.
On the in-bound side the student writes the `billing.*` interface (`upgrade`, `openPortal`, `requirePlan`), wires the inspector's Checkout and Portal buttons through it, and proves the loop end-to-end with `stripe listen` + `stripe trigger` against a local dev URL.

The project is **done when**, against the provided inspector and a test-mode Stripe account:

- `stripe listen` forwards a test checkout to the dev server and the inspector's `processed_events` panel gains one row within a second.
- The derived `plan_entitlements` row reflects the new plan after the trigger — `plan: 'pro'`, a populated `subscriptionId`, `currentPeriodEnd` set, `lastEventAt` matching the event's `created`.
- Replaying the same event ID leaves the event landed exactly once: no second `processed_events` row, `plan_entitlements.updatedAt` does not advance, no second `audit_logs` row.
- Out-of-order delivery silently no-ops the older event: the newer values stand and `lastEventAt` does not regress.
- Signature tampering and a missing signature header both return 400 `application/problem+json` with no `processed_events` row and no body parsing.
- The Portal button opens the Stripe customer portal in a new tab, and a cancel-at-period-end there surfaces the new flag on the entitlement panel.
- `billing.requirePlan('pro')` gates a paywalled Server Component — the `error.tsx` fallback before the upgrade, the protected content after.
- The redirect-versus-webhook race resolves cleanly: the success page shows "finalizing" then swaps to "you're on Pro" within a second or two, and falls back to "check your email" if the webhook never lands.
- A forged `subscription_data.metadata.organization_id` cannot write to the wrong org — the handler cross-checks metadata against the Customer's owning org and rejects a mismatch.

Threads that run through every lesson: the webhook is the only writer for `plan_entitlements` — Server Actions, the Portal return, and the Checkout success page all read, never write; the route handler verifies before parsing before logging, returns 400 on signature failure with no body work; the dedup INSERT and the entitlement UPSERT live in one transaction so a crash mid-handler can never leave partial state and a replay never mutates twice; the entitlement UPSERT carries the `last_event_at < event.created` predicate so out-of-order delivery silently no-ops the older event; `lookup_key` is the only stable handle Stripe IDs travel by — `price_id` strings never appear in app code; the `billing.*` interface is the only place `stripe` is imported, every other call site reads the entitlement row or calls one of three exported methods; `hasActiveAccess(entitlement)` and `requirePlan(planSlug)` are the two gate functions, encoded once.
The chapter inherits the chapter framing of chapter 062 — every UPDATE carries tenancy + lifecycle + ordering preconditions in its `WHERE`, zero-rows-affected is the honest no-op.

Scope cuts the project makes, named once here so each lesson can lean on them: test mode only, never a `sk_live_` key; hosted Checkout, no embedded form (lesson 2 of chapter 064); the Portal owns cancellation, no in-house cancel screen (lesson 3 of chapter 064); the three subscription events are enough for the entitlement projection — no `invoice.paid` / `invoice.payment_failed` handling (the past-due banner is a forward reference to chapter 071); the `seats` column ships but seat enforcement is left to Unit 9's membership gate and Unit 13's over-seat banner; plan changes go through the Portal, never `stripe.subscriptions.update` from app code; automatic tax off, no promotion codes, no `incomplete_expired` recovery flow, no webhook-secret-rotation drill (the rotation drill is a forward reference to Unit 16).

### Dependency carry-in

- **From chapter 063 (the webhook discipline):** the canonical handler skeleton (verify → parse → claim → mutate inside one transaction → 200/400), the `processed_events(provider, eventId, eventType, receivedAt)` table with `unique(provider, eventId)`, the `claimEvent(tx, provider, eventId, eventType)` helper, `stripe.webhooks.constructEvent` and the raw-body rule, the `last_event_at` ordering predicate, the 200-on-dedup-hit success path, the `STRIPE_WEBHOOK_SECRET` env entry, the `stripe listen` / `stripe trigger` local loop.
- **From chapter 059 (tenancy + RBAC):** the `organizations` table with `id`, `name`, `ownerId`; the active-org slot in the session; `tenantDb(orgId)`; `authedAction(role, schema, fn)`; the `audit_logs` table and `logAudit(tx, event)` helper. The starter adds an `ownerEmail` getter so `stripe.customers.create({ email })` has something to pass.
- **From chapter 055 (auth + protected routes):** the `proxy.ts` matcher and the session reads in the layout; the `BillingError` subclass (closes the thread from lesson 2 of chapter 009) is added in lesson 5 of chapter 065, the existing `error.tsx` segment renders it.
- **From chapter 043 + chapter 047 (Server Actions):** the canonical Result shape `{ ok: true, data } | { ok: false, error: { code, userMessage } }`, `useActionState` plumbing, Server Action with `'use server'` directive.
- **From chapter 041 (schema):** Drizzle setup, the migration cadence (`drizzle-kit generate` then `db:migrate`), `db.transaction` shape, `ON CONFLICT` upserts.
- **From chapter 050 (Resend):** `sendEmail({ to, subject, react, idempotencyKey })` lives in `/lib/email.ts`; not exercised in this project but referenced when an entitlement change should email the org owner ("forward note — Unit 13 wires the notification").
- **From lesson 1 of chapter 016 (Web Crypto):** HMAC primitives (acknowledged; the project uses `stripe.webhooks.constructEvent`, the lesson notes the hand-rolled path).
- **From chapter 062 (URL state, optional):** the starter's inspector follows the same `/inspector` Server Component shape — the student does not re-derive it.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
.env.example                    # provided: DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY,
                                #           STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PORTAL_RETURN_URL,
                                #           APP_URL
package.json                    # provided: db:migrate, db:seed, seed:stripe, stripe:listen, dev, build
scripts/
  seed.ts                       # provided: two orgs, two users, plan_entitlements free rows
  seed-stripe.ts                # provided: creates Products (free/pro/team) + monthly Prices in the
                                #           student's test-mode account, writes their lookup_keys to
                                #           lib/billing/catalog.json
src/
  db/
    schema.ts                   # provided: organizations (+ stripeCustomerId), users, org_members,
                                #           audit_logs, processed_events (full from lesson 2 of chapter 063),
                                #           plan_entitlements stub — TODO student adds columns in lesson 4 of chapter 065
    client.ts                   # provided
    relations.ts                # provided
  lib/
    tenant-db.ts                # provided
    authed-action.ts            # provided
    audit-log.ts                # provided
    email.ts                    # provided (Unit 7)
    logger.ts                   # provided: structured Pino logger (Chapter 092)
    webhooks/
      stripe.ts                 # TODO student: verifyStripeEvent + handler dispatch
      processed-events.ts       # provided: claimEvent(tx, provider, eventId, eventType) from lesson 2 of chapter 063
    billing/
      stripe.ts                 # provided: configured Stripe SDK singleton (server-only)
      catalog.json              # populated by seed-stripe.ts: lookup_key → planSlug mapping
      catalog.ts                # provided: typed loader for catalog.json with z.parse
      entitlement.ts            # TODO student: getEntitlement(orgId), hasActiveAccess(e), planFromLookupKey
      projection.ts             # TODO student: subscriptionToEntitlement(subscription) — EntitlementPatch + PlanSlug types provided
      upgrade.ts                # TODO student: billing.upgrade action
      portal.ts                 # TODO student: billing.openPortal action
      require-plan.ts           # TODO student: billing.requirePlan gate
      errors.ts                 # TODO student: BillingError subclass
      index.ts                  # TODO student: re-export the three methods + types
  app/
    api/
      webhooks/
        stripe/
          route.ts              # TODO student: the POST handler — verify, claim, dispatch, 200/400
    (app)/
      billing/
        page.tsx                # provided shell: renders current plan, "Upgrade" + "Manage billing" buttons
        success/
          page.tsx              # provided: read-and-poll Server Component, refreshes via Client poller
        success/Poller.tsx      # provided: 500ms router.refresh, 30s budget, "finalizing" → "ready"
    inspector/
      page.tsx                  # provided: plan_entitlements panel, processed_events tail, Checkout/Portal
                                #           buttons, "Replay last event" debug, "Tamper signature" debug,
                                #           "Missing header" / "Force older event" / "Forge metadata" /
                                #           "Force entitlement status" debugs
      pro-only/
        page.tsx                # provided: calls billing.requirePlan('pro') at the top, renders gated content
```

### Reference solution signatures lessons display

- **The webhook route** (`app/api/webhooks/stripe/route.ts`):
  - `export async function POST(request: Request)` — reads `await request.text()` once, reads `request.headers.get('stripe-signature')`, calls `stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)`, returns `400 application/problem+json` on `Stripe.errors.StripeSignatureVerificationError`.
  - On success, opens `db.transaction(async (tx) => { const claimed = await claimEvent(tx, 'stripe', event.id, event.type); if (!claimed) return; await dispatch(tx, event); })`, returns `Response.json({ received: true }, { status: 200 })`.
- **The dispatch** (`lib/webhooks/stripe.ts`):
  - `dispatch(tx, event)` switches on `event.type`, calls `onCheckoutCompleted`, `onSubscriptionUpdated`, or `onSubscriptionDeleted`. Unknown event types log + return.
- **The projection function** (`lib/billing/projection.ts`):
  - `subscriptionToEntitlement(sub: Stripe.Subscription, catalog: Catalog): EntitlementPatch` returns `{ plan, status, subscriptionId, currentPeriodEnd, cancelAtPeriodEnd, seats }`. `plan` resolved via `catalog.planFromLookupKey(sub.items.data[0].price.lookup_key)`.
- **The handlers** (`lib/webhooks/stripe.ts`):
  - `onCheckoutCompleted(tx, event)` — reads `session.customer` (the Stripe Customer ID), reads `session.subscription`, calls `stripe.subscriptions.retrieve(subscriptionId)` once (the one allowed `stripe.*` call inside a handler — names the carve-out), resolves `organizationId` via `session.subscription_data?.metadata?.organization_id` or by reading the `organizations` row with the matching `stripeCustomerId`, UPSERTs `plan_entitlements` from the projection with `last_event_at = event.created`, writes `audit_logs` row `{ action: 'billing.subscription.activated', subjectType: 'subscription', subjectId: subscriptionId, orgId: organizationId, actorUserId: null, payload: { plan } }` via `logAudit(tx, ...)`.
  - `onSubscriptionUpdated(tx, event)` — projects the subscription, UPDATEs `plan_entitlements` with `WHERE organizationId = ? AND (last_event_at IS NULL OR last_event_at < ?)`, writes `audit_logs` `{ action: 'billing.subscription.updated', subjectType: 'subscription', subjectId: subscriptionId, orgId: organizationId, actorUserId: null, payload: { plan, status, cancelAtPeriodEnd } }` via `logAudit(tx, ...)` (only when the UPDATE returns a row).
  - `onSubscriptionDeleted(tx, event)` — UPDATEs `plan_entitlements` to `plan: 'free'`, `status: 'canceled'`, `subscriptionId: null`, same ordering predicate, writes `audit_logs` `{ action: 'billing.subscription.canceled', subjectType: 'subscription', subjectId: subscriptionId, orgId: organizationId, actorUserId: null, payload: {} }` via `logAudit(tx, ...)`.
- **The metadata cross-check** (`lib/webhooks/stripe.ts`):
  - `resolveOrgIdFromCustomer(tx, stripeCustomerId)` reads `organizations.id WHERE stripeCustomerId = ?`; throws `BillingError('UNKNOWN_CUSTOMER')` if not found. `onCheckoutCompleted` cross-checks `session.subscription_data?.metadata?.organization_id` against this resolved org and rejects (log + 500) on mismatch.
- **The `plan_entitlements` schema** (`db/schema.ts`):
  - `organizationId uuid pk references organizations(id) on delete cascade`, `plan text not null default 'free'` (`'free' | 'pro' | 'team'`), `status text not null default 'active'`, `subscriptionId text` nullable, `currentPeriodEnd timestamptz` nullable, `cancelAtPeriodEnd boolean not null default false`, `seats integer not null default 1`, `lastEventAt timestamptz` nullable, `updatedAt timestamptz not null default now()`. Free row inserted at org creation by a trigger or by the org creation flow (the starter wires the latter).
- **`getEntitlement(orgId)`** (`lib/billing/entitlement.ts`):
  - `getEntitlement(orgId: string): Promise<PlanEntitlement>` — `React.cache`-wrapped to dedupe within a request; throws if the row is missing (should never happen).
  - `hasActiveAccess(e: PlanEntitlement): boolean` — encodes the decision table from lesson 5 of chapter 064.
- **`billing.upgrade`** (`lib/billing/upgrade.ts`):
  - `upgrade = authedAction('admin', z.strictObject({ planSlug: z.enum(['pro', 'team']) }), async ({ planSlug }, ctx) => ...): Promise<Result<{ url: string }>>`. Ensures Customer, creates `checkout.session`, returns `{ url }`.
- **`billing.openPortal`** (`lib/billing/portal.ts`):
  - `openPortal = authedAction('admin', z.strictObject({ returnPath: z.string().optional() }), async ({ returnPath }, ctx) => ...): Promise<Result<{ url: string }>>`. Errors if `stripeCustomerId` is null with `BillingError('NO_CUSTOMER')`.
- **`billing.requirePlan`** (`lib/billing/require-plan.ts`):
  - `requirePlan(planSlug: 'pro' | 'team'): Promise<void>` — reads the active org's entitlement, throws `BillingError('PLAN_REQUIRED' | 'NO_ACCESS')` if the tier is insufficient or `hasActiveAccess` is false. Server-Component-callable; not an action.
- **Env entries** (`.env.example`):
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...` (from `stripe listen` output locally)
  - `STRIPE_PORTAL_RETURN_URL=http://localhost:3000/billing`
  - `APP_URL=http://localhost:3000` (used for Checkout `success_url`/`cancel_url`)

### Inspector page spec

A single Server Component at `/inspector` providing the verification surface for every later lesson:

- **Header:** active-org switcher (two seeded orgs), session-user switcher (admin / member), the current org's `stripeCustomerId` rendered raw (null until first Checkout).
- **`plan_entitlements` panel:** the full row for the active org — `plan`, `status`, `subscriptionId`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `seats`, `lastEventAt`, `updatedAt`. Updates after every webhook landing via `router.refresh` polling at 1s while the success-page loop is open.
- **`processed_events` tail:** the last 20 rows for `provider='stripe'`, newest first. Each row shows `eventId`, `eventType`, `receivedAt`. The student watches rows land here in real time as `stripe trigger` fires.
- **Checkout button:** calls `billing.upgrade('pro')`, redirects to the returned URL. The "Upgrade to Team" button calls `billing.upgrade('team')`.
- **Portal button:** calls `billing.openPortal()`, opens the returned URL in a new tab. Disabled (with tooltip "No Stripe Customer yet — start a Checkout first") when `stripeCustomerId` is null.
- **"Replay last event" debug:** re-fires the last claimed event by re-POSTing the original raw body and signature to the local webhook URL via the Stripe CLI (`stripe events resend <event_id>`). Used to prove idempotency.
- **"Tamper signature" debug:** sends a forged POST to `/api/webhooks/stripe` with a body but an invalid `stripe-signature` header; the panel shows the 400 + problem+json response.
- **"Missing header" debug:** sends a POST with a body and no `stripe-signature` header at all; the panel shows the same 400.
- **"Force older event" debug:** re-fires a `customer.subscription.updated`-shaped event with a hand-rolled `created` value 60 seconds before the row's `lastEventAt`, to exercise the ordering predicate.
- **"Forge metadata" debug:** fires a Checkout event whose `subscription_data.metadata.organization_id` points at an org other than the one owning the Customer, to exercise the cross-check.
- **"Force entitlement status" debug:** writes a chosen `status` onto the active org's entitlement row directly so the gate function can be walked through all eight statuses without Stripe round-trips.
- **Audit-log tail:** the last 20 `audit_logs` rows for the active org. Every successful entitlement transition writes one.

The inspector is provided in full; the student writes only the handlers and the `billing.*` methods it exercises.

### Concepts demonstrated → owning lesson

- Signature verification at the route handler boundary, raw body via `request.text()`, constant-time compare via `stripe.webhooks.constructEvent`, 400 with RFC 9457 on failure — lesson 1 of chapter 063.
- `processed_events(provider, eventId)` composite unique, atomic `INSERT ... ON CONFLICT DO NOTHING RETURNING` as check-and-claim — lesson 2 of chapter 063.
- Outer transaction wrapping dedup INSERT and business work, partial-state impossibility, 200-on-dedup-hit success path — lesson 2 of chapter 063.
- Out-of-order events and the `last_event_at < event.created` predicate in the UPDATE WHERE, UPDATE-RETURNING to detect no-op — lesson 3 of chapter 063.
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
- **Out-bound (the interface):** the inspector's buttons → `billing.upgrade` / `billing.openPortal` (Server Actions) → Stripe-hosted Checkout / Portal → redirect back. `billing.requirePlan` gates Server Components by reading the entitlement row.
- **The contract between them:** the webhook is the only writer for `plan_entitlements`; every other surface reads. `subscription_data.metadata.organization_id` is the carry-channel from Checkout to webhook; the `stripeCustomerId` reverse lookup is the safety net and cross-check.

### Starting file tree

See the annotated starter file tree in the Chapter framing above — the TODO-marked files are the focus: the webhook route handler, `lib/webhooks/stripe.ts`, the four `lib/billing/` stubs (`projection.ts`, `entitlement.ts`, `upgrade.ts`, `portal.ts`, `require-plan.ts`, `errors.ts`, `index.ts`), and the `plan_entitlements` schema stub.
Everything else — the SDK singleton, the claim helper, the catalog loader, the inspector, the success page and poller, the seeds — is provided.
The starter's `billing/stripe.ts` is the only file that may import `stripe`; the SDK singleton is configured there with `apiVersion` pinned, `STRIPE_SECRET_KEY` from the typed env, and `typescript: true`.
The catalog loader exposes `planFromLookupKey(key) → 'free' | 'pro' | 'team' | null` — the projection function's only path from Stripe-side IDs to app-side plan slugs — over the `{ "lookup_keys": { "course_pro_monthly": "pro", "course_team_monthly": "team" } }` that `seed:stripe` writes.
The provided `lib/webhooks/processed-events.ts` exports `claimEvent(tx, provider, eventId, eventType)` from lesson 2 of chapter 063, returning `boolean` (true = claimed, false = already processed) — the seam every webhook handler in the codebase shares.
The provided success page reads the entitlement and renders the `Poller` Client Component (`router.refresh()` every 500ms, 30s budget) when the entitlement looks stale relative to the `session_id` — the resolution of the redirect-versus-webhook race from lesson 3 of chapter 063.

### Roadmap

- **Lesson 2 — Verify before you parse.** Lands the route handler's read-raw-body, `constructEvent`, and 400-with-problem+json verification skeleton with structured logging on every disposition.
- **Lesson 3 — Claim the event inside one transaction.** Wraps the post-verify path in `db.transaction`, dedupes against `processed_events`, and stubs the dispatch switch.
- **Lesson 4 — Project three events into one entitlement row.** Completes the `plan_entitlements` schema, writes the pure projection, and lands the three handlers with the ordering predicate and audit logs.
- **Lesson 5 — Ship the three-method billing interface.** Implements `upgrade`, `openPortal`, and `requirePlan`, wires the Checkout and Portal buttons, and exercises the Stripe-hosted flow end-to-end with a test card.
- **Lesson 6 — Harden the webhook against forged tenancy.** Adds the metadata cross-check so a forged `organization_id` cannot write to the wrong org.

### Setup

Run these once, in order:

1. `npx degit <starter-repo> stripe-entitlements` — clone the starter.
2. `pnpm install` — installs dependencies; expect a clean install with no peer warnings.
3. `brew install stripe/stripe-cli/stripe` — installs the Stripe CLI (the project's local webhook tunnel and event trigger).
4. `stripe login` — opens the browser to authorize the CLI against the student's Stripe account; expect "Done! The Stripe CLI is configured."
5. `cp .env.example .env.local` and paste the test-mode keys (see the env list below).
6. `docker compose up -d` — starts Postgres 18; expect the container healthy.
7. `pnpm db:migrate && pnpm db:seed` — applies migrations and seeds two orgs, two users, and a `'free'` `plan_entitlements` row each.
8. `pnpm seed:stripe` — creates the free/pro/team Products and monthly Prices in the student's test-mode account and writes their `lookup_key`s to `lib/billing/catalog.json`; re-running is idempotent (find-or-create by `lookup_key`). Run this once before the project works.
9. `pnpm dev` — starts the app.
10. In a second terminal, `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — prints the local webhook signing secret. Paste it into `.env.local` as `STRIPE_WEBHOOK_SECRET` and restart `pnpm dev` so the env reloads. Keep this terminal running for the rest of the project.

Env vars (`.env.local`):

- `STRIPE_SECRET_KEY` — the test-mode secret key (`sk_test_...`), from the Stripe Dashboard → Developers → API keys in **test mode**. Server-only; never paste a `sk_live_` key here — the typed env validates the `sk_test_` prefix at boot.
- `STRIPE_WEBHOOK_SECRET` — the local signing secret (`whsec_...`) printed by `stripe listen`. Different on every fresh CLI session and from the dashboard-configured production secret; re-paste each time the CLI restarts.
- `STRIPE_PORTAL_RETURN_URL` — `http://localhost:3000/billing`, the Portal's return navigation target.
- `APP_URL` — `http://localhost:3000`, used for Checkout `success_url` / `cancel_url`.
- existing `DATABASE_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY` from prior projects.

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
`stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)` encapsulates the timestamp parse, the HMAC compute, the constant-time compare, and the 5-minute tolerance; it throws `Stripe.errors.StripeSignatureVerificationError` on failure, and that `instanceof` check is the discrimination — any other thrown error is a genuine 500, not a 400.
The constraint that shapes everything else: never read the body twice (calling `request.json()` after `request.text()` consumes the stream and returns empty — the canonical chapter 063 bug), never log the body before verification (attacker-controlled strings in a structured log are a log-injection vector), and answer 400 rather than 401 on a bad signature so Stripe treats the delivery as terminal instead of retrying.
A missing signature header and a wrong signature are the same answer — the signature is the contract.
The route runs on the Node runtime (the Stripe SDK is Node-only; the starter pins `export const runtime = 'nodejs'`), and the structured logger from chapter 092 (provided as `lib/logger.ts`) records every disposition so 2am debugging can filter by event id.
Out of scope this lesson: claiming the event, the dispatch switch, and any DB write — those land next; the `problemJson(status, title)` helper either ships in the starter (from chapter 046) or is added here returning `application/problem+json` with no body echo and no detail leakage.

- A valid `stripe trigger checkout.session.completed` returns 200 and the structured log carries one line with the event id, event type, and disposition `verified`.
- The inspector's "Tamper signature" debug returns 400 `application/problem+json` with `title: 'invalid_signature'`, and the inspector's debug panel renders the 400 status and body inline.
- A POST with no `stripe-signature` header (the inspector's "Missing header" debug or `curl`) returns the same 400 `invalid_signature` — disposition `missing_header` in the log, same answer to the caller.
- No request body is parsed or logged before the signature verifies — the structured log on a tampered request contains no body content.
- The 200 response carries no business effect yet — firing a trigger adds no `processed_events` row.

### Coding time

Implement the route handler against the brief and the lesson's tests, then read the reference solution.

[Reference solution `<details>`: the `POST` handler reading `request.text()` once, the null-check on the header, the `try`/`catch` around `constructEvent` with the `StripeSignatureVerificationError` discrimination, the `problemJson` helper, and the structured-log calls on the `verified` / `invalid_signature` / `missing_header` paths.
Decision rationale to cover: why 400 not 401 (Stripe retries 5xx, treats 4xx as terminal; a 401 misleads operators reading the dashboard's failed-delivery panel); why the body is read once and parsed only after `constructEvent` succeeds (show the broken `request.json()` shape and the fix); why no body logging before verify; why Node runtime over Edge (the SDK is Node-only; lesson 1 of chapter 063 covered the hand-rolled HMAC path Edge would need); why the 5-minute tolerance is left at the SDK default (tightening it produces false-positive `invalid_signature` errors under clock skew that look exactly like an attack).
Link to lesson 1 of chapter 063 for the verification primitives rather than re-explaining.]

---

## Lesson 3 — Claim the event inside one transaction

Wrap the post-verification path in `db.transaction`, claim the event against `processed_events` to dedupe, and stub the dispatch switch so every event type is logged.

The finished route writes one `processed_events` row per first-seen event and none on a replay: firing `stripe trigger checkout.session.completed` lands a row, and the inspector's "Replay last event" re-fires the same `event.id` to a logged `duplicate` and a 200 with `{ duplicate: true }`, leaving the panel at one row.
The `plan_entitlements` panel stays `free` — the handlers are still empty.

### Your mission

Idempotency is structural here, not hopeful: the dedup INSERT and the business work must live in the same `db.transaction`, because claiming outside the transaction and dispatching inside (or the reverse) re-introduces the partial-state bug from lesson 2 of chapter 063 — the claim row commits, the work fails, the next retry sees "already processed" and skips, and the database is left wrong.
`claimEvent(tx, 'stripe', event.id, event.type)` is the provided check-and-claim: it returns `true` when the row is freshly inserted and `false` when the `unique(provider, eventId)` constraint blocked it, and on `false` the handler logs `duplicate` and returns 200 — never a 4xx or 5xx, which would tell Stripe to retry forever.
Every database call inside a handler goes through the transaction handle `tx`, never the global `db`; mis-routing to `db` opens an outer transaction that races the inner one.
The dispatch switch is exhaustive over the events the app acts on, with the `default` case returning 200 after a log (Stripe sends events from dashboard misconfigurations the app never subscribed to; refusing them is just dashboard noise).
Structured logging covers every path — `verified`, `duplicate`, `claimed`, `dispatched`, `unhandled` — each keyed by event id, because the log is the live forensic surface and the inspector's panels are the user-visible one.
Out of scope: the projection and the mutations — the case bodies log and return for now.
Mind the timing budget named here so next lesson's Stripe API call does not look like an accident: Stripe waits 30 seconds for a 2xx, and side effects inside the transaction (a `subscriptions.retrieve`, a Resend send, an R2 upload) hold a DB connection across network IO — the one allowed reach lands next lesson; anything heavier queues to a background job (a forward note to chapter 066).

- Firing `stripe trigger checkout.session.completed` once adds exactly one row to the `processed_events` panel with the event id, `eventType`, and `receivedAt`, and the log shows `verified` then `claimed`.
- The inspector's "Replay last event" (or `stripe events resend <eventId>`) re-delivers the same `event.id`, the panel still shows one row, and the response is 200 with `{ duplicate: true }`.
- A duplicate delivery never returns a 4xx or 5xx — the dedup-hit path is a success path.
- An event type the app does not handle returns 200 and logs disposition `unhandled` with no error.
- Every disposition is logged with its event id; the `plan_entitlements` panel remains `free` because the handlers are still stubs.

### Coding time

Implement the transaction wrapper and dispatch stub against the brief and the tests, then read the reference solution.

[Reference solution `<details>`: the `db.transaction(async (tx) => { ... })` body with the `claimEvent` call, the `{ received: true, duplicate: true }` early return on a lost claim, the `dispatch(tx, event)` call, and the dispatch switch in `lib/webhooks/stripe.ts` with the three subscription cases logging-and-returning plus the `default` case.
Decision rationale to cover: why one transaction is one boundary (the partial-state failure mode spelled out); why `tx` not `db` inside handlers; why the `default` returns 200 not 400; why the response carries a `duplicate` flag (operators and the chapter 091 test depend on the shape); the (optional) note that `processed_events.eventType` is stored for observability so an analyst can count event types without a Stripe round-trip.
Link to lesson 2 of chapter 063 for the claim-and-transaction pattern rather than re-explaining.]

---

## Lesson 4 — Project three events into one entitlement row

Complete the `plan_entitlements` schema, write the pure `subscriptionToEntitlement` projection, and land the three handlers with the `last_event_at` ordering predicate and an audit-log write on every transition.

After this lesson the inspector's panel flips through `free → pro → free` as the student fires events: `checkout.session.completed` activates Pro, `customer.subscription.updated` refreshes status and the cancel flag, `customer.subscription.deleted` reverts to free — each with a matching `audit_logs` row, and an out-of-order replay leaving the row untouched.
`billing.upgrade` and `openPortal` still throw, so the Checkout flow is not yet exercisable end-to-end.

### Your mission

This is the heart of the project: the derived view.
The `plan_entitlements` row is computed *from* Stripe's events and read by every request, which is why the webhook is its only writer and why the projection that turns a `Stripe.Subscription` into an `EntitlementPatch` is a pure function — no DB access, no SDK calls — that becomes the unit-test seam in Unit 18.
The projection's only path from Stripe IDs to app plan slugs is `catalog.planFromLookupKey(sub.items.data[0].price.lookup_key)`; an unrecognized `lookup_key` (a Stripe-side seed drift) returns `null`, and the projection throws `BillingError('UNKNOWN_PLAN')` with the offending key so the handler logs and 500s and Stripe retries.
The ordering predicate is the subtle constraint: the `last_event_at < event.created` test lives in the UPDATE's `WHERE`, not in a pre-read, because a read-then-write opens the race from lesson 3 of chapter 063 where two concurrent handlers both believe theirs is newer — the atomic `UPDATE ... WHERE lastEventAt < ?` lets Postgres evaluate the condition under row-lock, and a zero-row result is the honest no-op.
`onCheckoutCompleted` is the one place inside a handler where a single `stripe.subscriptions.retrieve` is allowed (the Checkout event's `subscription` is just an ID); it UPSERTs because the entitlement row might not exist yet, while the other two UPDATE because the row is guaranteed by the time they fire — and `onSubscriptionUpdated` must *not* re-fetch, since its payload is already the full Subscription (re-fetching is the "I copied the Checkout handler" bug).
The audit-log write lives inside the same transaction as the entitlement write, so a logging failure rolls the change back (the chapter 081 discipline, restated not re-taught).
Out of scope: resolving `organizationId` defensively against a forged metadata value — this lesson trusts the metadata carry-channel with the `stripeCustomerId` reverse lookup as the safety net, and the cross-check hardening lands in lesson 6; the `seats` column ships but no enforcement does (the gate is Unit 9, the banner Unit 13).

- Running `drizzle-kit generate` then `db:migrate` adds the full `plan_entitlements` shape (org PK, plan, status, subscriptionId, currentPeriodEnd, cancelAtPeriodEnd, seats, lastEventAt, updatedAt), and the seeded orgs keep their `'free'` row.
- `stripe trigger checkout.session.completed` flips the panel to `plan: 'pro'`, populates `subscriptionId` and `currentPeriodEnd`, sets `lastEventAt` to the event's `created`, and adds a `billing.subscription.activated` audit row.
- `stripe trigger customer.subscription.updated` refreshes `status`, `currentPeriodEnd`, and `cancelAtPeriodEnd` on the existing row and adds a `billing.subscription.updated` audit row.
- `stripe trigger customer.subscription.deleted` reverts the panel to `plan: 'free'`, `status: 'canceled'`, `subscriptionId: null`, and adds a `billing.subscription.canceled` audit row.
- The inspector's "Force older event" debug replays an update with a `created` 60 seconds in the past and the entitlement does not regress — the handler logs `stale_ordering`.
- `getEntitlement(orgId)` returns the active org's row (deduped per request) and `hasActiveAccess(e)` returns the decision-table answer for every subscription status.

### Coding time

Implement the schema, projection, three handlers, and the two entitlement read helpers against the brief and the tests, then read the reference solution.

[Reference solution `<details>`: the `plan_entitlements` table definition; `subscriptionToEntitlement` reading `lookup_key`, `status`, `current_period_end` (×1000 to a `Date`), `cancel_at_period_end`, and `quantity`; the three handlers with the UPSERT vs UPDATE asymmetry, the `WHERE ... (lastEventAt IS NULL OR lastEventAt < ?)` predicate, the UPDATE-RETURNING no-op detection, and the `logAudit(tx, ...)` calls; `getEntitlement` as a `React.cache`-wrapped `tenantDb` read that throws on a missing row; `hasActiveAccess` encoding the lesson-5-of-chapter-064 decision table (`trialing | active | past_due → true`; `canceled` with `cancelAtPeriodEnd` and a future `currentPeriodEnd → true`; `incomplete | incomplete_expired | unpaid → false`).
Include one Mermaid sequence diagram: Checkout → event → claim → project → UPSERT → audit → 200 → inspector poll.
Decision rationale to cover: the single allowed `subscriptions.retrieve` in `onCheckoutCompleted` and why the alternative (waiting for `customer.subscription.created`) introduces a second event; why `onSubscriptionUpdated` does not re-fetch; why the ordering predicate is in the `WHERE` not a pre-read; the UPSERT-vs-UPDATE asymmetry; the `UNKNOWN_PLAN` null-guard trade-off; metadata as the carry-channel with the `stripeCustomerId` reverse lookup as the safety net; why `seats` ships unenforced.
Link to lesson 5 of chapter 064 (decision table), lesson 3 of chapter 063 (ordering), and chapter 081 (audit-in-transaction) rather than re-explaining.]

---

## Lesson 5 — Ship the three-method billing interface

Implement `upgrade`, `openPortal`, and `requirePlan` behind `lib/billing/`, wire the inspector's Checkout and Portal buttons, and exercise the Stripe-hosted flow end-to-end with a test card.

After this lesson the loop the user touches is closed: clicking Upgrade opens Stripe Checkout, paying with the test card lands on the success page that polls until the entitlement flips to Pro, the Portal opens in a new tab and a cancel-at-period-end picks up on the entitlement panel, and `/inspector/pro-only` renders its gate before the upgrade and its content after.
A lint rule blocks any stray `stripe` import outside `lib/billing/**`.

### Your mission

This lesson installs the thin interface that is the only seam through which the app speaks to Stripe — `lib/billing/` is the only place `import Stripe from 'stripe'` appears, and every other call site reads the entitlement row or calls one of three exported methods.
Two of them are `authedAction('admin', ...)` mutations that return the canonical Result and redirect to a Stripe-hosted URL; `requirePlan` is deliberately *not* an action but a Server-Component-callable helper that throws `BillingError`, because actions handle mutations and return Result while gates throw and rely on `error.tsx` — and `requirePlan` is the load-bearing gate every paywalled Server Component calls before any data read (forgetting it is the same audit class as forgetting `authedAction`).
The one genuine cross-system write is the lazy Customer creation in `upgrade`: the Stripe-side create must happen before the local `stripeCustomerId` UPDATE, because a duplicate-but-orphan Customer on retry is fixable while a local pointer to a non-existent Customer is not — the project ships the simpler retry-with-orphan path for clarity and names the production hardening (check for an existing Customer by metadata first).
`subscription_data.metadata.organization_id` is set here — the carry-channel that lets the webhook resolve the org without a DB lookup — alongside `trial_period_days`, `payment_method_collection: 'always'` (collect a card at trial start so the trial-end downgrade dance never happens), and `allow_promotion_codes: false` as the conservative default.
The success URL carries `{CHECKOUT_SESSION_ID}` but the success page never calls `sessions.retrieve` — the webhook owns writes and the page reads-and-polls, which is structurally cleaner than trusting the `session_id`.
Out of scope: any `billing.cancel` or `billing.changePlan` method — the Portal owns user-initiated mutations (lesson 6 of chapter 064), and wrapping more "for symmetry" is the named failure mode; the interface stays at three methods.
The Portal opens in a new tab so its `return_url` navigation does not fight the SPA back button, and `STRIPE_PORTAL_RETURN_URL` is a default the action can override via `returnPath`.

- Clicking "Upgrade to Pro" opens Stripe-hosted Checkout; paying with `4242 4242 4242 4242` lands on `/billing/success`, which shows "finalizing" for a beat and then "you're on Pro" as the entitlement panel flips.
- A first-time upgrade creates the Stripe Customer and persists `stripeCustomerId` on the org; the inspector header shows the id populated where it was null before.
- Clicking "Manage billing" opens the Customer Portal in a new tab; cancelling there returns to the app and the entitlement panel shows `cancelAtPeriodEnd: true` within a moment.
- `billing.openPortal` with no Customer yet returns `{ ok: false, error: { code: 'NO_CUSTOMER' } }` and the inspector's Portal button is disabled with its tooltip until a Checkout has run.
- `/inspector/pro-only` renders the `error.tsx` fallback ("Upgrade to Pro") before the upgrade and the protected content after, and reverts to the fallback once the subscription is deleted.
- A `stripe` import added anywhere outside `lib/billing/**` fails the `no-restricted-imports` lint rule.

### Coding time

Implement the three methods, the `BillingError` class, the `index.ts` re-exports, and the button wiring against the brief and the tests, then read the reference solution.

[Reference solution `<details>`: `BillingError` with its code union and `error.tsx` discrimination; `upgrade` with the ensure-Customer ordering, the catalog Price lookup, and the `checkout.sessions.create` call; `openPortal` with the `NO_CUSTOMER` Result and the `billingPortal.sessions.create` call; `requirePlan` with the `PLAN_TIER` table and the `NO_ACCESS` / `PLAN_REQUIRED` throws; the `index.ts` barrel; the inline Server-Action `<form>` wiring for both buttons; the `error.tsx` `BillingError` switch; the `no-restricted-imports` rule.
Decision rationale to cover: the create-on-Stripe-first ordering and the orphan-vs-dangling-pointer trade-off; why `requirePlan` throws instead of returning Result; `payment_method_collection: 'always'` and `allow_promotion_codes: false` as trial-flow defaults; why the success page reads-and-polls instead of trusting `session_id`; why the Portal opens in a new tab; why the interface stays at three methods; the `STRIPE_PORTAL_RETURN_URL`-with-`returnPath`-override shape.
Link to lesson 6 of chapter 064 (the interface principle and the load-bearing gate), lesson 2 of chapter 064 (Checkout), lesson 3 of chapter 064 (Portal), and chapter 043 (`error.tsx` interop) rather than re-explaining.]

---

## Lesson 6 — Harden the webhook against forged tenancy

Add a cross-check so the webhook cannot be tricked into writing an entitlement to the wrong org: the handler verifies that `subscription_data.metadata.organization_id` matches the org that actually owns the Customer, and rejects a mismatch.

After this lesson the inspector's "Forge metadata" debug — a Checkout event whose metadata points at org B while the Customer belongs to org A — is rejected with a 500 and writes nothing, while a legitimate Checkout still lands cleanly.

### Your mission

The webhook trusts `subscription_data.metadata.organization_id` to route the entitlement, and lesson 4 took that trust at face value with the `stripeCustomerId` reverse lookup only as a fallback — which means a malicious-or-buggy `billing.upgrade` that sets the wrong `organization_id` could write to another tenant's entitlement.
The structural defense is to make the two sources agree: resolve the org from the Customer (`organizations WHERE stripeCustomerId = session.customer`) and cross-check it against the metadata value, treating a mismatch as a hard failure (log + 500) rather than picking a winner.
This is a small refactor on the `resolveOrgIdFromCustomer` path from lesson 4, not new surface area, and it is the chapter's last hardening — surfaced as its own lesson because trusting upstream metadata is exactly the trap an inexperienced dev walks into, and the fix deserves to be confirmed against a concrete probe rather than buried in the projection lesson.
The cross-check belongs only where metadata is read (`onCheckoutCompleted`); the subscription update and delete handlers resolve the org from the entitlement row's own `subscriptionId` and need no metadata trust.
Out of scope: lifting the cross-check to a lint rule and the webhook-secret-rotation drill — both are forward references to Unit 16.

- The inspector's "Forge metadata" debug fires a Checkout event whose `metadata.organization_id` names a different org than the Customer's owner, and the handler rejects it: no `plan_entitlements` write, no `audit_logs` row, a logged mismatch, and a 500 so Stripe surfaces the failure.
- A legitimate Checkout — metadata and Customer owner agree — still flips the entitlement to Pro exactly as before.
- An event for a Stripe Customer the app never created resolves to no org and is rejected the same way, rather than silently creating or mutating a row.

### Coding time

Implement the cross-check against the brief and the tests, then read the reference solution.

[Reference solution `<details>`: the refactored `resolveOrgIdFromCustomer` returning the Customer-owned org, the equality check against `session.subscription_data?.metadata?.organization_id`, and the mismatch rejection path in `onCheckoutCompleted`.
Decision rationale to cover: why a mismatch is a hard failure rather than preferring one source; why the cross-check lives only in the Checkout handler; the trade-off between 500-to-investigate and log-and-200 for an unknown Customer (the project picks reject-loudly here because a mismatch signals either a bug or an attack).
Link to lesson 4 of chapter 065 for the original `resolveOrgIdFromCustomer` and note that Unit 16 lifts this defense to a lint rule rather than re-explaining.]
