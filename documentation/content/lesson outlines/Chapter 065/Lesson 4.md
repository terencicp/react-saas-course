# Lesson 4 outline — Chapter 065

## Lesson title

- Page title: `Project three events into one entitlement row`
- Sidebar: `Entitlement projection`

The chapter-outline title fits — it names the senior payoff (a derived view projected from three events). Keep it.

## Lesson type

`Implementation`

(Test-coder runs. Writer renders the Implementation section list: Goal + Finished result → Your mission → Coding time → Moment of truth.)

## Lesson framing

The student installs the derived-view discipline: `plan_entitlements` is computed *from* Stripe events and read by every request, so the webhook is its only writer and a pure projection function is the seam between Stripe's shape and the app's. They land the three handlers — UPSERT-on-checkout vs UPDATE-on-update/delete — each carrying the `lastEventAt < eventAt` ordering predicate in its `WHERE` so out-of-order delivery silently no-ops, plus a co-transacted audit row on every transition. The senior takeaway: an idempotent, order-tolerant projection that survives replay and reordering without a read-then-write race.

## Codebase state

### Entry

The webhook route (from L2+L3) verifies the signature, opens `db.transaction`, claims the event via `claimEvent`, and calls `dispatch(tx, event)`. The dispatch switch in `lib/webhooks/stripe.ts` routes the three subscription event types but every handler (`onCheckoutCompleted`, `onSubscriptionUpdated`, `onSubscriptionDeleted`) and `resolveOrgIdFromCustomer` `throw new Error('not implemented')`. `plan_entitlements` is a PK-only stub (`organizationId text PK`, migration `0008`). `db/queries/entitlements.ts` returns a hard-coded free placeholder and `hasActiveAccess` always returns `false`. `projection.ts` has `EntitlementPatch` typed inline and `subscriptionToEntitlement` throws `'not implemented'`. The inspector renders `plan: 'free'` and never changes when events fire.

### Exit

`plan_entitlements` carries its full column set (migration `0010_add_entitlement_columns.sql`), seeded orgs keep their free row. `subscriptionToEntitlement` is a pure `Stripe.Subscription → EntitlementPatch` map. The three handlers write the row inside the route's transaction: checkout UPSERTs onto the org PK after one `subscriptions.retrieve`; update/delete UPDATE keyed by `subscriptionId` with the ordering predicate; each writes a `logAudit` row on a non-zero result. `getEntitlement` is a `React.cache`'d real read that throws on a missing row; `hasActiveAccess` is the exhaustive decision-table switch. The inspector now flips `free → pro → free` as events fire, with matching audit rows; an out-of-order replay leaves the row untouched. `upgrade`/`openPortal` still return `err` (the Checkout flow is not yet exercisable end-to-end — that is L5).

## Lesson sections

Intro prose (no header) — restate the goal in user terms (the panel flips `free → pro → free` as the student fires events; each transition co-writes an audit row; an out-of-order replay is a no-op) and describe the finished result. Note `upgrade`/`openPortal` still `err`, so end-to-end Checkout waits for L5; this lesson is verified with `stripe trigger` + the inspector debug buttons. No screenshot needed — a one-paragraph description of the panel transitions suffices. Optionally reference the inspector's Entitlement / Audit / Events panels by name.

### Your mission (h2)

Prose paragraph (no hints, no subsection headers), then one requirements checklist.

Weave into the prose:
- **Feature:** the derived view — three Stripe events project into one `plan_entitlements` row per org that every request reads; the webhook is its only writer.
- **Constraints / senior decisions to surface (no code):**
  - The projection is a *pure* function — no DB, no SDK call — because it becomes the unit-test seam in Unit 18 and keeps Stripe's shape out of the handlers.
  - The ordering predicate (`lastEventAt < eventAt`) lives in the UPDATE `WHERE`, not a pre-read, so Postgres evaluates it under the row lock; a read-then-write reopens the L3-of-063 reorder race. Zero rows affected is the honest no-op.
  - UPSERT-vs-UPDATE asymmetry: checkout UPSERTs onto the org PK (the row may not exist yet); update/delete UPDATE keyed by `subscriptionId` (the row is guaranteed by then).
  - `onCheckoutCompleted` makes the single allowed `stripe.subscriptions.retrieve` inside a handler (the Session carries ids, not the expanded Subscription); `onSubscriptionUpdated` must *not* re-fetch — its payload is already the full Subscription (re-fetching is the copied-Checkout bug).
  - The audit write co-transacts with the entitlement write (a logging failure rolls the change back — chapter 081 discipline, restated not re-taught).
  - Org resolution: checkout resolves the org from the Customer via `resolveOrgIdFromCustomer` (authoritative — the app owns the Customer↔org mapping); update/delete resolve from the matched row's own `subscriptionId`.
- **Out of scope:** the metadata cross-check (L6); `seats` ships but enforcement does not (the gate is Unit 9, the over-seat banner Unit 13).

Requirements checklist — every item tagged `[tested]`/`[untested]`, phrased as a verifiable outcome (behavior, not a file/export):
1. `[untested]` Running `pnpm db:generate` then `pnpm db:migrate` adds the full `plan_entitlements` shape via `0010_add_entitlement_columns.sql`, and the seeded orgs keep their `'free'` row. *(schema/migration step — verified by hand, not the unit tests)*
2. `[tested]` `checkout.session.completed` flips the row to `plan: 'pro'`, populates `subscriptionId` and `currentPeriodEnd`, and sets `lastEventAt` from the event's `created` as a `Date`.
3. `[tested]` That same checkout transition writes one `billing.subscription.activated` audit row.
4. `[tested]` `customer.subscription.updated` refreshes `status`, `currentPeriodEnd`, and `cancelAtPeriodEnd` on the existing row and writes a `billing.subscription.updated` audit row.
5. `[tested]` `customer.subscription.deleted` reverts to `plan: 'free'`, `status: 'canceled'`, `subscriptionId: null`, and writes a `billing.subscription.canceled` audit row.
6. `[tested]` An out-of-order event (a `created` earlier than the row's `lastEventAt`) does not regress the row — the newer values stand and no audit row is written.
7. `[tested]` `subscriptionToEntitlement` throws on an unknown `lookup_key` or a subscription with no items, so the handler 500s and Stripe retries.
8. `[tested]` `getEntitlement(orgId)` returns the org's row (deduped per request) and throws when the row is missing; `hasActiveAccess(e)` returns the decision-table answer for every status (`trialing | active | past_due → true`).
9. `[untested]` Firing the real triggers walks the inspector panel through `free → pro → free`, the Audit tail gains a row each step, and "Force older event" leaves the row untouched (logged `stale_ordering`). *(manual via inspector debug buttons)*

Test-coder note: the projection and the two query helpers are pure / direct-read seams — assertable in isolation. The handlers run inside a transaction against the real schema; assert on observable row state + audit rows after dispatch, never on function names or call counts (e.g. don't assert "retrieve called once").

### Coding time (h2)

One build-prompt line directing the student to implement against the brief and the lesson's tests, then the reference solution in a `<details>` (writer wraps it). Organize the solution as it appears in the repo:

1. **Schema** (`db/schema.ts`) — the `planEntitlements` table: `text` PK FK to `organization.id` (`onDelete: 'cascade'`), `plan` enum `['free','pro','team']` default `'free'`, `status` enum `['trialing','active','past_due','canceled','incomplete']` default `'active'`, nullable `subscriptionId` / `currentPeriodEnd`, `cancelAtPeriodEnd` boolean default false, `seats` integer default 1, nullable `lastEventAt`, `updatedAt` timestamptz `defaultNow().$onUpdate(() => new Date())`. Then `pnpm db:generate` → `pnpm db:migrate` produces `0010`. Use `Code` for the table block.
   - Rationale: Better Auth's `organization` id is `text`, so the FK is `text`; `lastEventAt` is `timestamptz` (takes a `Date`, never raw Unix seconds); `updatedAt` advances via `$onUpdate`.
2. **Projection** (`lib/billing/projection.ts`) — `EntitlementPatch = Pick<PlanEntitlement, 'plan'|'status'|'subscriptionId'|'currentPeriodEnd'|'cancelAtPeriodEnd'|'seats'>`; the `toEntitlementStatus` mapper folding Stripe's wider `Subscription.Status` onto the closed column set (`canceled|unpaid → canceled`, `incomplete|incomplete_expired|paused → incomplete`); `subscriptionToEntitlement` reading `item = sub.items.data[0]`, `catalog.planFromLookupKey(item.price.lookup_key)`, `new Date(item.current_period_end * 1000)`, `sub.cancel_at_period_end`, `item.quantity ?? 1`, throwing `BillingError('unknown_plan')` on a missing item or unknown key. Use `AnnotatedCode` here — direct focus to (a) `EntitlementPatch` derived from the schema type, (b) item-level vs root reads, (c) the `unknown_plan` throw, (d) the status fold.
   - Rationale: pure function (no DB/SDK) is the Unit-18 unit-test seam; `current_period_end`/`quantity` are read item-level — the root field is gone since the `basil` API version, still on the item in `dahlia`; `unknown_plan` throws so a Stripe-side seed drift 500s rather than silently provisioning the wrong tier.
3. **Handlers** (`lib/webhooks/stripe.ts`) — `resolveOrgIdFromCustomer` (reads `organization.id WHERE stripeCustomerId = ?`, throws `BillingError('unknown_customer')`); the `asId` helper; `onCheckoutCompleted` (extract ids, the one `stripe.subscriptions.retrieve`, resolve org, project, UPSERT onto org PK via `onConflictDoUpdate`, `logAudit`); `onSubscriptionUpdated` (project the payload directly, `UPDATE ... .set(...).where(and(eq(subscriptionId), or(isNull(lastEventAt), lt(lastEventAt, eventAt)))).returning(...)`, no-op when no row → log `stale_ordering`, else `logAudit`); `onSubscriptionDeleted` (UPDATE to `plan:'free'`/`status:'canceled'`/`subscriptionId:null`, same predicate, same no-op detection + audit). Use `CodeVariants` to group the three handlers as tabs (they share a shape worth comparing) — or `AnnotatedCode` per handler if the diff is clearer stepped. Call out the UPSERT-vs-UPDATE asymmetry and the `.returning()` no-op detection.
   - **Important — lesson split:** `onCheckoutCompleted` in the solution file already contains the L6 metadata cross-check (`if (claimedOrgId && claimedOrgId !== orgId) throw ...`). Lesson 4 lands `resolveOrgIdFromCustomer` as the authoritative resolver and uses its result directly; the explicit `sub.metadata.organization_id` equality check is L6's addition and must NOT appear in this lesson's reference. Show the L4 checkout handler resolving the org from the Customer and UPSERTing — no metadata read.
   - Rationale to cover (one–two sentences each): the single allowed `subscriptions.retrieve` and why the alternative (waiting for `customer.subscription.created`) adds a second event; why `onSubscriptionUpdated` does not re-fetch; why the ordering predicate is in the `WHERE` not a pre-read; the UPSERT-vs-UPDATE asymmetry; audit-in-transaction; every DB call rides `tx`.
4. **Entitlement reads** (`db/queries/entitlements.ts`) — `EntitlementRow = PlanEntitlement`; `getEntitlement` as `cache(async (orgId) => db.query.planEntitlements.findFirst({ where: eq(...) }))` throwing on a missing row; `hasActiveAccess` as the exhaustive switch (`trialing|active|past_due → true`; `canceled|incomplete → false`; `never` default). Use `Code`.
   - Rationale: these live in `db/queries/`, not `lib/billing/` (the ch064-L6 placement contract — the billing seam is Stripe calls + the gate; the entitlement read is a data-layer read); keyed by the org PK and *not* `tenantDb` (the webhook runs as the BYPASSRLS superuser; the gate reads by PK); the `never` default makes a new status a tsc error; `canceled` always denies — the post-cancel grace window is carried by `status:'active' + cancelAtPeriodEnd`, never a canceled row.

**Diagram (in Coding time):** one Mermaid `sequenceDiagram` (per diagrams INDEX, Mermaid is the top pick for sequences), wrapped in `<Figure>`, capping height. Actors/lifelines: Stripe → Route (`POST /api/webhooks/stripe`) → `tx` → `dispatch` → `onCheckoutCompleted` → `resolveOrgIdFromCustomer` → `subscriptionToEntitlement` → `plan_entitlements` (UPSERT) → `audit_logs` → 200 → inspector poll. Shows the in-transaction span and the projection as a pure side-call. Keep it horizontal/compact.

**Links (don't re-explain):** lesson 5 of chapter 064 (the `hasActiveAccess` decision table); lesson 3 of chapter 063 (the ordering predicate + reorder race); chapter 081 (audit-in-transaction). `[Resourcer appends external resources here after the `<details>`, no header.]`

### Moment of truth (h2)

- Command: `pnpm test:lesson 4`
- Expected: the lesson's suite passes (projection, handlers, query helpers) — show the green pass summary.
- Manual checklist (the `[untested]` items) the student ticks off:
  - `pnpm db:generate` then `pnpm db:migrate` runs clean and `0010_add_entitlement_columns.sql` exists; the inspector still shows the seeded `free` row.
  - `stripe trigger checkout.session.completed` → panel flips to `pro`, `subscriptionId`/`currentPeriodEnd`/`lastEventAt` populate, Audit tail gains `billing.subscription.activated`.
  - `stripe trigger customer.subscription.updated` → status/period/cancel flag refresh, audit row added.
  - `stripe trigger customer.subscription.deleted` → panel reverts to `free`/`canceled`/null subscription, audit row added.
  - Inspector "Force older event" → row unchanged, log shows `stale_ordering`.

## Scope

- **Does not cover** the metadata cross-check against forged tenancy → lesson 6 of chapter 065.
- **Does not cover** `upgrade` / `openPortal` / `requirePlan` or wiring the Checkout/Portal buttons → lesson 5 of chapter 065 (Checkout is not exercisable end-to-end this lesson).
- **Does not cover** `seats` enforcement → the membership gate is Unit 9, the over-seat banner Unit 13.
- **Does not re-derive** signature verification, the claim, or the dispatch switch → lessons 2–3 of chapter 065 (carry-in this lesson).
- **Does not re-teach** the ordering predicate, the access decision table, or audit-in-transaction → linked to chapter 063 L3, chapter 064 L5, chapter 081.
