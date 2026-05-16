# Chapter 12.3 — Project: From Stripe webhook to plan entitlement

## Chapter framing

Chapter 12.3 stitches the webhook discipline from 12.1 and the Stripe billing model from 12.2 into one runnable surface: the `/api/webhooks/stripe` route handler that ingests `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` — signature-verified with constant-time compare, deduped via `processed_events`, wrapped in one outer transaction, ordered with a `last_event_at` predicate — and the derived `plan_entitlements` row the app reads on every request. On the in-bound side the student writes the `billing.*` interface (`upgrade`, `openPortal`, `requirePlan`), wires the inspector's Checkout and Portal buttons through it, and proves the loop end-to-end with `stripe listen` + `stripe trigger` against a local dev URL. The chapter ships 1 brief + 1 starter walkthrough + 4 build lessons + 1 verify lesson; each build closes on a runnable state and a deterministic verification step.

Threads that run through every lesson: the webhook is the only writer for `plan_entitlements` — Server Actions, the Portal return, and the Checkout success page all read, never write; the route handler verifies before parsing before logging, returns 400 on signature failure with no body work; the dedup INSERT and the entitlement UPSERT live in one transaction so a crash mid-handler can never leave partial state and a replay never mutates twice; the entitlement UPSERT carries the `last_event_at < event.created` predicate so out-of-order delivery silently no-ops the older event; `lookup_key` is the only stable handle Stripe IDs travel by — `price_id` strings never appear in app code; the `billing.*` interface is the only place `stripe` is imported, every other call site reads the entitlement row or calls one of three exported methods; `hasActiveAccess(entitlement)` and `requirePlan(planSlug)` are the two gate functions, encoded once. The chapter inherits the chapter framing of 11.3 — every UPDATE carries tenancy + lifecycle + ordering preconditions in its `WHERE`, zero-rows-affected is the honest no-op.

### Dependency carry-in

- **From 12.1 (the webhook discipline):** the canonical handler skeleton (verify → parse → claim → mutate inside one transaction → 200/400), the `processed_events(provider, eventId, eventType, receivedAt)` table with `unique(provider, eventId)`, the `claimEvent(tx, provider, eventId, eventType)` helper, `stripe.webhooks.constructEvent` and the raw-body rule, the `last_event_at` ordering predicate, the 200-on-dedup-hit success path, the `STRIPE_WEBHOOK_SECRET` env entry, the `stripe listen` / `stripe trigger` local loop.
- **From 10.4 (tenancy + RBAC):** the `organizations` table with `id`, `name`, `ownerId`; the active-org slot in the session; `tenantDb(orgId)`; `authedAction(role, schema, fn)`; the `audit_logs` table and `logAudit(tx, event)` helper. The starter adds an `ownerEmail` getter so `stripe.customers.create({ email })` has something to pass.
- **From 9.5 (auth + protected routes):** the `proxy.ts` matcher and the session reads in the layout; the `BillingError` subclass (closes the thread from 2.9.2) is added in 12.3.6, the existing `error.tsx` segment renders it.
- **From 7.2 + 7.6 (Server Actions):** the canonical Result shape `{ ok: true, data } | { ok: false, error: { code, userMessage } }`, `useActionState` plumbing, Server Action with `'use server'` directive.
- **From 6.6 (schema):** Drizzle setup, the migration cadence (`drizzle-kit generate` then `db:migrate`), `db.transaction` shape, `ON CONFLICT` upserts.
- **From 8.3 (Resend):** `sendEmail({ to, subject, react, idempotencyKey })` lives in `/lib/email.ts`; not exercised in this project but referenced when an entitlement change should email the org owner ("forward note — Unit 14 wires the notification").
- **From 3.7.1 (Web Crypto):** HMAC primitives (acknowledged; the project uses `stripe.webhooks.constructEvent`, the lesson notes the hand-rolled path).
- **From 11.3 (URL state, optional):** the starter's inspector follows the same `/inspector` Server Component shape — the student does not re-derive it.

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
                                #           audit_logs, processed_events (full from 12.1.2),
                                #           plan_entitlements stub — TODO student adds columns in 12.3.5
    client.ts                   # provided
    relations.ts                # provided
  lib/
    tenant-db.ts                # provided
    authed-action.ts            # provided
    audit-log.ts                # provided
    email.ts                    # provided (Unit 8)
    webhooks/
      stripe.ts                 # TODO student: verifyStripeEvent + handler dispatch
      processed-events.ts       # provided: claimEvent(tx, provider, eventId, eventType) from 12.1.2
    billing/
      stripe.ts                 # provided: configured Stripe SDK singleton (server-only)
      catalog.json              # populated by seed-stripe.ts: lookup_key → planSlug mapping
      catalog.ts                # provided: typed loader for catalog.json with z.parse
      entitlement.ts            # TODO student: getEntitlement(orgId), hasActiveAccess(e), planFromLookupKey
      projection.ts             # TODO student: subscriptionToEntitlement(subscription)
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
                                #           buttons, "Replay last event" debug, "Tamper signature" debug
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
- **The `plan_entitlements` schema** (`db/schema.ts`):
  - `organizationId uuid pk references organizations(id) on delete cascade`, `plan text not null default 'free'` (`'free' | 'pro' | 'team'`), `status text not null default 'active'`, `subscriptionId text` nullable, `currentPeriodEnd timestamptz` nullable, `cancelAtPeriodEnd boolean not null default false`, `seats integer not null default 1`, `lastEventAt timestamptz` nullable, `updatedAt timestamptz not null default now()`. Free row inserted at org creation by a trigger or by the org creation flow (the starter wires the latter).
- **`getEntitlement(orgId)`** (`lib/billing/entitlement.ts`):
  - `getEntitlement(orgId: string): Promise<PlanEntitlement>` — `React.cache`-wrapped to dedupe within a request; throws if the row is missing (should never happen).
  - `hasActiveAccess(e: PlanEntitlement): boolean` — encodes the decision table from 12.2.5.
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
- **"Replay last event" debug:** re-fires the last claimed event by re-POSTing the original raw body and signature to the local webhook URL via the Stripe CLI (`stripe events resend <event_id>`). Used in 12.3.7 to prove idempotency.
- **"Tamper signature" debug:** sends a forged POST to `/api/webhooks/stripe` with a body but an invalid `stripe-signature` header; the panel shows the 400 + problem+json response.
- **Audit-log tail:** the last 20 `audit_logs` rows for the active org. Every successful entitlement transition writes one.

The inspector is provided in full; the student writes only the handlers and the `billing.*` methods it exercises.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| `stripe listen` forwards a test checkout to the dev server | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` prints the secret; paste into `.env.local` as `STRIPE_WEBHOOK_SECRET`; restart dev. `stripe trigger checkout.session.completed` fires; the inspector's `processed_events` panel gains one row within 1s. |
| The inspector panel shows the event landed once even when Stripe retries | Click "Replay last event" in the inspector; CLI resends the same `event.id`; `processed_events` still shows one row; `plan_entitlements.updatedAt` does not advance; `audit_logs` does not gain a second row. |
| The derived `plan_entitlements` row reflects the new plan | Before trigger: row reads `plan: 'free'`, `status: 'active'`, `subscriptionId: null`. After trigger: `plan: 'pro'`, `status: 'trialing' \| 'active'`, `subscriptionId: 'sub_...'`, `currentPeriodEnd` populated, `lastEventAt` matches the event's `created`. |
| Replaying the same event ID does not produce a second `audit_logs` row | After replay, the audit panel's row count is unchanged; the `processed_events` row's `receivedAt` is unchanged (the second attempt lost the claim, no row updated). |
| The portal button opens the Stripe customer portal in a new tab | After a successful Checkout, the inspector's "Portal" button is enabled; clicking opens a `https://billing.stripe.com/p/session/...` URL in a new tab; clicking "Cancel subscription" in the portal returns the user to `STRIPE_PORTAL_RETURN_URL`; the inspector picks up `customer.subscription.updated` with `cancel_at_period_end: true`; the `plan_entitlements` panel shows the new flag. |
| Signature tampering returns 400 | Click the "Tamper signature" debug button; the panel shows `400 application/problem+json` with `title: 'invalid_signature'`; `processed_events` does not gain a row; no body parsing occurred (verifiable in the structured log). |
| Out-of-order delivery silently no-ops the older event | Fire `customer.subscription.updated` twice with hand-crafted `event.created` timestamps via `stripe events resend --idempotency-key <new>` — the newer one lands, then the older one returns 200 but `plan_entitlements.lastEventAt` does not regress and the panel still shows the newer values. |
| `billing.requirePlan('pro')` gates a paywalled Server Component | A provided `/inspector/pro-only` page calls `await billing.requirePlan('pro')`; before the upgrade, it renders the `error.tsx` segment ("Upgrade to Pro to access this"); after the upgrade, it renders the protected content. |
| The redirect-versus-webhook race resolves cleanly | After clicking Checkout, complete the test-card flow; land on `/billing/success?session_id=...`; the page shows "finalizing your subscription"; within 1-2s the poller picks up the new entitlement and the page swaps to "you're on Pro." Disable the webhook handler temporarily and confirm the page sits in "finalizing" until the 30s budget elapses and surfaces "check your email." |

### Concepts demonstrated → owning lesson

- Signature verification at the route handler boundary, raw body via `request.text()`, constant-time compare via `stripe.webhooks.constructEvent`, 400 with RFC 9457 on failure — 12.1.1.
- `processed_events(provider, eventId)` composite unique, atomic `INSERT ... ON CONFLICT DO NOTHING RETURNING` as check-and-claim — 12.1.2.
- Outer transaction wrapping dedup INSERT and business work, partial-state impossibility, 200-on-dedup-hit success path — 12.1.2.
- Out-of-order events and the `last_event_at < event.created` predicate in the UPDATE WHERE, UPDATE-RETURNING to detect no-op — 12.1.3.
- Redirect-versus-webhook race, the webhook as the only writer for entitlement state, success page reads-and-polls via `router.refresh` — 12.1.3.
- Idempotency as a unifying discipline: the same unique-on-key pattern across webhooks, Server Actions, and retried jobs — 12.1.4.
- The Stripe object graph — Products, Prices (`lookup_key` not `price_id`), Customers (one per org), Subscriptions, metadata as the carry-channel for `organization_id` — 12.2.1.
- Checkout sessions — server-created single-use URL, hosted-vs-embedded default, lazy Customer creation, trials, `success_url` polling — 12.2.2.
- Customer Portal — `cancel_at_period_end` graceful cancel, deep-link flows, return URL as navigation hint not state-change proof — 12.2.3.
- `plan_entitlements` as a derived view, webhook-only writes, one row per org, `lookup_key` mapping to plan slug — 12.2.4.
- Subscription status as first-class state, `hasActiveAccess(e)` as the single decision-table function — 12.2.5.
- `billing.upgrade` / `openPortal` / `requirePlan` interface, `/lib/billing/` as the only place `stripe` is imported, `requirePlan` as the load-bearing gate — 12.2.6.
- `authedAction(role, schema, fn)` at the Server Action seam — 10.2.2.
- `tenantDb(orgId)` for org-scoped reads — 10.1.
- `audit_logs` append-only on every privileged transition — 10.4.
- Custom `BillingError` Error subclass and `error.tsx` interop — 2.9.2, 7.2.

---

## Lesson 12.3.1 — The brief

Frames the build, the "Done when" verification recipe, scope cuts, and the senior payoff of owning the webhook seam end-to-end.

Goals:

- Frame what's being built: ingest three Stripe webhooks, project them into one `plan_entitlements` row per org, expose three methods (`upgrade`, `openPortal`, `requirePlan`) at `/lib/billing/`, prove the loop with `stripe listen` + `stripe trigger`. One screenshot of the inspector with the entitlement panel showing `plan: 'pro'`, the `processed_events` tail with one row, and the Portal button enabled.
- State the "Done when" in one paragraph (verify with constant-time compare, dedup via `processed_events` in one transaction, derive `plan_entitlements` from three events, `last_event_at` ordering predicate, portal button opens, signature tampering returns 400, replay does not mutate twice).
- Name the scope cuts: no real Stripe production keys — test mode only; no embedded Checkout — hosted is the default (12.2.2); no in-house cancel screen — the Portal owns it (12.2.3); no `invoice.paid` / `invoice.payment_failed` handling — the three subscription events are enough for the entitlement projection (the project notes the past-due banner is a forward reference); no seat enforcement — the `seats` column ships but the membership gate is left to Unit 14's notification project where the over-seat banner lands; no `stripe.subscriptions.update` calls from app code — plan changes go through the Portal; no automatic tax — toggled off in Checkout; no promotion codes; no `incomplete_expired` recovery flow; no webhook secret rotation drill.
- Set the senior payoff: the webhook seam is the production async edge of every modern SaaS — and the careless code is the most expensive code in the codebase. The patterns shipped here (verify-then-claim-then-mutate-in-one-transaction, the `last_event_at` predicate, the single-writer rule, the derived-view projection, the thin interface around an SDK that earns wrapping) carry into every async ingest the student writes — payment webhooks, email-bounce webhooks, third-party callbacks, internal event buses.
- Show the end UX: a short animated capture of (a) clicking Upgrade → completing Stripe test-card checkout → success page polling → entitlement panel flipping to Pro; (b) clicking Portal → cancel-at-period-end → inspector picking up the new flag; (c) the "Tamper signature" debug button returning 400.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The starter ships the webhook claim helper and the Stripe SDK singleton — the discipline from 12.1 is the carry-in, not something the student re-derives. This project is the application of the discipline to one real third-party.
- Stripe test mode is the only environment the project runs in. Test-mode keys and live-mode keys are wholly separate universes; the project's `.env.example` ships `sk_test_` and `whsec_` (local) — never paste a `sk_live_` here.
- The `pnpm seed:stripe` script must run once before the project works. The script creates three Products and their monthly Prices in the student's test account, then writes the resolved `lookup_key`s to `catalog.json`. Re-running the seed is idempotent (uses `lookup_key` to find-or-create).

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, Stripe CLI installed (`brew install stripe/stripe-cli/stripe`), `stripe login` complete, test-mode keys pasted into `.env.local`, `pnpm install` clean, `docker compose up -d` running Postgres, `pnpm db:migrate && pnpm db:seed` populated, `pnpm seed:stripe` created the catalog, `pnpm dev` shows the inspector with `plan: 'free'` for the active org and a disabled Portal button. No webhook handler logic yet — `stripe trigger` would fire but the route returns 404.

Estimated student time: 15 to 20 minutes.

---

## Lesson 12.3.2 — Tour the starter and open the Stripe CLI tunnel

Walks the file tree, reads the provided `claimEvent` / SDK singleton / catalog, runs `stripe listen` + one `stripe trigger` to prove the local tunnel is alive.

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on six files: the empty `app/api/webhooks/stripe/route.ts` (the handler skeleton the student writes), the empty `lib/webhooks/stripe.ts` (the dispatch + handlers), the empty `lib/billing/projection.ts` (the projection function), the stub `plan_entitlements` schema in `db/schema.ts` (columns to be filled in 12.3.5), the empty `billing/upgrade.ts` / `portal.ts` / `require-plan.ts`, and the provided `billing/stripe.ts` (the SDK singleton — the only file that may import `stripe`).
- Read the provided `lib/webhooks/processed-events.ts` end-to-end — `claimEvent(tx, provider, eventId, eventType)` from 12.1.2, returning `boolean` (true = claimed, false = already processed). This is the seam every webhook handler in the codebase will share.
- Read `lib/billing/stripe.ts`: the configured singleton with `apiVersion` pinned, `STRIPE_SECRET_KEY` from the typed env, `typescript: true` flag. Names the rule: this file is the only place `import Stripe from 'stripe'` appears; the lint config from 12.2.6 flags violations.
- Read `lib/billing/catalog.ts` and `catalog.json`: the seed-stripe script wrote `{ "lookup_keys": { "course_pro_monthly": "pro", "course_team_monthly": "team" } }` after creating the test-mode Products and Prices. The catalog loader exposes `planFromLookupKey(key) → 'free' | 'pro' | 'team' | null` — the projection function's only path from Stripe-side IDs to app-side plan slugs.
- Read the inspector: confirm the `plan_entitlements` panel, the `processed_events` tail, the Checkout / Portal buttons (currently broken — the buttons exist but the actions throw), the "Replay last event" and "Tamper signature" debug tools.
- Read the success page: `app/(app)/billing/success/page.tsx` is a Server Component that reads the entitlement; if `lastEventAt` is older than the current `session_id` lookup's expected window, it renders the `Poller` Client Component that calls `router.refresh()` every 500ms with a 30s budget. The poller is the resolution of the redirect-versus-webhook race from 12.1.3.
- Run the Stripe CLI: `stripe login`, then `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — the CLI prints the local webhook signing secret to paste into `.env.local` as `STRIPE_WEBHOOK_SECRET`. Restart the dev server so the env reloads. The CLI keeps running in a side terminal for the rest of the project.
- Run `stripe trigger checkout.session.completed` once: the handler 404s (no route logic yet), the CLI prints the 404 — proves the tunnel is alive. The next lesson lands the 200.
- Read `lib/billing/projection.ts`'s type definitions (provided): `EntitlementPatch` and `PlanSlug` are already exported as type aliases so the handler signatures compile incrementally; the function body is the TODO.

Senior calls and watch-outs:

- The webhook secret from `stripe listen` is different on every fresh CLI session and from the dashboard-configured production secret. Paste-into-env each time the student restarts the CLI is the daily rhythm; named here so it doesn't surprise them later.
- The Stripe CLI's `--forward-to` tunnel forwards to whatever URL the student gives it. Forgetting to start it (or starting it pointed at the wrong port) is the canonical "my handler doesn't fire" bug — the CLI prints "200 OK" or "404" on every forward, so the side terminal is the live verification.
- `STRIPE_SECRET_KEY` is server-only. The starter's `env.ts` (from Chapter 8.3's typed env discipline) does not expose it to the client bundle. Pasting a live-mode key here is a security incident — the project's `.env.example` ships only the `sk_test_` prefix and the typed env validates the prefix at boot.
- Reading the inspector before writing any code is the discipline named in 11.3.2 — the student should know every panel before they need it.

Codebase state at entry: starter cloned, deps installed, Postgres up, schema migrated, seed loaded, `seed:stripe` ran, CLI installed.
Codebase state at exit: student has read every provided file, run the inspector, started `stripe listen`, fired one `stripe trigger` event and watched it 404 cleanly. No app code written. The Checkout and Portal buttons still throw because the actions are empty.

Estimated student time: 25 to 35 minutes.

---

## Lesson 12.3.3 — Verify before you parse

Writes the route handler's read-raw-body, `constructEvent`, 400-with-problem+json-on-failure skeleton with structured logging on every disposition.

Goals:

- Fill `app/api/webhooks/stripe/route.ts` with the verification skeleton from 12.1.1:
  - `export async function POST(request: Request)`.
  - `const body = await request.text()` — once, before anything else; never `request.json()`.
  - `const signature = request.headers.get('stripe-signature')` — null check returns 400.
  - `try { const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET) } catch (err) { return problemJson(400, 'invalid_signature') }` — the SDK helper encapsulates timestamp parse, HMAC compute, constant-time compare, and the 5-minute tolerance.
  - On success, log `{ eventId: event.id, eventType: event.type }` via the structured logger and return `Response.json({ received: true }, { status: 200 })` — no business logic yet; the dispatch lands in 12.3.4.
- Add the `problemJson(status, title)` helper to `lib/webhooks/stripe.ts` (or import the one from 7.5 if the starter ships it). Returns `new Response(JSON.stringify({ type, title, status, instance }), { status, headers: { 'content-type': 'application/problem+json' } })`. No body echo, no detail leakage.
- Verify the route is the Node runtime: the starter sets `export const runtime = 'nodejs'` at the top — names the rule from 12.1.1 even though Edge would also work for the HMAC.
- Wire the structured logger from Chapter 20.1 (provided in the starter as `lib/logger.ts`): every verification path logs `{ eventId, eventType, disposition }` where disposition is `'verified'`, `'invalid_signature'`, or `'missing_header'`. Structured logging — key-value JSON via Pino — is the discipline that lets 2am debugging filter by event-id (depth in 20.1.2); the structured log is what 2am debugging will need.
- Run the verification:
  - `stripe trigger checkout.session.completed` → handler logs `verified`, returns 200, no `processed_events` row yet (that's 12.3.4).
  - Click the inspector's "Tamper signature" debug → handler logs `invalid_signature`, returns 400 with problem+json body; the inspector's debug panel renders the 400 status and the body inline.
  - Submit a POST with a missing `stripe-signature` header (via the inspector's "Missing header" debug, or via `curl`): handler returns 400 with `invalid_signature` (same disposition — the signature is the contract, missing or wrong is the same answer).

Senior calls and watch-outs:

- `request.text()` is read once. Calling `request.json()` later consumes the same stream and returns empty — the canonical bug from 12.1.1. The lesson shows the broken shape (`const data = await request.json(); ... stripe.webhooks.constructEvent(JSON.stringify(data), ...)`) and the fix (`const body = await request.text(); ... JSON.parse(body)` only after `constructEvent` succeeds).
- 400, never 401, on signature failure — Stripe retries on 5xx and treats 4xx as terminal, which is the desired behavior; a 401 misleads operators reading the dashboard's failed-delivery panel.
- No logging of the body before verification — attacker-controlled strings in the structured log become a log-injection vector. The lesson restates the verify-before-log rule.
- `stripe.webhooks.constructEvent` throws `Stripe.errors.StripeSignatureVerificationError` on failure. The `instanceof` check is the discrimination; any other error is a 5xx (genuine server error). Names the asymmetry.
- The Edge-vs-Node question: the Stripe SDK works on Node only; switching to Edge would require hand-rolling HMAC (Lesson 12.1.1 covered the primitives). The project picks Node uniformly for the chapter.
- The 5-minute tolerance is the SDK default; do not lower it without coordinating with the senders — under clock skew, a tight window starts producing false-positive `invalid_signature` errors that look exactly like an attack.

Codebase state at entry: empty route handler, the SDK singleton + claim helper + logger provided.
Codebase state at exit: the route verifies signatures, returns 200 on success and 400 with problem+json on failure, logs every disposition. `stripe trigger` lands cleanly; the inspector's tamper button reproduces the 400. No `processed_events` writes yet, no business logic — the dispatch and dedup land in 12.3.4.

Estimated student time: 35 to 50 minutes.

---

## Lesson 12.3.4 — Claim the event inside one transaction

Wraps the post-verify path in `db.transaction`, calls `claimEvent` to dedupe against `processed_events`, and stubs the dispatch switch with structured logging.

Goals:

- Wrap the post-verification path in `db.transaction`:
  - `return await db.transaction(async (tx) => { const claimed = await claimEvent(tx, 'stripe', event.id, event.type); if (!claimed) { logger.info({ eventId: event.id, disposition: 'duplicate' }); return Response.json({ received: true, duplicate: true }, { status: 200 }); } await dispatch(tx, event); return Response.json({ received: true }, { status: 200 }); })`.
- Build the dispatch stub in `lib/webhooks/stripe.ts`:
  - `dispatch(tx, event)` switches on `event.type`: cases for `'checkout.session.completed'`, `'customer.subscription.updated'`, `'customer.subscription.deleted'` log + return for now (the projection + mutations land in 12.3.5); the `default` case logs `{ eventType, disposition: 'unhandled' }` and returns.
- Verify `processed_events` writes:
  - `stripe trigger checkout.session.completed` once: inspector's `processed_events` panel gains one row with `eventId`, `eventType: 'checkout.session.completed'`, `receivedAt: now()`. The structured log shows `verified` then `claimed`.
  - `stripe events resend <eventId>` (or the inspector's "Replay last event"): the same `event.id` arrives a second time; `claimEvent` returns false (the unique constraint on `(provider, eventId)` blocked the insert); the handler logs `duplicate` and returns 200 with `{ duplicate: true }`. The inspector's panel still shows one row — no second insert. This is the structural idempotency proof.
- Verify the 200-on-duplicate rule: returning 4xx or 5xx on a duplicate would tell Stripe to retry, producing an infinite loop. 200 is the success path for both first-arrival and replay (12.1.2).
- Add structured logging on every code path: `verified`, `duplicate`, `claimed`, `dispatched`, `unhandled` — each with the `eventId`. The log is the live forensic surface; the inspector's audit panel is the user-visible one.
- Name the timing budget: Stripe waits 30 seconds for a 2xx. The current handler does nothing in dispatch yet, so latency is trivial; in 12.3.5 the handlers add one Stripe API call (`subscriptions.retrieve`) plus a DB write — still well within budget. The lesson names the threshold so 12.3.5's API call doesn't look like an accident.
- (Optional senior reach.) The `processed_events.eventType` column is stored for observability — the analyst can answer "how many `checkout.session.completed` did we see this week" without a Stripe round trip. Costs nothing; pays off the first time someone asks.

Senior calls and watch-outs:

- The dedup INSERT and the dispatch must live in the same `db.transaction`. Claiming outside the transaction and dispatching inside (or vice versa) re-introduces the partial-state bug from 12.1.2 — the claim row commits, the business work fails, the next retry sees "already processed" and skips, leaving the database wrong. One transaction, one boundary.
- The dispatch function takes `tx` (the transaction handle), not `db`. Every database call inside a handler must go through `tx`, never the global `db`. Mis-routing a call to `db` opens an outer transaction that races the inner — name the rule, then catch in code review.
- The `default` case (unknown event type) returns 200, not 400. Stripe sends events the application hasn't subscribed to from dashboard misconfigurations; refusing them produces dashboard noise. The right shape: ignore quietly, log for observability, move on.
- The `dispatch` switch is exhaustive over the events the application acts on. New event types added later require a new case; missing a case means the event lands as `unhandled`. TypeScript's `event.type` union (Stripe's SDK types) helps but isn't load-bearing — the runtime log is the safety net.
- Side effects inside the transaction (`stripe.subscriptions.retrieve`, Resend sends, R2 uploads) hold DB connections across network IO. The lesson names the discipline: DB-only work goes in the transaction; the one allowed exception inside `onCheckoutCompleted` (the `subscriptions.retrieve` call in 12.3.5) is the smallest reach that earns its weight; anything else queues to a background job. (Pointing forward to 13.1, not blocking here.)

Codebase state at entry: route verifies signatures and returns 200, no DB writes.
Codebase state at exit: route claims events into `processed_events` inside `db.transaction`, replay produces no second row, the dispatch stub logs every event type. The inspector's `processed_events` tail lights up; the `plan_entitlements` panel is still `free` because the handlers are empty — that's 12.3.5.

Estimated student time: 45 to 60 minutes.

---

## Lesson 12.3.5 — Project three events into one entitlement row

Completes the `plan_entitlements` schema, writes the pure `subscriptionToEntitlement` projection, and lands the three handlers with the `last_event_at` ordering predicate plus audit logs.

Goals:

- Complete the `plan_entitlements` schema in `db/schema.ts` per the reference signatures (org PK, plan/status/subscriptionId/currentPeriodEnd/cancelAtPeriodEnd/seats/lastEventAt/updatedAt). Run `pnpm drizzle-kit generate` then `pnpm db:migrate`. Backfill: the seed already inserted a `'free'` row per seeded org; new orgs created later get a row from the org-creation flow (the starter wires this — names the discipline).
- Fill `lib/billing/projection.ts`:
  - `subscriptionToEntitlement(sub: Stripe.Subscription, catalog: Catalog): EntitlementPatch` — reads `sub.items.data[0].price.lookup_key`, resolves to a plan slug via `catalog.planFromLookupKey`, returns `{ plan, status: sub.status, subscriptionId: sub.id, currentPeriodEnd: new Date(sub.current_period_end * 1000), cancelAtPeriodEnd: sub.cancel_at_period_end, seats: sub.items.data[0].quantity ?? 1 }`. The function is pure — no DB access, no SDK calls — and the test target in Unit 19.
- Fill the three handlers in `lib/webhooks/stripe.ts`:
  - **`onCheckoutCompleted(tx, event)`**: extract `session = event.data.object`. Resolve `organizationId` — prefer `session.subscription_data?.metadata?.organization_id` written by `billing.upgrade` (12.3.6); fall back to a lookup via `organizations.stripeCustomerId = session.customer`. Call `stripe.subscriptions.retrieve(session.subscription)` to fetch the full Subscription (the Checkout event payload is summary; the Subscription object carries the full price + status). UPSERT `plan_entitlements` via Drizzle's `onConflictDoUpdate` keyed on `organizationId`, setting the projection result + `lastEventAt = new Date(event.created * 1000)`. Write `audit_logs` `{ action: 'billing.subscription.activated', subjectType: 'subscription', subjectId: subscriptionId, orgId: organizationId, actorUserId: null, payload: { plan } }` via `logAudit(tx, ...)`.
  - **`onSubscriptionUpdated(tx, event)`**: project the subscription directly from `event.data.object` (already a full Subscription on this event type — no second SDK call needed). UPDATE `plan_entitlements` with `SET plan = ..., status = ..., currentPeriodEnd = ..., cancelAtPeriodEnd = ..., seats = ..., subscriptionId = ..., lastEventAt = event.created, updatedAt = now() WHERE organizationId = ? AND (lastEventAt IS NULL OR lastEventAt < event.created) RETURNING id`. Zero rows → log `{ disposition: 'stale_ordering' }` and return. One row → `logAudit(tx, { action: 'billing.subscription.updated', subjectType: 'subscription', subjectId: subscriptionId, orgId: organizationId, actorUserId: null, payload: { plan, status, cancelAtPeriodEnd } })`.
  - **`onSubscriptionDeleted(tx, event)`**: UPDATE `plan_entitlements` with `SET plan = 'free', status = 'canceled', subscriptionId = NULL, currentPeriodEnd = NULL, cancelAtPeriodEnd = false, lastEventAt = event.created, updatedAt = now() WHERE organizationId = ? AND (lastEventAt IS NULL OR lastEventAt < event.created)`. Resolve `organizationId` via the existing entitlement row's `subscriptionId = event.data.object.id` (the simpler reverse lookup — the row is already org-keyed). Write `logAudit(tx, { action: 'billing.subscription.canceled', subjectType: 'subscription', subjectId: subscriptionId, orgId: organizationId, actorUserId: null, payload: {} })`.
- Resolve the `organizationId` lookup helper: `resolveOrgIdFromCustomer(tx, stripeCustomerId)` reads `organizations.id WHERE stripeCustomerId = ?`; throws `BillingError('UNKNOWN_CUSTOMER')` if not found (the webhook was for a Customer the app didn't create — log + 200 to prevent retries, the lesson names the trade-off vs. 500-to-investigate).
- Add `getEntitlement(orgId)` in `lib/billing/entitlement.ts`: `React.cache`-wrapped, simple `tenantDb(orgId).planEntitlements.findFirst({ where: eq(planEntitlements.organizationId, orgId) })`. Throws if missing (every org has a row from creation — missing is a real bug).
- Add `hasActiveAccess(e: PlanEntitlement): boolean`: encodes the decision table from 12.2.5 — `trialing | active | past_due → true`; `canceled` with `cancelAtPeriodEnd === true` and `currentPeriodEnd > now() → true`; `incomplete | incomplete_expired | unpaid → false`. Pure function; named once.
- Verify each handler:
  - `stripe trigger checkout.session.completed`: inspector flips `plan: 'free' → 'pro'`, `status: 'trialing' \| 'active'` (depends on whether the Checkout used a trial), `subscriptionId` populated, `lastEventAt` matches `event.created`. `audit_logs` gains the `billing.subscription.activated` row.
  - `stripe trigger customer.subscription.updated` (with the existing subscription ID — the CLI's `--add` lets you override): inspector picks up new `status` / `currentPeriodEnd` / `cancelAtPeriodEnd`. The "Force older event" debug button replays the event with a hand-crafted `created` 60 seconds in the past — the handler logs `stale_ordering` and the entitlement does not regress.
  - `stripe trigger customer.subscription.deleted`: inspector flips `plan: 'pro' → 'free'`, `status: 'canceled'`, `subscriptionId: null`.
- One Mermaid sequence diagram in the lesson: Checkout → `checkout.session.completed` event → handler claims in `processed_events` → projects → UPSERTs `plan_entitlements` → writes `audit_logs` → returns 200 → inspector picks up via `router.refresh` poll.

Senior calls and watch-outs:

- The `onCheckoutCompleted` handler is the one place inside a webhook handler where the course allows a `stripe.*` call — `subscriptions.retrieve(session.subscription)` because the Checkout event payload's `subscription` is just the ID. The senior call: this is one round trip, well inside the 30s budget; alternatives (a separate `customer.subscription.created` event arriving moments later) are functionally equivalent but introduce a second event to handle. The course defaults to retrieve-on-Checkout.
- `onSubscriptionUpdated` does *not* call `subscriptions.retrieve` — the event's payload is already the full Subscription. Re-fetching is the canonical "I copied the Checkout handler" bug; the lesson shows it as a watch-out.
- The `lastEventAt` predicate is in the UPDATE's `WHERE`, not in a pre-read. A pre-read-then-write opens the same race window from 12.1.3 — two concurrent handlers both see "mine is newer," both write, the older one wins. The atomic `UPDATE ... WHERE lastEventAt < ?` lets Postgres evaluate the condition under row-lock.
- UPSERT vs. UPDATE: `onCheckoutCompleted` uses UPSERT because a Checkout might land before the entitlement row exists (rare, but possible if the org-creation insert was retried after Checkout); the other two use UPDATE because the row is guaranteed by the time they fire. Names the asymmetry.
- Resolving `organizationId` from `Customer` ID is a fallback path — the primary path is `subscription_data.metadata.organization_id` set in `billing.upgrade` (12.3.6). Names the rule: metadata is the carry-channel; the lookup is the safety net.
- `Stripe.Subscription`'s TypeScript types from the SDK have known gaps around `lookup_key` nullability — the projection function's null check on `catalog.planFromLookupKey` is the structural guard. An unrecognized `lookup_key` (a Stripe-side seed drift) returns `null`; the projection throws `BillingError('UNKNOWN_PLAN')` with the offending key, the handler logs + 500s, Stripe retries. Names the trade-off.
- The `audit_logs` write is inside the transaction with the entitlement write. Failure to log rolls back the entitlement change — the discipline from 17.2.3. Restated, not re-taught.
- The `seats` column ships per the reference schema, but no enforcement logic ships in this chapter — the gate lives in the membership flow (Unit 10) and the over-seat banner lands in Unit 14's notification project. Named here so the column is not orphaned.

Codebase state at entry: dedup works, dispatch logs but does not mutate.
Codebase state at exit: the three handlers project Stripe events into `plan_entitlements` with the `last_event_at` ordering predicate, audit logs land on every transition, `getEntitlement` and `hasActiveAccess` are exported from `lib/billing/`. The inspector's panel flips through `free → pro → free` as the student fires events. `billing.upgrade` and `openPortal` still throw — the Checkout flow can't be exercised end-to-end yet — that's 12.3.6.

Estimated student time: 75 to 90 minutes. The chapter's heaviest lesson; the projection + three handlers + the entitlement schema all close on one runnable surface.

---

## Lesson 12.3.6 — Ship the three-method billing interface

Implements `upgrade`, `openPortal`, and `requirePlan` behind `lib/billing/`, wires the inspector's Checkout and Portal buttons, and exercises the Stripe-hosted flow end-to-end with a test card.

Goals:

- Create `lib/billing/errors.ts`: `class BillingError extends Error { constructor(public code: 'NO_CUSTOMER' | 'PLAN_REQUIRED' | 'NO_ACCESS' | 'UNKNOWN_PLAN' | 'UNKNOWN_CUSTOMER', message?: string) { super(message ?? code); this.name = 'BillingError'; } }`. Hooks into the existing `error.tsx` segment via `instanceof BillingError` discrimination.
- Fill `lib/billing/upgrade.ts`:
  - `upgrade = authedAction('admin', z.strictObject({ planSlug: z.enum(['pro', 'team']) }), async ({ planSlug }, ctx) => ...): Promise<Result<{ url: string }>>`.
  - Ensure Stripe Customer: read `organizations.stripeCustomerId` for `ctx.orgId`; if null, call `stripe.customers.create({ email: ctx.org.ownerEmail, metadata: { organization_id: ctx.orgId } })` and `UPDATE organizations SET stripeCustomerId = ? WHERE id = ?`. The two writes (the Stripe Customer creation and the column update) cannot be made atomic across systems — the senior anchor: order them so the Stripe-side write happens first and the local update is the idempotent follow-up; a duplicate-but-orphan Customer on retry is fixable, a local pointer to a non-existent Customer is not.
  - Resolve the Price ID via the catalog: `const priceId = await catalog.priceIdForPlan(planSlug, 'monthly')` — the catalog tracks Stripe Price IDs per lookup_key (the seed-stripe script writes them).
  - Create the Checkout session: `stripe.checkout.sessions.create({ mode: 'subscription', customer: stripeCustomerId, line_items: [{ price: priceId, quantity: 1 }], success_url: `${env.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${env.APP_URL}/billing`, subscription_data: { metadata: { organization_id: ctx.orgId }, trial_period_days: 14 }, allow_promotion_codes: false, payment_method_collection: 'always' })`.
  - Return `{ ok: true, data: { url: session.url } }`.
- Fill `lib/billing/portal.ts`:
  - `openPortal = authedAction('admin', z.strictObject({ returnPath: z.string().optional() }), async ({ returnPath }, ctx) => ...): Promise<Result<{ url: string }>>`.
  - Read `stripeCustomerId`; if null, return `{ ok: false, error: { code: 'NO_CUSTOMER', userMessage: 'Subscribe to manage billing' } }`. No Customer creation here — the Portal is for existing customers (12.2.3).
  - Create the Portal session: `stripe.billingPortal.sessions.create({ customer: stripeCustomerId, return_url: returnPath ? `${env.APP_URL}${returnPath}` : env.STRIPE_PORTAL_RETURN_URL })`.
  - Return `{ ok: true, data: { url: session.url } }`.
- Fill `lib/billing/require-plan.ts`:
  - `requirePlan(planSlug: 'pro' | 'team'): Promise<void>` — reads the active org from session (the helper from 10.4), reads the entitlement via `getEntitlement(orgId)`, checks `hasActiveAccess(e)` and the plan tier (`'team'` includes `'pro'` access; the tier comparison is a small `PLAN_TIER: Record<PlanSlug, number>` table). Throws `BillingError('NO_ACCESS')` or `BillingError('PLAN_REQUIRED')` on fail.
  - Not an `authedAction` — it's a Server-Component-callable helper. Names the asymmetry: actions handle mutations and return Result; helpers throw and rely on `error.tsx`.
- Re-export the three methods from `lib/billing/index.ts`: `export { upgrade, openPortal } from './...'; export { requirePlan } from './require-plan'; export { getEntitlement, hasActiveAccess } from './entitlement'; export { BillingError } from './errors';`. Every other file imports from `billing`, never the underlying modules — the wrapper boundary.
- Wire the inspector's Checkout and Portal buttons:
  - The "Upgrade to Pro" button is a `<form action={async (formData) => { 'use server'; const result = await upgrade(null, formData); if (result.ok) redirect(result.data.url); }}> <input type="hidden" name="planSlug" value="pro" />` Server-Action-inline form. (Or a Client Component calling the action with a constructed `FormData` and using `window.location.assign(result.data.url)`.)
  - The "Manage billing" button is the same shape, an inline `<form action={async (formData) => { 'use server'; const result = await openPortal(null, formData); if (result.ok) /* open in new tab */ }}> <input type="hidden" name="returnPath" value="/inspector" />`, opening the URL in a new tab via `target="_blank"`. Disabled (with tooltip) when `stripeCustomerId` is null.
- Wire `/inspector/pro-only` (a provided page that calls `await billing.requirePlan('pro')` at the top, then renders "Pro-only content"). Before Checkout: the page throws `BillingError('NO_ACCESS')`, `error.tsx` renders "Upgrade to Pro." After Checkout: the page renders the protected content.
- Add the `BillingError` rendering in the existing `error.tsx` segment: discriminate on `error instanceof BillingError`, switch on `error.code`, render the appropriate copy + a deep-link to the Portal or to the Upgrade flow.
- Verify end-to-end:
  - Click "Upgrade to Pro" in the inspector. Stripe Checkout opens (hosted page); pay with `4242 4242 4242 4242`; land on `/billing/success?session_id=...`. The poller shows "finalizing" for ~1-2s; the webhook lands; the entitlement panel flips to Pro; the success page renders "you're on Pro."
  - Click "Manage billing." The Portal opens in a new tab. Click "Cancel subscription"; confirm; close the tab. Within a moment the inspector picks up `customer.subscription.updated` with `cancel_at_period_end: true`; the panel shows the new flag. The provided billing-page banner reads "your subscription ends on <date>."
  - Open `/inspector/pro-only` after Pro: renders the protected content. Cancel via the Portal in test mode at-period-end-now (the dashboard's test-clock or `stripe trigger customer.subscription.deleted` for the seeded subscription): the entitlement flips to free; the protected page renders the error fallback again.
- Lint rule: add (or call out as already-present) the eslint rule `no-restricted-imports` blocking `import Stripe from 'stripe'` and `import { stripe } from '@/lib/billing/stripe'` outside `lib/billing/**`. The rule is the structural enforcement of 12.2.6's principle.

Senior calls and watch-outs:

- The lazy Customer creation in `upgrade` is the one cross-system write the project has. The order matters: create on Stripe first, then UPDATE the local row. A failure after the Stripe create leaves an orphan Customer (Stripe-side garbage but no app-side reference); the retry creates a second Customer — the senior fix is to check for an existing Customer by metadata first (`stripe.customers.list({ email, limit: 1 })`) before creating. The lesson names the trade-off; the project ships the simpler retry-with-orphan path for clarity and notes the production hardening.
- `subscription_data.metadata.organization_id` is the carry-channel that lets the webhook resolve `organizationId` without a DB lookup. Names the pattern from 12.2.1 and lands the code.
- `payment_method_collection: 'always'` is the default for trial-collecting flows (12.2.2) — collects a card at trial start, avoids the "trial ended, no card on file" downgrade dance.
- `allow_promotion_codes: false` is the conservative default; flipping to `true` enables Stripe-dashboard-defined coupons. Named, not exercised.
- The success URL contains `{CHECKOUT_SESSION_ID}` — Stripe interpolates the ID. The success page reads `searchParams.session_id` but does *not* call `stripe.checkout.sessions.retrieve` from the page — the read-and-poll pattern is structurally cleaner than the "trust the session_id" pattern (the latter requires the success page to verify the session server-side and write entitlements; the former lets the webhook own writes).
- The Portal is opened in a new tab (`target="_blank"`) because Stripe's hosted Portal navigates back via `return_url` — the new-tab opens a focused billing context the user closes when done, no SPA back-button confusion.
- `requirePlan` is the load-bearing gate (12.2.6). Every Server Component or Server Action that gates behind a plan calls it at the top. Forgetting the call is the same lint-rule target as forgetting `authedAction` (Chapter 17.1's audit class); the rule is "every privileged Server Component imports `requirePlan` from `billing` and calls it before any data read."
- The `BillingError` discrimination in `error.tsx` is the seam — without it, every billing-gated page renders a generic 500. Names the wiring once; the test in 19.6 exercises it.
- The `STRIPE_PORTAL_RETURN_URL` env is a default — the action accepts a `returnPath` override so a "Cancel my subscription" link in settings can return to settings, not the inspector.
- Don't add `billing.cancel` or `billing.changePlan` methods — the Portal owns user-initiated mutations (12.2.6). The temptation to "for symmetry" wrap is the failure mode named in 12.2.7. Interface stays at three methods.

Codebase state at entry: handlers mutate `plan_entitlements`, `billing.*` is empty.
Codebase state at exit: `billing.upgrade`, `openPortal`, `requirePlan` shipped, the inspector exercises Checkout end-to-end with a real test card and the Portal end-to-end with cancel-at-period-end, `/inspector/pro-only` gates correctly. The lint rule blocks stray `stripe` imports. Verification step is mostly complete; the deterministic forensic recipes land in 12.3.7.

Estimated student time: 75 to 90 minutes. Second-heaviest lesson; closes the loop the user touches.

---

## Lesson 12.3.7 — Rehearse every failure mode

Walks every "Done when" clause as a deterministic probe — tamper, replay, out-of-order, Portal cancel, redirect race, cross-tenant metadata, every `hasActiveAccess` status — and lands the metadata cross-check hardening.

Goals:

- Walk every "Done when" clause as a verification step (the table in the framing).
- Signature path:
  - `stripe trigger checkout.session.completed` → `processed_events` gains one row, `plan_entitlements` flips to `pro`, `audit_logs` gains one row. Inspector logs `verified → claimed → dispatched`.
  - Inspector's "Tamper signature" → handler returns 400 + problem+json, no `processed_events` write, no body parse occurred (verifiable in the structured log which does not contain the body).
  - `curl -X POST localhost:3000/api/webhooks/stripe -d '{}'` (no signature header) → 400 with `invalid_signature`.
- Idempotency path:
  - `stripe events resend <eventId>` of a previously claimed event → `processed_events` row count unchanged, `plan_entitlements.updatedAt` unchanged, `audit_logs` row count unchanged. The handler logs `verified → duplicate → 200`. The lesson names the deterministic proof: the row count is the load-bearing assertion.
  - Verify the success path returned `{ duplicate: true }` in the response body (visible in the `stripe events resend` CLI output).
- Ordering path:
  - Two-event drill. Fire `customer.subscription.updated` for the current subscription (the CLI's `stripe trigger` with `--add subscription:status=past_due` produces a tailored event); confirm `plan_entitlements.status: 'past_due'`. Inspector's "Replay last event with older created" debug fires the same event-shape with a hand-rolled `created` value 60 seconds before the row's `lastEventAt`; handler logs `stale_ordering`, the entitlement does not change. Inspector confirms `status: 'past_due'` (unchanged).
- Portal flow:
  - Click "Manage billing" after a Checkout → Portal opens in new tab; cancel → return to app → inspector picks up the new `cancel_at_period_end: true` flag within a moment.
  - With Stripe's test clock (or via `stripe trigger customer.subscription.deleted`): the period-end deletion fires; entitlement flips to free; `/inspector/pro-only` renders the gate fallback again.
- Redirect-versus-webhook race:
  - Real Checkout flow (test card `4242 4242 4242 4242`): success page renders "finalizing"; the poller's `router.refresh` flips the page to "you're on Pro" within 1-2s. Confirm via DevTools that the poll fires every 500ms.
  - Disable the webhook handler (comment out the dispatch); rerun the Checkout; the success page sits at "finalizing" for 30 seconds, then renders the fallback ("this is taking longer than expected — check your email"). The fallback is the safety net for actual production webhook lag (or outage).
- Cross-tenant probe:
  - As user in org A, hand-craft a `subscription_data.metadata.organization_id` value pointing at org B (via the inspector's "forge metadata" debug). The webhook lands; the handler reads `organizationId` from metadata; UPDATEs org B's entitlement. The lesson names the failure mode: trusting metadata at face value lets a malicious-or-buggy `billing.upgrade` write to the wrong org. The structural defense: the webhook handler cross-checks `metadata.organization_id` against the `organizations` row whose `stripeCustomerId = session.customer`; mismatch → log + 500. Add the cross-check (a small refactor on 12.3.5's resolveOrgIdFromCustomer) and re-run the probe — the mismatched event is rejected.
  - The lesson notes this hardening was deferred from 12.3.5 to surface it as a concrete watch-out in verify; some students will add it earlier.
- Lint rule:
  - Verify the `no-restricted-imports` rule blocks `import Stripe from 'stripe'` anywhere outside `lib/billing/**`. Try the violation in a Server Action and watch the lint fail. Restate the rule from 12.2.6.
- Gate function exhaustiveness:
  - Run `/inspector/pro-only` against each entitlement status: trialing (pass), active (pass), past_due (pass — grace), canceled with cancel_at_period_end + future period_end (pass), canceled with past period_end (fail), incomplete (fail), incomplete_expired (fail), unpaid (fail). Use the inspector's "force entitlement status" debug to walk all eight without round-tripping Stripe each time. `hasActiveAccess` lives up to the decision table from 12.2.5.
- `audit_logs` discipline:
  - Every transition wrote an `audit_logs` row inside the same transaction. Soft-delete one of the rows and re-run a transition; the audit panel shows the gap; restore. Names the append-only discipline (forward reference to 17.2.3).
- Forward references the chapter project hands off:
  - **Unit 13 (background work):** the `onCheckoutCompleted` handler's `subscriptions.retrieve` plus the entitlement upsert is one round trip; heavier post-subscription work (provisioning a customer-specific S3 prefix, sending a welcome email through Resend) lands as a `triggered.task` enqueued from the handler, not inline (12.1.2's split-work pattern).
  - **Unit 14 (notifications):** "subscription started," "trial ending in 3 days," "payment failed — please update card," "subscription canceled" all wire through the centralized dispatcher; the email and in-app inbox channels both fire off the entitlement transitions.
  - **Unit 15 (cache):** `plan_entitlements` reads are `cacheTag('billing', orgId)`-keyed; the webhook handler calls `updateTag('billing', orgId)` after every UPSERT so the next request reads fresh; the Portal-driven `customer.subscription.updated` lands a `revalidateTag` instead (background mutation, not user-driven on this request).
  - **Unit 17 (security/audit):** the webhook-secret-rotation drill (two active secrets, try-new-fall-back-to-old); the `subscription_data.metadata` cross-check (lifted to a lint rule); the `BillingError` user/operator split.
  - **Unit 19 (tests):** the projection function (`subscriptionToEntitlement`) is the unit-testable seam — pure, fast; the integration tests cover the full webhook → DB → entitlement flow against real Postgres (Unit 19.6 ships this as its target).
- Name the senior calls one more time:
  - The webhook is the only writer for `plan_entitlements`. Server Actions, the success page, and the Portal return all read.
  - Verify → claim → mutate → audit all live in one transaction. Partial state is structurally impossible.
  - The `last_event_at` predicate makes out-of-order delivery a silent no-op, not an incident.
  - The `billing.*` interface is the only place `stripe` is imported. The lint rule is the structural enforcement.
  - `hasActiveAccess` and `requirePlan` encode the decision table once; every gate calls them.
  - The carry channel is `subscription_data.metadata.organization_id`; the safety net is the `stripeCustomerId` reverse lookup; the cross-check is the harness against a malicious-or-buggy upstream.

Senior calls and watch-outs:

- The verify lesson is the rehearsal of the failure modes — running each one and naming what would break without the disciplines the student just installed. If a verification fails, the lesson points at the owning build lesson, not at "debug it yourself."
- The metadata cross-check at the resolution step is the chapter's last hardening. Surfacing it in verify (rather than burying it in 12.3.5) frames it as a concrete watch-out the student earns by running the probe.
- Running every status through `hasActiveAccess` is the lesson that proves the decision table; the inspector's "force status" debug is the only way to walk all eight without manual Stripe test-clock orchestration.

Codebase state at entry: full webhook + projection + billing interface wired.
Codebase state at exit: every "Done when" clause verified clause-by-clause; the metadata cross-check landed; the student can articulate every decision (verify before parse, dedup atomically, project purely, `last_event_at` ordering, single-writer entitlement, Portal for user-initiated changes, the three-method interface, the lint rule) and which forward unit will lean on it.

Estimated student time: 40 to 55 minutes.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
