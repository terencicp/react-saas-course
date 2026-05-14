# Chapter 14.2 — Project: notification dispatcher

## Chapter framing

Chapter 14.2 cashes in the four teaching lessons of 14.1 — the dispatcher seam and the notifiable-vs-logged line (14.1.1), the uniform channel-function shape (14.1.2), category-grained prefs resolved once with default-on (14.1.3), and 60-second dedup keyed by `(event_type, dedup_key, recipient_user_id)` (14.1.4) — as one runnable surface. The student writes the `notifiable_events` registry, the `dispatch(event)` function that resolves prefs and dedups before fanning out, the two channel functions (`sendEmailChannel`, `writeInboxRow`), the `user_notification_preferences` and `notification_dedup` schemas, and the wiring at three real call sites: invite-sent and role-change (10.4 Server Actions) and billing-past-due (12.3 webhook). Each build closes on a runnable state: 14.2.3 ends with `dispatch()` callable with dedup but stub channels; 14.2.4 with both channels live and prefs respected; 14.2.5 with three real call sites firing; 14.2.6 walks the "Done when" clause-by-clause.

Threads through every lesson: the dispatcher is the only seam — `dispatch` imports from `lib/notifications/index.ts` only, a grep for `sendEmail(` or `db.insert(notifications)` outside `lib/notifications/` is a red flag; the registry is the source of truth — adding an event is a one-file change; prefs read once per dispatch with default-on (`?? true`); dedup inside the dispatcher, before channels, after prefs, check-then-insert on `notification_dedup`; channel functions uniform `({ recipient, event, payload })` behind per-channel `try/catch` so one failing channel never kills the other; dispatch fires after the action's transaction commits — never inside it, transactional-outbox alternative named and deferred; inbox rows rendered at dispatch time so the row is a snapshot, not a live join; `{ sent, deduped, suppressedByPrefs }` is the observability shape every call site logs.

### Dependency carry-in

- **From 14.1.1:** `dispatch(event)` contract — input `{ type, recipientUserIds, subjectId, payload }`, return `{ sent, deduped, suppressedByPrefs }`; fire-after-commit; notifiable-vs-logged-event line.
- **From 14.1.2:** uniform channel signature `({ recipient, event, payload }) => Promise<void>`; render-at-dispatch for inbox rows; channel independence under `try/catch`; `notifications` row shape.
- **From 14.1.3:** `user_notification_preferences` `(user_id, category)` unique with per-channel booleans; category-level granularity; default-on; critical-channel override; `resolveChannels`.
- **From 14.1.4:** `notification_dedup` `(event_type, dedup_key, recipient_user_id, fired_at)` + composite index; 60-second default with per-event override; check-then-insert race accepted; order — registry → prefs → dedup → channels.
- **From 10.4:** `tenantDb(orgId)`, `authedAction(role, schema, fn)`, active-org slot in session, `audit_logs` + `writeAuditLog(tx, event)`. Invite-sent and role-change actions live here.
- **From 8.3:** `sendEmail(to, template)` in `lib/email.ts`; `email_suppressions` read inside the wrapper (8.1.4); transactional sender split (8.1.3); unsubscribe-link discipline (8.1.2).
- **From 9.5:** Better Auth's `user` table with `id` and `email`; `getUserEmail(userId)` helper added in the starter.
- **From 12.3:** `processed_events` and the webhook handler that triggers `billing.past_due` — the handler dispatches after commit.
- **From 7.2 + 7.6:** canonical Result shape, Zod 4 strictObject at the action boundary, `'use server'`.
- **From 2.9:** `NotificationError` subclass with codes `REGISTRY_MISS | RECIPIENT_NOT_FOUND` — non-fatal channel failures are logged inside the dispatcher, never thrown.
- **From 6.6:** Drizzle setup, `db.transaction`, `ON CONFLICT` upserts, composite-index discipline.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
.env.example                    # provided: DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY,
                                #           STRIPE_WEBHOOK_SECRET (from 12.3), APP_URL,
                                #           NOTIFICATION_UNSUBSCRIBE_SECRET (HMAC token signing)
package.json                    # provided: db:migrate, db:seed, dev, build, stripe:listen
scripts/
  seed.ts                       # provided: two orgs, four users, one seeded invitation for
                                #           a non-user (RECIPIENT_NOT_FOUND target), one user
                                #           with team→email pref off (suppression target);
                                #           a second user with no prefs row (default-on target)
src/
  db/
    schema.ts                   # provided: users (Better Auth), organizations + org_members
                                #           + audit_logs (10.4), invitations (10.4),
                                #           plan_entitlements (12.3); three stub tables
                                #           commented out — TODO student fills in 14.2.3/4
    client.ts                   # provided
    relations.ts                # provided
  lib/
    tenant-db.ts                # provided
    authed-action.ts            # provided
    audit-log.ts                # provided
    email.ts                    # provided (Unit 8): sendEmail(to, template, { tags, headers });
                                #           inspector-mode mock bumps MOCK_EMAIL_SENT_COUNT
    notifications/
      registry.ts               # TODO student: notifiable_events typed map
      types.ts                  # provided: DispatchEvent, DispatchResult, Channel, Recipient
      errors.ts                 # provided: NotificationError subclass
      dispatcher.ts             # TODO student: dispatch(event)
      prefs.ts                  # TODO student: resolveChannels + batched read
      dedup.ts                  # TODO student: claimDedup helper
      channels/
        email.ts                # TODO student: sendEmailChannel
        inbox.ts                # TODO student: writeInboxRow
      tokens.ts                 # provided: sign/verify unsubscribe tokens (HMAC, 30-day exp)
      index.ts                  # TODO student: re-export dispatch + types
  emails/
    InviteSentEmail.tsx         # provided React Email templates
    RoleChangedEmail.tsx        # provided
    BillingPastDueEmail.tsx     # provided
  app/
    (app)/
      members/
        actions.ts              # provided shell from 10.4; TODO student adds dispatch() calls
      api/webhooks/stripe/
        route.ts                # provided (12.3); TODO student adds dispatch() in past-due branch
      inbox/page.tsx            # provided: server-rendered notifications list for the user
    inspector/page.tsx          # provided: prefs toggles, fire-event buttons (single + rapid-fire),
                                #           inbox panel, email-sent counter, dedup-count badge,
                                #           processed_events tail, debug tools, reset-and-re-seed
```

### Reference solution signatures lessons display

- **Registry** (`lib/notifications/registry.ts`):
  - `notifiable_events = { 'org.invitation.sent': {...}, 'org.member.role_changed': {...}, 'org.billing.past_due': {...} } as const satisfies Record<string, EventDefinition>`.
  - Entry shape: `{ category: 'team' | 'billing' | 'security', channels: ReadonlyArray<'email' | 'inbox'>, dedup: { windowSeconds: number; keyBy: ReadonlyArray<string> }, template: { email: ComponentType<Payload>; inbox: (p: Payload) => { title: string; body: string } }, emailSubject: (p: Payload) => string, criticalChannel?: 'email' | 'inbox' }`.
  - `'org.invitation.sent'` — `category: 'team'`, `channels: ['email', 'inbox']`, `dedup: { windowSeconds: 60, keyBy: ['subject_id'] }`.
  - `'org.member.role_changed'` — `category: 'team'`, `channels: ['email', 'inbox']`, `dedup: { windowSeconds: 60, keyBy: ['subject_id', 'newRole'] }`.
  - `'org.billing.past_due'` — `category: 'billing'`, `channels: ['email', 'inbox']`, `dedup: { windowSeconds: 60, keyBy: ['subject_id'] }`, `criticalChannel: 'email'`.
- **Dispatch** (`lib/notifications/dispatcher.ts`):
  - `dispatch(event: DispatchEvent): Promise<DispatchResult>` where `DispatchEvent = { type: EventType; recipientUserIds: ReadonlyArray<string>; subjectId: string; payload: PayloadFor<EventType>; orgId?: string }` and `DispatchResult = { sent: { email: number; inbox: number }; deduped: number; suppressedByPrefs: number }`.
  - Body order: registry lookup (throw `REGISTRY_MISS` if unknown) → batched prefs read → per-recipient loop: `resolveChannels` → `claimDedup` (skip on hit, increment `deduped`) → for each enabled channel call inside `try/catch` (increment per-channel `sent`, log + swallow per-channel failures).
- **Prefs** (`lib/notifications/prefs.ts`):
  - `readPrefsForCategory(userIds, category): Promise<Map<userId, PrefRow | null>>` — one `WHERE userId IN (...) AND category = ?` query.
  - `resolveChannels({ event, recipientId, prefs })` — `event.channels.filter(c => (prefs.get(recipientId)?.channels[c] ?? true) || c === event.criticalChannel)`.
- **Dedup** (`lib/notifications/dedup.ts`):
  - `claimDedup(tx, { eventType, dedupKey, recipientUserId, windowSeconds }): Promise<{ claimed: boolean }>` — selects most-recent row in window; if absent, inserts and returns `claimed: true`. Composite index `(event_type, dedup_key, recipient_user_id, fired_at desc)`.
  - `computeDedupKey(eventDef, payload): string` — joins `keyBy` values with `:`.
- **Email channel** (`lib/notifications/channels/email.ts`):
  - `sendEmailChannel({ recipient, event, payload }): Promise<void>` — resolves email via `getUserEmail(recipient.userId)` (throws `RECIPIENT_NOT_FOUND` on null), signs unsubscribe token, renders template with `{ ...payload, unsubscribeUrl }`, calls `sendEmail(to, template, { subject, tags, headers: List-Unsubscribe + List-Unsubscribe-Post })`. Suppression is the wrapper's concern.
- **Inbox channel** (`lib/notifications/channels/inbox.ts`):
  - `writeInboxRow({ recipient, event, payload }): Promise<void>` — renders `event.template.inbox(payload)` once, inserts one row.
- **`notifications` table:**
  - `id uuid pk default gen_random_uuid()`, `userId uuid not null references users(id) on delete cascade`, `orgId uuid references organizations(id) on delete cascade` (nullable), `eventType text not null`, `subjectId text not null`, `title text not null`, `body text not null`, `payload jsonb not null default '{}'::jsonb`, `readAt timestamptz`, `createdAt timestamptz not null default now()`.
  - Composite index `(userId, createdAt desc)`; partial index `(userId) WHERE readAt IS NULL`.
- **`user_notification_preferences` table:**
  - `userId uuid not null references users(id) on delete cascade`, `category text not null`, `channels jsonb not null default '{"email": true, "inbox": true}'::jsonb`, `updatedAt timestamptz not null default now()`. PK `(userId, category)`.
- **`notification_dedup` table:**
  - `eventType text not null`, `dedupKey text not null`, `recipientUserId uuid not null references users(id) on delete cascade`, `firedAt timestamptz not null default now()`. Composite index `(eventType, dedupKey, recipientUserId, firedAt desc)`. No PK — append-with-TTL.
- **Call-site shape** (`app/(app)/members/actions.ts`):
  - `inviteMember = authedAction('admin', inviteSchema, async ({ email, role }, ctx) => { const inv = await tenantDb(ctx.orgId).transaction(...); await dispatch({ type: 'org.invitation.sent', recipientUserIds: invitee ? [invitee.id] : [], subjectId: inv.id, payload: { invitedEmail: email, role, orgName, inviterName, acceptUrl }, orgId: ctx.orgId }); return { ok: true, data: inv }; })`.
  - The implicit `tx.commit()` happens *before* `dispatch` — dispatcher is never inside the transaction.
- **Env entries:** existing from 10.4 + 12.3; new `NOTIFICATION_UNSUBSCRIBE_SECRET` (HMAC, 32+ bytes via `openssl rand -base64 32`).

### Inspector page spec

Single Server Component at `/inspector`, the verification surface for every "Done when" clause. Reads server-side, refreshes on submit via `router.refresh()`.

- **Header:** session-user switcher (admin/member per seeded org), org switcher (two seeded orgs), "Reset and re-seed" Server Action (truncates three notification tables, re-seeds).
- **Preferences panel:** for the active user, three categories (`team`, `billing`, `security`) with per-channel toggles. The `security` category's `email` is rendered disabled with a tooltip; toggling it has no effect server-side. Other toggles post to `setPref`.
- **Fire-event buttons:** `Fire invite-sent`, `Fire role-changed`, `Fire billing-past-due` — each posts a Server Action that calls `dispatch()` with a fixed payload against the active user.
- **Rapid-fire buttons:** `Rapid-fire X (5x in 2s)` per event — calls `dispatch()` five times in a tight loop against the same recipient/subject. Deterministic dedup verification, more reliable than manual clicks.
- **Inbox panel:** last 20 `notifications` rows for the active user, descending by `createdAt`, with `eventType`, `subjectId`, `title`, `createdAt`, `readAt`.
- **Email-sent counter:** count of `sendEmail` calls in the current session via `MOCK_EMAIL_SENT_COUNT`. The starter's `lib/email.ts` mocks Resend in inspector mode, bumps the counter, and logs rendered HTML to the server console. Counter resets with "Reset and re-seed".
- **Dedup-count badge:** running total of `deduped` from the most-recent `DispatchResult`.
- **Processed-events tail (from 12.3):** existing panel streaming `processed_events` — used for the billing-past-due webhook path.
- **Debug tools:** `Force registry miss` (renders the `NotificationError`); `Make email fail` (sets a flag that makes `sendEmail` throw — verifies channel independence); `Wrap invite in rollback` (forces the invite action's outer transaction to roll back — verifies fire-after-commit); `Tampered unsubscribe token`.

The inspector is provided in full; the student writes only dispatcher, channels, prefs, dedup, registry, and the three call-site additions.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Invite-sent fires one email + one inbox row (where prefs allow) | Click `Fire invite-sent` as admin. One new `notifications` row with matching `eventType`/`subjectId`/`title`; `MOCK_EMAIL_SENT_COUNT += 1`; `DispatchResult = { sent: { email: 1, inbox: 1 }, deduped: 0, suppressedByPrefs: 0 }`. |
| Rapid-fire 5x in 2s → one of each, not five | `Rapid-fire invite-sent (5x in 2s)`. Exactly one new inbox row, one email increment, aggregated `deduped: 4`. One row in `notification_dedup`. |
| Disabling email in prefs keeps inbox, suppresses email | Toggle `team` → `email` off; fire `invite-sent`. New inbox row; counter unchanged; `suppressedByPrefs: 1`. |
| Default-on for missing prefs row | Reset + re-seed; confirm no prefs row for the target user; fire `invite-sent`; both inbox and email increment. |
| Critical-channel override | Toggle `billing` → `email` off; fire `billing-past-due` (has `criticalChannel: 'email'`); email still increments. |
| Call-site — invite sent | From `/members`, invite an existing user; action commits then dispatches; one inbox row + email for the invitee. |
| Call-site — role changed | From `/members`, change a member's role; both `audit_logs` and `notifications` write; one email increment for the affected member. |
| Call-site — billing past due | `stripe trigger invoice.payment_failed`; webhook commits then dispatches to org owners; one inbox row + email per owner. |
| Channel independence — inbox failure does not kill email | Debug tool makes `writeInboxRow` throw; fire `invite-sent`; email counter still increments; the dispatch log shows the inbox error swallowed. |
| Fire after commit — rolled-back actions do not notify | Debug tool wraps the invite action in a transaction that always rolls back; submit; no rows anywhere, no email increment. |
| Tenant isolation | `/inbox` reads `userId` from session, never `orgId` from query; cross-tenant hand-crafted URLs do not leak. |

### Concepts demonstrated → owning lesson

- Dispatcher as the one named seam, call-site/channel separation — 14.1.1.
- `notifiable_events` registry — fields, source-of-truth rule — 14.1.1.
- Notifiable-vs-logged line, `notifications` vs. `audit_logs` audience-driven — 14.1.1.
- Dispatcher contract (`DispatchEvent` in, `DispatchResult` out), fire-after-commit — 14.1.1.
- Uniform channel signature, channel independence under `try/catch` — 14.1.2.
- Render-at-dispatch over render-at-display — 14.1.2.
- `notifications` shape, inbox feed query, partial index on unread — 14.1.2 + 6.4.1.
- Email channel calling Unit 8 wrapper, unsubscribe HMAC — 14.1.2 + 3.7.1.
- `user_notification_preferences` shape, `(userId, category)` unique, default-on, critical override — 14.1.3.
- Batched prefs read — 14.1.3 + 6.4.2 (N+1).
- `notification_dedup` shape, 60-second window, registry-defined `keyBy`, composite index, check-then-insert race accepted — 14.1.4.
- Dispatcher order — 14.1.4.
- `authedAction`, `tenantDb`, audit-log writes — 10.2 / 10.4.
- Webhook transaction-then-commit-then-dispatch — 12.1 / 12.3.
- React Email templates, plain-text fallback, unsubscribe header — 8.2 / 8.1.2.
- Result shape, Zod 4 `z.strictObject` — 7.1 / 7.2.

---

## Lesson 14.2.1 — Project brief

Goals:

- Frame the build: the dispatcher is the one seam, the registry is the source of truth, prefs read once per dispatch, 60-second dedup window, three real call sites (invite, role change, billing past-due) prove the pattern earns its weight by needing more than one channel and more than one preference resolution. Show one screenshot of the inspector with the three event buttons, the inbox panel populated, the email counter at 3, and the prefs panel.
- State the "Done when" in one paragraph: three event-fires each produce one inbox row + one email; rapid-fire 5x in 2s on any event produces exactly one inbox row + one email plus `deduped: 4`; toggling `team` → `email` off and firing `invite-sent` produces an inbox row but no email; resetting and re-seeding (no prefs rows) defaults to "on"; the three real call sites each dispatch after commit.
- Scope cuts: no push/SMS/Slack (named as future additions); no quiet hours/digest (named, deferred to a later unit); no Trigger.dev-backed channel queue (named as the durable upgrade in 14.1.1, deferred to Unit 13.1); no coalesce — dedup only; no per-org admin override on member prefs; no transactional-outbox (the dispatcher is called after commit, loss-on-crash window accepted in v1); no inbox UI past `/inbox` server-rendered list; no full settings page (inspector's prefs panel is the verification surface).
- Senior payoff: the dispatcher is the canonical shape every later notification feature copies. Adding push later is one new channel function with the same signature; adding an event is one registry entry; muting noise per category is the user's lever.
- Show the end UX: a short capture clicking `Fire invite-sent` (inbox +1, email +1), `Rapid-fire 5x` (inbox +1, dedup badge "4 deduped"), toggle email off and refire (inbox grows, counter does not).
- Link the starter via `degit`.

Senior calls and watch-outs:

- The starter ships 10.4 + 12.3 working — members surface, Stripe webhook, audit log. This project is layering the dispatcher on top, not rewriting; the only changes at call sites are two lines (`await dispatch(...)` plus the import).
- `MOCK_EMAIL_SENT_COUNT` is the inspector's verification proxy because real Resend round-trips during development are slow and rate-limited. The starter's `lib/email.ts` mocks Resend in inspector mode and logs rendered HTML to the server console. Student does not change `lib/email.ts`.
- `NOTIFICATION_UNSUBSCRIBE_SECRET` must be generated locally and put in `.env.local`. Starter's `tokens.ts` is provided.
- Stripe-CLI setup inherited from 12.3 — needs `stripe listen` running for the billing-past-due verification. If 12.3 skipped, the inspector's `Fire billing-past-due` button replaces it.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, Postgres up, schema migrated, seed loaded, `pnpm dev` shows the 10.4 members surface working; `/inspector` shell loads but every fire button errors (`dispatch` undefined); `/inbox` renders empty.

Estimated student time: 15 to 25 minutes.

---

## Lesson 14.2.2 — Starter walkthrough

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on six files: `lib/notifications/registry.ts` (empty — 14.2.3), `dispatcher.ts` (empty — 14.2.3), `prefs.ts` (empty — 14.2.4), `dedup.ts` (empty — 14.2.3), `channels/email.ts` and `inbox.ts` (empty — 14.2.4), and `app/(app)/members/actions.ts` (provided from 10.4, no `dispatch` calls yet — 14.2.5).
- Read the schema: the three stub tables (`notifications`, `user_notification_preferences`, `notification_dedup`) are commented-out blocks in `db/schema.ts` with TODO markers naming the lesson that fills each. The existing 10.4 + 12.3 tables (`users`, `organizations`, `org_members`, `invitations`, `audit_logs`, `processed_events`, `plan_entitlements`) are unchanged.
- Read the seed: two orgs, four users (`alice@`, `bob@` in org A as admin/member; `carol@`, `dan@` in org B); one seeded invitation for `eve@example.com` (non-user, `RECIPIENT_NOT_FOUND` target); one explicit prefs row turning `team` → `email` off for `bob` (suppression target); `alice` has no prefs row (default-on target).
- Read the inspector end-to-end — every panel, button, debug tool. It is the verification surface for every later lesson.
- Read provided pieces in `lib/notifications/`: `types.ts` (full TypeScript shapes for `DispatchEvent`/`DispatchResult`/`Channel`/`Recipient`/`EventDefinition`), `errors.ts` (`NotificationError` extends `BaseError` from 2.9), `tokens.ts` (HMAC sign + verify, 30-day expiry). The three React Email templates in `src/emails/` are full components — student does not author email JSX.
- Run the app: members page renders; invite submission writes `invitations` + `audit_logs` (no notification yet — that's what this project ships); `/inbox` empty; inspector loads but fire buttons throw.

Senior calls and watch-outs:

- `lib/notifications/index.ts` will be the only export surface — call sites import `dispatch` from here, never reach into the channel files. Matches `lib/billing/index.ts` from 12.3.
- The seed's `bob`-with-email-off and `alice`-with-no-row are the deterministic verification targets. Resetting restores them.
- React Email templates accept `{ unsubscribeUrl: string }` as part of their payload — the email channel must thread the URL through, not hard-code it.

Codebase state at entry: starter cloned, Postgres running, schema migrated, seed loaded.
Codebase state at exit: every provided file read, inspector clicked through, members page tried, `/inbox` empty. No code written.

Estimated student time: 20 to 30 minutes.

---

## Lesson 14.2.3 — The registry, the dispatcher, and dedup

Goals:

- Fill `db/schema.ts`: uncomment the three stub tables per reference. `pnpm db:generate --name add_notifications`, inspect SQL (three `CREATE TABLE`s, three composite indexes, one partial index on unread), `pnpm db:migrate`. Confirm in Drizzle Studio.
- Fill `lib/notifications/registry.ts`: define `notifiable_events` with the three keys per reference. Import the three React Email templates. Type with `satisfies Record<string, EventDefinition>` so unknown keys are flagged.
- Fill `lib/notifications/dedup.ts`: implement `claimDedup(tx, { eventType, dedupKey, recipientUserId, windowSeconds })`. SELECT most-recent row for the triple with `firedAt > NOW() - INTERVAL '${windowSeconds} seconds'`; if exists return `{ claimed: false }`; else INSERT and return `{ claimed: true }`. Implement `computeDedupKey(eventDef, payload)` — joins `keyBy` payload values with `:`.
- Fill `lib/notifications/dispatcher.ts`: write `dispatch(event)` per reference. Order: lookup `notifiable_events[event.type]` → throw `NotificationError('REGISTRY_MISS')` if absent; per-recipient loop; **stub** prefs with `const enabledChannels = eventDef.channels` (full prefs in 14.2.4); compute `dedupKey`; `claimDedup`; on hit, increment `deduped` and continue; on claim, fan out — **stub** channel calls with `console.log` plus `sent.<channel>++` (full channels in 14.2.4). Wrap each channel call in `try/catch`.
- Write `lib/notifications/index.ts`: re-export `dispatch`, the event-type union, and `DispatchEvent`. Mark `'server-only'` at the top.
- Wire the inspector's three fire buttons to call `dispatch()` with fixed payloads (the action stubs are already there; student adds imports + dispatch calls).
- Run the app: click `Fire invite-sent` → `DispatchResult` shows `{ sent: { email: 1, inbox: 1 }, deduped: 0, suppressedByPrefs: 0 }` (stubs increment the counter); one row in `notification_dedup`. Click again within 60s → `deduped: 1`, no second dedup row. `Rapid-fire (5x in 2s)` → `deduped: 4` aggregated. Wait 61 seconds, fire again → fresh dispatch, dedup released.

Senior calls and watch-outs:

- The registry is `const`-asserted with `satisfies` so the event-type union is inferred — adding an event is one entry, types propagate (2.5 narrowing discipline).
- `keyBy` typed as `ReadonlyArray<string>` validated at runtime; the typed-mapped alternative (`ReadonlyArray<keyof PayloadFor<EventType>>`) is named, not chosen for registry simplicity.
- Check-then-insert race in `claimDedup` accepted (14.1.4) — one duplicate per rare concurrent burst; unique-constraint upgrade is the next reach.
- Per-channel `try/catch` is structural — one channel's throw must not prevent the other. The dispatcher swallows and logs per channel; dispatch never throws on channel failure.
- 60-second default is per-event in the registry. Widen for high-frequency events (comments, mentions: 5-10 min); for financial events, either skip dedup or use payload-discriminating keys.
- `recipientUserId` in the dedup row is load-bearing — dedup is per-recipient. Two recipients getting the same event is not a duplicate.

Codebase state at entry: registry empty, dispatcher empty, dedup empty, three stub tables.
Codebase state at exit: registry defined for three events, dispatcher callable, dedup populated and respected, inspector's fire buttons produce `DispatchResult`. Channels still `console.log` — no real inbox rows, no real email-counter increment. **Runnable — `dispatch()` end-to-end with dedup working.**

Estimated student time: 70 to 85 minutes.

---

## Lesson 14.2.4 — The two channels and the prefs read

Goals:

- Fill `lib/notifications/prefs.ts`: implement `readPrefsForCategory(userIds, category)` — one `WHERE userId IN (...) AND category = ?` query returning a `Map<userId, PrefRow | null>` (missing users map to `null`). Implement `resolveChannels({ event, recipientId, prefs })` — `event.channels.filter(c => (prefs.get(recipientId)?.channels[c] ?? true) || c === event.criticalChannel)`. The `?? true` is the default-on rule; the `|| critical` clause is the override.
- Wire the prefs read into the dispatcher: replace the 14.2.3 stub with the batched read before the per-recipient loop and the `resolveChannels` call inside the loop. The read happens **once per dispatch**, not per recipient.
- Track `suppressedByPrefs` — when `resolveChannels` returns fewer channels than `eventDef.channels`, increment by the diff.
- Fill `lib/notifications/channels/inbox.ts`: implement `writeInboxRow` per reference. One call to `event.template.inbox(payload)`, one INSERT, no joins.
- Fill `lib/notifications/channels/email.ts`: implement `sendEmailChannel` per reference. Resolve `to` via `getUserEmail` (throw `RECIPIENT_NOT_FOUND` on null — dispatcher catches); sign unsubscribe token; compose `unsubscribeUrl`; render template with payload + unsubscribe URL; call `sendEmail` with `List-Unsubscribe` + `List-Unsubscribe-Post: One-Click` headers (8.1.2 bulk-sender bar). Suppression is the wrapper's concern.
- Replace dispatcher's stub channel calls with real ones. The dispatcher imports `const channels = { email: sendEmailChannel, inbox: writeInboxRow } as const` so the loop is `await channels[channel](args)` with no branching.
- Wire the inspector's preferences panel: Server Component reads `user_notification_preferences` for the active user; toggles post to `setPref` (`authedAction`-wrapped) that UPSERTs. The `security` → `email` toggle is rendered disabled with the tooltip.
- Run the app: as `bob` (seeded `team` → `email` off), `Fire invite-sent` → one new inbox row, counter unchanged, `suppressedByPrefs: 1`. Switch to `alice` (no prefs row), fire → inbox + email increment (default-on). Toggle `alice` `team` → `inbox` off, fire → email only. Reset; with `team` → `email` off, fire `billing-past-due` → email still increments (critical-channel override held).

Senior calls and watch-outs:

- Prefs are batched across recipients — one `WHERE userId IN (...)` per dispatch, not one per recipient (6.4.2 N+1 discipline).
- `?? true` (default-on) is the load-bearing line — a senior reading the file should explain it on sight: silence-by-default is worse than friction (14.1.3).
- `|| c === event.criticalChannel` keeps the override inside `resolveChannels` — all decisions in one place.
- `writeInboxRow` renders at insert time; the inbox UI is a pure read. Render-at-display is rejected for actor-name drift and join cost (14.1.2).
- `RECIPIENT_NOT_FOUND` from `getUserEmail` returning null (e.g., seeded `eve` who is not yet a user) is swallowed by the dispatcher; the inbox channel skips because the user row doesn't exist. The 10.4 invitation email still goes via the unauthenticated `sendEmail` path; the dispatcher does not duplicate.
- `List-Unsubscribe` + `List-Unsubscribe-Post: One-Click` headers (RFC 8058) are mandatory by the 2026 bar (8.1.2). Starter's `/api/email/unsubscribe` route handles the POST.
- `REGISTRY_MISS` bubbles out (not swallowed) — registry miss is a programmer error, not a channel failure. The `try/catch` is per-channel, not per-dispatch.

Codebase state at entry: dispatcher with dedup but stub channels and stub prefs.
Codebase state at exit: full dispatcher with prefs and channels live; inspector verifies pref toggling, default-on, critical-channel override, channel independence; `MOCK_EMAIL_SENT_COUNT` is now load-bearing. **Runnable — every inspector button produces the expected effect.**

Estimated student time: 75 to 90 minutes. The chapter's heaviest lesson — channels + prefs land together because the dispatcher is only verifiable end-to-end once both are real.

---

## Lesson 14.2.5 — Wire three call sites

Goals:

- Edit `app/(app)/members/actions.ts` (10.4 invite action). After the transaction commits, call `await dispatch({ type: 'org.invitation.sent', recipientUserIds: invitee ? [invitee.id] : [], subjectId: invitation.id, payload: { invitedEmail, role, orgName, inviterName, acceptUrl }, orgId: ctx.orgId })`. `invitee` is resolved by `select user where email = ?`; if absent, `recipientUserIds: []` and the dispatcher no-ops. The 10.4 invitation email still sends via the unauthenticated path for the absent-user case.
- Edit the role-change action. After commit, call `await dispatch({ type: 'org.member.role_changed', recipientUserIds: [memberUserId], subjectId: memberUserId, payload: { newRole, oldRole, orgName, changedByName }, orgId: ctx.orgId })`. The 10.4 audit-log write stays unchanged — both `audit_logs` (admin-facing) and `notifications` (user-facing) write.
- Edit `app/api/webhooks/stripe/route.ts` (12.3 handler). In the `onSubscriptionUpdated` past-due branch, after the `plan_entitlements` UPDATE and audit-log write — **still inside the outer transaction** — collect the org's owners (`select user_id from org_members where org_id = ? and role = 'owner'`) into a closure variable. After commit, call `await dispatch({ type: 'org.billing.past_due', recipientUserIds: ownerIds, subjectId: organizationId, payload: { orgName, amountDue, currentPeriodEnd }, orgId: organizationId })`. Read inside transaction (consistent with the transition); dispatch after commit (no notification for rolled-back state).
- Sanity-check each call site from the real surface — full clause-by-clause walks live in 14.2.6. Submit a new invite for an existing user; change a member's role; `stripe trigger invoice.payment_failed`. Each should produce its notification + audit pair. Inspect the `lib/email.ts` mock console log — the rendered HTML body shows the unsubscribe URL with a signed token.

Senior calls and watch-outs:

- Dispatch runs **after** the action's transaction commits — never inside it. The pattern: `await tx`-action; `await dispatch(...)`. Notifying for state that rolls back is the failure mode 14.1.1 names.
- The webhook path is the awkward one: read the owner list inside the transaction (consistent with the transition), capture in a closure, dispatch after commit. The transactional-outbox alternative is named, deferred.
- The invite-already-a-user case produces two emails: 10.4's unauthenticated invitation email + the dispatcher's `org.invitation.sent`. Merging them is the next reach; v1 accepts the duplication because refactoring 10.4 is out of scope. Named in verify.
- The dispatcher trusts its caller — gating happens at the action boundary (10.2). A direct call from a non-action path bypasses the admin check.
- Two layers of dedup compose: `processed_events` at the webhook handler (12.1) catches duplicate deliveries; `notification_dedup` inside the dispatcher catches duplicate user-facing notifications even from distinct event IDs.
- Grep test after this lesson: `sendEmail(` outside `lib/email.ts` and `lib/notifications/channels/email.ts` → zero hits; `db.insert(notifications)` outside `lib/notifications/channels/inbox.ts` → zero hits. Structural seam enforcement.

Codebase state at entry: dispatcher full and verified via inspector; three call sites unchanged.
Codebase state at exit: three real call sites dispatch after commit; members surface and Stripe webhook produce real notifications and emails; `/inbox` shows real rows. **Runnable — production-shaped flow end-to-end.**

Estimated student time: 50 to 65 minutes.

---

## Lesson 14.2.6 — Verify

Goals:

- Walk every "Done when" clause from the framing's verify recipe in order. The recipe lists the steps; this lesson is the execution and the surrounding senior commentary.
- **Happy path per event:** fire each event button; confirm one inbox row + one email-counter increment per event; `DispatchResult` shows zero deduped and zero suppressed.
- **Rapid-fire dedup (the chapter's load-bearing proof):** five-in-two-seconds → one inbox row, one email increment, `deduped: 4`, one `notification_dedup` row. Wait 61 seconds, refire single → fresh dispatch, window expired. Skipping the 61-second wait leaves the student believing dedup is permanent.
- **Pref-respect:** as `bob` (seeded `team` → `email` off), fire `invite-sent` → inbox row, no email increment, `suppressedByPrefs: 1`.
- **Default-on:** reset + re-seed → `alice` has no prefs rows → fire → both channels fire. Toggle `team` → `email` off (creates the row) → refire → email skipped. Toggle back on → fires again.
- **Critical-channel override:** as `alice`, toggle `billing` → `email` off; fire `billing-past-due` → email still increments. The `security` → `email` toggle is rendered disabled on the prefs panel.
- **Channel independence:** debug tools (a) drop `notifications` briefly → email still increments; (b) force `sendEmail` to throw → inbox row still written. Each channel's failure is structurally swallowed.
- **Registry miss:** "Force registry miss" → `NotificationError('REGISTRY_MISS')` bubbles. Registry-miss is a programmer error; the per-channel `try/catch` is per-channel, not per-dispatch.
- **Fire-after-commit:** "Wrap invite in rollback" → submit invite → no rows anywhere, no email, no dedup. The dispatcher never fired because the commit never happened.
- **Tenant isolation:** `/inbox` reads `userId` from session, never `orgId` from query — hand-crafted URLs do not cross tenants.
- **Three call sites end-to-end:**
  - Invite `eve@example.com` (not a user) → 10.4 invite email only, dispatcher no-ops.
  - Invite `bob@example.com` (existing user) → 10.4 invite email AND dispatcher fires for `bob`. Name the two-email duplication explicitly — accepted in v1.
  - Role change `bob` member → admin → audit row + notification + email. Re-firing with no change still writes (the call site fired); senior call to short-circuit no-op role changes at the action layer is named, not built.
  - `stripe trigger invoice.payment_failed` → `processed_events` + entitlement + audit + one notification per owner. Replay → `processed_events` blocks at the handler; dispatcher's dedup is a second layer.
- **Unsubscribe link:** copy `unsubscribeUrl` from the server-console rendered email, visit it → category's `email` toggle pre-set to off, HMAC verified. Tamper one character → 400.
- **Inbox feed query plan:** the inspector's index-probe panel confirms `(userId, createdAt desc)` and the partial `(userId) WHERE readAt IS NULL` indexes are picked. No `Seq Scan`.
- Name the senior calls one more time:
  - The dispatcher is the only seam — grep `sendEmail(` and `db.insert(notifications)` outside `lib/notifications/`; zero hits is the structural check.
  - The registry is the source of truth; adding an event is one entry.
  - Prefs read once per dispatch, batched across recipients, `?? true` for default-on, `|| critical` for the override.
  - Dedup inside the dispatcher, before channels, keyed by `(event_type, dedup_key, recipient_user_id)` with the registry-defined window.
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
