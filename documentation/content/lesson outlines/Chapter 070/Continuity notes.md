# Chapter 070 — The notification dispatcher

## Lesson 1 — One seam, many channels

**Taught:** Introduced the dispatcher pattern as the single notification seam — call sites fire one typed event (`dispatch({ type, recipientUserIds, subjectId, payload })`), the dispatcher owns all channel decisions; established the `notifiable_events` registry (`as const satisfies Record<string, NotifiableEvent>`) as the enumerable source of truth; defined the dispatcher's input/side-effects/output contract including `DispatchResult { sent, deduped, suppressedByPrefs }`; explained the `notifications` table shape (render-at-dispatch, snapshot model); drew the audience-based line between `notifications` (user-facing inbox) and `audit_logs` (operator-facing).

**Cut:** Nothing significant cut that a later lesson would depend on; all deferred items (channel mechanics, prefs schema, dedup mechanic, inbox UI) are by design scoped to later lessons.

**Debts:**
- Lesson 2: per-channel send mechanics (Resend wrapper, inbox-row writer, channel-independence try/catch, `(userId, createdAt desc)` index, full DDL for `notifications`).
- Lesson 3: `user_notification_preferences` schema, default-on rule, category-granularity resolution inside dispatcher, critical-channel override.
- Lesson 4: dedup window mechanic — `notification_dedup` table, key shape, dedup-vs-coalesce, cleanup job.
- Ch071: dispatcher's full implementation body.

**Terminology:**
- `dispatch(event)` — the single call shape; takes one options object.
- `notifiable_events` — registry object; `as const satisfies Record<string, NotifiableEvent>`; keys are `domain.entity.action` dotted string literals.
- `EventType = keyof typeof notifiableEvents` — the narrowed union of valid event keys.
- `NotificationEvent` — input type: `{ type: EventType; recipientUserIds: string[]; subjectId: string; payload: Record<string, unknown> }`.
- `DispatchResult` — return type: `{ sent: number; deduped: number; suppressedByPrefs: number }` — a plain count summary, deliberately NOT a `Result<T>`.
- `fan-out` — sending one event to multiple independent destinations.
- `transactional outbox` — write notification intent inside the same DB transaction, deliver from a worker; named as the senior upgrade when post-commit gap is unacceptable, not implemented.
- `lib/notifications/` — canonical home for the dispatcher module; starts with `import 'server-only'`.
- `notifications` table columns: `id` (UUIDv7), `userId`, `orgId` (nullable), `eventType`, `subjectId`, `title`, `body`, `payload` (jsonb), `readAt` (nullable = unread), `createdAt`.
- Render-at-dispatch: `title` and `body` stored as rendered strings; `payload` keeps stable ids for UI navigation.

**Patterns and best practices:**
- `dispatch` is called after `db.transaction()` commits, never inside it — same rule as all external calls; a notification for a rolled-back action is worse than a missed notification.
- `recipientUserIds` is always a resolved list; caller resolves audience (e.g. `getOrgMembersByRole`), dispatcher stays audience-neutral.
- Call sites never import `sendEmail` or write to `notifications` directly — leaking channel knowledge breaks the seam; a grep for direct sends outside `lib/notifications/` is a valid regression check.
- Dispatcher never throws on channel failure; logs and continues — channels are independent by design.
- `notifications` vs `audit_logs` split by audience: ask "who reads it?" — user-facing → notifications, operator-facing → audit_logs, both → write both.
- Registry entry fields: `channels` (default set, prefs can subtract), `template`, `preferenceCategory`, `dedup`, `description`.
- The `org.member.role_changed` registry entry's `dedup` field must be `{ windowSeconds: 60, keyBy: ['subjectId', 'newRole'] }` — established by L4's teaching; L1's registry example should match this.
- v1 dispatcher runs in-line with the request; move sends behind Trigger.dev queue when volume climbs, email latency shows in action timing, or retries need crash-survival.

**Misc:**
- Lesson explicitly bridges to prior named seams: action boundary (Ch043/057) and webhook seam (Ch063) — future lessons can reference this lineage without re-explaining.
- `audit_logs` table and `logAudit()` from Ch057 are assumed known; this lesson only contrasts, does not re-teach.
- The dispatcher's return is a plain `{ sent, deduped, suppressedByPrefs }` count object — not a discriminated union — this is a deliberate divergence from the course's `Result<T>` discipline and should be maintained consistently.

---

## Lesson 2 — Email and inbox, independent channels

**Taught:** Built the two channel functions (`sendEmailChannel`, `writeInboxChannel`) that sit between the dispatcher and their sinks; established the uniform `ChannelFn` signature, the branchless dispatcher loop keyed on channel name, dispatcher-owned per-channel try/catch, render-once discipline, and the inbox composite index.

**Cut:** `List-Unsubscribe` / RFC 8058 header on notification emails — intentionally omitted because dispatcher notifications are transactional; opt-out is per-category preference in L3, not an email header. Do not add it back.

**Debts:**
- Lesson 3: `user_notification_preferences` schema, default-on rule, and category-granularity resolution that decides which channels appear in the `channels` array fed to the loop — the lesson ends with a forward reference to L3 as the owner of notification opt-out.
- Lesson 4: dedup window (named in the closing).
- Ch071: full dispatcher body assembled; inbox UI (feed rendering, unread badge, mark-read interaction) lives in the ch071 starter's inspector.

**Terminology:**
- `ChannelFn` — `type ChannelFn = (args: { recipient: Recipient; event: NotificationEvent; payload: Record<string, unknown>; rendered: RenderedContent }) => Promise<void>`. The `event` arg is the input `NotificationEvent` (L1's dispatch input type), not a registry entry — channels read the registry via `notifiableEvents[event.type]`.
- `channelFns` — lookup object `{ email: sendEmailChannel, inbox: writeInboxChannel } satisfies Record<ChannelName, ChannelFn>`; the dispatcher loops over resolved channels and calls `channelFns[channel](args)` with no branch on channel type.
- `ChannelName` — `'email' | 'inbox'` union of channel keys.
- `Recipient` — at minimum `{ userId: string }`; each channel resolves further identifiers itself (email channel calls `getUserEmail(userId)`; inbox uses userId directly).
- `RenderedContent` — pre-computed display object passed from the dispatcher to all channels; contains `emailProps` (for the React Email component), `inbox: { title, body }` (from the registry's inbox formatter), `orgId`, and resolved display strings (e.g. `actorName`).
- `getUserEmail(userId)` — resolves user email address from Better Auth's `user` table; lives in `lib/notifications/`.
- Registry entry `templates` field — extended from L1's single `template` to a grouped `templates: { email: ReactEmailComponent, inbox: (payload) => { title, body } }`; this shape is canonical for all downstream lessons and ch071.
- Inbox formatter — `(payload) => { title: string; body: string }` per event type; runs in the dispatcher before the loop, output frozen onto the `notifications` row.
- Render-once vs render-at-dispatch: render-at-dispatch fixes the message in *time* (L1); render-once fixes it across *channels* (L2) — same instinct, different axis.
- Dispatcher, channel, sink — three-layer call stack: dispatcher (loop + try/catch) → channel functions (thin adapters) → sinks (`sendEmail` wrapper → Resend; `db.insert(notifications)`).

**Patterns and best practices:**
- Channel functions return `Promise<void>`, not `Result<T>` — the dispatcher's per-channel try/catch owns failure; expected `sendEmail` failures are logged and swallowed, not thrown.
- Idempotency key for email channel: `` `${event.type}:${event.subjectId}:${recipient.userId}` `` — deterministic from event identity so retried dispatches collapse at Resend.
- `sendEmail` is called without `from` or `replyTo` args — the wrapper owns those from env; passing them from the channel is a regression.
- Channel functions start with `import 'server-only'`.
- Inbox composite index: `index('idx_notifications_user_created').on(t.userId, t.createdAt.desc())` — explicit name, access column first, matches feed sort; ship it with the table.
- Insert inbox row before sending email when feasible (soft preference) so a user who reads the email and clicks through sees the inbox row already present.
- No raw HTML in email templates; rely on React Email's default escaping; refuse `dangerouslySetInnerHTML`.
- Retries on channel failure belong to a Trigger.dev durable-queue upgrade, not v1; a logged failure is sufficient at this volume.

**Misc:**
- The `templates: { email, inbox }` registry shape is now canonical; L1's continuity notes show `template` (singular) — the extension happened here and must be consistent in L3, L4, and ch071.
- Inbox read queries are sketched (unread count via `db.$count`, mark-read via `db.update(...).set({ readAt: sql\`now()\` })`, feed via `select … where userId = ? order by createdAt desc limit 50` cursor-paginated) but not implemented; UI belongs to ch071 starter.
- Lesson confirms notifications are transactional email (ch048 distinction) — no `List-Unsubscribe` header; opt-out is the per-category preference toggle in settings, owned by L3.

---

## Lesson 3 — Preferences, read once, default-on

**Taught:** Introduced the `userNotificationPreferences` table (one row per `(userId, category)`, per-channel booleans, default-on at the column level); established the default-on rule (missing row = all channels allowed, `?? true`); built `resolveChannels(event, prefs | undefined): ChannelName[]` with the critical-channel override; showed the single batched prefs read across all recipients; stitched `resolveChannels` into the L2 loop and made `suppressedByPrefs` real; drew the boundary between preference opt-out (before the channel runs) and email suppression (inside the email wrapper).

**Cut:** HMAC-signed in-email unsubscribe link — deliberately dropped (L2 omitted `List-Unsubscribe`; these are transactional notifications, not marketing bulk email; the chapter-outline topic does not apply). The full `/settings/notifications` UI (toggle widgets, upsert Server Action body) deferred to Ch071. Quiet hours, digest/coalesce, and per-org admin overrides on member prefs named and deferred.

**Debts:**
- Lesson 4: 60-second dedup window — `notification_dedup` table, key shape, dedup-vs-coalesce, cleanup job (named in the L3 closing).
- Ch071: `/settings/notifications` page renders registry categories with per-channel toggles; Server Component reads `userNotificationPreferences`; Server Action upserts a row on change (upsert is the moment a row first appears, maintaining missing-row default-on); critical-channel toggles render disabled with tooltip.

**Terminology:**
- `userNotificationPreferences` table — `pgTable('user_notification_preferences', ...)`: `id` (UUIDv7), `userId` (text, FK → `user.id` `onDelete: 'cascade'`), `category` (text), `email` / `inbox` / `push` (boolean, `.default(true)`), `updatedAt`; named composite unique `user_notification_preferences_user_id_category_unique` on `(userId, category)`.
- `category` — a bundle of related event types sharing one user toggle (e.g. `team`, `billing`, `security`, `product`); 4–6 categories; the `preferenceCategory` field on each registry entry is the join key.
- `opt-out` — the only user action that ever writes a prefs row; a row's absence is the normal steady state.
- `resolveChannels(event, prefs)` — pure synchronous helper; `prefs?.[channel] ?? true` is the default-on predicate; `criticalChannel` override forces a channel back on even if filtered; lives in `lib/notifications/`.
- `criticalChannel?: ChannelName` — optional registry entry field; `security` events and act-now `billing` events carry it; the resolver forces it back on; settings UI renders these toggles disabled with explanatory tooltip.
- Subtraction model — preference rows can only subtract channels from the event's declared default set; a missing row subtracts nothing; a critical channel cannot be subtracted.
- `prefsByUser` — `Map<string, NotificationPrefRow>` built from the single batched query; `prefsByUser.get(userId)` returns `undefined` for users with no row (default-on).
- `NotificationPrefRow` — `typeof userNotificationPreferences.$inferSelect`; `prefs?.[channel]` type-checks because `email`/`inbox`/`push` are named columns.

**Patterns and best practices:**
- Preference resolution happens in exactly one place — the dispatcher, between registry lookup and the L2 fan-out loop; a prefs read anywhere outside `lib/notifications/` is a seam leak (grep check).
- One batched Drizzle query for all recipients (`inArray(userId, recipientUserIds)` + `eq(category, event.preferenceCategory)`), then per-recipient `Map` lookup — never a per-recipient DB round-trip.
- Missing row = opted-in on all channels; only an explicit `false` column value drops a channel; this is enforced by `?? true`, not by writing default rows on signup.
- `userNotificationPreferences` has no `orgId` column — prefs are user-scoped, not org-scoped; the tenant-leading-column rule does not apply; the same user carries prefs across every org.
- `push` column ships as reserved (no push channel consumer yet); schema anticipates the `ChannelName` union growing to include push.
- `suppressedByPrefs += event.channels.length - resolvedChannels.length` tallied per recipient inside the dispatcher loop.

**Misc:**
- `userId` is `text` (matches Better Auth's `user.id` type); do not use `uuid()` for this FK column.
- Two opt-out pathways: (1) prefs row — user's product choice, short-circuits before the email channel runs; (2) email suppression (`email_suppressions`, Ch048/Ch063) — deliverability/compliance backstop, short-circuits inside the email wrapper. Complementary, not redundant.
- Transactional notification emails carry no in-email unsubscribe link (L2 decision, not reversible here); signed unsubscribe tokens belong to marketing bulk email (a different sender), not the dispatcher.
- `DispatchResult` remains a plain count object (not `Result<T>`) — maintained from L1's deliberate divergence.

---

## Lesson 4 — Dedup the rapid duplicates

**Taught:** Completed the dispatcher by implementing the dedup window — `notification_dedup` table, composite key `(eventType, dedupKey, recipientUserId)`, 60-second default window per-event-type in the registry's `dedup: { windowSeconds, keyBy }` field, `isDuplicate`/`recordDedup` helpers, and the check-then-fan-out-then-insert ordering inside the per-recipient loop; filled `DispatchResult.deduped` (the last unfilled counter); contrasted dedup (drop same event) vs. coalesce (summarize distinct noisy events); layered dispatcher dedup against webhook idempotency (`processed_events` ledger); named the dedup rate as an observability health signal. A `VideoCallout` (Arpit Bhayani, "Build a robust Payments service using Idempotency Keys", ~16 min) was added in the "different layers" section despite the lesson outline saying no YouTube video.

**Cut:** Atomic unique-constraint variant closing the check-and-insert race (named as deferred lock-it-down upgrade, not built); coalesce/digest implementation (deferred until comments/mentions ship); Redis-backed dedup (deferred to Ch074/Upstash); nightly cleanup Trigger.dev job implementation (deferred to Ch066, rule stated: never prune in-line).

**Debts:**
- Ch071: `dispatch()` wired into three call sites (the first live end-to-end fan-out); full dispatcher body assembled; `/settings/notifications` UI; inbox feed UI; nightly cleanup job.
- Ch066: nightly `notification_dedup` prune job — `delete where firedAt < now() - (longest window + buffer)` on a schedule, never in-line.
- Ch074 (Upstash): Redis-backed dedup as the throughput upgrade when a DB write per dispatch becomes the bottleneck.

**Terminology:**
- `notification_dedup` table — `pgTable('notification_dedup', ...)`: `id` (UUIDv7 via `$defaultFn`), `eventType` (text), `dedupKey` (text), `recipientUserId` (text, FK → `user.id` `onDelete: 'cascade'`), `firedAt` (timestamptz, `defaultNow()`); no `orgId` (user-scoped internal bookkeeping, same rationale as prefs).
- `idx_notification_dedup_lookup` — composite index `on(t.eventType, t.dedupKey, t.recipientUserId, t.firedAt.desc())`; matches the check's equality + range filter; ships with the table.
- `dedup` registry field — `{ windowSeconds: number; keyBy: string[] }` per event type; `windowSeconds` defaults to 60; `keyBy` is an array of payload/subject field names the dispatcher assembles into `dedupKey`.
- `dedupKey` — string assembled by the dispatcher from the fields named in `keyBy`; e.g. for `keyBy: ['subjectId']` → the invitation id; for `keyBy: ['subjectId', 'newRole']` → member id + role transition.
- Canonical registry `dedup` shapes (taught here, must match L1's registry and Ch071 starter): `'org.invitation.sent'` → `{ windowSeconds: 60, keyBy: ['subjectId'] }`; `'org.member.role_changed'` → `{ windowSeconds: 60, keyBy: ['subjectId', 'newRole'] }`.
- `isDuplicate({ event, userId, payload }): Promise<boolean>` — existence check against `notification_dedup`; uses `sql\`\`` fragment for `firedAt > now() - interval '?'` range; returns bare `boolean`, not `Result<T>`.
- `recordDedup({ event, userId, payload }): Promise<void>` — inserts one row after a successful fan-out.
- `coalesce` — collapsing distinct but noisy events into one summarized notification; contrasted with dedup; deferred.
- Per-recipient loop order (canonical, complete): `resolveChannels` → skip if empty → `isDuplicate` → skip + `result.deduped++` if hit → channel fan-out → `result.sent++` → `recordDedup`.
- "First one wins" — on a burst the first firing's payload is the one delivered; if wrong payload wins, the key is too broad.

**Patterns and best practices:**
- Dedup check runs *after* prefs resolution and the empty-channel guard — writing dedup rows for recipients who never received anything poisons the count and the window.
- Dedup row insert runs *after* successful fan-out — never before, to avoid phantom rows for failed sends.
- `isDuplicate` and `recordDedup` live in `lib/notifications/`, start with `import 'server-only'`, take options objects (not positional args).
- `keyBy` design rule: include the subject id; exclude anything that varies between redeliveries of the same subject (timestamps, request ids, nonces). Too narrow → nothing ever dedupes (diagnostic: flat-zero dedup rate). Too broad → distinct events collapse (diagnostic: legitimate notifications go missing).
- Window sizing rule: pick a value comfortably larger than the longest retry interval it must absorb; never equal to it (boundary races cause nondeterministic misses).
- 60s window is sized for tight bursts and concurrent firings; widely-spaced provider retries (Stripe first retry ~5 min) are caught by `processed_events` ledger at the webhook handler, not by this window.
- Alert on the *delta* in dedup rate, not its presence; a spike signals a call-site bug (re-render firing twice, loop calling dispatch per row).
- Log dispatch result: `logger.info({ seam: 'notifications.dispatch', ...result })` — makes `{ sent, deduped, suppressedByPrefs }` queryable.
- Check-and-insert race is left open in v1 by design (a duplicate is less bad than a unique-constraint failure path); do not silently "fix" it in a later lesson without flagging the deliberate choice.

**Misc:**
- `DispatchResult.deduped` is now real; all three counters declared in L1 are filled. Ch071 can report a complete, non-zero result object.
- `notification_dedup` has no `orgId` column — deliberate (matches prefs table reasoning in L3); the tenant-leading-column rule does not apply.
- DrizzleCoding exercise uses explicit string id literals (no `uuidv7()` in seed DDL) and `now() - interval '...'` for `firedAt` seeding — PGlite constraint from project memory.
- `DispatchResult` remains a plain count object (not `Result<T>`), `isDuplicate` returns bare `boolean` — both deliberate divergences from `Result<T>` discipline; do not upgrade in Ch071.
