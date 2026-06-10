# Lesson 1 — Project overview

Sidebar title: **Project overview**

## Lesson type

`Project overview`

## Lesson framing

The student leaves with the full Stripe-webhook-to-entitlement starter cloned and running end to end: Postgres up, schema migrated and seeded, the test-mode Stripe catalog (pro/team Products + Prices) created in their own account, the `stripe listen` tunnel forwarding to the dev server, and the inspector at `/inspector` showing `plan: 'free'` for the active org with a disabled Portal button.
No webhook logic exists yet — `stripe trigger` returns 404 — and that 404 is the deliberate starting line the five implementation lessons build the loop from.
The senior payoff of this lesson is orientation, not code: the student internalizes the shape of a production async ingest seam (the most expensive code in a SaaS codebase when done carelessly) and the single-writer contract that governs derived billing state, so every later lesson lands against a mental model already in place.

## Lesson sections

This is a `Project overview`. Render the contract's section list: *What we're building* (intro, no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*. No exercises, no diagram beyond the architecture labeled list, no technology rationale (that belongs to the chapters 063/064 teaching lessons this project applies).

### What we're building (intro, no header)

One paragraph plus a single figure of the finished app.
Prose: this project ingests three Stripe webhooks (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`), projects them into one derived `plan_entitlements` row per org, exposes three methods (`upgrade`, `openPortal`, `requirePlan`) behind `lib/billing/`, and proves the loop locally with `stripe listen` + `stripe trigger`.
Frame it as stitching the chapter 063 webhook discipline and the chapter 064 Stripe billing model into one runnable surface — the inbound webhook and the outbound billing interface, joined by the single-writer contract.
Keep it warm and brief; this is the only narrative beat before the figure.

Figure: use `Screenshot` (desktop variant) wrapped in `Figure` with a caption. Show the finished inspector — entitlement panel reading `plan: 'pro'`, the `processed_events` tail with one row, the Portal button enabled. If a short animated capture of the end UX is available (Upgrade → test-card Checkout → success page flipping to Pro; Portal cancel-at-period-end picking up the flag; "Tamper signature" returning 400), brief it as a second tab via `TabbedContent` around two `Screenshot`s; otherwise a single still suffices. Caption names what the student will have built by lesson 6, not what they have now.

### What we'll practice

Header: "What we'll practice". Skills framing, not feature list.
Cover, in prose: the webhook seam as the production async edge of every modern SaaS and why careless code there is the most expensive in the codebase; the discipline that makes it safe — verify-then-claim-then-mutate inside one transaction, the `last_event_at` ordering predicate, the single-writer rule for derived state, the derived-view projection, and the thin interface that earns wrapping around an SDK.
Close by naming the transfer: these patterns carry into every async ingest the student writes next (payment webhooks, email-bounce webhooks, third-party callbacks, internal event buses), and note that the chapter 063 discipline is carry-in here — the starter already ships the `claimEvent` helper and the Stripe SDK singleton, so this project is its application to one real third-party, not a re-derivation.

### Architecture

Header: "Architecture". Shape only — a labeled list (no diagram needed; the contract permits either and the three-part list is clearest as prose bullets). Three labeled groups:
- **In-bound (the webhook):** Stripe → `POST /api/webhooks/stripe` → verify signature → claim in `processed_events` → dispatch by event type → project the Subscription → UPSERT/UPDATE `plan_entitlements` → write `audit_logs` → 200. All DB work inside one `db.transaction`.
- **Out-bound (the interface):** the inspector's buttons → `upgrade` / `openPortal` (Server Actions) → Stripe-hosted Checkout / Portal → navigate back. `requirePlan` gates Server Components by reading the entitlement row.
- **The contract between them:** the webhook is the only writer for `plan_entitlements`; every other surface reads. The Subscription's `metadata.organization_id` is the carry-channel from Checkout to webhook; the `stripeCustomerId` reverse lookup (`resolveOrgIdFromCustomer`) is the authoritative resolver and cross-check.

Optional: if the writer wants a visual, an `ArrowDiagram` inside a `Figure` rendering the in-bound chain and the out-bound chain meeting at the `plan_entitlements` box would carry the single-writer contract well — but it is not required; the labeled list is the baseline.

### Starting file tree

Header: "Starting file tree". Use `FileTree`.
Render the top-level `src/` layout from the chapter outline's starter tree. Comment one line each ONLY on files the lessons touch or that changed from the prior project; leave the rest uncommented. Mark the TODO-bearing files as the highlighted focus (FileTree's highlight mechanism):
- `src/app/api/webhooks/stripe/route.ts` — TODO, the POST handler (L2, L3)
- `src/lib/webhooks/stripe.ts` — TODO, dispatch + handlers + `resolveOrgIdFromCustomer` (L3, L4, L6)
- `src/db/schema.ts` (`planEntitlements`) — TODO, add columns (L4)
- `src/db/queries/entitlements.ts` — TODO, `getEntitlement` + `hasActiveAccess` (L4)
- `src/lib/billing/projection.ts` — TODO, the pure projection (L4)
- `src/lib/billing/upgrade.ts` / `portal.ts` / `require-plan.ts` — TODO, the three methods (L5)

Provided (comment briefly, do not highlight): `src/lib/billing/stripe.ts` (sole `stripe` importer, `apiVersion` pinned `'2026-05-27.dahlia'`), `catalog.ts`/`catalog.json` (`planFromLookupKey` mapping), `lib/webhooks/processed-events.ts` (`claimEvent` from L2 of ch063), `billing-error.ts`, `lib/billing/index.ts` barrel, the inspector under `app/(protected)/inspector/`, `billing/success/page.tsx` + `Poller.tsx`. State once that everything not highlighted is provided.

Keep tree depth reasonable — show the `src/` subtree the lessons touch, collapse or omit deep UI/auth/email/invitation subtrees the student never edits (a one-line "…auth, emails, invitations, UI primitives — provided, untouched" note suffices).

### Roadmap

Header: "Roadmap". Use `CardGrid` with one `Card` per implementation lesson (L2–L6). Each card: lesson number + title, one sentence naming what it adds.
- **L2 — Verify before you parse.** Lands the route handler's read-raw-body, `constructEvent`, and 400-with-problem+json verification skeleton with structured logging on every disposition.
- **L3 — Claim the event inside one transaction.** Wraps the post-verify path in `db.transaction`, dedupes against `processed_events`, and stubs the dispatch switch.
- **L4 — Project three events into one entitlement row.** Completes the `plan_entitlements` schema, writes the pure projection, and lands the three handlers with the ordering predicate and audit logs.
- **L5 — Ship the three-method billing interface.** Implements `upgrade`, `openPortal`, `requirePlan`, wires the Checkout and Portal buttons, and runs the Stripe-hosted flow end to end with a test card.
- **L6 — Harden the webhook against forged tenancy.** Adds the metadata cross-check so a forged `organization_id` cannot write to the wrong org.

### Setup

Header: "Setup". Use `Steps` for the command sequence, then an env-var list, then the expected result.
First step is fixed by the contract: "1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 065/start/`." Note the Stripe CLI must already be installed (link the official install docs via `ExternalResource` or inline link).
Then the ordered commands (exact, from the chapter outline):
1. `cp .env.example .env`.
2. `docker compose up -d` — local Postgres 18; expect the container healthy.
3. `pnpm install` — `preinstall` enforces pnpm; engines require Node 24.
4. Fill in `.env` — Better Auth + invitation secrets via `openssl rand -base64 32`; the Stripe test-mode secret key.
5. `pnpm db:migrate` — applies the 059 set plus `processed_events`, the `plan_entitlements` PK stub, and `organization.stripe_customer_id`.
6. `pnpm db:seed` — two orgs (Acme, Globex), four users, one `'free'` entitlement row per org (`stripe_customer_id` stays null).
7. `stripe login`, then in a second terminal `pnpm stripe:listen` (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`) — prints the local signing secret; paste it into `.env` as `STRIPE_WEBHOOK_SECRET`; keep this terminal running.
8. `pnpm seed:stripe` — creates pro/team Products + monthly Prices in the test-mode account and rewrites `src/lib/billing/catalog.json` with their `lookup_key`s; idempotent (find-or-create by `lookup_key`).
9. `pnpm dev` — restart after pasting `STRIPE_WEBHOOK_SECRET` so the env reloads.

Render the commands with `Code`. Where a step has an expected console signal, state it inline (the contract requires an expected-outcome sentence per command-running step).

Env-var list (the four Stripe-specific entries get full name / purpose / how-to-obtain treatment; the inherited ones get a single "from prior projects" line):
- `STRIPE_SECRET_KEY` — test-mode secret key (`sk_test_...`), from Stripe Dashboard → Developers → API keys in test mode. Server-only; `src/env.ts` rejects a non-`sk_test_` prefix at boot — note this guard explicitly (it is the project's never-ship-a-live-key rail).
- `STRIPE_WEBHOOK_SECRET` — local signing secret (`whsec_...`) printed by `stripe listen`; different on every fresh CLI session; re-paste each restart.
- `STRIPE_PORTAL_RETURN_URL` — `http://localhost:3000/inspector`.
- `APP_URL` — `http://localhost:3000`, used for Checkout `success_url`/`cancel_url`.
- Inherited (one line): `DATABASE_URL`(`_UNPOOLED`), `SEED`, `BETTER_AUTH_SECRET`/`URL`, `INVITATION_SIGNING_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`/`REPLY_TO`, `NEXT_PUBLIC_APP_NAME`/`URL`.

Expected result (close the lesson on the running starter; use an `Aside` tip if helpful): `pnpm dev` shows the inspector at `/inspector` with `plan: 'free'` for the active org and a disabled Portal button. The `stripe listen` terminal prints `200 OK` or `404` on every forward — the live tunnel check. Firing `stripe trigger checkout.session.completed` now returns 404 (no route logic yet); lesson 2 lands the 200. That 404 is the intended starting line.

## Scope

- No webhook handler logic, no entitlement projection, no billing methods — those are built across lessons 2–6; this lesson only stands the starter up and orients.
- No technology rationale for Stripe, webhooks, idempotency, or the entitlement model — those are taught in chapters 063 and 064; this overview names the shape and links forward, it does not re-explain.
- The Stripe CLI install itself is a prerequisite, not covered here beyond a link to the official install docs.
- Test mode only; no `sk_live_` key, no production webhook endpoint configuration (the project is purely the local `stripe listen` loop).
