# Chapter 071 — Lesson 2 outline

## Lesson title

Page title: **Registry, dispatcher, and dedup** (chapter-outline title fits — it names the three pieces shipped as a unit).
Sidebar: **Registry & dedup**.

## Lesson type

`Implementation`.

## Lesson framing

The student installs the spine of the notification seam: a registry that is the single source of truth for what can be notified, and a `dispatch()` that collapses a burst of identical events down to one notification. The senior payoff is the discipline of a time-windowed dedup keyed per recipient — keeping a five-click rage-fire from becoming five emails — and the `as const satisfies` registry that makes adding an event a one-entry, compile-checked change. Channels stay stubbed on purpose so the dedup behavior is what gets verified, not the side effects.

## Codebase state

**Entry.** The chapter-065 starter fork runs (invitation actions, Stripe webhook, audit log, billing dashboard). The `lib/notifications/` module exists as scaffold: `types.ts`, `errors.ts`, `index.ts` are complete; `registry.ts` is `{}` with `EventType = never`; `dispatcher.ts` throws `'dispatch not implemented'`; `dedup.ts` returns `false` / no-ops; `prefs.ts`, channels, `get-user-email.ts` are stubs. The three notification tables are commented out under a `// TODO(L2)` block in `db/schema.ts` (last migration `0010`). `/inspector` loads but every fire button errors; `/inbox` is empty. Tests `Lesson 2-4.test.ts` ship as `describe.todo`.

**Exit.** The three tables (`notifications`, `user_notification_preferences`, `notification_dedup`) exist with their indexes (migration `0011_add_notifications`). `registry.ts` holds the three events typed `as const satisfies Record<string, NotifiableEvent>`. `dedup.ts` implements `computeDedupKey` / `isDuplicate` / `recordDedup` against the dedup table. `dispatcher.ts` runs end-to-end: registry lookup → (still-stubbed) prefs read → render-once → per-recipient dedup → per-channel `try/catch` fan-out over the no-op channel stubs → `recordDedup`. From `/inspector`, `Fire invite-sent` returns `{ sent: 2, deduped: 0, suppressedByPrefs: 0 }`; a re-fire within 60s returns `deduped: 1`; rapid-fire returns `deduped: 4`. Channels still no-op (no inbox rows, no email counter). `prefs.ts`, channels, and the call sites remain stubs for lessons 3-4.

## Lesson sections

Implementation type — render the contract's section list: *Goal + Finished result* (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: define the three notifiable events and ship a callable `dispatch()` that dedups a burst down to one. Then a short paragraph (or a `Screenshot` of the inspector's fire-console + counters panel) describing the working loop: `Fire invite-sent` → `{ sent: 2, deduped: 0, suppressedByPrefs: 0 }` and one `notification_dedup` row; refire within 60s → `deduped: 1`, no new dedup row; `Rapid-fire (5x in 2s)` → `deduped: 4`; after 61s the window releases and a fresh fire dedups from zero. Note channels are still stubs that only bump the counter — no real inbox rows or email yet.

### Your mission (header: "Your mission")

Prose paragraph then a `Checklist`. No subsection headers, no implementation hints.

Prose to cover, woven coherently:
- The lesson lands the dispatcher spine — registry, dedup helper, and the `dispatch()` that ties them — shipped together because dedup is only observable through a `dispatch()` that consults the registry; channels are deliberately stubbed so the dedup behavior is what's verified.
- **Constraints:** the registry is `as const satisfies Record<string, NotifiableEvent>` so the event-type union is inferred and an unknown key is a compile error — adding an event stays a one-entry change. Dedup lives *inside* the dispatcher, after the (still-stubbed) preference step and before channels, keyed by `(eventType, dedupKey, recipientUserId)` — `recipientUserId` is load-bearing because two recipients getting the same event is not a duplicate. The 60-second window is per-event in the registry. The check-then-insert race is accepted in v1 (one duplicate per rare concurrent burst), unique-constraint upgrade named as the next reach. A registry miss throws `NotificationError('REGISTRY_MISS')` and is never swallowed — a programmer error, not a channel failure — so the `try/catch` the student scaffolds is per-channel, not per-dispatch.
- **Out of scope:** real channels and real preference resolution stay as starter no-op stubs (the no-op channels still increment `sent`, the stub `resolveChannels` returns every channel), and the call-site wiring — all land in lessons 3-4.

`Checklist` items, each tagged `[tested]` / `[untested]`:
1. The three tables exist after migration, with the dedup composite index `(eventType, dedupKey, recipientUserId, firedAt desc)` and the partial unread index on `notifications`, confirmable in Drizzle Studio. `[untested]`
2. `Fire invite-sent` returns `{ sent: 2, deduped: 0, suppressedByPrefs: 0 }` and writes exactly one `notification_dedup` row. `[tested]`
3. Firing the same event again within 60 seconds returns `deduped: 1` and writes no second dedup row. `[tested]`
4. `Rapid-fire invite-sent (5x in 2s)` returns one new dispatch with `deduped: 4` aggregated. `[tested]`
5. Waiting 61 seconds and refiring returns a fresh dispatch with `deduped: 0` — the window released. `[tested]`
6. Firing an unknown event type surfaces `NotificationError('REGISTRY_MISS')` rather than a silent no-op. `[tested]`

Tagging rationale for the test-coder: items 2-6 are observable runtime behaviors the dedup/dispatch tests assert against. Item 1 (schema/index existence) is left to manual Drizzle Studio confirmation — tests target behavior, not table shape.

### Coding time (header: "Coding time")

One line directing the student to implement `registry.ts`, `dedup.ts`, the L2 portion of `dispatcher.ts`, and the schema tables against the reference signatures and the lesson's tests, then read the solution. Note the inspector's three fire buttons already call `dispatch()` through provided server actions and the barrel `index.ts` is provided — no wiring needed.

Reference solution (writer wraps in `<details>`), organized as it appears in the repo:

1. **`db/schema.ts`** — `Code` block of the three uncommented tables. `notifications`: `id` uuid pk (`$defaultFn` uuidv7), `userId` text FK→user cascade (text, matches Better Auth's `user.id` — never `uuid()`, callout), `orgId` text FK nullable, `eventType`/`subjectId`/`title`/`body` text, `payload` jsonb default `{}`, `readAt` timestamptz nullable, `createdAt` timestamptz; indexes `(userId, createdAt desc)` + partial `(userId) WHERE readAt IS NULL`. `user_notification_preferences`: per-channel booleans `email`/`inbox`/`push` default true (`push` reserved, no consumer — callout), unique `(userId, category)`. `notification_dedup`: `eventType`/`dedupKey`/`recipientUserId` text, `firedAt` timestamptz default `now()`, composite index `(eventType, dedupKey, recipientUserId, firedAt desc)`. Then the commands: `pnpm db:generate --name add_notifications`, inspect the SQL (three `CREATE TABLE`s, composite index, one partial index), `pnpm db:migrate`. Covers requirement 1 ([untested] schema/index discipline).

2. **`registry.ts`** — `Code` block of the three entries (`org.invitation.sent`, `org.member.role_changed`, `org.billing.past_due`). Decision rationale (one-two sentences each): the `as const satisfies Record<string, NotifiableEvent>` makes unknown keys a compile error and infers `EventType` (link narrowing/`satisfies` discipline to chapter 005 rather than re-explaining); the email-template field is the permissive `(props: any) => ReactElement` form on purpose — each typed template's props don't assign to a `Record<string, unknown>` param under TS 6 strict (parameter contravariance, TS2322) — flag this as the one thing that looks odd at a glance. Note per-event dedup config: `role_changed` keys by `['subjectId', 'newRole']`, the others by `['subjectId']`; `billing.past_due` carries `criticalChannel: 'email'` (consumed in lesson 3). Inbox formatters render title/body from payload.

3. **`dedup.ts`** — `Code` or `AnnotatedCode` (three exported functions, focus warranted). `computeDedupKey` joins `keyBy` values with `:` (`subjectId` off the event, the rest off the payload). `isDuplicate` selects the most-recent row for the triple inside the window via `firedAt > now() - make_interval(secs => windowSeconds)`, returns `true` on hit. `recordDedup` inserts one row after a successful fan-out. Rationale: the per-recipient key (callout — two recipients are not a duplicate); the accepted check-then-insert race with the unique-constraint upgrade named as the deferred hardening.

4. **`dispatcher.ts` (L2 portion)** — `AnnotatedCode` is the right call: the body has distinct phases the student should focus on in turn (registry lookup throwing `REGISTRY_MISS`; the `channelFns` uniform table; per-recipient loop with `isDuplicate` skip-on-hit incrementing `deduped`; the per-channel `try/catch` fan-out over no-op stubs incrementing `sent` once per channel; `recordDedup` after fan-out). Decision callouts: why the `try/catch` is per-channel and `REGISTRY_MISS` is *not* caught (programmer error vs. channel failure); the `channelFns satisfies Record<ChannelName, ChannelFn>` map so the loop is `await channelFns[channel](args)` with no branching. State explicitly that the batched prefs read, `resolveChannels`, and render-once land in lesson 3 (the `// TODO(L3)` marker) — for L2 the stub `resolveChannels` returns every channel and `rendered` is built but unused by the no-op channels.

5. **Callouts** appended: `satisfies` inference (link chapter 005); the per-recipient dedup key; per-event window guidance (5-10 min for comments/mentions; skip or payload-discriminate for financial events).

For topics owned by regular lessons (chapter 070 dispatcher seam, dedup window design; chapter 005 `satisfies`; chapter 041 Drizzle/indexes) link rather than re-explain. No diagram needed — the dispatch order is carried clearly by the annotated dispatcher code; chapter 070 already owns the seam diagram.

### Moment of truth (header: "Moment of truth")

Test command and expected pass output, then a hand-confirmation `Checklist`.

- Command: `pnpm test:lesson 2`. The starter ships `tests/lessons/Lesson 2.test.ts` as a `describe.todo` scaffold (the project-lesson-test-coder fills it) covering the dedup window, the `DispatchResult` shape, and the `REGISTRY_MISS` throw. Show the expected green pass summary.
- Hand-confirm checklist: Drizzle Studio shows the three tables + indexes; `Fire invite-sent` shows `{ sent: 2, deduped: 0, suppressedByPrefs: 0 }` + one dedup row; second fire within 60s shows `deduped: 1`, no new row; `Rapid-fire (5x in 2s)` shows `deduped: 4`; after a 61s wait a fresh fire shows `deduped: 0`.
- Closing line: lesson closes runnable — `dispatch()` works end-to-end with dedup, channels still no-op stubs (no real inbox rows, no email-counter increment yet).

## Scope

- Real channel side effects (inbox row writes, email sends) and preference resolution (batched read, default-on, critical-channel override) — Lesson 3 of this chapter.
- Wiring `dispatch()` into `sendInvitation`, `changeMemberRole`, and the Stripe past-due webhook — Lesson 4 of this chapter.
- The dispatcher seam rationale, notifiable-vs-logged line, registry field design, and dedup-window theory are taught in Chapter 070 (lessons 1 and 4); this lesson applies them, linking rather than re-teaching.
- Caching the inbox feed (Chapter 073), Upstash-backed dedup (Chapter 075), and a durable channel queue (Chapter 066) are named as forward references only in Lesson 4's closing, not here.
