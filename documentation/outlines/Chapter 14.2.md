# Chapter 14.2 — Project: notification dispatcher

## Chapter framing

Chapter 14.2 cashes in the four teaching lessons of 14.1 — the dispatcher seam and the notifiable-vs-logged line (14.1.1), the uniform channel-function shape and the independence rule (14.1.2), category-grained `user_notification_preferences` resolved once with default-on (14.1.3), and 60-second dedup keyed by `(event_type, dedup_key, recipient_user_id)` (14.1.4) — and lands them as one runnable surface. The student writes the `notifiable_events` registry, the `dispatch(event)` function that resolves prefs and dedups before fanning out, the two channel functions (`sendEmailChannel` and `writeInboxRow`) with the uniform `({ recipient, event, payload })` signature, the `user_notification_preferences` schema and the batched read, the `notification_dedup` table and the check-then-insert, and the wiring at three real call sites — the invite-sent Server Action from 10.4, the role-change Server Action from 10.4, and the billing-past-due webhook handler from 12.3. Each build lesson closes on a runnable state: 14.2.3 ends with `dispatch()` callable end-to-end with dedup working but channels stubbed; 14.2.4 ends with both channels live and prefs respected; 14.2.5 ends with three real call sites firing; 14.2.6 walks the "Done when" clause-by-clause.

Threads through every lesson: the dispatcher is the only seam — call sites import `dispatch` from `lib/notifications/index.ts` and nothing else; no Server Action ever calls `sendEmail` directly or inserts into `notifications` directly, and a grep for either outside `lib/notifications/` is a code-review red flag; the registry is the source of truth for what events exist, what channels they default to, what category they belong to, and what their dedup key is — adding an event is a one-file change; prefs are read once per dispatch with the default-on rule baked in as `?? true`; dedup lives inside the dispatcher, before channel fan-out and after prefs, and runs as a check-then-insert on `notification_dedup` keyed by `(event_type, dedup_key, recipient_user_id)`; channel functions take a uniform `({ recipient, event, payload })` and live behind the dispatcher's `try/catch` loop so one failing channel never kills the other; the dispatcher fires after the action's transaction commits — never inside it — and the transactional-outbox alternative is named and deferred; rendering happens at dispatch time for inbox rows so the row is a snapshot, never a live join; the dispatcher's return value `{ sent, deduped, suppressedByPrefs }` is the observability shape every call site logs.

### Dependency carry-in

- **From 14.1.1 (the seam):** the `dispatch(event)` contract — input `{ type, recipientUserIds, subjectId, payload }`, side effects (inbox rows, email sends, dedup rows), return value `{ sent, deduped, suppressedByPrefs }`, and the "fire after commit" rule; the notifiable-vs-logged-event line that decides which table.
- **From 14.1.2 (the channels):** the uniform channel-function signature `({ recipient, event, payload }) => Promise<void>`; render-at-dispatch over render-at-display for inbox titles/bodies; the independence rule wrapped in `try/catch`; the `notifications` row shape.
- **From 14.1.3 (the prefs):** the `user_notification_preferences` schema with `(user_id, category)` unique and per-channel booleans; the category-level granularity decision; the default-on rule for missing rows; the critical-channel override for security events; the resolve function `resolveChannels({ event, recipient, prefs })`.
- **From 14.1.4 (the dedup):** the `notification_dedup` table with `(event_type, dedup_key, recipient_user_id, fired_at)` and the composite index; the 60-second default window with per-event override in the registry; the check-then-insert race acceptance; the order — registry lookup → prefs → dedup → channels → dedup-row insert.
- **From 10.4 (tenancy + RBAC):** `tenantDb(orgId)`, `authedAction(role, schema, fn)`, the active-org slot in the session, `audit_logs` and `writeAuditLog(tx, event)`. The invite-sent and role-change actions live here.
- **From 8.3 (Resend):** `sendEmail(to, template)` in `lib/email.ts`; the `email_suppressions` read inside the wrapper (8.1.4); the transactional-vs-marketing sender split (8.1.3); the unsubscribe-link discipline (8.1.2).
- **From 9.5 (auth):** Better Auth's `user` table with `id` and `email`; the `getUserEmail(userId)` helper added in the starter.
- **From 12.3 (Stripe):** the `processed_events` table and the webhook handler that triggers `billing.past_due` — the handler dispatches the notification inside the same transaction that records the entitlement update.
- **From 11.3 (URL state, optional):** the `/inspector` Server Component shape — the starter reuses it.
- **From 7.2 + 7.6 (Server Actions):** the canonical Result shape, Zod 4 strictObject validation, the `'use server'` directive.
- **From 2.9 (errors):** the `NotificationError` subclass with codes `REGISTRY_MISS | RECIPIENT_NOT_FOUND` — non-fatal channel failures are logged inside the dispatcher, never thrown.
- **From 6.6 (schema):** Drizzle setup, `db.transaction` shape, `ON CONFLICT` upserts, the composite-index discipline.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
.env.example                    # provided: DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY,
                                #           STRIPE_WEBHOOK_SECRET (from 12.3), APP_URL,
                                #           NOTIFICATION_UNSUBSCRIBE_SECRET (HMAC token signing)
package.json                    # provided: db:migrate, db:seed, dev, build, stripe:listen
scripts/
  seed.ts                       # provided: two orgs, four users (owner + member per org),
                                #           one seeded invitation row (invite-sent test target),
                                #           one user with email pref off for the team category
                                #           (pref-respected verification target)
src/
  db/
    schema.ts                   # provided: users (Better Auth), organizations + org_members
                                #           + audit_logs (from 10.4), invitations (from 10.4),
                                #           plan_entitlements (from 12.3), notifications stub —
                                #           TODO student fills columns in 14.2.4,
                                #           user_notification_preferences stub — TODO 14.2.4,
                                #           notification_dedup stub — TODO 14.2.3
    client.ts                   # provided
    relations.ts                # provided
  lib/
    tenant-db.ts                # provided
    authed-action.ts            # provided
    audit-log.ts                # provided
    email.ts                    # provided (Unit 8): sendEmail(to, template, { tags, headers })
    notifications/
      registry.ts               # TODO student: notifiable_events typed map
      types.ts                  # provided: DispatchEvent, DispatchResult, Channel, Recipient
      errors.ts                 # provided: NotificationError subclass
      dispatcher.ts             # TODO student: dispatch(event)
      prefs.ts                  # TODO student: resolveChannels + batched read
      dedup.ts                  # TODO student: checkAndClaim helper
      channels/
        email.ts                # TODO student: sendEmailChannel
        inbox.ts                # TODO student: writeInboxRow
      tokens.ts                 # provided: signUnsubscribeToken + verify (HMAC, 30-day exp)
      index.ts                  # TODO student: re-export dispatch + types
  emails/
    InviteSentEmail.tsx         # provided: React Email template
    RoleChangedEmail.tsx        # provided
    BillingPastDueEmail.tsx     # provided
  app/
    (app)/
      members/
        actions.ts              # provided shell from 10.4: inviteMember + changeRole;
                                #           TODO student adds dispatch() calls
      api/
        webhooks/
          stripe/
            route.ts            # provided (from 12.3); TODO student adds dispatch() in the
                                #           subscription past-due branch
      inbox/
        page.tsx                # provided: Server Component reading notifications for the user
    inspector/
      page.tsx                  # provided: prefs toggles, three "Fire X event" buttons,
                                #           inbox panel, email-sent counter, dedup-count badge,
                                #           processed_events tail (from 12.3),
                                #           "Rapid-fire (5x in 2s)" button per event,
                                #           "Reset and re-seed" form
```

### Reference solution signatures lessons display

- **The registry** (`lib/notifications/registry.ts`):
  - `notifiable_events = { 'org.invitation.sent': {...}, 'org.member.role_changed': {...}, 'org.billing.past_due': {...} } as const satisfies Record<string, EventDefinition>`.
  - Each entry shape: `{ category: 'team' | 'billing' | 'security', channels: ReadonlyArray<'email' | 'inbox'>, dedup: { windowSeconds: number; keyBy: ReadonlyArray<keyof Payload> }, template: { email: ComponentType<Payload>; inbox: (p: Payload) => { title: string; body: string } }, emailSubject: (p: Payload) => string, criticalChannel?: 'email' | 'inbox' }`.
  - `'org.invitation.sent'` — `category: 'team'`, `channels: ['email', 'inbox']`, `dedup: { windowSeconds: 60, keyBy: ['subject_id'] }`.
  - `'org.member.role_changed'` — `category: 'team'`, `channels: ['email', 'inbox']`, `dedup: { windowSeconds: 60, keyBy: ['subject_id', 'newRole'] }`.
  - `'org.billing.past_due'` — `category: 'billing'`, `channels: ['email', 'inbox']`, `dedup: { windowSeconds: 60, keyBy: ['subject_id'] }`, `criticalChannel: 'email'`.
- **The dispatch entry point** (`lib/notifications/dispatcher.ts`):
  - `dispatch(event: DispatchEvent): Promise<DispatchResult>` where `DispatchEvent = { type: EventType; recipientUserIds: ReadonlyArray<string>; subjectId: string; payload: PayloadFor<EventType>; orgId?: string }` and `DispatchResult = { sent: { email: number; inbox: number }; deduped: number; suppressedByPrefs: number }`.
  - Body order: registry lookup (throw `REGISTRY_MISS` if unknown) → batched prefs read → per-recipient loop: resolve channels via `resolveChannels` → claim dedup row (skip on hit, increment `deduped`) → for each enabled channel call inside `try/catch` (increment per-channel `sent`, log + swallow per-channel failures).
- **The prefs resolver** (`lib/notifications/prefs.ts`):
  - `readPrefsForCategory(userIds: ReadonlyArray<string>, category: Category): Promise<Map<string, PrefRow | null>>` — one `WHERE userId IN (...) AND category = ?` query.
  - `resolveChannels({ event, recipientId, prefs }): ReadonlyArray<Channel>` — returns `event.channels.filter(c => (prefs.get(recipientId)?.channels[c] ?? true) || c === event.criticalChannel)`.
- **The dedup claim** (`lib/notifications/dedup.ts`):
  - `claimDedup(tx, { eventType, dedupKey, recipientUserId, windowSeconds }): Promise<{ claimed: boolean }>` — selects the most-recent row for the key in the last `windowSeconds`; if none, inserts and returns `{ claimed: true }`; if found, returns `{ claimed: false }`. Composite index `(event_type, dedup_key, recipient_user_id, fired_at desc)` keeps it one indexed read.
  - `computeDedupKey(event, payload): string` — joins `keyBy` values with `:` (e.g., `'inv_42:admin'`).
- **The email channel** (`lib/notifications/channels/email.ts`):
  - `sendEmailChannel({ recipient, event, payload }): Promise<void>` — resolves recipient email via `getUserEmail(recipient.userId)`, signs an unsubscribe token via `signUnsubscribeToken({ userId, category })`, renders the registry's email template with `{ ...payload, unsubscribeUrl: \`${env.APP_URL}/settings/notifications?token=${token}\` }`, calls `sendEmail(to, template, { tags: { event_type: event.type } })`. Suppression is the wrapper's concern (8.1.4).
- **The inbox channel** (`lib/notifications/channels/inbox.ts`):
  - `writeInboxRow({ recipient, event, payload }): Promise<void>` — renders `event.template.inbox(payload)` once, inserts one row into `notifications` with `userId`, `orgId`, `eventType`, `subjectId`, `title`, `body`, `payload`, `createdAt: NOW()`.
- **The `notifications` table** (`db/schema.ts`):
  - `id uuid pk default gen_random_uuid()`, `userId uuid not null references users(id) on delete cascade`, `orgId uuid references organizations(id) on delete cascade` (nullable for personal events), `eventType text not null`, `subjectId text not null`, `title text not null`, `body text not null`, `payload jsonb not null default '{}'::jsonb`, `readAt timestamptz`, `createdAt timestamptz not null default now()`.
  - Composite index `(userId, createdAt desc)` for the inbox feed query. Partial index `(userId) WHERE readAt IS NULL` for the unread-badge count.
- **The `user_notification_preferences` table:**
  - `userId uuid not null references users(id) on delete cascade`, `category text not null` (`'team' | 'billing' | 'security'`), `channels jsonb not null default '{"email": true, "inbox": true}'::jsonb`, `updatedAt timestamptz not null default now()`. Primary key `(userId, category)`.
- **The `notification_dedup` table:**
  - `eventType text not null`, `dedupKey text not null`, `recipientUserId uuid not null references users(id) on delete cascade`, `firedAt timestamptz not null default now()`. Composite index `(eventType, dedupKey, recipientUserId, firedAt desc)`. No primary key — the table is append-with-TTL, never updated.
- **Call-site shape** (`app/(app)/members/actions.ts`):
  - `inviteMember = authedAction('admin', inviteSchema, async ({ email, role }, ctx) => { const inv = await tenantDb(ctx.orgId).transaction(async (tx) => { /* existing 10.4 invite write */ return invitation; }); await dispatch({ type: 'org.invitation.sent', recipientUserIds: invitee ? [invitee.id] : [], subjectId: inv.id, payload: { invitedEmail: email, role, orgName: ctx.orgName, inviterName: ctx.userName, acceptUrl }, orgId: ctx.orgId }); return { ok: true, data: inv }; })`.
  - Note the `await tx.commit()` (implicit) happens *before* `dispatch` — the dispatcher is never inside the transaction.
- **Env entries** (`.env.example`):
  - Existing from 10.4 and 12.3; new: `NOTIFICATION_UNSUBSCRIBE_SECRET` (HMAC key for unsubscribe-link tokens, 32+ bytes, generated via `openssl rand -base64 32`).

### Inspector page spec

A single Server Component at `/inspector` providing the verification surface for every "Done when" clause. All controls are server-action forms or Client-Component buttons calling Server Actions; reads are server-side and refresh on submit via `router.refresh()`.

- **Header:** session-user switcher (admin / member per seeded org), org switcher (two seeded orgs), "Reset and re-seed" form posting to a Server Action that truncates `notifications` + `notification_dedup` + `user_notification_preferences` and re-runs the seed.
- **Preferences panel:** for the active user, list the three categories (`team`, `billing`, `security`) with per-channel toggles (`email` / `inbox`). The `security` category's `email` channel is rendered disabled with a tooltip ("Critical security channel — cannot be muted"); toggling it has no effect server-side. Toggling any other channel posts to a `setPref` Server Action.
- **Three event-fire buttons:** `Fire invite-sent`, `Fire role-changed`, `Fire billing-past-due` — each posts to a Server Action that calls `dispatch()` with a fixed payload against the active user as recipient. Used to verify the basic happy path per event.
- **Rapid-fire buttons (one per event):** `Rapid-fire invite-sent (5x in 2s)` — posts to a Server Action that calls `dispatch()` five times in a tight loop against the same recipient with the same subject. The button is the deterministic dedup-verification surface, more reliable than five manual clicks.
- **Inbox panel:** the last 20 rows from `notifications` for the active user, descending by `createdAt`, with columns `eventType`, `subjectId`, `title`, `createdAt`, `readAt`. Auto-refreshes after every Server Action.
- **Email-sent counter:** a single number — the count of `sendEmail` calls made in the current session, instrumented via a `MOCK_EMAIL_SENT_COUNT` global (the starter's `lib/email.ts` mocks Resend in inspector mode and bumps the counter on every call). The counter resets with "Reset and re-seed". This is the verification-surface proxy for "was an email actually sent" without needing a real inbox round-trip.
- **Dedup-count badge:** running total of `deduped` from the most-recent `DispatchResult` — every event-fire button surfaces the result inline.
- **Processed-events tail (from 12.3):** the existing panel that streams `processed_events` — used for the billing-past-due path which is webhook-driven.
- **Debug tools:**
  - `Force registry miss` — calls `dispatch({ type: 'org.does_not_exist', ... })` and renders the resulting `NotificationError`.
  - `Mute and refire` — toggles the active user's email pref off and refires the previous event; used to verify "inbox grows, email-sent counter does not".
  - `Tampered unsubscribe token` — submits `/settings/notifications?token=garbage`; verifies the route rejects and does not toggle any pref.

The inspector is provided in full; the student writes only the dispatcher, channels, prefs, dedup, registry, and the three call-site additions that the inspector exercises.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Firing "Trigger invite-sent" sends an email to the invitee (where prefs allow) and writes one inbox row | Click `Fire invite-sent` on the inspector as the active org's admin (recipient = the seeded invitee user). Confirm one new `notifications` row with `eventType: 'org.invitation.sent'`, `subjectId: <invitation_id>`, `title: 'You've been invited to <orgName>'`. Confirm `MOCK_EMAIL_SENT_COUNT` incremented by 1. `DispatchResult` shows `{ sent: { email: 1, inbox: 1 }, deduped: 0, suppressedByPrefs: 0 }`. |
| Rapid-firing the same event five times produces one of each, not five | Click `Rapid-fire invite-sent (5x in 2s)`. Confirm exactly one new `notifications` row (not 5). Confirm `MOCK_EMAIL_SENT_COUNT` incremented by 1 (not 5). `DispatchResult` aggregated across the five calls shows `{ sent: { email: 1, inbox: 1 }, deduped: 4, suppressedByPrefs: 0 }`. `notification_dedup` shows one row for `(org.invitation.sent, <subjectId>, <recipientUserId>)`. |
| Disabling email in prefs prevents the email but keeps the inbox row | Toggle the `team` category's `email` pref off via the preferences panel. Fire `invite-sent`. Confirm one new `notifications` row. Confirm `MOCK_EMAIL_SENT_COUNT` unchanged. `DispatchResult` shows `{ sent: { email: 0, inbox: 1 }, deduped: 0, suppressedByPrefs: 1 }` (the email channel was suppressed by prefs; inbox proceeded). |
| Default-on for missing prefs row | Reset and re-seed (clears `user_notification_preferences`). Confirm no row exists for the active user. Fire `invite-sent`. Confirm both inbox row and email-sent counter increment — the missing pref defaulted to "on". |
| Critical-channel override on security category | (Forward note — no security event in v1.) For the billing-past-due event whose `criticalChannel: 'email'`, toggle `billing` → `email` off; fire `billing-past-due`; confirm `MOCK_EMAIL_SENT_COUNT` still increments — critical channel overrides the toggle. |
| Call-site wiring — invite sent | From the members page (10.4 surface), submit a new invite to `new@example.com`. The action commits, then dispatches. Confirm the seeded user with email `new@example.com` (if existing) gets an inbox row and email; otherwise the dispatch logs `RECIPIENT_NOT_FOUND` and the action still succeeds (the invite is sent regardless of whether the invitee is already a user). |
| Call-site wiring — role changed | From the members page, change a member's role from `member` to `admin`. After commit, dispatch fires. Confirm an inbox row + email for the affected member. Confirm the audit-log entry from 10.4 is unchanged — both `audit_logs` (admin-facing) and `notifications` (user-facing) write. |
| Call-site wiring — billing past due | From a Stripe-CLI terminal, `stripe trigger invoice.payment_failed`. The webhook handler from 12.3 records the entitlement update, commits, then dispatches `org.billing.past_due` to the org's owners. Confirm one inbox row per owner and one email per owner. |
| Channel independence — inbox failure does not kill email | Use the debug tool to drop the `notifications` table briefly (or set a server-only flag that makes `writeInboxRow` throw). Fire `invite-sent`. Confirm `MOCK_EMAIL_SENT_COUNT` still increments. Confirm the dispatch log shows the inbox error swallowed. |
| Fire after commit — rolled-back actions do not notify | Use the debug tool that wraps the invite action in a transaction that always rolls back. Submit. Confirm no `notifications` row, no email increment, no dedup row — the dispatcher never fired because the commit never happened. |
| Tenant isolation | Switch session to org B; visit `/inbox`; the inbox shows only org-B notifications for the active user. Notifications for the user's role in org A (if any) remain readable when switching back. |

### Concepts demonstrated → owning lesson

- The dispatcher as the one named seam, call-site / channel separation — 14.1.1.
- The `notifiable_events` registry — its fields, the source-of-truth rule, the registry-as-enumerable-list — 14.1.1.
- The notifiable-vs-logged-event line, `notifications` vs. `audit_logs` audience-driven choice — 14.1.1.
- The dispatcher contract (`DispatchEvent` in, `DispatchResult` out) and "fire after commit" — 14.1.1.
- Uniform channel-function signature, channel independence under `try/catch` — 14.1.2.
- Render-at-dispatch over render-at-display for inbox rows — 14.1.2.
- The `notifications` table shape, the inbox feed query, the partial index on unread — 14.1.2 (uses 6.4.1's composite-index discipline).
- Email channel calling into the Unit 8 wrapper, unsubscribe-link HMAC token — 14.1.2 (HMAC closes from 3.7.1).
- `user_notification_preferences` category-grained schema, `(userId, category)` unique — 14.1.3.
- Default-on for missing rows via `?? true`, critical-channel override — 14.1.3.
- Batched prefs read via `WHERE userId IN (...)` — 14.1.3 (N+1 discipline from 6.4.2).
- `resolveChannels` as the one resolution function — 14.1.3.
- `notification_dedup` shape, 60-second window, `keyBy` per-event, the composite index — 14.1.4.
- The check-then-insert race acceptance — 14.1.4.
- Dispatcher order (registry → prefs → dedup → channels) — 14.1.4.
- `authedAction(role, schema, fn)`, `tenantDb(orgId)`, audit-log writes — 10.2 / 10.4.
- Webhook-driven dispatch inside the transaction-then-commit-then-dispatch pattern — 12.1 / 12.3.
- React Email templates, plain-text fallback, unsubscribe header — 8.2.
- Result shape, Zod 4 `z.strictObject` at the action boundary — 7.1 / 7.2.

---

## Lesson 14.2.1 — Project brief

Goals:

- Frame the build: the dispatcher is the one seam, the registry is the source of truth, the prefs are read once per dispatch, the dedup window is 60 seconds, and three real call sites (invite-sent, role-changed, billing-past-due) prove the dispatcher pattern earns its weight by needing more than one channel and more than one preference resolution. Show one screenshot of the inspector with the three event buttons, the inbox panel populated, the email-sent counter at 3, and the prefs panel showing per-category toggles.
- State the "Done when" verifications in one paragraph: three event-fire buttons each produce one inbox row and one email; rapid-fire (5x in 2s) on any event produces exactly one inbox row and one email plus four `deduped`; toggling `team` → `email` off and firing `invite-sent` produces an inbox row but no email; resetting and re-seeding (no prefs rows) defaults to "on" on every channel; the three real call sites — invite, role change, billing past-due — each dispatch after their action's commit.
- Name the scope cuts: no push, no SMS, no Slack (named as future additions, registered as channel slots); no quiet hours or digest mode (named in 14.1.3, deferred); no Trigger.dev-backed channel queue (named as the durable upgrade in 14.1.1, deferred to Unit 13.1); no coalesce — dedup only (14.1.4 names the line); no per-org admin override on member prefs (out of scope); no transactional-outbox (the dispatcher is called after commit and the loss-on-crash window is the accepted trade-off in v1); no inbox UI past the `/inbox` server-rendered list (mark-as-read button is provided as a stretch in the starter); no full settings page (the prefs panel on the inspector is the surface that drives verification).
- Senior payoff: the dispatcher is the canonical shape every later notification feature copies — one event in, channels resolved against prefs, dedup absorbed, fan-out independent. Adding push later is one new channel function with the same signature; adding a new event is one new registry entry; muting noise per category is the user's lever. Senior-shipping-2026 the pattern is the difference between "this feature took an afternoon" and "this feature opened five new bugs across the codebase."
- Show the end UX: a short capture of clicking `Fire invite-sent`, watching the inbox panel grow by 1 and the email counter tick to 1; clicking `Rapid-fire (5x in 2s)`, watching the inbox grow by 1 and the dedup badge show "4 deduped"; toggling `email` off and refiring, watching the inbox grow but the counter not move.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The starter ships everything from 10.4 + 12.3 working — the members surface, the Stripe webhook handler, the audit log. This project is layering the dispatcher on top, not rewriting those flows. Resist the urge to refactor the invite action wholesale; the only change is two lines (the `await dispatch(...)` after commit and the import).
- The `MOCK_EMAIL_SENT_COUNT` is the inspector's verification proxy because real Resend round-trips during development are slow and rate-limited. The starter's `lib/email.ts` in inspector mode bumps the counter and logs the rendered email body to the server console; in production mode it calls real Resend. The student does not change `lib/email.ts`.
- The unsubscribe-token HMAC secret (`NOTIFICATION_UNSUBSCRIBE_SECRET`) must be generated locally and put in `.env.local`. The starter's `tokens.ts` is provided; the student does not write the HMAC code (14.1.3 named the discipline).
- Stripe-CLI setup is inherited from 12.3 — the student needs `stripe listen` running for the billing-past-due verification. If 12.3 was skipped, the verify step on billing-past-due is replaced by the inspector's "Fire billing-past-due" button (same dispatcher path, no webhook).

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, `docker compose up -d` running Postgres, `pnpm install` clean, `pnpm db:migrate && pnpm db:seed` populated, `pnpm dev` shows the 10.4 members page working, the `/inspector` shell loads but every event-fire button currently fails with a runtime error (`dispatch is not defined` from the empty `dispatcher.ts`), the `/inbox` page renders empty.

Estimated student time: 15 to 25 minutes.

---

## Lesson 14.2.2 — Starter walkthrough

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on six files: `lib/notifications/registry.ts` (empty — student fills in 14.2.3), `lib/notifications/dispatcher.ts` (empty — 14.2.3), `lib/notifications/prefs.ts` (empty — 14.2.4), `lib/notifications/dedup.ts` (empty — 14.2.3), `lib/notifications/channels/email.ts` and `inbox.ts` (empty — 14.2.4), and `app/(app)/members/actions.ts` (provided from 10.4, no `dispatch` calls yet — student adds them in 14.2.5).
- Read the schema: confirm the three stub tables (`notifications`, `user_notification_preferences`, `notification_dedup`) are present as commented-out blocks in `db/schema.ts` with TODO markers naming the lesson that fills each one. Confirm the existing 10.4 + 12.3 tables (`users`, `organizations`, `org_members`, `invitations`, `audit_logs`, `processed_events`, `plan_entitlements`) are unchanged.
- Read the seed: two orgs, four users (`alice@`, `bob@` in org A as admin/member; `carol@`, `dan@` in org B), one seeded invitation for `eve@example.com` (the invite-sent test target — `eve` is not yet a user, so the dispatch resolves to `RECIPIENT_NOT_FOUND` and only the audit log writes), one explicit pref row turning `team` → `email` off for `bob` (the pref-respected verification target). The seed deliberately leaves `alice` with no prefs row so default-on can be verified.
- Read the inspector: every panel, every button, every debug tool. The inspector is the verification surface for every later lesson; the student should understand each button's mapping before writing the dispatcher.
- Read the provided pieces in `lib/notifications/`: `types.ts` (the `DispatchEvent`, `DispatchResult`, `Channel`, `Recipient`, `EventDefinition` types — full TypeScript shapes), `errors.ts` (`NotificationError` extends `BaseError` from 2.9 with `code: 'REGISTRY_MISS' | 'RECIPIENT_NOT_FOUND'`), `tokens.ts` (HMAC sign + verify for unsubscribe URLs, 30-day expiry, the `NOTIFICATION_UNSUBSCRIBE_SECRET` env entry). The three email templates in `src/emails/` are full React Email components — the student does not author email JSX.
- Run the app: confirm the members page renders, confirm an invite submission succeeds and writes the `invitations` + `audit_logs` rows (the dispatch is missing, no notification, no email — that's the missing piece this project ships). Confirm `/inbox` renders an empty list. Confirm the inspector loads but every "Fire" button throws.

Senior calls and watch-outs:

- `lib/notifications/index.ts` will be the only export surface — every call site imports `dispatch` from here, never reaches into `dispatcher.ts` or channel files. The discipline matches `lib/billing/index.ts` from 12.3.
- The starter's `lib/email.ts` mock mode is set via `NODE_ENV !== 'production'` plus the `INSPECTOR_MODE=true` env var. The student does not touch this file; the counter is the verification surface, not a load-bearing piece of the dispatcher.
- The seed's `bob`-with-email-off-for-team is the deterministic pref-respect verification target. Resetting the seed restores it.
- The provided React Email templates accept `{ unsubscribeUrl: string }` as part of their payload. The student must thread the unsubscribe URL through the email channel function, not hard-code it.

Codebase state at entry: starter cloned, Postgres running, schema migrated, seed loaded.
Codebase state at exit: student has read every provided file, run the app, clicked through the inspector (all buttons error), opened the members page (works), opened the `/inbox` page (empty). No code written. The dispatcher is empty; the registry is empty; the three tables are stubs.

Estimated student time: 20 to 30 minutes.

---

## Lesson 14.2.3 — The registry, the dispatcher, and dedup

Goals:

- Fill `db/schema.ts`: uncomment the three stub tables (`notifications`, `user_notification_preferences`, `notification_dedup`) per the reference signatures, generate the migration with `pnpm db:generate --name add_notifications`, inspect the emitted SQL (three `CREATE TABLE`s, three composite indexes, one partial index on unread), run `pnpm db:migrate`. Confirm in Drizzle Studio.
- Fill `lib/notifications/registry.ts`: define `notifiable_events` as a `const` object with the three keys (`'org.invitation.sent'`, `'org.member.role_changed'`, `'org.billing.past_due'`), each carrying the shape from the reference (`category`, `channels`, `dedup`, `template`, `emailSubject`, `criticalChannel` where applicable). Import the three React Email templates from `src/emails/`. Type with `satisfies Record<string, EventDefinition>` so unknown keys are flagged.
- Fill `lib/notifications/dedup.ts`: implement `claimDedup(tx, { eventType, dedupKey, recipientUserId, windowSeconds })`. SELECT the most-recent row for `(eventType, dedupKey, recipientUserId)` with `firedAt > NOW() - INTERVAL '${windowSeconds} seconds'`; if exists, return `{ claimed: false }`. If absent, INSERT `(eventType, dedupKey, recipientUserId, firedAt: NOW())` and return `{ claimed: true }`. Implement `computeDedupKey(eventDef, payload)` — joins the `keyBy` field values from the payload with `:`.
- Fill `lib/notifications/dispatcher.ts`: write `dispatch(event)` per the reference. Order: lookup `notifiable_events[event.type]` → throw `NotificationError('REGISTRY_MISS')` if absent; for each `recipientUserId` open a per-recipient loop; **stub** the prefs read with `const enabledChannels = eventDef.channels` (full prefs read lands in 14.2.4); compute `dedupKey`; call `claimDedup`; if not claimed, increment `deduped` and continue; if claimed, fan out to channels — **stub** the channel calls with `console.log` plus `sent.<channel>++` (full channel implementations land in 14.2.4); return the aggregated `DispatchResult`. Wrap the per-channel call in `try/catch` so a thrown channel logs and does not abort the loop.
- Write `lib/notifications/index.ts`: re-export `dispatch`, the event-type union, and the `DispatchEvent` type. Mark `'server-only'` at the top so the dispatcher can never be imported into a Client Component.
- Wire the inspector's three event-fire buttons to call `dispatch()` with fixed payloads (the inspector's action stub is already there; the student adds the imports and the dispatch calls).
- Run the app: click `Fire invite-sent`. Confirm `DispatchResult` returns `{ sent: { email: 1, inbox: 1 }, deduped: 0, suppressedByPrefs: 0 }` (channels are stubs but increment the counter). Confirm one row in `notification_dedup`. Click again within 60 seconds — confirm `{ sent: { email: 0, inbox: 0 }, deduped: 1, ... }` and no second dedup row. Click `Rapid-fire (5x in 2s)` — confirm `{ ..., deduped: 4 }` aggregated. Wait 61 seconds, click again — confirm the dedup window expired, a fresh dispatch fires, `deduped: 0`.

Senior calls and watch-outs:

- The registry is `const`-asserted with `satisfies` so the event-type union is inferred — adding an event is one entry, the type system propagates the new key automatically (2.5 narrowing discipline).
- `keyBy` types as `ReadonlyArray<string>` validated at runtime; the typed-mapped alternative (`keyBy: ReadonlyArray<keyof PayloadFor<EventType>>`) is named and not chosen for registry simplicity.
- The check-then-insert race in `claimDedup` is acceptable (14.1.4) — one duplicate per rare concurrent burst; the unique-constraint upgrade is named as the next reach.
- Per-channel `try/catch` is structural — a throw inside one channel must not prevent the other. The dispatcher swallows and logs per channel; the dispatch itself never throws on channel failure.
- The 60-second default is per-event in the registry. Widen for high-frequency events (comments, mentions: 5-10 min); for financial events, either skip dedup or use payload-discriminating keys.
- `recipientUserId` in the dedup row is load-bearing — dedup is per-recipient. Two recipients getting the same event is not a duplicate.

Codebase state at entry: registry empty, dispatcher empty, dedup empty, three schema tables stubbed.
Codebase state at exit: registry defined for three events, dispatcher callable, dedup table populated and respected, inspector's event-fire buttons work and produce `DispatchResult` (with stub channels). Channels are still `console.log` only — no real inbox rows, no email counter increment except in the stub `sent.<channel>++`. **Runnable — `dispatch()` end-to-end with dedup working.**

Estimated student time: 70 to 85 minutes.

---

## Lesson 14.2.4 — The two channels and the prefs read

Goals:

- Fill `lib/notifications/prefs.ts`: implement `readPrefsForCategory(userIds, category)` — one `WHERE userId IN (...) AND category = ?` query returning a `Map<userId, PrefRow | null>` where missing users map to `null`. Implement `resolveChannels({ event, recipientId, prefs })` — `event.channels.filter(c => (prefs.get(recipientId)?.channels[c] ?? true) || c === event.criticalChannel)`. The `?? true` is the default-on rule; the `|| critical` clause is the override.
- Wire the prefs read into the dispatcher: replace the 14.2.3 stub (`enabledChannels = eventDef.channels`) with `const prefs = await readPrefsForCategory(event.recipientUserIds, eventDef.category); const enabledChannels = resolveChannels({ event: eventDef, recipientId, prefs });`. The read happens **once per dispatch** (batched across all recipients), not per recipient.
- Track `suppressedByPrefs` — when the resolved channels list is shorter than `eventDef.channels`, increment `suppressedByPrefs` by the diff. The counter is the verification surface for the "email off, inbox on" case.
- Fill `lib/notifications/channels/inbox.ts`: implement `writeInboxRow` per the reference. One call to `event.template.inbox(payload)` for `{ title, body }`, one INSERT, no joins.
- Fill `lib/notifications/channels/email.ts`: implement `sendEmailChannel` per the reference. Resolve `to` via `getUserEmail(recipient.userId)` (throw `RECIPIENT_NOT_FOUND` on null — the dispatcher catches and logs); sign the unsubscribe token; compose `unsubscribeUrl`; render the template with the payload + unsubscribe URL; call `sendEmail` with the `List-Unsubscribe` and `List-Unsubscribe-Post: One-Click` headers (the 8.1.2 bulk-sender bar). Suppression is the wrapper's concern.
- Replace the dispatcher's stub channel calls with the real ones: for each enabled channel, call `channels[channel]({ recipient: { userId }, event: eventDef, payload: event.payload })` inside the `try/catch`. The dispatcher imports a const map `const channels = { email: sendEmailChannel, inbox: writeInboxRow } as const` so the loop is `await channels[channel](args)` with no branching.
- Wire the inspector's preferences panel: the panel reads `user_notification_preferences` for the active user via a Server Component query and renders three categories with two toggles each. Toggling posts to `setPref` Server Action (`authedAction`-wrapped) that UPSERTs the row. The `security` category's `email` toggle is rendered disabled with the tooltip.
- Run the app: with `bob` as the active user (`team` → `email` off from the seed), click `Fire invite-sent`. Confirm one `notifications` row, `MOCK_EMAIL_SENT_COUNT` unchanged, `DispatchResult.suppressedByPrefs: 1`. Switch to `alice` (no prefs rows). Fire invite-sent. Confirm one notifications row AND email counter increments — default-on. Toggle `alice`'s `team` → `inbox` off; fire; confirm email counter increments but no inbox row, `suppressedByPrefs: 1`. Reset; fire `billing-past-due` with `team` → `email` off (no override); email counter does not increment. Toggle `billing` → `email` off; fire `billing-past-due`; counter still increments — the critical-channel override held.

Senior calls and watch-outs:

- Prefs are batched across recipients — one `WHERE userId IN (...)` per dispatch, not one per recipient (6.4.2 N+1 discipline).
- `?? true` (default-on) is the load-bearing line — a senior reading the file should explain it on sight: silence-by-default is worse than friction (14.1.3).
- `|| c === event.criticalChannel` keeps the override inside `resolveChannels` — all decisions in one place.
- `writeInboxRow` renders at insert time; the inbox UI is a pure read. The render-at-display alternative is rejected for actor-name drift and join cost (14.1.2).
- `RECIPIENT_NOT_FOUND` from `getUserEmail` returning null (e.g., the seeded `eve` who is not yet a user) is swallowed by the dispatcher; the inbox channel skips because the user row doesn't exist. The 10.4 invitation email still goes via the unauthenticated `sendEmail` path; the dispatcher does not duplicate.
- `List-Unsubscribe` + `List-Unsubscribe-Post: One-Click` headers (RFC 8058) are mandatory by the 2026 bar (8.1.2). The starter's `/api/email/unsubscribe` route handles the one-click POST.
- `REGISTRY_MISS` bubbles out (not swallowed) — registry miss is a programmer error, not a channel failure. The `try/catch` is per-channel, not per-dispatch.

Codebase state at entry: dispatcher with dedup but stub channels and stub prefs; channel files empty; prefs file empty.
Codebase state at exit: full dispatcher with prefs and channels live; inspector verifies pref toggling, default-on, critical-channel override, channel independence; `MOCK_EMAIL_SENT_COUNT` is now load-bearing. **Runnable — every inspector button produces the expected effect.**

Estimated student time: 75 to 90 minutes. The chapter's heaviest lesson — channels + prefs land together because the dispatcher is only verifiable end-to-end once both are real.

---

## Lesson 14.2.5 — Wire three call sites

Goals:

- Edit `app/(app)/members/actions.ts` (the 10.4 invite action). After the transaction commits (the existing `tx.commit()` is implicit in Drizzle's `db.transaction`), call `await dispatch({ type: 'org.invitation.sent', recipientUserIds: invitee ? [invitee.id] : [], subjectId: invitation.id, payload: { invitedEmail: email, role, orgName: ctx.orgName, inviterName: ctx.userName, acceptUrl }, orgId: ctx.orgId })`. The `invitee` is resolved by `select user where email = ?`; if absent (the invited address is not a user yet), `recipientUserIds: []` and the dispatcher no-ops (per-recipient loop runs zero times). The invitation *email* itself is still sent by the existing 10.4 `sendEmail` call for the unauthenticated invite path — the dispatcher's email channel is a no-op for the absent-user case.
- Edit the role-change action in the same file. After commit, call `await dispatch({ type: 'org.member.role_changed', recipientUserIds: [memberUserId], subjectId: memberUserId, payload: { newRole, oldRole, orgName: ctx.orgName, changedByName: ctx.userName }, orgId: ctx.orgId })`. The audit-log write from 10.4 stays unchanged — both `audit_logs` (admin-facing) and `notifications` (user-facing) write for this event.
- Edit `app/api/webhooks/stripe/route.ts` (the 12.3 webhook handler). In the `onSubscriptionUpdated` branch, when the projected status is `past_due` and the previous status was not, after the `plan_entitlements` UPDATE and the audit-log write — but **still inside the outer transaction** — collect the org's owners (`select user_id from org_members where org_id = ? and role = 'owner'`); store them on a closure variable. After the transaction commits (the closure variable is now safe), call `await dispatch({ type: 'org.billing.past_due', recipientUserIds: ownerIds, subjectId: organizationId, payload: { orgName, amountDue, currentPeriodEnd }, orgId: organizationId })`. The senior call to read inside the transaction (so the owner list is consistent with the entitlement state at the moment of the transition) and dispatch after commit (so a rolled-back webhook never notifies) is named explicitly.
- Sanity-check each call site from the real surface (not the inspector) — full clause-by-clause walks live in 14.2.6. Submit a new invite for an existing user; change a member's role; `stripe trigger invoice.payment_failed`. Each should produce its notification + audit pair. Inspect the `lib/email.ts` mock console log — the rendered HTML body shows the unsubscribe URL with a signed token.

Senior calls and watch-outs:

- Dispatch runs **after** the action's transaction commits — never inside it. The pattern: `await tx`-action; `await dispatch(...)`. Notifying for state that rolls back is the failure mode 14.1.1 names.
- The webhook path is the awkward one: read the owner list inside the transaction (consistent with the transition), capture in a closure, dispatch after commit. The transactional-outbox alternative is named, deferred.
- The invite-already-a-user case produces two emails: 10.4's unauthenticated invitation email + the dispatcher's `org.invitation.sent`. Merging them is the next reach; v1 accepts the duplication because refactoring 10.4 is out of scope. Named in verify.
- The dispatcher trusts its caller — gating happens at the action boundary (10.2). A direct call from a non-action path bypasses the admin check.
- Two layers of dedup compose: `processed_events` at the webhook handler (12.1) catches duplicate deliveries; `notification_dedup` inside the dispatcher catches duplicate user-facing notifications even from distinct event IDs.
- Grep test after this lesson: `sendEmail(` outside `lib/email.ts` and `lib/notifications/channels/email.ts` → zero hits; `db.insert(notifications)` outside `lib/notifications/channels/inbox.ts` → zero hits. Structural seam enforcement.

Codebase state at entry: dispatcher full and verified via the inspector; three call sites unchanged from 10.4 / 12.3.
Codebase state at exit: three real call sites dispatch after commit; the members surface and the Stripe webhook handler both produce real notifications and emails; `/inbox` shows real rows after real actions. **Runnable — production-shaped flow end-to-end.**

Estimated student time: 50 to 65 minutes.

---

## Lesson 14.2.6 — Verify

Goals:

- Walk every "Done when" clause from the framing's verify recipe, in order. The recipe lists the steps; this lesson is the execution and the surrounding senior commentary.
- **Happy path per event:** fire each event button; confirm one inbox row + one email-counter increment per event; `DispatchResult` shows zero deduped and zero suppressed.
- **Rapid-fire dedup (the chapter's load-bearing proof):** five-in-two-seconds → one inbox row, one email increment, `deduped: 4`, one `notification_dedup` row. Wait 61 seconds, refire single → fresh dispatch, window expired. Skipping the 61-second wait leaves the student believing dedup is permanent.
- **Pref-respect:** as `bob` (seeded `team` → `email` off), fire `invite-sent` → inbox row, no email increment, `suppressedByPrefs: 1`.
- **Default-on:** reset + re-seed → `alice` has no prefs rows → fire → both channels fire. Toggle `team` → `email` off (creates the row) → refire → email skipped. Toggle back on → fires again.
- **Critical-channel override:** as `alice`, toggle `billing` → `email` off; fire `billing-past-due` → email still increments. Confirm `security` → `email` is rendered disabled.
- **Channel independence:** use the debug tools to (a) drop `notifications` briefly → email still increments; (b) force `sendEmail` to throw → inbox row still written. Each channel's failure is structurally swallowed.
- **Registry miss:** "Force registry miss" → `NotificationError('REGISTRY_MISS')` bubbles. Registry-miss is a programmer error, not a runtime-recoverable failure; the per-channel `try/catch` is per-channel, not per-dispatch.
- **Fire-after-commit:** "Wrap invite in rollback" → submit invite → no rows anywhere, no email, no dedup. The dispatcher never fired because the commit never happened.
- **Tenant isolation:** the `/inbox` page reads `userId` from session, never `orgId` from query — hand-crafted URLs do not cross tenants.
- **Three call sites end-to-end:**
  - Invite `eve@example.com` (not a user) → 10.4 invite email only, dispatcher no-ops (empty recipients).
  - Invite `bob@example.com` (existing user) → 10.4 invite email AND dispatcher fires for `bob`. Name the two-email duplication explicitly — accepted in v1 because refactoring 10.4 is out of scope.
  - Role change `bob` member → admin → audit row + notification + email. Re-firing with no change still writes (the call site fired); senior call to short-circuit no-op role changes at the action layer is named, not built.
  - `stripe trigger invoice.payment_failed` → `processed_events` + entitlement + audit + one notification per owner. Replay → `processed_events` blocks at the handler; dispatcher's dedup is a second layer that would also catch the duplicate.
- **Unsubscribe link:** copy `unsubscribeUrl` from the server-console rendered email, visit it → category's `email` toggle pre-set to off, HMAC verified. Tamper one character → 400.
- **Inbox feed query plan:** inspector's index-probe panel confirms `notifications_user_created_idx` on `(userId, createdAt desc)` and the partial `notifications_unread_idx` on `(userId) WHERE readAt IS NULL`. No `Seq Scan`.
- Name the senior calls one more time:
  - The dispatcher is the only seam — grep `sendEmail(` and `db.insert(notifications)` outside `lib/notifications/`; zero hits is the structural check.
  - The registry is the source of truth — adding an event is one entry; prefs UI, dispatcher, and templates all read from it.
  - Prefs read once per dispatch, batched across recipients, `?? true` for default-on, `|| critical` for the override.
  - Dedup inside the dispatcher, before channels, keyed by `(event_type, dedup_key, recipient_user_id)` with registry-defined window.
  - Channels independent under `try/catch`; one failing does not kill the other.
  - Fire after commit; rolled-back actions do not notify.
  - Inbox row is a dispatch-time snapshot; the inbox UI is a pure read.
- Forward references:
  - Unit 15.2 — `cacheTag('notifications', userId)` on the inbox feed when volume justifies; the project deliberately does not cache.
  - Unit 15.4 — Upstash-backed dedup replaces the table when throughput crosses the database-write threshold; dispatcher contract stays the same.
  - Unit 13.1 — Trigger.dev-backed channel queue moves channel sends behind a durable worker; dispatcher contract stays the same.
  - Unit 17.2 — audit-log line, HMAC unsubscribe-token discipline, channel-failure log discipline.
  - Unit 19.3 — integration tests for prefs-respected, default-on, dedup, channel-independence.
  - Unit 20.1 — `DispatchResult` is the structured-log shape; dashboards on dedup rate, suppression rate, channel-failure rate live there.

Senior calls and watch-outs:

- The verify lesson rehearses every failure mode the chapter exists to prevent. If a verification fails, point at the owning build lesson.
- The rapid-fire test must run as the inspector button, not five manual clicks — manual clicks span the window or hit different recipients across session switches.

Codebase state at entry: full dispatcher + three call sites + verifying surface wired.
Codebase state at exit: every "Done when" clause verified clause-by-clause; the student can articulate every primitive and which forward unit will lean on it.

Estimated student time: 35 to 50 minutes.
