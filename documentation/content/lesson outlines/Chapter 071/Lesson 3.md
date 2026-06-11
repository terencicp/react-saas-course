# Lesson 3 outline — Channels and preferences live

## Lesson title

Chapter-outline title "Channels and preferences live" fits — keep it. Sentence case, plain text.
Sidebar short title: **Channels and preferences**.

## Lesson type

`Implementation`. (Test-coder runs; writer renders the Implementation section list.)

## Lesson framing

The student installs the two halves that make the dispatcher real on both ends: the channel functions that actually write (inbox row, email send) and the preference resolution that decides which channels run. The senior payoff is the resolution discipline — preferences read **once per dispatch, batched** (no N+1), `?? true` **default-on** so silence is never the default, and the `criticalChannel` override that keeps billing email flowing through a per-category opt-out — plus render-at-dispatch so the inbox row is a frozen snapshot, not a live join. After this lesson every inspector button produces its real effect and the `EMAIL_MOCK` counter becomes load-bearing.

## Codebase state

### Entry

L2 shipped: the three notification tables exist (migration `0011`), `registry.ts` holds the three events `as const satisfies Record<string, NotifiableEvent>`, `dedup.ts` is real (`isDuplicate`/`recordDedup`/`computeDedupKey`), and `dispatcher.ts` runs the registry-lookup → per-recipient dedup → channel fan-out spine with `dispatch()` callable end-to-end. Still stubbed: `prefs.ts` (`readPrefsForCategory` returns empty Map, `resolveChannels` returns every channel), `get-user-email.ts` (stub), `channels/inbox.ts` and `channels/email.ts` (no-op stubs that only let `sent` increment), and the dispatcher's `// TODO(L3)` block (no batched prefs read, no `resolveChannels` call, no render-once — currently fans out over all channels with no `rendered` snapshot). Firing produces no inbox rows and no real email-counter movement.

### Exit

`prefs.ts`, `get-user-email.ts`, `channels/inbox.ts`, `channels/email.ts` are fully implemented and the dispatcher's `// TODO(L3)` is resolved (batched `readPrefsForCategory` before the loop, `resolveChannels` per recipient with `suppressedByPrefs` diff counting, render-once into `rendered`, `channelFns` table fan-out). From `/inspector`: as `bob` (`team`→`email` off) `Fire invite-sent` writes one inbox row, leaves the email counter flat, returns `suppressedByPrefs: 1`; as `alice` (no prefs row) both channels fire; `billing-past-due` with `billing`→`email` off still increments email (critical override); `Make email fail` still writes the inbox row (channel independence). Call-site wiring and the past-due webhook remain stubbed — that is L4.

## Lesson sections

Implementation section list: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: replace the stubs so every inspector button produces its real effect — an inbox row, an email send, a respected preference. Then a one-paragraph description (or `Screenshot` of the inspector mid-demo) of the finished behavior: as `bob`, `Fire invite-sent` lands an inbox row with the email counter unchanged and `suppressedByPrefs: 1`; as `alice` (no prefs row) both fire; toggling a channel suppresses just that channel; `billing-past-due` ignores the billing-email toggle. Use `Screenshot` only if a captured frame exists; otherwise prose. No diagram needed — the seam diagram lives in L1.

### Your mission

Prose brief, no implementation hints, woven as coherent paragraphs (per the contract), then the requirements checklist (the only list). Cover:

- **Feature** (user terms): the dispatcher's two channels now do real work, and per-category preferences decide which channels run for each recipient.
- **Why land together**: a live channel with stubbed prefs cannot demonstrate suppression; live prefs with stubbed channels cannot demonstrate a send. End-to-end verification needs both.
- **Constraints** (non-functional, shape the solution): preferences read **once per dispatch**, batched across all recipients in a single `WHERE userId IN (...) AND category = ?` query — the N+1 discipline (link to chapter 039 N+1 lesson, do not re-explain). `?? true` **default-on**: a user with no preferences row receives everything (silence-by-default is worse than friction). The `criticalChannel` override lives **inside** `resolveChannels` so every channel decision sits in one place. **Render-at-dispatch**: the inbox content is rendered once before the recipient loop and frozen onto the row — the inbox UI stays a pure read, immune to later actor-name drift. Transactional notification emails carry **no unsubscribe header** — opt-out is the per-category toggle, and a critical channel ignores even that.
- **Out of scope** (one line): call-site wiring (L4) and any inbox UI beyond the provided `/inbox` list and inspector (prefs panel, `setPref`, fire buttons all shipped).

Requirements checklist — each item one inspector-confirmable behavior, tagged `[tested]`/`[untested]`. Phrase as outcomes, never files:

1. As `bob` (seeded `team`→`email` off), `Fire invite-sent` writes one new inbox row, leaves the email counter unchanged, and returns `suppressedByPrefs: 1`. `[tested]`
2. As `alice` (no prefs row), `Fire invite-sent` increments both the inbox panel and the email counter — default-on holds. `[tested]`
3. Toggling `alice`'s `team`→`inbox` off and refiring increments the email counter only. `[tested]`
4. With `billing`→`email` off, `Fire billing-past-due` still increments the email counter — the critical-channel override holds. `[tested]`
5. A new inbox row's `title` and `body` match the registry's inbox template for the event, written once at dispatch. `[tested]`
6. `Make email fail` then fire — the inbox row is still written, the email error swallowed (channel independence). `[tested]`
7. The `security`→`email` toggle is rendered disabled on the prefs panel and has no server-side effect. `[untested]` (provided UI affordance; illustrative — no `security` event ships.)

Note for test-coder: tests assert observable behavior (inbox-row count, email-sent counter via `getEmailSentCount`, `DispatchResult` fields, channel independence under `setEmailShouldFail`), never file paths or function names. Items 1–6 are the assertion targets; item 7 is verified by hand against the provided inspector.

### Coding time

One-line build prompt directing the student to implement `prefs.ts`, `get-user-email.ts`, `channels/inbox.ts`, `channels/email.ts`, and finish the dispatcher's `// TODO(L3)` against the brief and the L3 tests, noting the inspector's prefs panel and `setPref` action are already provided. Then the reference solution, which the writer wraps in `<details>` (collapsed). Organize as it appears in the repo. Use `Code` for the simple files; reach for `AnnotatedCode` on `dispatcher.ts` (the L3 edits touch several non-adjacent spots) and on `resolveChannels` (the two load-bearing clauses deserve directed focus). Cover:

- **`prefs.ts`** (`Code`, or `AnnotatedCode` for `resolveChannels`): `readPrefsForCategory` — one batched `WHERE userId IN (...) AND category = ?` returning `Map<userId, NotificationPrefRow | undefined>`; the early `userIds.length === 0` return; users with no row map to `undefined` so default-on holds downstream. `resolveChannels` — pure synchronous filter `(prefs?.[channel] ?? true) || channel === event.criticalChannel`. Rationale (one or two sentences each): the `?? true` default-on clause and the `|| criticalChannel` override are the two load-bearing pieces; keeping the override inside `resolveChannels` is why every channel decision is in one place. `NotificationPrefRow = typeof userNotificationPreferences.$inferSelect`.
- **`get-user-email.ts`** (`Code`): `db.query.user.findFirst({ where: eq(user.id, userId), columns: { email: true } })` returning `string | null`. Note the import is from `@/db/schema/auth` (Better Auth's `user` table). Null is the signal the email channel turns into `RECIPIENT_NOT_FOUND`.
- **`channels/inbox.ts`** (`Code`): one `db.insert(notifications).values({...})` from `rendered.inbox.title`/`body` and `rendered.orgId`, no joins. Callout (`[untested]` coverage): this is the **only** writer of the `notifications` table — a direct write elsewhere is a regression (the grep seam check lands in L4). Rationale: render-at-display rejected for actor-name drift and join cost.
- **`channels/email.ts`** (`Code`): resolve `to` via `getUserEmail` (null → `throw new NotificationError('RECIPIENT_NOT_FOUND', ...)`); read the template through the `NotifiableEvent` field type (`const eventDef: NotifiableEvent = notifiableEvents[event.type]`) then `createElement(eventDef.templates.email, rendered.emailProps)`; `sendEmail` with `subject: rendered.inbox.title` and deterministic `idempotencyKey: ` + "`${event.type}:${event.subjectId}:${recipient.userId}`"; no `from`/`replyTo` (wrapper owns them), no unsubscribe headers. On a non-ok `sendEmail` Result: log then throw so channel independence holds; suppression is the wrapper's concern. Callouts: why the typed-template-through-`NotifiableEvent`-field cast is needed (passing the raw `as const` union to `createElement` fails to typecheck, TS2769 — parameter contravariance, owned by chapter 005 / the L2 registry note; link, don't re-derive); why `RECIPIENT_NOT_FOUND` is swallowed (it surfaces in the dispatcher's per-channel `try/catch`, not thrown out of dispatch).
- **`dispatcher.ts` `// TODO(L3)`** (`AnnotatedCode`): the three edits — (a) `const prefsByUser = await readPrefsForCategory(event.recipientUserIds, eventDef.preferenceCategory)` before the loop (read once, never per-recipient); (b) the `rendered: RenderedContent` object built once (`emailProps: event.payload`, `inbox: eventDef.templates.inbox(event.payload)`, `orgId: null`); (c) inside the loop, `const channels = resolveChannels(eventDef, prefsByUser.get(userId))`, then `result.suppressedByPrefs += eventDef.channels.length - channels.length` and `if (channels.length === 0) continue`, and the `channelFns = { email: sendEmailChannel, inbox: writeInboxChannel } satisfies Record<ChannelName, ChannelFn>` table so the fan-out is `await channelFns[channel](args)` with no branching. Note the dedup-check and `recordDedup` order from L2 is unchanged — L3 inserts prefs-resolve **before** the dedup check (order: prefs → dedup → channels). Callout: `REGISTRY_MISS` still bubbles out (thrown before the loop) while channel failures are swallowed — the `try/catch` is per-channel, not per-dispatch.

Resourcer appends external resources after the `<details>` (no header) if any.

### Moment of truth

The test command and expected pass output, then a by-hand checklist for the untested item.

- Command: `pnpm test:lesson 3`. Expected: the L3 suite (default-on, channel suppression, critical-channel override, channel independence) passes — the starter ships `tests/lessons/Lesson 3.test.ts` as a `describe.todo` scaffold this lesson fills. Show the green pass summary as `Code`.
- By-hand checklist (`Checklist`/`ChecklistItem`): as `bob`, `Fire invite-sent` → inbox row + counter flat + `suppressedByPrefs: 1`; as `alice`, both channels fire, then `team`→`inbox` off → only email fires; after reset with `billing`→`email` off, `Fire billing-past-due` still bumps the counter; a new inbox row's `title`/`body` match the registry template; `Make email fail` then fire → inbox row still written, email error swallowed; the `security`→`email` toggle is disabled and inert.
- Close: this lesson is runnable — every inspector button produces its expected effect and the `EMAIL_MOCK` counter is now load-bearing; call-site wiring is L4.

## Scope

This lesson does **not** cover:

- Wiring `dispatch()` into `sendInvitation`, `changeMemberRole`, or the Stripe past-due webhook — that is **Lesson 4 (Wire the three call sites)**.
- The registry, `dedup.ts`, and the dispatcher's spine (registry lookup, dedup check, fan-out skeleton) — built in **Lesson 2 (Registry, dispatcher, and dedup)**; L3 only fills the `// TODO(L3)` block.
- Authoring email JSX — the three React Email templates in `src/emails/` ship complete (chapter 049 owns React Email).
- The inbox UI and inspector panels (prefs panel, `setPref`, fire buttons, counters) — all provided.
- N+1 / batched-read theory — owned by chapter 039; link, do not re-explain.
- Caching the inbox feed (chapter 073), Upstash-backed dedup (chapter 075) — named as forward references in L4, not here.
