# Lesson 3 outline — Preferences, read once, default-on

## Lesson title

- Title: `Preferences, read once, default-on`
- Sidebar label: `Notification preferences`

(Chapter-outline title is already tight and content-driven; keep it.)

---

## Lesson framing

This lesson fills the third dispatcher debt: the part that decides *which* channels a recipient actually receives. L1 established the registry (each event carries a `preferenceCategory` string), the `channels` default set, and `DispatchResult.suppressedByPrefs`. L2 built the channel functions and the dispatcher loop that consumes a *resolved* `channels` array — but L2's loop receives that array pre-filtered and never explained who filters it. This lesson is the filter: `userNotificationPreferences`, the default-on rule, the critical-channel override, and the single batched read inside the dispatcher that turns registry defaults into a per-recipient channel list.

Pedagogical center of gravity (from the chapter outline's own note): **preferences are where the dispatcher pattern earns most of its weight — one read, one place, every channel decided.** The whole lesson is in service of one ten-to-twenty-line `resolveChannels` function and one Drizzle table. Everything else is the reasoning that justifies their exact shape.

Five senior decisions drive the lesson, and each should be taught as a *decision with a stated alternative and failure mode*, not as a fact:

1. **Default-on for missing rows.** The single most important and most counterintuitive rule. Beginners reach for default-off ("opt-in is privacy-respecting / GDPR-friendly") and ship systemic silence: new event types launch muting themselves, users miss invitations and billing alerts, then complain. Frame the trade explicitly — one annoyed user who must opt out, versus a class of users who silently never hear. The `?? true` in the resolver is the entire rule; make the student feel why that default and not `?? false`.
2. **Category granularity, not per-event.** Per-event prefs produce a 20-toggle settings screen no one manages, and force a prefs migration every time a new event ships. Categories (4-6: `team`, `billing`, `security`, `product`) match the user's mental model and let new events inherit an existing toggle. The registry's `preferenceCategory` field (already shipped in L1) is the join key.
3. **Per-channel booleans, not a single mute.** The most-common real toggle is "keep the in-app inbox, stop emailing me." The schema must let a user mute `email` while keeping `inbox` on for the same category. Three booleans (`email`, `inbox`, reserved `push`) per `(userId, category)` row, not one `enabled` flag.
4. **The check lives in exactly one place — the dispatcher.** Restates the seam principle for the third time in the chapter. Call sites and channel functions never read prefs. Resolution happens once per dispatch, between registry lookup and the L2 fan-out loop.
5. **Critical-channel override.** Security events (password changed, new-device login, payment-action-required) must not be fully mutable. The registry marks a category's critical channel; the resolver forces it back on even when the user toggled it off. Without this, the support ticket writes itself: "I disabled all email and my password-reset never arrived."

Two N+1 reflexes from earlier units apply and should be named: the prefs read is **one batched query** across all recipients (`where userId in (...) and category = ?`), never a per-recipient loop.

Mental model the student should leave with: *the registry says what an event sends by default; the user's preference row can only ever subtract from that set (except a critical channel, which can't be subtracted); a missing row subtracts nothing; the dispatcher does this subtraction once, in one place, for every recipient at once.* "Defaults, minus user opt-outs, minus nothing-when-the-row-is-missing, except critical-on."

Tone: adult, terse, decision-first per the pedagogical guidelines. No re-teaching Drizzle basics, JSONB, or what a Server Action is — those are assumed from Units 5-10. The lesson is short (40-50 min); keep code minimal and let each block carry a decision.

---

## Lesson sections

### Introduction (no header)

Open with the debt L2 left, concretely: the dispatcher loop from last lesson consumed a resolved `channels` array but never said who resolves it. Restate the one-sentence bridge L2 closed on — "this is where the notification opt-out really lives, not in an email header" — so the continuity reads as a single arc. Then pose the senior question implicitly (per guidelines, not as a labeled section): a user wants to control which events reach them on which channels; the dispatcher must turn the event's default channels into a per-recipient list before it sends anything — so where do prefs live, what's their shape, and what happens for a user who never opened their settings or for an event type that didn't exist when they signed up? Preview the payoff: one table, one resolver function, the default-on rule. Keep it to ~4-6 sentences, warm and brief.

### The preferences table: one row per category, per-channel booleans

Goal: land the schema and the two granularity decisions (category-level, per-channel) before any resolution logic, because the resolver's shape follows from the table's shape.

Teach the two decisions as a pair, each with its alternative:

- **Category, not event.** Walk the alternative first: a row per `(userId, eventType)`. Show why it fails — the settings UI becomes 20 toggles, and every new event needs a prefs row backfill. Then the choice: a row per `(userId, category)`, where `category` is the `preferenceCategory` string each registry entry already declares (callback to L1's registry — show one registry entry's `preferenceCategory: 'team'` line as the join). Name the 4-6 categories: `team`, `billing`, `security`, `product`. The payoff line: a new event in an existing category ships with zero prefs migration and inherits the user's existing toggle.
- **Per-channel booleans, not one mute.** State the most-common real-world toggle: "I see it in the app, stop emailing me." One `enabled` boolean can't express that; three independent booleans can.

Present the schema with `AnnotatedCode` (single block, the student's focus needs directing to specific columns one at a time). The block is the `userNotificationPreferences` Drizzle table. Conventions to honor (from Code conventions, Drizzle section): plural camelCase table name `userNotificationPreferences`; snake-case mapping is on the client so TS reads `userId`/`category` and SQL is `user_id`/`category` (do **not** restate per-column snake names); UUIDv7 PK via `$defaultFn(() => uuidv7())`; FK `userId` references Better Auth's `user` table with explicit `onDelete: 'cascade'` (prefs are owned children of the user); a **named composite unique** on `(userId, category)` — `userNotificationPreferences_userId_category_unique` per the index-naming convention — this is the load-bearing constraint (one row per pair). Channel columns `email`, `inbox`, `push` as `boolean().notNull().default(true)` — and the `.default(true)` is itself a teaching beat: even at the column level the system leans on. Suggested shape (downstream agent may refine, keep the constraint and defaults):

```ts
export const userNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    email: boolean('email').notNull().default(true),
    inbox: boolean('inbox').notNull().default(true),
    push: boolean('push').notNull().default(true),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [unique('user_notification_preferences_user_id_category_unique').on(t.userId, t.category)],
);
```

Note for the agent: `userId` is `text` because Better Auth's `user.id` is text, not uuid — match the referenced column's type (cross-check against the project's auth schema; if the course's Better Auth `user.id` is uuid, switch to `uuid`). Mention `push` is reserved-for-future (the dispatcher has no push channel yet — L2 shipped only `email`/`inbox`) so the student knows why a column exists with no consumer: the schema anticipates the channel the registry's `ChannelName` union will grow into.

`AnnotatedCode` steps (blue default; one decision per step, 6 lines max each):
1. `{userId, category}` columns + the unique constraint line — "one row per (user, category) pair; the unique constraint is what makes 'this user's billing prefs' a single addressable row." (color: violet on the unique line to mark it as the load-bearing piece.)
2. The three channel boolean columns — "independent toggles; muting email leaves inbox untouched."
3. The `.default(true)` on the channels + the FK `onDelete: 'cascade'` — "default-on starts at the column; prefs die with the user."

Watch-out woven into the prose (not a trailing tips block): a row per event type instead of per category is the regression that produces the unusable settings screen — aggregate to categories.

Tooltip terms (use `Term`): "category" (a group of related event types that share one user toggle, e.g. all team-activity events), "opt-out" (the user action of turning a channel off; in this system it's the *only* action that writes a prefs row).

### Default-on: a missing row means every channel is allowed

Goal: this is the lesson's keystone rule; give it its own section and the most careful treatment.

Teach as a decision with both branches spelled out. Lead with the question: a brand-new user, or any user who never opened settings, has *no row* for `team`. What do they get?

- **The wrong default (off).** Walk the consequence chain concretely: ship a new `org.comment.mentioned` event into the `team` category six months after launch; every existing user has no row (or a row that predates the event's category being meaningful); default-off means they all silently get nothing; the feature looks broken; nobody knows why. Generalize: default-off turns every absent row into silence, and absence is the normal state for most users.
- **The right default (on).** A missing row is treated as opted-in on all channels. The only thing that ever writes a row is a deliberate opt-out. New event types in an existing category inherit whatever the user already chose for that category. New categories default on.
- **The honest trade.** Name it so the student can defend the call in a real review: default-on risks *one* user per category who has to click "stop emailing me," while default-off risks a *whole class* of users who never learn the event exists. A recoverable annoyance beats systemic silence.

Reinforce with a small visual. Use a `DiagramSequence` (3 steps, HTML/CSS boxes — a simple visual aid, exactly the "simple is fine" case the diagrams index endorses) showing the subtraction model:
- Step 1: "Registry default" — a row of two chips `email` `inbox` (both lit), captioned as the event's declared channels.
- Step 2: "User's preference row" — the same two chips, but `email` greyed/struck (user opted out of email for this category), captioned "the row can only *subtract*."
- Step 3: "Resolved" — one lit chip `inbox`, captioned "what the recipient actually gets." Then a small note/fourth step or a caption variant: "No row? Nothing is subtracted — both stay lit." Pedagogical goal: make "preferences subtract from defaults" a picture, so the `?? true` later reads as obvious.

Watch-out in prose: defaulting to off to look "privacy-respecting" is the silent-regression trap — these are transactional product notifications the user expects, and the per-category opt-out plus (next lesson's) suppression are the real privacy controls.

Quick comprehension check after this section: a `MultipleChoice` (single-answer) — "A user has never opened notification settings. A new `billing.invoice.failed` event fires in the `billing` category. What reaches them?" Options: both channels (correct), nothing (the default-off trap), inbox only, email only. The distractors map directly to the two most common wrong mental models. One MCQ is enough; keep it light.

### Resolving channels inside the dispatcher

Goal: the payoff function. This is where defaults, the prefs row, and the override collapse into the resolved `channels` array that L2's loop consumes.

First re-anchor the seam (third time in the chapter, by design): the check happens in **exactly one place** — the dispatcher, between the registry lookup and the L2 fan-out loop. Call sites never check; channel functions never check. State the regression grep: a prefs read anywhere outside `lib/notifications/` is the seam leak to catch.

Present `resolveChannels` with `AnnotatedCode` (the function deserves stepped attention; it encodes all four rules in ~15 lines). Suggested shape — keep the `?? true` and the override; downstream agent may adjust types to match the shipped `NotifiableEvent`/`ChannelName`:

```ts
function resolveChannels(
  event: NotifiableEvent,
  prefs: NotificationPrefRow | undefined,
): ChannelName[] {
  const allowed = event.channels.filter(
    (channel) => prefs?.[channel] ?? true, // default-on: missing row or column => allowed
  );
  const critical = event.criticalChannel;
  if (critical && !allowed.includes(critical)) allowed.push(critical);
  return allowed;
}
```

`AnnotatedCode` steps:
1. `{ event.channels.filter(...) }` (blue) — start from the registry's default set; the user can only ever narrow it.
2. The `prefs?.[channel] ?? true` predicate (green — the keystone) — "the whole default-on rule is these three tokens: optional-chain the row, optional-chain the column, and `?? true` so absence means allowed." Tie back to the DiagramSequence: "this is the subtraction, in code."
3. The `criticalChannel` push (orange — the exception/override) — force the critical channel back on even if the filter dropped it; security email can't be muted to nothing.

Then `CodeTooltips` is a good fit *inside* this block if not using AnnotatedCode for the override nuance — but AnnotatedCode is preferred here; reserve CodeTooltips for the `?? true` token if the agent wants an inline gloss elsewhere.

Critical-channel override — give it a short paragraph of its own reasoning right after the AnnotatedCode: which categories qualify (`security`, and the act-now subset of `billing`), how the registry expresses it (a `criticalChannel?: ChannelName` field on the category or event — show it as a one-line registry addition, e.g. the `security` events carrying `criticalChannel: 'email'`), and that the settings UI renders these toggles **disabled with an explanatory tooltip** (the UI itself is the project chapter's surface — name it, don't build it). The senior framing: the override is a *product safety* decision encoded in the registry, not a special case scattered in the resolver.

Then the **batched read** — its own short beat because it's the N+1 reflex. The dispatcher resolves channels per recipient, but reads prefs for *all* recipients in one query, keyed by the event's category:

```ts
const rows = await db
  .select()
  .from(userNotificationPreferences)
  .where(and(inArray(userNotificationPreferences.userId, recipientUserIds),
             eq(userNotificationPreferences.category, event.preferenceCategory)));
const byUser = new Map(rows.map((r) => [r.userId, r]));
// per recipient: resolveChannels(event, byUser.get(userId))
```

Show this as a plain `Code` block (it's straightforward; no per-part focus needed). The teaching point: one query for five recipients, then an in-memory `Map` lookup per recipient — the N+1-prevention discipline from Unit 8 applies to the dispatcher too. Name the cost as negligible (indexed, small). Watch-out in prose: reading prefs inside the per-recipient loop is exactly the N+1 the course already taught against.

Close the section by connecting to L2's loop and to `DispatchResult`: the resolved `channels` array is precisely what feeds `for (const channel of channels)` from last lesson; when prefs shrink the set, the dropped channels increment `suppressedByPrefs` in the dispatcher's return (the count L1 declared and this lesson finally makes real). Show a 4-6 line dispatcher excerpt stitching `resolveChannels` -> the L2 loop -> the `suppressedByPrefs` tally so the student sees the three lessons converge. Keep it as `Code` (the surrounding context is now familiar; no need to annotate).

Place the seam-leak watch-out and the per-recipient-N+1 watch-out inside this section's prose where each rule is taught, per the no-bundled-watch-outs instruction.

### Where the inbox-only pattern and the prefs UI live, and where preferences stop

Goal: a short, honest scoping section that (a) names the most-common toggle as a first-class supported case, (b) points at the UI surface without building it, and (c) draws the boundary between user-toggled prefs and the *other* opt-out pathway (email suppression) so the student isn't confused about overlap. Keep this tight — it's orientation, not new mechanics.

Three beats:

- **Per-channel mute is the common case, and the schema already serves it.** "Keep the inbox, stop the email" needs no new code — it's `email: false, inbox: true` on the row, and `resolveChannels` already produces `['inbox']`. Reassert this so the student connects the per-channel-boolean decision back to a felt user need. One paragraph.
- **The prefs UI is the project chapter's surface.** A `/settings/notifications` page renders the registry's categories with current toggles per channel (Server Component reads `userNotificationPreferences`, a Server Action upserts a row on change — and the *upsert* is the moment a row first appears, which is why missing-row default-on is the steady state). Critical-channel toggles render disabled. Name the shape in two sentences; the project starter's inspector ships the simplified version for verification. Do **not** build the page.
- **Two opt-out pathways, one outcome — and they don't overlap in scope here.** Be explicit to prevent a real confusion: a user can stop email either by toggling the `email` boolean off in prefs (this lesson) **or** by triggering email suppression (the Resend unsubscribe webhook → `email_suppressions`, owned by Ch048/Ch063). Both converge on "no email," via different layers: prefs short-circuit *before* the email channel runs (in `resolveChannels`); suppression short-circuits *inside* the email wrapper (L2's wrapper owns that read). The senior point: these are complementary, not redundant — prefs are the user's product choice, suppression is the deliverability/compliance backstop. **Cut entirely** the chapter-outline's "unsubscribe link with HMAC-signed token in the email" topic: L2 deliberately omitted the `List-Unsubscribe` header from these transactional notification emails (its continuity notes say so explicitly and its closing line says opt-out "lives, not in an email header"), so there is no in-email unsubscribe link in the dispatcher's emails to carry a token. Mention the token-signed-link pattern in at most one sentence as a general technique that belongs to marketing-bulk emails (a different sender), not these — and only if it doesn't muddy the boundary. This is the one place this lesson knowingly diverges from the chapter outline; the divergence is forced by L2's shipped decision and must be respected.

Defer in one line each, no detail (these are chapter-outline "named, deferred" items): quiet hours and digest mode are product-shaped patterns for when the inbox gets noisy (they live in the dispatcher or a downstream digest worker, reached for when user research shows the noise problem, not before); per-org admin overrides on member prefs are out of scope.

Optional comprehension check to close the lesson body: a `Buckets` two-column drill, "Which opt-out pathway owns each outcome?" Buckets: **Preferences row** vs **Email suppression**. Items: "User unchecks 'email' for the team category" (prefs), "User clicks unsubscribe in a marketing email" (suppression), "A new event type should reach a user who never touched settings" (prefs — default-on), "A hard bounce stops future sends to an address" (suppression). Pedagogical goal: cement the two-pathway boundary, which is the section's one genuinely confusable idea. If the agent judges one closing exercise is enough and already used the MCQ, this `Buckets` can be the single check for the lesson instead — author's call; prefer the `Buckets` here since the two-pathway distinction is the higher-risk confusion.

### Where this goes next (closing)

One short paragraph, matching the chapter's established closers. Restate the keystone in one sentence: *the registry says what an event sends by default; a user's preference row can only subtract (a missing row subtracts nothing, a critical channel can't be subtracted); the dispatcher resolves this once, batched across recipients, in one place.* Then the forward bridge to L4: preferences decide *whether* a recipient gets an event; the last piece is what happens when the *same* event fires five times in two seconds — the 60-second dedup window that collapses a burst into one notification. End with an `ExternalResource` LinkCard or two (optional): Drizzle `unique`/composite-constraint docs, and possibly a short piece on notification-preference UX defaults if a current, reputable one exists (resourcer's call).

---

## Scope

Prerequisites to redefine **briefly** (one clause each, assume prior teaching — do not re-teach):
- The `notifiableEvents` registry and `NotifiableEvent` entry shape, including the `channels` default set and the `preferenceCategory` string — established L1; this lesson reads `preferenceCategory` and `channels`, it doesn't redefine the registry.
- The dispatcher's fan-out loop (`for (const channel of channels)`), the `ChannelFn` signature, and `channelFns` lookup — established L2; this lesson produces the `channels` array that loop consumes.
- `DispatchResult { sent, deduped, suppressedByPrefs }` — declared L1; this lesson makes `suppressedByPrefs` real, doesn't redefine the type.
- Drizzle table/column/constraint syntax, snake-case-on-client casing, UUIDv7 PKs, composite uniques, `db/queries/` and `lib/notifications/` placement, `import 'server-only'` — assumed from Units 5/8/10 and the chapter's prior lessons.
- N+1 prevention / batched reads — assumed from Unit 8; named here as a reflex, not taught from scratch.
- Better Auth's `user` table as the FK target for `userId` — assumed from Unit 9.

Explicitly **out of scope** (belongs elsewhere; name and defer, do not teach):
- The full `/settings/notifications` UI — feed rendering, toggle widgets, the upsert Server Action body — the Ch071 project starter's inspector ships a simplified version (chapter outline).
- Quiet hours and digest/coalesce implementations — named, deferred (chapter outline; coalesce specifically is L4's contrast topic, not this lesson's).
- The 60-second dedup window mechanic and `notification_dedup` table — L4 of this chapter.
- The Resend unsubscribe webhook handler and the `email_suppressions` read — Ch063 and Ch048 (lesson 4) respectively; referenced only to draw the two-pathway boundary.
- HMAC token signing primitives / signed unsubscribe links — owned by Unit 8 / Ch081; **and** the in-email unsubscribe link itself does not exist for these transactional notifications (L2 cut the header), so the chapter-outline's "token-pre-selected-disable" topic is dropped here, not deferred.
- Per-org admin overrides on member prefs — out of scope entirely (chapter outline).
- Push channel mechanics — `push` ships as a reserved column only; no push channel exists yet (L2 shipped email/inbox); not implemented.
- The durable-queue upgrade (Trigger.dev) for sends — named in L1, not this lesson's concern.

---

## Notes on code conventions and divergences

- Schema follows the Drizzle section of Code conventions: plural camelCase table identifier, casing on client (no per-column snake names restated), UUIDv7 PK, explicit named composite unique (`user_notification_preferences_user_id_category_unique`), explicit FK `onDelete`. No tenant `orgId` column on this table — prefs are user-scoped, not org-scoped, so the "composite indexes lead with orgId" rule does **not** apply here; call this out so a downstream agent doesn't force an `orgId`.
- `DispatchResult` stays a plain count object, not a `Result<T>` — this is the chapter's deliberate, documented divergence from the `Result<T>` discipline (L1 continuity notes); maintain it.
- Channel functions and the dispatcher already return `Promise<void>` / a count object respectively (L2); `resolveChannels` is a pure synchronous helper returning `ChannelName[]` — no `Result`, no async.
- Module placement: `resolveChannels`, the prefs read helper, and the schema reference live under `lib/notifications/` (resolver, read) and `db/schema.ts` (table); a tenant-scoped read helper for prefs could live in `db/queries/` but prefs are user-scoped not org-scoped, so keeping the batched read inline in the dispatcher (or a `lib/notifications/` helper) is fine — note this so the agent doesn't over-file it.
- Deliberate simplification to flag for downstream agents: the lesson treats `prefs?.[channel] ?? true` as reading channel booleans directly off the row; if the shipped `NotificationPrefRow` type names columns `email`/`inbox`/`push` this indexing is sound, but the agent must confirm the indexed access type-checks against the `$inferSelect` row (a typed `Record<ChannelName, boolean>` view or an explicit per-channel read may be needed to satisfy the type checker — prefer whichever keeps the `?? true` rule legible).
