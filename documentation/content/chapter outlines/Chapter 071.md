# Chapter 071 — Project: notification dispatcher

## Chapter framing

Chapter 071 cashes in the four teaching lessons of chapter 070 — the dispatcher seam and the notifiable-vs-logged line (lesson 1 of chapter 070), the uniform channel-function shape (lesson 2 of chapter 070), category-grained prefs resolved once with default-on (lesson 3 of chapter 070), and 60-second dedup keyed by `(event_type, dedup_key, recipient_user_id)` (lesson 4 of chapter 070) — as one runnable surface.
The student writes the `notifiableEvents` registry, the `dispatch(event)` function that resolves prefs and dedups before fanning out, the two channel functions (`sendEmailChannel`, `writeInboxChannel`), the `userNotificationPreferences` and `notificationDedup` schemas, and the wiring at three real call sites: `sendInvitation` and `changeMemberRole` (the invitation actions in `lib/invitations/`) and billing-past-due (chapter 065 webhook).
Each build closes on a runnable state: the registry/dedup lesson ends with `dispatch()` callable with dedup but stub channels; the channels/prefs lesson with both channels live and prefs respected; the call-site lesson with three real call sites firing.

The project's verifiable outcomes are runtime behaviors observed through the `/inspector` and `/inbox` surfaces: a flat `DispatchResult` shape (`{ sent, deduped, suppressedByPrefs }`), an inbox row appearing, the email-sent counter incrementing, and dedup suppressing duplicates.
Every Implementation lesson's requirements are phrased as one of these confirmable behaviors.

The project's stated goals — what "done" means:

- Each of the three event-fires produces one inbox row plus one email where prefs allow.
- Rapid-firing any event five times in two seconds produces exactly one inbox row plus one email, with `deduped: 4` aggregated and one `notification_dedup` row.
- Toggling `team` → `email` off and firing `invite-sent` produces an inbox row but no email, with `suppressedByPrefs: 1`.
- A recipient with no preferences row defaults to on — both channels fire.
- A `billing-past-due` event with `billing` → `email` toggled off still sends email, because the registry marks email the critical channel.
- The three real call sites each dispatch after their transaction commits: invite-sent (`sendInvitation`) and role-change (`changeMemberRole`), billing-past-due from the Stripe webhook.
- One channel failing never kills the other — an inbox-write failure still lets the email send, and vice versa.
- A rolled-back action notifies nobody — no rows anywhere, no email increment.
- The inbox reads `userId` from the session, never `orgId` from a query, so hand-crafted cross-tenant URLs do not leak.
- A registry miss surfaces as a `NotificationError('REGISTRY_MISS')` rather than a swallowed channel failure.
- Opt-out is the per-category preference toggle — transactional notification emails carry no unsubscribe header, and a critical-channel event (billing email) ignores the toggle entirely.

Threads through every lesson: the dispatcher is the only seam — `dispatch` is re-exported from `lib/notifications/index.ts`, a grep for `sendEmail(` or `db.insert(notifications)` outside `lib/notifications/` is a red flag (the chapter 065 invitation email in `sendInvitation` predates the seam and is the one named exception); the registry is the source of truth — adding an event is a one-entry change; prefs read once per dispatch with default-on (`?? true`); dedup inside the dispatcher, before channels, after prefs, check-then-insert (`isDuplicate`/`recordDedup`) on `notificationDedup`; channel functions uniform `({ recipient, event, payload, rendered })` behind per-channel `try/catch` so one failing channel never kills the other; dispatch fires after the action's transaction commits — never inside it, transactional-outbox alternative named and deferred; inbox rows rendered at dispatch time so the row is a snapshot, not a live join; `{ sent, deduped, suppressedByPrefs }` is the observability shape every call site logs.

### Dependency carry-in

- **From lesson 1 of chapter 070:** `dispatch(event)` contract — input `{ type, recipientUserIds, subjectId, payload }`, return flat `{ sent, deduped, suppressedByPrefs }`; fire-after-commit; notifiable-vs-logged-event line.
- **From lesson 2 of chapter 070:** uniform channel signature `({ recipient, event, payload, rendered }) => Promise<void>`; render-at-dispatch for inbox rows; channel independence under `try/catch`; `notifications` row shape.
- **From lesson 3 of chapter 070:** `userNotificationPreferences` `(userId, category)` unique with per-channel booleans; category-level granularity (`preferenceCategory`); default-on; critical-channel override; `resolveChannels`.
- **From lesson 4 of chapter 070:** `notificationDedup` `(eventType, dedupKey, recipientUserId, firedAt)` + composite index; 60-second default with per-event override; check-then-insert race accepted; order — registry → prefs → dedup → channels.
- **From chapter 065 (the starter fork):** `withTenant(orgId, fn)`, `authedAction(role, schema, fn)`, active-org slot in session, `auditLogs` + `logAudit(tx, event)`, the invitation actions (`sendInvitation`, `changeMemberRole`) in `lib/invitations/`, `processed_events` idempotency, `plan_entitlements`, and the Stripe webhook handler whose `onSubscriptionUpdated` past-due branch dispatches after commit.
- **From chapter 050:** `sendEmail({ to, subject, react, idempotencyKey })` in `lib/email.ts`; `email_suppressions` read inside the wrapper (lesson 4 of chapter 048); transactional sender split (lesson 3 of chapter 048). Transactional notifications carry no unsubscribe header — opt-out is the per-category preference toggle.
- **From chapter 055:** Better Auth's `user` table with `id` and `email`; the student writes `getUserEmail(userId)` in `lib/notifications/get-user-email.ts`.
- **From chapter 043 + chapter 047:** canonical Result shape, Zod 4 strictObject at the action boundary, `'use server'`.
- **From chapter 009:** `NotificationError` subclass with codes `REGISTRY_MISS | RECIPIENT_NOT_FOUND` — non-fatal channel failures are logged inside the dispatcher, never thrown.
- **From chapter 041:** Drizzle setup, `db.transaction`, `ON CONFLICT` upserts, composite-index discipline.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
.env.example                    # provided: DATABASE_URL(+_UNPOOLED), BETTER_AUTH_SECRET, RESEND_API_KEY,
                                #           EMAIL_FROM/REPLY_TO, INVITATION_SIGNING_SECRET,
                                #           STRIPE_* (from chapter 065), APP_URL, EMAIL_MOCK=1
package.json                    # provided: db:migrate, db:seed, dev, build, stripe:listen, test:lesson
scripts/
  seed.ts                       # provided: two orgs (Acme/Globex), four users; Alice (owner, NO prefs
                                #           row → default-on target), Bob (admin, team→email off →
                                #           suppression target); one seeded pending invite to a non-user
                                #           (newcomer@acme.test → empty-recipient no-op target)
src/
  db/
    schema.ts                   # provided: auth tables (user/org/member/invitation), audit_logs,
                                #           plan_entitlements, processed_events (chapter 065); three stub
                                #           tables commented out under TODO(L2) — student fills in lesson 2
    index.ts                    # provided: db + dbUnpooled + Transaction
  lib/
    auth/authed-action.ts       # provided
    invitations/
      send.ts                   # provided shell (chapter 065 sendInvitation); TODO(L4) student adds dispatch()
      manage.ts                 # provided shell (chapter 065 changeMemberRole); TODO(L4) student adds dispatch()
    webhooks/stripe.ts          # provided (chapter 065); TODO(L4) student adds pendingDispatches push in past-due branch
    email.ts                    # provided (Unit 7): sendEmail({ to, subject, react, idempotencyKey });
                                #           EMAIL_MOCK mode bumps emailSentCount (getEmailSentCount/setEmailShouldFail)
    notifications/
      registry.ts               # TODO student: notifiableEvents typed map
      types.ts                  # provided: NotificationEvent, DispatchResult, NotifiableEvent, ChannelFn, Recipient, RenderedContent
      errors.ts                 # provided: NotificationError subclass
      dispatcher.ts             # TODO student: dispatch(event)
      prefs.ts                  # TODO student: readPrefsForCategory + resolveChannels
      dedup.ts                  # TODO student: isDuplicate / recordDedup / computeDedupKey
      get-user-email.ts         # TODO student: resolve recipient email from the user table
      channels/
        email.ts                # TODO student: sendEmailChannel
        inbox.ts                # TODO student: writeInboxChannel
      index.ts                  # provided barrel: re-exports dispatch, EventType, DispatchResult, NotificationEvent
  emails/
    InviteSentEmail.tsx         # provided React Email templates
    RoleChangedEmail.tsx        # provided
    BillingPastDueEmail.tsx     # provided
  app/
    api/webhooks/stripe/
      route.ts                  # provided (chapter 065); TODO(L4) student drains pendingDispatches after commit
    (protected)/
      inbox/page.tsx            # provided: server-rendered notifications list for the session user
      inspector/                # provided in full: page + actions + _data + _components
        page.tsx                #   prefs toggles, fire-event buttons (single + rapid-fire), inbox panel,
                                #   email-sent counter, dedup-count badge, processed_events tail, debug tools
```

The three stub tables (`notifications`, `user_notification_preferences`, `notification_dedup`) are commented-out blocks under a `// TODO(L2)` marker in `db/schema.ts`; the existing chapter 065 tables (`user`, `organization`, `member`, `invitation`, `auditLogs`, `processed_events`, `planEntitlements`) are unchanged.
Every `lib/notifications/` body except `types.ts`, `errors.ts`, and `index.ts` ships as a no-op or throwing stub the student fills in; the three React Email templates in `src/emails/` are full components — the student does not author email JSX.

### Reference solution signatures lessons display

- **Registry** (`lib/notifications/registry.ts`):
  - `notifiableEvents = { 'org.invitation.sent': {...}, 'org.member.role_changed': {...}, 'org.billing.past_due': {...} } as const satisfies Record<string, NotifiableEvent>`; `EventType = keyof typeof notifiableEvents`.
  - Entry shape (`NotifiableEvent`): `{ channels: ChannelName[], templates: { email: (props: any) => ReactElement; inbox: (payload: Record<string, unknown>) => { title: string; body: string } }, preferenceCategory: string, dedup: { windowSeconds: number; keyBy: string[] }, criticalChannel?: ChannelName, description: string }`. The email-template field is the permissive `(props: any) => ReactElement` form on purpose — each typed template does not assign to a `Record<string, unknown>`-param field under TS 6 strict (parameter contravariance, TS2322).
  - `'org.invitation.sent'` — `preferenceCategory: 'team'`, `channels: ['email', 'inbox']`, `dedup: { windowSeconds: 60, keyBy: ['subjectId'] }`.
  - `'org.member.role_changed'` — `preferenceCategory: 'team'`, `channels: ['email', 'inbox']`, `dedup: { windowSeconds: 60, keyBy: ['subjectId', 'newRole'] }`.
  - `'org.billing.past_due'` — `preferenceCategory: 'billing'`, `channels: ['email', 'inbox']`, `dedup: { windowSeconds: 60, keyBy: ['subjectId'] }`, `criticalChannel: 'email'`.
- **Dispatch** (`lib/notifications/dispatcher.ts`):
  - `dispatch(event: NotificationEvent): Promise<DispatchResult>` where `NotificationEvent = { type: EventType; recipientUserIds: string[]; subjectId: string; payload: Record<string, unknown> }` and `DispatchResult = { sent: number; deduped: number; suppressedByPrefs: number }` (flat — `sent` is a single running total, one increment per successful channel send).
  - Body order: registry lookup (throw `REGISTRY_MISS` if unknown) → batched `readPrefsForCategory` → render content once (`rendered`) → per-recipient loop: `resolveChannels` (increment `suppressedByPrefs` by the channel diff, skip a fully-suppressed recipient) → `isDuplicate` (skip on hit, increment `deduped`) → for each enabled channel call `channelFns[channel](...)` inside `try/catch` (increment `sent`, log + swallow per-channel failures) → `recordDedup` after fan-out.
- **Prefs** (`lib/notifications/prefs.ts`):
  - `readPrefsForCategory(userIds: string[], category: string): Promise<Map<string, NotificationPrefRow | undefined>>` — one `WHERE userId IN (...) AND category = ?` query; users with no row map to `undefined`.
  - `resolveChannels(event: NotifiableEvent, prefs: NotificationPrefRow | undefined): ChannelName[]` — `event.channels.filter(c => (prefs?.[c] ?? true) || c === event.criticalChannel)` (per-channel boolean column read with `?? true` default-on).
- **Dedup** (`lib/notifications/dedup.ts`):
  - `isDuplicate({ event, userId, payload }): Promise<boolean>` — selects the most-recent row inside the window (`firedAt > now() - make_interval(secs => windowSeconds)`) for the `(eventType, dedupKey, recipientUserId)` triple. Composite index `(eventType, dedupKey, recipientUserId, firedAt desc)`.
  - `recordDedup({ event, userId, payload }): Promise<void>` — inserts one row marking the triple as fired now. Check-then-insert race accepted (unique-constraint upgrade deferred).
  - `computeDedupKey(event, payload): string` — joins `keyBy` values with `:` (`subjectId` read off the event, every other key off the payload).
- **Email channel** (`lib/notifications/channels/email.ts`):
  - `sendEmailChannel: ChannelFn` — resolves email via `getUserEmail(recipient.userId)` (throws `RECIPIENT_NOT_FOUND` on null), renders the registry template via `createElement(eventDef.templates.email, rendered.emailProps)`, calls `sendEmail` with `subject: rendered.inbox.title` and a deterministic `idempotencyKey` of the form `${event.type}:${event.subjectId}:${recipient.userId}`. No unsubscribe headers (transactional). On a `sendEmail` non-ok Result it logs and throws so channel independence holds; suppression is the wrapper's concern.
- **Inbox channel** (`lib/notifications/channels/inbox.ts`):
  - `writeInboxChannel: ChannelFn` — inserts one `notifications` row from `rendered.inbox.title`/`body` (rendered once at dispatch), no joins. The only writer of the `notifications` table.
- **`notifications` table:**
  - `id uuid pk` ($defaultFn uuidv7()), `userId text not null references user(id) on delete cascade` (text, matches Better Auth's `user.id` — never `uuid()`), `orgId text references organization(id) on delete cascade` (nullable), `eventType text not null`, `subjectId text not null`, `title text not null`, `body text not null`, `payload jsonb not null default '{}'::jsonb`, `readAt timestamptz`, `createdAt timestamptz not null`.
  - Composite index `(userId, createdAt desc)`; partial index `(userId) WHERE readAt IS NULL`.
- **`user_notification_preferences` table:**
  - `id uuid pk` ($defaultFn uuidv7()), `userId text not null references user(id) on delete cascade`, `category text not null`, per-channel boolean columns `email boolean not null default true`, `inbox boolean not null default true`, `push boolean not null default true` (`push` reserved, no consumer yet), `updatedAt timestamptz not null`. Unique on `(userId, category)`.
- **`notification_dedup` table:**
  - `id uuid pk` ($defaultFn uuidv7()), `eventType text not null`, `dedupKey text not null`, `recipientUserId text not null references user(id) on delete cascade`, `firedAt timestamptz not null default now()`. Composite index `(eventType, dedupKey, recipientUserId, firedAt desc)`.
- **Call-site shape** (`src/lib/invitations/send.ts`):
  - `sendInvitation = authedAction('admin', sendInvitationSchema, async ({ email, role }, ctx) => { const invitationId = await withTenant(ctx.orgId, async (tx) => {...}); /* chapter 065 invitation email still sends via the unauthenticated path */ await dispatch({ type: 'org.invitation.sent', recipientUserIds: existingUser ? [existingUser.id] : [], subjectId: invitationId, payload: { invitedEmail: email, role, orgName, inviterName, acceptUrl } }); return ok({ invitationId, emailSent: sent.ok }); })`.
  - `withTenant` resolves *before* `dispatch` — the dispatcher is never inside the transaction. `NotificationEvent` carries no `orgId` field.
- **Env entries:** existing from chapter 065; `EMAIL_MOCK=1` makes `sendEmail` short-circuit before Resend and bump the inspector's email-sent counter. No new HMAC secret — the unsubscribe-token feature was cut.

### Inspector page spec

Single Server Component at `/inspector`, the verification surface for every project goal. Reads server-side, refreshes on submit via `router.refresh()`.

- **Header:** session-user switcher (admin/member per seeded org), org switcher (two seeded orgs), "Reset and re-seed" Server Action (truncates three notification tables, re-seeds).
- **Preferences panel:** for the active user, three categories (`team`, `billing`, `security`) with per-channel toggles. The `security` category's `email` is rendered disabled with a tooltip; toggling it has no effect server-side. Other toggles post to `setPref`.
- **Fire-event buttons:** `Fire invite-sent`, `Fire role-changed`, `Fire billing-past-due` — each posts a Server Action that calls `dispatch()` with a fixed payload against the active user.
- **Rapid-fire buttons:** `Rapid-fire X (5x in 2s)` per event — calls `dispatch()` five times in a tight loop against the same recipient/subject. Deterministic dedup verification, more reliable than manual clicks.
- **Inbox panel:** last 20 `notifications` rows for the active user, descending by `createdAt`, with `eventType`, `subjectId`, `title`, `createdAt`, `readAt`.
- **Email-sent counter:** count of `sendEmail` calls in the current session via `getEmailSentCount()`. The starter's `lib/email.ts` short-circuits Resend when `EMAIL_MOCK=1`, bumps the counter, and skips the live round-trip. Counter resets with "Reset and re-seed".
- **Dedup-count badge:** running total of `deduped` from the most-recent `DispatchResult`.
- **Processed-events tail (from chapter 065):** existing panel streaming `processed_events` — used for the billing-past-due webhook path.
- **Debug tools:** `Force registry miss` (surfaces the `NotificationError`); `Make email fail` (sets the mock's fail flag via `setEmailShouldFail` so `sendEmail` errors — verifies channel independence); `Wrap invite in rollback` (the fire-after-commit affordance); `Reset + reseed`.

The inspector is provided in full; the student writes only dispatcher, channels, prefs, dedup, registry, and the three call-site additions.

### Concepts demonstrated → owning lesson

- Dispatcher as the one named seam, call-site/channel separation — lesson 1 of chapter 070.
- `notifiableEvents` registry — fields, source-of-truth rule — lesson 1 of chapter 070.
- Notifiable-vs-logged line, `notifications` vs. `audit_logs` audience-driven — lesson 1 of chapter 070.
- Dispatcher contract (`NotificationEvent` in, `DispatchResult` out), fire-after-commit — lesson 1 of chapter 070.
- Uniform channel signature, channel independence under `try/catch` — lesson 2 of chapter 070.
- Render-at-dispatch over render-at-display — lesson 2 of chapter 070.
- `notifications` shape, inbox feed query, partial index on unread — lesson 2 of chapter 070 + lesson 1 of chapter 039.
- Email channel calling Unit 7 wrapper, render-once via `createElement` — lesson 2 of chapter 070.
- `user_notification_preferences` shape, `(userId, category)` unique, default-on, critical override — lesson 3 of chapter 070.
- Batched prefs read — lesson 3 of chapter 070 + lesson 2 of chapter 039 (N+1).
- `notification_dedup` shape, 60-second window, registry-defined `keyBy`, composite index, check-then-insert race accepted — lesson 4 of chapter 070.
- Dispatcher order — lesson 4 of chapter 070.
- `authedAction`, `withTenant`, audit-log writes — chapter 057 / chapter 065.
- Webhook transaction-then-commit-then-dispatch — chapter 063 / chapter 065.
- React Email templates — chapter 049.
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

- **Call sites** (`sendInvitation`, `changeMemberRole`, the billing webhook) build a `NotificationEvent` and `await dispatch(...)` after their transaction commits.
- **`dispatch(event)`** looks up the registry entry, reads preferences once for all recipients, then per recipient resolves channels, claims dedup, and fans out.
- **Channel functions** (`sendEmailChannel`, `writeInboxChannel`) share `({ recipient, event, payload, rendered })` and run behind per-channel `try/catch`.
- **The registry** maps each event type to its `preferenceCategory`, channels, dedup window, templates, and optional critical channel.
- **Three tables** back the seam: `notifications` (the inbox feed), `user_notification_preferences` (per-category channel toggles), `notification_dedup` (the time window).
- **`/inspector`** drives every behavior; **`/inbox`** is the server-rendered read of `notifications`.

### Starting file tree

The annotated tree, provided-vs-stubbed callouts, and the TODO highlights live in the Chapter framing's "Starter file tree" section above.
The highlighted focus — the files the student fills — are `registry.ts`, `dispatcher.ts`, `dedup.ts`, `prefs.ts`, `get-user-email.ts`, `channels/email.ts`, `channels/inbox.ts`, the three stub tables in `db/schema.ts`, and the three call sites (`src/lib/invitations/send.ts`, `src/lib/invitations/manage.ts`, the Stripe webhook past-due branch).

### Roadmap

A CardGrid, one Card per lesson:

- **Lesson 2 — Registry, dispatcher, and dedup.** Define the three events, write `dispatch()` with stub channels, and prove the 60-second dedup window from the inspector.
- **Lesson 3 — Channels and preferences live.** Replace the stubs with the inbox writer, the email channel, and a batched preferences read with default-on and the critical-channel override.
- **Lesson 4 — Wire the three call sites.** Add `dispatch()` after commit in `sendInvitation`, `changeMemberRole`, and the Stripe past-due webhook branch.

### Setup

Setup commands, in order (Steps component):

1. Clone the starter via `degit`.
2. `pnpm install`.
3. `docker compose up -d` (Postgres 18).
4. Copy `.env.example` to `.env`, generate `BETTER_AUTH_SECRET` and `INVITATION_SIGNING_SECRET` with `openssl rand -base64 32`, and leave `EMAIL_MOCK=1`.
5. `pnpm db:migrate && pnpm db:seed`.
6. `pnpm dev`.

Env vars: `DATABASE_URL` (Postgres connection, from `docker-compose.yml`), `BETTER_AUTH_SECRET`, `INVITATION_SIGNING_SECRET`, `RESEND_API_KEY` (mocked when `EMAIL_MOCK=1` — any non-empty value works locally), `STRIPE_WEBHOOK_SECRET` (from chapter 065's `stripe listen`, needed only for the live billing-past-due path), `APP_URL`/`NEXT_PUBLIC_APP_URL` (`http://localhost:3000`), `EMAIL_MOCK=1` (deterministic email-sent counter).
Stripe-CLI setup is inherited from chapter 065 — `stripe listen` running enables the live billing-past-due path; without it, the inspector's `Fire billing-past-due` button stands in.

Expected result: `pnpm dev` shows the chapter 065 dashboard working; `/inspector` loads (its notification reads return empty at scaffold) but every fire button errors with `dispatch not implemented`; `/inbox` renders empty.
The starter forks chapter 065 working — invitation actions, Stripe webhook, audit log, billing — and this project layers the dispatcher on top rather than rewriting; `EMAIL_MOCK` is the inspector's verification proxy because real Resend round-trips during development are slow and rate-limited, and the student does not change `lib/email.ts`.

---

## Lesson 2 — Registry, dispatcher, and dedup

Define the three notifiable events and ship a callable `dispatch()` that dedups a burst down to one.
The finished result: from `/inspector`, `Fire invite-sent` returns `{ sent: 2, deduped: 0, suppressedByPrefs: 0 }` (one increment per stubbed channel) and writes one `notification_dedup` row; firing again inside 60 seconds returns `deduped: 1` with no second dedup row; `Rapid-fire (5x in 2s)` returns `deduped: 4`; after 61 seconds the window releases and a fresh fire dedups from zero.
Channels are still stubs that only increment the counter — no real inbox rows or email yet.

### Your mission

This lesson lands the spine of the dispatcher: the registry that names what can be notified, the dedup helper that collapses a burst, and the `dispatch()` function that ties them together.
These three pieces only reach a confirmable state as a unit — dedup is observable only through a `dispatch()` that consults the registry — so they ship together, with the channels deliberately stubbed so the dedup behavior is what you are verifying.
The registry is `as const satisfies Record<string, NotifiableEvent>` so the event-type union is inferred and an unknown key is a compile error; adding an event stays a one-entry change.
Dedup lives inside the dispatcher, after the (still-stubbed) preference step and before channels, keyed by `(eventType, dedupKey, recipientUserId)` — `recipientUserId` is load-bearing, because two recipients getting the same event is not a duplicate.
The 60-second window is per-event in the registry, widened for high-frequency events and reconsidered for financial ones; the check-then-insert race is accepted here (one duplicate per rare concurrent burst), with the unique-constraint upgrade named as the next reach.
A registry miss throws `NotificationError('REGISTRY_MISS')` and is never swallowed — that is a programmer error, not a channel failure, so the per-channel `try/catch` you scaffold is per-channel, not per-dispatch.
Out of scope this lesson: real channels and real preference resolution — both stay as the starter's no-op stubs (the no-op channels still increment `sent`, the stub `resolveChannels` returns every channel) — and the call-site wiring; all of those land later.

Requirements checklist — each item a behavior you can confirm from the inspector or the database:

- The three stub tables (`notifications`, `user_notification_preferences`, `notification_dedup`) exist after migration, with the dedup composite index `(eventType, dedupKey, recipientUserId, firedAt desc)` and the partial unread index on `notifications`, confirmable in Drizzle Studio.
- `Fire invite-sent` from the inspector returns `{ sent: 2, deduped: 0, suppressedByPrefs: 0 }` and writes exactly one `notification_dedup` row.
- Firing the same event again within 60 seconds returns `deduped: 1` and writes no second dedup row.
- `Rapid-fire invite-sent (5x in 2s)` returns one new dispatch with `deduped: 4` aggregated.
- Waiting 61 seconds and refiring returns a fresh dispatch with `deduped: 0` — the window has released.
- Firing an unknown event type surfaces `NotificationError('REGISTRY_MISS')` rather than a silent no-op.

### Coding time

Implement the registry, `dedup.ts`, and `dispatcher.ts` against the reference signatures and the lesson's tests.
The inspector's three fire buttons already call `dispatch()` through the provided server actions — no wiring needed; the barrel `index.ts` is provided.
Then read the solution walkthrough.

The hidden solution covers:

- `db/schema.ts`: uncommenting the three stub tables under the `// TODO(L2)` block per reference; `pnpm db:generate --name add_notifications`, inspecting the SQL (three `CREATE TABLE`s, the composite indexes, one partial index on unread), `pnpm db:migrate`.
- `registry.ts`: the three keys per reference, importing the three React Email templates, typed with `as const satisfies Record<string, NotifiableEvent>` so unknown keys are flagged and `EventType` is inferred — and why the email-template field is the permissive `(props: any) => ReactElement` form (each typed template's props do not assign to a `Record<string, unknown>` param under TS 6).
- `dedup.ts`: `isDuplicate` selecting the most-recent row for the triple with `firedAt > now() - make_interval(secs => windowSeconds)`, returning `true` on hit; `recordDedup` inserting one row after a successful fan-out; `computeDedupKey` joining `keyBy` values with `:` (`subjectId` off the event, the rest off the payload); the accepted check-then-insert race and the unique-constraint upgrade named.
- `dispatcher.ts` (the L2 portion): the body order — registry lookup throwing `REGISTRY_MISS` if absent, the per-recipient loop, `isDuplicate` (increment `deduped` and continue on hit), the channel fan-out over the no-op channel stubs each wrapped in `try/catch` incrementing `sent` once per channel, `recordDedup` after fan-out; why the `try/catch` is per-channel and `REGISTRY_MISS` is not caught. The batched prefs read, `resolveChannels`, and render-once land in lesson 3 (the dispatcher's `// TODO(L3)`).
- Callouts: the `satisfies` inference (chapter 005 narrowing discipline), the per-recipient dedup key, and the per-event window guidance (5-10 min for comments/mentions; skip or payload-discriminate for financial events).

### Moment of truth

Run `pnpm test:lesson 2` — the starter ships `tests/lessons/Lesson 2.test.ts` as a `describe.todo` scaffold for the dedup window, the `DispatchResult` shape, and the `REGISTRY_MISS` throw, which this lesson fills in.
Then confirm by hand:

- Drizzle Studio shows the three tables and their indexes after migration.
- `Fire invite-sent` shows `{ sent: 2, deduped: 0, suppressedByPrefs: 0 }` and one `notification_dedup` row.
- A second fire within 60 seconds shows `deduped: 1` with no second dedup row.
- `Rapid-fire (5x in 2s)` shows `deduped: 4`.
- After a 61-second wait, a fresh fire shows `deduped: 0`.

This lesson closes runnable: `dispatch()` works end-to-end with dedup, channels still no-op stubs — no real inbox rows, no real email-counter increment yet.

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
The dispatcher renders `eventDef.templates.inbox(payload)` once into `rendered` before the recipient loop; the inbox channel writes one row from `rendered.inbox.title`/`body` with no joins — render-at-dispatch, so the row is a snapshot immune to later actor-name drift and the inbox UI stays a pure read.
The email channel resolves the address via `getUserEmail` (the student's own `get-user-email.ts`; a null throws `RECIPIENT_NOT_FOUND`, which the dispatcher swallows), renders the registry template via `createElement(eventDef.templates.email, rendered.emailProps)`, and sends with a deterministic `idempotencyKey` — no unsubscribe headers, because transactional notifications carry none and opt-out is the per-category toggle; suppression stays the wrapper's concern.
Out of scope: the call-site wiring (next lesson) and any inbox UI past the provided `/inbox` list and the provided inspector (prefs panel, `setPref`, fire buttons are all shipped).

Requirements checklist — each item a behavior you can confirm from the inspector:

- As `bob` (seeded `team` → `email` off), `Fire invite-sent` writes one new inbox row, leaves the email counter unchanged, and returns `suppressedByPrefs: 1`.
- As `alice` (no prefs row), `Fire invite-sent` increments both the inbox panel and the email counter — default-on holds.
- Toggling `alice`'s `team` → `inbox` off and refiring increments the email counter only.
- With `billing` → `email` off, `Fire billing-past-due` still increments the email counter — the critical-channel override holds.
- A new inbox row's `title` and `body` match the registry's inbox template for the event, written once at dispatch time.
- The `security` → `email` toggle is rendered disabled on the prefs panel and has no server-side effect.

### Coding time

Implement `prefs.ts`, `get-user-email.ts`, `channels/inbox.ts`, and `channels/email.ts`, then finish the dispatcher's `// TODO(L3)` (batched prefs read, `resolveChannels`, render-once), against the reference signatures and the lesson's tests.
The inspector's prefs panel and `setPref` action are already provided.
Then read the solution walkthrough.

The hidden solution covers:

- `prefs.ts`: `readPrefsForCategory` as one batched `WHERE userId IN (...) AND category = ?` query returning `Map<userId, NotificationPrefRow | undefined>` (missing users map to `undefined`); `resolveChannels` with the `?? true` default-on and `|| channel === event.criticalChannel` override — the two load-bearing clauses explained on sight.
- `get-user-email.ts`: a single `select email from user where id = ?` returning `string | null`.
- Dispatcher `// TODO(L3)` edits: adding the batched `readPrefsForCategory` before the per-recipient loop and the `resolveChannels` call inside it (read once per dispatch); rendering `rendered` once (inbox title/body + emailProps); incrementing `suppressedByPrefs` by the diff when `resolveChannels` returns fewer channels than `eventDef.channels` and skipping a fully-suppressed recipient; the `channelFns = { email: sendEmailChannel, inbox: writeInboxChannel } satisfies Record<ChannelName, ChannelFn>` map so the loop is `await channelFns[channel](args)` with no branching.
- `channels/inbox.ts`: one INSERT from `rendered.inbox.title`/`body`, no joins; why render-at-display is rejected (actor-name drift, join cost).
- `channels/email.ts`: resolving `to` via `getUserEmail` (throw `RECIPIENT_NOT_FOUND` on null), rendering the template via `createElement(eventDef.templates.email, rendered.emailProps)`, calling `sendEmail` with a deterministic `idempotencyKey` and no unsubscribe headers; logging-and-throwing on a non-ok `sendEmail` Result so channel independence holds; suppression as the wrapper's concern; why `RECIPIENT_NOT_FOUND` is swallowed.
- Callouts: `REGISTRY_MISS` bubbling out while channel failures are swallowed (the `try/catch` is per-channel, not per-dispatch); why transactional notification emails carry no `List-Unsubscribe` header (opt-out is the per-category preference toggle, and the critical channel ignores it); the disabled `security` → `email` toggle as the critical-channel affordance (no `security` event ships, the pattern is illustrative).

### Moment of truth

Run `pnpm test:lesson 3` — the starter ships `tests/lessons/Lesson 3.test.ts` as a `describe.todo` scaffold for default-on, channel suppression, the critical-channel override, and channel independence, which this lesson fills in.
Then confirm by hand:

- As `bob`, `Fire invite-sent` writes an inbox row, leaves the counter unchanged, returns `suppressedByPrefs: 1`.
- As `alice` (no prefs row), both channels fire; toggle `team` → `inbox` off and only email fires.
- After resetting, with `billing` → `email` off, `Fire billing-past-due` still increments the email counter.
- A new inbox row's `title`/`body` match the registry's inbox template.
- Use `Make email fail` and fire — the inbox row is still written; the dispatch log shows the email error swallowed.

This lesson closes runnable: every inspector button produces its expected effect, and the `EMAIL_MOCK` email-sent counter is now load-bearing.

---

## Lesson 4 — Wire the three call sites

Fire the dispatcher from the real product surfaces, always after the transaction commits.
The finished result: `sendInvitation` to an existing user writes the invitation, commits, then dispatches an inbox row plus email to the invitee; `changeMemberRole` writes both an `auditLogs` row and a `notifications` row; the Stripe past-due webhook lands, commits, then dispatches to each org owner.

### Your mission

This lesson moves the dispatcher off the inspector's direct-fire demo and onto the three call sites it exists to serve — `sendInvitation`, `changeMemberRole`, and the Stripe past-due webhook branch.
The single discipline tying them together: dispatch runs after the action's transaction commits, never inside it — `await withTenant(...)`-work, then `await dispatch(...)` — because notifying for state that later rolls back is the failure mode the seam exists to prevent.
These three are one capability — wire the production flow — verified as a set, because each is the same fire-after-commit move applied to a different surface, and the inspector's fire buttons (which call `dispatch()` directly with a fixed payload) already proved the dispatcher itself.
The webhook is the awkward one: `onSubscriptionUpdated` reads the org's owner list inside `tx` (consistent with the transition it commits) and pushes an `org.billing.past_due` descriptor onto a closure-captured `pendingDispatches: NotificationEvent[]` array; the route's `POST` drains that array with the dispatcher *after* `db.transaction` resolves; the transactional-outbox alternative is named and deferred.
The dispatcher trusts its caller — gating happens at the action boundary via `authedAction`, so a direct call from a non-action path bypasses the admin check.
Two dedup layers compose without conflict: `processed_events` at the webhook handler catches duplicate deliveries, while `notificationDedup` inside the dispatcher catches duplicate user-facing notifications even from distinct event IDs.
For an invite to an existing user, two emails go out — chapter 065's invitation email (the one named non-seam `sendEmail` call, sent after commit in `sendInvitation`) plus the dispatcher's `org.invitation.sent`; merging them is the next reach, and v1 accepts the duplication because that path predates the seam.
Out of scope: changing `lib/email.ts`, merging the duplicate invite emails, and short-circuiting no-op role changes.

Requirements checklist — each item a behavior you can confirm from the real surface or the test suite:

- `sendInvitation` to an existing user writes the invitation, commits, then produces one inbox row plus one email increment for the invitee.
- Inviting a non-user address (the seeded `newcomer@acme.test` shape) sends only the chapter 065 invitation email — the dispatcher no-ops on the empty recipient list.
- `changeMemberRole` writes both an `auditLogs` row and a `notifications` row, with one email increment for the affected member.
- The Stripe past-due transition lands the webhook, commits, then produces one inbox row plus one email per org owner.
- A rolled-back action notifies nobody — no rows anywhere, no email increment (the fire-after-commit guarantee the tests assert; the `Wrap invite in rollback` inspector control documents the principle).
- A grep for `sendEmail(` and `db.insert(notifications)` outside `lib/notifications/` returns only the one named exception (the chapter 065 invitation email in `sendInvitation`) — the seam holds.

### Coding time

Add the `dispatch()` call after commit in `src/lib/invitations/send.ts` (`sendInvitation`) and `src/lib/invitations/manage.ts` (`changeMemberRole`), and wire the past-due path in `src/lib/webhooks/stripe.ts` + `src/app/api/webhooks/stripe/route.ts`, against the reference call-site shape and the lesson's tests.
Then read the solution walkthrough.

The hidden solution covers:

- `src/lib/invitations/send.ts`: the `await dispatch({ type: 'org.invitation.sent', recipientUserIds: existingUser ? [existingUser.id] : [], subjectId: invitationId, payload: {...} })` after `withTenant` commits; `existingUser` resolved by `db.query.user.findFirst({ where: eq(user.email, email) })`, the empty-array no-op for an absent user, and the chapter 065 invitation email still sending via the unauthenticated path.
- `src/lib/invitations/manage.ts`: reading the org name, then `await dispatch({ type: 'org.member.role_changed', recipientUserIds: [target.userId], ... })` after commit, with the chapter 065 audit-log write left unchanged so both `auditLogs` and `notifications` write.
- The Stripe webhook past-due branch: `onSubscriptionUpdated` gains a `pendingDispatches: NotificationEvent[]` param, reads the org's owner user ids inside `tx` on `patch.status === 'past_due'`, and `pendingDispatches.push({ type: 'org.billing.past_due', recipientUserIds: owners.map(o => o.userId), ... })`; `route.ts` captures `pendingDispatches` in a closure and drains it with the dispatcher after `db.transaction` resolves — read inside, dispatch after.
- Callouts: the fire-after-commit pattern (`await withTenant(...)`; `await dispatch(...)`), the webhook's read-inside/dispatch-after shape with the transactional-outbox alternative deferred, the two-email duplication for existing-user invites accepted in v1, the trust-the-caller gating at the action boundary, the two composing dedup layers, and the grep seam check.

### Moment of truth

Run `pnpm test:lesson 4` — the starter ships `tests/lessons/Lesson 4.test.ts` as a `describe.todo` scaffold for the invite, role-change, and webhook call sites and the fire-after-commit guarantee, which this lesson fills in.
Then confirm by hand:

- Invite an existing user (e.g. via `sendInvitation` exercised in the dashboard/test flow) — inbox row plus email for the invitee, after the action commits.
- Invite a non-user address — chapter 065 invite email only, dispatcher no-ops on the empty recipient list.
- Change a member's role — both `auditLogs` and `notifications` write, one email increment.
- Trigger a `customer.subscription.updated` with `past_due` status (via `stripe` CLI or the inspector's `Fire billing-past-due`) — `processed_events` plus entitlement plus audit plus one notification per owner; replay blocks at the handler and the dispatcher's dedup is the second layer.
- Read the `Wrap invite in rollback` control's note and confirm via the tests that a rolled-back action writes no rows and bumps no counter.
- Run the grep seam check: `sendEmail(` and `db.insert(notifications)` outside `lib/notifications/` return only the named chapter 065 invitation-email exception.
- Confirm in Drizzle Studio that the `(userId, createdAt desc)` and partial unread indexes back the inbox feed.

This lesson closes runnable: three real call sites dispatch after commit, the invitation actions and Stripe webhook produce real notifications and emails, and `/inbox` shows real rows — the production-shaped flow end-to-end.

This is the project's final build, so it also names the forward references the dispatcher hands off:

- Chapter 073 — `cacheTag('notifications', userId)` on the inbox feed when volume justifies; the project deliberately does not cache.
- Chapter 075 — Upstash-backed dedup replaces the table when throughput crosses the database-write threshold; the dispatcher contract stays the same.
- Chapter 066 — a Trigger.dev-backed channel queue moves channel sends behind a durable worker; the dispatcher contract stays the same.
- Chapter 081 — the audit-log line and the channel-failure log discipline.
- Chapter 088 — integration tests for prefs-respected, default-on, dedup, and channel-independence.
- Chapter 092 — `DispatchResult` is the structured-log shape; dashboards on dedup rate, suppression rate, and channel-failure rate live there.
