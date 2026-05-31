# Chapter 071 — Project: notification dispatcher

## Chapter framing

Chapter 071 cashes in the four teaching lessons of chapter 070 — the dispatcher seam and the notifiable-vs-logged line (lesson 1 of chapter 070), the uniform channel-function shape (lesson 2 of chapter 070), category-grained prefs resolved once with default-on (lesson 3 of chapter 070), and 60-second dedup keyed by `(event_type, dedup_key, recipient_user_id)` (lesson 4 of chapter 070) — as one runnable surface.
The student writes the `notifiable_events` registry, the `dispatch(event)` function that resolves prefs and dedups before fanning out, the two channel functions (`sendEmailChannel`, `writeInboxRow`), the `user_notification_preferences` and `notification_dedup` schemas, and the wiring at three real call sites: invite-sent and role-change (chapter 059 Server Actions) and billing-past-due (chapter 065 webhook).
Each build closes on a runnable state: the registry/dedup lesson ends with `dispatch()` callable with dedup but stub channels; the channels/prefs lesson with both channels live and prefs respected; the call-site lesson with three real call sites firing.

The project's verifiable outcomes are runtime behaviors observed through the `/inspector` and `/inbox` surfaces: a `DispatchResult` shape (`{ sent, deduped, suppressedByPrefs }`), an inbox row appearing, the email-sent counter incrementing, and dedup suppressing duplicates.
Every Implementation lesson's requirements are phrased as one of these confirmable behaviors.

The project's stated goals — what "done" means:

- Each of the three event-fires produces one inbox row plus one email where prefs allow.
- Rapid-firing any event five times in two seconds produces exactly one inbox row plus one email, with `deduped: 4` aggregated and one `notification_dedup` row.
- Toggling `team` → `email` off and firing `invite-sent` produces an inbox row but no email, with `suppressedByPrefs: 1`.
- A recipient with no preferences row defaults to on — both channels fire.
- A `billing-past-due` event with `billing` → `email` toggled off still sends email, because the registry marks email the critical channel.
- The three real call sites each dispatch after their transaction commits: invite-sent and role-change from `/members`, billing-past-due from the Stripe webhook.
- One channel failing never kills the other — an inbox-write failure still lets the email send, and vice versa.
- A rolled-back action notifies nobody — no rows anywhere, no email increment.
- The inbox reads `userId` from the session, never `orgId` from a query, so hand-crafted cross-tenant URLs do not leak.
- A registry miss surfaces as a `NotificationError('REGISTRY_MISS')` rather than a swallowed channel failure.
- The unsubscribe link in the rendered email carries a signed HMAC token; tampering with one character returns a 400.

Threads through every lesson: the dispatcher is the only seam — `dispatch` imports from `lib/notifications/index.ts` only, a grep for `sendEmail(` or `db.insert(notifications)` outside `lib/notifications/` is a red flag; the registry is the source of truth — adding an event is a one-file change; prefs read once per dispatch with default-on (`?? true`); dedup inside the dispatcher, before channels, after prefs, check-then-insert on `notification_dedup`; channel functions uniform `({ recipient, event, payload })` behind per-channel `try/catch` so one failing channel never kills the other; dispatch fires after the action's transaction commits — never inside it, transactional-outbox alternative named and deferred; inbox rows rendered at dispatch time so the row is a snapshot, not a live join; `{ sent, deduped, suppressedByPrefs }` is the observability shape every call site logs.

### Dependency carry-in

- **From lesson 1 of chapter 070:** `dispatch(event)` contract — input `{ type, recipientUserIds, subjectId, payload }`, return `{ sent, deduped, suppressedByPrefs }`; fire-after-commit; notifiable-vs-logged-event line.
- **From lesson 2 of chapter 070:** uniform channel signature `({ recipient, event, payload }) => Promise<void>`; render-at-dispatch for inbox rows; channel independence under `try/catch`; `notifications` row shape.
- **From lesson 3 of chapter 070:** `user_notification_preferences` `(user_id, category)` unique with per-channel booleans; category-level granularity; default-on; critical-channel override; `resolveChannels`.
- **From lesson 4 of chapter 070:** `notification_dedup` `(event_type, dedup_key, recipient_user_id, fired_at)` + composite index; 60-second default with per-event override; check-then-insert race accepted; order — registry → prefs → dedup → channels.
- **From chapter 059:** `tenantDb(orgId)`, `authedAction(role, schema, fn)`, active-org slot in session, `audit_logs` + `logAudit(tx, event)`. Invite-sent and role-change actions live here.
- **From chapter 050:** `sendEmail({ to, subject, react, idempotencyKey })` in `lib/email.ts`; `email_suppressions` read inside the wrapper (lesson 4 of chapter 048); transactional sender split (lesson 3 of chapter 048); unsubscribe-link discipline (lesson 2 of chapter 048).
- **From chapter 055:** Better Auth's `user` table with `id` and `email`; `getUserEmail(userId)` helper added in the starter.
- **From chapter 065:** `processed_events` and the webhook handler that triggers `billing.past_due` — the handler dispatches after commit.
- **From chapter 043 + chapter 047:** canonical Result shape, Zod 4 strictObject at the action boundary, `'use server'`.
- **From chapter 009:** `NotificationError` subclass with codes `REGISTRY_MISS | RECIPIENT_NOT_FOUND` — non-fatal channel failures are logged inside the dispatcher, never thrown.
- **From chapter 041:** Drizzle setup, `db.transaction`, `ON CONFLICT` upserts, composite-index discipline.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
.env.example                    # provided: DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY,
                                #           STRIPE_WEBHOOK_SECRET (from chapter 065), APP_URL,
                                #           NOTIFICATION_UNSUBSCRIBE_SECRET (HMAC token signing)
package.json                    # provided: db:migrate, db:seed, dev, build, stripe:listen
scripts/
  seed.ts                       # provided: two orgs, four users, one seeded invitation for
                                #           a non-user (RECIPIENT_NOT_FOUND target), one user
                                #           with team→email pref off (suppression target);
                                #           a second user with no prefs row (default-on target)
src/
  db/
    schema.ts                   # provided: users (Better Auth), organizations + member
                                #           + audit_logs (chapter 059), invitations (chapter 059),
                                #           plan_entitlements (chapter 065); three stub tables
                                #           commented out — TODO student fills in registry/dedup lesson
    client.ts                   # provided
    relations.ts                # provided
  lib/
    tenant-db.ts                # provided
    authed-action.ts            # provided
    audit-log.ts                # provided
    email.ts                    # provided (Unit 7): sendEmail({ to, subject, react, idempotencyKey, tags, headers });
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
        actions.ts              # provided shell from chapter 059 (re-exports `sendInvitationAction` from `src/lib/invitations/send.ts`); TODO student adds dispatch() calls in `src/lib/invitations/send.ts`
      api/webhooks/stripe/
        route.ts                # provided (chapter 065); TODO student adds dispatch() in past-due branch
      inbox/page.tsx            # provided: server-rendered notifications list for the user
    inspector/page.tsx          # provided: prefs toggles, fire-event buttons (single + rapid-fire),
                                #           inbox panel, email-sent counter, dedup-count badge,
                                #           processed_events tail, debug tools, reset-and-re-seed
```

The three stub tables (`notifications`, `user_notification_preferences`, `notification_dedup`) are commented-out blocks in `db/schema.ts`; the existing chapter 059 + chapter 065 tables (`users`, `organizations`, `org_members`, `invitations`, `audit_logs`, `processed_events`, `plan_entitlements`) are unchanged.
The provided `lib/notifications/` pieces are the typed shapes (`types.ts`), the `NotificationError` subclass (`errors.ts`), and the HMAC token sign/verify (`tokens.ts`); the three React Email templates in `src/emails/` are full components — the student does not author email JSX.

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
  - `sendEmailChannel({ recipient, event, payload }): Promise<void>` — resolves email via `getUserEmail(recipient.userId)` (throws `RECIPIENT_NOT_FOUND` on null), signs unsubscribe token, renders template with `{ ...payload, unsubscribeUrl }`, calls `sendEmail({ to, subject, react, idempotencyKey, tags, headers: List-Unsubscribe + List-Unsubscribe-Post })`. Suppression is the wrapper's concern.
- **Inbox channel** (`lib/notifications/channels/inbox.ts`):
  - `writeInboxRow({ recipient, event, payload }): Promise<void>` — renders `event.template.inbox(payload)` once, inserts one row.
- **`notifications` table:**
  - `id uuid pk default gen_random_uuid()`, `userId uuid not null references users(id) on delete cascade`, `orgId uuid references organizations(id) on delete cascade` (nullable), `eventType text not null`, `subjectId text not null`, `title text not null`, `body text not null`, `payload jsonb not null default '{}'::jsonb`, `readAt timestamptz`, `createdAt timestamptz not null default now()`.
  - Composite index `(userId, createdAt desc)`; partial index `(userId) WHERE readAt IS NULL`.
- **`user_notification_preferences` table:**
  - `userId uuid not null references users(id) on delete cascade`, `category text not null`, `channels jsonb not null default '{"email": true, "inbox": true}'::jsonb`, `updatedAt timestamptz not null default now()`. PK `(userId, category)`.
- **`notification_dedup` table:**
  - `eventType text not null`, `dedupKey text not null`, `recipientUserId uuid not null references users(id) on delete cascade`, `firedAt timestamptz not null default now()`. Composite index `(eventType, dedupKey, recipientUserId, firedAt desc)`. No PK — append-with-TTL.
- **Call-site shape** (`src/lib/invitations/send.ts`):
  - `sendInvitationAction = authedAction('admin', inviteSchema, async ({ email, role }, ctx) => { const inv = await tenantDb(ctx.orgId).transaction(...); await dispatch({ type: 'org.invitation.sent', recipientUserIds: invitee ? [invitee.id] : [], subjectId: inv.id, payload: { invitedEmail: email, role, orgName, inviterName, acceptUrl }, orgId: ctx.orgId }); return { ok: true, data: inv }; })`.
  - The implicit `tx.commit()` happens *before* `dispatch` — dispatcher is never inside the transaction.
- **Env entries:** existing from chapter 059 + chapter 065; new `NOTIFICATION_UNSUBSCRIBE_SECRET` (HMAC, 32+ bytes via `openssl rand -base64 32`).

### Inspector page spec

Single Server Component at `/inspector`, the verification surface for every project goal. Reads server-side, refreshes on submit via `router.refresh()`.

- **Header:** session-user switcher (admin/member per seeded org), org switcher (two seeded orgs), "Reset and re-seed" Server Action (truncates three notification tables, re-seeds).
- **Preferences panel:** for the active user, three categories (`team`, `billing`, `security`) with per-channel toggles. The `security` category's `email` is rendered disabled with a tooltip; toggling it has no effect server-side. Other toggles post to `setPref`.
- **Fire-event buttons:** `Fire invite-sent`, `Fire role-changed`, `Fire billing-past-due` — each posts a Server Action that calls `dispatch()` with a fixed payload against the active user.
- **Rapid-fire buttons:** `Rapid-fire X (5x in 2s)` per event — calls `dispatch()` five times in a tight loop against the same recipient/subject. Deterministic dedup verification, more reliable than manual clicks.
- **Inbox panel:** last 20 `notifications` rows for the active user, descending by `createdAt`, with `eventType`, `subjectId`, `title`, `createdAt`, `readAt`.
- **Email-sent counter:** count of `sendEmail` calls in the current session via `MOCK_EMAIL_SENT_COUNT`. The starter's `lib/email.ts` mocks Resend in inspector mode, bumps the counter, and logs rendered HTML to the server console. Counter resets with "Reset and re-seed".
- **Dedup-count badge:** running total of `deduped` from the most-recent `DispatchResult`.
- **Processed-events tail (from chapter 065):** existing panel streaming `processed_events` — used for the billing-past-due webhook path.
- **Debug tools:** `Force registry miss` (renders the `NotificationError`); `Make email fail` (sets a flag that makes `sendEmail` throw — verifies channel independence); `Wrap invite in rollback` (forces the invite action's outer transaction to roll back — verifies fire-after-commit); `Tampered unsubscribe token`.

The inspector is provided in full; the student writes only dispatcher, channels, prefs, dedup, registry, and the three call-site additions.

### Concepts demonstrated → owning lesson

- Dispatcher as the one named seam, call-site/channel separation — lesson 1 of chapter 070.
- `notifiable_events` registry — fields, source-of-truth rule — lesson 1 of chapter 070.
- Notifiable-vs-logged line, `notifications` vs. `audit_logs` audience-driven — lesson 1 of chapter 070.
- Dispatcher contract (`DispatchEvent` in, `DispatchResult` out), fire-after-commit — lesson 1 of chapter 070.
- Uniform channel signature, channel independence under `try/catch` — lesson 2 of chapter 070.
- Render-at-dispatch over render-at-display — lesson 2 of chapter 070.
- `notifications` shape, inbox feed query, partial index on unread — lesson 2 of chapter 070 + lesson 1 of chapter 039.
- Email channel calling Unit 7 wrapper, unsubscribe HMAC — lesson 2 of chapter 070 + lesson 1 of chapter 016.
- `user_notification_preferences` shape, `(userId, category)` unique, default-on, critical override — lesson 3 of chapter 070.
- Batched prefs read — lesson 3 of chapter 070 + lesson 2 of chapter 039 (N+1).
- `notification_dedup` shape, 60-second window, registry-defined `keyBy`, composite index, check-then-insert race accepted — lesson 4 of chapter 070.
- Dispatcher order — lesson 4 of chapter 070.
- `authedAction`, `tenantDb`, audit-log writes — chapter 057 / chapter 059.
- Webhook transaction-then-commit-then-dispatch — chapter 063 / chapter 065.
- React Email templates, plain-text fallback, unsubscribe header — chapter 049 / lesson 2 of chapter 048.
- Result shape, Zod 4 `z.strictObject` — chapter 042 / chapter 043.

---

## Lesson 1 — Project Overview

Three events, one dispatcher: the runnable surface you will build and the demo loop you will reproduce.

A short capture of the inspector working anchors the lesson: clicking `Fire invite-sent` (inbox +1, email +1), `Rapid-fire 5x` (inbox +1, dedup badge "4 deduped"), then toggling email off and refiring (inbox grows, counter does not).
One screenshot of the inspector with the three event buttons, the inbox panel populated, the email counter at 3, and the prefs panel.

### What we'll practice

- The dispatcher seam — one named entry point every call site and channel routes through, the canonical shape every later notification feature copies.
- The registry as the source of truth — adding an event is one entry; adding a channel later is one function with the same signature.
- Preference resolution read once per dispatch with default-on, and the critical-channel override that keeps billing email flowing.
- Time-windowed dedup keyed per recipient, so a burst collapses to one notification.
- Fire-after-commit discipline at three real call sites, so rolled-back work never notifies.
- Channel independence under per-channel `try/catch`, so one failing channel never kills the other.

### Architecture

A labeled list of the seam, shape only:

- **Call sites** (invite action, role-change action, billing webhook) build a `DispatchEvent` and `await dispatch(...)` after their transaction commits.
- **`dispatch(event)`** looks up the registry entry, reads preferences once for all recipients, then per recipient resolves channels, claims dedup, and fans out.
- **Channel functions** (`sendEmailChannel`, `writeInboxRow`) share `({ recipient, event, payload })` and run behind per-channel `try/catch`.
- **The registry** maps each event type to its category, channels, dedup window, templates, and optional critical channel.
- **Three tables** back the seam: `notifications` (the inbox feed), `user_notification_preferences` (per-category channel toggles), `notification_dedup` (the time window).
- **`/inspector`** drives every behavior; **`/inbox`** is the server-rendered read of `notifications`.

### Starting file tree

The annotated tree, provided-vs-stubbed callouts, and the TODO highlights live in the Chapter framing's "Starter file tree" section above.
The highlighted focus — the files the student fills — are `registry.ts`, `dispatcher.ts`, `dedup.ts`, `prefs.ts`, `channels/email.ts`, `channels/inbox.ts`, `index.ts`, the three stub tables in `db/schema.ts`, and the three call sites (`src/lib/invitations/send.ts`, the role-change action, the Stripe webhook past-due branch).

### Roadmap

A CardGrid, one Card per lesson:

- **Lesson 2 — Registry, dispatcher, and dedup.** Define the three events, write `dispatch()` with stub channels, and prove the 60-second dedup window from the inspector.
- **Lesson 3 — Channels and preferences live.** Replace the stubs with the inbox writer, the email channel, and a batched preferences read with default-on and the critical-channel override.
- **Lesson 4 — Wire the three call sites.** Add `dispatch()` after commit in the invite action, the role-change action, and the Stripe past-due webhook branch.

### Setup

Setup commands, in order (Steps component):

1. Clone the starter via `degit`.
2. `pnpm install`.
3. `docker compose up -d` (Postgres 18).
4. Generate the unsubscribe secret: `openssl rand -base64 32`, paste into `.env.local` as `NOTIFICATION_UNSUBSCRIBE_SECRET`. Copy the remaining keys from `.env.example`.
5. `pnpm db:migrate && pnpm db:seed`.
6. `pnpm dev`.

Env vars: `DATABASE_URL` (Postgres connection, from `docker-compose.yml`), `BETTER_AUTH_SECRET`, `RESEND_API_KEY` (mocked in inspector mode — any non-empty value works locally), `STRIPE_WEBHOOK_SECRET` (from chapter 065's `stripe listen`, needed only for the billing-past-due call site), `APP_URL` (`http://localhost:3000`), `NOTIFICATION_UNSUBSCRIBE_SECRET` (HMAC token signing, generated above).
Stripe-CLI setup is inherited from chapter 065 — `stripe listen` running enables the billing-past-due call site; without it, the inspector's `Fire billing-past-due` button stands in.

Expected result: `pnpm dev` shows the chapter 059 members surface working; `/inspector` loads but every fire button errors (`dispatch` undefined); `/inbox` renders empty.
The starter ships chapter 059 + chapter 065 working — members surface, Stripe webhook, audit log — and this project layers the dispatcher on top rather than rewriting; `MOCK_EMAIL_SENT_COUNT` is the inspector's verification proxy because real Resend round-trips during development are slow and rate-limited, and the student does not change `lib/email.ts`.

---

## Lesson 2 — Registry, dispatcher, and dedup

Define the three notifiable events and ship a callable `dispatch()` that dedups a burst down to one.
The finished result: from `/inspector`, `Fire invite-sent` returns `{ sent: { email: 1, inbox: 1 }, deduped: 0, suppressedByPrefs: 0 }` and writes one `notification_dedup` row; firing again inside 60 seconds returns `deduped: 1` with no second dedup row; `Rapid-fire (5x in 2s)` returns `deduped: 4`; after 61 seconds the window releases and a fresh fire dedups from zero.
Channels are still stubs that only increment counters — no real inbox rows or email yet.

### Your mission

This lesson lands the spine of the dispatcher: the registry that names what can be notified, the dedup helper that collapses a burst, and the `dispatch()` function that ties them together.
These three pieces only reach a confirmable state as a unit — dedup is observable only through a `dispatch()` that consults the registry — so they ship together, with the channels deliberately stubbed so the dedup behavior is what you are verifying.
The registry is `const`-asserted with `satisfies Record<string, EventDefinition>` so the event-type union is inferred and an unknown key is a compile error; adding an event stays a one-entry change.
Dedup lives inside the dispatcher, after the (stubbed) preference step and before channels, keyed by `(event_type, dedup_key, recipient_user_id)` — `recipientUserId` is load-bearing, because two recipients getting the same event is not a duplicate.
The 60-second window is per-event in the registry, widened for high-frequency events and reconsidered for financial ones; the check-then-insert race is accepted here (one duplicate per rare concurrent burst), with the unique-constraint upgrade named as the next reach.
A registry miss throws `NotificationError('REGISTRY_MISS')` and is never swallowed — that is a programmer error, not a channel failure, so the per-channel `try/catch` you scaffold is per-channel, not per-dispatch.
Out of scope this lesson: real channels, real preference resolution (stub it with `const enabledChannels = eventDef.channels`), and the call-site wiring — all of those land later.

Requirements checklist — each item a behavior you can confirm from the inspector or the database:

- The three stub tables (`notifications`, `user_notification_preferences`, `notification_dedup`) exist after migration, with the dedup composite index `(event_type, dedup_key, recipient_user_id, fired_at desc)` and the partial unread index on `notifications`, confirmable in Drizzle Studio.
- `Fire invite-sent` from the inspector returns `{ sent: { email: 1, inbox: 1 }, deduped: 0, suppressedByPrefs: 0 }` and writes exactly one `notification_dedup` row.
- Firing the same event again within 60 seconds returns `deduped: 1` and writes no second dedup row.
- `Rapid-fire invite-sent (5x in 2s)` returns one new dispatch with `deduped: 4` aggregated.
- Waiting 61 seconds and refiring returns a fresh dispatch with `deduped: 0` — the window has released.
- Firing an unknown event type surfaces `NotificationError('REGISTRY_MISS')` rather than a silent no-op.

### Coding time

Implement the registry, `dedup.ts`, `dispatcher.ts`, and `index.ts` against the reference signatures and the lesson's tests; wire the inspector's three fire buttons to call `dispatch()` with their fixed payloads.
Then read the solution walkthrough.

The hidden solution covers:

- `db/schema.ts`: uncommenting the three stub tables per reference; `pnpm db:generate --name add_notifications`, inspecting the SQL (three `CREATE TABLE`s, three composite indexes, one partial index on unread), `pnpm db:migrate`.
- `registry.ts`: the three keys per reference, importing the three React Email templates, typed with `satisfies Record<string, EventDefinition>` so unknown keys are flagged — and why `keyBy` is `ReadonlyArray<string>` validated at runtime rather than the typed-mapped alternative (registry simplicity).
- `dedup.ts`: `claimDedup` selecting the most-recent row for the triple with `firedAt > NOW() - INTERVAL '${windowSeconds} seconds'`, returning `{ claimed: false }` on hit else inserting and returning `{ claimed: true }`; `computeDedupKey` joining `keyBy` payload values with `:`; the accepted check-then-insert race and the unique-constraint upgrade named.
- `dispatcher.ts`: the body order — registry lookup throwing `REGISTRY_MISS` if absent, per-recipient loop, the stubbed prefs (`const enabledChannels = eventDef.channels`), `computeDedupKey`, `claimDedup` (increment `deduped` and continue on hit), the stubbed channel calls (`console.log` plus `sent.<channel>++`) each wrapped in `try/catch`; why the `try/catch` is per-channel and `REGISTRY_MISS` is not caught.
- `index.ts`: re-exporting `dispatch`, the event-type union, and `DispatchEvent`, marked `'server-only'`.
- Inspector wiring: the imports plus `dispatch()` calls added to the existing fire-button action stubs.
- Callouts: the `satisfies` inference (chapter 005 narrowing discipline), the per-recipient dedup key, and the per-event window guidance (5-10 min for comments/mentions; skip or payload-discriminate for financial events).

### Moment of truth

Run the lesson's test suite (the command and its expected pass output ship with the starter); it covers the dedup window, the `DispatchResult` shape, and the `REGISTRY_MISS` throw.
Then confirm by hand the parts the tests leave to you:

- Drizzle Studio shows the three tables and their indexes after migration.
- `Fire invite-sent` shows `{ sent: { email: 1, inbox: 1 }, deduped: 0, suppressedByPrefs: 0 }` and one `notification_dedup` row.
- A second fire within 60 seconds shows `deduped: 1` with no second dedup row.
- `Rapid-fire (5x in 2s)` shows `deduped: 4`.
- After a 61-second wait, a fresh fire shows `deduped: 0`.

This lesson closes runnable: `dispatch()` works end-to-end with dedup, channels still `console.log` — no real inbox rows, no real email-counter increment yet.

---

## Lesson 3 — Channels and preferences live

Replace the stubs so every inspector button produces its real effect.
The finished result: as the seeded `bob` (with `team` → `email` off), `Fire invite-sent` writes one inbox row, leaves the email counter unchanged, and returns `suppressedByPrefs: 1`; as `alice` (no prefs row), it increments both inbox and email; toggling a channel off suppresses just that channel; firing `billing-past-due` with `billing` → `email` off still increments the email counter because email is its critical channel.

### Your mission

This lesson makes the dispatcher real on both ends at once: the two channel functions that actually write, and the preference resolution that decides which channels run.
They land together because the dispatcher is only verifiable end-to-end once both are real — a live channel with stubbed prefs cannot demonstrate suppression, and live prefs with stubbed channels cannot demonstrate a send.
Preferences are read once per dispatch, batched across all recipients in a single `WHERE userId IN (...) AND category = ?` query rather than one read per recipient — the N+1 discipline from chapter 039.
The `?? true` default-on rule is load-bearing: silence-by-default is worse than friction, so a user with no preferences row receives everything.
The `|| c === event.criticalChannel` clause keeps the override inside `resolveChannels`, so every channel decision lives in one place.
The inbox writer renders `event.template.inbox(payload)` at insert time and writes one row with no joins — render-at-dispatch, so the row is a snapshot immune to later actor-name drift and the inbox UI stays a pure read.
The email channel resolves the address via `getUserEmail` (a null throws `RECIPIENT_NOT_FOUND`, which the dispatcher swallows), threads a signed `unsubscribeUrl` through the template, and sends with `List-Unsubscribe` + `List-Unsubscribe-Post: One-Click` headers — mandatory under the 2026 bulk-sender bar; suppression stays the wrapper's concern.
Out of scope: the call-site wiring (next lesson) and any inbox UI past the provided `/inbox` list.

Requirements checklist — each item a behavior you can confirm from the inspector:

- As `bob` (seeded `team` → `email` off), `Fire invite-sent` writes one new inbox row, leaves the email counter unchanged, and returns `suppressedByPrefs: 1`.
- As `alice` (no prefs row), `Fire invite-sent` increments both the inbox panel and the email counter — default-on holds.
- Toggling `alice`'s `team` → `inbox` off and refiring increments the email counter only.
- With `team` → `email` off, `Fire billing-past-due` still increments the email counter — the critical-channel override holds.
- A new inbox row's `title` and `body` match the registry's inbox template for the event, written once at dispatch time.
- The `security` → `email` toggle is rendered disabled on the prefs panel and has no server-side effect.

### Coding time

Implement `prefs.ts`, `channels/inbox.ts`, and `channels/email.ts`, wire them into the dispatcher, and wire the inspector's preferences panel, against the reference signatures and the lesson's tests.
Then read the solution walkthrough.

The hidden solution covers:

- `prefs.ts`: `readPrefsForCategory` as one batched `WHERE userId IN (...)` query returning `Map<userId, PrefRow | null>` (missing users map to `null`); `resolveChannels` with the `?? true` default-on and `|| c === event.criticalChannel` override — the two load-bearing clauses explained on sight.
- Dispatcher edits: replacing the stub prefs with the batched read before the per-recipient loop and the `resolveChannels` call inside it (read once per dispatch); incrementing `suppressedByPrefs` by the diff when `resolveChannels` returns fewer channels than `eventDef.channels`; the `const channels = { email: sendEmailChannel, inbox: writeInboxRow } as const` map so the loop is `await channels[channel](args)` with no branching.
- `channels/inbox.ts`: one `event.template.inbox(payload)` call, one INSERT, no joins; why render-at-display is rejected (actor-name drift, join cost).
- `channels/email.ts`: resolving `to` via `getUserEmail` (throw `RECIPIENT_NOT_FOUND` on null), signing the unsubscribe token, composing `unsubscribeUrl`, rendering the template with payload plus URL, calling `sendEmail` with the `List-Unsubscribe` headers; suppression as the wrapper's concern; why `RECIPIENT_NOT_FOUND` (e.g. seeded `eve`, not yet a user) is swallowed and the chapter 059 invitation email still goes via the unauthenticated path.
- Inspector wiring: the preferences Server Component reading `user_notification_preferences`, toggles posting to an `authedAction`-wrapped `setPref` that UPSERTs, and the disabled `security` → `email` toggle.
- Callouts: `REGISTRY_MISS` bubbling out while channel failures are swallowed (the `try/catch` is per-channel, not per-dispatch), and the RFC 8058 `List-Unsubscribe-Post: One-Click` requirement (lesson 2 of chapter 048; the starter's `/api/email/unsubscribe` handles the POST).

### Moment of truth

Run the lesson's test suite (command and expected pass output ship with the starter); it covers default-on, channel suppression, the critical-channel override, and channel independence.
Then confirm by hand:

- As `bob`, `Fire invite-sent` writes an inbox row, leaves the counter unchanged, returns `suppressedByPrefs: 1`.
- As `alice` (no prefs row), both channels fire; toggle `team` → `inbox` off and only email fires.
- After resetting, with `team` → `email` off, `Fire billing-past-due` still increments the email counter.
- A new inbox row's `title`/`body` match the registry's inbox template.
- Use `Make email fail` and fire — the inbox row is still written; the dispatch log shows the email error swallowed.

This lesson closes runnable: every inspector button produces its expected effect, and `MOCK_EMAIL_SENT_COUNT` is now load-bearing.

---

## Lesson 4 — Wire the three call sites

Fire the dispatcher from real product surfaces, always after the transaction commits.
The finished result: inviting an existing user from `/members` writes the invitation, commits, then dispatches an inbox row plus email to the invitee; changing a member's role writes both an `audit_logs` row and a `notifications` row; `stripe trigger invoice.payment_failed` lands the webhook, commits, then dispatches to each org owner.

### Your mission

This lesson moves the dispatcher off the inspector and onto the three call sites it exists to serve — the invite action, the role-change action, and the Stripe past-due webhook branch.
The single discipline tying them together: dispatch runs after the action's transaction commits, never inside it — `await tx`-work, then `await dispatch(...)` — because notifying for state that later rolls back is the failure mode the seam exists to prevent.
These three are one capability — wire the production flow — verified as a set, because each is the same fire-after-commit move applied to a different surface, and the inspector already proved the dispatcher itself.
The webhook is the awkward one: read the org's owner list inside the transaction (consistent with the transition it commits), capture it in a closure, and dispatch after commit; the transactional-outbox alternative is named and deferred.
The dispatcher trusts its caller — gating happens at the action boundary via `authedAction`, so a direct call from a non-action path bypasses the admin check.
Two dedup layers compose without conflict: `processed_events` at the webhook handler catches duplicate deliveries, while `notification_dedup` inside the dispatcher catches duplicate user-facing notifications even from distinct event IDs.
For an invite to an existing user, two emails go out — chapter 059's unauthenticated invitation email plus the dispatcher's `org.invitation.sent`; merging them is the next reach, and v1 accepts the duplication because refactoring chapter 059 is out of scope.
Out of scope: changing `lib/email.ts`, merging the duplicate invite emails, and short-circuiting no-op role changes.

Requirements checklist — each item a behavior you can confirm from the real surface:

- Inviting an existing user from `/members` writes the invitation, commits, then produces one inbox row plus one email increment for the invitee.
- Inviting `eve@example.com` (not yet a user) sends only the chapter 059 invitation email — the dispatcher no-ops on the empty recipient list.
- Changing a member's role writes both an `audit_logs` row and a `notifications` row, with one email increment for the affected member.
- `stripe trigger invoice.payment_failed` lands the webhook, commits, then produces one inbox row plus one email per org owner.
- Wrapping the invite action in a forced rollback (the `Wrap invite in rollback` debug tool) produces no rows anywhere and no email increment.
- A grep for `sendEmail(` and `db.insert(notifications)` outside `lib/notifications/` returns zero hits — the seam holds.

### Coding time

Add the `dispatch()` call after commit in `src/lib/invitations/send.ts`, the role-change action, and the Stripe webhook past-due branch, against the reference call-site shape and the lesson's tests.
Then read the solution walkthrough.

The hidden solution covers:

- `src/lib/invitations/send.ts`: the `await dispatch({ type: 'org.invitation.sent', recipientUserIds: invitee ? [invitee.id] : [], subjectId: invitation.id, payload: {...}, orgId: ctx.orgId })` after the transaction commits; `invitee` resolved by `select user where email = ?`, the empty-array no-op for an absent user, and the chapter 059 email still sending via the unauthenticated path.
- The role-change action: the `await dispatch({ type: 'org.member.role_changed', ... })` after commit, with the chapter 059 audit-log write left unchanged so both `audit_logs` and `notifications` write.
- The Stripe webhook past-due branch: collecting owner IDs inside the outer transaction (`select user_id from member where organization_id = ? and role = 'owner'`) into a closure, then `await dispatch({ type: 'org.billing.past_due', recipientUserIds: ownerIds, ... })` after commit — read inside, dispatch after.
- Callouts: the fire-after-commit pattern (`await tx`-action; `await dispatch(...)`), the webhook's read-inside/dispatch-after shape with the transactional-outbox alternative deferred, the two-email duplication for existing-user invites accepted in v1, the trust-the-caller gating at the action boundary, the two composing dedup layers, and the grep seam check (`sendEmail(` / `db.insert(notifications)` outside `lib/notifications/` → zero hits).

### Moment of truth

Run the lesson's test suite (command and expected pass output ship with the starter); it covers the invite, role-change, and webhook call sites and the fire-after-commit guarantee.
Then confirm by hand:

- From `/members`, invite an existing user — inbox row plus email for the invitee, after the action commits.
- Invite `eve@example.com` — chapter 059 invite email only, dispatcher no-ops.
- Change a member's role — both `audit_logs` and `notifications` write, one email increment.
- `stripe trigger invoice.payment_failed` — `processed_events` plus entitlement plus audit plus one notification per owner; replay blocks at the handler and the dispatcher's dedup is the second layer.
- `Wrap invite in rollback` then submit — no rows anywhere, no email, no dedup.
- Copy the `unsubscribeUrl` from the server-console rendered email and visit it — the category's `email` toggle is pre-set off and the HMAC verifies; tamper one character and it returns 400.
- Run the grep seam check: `sendEmail(` and `db.insert(notifications)` outside `lib/notifications/` return zero hits.
- The inspector's index-probe panel confirms the `(userId, createdAt desc)` and partial unread indexes are picked for the inbox feed — no `Seq Scan`.

This lesson closes runnable: three real call sites dispatch after commit, the members surface and Stripe webhook produce real notifications and emails, and `/inbox` shows real rows — the production-shaped flow end-to-end.

This is the project's final build, so it also names the forward references the dispatcher hands off:

- Chapter 073 — `cacheTag('notifications', userId)` on the inbox feed when volume justifies; the project deliberately does not cache.
- Chapter 075 — Upstash-backed dedup replaces the table when throughput crosses the database-write threshold; the dispatcher contract stays the same.
- Chapter 066 — a Trigger.dev-backed channel queue moves channel sends behind a durable worker; the dispatcher contract stays the same.
- Chapter 081 — the audit-log line, the HMAC unsubscribe-token discipline, and the channel-failure log discipline.
- Chapter 088 — integration tests for prefs-respected, default-on, dedup, and channel-independence.
- Chapter 092 — `DispatchResult` is the structured-log shape; dashboards on dedup rate, suppression rate, and channel-failure rate live there.
